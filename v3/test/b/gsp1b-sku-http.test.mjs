import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { dungSandbox } from '../../../db/sandbox.js';
import { gopMonThanhGoc } from '../../../src/products/san-pham-goc.js';
import { datKhoGoc, datPheuNhatKyGoc } from '../../src/ui/san-pham/kho-goc.js';
import { taoRouterSanPham, datChanDangNhap, datChanVai } from '../../src/ui/san-pham/router.js';

test('GSP1b · HTTP thật + DB thật: lỗi SKU 409 tiếng Việt, marketer 403, không ghi', async (t) => {
  const sb = await dungSandbox('gsp1b_http'); t.after(() => sb.don());
  const { pool } = sb;
  const team = (await pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  await pool.query("INSERT INTO san_pham(team_id,ma,ten,nguon,sku) VALUES($1,'111:a','A','pos','900'),($1,'111:b','B','pos',NULL)", [team]);
  const noop = async () => ({});
  const cua = Object.fromEntries(['ds','cho','dem','tao','sua','bo','chiTiet','monChuaGan','gan','go','kienThuc','goiYGop','luuGia','ganPage','goPage'].map((x) => [x, noop]));
  datKhoGoc({ ...cua, gop: (bc, body) => gopMonThanhGoc(pool, bc.teamId, body) });
  datPheuNhatKyGoc(noop);
  datChanDangNhap((_req, _res, next) => next());
  datChanVai((_req, _res, next) => next());
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.boiCanh = { teamId: team, nguoiDungId: 'u', vai: [req.headers.cookie === 'mkt' ? 'marketer' : 'quan-tri'] }; next(); });
  app.use(taoRouterSanPham());
  const sv = http.createServer(app); await new Promise((r) => sv.listen(0, '127.0.0.1', r));
  t.after(() => { sv.close(); datKhoGoc(null); datPheuNhatKyGoc(null); });
  const post = async (body, cookie = 'qt') => {
    const r = await fetch(`http://127.0.0.1:${sv.address().port}/api/san-pham/gop`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(body) });
    return { status: r.status, j: await r.json() };
  };
  for (const [body, ma, text] of [
    [{ maGoc: 'wrong', sku: 'ZZZ', posMa: ['111:a'] }, 'sku_lech', /lệch SKU thật/],
    [{ maGoc: 'missing', posMa: ['111:b'] }, 'mon_chua_sku', /kéo lại danh mục/],
  ]) {
    const r = await post(body); assert.equal(r.status, 409); assert.equal(r.j.ma, ma); assert.match(r.j.thongDiep, text);
  }
  assert.equal((await post({ maGoc: 'no-permission', posMa: ['111:a'] }, 'mkt')).status, 403);
  assert.equal(Number((await pool.query('SELECT count(*) AS n FROM san_pham_goc')).rows[0].n), 0);
  assert.equal(Number((await pool.query('SELECT count(*) AS n FROM san_pham WHERE ma_goc IS NOT NULL')).rows[0].n), 0);
});
