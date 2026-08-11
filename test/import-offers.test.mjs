// Bảng gói giá phải ra TIẾNG ANH và ĐÚNG SỐ LƯỢNG.
// Xuất xứ: 11/08/2026 — Fast Lane in "🎁 Mua 1 cái — 99 AED" cho khách Trung Đông.
// Hai lỗi trong một: sai ngôn ngữ (nguyên tắc #1) và sai số lượng (99 AED thực ra
// được 3 pcs, không phải 1). Ba dạng dưới đây lấy từ kịch bản Pancake THẬT.
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOffers } from '../src/import-script.js';
import { productTiers } from '../src/kb.js';

const VN = /\b(Mua|cái|tặng|hộp|tuýp|lọ|gói|Combo \d+ cái)\b/i;

test('Dạng 1 · mô tả trước, giá sau, kèm "Total: N PCS" (Golden Soap House UAE)', () => {
  const t = parseOffers([
    '🔥 SPECIAL PROMO TODAY 🔥',
    '🎁 Buy 1 Get 2 FREE - Only 99 AED',
    'Total: 3 PCS',
    '🎁 Buy 2 Get 3 FREE - Only 149 AED',
    'Total: 5 PCS',
    '🚚 Free Delivery',
  ].join('\n'));
  assert.equal(t.length, 2);
  assert.deepEqual(t.map((x) => x.price), [99, 149]);
  // SỐ LƯỢNG phải đúng: 99 = 3 pcs (nhãn cũ nói "Mua 1 cái")
  assert.match(t[0].label, /Buy 1 Get 2 FREE/i);
  assert.match(t[0].label, /3 pcs/i);
  assert.match(t[1].label, /5 pcs/i);
  t.forEach((x) => assert.ok(!VN.test(x.label), `lọt tiếng Việt: ${x.label}`));
});

test('Dạng 2 · giá trước, mô tả sau, đuôi "- free delivery" (10/29 page)', () => {
  const t = parseOffers([
    'We have a new 60% off sale:',
    '🌈149 AED 1 set - free delivery',
    '🌈239 AED 2 set - free delivery',
    'FREE SHIPPING + CASH ON DELIVERY',
  ].join('\n'));
  assert.deepEqual(t.map((x) => x.price), [149, 239]);
  assert.equal(t[0].label, '1 set');
  assert.equal(t[1].label, '2 set');
  // đuôi giao hàng bị cắt, KHÔNG được nuốt cả dòng
  t.forEach((x) => assert.ok(!/delivery|shipping/i.test(x.label)));
});

test('Dạng 3 · chữ hoa mỹ unicode né lọc Meta → vẫn đọc được', () => {
  const t = parseOffers('𝗕𝗨𝗬 𝟭 𝗧𝗔𝗞𝗘 𝟭 ( Total 2 𝐁𝐫𝐚𝐜𝐞𝐥𝐞𝐭 ) = 100 AED');
  assert.equal(t.length, 1);
  assert.equal(t[0].price, 100);
  assert.match(t[0].label, /BUY 1 TAKE 1/);
  assert.ok(!/[\u{1D400}-\u{1D7FF}]/u.test(t[0].label), 'còn sót chữ hoa mỹ');
});

test('Dòng không phải gói (phí ship, giá gạch) không thành gói giá', () => {
  const t = parseOffers('🚚 Free delivery\nCASH ON DELIVERY\nHello po!');
  assert.equal(t.length, 0);
});

test('Cùng một giá xuất hiện nhiều lần → gộp, giữ nhãn giàu thông tin nhất', () => {
  const t = parseOffers(['🌈13 KWD 1 set', 'Only 13 KWD', '🌈22 KWD 2 sets'].join('\n'));
  assert.deepEqual(t.map((x) => x.price), [13, 22]);
  assert.equal(t[0].label, '1 set');
});

test('productTiers: nhãn suy ra từ dữ liệu cũ cũng phải tiếng Anh', () => {
  const t = productTiers({ price1: 99, combo2: 149, combo3: 199 });
  assert.deepEqual(t.map((x) => x.label), ['Buy 1', 'Combo 2', 'Combo 3']);
  t.forEach((x) => assert.ok(!VN.test(x.label)));
  assert.equal(productTiers({ tiers: [{ qty: 2, price: 50 }] })[0].label, 'Buy 2');
});
