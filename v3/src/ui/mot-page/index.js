// CỬA RA VÀO CỦA MÀN «TRANG MỘT PAGE» (GD2 · 25/09/2026).
//
// Gom ba màn đang hỏi cùng một câu hỏi bằng ba cách — «Bắt đầu», «Công tắc từng page»,
// «Page còn thiếu gì» — về MỘT trang cho MỘT page. Ba màn kia KHÔNG bị xoá: hai trong ba
// chuyển hướng về danh sách page, đường dẫn cũ vẫn sống.
//
// ⛔ Màn này CHỈ ĐỌC. Hai nút ghi trên đó bấm vào cửa đã có của màn danh sách
//    (`/api/page-bot/:id/bot` và `/api/page-bot/:id/giao`) — xem `router.js` đầu tệp.

export { trangMotPage, LoiMotPage } from './kho-mot-page.js';

export {
  taoRouterMotPage, datChanDangNhap, datChanVai, daNoiChanMotPage,
  DUONG_TRANG, VAI_VAO_DUOC, VAI_SUA_DUOC,
} from './router.js';
