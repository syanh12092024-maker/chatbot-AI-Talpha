// Web UI local để xem & chat thử — chọn page để test đúng KB của page đó.
// Chạy: npm run web  → mở http://localhost:3100
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { loadKB, getPageList } from './kb.js';
import { handleIncoming } from './handler.js';
import { resetState } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '..', 'public')));

try { loadKB(); } catch (e) { console.error('[kb] lỗi nạp KB:', e.message); }

app.get('/api/info', (_req, res) => {
  res.json({ hasKey: Boolean(config.anthropicApiKey), pages: getPageList() });
});

app.post('/api/reset', (req, res) => {
  resetState(`web:${req.body?.sessionId || 'web'}:${req.body?.pageId || ''}`);
  res.json({ ok: true });
});

app.post('/api/chat', async (req, res) => {
  const { sessionId = 'web', text = '', pageId = '' } = req.body || {};
  if (!text.trim()) return res.status(400).json({ error: 'Tin nhắn rỗng' });
  if (!config.anthropicApiKey) return res.status(503).json({ error: 'Chưa cấu hình ANTHROPIC_API_KEY trong .env' });
  try {
    const out = await handleIncoming({ psid: `web:${sessionId}:${pageId}`, text, pageId });
    res.json(out);
  } catch (e) {
    console.error('[api/chat] lỗi:', e);
    res.status(500).json({ error: e.message });
  }
});

const WEB_PORT = Number(process.env.WEB_PORT || config.port + 1); // 3101 — tách khỏi webhook server (3100)
app.listen(WEB_PORT, () => {
  console.log(`[web] Mở http://localhost:${WEB_PORT} để chat thử (sandbox, không đụng khách thật).`);
  if (!config.anthropicApiKey) console.log('[web] ⚠️ Chưa có ANTHROPIC_API_KEY — UI mở được nhưng chat sẽ báo lỗi.');
});
