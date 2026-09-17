// ĐƠN CHỤP GIÁ LÚC TẠO (migration 022).
//
// Trước lượt này `don_hang` chỉ giữ `tong_tien`. Muốn biết đơn bán gì, giá bao nhiêu thì
// phải lần ngược `hang_cho_tao_don` — bảng THAO TÁC, dọn được và sẽ dọn. Và cách «tiện»
// nhất để suy ra đơn giá là đọc lại `goi_gia`, tức đọc giá của HÔM NAY cho một đơn của
// tháng trước: đổi một bậc giá là mọi con số lịch sử đổi theo, im lặng.
//
// Ca ở đây đọc THẲNG câu SQL — thứ cần khoá là «cột nào được ghi và lấy từ nguồn nào»,
// mà điều đó không quan sát được qua một pool giả.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NGUON = fs.readFileSync(path.join(GOC, 'src/orders/hang-cho.js'), 'utf8');
const LUOC_DO = fs.readFileSync(path.join(GOC, 'db/schema.sql'), 'utf8');
// Neo từ MỐC CHỤP GIÁ tới hết câu INSERT — `RETURNING *` xuất hiện nhiều lần trong tệp,
// lấy cái đầu tiên thì cắt nhầm sang một câu khác ở phía trên.
const MOC = NGUON.indexOf('CHỤP GIÁ LÚC TẠO');
// Kết thúc ở dòng NHẬN kết quả, không ở `RETURNING *`: chuỗi ấy nằm TRONG câu SQL, nên
// cắt tại đó là bỏ mất chính danh sách tham số — phần đang cần soi.
const THAN = NGUON.slice(MOC, NGUON.indexOf('const don = dh.rows[0]', MOC));
const CAU = THAN;

test('DC1 · năm cột ảnh chụp đều có trong lược đồ VÀ đều được ghi', () => {
  for (const cot of ['so_luong', 'gia_goi', 'phi_ship', 'khuyen_mai', 'san_pham_goc_ma']) {
    assert.match(LUOC_DO, new RegExp(`ALTER TABLE don_hang ADD COLUMN ${cot}\\b`), `lược đồ thiếu cột ${cot}`);
    assert.ok(CAU.includes(cot), `câu INSERT không ghi cột ${cot} — cột có mà không ai điền thì tệ hơn không có`);
  }
});

test('DC2 · giá lấy từ BẬC ĐÃ KHỚP của cửa 2, KHÔNG đọc lại bảng giá', () => {
  const than = THAN;
  assert.match(than, /cuaKiem\?\.cong\?\.\["2_tien"\]\?\.goi/, 'phải lấy từ kết quả cửa 2');
  assert.ok(!/FROM goi_gia/.test(than), 'CẤM đọc lại `goi_gia` ở đây — đó là giá của hôm nay');
});

test('DC3 · phí ship NULL giữ nguyên NULL, không quy về 0', () => {
  const than = THAN;
  assert.match(than, /goiKhop\?\.phi_ship \?\? null/);
  assert.ok(!/phi_ship \|\| 0/.test(than), '«chưa khai phí ship» KHÁC «ship 0 đồng»');
});

test('DC4 · lưu giá CẢ GÓI, không lưu đơn giá suy ra bằng phép chia', () => {
  // `Buy 1 Get 1 = 99` không chia được cho số món. Một cột tên `don_gia` sẽ mời mọi báo
  // cáo sau này chia bậy.
  assert.ok(!/don_gia/.test(LUOC_DO), 'không được có cột tên don_gia');
  assert.match(LUOC_DO, /gia_goi/);
  const than = THAN;
  assert.ok(!/\/\s*Number\(duLieu\.so_luong\)/.test(than), 'không chia tổng cho số lượng');
});
