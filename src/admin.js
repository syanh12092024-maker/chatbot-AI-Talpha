import express from 'express';
import {
  listTokens, addToken, removeToken, loadPageTokens, pageCount, getPageMeta, getStore,
} from './pages.js';
import { getPageList, getPageProductsRaw, updatePageProducts, syncFromSheet } from './kb.js';
import { getSheetId, getSheetUrl, setSheetId } from './sheets.js';
import {
  listConversations, getConversation, setHandoff, isAiEnabled, setAiEnabled, listAiDisabled,
} from './store.js';
import { sendText } from './messenger.js';
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
    aiDisabled: listAiDisabled().length,
  });
});

// ---- Pages ----
adminRouter.get('/pages', (_req, res) => {
  const list = getPageList().map((p) => {
    const meta = getPageMeta(p.id) || {};
    return {
      id: p.id, name: p.name, products: p.products || 0,
      market: p.market || '', category: p.category || '', marketer: p.marketer || '',
      aiEnabled: isAiEnabled(p.id),
      redundancy: meta.redundancy || 0, // số app dự phòng (failover)
    };
  });
  res.json(list);
});
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
