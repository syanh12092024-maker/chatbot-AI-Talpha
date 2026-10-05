// LL17b · SỐ LIỆU ĐỌC BIGQUERY — tầng A: luồng của đơn suy ĐÚNG luật bộ nạp đơn (`suyNguon`), gộp theo luồng chỉ đơn của TEAM và
// không gộp hai luồng; số theo page 30 ngày chỉ cho page CỦA team; bảng đơn của hệ là ảnh chụp cũ hơn khoảng đo ⇒ «chưa biết», không 0.
import test from 'node:test';
import assert from 'node:assert/strict';

import { SQL_DON_POS, SQL_DON_POS_PAGE, SO_NGAY_PAGE, LUONG_DON, tongHopTeam, theoPageTeam } from '../src/hrm/don-pos.js';
import { suyNguon } from '../src/pos/doc-don.js';

const NV = (emp_code, team_code) => ({ emp_code, team_code, ho_ten: emp_code, status: 'active' });
const HRM = { nhanVien: [NV('NV1', 'PIALPHA_GCC'), NV('NV3', 'PIALPHA_EU')] };
const D = (ngay, maNv, trangThai, soDon, luong) => ({ ngay, shop: 's1', tienTe: 'SAR', chia: 100, maNv, trangThai, soDon, cod: 0, luong });

test('Q1 · câu đọc: luồng theo `conversation_id` — rỗng ⇒ trang bán hàng · khuôn <page>_<psid> ⇒ messenger · khác ⇒ không suy được', () => {
  assert.match(SQL_DON_POS, /IFNULL\(JSON_VALUE\(payload_json, '\$\.conversation_id'\), ''\) = '' THEN 'trang_ban_hang'/);
  assert.match(SQL_DON_POS, /ELSE 'khong_suy_duoc' END AS luong/);
  assert.match(SQL_DON_POS, /o\.status_category, o\.luong,[\s\S]*GROUP BY 1, 2, 3, 4, 5, 6, 7, 8$/, 'luồng là một chiều gộp — thiếu thì BigQuery từ chối câu');
  assert.deepEqual(LUONG_DON, ['messenger', 'trang_ban_hang', 'khong_suy_duoc']);
  // Cùng LUẬT với bộ nạp đơn: khuôn của câu BigQuery chạy bằng JS phải phán y hệt `suyNguon` trên mọi mẫu.
  const re = new RegExp(SQL_DON_POS.match(/REGEXP_CONTAINS\(JSON_VALUE\(payload_json, '\$\.conversation_id'\), r'([^']+)'\)/)[1]);
  const bq = (c) => (c == null || c === '' ? 'trang_ban_hang' : re.test(c) ? 'messenger' : 'khong_suy_duoc');
  for (const c of [null, '', '123_456', '1295427313647127_998877', '123_', '_456', '123-456', 'abc_123', '123_456_7', ' 123_456', '١٢٣_٤٥٦']) {
    assert.equal(bq(c), suyNguon({ conversation_id: c }).nguon ?? 'khong_suy_duoc', `mẫu ${JSON.stringify(c)}`);
  }
});

test('Q2 · câu theo page: 30 ngày tới hôm nay · `page_id` rỗng thành NULL · gộp theo page × trạng thái', () => {
  assert.equal(SO_NGAY_PAGE, 30);
  assert.match(SQL_DON_POS_PAGE, /NULLIF\(page_id, ''\) AS page_id/);
  assert.match(SQL_DON_POS_PAGE, /BETWEEN DATE_SUB\(CURRENT_DATE\(\), INTERVAL 29 DAY\) AND CURRENT_DATE\(\)/);
  assert.match(SQL_DON_POS_PAGE, /GROUP BY 1, 2$/);
});

test('Q3 · gộp theo luồng: CHỈ đơn của team · 7/30 ngày · không gộp · luồng lạ vào «không suy được», không đoán', () => {
  const du = { homNay: '2026-10-02', dong: [
    D('2026-10-02', 'NV1', 'GIAO_THANH_CONG', 3, 'messenger'), D('2026-09-30', 'NV1', 'DON_HOAN', 1, 'trang_ban_hang'),
    D('2026-09-20', 'NV1', 'HUY', 4, 'trang_ban_hang'), D('2026-09-20', 'NV1', 'GIAO_THANH_CONG', 2, 'la_luong_moi'),
    D('2026-10-01', 'NV3', 'GIAO_THANH_CONG', 7, 'messenger'),   // team EU
    D('2026-10-01', null, 'GIAO_THANH_CONG', 6, 'messenger'),    // chưa ghép marketer ⇒ chờ gán, không vào luồng của team
  ] };
  const r = tongHopTeam(du, HRM, { slug: 'tieu-alpha' });
  assert.deepEqual([r.luong.messenger[7].don, r.luong.messenger[30].don], [3, 3]);
  assert.deepEqual([r.luong.trang_ban_hang[7].don, r.luong.trang_ban_hang[30].don, r.luong.trang_ban_hang[30].huy, r.luong.trang_ban_hang[30].hoan], [1, 5, 4, 1]);
  assert.equal(r.luong.khong_suy_duoc[30].don, 2);
  const tong = LUONG_DON.reduce((a, l) => a + r.luong[l][30].don, 0);
  assert.equal(tong, r.team[30].don, 'ba luồng cộng lại đúng bằng đơn của team — không sót, không đếm đôi');
  assert.equal(tongHopTeam(du, HRM, { slug: 'pialpha-eu' }).luong.messenger[30].don, 7);
});

test('Q4 · theo page: chỉ page CỦA team · đơn không page bị bỏ · trạng thái gộp đúng nhóm', () => {
  const du = { theoPage: [
    { page: '101', trangThai: 'GIAO_THANH_CONG', soDon: 5 }, { page: '101', trangThai: 'HUY', soDon: 2 }, { page: '101', trangThai: 'DON_HOAN', soDon: 1 },
    { page: '202', trangThai: 'GIAO_THANH_CONG', soDon: 9 },    // page team khác
    { page: null, trangThai: 'GIAO_THANH_CONG', soDon: 40 },   // trang bán hàng / tạo tay
    { page: '303', trangThai: 'UNKNOWN', soDon: 1 },
  ] };
  const r = theoPageTeam(du, ['101', 303]);
  assert.deepEqual(Object.keys(r).sort(), ['101', '303']);
  assert.deepEqual([r['101'].don, r['101'].thanhCong, r['101'].huy, r['101'].hoan], [8, 5, 2, 1]);
  assert.deepEqual([r['303'].don, r['303'].khac], [1, 1]);
  assert.deepEqual(theoPageTeam({}, ['101']), {}, 'bộ đọc cũ chưa có `theoPage` ⇒ rỗng, không chết');
});
