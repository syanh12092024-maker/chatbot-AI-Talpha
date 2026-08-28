// CỬA RA VÀO CỦA MÀN «NGUỒN KHÁCH VÀO» (G2-G4 · sóng 4).
//
// Hai luồng đơn chạy song song, chỉ gặp nhau ở POS. Phễu hội thoại là ẢNH CHỤP nên màn
// KHÔNG tính tỉ lệ rơi giữa hai bậc. Chỗ rơi 37,4% là số đo CŨ — chưa đo lại được.

export {
  manNguon, datTaoTruyVan, datDocPheu, daNoiNguon,
  BAC, NGUON_DON, BANG_DON, LoiNguon,
} from './kho-nguon.js';

export {
  taoRouterNguon, datChanDangNhap, datChanVai, daNoiChanNguon,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
