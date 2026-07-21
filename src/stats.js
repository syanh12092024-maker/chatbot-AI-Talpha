// Thống kê BỀN (stats.json). MỘT nguồn sự thật = days[YYYY-MM-DD].
// Lọc theo ngày = tổng các ngày trong khoảng; "Tất cả" = tổng mọi ngày.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'stats.json');
let s = { days: {}, leadKeys: [], lastReplyAt: 0 };
try { if (fs.existsSync(FILE)) s = { ...s, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { /* mặc định */ }
if (!s.days) s.days = {};
if (!Array.isArray(s.leadKeys)) s.leadKeys = [];
if (!Array.isArray(s.orderKeys)) s.orderKeys = [];
const leadSet = new Set(s.leadKeys);
const orderSet = new Set(s.orderKeys); // mỗi khách chỉ tính 1 đơn chốt (chống đếm trùng)

function save() { try { fs.writeFileSync(FILE, JSON.stringify(s)); } catch (e) { console.error('[stats] lưu lỗi', e.message); } }
function today() { return new Date().toISOString().slice(0, 10); }
function bucket(d) { d = d || today(); if (!s.days[d]) s.days[d] = { replies: 0, orders: 0, leads: 0, byPage: {} }; return s.days[d]; }
function pg(map, id) { const k = String(id); if (!map[k]) map[k] = { replies: 0, orders: 0, leads: 0 }; return map[k]; }

// ── Migration 1 lần: gộp dữ liệu TỔNG cũ (lifetime / totalReplies) chưa nằm trong days
//    vào 1 bucket "trước khi lưu theo ngày" (19/07/2026), rồi bỏ cấu trúc cũ. Nhờ vậy
//    tổng theo-ngày == "Tất cả" (không còn lệch khi lọc theo khoảng).
(function migrate() {
  const old = s.lifetime || (s.totalReplies != null || s.byPage
    ? { replies: s.totalReplies || 0, orders: s.totalOrders || 0, leads: s.totalLeads || 0, byPage: s.byPage || {} }
    : null);
  const hadOld = ['lifetime', 'totalReplies', 'totalOrders', 'totalLeads', 'today', 'byPage'].some((k) => k in s);
  if (old) {
    // Tổng các ngày hiện có
    let sr = 0, so = 0, sl = 0; const sbp = {};
    for (const b of Object.values(s.days)) {
      sr += b.replies || 0; so += b.orders || 0; sl += b.leads || 0;
      for (const [id, pb] of Object.entries(b.byPage || {})) { const x = pg(sbp, id); x.replies += pb.replies || 0; x.orders += pb.orders || 0; x.leads += pb.leads || 0; }
    }
    const dR = (old.replies || 0) - sr, dL = (old.leads || 0) - sl, dO = (old.orders || 0) - so;
    if (dR > 0 || dL > 0 || dO > 0) {
      const bf = bucket('2026-07-19');
      bf.replies += Math.max(0, dR); bf.leads += Math.max(0, dL); bf.orders += Math.max(0, dO);
      for (const [id, pb] of Object.entries(old.byPage || {})) {
        const sp = sbp[String(id)] || { replies: 0, orders: 0, leads: 0 };
        const x = pg(bf.byPage, id);
        x.replies += Math.max(0, (pb.replies || 0) - sp.replies);
        x.orders += Math.max(0, (pb.orders || 0) - sp.orders);
        x.leads += Math.max(0, (pb.leads || 0) - sp.leads);
      }
    }
  }
  if (hadOld) { delete s.lifetime; delete s.totalReplies; delete s.totalOrders; delete s.totalLeads; delete s.today; delete s.byPage; save(); }
})();

function bump(field, pageId) { const b = bucket(); b[field]++; pg(b.byPage, pageId)[field]++; }
export function incReply(pageId) { bump('replies', pageId); s.lastReplyAt = Date.now(); save(); }
export function incOrder(pageId, custKey) {
  if (custKey) { const k = `${pageId}:${custKey}`; if (orderSet.has(k)) return; orderSet.add(k); s.orderKeys.push(k); }
  bump('orders', pageId); save();
}
// Đếm KHÁCH duy nhất (mỗi page+khách 1 lần) → tính TỈ LỆ CHỐT = đơn / khách.
export function incLead(pageId, custKey) {
  const key = `${pageId}:${custKey}`;
  if (leadSet.has(key)) return;
  leadSet.add(key); s.leadKeys.push(key);
  bump('leads', pageId); save();
}

// Tổng hợp theo khoảng ngày [from, to] (gồm 2 đầu). Bỏ trống = tất cả.
export function getStats({ from, to } = {}) {
  let replies = 0, orders = 0, leads = 0; const byPage = {};
  for (const [d, b] of Object.entries(s.days)) {
    if (from && d < from) continue;
    if (to && d > to) continue;
    replies += b.replies || 0; orders += b.orders || 0; leads += b.leads || 0;
    for (const [id, pb] of Object.entries(b.byPage || {})) { const x = pg(byPage, id); x.replies += pb.replies || 0; x.orders += pb.orders || 0; x.leads += pb.leads || 0; }
  }
  return { replies, orders, leads, byPage, lastReplyAt: s.lastReplyAt };
}
