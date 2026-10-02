// LL15b · NGƯỜI + VAI THEO HRM Ở MÀN «Người và team» — xem kế hoạch rồi áp đúng bản đã xem · chỉ Quản trị của MỌI team áp được ·
// vai HRM không rút tay · mật khẩu ĐẦU cho tài khoản HRM tạo · câu nhịp + lần cuối. M1–M7: máy chủ thật (vai-b) + trang thật (vm) +
// bộ đồng bộ giả ghi lại lời gọi. M8: ĐẦU-CUỐI trên Postgres hộp cát — cổng danh tính thật + `taoDongBoHrm` thật: bấm áp ⇒ tài
// khoản + vai HRM lên bảng ⇒ đặt mật khẩu đầu ⇒ ĐĂNG NHẬP ĐƯỢC bằng tài khoản ấy.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
process.env.V3_BOT_KHOA = '1';

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam, kiem } = await import('../../src/auth/mat-khau.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay } = await import('../../src/auth/boi-canh.js');
const { moTrang } = await import('../../testkit/dom-gia.js');

const LUC = Date.parse('2026-10-02T03:04:00Z');
const DU = { luc: LUC, nhanVien: [{ emp_code: 'NV001', ho_ten: 'Chủ team', status: 'active', email_cong_ty: 'qt@talpha.vn', team_code: 'PIALPHA_GCC' }], ghep: [] };
const KE = {
  vanTay: 'abc123def4567890',
  taoTaiKhoan: [{ maNv: 'NV9', email: 'moi@x.vn', ten: 'Mới' }], ganMaNv: [],
  capVai: [{ khoaTk: 'moi:NV9', nguoiDungId: null, maNv: 'NV9', email: 'moi@x.vn', teamId: 't1', slug: 'tieu-alpha', vai: 'marketer', vaiId: 'v2' },
    { khoaTk: 'u3', nguoiDungId: 'u3', maNv: 'NV3', email: 'sale@x.vn', teamId: 't3', slug: 'pialpha-eu', vai: 'sale', vaiId: 'v3' }],
  rutVai: [{ tvId: 'tv9', nguoiDungId: 'u4', email: 'nghi@x.vn', teamId: 't1', slug: 'tieu-alpha', vai: 'marketer', lyDo: 'đã nghỉ' }],
  khoa: [{ nguoiDungId: 'u4', maNv: 'NV4', email: 'nghi@x.vn' }], moKhoa: [],
  doiTenTeam: [{ teamId: 't1', slug: 'tieu-alpha', tu: 'Tiểu Alpha', sang: 'Pialpha GCC' }],
  canhBao: [{ ma: 'email_trung_ma_khac', chu: 'x@x.vn: tài khoản đã gắn mã NV7, HRM nói NV8 — bỏ qua, sửa ở HRM' }],
  dem: { nhanVienVaoHe: 2, boQuaThieuEmail: 1, boQuaNgoaiHe: 94, dongHrmDangCo: 1 },
};
const KE_RONG = { ...KE, taoTaiKhoan: [], capVai: [], rutVai: [], khoa: [], doiTenTeam: [], canhBao: [] };

function dongBoGia({ ke = KE, anToan = true, lyDo = [], lanCuoi = null, tuDongMoiGio } = {}) {
  const goi = { keHoach: [], apDung: [], matKhau: [] };
  return { goi, keHoach: async (o) => { goi.keHoach.push(o); return { ke, anToan, lyDo, docLuc: LUC }; },
    apDung: async (o) => { goi.apDung.push(o); return { ra: { taoTaiKhoan: 1, ganMaNv: 0, capVai: 2, rutVai: 1, khoa: 1, moKhoa: 0, doiTenTeam: 1 }, ke }; },
    lanCuoi: () => lanCuoi,
    datMatKhauDau: async (o) => { goi.matKhau.push(o); return { ok: true, email: 'moi@x.vn' }; },
    ...(tuDongMoiGio ? { tuDongMoiGio } : {}) };
}

async function dungThu({ dongBoHrm, qtCaBaTeam = true, dangNhap = 'qt@talpha.vn' } = {}) {
  const mk = await bam('matkhau1');
  const tv = [
    { id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1', nguon: 'tay' },
    { id: 'tv2', nguoi_dung_id: 'u2', team_id: 't1', vai_id: 'v2', nguon: 'hrm' },
    { id: 'tv3', nguoi_dung_id: 'u2', team_id: 't1', vai_id: 'v3', nguon: 'tay' },
    { id: 'tv5', nguoi_dung_id: 'u5', team_id: 't1', vai_id: 'v3', nguon: 'hrm' },
    { id: 'tv6', nguoi_dung_id: 'u6', team_id: 't2', vai_id: 'v3', nguon: 'hrm' },
  ];
  if (qtCaBaTeam) tv.push({ id: 'tv7', nguoi_dung_id: 'u1', team_id: 't2', vai_id: 'v1', nguon: 'tay' }, { id: 'tv8', nguoi_dung_id: 'u1', team_id: 't3', vai_id: 'v1', nguon: 'tay' });
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }, { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false },
      { id: 't3', slug: 'pialpha-eu', ten: 'Pialpha EU', la_ky_thuat: false }, { id: 't0', slug: 'chua-phan', ten: 'Chưa phân', la_ky_thuat: true }],
    nguoi_dung: [{ id: 'u1', email: 'qt@talpha.vn', mat_khau_hash: mk, ten: 'Chủ team', hoat_dong: true, ma_nv: null },
      { id: 'u2', email: 'mk@x.vn', mat_khau_hash: mk, ten: 'Mai', hoat_dong: true, ma_nv: 'NV2' },
      { id: 'u5', email: 'moi@x.vn', mat_khau_hash: null, ten: 'Mới', hoat_dong: true, ma_nv: 'NV9' },
      { id: 'u6', email: 'khac@x.vn', mat_khau_hash: null, ten: 'Khác team', hoat_dong: true, ma_nv: 'NV6' }],
    vai: [{ id: 'v1', ma: 'quan-tri', ten: 'Quản trị' }, { id: 'v2', ma: 'marketer', ten: 'Marketer' }, { id: 'v3', ma: 'sale', ten: 'Sale' }],
    thanh_vien_team: tv,
    page: [],
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express,
    docHrm: async () => DU, dongBoHrm });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const cookie = await veCua(goc, dangNhap, 'matkhau1', 't1');
  const api = async (duong, o = {}) => { const r = await fetch(goc + duong, { ...o, headers: { 'Content-Type': 'application/json', cookie } });
    return { status: r.status, j: await r.json() }; };
  return { goc, sv, cookie, api };
}
/** Đăng nhập; thuộc nhiều team thì chọn `teamId` (vé tạm → vé đủ quyền). Trả cookie. */
async function veCua(goc, email, matKhau, teamId) {
  const dn = await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, matKhau }) });
  let cookie = dn.headers.get('set-cookie').split(';')[0];
  if ((await dn.json()).canChonTeam) {
    const ct = await fetch(`${goc}/api/chon-team`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ teamId }) });
    cookie = ct.headers.get('set-cookie').split(';')[0];
  }
  return cookie;
}
const chu = (x) => x.textContent.replace(/\s+/g, ' ').trim();
const gio = (t) => { const d = new Date(t); const h = (n) => String(n).padStart(2, '0'); return `${h(d.getDate())}/${h(d.getMonth() + 1)} ${h(d.getHours())}:${h(d.getMinutes())}`; };
const moMan = (o) => moTrang('team/trang/cau-hinh-team.html', { goc: o.goc, cookie: o.cookie, duong: '/cau-hinh-team' });

test('M1 · Quản trị mọi team: nút mở · bấm ⇒ kế hoạch đọc HRM MỚI (lamMoi) · nhóm + số · cảnh báo lệch · «Áp dụng» gửi ĐÚNG vân tay, tác nhân là người bấm', async (t) => {
  const db = dongBoGia();
  const o = await dungThu({ dongBoHrm: db });
  t.after(() => o.sv.close());
  const m = await moMan(o);
  assert.equal(chu(m.$('#viSaoHrm')), 'Người theo HRM: chỉ khi Quản trị bấm (lượt tự động chưa bật) · lần cuối: chưa chạy lượt nào từ lúc máy chủ khởi động.');
  assert.equal(m.$('#nutHrm').disabled, false);
  await m.$('#nutHrm').click(); await m.cho();
  assert.equal(m.$('#hopHrm').open, true);
  assert.deepEqual(db.goi.keHoach.at(-1), { lamMoi: true }, 'mở kế hoạch phải đọc HRM mới, không đệm');
  assert.equal(chu(m.$('[data-tom-tat-ke]')), `Đọc HRM lúc ${gio(LUC)} · 2 người vào hệ (Marketer/Sale đang làm của các team Pialpha) · bỏ qua 94 hồ sơ ngoài hệ, 1 hồ sơ thiếu email.`);
  const nhom = m.document.querySelectorAll('details[data-nhom]').map((d) => [d.dataset.nhom, chu(d.querySelector('summary'))]);
  assert.deepEqual(nhom, [['taoTaiKhoan', 'Tạo tài khoản: 1'], ['capVai', 'Cấp vai: 2'], ['rutVai', 'Rút vai do HRM cấp: 1'],
    ['khoa', 'Khoá tài khoản (HRM: đã nghỉ): 1'], ['doiTenTeam', 'Đổi tên team theo HRM: 1']]);
  const dong = (n) => m.$(`details[data-nhom="${n}"]`).querySelectorAll('li').map(chu);
  assert.deepEqual(dong('capVai'), ['moi@x.vn · Marketer · Pialpha GCC', 'sale@x.vn · Sale · Pialpha EU'], 'tên vai + tên team HRM, không mã');
  assert.deepEqual(dong('rutVai'), ['nghi@x.vn · Marketer · Pialpha GCC — đã nghỉ']);
  assert.deepEqual(dong('doiTenTeam'), ['«Tiểu Alpha» → «Pialpha GCC»']);
  assert.match(chu(m.$('#hrmKeHoach')), /1 chỗ HRM và hệ lệch — không tự sửa.*x@x\.vn: tài khoản đã gắn mã NV7/);
  assert.equal(m.$('#hrm-ap').disabled, false);
  await m.$('#hrm-ap').click(); await m.cho();
  const gui = m.goi.find((g) => g.phuongThuc === 'POST' && g.duong === '/api/team/hrm/ap-dung');
  assert.deepEqual(gui.than, { vanTay: KE.vanTay });
  assert.deepEqual(db.goi.apDung, [{ vanTay: KE.vanTay, tacNhan: 'nguoi:u1', nguoiDungId: 'u1' }]);
  assert.equal(m.$('#hopHrm').open, false);
  assert.deepEqual(m.loa, ['Đã áp theo HRM: tạo 1 tài khoản · cấp 2 vai · rút 1 · khoá 1 · mở khoá 0 · đổi tên 1 team.']);
});

test('M2 · kế hoạch ra màn KHÔNG mang id nội bộ (teamId · vaiId · tvId · khoaTk · nguoiDungId)', async (t) => {
  const o = await dungThu({ dongBoHrm: dongBoGia() });
  t.after(() => o.sv.close());
  const { status, j } = await o.api('/api/team/hrm/ke-hoach');
  assert.equal(status, 200);
  assert.doesNotMatch(JSON.stringify(j.keHoach), /teamId|vaiId|tvId|khoaTk|nguoiDungId|"t1"|"v2"|"u4"/);
  assert.equal(j.apDuoc, true);
});

test('M3 · Quản trị MỘT team: xem được kế hoạch nhưng «Áp dụng» tắt + nói vì sao; gọi thẳng ⇒ 403, bộ đồng bộ KHÔNG được gọi', async (t) => {
  const db = dongBoGia();
  const o = await dungThu({ dongBoHrm: db, qtCaBaTeam: false });
  t.after(() => o.sv.close());
  const m = await moMan(o);
  await m.$('#nutHrm').click(); await m.cho();
  assert.equal(m.$('#hrm-ap').disabled, true);
  assert.equal(chu(m.$('[data-vi-sao-khong-ap]')), 'Không áp được: lượt đồng bộ đụng cả ba team — chỉ người là Quản trị của mọi team mới áp được.');
  const r = await o.api('/api/team/hrm/ap-dung', { method: 'POST', body: JSON.stringify({ vanTay: KE.vanTay }) });
  assert.deepEqual([r.status, r.j.ma], [403, 'thieu_vai']);
  assert.equal(db.goi.apDung.length, 0);
});

test('M4 · vai do HRM cấp: chữ «HRM», KHÔNG nút rút; rút thẳng qua API ⇒ 409 vai_cua_hrm, dòng còn nguyên · vai tay vẫn rút được', async (t) => {
  const o = await dungThu({ dongBoHrm: dongBoGia() });
  t.after(() => o.sv.close());
  const m = await moMan(o);
  const hang = m.$('tr[data-nguoi="u2"]');
  const chip = hang.querySelectorAll('.chip').map((c) => [chu(c), c.dataset.nguon || 'tay', c.querySelector('button') ? 'nút rút' : 'không nút']);
  assert.deepEqual(chip, [['Marketer HRM', 'hrm', 'không nút'], ['Sale', 'tay', 'nút rút']]);
  const r = await o.api('/api/team/thanh-vien', { method: 'DELETE', body: JSON.stringify({ nguoiDungId: 'u2', maVai: 'marketer' }) });
  assert.deepEqual([r.status, r.j.ma], [409, 'vai_cua_hrm']);
  assert.match(r.j.thongDiep, /do HRM cấp — đổi team\/vai \(hoặc báo nghỉ\) ở HRM/);
  const sau = await o.api('/api/team/thanh-vien');
  assert.deepEqual(sau.j.thanhVien.find((n) => n.nguoiDungId === 'u2').vai.map((v) => `${v.ma}:${v.nguon}`), ['marketer:hrm', 'sale:tay']);
  const r2 = await o.api('/api/team/thanh-vien', { method: 'DELETE', body: JSON.stringify({ nguoiDungId: 'u2', maVai: 'sale' }) });
  assert.deepEqual([r2.status, r2.j.soXoa], [200, 1]);
});

test('M5 · tài khoản chưa mật khẩu: nhãn + nút · mật khẩu ngắn bị chặn · đặt ⇒ máy chủ nhận BĂM (không chữ rõ), trả email · người team khác ⇒ 404 · không ai thấy băm', async (t) => {
  const db = dongBoGia();
  const o = await dungThu({ dongBoHrm: db });
  t.after(() => o.sv.close());
  const m = await moMan(o);
  const tk = (id) => m.$(`tr[data-nguoi="${id}"]`).querySelectorAll('td').map(chu)[4];
  assert.equal(tk('u5'), 'Hoạt động Chưa đặt mật khẩu Đặt mật khẩu');
  assert.equal(tk('u1'), 'Hoạt động');
  await m.$('[data-dat-mk="u5"]').click();
  assert.equal(m.$('#hopMk').open, true);
  assert.equal(chu(m.$('#mk-ai')), 'Tài khoản: moi@x.vn');
  m.$('#mk-moi').value = 'ngan';
  await m.$('#mk-luu').click();
  assert.equal(chu(m.$('#mk-loi')), 'Mật khẩu phải từ 8 ký tự.');
  assert.equal(db.goi.matKhau.length, 0);
  m.$('#mk-moi').value = 'matkhau-moi-1';
  await m.$('#mk-luu').click(); await m.cho();
  assert.equal(db.goi.matKhau.length, 1);
  const g = db.goi.matKhau[0];
  assert.deepEqual([g.nguoiDungId, g.teamId, g.tacNhan, g.nguoiLam], ['u5', 't1', 'nguoi:u1', 'u1']);
  assert.notEqual(g.bamMatKhau, 'matkhau-moi-1');
  assert.equal(await kiem('matkhau-moi-1', g.bamMatKhau), true, 'máy chủ băm đúng mật khẩu người gõ');
  assert.deepEqual(m.loa, ['Đã đặt mật khẩu cho moi@x.vn. Gửi cho họ qua kênh riêng.']);
  const khac = await o.api('/api/team/nguoi-dung/u6/mat-khau-dau', { method: 'POST', body: JSON.stringify({ matKhau: 'matkhau-moi-1' }) });
  assert.deepEqual([khac.status, khac.j.ma], [404, 'khong_co_nguoi'], 'u6 chỉ ở team Auus — quản trị team đang mở không đặt hộ');
  const ds = await o.api('/api/team/thanh-vien');
  assert.doesNotMatch(JSON.stringify(ds.j), /mat_khau_hash|scrypt\$|bamMatKhau/, 'băm dạng `scrypt$16384$…` không bao giờ ra màn');
});

test('M6 · lượt tự động: câu nói nhịp + lần cuối HOÃN · kế hoạch vượt rào ⇒ cảnh báo · kế hoạch rỗng ⇒ «Hệ đã khớp HRM», «Áp dụng» tắt', async (t) => {
  const o = await dungThu({ dongBoHrm: dongBoGia({ ke: KE_RONG, anToan: false, lyDo: ['khoá 6 tài khoản một lượt (> 5) — cần người xem'],
    lanCuoi: { luc: LUC, cach: 'tu_dong', hoan: ['khoá 6 tài khoản một lượt (> 5) — cần người xem'] }, tuDongMoiGio: 24 }) });
  t.after(() => o.sv.close());
  const m = await moMan(o);
  assert.equal(chu(m.$('#viSaoHrm')), `Người theo HRM: tự động mỗi 24 giờ · lần cuối: ${gio(LUC)} (tự động) HOÃN, chờ người xem — khoá 6 tài khoản một lượt (> 5) — cần người xem.`);
  await m.$('#nutHrm').click(); await m.cho();
  assert.ok(m.$('[data-khop-roi]'));
  assert.match(chu(m.$('#hrmKeHoach')), /Lượt tự động sẽ KHÔNG tự áp kế hoạch này.*khoá 6 tài khoản một lượt/);
  assert.equal(m.$('#hrm-ap').disabled, true);
});

test('M7 · chưa nối đồng bộ (có HRM, không `dongBoHrm`) ⇒ nút tắt + nói vì sao; API ⇒ 503 chua_noi · vai khác Quản trị ⇒ 403', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const m = await moMan(o);
  assert.equal(m.$('#nutHrm').disabled, true);
  assert.equal(chu(m.$('#viSaoHrm')), `Đồng bộ người theo HRM: máy chủ chưa nối — bảng dưới đọc HRM lúc ${gio(LUC)}.`);
  const r = await o.api('/api/team/hrm/ap-dung', { method: 'POST', body: JSON.stringify({ vanTay: 'x' }) });
  assert.deepEqual([r.status, r.j.ma], [503, 'chua_noi']);
  const mk = await dungThu({ dongBoHrm: dongBoGia(), dangNhap: 'mk@x.vn' });
  t.after(() => mk.sv.close());
  const r2 = await mk.api('/api/team/hrm/ke-hoach');
  assert.equal(r2.status, 403);
});

test('M8 · ĐẦU-CUỐI hộp cát: bấm áp ⇒ tài khoản + vai HRM lên bảng (chữ «HRM») · tên team theo HRM · đặt mật khẩu đầu ⇒ ĐĂNG NHẬP được · áp lại bản cũ ⇒ 409', async (t) => {
  const { dungSandbox } = await import('../../../db/sandbox.js');
  const { taoCongDanhTinh } = await import('../../src/noi-day/cong-danh-tinh.js');
  const { taoTruyVanThat } = await import('../../src/noi-day/cong-du-lieu-that.js');
  const { taoDongBoHrm } = await import('../../../src/hrm/dong-bo.js');
  const sb = await dungSandbox(`ll15b_man_${Math.random().toString(36).slice(2, 8)}`);
  t.after(() => sb.don());
  const pool = sb.pool;
  const team = Object.fromEntries((await pool.query('SELECT id, slug FROM team')).rows.map((r) => [r.slug, String(r.id)]));
  const vai = Object.fromEntries((await pool.query('SELECT id, ma FROM vai')).rows.map((r) => [r.ma, String(r.id)]));
  const qt = (await pool.query("INSERT INTO nguoi_dung (email, ten, mat_khau_hash) VALUES ('qt@talpha.vn', 'Chủ', $1) RETURNING id", [await bam('matkhau1')])).rows[0].id;
  for (const s of ['tieu-alpha', 'auus', 'pialpha-eu']) await pool.query('INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) VALUES ($1, $2, $3)', [team[s], qt, vai['quan-tri']]);
  const nv = [{ emp_code: 'NV1', comp_profile: 'MKT', team_code: 'PIALPHA_GCC', status: 'active', email_cong_ty: 'An@Gmail.com', ho_ten: 'An' },
    { emp_code: 'NV2', comp_profile: 'SALE', team_code: 'PIALPHA_SALE_ONLINE', status: 'active', email_cong_ty: 'binh@gmail.com', ho_ten: 'Bình' }];
  const du = { luc: LUC, nhanVien: nv, ghep: [] };
  const app = express();
  const taoTruyVan = (bc) => taoTruyVanThat(pool, bc);
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoCongDanhTinh(pool), express,
    docHrm: async () => du, dongBoHrm: taoDongBoHrm({ pool, docHrm: async () => du }) });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  t.after(() => sv.close());
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const dangNhap = async (email, matKhau) => fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, matKhau }) });
  const cookie = await veCua(goc, 'qt@talpha.vn', 'matkhau1', team['tieu-alpha']);
  const m = await moTrang('team/trang/cau-hinh-team.html', { goc, cookie, duong: '/cau-hinh-team' });
  await m.$('#nutHrm').click(); await m.cho();
  const vanTayDaXem = (await (await fetch(`${goc}/api/team/hrm/ke-hoach`, { headers: { cookie } })).json()).keHoach.vanTay;
  await m.$('#hrm-ap').click(); await m.cho();
  assert.match(m.loa.at(-1), /^Đã áp theo HRM: tạo 2 tài khoản · cấp 4 vai · rút 0 · khoá 0 · mở khoá 0 · đổi tên 2 team\.$/);
  // bảng người của team đang mở (GCC) sau khi nạp lại: An (Marketer · HRM, chưa mật khẩu) + Bình (Sale · HRM)
  const hang = (email) => m.document.querySelectorAll('tr[data-nguoi]').find((r) => chu(r).includes(email));
  assert.match(chu(hang('an@gmail.com')), /Marketer\s*HRM.*Chưa đặt mật khẩu/);
  assert.match(chu(hang('binh@gmail.com')), /Sale\s*HRM/);
  assert.equal((await pool.query("SELECT ten FROM team WHERE slug = 'tieu-alpha'")).rows[0].ten, 'Pialpha GCC');
  assert.equal((await dangNhap('an@gmail.com', 'matkhau-an-1')).status, 401, 'chưa đặt mật khẩu ⇒ chưa đăng nhập được');
  await hang('an@gmail.com').querySelector('[data-dat-mk]').click();
  m.$('#mk-moi').value = 'matkhau-an-1';
  await m.$('#mk-luu').click(); await m.cho();
  assert.equal((await dangNhap('an@gmail.com', 'matkhau-an-1')).status, 200, 'đặt mật khẩu đầu xong ⇒ đăng nhập được');
  const lan2 = await fetch(`${goc}/api/team/nguoi-dung/${hang('an@gmail.com').dataset.nguoi}/mat-khau-dau`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ matKhau: 'doi-mat-khau-2' }) });
  assert.deepEqual([lan2.status, (await lan2.json()).ma], [409, 'da_co_mat_khau'], 'mật khẩu ĐẦU — không phải đặt lại');
  // bản kế hoạch đã xem trước khi áp giờ cũ ⇒ áp lại bị từ chối, không áp mù
  const cu = await fetch(`${goc}/api/team/hrm/ap-dung`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify({ vanTay: vanTayDaXem }) });
  assert.deepEqual([cu.status, (await cu.json()).ma], [409, 'ke_hoach_doi']);
  const nk = (await pool.query("SELECT tac_nhan, hanh_dong FROM nhat_ky WHERE hanh_dong LIKE 'hrm_%' OR hanh_dong = 'dat_mat_khau_dau'")).rows;
  assert.ok(nk.length >= 9 && nk.every((r) => r.tac_nhan === `nguoi:${qt}`), 'mọi dòng nhật ký mang người bấm');
});
