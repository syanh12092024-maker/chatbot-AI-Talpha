// CỬA RA VÀO CỦA MÀN «ĐƯA SẢN PHẨM MỚI LÊN CHẠY» (G2-F7 · sóng 4).
//
// Sáu chặng của `90-phu-luc §2`, mỗi chặng một cửa kiểm. Chặng 2 có trạng thái RIÊNG
// `khong-co-o`: năm chất liệu thì ba cái không có trường nào để chứa, nên nó khác hẳn
// «ô để trống» — người có muốn điền cũng không có chỗ.

export {
  manLenChay, changCuaPage, datTaoTruyVan, datDocSanSang, datDocMotPage, daNoiLenChay,
  CHANG, CHU_CHANG, CHAT_LIEU, BANG_PAGE, LoiLenChay,
} from './kho-len-chay.js';

export {
  taoRouterLenChay, datChanDangNhap, datChanVai, daNoiChanLenChay,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
