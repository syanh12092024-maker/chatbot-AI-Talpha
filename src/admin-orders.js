// L7 · Router riêng cho ĐƠN HÀNG (M14) + BÁO CÁO MỔ (M15) + SỔ TEMPLATE CHỜ DUYỆT.
// Gắn vào admin.js bằng ĐÚNG 1 DÒNG (luật §3 của docs/v2/08-SONG-SONG.md) — 4 luồng v2 đang
// sửa song song, chạm chung một file là xung đột chắc chắn.
//
// Đường dẫn: /admin/api/order-bridge/*  → đã nằm sau adminAuth của server.js.
// (KHÔNG dùng /orders: admin.js đã có sẵn GET /orders của tab Tổng quan.)

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pancakePages, pkGetMessages } from './pancake.js';
import { readQueue, queueStats, precheck, createFromQueue, skipQueueItem, orderMode } from './order-bridge.js';
import { latestReports, readReports, minePage } from './miner.js';
import { readCandidates, approveCandidate, rejectCandidate } from './template-learner.js';
import { minerState, runNightly } from './scheduler-miner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ordersRouter = express.Router();

const nameOf = (id) => { try { return pancakePages().get(String(id))?.name || String(id); } catch { return String(id); } };
const readonly = () => process.env.PANCAKE_READONLY === '1';

// Trang riêng (không đụng public/admin.html).
ordersRouter.get('/ui', (_req, res) => res.sendFile(path.join(ROOT, 'public', 'orders.html')));

// ── Tổng quan cho đầu trang ──────────────────────────────────────────────────
ordersRouter.get('/summary', (_req, res) => {
  const cands = readCandidates();
  res.json({
    mode: orderMode(),
    readonly: readonly(),
    queue: queueStats(),
    templates: {
      pending: cands.filter((c) => c.status === 'pending').length,
      approved: cands.filter((c) => c.status === 'approved').length,
      rejected: cands.filter((c) => c.status === 'rejected').length,
    },
    miner: minerState(),
    reports: latestReports().length,
  });
});

// ── HÀNG CHỜ TẠO ĐƠN ─────────────────────────────────────────────────────────
ordersRouter.get('/queue', (req, res) => {
  const status = String(req.query.status || 'pending');
  const items = readQueue()
    .filter((it) => status === 'all' || it.status === status)
    .map((it) => ({
      ...it,
      pageName: nameOf(it.page),
      link: it.conv ? `https://pancake.vn/${it.page}?c_id=${it.conv}` : `https://pancake.vn/${it.page}`,
    }))
    .sort((a, b) => b.t - a.t);
  res.json({ status, count: items.length, mode: orderMode(), items });
});

// Soi trước khi tạo (dry-run): 4 cửa chống trùng + cửa bảng giá. Không tạo gì cả.
ordersRouter.post('/queue/:id/check', async (req, res) => {
  const item = readQueue().find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'không có mục này trong hàng chờ' });
  try {
    const msgs = await convMessages(item);
    res.json(await precheck(item, { msgs }));
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// TẠO ĐƠN THẬT — 1 click. Vẫn phải qua đủ cửa; không có tham số nào bỏ qua được.
ordersRouter.post('/queue/:id/create', async (req, res) => {
  if (readonly()) return res.status(403).json({ error: 'PANCAKE_READONLY=1 — máy này chỉ được ĐỌC, không tạo đơn.' });
  try {
    const item = readQueue().find((x) => x.id === req.params.id);
    const msgs = item ? await convMessages(item) : [];
    const r = await createFromQueue(req.params.id, { msgs, by: req.body?.by || 'dashboard' });
    if (!r.ok) return res.status(409).json(r);
    res.json(r);
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Bỏ khỏi hàng chờ (sale đã tạo tay / khách huỷ). CHỈ đánh dấu trong sổ của mình —
// TUYỆT ĐỐI không xoá đơn Pancake nào (luật số 1 của dự án).
ordersRouter.post('/queue/:id/skip', (req, res) => {
  const r = skipQueueItem(req.params.id, req.body?.reason || '', req.body?.by || 'dashboard');
  if (!r.ok) return res.status(404).json(r);
  res.json(r);
});

// Nội dung hội thoại — nguồn thứ 4 của cửa chống trùng (dấu hiệu đơn FB Commerce).
// Đọc hụt thì trả rỗng: thiếu một nguồn vẫn còn ba nguồn kia, nhưng không được vì thế mà chặn cả nút.
async function convMessages(item) {
  if (!item.conv || !item.cust) return [];
  try {
    const msgs = await pkGetMessages(item.page, item.conv, item.cust) || [];
    return msgs.map((m) => ({ text: String(m?.original_message || m?.message || '') }));
  } catch (e) { console.warn(`[order-bridge] không đọc được hội thoại ${item.conv}: ${e.message}`); return []; }
}

// ── BÁO CÁO MỔ (M15) ─────────────────────────────────────────────────────────
ordersRouter.get('/reports', (_req, res) => {
  res.json(latestReports().map((r) => ({ ...r, pageName: nameOf(r.pageId) })));
});

ordersRouter.get('/reports/:pageId', (req, res) => {
  const rows = readReports({ pageId: req.params.pageId, limit: Number(req.query.limit) || 30 });
  res.json({ pageId: req.params.pageId, pageName: nameOf(req.params.pageId), count: rows.length, reports: rows });
});

// Mổ NGAY một page (nghiệm thu / xem thử). Đúng 1 lời gọi model — như lượt đêm.
ordersRouter.post('/mine/:pageId', async (req, res) => {
  try {
    const rep = await minePage(req.params.pageId, { pageName: nameOf(req.params.pageId) });
    const { collected, ...clean } = rep; // hội thoại thô KHÔNG trả ra API (PII)
    res.json({ ...clean, pageName: nameOf(req.params.pageId) });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// Chạy cả lượt đêm bằng tay (dùng khi cần mổ lại sau sự cố). Tốn 1 lời gọi model/page.
ordersRouter.post('/mine-all', async (req, res) => {
  const ids = Array.isArray(req.body?.pageIds) ? req.body.pageIds.map(String) : [];
  try {
    const r = await runNightly({ pageIds: ids, gapMs: Number(req.body?.gapMs) || 30e3 });
    res.json({ ok: true, pages: r.reports?.length || 0, minutes: r.minutes, calls: r.calls, learn: r.learn?.merged || null });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// ── SỔ TEMPLATE CHỜ DUYỆT ────────────────────────────────────────────────────
ordersRouter.get('/templates', (req, res) => {
  const status = String(req.query.status || 'pending');
  const list = readCandidates().filter((c) => status === 'all' || c.status === status);
  res.json({ status, count: list.length, items: list });
});

// DUYỆT = cửa duy nhất làm mẫu mới có hiệu lực (ghi vào botcake-templates.json).
ordersRouter.post('/templates/:id/approve', (req, res) => {
  const r = approveCandidate(req.params.id, { by: req.body?.by || 'dashboard' });
  if (!r.ok) return res.status(400).json(r);
  res.json(r);
});

ordersRouter.post('/templates/:id/reject', (req, res) => {
  const r = rejectCandidate(req.params.id, { by: req.body?.by || 'dashboard', reason: req.body?.reason || '' });
  if (!r.ok) return res.status(404).json(r);
  res.json(r);
});
