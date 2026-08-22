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
export function lopTuKhoa({ text, kb }) {
  const raw = String(text || "");
  const s = norm(raw);
  const nhuong = (rule, lyDo) => ({ handled: false, reply: null, rule, lyDo });

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

  if (AUTH_Q.test(raw)) {
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

  return nhuong(null, "không khớp luật nào của lớp từ khoá v3");
}
