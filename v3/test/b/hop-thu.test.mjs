// PHIẾU LL2 · HỘP THƯ — thước của module GHI `ui/hop-thu` + phần đọc mới của bàn hội thoại.
//
// §10 bổ sung (CR-28-09c) cho sale thêm đúng ba việc trên hệ: nhận thay bot · sửa/duyệt/loại đơn
// Messenger · tìm khách. Vế cấm của §10 GIỮ NGUYÊN: không ô soạn tin, không đường gửi tin. Bàn hội
// thoại vẫn chỉ đọc (thước `ban-hoi-thoai-khong-gui`); mọi lời gọi ghi dồn vào module này, và
// tệp này canh bốn cửa của nó: đồ thị import · danh sách đường · cái chắn · script giao diện.
// Hành vi thật trên Postgres (duyệt tạo đúng một đơn POS, nhận thay bot đẻ một việc): `test/ll2-hop-thu.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';

import { taoBoiCanh, VAI } from '../../src/auth/boi-canh.js';
import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import { datTaoTruyVan } from '../../src/ui/dispatch/index.js';
import { donCho, donChoDuyetCua, boiCanhHoiThoai, danhSachHoiThoai } from '../../src/ui/ban-hoi-thoai/index.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const MODULE = path.join(GOC, 'v3/src/ui/hop-thu');
const rel = (f) => path.relative(GOC, f);

/** Đồ thị import TĨNH bắc cầu + mọi `import('…')` động. */
function doThi(goc) {
  const tep = new Set(); const dong = new Set();
  const di = (f) => {
    if (tep.has(f) || !fs.existsSync(f)) return;
    tep.add(f);
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]/g)) {
      if (m[1].startsWith('.')) di(path.resolve(path.dirname(f), m[1]));
    }
    for (const m of s.matchAll(/import\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) dong.add(`${rel(f)} → ${m[1]}`);
  };
  for (const f of goc) di(f);
  return { tep: [...tep].map(rel).sort(), dong: [...dong].sort() };
}

/* ═══ H1 · không đường nào tới chỗ gửi tin cho khách ═══ */
test('H1 · đồ thị import của Hộp thư KHÔNG chạm đường gửi tin (Pancake gửi · hàng gửi · kênh · bộ não)', () => {
  const { tep, dong } = doThi(fs.readdirSync(MODULE).filter((x) => x.endsWith('.js')).map((x) => path.join(MODULE, x)));
  // Đường gửi của hệ: `src/pancake.js` (gửi tin), `src/queue/lan-gui.js` (lượt gửi), kênh WhatsApp/Messenger,
  // và năm tệp bộ não. Duyệt đơn đi POS (tạo đơn) — đó là đường TIỀN, không phải tin tới khách.
  const CAM = [/^src\/pancake\.js$/, /^src\/queue\/lan-gui\.js$/, /channels\//, /^src\/(prompts|closer|tools|fast-lane|outbound-guard)\.js$/];
  const cham = tep.filter((f) => CAM.some((re) => re.test(f)));
  assert.deepEqual(cham, [], `Hộp thư import tới đường gửi tin: ${cham.join(', ')}`);
  assert.ok(tep.includes('src/orders/hang-cho.js'), 'thước đo nhầm chỗ — không thấy đường duyệt đơn trong đồ thị');
  const dongCham = dong.filter((x) => /pancake|lan-gui|channels|closer|tools/.test(x));
  assert.deepEqual(dongCham, [], 'nạp động tới đường gửi tin');
});

/* ═══ H2 · danh sách đường = đúng những gì §10 bổ sung cho phép ═══ */
test('H2 · Hộp thư có ĐÚNG chín đường; không đường nào là gửi tin', async () => {
  const { taoRouterHopThu } = await import('../../src/ui/hop-thu/index.js');
  const ds = taoRouterHopThu().stack.filter((l) => l.route)
    .map((l) => `${Object.keys(l.route.methods).filter((k) => l.route.methods[k]).join(',').toUpperCase()} ${l.route.path}`);
  assert.deepEqual(ds.sort(), [
    'GET /api/hop-thu/don-cho',
    'GET /api/hop-thu/don/:id',
    'GET /api/hop-thu/khach/:id',
    'GET /api/hop-thu/tim-khach',
    'GET /hop-thu/hop-thu-ui.js',
    'POST /api/hop-thu/don/:id/duyet',
    'POST /api/hop-thu/don/:id/loai',
    'POST /api/hop-thu/don/:id/luu',
    'POST /api/hop-thu/hoi-thoai/:id/nhan',
  ]);
  assert.ok(!ds.some((d) => /\/(gui|tin|soan|tra-loi)\b/.test(d)), 'đường gửi tin mọc ở Hộp thư');
});

/* ═══ H3 · cái chắn: đăng nhập · vai · rào ghi · chưa nối ═══ */
async function chayApp(boiCanh, vec) {
  const { taoRouterHopThu } = await import('../../src/ui/hop-thu/index.js');
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { if (boiCanh) req.boiCanh = boiCanh; next(); });
  app.use(taoRouterHopThu({ pool: null }));
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, '127.0.0.1', r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  try { return await vec(goc); } finally { await new Promise((r) => sv.close(r)); }
}
const bc = (vai) => taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [vai] });
const GHI = { method: 'POST', headers: { 'content-type': 'application/json', 'X-V3-Action': '1' }, body: '{}' };

test('H3 · chưa đăng nhập 401 · marketer 403 · ghi thiếu X-V3-Action 403 · chưa nối CSDL 503 — theo đúng thứ tự', async () => {
  assert.equal(await chayApp(null, (g) => fetch(g + '/api/hop-thu/don/1').then((r) => r.status)), 401);
  assert.equal(await chayApp(bc(VAI.MARKETER), (g) => fetch(g + '/api/hop-thu/don/1').then((r) => r.status)), 403);
  assert.equal(await chayApp(bc(VAI.MARKETER), (g) => fetch(g + '/hop-thu/hop-thu-ui.js').then((r) => r.status)), 403);
  const thieuDau = await chayApp(bc(VAI.SALE), (g) => fetch(g + '/api/hop-thu/don/1/duyet',
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then((r) => r.status));
  assert.equal(thieuDau, 403, 'lệnh ghi thiếu đầu X-V3-Action phải bị chặn trước khi chạm CSDL');
  for (const [duong, tuy] of [['/api/hop-thu/don/1', undefined], ['/api/hop-thu/don/1/duyet', GHI],
    ['/api/hop-thu/hoi-thoai/1/nhan', GHI], ['/api/hop-thu/tim-khach?sdt=1', undefined]]) {
    const st = await chayApp(bc(VAI.SALE), (g) => fetch(g + duong, tuy).then((r) => r.status));
    assert.equal(st, 503, `${duong}: sale đi qua chắn, chưa nối CSDL ⇒ 503 «chưa nối», không đoán`);
  }
  // Quản trị cũng vào được (Hộp thư = vai của bàn hội thoại).
  assert.equal(await chayApp(bc(VAI.QUAN_TRI), (g) => fetch(g + '/api/hop-thu/don/1').then((r) => r.status)), 503);
});

/* ═══ H4 · script giao diện — không ô soạn, chỉ gọi đường của Hộp thư ═══ */
test('H4 · hop-thu-ui.js: không textarea/contenteditable/ô nhập tự do ngoài trường đơn · mọi lời gọi tới /api/hop-thu/ · POST chỉ bốn việc', () => {
  const js = fs.readFileSync(path.join(MODULE, 'trang/hop-thu-ui.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/textarea|contenteditable/i.test(js), 'ô soạn tin trong khối Hộp thư');
  // Ô nhập duy nhất được tạo là trường của FORM ĐƠN (mã `hd-…`: tên · số · địa chỉ · thành phố · kho · số
  // lượng · xác nhận · lý do loại). Ô tìm khách dùng lại ô tìm của trang — khối này không tự đẻ ô nào khác.
  const oNhap = [...js.matchAll(/<input\b[^>]*\bid="([^"$]*)/g)].map((m) => m[1]);
  assert.ok(oNhap.length >= 3, `chỉ thấy ${oNhap.length} ô nhập — thước đo nhầm chỗ`);
  assert.deepEqual(oNhap.filter((x) => !x.startsWith('hd-')), [], 'ô nhập ngoài form đơn trong khối Hộp thư');
  assert.equal((js.match(/\bfetch\(/g) || []).length, 1, 'MỘT lời fetch (hàm goi) — thêm lời gọi thì soát lại thước này');
  const duong = [...js.matchAll(/goi\(\s*[`'"]([^`'"]+)[`'"]/g)].map((m) => m[1]);
  assert.ok(duong.length >= 6, `chỉ thấy ${duong.length} lời gọi — thước đo nhầm chỗ`);
  assert.deepEqual(duong.filter((d) => !d.startsWith('/api/hop-thu/')), [], 'khối Hộp thư gọi ra ngoài đường của nó');
  // Lời gọi GHI = lời gọi có đối số thứ hai (than). Đúng bốn: lưu · duyệt · loại · nhận thay bot.
  const ghi = [...js.matchAll(/goi\(\s*`([^`]+)`\s*,/g)].map((m) => m[1].replace(/\$\{[^}]+\}/g, ':id')).sort();
  assert.deepEqual(ghi, ['/api/hop-thu/don/:id/duyet', '/api/hop-thu/don/:id/loai', '/api/hop-thu/don/:id/luu',
    '/api/hop-thu/hoi-thoai/:id/nhan']);
  assert.ok(!/https?:\/\//.test(js), 'khối Hộp thư gọi ra máy ngoài');
});

/* ═══ H5 · đọc Đơn chờ + đơn chờ của một hội thoại (qua cổng kẹp team, dữ liệu giả) ═══ */
const BAY = Date.parse('2026-09-29T10:00:00Z');
function dung() {
  const kho = new KhoGia({
    page: [{ id: 'p1', team_id: 't1', page_id: '102938', ten: 'Pialpha Store' },
           { id: 'p2', team_id: 't2', page_id: '556677', ten: 'Store team hai' }],
    hoi_thoai: [
      { id: 'h1', team_id: 't1', page_id: 'p1', psid: '11', khach_id: null, trang_thai: 'CLOSING', chu_so_huu: 'AI', cham_luc: BAY - 60_000 },
      { id: 'h2', team_id: 't2', page_id: 'p2', psid: '22', khach_id: null, trang_thai: 'CLOSING', chu_so_huu: 'AI', cham_luc: BAY - 60_000 },
    ],
    hang_cho_tao_don: [
      { id: 'q1', team_id: 't1', hoi_thoai_id: 'h1', trang_thai: 'cho_duyet', tao_luc: BAY - 600_000,
        du_lieu_don: { ten: 'Sara', sdt: '+971500000777', so_luong: 2, tong_tien: 19900, tien_te: 'AED', san_pham_ma: 'x' } },
      { id: 'q_cu', team_id: 't1', hoi_thoai_id: 'h1', trang_thai: 'tu_choi', tao_luc: BAY - 900_000, du_lieu_don: {} },
      { id: 'q_t2', team_id: 't2', hoi_thoai_id: 'h2', trang_thai: 'cho_duyet', tao_luc: BAY, du_lieu_don: { ten: 'Khác team' } },
    ],
    viec_can_xu_ly: [],
    don_hang: [
      { id: 'd_wa', team_id: 't1', nguon: 'trang_ban_hang', trang_thai_he: 'da_gui_wa', ma_pos: '77:9', tong_tien: 100, tien_te: 'SAR', page_id: 'p1', tao_luc: BAY },
      { id: 'd_cu', team_id: 't1', nguon: 'trang_ban_hang', trang_thai_he: 'moi_tu_pos', ma_pos: '77:8', tao_luc: BAY },
      { id: 'd_mess', team_id: 't1', nguon: 'messenger', trang_thai_he: 'da_gui_wa', ma_pos: '77:7', tao_luc: BAY },
    ],
  });
  datTaoTruyVan((b) => taoTruyVanGia(kho, b));
}

test('H5 · Đơn chờ: Messenger chờ duyệt + Ladi ở nhánh WhatsApp — CHỈ team mình, không lẫn đơn đã loại/đơn thường', async () => {
  dung();
  const d = await donCho(bc(VAI.SALE), { bay: BAY });
  assert.deepEqual(d.messenger.map((x) => [x.id, x.hoiThoaiId, x.ten, x.tenPage]), [['q1', 'h1', 'Sara', 'Pialpha Store']]);
  assert.deepEqual(d.ladi.map((x) => [x.id, x.trangThaiChu]), [['d_wa', 'Đã gửi WhatsApp, chờ khách']],
    'Ladi = nguồn trang_ban_hang ĐANG ở nhánh WhatsApp; đơn mới về từ POS (chưa vào máy) và đơn Messenger không vào');
  assert.deepEqual(d.dem, { messenger: 1, viecDon: 0, ladi: 1 });
});

test('H6 · bối cảnh hội thoại mang đơn chờ duyệt mới nhất — đơn đã loại không tính', async () => {
  dung();
  const x = await boiCanhHoiThoai(bc(VAI.SALE), 'h1');
  assert.equal(x.donChoDuyet.id, 'q1');
  assert.equal(x.donChoDuyet.soDon, 1);
  assert.equal(x.donChoDuyet.tongTien, 19900);
  assert.equal(await boiCanhHoiThoai(bc(VAI.SALE), 'h2'), null, 'hội thoại team khác ⇒ null (router 404)');
  assert.equal(donChoDuyetCua([]), null);
  assert.equal(donChoDuyetCua([{ id: 'a', trang_thai: 'da_duyet' }]), null);
  assert.equal(donChoDuyetCua([{ id: 'a', trang_thai: 'cho_duyet', tao_luc: 1, du_lieu_don: {} },
    { id: 'b', trang_thai: 'cho_duyet', tao_luc: 2, du_lieu_don: {} }]).id, 'b', 'hai đơn chờ ⇒ mở đơn MỚI NHẤT');
});

test('H7 · `?ht=` mở thẳng MỘT hội thoại (từ Đơn chờ / tìm khách) — team khác ra rỗng, mã lạ ra rỗng', async () => {
  dung();
  const d = await danhSachHoiThoai(bc(VAI.SALE), { loc: 'nguoi', ht: 'h1', bay: BAY });
  assert.deepEqual(d.items.map((x) => x.id), ['h1'], 'ht thắng lát «Cần người» (h1 không có việc mở)');
  assert.equal(d.nguonDs, 'mot');
  assert.deepEqual((await danhSachHoiThoai(bc(VAI.SALE), { ht: 'h2', bay: BAY })).items, [], 'hội thoại team khác');
  assert.deepEqual((await danhSachHoiThoai(bc(VAI.SALE), { ht: "1' OR 1=1", bay: BAY })).items, [], 'mã lạ không đi xuống cổng');
});
