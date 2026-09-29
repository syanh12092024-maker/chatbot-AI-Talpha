// PHIẾU VE1 · MÀN SẢN PHẨM THEO BẢN VẼ — tầng dữ liệu trên Postgres THẬT: «Giá ở <thị trường>» lấy từ ĐÂU.
//
// Bản vẽ (artifact «AI Closer — làm lại từ đầu», bảng 2a) đặt bảng giá theo THỊ TRƯỜNG. Mô hình hôm nay giữ giá ở
// BẢN SAO sản phẩm của từng page (`san_pham` nguon<>'pos' · `goi_gia`), nối về món POS qua `pos_ma`. Màn không bịa một
// bảng giá thị trường: nó gom các bậc giá của những bản sao đã nối món của shop đó, và nói mỗi bậc đang dùng ở mấy page.
// Hai page cùng số lượng mà khác giá ⇒ HAI dòng — lệch giá giữa các page là điều người dùng phải thấy, không bị gộp mất.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { taoSanPhamGoc, chiTietSanPhamGoc, ganMonPosVaoGoc } from '../src/products/san-pham-goc.js';

test('VE1 · giá theo thị trường = bậc giá của bản sao page đã nối món shop đó, trên Postgres thật', async (t) => {
  process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
  const sb = await dungSandbox('ve1_san_pham');
  const q = (sql, a = []) => sb.pool.query(sql, a);
  try {
    const tA = (await q("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
    const tB = (await q("SELECT id FROM team WHERE slug='auus'")).rows[0].id;
    for (const [m, shop] of [['Saudi', '111'], ['Kuwait', '222']]) {
      await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma) VALUES($1,$2,$3,$4)', [tA, m, shop, maHoa('k')]);
    }
    for (const [ma, ten] of [['111:a', 'Fitgum Saudi'], ['222:b', 'Fitgum Kuwait']]) {
      await q("INSERT INTO san_pham(team_id,ma,ten,nguon) VALUES($1,$2,$3,'pos')", [tA, ma, ten]);
    }
    const page = async (team, pid, ten) => (await q('INSERT INTO page(team_id,page_id,ten) VALUES($1,$2,$3) RETURNING id', [team, pid, ten])).rows[0].id;
    const banSao = async (team, pageId, ma, posMa, bac) => {
      const s = (await q("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon,pos_ma) VALUES($1,$2,$3,'Fitgum','kb',$4) RETURNING id", [team, pageId, ma, posMa])).rows[0].id;
      for (const [sl, gia, te, nhan] of bac) {
        await q('INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan) VALUES($1,$2,$3,$4,$5,$6)', [team, s, sl, gia, te, nhan]);
      }
    };
    const p1 = await page(tA, 'fb-1', 'Fitgum KSA 1');
    const p2 = await page(tA, 'fb-2', 'Fitgum KSA 2');
    const p3 = await page(tA, 'fb-3', 'Fitgum KSA giá lệch');
    await banSao(tA, p1, 'kb:1', '111:a', [[1, 89, 'SAR', 'Mua 1'], [2, 159, 'SAR', 'Mua 2 — giao miễn phí']]);
    await banSao(tA, p2, 'kb:2', '111:a', [[1, 89, 'SAR', 'Mua 1']]);
    await banSao(tA, p3, 'kb:3', '111:a', [[1, 99, 'SAR', 'Mua 1']]);
    // Team B: cùng mã món, KHÔNG được lọt vào giá của team A.
    const pb = await page(tB, 'fb-b', 'Page team B');
    await banSao(tB, pb, 'kb:b', '111:a', [[1, 1, 'SAR', 'Mua 1']]);
    const g = await taoSanPhamGoc(sb.pool, tA, { maGoc: 'fitgum', ten: 'Fitgum' });
    await ganMonPosVaoGoc(sb.pool, tA, g.id, '111:a');
    await ganMonPosVaoGoc(sb.pool, tA, g.id, '222:b');
    const d = await chiTietSanPhamGoc(sb.pool, tA, g.id);
    const saudi = d.thiTruong.find((x) => x.thiTruong === 'Saudi');
    const kuwait = d.thiTruong.find((x) => x.thiTruong === 'Kuwait');

    await t.test('V1 · Saudi: gom theo (số lượng · giá · tiền tệ · nhãn), đếm page dùng mỗi bậc', () => {
      assert.deepEqual(saudi.gia, [
        { soLuong: 1, gia: 89, tienTe: 'SAR', nhan: 'Mua 1', soPage: 2 },
        { soLuong: 1, gia: 99, tienTe: 'SAR', nhan: 'Mua 1', soPage: 1 },
        { soLuong: 2, gia: 159, tienTe: 'SAR', nhan: 'Mua 2 — giao miễn phí', soPage: 1 },
      ]);
    });
    await t.test('V2 · cùng số lượng khác giá ở hai page ⇒ HAI dòng, và cờ `lechGia` bật (không gộp mất)', () => {
      assert.equal(saudi.lechGia, true);
      assert.equal(kuwait.lechGia, false);
    });
    await t.test('V3 · Kuwait chưa page nào bán qua món ⇒ `gia` rỗng (màn nói «chưa có», không bịa)', () => {
      assert.deepEqual(kuwait.gia, []);
    });
    await t.test('V4 · kẹp team: bậc giá 1 SAR của team B cùng mã món không lọt vào', () => {
      assert.ok(!saudi.gia.some((x) => x.gia === 1));
    });
  } finally {
    await sb.don();
  }
});
