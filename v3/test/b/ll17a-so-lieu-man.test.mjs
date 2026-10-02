// LL17a · SỐ LIỆU › TỔNG QUAN — khối «Đơn POS của team — theo marketer» (BigQuery, số tổng hợp, chỉ đọc). Máy chủ thật (vai-b) +
// trang thật (vm); bộ đọc đơn POS + HRM giả theo hình dữ liệu đo 02/10.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
process.env.V3_BOT_KHOA = '1';

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay } = await import('../../src/auth/boi-canh.js');
const { moTrang } = await import('../../testkit/dom-gia.js');

const HRM = { luc: 0, ghep: [], nhanVien: [
  { emp_code: 'NV1', team_code: 'PIALPHA_GCC', ho_ten: 'An', status: 'active' },
  { emp_code: 'NV2', team_code: 'PIALPHA_GCC', ho_ten: 'Bình', status: 'nghi' },
  { emp_code: 'NV3', team_code: 'PIALPHA_EU', ho_ten: 'Chi', status: 'active' },
] };
const D = (ngay, maNv, trangThai, soDon, cod = 0, tienTe = 'SAR', chia = 100) => ({ ngay, shop: 's1', tienTe, chia, maNv, trangThai, soDon, cod });
const DON = { luc: 0, homNay: '2026-10-02', dongBo: '2026-10-02T07:30:04', tuongLai: 1, dong: [
  D('2026-10-02', 'NV1', 'GIAO_THANH_CONG', 3, 30000), D('2026-09-30', 'NV1', 'DON_HOAN', 1),
  D('2026-09-26', 'NV1', 'GIAO_THANH_CONG', 2, 500, 'TWD', 1), D('2026-09-25', 'NV2', 'HUY', 4),
  D('2026-10-01', 'NV3', 'GIAO_THANH_CONG', 7, 7000, 'EUR'), D('2026-10-01', null, 'GIAO_THANH_CONG', 6),
] };

async function dungThu(t, { docDonPos = async () => DON, docHrm = async () => HRM } = {}) {
  const mk = await bam('matkhau1');
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Pialpha GCC', la_ky_thuat: false }],
    vai: [{ id: 'v1', ma: 'quan-tri' }, { id: 'v2', ma: 'marketer' }],
    nguoi_dung: [{ id: 'u1', email: 'qt@x.vn', mat_khau_hash: mk, ten: 'Chủ', hoat_dong: true, ma_nv: null },
      { id: 'u2', email: 'an@x.vn', mat_khau_hash: mk, ten: 'An', hoat_dong: true, ma_nv: 'NV1' },
      { id: 'u3', email: 'tay@x.vn', mat_khau_hash: mk, ten: 'Tay', hoat_dong: true, ma_nv: null }],
    thanh_vien_team: [{ id: 'a', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' }, { id: 'b', nguoi_dung_id: 'u2', team_id: 't1', vai_id: 'v2' },
      { id: 'c', nguoi_dung_id: 'u3', team_id: 't1', vai_id: 'v2' }],
    page: [], don_hang: [],
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express,
    docHrm, docDonPos, docDonHang: async () => ({ bat: true, thieu: false, soPageQuetLoi: 0, quetLuc: null, page: [] }) });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  t.after(() => sv.close());
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const ve = async (email) => (await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, matKhau: 'matkhau1' }) })).headers.getSetCookie()[0].split(';')[0];
  const api = async (cookie) => (await fetch(`${goc}/api/bao-cao/don-pos`, { headers: { cookie } })).json();
  const man = async (cookie) => moTrang('bao-cao/trang/bao-cao.html', { goc, cookie, duong: '/bao-cao' });
  return { ve, api, man };
}
const chu = (x) => x.textContent.replace(/\s+/g, ' ').trim();

test('L1 · quản trị: số của ĐÚNG team (team HRM của marketer) 7/30 ngày · từng marketer · chờ gán · đồng bộ · ngày tương lai', async (t) => {
  const o = await dungThu(t);
  const d = await o.api(await o.ve('qt@x.vn'));
  assert.equal(d.noi, true);
  assert.deepEqual([d.tenTeam, d.homNay, d.dongBo, d.tuongLai, d.chiCuaToi], ['Pialpha GCC', '2026-10-02', '2026-10-02T07:30:04', 1, false]);
  assert.deepEqual([d.team[7].don, d.team[30].don, d.team[30].huy], [6, 10, 4], 'đơn EU và đơn chưa ghép KHÔNG vào team GCC');
  assert.deepEqual(d.team[7].codThanhCong, { SAR: 300, TWD: 500 });
  assert.deepEqual(d.marketer.map((m) => [m.maNv, m.k[30].don]), [['NV1', 6], ['NV2', 4]]);
  assert.equal(d.choGan[30].don, 6);
});

test('L2 · trang Tổng quan: bảng team + bảng marketer + câu cả công ty; COD theo từng tiền tệ, không cộng; tỉ lệ trên đơn đã kết thúc', async (t) => {
  const o = await dungThu(t);
  const m = await o.man(await o.ve('qt@x.vn'));
  assert.equal(chu(m.$('#hDonPos')), 'đồng bộ 2026-10-02 07:30 · tới ngày 2026-10-02');
  const team = m.$('#dsDonTeam').querySelectorAll('tr').map((r) => [r.dataset.khoang, ...r.querySelectorAll('td').map(chu)]);
  assert.deepEqual(team[0], ['7', '6', '5', '1', '0', '0', '83,3%', '500 TWD · 300 SAR']);
  // 30 ngày có 4 đơn huỷ ⇒ mẫu số của tỉ lệ (thành công + hoàn = 6) KHÁC tổng đơn (10) — 7 ngày thì hai mẫu trùng nhau, không phân biệt được.
  assert.deepEqual(team[1].slice(0, 7), ['30', '10', '5', '1', '4', '0', '83,3%']);
  const mk = m.$('#dsDonMk').querySelectorAll('tr').map((r) => [r.dataset.mk, ...r.querySelectorAll('td').map(chu)]);
  assert.deepEqual(mk.map((r) => r.slice(0, 4)), [['NV1', 'An NV1', '6', '6'], ['NV2', 'Bình NV2 · đã nghỉ', '0', '4']]);
  assert.match(chu(m.$('[data-tre-hoan]')), /ở khoảng ngắn phần lớn đơn còn «đang xử lý» \(7 ngày: 0\/6 đơn\), nên tỉ lệ của khoảng ngắn còn đẹp hơn thật — đọc khoảng 30 ngày\./);
  assert.match(chu(m.$('[data-ngoai-team]')), /^Cả công ty, 30 ngày: 6 đơn chưa ghép marketer \(chờ gán team\) · 0 đơn của marketer thuộc team không vào hệ · 1 đơn mang ngày tương lai bị loại\.$/);
});

test('L3 · marketer chỉ thấy dòng CỦA MÌNH (hàng team vẫn là tổng) · marketer không mã NV ⇒ không dòng nào, nói vì sao', async (t) => {
  const o = await dungThu(t);
  const an = await o.api(await o.ve('an@x.vn'));
  assert.deepEqual([an.chiCuaToi, an.marketer.map((m) => m.maNv), an.team[30].don], [true, ['NV1'], 10]);
  const m = await o.man(await o.ve('an@x.vn'));
  assert.match(chu(m.$('[data-ngoai-team]')), /Bạn là marketer: bảng chỉ hiện dòng của bạn; hàng team là tổng cả team\./);
  const tay = await o.man(await o.ve('tay@x.vn'));
  assert.equal(chu(tay.$('[data-khong-mk]')), 'Chưa có đơn nào mang mã của bạn trong 30 ngày.');
});

test('L4 · chưa nối (vắng V3_BQ_KHOA) ⇒ nói thiếu biến, không số · đọc HỎNG ⇒ «hỏng» + lý do — các khối khác của trang không chết', async (t) => {
  const chua = await dungThu(t, { docDonPos: null });   // null — `undefined` sẽ rơi về tham số mặc định
  const d = await chua.api(await chua.ve('qt@x.vn'));
  assert.deepEqual([d.noi, d.viSao], [false, 'máy chủ chưa nối đọc đơn POS từ BigQuery (thiếu V3_BQ_KHOA)']);
  const m = await chua.man(await chua.ve('qt@x.vn'));
  assert.match(chu(m.$('#donPos')), /Chưa có số đơn POS từ BigQuery.*thiếu V3_BQ_KHOA.*ảnh chụp bảng đơn của hệ \(nạp 28\/08\)/);
  const hong = await dungThu(t, { docDonPos: async () => { throw new Error('BigQuery trả 90000 dòng mà một trang chỉ 1 — câu đọc phải gộp thêm'); } });
  const h = await hong.api(await hong.ve('qt@x.vn'));
  assert.deepEqual([h.noi, h.hong], [false, true]);
  const mh = await hong.man(await hong.ve('qt@x.vn'));
  assert.match(chu(mh.$('#donPos')), /Đọc đơn POS từ BigQuery hỏng.*một trang chỉ 1/);
  assert.ok(m.$('#chiSo'), 'khối chỉ số chính vẫn có chỗ');
});
