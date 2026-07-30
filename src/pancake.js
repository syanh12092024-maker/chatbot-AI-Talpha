import { config } from './config.js';

// ===== API Pancake (pages.fm) — nhận & gửi tin thay cho webhook Facebook =====
const PK_BASE = 'https://pages.fm/api/v1';
function pkTok() { return config.pancakeToken; }

// Danh sách page từ Pancake (nguồn chính) — cache, làm mới định kỳ.
let _pkPages = new Map(); // id -> { id, name }
export function pancakePages() { return _pkPages; }
export function pancakePageCount() { return _pkPages.size; }
export async function refreshPancakePages() {
  if (!pkTok()) return 0;
  try {
    const res = await fetch(`${PK_BASE}/pages?access_token=${pkTok()}`);
    const j = await res.json();
    const m = new Map();
    for (const p of (j.categorized?.activated || [])) m.set(String(p.id), { id: String(p.id), name: p.name || '' });
    if (m.size) { _pkPages = m; }
    return _pkPages.size;
  } catch (e) { console.warn('[pancake] nạp page lỗi:', e.message); return _pkPages.size; }
}

export async function pkGetConversations(pageId) {
  const res = await fetch(`${PK_BASE}/pages/${pageId}/conversations?access_token=${pkTok()}&page_number=1`);
  const j = await res.json();
  return j.conversations || [];
}
export async function pkGetMessages(pageId, convId, custId) {
  const res = await fetch(`${PK_BASE}/pages/${pageId}/conversations/${convId}/messages?access_token=${pkTok()}&customer_id=${custId}`);
  const j = await res.json();
  return j.messages || [];
}
// ===== THẺ HỘI THOẠI (tag) =====
// Gắn/gỡ thẻ: POST toggle_tag dạng FORM-ENCODED (KHÔNG phải JSON). value=1 gắn (idempotent), 0 gỡ.
export async function pkToggleTag(pageId, convId, tagId, on = true) {
  const res = await fetch(`${PK_BASE}/pages/${pageId}/conversations/${convId}/toggle_tag?access_token=${pkTok()}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `tag_id=${encodeURIComponent(tagId)}&value=${on ? 1 : 0}`,
  });
  const j = await res.json().catch(() => ({}));
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
      const res = await fetch(`${PK_BASE}/pages/${pageId}/settings?access_token=${pkTok()}`);
      const j = await res.json();
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
  const res = await fetch(`${PK_BASE}/pages/${pageId}/conversations/${convId}/messages?access_token=${pkTok()}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reply_inbox', message: text, customer_id: custId }),
  });
  const j = await res.json().catch(() => ({}));
  return j.success ? { ok: true, id: j.id } : { ok: false, error: j.original_error || JSON.stringify(j).slice(0, 120) };
}

// Gửi ẢNH qua Pancake (cùng endpoint reply_inbox, dùng content_url = link ảnh CÔNG KHAI).
// Dùng thay cho Facebook Graph vì các page này chạy qua Pancake, không có token FB gửi tin.
export async function pkSendImage(pageId, convId, custId, url) {
  if (!url) return { ok: false, error: 'thiếu url ảnh' };
  const res = await fetch(`${PK_BASE}/pages/${pageId}/conversations/${convId}/messages?access_token=${pkTok()}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reply_inbox', message: '', content_url: url, customer_id: custId }),
  });
  const j = await res.json().catch(() => ({}));
  return j.success ? { ok: true, id: j.id } : { ok: false, error: j.original_error || JSON.stringify(j).slice(0, 140) };
}

// Ghi GHI CHÚ vào hồ sơ khách trong Pancake (sale mở chat là thấy ở panel "Ghi chú").
// Dùng để báo sale: AI đã chốt đơn / cần người tiếp quản.
export async function pkAddNote(pageId, custId, message) {
  if (!custId || !message) return { ok: false, error: 'thiếu customer_id/nội dung' };
  try {
    const res = await fetch(`${PK_BASE}/pages/${pageId}/customers/${custId}/notes?access_token=${pkTok()}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const j = await res.json().catch(() => ({}));
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
