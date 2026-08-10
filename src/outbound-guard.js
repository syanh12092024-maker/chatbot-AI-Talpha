// M09 · OUTBOUND GUARD — cửa duy nhất mọi tin phải qua trước khi tới khách.
// Spec: docs/v2/02-TANG-LUONG-CHAT.md § M09
//
// Vì sao cần: đo ngày 10/08/2026 trên 60 hội thoại thật (779 tin do page gửi)
//   · 13,7% tin page gửi KHÔNG có chữ nào (ảnh/sticker trơ hoặc "...")
//   · luồng RTO đang gửi tin DOẠ khách ("I'll be taking you to social media and
//     posting in group of Filipino in SAUDI") kèm ký tự Unicode vô hình để né bộ
//     lọc trùng lặp của Meta — một khách report là mất page + mất traffic ads
//   · AI vẫn dán checklist ✔ và hỏi "could you rephrase po?" (vi phạm nguyên tắc 4)
//   · 6,3% tin dài >300 token trong khi quy tắc là 1–3 câu
//
// THUẦN LUẬT, không gọi LLM, chạy dưới 1ms. Trả verdict, KHÔNG tự sửa tin —
// người gọi quyết định: xin model viết lại (action='rewrite') hay im (action='block').

import { productTiers } from './kb.js';

// ─────────────────────────────────────────────────────────────────────────────
// Tiện ích
// ─────────────────────────────────────────────────────────────────────────────

const approxTokens = (s) => Math.ceil(String(s || '').length / 3.2);

function normalize(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim();
}

// Jaccard trên 3-gram ký tự — đủ rẻ cho tin vài trăm ký tự, bắt được cả tin sửa nhẹ.
function similarity(a, b) {
  const A = normalize(a); const B = normalize(b);
  if (!A || !B) return 0;
  if (A === B) return 1;
  const grams = (s) => { const g = new Set(); for (let i = 0; i + 3 <= s.length; i++) g.add(s.slice(i, i + 3)); return g; };
  const ga = grams(A); const gb = grams(B);
  if (!ga.size || !gb.size) return 0;
  let inter = 0; for (const g of ga) if (gb.has(g)) inter++;
  return inter / (ga.size + gb.size - inter);
}

// ─────────────────────────────────────────────────────────────────────────────
// Luật 2 — lọt tiếng Việt
// Khách là người Philippines / Ả Rập ở Trung Đông. Tiếng Việt trong prompt chỉ là
// hướng dẫn nội bộ; lọt ra ngoài là lỗi nặng. Dùng CHẤM ĐIỂM (từ chức năng + dấu
// riêng của tiếng Việt) thay vì bắt 1 ký tự, để không nhầm với tên sản phẩm.
// ─────────────────────────────────────────────────────────────────────────────
const VN_CHARS = /[ăâđêôơưĂÂĐÊÔƠƯ]|[ạảãáàẠẢÃÁÀẹẻẽéèẸẺẼÉÈịỉĩíìỊỈĨÍÌọỏõóòỌỎÕÓÒụủũúùỤỦŨÚÙỵỷỹýỳỴỶỸÝỲ]/gu;
const VN_WORDS = /\b(là|của|và|cho|với|được|nhé|nhân viên|khách hàng|đơn hàng|giao hàng|cảm ơn|vui lòng|chúng tôi|chúng em|anh chị|sẽ|đã|không|xin lỗi|hàng|tiền|địa chỉ|số điện thoại)\b/giu;

export function looksVietnamese(text) {
  const s = String(text || '');
  const words = (s.match(VN_WORDS) || []).length;
  const chars = (s.match(VN_CHARS) || []).length;
  return words >= 2 || (words >= 1 && chars >= 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// Luật 4 — tổng tiền phải khớp ĐÚNG một gói trong bảng giá
// Xuất xứ: vụ khách Priscela Amon bị báo gấp đôi giá → huỷ đơn + block page.
// CHỈ soi con số DÍNH đơn vị tiền tệ (trước hoặc sau) — để "2-5 days", "18K",
// "30 tablets" không bị bắt nhầm.
// ─────────────────────────────────────────────────────────────────────────────
const CURRENCIES = ['aed', 'sar', 'kwd', 'qar', 'omr', 'bhd', 'php', 'usd', 'dhs', 'ريال', 'درهم', 'دينار', '﷼'];
const CUR_ALT = CURRENCIES.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
// "109 SAR" · "SAR 109" · "109SAR" · "AED 99.5"
const MONEY_RE = new RegExp(`(?:(\\d[\\d.,]*)\\s*(?:${CUR_ALT})\\b)|(?:\\b(?:${CUR_ALT})\\s*(\\d[\\d.,]*))`, 'giu');

export function extractMoney(text) {
  const out = [];
  for (const m of String(text || '').matchAll(MONEY_RE)) {
    const raw = m[1] || m[2] || '';
    const n = Number(String(raw).replace(/,/g, ''));
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

// Tập giá HỢP LỆ của page = mọi mức giá gói trong KB. Không có gói nào → không kiểm được.
export function allowedPrices(kb) {
  const set = new Set();
  for (const p of (kb?.products || [])) {
    for (const t of productTiers(p)) if (t.price > 0) set.add(Number(t.price));
  }
  return set;
}

// ─────────────────────────────────────────────────────────────────────────────
// Các mẫu nhận dạng khác
// ─────────────────────────────────────────────────────────────────────────────

// Ký tự tag vô hình U+E0000–U+E007F — dùng để né bộ lọc trùng lặp của Meta.
const INVISIBLE_TAG = /[\u{E0000}-\u{E01EF}]/u;

// Lời doạ khách. Đang tồn tại thật ở luồng RTO trên page Kreain Nature PH - Ksa.
const THREAT = /(taking you to social media|post(?:ing)?\s+(?:you\s+)?in\s+(?:the\s+)?group|report you to|expose you|bóc phốt|bốc phốt|kiện bạn|sue you|blacklist you|đăng lên nhóm)/i;

// Mã đơn bịa — chỉ được nói SAU KHI create_draft_order chạy OK.
//   `no\b` chứ KHÔNG phải `no` trơn: chạy lại trên 3.000 tin thật bắt nhầm
//   "No need to order now" ("order" + "no"w) → phải có ranh giới từ.
const ORDER_ID = /(order\s*(?:id\b|no\b\.?|number\b|code\b)|mã\s*đơn|order\s*#|tracking\s*(?:number\b|no\b))/i;

// Hứa ngày/giờ giao cụ thể (nguyên tắc 11).
//   Phải bắt CẶP "động từ giao hàng + mốc thời gian" ĐỨNG GẦN NHAU. Bản đầu chỉ cần
//   hai từ cùng có mặt trong tin nên bắt nhầm "FREE SHIPPING — TODAY ONLY" (đó là
//   khuyến mãi bịa, đã có luật FAKE_SCARCITY lo, không phải hứa ngày giao).
const DAY = 'bukas|tomorrow|ngayong araw|today|mamaya|tonight|this (?:evening|afternoon|morning)|sa lunes|on monday|غدا|اليوم';
const DELIV = 'deliver\\w*|dating|dumating|darating|arrive\\w*|arriving|makukuha|receive\\w*|padala|توصيل|يصل';
const DELIVERY_PROMISE_RE = new RegExp(
  `(?:(?:${DELIV})[^.!?\\n]{0,30}(?:${DAY}))|(?:(?:${DAY})[^.!?\\n]{0,30}(?:${DELIV}))`, 'i');

// Khan hiếm / khuyến mãi bịa (nguyên tắc 2 & 14) — chỉ chặn khi KB KHÔNG hề nhắc tới.
const SCARCITY = /(today only|last day|huling araw|paubos na|limited (?:promo|stock|slots?)|only \d+ (?:left|slots?|pcs? left)|natitira na lang|hurry|ngayon lang|آخر يوم|عرض محدود)/i;

// Checklist XIN thông tin (nguyên tắc 4) — dán lại nhiều dòng ✔ làm khách bỏ đơn.
//   ⚠️ Phải phân biệt với TÓM TẮT ĐƠN (hợp lệ): "- **Name:** Grace Pranom".
//   Khác nhau ở chỗ ô có GIÁ TRỊ hay không:
//        "✔️Contact number:"        → ô TRỐNG = đang xin  → chặn
//        "✔️Your full name"          → nhãn trơ = đang xin  → chặn
//        "- **Name:** Grace Pranom"  → có giá trị = tóm tắt → cho qua
//   `✔️` là ✔ + biến thể U+FE0F nên phải cho phép ký tự đó, và khoảng trắng sau
//   dấu đầu dòng là TÙY CHỌN (template thật viết dính liền: "✔️Your full name").
const BULLET_LINE = /^\s*(?:[✔✓✅•·\-*–—]️?|\d+[.)])\s*\S/u;
const BULLET_MARK = /^\s*(?:[✔✓✅•·\-*–—]️?|\d+[.)])\s*/u;
const INFO_WORD = /(name|pangalan|contact|number|address|adres|tirahan|emirate|city|barangay|الاسم|العنوان|رقم)/i;

// Dòng này là Ô TRỐNG đang xin thông tin (chứ không phải dòng tóm tắt có giá trị)?
function isEmptyField(line) {
  const body = String(line).replace(BULLET_MARK, '').trim();
  const i = body.lastIndexOf(':');
  if (i === -1) return true;                                    // nhãn trơ, không có giá trị
  return !body.slice(i + 1).replace(/[*_`\s]/g, '');            // sau dấu ':' không còn gì
}

// Số điện thoại khách (nguyên tắc 12) — 7–15 chữ số liền hoặc có dấu phân cách.
const PHONE_RE = /(?:\+?\d[\d\s().-]{6,16}\d)/g;
function phoneLike(text) {
  return (String(text || '').match(PHONE_RE) || [])
    .map((s) => s.replace(/\D/g, ''))
    .filter((d) => d.length >= 7 && d.length <= 15);
}

// ─────────────────────────────────────────────────────────────────────────────
// API chính
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soi 1 tin sắp gửi cho khách.
 *
 * @param {string} text  Nội dung sắp gửi
 * @param {object} ctx
 *   @param {object}  ctx.kb                KB của page (để lấy bảng giá + đối chiếu KB text)
 *   @param {string}  ctx.lastAiText        Tin AI vừa gửi cho khách này (chống lặp)
 *   @param {boolean} ctx.orderCreated      Lượt này đã gọi create_draft_order THÀNH CÔNG chưa
 *   @param {boolean} ctx.isOrderSummary    Có phải lượt tóm tắt xác nhận đơn không (được đọc lại PII 1 lần)
 *   @param {string}  ctx.pageId            Để ghi log
 *   @param {string}  ctx.custName          Để ghi log
 * @returns {{ok:boolean, action:'pass'|'rewrite'|'block', rule:string, reason:string, alert:boolean}}
 */
export function guardOutbound(text, ctx = {}) {
  const t = String(text == null ? '' : text);
  const kb = ctx.kb || {};
  const kbText = String(kb.text || '');

  const pass = { ok: true, action: 'pass', rule: '', reason: '', alert: false };
  const block = (rule, reason, alert = false) => ({ ok: false, action: 'block', rule, reason, alert });
  const rewrite = (rule, reason, alert = false) => ({ ok: false, action: 'rewrite', rule, reason, alert });

  // ── Luật 1 · tin rỗng ─────────────────────────────────────────────────────
  const stripped = t.replace(/<\/?[a-z][^>]*>/gi, '').replace(/[.\s·…]/g, '');
  if (!stripped) {
    return block('EMPTY', 'Tin không có nội dung (rỗng, chỉ "..." hoặc chỉ thẻ HTML)');
  }

  // ── Luật 8 · ký tự vô hình né trùng lặp (rủi ro ban Meta) ─────────────────
  if (INVISIBLE_TAG.test(t)) {
    return block('INVISIBLE_CHARS', 'Tin chứa ký tự Unicode vô hình (U+E00xx) — kỹ thuật né bộ lọc trùng lặp của Meta, rủi ro mất page', true);
  }

  // ── Luật 9 · doạ khách ────────────────────────────────────────────────────
  if (THREAT.test(t)) {
    return block('THREAT', 'Tin có nội dung ĐE DOẠ khách (bóc phốt / đăng lên nhóm / report) — cấm tuyệt đối', true);
  }

  // ── Luật 2 · lọt tiếng Việt ───────────────────────────────────────────────
  if (looksVietnamese(t)) {
    return block('VIETNAMESE', 'Tin lọt TIẾNG VIỆT — khách là người Philippines/Ả Rập, tuyệt đối không dùng tiếng Việt', true);
  }

  // ── Luật 3 · bịa mã đơn ───────────────────────────────────────────────────
  if (ORDER_ID.test(t) && !ctx.orderCreated) {
    return rewrite('FAKE_ORDER_ID', 'Nhắc "Order ID / Mã đơn" nhưng lượt này chưa gọi create_draft_order thành công');
  }

  // ── Luật 4 · tổng tiền phải khớp đúng MỘT gói ─────────────────────────────
  //   Ngoại lệ CÓ CHỦ Ý: "bẻ nhỏ giá trị" (~32 SAR each) là kỹ thuật gỡ phản đối giá
  //   mà HARD_RULES bước 1 của ladder KHUYẾN KHÍCH. Đơn giá suy ra từ gói KHÔNG phải
  //   bịa tổng. Chỉ chặn khi con số được nêu như một TỔNG TIỀN.
  const allowed = allowedPrices(kb);
  if (allowed.size) {
    const maxTier = Math.max(...allowed);
    const perUnit = /(each|per\s*(?:pc|piece|bottle|box|set|tube)|\/\s*(?:pc|piece)|kada|bawat|isa|للحبة|للقطعة)/i.test(t);
    const bad = extractMoney(t).filter((n) => {
      if (allowed.has(n)) return false;
      if (perUnit && n < maxTier) return false; // đơn giá bẻ nhỏ — hợp lệ
      return true;
    });
    if (bad.length) {
      return rewrite('PRICE_MISMATCH',
        `Nêu số tiền ${bad.join(', ')} không khớp gói nào trong bảng giá (hợp lệ: ${[...allowed].sort((a, b) => a - b).join(', ')}). Gọi get_price và chỉ dùng ĐÚNG giá một gói, không tự nhân/cộng.`);
    }
  }

  // ── Luật 10 · hứa ngày/giờ giao cụ thể ────────────────────────────────────
  //   "FREE DELIVERY TODAY" là KHUYẾN MÃI (luật 12 lo), không phải hứa ngày giao —
  //   chạy lại 4.000 tin thật mới lộ ra chỗ bắt nhầm này.
  if (DELIVERY_PROMISE_RE.test(t) && !/free\s+(?:delivery|shipping)/i.test(t)) {
    return rewrite('DELIVERY_PROMISE', 'Hứa ngày/giờ giao cụ thể — chỉ được nói khung chung "2-5 days"');
  }

  // ── Luật 12 · bịa khan hiếm/khuyến mãi không có trong KB ──────────────────
  const scarcity = t.match(SCARCITY);
  if (scarcity && !SCARCITY.test(kbText)) {
    return rewrite('FAKE_SCARCITY', `Bịa khan hiếm/khuyến mãi ("${scarcity[0]}") mà KB không hề có — cấm theo nguyên tắc trung thực giá`);
  }

  // ── Luật 6 · dán checklist xin thông tin ──────────────────────────────────
  const lines = t.split('\n');
  const bullets = lines.filter((l) => BULLET_LINE.test(l));
  const askFields = bullets.filter((l) => INFO_WORD.test(l) && isEmptyField(l));
  if (askFields.length >= 3) {
    return rewrite('CHECKLIST', 'Dán checklist xin thông tin nhiều dòng — chỉ hỏi NGẮN phần còn thiếu, 1-2 dòng');
  }

  // ── Luật 11 · đọc lại PII ngoài lượt tóm tắt đơn ──────────────────────────
  if (!ctx.isOrderSummary) {
    const phones = phoneLike(t).filter((d) => !kbText.replace(/\D/g, '').includes(d)); // số hỗ trợ trong KB thì được
    if (phones.length) {
      return rewrite('PII_ECHO', 'Đọc lại số điện thoại của khách ngoài lượt tóm tắt xác nhận đơn — vi phạm bảo vệ PII');
    }
  }

  // ── Luật 7 · lặp lại tin vừa gửi ──────────────────────────────────────────
  if (ctx.lastAiText && similarity(t, ctx.lastAiText) >= 0.9) {
    return block('DUPLICATE', 'Trùng ≥90% với tin AI vừa gửi cho khách này');
  }

  // ── Luật 5 · quá dài ──────────────────────────────────────────────────────
  const nTok = approxTokens(t);
  const nLines = lines.filter((l) => l.trim()).length;
  if (nTok > 400 || nLines > 6) {
    return rewrite('TOO_LONG', `Tin quá dài (~${nTok} token, ${nLines} dòng) — quy tắc là 1-3 câu, Messenger mobile phải cuộn là mất khách`);
  }

  return pass;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sổ tin bị chặn — nguồn cho màn hình "Tin bị chặn" trên dashboard (M18)
// Giữ trong RAM, trần 500 bản ghi. Cảnh báo đỏ thì log riêng để không trôi.
// ─────────────────────────────────────────────────────────────────────────────
const blocked = [];
const BLOCKED_MAX = 500;

export function recordBlocked(verdict, ctx = {}, text = '') {
  blocked.push({
    t: Date.now(),
    page: ctx.pageId || '',
    cust: ctx.custName || '',
    rule: verdict.rule,
    action: verdict.action,
    reason: verdict.reason,
    text: String(text).slice(0, 200),
  });
  if (blocked.length > BLOCKED_MAX) blocked.splice(0, blocked.length - BLOCKED_MAX);

  const who = `page ${ctx.pageId || '?'}${ctx.custName ? ` · ${ctx.custName}` : ''}`;
  if (verdict.alert) console.error(`[guard] 🔴 ${verdict.rule} (${who}): ${verdict.reason}`);
  else console.warn(`[guard] ${verdict.action === 'block' ? '⛔' : '✎'} ${verdict.rule} (${who}): ${verdict.reason}`);
}

export function blockedLog(limit = 100) {
  return blocked.slice(-limit).reverse();
}

export function blockedStats() {
  const byRule = {};
  for (const b of blocked) byRule[b.rule] = (byRule[b.rule] || 0) + 1;
  return { total: blocked.length, byRule };
}
