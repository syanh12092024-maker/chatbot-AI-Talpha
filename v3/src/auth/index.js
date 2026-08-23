// CỬA RA VÀO CỦA TẦNG DANH TÍNH (L0-M3) — đăng nhập, chọn team, hai vai.
//
// Nối vào ứng dụng, đúng thứ tự:
//
//   import express from 'express';
//   import {
//     datCongDanhTinh, datPheuNhatKy, taoRouterAuth,
//     lopBoiCanh, batBuocDangNhap, batBuocVaiHTTP, chanTeamTrenUrl, VAI,
//   } from './v3/src/auth/index.js';
//
//   datCongDanhTinh(() => taoTruyVanHeThong());   // ← người A giao: cổng KHÔNG gắn team,
//                                                 //   chỉ cho 4 bảng dùng chung (xem kho-nguoi-dung.js)
//   datPheuNhatKy(ghiNhatKy);                     // ← L0-M4 giao (tiêm, KHÔNG import chéo)
//
//   app.use(express.json());
//   app.use(lopBoiCanh());                        // đọc cookie vé → req.boiCanh
//   app.use(taoRouterAuth());                     // /dang-nhap, /api/dang-nhap, …
//   app.use('/api', batBuocDangNhap(), chanTeamTrenUrl());
//   app.use('/api/quan-tri', batBuocVaiHTTP(VAI.QUAN_TRI));
//
// Cần `V3_KHOA_VE` trong môi trường. Thiếu là ném ngay lần phát vé đầu tiên — cố ý,
// xem ghi chú ở `ve.js`.

export { bam, kiem, hopLe as bamHopLe, THAM_SO as THAM_SO_BAM } from './mat-khau.js';

export {
  phatVe, phatVeTam, docVe, docVeAmTham, conLai,
  TEN_COOKIE, HAN_VE_MS, HAN_VE_TAM_MS, PHIEN_BAN_VE,
} from './ve.js';

export {
  datCongDanhTinh, daNoiCongDanhTinh, BANG_DANH_TINH,
  timTheoTen, teamCuaNguoi, vaiTrongTeam,
} from './kho-nguoi-dung.js';

export {
  lopBoiCanh, batBuocDangNhap, batBuocVaiHTTP, chanTeamTrenUrl,
  datPheuNhatKy, daNoiPheuNhatKy, ghiNhatKyAuth, docCookie, layIp,
} from './lop-express.js';

export { taoRouterAuth, xoaBoDemThuSai } from './router.js';

// Nền dùng chung — chuyển tiếp nguyên vẹn để nơi khác chỉ cần nhớ MỘT đường import.
// `boi-canh.js` là hợp đồng với người A: chỉ chuyển tiếp, KHÔNG bọc, KHÔNG sửa.
export {
  VAI, NGUON,
  taoBoiCanh, boiCanhMay, batBuocBoiCanh, cuaBoiCanh, coVai, batBuocVai, doiChieuTeam, tomTat,
  LoiThieuBoiCanh, LoiChuaDangNhap, LoiXuyenTeam, LoiThieuVai,
} from './boi-canh.js';
