// BỘ CA PHIẾU BH1 — ba cửa: GIÁ do server quyết · hội thoại ĐÃ CHỐT bị khoá · van READONLY.
//
// ═══ BỘ CA NÀY PHẢI ĐO ĐƯỢC CẢ HAI CHIỀU ═══════════════════════════════════════════
// Án lệ B-Y7 (§9 sổ, 25/08): «ca khớp không chứng minh gì — khi hai nguồn PHẢI khớp thì
// bài test bắt buộc phải có ca chúng KHÔNG khớp». Nên mỗi cửa ở đây có cặp ca ĐÓNG/MỞ:
// chặn đúng cái phải chặn, VÀ cho qua đúng cái phải cho qua. Một cửa chặn tất cả cũng
// "xanh" ở chiều chặn, mà nó thì làm bot câm với mọi khách.
//
// ⚠️ KHÔNG chạm mạng: mọi ca hoặc dùng hàm thuần (`gia.js`), hoặc bị chặn TRƯỚC cửa POS
// (cửa mạng duy nhất trong tool, BH1 đã đẩy nó xuống sau hai cửa cục bộ), hoặc chạy với
// `pkConvId = ''` (⇒ `conversationHasOrder` trả false ngay, không gọi fetch).
// Ghi chú/thẻ Pancake cũng không bay: `.env` của máy này có `PANCAKE_READONLY=1`, chính
// là thứ ca G7 đo.

import test from 'node:test';
import assert from 'node:assert/strict';
import { tinhTong, chonGoi, bangGia, giaHopLe, MA } from '../src/core/gia.js';
import { vanGuiDangMo, assertCanSend, LoiVanGuiDong } from '../src/core/van-gui.js';
import { allowedPrices } from '../src/outbound-guard.js';
import { executeTool } from '../src/tools.js';
import { decideConv, S, OWNER } from '../src/conv-owner.js';
import { setConvState, getConv } from '../src/conv-state.js';

// ── Nguyên liệu: bảng giá THẬT, chép từ `kb-overrides.json` (page Golden Soap House KSA
//    và Glamora Jewelry — hai kiểu nhãn khác hẳn nhau, đúng cái làm việc khớp gói khó).
const KB_COMBO = {
  pageName: 'Golden Soap House KSA',
  products: [{
    id: 'P1', name: 'Luxury Perfume Soap', currency: 'SAR',
    tiers: [
      { label: 'Buy 1 Get 2 FREE (Total 3 Products)', price: 109 },
      { label: 'Buy 2 Get 3 FREE (Total 5 Products)', price: 159 },
    ],
  }],
};
const KB_SET = {
  pageName: 'Glamora Jewelry',
  products: [{
    id: 'P2', name: 'Birthstone Set', currency: 'SAR',
    tiers: [{ label: '1 Set', price: 199 }, { label: '2 Sets', price: 299 }],
  }],
};
const KB_TRONG = { pageName: 'Page chưa điền giá', products: [{ id: 'P3', name: 'X', currency: 'AED', tiers: [] }] };

const donDu = (them = {}) => ({
  name: 'Sara', phone: '0501234567', address: 'Villa 12, Al Barsha', city: 'Dubai',
  qty: 1, cod_confirmed: true, ...them,
});
const newState = (them = {}) => ({
  psid: 'bh1-psid', pageId: 'PAGE-BH1', pkConvId: '', pkCustId: 'CUST-BH1',
  messages: [], pendingImages: [], sentImages: new Set(), ...them,
});

// ═══════════════════════════════════════════════════════════════════════════════════
// G8 · MỘT SỰ THẬT, KHÔNG HAI BẢN — guard và cửa tạo đơn phải dùng chung một tập giá
// ═══════════════════════════════════════════════════════════════════════════════════
test('G8 · allowedPrices (chiều RA) === giaHopLe (chiều TẠO ĐƠN)', () => {
  for (const kb of [KB_COMBO, KB_SET, KB_TRONG]) {
    assert.deepEqual([...allowedPrices(kb)].sort(), [...giaHopLe(kb)].sort(),
      'hai chiều phải đọc CÙNG một bảng giá — lệch là một chiều nói sai');
  }
  assert.deepEqual([...giaHopLe(KB_COMBO)], [109, 159]);
  assert.equal(giaHopLe(KB_TRONG).size, 0, 'page chưa có gói → tập rỗng, không bịa');
});

test('bangGia giữ đủ nhãn + tiền tệ + mã sản phẩm', () => {
  const ds = bangGia(KB_SET);
  assert.equal(ds.length, 2);
  assert.equal(ds[0].tienTe, 'SAR');
  assert.equal(ds[1].nhan, '2 Sets');
  assert.equal(ds[0].spId, 'P2');
});

// ═══════════════════════════════════════════════════════════════════════════════════
// CHỌN GÓI — phải CHẮC mới chọn, không chắc thì nói không chắc
// ═══════════════════════════════════════════════════════════════════════════════════
test('chonGoi · nhãn khớp thẳng («2 sets» ↔ «2 Sets»)', () => {
  assert.equal(chonGoi({ kb: KB_SET, variant: '2 sets' })?.gia, 299);
  assert.equal(chonGoi({ kb: KB_SET, variant: '1 Set' })?.gia, 199);
});

test('chonGoi · chữ toán học 𝐁𝐮𝐲 𝟐 vẫn khớp (marketer hay dán kiểu này)', () => {
  const kb = { products: [{ id: 'P', currency: 'SAR', tiers: [
    { label: '𝐁𝐮𝐲 𝟏 𝐆𝐞𝐭 𝟏', price: 109 }, { label: '𝐁𝐮𝐲 2 𝐆𝐞𝐭 2', price: 169 }] }] };
  assert.equal(chonGoi({ kb, qty: 2 })?.gia, 169, 'nhãn unicode phải chuẩn hoá được về "buy 2 …"');
});

test('chonGoi · page CHỈ CÓ MỘT gói → không có gì để nhầm', () => {
  const kb = { products: [{ id: 'P', currency: 'AED', tiers: [{ label: 'bất kỳ', price: 89 }] }] };
  assert.equal(chonGoi({ kb, variant: 'khách nói linh tinh' })?.gia, 89);
});

test('chonGoi · KHÔNG ĐOÁN khi số nằm giữa nhãn — "Total 3 Products" ≠ khách muốn 3', () => {
  // Đây là ca nguy hiểm nhất: khớp lỏng sẽ chọn gói 109 cho khách muốn 3 cái, rồi thu
  // sai tiền của một người thật. Nhãn chứa cả 1, 2 và 3 — chỉ số ở ĐẦU nhãn mới tính.
  assert.equal(chonGoi({ kb: KB_COMBO, qty: 3 }), null);
  assert.equal(chonGoi({ kb: KB_COMBO, qty: 5 }), null);
});

test('chonGoi · variant mơ hồ khớp cả hai gói → null, không chọn bừa', () => {
  assert.equal(chonGoi({ kb: KB_COMBO, variant: 'FREE' }), null, '"FREE" có trong cả hai nhãn');
});

// ═══════════════════════════════════════════════════════════════════════════════════
// G1/G2/G4 · CỬA TIỀN — hàm thuần
// ═══════════════════════════════════════════════════════════════════════════════════
test('G1 · model khai số KHÔNG có trong bảng giá → CHẶN, kèm danh sách giá đúng', () => {
  const r = tinhTong({ kb: KB_COMBO, qty: 1, tong: 1 });
  assert.equal(r.chan, true);
  assert.equal(r.ma, MA.LECH_BANG_GIA);
  assert.match(r.lyDo, /109, 159/, 'phải nói ra giá hợp lệ để model sửa được');
  assert.equal(r.tong, 0, 'không được trả về con số nào để đi tiếp');
});

test('G1b · "2 sets" tính thành 2×159 = 318 (đúng kiểu bịa tổng của vụ 07/08) → CHẶN', () => {
  const r = tinhTong({ kb: KB_COMBO, variant: 'Buy 2 Get 3 FREE (Total 5 Products)', tong: 318 });
  assert.equal(r.chan, true);
  assert.equal(r.ma, MA.LECH_BANG_GIA);
});

test('G2 · model khai ĐÚNG giá một gói → cho qua, số đi tiếp là số đó', () => {
  const r = tinhTong({ kb: KB_COMBO, variant: 'Buy 2 Get 3 FREE (Total 5 Products)', tong: 159 });
  assert.equal(r.chan, false);
  assert.equal(r.ma, MA.OK);
  assert.equal(r.tong, 159);
  assert.equal(r.tienTe, 'SAR');
});

test('G2b · model chọn gói A nhưng báo giá gói B → CHẶN (LECH_GOI)', () => {
  const r = tinhTong({ kb: KB_SET, variant: '1 Set', tong: 299 });
  assert.equal(r.chan, true);
  assert.equal(r.ma, MA.LECH_GOI);
  assert.match(r.lyDo, /199/, 'nói rõ gói đó giá bao nhiêu');
});

test('G2c · model KHÔNG nêu tổng nhưng gói rõ ràng → SERVER tự điền', () => {
  const r = tinhTong({ kb: KB_SET, variant: '2 Sets' });
  assert.equal(r.chan, false);
  assert.equal(r.tong, 299, 'server điền hộ — sale bớt một lượt gõ tay');
});

test('G2d · KHÔNG nêu tổng + gói mơ hồ → KHÔNG chặn, để cửa ⑤ của order-bridge lo', () => {
  // Hành vi CÓ CHỦ Ý: chặn ở đây sẽ phá hợp đồng đang xanh của l2-m1 ca N1b, mà không
  // thêm lớp an toàn nào — `precheck` đã khoá nút Tạo đơn khi thiếu tổng.
  const r = tinhTong({ kb: KB_COMBO, qty: 3 });
  assert.equal(r.chan, false);
  assert.equal(r.ma, MA.CHUA_RO);
  assert.equal(r.tong, 0);
});

test('G4 · page CHƯA có bảng giá + model nêu tổng → CHẶN, cấm nêu tổng với khách', () => {
  const r = tinhTong({ kb: KB_TRONG, qty: 1, tong: 99 });
  assert.equal(r.chan, true);
  assert.equal(r.ma, MA.KHONG_CO_BANG_GIA);
  assert.match(r.lyDo, /TUYỆT ĐỐI không nêu tổng/);
});

test('G4b · page chưa có bảng giá + KHÔNG nêu tổng → không chặn (hành vi cũ giữ nguyên)', () => {
  assert.equal(tinhTong({ kb: KB_TRONG, qty: 1 }).chan, false);
});

// ═══════════════════════════════════════════════════════════════════════════════════
// G1/G2 qua ĐƯỜNG THẬT — executeTool, không chạm mạng
// ═══════════════════════════════════════════════════════════════════════════════════
test('G1-tool · giá sai → tool TỪ CHỐI, không có đơn nào được ghi nhận', async () => {
  const state = newState();
  const r = await executeTool('create_draft_order',
    donDu({ total_price: 1, variant: 'Buy 1 Get 2 FREE (Total 3 Products)' }),
    { kb: KB_COMBO, state });
  assert.equal(r.isError, true);
  assert.match(r.content, /TỪ CHỐI/);
  assert.ok(!state.closed, 'KHÔNG được đánh dấu đã chốt');
  assert.ok(!state.orderCreatedThisTurn, 'KHÔNG được bật cờ cho outbound-guard');
});

test('G2-tool · giá đúng → tool cho qua, và total_price bị GHI ĐÈ bằng số server', async () => {
  const state = newState();
  const input = donDu({ total_price: 199, variant: '1 Set' });
  const r = await executeTool('create_draft_order', input, { kb: KB_SET, state });
  assert.ok(!r.isError, `tool phải cho qua, nhận được: ${r.content}`);
  assert.equal(input.total_price, 199);
  assert.equal(input.currency, 'SAR');
  assert.ok(state.orderCreatedThisTurn);
});

test('G2-tool-b · model không nêu tổng, gói rõ → đơn có tổng ĐÚNG thay vì trống', async () => {
  const state = newState();
  const input = donDu({ variant: '2 Sets', qty: 2 });
  await executeTool('create_draft_order', input, { kb: KB_SET, state });
  assert.equal(input.total_price, 299, 'server điền vào chính object input đi xuống order-bridge');
});

test('cửa cũ KHÔNG bị BH1 làm hỏng: thiếu COD / địa chỉ / SĐT vẫn chặn trước cửa tiền', async () => {
  const state = newState();
  const a = await executeTool('create_draft_order', donDu({ cod_confirmed: false, total_price: 199 }), { kb: KB_SET, state });
  assert.match(a.content, /chưa xác nhận COD/);
  const b = await executeTool('create_draft_order', donDu({ address: 'x', total_price: 199 }), { kb: KB_SET, state });
  assert.match(b.content, /địa chỉ/);
  const c = await executeTool('create_draft_order', donDu({ phone: '12', total_price: 199 }), { kb: KB_SET, state });
  assert.match(c.content, /số điện thoại/i);
});

// ═══════════════════════════════════════════════════════════════════════════════════
// G5/G6 · HỘI THOẠI ĐÃ CHỐT
// ═══════════════════════════════════════════════════════════════════════════════════
test('G5 · decideConv: trạng thái CLOSING → AI KHÔNG được nói', () => {
  const conv = { id: 'bh1-conv-closing', tags: [], from: { name: 'K' } };
  setConvState(conv.id, S.CLOSING, OWNER.SALE, 'AI chốt đơn: Sara · 1 sp', { orderAt: Date.now() });
  const msgs = [{ from: { id: 'CUST' }, message: 'when will it arrive?' }];
  const r = decideConv({ pageId: 'PAGE-BH1', conv, msgs, custId: 'CUST-BH1', aiTexts: [] });
  assert.equal(r.allow, false, 'bảng quyền nói §6.3: CLOSING thì chỉ SALE được nói');
  assert.match(r.reason, /chốt đơn|sale/i);
});

test('G5b · chiều NGƯỢC LẠI: SELLING thì AI vẫn được nói (cửa không chặn bừa)', () => {
  const conv = { id: 'bh1-conv-selling', tags: [], from: { name: 'K' } };
  setConvState(conv.id, S.SELLING, OWNER.AI, 'AI đang phục vụ');
  const msgs = [
    { from: { id: 'PAGE-BH1' }, message: 'Hello po!' },
    { from: { id: 'CUST' }, message: 'how much po?' },
    { from: { id: 'CUST' }, message: 'is it legit?' },
  ];
  const r = decideConv({ pageId: 'PAGE-BH1', conv, msgs, custId: 'CUST-BH1', aiTexts: [] });
  assert.equal(r.allow, true, 'chặn cả SELLING là làm bot câm với khách đang mua');
});

test('G6 · tool: hội thoại đã có orderAt → từ chối tạo đơn lần hai, KHÔNG đi tới cửa POS', async () => {
  const convId = 'bh1-conv-daco';
  setConvState(convId, S.CLOSING, OWNER.SALE, 'đã chốt', { orderAt: Date.now() });
  const state = newState({ pkConvId: convId });
  const r = await executeTool('create_draft_order', donDu({ total_price: 199, variant: '1 Set' }), { kb: KB_SET, state });
  assert.equal(r.isError, true);
  assert.match(r.content, /ĐÃ CHỐT ĐƠN/);
  assert.equal(state.closed, true, 'vẫn phải nhớ là đã chốt để lượt sau không bán lại');
});

test('G6b · hội thoại CHƯA chốt → cửa này không cản', async () => {
  const convId = 'bh1-conv-chua';
  getConv(convId);                       // tạo bản ghi sạch, orderAt = 0
  const state = newState({ pkConvId: '' });   // pkConvId rỗng ⇒ không chạm mạng POS
  const r = await executeTool('create_draft_order', donDu({ total_price: 199, variant: '1 Set' }), { kb: KB_SET, state });
  assert.ok(!r.isError, 'hội thoại chưa chốt mà bị chặn là mất đơn');
});

// ═══════════════════════════════════════════════════════════════════════════════════
// G7 · VAN READONLY
// ═══════════════════════════════════════════════════════════════════════════════════
test('G7 · assertCanSend ném khi READONLY=1, im khi không', () => {
  const cu = process.env.PANCAKE_READONLY;
  try {
    process.env.PANCAKE_READONLY = '1';
    assert.equal(vanGuiDangMo(), false);
    assert.throws(() => assertCanSend('gửi tin'), LoiVanGuiDong);
    process.env.PANCAKE_READONLY = '0';
    assert.equal(vanGuiDangMo(), true);
    assert.doesNotThrow(() => assertCanSend('gửi tin'));
    delete process.env.PANCAKE_READONLY;
    assert.equal(vanGuiDangMo(), true, 'vắng biến = máy chủ = MỞ');
  } finally {
    if (cu === undefined) delete process.env.PANCAKE_READONLY; else process.env.PANCAKE_READONLY = cu;
  }
});

test('G7b · van đọc env TƯƠI mỗi lượt (không cache lúc import)', () => {
  const cu = process.env.PANCAKE_READONLY;
  try {
    process.env.PANCAKE_READONLY = '1'; assert.equal(vanGuiDangMo(), false);
    process.env.PANCAKE_READONLY = '0'; assert.equal(vanGuiDangMo(), true);
    process.env.PANCAKE_READONLY = '1'; assert.equal(vanGuiDangMo(), false);
  } finally {
    if (cu === undefined) delete process.env.PANCAKE_READONLY; else process.env.PANCAKE_READONLY = cu;
  }
});

test('G7c · flushPendingImages: van đóng → 0 ảnh bay đi, hàng đợi được dọn', async () => {
  const { flushPendingImages } = await import('../src/tools.js');
  const cu = process.env.PANCAKE_READONLY;
  try {
    process.env.PANCAKE_READONLY = '1';
    const state = newState({ pendingImages: [{ url: 'https://x/a.jpg', cat: 'sản phẩm' }], pendingCaption: 'hi' });
    const r = await flushPendingImages(state);
    assert.equal(r.sent, 0);
    assert.equal(r.total, 1);
    assert.equal(r.error, 'PANCAKE_READONLY=1');
    assert.equal(state.pendingImages.length, 0, 'dọn hàng đợi để lượt sau không gửi lại');
  } finally {
    if (cu === undefined) delete process.env.PANCAKE_READONLY; else process.env.PANCAKE_READONLY = cu;
  }
});

test('Backend draft: COD phải boolean, không nhận số lượng lẻ / sản phẩm lạ / gói sai số lượng', async () => {
  const { chuanBiDon } = await import('../src/orders/draft.js');
  const kb = { products: [{ id: 'sku', currency: 'AED', tiers: [{ label: 'Single', qty: 1, price: 15 }] }] };
  const input = donDu({ product_id: 'sku', qty: 1, total_price: 15, variant: 'Single' });
  for (const patch of [{ cod_confirmed: 'false' }, { qty: 1.5 }, { qty: 2 }, { product_id: 'alien' }, { total_price: Infinity }]) {
    assert.throws(() => chuanBiDon(kb, { ...input, ...patch }), /TỪ CHỐI/);
  }
  assert.equal(chuanBiDon(kb, { ...input, currency: 'USD' }).currency, 'AED');
});

test('Tool chỉ xác nhận khi backend lưu thành công; tool lặp trong lượt không lưu hai lần', async () => {
  const state = newState();
  const input = donDu({ total_price: 199, variant: '1 Set' });
  let count = 0;
  const ctx = { kb: KB_SET, state, business: { captureOrder: async () => { count++; throw new Error('DB unavailable'); } } };
  const failed = await executeTool('create_draft_order', input, ctx);
  assert.equal(failed.isError, true);
  assert.ok(!state.closed);
  ctx.business.captureOrder = async order => { count++; return { ok: true, captured: true, draft_id: 'pending-1', order }; };
  const saved = await executeTool('create_draft_order', input, ctx);
  const replay = await executeTool('create_draft_order', input, ctx);
  assert.equal(saved.isError, undefined);
  assert.deepEqual(replay, saved);
  assert.equal(count, 2, 'một lần fail + một lần lưu, không gọi lại khi replay');
});
