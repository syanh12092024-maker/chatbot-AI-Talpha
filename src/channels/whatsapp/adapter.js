// BẢN CÀI THẬT của cửa gửi mẫu tin WhatsApp qua Pancake — CHƯA XÁC ĐỊNH được endpoint
// (phiếu L1-M3 ②, "ĐO LẠI nguyên liệu" — skill tho-thi-cong bước 3 + án lệ #4).
//
// ═══ ĐO ĐƯỢC 22/08 — VÌ SAO KHÔNG CÓ ENDPOINT Ở ĐÂY ═══════════════════════════
// · src/pancake.js (bọc bởi cửa Messenger, L1-M2) chỉ có `PK_BASE =
//   "https://pages.fm/api/v1"` cho Messenger — KHÔNG có route `/whatsapp` nào.
// · 01-QUYET-DINH.md §4: "Pancake có sẵn bốn cách kết nối WhatsApp, trong đó có Cloud
//   API chính thức... Còn phải kiểm: Pancake cho gửi WhatsApp qua giao diện thì chắc
//   chắn; GỬI BẰNG API thì cần thử một lần thật. Đây là ĐIỂM KIỂM CHẶN SỐ 1" (= H1).
// · docs/v3/90-phu-luc-bang-hoi-ky-thuat.md §M1/§M2: chưa trả lời dùng kênh nào / đã có
//   WhatsApp Business Account chưa — nghĩa là CHƯA CHẮC endpoint sẽ là Pancake trực
//   tiếp hay qua trung gian khác (M1 phương án C).
// · src/wa.js / src/wa-login.js là đường Baileys (WhatsApp Web giả lập) — 01 §4 ĐÃ
//   LOẠI, CẤM tái dùng (chỉ gửi được vào MỘT nhóm nội bộ, không gửi 1-1 cho khách).
//
// ⇒ CẤM BỊA endpoint. Khi H1 (§7b T1 sổ điều hành) xác định được endpoint thật: thay
// THÂN hàm `guiMauQuaPancake` bằng lệnh gọi HTTP thật, GIỮ NGUYÊN chữ ký (payload vào,
// { ok, id } ra, hoặc ném lỗi có tên) — caller (`guiTinMau` ở index.js) không cần đổi.
import { LoiChuaCoEndpoint } from "./loi.js";

/**
 * Gửi MỘT mẫu tin WhatsApp qua Pancake — bản cài thật CHƯA CẮM.
 * @param {{ soNhan: string, tenMau: string, thamSo: object, donHangId: * }} _payload
 * @returns {Promise<{ok: boolean, id: string}>} không bao giờ resolve ở bản này.
 */
export async function guiMauQuaPancake(_payload) {
  throw new LoiChuaCoEndpoint(
    "Endpoint Pancake WhatsApp CHƯA CHỐT — điểm kiểm H1 (§7b T1 sổ điều hành) chưa " +
      'chạy (01-QUYET-DINH.md §4: "gửi bằng API cần thử một lần thật"). Không lượt ' +
      "gọi mạng nào được phát. Khi H1 xong: cắm lệnh HTTP thật vào " +
      "src/channels/whatsapp/adapter.js#guiMauQuaPancake, giữ nguyên chữ ký.",
  );
}
