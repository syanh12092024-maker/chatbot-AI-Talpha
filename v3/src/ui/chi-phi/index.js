// CỬA RA VÀO CỦA MÀN «CHI PHÍ AI» (G2-G2).
//
// Tiền lấy từ nơi ĐO THẬT (tiến trình bot), không lấy từ sổ `so_ai` của v3 — sổ đó 0 dòng
// vì luồng sống chưa chạy. Hiện 0 ở màn chi phí là nói bot không tốn tiền.

export {
  manChiPhi, datTaoTruyVan, datDocChiPhiBot, datDocSoAi, daNoiChiPhi,
  NGUON, BANG_PAGE, BANG_SO_AI, LoiChiPhi,
} from './kho-chi-phi.js';

export {
  taoRouterChiPhi, datChanDangNhap, datChanVai, daNoiChanChiPhi,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
