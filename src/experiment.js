// M17 · EXPERIMENT ENGINE — A/B kịch bản, có luật phân thắng bại và rollback tự động.
// Spec: docs/v2/04-TANG-TU-TIEN-HOA.md § M17 · vòng 2: docs/v2/prompts/L5-AB-FOLLOWUP.md
//
// VÌ SAO MODULE NÀY TỒN TẠI: không có nó thì M16 là "tối ưu trong bóng tối" — đổi kịch bản
// mà không biết tốt lên hay tệ đi. Và M12 (đuổi theo) là module ĐẦU TIÊN chủ động nhắn
// khách khi khách không hỏi gì; bật nó mà không có nhánh đối chứng thì mãi mãi không biết
// nó tăng đơn hay chỉ làm phiền người ta.
//
// BA QUYẾT ĐỊNH THIẾT KẾ, và lý do:
//
// ① CHIA NHÁNH THEO KHÁCH, KHÔNG THEO TIN.  `HASH(customerId) % 100`. Một khách phải nằm
//    nguyên một nhánh suốt hội thoại — chia theo tin thì lượt 1 dùng bản A, lượt 2 bản B,
//    và con số cuối cùng không nói lên điều gì cả.
//
// ② KHÔNG CÓ BẢNG SỐ RIÊNG.  Nguồn số duy nhất là Sổ AI, y như M20. Chi phí thì GỌI
//    `economics()` chứ không tự cộng lại — hai công thức chi phí song song là cách chắc
//    chắn nhất để hai màn hình cãi nhau rồi không ai tin số nào.
//
// ③ NHÁNH TÍNH BẰNG HASH, `scriptVersion` DÙNG ĐỂ ĐỐI CHỨNG.  Sổ AI có ghi `scriptVersion`
//    (L1 làm), nhưng đó là bản kịch bản THỰC SỰ đã sinh ra tin — nó chỉ khớp với nhánh khi
//    ai đó đã đấu dây phần render prompt. Lấy hash làm nguồn phân nhánh thì đo được ngay từ
//    hôm nay; đối chiếu ngược với `scriptVersion` cho ra `mismatch` — con số nói thẳng
//    "phần đấu dây đã chạy chưa", thay vì im lặng chia nhầm.
//
// ⚠️ Module này KHÔNG tự đổi kịch bản của page. Nó chia nhánh, đo, phán, và hạ bản thua.
//    Việc render prompt theo nhánh nằm ở `handler.js`/`prompts.js` — file của luồng khác
//    (docs/v2/08-SONG-SONG.md §3). `branchFor()` là cái móc để bên đó gọi khi tới lượt.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { readLog } from './ai-log.js';
import { economics } from './economics.js';
import { blockedLog } from './outbound-guard.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = () => (process.env.EXPERIMENTS_FILE
  ? path.resolve(ROOT, process.env.EXPERIMENTS_FILE)
  : path.resolve(ROOT, 'experiments.json'));

export const STATUS = { RUNNING: 'RUNNING', ARCHIVED: 'ARCHIVED' };

// ── Luật phân thắng bại (spec §M17) ─────────────────────────────────────────
export const RULES = {
  minDays: Number(process.env.AB_MIN_DAYS || 7),
  minCustomers: Number(process.env.AB_MIN_CUSTOMERS || 100),
  winCloseRateRel: 1.20,   // B thắng khi closeRate cao hơn ≥20% TƯƠNG ĐỐI
  maxCostRel: 1.20,        // …và costPerOrder không cao hơn quá 20%
  // Rollback tự động — không chờ hết 7 ngày
  rbMinHours: 48,
  rbMinCustomers: 50,
  rbCloseRateDrop: 0.70,   // closeRate B < 70% của A  →  tụt >30%
  rbBlockedRel: 3,         // tỷ lệ tin bị M09 chặn tăng >3 lần
  rbCostRel: 2,            // costPerOrder tăng >2 lần
};

// Luật 2/8/9 của M09 — lọt một tin là rollback NGAY, không cần chờ số liệu.
// (2 = lọt tiếng Việt · 8 = ký tự vô hình né Meta · 9 = doạ khách)
export const FATAL_GUARD_RULES = new Set(['VIETNAMESE', 'INVISIBLE_CHARS', 'THREAT']);

// ─────────────────────────────────────────────────────────────────────────────
// Kho — active theo page + lịch sử + SỔ ĐEN
// ─────────────────────────────────────────────────────────────────────────────

const empty = () => ({ active: {}, history: [], blacklist: [] });
let db = null;

function load() {
  if (db) return db;
  try { db = { ...empty(), ...JSON.parse(fs.readFileSync(FILE(), 'utf8')) }; }
  catch { db = empty(); }
  return db;
}
function save() {
  try {
    const f = FILE();
    fs.writeFileSync(f + '.tmp', JSON.stringify(db, null, 2));
    fs.renameSync(f + '.tmp', f); // rename nguyên tử — không bao giờ để lại file vỡ
  } catch (e) { console.error('[experiment] ghi lỗi:', e.message); }
}

/** Chỉ dùng trong test — quên kho đang nạp để đọc lại từ EXPERIMENTS_FILE mới. */
export function _resetForTest() { db = null; }

export function activeExperiment(pageId) { return load().active[String(pageId)] || null; }
export function allExperiments() { const d = load(); return { active: { ...d.active }, history: [...d.history] }; }
export function blacklist(pageId) {
  const d = load();
  return pageId == null ? [...d.blacklist] : d.blacklist.filter((b) => String(b.pageId) === String(pageId));
}
export function isBlacklisted(pageId, version) {
  return blacklist(pageId).some((b) => String(b.version) === String(version));
}

/**
 * Mở một thí nghiệm. MỖI PAGE CHỈ MỘT THÍ NGHIỆM TẠI MỘT THỜI ĐIỂM (spec §M17):
 * chạy hai cái cùng lúc thì hai bản đè lên nhau và không tách được cái nào có tác dụng.
 */
export function startExperiment({ pageId, name, a, b, split = 50, now = Date.now(), meta = {} }) {
  const id = String(pageId);
  const d = load();
  if (d.active[id]) throw new Error(`page ${id} đang chạy thí nghiệm "${d.active[id].name}" — mỗi page chỉ 1 thí nghiệm tại một thời điểm`);
  if (!a || !b) throw new Error('thiếu bản A (đang LIVE) hoặc bản B (bản mới)');
  if (isBlacklisted(id, b)) throw new Error(`bản "${b}" đã nằm trong sổ đen của page ${id} — không thử lại`);
  const exp = {
    id: `${id}-${now}`, pageId: id, name: String(name || `${a} → ${b}`),
    a: String(a), b: String(b),
    split: Math.max(1, Math.min(99, Number(split) || 50)),
    salt: `${id}:${now}`,           // hash gắn với THÍ NGHIỆM, không phải page
    status: STATUS.RUNNING, startedAt: now, endedAt: 0,
    winner: null, reason: '', meta,
  };
  d.active[id] = exp;
  save();
  console.log(`[experiment] page ${id}: mở "${exp.name}" — ${exp.split}% khách vào nhánh B (${b})`);
  return exp;
}

/** Đóng thí nghiệm. `winner`: 'A' | 'B' | 'TIE'. Bản thua vào SỔ ĐEN nếu `blacklistLoser`. */
export function stopExperiment(pageId, { winner = 'A', reason = '', now = Date.now(), blacklistLoser = false } = {}) {
  const id = String(pageId);
  const d = load();
  const exp = d.active[id];
  if (!exp) return null;
  exp.status = STATUS.ARCHIVED; exp.endedAt = now; exp.winner = winner; exp.reason = reason;
  delete d.active[id];
  d.history.push(exp);
  if (blacklistLoser && winner !== 'B') {
    d.blacklist.push({ pageId: id, version: exp.b, expId: exp.id, reason, at: now });
  }
  save();
  console.log(`[experiment] page ${id}: đóng "${exp.name}" — thắng: ${winner}. ${reason}`);
  return exp;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chia nhánh — HASH(customerId) % 100
//
// sha1 chứ không phải bộ băm tự chế: cần phân bố đều thật sự (bộ băm cộng dồn cho
// customerId toàn chữ số của Pancake ra kết quả dồn cục), và cần ỔN ĐỊNH qua restart,
// qua máy khác, qua lần chạy lại số liệu sau này. Rẻ: ~1µs, gọi mỗi lượt là không thấy.
// ─────────────────────────────────────────────────────────────────────────────

const _pctCache = new Map(); // 'salt|cust' -> 0..99

export function hashPercent(customerId, salt = '') {
  const k = `${salt}|${customerId}`;
  const hit = _pctCache.get(k);
  if (hit !== undefined) return hit;
  const h = crypto.createHash('sha1').update(k, 'utf8').digest();
  const v = h.readUInt32BE(0) % 100;
  if (_pctCache.size > 50000) _pctCache.clear();
  _pctCache.set(k, v);
  return v;
}

/** Nhánh của MỘT khách. Thuần hàm — cùng đầu vào luôn ra cùng kết quả, mãi mãi. */
export function assignBranch(customerId, { split = 50, salt = '' } = {}) {
  if (customerId == null || customerId === '') return 'A'; // không định danh được → giữ bản cũ
  return hashPercent(String(customerId), salt) < split ? 'B' : 'A';
}

/**
 * Móc cho đường gửi tin: khách này nên dùng bản kịch bản nào?
 * Trả `null` khi page không chạy thí nghiệm nào → bên gọi cứ dùng bản LIVE như thường.
 */
export function branchFor(pageId, customerId) {
  const exp = activeExperiment(pageId);
  if (!exp) return null;
  const branch = assignBranch(customerId, { split: exp.split, salt: exp.salt });
  return { expId: exp.id, name: exp.name, branch, scriptVersion: branch === 'B' ? exp.b : exp.a };
}

// ─────────────────────────────────────────────────────────────────────────────
// ĐO — 5 chỉ số theo thứ tự ưu tiên của spec
//   1 closeRate · 2 costPerOrder · 3 replies/order · 4 tỷ lệ handoff · 5 im sau lượt 1
// ─────────────────────────────────────────────────────────────────────────────

const rowsInWindow = (rows, exp, now) => rows.filter((r) => String(r.page) === String(exp.pageId)
  && r.t >= exp.startedAt && r.t <= (exp.endedAt || now));

/**
 * Cắt Sổ AI theo nhánh rồi đo.
 * @returns {{A:object, B:object, elapsedH:number, mismatch:number, versioned:number}}
 */
export function branchMetrics({ pageId, exp = activeExperiment(pageId), rows, now = Date.now(), prices } = {}) {
  if (!exp) throw new Error(`page ${pageId} không có thí nghiệm nào`);
  const P = prices || config.aiPrices;
  const all = rowsInWindow(rows || readLog(), exp, now);

  const branchOf = (cust) => assignBranch(cust, { split: exp.split, salt: exp.salt });
  const side = { A: [], B: [] };
  // ĐỐI CHỨNG: tin nào có ghi `scriptVersion` đúng bằng bản A hoặc B thì phải trùng nhánh
  // mà hash đã gán. Lệch = phần đấu dây prompt chưa chạy (hoặc chạy sai) → phải nhìn thấy,
  // không được im lặng.
  let versioned = 0; let mismatch = 0;

  for (const r of all) {
    const br = branchOf(r.cust);
    side[br].push(r);
    if (r.type !== 'reply') continue;
    const sv = r.scriptVersion == null ? '' : String(r.scriptVersion);
    if (sv !== exp.a && sv !== exp.b) continue;
    versioned++;
    if (sv !== (br === 'B' ? exp.b : exp.a)) mismatch++;
  }

  const measure = (br) => {
    const rs = side[br];
    // CHI PHÍ: gọi M20, không tự cộng lại (spec L5 §"đã có M20 → đừng tính lại chi phí").
    const t = economics({ rows: rs, groupBy: ['page'], prices: P, fromMs: exp.startedAt, toMs: (exp.endedAt || now) + 1 }).totals;

    // Chỉ số 4 & 5 — M20 chỉ xử lý reply/order nên hai cái này phải tự đếm.
    const replyCount = new Map();       // cust -> số tin AI
    const handoffCust = new Set();
    const orderCust = new Set();
    for (const r of rs) {
      if (r.type === 'reply') replyCount.set(r.cust, (replyCount.get(r.cust) || 0) + 1);
      // Chỉ số 4 đo "bản kịch bản mới có đẩy việc sang sale nhiều hơn không". Cú đẩy sale
      // của M12 (`lane: 'FOLLOWUP'`) KHÔNG do kịch bản đẻ ra — nó do khách đã cho SĐT mà
      // chưa chốt. Tính vào đây thì bật M12 lên là mọi nhánh cùng phình chỉ số handoff và
      // không còn đọc được gì.
      else if (r.type === 'handoff') { if (String(r.lane || '').toUpperCase() !== 'FOLLOWUP') handoffCust.add(r.cust); }
      else if (r.type === 'order') orderCust.add(r.cust);
    }
    const customers = t.leads;
    // "Im sau lượt 1" = hội thoại chỉ có ĐÚNG một tin AI và không ra đơn. Đây là XẤP XỈ:
    // Sổ AI không ghi tin của khách, nên "khách có nhắn lại mà AI không trả lời" bị tính
    // nhầm vào đây. Xấp xỉ dùng CHUNG cho cả hai nhánh nên vẫn so được A với B — chỉ đừng
    // đọc nó như con số tuyệt đối.
    let silent1 = 0;
    for (const [cust, n] of replyCount) if (n === 1 && !orderCust.has(cust)) silent1++;

    const pc = (a, b) => (b > 0 ? +((a / b) * 100).toFixed(1) : null);
    return {
      branch: br,
      scriptVersion: br === 'B' ? exp.b : exp.a,
      customers, replies: t.replies, orders: t.orders,
      closeRatePct: t.closeRatePct,
      vndPerOrder: t.vndPerOrder, usdPerOrder: t.usdPerOrder,
      repliesPerOrder: t.repliesPerOrder,
      handoffs: handoffCust.size, handoffPct: pc(handoffCust.size, customers),
      silentAfterFirst: silent1, silentAfterFirstPct: pc(silent1, customers),
      vnd: t.vnd,
    };
  };

  return {
    exp, prices: P,
    elapsedH: (Math.min(now, exp.endedAt || now) - exp.startedAt) / 3600e3,
    versioned, mismatch,
    A: measure('A'), B: measure('B'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PHÂN THẮNG BẠI
// ─────────────────────────────────────────────────────────────────────────────

const rel = (b, a) => (a == null || b == null || a === 0 ? null : b / a);

/**
 * ≥7 ngày VÀ ≥100 khách/nhánh mới phán.
 *   B thắng : closeRate cao hơn ≥20% TƯƠNG ĐỐI  VÀ  costPerOrder không cao hơn quá 20%
 *   Hoà     : giữ A. Đổi mà không hơn thì đừng đổi.
 *   B thua  : rollback + ghi sổ đen.
 */
export function decideWinner({ pageId, exp = activeExperiment(pageId), rows, now = Date.now(), prices } = {}) {
  const m = branchMetrics({ pageId, exp, rows, now, prices });
  const { A, B } = m;
  const days = m.elapsedH / 24;
  const enoughTime = days >= RULES.minDays;
  const enoughPeople = A.customers >= RULES.minCustomers && B.customers >= RULES.minCustomers;

  if (!enoughTime || !enoughPeople) {
    return {
      ready: false, winner: null, metrics: m,
      reason: `chưa đủ mẫu — ${days.toFixed(1)}/${RULES.minDays} ngày · A ${A.customers}, B ${B.customers}/${RULES.minCustomers} khách`,
    };
  }

  const crRel = rel(B.closeRatePct, A.closeRatePct);
  const costRel = rel(B.vndPerOrder, A.vndPerOrder);

  // A chưa ra đơn nào (closeRate 0) thì phép chia tương đối vô nghĩa. Quy ước: B chỉ thắng
  // khi B THẬT SỰ ra đơn — không phải "0 vs 0 thì cái nào cũng hơn".
  const closeBetter = A.closeRatePct
    ? (crRel != null && crRel >= RULES.winCloseRateRel)
    : (B.orders > 0);
  // Chưa đo được chi phí của một trong hai bên (chưa có đơn) → không lấy chi phí ra bác bỏ.
  const costOk = costRel == null ? true : costRel <= RULES.maxCostRel;

  if (closeBetter && costOk) {
    return {
      ready: true, winner: 'B', metrics: m,
      reason: `B thắng — closeRate ${A.closeRatePct}% → ${B.closeRatePct}%${crRel ? ` (×${crRel.toFixed(2)})` : ''}, chi phí/đơn ${costRel == null ? 'chưa đo được' : `×${costRel.toFixed(2)}`}`,
    };
  }
  // "Thua" (phải vào sổ đen) khác "hoà" (chỉ giữ A): chỉ ghi sổ đen khi B THỰC SỰ kém hơn.
  const worse = A.closeRatePct != null && B.closeRatePct != null && B.closeRatePct < A.closeRatePct;
  return {
    ready: true, winner: worse ? 'A' : 'TIE', metrics: m, blacklist: worse,
    reason: worse
      ? `B thua — closeRate ${A.closeRatePct}% → ${B.closeRatePct}%${costRel && costRel > RULES.maxCostRel ? `, chi phí/đơn ×${costRel.toFixed(2)}` : ''}`
      : `hoà — giữ bản cũ (closeRate ${A.closeRatePct}% vs ${B.closeRatePct}%${!costOk ? `, chi phí/đơn ×${costRel.toFixed(2)}` : ''})`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLLBACK TỰ ĐỘNG — không chờ hết 7 ngày
//
// Về việc quy tin bị M09 chặn về nhánh nào: `recordBlocked` chỉ ghi TÊN khách
// (`ctx.custName`), không ghi customerId — mà `handler.js`/`outbound-guard.js` là file của
// luồng khác nên không sửa được để ghi thêm. Cầu nối: Sổ AI có CẢ `name` lẫn `cust` cho
// cùng một khách → dựng bảng tên→id từ chính sổ. Tên không tra được thì tin đó vào ô
// "không quy được nhánh" và ĐƯỢC ĐẾM RA, chứ không lặng lẽ biến mất.
// ─────────────────────────────────────────────────────────────────────────────

function blockedByBranch({ exp, rows, blocked, now }) {
  const nameToCust = new Map();
  for (const r of rows) if (r.name && r.cust) nameToCust.set(String(r.name).trim().toLowerCase(), String(r.cust));

  const out = { A: 0, B: 0, unattributed: 0, fatal: { A: 0, B: 0, unattributed: 0 }, fatalRules: [] };
  for (const b of blocked) {
    if (String(b.page) !== String(exp.pageId)) continue;
    if (b.t < exp.startedAt || b.t > (exp.endedAt || now)) continue;
    const cust = nameToCust.get(String(b.cust || '').trim().toLowerCase());
    const br = cust ? assignBranch(cust, { split: exp.split, salt: exp.salt }) : 'unattributed';
    out[br]++;
    if (FATAL_GUARD_RULES.has(b.rule)) { out.fatal[br]++; out.fatalRules.push({ branch: br, rule: b.rule, at: b.t, cust: b.cust }); }
  }
  return out;
}

/**
 * Bốn cửa rollback của spec. Trả { rollback, reasons[], metrics, blocked }.
 * Không tự đóng thí nghiệm — `sweepExperiments()` mới là chỗ ra tay.
 */
export function checkRollback({ pageId, exp = activeExperiment(pageId), rows, blocked, now = Date.now(), prices } = {}) {
  if (!exp) return { rollback: false, reasons: [], metrics: null };
  const all = rows || readLog();
  const m = branchMetrics({ pageId, exp, rows: all, now, prices });
  const { A, B } = m;
  const win = rowsInWindow(all, exp, now);
  const blk = blockedByBranch({ exp, rows: win, blocked: blocked || blockedLog(500), now });

  const reasons = [];

  // ① closeRate tụt >30% so với A — chỉ xét khi đã đủ 48h và ≥50 khách MỖI nhánh.
  //    Thiếu một trong hai thì con số chỉ là nhiễu, và rollback vì nhiễu là tự phá A/B.
  if (m.elapsedH >= RULES.rbMinHours && A.customers >= RULES.rbMinCustomers && B.customers >= RULES.rbMinCustomers) {
    const r = rel(B.closeRatePct, A.closeRatePct);
    if (r != null && r < RULES.rbCloseRateDrop) {
      reasons.push(`closeRate nhánh B tụt ${Math.round((1 - r) * 100)}% so với A (${A.closeRatePct}% → ${B.closeRatePct}%) sau ${Math.round(m.elapsedH)}h, ${B.customers} khách`);
    }
  }

  // ② tỷ lệ tin bị M09 chặn tăng >3 lần
  const rateA = A.replies > 0 ? blk.A / A.replies : null;
  const rateB = B.replies > 0 ? blk.B / B.replies : null;
  if (rateA != null && rateB != null && rateA > 0 && rateB / rateA > RULES.rbBlockedRel) {
    reasons.push(`tin bị M09 chặn ở nhánh B gấp ${(rateB / rateA).toFixed(1)} lần nhánh A (${blk.B}/${B.replies} vs ${blk.A}/${A.replies})`);
  }

  // ③ vi phạm luật 2/8/9 của M09 — một tin là đủ.
  //    Ca không quy được nhánh CŨNG tính. Lý do: hướng an toàn của rollback là quay về bản
  //    cũ đang chạy tốt; bỏ qua một tin doạ khách/lọt tiếng Việt vì "chưa chắc của nhánh B"
  //    thì cái giá là mất page. Ghi rõ trong lý do để người đọc biết đây là ca fail-safe.
  if (blk.fatal.B > 0 || blk.fatal.unattributed > 0) {
    const rs = [...new Set(blk.fatalRules.map((f) => f.rule))].join(', ');
    reasons.push(`có ${blk.fatal.B + blk.fatal.unattributed} tin vi phạm luật 2/8/9 của M09 (${rs})${blk.fatal.B === 0 ? ' — không quy được về nhánh nào, hạ bản mới cho chắc' : ''}`);
  }

  // ④ costPerOrder tăng >2 lần
  const cr = rel(B.vndPerOrder, A.vndPerOrder);
  if (cr != null && cr > RULES.rbCostRel) {
    reasons.push(`chi phí/đơn nhánh B gấp ${cr.toFixed(1)} lần nhánh A (${A.vndPerOrder}đ → ${B.vndPerOrder}đ)`);
  }

  return { rollback: reasons.length > 0, reasons, metrics: m, blocked: blk };
}

// ─────────────────────────────────────────────────────────────────────────────
// Vòng quét — chạy cả ngày (spec §"Nhịp tổng thể của trục D")
// ─────────────────────────────────────────────────────────────────────────────

async function alarm(text) {
  console.error(`[experiment] 🔴 ${text}`);
  // wa.js kéo theo baileys (nặng) → nạp muộn, và im lặng nếu WhatsApp chưa đăng nhập.
  try { const { sendToGroup } = await import('./wa.js'); await sendToGroup(`🔴 A/B tự hạ bản mới\n${text}`); }
  catch { /* mất WhatsApp không được phép chặn rollback */ }
}

/**
 * Soi mọi thí nghiệm đang chạy: rollback trước, phán thắng bại sau.
 * @param {object} o
 *   @param {boolean} [o.apply=true] false = chỉ báo cáo, không đóng thí nghiệm nào (chạy khô)
 */
export async function sweepExperiments({ rows, blocked, now = Date.now(), prices, apply = true } = {}) {
  const d = load();
  const all = rows || readLog();
  const blk = blocked || blockedLog(500);
  const out = [];
  for (const exp of Object.values({ ...d.active })) {
    let r;
    try { r = checkRollback({ pageId: exp.pageId, exp, rows: all, blocked: blk, now, prices }); }
    catch (e) { out.push({ pageId: exp.pageId, error: e.message }); continue; }

    if (r.rollback) {
      const why = r.reasons.join(' · ');
      if (apply) {
        stopExperiment(exp.pageId, { winner: 'A', reason: `ROLLBACK TỰ ĐỘNG: ${why}`, now, blacklistLoser: true });
        await alarm(`page ${exp.pageId} · "${exp.name}" → bản ${exp.b} về ARCHIVED, ${exp.a} thành LIVE lại.\n${why}`);
      }
      out.push({ pageId: exp.pageId, action: 'rollback', reasons: r.reasons, metrics: r.metrics, applied: apply });
      continue;
    }

    const v = decideWinner({ pageId: exp.pageId, exp, rows: all, now, prices });
    if (v.ready) {
      if (apply) stopExperiment(exp.pageId, { winner: v.winner, reason: v.reason, now, blacklistLoser: !!v.blacklist });
      out.push({ pageId: exp.pageId, action: 'decide', winner: v.winner, reason: v.reason, metrics: v.metrics, applied: apply });
    } else {
      out.push({ pageId: exp.pageId, action: 'running', reason: v.reason, metrics: v.metrics });
    }
  }
  return out;
}

let timer = null;
const SWEEP_MS = Number(process.env.AB_SWEEP_MS || 3600e3); // mỗi giờ — spec: dashboard làm mới mỗi giờ

export function startExperimentSweep() {
  if (timer || process.env.AB_SWEEP === '0') return;
  timer = setInterval(() => { sweepExperiments().catch((e) => console.error('[experiment] quét lỗi:', e.message)); }, SWEEP_MS);
  timer.unref?.(); // đừng giữ tiến trình sống chỉ vì cái hẹn giờ này (quan trọng cho `node --test`)
  console.log(`[experiment] quét A/B mỗi ${Math.round(SWEEP_MS / 60000)} phút · ${Object.keys(load().active).length} thí nghiệm đang chạy`);
}
export function stopExperimentSweep() { if (timer) { clearInterval(timer); timer = null; } }

/** Bảng so sánh A/B cho dashboard — mỗi page 1 dòng. */
export function abTable({ rows, now = Date.now(), prices } = {}) {
  const d = load();
  const all = rows || readLog();
  return Object.values(d.active).map((exp) => {
    try {
      const m = branchMetrics({ pageId: exp.pageId, exp, rows: all, now, prices });
      const v = decideWinner({ pageId: exp.pageId, exp, rows: all, now, prices });
      return {
        pageId: exp.pageId, name: exp.name, a: exp.a, b: exp.b, split: exp.split,
        startedAt: exp.startedAt, elapsedH: +m.elapsedH.toFixed(1),
        versioned: m.versioned, mismatch: m.mismatch,
        A: m.A, B: m.B, ready: v.ready, winner: v.winner, verdict: v.reason,
      };
    } catch (e) { return { pageId: exp.pageId, name: exp.name, error: e.message }; }
  });
}
