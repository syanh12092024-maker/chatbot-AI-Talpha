// CỬA RA VÀO CỦA MÀN «PROMPT CỦA PAGE» (G2-C3 · sóng 1).
//
// Cho xem prompt THẬT gửi cho model: bốn khối, token từng khối, và chỗ đáng đọc lại.
//
// DÙNG BỘ ĐỌC CỦA NGƯỜI A (`src/chat/rap-prompt.js`), KHÔNG dựng lại — dựng lại là đẻ bản
// thứ hai rồi màn hiện một prompt khác cái bot thật sự gửi, đúng thứ màn này sinh ra để loại.
//
// MÀN CHỈ ĐỌC. Sửa khối nào thì sang đúng màn của khối đó.
export {
  promptCua, pageChonDuoc, soiMauThuan, uocToken,
  datTaoTruyVan, datDocKhoi, datDocHieuLuc, daNoiDocKhoi,
  KHOI, TEN_KHOI, AI_SUA, TOKEN_THIET_KE, CAP_DOI_NHAU, LoiPrompt,
} from './kho-prompt.js';

export {
  taoRouterPromptPage, datChanDangNhap, datChanVai, daNoiChanPromptPage,
  VAI_VAO_DUOC, DUONG_TRANG,
} from './router.js';
