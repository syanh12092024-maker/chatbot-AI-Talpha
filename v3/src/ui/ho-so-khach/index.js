// CỬA RA VÀO CỦA MÀN «HỒ SƠ KHÁCH HÀNG» (G2-G5 · sóng 4).
//
// «Gộp ba kênh theo số điện thoại» — hôm nay gộp được HAI (khách ↔ đơn). Kênh hội thoại có
// đủ 28.953 dòng nhưng 0 dòng có `khach_id`, nên màn khai `null` chứ không khai 0.

export {
  manKhach, datTaoTruyVan, daNoiKhach, chuanSo,
  KENH, CHU_HOAN, TRAN_DOC, MOI_TRANG, BANG_KHACH, BANG_DON, BANG_HOI_THOAI, LoiKhach,
} from './kho-khach.js';

export {
  taoRouterKhach, datChanDangNhap, datChanVai, daNoiChanKhach,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
