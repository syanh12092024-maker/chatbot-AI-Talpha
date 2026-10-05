// GSP3b · BỘ ĐỌC TRANG PAGE + CHỐT BẢN SAO CỦA PAGE ĐÃ GẮN — tầng A (`src/products/chuyen-ban-sao.js`) trên Postgres THẬT (hộp cát riêng).
// Đo: (1) `docSanPhamTrangPage` = đúng thứ `catalog.js#docSanPhamGoiGia` trả cho bot khi có `trang` (page đã gắn ⇒ món POS; chưa gắn ⇒ bản
// sao như cũ); (2) `chanBanSaoDaChuyen` chặn ĐÚNG bản sao (`nguon <> 'pos'`) của page đã gắn (409 `ban_sao_da_chuyen` + lối sang), cho
// qua bản sao page chưa gắn · món POS (kể cả món RF-15 mang `page_id`) · id lạ.
// Nhánh KHÔNG chạm ở tệp này: nối dây `v3/chay-that.js` (cần cả hệ — cổng `gsp3b.sh` canh đúng một dòng nối) · các cửa HTTP + trang page +
// màn Prompt (ở `v3/test/b/gsp3b-cua-luu.test.mjs` · `v3/test/b/gsp3b-trang-page.test.mjs`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { docSanPhamTrangPage, chanBanSaoDaChuyen, cauDaChuyen, idSo } from '../src/products/chuyen-ban-sao.js';
import { docSanPhamGoiGia } from '../src/products/catalog.js';
import { gopMonThanhGoc, ganPageVaoGoc } from '../src/products/san-pham-goc.js';

test('GSP3b · bộ đọc trang page + chốt bản sao, trên Postgres thật', async (t) => {
  process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
  const sb = await dungSandbox('gsp3b');
  const pool = sb.pool;
  const q = (sql, a = []) => pool.query(sql, a);
  const mot = async (sql, a = []) => (await q(sql, a)).rows[0];
  try {
    const T = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
    const KHAC = String((await mot("SELECT id FROM team WHERE slug='auus'")).id);
    await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,true)', [T, 'Saudi', '111', maHoa('k')]);
    // Món POS `111:x` (2 bậc) → gốc «gold» (gộp theo SKU). Page A gắn gold × 111 (cửa gắn thật — ghi cả thị trường).
    await q("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,'111:x','101 - Gold Ring X','101',5,'pos')", [T]);
    const G = await gopMonThanhGoc(pool, T, { maGoc: 'gold', ten: 'Gold Ring', sku: '101', posMa: ['111:x'] });
    const xId = String((await mot("SELECT id FROM san_pham WHERE team_id=$1 AND ma='111:x'", [T])).id);
    await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan) VALUES($1,$2,1,19900,'SAR','Mua 1'),($1,$2,2,29900,'SAR','Mua 2')", [T, xId]);
    const trang = async (fb, ten) => String((await mot('INSERT INTO page(team_id,page_id,ten) VALUES($1,$2,$3) RETURNING id', [T, fb, ten])).id);
    const banSao = async (pageId, ma, gia) => {
      const id = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon) VALUES($1,$2,$3,$3,'kb') RETURNING id", [T, pageId, ma])).id);
      await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,$3,'SAR')", [T, id, gia]);
      return id;
    };
    const A = await trang('fbA', 'Gold Saudi A');
    await ganPageVaoGoc(pool, T, G.id, { pageId: A, shopId: '111' });
    const bsA = await banSao(A, 'kb:fbA:SP01', 9900);
    const B = await trang('fbB', 'Aloe B');                       // CHƯA gắn
    const bsB = await banSao(B, 'kb:fbB:SP01', 8800);
    // Món POS mang `page_id` của page chưa gắn (RF-15: shop có đúng một page) — nhánh `page_id` của bộ đọc trả nó cho page B.
    const zId = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon) VALUES($1,$2,'111:z','Món z','pos') RETURNING id", [T, B])).id);
    // Món POS mang `page_id` của page ĐÃ GẮN (RF-15 trước lúc gắn) — chốt KHÔNG chạm dòng `nguon='pos'` (② 3).
    const wId = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon) VALUES($1,$2,'111:w','Món w','pos') RETURNING id", [T, A])).id);
    const C = await trang('fbC', 'Gold không shop');               // gắn gốc nhưng CHƯA có shop — bot đọc [] (catalog)
    await q("UPDATE page SET san_pham_goc_ma='gold' WHERE id=$1", [C]);
    const bsC = await banSao(C, 'kb:fbC:SP01', 7700);
    const dongPage = async (id) => mot('SELECT * FROM page WHERE id=$1', [id]);
    const loiCua = async (fn) => { try { await fn(); } catch (e) { return e; } return assert.fail('chờ 409 mà chốt cho QUA'); };

    await t.test('H1 · page ĐÃ GẮN: bộ đọc trang page ≡ bộ đọc của bot có `trang` (so trọn mảng) = món 111:x hai bậc, không phải bản sao', async () => {
      const ra = await docSanPhamTrangPage(pool, T, A);
      assert.deepEqual(ra, await docSanPhamGoiGia(pool, T, A, await dongPage(A)));
      assert.deepEqual(ra.map((s) => s.ma), ['111:x']);
      assert.deepEqual(ra[0].goiGia.map((g) => [g.so_luong, Number(g.gia), g.tien_te]), [[1, 19900, 'SAR'], [2, 29900, 'SAR']]);
      assert.notDeepEqual(ra, await docSanPhamGoiGia(pool, T, A), 'thiếu `trang` thì bộ đọc trả bản sao — đúng lỗi G2-N1');
    });

    await t.test('H2 · page CHƯA gắn: như hôm nay (nhánh `page_id`: bản sao + món RF-15)', async () => {
      const ra = await docSanPhamTrangPage(pool, T, B);
      assert.deepEqual(ra, await docSanPhamGoiGia(pool, T, B));
      assert.deepEqual(ra.map((s) => s.ma).sort(), ['111:z', 'kb:fbB:SP01']);
    });

    await t.test('H3 · gắn gốc chưa shop ⇒ [] như bot · id lạ / page team khác ⇒ [] (không ném)', async () => {
      assert.deepEqual(await docSanPhamTrangPage(pool, T, C), []);
      assert.deepEqual(await docSanPhamGoiGia(pool, T, C, await dongPage(C)), []);
      for (const x of ['abc', '0', '', null, '999999']) assert.deepEqual(await docSanPhamTrangPage(pool, T, x), [], `id ${x}`);
      assert.deepEqual(await docSanPhamTrangPage(pool, KHAC, A), [], 'page của team khác lọt qua bộ đọc');
    });

    await t.test('H4 · chốt: bản sao của page ĐÃ GẮN ⇒ 409 `ban_sao_da_chuyen` kèm tên gốc + lối sang Theo thị trường', async () => {
      const e = await loiCua(() => chanBanSaoDaChuyen(pool, T, bsA));
      assert.equal(e.status, 409);
      assert.equal(e.ma, 'ban_sao_da_chuyen');
      assert.equal(e.duLieu.tenGoc, 'Gold Ring');
      assert.equal(e.duLieu.gocId, String(G.id));
      assert.equal(e.duLieu.thiTruong, 'Saudi');
      assert.equal(e.duLieu.duongSua, `/san-pham?sp=${G.id}&tab=thi-truong`);
      assert.deepEqual([e.duLieu.pageId, e.duLieu.sanPhamId], [A, bsA]);
      assert.match(e.message, /Gold Saudi A/);
      assert.match(e.message, /Theo thị trường — sửa ở đó là sửa cho MỌI page cùng sản phẩm ở thị trường này/);
    });

    await t.test('H5 · chốt CHO QUA: bản sao page chưa gắn · món POS của gốc · món RF-15 mang page_id · id lạ / không có / team khác', async () => {
      for (const [ten, id, team] of [['bản sao B', bsB, T], ['món 111:x', xId, T], ['món RF-15 111:z', zId, T],
        ['món POS 111:w mang page_id của page ĐÃ GẮN', wId, T], ['bản sao A ở team khác', bsA, KHAC],
        ['rỗng (cửa phía sau nói)', '', T], ['null (ảnh không có)', null, T], ['không có', '999999', T]]) {
        assert.equal(await chanBanSaoDaChuyen(pool, team, id), null, ten);
      }
    });

    await t.test('H5b · id KHÔNG chuẩn (Postgres vẫn ép được về số) ⇒ 400 `ma_khong_hop_le`, không cho qua — chặn lách bằng «0<id>»', async () => {
      for (const x of [`0${bsA}`, `+${bsA}`, ` ${bsA}`, `${bsA} `, 'abc', '0', '-1']) {
        const e = await loiCua(() => chanBanSaoDaChuyen(pool, T, x));
        assert.deepEqual([e.status, e.ma], [400, 'ma_khong_hop_le'], `id «${x}»`);
      }
      assert.equal(idSo(` ${bsA}`.trim()), bsA);
    });

    await t.test('H6 · gắn gốc chưa shop: vẫn chặn (bot không đọc bản sao), lối sang tab Page đang bán, câu nói chưa chọn shop', async () => {
      const e = await loiCua(() => chanBanSaoDaChuyen(pool, T, bsC));
      assert.equal(e.ma, 'ban_sao_da_chuyen');
      assert.equal(e.duLieu.duongSua, `/san-pham?sp=${G.id}&tab=page`);
      assert.equal(e.duLieu.shopId, null);
      assert.match(e.duLieu.cau, /chưa chọn shop POS/);
    });

    await t.test('H7 · gỡ gắn (page về chưa gắn) ⇒ chốt thôi chặn, bộ đọc về bản sao (khoá ngoại 015 cấm mã gốc rỗng/treo)', async () => {
      await q('UPDATE page SET san_pham_goc_ma=NULL WHERE id=$1', [C]);
      assert.equal(await chanBanSaoDaChuyen(pool, T, bsC), null);
      assert.deepEqual((await docSanPhamTrangPage(pool, T, C)).map((s) => s.ma), ['kb:fbC:SP01']);
      await q("UPDATE page SET san_pham_goc_ma='gold' WHERE id=$1", [C]);
    });

    await t.test('H8 · câu (hàm thuần): thiếu thị trường ⇒ nói số shop · thiếu id gốc ⇒ lối về /san-pham', () => {
      const c = cauDaChuyen({ maGoc: 'gold', tenGoc: '', gocId: null, shopId: '111', thiTruong: '' });
      assert.equal(c.duongSua, '/san-pham');
      assert.match(c.cau, /bán «gold» ở shop 111\./);
      assert.equal(cauDaChuyen({ maGoc: 'g', tenGoc: 'G', gocId: 7, shopId: '9', thiTruong: 'UAE' }).duongSua, '/san-pham?sp=7&tab=thi-truong');
    });

    // Lượt gắn page đang chạy dở (giữ khoá dòng page) khi một giao dịch lưu bản sao tới chốt: chốt phải CHỜ lượt gắn rồi thấy page đã gắn.
    // Đọc thường (không khoá) thấy «chưa gắn» ⇒ cho qua ⇒ bước đẩy sau đó đọc page đã gắn và đẩy MÓN POS thay bản sao (review CR2).
    await t.test('H9 · chốt trong giao dịch khoá dòng page (FOR SHARE): lượt gắn dở dang ⇒ chốt chờ, rồi 409', async () => {
      const k = await pool.connect(); const c = await pool.connect();
      try {
        await k.query('BEGIN');
        await k.query('SELECT id FROM page WHERE id=$1 FOR UPDATE', [B]);
        await c.query('BEGIN');
        let xong = false;
        const p = chanBanSaoDaChuyen(c, T, bsB).then((x) => { xong = true; return x; }, (e) => { xong = true; return e; });
        await new Promise((r) => setTimeout(r, 200));
        assert.equal(xong, false, 'chốt không chờ lượt gắn đang giữ khoá dòng page');
        await k.query("UPDATE page SET san_pham_goc_ma='gold', pos_shop_id='111' WHERE id=$1", [B]);
        await k.query('COMMIT');
        const e = await p;
        assert.equal(e?.ma, 'ban_sao_da_chuyen', `chốt thấy page cũ: ${e?.message || e}`);
      } finally {
        await c.query('ROLLBACK').catch(() => {}); c.release();
        await k.query('ROLLBACK').catch(() => {}); k.release();
        await q('UPDATE page SET san_pham_goc_ma=NULL, pos_shop_id=NULL WHERE id=$1', [B]);
      }
    });
  } finally {
    await sb.don();
  }
});
