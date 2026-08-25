// CỬA RA VÀO CỦA MÀN «BỘ LUẬT CHUNG» (G2-C1 · sóng 1).
//
// ⚠️ MÀN NGUY HIỂM NHẤT GIAI ĐOẠN 2. Sửa sai một dòng là MỌI page của team đổi cách nói với khách
//    cùng lúc. Đọc khối chú thích đầu `kho-bo-luat.js` trước khi sửa gì ở đây.
//
// BA THỨ BẮT BUỘC CÓ TRƯỚC KHI CHO BẤM ÁP — và cả ba đều có:
//   ① khác bản cũ chỗ nào  → `soSanh()` / `soVoiDangAp()`
//   ② bao nhiêu page bị ảnh hưởng → `demAnhHuong()`
//   ③ nút lùi về bản trước → `apPhienBan()` (cùng một hàm với «áp»)
//
// SỬA KHÔNG ÁP NGAY: `luuBanNhap()` tạo bản mới `dang_dung=false`, không đụng bản đang chạy.

export {
  manBoLuat, danhSachBan, soVoiDangAp, demAnhHuong,
  luuBanNhap, apPhienBan, duyetBan,
  datCuaBoLuat, daNoiCuaBoLuat,
  soSanh, tomTatSoSanh, uocToken,
  datTaoTruyVan, datPheuNhatKy, daNoiTruyVanBoLuat,
  BANG, TRANG_THAI, CHU_TRANG_THAI, VAI_SUA_DUOC, DAI_TOI_THIEU,
  KY_TU_MOI_TOKEN, HANH_DONG_LUU, HANH_DONG_AP, LoiBoLuat,
} from './kho-bo-luat.js';

export {
  taoRouterBoLuat, datChanDangNhap, datChanVai, daNoiChanBoLuat,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
