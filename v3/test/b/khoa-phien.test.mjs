// N-KHOA-PHIEN · 05/10 — khoá tài khoản / rút vai CẮT phiên đang mở. Vé là chuỗi ký sống 8 tiếng, không bảng phiên: trước bản này
// người nghỉ bị đồng bộ HRM khoá vẫn dùng vé cũ tới hết hạn, và còn ĐỔI TEAM bằng vé cũ để lấy VÉ MỚI 8 tiếng (`/api/chon-team` không
// kiểm `hoat_dong`). Máy chủ HTTP thật + kho giả sửa được giữa chừng; ca cuối dựng cả ứng dụng thật (`dungPhanB`) để chứng minh dây nối.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { KhoGia, taoTruyVanGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay, VAI } = await import('../../src/auth/boi-canh.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { datCongDanhTinh, datPheuNhatKy, taoRouterAuth, lopBoiCanh, batBuocDangNhap, batBuocVaiHTTP, HAN_KIEM_PHIEN_MS } =
  await import('../../src/auth/index.js');

const MK = 'mat-khau-thu-1';
const H = await bam(MK, { N: 1024, r: 8, p: 1 });
const kho = new KhoGia({
  team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }, { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false }],
  vai: [{ id: 'v_sale', ma: 'sale' }, { id: 'v_qt', ma: 'quan-tri' }],
  nguoi_dung: [
    { id: 'u_an', email: 'an@vd.vn', hoat_dong: true, mat_khau_hash: H },     // một team, sale
    { id: 'u_binh', email: 'binh@vd.vn', hoat_dong: true, mat_khau_hash: H }, // hai team, KHÔNG quản trị ⇒ vào thẳng team mặc định
    { id: 'u_chi', email: 'chi@vd.vn', hoat_dong: true, mat_khau_hash: H },   // t1: sale + quản trị
    { id: 'u_dao', email: 'dao@vd.vn', hoat_dong: true, mat_khau_hash: H },   // hai team, CÓ quản trị ⇒ vé tạm
  ],
  thanh_vien_team: [
    { id: 'a1', nguoi_dung_id: 'u_an', team_id: 't1', vai_id: 'v_sale' },
    { id: 'b1', nguoi_dung_id: 'u_binh', team_id: 't1', vai_id: 'v_sale' }, { id: 'b2', nguoi_dung_id: 'u_binh', team_id: 't2', vai_id: 'v_sale' },
    { id: 'c1', nguoi_dung_id: 'u_chi', team_id: 't1', vai_id: 'v_sale' }, { id: 'c2', nguoi_dung_id: 'u_chi', team_id: 't1', vai_id: 'v_qt' },
    { id: 'd1', nguoi_dung_id: 'u_dao', team_id: 't1', vai_id: 'v_qt' }, { id: 'd2', nguoi_dung_id: 'u_dao', team_id: 't2', vai_id: 'v_qt' },
  ],
});
const nd = (id) => kho.bang.get('nguoi_dung').find((x) => x.id === id);
const boDong = (id) => kho.bang.set('thanh_vien_team', kho.bang.get('thanh_vien_team').filter((x) => x.id !== id));
let hong = false;
datCongDanhTinh(() => {
  if (hong) return { chon: async () => { throw new Error('CSDL mất kết nối'); }, mot: async () => { throw new Error('CSDL mất kết nối'); } };
  return taoTruyVanGia(kho, boiCanhMay('_he_thong', 'đọc bốn bảng dùng chung'));
});
const nhatKy = [];
datPheuNhatKy((_bc, ban) => { nhatKy.push(ban); return ban; });

let gio = 1_000_000;
async function dung({ hanKiemMs } = {}) {
  const app = express();
  app.use(express.json());
  app.use(lopBoiCanh(hanKiemMs == null ? { bayGio: () => gio } : { hanKiemMs, bayGio: () => gio }));
  app.use(taoRouterAuth());
  app.get('/api/thu', batBuocDangNhap(), (req, res) => res.json({ ok: true, teamId: req.boiCanh.teamId, vai: [...req.boiCanh.vai] }));
  app.get('/api/chi-quan-tri', batBuocDangNhap(), batBuocVaiHTTP(VAI.QUAN_TRI), (_req, res) => res.json({ ok: true }));
  app.use((e, _req, res, _next) => res.status(500).json({ ok: false, loi: e.message }));
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, '127.0.0.1', r));
  after(() => new Promise((r) => sv.close(r)));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const goi = async (duong, ve, than) => {
    const res = await fetch(goc + duong, { method: than ? 'POST' : 'GET', redirect: 'manual',
      headers: { ...(ve ? { cookie: `v3_ve=${encodeURIComponent(ve)}` } : {}), ...(than ? { 'content-type': 'application/json' } : {}) },
      body: than ? JSON.stringify(than) : undefined });
    const c = res.headers.getSetCookie().find((x) => x.startsWith('v3_ve='));
    return { st: res.status, j: await res.json().catch(() => null), ve: c ? decodeURIComponent(c.slice(6).split(';')[0]) : null };
  };
  const vao = async (email) => (await goi('/api/dang-nhap', null, { email, matKhau: MK })).ve;
  return { goi, vao };
}
const dat = (id, v) => { nd(id).hoat_dong = v; };

test('K1 · khoá tài khoản ⇒ vé còn hạn thôi dùng được (401) · MỘT dòng nhật ký `cat_phien` · mở khoá ⇒ vé dùng lại được', async () => {
  const o = await dung({ hanKiemMs: 0 });
  const ve = await o.vao('an@vd.vn');
  assert.equal((await o.goi('/api/thu', ve)).st, 200);
  dat('u_an', false);
  nhatKy.length = 0;
  assert.equal((await o.goi('/api/thu', ve)).st, 401);
  assert.equal((await o.goi('/api/toi', ve)).st, 401);
  const cat = nhatKy.filter((x) => x.hanhDong === 'cat_phien');
  assert.equal(cat.length, 1, 'cắt một lần thì ghi một dòng, không ghi lại mỗi lượt gọi');
  assert.deepEqual([cat[0].doiTuongId, cat[0].sau.team_id, cat[0].sau.vai_tren_ve], ['u_an', 't1', ['sale']]);
  dat('u_an', true);
  assert.equal((await o.goi('/api/thu', ve)).st, 200);
});

test('K2 · rút một vai ⇒ vé mất ĐÚNG vai đó ngay (403 ở cửa quản trị, vẫn vào được cửa thường) · rút hết vai trong team ⇒ 401', async () => {
  const o = await dung({ hanKiemMs: 0 });
  const ve = await o.vao('chi@vd.vn');
  assert.deepEqual((await o.goi('/api/thu', ve)).j.vai.sort(), ['quan-tri', 'sale']);
  assert.equal((await o.goi('/api/chi-quan-tri', ve)).st, 200);
  boDong('c2');
  assert.deepEqual((await o.goi('/api/thu', ve)).j.vai, ['sale']);
  assert.equal((await o.goi('/api/chi-quan-tri', ve)).st, 403);
  boDong('c1');
  assert.equal((await o.goi('/api/thu', ve)).st, 401);
});

test('K3 · người bị khoá KHÔNG đổi team bằng vé cũ để lấy vé mới — cả vé đủ quyền lẫn vé tạm', async () => {
  const o = await dung({ hanKiemMs: 0 });
  const ve = await o.vao('binh@vd.vn');
  dat('u_binh', false);
  const doi = await o.goi('/api/chon-team', ve, { teamId: 't2' });
  assert.deepEqual([doi.st, doi.ve], [401, null], 'không phát vé mới');
  dat('u_binh', true);
  const doi2 = await o.goi('/api/chon-team', ve, { teamId: 't2' });
  assert.equal(doi2.st, 200, 'ca đối chứng: chưa khoá thì đổi team được');
  const tam = await o.vao('dao@vd.vn');
  assert.equal((await o.goi('/api/toi', tam)).j.canChonTeam, true, 'quản trị nhiều team ⇒ vé tạm');
  dat('u_dao', false);
  const chon = await o.goi('/api/chon-team', tam, { teamId: 't1' });
  assert.deepEqual([chon.st, chon.ve], [401, null]);
  dat('u_dao', true);
});

test('K4 · đệm: trong hạn kiểm vé cũ còn chạy, quá hạn thì cắt — khoá có hiệu lực trong vòng HAN_KIEM_PHIEN_MS (30 giây)', async () => {
  assert.equal(HAN_KIEM_PHIEN_MS, 30_000);
  const o = await dung();
  const ve = await o.vao('an@vd.vn');
  assert.equal((await o.goi('/api/thu', ve)).st, 200);
  dat('u_an', false);
  gio += HAN_KIEM_PHIEN_MS - 1;
  assert.equal((await o.goi('/api/thu', ve)).st, 200, 'còn trong hạn đệm');
  gio += 2;
  assert.equal((await o.goi('/api/thu', ve)).st, 401);
  dat('u_an', true);
});

test('K5 · CSDL hỏng lúc kiểm ⇒ 500, KHÔNG giả «chưa đăng nhập», KHÔNG tin vé mù; không có vé thì không đụng CSDL', async () => {
  const o = await dung({ hanKiemMs: 0 });
  const ve = await o.vao('an@vd.vn');
  hong = true;
  try {
    const r = await o.goi('/api/thu', ve);
    assert.deepEqual([r.st, r.j.loi], [500, 'CSDL mất kết nối']);
    assert.equal((await o.goi('/api/thu', null)).st, 401, 'không vé ⇒ 401 như cũ, không 500');
  } finally { hong = false; }
});

test('K6 · dây nối thật: ứng dụng `dungPhanB` — đăng nhập rồi bị khoá ⇒ lượt gọi kế 401; người không khoá (đối chứng) 200', async (t) => {
  process.env.V3_BOT_KHOA = '1';
  const { dungPhanB } = await import('../../src/vai-b.js');
  const { dungCongGia } = await import('../../testkit/db-gia.js');
  const { taoTruyVan, kho: k } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    vai: [{ id: 'v1', ma: 'quan-tri' }],
    nguoi_dung: [{ id: 'u1', email: 'qt@x.vn', mat_khau_hash: H, ten: 'Chủ', hoat_dong: true, ma_nv: null },
      { id: 'u2', email: 'nghi@x.vn', mat_khau_hash: H, ten: 'Nghỉ', hoat_dong: true, ma_nv: 'NV9' }],
    thanh_vien_team: [{ id: 'a', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' }, { id: 'b', nguoi_dung_id: 'u2', team_id: 't1', vai_id: 'v1' }],
    page: [],
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  t.after(() => sv.close());
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const vao = async (email) => (await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, matKhau: MK }) })).headers.getSetCookie()[0].split(';')[0];
  const [c1, c2] = [await vao('qt@x.vn'), await vao('nghi@x.vn')];
  k.bang.get('nguoi_dung').find((x) => x.id === 'u2').hoat_dong = false;   // như đồng bộ HRM khoá người nghỉ
  assert.equal((await fetch(`${goc}/api/toi`, { headers: { cookie: c2 } })).status, 401);
  assert.equal((await fetch(`${goc}/api/toi`, { headers: { cookie: c1 } })).status, 200);
});

test('K7 · Postgres thật (hộp cát · cổng danh tính thật): khoá bằng ĐÚNG câu của đồng bộ HRM ⇒ 401; rút vai bằng xoá dòng thành viên ⇒ 401', async (t) => {
  const { dungSandbox } = await import('../../../db/sandbox.js');
  const { taoCongDanhTinh } = await import('../../src/noi-day/cong-danh-tinh.js');
  const sb = await dungSandbox('khoaphien');
  t.after(() => sb.don());
  const pool = sb.pool;
  const team = (await pool.query("SELECT id FROM team WHERE slug = 'tieu-alpha'")).rows[0].id;
  const vai = (await pool.query("SELECT id FROM vai WHERE ma = 'sale'")).rows[0].id;
  const tao = async (email, maNv) => {
    const id = (await pool.query('INSERT INTO nguoi_dung (email, ten, mat_khau_hash, ma_nv) VALUES ($1, $1, $2, $3) RETURNING id', [email, H, maNv])).rows[0].id;
    await pool.query('INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) VALUES ($1, $2, $3)', [team, id, vai]);
    return id;
  };
  const [idNghi, idRut] = [await tao('nghi@t.vn', 'NV7'), await tao('rut@t.vn', null)];
  datCongDanhTinh(() => taoCongDanhTinh(pool));
  const o = await dung({ hanKiemMs: 0 });
  const [veNghi, veRut] = [await o.vao('nghi@t.vn'), await o.vao('rut@t.vn')];
  assert.deepEqual([(await o.goi('/api/thu', veNghi)).st, (await o.goi('/api/thu', veRut)).st], [200, 200]);
  await pool.query('UPDATE nguoi_dung SET hoat_dong = false WHERE id = $1 AND ma_nv IS NOT NULL AND hoat_dong', [idNghi]);
  await pool.query('DELETE FROM thanh_vien_team WHERE nguoi_dung_id = $1', [idRut]);
  assert.deepEqual([(await o.goi('/api/thu', veNghi)).st, (await o.goi('/api/thu', veRut)).st], [401, 401]);
});
