// GSP3 · cửa + vai + màn của ĐỐI SOÁT giá + ảnh theo đơn vị gốc × shop. Router + `kho-goc.js` THẬT (kiểm vai, nhật ký, chuyển `duLieu`
// của 409), màn chạy script HTML THẬT trên DOM giả. Tầng A được tiêm GIẢ ở đây — hành vi SQL/giá/ảnh/đẩy đo trên Postgres thật ở
// `test/gsp3-doi-soat.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { moTrang } from '../../testkit/dom-gia.js';
import { taoRouterSanPham, datChanDangNhap, datChanVai } from '../../src/ui/san-pham/router.js';
import { datKhoGoc, datPheuNhatKyGoc } from '../../src/ui/san-pham/kho-goc.js';
import { LoiSanPhamGoc } from '../../../src/products/san-pham-goc.js';

const bac = (gia, extra = {}) => ({ soLuong: 1, gia, tienTe: 'SAR', giaGoc: null, khuyenMai: '', phiShip: null, mienShip: null, bat: true, nhan: '', ...extra });

function duLieu({ haiMon = false, giongMon = false, saiTe = false, motBangSaiTe = false } = {}) {
  const g = { id: '9', maGoc: 'gold', ten: 'Gold', marketer: 'Lan' };
  const viec = (id) => ({ pageId: id, pageFb: 'fb-' + id, ten: 'Gold Saudi ' + id, marketerPage: 'Minh', shop: { id: '111', market: 'Saudi' },
    goc: g, trangThai: 'cho_doi_soat', banSao: [{ id: 'b-' + id, ten: '', soAnh: 1, anhDau: null, bac: [bac(99)] }], goiY: [] });
  const mon = haiMon
    ? [{ posMa: '111:h1', id: '41', ten: 'Hat S', bac: [], anh: [], bang: null }, { posMa: '111:h2', id: '42', ten: 'Hat L', bac: [], anh: [], bang: null }]
    : [{ posMa: '111:x', id: '40', ten: 'Gold Ring', bac: [], anh: [{ duong: '/uploads/co.png' }], bang: null }];
  const banSao = [
    { id: 'b-4', pageId: '4', pageFb: 'fb-4', tenPage: 'Gold Saudi 4', marketerPage: 'Minh', ten: '', bac: [bac(199), bac(299, { soLuong: 2, phiShip: 25 })],
      anh: [{ duong: '/uploads/a.png' }, { duong: '/uploads/chung.png' }], doiSoat: null, daQuyet: false, bang: 0 },
    { id: 'b-5', pageId: '5', pageFb: 'fb-5', tenPage: 'Gold Saudi 5', marketerPage: 'Hà', ten: '', bac: [bac(249)],
      anh: [{ duong: '/uploads/chung.png' }], doiSoat: null, daQuyet: false, bang: 1 },
  ];
  if (giongMon) {   // bản sao duy nhất TRÙNG HỆT giá món đang có ⇒ máy chủ không ghi giá (chỉ đẩy)
    mon[0].bac = banSao[0].bac; mon[0].bang = 0; banSao.length = 1;
  }
  if (saiTe) {      // F4: bảng của page 5 mang tiền tệ ≠ thị trường (máy chủ đánh `tienTeSai`) — không làm bảng thắng được
    banSao[1].bac = [bac(249, { tienTe: 'AED' })]; banSao[1].tienTeSai = true;
  }
  if (motBangSaiTe) { // F4: bảng DUY NHẤT (món chưa giá) mang tệ sai ⇒ máy chủ chắc chắn 409 lech_tien_te
    banSao.length = 1; banSao[0].bac = [bac(199, { tienTe: 'AED' })]; banSao[0].tienTeSai = true;
  }
  return {
    chuyen: { viec: [viec('4'), viec('5')], dem: { chuaGan: 0, choDoiSoat: 2, boQua: 0, chuaXong: 2 }, shopCuaTeam: [{ id: '111', market: 'Saudi' }], gocCuaTeam: [g] },
    donVi: { co032: true, dauDonVi: 'dau-1', goc: g, shop: { id: '111', market: 'Saudi', tienTe: 'SAR' }, mon, banSao,
      pageDonVi: [{ pageId: '4', ten: 'Gold Saudi 4', marketer: 'Minh', trangThai: 'cho_doi_soat' },
        { pageId: '5', ten: 'Gold Saudi 5', marketer: 'Hà', trangThai: 'cho_doi_soat' }, { pageId: '6', ten: 'Gold Saudi 6', marketer: 'Lan', trangThai: 'xong' }],
      pageChuaGanCungMon: [{ pageId: '7', ten: 'Gold Ring chưa gắn' }],
      bangKhacNhau: giongMon ? [{ bac: banSao[0].bac, banSaoIds: ['b-4'], laGiaMon: true, monPosMa: ['111:x'] }]
        : banSao.map((x) => ({ bac: x.bac, banSaoIds: [x.id], laGiaMon: false, monPosMa: [] })) },
  };
}

async function dung(t, opt) {
  const data = duLieu(opt); const goi = []; const audit = [];
  const noop = async () => ({});
  datKhoGoc({
    ...Object.fromEntries(['cho', 'tao', 'sua', 'bo', 'chiTiet', 'monChuaGan', 'gan', 'go', 'kienThuc', 'goiYGop', 'gop', 'luuGia', 'ganPage', 'goPage'].map((x) => [x, noop])),
    ds: async () => [], dem: async () => ({}), dsChuyen: async () => data.chuyen,
    donViDoiSoat: async (bc, gocId, shopId) => { goi.push(['xem', bc.teamId, gocId, shopId]); return data.donVi; },
    doiSoat: async (bc, x) => {
      goi.push(['ghi', x]);
      if (opt?.loiKhacDoiGiua && x.dauDonVi === 'dau-1') {   // CR1: lỗi KHÁC (502 đẩy hỏng) và đơn vị cũng đổi trong lúc đó
        data.donVi = { ...data.donVi, dauDonVi: 'dau-2', banSao: [...data.donVi.banSao, { id: 'b-6', pageId: '6', pageFb: 'fb-6', tenPage: 'Gold Saudi 6',
          marketerPage: 'Lan', ten: '', bac: [bac(99)], anh: [], doiSoat: null, daQuyet: false, bang: 2 }] };
        throw Object.assign(new LoiSanPhamGoc('bot page fb-4 không nhận bản chép', 'luu_gia', 502), {});
      }
      if (opt?.doiGiua && x.dauDonVi === 'dau-1') {   // F1: page 6 gắn thêm trong lúc khung mở ⇒ đơn vị mới (dấu mới) đi kèm 409
        const moi = { ...data.donVi, dauDonVi: 'dau-2', banSao: [...data.donVi.banSao, { id: 'b-6', pageId: '6', pageFb: 'fb-6', tenPage: 'Gold Saudi 6',
          marketerPage: 'Lan', ten: '', bac: [bac(99)], anh: [], doiSoat: null, daQuyet: false, bang: 2 }] };
        data.donVi = moi;
        throw Object.assign(new LoiSanPhamGoc('đơn vị «gold» · shop 111 đã đổi trong lúc khung mở — xem lại các bảng rồi chọn lại; chưa ghi gì', 'don_vi_da_doi', 409),
          { duLieu: { donVi: moi } });
      }
      if (!x.chon && !opt?.haiMon) {
        throw Object.assign(new LoiSanPhamGoc('bảng giá khác nhau giữa các page ở 111:x — chọn MỘT bảng; lựa chọn đổi giá bot ở 3 page', 'lech_gia_giua_page', 409),
          { duLieu: { lech: [{ posMa: '111:x', bang: [] }], pageDoiGia: data.donVi.pageDonVi } });
      }
      data.chuyen.viec = []; data.chuyen.dem = { chuaGan: 0, choDoiSoat: 0, boQua: 0, chuaXong: 0 };
      return { gocId: '9', maGoc: 'gold', tenGoc: 'Gold', shopId: '111', market: 'Saudi', daXong: false,
        mon: [{ posMa: '111:x', ghiGia: true, anhThem: 2, bangThang: { pageId: '4', tenPage: 'Gold Saudi 4', laGiaMon: false } }],
        pageDonVi: data.donVi.pageDonVi.map((p) => ({ ...p, trangThai: 'xong' })), pageDoiGia: data.donVi.pageDonVi,
        pageSangXong: data.donVi.pageDonVi.filter((p) => p.trangThai === 'cho_doi_soat'), danhDau: { chep: ['b-4'], giuGiaMon: ['b-5'] } };
    },
  });
  datPheuNhatKyGoc(async (_bc, x) => { audit.push(x); });
  datChanDangNhap((req, res, next) => (req.boiCanh ? next() : res.sendStatus(401)));
  datChanVai(() => (_req, _res, next) => next());
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { if (req.headers.cookie) req.boiCanh = { teamId: 'team1', nguoiDungId: 'u', vai: [req.headers.cookie === 'mkt' ? 'marketer' : 'quan-tri'] }; next(); });
  app.get('/api/san-pham', (_req, res) => res.json({ ok: true, dem: {}, page: [] }));
  app.use(taoRouterSanPham());
  const sv = http.createServer(app); await new Promise((r) => sv.listen(0, '127.0.0.1', r));
  t.after(() => { sv.close(); datKhoGoc(null); datPheuNhatKyGoc(null); });
  const goc = 'http://127.0.0.1:' + sv.address().port;
  return { data, goi, audit, goc, mo: () => moTrang('san-pham/trang/san-pham.html', { goc, cookie: 'qt', duong: '/san-pham?xem=chuyen' }) };
}
const the = (m, id) => m.$('#dsChuyen').querySelectorAll('[data-chuyen]').find((x) => x.dataset.chuyen === id);

test('GSP3 · cửa thật: vai quản trị, 409 mang dữ liệu cho người chọn, không bị :id nuốt; ghi xong có nhật ký sản phẩm + từng page', async (t) => {
  const d = await dung(t);
  const get = (cookie) => fetch(d.goc + '/api/san-pham/chuyen/doi-soat?gocId=9&shopId=111', { headers: { cookie } });
  assert.equal((await get('')).status, 401);
  assert.equal((await get('mkt')).status, 403);
  const ok = await get('qt'); assert.equal(ok.status, 200);
  const jx = await ok.json();
  assert.equal(jx.goc.maGoc, 'gold', 'đường đối soát không bị `/api/san-pham/:id` bắt');
  assert.equal(jx.dauDonVi, 'dau-1', 'GET trả dấu đơn vị cho màn');
  assert.deepEqual(d.goi[0], ['xem', 'team1', '9', '111']);
  const post = (cookie, body) => fetch(d.goc + '/api/san-pham/chuyen/doi-soat', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await post('mkt', { gocId: '9', shopId: '111' })).status, 403);
  const lech = await post('qt', { gocId: '9', shopId: '111' });
  assert.equal(lech.status, 409);
  const j = await lech.json();
  assert.equal(j.ma, 'lech_gia_giua_page');
  assert.equal(j.duLieu.pageDoiGia.length, 3, '409 chuyển nguyên dữ liệu (page sẽ đổi giá) cho màn');
  assert.equal(d.audit.length, 0, '409 không ghi nhật ký');
  const xong = await post('qt', { gocId: '9', shopId: '111', chon: { '111:x': { banSaoId: 'b-4' } }, dauDonVi: 'dau-1' });
  assert.equal(xong.status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(d.goi.at(-1))), ['ghi', { gocId: '9', shopId: '111', chon: { '111:x': { banSaoId: 'b-4' } }, dauDonVi: 'dau-1' }],
    'router + kho chuyển nguyên dấu đơn vị xuống tầng A');
  assert.deepEqual(d.audit.map((x) => [x.hanhDong, x.doiTuongLoai, x.doiTuongId]),
    [['doi_soat_ban_sao', 'san_pham_goc', '9'], ['doi_soat_ban_sao', 'page', '4'], ['doi_soat_ban_sao', 'page', '5'], ['doi_soat_ban_sao', 'page', '6']]);
  assert.match(d.audit[0].ghiChu, /111:x ← bảng page «Gold Saudi 4».*3 page đổi giá/);
});

test('GSP3 · màn: dòng chờ đối soát có nút; khung hiện bảng lệch tô khác, ảnh gom, page sẽ đổi giá, cảnh báo page chưa gắn', async (t) => {
  const d = await dung(t); const m = await d.mo();
  const nut = the(m, '4').querySelector('[data-doisoat]');
  assert.ok(nut, 'dòng cho_doi_soat có nút đối soát');
  assert.match(nut.textContent, /Đối soát giá \+ ảnh cho «Gold» · «Saudi»/);
  await nut.click(); await m.cho();
  assert.equal(m.$('#dsBanSaoDoiSoat').querySelectorAll('[data-ban-sao]').length, 2);
  assert.ok(m.$('#dsBanSaoDoiSoat').querySelectorAll('mark').length >= 2, 'ô khác nhau giữa hai bảng được tô');
  assert.match(m.$('#phai').textContent, /lệch giá ở 1 món/);
  assert.match(m.$('#tieuDePageDoiGia').textContent, /Page sẽ đổi giá nếu chọn bảng khác giá món \(3\)/);
  assert.match(m.$('#phai').textContent, /Gold Ring chưa gắn/);
  assert.deepEqual(m.$('#pageDoiGiaDoiSoat').querySelectorAll('li').map((x) => x.textContent.split(' · ')[0]), ['Gold Saudi 4', 'Gold Saudi 5', 'Gold Saudi 6']);
  assert.match(m.$('#anhGomDoiSoat').textContent, /1 ảnh đang có \+ 2 ảnh mới/);
  assert.match(m.$('#dsBanSaoDoiSoat').textContent, /299 SAR/, 'giá đơn vị lớn đi thẳng lên màn, màn không chia');
});

test('GSP3 · màn: lưu khi chưa chọn ⇒ 409 hiện câu cho người chọn; chọn bảng ⇒ gửi chon; xong ⇒ danh sách tải lại, bộ đếm giảm', async (t) => {
  const d = await dung(t); const m = await d.mo();
  assert.match(m.$('#oDuLieu').textContent, /2 page chưa chuyển xong/);
  await the(m, '4').querySelector('[data-doisoat]').click(); await m.cho();
  await m.$('[data-luu-doisoat]').click(); await m.cho();
  assert.match(m.$('#phai').textContent, /bảng giá khác nhau giữa các page.*chọn MỘT bảng/);
  assert.equal(m.$('#dsBanSaoDoiSoat').querySelectorAll('[data-ban-sao]').length, 2, 'khung vẫn mở để người chọn');
  const sel = m.$('[data-chon]');
  assert.deepEqual(sel.querySelectorAll('option').map((o) => o.getAttribute('value')), ['', 'bs:b-4', 'bs:b-5']);
  sel.value = 'bs:b-4'; await sel.onchange();
  await m.$('[data-luu-doisoat]').click(); await m.cho();
  const ghi = m.goi.filter((x) => x.phuongThuc === 'POST');
  assert.deepEqual(ghi.map((x) => x.than), [{ gocId: '9', shopId: '111', dauDonVi: 'dau-1' },
    { gocId: '9', shopId: '111', dauDonVi: 'dau-1', chon: { '111:x': { banSaoId: 'b-4' } } }], 'màn gửi dấu của đơn vị đang vẽ');
  assert.match(m.$('#phai').textContent, /Đã đối soát «Gold»: 2 page sang xong · 3 page đổi giá · 2 ảnh thêm/);
  assert.doesNotMatch(m.$('#oDuLieu').textContent, /page chưa chuyển xong/, 'bộ đếm giảm đúng số page của đơn vị (2 → 0)');
  assert.equal(m.$('#dsChuyen').querySelectorAll('[data-chuyen]').length, 0, 'mọi page của đơn vị rời danh sách');
});

test('GSP3 · màn: sản phẩm nhiều món ⇒ chọn cặp bản sao → món trước, gửi `cap`', async (t) => {
  const d = await dung(t, { haiMon: true }); const m = await d.mo();
  await the(m, '4').querySelector('[data-doisoat]').click(); await m.cho();
  assert.match(m.$('#chonBangDoiSoat').textContent, /Chọn món cho từng bản sao trước/);
  for (const [id, posMa] of [['b-4', '111:h1'], ['b-5', '111:h2']]) {
    const s = m.$('#dsBanSaoDoiSoat').querySelectorAll('[data-cap]').find((x) => x.dataset.cap === id);
    s.value = posMa; await s.onchange();
  }
  assert.match(m.$('#chonBangDoiSoat').textContent, /111:h1: một bảng duy nhất \(Bảng A\) — chép lên món/);
  assert.equal(m.$('#dsBanSaoDoiSoat').querySelectorAll('mark').length, 0, 'mỗi món một bảng ⇒ không ô nào «khác» (hai món giá khác nhau không phải lệch)');
  assert.doesNotMatch(m.$('#phai').textContent, /lệch giá ở/);
  assert.match(m.$('#tieuDePageDoiGia').textContent, /^Page sẽ đổi giá theo lựa chọn \(3\)/);
  await m.$('[data-luu-doisoat]').click(); await m.cho();
  const ghi = m.goi.filter((x) => x.phuongThuc === 'POST');
  assert.deepEqual(ghi[0].than.cap, [{ banSaoId: 'b-4', posMa: '111:h1' }, { banSaoId: 'b-5', posMa: '111:h2' }]);
});

test('GSP3 · màn: bảng bản sao trùng hệt giá món ⇒ nói «giữ giá, không đổi giá», không hứa danh sách page đổi giá', async (t) => {
  const d = await dung(t, { giongMon: true }); const m = await d.mo();
  await the(m, '4').querySelector('[data-doisoat]').click(); await m.cho();
  assert.match(m.$('#chonBangDoiSoat').textContent, /111:x: một bảng duy nhất \(Bảng A\) — trùng giá món đang có: giữ giá, không đổi giá/);
  assert.match(m.$('#tieuDePageDoiGia').textContent, /^Không page nào đổi giá — giá món giữ nguyên/);
  assert.equal(m.$('#phai').querySelectorAll('mark').length, 0);
});

test('GSP3 · màn: đơn vị đổi trong lúc khung mở ⇒ 409 don_vi_da_doi: vẽ đơn vị MỚI máy chủ gửi kèm, XOÁ lựa chọn cũ, bấm lại gửi dấu mới', async (t) => {
  const d = await dung(t, { doiGiua: true }); const m = await d.mo();
  await the(m, '4').querySelector('[data-doisoat]').click(); await m.cho();
  const sel = m.$('[data-chon]');
  sel.value = 'bs:b-4'; await sel.onchange();
  await m.$('[data-luu-doisoat]').click(); await m.cho();
  assert.match(m.$('#phai').textContent, /Đơn vị đã đổi trong lúc bạn xem/);
  assert.equal(m.$('#dsBanSaoDoiSoat').querySelectorAll('[data-ban-sao]').length, 3, 'bảng của page vừa gắn hiện ra');
  assert.equal(m.$('[data-chon]').value, '', 'lựa chọn cũ bị xoá — người chọn lại trên đơn vị mới');
  assert.deepEqual(m.$('[data-chon]').querySelectorAll('option').map((o) => o.getAttribute('value')), ['', 'bs:b-4', 'bs:b-5', 'bs:b-6']);
  const s2 = m.$('[data-chon]'); s2.value = 'bs:b-4'; await s2.onchange();
  await m.$('[data-luu-doisoat]').click(); await m.cho();
  const ghi = m.goi.filter((x) => x.phuongThuc === 'POST');
  assert.deepEqual(ghi.map((x) => x.than.dauDonVi), ['dau-1', 'dau-2'], 'lượt bấm lại mang dấu của đơn vị MỚI');
  assert.match(m.$('#phai').textContent, /Đã đối soát «Gold»/);
});

test('GSP3 · màn: bảng mang tiền tệ sai ⇒ lựa chọn bảng đó bị TẮT và nói rõ; các bảng đúng vẫn chọn được', async (t) => {
  const d = await dung(t, { saiTe: true }); const m = await d.mo();
  await the(m, '4').querySelector('[data-doisoat]').click(); await m.cho();
  const op = m.$('[data-chon]').querySelectorAll('option');
  const sai = op.find((o) => o.getAttribute('value') === 'bs:b-5');
  const dung5 = op.find((o) => o.getAttribute('value') === 'bs:b-4');
  assert.ok(sai.disabled, 'bảng «AED» trên shop Saudi không chọn được');
  assert.match(sai.textContent, /sai tiền tệ \(khác SAR\), không chọn được/);
  assert.ok(!dung5.disabled);
  // Lựa chọn trỏ vào bảng sai tệ (vd. còn lại sau một lượt tải lại) bị bỏ — không gửi một lựa chọn chắc chắn 409.
  const sel = m.$('[data-chon]'); sel.value = 'bs:b-5'; await sel.onchange();
  assert.equal(m.$('[data-chon]').value, '', 'select về «— chọn một bảng —»');
});

test('GSP3 · màn: bảng DUY NHẤT mang tiền tệ sai ⇒ nói rõ, nút đối soát TẮT, không hứa «page sẽ đổi giá»', async (t) => {
  const d = await dung(t, { motBangSaiTe: true }); const m = await d.mo();
  await the(m, '4').querySelector('[data-doisoat]').click(); await m.cho();
  assert.match(m.$('#chonBangDoiSoat').textContent, /một bảng duy nhất \(Bảng A\) — mang tiền tệ khác SAR: sửa bản sao trước/);
  assert.match(m.$('#tieuDePageDoiGia').textContent, /^Chưa đối soát được — bảng sẽ ghi mang tiền tệ khác SAR/);
  assert.ok(m.$('[data-luu-doisoat]').disabled, 'nút tắt — bấm là 409 chắc chắn');
});

test('GSP3 · màn: lỗi KHÁC (502 đẩy hỏng) mà đơn vị cũng đổi trong lúc đó ⇒ tải lại thấy dấu mới: XOÁ lựa chọn cũ + báo «đơn vị đã đổi»', async (t) => {
  const d = await dung(t, { loiKhacDoiGiua: true }); const m = await d.mo();
  await the(m, '4').querySelector('[data-doisoat]').click(); await m.cho();
  const sel = m.$('[data-chon]'); sel.value = 'bs:b-4'; await sel.onchange();
  await m.$('[data-luu-doisoat]').click(); await m.cho();
  assert.match(m.$('#phai').textContent, /Đơn vị đã đổi trong lúc bạn xem/);
  assert.match(m.$('#phai').textContent, /bot page fb-4 không nhận bản chép — đơn vị cũng đã đổi/);
  assert.equal(m.$('#dsBanSaoDoiSoat').querySelectorAll('[data-ban-sao]').length, 3);
  assert.equal(m.$('[data-chon]').value, '', 'lựa chọn cũ KHÔNG được mang sang đơn vị mới (dấu mới + chọn cũ = lọt chốt F1)');
});
