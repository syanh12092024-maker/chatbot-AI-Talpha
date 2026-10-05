// PHIẾU TT1 · ĐƠN VỊ TIỀN TỆ NGOÀI GCC (EUR · RON · AUD · TWD · JPY) + BẢNG THỊ TRƯỜNG → TIỀN TỆ.
//
// Hệ KHÔNG quy đổi giữa các tệ — giá EUR vẫn là EUR. Thứ phiếu thêm là ĐƠN VỊ LẺ theo CÁCH POS LƯU (nguồn BigQuery
// `dim_shop_project.currency_divisor`, đo 05/10): EUR/RON/AUD ×100 · TWD/JPY ×1 (không xu). Ca đi trọn đường thật trên Postgres
// hộp cát riêng: lưu (`saveProduct` chỉ-giá, đúng cửa màn «Theo thị trường» gọi) → đọc (`catalog.js#docSanPhamGoiGia` — bộ đọc
// CHUNG của bot và cửa tiền) → lời bot (`goiGiaChoChat` / `xayVanBanSanPham`) → bản chép bot v1 (`sanPhamChoBot`) → màn
// (`chiTietSanPhamGoc` · `kho-san-pham-v3#motPage`) → cửa tiền (`cua2Tien` với tổng qua `chuanHoaHoSo`, như hồ sơ bot chốt) →
// đối soát GSP3 (`doiSoatDonVi`, nối `luuGia` đúng khuôn `v3/chay-that.js`: `monCuaGoc` + `saveProduct` chỉ-giá).
//
// Nhánh KHÔNG chạm ở tệp này: màn trình duyệt `van-hanh.js:423` / `hop-thu-ui.js:70` (chia theo `currencyFactors` = chính
// `HE_SO_TE` — `don-cho.js:35`; không có giả định ×100 để đo) · route `/api/van-hanh/products` (chia `HE_SO_TE[g.tien_te]`,
// cùng phép với `chiTietSanPhamGoc` đo ở đây) · `src/outbound-guard.js` (bộ não — nợ N-GUARD-TIEN-TE-MOI, ngoài phiếu).
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { HE_SO_TE, quyDonViNho, doiSangDonViNho } from '../src/pos/tao-don.js';
import { TIEN_TE_THI_TRUONG, donViDoiSoat, doiSoatDonVi } from '../src/products/chuyen-ban-sao.js';
import { gopMonThanhGoc, ganPageVaoGoc, monCuaGoc, chiTietSanPhamGoc } from '../src/products/san-pham-goc.js';
import { saveProduct, pageStatus } from '../src/admin-v3/operations.js';
import { docSanPhamGoiGia } from '../src/products/catalog.js';
import { goiGiaChoChat, xayVanBanSanPham } from '../src/chat/rap-prompt.js';
import { sanPhamChoBot } from '../src/products/ban-chep-bot.js';
import { cua2Tien, chuanHoaHoSo, quyTongTienNho } from '../src/orders/hang-cho.js';
import { taoKhoSanPhamV3 } from '../v3/src/noi-day/kho-san-pham-v3.js';

// ═══ T0 · BẢNG — hợp đồng ② của phiếu, known-answer từ NGUỒN đo (không lấy đáp án từ code bị đo) ═══════════════════════
test('T0a · HE_SO_TE = bảy tệ cũ y nguyên + EUR/RON/AUD ×100 + TWD/JPY ×1 — không thêm tệ nào khác', () => {
  assert.deepEqual({ ...HE_SO_TE }, {
    AED: 100, SAR: 100, QAR: 100, USD: 100, KWD: 100, OMR: 100, BHD: 100,   // bảy tệ cũ — không đổi một con số
    EUR: 100, RON: 100, AUD: 100, TWD: 1, JPY: 1,                           // dim_shop_project.currency_divisor (05/10)
  });
  assert.ok(Object.isFrozen(HE_SO_TE));
});

test('T0b · TIEN_TE_THI_TRUONG: 6 nước GCC y nguyên + đúng 6 thị trường kết nối prod; mọi tệ của bảng đều có trong HE_SO_TE; Japan vắng', () => {
  assert.deepEqual({ ...TIEN_TE_THI_TRUONG }, {
    Saudi: 'SAR', UAE: 'AED', Kuwait: 'KWD', Qatar: 'QAR', Oman: 'OMR', Bahrain: 'BHD',
    Europe: 'EUR', Romania: 'RON', Slovakia: 'EUR', USA: 'USD', Australia: 'AUD', Taiwan: 'TWD',
  });
  // Lời khai ở chú thích `chuyen-ban-sao.js` («mỗi tệ ở đây PHẢI có trong HE_SO_TE») — đo, không tin.
  const thieu = Object.entries(TIEN_TE_THI_TRUONG).filter(([, te]) => !Object.hasOwn(HE_SO_TE, te));
  assert.deepEqual(thieu, [], 'thị trường mang tệ saveProduct sẽ từ chối');
  assert.equal(Object.hasOwn(TIEN_TE_THI_TRUONG, 'Japan'), false, 'Japan chưa có kết nối — không thêm');
});

test('T0c · quyDonViNho: một luật — số nguyên đơn vị nhỏ, hoặc null (tệ lạ · không chia hết · không phải số); KHÔNG làm tròn ngầm', () => {
  const ca = [
    [49.99, 'EUR', 4999], [0.29, 'EUR', 29], [99, 'RON', 9900], [12.5, 'AUD', 1250], [990, 'TWD', 990], [1290, 'JPY', 1290],
    [10.9, 'KWD', 1090], [18.9, 'KWD', 1890], [99, 'SAR', 9900], [15, 'usd', 1500],
    [601184614.43, 'EUR', 60118461443], [99999999.99, 'RON', 9999999999],   // số lớn có xu: dung sai co theo độ lớn (/code-review #7)
    [990.5, 'TWD', null], [0.5, 'JPY', null], [49.999, 'EUR', null], [13.955, 'KWD', null], [1e9 + 0.5, 'TWD', null],
    [10, 'GBP', null], [10, 'toString', null], [10, '', null], [10, null, null], ['', 'EUR', null], [null, 'EUR', null], [NaN, 'EUR', null],
  ];
  const sai = ca.filter(([v, te, cho]) => quyDonViNho(v, te) !== cho).map(([v, te, cho]) => `${v} ${te}: ${quyDonViNho(v, te)} ≠ ${cho}`);
  assert.deepEqual(sai, []);
  // legacy (`src/orders/legacy.js`) đi qua `doiSangDonViNho` — cùng luật: 990,5 TWD ⇒ null (legacy đọc `!(total > 0)` là từ chối).
  assert.deepEqual([doiSangDonViNho(990, 'TWD'), doiSangDonViNho(990.5, 'TWD'), doiSangDonViNho(49.99, 'EUR'), doiSangDonViNho(0, 'TWD')], [990, null, 4999, 0]);
  // Tổng bot chốt (đơn vị lớn) → tong_tien: TWD ×1, phần lẻ ⇒ null (cửa ① báo thiếu), tệ lạ ⇒ null.
  const tong = (total_price, currency) => chuanHoaHoSo({ total_price, currency }).tong_tien;
  assert.deepEqual([tong(990, 'TWD'), tong(990.5, 'TWD'), tong(49.99, 'EUR'), tong(99, 'RON'), tong(10, 'GBP'), tong(99, 'SAR')],
    [990, null, 4999, 9900, null, 9900]);
  assert.equal(quyTongTienNho({ tong_tien: null, tong_tien_lon: 1290, tien_te: 'JPY' }).tong_tien, 1290);
});

// ═══ T1–T6 · TRỌN ĐƯỜNG trên Postgres thật ════════════════════════════════════════════════════════════════════════════════
test('TT1 · lưu · đọc · lời bot · màn · cửa tiền · đối soát cho EUR/RON/AUD/TWD; bảy tệ cũ giữ nguyên — Postgres hộp cát', async (t) => {
  process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
  const sb = await dungSandbox('tt1');
  const pool = sb.pool;
  const q = (sql, a = []) => pool.query(sql, a);
  const mot = async (sql, a = []) => (await q(sql, a)).rows[0];
  try {
    const T = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
    const u = String((await mot("INSERT INTO nguoi_dung(email,ten) VALUES('qt@tt1.test','QT') RETURNING id")).id);
    const bc = { teamId: T, nguoiDungId: u, vai: ['quan-tri'] };
    // Shop theo đúng tên thị trường kết nối prod (H7/H13) + hai shop GCC để đo «bảy tệ cũ».
    const SHOP = { Europe: '201', Romania: '202', Australia: '204', Taiwan: '219', Saudi: '111', Kuwait: '222' };
    for (const [m, shop] of Object.entries(SHOP)) {
      await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,true)', [T, m, shop, maHoa('k')]);
    }
    // Mỗi shop một món POS cùng gốc «ring» (cùng SKU) — 1 shop POS = 1 thị trường.
    for (const shop of Object.values(SHOP)) {
      await q("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,'101 - Ring','101',5,'pos')", [T, `${shop}:r`]);
    }
    const G = await gopMonThanhGoc(pool, T, { maGoc: 'ring', ten: 'Ring', sku: '101', posMa: Object.values(SHOP).map((s) => `${s}:r`) });
    const trang = async (fb) => String((await mot('INSERT INTO page(team_id,page_id,ten) VALUES($1,$2,$2) RETURNING id', [T, fb])).id);
    const PG = {};
    for (const [m, shop] of Object.entries(SHOP)) {
      PG[m] = await trang(`fb-${m}`);
      await ganPageVaoGoc(pool, T, G.id, { pageId: PG[m], shopId: shop });
    }
    const monCua = async (m) => monCuaGoc(pool, T, G.id, `${SHOP[m]}:r`);
    const ver = async (id) => (await mot('SELECT xmin::text AS v FROM san_pham WHERE id=$1', [id])).v;
    const luuGia = async (m, offers) => { const { id } = await monCua(m); return saveProduct(pool, bc, id, { offers, version: await ver(id) }, { chiGia: true }); };
    const giaTho = async (m) => (await q('SELECT so_luong, gia::float8 AS gia, tien_te, gia_goc::float8 AS gia_goc, phi_ship::float8 AS phi_ship FROM goi_gia WHERE san_pham_id=$1 ORDER BY so_luong',
      [(await monCua(m)).id])).rows;
    const page = (m) => mot('SELECT * FROM page WHERE id=$1', [PG[m]]);
    const spBot = async (m) => docSanPhamGoiGia(pool, T, PG[m], await page(m));
    const cuaTien = async (m, total_price, currency, qty = 1) => cua2Tien(pool, { teamId: T, pageId: PG[m], duLieu: chuanHoaHoSo({ total_price, qty, currency }) });
    const demGhi = async () => ({ goiGia: Number((await mot('SELECT count(*) n FROM goi_gia')).n), nhatKy: Number((await mot("SELECT count(*) n FROM nhat_ky WHERE hanh_dong='v3_sua_san_pham'")).n) });

    await t.test('T1 · ④1 — Europe 1 × 49,99 EUR ⇒ gia 4999 · EUR; bot đọc lại 49,99 EUR; bản chép bot v1 49,99; trang thái page không báo «thiếu gói giá»', async () => {
      await luuGia('Europe', [{ so_luong: 1, price: 49.99, tien_te: 'EUR', nhan: 'Buy 1' }, { so_luong: 2, price: 79.9, tien_te: 'EUR', gia_goc: 99.98, phi_ship: 4.5 }]);
      assert.deepEqual(await giaTho('Europe'), [
        { so_luong: 1, gia: 4999, tien_te: 'EUR', gia_goc: null, phi_ship: null },
        { so_luong: 2, gia: 7990, tien_te: 'EUR', gia_goc: 9998, phi_ship: 450 },
      ]);
      const sp = await spBot('Europe');
      assert.deepEqual(sp.map((s) => s.ma), [`${SHOP.Europe}:r`], 'page Europe đọc đúng món shop Europe');
      const g = sp[0].goiGia.map(goiGiaChoChat);
      assert.deepEqual(g.map((x) => [x.qty, x.price, x.currency, x.giaGoc, x.phiShip]), [[1, 49.99, 'EUR', null, null], [2, 79.9, 'EUR', 99.98, 4.5]]);
      assert.match(xayVanBanSanPham(sp), /Buy 1: 49\.99 EUR \| Buy 2: 79\.9 EUR \(giá gốc 99\.98, ship 4\.5\)/);
      assert.deepEqual(sanPhamChoBot(sp[0]).tiers.map((x) => x.price), [49.99, 79.9]);
      assert.equal(sanPhamChoBot(sp[0]).currency, 'EUR');
      const st = await pageStatus(pool, await page('Europe'), {});
      assert.equal(st.blockers.includes('Thiếu gói giá hợp lệ'), false, `blockers: ${st.blockers.join(' | ')}`);
    });

    await t.test('T2 · ④2 — Taiwan 1 × 990 TWD ⇒ gia 990 (KHÔNG 99000); bot/màn/bản chép hiện 990 TWD (không «9,90»)', async () => {
      await luuGia('Taiwan', [{ so_luong: 1, price: 990, tien_te: 'TWD' }, { so_luong: 2, price: 1290, tien_te: 'TWD', gia_goc: 1980, phi_ship: 60 }]);
      assert.deepEqual(await giaTho('Taiwan'), [
        { so_luong: 1, gia: 990, tien_te: 'TWD', gia_goc: null, phi_ship: null },
        { so_luong: 2, gia: 1290, tien_te: 'TWD', gia_goc: 1980, phi_ship: 60 },
      ]);
      const sp = await spBot('Taiwan');
      assert.deepEqual(sp[0].goiGia.map(goiGiaChoChat).map((x) => [x.price, x.currency, x.giaGoc, x.phiShip]), [[990, 'TWD', null, null], [1290, 'TWD', 1980, 60]]);
      assert.match(xayVanBanSanPham(sp), /Buy 1: 990 TWD \| Buy 2: 1290 TWD \(giá gốc 1980, ship 60\)/);
      assert.deepEqual(sanPhamChoBot(sp[0]).tiers.map((x) => x.price), [990, 1290]);
      // Màn Sản phẩm › Theo thị trường (ô nhập đơn vị LỚN) và màn «Sản phẩm & kho» (bộ đọc v3).
      const ct = await chiTietSanPhamGoc(pool, T, G.id);
      const tw = ct.thiTruong.find((x) => x.shopId === SHOP.Taiwan);
      assert.deepEqual(tw.mon[0].goiGia.map((x) => [x.gia, x.tienTe, x.giaGoc, x.phiShip]), [[990, 'TWD', null, null], [1290, 'TWD', 1980, 60]]);
      const eu = ct.thiTruong.find((x) => x.shopId === SHOP.Europe);
      assert.deepEqual(eu.mon[0].goiGia.map((x) => x.gia), [49.99, 79.9]);
      const kho = await taoKhoSanPhamV3(pool).motPage('fb-Taiwan');
      assert.deepEqual([kho.sanPham[0].giaDau, kho.sanPham[0].tienTe, kho.sanPham[0].bacGia.map((b) => b.gia)], [990, 'TWD', [990, 1290]]);
    });

    await t.test('T2b · ④2 — 990,5 TWD (giá · giá gốc · phí ship) ⇒ TỪ CHỐI rõ «không có xu», 0 ghi; 49,999 EUR ⇒ từ chối «lẻ quá đơn vị nhỏ»', async () => {
      const { id } = await monCua('Taiwan');
      const v0 = await ver(id); const g0 = await giaTho('Taiwan'); const d0 = await demGhi();
      for (const [offer, chu] of [
        [{ so_luong: 1, price: 990.5, tien_te: 'TWD' }, /^Giá 990\.5 TWD có phần lẻ — POS không có xu cho TWD/],
        [{ so_luong: 1, price: 990, tien_te: 'TWD', gia_goc: 1980.5 }, /^Giá gốc 1980\.5 TWD có phần lẻ — POS không có xu/],
        [{ so_luong: 1, price: 990, tien_te: 'TWD', phi_ship: 59.9 }, /^Phí ship 59\.9 TWD có phần lẻ/],
        [{ so_luong: 1, price: 990, tien_te: 'TWD', gia_goc: 'abc<b>' }, /^Giá gốc không phải số$/],
      ]) {
        await assert.rejects(() => saveProduct(pool, bc, id, { offers: [offer], version: v0 }, { chiGia: true }),
          (e) => e.status === 400 && chu.test(e.message), JSON.stringify(offer));
      }
      assert.deepEqual([await ver(id), await giaTho('Taiwan'), await demGhi()], [v0, g0, d0], '0 ghi: phiên bản · bậc giá · nhật ký y nguyên');
      const e = await monCua('Europe'); const vE = await ver(e.id);
      await assert.rejects(() => saveProduct(pool, bc, e.id, { offers: [{ so_luong: 1, price: 49.999, tien_te: 'EUR' }], version: vE }, { chiGia: true }),
        (x) => x.status === 400 && /^Giá 49\.999 EUR lẻ quá đơn vị nhỏ POS \(1\/100 EUR\); nhập tối đa 2 chữ số thập phân$/.test(x.message));
      assert.deepEqual(await demGhi(), d0);
    });

    await t.test('T3 · ④3 — cua2Tien: Taiwan 990 TWD ⇒ MỞ, 991 ⇒ ĐÓNG, 990,5 ⇒ không có tổng (không làm tròn); Europe 49,99 EUR ⇒ MỞ, 49,98 ⇒ ĐÓNG', async () => {
      const r = [];
      for (const [m, gia, te, sl] of [['Taiwan', 990, 'TWD', 1], ['Taiwan', 1290, 'TWD', 2], ['Taiwan', 991, 'TWD', 1], ['Taiwan', 990, 'EUR', 1],
        ['Europe', 49.99, 'EUR', 1], ['Europe', 79.9, 'EUR', 2], ['Europe', 49.98, 'EUR', 1], ['Europe', 4999, 'TWD', 1]]) {
        const k = await cuaTien(m, gia, te, sl);
        r.push(`${m} ${gia} ${te}×${sl}: ${k.qua ? 'MỞ' : 'ĐÓNG'} ${k.ly_do} tong=${k.tong}`);
      }
      assert.deepEqual(r, [
        'Taiwan 990 TWD×1: MỞ khop_dung_mot_goi tong=990',
        'Taiwan 1290 TWD×2: MỞ khop_dung_mot_goi tong=1290',
        'Taiwan 991 TWD×1: ĐÓNG lech_bang_gia tong=991',
        'Taiwan 990 EUR×1: ĐÓNG lech_bang_gia tong=99000',       // cùng con số khác tệ ⇒ không khớp (không quy đổi)
        'Europe 49.99 EUR×1: MỞ khop_dung_mot_goi tong=4999',
        'Europe 79.9 EUR×2: MỞ khop_dung_mot_goi tong=7990',
        'Europe 49.98 EUR×1: ĐÓNG lech_bang_gia tong=4998',
        'Europe 4999 TWD×1: ĐÓNG lech_bang_gia tong=4999',        // đúng số nhỏ nhưng sai tệ ⇒ ĐÓNG
      ]);
      const le = await cuaTien('Taiwan', 990.5, 'TWD');
      assert.deepEqual([le.qua, le.ly_do], [false, 'khong_co_tong'], '990,5 TWD không được làm tròn thành gói 990/991');
    });

    await t.test('T4 · ④4 — đối soát GSP3 shop Romania: bản sao RON ⇒ CHÉP được (không còn thi_truong_la); bậc AED ⇒ lech_tien_te, 0 ghi', async () => {
      const banSao = async (pageId, ma, bac) => {
        const id = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,nguon) VALUES($1,$2,$3,'kb') RETURNING id", [T, pageId, ma])).id);
        for (const b of bac) await q('INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,$3,$4,$5)', [T, id, b.sl, b.gia, b.te]);
        return id;
      };
      const daiLy = { luuGia: async (posMa, x) => { const m = await monCuaGoc(pool, T, G.id, posMa); return saveProduct(pool, bc, m.id, { offers: x.offers, version: x.version }, { chiGia: true }); },
        dayMon: async () => {} };
      const bs = await banSao(PG.Romania, 'kb:fb-Romania:SP01', [{ sl: 1, gia: 14900, te: 'RON' }, { sl: 2, gia: 24900, te: 'RON' }]);
      const dv = await donViDoiSoat(pool, T, G.id, SHOP.Romania);
      assert.deepEqual(dv.shop, { id: SHOP.Romania, market: 'Romania', tienTe: 'RON' });
      assert.deepEqual(dv.banSao.map((b) => [b.tienTeSai, b.bac.map((x) => x.gia)]), [[false, [149, 249]]], 'màn đối soát đọc đơn vị LỚN 149 RON');
      await doiSoatDonVi(pool, T, { gocId: G.id, shopId: SHOP.Romania, dauDonVi: dv.dauDonVi }, daiLy);
      assert.deepEqual((await giaTho('Romania')).map((x) => [x.so_luong, x.gia, x.tien_te]), [[1, 14900, 'RON'], [2, 24900, 'RON']]);
      assert.equal((await mot('SELECT doi_soat FROM san_pham WHERE id=$1', [bs])).doi_soat, 'chep');
      const k = await cuaTien('Romania', 149, 'RON');
      assert.deepEqual([k.qua, k.ly_do], [true, 'khop_dung_mot_goi'], 'giá vừa chép lên món ⇒ cửa tiền page Romania MỞ');

      // Gốc thứ hai trên shop Romania, bản sao mang AED ⇒ bảng sẽ ghi lệch tệ thị trường.
      await q("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,'202 - Lamp','202',5,'pos')", [T, `${SHOP.Romania}:l`]);
      const L = await gopMonThanhGoc(pool, T, { maGoc: 'lamp', ten: 'Lamp', sku: '202', posMa: [`${SHOP.Romania}:l`] });
      const PL = await trang('fb-Lamp-RO');
      await ganPageVaoGoc(pool, T, L.id, { pageId: PL, shopId: SHOP.Romania });
      await banSao(PL, 'kb:fb-Lamp-RO:SP01', [{ sl: 1, gia: 9900, te: 'AED' }]);
      const d0 = await demGhi();
      const dvL = await donViDoiSoat(pool, T, L.id, SHOP.Romania);
      await assert.rejects(() => doiSoatDonVi(pool, T, { gocId: L.id, shopId: SHOP.Romania, dauDonVi: dvL.dauDonVi }, daiLy),
        (e) => e.ma === 'lech_tien_te' && e.duLieu.tienTeThiTruong === 'RON' && e.duLieu.bac[0].tienTe === 'AED');
      assert.deepEqual(await demGhi(), d0);
    });

    await t.test('T5 · ④5 — bảy tệ cũ không đổi một con số: SAR 99 ⇒ 9900 · KWD 10,9 ⇒ 1090; bot đọc lại; cửa tiền MỞ đúng gói', async () => {
      await luuGia('Saudi', [{ so_luong: 1, price: 99, tien_te: 'SAR' }, { so_luong: 2, price: 159.5, tien_te: 'SAR', phi_ship: 25 }]);
      await luuGia('Kuwait', [{ so_luong: 1, price: 10.9, tien_te: 'KWD' }, { so_luong: 2, price: 18.9, tien_te: 'KWD' }]);
      assert.deepEqual((await giaTho('Saudi')).map((x) => [x.gia, x.phi_ship]), [[9900, null], [15950, 2500]]);
      assert.deepEqual((await giaTho('Kuwait')).map((x) => x.gia), [1090, 1890]);
      assert.deepEqual((await spBot('Kuwait'))[0].goiGia.map(goiGiaChoChat).map((x) => x.price), [10.9, 18.9]);
      const r = [];
      for (const [m, gia, te, sl] of [['Saudi', 99, 'SAR', 1], ['Saudi', 159.5, 'SAR', 2], ['Kuwait', 10.9, 'KWD', 1], ['Kuwait', 18.9, 'KWD', 2], ['Kuwait', 109, 'KWD', 1]]) {
        const k = await cuaTien(m, gia, te, sl); r.push(`${m} ${gia}: ${k.qua ? 'MỞ' : 'ĐÓNG'} tong=${k.tong}`);
      }
      assert.deepEqual(r, ['Saudi 99: MỞ tong=9900', 'Saudi 159.5: MỞ tong=15950', 'Kuwait 10.9: MỞ tong=1090', 'Kuwait 18.9: MỞ tong=1890', 'Kuwait 109: ĐÓNG tong=10900']);
    });

    await t.test('T6 · ④6 — tệ lạ (GBP) ⇒ vẫn từ chối như cũ, 0 ghi; tổng GBP ⇒ không có tổng (cửa ĐÓNG)', async () => {
      const { id } = await monCua('Australia'); const vA = await ver(id);
      const d0 = await demGhi();
      await assert.rejects(() => saveProduct(pool, bc, id, { offers: [{ so_luong: 1, price: 49, tien_te: 'GBP' }], version: vA }, { chiGia: true }),
        (e) => e.status === 400 && e.message === 'Gói giá phải có số lượng duy nhất, giá dương và tiền tệ được hỗ trợ');
      await assert.rejects(() => saveProduct(pool, bc, id, { offers: [{ so_luong: 1, price: 49, tien_te: 'aud' }], version: vA }, { chiGia: true }),
        (e) => e.status === 400, 'mã tệ phải đúng chữ hoa như bảng — như cũ');
      assert.deepEqual(await demGhi(), d0);
      // Australia lưu được AUD (×100). ⚠️ `saveProduct` KHÔNG đối chiếu tệ với thị trường của shop (nợ N-TT1-TE-LECH-THI-TRUONG) —
      // bậc sai tệ lưu được, chỉ cửa tiền ĐÓNG khi tệ đơn ≠ tệ bậc (ca T3: 990 EUR trên page Taiwan).
      await luuGia('Australia', [{ so_luong: 1, price: 59.95, tien_te: 'AUD' }]);
      assert.deepEqual((await giaTho('Australia')).map((x) => [x.gia, x.tien_te]), [[5995, 'AUD']]);
      const k = await cuaTien('Australia', 59.95, 'AUD');
      assert.deepEqual([k.qua, k.tong], [true, 5995]);
      const kG = await cuaTien('Australia', 59.95, 'GBP');
      assert.deepEqual([kG.qua, kG.ly_do], [false, 'khong_co_tong']);
    });
  } finally {
    await sb.don();
  }
});
