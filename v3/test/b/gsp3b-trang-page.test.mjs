// GSP3b · TRANG MỘT PAGE + MÀN PROMPT ĐỌC ĐÚNG THỨ BOT ĐỌC — đầu-cuối trên Postgres hộp cát: cổng danh tính thật · tầng truy vấn thật ·
// máy chủ vai-b · bộ đọc `docKhoi.sanPham` nối ĐÚNG như `v3/chay-that.js` (`docSanPhamTrangPage(pool, …)`) · script THẬT của trang page
// (vm, DOM giả). Đo: ④1 `noi-dung` của page ĐÃ GẮN = trọn mảng `catalog.js#docSanPhamGoiGia(…, trang)`; page chưa gắn = bản sao như cũ;
// màn Prompt mang khối sản phẩm của món POS · ④5 tab «SP & giá» + «Ảnh» của page đã gắn CHỈ XEM (không nút lưu / tải ảnh / xếp ảnh),
// có câu «sửa ở Sản phẩm» + nút sang đúng chỗ; page chưa gắn còn nút.
// Nhánh KHÔNG chạm: `docSanPhamSua` thật của `chay-that.js` (cần cả hệ) — ở đây một bản đọc gọn cùng khuôn trường màn dùng.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
process.env.V3_BOT_KHOA = '1';

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { moTrang } = await import('../../testkit/dom-gia.js');
const { dungSandbox } = await import('../../../db/sandbox.js');
const { maHoa } = await import('../../../db/khoa.js');
const { taoCongDanhTinh } = await import('../../src/noi-day/cong-danh-tinh.js');
const { taoTruyVanThat } = await import('../../src/noi-day/cong-du-lieu-that.js');
const { gopMonThanhGoc, ganPageVaoGoc } = await import('../../../src/products/san-pham-goc.js');
const { docSanPhamTrangPage } = await import('../../../src/products/chuyen-ban-sao.js');
const { docSanPhamGoiGia } = await import('../../../src/products/catalog.js');

async function dung(t) {
  const sb = await dungSandbox(`gsp3b_trang_${Math.random().toString(36).slice(2, 8)}`);
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gsp3b-trang-'));
  t.after(async () => { await sb.don(); fs.rmSync(TMP, { recursive: true, force: true }); });
  const pool = sb.pool;
  const q = (sql, a = []) => pool.query(sql, a);
  const one = async (sql, a = []) => (await q(sql, a)).rows[0];
  const T = String((await one("SELECT id FROM team WHERE slug = 'tieu-alpha'")).id);
  const vai = Object.fromEntries((await q('SELECT id, ma FROM vai')).rows.map((r) => [r.ma, String(r.id)]));
  const u = String((await one('INSERT INTO nguoi_dung (email, ten, mat_khau_hash, hoat_dong) VALUES ($1, $2, $3, true) RETURNING id',
    ['qt@gsp3b.vn', 'Chủ', await bam('matkhau1')])).id);
  await q('INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) VALUES ($1, $2, $3)', [T, u, vai['quan-tri']]);
  await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,true)', [T, 'Saudi', '111', maHoa('k')]);
  await q("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,'111:x','101 - Gold Ring X','101',5,'pos')", [T]);
  const G = await gopMonThanhGoc(pool, T, { maGoc: 'gold', ten: 'Gold Ring', sku: '101', posMa: ['111:x'] });
  const xId = String((await one("SELECT id FROM san_pham WHERE team_id=$1 AND ma='111:x'", [T])).id);
  await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan) VALUES($1,$2,1,19900,'SAR','Mua 1'),($1,$2,2,29900,'SAR','Mua 2')", [T, xId]);
  await q("INSERT INTO anh_san_pham(team_id,san_pham_id,duong,nhan,thu_tu,nguon) VALUES($1,$2,'/uploads/x1.png','Ảnh sản phẩm',0,'nguoi')", [T, xId]);
  const trang = async (fb, ten) => String((await one('INSERT INTO page(team_id,page_id,ten) VALUES($1,$2,$3) RETURNING id', [T, fb, ten])).id);
  const banSao = async (pageId, ma, gia) => {
    const id = String((await one("INSERT INTO san_pham(team_id,page_id,ma,ten,mo_ta,nguon) VALUES($1,$2,$3,$3,'','kb') RETURNING id", [T, pageId, ma])).id);
    await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,$3,'SAR')", [T, id, gia]);
    await q("INSERT INTO anh_san_pham(team_id,san_pham_id,duong,nhan,thu_tu,nguon) VALUES($1,$2,$3,'Ảnh sản phẩm',0,'kb')", [T, id, `/uploads/${ma.replace(/[^a-z0-9]/gi, "-")}.png`]);
    return id;
  };
  const A = await trang('fbA', 'Gold Saudi A');
  await ganPageVaoGoc(pool, T, G.id, { pageId: A, shopId: '111' });
  await banSao(A, 'kb:fbA:SP01', 9900);
  const B = await trang('fbB', 'Aloe B');
  await banSao(B, 'kb:fbB:SP01', 8800);
  const C = await trang('fbC', 'Gold không shop');
  await q("UPDATE page SET san_pham_goc_ma='gold' WHERE id=$1", [C]);

  // Bản sửa được — đọc gọn theo id, cùng khuôn trường trang page dùng (`version` · `offers[].price` đơn vị lớn · `anh`).
  const docSanPhamSua = async (bc, ids) => (await q(
    `SELECT s.id::text AS id, s.ma, s.ten, s.mo_ta, s.het_hang, s.xmin::text AS version, COALESCE(s.bien_the,'') AS bien_the, s.pos_ma,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('so_luong',g.so_luong,'gia',g.gia,'tien_te',g.tien_te,'bat',g.bat,'nhan',g.nhan,
         'price',g.gia/100.0) ORDER BY g.so_luong) FROM goi_gia g WHERE g.san_pham_id=s.id),'[]') AS offers,
       COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id::text,'duong',a.duong,'nhan',a.nhan,'thuTu',a.thu_tu) ORDER BY a.thu_tu)
         FROM anh_san_pham a WHERE a.san_pham_id=s.id),'[]') AS anh
       FROM san_pham s WHERE s.team_id=$1 AND s.id = ANY($2::bigint[]) ORDER BY s.ma`, [bc.teamId, ids.map(String)])).rows
    .map((x) => ({ ...x, pos: null }));
  const app = express();
  dungPhanB(app, {
    taoTruyVan: (bc) => taoTruyVanThat(pool, bc), taoTruyVanHeThong: () => taoCongDanhTinh(pool), express,
    docSanSang: async () => ({ pages: [] }),
    // Nối dây ĐÚNG như `v3/chay-that.js` docKhoi.sanPham (GSP3b).
    docKhoi: { boLuat: async () => null, kyNang: async () => [], kichBan: async () => null,
      sanPham: (teamId, pageRowId) => docSanPhamTrangPage(pool, teamId, pageRowId) },
    docSanPhamSua,
    vanHanh: { pool, daySanPhamLenBot: async () => {}, thuMucAnh: TMP },
  });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  t.after(() => sv.close());
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const cookie = (await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qt@gsp3b.vn', matKhau: 'matkhau1' }) })).headers.getSetCookie()[0].split(';')[0];
  const doc = async (duong) => { const r = await fetch(goc + duong, { headers: { cookie } }); return { status: r.status, j: await r.json() }; };
  return { pool, T, G, A, B, C, goc, cookie, doc };
}
const json = (x) => JSON.parse(JSON.stringify(x));

test('T1 · ④1 noi-dung: page ĐÃ GẮN = trọn mảng bộ đọc của bot có `trang` (món 111:x, 2 bậc) + `chuyen`; chưa gắn = bản sao như cũ', async (t) => {
  const o = await dung(t);
  const a = await o.doc(`/api/page/${o.A}/noi-dung`);
  assert.equal(a.status, 200, JSON.stringify(a.j));
  const trangA = (await o.pool.query('SELECT * FROM page WHERE id=$1', [o.A])).rows[0];
  assert.deepEqual(a.j.sanPham, json(await docSanPhamGoiGia(o.pool, o.T, o.A, trangA)));
  assert.deepEqual(a.j.sanPham.map((s) => [s.ma, s.goiGia.length]), [['111:x', 2]]);
  assert.deepEqual(a.j.sanPhamSua.map((s) => s.ma), ['111:x'], 'bản xem theo ĐÚNG sản phẩm bộ đọc trả');
  assert.equal(a.j.chuyen.tenGoc, 'Gold Ring');
  assert.equal(a.j.chuyen.thiTruong, 'Saudi');
  assert.equal(a.j.chuyen.duongSua, `/san-pham?sp=${o.G.id}&tab=thi-truong`);
  const b = await o.doc(`/api/page/${o.B}/noi-dung`);
  assert.deepEqual(b.j.sanPham, json(await docSanPhamGoiGia(o.pool, o.T, o.B)));
  assert.deepEqual(b.j.sanPham.map((s) => s.ma), ['kb:fbB:SP01']);
  assert.equal(b.j.chuyen, null);
  const c = await o.doc(`/api/page/${o.C}/noi-dung`);
  assert.deepEqual(c.j.sanPham, [], 'gắn gốc chưa shop: bot không bán gì — màn nói đúng vậy');
  assert.equal(c.j.chuyen.duongSua, `/san-pham?sp=${o.G.id}&tab=page`);
});

test('T2 · ④1 màn Prompt: page đã gắn mang khối sản phẩm của món POS (không bản sao); page chưa gắn giữ bản sao', async (t) => {
  const o = await dung(t);
  const a = await o.doc('/api/prompt-page/fbA');
  assert.equal(a.status, 200, JSON.stringify(a.j));
  const spA = a.j.khoi.find((k) => k.ma === 'san_pham');
  assert.match(spA.noiDung, /\(111:x\)/);
  assert.match(spA.noiDung, /1 cái: 19900(\.00)? SAR\n {2}2 cái: 29900(\.00)? SAR/, 'bậc giá của MÓN, không của bản sao (9900)');
  assert.doesNotMatch(spA.noiDung, /kb:fbA/);
  const spB = (await o.doc('/api/prompt-page/fbB')).j.khoi.find((k) => k.ma === 'san_pham');
  assert.match(spB.noiDung, /\(kb:fbB:SP01\)/);
});

test('T3 · ④5 trang page ĐÃ GẮN: tab «SP & giá» + «Ảnh» chỉ xem — không nút lưu / tải ảnh / xếp / bỏ; có câu «sửa ở Sản phẩm» + nút sang', async (t) => {
  const o = await dung(t);
  const m = await moTrang('mot-page/trang/mot-page.html', { goc: o.goc, cookie: o.cookie, duong: `/page/${o.A}?tab=sp` });
  const sp = m.$('#o-sp'); const anh = m.$('#o-anh');
  assert.ok(sp.querySelector('[data-sp]'), 'tab không vẽ sản phẩm nào — ca không đo được gì');
  assert.equal(sp.querySelectorAll('[data-luusp]').length, 0, 'còn nút «Lưu sản phẩm này»');
  assert.equal(sp.querySelectorAll('[data-pos]').length, 0, 'còn ô nối món POS');
  assert.ok(sp.querySelectorAll('input').every((x) => x.disabled), 'còn ô nhập sửa được');
  for (const s of ['[data-anhtai]', '[data-anhlink]', '[data-anhlen]', '[data-anhxuong]', '[data-anhbo]']) {
    assert.equal(anh.querySelectorAll(s).length, 0, `tab Ảnh còn ${s}`);
  }
  for (const khoi of [sp, anh]) {
    const nut = khoi.querySelector('[data-sangsua]');
    assert.ok(nut, 'thiếu nút sang Sản phẩm');
    assert.equal(nut.getAttribute('href').replace(/&amp;/g, '&'), `/san-pham?sp=${o.G.id}&tab=thi-truong`);
    assert.match(khoi.querySelector('[data-chuyen]').textContent, /sửa ở Sản phẩm › «Gold Ring» › Theo thị trường/);
  }
  assert.doesNotMatch(sp.textContent, /Cần vai Quản trị hoặc Marketer/, 'câu thiếu vai sai cảnh — người sửa được, chỉ là sửa ở chỗ khác');
});

test('T4 · ④5 trang page CHƯA gắn: nút lưu + tải ảnh còn, không câu «chỉ xem»', async (t) => {
  const o = await dung(t);
  const m = await moTrang('mot-page/trang/mot-page.html', { goc: o.goc, cookie: o.cookie, duong: `/page/${o.B}?tab=sp` });
  const sp = m.$('#o-sp'); const anh = m.$('#o-anh');
  assert.equal(sp.querySelectorAll('[data-luusp]').length, 1);
  assert.equal(anh.querySelectorAll('[data-anhtai]').length, 1);
  assert.equal(anh.querySelectorAll('[data-anhbo]').length, 1);
  assert.equal(sp.querySelector('[data-chuyen]'), null);
});

test('T5 · tab mở TRƯỚC lúc page được gắn: bấm lưu ⇒ 409 `ban_sao_da_chuyen` ⇒ màn đọc lại, khoá tab, hiện câu + nút sang (không để ô sửa mở)', async (t) => {
  const o = await dung(t);
  const m = await moTrang('mot-page/trang/mot-page.html', { goc: o.goc, cookie: o.cookie, duong: `/page/${o.B}?tab=sp` });
  m.ctx.scrollTo = () => {};   // DOM giả chưa có cuộn — màn giữ vị trí cuộn khi vẽ lại (`veLaiGiuCuon`)
  const nut = m.$('#o-sp').querySelector('[data-luusp]');
  assert.ok(nut, 'page chưa gắn phải có nút lưu — ca không đo được gì');
  await o.pool.query("UPDATE page SET san_pham_goc_ma='gold', pos_shop_id='111' WHERE id=$1", [o.B]);   // người khác gắn page B
  await nut.click(); await m.cho();
  const sp = m.$('#o-sp');
  assert.match(m.$('#bang-tin').textContent, /Theo thị trường/, 'lỗi 409 không nói chỗ sửa');
  assert.ok(sp.querySelector('[data-chuyen]'), 'màn không khoá tab sau 409');
  assert.equal(sp.querySelectorAll('[data-luusp]').length, 0, 'nút lưu còn sau 409');
  assert.equal(m.$('#o-anh').querySelectorAll('[data-anhtai]').length, 0, 'tab Ảnh còn nút tải sau 409');
});

test('T6 · page gắn gốc CHƯA có shop: tab nói đúng một câu (chưa chọn shop POS), không câu «chưa khai sản phẩm gốc» trái ngược', async (t) => {
  const o = await dung(t);
  const m = await moTrang('mot-page/trang/mot-page.html', { goc: o.goc, cookie: o.cookie, duong: `/page/${o.C}?tab=sp` });
  const sp = m.$('#o-sp');
  assert.match(sp.querySelector('[data-chuyen]').textContent, /chưa chọn shop POS/);
  assert.doesNotMatch(sp.textContent, /chưa khai sản phẩm gốc/);
  assert.equal(sp.querySelector('[data-sangsua]').getAttribute('href').replace(/&amp;/g, '&'), `/san-pham?sp=${o.G.id}&tab=page`);
});
