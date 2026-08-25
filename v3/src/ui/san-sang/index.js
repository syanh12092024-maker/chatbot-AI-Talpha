// CỬA RA VÀO CỦA MÀN «CỬA KIỂM SẴN SÀNG» (G2-F5 · sóng 4).
//
// Màn CHỈ ĐỌC. Nó không sửa gì — nó nói page nào chưa chạy được và bấm đi đâu để sửa.
// Nguồn số liệu là `src/readiness.js` của tiến trình bot, đọc qua cầu HTTP, KHÔNG tính lại.

export {
  manSanSang, datTaoTruyVan, datDocSanSang, daNoiSanSang,
  DIEU_KIEN, MA_DIEU_KIEN, BANG, LoiSanSang,
} from './kho-san-sang.js';

export {
  taoRouterSanSang, datChanDangNhap, datChanVai, daNoiChanSanSang,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
