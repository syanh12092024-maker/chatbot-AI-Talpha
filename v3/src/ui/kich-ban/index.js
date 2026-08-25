// CỬA RA VÀO CỦA MÀN «KỊCH BẢN» + «SOẠN KỊCH BẢN» (G2-D1 · G2-D2 · sóng 2).
//
// HAI BƯỚC KHÔNG ĐƯỢC ĐẢO: nhận bản NGƯỜI → tự dựng bản MÁY bằng ĐÚNG hàm của bộ di trú
// (`db/di-tru/nguon.js#dungBanChoMay`) → lưu CẢ HAI. Không cho sửa thẳng bản máy.
//
// ĐƯA LÊN LIVE đi qua TIẾN TRÌNH BOT trước, rồi mới sửa cột — cột là bản sao, `kb-overrides.json`
// + RAM của bot mới là bản LIVE thật.
//
// ⚠️ Cây «ba tầng» hôm nay chỉ dựng được HAI: `page.nganh_hang` rỗng 514/514 và `san_pham` 0
//    dòng, nên tầng sản phẩm không có gì để nhóm. Màn nói thẳng điều đó. `PHIEU-B-Y6` xin
//    người A mở đường lưu kịch bản ở tầng trên (`kich_ban.page_id` đang NOT NULL).
export {
  cayKichBan, banCuaPage, luuBanNhap, duaLenLive, lamSach, coNoiDung, uocToken, tangTrong,
  datTaoTruyVan, datPheuNhatKy, datDungBanMay, datDayLenBot,
  daNoiDungBanMay, daNoiDayLenBot,
  BANG, TRUONG, NHAN_TRUONG, TRUONG_VAO_PROMPT, TRANG_THAI, CHUA_PHAN,
  VAI_SUA_DUOC as VAI_SUA_KICH_BAN, VAI_DUYET_DUOC,
  HANH_DONG_LUU, HANH_DONG_LIVE, LoiKichBan,
} from './kho-kich-ban.js';

export {
  taoRouterKichBan, datChanDangNhap, datChanVai, daNoiChanKichBan, datBocPancake,
  daNoiBocPancake, VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
