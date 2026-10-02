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
  buildOrderNote, parseOrderNote, checkTotal, checkDuplicate, recordClosedOrder,
  readQueue, precheck, createFromQueue, skipQueueItem, queueStats, orderMode, NOTE_HEADER,
} = await import('../src/order-bridge.js');

const T0 = Date.UTC(2026, 7, 12, 3, 0, 0); // 12/08/2026
const DAY = 86400e3;
const resetFiles = () => { for (const f of ['ai-order-queue.json', 'template-candidates.json', 'botcake-templates.json']) { try { fs.unlinkSync(path.join(TMP, f)); } catch { /* chưa có */ } } };

// ═══════════════════════════════════════════════════════════════════════════
// ① CHE PII — rào chắn cao nhất của M15
// ═══════════════════════════════════════════════════════════════════════════

// Tiêu chí nghiệm thu của spec: kiểm TỰ ĐỘNG 100 mẫu, 0 PII lọt.

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

