// M20 · UNIT ECONOMICS — "page nào lãi, page nào lỗ, và VÌ SAO".
//
// Vì sao module này tồn tại: hai page cùng ngành trang sức, kịch bản dài gần bằng nhau
// (830 vs 829 token) mà chênh 12,7 lần về lượt/đơn (Royal Gold Boutique 34,8 · Royal
// Birthstone 443). Trước M20 KHÔNG AI TRẢ LỜI ĐƯỢC vì sao — không có gì đo được kịch bản
// nào ăn tiền. Ở đây cắt được theo page × scriptVersion × lane để câu hỏi đó có đáp án.
//
// NGUỒN SỐ DUY NHẤT là Sổ AI (ai-messages.jsonl). Không có bảng thống kê song song,
// không có bộ đếm RAM — mọi con số tra ngược được về đúng những dòng sổ đã đẻ ra nó
// (xem `trace()`), và đối chiếu được với `recount()`/`tokenStats()` (xem `verify()`).
import { config } from './config.js';
import { readLog, recount, tokenStats } from './ai-log.js';
import { vnDayStart } from './report.js';

// ---- LANE ------------------------------------------------------------------------
// Sổ AI ghi lane THÔ do fast-lane.js đặt ra ('tpl_price', 'tpl_greet', 'silent_thanks'…)
// hoặc 'AI'. Tài liệu 00-TONG-QUAN §6.4 ghi 3 giá trị FASTLANE|AI|FOLLOWUP — đó là HỌ
// lane, không phải giá trị thô. Gom về họ ở đây để đọc số cho gọn; `laneRaw` vẫn cắt được.
export const LANE = { AI: 'AI', FAST: 'FASTLANE', FOLLOWUP: 'FOLLOWUP' };
export function laneFamily(lane) {
  const s = String(lane == null ? '' : lane).trim();
  if (!s) return LANE.AI; // tin ghi TRƯỚC khi có trường lane — hồi đó chưa có Fast Lane
  if (/^(tpl|silent)_/.test(s)) return LANE.FAST;
  if (/^followup/i.test(s)) return LANE.FOLLOWUP;
  if (s.toUpperCase() === 'AI') return LANE.AI;
  return s.toUpperCase(); // lane lạ → hiện nguyên hình, không gộp im lặng vào AI
}

// Kịch bản chưa ghi mã (tin trước khi M20 bật scriptVersion). Không quy về 'none' —
// 'none' có nghĩa khác hẳn: page THẬT SỰ không có kịch bản.
export const SCRIPT_UNLOGGED = '(chưa ghi)';

export const DIMS = ['page', 'scriptVersion', 'lane', 'day'];
// Khoá ô = các giá trị chiều nối bằng '|'. Page id là số, scriptVersion là hex/none/(chưa
// ghi), lane viết hoa, day là ngày — không giá trị nào chứa '|' nên khoá không nhập nhằng,
// và đi lọt qua query string (UI bấm "tra ngược" truyền thẳng khoá này lên).
const SEP = '|';
const utcDay = (t) => new Date(t).toISOString().slice(0, 10);

function dimValue(dim, r) {
  if (dim === 'page') return String(r.page);
  if (dim === 'scriptVersion') return r.scriptVersion == null ? SCRIPT_UNLOGGED : String(r.scriptVersion);
  if (dim === 'lane') return laneFamily(r.lane);
  if (dim === 'day') return utcDay(r.t);
  throw new Error(`chiều cắt không hợp lệ: ${dim}`);
}

// ---- KHOẢNG THỜI GIAN -------------------------------------------------------------
// Nhận cả 2 kiểu: {from,to} = 'YYYY-MM-DD' theo NGÀY UTC (giống tokenStats/recount/
// /admin/api/token-cost — phải giống thì mới đối chiếu được), hoặc {fromMs,toMs} mốc ms
// (báo cáo tuần cắt theo giờ VN nên cần mốc ms).
function inRange(r, { from, to, fromMs, toMs }) {
  if (fromMs != null && r.t < fromMs) return false;
  if (toMs != null && r.t >= toMs) return false;
  if (from || to) {
    const d = utcDay(r.t);
    if (from && d < from) return false;
    if (to && d > to) return false;
  }
  return true;
}

const emptyBucket = () => ({
  replies: 0, measured: 0, orders: 0, leads: 0,
  tin: 0, tout: 0, cread: 0, calls: 0,
  fastReplies: 0, aiReplies: 0,
  firstAiReplies: 0, firstAiUsd: 0,
  usd: 0,
});

const usdOf = (b, P) => (b.tin * P.in + b.cread * P.cache + b.tout * P.out) / 1e6;
const r2 = (x, n = 4) => (x == null ? null : +x.toFixed(n));
const pct = (a, b) => (b > 0 ? +((a / b) * 100).toFixed(1) : null);

// Chỉ số dẫn xuất — CÔNG THỨC PHẢI GIỐNG HỆT admin.js /token-cost, nếu không thì
// nghiệm thu "sai lệch <1%" chỉ là so hai cách tính khác nhau rồi tự khen nhau.
//   đơn giá 1 tin = usd / số tin CÓ SỐ ĐO (không chia trên tổng tin — token chỉ ghi
//   từ 06/08/2026, chia trên tổng tin sẽ ra đơn giá rẻ giả tạo).
//   chi phí 1 đơn = đơn giá 1 tin × số tin trung bình để ra 1 đơn.
function derive(b, P) {
  const usd = usdOf(b, P);
  const perReply = b.measured > 0 ? usd / b.measured : null;
  const perOrder = perReply != null && b.orders > 0 ? perReply * (b.replies / b.orders) : null;
  return {
    usd: r2(usd),
    vnd: Math.round(usd * P.usdVnd),
    usdPerReply: r2(perReply, 6),
    vndPerReply: perReply == null ? null : Math.round(perReply * P.usdVnd),
    usdPerOrder: r2(perOrder),
    vndPerOrder: perOrder == null ? null : Math.round(perOrder * P.usdVnd),
    repliesPerOrder: b.orders > 0 ? +(b.replies / b.orders).toFixed(1) : null,
    closeRatePct: pct(b.orders, b.leads),
    // CẢNH BÁO ĐO SAI CHIỀU — con số này là CẬN DƯỚI, không phải tỷ lệ thật.
    // `pancake-poll.js` có `if (!reply) return;` TRƯỚC chỗ ghi sổ, nên 5 nhánh Fast Lane
    // IM LẶNG của `fast-lane.js` (silent_sticker · silent_start · silent_affirm ·
    // silent_thanks · silent_greet) không đẻ ra dòng sổ nào. Đó lại đúng là những lượt rẻ
    // nhất — Sổ AI chỉ thấy các nhánh `tpl_*` có gửi tin. Muốn đúng thì phải ghi sổ cả lượt
    // im lặng, mà `pancake-poll.js` là file của luồng khác (08-SONG-SONG §3) → BÁO, không tự sửa.
    fastLanePct: pct(b.fastReplies, b.replies),
    // CHỈ SỐ SỨC KHOẺ v2: bao nhiêu % tiền đổ vào LƯỢT AI ĐẦU TIÊN của mỗi hội thoại.
    // Đo 10/08/2026 trên Sổ AI thật: 69,7% — mục tiêu v2 ≤20%. Cao nghĩa là Fast Lane
    // đang rò: tin chào hỏi / bấm START vẫn chui lên AI và trả giá nạp KB đầy đủ.
    firstTurnPct: usd > 0 ? +((b.firstAiUsd / usd) * 100).toFixed(1) : null,
    callsPerReply: b.measured > 0 ? +(b.calls / b.measured).toFixed(2) : null,
  };
}

/**
 * Tính unit economics từ Sổ AI.
 * @param {object} o
 * @param {string} [o.from] 'YYYY-MM-DD' (ngày UTC, gồm cả ngày này)
 * @param {string} [o.to]   'YYYY-MM-DD' (ngày UTC, gồm cả ngày này)
 * @param {number} [o.fromMs] mốc ms (>=)  — dùng thay from/to khi cần cắt theo giờ VN
 * @param {number} [o.toMs]   mốc ms (<)
 * @param {string[]} [o.groupBy=['page']] tập con của DIMS
 * @param {object} [o.prices=config.aiPrices]
 * @param {object[]} [o.rows] tự truyền dòng sổ (test); mặc định đọc readLog()
 */
export function economics({ from, to, fromMs, toMs, groupBy = ['page'], prices, rows } = {}) {
  const dims = groupBy.filter((d) => DIMS.includes(d));
  if (!dims.length) throw new Error(`groupBy rỗng hoặc sai — chọn trong: ${DIMS.join(', ')}`);
  const P = prices || config.aiPrices;
  const range = { from, to, fromMs, toMs };
  const all = (rows || readLog()).slice().sort((a, b) => a.t - b.t);

  const buckets = new Map();   // key -> bucket
  const totals = emptyBucket();
  const seenLead = new Set();  // page:cust đã tính là khách
  const seenOrder = new Set(); // page:cust đã tính là đơn (cùng luật recount/tokenStats)
  const lastBucketKey = new Map(); // page:cust -> ô của TIN AI GẦN NHẤT (để gán đơn)
  const firstAiDone = new Set();   // page:cust đã tính lượt AI đầu tiên chưa
  const bucketOf = (key, dimVals) => {
    let b = buckets.get(key);
    if (!b) { b = { key, dims: dimVals, ...emptyBucket() }; buckets.set(key, b); }
    return b;
  };

  for (const r of all) {
    if (r.type !== 'reply' && r.type !== 'order') continue;
    if (!inRange(r, range)) continue;
    const conv = r.page + ':' + r.cust;

    if (r.type === 'order') {
      // ĐƠN gán vào ô của TIN AI GẦN NHẤT TRƯỚC ĐÓ trong cùng hội thoại — đó là kịch bản
      // và lane thực sự đã chốt được khách này. Đơn không mang sẵn scriptVersion/lane.
      // Không có tin AI nào trước đó (đơn do người thật/Botcake chốt) → ô "không rõ".
      if (seenOrder.has(conv)) continue;
      seenOrder.add(conv);
      totals.orders++;
      const key = lastBucketKey.get(conv);
      const b = key
        ? buckets.get(key)
        : bucketOf(dims.map((d) => (d === 'page' ? String(r.page) : '(không rõ)')).join(SEP),
          Object.fromEntries(dims.map((d) => [d, d === 'page' ? String(r.page) : '(không rõ)'])));
      b.orders++;
      continue;
    }

    const dimVals = {};
    for (const d of dims) dimVals[d] = dimValue(d, r);
    const key = dims.map((d) => dimVals[d]).join(SEP);
    const b = bucketOf(key, dimVals);
    lastBucketKey.set(conv, key);

    b.replies++; totals.replies++;
    if (r.cust && !seenLead.has(conv)) { seenLead.add(conv); b.leads++; totals.leads++; }

    const fam = laneFamily(r.lane);
    if (fam === LANE.FAST) { b.fastReplies++; totals.fastReplies++; }
    else if (fam === LANE.AI) { b.aiReplies++; totals.aiReplies++; }

    if (r.tin === undefined) continue; // tin trước 06/08/2026 — chưa bật đo token
    b.measured++; totals.measured++;
    for (const k of ['tin', 'tout', 'cread', 'calls']) { b[k] += r[k] || 0; totals[k] += r[k] || 0; }

    // LƯỢT AI ĐẦU TIÊN của hội thoại (bỏ qua Fast Lane vì nó tốn 0 token).
    if (fam === LANE.AI && !firstAiDone.has(conv)) {
      firstAiDone.add(conv);
      const u = usdOf({ tin: r.tin || 0, tout: r.tout || 0, cread: r.cread || 0 }, P);
      b.firstAiReplies++; b.firstAiUsd += u;
      totals.firstAiReplies++; totals.firstAiUsd += u;
    }
  }

  const groups = [...buckets.values()]
    .map((b) => ({ key: b.key, dims: b.dims, ...strip(b), ...derive(b, P) }))
    .sort((a, b) => b.vnd - a.vnd);

  return {
    range, dims, prices: P, provider: config.aiProvider,
    totals: { ...strip(totals), ...derive(totals, P) },
    groups,
  };
}
function strip(b) {
  const { key, dims, firstAiUsd, usd, ...rest } = b; // usd/firstAiUsd tính lại ở derive()
  return rest;
}

// ---- NGƯỠNG CẢNH BÁO TỰ ĐỘNG (spec 05-TANG-VAN-HANH §M20) --------------------------
// Ba trong bốn ngưỡng này nếu có từ đầu đã tự bắt được nhóm trang sức
// (Royal Birthstone 443 lượt/đơn · Glamora 273 lượt, 0 đơn) — không phải chờ người soi.
export const ALERT_RULES = [
  {
    code: 'cost_per_order',
    level: 'orange',
    test: (g) => g.vndPerOrder != null && g.vndPerOrder > 20000 && g.replies >= 100,
    msg: (g) => `chi phí/đơn ${fmtVnd(g.vndPerOrder)} (>20.000đ) trên ${g.replies} lượt`,
    action: 'Đề xuất TẮT AI page này cho tới khi sửa kịch bản.',
  },
  {
    code: 'no_order',
    level: 'red',
    test: (g) => g.replies >= 150 && g.orders === 0,
    msg: (g) => `${g.replies} lượt AI mà 0 đơn`,
    action: 'Tắt AI + báo marketer xem lại kịch bản.',
  },
  {
    code: 'first_turn_budget',
    level: 'orange',
    test: (g) => g.firstTurnPct != null && g.firstTurnPct > 40,
    msg: (g) => `${g.firstTurnPct}% ngân sách đổ vào lượt AI đầu tiên (>40%)`,
    action: 'Fast Lane đang rò — kiểm M06.',
  },
  {
    code: 'replies_per_order',
    level: 'orange',
    test: (g) => g.repliesPerOrder != null && g.repliesPerOrder > 100,
    msg: (g) => `${g.repliesPerOrder} lượt/đơn (>100)`,
    action: 'Kịch bản không hợp ngành hàng.',
  },
];
const fmtVnd = (n) => (n == null ? '—' : n.toLocaleString('vi-VN') + 'đ');

/**
 * Chạy 4 ngưỡng trên từng ô. Mặc định soi theo page (ngưỡng viết cho page), nhưng
 * groupBy nào cũng chạy được — vd ['page','scriptVersion'] để biết BẢN NÀO gây lỗ.
 */
export function alerts({ groupBy = ['page'], names, ...opts } = {}) {
  const e = economics({ groupBy, ...opts });
  const out = [];
  for (const g of e.groups) {
    for (const rule of ALERT_RULES) {
      if (!rule.test(g)) continue;
      out.push({
        code: rule.code, level: rule.level,
        key: g.key, dims: g.dims,
        page: g.dims.page || null,
        name: names?.get?.(String(g.dims.page)) || g.dims.page || g.key,
        message: rule.msg(g), action: rule.action,
        metrics: {
          replies: g.replies, orders: g.orders, vnd: g.vnd,
          vndPerOrder: g.vndPerOrder, repliesPerOrder: g.repliesPerOrder,
          firstTurnPct: g.firstTurnPct, closeRatePct: g.closeRatePct,
        },
      });
    }
  }
  const rank = { red: 0, orange: 1 };
  return out.sort((a, b) => rank[a.level] - rank[b.level] || (b.metrics.vnd || 0) - (a.metrics.vnd || 0));
}

// ---- TRA NGƯỢC VỀ SỔ AI ------------------------------------------------------------
// Mọi con số trên màn hình phải bấm được để ra ĐÚNG những dòng sổ đã đẻ ra nó. Không có
// cái này thì bảng số chỉ là niềm tin.
export function trace({ key, groupBy = ['page'], limit = 200, rows, ...range } = {}) {
  const dims = groupBy.filter((d) => DIMS.includes(d));
  const want = String(key).split(SEP);
  const all = (rows || readLog()).slice().sort((a, b) => a.t - b.t);
  const convOfBucket = new Set(); // page:cust có tin AI thuộc ô này → đơn của họ cũng thuộc ô
  const events = [];
  for (const r of all) {
    if (r.type !== 'reply') continue;
    if (!inRange(r, range)) continue;
    if (dims.map((d) => dimValue(d, r)).join(SEP) !== key) continue;
    convOfBucket.add(r.page + ':' + r.cust);
    events.push(r);
  }
  const orders = [];
  const seen = new Set();
  for (const r of all) {
    if (r.type !== 'order' || !inRange(r, range)) continue;
    const conv = r.page + ':' + r.cust;
    if (seen.has(conv) || !convOfBucket.has(conv)) continue;
    seen.add(conv); orders.push(r);
  }
  return {
    key, dims: Object.fromEntries(dims.map((d, i) => [d, want[i]])),
    replies: events.length, orders: orders.length,
    events: events.slice(-limit).map(slim),
    orderEvents: orders.slice(-limit).map(slim),
    truncated: events.length > limit,
  };
}
const slim = (r) => ({
  t: r.t, at: new Date(r.t).toISOString(), page: r.page, cust: r.cust, type: r.type,
  name: r.name || '', lane: r.lane ?? null, state: r.state ?? null,
  scriptVersion: r.scriptVersion ?? null,
  tin: r.tin ?? null, tout: r.tout ?? null, cread: r.cread ?? null, calls: r.calls ?? null,
  text: r.text || '', conv: r.conv || '',
  link: r.conv ? `https://pancake.vn/${r.page}?c_id=${r.conv}` : '',
});

/**
 * ĐỐI CHIẾU: economics() có khớp với hai bộ đếm sẵn có trên cùng Sổ AI không
 * (`recount()` cho lượt/khách/đơn · `tokenStats()` cho token & tiền — chính là nguồn của
 * /admin/api/token-cost). Lệch >1% là số của M20 sai, không phải "cách tính khác".
 */
export function verify({ from, to, prices, tolerancePct = 1 } = {}) {
  const P = prices || config.aiPrices;
  const e = economics({ from, to, groupBy: ['page'], prices: P });
  const rc = recount({ from, to });
  const ts = tokenStats({ from, to });
  const tsUsd = usdOf(ts, P);
  const tsVnd = Math.round(tsUsd * P.usdVnd);

  const rel = (a, b) => (b === 0 ? (a === 0 ? 0 : 100) : +Math.abs(((a - b) / b) * 100).toFixed(3));
  const checks = [
    { name: 'replies', econ: e.totals.replies, ref: rc.replies, refFrom: 'recount()' },
    { name: 'leads', econ: e.totals.leads, ref: rc.leads, refFrom: 'recount()' },
    { name: 'orders', econ: e.totals.orders, ref: rc.orders, refFrom: 'recount()' },
    { name: 'measured', econ: e.totals.measured, ref: ts.measured, refFrom: 'tokenStats()' },
    { name: 'tin', econ: e.totals.tin, ref: ts.tin, refFrom: 'tokenStats()' },
    { name: 'tout', econ: e.totals.tout, ref: ts.tout, refFrom: 'tokenStats()' },
    { name: 'cread', econ: e.totals.cread, ref: ts.cread, refFrom: 'tokenStats()' },
    { name: 'calls', econ: e.totals.calls, ref: ts.calls, refFrom: 'tokenStats()' },
    { name: 'vnd', econ: e.totals.vnd, ref: tsVnd, refFrom: '/admin/api/token-cost' },
  ].map((c) => ({ ...c, diffPct: rel(c.econ, c.ref), ok: rel(c.econ, c.ref) <= tolerancePct }));

  // SỔ RỖNG KHÔNG PHẢI LÀ "KHỚP". Cả hai vế cùng bằng 0 thì mọi phép so đều lệch 0% và
  // hàm này gật — đúng cái bẫy đã suýt cho qua: server chạy nhầm tiến trình không thấy sổ,
  // /verify vẫn xanh 9/9. Không có gì để đối chiếu thì phải nói thẳng là chưa đối chiếu được.
  const empty = checks.every((c) => c.econ === 0 && c.ref === 0);
  return {
    ok: checks.every((c) => c.ok) && !empty,
    empty,
    why: empty ? 'Sổ AI rỗng trong khoảng này — chưa đối chiếu được, không phải đã khớp.' : '',
    tolerancePct, range: { from, to }, prices: P, checks,
  };
}

// ---- BÁO CÁO TUẦN (gửi WhatsApp) ---------------------------------------------------
// Cắt theo GIỜ VN như report.js — tuần của người đọc, không phải tuần UTC.
export function weekRange(now = Date.now(), back = 0) {
  const d0 = vnDayStart(now);
  const dow = new Date(d0 + 7 * 3600e3).getUTCDay(); // 0=CN → thứ 2 là đầu tuần
  const monday = d0 - ((dow + 6) % 7) * 86400e3;
  const from = monday - back * 7 * 86400e3;
  return { fromMs: from, toMs: from + 7 * 86400e3 };
}
const vnDM = (t) => { const d = new Date(t + 7 * 3600e3); return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const money = (v) => (v == null ? '—' : v >= 1000 ? Math.round(v / 1000).toLocaleString('vi-VN') + 'k' : v + 'đ');
const delta = (cur, prev, unit = '%') => {
  if (prev == null || cur == null || prev === 0) return '';
  const d = ((cur - prev) / Math.abs(prev)) * 100;
  if (!isFinite(d) || Math.abs(d) < 1) return '';
  return ` (${d > 0 ? '+' : '−'}${Math.abs(Math.round(d))}${unit})`;
};

/**
 * Soạn báo cáo tuần. Trả { text, cur, prev, alerts, range } — router dùng để xem trước
 * rồi mới gửi, và bộ hẹn giờ dùng để gửi tự động.
 */
export function buildWeeklyReport({ now = Date.now(), names = new Map(), prices, rows } = {}) {
  const cw = weekRange(now, 1);   // TUẦN TRƯỚC đã trọn vẹn — tuần đang chạy chưa đủ ngày
  const pw = weekRange(now, 2);
  const cur = economics({ ...cw, groupBy: ['page'], prices, rows });
  const prev = economics({ ...pw, groupBy: ['page'], prices, rows });
  const al = alerts({ ...cw, groupBy: ['page'], names, prices, rows });

  const nameOf = (id) => String(names.get?.(String(id)) || id);
  const prevBy = new Map(prev.groups.map((g) => [g.dims.page, g]));
  const moves = cur.groups
    .filter((g) => g.leads >= 15 && g.closeRatePct != null)
    .map((g) => {
      const p = prevBy.get(g.dims.page);
      if (!p || p.closeRatePct == null || p.leads < 15) return null;
      return { id: g.dims.page, name: nameOf(g.dims.page), from: p.closeRatePct, to: g.closeRatePct, d: g.closeRatePct - p.closeRatePct };
    })
    .filter(Boolean)
    .sort((a, b) => b.d - a.d);

  const T = cur.totals, PT = prev.totals;
  const L = [];
  L.push(`📊 *TUẦN ${vnDM(cw.fromMs)}–${vnDM(cw.toMs - 86400e3)}*`, '');
  L.push(`Đơn: ${T.orders}${delta(T.orders, PT.orders)}   Chi phí: ${money(T.vnd)}   đ/đơn: ${T.vndPerOrder == null ? '—' : T.vndPerOrder.toLocaleString('vi-VN')}${delta(T.vndPerOrder, PT.vndPerOrder)}`);
  L.push(`Fast Lane xử lý: ${T.fastLanePct == null ? '—' : T.fastLanePct}% tin   Chốt: ${T.closeRatePct == null ? '—' : T.closeRatePct}%${delta(T.closeRatePct, PT.closeRatePct)}`);
  L.push(`Ngân sách vào lượt 1: ${T.firstTurnPct == null ? '—' : T.firstTurnPct}% (mục tiêu ≤20%)`);

  const up = moves.filter((m) => m.d > 0.3).slice(0, 3);
  const down = moves.filter((m) => m.d < -0.3).slice(-3).reverse();
  if (up.length) { L.push('', '🏆 *Tiến nhiều nhất*'); up.forEach((m) => L.push(`   ${m.name}   ${m.from}% → ${m.to}%`)); }
  if (down.length) { L.push('', '📉 *Lùi*'); down.forEach((m) => L.push(`   ${m.name}   ${m.from}% → ${m.to}%`)); }

  const noScript = new Set(economics({ ...cw, groupBy: ['page', 'scriptVersion'], prices, rows })
    .groups.filter((g) => g.dims.scriptVersion === 'none').map((g) => g.dims.page));
  const red = al.filter((a) => a.level === 'red').length;
  const loss = al.filter((a) => a.code === 'cost_per_order').length;
  if (al.length || noScript.size) {
    L.push('', '⚠️ *Cần xem*');
    if (noScript.size) L.push(`   ${noScript.size} page thiếu kịch bản`);
    if (loss) L.push(`   ${loss} page lỗ (>20k/đơn)`);
    if (red) L.push(`   ${red} page 🔴 nhiều lượt mà 0 đơn`);
    al.slice(0, 5).forEach((a) => L.push(`   ${a.level === 'red' ? '🔴' : '🟠'} ${a.name}: ${a.message}`));
  }
  L.push('', `_${cur.groups.length} page hoạt động · nguồn Sổ AI · giờ VN_`);

  return { text: L.join('\n'), range: cw, cur, prev, alerts: al };
}
