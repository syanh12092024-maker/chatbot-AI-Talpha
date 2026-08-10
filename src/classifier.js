// PHÂN LOẠI TIN — BỘ LUẬT THUẦN, 0 TOKEN, 0 LẦN GỌI API.
// Spec: docs/v2/02-TANG-LUONG-CHAT.md § M08 · docs/v2/08-SONG-SONG.md §3 ③
//
// VÌ SAO BỎ LẦN GỌI MODEL Ở ĐÂY — đo trên Sổ AI production (4.072 lượt có số đo):
//   · 2,30 lần gọi API mỗi lượt trả lời, trong đó ĐÚNG MỘT lần là bộ phân loại này;
//   · mỗi vòng gọi thừa kéo theo ~1.276 token input không trúng cache;
//   · lượt chỉ gọi 1 lần có input 1.028 token, lượt gọi 3 lần có 4.050 — số lần gọi mới là
//     thứ quyết định hoá đơn, không phải độ dài ngữ cảnh.
// Bỏ vòng này cắt thẳng ~1 lần gọi/lượt và toàn bộ độ trễ của nó.
//
// VÀ NÓ CÒN LÀ MỘT ĐIỂM GÃY: khi API lỗi, fallback trả `intent:'interested', lang:'other'`
// cho MỌI tin — tức phân loại sai hàng loạt đúng lúc hệ thống đang yếu nhất.
// Luật thì không có trạng thái đó.
//
// GIỮ NGUYÊN CHỮ KÝ HÀM và shape trả về, nên `handler.js` không phải đổi một dòng nào.

import { detectLang } from './fast-lane.js';
import { cleanText } from './text.js';

// ─────────────────────────────────────────────────────────────────────────────
// KHIẾU NẠI — khoanh RẤT HẸP.
//
// Đây là cửa BÀN GIAO NGƯỜI THẬT: dán nhãn này là AI ngừng bán ngay lập tức. Trước
// 07/08/2026 cửa này từng chiếm ~45% việc đổ lên sale, phần lớn là oan. Hai nguồn khiếu nại
// thật đã có người lo trước khi tới đây:
//   · hàng lỗi / chưa nhận / sai món → M13 `post-sale.js` bắt bằng nội dung, chạy TRƯỚC cả Fast Lane;
//   · phản đối bán hàng (chê đắt, nghi hàng giả, xin nghĩ thêm) → M11 CỘNG ĐIỂM và cho thêm
//     3 lượt để chạy ladder, tuyệt đối không được coi là khiếu nại.
// Phần còn lại cho cửa này đúng một loại: khách ĐANG GIẬN và TỐ CÁO thẳng.
// ─────────────────────────────────────────────────────────────────────────────

// Tố cáo THẲNG (có chủ ngữ "các anh/kayo/niyo") — khác hẳn câu HỎI "peke ba to?".
// Ranh giới này là toàn bộ giá trị của module: "peke ba to?" là khách đang cân nhắc mua và
// phải được gỡ bằng ladder; "manloloko kayo" là khách đã mất niềm tin, cần người thật.
const ACCUSE = /\b(manloloko|niloko|nanloloko|panloloko|scammer|scammers|mga magnanakaw|thieves?|liars?|sinungaling)\b[^.!?]{0,20}\b(kayo|niyo|nyo|kau|you|kami|ang shop|ang store)\b|\b(kayo|niyo|nyo|you|your (?:shop|store|company))\b[^.!?]{0,25}\b(manloloko|niloko|nanloloko|scammer|scam(?:ming)?|fraud|liar|sinungaling|magnanakaw|thief|stealing|nagnakaw)\b|\bthis is (?:a )?(?:scam|fraud)\b|\byou (?:are|r) (?:a )?(?:scam|scammer|fraud|liar|thief)\b|\bang (?:baho|panget) ng service\b/i;
const ACCUSE_AR = /(حرامي|حرامية|نصابين|أنتم نصب|هذا نصب|كذابين)/;

// …nhưng chữ "scam" đặt trong CÂU HỎI thì vẫn là khách đang cân nhắc, chưa phải mất niềm tin.
// Ca thật: "Is December birthstone that is in your chart available? Or this is a SCAM?" — khách
// vừa hỏi còn hàng không, vừa nghi. Đó đúng là nhóm obj_trust của M11: cộng điểm, cho thêm 3 lượt
// chạy ladder (gửi ảnh chứng nhận + COD xem hàng rồi mới trả tiền), chứ không phải đẩy sang sale.
const ACCUSE_AS_QUESTION = /\b(or|is this|is it|are these|ba|kaya ba)\b[^.!?]{0,20}\b(scam|fraud|peke|manloloko|fake)\b|\b(scam|fraud|peke|manloloko|fake)\b[^.!?]{0,10}\?/i;

// Doạ kiện / báo cáo / bêu lên mạng — luôn cần người thật, không để AI xoay.
const THREAT = /\b(i'?ll (?:report|sue|post)|i will (?:report|sue|post)|report (?:you|this) to|sue you|legal action|kasuhan|isusumbong|ireport ko|police|pulis|dti|consumer (?:court|protection)|magpapost ako|post ko sa|expose (?:you|this))\b/i;
const THREAT_AR = /(سأبلغ|سأشتكي|شكوى رسمية|المحكمة|الشرطة)/;

// KHÁCH BẢO ĐỪNG NHẮN NỮA. Đây là nhóm riêng, không gộp với khiếu nại: nhắn thêm dù chỉ một
// câu giữ chỗ cũng là nhắn thêm đúng thứ khách vừa bảo dừng — và đó là đường ngắn nhất tới
// nút Block/Report, thứ làm hỏng cả page chứ không chỉ hỏng một đơn.
// Ca thật: "Hey what youre doing you are harassing me and telling to reply and evryday youre
// sending msg…" — v1 vẫn bán tiếp.
const STOP_CONTACT = /\b(harass(?:ing|ment)?|stop (?:messaging|sending|texting|contacting)|don'?t message me|do ?n'?t contact me|leave me alone|huwag na (?:kayong|ninyong|kayo|niyo)|tigilan (?:niyo|nyo) (?:na )?ako|wag na kayo|iblock ko kayo|i'?ll block you|unsubscribe|remove me)\b/i;
const STOP_CONTACT_AR = /(لا ترسل|توقف عن الإرسال|اتركني)/;

// Chửi tục — bắt vừa đủ, không cần đầy đủ từ điển.
const PROFANITY = /\b(putangina|putang ina|tangina|tang ina|gago|gaga|bwiset|bwisit|ulol|punyeta|leche ka|hayop ka|fuck(?:ing)?|fck|shit|bullshit|bastard|asshole|damn you|wtf)\b/i;
const PROFANITY_AR = /(كلب|حقير|لعنة)/;

// ─────────────────────────────────────────────────────────────────────────────
// SPAM — tin không phải của khách thật. Ngưỡng đặt cao vì im nhầm là mất đơn.
// ─────────────────────────────────────────────────────────────────────────────
const SPAM = /\b(subscribe to my|follow me on|check out my (?:page|channel|shop)|click here to (?:win|earn)|earn \$?\d+ (?:a|per) day|work from home opportunity|crypto (?:invest|trading)|forex|casino|betting site|loan offer|sex|porn|xxx|viagra)\b|(https?:\/\/\S+){3,}/i;

// ─────────────────────────────────────────────────────────────────────────────
// Ý ĐỊNH BÁN HÀNG — chỉ để giữ đúng shape cũ; không cửa nào của handler dùng tới
// 'interested' vs 'question', nên phân biệt ở mức thô là đủ.
// ─────────────────────────────────────────────────────────────────────────────
const QUESTION = /\?|\b(magkano|how much|paano|pano|ilan|ilang|kailan|saan|ano|may|meron|pwede|puede|can i|do you|is it|are you|what|when|where|how)\b|؟|(كم|كيف|متى|أين|هل)/i;
const INTEREST = /\b(order|bili|bibili|kunin|kukunin|gusto ko|i want|i'?ll take|sige|deal|pa ?order|interested|sama ako)\b|(أطلب|اطلب|أبغى|ابغى|أريد)/i;

const hit = (s, re, reAr) => re.test(s) || (reAr ? reAr.test(s) : false);

/**
 * Phân loại tin khách bằng LUẬT. Giữ nguyên chữ ký và shape trả về của bản gọi model
 * (`handler.js` chỉ đọc `.intent`, `.is_spam_conf`, `.lang`).
 *
 * Hàm vẫn là `async` để mọi nơi đang `await classify(...)` không phải sửa.
 *
 * @param {string} message tin khách (đã gộp cụm)
 * @param {string} [productName] giữ lại cho tương thích — luật không cần tới
 * @returns {Promise<{intent:string, lang:string, lead_quality:number, urgency:number, is_spam_conf:number}>}
 */
export async function classify(message, productName = 'sản phẩm') { // eslint-disable-line no-unused-vars
  const s = cleanText(message).trim();
  const l = detectLang(s);
  const lang = l === 'ar' ? 'other' : l;   // holdingMessage() chỉ có khung tl/en, còn lại dùng bản song ngữ

  if (!s) return { intent: 'question', lang, lead_quality: 5, urgency: 5, is_spam_conf: 0 };

  if (SPAM.test(s)) {
    return { intent: 'spam', lang, lead_quality: 0, urgency: 0, is_spam_conf: 0.9 };
  }

  // Giận dữ / tố cáo / doạ kiện → người thật. KHÔNG gồm phản đối bán hàng thông thường.
  // Khách đòi ngừng liên lạc: vẫn là 'complaint' để sale nhìn thấy, nhưng kèm cờ `stop_contact`
  // để handler bàn giao TRONG IM LẶNG — xem cửa xử lý ở handler.js.
  if (hit(s, STOP_CONTACT, STOP_CONTACT_AR)) {
    return { intent: 'complaint', lang, lead_quality: 0, urgency: 9, is_spam_conf: 0, stop_contact: true };
  }

  const accused = hit(s, ACCUSE, ACCUSE_AR) && !ACCUSE_AS_QUESTION.test(s);
  if (accused || hit(s, THREAT, THREAT_AR) || hit(s, PROFANITY, PROFANITY_AR)) {
    return { intent: 'complaint', lang, lead_quality: 3, urgency: 9, is_spam_conf: 0 };
  }

  if (INTEREST.test(s)) return { intent: 'interested', lang, lead_quality: 7, urgency: 6, is_spam_conf: 0 };
  if (QUESTION.test(s)) return { intent: 'question', lang, lead_quality: 5, urgency: 5, is_spam_conf: 0 };
  return { intent: 'interested', lang, lead_quality: 5, urgency: 5, is_spam_conf: 0 };
}
