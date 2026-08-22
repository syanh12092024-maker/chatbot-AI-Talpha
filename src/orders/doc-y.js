// BỘ ĐỌC Ý — bốn nhánh trả lời của khách qua WhatsApp (phiếu L3-M3, 02 §L3 gạch 2).
//
// Luật TỪ KHOÁ + KHUÔN MẪU thuần tuý — KHÔNG gọi model (0 đồng, đúng lớp "0-model" của
// đề bài). Câu KHÔNG khớp nhánh nào, hoặc khớp MÂU THUẪN từ hai nhánh trở lên, đều trả
// `khong_ro` — máy trạng thái (nhanPhanHoi) sẽ đẩy đơn sang `cho_sale`. KHÔNG đoán liều
// (án lệ #4 của skill tho-thi-cong: đoán sai ở đây có giá — hoặc bỏ khách đang muốn mua,
// hoặc bom hàng người chưa thật sự đồng ý).
//
// HÀM THUẦN — không pool, không await, không đồng hồ, không I/O. Test được không cần DB.
import { KET_QUA_PHAN_HOI } from "./may-trang-thai.js";

// Nhóm theo NGÔN NGỮ chỉ để dễ đọc/bảo trì. docY() KHÔNG route theo `ngonNgu` — quét CẢ
// BA bộ từ khoá bất kể tham số đó là gì (khách COD đa thị trường trộn ngôn ngữ trong một
// tin không phải chuyện hiếm: "yes موافق" là một câu thật có thể gặp). `ngonNgu` giữ
// trong chữ ký để chỗ gọi khai được (log/route) và để mở rộng sau mà không đổi chữ ký.
//
// ⚠️ GIỚI HẠN ĐÃ BIẾT (khuôn từ khoá, không phải model): khớp theo TỪ/CỤM TỪ có biên
// khoảng trắng (không phải substring trần — "no" không khớp bên trong "know"). PHỦ ĐỊNH
// GHÉP LIỀN TRƯỚC một từ khoá xac_nhan ("not sure", "don't/cannot/won't confirm") ĐÃ ĐÓNG
// (RF-20/VA-R4, 23/08/2026 — xem NHOM_PHU_DINH + khopXacNhan() dưới): trước bản vá đó
// "not sure" khớp "sure" nên đọc ra xac_nhan do_tin=1, tự ship hàng khách CHƯA đồng ý.
// Residual CỐ Ý chưa vá (ngoài phạm vi VA-R4 — nghiệm thu ④ chỉ đòi phủ định LIỀN KỀ):
// phủ định CÁCH từ khoá ≥2 từ ("not really sure", "i really cannot confirm this") vẫn
// khớp "sure"/"confirm" như cũ — quét ngược nhiều từ dễ nuốt nhầm phủ định ở MỆNH ĐỀ
// TRƯỚC một xác nhận thật phía sau (đổi false-positive gần thành false-negative xa); giữ
// cửa sổ 1-từ cho tới khi có luật ranh giới mệnh đề — ghi theo luật 13 (nói rõ tradeoff).
const TU_KHOA = Object.freeze({
  xac_nhan: [
    // EN
    "yes",
    "yep",
    "yeah",
    "confirm",
    "confirmed",
    "correct",
    "sure",
    "ok",
    "okay",
    "go ahead",
    // AR (chuẩn + vài biến thể vùng vịnh/Levantine — chữ đã hạ về NFKC ở chuanHoa())
    "نعم",
    "ايوه",
    "أيوه",
    "تمام",
    "أكيد",
    "اكيد",
    "موافق",
    "تأكيد",
    // PH (Filipino/Taglish — thị trường Philippines, CLAUDE.md dự án)
    "opo",
    "oo",
    "sige",
    "confirm na",
    "tama",
  ],
  tu_choi: [
    // EN
    "no",
    "nope",
    "cancel",
    "don't want",
    "dont want",
    "not interested",
    "refuse",
    // AR
    "لا",
    "الغاء",
    "إلغاء",
    "مش عايز",
    "ما ابي",
    "مو عايز",
    // PH
    "ayaw",
    "huwag",
    "cancel na lang",
    "wag na",
  ],
  doi_sua: [
    // EN
    "change",
    "edit",
    "modify",
    "update",
    "wrong address",
    "wrong size",
    "different color",
    // AR
    "تغيير",
    "تعديل",
    "تبديل",
    "غيروا",
    "بدل",
    // PH
    "palitan",
    "baguhin",
    "ibahin",
  ],
});

// Xác nhận MỘT LẦN lúc nạp module: ba khoá có tên của TU_KHOA phải khớp đúng ba trong bốn
// giá trị của KET_QUA_PHAN_HOI (nguồn khai DUY NHẤT ở may-trang-thai.js — `khong_ro` là
// NGẦM ĐỊNH, không có bộ từ khoá riêng ở dưới). Không gõ tay lại danh sách bốn nhánh ở
// đây — tự bắt drift ngay lúc import nếu ai đổi vocabulary mà quên chỗ này (skill
// tho-thi-cong án lệ #3: câu khai về nguồn khác phải kèm một phép kiểm chạy được).
for (const ten of Object.keys(TU_KHOA)) {
  if (!KET_QUA_PHAN_HOI.includes(ten)) {
    throw new Error(
      `doc-y.js: nhánh "${ten}" không thuộc KET_QUA_PHAN_HOI của may-trang-thai.js — ` +
        `vocabulary đã trôi, sửa lại TU_KHOA trước khi dùng.`,
    );
  }
}

// ⚠️ CỐ Ý giữ lại dấu nháy đơn (') — nó mang nghĩa trong rút gọn tiếng Anh ("don't"),
// xoá nó biến "don't want" thành "don t want" và làm khớp từ khoá trượt (đã bắt được
// bằng chính bộ ca ≥16 câu của test/l3-m3-doc-y.test.js trước khi sửa dòng này).
const RE_DAU_CAU = /[.,!?;:()"،؛]/g;

function chuanHoa(text) {
  const ha = String(text ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(RE_DAU_CAU, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Đệm biên hai đầu để so THEO TỪ/CỤM TỪ (" no " ) — không so substring trần (tránh
  // khớp nhầm "no" bên trong "know"/"cannot", "لا" bên trong một từ Ả Rập dài hơn).
  return ha ? ` ${ha} ` : "";
}

function khopNhanh(chuanCoBien, tuKhoaNhanh) {
  return tuKhoaNhanh.some((tk) => chuanCoBien.includes(` ${tk} `));
}

// RF-20/VA-R4 — từ phủ định đứng NGAY LIỀN TRƯỚC một từ khoá xac_nhan (đo lại 23/08:
// "not sure" → khớp "sure", "don't confirm"/"cannot confirm" → khớp "confirm", cả ba đọc
// ra xac_nhan do_tin=1 dù khách CHƯA đồng ý — trái 02 §L3 "mơ hồ→khong_ro, KHÔNG đoán
// liều"). Chỉ áp cho nhánh xac_nhan: đây là nhánh DUY NHẤT có ca lỗi (đơn tự ship khi
// khách chưa đồng ý); tu_choi/doi_sua không có ca lỗi tương ứng, thêm phủ định cho hai
// nhánh đó là suy diễn ngoài phạm vi phiếu (luật 12 — cấm over-engineering).
//
// "no" và "لا" CỐ Ý KHÔNG nằm trong NHOM_PHU_DINH dù cũng là phủ định: cả hai đã là từ
// khoá tu_choi đứng riêng, nên "no confirm"/"لا تمام" đã tự rơi vào nhánh MÂU THUẪN (≥2
// nhánh khớp ⇒ khong_ro) từ TRƯỚC bản vá này rồi. Thêm chúng vào đây sẽ đổi những câu đó
// một chiều từ "khong_ro" (do_tin=0.5, an toàn) sang "tu_choi" (do_tin=1, tự tin) — trong
// khi có câu thật đọc ngược lại ý ("no problem, confirm" = ý ĐỒNG Ý), nên giữ khong_ro
// (đẩy cho_sale) an toàn hơn một phán tu_choi tự tin nhưng có thể sai.
const NHOM_PHU_DINH = Object.freeze([
  // EN
  "not",
  "don't",
  "dont",
  "cannot",
  "can't",
  "cant",
  "won't",
  "wont",
  "never",
  // AR
  "مش",
  "ما",
  "مو",
]);

// Như khopNhanh() nhưng bỏ qua lần khớp nào có một từ trong NHOM_PHU_DINH đứng NGAY LIỀN
// TRƯỚC (một từ — không quét ngược cả câu, xem giới hạn residual đã khai ở đầu file).
// Chỉ dùng cho TU_KHOA.xac_nhan (xem lý do ở comment trên).
function khopXacNhan(chuanCoBien, tuKhoaXacNhan) {
  return tuKhoaXacNhan.some((tk) => {
    const can = ` ${tk} `;
    let viTriBatDau = 0;
    let idx;
    while ((idx = chuanCoBien.indexOf(can, viTriBatDau)) !== -1) {
      const doanTruoc = chuanCoBien.slice(0, idx + 1); // tới hết dấu cách mở đầu của "can"
      const biPhuDinh = NHOM_PHU_DINH.some((neg) =>
        doanTruoc.endsWith(` ${neg} `),
      );
      if (!biPhuDinh) return true; // ≥1 lần khớp KHÔNG bị phủ định đứng ngay trước
      viTriBatDau = idx + 1; // câu có ≥2 lần xuất hiện từ khoá — thử vị trí kế tiếp
    }
    return false;
  });
}

/**
 * Đọc Ý của MỘT tin trả lời — bốn nhánh: xac_nhan · tu_choi · doi_sua · khong_ro.
 *
 * @param {string} text     nguyên văn tin khách trả lời qua WhatsApp
 * @param {object} [tuyChon]
 * @param {string} [tuyChon.ngonNgu]  gợi ý ngôn ngữ (KHÔNG đổi luật khớp — xem ghi chú trên)
 * @returns {{ket_qua: 'xac_nhan'|'tu_choi'|'doi_sua'|'khong_ro', do_tin: number}}
 *   do_tin = 1 khi ĐÚNG MỘT nhánh khớp (rõ) · 0.5 khi ≥2 nhánh cùng khớp (mâu thuẫn, máy
 *   KHÔNG đoán) · 0 khi rỗng hoặc không khớp nhánh nào.
 */
export function docY(text, { ngonNgu } = {}) {
  void ngonNgu; // giữ trong chữ ký — xem ghi chú đầu file, chưa dùng để đổi luật khớp
  const chuan = chuanHoa(text);
  if (!chuan) return { ket_qua: "khong_ro", do_tin: 0 };

  const khop = Object.keys(TU_KHOA).filter((nhanh) =>
    nhanh === "xac_nhan"
      ? khopXacNhan(chuan, TU_KHOA.xac_nhan)
      : khopNhanh(chuan, TU_KHOA[nhanh]),
  );

  if (khop.length === 1) {
    return { ket_qua: khop[0], do_tin: 1 };
  }
  // 0 nhánh khớp HOẶC ≥2 nhánh mâu thuẫn khớp cùng lúc ⇒ không đoán liều (02 §L3 + ②#2).
  return { ket_qua: "khong_ro", do_tin: khop.length === 0 ? 0 : 0.5 };
}

export { TU_KHOA };
