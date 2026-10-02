// Bảng gói giá phải ra TIẾNG ANH và ĐÚNG SỐ LƯỢNG.
// Xuất xứ: 11/08/2026 — Fast Lane in "🎁 Mua 1 cái — 99 AED" cho khách Trung Đông.
// Hai lỗi trong một: sai ngôn ngữ (nguyên tắc #1) và sai số lượng (99 AED thực ra
// được 3 pcs, không phải 1). Ba dạng dưới đây lấy từ kịch bản Pancake THẬT.
import test from 'node:test';
import assert from 'node:assert/strict';
import { productTiers } from '../src/kb.js';

const VN = /\b(Mua|cái|tặng|hộp|tuýp|lọ|gói|Combo \d+ cái)\b/i;

test('productTiers: nhãn suy ra từ dữ liệu cũ cũng phải tiếng Anh', () => {
  const t = productTiers({ price1: 99, combo2: 149, combo3: 199 });
  assert.deepEqual(t.map((x) => x.label), ['Buy 1', 'Combo 2', 'Combo 3']);
  t.forEach((x) => assert.ok(!VN.test(x.label)));
  assert.equal(productTiers({ tiers: [{ qty: 2, price: 50 }] })[0].label, 'Buy 2');
});
