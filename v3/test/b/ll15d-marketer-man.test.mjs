// LL15d · «MARKETER CHỈ THẤY SẢN PHẨM MÌNH PHỤ TRÁCH» (01 §9) + chọn marketer từ hồ sơ HRM + gợi ý từ đơn POS — ĐẦU-CUỐI trên Postgres
// hộp cát: cổng danh tính thật · tầng truy vấn thật · kho sản phẩm gốc thật (`src/products/san-pham-goc.js`) · máy chủ vai-b · trang
// Sản phẩm thật (vm). Bộ đọc đơn POS giả (BigQuery không gọi).
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
const { moTrang } = await import('../../testkit/dom-gia.js');
const { dungSandbox } = await import('../../../db/sandbox.js');
const { taoCongDanhTinh } = await import('../../src/noi-day/cong-danh-tinh.js');
const { taoTruyVanThat } = await import('../../src/noi-day/cong-du-lieu-that.js');
const spGoc = await import('../../../src/products/san-pham-goc.js');

const DON = { luc: Date.parse('2026-10-02T03:00:00Z'), dong: [
  { ma: 'shop1:v1', maNv: 'NV2', soDon: 41 }, { ma: 'shop1:v1', maNv: 'NV1', soDon: 9 },   // sản phẩm A: Bình 82%
] };

async function dung(t) {
  const sb = await dungSandbox(`ll15d_man_${Math.random().toString(36).slice(2, 8)}`);
  t.after(() => sb.don());
  const pool = sb.pool;
  const one = async (q, a = []) => (await pool.query(q, a)).rows[0];
  const teamId = String((await one("SELECT id FROM team WHERE slug = 'tieu-alpha'")).id);
  const vai = Object.fromEntries((await pool.query('SELECT id, ma FROM vai')).rows.map((r) => [r.ma, String(r.id)]));
  const mk = await bam('matkhau1');
  const nguoi = {};
  for (const [k, email, ten, maNv, v] of [['qt', 'qt@x.vn', 'Chủ', null, 'quan-tri'], ['an', 'an@x.vn', 'An', 'NV1', 'marketer'],
    ['binh', 'binh@x.vn', 'Bình', 'NV2', 'marketer'], ['tay', 'tay@x.vn', 'Tay', null, 'marketer'], ['nghi', 'nghi@x.vn', 'Nghỉ', 'NV3', 'marketer']]) {
    nguoi[k] = String((await one('INSERT INTO nguoi_dung (email, ten, mat_khau_hash, ma_nv, hoat_dong) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [email, ten, mk, maNv, k !== 'nghi'])).id);
    await pool.query('INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) VALUES ($1, $2, $3)', [teamId, nguoi[k], vai[v]]);
  }
  // Quản trị CŨNG mang vai marketer (không mã NV) — quản trị luôn thấy cả team, vai marketer đi kèm không được làm hẹp lại.
  await pool.query('INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) VALUES ($1, $2, $3)', [teamId, nguoi.qt, vai.marketer]);
  const goc = {};
  for (const [k, ma, maNv, ten] of [['a', 'sp-a', 'NV1', 'An'], ['b', 'sp-b', null, ''], ['c', 'sp-c', 'NV2', 'Bình']]) {
    goc[k] = String((await one('INSERT INTO san_pham_goc (team_id, ma_goc, ten, marketer, marketer_ma_nv) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [teamId, ma, `SP ${k.toUpperCase()}`, ten, maNv])).id);
  }
  await pool.query("INSERT INTO san_pham (team_id, ma, ten, nguon, ma_goc) VALUES ($1, 'shop1:v1', 'Món A', 'pos', 'sp-a'), ($1, 'shop1:v9', 'Món rời', 'pos', NULL)", [teamId]);
  const page = {};
  for (const [k, fb, ma] of [['p1', 'fb1', 'sp-a'], ['p2', 'fb2', 'sp-b'], ['p3', 'fb3', null], ['p4', 'fb4', 'sp-c']]) {
    page[k] = String((await one('INSERT INTO page (team_id, page_id, ten, san_pham_goc_ma) VALUES ($1, $2, $3, $4) RETURNING id', [teamId, fb, `Page ${k}`, ma])).id);
  }
  const app = express();
  dungPhanB(app, {
    taoTruyVan: (bc) => taoTruyVanThat(pool, bc), taoTruyVanHeThong: () => taoCongDanhTinh(pool), express,
    docGoiYMarketer: async () => DON,
    khoSanPham: (await import('../../src/noi-day/kho-san-pham-v3.js')).taoKhoSanPhamV3(pool),
    khoSanPhamGoc: {
      ds: (bc) => spGoc.dsSanPhamGoc(pool, bc.teamId), cho: (bc) => spGoc.soHieuChuaCoGoc(pool, bc.teamId), dem: (bc) => spGoc.demGia(pool, bc.teamId),
      tao: (bc, x) => spGoc.taoSanPhamGoc(pool, bc.teamId, x), sua: (bc, id, x) => spGoc.suaSanPhamGoc(pool, bc.teamId, id, x),
      bo: (bc, id) => spGoc.boSanPhamGoc(pool, bc.teamId, id), chiTiet: (bc, id) => spGoc.chiTietSanPhamGoc(pool, bc.teamId, id),
      monChuaGan: (bc) => spGoc.monPosChuaGan(pool, bc.teamId), gan: (bc, id, m) => spGoc.ganMonPosVaoGoc(pool, bc.teamId, id, m),
      go: (bc, id, m) => spGoc.goMonPosKhoiGoc(pool, bc.teamId, id, m), kienThuc: (bc, id, x) => spGoc.suaKienThucGoc(pool, bc.teamId, id, x),
      goiYGop: (bc) => spGoc.goiYGopMonPos(pool, bc.teamId), gop: (bc, x) => spGoc.gopMonThanhGoc(pool, bc.teamId, x),
      luuGia: async () => ({}), ganPage: (bc, id, x) => spGoc.ganPageVaoGoc(pool, bc.teamId, id, x),
      goPage: (bc, id, p) => spGoc.goPageKhoiGoc(pool, bc.teamId, id, p),
    },
  });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  t.after(() => sv.close());
  const goc0 = `http://127.0.0.1:${sv.address().port}`;
  const ve = async (email) => (await fetch(`${goc0}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, matKhau: 'matkhau1' }) })).headers.getSetCookie()[0].split(';')[0];
  const api = (cookie) => async (duong, o = {}) => {
    const r = await fetch(goc0 + duong, { ...o, headers: { 'Content-Type': 'application/json', cookie } });
    return { status: r.status, j: await r.json().catch(() => null) };
  };
  return { pool, goc0, ve, api, goc, page, nguoi, teamId };
}
const chu = (x) => x.textContent.replace(/\s+/g, ' ').trim();

test('S1 · marketer An (NV1): danh sách CHỈ sản phẩm của mình + số phần còn lại · mở / sửa kiến thức / xem lịch sử sản phẩm người khác ⇒ 403', async (t) => {
  const o = await dung(t);
  const an = o.api(await o.ve('an@x.vn'));
  const ds = await an('/api/san-pham/goc');
  assert.equal(ds.status, 200);
  assert.deepEqual(ds.j.goc.map((g) => g.maGoc), ['sp-a']);
  assert.deepEqual(ds.j.phamVi, { chiCuaToi: true, coMaNv: true, soCuaToi: 1, soTeam: 3, soChuaGan: 1 });
  assert.equal((await an(`/api/san-pham/goc/${o.goc.a}/chi-tiet`)).status, 200);
  for (const [duong, phuongThuc, than] of [[`/api/san-pham/goc/${o.goc.b}/chi-tiet`, 'GET'], [`/api/san-pham/goc/${o.goc.c}/chi-tiet`, 'GET'],
    [`/api/san-pham/goc/${o.goc.c}/kien-thuc`, 'POST', { kienThuc: { cong_dung: 'x' } }], [`/api/san-pham/goc/${o.goc.c}/lich-su`, 'GET']]) {
    const r = await an(duong, { method: phuongThuc, ...(than ? { body: JSON.stringify(than) } : {}) });
    assert.deepEqual([r.status, r.j.ma], [403, 'khong_phu_trach'], `${phuongThuc} ${duong}`);
  }
  assert.equal((await o.pool.query('SELECT kien_thuc FROM san_pham_goc WHERE id = $1', [o.goc.c])).rows[0].kien_thuc.cong_dung, undefined);
  const kt = await an(`/api/san-pham/goc/${o.goc.a}/kien-thuc`, { method: 'POST', body: JSON.stringify({ kienThuc: { cong_dung: 'giảm cân' } }) });
  assert.equal(kt.status, 200, 'sửa kiến thức sản phẩm của mình vẫn được');
});

test('S2 · page KẾ THỪA: An chỉ thấy page bán sản phẩm của mình (cột page · bản sao theo page) · mở page khác ⇒ 403 nói vì sao', async (t) => {
  const o = await dung(t);
  const an = o.api(await o.ve('an@x.vn'));
  const ds = await an('/api/page-ds');
  assert.deepEqual(ds.j.ds.map((p) => p.pageId), ['fb1']);
  assert.match(ds.j.phamVi.cau, /chỉ hiện page của sản phẩm bạn phụ trách/);
  assert.equal((await an(`/api/page/${o.page.p1}`)).status, 200);
  for (const k of ['p2', 'p3', 'p4']) {
    const r = await an(`/api/page/${o.page[k]}`);
    assert.deepEqual([r.status, r.j.ma], [403, 'khong_phu_trach'], k);
    assert.equal((await an(`/api/page/${o.page[k]}/noi-dung`)).status, 403);
  }
  const bs = await an('/api/san-pham');
  assert.equal(bs.j.phamVi.chiCuaToi, true);
  assert.equal(bs.j.dem.tongPage, 1, 'bản sao theo page chỉ đếm page trong phạm vi');
  assert.deepEqual([(await an('/api/san-pham/fb4')).status], [403]);
});

test('S3 · marketer TẠO TAY (không mã NV) ⇒ không thấy gì + nói vì sao · QUẢN TRỊ thấy cả team', async (t) => {
  const o = await dung(t);
  const tay = o.api(await o.ve('tay@x.vn'));
  const ds = await tay('/api/san-pham/goc');
  assert.deepEqual([ds.j.goc.length, ds.j.phamVi.coMaNv], [0, false]);
  assert.equal((await tay('/api/page-ds')).j.ds.length, 0);
  assert.match((await tay(`/api/san-pham/goc/${o.goc.a}/chi-tiet`)).j.thongDiep, /chưa gắn hồ sơ HRM/);
  const qt = o.api(await o.ve('qt@x.vn'));
  assert.deepEqual((await qt('/api/san-pham/goc')).j.goc.map((g) => g.maGoc).sort(), ['sp-a', 'sp-b', 'sp-c']);
  assert.equal((await qt('/api/san-pham/goc')).j.phamVi.chiCuaToi, false);
  assert.equal((await qt('/api/page-ds')).j.ds.length, 4);
});

test('S4 · quản trị CHỌN marketer từ hồ sơ HRM: danh sách chọn (chỉ marketer có mã NV, còn hoạt động) · gợi ý từ đơn · gán ⇒ tên + mã · page đổi theo · mã lạ ⇒ 400', async (t) => {
  const o = await dung(t);
  const qt = o.api(await o.ve('qt@x.vn'));
  const ct = await qt(`/api/san-pham/goc/${o.goc.a}/chi-tiet`);
  assert.deepEqual(ct.j.marketerChon, [{ maNv: 'NV1', ten: 'An', email: 'an@x.vn' }, { maNv: 'NV2', ten: 'Bình', email: 'binh@x.vn' }],
    'không có tài khoản tạo tay (không mã) và tài khoản đã khoá');
  assert.deepEqual(ct.j.goiYMarketer, { noi: true, soNgay: 60, docLuc: DON.luc,
    goiY: { maNv: 'NV2', ten: 'Bình', soDon: 41, tong: 50, tiLe: 0.82, chonDuoc: true } });
  const gan = await qt(`/api/san-pham/goc/${o.goc.a}`, { method: 'POST', body: JSON.stringify({ marketerMaNv: 'NV2' }) });
  assert.equal(gan.status, 200);
  assert.deepEqual([gan.j.goc.marketer, gan.j.goc.marketerMaNv, gan.j.goc.soPageTheoMarketer], ['Bình', 'NV2', 1]);
  assert.equal((await o.pool.query("SELECT marketer FROM page WHERE page_id = 'fb1'")).rows[0].marketer, 'Bình');
  const binh = o.api(await o.ve('binh@x.vn'));
  assert.deepEqual((await binh('/api/san-pham/goc')).j.goc.map((g) => g.maGoc).sort(), ['sp-a', 'sp-c'], 'gán xong người được gán thấy ngay');
  for (const sai of ['NV9', 'NV3']) {
    const r = await qt(`/api/san-pham/goc/${o.goc.a}`, { method: 'POST', body: JSON.stringify({ marketerMaNv: sai }) });
    assert.deepEqual([r.status, r.j.ma], [400, 'marketer_la'], `${sai} (lạ / đã khoá) không gán được`);
  }
  const bo = await qt(`/api/san-pham/goc/${o.goc.a}`, { method: 'POST', body: JSON.stringify({ marketerMaNv: '' }) });
  assert.deepEqual([bo.j.goc.marketer, bo.j.goc.marketerMaNv], ['', null]);
  const nk = (await o.pool.query("SELECT sau FROM nhat_ky WHERE hanh_dong = 'sua_san_pham_goc' ORDER BY id")).rows;
  assert.equal(nk[0].sau.marketerMaNv, 'NV2', 'nhật ký ghi cả mã NV');
  const gop = await qt('/api/san-pham/gop', { method: 'POST', body: JSON.stringify({ maGoc: 'sp-moi', ten: 'Mới', marketerMaNv: 'NV1', posMa: ['shop1:v9'] }) });
  assert.deepEqual([gop.status, gop.j.goc.marketer, gop.j.goc.marketerMaNv], [200, 'An', 'NV1']);
});

test('S5 · trang Sản phẩm thật: quản trị thấy ô CHỌN marketer HRM + gợi ý «Bình — 82%» · bấm «Dùng gợi ý» ⇒ gán · marketer thấy câu phạm vi', async (t) => {
  const o = await dung(t);
  const ck = await o.ve('qt@x.vn');
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: o.goc0, cookie: ck, duong: `/san-pham?sp=${o.goc.a}` });
  const chon = m.$('#spMk');
  assert.equal(chon.tagName, 'SELECT', 'ô marketer phải là ô CHỌN, không gõ tay');
  assert.deepEqual(chon.querySelectorAll('option').map(chu), ['— chưa gán —', 'An · NV1', 'Bình · NV2']);
  assert.equal(chu(m.$('[data-goi-y-mk]')), 'Gợi ý từ đơn POS 60 ngày: Bình — 82% đơn (41/50).');
  await m.$('#nutGoiYMk').click(); await m.cho();
  const gui = m.goi.filter((g) => g.phuongThuc === 'POST' && g.duong === `/api/san-pham/goc/${o.goc.a}`);
  assert.deepEqual(gui.map((g) => g.than), [{ marketerMaNv: 'NV2' }]);
  assert.equal((await o.pool.query('SELECT marketer_ma_nv FROM san_pham_goc WHERE id = $1', [o.goc.a])).rows[0].marketer_ma_nv, 'NV2');
  assert.match(chu(m.$('#tbMk')), /Đã lưu marketer «Bình» · 1 page đổi theo\./);
  // Bình vừa được gán sản phẩm A ⇒ thấy A + C; An mất A ⇒ còn 0 và màn nói vậy.
  const mk = await moTrang('san-pham/trang/san-pham.html', { goc: o.goc0, cookie: await o.ve('binh@x.vn'), duong: '/san-pham' });
  assert.equal(chu(mk.$('[data-pham-vi]')), 'Chỉ hiện 2/3 sản phẩm bạn phụ trách · 1 sản phẩm của team chưa gán marketer — quản trị gán ở tab Chung.');
  assert.deepEqual(mk.$('#dsGoc').querySelectorAll('[data-goc]').map((b) => b.dataset.goc), [o.goc.a, o.goc.c]);
  const an = await moTrang('san-pham/trang/san-pham.html', { goc: o.goc0, cookie: await o.ve('an@x.vn'), duong: '/san-pham' });
  assert.equal(chu(an.$('#dsGoc')), 'Bạn chưa phụ trách sản phẩm nào.');
});
