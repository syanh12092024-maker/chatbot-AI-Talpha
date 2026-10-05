// LL17d · TEAM CỦA ĐƠN THEO NGÀY ĐƠN (nợ N-DON-TEAM-THEO-NGAY; luật ký CR-28-09c «đơn thuộc team của marketer VÀO NGÀY ĐƠN»). Đo 05/10:
// một marketer chuyển GCC → EU, 628 đơn 07/08–31/08 làm ở GCC đang bị tính cho EU. Team suy TRONG BigQuery từ lịch sử team HRM.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SQL_DON_POS, tongHopTeam } from '../src/hrm/don-pos.js';

test('R1 · câu đọc: lịch sử team HRM · dòng phủ NGÀY ĐƠN (hết hạn NULL = đang hiệu lực) · nhiều dòng ⇒ bắt đầu muộn nhất · LEFT JOIN (không rơi đơn)', () => {
  assert.match(SQL_DON_POS, /`levelup-465304`\.HRM_Core\.fact_employee_team_history h/);
  assert.match(SQL_DON_POS, /h\.hieu_luc_tu <= d\.ngay AND \(h\.hieu_luc_den IS NULL OR d\.ngay <= h\.hieu_luc_den\)/);
  assert.match(SQL_DON_POS, /ARRAY_AGG\(h\.team_code ORDER BY h\.hieu_luc_tu DESC LIMIT 1\)\[SAFE_OFFSET\(0\)\] AS team_ngay/);
  assert.match(SQL_DON_POS, /FROM om LEFT JOIN dh ON dh\.emp_code = om\.emp_code AND dh\.ngay = om\.ngay/, 'JOIN thường sẽ rơi đơn không có lịch sử');
  assert.match(SQL_DON_POS, /SELECT DISTINCT emp_code, ngay FROM om/, 'gộp theo (mã NV, ngày) trước — không nhân dòng đơn');
  assert.doesNotMatch(SQL_DON_POS, /\b(INSERT|UPDATE|DELETE|MERGE|CREATE|DROP)\b/i);
});

const HRM = { nhanVien: [
  { emp_code: 'NV1', team_code: 'PIALPHA_EU', ho_ten: 'An', status: 'active' },        // HIỆN TẠI ở EU (đã chuyển từ GCC)
  { emp_code: 'NV2', team_code: 'PIALPHA_GCC', ho_ten: 'Bình', status: 'active' },
] };
const D = (ngay, maNv, teamNgay, soDon, trangThai = 'GIAO_THANH_CONG') => ({ ngay, shop: 's1', tienTe: 'SAR', chia: 100, maNv, teamNgay, trangThai, soDon, cod: 0, luong: 'messenger' });
const DU = { homNay: '2026-10-05', dong: [
  D('2026-09-10', 'NV1', 'PIALPHA_GCC', 5),           // làm ở GCC ⇒ của GCC dù NAY ở EU
  D('2026-10-01', 'NV1', 'PIALPHA_EU', 3),            // sau khi chuyển ⇒ EU
  D('2026-10-02', 'NV1', null, 2),                    // HRM thiếu lịch sử phủ ngày ⇒ team hiện tại (EU) + đếm riêng
  D('2026-10-03', 'NV2', 'PIALPHA_GCC', 4),
  D('2026-10-03', 'NV9', 'PIALPHA_GCC', 6),           // mã không còn trong hồ sơ HRM hiện tại, lịch sử nói GCC ⇒ GCC, tên = mã
  D('2026-10-04', 'NV2', 'PIALPHA_SALE_ONLINE', 1),   // lịch sử nói team sale ⇒ ngoài hệ
  D('2026-10-04', null, null, 7),                     // chưa ghép ⇒ chờ gán
] };

test('R2 · đơn đi theo team VÀO NGÀY ĐƠN: GCC nhận đơn NV1 làm ở GCC; EU nhận đơn sau khi chuyển + đơn thiếu lịch sử (đếm riêng)', () => {
  const gcc = tongHopTeam(DU, HRM, { slug: 'tieu-alpha' });
  assert.equal(gcc.team[30].don, 15);
  assert.deepEqual(gcc.marketer.map((m) => [m.maNv, m.ten, m.k[30].don]), [['NV9', 'NV9', 6], ['NV1', 'An', 5], ['NV2', 'Bình', 4]]);
  const eu = tongHopTeam(DU, HRM, { slug: 'pialpha-eu' });
  assert.deepEqual([eu.team[7].don, eu.team[30].don], [5, 5]);
  assert.deepEqual(eu.marketer.map((m) => [m.maNv, m.k[30].don]), [['NV1', 5]]);
  assert.deepEqual([gcc.theoHienTai[30].don, gcc.ngoaiHe[30].don, gcc.choGan[30].don], [2, 1, 7], 'ba nhóm cả công ty');
});

test('R3 · bảo toàn: mọi đơn trong khoảng nằm ở ĐÚNG MỘT chỗ (team nào đó · ngoài hệ · chờ gán) — không mất, không đếm đôi', () => {
  const tong = DU.dong.reduce((a, r) => a + r.soDon, 0);
  const teams = ['tieu-alpha', 'pialpha-eu', 'auus'].map((slug) => tongHopTeam(DU, HRM, { slug }).team[30].don);
  const r = tongHopTeam(DU, HRM, { slug: 'tieu-alpha' });
  assert.equal(teams.reduce((a, b) => a + b, 0) + r.ngoaiHe[30].don + r.choGan[30].don, tong);
});
