// SỔ AI (audit log) — ghi MỌI hành động AI làm, append-only (JSON Lines).
// Đây là NGUỒN SỰ THẬT để thống kê lại chính xác & tra cứu lịch sử bất cứ lúc nào.
// Mỗi dòng = 1 sự kiện: { t, page, cust, name, type, ... }
//   type: reply (trả lời) | image (gửi ảnh) | order (chốt đơn) | handoff (chuyển người)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'ai-messages.jsonl');

export function logAi(pageId, custId, type, meta = {}) {
  try {
    const rec = { t: Date.now(), page: String(pageId || ''), cust: String(custId || ''), type, ...meta };
    fs.appendFileSync(FILE, JSON.stringify(rec) + '\n');
  } catch (e) { console.error('[ai-log] lỗi ghi:', e.message); }
}

export function readLog() {
  try {
    if (!fs.existsSync(FILE)) return [];
    return fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean)
      .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

// Danh sách việc CẦN SALE: các sự kiện AI chốt đơn / cần người, trong N giờ gần nhất.
// Mỗi mục kèm link mở thẳng hội thoại Pancake để sale vào nắm thông tin.
export function needSale({ hours = 48, types = ['order', 'handoff'] } = {}) {
  const since = Date.now() - hours * 3600 * 1000;
  const rows = readLog().filter((r) => r.t >= since && types.includes(r.type));
  // mới nhất trước; mỗi (page,khách,loại) chỉ lấy bản mới nhất
  const seen = new Set(); const out = [];
  for (const r of rows.reverse()) {
    const k = `${r.page}:${r.cust}:${r.type}`;
    if (seen.has(k)) continue; seen.add(k);
    out.push({
      t: r.t, page: r.page, cust: r.cust, type: r.type,
      name: r.name || '', phone: r.phone || '', city: r.city || '', qty: r.qty || null,
      reason: r.reason || '',
      link: r.cust ? `https://pancake.vn/${r.page}?customer_id=${r.cust}` : `https://pancake.vn/${r.page}`,
    });
  }
  return out;
}

// Tính lại thống kê CHÍNH XÁC từ sổ (dedup khách & đơn theo page+khách).
// from/to = 'YYYY-MM-DD' (tùy chọn). Trả { replies, leads, orders, byPage, events, lastAt }.
export function recount({ from, to } = {}) {
  const rows = readLog();
  const byPage = {};
  const seenLead = new Set(), seenOrder = new Set();
  let replies = 0, orders = 0, leads = 0, events = 0, lastAt = 0;
  const pg = (id) => (byPage[id] || (byPage[id] = { replies: 0, orders: 0, leads: 0, images: 0, handoffs: 0 }));
  for (const r of rows) {
    const day = new Date(r.t).toISOString().slice(0, 10);
    if (from && day < from) continue;
    if (to && day > to) continue;
    events++; if (r.t > lastAt) lastAt = r.t;
    const p = pg(r.page);
    if (r.type === 'reply') {
      p.replies++; replies++;
      const lk = r.page + ':' + r.cust;
      if (r.cust && !seenLead.has(lk)) { seenLead.add(lk); p.leads++; leads++; }
    } else if (r.type === 'order') {
      const ok = r.page + ':' + r.cust;
      if (!seenOrder.has(ok)) { seenOrder.add(ok); p.orders++; orders++; }
    } else if (r.type === 'image') { p.images++; }
    else if (r.type === 'handoff') { p.handoffs++; }
  }
  return { replies, leads, orders, byPage, events, lastAt };
}
