import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { moTrang } from '../../testkit/dom-gia.js';
import { taoRouterSanPham, datChanDangNhap, datChanVai } from '../../src/ui/san-pham/router.js';
import { datKhoGoc, datPheuNhatKyGoc } from '../../src/ui/san-pham/kho-goc.js';

function duLieu() {
  const g = { id: '9', maGoc: 'gold', ten: 'Gold', marketer: 'Lan' };
  const base = (id, loai, trangThai = 'chua_gan') => ({ pageId: id, pageFb: 'fb-' + id, ten: 'Gold Saudi ' + id,
    marketerPage: 'Minh', shop: { id: '111', market: 'Saudi' }, goc: trangThai === 'cho_doi_soat' ? g : null, trangThai,
    banSao: [{ id: 'b-' + id, ten: '', soAnh: 2, anhDau: '/uploads/gold.png', bac: [{ soLuong: 1, gia: 99, tienTe: 'SAR', bat: true }] }],
    goiY: trangThai === 'chua_gan' ? [{ posMa: '111:' + id, tenMon: '101 - Gold', sku: '101', diem: 1, loai,
      ...(loai === 'goc' ? { goc: g } : loai === 'noi' ? { gocTheoSku: g } : {}) }] : [],
  });
  return { viec: [base('1', 'goc'), base('2', 'noi'), base('3', 'moi'), base('4', '', 'cho_doi_soat')],
    dem: { chuaGan: 3, choDoiSoat: 1, boQua: 0, chuaXong: 4 },
    shopCuaTeam: [{ id: '111', market: 'Saudi' }, { id: '222', market: 'UAE' }], gocCuaTeam: [g] };
}

async function dung(t) {
  const data = duLieu(); const calls = []; const audit = [];
  let failGan = false;
  const noop = async () => ({});
  const cua = Object.fromEntries(['cho', 'tao', 'sua', 'bo', 'chiTiet', 'monChuaGan', 'gan', 'go', 'kienThuc', 'goiYGop', 'gop', 'luuGia', 'ganPage', 'goPage'].map((x) => [x, noop]));
  datKhoGoc({ ...cua, ds: async () => [], dem: async () => ({}), dsChuyen: async (bc) => {
    assert.equal(bc.teamId, 'team1'); return data;
  }, boQuaChuyen: async (_bc, pageId, lyDo) => {
    const v = data.viec.find((v) => v.pageId === pageId); v.trangThai = 'bo_qua'; v.boQua = { lyDo };
    data.dem.chuaXong--; return { pageId, lyDo, soBanSao: 1 };
  }, huyBoQuaChuyen: async (_bc, pageId) => {
    data.viec.find((v) => v.pageId === pageId).trangThai = 'chua_gan'; data.dem.chuaXong++;
    return { pageId };
  } });
  datPheuNhatKyGoc(async (_bc, x) => { audit.push(x); });
  datChanDangNhap((req, res, next) => req.boiCanh ? next() : res.sendStatus(401));
  datChanVai(() => (_req, _res, next) => next());
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { if (req.headers.cookie) req.boiCanh = { teamId: 'team1', nguoiDungId: 'u', vai: [req.headers.cookie === 'mkt' ? 'marketer' : 'quan-tri'] }; next(); });
  // Real transfer routes and permission checks; inject existing composition transports below.
  app.get('/api/san-pham', (_req, res) => res.json({ ok: true, dem: {}, page: [] }));
  app.get('/api/san-pham/gop', (_req, res) => res.json({ ok: true, nhom: [{ sku: '101', mon: [{ posMa: '111:3' }, { posMa: '222:3' }] }] }));
  app.post('/api/san-pham/gop', (req, res) => { calls.push(['gop', req.body]); res.json({ ok: true, goc: { id: '10', maGoc: 'new-gold', ten: 'New Gold' } }); });
  app.post('/api/san-pham/goc/:id/mon', (req, res) => { calls.push(['noi', req.body]); res.json({ ok: true }); });
  app.post('/api/san-pham/goc/:id/page', (req, res) => {
    calls.push(['gan', req.body]);
    if (failGan) { failGan = false; return res.status(409).json({ ok: false, thongDiep: 'Shop đã thay đổi' }); }
    const v = data.viec.find((v) => v.pageId === req.body.pageId); v.trangThai = 'cho_doi_soat'; v.goc = { ten: 'Gold' };
    res.json({ ok: true, page: { ten: v.ten } });
  });
  app.use(taoRouterSanPham());
  const sv = http.createServer(app); await new Promise((r) => sv.listen(0, '127.0.0.1', r));
  t.after(() => { sv.close(); datKhoGoc(null); datPheuNhatKyGoc(null); });
  const goc = 'http://127.0.0.1:' + sv.address().port;
  return { data, calls, audit, goc, fail: () => { failGan = true; }, mo: () => moTrang('san-pham/trang/san-pham.html', { goc, cookie: 'qt', duong: '/san-pham?xem=chuyen' }) };
}
const the = (m, id) => m.$('#dsChuyen').querySelectorAll('[data-chuyen]').find((x) => x.dataset.chuyen === id);

test('GSP2 · route thật chặn vai, ghi lý do + nhật ký, không bị :id nuốt', async (t) => {
  const d = await dung(t);
  const get = (cookie) => fetch(d.goc + '/api/san-pham/chuyen', { headers: { cookie } });
  assert.equal((await get('')).status, 401);
  assert.equal((await get('mkt')).status, 403);
  assert.equal((await get('qt')).status, 200);
  const m = await d.mo();
  assert.match(m.$('#oDuLieu').textContent, /4 page chưa chuyển xong/);
  assert.match(the(m, '1').textContent, /Marketer page: Minh → Lan/);
  assert.equal(the(m, '4').querySelector('[data-gan]'), null);
  const x = the(m, '1'); x.querySelector('[data-lydo]').value = 'Thôi bán';
  await x.querySelector('[data-boqua]').click(); await m.cho();
  assert.match(the(m, '1').textContent, /Thôi bán/);
  assert.equal(d.audit[0].sau.lyDo, 'Thôi bán');
  await the(m, '1').querySelector('[data-huy]').click(); await m.cho();
  assert.equal(d.data.viec[0].trangThai, 'chua_gan');
});

test('GSP2 · gắn trực tiếp và nối rồi gắn; gắn không làm bộ đếm về 0', async (t) => {
  const d = await dung(t); const m = await d.mo();
  await the(m, '1').querySelector('[data-gan]').click(); await m.cho();
  await the(m, '2').querySelector('[data-gan]').click(); await m.cho();
  assert.deepEqual(d.calls.map((x) => x[0]), ['gan', 'noi', 'gan']);
  assert.equal(m.goi.filter((x) => x.phuongThuc === 'POST').length, 3, 'không thêm đường ghi/đẩy bản chép sau gắn');
  assert.equal(d.data.dem.chuaXong, 4);
});

test('GSP2 · gộp đủ món mọi shop; gắn hỏng nói rõ và thử lại chỉ gắn', async (t) => {
  const d = await dung(t); const m = await d.mo(); d.fail();
  await the(m, '3').querySelector('[data-gan]').click(); await m.cho();
  assert.match(the(m, '3').textContent, /Sản phẩm đã tạo, chưa gắn page.*Shop đã thay đổi/);
  assert.deepEqual(d.calls[0][1].posMa, ['111:3', '222:3']);
  await the(m, '3').querySelector('[data-gan]').click(); await m.cho();
  assert.deepEqual(d.calls.map((x) => x[0]), ['gop', 'gan', 'gan']);
});

test('GSP2 · không có shop/gợi ý: chọn tay, báo thiếu shop trước khi ghi, bộ lọc giữ trên URL', async (t) => {
  const d = await dung(t);
  const v = d.data.viec[0]; v.shop = null; v.goiY = [];
  const m = await d.mo();
  let x = the(m, '1');
  const g = x.querySelector('[data-goc-tay]'); g.value = '9'; await g.onchange();
  x = the(m, '1'); await x.querySelector('[data-gan]').click(); await m.cho();
  assert.match(the(m, '1').textContent, /Chọn shop POS/); assert.equal(d.calls.length, 0);
  const shop = the(m, '1').querySelector('[data-shop]'); shop.value = '111'; await shop.onchange();
  await the(m, '1').querySelector('[data-gan]').click(); await m.cho();
  assert.deepEqual(d.calls[0], ['gan', { pageId: '1', shopId: '111' }]);
  m.$('#locChuyen').value = 'cho_doi_soat'; await m.$('#locChuyen').onchange();
  assert.match(m.location.search, /trangThai=cho_doi_soat/);
  assert.equal(m.$('#dsChuyen').querySelectorAll('[data-chuyen]').length, 2);
});

test('GSP2 · làm mới danh mục sau thao tác từ tab Page cũng làm mới bộ đếm chuyển', async (t) => {
  const d = await dung(t); const m = await d.mo();
  d.data.dem.chuaXong = 5;
  await m.ctx.taiGoc();
  assert.match(m.$('#oDuLieu').textContent, /5 page chưa chuyển xong/);
  d.data.dem.chuaXong = 0;
  await m.ctx.taiGoc();
  assert.equal(m.$('#moBanSao'), null);
});
