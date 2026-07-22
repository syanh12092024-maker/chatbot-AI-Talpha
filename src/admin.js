import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import {
  listTokens, addToken, removeToken, loadPageTokens, pageCount, getPageMeta, getStore,
} from './pages.js';
import { getPageList, getPageProductsRaw, updatePageProducts, updatePageConfig, getPageConfig, syncFromSheet } from './kb.js';
import { getSheetId, getSheetUrl, setSheetId } from './sheets.js';
import {
  listConversations, getConversation, setHandoff, isAiEnabled, setAiEnabled, listAiEnabled,
} from './store.js';
import { sendText } from './messenger.js';
import { pancakePages, pancakePageCount } from './pancake.js';
import { parsePancakeScript } from './import-script.js';
import { recordOutbound } from './store.js';
import { getStats } from './stats.js';
import { recount } from './ai-log.js';

export const adminRouter = express.Router();

// ---- Tổng quan ----
adminRouter.get('/overview', (_req, res) => {
  const withKB = getPageList().filter((p) => (p.products || 0) > 0).length;
  res.json({
    pages: pancakePageCount() || pageCount(),
    pagesWithKB: withKB,
    source: pancakePageCount() ? 'pancake' : 'facebook',
    conversations: listConversations().length,
    aiEnabled: listAiEnabled().length,
  });
});

// ---- Thống kê (bền). Lọc theo ngày: ?from=YYYY-MM-DD&to=YYYY-MM-DD (bỏ trống = tất cả) ----
adminRouter.get('/stats', (req, res) => {
  const rgx = /^\d{4}-\d{2}-\d{2}$/;
  const from = rgx.test(req.query.from || '') ? req.query.from : undefined;
  const to = rgx.test(req.query.to || '') ? req.query.to : undefined;
  const st = getStats({ from, to });
  const pk = pancakePages();
  const kbById = new Map(getPageList().map((p) => [String(p.id), p]));
  // Gộp: mọi page đang bật AI + mọi page từng có tin/đơn.
  const ids = new Set([...listAiEnabled().map(String), ...Object.keys(st.byPage)]);
  const rate = (orders, leads) => (leads > 0 ? Math.round((orders / leads) * 100) : 0); // tỉ lệ chốt %
  const pages = [...ids].map((id) => {
    const b = st.byPage[id] || { replies: 0, orders: 0, leads: 0 };
    const cfg = getPageConfig(id);
    const hasKb = ((kbById.get(id) || {}).products || 0) > 0 || !!(cfg.greeting || cfg.tone || cfg.salesPrompt);
    return {
      id,
      name: pk.get(id)?.name || (kbById.get(id) || {}).name || id,
      aiEnabled: isAiEnabled(id),
      replies: b.replies || 0,
      leads: b.leads || 0,
      orders: b.orders || 0,
      closeRate: rate(b.orders || 0, b.leads || 0),
      hasKb,
    };
  });
  pages.sort((a, b) => (b.replies - a.replies) || String(a.name).localeCompare(String(b.name)));
  res.json({
    totalPages: pancakePageCount() || pageCount(),
    pagesWithKB: getPageList().filter((p) => (p.products || 0) > 0).length,
    aiEnabled: listAiEnabled().length,
    range: { from: from || null, to: to || null },
    replies: st.replies, orders: st.orders, leads: st.leads,
    closeRate: rate(st.orders, st.leads),
    lastReplyAt: st.lastReplyAt,
    pages,
  });
});

// ---- Sổ AI: thống kê lại CHÍNH XÁC từ audit log (ai-messages.jsonl) ----
// ?from&to (YYYY-MM-DD). Đây là con số kiểm chứng được, tính lại từ mọi hành động AI đã ghi.
adminRouter.get('/audit', (req, res) => {
  const rgx = /^\d{4}-\d{2}-\d{2}$/;
  const from = rgx.test(req.query.from || '') ? req.query.from : undefined;
  const to = rgx.test(req.query.to || '') ? req.query.to : undefined;
  const r = recount({ from, to });
  const pk = pancakePages();
  const kbById = new Map(getPageList().map((p) => [String(p.id), p]));
  const rate = (o, l) => (l > 0 ? Math.round((o / l) * 100) : 0);
  const pages = Object.entries(r.byPage).map(([id, b]) => ({
    id, name: pk.get(id)?.name || (kbById.get(id) || {}).name || id,
    replies: b.replies, leads: b.leads, orders: b.orders, images: b.images, handoffs: b.handoffs,
    closeRate: rate(b.orders, b.leads),
  })).sort((a, b) => b.replies - a.replies);
  res.json({
    source: 'audit-log', events: r.events, lastAt: r.lastAt,
    replies: r.replies, leads: r.leads, orders: r.orders, closeRate: rate(r.orders, r.leads),
    pages,
  });
});

// ---- Pages ----
// Danh sách page lấy từ PANCAKE (nguồn tin chính). KB Sheet bổ sung kịch bản.
adminRouter.get('/pages', (_req, res) => {
  const kbById = new Map(getPageList().map((p) => [String(p.id), p]));
  const source = pancakePages().size
    ? pancakePages()
    : new Map([...getStore()].map(([id, v]) => [String(id), { id, name: v.name }]));
  const list = [];
  for (const [id, p] of source) {
    const kb = kbById.get(String(id)) || {};
    kbById.delete(String(id));
    const cfg = getPageConfig(id);
    const hasKb = (kb.products || 0) > 0 || !!(cfg.greeting || cfg.tone || cfg.salesPrompt);
    const preview = String(cfg.greeting || cfg.salesPrompt || '').replace(/\s+/g, ' ').trim().slice(0, 120);
    list.push({
      id, name: p.name || kb.name || '', products: kb.products || 0, hasKb, preview,
      market: kb.market || '', category: kb.category || '', marketer: kb.marketer || '',
      aiEnabled: isAiEnabled(id), redundancy: 0,
    });
  }
  // Chỉ khi CHƯA có Pancake mới liệt kê thêm page KB (fallback). Có Pancake → chỉ hiện
  // page Pancake thật sự phục vụ được, tránh rối vì page trong Sheet nhưng không ở Pancake.
  if (!pancakePages().size) {
    for (const [id, kb] of kbById) {
      list.push({ id, name: kb.name || '', products: kb.products || 0, market: kb.market || '', category: kb.category || '', marketer: kb.marketer || '', aiEnabled: isAiEnabled(id), redundancy: 0 });
    }
  }
  list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  res.json(list);
});
// Bật/tắt AI cho page — điều khiển thẳng vòng lặp Pancake (không cần webhook FB).
adminRouter.post('/pages/:id/ai', (req, res) => {
  setAiEnabled(req.params.id, req.body?.on !== false);
  res.json({ ok: true, aiEnabled: isAiEnabled(req.params.id) });
});

// ---- Tin nhắn / hội thoại ----
adminRouter.get('/conversations', (req, res) => {
  res.json(listConversations({ pageId: req.query.pageId }));
});
adminRouter.get('/conversation/:psid', (req, res) => {
  const c = getConversation(req.params.psid);
  if (!c) return res.status(404).json({ error: 'không tìm thấy' });
  res.json(c);
});
adminRouter.post('/conversation/:psid/takeover', (req, res) => {
  setHandoff(req.params.psid, true, 'manual');
  res.json({ ok: true });
});
adminRouter.post('/conversation/:psid/release', (req, res) => {
  setHandoff(req.params.psid, false);
  res.json({ ok: true });
});
adminRouter.post('/conversation/:psid/send', async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'tin rỗng' });
  const c = getConversation(req.params.psid);
  if (!c) return res.status(404).json({ error: 'không tìm thấy' });
  setHandoff(req.params.psid, true, 'manual');
  recordOutbound(req.params.psid, text, 'agent');
  await sendText(req.params.psid, text, c.pageId);
  res.json({ ok: true });
});

// ---- Upload ảnh sản phẩm (base64 từ dashboard → lưu file → trả URL công khai) ----
const UPLOAD_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)), 'public', 'uploads');
const EXT_BY_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
adminRouter.post('/upload-image', (req, res) => {
  try {
    const { dataUrl, pageId, productId } = req.body || {};
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(String(dataUrl || ''));
    if (!m) return res.status(400).json({ error: 'Ảnh không hợp lệ (chỉ nhận jpg/png/webp/gif).' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 10 * 1024 * 1024) return res.status(400).json({ error: 'Ảnh quá lớn (>10MB).' });
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const safe = String(productId || 'img').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'img';
    const file = `${String(pageId || 'p').replace(/[^0-9]/g, '')}-${safe}-${Date.now()}.${EXT_BY_MIME[m[1]]}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, file), buf);
    const url = (config.publicUrl ? config.publicUrl : '') + '/uploads/' + file;
    res.json({ ok: true, url, absolute: !!config.publicUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Kịch bản / KB ----
adminRouter.get('/kb/:pageId', (req, res) => {
  const pancake = pancakePages().get(String(req.params.pageId));
  const page = getPageList().find((p) => String(p.id) === String(req.params.pageId));
  res.json({
    pageId: req.params.pageId,
    pageName: pancake?.name || page?.name || '',
    products: getPageProductsRaw(req.params.pageId),
    config: getPageConfig(req.params.pageId),
  });
});
adminRouter.post('/kb/:pageId', (req, res) => {
  const r = updatePageProducts(req.params.pageId, req.body?.products || []);
  res.json(r);
});
// Cấu hình AI theo page (lời chào / giọng điệu / hướng dẫn bán hàng riêng).
adminRouter.post('/kb/:pageId/config', (req, res) => {
  const r = updatePageConfig(req.params.pageId, req.body || {});
  res.json(r);
});
// Nhập kịch bản Pancake (.xlsx base64) → trả nháp {greeting, tone, salesPrompt, product}.
adminRouter.post('/import-script', (req, res) => {
  try {
    const b64 = String(req.body?.dataBase64 || '').replace(/^data:.*?;base64,/, '');
    if (!b64) return res.status(400).json({ error: 'Thiếu file.' });
    res.json({ ok: true, ...parsePancakeScript(b64) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ---- Google Sheet kịch bản ----
adminRouter.get('/sheet', (_req, res) => res.json({ id: getSheetId(), url: getSheetUrl() }));
adminRouter.post('/sheet', async (req, res) => {
  const url = String(req.body?.url || '').trim();
  if (!url) return res.status(400).json({ error: 'thiếu link Sheet' });
  setSheetId(url);
  try {
    const r = await syncFromSheet(getSheetId());
    res.json({ ok: true, ...r, url: getSheetUrl() });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
adminRouter.post('/sheet/reload', async (_req, res) => {
  if (!getSheetId()) return res.status(400).json({ error: 'chưa kết nối Sheet' });
  try { const r = await syncFromSheet(getSheetId()); res.json({ ok: true, ...r }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ---- API / Token Meta (failover) ----
adminRouter.get('/tokens', (_req, res) => res.json(listTokens()));
adminRouter.post('/tokens', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  if (!token) return res.status(400).json({ error: 'thiếu token' });
  addToken({ label: req.body?.label, token });
  const n = await loadPageTokens();
  res.json({ ok: true, pages: n });
});
adminRouter.delete('/tokens/:id', async (req, res) => {
  removeToken(req.params.id);
  const n = await loadPageTokens();
  res.json({ ok: true, pages: n });
});
adminRouter.post('/tokens/reload', async (_req, res) => {
  const n = await loadPageTokens();
  res.json({ ok: true, pages: n });
});
