// Cửa VÀO duy nhất của tầng truy vấn v3 — B (và L1+ sau này) import từ đây.
// Chi tiết hàm/chữ ký/ví dụ: docs/v3/ban-giao/tang-truy-van-v1.md.
export { LoiThieuBoiCanhTeam, LoiXuyenTeam } from "./loi.js";
export { ctxHeThong } from "./boi-canh.js";
export { ghiNhatKy } from "./nhat-ky.js";
export { layDanhSachTeamChon } from "./team.js";
// Cửa hẹp chuyển page sang team khác (PHIEU-B-Y3) — KHÔNG đi qua `suaTheoId`, xem đầu
// `chuyen-team.js` để biết vì sao đó là cửa riêng chứ không phải một tham số nữa.
// Phiên bản · duyệt · đo ảnh hưởng cho bộ luật chung và kỹ năng (G2-A4).
// `apDungChoPage` là VỊ TỪ DÙNG CHUNG — `src/chat/rap-prompt.js` import chính nó, đừng gõ
// lại luật đó ở nơi thứ hai (phép đếm ảnh hưởng phải khớp bộ đọc lúc chạy thật).
export {
  apDungChoPage,
  xemAnhHuongBoLuat,
  xemAnhHuongKyNang,
  soSanhBoLuat,
  taoBanBoLuat,
  duyetBoLuat,
  apBoLuat,
  suaKyNang,
  luiKyNang,
  lichSuKyNang,
  VAI_SUA_BO_LUAT,
  VAI_SUA_KY_NANG,
} from "./noi-dung.js";
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
