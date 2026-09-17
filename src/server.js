import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, assertConfig } from './config.js';
import { loadKB, syncFromSheet } from './kb.js';
import { getSheetId } from './sheets.js';
import { taoPool } from '../db/ket-noi.js';
import { taoWebhookHandler } from './queue/webhook.js';
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

// KHO TOKEN CSDL (migration 019) — nguồn thứ tư của `src/pancake.js`, ngang hàng `.env`.
// Nối ở đây để tiến trình bot thấy token người ta thêm bằng màn v3 mà KHÔNG phải restart:
// `datKhoTokenDb` tự nạp ngay rồi làm mới mỗi 5 phút, và màn v3 gọi `POST /admin/api/
// pancake-tokens/nap-lai` để nạp tức thì sau mỗi lượt thêm/bỏ.
if (process.env.DATABASE_URL_V3) {
  const poolToken = taoPool();
  const { docTokenSong } = await import('./token-pancake.js');
  const { datKhoTokenDb } = await import('./pancake.js');
  datKhoTokenDb(() => docTokenSong(poolToken));
} else {
  console.log('[token] không có DATABASE_URL_V3 → chỉ dùng kho token .env + pancake-tokens.json');
}

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

// Pancake polling/POS không cần endpoint Meta. Tắt cả GET/POST trước khi xác thực/lưu.
app.use('/webhook', (_req, res, next) => {
  if (process.env.META_WEBHOOK_OFF === '1') return res.sendStatus(404);
  next();
});

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

// Chỉ ACK sau khi đã lưu tin; xử lý qua worker V3, không gọi bot legacy song song.
let webhookPool;
app.post('/webhook', taoWebhookHandler({ layPool: () => (webhookPool ||= taoPool()) }));

// Tải lại KB sau khi cập nhật file.
app.post('/reload-kb', adminAuth, (_req, res) => {
  try {
    const r = loadKB();
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Tải lại token các page (sau khi thêm page mới vào Business).
app.post('/reload-tokens', adminAuth, async (_req, res) => {
  try {
    const n = await loadPageTokens();
    res.json({ ok: true, pages: n });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/health', (_req, res) => res.json({ ok: true, pages: pageCount() }));

app.listen(config.port, process.env.HOST, () => {
  console.log(`[server] Đang chạy tại http://localhost:${config.port}  (webhook: /webhook)`);
});

// Poll legacy bỏ qua các Page đã chuyển sang V3_PAGE_XU_LY.
if (process.env.V3_LEGACY_POLL_OFF !== '1') {
  startPancakePolling();
  // Legacy background jobs stay off during a dedicated V3 deployment.
  import('./scheduler-miner.js').then((m) => {
    const r = m.startMinerScheduler();
    if (!r.started) console.log(`[miner] lịch mổ đêm TẮT — ${r.why}`);
  }).catch((e) => console.error('[miner] không nạp được lịch:', e.message));
  (await import('./scheduler-followup.js')).startL5Schedulers();
} else {
  console.log('[server] Legacy poll/follow-up/miner tắt: triển khai V3 riêng.');
}
