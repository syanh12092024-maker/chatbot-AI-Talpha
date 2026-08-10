// M08 · PHÂN LOẠI TIN — BỘ LUẬT THUẦN, KHÔNG GỌI LLM.
// Spec: docs/v2/02-TANG-LUONG-CHAT.md § M08 · docs/v2/prompts/L4-PROMPT.md ①
//
// Vì sao bỏ LLM ở đây (đo 11/08/2026):
//   • calls/lượt = 2,28 — mỗi tin tốn 2 lần gọi model, mà classifier trả 5 trường thì
//     chỉ `intent` (+ `lang` cho câu giữ chân) được dùng.
//   • Nó là ĐIỂM GÃY: API chập chờn → fallback `interested`/`other` hàng loạt (đợt 08/08
//     API 429). Mất phân loại tức là mất luôn cửa nhận diện khiếu nại.
// Luật thuần thì rẻ (0 token), tất định, và KHÔNG BAO GIỜ gãy khi API lỗi.
//
// ⚠️ GIỮ NGUYÊN CHỮ KÝ + SHAPE TRẢ VỀ (`{intent, lang, lead_quality, urgency, is_spam_conf}`)
// để `handler.js` (file của Luồng 2) không phải đổi một dòng nào. Xem 08-SONG-SONG.md §3 mẹo ③.
// Khác duy nhất: KHÔNG còn `__usage` — không tốn token thì không có gì để cộng.
//
// ĐỘ TINH TẾ ĐÃ MẤT ĐƯỢC BÙ Ở ĐÂU: closer vẫn có tool `handoff_human` và khối CORE vẫn
// dạy nó tự nhận ra khiếu nại thật. Luật ở đây chỉ bắt những ca RÕ RÀNG; ca mơ hồ để LLM lo.

import { detectLang } from './fast-lane.js';
import { cleanText } from './text.js';

// ─────────────────────────────────────────────────────────────────────────────
// Mẫu nhận dạng
// ─────────────────────────────────────────────────────────────────────────────

// Tin có DẤU HỎI / dạng câu hỏi. Đây là cái van an toàn quan trọng nhất của cả file:
// "peke ba ito?" là khách NGHI NGỜ CHẤT LƯỢNG (việc của người bán), còn "peke ang product
// niyo" mới là TỐ CÁO. Trước 07/08/2026 bộ phân loại cũ không phân biệt được nên
// "effective ba talaga" bị gán spam → khách bị im lặng. Không lặp lại lỗi đó.
const QUESTIONY = /[?？؟]|^\s*(is|are|was|were|do|does|did|can|could|will|would|how|what|why|which|when|where|really|talaga)\b|\b(ba|kaya|po ba|totoo)\b|\bهل\b|\bكيف\b|\bليش\b|\bوش\b/i;

// Tố cáo lừa đảo / hàng giả. CHỈ tính là tố cáo khi tin KHÔNG ở dạng câu hỏi (xem QUESTIONY).
const FRAUD = /\b(scam+(?:er|mer|mers|ers)?|fraud|swindler|bogus|peke|pekeng|manloloko|mandaraya|magnanakaw|niloko|nilokoloko|panloloko)\b|حرام[يى]|نصاب|احتيال|مخادع/i;

// Chửi bới / lăng mạ. Đây là "chửi bới" trong định nghĩa complaint cũ.
const ABUSE = /\b(f+u+c+k+\w*|fck|wtf|shit+|bullshit|asshole|bastard|moron|gago|gagu|gaga|tanga|tangina|tangna|putangina|putang ina|ulol|punyeta|leche|bwisit|hinayupak|walanghiya|walang hiya|kupal|hayop ka|hayup ka|bobo)\b|كلب|حقير|قذر|تفو/i;

// Doạ tố cáo / kiện / bêu lên mạng.
const THREATEN = /\b(i(?:'?ll| will| am going to| am gonna)? ?(?:report|sue)\b|report (?:you|this page|this shop)|ireport|i-?report|isusumbong|susumbong|reklamo ko|magrereklamo|take you to social media|post (?:you )?in (?:the )?group|legal action|kiện)\b|أبلغ عنكم|رح أشتكي|سأبلغ/i;

// KHÁCH ĐÃ MUA MÀ CÓ VẤN ĐỀ. Cố ý viết bằng những cụm KHÔNG THỂ nhầm với phản đối bán hàng:
// mỗi mẫu đều buộc phải có ngữ cảnh ĐƠN/HÀNG ĐÃ GỬI. (vd KHÔNG dùng "wala pa" trần vì
// nó nằm trong "wala pang budget" — chưa có tiền, đó là phản đối giá chứ không phải khiếu nại.)
const POST_PURCHASE = /\b(refund|money ?back|chargeback|ibalik (?:n(?:i?y|in)o |mo |na )?(?:ang|yung|ung) (?:pera|bayad|perang)|return (?:the |my |this )?(?:item|order|product|parcel|package)|isauli|ipapalit|papalitan|palitan (?:ang|yung|ung|ko)|damaged|defective|depekto|sirang? (?:item|produkto|product|order|padala)|basag (?:ang|yung|ung)|wrong (?:item|order|product|size)|mali (?:ang|yung|ung) (?:item|padala|order|produkto|product|size)|hindi pa (?:dumating|darating|nakukuha|nakuha|natatanggap|natanggap|na-?deliver)|not (?:yet )?(?:received|delivered|arrived)|never (?:received|arrived)|where(?:'?s| is) my (?:order|parcel|package|item|delivery)|nasaan (?:na )?(?:ang|yung|ung) (?:order|padala|parcel|package|item|delivery)|na-?overcharge|overcharged|sobra (?:ang|yung|ung) (?:singil|bayad)|nadoble (?:ang|yung|ung) (?:bayad|singil|order))\b|طلبي (?:ما|لم) (?:وصل|يصل)|وين طلبي|استرجاع|استرداد|المنتج (?:مكسور|تالف|خربان)/i;

// LINK RÁC / quảng cáo chen vào inbox — đây mới là "spam" đúng nghĩa (rác, không phải khách).
// Link tới chính sản phẩm/page thì KHÔNG tính; chỉ bắt các miền rút gọn & kênh dụ dỗ quen thuộc.
const JUNK_LINK = /\b(?:bit\.ly|tinyurl|cutt\.ly|t\.me|telegram\.me|wa\.me|chat\.whatsapp\.com|onlyfans|porn\w*|xxx|casino|betting|1xbet|binance|forex|crypto ?(?:invest|signal)|loan offer|payday loan)\b|\bhttps?:\/\/\S+\s+(?:add me|follow me|join now)/i;
const JUNK_PITCH = /\b(?:add me on|follow me on|join (?:my|our) (?:group|channel|telegram)|earn \$?\d+ (?:a |per )?day|make money (?:fast|online)|investment opportunity|work from home earn)\b/i;

// Tín hiệu quan tâm mua (chỉ dùng để cho `lead_quality` một con số có nghĩa).
const BUY_SIGNAL = /\b(order|bili|bibili|kukunin|kunin|gusto ko|i want|i'?ll take|paorder|pa ?order|cod|address|deliver)\b|أطلب|أريد|توصيل/i;
const HAS_PHONE = /\+?\d[\d\s().-]{6,16}\d/;

// ─────────────────────────────────────────────────────────────────────────────

// Chuẩn hoá `lang` về đúng enum cũ (`tl` | `en` | `other`). detectLang() trả thêm 'ar',
// và handler.js dùng giá trị này để chọn câu giữ chân — 'other' cho ra câu song ngữ, đúng ý.
function toClsLang(text) {
  const l = detectLang(text);
  return l === 'tl' || l === 'en' ? l : 'other';
}

/**
 * Phân loại 1 tin của khách bằng LUẬT (0 token, tất định).
 * Chữ ký + shape giữ y hệt bản gọi LLM cũ để handler.js không phải đổi.
 *
 * @param {string} message      Tin khách (thô, có thể chứa thẻ HTML / nửa emoji)
 * @param {string} productName  Giữ lại cho tương thích chữ ký — luật không cần tới
 * @returns {Promise<{intent:'interested'|'question'|'complaint'|'spam', lang:'tl'|'en'|'other',
 *                    lead_quality:number, urgency:number, is_spam_conf:number}>}
 */
export async function classify(message, productName = 'sản phẩm') { // eslint-disable-line no-unused-vars
  // cleanText bóc thẻ HTML (`<div></div>` = sticker/ảnh, 8,9% tin của khách) và nửa emoji.
  const msg = cleanText(message).trim();
  const lang = toClsLang(message);

  // Tin rỗng sau khi dọn = sticker/ảnh. Không có chữ thì không kết tội được ai.
  if (!msg) return { intent: 'question', lang, lead_quality: 5, urgency: 5, is_spam_conf: 0 };

  const isQuestion = QUESTIONY.test(msg);

  // ── SPAM ────────────────────────────────────────────────────────────────────
  // ⚠️ Cửa này ở handler.js là IM LẶNG HOÀN TOÀN, không bàn giao, không để lại vết
  // (`archived: true`). Im nhầm một khách = mất đơn và không ai biết. Nên spam được
  // khoanh CỰC HẸP: chỉ rác thật (link rút gọn, mời gọi kiếm tiền/kênh khác) — KHÔNG
  // gồm khách đang giận. Khách chửi bới/tố lừa đảo đi đường `complaint` để còn có
  // người thật vào xử lý (nguyên tắc 13: kết thúc là phải bàn giao).
  if (JUNK_LINK.test(msg) || JUNK_PITCH.test(msg)) {
    return { intent: 'spam', lang, lead_quality: 0, urgency: 0, is_spam_conf: 0.95 };
  }

  // ── COMPLAINT — ĐỊNH NGHĨA RẤT HẸP (giữ nguyên tinh thần bản 07/08/2026) ─────
  // `complaint` là cửa BÀN GIAO ở handler.js — dán nhãn này là AI ngừng bán NGAY,
  // trước khi LLM kịp chạy. Chỉ đúng 3 trường hợp:
  //   (a) khách ĐÃ MUA mà có vấn đề,  (b) chửi bới,  (c) tố lừa đảo / doạ kiện.
  // TUYỆT ĐỐI KHÔNG gán cho phản đối bán hàng thông thường ("ang mahal", "iisipin ko
  // muna", "wala pang budget", "effective ba talaga") — đó là việc của người bán.
  if (POST_PURCHASE.test(msg)) {
    return { intent: 'complaint', lang, lead_quality: 3, urgency: 9, is_spam_conf: 0 };
  }
  if (ABUSE.test(msg) || THREATEN.test(msg)) {
    return { intent: 'complaint', lang, lead_quality: 1, urgency: 10, is_spam_conf: 0 };
  }
  // Tố lừa đảo — chỉ khi KHÔNG phải câu hỏi. "peke ba ito?" / "scam ba to?" là khách
  // NGHI NGỜ, phải để AI gỡ bằng ảnh feedback/chứng nhận (ladder bước 1, nguyên tắc 14).
  if (FRAUD.test(msg) && !isQuestion) {
    return { intent: 'complaint', lang, lead_quality: 1, urgency: 10, is_spam_conf: 0 };
  }

  // ── CÒN LẠI → interested / question ────────────────────────────────────────
  // Không phải nhãn chặn nên phân biệt hai cái này gần như không đổi hành vi
  // (handler.js chỉ chặn ở `spam`/`complaint`); giữ để shape có nghĩa.
  const buying = BUY_SIGNAL.test(msg) || HAS_PHONE.test(msg);
  const intent = buying || !isQuestion ? 'interested' : 'question';
  const lead_quality = HAS_PHONE.test(msg) ? 9 : buying ? 7 : 5;
  return { intent, lang, lead_quality, urgency: buying ? 7 : 5, is_spam_conf: 0 };
}
