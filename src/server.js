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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

assertConfig();

loadKB(); // nạp KB từ Excel (nguồn nền)
// Nếu có Google Sheet kịch bản → ưu tiên dùng Sheet, làm mới mỗi 5 phút.
if (getSheetId()) {
  syncFromSheet(getSheetId()).catch((e) => console.error('[sheet] sync lỗi:', e.message));
  setInterval(() => syncFromSheet(getSheetId()).catch((e) => console.error('[sheet] refresh lỗi:', e.message)), 5 * 60 * 1000);
}

// Nạp token tất cả page (đa-page). Refresh định kỳ 6h.
loadPageTokens().catch((e) => console.error('[pages] lỗi nạp token:', e.message));
setInterval(() => loadPageTokens().catch((e) => console.error('[pages] refresh lỗi:', e.message)), 6 * 60 * 60 * 1000);

const app = express();
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

// Dashboard quản trị
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
  if (!verifySignature(req.rawBody, req.get('x-hub-signature-256'))) {
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
