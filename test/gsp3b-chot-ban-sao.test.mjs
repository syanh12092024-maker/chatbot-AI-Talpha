// GSP3b · BỘ ĐỌC TRANG PAGE + CHỐT BẢN SAO CỦA PAGE ĐÃ GẮN — tầng A (`src/products/chuyen-ban-sao.js`) trên Postgres THẬT (hộp cát riêng).
// Đo: (1) `docSanPhamTrangPage` = đúng thứ `catalog.js#docSanPhamGoiGia` trả cho bot khi có `trang` (page đã gắn ⇒ món POS; chưa gắn ⇒ bản
// sao như cũ); (2) `chanBanSaoDaChuyen` chặn ĐÚNG bản sao (`nguon <> 'pos'`) của page đã gắn (409 `ban_sao_da_chuyen` + lối sang), cho
// qua bản sao page chưa gắn · món POS (kể cả món RF-15 mang `page_id`) · id lạ; (3) vòng 2 · F1 — `chanMonPosCuaDayDu` chặn món POS
// (`page_id` NULL hoặc page đã gắn) ở hai cửa lưu ĐẦY ĐỦ, cho qua món RF-15 của page CHƯA gắn, khoá dòng page trước (chờ lượt gắn dở).
// Nhánh KHÔNG chạm ở tệp này: nối dây `v3/chay-that.js` (cần cả hệ — cổng `gsp3b.sh` canh đúng một dòng nối) · các cửa HTTP + trang page +
// màn Prompt (ở `v3/test/b/gsp3b-cua-luu.test.mjs` · `v3/test/b/gsp3b-trang-page.test.mjs`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { docSanPhamTrangPage, chanBanSaoDaChuyen, chanMonPosCuaDayDu, cauDaChuyen, idSo } from '../src/products/chuyen-ban-sao.js';
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

    // ── Vòng 2 · F1 (đối kháng GSP3b, tổng nâng CHẶN): món POS ở hai cửa lưu ĐẦY ĐỦ ──
    const yId = String((await mot("INSERT INTO san_pham(team_id,ma,ten,nguon) VALUES($1,'111:y','Món y chưa gộp','pos') RETURNING id", [T])).id);
    await t.test('H10 · chốt món POS: page_id NULL · page_id trỏ page ĐÃ GẮN · RF-15 đã gộp gốc mà page đã gắn bán ⇒ 409 `mon_pos_sua_o_san_pham`; RF-15 không ai đã gắn đọc · bản sao · vắng ⇒ qua', async () => {
      const e = await loiCua(() => chanMonPosCuaDayDu(pool, T, xId));
      assert.deepEqual([e.status, e.ma], [409, 'mon_pos_sua_o_san_pham']);
      assert.deepEqual([e.duLieu.sanPhamId, e.duLieu.ma, e.duLieu.gocId, e.duLieu.tenGoc, e.duLieu.pageId], [xId, '111:x', String(G.id), 'Gold Ring', null]);
      assert.equal(e.duLieu.duongSua, `/san-pham?sp=${G.id}&tab=thi-truong`);
      assert.match(e.message, /món POS của sản phẩm «Gold Ring» — cửa này lưu ĐẦY ĐỦ/);
      assert.match(e.message, /Sản phẩm › «Gold Ring» › Theo thị trường\. Chưa ghi gì\./);
      const w = await loiCua(() => chanMonPosCuaDayDu(pool, T, wId));          // RF-15 trước lúc gắn — page A nay đã gắn
      assert.deepEqual([w.ma, w.duLieu.pageId], ['mon_pos_sua_o_san_pham', A]);
      const y = await loiCua(() => chanMonPosCuaDayDu(pool, T, yId));          // chưa gộp vào gốc nào ⇒ lối về /san-pham
      assert.deepEqual([y.ma, y.duLieu.gocId, y.duLieu.duongSua], ['mon_pos_sua_o_san_pham', null, '/san-pham']);
      // (c) món RF-15 của page CHƯA gắn mà ĐÃ GỘP vào gốc, có page đã gắn gốc ở đúng shop (A: gold × 111) ⇒ đường tiền của A ⇒ chặn
      // (/code-review vòng 2 #1); cùng gốc nhưng shop 222 (A bán shop 111, C gắn gold chưa shop) ⇒ không page đã gắn nào đọc ⇒ qua.
      const gId = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon,ma_goc) VALUES($1,$2,'111:g','Món g','pos','gold') RETURNING id", [T, B])).id);
      const hId = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon,ma_goc) VALUES($1,$2,'222:h','Món h','pos','gold') RETURNING id", [T, B])).id);
      try {
        const g = await loiCua(() => chanMonPosCuaDayDu(pool, T, gId));
        assert.deepEqual([g.ma, g.duLieu.pageId, g.duLieu.docBoiPage, g.duLieu.duongSua], ['mon_pos_sua_o_san_pham', B, 'fbA', `/san-pham?sp=${G.id}&tab=thi-truong`]);
        assert.match(g.message, /\(page «Gold Saudi A» đang bán nó\)/);
        assert.equal(await chanMonPosCuaDayDu(pool, T, hId), null, 'món gộp gốc ở shop không page đã gắn nào bán bị chặn oan');
      } finally {
        await q('DELETE FROM san_pham WHERE id = ANY($1::bigint[])', [[gId, hId]]);
      }
      for (const [ten, id, team] of [['món RF-15 111:z của page CHƯA gắn', zId, T], ['bản sao A', bsA, T], ['bản sao B', bsB, T],
        ['món 111:x ở team khác', xId, KHAC], ['rỗng', '', T], ['null', null, T], ['không có', '999999', T]]) {
        assert.equal(await chanMonPosCuaDayDu(pool, team, id), null, ten);
      }
      const la = await loiCua(() => chanMonPosCuaDayDu(pool, T, `0${xId}`));
      assert.deepEqual([la.status, la.ma], [400, 'ma_khong_hop_le']);
    });

    // Thứ tự khoá page → san_pham (vòng 2 · F2) ở nhánh món RF-15: lượt gắn đang dở giữ khoá dòng page ⇒ chốt CHỜ rồi thấy page đã gắn.
    await t.test('H11 · chốt món POS trong giao dịch khoá dòng page (FOR SHARE): gắn dở dang ⇒ chờ, rồi 409 (món RF-15 hết là «page chưa gắn»)', async () => {
      const k = await pool.connect(); const c = await pool.connect();
      try {
        await k.query('BEGIN');
        await k.query('SELECT id FROM page WHERE id=$1 FOR UPDATE', [B]);
        await c.query('BEGIN');
        let xong = false;
        const p = chanMonPosCuaDayDu(c, T, zId).then((x) => { xong = true; return x; }, (e) => { xong = true; return e; });
        await new Promise((r) => setTimeout(r, 200));
        assert.equal(xong, false, 'chốt món POS không chờ lượt gắn đang giữ khoá dòng page');
        await k.query("UPDATE page SET san_pham_goc_ma='gold', pos_shop_id='111' WHERE id=$1", [B]);
        await k.query('COMMIT');
        const e = await p;
        assert.equal(e?.ma, 'mon_pos_sua_o_san_pham', `chốt thấy page cũ: ${e?.message || e}`);
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
