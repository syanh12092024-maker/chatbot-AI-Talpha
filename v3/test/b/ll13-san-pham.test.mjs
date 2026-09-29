// PHIẾU LL13 · tầng GIAO DIỆN của «sản phẩm là lõi»: vai + nhật ký của gắn/gỡ món POS, đường của router, trang.
// Hành vi SQL (thị trường theo shop, một món một sản phẩm, kẹp team): `test/ll13-san-pham-goc.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
const goc = await import('../../src/ui/san-pham/kho-goc.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const { HANH_DONG } = await import('../../src/audit/hanh-dong.js');

const bc = (vai) => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [vai] });
const CUA = () => ({
  ds: async () => [], cho: async () => ({ cho: [], khongCoSoHieu: 0 }), dem: async () => ({}),
  tao: async () => ({}), sua: async () => ({}), bo: async () => ({}),
  chiTiet: async (_b, id) => (id === 'g1' ? { id: 'g1', maGoc: 'fitgum', thiTruong: [], page: [] } : null),
  monChuaGan: async () => [{ posMa: '111:z', ten: 'X', shopId: '111', thiTruong: 'Saudi' }],
  gan: async (_b, id, posMa) => ({ maGoc: 'fitgum', posMa, shopId: posMa.split(':')[0], daCo: false }),
  go: async (_b, id, posMa) => ({ maGoc: 'fitgum', posMa, shopId: posMa.split(':')[0] }),
});

test('U1 · kho gốc đòi ĐỦ mười hàm — thiếu hàm của LL13 là từ chối cả cụm, không nửa cửa', () => {
  const thieu = CUA(); delete thieu.gan;
  assert.throws(() => goc.datKhoGoc(thieu), /thiếu hàm: gan/);
  assert.doesNotThrow(() => goc.datKhoGoc(CUA()));
});

test('U2 · gắn/gỡ món POS: chỉ quản trị; mỗi lượt để MỘT dòng nhật ký đúng mã; đọc chi tiết mọi vai của màn', async () => {
  const nhatKy = [];
  goc.datKhoGoc(CUA());
  goc.datPheuNhatKyGoc(async (_b, g) => { nhatKy.push(g); });
  await assert.rejects(() => goc.ganMonPos(bc(VAI.MARKETER), 'g1', '111:z'), (e) => e.name === 'LoiThieuVai');
  assert.equal(nhatKy.length, 0, 'bị chặn thì không ghi gì');
  await goc.ganMonPos(bc(VAI.QUAN_TRI), 'g1', '111:z');
  await goc.goMonPos(bc(VAI.QUAN_TRI), 'g1', '111:z');
  assert.deepEqual(nhatKy.map((x) => x.hanhDong), [HANH_DONG.GAN_MON_POS_GOC, HANH_DONG.GO_MON_POS_GOC]);
  assert.match(nhatKy[0].ghiChu, /111:z.*shop 111.*fitgum/);
  const ct = await goc.chiTietGoc(bc(VAI.MARKETER), 'g1');
  assert.equal(ct.suaDuoc, false, 'marketer đọc được, không sửa được');
  assert.equal(ct.monChuaGan.length, 1);
  assert.equal(await goc.chiTietGoc(bc(VAI.QUAN_TRI), 'khong-co'), null);
});

test('U3 · router: ba đường LL13 đứng TRƯỚC `/api/san-pham/:id` (đứng sau là bị bắt làm mã page)', async () => {
  const { taoRouterSanPham } = await import('../../src/ui/san-pham/router.js');
  const ds = taoRouterSanPham().stack.filter((l) => l.route).map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);
  const viTri = (d) => ds.indexOf(d);
  for (const d of ['GET /api/san-pham/goc/:id/chi-tiet', 'POST /api/san-pham/goc/:id/mon', 'POST /api/san-pham/goc/:id/mon/go']) {
    assert.ok(viTri(d) >= 0, `thiếu đường ${d}`);
    assert.ok(viTri(d) < viTri('GET /api/san-pham/:id'), `${d} đứng sau /api/san-pham/:id`);
  }
});

test('U4 · trang: khối «Sản phẩm» đứng TRƯỚC bảng theo page; mở chi tiết + gắn/gỡ gọi đúng đường', () => {
  const html = fs.readFileSync(new URL('../../src/ui/san-pham/trang/san-pham.html', import.meta.url), 'utf8');
  assert.ok(html.indexOf('id="tieuGoc">Sản phẩm</h2>') > 0 && html.indexOf('id="tieuGoc"') < html.indexOf('id="tieuDe"'),
    'sản phẩm là lõi — khối sản phẩm phải đứng trên bảng «Page có sản phẩm»');
  assert.match(html, /'\/chi-tiet'\)/);
  assert.match(html, /'\/mon', \{ method: 'POST'/);
  assert.match(html, /'\/mon\/go', \{ method: 'POST'/);
  assert.match(html, /<th scope="col" class="num">Thị trường<\/th>/);
});

test('U5 · UI.button đổi khoá `data` camelCase ⇒ kebab (`moGoc` ⇒ `data-mo-goc`) — nút gắn bằng `[data-mo-goc]` mới bấm được', () => {
  const js = fs.readFileSync(new URL('../../src/ui/chung/ui.js', import.meta.url), 'utf8');
  const win = {}; new Function('window', 'document', js)(win, {});
  const html = win.UI.button('Xem', { data: { moGoc: '7', live: 'x', 'go-mon': '1:a' } });
  assert.match(html, / data-mo-goc="7"/);
  assert.match(html, / data-live="x"/, 'khoá chữ thường giữ nguyên');
  assert.match(html, / data-go-mon="1:a"/, 'khoá đã kebab giữ nguyên');
});
