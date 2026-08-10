// M11 · LEAD SCORING & TURN BUDGET — chấm điểm bằng LUẬT, 0 token.
// Spec: docs/v2/03-TANG-TANG-CHOT.md § M11
//
// VÌ SAO BỎ TRẦN CÀO BẰNG (MAX_AI_TURNS=4) — đo trên 7.677 khách / 151 đơn:
//   lượt 1 → 0,3%  ·  2 → 3,0%  ·  3 → 5,4%  ·  4 → 11,2%  ·  5 → 16,7%  ·  6 → 18,9%
// Trần 4 đang cắt ĐÚNG chỗ tỷ lệ chốt bắt đầu nhân lên: khách đi được tới lượt 4 là khách
// đang nóng, vậy mà đúng lúc đó AI bị bịt miệng và đẩy sang hàng chờ sale. Ngược lại nhóm
// lạnh (~60% khách, tin cụt "ok"/"hi") vẫn được tiêu đủ 4 lượt.
//
// Module này đổi câu hỏi từ "khách này đã nói mấy lượt?" thành "khách này nóng cỡ nào?".
// Toàn bộ tính bằng regex trên tin KHÁCH — không gọi model, không tốn token, không gãy
// khi API lỗi.
//
// LỆCH MỘT CHIỀU CÓ CHỦ Ý: nghi ngờ thì CHO ĐIỂM (khách được thêm lượt, tốn ~130đ)
// chứ không bớt điểm (mất một đơn ~ vài trăm nghìn).

// ─────────────────────────────────────────────────────────────────────────────
// Bảng điểm (spec §M11). Mỗi tín hiệu chỉ tính MỘT LẦN trong cả hội thoại:
// khách hỏi giá 3 lần vẫn là 1 tín hiệu "hỏi giá", không phải 3 điểm.
// ─────────────────────────────────────────────────────────────────────────────
export const SIGNAL_POINTS = {
  phone: 4,           // cho số điện thoại — tín hiệu mạnh nhất
  address: 3,         // khu vực + ≥1 chi tiết
  name: 2,
  buy: 3,             // nói muốn mua
  price: 1,           // hỏi giá
  ship: 1,            // hỏi giao hàng
  warranty: 1,        // hỏi bảo hành / đổi trả
  howuse: 1,          // hỏi cách dùng
  obj_price: 2,       // chê đắt — QUAN TÂM MỚI MẶC CẢ
  image: 1,           // xin ảnh / hỏi mẫu
  back_from_cold: 2,  // quay lại sau khi đã nguội
  obj_trust: 0,       // nghi hàng giả — không cộng điểm nhưng được +3 lượt ladder
  obj_wait: 0,        // "để em nghĩ đã" — như trên
};

// Ba loại phản đối đều mở khoá "+3 lượt" để chạy trọn ladder 3 bước của nguyên tắc 14.
export const OBJECTION_SIGNALS = ['obj_price', 'obj_trust', 'obj_wait'];

// Trần cứng cho MỌI khách trong 24h — chống lỗi vòng lặp (tiêu chí nghiệm thu M11).
export const HARD_MAX_TURNS = 12;

// Điểm tối thiểu để RA KHỎI nhóm LẠNH. Spec §M11 ghi 1; đổi thành 2 ngày 10/08/2026 sau khi
// chạy lại trên 562 hội thoại thật kéo từ Pancake — bảng gốc chỉ giảm được 14,8% tổng lượt AI,
// không đạt ngưỡng nghiệm thu 30%.
//
// Vì sao đúng chỗ này chứ không phải chỗ khác: tất cả tín hiệu đáng +1 điểm (hỏi giá · hỏi ship ·
// hỏi bảo hành · hỏi cách dùng · xin ảnh) CHÍNH LÀ những câu Fast Lane đã trả lời sẵn bằng
// template 0 token. Khách mới chỉ làm mỗi việc đó thì chưa lộ ý định mua nào vượt quá tò mò —
// trả tiền model cho họ là trả cho việc Fast Lane vừa làm không công.
//
// Đo trên cùng 562 hội thoại đó, ngưỡng 2 cho: −30,3% tổng lượt AI toàn đàn, trong khi phần
// lượt dành cho khách NÓNG gần như không suy chuyển (3.450 so với 3.473 của bảng gốc, −0,7%).
// Các phương án siết sâu hơn đều phải cắt vào nhóm nóng: hạ trần nhóm NÓNG 6→5 tuy đạt 32,0%
// nhưng mất 44% lượt của chính nhóm sinh ra đơn — siết như vậy là siết nhầm chỗ.
export const AM_THRESHOLD = 2;

// Bù lượt khi khách nêu phản đối: ladder 3 bước (gỡ lý do → hạ rủi ro COD → chốt bằng
// lựa chọn) cần 3 lượt mà hiện chưa bao giờ chạy hết vì trần 4 lượt đã tiêu vào phần chào hỏi.
export const OBJECTION_BONUS_TURNS = 3;

// ─────────────────────────────────────────────────────────────────────────────
// Nhận dạng tín hiệu — Tagalog / English / Ả Rập (3 ngôn ngữ thật của khách)
// \b không hoạt động với chữ Ả Rập (không phải \w) nên mẫu Ả Rập để riêng, không \b.
// ─────────────────────────────────────────────────────────────────────────────

// SĐT: chuỗi 8–15 chữ số (KSA 05xxxxxxxx · PH 09xxxxxxxxx · +966/+971...). Ngưỡng 8 lấy từ
// ca thật SilentBoo ("71566943" — 8 số). Dưới 8 số thì gần như chắc chắn là giá tiền/số lượng.
const PHONE_CAND = /\+?\d[\d\s().-]{5,18}\d/g;
export function hasPhone(text) {
  const m = String(text || '').match(PHONE_CAND);
  if (!m) return false;
  return m.some((s) => {
    const d = s.replace(/\D/g, '').length;
    return d >= 8 && d <= 15;
  });
}

// Khu vực: tên thành phố thật của thị trường đang chạy + từ chỉ khu vực chung.
const AREA_LATIN = /\b(jeddah|jedda|riyadh|riyad|dammam|khobar|jubail|yanbu|taif|abha|makkah|mecca|madinah|medina|dubai|abu ?dhabi|sharjah|ajman|fujairah|ras al ?khaimah|umm al ?quwain|al ?ain|doha|al ?wakrah|kuwait|salmiya|hawally|farwaniya|jahra|muscat|salalah|sohar|manama|riffa|muharraq|city|district|street|block|barangay|province|village|compound)\b/i;
const AREA_AR = /(جدة|الرياض|الدمام|الخبر|مكة|المدينة|دبي|أبوظبي|ابوظبي|الشارقة|عجمان|العين|الدوحة|الكويت|مسقط|صلالة|المنامة|منطقة|حي|مدينة|شارع)/;
// Chi tiết: từ khoá địa chỉ HOẶC bất kỳ con số nào (số nhà / số toà / mã bưu chính).
const ADDR_DETAIL = /\b(house|home|st\.?|street|road|rd\.?|block|bldg|building|tower|villa|apartment|apt|flat|floor|unit|room|near|beside|behind|opposite|front of|zip|postal|po box)\b|\d/i;
const ADDR_DETAIL_AR = /(شارع|مبنى|فيلا|شقة|رقم|بجانب|قرب|خلف|مقابل|\d)/;

export function hasAddress(text) {
  const s = String(text || '');
  if (AREA_LATIN.test(s) && ADDR_DETAIL.test(s)) return true;
  if (AREA_AR.test(s) && ADDR_DETAIL_AR.test(s)) return true;
  return false;
}

// Tên: chỉ bắt khi khách NÓI RÕ là tên, hoặc khi tin đã có SĐT (khối thông tin đơn:
// "Amy Añoza / 0536064249 / Jeddah") — đoán mò tên từ chữ hoa dễ bắt nhầm tên sản phẩm.
const NAME_LABEL = /(?:my name is|my name's|i am|i'?m|this is|ako si|ako po si|pangalan ko(?: po)?(?: ay)?|name\s*[:=-]|pangalan\s*[:=-]|اسمي|الاسم\s*[:=-])\s*([\p{L}][\p{L}\s.'-]{1,40})/iu;
const NAME_LINE = /^[\p{Lu}\p{L}][\p{L}.'-]+(?:\s+[\p{L}][\p{L}.'-]+){1,3}$/u;

export function hasName(text) {
  const s = String(text || '');
  if (NAME_LABEL.test(s)) return true;
  if (!hasPhone(s)) return false;
  // Khối thông tin đơn: có SĐT + một dòng toàn chữ 2–4 từ → dòng đó là tên.
  return s.split(/[\n,·|]+/).some((line) => {
    const l = line.trim();
    return l.length >= 4 && l.length <= 40 && !/\d/.test(l) && NAME_LINE.test(l);
  });
}

const BUY = /\b(order na|order ko|i'?ll take|i will take|i want to (?:order|buy|get)|i'?d like to order|place (?:an|my) order|gusto ko(?:ng)?(?: po)?(?: ito| yan| bumili| mag ?order)?|kukunin ko|kunin ko|kunin na|bibili(?: ako| na)?|bili na|mag ?order (?:na|ako|po)|pa ?order|sige order|sige po order|deal)\b/i;
const BUY_AR = /(أطلب|اطلب|أبغى|ابغى|أبي|ابي|أريد|اريد|بطلب|ابغى اطلب)/;

const PRICE = /\b(how much|howmuch|magkano|mgkano|price|presyo|pricelist|price list|cost|hm po)\b/i;
const PRICE_AR = /(كم السعر|السعر|بكم|كم سعر|بكام|كم يكلف)/;

const SHIP = /\b(shipping|shipment|delivery|deliver|courier|ilang araw|ilang days|how long|how many days|kailan (?:dumating|darating|makukuha|matatanggap)|when (?:will|can) i (?:get|receive)|free (?:ship|shipping|delivery)|libre ba ang (?:ship|delivery)|cod ba|cash on delivery)\b/i;
const SHIP_AR = /(متى يصل|التوصيل|الشحن|كم يوم|الدفع عند الاستلام)/;

const WARRANTY = /\b(warranty|guarantee|guaranteed|refund|money back|return(?:able)?|palit(?:an)?|sauli|kung hindi effective|if it doesn'?t work)\b/i;
const WARRANTY_AR = /(ضمان|استرجاع|إرجاع|استبدال)/;

const HOWUSE = /\b(how (?:to|do i|should i) use|paano (?:gamitin|ito gamitin|gamiting)|pano gamitin|ilang beses|how many times a day|dosage|instructions|side effects|safe ba|pwede ba sa)\b/i;
const HOWUSE_AR = /(كيف استخدم|كيف أستخدم|طريقة الاستخدام|كم مرة)/;

const OBJ_PRICE = /\b(mahal|sobrang mahal|ang mahal|expensive|pricey|too much|masyadong mahal|discount|tawad|bawas|pwede pa bang|mura pa)\b/i;
const OBJ_PRICE_AR = /(غالي|غالية|خصم|تخفيض|أرخص|ارخص)/;

const OBJ_TRUST = /\b(peke|fake|scam|manloloko|panloloko|original ba|orig ba|totoo ba|legit(?: ba)?|sigurado ba|effective ba|gumagana ba|does it (?:really )?work|is it (?:real|original|genuine))\b/i;
const OBJ_TRUST_AR = /(حرامي|نصب|أصلي|اصلي|تقليد|صح؟)/;

const OBJ_WAIT = /\b(iisipin|isipin ko|pag ?isipan|next time|later na|mamaya na|sa susunod|wala pang budget|walang pera|sahod pa|pag sahod|balik ako|i'?ll think|think about it|maybe later)\b/i;
const OBJ_WAIT_AR = /(بفكر|أفكر|لاحقا|لاحقاً|بعدين)/;

const IMAGE = /\b(photo|photos|picture|pictures|pic|pics|larawan|litrato|pakita|ipakita|patingin|show me|see the (?:actual|real)|actual photo|real photo|sample)\b/i;
const IMAGE_AR = /(صور|صورة|أشوف|اشوف)/;

/** Quét MỘT tin khách → danh sách khoá tín hiệu. Thuần luật, không gọi model. */
export function scanSignals(text) {
  const s = String(text || '');
  const out = new Set();
  if (!s.trim()) return out;
  if (hasPhone(s)) out.add('phone');
  if (hasAddress(s)) out.add('address');
  if (hasName(s)) out.add('name');
  if (BUY.test(s) || BUY_AR.test(s)) out.add('buy');
  if (PRICE.test(s) || PRICE_AR.test(s)) out.add('price');
  if (SHIP.test(s) || SHIP_AR.test(s)) out.add('ship');
  if (WARRANTY.test(s) || WARRANTY_AR.test(s)) out.add('warranty');
  if (HOWUSE.test(s) || HOWUSE_AR.test(s)) out.add('howuse');
  if (OBJ_PRICE.test(s) || OBJ_PRICE_AR.test(s)) out.add('obj_price');
  if (OBJ_TRUST.test(s) || OBJ_TRUST_AR.test(s)) out.add('obj_trust');
  if (OBJ_WAIT.test(s) || OBJ_WAIT_AR.test(s)) out.add('obj_wait');
  if (IMAGE.test(s) || IMAGE_AR.test(s)) out.add('image');
  return out;
}

/** Tin cụt: ≤2 từ (sau khi bỏ emoji/dấu) — "ok", "hm", "sige po". */
export function isStubby(text) {
  const w = String(text || '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/).filter(Boolean);
  return w.length <= 2;
}

/**
 * Cộng điểm cho MỘT lượt khách. Hồ sơ điểm tích luỹ theo hội thoại (lưu bền ở conv-state).
 *
 * @param {string} text tin khách của lượt này (đã gộp cụm)
 * @param {{signals?:string[], penalty?:number, stubStreak?:number}} prev hồ sơ điểm trước đó
 * @param {{backFromCold?:boolean}} [opts]
 * @returns {{score:number, signals:string[], penalty:number, stubStreak:number, gained:string[]}}
 */
export function scoreTurn(text, prev = {}, opts = {}) {
  const have = new Set(prev.signals || []);
  const before = new Set(have);
  let penalty = Number(prev.penalty || 0);
  let stubStreak = Number(prev.stubStreak || 0);

  const found = scanSignals(text);
  for (const k of found) have.add(k);
  if (opts.backFromCold) have.add('back_from_cold');

  // Tin cụt KHÔNG mang tín hiệu, lặp lại ≥2 lượt liên tiếp → −1 (spec §M11).
  // Một lần thì thôi (khách đang gõ tiếp); hai lần liên tiếp mới là khách hờ hững.
  if (found.size === 0 && isStubby(text)) {
    stubStreak += 1;
    if (stubStreak >= 2) penalty -= 1;
  } else {
    stubStreak = 0;
  }

  const signals = [...have];
  const score = signals.reduce((n, k) => n + (SIGNAL_POINTS[k] || 0), 0) + penalty;
  return { score, signals, penalty, stubStreak, gained: signals.filter((k) => !before.has(k)) };
}

/**
 * Ngân sách lượt AI/24h theo độ nóng (spec §M11).
 * @param {{score?:number, signals?:string[]}} lead
 * @returns {{max:number, tier:string, base:number, bonus:number, priority:boolean}}
 */
export function turnBudget(lead = {}) {
  const sig = new Set(lead.signals || []);
  const score = Number(lead.score || 0);

  let base, tier, priority = false;
  if (sig.has('phone') && sig.has('address')) {
    base = 12; tier = 'SAT_DON'; priority = true;   // + ưu tiên hàng chờ sale
  } else if (score >= 6) {
    base = 10; tier = 'DANG_CHOT';
  } else if (score >= 3) {
    base = 6; tier = 'NONG';
  } else if (score >= AM_THRESHOLD) {
    base = 3; tier = 'AM';
  } else {
    base = 1; tier = 'LANH';                        // Fast Lane lo phần lớn nhóm này
  }

  const bonus = OBJECTION_SIGNALS.some((k) => sig.has(k)) ? OBJECTION_BONUS_TURNS : 0;
  return { max: Math.min(HARD_MAX_TURNS, base + bonus), tier, base, bonus, priority };
}

export const TIER_LABEL = {
  LANH: 'lạnh', AM: 'ấm', NONG: 'nóng', DANG_CHOT: 'đang chốt', SAT_DON: 'sát đơn',
};

/** Chấm lại cả hội thoại từ danh sách tin khách — dùng để chạy lại trên dữ liệu thật. */
export function scoreConversation(custTexts = []) {
  let lead = { signals: [], penalty: 0, stubStreak: 0, score: 0 };
  for (const t of custTexts) lead = scoreTurn(t, lead);
  return { ...lead, budget: turnBudget(lead) };
}
