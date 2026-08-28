// MÀN «HỒ SƠ KHÁCH HÀNG» (G2-G5) — *«Gộp ba kênh theo số điện thoại»*.
//
// Hai chỗ bài test dồn vào:
//   ① Gộp theo số điện thoại phải THẬT SỰ gộp. Không gộp thì cùng một người hiện nhiều lần
//      với nhiều lịch sử mua khác nhau, và người dùng tin cái nào cũng sai.
//   ② Kênh hội thoại CHƯA nối (`hoi_thoai.khach_id` = 0/28.953). Cột đó phải là «chưa biết»,
//      không phải 0 — một hồ sơ 0 hội thoại trông y hệt một khách chưa từng nhắn tin.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const hs = await import('../../src/ui/ho-so-khach/kho-khach.js');

function dung({ khach = [], don = [], hoiThoai = [] } = {}) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    khach, don_hang: don, hoi_thoai: hoiThoai,
  });
  hs.datTaoTruyVan(taoTruyVan);
}
const bc = (team = 't1') => taoBoiCanh({
  nguoiDungId: 'u1', tenDangNhap: 'an@talpha.vn', teamId: team, vai: [VAI.QUAN_TRI],
});
const k = (id, so, o = {}) => ({ id, team_id: 't1', so_dien_thoai: so, ten: 'K' + id, ...o });
const d = (id, khachId, tt = '16', o = {}) => ({ id, team_id: 't1', khach_id: khachId, trang_thai_pos: tt, nguon: 'messenger', ...o });

/* ═══════════ ① GỘP THEO SỐ ĐIỆN THOẠI ═══════════ */

test('①a · chuẩn hoá số — bỏ dấu cách, gạch, dấu cộng', () => {
  assert.equal(hs.chuanSo('+966 50 123-4567'), '966501234567');
  assert.equal(hs.chuanSo('0901234567'), '0901234567');
  assert.equal(hs.chuanSo('   '), null);
  assert.equal(hs.chuanSo(null), null);
});

test('①b · hai dòng cùng số = MỘT người, và lịch sử mua GỘP lại', async () => {
  dung({
    khach: [k('a', '+966 50 111 2222'), k('b', '966501112222')],
    don: [d('d1', 'a'), d('d2', 'b'), d('d3', 'b', '5')],
  });
  const r = await hs.manKhach(bc());
  assert.equal(r.dem.soDongKhach, 2);
  assert.equal(r.dem.soNguoi, 1, 'không gộp thì một người hiện hai lần với hai lịch sử');
  assert.equal(r.dem.soBiTach, 1, 'phải ĐẾM được có bao nhiêu chỗ bị tách');
  const x = r.khach[0];
  assert.equal(x.soDongGop, 2);
  assert.equal(x.soDon, 3, 'đơn của cả hai dòng phải về một người');
  assert.equal(x.soDonHoan, 1);
});

test('①c · dòng khách KHÔNG có số điện thoại → đếm riêng, không lẫn vào bảng', async () => {
  dung({ khach: [k('a', '0901'), k('b', null), k('c', '  ')] });
  const r = await hs.manKhach(bc());
  assert.equal(r.dem.soKhongCoSo, 2);
  assert.equal(r.dem.soNguoi, 1);
});

/* ═══════════ ② KÊNH HỘI THOẠI CHƯA NỐI ═══════════ */

test('②a · hội thoại không có `khach_id` → cột là `null`, KHÔNG phải 0', async () => {
  dung({
    khach: [k('a', '0901')],
    hoiThoai: [{ id: 'h1', team_id: 't1', khach_id: null }, { id: 'h2', team_id: 't1' }],
  });
  const r = await hs.manKhach(bc());
  assert.equal(r.khach[0].soHoiThoai, null,
    '0 hội thoại trông y hệt một khách chưa từng nhắn tin — đó là kết luận sai');
  const kenh = r.kenh.find((x) => x.ma === 'hoi_thoai');
  assert.equal(kenh.noiDuoc, false);
  assert.ok(kenh.diTiep && kenh.diTiep.length > 60, 'chưa nối thì phải nói ai nối và nối gì');
  assert.match(kenh.diTiep, /chưa biết/i);
});

test('②b · ba kênh khai đủ, mỗi kênh một khoá', async () => {
  dung({ khach: [k('a', '0901')], don: [d('d1', 'a')] });
  const r = await hs.manKhach(bc());
  assert.equal(r.kenh.length, 3, 'yêu cầu nói BA kênh');
  assert.deepEqual(r.kenh.map((x) => x.ma), ['khach', 'don_hang', 'hoi_thoai']);
  for (const x of r.kenh) assert.ok(x.khoa, `${x.ma}: không khai gộp bằng khoá gì`);
  assert.equal(r.kenh.find((x) => x.ma === 'don_hang').noiDuoc, true);
});

/* ═══════════ ③ TIỀN THIẾU PHẢI NÓI RA ═══════════ */

test('③ · đơn thiếu `tong_tien` → khai `tienDayDu` false, không cộng ngầm', async () => {
  dung({
    khach: [k('a', '0901')],
    don: [d('d1', 'a', '16', { tong_tien: 100 }), d('d2', 'a', '16', { tong_tien: null })],
  });
  const r = await hs.manKhach(bc());
  const x = r.khach[0];
  assert.equal(x.tongTien, 100);
  assert.equal(x.soDonCoTien, 1);
  assert.equal(x.tienDayDu, false, 'tổng tiền của một nửa số đơn KHÔNG phải tổng tiền của khách');
});

/* ═══════════ ④ TÌM, TRANG, TEAM ═══════════ */

test('④a · tìm theo số điện thoại bỏ qua dấu cách và gạch', async () => {
  dung({ khach: [k('a', '+966 50 111 2222'), k('b', '0909999999')] });
  const r = await hs.manKhach(bc(), { tim: '966-50-111' });
  assert.equal(r.khach.length, 1);
  assert.equal(r.khach[0].so, '966501112222');
});

test('④b · chỉ khách của TEAM MÌNH', async () => {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false },
           { id: 't2', slug: 'b', ten: 'B', la_ky_thuat: false }],
    khach: [{ id: 'a', team_id: 't1', so_dien_thoai: '0901', ten: 'A' },
            { id: 'x', team_id: 't2', so_dien_thoai: '0902', ten: 'CỦA TEAM KHÁC' }],
  });
  hs.datTaoTruyVan(taoTruyVan);
  const r = await hs.manKhach(bc());
  assert.equal(r.dem.soDongKhach, 1);
  assert.ok(!JSON.stringify(r).includes('CỦA TEAM KHÁC'));
});

test('④c · SALE không vào được — §9', () => {
  assert.ok(!hs.VAI_VAO_DUOC.includes(VAI.SALE));
});

test('④d · team chưa có khách → nói rõ, không bảng rỗng câm', async () => {
  dung({});
  const r = await hs.manKhach(bc());
  assert.equal(r.dem.soNguoi, 0);
  assert.ok(r.trong);
  assert.match(r.trong.noi, /chưa có khách/i);
});
