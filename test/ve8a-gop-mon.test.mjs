// PHIẾU VE8a · GỘP MÓN POS THÀNH SẢN PHẨM trên Postgres THẬT (bản vẽ 2a′): máy gợi ý nhóm (cùng số hiệu mọi shop ·
// số hiệu đã là sản phẩm ⇒ «nối» · không số hiệu thì cùng tên · không tên đứng một mình), người gộp — MỘT giao dịch
// tạo sản phẩm + gắn món, từ chối thì KHÔNG để lại gì; kẹp team ở mọi câu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { taoSanPhamGoc, goiYGopMonPos, gopMonThanhGoc, LoiSanPhamGoc } from '../src/products/san-pham-goc.js';

test('VE8a · gợi ý gộp + gộp món POS thành sản phẩm, trên Postgres thật', async (t) => {
  process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
  const sb = await dungSandbox('ve8a_gop_mon');
  const pool = sb.pool;
  const q = (sql, a = []) => pool.query(sql, a);
  try {
    const tA = (await q("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
    const tB = (await q("SELECT id FROM team WHERE slug='auus'")).rows[0].id;
    for (const [m, shop, bat] of [['Saudi', '111', true], ['Kuwait', '222', true], ['Oman', '444', false]]) {
      await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,$5)', [tA, m, shop, maHoa('k'), bat]);
    }
    const mon = async (team, ma, ten, ton = 5, nguon = 'pos') => q('INSERT INTO san_pham(team_id,ma,ten,ton_kho,nguon) VALUES($1,$2,$3,$4,$5)', [team, ma, ten, ton, nguon]);
    await mon(tA, '111:a', '125 - Fitgum Acai Berry');
    await mon(tA, '222:b', '125 - Fitgum Acai Berry', 7);
    await mon(tA, '222:c', '125 - Fitgum Acai Berry L', 2);      // cùng số, tên lệch ⇒ `tenLech` cho người xem
    await mon(tA, '111:d', '128 - Fitgum Organic Barley');        // tên gần giống mà KHÁC số ⇒ nhóm riêng
    await mon(tA, '111:e', '200 - Kreain Moisturizer');           // số 200 đã là sản phẩm ⇒ nhóm «nối»
    await mon(tA, '111:f', 'Kem nghệ');                           // không số, cùng tên ở hai shop ⇒ một nhóm
    await mon(tA, '222:g', 'Kem Nghệ ');
    await mon(tA, '222:h', '');                                   // không số, không tên ⇒ đứng một mình
    await mon(tA, '222:i', '');
    await mon(tA, '111:k', '300 - Đã gộp');                       // đã thuộc sản phẩm ⇒ không vào gợi ý
    await mon(tA, 'kb:1', '125 - Bản sao từ bot', 5, 'kb');       // không phải món POS ⇒ không vào gợi ý
    await mon(tB, '111:x', '125 - Fitgum team B');                // team khác ⇒ không bao giờ thấy
    const kreain = await taoSanPhamGoc(pool, tA, { maGoc: 'kreain', ten: 'Kreain', soHieu: '200' });
    await taoSanPhamGoc(pool, tA, { maGoc: 'da-gop', ten: 'Đã gộp', soHieu: '300' });
    await q("UPDATE san_pham SET ma_goc='da-gop' WHERE team_id=$1 AND ma='111:k'", [tA]);

    await t.test('G1 · nhóm đúng luật: số hiệu mọi shop · «nối» khi số đã là sản phẩm · không số thì cùng tên · không tên đứng riêng', async () => {
      const { nhom, dem } = await goiYGopMonPos(pool, tA);
      const gon = nhom.map((n) => [n.khoa, n.loai, n.mon.map((m) => m.posMa).sort().join(',')]);
      assert.deepEqual(gon, [
        ['goc:' + kreain.id, 'noi', '111:e'],
        ['so:125', 'moi', '111:a,222:b,222:c'],
        ['ten:kem nghe', 'moi', '111:f,222:g'],
        ['so:128', 'moi', '111:d'],
        ['mon:222:h', 'moi', '222:h'],
        ['mon:222:i', 'moi', '222:i'],
      ]);
      const n125 = nhom.find((n) => n.khoa === 'so:125');
      assert.equal(n125.soShop, 2);
      assert.equal(n125.ten, 'Fitgum Acai Berry', 'tên đại diện = tên gặp nhiều nhất, đã bóc số');
      assert.equal(n125.maGocDeXuat, 'fitgum-acai-berry');
      assert.ok(n125.tenLech.length === 2, 'cùng số mà tên lệch ⇒ nêu ra cho người xem');
      assert.match(n125.lyDo, /Cùng số hiệu 125 ở 2 shop/);
      assert.deepEqual(n125.mon.find((m) => m.posMa === '222:b'), { posMa: '222:b', tenPos: '125 - Fitgum Acai Berry', shopId: '222', thiTruong: 'Kuwait', tonKho: 7 });
      assert.match(nhom.find((n) => n.khoa === 'ten:kem nghe').lyDo, /Cùng tên ở 2 shop · không có số hiệu/);
      assert.deepEqual(dem, { shopTong: 3, shopBat: 2, shopDaKeo: 2, monPos: 10, monChuaGan: 9, soGoc: 2, banSao: 0, banSaoChuaNoi: 0 });
      const b = await goiYGopMonPos(pool, tB);
      assert.deepEqual(b.nhom.map((n) => n.khoa), ['so:125'], 'team B chỉ thấy món của mình');
      assert.deepEqual(b.nhom[0].mon.map((m) => m.posMa), ['111:x']);
    });

    await t.test('G2 · gộp: MỘT sản phẩm + gắn ĐÚNG món đã chọn (món bỏ chọn vẫn chờ); số hiệu đi theo sản phẩm', async () => {
      const g = await gopMonThanhGoc(pool, tA, { maGoc: 'fitgum-acai-berry', ten: 'Fitgum Acai Berry', soHieu: '125', posMa: ['111:a', '222:b'] });
      assert.equal(g.maGoc, 'fitgum-acai-berry');
      assert.equal(g.soHieu, '125');
      assert.deepEqual(g.posMa, ['111:a', '222:b']);
      const r = (await q("SELECT ma, ma_goc FROM san_pham WHERE team_id=$1 AND ma = ANY($2) ORDER BY ma", [tA, ['111:a', '222:b', '222:c']])).rows;
      assert.deepEqual(r.map((x) => [x.ma, x.ma_goc]), [['111:a', 'fitgum-acai-berry'], ['222:b', 'fitgum-acai-berry'], ['222:c', null]]);
      const { nhom } = await goiYGopMonPos(pool, tA);
      const con = nhom.find((n) => n.mon.some((m) => m.posMa === '222:c'));
      assert.equal(con.loai, 'noi', 'món cùng số còn lại giờ là «nối vào» sản phẩm vừa gộp');
      assert.equal(con.gocId, g.id);
    });

    await t.test('G3 · từ chối thì KHÔNG để lại gì: món thuộc sản phẩm khác · mã trùng · số hiệu trùng · món team khác · không phải món POS · chưa chọn', async () => {
      const soGoc = async () => (await q('SELECT count(*)::int n FROM san_pham_goc WHERE team_id=$1', [tA])).rows[0].n;
      const truoc = await soGoc();
      const ca = [
        [{ maGoc: 'moi-1', ten: 'X', posMa: ['111:d', '111:k'] }, 'mon_thuoc_goc_khac', 409],
        [{ maGoc: 'kreain', ten: 'X', posMa: ['111:d'] }, 'trung', 409],
        [{ maGoc: 'moi-2', ten: 'X', soHieu: '200', posMa: ['111:d'] }, 'trung', 409],
        [{ maGoc: 'moi-3', ten: 'X', posMa: ['111:x'] }, 'khong_co_mon', 404],
        [{ maGoc: 'moi-4', ten: 'X', posMa: ['kb:1'] }, 'khong_co_mon', 404],
        [{ maGoc: 'moi-5', ten: 'X', posMa: [] }, 'thieu_mon', 400],
        [{ maGoc: 'moi:6', ten: 'X', posMa: ['111:d'] }, 'ma_co_hai_cham', 400],
      ];
      for (const [than, ma, status] of ca) {
        await assert.rejects(() => gopMonThanhGoc(pool, tA, than), (e) => e instanceof LoiSanPhamGoc && e.ma === ma && e.status === status, ma);
      }
      assert.equal(await soGoc(), truoc, 'không lượt từ chối nào để lại sản phẩm gốc');
      assert.equal((await q("SELECT ma_goc FROM san_pham WHERE team_id=$1 AND ma='111:d'", [tA])).rows[0].ma_goc, null, 'món không bị gắn dở');
      assert.equal((await q("SELECT ma_goc FROM san_pham WHERE team_id=$1 AND ma='111:x'", [tB])).rows[0].ma_goc, null);
    });
  } finally {
    await sb.don();
  }
});
