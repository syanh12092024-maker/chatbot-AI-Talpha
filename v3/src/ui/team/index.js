// CỬA RA VÀO CỦA MÀN «CẤU HÌNH TEAM» (G2-B1 · sóng 0 giai đoạn 2).
//
// Màn này gỡ chặn H7: hôm nay gán page cho team chỉ làm được bằng psql tay, không ghi nhật ký.
//
// BỐN LÁT, cắt theo chỗ bị chặn — không phải theo chỗ đẹp:
//   ① Tổng quan team      · đọc      · chạy được ngay
//   ② Thành viên và vai   · GHI      · chạy được ngay (cổng danh tính đã nới cho đúng bảng này)
//   ③ Kết nối POS         · đọc      · chạy được ngay, KHÔNG bao giờ hiện khoá
//   ④ Gán page ↔ team     · GHI      · CHỜ `PHIEU-B-Y3` — hiện MỜ kèm lý do, không giấu đi
//
// Nối vào ứng dụng: đừng nối tay, gọi `dungPhanB()` ở `v3/src/vai-b.js`.

export {
  // cổng tiêm
  datTaoTruyVan, datCongDanhTinh, datDocKetNoiPos,
  daNoiTruyVan, daNoiDanhTinh, daNoiKetNoiPos,
  // đọc
  tongQuanTeam, thanhVienCua, nguoiChuaVaoTeam, danhSachVai, ketNoiCua, trangThaiGanPage,
  canhBaoTuTongQuan,
  // TRẠNG THÁI RỖNG — luật số một của màn này. `khoiRong()` ném nếu quên khai vì sao rỗng.
  khoiRong, VI_RONG,
  // hằng
  TEN_VAI, BANG_PAGE, BANG_HOI_THOAI, BANG_MODEL, BANG_THANH_VIEN, BANG_NGUOI_DUNG, BANG_VAI,
  PHIEU_GAN_PAGE, LY_DO_CHUA_GAN_DUOC,
  LoiCauHinhTeam,
} from './kho-team.js';

// Hai hàm DUY NHẤT của module có ghi xuống CSDL, và cả hai chỉ chạm `thanh_vien_team`.
export {
  themThanhVien, botThanhVien,
  datCongDanhTinh as datCongDanhTinhGhi, datPheuNhatKy,
  daNoiDanhTinhGhi, daNoiPheuNhatKyTeam,
  HANH_DONG_THEM, HANH_DONG_BOT, LoiRutQuanTriCuoi,
} from './thanh-vien.js';

export {
  taoRouterCauHinhTeam, datChanDangNhap, datChanVai, daNoiChanTeam,
  VAI_VAO_DUOC, VAI_GHI_DUOC, DUONG_TRANG,
} from './router.js';
