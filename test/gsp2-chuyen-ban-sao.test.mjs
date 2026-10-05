import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dungSandbox } from '../db/sandbox.js';
import { dsViecChuyen, daQuyet, chamGoiY, boQuaPage, huyBoQua } from '../src/products/chuyen-ban-sao.js';
import { ganPageVaoGoc, ganMonPosVaoGoc } from '../src/products/san-pham-goc.js';

test('GSP2 · quyết định chỉ hiệu lực với đúng gốc × shop, bỏ qua chỉ khi chưa gắn', () => {
  const b = { doiSoat: 'chep', doiSoatGoc: 'gold', doiSoatShop: '111' };
  assert.equal(daQuyet(b, { sanPhamGocMa: 'gold', posShopId: '111' }), true);
  assert.equal(daQuyet(b, { sanPhamGocMa: 'other', posShopId: '111' }), false);
  assert.equal(daQuyet(b, { sanPhamGocMa: 'gold', posShopId: '222' }), false);
  assert.equal(daQuyet({ doiSoat: 'bo_qua' }, {}), true);
  assert.equal(daQuyet({ doiSoat: 'bo_qua' }, { sanPhamGocMa: 'gold' }), false);
});

test('GSP2 · gợi ý dựa tên sản phẩm, bỏ thị trường; tên trống không đoán', () => {
  for (const [page, mon] of [
    ['Birthstone Set 18K Gold Saudi', '101 - Birthstone Set 18K Gold'],
    ['Kreain Nature PH in Saudi', '102 - Kreain Nature PH'],
    ['Fitgum Acai Berry Kuwait', '103 - Fitgum Acai Berry'],
    ['Clear Sight EYE HEALTHY UAE', '171 - Clear Sight EYE HEALTHY'],
    ['Diamond Halo Set Qatar', '105 - Diamond Halo Set'],
    ['Gold Ring Oman', '106 - Gold Ring'],
  ]) {
    assert.ok(chamGoiY(page, mon) >= 0.8, page);
    assert.ok(chamGoiY(page, mon) > chamGoiY(page, '999 - Unrelated shoes'), page);
  }
  assert.equal(chamGoiY('', 'Gold'), 0);
});

test('GSP2 · PostgreSQL: trạng thái theo từng bản sao, team, gắn lại và lưới migration', async (t) => {
  const sb = await dungSandbox('gsp2');
  t.after(() => sb.don());
  const { pool } = sb;
  const q = (sql, a = []) => pool.query(sql, a);
  const one = async (sql, a = []) => (await q(sql, a)).rows[0];
  const team = (await one("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  const other = (await one("SELECT id FROM team WHERE slug='auus'")).id;
  for (const [ma, sku] of [['gold', '101'], ['lucky', '404'], ['priced', '303']])
    await q('INSERT INTO san_pham_goc(team_id,ma_goc,ten,sku) VALUES($1,$2,$2,$3)', [team, ma, sku]);
  for (const [ma, ten, sku, goc] of [
    ['111:x', '101 - Gold Ring X', '101', 'gold'], ['111:y', '202 - Fitgum Y', '202', null],
    ['222:y', '202 - Fitgum Y', '202', null], ['111:w', '404 - Lucky W', '404', null],
    ['222:w', '404 - Lucky W', '404', 'lucky'], ['111:z', '303 - Priced Z', '303', 'priced'],
  ]) await q("INSERT INTO san_pham(team_id,ma,ten,sku,ma_goc,nguon) VALUES($1,$2,$3,$4,$5,'pos')", [team, ma, ten, sku, goc]);
  await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) SELECT $1,id,1,99,'SAR' FROM san_pham WHERE team_id=$1 AND ma='111:z'", [team]);
  const ids = {};
  for (const [fb, ten, shop, goc, d] of [
    ['A', 'Gold Ring X Saudi', '111', null, null], ['B', 'Fitgum Y Saudi', '111', null, null],
    ['W', 'Lucky W Saudi', '111', null, null], ['C', 'No shop', null, null, null],
    ['D', 'Priced Z', '111', 'priced', null], ['E', 'Done', '111', 'priced', 'chep'],
    ['P1', 'Priced Z one', '111', 'priced', null], ['P2', 'Priced Z two', '111', 'priced', null],
  ]) {
    const id = (await one('INSERT INTO page(team_id,page_id,ten,pos_shop_id,san_pham_goc_ma) VALUES($1,$2,$3,$4,$5) RETURNING id', [team, fb, ten, shop, goc])).id;
    ids[fb] = id;
    await q("INSERT INTO san_pham(team_id,page_id,ma,nguon,doi_soat,doi_soat_goc,doi_soat_shop) VALUES($1,$2,$3,'kb',$4,$5,$6)", [team, id, `kb:${fb}`, d, d ? goc : null, d ? shop : null]);
  }
  const oid = (await one("INSERT INTO page(team_id,page_id,ten) VALUES($1,'other','Private') RETURNING id", [other])).id;
  await q("INSERT INTO san_pham(team_id,page_id,ma,nguon) VALUES($1,$2,'kb:other','kb')", [other, oid]);
  const read = () => dsViecChuyen(pool, team);
  const find = (r, fb) => r.viec.find((v) => v.pageFb === fb);
  const initial = await read();
  assert.equal(initial.dem.chuaXong, 7);
  assert.deepEqual(initial.viec.map((x) => x.pageFb).sort(), ['A', 'B', 'C', 'D', 'P1', 'P2', 'W']);
  assert.equal(find(initial, 'A').goiY[0].loai, 'goc');
  assert.equal(find(initial, 'B').goiY[0].loai, 'moi');
  assert.equal(find(initial, 'W').goiY[0].loai, 'noi');
  assert.deepEqual(find(initial, 'C').goiY, []);
  for (const fb of ['D', 'P1', 'P2']) assert.equal(find(initial, fb).trangThai, 'cho_doi_soat');
  await t.test('đơn vị giá: bản sao nạp như nap-tu-kb (9900/2500) ⇒ bộ đọc trả đơn vị LỚN 99 / 25', async () => {
    await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,gia_goc,phi_ship) SELECT $1,id,1,9900,'SAR',12900,2500 FROM san_pham WHERE team_id=$1 AND ma='kb:A'", [team]);
    const bac = find(await read(), 'A').banSao[0].bac[0];
    assert.equal(bac.gia, 99);
    assert.equal(bac.giaGoc, 129);
    assert.equal(bac.phiShip, 25);
    await q("DELETE FROM goi_gia WHERE team_id=$1 AND san_pham_id IN (SELECT id FROM san_pham WHERE team_id=$1 AND ma='kb:A')", [team]);
  });
  await t.test('hai bản sao chỉ xong khi cả hai có quyết định', async () => {
    await q("INSERT INTO san_pham(team_id,page_id,ma,nguon) VALUES($1,$2,'kb:E2','kb')", [team, ids.E]);
    assert.equal(find(await read(), 'E').trangThai, 'cho_doi_soat');
    await q("UPDATE san_pham SET doi_soat='giu_gia_mon',doi_soat_goc='priced',doi_soat_shop='111' WHERE team_id=$1 AND ma='kb:E2'", [team]);
    assert.equal(find(await read(), 'E'), undefined);
  });
  await t.test('không chuyển + lùi + gắn sau bỏ qua; không ghi giá', async () => {
    await assert.rejects(() => boQuaPage(pool, other, ids.C, 'wrong team'), (e) => e.status === 404);
    await assert.rejects(() => boQuaPage(pool, team, ids.D, 'still attached'), (e) => e.status === 409);
    await boQuaPage(pool, team, ids.A, 'Thôi bán');
    assert.equal((await read()).dem.chuaXong, 6);
    assert.equal(find(await read(), 'A').trangThai, 'bo_qua');
    await huyBoQua(pool, team, ids.A);
    assert.equal(find(await read(), 'A').trangThai, 'chua_gan');
    await boQuaPage(pool, team, ids.A, 'Thôi bán');
    // Cửa gắn thật cần kết nối shop.
    await q("INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma) VALUES($1,'Saudi','111','v1.test')", [team]);
    const gold = (await one("SELECT id FROM san_pham_goc WHERE team_id=$1 AND ma_goc='gold'", [team])).id;
    await ganPageVaoGoc(pool, team, gold, { pageId: ids.A, shopId: '111' });
    assert.equal(find(await read(), 'A').trangThai, 'cho_doi_soat');
    assert.equal((await read()).dem.chuaXong, 7);
    assert.equal(Number((await one('SELECT count(*) AS n FROM goi_gia')).n), 1);
  });
  await t.test('nối món rồi gắn dùng gốc đã có, không tạo gốc mới', async () => {
    const id = (await one("SELECT id FROM san_pham_goc WHERE team_id=$1 AND ma_goc='lucky'", [team])).id;
    await ganMonPosVaoGoc(pool, team, id, '111:w');
    await ganPageVaoGoc(pool, team, id, { pageId: ids.W, shopId: '111' });
    assert.equal(find(await read(), 'W').trangThai, 'cho_doi_soat');
    assert.equal(Number((await one('SELECT count(*) AS n FROM san_pham_goc')).n), 3);
  });
  await t.test('gắn lại làm quyết định cũ hết hiệu lực; quay về đúng gốc thì có hiệu lực lại', async () => {
    await q("UPDATE page SET san_pham_goc_ma='gold' WHERE id=$1", [ids.E]);
    assert.equal(find(await read(), 'E').trangThai, 'cho_doi_soat');
    await q("UPDATE page SET san_pham_goc_ma='priced' WHERE id=$1", [ids.E]);
    assert.equal(find(await read(), 'E'), undefined);
  });
  await t.test('phép đo chỉ đọc mọi team; tổng không bỏ sót team khác', async () => {
    const r = spawnSync(process.execPath, ['ops/bin/do-goi-y-gan.mjs'], {
      env: { ...process.env, DATABASE_URL_V3: sb.url }, encoding: 'utf8', timeout: 15000,
    });
    assert.equal(r.status, 0, r.stderr);
    const d = JSON.parse(r.stdout);
    assert.equal(d.chiDoc, true);
    assert.equal(d.chuaXongToanHe, (await read()).dem.chuaXong + 1);
    assert.equal(d.team.find((x) => x.team === 'auus').dem.chuaXong, 1);
  });
  await t.test('chưa áp 032 vẫn đọc được; ghi từ chối rõ ràng', async () => {
    await q('ALTER TABLE san_pham DROP COLUMN doi_soat, DROP COLUMN doi_soat_luc, DROP COLUMN doi_soat_goc, DROP COLUMN doi_soat_shop');
    assert.equal(find(await read(), 'E').trangThai, 'cho_doi_soat');
    await assert.rejects(() => boQuaPage(pool, team, ids.C, 'Thôi bán'), (e) => e.ma === 'chua_migrate');
  });
});
