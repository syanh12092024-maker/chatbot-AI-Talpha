// CỬA RA VÀO CỦA MÀN «SẢN PHẨM & KHO» (G2-F6 · sóng 4).
//
// Đọc NGUỒN THẬT (Sheet của tiến trình bot), không đọc bảng `san_pham` của v3 — bảng đó 0
// dòng vì chưa ai chạy nạp từ POS, còn bot thì đang bán 71 sản phẩm trên 69 page.

export {
  manSanPham, sanPhamCuaMotPage, datTaoTruyVan, datDocKhoSanPham, daNoiSanPham,
  VI_RONG, BANG_PAGE, LoiSanPham,
} from './kho-san-pham.js';

export {
  taoRouterSanPham, datChanDangNhap, datChanVai, daNoiChanSanPham,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
