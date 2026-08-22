// L4-M1 · đường HTTP — tiêu chí 1 · 2 · 3 · 4 · 10, chạy trên MỘT MÁY CHỦ THẬT
// (`node:http`, cổng 0) rồi `fetch` vào. Không thêm supertest, không thêm gói nào.
//
// Hai cái chắn đăng nhập/vai ở đây được viết TẠI CHỖ, đúng hình dạng của `batBuocDangNhap`
// và `batBuocVaiHTTP` bên L0-M3 — vì spec cấm `import '../../auth/…'` (trừ `boi-canh.js`).
// Test tự dựng lấy hai cái chắn cũng là cách kiểm luôn cái hợp đồng tiêm phụ thuộc: nối
// được bằng hai hàm bất kỳ đúng hình dạng thì nối được bằng hàm thật.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import {
  datTaoTruyVan, datChanDangNhap, datChanVai, datPheuNhatKy,
  taoRouterDieuPhoi, VAI_VAO_DUOC, BIEN_MAU_POS, MAU_POS_MAC_DINH,
} from '../../src/ui/dispatch/index.js';

const BAY = Date.parse('2026-08-22T10:00:00.000Z');
const phut = (n) => n * 60000;

/* ────────────────────────────────── hạt giống ────────────────────────────────── */

const kho = new KhoGia({
  viec_can_xu_ly: [
    {
      id: 'v1', team_id: 't1', loai: 'hoi_thoai', trang_thai: 'cho', ly_do_ma: 'khieu_nai',
      page_id: 'p1', cust_id: 'k1', conv_id: 'c9', don_hang_id: null,
      tao_luc: BAY - phut(12), han_luc: BAY - phut(2),          // quá hạn 2 phút
    },
    {
      id: 'v2', team_id: 't1', loai: 'hoi_thoai', trang_thai: 'dang_xu', ly_do_ma: 'ngoai_kich_ban',
      page_id: 'p1', cust_id: 'k1', conv_id: 'c9',
      tao_luc: BAY - phut(4), han_luc: BAY + phut(6),
    },
    {
      id: 'v3', team_id: 't1', loai: 'don', trang_thai: 'cho', ly_do_ma: 'don_can_duyet',
      page_id: 'p1', cust_id: 'k1', conv_id: 'c9', don_hang_id: 'd1',
      tao_luc: BAY - phut(1), han_luc: BAY + phut(9),
    },
    {
      id: 'v_t2', team_id: 't2', loai: 'hoi_thoai', trang_thai: 'cho', ly_do_ma: 'doi_tra',
      page_id: 'p2', cust_id: 'k2', conv_id: 'c8',
      tao_luc: BAY - phut(3), han_luc: BAY + phut(7),
    },
  ],
  khach: [
    { id: 'k1', team_id: 't1', ten: 'Nguyễn Thu Hà', so_dien_thoai: '0901234567' },
    { id: 'k2', team_id: 't2', ten: 'Khách team hai', so_dien_thoai: '0909999999' },
  ],
  page: [
    { id: 'p1', team_id: 't1', ten: 'Tiểu Alpha Store', shop_id: '77' },
    { id: 'p2', team_id: 't2', ten: 'Auus Store' },
  ],
  hoi_thoai: [{ id: 'ht1', team_id: 't1', conv_id: 'c9', page_id: 'p1', cust_id: 'k1' }],
  don_hang: [{ id: 'd1', team_id: 't1', ma_don: 'SO-1024', tong_tien: 249000 }],
  so_ai: [
    { id: 's1', team_id: 't1', page_id: 'p1', cust_id: 'k1', thoi_gian: BAY - phut(20), ben: 'khach', chu: 'hàng lỗi rồi' },
    { id: 's2', team_id: 't1', page_id: 'p1', cust_id: 'k1', thoi_gian: BAY - phut(19), ben: 'bot', chu: 'em xin lỗi chị', ma_model: 'kimi-k2.6' },
  ],
});

const anh = () => JSON.stringify([...kho.bang.entries()].map(([k, v]) => [k, v]));

datTaoTruyVan((bc) => taoTruyVanGia(kho, bc));

let nhatKy = [];
datPheuNhatKy((boiCanh, ban) => { nhatKy.push({ boiCanh, ...ban }); return ban; });
const donNhatKy = () => { nhatKy = []; };
const coNhatKy = (ma) => nhatKy.filter((n) => n.hanhDong === ma);

/* ─────────── hai cái chắn của L0-M3, dựng lại đúng hình dạng để tiêm vào ─────────── */

const chanDangNhap = () => (req, res, next) => (
  req.boiCanh ? next() : res.status(401).json({ ok: false, ma: 'chua_dang_nhap', thongDiep: 'Chưa đăng nhập.' })
);

const chanVai = (...vai) => {
  const can = vai.flat().filter(Boolean).map(String);
  return (req, res, next) => {
    if (!req.boiCanh) return res.status(401).json({ ok: false, ma: 'chua_dang_nhap', thongDiep: 'Chưa đăng nhập.' });
    if (can.some((v) => req.boiCanh.vai.includes(v))) return next();
    nhatKy.push({ boiCanh: req.boiCanh, hanhDong: 'thieu_vai', doiTuongId: req.originalUrl });
    return res.status(403).json({ ok: false, ma: 'thieu_vai', thongDiep: 'Không đủ quyền.' });
  };
};

datChanDangNhap(chanDangNhap);
datChanVai(chanVai);

/* ────────────────────────────────── máy chủ thật ────────────────────────────────── */

const app = express();
// Đóng vai `lopBoiCanh()` của L0-M3: đọc vé → `req.boiCanh`. Ở đây đọc từ tiêu đề cho gọn.
app.use((req, _res, next) => {
  const team = req.headers['x-thu-team'];
  if (team) {
    req.boiCanh = {
      nguoiDungId: 'u_' + team, tenDangNhap: 'an', teamId: String(team),
      vai: String(req.headers['x-thu-vai'] || 'sale').split(','), nguon: 'phien', ip: null,
    };
  }
  next();
});
app.use(taoRouterDieuPhoi({ dongHo: () => BAY }));

const server = http.createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
server.unref();
const goc = `http://127.0.0.1:${server.address().port}`;
after(() => new Promise((r) => server.close(r)));

async function goi(duong, { team, vai } = {}) {
  const headers = {};
  if (team) headers['x-thu-team'] = team;
  if (vai) headers['x-thu-vai'] = vai;
  const res = await fetch(goc + duong, { headers });
  const kieu = res.headers.get('content-type') || '';
  const than = kieu.includes('json') ? await res.json().catch(() => null) : await res.text();
  return { res, than, kieu };
}

const nhu = (duong) => goi(duong, { team: 't1', vai: 'sale' });

/* ────────────────────────────────── hai trang ────────────────────────────────── */

test('L4-M1 HTTP · GET /dieu-phoi trả trang hai danh sách', async () => {
  const { res, than, kieu } = await nhu('/dieu-phoi');
  assert.equal(res.status, 200);
  assert.match(kieu, /text\/html/);
  assert.match(than, /Bảng điều phối/);
  assert.match(than, /Hội thoại cần xử/);
  assert.match(than, /Đơn cần xử/);
  assert.match(than, /Không có việc nào đang chờ/);
  // Đếm ngược chạy phía trình duyệt, KHÔNG hỏi máy chủ mỗi giây.
  assert.match(than, /setInterval\(nhipDongHo, 1000\)/);
  assert.match(than, /CHU_KY_TAI_MS = 15000/);
  // Màn này cố ý nghèo nàn: không ô soạn tin, không nút gửi.
  assert.ok(!/<textarea/.test(than), 'màn điều phối mọc ô soạn tin — xem 01-QUYET-DINH mục 10');
});

test('L4-M1 HTTP · GET /viec/:id trả trang chi tiết, có sẵn ô rỗng cho L4-M2', async () => {
  const { res, than } = await nhu('/viec/v1');
  assert.equal(res.status, 200);
  assert.match(than, /Mở Pancake/);
  assert.match(than, /Mở POS/);
  assert.match(than, /id="o-dong-viec"><\/div>/);
  assert.match(than, /target="_blank" rel="noopener"/);
  assert.ok(!/<textarea/.test(than), 'màn chi tiết mọc ô soạn tin');
});

/* ─────────────────────────── tiêu chí 2 · hai danh sách ─────────────────────────── */

test('L4-M1 HTTP · hang-cho trả hai danh sách, gần hết giờ nhất lên đầu', async () => {
  const { res, than } = await nhu('/api/dieu-phoi/hang-cho');
  assert.equal(res.status, 200);
  assert.equal(than.ok, true);
  assert.equal(than.bay, BAY);
  assert.deepEqual(than.hoiThoai.map((v) => v.id), ['v1', 'v2']);
  assert.deepEqual(than.don.map((v) => v.id), ['v3']);
  assert.equal(than.hoiThoai[0].lyDoChu, 'Khách khiếu nại');
  assert.equal(than.hoiThoai[0].quaHan, true);
  assert.equal(than.hoiThoai[0].tenKhach, 'Nguyễn Thu Hà');
  assert.equal(than.hoiThoai[0].tenPage, 'Tiểu Alpha Store');
});

test('L4-M1 HTTP · đăng nhập team A thì không có MỘT DÒNG NÀO của team B', async () => {
  const a = (await nhu('/api/dieu-phoi/hang-cho')).than;
  const moiDong = [...a.hoiThoai, ...a.don];
  assert.ok(moiDong.length > 0);
  assert.ok(moiDong.every((v) => v.team_id === 't1'), 'lọt dòng team khác');
  assert.ok(!moiDong.some((v) => v.id === 'v_t2'));

  const b = (await goi('/api/dieu-phoi/hang-cho', { team: 't2', vai: 'sale' })).than;
  assert.deepEqual([...b.hoiThoai, ...b.don].map((v) => v.id), ['v_t2']);
});

test('L4-M1 HTTP · ?loai= lọc đúng một danh sách', async () => {
  const { than } = await nhu('/api/dieu-phoi/hang-cho?loai=don');
  assert.equal(than.loai, 'don');
  assert.deepEqual(than.don.map((v) => v.id), ['v3']);
  assert.deepEqual(than.hoiThoai, []);

  const xau = await nhu('/api/dieu-phoi/hang-cho?loai=lung_tung');
  assert.equal(xau.res.status, 400);
  assert.equal(xau.than.ma, 'loai_la');
});

test('L4-M1 HTTP · tom-tat đếm đúng và bật báo động khi có việc quá hạn', async () => {
  const { than } = await nhu('/api/dieu-phoi/tom-tat');
  assert.deepEqual(than.hoiThoai, { cho: 2, quaHan: 1 });
  assert.deepEqual(than.don, { cho: 1, quaHan: 0 });
  assert.equal(than.quaHanTong, 1);
  assert.equal(than.cuNhat.id, 'v1');
  assert.equal(than.cuNhat.phutQuaHan, 2);
});

/* ─────────────────────────── tiêu chí 3 · 404 chứ không 403 ─────────────────────────── */

test('L4-M1 HTTP · việc của team B → 404, KHÔNG phải 403 (403 là xác nhận nó có thật)', async () => {
  const { res, than } = await nhu('/api/dieu-phoi/viec/v_t2');
  assert.equal(res.status, 404);
  assert.notEqual(res.status, 403);
  assert.equal(than.ma, 'khong_thay');

  // Cùng id đó, đúng team, thì mở được — chứng minh 404 kia là do lớp team chứ không do hỏng.
  const cuaChu = await goi('/api/dieu-phoi/viec/v_t2', { team: 't2', vai: 'sale' });
  assert.equal(cuaChu.res.status, 200);
  assert.equal(cuaChu.than.viec.id, 'v_t2');
});

test('L4-M1 HTTP · id không có thật cũng 404, y hệt id của team khác', async () => {
  const { res, than } = await nhu('/api/dieu-phoi/viec/khong-co-that');
  assert.equal(res.status, 404);
  assert.equal(than.ma, 'khong_thay');
});

test('L4-M1 HTTP · chi tiết trả đủ ba khối và hai đường nhảy', async () => {
  const cu = process.env[BIEN_MAU_POS];
  process.env[BIEN_MAU_POS] = MAU_POS_MAC_DINH;
  try {
    const { than } = await nhu('/api/dieu-phoi/viec/v3');
    assert.equal(than.lyDoChu, 'Đơn bot chốt, chờ sale duyệt');
    assert.equal(than.donHang.ma_don, 'SO-1024');
    assert.deepEqual(than.doanChat.map((t) => t.ben), ['khach', 'bot']);
    assert.equal(than.lienKet.pancake, 'https://pancake.vn/p1?c_id=c9');
    assert.equal(than.lienKet.pos, 'https://pos.pages.fm/shops/77/orders/d1');

    const chat = (await nhu('/api/dieu-phoi/viec/v1')).than;
    assert.equal(chat.donHang, null, 'việc hội thoại không có đơn → null, không ném');
  } finally {
    if (cu === undefined) delete process.env[BIEN_MAU_POS]; else process.env[BIEN_MAU_POS] = cu;
  }
});

/* ─────────────────────── tiêu chí 4 · ?team_id= của team khác ─────────────────────── */

test('L4-M1 HTTP · ?team_id=<team khác> → 403 chan_xuyen_team, CÓ ghi nhật ký', async () => {
  for (const duong of [
    '/api/dieu-phoi/hang-cho?team_id=t2',
    '/api/dieu-phoi/tom-tat?team_id=t2',
    '/api/dieu-phoi/viec/v1?team_id=t2',
    '/dieu-phoi?team_id=t2',
  ]) {
    donNhatKy();
    const { res, than } = await nhu(duong);
    assert.equal(res.status, 403, duong);
    assert.equal(than.ma, 'chan_xuyen_team', duong);
    const ghi = coNhatKy('chan_xuyen_team');
    assert.equal(ghi.length, 1, 'thiếu dấu vết nhật ký ở ' + duong);
    assert.equal(ghi[0].sau.team_xin, 't2');
    assert.equal(ghi[0].sau.team_cua, 't1');
    assert.equal(ghi[0].boiCanh.teamId, 't1');
  }
});

test('L4-M1 HTTP · ?team_id= ĐÚNG team của mình thì đi tiếp, không ghi gì', async () => {
  donNhatKy();
  const { res, than } = await nhu('/api/dieu-phoi/hang-cho?team_id=t1');
  assert.equal(res.status, 200);
  assert.equal(than.ok, true);
  assert.equal(coNhatKy('chan_xuyen_team').length, 0);
});

/* ─────────────────────────── đăng nhập và vai ─────────────────────────── */

test('L4-M1 HTTP · chưa đăng nhập → 401 ở CẢ NĂM đường, kể cả hai trang', async () => {
  for (const duong of [
    '/dieu-phoi', '/viec/v1',
    '/api/dieu-phoi/hang-cho', '/api/dieu-phoi/tom-tat', '/api/dieu-phoi/viec/v1',
  ]) {
    const { res, than } = await goi(duong);
    assert.equal(res.status, 401, duong);
    assert.equal(than.ma, 'chua_dang_nhap', duong);
  }
});

test('L4-M1 HTTP · vai lạ → 403 thieu_vai; sale và quản trị đều vào được', async () => {
  const { res, than } = await goi('/api/dieu-phoi/hang-cho', { team: 't1', vai: 'marketer' });
  assert.equal(res.status, 403);
  assert.equal(than.ma, 'thieu_vai');

  for (const vai of VAI_VAO_DUOC) {
    const r = await goi('/api/dieu-phoi/hang-cho', { team: 't1', vai });
    assert.equal(r.res.status, 200, 'vai ' + vai + ' phải vào được');
  }
});

test('L4-M1 HTTP · chưa nối cái chắn thì ĐÓNG, không mở toang', async () => {
  const loiCu = console.error;
  console.error = () => {};
  datChanDangNhap(null);
  try {
    const { res, than } = await nhu('/api/dieu-phoi/hang-cho');
    assert.equal(res.status, 500);
    assert.equal(than.ma, 'chua_noi_chan');
  } finally {
    console.error = loiCu;
    datChanDangNhap(chanDangNhap);      // nối lại — chắn tra lúc có yêu cầu nên có hiệu lực ngay
  }
  const lai = await nhu('/api/dieu-phoi/hang-cho');
  assert.equal(lai.res.status, 200);
});

/* ─────────────────────── tiêu chí 10 · không đường nào ghi ─────────────────────── */

test('L4-M1 HTTP · gọi hết mọi đường rồi so kho trước/sau: KHÔNG ĐỔI', async () => {
  const truoc = anh();
  for (const duong of [
    '/dieu-phoi', '/viec/v1',
    '/api/dieu-phoi/hang-cho', '/api/dieu-phoi/hang-cho?loai=hoi_thoai',
    '/api/dieu-phoi/tom-tat', '/api/dieu-phoi/viec/v1', '/api/dieu-phoi/viec/v3',
    '/api/dieu-phoi/viec/v_t2',
  ]) await nhu(duong);
  assert.equal(anh(), truoc, 'có đường HTTP nào đó ghi xuống kho');
});

test('L4-M1 HTTP · module không mở đường POST/PUT/DELETE nào (đó là L4-M2)', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const res = await fetch(goc + '/api/dieu-phoi/viec/v1', {
      method, headers: { 'x-thu-team': 't1', 'x-thu-vai': 'sale' },
    });
    assert.equal(res.status, 404, method + ' không được có đường nào');
  }
});
