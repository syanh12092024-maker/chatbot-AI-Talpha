// PHIẾU VE8a · «GỘP MÓN POS THÀNH SẢN PHẨM» ngay trong màn Sản phẩm (bản vẽ 2a′) — tầng giao diện: vai + nhật ký
// của lượt gộp, đường router, và trang CHẠY THẬT (vm + DOM giả dùng chung) gọi máy chủ thật (vai-b) với kho gốc giả.
// Hành vi SQL (nhóm theo số hiệu/tên, một giao dịch, từ chối không để lại gì): `test/ve8a-gop-mon.test.mjs`.
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
const goc = await import('../../src/ui/san-pham/kho-goc.js');
const { HANH_DONG } = await import('../../src/audit/hanh-dong.js');
const { moTrang } = await import('../../testkit/dom-gia.js');

const MON = (posMa, thiTruong, tenPos, sku, tonKho = 3) => ({ posMa, tenPos, sku, shopId: posMa.split(':')[0], thiTruong, tonKho });
const NHOM = () => [
  { khoa: 'goc:9', loai: 'noi', sku: '200', gocId: '9', maGoc: 'kreain', ten: 'Kreain', soShop: 2, tenLech: [], canh: [],
    mon: [MON('111:e', 'Saudi', '200 - Kreain', '200'), MON('222:e', 'Kuwait', '200 - Kreain', '200')], lyDo: 'SKU 200 đã là sản phẩm «Kreain» — 2 món chưa nối' },
  { khoa: 'sku:125', loai: 'moi', sku: '125', ten: 'Fitgum Acai Berry', maGocDeXuat: 'fitgum-acai-berry', soShop: 2,
    tenLech: ['Fitgum Acai Berry', 'Fitgum Acai Berry L'], canh: ['1 món chưa có SKU (kéo lại danh mục để lấy) — tạm theo số đầu tên'],
    mon: [MON('111:a', 'Saudi', '125 - Fitgum Acai Berry', '125'), MON('222:b', 'Kuwait', '125 - Fitgum Acai Berry', '125'), MON('222:c', 'Kuwait', '125 - Fitgum Acai Berry L', null)],
    lyDo: 'Cùng SKU 125 ở 2 shop' },
];
function khoGia() {
  const goiGop = []; const goiGan = [];
  const ham = async () => ({});
  return {
    goiGop, goiGan,
    cua: {
      ds: async () => [], cho: async () => ({ cho: [{ soHieu: '125', ten: ['Fitgum Acai Berry'], soBienThe: 3 }], khongCoSoHieu: 0 }),
      dem: async () => ({ tong: 5, coGia: 0, chuaCoGia: 5, nhapTay: 0 }), tao: ham, sua: ham, bo: ham,
      chiTiet: async (_b, id) => (id === '77' ? { id: '77', maGoc: 'fitgum-acai-berry', ten: 'Fitgum Acai Berry', soHieu: '125', kienThuc: {}, thiTruong: [], page: [] } : null),
      monChuaGan: async () => [], go: ham, kienThuc: ham,
      gan: async (_b, id, posMa) => { goiGan.push([String(id), posMa]); return { maGoc: 'kreain', posMa, shopId: posMa.split(':')[0], daCo: false }; },
      goiYGop: async () => ({ dem: { shopTong: 7, shopBat: 1, shopDaKeo: 2, monPos: 5, monChuaGan: 5, monChuaSku: 1, soGoc: 1, banSao: 0, banSaoChuaNoi: 0 }, nhom: NHOM() }),
      dsChuyen: async () => ({ viec: [], dem: { chuaXong: 1 }, shopCuaTeam: [], gocCuaTeam: [] }),
      luuGia: ham, ganPage: ham, goPage: ham,
      gop: async (_b, than) => { goiGop.push(than); return { id: '77', maGoc: than.maGoc, ten: than.ten, sku: than.sku, marketer: than.marketer || '', posMa: than.posMa, soBienThe: than.posMa.length }; },
    },
  };
}

async function dungThu() {
  const mk = await bam('matkhau1');
  const { kho, taoTruyVan } = dungCongGia({
    // LL15d: marketer chọn từ hồ sơ HRM ⇒ tài khoản marketer mang mã NV (Ngọc · NV5).
    nguoi_dung: [{ id: 'u1', email: 'qt@talpha.vn', mat_khau_hash: mk, ten: 'qt', hoat_dong: true, ma_nv: null },
      { id: 'u2', email: 'mkt@talpha.vn', mat_khau_hash: mk, ten: 'Ngọc', hoat_dong: true, ma_nv: 'NV5' }],
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    vai: [{ id: 'v1', ma: 'quan-tri' }, { id: 'v2', ma: 'marketer' }],
    thanh_vien_team: [{ id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' }, { id: 'tv2', nguoi_dung_id: 'u2', team_id: 't1', vai_id: 'v2' }],
  });
  const k = khoGia();
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express, khoSanPhamGoc: k.cua });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const goc0 = `http://127.0.0.1:${sv.address().port}`;
  const vao = async (email) => (await fetch(`${goc0}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, matKhau: 'matkhau1' }) })).headers.get('set-cookie').split(';')[0];
  return { goc: goc0, sv, kho, k, qt: await vao('qt@talpha.vn'), mkt: await vao('mkt@talpha.vn') };
}
const theNhom = (m, khoa) => m.$('#dsGop').querySelectorAll('[data-nhom]').find((x) => x.dataset.nhom === khoa);

test('G1 · quản trị mở «Gộp món POS» ngay trong màn Sản phẩm: bốn con số + nhóm gợi ý đọc từ máy chủ, không đoán', async (t) => {
  const d = await dungThu();
  t.after(() => d.sv.close());
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: d.goc, cookie: d.qt, duong: '/san-pham?xem=gop' });
  assert.ok(m.goi.some((g) => g.duong === '/api/san-pham/gop'), 'phải đọc gợi ý từ máy chủ');
  assert.match(m.$('#phai').textContent, /Gộp món POS thành sản phẩm/);
  const so = m.$('#demGop').textContent.replace(/\s+/g, ' ');
  assert.match(so, /Shop POS = thị trường\s*7/);
  assert.match(so, /Shop đã kéo danh mục\s*2\/7/);
  assert.match(so, /Món chưa thuộc sản phẩm\s*5/);
  assert.match(m.$('#phai').textContent, /Mới kéo danh mục 2\/7 shop/);
  assert.match(m.$('#phai').textContent, /1 món chưa có SKU/);
  assert.deepEqual(m.$('#dsGop').querySelectorAll('[data-nhom]').map((x) => x.dataset.nhom), ['goc:9', 'sku:125']);
  const n125 = theNhom(m, 'sku:125').textContent.replace(/\s+/g, ' ');
  assert.match(n125, /Cùng SKU 125 ở 2 shop · tên lệch giữa các shop: Fitgum Acai Berry \/ Fitgum Acai Berry L — người xem/);
  assert.match(n125, /1 món chưa có SKU/);
  assert.match(n125, /Kuwait 222:b 125 125 - Fitgum Acai Berry 3/);
  assert.match(n125, /Kuwait 222:c chưa có 125 - Fitgum Acai Berry L/);
});

test('G2 · gộp: bỏ chọn món lạ + sửa tên + gán marketer ⇒ MỘT lượt POST đúng món/tên/mã/SKU/marketer; xong ⇒ «Đã gộp» + mở sản phẩm', async (t) => {
  const d = await dungThu();
  t.after(() => d.sv.close());
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: d.goc, cookie: d.qt, duong: '/san-pham?xem=gop' });
  const the = theNhom(m, 'sku:125');
  the.querySelectorAll('[data-chon]').find((c) => c.dataset.chon === '222:c').checked = false;
  the.querySelector('[data-ten]').value = 'Fitgum Acai Berry 60 viên';
  // LL15d: ô marketer là ô CHỌN tài khoản marketer có mã NV — gửi mã, máy chủ tra tên.
  assert.deepEqual(the.querySelector('[data-mk]').querySelectorAll('option').map((o) => o.textContent.trim()), ['— gán sau —', 'Ngọc · NV5']);
  the.querySelector('[data-mk]').value = 'NV5';
  await the.querySelector('[data-gop]').click();
  await m.cho();
  assert.deepEqual(d.k.goiGop, [{ maGoc: 'fitgum-acai-berry', ten: 'Fitgum Acai Berry 60 viên', sku: '125', marketer: 'Ngọc', marketerMaNv: 'NV5', posMa: ['111:a', '222:b'] }]);
  const sau = theNhom(m, 'sku:125');
  assert.match(sau.textContent, /Đã gộp/);
  assert.equal(sau.querySelector('[data-gop]'), null, 'gộp xong thì hết nút gộp');
  await sau.querySelector('[data-mo-goc]').click();
  await m.cho();
  assert.ok(m.goi.some((g) => g.duong === '/api/san-pham/goc/77/chi-tiet'), 'mở đúng sản phẩm vừa gộp');
  assert.match(m.$('#phai').textContent, /Fitgum Acai Berry/);
});

test('G3 · nhóm «SKU đã là sản phẩm» ⇒ NỐI từng món đã chọn vào đúng sản phẩm đó (không tạo sản phẩm mới)', async (t) => {
  const d = await dungThu();
  t.after(() => d.sv.close());
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: d.goc, cookie: d.qt, duong: '/san-pham?xem=gop' });
  const the = theNhom(m, 'goc:9');
  assert.equal(the.querySelector('[data-ten]'), null, 'nối vào sản phẩm có sẵn thì không đặt tên lại');
  await the.querySelector('[data-noi]').click();
  await m.cho();
  assert.deepEqual(d.k.goiGan, [['9', '111:e'], ['9', '222:e']]);
  assert.deepEqual(d.k.goiGop, []);
  assert.match(theNhom(m, 'goc:9').textContent, /Đã nối/);
});

test('G4 · marketer XEM được gợi ý nhưng không có ô chọn/nút; gọi thẳng cửa gộp ⇒ 403, không ghi', async (t) => {
  const d = await dungThu();
  t.after(() => d.sv.close());
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: d.goc, cookie: d.mkt, duong: '/san-pham?xem=gop' });
  assert.match(m.$('#phai').textContent, /Chỉ quản trị gộp/);
  assert.equal(m.$('#dsGop').querySelectorAll('[data-chon], [data-gop], [data-noi]').length, 0);
  const r = await fetch(`${d.goc}/api/san-pham/gop`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: d.mkt },
    body: JSON.stringify({ maGoc: 'x', ten: 'x', posMa: ['111:a'] }) });
  assert.equal(r.status, 403);
  assert.deepEqual(d.k.goiGop, []);
});

test('G5 · lối vào: ô lưu ý bên trái có «Gộp món POS thành sản phẩm →» mở đúng khung gộp (URL giữ ?xem=gop)', async (t) => {
  const d = await dungThu();
  t.after(() => d.sv.close());
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: d.goc, cookie: d.qt, duong: '/san-pham' });
  const nut = m.$('#moGop');
  assert.ok(nut, 'thiếu lối vào gộp ở ô lưu ý');
  await nut.click();
  await m.cho();
  assert.match(m.location.search, /xem=gop/);
  assert.match(m.$('#phai').textContent, /Gợi ý: có thể là cùng một sản phẩm/);
});

test('G6 · tầng giao diện: gộp chỉ quản trị; MỘT dòng nhật ký «tạo sản phẩm gốc» kể đủ món đã gộp', async () => {
  const k = khoGia();
  const nk = [];
  goc.datKhoGoc(k.cua);
  goc.datPheuNhatKyGoc(async (_b, g) => { nk.push(g); });
  const bc = (vai) => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [vai] });
  await assert.rejects(() => goc.gopMonThanhGoc(bc(VAI.MARKETER), { maGoc: 'x', posMa: ['111:a'] }), (e) => e.name === 'LoiThieuVai');
  assert.equal(nk.length, 0);
  await goc.gopMonThanhGoc(bc(VAI.QUAN_TRI), { maGoc: 'fitgum', ten: 'Fitgum', sku: '125', marketer: 'Ngọc', posMa: ['111:a', '222:b'] });
  assert.equal(nk.length, 1);
  assert.equal(nk[0].hanhDong, HANH_DONG.TAO_SAN_PHAM_GOC);
  assert.match(nk[0].ghiChu, /gộp 2 món POS thành sản phẩm gốc "fitgum" \(SKU 125\) · marketer Ngọc: 111:a, 222:b/);
  const r = await goc.goiYGop(bc(VAI.MARKETER));
  assert.equal(r.suaDuoc, false);
  assert.equal((await goc.goiYGop(bc(VAI.QUAN_TRI))).suaDuoc, true);
  const thieu = { ...k.cua }; delete thieu.gop;
  assert.throws(() => goc.datKhoGoc(thieu), /thiếu hàm: gop/);
});

test('G7 · router: GET + POST /api/san-pham/gop đứng TRƯỚC /api/san-pham/:id (đứng sau là bị bắt làm mã page)', async () => {
  const { taoRouterSanPham } = await import('../../src/ui/san-pham/router.js');
  const ds = taoRouterSanPham().stack.filter((l) => l.route).map((l) => `${Object.keys(l.route.methods)[0].toUpperCase()} ${l.route.path}`);
  for (const d of ['GET /api/san-pham/gop', 'POST /api/san-pham/gop']) {
    assert.ok(ds.indexOf(d) >= 0, `thiếu đường ${d}`);
    assert.ok(ds.indexOf(d) < ds.indexOf('GET /api/san-pham/:id'), `${d} đứng sau /api/san-pham/:id`);
  }
});
