// BÀN HỘI THOẠI (CR-28-09) — UI-HT1 đọc một hội thoại · UI-HT2 danh sách và màn · UI-HT3 bối cảnh.
export {
  docHoiThoai, datDocTinPancake, datTraMaKhachSoAi, datDongHoHoiThoai, daNoiDocTin,
  xoaNhoHoiThoai, taoTraMaKhachSoAi, NHO_HOI_THOAI_MS,
  // UI-HT3
  taoChiMucSoAi, datChiMucSoAi, datLaTinTuDong, tenMessengerCua, luotBotCuCua, chuanChu,
  datDocDauVetV3, daNoiDauVetV3, taoDocDauVetV3Sql,
} from './doc-hoi-thoai.js';

export {
  boiCanhHoiThoai, datGiaiKichBan, daNoiGiaiKichBan, CHU_TRANG_THAI_DON, CHU_TRANG_THAI_POS, KHONG_GOI_MODEL,
  donChoDuyetCua, // LL2
} from './boi-canh-hoi-thoai.js';

export {
  danhSachHoiThoai, datDocHoiThoaiSql, daNoiDocSql, taoDocHoiThoaiSql,
  LOC, CUA_SO_NGAY, TOI_DA_DONG, LoiBanHoiThoai,
  donCho, TRANG_THAI_LADI_CHO, TOI_DA_DON_CHO, // LL2 · tab Đơn chờ của Hộp thư
} from './kho-ban-hoi-thoai.js';

export {
  taoRouterBanHoiThoai, datChanDangNhap, datChanVai, daNoiChanBanHoiThoai,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
