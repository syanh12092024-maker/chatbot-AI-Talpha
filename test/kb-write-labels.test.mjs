// Đường GHI bảng gói giá cũng phải ra nhãn TIẾNG ANH.
//
// Xuất xứ 11/08/2026: bản vá cùng ngày chữa productTiers (đường ĐỌC) sang
// 'Buy N' nhưng bỏ sót updatePageProducts (đường GHI) — chỗ đó vẫn đóng dấu
// 'Mua N cái'. Đường ghi nguy hiểm hơn đường đọc: nhãn lọt vào đây là nằm
// VĨNH VIỄN trong kb-overrides.json, và Fast Lane in thẳng nhãn đó cho khách
// Trung Đông. Đo thật hôm đó: 3 page dính, 2 trong số đó đang bật AI.
//
// Trỏ KB_OVERRIDES_FILE sang file tạm TRƯỚC khi nạp kb.js — OVERRIDES_FILE là
// hằng tính lúc import, nên phải dynamic import sau khi đặt biến môi trường.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP = path.join(os.tmpdir(), `kb-overrides-test-${process.pid}.json`);
process.env.KB_OVERRIDES_FILE = TMP;
const { updatePageProducts, productTiers } = await import('../src/kb.js');

test.after(() => { try { fs.unlinkSync(TMP); } catch {} });

const VN = /\b(Mua|cái|tặng|hộp|tuýp|lọ|gói)\b|Combo \d+ cái/i;

test('updatePageProducts: tier chỉ có qty → nhãn tiếng Anh, không phải "Mua N cái"', () => {
  updatePageProducts('999000111', [
    { id: 'SP01', currency: 'AED', tiers: [{ qty: 1, price: 99 }, { qty: 2, price: 149 }] },
  ]);
  const luu = JSON.parse(fs.readFileSync(TMP, 'utf8'))['999000111'].products[0].tiers;
  assert.deepEqual(luu.map((t) => t.label), ['Buy 1', 'Buy 2']);
  luu.forEach((t) => assert.ok(!VN.test(t.label), `lọt tiếng Việt vào file: ${t.label}`));
});

test('updatePageProducts: nhãn người nhập được giữ nguyên, không bị đè', () => {
  updatePageProducts('999000112', [
    { id: 'SP01', currency: 'AED', tiers: [{ label: 'Buy 1 Get 2 FREE (Total 3 Products)', price: 99 }] },
  ]);
  const luu = JSON.parse(fs.readFileSync(TMP, 'utf8'))['999000112'].products[0].tiers;
  assert.equal(luu[0].label, 'Buy 1 Get 2 FREE (Total 3 Products)');
});

test('đường GHI và đường ĐỌC dùng CÙNG một nhãn dự phòng', () => {
  // Hai đường lệch nhau chính là gốc của lỗi 11/08 — khoá lại bằng test.
  updatePageProducts('999000113', [{ id: 'SP01', currency: 'AED', tiers: [{ qty: 3, price: 199 }] }]);
  const ghi = JSON.parse(fs.readFileSync(TMP, 'utf8'))['999000113'].products[0].tiers[0].label;
  const doc = productTiers({ tiers: [{ qty: 3, price: 199 }] })[0].label;
  assert.equal(ghi, doc);
});
