// GP1 · cửa + vai + màn «Điền giá từ đơn POS». Router + `kho-goc.js` THẬT (kiểm vai, nhật ký mỗi món, chuyển `duLieu` của 409, đường
// đứng TRƯỚC `/api/san-pham/:id`), màn chạy script HTML THẬT trên DOM giả. Tầng A được tiêm GIẢ ở đây — ghép món / tiền tệ / chốt / ghi
// đo trên Postgres thật ở `test/gp1-xem-ap.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { moTrang } from '../../testkit/dom-gia.js';
import { taoRouterSanPham, datChanDangNhap, datChanVai } from '../../src/ui/san-pham/router.js';
import { datKhoGoc, datPheuNhatKyGoc } from '../../src/ui/san-pham/kho-goc.js';
import { LoiSanPhamGoc } from '../../../src/products/san-pham-goc.js';
import { CHU_LY_DO } from '../../../src/products/gia-tu-don-pos.js';

const bac = (soLuong, gia, te, { gn = gia, gnKr = false, ...o } = {}) => ({ soLuong, gia, giaLon: te === 'TWD' ? gia : gia / 100, tong: 11, soDonGanDay: 10,
  soDonMuc: 9, tiLe: 0.9, ganNhat: { gia: gn, giaLon: te === 'TWD' ? gn : gn / 100, ngay: '2026-09-20', ...(gnKr ? { khongRoTeam: true } : {}) },
  tu: '2026-09-01', den: '2026-09-20', ...o });
// Vòng 2 · F4: dòng có «giá đơn gần nhất» ≠ giá bậc bị TÔ và KHÔNG chọn sẵn ⇒ món A mặc định khớp (gn = giá bậc); `lech` dựng dòng lệch
// (bậc 99 SAR, đơn gần nhất 89 SAR — đúng dòng fixture M2 vòng 1 mà đối kháng F4 chỉ ra «vẫn chọn sẵn»).
const taoMonA = (lech = false) => ({ monId: '41', posMa: '111:va', ten: '264 - Gold A', sku: '264', shopId: '111', market: 'Saudi', tienTe: 'SAR', gocId: '9', maGoc: 'ga',
  tenGoc: 'Gold A', bac: [bac(1, 9900, 'SAR', lech ? { gn: 8900 } : {}), bac(2, 15900, 'SAR', { tong: 5, soDonGanDay: 5, soDonMuc: 5, tiLe: 1 })],
  boBac: [{ soLuong: 3, lyDo: 'it_don', tong: 1 }], soDon: 17, tu: '2026-09-01', den: '2026-09-20' });
const monA = taoMonA();
const monTw = { monId: '42', posMa: '219:vt', ten: '264 - Gold A', sku: '264', shopId: '219', market: 'Taiwan', tienTe: 'TWD', gocId: '9', maGoc: 'ga',
  // F1 vòng 2: cửa sổ gần của TW có 2 đơn marketer chưa ghép team (cùng mức) — đơn mới nhất là một trong số đó
  tenGoc: 'Gold A', bac: [bac(1, 990, 'TWD', { gnKr: true, soDonKhongRo: 2 })], boBac: [], soDon: 11, tu: '2026-09-01', den: '2026-09-20' };
const xemTruocGia = (o = {}) => ({
  soNgay: 60, ganDay: 10, toiThieu: 3, nguong: 0.8, deXuat: [monA, monTw],
  bo: [{ posMa: '111:vb', monId: '43', ten: '265 - B', sku: '265', shopId: '111', lyDo: 'da_co_gia', chiTiet: 'đã có 2 bậc' },
    { posMa: '111:vh', monId: '44', ten: '271 - H', sku: '271', shopId: '111', lyDo: 'da_co_gia', chiTiet: 'đã có 1 bậc' },
    { posMa: '407:v211', monId: '45', ten: '211 - Ring', sku: '211', shopId: '407', lyDo: 'doi_gia_gan_day', chiTiet: 'bậc 1: 10 đơn gần nhất 37 EUR · cả cửa sổ 29 EUR' }],
  dem: { da_co_gia: 2, doi_gia_gan_day: 1 }, dongHong: 0, chuLyDo: CHU_LY_DO,
  shopKhongDon: [{ shopId: '222', market: 'Kuwait' }], dauXemTruoc: 'dau-1', ...o,
});

async function dung(t, { boXem = false, boPheu = false, doiGiua = false, hongMot = false, tran, chamAp = false, lech = false, hongXemSauAp = 0, them = [] } = {}) {
  const goi = []; const audit = [];
  let daAp = false; let conHongXem = hongXemSauAp;   // hongXemSauAp: N lượt xem trước ĐẦU TIÊN sau một lượt áp thành công ném 502 (BigQuery hỏng)
  const mA = lech ? taoMonA(true) : monA;
  let xt = xemTruocGia({ deXuat: [mA, monTw, ...them], ...(tran ? { tranMotLuot: tran } : {}) });
  let moCua = null;   // chamAp: lượt áp đứng chờ tới khi ca mở cửa (dựng «người bấm sang màn khác trong lúc chờ»)
  const cua = chamAp ? new Promise((r) => { moCua = r; }) : null;
  const noop = async () => ({});
  datKhoGoc({
    ...Object.fromEntries(['cho', 'tao', 'sua', 'bo', 'chiTiet', 'monChuaGan', 'gan', 'go', 'kienThuc', 'goiYGop', 'gop', 'luuGia', 'ganPage', 'goPage'].map((x) => [x, noop])),
    ds: async () => [], dem: async () => ({}), dsChuyen: async () => ({ viec: [], dem: { chuaGan: 0, choDoiSoat: 0, boQua: 0, chuaXong: 0 }, shopCuaTeam: [], gocCuaTeam: [] }),
    ...(boXem ? {} : {
      xemGiaTuDon: async (bc, x) => {
        goi.push(['xem', bc.teamId, x]);
        if (daAp && conHongXem > 0) { conHongXem -= 1; throw new LoiSanPhamGoc('đọc đơn POS từ BigQuery hỏng: hết giờ', 'bq_hong', 502); }
        return xt;
      },
      apGiaTuDon: async (bc, x) => {
        goi.push(['ap', bc.teamId, JSON.parse(JSON.stringify(x))]);
        if (cua) await cua;
        if (doiGiua && x.dauXemTruoc === 'dau-1') {   // một món có giá giữa lúc xem và lúc áp ⇒ máy chủ tính lại, dấu mới đi kèm 409
          xt = xemTruocGia({ deXuat: [mA], dem: { da_co_gia: 3, doi_gia_gan_day: 1 }, dauXemTruoc: 'dau-2', ...(tran ? { tranMotLuot: tran } : {}) });
          throw Object.assign(new LoiSanPhamGoc('bảng xem trước đã đổi từ lúc bạn xem — xem lại rồi áp', 'xem_truoc_da_doi', 409), { duLieu: { xemTruoc: xt } });
        }
        const chon = (x.monIds || xt.deXuat.map((d) => d.monId)).map((id) => xt.deXuat.find((d) => d.monId === id));
        const ghi = []; const hong = [];
        for (const d of chon) {
          if (hongMot && d.monId === '42') hong.push({ monId: d.monId, posMa: d.posMa, ten: d.ten, lyDo: 'da_co_gia', thongDiep: 'món đã có 1 bậc giá (ghi trong lúc áp) — không ghi đè' });
          else ghi.push({ monId: d.monId, posMa: d.posMa, ten: d.ten, gocId: d.gocId, maGoc: d.maGoc, shopId: d.shopId, market: d.market,
            tienTe: d.tienTe, bac: d.bac, tu: d.tu, den: d.den, soDon: d.soDon,
            // bước đẩy bản chép của cửa lưu giá: bình thường `{ ok, page[] }`; cửa ghi bot khoá ⇒ `{ ok: false, ghiChu }` (giá ĐÃ lưu)
            dongBo: hongMot ? { ok: false, ghiChu: 'cửa ghi kho bot đang đóng' } : { ok: true, page: [{ pageId: 'p1' }, { pageId: 'p2' }] } });
        }
        // Như máy chủ thật: món đã ghi rời bảng (thành da_co_gia), bảng còn lại mang dấu MỚI — màn tải lại sau áp đọc bảng này.
        const da = new Set(ghi.map((m) => m.monId)); daAp = true;
        xt = { ...xt, deXuat: xt.deXuat.filter((d) => !da.has(d.monId)), dauXemTruoc: `dau-sau-${goi.length}` };
        return { soNgay: xt.soNgay, ghi, hong };
      },
    }),
  });
  datPheuNhatKyGoc(boPheu ? null : async (_bc, b) => { audit.push(b); });
  datChanDangNhap((req, res, next) => (req.boiCanh ? next() : res.sendStatus(401)));
  datChanVai(() => (_req, _res, next) => next());
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { if (req.headers.cookie) req.boiCanh = { teamId: 'team1', nguoiDungId: 'u', vai: [req.headers.cookie === 'mkt' ? 'marketer' : 'quan-tri'] }; next(); });
  app.get('/api/san-pham', (_req, res) => res.json({ ok: true, dem: {}, page: [] }));
  // Marketer: danh mục sản phẩm của phạm vi (bộ đọc HRM cần CSDL — ở đây trả thẳng khuôn của `manSanPhamGoc`).
  app.get('/api/san-pham/goc', (req, res, next) => (req.headers.cookie === 'mkt'
    ? res.json({ ok: true, goc: [], gia: {}, phamVi: { chiCuaToi: true, coMaNv: false }, suaDuoc: false }) : next()));
  app.use(taoRouterSanPham());
  const sv = http.createServer(app); await new Promise((r) => sv.listen(0, '127.0.0.1', r));
  t.after(() => { sv.close(); datKhoGoc(null); datPheuNhatKyGoc(null); });
  const goc = 'http://127.0.0.1:' + sv.address().port;
  return { goi, audit, goc, moCua: () => moCua && moCua(),
    mo: (cookie = 'qt', duong = '/san-pham') => moTrang('san-pham/trang/san-pham.html', { goc, cookie, duong }) };
}
const post = (goc, cookie, body) => fetch(goc + '/api/san-pham/gia-tu-don', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('H1 · ④6 GET xem trước: chưa đăng nhập 401 · marketer 403 · quản trị 200; không bị `/api/san-pham/:id` nuốt; soNgay + team chuyển xuống tầng A', async (t) => {
  const d = await dung(t);
  const get = (cookie, qs = '') => fetch(d.goc + '/api/san-pham/gia-tu-don' + qs, { headers: { cookie } });
  assert.equal((await get('')).status, 401);
  const mk = await get('mkt'); assert.equal(mk.status, 403); assert.equal((await mk.json()).ma, 'thieu_vai');
  const ok = await get('qt', '?soNgay=30'); assert.equal(ok.status, 200);
  const j = await ok.json();
  assert.equal(j.dauXemTruoc, 'dau-1', 'đường gia-tu-don không bị `/:id` bắt (nếu bị bắt: «không có page đó»)');
  assert.equal(j.deXuat.length, 2);
  assert.deepEqual(d.goi, [['xem', 'team1', { soNgay: '30' }]], 'chỉ MỘT lượt gọi tầng A (marketer bị chặn TRƯỚC tầng A)');
});

test('H2 · ④6 POST áp: marketer 403 (0 lượt gọi tầng A) · quản trị: thân chuyển nguyên xuống; MỖI món ghi một dòng nhật ký ở sản phẩm', async (t) => {
  const d = await dung(t);
  assert.equal((await post(d.goc, 'mkt', { dauXemTruoc: 'dau-1' })).status, 403);
  assert.equal(d.goi.length, 0);
  const r = await post(d.goc, 'qt', { dauXemTruoc: 'dau-1', monIds: ['41', '42'], soNgay: 60 });
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.deepEqual(j.ghi.map((m) => m.monId), ['41', '42']);
  assert.deepEqual(d.goi[0], ['ap', 'team1', { dauXemTruoc: 'dau-1', monIds: ['41', '42'], soNgay: 60 }]);
  assert.deepEqual(d.audit.map((x) => [x.hanhDong, x.doiTuongLoai, x.doiTuongId]), [['dien_gia_tu_don_pos', 'san_pham_goc', '9'], ['dien_gia_tu_don_pos', 'san_pham_goc', '9']]);
  assert.match(d.audit[0].ghiChu, /111:va.*Saudi.*1 = 99 SAR · 9\/10 đơn gần nhất · 11 đơn 60 ngày.*2 = 159 SAR/);
  assert.match(d.audit[0].ghiChu, /2026-09-01…2026-09-20/);
  assert.match(d.audit[1].ghiChu, /1 = 990 TWD/);
  assert.equal(d.audit[0].sau.soNgay, 60);
});

test('H3 · 409 «xem trước đã đổi» chuyển nguyên bảng mới cho màn; 0 dòng nhật ký', async (t) => {
  const d = await dung(t, { doiGiua: true });
  const r = await post(d.goc, 'qt', { dauXemTruoc: 'dau-1' });
  assert.equal(r.status, 409);
  const j = await r.json();
  assert.equal(j.ma, 'xem_truoc_da_doi');
  assert.equal(j.duLieu.xemTruoc.dauXemTruoc, 'dau-2');
  assert.equal(d.audit.length, 0);
});

test('H4 · chưa nối: tầng A thiếu hàm ⇒ 500 chua_noi (không trả rỗng); phễu nhật ký chưa nối ⇒ 500 TRƯỚC khi gọi tầng A ghi', async (t) => {
  const d = await dung(t, { boXem: true });
  const r = await fetch(d.goc + '/api/san-pham/gia-tu-don', { headers: { cookie: 'qt' } });
  assert.equal(r.status, 500);
  assert.equal((await r.json()).ma, 'chua_noi');
  datKhoGoc(null); datPheuNhatKyGoc(null);
  const d2 = await dung(t, { boPheu: true });
  const r2 = await post(d2.goc, 'qt', { dauXemTruoc: 'dau-1' });
  assert.equal(r2.status, 500);
  assert.equal((await r2.json()).ma, 'chua_noi');
  assert.equal(d2.goi.filter((x) => x[0] === 'ap').length, 0, 'không ghi giá khi không ghi được nhật ký');
});

test('M1 · màn: quản trị có lối «Điền giá từ đơn POS»; marketer không', async (t) => {
  const d = await dung(t);
  const m = await d.mo('qt');
  assert.ok(m.$('#moGiaTuDon'), 'quản trị thấy nút');
  assert.match(m.$('#moGiaTuDon').textContent, /Điền giá từ đơn POS/);
  const mk = await d.mo('mkt');
  assert.equal(mk.$('#moGiaTuDon'), null, 'marketer không thấy');
});

test('M2 · màn xem trước: bảng SKU · tên · shop · bậc · số đơn · tỷ lệ · giá đơn gần nhất · ngày; đếm món bỏ theo lý do; câu luật; nút «Áp dụng N món»', async (t) => {
  const d = await dung(t);
  const m = await d.mo();
  await m.$('#moGiaTuDon').click(); await m.cho();
  const phai = m.$('#phai').textContent;
  assert.match(phai, /Điền giá từ đơn POS \(60 ngày\)/);
  const hang = m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-mon]');
  assert.deepEqual(hang.map((h) => h.dataset.gtdMon), ['41', '42']);
  const a = hang[0].textContent;
  for (const x of ['264', '264 - Gold A', 'Saudi', '111', '1 = 99 SAR', '2 = 159 SAR', '11', '9/10', '99 SAR · 2026-09-20', '159 SAR · 2026-09-20']) assert.ok(a.includes(x), `dòng A thiếu «${x}»: ${a}`);
  assert.match(hang[1].textContent, /1 = 990 TWD/, 'TWD không xu — màn không chia');
  assert.match(hang[1].textContent, /9\/10 \(gồm 2 đơn chưa ghép team\)/, 'tỷ lệ của tập gộp nói số đơn chưa ghép team (/code-review vòng 2 #2)');
  assert.match(hang[1].textContent, /990 TWD · 2026-09-20 \(đơn chưa ghép team\)/, 'đơn gần nhất không rõ team — nói ra');
  assert.equal(hang[1].getAttribute('data-muc'), null, 'cùng mức ⇒ không tô');
  assert.match(m.$('#demBoGiaTuDon').textContent, new RegExp(`${CHU_LY_DO.da_co_gia.replace(/[()]/g, '.')}.*2`));
  assert.match(m.$('#demBoGiaTuDon').textContent, /211 - Ring.*10 đơn gần nhất 37 EUR · cả cửa sổ 29 EUR/, 'món bỏ vì đổi giá nói cả hai mức');
  assert.match(phai, /chỉ điền món CHƯA có giá/i);
  assert.match(phai, /Đã gồm ship · miễn ship/, 'vòng 2 (người quyết 07/10): bậc ghi mien_ship = true — màn nói đúng thứ sẽ ghi');
  assert.match(phai, /Theo thị trường/);
  assert.match(phai, /LỆCH ở bước đối soát/);
  assert.match(phai, /Kuwait \(222\)/, 'shop không có đơn trong cửa sổ — nói ra, kẻo người tưởng hỏng');
  assert.match(m.$('[data-ap-gtd]').textContent, /Áp dụng 2 món/);
  assert.equal(m.location.search, '?xem=gia-tu-don', 'F5 giữ chỗ đứng');
});

test('M3 · màn: bỏ chọn một món ⇒ «Áp dụng 1 món»; bấm ⇒ gửi dấu + monIds + soNgay; xong ⇒ báo số món đã điền', async (t) => {
  const d = await dung(t);
  const m = await d.mo('qt', '/san-pham?xem=gia-tu-don');
  const o = m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]').find((x) => x.dataset.gtdChon === '42');
  o.checked = false; await o.onchange();
  assert.match(m.$('[data-ap-gtd]').textContent, /Áp dụng 1 món/);
  await m.$('[data-ap-gtd]').click(); await m.cho();
  const ghi = m.goi.filter((x) => x.phuongThuc === 'POST');
  assert.deepEqual(ghi.map((x) => x.than), [{ dauXemTruoc: 'dau-1', monIds: ['41'], soNgay: 60 }]);
  assert.match(m.$('#phai').textContent, /Đã điền giá 1 món/);
  assert.match(m.$('#phai').textContent, /Đẩy bản chép sang 2 page/);
});

test('M4 · màn: 409 «xem trước đã đổi» ⇒ vẽ bảng MỚI máy chủ gửi kèm, nói rõ; món người đã BỎ CHỌN vẫn bỏ chọn (F3 vòng 2); chọn lại ⇒ mang dấu mới', async (t) => {
  const d = await dung(t, { doiGiua: true });
  const m = await d.mo('qt', '/san-pham?xem=gia-tu-don');
  // Bỏ chọn A (nghi giá) rồi áp (chỉ TW) ⇒ 409, bảng mới chỉ còn A. Luật vòng 2 (đối kháng F3): quyết định «KHÔNG áp A» của người GIỮ
  // qua 409 — vòng 1 xoá nó và chọn sẵn lại A (thước cũ khẳng định đúng hành vi đó — đã sửa theo luật mới).
  const oA = m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]').find((x) => x.dataset.gtdChon === '41');
  oA.checked = false; await oA.onchange();
  await m.$('[data-ap-gtd]').click(); await m.cho();
  assert.match(m.$('#phai').textContent, /đã đổi từ lúc bạn xem/);
  assert.deepEqual(m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-mon]').map((h) => h.dataset.gtdMon), ['41']);
  const oA2 = m.$('#bangGiaTuDon').querySelector('[data-gtd-chon]');
  assert.equal(oA2.checked, false, 'A người đã bỏ chọn KHÔNG được chọn sẵn lại sau 409');
  assert.match(m.$('[data-ap-gtd]').textContent, /Áp dụng 0 món/);
  assert.ok(m.$('[data-ap-gtd]').disabled, 'không món nào chọn ⇒ nút tắt — bấm vội không ghi A');
  oA2.checked = true; await oA2.onchange();   // người soát lại và CHỌN A
  assert.match(m.$('[data-ap-gtd]').textContent, /Áp dụng 1 món/);
  await m.$('[data-ap-gtd]').click(); await m.cho();
  assert.deepEqual(m.goi.filter((x) => x.phuongThuc === 'POST').map((x) => [x.than.dauXemTruoc, x.than.monIds]), [['dau-1', ['42']], ['dau-2', ['41']]]);
  assert.match(m.$('#phai').textContent, /Đã điền giá 1 món/);
});

test('M9 · F3 (vòng 2) màn GIỮ món người đã bỏ chọn qua lượt tải lại SAU ÁP (bước «áp tiếp»); món mới của lượt kế vẫn chọn sẵn theo trần', async (t) => {
  const d = await dung(t);
  const m = await d.mo('qt', '/san-pham?xem=gia-tu-don');
  const o = (id) => m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]').find((x) => x.dataset.gtdChon === id);
  const oA = o('41'); oA.checked = false; await oA.onchange();   // repro RM1 đối kháng: A nghi giá ⇒ bỏ chọn, áp phần còn lại
  { const x = o('41'); x.checked = true; await x.onchange(); }                  // đổi ý: chọn lại A …
  { const x = o('41'); x.checked = false; await x.onchange(); }                 // … rồi lại bỏ — vẫn là «từ chối»
  await m.$('[data-ap-gtd]').click(); await m.cho();
  assert.match(m.$('#phai').textContent, /Đã điền giá 1 món/);
  assert.ok(o('41'), 'A còn trong bảng tải lại');
  assert.equal(o('41').checked, false, 'A KHÔNG được chọn sẵn lại sau lượt áp');
  assert.ok(m.$('[data-ap-gtd]').disabled);
  await m.$('[data-ap-gtd]').click(); await m.cho();
  assert.deepEqual(d.goi.filter((x) => x[0] === 'ap').map((x) => x[2].monIds), [['42']], 'bấm lại nút tắt không gửi A');
  // «áp tiếp» khi quá trần: lượt 1 áp A (trần 1) ⇒ bảng tải lại chọn sẵn món kế (TW) — giữ lựa chọn không làm chết bước áp tiếp
  const d2 = await dung(t, { tran: 1 });
  const m2 = await d2.mo('qt', '/san-pham?xem=gia-tu-don');
  await m2.$('[data-ap-gtd]').click(); await m2.cho();
  const o2 = m2.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]');
  assert.deepEqual(o2.map((x) => [x.dataset.gtdChon, x.checked]), [['42', true]]);
  assert.match(m2.$('[data-ap-gtd]').textContent, /Áp dụng 1 món/);
});

test('M11 · F3 (vòng 2) bảng tải lại sau áp HỎNG (BigQuery 502) ⇒ «Thử lại» vẫn giữ món người đã bỏ chọn', async (t) => {
  const d = await dung(t, { hongXemSauAp: 1 });
  const m = await d.mo('qt', '/san-pham?xem=gia-tu-don');
  const oA = m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]').find((x) => x.dataset.gtdChon === '41');
  oA.checked = false; await oA.onchange();
  await m.$('[data-ap-gtd]').click(); await m.cho();
  assert.match(m.$('#phai').textContent, /Đã điền giá 1 món/, 'kết quả lượt áp vẫn hiện');
  assert.match(m.$('#phai').textContent, /Chưa đọc được đơn POS để điền giá/);
  await m.$('#thuGiaTuDon').click(); await m.cho();
  assert.match(m.$('#phai').textContent, /Đã điền giá 1 món/, '«Thử lại» không xoá kết quả lượt áp vừa xong (/code-review vòng 2 #6)');
  const o = m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]');
  assert.deepEqual(o.map((x) => [x.dataset.gtdChon, x.checked]), [['41', false]], 'A người đã bỏ chọn vẫn bỏ chọn sau «Thử lại»');
  assert.ok(m.$('[data-ap-gtd]').disabled);
});

test('M12 · (/code-review vòng 2 #4) tích rồi bỏ tích một món KHÔNG chọn sẵn (vượt trần) là «đổi ý», không phải «từ chối» ⇒ lượt áp tiếp vẫn chọn sẵn nó', async (t) => {
  const d = await dung(t, { tran: 1 });
  const m = await d.mo('qt', '/san-pham?xem=gia-tu-don');
  const o = (id) => m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]').find((x) => x.dataset.gtdChon === id);
  assert.equal(o('42').checked, false, 'TW vượt trần — không chọn sẵn');
  const a = o('42'); a.checked = true; await a.onchange();
  const b = o('42'); b.checked = false; await b.onchange();
  assert.match(m.$('[data-ap-gtd]').textContent, /Áp dụng 1 món/);
  await m.$('[data-ap-gtd]').click(); await m.cho();          // áp A
  assert.deepEqual(m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]').map((x) => [x.dataset.gtdChon, x.checked]), [['42', true]],
    'TW được chọn sẵn ở lượt kế — người chưa từng từ chối nó');
});

test('M13 · (/code-review vòng 2 #4) món người đã từ chối, ở bảng tải lại người tích rồi bỏ tích (đổi ý hai lần) ⇒ vẫn là từ chối qua lượt tải lại kế', async (t) => {
  const monX = { monId: '46', posMa: '111:vx', ten: '266 - X', sku: '266', shopId: '111', market: 'Saudi', tienTe: 'SAR', gocId: '10', maGoc: 'gx',
    tenGoc: 'X', bac: [bac(1, 8900, 'SAR')], boBac: [], soDon: 11, tu: '2026-09-01', den: '2026-09-20' };
  const d = await dung(t, { tran: 1, them: [monX] });
  const m = await d.mo('qt', '/san-pham?xem=gia-tu-don');
  const o = (id) => m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]').find((x) => x.dataset.gtdChon === id);
  const bam = async (id, v) => { const x = o(id); x.checked = v; await x.onchange(); };
  await bam('41', false);                                       // từ chối A (đang chọn sẵn)
  await bam('42', true);                                        // chọn TW thay
  await m.$('[data-ap-gtd]').click(); await m.cho();            // áp TW ⇒ bảng [A, X]: A bỏ chọn, X chọn sẵn
  assert.deepEqual(m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]').map((x) => [x.dataset.gtdChon, x.checked]), [['41', false], ['46', true]]);
  await bam('41', true); await bam('41', false);                // đổi ý trên bảng mới: tích A rồi bỏ lại
  await m.$('[data-ap-gtd]').click(); await m.cho();            // áp X ⇒ bảng [A]
  assert.deepEqual(m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]').map((x) => [x.dataset.gtdChon, x.checked]), [['41', false]],
    'A vẫn là món người từ chối — không được chọn sẵn');
  assert.deepEqual(d.goi.filter((x) => x[0] === 'ap').map((x) => x[2].monIds), [['42'], ['46']]);
});

test('M10 · F4 (vòng 2) giá đơn gần nhất ≠ giá bậc ⇒ dòng TÔ + chữ «khác bậc» + KHÔNG chọn sẵn; người chọn tay được; 409 ⇒ phải chọn lại', async (t) => {
  const d = await dung(t, { lech: true, doiGiua: true });
  const m = await d.mo('qt', '/san-pham?xem=gia-tu-don');
  const hang = (id) => m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-mon]').find((h) => h.dataset.gtdMon === id);
  const o = (id) => m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]').find((x) => x.dataset.gtdChon === id);
  assert.equal(hang('41').getAttribute('data-muc'), 'warning', 'dòng A (bậc 99 · đơn gần nhất 89) được tô');
  assert.equal(hang('42').getAttribute('data-muc'), null, 'dòng khớp không tô');
  assert.match(hang('41').textContent, /89 SAR · 2026-09-20 — khác bậc/);
  assert.equal(o('41').checked, false, 'dòng lệch KHÔNG chọn sẵn');
  assert.equal(o('42').checked, true);
  assert.match(m.$('[data-ap-gtd]').textContent, /Áp dụng 1 món/);
  assert.match(m.$('#phai').textContent, /tô vạch cảnh báo[\s\S]*không chọn sẵn/);
  const oA = o('41'); oA.checked = true; await oA.onchange();   // người soát và chọn tay
  assert.match(m.$('[data-ap-gtd]').textContent, /Áp dụng 2 món/);
  await m.$('[data-ap-gtd]').click(); await m.cho();          // 409 ⇒ bảng mới chỉ còn A (vẫn lệch)
  assert.deepEqual(d.goi.filter((x) => x[0] === 'ap').map((x) => x[2].monIds), [['41', '42']]);
  assert.equal(o('41').checked, false, 'bảng mới sau 409: dòng lệch phải được chọn LẠI trên bảng mới (không mang lựa chọn tay qua bảng chưa thấy)');
});

test('M5 · màn: món hỏng giữa lượt ⇒ báo rõ món nào, vì sao; món khác vẫn báo đã điền; bỏ chọn hết ⇒ nút tắt', async (t) => {
  const d = await dung(t, { hongMot: true });
  const m = await d.mo('qt', '/san-pham?xem=gia-tu-don');
  await m.$('[data-ap-gtd]').click(); await m.cho();
  const phai = m.$('#phai').textContent;
  assert.match(phai, /Đã điền giá 1 món/);
  assert.match(phai, /1 món chưa điền.*219:vt.*không ghi đè/);
  assert.match(phai, /1 món đã lưu giá nhưng CHƯA đẩy được bản chép sang bot: 111:va — cửa ghi kho bot đang đóng/,
    'giá lưu mà bản chép chưa đẩy ⇒ nói ra, không gộp vào «đã điền» cho êm');
  const d2 = await dung(t);
  const m2 = await d2.mo('qt', '/san-pham?xem=gia-tu-don');
  for (const o of m2.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]')) { o.checked = false; await o.onchange(); }
  assert.ok(m2.$('[data-ap-gtd]').disabled, 'không chọn món nào ⇒ nút tắt');
});

test('M6 · màn: quá trần món mỗi lượt (/code-review #1) ⇒ chọn sẵn đúng trần, nói «áp xong bảng tải lại»; chọn thêm ⇒ nút tắt + nói bỏ bớt', async (t) => {
  const d = await dung(t, { tran: 1 });
  const m = await d.mo('qt', '/san-pham?xem=gia-tu-don');
  const o = (id) => m.$('#bangGiaTuDon').querySelectorAll('[data-gtd-chon]').find((x) => x.dataset.gtdChon === id);
  assert.ok(o('41').checked); assert.ok(!o('42').checked, 'món vượt trần không chọn sẵn');
  assert.match(m.$('[data-ap-gtd]').textContent, /Áp dụng 1 món/);
  assert.match(m.$('[data-tb-gtd]').textContent, /Mỗi lượt tối đa 1 món — áp xong, bảng tải lại để áp tiếp/);
  const o42 = o('42'); o42.checked = true; await o42.onchange();
  assert.ok(m.$('[data-ap-gtd]').disabled, 'chọn quá trần ⇒ nút tắt (máy chủ sẽ 400)');
  assert.match(m.$('[data-tb-gtd]').textContent, /Một lượt tối đa 1 món — bỏ chọn bớt 1 món/);
});

test('M7 · màn: bấm sang màn khác trong lúc lượt áp đang chạy (/code-review #3) ⇒ kết quả KHÔNG vẽ đè; báo bằng dòng nổi', async (t) => {
  const d = await dung(t, { chamAp: true });
  const m = await d.mo('qt', '/san-pham?xem=gia-tu-don');
  m.$('[data-ap-gtd]').click();   // không chờ — máy chủ đang giữ lượt áp
  await m.cho();
  await m.$('#nutThem').click(); await m.cho();   // «+ Thêm» ⇒ khung Gộp món
  const truoc = m.$('#phai').textContent;
  assert.doesNotMatch(truoc, /Điền giá từ đơn POS/);
  d.moCua(); await m.cho();
  assert.equal(m.$('#phai').textContent, truoc, 'kết quả về muộn không vẽ đè lên màn đang mở');
  assert.equal(m.location.search, '?xem=gop');
  assert.ok(m.loa.some((x) => /Đã điền giá 2 món từ đơn POS/.test(x)), `dòng nổi báo giá đã lưu: ${JSON.stringify(m.loa)}`);
});

test('M8 · màn: page bán nhiều món chỉ đếm MỘT lần trong «đẩy bản chép sang N page» (/code-review #5)', async (t) => {
  const d = await dung(t);
  const m = await d.mo('qt', '/san-pham?xem=gia-tu-don');
  await m.$('[data-ap-gtd]').click(); await m.cho();
  assert.match(m.$('#phai').textContent, /Đã điền giá 2 món/);
  assert.match(m.$('#phai').textContent, /Đẩy bản chép sang 2 page/, 'hai món cùng đẩy p1 · p2 ⇒ 2 page, không 4');
});
