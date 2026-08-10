// SỔ AI (audit log) — ghi MỌI hành động AI làm, append-only (JSON Lines).
// Đây là NGUỒN SỰ THẬT để thống kê lại chính xác & tra cứu lịch sử bất cứ lúc nào.
// Mỗi dòng = 1 sự kiện: { t, page, cust, name, type, ... }
//   type: reply (trả lời) | image (gửi ảnh) | order (chốt đơn) | handoff (chuyển người)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getPageConfig, getScriptDoc } from './kb.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// AI_LOG_FILE: trỏ sổ đi chỗ khác — dùng cho TEST và cho việc chạy lại số liệu trên BẢN SAO
// Sổ AI kéo từ VPS mà không đụng sổ đang chạy. Không đặt biến này thì y hệt trước.
// Đọc env mỗi lần (không chốt lúc nạp module) để test đổi được sổ giữa chừng.
// LƯU Ý: hai chỉ mục RAM bên dưới xây 1 lần — đổi sổ giữa chừng thì chúng vẫn giữ số của
// sổ cũ. Chỉ đổi trong test / script chạy lại số liệu, không đổi khi bot đang chạy.
const logFile = () => (process.env.AI_LOG_FILE
  ? path.resolve(ROOT, process.env.AI_LOG_FILE)
  : path.resolve(ROOT, 'ai-messages.jsonl'));

export function logAi(pageId, custId, type, meta = {}) {
  try {
    const rec = { t: Date.now(), page: String(pageId || ''), cust: String(custId || ''), type, ...meta };
    // M20: mọi tin AI phải nói được "bản kịch bản nào đẻ ra nó" — nếu không có trường này
    // thì không cắt được chi phí theo kịch bản, và A/B (M17) không có gì để so.
    // Gắn Ở ĐÂY chứ không ở chỗ gọi: chỗ gọi (pancake-poll) là file của luồng khác.
    if (type === 'reply' && rec.scriptVersion === undefined) rec.scriptVersion = scriptVersionOf(rec.page);
    fs.appendFileSync(logFile(), JSON.stringify(rec) + '\n');
    if (type === 'reply' && _idxBuilt && isLlmReply(rec)) _idxPush(rec.page, rec.cust, rec.t); // chỉ mục đếm lượt — Fast Lane không tính (xem ghi chú dưới)
    if (type === 'reply' && _textIdxBuilt) _textPush(rec.page, rec.cust, rec.text); // chỉ mục tin AI (M05)
  } catch (e) { console.error('[ai-log] lỗi ghi:', e.message); }
}

// ---- BẢN KỊCH BẢN (scriptVersion) ------------------------------------------------
// Sổ AI phải nói được "bản kịch bản nào đẻ ra tin này" — thiếu nó thì M17 A/B không có
// gì để so và M20 không cắt được "bản nào ăn tiền".
//
// GỘP 11/08/2026 — kiểm tra chéo ③ của luồng gộp: M02 (Script Studio, L3) nay ĐÃ có bản
// SỐ thật (`v1`, `v2`… trong kho phiên bản), nên lấy thẳng số đó làm mã. Trước đó L1 băm
// nội dung vì M02 chưa tồn tại; để hai bên đánh version khác nhau thì Script Studio nói
// "v3" còn Sổ AI ghi "9f2a1c04" — cùng một kịch bản, hai cái tên, không đối chiếu được.
//   'v<N>'    = bản LIVE trong kho phiên bản của M02 (nguồn ưu tiên)
//   8 ký tự hex = ĐƯỜNG LUI, băm nội dung cho page chưa có kho phiên bản
//   'none'    = page CHƯA có kịch bản riêng (cả 3 trường đều rỗng)
//   'unknown' = không đọc được cấu hình page (KB chưa nạp xong) — không im lặng ghi sai
export function scriptVersionOfConfig(cfg = {}) {
  const raw = [cfg.greeting || '', cfg.tone || '', cfg.salesPrompt || ''].join('\n');
  if (!raw.trim()) return 'none';
  return crypto.createHash('sha1').update(raw, 'utf8').digest('hex').slice(0, 8);
}

// Cache 60s/page: logAi chạy trên đường gửi tin, không được đọc lại file kịch bản mỗi lượt.
const _svCache = new Map(); // pageId -> { v, at }
export function scriptVersionOf(pageId, now = Date.now()) {
  const key = String(pageId || '');
  const hit = _svCache.get(key);
  if (hit && now - hit.at < 60e3) return hit.v;
  let v;
  try {
    // Kho phiên bản M02 tự nhận bản đang chạy trong kb-overrides làm v1 (backfill), nên
    // 37/38 page có sẵn số ngay từ tin đầu tiên — không cần chờ marketer bấm Lưu.
    const live = getScriptDoc(key)?.live?.version;
    v = live ? `v${live}` : scriptVersionOfConfig(getPageConfig(key));
  } catch { v = 'unknown'; }
  _svCache.set(key, { v, at: now });
  return v;
}

// ---- ĐẾM LƯỢT BỀN VỮNG (nguyên tắc #8): số tin AI đã trả cho 1 khách trong N giờ,
// đọc từ Sổ AI (file) nên SỐNG SÓT QUA RESTART — bộ đếm RAM không còn bị "reset chui".
// Chỉ mục xây 1 lần lúc gọi đầu, sau đó logAi tự cập nhật → không quét lại file mỗi tin.
//
// ⚠️ CHỈ ĐẾM LƯỢT GỌI MODEL (kiểm tra chéo ④ của luồng gộp, 11/08/2026). Tin do Fast Lane
// soạn cũng ghi `type:'reply'` vào Sổ AI, nhưng nó tốn 0 token — tính nó vào ngân sách lượt
// là trừ tiền cho việc không tốn tiền: một khách chỉ mới bấm START và hỏi giá bằng template
// đã mất 2/4 lượt, tới lúc thật sự muốn mua thì AI đã bị cắt.
// M11 (conv-state.llmTurns24h) đã có sổ riêng đúng như vậy; đây là ĐƯỜNG LUI (LEAD_BUDGET=0
// hoặc kênh không có hội thoại Pancake: web/local-chat) nên phải đếm cùng một định nghĩa,
// nếu không thì lúc lùi cấu hình để cầm máu lại rước thêm một lỗi khác.
// Bản ghi CŨ không có trường `lane` — thời đó chưa có Fast Lane nên đều là lượt gọi model.
const _replyIdx = new Map(); // 'page:cust' -> [timestamps]
let _idxBuilt = false;
const isLlmReply = (rec) => !rec.lane || rec.lane === 'AI';
function _idxPush(page, cust, t) {
  const k = page + ':' + cust;
  let arr = _replyIdx.get(k);
  if (!arr) { arr = []; _replyIdx.set(k, arr); }
  arr.push(t);
}
export function recentReplyCount(pageId, custId, windowMs = 24 * 3600 * 1000) {
  if (!_idxBuilt) {
    for (const r of readLog()) if (r.type === 'reply' && isLlmReply(r)) _idxPush(String(r.page), String(r.cust), r.t);
    _idxBuilt = true;
  }
  const arr = _replyIdx.get(String(pageId) + ':' + String(custId)) || [];
  const since = Date.now() - windowMs;
  return arr.filter((t) => t >= since).length;
}

// ---- TIN AI ĐÃ GỬI GẦN ĐÂY cho 1 khách (M05 dùng để phân biệt "tin của mình" với
// "tin do người thật gõ"). Sổ AI lưu 80 ký tự đầu — đủ để so khớp phần đầu.
// Cùng cách làm với chỉ mục đếm lượt: xây 1 lần, sau đó logAi tự đẩy vào.
const _textIdx = new Map(); // 'page:cust' -> [text]
let _textIdxBuilt = false;
function _textPush(page, cust, text) {
  if (!text) return;
  const k = page + ':' + cust;
  let arr = _textIdx.get(k);
  if (!arr) { arr = []; _textIdx.set(k, arr); }
  arr.push(text);
  if (arr.length > 30) arr.splice(0, arr.length - 30); // chỉ cần khúc đuôi
}
export function recentAiTexts(pageId, custId, n = 12) {
  if (!_textIdxBuilt) {
    for (const r of readLog()) if (r.type === 'reply' && r.text) _textPush(String(r.page), String(r.cust), r.text);
    _textIdxBuilt = true;
  }
  const arr = _textIdx.get(String(pageId) + ':' + String(custId)) || [];
  return arr.slice(-n);
}

export function readLog() {
  try {
    const f = logFile();
    if (!fs.existsSync(f)) return [];
    return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)
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

// DANH SÁCH HỘI THOẠI GẦN ĐÂY từ Sổ AI — để tab "Tin nhắn" SỐNG SÓT QUA RESTART
// (bộ nhớ RAM trắng sau restart, nhưng sổ thì còn). Mỗi (page,khách) 1 dòng, mới nhất trước.
let _rcCache = { t: 0, key: '', data: null };
export function recentConversations({ hours = 72 } = {}) {
  const key = String(hours);
  if (_rcCache.data && _rcCache.key === key && Date.now() - _rcCache.t < 10000) return _rcCache.data; // cache 10s
  const since = Date.now() - hours * 3600e3;
  const map = new Map(); // page:cust -> gộp
  for (const r of readLog()) {
    if (!r.cust) continue;
    const k = r.page + ':' + r.cust;
    let g = map.get(k);
    if (!g) { g = { page: String(r.page), cust: String(r.cust), name: '', conv: '', t: 0, lastText: '', lastType: '', hasOrder: false }; map.set(k, g); }
    if (r.name) g.name = r.name;
    if (r.conv) g.conv = r.conv;
    if (r.type === 'order') g.hasOrder = true;
    if (r.t >= g.t) { g.t = r.t; g.lastType = r.type; if (r.text) g.lastText = r.text; }
  }
  const out = [...map.values()].filter((g) => g.t >= since).sort((a, b) => b.t - a.t);
  _rcCache = { t: Date.now(), key, data: out };
  return out;
}

// HỒ SƠ 1 KHÁCH từ Sổ AI: tên, SĐT/địa chỉ (từ đơn AI chốt), lý do chuyển người cuối, số lượt 24h.
export function custProfile(pageId, custId) {
  const out = { name: '', phone: '', city: '', qty: null, lastHandoffReason: '', lastHandoffAt: 0, replies24h: 0, orderAt: 0 };
  const since24 = Date.now() - 24 * 3600e3;
  for (const r of readLog()) {
    if (String(r.page) !== String(pageId) || String(r.cust) !== String(custId)) continue;
    if (r.name) out.name = r.name;
    if (r.type === 'order') { if (r.phone) out.phone = r.phone; if (r.city) out.city = r.city; if (r.qty) out.qty = r.qty; out.orderAt = r.t; }
    else if (r.type === 'handoff') { out.lastHandoffReason = r.reason || ''; out.lastHandoffAt = r.t; }
    else if (r.type === 'reply' && r.t >= since24) out.replies24h++;
  }
  return out;
}

// TOKEN & CHI PHÍ theo page — cộng từ số ĐO ghi kèm event 'reply' (tin/tout/cread/calls,
// bắt đầu ghi 06/08/2026; tin cũ hơn không có số nên `measured` < `replies` là bình thường).
export function tokenStats({ from, to } = {}) {
  const byPage = {};
  let replies = 0, measured = 0, tin = 0, tout = 0, cread = 0, calls = 0, orders = 0;
  const seenOrder = new Set(); // 1 khách/page chỉ tính 1 đơn (cùng luật với recount)
  const pg = (id) => byPage[id] || (byPage[id] = { tin: 0, tout: 0, cread: 0, calls: 0, replies: 0, measured: 0, orders: 0 });
  for (const r of readLog()) {
    if (r.type !== 'reply' && r.type !== 'order') continue;
    const day = new Date(r.t).toISOString().slice(0, 10);
    if (from && day < from) continue;
    if (to && day > to) continue;
    // ĐƠN đếm trong CÙNG khoảng ngày với chi phí — để suy ra "1 đơn tốn bao nhiêu tiền AI".
    if (r.type === 'order') {
      const k = r.page + ':' + r.cust;
      if (!seenOrder.has(k)) { seenOrder.add(k); pg(r.page).orders++; orders++; }
      continue;
    }
    const p = pg(r.page);
    replies++; p.replies++;
    if (r.tin === undefined) continue; // tin trước khi bật đo
    measured++; p.measured++;
    p.tin += r.tin || 0; p.tout += r.tout || 0; p.cread += r.cread || 0; p.calls += r.calls || 0;
    tin += r.tin || 0; tout += r.tout || 0; cread += r.cread || 0; calls += r.calls || 0;
  }
  return { byPage, replies, measured, orders, tin, tout, cread, calls };
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
