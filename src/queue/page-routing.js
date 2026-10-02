// «BOT CÓ TRẢ LỜI PAGE NÀY KHÔNG» — nơi quyết định DUY NHẤT.
//
// ═══ MỘT BẢN, MỘT CÔNG TẮC (CR-02-10 · MB2, 02/10/2026) ══════════════════════════════════
// Phía mình chỉ còn MỘT bot (01-QUYET-DINH §14). Trước 02/10 có SÁU chỗ cùng nói «ai trả lời
// page này» vì phải phân xử giữa bot cũ (v1) và bot mới: `ai-enabled.json` · cột `bot_ai_bat`
// (bản sao) · cột `giao_bot_moi` · cột `v3_ai_bat` · biến danh sách page của worker · cầu dao
// «giao page bằng giao diện». Nay chỉ còn MỘT:
//
//     page.bot_ai_bat = true   ⇔   worker nạp và trả lời tin của page đó.
//
// Bật/tắt ở màn «Công tắc từng page» (`v3/src/ui/page-bot/cong-tac.js` → cổng sẵn sàng
// `src/admin-v3/operations.js#pageStatus`), có nhật ký. Phanh tay lúc sự cố KHÔNG nằm ở đây
// mà ở van gửi (`PANCAKE_READONLY` · `V3_PANCAKE_GUI`): đóng van là không tin nào ra khách,
// dù cột đang bật.
//
// ⚠️ Bot `ai_sale` của pancake-tool (team khác) KHÔNG đọc cột này. Bật một page đang do
//    ai_sale trả lời là khách nhận HAI câu trả lời — người quyết báo bên đó tắt page trước.

/** Dòng `page` đã đọc sẵn: bot có đang trả lời page này không. Thiếu cột ⇒ false (sai về phía ĐÓNG). */
export function botDangTraLoi(dongPage) {
  return dongPage?.bot_ai_bat === true;
}

/**
 * Danh sách page bot đang trả lời — nguồn của worker.
 * @returns {Promise<string[]>} id Facebook của page
 */
export async function dsPageBotTraLoi(pool) {
  const r = await pool.query(
    "SELECT page_id FROM page WHERE bot_ai_bat = true AND page_id <> '' ORDER BY page_id",
  );
  return r.rows.map((x) => String(x.page_id)).filter(Boolean);
}

/** Vì sao worker không nạp page nào — câu này đi thẳng vào log. */
export function lyDoRong() {
  return 'Chưa page nào bật bot (cột `page.bot_ai_bat`) — bật ở màn «Công tắc từng page».';
}

// ── CHỈ CÒN CHO TỆP v1 (`pancake-poll.js` · `scheduler-followup.js`) ─────────────────────
// Để `aicloser.service` vẫn khởi động được nếu phải LÙI MB3. Bot v1 không biết cột CSDL, và
// trên máy chủ nó chạy với `V3_LEGACY_POLL_OFF=1` + `ai-enabled.json` rỗng nên không trả lời
// page nào. Gỡ cùng các tệp đó ở MB4.
export function pageThuocV3() { return false; }
