// Nghiệm thu M20 · Unit Economics.
// Nguyên tắc của bộ test này: KHÔNG test lại phép cộng, mà test những chỗ dễ sai lặng lẽ —
// gán đơn vào đúng ô, dedup khách/đơn, tách lane, và bốn ngưỡng cảnh báo có bắn đúng không.
// Khối cuối chạy trên BẢN SAO SỔ AI THẬT kéo từ VPS (nếu có) và đối chiếu với tokenStats().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  economics, alerts, trace, laneFamily, weekRange, buildWeeklyReport, verify, SCRIPT_UNLOGGED,
} from '../src/economics.js';
import { scriptVersionOfConfig } from '../src/ai-log.js';

// Giá cố định cho test — không phụ thuộc .env của máy chạy.
const P = { in: 1.0, cache: 0.1, out: 5.0, usdVnd: 26000 };
const T0 = Date.UTC(2026, 7, 3, 2, 0, 0); // 03/08/2026 — thứ 2
const hour = 3600e3;

let seq = 0;
const reply = (o = {}) => ({
  t: T0 + (++seq) * 60e3, page: 'P1', cust: 'c1', type: 'reply',
  lane: 'AI', state: 'SELLING', scriptVersion: 'aaaa1111',
  tin: 1000, tout: 100, cread: 3000, calls: 2, ...o,
});
const order = (o = {}) => ({ t: T0 + (++seq) * 60e3, page: 'P1', cust: 'c1', type: 'order', ...o });

// giá 1 reply mặc định: (1000*1 + 3000*0,1 + 100*5)/1e6 = 1,8e-3 USD = 46,8đ.
// Giữ dạng USD chưa làm tròn: làm tròn từng tin rồi nhân lên sẽ lệch khỏi cách tính thật
// (tính tổng USD trước, làm tròn sau) — đúng 1 lần làm tròn ở cuối, giống admin.js.
const ONE_USD = (1000 * P.in + 3000 * P.cache + 100 * P.out) / 1e6;
const vnd = (usd) => Math.round(usd * P.usdVnd);
const ONE = vnd(ONE_USD);

// ═══════════════════════════════════════════════════════════════════════════
// scriptVersion — băm nội dung kịch bản
// ═══════════════════════════════════════════════════════════════════════════

test('scriptVersion · băm 8 ký tự, ổn định, đổi 1 chữ là đổi mã', () => {
  const a = scriptVersionOfConfig({ greeting: 'Hello po', tone: 'ấm áp', salesPrompt: 'bán mạnh' });
  const b = scriptVersionOfConfig({ greeting: 'Hello po', tone: 'ấm áp', salesPrompt: 'bán mạnh' });
  const c = scriptVersionOfConfig({ greeting: 'Hello po!', tone: 'ấm áp', salesPrompt: 'bán mạnh' });
  assert.equal(a.length, 8);
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("scriptVersion · page chưa có kịch bản = 'none', KHÔNG lẫn với '(chưa ghi)'", () => {
  assert.equal(scriptVersionOfConfig({}), 'none');
  assert.equal(scriptVersionOfConfig({ greeting: '  ', tone: '', salesPrompt: '' }), 'none');
  // Tin cũ trong sổ không có trường scriptVersion → ô riêng, không gộp vào 'none'.
  const e = economics({ rows: [reply({ scriptVersion: undefined })], groupBy: ['scriptVersion'], prices: P });
  assert.equal(e.groups[0].dims.scriptVersion, SCRIPT_UNLOGGED);
});

// ═══════════════════════════════════════════════════════════════════════════
// Lane
// ═══════════════════════════════════════════════════════════════════════════

test('lane · gom về họ FASTLANE / AI / FOLLOWUP', () => {
  assert.equal(laneFamily('tpl_price'), 'FASTLANE');
  assert.equal(laneFamily('silent_thanks'), 'FASTLANE');
  assert.equal(laneFamily('AI'), 'AI');
  assert.equal(laneFamily('followup_1'), 'FOLLOWUP');
  assert.equal(laneFamily(''), 'AI');        // tin ghi trước khi có trường lane
  assert.equal(laneFamily(undefined), 'AI');
  assert.equal(laneFamily('lane_la'), 'LANE_LA'); // lane lạ hiện nguyên hình, không nuốt vào AI
});

// ═══════════════════════════════════════════════════════════════════════════
// Chỉ số cốt lõi
// ═══════════════════════════════════════════════════════════════════════════

test('chi phí/đơn · lượt/đơn · chốt — khớp phép tính tay', () => {
  const rows = [
    reply({ cust: 'c1' }), reply({ cust: 'c1' }), reply({ cust: 'c1' }), reply({ cust: 'c1' }),
    order({ cust: 'c1' }),
    reply({ cust: 'c2' }), reply({ cust: 'c2' }), reply({ cust: 'c2' }), reply({ cust: 'c2' }),
  ];
  const t = economics({ rows, prices: P }).totals;
  assert.equal(t.replies, 8);
  assert.equal(t.leads, 2);
  assert.equal(t.orders, 1);
  assert.equal(t.vnd, vnd(8 * ONE_USD));
  assert.equal(t.vndPerReply, ONE);
  assert.equal(t.repliesPerOrder, 8);            // 8 lượt / 1 đơn
  assert.equal(t.vndPerOrder, vnd(8 * ONE_USD)); // đơn giá 1 tin × lượt/đơn
  assert.equal(t.closeRatePct, 50);          // 1 đơn / 2 khách
});

test('đơn KHÔNG bị đếm trùng khi 1 khách có nhiều event order', () => {
  const rows = [reply(), order(), order(), order()];
  assert.equal(economics({ rows, prices: P }).totals.orders, 1);
});

test('% Fast Lane = tin xử lý 0 token / tổng tin', () => {
  const rows = [
    reply({ lane: 'AI' }), reply({ lane: 'AI' }),
    reply({ lane: 'tpl_price', tin: 0, tout: 0, cread: 0, calls: 0 }),
    reply({ lane: 'tpl_greet', tin: 0, tout: 0, cread: 0, calls: 0 }),
  ];
  const t = economics({ rows, prices: P }).totals;
  assert.equal(t.fastLanePct, 50);
  assert.equal(t.vnd, vnd(2 * ONE_USD)); // Fast Lane không tốn đồng nào
});

test('% ngân sách lượt 1 — tính trên LƯỢT AI ĐẦU của mỗi hội thoại, bỏ qua Fast Lane', () => {
  const rows = [
    // c1: Fast Lane chào trước (0đ) rồi 1 lượt AI đắt, sau đó 3 lượt AI rẻ
    reply({ cust: 'c1', lane: 'tpl_greet', tin: 0, tout: 0, cread: 0, calls: 0 }),
    reply({ cust: 'c1', tin: 10000, cread: 0, tout: 0 }),
    reply({ cust: 'c1', tin: 1000, cread: 0, tout: 0 }),
    reply({ cust: 'c1', tin: 1000, cread: 0, tout: 0 }),
    reply({ cust: 'c1', tin: 1000, cread: 0, tout: 0 }),
  ];
  const t = economics({ rows, prices: P }).totals;
  // 10.000 / 13.000 token = 76,9% ngân sách nằm ở lượt AI đầu tiên
  assert.equal(t.firstTurnPct, 76.9);
});

// ═══════════════════════════════════════════════════════════════════════════
// Cắt theo page × scriptVersion × lane
// ═══════════════════════════════════════════════════════════════════════════

test('cắt được theo page × scriptVersion × lane', () => {
  const rows = [
    reply({ page: 'P1', cust: 'a', scriptVersion: 'v1', lane: 'AI' }),
    reply({ page: 'P1', cust: 'a', scriptVersion: 'v1', lane: 'tpl_price', tin: 0, tout: 0, cread: 0, calls: 0 }),
    reply({ page: 'P1', cust: 'b', scriptVersion: 'v2', lane: 'AI' }),
    reply({ page: 'P2', cust: 'c', scriptVersion: 'v1', lane: 'AI' }),
  ];
  const e = economics({ rows, groupBy: ['page', 'scriptVersion', 'lane'], prices: P });
  const keys = e.groups.map((g) => g.key).sort();
  assert.deepEqual(keys, ['P1|v1|AI', 'P1|v1|FASTLANE', 'P1|v2|AI', 'P2|v1|AI']);
  assert.equal(e.groups.reduce((s, g) => s + g.replies, 0), 4);
});

test('đơn gán vào ô của TIN AI GẦN NHẤT TRƯỚC ĐÓ — đổi kịch bản giữa chừng thì đơn về bản mới', () => {
  const rows = [
    reply({ cust: 'a', scriptVersion: 'v1' }),
    reply({ cust: 'a', scriptVersion: 'v2' }), // marketer sửa kịch bản giữa hội thoại
    order({ cust: 'a' }),
    reply({ cust: 'b', scriptVersion: 'v1' }),
  ];
  const e = economics({ rows, groupBy: ['scriptVersion'], prices: P });
  const by = Object.fromEntries(e.groups.map((g) => [g.dims.scriptVersion, g]));
  assert.equal(by.v2.orders, 1);
  assert.equal(by.v1.orders, 0);
  assert.equal(e.totals.orders, 1);
});

test("đơn không có tin AI nào trước đó (người thật chốt) → ô '(không rõ)', vẫn vào tổng", () => {
  const rows = [order({ cust: 'z' }), reply({ cust: 'a' })];
  const e = economics({ rows, groupBy: ['page', 'scriptVersion'], prices: P });
  assert.equal(e.totals.orders, 1);
  assert.ok(e.groups.some((g) => g.dims.scriptVersion === '(không rõ)' && g.orders === 1));
});

test('lọc khoảng ngày theo NGÀY UTC — giống tokenStats/recount', () => {
  const rows = [
    reply({ t: Date.UTC(2026, 7, 1, 12) }),
    reply({ t: Date.UTC(2026, 7, 5, 12) }),
    reply({ t: Date.UTC(2026, 7, 9, 12) }),
  ];
  assert.equal(economics({ rows, from: '2026-08-05', to: '2026-08-05', prices: P }).totals.replies, 1);
  assert.equal(economics({ rows, from: '2026-08-05', prices: P }).totals.replies, 2);
  assert.equal(economics({ rows, to: '2026-08-05', prices: P }).totals.replies, 2);
});

// ═══════════════════════════════════════════════════════════════════════════
// Bốn ngưỡng cảnh báo (spec 05-TANG-VAN-HANH §M20)
// ═══════════════════════════════════════════════════════════════════════════

const codes = (rows, o = {}) => alerts({ rows, prices: P, ...o }).map((a) => a.code);

test('ngưỡng 1 🟠 · chi phí/đơn > 20.000đ với ≥100 lượt', () => {
  // 150 lượt × 46,8đ = 7.020đ, 1 đơn → 7.020đ/đơn: CHƯA vượt
  const cheap = [...Array(150)].map((_, i) => reply({ cust: 'c' + i })).concat(order({ cust: 'c0' }));
  assert.ok(!codes(cheap).includes('cost_per_order'));
  // Đắt gấp 10 → 70.200đ/đơn: vượt
  const pricey = [...Array(150)].map((_, i) => reply({ cust: 'c' + i, tin: 10000, cread: 30000, tout: 1000 }))
    .concat(order({ cust: 'c0' }));
  assert.ok(codes(pricey).includes('cost_per_order'));
});

test('ngưỡng 1 · KHÔNG bắn khi lượt còn ít (<100) — tránh báo động vì mẫu bé', () => {
  const rows = [...Array(20)].map((_, i) => reply({ cust: 'c' + i, tin: 10000, cread: 30000, tout: 1000 }))
    .concat(order({ cust: 'c0' }));
  assert.ok(!codes(rows).includes('cost_per_order'));
});

test('ngưỡng 2 🔴 · ≥150 lượt mà 0 đơn (ca Glamora 273 lượt, 0 đơn)', () => {
  const rows = [...Array(150)].map((_, i) => reply({ cust: 'c' + i }));
  const a = alerts({ rows, prices: P });
  const red = a.find((x) => x.code === 'no_order');
  assert.ok(red, 'phải bắn cảnh báo no_order');
  assert.equal(red.level, 'red');
  assert.ok(!codes([...Array(149)].map((_, i) => reply({ cust: 'c' + i }))).includes('no_order'));
});

test('ngưỡng 3 🟠 · % ngân sách lượt 1 > 40% (Fast Lane đang rò)', () => {
  // mỗi khách 1 lượt duy nhất → 100% ngân sách nằm ở lượt đầu
  const leak = [...Array(10)].map((_, i) => reply({ cust: 'c' + i }));
  assert.ok(codes(leak).includes('first_turn_budget'));
  // 1 khách, lượt đầu rẻ, 9 lượt sau đắt → 1,1% — không bắn
  const ok = [reply({ cust: 'x', tin: 100, cread: 0, tout: 0 })]
    .concat([...Array(9)].map(() => reply({ cust: 'x', tin: 1000, cread: 0, tout: 0 })));
  assert.ok(!codes(ok).includes('first_turn_budget'));
});

test('ngưỡng 4 🟠 · > 100 lượt/đơn (ca Royal Birthstone 443 lượt/đơn)', () => {
  const rows = [...Array(101)].map((_, i) => reply({ cust: 'c' + i })).concat(order({ cust: 'c0' }));
  assert.ok(codes(rows).includes('replies_per_order'));
  const fine = [...Array(50)].map((_, i) => reply({ cust: 'c' + i })).concat(order({ cust: 'c0' }));
  assert.ok(!codes(fine).includes('replies_per_order'));
});

test('cảnh báo chạy được ở mức page × kịch bản — chỉ ra ĐÚNG BẢN nào lỗ', () => {
  const bad = [...Array(150)].map((_, i) => reply({ cust: 'b' + i, scriptVersion: 'xau' }));
  const good = [...Array(150)].map((_, i) => reply({ cust: 'g' + i, scriptVersion: 'tot' }))
    .concat([...Array(30)].map((_, i) => order({ cust: 'g' + i })));
  const a = alerts({ rows: [...bad, ...good], groupBy: ['page', 'scriptVersion'], prices: P });
  const red = a.filter((x) => x.code === 'no_order');
  assert.equal(red.length, 1);
  assert.equal(red[0].dims.scriptVersion, 'xau');
});

// ═══════════════════════════════════════════════════════════════════════════
// Tra ngược về Sổ AI
// ═══════════════════════════════════════════════════════════════════════════

test('trace() trả đúng những dòng sổ đã đẻ ra ô số', () => {
  const rows = [
    reply({ cust: 'a', scriptVersion: 'v1', text: 'tin A' }),
    reply({ cust: 'b', scriptVersion: 'v2', text: 'tin B' }),
    reply({ cust: 'a', scriptVersion: 'v1', text: 'tin C' }),
    order({ cust: 'a' }),
  ];
  const e = economics({ rows, groupBy: ['page', 'scriptVersion'], prices: P });
  const g = e.groups.find((x) => x.dims.scriptVersion === 'v1');
  const t = trace({ rows, key: g.key, groupBy: ['page', 'scriptVersion'] });
  assert.equal(t.replies, g.replies);
  assert.equal(t.orders, g.orders);
  assert.deepEqual(t.events.map((x) => x.text), ['tin A', 'tin C']);
});

// ═══════════════════════════════════════════════════════════════════════════
// Báo cáo tuần
// ═══════════════════════════════════════════════════════════════════════════

test('weekRange · tuần bắt đầu thứ 2 giờ VN, dài đúng 7 ngày', () => {
  const w = weekRange(Date.UTC(2026, 7, 12, 5), 1); // thứ 4 12/08 → tuần trước
  assert.equal(w.toMs - w.fromMs, 7 * 86400e3);
  const d = new Date(w.fromMs + 7 * 3600e3);
  assert.equal(d.getUTCDay(), 1); // thứ 2
});

test('báo cáo tuần có đủ các số cốt lõi và cảnh báo', () => {
  const now = T0 + 8 * 86400e3; // tuần sau mốc dữ liệu
  const rows = [...Array(160)].map((_, i) => reply({ cust: 'c' + i, t: T0 + i * hour }));
  const r = buildWeeklyReport({ now, rows, prices: P, names: new Map([['P1', 'Page Thử']]) });
  assert.match(r.text, /TUẦN \d\d\/\d\d–\d\d\/\d\d/);
  assert.match(r.text, /Đơn: 0/);
  assert.match(r.text, /Fast Lane xử lý/);
  assert.match(r.text, /Ngân sách vào lượt 1/);
  assert.match(r.text, /Cần xem/);
  assert.ok(r.alerts.some((a) => a.code === 'no_order'));
});

// ═══════════════════════════════════════════════════════════════════════════
// ĐỐI CHIẾU TRÊN SỔ AI THẬT
// Chạy khi có bản sao sổ thật: AI_LOG_FIXTURE=/đường/dẫn/ai-messages.jsonl npm test
// (kéo về bằng: scp root@169.58.33.8:/opt/aicloser/ai-messages.jsonl …)
// Không có thì bỏ qua — CI không cần SSH vào production mới chạy được test.
// ═══════════════════════════════════════════════════════════════════════════

// Chạy hàm f với Sổ AI trỏ tạm sang file khác, rồi trả env về nguyên trạng.
function withLogFile(file, f) {
  const old = process.env.AI_LOG_FILE;
  process.env.AI_LOG_FILE = path.resolve(file);
  try { return f(); } finally { if (old === undefined) delete process.env.AI_LOG_FILE; else process.env.AI_LOG_FILE = old; }
}

const FIXTURE = process.env.AI_LOG_FIXTURE;
test('Sổ AI THẬT · economics khớp tokenStats()/recount() trong 1%', { skip: !FIXTURE && 'không đặt AI_LOG_FIXTURE' }, () => {
  // giá kimi — đúng bộ giá production đang chạy, để so được với /admin/api/token-cost thật
  const v = withLogFile(FIXTURE, () => verify({ prices: { in: 0.95, cache: 0.16, out: 4.0, usdVnd: 26000 } }));
  for (const c of v.checks) assert.ok(c.ok, `${c.name}: M20=${c.econ} vs ${c.refFrom}=${c.ref} — lệch ${c.diffPct}%`);
});

// Sổ tự dựng: chứng minh đường ĐỌC FILE THẬT (readLog) và đường truyền rows cho ra CÙNG
// kết quả — nếu lệch thì mọi test phía trên (đều dùng rows) chẳng chứng minh được gì.
test('đọc từ file jsonl và truyền rows cho cùng kết quả', () => {
  const rows = [
    reply({ cust: 'a' }), reply({ cust: 'b', lane: 'tpl_price', tin: 0, tout: 0, cread: 0, calls: 0 }),
    order({ cust: 'a' }),
  ];
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'econ-')), 'ai.jsonl');
  fs.writeFileSync(f, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  const a = withLogFile(f, () => economics({ prices: P }).totals);
  const b = economics({ rows, prices: P }).totals;
  assert.deepEqual(a, b);
});

test('verify() bắt được lệch — không phải lúc nào cũng gật', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'econ-')), 'ai.jsonl');
  fs.writeFileSync(f, [reply({ cust: 'a' }), order({ cust: 'a' })].map((r) => JSON.stringify(r)).join('\n') + '\n');
  const v = withLogFile(f, () => verify({ prices: P }));
  assert.ok(v.ok, JSON.stringify(v.checks.filter((c) => !c.ok)));
  assert.equal(v.checks.length, 9);
  assert.ok(v.checks.every((c) => c.diffPct === 0));
});

// Bẫy thật đã gặp: server chạy nhầm tiến trình không thấy Sổ AI → economics và tokenStats
// cùng đọc 0 dòng → 9/9 phép so đều "lệch 0%" → /verify xanh trong khi chẳng đối chiếu gì.
// Sổ rỗng phải là ĐỎ, kèm lý do, chứ không được xanh.
test('verify() KHÔNG gật khi sổ rỗng — 0 vs 0 không phải là khớp', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'econ-')), 'ai.jsonl');
  fs.writeFileSync(f, '');
  const v = withLogFile(f, () => verify({ prices: P }));
  assert.equal(v.ok, false, 'sổ rỗng mà verify() vẫn ok:true');
  assert.equal(v.empty, true);
  assert.match(v.why, /rỗng/);
  assert.ok(v.checks.every((c) => c.diffPct === 0), 'các phép so vẫn lệch 0% — nên mới bẫy');
});

// Ngược lại: có dữ liệu thật thì cờ empty phải TẮT, không được chặn nhầm ca bình thường.
test('verify() có dữ liệu → empty=false, vẫn xanh', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'econ-')), 'ai.jsonl');
  fs.writeFileSync(f, [reply({ cust: 'a' }), order({ cust: 'a' })].map((r) => JSON.stringify(r)).join('\n') + '\n');
  const v = withLogFile(f, () => verify({ prices: P }));
  assert.equal(v.empty, false);
  assert.equal(v.ok, true);
});
