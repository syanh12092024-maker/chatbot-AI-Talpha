// CỬA RA VÀO CỦA MÀN «BÁO CÁO» (G2-G1).
//
// Không cộng những thứ đo bằng thước khác nhau — cả giữa hai luồng đơn, lẫn giữa ba con số
// của riêng luồng Messenger (269 bot tự chốt · 907 đơn POS quy cho AI · 893 hội thoại có đơn).

export {
  manBaoCao, datTaoTruyVan, datDocDon, datDocChiPhi, datDocHaiLuong, daNoiBaoCao,
  THUOC, BANG_PAGE, LoiBaoCao,
} from './kho-bao-cao.js';

// LL17a · 02/10: đơn POS của team theo marketer — số tổng hợp từ BigQuery (`kho-don-pos.js`).
export { manDonPos, datDocDonPos, datDocHrmSoLieu, daNoiDonPos } from './kho-don-pos.js';

export {
  taoRouterBaoCao, datChanDangNhap, datChanVai, daNoiChanBaoCao,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
