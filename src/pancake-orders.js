// Đọc ĐƠN HÀNG THẬT từ Pancake POS (mỗi thị trường 1 shop: api_key + shop_id).
// Cho phép thống kê số đơn thật theo page + theo khoảng ngày → khớp với Pancake.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOPS_FILE = path.join(DIR, 'pancake-shops.json');   // [{market, shop_id, api_key}] — KHÔNG commit
const CACHE_FILE = path.join(DIR, 'page-shop-cache.json'); // pageId -> shop (dò 1 lần rồi nhớ)
const PROD_FILE = path.join(DIR, 'page-product-cache.json'); // pageId -> {variation_id, warehouse_id} (rút từ đơn cũ)
const CREATED_FILE = path.join(DIR, 'ai-created-orders.json'); // convId đã tạo đơn (chống trùng)
const POS = 'https://pos.pages.fm/api/v1';
const CANCEL = new Set(['4', '5', '6', '7', '8']); // đang hoàn / đã hoàn / hủy / xóa / chuyển hoàn

let SHOPS = [];
try { SHOPS = JSON.parse(fs.readFileSync(SHOPS_FILE, 'utf8')); } catch { SHOPS = []; }
let pageShop = {};
try { pageShop = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { pageShop = {}; }
const saveCache = () => { try { fs.writeFileSync(CACHE_FILE, JSON.stringify(pageShop)); } catch { /* bỏ qua */ } };

// fetch có timeout — 1 call chậm/treo không kéo sập cả request.
async function fetchJson(url, ms = 20000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { signal: ac.signal }); return await r.json(); }
  finally { clearTimeout(t); }
}
// POS hay chậm/nghẽn theo đợt. Thử lại 1 lần trước khi chịu thua — trước đây lỗi là BỎ DỞ
// vòng quét và trả về con số THIẾU, khiến thống kê nhảy loạn giữa các lần xem.
async function fetchJsonRetry(url, ms = 20000) {
  try { return await fetchJson(url, ms); }
  catch { await new Promise((r) => setTimeout(r, 1500)); return fetchJson(url, ms); }
}

export function ordersEnabled() { return SHOPS.length > 0; }

const unix = (ymd, end) => Math.floor(new Date(`${ymd}T${end ? '23:59:59' : '00:00:00'}Z`).getTime() / 1000);
const ymdDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

// Tìm shop chứa page (dò các shop 1 lần, nhớ vào cache).
async function shopOf(pageId) {
  const k = String(pageId);
  if (pageShop[k]) return pageShop[k];
  for (const s of SHOPS) {
    try {
      const j = await fetchJson(`${POS}/shops/${s.shop_id}/orders?api_key=${s.api_key}&page_id=${pageId}&page_number=1`);
      if (j && j.total_entries != null && j.total_entries > 0) { pageShop[k] = s; saveCache(); return s; }
    } catch { /* thử shop kế */ }
  }
  return null;
}

// Số đơn thật của 1 page (tùy chọn khoảng ngày YYYY-MM-DD). Trả {total, successful, cod, market}.
export async function realOrders(pageId, { from, to } = {}) {
  const s = await shopOf(pageId);
  if (!s) return { total: 0, successful: 0, cod: 0, market: null };
  let q = `api_key=${s.api_key}&page_id=${pageId}&page_number=1`;
  if (from) q += `&startDateTime=${unix(from)}`;
  if (to) q += `&endDateTime=${unix(to, true)}`;
  try {
    const j = await fetchJson(`${POS}/shops/${s.shop_id}/orders?${q}`);
    const buckets = j.aggs?.status?.buckets || [];
    const cancel = buckets.filter((b) => CANCEL.has(String(b.key))).reduce((a, b) => a + b.doc_count, 0);
    const total = j.total_entries || 0;
    return { total, successful: total - cancel, cod: j.aggs?.cod?.value || 0, market: s.market };
  } catch { return { total: 0, successful: 0, cod: 0, market: s.market }; }
}

// ĐƠN TỪ KHÁCH AI: khớp order.conversation_id với tập hội thoại AI đã trả lời (convSet).
// Trả { customers: số khách AI có đặt đơn, orders: số đơn khớp } trong khoảng ngày.
export async function aiOrderStats(pageId, convSet, { from, to } = {}) {
  const s = await shopOf(pageId);
  if (!s || !convSet || convSet.size === 0) return { customers: 0, orders: 0 };
  const matched = new Set(); let orders = 0;
  // Đơn của khách AI luôn gần đây → nếu không chỉ định from, chỉ quét 60 ngày gần nhất (nhanh).
  const f = from || ymdDaysAgo(60);
  let base = `api_key=${s.api_key}&page_id=${pageId}&page_size=100&startDateTime=${unix(f)}`;
  if (to) base += `&endDateTime=${unix(to, true)}`;
  for (let pn = 1; pn <= 12; pn++) {
    let j;
    // KHÔNG nuốt lỗi rồi trả số thiếu: ném lên để caller giữ lại giá trị lần quét trước,
    // thà hiện số cũ còn hơn cho sale thấy 0 đơn rồi lát sau lại thành 49.
    try { j = await fetchJsonRetry(`${POS}/shops/${s.shop_id}/orders?${base}&page_number=${pn}`); }
    catch (e) { throw new Error(`POS không phản hồi (page ${pageId}, trang ${pn}): ${e.message}`); }
    const d = j.data || []; if (!d.length) break;
    for (const o of d) {
      if (convSet.has(o.conversation_id) && !CANCEL.has(String(o.status))) { matched.add(o.conversation_id); orders++; }
    }
    if (d.length < 100) break;
    // Chạm trần 12 trang mà vẫn còn đơn → số đang bị CẮT CỤT, phải báo chứ không im lặng.
    if (pn === 12) console.warn(`[orders] page ${pageId}: quét chạm trần 1200 đơn, số có thể thiếu`);
  }
  return { customers: matched.size, orders };
}

// Hội thoại này ĐÃ CÓ ĐƠN chưa (bất kỳ trạng thái nào trừ hủy/hoàn)? → chống tạo đơn trùng.
const _hasOrderCache = new Map(); // convId -> {t, has}
export async function conversationHasOrder(pageId, convId) {
  if (!convId) return false;
  const hit = _hasOrderCache.get(convId);
  if (hit && Date.now() - hit.t < 300000) return hit.has; // nhớ 5 phút
  const s = await shopOf(pageId);
  if (!s) return false;
  const from = ymdDaysAgo(90);
  let has = false;
  try {
    for (let pn = 1; pn <= 6 && !has; pn++) {
      const j = await fetchJson(`${POS}/shops/${s.shop_id}/orders?api_key=${s.api_key}&page_id=${pageId}&page_size=100&startDateTime=${unix(from)}&page_number=${pn}`);
      const d = j.data || []; if (!d.length) break;
      for (const o of d) if (o.conversation_id === convId && !CANCEL.has(String(o.status))) { has = true; break; }
      if (d.length < 100) break;
    }
  } catch { /* lỗi mạng → coi như chưa có, không chặn bán */ }
  _hasOrderCache.set(convId, { t: Date.now(), has });
  return has;
}
export function markConversationOrdered(convId) { if (convId) _hasOrderCache.set(convId, { t: Date.now(), has: true }); }

// ===== TẠO ĐƠN TỰ ĐỘNG khi AI chốt (trạng thái "Chờ xác nhận" = status 0) =====
let pageProd = {}; try { pageProd = JSON.parse(fs.readFileSync(PROD_FILE, 'utf8')); } catch { pageProd = {}; }
let createdConvs = new Set();
try { createdConvs = new Set(JSON.parse(fs.readFileSync(CREATED_FILE, 'utf8'))); } catch { /* rỗng */ }
const saveCreated = () => { try { fs.writeFileSync(CREATED_FILE, JSON.stringify([...createdConvs])); } catch { /* bỏ qua */ } };

// Rút variation_id + warehouse_id + BẢNG GIÁ theo số lượng, từ đơn thật của page (mỗi page 1 SP).
// Giá lưu ở cod (= shipping_fee vì catalog giá 0). Nhớ lại để tạo đơn cho đúng tổng tiền.
async function productRef(pageId) {
  const k = String(pageId);
  if (pageProd[k] && pageProd[k].priceByQty) return pageProd[k];
  const s = await shopOf(pageId);
  if (!s) return null;
  try {
    const j = await fetchJson(`${POS}/shops/${s.shop_id}/orders?api_key=${s.api_key}&page_id=${pageId}&page_number=1&page_size=25`);
    let base = null; const priceByQty = {};
    for (const o of (j.data || [])) {
      const it = (o.items || [])[0];
      if (it?.variation_id && o.warehouse_id && !base) {
        base = { shop_id: s.shop_id, api_key: s.api_key, variation_id: it.variation_id, warehouse_id: o.warehouse_id };
      }
      const q = it?.quantity, price = o.cod || o.total_price_after_sub_discount || 0;
      if (q && price > 0 && !priceByQty[q]) priceByQty[q] = price; // giá gần nhất cho mỗi số lượng
    }
    if (base) {
      base.priceByQty = priceByQty;
      pageProd[k] = base;
      try { fs.writeFileSync(PROD_FILE, JSON.stringify(pageProd)); } catch { /* bỏ qua */ }
      return base;
    }
  } catch { /* bỏ qua */ }
  return null;
}

// Tạo đơn thật. input: {name, phone, address, city, qty}. convId = conversation_id để gắn + chống trùng.
export async function createPancakeOrder(pageId, input, convId) {
  const ref = await productRef(pageId);
  if (!ref) return { ok: false, error: 'chưa map được sản phẩm/kho của shop cho page này' };
  if (convId && createdConvs.has(convId)) return { ok: true, dedup: true }; // hội thoại đã tạo đơn → không tạo lại
  const addr = [input.address, input.city].filter(Boolean).join(', ');
  const qty = Number(input.qty) || 1;
  // GIÁ ƯU TIÊN 1: tổng tiền AI đã chốt với khách (total_price, nội tệ) → đổi sang đơn vị nhỏ
  // của POS (AED/SAR/QAR ×100; KWD/OMR/BHD ×1000). ƯU TIÊN 2: bảng giá học từ đơn cũ theo SL.
  const CCY_FACTOR = { AED: 100, SAR: 100, QAR: 100, USD: 100, KWD: 1000, OMR: 1000, BHD: 1000 };
  const pm = ref.priceByQty || {};
  const agreed = Number(input.total_price) > 0
    ? Math.round(Number(input.total_price) * (CCY_FACTOR[String(input.currency || '').toUpperCase()] ?? 100)) : 0;
  const price = agreed || pm[qty] || (pm[1] ? pm[1] * qty : 0);
  const payload = {
    page_id: String(pageId),
    bill_full_name: input.name || '',
    bill_phone_number: input.phone || '',
    shipping_address: { full_name: input.name || '', phone_number: input.phone || '', address: addr },
    items: [{ variation_id: ref.variation_id, quantity: qty }],
    status: 0, // Mới / Chờ xác nhận — nhân viên duyệt
    warehouse_id: ref.warehouse_id,
    is_free_shipping: !price, // có giá → tính tiền vào shipping_fee (cod = shipping_fee)
    ...(price ? { shipping_fee: price } : {}),
    note: 'Đơn do AI chốt — chờ nhân viên xác nhận',
    ...(convId ? { conversation_id: convId } : {}),
  };
  try {
    const r = await fetch(`${POS}/shops/${ref.shop_id}/orders?api_key=${ref.api_key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const res = await r.json().catch(() => ({}));
    if (r.status >= 200 && r.status < 300 && res.data?.id) {
      if (convId) { createdConvs.add(convId); saveCreated(); }
      return { ok: true, id: res.data.id };
    }
    return { ok: false, error: (res.message || JSON.stringify(res)).slice(0, 160) };
  } catch (e) { return { ok: false, error: e.message }; }
}

// ĐƠN CỦA 1 HỘI THOẠI — cho cột thông tin ở tab Tin nhắn (khớp conversation_id).
export async function ordersForConv(pageId, convId) {
  const s = await shopOf(pageId);
  if (!s || !convId) return [];
  try {
    const j = await fetchJson(`${POS}/shops/${s.shop_id}/orders?api_key=${s.api_key}&page_id=${pageId}&page_number=1&page_size=60`);
    return (j.data || []).filter((o) => o.conversation_id === convId).map((o) => ({
      id: o.id, status: o.status, statusName: o.status_name || String(o.status),
      cod: o.cod ?? o.total_price_after_sub_discount ?? null,
      address: o.shipping_address?.full_address || o.shipping_address?.address || '',
      name: o.bill_full_name || '', phone: o.bill_phone_number || o.shipping_address?.phone_number || '',
      tracking: o.extend_code || o.tracking_number || '', note: o.note || '', at: o.inserted_at || '',
    }));
  } catch { return []; }
}

// Đơn thật cho nhiều page cùng lúc (có cache ngắn để không gọi API dồn dập).
const _cache = new Map(); // key -> {t, data}
export async function realOrdersMulti(pageIds, range = {}) {
  const key = JSON.stringify([pageIds, range]);
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.t < 60000) return hit.data; // TTL 60s
  const out = {};
  await Promise.all(pageIds.map(async (id) => { out[String(id)] = await realOrders(id, range); }));
  _cache.set(key, { t: Date.now(), data: out });
  return out;
}
