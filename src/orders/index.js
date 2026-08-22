// Cửa VÀO duy nhất của MÁY TRẠNG THÁI ĐƠN v3 (phiếu L3-M1) — L3-M2/M3/M4 import từ đây.
//
// Hợp đồng đọc kỹ trước khi gọi: docs/v3/ban-giao/may-trang-thai-don-v1.md
// ⛔ `donId` ở MỌI hàm là `don_hang.id` NỘI BỘ, không phải id đơn của POS.
export {
  BANG_CHUYEN,
  NGUON,
  TRANG_THAI_GIEO,
  TRANG_THAI_CHI_CUA_WA,
  SU_KIEN_CHI_CUA_WA,
  LY_DO_KHONG_GUI,
  KET_QUA_PHAN_HOI,
  TAP_TIEN_IN,
  MA_POS_CHO_IN,
  chuyen,
  apDung,
  taiDon,
  dayChoSale,
  nhanPhanHoi,
  baoHetLuot,
  donMessengerDaTao,
  LoiSaiNhanhNguon,
  LoiChuyenNgoaiBangDon,
  LoiThieuNguonDon,
} from "./may-trang-thai.js";

export {
  quetDonMoi,
  batDauQuet,
  lyDoTuLoi,
  CAU_QUET,
  NHIP_QUET_MS,
  TRAN_QUET_MS,
  TRAN_THU_LAI,
  MAU_XAC_NHAN,
} from "./quet-don-moi.js";

export {
  docLivePos,
  ghiNguocPos,
  thiTruongCuaDon,
  taChMaPos,
  LoiKhongRoThiTruong,
} from "./cua-pos.js";

// ── L3-M2 · hai trong «bốn cửa kiểm» chống trùng của L3-M4 ────────────────────
// Hợp đồng: docs/v3/ban-giao/may-trang-thai-don-v1.md §7.
export {
  kiemTrung,
  chuanHoaSdt,
  duoiBay,
  MA_QUOC_GIA,
  KEO_NGAY_MAC_DINH,
  TRAN_DONG_TRA,
  LY_DO_TRUNG,
  NGUON_TRUNG,
  CAU_TRA_TRUNG,
} from "./loc-trung.js";

export {
  chamTiLeHoan,
  chamTiLeHoanMotTeam,
  chamTang,
  kiemCauHinh,
  batDauChamDem,
  MA_HOAN,
  MA_THANH_CONG,
  MA_DA_KET,
  TANG_HOAN,
  CAU_HINH_TANG,
  NHIP_DEM_MS,
  CAU_DEM_HOAN,
  CAU_GHI_CHAM,
} from "./ti-le-hoan.js";

// ── L3-M3 · hàng đợi nhắc (2h×5, huỷ khi khách trả lời) + bộ đọc ý 4 nhánh ─────
// Hợp đồng: docs/v3/ban-giao/may-trang-thai-don-v1.md §5. `taoHuyLichNhac` là bản THẬT
// thay no-op mặc định của `nhanPhanHoi` (may-trang-thai.js) — chỗ chờ ở đó đã "cài THẬT"
// bằng cách các caller (nhanPhanHoiWa) dùng factory này làm deps.huyLichNhac mặc định.
export {
  datLichNhac,
  quetLichNhac,
  batDauQuetLich,
  taoHuyLichNhac,
  LOAI_NHAC,
  CACH_NHAC_MS,
  TRAN_NHAC,
  MAU_NHAC,
  NHIP_QUET_LICH_MS,
  CAU_DON_CAN_LICH,
  CAU_LICH_TOI_HAN,
} from "./lich-nhac.js";

export { docY, TU_KHOA as TU_KHOA_DOC_Y } from "./doc-y.js";

export { nhanPhanHoiWa } from "./nhan-phan-hoi-wa.js";

// ── L3-M4 · hàng chờ tạo đơn luồng Messenger (NĂM cửa, duyệt = TẠO ĐƠN POS THẬT) ──
// Hợp đồng: docs/v3/ban-giao/may-trang-thai-don-v1.md §hàng-chờ.
// ⛔ `duyet()` là đường DUY NHẤT của v3 đẻ ra một đơn POS mới — đọc `src/orders/
//    hang-cho.js` đầu file (§7.3 «THÀ KHÔNG TẠO CÒN HƠN TẠO NHẦM») trước khi gọi.
export {
  vaoHangCho,
  duyet,
  loai,
  docHangCho,
  chayNamCua,
  cua1DuTruong,
  cua2Tien,
  cua3ChongTrung,
  nguonA_soAi,
  nguonB_posSong,
  nguonC_trangThaiHoiThoai,
  nguonD_fbCommerce,
  nguonE_kiemTrung,
  traMarketCuaPage,
  chuanHoaHoSo,
  chuanHoaHoSoBoSung,
  TRUONG_BAT_BUOC,
  NGUON_CHONG_TRUNG,
  KET_NGUON,
  TRANG_THAI_HANG_CHO,
  FB_COMMERCE,
  LoiHangChoDaXuLy,
  LoiThieuHangCho,
} from "./hang-cho.js";
