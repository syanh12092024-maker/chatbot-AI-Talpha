// M06 · FAST LANE — trả lời 0 token, đặt TRƯỚC mọi lần gọi LLM.
// Spec: docs/v2/02-TANG-LUONG-CHAT.md § M06
//
// Vì sao cần: đo 10.900 tin đã kích hoạt AI (log VPS, tới 10/08/2026)
//   sticker/<div></div> 1.401 (12,9%) · nút START 1.023 (9,4%) · hỏi giá 660 (6,1%)
//   gật đầu 1 từ 590 (5,4%) · chào hỏi 281 (2,6%)      →  33,8% KHÔNG cần LLM
// Và 69,3% hoá đơn rơi vào LƯỢT AI ĐẦU TIÊN — đúng chỗ những tin này tập trung.
//
// Đây là tầng thay đúng vai trò "bắt từ khoá" của Botcake ở luồng cũ, nhưng chạy
// TRONG hệ thống nên đọc được ngữ cảnh (đã nói gì, AI vừa hỏi gì).
//
// AN TOÀN LÀ TRÊN HẾT: mọi trường hợp nghi ngờ đều LEO LÊN AI. Thà tốn token còn
// hơn trả lời máy móc một khách đang muốn mua.

import { productTiers } from './kb.js';
import { cleanText } from './text.js';

const norm = (s) => cleanText(s || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

// ─────────────────────────────────────────────────────────────────────────────
// Nhận dạng ngôn ngữ (chỉ 3 nhánh — đủ để chọn khung câu mẫu)
// ─────────────────────────────────────────────────────────────────────────────
const TL_MARK = /\b(po|opo|ho|magkano|salamat|kumusta|kamusta|sige|ilan|paano|meron|wala|gusto|ako|kayo|niyo|yung|yan|naman|lang)\b/i;
const AR_SCRIPT = /[؀-ۿ]/;

export function detectLang(text) {
  const s = String(text || '');
  if (AR_SCRIPT.test(s)) return 'ar';
  if (TL_MARK.test(s)) return 'tl';
  return 'en';
}

// ─────────────────────────────────────────────────────────────────────────────
// Mẫu nhận dạng tin
// ─────────────────────────────────────────────────────────────────────────────

// Nút "Get Started" của Messenger — Pancake trả về đúng chữ "Start".
const START_BTN = /^(start|get started|bắt đầu|بدء)$/i;

// Chào hỏi thuần
const GREET = /^(hi+|hello+|helo+|hey+|hai|kumusta|kamusta|musta|good (?:morning|afternoon|evening|day)|salam|assalamualaikum|السلام عليكم|مرحبا|اهلا)( po| there| sir| maam| ma am)?$/i;

// ── Tin 1 từ, tách làm BA loại vì hậu quả khác nhau hoàn toàn ────────────────
//
// ⚠️ Đây là chỗ dễ mất đơn nhất của cả module. "yes"/"opo" đứng một mình có thể là
//    câu TRẢ LỜI cho "Ready na po ba kayong mag-order?" — im lặng ở đây là mất đơn.
//    Chi phí trả nhầm lên AI = ~130đ. Chi phí im nhầm = mất một đơn hàng.
//    Nên mọi trường hợp mập mờ đều LEO LÊN AI.

// (1) TỪ CHỐI — nguyên tắc 14 bắt buộc chạy ladder 3 bước, TUYỆT ĐỐI không được im.
const NEGATIVE = /^(no+|nope|nah|hindi|ayoko|ayaw|wala|not now|maybe later|next time|later|لا|مو الحين)( po| na| lang| thanks| thank you)*$/i;

// (2) ĐỒNG Ý — có thể là gật đầu vô thưởng, cũng có thể là ĐỒNG Ý CHỐT ĐƠN.
const AFFIRM = /^(ok+|okay|okey|oky|oke|k|sige|sge|yes+|yeah|yep|yup|opo|oo|noted|got it|alright|sure|g|game|تمام|اوك|نعم)( po| na| lang| sir| maam| ma am)*$/i;

// (3) CẢM ƠN / ẬM Ừ — không bao giờ là lời chốt đơn, im được an toàn.
const THANKS = /^(thanks?|thank you|thankyou|ty|salamat|maraming salamat|shukran|شكرا|welcome|you'?re welcome|hm+|hmm+|ah+|eh+|oh+|👍|🙏|❤️|😊|😍|🥰|❤|👌)( po| na| lang| you| so much| din| rin)*$/i;

// Hỏi giá
const ASK_PRICE = /(how much|howmuch|magkano|mgkano|price|presyo|cost|pricelist|price list|bahin sa presyo|كم السعر|السعر|بكم|كم سعر|بكام)/i;

// Hỏi giao hàng
const ASK_SHIP = /(shipping|delivery|deliver|ilang araw|ilang days|how long|how many days|kailan (?:dumating|darating|makukuha)|when (?:will|can) i (?:get|receive)|free (?:ship|delivery)|libre ba ang (?:ship|delivery)|متى يصل|التوصيل|الشحن)/i;

// Hỏi cách đặt
const ASK_HOWTO = /(how to order|how do i order|how can i order|paano (?:mag)?(?:order|umorder|bumili)|pano (?:mag)?order|pa ?order|kaano|كيف أطلب|كيفية الطلب|طريقة الطلب)/i;

// Tín hiệu PHẢI leo lên AI (dù có khớp mẫu nào ở trên)
const HAS_PHONE = /\+?\d[\d\s().-]{6,16}\d/;
const OBJECTION = /(mahal|expensive|pricey|sobrang mahal|iisipin|isipin ko|next time|wala pang budget|sahod|peke|fake|scam|manloloko|original ba|totoo ba|effective ba|sigurado|hindi ako|ayoko|discount|tawad|bawas)/i;
const BUY_INTENT = /(order na|i(?:'| a)?ll take|i want to order|gusto ko|kukunin ko|bibili|bili na|kunin ko|sige order|أطلب|أريد)/i;

// ─────────────────────────────────────────────────────────────────────────────
// Dựng câu trả lời từ KB (giá LUÔN đúng vì lấy thẳng bảng giá — không bịa được)
// ─────────────────────────────────────────────────────────────────────────────

function priceLines(kb) {
  const p = (kb?.products || [])[0];
  if (!p) return null;
  const tiers = productTiers(p);
  if (!tiers.length) return null;
  const cur = p.currency || 'AED';
  return tiers.map((t) => `🎁 ${t.label} — ${t.price} ${cur}`).join('\n');
}

const FRAME = {
  tl: {
    priceHead: 'Hello po! 😊 Ito po ang presyo namin:',
    priceTail: '\n🚚 FREE delivery po, at COD — bayad na lang pagdating.\nIlan po ang gusto niyong kunin? 😊',
    ship: '2-5 working days po from our local warehouse, at FREE delivery. 🚚\nCOD po — tingnan niyo muna bago magbayad.\nGusto niyo na po bang i-process ang order? 😊',
    howto: 'Sobrang dali lang po! 😊 I-send niyo lang:\nPangalan · Number · Address\nCOD po — bayad pagdating ng order. Simulan na po natin? 🚚',
    greetTail: '\nAno pong maitutulong ko sa inyo? 😊',
  },
  en: {
    priceHead: 'Hello po! 😊 Here are our prices:',
    priceTail: '\n🚚 FREE delivery, and it\'s COD — you pay upon delivery.\nHow many would you like to get? 😊',
    ship: '2-5 working days from our local warehouse, with FREE delivery. 🚚\nIt\'s COD — you check the item first, then pay.\nWould you like me to process your order? 😊',
    howto: 'It\'s very easy po! 😊 Just send:\nName · Contact number · Address\nCOD po — you pay when it arrives. Shall we start? 🚚',
    greetTail: '\nHow can I help you today? 😊',
  },
  ar: {
    priceHead: 'أهلاً! 😊 هذه أسعارنا:',
    priceTail: '\n🚚 التوصيل مجاني، والدفع عند الاستلام.\nكم قطعة تحب تطلب؟ 😊',
    ship: 'التوصيل خلال ٢-٥ أيام عمل من مستودعنا المحلي، والشحن مجاني. 🚚\nالدفع عند الاستلام — تشوف المنتج قبل ما تدفع.\nتحب أجهز لك الطلب؟ 😊',
    howto: 'سهلة جداً! 😊 أرسل لنا:\nالاسم · رقم الجوال · العنوان\nالدفع عند الاستلام. نبدأ؟ 🚚',
    greetTail: '\nكيف أقدر أساعدك؟ 😊',
  },
};

function buildPrice(kb, lang) {
  const lines = priceLines(kb);
  if (!lines) return null; // không có bảng giá → phải để AI xử lý
  const f = FRAME[lang] || FRAME.en;
  return `${f.priceHead}\n${lines}${f.priceTail}`;
}

function buildGreeting(kb, lang) {
  // Ưu tiên câu chào riêng của page (M02 sẽ điền); chưa có thì dựng từ tên SP + giá.
  const custom = kb?.config?.greeting;
  if (custom) return custom;
  const price = buildPrice(kb, lang);
  if (price) return price;
  const name = (kb?.products || [])[0]?.name;
  const f = FRAME[lang] || FRAME.en;
  return name ? `Hello po! 😊 This is ${name}.${f.greetTail}` : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cổng chính
// ─────────────────────────────────────────────────────────────────────────────

export const fastLaneConfig = {
  enabled: process.env.FASTLANE !== '0',
  templates: process.env.FASTLANE_TEMPLATES !== '0', // lớp 2 (giá/ship/cách đặt)
};

/**
 * @param {object} a
 *   @param {string} a.text        Tin khách (đã gộp cụm)
 *   @param {object} a.kb          KB của page
 *   @param {number} a.aiTurns     Số lượt AI đã trả cho khách này
 *   @param {string} a.lastAiText  Tin AI gửi gần nhất (để biết AI vừa hỏi gì)
 *   @param {Set}    a.usedLanes   Các câu mẫu đã dùng cho khách này (chống lặp)
 * @returns {{handled:boolean, reply:string|null, lane:string, reason:string}}
 *   handled=true, reply=null  → IM LẶNG, không gọi LLM, không gửi gì
 *   handled=true, reply='...' → gửi câu mẫu (0 token)
 *   handled=false             → leo lên AI Closer
 */
export function fastLane({ text, kb, aiTurns = 0, lastAiText = '', usedLanes }) {
  const escalate = (reason) => ({ handled: false, reply: null, lane: '', reason });
  if (!fastLaneConfig.enabled) return escalate('fastlane tắt');

  const raw = String(text || '');
  const s = norm(raw);
  const lang = detectLang(raw);
  const used = usedLanes instanceof Set ? usedLanes : new Set();

  // ── Tín hiệu ƯU TIÊN CAO: luôn leo lên AI, không cần xét mẫu ──────────────
  if (HAS_PHONE.test(raw)) return escalate('có số điện thoại — khách đang cho thông tin đơn');
  if (OBJECTION.test(raw)) return escalate('có tín hiệu phản đối — phải để AI gỡ');
  if (BUY_INTENT.test(raw)) return escalate('có ý định mua rõ ràng');

  // ── LỚP 1 · luật im lặng ─────────────────────────────────────────────────

  // (a) Sticker / ảnh không kèm chữ / tin rỗng sau khi dọn.
  //     IM chỉ khi AI đã nói ít nhất 1 lượt — tức đây là sticker phản hồi.
  //     Nếu khách chưa được AI nói câu nào mà gửi ảnh thì có thể họ đang KHOE
  //     ảnh địa chỉ/sản phẩm → phải để AI xem.
  if (!s) {
    if (aiTurns >= 1) return { handled: true, reply: null, lane: 'silent_sticker', reason: 'sticker/ảnh phản hồi sau khi AI đã nói' };
    return escalate('ảnh/sticker khi AI chưa nói lượt nào — có thể là ảnh có nội dung');
  }

  // (b) Nút START của Messenger.
  if (START_BTN.test(s)) {
    if (aiTurns >= 1) return { handled: true, reply: null, lane: 'silent_start', reason: 'bấm START lại giữa hội thoại' };
    const g = buildGreeting(kb, lang);
    if (g && !used.has('greet')) { used.add('greet'); return { handled: true, reply: g, lane: 'tpl_start', reason: 'nút START' }; }
    return escalate('nút START nhưng chưa dựng được câu chào từ KB');
  }

  // (c1) TỪ CHỐI — luôn leo lên AI. Nguyên tắc 14: khách từ chối là lúc PHẢI bán,
  //      không phải lúc im. Đây là nơi ladder 3 bước được kích hoạt.
  if (NEGATIVE.test(s)) return escalate('khách TỪ CHỐI — phải chạy ladder 3 bước, không được im');

  // (c2) ĐỒNG Ý — chỉ im khi CHẮC CHẮN AI không hỏi gì ở lượt trước.
  //      Không biết AI vừa nói gì (server mới restart, lastAiText rỗng) → coi như có hỏi.
  if (AFFIRM.test(s)) {
    const prev = String(lastAiText || '').trim();
    if (!prev) return escalate('không rõ AI vừa nói gì — "đồng ý" có thể là chốt đơn');
    if (prev.includes('?') || prev.includes('？')) return escalate('AI vừa HỎI — "đồng ý" có thể là chốt đơn');
    if (aiTurns >= 1) return { handled: true, reply: null, lane: 'silent_affirm', reason: 'gật đầu, lượt trước AI không hỏi gì' };
    return escalate('gật đầu khi AI chưa nói lượt nào');
  }

  // (c3) CẢM ƠN / ậm ừ — không bao giờ là lời chốt đơn, im an toàn.
  if (THANKS.test(s)) {
    if (aiTurns >= 1) return { handled: true, reply: null, lane: 'silent_thanks', reason: 'cảm ơn/ậm ừ, AI không cần đáp' };
    return escalate('cảm ơn khi AI chưa nói lượt nào');
  }

  // (d) Chào hỏi thuần.
  if (GREET.test(s)) {
    if (aiTurns >= 1) return { handled: true, reply: null, lane: 'silent_greet', reason: 'chào lại giữa hội thoại' };
    const g = buildGreeting(kb, lang);
    if (g && !used.has('greet')) { used.add('greet'); return { handled: true, reply: g, lane: 'tpl_greet', reason: 'chào hỏi' }; }
    return escalate('chào hỏi nhưng chưa dựng được câu chào từ KB');
  }

  // ── LỚP 2 · kịch bản KB (0 token) ────────────────────────────────────────
  if (!fastLaneConfig.templates) return escalate('lớp template tắt');

  // Tin dài thì luôn có ngữ cảnh riêng → để AI.
  const words = s.split(' ').filter(Boolean).length;
  if (words > 12) return escalate('tin dài >12 từ');

  const tpl = (key, body, reason) => {
    if (!body) return escalate(`${reason} nhưng KB chưa đủ dữ liệu`);
    if (used.has(key)) return escalate(`${reason} lần 2 — template không thoả mãn, leo lên AI`);
    used.add(key);
    return { handled: true, reply: body, lane: `tpl_${key}`, reason };
  };

  const f = FRAME[lang] || FRAME.en;
  if (ASK_PRICE.test(raw)) return tpl('price', kb?.config?.fastLanePrice || buildPrice(kb, lang), 'hỏi giá');
  if (ASK_HOWTO.test(raw)) return tpl('howto', kb?.config?.fastLaneHowto || f.howto, 'hỏi cách đặt');
  if (ASK_SHIP.test(raw)) return tpl('ship', kb?.config?.fastLaneShip || f.ship, 'hỏi giao hàng');

  return escalate('cần AI thật sự');
}

// ─────────────────────────────────────────────────────────────────────────────
// Thống kê — để đo "tỷ lệ tin xử lý ở Fast Lane" (tiêu chí nghiệm thu ≥35%)
// ─────────────────────────────────────────────────────────────────────────────
const stats = { total: 0, byLane: {}, escalated: 0 };

export function noteFastLane(res) {
  stats.total++;
  if (!res.handled) { stats.escalated++; return; }
  const k = res.lane || 'unknown';
  stats.byLane[k] = (stats.byLane[k] || 0) + 1;
}

export function fastLaneStats() {
  const handled = stats.total - stats.escalated;
  return { ...stats, handled, rate: stats.total ? handled / stats.total : 0 };
}
