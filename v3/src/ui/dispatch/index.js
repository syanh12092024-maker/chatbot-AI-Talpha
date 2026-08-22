// CỬA RA VÀO CỦA BẢNG ĐIỀU PHỐI (L4-M1) — hai danh sách và màn chi tiết.
//
// Màn này CỐ Ý NGHÈO NÀN. Sale không làm việc trên hệ thống này; họ đã quen Pancake.
// Bảng điều phối chỉ nói cho họ biết việc nào đang chờ, vì sao, còn bao nhiêu phút — rồi
// đẩy họ sang chỗ họ vốn làm việc. Thêm nút, thêm ô soạn tin, thêm bộ lọc đẹp đẽ vào đây
// là đi ngược `01-QUYET-DINH.md` mục 10. Đừng làm.
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
  // hằng số dùng chung
  BANG, TRANG_THAI_MO, LOAI, MUC_KHAN, NGUONG_GAP_MS, LoiDieuPhoi,
  // bộ chuyển đổi tên cột của bảng người A chưa dựng
  tenKhachCua, soDienThoaiCua, tenPageCua,
} from './kho-viec.js';

export { chiTietViec, COT_THOI_GIAN_SO_AI, SO_TIN_MAC_DINH } from './chi-tiet.js';

export {
  lienKetPancake, lienKetPos, lienKetCua, mauPos, daCauHinhPos,
  MAU_POS_MAC_DINH, BIEN_MAU_POS, BIEN_SHOP_POS, GHI_CHU_POS_CHUA_CAU_HINH,
} from './lien-ket.js';

export {
  taoRouterDieuPhoi,
  datChanDangNhap, datChanVai, datPheuNhatKy,
  daNoiChan, daNoiPheuNhatKy, ghiNhatKyDieuPhoi,
  VAI_VAO_DUOC,
} from './router.js';
