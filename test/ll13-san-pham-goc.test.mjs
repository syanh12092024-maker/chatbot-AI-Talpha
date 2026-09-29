// PHIẾU LL13 · SẢN PHẨM LÀ LÕI trên Postgres THẬT — thị trường = shop POS của món đã gắn, page bán qua món POS
// hoặc gán cả page, gắn/gỡ món có luật (một món chỉ thuộc một sản phẩm), kẹp team ở mọi câu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import {
  taoSanPhamGoc, dsSanPhamGoc, chiTietSanPhamGoc, monPosChuaGan, ganMonPosVaoGoc, goMonPosKhoiGoc, LoiSanPhamGoc,
} from '../src/products/san-pham-goc.js';

test('LL13 · sản phẩm → thị trường (shop POS) → món → page, trên Postgres thật', async (t) => {
  process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
  const sb = await dungSandbox('ll13_san_pham_goc');
  const pool = sb.pool;
  const q = (sql, a = []) => pool.query(sql, a);
  try {
    const tA = (await q("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
    const tB = (await q("SELECT id FROM team WHERE slug='auus'")).rows[0].id;
    for (const [m, shop] of [['Saudi', '111'], ['Kuwait', '222']]) {
      await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma) VALUES($1,$2,$3,$4)', [tA, m, shop, maHoa('k')]);
    }
    const mon = async (team, ma, ten, ton = 5) => q("INSERT INTO san_pham(team_id,ma,ten,ton_kho,nguon) VALUES($1,$2,$3,$4,'pos')", [team, ma, ten, ton]);
    await mon(tA, '111:a', 'Fitgum Saudi');
    await mon(tA, '222:b', 'Fitgum Kuwait S');
    await mon(tA, '222:c', 'Fitgum Kuwait L');
    await mon(tA, '111:z', 'Kreain Saudi');
    await mon(tA, '333:y', 'Món shop chưa kết nối');
    await mon(tB, '111:x', 'Món của team B');
    const p1 = (await q("INSERT INTO page(team_id,page_id,ten) VALUES($1,'fb-1','Fitgum KW page') RETURNING id", [tA])).rows[0].id;
    const p2 = (await q("INSERT INTO page(team_id,page_id,ten) VALUES($1,'fb-2','Fitgum cả page') RETURNING id", [tA])).rows[0].id;
    await q("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon,pos_ma) VALUES($1,$2,'kb:1','Fitgum page','kb','222:b')", [tA, p1]);
    const g1 = await taoSanPhamGoc(pool, tA, { maGoc: 'fitgum', ten: 'Fitgum', soHieu: '125' });
    const g2 = await taoSanPhamGoc(pool, tA, { maGoc: 'kreain', ten: 'Kreain' });

    await t.test('P1 · gắn ba món ở hai shop ⇒ HAI thị trường (Saudi 1 món · Kuwait 2 biến thể), page qua món POS', async () => {
      for (const m of ['111:a', '222:b', '222:c']) await ganMonPosVaoGoc(pool, tA, g1.id, m);
      const d = await chiTietSanPhamGoc(pool, tA, g1.id);
      assert.deepEqual(d.thiTruong.map((x) => [x.thiTruong, x.mon.length]).sort(), [['Kuwait', 2], ['Saudi', 1]]);
      const kw = d.thiTruong.find((x) => x.thiTruong === 'Kuwait');
      assert.deepEqual(kw.page, [String(p1)], 'page bán món Kuwait nằm dưới thị trường Kuwait');
      assert.deepEqual(d.page.map((p) => [p.ten, p.qua]), [['Fitgum KW page', ['mon_pos']]]);
    });

    await t.test('P2 · gán cả page vào sản phẩm (015) cũng là «page đang bán» — nói rõ đường đến', async () => {
      await q("UPDATE page SET san_pham_goc_ma='fitgum' WHERE id=$1", [p2]);
      const d = await chiTietSanPhamGoc(pool, tA, g1.id);
      assert.deepEqual(d.page.map((p) => [p.ten, p.qua]).sort(), [['Fitgum KW page', ['mon_pos']], ['Fitgum cả page', ['ca_page']]]);
      const ds = (await dsSanPhamGoc(pool, tA)).find((x) => x.maGoc === 'fitgum');
      assert.equal(ds.soThiTruong, 2);
      assert.equal(ds.soPage, 2);
      assert.equal(ds.soBienThe, 3);
    });

    await t.test('P3 · một món chỉ thuộc MỘT sản phẩm: gắn món của sản phẩm khác ⇒ 409, không đổi chỗ lặng lẽ', async () => {
      await ganMonPosVaoGoc(pool, tA, g2.id, '111:z');
      await assert.rejects(() => ganMonPosVaoGoc(pool, tA, g1.id, '111:z'),
        (e) => e instanceof LoiSanPhamGoc && e.ma === 'mon_thuoc_goc_khac' && e.status === 409);
      assert.equal((await q("SELECT ma_goc FROM san_pham WHERE team_id=$1 AND ma='111:z'", [tA])).rows[0].ma_goc, 'kreain');
      const lai = await ganMonPosVaoGoc(pool, tA, g1.id, '111:a');
      assert.equal(lai.daCo, true, 'gắn lại món đã thuộc chính sản phẩm này là không đổi gì');
    });

    await t.test('P4 · bản sao của page (không phải món POS) và mã lạ bị từ chối', async () => {
      await assert.rejects(() => ganMonPosVaoGoc(pool, tA, g1.id, 'kb:1'), (e) => e.ma === 'ma_pos_la' || e.ma === 'khong_co_mon');
      await assert.rejects(() => ganMonPosVaoGoc(pool, tA, g1.id, '999:none'), (e) => e.ma === 'khong_co_mon' && e.status === 404);
    });

    await t.test('P5 · món chưa gán: đúng món chưa thuộc sản phẩm nào của team, kèm thị trường (null khi shop chưa kết nối)', async () => {
      const ds = await monPosChuaGan(pool, tA);
      assert.deepEqual(ds.map((m) => [m.posMa, m.thiTruong]), [['333:y', null]]);
    });

    await t.test('P6 · gỡ món: đúng món của sản phẩm này; gỡ lại ⇒ 404; thị trường Kuwait còn 1 biến thể', async () => {
      await goMonPosKhoiGoc(pool, tA, g1.id, '222:c');
      await assert.rejects(() => goMonPosKhoiGoc(pool, tA, g1.id, '222:c'), (e) => e.ma === 'khong_thuoc' && e.status === 404);
      await assert.rejects(() => goMonPosKhoiGoc(pool, tA, g1.id, '111:z'), (e) => e.ma === 'khong_thuoc', 'không gỡ món của sản phẩm khác');
      const kw = (await chiTietSanPhamGoc(pool, tA, g1.id)).thiTruong.find((x) => x.thiTruong === 'Kuwait');
      assert.equal(kw.mon.length, 1);
    });

    await t.test('P7 · kẹp team: team B không thấy sản phẩm team A, không gắn được món team A, không lấy món của mình vào gốc team A', async () => {
      assert.equal(await chiTietSanPhamGoc(pool, tB, g1.id), null);
      await assert.rejects(() => ganMonPosVaoGoc(pool, tB, g1.id, '111:a'), (e) => e.status === 404);
      await assert.rejects(() => ganMonPosVaoGoc(pool, tA, g1.id, '111:x'), (e) => e.ma === 'khong_co_mon', 'món của team B không nằm trong danh mục team A');
      assert.deepEqual((await monPosChuaGan(pool, tB)).map((m) => m.posMa), ['111:x']);
    });
  } finally {
    await sb.don();
  }
});
