// THƯỚC: mọi tên cột mà `v3/src/audit/index.js` GHI, LỌC và SẮP đều phải tồn tại thật
// trong bảng `nhat_ky` của lược đồ (`db/schema.sql`, sinh từ `db/migrate/*.up.sql`).
//
// VÌ SAO CÓ THƯỚC NÀY (đo 17/09/2026): module ghi `thoi_gian` và `doi_tuong_loai` — hai cột
// KHÔNG TỒN TẠI (bảng có `xay_ra_luc` và `doi_tuong`) — cộng `ip` chưa có cột. Hậu quả đo
// được trên bản local: MỌI lượt ghi nhật ký ném `column ... does not exist`; mã thuộc
// `nhomBatBuoc` ném tiếp thành HTTP 500 SAU KHI việc chính đã chạy — thêm kết nối POS tạo
// hàng thật trong CSDL, người bấm nhận 500, và không một dòng nhật ký nào để truy ngược.
//
// 1842 ca xanh trong lúc đó, vì `v3/test/b/audit-*.test.mjs` chạy trên cổng giả và cổng giả
// nhận MỌI tên cột. Cổng giả là đúng cho việc nó làm; thiếu là thước đối chiếu với LƯỢC ĐỒ.
// Thước này không cần CSDL: một bên đọc tên cột từ `db/schema.sql`, một bên bắt tên cột
// ngay tại cổng ghi — không có danh sách gõ tay nào ở giữa (bẫy án lệ #22).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { taoBoiCanh, VAI } from '../../src/auth/boi-canh.js';
import {
  ghiNhatKy, docNhatKy, datTaoTruyVan, datPheuNhatKy, datDongHo, HANH_DONG, BANG,
} from '../../src/audit/index.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** Cột thật của `nhat_ky`: CREATE TABLE của 001 + mọi ADD COLUMN sau đó. */
function cotThat() {
  const sql = fs.readFileSync(path.join(GOC, 'db/schema.sql'), 'utf8');
  const khoi = sql.match(/CREATE TABLE nhat_ky \(([\s\S]*?)\n\);/);
  assert.ok(khoi, 'không tìm thấy CREATE TABLE nhat_ky trong db/schema.sql — thước hỏng, không phải code sạch');
  const cot = new Set();
  for (const dong of khoi[1].split('\n')) {
    const m = dong.trim().match(/^([a-z_]+)\s+[a-z]/);
    if (m && !['constraint', 'primary', 'unique', 'check', 'foreign'].includes(m[1])) cot.add(m[1]);
  }
  for (const m of sql.matchAll(/ALTER TABLE nhat_ky ADD COLUMN (?:IF NOT EXISTS )?([a-z_]+)/g)) cot.add(m[1]);
  for (const m of sql.matchAll(/ALTER TABLE nhat_ky DROP COLUMN (?:IF EXISTS )?([a-z_]+)/g)) cot.delete(m[1]);
  return cot;
}

/** Cổng bắt tên cột: KHÔNG dùng cổng giả — cổng giả thêm `id`/`tao_luc` của riêng nó. */
function congBat(bat) {
  datTaoTruyVan(() => ({
    async them(bang, banGhi) { bat.ghi.push([bang, Object.keys(banGhi)]); return { id: '1', ...banGhi }; },
    async chon(bang, dieuKien, tuyChon = {}) {
      bat.loc.push([bang, Object.keys(dieuKien)]);
      if (tuyChon.sapXep) bat.sap.push([bang, tuyChon.sapXep]);
      return [];
    },
    async dem(bang, dieuKien) { bat.loc.push([bang, Object.keys(dieuKien)]); return 0; },
  }));
  datPheuNhatKy(null);
  datDongHo(null);
}

const bc = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.QUAN_TRI], ip: '10.0.0.1' });

test('CỘT THẬT · mọi cột `ghiNhatKy` ghi đều có trong lược đồ', async () => {
  const bat = { ghi: [], loc: [], sap: [] };
  congBat(bat);

  // Đủ hình dạng: có/không đối tượng, có/không ghi chú, có/không trước-sau.
  await ghiNhatKy(bc, { hanhDong: HANH_DONG.NHAN_VIEC });
  await ghiNhatKy(bc, {
    hanhDong: HANH_DONG.DOI_MODEL, doiTuongLoai: 'cau_hinh_model', doiTuongId: 7,
    truoc: { a: 1 }, sau: { a: 2 }, ghiChu: 'đổi thử', ip: '10.0.0.9',
  });

  const cot = cotThat();
  assert.ok(bat.ghi.length >= 2, 'không bắt được lượt ghi nào — thước hỏng');
  for (const [bang, khoa] of bat.ghi) {
    assert.equal(bang, BANG);
    const la = khoa.filter((k) => !cot.has(k) && k !== 'team_id');  // team_id do cổng chèn
    assert.deepEqual(la, [], `ghi vào cột không có trong nhat_ky: ${la.join(', ')}`);
  }
});

test('CỘT THẬT · mọi cột `docNhatKy` lọc và sắp đều có trong lược đồ', async () => {
  const bat = { ghi: [], loc: [], sap: [] };
  congBat(bat);

  await docNhatKy(bc, {
    hanhDong: HANH_DONG.DOI_MODEL, nguoiDungId: 'u1',
    doiTuongLoai: 'cau_hinh_model', doiTuongId: 7,
    tuNgay: '2026-08-01', denNgay: '2026-08-31',
  });

  const cot = cotThat();
  assert.ok(bat.loc.length >= 1 && bat.sap.length >= 1, 'không bắt được lượt đọc — thước hỏng');
  for (const [, khoa] of bat.loc) {
    const la = khoa.filter((k) => !cot.has(k) && k !== 'team_id');
    assert.deepEqual(la, [], `lọc theo cột không có trong nhat_ky: ${la.join(', ')}`);
  }
  for (const [, khoa] of bat.sap) assert.ok(cot.has(khoa), `sắp theo cột không có trong nhat_ky: ${khoa}`);
});

test('CỘT THẬT · bốn cột NOT NULL không bao giờ nhận `null`', async () => {
  // `doi_tuong`, `doi_tuong_id`, `ghi_chu`, `ip` khai `NOT NULL DEFAULT ''`. DEFAULT chỉ áp
  // khi VẮNG cột; truyền `null` tường minh vẫn vi phạm ràng buộc và cả lượt ghi đổ.
  const ban = [];
  datTaoTruyVan(() => ({
    async them(_bang, banGhi) { ban.push(banGhi); return { id: '1', ...banGhi }; },
    async chon() { return []; }, async dem() { return 0; },
  }));
  datPheuNhatKy(null);

  await ghiNhatKy(bc, { hanhDong: HANH_DONG.NHAN_VIEC });          // không đối tượng, không ghi chú
  const sql = fs.readFileSync(path.join(GOC, 'db/schema.sql'), 'utf8');
  const khoi = sql.match(/CREATE TABLE nhat_ky \(([\s\S]*?)\n\);/)[1] + '\n'
    + [...sql.matchAll(/ALTER TABLE nhat_ky ADD COLUMN[^;]*;/g)].map((m) => m[0]).join('\n');
  const notNull = [...khoi.matchAll(/^\s*(?:ALTER TABLE nhat_ky ADD COLUMN (?:IF NOT EXISTS )?)?([a-z_]+)\s+[a-z][^,\n]*NOT NULL/gm)]
    .map((m) => m[1]).filter((c) => c !== 'team_id' && c !== 'id');
  assert.ok(notNull.length >= 4, `đọc hụt cột NOT NULL (${notNull.join(', ')}) — thước hỏng`);
  for (const c of notNull) {
    if (!(c in ban[0])) continue;                                   // vắng cột = DB tự điền
    assert.notEqual(ban[0][c], null, `ghi null vào cột NOT NULL \`${c}\``);
  }
});
