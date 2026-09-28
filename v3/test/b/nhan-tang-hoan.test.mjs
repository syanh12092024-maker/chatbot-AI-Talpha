// NHÃN TẦNG HOÀN của màn điều phối và bàn hội thoại PHẢI khớp tập mã của lược đồ.
//
// Bắt được 28/09 (UI-HT3): `CHU_TANG_HOAN` đặt tên `can_theo_doi`/`hoan_cao` — hai mã KHÔNG BAO
// GIỜ có trong CSDL. Lược đồ (CHECK `khach_tang_hoan_hop_le`, migration 005) chỉ cho
// `chua_du_don · tot · binh_thuong · canh_bao · rui_ro_cao`. Máy chủ 28/09: 5.990 khách
// `rui_ro_cao` + 5.449 `canh_bao` hiện MÃ THÔ màu xám trên màn chi tiết việc và ô xem nhanh —
// đúng khách hay hoàn hàng nhất lại không có nhãn đỏ. Ca này đọc thẳng file migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { CHU_TANG_HOAN, hoSoCua } from '../../src/ui/dispatch/chi-tiet.js';

const MIG = fileURLToPath(new URL('../../../db/migrate/005_loc_trung_va_ti_le_hoan.up.sql', import.meta.url));

function maTrongLuocDo() {
  const s = readFileSync(MIG, 'utf8');
  const m = s.match(/tang_hoan IS NULL OR tang_hoan IN\s*\(([^)]*)\)/);
  assert.ok(m, 'không đọc được CHECK khach_tang_hoan_hop_le — thước đang đo nhầm chỗ');
  return m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).sort();
}

test('mọi mã của lược đồ đều có nhãn, và không nhãn nào cho mã không tồn tại', () => {
  assert.deepEqual(Object.keys(CHU_TANG_HOAN).sort(), maTrongLuocDo());
});

test('khách hay hoàn nhất phải ĐỎ, cảnh báo phải CAM — không bao giờ xám', () => {
  assert.equal(hoSoCua({ ten: 'A', tang_hoan: 'rui_ro_cao' }).tangHoan.muc, 'chan');
  assert.equal(hoSoCua({ ten: 'A', tang_hoan: 'canh_bao' }).tangHoan.muc, 'nhac');
  assert.equal(hoSoCua({ ten: 'A', tang_hoan: 'chua_du_don' }).tangHoan.muc, 'mu');
  assert.equal(hoSoCua({ ten: 'A', tang_hoan: null }).tangHoan.chu, 'Chưa chấm', 'chưa chấm KHÔNG hiện xanh');
});
