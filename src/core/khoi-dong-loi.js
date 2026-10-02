// KHỞI ĐỘNG LÕI BOT TRONG TIẾN TRÌNH v3 — CR-02-10 · MB1.
//
// Trước 02/10, những thứ dưới đây chỉ chạy trong tiến trình bot v1 (`src/server.js`): nạp KB,
// đồng bộ Sheet danh bạ page, nạp danh sách page Pancake, quét sổ đăng ký page. Màn v3 đọc chúng
// qua cầu HTTP `/admin/api`, còn worker v3 thì KHÔNG có gì cả — đo 02/10: không chỗ nào ngoài
// `src/server.js` gọi `loadKB()`, nên với `V3_RAP_PROMPT_BAT` vắng, `rap-prompt.js#rapKb` đi đường
// `kb.js#getKBForPage` trên một `pageMap` rỗng ⇒ mọi page `noData` ⇒ bàn giao.
//
// Nay v1 nghỉ hưu (01-QUYET-DINH §14): CẢ HAI tiến trình v3 gọi hàm này lúc dựng.
//   · giao diện (`v3/chay-that.js`)      — `quetSoDangKy: true`: nó gánh việc quét sổ đăng ký page
//     mà `readiness.js` cần (trước là `admin-scripts.js` của v1 tự bật lúc import).
//   · worker (`src/queue/chay-worker.js`) — chỉ cần KB + danh bạ để soạn câu.
//
// Gọi lại lần hai là vô hại: mỗi phần tự nhớ đã chạy chưa.

import { loadKB, syncFromSheet, napLaiBanChepNeuDoi } from '../kb.js';
import { getSheetId } from '../sheets.js';
import { refreshPancakePages } from '../pancake.js';

const SHEET_MS = 5 * 60_000;       // y nhịp cũ của `src/server.js`
const PAGE_PANCAKE_MS = 10 * 60_000;
const BAN_CHEP_MS = 15_000;        // màn lưu xong ⇒ worker thấy trong ≤15 giây

const _da = { kb: false, sheet: false, pancake: false, banChep: false, soDangKy: false };

const hen = (fn, ms) => { const t = setInterval(fn, ms); t.unref?.(); return t; };
const nuot = (nhan) => (e) => console.error(`[lõi] ${nhan} lỗi:`, e?.message || e);

/**
 * @param {{ nhan?: string, quetSoDangKy?: boolean, dongBoSheet?: boolean, log?: Function }} [tuyChon]
 * @returns {Promise<{kb: object|null, sheet: boolean, soDangKy: boolean}>}
 */
export async function khoiDongLoi({ nhan = 'v3', quetSoDangKy = false, dongBoSheet = true, log = console.log } = {}) {
  let kb = null;
  if (!_da.kb) {
    _da.kb = true;
    try { kb = loadKB(); } catch (e) { nuot('nạp KB')(e); }
  }

  // Sheet nay CHỈ là danh bạ page (tên · thị trường · ngành · marketer) khi `V3_SHEET_CHI_DANH_BA=1`;
  // bot cần nó cho dòng «Thị trường · Ngành hàng» của prompt.
  if (dongBoSheet && !_da.sheet && getSheetId()) {
    _da.sheet = true;
    const chay = () => syncFromSheet(getSheetId()).catch(nuot('đồng bộ Sheet'));
    await chay();
    hen(chay, SHEET_MS);
  }

  if (!_da.pancake) {
    _da.pancake = true;
    const chay = () => refreshPancakePages().catch(nuot('nạp danh sách page Pancake'));
    chay();
    hen(chay, PAGE_PANCAKE_MS);
  }

  // Tiến trình KHÁC (màn v3) ghi `kb-overrides.json` mỗi lượt lưu sản phẩm/kịch bản. Tiến trình
  // này đọc lại khi tệp đổi — rẻ: một lượt `stat`.
  if (!_da.banChep) {
    _da.banChep = true;
    hen(() => { try { napLaiBanChepNeuDoi(); } catch (e) { nuot('nạp lại bản chép')(e); } }, BAN_CHEP_MS);
  }

  if (quetSoDangKy && !_da.soDangKy) {
    _da.soDangKy = true;
    const { startPageRegistry } = await import('../page-registry.js');
    startPageRegistry();
  }

  log(`[lõi] ${nhan}: KB ${kb ? `${kb.mode}/${kb.pages ?? kb.products ?? '?'}` : 'đã nạp trước'} · Sheet ${_da.sheet ? 'đồng bộ 5′' : 'không'} · sổ đăng ký page ${_da.soDangKy ? 'quét' : 'chỉ đọc tệp'}`);
  return { kb, sheet: _da.sheet, soDangKy: _da.soDangKy };
}
