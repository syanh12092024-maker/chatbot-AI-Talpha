// LL15a · HRM LÊN MÀN — Người và team (hồ sơ theo email · bảng marketer POS của ĐÚNG team) + Kết nối › HRM (số đọc từ nguồn,
// «Đọc lại HRM»). Máy chủ thật (vai-b) + trang thật (vm); bộ đọc HRM giả (dữ liệu hình prod: GCC · EU · vận đơn · chưa ghép · đã nghỉ).
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
const { boiCanhMay, taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const bvMod = await import('../../src/ui/team/ba-vai.js');
const { LoiBigQuery } = await import('../../../src/hrm/bigquery.js');
const { moTrang } = await import('../../testkit/dom-gia.js');

const LUC = Date.parse('2026-10-02T03:04:00Z');
const DU = {
  luc: LUC,
  nhanVien: [
    { emp_code: 'NV001', ho_ten: 'Chủ team', status: 'active', email_cong_ty: 'QT@talpha.vn', team_code: 'PIALPHA_GCC' },
    { emp_code: 'NV002', ho_ten: 'Mai', status: 'active', email_cong_ty: 'mai@x.vn', team_code: 'PIALPHA_GCC' },
    { emp_code: 'NV003', ho_ten: 'Lan', status: 'thuviec', email_cong_ty: 'lan@x.vn', team_code: 'PIALPHA_EU' },
    { emp_code: 'NV004', ho_ten: 'Hùng', status: 'active', email_cong_ty: 'h@x.vn', team_code: 'PIALPHA_VD_OFFLINE' },
    { emp_code: 'NV005', ho_ten: 'Cũ', status: 'nghi', email_cong_ty: 'cu@x.vn', team_code: 'PIALPHA_GCC' },
  ],
  ghep: [
    { person_id: 'a', person_name: 'mk.mai', emp_code: 'NV002', map_status: 'confirmed', source_role: 'marketer', id_type: 'pancake' },
    { person_id: 'b', person_name: 'mk.lan', emp_code: 'NV003', map_status: 'confirmed', source_role: 'marketer', id_type: 'pancake' },
    { person_id: 'c', person_name: 'mk.moi', emp_code: null, map_status: 'unmapped', source_role: 'marketer' },
    { person_id: 'd', person_name: 'mk.nghi', emp_code: null, map_status: 'da_nghi', source_role: 'marketer' },
    { person_id: 'e', person_name: 'mk.vd', emp_code: 'NV004', map_status: 'confirmed', source_role: 'marketer' },
    { person_id: 'f', person_name: 'sale.1', emp_code: 'NV001', map_status: 'confirmed', source_role: 'sale' },
    // marketer ĐÃ NGHỈ của chính team GCC — vẫn mang team; không được đếm hai lần, không hiện bảng
    { person_id: 'g', person_name: 'mk.cu', emp_code: 'NV005', map_status: 'confirmed', source_role: 'marketer' },
  ],
};

async function dungThu({ docHrm } = {}) {
  const mk = await bam('matkhau1');
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }, { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false },
      { id: 't3', slug: 'pialpha-eu', ten: 'Pialpha EU', la_ky_thuat: false }],
    nguoi_dung: [{ id: 'u1', email: 'qt@talpha.vn', mat_khau_hash: mk, ten: 'Chủ team', hoat_dong: true },
      { id: 'u2', email: 'ngoc@talpha.vn', mat_khau_hash: mk, ten: 'Ngọc', hoat_dong: true }],
    vai: [{ id: 'v1', ma: 'quan-tri', ten: 'Quản trị' }, { id: 'v2', ma: 'marketer', ten: 'Marketer' }],
    thanh_vien_team: [{ id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' }, { id: 'tv2', nguoi_dung_id: 'u2', team_id: 't1', vai_id: 'v2' }],
    page: [],
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express, docHrm });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const dn = await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qt@talpha.vn', matKhau: 'matkhau1' }) });
  return { goc, sv, cookie: dn.headers.get('set-cookie').split(';')[0] };
}
const chu = (x) => x.textContent.replace(/\s+/g, ' ').trim();
const gio = (t) => { const d = new Date(t); const h = (n) => String(n).padStart(2, '0'); return `${h(d.getDate())}/${h(d.getMonth() + 1)} ${h(d.getHours())}:${h(d.getMinutes())}`; };

test('H1 · Người và team ĐÃ NỐI: hồ sơ HRM theo email (không phân biệt hoa) · bảng marketer POS CHỈ của team này + chờ gán · đếm đúng bốn nhóm', async (t) => {
  const o = await dungThu({ docHrm: async () => DU });
  t.after(() => o.sv.close());
  const m = await moTrang('team/trang/cau-hinh-team.html', { goc: o.goc, cookie: o.cookie, duong: '/cau-hinh-team' });
  assert.match(chu(m.$('#nhanHrm')), /Đã nối · chỉ đọc/);
  assert.equal(chu(m.$('[data-tom-tat-hrm]')),
    `Đọc HRM lúc ${gio(LUC)} · team này: 1 tài khoản marketer trên POS đang làm, 1 của người đã nghỉ · cả công ty: 6 tài khoản marketer, 1 chờ gán team, 1 thuộc team không vào hệ.`);
  const dong = m.$('#dsMarketerPos').querySelectorAll('tr').map((r) => r.querySelectorAll('td').map(chu));
  assert.deepEqual(dong.map((d) => d[0]), ['mk.mai pancake', 'mk.moi'], 'chỉ team này đang làm (GCC) + chờ gán; không EU, không vận đơn, không đã nghỉ (kể cả của GCC), không sale');
  assert.deepEqual(dong[0].slice(1), ['NV002 · Mai đang làm', 'đã xác nhận', 'Pialpha GCC']);
  assert.deepEqual(dong[1].slice(1), ['—', 'chưa có trong bảng ghép', 'chờ gán team']);
  const hang = (id) => m.$(`tr[data-nguoi="${id}"]`).querySelectorAll('td').map(chu);
  assert.equal(hang('u1')[1], 'NV001 · đang làm · Pialpha GCC');
  assert.equal(hang('u2')[1], 'không có trong HRM');
  // LL15b · 02/10: ca này nối HRM nhưng KHÔNG nối bộ đồng bộ ⇒ nút tắt + nói vậy (phía đã nối: `ll15b-dong-bo-man` M1–M8).
  assert.equal(chu(m.$('#viSaoHrm')), `Đồng bộ người theo HRM: máy chủ chưa nối — bảng dưới đọc HRM lúc ${gio(LUC)}.`);
  assert.equal(m.$('#nutHrm').disabled, true, 'chưa nối bộ đồng bộ — nút tắt');
});

test('H2 · bảng marketer theo ĐÚNG team đang mở: Auus ⇒ 0 của team + chờ gán; Pialpha EU ⇒ mk.lan', async (t) => {
  bvMod.datDocHrm(async () => DU);
  t.after(() => bvMod.datDocHrm(null));
  const o = await dungThu({ docHrm: async () => DU });   // dựng cổng (danh tính + truy vấn) cho ba team
  t.after(() => o.sv.close());
  const bc = (teamId) => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'qt', teamId, vai: [VAI.QUAN_TRI] });
  const auus = (await bvMod.baVaiCua(bc('t2'))).marketerPos;
  assert.deepEqual([auus.slug, auus.dong.map((d) => d.taiKhoan), auus.dem.cuaTeam, auus.dem.choGan], ['auus', ['mk.moi'], 0, 1]);
  const eu = (await bvMod.baVaiCua(bc('t3'))).marketerPos;
  assert.deepEqual(eu.dong.map((d) => d.taiKhoan), ['mk.lan', 'mk.moi']);
  assert.equal(eu.dong[0].trangThaiNv, 'thử việc');
});

test('H3 · đọc HRM HỎNG (403 của Google) ⇒ «Đọc HRM hỏng» + lý do, cột hồ sơ «chưa nối», màn không chết', async (t) => {
  const o = await dungThu({ docHrm: async () => { throw new LoiBigQuery('truy_van', 'BigQuery từ chối câu đọc (accessDenied)', 403); } });
  t.after(() => o.sv.close());
  const m = await moTrang('team/trang/cau-hinh-team.html', { goc: o.goc, cookie: o.cookie, duong: '/cau-hinh-team' });
  assert.match(chu(m.$('#nhanHrm')), /Đọc HRM hỏng/);
  assert.match(chu(m.$('#noiDungHrm')), /Vì sao\s*BigQuery từ chối câu đọc \(accessDenied\)/);
  assert.equal(chu(m.$('#viSaoHrm')), 'Lấy người từ HRM: đọc HRM hỏng — BigQuery từ chối câu đọc (accessDenied).');
  assert.equal(m.$('tr[data-nguoi="u1"]').querySelectorAll('td').map(chu)[1], 'chưa nối');
  assert.equal(chu(m.$('#bang-tin')), '', 'HRM hỏng không được kéo sập khối người trong team');
});

test('H4 · Kết nối › HRM ĐÃ NỐI: số đọc từ nguồn + «Đọc lại HRM» bỏ đệm (gọi bộ đọc với lamMoi)', async (t) => {
  const goi = [];
  const o = await dungThu({ docHrm: async (bo = {}) => { goi.push(bo); return DU; } });
  t.after(() => o.sv.close());
  const m = await moTrang('ket-noi/trang/ket-noi.html', { goc: o.goc, cookie: o.cookie, duong: '/ket-noi' });
  assert.match(chu(m.$('#hrmNhan')), /Đã nối · chỉ đọc/);
  const tt = chu(m.$('#hrmTrangThai'));
  assert.match(tt, new RegExp(`Đã đọc\\s*lúc ${gio(LUC)} · 5 hồ sơ cả công ty, 4 thuộc team Pialpha \\(3 đang làm / thử việc\\)`));
  assert.match(tt, /Bảng ghép\s*7 tài khoản POS · 5 đã xác nhận · 1 chưa ghép · 6 tài khoản marketer/);
  await m.$('#nutDocLaiHrm').click();
  await m.cho();
  assert.ok(m.goi.some((g) => g.phuongThuc === 'POST' && g.duong === '/api/ket-noi/hrm/doc-lai'));
  assert.equal(goi.at(-1).lamMoi, true, '«Đọc lại» phải bỏ đệm');
});

test('H5 · Kết nối › HRM CHƯA NỐI (vắng V3_BQ_KHOA) ⇒ nói đúng vì sao; không số nào', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moTrang('ket-noi/trang/ket-noi.html', { goc: o.goc, cookie: o.cookie, duong: '/ket-noi' });
  assert.equal(chu(m.$('#hrmNhan')), 'Chưa nối vào máy chủ');
  assert.match(chu(m.$('#hrmTrangThai')), /^Vì sao\s*máy chủ chưa khai V3_BQ_KHOA \(đường tới tệp khoá BigQuery\)$/);
});

test('H6 · Kết nối › HRM đọc HỎNG ⇒ «Đọc HRM hỏng» + lý do của Google — không đổ thành «đã nối», không số', async (t) => {
  const o = await dungThu({ docHrm: async () => { throw new LoiBigQuery('token', 'Google từ chối cấp token (invalid_grant)', 400); } });
  t.after(() => o.sv.close());
  const m = await moTrang('ket-noi/trang/ket-noi.html', { goc: o.goc, cookie: o.cookie, duong: '/ket-noi' });
  assert.equal(chu(m.$('#hrmNhan')), 'Đọc HRM hỏng');
  assert.match(chu(m.$('#hrmTrangThai')), /^Vì sao\s*Google từ chối cấp token \(invalid_grant\)$/);
});
