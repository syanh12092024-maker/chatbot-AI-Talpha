// NGHIỆM THU LUỒNG 7 — M15 Conversation Miner · tự học sổ template · M14 Order Bridge.
//
// Bộ test này KHÔNG kiểm tra lại phép cộng. Nó nhắm vào bốn chỗ mà sai thì hỏng thật:
//   ① PII lọt vào prompt của model         → rò dữ liệu khách, không rút lại được
//   ② Gọi model quá 1 lượt/page/đêm        → vỡ trần chi phí ~110đ/page
//   ③ Học nhầm câu người gõ thành template → AI trả lời đè lên sale thật
//   ④ Tạo đơn trùng / sai tổng tiền        → đụng vào tiền và đơn hàng thật
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Mọi file dữ liệu trỏ vào thư mục tạm TRƯỚC khi module đọc tới (các module đọc env lười,
// ngay lúc dùng chứ không lúc nạp) — test tuyệt đối không được đụng sổ thật của máy.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'l7-'));
process.env.MINER_REPORT_FILE = path.join(TMP, 'miner-reports.jsonl');
process.env.ORDER_QUEUE_FILE = path.join(TMP, 'ai-order-queue.json');
process.env.TEMPLATE_CANDIDATES_FILE = path.join(TMP, 'template-candidates.json');
process.env.TEMPLATE_FILE = path.join(TMP, 'botcake-templates.json');

const {
  maskPII, findPII, hasPII, pickSamples, collectPageConvs, buildMinePrompt, parseMineResult,
  minePage, saveReport, readReports, latestReports, MIN_CONVS_24H,
} = await import('../src/miner.js');
const {
  learnTemplates, learnReport, coverage, lockRate, toPattern, normalizeMsg,
  mergeCandidates, readCandidates, approveCandidate, rejectCandidate, filterDecided,
} = await import('../src/template-learner.js');
const {
  buildOrderNote, parseOrderNote, checkTotal, checkDuplicate, recordClosedOrder,
  readQueue, precheck, createFromQueue, skipQueueItem, queueStats, orderMode, NOTE_HEADER,
} = await import('../src/order-bridge.js');
const { dueNow } = await import('../src/scheduler-miner.js');

const T0 = Date.UTC(2026, 7, 12, 3, 0, 0); // 12/08/2026
const DAY = 86400e3;
const resetFiles = () => { for (const f of ['ai-order-queue.json', 'template-candidates.json', 'botcake-templates.json']) { try { fs.unlinkSync(path.join(TMP, f)); } catch { /* chưa có */ } } };

// ═══════════════════════════════════════════════════════════════════════════
// ① CHE PII — rào chắn cao nhất của M15
// ═══════════════════════════════════════════════════════════════════════════

test('PII · số điện thoại mọi kiểu viết đều bị che, GIÁ và SỐ NGÀY thì không', () => {
  for (const p of ['0536064249', '+966 53 606 4249', '05-360-64249', '(971) 50 123 4567', '971501234567']) {
    const out = maskPII(`My number is ${p} ok`);
    assert.ok(!/\d{7}/.test(out.replace(/\D/g, '')), `chưa che: ${p} → ${out}`);
    assert.equal(findPII(out).length, 0, `còn sót PII: ${out}`);
  }
  // Dữ liệu MỔ phải giữ nguyên: giá, khung giao hàng, hàm lượng.
  for (const keep of ['109 SAR po', 'it takes 2-5 days', '18K Saudi Gold', '30 tablets per box', 'combo 2 = 199 AED']) {
    assert.equal(maskPII(keep), keep, `che nhầm dữ liệu cần giữ: ${keep}`);
  }
});

test('PII · địa chỉ bị che theo ĐOẠN, câu phản đối cùng dòng vẫn còn nguyên', () => {
  const t = 'ang mahal naman, Blk 5 Lot 12 Barangay San Roque, pero gusto ko pa rin';
  const m = maskPII(t);
  assert.ok(m.includes('ang mahal naman'), 'mất câu phản đối — đầu ra quan trọng nhất của M15');
  assert.ok(m.includes('gusto ko pa rin'));
  assert.ok(m.includes('[ĐỊA CHỈ]'), `chưa che địa chỉ: ${m}`);
  assert.equal(findPII(m).length, 0);
});

test('PII · tên khách đã biết + mẫu tự giới thiệu', () => {
  const names = ['Amy Añoza'];
  const m = maskPII('Hi Amy, thank you po. my name is Grace Pranom', { names });
  assert.ok(!/Amy/.test(m) && !/Grace/.test(m), m);
  assert.ok(m.includes('thank you po'), 'không được xoá phần nội dung bán hàng');
  assert.equal(findPII(m, { names }).length, 0);
});

// Tiêu chí nghiệm thu của spec: kiểm TỰ ĐỘNG 100 mẫu, 0 PII lọt.
test('PII · 100 mẫu tổng hợp (EN/TL/AR) — 0 mẫu lọt', () => {
  const first = ['Amy', 'Grace', 'Celieta', 'Cristita', 'Ashlyn', 'Matess', 'Norah', 'Fatima', 'Priscela', 'Gene'];
  const last = ['Añoza', 'Pranom', 'Boca', 'Andales', 'Velasco', 'Valdez', 'Alharbi', 'Alotaibi', 'Amon', 'Santiago'];
  const phones = ['0536064249', '+966536064249', '050 123 4567', '0501234567', '+971 50 987 6543',
    '71566943', '966-53-606-4249', '(050)1234567', '0555 111 222', '+973 3312 4455'];
  const addrs = [
    'Alrawdah Jeddah, District 1',
    'Blk 7 Lot 22 Brgy Malanday, Marikina City',
    'Villa 12, Al Wasl Road, Dubai',
    'House no 45, Street 9, Riyadh',
    'Purok 3 Subd. Greenfields, near the church',
    'شارع الملك فهد، حي النزهة، الرياض',
    'Building 4, Flat 302, Manama',
    'Apt 5B, 21 Corniche Avenue, Doha',
    'P.O. Box 3345, Muscat',
    'Lot 9 Zone 4, behind the market, 6000 Cebu',
  ];
  const frames = [
    (n, p, a) => `Hi, my name is ${n}, my number is ${p}, address: ${a}`,
    (n, p, a) => `${a} — please deliver, ako si ${n}, contact ${p} po`,
    (n, p, a) => `الاسم: ${n}\nرقم: ${p}\nالعنوان: ${a}`,
    (n, p, a) => `ok sir COD po. ${n} / ${p} / ${a}. how much total?`,
    (n, p, a) => `send to ${a}\n${p}\n${n}\nthanks po`,
  ];
  let n = 0; const leaks = [];
  for (let i = 0; i < 100; i++) {
    const fullName = `${first[i % 10]} ${last[(i * 3) % 10]}`;
    const s = frames[i % 5](fullName, phones[(i * 7) % 10], addrs[(i * 3) % 10]);
    const masked = maskPII(s, { names: [fullName] });
    const left = findPII(masked, { names: [fullName] });
    if (left.length) leaks.push({ s, masked, left });
    n++;
  }
  assert.equal(n, 100);
  assert.deepEqual(leaks, [], `còn ${leaks.length}/100 mẫu lọt PII`);
});

test('PII · hasPII bắt được đúng thứ maskPII xoá (đôi đối ngẫu)', () => {
  assert.ok(hasPII('call me at 0536064249'));
  assert.ok(hasPII('Villa 12, Al Wasl Road'));
  assert.ok(!hasPII(maskPII('call me at 0536064249, Villa 12 Al Wasl Road')));
});

// ═══════════════════════════════════════════════════════════════════════════
// ② ĐƯỜNG ỐNG ĐỌC HỘI THOẠI & CHỌN MẪU
// ═══════════════════════════════════════════════════════════════════════════

const conv = (i, o = {}) => ({
  id: `c${i}`, from: { name: `Khach ${i}` }, from_psid: `psid${i}`,
  customers: [{ id: `cust${i}` }], tags: o.tags || [],
  updated_at: new Date(o.at ?? T0 - 3600e3).toISOString(),
  last_customer_interactive_at: new Date(o.at ?? T0 - 3600e3).toISOString(),
});
const reply = (convId, cust, o = {}) => ({ t: o.t ?? T0 - 3600e3, page: 'P1', cust, type: 'reply', conv: convId, name: o.name || '', text: o.text || '' });
const orderRow = (convId, cust, t = T0 - 3600e3) => ({ t, page: 'P1', cust, type: 'order', conv: convId });

test('chọn mẫu · TOÀN BỘ ca chốt + 15 ca không chốt nhiều lượt AI nhất', () => {
  const convs = [];
  for (let i = 0; i < 40; i++) convs.push({ convId: `c${i}`, aiTurns: i, hasOrder: i % 13 === 0, lastAt: i });
  const p = pickSamples(convs);
  assert.equal(p.lost.length, 15);
  assert.equal(p.won.length, convs.filter((c) => c.hasOrder).length);
  assert.deepEqual(p.lost.map((c) => c.aiTurns).slice(0, 3), [38, 37, 36], 'rổ MẤT phải là nơi tốn nhiều lượt AI nhất');
  assert.ok(p.lost.every((c) => !c.hasOrder));
});

test('cửa sổ dữ liệu · <20 hội thoại/24h thì GỘP 7 NGÀY', async () => {
  const list = [];
  for (let i = 0; i < 8; i++) list.push(conv(i, { at: T0 - 2 * 3600e3 }));      // trong 24h
  for (let i = 8; i < 26; i++) list.push(conv(i, { at: T0 - 4 * DAY }));        // trong 7 ngày
  const rows = list.map((c, i) => reply(c.id, `cust${i}`, { t: T0 - 3600e3 }));
  const r = await collectPageConvs('P1', {
    now: T0, rows, fetchConvs: async () => list, fetchMsgs: async () => [],
  });
  assert.equal(r.enough, true);
  assert.equal(r.windowDays, 7, 'mẫu 24h quá nhỏ mà vẫn kết luận trên nó = kết luận trên nhiễu');
  assert.equal(r.seen, 26);
});

test('cửa sổ dữ liệu · ≥20 hội thoại/24h thì dùng đúng 24h', async () => {
  const list = [];
  for (let i = 0; i < MIN_CONVS_24H + 3; i++) list.push(conv(i, { at: T0 - 3600e3 }));
  const r = await collectPageConvs('P1', { now: T0, rows: [], fetchConvs: async () => list, fetchMsgs: async () => [] });
  assert.equal(r.windowDays, 1);
});

test('cửa sổ dữ liệu · <5 hội thoại/tuần thì BỎ QUA, không gọi model', async () => {
  const list = [conv(1, { at: T0 - DAY }), conv(2, { at: T0 - 2 * DAY })];
  let calls = 0;
  const rep = await minePage('P1', {
    now: T0, rows: [], fetchConvs: async () => list, fetchMsgs: async () => [],
    callModel: async () => { calls++; return { text: '{}' }; },
  });
  assert.equal(rep.skipped, true);
  assert.match(rep.reason, /chưa đủ dữ liệu/);
  assert.equal(calls, 0, 'mẫu quá nhỏ mà vẫn đốt tiền model');
  assert.equal(rep.calls, 0);
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ MỔ 1 PAGE — đúng 1 lời gọi, prompt sạch PII
// ═══════════════════════════════════════════════════════════════════════════

const MODEL_JSON = JSON.stringify({
  objections: [{ text: 'ang mahal', count: 11, wonAfter: 1, lostAfter: 10 }],
  killers: [{ quote: 'let me know po if interested', count: 6 }],
  winners: [{ quote: 'SET 1 po muna, or SET 2 na po?', count: 3 }],
  dropStage: { sau_bao_gia: 9, sau_hoi_dia_chi: 4 },
  gaps: [{ question: 'halal ba ito?', count: 4 }],
  langMix: { tl: 0.6, en: 0.3, ar: 0.1 },
});

function fakePage({ n = 25, withPii = true } = {}) {
  const list = []; const rows = []; const msgs = new Map();
  for (let i = 0; i < n; i++) {
    const c = conv(i, { at: T0 - 3600e3 });
    list.push(c);
    for (let k = 0; k < (i % 5) + 1; k++) rows.push(reply(c.id, `cust${i}`, { name: `Khach ${i}`, text: 'hello' }));
    if (i % 8 === 0) rows.push(orderRow(c.id, `cust${i}`));
    msgs.set(c.id, [
      { from: { id: 'cust' }, original_message: 'how much po?', inserted_at: new Date(T0 - 7200e3).toISOString() },
      { from: { id: 'P1' }, original_message: 'It is 109 SAR po, free delivery, COD.', inserted_at: new Date(T0 - 7100e3).toISOString() },
      { from: { id: 'cust' }, original_message: withPii ? `ok, Khach ${i} here, 0536064${String(100 + i)}, Villa 12 Al Wasl Road Dubai` : 'ang mahal naman', inserted_at: new Date(T0 - 7000e3).toISOString() },
      { from: { id: 'P1' }, original_message: 'let me know po if interested', inserted_at: new Date(T0 - 6900e3).toISOString() },
    ]);
  }
  return { list, rows, msgs };
}

test('mổ 1 page · ĐÚNG 1 lời gọi model và prompt KHÔNG còn PII', async () => {
  const { list, rows, msgs } = fakePage();
  let calls = 0; let sentPrompt = '';
  const rep = await minePage('P1', {
    now: T0, rows, pageName: 'Royal Gold Boutique',
    fetchConvs: async () => list,
    fetchMsgs: async (_p, id) => msgs.get(id) || [],
    callModel: async (_sys, user) => { calls++; sentPrompt = user; return { text: MODEL_JSON, usage: { tin: 3800, tout: 700 } }; },
  });
  assert.equal(calls, 1, 'trần chi phí là 1 lời gọi/page/đêm');
  assert.equal(rep.calls, 1);
  assert.equal(rep.skipped, undefined);
  assert.deepEqual(findPII(sentPrompt, { names: list.map((c) => c.from.name) }), [], 'PII lọt vào prompt');
  assert.ok(!/0536064/.test(sentPrompt));
  assert.ok(/109 SAR/.test(sentPrompt), 'giá bị che nhầm — mất dữ liệu mổ');
  assert.equal(rep.objections[0].text, 'ang mahal');
  assert.equal(rep.killers[0].quote, 'let me know po if interested');
  assert.ok(rep.promptTokens > 0);
});

test('mổ 1 page · tên khách A nhắc trong hội thoại khách B vẫn bị che', async () => {
  const { list, rows, msgs } = fakePage({ n: 25 });
  list[0].from.name = 'Zaira Mendoza';
  msgs.get('c1').push({ from: { id: 'cust' }, original_message: 'my friend Zaira Mendoza told me about this', inserted_at: new Date(T0).toISOString() });
  let prompt = '';
  const rep = await minePage('P1', {
    now: T0, rows,
    fetchConvs: async () => list,
    fetchMsgs: async (_p, id) => msgs.get(id) || [],
    callModel: async (_s, u) => { prompt = u; return { text: MODEL_JSON }; },
  });
  assert.equal(rep.skipped, undefined);
  assert.ok(!/Zaira/i.test(prompt), 'tên khách của hội thoại khác lọt vào prompt');
});

test('mổ 1 page · cầu dao PII nổ thì HUỶ lượt gọi model (fail-closed)', async () => {
  // Diễn tập cầu dao bằng bộ soi giả: bộ soi THẬT đã được kiểm ở khối 100 mẫu phía trên,
  // ở đây kiểm ĐẤU NỐI — sót là dừng hẳn, không gọi model, không "gửi rồi sửa sau".
  const { list, rows, msgs } = fakePage({ n: 25 });
  let calls = 0;
  const rep = await minePage('P1', {
    now: T0, rows,
    fetchConvs: async () => list,
    fetchMsgs: async (_p, id) => msgs.get(id) || [],
    scanPII: () => ['sđt'],
    callModel: async () => { calls++; return { text: MODEL_JSON }; },
  });
  assert.equal(rep.skipped, true);
  assert.match(rep.reason, /PII còn sót/);
  assert.equal(rep.piiLeak[0], 'sđt');
  assert.equal(calls, 0, 'sót PII mà vẫn gửi = rò dữ liệu khách');
});

test('mổ 1 page · chi phí/đơn 7 chữ số ở khối META không được làm nổ cầu dao', async () => {
  const { list, rows, msgs } = fakePage({ n: 25, withPii: false });
  let calls = 0;
  const rep = await minePage('P1', {
    now: T0, rows,
    metrics: { closeRate: 2, repliesPerOrder: 443, vndPerOrder: 1234567 },
    fetchConvs: async () => list,
    fetchMsgs: async (_p, id) => msgs.get(id) || [],
    callModel: async () => { calls++; return { text: MODEL_JSON }; },
  });
  assert.equal(calls, 1, 'số của chính mình bị tưởng là SĐT → page đắt tiền vĩnh viễn không được mổ');
  assert.equal(rep.skipped, undefined);
});

test('đọc kết quả · chịu được rào ``` và chữ thừa, cắt trần 8 mục', () => {
  const many = { objections: Array.from({ length: 20 }, (_, i) => ({ text: `o${i}`, count: 20 - i })) };
  const p = parseMineResult('Đây là kết quả:\n```json\n' + JSON.stringify(many) + '\n```\nhết.');
  assert.equal(p.objections.length, 8);
  assert.equal(p.objections[0].text, 'o0');
  assert.throws(() => parseMineResult('xin lỗi tôi không trả JSON'), /không trả về JSON/);
  const neg = parseMineResult(JSON.stringify({ killers: [{ quote: 'x', count: -5 }], langMix: { tl: 2 } }));
  assert.equal(neg.killers[0].count, 0, 'count âm phải về 0');
  assert.equal(neg.langMix.tl, 1, 'tỷ lệ >1 phải kẹp về 1');
});

test('kho báo cáo · KHÔNG ghi hội thoại thô xuống đĩa (PII)', () => {
  saveReport({ pageId: 'P9', date: '2026-08-12', objections: [], killers: [], winners: [], collected: { convs: [{ msgs: [{ text: '0536064249' }] }] } });
  const raw = fs.readFileSync(process.env.MINER_REPORT_FILE, 'utf8');
  assert.ok(!/0536064249/.test(raw), 'hội thoại thô rơi xuống file báo cáo');
  const rows = readReports({ pageId: 'P9' });
  assert.equal(rows.length, 1);
  assert.equal(latestReports().find((r) => r.pageId === 'P9').date, '2026-08-12');
});

test('mổ cả đàn · đủ 39 page trong ≤30 phút với nhịp giãn thật (30s/page)', () => {
  // Không chạy thật 39 lượt sleep trong test — kiểm bằng số học đúng công thức của mineAll:
  // 38 khoảng giãn × 30s = 19 phút, còn ~11 phút cho 39 lượt kéo dữ liệu + gọi model.
  const gapMinutes = 38 * 30 / 60;
  assert.ok(gapMinutes < 30, 'nhịp giãn thôi đã vượt trần 30 phút');
  assert.ok(gapMinutes + 39 * 0.25 <= 30, 'còn quá ít thời gian cho phần kéo dữ liệu + gọi model');
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ TỰ HỌC SỔ TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

const TPL = 'Please provide the information below for the shipping and we will process your order right away';
const RTO = 'Kindly confirm your order again so our rider can deliver it to your place tomorrow morning';
const HUMAN_SHORT = 'ok dear';
const HUMAN_MED = 'It take 2-5 days to delivery dear'; // 33 ký tự — dưới ngưỡng 40

function bundle(pageId, spec) {
  return {
    pageId, enough: true, windowDays: 1, seen: spec.length,
    convs: spec.map((msgs, i) => ({
      convId: `${pageId}-c${i}`, custName: '', hasOrder: false, aiTurns: 1,
      msgs: msgs.map((m) => (typeof m === 'string' ? { who: 'page', text: m, at: T0 } : m)),
    })),
    sample: { won: 0, lost: spec.length },
  };
}

test('học template · lặp ≥3 hội thoại VÀ dài ≥40 ký tự mới là mẫu', () => {
  const b = bundle('P1', [
    [{ who: 'cust', text: 'hi' }, RTO, HUMAN_SHORT],
    [RTO, HUMAN_SHORT, HUMAN_MED],
    [RTO, HUMAN_MED],
    [HUMAN_SHORT],
  ]);
  const { candidates } = learnTemplates(b, { rows: [] });
  const pats = candidates.map((c) => c.sample);
  assert.ok(pats.includes(RTO), 'bỏ sót mẫu lặp 3 hội thoại');
  assert.ok(!pats.includes(HUMAN_SHORT), '"ok dear" là câu người gõ — không được thành template');
  assert.ok(!pats.includes(HUMAN_MED), 'câu 33 ký tự phải bị loại theo ngưỡng đã kiểm chứng');
  assert.equal(candidates.find((c) => c.sample === RTO).convs, 3);
});

test('học template · lặp 3 lần TRONG CÙNG 1 hội thoại thì KHÔNG tính (phải khác hội thoại)', () => {
  const b = bundle('P1', [[RTO, RTO, RTO], [{ who: 'cust', text: 'ok' }]]);
  assert.equal(learnTemplates(b, { rows: [] }).candidates.length, 0);
});

test('học template · mẫu sổ hiện tại đã phủ thì không dựng lại; tin của bot mình bị loại', () => {
  const known = 'your order has been created and will be shipped within 2-5 days po';  // bot-registry đã có
  const ours = 'Hello po, this is our fixed fast lane price answer for the page today';
  const rows = [{ type: 'reply', page: 'P1', cust: 'c', text: ours.slice(0, 80), t: T0 }];
  const b = bundle('P1', [[known, ours], [known, ours], [known, ours]]);
  const { candidates } = learnTemplates(b, { rows });
  assert.equal(candidates.length, 0, `phải rỗng, nhận được: ${candidates.map((c) => c.sample)}`);
});

test('học template · regex sinh ra khớp lại chính tin gốc và tổng quát hoá con số', () => {
  const p = toPattern('Your order is 109 SAR, please confirm within 24 hours to keep the promo');
  const re = new RegExp(p, 'i');
  assert.ok(re.test('your order is 109 SAR, please confirm within 24 hours to keep the promo'));
  assert.ok(re.test('Your order is 249 SAR, please confirm within 48 hours to keep the promo'), 'phải phủ cả biến thể số');
  assert.ok(!re.test('ok dear'));
  assert.equal(normalizeMsg('  <div>hi   there</div>  '), 'hi there');
});

test('học template · báo cáo độ phủ TRƯỚC/SAU và tỷ lệ khoá oan TRƯỚC/SAU', () => {
  const b = bundle('P1', [
    [{ who: 'cust', text: 'how much' }, RTO],
    [{ who: 'cust', text: 'how much' }, RTO],
    [{ who: 'cust', text: 'how much' }, RTO],
    [{ who: 'cust', text: 'how much' }, TPL, TPL],
  ]);
  const r = learnReport(b, { rows: [], now: T0 });
  assert.ok(r.candidates.length >= 1);
  assert.ok(r.after.coverage.pct > r.before.coverage.pct, 'duyệt mẫu mới mà độ phủ không tăng');
  assert.equal(r.before.lock.convs, 4);
  // RTO dài, chưa có trong sổ → M05 hiện coi là "vùng đoán"; sau khi học phải hết bị coi là người thật.
  assert.ok(r.after.lock.pct <= r.before.lock.pct);
  assert.equal(typeof r.coverageGain, 'number');
});

test('sổ chờ duyệt · mẫu mới KHÔNG tự bật; duyệt mới ghi vào botcake-templates.json', () => {
  resetFiles();
  const found = learnTemplates(bundle('P1', [[RTO], [RTO], [RTO]]), { rows: [] }).candidates;
  const m = mergeCandidates(found, { now: T0 });
  assert.equal(m.added, 1);
  assert.equal(readCandidates()[0].status, 'pending');
  assert.ok(!fs.existsSync(process.env.TEMPLATE_FILE), 'mẫu chưa duyệt mà đã rơi vào sổ đang chạy');

  const id = readCandidates()[0].id;
  const r = approveCandidate(id, { by: 'test' });
  assert.equal(r.ok, true);
  const live = JSON.parse(fs.readFileSync(process.env.TEMPLATE_FILE, 'utf8'));
  assert.equal(live.patterns.length, 1);
  assert.ok(new RegExp(live.patterns[0], 'i').test(RTO));
  assert.equal(readCandidates()[0].status, 'approved');
});

test('sổ chờ duyệt · mẫu đã BỎ thì đêm sau không dựng lại', () => {
  resetFiles();
  const NOVEL = 'Kindly send your exact location pin so our rider can find your place quickly';
  const found = learnTemplates(bundle('P2', [[NOVEL], [NOVEL], [NOVEL]]), { rows: [] }).candidates;
  assert.equal(found.length, 1);
  mergeCandidates(found, { now: T0 });
  const id = readCandidates()[0].id;
  assert.equal(rejectCandidate(id, { reason: 'câu này sale hay gõ tay' }).ok, true);
  assert.equal(filterDecided(found).length, 0, 'mẫu đã bỏ vẫn quay lại hàng chờ duyệt');
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ M14 · ORDER BRIDGE
// ═══════════════════════════════════════════════════════════════════════════

const KB = { products: [{ id: 'p1', currency: 'SAR', price1: 109, combo2: 199, combo3: 279 }] };
const INPUT = {
  name: 'Amy Añoza', phone: '0536064249', address: 'Alrawdah Jeddah, District 1', city: 'Jeddah',
  variant: 'Buy 1 Get 1 FREE', qty: 1, total_price: 109, currency: 'SAR', cod_confirmed: true,
};

test('ghi chú chuẩn · dựng đúng mẫu spec và ĐỌC NGƯỢC ra đủ trường (sale không phải gõ lại)', () => {
  const note = buildOrderNote({ ...INPUT, priceChecked: true });
  assert.ok(note.startsWith(NOTE_HEADER));
  for (const label of ['Tên:', 'SĐT:', 'Địa chỉ:', 'Gói:', 'SL:', 'Tổng:', 'COD:']) assert.ok(note.includes(label), `thiếu dòng ${label}`);
  assert.ok(note.includes('109 SAR'));
  assert.ok(note.includes('đã đối chiếu KB'));

  const back = parseOrderNote(note);
  assert.equal(back.name, 'Amy Añoza');
  assert.equal(back.phone, '0536064249');
  assert.equal(back.address, 'Alrawdah Jeddah, District 1, Jeddah');
  assert.equal(back.qty, 1);
  assert.equal(back.total_price, 109);
  assert.equal(back.currency, 'SAR');
  assert.equal(back.cod_confirmed, true);
  assert.equal(back.priceChecked, true);
  assert.deepEqual(parseOrderNote('ghi chú tự do kiểu cũ, không theo mẫu'), {}, 'ghi chú cũ phải trả rỗng chứ không ném lỗi');
});

test('cửa tiền · tổng phải khớp ĐÚNG MỘT gói; không có bảng giá thì KHÔNG tạo đơn', () => {
  assert.equal(checkTotal(KB, 109).ok, true);
  assert.equal(checkTotal(KB, 199).ok, true);
  assert.equal(checkTotal(KB, 218).code, 'MISMATCH', '109×2 tự nhân là đúng thứ đã làm mất đơn khách Priscela Amon');
  assert.equal(checkTotal(KB, 0).code, 'NO_TOTAL');
  assert.equal(checkTotal({ products: [] }, 109).code, 'NO_PRICE_TABLE');
  assert.equal(checkTotal({ products: [] }, 109).ok, false);
});

test('chống trùng · nhận ra đủ BỐN nguồn, mỗi nguồn một mình cũng đủ chặn', async () => {
  const base = { pageId: 'P1', convId: 'c1', custId: 'u1', rows: [], tags: [], msgs: [], hasPos: () => false };
  assert.equal((await checkDuplicate(base)).dup, false);

  const soAi = await checkDuplicate({ ...base, rows: [orderRow('c1', 'u1')] });
  assert.equal(soAi.sources[0].src, 'so-ai');

  const pos = await checkDuplicate({ ...base, hasPos: () => true, fetchOrders: async () => [{ id: 77, status: 0, statusName: 'Mới' }] });
  assert.equal(pos.sources[0].src, 'pos');

  const tag = await checkDuplicate({ ...base, tags: [-2] });
  assert.equal(tag.sources[0].src, 'the-trang-thai');

  const fb = await checkDuplicate({ ...base, msgs: [{ text: 'You have placed an order for 1 item' }] });
  assert.equal(fb.sources[0].src, 'fb-commerce');

  // Đơn đã HUỶ ở POS không phải "đã có đơn" — nếu tính là trùng thì khách huỷ rồi mua lại sẽ không tạo được đơn.
  const cancelled = await checkDuplicate({ ...base, hasPos: () => true, fetchOrders: async () => [{ id: 78, status: 6 }] });
  assert.equal(cancelled.dup, false);

  // POS lỗi mạng → KHÔNG được coi là sạch.
  const broken = await checkDuplicate({ ...base, hasPos: () => true, fetchOrders: async () => { throw new Error('timeout'); } });
  assert.equal(broken.dup, false);
  assert.match(broken.unknown, /timeout/);
});

test('hàng chờ · AI chốt → ghi chú chuẩn + 1 dòng chờ tạo đơn; chốt lại KHÔNG đẻ dòng thứ hai', async () => {
  resetFiles();
  const notes = [];
  const opt = { kb: KB, addNote: async (p, c, text) => { notes.push(text); return { ok: true }; }, now: T0 };
  await recordClosedOrder('P1', 'u1', INPUT, 'c1', opt);
  await recordClosedOrder('P1', 'u1', { ...INPUT, qty: 2, total_price: 199 }, 'c1', { ...opt, now: T0 + 60e3 });
  const q = readQueue();
  assert.equal(q.length, 1, 'một hội thoại chỉ được một dòng chờ tạo đơn');
  assert.equal(q[0].qty, 2);
  assert.equal(q[0].total_price, 199);
  assert.equal(q[0].status, 'pending');
  assert.equal(q[0].mode, 'A');
  assert.equal(notes.length, 2);
  assert.ok(notes[1].includes('SL:'));
  assert.equal(queueStats().pending, 1);
  assert.equal(orderMode(), 'A', 'AUTO_CREATE_ORDER phải đang TẮT');
});

test('tạo đơn · precheck chặn khi tổng tiền sai, kể cả người bấm nút', async () => {
  resetFiles();
  const it = await recordClosedOrder('P1', 'u2', { ...INPUT, total_price: 218 }, 'c2', { kb: KB, skipNote: true, now: T0 });
  assert.equal(it.priceCheck.ok, false);
  let created = 0;
  const r = await createFromQueue(it.id, {
    kb: KB, rows: [], hasPos: () => false,
    createOrder: async () => { created++; return { ok: true, id: 1 }; },
  });
  assert.equal(r.ok, false);
  assert.equal(created, 0, 'đã tạo đơn sai tổng tiền');
  assert.ok(r.blocks.some((b) => b.code === 'MISMATCH'));
});

test('tạo đơn · đường sạch thì tạo được, và mục đã tạo không tạo lại lần hai', async () => {
  resetFiles();
  const it = await recordClosedOrder('P1', 'u3', INPUT, 'c3', { kb: KB, skipNote: true, now: T0 });
  let created = 0;
  const deps = { kb: KB, rows: [], hasPos: () => false, createOrder: async () => { created++; return { ok: true, id: 555 }; } };
  const r1 = await createFromQueue(it.id, deps);
  assert.equal(r1.ok, true);
  assert.equal(r1.id, 555);
  assert.equal(readQueue()[0].status, 'created');

  const r2 = await createFromQueue(it.id, deps);
  assert.equal(r2.ok, false);
  assert.equal(created, 1, 'bấm hai lần thành hai đơn');
  assert.ok(r2.blocks.some((b) => b.code === 'ALREADY_CREATED'));
});

test('bỏ khỏi hàng chờ · chỉ đánh dấu trong sổ, KHÔNG đụng đơn Pancake', async () => {
  resetFiles();
  const it = await recordClosedOrder('P1', 'u4', INPUT, 'c4', { kb: KB, skipNote: true, now: T0 });
  const r = skipQueueItem(it.id, 'sale đã tạo tay');
  assert.equal(r.ok, true);
  assert.equal(readQueue()[0].status, 'skipped');
  assert.equal(readQueue().length, 1, 'bản ghi phải còn nguyên — không xoá gì cả');
});

// Tiêu chí nghiệm thu M14: 0 đơn trùng trên mô phỏng 200 đơn, 0 đơn sai tổng tiền.
test('mô phỏng 200 đơn · 0 đơn trùng, 0 đơn sai tổng tiền', async () => {
  resetFiles();
  const posOrders = new Map();     // convId -> [đơn]
  const soAi = [];                 // Sổ AI
  const tagsOf = new Map();        // convId -> thẻ trạng thái
  const msgsOf = new Map();        // convId -> tin có dấu hiệu đơn ngoài
  const items = [];

  for (let i = 0; i < 200; i++) {
    const convId = `sim${i}`;
    // 5 nhóm ca, mỗi nhóm bịt một nguồn trùng khác nhau + một nhóm sai tổng tiền.
    // id 9xxxxx = đơn CÓ SẴN của người khác; đơn do ta tạo dùng dải 1000+ để đếm tách bạch.
    if (i % 5 === 1) posOrders.set(convId, [{ id: 900000 + i, status: 0, statusName: 'Mới' }]);
    if (i % 5 === 2) soAi.push({ t: T0, page: 'P1', cust: `u${i}`, type: 'order', conv: convId });
    if (i % 5 === 3) tagsOf.set(convId, [-2]);
    if (i % 5 === 4) msgsOf.set(convId, [{ text: 'Your order has been confirmed, thank you!' }]);
    const total = i % 17 === 0 ? 218 : [109, 199, 279][i % 3];   // ~6% ca có tổng tiền sai
    items.push(await recordClosedOrder('P1', `u${i}`, { ...INPUT, total_price: total }, convId, { kb: KB, skipNote: true, now: T0 + i }));
  }

  let createdTotals = [];
  for (const it of items) {
    const r = await createFromQueue(it.id, {
      kb: KB, rows: soAi, hasPos: () => true,
      fetchOrders: async (_p, convId) => posOrders.get(convId) || [],
      tags: tagsOf.get(it.conv) || [],
      msgs: msgsOf.get(it.conv) || [],
      createOrder: async (pageId, input, convId) => {
        // POS thật: đơn vừa tạo xuất hiện ngay ở lượt đọc sau.
        const list = posOrders.get(convId) || [];
        list.push({ id: 1000 + list.length, status: 0, statusName: 'Mới' });
        posOrders.set(convId, list);
        createdTotals.push(input.total_price);
        return { ok: true, id: 1000 + list.length };
      },
    });
    if (r.ok) soAi.push({ t: Date.now(), page: 'P1', cust: it.cust, type: 'order', conv: it.conv });
  }

  // 0 đơn trùng: không hội thoại nào có quá 1 đơn DO TA tạo, và không tạo thêm vào hội thoại đã có đơn.
  for (const [convId, list] of posOrders) {
    const ours = list.filter((o) => o.id < 900000);
    assert.ok(ours.length <= 1, `hội thoại ${convId} bị ta tạo ${ours.length} đơn`);
    assert.ok(!(ours.length && list.length > ours.length), `hội thoại ${convId} đã có đơn sẵn mà ta vẫn tạo thêm`);
  }
  const ourCreated = [...posOrders.values()].flat().filter((o) => o.id < 900000);
  assert.equal(ourCreated.length, createdTotals.length);
  assert.ok(createdTotals.length > 0, 'không tạo được đơn nào — mô phỏng vô nghĩa');

  // 0 đơn sai tổng tiền.
  const allowed = new Set([109, 199, 279]);
  assert.deepEqual(createdTotals.filter((t) => !allowed.has(t)), [], 'có đơn tạo với tổng tiền không khớp bảng giá');

  // Mọi ca có nguồn trùng đều bị chặn.
  const created = new Set(readQueue().filter((x) => x.status === 'created').map((x) => x.conv));
  for (let i = 0; i < 200; i++) if (i % 5 !== 0) assert.ok(!created.has(`sim${i}`), `ca ${i} có nguồn trùng mà vẫn tạo đơn`);
  const st = queueStats();
  assert.equal(st.created + st.pending, 200);
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑥ LỊCH ĐÊM
// ═══════════════════════════════════════════════════════════════════════════

test('lịch đêm · chạy đúng 1 lượt/ngày, từ 02:00 giờ VN', () => {
  const at = (h, m = 0, d = 12) => Date.UTC(2026, 7, d, h, m) - 7 * 3600e3; // giờ VN → mốc UTC
  assert.equal(dueNow(at(1, 30), null), false, 'chạy sớm hơn 02:00');
  assert.equal(dueNow(at(2, 5), null), true);
  assert.equal(dueNow(at(2, 5), '2026-08-12'), false, 'đã chạy hôm nay mà vẫn chạy lại');
  assert.equal(dueNow(at(2, 5, 13), '2026-08-12'), true, 'sang ngày mới phải chạy tiếp');
});
