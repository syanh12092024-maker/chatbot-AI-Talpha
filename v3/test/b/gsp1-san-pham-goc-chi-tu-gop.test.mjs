// GSP1 · «SẢN PHẨM GỐC CHỈ SINH TỪ GỘP MÓN POS THEO SKU» (CR-02-10b mục 1) — ĐẦU-CUỐI trên Postgres hộp cát: cổng danh tính thật ·
// tầng truy vấn thật · kho gốc thật (`src/products/san-pham-goc.js`) · máy chủ vai-b · trang Sản phẩm thật (vm + DOM giả).
//  (a) router: POST tạo gốc ⇒ 404 mọi vai, không ghi; POST sửa gốc ⇒ 200 quản trị / 403 marketer; POST gộp còn là cửa tạo DUY NHẤT.
//  (b) trang: hết khung/nút/hàm tạo theo số hiệu; «+ Thêm» mở khung Gộp món POS; ô lưu ý hiện nút Gộp cho quản trị kể cả khi `cho` rỗng.
// Nhánh KHÔNG chạm: `chay-that.js` (nối dây thật cần cả hệ) — `tao` còn trong danh sách bắt buộc, canh bằng ca G5 (datKhoGoc thiếu `tao` ⇒ ném).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import fs from 'node:fs';
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
const kgoc = await import('../../src/ui/san-pham/kho-goc.js');

const HTML = fs.readFileSync(new URL('../../src/ui/san-pham/trang/san-pham.html', import.meta.url), 'utf8');

async function dung(t) {
  const sb = await dungSandbox(`gsp1_${Math.random().toString(36).slice(2, 8)}`);
  t.after(() => sb.don());
  const pool = sb.pool;
  const one = async (q, a = []) => (await pool.query(q, a)).rows[0];
  const teamId = String((await one("SELECT id FROM team WHERE slug = 'tieu-alpha'")).id);
  const vai = Object.fromEntries((await pool.query('SELECT id, ma FROM vai')).rows.map((r) => [r.ma, String(r.id)]));
  const mk = await bam('matkhau1');
  for (const [email, ten, v] of [['qt@x.vn', 'Chủ', 'quan-tri'], ['mk@x.vn', 'Mk', 'marketer']]) {
    const id = String((await one('INSERT INTO nguoi_dung (email, ten, mat_khau_hash, hoat_dong) VALUES ($1, $2, $3, true) RETURNING id', [email, ten, mk])).id);
    await pool.query('INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) VALUES ($1, $2, $3)', [teamId, id, vai[v]]);
  }
  const goc = String((await one("INSERT INTO san_pham_goc (team_id, ma_goc, ten) VALUES ($1, 'sp-co-san', 'Có sẵn') RETURNING id", [teamId])).id);
  await pool.query("INSERT INTO san_pham (team_id, ma, ten, nguon, ma_goc, sku) VALUES ($1, 'shop1:v9', 'Món rời', 'pos', NULL, '900')", [teamId]);
  // Một page có bản sao sản phẩm theo page ⇒ ô lưu ý trái hiện (điều kiện `coBanSao`), `cho` vẫn rỗng (không số hiệu mồ côi).
  const pg = String((await one("INSERT INTO page (team_id, page_id, ten) VALUES ($1, 'fb1', 'Page 1') RETURNING id", [teamId])).id);
  await pool.query("INSERT INTO san_pham (team_id, page_id, ma, ten, nguon) VALUES ($1, $2, 'ban-sao-1', 'Bản sao', 'tay')", [teamId, pg]);
  const app = express();
  dungPhanB(app, {
    taoTruyVan: (bc) => taoTruyVanThat(pool, bc), taoTruyVanHeThong: () => taoCongDanhTinh(pool), express,
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
  const dem = async () => Number((await one('SELECT count(*)::int AS n FROM san_pham_goc')).n);
  return { pool, goc0, ve, api, goc, dem };
}
const chu = (x) => x.textContent.replace(/\s+/g, ' ').trim();
const THAN_TAO = JSON.stringify({ maGoc: 'sp-moi-theo-so-hieu', ten: 'Mới', soHieu: '125' });

test('G1 · POST /api/san-pham/goc (tạo gốc) ⇒ 404 dưới quản trị VÀ marketer, san_pham_goc không đổi', async (t) => {
  const o = await dung(t);
  const truoc = await o.dem();
  for (const email of ['qt@x.vn', 'mk@x.vn']) {
    const r = await o.api(await o.ve(email))('/api/san-pham/goc', { method: 'POST', body: THAN_TAO });
    assert.equal(r.status, 404, `${email}: tạo gốc theo số hiệu phải hết cửa`);
  }
  assert.equal(await o.dem(), truoc, 'không dòng nào được ghi');
  assert.equal((await o.pool.query("SELECT 1 FROM san_pham_goc WHERE ma_goc = 'sp-moi-theo-so-hieu'")).rowCount, 0);
});

test('G2 · cửa sửa còn sống: quản trị POST /goc/:id đổi SKU ⇒ 200 + cột sku đổi; marketer ⇒ 403, sku giữ nguyên', async (t) => {
  const o = await dung(t);
  const mkt = await o.api(await o.ve('mk@x.vn'))(`/api/san-pham/goc/${o.goc}`, { method: 'POST', body: JSON.stringify({ sku: '777' }) });
  assert.equal(mkt.status, 403);
  assert.equal((await o.pool.query('SELECT sku FROM san_pham_goc WHERE id = $1', [o.goc])).rows[0].sku, null);
  const qt = await o.api(await o.ve('qt@x.vn'))(`/api/san-pham/goc/${o.goc}`, { method: 'POST', body: JSON.stringify({ sku: '777' }) });
  assert.equal(qt.status, 200);
  assert.equal((await o.pool.query('SELECT sku FROM san_pham_goc WHERE id = $1', [o.goc])).rows[0].sku, '777');
});

test('G3 · gộp còn là cửa tạo gốc DUY NHẤT: GET /gop ⇒ 200; POST /gop gộp món rời thành gốc mới (+1 dòng)', async (t) => {
  const o = await dung(t);
  const qt = o.api(await o.ve('qt@x.vn'));
  assert.equal((await qt('/api/san-pham/gop')).status, 200);
  const truoc = await o.dem();
  const r = await qt('/api/san-pham/gop', { method: 'POST', body: JSON.stringify({ maGoc: 'sp-tu-gop', ten: 'Từ gộp', sku: '900', posMa: ['shop1:v9'] }) });
  assert.equal(r.status, 200);
  assert.equal(await o.dem(), truoc + 1);
  assert.equal((await o.pool.query("SELECT ma_goc FROM san_pham WHERE ma = 'shop1:v9'")).rows[0].ma_goc, 'sp-tu-gop');
});

test('G4 · trang (tĩnh): hết khungTaoGoc · nutTaoGoc · «số hiệu chưa có sản phẩm gốc» · veThem · POST tạo gốc', () => {
  for (const re of [/id="khungTaoGoc"/, /id="nutTaoGoc"/, /số hiệu chưa có\s+sản phẩm gốc/, /function veThem/,
    /goiGhi\('\/api\/san-pham\/goc', \{ method: 'POST'/, /veThem\(/, /async function taoGoc/]) {
    assert.doesNotMatch(HTML, re, `trang còn dấu của lối tạo theo số hiệu: ${re}`);
  }
  assert.match(HTML, /\$\('#nutThem'\)\.onclick = \(\) => veGop\(\)/);
});

test('G5 · trang CHẠY THẬT: bấm «+ Thêm» ⇒ khung «Gộp món POS thành sản phẩm», không ô nhập số hiệu/mã gốc; ô lưu ý có nút Gộp cho quản trị khi `cho` rỗng; marketer không thấy', async (t) => {
  const o = await dung(t);
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: o.goc0, cookie: await o.ve('qt@x.vn'), duong: '/san-pham' });
  assert.ok(m.$('#nutThem'), 'quản trị phải thấy «+ Thêm»');
  await m.$('#nutThem').click(); await m.cho();
  assert.ok(m.goi.some((g) => g.duong === '/api/san-pham/gop'), 'phải đọc gợi ý gộp');
  assert.match(m.$('#phai').textContent, /Gộp món POS thành sản phẩm/);
  assert.equal(m.$('#gSo'), null); assert.equal(m.$('#gMa'), null);
  assert.equal(m.goi.filter((g) => g.phuongThuc === 'POST' && g.duong === '/api/san-pham/goc').length, 0);
  // `cho` rỗng (không còn số hiệu mồ côi) mà vẫn có bản sao theo page ⇒ ô lưu ý hiện; nút Gộp không đòi số hiệu.
  const ds = await o.api(await o.ve('qt@x.vn'))('/api/san-pham/goc');
  assert.ok(ds.j.suaDuoc);
  assert.equal('cho' in ds.j, false, 'GSP2 bỏ danh sách số hiệu khỏi hợp đồng');
  assert.ok(m.$('#nutThem'), 'quản trị vẫn gộp qua + Thêm, không phụ thuộc số hiệu');
  const mk = await moTrang('san-pham/trang/san-pham.html', { goc: o.goc0, cookie: await o.ve('mk@x.vn'), duong: '/san-pham' });
  assert.equal(mk.$('#nutThem'), null, 'marketer không thấy «+ Thêm»');
  assert.equal(mk.$('#moGop'), null, 'marketer không thấy nút Gộp');
  // datKhoGoc vẫn đòi `tao` (nối dây `chay-that.js` còn truyền) — gỡ khỏi danh sách mà quên nối dây là boot ném.
  assert.throws(() => kgoc.datKhoGoc({ ds() {}, cho() {}, dem() {}, sua() {}, bo() {} }), /thiếu hàm: .*tao/);
});
