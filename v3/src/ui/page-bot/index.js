// CỬA RA VÀO CỦA MÀN «PAGE & BOT» (G2-B2 · sóng 0 giai đoạn 2).
//
// Gỡ chặn H8 và con số đau nhất của dự án: **514/514 page chưa có marketer**.
//
// BA CỘT, BA CHỦ SỞ HỮU — đọc `kho-page.js` đầu file trước khi sửa gì ở đây:
//   · `bot_ai_bat` → nguồn thật là tiến trình bot. Màn này gọi sang, KHÔNG ghi thẳng cột.
//   · `marketer`   → CSDL v3, nhưng di trú ghi đè. Có cảnh báo hiện trên màn + `PHIEU-B-Y4`.
//   · `trong_diem` → CSDL v3 sở hữu trọn. An toàn.
//
// Nối vào ứng dụng bằng `dungPhanB()`, đừng nối tay.

export {
  datTaoTruyVan, daNoiTruyVanPage, congTruyVan,
  danhSachPage, motPage, gonPage, demTheoLoc, viSaoRong,
  LOC, CHU_LOC, MOI_TRANG, BANG, COT_BI_DI_TRU_GHI_DE, COT_SUA_DUOC,
  LoiPageBot,
} from './kho-page.js';

export {
  datCongTacBot, ganMarketer, datTrongDiem,
  datPheuNhatKy, daNoiPheuNhatKyPage, trangThaiCau,
  HANH_DONG_BOT, HANH_DONG_MARKETER, HANH_DONG_TRONG_DIEM,
  VAI_SUA_DUOC, DAI_MARKETER, CANH_BAO_MARKETER, PHIEU_MARKETER,
} from './cong-tac.js';

export {
  taoRouterPageBot, datChanDangNhap, datChanVai, daNoiChanPageBot,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
