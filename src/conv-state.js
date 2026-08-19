// TRẠNG THÁI HỘI THOẠI — bền qua restart. Spec: docs/v2/00-TONG-QUAN.md §6.3
//
// v1 giữ mọi thứ trong RAM (store.js theo psid) nên restart là mất sạch: quên khách
// đang ở bước nào, quên sale đã tiếp quản, quên đã đuổi theo chưa. Đây là bộ nhớ bền
// theo HỘI THOẠI (convId của Pancake) — đơn vị đúng để hỏi "ai đang được nói".
//
// Ghi file có DỒN (debounce) + ghi tạm rồi rename để không bao giờ để lại file vỡ.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// CONV_STATE_FILE: trỏ sổ hội thoại đi chỗ khác — dùng cho TEST và cho việc chạy khô
// M12 trên bản sao kéo từ VPS. Không đặt biến này thì y hệt trước. Đọc 1 lần lúc nạp
// module (khác ai-log.js đọc mỗi lần): sổ này giữ trạng thái trong RAM, đổi file giữa
// chừng sẽ ghi trạng thái của sổ cũ đè lên sổ mới.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = process.env.CONV_STATE_FILE
  ? path.resolve(ROOT, process.env.CONV_STATE_FILE)
  : path.resolve(ROOT, 'conv-state.json');
const TMP = FILE + '.tmp';

export const S = {
  GREET: 'GREET',         // tin đầu — nhường Botcake chào
  QUALIFY: 'QUALIFY',     // đang dò nhu cầu — Fast Lane lo phần lớn
  SELLING: 'SELLING',     // AI đang bán
  CLOSING: 'CLOSING',     // đã đủ thông tin đơn — sale tiếp quản
  HANDOFF: 'HANDOFF',     // người thật / khiếu nại / hết ngân sách
  COLD: 'COLD',           // khách im — chờ đuổi theo (M12)
  POST_SALE: 'POST_SALE', // đã có đơn / đã nhận hàng — AI + Botcake đều khoá
};

export const OWNER = {
  BOTCAKE: 'BOTCAKE', FASTLANE: 'FASTLANE', AI: 'AI',
  FOLLOWUP: 'FOLLOWUP', SALE: 'SALE', RTO: 'RTO',
};

let map = new Map();
let loaded = false;
let dirty = false;
let timer = null;

const TTL_MS = 30 * 24 * 3600 * 1000; // giữ 30 ngày

function load() {
  if (loaded) return;
  loaded = true;
  try {
    if (!fs.existsSync(FILE)) return;
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    const cut = Date.now() - TTL_MS;
    for (const [k, v] of Object.entries(j)) if ((v.touchedAt || v.since || 0) >= cut) map.set(k, v);
    console.log(`[conv-state] nạp ${map.size} hội thoại từ ${path.basename(FILE)}`);
  } catch (e) { console.warn('[conv-state] đọc lỗi, bắt đầu rỗng:', e.message); }
}

function flush() {
  timer = null;
  if (!dirty) return;
  dirty = false;
  try {
    fs.writeFileSync(TMP, JSON.stringify(Object.fromEntries(map)));
    fs.renameSync(TMP, FILE); // rename là thao tác nguyên tử — không để lại file vỡ
  } catch (e) { console.error('[conv-state] ghi lỗi:', e.message); }
}

function markDirty() {
  dirty = true;
  if (!timer) timer = setTimeout(flush, 3000);
}

/** Lấy (tạo nếu chưa có) trạng thái của 1 hội thoại. */
export function getConv(convId) {
  load();
  const k = String(convId || '');
  let c = map.get(k);
  if (!c) {
    c = { state: S.GREET, owner: OWNER.BOTCAKE, since: Date.now(), touchedAt: Date.now(), humanAt: 0, followupSent: 0, orderAt: 0 };
    map.set(k, c);
    markDirty();
  }
  return c;
}

/** Cập nhật trạng thái. Ghi log khi ĐỔI trạng thái để tra ngược được. */
export function setConvState(convId, state, owner, reason, extra = {}) {
  const c = getConv(convId);
  const changed = c.state !== state;
  if (changed) {
    c.prevState = c.state;
    c.state = state;
    c.since = Date.now();
    c.lastReason = reason || '';
  }
  if (owner) c.owner = owner;
  Object.assign(c, extra);
  c.touchedAt = Date.now();
  markDirty();
  return { conv: c, changed };
}

export function touchConv(convId, extra = {}) {
  const c = getConv(convId);
  Object.assign(c, extra);
  c.touchedAt = Date.now();
  markDirty();
  return c;
}

// ─────────────────────────────────────────────────────────────────────────────
// SỔ LƯỢT AI THẬT (M11) — chỉ đếm lượt GỌI MODEL, không đếm câu Fast Lane (0 token).
// v1 đếm bằng `recentReplyCount` trong Sổ AI: mọi tin trả khách đều tính, nên một khách
// lạnh chỉ được hỏi giá bằng template cũng bị trừ hết ngân sách. Ngân sách M11 nói về
// LƯỢT ĐẮT TIỀN, nên phải có sổ riêng. Lưu trong conv-state → sống sót qua restart.
// ─────────────────────────────────────────────────────────────────────────────
export const TURN_WINDOW_MS = 24 * 3600 * 1000;

/** Ghi 1 lượt AI (gọi model) cho hội thoại. */
export function noteLlmTurn(convId, at = Date.now()) {
  const c = getConv(convId);
  const arr = Array.isArray(c.llmTurns) ? c.llmTurns : (c.llmTurns = []);
  arr.push(at);
  const cut = at - TURN_WINDOW_MS;
  c.llmTurns = arr.filter((t) => t >= cut).slice(-50);
  c.touchedAt = at;
  markDirty();
  return c.llmTurns.length;
}

/** Số lượt AI đã tiêu trong 24h qua. */
export function llmTurns24h(convId, now = Date.now()) {
  const c = getConv(convId);
  const arr = Array.isArray(c.llmTurns) ? c.llmTurns : [];
  const cut = now - TURN_WINDOW_MS;
  return arr.filter((t) => t >= cut).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// SỔ ĐUỔI THEO (M12) — "khách này đã bị đuổi theo lần nào chưa".
// Ràng buộc cứng của spec là TỐI ĐA 1 TIN/khách/hội thoại, KHÔNG CÓ LẦN 2. Đếm trong
// RAM là hỏng ngay lần restart đầu tiên (bot restart mỗi lần deploy) → phải nằm ở đây,
// trong cùng file bền với trạng thái hội thoại.
//
// Hai việc TÁCH RIÊNG vì hậu quả khác nhau:
//   followupSent  — đã GỬI TIN cho khách. Sai là spam người thật.
//   followupCallAt — chỉ ĐẨY HÀNG CHỜ SALE (nhóm đã cho SĐT/tên). Không gửi tin nào.
// Gộp một bộ đếm thì đẩy sale một lần là mất luôn quyền nhắn, và ngược lại.
// ─────────────────────────────────────────────────────────────────────────────

/** Ghi nhận đã đuổi theo. kind: 'message' (gửi tin) | 'sale' (đẩy hàng chờ sale). */
export function noteFollowup(convId, kind = 'message', at = Date.now()) {
  const c = getConv(convId);
  if (kind === 'sale') { c.followupCallAt = at; }
  else { c.followupSent = (c.followupSent || 0) + 1; c.followupAt = at; }
  c.touchedAt = at;
  markDirty();
  return { followupSent: c.followupSent || 0, followupAt: c.followupAt || 0, followupCallAt: c.followupCallAt || 0 };
}

/**
 * Xem trạng thái hội thoại mà KHÔNG tạo bản ghi mới. `getConv` tạo-nếu-chưa-có, nên
 * chạy khô M12 trên 1.000 khách giả sẽ đẻ ra 1.000 hội thoại rác trong file thật.
 * Trả `null` khi chưa từng biết hội thoại này.
 */
export function peekConv(convId) {
  load();
  return map.get(String(convId || '')) || null;
}

/** Hội thoại này đã được đuổi theo chưa. Đọc thuần — không tạo bản ghi. */
export function followupInfo(convId) {
  const c = peekConv(convId);
  if (!c) return { followupSent: 0, followupAt: 0, followupCallAt: 0, state: null, owner: null };
  return {
    followupSent: c.followupSent || 0,
    followupAt: c.followupAt || 0,
    followupCallAt: c.followupCallAt || 0,
    state: c.state, owner: c.owner,
  };
}

/** Ghi 1 lượt của nhánh CƠ HỘI hậu bán (M13) — ngân sách TÁCH khỏi ngân sách bán mới. */
export function noteOppTurn(convId) {
  const c = getConv(convId);
  c.oppTurns = (c.oppTurns || 0) + 1;
  c.touchedAt = Date.now();
  markDirty();
  return c.oppTurns;
}

/** Thống kê cho dashboard (M18). */
export function convStateStats() {
  load();
  const byState = {}; const byOwner = {};
  for (const c of map.values()) {
    byState[c.state] = (byState[c.state] || 0) + 1;
    byOwner[c.owner] = (byOwner[c.owner] || 0) + 1;
  }
  return { total: map.size, byState, byOwner };
}

export function allConvStates() { load(); return map; }

/** Dọn bản ghi cũ — gọi định kỳ để file không phình vô hạn. */
export function pruneConvStates() {
  load();
  const cut = Date.now() - TTL_MS;
  let n = 0;
  for (const [k, v] of map) if ((v.touchedAt || 0) < cut) { map.delete(k); n++; }
  if (n) markDirty();
  return n;
}

// Ghi nốt khi tắt tiến trình — không mất trạng thái của lượt cuối.
for (const sig of ['SIGINT', 'SIGTERM', 'beforeExit']) {
  process.on(sig, () => { try { flush(); } catch { /* tắt máy, im lặng */ } });
}
