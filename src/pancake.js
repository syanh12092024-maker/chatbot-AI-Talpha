import { config } from './config.js';

// ===== API Pancake (pages.fm) — nhận & gửi tin thay cho webhook Facebook =====
const PK_BASE = 'https://pages.fm/api/v1';
// ===== KHO TOKEN: env (PANCAKE_TOKEN + PANCAKE_TOKENS_EXTRA) + thêm từ dashboard (pancake-tokens.json) =====
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const TOKENS_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'pancake-tokens.json');
let _fileToks = [];
try { _fileToks = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8')); } catch { _fileToks = []; }
const saveFileToks = () => { try { fs.writeFileSync(TOKENS_FILE, JSON.stringify(_fileToks, null, 2)); } catch (e) { console.error('[token] lưu lỗi', e.message); } };
// Đọc payload JWT (không cần verify chữ ký — chỉ lấy tên/hạn để hiển thị & lọc token chết)
export function decodeTok(t) {
  try {
    const p = String(t).split('.')[1];
    const j = JSON.parse(Buffer.from(p.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return { name: j.name || j.fb_name || '?', exp: (j.exp || 0) * 1000, uid: j.uid || '', iat: (j.iat || 0) * 1000 };
  } catch { return { name: '(token lỗi định dạng)', exp: 0, uid: '', iat: 0 }; }
}
// ─── NGUỒN THỨ TƯ: KHO TOKEN TRONG CSDL (migration 019) ────────────────────────────
// Cắt sợi dây «muốn thêm token phải đi qua /admin/api của tiến trình bot»: v3 ghi thẳng
// bảng `token_pancake`, còn file này chỉ NHẬN danh sách qua một cửa tiêm. Tiêm thay vì
// import `pg` ở đây, vì `src/pancake.js` còn chạy trong những tiến trình không có pool
// (bộ ca, script one-shot) — nối được thì nối, không nối thì kho cũ vẫn chạy y như trước.
let _docTokenDb = null;   // () => Promise<string[]>
let _dbToks = [];
let _hen = null;
/** Nối bộ đọc kho token CSDL. Gọi một lần lúc dựng tiến trình. `null` để gỡ. */
export function datKhoTokenDb(fn, { nhipMs = 5 * 60e3 } = {}) {
  if (fn != null && typeof fn !== 'function') throw new TypeError('datKhoTokenDb cần một hàm');
  _docTokenDb = fn || null;
  if (_hen) { clearInterval(_hen); _hen = null; }
  if (!_docTokenDb) { _dbToks = []; return null; }
  lamMoiTokenDb().catch(() => {});
  _hen = setInterval(() => { lamMoiTokenDb().catch(() => {}); }, nhipMs);
  _hen.unref?.();          // đừng giữ tiến trình sống chỉ vì cái hẹn giờ này
  return _docTokenDb;
}
/** Nạp lại kho token CSDL NGAY — gọi sau khi màn v3 thêm/bỏ một token. */
export async function lamMoiTokenDb() {
  if (!_docTokenDb) return 0;
  try {
    const ds = await _docTokenDb();
    _dbToks = Array.isArray(ds) ? ds.filter((t) => typeof t === 'string' && t.trim()) : [];
    _pageTokIdx.clear();   // chỉ số token đổi → page tự dò lại chân tốt nhất, không cần restart
    return _dbToks.length;
  } catch (e) {
    // Giữ nguyên danh sách cũ: CSDL chớp một nhịp không được làm bot mất hết token.
    console.error('[token] đọc kho CSDL lỗi:', e.message);
    return _dbToks.length;
  }
}

function allToks() {
  // Token HẾT HẠN bị loại tự động (gọi cũng vô ích). Thứ tự: chính → phụ env → phụ
  // dashboard → CSDL (v3). CSDL đứng cuối vì hai kho trước là cấu hình máy chủ, có trước.
  return [config.pancakeToken, ...config.pancakeTokensExtra, ..._fileToks, ..._dbToks]
    .filter(Boolean)
    .filter((t) => { const d = decodeTok(t); return !d.exp || d.exp > Date.now(); });
}
// ---- Quản lý từ dashboard ----
export function listPancakeTokens() {
  const toks = [config.pancakeToken, ...config.pancakeTokensExtra, ..._fileToks, ..._dbToks].filter(Boolean);
  const nEnv = 1 + config.pancakeTokensExtra.length;
  const nFile = nEnv + _fileToks.length;   // từ đây trở đi là token của CSDL, bỏ ở màn v3
  const routing = {}; // token index (trong allToks) -> số page đang định tuyến
  const live = allToks();
  for (const idx of _pageTokIdx.values()) routing[idx] = (routing[idx] || 0) + 1;
  return toks.map((t, i) => {
    const d = decodeTok(t);
    const liveIdx = live.indexOf(t);
    return {
      i, name: d.name, exp: d.exp, expired: !!d.exp && d.exp <= Date.now(),
      source: i === 0 ? 'chính (.env)' : i < nEnv ? 'phụ (.env)' : i < nFile ? 'dashboard' : 'CSDL (v3)',
      // Token CSDL bỏ ở màn «Kết nối & token» của v3 (có vai + nhật ký), không bỏ ở đây.
      removable: i >= nEnv && i < nFile, pagesRouted: liveIdx >= 0 ? (routing[liveIdx] || 0) : 0,
      tail: String(t).slice(-8),
    };
  });
}
export async function addPancakeToken(token) {
  const t = String(token || '').trim();
  if (!t || t.split('.').length !== 3) return { ok: false, error: 'Không phải JWT hợp lệ (phải có 3 phần a.b.c)' };
  const d = decodeTok(t);
  if (d.exp && d.exp <= Date.now()) return { ok: false, error: `Token đã hết hạn (${new Date(d.exp).toLocaleDateString('vi-VN')})` };
  const existing = [config.pancakeToken, ...config.pancakeTokensExtra, ..._fileToks];
  if (existing.includes(t)) return { ok: false, error: `Token này đã có trong hệ thống (${d.name})` };
  // Test sống: token phải đọc được danh sách page
  try {
    const j = await goiPancake(`${PK_BASE}/pages?access_token=${t}`, undefined, hanDocMs());
    const n = (j.categorized?.activated || []).length;
    if (!j.categorized) return { ok: false, error: 'Pancake từ chối token (đăng nhập lại lấy token mới?)' };
    _fileToks.push(t); saveFileToks();
    _pageTokIdx.clear(); // chỉ số token đổi → để các page tự dò lại chân tốt nhất
    refreshPancakePages().catch(() => {});
    return { ok: true, name: d.name, pages: n, exp: d.exp };
  } catch (e) { return { ok: false, error: 'Lỗi mạng khi kiểm tra token: ' + e.message }; }
}
export function removePancakeToken(i) {
  const nEnv = 1 + config.pancakeTokensExtra.length;
  const fi = Number(i) - nEnv;
  if (!(fi >= 0 && fi < _fileToks.length)) return { ok: false, error: 'Chỉ xóa được token thêm từ dashboard (token .env sửa trong cấu hình)' };
  const d = decodeTok(_fileToks[fi]);
  _fileToks.splice(fi, 1); saveFileToks();
  _pageTokIdx.clear();
  return { ok: true, name: d.name };
}

// ===== HẠN CHỜ MỖI LƯỢT GỌI PANCAKE (phiếu GL3) =====
// Trước GL3 không `fetch` nào ở file này có `signal` ⇒ hạn thật là mặc định của undici (~300 s), NHÂN số
// token khi xoay. Poll chạy tuần tự từng page (`src/queue/chay-worker.js`) nên một request treo kéo cả
// vòng; lượt gửi nằm trong giao dịch đang mở (`src/queue/kho.js`) nên giữ luôn một kết nối pool.
// Hạn phủ CẢ lúc chờ header LẪN lúc đọc thân (`res.json()`) — thân treo sau khi header về cũng là treo.
// Đọc env TƯƠI mỗi lượt (bộ ca đổi biến giữa các ca trong cùng tiến trình — cùng khuôn `core/van-gui.js`).
const HAN_DOC_MAC_DINH_MS = 15_000;   // GET/HEAD/OPTIONS qua pkFetchPage + bốn fetch trần
const HAN_GUI_MAC_DINH_MS = 30_000;   // POST/PUT/PATCH/DELETE qua pkFetchPage
const HAN_TRAN_MS = 120_000;
const _hanDaCanhBao = new Set();
// Biến gõ sai ('0', âm, chữ, > 120 000) ⇒ về MẶC ĐỊNH + cảnh báo MỘT lần. KHÔNG hiểu '0' là «huỷ ngay»:
// một biến gõ nhầm không được làm bot câm với mọi khách.
function docHanMs(ten, macDinh) {
  const tho = process.env[ten];
  if (tho == null || String(tho).trim() === '') return macDinh;
  const s = String(tho).trim();
  const n = /^\d+$/.test(s) ? Number(s) : NaN;
  if (n >= 1 && n <= HAN_TRAN_MS) return n;
  if (!_hanDaCanhBao.has(`${ten}=${s}`)) {
    _hanDaCanhBao.add(`${ten}=${s}`);
    console.warn(`[pancake] ${ten}=${JSON.stringify(tho)} ngoài khoảng 1..${HAN_TRAN_MS} ms → dùng mặc định ${macDinh} ms`);
  }
  return macDinh;
}
const hanDocMs = () => docHanMs('V3_PANCAKE_HAN_DOC_MS', HAN_DOC_MAC_DINH_MS);
const hanGuiMs = () => docHanMs('V3_PANCAKE_HAN_GUI_MS', HAN_GUI_MAC_DINH_MS);
const laMethodDoc = (m) => ['GET', 'HEAD', 'OPTIONS'].includes(String(m || 'GET').toUpperCase());

// PHA của lỗi mạng — cho GL4 đếm đúng loại. 'ket_noi' = chưa một byte nào của request rời máy (DNS hỏng,
// cổng đóng, không tới được máy chủ, quá hạn BẮT TAY của undici). Mọi thứ khác — đứt giữa chừng, quá hạn
// chờ phản hồi, lỗi lạ — là 'sau_gui': có thể gói đã tới Pancake. Không nhận ra ⇒ 'sau_gui' (chiều an toàn).
const MA_LOI_KET_NOI = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'EAI_NONAME', 'EHOSTUNREACH',
  'ENETUNREACH', 'EHOSTDOWN', 'ENETDOWN', 'UND_ERR_CONNECT_TIMEOUT']);
function cacMaLoi(e) {
  const ma = [];
  for (let x = e, n = 0; x && n < 5; x = x.cause, n++) if (x.code) ma.push(String(x.code));
  return ma;
}
// `LoiCuaGuiDong` = cổng HTTP ghi của `chat/handler-v3.js` chặn TRƯỚC khi gọi fetch thật (van đóng) ⇒ chưa rời máy.
const laBiCongChan = (e) => e?.name === 'LoiCuaGuiDong';
const phaCuaLoi = (e) => (laBiCongChan(e) || cacMaLoi(e).some((m) => MA_LOI_KET_NOI.has(m)) ? 'ket_noi' : 'sau_gui');
function thongDiepLoi(e) {
  const m = String(e?.message || e || 'lỗi mạng');
  const ma = cacMaLoi(e).find((x) => !m.includes(x));
  return ma ? `${m} (${ma})` : m;
}

const THAN_HONG = Symbol('than-khong-phai-json');
/**
 * MỘT lượt gọi Pancake có hạn. Trả JSON của thân. NÉM khi lỗi mạng; khi quá hạn (`e.quaHan === true`, cả lúc
 * chờ header lẫn lúc đọc thân); khi thân không phải JSON (`e.thanHong === true` — vd 502/504 HTML của cổng:
 * với lượt GHI là «có thể đã tới khách», mỗi nơi gọi tự quyết như bản cũ của nó). Huỷ bằng `signal` để undici
 * đóng socket thật; còn `Promise.race` với lời huỷ để hạn vẫn đúng cả khi `fetch` (bẫy test, polyfill) lờ
 * `signal` đi. Thông điệp lỗi KHÔNG chứa URL có token.
 */
async function goiPancake(url, init, hanMs) {
  const ac = new AbortController();
  let quaHan = false;
  const choHuy = new Promise((_, tuChoi) => {
    ac.signal.addEventListener('abort', () => tuChoi(ac.signal.reason), { once: true });
  });
  choHuy.catch(() => {});   // nhánh kia thắng thì lời huỷ không được thành unhandledRejection
  const hen = setTimeout(() => {
    quaHan = true;
    let duong = '?';
    try { duong = new URL(url).pathname; } catch { /* để '?' */ }
    const e = new Error(`quá hạn ${hanMs} ms chờ Pancake (${String(init?.method || 'GET').toUpperCase()} ${duong})`);
    e.name = 'LoiQuaHanPancake';
    e.quaHan = true;
    ac.abort(e);
  }, hanMs);
  try {
    const res = await Promise.race([fetch(url, { ...init, signal: ac.signal }), choHuy]);
    const than = res.json();   // `res` không có `.json` ⇒ ném ngay ⇒ nơi gọi coi là lỗi mạng (như bản cũ)
    const j = await Promise.race([Promise.resolve(than).then((v) => v, () => THAN_HONG), choHuy]);
    if (j === THAN_HONG) {
      if (quaHan) throw ac.signal.reason;
      const e = new Error(`Pancake trả thân không phải JSON (HTTP ${res?.status ?? '?'})`);
      e.name = 'LoiThanPancake';
      e.thanHong = true;
      throw e;
    }
    return j;
  } catch (e) {
    if (quaHan) throw ac.signal.reason;   // mọi lỗi sau khi hết hạn là QUÁ HẠN, kể cả AbortError của undici
    throw e;
  } finally {
    clearTimeout(hen);
  }
}

// ===== ĐA-TOKEN FAILOVER =====
// Mỗi tài khoản Pancake chỉ có quyền trên 1 nhóm page. Bot nhớ token nào dùng được cho
// page nào (_pageTokIdx); dính lỗi hết phiên (103) / quyền (105) / gói cước (121) → tự thử token kế tiếp.
const _pageTokIdx = new Map(); // pageId -> index token đang chạy được
const PERM_ERRS = new Set([103, 105, 121]);
// Mọi mã lỗi Pancake trong một thân (`error_code` + `errors[].error_code`) — MỘT chỗ đọc cho `permErr` (xoay token) và
// `hangLoiDoc` (câu lỗi đọc), để hai nơi không thể hiểu khác nhau khi Pancake đổi hình thân lỗi.
const maLoiPancake = (j) => [j?.error_code, ...(Array.isArray(j?.errors) ? j.errors.map((e) => e?.error_code) : [])].map(Number);
function permErr(j) {
  return maLoiPancake(j).some((c) => PERM_ERRS.has(c));
}
// Dấu lỗi mạng mang lên kết quả của hàm GHI: `khongRo` («KHÔNG RÕ đã tới khách chưa») · `phaLoi` · `quaHan`.
// `lan-gui.js#bocCuaGuiBen` đã chuyển mọi `ok !== true` thành `lan_gui='khong_ro'` + LoiCanDoiChieuGui (không
// gửi lại, người đối chiếu) — dấu này không đổi hành vi đó, chỉ cho lớp trên (GL4) biết lỗi thuộc loại nào.
const dauLoiMang = (j) => ({
  ...(j?.khongRo ? { khongRo: true } : {}),
  ...(j?.phaLoi ? { phaLoi: j.phaLoi } : {}),
  ...(j?.quaHan ? { quaHan: true } : {}),
});
// GL4 (R2-N1) — CHỈ cho hai hàm GỬI TIN/ẢNH (ghi chú/thẻ giữ nguyên hình dạng kết quả GL3): `biChan` (cổng ghi chặn — CHẮC CHẮN
// chưa gọi) · `daGoi` (đã gọi Pancake: có thân trả lời hoặc lỗi mạng; thân RỖNG `{}` là chưa có token nào, không phải lời Pancake)
// · `ma` (mã lỗi Pancake — lý do ngắt nói được «mã 105»). `lan-gui.js` chỉ đếm lỗi KÊNH khi `daGoi`: «thiếu url ảnh» / hết token /
// cổng chặn không phải Pancake từ chối.
const dauLoiGui = (j) => ({
  ...dauLoiMang(j),
  ...(j?.biChan ? { biChan: true } : {}),
  ...(j && typeof j === 'object' && Object.keys(j).length && !j.biChan
    ? { daGoi: true, ma: maLoiPancake(j).filter(Number.isFinite) } : {}),
});
// `soLoi` (tuỳ chọn, chỉ `pkDocTin` truyền `{ ds: [], hetToken: false }`): ghi lỗi của TỪNG token trong vòng xoay + cờ «vòng xoay
// CẠN token» — để câu lỗi chọn được lỗi «thật» nhất thay vì lỗi của token cuối (GL3b vòng 2 · F2). Không đổi giá trị trả, thứ tự
// token, `_pageTokIdx`, hành vi GHI.
async function pkFetchPage(pageId, buildUrl, init, soLoi = null) {
  const toks = allToks();
  if (!toks.length) return {};
  const doc = laMethodDoc(init?.method);
  const hanMs = doc ? hanDocMs() : hanGuiMs();
  const start = _pageTokIdx.get(String(pageId)) ?? 0;
  let last = {};
  for (let k = 0; k < toks.length; k++) {
    const i = (start + k) % toks.length;
    let j = {};
    try {
      j = await goiPancake(buildUrl(toks[i]), init, hanMs);
    } catch (e) {
      const loi = { error_code: -1, message: thongDiepLoi(e), phaLoi: phaCuaLoi(e), ...(e?.quaHan ? { quaHan: true } : {}),
        ...(laBiCongChan(e) ? { biChan: true } : {}) };   // GL3b F2: cổng ghi chặn = CHẮC CHẮN chưa ghi ⇒ pkAddNote không báo ok
      // ⛔ GHI (POST/PUT/PATCH/DELETE): lỗi mạng / quá hạn / thân không phải JSON ⇒ TRẢ NGAY, KHÔNG xoay
      // token. Gói có thể đã tới Pancake mà mất phản hồi — gửi lại bằng token khác là khách nhận HAI tin, và
      // sổ `lan_gui` không chặn được vì cả hai lần nằm trong cùng một bước gửi. Lỗi pha kết nối cũng không
      // xoay (giữ an toàn, chỉ ghi đúng loại). Chỉ xoay khi Pancake TRẢ LỜI RÕ là lỗi quyền (permErr).
      // Cổng HTTP ghi chặn (van đóng) thì CHẮC CHẮN chưa gửi ⇒ không mang dấu «không rõ».
      if (!doc) return laBiCongChan(e) ? loi : { ...loi, khongRo: true };
      // ĐỌC: thân không phải JSON ⇒ trả NGAY, không xoay (như bản cũ). GL3b: mang dấu `thanHong` + câu lỗi (có mã HTTP)
      // để `pkDocTin` nói «Pancake lỗi (HTTP 502)» thay vì gộp với «hết token»; nơi đọc `j.conversations`/`j.messages`
      // vẫn thấy rỗng y như `{}` cũ.
      if (e?.thanHong) j = { thanHong: true, message: loi.message };
      else { last = loi; soLoi?.ds.push(loi); continue; } // ĐỌC: lỗi mạng / quá hạn → thử token kế (đọc lại không hại ai)
    }
    // GL3b F3: lượt GHI mà Pancake xác nhận `success:true` là ĐÃ NHẬN — kể cả khi thân mang kèm `error_code` (vd 121).
    // Xét `permErr` trước thì xoay sang token kế ⇒ GỬI LẦN HAI ⇒ khách nhận hai tin.
    if (!doc && j?.success === true) { _pageTokIdx.set(String(pageId), i); return j; }
    if (!permErr(j)) {
      if (i !== start) console.log(`[token] page ${pageId} → chuyển sang token #${i + 1}`);
      _pageTokIdx.set(String(pageId), i);
      return j;
    }
    last = j;
    soLoi?.ds.push(j);
  }
  if (soLoi) soLoi.hetToken = true;
  return last; // hết token vẫn lỗi quyền → trả lỗi cuối để caller xử lý
}

// ===== ĐÁNH DẤU CHƯA ĐỌC (cơ chế Botcake "rep xong giữ chưa đọc" — sale yêu cầu 07/08/2026) =====
// Endpoint chính thức (developer.pancake.biz) CHỈ có ở base public_api/v1 và đòi page_access_token
// RIÊNG TỪNG PAGE — JWT thường dùng cho mọi endpoint khác bị 404 (đã thử). Token sinh 1 lần bằng
// generate_page_access_token (JWT phải là admin page), lưu bền pancake-page-tokens.json (gitignore),
// không hết hạn trừ khi bị sinh lại. LƯU Ý: sinh token MỚI làm token cũ của page đó (nếu ai từng
// tạo trong Cài đặt → Công cụ) hết hiệu lực — repo này chưa từng dùng nên an toàn.
const PK_PUB = 'https://pages.fm/api/public_api/v1';
const PAGE_TOKS_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'pancake-page-tokens.json');
let _pageToks = {};
try { _pageToks = JSON.parse(fs.readFileSync(PAGE_TOKS_FILE, 'utf8')); } catch { _pageToks = {}; }
async function getPageAccessToken(pageId) {
  const k = String(pageId);
  if (_pageToks[k]) return _pageToks[k];
  // KHOÁ SINH TOKEN (thêm 2026-09-10). Pancake chỉ giữ MỘT page_access_token còn hiệu lực
  // cho mỗi page: sinh mới ở đây là giết token mà /opt/pancake-tool đang dùng cho page đó,
  // và cả page đó câm lặng — không lên đơn, không chat, không ai báo. Repo này đã sinh xong
  // 45 page hồi 20/08 và cache vĩnh viễn, nên đường này giờ chỉ chạy khi gặp page MỚI.
  // Muốn mở lại thì đặt AICLOSER_SINH_TOKEN=1 trong .env, và nhớ là nó sẽ cướp token.
  if (process.env.AICLOSER_SINH_TOKEN !== '1') {
    console.warn(`[unread] KHÔNG sinh page token cho ${k} — đang khoá (AICLOSER_SINH_TOKEN != 1) để không cướp token của pancake-tool`);
    return null;
  }
  for (const t of allToks()) {
    try {
      const j = await goiPancake(`${PK_BASE}/pages/${pageId}/generate_page_access_token?access_token=${t}`, { method: 'POST' }, hanDocMs());
      const tok = j.page_access_token || j.data?.page_access_token || j.data?.token;
      if (j.success !== false && tok) {
        _pageToks[k] = tok;
        try { fs.writeFileSync(PAGE_TOKS_FILE, JSON.stringify(_pageToks, null, 2)); } catch (e) { console.warn('[unread] lưu page token lỗi:', e.message); }
        return tok;
      }
    } catch { /* token kế */ }
  }
  return null; // không token nào là admin của page → chịu, caller log 1 lần
}
// Đánh dấu hội thoại CHƯA ĐỌC — gọi SAU khi AI gửi tin xong, để hội thoại không "trôi"
// khỏi hàng chờ của sale (bot rep xong Pancake tự coi là đã xử lý). Idempotent, gọi lặp vô hại.
export async function pkMarkUnread(pageId, convId) {
  if (!convId) return { ok: false, error: 'thiếu conv' };
  const tok = await getPageAccessToken(pageId);
  if (!tok) return { ok: false, error: 'không sinh được page_access_token (không token nào là admin page)' };
  try {
    // POST nhưng không gửi gì cho khách; một lượt, lỗi mạng / quá hạn ⇒ trả lỗi, KHÔNG thử lại (GL3).
    const j = await goiPancake(`${PK_PUB}/pages/${pageId}/conversations/${convId}/unread?page_access_token=${tok}`, { method: 'POST', headers: { Accept: 'application/json' } }, hanDocMs());
    return j.success ? { ok: true } : { ok: false, error: JSON.stringify(j).slice(0, 120) };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Danh sách page từ Pancake (nguồn chính) — cache, làm mới định kỳ.
let _pkPages = new Map(); // id -> { id, name }
export function pancakePages() { return _pkPages; }
export function pancakePageCount() { return _pkPages.size; }
export async function refreshPancakePages() {
  const toks = allToks();
  if (!toks.length) return 0;
  // GỘP danh sách page của TẤT CẢ token (mỗi tài khoản thấy 1 nhóm page khác nhau).
  const m = new Map();
  for (const t of toks) {
    try {
      const j = await goiPancake(`${PK_BASE}/pages?access_token=${t}`, undefined, hanDocMs());
      for (const p of (j.categorized?.activated || [])) if (!m.has(String(p.id))) m.set(String(p.id), { id: String(p.id), name: p.name || '' });
    } catch (e) { console.warn('[pancake] nạp page lỗi (1 token):', e.message); }
  }
  if (m.size) { _pkPages = m; }
  return _pkPages.size;
}

export async function pkGetConversations(pageId) {
  const j = await pkFetchPage(pageId, (t) => `${PK_BASE}/pages/${pageId}/conversations?access_token=${t}&page_number=1`);
  return j.conversations || [];
}
// Như `pkGetMessages` nhưng KHÔNG nuốt lỗi — cho màn ĐỌC (bàn hội thoại v3, UI-HT1) nói được
// VÌ SAO không đọc được. Đo 28/09: Pancake trả `{success:false, message:"Không tìm thấy gói
// cước…"}` hay «Thiếu mã khách hàng», mà `pkGetMessages` biến cả hai thành `[]`. Chỉ GET.
// GL3b: từ nay cũng là đường đọc lịch sử của CỬA Messenger (`channels/messenger#docTin` — worker + bộ nạp) và của
// màn Vận hành: `ok:false` ở đó ⇒ không trả lời mù, không ghi mốc.
// GL4 ② 3: `ok:false` mang thêm `capKenh` — lỗi CẤP KÊNH (đếm vào ngắt cả page) hay lỗi của MỘT hội thoại. Thân đọc tách sang
// `docTinMotLuot` để dòng câu lỗi (neo `gl3b.sh` ⑤v/⑤w) đứng nguyên mà nơi gọi vẫn lấy được phân loại.
export async function pkDocTin(pageId, convId, custId) {
  const soLoi = { ds: [], hetToken: false, capKenh: false };
  const kq = await docTinMotLuot(pageId, convId, custId, soLoi);
  return kq.ok ? kq : { ...kq, capKenh: soLoi.capKenh };
}
async function docTinMotLuot(pageId, convId, custId, soLoi) {
  const j = await pkFetchPage(pageId, (t) => `${PK_BASE}/pages/${pageId}/conversations/${convId}/messages?access_token=${t}&customer_id=${custId}`, undefined, soLoi);
  if (Array.isArray(j?.messages)) return { ok: true, messages: j.messages };
  soLoi.capKenh = laLoiKenhDoc(soLoi, j);
  // Vòng xoay CẠN token (mọi token lỗi quyền / mạng / quá hạn) ⇒ nói lỗi «thật» nhất. Ngược lại vòng xoay đã dừng sớm ở một câu
  // trả lời KHÔNG phải lỗi quyền (thân hỏng 502 · câu riêng của Pancake) ⇒ câu đó đứng.
  return { ok: false, loi: lyDoDocLoi(soLoi.hetToken ? loiThatNhat(soLoi.ds) : j) };
}
// GL3b vòng 2 (đối kháng F2) — mỗi tài khoản Pancake chỉ có quyền trên MỘT nhóm page, nên token «sai chân» trả 105 là chuyện
// THƯỜNG; lỗi của token cuối vòng xoay vì thế hay là 105 và che lỗi thật của token đúng chân (Pancake quá hạn, lỗi mạng, page
// tài khoản không ghế gói 121, token hết phiên 103) ⇒ người vận hành đi soát quyền token trong khi Pancake đang chậm. Thứ hạng
// (nhỏ = nói trước): quá hạn · lỗi mạng · 103 · 121 · còn lại (105 …). 103 trên 121: 121 là lỗi CẤP TÀI KHOẢN (đo prod 02/10 —
// gặp cả khi page còn gói), tài khoản thấy page mà không có ghế trả 121 thường xuyên như 105 — để 121 trên 103 thì token đúng
// chân hết phiên bị che bởi «không có ghế» của token khác. Cùng hạng ⇒ lấy lỗi SAU (giữ hành vi cũ khi mọi token lỗi giống nhau).
function hangLoiDoc(x) {
  if (x?.quaHan) return 0;
  if (Number(x?.error_code) === -1) return 1;
  const ma = maLoiPancake(x);
  return ma.includes(103) ? 2 : ma.includes(121) ? 3 : 4;
}
const loiThatNhat = (ds) => ds.reduce((tot, x) => (hangLoiDoc(x) <= hangLoiDoc(tot) ? x : tot));
// GL4 ② 3 — lỗi đọc CẤP KÊNH, phân loại theo CẤU TRÚC (không theo câu chữ: 103/105/121 sau mọi token ra câu RIÊNG của Pancake,
// giống hệt «Thiếu mã khách hàng»): vòng xoay CẠN token (quyền ở mọi token · mạng · quá hạn) · không còn token nào · thân hỏng
// (502/504 HTML). NGOẠI LỆ DUY NHẤT khớp chữ: 121 dạng KHÔNG mã `{success:false, message:"Không tìm thấy gói cước…"}` (đo 28/09) —
// `permErr` không bắt nên vòng xoay dừng sớm, mà đó là lỗi CẤP TÀI KHOẢN; không có trường nào khác để nhận ra nó. Còn lại (thân
// không danh sách, câu riêng một hội thoại) ⇒ lỗi dữ liệu, KHÔNG đếm. Giới hạn: HTTP 5xx mà thân là JSON không nhận ra được
// (`goiPancake` không đưa mã HTTP ra cho thân JSON).
function laLoiKenhDoc(soLoi, j) {
  if (soLoi.hetToken || !allToks().length || j?.thanHong === true) return true;
  return j?.success === false && j?.error_code == null && /gói cước/i.test(String(j?.message || ''));
}
// GL3b ② 2 — câu lỗi nói ĐÚNG lý do. Trước đây `{}` do thân không phải JSON (502/504 HTML của cổng) và `{}` do hết token
// cùng ra «không có token Pancake nào còn hạn» — người vận hành đi thay token trong khi Pancake đang sập. Câu quá hạn
// GIỮ nguyên chuỗi «quá hạn <N> ms …» của `goiPancake` (ca GL3 so bằng regex). Không câu nào chứa token.
function lyDoDocLoi(j) {
  if (j?.thanHong) return `Pancake lỗi (${/HTTP [^)]*/.exec(String(j.message))?.[0] || 'HTTP ?'}) — thân trả về không phải JSON`;
  if (j?.quaHan) return `Pancake quá hạn — ${j.message}`;
  if (Number(j?.error_code) === -1) return `Pancake lỗi mạng — ${j.message}`;
  const cau = String(j?.message || j?.error || '').trim();
  if (cau) return cau;
  if (j?.error_code != null) return `Pancake từ chối (mã ${j.error_code})`;
  if (j && typeof j === 'object' && Object.keys(j).length) return 'Pancake trả lời không có danh sách tin';
  return allToks().length ? 'Pancake trả thân rỗng (không có danh sách tin)' : 'không có token Pancake nào còn hạn';
}
// NUỐT lỗi thành `[]` — GL3b: đường trả lời khách (cửa `docTin`) và màn Vận hành KHÔNG dùng hàm này nữa; chỉ còn công cụ
// đo/giả lập ở `ops/bin/` (giữ nguyên chữ ký).
export async function pkGetMessages(pageId, convId, custId) {
  const j = await pkFetchPage(pageId, (t) => `${PK_BASE}/pages/${pageId}/conversations/${convId}/messages?access_token=${t}&customer_id=${custId}`);
  return j.messages || [];
}
// ===== THẺ HỘI THOẠI (tag) =====
// Gắn/gỡ thẻ: POST toggle_tag dạng FORM-ENCODED (KHÔNG phải JSON). value=1 gắn (idempotent), 0 gỡ.
export async function pkToggleTag(pageId, convId, tagId, on = true) {
  const j = await pkFetchPage(pageId, (t) => `${PK_BASE}/pages/${pageId}/conversations/${convId}/toggle_tag?access_token=${t}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `tag_id=${encodeURIComponent(tagId)}&value=${on ? 1 : 0}`,
  });
  return j.success ? { ok: true, tags: j.data } : { ok: false, error: JSON.stringify(j).slice(0, 120), ...dauLoiMang(j) };
}
// Bảng thẻ của page (từ /settings) — map TÊN (không phân biệt hoa thường) → tag_id, cache 10 phút.
const _tagCache = new Map(); // pageId -> { t, map }
// GL3b (/code-review #2): đọc lỗi KHÔNG cache 10′, nhưng GIỮ lỗi `THE_LOI_GIU_MS` cho cùng page — các lượt gọi dồn dập ngay
// sau (mỗi tên thẻ một lượt) cùng trả null thay vì mỗi lượt một /settings. Không giữ thì `page-registry.js#verifyTags`
// (3 tên liền nhau, quy ước «cả 3 cùng null = CHƯA BIẾT») gặp tên 1 lỗi · tên 2 đọc được ⇒ kết luận «thiếu tên 1» ⇒ CHẶN
// AI. Ngắn hơn nhịp vòng nạp 6 s (`chay-worker.js#NHIP_MS`) ⇒ vòng nạp sau vẫn đọc lại.
const THE_LOI_GIU_MS = 5_000;
const _tagLoi = new Map(); // pageId -> lúc đọc lỗi gần nhất
export async function pkTagId(pageId, name) {
  const k = String(pageId);
  let e = _tagCache.get(k);
  if ((!e || Date.now() - e.t > 10 * 60e3) && Date.now() - (_tagLoi.get(k) ?? -Infinity) < THE_LOI_GIU_MS) return null;
  if (!e || Date.now() - e.t > 10 * 60e3) {
    const map = new Map();
    let docDuoc = false;
    try {
      const j = await pkFetchPage(pageId, (tk) => `${PK_BASE}/pages/${pageId}/settings?access_token=${tk}`);
      // GL3b (trả nợ N-GL3-THE-RONG-10P): chỉ ĐỌC ĐƯỢC khi Pancake trả `settings`. Lỗi / quá hạn / thân hỏng ra `{}` hay
      // khung lỗi — cache bảng RỖNG 10′ thì cửa thẻ chặn của bộ nạp mù 10′ ⇒ hội thoại mang thẻ «Đã gửi» bị nạp và bot
      // trả lời khách đã chốt.
      docDuoc = !!j?.settings && typeof j.settings === 'object';
      for (const t of (j?.settings?.tags || [])) {
        const nm = String(t.text || '').trim().toLowerCase();
        if (nm && !map.has(nm)) map.set(nm, t.id); // trùng tên (bot/BOT/Bot) → lấy thẻ đầu tiên
      }
    } catch { /* lỗi lạ → như đọc lỗi: không cache */ }
    e = { t: Date.now(), map };
    if (docDuoc) _tagCache.set(k, e);   // đọc lỗi ⇒ KHÔNG cache, lượt gọi sau đọc lại
    if (docDuoc) _tagLoi.delete(k); else _tagLoi.set(k, Date.now());
  }
  const id = e.map.get(String(name).trim().toLowerCase());
  return id == null ? null : id;
}
// Gắn thẻ theo TÊN — page không có thẻ đó thì bỏ qua êm (mỗi page 1 bộ thẻ riêng).
export async function pkTagByName(pageId, convId, name, on = true) {
  if (!name || !convId) return { ok: false, error: 'thiếu tên thẻ / hội thoại' };
  const id = await pkTagId(pageId, name);
  if (id == null) return { ok: false, error: `page không có thẻ "${name}"` };
  return pkToggleTag(pageId, convId, id, on);
}

export async function pkSendReply(pageId, convId, custId, text) {
  const j = await pkFetchPage(pageId, (t) => `${PK_BASE}/pages/${pageId}/conversations/${convId}/messages?access_token=${t}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reply_inbox', message: text, customer_id: custId }),
  });
  return j.success ? { ok: true, id: j.id } : { ok: false, error: j.original_error || JSON.stringify(j).slice(0, 120), ...dauLoiGui(j) };
}

// Gửi ẢNH qua Pancake (cùng endpoint reply_inbox, dùng content_url = link ảnh CÔNG KHAI).
// Dùng thay cho Facebook Graph vì các page này chạy qua Pancake, không có token FB gửi tin.
// caption: lời dẫn gửi KÈM ảnh — không để khách nhận ảnh trơ (xem tools.js/prompts.js).
export async function pkSendImage(pageId, convId, custId, url, caption = '') {
  if (!url) return { ok: false, error: 'thiếu url ảnh' };
  const j = await pkFetchPage(pageId, (t) => `${PK_BASE}/pages/${pageId}/conversations/${convId}/messages?access_token=${t}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reply_inbox', message: caption || '', content_url: url, customer_id: custId }),
  });
  return j.success ? { ok: true, id: j.id } : { ok: false, error: j.original_error || JSON.stringify(j).slice(0, 140), ...dauLoiGui(j) };
}

// Ghi GHI CHÚ vào hồ sơ khách trong Pancake (sale mở chat là thấy ở panel "Ghi chú").
// Dùng để báo sale: AI đã chốt đơn / cần người tiếp quản.
export async function pkAddNote(pageId, custId, message) {
  if (!custId || !message) return { ok: false, error: 'thiếu customer_id/nội dung' };
  try {
    const j = await pkFetchPage(pageId, (t) => `${PK_BASE}/pages/${pageId}/customers/${custId}/notes?access_token=${t}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    // Lỗi mạng / quá hạn KHÔNG được thành `ok:true` (trước GL3 `{error_code:-1}` không có `success:false`
    // nên lọt thành công — sale tưởng đã có ghi chú bàn giao). Thân RỖNG (`{}` — không còn token nào, hoặc
    // Pancake trả `{}`) cũng không phải bằng chứng đã ghi.
    const rong = !j || typeof j !== 'object' || !Object.keys(j).length;
    // GL3b F2: thân KHÔNG xác nhận `success:true` mà mang dấu lỗi ⇒ thất bại. Thêm: lỗi quyền ở MỌI token (`{error_code:105}`
    // không kèm `success:false` — trước lọt thành ok) · cổng ghi chặn (`biChan`, van đóng, chắc chắn chưa ghi) · mã lỗi khác
    // -1. `{data:{id:1}}` (không success, không lỗi) vẫn ok như cũ (GL3 R7d); `success:true` kèm error_code (F3) vẫn ok.
    const thatBai = j?.success !== true && (j?.success === false || j?.khongRo || rong || permErr(j) || j?.biChan
      || (j?.error_code != null && Number(j.error_code) !== -1));
    return thatBai
      ? { ok: false, error: j?.message || (rong ? 'Pancake không trả gì (hết token còn hạn?)' : j?.error_code != null ? `Pancake từ chối (mã ${j.error_code})` : 'lỗi'), ...dauLoiMang(j) }
      : { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Tạo đơn trong Pancake. Hiện là STUB (log + sinh id giả) để chạy/test ngay.
// TODO: đấu nối API Pancake thật — thay phần dưới bằng fetch tới endpoint tạo đơn của bạn.
export async function createOrder(input, ctx) {
  const order = {
    id: `DRAFT-${Date.now()}`,
    psid: ctx?.state?.psid,
    customer: { name: input.name, phone: input.phone },
    shipping: { address: input.address, city: input.city },
    items: [{ product_id: input.product_id, variant: input.variant || '', qty: input.qty }],
    payment: 'COD',
    cod_confirmed: input.cod_confirmed,
    createdAt: new Date().toISOString(),
  };

  if (config.pancake.apiKey && config.pancake.shopId) {
    // Ví dụ khung gọi API thật (điều chỉnh theo tài liệu Pancake của bạn):
    // const res = await fetch(`https://pages.fm/api/v1/shops/${config.pancake.shopId}/orders?api_key=${config.pancake.apiKey}`, {
    //   method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mapToPancakePayload(order)),
    // });
    // const data = await res.json();
    // order.id = data.id || order.id;
    console.log('[pancake] (TODO) gọi API thật để tạo đơn', order.id);
  } else {
    console.log('[pancake] STUB tạo đơn nháp:', JSON.stringify(order));
  }
  return order;
}
