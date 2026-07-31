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
import { pancakePages, pancakePageCount, pkGetMessages, pkSendReply, pkAddNote, listPancakeTokens, addPancakeToken, removePancakeToken } from './pancake.js';
import { parsePancakeScript } from './import-script.js';
import { recordOutbound } from './store.js';
import { getStats } from './stats.js';
import { recount, needSale, recentConversations, custProfile } from './ai-log.js';
import { cleanText } from './handler.js';
import { ordersEnabled, aiOrderStats, ordersForConv } from './pancake-orders.js';
import { getAiConvSet } from './ai-convs.js';
import { sendHealth } from './pancake-poll.js';
import { anthropic } from './llm.js';

export const adminRouter = express.Router();

// ---- Tổng quan ----
adminRouter.get('/overview', (_req, res) => {
  const withKB = getPageList().filter((p) => (p.products || 0) > 0).length;
  const pk = pancakePages();
  res.json({
    pages: pancakePageCount() || pageCount(),
    pagesWithKB: withKB,
    source: pancakePageCount() ? 'pancake' : 'facebook',
    conversations: listConversations().length,
    aiEnabled: listAiEnabled().length,
    // Cảnh báo backoff: page đang lỗi gửi / tạm ngừng (nguyên tắc #9)
    sendErrors: sendHealth().map((e) => ({ ...e, pageName: pk.get(String(e.page))?.name || e.page })),
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

// ---- HÀNG CHỜ CHO SALE: AI đã chốt đơn / cần người → sale vào nắm thông tin ----
adminRouter.get('/need-sale', (req, res) => {
  const hours = Math.min(Number(req.query.hours) || 48, 24 * 14);
  const pk = pancakePages();
  const list = needSale({ hours }).map((r) => ({ ...r, pageName: pk.get(String(r.page))?.name || r.page }));
  res.json({ hours, count: list.length, list });
});

// ---- ĐƠN TỪ KHÁCH AI: khớp đơn Pancake với hội thoại AI đã tư vấn → tỉ lệ chốt thật ----
const _ordCache = new Map();
adminRouter.get('/orders', async (req, res) => {
  if (!ordersEnabled()) return res.json({ enabled: false, pages: {} });
  const rgx = /^\d{4}-\d{2}-\d{2}$/;
  const from = rgx.test(req.query.from || '') ? req.query.from : undefined;
  const to = rgx.test(req.query.to || '') ? req.query.to : undefined;
  const cacheKey = `${from || ''}|${to || ''}`;
  const hit = _ordCache.get(cacheKey);
  if (hit && Date.now() - hit.t < 60000) return res.json(hit.data);
  const st = getStats();
  const ids = [...new Set([...listAiEnabled().map(String), ...Object.keys(st.byPage)])];
  try {
    const pages = {};
    for (const id of ids) { // tuần tự để không làm nghẽn API Pancake
      const r = await aiOrderStats(id, getAiConvSet(id), { from, to });
      pages[id] = { aiOrders: r.customers, aiOrderCount: r.orders };
    }
    let totalAiOrders = 0;
    for (const v of Object.values(pages)) totalAiOrders += v.aiOrders;
    const data = { enabled: true, aiOrders: totalAiOrders, pages };
    _ordCache.set(cacheKey, { t: Date.now(), data });
    res.json(data);
  } catch (e) { res.status(500).json({ enabled: true, error: e.message }); }
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
// Gộp 2 nguồn: RAM (hội thoại live từ lúc server chạy) + Sổ AI (72h — SỐNG SÓT QUA RESTART).
adminRouter.get('/conversations', (req, res) => {
  const pageId = req.query.pageId;
  const pk = pancakePages();
  const nameOf = (id) => pk.get(String(id))?.name || String(id);
  const ram = listConversations({ pageId });
  const seenConv = new Set(ram.map((r) => r.pkConvId).filter(Boolean));
  const seenPsid = new Set(ram.map((r) => String(r.psid)));
  const merged = ram.map((r) => ({
    psid: String(r.psid), pageId: String(r.pageId),
    pageName: r.pageName || nameOf(r.pageId),
    custName: r.custName || '', lastText: r.lastText || '', lastAt: r.lastAt || 0,
    handoff: !!r.handoff, hasOrder: !!r.orderId, live: true,
    conv: r.pkConvId || '', cust: r.pkCustId || '',
  }));
  for (const g of recentConversations({ hours: 72 })) {
    if (pageId && String(g.page) !== String(pageId)) continue;
    const psid = (g.conv || '').split('_')[1] || '';
    if ((g.conv && seenConv.has(g.conv)) || (psid && seenPsid.has(psid))) continue; // RAM đã có → ưu tiên bản live
    merged.push({
      psid, pageId: g.page, pageName: nameOf(g.page),
      custName: g.name || '', lastText: g.lastText || '', lastAt: g.t,
      handoff: g.lastType === 'handoff', hasOrder: g.hasOrder, live: false,
      conv: g.conv || '', cust: g.cust,
    });
  }
  merged.sort((a, b) => b.lastAt - a.lastAt);
  res.json(merged.slice(0, 200));
});
// Chi tiết hội thoại: RAM nếu có (đủ tin agent/system); không có → KÉO NGUYÊN VĂN từ Pancake.
adminRouter.get('/conversation/:psid', async (req, res) => {
  const pk = pancakePages();
  const c = getConversation(req.params.psid);
  if (c && (c.transcript || []).length) {
    c.pageName = c.pageName || pk.get(String(c.pageId))?.name || c.pageId;
    return res.json(c);
  }
  const { pageId, conv, cust } = req.query;
  if (!(pageId && conv && cust)) {
    if (c) return res.json(c);
    // Hội thoại cũ (trước khi Sổ AI ghi mã hội thoại) → không kéo được nguyên văn.
    return res.json({ psid: req.params.psid, pageId: pageId || '', transcript: [], noHistory: true });
  }
  try {
    const msgs = await pkGetMessages(pageId, conv, cust);
    const transcript = msgs.map((m) => {
      const images = [];
      let extra = '';
      for (const a of (m.attachments || [])) {
        const ty = String(a.type || '');
        if (a.url && /photo|image|sticker/i.test(ty)) images.push(a.url);
        else if ((a.post_attachments || []).length) extra = '(bài/video quảng cáo)';
        else if (a.url || a.image_data) images.push(a.url || '');
      }
      const text = (m.original_message || m.message || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return {
        who: String(m.from?.id) === String(pageId) ? 'ai' : 'customer',
        text: text || extra || (images.length ? '' : ((m.attachments || []).length ? '(đính kèm)' : '')),
        images: images.filter(Boolean),
      };
    }).filter((m) => m.text || (m.images || []).length);
    res.json({
      psid: req.params.psid, pageId, pageName: pk.get(String(pageId))?.name || pageId,
      custName: '', handoff: !!(c && c.handoff), transcript, fromPancake: true, pkConvId: conv, pkCustId: cust,
    });
  } catch (e) { res.status(502).json({ error: 'không đọc được từ Pancake: ' + e.message }); }
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
  // Toạ độ Pancake: ưu tiên từ RAM state; không có thì client gửi kèm (hội thoại dựng từ Sổ AI).
  const kPage = (c && c.pageId) || req.body?.pageId;
  const kConv = (c && c.pkConvId) || req.body?.conv;
  const kCust = (c && c.pkCustId) || req.body?.cust;
  setHandoff(req.params.psid, true, 'manual'); // người gửi tay → AI im hội thoại này
  recordOutbound(req.params.psid, text, 'agent');
  if (kPage && kConv && kCust) {
    const r = await pkSendReply(kPage, kConv, kCust, text);
    if (!r.ok) return res.status(502).json({ error: 'Pancake từ chối: ' + r.error });
    return res.json({ ok: true, via: 'pancake' });
  }
  if (!c) return res.status(404).json({ error: 'không tìm thấy' });
  await sendText(req.params.psid, text, c.pageId);
  res.json({ ok: true, via: 'fb' });
});

// ---- CỘT THÔNG TIN hội thoại: khách (từ Sổ AI) + đơn hàng POS của đúng hội thoại ----
// ---- PANEL THÔNG TIN hội thoại: hồ sơ khách (Sổ AI) + đơn POS khớp conversation_id ----
const CCY_DIV = { KWD: 1000, OMR: 1000, BHD: 1000 }; // tiền 3 số lẻ; còn lại chia 100
adminRouter.get(['/conversation-info', '/conv-info'], async (req, res) => {
  const { pageId, conv, cust } = req.query;
  if (!pageId) return res.status(400).json({ error: 'thiếu pageId' });
  const prof = custProfile(pageId, cust || '');
  const currency = (getPageProductsRaw(pageId)[0] || {}).currency || '';
  let orders = [];
  try { if (ordersEnabled() && conv) orders = await ordersForConv(pageId, conv); } catch { /* không chặn panel */ }
  const div = CCY_DIV[String(currency).toUpperCase()] || 100;
  orders = orders.map((o) => ({ ...o, codDisplay: o.cod != null ? (o.cod / div).toLocaleString('vi-VN') + (currency ? ' ' + currency : '') : '' }));
  if (!prof.phone && orders[0]?.phone) prof.phone = orders[0].phone;
  if (!prof.name && orders[0]?.name) prof.name = orders[0].name;
  res.json({ ...prof, currency, maxTurns: config.maxAiTurnsBeforeHandoff, orders });
});

// ---- Ghi chú vào hồ sơ khách trên Pancake (sale ghi từ dashboard, sale trực Pancake thấy ngay) ----
adminRouter.post(['/conversation-note', '/conv-note'], async (req, res) => {
  const { pageId, cust, text } = req.body || {};
  const t = String(text || '').trim();
  if (!(pageId && cust && t)) return res.status(400).json({ error: 'thiếu pageId/cust/nội dung' });
  const r = await pkAddNote(pageId, cust, `📝 [Dashboard] ${t}`).catch((e) => ({ ok: false, error: e.message }));
  if (r && r.ok === false) return res.status(502).json({ error: r.error });
  res.json({ ok: true });
});

// ---- Dịch hội thoại sang tiếng Việt (Haiku) — cho sale đọc hội thoại ngoại ngữ ----
adminRouter.post('/translate', async (req, res) => {
  const msgs = Array.isArray(req.body?.msgs) ? req.body.msgs.slice(0, 50) : [];
  if (!msgs.length) return res.json({ vi: [] });
  try {
    const src = msgs.map((m, i) => `${i + 1}|${cleanText(m, 300).replace(/\n/g, ' ')}`).join('\n');
    const r = await anthropic.messages.create({
      model: config.modelClassifier, max_tokens: 2500,
      system: 'Dịch từng dòng sau sang tiếng Việt tự nhiên, ngắn gọn (giữ nghĩa bán hàng). Trả đúng định dạng "số|bản dịch", mỗi dòng một bản, không thêm gì khác.',
      messages: [{ role: 'user', content: src }],
    });
    const text = r.content.find((b) => b.type === 'text')?.text || '';
    const vi = new Array(msgs.length).fill('');
    for (const line of text.split('\n')) { const m = line.match(/^(\d+)\|(.*)$/); if (m) { const i = +m[1] - 1; if (i >= 0 && i < vi.length) vi[i] = m[2].trim(); } }
    res.json({ vi });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// ---- TOKEN PANCAKE (đa tài khoản, failover): xem / thêm / xóa từ dashboard ----
adminRouter.get('/pancake-tokens', (_req, res) => res.json(listPancakeTokens()));
adminRouter.post('/pancake-tokens', async (req, res) => {
  const r = await addPancakeToken(req.body?.token);
  if (!r.ok) return res.status(400).json(r);
  res.json(r);
});
adminRouter.delete('/pancake-tokens/:i', (req, res) => {
  const r = removePancakeToken(req.params.i);
  if (!r.ok) return res.status(400).json(r);
  res.json(r);
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
