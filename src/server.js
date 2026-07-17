import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, assertConfig } from './config.js';
import { loadKB, syncFromSheet } from './kb.js';
import { getSheetId } from './sheets.js';
import { handleIncoming } from './handler.js';
import { sendText, sendTyping, verifySignature } from './messenger.js';
import { loadPageTokens, pageCount } from './pages.js';
import { adminRouter } from './admin.js';
import { startPancakePolling } from './pancake-poll.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

assertConfig();

loadKB(); // nạp KB từ Excel (nguồn nền)
// Nếu có Google Sheet kịch bản → ưu tiên dùng Sheet, làm mới mỗi 5 phút.
if (getSheetId()) {
  syncFromSheet(getSheetId()).catch((e) => console.error('[sheet] sync lỗi:', e.message));
  setInterval(() => syncFromSheet(getSheetId()).catch((e) => console.error('[sheet] refresh lỗi:', e.message)), 5 * 60 * 1000);
}

// Nạp token tất cả page (đa-page). Refresh 10 phút/lần — MKT tạo page mới trong BM
// là tự xuất hiện trên dashboard, không cần bấm gì.
loadPageTokens().catch((e) => console.error('[pages] lỗi nạp token:', e.message));
setInterval(() => loadPageTokens().catch((e) => console.error('[pages] refresh lỗi:', e.message)), 10 * 60 * 1000);

const app = express();
app.use(express.json({ limit: '12mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));

// Ảnh sản phẩm upload từ dashboard — host công khai để Messenger tải về.
app.use('/uploads', express.static(path.resolve(__dirname, '..', 'public', 'uploads')));

// Trang chính sách quyền riêng tư (Meta yêu cầu để go-live).
app.get('/privacy', (_req, res) => res.sendFile(path.resolve(__dirname, '..', 'docs', 'index.html')));

// Bảo vệ dashboard bằng Basic Auth. Nếu chưa đặt ADMIN_USER/ADMIN_PASS (chạy local) → không chặn.
// Trên VPS công khai PHẢI đặt 2 biến này trong .env.
function adminAuth(req, res, next) {
  const { adminUser: u, adminPass: p } = config;
  if (!u || !p) return next();
  const m = /^Basic (.+)$/.exec(req.get('authorization') || '');
  if (m) {
    const [ru, rp] = Buffer.from(m[1], 'base64').toString().split(':');
    if (ru === u && rp === p) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="AI Closer"').status(401).send('Cần đăng nhập.');
}

// Dashboard quản trị (đăng nhập bảo vệ cả trang lẫn API)
app.use('/admin', adminAuth);
app.use('/admin/api', adminRouter);
app.get('/admin', (_req, res) => res.sendFile(path.resolve(__dirname, '..', 'public', 'admin.html')));

// Verify webhook (Meta gọi 1 lần khi đăng ký).
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === config.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Nhận sự kiện tin nhắn — 1 webhook phục vụ TẤT CẢ page.
app.post('/webhook', (req, res) => {
  console.log('[webhook] ⬅️ nhận POST | object=', req.body?.object, '| body=', JSON.stringify(req.body || {}).slice(0, 400));
  if (!verifySignature(req.rawBody, req.get('x-hub-signature-256'))) {
    console.log('[webhook] ❌ sai chữ ký → 403');
    return res.sendStatus(403);
  }
  const body = req.body;
  if (body.object !== 'page') return res.sendStatus(404);
  res.sendStatus(200); // trả nhanh cho Meta, xử lý nền

  for (const entry of body.entry || []) {
    const pageId = entry.id; // page nhận tin → chọn đúng token để trả lời
    for (const ev of entry.messaging || []) {
      const psid = ev.sender?.id;
      const text = ev.message?.text;
      if (psid && text && !ev.message.is_echo) {
        processMessage(psid, text, pageId).catch((e) => console.error('[process] lỗi:', e));
      }
    }
  }
});

// Tải lại KB sau khi cập nhật file.
app.post('/reload-kb', (_req, res) => {
  try {
    const r = loadKB();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Tải lại token các page (sau khi thêm page mới vào Business).
app.post('/reload-tokens', async (_req, res) => {
  try {
    const n = await loadPageTokens();
    res.json({ ok: true, pages: n });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true, pages: pageCount() }));

async function processMessage(psid, text, pageId) {
  await sendTyping(psid, true, pageId);
  const { reply } = await handleIncoming({ psid, text, pageId });
  await sendTyping(psid, false, pageId);
  if (reply) await sendText(psid, reply, pageId);
}

app.listen(config.port, () => {
  console.log(`[server] Đang chạy tại http://localhost:${config.port}  (webhook: /webhook)`);
});

// Nhận/gửi tin qua Pancake (song song với webhook FB) — không cần URL công khai.
startPancakePolling();
