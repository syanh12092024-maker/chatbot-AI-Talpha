import { templateSafety } from './template-safety.js';
// LỚP TỪ KHOÁ v3 — hai luật Botcake chưa phủ + vá lỗ `paano mag order` (phiếu L2-M2).
//
// Đứng TRƯỚC fastLane/classify trong handler-v3.js (đề bài ①: "lớp này đứng TRƯỚC
// classify/fastLane trong handler"). Cùng vai trò Botcake cũ đang làm ("bắt từ khoá,
// trả câu mẫu, 0 token") cho đúng HAI luật mà lớp 0 đồng hiện có (fast-lane.js) CHƯA
// phủ — đo trên 10 page thật 22/08 (docs/v3/01-QUYET-DINH.md §2): "Nhận diện thật/giả"
// và "Hỏi size" đều 0/10. Cộng thêm một lỗ đã biết của lớp cũ (§12 cùng tài liệu):
// `paano mag order` (viết TÁCH CHỮ, cách viết phổ biến tiếng Philippines) không khớp
// regex `ASK_HOWTO` của fast-lane.js — đo lại bằng node trước khi vá, xem nhật ký phiếu.
//
// ⛔ src/fast-lane.js CẤM SỬA (luật 4 §0a sổ điều hành + phiếu ②). Module này CHỈ ĐỌC
// nó (import `detectLang` — hàm thuần, không side-effect) — không đụng một dòng ở đó.
//
// NGUYÊN TẮC "KHÔNG BỊA" (đề bài ①): hai luật THẬT/GIẢ và HỎI SIZE chỉ trả lời khi
// trang có dữ liệu thật trong KB — `kb.config.fastLaneAuth` / `kb.config.fastLaneSize`,
// quy ước MỚI cùng khuôn `fastLanePrice/fastLaneShip/fastLaneHowto` đã có sẵn trong
// kb.js (SCRIPT_FIELDS). KHÔNG có dữ liệu ⇒ NHƯỜNG bộ não — trả `handled:false`, đúng
// nghĩa "không đụng gì" để fastLane/classify chạy tiếp y như trước khi có lớp này
// (nghiệm thu ④#3/#4). ⚠️ Nợ đã biết: `kb.js#cleanConfig` chỉ giữ đúng 6 cột trong
// SCRIPT_FIELDS khi ghi qua dashboard, nên `fastLaneAuth`/`fastLaneSize` hôm nay chỉ
// sống được nếu ai đó sửa THẲNG `kb-overrides.json` (bypass dashboard) — sửa `kb.js`
// để dashboard nhận 2 cột mới nằm NGOÀI pathspec ③ của phiếu này, đã ghi §9 sổ điều hành.
//
// Luật `paano` KHÁC hai luật trên: nó vá một lỗ của một câu trả lời ĐÃ AN TOÀN từ
// trước (đúng khung "cách đặt hàng" mà fastLane dùng khi bắt được `how to order`), nên
// khi trang không có `fastLaneHowto` riêng, lớp này dùng chung khung mặc định 3 ngôn
// ngữ — chép tay từ `FRAME[lang].howto` của fast-lane.js (hằng số private, không export
// được). Đây KHÔNG phải "bịa": nó là đúng nội dung fastLane đã dùng an toàn từ trước,
// chỉ là bắt thêm được biến thể mà regex gốc bỏ sót. Nợ nhỏ: hai bản chữ có thể trôi
// nếu ai sửa `FRAME.howto` mà quên sửa ở đây — ghi §9 sổ điều hành.
import { detectLang } from "../fast-lane.js";
import { cleanText } from "../text.js";

/** Tên lane ghi vào `so_ai.lane` — MỘT literal duy nhất cho cả 3 luật (đề bài ①#4). */
export const LANE = "tu_khoa_v3";

const norm = (s) =>
  cleanText(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

// An toàn trước hết (giống hệt lý do HAS_PHONE đứng đầu fastLane() ở fast-lane.js):
// khách vừa cho SĐT là đang giữa một lượt chốt đơn — một câu trả lời mẫu, dù đúng chủ
// đề, chen ngang lúc này có thể làm lạc lượt. Không import được (hằng private) nên
// chép lại nguyên regex — cùng lý do đã ghi ở khối đầu file.
const HAS_PHONE = /\+?\d[\d\s().-]{6,16}\d/;

// Tin dài thì luôn có ngữ cảnh riêng → để AI. Giữ ĐÚNG trần của fast-lane.js (12 từ),
// không bịa một con số khác cho "gần giống một luật".
const WORD_CAP = 12;

// ── Luật 1 · THẬT/GIẢ (01-QUYET-DINH.md §2, dòng "Nhận diện thật/giả" — đo 0/10) ────
// EN: is it real/fake/genuine/authentic/original · legit · "not fake"
// PH:  orig/original/totoo/peke/tunay/authentic/legit/genuine + "ba" (đệm "po" tuỳ chọn)
// AR: اصلي/أصلي (chính hãng) · تقليد/مقلد (hàng nhái) · حقيقي (thật)
const AUTH_Q =
  /\bis (?:it|this|that) (?:real|fake|genuine|authentic|original)\b|\bare (?:they|these|those) (?:real|fake|genuine|authentic|original)\b|\bis it legit\b|\bis this legit\b|\bnot (?:a )?fake\b|\borig(?:inal)?(?: po)? ba\b|\btotoo(?: po)? ba\b|\bpeke(?: po)? ba\b|\bhindi(?: po)? peke\b|\btunay(?: po)? ba\b|\bauthentic(?: po)? ba\b|\blegit(?: po)? ba\b|\bgenuine(?: po)? ba\b|اصلي|أصلي|تقليد|مقلد|حقيقي/i;

// ── Luật 2 · HỎI SIZE (01-QUYET-DINH.md §2, dòng "Hỏi size" — đo 0/10) ──────────────
// EN: size/sizes/sizing · PH: "sukat" (mượn "size" tiếng Anh đã nằm trong nhánh EN) ·
// AR: مقاس/مقاسات (kích cỡ) · قياس (đo/kích thước)
const SIZE_Q = /\bsizes?\b|\bsizing\b|\bsukat\b|مقاس|مقاسات|قياس/i;

// ── Vá `paano mag order` (01-QUYET-DINH.md §12) ─────────────────────────────────────
// ASK_HOWTO gốc của fast-lane.js: `paano (?:mag)?(?:order|umorder|bumili)` — "mag" phải
// nối LIỀN động từ (0 ký tự ở giữa) hoặc vắng mặt. Cách viết TÁCH CHỮ phổ biến tiếng
// Philippines ("mag order" hai từ, "mag-order" gạch nối, có thể chen "po"/"ba" trước
// "mag") không khớp — đo lại bằng node, dán bằng chứng ở nhật ký phiếu (6/6 biến thể
// NOMATCH ở regex gốc, MATCH ở đây; 9/9 biến thể ĐÃ khớp trước đó vẫn NOMATCH ở regex
// này — không giẫm lên phần fast-lane.js đang làm đúng).
const PAANO_GAP =
  /\b(?:pa?ano)\b(?:\s+(?:po|ba))?\s+mag[\s-]+(?:order|umorder|bumili)\b/i;

// Chép tay từ `FRAME[lang].howto` của fast-lane.js (xem khối đầu file — vì sao đây
// không phải "bịa"). Dùng khi trang chưa tự viết `kb.config.fastLaneHowto`.
const HOWTO_FALLBACK = {
  tl: "Sobrang dali lang po! 😊 I-send niyo lang:\nPangalan · Number · Address\nCOD po — bayad pagdating ng order. Simulan na po natin? 🚚",
  en: "It's very easy po! 😊 Just send:\nName · Contact number · Address\nCOD po — you pay when it arrives. Shall we start? 🚚",
  ar: "سهلة جداً! 😊 أرسل لنا:\nالاسم · رقم الجوال · العنوان\nالدفع عند الاستلام. نبدأ؟ 🚚",
};

/* ═══ NỚI BA Ý YẾU + BA CỬA NHƯỜNG (21/09) ═════════════════════════════════════════
 *
 * Đo trên 146 tin khách thật của page 1220547807799752, chấm bằng bộ chuẩn dán nhãn tay
 * (`ops/bin/do-dinh-tuyen.mjs`): lớp 0 đồng phủ **17,8%**, và bắn RẤT chính xác khi bắn
 * (92,3% đúng, 0 ca nguy hiểm). Nhưng ba ý gần như trượt sạch:
 *
 *     ship       3/29   10,3%      dat_hang   0/12   0%      hang_that  0/2   0%
 *
 * Thử nới từ khoá KHÔNG kèm cửa nhường: phủ lên 57,5% — và đẻ ra **12 ca bắn nhầm
 * nguy hiểm**. Chúng giống nhau đến mức thành quy luật:
 *
 *     "Walapa tumawag saakin hihintay ko nga ang twg"   → bắn mẫu SHIP
 *     "sabimo darating ang delivery pero Hindi pa dumating" → bắn mẫu SHIP
 *
 * Người đang bức xúc vì CHƯA nhận được hàng, nhận lại câu «đơn của bạn được giao miễn
 * phí, mất 2-5 ngày». Tệ hơn hẳn việc im và để AI/người vào.
 *
 * Lý do gốc: bốn lớp `khieu_nai` · `cho_thong_tin` · `chot` · `hen_sau` DÙNG CHUNG TỪ
 * VỰNG với các ý có mẫu (delivery, order, waiting, riyal) nhưng đòi hành động NGƯỢC LẠI.
 * Từ khoá không phân biệt được — nên cách duy nhất an toàn là NHẬN DIỆN CHÚNG TRƯỚC và
 * nhường, rồi mới cho các luật nới chạy trên phần còn lại.
 *
 * ⚠️ Bốn cửa dưới đây chỉ NHƯỜNG, không bao giờ trả lời. Sai một cửa ⇒ mất một lượt
 *    0 đồng (tốn ~110đ), KHÔNG phải gửi nhầm cho khách. Lệch đúng chiều được phép lệch.
 */

/** ① KHIẾU NẠI — phủ định + giao hàng, hoặc đòi huỷ/hoàn/sai hàng. */
const KHIEU_NAI =
  /\b(wala\s*pa|walapa|hindi\s+pa|di\s+pa|hindi\s+dumating|walang\s+tumawag|no\s*body|nobody|no\s+one|not\s+yet|still\s+(?:not|no)\b|haven'?t\s+(?:received|got|gotten)|hasn'?t\s+(?:arrived|come)|never\s+(?:arrived|came)|waiting\s+(?:too|to)\s+long|too\s+long|cancel(?:led|led)?|refund|wrong\s+(?:item|product|address))\b/i;

/** ② KHÁCH ĐANG CHO THÔNG TIN — link bản đồ. (SĐT đã có `HAS_PHONE` chặn ở trên.) */
const CHO_VI_TRI = /maps\.app\.goo\.gl|google\.[a-z.]+\/maps|goo\.gl\/maps/i;

/** ③ CHỐT GÓI — nêu con số tiền hoặc tên gói. Phải vào luồng đơn, không bắn mẫu. */
const CHOT_GOI =
  /\b(?:buy\s*\d|\d\s*x\s*\d|get\s*\d\s*free|\d+\s*(?:sar|sr|riyal)\b|combo\s*\d)/i;

/** ④ HẸN SAU — chờ lương, tháng sau. Đây là lúc phải GỠ phản đối, không phải báo giá. */
const HEN_SAU =
  /\b(?:next\s+month|sa\s+\w+\s+\d|salary|sahod|sweldo|payday|maybe\s+(?:next|later)|next\s+time)\b/i;

/* ═══ KHÔNG CƯỚP VIỆC CỦA FAST-LANE ════════════════════════════════════════════════
 *
 * Lớp này chạy TRƯỚC fast-lane. Nếu nó bắt luôn những câu fast-lane vốn bắt đúng thì
 * `so_ai.lane` ghi `tu_khoa_v3` thay cho `tpl_price`/`tpl_ship`/`tpl_howto` — và mọi
 * phép so «lớp nào chặn bao nhiêu» từ trước tới nay hết đối chiếu được. Hai ca kiểm
 * của `l2-m2` khoá đúng điều đó lại.
 *
 * Nên tính BỔ SUNG phải là CẤU TRÚC, không phải khéo tay chỉnh regex cho khỏi đè: mọi
 * luật MỚI dưới đây chỉ chạy khi `DA_CO_O_FASTLANE` KHÔNG khớp.
 *
 * ⛔ Ba regex dưới đây CHÉP NGUYÊN VĂN từ `fast-lane.js` (hằng private, không export
 *    được — cùng lý do và cùng cách đã làm với `HAS_PHONE` ở trên). Sửa bên đó mà quên
 *    bên này thì lớp này bắt đè, và hai ca kiểm `l2-m2` sẽ đỏ — đó là lưới an toàn.
 */
const DA_CO_O_FASTLANE = new RegExp([
  // ASK_PRICE
  "(how much|howmuch|magkano|mgkano|price|presyo|cost|pricelist|price list|bahin sa presyo|كم السعر|السعر|بكم|كم سعر|بكام)",
  // ASK_SHIP
  "(shipping|delivery|deliver|ilang araw|ilang days|how long|how many days|kailan (?:dumating|darating|makukuha)|when (?:will|can) i (?:get|receive)|free (?:ship|delivery)|libre ba ang (?:ship|delivery)|متى يصل|التوصيل|الشحن)",
  // ASK_HOWTO
  "(how to order|how do i order|how can i order|paano (?:mag)?(?:order|umorder|bumili)|pano (?:mag)?order|pa ?order|kaano|كيف أطلب|كيفية الطلب|طريقة الطلب)",
].join("|"), "i");

/** Hỏi/hẹn GIAO HÀNG — nới từ `ASK_SHIP` của fast-lane bằng từ vựng lịch hẹn. */
const SHIP_Q =
  /\b(?:when|what\s+time|anong\s+oras|how\s+long|how\s+many\s+days|kailan|kelan|ilang\s+araw|ilang\s+days|deliver(?:y|ed|ing)?|shipping|courier|parcel|arrive|arriving|dumating|darating|hintay|naghihintay)\b/i;
const LICH_GIAO =
  /\b(?:available|next\s+week|this\s+week|tomorrow|today|taday|monday|tuesday|wednesday|thursday|friday|saturday|sunday|bukas|ngayon|mamaya)\b/i;

/** MUỐN ĐẶT — nới `ASK_HOWTO`, gồm cả câu khẳng định "i want to order". */
const DAT_HANG =
  /\b(?:i\s+(?:want|need|will|would\s+like|can)\s+(?:to\s+)?order|place\s+an?\s+order|mag[\s-]?order|umorder|pa[\s-]?order|maka[\s-]?order|order\s+po|i\s+order\b|try\s+ko|gusto\s+ko)\b/i;

/** ⑤ HỎI VỀ KHUYẾN MÃI (bao giờ hết promo) — KHÔNG phải hỏi giao hàng, dù có "kailan". */
const HOI_PROMO = /\bpromo\b|\bpromotion\b|\bdiscount\b/i;

/** ⑥ ĐÃ NHẬN ĐƯỢC HÀNG — bắn "hàng tới trong 2-5 ngày" vào đây là nói chuyện quá khứ. */
const DA_NHAN =
  /\bna\s+deliver|\bdelivered\s+na\b|\bnatanggap\s+na\b|\bnakuha\s+ko\b|\bi\s+recieved?\b|\bi\s+got\s+it\b/i;

/** HỎI GIÁ, BIẾN THỂ SAI CHÍNH TẢ mà `ASK_PRICE` của fast-lane bỏ sót.
 *  Đo 17/09: "mabkanonpo ma'am?" và "parice" đều NOMATCH ở regex gốc ⇒ mỗi tin một lượt
 *  gọi closer (~110đ) cho một câu hỏi đã có sẵn mẫu.
 *  ⛔ Cố ý KHÔNG khớp chính tả ĐÚNG (`magkano`, `how much`…): fast-lane đã bắt chúng, và
 *     để hai nơi cùng bắt một chữ là hai nơi cùng ghi `so_ai.lane` — số liệu hết so được. */
const GIA_SAI = /\b(?!magkano\b)m[ab][bgk]kano|\bmgkano\b|\bpar?ice\b|\bpriice\b/i;

/** THẬT/GIẢ — thêm biến thể Taglish "true ba / true b yan" mà `AUTH_Q` bỏ sót. */
const AUTH_THEM = /\btrue\s*b(?:a)?\b|\bscam\b|\bfake\s+ba\b/i;

/**
 * Bậc từ khoá v3 — chạy TRƯỚC fastLane/classify (đề bài ①). Hàm THUẦN: không đọc DB,
 * không ghi gì — handler-v3.js lo ghi `so_ai`/`hoi_thoai` khi `handled:true`.
 *
 * @param {object} a
 *   @param {string} a.text  tin khách (chưa qua cleanText — hàm tự dọn)
 *   @param {object} a.kb    KB của page (từ `getKBForPage`)
 * @returns {{handled:boolean, reply:string|null, rule:string|null, lyDo:string}}
 *   handled=false ⇒ KHÔNG đụng gì — pipeline chạy tiếp y như chưa có lớp này. `rule`
 *   vẫn được điền khi khớp từ khoá nhưng thiếu KB (NHƯỜNG có chủ đích), để nhật ký/test
 *   phân biệt được "không khớp luật nào" với "khớp luật nhưng trang chưa có dữ liệu".
 */
export function lopTuKhoa({ text, kb, profile = {} }) {
  const raw = String(text || "");
  const s = norm(raw);
  const nhuong = (rule, lyDo) => ({ handled: false, reply: null, rule, lyDo });

  const safety = templateSafety(raw, profile);
  if (!safety.safe) return nhuong(null, safety.reason);

  if (!s)
    return nhuong(null, "tin rỗng/sticker — nhường lớp im lặng của fastLane");
  if (HAS_PHONE.test(raw)) {
    return nhuong(
      null,
      "có số điện thoại — khách đang giữa lượt chốt đơn, nhường AI",
    );
  }
  const words = s.split(" ").filter(Boolean).length;
  if (words > WORD_CAP)
    return nhuong(null, `tin dài >${WORD_CAP} từ — nhường AI`);

  // ── BỐN CỬA NHƯỜNG — chạy TRƯỚC mọi luật trả lời (xem khối chú thích ở trên) ──
  if (KHIEU_NAI.test(raw))
    return nhuong(null, "có dấu hiệu KHIẾU NẠI (chưa nhận hàng/đòi huỷ) — nhường người thật");
  if (CHO_VI_TRI.test(raw))
    return nhuong(null, "khách gửi vị trí — đang giữa lượt chốt đơn, nhường AI");
  if (CHOT_GOI.test(raw))
    return nhuong(null, "khách nêu gói/số tiền — vào luồng đơn, không bắn mẫu");
  if (HEN_SAU.test(raw))
    return nhuong(null, "khách hẹn sau (chờ lương/tháng sau) — cần AI gỡ phản đối");
  if (HOI_PROMO.test(raw))
    return nhuong(null, "hỏi về khuyến mãi (hạn promo) — không có mẫu, nhường AI");
  if (DA_NHAN.test(raw))
    return nhuong(null, "khách nói ĐÃ nhận hàng — mẫu giao hàng nói chuyện quá khứ, nhường AI");

  if (AUTH_Q.test(raw) || AUTH_THEM.test(raw)) {
    const kbText = String(kb?.config?.fastLaneAuth || "").trim();
    if (!kbText) {
      return nhuong(
        "that_gia",
        "hỏi thật/giả nhưng page chưa có kb.config.fastLaneAuth — nhường AI (không bịa)",
      );
    }
    return {
      handled: true,
      reply: kbText,
      rule: "that_gia",
      lyDo: "khớp từ khoá thật/giả — trả lời từ KB page",
    };
  }

  if (SIZE_Q.test(raw)) {
    const kbText = String(kb?.config?.fastLaneSize || "").trim();
    if (!kbText) {
      return nhuong(
        "hoi_size",
        "hỏi size nhưng page chưa có kb.config.fastLaneSize — nhường AI (không bịa)",
      );
    }
    return {
      handled: true,
      reply: kbText,
      rule: "hoi_size",
      lyDo: "khớp từ khoá hỏi size — trả lời từ KB page",
    };
  }

  if (PAANO_GAP.test(raw)) {
    const lang = detectLang(raw);
    const kbText = String(kb?.config?.fastLaneHowto || "").trim();
    const reply = kbText || HOWTO_FALLBACK[lang] || HOWTO_FALLBACK.en;
    return {
      handled: true,
      reply,
      rule: "paano_gap",
      lyDo: "vá lỗ paano mag order (biến thể tách chữ) — trả lời cách đặt hàng",
    };
  }

  // Từ đây là ba luật MỚI — chỉ chạy trên phần fast-lane KHÔNG phủ (xem khối trên).
  const fastLaneLo = DA_CO_O_FASTLANE.test(raw);

  if (!fastLaneLo && GIA_SAI.test(raw)) {
    const kbText = String(kb?.config?.fastLanePrice || "").trim();
    if (!kbText) {
      return nhuong(
        "gia_sai_chinh_ta",
        "hỏi giá (sai chính tả) nhưng page chưa có kb.config.fastLanePrice — nhường AI",
      );
    }
    return {
      handled: true,
      reply: kbText,
      rule: "gia_sai_chinh_ta",
      lyDo: "hỏi giá viết sai chính tả — trả lời từ KB page (regex gốc bỏ sót)",
    };
  }

  if (!fastLaneLo && DAT_HANG.test(raw)) {
    const lang = detectLang(raw);
    const kbText = String(kb?.config?.fastLaneHowto || "").trim();
    const reply = kbText || HOWTO_FALLBACK[lang] || HOWTO_FALLBACK.en;
    return {
      handled: true,
      reply,
      rule: "muon_dat",
      lyDo: "khách nói muốn đặt hàng — xin thông tin giao hàng",
    };
  }

  if (!fastLaneLo && (SHIP_Q.test(raw) || LICH_GIAO.test(raw))) {
    const kbText = String(kb?.config?.fastLaneShip || "").trim();
    if (!kbText) {
      return nhuong(
        "hoi_ship",
        "hỏi/hẹn giao hàng nhưng page chưa có kb.config.fastLaneShip — nhường AI (không bịa)",
      );
    }
    return {
      handled: true,
      reply: kbText,
      rule: "hoi_ship",
      lyDo: "khớp từ khoá giao hàng/lịch hẹn — trả lời từ KB page",
    };
  }

  return nhuong(null, "không khớp luật nào của lớp từ khoá v3");
}
