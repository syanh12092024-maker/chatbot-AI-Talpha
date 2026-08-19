// BÁO CÁO ĐỊNH KỲ THEO TỪNG PAGE — soạn từ Sổ AI (ai-messages.jsonl), gửi vào nhóm WhatsApp.
//
// Vì sao tự tính thay vì gọi /admin/api/stats: API lọc theo NGÀY UTC (recount dùng toISOString),
// lệch 7 tiếng so với ngày làm việc ở VN → "hôm qua" trong báo cáo sẽ không khớp với hôm qua
// của người đọc. Ở đây cắt mốc theo GIỜ VIỆT NAM để con số đúng với ngày sale thực sự làm.
import { readLog } from './ai-log.js';

const VN = 7 * 3600e3; // VN không có giờ mùa hè nên offset cố định, khỏi phụ thuộc TZ của máy

// Mốc 00:00 giờ VN của ngày chứa thời điểm t (trả về ms UTC)
export function vnDayStart(t = Date.now()) {
  return Math.floor((t + VN) / 86400e3) * 86400e3 - VN;
}
export const vnDate = (t) => new Date(t + VN).toISOString().slice(0, 10).split('-').reverse().slice(0, 2).join('/');
export const vnHm = (t) => new Date(t + VN).toISOString().slice(11, 16);

// Đếm số liệu trong khoảng [fromMs, toMs) theo từng page — cùng quy tắc với recount():
// leads = số KHÁCH khác nhau được AI trả lời; orders = số khách có đơn (không đếm trùng).
export function statsBetween(fromMs, toMs) {
  const byPage = {};
  const seenLead = new Set(), seenOrder = new Set();
  let replies = 0, leads = 0, orders = 0;
  const pg = (id) => (byPage[id] || (byPage[id] = { replies: 0, leads: 0, orders: 0 }));
  for (const r of readLog()) {
    if (r.t < fromMs || r.t >= toMs) continue;
    const p = pg(String(r.page));
    if (r.type === 'reply') {
      p.replies++; replies++;
      const k = r.page + ':' + r.cust;
      if (r.cust && !seenLead.has(k)) { seenLead.add(k); p.leads++; leads++; }
    } else if (r.type === 'order') {
      const k = r.page + ':' + r.cust;
      if (!seenOrder.has(k)) { seenOrder.add(k); p.orders++; orders++; }
    }
  }
  return { byPage, replies, leads, orders };
}

// Tên page lấy từ chính server đang chạy (đã có sẵn danh sách Pancake + KB).
export async function fetchPageNames(port = process.env.PORT || 3100) {
  const u = process.env.ADMIN_USER, p = process.env.ADMIN_PASS;
  const headers = u && p ? { Authorization: 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64') } : {};
  try {
    const res = await fetch(`http://localhost:${port}/admin/api/pages`, { headers });
    const list = await res.json();
    return new Map((Array.isArray(list) ? list : []).map((x) => [String(x.id), x.name || String(x.id)]));
  } catch { return new Map(); }
}

const rate = (o, l) => (l > 0 ? Math.round((o / l) * 100) : 0);

// Soạn nội dung tin. kind: 'morning' = tổng kết HÔM QUA · 'afternoon' = từ 00:00 hôm nay tới giờ.
export function buildReport({ kind, names, now = Date.now() }) {
  const today0 = vnDayStart(now);
  const from = kind === 'morning' ? today0 - 86400e3 : today0;
  const to = kind === 'morning' ? today0 : now;
  const s = statsBetween(from, to);

  // Xếp theo SỐ KHÁCH (đúng thứ tự người đọc thấy trên màn hình), đơn nhiều hơn thì lên trước.
  const rows = Object.entries(s.byPage)
    .map(([id, b]) => ({ id, name: String(names.get(id) || id).trim(), ...b, rate: rate(b.orders, b.leads) }))
    .filter((r) => r.replies > 0)
    .sort((a, b) => b.orders - a.orders || b.leads - a.leads || b.replies - a.replies);

  const head = kind === 'morning'
    ? `📊 *AI Closer — tổng kết ngày ${vnDate(from)}*`
    : `📊 *AI Closer — cập nhật ${vnDate(from)} tới ${vnHm(to)}*`;

  const L = [head, ''];
  L.push(`*Tổng:* ${s.replies} tin AI · ${s.leads} khách · ${s.orders} đơn · chốt ${rate(s.orders, s.leads)}%`);
  L.push('');
  if (!rows.length) {
    L.push('_Không có hoạt động nào trong khoảng này._');
  } else {
    L.push('*Theo page* — tin · khách · đơn · chốt');
    rows.forEach((r, i) => {
      L.push(`${i + 1}. *${r.name}*\n    ${r.replies} tin · ${r.leads} khách · ${r.orders} đơn · ${r.rate}%`);
    });
  }
  L.push('');
  L.push(`_${rows.length} page có hoạt động · giờ VN_`);
  return L.join('\n');
}
