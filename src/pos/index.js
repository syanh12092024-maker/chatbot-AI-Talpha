// Cửa VÀO duy nhất của CỬA POS v3 (phiếu L1-M1) — L2/L3 import từ đây.
//
// Ba việc: đọc đơn · đọc danh mục + tồn kho · GHI NGƯỢC trạng thái đơn (bốn cửa an toàn).
// Mọi hàm nhận `ctx` (bối cảnh team của L0-M2); job nền dùng `ctxHeThong()` + `teamId`.
//
// ⛔ Ghi ngược là lệnh ra ngoài — đọc `src/pos/ghi-nguoc.js` đầu file trước khi gọi.
export { docDon, suyNguon } from "./doc-don.js";
export { docDanhMuc, tenBienThe } from "./doc-danh-muc.js";
export {
  ghiNguocTrangThai,
  vanGhiMo,
  LoiVanGhiDong,
  LoiTrangThaiDaDoi,
} from "./ghi-nguoc.js";
export { layKetNoi, lietKeThiTruong, LoiThieuKetNoiPos } from "./ket-noi.js";
// ⛔ TẠO ĐƠN THẬT (L3-M4) — lệnh ra ngoài NẶNG NHẤT của v3: nó ĐẺ ra một kiện COD, và
//    luật 2 §0a cấm xoá đơn POS ⇒ tạo nhầm là KHÔNG GỠ ĐƯỢC. Đọc `src/pos/tao-don.js`
//    đầu file (bốn cửa an toàn) trước khi gọi.
export {
  taoDon,
  dungPayload,
  guiTaoDon,
  moCoiTruocPost,
  doiSangDonViNho,
  tachMaBienThe,
  MA_CHO_IN,
  GHI_CHU_DON,
  HE_SO_TE,
  LoiThieuThamChieuSanPham,
  LoiDonDaTao,
} from "./tao-don.js";
export {
  BANG_MA,
  NHOM_HUY_HOAN,
  CHUYEN_CHO_PHEP,
  XAC_MINH,
  kiemChuyen,
  nhanCuaMa,
  daXacMinh,
  LoiChuyenNgoaiBang,
  LoiMaChuaXacMinh,
} from "./ma-trang-thai.js";
export { LoiPosKhongTraLoi } from "./api.js";
