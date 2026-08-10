// M20 · Router riêng cho Unit Economics — gắn vào admin.js bằng ĐÚNG 1 DÒNG.
// Router riêng thay vì viết thẳng vào admin.js: 4 luồng v2 đang sửa song song, chạm chung
// một file là xung đột chắc chắn (xem docs/v2/08-SONG-SONG.md §3).
//
// Đường dẫn: /admin/api/economics/*  → đã nằm sau adminAuth của server.js, không phải
// tự dựng lớp đăng nhập riêng.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { economics, alerts, trace, verify, buildWeeklyReport, DIMS } from './economics.js';
import { pancakePages } from './pancake.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const economicsRouter = express.Router();

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const range = (q) => ({
  from: DAY.test(q.from || '') ? q.from : undefined,
  to: DAY.test(q.to || '') ? q.to : undefined,
});
const groupBy = (q) => {
  const g = String(q.by || 'page').split(',').map((s) => s.trim()).filter((s) => DIMS.includes(s));
  return g.length ? g : ['page'];
};
const pageNames = () => {
  const pk = pancakePages();
  return new Map([...pk].map(([id, v]) => [String(id), v?.name || String(id)]));
};
const withNames = (e, names) => ({
  ...e,
  groups: e.groups.map((g) => ({ ...g, name: g.dims.page ? (names.get(String(g.dims.page)) || g.dims.page) : g.key })),
});

// Trang riêng (không đụng public/admin.html). Nằm dưới /admin nên hưởng luôn Basic Auth.
economicsRouter.get('/ui', (_req, res) => res.sendFile(path.join(ROOT, 'public', 'economics.html')));

// Bảng số chính. ?from&to (YYYY-MM-DD, ngày UTC) &by=page,scriptVersion,lane,day
economicsRouter.get('/summary', (req, res) => {
  try {
    res.json(withNames(economics({ ...range(req.query), groupBy: groupBy(req.query) }), pageNames()));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// 4 ngưỡng cảnh báo tự động (spec §M20).
economicsRouter.get('/alerts', (req, res) => {
  try {
    res.json(alerts({ ...range(req.query), groupBy: groupBy(req.query), names: pageNames() }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// TRA NGƯỢC: đưa đúng những dòng Sổ AI đã đẻ ra một ô số. ?key=<khoá ô>&by=…
economicsRouter.get('/trace', (req, res) => {
  const key = String(req.query.key || '');
  if (!key) return res.status(400).json({ error: 'thiếu key' });
  try {
    res.json(trace({ key, groupBy: groupBy(req.query), ...range(req.query), limit: Math.min(Number(req.query.limit) || 200, 1000) }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ĐỐI CHIẾU với recount()/tokenStats() — nút "số này có tin được không".
economicsRouter.get('/verify', (req, res) => {
  try { res.json(verify({ ...range(req.query) })); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// Báo cáo tuần: xem trước (GET) và gửi tay (POST). Gửi tự động xem phần dưới.
economicsRouter.get('/weekly', (_req, res) => {
  try {
    const r = buildWeeklyReport({ names: pageNames() });
    res.json({ text: r.text, range: r.range, alerts: r.alerts, totals: r.cur.totals });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
economicsRouter.post('/weekly/send', async (_req, res) => {
  try {
    const r = buildWeeklyReport({ names: pageNames() });
    const out = await sendWeekly(r.text);
    res.json({ ...out, text: r.text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---- GỬI TỰ ĐỘNG ------------------------------------------------------------------
// Spec §M20: "báo cáo tuần tự gửi, không cần ai bấm". Bộ hẹn giờ nằm TRONG router này
// chứ không ở server.js — server.js là file chung, luồng khác đang sửa.
//
// Nhập baileys động (chỉ khi thật sự gửi): nạp tĩnh sẽ kéo cả thư viện WhatsApp vào mọi
// tiến trình import admin.js, kể cả `npm test`.
async function sendWeekly(text) {
  const { sendToGroup } = await import('./wa.js');
  return sendToGroup(text);
}

const STATE_FILE = path.join(ROOT, 'economics-state.json');
const readState = () => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; } };
const writeState = (s) => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch (e) { console.error('[econ] lưu mốc gửi lỗi:', e.message); } };

const VN = 7 * 3600e3;
// Thứ 2 hàng tuần, 08:00 giờ VN, tổng kết TUẦN TRƯỚC (tuần đã trọn vẹn).
function dueNow(now, last) {
  const d = new Date(now + VN);
  if (d.getUTCDay() !== 1 || d.getUTCHours() < 8) return false;
  const monday = Math.floor((now + VN) / 86400e3) * 86400e3 - VN;
  return !last || last < monday; // tuần này chưa gửi
}

export function startWeeklyReport({ intervalMs = 15 * 60e3 } = {}) {
  // Local luôn PANCAKE_READONLY=1 — máy dev tuyệt đối không được bắn tin vào nhóm thật.
  if (process.env.PANCAKE_READONLY === '1') return { started: false, why: 'PANCAKE_READONLY=1 (máy local)' };
  if (process.env.ECON_WEEKLY === '0') return { started: false, why: 'ECON_WEEKLY=0' };
  if (!process.env.WA_GROUP_JID) return { started: false, why: 'chưa đặt WA_GROUP_JID' };

  const tick = async () => {
    const st = readState();
    if (!dueNow(Date.now(), st.weeklySentAt || 0)) return;
    try {
      const r = buildWeeklyReport({ names: pageNames() });
      const out = await sendWeekly(r.text);
      // Ghi mốc kể cả khi gửi lỗi: WhatsApp rớt phiên thì thử lại mỗi 15 phút suốt ngày
      // thứ 2 là tự spam log, không phải chữa được lỗi. Lỗi hiện ở log để người xử lý.
      writeState({ ...st, weeklySentAt: Date.now(), weeklyOk: !!out.ok, weeklyError: out.error || '' });
      console.log(out.ok ? '[econ] ✓ đã gửi báo cáo tuần vào nhóm WhatsApp' : `[econ] ✗ gửi báo cáo tuần lỗi: ${out.error}`);
    } catch (e) { console.error('[econ] soạn báo cáo tuần lỗi:', e.message); }
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return { started: true, timer };
}

const started = startWeeklyReport();
if (!started.started) console.log(`[econ] báo cáo tuần TẮT — ${started.why}`);
