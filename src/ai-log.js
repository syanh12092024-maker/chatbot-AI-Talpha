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
    if (type === 'reply' && _idxBuilt) _idxPush(rec.page, rec.cust, rec.t); // cập nhật chỉ mục đếm lượt
  } catch (e) { console.error('[ai-log] lỗi ghi:', e.message); }
}

// ---- ĐẾM LƯỢT BỀN VỮNG (nguyên tắc #8): số tin AI đã trả cho 1 khách trong N giờ,
// đọc từ Sổ AI (file) nên SỐNG SÓT QUA RESTART — bộ đếm RAM không còn bị "reset chui".
// Chỉ mục xây 1 lần lúc gọi đầu, sau đó logAi tự cập nhật → không quét lại file mỗi tin.
const _replyIdx = new Map(); // 'page:cust' -> [timestamps]
let _idxBuilt = false;
function _idxPush(page, cust, t) {
  const k = page + ':' + cust;
  let arr = _replyIdx.get(k);
  if (!arr) { arr = []; _replyIdx.set(k, arr); }
  arr.push(t);
}
export function recentReplyCount(pageId, custId, windowMs = 24 * 3600 * 1000) {
  if (!_idxBuilt) {
    for (const r of readLog()) if (r.type === 'reply') _idxPush(String(r.page), String(r.cust), r.t);
    _idxBuilt = true;
  }
  const arr = _replyIdx.get(String(pageId) + ':' + String(custId)) || [];
  const since = Date.now() - windowMs;
  return arr.filter((t) => t >= since).length;
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
  const all = readLog();
  // Mã hội thoại Pancake (pageId_psid) theo (page,khách) — lấy từ BẤT KỲ sự kiện nào có ghi conv.
  // Đường link đúng của Pancake là ?c_id=<conv id>; customer_id (UUID) KHÔNG mở được chat.
  const convOf = new Map();
  for (const r of all) if (r.conv) convOf.set(`${r.page}:${r.cust}`, r.conv);
  const rows = all.filter((r) => r.t >= since && types.includes(r.type));
  // mới nhất trước; mỗi (page,khách,loại) chỉ lấy bản mới nhất
  const seen = new Set(); const out = [];
  for (const r of rows.reverse()) {
    const k = `${r.page}:${r.cust}:${r.type}`;
    if (seen.has(k)) continue; seen.add(k);
    const conv = r.conv || convOf.get(`${r.page}:${r.cust}`) || '';
    out.push({
      t: r.t, page: r.page, cust: r.cust, type: r.type,
      name: r.name || '', phone: r.phone || '', city: r.city || '', qty: r.qty || null,
      reason: r.reason || '', kind: r.kind || '',
      link: conv ? `https://pancake.vn/${r.page}?c_id=${conv}` : `https://pancake.vn/${r.page}`,
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
