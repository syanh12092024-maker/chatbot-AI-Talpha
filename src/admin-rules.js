// L8 · ROUTER — bảng Kịch bản tự động + báo cáo trùng lặp Botcake ↔ Fast Lane.
// Spec: docs/v2/07-KICH-BAN-TU-DONG.md · docs/v2/prompts/L8-BOTCAKE-KICH-BAN.md
//
// Router RIÊNG, gắn vào `admin.js` bằng ĐÚNG MỘT DÒNG; trang giao diện là
// `public/rules.html` riêng, không đụng `public/admin.html` (luật §3 của 08-SONG-SONG.md).
//
// TOÀN BỘ ROUTER NÀY CHỈ ĐỌC ĐỐI VỚI BOTCAKE. Không có route nào ghi lên Botcake — API
// không cho, và kể cả có cho thì cũng không làm: 277 page khách thật đang chạy trên đó.
// Thứ duy nhất route này "ghi" là nạp lại bảng luật từ Google Sheet vào RAM.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getKBForPage, getPageList, RULES_TAB } from './kb.js';
import { getSheetId, getSheetUrl } from './sheets.js';
import { pancakePages } from './pancake.js';
import { fastLane } from './fast-lane.js';
import {
  loadRules, listRules, rulesInfo, ruleMetrics, validateRule, normalizeRule, matchRule,
} from './rule-store.js';
import {
  getKeywordMap, compareWithFastLane, listBotcakePages, hasBotcakeKey, botcakeKeyCount,
  clearBotcakeCache, botcakeConfig, willBotcakeAnswer,
} from './botcake.js';

export const rulesRouter = express.Router();

const pageName = (id) => pancakePages().get(String(id))?.name
  || getPageList().find((p) => String(p.id) === String(id))?.name || String(id);

// ── Trang giao diện ──────────────────────────────────────────────────────────
// Phục vụ từ đây thay vì thêm route vào `server.js` (file của luồng khác). Nằm dưới
// /admin nên vẫn được Basic Auth của server.js bảo vệ.
rulesRouter.get('/rules/ui', (_req, res) => {
  res.sendFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'rules.html'));
});

// ═════════════════════════════════════════════════════════════════════════════
// BẢNG KỊCH BẢN
// ═════════════════════════════════════════════════════════════════════════════

rulesRouter.get('/rules', (req, res) => {
  const pageId = req.query.pageId ? String(req.query.pageId) : '';
  const all = listRules();
  const rows = (pageId ? listRules({ pageId }) : all).map((r) => ({
    ...r, pageName: r.pageId ? pageName(r.pageId) : '(mọi page)',
  }));
  const m = ruleMetrics();
  const byId = new Map(m.rows.map((x) => [x.id, x]));
  res.json({
    info: { ...rulesInfo(), tab: RULES_TAB, sheetUrl: getSheetUrl(), sheetConnected: !!getSheetId() },
    metricsNote: m,
    rules: rows.map((r) => ({ ...r, metrics: byId.get(r.id) || null })),
  });
});

rulesRouter.post('/rules/reload', async (_req, res) => {
  const r = await loadRules(getSheetId(), { kbFor: getKBForPage });
  if (!r.ok) return res.status(400).json({ error: r.reason, tab: RULES_TAB });
  res.json({ ok: true, ...r });
});

// ── Soi thử MỘT dòng chưa đưa lên Sheet ──────────────────────────────────────
// Marketer dán thử dòng vào đây trước khi ghi vào bảng — validator trả lời ngay
// thay vì để họ ghi BẬT rồi mới phát hiện dòng bị chặn.
rulesRouter.post('/rules/validate', (req, res) => {
  const row = req.body?.row || {};
  const r = normalizeRule(row);
  res.json({ rule: r, ...validateRule(r, getKBForPage(r.pageId)) });
});

// ── "THỬ VỚI 1 TIN" — chạy đúng đường Fast Lane thật, KHÔNG gửi cho ai ───────
// Không gọi model, không gọi Pancake, không tạo đơn. Chỉ để trả lời câu hỏi
// "tin này sẽ rơi vào đâu": dòng kịch bản nào, mẫu cứng nào, hay lên AI.
rulesRouter.post('/rules/try', async (req, res) => {
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'chưa nhập tin thử' });
  const pageId = String(req.body?.pageId || '');
  const kb = getKBForPage(pageId);
  const hit = matchRule({ pageId, text, kb, aiTurns: Number(req.body?.aiTurns || 0), lastAiText: String(req.body?.lastAiText || ''), usedLanes: new Set(), hasOrder: req.body?.hasOrder });
  // usedLanes MỚI mỗi lần thử: mô phỏng một khách mới, không làm bẩn số đo của dòng.
  const fl = fastLane({
    text, kb, pageId,
    aiTurns: Number(req.body?.aiTurns || 0),
    lastAiText: String(req.body?.lastAiText || ''),
    usedLanes: new Set(), hasOrder: req.body?.hasOrder,
  });
  let botcake = null;
  if (hasBotcakeKey(pageId)) {
    try { botcake = { willAnswer: await willBotcakeAnswer(pageId, text) }; } catch { botcake = null; }
  }
  res.json({
    text, pageId, pageName: pageId ? pageName(pageId) : '',
    matched: hit ? { id: hit.rule.id, situation: hit.rule.situation, condition: hit.condition, candidates: hit.candidates } : null,
    result: { handled: fl.handled, lane: fl.lane, reason: fl.reason, reply: fl.reply, aiHint: fl.aiHint || '', rule: fl.rule || '' },
    botcake,
    note: 'Chạy khô — không gọi model, không gửi cho khách, không đụng Botcake.',
  });
});

// ── Ba chỉ số/dòng ───────────────────────────────────────────────────────────
rulesRouter.get('/rules/metrics', (_req, res) => res.json(ruleMetrics()));

// ═════════════════════════════════════════════════════════════════════════════
// BOTCAKE (CHỈ ĐỌC)
// ═════════════════════════════════════════════════════════════════════════════

// PHẢI đăng ký TRƯỚC `/botcake/:pageId`, nếu không Express khớp `:pageId = 'compare'`.
rulesRouter.get('/botcake/compare', async (_req, res) => {
  const pages = listBotcakePages();
  const out = [];
  for (const p of pages) {
    try {
      const r = await compareWithFastLane(p.pageId, getKBForPage(p.pageId), fastLane);
      out.push({ ...r, pageName: pageName(p.pageId) });
    } catch (e) { out.push({ pageId: p.pageId, pageName: pageName(p.pageId), error: e.message }); }
  }
  const sum = (k) => out.reduce((a, x) => a + (x[k] || 0), 0);
  res.json({
    pages: out.length,
    duplicate: sum('duplicate'), complement: sum('complement'), blind: sum('blind'),
    kbGap: sum('kbGap'), off: sum('off'),
    items: out,
    note: 'Chỉ đọc & đề xuất — KHÔNG tự tắt luật nào. API Botcake không có phương thức ghi; muốn tắt phải vào Botcake làm tay.',
  });
});

rulesRouter.get('/botcake', (_req, res) => {
  // ⚠️ KHÔNG trả key. Chỉ pageId + 6 ký tự đuôi để người vận hành đối chiếu.
  const keys = listBotcakePages().map((p) => ({ ...p, pageName: pageName(p.pageId) }));
  const known = new Set(keys.map((k) => k.pageId));
  res.json({
    readOnly: botcakeConfig.readOnly,
    base: botcakeConfig.base,
    keys: botcakeKeyCount(),
    pages: keys,
    // Page đang có KB mà chưa có key Botcake → không đọc được luật, không bỏ chờ được.
    missingKey: getPageList().map((p) => String(p.id)).filter((id) => !known.has(id)).length,
    note: 'BOTCAKE_TOKENS trong .env dạng <pageId>:<key>,<pageId>:<key>. Key là PAGE-SCOPED — mỗi page một key.',
  });
});

rulesRouter.post('/botcake/refresh', (_req, res) => { clearBotcakeCache(); res.json({ ok: true }); });

rulesRouter.get('/botcake/:pageId', async (req, res) => {
  const id = String(req.params.pageId);
  try {
    const m = await getKeywordMap(id);
    res.json({ ...m, pageName: pageName(id) });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

rulesRouter.get('/botcake/:pageId/compare', async (req, res) => {
  const id = String(req.params.pageId);
  try {
    const r = await compareWithFastLane(id, getKBForPage(id), fastLane);
    res.json({ ...r, pageName: pageName(id) });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

// ═════════════════════════════════════════════════════════════════════════════
// Nạp bảng luật lúc boot + làm mới định kỳ.
// Đặt ở đây vì `server.js` thuộc luồng khác; module này được `admin.js` nạp lúc boot
// nên hiệu quả tương đương. Timer `unref()` để `npm test` không bị treo.
// ═════════════════════════════════════════════════════════════════════════════
const REFRESH_MS = Number(process.env.RULE_REFRESH_MS || 5 * 60e3);
let _started = false;

export function startRules() {
  if (_started) return;
  _started = true;
  const run = () => loadRules(getSheetId(), { kbFor: getKBForPage }).catch((e) => console.warn('[rules] nạp lỗi:', e.message));
  // Chờ một nhịp để `kb.js` kịp nạp KB — validator cần bảng giá mới soi được luật giá.
  setTimeout(run, 5000).unref?.();
  setInterval(run, REFRESH_MS).unref?.();
}

startRules();
