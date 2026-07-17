// Thống kê BỀN (lưu file stats.json) — không mất khi restart.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'stats.json');
let s = { totalReplies: 0, totalOrders: 0, today: { date: '', replies: 0, orders: 0 }, byPage: {}, lastReplyAt: 0 };
try { if (fs.existsSync(FILE)) s = { ...s, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { /* dùng mặc định */ }

function save() { try { fs.writeFileSync(FILE, JSON.stringify(s)); } catch (e) { console.error('[stats] lưu lỗi', e.message); } }
function today() { return new Date().toISOString().slice(0, 10); }
function rollDay() { const t = today(); if (s.today.date !== t) s.today = { date: t, replies: 0, orders: 0 }; }

export function incReply(pageId) {
  rollDay(); s.totalReplies++; s.today.replies++;
  const p = s.byPage[String(pageId)] || { replies: 0, orders: 0 };
  p.replies++; s.byPage[String(pageId)] = p;
  s.lastReplyAt = Date.now(); save();
}
export function incOrder(pageId) {
  rollDay(); s.totalOrders++; s.today.orders++;
  const p = s.byPage[String(pageId)] || { replies: 0, orders: 0 };
  p.orders++; s.byPage[String(pageId)] = p; save();
}
export function getStats() {
  rollDay();
  return {
    totalReplies: s.totalReplies, totalOrders: s.totalOrders,
    todayReplies: s.today.replies, todayOrders: s.today.orders,
    byPage: s.byPage, lastReplyAt: s.lastReplyAt,
  };
}
