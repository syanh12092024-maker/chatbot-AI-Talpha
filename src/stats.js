// Thống kê BỀN (stats.json). Lưu 2 lớp:
//  - lifetime: tổng toàn thời gian (để lọc "Tất cả" nhanh).
//  - days[YYYY-MM-DD]: số liệu theo NGÀY (để BỘ LỌC THEO NGÀY tổng hợp khoảng bất kỳ).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'stats.json');
let s = { lifetime: { replies: 0, orders: 0, leads: 0, byPage: {} }, days: {}, leadKeys: [], lastReplyAt: 0 };
try {
  if (fs.existsSync(FILE)) {
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    s = { ...s, ...j };
    // Chuyển từ cấu trúc cũ (totalReplies/today/byPage phẳng) → lifetime.
    if (!j.lifetime && (j.totalReplies != null || j.byPage)) {
      s.lifetime = { replies: j.totalReplies || 0, orders: j.totalOrders || 0, leads: j.totalLeads || 0, byPage: j.byPage || {} };
    }
  }
} catch { /* mặc định */ }
if (!s.lifetime) s.lifetime = { replies: 0, orders: 0, leads: 0, byPage: {} };
if (!s.lifetime.byPage) s.lifetime.byPage = {};
if (!s.days) s.days = {};
if (!Array.isArray(s.leadKeys)) s.leadKeys = [];
const leadSet = new Set(s.leadKeys);

function save() { try { fs.writeFileSync(FILE, JSON.stringify(s)); } catch (e) { console.error('[stats] lưu lỗi', e.message); } }
function today() { return new Date().toISOString().slice(0, 10); }
function dayBucket() { const d = today(); if (!s.days[d]) s.days[d] = { replies: 0, orders: 0, leads: 0, byPage: {} }; return s.days[d]; }
function pg(map, id) { const k = String(id); if (!map[k]) map[k] = { replies: 0, orders: 0, leads: 0 }; return map[k]; }

// Cộng đồng thời vào lifetime + ngày hôm nay (per-page cả 2 lớp).
function bump(field, pageId) {
  s.lifetime[field]++; pg(s.lifetime.byPage, pageId)[field]++;
  const b = dayBucket(); b[field]++; pg(b.byPage, pageId)[field]++;
}
export function incReply(pageId) { bump('replies', pageId); s.lastReplyAt = Date.now(); save(); }
export function incOrder(pageId) { bump('orders', pageId); save(); }
// Đếm KHÁCH duy nhất (mỗi page+khách 1 lần) → tính TỈ LỆ CHỐT = đơn / khách.
export function incLead(pageId, custKey) {
  const key = `${pageId}:${custKey}`;
  if (leadSet.has(key)) return;
  leadSet.add(key); s.leadKeys.push(key);
  bump('leads', pageId); save();
}

// Tổng hợp theo khoảng ngày [from, to] (YYYY-MM-DD, gồm cả 2 đầu).
// Không truyền from/to → trả lifetime (toàn thời gian).
export function getStats({ from, to } = {}) {
  if (!from && !to) {
    const l = s.lifetime;
    return { replies: l.replies, orders: l.orders, leads: l.leads, byPage: l.byPage, lastReplyAt: s.lastReplyAt };
  }
  let replies = 0, orders = 0, leads = 0; const byPage = {};
  for (const [d, b] of Object.entries(s.days)) {
    if (from && d < from) continue;
    if (to && d > to) continue;
    replies += b.replies || 0; orders += b.orders || 0; leads += b.leads || 0;
    for (const [id, pb] of Object.entries(b.byPage || {})) {
      const x = pg(byPage, id); x.replies += pb.replies || 0; x.orders += pb.orders || 0; x.leads += pb.leads || 0;
    }
  }
  return { replies, orders, leads, byPage, lastReplyAt: s.lastReplyAt };
}
