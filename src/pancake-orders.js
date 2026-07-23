// Đọc ĐƠN HÀNG THẬT từ Pancake POS (mỗi thị trường 1 shop: api_key + shop_id).
// Cho phép thống kê số đơn thật theo page + theo khoảng ngày → khớp với Pancake.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHOPS_FILE = path.join(DIR, 'pancake-shops.json');   // [{market, shop_id, api_key}] — KHÔNG commit
const CACHE_FILE = path.join(DIR, 'page-shop-cache.json'); // pageId -> shop (dò 1 lần rồi nhớ)
const POS = 'https://pos.pages.fm/api/v1';
const CANCEL = new Set(['4', '5', '6', '7', '8']); // đang hoàn / đã hoàn / hủy / xóa / chuyển hoàn

let SHOPS = [];
try { SHOPS = JSON.parse(fs.readFileSync(SHOPS_FILE, 'utf8')); } catch { SHOPS = []; }
let pageShop = {};
try { pageShop = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { pageShop = {}; }
const saveCache = () => { try { fs.writeFileSync(CACHE_FILE, JSON.stringify(pageShop)); } catch { /* bỏ qua */ } };

// fetch có timeout — 1 call chậm/treo không kéo sập cả request.
async function fetchJson(url, ms = 12000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { const r = await fetch(url, { signal: ac.signal }); return await r.json(); }
  finally { clearTimeout(t); }
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
    try { j = await fetchJson(`${POS}/shops/${s.shop_id}/orders?${base}&page_number=${pn}`); } catch { break; }
    const d = j.data || []; if (!d.length) break;
    for (const o of d) {
      if (convSet.has(o.conversation_id) && !CANCEL.has(String(o.status))) { matched.add(o.conversation_id); orders++; }
    }
    if (d.length < 100) break;
  }
  return { customers: matched.size, orders };
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
