// PHIẾU VE7a · «CÀI ĐẶT» THEO BẢN VẼ 4 — thứ tự cụm (Bắt đầu · Hệ còn sống · Kết nối · Model · Người và team · Nhật ký), «Vận
// hành» thôi là tab: ba việc của nó thành khối «Việc vận hành» ở «Hệ còn sống không», màn đủ mở bằng nút của từng việc.
// Script THẬT của màn Hệ còn sống chạy trong vm; payload `/api/van-hanh/tom-tat` dựng bằng HÀM THẬT (`tomTatViecVanHanh`) trên
// pool giả. Hành vi SQL trên Postgres thật: `test/ve7a-viec-van-hanh.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
const mh = await import('../../src/ui/chung/man-hinh.js');
const { VAI } = await import('../../src/auth/boi-canh.js');
const { tomTatViecVanHanh } = await import('../../src/ui/van-hanh/tom-tat.js');

const html = fs.readFileSync(new URL('../../src/ui/suc-khoe/trang/suc-khoe.html', import.meta.url), 'utf8');
const SCRIPT = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).find((x) => x.includes('window.UI'));

const tabCua = (v) => mh.menuCua([v]).find((n) => n.ma === 'cai-dat').man.filter((m) => m.cum === 'cai-dat' && (!m.an || m.trongCum));

test('C1 · cụm Cài đặt theo bản vẽ 4: Bắt đầu · Hệ còn sống · Kết nối · Model · Người và team · Nhật ký — «Vận hành» không còn là tab', () => {
  assert.deepEqual(tabCua(VAI.QUAN_TRI).map((m) => m.nhanCum), ['Bắt đầu', 'Hệ còn sống', 'Kết nối', 'Model', 'Người và team', 'Nhật ký']);
  const vh = mh.menuCua([VAI.QUAN_TRI]).flatMap((n) => n.man).find((m) => m.duong === '/van-hanh-v3');
  assert.ok(vh, 'Vận hành phải còn trong gói menu (tra vị trí, đường dẫn còn sống)');
  assert.equal(vh.an, true);
  assert.ok(!vh.trongCum, '«Vận hành» vẫn lên thanh tab');
  assert.equal(vh.moTuManKhac.thay, '/suc-khoe', 'lối vào đúng của Vận hành là khối «Việc vận hành» ở Hệ còn sống');
});

// Pool giả trả đúng hình dạng hàng mà ba câu SQL của hàm thật trả.
const poolGia = ({ loi = [3, 1], boQua = [7, 2], dienTap = 12 } = {}) => ({
  async query(sql) {
    if (/FROM tin_cho_xu_ly t WHERE t\.team_id/.test(sql)) return { rows: [{ tong: loi[0], khong_ro: loi[1] }] };
    if (/FROM nap_bo_qua/.test(sql)) return { rows: [{ tong: boQua[0], dang_ngo: boQua[1] }] };
    if (/g\.trang_thai = 'dien_tap'/.test(sql)) return { rows: [{ so_luot: dienTap, so_khach: 4, so_page: 2, tu_luc: null, den_luc: null }] };
    if (/FROM so_ai/.test(sql)) return { rows: [{ giua: null, lau_nhat: null, co_do: 0 }] };
    throw new Error('câu SQL lạ trong ca: ' + sql.slice(0, 60));
  },
});
const SUC_KHOE = { ok: true, tongThe: 'xanh', den: [{ ten: 'Cơ sở dữ liệu', muc: 'xanh', so: '12ms' }], dem: { do: 0, vang: 0, xam: 0, xanh: 1 } };
const menu = (duong) => ({ ok: true, nhom: [{ ma: 'cai-dat', man: duong.map((d) => ({ duong: d })) }] });

async function chay(cua) {
  // Khối «Việc vận hành» có sẵn trong HTML tĩnh, mang `hidden` — dựng sẵn như thế (script không chạm nó với vai không có cửa).
  const o = { '#viec-van-hanh': { innerHTML: '', textContent: '', dataset: {}, hidden: true } };
  const el = (s) => (o[s] ||= { innerHTML: '', textContent: '', dataset: {}, hidden: false });
  const goi = [];
  const UI = {
    esc: (s) => String(s ?? ''), text: (s) => String(s ?? ''), formatNumber: (n) => String(n),
    statusBadge: (_m, x = {}) => `<b>${x.label || ''}</b>`, alert: (x) => `<div class="alert">${x.title || ''} · ${x.body || ''}</div>`,
    button: (chu, x = {}) => `<a class="btn" href="${x.href || '#'}">${chu}</a>`,
    metricRow: (ds) => ds.map((m) => `[${m.label}: ${m.value}]`).join(''),
  };
  const ctx = vm.createContext({ window: { UI }, document: { querySelector: el }, console, setInterval: () => 0,
    location: { pathname: '/suc-khoe', href: '' },
    fetch: async (u) => { goi.push(String(u)); const tra = cua[String(u)];
      return tra ? { status: 200, ok: true, json: async () => tra } : { status: 503, ok: false, json: async () => ({ ok: false, thongDiep: 'cửa hỏng trong ca' }) }; } });
  vm.runInContext(SCRIPT, ctx);
  await new Promise((r) => setTimeout(r, 40));
  return { o, goi };
}

test('C2 · quản trị: khối «Việc vận hành» có ba việc với số THẬT + lối sang đúng tab của Vận hành', async () => {
  const tt = await tomTatViecVanHanh(poolGia(), { teamId: 't1' }, { V3_DIEN_TAP: '1' });
  const { o } = await chay({ '/api/suc-khoe': SUC_KHOE, '/api/dieu-huong': menu(['/suc-khoe', '/van-hanh-v3']), '/api/van-hanh/tom-tat': { ok: true, ...tt } });
  const k = o['#viec-van-hanh'];
  assert.equal(k.hidden, false);
  assert.match(k.innerHTML, /Tin cần đối chiếu[\s\S]*?<b class="so-lon">3<\/b>[\s\S]*?1 tin gửi không rõ kết quả[\s\S]*?href="\/van-hanh-v3\?tab=conversations">Đối chiếu/);
  assert.match(k.innerHTML, /Tin bị bộ lọc loại[\s\S]*?<b class="so-lon">7<\/b> \/ 24 giờ[\s\S]*?2 đáng ngờ[\s\S]*?href="\/van-hanh-v3\?tab=bo-qua">Xem theo cửa/);
  assert.match(k.innerHTML, /Diễn tập[\s\S]*?<b class="so-lon">12<\/b> lượt[\s\S]*?đang bật[\s\S]*?href="\/van-hanh-v3\?tab=dien-tap">Xem lượt diễn tập/);
});

test('C3 · marketer (không mở được Vận hành): KHÔNG khối, KHÔNG gọi cửa Vận hành (không ăn 403)', async () => {
  const { o, goi } = await chay({ '/api/suc-khoe': SUC_KHOE, '/api/dieu-huong': menu(['/suc-khoe']) });
  assert.equal(o['#viec-van-hanh'].hidden, true);
  assert.ok(!goi.includes('/api/van-hanh/tom-tat'), 'marketer vẫn gọi cửa Vận hành');
});

test('C4 · cửa tóm tắt HỎNG ⇒ nói không đọc được, không vẽ số 0; không có việc nào ⇒ nói «không có», không giấu khối', async () => {
  const hong = await chay({ '/api/suc-khoe': SUC_KHOE, '/api/dieu-huong': menu(['/suc-khoe', '/van-hanh-v3']) });
  assert.match(hong.o['#viec-van-hanh'].innerHTML, /Chưa đọc được việc vận hành · cửa hỏng trong ca/);
  assert.doesNotMatch(hong.o['#viec-van-hanh'].innerHTML, /so-lon">0</);
  const tt = await tomTatViecVanHanh(poolGia({ loi: [0, 0], boQua: [0, 0], dienTap: 0 }), { teamId: 't1' }, {});
  const rong = await chay({ '/api/suc-khoe': SUC_KHOE, '/api/dieu-huong': menu(['/suc-khoe', '/van-hanh-v3']), '/api/van-hanh/tom-tat': { ok: true, ...tt } });
  assert.match(rong.o['#viec-van-hanh'].innerHTML, /<b class="so-lon">0<\/b>[\s\S]*?Không tin nào chờ đối chiếu/);
  assert.match(rong.o['#viec-van-hanh'].innerHTML, /đang tắt/);
});
