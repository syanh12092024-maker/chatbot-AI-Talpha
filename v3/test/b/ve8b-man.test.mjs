// PHIẾU VE8b · màn Sản phẩm: GIÁ THEO THỊ TRƯỜNG sửa tại chỗ · MARKETER của sản phẩm · GẮN/GỠ PAGE — trang CHẠY THẬT (vm +
// DOM giả dùng chung) gọi máy chủ thật (vai-b) với kho gốc giả; tầng giao diện: vai, nhật ký, bọc lỗi của `saveProduct`.
// Hành vi SQL (bốn cột page · marketer kéo page · chỉ-giá · lượt kéo POS không đè giá): `test/ve8b-gia-page.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

const CHI_TIET = () => ({
  // LL15d · 02/10: marketer gắn mã NV HRM (NV8 = tài khoản «Lan») — marketer chỉ thấy sản phẩm gán đúng mã mình.
  id: '77', maGoc: 'fitgum', ten: 'Fitgum Acai Berry', soHieu: '125', sku: '125', marketer: 'Lan', marketerMaNv: 'NV8', kienThuc: {},
  thiTruong: [
    { shopId: '111', thiTruong: 'Saudi', coGia: true, lechGia: false, gia: [], page: ['p1'],
      mon: [{ id: '5', version: '901', posMa: '111:a', ten: '125 - Fitgum Acai Berry', tonKho: 40, hetHang: false, giaTay: true,
        goiGia: [{ soLuong: 1, gia: 89, tienTe: 'SAR', giaGoc: null, khuyenMai: '', phiShip: null, mienShip: null, bat: true, nhan: 'Mua 1' },
          { soLuong: 2, gia: 159, tienTe: 'SAR', giaGoc: 178, khuyenMai: 'Tặng 1', phiShip: null, mienShip: true, bat: true, nhan: 'Mua 2' }] }] },
    { shopId: '222', thiTruong: 'Kuwait', coGia: false, lechGia: false, gia: [], page: [],
      mon: [{ id: '6', version: '902', posMa: '222:b', ten: '125 - Fitgum Acai Berry', tonKho: 12, hetHang: false, giaTay: false, goiGia: [] }] },
  ],
  page: [{ id: 'p1', pageId: 'fb-1', ten: 'Fitgum KSA', qua: ['ca_page'], shop: ['111'] }],
});
function khoGia({ loiGia = null } = {}) {
  const goi = { gia: [], gan: [], go: [], sua: [] };
  const ham = async () => ({});
  return {
    goi,
    cua: {
      ds: async () => [{ id: '77', maGoc: 'fitgum', ten: 'Fitgum Acai Berry', soHieu: '125', sku: '125', marketer: 'Lan', marketerMaNv: 'NV8', soBienThe: 2, soThiTruong: 2, soPage: 1 }],
      cho: async () => ({ cho: [], khongCoSoHieu: 0 }), dem: async () => ({ tong: 2, coGia: 1, chuaCoGia: 1, nhapTay: 0 }),
      tao: ham, bo: ham, monChuaGan: async () => [], gan: ham, go: ham, kienThuc: ham, goiYGop: async () => ({ dem: {}, nhom: [] }), gop: ham,
      sua: async (_b, id, than) => { goi.sua.push([id, than]); return { id, maGoc: 'fitgum', ten: 'Fitgum Acai Berry', ...than, soPageTheoMarketer: 1 }; },
      chiTiet: async (_b, id) => (id === '77' ? CHI_TIET() : null),
      luuGia: async (_b, id, posMa, t) => {
        if (loiGia) throw loiGia;
        goi.gia.push([id, posMa, t]); return { saved: true, dongBo: { ok: true, page: [{ pageId: 'fb-1' }] } };
      },
      ganPage: async (_b, id, t) => { goi.gan.push([id, t]); return { pageId: t.pageId, pageFb: 'fb-9', ten: 'Fitgum Kuwait', maGoc: 'fitgum', shopId: t.shopId, thiTruong: 'Kuwait', marketer: 'Lan', soBacGia: 0, truoc: {} }; },
      goPage: async (_b, id, pageId) => { goi.go.push([id, pageId]); return { pageId, pageFb: 'fb-1', ten: 'Fitgum KSA', maGoc: 'fitgum' }; },
    },
  };
}
async function dungThu(opt) {
  const mk = await bam('matkhau1');
  const { taoTruyVan } = dungCongGia({
    // LL15d: marketer CHỌN từ hồ sơ HRM ⇒ hai tài khoản marketer mang mã NV (Lan · Minh); quản trị tạo tay, không mã.
    nguoi_dung: [{ id: 'u1', email: 'qt@talpha.vn', mat_khau_hash: mk, ten: 'qt', hoat_dong: true, ma_nv: null },
      { id: 'u2', email: 'mkt@talpha.vn', mat_khau_hash: mk, ten: 'Lan', hoat_dong: true, ma_nv: 'NV8' },
      { id: 'u3', email: 'minh@talpha.vn', mat_khau_hash: mk, ten: 'Minh', hoat_dong: true, ma_nv: 'NV9' }],
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    vai: [{ id: 'v1', ma: 'quan-tri' }, { id: 'v2', ma: 'marketer' }],
    thanh_vien_team: [{ id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' }, { id: 'tv2', nguoi_dung_id: 'u2', team_id: 't1', vai_id: 'v2' },
      { id: 'tv3', nguoi_dung_id: 'u3', team_id: 't1', vai_id: 'v2' }],
    page: [
      { id: 'p1', team_id: 't1', page_id: 'fb-1', ten: 'Fitgum KSA', thi_truong: 'Saudi', san_pham_goc_ma: 'fitgum', bot_ai_bat: false },
      { id: 'p9', team_id: 't1', page_id: 'fb-9', ten: 'Fitgum Kuwait', thi_truong: '', bot_ai_bat: false },
    ],
  });
  const k = khoGia(opt);
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express, khoSanPhamGoc: k.cua });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const g = `http://127.0.0.1:${sv.address().port}`;
  const vao = async (email) => (await fetch(`${g}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, matKhau: 'matkhau1' }) })).headers.get('set-cookie').split(';')[0];
  return { goc: g, sv, k, qt: await vao('qt@talpha.vn'), mkt: await vao('mkt@talpha.vn') };
}
const khung = (m, posMa) => m.$('#thanTab').querySelectorAll('[data-gia-mon]').find((x) => x.dataset.giaMon === posMa);

test('S1 · «Theo thị trường»: bảng giá SỬA ĐƯỢC tại chỗ — đổi giá, thêm bậc, bỏ bậc ⇒ MỘT lượt POST đúng món/phiên bản/bậc', async (t) => {
  const d = await dungThu();
  t.after(() => d.sv.close());
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: d.goc, cookie: d.qt, duong: '/san-pham?sp=77&tab=thi-truong' });
  const kh = khung(m, '111:a');
  assert.ok(kh, 'thiếu bảng giá của món Saudi');
  assert.equal(kh.querySelectorAll('[data-dong-bac]').length, 2);
  assert.doesNotMatch(m.$('#phai').textContent, /Vận hành/, 'không còn lối sang màn riêng để nhập giá');
  kh.querySelectorAll('[data-dong-bac]')[0].querySelector('[data-k="gia"]').value = '95';
  await kh.querySelector('[data-them-bac]').click();
  const k2 = khung(m, '111:a');
  const dong = k2.querySelectorAll('[data-dong-bac]');
  assert.equal(dong.length, 3, 'thêm bậc giữ nguyên hai bậc cũ (kể cả giá vừa gõ)');
  assert.equal(dong[0].querySelector('[data-k="gia"]').value, '95');
  assert.deepEqual([dong[2].querySelector('[data-k="soLuong"]').value, dong[2].querySelector('[data-k="tienTe"]').value], ['3', 'SAR']);
  dong[2].querySelector('[data-k="gia"]').value = '219';
  dong[2].querySelector('[data-k="nhan"]').value = 'Mua 3';
  await dong[1].querySelector('[data-bo-bac]').click();
  await khung(m, '111:a').querySelector('[data-luu-gia]').click();
  await m.cho();
  assert.equal(d.k.goi.gia.length, 1);
  const [id, posMa, than] = d.k.goi.gia[0];
  assert.deepEqual([id, posMa, than.version], ['77', '111:a', '901']);
  assert.deepEqual(than.offers.map((o) => [o.nhan, o.so_luong, o.price, o.tien_te, o.mien_ship, o.bat]),
    [['Mua 1', 1, 95, 'SAR', null, true], ['Mua 3', 3, 219, 'SAR', null, true]]);
  assert.match(khung(m, '111:a').textContent, /Đã lưu 2 bậc giá · đẩy bản chép sang 1 page/);
});

test('S2 · thị trường chưa có giá nói thẳng; marketer của sản phẩm hiện ở thị trường (không còn «chưa có nguồn»)', async (t) => {
  const d = await dungThu();
  t.after(() => d.sv.close());
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: d.goc, cookie: d.qt, duong: '/san-pham?sp=77&tab=thi-truong' });
  assert.match(m.$('#thanTab').textContent.replace(/\s+/g, ' '), /Marketer\s*Lan/);
  await m.$('#thanTab').querySelectorAll('[data-tt]').find((b) => b.dataset.tt === '222').click();
  await m.cho();
  assert.match(khung(m, '222:b').textContent, /Chưa có bậc giá — page gắn vào sản phẩm ở thị trường này chưa báo giá được/);
});

// LL15d · 02/10: ô marketer là ô CHỌN từ hồ sơ HRM (CR-28-09c), không gõ tay — gửi mã NV, máy chủ tra tên từ tài khoản.
test('S3 · marketer của sản phẩm CHỌN ở tab Chung từ hồ sơ HRM ⇒ POST {marketerMaNv}; tên lấy từ tài khoản; màn nói page đổi theo', async (t) => {
  const d = await dungThu();
  t.after(() => d.sv.close());
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: d.goc, cookie: d.qt, duong: '/san-pham?sp=77' });
  assert.equal(m.$('#spMk').value, 'NV8');
  m.$('#spMk').value = 'NV9';
  await m.$('#nutLuuMk').click();
  await m.cho();
  assert.deepEqual(d.k.goi.sua, [['77', { marketer: 'Minh', marketerMaNv: 'NV9' }]]);
  assert.match(m.$('#tbMk').textContent, /Đã lưu marketer «Minh» · 1 page đổi theo/);
});

test('S4 · «Page đang bán»: gắn page = chọn page + thị trường ⇒ POST {pageId, shopId}; thị trường chưa giá ⇒ cảnh báo; gỡ page ⇒ POST', async (t) => {
  const d = await dungThu();
  t.after(() => d.sv.close());
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: d.goc, cookie: d.qt, duong: '/san-pham?sp=77&tab=page' });
  await m.$('#moGan').click();
  m.$('#timPageGan').value = 'kuwait';
  m.$('#timPageGan').oninput();
  await m.cho();
  assert.ok(m.goi.some((g) => g.duong.startsWith('/api/page-ds?tim=kuwait')));
  await m.$('#khungGan').querySelectorAll('[data-chon-page]').find((b) => b.dataset.chonPage === 'p9').click();
  await m.$('#khungGan').querySelectorAll('[data-chon-shop]').find((b) => b.dataset.chonShop === '222').click();
  assert.match(m.$('#khungGan').textContent, /Thị trường này CHƯA có bậc giá/);
  await m.$('#nutGanPage').click();
  await m.cho();
  assert.deepEqual(d.k.goi.gan, [['77', { pageId: 'p9', shopId: '222' }]]);
  assert.match(m.$('#tbSp').textContent, /Đã gắn «Fitgum Kuwait»[\s\S]*CHƯA có bậc giá/);
  await m.$('#thanTab').querySelectorAll('[data-go-page]').find((b) => b.dataset.goPage === 'p1').click();
  await m.cho();
  assert.deepEqual(d.k.goi.go, [['77', 'p1']]);
});

test('S5 · marketer (vai chỉ xem): ô giá khoá, không nút thêm/lưu, không gắn/gỡ page, không đổi marketer', async (t) => {
  const d = await dungThu();
  t.after(() => d.sv.close());
  const m = await moTrang('san-pham/trang/san-pham.html', { goc: d.goc, cookie: d.mkt, duong: '/san-pham?sp=77&tab=thi-truong' });
  const kh = khung(m, '111:a');
  assert.ok(kh.querySelectorAll('[data-k]').every((o) => o.disabled), 'ô giá phải khoá với vai chỉ xem');
  assert.equal(kh.querySelectorAll('[data-luu-gia], [data-them-bac], [data-bo-bac]').length, 0);
  const r = await fetch(`${d.goc}/api/san-pham/goc/77/gia`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: d.mkt },
    body: JSON.stringify({ posMa: '111:a', version: '1', offers: [] }) });
  assert.equal(r.status, 403);
  const m2 = await moTrang('san-pham/trang/san-pham.html', { goc: d.goc, cookie: d.mkt, duong: '/san-pham?sp=77&tab=page' });
  assert.equal(m2.$('#moGan'), null);
  assert.equal(m2.$('#thanTab').querySelectorAll('[data-go-page]').length, 0);
  assert.deepEqual([d.k.goi.gia.length, d.k.goi.gan.length], [0, 0]);
});

test('S6 · lỗi của saveProduct (chỉ `status`, không `ma`) ⇒ router trả ĐÚNG 409 kèm lời, không thành 500', async (t) => {
  const loi = Object.assign(new Error('Sản phẩm đã đổi; tải lại trước khi lưu'), { status: 409 });
  const d = await dungThu({ loiGia: loi });
  t.after(() => d.sv.close());
  const r = await fetch(`${d.goc}/api/san-pham/goc/77/gia`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: d.qt },
    body: JSON.stringify({ posMa: '111:a', version: '1', offers: [] }) });
  assert.equal(r.status, 409);
  assert.match((await r.json()).thongDiep, /đã đổi; tải lại/);
});

test('S7 · tầng giao diện: gắn/gỡ page chỉ quản trị; mỗi lượt ghi nhật ký ở CẢ page lẫn sản phẩm; kho đòi đủ ba hàm mới', async () => {
  const k = khoGia();
  const nk = [];
  goc.datKhoGoc(k.cua);
  goc.datPheuNhatKyGoc(async (_b, g) => { nk.push(g); });
  const bc = (vai) => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [vai] });
  await assert.rejects(() => goc.ganPageSanPham(bc(VAI.MARKETER), '77', { pageId: 'p9', shopId: '222' }), (e) => e.name === 'LoiThieuVai');
  await goc.ganPageSanPham(bc(VAI.QUAN_TRI), '77', { pageId: 'p9', shopId: '222' });
  await goc.goPageSanPham(bc(VAI.QUAN_TRI), '77', 'p1');
  assert.deepEqual(nk.map((x) => [x.hanhDong, x.doiTuongLoai]), [
    [HANH_DONG.GAN_SAN_PHAM_GOC, 'page'], [HANH_DONG.GAN_SAN_PHAM_GOC, 'san_pham_goc'],
    [HANH_DONG.GAN_SAN_PHAM_GOC, 'page'], [HANH_DONG.GAN_SAN_PHAM_GOC, 'san_pham_goc'],
  ]);
  assert.match(nk[0].ghiChu, /gắn page «Fitgum Kuwait» vào sản phẩm "fitgum" · Kuwait · marketer Lan — thị trường này CHƯA có bậc giá/);
  assert.match(nk[2].ghiChu, /gỡ page «Fitgum KSA» khỏi sản phẩm "fitgum"/);
  for (const ten of ['luuGia', 'ganPage', 'goPage']) {
    const thieu = { ...k.cua }; delete thieu[ten];
    assert.throws(() => goc.datKhoGoc(thieu), new RegExp(`thiếu hàm: ${ten}`));
  }
});

test('S8 · một nơi nhập giá: Vận hành KHÔNG còn tab «Sản phẩm & giá»; màn Sản phẩm không còn lối sang đó', () => {
  const vh = fs.readFileSync(new URL('../../src/ui/van-hanh/trang/van-hanh.js', import.meta.url), 'utf8');
  const ten = vh.match(/const names = \{([\s\S]*?)\};/);
  assert.ok(ten, 'không thấy danh sách tab Vận hành');
  assert.doesNotMatch(ten[1], /products|Sản phẩm & giá/);
  const sp = fs.readFileSync(new URL('../../src/ui/san-pham/trang/san-pham.html', import.meta.url), 'utf8');
  assert.doesNotMatch(sp, /van-hanh-v3\?tab=products/);
});
