// BẢNG MẪU TIN WHATSAPP ĐÃ DUYỆT — ĐO ĐƯỢC, KHÔNG ĐOÁN (phiếu L1-M3 ②, cùng khuôn
// "bảng mã xác minh" của `src/pos/ma-trang-thai.js`, phiếu L1-M1).
//
// ═══ VÌ SAO BẢNG NÀY RỖNG ═════════════════════════════════════════════════════
// Cloud API WhatsApp bắt buộc: tin doanh nghiệp CHỦ ĐỘNG gửi phải dùng MẪU đã được
// Meta duyệt trước (01-QUYET-DINH.md §4/§5; docs/v3/90-phu-luc-bang-hoi-ky-thuat.md
// §"CẢNH BÁO" điều 1). Đo lại nguyên liệu 22/08 (skill tho-thi-cong bước 3): thủ tục
// WhatsApp Business Account + đăng ký số + soạn mẫu gửi duyệt là VIỆC NGƯỜI, CHƯA BẮT
// ĐẦU — 90-phu-luc §M1 ("Dùng kênh WhatsApp nào?") và §M2 ("Đã có WABA chưa?") còn để
// trống, và §"TỔNG KẾT — ĐƯỜNG GĂNG" xếp thủ tục Meta là nút thắt của cả khối WhatsApp.
// KHÔNG có mẫu thật nào tồn tại để mà khai — bảng RỖNG là đúng THỰC TẾ tại lượt code
// này, không phải thiếu sót. Bịa một mẫu "cho có" là hỏng đơn khách thật khi cửa mở
// nhầm (án lệ #4 skill tho-thi-cong: đo lại nguyên liệu trước khi code).
//
// ⛔ DENY-BY-DEFAULT: tên mẫu KHÔNG có trong bảng này, hoặc có nhưng `da_duyet` khác
//    `true`, là CHƯA DUYỆT — mọi lượt gửi chạm nó bị TỪ CHỐI (LoiMauChuaDuyet). Khi
//    Meta duyệt một mẫu thật: thêm MỘT dòng vào đây kèm ngày duyệt + nội dung mẫu
//    (không phải chỉ tên) — không "tạm cho qua" bằng cách gõ `da_duyet: true` trước.
export const BANG_MAU_TIN = Object.freeze({});

/**
 * Mẫu `tenMau` đã được duyệt (`da_duyet === true`) trong `bang` chưa.
 * `bang` mặc định là BANG_MAU_TIN (rỗng, thật) — test tiêm bảng riêng qua
 * `deps.bangMauTin` của `guiTinMau` để đo nhánh CHO-QUA mà không phải bịa mẫu thật.
 */
export function mauDaDuyet(tenMau, bang = BANG_MAU_TIN) {
  return Boolean(bang?.[tenMau]?.da_duyet);
}
