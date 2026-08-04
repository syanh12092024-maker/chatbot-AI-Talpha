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
function allToks() {
  // Token HẾT HẠN bị loại tự động (gọi cũng vô ích). Thứ tự: chính → phụ env → phụ dashboard.
  return [config.pancakeToken, ...config.pancakeTokensExtra, ..._fileToks]
    .filter(Boolean)
    .filter((t) => { const d = decodeTok(t); return !d.exp || d.exp > Date.now(); });
}
// ---- Quản lý từ dashboard ----
export function listPancakeTokens() {
  const toks = [config.pancakeToken, ...config.pancakeTokensExtra, ..._fileToks].filter(Boolean);
  const nEnv = 1 + config.pancakeTokensExtra.length;
  const routing = {}; // token index (trong allToks) -> số page đang định tuyến
  const live = allToks();
  for (const idx of _pageTokIdx.values()) routing[idx] = (routing[idx] || 0) + 1;
  return toks.map((t, i) => {
    const d = decodeTok(t);
    const liveIdx = live.indexOf(t);
    return {
      i, name: d.name, exp: d.exp, expired: !!d.exp && d.exp <= Date.now(),
      source: i === 0 ? 'chính (.env)' : i < nEnv ? 'phụ (.env)' : 'dashboard',
      removable: i >= nEnv, pagesRouted: liveIdx >= 0 ? (routing[liveIdx] || 0) : 0,
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
    const res = await fetch(`${PK_BASE}/pages?access_token=${t}`);
    const j = await res.json();
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

// ===== ĐA-TOKEN FAILOVER =====
// Mỗi tài khoản Pancake chỉ có quyền trên 1 nhóm page. Bot nhớ token nào dùng được cho
// page nào (_pageTokIdx); dính lỗi hết phiên (103) / quyền (105) / gói cước (121) → tự thử token kế tiếp.
const _pageTokIdx = new Map(); // pageId -> index token đang chạy được
const PERM_ERRS = new Set([103, 105, 121]);
function permErr(j) {
  const codes = [j?.error_code, ...(Array.isArray(j?.errors) ? j.errors.map((e) => e?.error_code) : [])];
  return codes.some((c) => PERM_ERRS.has(Number(c)));
}
async function pkFetchPage(pageId, buildUrl, init) {
  const toks = allToks();
  if (!toks.length) return {};
  const start = _pageTokIdx.get(String(pageId)) ?? 0;
  let last = {};
  for (let k = 0; k < toks.length; k++) {
    const i = (start + k) % toks.length;
    let j = {};
    try {
      const res = await fetch(buildUrl(toks[i]), init);
      j = await res.json().catch(() => ({}));
    } catch (e) { j = { error_code: -1, message: e.message }; last = j; continue; } // lỗi mạng → thử token khác cũng vô ích nhưng không sập
    if (!permErr(j)) {
      if (i !== start) console.log(`[token] page ${pageId} → chuyển sang token #${i + 1}`);
      _pageTokIdx.set(String(pageId), i);
      return j;
    }
    last = j;
  }
  return last; // hết token vẫn lỗi quyền → trả lỗi cuối để caller xử lý
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
      const res = await fetch(`${PK_BASE}/pages?access_token=${t}`);
      const j = await res.json();
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
  return j.success ? { ok: true, tags: j.data } : { ok: false, error: JSON.stringify(j).slice(0, 120) };
}
// Bảng thẻ của page (từ /settings) — map TÊN (không phân biệt hoa thường) → tag_id, cache 10 phút.
const _tagCache = new Map(); // pageId -> { t, map }
export async function pkTagId(pageId, name) {
  const k = String(pageId);
  let e = _tagCache.get(k);
  if (!e || Date.now() - e.t > 10 * 60e3) {
    const map = new Map();
    try {
      const j = await pkFetchPage(pageId, (tk) => `${PK_BASE}/pages/${pageId}/settings?access_token=${tk}`);
      for (const t of (j?.settings?.tags || [])) {
        const nm = String(t.text || '').trim().toLowerCase();
        if (nm && !map.has(nm)) map.set(nm, t.id); // trùng tên (bot/BOT/Bot) → lấy thẻ đầu tiên
      }
    } catch { /* lỗi mạng → map rỗng, thử lại sau */ }
    e = { t: Date.now(), map };
    _tagCache.set(k, e);
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
  return j.success ? { ok: true, id: j.id } : { ok: false, error: j.original_error || JSON.stringify(j).slice(0, 120) };
}

// Gửi ẢNH qua Pancake (cùng endpoint reply_inbox, dùng content_url = link ảnh CÔNG KHAI).
// Dùng thay cho Facebook Graph vì các page này chạy qua Pancake, không có token FB gửi tin.
export async function pkSendImage(pageId, convId, custId, url) {
  if (!url) return { ok: false, error: 'thiếu url ảnh' };
  const j = await pkFetchPage(pageId, (t) => `${PK_BASE}/pages/${pageId}/conversations/${convId}/messages?access_token=${t}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reply_inbox', message: '', content_url: url, customer_id: custId }),
  });
  return j.success ? { ok: true, id: j.id } : { ok: false, error: j.original_error || JSON.stringify(j).slice(0, 140) };
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
    return j.success === false ? { ok: false, error: j.message || 'lỗi' } : { ok: true };
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
