// M13 · POST-SALE ROUTER — nhận diện hậu bán bằng NỘI DUNG, không chỉ bằng thẻ Pancake.
// Spec: docs/v2/03-TANG-TANG-CHOT.md § M13
//
// CA THẬT PHẢI KHÔNG BAO GIỜ LẶP LẠI (khách Matess Valdez, 13 lượt AI, 0 đơn):
//   khách đã NHẬN HÀNG, báo "Kuya damage po yong Isa" (một hộp bị vỡ)
//   → AI đáp "thank you so much" rồi DỘI NGUYÊN BÀI QUẢNG CÁO chính sản phẩm khách vừa mua.
// Đo được 7% hội thoại có AI rơi vào cảnh này — tiền quảng cáo đốt vào khách đã mua xong,
// còn khiếu nại thật thì không ai xử lý.
//
// VÌ SAO KHÔNG DỰA VÀO THẺ ĐƠN PANCAKE: nhiều đơn không đi qua Pancake POS (sale tạo tay,
// FB Commerce, kênh khác) nên hội thoại KHÔNG có thẻ trạng thái đơn — đúng ca Matess Valdez.
// Thẻ vẫn được M05 xử lý trước (conv-owner § ①); module này bắt phần thẻ bỏ lọt.

export const PS = {
  PROBLEM: 'PROBLEM',             // hàng lỗi/vỡ/sai món → sale NGAY
  NOT_RECEIVED: 'NOT_RECEIVED',   // chưa nhận được → luồng vận chuyển/RTO
  STATUS: 'STATUS',               // hỏi tình trạng đơn → luồng vận chuyển/RTO
  RECEIVED: 'RECEIVED',           // đã nhận, không kêu ca → nhánh CƠ HỘI
};

// Nhánh ③ có NGÂN SÁCH RIÊNG, tách hẳn khỏi ngân sách bán mới (spec §M13).
export const OPPORTUNITY_MAX_TURNS = 2;

// ─────────────────────────────────────────────────────────────────────────────
// Bốn nhóm từ khoá (spec §M13) — Tagalog / English / Ả Rập.
// \b không dùng được với chữ Ả Rập nên mẫu Ả Rập để riêng.
// ─────────────────────────────────────────────────────────────────────────────

// ① CÓ VẤN ĐỀ
const PROBLEM = /\b(damage[ds]?|damaged|sira|nasira|basag|nabasag|broken|defective|leaking|tumagas|natapon|expired|wrong item|maling item|mali ang natanggap|wrong order|kulang ang natanggap|nawala ang order|hindi (?:ito )?gumagana|not working|doesn'?t work|hindi effective|walang epekto|nangati|rashes)\b/i;
const PROBLEM_AR = /(مكسور|مكسورة|تالف|تالفة|مخرب|منتج خطأ|ناقص|مو شغال|ما يشتغل|منتهي)/;

// "not working" nói về SỐ ĐIỆN THOẠI / WhatsApp / link chứ không phải sản phẩm.
// Ca thật (khách Pieces March): "My Number in whatsApp not working so I give my New number
// just call me" — v2 chấm PROBLEM rồi khoá AI, trong khi đây là khách ĐANG CHO SỐ MỚI,
// tức tín hiệu mua nóng nhất trong cả bảng điểm M11. Bắt nhầm đúng một tin này là mất một đơn.
const NOT_PRODUCT_SUBJECT = /\b(number|numbers|whatsapp|whats ?app|wa|sim|phone|contact|link|account|app|internet|wifi|signal|messenger|page)\b[^.!?]{0,30}\b(?:not working|doesn'?t work|hindi gumagana)|\b(?:not working|doesn'?t work|hindi gumagana)\b[^.!?]{0,30}\b(number|whatsapp|whats ?app|sim|phone|link|account|app|signal)\b/i;

// SAI HÀNG sau khi đã nhận: màu/kích cỡ/mẫu không đúng, đòi đổi. CHỈ tính khi khách đã nói
// là NHẬN ĐƯỢC HÀNG — nếu không, "may different colors po ba?" (hỏi trước bán) sẽ bị bắt nhầm.
// Hai ca thật rơi vào đây và bị đẩy sang nhánh MỜI MUA LẠI:
//   · "I received my order. Unfortunatley the birth colors is diff. Pls change this"
//   · "I received my order but it's look not a January birthstone"
// Mời khách đang khiếu nại sai hàng mua thêm chính là lỗi Matess Valdez ở dạng tinh vi hơn.
const MISMATCH = /\b(?:wrong|mali(?:ng)?|iba(?:ng)?|different|diff|hindi (?:ito )?(?:ang|yung))\b[^.!?]{0,30}\b(?:item|order|color|colour|colors|colours|size|stone|birthstone|design|product|variant|flavor|scent)\b|\b(?:item|order|color|colour|colors|colours|size|stone|birthstone|design|product|variant)\b[^.!?]{0,30}\b(?:is|ay)?\s*(?:wrong|mali|iba|different|diff)\b|\b(?:pls|please|paki|pa)[- ]?(?:change|palit|palitan|replace|change this)\b|\bnot (?:a|an|the) [a-z]{3,20} (?:birthstone|stone|color|colour|item|product)\b/i;
const MISMATCH_AR = /(لون خطأ|مقاس خطأ|غير المطلوب|بدل المنتج)/;

// Thất vọng sau khi mở hàng — cũng chỉ tính khi khách ĐÃ NHẬN. Ca thật: "I received my order
// just now and when i opened it I was disappointed because I order Peridot…" — luật cũ xếp vào
// nhóm hài lòng rồi mời mua thêm.
const UNHAPPY = /\b(disappoint(?:ed|ing)?|dissatisfied|not happy|hindi (?:ako )?masaya|nalungkot|panget|pangit|sayang)\b/i;

// ② CHƯA NHẬN
// "it didn't arrive" lấy từ ca thật (khách Anthony Alfaro) — v2 cũ bỏ lọt vì mẫu chỉ có
// "still not arrived", nên tin đó rơi xuống nhóm ĐÃ NHẬN và khách chưa nhận hàng bị mời mua thêm.
const NOT_RECEIVED = /\b(hindi pa (?:dumating|dumadating|natatanggap|nakukuha|na deliver|nadeliver)|wala pa(?:ng| ang)? (?:dumating|order|parcel|package|delivery)|di pa dumating|still (?:not|haven'?t|hasn'?t) (?:deliver|delivered|received|arrive|arrived)|not (?:yet )?(?:received|delivered|arrived)|haven'?t received|did ?n'?t (?:arrive|come|deliver|arrived)|has ?n'?t (?:arrived|come)|where is my (?:order|parcel|package)|nasaan (?:na )?(?:ang|yung) (?:order|parcel|package|padala)|hindi dumating)\b/i;
const NOT_RECEIVED_AR = /(لم يصل|ما وصل|لم أستلم|ما استلمت|وين الطلب|أين طلبي)/;

// ③ HỎI TÌNH TRẠNG
const STATUS = /\b(tracking|track(?:ing)? number|saan na(?: ang| yung)?|san na(?: ang| yung)?|status ng order|order status|update sa order|update ko sa order|kailan darating(?: ang| yung)? order|anong update)\b/i;
const STATUS_AR = /(تتبع|رقم التتبع|وين طلبي|حالة الطلب)/;

// ④ ĐÃ NHẬN — mẫu phải ở THÌ QUÁ KHỨ / có "na": "delivered" đứng một mình là câu hỏi
// trước bán ("is it delivered free?"), bắt nhầm là chặn mất một đơn.
// "received" phải nói về HÀNG, không phải về tin nhắn/cuộc gọi: ca thật (khách Anthony
// Alfaro) "I received messages from two WhatsApp numbers" từng bị tính là đã nhận hàng.
//
// Và phải ở THÌ QUÁ KHỨ THẬT. Khách viết tiếng Anh gãy nên câu HỎI về tương lai vẫn dùng
// chữ "received" — ba ca thật đều bị tính nhầm là đã nhận hàng rồi đẩy sang nhánh MỜI MUA LẠI:
//   · "How many day I received the items"     (hỏi mấy ngày thì nhận — khách CHƯA MUA)
//   · "When will I received the replacement"  (đang chờ hàng đổi)
//   · "Hopefully by thursday i received already"
// Mời một khách chưa cầm được hàng mua thêm thì vừa mất đơn vừa làm khách bực.
const FUTURE_RECEIVE = /\b(when will|when can|when do|how many days?|how long|what time|kailan|hopefully|sana|will i|i will|i'?ll|gonna|going to|bago|before)\b[^.!?]{0,35}receiv/i;
const RECEIVED = /\b(na[- ]?received|na[- ]?receive|nareceived|received (?:na|it|already|the (?:item|order|parcel|package))|i (?:have |already )?received(?!\s+(?:messages?|msg|text|texts|call|calls|sms|notification|email|link)\b)|dumating na|nakarating na|nakuha ko(?: na)?|natanggap ko(?: na)?|na[- ]?deliver(?:ed)? na|delivered na|nadeliver na|it arrived|arrived na|nasa akin na|na receive ko)\b/i;
const RECEIVED_AR = /(وصل الطلب|وصلني|وصلت|استلمت|استلمته)/;

// Câu GIẢ ĐỊNH trước bán ("what if it arrives damaged?", "kung sira ba pagdating?") —
// không phải khiếu nại. Bắt nhầm ca này = mất một khách đang cân nhắc mua.
//
// Liên từ điều kiện phải đứng TRƯỚC từ chỉ hư hỏng và cách nó tối đa 2 từ. Ràng buộc thứ
// tự này là phần quan trọng nhất: "kung sira ba pagdating" là giả định, còn "sira yung isa,
// kung pwede palitan" là KHIẾU NẠI THẬT — chỉ khác nhau ở chỗ "kung" đứng trước hay sau.
// Bắt "kung" ở bất kỳ đâu trong câu sẽ nuốt mất đúng loại khiếu nại thứ hai.
const DAMAGE_WORD = 'damage[ds]?|sira|nasira|basag|nabasag|broken|defective|leaking|tumagas|mali|wrong';
const HYPOTHETICAL = new RegExp(
  '\\b(?:what if|if it|if the|in case|kung sakali|kung sakaling|sakaling|paano kung|pano kung)\\b'
  + `|\\b(?:kung|kapag|pag)\\s+(?:\\S+\\s+){0,2}(?:${DAMAGE_WORD})\\b`
  + '|إذا كان|لو كان',
  'i',
);

// Lời KHEN sau khi nhận hàng — dấu hiệu chắc chắn của nhánh ③.
const HAPPY = /\b(salamat|maraming salamat|thank you|thanks|ang ganda|ganda|maganda|effective|gumagana|sobrang bilis|ang bilis|nice|good product|love it|satisfied|okay naman|ok naman|shukran|mabango)\b/i;
const HAPPY_AR = /(شكرا|شكراً|ممتاز|حلو|رائع|جميل)/;

// Muốn mua lại / giới thiệu bạn — nhánh ③ nhắm đúng chỗ này (ca Ashlyn Velasco nói muốn
// giới thiệu bạn bè, AI không đáp, mất một đơn miễn phí).
const REPEAT = /\b(order (?:again|ulit|pa)|umorder ulit|bibili ulit|kukuha (?:pa|ulit)|isa pa|another one|one more|refill|para sa (?:kaibigan|friend|kapatid|nanay|tatay)|for my (?:friend|sister|mother)|magrefer|i[- ]?refer|recommend (?:it|sa|to))\b/i;

const test = (s, re, reAr) => re.test(s) || (reAr ? reAr.test(s) : false);

/**
 * Tin khách này có phải chuyện HẬU BÁN không?
 * Thứ tự ưu tiên: có vấn đề → chưa nhận → hỏi tình trạng → đã nhận.
 * (Khách vừa nói "dumating na pero basag" thì đó là KHIẾU NẠI, không phải lời khen.)
 *
 * @param {string} text tin khách (đã gộp cụm)
 * @returns {{kind:string, happy:boolean, repeat:boolean}|null} null = không phải hậu bán
 */
export function detectPostSale(text) {
  const s = String(text || '');
  if (!s.trim()) return null;

  const hypothetical = HYPOTHETICAL.test(s);
  const received = test(s, RECEIVED, RECEIVED_AR) && !FUTURE_RECEIVE.test(s);

  // ① CÓ VẤN ĐỀ. Ba cửa lọc, theo thứ tự:
  //    · câu giả định ("kung sira pagdating?") chỉ được bỏ qua khi khách CHƯA nói đã nhận —
  //      "dumating na, kaso basag" vẫn là khiếu nại thật;
  //    · "not working" nói về số/WhatsApp/link thì KHÔNG phải hàng lỗi;
  //    · sai màu/sai mẫu tính là hàng lỗi, nhưng CHỈ khi khách đã nhận hàng.
  const damaged = test(s, PROBLEM, PROBLEM_AR) && !NOT_PRODUCT_SUBJECT.test(s);
  const mismatch = received && (test(s, MISMATCH, MISMATCH_AR) || UNHAPPY.test(s));
  if ((damaged && (received || !hypothetical)) || mismatch) {
    return { kind: PS.PROBLEM, happy: false, repeat: false };
  }
  // ② CHƯA NHẬN — xét TRƯỚC nhóm ④ vì "đơn không tới, nhưng tôi có nhận được tin nhắn"
  //    vừa khớp cả hai; khách chưa cầm được hàng thì không bao giờ là nhánh cơ hội.
  if (test(s, NOT_RECEIVED, NOT_RECEIVED_AR)) {
    return { kind: PS.NOT_RECEIVED, happy: false, repeat: false };
  }
  // ③ HỎI TÌNH TRẠNG — chỉ tính khi khách ĐÃ có đơn trong mạch chuyện; "saan na" đứng
  //    một mình giữa lúc đang bán thì để AI trả lời bình thường (xem hasOrderContext).
  if (test(s, STATUS, STATUS_AR)) {
    return { kind: PS.STATUS, happy: false, repeat: false };
  }
  // ④ ĐÃ NHẬN, không kêu ca
  if (received) {
    return {
      kind: PS.RECEIVED,
      happy: test(s, HAPPY, HAPPY_AR),
      repeat: REPEAT.test(s),
    };
  }
  return null;
}

/**
 * Ba nhánh xử lý (spec §M13).
 *
 * @param {object} a
 *   @param {string} a.kind              kết quả detectPostSale().kind
 *   @param {number} [a.oppTurns]        số lượt đã tiêu ở nhánh CƠ HỘI
 *   @param {boolean} [a.hasOrderContext] hội thoại đã có dấu hiệu đơn (thẻ Pancake / AI đã
 *                                       chốt / trạng thái CLOSING·POST_SALE)
 * @returns {{action:string, reason:string, kind:string, priority:boolean, aiMay:boolean}}
 *   action: 'HANDOFF_SALE' | 'HANDOFF_RTO' | 'OPPORTUNITY' | 'OPPORTUNITY_DONE' | 'NONE'
 *   aiMay=true  → AI được nói (nhánh cơ hội, ngân sách riêng)
 *   aiMay=false → AI im, chuyển người; KHÔNG tiêu ngân sách bán
 */
export function routePostSale({ kind, oppTurns = 0, hasOrderContext = false }) {
  switch (kind) {
    case PS.PROBLEM:
      return {
        action: 'HANDOFF_SALE', kind, priority: true, aiMay: false,
        reason: '🔴 KHÁCH BÁO HÀNG LỖI/VỠ/SAI MÓN sau khi đã nhận — cần người xử lý ngay, TUYỆT ĐỐI không chào bán tiếp',
      };
    case PS.NOT_RECEIVED:
      return {
        action: 'HANDOFF_RTO', kind, priority: true, aiMay: false,
        reason: '📦 Khách báo CHƯA NHẬN được hàng — chuyển bộ phận vận chuyển/RTO kiểm tra đơn',
      };
    case PS.STATUS:
      // "saan na po?" giữa lúc đang bán (chưa có đơn nào) thường là hỏi giao hàng, không
      // phải tra đơn — để AI trả lời bình thường. Chỉ chuyển RTO khi đã có dấu hiệu đơn.
      if (!hasOrderContext) return { action: 'NONE', kind, priority: false, aiMay: true, reason: '' };
      return {
        action: 'HANDOFF_RTO', kind, priority: false, aiMay: false,
        reason: '📦 Khách hỏi TÌNH TRẠNG ĐƠN — chuyển bộ phận vận chuyển/RTO tra cứu',
      };
    case PS.RECEIVED:
      if (oppTurns >= OPPORTUNITY_MAX_TURNS) {
        return {
          action: 'OPPORTUNITY_DONE', kind, priority: false, aiMay: false,
          reason: `Hậu bán: đã dùng hết ${OPPORTUNITY_MAX_TURNS} lượt mời mua lại — để sale chăm tiếp`,
        };
      }
      return {
        action: 'OPPORTUNITY', kind, priority: false, aiMay: true,
        reason: 'Khách ĐÃ NHẬN HÀNG và không kêu ca — nhánh cơ hội: hỏi thăm + mời mua lại/giới thiệu bạn',
      };
    default:
      return { action: 'NONE', kind: '', priority: false, aiMay: true, reason: '' };
  }
}

// Lời nhắc gài vào lượt của model ở nhánh CƠ HỘI. AI mặc định đang ở chế độ BÁN MỚI
// (prompt bán hàng) nên nếu không nói rõ thì nó sẽ chào bán lại từ đầu — đúng lỗi cũ.
export const OPPORTUNITY_BRIEF = [
  '[HỆ THỐNG — HẬU BÁN, ĐỌC KỸ]',
  'Khách NÀY ĐÃ NHẬN ĐƯỢC HÀNG rồi. TUYỆT ĐỐI KHÔNG giới thiệu lại sản phẩm từ đầu,',
  'KHÔNG dội bảng giá, KHÔNG hỏi tên/SĐT/địa chỉ, KHÔNG gọi create_draft_order.',
  'Việc của bạn ở lượt này: hỏi thăm ngắn xem khách dùng có hợp không, cảm ơn,',
  'rồi mời NHẸ mua thêm/giới thiệu bạn bè bằng ĐÚNG 1 câu. Tối đa 2-3 câu, ngôn ngữ của khách.',
  'Nếu khách than phiền bất cứ điều gì → gọi ngay tool handoff_human.',
].join('\n');

// Lời nhắc cho tin GIỮ CHỖ khi chuyển người (không dùng model, 0 token).
export function holdingPostSale(kind, lang = 'tl') {
  const tl = {
    [PS.PROBLEM]: 'Naku, pasensya na po sa abala. 🙏 Ipapasa ko po agad kayo sa team namin para maayos ito ngayon din.',
    [PS.NOT_RECEIVED]: 'Pasensya na po sa paghihintay. 🙏 Icheck po namin agad ang delivery ninyo at may makakausap kayong team member namin.',
    [PS.STATUS]: 'Sandali lang po, icheck po namin ang order ninyo at ibabalita agad ng team namin. 🙏',
  };
  const en = {
    [PS.PROBLEM]: 'I\'m so sorry about that. 🙏 I\'m passing this to our team right now so they can fix it for you.',
    [PS.NOT_RECEIVED]: 'Sorry for the wait. 🙏 We\'re checking your delivery now and a team member will get back to you shortly.',
    [PS.STATUS]: 'One moment please — we\'re checking your order and our team will update you shortly. 🙏',
  };
  const ar = {
    [PS.PROBLEM]: 'نعتذر جداً عن هذا. 🙏 حولت طلبك للفريق المختص الآن ليتم حله فوراً.',
    [PS.NOT_RECEIVED]: 'نعتذر عن التأخير. 🙏 نتحقق من الشحنة الآن وسيتواصل معك أحد الفريق قريباً.',
    [PS.STATUS]: 'لحظة من فضلك — نتحقق من طلبك وسيوافيك الفريق بالتحديث. 🙏',
  };
  const table = lang === 'ar' ? ar : (lang === 'en' ? en : tl);
  return table[kind] || table[PS.STATUS];
}
