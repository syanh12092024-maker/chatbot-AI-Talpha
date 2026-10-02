// CÔNG TẮC BOT THEO PAGE — một chỗ cho mọi màn cần hỏi «page này bot có đang trả lời không».
//
// MỘT NGUỒN (CR-02-10 · MB4, 02/10/2026): cột `page.bot_ai_bat`. Đó là CHÍNH cột máy trả lời đọc
// (`src/queue/page-routing.js`) và cột duy nhất màn Công tắc từng page ghi.
//
// Lịch sử: 25/08–02/10 cột này là BẢN SAO của `ai-enabled.json` (RAM tiến trình bot v1) và từng lệch
// 50 page, nên tệp này «hỏi cửa kiểm trước, cột sau». v1 nghỉ hưu, bản sao không còn — hỏi một nơi.

/** Bot có bật trên một dòng `page` không. Thiếu cột ⇒ false (sai về phía TẮT). */
export function botBatCua(p) {
  return p?.bot_ai_bat === true;
}

/** Câu khai nguồn cho ô «Nguồn số» của các màn đếm page bật bot. */
export const NGUON_BOT_BAT = Object.freeze({
  nguon: 'cot_csdl',
  noi: 'Đếm từ cột `page.bot_ai_bat` — công tắc duy nhất, chính cột máy trả lời đọc.',
});
