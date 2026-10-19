// BH9 ④8 — CỜ ĐƠN NHÁP «tên lấy từ Facebook» · «COD ngầm» đi từ hồ sơ bot ⇒ `hang_cho_tao_don.du_lieu_don` ⇒ hai màn người duyệt nhìn
// (Hộp thư `theDon` + `moDon` — nhà của sale [S3]; màn Vận hành danh sách + hộp «Đơn #id») ⇒ sale sửa tên thì cờ tên mất.
// `chuanHoaHoSo` thuần · `luuDonCho` trên Postgres HỘP CÁT (`aicloser_v3_test_bh9m_p<pid>`; chỉ `docSanPhamGoiGia` bị giả — bảng giá
// không phải thứ đang đo) · Hộp thư chạy THẬT trong `vm` với DOM giả tối thiểu (đo chuỗi HTML hàm vẽ ra, không đọc mã nguồn).
// Nhánh KHÔNG chạm: màn Vận hành chạy thật (trang trình duyệt) — đo bằng hàm `canhDonNhap` rút từ tệp + chỗ gọi của nó.
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { dungSandbox } from '../db/sandbox.js';

const CO_TEN = 'Tên lấy từ Facebook — chưa xác nhận';
const CO_COD = 'COD ngầm — khách chưa nói đồng ý COD';

// `docSanPhamGoiGia` giả PHẢI cài trước khi nạp don-cho.js/hang-cho.js (mock.module chỉ đổi lượt nạp sau nó).
let sb, teamId, luuDonCho, chuanHoaHoSo;
before(async () => {
  mock.module('../src/products/catalog.js', {
    namedExports: {
      docSanPhamGoiGia: async () => [{ ma: 'P1', ten: 'Gel', het_hang: false, goiGia: [{ so_luong: 2, gia: 10900, tien_te: 'SAR' }] }],
    },
  });
  ({ luuDonCho } = await import('../v3/src/ui/van-hanh/don-cho.js'));
  ({ chuanHoaHoSo } = await import('../src/orders/hang-cho.js'));
  sb = await dungSandbox('bh9m');
  teamId = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
});
after(async () => { mock.restoreAll(); if (sb) await sb.don(); });

// ═══ M1 · chuanHoaHoSo ════════════════════════════════════════════════════════════════════════════════════════════════════════════
test('BH9 M1 · chuanHoaHoSo: cờ chỉ khi TRUE (vắng ⇒ không khoá) · tên rỗng ⇒ điền tên Facebook · tên ⊆ tên Facebook ⇒ cờ · tên khách tự gõ ⇒ không', () => {
  const coDon = { phone: '0501234567', address: 'Al Nahda 2 villa 5', city: 'Dubai', qty: 2 };
  const a = chuanHoaHoSo({ ...coDon, name: 'Maria', tenKhach: '', tenFb: 'Maria Santos', codNgam: true });
  assert.equal(a.ten_tu_facebook, true);
  assert.equal(a.cod_ngam, true);
  assert.equal(a.ten, 'Maria');
  const b = chuanHoaHoSo({ ...coDon, name: '', tenKhach: '', tenFb: 'Maria Santos' });
  assert.deepEqual([b.ten, b.ten_tu_facebook, 'cod_ngam' in b], ['Maria Santos', true, false]);
  const c = chuanHoaHoSo({ ...coDon, name: 'maria SANTOS', tenKhach: '', tenFb: 'Maria Santos' });
  assert.equal(c.ten_tu_facebook, true, 'so không phân biệt hoa thường');
  const d = chuanHoaHoSo({ ...coDon, name: 'Ana Cruz', tenKhach: 'Ana Cruz', tenFb: 'Maria Santos', codNgam: false });
  assert.equal('ten_tu_facebook' in d, false);
  assert.equal('cod_ngam' in d, false);
  const e = chuanHoaHoSo({ ...coDon, name: 'Ana Cruz', tenKhach: '', tenFb: 'Maria Santos' });
  assert.equal('ten_tu_facebook' in e, false, 'tên KHÔNG nằm trong tên Facebook ⇒ không cờ');
  // khuôn cũ (không mang tenFb/codNgam) ⇒ đúng các khoá cũ — dòng cũ giữ hình
  const cu = chuanHoaHoSo({ ...coDon, name: 'Amy', total_price: 109, currency: 'SAR' });
  assert.deepEqual(Object.keys(cu).sort(), ['dia_chi', 'kho_hang', 'san_pham_ma', 'sdt', 'so_luong', 'ten', 'thanh_pho', 'tien_te', 'tong_tien', 'tong_tien_lon']);
});

// ═══ M2 · luuDonCho — sale đổi tên ⇒ cờ tên mất; không đổi ⇒ còn ═══════════════════════════════════════════════════════════════════

async function donCho(du) {
  const p = (await sb.pool.query("INSERT INTO page (bot_ai_bat, team_id, page_id, ten) VALUES (true,$1,$2,'BH9M') RETURNING id", [teamId, `bh9m-${Math.random()}`])).rows[0].id;
  const h = (await sb.pool.query("INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu) VALUES ($1,$2,'KH','CLOSING','SALE') RETURNING id", [teamId, p])).rows[0].id;
  return (await sb.pool.query('INSERT INTO hang_cho_tao_don (team_id, hoi_thoai_id, du_lieu_don) VALUES ($1,$2,$3) RETURNING id', [teamId, h, JSON.stringify(du)])).rows[0].id;
}
const docDon = async (id) => (await sb.pool.query('SELECT xmin::text v, du_lieu_don FROM hang_cho_tao_don WHERE id=$1', [id])).rows[0];
test('BH9 M2 · luuDonCho: sale giữ tên ⇒ cờ còn · sale đổi tên ⇒ `ten_tu_facebook` mất (cod_ngam giữ)', async () => {
  const du = { ten: 'Maria Santos', sdt: '0501234567', dia_chi: 'Al Nahda 2 villa 5', thanh_pho: 'Dubai', kho_hang: '', san_pham_ma: 'P1',
    so_luong: 2, ten_tu_facebook: true, cod_ngam: true };
  const id = await donCho(du);
  const bc = { teamId: String(teamId), nguoiDungId: null };
  const than = (d, v) => ({ ten: d.ten, sdt: d.sdt, dia_chi: d.dia_chi, thanh_pho: d.thanh_pho, kho_hang: 'kho-1', san_pham_ma: 'P1', so_luong: 2, version: v });
  let r = await docDon(id);
  await luuDonCho(sb.pool, bc, id, than(r.du_lieu_don, r.v));
  r = await docDon(id);
  assert.equal(r.du_lieu_don.ten_tu_facebook, true, 'không đổi tên ⇒ cờ còn');
  await luuDonCho(sb.pool, bc, id, { ...than(r.du_lieu_don, r.v), ten: 'Maria Dela Cruz' });
  r = await docDon(id);
  assert.equal(r.du_lieu_don.ten, 'Maria Dela Cruz');
  assert.equal('ten_tu_facebook' in r.du_lieu_don, false, 'sale đã sửa tên ⇒ cờ tên phải mất');
  assert.equal(r.du_lieu_don.cod_ngam, true);
});

// ═══ M3 · Hộp thư — `theDon` + `moDon` chạy thật trong vm ════════════════════════════════════════════════════════════════════════
function dungHopThu(item) {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const UI = {
    esc, formatNumber: (n) => String(n),
    alert: ({ level, title, body }) => `<div class="alert" data-level="${level}"><b>${esc(title)}</b>${body ? ` ${esc(body)}` : ''}</div>`,
    statusBadge: (_s, o = {}) => `<span class="badge">${esc(o.label || '')}</span>`,
  };
  const stub = () => {
    const o = { value: '', checked: false, disabled: false, textContent: '', innerHTML: '', dataset: {},
      addEventListener() {}, scrollIntoView() {}, focus() {}, querySelectorAll: () => [], querySelector: () => stub() };
    return o;
  };
  const window = { UI };
  const ctx = vm.createContext({
    window, console, encodeURIComponent, Number, String, Object, Array, Set, Map, Date, JSON, Promise,
    location: { pathname: '/hop-thu', href: '' },
    fetch: async () => ({ status: 200, ok: true, json: async () => ({ ok: true, item, products: [{ ma: 'P1', ten: 'Gel', goiGia: [] }], currencyFactors: {}, posGhiMo: true }) }),
  });
  vm.runInContext(fs.readFileSync(new URL('../v3/src/ui/hop-thu/trang/hop-thu-ui.js', import.meta.url), 'utf8'), ctx);
  const noi = () => { const n = stub(); let html = ''; Object.defineProperty(n, 'innerHTML', { get: () => html, set: (v) => { html = String(v); } }); return n; };
  return { HopThu: window.HopThu, noi };
}
const DON_CO = { id: '7', trang_thai: 'cho_duyet', version: '1', tao_luc: Date.now(), cua_kiem: {},
  du_lieu_don: { ten: 'Maria Santos', sdt: '0501234567', dia_chi: 'Al Nahda', thanh_pho: 'Dubai', so_luong: 2, san_pham_ma: 'P1', ten_tu_facebook: true, cod_ngam: true } };
const DON_VANG = { ...DON_CO, du_lieu_don: { ...DON_CO.du_lieu_don, ten_tu_facebook: undefined, cod_ngam: undefined } };
test('BH9 M3 · Hộp thư [S3]: thẻ đơn `theDon` + form `moDon` hiện «Tên lấy từ Facebook — chưa xác nhận» / «COD ngầm» khi có cờ, KHÔNG hiện khi vắng', async () => {
  for (const [item, co] of [[DON_CO, true], [DON_VANG, false]]) {
    const { HopThu, noi } = dungHopThu(item);
    assert.ok(HopThu?.theDon && HopThu?.moDon, 'không dựng được window.HopThu');
    const a = noi(); await HopThu.theDon({ id: '7', tongTien: 10900, tienTe: 'SAR' }, a, {});
    const b = noi(); await HopThu.moDon('7', b, {});
    for (const [ten, html] of [['theDon', a.innerHTML], ['moDon', b.innerHTML]]) {
      assert.equal(html.includes(CO_TEN), co, `${ten}: cờ tên ${co ? 'thiếu' : 'thừa'}`);
      assert.equal(html.includes(CO_COD), co, `${ten}: cờ COD ${co ? 'thiếu' : 'thừa'}`);
    }
    if (co) assert.ok(b.innerHTML.indexOf(CO_TEN) < b.innerHTML.indexOf('Tôi đã kiểm tra thông tin đã lưu'), 'cờ phải đứng TRÊN ô xác nhận');
  }
});

test('BH9 M5 · /code-review #15: đơn ĐÃ xử lý ⇒ thẻ không hiện cờ · form mở NGAY trong thẻ (`anCoDon`) không in cờ lần hai', async () => {
  const daDuyet = { ...DON_CO, trang_thai: 'da_duyet' };
  const { HopThu, noi } = dungHopThu(daDuyet);
  const a = noi(); await HopThu.theDon({ id: '7', tongTien: 10900, tienTe: 'SAR' }, a, {});
  assert.equal(a.innerHTML.includes(CO_TEN), false, 'đơn đã duyệt vẫn hiện cờ «sửa trước khi duyệt»');
  const h2 = dungHopThu(DON_CO);
  const b = h2.noi(); await h2.HopThu.moDon('7', b, { anCoDon: true });
  assert.equal(b.innerHTML.includes(CO_TEN), false, 'form trong thẻ in cờ lần hai');
  const src = fs.readFileSync(new URL('../v3/src/ui/hop-thu/trang/hop-thu-ui.js', import.meta.url), 'utf8');
  assert.match(src, /moDon\(o\.id, form, \{ tapTrung: b\.dataset\.mo,[\s\S]{0,120}?anCoDon: true \}\)/, 'thẻ phải mở form với anCoDon');
});

// ═══ M4 · màn Vận hành — danh sách + hộp «Đơn #id» ═══════════════════════════════════════════════════════════════════════════════
test('BH9 M4 · màn Vận hành: `canhDonNhap(du)` trả hai chuỗi khi cờ, rỗng khi vắng · được gọi ở CẢ danh sách lẫn hộp «Đơn #id»', () => {
  const js = fs.readFileSync(new URL('../v3/src/ui/van-hanh/trang/van-hanh.js', import.meta.url), 'utf8');
  const m = js.match(/function canhDonNhap\(du\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'van-hanh.js chưa có hàm canhDonNhap(du)');
  const canhDonNhap = new Function(`${m[0]}; return canhDonNhap;`)();
  assert.deepEqual(canhDonNhap({ ten_tu_facebook: true, cod_ngam: true }).map((s) => s.replace(/^⚠️\s*/, '')), [CO_TEN, CO_COD]);
  assert.deepEqual(canhDonNhap({ ten: 'x' }), []);
  assert.deepEqual(canhDonNhap({ cod_ngam: true }).length, 1);
  const goi = [...js.matchAll(/canhDonNhap\(([^)]*)\)/g)].map((x) => x[1]).filter((x) => x !== 'du');
  assert.ok(goi.some((x) => /item\.du_lieu_don/.test(x)), `danh sách không gọi canhDonNhap: ${goi}`);
  assert.ok(goi.some((x) => /\bdata\b|o\.du_lieu_don/.test(x)), `hộp «Đơn #id» không gọi canhDonNhap: ${goi}`);
});
