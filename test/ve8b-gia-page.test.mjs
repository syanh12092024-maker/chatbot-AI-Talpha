// PHIẾU VE8b · GIÁ THEO THỊ TRƯỜNG + GẮN PAGE — trên Postgres THẬT. Vòng khép kín người quyết 30/09: sản phẩm (SKU) →
// thị trường theo shop POS → marketer của sản phẩm → gắn page → page dùng giá của sản phẩm ở thị trường đó. Đo bằng CHÍNH
// hàm bot + cửa tiền đọc (`catalog.js#docSanPhamGoiGia`). Giá lưu chế độ CHỈ-GIÁ: lượt kéo POS thôi ghi đè giá nhưng tên +
// hết hàng vẫn theo POS (bot không chào món đã hết). Marketer của sản phẩm kéo page theo. Kẹp team ở mọi câu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { ctxHeThong } from '../src/db/index.js';
import { gopMonThanhGoc, suaSanPhamGoc, chiTietSanPhamGoc, monCuaGoc, ganPageVaoGoc, goPageKhoiGoc, LoiSanPhamGoc } from '../src/products/san-pham-goc.js';
import { saveProduct } from '../src/admin-v3/operations.js';
import { docSanPhamGoiGia } from '../src/products/catalog.js';
import { docDanhMuc } from '../src/pos/doc-danh-muc.js';

test('VE8b · giá theo thị trường + gắn page vào sản phẩm, trên Postgres thật', async (t) => {
  process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
  const sb = await dungSandbox('ve8b_gia_page');
  const pool = sb.pool;
  const q = (sql, a = []) => pool.query(sql, a);
  const mot = async (sql, a = []) => (await q(sql, a)).rows[0];
  try {
    const tA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
    const tB = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
    const u = (await mot("INSERT INTO nguoi_dung(email,ten) VALUES('qt@ve8b.test','QT') RETURNING id")).id;
    for (const [m, shop] of [['Saudi', '111'], ['Kuwait', '222']]) {
      await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,true)', [tA, m, shop, maHoa('k')]);
    }
    const mon = (ma, ten, sku, ton = 5) => q("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,$3,$4,$5,'pos')", [tA, ma, ten, sku, ton]);
    await mon('111:a', '125 - Fitgum Acai Berry', '125');
    await mon('222:b', '125 - Fitgum Acai Berry', '125');
    await mon('111:k', '300 - Kreain', '300');
    const fit = await gopMonThanhGoc(pool, tA, { maGoc: 'fitgum', ten: 'Fitgum Acai Berry', sku: '125', marketer: 'Lan', posMa: ['111:a', '222:b'] });
    const kre = await gopMonThanhGoc(pool, tA, { maGoc: 'kreain', ten: 'Kreain', sku: '300', posMa: ['111:k'] });
    const trang = async (team, fb, ten, extra = {}) => (await mot(
      "INSERT INTO page(team_id,page_id,ten,marketer,san_pham_goc_ma) VALUES($1,$2,$3,$4,$5) RETURNING id", [team, fb, ten, extra.marketer || '', extra.goc || null])).id;
    const p1 = await trang(tA, 'fb-1', 'Fitgum KSA');
    const p2 = await trang(tA, 'fb-2', 'Kreain KSA', { marketer: 'Hà', goc: 'kreain' });
    const p3 = await trang(tB, 'fb-3', 'Page team B');
    const dongPage = (id) => mot('SELECT * FROM page WHERE id=$1', [id]);

    await t.test('B1 · gắn page ⇒ ghi ĐỦ sản phẩm · shop · thị trường · marketer; bot thấy ĐÚNG món của thị trường đó (catalog.js)', async () => {
      const kq = await ganPageVaoGoc(pool, tA, fit.id, { pageId: p1, shopId: '111' });
      assert.deepEqual([kq.maGoc, kq.shopId, kq.thiTruong, kq.marketer, kq.soBacGia], ['fitgum', '111', 'Saudi', 'Lan', 0]);
      assert.deepEqual(kq.truoc, { sanPhamGocMa: null, posShopId: null, thiTruong: '', marketer: '' });
      const p = await dongPage(p1);
      assert.deepEqual([p.san_pham_goc_ma, p.pos_shop_id, p.thi_truong, p.marketer], ['fitgum', '111', 'Saudi', 'Lan']);
      const sp = await docSanPhamGoiGia(pool, tA, p1, p);
      assert.deepEqual(sp.map((x) => x.ma), ['111:a'], 'page ở Saudi bán món Saudi của sản phẩm — không lẫn món Kuwait');
      const ct = await chiTietSanPhamGoc(pool, tA, fit.id);
      assert.deepEqual(ct.thiTruong.find((x) => x.shopId === '111').page, [String(p1)], 'page gắn hiện dưới ĐÚNG thị trường Saudi');
      assert.deepEqual(ct.thiTruong.find((x) => x.shopId === '222').page, []);
      assert.deepEqual(ct.page.find((x) => x.id === String(p1)).shop, ['111']);
    });

    await t.test('B2 · từ chối: shop sản phẩm không bán · page team khác · sản phẩm không có · thiếu shop — page không đổi', async () => {
      const truoc = await dongPage(p2);
      for (const [than, ma, st] of [[{ pageId: p2, shopId: '333' }, 'shop_ngoai_san_pham', 409], [{ pageId: p3, shopId: '111' }, 'khong_co_page', 404], [{ pageId: p2 }, 'thieu_shop', 400]]) {
        await assert.rejects(() => ganPageVaoGoc(pool, tA, fit.id, than), (e) => e instanceof LoiSanPhamGoc && e.ma === ma && e.status === st, ma);
      }
      await assert.rejects(() => ganPageVaoGoc(pool, tA, '999999', { pageId: p2, shopId: '111' }), (e) => e.ma === 'khong_co' && e.status === 404);
      const sau = await dongPage(p2);
      assert.deepEqual([sau.san_pham_goc_ma, sau.pos_shop_id, sau.marketer], [truoc.san_pham_goc_ma, truoc.pos_shop_id, truoc.marketer]);
      assert.equal((await dongPage(p3)).san_pham_goc_ma, null);
    });

    await t.test('B3 · đổi marketer của sản phẩm ⇒ MỌI page đang bán nó đổi theo (chuyển giao), page sản phẩm khác đứng yên', async () => {
      const kq = await suaSanPhamGoc(pool, tA, fit.id, { marketer: 'Minh' });
      assert.equal(kq.marketer, 'Minh');
      assert.equal(kq.soPageTheoMarketer, 1);
      assert.equal((await dongPage(p1)).marketer, 'Minh');
      assert.equal((await dongPage(p2)).marketer, 'Hà', 'page bán sản phẩm khác không bị kéo theo');
    });

    await t.test('B4 · giá CHỈ-GIÁ: bậc mới vào đúng món · gia_tay bật, cau_hinh_tay KHÔNG · tên/hết hàng giữ · nhật ký chỉ cột giá · sai phiên bản ⇒ 409', async () => {
      await assert.rejects(() => monCuaGoc(pool, tA, fit.id, '111:k'), (e) => e.ma === 'khong_thuoc' && e.status === 404, 'món của sản phẩm khác');
      const m = await monCuaGoc(pool, tA, fit.id, '111:a');
      const ver = (await mot('SELECT xmin::text AS v FROM san_pham WHERE id=$1', [m.id])).v;
      const bc = { teamId: tA, nguoiDungId: u };
      const offers = [{ so_luong: 1, price: 89, tien_te: 'SAR', nhan: 'Mua 1' }, { so_luong: 2, price: 159, tien_te: 'SAR', nhan: 'Mua 2', khuyen_mai: 'Tặng 1', mien_ship: true }];
      await saveProduct(pool, bc, m.id, { offers, version: ver }, { chiGia: true });
      const s = await mot('SELECT ten, het_hang, gia_tay, cau_hinh_tay FROM san_pham WHERE id=$1', [m.id]);
      assert.deepEqual([s.ten, s.het_hang, s.gia_tay, s.cau_hinh_tay], ['125 - Fitgum Acai Berry', false, true, false]);
      const nk = await mot("SELECT sau FROM nhat_ky WHERE doi_tuong='san_pham' AND doi_tuong_id=$1 ORDER BY id DESC LIMIT 1", [String(m.id)]);
      assert.deepEqual(nk.sau.cot, ['goi_gia']);
      const ct = await chiTietSanPhamGoc(pool, tA, fit.id);
      const sa = ct.thiTruong.find((x) => x.shopId === '111');
      assert.equal(sa.coGia, true);
      assert.deepEqual(sa.mon[0].goiGia.map((g) => [g.nhan, g.soLuong, g.gia, g.tienTe, g.khuyenMai, g.mienShip]),
        [['Mua 1', 1, 89, 'SAR', '', null], ['Mua 2', 2, 159, 'SAR', 'Tặng 1', true]], 'ô nhập ở đơn vị LỚN (89 SAR, không 8900)');
      assert.equal(ct.thiTruong.find((x) => x.shopId === '222').coGia, false);
      const p = await dongPage(p1);
      assert.deepEqual((await docSanPhamGoiGia(pool, tA, p1, p))[0].goiGia.map((g) => Number(g.gia)), [8900, 15900], 'bot + cửa tiền đọc ĐÚNG giá vừa đặt');
      await assert.rejects(() => saveProduct(pool, bc, m.id, { offers, version: ver }, { chiGia: true }), (e) => e.status === 409);
    });

    await t.test('B5 · lượt kéo POS sau khi đặt giá: KHÔNG đè giá, nhưng hết hàng + tên VẪN theo POS', async () => {
      const bienThe = [{ id: 'a', product: { name: '125 - Fitgum Acai Berry (mới)', display_id: '125' }, fields: [], remain_quantity: 0, retail_price: 5000, is_removed: false }];
      const nap = async (url) => ({ ok: true, status: 200, text: async () => JSON.stringify(
        url.includes('/products/variations') ? { data: bienThe, total_entries: 1, total_pages: 1 } : { data: [], total_entries: 0, total_pages: 1 }) });
      await docDanhMuc(pool, ctxHeThong(), { shop: 'Saudi', teamId: tA, tienTe: 'SAR' }, { nap });
      const s = await mot("SELECT id, ten, het_hang FROM san_pham WHERE team_id=$1 AND ma='111:a'", [tA]);
      assert.deepEqual([s.ten, s.het_hang], ['125 - Fitgum Acai Berry (mới)', true], 'tên + hết hàng theo POS');
      const gia = (await q('SELECT so_luong, gia::float8 AS gia FROM goi_gia WHERE san_pham_id=$1 ORDER BY so_luong', [s.id])).rows;
      assert.deepEqual(gia.map((g) => [g.so_luong, g.gia]), [[1, 8900], [2, 15900]], 'giá người đặt không bị retail_price POS đè');
    });

    await t.test('B6 · gỡ page (page chết) ⇒ bỏ sản phẩm, GIỮ shop · thị trường · marketer; gỡ lần hai ⇒ 404', async () => {
      const kq = await goPageKhoiGoc(pool, tA, fit.id, p1);
      assert.equal(kq.maGoc, 'fitgum');
      const p = await dongPage(p1);
      assert.deepEqual([p.san_pham_goc_ma, p.pos_shop_id, p.thi_truong, p.marketer], [null, '111', 'Saudi', 'Minh']);
      await assert.rejects(() => goPageKhoiGoc(pool, tA, fit.id, p1), (e) => e.ma === 'khong_thuoc' && e.status === 404);
      await assert.rejects(() => goPageKhoiGoc(pool, tA, kre.id, p1), (e) => e.status === 404, 'page không bán sản phẩm kia');
    });
  } finally {
    await sb.don();
  }
});
