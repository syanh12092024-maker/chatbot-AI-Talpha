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

// BH1: tập giá nay dựng ở lõi chung (`src/core/gia.js`) — file này không còn tự đọc
// `productTiers` nữa, xem ghi chú tại `allowedPrices`.
import { giaHopLe, giaDuocNhac } from './core/gia.js';

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

// Danh từ hàng hoá — chỗ tiếng Việt lọt ra NHIỀU NHẤT mà hai bộ đếm trên mù tịt.
// Xuất xứ 11/08/2026: nhãn gói giá "Mua 1 cái" / "Combo 2 cái" do bộ nhập sinh ra
// bị Fast Lane in thẳng cho khách; chấm điểm cũ cho 0 từ chức năng + 2 dấu → lọt.
// MỌI từ ở đây đều mang dấu tiếng Việt, nên không đụng tiếng Anh/Tagalog/Ả Rập.
// KHÔNG dùng cờ /g: .test() với /g nhớ lastIndex giữa các lần gọi nên sẽ bắt
// lúc được lúc không — đúng loại lỗi im lặng khó truy nhất.
const VN_NOUNS = /\b(cái|chiếc|tặng|hộp|tuýp|lọ|chai|gói|miếng|đôi|thùng|bộ|sản phẩm|khuyến mãi|miễn phí|số lượng|màu sắc|kích cỡ|đặt hàng|thanh toán|giảm giá)\b/iu;

export function looksVietnamese(text) {
  const s = String(text || '');
  const words = (s.match(VN_WORDS) || []).length;
  const chars = (s.match(VN_CHARS) || []).length;
  return words >= 2 || (words >= 1 && chars >= 3);
}

// Tách riêng khỏi looksVietnamese vì mức xử lý KHÁC: bắt được ở đây thì xin model
// viết lại (còn cứu được lượt), chứ không chặn thẳng như tiếng Việt nguyên câu.
export function hasVietnameseNoun(text) {
  return VN_NOUNS.test(String(text || ''));
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
//
// BH1 (16/09): thân hàm chuyển xuống `src/core/gia.js#giaHopLe` — cùng một tập giá nay
// phục vụ CẢ HAI chiều: chiều RA (luật 4 dưới đây, chặn tin nói sai giá) và chiều TẠO ĐƠN
// (`tools.js` → `tinhTong`). Giữ hai bản dựng tập giá là giữ hai sự thật, và bản thứ hai
// bao giờ cũng là bản trôi. Chữ ký + kiểu trả về KHÔNG đổi (`Set<number>`) nên mọi nơi
// gọi (`order-bridge.js:116`, `l8-botcake-rules`, `l7-miner-order`) chạy y như cũ.
export function allowedPrices(kb) {
  return giaHopLe(kb);
}

// Giá được NHẮC (giá bán + giá gốc khai trong KB) — RỘNG hơn `allowedPrices` một cách có
// chủ ý. Chỉ dùng cho các cửa xét VĂN BẢN. Cửa TIỀN (`order-bridge#checkTotal`) phải tiếp
// tục gọi `allowedPrices`; xem ghi chú dài tại `core/gia.js#giaDuocNhac`.
export { giaDuocNhac };

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
  // Chỉ vài chữ hàng hoá lọt ra (điển hình: nhãn gói giá "Mua 1 cái"). REWRITE
  // chứ không BLOCK: câu còn lại phần lớn là tiếng Anh dùng được, xin model dịch
  // nốt thì cứu được lượt — chặn thẳng là khách không nhận được gì.
  if (hasVietnameseNoun(t)) {
    return rewrite('VIETNAMESE_WORD', 'Lọt chữ tiếng Việt (thường là nhãn gói giá) — viết lại toàn bộ bằng ngôn ngữ của khách', true);
  }

  // ── Luật 3 · bịa mã đơn ───────────────────────────────────────────────────
  if (ORDER_ID.test(t) && !ctx.orderCreated) {
    return rewrite('FAKE_ORDER_ID', 'Nhắc "Order ID / Mã đơn" nhưng lượt này chưa gọi create_draft_order thành công');
  }

  // ── Luật 4 · tổng tiền phải khớp đúng MỘT gói ─────────────────────────────
  //   Ngoại lệ CÓ CHỦ Ý: "bẻ nhỏ giá trị" (~32 SAR each) là kỹ thuật gỡ phản đối giá
  //   mà HARD_RULES bước 1 của ladder KHUYẾN KHÍCH. Đơn giá suy ra từ gói KHÔNG phải
  //   bịa tổng. Chỉ chặn khi con số được nêu như một TỔNG TIỀN.
//   Ngoại lệ thứ hai: GIÁ GỐC đã khai trong KB ("109 SAR, original 199"). Khối KB nói
//   thẳng «giá gốc 199» cho model đọc, nên chặn nó là hệ tự phạt model vì đã đọc đúng —
//   19% lượt gọi model mất trắng khi đo 28/09. Nới bằng `giaDuocNhac`, KHÔNG nới `allowedPrices`,
//   để cửa TIỀN (`checkTotal`) vẫn không cho 199 thành số người giao hàng thu của khách.
  const banDuoc = allowedPrices(kb);
  if (banDuoc.size) {
    const nhacDuoc = giaDuocNhac(kb);
    const maxTier = Math.max(...banDuoc);
    const perUnit = /(each|per\s*(?:pc|piece|bottle|box|set|tube)|\/\s*(?:pc|piece)|kada|bawat|isa|للحبة|للقطعة)/i.test(t);
    const bad = extractMoney(t).filter((n) => {
      if (nhacDuoc.has(n)) return false;
      if (perUnit && n < maxTier) return false; // đơn giá bẻ nhỏ — hợp lệ
      return true;
    });
    if (bad.length) {
      return rewrite('PRICE_MISMATCH',
        `Nêu số tiền ${bad.join(', ')} không khớp gói nào trong bảng giá (giá bán hợp lệ: ${[...banDuoc].sort((a, b) => a - b).join(', ')}). Gọi get_price và chỉ dùng ĐÚNG giá một gói, không tự nhân/cộng.`);
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

  // ── BH9 · bốn luật cửa ra mới — SAU mọi luật cũ (luật cũ chặn ⇒ phán quyết y nguyên base) ────────────
  //   [S7] CHỈ khi `ctx.luatBH9 === true`: handler đặt cờ ở cửa ra chữ MODEL (+ caption) của lượt đã gọi model. Lớp từ khoá ·
  //   Fast Lane · v1 không đặt ⇒ phán quyết y hệt base (chữ của chúng là văn kịch bản marketer viết, không phải model bịa).
  //   Chặn ⇒ handler gửi CÂU CỐ ĐỊNH + bàn giao (`our-messages.js`), không phải im.
  if (ctx.luatBH9 === true) {
    const v = luatBH9(t, ctx, kbText);
    if (v) return rewrite(v.rule, v.reason);
  }

  return pass;
}

// ─────────────────────────────────────────────────────────────────────────────
// BH9 — BỐN LUẬT «BOT KHÔNG ĐƯỢC NÓI THAY BỘ PHẬN GIAO HÀNG» (đo giả lập pilot 09/10: 14/14 câu thật QUA cửa ra cũ)
//   Y_TE              khách báo dấu hiệu y tế mà câu không khuyên đi khám / vẫn chào giá / hứa chữa
//   BIA_TRANG_THAI_DON bot khẳng định có/không có đơn, đã giao/đang giao/đã huỷ/đã xác nhận — bot KHÔNG tra được đơn
//   TU_HUA            hứa thứ/giờ giao · hứa «tôi sẽ báo courier» · «team đã có WhatsApp của bạn / họ sẽ nhắn bạn»
//   BAN_LAI_SAU_BAN   khách đang có đơn mà câu vẫn chào giá/gói hoặc xin lại tên/SĐT/địa chỉ/COD
// `action:'rewrite'` để ghi sổ đúng loại, nhưng KHÔNG vào `FIXABLE` (không sửa máy móc được) ⇒ `quaCuaRa` trả chữ rỗng.
// ─────────────────────────────────────────────────────────────────────────────
export const LUAT_BH9 = new Set(['Y_TE', 'BIA_TRANG_THAI_DON', 'TU_HUA', 'BAN_LAI_SAU_BAN']);

// Ả Rập: + tiền tố dính liền «ال · بال · وال · لل · و · ب» («للطبيب» — /code-review BH9 #12).
const KHUYEN_KHAM = /\b(?:doctor|clinic|hospital|consult\w*|magpatingin|doktor|stop\s+using|itigil)\b|(?<!\p{L})(?:ال|بال|وال|لل|و|ب)?(?:طبيب|مستشفى|توقف|توقفي)(?!\p{L})/iu;
const HUA_CHUA = /\bstops?\s+(?:the\s+)?bleeding\b|\bheal(?:s|ing)?\b|\bcures?\b/i;
const NEU_GOI = /\b(?:which|what|anong)\s+(?:set|package|bundle|promo|offer)\b/i;
// + tương lai/quy trình/mời chốt (/code-review BH9 #5): «Your order WILL be on its way…» · «usually» · «Just SEND your details and your
// order is confirmed!» — không phải khẳng định một đơn đang có.
const DIEU_KIEN_SAU = /\b(?:once|after|when|if|as\s+soon\s+as|will|would|usually|normally|typically|can|could|should|send|provide)\b/i;
// Vế ĐỨNG SAU cụm khớp mô tả quy trình («Your order is shipped within 24 hours after confirmation»).
const QUY_TRINH_SAU = /\b(?:within|after\s+(?:confirmation|you|ordering)|once|in\s+\d+\s*(?:-\s*\d+\s*)?(?:working\s+)?(?:hours?|days?))\b/i;
const DAU_VE = ['.', '!', '?', '\n', ',', ';', '—', '–'];
function quyTrinhSau(t, het) {
  let cuoi = t.length;
  for (const k of DAU_VE) { const i = t.indexOf(k, het); if (i >= 0 && i < cuoi) cuoi = i; }
  return QUY_TRINH_SAU.test(t.slice(het, cuoi));
}
// Câu chung/chính sách («we deliver on Friday TOO», «every day») — không phải hứa với khách này (/code-review BH9 #10).
const CAU_CHUNG = /\b(?:too|also|as\s+well|every|everyday|daily|all\s+days)\b|\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)s\b/i;
const dauCau = (t, idx) => ['.', '!', '?', '\n'].reduce((d, k) => Math.max(d, t.lastIndexOf(k, idx - 1) + 1), 0);
const cauChua = (t, idx) => {
  let cuoi = t.length;
  for (const k of ['.', '!', '?', '\n']) { const i = t.indexOf(k, idx); if (i >= 0 && i < cuoi) cuoi = i; }
  return t.slice(dauCau(t, idx), cuoi);
};
/**
 * Cụm ở `idx` có từ điều kiện ĐỨNG TRƯỚC trong cùng VẾ CÂU không («Once your order is confirmed, …» không phải khẳng định).
 * Vế = từ dấu `.!?\n,;—–` gần nhất: «If no order was completed, that delivery notice was likely sent by mistake» — vế sau dấu phẩy
 * vẫn là KHẲNG ĐỊNH (giả lập UAE #83), chỉ vế «If no order was completed» là điều kiện. (Phía page `context.js` đo theo CÂU — bên
 * đó bắt nhầm là khoá bán vĩnh viễn nên lệch về phía «không tính».)
 */
function sauDieuKien(t, idx) {
  let dau = 0;
  for (const k of DAU_VE) dau = Math.max(dau, t.lastIndexOf(k, idx - 1) + 1);
  return DIEU_KIEN_SAU.test(t.slice(dau, idx));
}
// BH9 vòng 2 (đối kháng F4 · nghiệp vụ N2): v3 KHÔNG có trạng thái đơn đã xác minh (không tool tra đơn) ⇒ mọi câu khẳng định trạng thái
// đều là bịa. Vòng 1 chỉ biết chủ ngữ «order» + năm động từ ⇒ câu Kimi THẬT giả lập Saudi #141 «your order is already with the courier
// po» · «Your parcel is out for delivery» · «Na-ship na po» · «تم توصيل طلبك» QUA cửa. Nay: chủ ngữ order|parcel|package|item|shipment +
// «with the/our courier/rider» · «being shipped/delivered» · «ready for dispatch» · «in transit» · «rescheduled» · «scheduled for
// delivery» · «returned»; bản Taglish (na-ship/na-deliver/naipadala na · papunta na ang rider · nasa rider na · wala pang order) và Ả Rập
// (تم توصيل/شحن/إرسال · مع المندوب · لا يوجد طلب).
const KHANG_DINH_DON = [
  /\bno\s+(?:active\s+|existing\s+|current\s+)?orders?\b(?!\s+(?:minimum|min|fee|limit|needed|required))/i,
  /\b(?:notice|message|notification)\b[^.!?\n]{0,40}\bsent\s+by\s+mistake\b/i,
  /\b(?:your\s+)?(?:order|parcel|package|item|shipment)\s+(?:is|has\s+been|was)\s+(?:already\s+|now\s+)?(?:on\s+(?:its|the)\s+way|out\s+for\s+delivery|shipped|dispatched|delivered|cancel(?:l)?ed|returned|rescheduled|in\s+transit|scheduled\s+for\s+delivery|being\s+(?:shipped|delivered)|ready\s+for\s+(?:dispatch|delivery|shipping|pickup)|with\s+(?:the|our)\s+(?:courier|rider|driver|delivery))\b/i,
  /\b(?:already|now)\s+with\s+(?:the|our)\s+(?:courier|rider|driver)\b/i,
  /\bon\s+(?:its|the)\s+way\b/i,
  /\b(?:cancel(?:l)?ed|nakansela|na-cancel)\s+na\b/i,
  /\b(?:na-?ship|nai-?ship|naipadala|na-?deliver|nai-?deliver|na-?dispatch)\s+na\b|\bpapunta\s+na\s+(?:po\s+)?(?:ang|yung|si)\s+(?:rider|courier|driver)\b|\bnasa\s+(?:rider|courier)\s+na\b|\bwala\s+(?:pa\s+)?(?:pong|pang|po\s+ng|ng)\s+order\b/i,
  // «مع المندوب» TRƠN là câu COD trước bán («الدفع نقداً مع المندوب» — trả tiền mặt cho người giao) ⇒ chỉ «طلبك مع المندوب».
  /تم\s+(?:إلغاء|الغاء)|في\s+الطريق|تم\s+شحن|تم\s+توصيل\s+(?:ال)?طلب|طلبك\s+(?:الآن\s+|الان\s+)?(?:مع|عند)\s+(?:ال)?مندوب|لا\s+(?:يوجد|توجد)\s+(?:أي\s+|اي\s+)?(?:طلب|طلبات)/u,
];
// [S8] «confirmed / placed / received» được nói ở lượt TÓM TẮT đơn (lượt vừa `create_draft_order`). (+ vòng 2: «being processed» ·
// «confirmed na po ang order» · «تم تأكيد/إرسال الطلب» · «there's (already) an order in the system» (câu bot thật Saudi #46, so_ai 62) —
// cùng nghĩa «đã có/đã nhận đơn»: đúng ở lượt tóm tắt (đơn nháp vừa vào hàng chờ — /code-review vòng 2), bịa ở lượt khác.)
const XAC_NHAN_DON = /\b(?:your\s+)?order\s+(?:is|has\s+been|was)\s+(?:already\s+)?(?:confirmed|placed|received|being\s+processed)\b|\bconfirmed\s+na\s+(?:po\s+)?(?:ang|yung)\s+order\b|\b(?:there['’]s|there\s+is|you\s+(?:already\s+)?have)\s+(?:already\s+)?(?:an?\s+)?(?:existing\s+|active\s+)?order\s+(?:(?:now\s+)?in\s+(?:the|our)\s+system|under\s+your\s+name)\b|تم\s+(?:تأكيد|تاكيد|إرسال|ارسال)\s+(?:ال)?طلب/iu;
// Thứ (EN · Tagalog · Ả Rập — chữ Ả Rập rào `(?<!\p{L})…(?!\p{L})`, `\b` không biết chữ Ả Rập) hoặc giờ «10 AM», trong 30 ký tự quanh
// động từ/người giao. Regex `DELIVERY_PROMISE_RE` cũ (cặp «giao + bukas/tomorrow/today») KHÔNG sửa — luật này bắt phần nó bỏ sót.
// «linggo» BỎ: tiếng Tagalog vừa là Chủ nhật vừa là TUẦN («within 1-2 linggo» = khung được phép nói — /code-review BH9 #10).
// «noted» chỉ tính khi mốc giờ/thứ trong 15 ký tự («Noted po ma'am, 10 AM tomorrow»), không 30 («Noted po, our office is open until 10 PM»).
const MOC = '\\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|miyerkules|huwebes|biyernes|sabado)\\b'
  + '|(?<!\\p{L})(?:الاثنين|الثلاثاء|الأربعاء|الخميس|الجمعة|السبت|الأحد)(?!\\p{L})|\\b\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)\\b';
const MOC_GIAO = 'deliver\\w*|courier|rider|arriv\\w*|darating';
const HUA_MOC = new RegExp(`(?:${MOC})[^.!?\\n]{0,30}(?:${MOC_GIAO})|(?:${MOC_GIAO})[^.!?\\n]{0,30}(?:${MOC})`
  + `|(?:${MOC})[^.!?\\n]{0,15}\\bnoted\\b|\\bnoted\\b[^.!?\\n]{0,15}(?:${MOC})`, 'giu');
const HUA_BAO_COURIER = /\b(?:i['’]ll|i\s+will|let\s+me|we['’]ll|we\s+will)\s+(?:inform|request|ask|tell|notify|coordinate|contact)\s+(?:the\s+)?(?:courier|rider|driver|shipping|delivery|logistics)\b/gi;
// Hai khuôn dưới ĐÚNG ở lượt đã bàn giao (sale sẽ nhắn thật) và lượt tóm tắt đơn (CORE §5 bắt nói «our staff will contact you»).
// Không tính câu HỎI xin thông tin («Can we have your address po?» — /code-review BH9 #3).
const HUA_TEAM_CO = /(?<!\b(?:can|could|may|would|shall|do|did)\s+)\b(?:team|staff|we)(?:['’]ve|\s+have|\s+has)?(?:\s+already)?(?:\s+(?:has|have|got))?\s+your\s+(?:whatsapp|number|location|address)\b(?![^.!\n]*\?)/gi;
const HUA_TEAM_SE = /\b(?:our\s+)?(?:team|staff|agent|they)(?:\s+will|['’]ll)\s+(?:message|contact|call|text)\s+you\b/gi;
// XIN thông tin = có ĐỘNG TỪ xin («send · give · may I have · what's …») trước tên trường, hoặc nhãn ô của mẫu chốt («full name ·
// complete address · contact number»), hoặc hỏi COD. «Please keep your phone available» KHÔNG phải xin (đo giả lập Saudi #139).
const XIN_THONG_TIN = /\b(?:send|give|provide|share|type|need|may\s+i\s+(?:have|get|know)|can\s+i\s+(?:have|get|know)|could\s+you\s+(?:send|give|share|provide)|what(?:['’]s|\s+is))\b[^.!?\n]{0,30}\b(?:name|contact|number|phone|address|location|pangalan|tirahan)\b|\bcomplete\s+address\b|\bfull\s+name\b|\bcontact\s+number\b|\b(?:pangalan|tirahan)\b|(?:\bcod\b|cash\s+on\s+delivery)[^.!?\n]{0,40}\?|العنوان|الاسم|رقم\s+الجوال|رقم\s+الهاتف/iu;
const GOI_GIA = /\bbuy\s*\d+\s*(?:get|take)\s*\d+|\bb\d+g\d+\b|\bpackages?\b|\bbundles?\b/i;

/**
 * Khớp ĐẦU TIÊN không bị miễn của `re` (cờ g — xét MỌI lần khớp, không chỉ lần đầu): miễn khi cụm khớp có NGUYÊN VĂN trong kb.text
 * (cùng tinh thần `SCARCITY`); `dieuKien` ⇒ miễn cả khi trong CÂU có từ điều kiện đứng trước («After you order, our staff will call
 * you…» — /code-review BH9 #10); `chung` ⇒ miễn câu chính sách chung («we deliver on Friday too»).
 */
function khopKhongMien(re, t, kbText, { dieuKien = false, chung = false } = {}) {
  const kb = kbText.toLowerCase();
  for (const m of t.matchAll(re)) {
    if (kb.includes(m[0].toLowerCase())) continue;
    if (dieuKien && /\b(?:once|after|when|if|as\s+soon\s+as)\b/i.test(t.slice(dauCau(t, m.index), m.index))) continue;
    if (chung && CAU_CHUNG.test(cauChua(t, m.index))) continue;
    return m[0];
  }
  return null;
}

function luatBH9(t, ctx, kbText) {
  // a · Y_TE — chỉ khi khách vừa báo dấu hiệu y tế (handler truyền loại, `context.js#dauHieuYTe`).
  if (ctx.dauHieuYTe) {
    const thieu = !KHUYEN_KHAM.test(t), gia = extractMoney(t).length > 0 || NEU_GOI.test(t), hua = HUA_CHUA.test(t);
    if (thieu || gia || hua) {
      return { rule: 'Y_TE', reason: `Khách báo ${ctx.dauHieuYTe} — câu ${thieu ? 'không khuyên ngừng dùng/đi khám' : gia ? 'vẫn nêu giá/gói' : 'hứa chữa'}; gửi câu y tế cố định + chuyển sale` };
    }
  }
  // b · BIA_TRANG_THAI_DON — mọi lượt, trừ lượt POS đã tạo đơn thật.
  if (!ctx.orderCreated) {
    for (const re of [...KHANG_DINH_DON, ...(ctx.isOrderSummary ? [] : [XAC_NHAN_DON])]) {
      for (const m of t.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))) {
        if (sauDieuKien(t, m.index) || quyTrinhSau(t, m.index + m[0].length)) continue;
        return { rule: 'BIA_TRANG_THAI_DON', reason: `Khẳng định trạng thái đơn («${m[0]}») — bot không tra được đơn; chuyển sale` };
      }
    }
  }
  // c · TU_HUA — vòng 2 (đối kháng F7c, tổng F): lượt TÓM TẮT đơn nhắc lại mốc giờ KHÁCH xin («Noted: delivery after 5 PM. Our staff
  // will contact you to confirm») là chép yêu cầu vào đơn để sale xác nhận, không phải bot tự hứa ⇒ miễn `HUA_MOC` ở lượt đó.
  const hua = (!ctx.isOrderSummary && khopKhongMien(HUA_MOC, t, kbText, { chung: true })) || khopKhongMien(HUA_BAO_COURIER, t, kbText)
    || (!ctx.daBanGiao && !ctx.isOrderSummary && (khopKhongMien(HUA_TEAM_CO, t, kbText, { dieuKien: true })
      || khopKhongMien(HUA_TEAM_SE, t, kbText, { dieuKien: true })));
  if (hua) return { rule: 'TU_HUA', reason: `Tự hứa thay bộ phận giao hàng/sale («${hua}») — chuyển sale` };
  // d · BAN_LAI_SAU_BAN — khách đang có đơn (`prof.donDaCo`). Miễn lượt TÓM TẮT đơn (cùng lý do [S8]): đơn nguồn KHÁCH vẫn được tạo
  // (`handler-v3.js#captureOrder` chỉ chặn nguồn page) và câu tóm tắt có giá/gói là đúng — chặn nó là giết lời xác nhận đơn.
  if (ctx.donDaCo && !ctx.isOrderSummary) {
    const goi = extractMoney(t).length > 0 || NEU_GOI.test(t) || GOI_GIA.test(t);
    if (goi || XIN_THONG_TIN.test(t)) {
      return { rule: 'BAN_LAI_SAU_BAN', reason: `Khách đang có đơn mà câu ${goi ? 'chào giá/gói' : 'xin lại thông tin/COD'} — chuyển sale` };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SỬA TẠI CHỖ — không tốn thêm lời gọi model.
//
// Đo 11/08/2026 trên production: 44 lần guard can thiệp thì 44 lần đều là "xin
// model viết lại", mỗi lần thêm TRỌN một lời gọi (~4.400 token cache + ~2.300
// token mới) tức nhân đôi giá lượt đó. Nhưng 32/44 (73%) là TOO_LONG và
// CHECKLIST — lỗi HÌNH THỨC, code cắt được, không cần model phán đoán gì.
//
// Chỉ sửa tại chỗ những luật mà phép cắt là TẤT ĐỊNH và không đổi nghĩa. Các
// luật nội dung (bịa giá, lộ PII, hứa ngày giao, bịa khan hiếm) vẫn phải để
// model viết lại — cắt máy móc ở đó là làm sai nghĩa, nguy hiểm hơn tốn tiền.
// ─────────────────────────────────────────────────────────────────────────────
const FIXABLE = new Set(['TOO_LONG', 'CHECKLIST']);
export const canFixLocally = (rule) => FIXABLE.has(rule);

// Cắt tin dài về trong hạn, GIỮ LẠI câu hỏi chốt ở cuối — nguyên tắc #14: mỗi
// tin phải kết bằng một bước tiến về phía đơn, cắt cụt là bỏ mất bước đó.
function trimLong(text) {
  const lines = String(text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const lastQ = [...lines].reverse().find((l) => /[?？]/.test(l)) || '';
  const out = [];
  for (const l of lines) {
    if (out.length >= 5) break;
    if (approxTokens([...out, l].join('\n')) > 380) break;
    out.push(l);
  }
  if (lastQ && !out.includes(lastQ)) {
    while (out.length && (out.length >= 5 || approxTokens([...out, lastQ].join('\n')) > 400)) out.pop();
    out.push(lastQ);
  }
  const fixed = out.join('\n').trim();
  return fixed && fixed !== String(text).trim() ? fixed : null;
}

// Gộp checklist nhiều dòng thành MỘT dòng, giữ nguyên chữ của model (không tự
// chế câu mới — khách mỗi page một ngôn ngữ, chế câu là dễ chế nhầm tiếng).
function collapseChecklist(text) {
  const keep = [], fields = [];
  for (const l of String(text || '').split('\n')) {
    if (BULLET_LINE.test(l) && INFO_WORD.test(l) && isEmptyField(l)) {
      const name = l.replace(/^[\s*_\-–—•·>#]+/, '').replace(/[:：].*$/, '').trim();
      if (name) fields.push(name);
    } else if (l.trim()) keep.push(l.trim());
  }
  if (fields.length < 3) return null;
  const fixed = [...keep.slice(0, 2), fields.join(', ')].join('\n').trim();
  return fixed && fixed !== String(text).trim() ? fixed : null;
}

/** Trả bản đã sửa, hoặc null nếu luật này không sửa máy móc được. */
export function localFix(text, rule) {
  if (rule === 'TOO_LONG') return trimLong(text);
  if (rule === 'CHECKLIST') return collapseChecklist(text);
  return null;
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
