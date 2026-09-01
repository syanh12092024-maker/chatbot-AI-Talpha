// CỬA RA VÀO CỦA MÀN «RỦI RO HOÀN HÀNG» (G2-G7 · sóng 4).
//
// Màn ĐỌC phân bố đã chấm, KHÔNG áp chính sách — bốn tầng đang «chờ chốt» ở `01-QUYET-DINH
// §11`. Nguồn DUY NHẤT là cột `khach.tang_hoan` do job `src/orders/ti-le-hoan.js` chấm; màn
// không tự tính lại (H10). Luôn trả tầng KÈM số đơn ĐÃ KẾT: tỉ lệ trên một đơn là nhiễu.

export {
  manRuiRo, datTaoTruyVan, daNoiRuiRo,
  TANG, NGUONG, TRAN_DOC, BANG_KHACH, LoiRuiRo,
} from './kho-rui-ro.js';

export {
  taoRouterRuiRo, datChanDangNhap, datChanVai, daNoiChanRuiRo,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
