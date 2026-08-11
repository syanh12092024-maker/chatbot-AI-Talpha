// Nghiệm thu M06 (Fast Lane) + M09 (Outbound Guard) — chạy: npm test
// Không gọi mạng, không cần .env. Dữ liệu test lấy từ TIN THẬT đo trên VPS 10/08/2026.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guardOutbound, looksVietnamese, hasVietnameseNoun, extractMoney } from '../src/outbound-guard.js';
import { fastLane, detectLang } from '../src/fast-lane.js';

// KB giả: 1 sản phẩm, 2 gói giá — giống page thật (SET 1 / SET 2)
const KB = {
  text: '# SẢN PHẨM & GIÁ\n- [P1] Mentha Toothpaste Tablets\n    Giá — SET 1: 99 AED | SET 2: 149 AED',
  products: [{ id: 'P1', name: 'Mentha Toothpaste Tablets', currency: 'AED', price1: null, tiers: [{ label: 'SET 1 (3 pcs)', price: 99 }, { label: 'SET 2 (6 pcs)', price: 149 }] }],
  config: {},
};
const KB_NO_PRICE = { text: '', products: [], config: {} };

// ═══════════════════════════════════════════════════════════════════════════
// M09 · OUTBOUND GUARD
// ═══════════════════════════════════════════════════════════════════════════

test('G1 · chặn tin rỗng / "..." / <div></div>', () => {
  for (const t of ['', '   ', '...', '…', '<div></div>', '<div></div> ...']) {
    const v = guardOutbound(t, { kb: KB });
    assert.equal(v.ok, false, `phải chặn: ${JSON.stringify(t)}`);
    assert.equal(v.rule, 'EMPTY');
    assert.equal(v.action, 'block');
  }
});

test('G2 · chặn tin lọt tiếng Việt', () => {
  const v = guardOutbound('Chào anh, nhân viên của chúng tôi sẽ liên hệ với anh ạ.', { kb: KB });
  assert.equal(v.ok, false);
  assert.equal(v.rule, 'VIETNAMESE');
  assert.equal(v.alert, true);
});

test('G2b · KHÔNG bắt nhầm Tagalog / English / Ả Rập', () => {
  const ok = [
    'Hello po! 😊 SET 1 (3 pcs) — 99 AED po. Ilan po ang gusto niyo?',
    'Sige po, salamat! COD po — bayad na lang pagdating ng order.',
    'أهلاً! السعر 99 AED والدفع عند الاستلام.',
    'Yes po, free delivery! Ready na po ba kayo?',
  ];
  for (const t of ok) assert.equal(looksVietnamese(t), false, `không được bắt nhầm: ${t}`);
});

test('G3 · chặn bịa mã đơn khi chưa gọi tool', () => {
  const t = 'Order received po! Your Order ID is SA830781312027. 🎉';
  assert.equal(guardOutbound(t, { kb: KB, orderCreated: false }).rule, 'FAKE_ORDER_ID');
  // đã gọi tool thành công thì không chặn vì lý do này nữa
  const v = guardOutbound(t, { kb: KB, orderCreated: true, isOrderSummary: true });
  assert.notEqual(v.rule, 'FAKE_ORDER_ID');
});

test('G4 · chặn TỔNG TIỀN không khớp gói nào (vụ Priscela Amon)', () => {
  // khách nói "2 sets", AI tính 2 × 149 = 298 → BỊA TỔNG
  const v = guardOutbound('Noted po! 2 sets = 298 AED total. COD po 😊', { kb: KB });
  assert.equal(v.ok, false);
  assert.equal(v.rule, 'PRICE_MISMATCH');
  assert.match(v.reason, /298/);
});

test('G4b · cho qua giá ĐÚNG theo bảng, mọi định dạng', () => {
  for (const t of ['SET 1 — 99 AED po 😊', 'AED 149 for SET 2 po', 'Both po: 99 AED or 149 AED?']) {
    assert.equal(guardOutbound(t, { kb: KB }).ok, true, `phải cho qua: ${t}`);
  }
});

test('G4c · KHÔNG bắt nhầm số không phải tiền', () => {
  const t = '2-5 working days po 🚚 18K gold, 30 tablets per box. Free delivery po!';
  assert.equal(guardOutbound(t, { kb: KB }).ok, true);
});

test('G4e · CHO PHÉP bẻ nhỏ đơn giá (ladder bước 1 của HARD_RULES)', () => {
  // 149 AED / 6 pcs ≈ 25 AED mỗi cái — đây là gỡ phản đối giá, KHÔNG phải bịa tổng
  const v = guardOutbound('SET 2 po — 149 AED for 6 pcs, that\'s only ~25 AED each! 😊', { kb: KB });
  assert.equal(v.ok, true, `bị chặn nhầm bởi ${v.rule}`);
  // nhưng số LỚN HƠN mọi gói thì vẫn là bịa tổng, kể cả có chữ "each"
  assert.equal(guardOutbound('Total 298 AED each po', { kb: KB }).rule, 'PRICE_MISMATCH');
});

test('G4d · page không có bảng giá thì bỏ qua luật tiền (không chặn oan)', () => {
  assert.equal(guardOutbound('Price is 250 AED po', { kb: KB_NO_PRICE }).ok, true);
});

test('G5 · yêu cầu viết lại khi tin quá dài', () => {
  const v = guardOutbound('a'.repeat(1400), { kb: KB });
  assert.equal(v.rule, 'TOO_LONG');
  assert.equal(v.action, 'rewrite');
});

test('G6 · chặn dán checklist xin thông tin (tin thật của Botcake)', () => {
  const t = 'Please provide the information below for the shipping\n✔️Your full name\n✔️Contact number:\n✔️Complete Address and Emirate:';
  assert.equal(guardOutbound(t, { kb: KB }).rule, 'CHECKLIST');
});

test('G7 · chặn tin lặp lại y hệt tin vừa gửi', () => {
  const prev = 'Hello po! 😊 SET 1 — 99 AED. Ilan po ang gusto niyo?';
  assert.equal(guardOutbound(prev, { kb: KB, lastAiText: prev }).rule, 'DUPLICATE');
});

test('G8 · chặn ký tự Unicode vô hình (né trùng lặp Meta)', () => {
  const t = '\u{E001C}\u{E0106}Hello, has any staff contacted you yet?';
  const v = guardOutbound(t, { kb: KB });
  assert.equal(v.rule, 'INVISIBLE_CHARS');
  assert.equal(v.alert, true);
});

test('G9 · chặn tin DOẠ khách (tin thật ở luồng RTO)', () => {
  const t = "If you still not response, i'm verry sorry to say that I'll be taking you to social media. And posting in group of Fililipino in SAUDI. Please reply";
  const v = guardOutbound(t, { kb: KB });
  assert.equal(v.rule, 'THREAT');
  assert.equal(v.action, 'block');
  assert.equal(v.alert, true);
});

test('G10 · chặn hứa ngày giao cụ thể', () => {
  for (const t of ['Your order will be delivered tomorrow po! 🚚', 'Bukas po darating ang order niyo!', 'You will receive it today po 😊']) {
    assert.equal(guardOutbound(t, { kb: KB }).rule, 'DELIVERY_PROMISE', `phải chặn: ${t}`);
  }
  // khung chung thì được
  assert.equal(guardOutbound('2-5 working days po from our warehouse 🚚', { kb: KB }).ok, true);
});

test('G10b · KHÔNG bắt nhầm "FREE SHIPPING TODAY ONLY" thành hứa ngày giao', () => {
  // Đây là khuyến mãi (đã có luật FAKE_SCARCITY lo), không phải hứa ngày giao.
  const kbPromo = { ...KB, text: KB.text + '\nKhuyến mãi: FREE SHIPPING TODAY ONLY' };
  const v = guardOutbound('🚚 FREE SHIPPING — TODAY ONLY! ⚡ SET 1 — 99 AED po', { kb: kbPromo });
  assert.notEqual(v.rule, 'DELIVERY_PROMISE');
});

test('G3b · KHÔNG bắt nhầm "order now" thành mã đơn', () => {
  const t = 'No problem po! 😊 Just to clarify — no need to order now, or gusto niyo pong mag-order?';
  assert.notEqual(guardOutbound(t, { kb: KB, orderCreated: false }).rule, 'FAKE_ORDER_ID');
});

test('G11 · chặn đọc lại SĐT khách ngoài lượt tóm tắt đơn', () => {
  const t = 'Noted po ang number niyo 0536064249, salamat! 😊';
  assert.equal(guardOutbound(t, { kb: KB, isOrderSummary: false }).rule, 'PII_ECHO');
  // lượt tóm tắt xác nhận đơn thì được đọc lại đúng 1 lần
  assert.equal(guardOutbound(t, { kb: KB, isOrderSummary: true }).ok, true);
});

test('G12 · chặn bịa khan hiếm không có trong KB', () => {
  const t = '🔥 SPECIAL PROMO TODAY ONLY 🔥 SET 1 — 99 AED!';
  assert.equal(guardOutbound(t, { kb: KB }).rule, 'FAKE_SCARCITY');
  // KB có ghi khuyến mãi thì cho qua
  const kb2 = { ...KB, text: KB.text + '\nKhuyến mãi: LIMITED PROMO 50% OFF' };
  assert.notEqual(guardOutbound(t, { kb: kb2 }).rule, 'FAKE_SCARCITY');
});

test('G13 · tin bán hàng bình thường phải ĐI QUA sạch', () => {
  const ok = [
    'Hello po! 😊 SET 1 (3 pcs) — 99 AED, free delivery po.\nIlan po ang gusto niyo? 😊',
    'Sige po! COD po — tingnan niyo muna bago magbayad. SET 1 or SET 2 po? 😊',
    'Yes po, 100% natural po ito. Gusto niyo po bang makita ang feedback ng ibang customers? 😊',
    'أهلاً! السعر 99 AED، والتوصيل مجاني والدفع عند الاستلام. كم قطعة تحب؟',
  ];
  for (const t of ok) {
    const v = guardOutbound(t, { kb: KB });
    assert.equal(v.ok, true, `phải cho qua nhưng bị ${v.rule}: ${t}`);
  }
});

test('G14 · extractMoney chỉ lấy số dính đơn vị tiền', () => {
  assert.deepEqual(extractMoney('99 AED and SAR 149, 2-5 days, 18K'), [99, 149]);
  assert.deepEqual(extractMoney('30 tablets in 2 boxes'), []);
});

// ═══════════════════════════════════════════════════════════════════════════
// M06 · FAST LANE
// ═══════════════════════════════════════════════════════════════════════════

const FL = (text, extra = {}) => fastLane({ text, kb: KB, aiTurns: 1, lastAiText: '', usedLanes: new Set(), ...extra });

test('F1 · sticker/<div></div> sau khi AI đã nói → IM, không gọi LLM', () => {
  const r = FL('<div></div>');
  assert.equal(r.handled, true);
  assert.equal(r.reply, null);
  assert.equal(r.lane, 'silent_sticker');
});

test('F1b · sticker khi AI CHƯA nói lượt nào → leo lên AI (có thể là ảnh có nội dung)', () => {
  assert.equal(FL('<div></div>', { aiTurns: 0 }).handled, false);
});

test('F2 · nút START → câu chào dựng từ KB, 0 token', () => {
  const r = FL('Start', { aiTurns: 0 });
  assert.equal(r.handled, true);
  assert.match(r.reply, /99 AED/);
  assert.match(r.reply, /149 AED/);
});

test('F3 · cảm ơn/ậm ừ sau khi AI nói xong → IM (không bao giờ là lời chốt đơn)', () => {
  for (const t of ['Thank you', 'salamat po', 'hm', '👍', 'shukran']) {
    const r = FL(t, { lastAiText: 'Ready na po ba kayo? 😊' });
    assert.equal(r.handled, true, `phải xử lý: ${t}`);
    assert.equal(r.reply, null);
  }
});

test('F3b · ⚠️ "yes" ngay sau CÂU HỎI của AI → PHẢI leo lên AI (đây là đồng ý chốt)', () => {
  const asked = 'Ready na po ba kayong mag-order? 😊'; // dấu ? KHÔNG ở cuối câu
  for (const t of ['yes', 'opo', 'sige po', 'ok po', 'oo', 'noted po']) {
    const r = FL(t, { lastAiText: asked });
    assert.equal(r.handled, false, `"${t}" sau câu hỏi phải leo lên AI, không được im`);
  }
});

test('F3c · ⚠️ không biết AI vừa nói gì (restart) → "yes" vẫn leo lên AI', () => {
  assert.equal(FL('opo', { lastAiText: '' }).handled, false);
});

test('F3d · "ok" sau tin AI KHÔNG hỏi gì → IM', () => {
  const r = FL('ok po', { lastAiText: 'Salamat po! Nandito lang kami. 😊' });
  assert.equal(r.handled, true);
  assert.equal(r.reply, null);
  assert.equal(r.lane, 'silent_affirm');
});

test('F3e · ⚠️ khách TỪ CHỐI → luôn leo lên AI (nguyên tắc 14, ladder 3 bước)', () => {
  for (const t of ['no', 'hindi po', 'ayoko', 'next time', 'wala po', 'not now']) {
    assert.equal(FL(t, { lastAiText: 'Salamat po!' }).handled, false, `"${t}" phải leo lên AI để chạy ladder`);
  }
});

test('G6b · KHÔNG chặn tóm tắt đơn có giá trị (khác hẳn checklist xin thông tin)', () => {
  const t = 'Thank you po, Grace! 🌸\n- **Name:** Grace Pranom\n- **Address:** Riyadh, District 1\n- **Package:** SET 1 — 99 AED';
  const v = guardOutbound(t, { kb: KB, isOrderSummary: true, orderCreated: true });
  assert.equal(v.ok, true, `tóm tắt đơn bị chặn nhầm bởi ${v.rule}`);
});

test('F4 · chào hỏi lần đầu → câu chào; chào lại giữa chừng → IM', () => {
  assert.equal(FL('Hi po', { aiTurns: 0 }).handled, true);
  const r = FL('hello', { aiTurns: 2 });
  assert.equal(r.handled, true);
  assert.equal(r.reply, null);
});

test('F5 · hỏi giá → bảng giá dựng từ KB (giá LUÔN đúng)', () => {
  for (const t of ['how much', 'magkano po', 'كم السعر', 'price?']) {
    const r = FL(t);
    assert.equal(r.handled, true, `phải xử lý: ${t}`);
    assert.match(r.reply, /99/);
    // câu mẫu phải qua được chính cửa kiểm duyệt của mình
    assert.equal(guardOutbound(r.reply, { kb: KB }).ok, true, `câu mẫu bị guard chặn: ${r.reply}`);
  }
});

test('F5b · hỏi giá LẦN 2 → leo lên AI (template không thoả mãn được khách)', () => {
  const used = new Set();
  assert.equal(fastLane({ text: 'how much', kb: KB, aiTurns: 1, usedLanes: used }).handled, true);
  assert.equal(fastLane({ text: 'magkano po', kb: KB, aiTurns: 1, usedLanes: used }).handled, false);
});

test('F6 · hỏi ship / cách đặt → câu mẫu', () => {
  assert.equal(FL('ilang araw po ang delivery').handled, true);
  assert.equal(FL('how to order po').handled, true);
});

test('F7 · TÍN HIỆU NÓNG luôn leo lên AI, không bao giờ template', () => {
  const hot = [
    '0536064249',                                  // số điện thoại
    'ang mahal naman po',                          // phản đối giá
    'iisipin ko muna po',                          // do dự
    'peke ba ito?',                                // nghi ngờ chất lượng
    'gusto ko po mag order',                       // ý định mua
    'Amy Añoza, 0536064249, Alrawdah Jeddah',      // thông tin đơn
  ];
  for (const t of hot) assert.equal(FL(t).handled, false, `phải leo lên AI: ${t}`);
});

test('F8 · câu hỏi thật sự → leo lên AI', () => {
  for (const t of ['halal ba po ito?', 'may side effect po ba?', 'pwede ba sa buntis?']) {
    assert.equal(FL(t).handled, false, `phải leo lên AI: ${t}`);
  }
});

test('F9 · page chưa có bảng giá → không bịa, leo lên AI', () => {
  const r = fastLane({ text: 'how much', kb: KB_NO_PRICE, aiTurns: 1, usedLanes: new Set() });
  assert.equal(r.handled, false);
});

test('F10 · nhận đúng ngôn ngữ', () => {
  assert.equal(detectLang('magkano po'), 'tl');
  assert.equal(detectLang('كم السعر'), 'ar');
  assert.equal(detectLang('how much is this'), 'en');
});

// ── Vài chữ tiếng Việt lọt ra (11/08/2026) ──────────────────────────────────
// Nhãn gói giá "Mua 1 cái" bị Fast Lane in thẳng cho khách. Bộ chấm điểm cũ
// đếm TỪ CHỨC NĂNG ("là/của/và") nên nhãn toàn danh từ được 0 điểm → lọt.
test('G1 · nhãn gói tiếng Việt phải bị bắt (chấm điểm cũ mù với dạng này)', () => {
  const tin = '🎁 Mua 1 cái — 99 AED\n🎁 Combo 2 cái — 149 AED\n🚚 FREE delivery po, at COD';
  assert.equal(looksVietnamese(tin), false, 'chấm điểm cũ vẫn mù — đúng như đo được');
  assert.equal(hasVietnameseNoun(tin), true);
  const v = guardOutbound(tin, { kb: KB });
  assert.equal(v.ok, false);
  assert.equal(v.rule, 'VIETNAMESE_WORD');
  // REWRITE chứ không BLOCK: câu còn lại dùng được, chặn thẳng là khách trắng tay.
  assert.equal(v.action, 'rewrite');
});

test('G2 · KHÔNG bắt oan tiếng Anh / Tagalog / Ả Rập', () => {
  // Đo thật: trên 9.043 tin AI production, luật này bắt thêm đúng 3 tin và cả
  // 3 đều là rò rỉ thật — 0 bắt oan. Vài câu tiêu biểu giữ lại làm chốt chặn.
  for (const t of [
    'Buy 1 Get 2 FREE (Total 3 Products) — 99 AED. COD po!',
    'Salamat po, Ma\'am! Sandali lang po, may makakausap kayong team member.',
    'كم السعر؟ التوصيل مجاني',
    'I understand po, mas sulit ang combo — 149 AED for 5 pcs.',
    'Your order is confirmed po. Cash on delivery, 2-5 days.',
  ]) {
    assert.equal(hasVietnameseNoun(t), false, `bắt oan: ${t}`);
    assert.equal(guardOutbound(t, { kb: KB }).rule === 'VIETNAMESE_WORD', false, `bắt oan: ${t}`);
  }
});

test('G3 · .test() không được nhớ lastIndex giữa các lần gọi (bẫy cờ /g)', () => {
  const tin = 'Mua 1 cái';
  for (let i = 0; i < 5; i++) assert.equal(hasVietnameseNoun(tin), true, `lần ${i + 1} trượt`);
});
