// LL15b · ĐỒNG BỘ NGƯỜI TỪ HRM → TÀI KHOẢN + VAI — trên Postgres THẬT (sandbox, migration 029). HRM giả (dữ liệu hình prod:
// gmail, MKT/SALE/BO, đang làm/thử việc/nghỉ, team ngoài hệ, thiếu email).
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { docHienTrang, lapKeHoach, kiemAnToan, apDung, datMatKhauDau, taoDongBoHrm, HANH_DONG_DONG_BO } from '../src/hrm/dong-bo.js';

const NV = (emp_code, comp_profile, team_code, status, email_cong_ty, ho_ten = emp_code) => ({ emp_code, comp_profile, team_code, status, email_cong_ty, ho_ten });
const HRM1 = [
  NV('NV1', 'MKT', 'PIALPHA_GCC', 'active', 'a@gmail.com', 'An'),
  NV('NV2', 'MKT', 'PIALPHA_AUUS', 'thuviec', ' B@Gmail.com ', 'Bình'),
  NV('NV3', 'SALE', 'PIALPHA_SALE_ONLINE', 'active', 'c@gmail.com', 'Chi'),
  NV('NV4', 'MKT', 'PIALPHA_GCC', 'nghi', 'd@gmail.com'),          // đã nghỉ, chưa có tài khoản ⇒ không làm gì
  NV('NV5', 'BO', 'PIALPHA_GCC', 'active', 'e@gmail.com'),          // BO không vào hệ
  NV('NV6', 'MKT', 'PIALPHA_VD_OFFLINE', 'active', 'f@gmail.com'),  // team không vào hệ
  NV('NV7', 'MKT', 'PIALPHA_EU', 'active', ''),                     // thiếu email
  NV('NV8', 'MKT', 'PIALPHA_EU', 'active', 'Owner@X.vn', 'Chủ'),    // trùng email tài khoản tạo tay ⇒ GẮN, không tạo
];

async function dung(t) {
  const sb = await dungSandbox(`ll15b_${Math.random().toString(36).slice(2, 8)}`);
  t.after(() => sb.don());
  const pool = sb.pool;
  const one = async (q, a = []) => (await pool.query(q, a)).rows[0];
  const team = Object.fromEntries((await pool.query('SELECT id, slug FROM team')).rows.map((r) => [r.slug, String(r.id)]));
  const vai = Object.fromEntries((await pool.query('SELECT id, ma FROM vai')).rows.map((r) => [r.ma, String(r.id)]));
  const chu = await one("INSERT INTO nguoi_dung (email, ten, mat_khau_hash) VALUES ('owner@x.vn', 'Chủ', 'bam-gia') RETURNING id");
  await pool.query('INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) VALUES ($1, $2, $3)', [team['tieu-alpha'], chu.id, vai['quan-tri']]);
  const chay = async (nhanVien, ai = { tacNhan: 'may:dong-bo-hrm' }) => {
    const ke = lapKeHoach({ nhanVien }, await docHienTrang(pool));
    return { ke, ra: await apDung(pool, ke, ai) };
  };
  return { pool, one, team, vai, chuId: String(chu.id), chay };
}
const vaiCua = async (pool, email) => (await pool.query(`SELECT t.slug, v.ma, tv.nguon FROM thanh_vien_team tv JOIN nguoi_dung n ON n.id = tv.nguoi_dung_id
  JOIN team t ON t.id = tv.team_id JOIN vai v ON v.id = tv.vai_id WHERE n.email = $1 ORDER BY t.slug, v.ma`, [email])).rows.map((r) => `${r.slug}:${r.ma}:${r.nguon}`);

test('B1 · lượt đầu: tạo tài khoản (email chữ thường, gắn mã, CHƯA mật khẩu) · gắn tài khoản tay trùng email · MKT → team mình, SALE → cả ba team · đổi tên team · bỏ BO/ngoài hệ/thiếu email', async (t) => {
  const { pool, one, chay } = await dung(t);
  const { ke, ra } = await chay(HRM1);
  assert.deepEqual(ke.taoTaiKhoan.map((x) => x.email), ['a@gmail.com', 'b@gmail.com', 'c@gmail.com']);
  assert.deepEqual([ke.dem.nhanVienVaoHe, ke.dem.boQuaThieuEmail, ke.dem.boQuaNgoaiHe], [4, 1, 2]);
  assert.deepEqual(ra, { taoTaiKhoan: 3, ganMaNv: 1, capVai: 6, rutVai: 0, khoa: 0, moKhoa: 0, doiTenTeam: 2 });
  const b = await one("SELECT email, ten, ma_nv, mat_khau_hash, hoat_dong FROM nguoi_dung WHERE ma_nv = 'NV2'");
  assert.deepEqual([b.email, b.ten, b.mat_khau_hash, b.hoat_dong], ['b@gmail.com', 'Bình', null, true]);
  assert.equal((await one("SELECT ma_nv FROM nguoi_dung WHERE email = 'owner@x.vn'")).ma_nv, 'NV8');
  assert.deepEqual(await vaiCua(pool, 'a@gmail.com'), ['tieu-alpha:marketer:hrm']);
  assert.deepEqual(await vaiCua(pool, 'c@gmail.com'), ['auus:sale:hrm', 'pialpha-eu:sale:hrm', 'tieu-alpha:sale:hrm']);
  assert.deepEqual(await vaiCua(pool, 'owner@x.vn'), ['pialpha-eu:marketer:hrm', 'tieu-alpha:quan-tri:tay'], 'vai tay giữ nguyên, thêm vai HRM');
  assert.deepEqual((await pool.query("SELECT slug, ten FROM team WHERE NOT la_ky_thuat ORDER BY slug")).rows.map((r) => `${r.slug}=${r.ten}`),
    ['auus=Pialpha AUUS', 'pialpha-eu=Pialpha EU', 'tieu-alpha=Pialpha GCC']);
  for (const e of ['d@gmail.com', 'e@gmail.com', 'f@gmail.com']) assert.equal(await one('SELECT id FROM nguoi_dung WHERE email = $1', [e]), undefined);
  const nk = (await pool.query("SELECT hanh_dong, tac_nhan FROM nhat_ky WHERE hanh_dong LIKE 'hrm_%'")).rows;
  assert.equal(nk.filter((r) => r.hanh_dong === HANH_DONG_DONG_BO.TAO).length, 3);
  assert.equal(nk.filter((r) => r.hanh_dong === HANH_DONG_DONG_BO.CAP).length, 6);
  assert.ok(nk.every((r) => r.tac_nhan === 'may:dong-bo-hrm'));
});

test('B2 · chạy lại không đổi gì: kế hoạch rỗng · vân tay ổn định · không thêm dòng nhật ký', async (t) => {
  const { pool, chay } = await dung(t);
  await chay(HRM1);
  const truoc = (await pool.query('SELECT count(*)::int n FROM nhat_ky')).rows[0].n;
  const a = lapKeHoach({ nhanVien: HRM1 }, await docHienTrang(pool));
  const b = lapKeHoach({ nhanVien: HRM1 }, await docHienTrang(pool));
  assert.equal(a.vanTay, b.vanTay);
  const { ra } = await chay(HRM1);
  assert.deepEqual(ra, { taoTaiKhoan: 0, ganMaNv: 0, capVai: 0, rutVai: 0, khoa: 0, moKhoa: 0, doiTenTeam: 0 });
  assert.equal((await pool.query('SELECT count(*)::int n FROM nhat_ky')).rows[0].n, truoc);
});

test('B3 · đổi team ⇒ cấp team mới + rút team cũ · nghỉ ⇒ rút vai HRM + KHOÁ · dòng cấp TAY không bao giờ bị rút · quay lại ⇒ mở khoá + cấp lại', async (t) => {
  const { pool, one, team, vai, chay } = await dung(t);
  await chay(HRM1);
  const c = await one("SELECT id FROM nguoi_dung WHERE email = 'c@gmail.com'");
  // cấp TAY (vai marketer — vai quản trị sẽ làm c thành quản trị duy nhất của Auus và rào «không khoá quản trị duy nhất» chặn khoá, đúng luật)
  await pool.query('INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) VALUES ($1, $2, $3)', [team.auus, c.id, vai.marketer]);
  const HRM2 = HRM1.map((n) => (n.emp_code === 'NV1' ? { ...n, team_code: 'PIALPHA_EU' } : n.emp_code === 'NV3' ? { ...n, status: 'nghi' } : n));
  const { ke, ra } = await chay(HRM2, { tacNhan: 'nguoi:qt@x.vn' });
  assert.deepEqual(ra, { taoTaiKhoan: 0, ganMaNv: 0, capVai: 1, rutVai: 4, khoa: 1, moKhoa: 0, doiTenTeam: 0 });
  assert.equal(kiemAnToan(ke, { soNhanVien: HRM2.length }).anToan, false, 'rút 4/6 vai HRM > 30% ⇒ lượt TỰ ĐỘNG phải dừng chờ người');
  assert.deepEqual(await vaiCua(pool, 'a@gmail.com'), ['pialpha-eu:marketer:hrm']);
  assert.deepEqual(await vaiCua(pool, 'c@gmail.com'), ['auus:marketer:tay'], 'chỉ dòng HRM bị rút');
  assert.equal((await one("SELECT hoat_dong FROM nguoi_dung WHERE email = 'c@gmail.com'")).hoat_dong, false);
  assert.ok((await pool.query("SELECT 1 FROM nhat_ky WHERE tac_nhan = 'nguoi:qt@x.vn' AND hanh_dong = $1", [HANH_DONG_DONG_BO.KHOA])).rowCount);
  const { ra: ra2 } = await chay(HRM1);   // NV3 quay lại, NV1 về GCC
  assert.deepEqual([ra2.moKhoa, ra2.capVai, ra2.rutVai], [1, 4, 1]);
  assert.equal((await one("SELECT hoat_dong FROM nguoi_dung WHERE email = 'c@gmail.com'")).hoat_dong, true);
});

test('B4 · rào: KHÔNG khoá quản trị duy nhất của team (cảnh báo) · tài khoản tạo tay không gắn mã thì không bao giờ bị khoá · HRM rỗng ⇒ không tự áp', async (t) => {
  const { pool, one, chay } = await dung(t);
  await chay(HRM1);
  const HRM_NGHI = HRM1.map((n) => (n.emp_code === 'NV8' ? { ...n, status: 'nghi' } : n));   // chủ (quản trị duy nhất của GCC) «nghỉ»
  const ke = lapKeHoach({ nhanVien: HRM_NGHI }, await docHienTrang(pool));
  assert.equal(ke.khoa.length, 0);
  assert.ok(ke.canhBao.some((c) => c.ma === 'quan_tri_duy_nhat'));
  await pool.query("INSERT INTO nguoi_dung (email, ten) VALUES ('tay@x.vn', 'Tay')");
  const ke2 = lapKeHoach({ nhanVien: [...HRM1, NV('NV9', 'MKT', 'PIALPHA_GCC', 'nghi', 'khac@gmail.com')] }, await docHienTrang(pool));
  assert.ok(!ke2.khoa.some((k) => k.email === 'tay@x.vn'));
  const rong = lapKeHoach({ nhanVien: [] }, await docHienTrang(pool));
  const kt = kiemAnToan(rong, { soNhanVien: 0 });
  assert.equal(kt.anToan, false);
  assert.match(kt.lyDo.join(' '), /RỖNG/);
  assert.equal((await one("SELECT hoat_dong FROM nguoi_dung WHERE email = 'owner@x.vn'")).hoat_dong, true);
});

test('B5 · mật khẩu ĐẦU TIÊN: chỉ đặt khi chưa có — không ghi đè mật khẩu đang có; ghi nhật ký', async (t) => {
  const { pool, one, team, chay } = await dung(t);
  await chay(HRM1);
  const a = await one("SELECT id FROM nguoi_dung WHERE email = 'a@gmail.com'");
  const r1 = await datMatKhauDau(pool, { nguoiDungId: a.id, bamMatKhau: 'bam-1', teamId: team['tieu-alpha'], tacNhan: 'nguoi:qt@x.vn' });
  assert.deepEqual(r1, { ok: true, email: 'a@gmail.com' });
  const r2 = await datMatKhauDau(pool, { nguoiDungId: a.id, bamMatKhau: 'bam-2', teamId: team['tieu-alpha'], tacNhan: 'nguoi:qt@x.vn' });
  assert.equal(r2.ok, false);
  assert.equal((await one('SELECT mat_khau_hash FROM nguoi_dung WHERE id = $1', [a.id])).mat_khau_hash, 'bam-1');
  const chuId = (await one("SELECT id FROM nguoi_dung WHERE email = 'owner@x.vn'")).id;
  assert.equal((await datMatKhauDau(pool, { nguoiDungId: chuId, bamMatKhau: 'x', teamId: team['tieu-alpha'], tacNhan: 'nguoi:qt@x.vn' })).ok, false);
  assert.equal((await pool.query("SELECT count(*)::int n FROM nhat_ky WHERE hanh_dong = 'dat_mat_khau_dau'")).rows[0].n, 1);
});

test('B6 · kế hoạch cũ không vượt ranh giới: rút dòng TAY / khoá tài khoản không gắn mã bằng kế hoạch giả ⇒ không có tác dụng', async (t) => {
  const { pool, one, chay, chuId } = await dung(t);
  await chay(HRM1);
  const tay = await one("SELECT tv.id FROM thanh_vien_team tv JOIN vai v ON v.id = tv.vai_id WHERE v.ma = 'quan-tri'");
  const tk = await one("INSERT INTO nguoi_dung (email, ten) VALUES ('tay2@x.vn', 'T') RETURNING id");
  const gia = { taoTaiKhoan: [], ganMaNv: [], capVai: [], moKhoa: [], doiTenTeam: [], canhBao: [], dem: {}, vanTay: 'x',
    rutVai: [{ tvId: String(tay.id), nguoiDungId: chuId, email: 'owner@x.vn', teamId: '1', vai: 'quan-tri', lyDo: 'giả' }],
    khoa: [{ nguoiDungId: String(tk.id), maNv: null, email: 'tay2@x.vn' }] };
  const ra = await apDung(pool, gia, { tacNhan: 'may:dong-bo-hrm' });
  assert.deepEqual([ra.rutVai, ra.khoa], [0, 0]);
  assert.ok(await one('SELECT 1 FROM thanh_vien_team WHERE id = $1', [tay.id]));
  assert.equal((await one('SELECT hoat_dong FROM nguoi_dung WHERE id = $1', [tk.id])).hoat_dong, true);
});

test('B7 · lượt TỰ ĐỘNG: đọc HRM MỚI (bỏ đệm) · qua rào ⇒ áp bằng `may:dong-bo-hrm` · HRM rỗng ⇒ HOÃN (không đụng gì, nhật ký «hoãn») · đọc hỏng ⇒ ghi lỗi, không ném', async (t) => {
  const { pool, one } = await dung(t);
  let du = { luc: 1, nhanVien: HRM1 };
  const goi = [];
  const db = taoDongBoHrm({ pool, docHrm: async (o) => { goi.push(o); if (du instanceof Error) throw du; return du; }, dongHo: () => 42 });
  assert.equal(db.lanCuoi(), null);
  const l1 = await db.tuDong();
  assert.deepEqual(goi.at(-1), { lamMoi: true }, 'lượt tự động phải đọc HRM mới, không đệm');
  assert.deepEqual([l1.cach, l1.luc, l1.ra.taoTaiKhoan, l1.ra.capVai], ['tu_dong', 42, 3, 6]);
  assert.ok((await pool.query("SELECT 1 FROM nhat_ky WHERE hanh_dong = 'hrm_tao_tai_khoan' AND tac_nhan = 'may:dong-bo-hrm'")).rowCount);
  du = { luc: 2, nhanVien: [] };
  const truoc = (await pool.query("SELECT count(*)::int n FROM thanh_vien_team WHERE nguon = 'hrm'")).rows[0].n;
  const l2 = await db.tuDong();
  assert.match(l2.hoan.join(' '), /RỖNG/);
  assert.equal((await pool.query("SELECT count(*)::int n FROM thanh_vien_team WHERE nguon = 'hrm'")).rows[0].n, truoc, 'HRM rỗng không được rút gì');
  assert.equal((await one("SELECT count(*)::int n FROM nguoi_dung WHERE NOT hoat_dong")).n, 0);
  assert.ok((await pool.query("SELECT 1 FROM nhat_ky WHERE hanh_dong = 'hrm_dong_bo_hoan' AND tac_nhan = 'may:dong-bo-hrm'")).rowCount);
  du = new Error('BigQuery từ chối câu đọc (accessDenied)');
  const l3 = await db.tuDong();
  assert.match(l3.loi, /accessDenied/);
  assert.deepEqual(db.lanCuoi(), l3);
});
