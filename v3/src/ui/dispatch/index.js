// CỬA RA VÀO CỦA BẢNG ĐIỀU PHỐI (L4-M1) — hai danh sách và màn chi tiết.
//
// Màn này CỐ Ý NGHÈO NÀN. Sale không làm việc trên hệ thống này; họ đã quen Pancake.
// Bảng điều phối chỉ nói cho họ biết việc nào đang chờ, vì sao, còn bao nhiêu phút — rồi
// đẩy họ sang chỗ họ vốn làm việc. Thêm ô soạn tin, thêm bộ lọc đẹp đẽ vào đây là đi ngược
// `01-QUYET-DINH.md` mục 10. Đừng làm.
//
// ĐÚNG MỘT THAO TÁC được thêm, và nó là của `L4-M2`: đóng việc bằng kết quả và lý do
// (`dong-viec.js`). Đó là thao tác duy nhất sale làm trên hệ thống này.
//
// Nối vào ứng dụng, đúng thứ tự:
//
//   import express from 'express';
//   import { batBuocDangNhap, batBuocVaiHTTP, lopBoiCanh } from './v3/src/auth/index.js';
//   import { ghiNhatKy } from './v3/src/audit/index.js';
//   import {
//     datTaoTruyVan, datChanDangNhap, datChanVai, datPheuNhatKy, taoRouterDieuPhoi,
//   } from './v3/src/ui/dispatch/index.js';
//
//   datTaoTruyVan(taoTruyVan);        // ← người A giao: cổng đã gắn điều kiện team
//   datChanDangNhap(batBuocDangNhap); // ← L0-M3 giao (tiêm, KHÔNG import chéo)
//   datChanVai(batBuocVaiHTTP);       // ← L0-M3 giao
//   datPheuNhatKy(ghiNhatKy);         // ← L0-M4 giao
//
//   app.use(lopBoiCanh());            // đọc cookie vé → req.boiCanh
//   app.use(taoRouterDieuPhoi());     // /dieu-phoi, /viec/:id, /api/dieu-phoi/*
//
// Chưa nối cổng truy vấn → ném lỗi lúc gọi. Chưa nối hai cái chắn → mọi đường trả 500 và
// kêu ở console. Cả hai đều KHÔNG im lặng chạy sai, và cái chắn thì đóng chứ không mở.
//
// `V3_POS_MAU_DON` chưa đặt thì nút "Mở POS" hiện mờ kèm chú "chưa cấu hình đường POS" —
// mẫu đường POS chưa ai xác nhận bằng mắt, xem đầu `lien-ket.js`.

export {
  // cổng dữ liệu
  datTaoTruyVan, daNoiTruyVan, congTruyVan,
  // hai danh sách
  hangCho, tomTat, dongHoCua,
  // bảng lý do — `L4-M2` dùng lại, đừng chép sang bên đó một bản thứ hai
  LY_DO, lyDoChu, danhSachLyDo,
  // MÁY TRẠNG THÁI — `viec_can_xu_ly` không có cột `trang_thai`; công thức nằm ở đúng một
  // chỗ là `trangThaiCua()`. Ai cần biết việc đang ở đâu thì gọi hàm, đừng chép công thức.
  TRANG_THAI, trangThaiCua, DIEU_KIEN_MO,
  // một cột `ly_do_dong` chở cả mã lẫn ghi chú — khuôn nằm ở đúng hai hàm này
  NGAN_LY_DO, ghepLyDoDong, tachLyDoDong,
  // hằng số dùng chung
  BANG, LOAI, MUC_KHAN, NGUONG_GAP_MS, LoiDieuPhoi,
  // bộ chuyển đổi: đọc một dòng của bảng bên cạnh
  tenKhachCua, soDienThoaiCua, tenPageCua, tenNguoiDungCua, tenNguoiNhan, KHONG_RO_NGUOI,
} from './kho-viec.js';

export { chiTietViec } from './chi-tiet.js';   // đoạn chat đã bỏ 23/08 — xem đầu chi-tiet.js

export {
  lienKetPancake, lienKetPos, lienKetCua, mauPos, daCauHinhPos, convIdCua, tachMaPos,
  MAU_POS_MAC_DINH, BIEN_MAU_POS, BIEN_SHOP_POS, GHI_CHU_POS_CHUA_CAU_HINH,
} from './lien-ket.js';

export {
  taoRouterDieuPhoi,
  datChanDangNhap, datChanVai, datPheuNhatKy,
  daNoiChan, daNoiPheuNhatKy, ghiNhatKyDieuPhoi,
  VAI_VAO_DUOC, DUONG_TRANG,
  // hai đường trả trang: đá về đăng nhập thay vì phun JSON
  muonTrang, locTiep, TRANG_MAC_DINH,
} from './router.js';

// L4-M2 — nhận việc và đóng việc. Đây là hai hàm DUY NHẤT trong module có ghi xuống cơ sở
// dữ liệu, và cả hai chỉ `UPDATE` sáu cột nửa dưới của `viec_can_xu_ly`.
export {
  nhanViec, dongViec, bangKetQua, bangLyDo,
  KET_QUA, LY_DO_DONG, COT_NUA_DUOI,
  chuKetQua, chuLyDoDong,
  CHI_PHI_TOI_DA, CHI_PHI_SO_LE, GHI_CHU_TOI_THIEU, HANH_DONG_NHAN, HANH_DONG_DONG,
  LoiDongViec, LoiDaCoNguoiGiu, LoiDaDong, LoiThieuLyDo, LoiKetQuaLa, LoiChiPhiLa,
} from './dong-viec.js';
