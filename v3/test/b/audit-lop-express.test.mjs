// Lớp Express tự ghi nhật ký — chạy trên một máy chủ Express THẬT (cổng ngẫu nhiên),
// vì thứ cần kiểm là hành vi của `res.on('finish')` và `res.locals`, giả hai cái đó thì
// chỉ đang kiểm bản giả của chính mình.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';

import { taoBoiCanh, VAI } from '../../src/auth/boi-canh.js';
import { KhoGia, taoTruyVanGia } from '../../testkit/db-gia.js';
import { datTaoTruyVan, datPheuNhatKy, HANH_DONG, CHE_DAU, BANG } from '../../src/audit/index.js';
import { lopNhatKy } from '../../src/audit/lop-express.js';

const bc = taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an', teamId: 't1', vai: [VAI.SALE] });

let kho, may, goc;
/** Đổi được giữa chừng để thử nhánh "chưa đăng nhập". */
let boiCanhHienTai = bc;

before(async () => {
  kho = new KhoGia();
  datTaoTruyVan((b) => taoTruyVanGia(kho, b));
  datPheuNhatKy(null);

  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { if (boiCanhHienTai) req.boiCanh = boiCanhHienTai; next(); });
  app.use(lopNhatKy({
    layDoiTuong: (req) => ({ loai: 'viec_can_xu_ly', id: req.body && req.body.id }),
  }));

  app.post('/api/viec', (req, res) => res.json({ ok: true }));
  app.get('/api/viec', (req, res) => res.json({ ok: true }));
  app.delete('/api/viec/:id', (req, res) => res.json({ ok: true }));
  app.post('/api/suc-khoe/ping', (req, res) => res.json({ ok: true }));
  app.post('/api/viec/dong', (req, res) => {
    res.locals.hanhDong = HANH_DONG.DONG_VIEC;
    res.locals.truoc = { trang_thai: 'dang_xu' };
    res.json({ ok: true });
  });
  app.post('/api/hong', (req, res) => res.status(500).json({ ok: false }));
  app.post('/api/tu-choi', (req, res) => res.status(403).json({ ok: false }));

  may = app.listen(0);
  await once(may, 'listening');
  goc = `http://127.0.0.1:${may.address().port}`;
});

after(() => may && may.close());

const cho = (ms) => new Promise((r) => setTimeout(r, ms));
const dong = () => kho.docThang(BANG);

/** Ghi xảy ra SAU khi phản hồi đã về tay khách, nên phải đợi — có hạn, không đợi vô tận. */
async function choDu(n, hanMs = 2000) {
  const het = Date.now() + hanMs;
  while (Date.now() < het) { if (dong().length >= n) return true; await cho(10); }
  return false;
}

async function goi(duong, { method = 'POST', body } = {}) {
  return fetch(goc + duong, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test('POST 2xx → ghi một dòng viec_tu_dong, kèm ip, đối tượng và thân yêu cầu', async () => {
  kho.xoaSach();
  const r = await goi('/api/viec', { body: { id: 7, ghi_chu: 'khách đồng ý' } });
  assert.equal(r.status, 200);
  assert.ok(await choDu(1), 'phải có dòng nhật ký');

  const d = dong()[0];
  assert.equal(d.hanh_dong, HANH_DONG.VIEC_TU_DONG, 'nơi gọi chưa đặt hanhDong → mặc định viec_tu_dong');
  assert.equal(d.team_id, 't1');
  assert.equal(d.tac_nhan, 'nguoi');
  assert.equal(d.nguoi_dung_id, 'u1');
  assert.equal(d.doi_tuong_loai, 'viec_can_xu_ly');
  assert.equal(d.doi_tuong_id, '7');
  assert.deepEqual(d.sau, { id: 7, ghi_chu: 'khách đồng ý' });
  assert.ok(d.ip, 'lấy ip từ req.ip');
  assert.match(d.ghi_chu, /POST \/api\/viec → 200/);
  assert.ok(Math.abs(d.thoi_gian - Date.now()) < 5000);
});

test('res.locals.hanhDong và res.locals.truoc được dùng khi nơi gọi có đặt', async () => {
  kho.xoaSach();
  await goi('/api/viec/dong', { body: { id: 9 } });
  assert.ok(await choDu(1));
  const d = dong()[0];
  assert.equal(d.hanh_dong, HANH_DONG.DONG_VIEC);
  assert.deepEqual(d.truoc, { trang_thai: 'dang_xu' });
  assert.deepEqual(d.sau, { id: 9 });
});

test('thân yêu cầu bị che chỗ nhạy cảm trước khi lưu', async () => {
  kho.xoaSach();
  await goi('/api/viec', { body: { id: 1, khoa_api: 'sk-abc', long: { password: 'x' }, ten: 'An' } });
  assert.ok(await choDu(1));
  const d = dong()[0];
  assert.equal(d.sau.khoa_api, CHE_DAU);
  assert.equal(d.sau.long.password, CHE_DAU);
  assert.equal(d.sau.ten, 'An');
});

test('DELETE cũng được ghi', async () => {
  kho.xoaSach();
  await goi('/api/viec/5', { method: 'DELETE' });
  assert.ok(await choDu(1));
  assert.match(dong()[0].ghi_chu, /DELETE \/api\/viec\/5 → 200/);
});

test('KHÔNG ghi: GET, phản hồi ngoài 2xx, đường trong danh sách bỏ qua', async () => {
  kho.xoaSach();
  assert.equal((await goi('/api/viec', { method: 'GET' })).status, 200);
  assert.equal((await goi('/api/hong', { body: { id: 1 } })).status, 500);
  assert.equal((await goi('/api/tu-choi', { body: { id: 1 } })).status, 403);
  assert.equal((await goi('/api/suc-khoe/ping', { body: {} })).status, 200);
  await cho(150);
  assert.equal(dong().length, 0);
});

test('chưa đăng nhập → bỏ qua, KHÔNG ném lỗi ra giữa đường trả về', async () => {
  kho.xoaSach();
  boiCanhHienTai = null;
  try {
    const r = await goi('/api/viec', { body: { id: 3 } });
    assert.equal(r.status, 200, 'yêu cầu vẫn trả về bình thường');
    assert.deepEqual(await r.json(), { ok: true });
    await cho(150);
    assert.equal(dong().length, 0);
  } finally {
    boiCanhHienTai = bc;
  }
});
