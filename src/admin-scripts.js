// M02 · SCRIPT STUDIO — validator + vòng đời phiên bản + màn hình sửa kịch bản.
// Spec: docs/v2/01-TANG-NHAP-LIEU.md § M02 · luật cấm 07-KICH-BAN-TU-DONG.md §2
//
// Router RIÊNG, gắn vào `admin.js` bằng ĐÚNG MỘT DÒNG (docs/v2/08-SONG-SONG.md §3).
// Trang giao diện là `public/scripts.html` riêng, không đụng `public/admin.html`.
//
// ⚠️ Ô NHẬP KỊCH BẢN ĐÃ CÓ TỪ TRƯỚC và 37/38 page đã điền. File này KHÔNG xây lại ô
// nhập; nó thêm bốn thứ còn thiếu: phiên bản hoá · validator · trạng thái duyệt ·
// nút "Thử với 1 tin" chạy trên bản nháp mà không gửi cho khách thật.

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import {
  getKBForPage, getPageConfig, getPageList, getPageProductsRaw, getScriptDoc, getScriptVersion,
  saveDraft, sendForReview, publishVersion, restoreVersion, listScriptPages,
  scriptTokens, SCRIPT_FIELDS, CUSTOMER_FACING_FIELDS,
} from './kb.js';
import { allowedPrices, extractMoney, looksVietnamese, guardOutbound } from './outbound-guard.js';
import { allReadiness, computeReadiness, canEnableAI, buildDigest, sendDigest, sweep, startReadiness } from './readiness.js';
import { getRegistry, tokenHealth, refreshRegistry, registryAge, startPageRegistry } from './page-registry.js';
import { pancakePages } from './pancake.js';
import { buildSystem } from './prompts.js';
import { anthropic, aiExtras } from './llm.js';

// Spec §M02 ghi trần 1.200 — SỐ ĐÓ LỆCH VỚI THỰC TẾ và đã được đính chính. Kịch bản
// thật đang chạy dài 890–1.908 token, nên trần 1.200 sẽ chặn marketer xuất bản ngay
// cả khi họ chỉ sửa một chữ trên page vốn đã dài. Nâng lên 2.000 để mọi kịch bản hiện
// hành lọt qua, trên mức đó vẫn chặn cứng. (Ước lượng là chars/3.2 — tiếng Việt dày
// token hơn thế, nên con số này thiên về ĐẾM THIẾU; đừng hạ trần mà không đo lại.)
const MAX_TOKENS = Number(process.env.SCRIPT_MAX_TOKENS || 2000);
const REQUIRE_REVIEW = process.env.SCRIPT_REQUIRE_REVIEW !== '0';

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATOR — chặn cứng TRƯỚC khi xuất bản
//
// Sáu luật ở spec §M02, cộng một lớp tái dùng `outbound-guard.js`. Lý do tái dùng
// chứ không viết lại: `greeting` và `fastLane*` KHÔNG phải "cấu hình" — chúng là
// những tin nhắn bắn NGUYÊN VĂN cho khách. Vậy thì chúng phải qua đúng cái cửa mà
// mọi tin AI phải qua (M09), không có lý do gì được miễn.
//
// PHÂN BIỆT SỐNG CÒN giữa hai nhóm trường:
//   · GỬI KHÁCH (greeting, fastLane*)  → soi bằng toàn bộ luật outbound.
//   · NỘI BỘ    (tone, salesPrompt)    → chỉ dẫn cho model, VIẾT TIẾNG VIỆT LÀ ĐÚNG.
// Bắt luật "không tiếng Việt" lên `salesPrompt` sẽ chặn đứng cả 37 kịch bản đang
// chạy — chúng được marketer viết bằng tiếng Việt, và đó là cách dùng đúng.
// ═════════════════════════════════════════════════════════════════════════════

// ⚠️ `\b` CỦA JAVASCRIPT KHÔNG DÙNG ĐƯỢC CHO TIẾNG VIỆT. Nó định nghĩa "chữ" là
// [A-Za-z0-9_], nên `đ` `ừ` `ỉ` là KHÔNG-phải-chữ: `\bđọc lại\b` không bao giờ khớp
// "nhớ đọc lại" (trước `đ` là dấu cách — hai ký tự không-phải-chữ cạnh nhau thì không
// có ranh giới), và `địa chỉ\b` không bao giờ khớp "địa chỉ của khách". Mẫu vẫn biên
// dịch trót lọt, chỉ là im lặng không bắt gì — đúng kiểu lỗ hổng không ai phát hiện
// cho tới lúc một kịch bản lách qua. Thay bằng lookaround theo \p{L}\p{N} (cờ `u`).
const EDGE_L = '(?<![\\p{L}\\p{N}])';
const EDGE_R = '(?![\\p{L}\\p{N}])';
// `«` = ranh giới trái, `»` = ranh giới phải — đọc thay cho `\b` trong các mẫu dưới.
const vre = (src) => new RegExp(src.replaceAll('«', EDGE_L).replaceAll('»', EDGE_R), 'iu');

// Luật 2 · mưu toan ghi đè HARD_RULES từ chính kịch bản page.
// Đây là bề mặt prompt-injection thật: người viết kịch bản không cần ác ý, chỉ cần
// "cho phép em tự tính tổng tiền" là đủ phá quy tắc tiền hạng sống còn.
const OVERRIDE_PATTERNS = [
  [vre('«(bỏ qua|phớt lờ|không cần tuân|đừng tuân|không áp dụng)»[^.\\n]{0,40}«(quy tắc|nguyên tắc|rule|hướng dẫn|chỉ dẫn)»'), 'yêu cầu bỏ qua quy tắc cứng'],
  [vre('«(ignore|disregard|forget|override)»[^.\\n]{0,30}«(previous|above|prior|all|system|instructions?|rules?)»'), 'câu lệnh ghi đè kiểu prompt-injection'],
  [vre('«không cần»[^.\\n]{0,30}«(gọi tool|tool|get_price|create_draft_order)»'), 'cho phép bỏ qua tool — giá sẽ không còn nguồn sự thật'],
  [vre('«(tự tính|tự nhân|tự cộng|tự quy đổi|tự suy ra)»[^.\\n]{0,30}«(giá|tổng|tiền|total|price)»'), 'cho phép tự tính tiền — vi phạm quy tắc tiền'],
  [vre('«(được phép|cứ|có thể)»[^.\\n]{0,25}«(bịa|tự chế|tự nghĩ|làm tròn)»'), 'cho phép bịa thông tin'],
  [vre('«(hứa|cam kết|khẳng định)»[^.\\n]{0,30}«(giao|ship|delivery)»[^.\\n]{0,20}«(ngày mai|hôm nay|\\d+\\s*(giờ|ngày|hours?|days?))»'), 'chỉ dẫn hứa mốc giao cụ thể'],
  [vre('«(nói|trả lời|đáp|dùng)»[^.\\n]{0,25}«tiếng việt»'), 'chỉ dẫn trả lời khách bằng tiếng Việt'],
  [vre('«(đọc lại|nhắc lại|liệt kê|xác nhận lại)»[^.\\n]{0,30}«(số điện thoại|sđt|số đt|địa chỉ)»[^.\\n]{0,20}«(khách|customer)»'), 'chỉ dẫn đọc lại PII của khách'],
];

// Luật 5 · hứa ngày/giờ giao cụ thể. `outbound-guard` đã có luật này cho tin GỬI KHÁCH;
// bản dưới đây chỉ để soi hai trường NỘI BỘ (viết bằng tiếng Việt nên regex tiếng
// Anh/Tagalog bên kia không bắt được).
const VN_DELIVERY_PROMISE = vre('«(giao|ship|gửi hàng|tới tay|nhận hàng)»[^.\\n]{0,25}«(ngày mai|hôm nay|tối nay|sáng mai|trong \\d+\\s*(giờ|tiếng|ngày)|thứ (hai|ba|tư|năm|sáu|bảy))»');

const err = (rule, field, msg) => ({ level: 'error', rule, field, msg });
const warn = (rule, field, msg) => ({ level: 'warn', rule, field, msg });

/**
 * Soi một bản kịch bản trước khi cho lên LIVE.
 * @param {object} cfg  { tone, greeting, salesPrompt, fastLanePrice, fastLaneShip, fastLaneHowto }
 * @param {object} kb   KB của page (bảng giá lấy từ đây — `allowedPrices`)
 * @returns {{ok:boolean, errors:Array, warnings:Array, tokens:number, prices:number[]}}
 */
export function validateScript(cfg = {}, kb = {}) {
  const out = [];
  const clean = {};
  for (const k of SCRIPT_FIELDS) clean[k] = String(cfg[k] || '').trim();
  const allowed = allowedPrices(kb);
  const priceList = [...allowed].sort((a, b) => a - b);

  // ── Luật 1 · greeting KHÔNG được chứa con số giá ───────────────────────────
  //    Kể cả giá ĐÚNG. Giá đổi trên Sheet lúc 9h thì câu chào vẫn đọc giá cũ tới khi
  //    có người nhớ ra mà sửa tay — mà sẽ không ai nhớ. Giá chỉ được đi từ KB/tool ra.
  if (clean.greeting) {
    const money = extractMoney(clean.greeting);
    const bare = allowed.size ? (clean.greeting.match(/\d[\d.,]*/g) || []).map((s) => Number(s.replace(/,/g, ''))).filter((n) => allowed.has(n)) : [];
    const hits = [...new Set([...money, ...bare])];
    if (hits.length) out.push(err('GREETING_HAS_PRICE', 'greeting', `Câu chào chứa con số giá (${hits.join(', ')}). Giá phải lấy từ bảng giá/tool — nhét vào câu chào là lệch giá ngay lần đổi giá kế tiếp.`));
  }

  // ── Luật 2 · mưu toan ghi đè quy tắc cứng ──────────────────────────────────
  for (const f of SCRIPT_FIELDS) {
    if (!clean[f]) continue;
    for (const [re, why] of OVERRIDE_PATTERNS) {
      const m = clean[f].match(re);
      if (m) out.push(err('RULE_OVERRIDE', f, `${why} — "${m[0].trim().slice(0, 70)}". HARD_RULES luôn thắng; kịch bản page chỉ được đổi giọng điệu và cách bán.`));
    }
  }

  // ── Luật 3 · fastLane.price phải khớp ĐÚNG bảng giá hiện tại ───────────────
  if (clean.fastLanePrice) {
    if (!allowed.size) {
      out.push(err('FASTLANE_PRICE_MISMATCH', 'fastLanePrice', 'Page chưa có bảng giá trong KB nên không đối chiếu được — không xuất bản câu trả lời giá cứng.'));
    } else {
      const said = extractMoney(clean.fastLanePrice);
      const bad = said.filter((n) => !allowed.has(n));
      if (bad.length) out.push(err('FASTLANE_PRICE_MISMATCH', 'fastLanePrice', `Nêu giá ${bad.join(', ')} không có trong bảng giá (hợp lệ: ${priceList.join(', ')}).`));
      if (!said.length) out.push(err('FASTLANE_PRICE_MISMATCH', 'fastLanePrice', 'Câu trả lời giá không có con số nào — khách hỏi giá mà không nhận được giá.'));
      const missed = priceList.filter((p) => !said.includes(p));
      if (said.length && missed.length) out.push(warn('FASTLANE_PRICE_PARTIAL', 'fastLanePrice', `Chưa nhắc gói giá ${missed.join(', ')} — khách không thấy gói lớn thì không có đường nâng đơn.`));
    }
  }

  // ── Luật 4 · không tiếng Việt trong trường GỬI KHÁCH ───────────────────────
  for (const f of CUSTOMER_FACING_FIELDS) {
    if (clean[f] && looksVietnamese(clean[f])) {
      out.push(err('VIETNAMESE', f, 'Trường này bắn NGUYÊN VĂN cho khách mà đang có tiếng Việt. Khách là người Philippines/Ả Rập — dùng Tagalog/English/Ả Rập.'));
    }
  }

  // ── Luật 5 · không hứa ngày/giờ giao cụ thể ────────────────────────────────
  for (const f of ['tone', 'salesPrompt']) {
    const m = clean[f] && clean[f].match(VN_DELIVERY_PROMISE);
    if (m) out.push(err('DELIVERY_PROMISE', f, `Chỉ dẫn hứa mốc giao cụ thể — "${m[0].trim()}". Chỉ được nói khung chung "2-5 days".`));
  }

  // ── Luật 6 · tổng độ dài 3 trường nạp vào prompt ───────────────────────────
  const tokens = scriptTokens(clean);
  if (tokens > MAX_TOKENS) {
    out.push(err('TOO_LONG', 'salesPrompt', `Kịch bản ~${tokens} token, vượt trần ${MAX_TOKENS} (SCRIPT_MAX_TOKENS). Prompt phình thì mỗi lượt trả lời đắt thêm trên MỌI khách của page.`));
  }

  // ── Lớp tái dùng · trường gửi khách phải qua được M09 Outbound Guard ───────
  //    isOrderSummary=true để luật PII_ECHO không bắt nhầm số hỗ trợ trong câu mẫu.
  for (const f of CUSTOMER_FACING_FIELDS) {
    if (!clean[f]) continue;
    const v = guardOutbound(clean[f], { kb, isOrderSummary: true });
    if (v.ok) continue;
    if (v.rule === 'VIETNAMESE' || v.rule === 'PRICE_MISMATCH') continue; // đã có luật riêng ở trên, đừng báo hai lần
    out.push(err(`GUARD_${v.rule}`, f, `${v.reason} (luật M09 — câu này gửi thẳng cho khách nên phải qua được Outbound Guard).`));
  }

  const errors = out.filter((x) => x.level === 'error');
  return { ok: errors.length === 0, errors, warnings: out.filter((x) => x.level === 'warn'), tokens, prices: priceList };
}

// ═════════════════════════════════════════════════════════════════════════════
// Router
// ═════════════════════════════════════════════════════════════════════════════

export const scriptsRouter = express.Router();

const who = (req) => String(req.body?.by || req.get('x-admin-user') || config.adminUser || 'dashboard').slice(0, 60);
const pageName = (id) => pancakePages().get(String(id))?.name || getRegistry()[String(id)]?.name
  || getPageList().find((p) => String(p.id) === String(id))?.name || String(id);

// ── CỔNG BẬT AI ──────────────────────────────────────────────────────────────
// Chặn TRƯỚC route `/pages/:id/ai` có sẵn trong admin.js. Cho qua thì gọi next()
// để handler cũ chạy nguyên như trước — không nhân bản logic bật/tắt ra hai nơi.
scriptsRouter.post('/pages/:id/ai', (req, res, next) => {
  if (req.body?.on === false) return next();      // TẮT thì luôn được phép
  const gate = canEnableAI(req.params.id);
  if (gate.ok) return next();
  res.status(409).json({
    error: `Chưa bật được AI cho "${pageName(req.params.id)}" — ${gate.readiness}`,
    readiness: gate.readiness, blockers: gate.blockers, reason: gate.reason,
    hint: 'Bổ sung phần còn thiếu rồi xuất bản kịch bản, sau đó bật lại.',
  });
});

// ── Trang giao diện ──────────────────────────────────────────────────────────
// Phục vụ từ đây thay vì thêm route vào `server.js` (file của luồng khác). Nằm dưới
// /admin nên vẫn được Basic Auth của server.js bảo vệ.
scriptsRouter.get('/scripts/ui', (_req, res) => {
  res.sendFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'scripts.html'));
});

// ── Danh sách page + trạng thái kịch bản ─────────────────────────────────────
scriptsRouter.get('/scripts', (_req, res) => {
  const rows = allReadiness();
  const byId = new Map(rows.map((r) => [r.pageId, r]));
  for (const id of listScriptPages()) if (!byId.has(id)) byId.set(id, computeReadiness(id));
  const list = [...byId.values()].map((r) => {
    const doc = getScriptDoc(r.pageId);
    return {
      pageId: r.pageId, name: r.name || pageName(r.pageId), marketer: r.marketer || '', market: r.market || '',
      readiness: r.readiness, aiAllowed: r.aiAllowed, aiEnabled: r.aiEnabled,
      blockers: r.blockers, warnings: r.warnings,
      version: doc.live?.version || null, status: doc.live?.status || (doc.draft ? doc.draft.status : '—'),
      pending: doc.draft ? { version: doc.draft.version, status: doc.draft.status } : null,
      updatedAt: doc.live?.updatedAt || null, updatedBy: doc.live?.updatedBy || '',
      tokens: scriptTokens(doc.liveConfig),
    };
  });
  list.sort((a, b) => Number(b.aiAllowed === false) - Number(a.aiAllowed === false) || String(a.name).localeCompare(String(b.name)));
  res.json({ requireReview: REQUIRE_REVIEW, maxTokens: MAX_TOKENS, count: list.length, pages: list });
});

// ── SOI TOÀN BỘ KỊCH BẢN ĐANG CHẠY ───────────────────────────────────────────
// Nghiệm thu L3: "chạy validator trên các kịch bản THẬT — báo cáo cái nào vi phạm
// luật gì". Cố ý làm thành ENDPOINT chứ không phải script chạy tay: nó phải chạy
// TẠI CHỖ trên máy đang giữ dữ liệu thật. Kịch bản là công marketer viết tay —
// kéo `kb-overrides.json` ra khỏi máy chủ để soi ở nơi khác là chuyện không cần làm.
//
// PHẢI đăng ký TRƯỚC `/scripts/:pageId`, nếu không Express khớp `:pageId = 'audit'`.
// Chỉ đọc: không ghi phiên bản, không đổi trạng thái, không đụng page nào.
scriptsRouter.get('/scripts/audit', (_req, res) => {
  const byRule = new Map();
  const pages = [];
  for (const id of listScriptPages()) {
    const cfg = getPageConfig(id);
    // Page trống hoàn toàn không phải việc của validator — đó là MISSING_SCRIPT của M03.
    if (!SCRIPT_FIELDS.some((k) => cfg[k])) continue;
    const v = validateScript(cfg, getKBForPage(id));
    const name = pageName(id);
    for (const e of [...v.errors, ...v.warnings]) {
      if (!byRule.has(e.rule)) byRule.set(e.rule, { rule: e.rule, level: e.level, pages: new Set() });
      byRule.get(e.rule).pages.add(name);
    }
    pages.push({
      pageId: id, name, ok: v.ok, tokens: v.tokens,
      errors: v.errors.map(({ rule, field, msg }) => ({ rule, field, msg })),
      warnings: v.warnings.map(({ rule, field, msg }) => ({ rule, field, msg })),
    });
  }
  pages.sort((a, b) => b.errors.length - a.errors.length || String(a.name).localeCompare(String(b.name)));
  res.json({
    checked: pages.length,
    failing: pages.filter((p) => !p.ok).length,
    byRule: [...byRule.values()]
      .map((r) => ({ rule: r.rule, level: r.level, count: r.pages.size, pages: [...r.pages] }))
      .sort((a, b) => (a.level === b.level ? b.count - a.count : a.level === 'error' ? -1 : 1)),
    pages,
  });
});

// ── Một page: bản LIVE, bản nháp, lịch sử, bảng giá ──────────────────────────
scriptsRouter.get('/scripts/:pageId', (req, res) => {
  const id = String(req.params.pageId);
  const doc = getScriptDoc(id);
  const kb = getKBForPage(id);
  const products = getPageProductsRaw(id);
  res.json({
    pageId: id, name: pageName(id),
    live: doc.live, draft: doc.draft, liveConfig: doc.liveConfig, versions: doc.versions,
    products, prices: [...allowedPrices(kb)].sort((a, b) => a - b),
    currency: products[0]?.currency || '',
    readiness: computeReadiness(id),
    maxTokens: MAX_TOKENS, requireReview: REQUIRE_REVIEW,
  });
});

// ── Soi thử, không lưu ───────────────────────────────────────────────────────
scriptsRouter.post('/scripts/:pageId/validate', (req, res) => {
  res.json(validateScript(req.body?.config || {}, getKBForPage(req.params.pageId)));
});

// ── LƯU NHÁP — không đụng production ─────────────────────────────────────────
scriptsRouter.post('/scripts/:pageId/draft', (req, res) => {
  const v = saveDraft(req.params.pageId, req.body?.config || {}, { updatedBy: who(req), note: req.body?.note || '' });
  res.json({ ok: true, version: v.version, status: v.status, validation: validateScript(v.config, getKBForPage(req.params.pageId)) });
});

// ── GỬI DUYỆT ────────────────────────────────────────────────────────────────
scriptsRouter.post('/scripts/:pageId/review', (req, res) => {
  const r = sendForReview(req.params.pageId, req.body?.version, { updatedBy: who(req) });
  if (!r.ok) return res.status(400).json(r);
  res.json({ ok: true, version: r.version.version, status: r.version.status });
});

// ── XUẤT BẢN — validator chặn cứng ở đây ─────────────────────────────────────
scriptsRouter.post('/scripts/:pageId/publish', (req, res) => {
  const id = String(req.params.pageId);
  const v = getScriptVersion(id, req.body?.version);
  if (!v) return res.status(404).json({ error: `không có phiên bản v${req.body?.version}` });
  if (REQUIRE_REVIEW && v.status === 'DRAFT') {
    return res.status(400).json({ error: `v${v.version} còn là bản nháp — phải Gửi duyệt trước (tắt bằng SCRIPT_REQUIRE_REVIEW=0).` });
  }
  const check = validateScript(v.config, getKBForPage(id));
  if (!check.ok) return res.status(422).json({ error: 'Kịch bản không qua được validator', ...check });

  const r = publishVersion(id, v.version, { updatedBy: who(req), validated: true });
  if (!r.ok) return res.status(400).json(r);
  console.log(`[script] page ${id} → XUẤT BẢN v${r.version.version} bởi ${r.version.publishedBy}`);
  res.json({ ok: true, version: r.version.version, warnings: check.warnings, readiness: computeReadiness(id) });
});

// ── KHÔI PHỤC — clone bản cũ thành version mới rồi xuất bản ───────────────────
scriptsRouter.post('/scripts/:pageId/restore/:version', (req, res) => {
  const id = String(req.params.pageId);
  const src = getScriptVersion(id, req.params.version);
  if (!src) return res.status(404).json({ error: `không có phiên bản v${req.params.version}` });
  // Bản cũ vẫn phải qua validator: bảng giá có thể đã đổi kể từ ngày nó được xuất bản,
  // và khôi phục một câu trả lời giá đã lỗi thời là đúng cái lỗi hạng sống còn.
  const check = validateScript(src.config, getKBForPage(id));
  if (!check.ok) return res.status(422).json({ error: `v${src.version} không còn hợp lệ với bảng giá/luật hiện tại`, ...check });

  const r = restoreVersion(id, src.version, { updatedBy: who(req), validated: true });
  if (!r.ok) return res.status(400).json(r);
  console.log(`[script] page ${id} → KHÔI PHỤC v${src.version} thành v${r.version.version}`);
  res.json({ ok: true, from: src.version, version: r.version.version });
});

// ── "THỬ VỚI 1 TIN" ──────────────────────────────────────────────────────────
// Chạy bản NHÁP qua đúng đường prompt thật (`buildSystem`) rồi soi câu trả lời bằng
// M09 — nhưng KHÔNG có tool và KHÔNG có đường nào ra Pancake. Không tạo đơn, không
// gửi ảnh, không chạm vào hội thoại của khách nào. Chỉ tốn 1 lượt gọi model.
scriptsRouter.post('/scripts/:pageId/try', async (req, res) => {
  const id = String(req.params.pageId);
  const text = String(req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'chưa nhập tin thử' });

  const cfg = req.body?.config || getPageConfig(id);
  const kb = { ...getKBForPage(id), config: cfg };
  const check = validateScript(cfg, kb);
  try {
    const r = await anthropic.messages.create({
      model: config.modelCloser, max_tokens: 400,
      system: buildSystem(kb),                       // KHÔNG truyền tools — thử nghiệm không được có tác dụng phụ
      messages: [{ role: 'user', content: text }],
      ...aiExtras,
    });
    const reply = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    res.json({
      ok: true, reply,
      guard: guardOutbound(reply, { kb, isOrderSummary: false, pageId: id }),
      validation: check,
      usage: { in: r.usage?.input_tokens || 0, out: r.usage?.output_tokens || 0 },
      note: 'Chạy trên bản nháp, không gọi tool, KHÔNG gửi cho khách.',
    });
  } catch (e) { res.status(502).json({ error: 'gọi model lỗi: ' + e.message, validation: check }); }
});

// ── M03 · readiness + bản tin ────────────────────────────────────────────────
scriptsRouter.get('/readiness', (_req, res) => {
  const rows = allReadiness();
  res.json({
    // Hai con số này CỐ Ý tách nhau ở cả API, không chỉ ở bản tin.
    blocked: rows.filter((r) => !r.aiAllowed).length,
    warned: rows.filter((r) => r.aiAllowed && r.warnings.length).length,
    ready: rows.filter((r) => r.readiness === 'READY').length,
    pages: rows,
  });
});
scriptsRouter.get('/readiness/digest', (_req, res) => res.json({ groups: buildDigest() }));
scriptsRouter.post('/readiness/digest/send', async (req, res) => {
  res.json(await sendDigest({ force: req.body?.force !== false }));
});
scriptsRouter.post('/readiness/sweep', async (_req, res) => res.json(await sweep()));

// ── M01 · sổ cái page ────────────────────────────────────────────────────────
scriptsRouter.get('/registry', (_req, res) => {
  res.json({ ageMs: registryAge(), tokens: tokenHealth(), pages: getRegistry() });
});
scriptsRouter.post('/registry/refresh', async (_req, res) => {
  try { res.json({ ok: true, pages: Object.keys(await refreshRegistry()).length, tokens: tokenHealth() }); }
  catch (e) { res.status(502).json({ error: e.message }); }
});

// Khởi động nền M01 + M03. Đặt ở đây vì `server.js` thuộc luồng khác — module này
// được `admin.js` nạp lúc boot nên hiệu quả tương đương. Cả hai hẹn giờ đều unref.
startPageRegistry();
startReadiness();
