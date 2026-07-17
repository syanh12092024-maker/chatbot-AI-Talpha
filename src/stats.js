// Thống kê BỀN (lưu file stats.json) — không mất khi restart.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'stats.json');
let s = {
  totalReplies: 0, totalOrders: 0, totalLeads: 0,
  today: { date: '', replies: 0, orders: 0, leads: 0 },
  byPage: {}, leadKeys: [], lastReplyAt: 0,
};
try { if (fs.existsSync(FILE)) s = { ...s, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { /* mặc định */ }
// Set để tra "khách này đã tính lead chưa" trong O(1); đồng bộ với mảng leadKeys khi lưu.
const leadSet = new Set(s.leadKeys || []);
// Backfill khi nạp file cũ (chưa có trường leads) để không ra undefined/NaN.
s.today.replies = s.today.replies || 0; s.today.orders = s.today.orders || 0; s.today.leads = s.today.leads || 0;
if (!Array.isArray(s.leadKeys)) s.leadKeys = [];

function save() { try { fs.writeFileSync(FILE, JSON.stringify(s)); } catch (e) { console.error('[stats] lưu lỗi', e.message); } }
function today() { return new Date().toISOString().slice(0, 10); }
function rollDay() { const t = today(); if (s.today.date !== t) s.today = { date: t, replies: 0, orders: 0, leads: 0 }; }
function pg(id) { const k = String(id); if (!s.byPage[k]) s.byPage[k] = { replies: 0, orders: 0, leads: 0 }; return s.byPage[k]; }

export function incReply(pageId) {
  rollDay(); s.totalReplies++; s.today.replies++;
  pg(pageId).replies++; s.lastReplyAt = Date.now(); save();
}
export function incOrder(pageId) {
  rollDay(); s.totalOrders++; s.today.orders++;
  pg(pageId).orders++; save();
}
// Đếm KHÁCH duy nhất (lead) mà AI đã tư vấn — mỗi (page, khách) chỉ tính 1 lần.
// Dùng để tính TỈ LỆ CHỐT = đơn chốt / số khách.
export function incLead(pageId, custKey) {
  const key = `${pageId}:${custKey}`;
  if (leadSet.has(key)) return;
  leadSet.add(key); s.leadKeys.push(key);
  rollDay(); s.totalLeads++; s.today.leads++;
  pg(pageId).leads++; save();
}
export function getStats() {
  rollDay();
  return {
    totalReplies: s.totalReplies, totalOrders: s.totalOrders, totalLeads: s.totalLeads,
    todayReplies: s.today.replies, todayOrders: s.today.orders, todayLeads: s.today.leads,
    byPage: s.byPage, lastReplyAt: s.lastReplyAt,
  };
}
