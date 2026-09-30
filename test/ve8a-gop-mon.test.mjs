// PHIẾU VE8a · GỘP MÓN POS THÀNH SẢN PHẨM THEO SKU trên Postgres THẬT (bản vẽ 2a′ · migration 028). Người quyết 30/09:
// «cùng 1 sản phẩm ở các pos id chung 1 sku» ⇒ khoá gộp = SKU (`product.display_id` của POS, chuẩn hoá `chuanSku`); món
// kéo trước khi có cột thì lùi về số đầu tên; không SKU không số thì cùng tên; không tên đứng riêng. SKU đã là sản phẩm ⇒
// «nối». Gộp = MỘT giao dịch (sản phẩm mang SKU + marketer, gắn đúng món chọn), từ chối không để lại gì; kẹp team.
// G4: lượt kéo danh mục THẬT (POS giả qua `nap`) ghi SKU và TỰ NỐI món shop mới vào sản phẩm cùng SKU.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { ctxHeThong } from '../src/db/index.js';
import { taoSanPhamGoc, suaSanPhamGoc, goiYGopMonPos, gopMonThanhGoc, LoiSanPhamGoc } from '../src/products/san-pham-goc.js';
import { docDanhMuc } from '../src/pos/doc-danh-muc.js';
import { chuanSku } from '../src/pos/ten-goc.js';

test('chuanSku · số bỏ 0 đầu (010 = 10) · chữ gộp khoảng trắng + về thường · rỗng ⇒ null', () => {
  assert.equal(chuanSku('010'), '10');
  assert.equal(chuanSku(' 125 '), '125');
  assert.equal(chuanSku('Necklace  Box'), 'necklace box');
  assert.equal(chuanSku(''), null);
  assert.equal(chuanSku(null), null);
});

test('VE8a · gợi ý gộp + gộp món POS thành sản phẩm theo SKU, trên Postgres thật', async (t) => {
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
    const mon = async (team, ma, ten, sku, ton = 5, nguon = 'pos') =>
      q('INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,$3,$4,$5,$6)', [team, ma, ten, sku, ton, nguon]);
    await mon(tA, '111:a', '125 - Fitgum Acai Berry', '125');
    await mon(tA, '222:b', '125 - Fitgum Acai Berry', '125', 7);
    await mon(tA, '222:c', 'Fitgum Acai Berry 125', '125', 2);       // số ở CUỐI tên (N-SOHIEU-CUOI) — SKU vẫn gộp đúng
    await mon(tA, '111:d', '128 - Fitgum Organic Barley', '128');     // tên gần giống mà KHÁC SKU ⇒ nhóm riêng
    await mon(tA, '111:e', '200 - Kreain Moisturizer', '200');        // SKU 200 đã là sản phẩm ⇒ «nối»
    await mon(tA, '222:m', 'Món số hiệu cũ', '0400');                 // sản phẩm cũ chỉ mang số hiệu 400 ⇒ «nối» (0400 = 400)
    await mon(tA, '111:n', 'Necklace box', 'Necklace box');           // SKU chữ (72/269 SKU prod) ⇒ gộp được dù không phải số
    await mon(tA, '222:n', 'Necklace Box', 'necklace  Box');
    await mon(tA, '111:q', 'Golden Buddha 131', '131');               // món có SKU…
    await mon(tA, '222:q', '131 - Golden Buddha', null);              // …và món kéo trước khi có cột: lùi về số đầu tên
    await mon(tA, '111:t', 'Món thử', 'SP TEST');                     // SKU món thử ⇒ cảnh báo
    await mon(tA, '111:f', 'Kem nghệ', null);                         // không SKU, không số, cùng tên hai shop ⇒ một nhóm
    await mon(tA, '222:g', 'Kem Nghệ ', null);
    await mon(tA, '222:h', '', null);                                 // không gì để so ⇒ đứng một mình
    await mon(tA, '111:k', '300 - Đã gộp', '300');                    // đã thuộc sản phẩm ⇒ không vào gợi ý
    await mon(tA, 'kb:1', '125 - Bản sao từ bot', '125', 5, 'kb');    // không phải món POS ⇒ không vào gợi ý
    await mon(tB, '111:x', '125 - Fitgum team B', '125');             // team khác ⇒ không bao giờ thấy
    const kreain = await taoSanPhamGoc(pool, tA, { maGoc: 'kreain', ten: 'Kreain' });
    await suaSanPhamGoc(pool, tA, kreain.id, { sku: '200' });
    const cu = await taoSanPhamGoc(pool, tA, { maGoc: 'so-cu', ten: 'Số cũ', soHieu: '400' });
    await taoSanPhamGoc(pool, tA, { maGoc: 'da-gop', ten: 'Đã gộp', soHieu: '300' });
    await q("UPDATE san_pham SET ma_goc='da-gop' WHERE team_id=$1 AND ma='111:k'", [tA]);

    await t.test('G1 · nhóm theo SKU mọi shop · «nối» khi SKU (hoặc số hiệu cũ) đã là sản phẩm · SKU chữ · thiếu SKU lùi số đầu tên', async () => {
      const { nhom, dem } = await goiYGopMonPos(pool, tA);
      const gon = nhom.map((n) => [n.khoa, n.loai, n.mon.map((m) => m.posMa).sort().join(',')]);
      assert.deepEqual(gon, [
        ['goc:' + kreain.id, 'noi', '111:e'],
        ['goc:' + cu.id, 'noi', '222:m'],
        ['sku:125', 'moi', '111:a,222:b,222:c'],
        ['sku:131', 'moi', '111:q,222:q'],
        ['sku:necklace box', 'moi', '111:n,222:n'],
        ['ten:kem nghe', 'moi', '111:f,222:g'],
        ['sku:128', 'moi', '111:d'],
        ['sku:sp test', 'moi', '111:t'],
        ['mon:222:h', 'moi', '222:h'],
      ]);
      const n125 = nhom.find((n) => n.khoa === 'sku:125');
      assert.equal(n125.soShop, 2);
      assert.equal(n125.sku, '125');
      assert.equal(n125.ten, 'Fitgum Acai Berry', 'tên đại diện = tên gặp nhiều nhất, đã bóc số đầu');
      assert.equal(n125.maGocDeXuat, 'fitgum-acai-berry');
      assert.equal(n125.tenLech.length, 2, 'cùng SKU mà tên lệch ⇒ nêu ra cho người xem');
      assert.match(n125.lyDo, /Cùng SKU 125 ở 2 shop/);
      assert.deepEqual(n125.mon.find((m) => m.posMa === '222:b'),
        { posMa: '222:b', tenPos: '125 - Fitgum Acai Berry', sku: '125', shopId: '222', thiTruong: 'Kuwait', tonKho: 7 });
      assert.match(nhom.find((n) => n.khoa === 'sku:necklace box').lyDo, /Cùng SKU Necklace box ở 2 shop/, 'SKU chữ HIỆN nguyên văn POS, khoá mới chuẩn hoá');
      assert.match(nhom.find((n) => n.khoa === 'sku:131').canh.join(' '), /1 món chưa có SKU/);
      assert.match(nhom.find((n) => n.khoa === 'sku:sp test').canh.join(' '), /SP TEST/);
      assert.match(nhom.find((n) => n.khoa === 'ten:kem nghe').lyDo, /Cùng tên ở 2 shop · không có SKU/);
      assert.deepEqual(dem, { shopTong: 3, shopBat: 2, shopDaKeo: 2, monPos: 15, monChuaGan: 14, monChuaSku: 4, soGoc: 3, banSao: 0, banSaoChuaNoi: 0 });
      const b = await goiYGopMonPos(pool, tB);
      assert.deepEqual(b.nhom.map((n) => [n.khoa, n.mon.map((m) => m.posMa).join(',')]), [['sku:125', '111:x']], 'team B chỉ thấy món của mình');
    });

    await t.test('G2 · gộp: MỘT sản phẩm mang SKU chuẩn hoá + marketer, gắn ĐÚNG món đã chọn; SKU số điền luôn số hiệu', async () => {
      const g = await gopMonThanhGoc(pool, tA, { maGoc: 'fitgum-acai-berry', ten: 'Fitgum Acai Berry', sku: '125', marketer: 'Ngọc', posMa: ['111:a', '222:b'] });
      assert.deepEqual([g.maGoc, g.sku, g.soHieu, g.marketer, g.posMa], ['fitgum-acai-berry', '125', '125', 'Ngọc', ['111:a', '222:b']]);
      const r = (await q('SELECT ma, ma_goc FROM san_pham WHERE team_id=$1 AND ma = ANY($2) ORDER BY ma', [tA, ['111:a', '222:b', '222:c']])).rows;
      assert.deepEqual(r.map((x) => [x.ma, x.ma_goc]), [['111:a', 'fitgum-acai-berry'], ['222:b', 'fitgum-acai-berry'], ['222:c', null]]);
      const { nhom } = await goiYGopMonPos(pool, tA);
      const con = nhom.find((n) => n.mon.some((m) => m.posMa === '222:c'));
      assert.equal(con.loai, 'noi', 'món cùng SKU còn lại giờ là «nối vào» sản phẩm vừa gộp');
      assert.equal(con.gocId, g.id);
      const chu = await gopMonThanhGoc(pool, tA, { maGoc: 'necklace-box', ten: 'Necklace box', sku: 'Necklace box', posMa: ['111:n', '222:n'] });
      assert.deepEqual([chu.sku, chu.soHieu, chu.marketer], ['necklace box', null, ''], 'SKU chữ: lưu chuẩn hoá, không bịa số hiệu, marketer để trống');
    });

    await t.test('G3 · từ chối thì KHÔNG để lại gì: món thuộc sản phẩm khác · mã trùng · SKU trùng · món team khác · không phải món POS · chưa chọn', async () => {
      const soGoc = async () => (await q('SELECT count(*)::int n FROM san_pham_goc WHERE team_id=$1', [tA])).rows[0].n;
      const truoc = await soGoc();
      const ca = [
        [{ maGoc: 'moi-1', ten: 'X', posMa: ['111:d', '111:k'] }, 'mon_thuoc_goc_khac', 409, null],
        [{ maGoc: 'kreain', ten: 'X', posMa: ['111:d'] }, 'trung', 409, /mã gốc "kreain"/],
        [{ maGoc: 'moi-2', ten: 'X', sku: '0200', posMa: ['111:d'] }, 'trung', 409, /SKU 200 đã là một sản phẩm gốc khác/],
        [{ maGoc: 'moi-3', ten: 'X', posMa: ['111:x'] }, 'khong_co_mon', 404, null],
        [{ maGoc: 'moi-4', ten: 'X', posMa: ['kb:1'] }, 'khong_co_mon', 404, null],
        [{ maGoc: 'moi-5', ten: 'X', posMa: [] }, 'thieu_mon', 400, null],
        [{ maGoc: 'moi:6', ten: 'X', posMa: ['111:d'] }, 'ma_co_hai_cham', 400, null],
      ];
      for (const [than, ma, status, loi] of ca) {
        await assert.rejects(() => gopMonThanhGoc(pool, tA, than),
          (e) => e instanceof LoiSanPhamGoc && e.ma === ma && e.status === status && (!loi || loi.test(e.message)), ma);
      }
      assert.equal(await soGoc(), truoc, 'không lượt từ chối nào để lại sản phẩm gốc');
      assert.equal((await q("SELECT ma_goc FROM san_pham WHERE team_id=$1 AND ma='111:d'", [tA])).rows[0].ma_goc, null, 'món không bị gắn dở');
      assert.equal((await q("SELECT ma_goc FROM san_pham WHERE team_id=$1 AND ma='111:x'", [tB])).rows[0].ma_goc, null);
    });

    await t.test('G4 · lượt kéo danh mục THẬT: ghi SKU nguyên văn, món cũ được điền SKU, món shop mới cùng SKU TỰ NỐI vào sản phẩm', async () => {
      const bienThe = [
        { id: 'a', product: { name: '125 - Fitgum Acai Berry', display_id: '125' }, fields: [], remain_quantity: 3, retail_price: 0, is_removed: false },
        { id: 'z', product: { name: 'Fitgum (Saudi mới)', display_id: '0125' }, fields: [], remain_quantity: 9, retail_price: 0, is_removed: false },
        { id: 'y', product: { name: 'Món mới chưa có sản phẩm', display_id: '777' }, fields: [], remain_quantity: 1, retail_price: 0, is_removed: false },
        { id: 'f', product: { name: 'Kem nghệ', display_id: 'KN-01' }, fields: [], remain_quantity: 4, retail_price: 0, is_removed: false },
      ];
      const nap = async (url) => ({ ok: true, status: 200, text: async () => JSON.stringify(
        url.includes('/products/variations') ? { data: bienThe, total_entries: bienThe.length, total_pages: 1 } : { data: [], total_entries: 0, total_pages: 1 }) });
      await docDanhMuc(pool, ctxHeThong(), { shop: 'Saudi', teamId: tA }, { nap });
      const r = (await q("SELECT ma, sku, ma_goc FROM san_pham WHERE team_id=$1 AND ma IN ('111:a','111:f','111:z','111:y') ORDER BY ma", [tA])).rows;
      assert.deepEqual(r.map((x) => [x.ma, x.sku, x.ma_goc]), [
        ['111:a', '125', 'fitgum-acai-berry'],
        ['111:f', 'KN-01', null],
        ['111:y', '777', null],
        ['111:z', '0125', 'fitgum-acai-berry'],
      ], 'món cũ chưa có SKU được điền · SKU 0125 = 125 ⇒ món shop mới tự vào đúng sản phẩm · SKU chưa có sản phẩm ⇒ chờ gộp');
    });
  } finally {
    await sb.don();
  }
});
