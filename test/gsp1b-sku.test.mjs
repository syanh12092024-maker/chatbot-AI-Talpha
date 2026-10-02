import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { gopMonThanhGoc } from '../src/products/san-pham-goc.js';

test('GSP1b · SKU lấy từ các món đã khóa; lỗi không để lại gốc hoặc liên kết', async (t) => {
  const sb = await dungSandbox('gsp1b'); t.after(() => sb.don());
  const { pool } = sb;
  const team = (await pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  for (const [ma, sku] of [['111:a', '900'], ['222:a', '0900'], ['111:b', '901'], ['111:c', null], ['111:d', ' 900 '], ['111:e', '902']])
    await pool.query("INSERT INTO san_pham(team_id,ma,ten,sku,nguon) VALUES($1,$2,$2,$3,'pos')", [team, ma, sku]);
  const before = () => pool.query('SELECT ma_goc FROM san_pham_goc ORDER BY id');
  const refuse = async (body, code) => {
    const prev = (await before()).rows;
    await assert.rejects(() => gopMonThanhGoc(pool, team, body), (e) => e.status === 409 && e.ma === code);
    assert.deepEqual((await before()).rows, prev);
    for (const ma of body.posMa) assert.equal((await pool.query('SELECT ma_goc FROM san_pham WHERE team_id=$1 AND ma=$2', [team, ma])).rows[0].ma_goc, null);
  };
  await t.test('thân SKU lệch bị từ chối', () => refuse({ maGoc: 'wrong', sku: 'ZZZ', posMa: ['111:b'] }, 'sku_lech'));
  await t.test('món không SKU bị từ chối', () => refuse({ maGoc: 'missing', posMa: ['111:c'] }, 'mon_chua_sku'));
  await t.test('thân không thay được SKU thiếu của món', () => refuse({ maGoc: 'forged', sku: '900', posMa: ['111:c'] }, 'mon_chua_sku'));
  await t.test('hai SKU khác nhau bị từ chối', () => refuse({ maGoc: 'mixed', posMa: ['111:a', '111:b'] }, 'sku_khac_nhau'));
  await t.test('không gửi SKU: suy từ mọi món, chuẩn hóa số và khoảng trắng', async () => {
    const g = await gopMonThanhGoc(pool, team, { maGoc: 'valid', posMa: ['111:a', '222:a', '111:d'] });
    assert.equal(g.sku, '900'); assert.equal(g.soHieu, '900'); assert.equal(g.soBienThe, 3);
  });
  await t.test('thân khớp được phép; thân rỗng có gửi bị từ chối', async () => {
    const g = await gopMonThanhGoc(pool, team, { maGoc: 'matching', sku: '0901', posMa: ['111:b'] });
    assert.equal(g.sku, '901');
    await refuse({ maGoc: 'blank', sku: '', posMa: ['111:e'] }, 'sku_lech');
  });
});
