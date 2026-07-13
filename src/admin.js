import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import {
  listTokens, addToken, removeToken, loadPageTokens, pageCount, getPageMeta, getStore,
} from './pages.js';
import { getPageList, getPageProductsRaw, updatePageProducts, syncFromSheet } from './kb.js';
import { getSheetId, getSheetUrl, setSheetId } from './sheets.js';
import {
  listConversations, getConversation, setHandoff, isAiEnabled, setAiEnabled, listAiEnabled,
} from './store.js';
import { sendText, subscribePage } from './messenger.js';
import { recordOutbound } from './store.js';

export const adminRouter = express.Router();

// ---- Tổng quan ----
adminRouter.get('/overview', (_req, res) => {
  const tokens = listTokens();
  const pages = getPageList();
  const withKB = pages.filter((p) => (p.products || 0) > 0).length;
  res.json({
    pages: pageCount(),
    pagesWithKB: withKB,
    tokensTotal: tokens.length,
    tokensHealthy: tokens.filter((t) => t.healthy).length,
    conversations: listConversations().length,
    aiEnabled: listAiEnabled().length,
  });
});

// ---- Pages ----
// Danh sách page lấy từ FACEBOOK (token store) — page MKT mới thêm vào BM tự xuất hiện
// (server quét lại 10 phút/lần). KB Sheet chỉ bổ sung thông tin kịch bản.
adminRouter.get('/pages', (_req, res) => {
  const kbById = new Map(getPageList().map((p) => [String(p.id), p]));
  const list = [];
  for (const [id, v] of getStore()) {
    const kb = kbById.get(String(id)) || {};
    kbById.delete(String(id));
    list.push({
      id, name: v.name || kb.name || '', products: kb.products || 0,
      market: kb.market || '', category: kb.category || '', marketer: kb.marketer || '',
      aiEnabled: isAiEnabled(id),
      redundancy: (getPageMeta(id) || {}).redundancy || 0, // số app dự phòng (failover)
    });
  }
  // Page có trong KB nhưng token chưa thấy (vd chưa vào BM) — vẫn liệt kê để biết.
  for (const [id, kb] of kbById) {
    list.push({ id, name: kb.name || '', products: kb.products || 0, market: kb.market || '', category: kb.category || '', marketer: kb.marketer || '', aiEnabled: isAiEnabled(id), redundancy: 0 });
  }
  list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  res.json(list);
});
adminRouter.post('/pages/:id/ai', async (req, res) => {
  const on = req.body?.on !== false;
  setAiEnabled(req.params.id, on);
  // Bật AI → tự đăng ký webhook cho page (page mới của MKT chưa subscribe thì tin nhắn không về).
  let subscribed;
  if (on) subscribed = await subscribePage(req.params.id);
  res.json({ ok: true, aiEnabled: isAiEnabled(req.params.id), subscribed });
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
  const page = getPageList().find((p) => String(p.id) === String(req.params.pageId));
  res.json({ pageId: req.params.pageId, pageName: page?.name || '', products: getPageProductsRaw(req.params.pageId) });
});
adminRouter.post('/kb/:pageId', (req, res) => {
  const r = updatePageProducts(req.params.pageId, req.body?.products || []);
  res.json(r);
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
