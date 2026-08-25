// Cửa VÀO duy nhất của tầng truy vấn v3 — B (và L1+ sau này) import từ đây.
// Chi tiết hàm/chữ ký/ví dụ: docs/v3/ban-giao/tang-truy-van-v1.md.
export { LoiThieuBoiCanhTeam, LoiXuyenTeam } from "./loi.js";
export { ctxHeThong } from "./boi-canh.js";
export { ghiNhatKy } from "./nhat-ky.js";
export { layDanhSachTeamChon } from "./team.js";
// Cửa hẹp chuyển page sang team khác (PHIEU-B-Y3) — KHÔNG đi qua `suaTheoId`, xem đầu
// `chuyen-team.js` để biết vì sao đó là cửa riêng chứ không phải một tham số nữa.
export {
  chuyenPageSangTeam,
  demMoCoi,
  VAI_DUOC_CHUYEN,
} from "./chuyen-team.js";
export {
  BANG_NGHIEP_VU_CHUAN,
  layNhieu,
  layMotTheoId,
  themMoi,
  suaTheoId,
} from "./truy-van.js";
