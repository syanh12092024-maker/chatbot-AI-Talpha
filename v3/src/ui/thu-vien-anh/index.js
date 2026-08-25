// CỬA RA VÀO CỦA MÀN «THƯ VIỆN ẢNH» (G2-D5 · làm ở sóng 4).
//
// 459 ảnh có thật trong dữ liệu sản phẩm của tiến trình bot. Nhưng chúng CHƯA gắn chủ đề,
// nên vế «để bot chọn đúng lúc» của yêu cầu chưa làm được — và màn nói thẳng ra.

export {
  manAnh, datTaoTruyVan, datDocKhoSanPham, daNoiAnh,
  laChuDe, NHAN_KHONG_PHAI_CHU_DE, BANG_PAGE, LoiAnh,
} from './kho-anh.js';

export {
  taoRouterAnh, datChanDangNhap, datChanVai, daNoiChanAnh,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
