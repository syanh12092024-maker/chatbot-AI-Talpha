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
 * Danh sách page bot đang trả lời (toàn hệ, không trần) — nguồn của 6 màn và của phép ĐẾM trần.
 * Worker KHÔNG dùng thẳng hàm này nữa: nó đi qua `trangThaiTran` → `choPhepTheoTran` (GL2) ở dưới.
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

// ═══ TRẦN SỐ PAGE BẬT BOT TOÀN HỆ (GL2 · người quyết 05/10: «vắng = 0 · vượt = worker DỪNG hẳn + đèn đỏ») ═══════
// Trước GL2 không có trần TỔNG: `dsPageBotTraLoi` lấy MỌI page bật, và trần 5 lượt/10′ của màn công tắc là mảng trong
// RAM chỉ hãm tốc độ (restart là về 0). Pilot = MỘT page: page thứ hai lọt vào (khôi phục bản sao lưu, SQL tay, hạ trần)
// là khách của nó nhận trả lời từ bot mình trong khi `ai_sale` của team khác có thể vẫn phủ page đó.
//
// Bốn nơi hỏi, MỘT luật + MỘT phép đếm (`dsPageBotTraLoi`, toàn hệ, không kẹp team):
//   · cổng bật `src/admin-v3/operations.js#setPage` — từ chối 409 dưới khoá tư vấn `KHOA_TRAN_PAGE_BAT`;
//   · worker `choPhepTheoTran` / `dsPageBotTraLoiCoTran` (dưới) — vượt ⇒ `[]`, KHÔNG trả lời page nào (fail-closed);
//   · đèn màn Sức khoẻ `v3/src/ui/suc-khoe/kho-suc-khoe.js` — đỏ ở mọi team khi vượt;
//   · `deploy/preflight.mjs --ready` / `--tran` (bước đọc-thuần đầu `setup.sh`) — vượt ⇒ exit 1.
// ⚠️ `dsPageBotTraLoi` (trên) KHÔNG bị chặn: nó còn là nguồn của 6 màn (`v3/src/noi-day/van-hanh-v3.js`) — chặn ở đó
//    là màn thấy 0 page bật khi vượt, người vận hành không biết phải tắt page nào (review (a) GL2 C1).

/** Tên biến môi trường — khai ở `docs/v3/ban-giao/bien-moi-truong-v3.md`. */
export const BIEN_TRAN_PAGE_BAT = 'V3_TRAN_PAGE_BAT';
/** Khoá tư vấn TOÀN HỆ của cổng bật (`pg_advisory_xact_lock(hashtextextended(<hằng>, 0))`). */
export const KHOA_TRAN_PAGE_BAT = 'v3:tran_page_bat';

const SO_NGUYEN = /^\d+$/;

/** Trần số page bật bot TOÀN HỆ. Vắng / rỗng / không phải số nguyên ≥ 0 ⇒ 0 (vắng = ĐÓNG). Nơi đọc biến DUY NHẤT. */
export function tranPageBat(env = process.env) {
  const tho = String(env?.[BIEN_TRAN_PAGE_BAT] ?? '').trim();
  return SO_NGUYEN.test(tho) ? Number(tho) : 0;
}

/** Giá trị trần đọc được, NÓI RA cả khi vắng/sai — câu lỗi phải in giá trị đo được, không in «cấu hình sai». */
export function moTaTranPageBat(env = process.env) {
  const tho = String(env?.[BIEN_TRAN_PAGE_BAT] ?? '').trim();
  const n = tranPageBat(env);
  if (!tho) return `${n} — chưa đặt`;
  if (!SO_NGUYEN.test(tho)) return `${n} — giá trị ${JSON.stringify(tho)} không phải số nguyên ≥ 0`;
  return String(n);
}

/** Luật xét — một chỗ. */
export const vuotTran = (soBat, tran) => soBat > tran;

/** «đang bật x/y page — trần V3_TRAN_PAGE_BAT=<giá trị đọc được>» — câu số đo chung của cổng bật · worker · đèn · preflight. */
export function cauSoTran(soBat, env = process.env) {
  return `đang bật ${soBat}/${tranPageBat(env)} page — trần ${BIEN_TRAN_PAGE_BAT}=${moTaTranPageBat(env)}`;
}

/** Trạng thái trần toàn hệ, đếm bằng ĐÚNG hàm nguồn của worker. `pool` có thể là một client trong giao dịch. */
export async function trangThaiTran(pool, env = process.env) {
  const pages = await dsPageBotTraLoi(pool);
  const tran = tranPageBat(env);
  return { soBat: pages.length, tran, vuot: vuotTran(pages.length, tran), pages };
}

/** Worker hỏi ~12 lần/giây (ba vòng xử 250 ms + vòng nạp) — cảnh báo «vượt trần» tối đa một dòng mỗi chừng này. */
export const KHOANG_CANH_BAO_TRAN_MS = 5 * 60 * 1000;
const _canhBao = { luc: null };   // null = không đang trong một đợt vượt đã cảnh báo
/** Chỉ dùng trong bài kiểm. */
export function xoaNhoCanhBaoTran() { _canhBao.luc = null; }

/** Vì sao worker không trả lời page nào khi vượt — câu đi vào `ket.nap.lyDo` và dòng khởi động. */
export function lyDoVuotTran(soBat, env = process.env) {
  return `DỪNG vì vượt trần page bật bot toàn hệ: ${cauSoTran(soBat, env)} — worker KHÔNG trả lời page nào `
    + 'cho tới khi số page bật ≤ trần. Tắt bớt ở màn «Công tắc từng page». (Chặn có chủ ý, không phải sự cố — khởi động lại không giúp gì.)';
}

/**
 * Áp trần lên một trạng thái ĐÃ ĐỌC (`trangThaiTran`) — đồng bộ, để một vòng worker đọc MỘT lần cho cả danh sách lẫn
 * lý do (đọc hai lần thì hai câu trả lời có thể lệch nhau giữa chừng). Số page bật > trần ⇒ `[]` — TUYỆT ĐỐI không
 * `null` (`kho.js#moPhienRut`: `pageIds = null` nghĩa là MỌI page). Cảnh báo có số đo, ≤ 1 dòng /
 * `KHOANG_CANH_BAO_TRAN_MS`; về lại trong trần thì một dòng báo chạy lại. Không ghi `nhat_ky` (cột `team_id` bắt buộc,
 * sự kiện này toàn hệ) — đèn màn Sức khoẻ + log là đủ.
 */
export function choPhepTheoTran(t, env = process.env, { bayGio = Date.now(), ghi = console.warn } = {}) {
  if (!t.vuot) {
    if (_canhBao.luc != null) {
      _canhBao.luc = null;
      ghi(`[worker-v3] trần page bật bot: về trong trần (${cauSoTran(t.soBat, env)}) — worker trả lời lại.`);
    }
    return t.pages;
  }
  if (_canhBao.luc == null || bayGio - _canhBao.luc >= KHOANG_CANH_BAO_TRAN_MS) {
    _canhBao.luc = bayGio;
    const ds = t.pages.length > 20 ? `${t.pages.slice(0, 20).join(',')},… (+${t.pages.length - 20})` : t.pages.join(',');
    ghi(`[worker-v3] ⛔ ${lyDoVuotTran(t.soBat, env)} Page đang bật: ${ds}. `
      + `(nhắc lại tối đa mỗi ${KHOANG_CANH_BAO_TRAN_MS / 60000} phút)`);
  }
  return [];
}

/** Nguồn page của WORKER (GL2 ②3): như `dsPageBotTraLoi`, qua trần (`choPhepTheoTran`). */
export async function dsPageBotTraLoiCoTran(pool, env = process.env, opts = {}) {
  return choPhepTheoTran(await trangThaiTran(pool, env), env, opts);
}
