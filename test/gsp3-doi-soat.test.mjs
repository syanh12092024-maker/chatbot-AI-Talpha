// GSP3 · ĐỐI SOÁT GIÁ + ẢNH CỦA BẢN SAO THEO ĐƠN VỊ GỐC × SHOP — trên Postgres THẬT (hộp cát riêng).
// Đi trọn đường thật: tầng A (`chuyen-ban-sao.js`) → cửa lưu giá có sẵn (`monCuaGoc` + `saveProduct` chỉ-giá + `taoBuocDayBot`, nối
// đúng như `v3/chay-that.js` khoSanPhamGoc.luuGia/doiSoat) → bản chép (`daySanPhamSangBot`) → `day` GIẢ đếm lời gọi theo page.
// Lớp kiểm vai + nhật ký đi qua `kho-goc.js` thật. Cửa tiền đo bằng CHÍNH `cua2Tien`.
// Nhánh KHÔNG chạm ở tệp này: nối dây `v3/chay-that.js` (cần cả hệ — ở đây dựng lại ĐÚNG khuôn đó) · router + màn (ở
// `v3/test/b/gsp3-doi-soat-man.test.mjs`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { donViDoiSoat, doiSoatDonVi, dsViecChuyen, boQuaPage, COT_BAC_CHEP } from '../src/products/chuyen-ban-sao.js';
import { gopMonThanhGoc, ganPageVaoGoc, goPageKhoiGoc, goMonPosKhoiGoc, boSanPhamGoc, monCuaGoc } from '../src/products/san-pham-goc.js';
import { saveProduct } from '../src/admin-v3/operations.js';
import { taoBuocDayBot } from '../v3/src/ui/van-hanh/router.js';
import { cua2Tien, chuanHoaHoSo } from '../src/orders/hang-cho.js';
import { datKhoGoc, datPheuNhatKyGoc, doiSoatDonVi as doiSoatQuaKho } from '../v3/src/ui/san-pham/kho-goc.js';

test('GSP3 · đối soát giá + ảnh theo đơn vị gốc × shop, trên Postgres thật', async (t) => {
  process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
  const sb = await dungSandbox('gsp3');
  const pool = sb.pool;
  const q = (sql, a = []) => pool.query(sql, a);
  const mot = async (sql, a = []) => (await q(sql, a)).rows[0];
  const so = async (sql, a = []) => Number((await mot(sql, a)).n);
  try {
    const T = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
    const KHAC = String((await mot("SELECT id FROM team WHERE slug='auus'")).id);
    const u = String((await mot("INSERT INTO nguoi_dung(email,ten) VALUES('qt@gsp3.test','QT') RETURNING id")).id);
    const bcQt = { teamId: T, nguoiDungId: u, vai: ['quan-tri'] };
    for (const [m, shop] of [['Saudi', '111'], ['Taiwan', '777']]) {
      await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,true)', [T, m, shop, maHoa('k')]);
    }
    const mon = (ma, ten, sku) => q("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,$3,$4,5,'pos')", [T, ma, ten, sku]);
    const gop = async (maGoc, sku, posMa) => gopMonThanhGoc(pool, T, { maGoc, ten: maGoc, sku, posMa });
    const trang = async (fb, ten, marketer = '') => String((await mot(
      "INSERT INTO page(team_id,page_id,ten,marketer,pos_shop_id) VALUES($1,$2,$3,$4,'111') RETURNING id", [T, fb, ten, marketer])).id);
    // Bản sao như MN2 nạp (nap-tu-kb): `nguon='kb'`, bậc ĐƠN VỊ NHỎ, ảnh `nguon='kb'`.
    const banSao = async (pageId, ma, bac, anh = []) => {
      const id = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,nguon) VALUES($1,$2,$3,'kb') RETURNING id", [T, pageId, ma])).id);
      for (const b of bac) {
        await q(`INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,gia_goc,khuyen_mai,phi_ship,mien_ship,bat,nhan)
                 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [T, id, b.sl, b.gia, b.te || 'SAR', b.giaGoc ?? null, b.km || '', b.ship ?? null, b.mienShip ?? null, b.bat ?? true, b.nhan || '']);
      }
      for (const [i, d] of anh.entries()) {
        await q("INSERT INTO anh_san_pham(team_id,san_pham_id,duong,nhan,thu_tu,nguon) VALUES($1,$2,$3,$4,$5,'kb')", [T, id, d, `ảnh ${i + 1}`, i]);
      }
      return id;
    };
    const bangTho = async (spId) => (await q(
      `SELECT (to_jsonb(g) - 'id' - 'san_pham_id' - 'team_id')::text AS k FROM goi_gia g WHERE san_pham_id=$1 ORDER BY so_luong`, [spId])).rows.map((r) => r.k);
    const anhCua = async (spId) => (await q('SELECT duong, nguon FROM anh_san_pham WHERE san_pham_id=$1 ORDER BY thu_tu, id', [spId])).rows;
    const dau = async (spId) => mot('SELECT doi_soat, doi_soat_goc, doi_soat_shop FROM san_pham WHERE id=$1', [spId]);
    const monId = async (ma) => String((await mot('SELECT id FROM san_pham WHERE team_id=$1 AND ma=$2', [T, ma])).id);
    const demGhi = async () => ({
      goiGia: await so('SELECT count(*) n FROM goi_gia'), anh: await so('SELECT count(*) n FROM anh_san_pham'),
      dau: await so('SELECT count(*) n FROM san_pham WHERE doi_soat IS NOT NULL'),
    });

    // `day` GIẢ (bản chép sang bot): đếm theo page, giữ thứ nó nhận; `dayNem` ⇒ ném (bot không nhận).
    const dayGoi = []; const luuGiaGoi = [];
    let dayNem = null; let dayNemTu = Infinity;   // dayNemTu = n ⇒ từ lời gọi thứ n+1 trở đi bot không nhận (hỏng GIỮA lượt)
    const day = async (pid, products) => {
      dayGoi.push({ pid, products });
      if (dayNem) throw dayNem;
      if (dayGoi.length > dayNemTu) throw new Error('bot chết giữa lượt');
    };
    // Nối dây ĐÚNG khuôn `v3/chay-that.js`: luuGia = monCuaGoc + saveProduct chỉ-giá + taoBuocDayBot; dayMon = cùng bước đẩy.
    const deps = (bc, gocId) => ({
      luuGia: async (posMa, x) => {
        luuGiaGoi.push(posMa);
        const m = await monCuaGoc(pool, bc.teamId, gocId, posMa);
        return saveProduct(pool, bc, m.id, { offers: x.offers, version: x.version }, { chiGia: true, sauKhiLuu: taoBuocDayBot({ day }) });
      },
      dayMon: async (id) => taoBuocDayBot({ day })(pool, bc, id),
    });
    const nhatKy = [];
    const noop = async () => ({});
    datKhoGoc({
      ...Object.fromEntries(['ds', 'cho', 'dem', 'tao', 'sua', 'bo', 'chiTiet', 'monChuaGan', 'gan', 'go', 'kienThuc', 'goiYGop', 'gop',
        'luuGia', 'ganPage', 'goPage'].map((k) => [k, noop])),
      donViDoiSoat: (bc, gocId, shopId) => donViDoiSoat(pool, bc.teamId, gocId, shopId),
      doiSoat: (bc, x) => doiSoatDonVi(pool, bc.teamId, x, deps(bc, x.gocId)),
    });
    datPheuNhatKyGoc(async (_bc, ban) => { nhatKy.push(ban); });
    t.after(() => { datKhoGoc(null); datPheuNhatKyGoc(null); });
    const doiSoat = (x, bc = bcQt) => doiSoatQuaKho(bc, x);

    // ── Dựng: gốc G có đúng 1 món S1:x (chưa giá); P1, P2 cùng gắn G × S1. ──
    await mon('111:x', '101 - Gold Ring X', '101');
    const G = await gop('gold', '101', ['111:x']);
    const P1 = await trang('fbP1', 'Gold P1', 'Lan');
    const P2 = await trang('fbP2', 'Gold P2', 'Minh');
    for (const p of [P1, P2]) await ganPageVaoGoc(pool, T, G.id, { pageId: p, shopId: '111' });
    const bs1 = await banSao(P1, 'kb:fbP1:SP01', [
      { sl: 1, gia: 19900, nhan: 'Mua 1' }, { sl: 2, gia: 29900, ship: 2500, nhan: 'Mua 2' }, { sl: 3, gia: 39900, bat: false, nhan: 'Mua 3' }],
    ['/uploads/p1-a.png', '/uploads/p1-b.png', '/uploads/chung.png']);
    const bs2 = await banSao(P2, 'kb:fbP2:SP01', [{ sl: 1, gia: 24900 }, { sl: 2, gia: 34900 }], ['/uploads/chung.png', '/uploads/p2-a.png']);
    // Page CHƯA gắn có gợi ý số 1 trỏ món của đơn vị (báo trước, không chặn).
    const W = await trang('fbW', 'Gold Ring X Saudi');
    await banSao(W, 'kb:fbW:SP01', [{ sl: 1, gia: 10000 }]);
    const xId = await monId('111:x');
    const bam = async (ids) => (await q(
      `SELECT md5(string_agg(x, '|' ORDER BY x)) AS h FROM (
         SELECT (to_jsonb(s) - 'doi_soat' - 'doi_soat_luc' - 'doi_soat_goc' - 'doi_soat_shop')::text AS x FROM san_pham s WHERE id = ANY($1::bigint[])
         UNION ALL SELECT to_jsonb(g)::text FROM goi_gia g WHERE san_pham_id = ANY($1::bigint[])
         UNION ALL SELECT to_jsonb(a)::text FROM anh_san_pham a WHERE san_pham_id = ANY($1::bigint[])) z`, [ids])).rows[0].h;
    const bamTruoc = await bam([bs1, bs2]);

    await t.test('A0 · chín cột chép ≡ cột goi_gia trừ khoá (lược đồ thật) — chép thiếu cột là đổi giá ngầm', async () => {
      const cot = (await q(`SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='goi_gia'
        AND column_name NOT IN ('id','team_id','san_pham_id') ORDER BY column_name`)).rows.map((r) => r.column_name);
      assert.deepEqual([...COT_BAC_CHEP].sort(), cot);
    });

    await t.test('A9b · bộ đọc: đơn vị LỚN (199 / ship 25, không 19900 / 2500), hai bảng khác nhau, page đơn vị + page chưa gắn cùng món', async () => {
      const dv = await donViDoiSoat(pool, T, G.id, '111');
      const b1 = dv.banSao.find((b) => b.id === bs1);
      assert.deepEqual(b1.bac.map((x) => [x.soLuong, x.gia, x.phiShip, x.bat]), [[1, 199, null, true], [2, 299, 25, true], [3, 399, null, false]]);
      assert.equal(dv.shop.tienTe, 'SAR');
      assert.equal(dv.bangKhacNhau.length, 2);
      assert.deepEqual(dv.pageDonVi.map((p) => [p.pageId, p.trangThai]), [[P1, 'cho_doi_soat'], [P2, 'cho_doi_soat']]);
      assert.deepEqual(dv.pageChuaGanCungMon.map((p) => p.pageId), [W]);
      assert.equal(b1.marketerPage, 'Lan');
    });

    await t.test('④1 · lệch giữa page, không chọn ⇒ 409 lech_gia_giua_page kèm hai bảng + marketer + page đổi giá; KHÔNG ghi gì', async () => {
      const truoc = await demGhi();
      await assert.rejects(() => doiSoat({ gocId: G.id, shopId: '111' }), (e) => {
        assert.equal(e.ma, 'lech_gia_giua_page'); assert.equal(e.status, 409);
        const l = e.duLieu.lech[0];
        assert.equal(l.posMa, '111:x');
        assert.deepEqual(l.bang.map((b) => b.banSao.map((x) => [x.pageId, x.marketerPage])), [[[P1, 'Lan']], [[P2, 'Minh']]]);
        assert.deepEqual(l.bang[0].bac.map((x) => x.gia), [199, 299, 399]);
        assert.deepEqual(e.duLieu.pageDoiGia.map((p) => p.pageId), [P1, P2]);
        return true;
      });
      assert.deepEqual(await demGhi(), truoc);
      assert.equal(dayGoi.length, 0);
      assert.deepEqual([(await dau(bs1)).doi_soat, (await dau(bs2)).doi_soat], [null, null]);
    });

    await t.test('chọn sai ⇒ 409 không ghi: giữ giá món khi món chưa giá · bản sao không thuộc món', async () => {
      const truoc = await demGhi();
      await assert.rejects(() => doiSoat({ gocId: G.id, shopId: '111', chon: { '111:x': 'giu_gia_mon' } }), (e) => e.ma === 'khong_co_gia_mon');
      await assert.rejects(() => doiSoat({ gocId: G.id, shopId: '111', chon: { '111:x': { banSaoId: '999999' } } }), (e) => e.ma === 'chon_khong_hop_le');
      assert.deepEqual(await demGhi(), truoc);
      assert.equal(dayGoi.length, 0);
    });

    await t.test('④3a · trước đối soát: cửa tiền P2 ĐÓNG vì món chưa có bảng giá', async () => {
      const c = await cua2Tien(pool, { teamId: T, pageId: P2, duLieu: chuanHoaHoSo({ total_price: 299, qty: 2, currency: 'SAR' }) });
      assert.deepEqual([c.qua, c.ly_do], [false, 'unknown_chua_co_bang_gia']);
    });

    await t.test('④2 · chọn bảng P1 ⇒ món ≡ P1 TRỌN hàng (bậc tắt, ship) · 4 ảnh kb P1→P2 · day 1 lần/page · dấu cả đơn vị · bản sao nguyên', async () => {
      const kq = await doiSoat({ gocId: G.id, shopId: '111', chon: { '111:x': { banSaoId: bs1 } } });
      assert.equal(kq.daXong, false);
      assert.deepEqual(kq.pageSangXong.map((p) => p.pageId), [P1, P2], 'bộ đếm giảm đúng 2 page của đơn vị');
      assert.deepEqual(await bangTho(xId), await bangTho(bs1), 'goi_gia món ≡ bảng P1 trên trọn hàng (gồm bat=false, phi_ship)');
      assert.equal((await bangTho(xId)).length, 3);
      assert.equal((await mot('SELECT gia_tay FROM san_pham WHERE id=$1', [xId])).gia_tay, true);
      assert.deepEqual((await anhCua(xId)).map((a) => [a.duong, a.nguon]),
        [['/uploads/p1-a.png', 'kb'], ['/uploads/p1-b.png', 'kb'], ['/uploads/chung.png', 'kb'], ['/uploads/p2-a.png', 'kb']]);
      assert.deepEqual(luuGiaGoi, ['111:x']);
      assert.deepEqual(dayGoi.map((x) => x.pid).sort(), ['fbP1', 'fbP2'], 'đẩy đúng 1 lần cho MỖI page bán món');
      const sp = dayGoi[0].products[0];
      assert.deepEqual(sp.tiers.map((x) => x.price), [199, 299], 'bot nhận bậc BẬT ở đơn vị lớn (bậc tắt không ra bản chép)');
      assert.equal(sp.images.length, 4);
      assert.deepEqual([(await dau(bs1)).doi_soat, (await dau(bs2)).doi_soat], ['chep', 'giu_gia_mon']);
      assert.equal(await bam([bs1, bs2]), bamTruoc, 'bản sao giữ NGUYÊN (dòng + bậc + ảnh), chỉ thêm dấu');
      const nk = nhatKy.filter((x) => x.hanhDong === 'doi_soat_ban_sao');
      assert.deepEqual(nk.map((x) => [x.doiTuongLoai, x.doiTuongId]), [['san_pham_goc', G.id], ['page', P1], ['page', P2]]);
      assert.deepEqual(nk[0].sau.pageDoiGia.map((p) => p.pageId), [P1, P2]);
      assert.equal(nk[0].sau.mon[0].bangThang.pageId, P1);
      assert.match(nk[0].ghiChu, /2 page đổi giá/);
      assert.ok((await dsViecChuyen(pool, T)).viec.every((v) => v.pageId !== P1 && v.pageId !== P2), 'P1, P2 sang xong');
    });

    await t.test('④3 · cửa tiền P2 đọc đúng bảng vừa chép: 2×299 MỞ · 2×349 ĐÓNG · 3×399 (tắt) ĐÓNG', async () => {
      const cua = async (gia, sl) => cua2Tien(pool, { teamId: T, pageId: P2, duLieu: chuanHoaHoSo({ total_price: gia, qty: sl, currency: 'SAR' }) });
      const mo = await cua(299, 2);
      assert.deepEqual([mo.qua, mo.ly_do], [true, 'khop_dung_mot_goi']);
      for (const [gia, sl] of [[349, 2], [399, 3]]) {
        const c = await cua(gia, sl);
        assert.deepEqual([c.qua, c.ly_do], [false, 'lech_bang_gia'], `${sl}×${gia}`);
      }
    });

    await t.test('④4 · gọi lại ⇒ daXong, 0 ghi, day không thêm; dấu mang gốc × shop; gắn P2 sang gốc khác ⇒ chưa quyết ở đơn vị mới', async () => {
      const truoc = await demGhi(); const n = dayGoi.length;
      const kq = await doiSoat({ gocId: G.id, shopId: '111', chon: { '111:x': { banSaoId: bs1 } } });
      assert.equal(kq.daXong, true);
      assert.deepEqual(await demGhi(), truoc);
      assert.equal(dayGoi.length, n);
      for (const b of [bs1, bs2]) assert.deepEqual([(await dau(b)).doi_soat_goc, (await dau(b)).doi_soat_shop], ['gold', '111']);
      await mon('111:r', '909 - Regan', '909');
      const R = await gop('regan', '909', ['111:r']);
      await goPageKhoiGoc(pool, T, G.id, P2);
      await ganPageVaoGoc(pool, T, R.id, { pageId: P2, shopId: '111' });
      const dv = await donViDoiSoat(pool, T, R.id, '111');
      assert.deepEqual(dv.banSao.map((b) => [b.id, b.daQuyet]), [[bs2, false]]);
    });

    await t.test('④5 · giá món giống hệt bản sao Q ⇒ KHÔNG saveProduct, ảnh vào món, day VẪN 1 lần, Q giu_gia_mon', async () => {
      await mon('111:k', '303 - Kit', '303');
      const K = await gop('kit', '303', ['111:k']);
      const kId = await monId('111:k');
      await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan) VALUES($1,$2,1,9900,'SAR','Mua 1')", [T, kId]);
      const Q = await trang('fbQ', 'Kit Q');
      await ganPageVaoGoc(pool, T, K.id, { pageId: Q, shopId: '111' });
      const bq = await banSao(Q, 'kb:fbQ:SP01', [{ sl: 1, gia: 9900, nhan: 'Mua 1' }], ['/uploads/kit.png']);
      const n = luuGiaGoi.length; const d0 = dayGoi.length;
      const kq = await doiSoat({ gocId: K.id, shopId: '111' });
      assert.equal(luuGiaGoi.length, n, 'không gọi cửa lưu giá');
      assert.deepEqual(dayGoi.slice(d0).map((x) => x.pid), ['fbQ']);
      assert.deepEqual(dayGoi[dayGoi.length - 1].products[0].images.map((x) => x.url), ['/uploads/kit.png']);
      assert.deepEqual((await anhCua(kId)).map((a) => a.duong), ['/uploads/kit.png']);
      assert.equal((await dau(bq)).doi_soat, 'giu_gia_mon');
      assert.equal(kq.mon[0].ghiGia, false);
      assert.equal(kq.pageDoiGia.length, 0);
    });

    await t.test('④6 · gốc 2 món: không cap ⇒ can_chon_mon 0 ghi; cap đủ ⇒ mỗi món nhận đúng bản sao cặp vào nó', async () => {
      await mon('111:h1', '202 - Hat S', '202'); await mon('111:h2', '202 - Hat L', '202');
      const H = await gop('hat', '202', ['111:h1', '111:h2']);
      const Q1 = await trang('fbQ1', 'Hat Q1'); const Q2 = await trang('fbQ2', 'Hat Q2');
      for (const p of [Q1, Q2]) await ganPageVaoGoc(pool, T, H.id, { pageId: p, shopId: '111' });
      const b1 = await banSao(Q1, 'kb:fbQ1:SP01', [{ sl: 1, gia: 11100 }]);
      const b2 = await banSao(Q2, 'kb:fbQ2:SP01', [{ sl: 1, gia: 22200 }]);
      const truoc = await demGhi();
      await assert.rejects(() => doiSoat({ gocId: H.id, shopId: '111' }), (e) => e.ma === 'can_chon_mon' && e.duLieu.mon.length === 2);
      await assert.rejects(() => doiSoat({ gocId: H.id, shopId: '111', cap: [{ banSaoId: b1, posMa: '111:h1' }] }), (e) => e.ma === 'can_chon_mon');
      assert.deepEqual(await demGhi(), truoc);
      await doiSoat({ gocId: H.id, shopId: '111', cap: [{ banSaoId: b1, posMa: '111:h1' }, { banSaoId: b2, posMa: '111:h2' }] });
      assert.deepEqual(await bangTho(await monId('111:h1')), await bangTho(b1));
      assert.deepEqual(await bangTho(await monId('111:h2')), await bangTho(b2));
      assert.deepEqual([(await dau(b1)).doi_soat, (await dau(b2)).doi_soat], ['chep', 'chep']);
    });

    await t.test('④7 · bậc AED trên shop Saudi ⇒ lech_tien_te; shop Taiwan ⇒ thi_truong_la; 0 ghi', async () => {
      await mon('111:l', '404 - Lamp', '404');
      const L = await gop('lamp', '404', ['111:l']);
      const R2 = await trang('fbR', 'Lamp R');
      await ganPageVaoGoc(pool, T, L.id, { pageId: R2, shopId: '111' });
      await banSao(R2, 'kb:fbR:SP01', [{ sl: 1, gia: 9900, te: 'AED' }]);
      await mon('777:t', '505 - Tea', '505');
      const TW = await gop('tea', '505', ['777:t']);
      const TP = String((await mot("INSERT INTO page(team_id,page_id,ten) VALUES($1,'fbTW','Tea TW') RETURNING id", [T])).id);
      await ganPageVaoGoc(pool, T, TW.id, { pageId: TP, shopId: '777' });
      await banSao(TP, 'kb:fbTW:SP01', [{ sl: 1, gia: 9900 }]);
      const truoc = await demGhi(); const n = dayGoi.length;
      await assert.rejects(() => doiSoat({ gocId: L.id, shopId: '111' }), (e) => e.ma === 'lech_tien_te' && e.duLieu.bac[0].tienTe === 'AED');
      await assert.rejects(() => doiSoat({ gocId: TW.id, shopId: '777' }), (e) => e.ma === 'thi_truong_la' && e.duLieu.market === 'Taiwan');
      assert.deepEqual(await demGhi(), truoc);
      assert.equal(dayGoi.length, n);
    });

    // Dựng cho ④8: món chưa giá, một page, bản sao 2 ảnh.
    await mon('111:d', '606 - Dress', '606');
    const D = await gop('dress', '606', ['111:d']);
    const DP = await trang('fbD', 'Dress D');
    await ganPageVaoGoc(pool, T, D.id, { pageId: DP, shopId: '111' });
    const bd = await banSao(DP, 'kb:fbD:SP01', [{ sl: 1, gia: 5900 }], ['/uploads/d-1.png', '/uploads/d-2.png']);
    const dId = await monId('111:d');

    await t.test('④8 · đẩy hỏng ⇒ 0 goi_gia đổi, 0 ảnh mới của lượt, dấu NULL (không nửa vời)', async () => {
      dayNem = new Error('bot không nhận');
      try {
        await assert.rejects(() => doiSoat({ gocId: D.id, shopId: '111' }), (e) => e.ma === 'luu_gia' && e.status === 502);
      } finally { dayNem = null; }
      assert.deepEqual(await bangTho(dId), []);
      assert.deepEqual(await anhCua(dId), []);
      assert.equal((await dau(bd)).doi_soat, null);
    });

    await t.test('④8b · đẩy hỏng VÀ gỡ ảnh hỏng ⇒ lỗi «nửa vời: 2 ảnh còn trên món», nhật ký ghi lại — không im', async () => {
      await q('CREATE TABLE gsp3_chan_xoa (x int)');
      await q(`CREATE FUNCTION gsp3_chan() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF EXISTS (SELECT 1 FROM gsp3_chan_xoa) THEN RAISE EXCEPTION 'chặn xoá ảnh (thước GSP3)'; END IF; RETURN OLD; END $$`);
      await q('CREATE TRIGGER gsp3_chan BEFORE DELETE ON anh_san_pham FOR EACH ROW EXECUTE FUNCTION gsp3_chan()');
      await q('INSERT INTO gsp3_chan_xoa VALUES (1)');
      dayNem = new Error('bot không nhận');
      const nk0 = nhatKy.length;
      try {
        await assert.rejects(() => doiSoat({ gocId: D.id, shopId: '111' }),
          (e) => e.ma === 'nua_voi' && /nửa vời: 2 ảnh còn trên món 111:d/.test(e.message) && e.duLieu.anhCon === 2);
      } finally { dayNem = null; await q('DELETE FROM gsp3_chan_xoa'); }
      assert.equal((await anhCua(dId)).length, 2, 'ảnh còn thật — đúng lời khai');
      assert.ok(nhatKy.slice(nk0).some((x) => x.hanhDong === 'doi_soat_ban_sao' && /NỬA VỜI/.test(x.ghiChu)));
      assert.equal((await dau(bd)).doi_soat, null);
      await q('DROP TRIGGER gsp3_chan ON anh_san_pham');
      await q('DELETE FROM anh_san_pham WHERE san_pham_id=$1', [dId]);
    });

    await t.test('④9 · marketer ⇒ 403 · team khác ⇒ 404 — 0 ghi', async () => {
      const truoc = await demGhi();
      await assert.rejects(() => doiSoat({ gocId: D.id, shopId: '111' }, { teamId: T, nguoiDungId: u, vai: ['marketer'] }), (e) => e.status === 403);
      await assert.rejects(() => doiSoatDonVi(pool, KHAC, { gocId: D.id, shopId: '111' }, deps({ teamId: KHAC, nguoiDungId: u }, D.id)),
        (e) => e.ma === 'khong_co' && e.status === 404);
      await assert.rejects(() => donViDoiSoat(pool, KHAC, D.id, '111'), (e) => e.status === 404);
      assert.deepEqual(await demGhi(), truoc);
    });

    await t.test('④9c F1 · chep với G×S1 → gỡ page → bỏ gốc → gộp lại CÙNG mã (món khác) → gắn ⇒ cho_doi_soat, không «xong»', async () => {
      await mon('111:e1', '701 - Egg', '701'); await mon('111:e2', '702 - Egg new', '702');
      const E0 = await gop('egg', '701', ['111:e1']);
      const E = await trang('fbE', 'Egg E');
      await ganPageVaoGoc(pool, T, E0.id, { pageId: E, shopId: '111' });
      const be = await banSao(E, 'kb:fbE:SP01', [{ sl: 1, gia: 15900 }]);
      await doiSoat({ gocId: E0.id, shopId: '111' });
      assert.equal((await dau(be)).doi_soat, 'chep');
      await goPageKhoiGoc(pool, T, E0.id, E);
      await goMonPosKhoiGoc(pool, T, E0.id, '111:e1');
      await boSanPhamGoc(pool, T, E0.id);
      assert.deepEqual(await dau(be), { doi_soat: null, doi_soat_goc: null, doi_soat_shop: null }, 'bỏ gốc ⇒ dọn dấu của mã đó');
      const E1 = await gop('egg', '702', ['111:e2']);
      await ganPageVaoGoc(pool, T, E1.id, { pageId: E, shopId: '111' });
      assert.equal((await dsViecChuyen(pool, T)).viec.find((v) => v.pageId === E)?.trangThai, 'cho_doi_soat');
    });

    await t.test('④9c F2 · bo_qua → gắn ⇒ cho_doi_soat → gỡ ⇒ chua_gan (KHÔNG về bo_qua)', async () => {
      const X = await trang('fbX', 'Xyz X');
      await banSao(X, 'kb:fbX:SP01', [{ sl: 1, gia: 1000 }]);
      await boQuaPage(pool, T, X, 'Thôi bán');
      const viec = async () => (await dsViecChuyen(pool, T)).viec.find((v) => v.pageId === X)?.trangThai;
      assert.equal(await viec(), 'bo_qua');
      await ganPageVaoGoc(pool, T, D.id, { pageId: X, shopId: '111' });
      assert.equal(await viec(), 'cho_doi_soat');
      await goPageKhoiGoc(pool, T, D.id, X);
      assert.equal(await viec(), 'chua_gan');
    });

    await t.test('R3 · dữ liệu bản sao cửa lưu không nhận (giá 0 ở bậc tắt · nhãn ảnh 90 ký tự) ⇒ 409 khong_chep_duoc TRƯỚC khi ghi', async () => {
      await mon('111:n9', '909 - Nine', '919');
      const N9 = await gop('nine', '919', ['111:n9']);
      const NP = await trang('fbN9', 'Nine N');
      await ganPageVaoGoc(pool, T, N9.id, { pageId: NP, shopId: '111' });
      const bn = await banSao(NP, 'kb:fbN9:SP01', [{ sl: 1, gia: 4900 }, { sl: 2, gia: 0, bat: false }], ['/uploads/n9.png']);
      await q('UPDATE anh_san_pham SET nhan=$2 WHERE san_pham_id=$1', [bn, 'x'.repeat(90)]);
      const truoc = await demGhi(); const n = dayGoi.length;
      await assert.rejects(() => doiSoat({ gocId: N9.id, shopId: '111' }), (e) => e.ma === 'khong_chep_duoc' && e.duLieu.loi.length === 2);
      assert.deepEqual(await demGhi(), truoc);
      assert.equal(dayGoi.length, n);
    });

    await t.test('R1 · gốc 2 món, món đầu đã ghi rồi món sau đẩy hỏng ⇒ nhật ký «đối soát DỞ» kể món đã đổi giá; chạy lại đi tiếp', async () => {
      await mon('111:m1', '303 - Mug S', '333'); await mon('111:m2', '303 - Mug L', '333');
      const M = await gop('mug', '333', ['111:m1', '111:m2']);
      const V1 = await trang('fbV1', 'Mug V1'); const V2 = await trang('fbV2', 'Mug V2');
      for (const pg of [V1, V2]) await ganPageVaoGoc(pool, T, M.id, { pageId: pg, shopId: '111' });
      const b1 = await banSao(V1, 'kb:fbV1:SP01', [{ sl: 1, gia: 3100 }]);
      const b2 = await banSao(V2, 'kb:fbV2:SP01', [{ sl: 1, gia: 3200 }]);
      const cap = [{ banSaoId: b1, posMa: '111:m1' }, { banSaoId: b2, posMa: '111:m2' }];
      dayNemTu = dayGoi.length + 2;   // món 1 đẩy được 2 page; lượt đẩy của món 2 hỏng
      const nk0 = nhatKy.length;
      try {
        await assert.rejects(() => doiSoat({ gocId: M.id, shopId: '111', cap }), (e) => e.ma === 'luu_gia' && e.status === 502);
      } finally { dayNemTu = Infinity; }
      assert.deepEqual(await bangTho(await monId('111:m1')), await bangTho(b1), 'món 1 đã ghi (commit) — nhật ký phải kể ra');
      assert.deepEqual(await bangTho(await monId('111:m2')), []);
      assert.deepEqual([(await dau(b1)).doi_soat, (await dau(b2)).doi_soat], [null, null], 'đơn vị chưa đánh dấu');
      const dd = nhatKy.slice(nk0).find((x) => x.hanhDong === 'doi_soat_ban_sao');
      assert.ok(dd, 'có dòng nhật ký cho lượt dở');
      assert.match(dd.ghiChu, /đối soát DỞ — đã ghi 111:m1 ← bảng page «Mug V1»; hỏng ở 111:m2/);
      assert.equal(dd.sau.daXongMon[0].bangThang.pageId, V1);
      await doiSoat({ gocId: M.id, shopId: '111', cap });
      assert.deepEqual(await bangTho(await monId('111:m2')), await bangTho(b2));
      assert.ok([(await dau(b1)).doi_soat, (await dau(b2)).doi_soat].every(Boolean), 'chạy lại ⇒ cả đơn vị đã quyết');
    });

    await t.test('④9 · CSDL chưa áp 032 ⇒ chua_ap_032, 0 ghi; bỏ gốc / gắn page vẫn thành như cũ', async () => {
      await q('ALTER TABLE san_pham DROP COLUMN doi_soat, DROP COLUMN doi_soat_luc, DROP COLUMN doi_soat_goc, DROP COLUMN doi_soat_shop');
      const truoc = { goiGia: await so('SELECT count(*) n FROM goi_gia'), anh: await so('SELECT count(*) n FROM anh_san_pham') };
      const n = dayGoi.length;
      await assert.rejects(() => doiSoat({ gocId: D.id, shopId: '111' }), (e) => e.ma === 'chua_ap_032' && e.status === 409);
      assert.deepEqual({ goiGia: await so('SELECT count(*) n FROM goi_gia'), anh: await so('SELECT count(*) n FROM anh_san_pham') }, truoc);
      assert.equal(dayGoi.length, n);
      assert.equal((await donViDoiSoat(pool, T, D.id, '111')).co032, false, 'bộ đọc vẫn đọc được, nói rõ chưa áp');
      const Y = await trang('fbY', 'Yarn Y');
      const kq = await ganPageVaoGoc(pool, T, D.id, { pageId: Y, shopId: '111' });
      assert.equal(kq.maGoc, 'dress');
      await mon('111:z', '808 - Zip', '808');
      const Z = await gop('zip', '808', ['111:z']);
      await goMonPosKhoiGoc(pool, T, Z.id, '111:z');
      assert.equal((await boSanPhamGoc(pool, T, Z.id)).maGoc, 'zip');
    });
  } finally {
    await sb.don();
  }
});
