// L8 · BẢNG KỊCH BẢN 2 CỘT — kho luật + validator luật CẤM + 3 chỉ số/dòng.
// Spec: docs/v2/07-KICH-BAN-TU-DONG.md §1–§4 (bước 1, 2, 4 — KHÔNG làm bước 5, đó là L9)
//
// ═══ ĐỌC TRƯỚC KHI SỬA: KỲ VỌNG PHẢI ĐÚNG ═══
// Đo trên 6.001 tin khách thật: Fast Lane đang xử lý 36,2%. 3.827 tin còn lại chứa
// **3.259 tình huống KHÁC NHAU** — đuôi dài cực dài, chỉ 70 tình huống lặp ≥3 lần.
// Và ~216 trong số đó là `ok`/`yes`/`1`/`2` — CÂU TRẢ LỜI CHO CÂU HỎI CỦA AI. Biến
// chúng thành mẫu cứng là MẤT ĐƠN, không phải tiết kiệm token.
//   ⇒ Trần thực tế ~50%, KHÔNG phải 80%. Đo ra >60% là dấu hiệu đang bắt nhầm tin
//     cần AI — dừng lại và soi, đừng ăn mừng.
//
// Vì vậy mọi lựa chọn thiết kế trong file này lệch về phía KHÔNG BẮT:
//   · khớp theo RANH GIỚI TỪ, không phải chuỗi con ("no" không được khớp "now")
//   · từ khoá <3 ký tự bị chặn cứng
//   · điều kiện không đánh giá được → KHÔNG bắn mẫu, chỉ đưa gợi ý cho AI
//   · giá trong câu trả lời được soi LẠI ngay lúc bắn, không chỉ lúc nạp
//   · một dòng chỉ bắn tối đa 1 lần cho một khách; hỏi lại → lên AI kèm gợi ý
//
// HARD_RULES LUÔN THẮNG. Dòng kịch bản chỉ thêm CÁCH TRẢ LỜI một tình huống; không
// được ghi đè quy tắc tiền / PII / không-bịa / ngôn ngữ. Validator dưới đây chặn cứng.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { allowedPrices, extractMoney, looksVietnamese, guardOutbound } from './outbound-guard.js';

export const RULE_STATUSES = ['BẬT', 'TẮT', 'CHỜ DUYỆT'];
export const RULE_CONDITIONS = ['luôn', 'chưa có đơn', 'đã báo giá', 'lượt ≥2'];

// Chỉ dòng BẬT mới chạy. CHỜ DUYỆT là nơi vòng học đêm (L9) sẽ đổ đề xuất vào —
// dựng sẵn trạng thái để L9 không phải sửa file này.
const LIVE = 'BẬT';

// ─────────────────────────────────────────────────────────────────────────────
// Chuẩn hoá & so khớp
//
// Khớp theo RANH GIỚI TỪ bằng cách đệm khoảng trắng hai đầu rồi `includes`. Cách này
// unicode-an-toàn (khác `\b` của JS — xem ghi chú dài trong admin-scripts.js: `\b` coi
// `đ`, `ế` là KHÔNG-phải-chữ nên mẫu tiếng Việt/Tagalog có dấu không bao giờ khớp),
// và tự nhiên hỗ trợ CỤM nhiều từ ("pwede isangla").
// ─────────────────────────────────────────────────────────────────────────────

export function normRule(s) {
  return String(s || '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hitsKeyword(padded, kw) {
  const k = normRule(kw);
  return !!k && padded.includes(` ${k} `);
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATOR — 6 NHÓM CẤM (§2) + luật cấu trúc
//
// Vì sao mỗi nhóm phải để AI, chép nguyên từ spec để người sửa sau không gỡ nhầm:
//   ① gật đầu/từ chối  → là câu trả lời cho câu hỏi AI VỪA hỏi; mẫu cứng trả lời lạc đề
//   ② số lượng/chọn gói → cần biết AI vừa hỏi gì
//   ③ tên/SĐT/địa chỉ  → đang thu thập thông tin đơn
//   ④ phản đối giá     → phải chạy ladder 3 bước (nguyên tắc 14)
//   ⑤ khiếu nại/hàng lỗi → phải bàn giao người
//   ⑥ câu trả lời có số tiền ngoài bảng giá → quy tắc tiền hạng SỐNG CÒN
// ─────────────────────────────────────────────────────────────────────────────

const FORBIDDEN = [
  {
    group: 'GẬT_ĐẦU_TỪ_CHỐI',
    why: 'Là câu trả lời cho câu hỏi AI vừa hỏi — mẫu cứng sẽ trả lời lạc đề và mất đơn',
    re: /^(ok|okay|okey|oky|oke|k|sige|sge|yes|yeah|yep|yup|opo|oo|noted|sure|g|game|alright|got it|no|nope|nah|hindi|ayoko|ayaw|wala|not now|maybe later|later|next time|تمام|اوك|نعم|لا)$/i,
  },
  {
    group: 'SỐ_LƯỢNG_CHỌN_GÓI',
    why: 'Cần biết AI vừa hỏi gì mới hiểu được "1" hay "2" nghĩa là gì',
    re: /^(\d+|\d+\s*(set|sets|pcs|pc|piece|pieces|box|boxes|bottle|bottles|tube|tubes|pack)|one|two|three|isa|dalawa|tatlo|first|second|una|pangalawa|واحد|اثنين)$/i,
  },
  {
    group: 'TÊN_SĐT_ĐỊA_CHỈ',
    why: 'Đang thu thập thông tin đơn — phải để AI dựng đơn, không được bắn mẫu',
    re: /^(name|full name|pangalan|contact|contact number|number|mobile|phone|address|adres|tirahan|emirate|city|barangay|zip|postal|الاسم|العنوان|رقم)$/i,
    extra: (kw) => /\d{7,}/.test(String(kw).replace(/\D/g, '')), // chính là một số điện thoại
  },
  {
    group: 'PHẢN_ĐỐI_GIÁ',
    why: 'Phải chạy ladder 3 bước của nguyên tắc 14 — mẫu cứng làm mất cơ hội gỡ',
    re: /(mahal|expensive|pricey|too much|sobrang mahal|discount|tawad|bawas|budget|wala pang pera|walang pera|sale price|cheaper|mura pa|غالي|خصم)/i,
  },
  {
    group: 'KHIẾU_NẠI_HÀNG_LỖI',
    // Gộp luôn cáo buộc lừa đảo/hàng giả (`peke`, `fake`, `scam`): đó không phải khiếu nại
    // hậu bán, nhưng cùng một kết luận — `fast-lane.js` cũng đang đẩy nguyên nhóm này lên
    // AI qua mẫu OBJECTION. Hai nơi nói cùng một điều thì đừng để lệch nhau.
    why: 'Phải bàn giao người thật (hoặc để AI gỡ) — trả lời máy móc lúc khách đang bực hoặc đang nghi hàng giả là mất khách + rủi ro review xấu',
    re: /(complaint|reklamo|sira|defective|damaged|broken|not working|hindi gumana|walang epekto|refund|return|palit|ibalik|scam|manloloko|peke|fake|sue|lawyer|شكوى|استرجاع|تالف)/i,
  },
];

// Mưu toan ghi đè HARD_RULES từ cột "Gợi ý cho AI". Đây là bề mặt prompt-injection thật:
// người viết không cần ác ý, chỉ cần "cho phép em tự tính tổng tiền" là đủ phá quy tắc tiền.
// (Cùng ý đồ với OVERRIDE_PATTERNS của admin-scripts.js — CỐ Ý chép lại vài mẫu thay vì
// import, vì import module đó kéo theo startPageRegistry()/startReadiness() chạy nền.)
const EDGE_L = '(?<![\\p{L}\\p{N}])';
const EDGE_R = '(?![\\p{L}\\p{N}])';
const vre = (src) => new RegExp(src.replaceAll('«', EDGE_L).replaceAll('»', EDGE_R), 'iu');
const HINT_OVERRIDE = [
  [vre('«(bỏ qua|phớt lờ|không cần tuân|đừng tuân|không áp dụng)»[^.\\n]{0,40}«(quy tắc|nguyên tắc|rule|hướng dẫn)»'), 'yêu cầu bỏ qua quy tắc cứng'],
  [vre('«(ignore|disregard|forget|override)»[^.\\n]{0,30}«(previous|above|prior|all|system|instructions?|rules?)»'), 'câu lệnh ghi đè kiểu prompt-injection'],
  [vre('«(tự tính|tự nhân|tự cộng|tự quy đổi|tự suy ra)»[^.\\n]{0,30}«(giá|tổng|tiền|total|price)»'), 'cho phép tự tính tiền — vi phạm quy tắc tiền'],
  [vre('«không cần»[^.\\n]{0,30}«(gọi tool|tool|get_price|create_draft_order)»'), 'cho phép bỏ qua tool — giá mất nguồn sự thật'],
  [vre('«(được phép|cứ|có thể)»[^.\\n]{0,25}«(bịa|tự chế|tự nghĩ|làm tròn)»'), 'cho phép bịa thông tin'],
  [vre('«(nói|trả lời|đáp|dùng)»[^.\\n]{0,25}«tiếng việt»'), 'chỉ dẫn trả lời khách bằng tiếng Việt'],
  [vre('«(đọc lại|nhắc lại|liệt kê)»[^.\\n]{0,30}«(số điện thoại|sđt|địa chỉ)»[^.\\n]{0,20}«(khách|customer)»'), 'chỉ dẫn đọc lại PII của khách'],
];

const err = (rule, msg) => ({ level: 'error', rule, msg });
const warn = (rule, msg) => ({ level: 'warn', rule, msg });

// Từ khoá quá ngắn là cái bẫy lớn nhất của cả module: khớp theo ranh giới từ đã cứu
// "no" khỏi "now", nhưng "po" (tiếng Tagalog rải khắp mọi câu) vẫn khớp hàng nghìn tin
// hoàn toàn khác nhau. Chặn cứng dưới 3 ký tự.
const MIN_KW = Number(process.env.RULE_MIN_KEYWORD || 3);

/**
 * Soi một dòng kịch bản.
 * @param {object} r   Dòng đã chuẩn hoá (xem normalizeRule)
 * @param {object} kb  KB của page (bảng giá lấy từ đây)
 */
export function validateRule(r, kb = {}) {
  const out = [];
  const kws = r.keywords || [];

  // ── Cấu trúc ──────────────────────────────────────────────────────────────
  if (!r.situation) out.push(err('MISSING_SITUATION', 'Thiếu cột "Tình huống" — không có tên thì không ai đọc được báo cáo đo dòng này'));
  if (!kws.length) out.push(err('MISSING_KEYWORD', 'Thiếu cột "Từ khoá bắt" — dòng không bao giờ khớp được tin nào'));
  if (!r.reply && !r.aiHint) out.push(err('EMPTY_ROW', 'Cả "Câu trả lời tự động" lẫn "Gợi ý cho AI" đều trống — dòng vô nghĩa (§1 bảng bốn cách kết hợp)'));
  if (r.status && !RULE_STATUSES.includes(r.status)) out.push(err('BAD_STATUS', `Trạng thái "${r.status}" không hợp lệ (${RULE_STATUSES.join(' | ')})`));
  if (r.conditionRaw && !RULE_CONDITIONS.includes(r.condition)) out.push(warn('BAD_CONDITION', `Điều kiện "${r.conditionRaw}" không nhận ra → hiểu là "luôn" (${RULE_CONDITIONS.join(' | ')})`));

  // ── Từ khoá ───────────────────────────────────────────────────────────────
  for (const kw of kws) {
    const n = normRule(kw);
    if (!n) { out.push(err('EMPTY_KEYWORD', `Từ khoá "${kw}" không còn ký tự nào sau khi chuẩn hoá`)); continue; }
    if (n.length < MIN_KW) {
      out.push(err('KEYWORD_TOO_SHORT', `Từ khoá "${kw}" chỉ ${n.length} ký tự — quá rộng, sẽ bắt nhầm hàng loạt tin khác. Mỗi tin bắt nhầm là một khách nhận câu máy móc lạc đề.`));
      continue;
    }
    for (const g of FORBIDDEN) {
      if (g.re.test(n) || (g.extra && g.extra(kw))) {
        out.push(err(`CẤM_${g.group}`, `Từ khoá "${kw}" rơi vào nhóm CẤM ${g.group}: ${g.why}`));
        break;
      }
    }
  }

  // ── Câu trả lời tự động: bắn NGUYÊN VĂN cho khách ─────────────────────────
  if (r.reply) {
    // ⑥ Số tiền phải khớp ĐÚNG một gói trong bảng giá (dùng lại hàm đã export ở M09).
    const allowed = allowedPrices(kb);
    const said = extractMoney(r.reply);
    if (said.length && !allowed.size) {
      out.push(err('PRICE_NO_KB', 'Câu trả lời có số tiền nhưng page chưa có bảng giá trong KB — không đối chiếu được thì không được bật'));
    } else if (said.length) {
      const bad = said.filter((n) => !allowed.has(n));
      if (bad.length) out.push(err('PRICE_MISMATCH', `Nêu số tiền ${bad.join(', ')} không khớp gói nào trong bảng giá (hợp lệ: ${[...allowed].sort((a, b) => a - b).join(', ')})`));
    }
    if (looksVietnamese(r.reply)) {
      out.push(err('VIETNAMESE', 'Câu trả lời tự động bắn NGUYÊN VĂN cho khách mà đang có tiếng Việt — khách là người Philippines/Ả Rập'));
    }
    // Phải qua được đúng cái cửa mọi tin AI phải qua. isOrderSummary=true để PII_ECHO
    // không bắt nhầm số hỗ trợ in sẵn trong câu mẫu.
    const v = guardOutbound(r.reply, { kb, isOrderSummary: true });
    if (!v.ok && v.rule !== 'VIETNAMESE' && v.rule !== 'PRICE_MISMATCH') {
      out.push(err(`GUARD_${v.rule}`, `${v.reason} (luật M09 — câu này gửi thẳng cho khách nên phải qua được Outbound Guard)`));
    }
    // Nguyên tắc 14: câu trả lời tự động phải kết bằng MỘT BƯỚC TIẾN về phía đơn.
    if (!/[?？]/.test(r.reply)) {
      out.push(warn('NO_NEXT_STEP', 'Câu trả lời không có câu hỏi nào — theo nguyên tắc 14 mỗi tin phải kết bằng một bước tiến về phía đơn'));
    }
  }

  // ── Gợi ý cho AI: chỉ dẫn nội bộ, VIẾT TIẾNG VIỆT LÀ ĐÚNG ─────────────────
  if (r.aiHint) {
    for (const [re, why] of HINT_OVERRIDE) {
      const m = r.aiHint.match(re);
      if (m) out.push(err('RULE_OVERRIDE', `${why} — "${m[0].trim().slice(0, 70)}". HARD_RULES luôn thắng; dòng kịch bản chỉ thêm cách trả lời tình huống.`));
    }
    if (r.aiHint.length > 400) out.push(warn('HINT_TOO_LONG', `Gợi ý ${r.aiHint.length} ký tự — gợi ý dài nạp vào prompt mỗi lượt, làm đắt thêm trên mọi khách khớp dòng này`));
  }

  const errors = out.filter((x) => x.level === 'error');
  return { ok: errors.length === 0, errors, warnings: out.filter((x) => x.level === 'warn') };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chuẩn hoá dòng Sheet → luật
// ─────────────────────────────────────────────────────────────────────────────

// Mã dòng ổn định theo (page, tình huống) — KHÔNG theo số thứ tự dòng. Marketer chèn
// một dòng ở giữa bảng thì mọi số đo của các dòng dưới sẽ nhảy sang dòng khác nếu dùng
// chỉ số. Băm nội dung thì mã sống sót qua mọi lần sắp xếp lại bảng.
function ruleId(pageId, situation) {
  const h = createHash('sha1').update(`${pageId || 'ALL'}|${normRule(situation)}`).digest('hex');
  return `R${h.slice(0, 6)}`;
}

const CONDITION_ALIAS = new Map([
  ['', 'luôn'], ['luon', 'luôn'], ['always', 'luôn'],
  ['chua co don', 'chưa có đơn'], ['chưa có đơn', 'chưa có đơn'],
  ['da bao gia', 'đã báo giá'], ['đã báo giá', 'đã báo giá'],
  ['luot 2', 'lượt ≥2'], ['lượt ≥2', 'lượt ≥2'], ['lượt >=2', 'lượt ≥2'], ['luot >=2', 'lượt ≥2'],
]);
const STATUS_ALIAS = new Map([
  ['', 'TẮT'], ['bat', 'BẬT'], ['bật', 'BẬT'], ['on', 'BẬT'],
  ['tat', 'TẮT'], ['tắt', 'TẮT'], ['off', 'TẮT'],
  ['cho duyet', 'CHỜ DUYỆT'], ['chờ duyệt', 'CHỜ DUYỆT'], ['pending', 'CHỜ DUYỆT'],
]);
const alias = (map, raw, fallback) => {
  const s = String(raw || '').trim();
  return map.get(s.toLowerCase()) || map.get(normRule(s)) || (s ? fallback : map.get(''));
};

export function normalizeRule(row) {
  const situation = String(row.situation || '').trim();
  const pageId = String(row.pageId || '').trim();
  const conditionRaw = String(row.condition || '').trim();
  const statusRaw = String(row.status || '').trim();
  return {
    id: ruleId(pageId, situation),
    row: row.row || 0,
    pageId, situation,
    keywords: String(row.keywords || '').split('|').map((s) => s.trim()).filter(Boolean),
    reply: String(row.reply || '').trim(),
    aiHint: String(row.aiHint || '').trim(),
    conditionRaw,
    condition: alias(CONDITION_ALIAS, conditionRaw, conditionRaw),
    priority: Number.isFinite(Number(row.priority)) && String(row.priority).trim() !== '' ? Number(row.priority) : 0,
    statusRaw,
    status: alias(STATUS_ALIAS, statusRaw, statusRaw),
    source: String(row.source || '').trim(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// KHO LUẬT (RAM) — nạp từ Sheet, dùng bởi fast-lane.js
// ─────────────────────────────────────────────────────────────────────────────

let _rules = [];        // đã chuẩn hoá + đã validate
let _loadedAt = 0;
let _loadInfo = { ok: false, reason: 'chưa nạp' };

/**
 * Nạp luật từ mảng dòng thô (kb.fetchScriptRuleRows) + chạy validator theo KB từng page.
 * @param {Array} rows
 * @param {(pageId:string)=>object} kbFor  Hàm lấy KB của page (thường là getKBForPage)
 */
export function setRules(rows, kbFor = () => ({})) {
  const seen = new Map();
  _rules = (rows || []).map((raw) => {
    const r = normalizeRule(raw);
    // Trùng mã (hai dòng cùng page + cùng tên tình huống) → gắn hậu tố để số đo không lẫn.
    const n = (seen.get(r.id) || 0) + 1;
    seen.set(r.id, n);
    if (n > 1) r.id = `${r.id}-${n}`;
    const v = validateRule(r, kbFor(r.pageId));
    // ⚠️ CHẶN CỨNG: dòng không qua validator KHÔNG BAO GIỜ chạy, kể cả người đã ghi BẬT
    // trên Sheet. Sheet là ô nhập tự do — không có ai duyệt giữa marketer và khách thật
    // ngoài chỗ này.
    return { ...r, valid: v.ok, errors: v.errors, warnings: v.warnings, live: v.ok && r.status === LIVE };
  });
  _loadedAt = Date.now();
  return _rules;
}

/** Nạp trực tiếp từ Google Sheet. Lỗi/thiếu tab → giữ nguyên bảng cũ, KHÔNG ném. */
export async function loadRules(sheetId, { kbFor = () => ({}), fetchRows } = {}) {
  const fetcher = fetchRows || (await import('./kb.js')).fetchScriptRuleRows;
  const r = await fetcher(sheetId);
  if (!r.ok) {
    _loadInfo = { ok: false, reason: r.reason, at: Date.now() };
    console.warn(`[rules] không nạp được bảng kịch bản: ${r.reason}`);
    return { ok: false, reason: r.reason, rules: _rules.length };
  }
  setRules(r.rows, kbFor);
  const live = _rules.filter((x) => x.live).length;
  const bad = _rules.filter((x) => !x.valid).length;
  _loadInfo = { ok: true, at: Date.now(), tab: r.tab };
  console.log(`[rules] nạp ${_rules.length} dòng kịch bản — ${live} BẬT, ${bad} bị validator chặn`);
  return { ok: true, rules: _rules.length, live, blocked: bad };
}

export function listRules({ pageId } = {}) {
  if (!pageId) return _rules;
  const p = String(pageId);
  return _rules.filter((r) => !r.pageId || r.pageId === p);
}
export function rulesInfo() {
  return {
    ..._loadInfo, loadedAt: _loadedAt,
    total: _rules.length,
    live: _rules.filter((r) => r.live).length,
    blocked: _rules.filter((r) => !r.valid).length,
    pending: _rules.filter((r) => r.status === 'CHỜ DUYỆT').length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SO KHỚP — thứ tự ưu tiên §4
//   1. Luật CẤM              → đã chặn ở validator, dòng không tồn tại trong tập live
//   2. Dòng có Page ID cụ thể → thắng dòng dùng chung
//   3. Ưu tiên cao hơn thắng
//   4. Cùng ưu tiên → "Điều kiện" HẸP HƠN thắng (khác "luôn" là hẹp hơn)
//   5. Không dòng nào khớp   → mẫu cứng trong code (fast-lane lớp 2)
//   6. Vẫn không             → AI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Điều kiện có thoả không.
 * @returns {'met'|'unmet'|'unknown'}
 *   'unknown' = KHÔNG ĐÁNH GIÁ ĐƯỢC (thiếu tín hiệu từ tầng gọi). Xử lý: không bắn
 *   câu mẫu, nhưng vẫn đưa "Gợi ý cho AI" — lệch đúng về phía "phân vân thì để AI".
 */
export function evalCondition(cond, ctx = {}) {
  switch (cond) {
    case 'luôn': return 'met';
    case 'lượt ≥2': return (ctx.aiTurns || 0) >= 2 ? 'met' : 'unmet';
    case 'chưa có đơn':
      if (ctx.hasOrder == null) return 'unknown'; // fast-lane chưa được truyền tín hiệu đơn
      return ctx.hasOrder ? 'unmet' : 'met';
    case 'đã báo giá': {
      // Hai đường đều quan sát được ngay trong fast-lane, không cần sửa handler:
      //   · Fast Lane đã bắn câu giá cho khách này (usedLanes có 'price'), hoặc
      //   · tin AI gần nhất có con số trùng một gói trong bảng giá.
      if (ctx.usedLanes instanceof Set && ctx.usedLanes.has('price')) return 'met';
      const allowed = allowedPrices(ctx.kb || {});
      if (!allowed.size) return 'unknown';
      if (!ctx.lastAiText) return 'unmet';
      return extractMoney(ctx.lastAiText).some((n) => allowed.has(n)) ? 'met' : 'unmet';
    }
    default: return 'met'; // điều kiện lạ đã bị validator cảnh báo và quy về "luôn"
  }
}

const narrower = (r) => (r.condition && r.condition !== 'luôn' ? 1 : 0);

/**
 * Soi LẠI giá ngay lúc sắp bắn (không chỉ lúc nạp).
 * Bảng giá đến từ Google Sheet và đổi bất cứ lúc nào; bảng luật thì cache. Giữa hai lần
 * nạp có một cửa sổ mà một dòng đã-hợp-lệ đang nói một cái giá đã chết. Đây là quy tắc
 * tiền hạng SỐNG CÒN (vụ khách bị báo gấp đôi giá → huỷ đơn + block page), nên chịu
 * thêm một lần `extractMoney` trên chuỗi ngắn mỗi lượt là rẻ.
 */
export function replyPriceOk(reply, kb) {
  const said = extractMoney(reply);
  if (!said.length) return true;
  const allowed = allowedPrices(kb || {});
  if (!allowed.size) return false;
  return said.every((n) => allowed.has(n));
}

/**
 * Tìm dòng kịch bản khớp tin khách.
 * @returns {null | {rule, condition:'met'|'unmet'|'unknown'}}
 */
export function matchRule(ctx = {}) {
  const text = String(ctx.text || '');
  if (!text.trim()) return null;
  const padded = ` ${normRule(text)} `;
  const pid = ctx.pageId ? String(ctx.pageId) : '';

  const hits = [];
  for (const r of _rules) {
    if (!r.live) continue;
    if (r.pageId && r.pageId !== pid) continue;               // dòng của page khác
    if (!r.keywords.some((kw) => hitsKeyword(padded, kw))) continue;
    hits.push(r);
  }
  if (!hits.length) return null;

  hits.sort((a, b) => (
    (b.pageId ? 1 : 0) - (a.pageId ? 1 : 0)   // ② page cụ thể thắng dòng dùng chung
    || b.priority - a.priority                 // ③ ưu tiên cao thắng
    || narrower(b) - narrower(a)               // ④ điều kiện hẹp hơn thắng
    || String(a.id).localeCompare(String(b.id))
  ));

  const rule = hits[0];
  return { rule, condition: evalCondition(rule.condition, ctx), candidates: hits.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// BA CHỈ SỐ / DÒNG (§3 bảng "chiều ngược lại") — bước 4 của §6
//
//   Lượt dùng    · dòng bắn bao nhiêu lần
//   Hỏi lại ngay · khách hỏi lại CÙNG Ý trong 2 lượt kế      → ngưỡng xấu >25%
//   Im sau đó    · khách không nhắn gì nữa                    → ngưỡng xấu >60%
//   Chốt sau đó  · tỉ lệ chốt của khách đã gặp dòng này       → thấp hơn page 30% là xấu
//
// ⚠️ HAI GIỚI HẠN, nói rõ để không ai đọc nhầm số:
//  ① `Chốt sau đó` cần tín hiệu ĐƠN — chỉ `handler.js` biết, mà `handler.js` KHÔNG
//     thuộc quyền luồng này. Đã export `noteRuleOrder()` sẵn; L0 nối 1 dòng (xem báo cáo).
//     Chưa nối thì cột này luôn bằng 0 — đó là "chưa đo", KHÔNG phải "chốt kém".
//  ② Số đo nằm trong RAM. Đặt `RULE_METRICS_FILE=<đường dẫn>` để lưu bền qua restart.
//     CỐ Ý không tự tạo file mặc định: `.gitignore` không thuộc quyền luồng này nên
//     một file dữ liệu mới ở gốc repo có nguy cơ bị commit nhầm.
//
// Nhận diện HỘI THOẠI mà không sửa `handler.js`: dùng chính `state.fastLanesUsed` —
// mỗi khách một Set, sống đúng bằng đời hội thoại. WeakMap khoá theo Set đó nên không
// giữ bộ nhớ khi hội thoại bị dọn.
// ─────────────────────────────────────────────────────────────────────────────

const SILENT_MS = Number(process.env.RULE_SILENT_MS || 30 * 60e3);
const FOLLOW_TURNS = 2; // "trong 2 lượt kế" — đúng chữ trong spec §3

const METRICS_FILE = process.env.RULE_METRICS_FILE || '';
const _metrics = new Map();   // ruleId -> {fired, askedAgain, closed, replied, lastAt}
const _conv = new WeakMap();  // usedLanes(Set) -> { pending: [{ruleId, t, turns}] }

const OPEN_CAP = 500; // trần bản ghi "đã bắn, khách chưa nói lại" giữ lại để đo "Im sau đó"

function bucket(id) {
  let b = _metrics.get(id);
  if (!b) b = { fired: 0, askedAgain: 0, closed: 0, replied: 0, lastAt: 0, open: [] };
  if (!Array.isArray(b.open)) b.open = []; // file số đo cũ (trước khi có cột này)
  _metrics.set(id, b);
  return b;
}
function convOf(usedLanes) {
  if (!(usedLanes instanceof Set)) return null;
  let c = _conv.get(usedLanes);
  if (!c) { c = { pending: [] }; _conv.set(usedLanes, c); }
  return c;
}

if (METRICS_FILE) {
  try { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8')))) _metrics.set(k, v); }
  catch { /* chưa có file — lần lưu đầu sẽ tạo */ }
}
function persist() {
  if (!METRICS_FILE) return;
  try { fs.writeFileSync(METRICS_FILE, JSON.stringify(Object.fromEntries(_metrics), null, 2)); }
  catch (e) { console.warn('[rules] lưu số đo lỗi:', e.message); }
}

/** Gọi mỗi khi một dòng BẮN câu mẫu. */
export function noteRuleFired(ruleId, usedLanes, now = Date.now()) {
  const b = bucket(ruleId);
  b.fired++; b.lastAt = now;
  b.open.push(now);
  if (b.open.length > OPEN_CAP) b.open.splice(0, b.open.length - OPEN_CAP);
  const c = convOf(usedLanes);
  if (c) c.pending.push({ ruleId, t: now, turns: 0 });
  persist();
}

/**
 * Gọi cho MỌI tin khách (kể cả tin không khớp dòng nào) để đo hai chỉ số phụ thuộc
 * chuỗi sau đó. `matchedRuleId` = dòng vừa khớp ở tin này (null nếu không khớp).
 */
export function noteCustomerTurn(usedLanes, matchedRuleId = null) {
  const c = convOf(usedLanes);
  if (!c || !c.pending.length) return;
  const keep = [];
  for (const p of c.pending) {
    p.turns++;
    const b = bucket(p.ruleId);
    if (p.turns === 1) {
      b.replied++;
      // Khách đã nói tiếp → lần bắn này không còn là "im sau đó". Bỏ mốc CŨ NHẤT còn
      // treo (xấp xỉ đúng lần bắn này; ghép chính xác từng lần không đáng độ phức tạp).
      if (b.open.length) b.open.shift();
    }
    if (matchedRuleId && matchedRuleId === p.ruleId) { b.askedAgain++; continue; }
    if (p.turns < FOLLOW_TURNS) keep.push(p);
  }
  c.pending = keep;
  persist();
}

/**
 * Khách CHỐT ĐƠN. Ghi cho mọi dòng đã bắn trong hội thoại này.
 * 🔌 CHƯA ĐƯỢC NỐI — `handler.js` thuộc luồng khác. Xem "Cách nối" trong báo cáo L8.
 */
export function noteRuleOrder(usedLanes) {
  if (!(usedLanes instanceof Set)) return;
  // `pending` chỉ giữ 2 lượt nên dòng bắn sớm hơn đã rời hàng. Đọc ngược từ chính
  // usedLanes: fast-lane ghi `rule:<id>` vào đó để chống lặp, nên nó là sổ đầy đủ.
  const ids = new Set((_conv.get(usedLanes)?.pending || []).map((p) => p.ruleId));
  for (const k of usedLanes) if (String(k).startsWith('rule:')) ids.add(String(k).slice(5));
  for (const id of ids) bucket(id).closed++;
  persist();
}

const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

/** Bảng 3 chỉ số + cờ "đề xuất hạ xuống Gợi ý cho AI" theo ngưỡng §3. */
export function ruleMetrics(now = Date.now()) {
  const rows = _rules.map((r) => {
    const b = _metrics.get(r.id) || { fired: 0, askedAgain: 0, closed: 0, replied: 0, lastAt: 0, open: [] };
    const open = Array.isArray(b.open) ? b.open : [];
    // "Im sau đó" chỉ tính những lần bắn đã QUÁ HẠN chờ. Lần bắn 5 phút trước mà khách
    // chưa nhắn lại là CHƯA BIẾT, không phải "im" — gộp vào sẽ luôn thổi phồng chỉ số.
    const silent = open.filter((t) => now - t > SILENT_MS).length;
    const waiting = open.length - silent;
    const settled = Math.max(0, b.fired - waiting); // mẫu đã kết luận được
    const m = {
      id: r.id, pageId: r.pageId, situation: r.situation, status: r.status, live: r.live,
      fired: b.fired,
      askedAgain: b.askedAgain, askedAgainPct: pct(b.askedAgain, b.fired),
      silent, silentPct: pct(silent, settled), waiting,
      closed: b.closed, closedPct: pct(b.closed, b.fired),
      lastAt: b.lastAt || null,
    };
    // Đề xuất chỉ có nghĩa khi đủ mẫu. Dưới 20 lượt thì tỉ lệ chỉ là nhiễu.
    const min = Number(process.env.RULE_MIN_SAMPLE || 20);
    const bad = [];
    if (b.fired >= min && m.askedAgainPct > 25) bad.push(`hỏi lại ngay ${m.askedAgainPct}% (>25%)`);
    if (settled >= min && m.silentPct > 60) bad.push(`im sau đó ${m.silentPct}% (>60%)`);
    m.demote = bad.length ? `Đề xuất chuyển "Câu trả lời tự động" → "Gợi ý cho AI": ${bad.join(' · ')}` : '';
    return m;
  });
  return {
    // "Chốt sau đó" mới chỉ có đường ống, chưa có tín hiệu đơn → nói thẳng thay vì để
    // người đọc tưởng mọi dòng đều chốt 0%.
    closedWired: false,
    silentAfterMs: SILENT_MS,
    persisted: !!METRICS_FILE,
    rows: rows.sort((a, b) => b.fired - a.fired),
  };
}

export function resetRuleMetrics() { _metrics.clear(); }
