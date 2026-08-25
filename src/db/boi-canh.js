// BỐI CẢNH TEAM (ctx) — hình dạng CHỐT Ở PHIẾU NÀY (L0-M2), điểm bàn giao 2 cho người B
// (docs/v3/05-PHAN-VIEC.md §"Năm điểm bàn giao" — điểm 2). B tạo ctx này SAU đăng nhập +
// chọn team (L0-M3) rồi truyền vào mọi hàm của src/db/.
//
//   ctx = { teamId, nguoiDungId }
//
// Đây là OBJECT LITERAL thường — cố ý KHÔNG có factory/class ở đây. ctx chỉ là dữ liệu;
// việc XÁC THỰC nó (team có tồn tại không, có phải team KỸ THUẬT không) là việc của tầng
// truy vấn (truy-van.js), làm SÁT TỪNG LƯỢT GỌI — không làm một lần rồi tin mãi, vì cờ
// `la_ky_thuat` của một team có thể đổi giữa hai lượt gọi (dù hiếm).
//
// ctxHeThong() — cửa thoát CÓ KIỂM SOÁT cho JOB NỀN (di trú, cron toàn hệ — 02 §"L0"
// + PHIẾU L0-M2 ②). Không mang teamId cố định vì job nền có thể cần chạm NHIỀU team
// trong một lượt chạy (vd cron quét nhắc mọi team). Đổi lại, PHẢI trả giá hai thứ (thi
// hành ở truy-van.js):
//   1. Mọi hàm ở truy-van.js khi dùng ctx này ĐÒI team_id tường minh trong
//      dieuKien/duLieu — không suy luận hộ, không có "team mặc định" nào cả.
//   2. Mọi lượt GHI đều ghi một dòng nhat_ky (01-QUYET-DINH.md §9: "ghi cả việc máy
//      làm"), khác với ctx người dùng chỉ ghi khi bị CHẶN xuyên team.
// ⛔ CẤM dùng ctxHeThong() trong đường phục vụ request — đây là quyền của job nền chạy
// ngoài request người dùng (di trú, cron), không phải quyền của người dùng qua API.
//
// ═══ CỜ `ghiNhatKy` (B-Y5, 25/08) ═══════════════════════════════════════════════
// Luật «ghi cả việc máy làm» đúng cho JOB NỀN GHI DỮ LIỆU. Nhưng cùng cửa này còn phục vụ
// những đường CHỈ ĐỌC — bốn bộ đọc khối prompt của `rap-prompt.js`, mà màn «Prompt của
// page» gọi để hiện prompt THẬT. Mỗi lượt xem một page đẻ 4 dòng `doc`.
//
// Đo 25/08 trên `aicloser_v3`: `nhat_ky` có **1557 dòng, 100% là `doc`** — KHÔNG một dòng
// nghiệp vụ nào. Bảng này cấm xoá (trigger `tg_chi_insert_nhat_ky`), nên rác nằm đó vĩnh
// viễn, và cuốn sổ sinh ra để trả lời «ai làm gì» thì không ai đọc nữa. Tệ hơn: máy trạng
// thái màn Bộ luật của người B SUY TRẠNG THÁI từ chính `nhat_ky` — lấp nó là làm hỏng một
// công cụ mà code khác đang dựa vào.
//
// Cờ này CHỈ tắt ghi cho lệnh ĐỌC. Lệnh GHI (`themMoi`/`suaTheoId`) vẫn ghi, luôn luôn —
// tắt dấu vết của một lượt GHI là thứ khác hẳn, và không ai được phép.
//
// ⚠️ Mặc định `true`: giữ NGUYÊN hành vi mọi nơi gọi hiện có. Nhưng xem §9 sổ nợ — đo được
//    thì mặc định này SAI (1557/1557 dòng là rác), chỉ chưa ai xác nhận là không có nơi nào
//    đang cần dấu vết ĐỌC. Lật mặc định là một quyết định riêng, không nhét vào phiếu này.
export function ctxHeThong({ ghiNhatKy = true } = {}) {
  return Object.freeze({
    teamId: null,
    nguoiDungId: null,
    laHeThong: true,
    ghiNhatKy,
  });
}
