// `V3_SHEET_CHI_DANH_BA=1` — Sheet chỉ còn là DANH BẠ page (CR-28-09b · MN5).
//
// Canh ba điều: ① vắng cờ = hành vi cũ (sản phẩm + ba khối dùng chung vẫn đi từ Sheet);
// ② bật cờ = Sheet KHÔNG còn đưa sản phẩm lẫn Chính sách/FAQ/Phản đối vào prompt, nhưng tên,
// thị trường của page vẫn giữ; ③ bản chép v3 (`kb-overrides.json`) vẫn thắng như cũ.
// Nạp qua đường Excel (`loadKB`) vì nó đi CHUNG hàm `ingest` với đường Google Sheet.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import xlsx from 'xlsx';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mn5-'));
process.env.KB_OVERRIDES_FILE = path.join(TMP, 'kb-overrides.json');
fs.writeFileSync(process.env.KB_OVERRIDES_FILE, JSON.stringify({
  '7002': { products: [{ id: 'SP01', name: 'Từ v3', desc: '', currency: 'AED', tiers: [{ label: 'Buy 1', price: 99 }], images: [] }] },
}));
const kb = await import('../src/kb.js');
after(() => fs.rmSync(TMP, { recursive: true, force: true }));

const EXCEL = path.join(TMP, 'kb.xlsx');
const wb = xlsx.utils.book_new();
const hang = (...r) => r;
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([
  hang('Page ID', 'Tên Page', 'Thị trường', 'Ngành hàng', 'Tên MKT', 'Mã SP', 'Tên SP', 'Mô tả ngắn', 'Variant', 'Giá lẻ', 'Combo 2', 'Combo 3', 'Tiền tệ'),
  hang('7001', 'Page Sheet', 'UAE', 'Trang sức', 'Lan', 'S1', 'Món trong Sheet', '', '', 150, '', '', 'AED'),
  hang('7002', 'Page có bản v3', 'KSA', '', '', '', '', '', '', '', '', '', ''),
]), 'Sản phẩm theo Page');
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([hang('Hạng mục', 'Nội dung'), hang('Giao hàng', 'Delivery 2-4 days po')]), 'Chính sách');
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([hang('Q', '', 'A'), hang('COD?', '', 'Yes po')]), 'FAQ');
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([hang('Loại', 'Nói', 'Đáp'), hang('Chê giá', 'Mahal', 'Combo sulit')]), 'Xử lý phản đối');
xlsx.writeFile(wb, EXCEL);

test('SD1 · VẮNG cờ = hành vi cũ: sản phẩm và ba khối dùng chung vẫn đi từ Sheet', () => {
  delete process.env.V3_SHEET_CHI_DANH_BA;
  kb.loadKB(EXCEL);
  const t = kb.getKBForPage('7001').text;
  assert.match(t, /Món trong Sheet/);
  assert.match(t, /Delivery 2-4 days po/);
  assert.match(t, /Combo sulit/);
});

test('SD2 · BẬT cờ: Sheet không còn đưa sản phẩm lẫn Chính sách/FAQ/Phản đối vào prompt; danh bạ giữ nguyên', () => {
  process.env.V3_SHEET_CHI_DANH_BA = '1';
  try {
    kb.loadKB(EXCEL);
    const k = kb.getKBForPage('7001');
    assert.doesNotMatch(k.text, /Món trong Sheet/);
    assert.doesNotMatch(k.text, /Delivery 2-4 days po|Yes po|Combo sulit/);
    assert.doesNotMatch(k.text, /# CHÍNH SÁCH|# FAQ|# XỬ LÝ PHẢN ĐỐI/, 'không để lại tiêu đề rỗng');
    const ds = kb.getPageList();
    assert.deepEqual(ds.find((p) => p.id === '7001'), { id: '7001', name: 'Page Sheet', market: 'UAE', category: 'Trang sức', marketer: 'Lan', products: 0 });
  } finally { delete process.env.V3_SHEET_CHI_DANH_BA; }
});

test('SD3 · BẬT cờ: bản chép v3 trong kb-overrides.json vẫn thắng — page của nó vẫn bán đúng món', () => {
  process.env.V3_SHEET_CHI_DANH_BA = '1';
  try {
    kb.loadKB(EXCEL);
    const t = kb.getKBForPage('7002').text;
    assert.match(t, /Từ v3/);
    assert.match(t, /Buy 1: 99 AED/);
    assert.doesNotMatch(t, /Delivery 2-4 days po/);
  } finally { delete process.env.V3_SHEET_CHI_DANH_BA; }
});
