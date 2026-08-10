// M14 · ORDER BRIDGE — nối câu chốt của AI với việc tạo đơn thật.
// Spec: docs/v2/03-TANG-TANG-CHOT.md § M14 · prompt luồng: docs/v2/prompts/L7-MINER-ORDER.md
//
// HIỆN TRẠNG: `AUTO_CREATE_ORDER=0` từ 07/08/2026 — AI chốt lời, ghi chú Pancake, NHÂN VIÊN
// tạo đơn tay. Module này làm khâu tay đó nhanh nhất có thể mà không đánh đổi độ an toàn.
//
// HAI CHẾ ĐỘ, đổi bằng ĐÚNG một biến môi trường, không sửa dòng code nào:
//   A (mặc định, AUTO_CREATE_ORDER=0) — ghi chú theo MẪU CHUẨN máy đọc được + hàng chờ
//     "chờ tạo đơn"; nút [Tạo đơn Pancake] trên dashboard điền sẵn mọi trường.
//   B (AUTO_CREATE_ORDER=1)           — `tools.js` gọi thẳng `createPancakeOrder` như v1.
//     Code chế độ B đã sẵn sàng nhưng KHÔNG được bật ở luồng này.
//
// LUẬT SỐ 1 CỦA DỰ ÁN: **không bao giờ xoá đơn Pancake**. Module này chỉ TẠO và ĐỌC;
// "bỏ khỏi hàng chờ" chỉ đánh dấu trong sổ của mình, không đụng tới đơn nào.
//
// THÀ KHÔNG TẠO CÒN HƠN TẠO NHẦM: mọi đường tạo đơn đều phải qua ĐỦ 4 cửa chống trùng
// và cửa đối chiếu bảng giá. Bất kỳ cửa nào dương → dừng.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { allowedPrices, extractMoney } from './outbound-guard.js';
import { getKBForPage } from './kb.js';
import { readLog } from './ai-log.js';
import { ORDER_STOP_TAGS } from './conv-owner.js';
import { pkAddNote } from './pancake.js';
import { ordersEnabled, ordersForConv, createPancakeOrder } from './pancake-orders.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE_FILE = () => path.resolve(ROOT, process.env.ORDER_QUEUE_FILE || 'ai-order-queue.json');
const QUEUE_MAX = 2000;

/** Chế độ hiện hành — chỉ đọc env, không có đường nào khác bật/tắt được. */
export const orderMode = () => (config.autoCreateOrder ? 'B' : 'A');

// ═══════════════════════════════════════════════════════════════════════════
// ① MẪU GHI CHÚ CHUẨN — người đọc được, máy cũng đọc được
// ═══════════════════════════════════════════════════════════════════════════
// Ghi chú tự do (bản cũ) buộc sale phải ĐỌC rồi GÕ LẠI từng trường sang form Pancake.
// Mẫu cố định dưới đây cho phép dashboard đọc ngược ra đủ trường → 1 click là xong.

export const NOTE_HEADER = '🛒 AI ĐÃ CHỐT — CHỜ TẠO ĐƠN';
const FIELDS = [
  ['name', 'Tên'],
  ['phone', 'SĐT'],
  ['address', 'Địa chỉ'],
  ['variant', 'Gói'],
  ['qty', 'SL'],
  ['total', 'Tổng'],
  ['cod', 'COD'],
];
const PAD = Math.max(...FIELDS.map(([, l]) => l.length)) + 2;

const oneLine = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

/**
 * Dựng ghi chú Pancake theo mẫu chuẩn.
 * @param {object} o {name, phone, address, city, variant, qty, total_price, currency, cod_confirmed, priceChecked}
 */
export function buildOrderNote(o = {}) {
  const addr = [o.address, o.city].filter(Boolean).map(oneLine).join(', ');
  const total = Number(o.total_price) > 0
    ? `${Number(o.total_price)}${o.currency ? ' ' + String(o.currency).toUpperCase() : ''}${o.priceChecked ? '  (đã đối chiếu KB)' : '  (⚠️ CHƯA đối chiếu được KB)'}`
    : '(chưa có)';
  const val = {
    name: oneLine(o.name) || '(chưa có)',
    phone: oneLine(o.phone) || '(chưa có)',
    address: addr || '(chưa có)',
    variant: oneLine(o.variant) || '(gói lẻ)',
    qty: String(Number(o.qty) || 1),
    total,
    cod: o.cod_confirmed ? '✅ khách xác nhận' : '❌ CHƯA xác nhận',
  };
  const lines = FIELDS.map(([k, label]) => `${(label + ':').padEnd(PAD, ' ')}${val[k]}`);
  return [NOTE_HEADER, ...lines].join('\n');
}

const LABEL_TO_KEY = new Map(FIELDS.map(([k, l]) => [l.toLowerCase(), k]));

/** Đọc ngược ghi chú chuẩn → các trường. Ghi chú tự do (bản cũ) trả về {} chứ không ném lỗi. */
export function parseOrderNote(text) {
  const out = {};
  for (const raw of String(text || '').split('\n')) {
    const m = raw.match(/^\s*([^:]{1,16}):\s*(.*)$/);
    if (!m) continue;
    const key = LABEL_TO_KEY.get(m[1].trim().toLowerCase());
    if (!key) continue;
    const v = m[2].trim();
    if (!v || v === '(chưa có)') continue;
    if (key === 'qty') out.qty = Number(v) || 1;
    else if (key === 'total') {
      const n = Number((v.match(/[\d.,]+/) || [''])[0].replace(/,/g, ''));
      if (Number.isFinite(n) && n > 0) out.total_price = n;
      const cur = v.match(/\b([A-Z]{3})\b/);
      if (cur) out.currency = cur[1];
      out.priceChecked = /đã đối chiếu/.test(v);
    } else if (key === 'cod') out.cod_confirmed = v.startsWith('✅');
    else out[key] = v;
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// ② CỬA TIỀN — tổng phải khớp ĐÚNG MỘT gói trong bảng giá
// ═══════════════════════════════════════════════════════════════════════════
// Xuất xứ: vụ khách Priscela Amon bị báo gấp đôi giá → huỷ đơn + block page. M09 đã gác ở
// chiều RA của tin nhắn; ở đây gác lần nữa ngay trước khi con số biến thành đơn thật.

/**
 * @returns {{ok:boolean, code:string, reason:string, allowed:number[], total:number}}
 *   code: OK · NO_TOTAL · NO_PRICE_TABLE · MISMATCH
 */
export function checkTotal(kb, total) {
  const n = Number(total);
  const allowed = [...allowedPrices(kb)].sort((a, b) => a - b);
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, code: 'NO_TOTAL', reason: 'Đơn không có tổng tiền — không tạo đơn mù.', allowed, total: n || 0 };
  }
  if (!allowed.length) {
    // Không có bảng giá thì KHÔNG có gì để đối chiếu. Thà chặn còn hơn tin con số AI nêu.
    return { ok: false, code: 'NO_PRICE_TABLE', reason: 'KB của page chưa có bảng giá — không đối chiếu được tổng tiền.', allowed, total: n };
  }
  if (!allowed.includes(n)) {
    return { ok: false, code: 'MISMATCH', reason: `Tổng ${n} không khớp gói nào trong bảng giá (hợp lệ: ${allowed.join(', ')}).`, allowed, total: n };
  }
  return { ok: true, code: 'OK', reason: '', allowed, total: n };
}

/** Tổng tiền suy ra từ một câu (dùng khi đơn cũ chỉ còn ghi chú tự do). */
export const totalFromText = (text) => extractMoney(text)[0] || 0;

// ═══════════════════════════════════════════════════════════════════════════
// ③ CHỐNG ĐƠN TRÙNG — ĐỦ BỐN NGUỒN, bất kỳ nguồn nào dương là DỪNG
// ═══════════════════════════════════════════════════════════════════════════

// Dấu hiệu đơn tạo bởi FB Commerce / công cụ ngoài, đọc từ nội dung hội thoại.
const FB_COMMERCE = /(you have placed an order|your order (?:has been|is) (?:placed|received|confirmed|created)|order confirmation|order\s*(?:number|no\.?|#)\s*[:#]?\s*\w|đơn hàng của bạn|bạn đã đặt hàng|تم(?:\s+استلام)?\s+طلبك|رقم الطلب)/i;

/**
 * Kiểm đủ 4 nguồn trước khi tạo đơn.
 *   1. Sổ AI có type='order' cho khách/hội thoại này chưa
 *   2. ordersForConv() — Pancake POS đã có đơn chưa
 *   3. Thẻ trạng thái đơn trên hội thoại (ORDER_STOP_TAGS)
 *   4. Nội dung hội thoại có dấu hiệu đơn FB Commerce
 *
 * Lỗi mạng ở nguồn 2 KHÔNG được coi là "sạch": trả `unknown` và cửa tạo đơn vẫn đóng.
 */
export async function checkDuplicate({
  pageId, convId, custId, tags = [], msgs = [], rows,
  fetchOrders = ordersForConv, hasPos = ordersEnabled,
} = {}) {
  const sources = [];
  let unknown = null;

  // ① Sổ AI
  for (const r of (rows || readLog())) {
    if (r.type !== 'order') continue;
    if (String(r.page) !== String(pageId)) continue;
    if ((convId && r.conv === convId) || (custId && String(r.cust) === String(custId))) {
      sources.push({ src: 'so-ai', detail: `Sổ AI đã ghi đơn lúc ${new Date(r.t).toISOString().slice(0, 16).replace('T', ' ')}` });
      break;
    }
  }

  // ② Pancake POS
  if (convId && hasPos()) {
    try {
      const list = await fetchOrders(pageId, convId) || [];
      const alive = list.filter((o) => !CANCELLED.has(String(o.status)));
      if (alive.length) sources.push({ src: 'pos', detail: `POS đã có đơn #${alive[0].id} (${alive[0].statusName || alive[0].status})` });
    } catch (e) {
      unknown = `không đọc được đơn POS: ${e.message}`;
    }
  }

  // ③ Thẻ trạng thái đơn trên hội thoại
  const stopTag = (tags || []).find((t) => ORDER_STOP_TAGS.has(Number(t)));
  if (stopTag !== undefined) sources.push({ src: 'the-trang-thai', detail: `hội thoại mang thẻ trạng thái đơn (${stopTag})` });

  // ④ Dấu hiệu đơn FB Commerce trong nội dung
  for (const m of (msgs || [])) {
    const t = String(m?.text ?? m?.original_message ?? m?.message ?? '');
    if (FB_COMMERCE.test(t)) { sources.push({ src: 'fb-commerce', detail: `hội thoại có dấu hiệu đơn ngoài: "${t.replace(/\s+/g, ' ').trim().slice(0, 60)}"` }); break; }
  }

  return { dup: sources.length > 0, sources, unknown };
}
// Cùng tập trạng thái huỷ/hoàn với pancake-orders.js (đơn đã huỷ không phải "đã có đơn").
const CANCELLED = new Set(['4', '5', '6', '7', '8']);

// ═══════════════════════════════════════════════════════════════════════════
// ④ HÀNG CHỜ "AI ĐÃ CHỐT — CHỜ TẠO ĐƠN"
// ═══════════════════════════════════════════════════════════════════════════
// Sổ AI đã ghi sự kiện `order`, nhưng KHÔNG lưu địa chỉ chi tiết và tổng tiền — hai trường
// sale cần nhất. Hàng chờ này giữ đủ để dashboard điền sẵn form, không bắt sale đọc lại chat.

export function readQueue() {
  try {
    const f = QUEUE_FILE();
    if (!fs.existsSync(f)) return [];
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return Array.isArray(j) ? j : (Array.isArray(j.items) ? j.items : []);
  } catch (e) { console.warn('[order-bridge] đọc hàng chờ lỗi:', e.message); return []; }
}

function writeQueue(items) {
  try {
    const keep = items.slice(-QUEUE_MAX);
    fs.writeFileSync(QUEUE_FILE(), JSON.stringify({ items: keep }, null, 2));
    return true;
  } catch (e) { console.error('[order-bridge] lưu hàng chờ lỗi:', e.message); return false; }
}

const queueId = (pageId, convId, custId, t) => `${pageId}_${convId || custId || 'x'}_${t}`;

/**
 * Ghi nhận một ca AI vừa chốt: ghi chú Pancake theo mẫu chuẩn + đưa vào hàng chờ.
 * Gọi từ `tools.js` (create_draft_order) ở CẢ HAI chế độ — chế độ B chỉ khác ở chỗ đơn
 * đã được tạo trước đó nên bản ghi vào thẳng trạng thái `created`.
 *
 * KHÔNG ném lỗi ra ngoài: ghi chú/hàng chờ hỏng không được phép làm hỏng lượt chốt.
 */
export async function recordClosedOrder(pageId, custId, input = {}, convId = '', opt = {}) {
  const now = opt.now || Date.now();
  const kb = opt.kb || safeKb(pageId);
  const price = checkTotal(kb, input.total_price);
  const note = buildOrderNote({ ...input, priceChecked: price.ok });

  const item = {
    id: queueId(pageId, convId, custId, now),
    t: now,
    page: String(pageId), conv: convId || '', cust: String(custId || ''),
    name: oneLine(input.name), phone: oneLine(input.phone),
    address: oneLine(input.address), city: oneLine(input.city),
    variant: oneLine(input.variant), qty: Number(input.qty) || 1,
    total_price: Number(input.total_price) || 0,
    currency: String(input.currency || '').toUpperCase(),
    cod_confirmed: !!input.cod_confirmed,
    priceCheck: { ok: price.ok, code: price.code, reason: price.reason, allowed: price.allowed },
    mode: orderMode(),
    status: opt.created ? 'created' : 'pending',
    orderId: opt.orderId || '',
    note,
  };

  const items = readQueue();
  // Cùng hội thoại chốt lại lần nữa → cập nhật bản ghi cũ, không đẻ dòng thứ hai.
  const i = items.findIndex((x) => x.page === item.page && x.conv && x.conv === item.conv && x.status === 'pending');
  if (i >= 0) items[i] = { ...items[i], ...item, id: items[i].id, t: items[i].t };
  else items.push(item);
  writeQueue(items);

  if (!opt.skipNote) {
    try { await (opt.addNote || pkAddNote)(pageId, custId, note); }
    catch (e) { console.warn('[order-bridge] ghi chú Pancake lỗi:', e.message); }
  }
  if (!price.ok) console.warn(`[order-bridge] ⚠️ page ${pageId}: ${price.reason} — nút Tạo đơn sẽ bị khoá cho ca này`);
  return item;
}

function safeKb(pageId) { try { return getKBForPage(pageId) || {}; } catch { return {}; } }

function updateItem(id, patch) {
  const items = readQueue();
  const i = items.findIndex((x) => x.id === id);
  if (i < 0) return null;
  items[i] = { ...items[i], ...patch };
  writeQueue(items);
  return items[i];
}

/** Bỏ khỏi hàng chờ (sale đã tự tạo đơn / khách huỷ). KHÔNG đụng tới đơn Pancake nào. */
export function skipQueueItem(id, reason = '', by = 'dashboard') {
  const r = updateItem(id, { status: 'skipped', skipReason: String(reason).slice(0, 200), decidedBy: by, decidedAt: Date.now() });
  return r ? { ok: true, item: r } : { ok: false, error: 'không có mục này trong hàng chờ' };
}

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ TẠO ĐƠN THẬT — một click, nhưng phải qua đủ cửa
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Soi trước khi tạo (dry-run) — dashboard gọi để hiện đèn xanh/đỏ trước khi người bấm.
 * @returns {{ok:boolean, blocks:Array<{code:string,reason:string}>, price:object, dedup:object}}
 */
export async function precheck(item, opt = {}) {
  const kb = opt.kb || safeKb(item.page);
  const price = checkTotal(kb, item.total_price);
  const dedup = await checkDuplicate({
    pageId: item.page, convId: item.conv, custId: item.cust,
    tags: opt.tags || [], msgs: opt.msgs || [], rows: opt.rows,
    fetchOrders: opt.fetchOrders, hasPos: opt.hasPos,
  });

  const blocks = [];
  if (item.status === 'created') blocks.push({ code: 'ALREADY_CREATED', reason: `Mục này đã tạo đơn${item.orderId ? ` #${item.orderId}` : ''}.` });
  if (dedup.dup) for (const s of dedup.sources) blocks.push({ code: `DUP_${s.src.toUpperCase()}`, reason: s.detail });
  if (dedup.unknown) blocks.push({ code: 'DUP_UNKNOWN', reason: `${dedup.unknown} — chưa chắc chắn thì KHÔNG tạo.` });
  if (!price.ok) blocks.push({ code: price.code, reason: price.reason });
  if (!item.cod_confirmed) blocks.push({ code: 'NO_COD', reason: 'Khách chưa xác nhận COD.' });
  if (!item.phone || item.phone.replace(/\D/g, '').length < 7) blocks.push({ code: 'BAD_PHONE', reason: 'Số điện thoại không hợp lệ.' });
  if (!item.address || item.address.length < 6) blocks.push({ code: 'BAD_ADDRESS', reason: 'Địa chỉ chưa đủ cụ thể.' });

  return { ok: blocks.length === 0, blocks, price, dedup };
}

/**
 * Tạo đơn Pancake từ một mục hàng chờ. Chỉ chạy khi precheck sạch — không có tham số nào
 * bỏ qua được cửa này (cố ý: người bấm nhầm cũng không tạo được đơn trùng/sai tiền).
 */
export async function createFromQueue(id, opt = {}) {
  const item = readQueue().find((x) => x.id === id);
  if (!item) return { ok: false, error: 'không có mục này trong hàng chờ' };

  const pre = await precheck(item, opt);
  if (!pre.ok) return { ok: false, error: pre.blocks.map((b) => b.reason).join(' · '), blocks: pre.blocks };

  const create = opt.createOrder || createPancakeOrder;
  const r = await create(item.page, {
    name: item.name, phone: item.phone, address: item.address, city: item.city,
    qty: item.qty, total_price: item.total_price, currency: item.currency,
  }, item.conv);
  if (!r.ok) return { ok: false, error: r.error || 'Pancake từ chối tạo đơn' };

  const saved = updateItem(id, {
    status: 'created', orderId: r.id || '', createdAt: Date.now(),
    createdBy: opt.by || 'dashboard', dedupOnCreate: r.dedup ? 'pancake-orders' : '',
  });
  return { ok: true, id: r.id || '', dedup: !!r.dedup, item: saved };
}

/** Số liệu nhanh cho dashboard. */
export function queueStats() {
  const items = readQueue();
  const by = { pending: 0, created: 0, skipped: 0 };
  let blocked = 0;
  for (const it of items) {
    by[it.status] = (by[it.status] || 0) + 1;
    if (it.status === 'pending' && !it.priceCheck?.ok) blocked++;
  }
  return { total: items.length, ...by, priceBlocked: blocked, mode: orderMode() };
}
