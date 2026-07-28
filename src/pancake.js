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
