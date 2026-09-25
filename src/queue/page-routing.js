// «PAGE NÀY THUỘC CON BOT NÀO» — nơi quyết định DUY NHẤT.
//
// ═══ HAI CON BOT, MỘT DANH SÁCH ════════════════════════════════════════════════════════
// Bot cũ (`src/pancake-poll.js`, `src/scheduler-followup.js`) và bot mới (`chay-worker.js`)
// cùng đọc danh sách này, theo hai chiều ngược nhau:
//   · bot mới: «đây là page của tao» → chỉ nạp và xử tin của chúng
//   · bot cũ : «mấy page này đã giao đi» → tránh ra
// Một page lọt vào cả hai chiều là khách nhận HAI câu trả lời cho một câu hỏi.
//
// ═══ HAI NGUỒN, VÀ CHÚNG KHÔNG NGANG HÀNG ══════════════════════════════════════════════
//   ① `V3_PAGE_XU_LY` (file cấu hình máy chủ) — nguồn hôm nay. Sửa nó phải SSH + khởi động
//      lại, nên nó là thứ duy nhất **bot cũ** đọc được, và nó ở lại làm PHANH TAY.
//   ② `page.giao_bot_moi` (CSDL, migration 024) — sửa được từ giao diện. Chỉ có hiệu lực
//      khi `V3_GIAO_PAGE_TREN_MAN=1`.
//
// VẮNG CỜ = ĐÓNG: không đặt `V3_GIAO_PAGE_TREN_MAN` thì mọi thứ y hệt hôm nay, cột CSDL nằm
// im. Luật 1 của `docs/v3/ban-giao/bien-moi-truong-v3.md`, không được phép đảo.
//
// ⛔ BẬT CỜ RỒI THÌ BOT CŨ KHÔNG CÒN ĐỌC ĐƯỢC QUYỀN SỞ HỮU. Nó vẫn chỉ biết `V3_PAGE_XU_LY`.
//    Cái giữ cho nó buông một page giao bằng giao diện là CÔNG TẮC AI của chính nó
//    (`ai-enabled.json` — đo tận nơi: `pancake-poll.js:262` và `scheduler-followup.js:115`
//    đều chỉ chạy trên page ĐANG BẬT AI). Vì vậy cửa giao page
//    (`v3/src/noi-day/giao-page.js`) BẮT BUỘC tắt bot cũ TRƯỚC và đọc lại từ chính bot cũ
//    để xác nhận, rồi mới ghi cột. Ai sửa chỗ này mà bỏ bước xác nhận là mở lại đường
//    «hai bot cùng trả lời một khách».

/** Danh sách trong file cấu hình máy chủ. Cùng allowlist cho worker, webhook và việc loại
 *  Page khỏi poll legacy. */
export function dsPageV3(env = process.env) {
  return String(env.V3_PAGE_XU_LY || '').split(/[,\s]+/).filter(Boolean);
}
export function pageThuocV3(pageId, env = process.env) {
  return dsPageV3(env).includes(String(pageId));
}

export const BIEN_GIAO_TREN_MAN = 'V3_GIAO_PAGE_TREN_MAN';

/** Cầu dao «giao page bằng giao diện». Vắng = đóng. */
export function giaoTrenManDangMo(env = process.env) {
  return String(env[BIEN_GIAO_TREN_MAN] || '') === '1';
}

/**
 * Danh sách page THUỘC BOT MỚI, theo nguồn đang có hiệu lực.
 *
 * · cầu dao đóng ⇒ đúng `V3_PAGE_XU_LY`, KHÔNG đụng CSDL (rẻ, và không đổi hành vi cũ);
 * · cầu dao mở  ⇒ **HỢP** của `V3_PAGE_XU_LY` và cột `page.giao_bot_moi`.
 *
 * ⚠️ HỢP, KHÔNG PHẢI GIAO — và tôi đã viết sai chiều này một lần (25/09), thấy ra khi mở màn
 *    trên bản dev: bật cầu dao xong thì 4 page đang chạy bot mới bỗng hiện «bot cũ».
 *
 *    Vì sao GIAO là sai: page có tên trong `V3_PAGE_XU_LY` thì **bot cũ đã tránh ra rồi**
 *    (`pancake-poll.js:263` · `scheduler-followup.js:119` bỏ qua đúng danh sách ấy). Lấy nó
 *    khỏi tay bot mới là để một page KHÔNG CON NÀO trả lời — im lặng, và không màn nào kêu.
 *    Bật một cái cầu dao mà khách của mấy page đang chạy bỗng không ai trả lời là hậu quả
 *    nặng hơn hẳn thứ cái «phanh» kia định ngăn.
 *
 * ⇒ PHANH TAY LÚC SỰ CỐ là **tắt chính cầu dao** (`V3_GIAO_PAGE_TREN_MAN`) rồi khởi động
 *   lại: chủ sở hữu lập tức quay về đúng danh sách trong cấu hình máy chủ. Page vừa giao
 *   bằng giao diện sẽ không ai trả lời — im lặng, tức hướng hỏng an toàn — chứ không rơi
 *   vào cảnh hai bot cùng trả lời.
 *
 * @returns {Promise<string[]>} id Facebook của page
 */
export async function dsPageBotMoi(pool, env = process.env) {
  const tuEnv = dsPageV3(env);
  if (!giaoTrenManDangMo(env)) return tuEnv;
  const r = await pool.query(
    "SELECT page_id FROM page WHERE giao_bot_moi = true AND page_id <> '' ORDER BY page_id",
  );
  const tuDb = r.rows.map((x) => String(x.page_id)).filter(Boolean);
  return [...new Set([...tuEnv, ...tuDb])].sort();
}

/**
 * Một DÒNG `page` đã đọc sẵn có thuộc bot mới không — cho những chỗ đã cầm dòng trong tay
 * (màn vận hành, cửa ghi công tắc). Cùng một luật với `dsPageBotMoi`, chỉ khác là không tốn
 * thêm lời gọi CSDL.
 *
 * ⚠️ Dòng phải được đọc bằng `SELECT *` hoặc có cột `giao_bot_moi`; thiếu cột thì nó là
 *    `undefined` ⇒ false ⇒ «chưa giao». Sai về phía ĐÓNG, đúng chiều an toàn.
 */
export function pageThuocBotMoi(dongPage, env = process.env) {
  if (!dongPage) return false;
  // HỢP, cùng lý lẽ với `dsPageBotMoi`: page nằm trong cấu hình máy chủ thì bot cũ đã tránh
  // ra, nên nó BẮT BUỘC thuộc bot mới dù cột chưa đánh dấu.
  if (pageThuocV3(dongPage.page_id, env)) return true;
  return giaoTrenManDangMo(env) && dongPage.giao_bot_moi === true;
}

/** Câu «page này chưa thuộc bot mới» phải chỉ đúng chỗ đi sửa, và chỗ ấy đổi theo cầu dao. */
export function lyDoChuaThuocBotMoi(env = process.env) {
  return giaoTrenManDangMo(env)
    ? 'Page chưa được giao cho bot mới — bấm «Giao sang bot mới» ở màn Công tắc từng page'
    : 'Page chưa được đưa vào danh sách worker V3';
}

/** Vì sao worker không nạp page nào — câu này đi thẳng vào log, nên phải nói đúng nguồn. */
export function lyDoRong(env = process.env) {
  return giaoTrenManDangMo(env)
    ? `Không page nào có cờ «đã giao cho bot mới» trong CSDL (cầu dao ${BIEN_GIAO_TREN_MAN}=1 `
      + 'đang mở, nên nguồn là cột `page.giao_bot_moi`, không phải `V3_PAGE_XU_LY`).'
    : 'V3_PAGE_XU_LY chưa đặt ⇒ worker KHÔNG nạp page nào (vắng = đóng). Đặt danh sách id '
      + 'page ngăn cách bằng dấu phẩy để mở đúng bậc phơi cần thử.';
}
