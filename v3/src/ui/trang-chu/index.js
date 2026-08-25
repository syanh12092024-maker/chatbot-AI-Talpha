// CỬA RA VÀO CỦA MÀN «TRANG CHỦ» (G2-F1 · sóng 4).
//
// Danh sách VIỆC theo vai, không phải bảng số liệu. Mỗi ô có chỗ bấm sang màn làm việc đó.
// Ô rỗng phải nói VÌ SAO rỗng bằng một trong ba câu: đã xong · chưa nạp · chưa có bảng.

export {
  manTrangChu, datTaoTruyVan, datDocSanSang, daNoiTrangChu,
  VI_RONG, LoiTrangChu,
} from './kho-trang-chu.js';

export {
  taoRouterTrangChu, datChanDangNhap, datChanVai, daNoiChanTrangChu,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
