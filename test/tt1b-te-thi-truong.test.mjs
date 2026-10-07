// PHIẾU TT1b · TỆ CỦA BẬC GIÁ VÀ CỦA ĐƠN PHẢI LÀ TỆ CỦA THỊ TRƯỜNG SHOP (đối kháng TT1 F1 — POS thu sai ×100 / ×0,01).
//
// Lỗ (đo 07/10, `refute-tt1-r1`): `saveProduct` chỉ kiểm tệ ∈ `HE_SO_TE`; bot lấy tệ ĐƠN từ chính bậc (`draft.js:34`) nên `cua2Tien`
// (tệ đơn ↔ tệ bậc) luôn khớp; `taoDon` cửa (b) chỉ kiểm tệ có hệ số. Shop Taiwan bậc «USD» 990 ⇒ POS shop nhận `shipping_fee=99000`
// (= 99.000 TWD, ×100); shop Europe bậc «TWD» 49 ⇒ POS nhận 49 (= 0,49 EUR, ×0,01).
// Hai chặn của phiếu: ① `saveProduct` (cả đường đầy đủ lẫn chỉ-giá) — món `nguon='pos'` tra `ket_noi_pos` theo CẶP (team, shop) — KHÔNG
// lọc `bat` — ⇒ tệ thị trường; bậc khác tệ / không có kết nối / thị trường ngoài bảng ⇒ 400, 0 ghi. Món `kb` giữ nguyên.
// ② `taoDon` cửa (b) — SAU kiểm `shop_lech`, TRƯỚC `dungPayload`: tệ đơn ≠ tệ thị trường / thị trường ngoài bảng ⇒ nhật ký «cửa (b)
// chặn: lech_te_thi_truong…» + `LoiThieuThamChieuSanPham` (thieu=['lech_te_thi_truong']), 0 POST.
//
// Postgres HỘP CÁT riêng (`db/sandbox.js`), POS GIẢ (đếm riêng GET / POST — đi qua `duyet` thì cửa ③ đã GET), 0 byte ra mạng.
// Nhánh KHÔNG chạm ở tệp này: màn «Theo thị trường» trên trình duyệt (`san-pham.html`, ô tiền tệ vẫn gõ tay — nợ N-TIEN-TE-MAC-DINH phần
// giao diện, ngoài phiếu) · đối soát GSP3 (`test/gsp3-doi-soat.test.mjs` đi qua `saveProduct` chỉ-giá với bảng thắng ĐÃ đúng tệ —
// chạy riêng ở cổng `tt1b.sh` ⑦) · đường ghi giá thứ hai `doc-danh-muc.js:225-255` (không chạy hôm nay — ⑥ phiếu).
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { saveProduct } from '../src/admin-v3/operations.js';
import { gopMonThanhGoc, ganPageVaoGoc, monCuaGoc } from '../src/products/san-pham-goc.js';
import { rapKb } from '../src/chat/rap-prompt.js';
import { chuanBiDon } from '../src/orders/draft.js';
import { vaoHangCho, duyet } from '../src/orders/hang-cho.js';
import { taoDon, HE_SO_TE } from '../src/pos/tao-don.js';
import * as pos from '../src/pos/index.js';
import * as chuyenBanSao from '../src/products/chuyen-ban-sao.js';
import { luuDonCho, duyetDonCho } from '../v3/src/ui/van-hanh/don-cho.js';
import { ctxHeThong } from '../src/db/index.js';
import { dungPhanB } from '../v3/src/vai-b.js';
import { taoTruyVanThat } from '../v3/src/noi-day/cong-du-lieu-that.js';
import { taoCongDanhTinh } from '../v3/src/noi-day/cong-danh-tinh.js';
import { bam } from '../v3/src/auth/index.js';

const KHOA = { V3_KHOA_MA_HOA: 'b'.repeat(64) };
const MO = { ...KHOA, V3_POS_GHI: '1' };

/** POS giả: đếm riêng GET / POST (khuôn `napGia` của `test/l3-m4-duyet.test.js`). Id đơn POS đếm CHUNG mọi bản giả — một ca lọt
 *  (trên bản chưa vá) không được làm ca sau chết vì trùng `ma_pos` thay vì đỏ đúng lý do của nó. */
let soDonPos = 9300;
function napGia() {
  const f = async (url, o = {}) => {
    if ((o.method || 'GET') === 'POST') {
      f.post += 1; f.than.push(JSON.parse(o.body)); f.url.push(String(url).replace(/api_key=[^&]+/, 'api_key=***'));
      return { ok: true, status: 200, text: async () => JSON.stringify({ data: { id: soDonPos++ } }) };
    }
    f.get += 1;
    return { ok: true, status: 200, text: async () => JSON.stringify({ data: [], total_entries: 0, total_pages: 1 }) };
  };
  f.post = 0; f.get = 0; f.than = []; f.url = [];
  return f;
}

// ═══ B · MỘT BẢNG, MỘT CHỖ (② 1) — known-answer từ phiếu ② 1 (giữ nguyên nội dung bảng TT1) ═══════════════════════════════════
test('B1 · TIEN_TE_THI_TRUONG sống ở src/pos (cạnh HE_SO_TE); chuyen-ban-sao re-export CÙNG đối tượng; mọi tệ của bảng có hệ số', () => {
  assert.ok(pos.TIEN_TE_THI_TRUONG, 'src/pos/index.js phải xuất TIEN_TE_THI_TRUONG');
  assert.equal(chuyenBanSao.TIEN_TE_THI_TRUONG, pos.TIEN_TE_THI_TRUONG, 'hai bảng ⇒ một bản vá chỉ tới được một bên');
  assert.deepEqual({ ...pos.TIEN_TE_THI_TRUONG }, {
    Saudi: 'SAR', UAE: 'AED', Kuwait: 'KWD', Qatar: 'QAR', Oman: 'OMR', Bahrain: 'BHD',
    Europe: 'EUR', Romania: 'RON', Slovakia: 'EUR', USA: 'USD', Australia: 'AUD', Taiwan: 'TWD',
  });
  assert.ok(Object.isFrozen(pos.TIEN_TE_THI_TRUONG));
  assert.deepEqual(Object.values(pos.TIEN_TE_THI_TRUONG).filter((te) => !Object.hasOwn(HE_SO_TE, te)), []);
});

test('TT1b · tệ bậc giá / tệ đơn ràng với tệ thị trường shop — Postgres hộp cát, POS giả', async (t) => {
  process.env.V3_KHOA_MA_HOA = KHOA.V3_KHOA_MA_HOA;
  process.env.V3_RAP_PROMPT_BAT = '1';
  process.env.V3_KHOA_VE = 'tt1b-only-signing-key-'.repeat(3);
  const sb = await dungSandbox('tt1b');
  const pool = sb.pool;
  let server;
  const q = (s, a = []) => pool.query(s, a);
  const mot = async (s, a = []) => (await q(s, a)).rows[0];
  try {
    const T = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
    const T2 = String((await mot("INSERT INTO team(slug,ten) VALUES('tt1b-b','Team B') RETURNING id")).id);
    const u = String((await mot("INSERT INTO nguoi_dung(email,ten) VALUES('qt@tt1b.test','QT') RETURNING id")).id);
    const bc = { teamId: T, nguoiDungId: u, vai: ['quan-tri'] };
    const bc2 = { teamId: T2, nguoiDungId: u, vai: ['quan-tri'] };
    // Kết nối team A. Kuwait TẮT (bat=false) — thị trường là thuộc tính của shop, tắt kết nối không khoá việc sửa giá. Japan: tên NGOÀI bảng.
    const SHOP = { Taiwan: '219', Europe: '201', Saudi: '111', Kuwait: '222', Japan: '701' };
    for (const [m, s] of Object.entries(SHOP))
      await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,$5)', [T, m, s, maHoa('k', KHOA), m !== 'Kuwait']);
    // Tên thị trường dính khoảng trắng (đường di trú không gọt — `themKetNoi` thì gọt): một luật tra bảng cho cả lưu giá, taoDon và GSP3 (trim).
    const SHOP_QATAR_TRIM = '333';
    await q("INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma) VALUES($1,'Qatar ',$2,$3)", [T, SHOP_QATAR_TRIM, maHoa('k', KHOA)]);

    const ver = async (id) => (await mot('SELECT xmin::text v FROM san_pham WHERE id=$1', [id])).v;
    const demGhi = async () => (await mot('SELECT count(*)::int n, coalesce(sum(gia),0)::text s, string_agg(tien_te, \',\' ORDER BY id) t FROM goi_gia'));
    const monPos = async (team, ma) => String((await mot("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,'Ring','101',5,'pos') RETURNING id", [team, ma])).id);
    const luu = async (id, offers, { chiGia, b = bc } = {}) => saveProduct(pool, b, id, chiGia
      ? { offers, version: await ver(id) }
      : { ten: 'Ring', mo_ta: 'Nhẫn', het_hang: false, offers, version: await ver(id) }, { chiGia });
    const gia = async (id) => (await q('SELECT gia::float8 g, tien_te t FROM goi_gia WHERE san_pham_id=$1 ORDER BY so_luong', [id])).rows.map((r) => `${r.g} ${r.t}`);
    const tuChoi = async (fn, khuon) => {
      const d0 = await demGhi();
      await assert.rejects(fn, (e) => { assert.equal(e.status, 400, e.message); assert.match(e.message, khuon); return true; });
      assert.deepEqual(await demGhi(), d0, 'bị từ chối mà vẫn ghi goi_gia');
    };

    for (const chiGia of [true, false]) {
      const duong = chiGia ? 'chỉ-giá (màn «Theo thị trường»)' : 'đầy đủ';
      await t.test(`S1 · ④1 [${duong}] Taiwan bậc «USD» 990 · Europe bậc «TWD» 49 ⇒ 400 nói rõ hai tệ + thị trường, 0 ghi, phiên bản không đổi`, async () => {
        const tw = await monPos(T, `${SHOP.Taiwan}:s1-${chiGia}`); const eu = await monPos(T, `${SHOP.Europe}:s1-${chiGia}`);
        const v0 = [await ver(tw), await ver(eu)];
        await tuChoi(() => luu(tw, [{ so_luong: 1, price: 990, tien_te: 'USD' }], { chiGia }), /^Bậc giá dùng USD nhưng shop Taiwan bán bằng TWD/);
        await tuChoi(() => luu(eu, [{ so_luong: 1, price: 49, tien_te: 'TWD' }], { chiGia }), /^Bậc giá dùng TWD nhưng shop Europe bán bằng EUR/);
        // Mọi bậc đều soát — bậc 1 đúng tệ không che bậc 2 sai tệ.
        await tuChoi(() => luu(tw, [{ so_luong: 1, price: 990, tien_te: 'TWD' }, { so_luong: 2, price: 18, tien_te: 'USD' }], { chiGia }),
          /^Bậc giá dùng USD nhưng shop Taiwan bán bằng TWD/);
        assert.deepEqual([await ver(tw), await ver(eu)], v0, 'bị từ chối mà phiên bản sản phẩm đổi (UPDATE san_pham đã chạy)');
      });
      await t.test(`S2 · ④1 [${duong}] Europe 49,99 EUR · Taiwan 990 TWD · Saudi 99 SAR ⇒ lưu thành như cũ (CHO-QUA thật)`, async () => {
        const kq = [];
        for (const [m, price, te] of [['Europe', 49.99, 'EUR'], ['Taiwan', 990, 'TWD'], ['Saudi', 99, 'SAR']]) {
          const id = await monPos(T, `${SHOP[m]}:s2-${chiGia}`);
          const r = await luu(id, [{ so_luong: 1, price, tien_te: te }], { chiGia });
          assert.equal(r.saved, true);
          kq.push(...(await gia(id)));
        }
        assert.deepEqual(kq, ['4999 EUR', '990 TWD', '9900 SAR']);
      });
      await t.test(`S3 · ④3 [${duong}] món kb (bản sao theo page) với bậc tệ bất kỳ có trong HE_SO_TE ⇒ lưu như cũ (đường bị cắt ở GSP4)`, async () => {
        const pg = String((await mot("INSERT INTO page(team_id,page_id,ten,pos_shop_id) VALUES($1,$2,'kb page',$3) RETURNING id", [T, `kb-${chiGia}`, SHOP.Taiwan])).id);
        const kb = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon) VALUES($1,$2,$3,'Ring','kb') RETURNING id", [T, pg, `kb:${pg}:SP1`])).id);
        await luu(kb, [{ so_luong: 1, price: 990, tien_te: 'USD' }], { chiGia });
        assert.deepEqual(await gia(kb), ['99000 USD']);
        await luu(kb, [{ so_luong: 1, price: 49, tien_te: 'EUR' }], { chiGia });
        assert.deepEqual(await gia(kb), ['4900 EUR']);
      });
    }

    await t.test('S4 · ④4 món POS của shop KHÔNG có kết nối trong team ⇒ 400 nói rõ, 0 ghi; mã món POS không mang shop ⇒ 400', async () => {
      const id = await monPos(T, '777:s4');
      await tuChoi(() => luu(id, [{ so_luong: 1, price: 99, tien_te: 'SAR' }], { chiGia: true }), /shop 777 chưa có kết nối POS trong team/);
      const la = await monPos(T, 'khong-co-shop');
      await tuChoi(() => luu(la, [{ so_luong: 1, price: 99, tien_te: 'SAR' }], { chiGia: true }), /không mang mã shop/);
    });
    await t.test('S5 · ④4 cùng shop_id ở hai team, chỉ team A có kết nối ⇒ món team B 400, món team A lưu được (tra theo CẶP team × shop)', async () => {
      const b = await monPos(T2, `${SHOP.Saudi}:s5`);
      await tuChoi(() => luu(b, [{ so_luong: 1, price: 99, tien_te: 'SAR' }], { chiGia: true, b: bc2 }), /shop 111 chưa có kết nối POS trong team/);
      const a = await monPos(T, `${SHOP.Saudi}:s5`);
      await luu(a, [{ so_luong: 1, price: 99, tien_te: 'SAR' }], { chiGia: true });
      assert.deepEqual(await gia(a), ['9900 SAR']);
    });
    await t.test('S6 · ④4 kết nối TẮT (bat=false) ⇒ vẫn lưu được đúng tệ, vẫn chặn sai tệ (không lọc `bat`)', async () => {
      const id = await monPos(T, `${SHOP.Kuwait}:s6`);
      await luu(id, [{ so_luong: 1, price: 10.9, tien_te: 'KWD' }], { chiGia: true });
      assert.deepEqual(await gia(id), ['1090 KWD']);
      await tuChoi(() => luu(id, [{ so_luong: 1, price: 109, tien_te: 'SAR' }], { chiGia: true }), /^Bậc giá dùng SAR nhưng shop Kuwait bán bằng KWD/);
    });
    await t.test('S7 · kết nối mang thị trường NGOÀI bảng (Japan) ⇒ 400 nói rõ, 0 ghi (fail-closed, không đoán tệ)', async () => {
      const id = await monPos(T, `${SHOP.Japan}:s7`);
      await tuChoi(() => luu(id, [{ so_luong: 1, price: 1980, tien_te: 'JPY' }], { chiGia: true }), /thị trường "Japan" chưa có trong bảng tiền tệ/);
    });
    await t.test('S8 · xoá HẾT bậc (offers rỗng) của món POS shop mất kết nối ⇒ lưu được — không bậc thì không có gì lệch tệ (lệch nhẹ ② 3, tổng duyệt)', async () => {
      const id = await monPos(T, '778:s8');
      await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,99000,'USD')", [T, id]);
      await luu(id, [], { chiGia: true });
      assert.deepEqual(await gia(id), [], 'bậc sai tệ cũ phải gỡ được');
      await tuChoi(() => luu(id, [{ so_luong: 1, price: 99, tien_te: 'SAR' }], { chiGia: true }), /shop 778 chưa có kết nối POS trong team/);
    });
    await t.test('S9 · thị trường dính khoảng trắng («Qatar ») ⇒ tra bảng sau khi gọt (một luật với GSP3): QAR lưu được, SAR bị chặn', async () => {
      const id = await monPos(T, `${SHOP_QATAR_TRIM}:s9`);
      await luu(id, [{ so_luong: 1, price: 159, tien_te: 'QAR' }], { chiGia: true });
      assert.deepEqual(await gia(id), ['15900 QAR']);
      await tuChoi(() => luu(id, [{ so_luong: 1, price: 159, tien_te: 'SAR' }], { chiGia: true }), /^Bậc giá dùng SAR nhưng shop Qatar bán bằng QAR/);
    });

    // ═══ R · ĐƯỜNG THẬT (repro F1 viết lại) — saveProduct chỉ-giá → KB bot → create_draft_order → hàng chờ → sale lưu + duyệt → taoDon ═══
    const chayTron = async ({ market, te, price, psid }) => {
      const shop = SHOP[market];
      const posMa = `${shop}:uuid-${psid}`;
      const sku = psid.replace(/\D/g, '');
      await q("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,$3,$4,5,'pos')", [T, posMa, `${sku} - Charm`, sku]);
      const G = await gopMonThanhGoc(pool, T, { maGoc: `charm-${psid}`, ten: 'Charm', sku, posMa: [posMa] });
      const fb = `fb-${psid}`;
      const pageId = String((await mot('INSERT INTO page(team_id,page_id,ten) VALUES($1,$2,$2) RETURNING id', [T, fb])).id);
      await ganPageVaoGoc(pool, T, G.id, { pageId, shopId: shop });
      const { id } = await monCuaGoc(pool, T, G.id, posMa);
      let luuLoi = null;
      try { await saveProduct(pool, bc, id, { offers: [{ so_luong: 1, price, tien_te: te }], version: await ver(id) }, { chiGia: true }); }
      catch (e) { luuLoi = e; }
      if (luuLoi) return { luuLoi };
      const kb = await rapKb(pool, { teamId: T, pageIdText: fb });
      const tier = kb.products[0].tiers[0];
      const order = chuanBiDon(kb, { name: 'Lin', phone: `+88691${sku.padStart(7, '0')}`, address: 'No. 1, Zhongshan Rd', city: 'Taipei', qty: 1, total_price: tier.price, cod_confirmed: true });
      const h = await mot("INSERT INTO hoi_thoai(team_id,page_id,psid,trang_thai,chu_so_huu) VALUES($1,$2,$3,'SELLING','AI') RETURNING id", [T, pageId, psid]);
      await q("INSERT INTO tin_cho_xu_ly(team_id,page_id,psid,conv_id,msg_id,noi_dung,trang_thai) VALUES($1,$2,$3,$4,$5,'ok order COD','xong')", [T, fb, psid, `conv-${psid}`, `m-${psid}`]);
      const saved = await vaoHangCho(pool, bc, {
        hoiThoaiId: h.id, teamId: T, convId: `conv-${psid}`, tinId: Number(sku) || 1,
        hoSo: { ...order, san_pham_ma: String(order.product_id).includes(':') ? order.product_id : '' },
      }, { nap: napGia(), env: KHOA });
      const row = await mot('SELECT xmin::text v, du_lieu_don FROM hang_cho_tao_don WHERE id=$1', [saved.id]);
      const du = row.du_lieu_don;
      await luuDonCho(pool, bc, saved.id, { ten: du.ten, sdt: du.sdt, dia_chi: du.dia_chi, thanh_pho: du.thanh_pho, kho_hang: 'kho-1', san_pham_ma: du.san_pham_ma, so_luong: 1, version: row.v });
      const nap = napGia();
      const kq = await duyetDonCho(pool, bc, saved.id, { version: (await mot('SELECT xmin::text v FROM hang_cho_tao_don WHERE id=$1', [saved.id])).v }, { nap, env: MO, taoDon });
      return { kq, nap, botNoi: `${tier.price} ${kb.products[0].currency}` };
    };
    await t.test('R1 · repro F1: Taiwan bậc «USD» 990 ⇒ chặn NGAY ở lưu giá (bot không bao giờ báo «990 USD»); Europe bậc «TWD» 49 ⇒ chặn', async () => {
      const a = await chayTron({ market: 'Taiwan', te: 'USD', price: 990, psid: 'ps201' });
      assert.match(a.luuLoi?.message || '(lưu thành — F1 còn mở)', /^Bậc giá dùng USD nhưng shop Taiwan bán bằng TWD/);
      const b = await chayTron({ market: 'Europe', te: 'TWD', price: 49, psid: 'ps202' });
      assert.match(b.luuLoi?.message || '(lưu thành — F1 còn mở)', /^Bậc giá dùng TWD nhưng shop Europe bán bằng EUR/);
    });
    await t.test('R2 · HÀNH VI trọn đường: Taiwan 990 TWD ⇒ bot báo «990 TWD», POS shop 219 nhận ĐÚNG 1 POST shipping_fee=990; Europe 49,99 EUR ⇒ 4999', async () => {
      const a = await chayTron({ market: 'Taiwan', te: 'TWD', price: 990, psid: 'ps203' });
      assert.equal(a.luuLoi, undefined);
      assert.equal(a.botNoi, '990 TWD');
      assert.equal(a.kq.tao, true, JSON.stringify(a.kq.chan_vi || a.kq));
      assert.equal(a.nap.post, 1);
      assert.match(a.nap.url[0], /\/shops\/219\/orders/);
      assert.equal(a.nap.than[0].shipping_fee, 990);
      const b = await chayTron({ market: 'Europe', te: 'EUR', price: 49.99, psid: 'ps204' });
      assert.equal(b.kq.tao, true, JSON.stringify(b.kq.chan_vi || b.kq));
      assert.equal(b.nap.post, 1);
      assert.match(b.nap.url[0], /\/shops\/201\/orders/);
      assert.equal(b.nap.than[0].shipping_fee, 4999);
    });

    // ═══ T · taoDon cửa (b) — hàng chờ dựng THẲNG (bậc sai tệ chèn thẳng goi_gia, bỏ qua saveProduct: bậc cũ có trước TT1b / đường ghi khác) ═══
    let soPhone = 0;
    const dungDon = async ({ pageShop, monShop, gia, te, sl = 2 }) => {
      soPhone += 1;
      const tag = `t${soPhone}`;
      const pageText = `tt1b-${tag}`;
      const pg = await mot("INSERT INTO page(team_id,page_id,ten,thi_truong,pos_shop_id) VALUES($1,$2,$2,' ',$3) RETURNING id", [T, pageText, pageShop]);
      const ma = `${monShop}:3e272c3b-ea70-4d10-981e-${String(soPhone).padStart(12, '0')}`;
      const sp = await mot('INSERT INTO san_pham(team_id,page_id,ma,ten) VALUES($1,$2,$3,$4) RETURNING id', [T, pg.id, ma, 'SP']);
      await q('INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,$3,$4,$5)', [T, sp.id, sl, gia, te]);
      const psid = `ps-${tag}`;
      const h = await mot("INSERT INTO hoi_thoai(team_id,page_id,psid,trang_thai,chu_so_huu) VALUES($1,$2,$3,'CLOSING','AI') RETURNING id", [T, pg.id, psid]);
      await q("INSERT INTO tin_cho_xu_ly(team_id,page_id,psid,conv_id,msg_id,noi_dung,trang_thai) VALUES($1,$2,$3,$4,$5,'yes i confirm','xong')",
        [T, pageText, psid, `conv-${psid}`, `msg-${psid}`]);
      const kq = await vaoHangCho(pool, ctxHeThong(), {
        hoiThoaiId: h.id, teamId: T, convId: `conv-${psid}`, tinId: 7000 + soPhone,
        hoSo: { ten: 'Sara', sdt: `+97150${String(1000000 + soPhone)}`, dia_chi: 'Jumeirah 3', thanh_pho: 'Dubai', so_luong: sl,
          tong_tien: gia, tien_te: te, san_pham_ma: ma, kho_hang: 'kho-tt1b' },
      }, { env: MO, nap: napGia() });
      return { hangChoId: kq.id };
    };
    const nhatKy = async (id) => (await q(
      "SELECT ghi_chu FROM nhat_ky WHERE hanh_dong='pos_tao_don_bi_chan' AND doi_tuong='hang_cho_tao_don' AND doi_tuong_id=$1 ORDER BY id", [String(id)],
    )).rows.map((r) => r.ghi_chu);
    const trangThai = async (id) => (await mot('SELECT trang_thai FROM hang_cho_tao_don WHERE id=$1', [id])).trang_thai;

    await t.test('T1 · ④2 đơn USD trên shop Taiwan (TWD) ⇒ 0 POST, nhật ký cửa «b» lech_te_thi_truong (không phải cửa (a)), lỗi có tên, hàng chờ vẫn chờ', async () => {
      const { hangChoId } = await dungDon({ pageShop: SHOP.Taiwan, monShop: SHOP.Taiwan, gia: 99000, te: 'USD' });
      const nap = napGia();
      await assert.rejects(() => duyet(pool, ctxHeThong(), { hangChoId, teamId: T }, { env: MO, nap }), (e) => {
        assert.equal(e.name, 'LoiThieuThamChieuSanPham');
        assert.deepEqual(e.thieu, ['lech_te_thi_truong']);
        assert.match(e.message, /USD/); assert.match(e.message, /TWD/); assert.match(e.message, /Taiwan/);
        assert.match(e.message, /báo marketer sửa bậc giá ở Sản phẩm › Theo thị trường/);
        assert.doesNotMatch(e.message, /boSung/, 'sale không sửa được tệ — câu không được dặn «Sale bổ sung qua boSung»');
        return true;
      });
      assert.equal(nap.post, 0, 'tệ lệch thị trường mà vẫn POST — POS thu ×100');
      const nk = await nhatKy(hangChoId);
      assert.deepEqual(nk, ['cửa (b) chặn: lech_te_thi_truong: đơn USD ≠ Taiwan TWD']);
      assert.equal(await trangThai(hangChoId), 'cho_duyet');
    });
    await t.test('T2 · ④2 thị trường NGOÀI bảng (Japan, đơn JPY) ⇒ chặn y như vậy, 0 POST', async () => {
      const { hangChoId } = await dungDon({ pageShop: SHOP.Japan, monShop: SHOP.Japan, gia: 1980, te: 'JPY' });
      const nap = napGia();
      await assert.rejects(() => duyet(pool, ctxHeThong(), { hangChoId, teamId: T }, { env: MO, nap }), (e) => {
        assert.equal(e.name, 'LoiThieuThamChieuSanPham');
        assert.deepEqual(e.thieu, ['lech_te_thi_truong']);
        assert.match(e.message, /Japan/); assert.match(e.message, /JPY/);
        return true;
      });
      assert.equal(nap.post, 0);
      assert.deepEqual(await nhatKy(hangChoId), ['cửa (b) chặn: lech_te_thi_truong: đơn JPY ≠ Japan (ngoài bảng)']);
    });
    await t.test('T3 · ④2 đơn ĐÚNG tệ (Taiwan 990 TWD, cùng env) ⇒ đúng 1 POST, shipping_fee=990 (TWD ×1), không dòng chặn', async () => {
      const { hangChoId } = await dungDon({ pageShop: SHOP.Taiwan, monShop: SHOP.Taiwan, gia: 990, te: 'TWD' });
      const nap = napGia();
      const kq = await duyet(pool, ctxHeThong(), { hangChoId, teamId: T }, { env: MO, nap });
      assert.equal(kq.tao, true, JSON.stringify(kq.chan_vi || kq));
      assert.equal(nap.post, 1);
      assert.equal(nap.than[0].shipping_fee, 990);
      assert.deepEqual(await nhatKy(hangChoId), []);
    });
    await t.test('T3b · thị trường dính khoảng trắng («Qatar », đơn QAR) ⇒ taoDon tra bảng sau khi gọt: đúng 1 POST — cùng luật với lưu giá', async () => {
      const { hangChoId } = await dungDon({ pageShop: SHOP_QATAR_TRIM, monShop: SHOP_QATAR_TRIM, gia: 15900, te: 'QAR' });
      const nap = napGia();
      const kq = await duyet(pool, ctxHeThong(), { hangChoId, teamId: T }, { env: MO, nap });
      assert.equal(kq.tao, true, JSON.stringify(kq.chan_vi || kq));
      assert.equal(nap.post, 1);
      assert.equal(nap.than[0].shipping_fee, 15900);
    });
    await t.test('T4 · ④2b vị trí: món nhầm shop (Europe 201 trên page Taiwan) + tệ lệch ⇒ lỗi shop_lech (kiểm shop TRƯỚC kiểm tệ)', async () => {
      const { hangChoId } = await dungDon({ pageShop: SHOP.Taiwan, monShop: SHOP.Europe, gia: 99000, te: 'USD' });
      const nap = napGia();
      await assert.rejects(() => duyet(pool, ctxHeThong(), { hangChoId, teamId: T }, { env: MO, nap }), (e) => {
        assert.deepEqual(e.thieu, ['shop_lech']);
        return true;
      });
      assert.equal(nap.post, 0);
      const nk = await nhatKy(hangChoId);
      assert.equal(nk.length, 1);
      assert.match(nk[0], /^cửa \(b\) chặn: san_pham_ma shop=201 ≠ kết nối shop=219/);
    });

    await t.test('T5 · ④2c đường sale thật: POST /api/hop-thu/don/:id/duyet với đơn lệch tệ ⇒ 400 nêu hai tệ + thị trường + «báo marketer sửa bậc», hàng chờ vẫn chờ, 0 POST', async () => {
      const matKhau = 'Tt1b-password-only-123';
      const nd = await mot('INSERT INTO nguoi_dung(email,ten,mat_khau_hash) VALUES($1,$1,$2) RETURNING id', ['sale@tt1b.test', await bam(matKhau)]);
      await q("INSERT INTO thanh_vien_team(team_id,nguoi_dung_id,vai_id) SELECT $1,$2,id FROM vai WHERE ma='sale'", [T, nd.id]);
      const { hangChoId } = await dungDon({ pageShop: SHOP.Taiwan, monShop: SHOP.Taiwan, gia: 99000, te: 'USD' });
      const env = { V3_POS_GHI: '1', V3_KHOA_MA_HOA: KHOA.V3_KHOA_MA_HOA };
      const nap = napGia();
      const app = express();
      dungPhanB(app, {
        express,
        vanHanh: { pool, env, orderDeps: { env, nap }, daySanPhamLenBot: async () => {} },
        taoTruyVan: (b) => taoTruyVanThat(pool, b),
        taoTruyVanHeThong: () => taoCongDanhTinh(pool),
      });
      server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
      const goc = `http://127.0.0.1:${server.address().port}`;
      const dn = await fetch(goc + '/api/dang-nhap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'sale@tt1b.test', matKhau }) });
      assert.equal(dn.status, 200, await dn.text());
      const ck = dn.headers.get('set-cookie').split(';')[0];
      const goi = async (duong, than) => {
        const r = await fetch(goc + duong, { method: than === undefined ? 'GET' : 'POST',
          headers: { Cookie: ck, 'Content-Type': 'application/json', 'X-V3-Action': '1' }, body: than === undefined ? undefined : JSON.stringify(than) });
        return { status: r.status, ...(await r.json().catch(() => ({}))) };
      };
      const d = await goi(`/api/hop-thu/don/${hangChoId}`);
      assert.equal(d.status, 200);
      const r = await goi(`/api/hop-thu/don/${hangChoId}/duyet`, { version: d.item.version });
      assert.equal(r.status, 400, JSON.stringify(r));
      assert.match(r.thongDiep, /USD/); assert.match(r.thongDiep, /TWD/); assert.match(r.thongDiep, /Taiwan/);
      assert.match(r.thongDiep, /báo marketer sửa bậc/);
      assert.equal(nap.post, 0);
      assert.equal(await trangThai(hangChoId), 'cho_duyet');
    });
  } finally {
    if (server) await new Promise((r) => server.close(r));
    await sb.don();
  }
});
