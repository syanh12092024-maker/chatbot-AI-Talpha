// GP1 · XEM TRƯỚC + ÁP GIÁ TỪ ĐƠN POS — trên Postgres THẬT (hộp cát riêng), BigQuery GIẢ (không mạng, không khoá).
// Đi trọn đường thật: lớp kiểm vai + nhật ký `kho-goc.js` → tầng A `gia-tu-don-pos.js` (ghép món của team, tiền tệ thị trường, dấu
// xem trước, chốt «0 dòng goi_gia» TRONG giao dịch ghi) → cửa lưu giá CÓ SẴN (`monCuaGoc` + `saveProduct` chỉ-giá + `taoBuocDayBot`, nối
// đúng khuôn `v3/chay-that.js` khoSanPhamGoc.luuGia) → bản chép (`daySanPhamSangBot`) → `day` GIẢ đếm lời gọi theo page.
// Nhánh KHÔNG chạm ở tệp này: nối dây `v3/chay-that.js` (cần cả hệ — dựng lại ĐÚNG khuôn đó ở `deps`; cổng gp1.sh ③ đối chiếu hình dạng)
// · router + màn (ở `v3/test/b/gp1-cua-man.test.mjs`) · câu đọc BigQuery thật (cấm gọi mạng trong ca).
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { xemTruoc, apGiaTuDon as apTangA } from '../src/products/gia-tu-don-pos.js';
import { gopMonThanhGoc, ganPageVaoGoc, monCuaGoc } from '../src/products/san-pham-goc.js';
import { TIEN_TE_THI_TRUONG } from '../src/products/chuyen-ban-sao.js';
import { saveProduct } from '../src/admin-v3/operations.js';
import { taoBuocDayBot, poolChotDauGiaoDich } from '../v3/src/ui/van-hanh/router.js';
import { datKhoGoc, datPheuNhatKyGoc, xemGiaTuDon, apGiaTuDon } from '../v3/src/ui/san-pham/kho-goc.js';
import { LoiThieuVai } from '../v3/src/auth/boi-canh.js';
import { rapKb } from '../src/chat/rap-prompt.js';

// Một dòng câu đọc BigQuery (khuôn `sqlGiaDon`): `n` đơn cùng ngày, cùng mức COD.
const dong = (team, posMa, n, cod, ngay, o = {}) => {
  const [shop, vid] = posMa.split(':');
  return { team_code: team, shop_id: shop, variation_id: vid, sku: o.sku ?? '264', so_luong: o.sl ?? 1, tien_te: o.te ?? 'SAR', cod, ngay,
    luc: `${ngay} 09:00:00+00`, so_don: n, gia_mon: o.giaMon ?? 0 };
};
const chuoi = (team, posMa, soNgay, cod, tu, o = {}) => Array.from({ length: soNgay }, (_, i) => {
  const d = new Date(`${tu}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i);
  return dong(team, posMa, 1, cod, d.toISOString().slice(0, 10), o);
});

test('GP1 · xem trước + áp trên Postgres thật (BigQuery giả)', async (t) => {
  process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
  const sb = await dungSandbox('gp1');
  const pool = sb.pool;
  const q = (sql, a = []) => pool.query(sql, a);
  const mot = async (sql, a = []) => (await q(sql, a)).rows[0];
  const so = async (sql, a = []) => Number((await mot(sql, a)).n);
  try {
    const T = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
    const AU = String((await mot("SELECT id FROM team WHERE slug='auus'")).id);
    const u = String((await mot("INSERT INTO nguoi_dung(email,ten) VALUES('qt@gp1.test','QT') RETURNING id")).id);
    const bcQt = { teamId: T, nguoiDungId: u, vai: ['quan-tri'] };
    const bcAu = { teamId: AU, nguoiDungId: u, vai: ['quan-tri'] };
    const SHOP = { Saudi: '111', Taiwan: '219', Kuwait: '222' };
    for (const [m, s] of Object.entries(SHOP)) {
      await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,true)', [T, m, s, maHoa('k')]);
    }
    await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,true)', [AU, 'USA', '333', maHoa('k')]);
    const ID = {};
    const mon = async (k, ma, sku) => {
      ID[k] = String((await mot("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,$3,$4,5,'pos') RETURNING id",
        [T, ma, `${sku} - Món ${k}`, sku])).id);
    };
    // A + TW cùng SKU 264 (một gốc, hai thị trường) · B có bậc · C không đơn · D đơn AED trên shop Saudi · E đơn không ghép team · F chưa
    // gộp gốc · G chỉ có đơn của team EU · H chỉ có MỘT bậc TẮT · (111:vz không phải món của team).
    await mon('A', '111:va', '264'); await mon('TW', '219:vt', '264'); await mon('B', '111:vb', '265'); await mon('C', '111:vc', '266');
    await mon('D', '111:vd', '267'); await mon('E', '111:ve', '268'); await mon('F', '111:vf', '269'); await mon('G', '111:vg', '270');
    await mon('H', '111:vh', '271'); await mon('E2', '111:ve2', '274');
    const GOC = {};
    GOC.a = await gopMonThanhGoc(pool, T, { maGoc: 'ga', ten: 'Gold A', sku: '264', posMa: ['111:va', '219:vt'] });
    for (const [k, ma, sku] of [['b', '111:vb', '265'], ['c', '111:vc', '266'], ['d', '111:vd', '267'], ['e', '111:ve', '268'],
      ['g', '111:vg', '270'], ['h', '111:vh', '271'], ['e2', '111:ve2', '274']]) GOC[k] = await gopMonThanhGoc(pool, T, { maGoc: `g${k}`, ten: `Gốc ${k}`, sku, posMa: [ma] });
    const trang = async (fb) => String((await mot('INSERT INTO page(team_id,page_id,ten) VALUES($1,$2,$2) RETURNING id', [T, fb])).id);
    const PG = {};
    for (const [k, fb, goc, shop] of [['A1', 'fbA1', 'a', '111'], ['A2', 'fbA2', 'a', '111'], ['TW', 'fbTW', 'a', '219'], ['B', 'fbB', 'b', '111']]) {
      PG[k] = await trang(fb);
      await ganPageVaoGoc(pool, T, GOC[goc].id, { pageId: PG[k], shopId: shop });
    }
    await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,12900,'SAR'),($1,$2,2,19900,'SAR')", [T, ID.B]);
    await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,bat) VALUES($1,$2,1,9900,'SAR',false)", [T, ID.H]);

    const GCC = 'PIALPHA_GCC'; const EU = 'PIALPHA_EU';
    let dongBq = [
      ...chuoi(GCC, '111:va', 10, 9900, '2026-09-01'), ...chuoi(GCC, '111:va', 5, 15900, '2026-09-01', { sl: 2 }),
      // Đơn của marketer team EU trên CHÍNH món A, MỚI HƠN, giá khác — không được vào bậc của team T (④5).
      ...chuoi(EU, '111:va', 20, 7900, '2026-09-11'),
      ...chuoi(GCC, '219:vt', 5, 990, '2026-09-01', { te: 'TWD' }), ...chuoi(GCC, '219:vt', 4, 1690, '2026-09-01', { te: 'TWD', sl: 2 }),
      ...chuoi(GCC, '111:vb', 5, 11900, '2026-09-01', { sku: '265' }),
      ...chuoi(GCC, '111:vz', 5, 9900, '2026-09-01', { sku: '299' }),
      ...chuoi(GCC, '111:vd', 5, 9900, '2026-09-01', { sku: '267', te: 'AED' }),
      ...chuoi(null, '111:ve', 4, 9900, '2026-09-01', { sku: '268' }), dong('PIALPHA_SALE_ONLINE', '111:ve', 1, 9900, '2026-09-08', { sku: '268' }),
      // Marketer ĐÃ ghép HRM nhưng thuộc team ngoài hệ (vận đơn) — không phải «không ghép được», cũng không phải đơn của team T ⇒ BỎ.
      ...chuoi('VANDON', '111:ve2', 5, 9900, '2026-09-01', { sku: '274' }),
      ...chuoi(GCC, '111:vf', 5, 9900, '2026-09-01', { sku: '269' }),
      ...chuoi(EU, '111:vg', 5, 9900, '2026-09-01', { sku: '270' }),
      ...chuoi(GCC, '111:vh', 5, 9900, '2026-09-01', { sku: '271' }),
      { ...dong(GCC, '111:va', 1, 9900, '2026-09-09'), so_luong: 0 },   // dòng hỏng (câu đọc đã lọc — tầng A vẫn tự gác, đếm ra)
      ...chuoi('PIALPHA_AUUS', '333:vu', 5, 4900, '2026-09-01', { sku: '301', te: 'USD' }),
    ];
    const cauDoc = [];
    const bq = { truyVan: async (sql) => { cauDoc.push(sql); return dongBq.map((r) => ({ ...r })); } };

    // `day` GIẢ (bản chép sang bot) đếm theo page.
    const dayGoi = [];
    const day = async (pid) => { dayGoi.push(pid); };
    let truocGhi = null;   // móc chạy NGAY TRƯỚC khi một món đi vào cửa lưu giá (dựng lượt ghi chen giữa)
    // Nối dây ĐÚNG khuôn `v3/chay-that.js`: luuGia = monCuaGoc + saveProduct chỉ-giá (pool bọc `chot` khi có) + taoBuocDayBot.
    const deps = (bc) => ({
      luuGia: async (x) => {
        if (truocGhi) await truocGhi(x);
        const m = await monCuaGoc(pool, bc.teamId, x.gocId, x.posMa);
        return saveProduct(x.chot ? poolChotDauGiaoDich(pool, x.chot) : pool, bc, m.id, { offers: x.offers, version: x.version },
          { chiGia: true, sauKhiLuu: taoBuocDayBot({ day }) });
      },
    });
    const nhatKy = [];
    const noop = async () => ({});
    datKhoGoc({
      ...Object.fromEntries(['ds', 'cho', 'dem', 'tao', 'sua', 'bo', 'chiTiet', 'monChuaGan', 'gan', 'go', 'kienThuc', 'goiYGop', 'gop',
        'luuGia', 'ganPage', 'goPage'].map((k) => [k, noop])),
      xemGiaTuDon: (bc, x) => xemTruoc(pool, bc.teamId, bq, x),
      apGiaTuDon: (bc, x) => apTangA(pool, bc.teamId, bq, x, deps(bc)),
    });
    datPheuNhatKyGoc(async (_bc, ban) => { nhatKy.push(ban); });
    t.after(() => { datKhoGoc(null); datPheuNhatKyGoc(null); });

    const bacCua = async (id) => (await q(
      `SELECT so_luong, gia::float8 AS gia, tien_te, gia_goc, phi_ship, mien_ship, khuyen_mai, bat FROM goi_gia WHERE san_pham_id=$1 ORDER BY so_luong`, [id])).rows;
    const bam = async (id) => (await mot(
      `SELECT md5(coalesce(string_agg((to_jsonb(g) - 'id')::text, '|' ORDER BY so_luong), '')) AS h FROM goi_gia g WHERE san_pham_id=$1`, [id])).h;
    const demGhi = async () => ({
      goiGia: await so('SELECT count(*) n FROM goi_gia'),
      nhatKy: await so('SELECT count(*) n FROM nhat_ky'),
      xmin: (await mot("SELECT string_agg(xmin::text, ',' ORDER BY id) AS x FROM san_pham")).x,
    });
    const loiCua = async (fn) => { try { await fn(); } catch (e) { return e; } return assert.fail('chờ lỗi mà lượt gọi lại THÀNH'); };

    await t.test('X1 · ④2 xem trước: đề xuất CHỈ món 0 dòng giá có đơn của team (A + TW); B · H ⇒ da_co_gia; 111:vz ⇒ khong_co_mon; 0 dòng ghi', async () => {
      const truoc = await demGhi();
      const xt = await xemGiaTuDon(bcQt);
      assert.deepEqual(xt.deXuat.map((d) => d.monId), [ID.A, ID.TW]);
      const lyDo = Object.fromEntries(xt.bo.map((b) => [b.posMa, b.lyDo]));
      assert.equal(lyDo['111:vb'], 'da_co_gia');
      assert.equal(lyDo['111:vh'], 'da_co_gia', 'một bậc TẮT vẫn là «đã có giá» — không ghi đè');
      assert.equal(lyDo['111:vz'], 'khong_co_mon');
      assert.equal(lyDo['111:vc'], undefined, 'món không có đơn: không đề xuất, không lý do');
      assert.equal(xt.dem.da_co_gia, 2);
      assert.equal(xt.dem.khong_co_mon, 1);
      assert.equal(xt.dongHong, 1, 'dòng hỏng của nguồn được đếm ra, không nuốt im');
      assert.equal(cauDoc.at(-1).includes('INTERVAL 59 DAY'), true, 'mặc định đọc 60 ngày');
      assert.match(xt.dauXemTruoc, /^[0-9a-f]{16,}$/);
      assert.equal(xt.tranMotLuot, 50, 'trần món mỗi lượt áp đi lên màn');
      assert.deepEqual(await demGhi(), truoc, 'xem trước không ghi một dòng nào (goi_gia · nhat_ky · xmin san_pham)');
    });

    await t.test('X2 · ④5 đơn marketer team khác không vào bậc của team T; món chỉ có đơn team khác không hiện', async () => {
      const xt = await xemGiaTuDon(bcQt);
      const a = xt.deXuat.find((d) => d.monId === ID.A);
      assert.deepEqual(a.bac.map((b) => [b.soLuong, b.gia, b.tong]), [[1, 9900, 10], [2, 15900, 5]], '20 đơn EU 79 SAR (mới hơn) không lọt vào');
      assert.equal(a.tienTe, 'SAR');
      assert.equal(a.market, 'Saudi');
      assert.deepEqual([a.gocId, a.maGoc], [GOC.a.id, 'ga']);
      assert.ok(!xt.deXuat.some((d) => d.monId === ID.G) && !xt.bo.some((b) => b.posMa === '111:vg'), 'G (chỉ đơn EU) không hiện');
    });

    await t.test('X3 · ④5 tiền tệ đơn ≠ tiền tệ thị trường shop ⇒ lech_tien_te · đơn không ghép team ⇒ khong_ghep_team · món chưa gộp ⇒ chua_gop_goc', async () => {
      const xt = await xemGiaTuDon(bcQt);
      const b = Object.fromEntries(xt.bo.map((x) => [x.posMa, x]));
      assert.equal(b['111:vd'].lyDo, 'lech_tien_te');
      assert.match(b['111:vd'].chiTiet, /AED.*SAR/);
      assert.equal(b['111:ve'].lyDo, 'khong_ghep_team');
      assert.equal(b['111:vf'].lyDo, 'chua_gop_goc');
      assert.equal(b['111:ve2'], undefined, 'đơn của team HRM ngoài hệ (đã ghép) không thành «không ghép được team» (/code-review #4)');
      assert.ok(!xt.deXuat.some((d) => d.monId === ID.E2));
      assert.deepEqual(xt.shopKhongDon, [{ shopId: '222', market: 'Kuwait' }], 'shop của team không có đơn một món nào trong cửa sổ — nói ra');
      const tw = xt.deXuat.find((d) => d.monId === ID.TW);
      assert.deepEqual([tw.tienTe, tw.bac.map((x) => x.gia)], ['TWD', [990, 1690]]);
    });

    await t.test('X4 · ④4 dấu xem trước lệch (một món có giá giữa lúc xem và lúc áp) ⇒ 409, 0 ghi; thiếu dấu ⇒ 409', async () => {
      const xt = await xemGiaTuDon(bcQt);
      // Người khác đặt giá cho TW ở «Theo thị trường» trong lúc màn xem trước còn mở.
      const v = (await mot('SELECT xmin::text AS v FROM san_pham WHERE id=$1', [ID.TW])).v;
      await saveProduct(pool, bcQt, ID.TW, { offers: [{ so_luong: 1, price: 1090, tien_te: 'TWD' }], version: v }, { chiGia: true });
      const truoc = await demGhi(); const dayTruoc = dayGoi.length; const nkTruoc = nhatKy.length;
      const e = await loiCua(() => apGiaTuDon(bcQt, { dauXemTruoc: xt.dauXemTruoc }));
      assert.equal(e.status, 409); assert.equal(e.ma, 'xem_truoc_da_doi');
      assert.ok(e.duLieu.xemTruoc.bo.some((b) => b.posMa === '219:vt' && b.lyDo === 'da_co_gia'), '409 mang bảng xem trước MỚI cho màn vẽ lại');
      assert.deepEqual(await demGhi(), truoc, '0 ghi');
      assert.equal(dayGoi.length, dayTruoc); assert.equal(nhatKy.length, nkTruoc);
      const e2 = await loiCua(() => apGiaTuDon(bcQt, {}));
      assert.equal(e2.status, 409); assert.equal(e2.ma, 'thieu_dau_xem_truoc');
      // dọn: TW về TRẠNG THÁI ĐẦU (0 dòng giá, chưa ai đặt giá tay) cho các ca sau. Vòng 2: lượt lưu giá ở trên đặt `gia_tay = true`;
      // chỉ xoá dòng thì TW thành «người đã xoá giá» (F2 — ca X11) và không còn được đề xuất ⇒ trả cả `gia_tay` (thước sửa theo luật mới).
      await q('DELETE FROM goi_gia WHERE san_pham_id=$1', [ID.TW]);
      await q('UPDATE san_pham SET gia_tay = false WHERE id=$1', [ID.TW]);
    });

    await t.test('X5 · ④3 áp: A + TW có đúng bậc (gia_tay, tệ thị trường, miễn ship · phí ship để trống), B nguyên vẹn, đẩy mọi page bán món, nhật ký có số đơn + tỷ lệ', async () => {
      const bamB = await bam(ID.B);
      const xt = await xemGiaTuDon(bcQt);
      dayGoi.length = 0; nhatKy.length = 0;
      const kq = await apGiaTuDon(bcQt, { dauXemTruoc: xt.dauXemTruoc });
      assert.deepEqual(kq.ghi.map((m) => m.monId), [ID.A, ID.TW]);
      assert.deepEqual(kq.hong, []);
      assert.deepEqual(kq.ghi.map((m) => [m.dongBo?.ok, m.dongBo?.page?.length]), [[true, 2], [true, 1]], 'kết quả bước đẩy bản chép đi lên màn');
      // Vòng 2 (người quyết 07/10 «Miễn ship»): bậc = COD trọn gói đã gồm ship ⇒ `mien_ship = true`; phí ship / giá gốc vẫn trống.
      assert.deepEqual(await bacCua(ID.A), [
        { so_luong: 1, gia: 9900, tien_te: 'SAR', gia_goc: null, phi_ship: null, mien_ship: true, khuyen_mai: '', bat: true },
        { so_luong: 2, gia: 15900, tien_te: 'SAR', gia_goc: null, phi_ship: null, mien_ship: true, khuyen_mai: '', bat: true }]);
      assert.deepEqual((await bacCua(ID.TW)).map((b) => [b.so_luong, b.gia, b.tien_te]), [[1, 990, 'TWD'], [2, 1690, 'TWD']]);
      assert.equal((await mot('SELECT gia_tay FROM san_pham WHERE id=$1', [ID.A])).gia_tay, true);
      // TT1b (song song): tệ của bậc PHẢI là tệ thị trường của (team, shop) — đọc lại từ ket_noi_pos, không từ code bị đo.
      const lech = (await q(`SELECT s.ma, g.tien_te, k.market FROM goi_gia g JOIN san_pham s ON s.id = g.san_pham_id
          JOIN ket_noi_pos k ON k.team_id = s.team_id AND k.shop_id = split_part(s.ma, ':', 1) WHERE s.id = ANY($1::bigint[])`, [[ID.A, ID.TW]])).rows
        .filter((r) => TIEN_TE_THI_TRUONG[r.market] !== r.tien_te);
      assert.deepEqual(lech, []);
      assert.equal(await bam(ID.B), bamB, 'B (đã có bậc) nguyên vẹn');
      assert.deepEqual([...dayGoi].sort(), ['fbA1', 'fbA2', 'fbTW'], 'đẩy bản chép tới MỌI page gắn gốc × shop của món, không page khác');
      assert.equal(nhatKy.length, 2);
      const nk = nhatKy.find((x) => x.sau.monId === ID.A);
      assert.equal(nk.hanhDong, 'dien_gia_tu_don_pos');
      assert.deepEqual([nk.doiTuongLoai, nk.doiTuongId], ['san_pham_goc', GOC.a.id]);
      assert.deepEqual(nk.sau.bac.map((b) => [b.soLuong, b.gia, b.soDonMuc, b.soDonGanDay, b.tong]), [[1, 9900, 10, 10, 10], [2, 15900, 5, 5, 5]]);
      assert.match(nk.ghiChu, /111:va/);
      assert.match(nk.ghiChu, /1 = 99 SAR · 10\/10 đơn gần nhất/);
      assert.match(nk.ghiChu, /2026-09-01…2026-09-10/);
      assert.match(nk.ghiChu, /đã gồm ship · miễn ship/, 'nhật ký nói đúng thứ đã ghi');
      // saveProduct đã chụp truoc/sau ⇒ đường lùi = xoá bậc (món trước đó RỖNG giá).
      const v3 = await mot("SELECT truoc, sau FROM nhat_ky WHERE hanh_dong='v3_sua_san_pham' AND doi_tuong_id=$1 ORDER BY id DESC LIMIT 1", [ID.A]);
      assert.deepEqual(v3.truoc.goi_gia, []);
      assert.equal(v3.sau.goi_gia.length, 2);
      const lai = await xemGiaTuDon(bcQt);
      assert.equal(lai.deXuat.length, 0, 'áp xong: không còn đề xuất (A, TW giờ là da_co_gia)');
    });

    await t.test('X12 · (vòng 2) «Miễn ship»: bậc GP1 đã áp ⇒ prompt bot đi rapKb → catalog → xayVanBanSanPham THẬT nói «miễn ship», không còn «phí ship CHƯA khai»', async () => {
      assert.deepEqual((await bacCua(ID.A)).map((b) => b.mien_ship), [true, true]);
      const cu = process.env.V3_RAP_PROMPT_BAT;
      process.env.V3_RAP_PROMPT_BAT = '1';   // ca tự bật cửa ráp prompt từ CSDL (luật 2 viet-thuoc) — pilot bật cờ này
      try {
        const kb = await rapKb(pool, { teamId: T, pageIdText: 'fbA1' });
        assert.equal(kb.nguon, 'db');
        assert.match(kb.text, /\[111:va\][^\n]*\n\s+Giá — Buy 1: 99 SAR \(miễn ship\) \| Buy 2: 159 SAR \(miễn ship\)/);
        assert.doesNotMatch(kb.text, /phí ship CHƯA khai/, 'bot không còn đẩy khách sang sale để hỏi phí ship');
        assert.deepEqual(kb.products[0].tiers.map((x) => [x.qty, x.price, x.mienShip, x.phiShip]), [[1, 99, true, null], [2, 159, true, null]]);
      } finally {
        if (cu === undefined) delete process.env.V3_RAP_PROMPT_BAT; else process.env.V3_RAP_PROMPT_BAT = cu;
      }
    });

    await t.test('X6 · chốt TRONG giao dịch: món có giá chen vào giữa lúc tính lại và lúc ghi (lượt kéo POS) ⇒ món đó hỏng da_co_gia, KHÔNG ghi đè', async () => {
      await mon('K', '111:vk', '272');
      GOC.k = await gopMonThanhGoc(pool, T, { maGoc: 'gk', ten: 'Gốc k', sku: '272', posMa: ['111:vk'] });
      PG.K = await trang('fbK');
      await ganPageVaoGoc(pool, T, GOC.k.id, { pageId: PG.K, shopId: '111' });
      dongBq = [...dongBq, ...chuoi(GCC, '111:vk', 5, 9900, '2026-09-01', { sku: '272' })];
      const xt = await xemGiaTuDon(bcQt);
      assert.deepEqual(xt.deXuat.map((d) => d.monId), [ID.K]);
      dayGoi.length = 0;
      truocGhi = async (x) => {   // lượt kéo POS ghi giá POS cho K (không chạm dòng san_pham — version giữ nguyên)
        if (x.monId === ID.K) await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,5000,'SAR')", [T, ID.K]);
      };
      try {
        const kq = await apGiaTuDon(bcQt, { dauXemTruoc: xt.dauXemTruoc });
        assert.deepEqual(kq.ghi, []);
        assert.deepEqual(kq.hong.map((h) => [h.monId, h.lyDo]), [[ID.K, 'da_co_gia']]);
      } finally { truocGhi = null; }
      assert.deepEqual((await bacCua(ID.K)).map((b) => [b.so_luong, b.gia]), [[1, 5000]], 'giá chen vào giữ nguyên — không bị DELETE/INSERT đè');
      assert.equal(dayGoi.length, 0, 'không đẩy bản chép cho món không ghi');
      await q('DELETE FROM goi_gia WHERE san_pham_id=$1', [ID.K]);
    });

    await t.test('X7 · chọn món (monIds): chỉ món chọn được ghi; món ngoài đề xuất / rỗng / quá trần mỗi lượt ⇒ 400, 0 ghi', async () => {
      await mon('L', '111:vl', '273');
      GOC.l = await gopMonThanhGoc(pool, T, { maGoc: 'gl', ten: 'Gốc l', sku: '273', posMa: ['111:vl'] });
      dongBq = [...dongBq, ...chuoi(GCC, '111:vl', 5, 8900, '2026-09-01', { sku: '273' })];
      const xt = await xemGiaTuDon(bcQt);
      assert.deepEqual(xt.deXuat.map((d) => d.monId).sort(), [ID.K, ID.L].sort());
      const truoc = await demGhi();
      const e = await loiCua(() => apGiaTuDon(bcQt, { dauXemTruoc: xt.dauXemTruoc, monIds: [ID.L, ID.B] }));
      assert.equal(e.status, 400); assert.equal(e.ma, 'mon_ngoai_de_xuat');
      const e2 = await loiCua(() => apGiaTuDon(bcQt, { dauXemTruoc: xt.dauXemTruoc, monIds: [] }));
      assert.equal(e2.status, 400);
      // Trần món mỗi lượt (/code-review #1): quá trần ⇒ 400 TRƯỚC khi ghi — chọn rõ lẫn «tất cả» (thiếu monIds).
      const e3 = await loiCua(() => apTangA(pool, T, bq, { dauXemTruoc: xt.dauXemTruoc, monIds: [ID.K, ID.L] }, { ...deps(bcQt), tranMotLuot: 1 }));
      assert.equal(e3.status, 400); assert.equal(e3.ma, 'qua_nhieu_mon');
      const e4 = await loiCua(() => apTangA(pool, T, bq, { dauXemTruoc: xt.dauXemTruoc }, { ...deps(bcQt), tranMotLuot: 1 }));
      assert.equal(e4.ma, 'qua_nhieu_mon');
      assert.deepEqual(await demGhi(), truoc, '0 ghi khi danh sách chọn sai / quá trần');
      const kq = await apGiaTuDon(bcQt, { dauXemTruoc: xt.dauXemTruoc, monIds: [ID.L] });
      assert.deepEqual(kq.ghi.map((m) => m.monId), [ID.L]);
      assert.deepEqual((await bacCua(ID.L)).map((b) => b.gia), [8900]);
      assert.deepEqual(await bacCua(ID.K), [], 'K không chọn ⇒ không ghi');
    });

    await t.test('X8 · ④6 team khác không thấy món của T; áp bằng team khác với id món của T ⇒ 400; marketer ⇒ 403', async () => {
      const xt = await xemGiaTuDon(bcAu);
      assert.deepEqual(xt.deXuat, []);
      const idT = new Set(Object.values(ID));
      assert.ok(!xt.bo.some((b) => idT.has(String(b.monId))), 'không món nào của T trong lý do bỏ của team AUUS');
      assert.deepEqual(xt.bo.map((b) => [b.posMa, b.lyDo]), [['333:vu', 'khong_co_mon']]);
      const truoc = await demGhi();
      const e = await loiCua(() => apGiaTuDon(bcAu, { dauXemTruoc: xt.dauXemTruoc, monIds: [ID.K] }));
      assert.equal(e.status, 400);
      assert.deepEqual(await demGhi(), truoc);
      const bcMk = { teamId: T, nguoiDungId: u, vai: ['marketer'] };
      await assert.rejects(() => xemGiaTuDon(bcMk), LoiThieuVai);
      await assert.rejects(() => apGiaTuDon(bcMk, { dauXemTruoc: 'x' }), LoiThieuVai);
    });

    await t.test('X13 · (/code-review vòng 2 #5) đơn MỚI làm một dòng thành «lệch» (F4) giữa lúc xem và lúc áp ⇒ dấu đổi ⇒ 409 kèm bảng mới (dòng tô), 0 ghi', async () => {
      const xt = await xemGiaTuDon(bcQt);
      const k = xt.deXuat.find((d) => d.monId === ID.K);
      assert.ok(k && k.bac.every((b) => b.ganNhat.gia === b.gia), 'K lúc xem: giá đơn gần nhất = giá bậc (chọn sẵn)');
      // đệm BigQuery làm mới: MỘT đơn mới của marketer chưa ghép team 109 SAR — tập gộp 5/6 vẫn 99 SAR ⇒ K vẫn đề xuất, nhưng LỆCH
      dongBq = [...dongBq, dong(null, '111:vk', 1, 10900, '2026-09-28', { sku: '272' })];
      const truoc = await demGhi();
      const e = await loiCua(() => apGiaTuDon(bcQt, { dauXemTruoc: xt.dauXemTruoc, monIds: [ID.K] }));
      assert.equal(e.status, 409, 'người chưa thấy cảnh báo «khác bậc» ⇒ không ghi');
      assert.equal(e.ma, 'xem_truoc_da_doi');
      const k2 = e.duLieu.xemTruoc.deXuat.find((d) => d.monId === ID.K);
      assert.deepEqual(k2.bac[0].ganNhat, { gia: 10900, giaLon: 109, ngay: '2026-09-28', khongRoTeam: true });
      assert.deepEqual(await demGhi(), truoc, '0 ghi');
      // đơn mới CÙNG mức không đổi dấu (không 409 giả — đối kháng vòng 1 đã thử)
      const xt2 = await xemGiaTuDon(bcQt);
      dongBq = [...dongBq, dong(GCC, '111:vk', 1, 9900, '2026-09-27', { sku: '272' })];
      assert.equal((await xemGiaTuDon(bcQt)).dauXemTruoc, xt2.dauXemTruoc);
    });

    await t.test('X10 · F1 (vòng 2) đơn MỚI của marketer chưa ghép HRM / sale dùng chung mang giá khác ⇒ món KHÔNG được đề xuất giá cũ — lý do khac_gia_khong_ro_team; cùng mức ⇒ vẫn đề xuất', async () => {
      for (const [k, ma, sku] of [['N', '111:vn', '281'], ['S', '111:vs', '282'], ['Q', '111:vq', '283']]) {
        await mon(k, ma, sku);
        GOC[k.toLowerCase()] = await gopMonThanhGoc(pool, T, { maGoc: `g${k.toLowerCase()}`, ten: `Gốc ${k}`, sku, posMa: [ma] });
      }
      dongBq = [...dongBq,
        // N: marketer ĐÃ ghép (team GCC) bán 99 SAR tới 10/09; từ 20/09 đơn của marketer CHƯA ghép HRM đều 109 SAR (repro R2 đối kháng).
        ...chuoi(GCC, '111:vn', 10, 9900, '2026-09-01', { sku: '281' }), ...chuoi(null, '111:vn', 8, 10900, '2026-09-20', { sku: '281' }),
        // S: cùng cảnh, đơn mới do tài khoản sale dùng chung (TEAM_HRM slug '*').
        ...chuoi(GCC, '111:vs', 10, 9900, '2026-09-01', { sku: '282' }), ...chuoi('PIALPHA_SALE_ONLINE', '111:vs', 8, 10900, '2026-09-20', { sku: '282' }),
        // Q: CHO-QUA — đơn không rõ team mới hơn CÙNG mức ⇒ vẫn đề xuất; «giá đơn gần nhất» là đơn không rõ team (nói ra).
        ...chuoi(GCC, '111:vq', 10, 9900, '2026-09-01', { sku: '283' }), ...chuoi(null, '111:vq', 3, 9900, '2026-09-20', { sku: '283' }),
      ];
      const xt = await xemGiaTuDon(bcQt);
      const bo = Object.fromEntries(xt.bo.map((x) => [x.posMa, x]));
      for (const ma of ['111:vn', '111:vs']) {
        assert.ok(!xt.deXuat.some((d) => d.posMa === ma), `${ma}: không được đề xuất 99 SAR «10/10» khi 8 đơn mới hơn đều 109 SAR`);
        assert.equal(bo[ma]?.lyDo, 'khac_gia_khong_ro_team', `${ma}: lý do rõ trên màn`);
        assert.match(bo[ma].chiTiet, /109 SAR 8\/10 · đơn của team 99 SAR \(mới nhất 2026-09-10\)/);
      }
      assert.equal(xt.dem.khac_gia_khong_ro_team, 2);
      const q = xt.deXuat.find((d) => d.posMa === '111:vq');
      assert.ok(q, 'đơn không rõ team cùng mức không chặn oan');
      assert.deepEqual(q.bac[0].ganNhat, { gia: 9900, giaLon: 99, ngay: '2026-09-22', khongRoTeam: true });
      assert.deepEqual([q.bac[0].soDonMuc, q.bac[0].soDonGanDay, q.bac[0].soDonKhongRo], [10, 10, 3], 'tỷ lệ của tập gộp, nói số đơn chưa ghép team');
    });

    await t.test('X11 · F2 (vòng 2) đường lùi «xoá bậc» BỀN: món gia_tay + 0 dòng giá ⇒ không đề xuất lại (nguoi_da_xoa_gia); dấu cũ phát lại ⇒ 409; «áp tất cả» không ghi lại', async () => {
      let xt = await xemGiaTuDon(bcQt);
      const dauCoQ = xt.dauXemTruoc;   // bảng còn Q
      await apGiaTuDon(bcQt, { dauXemTruoc: dauCoQ, monIds: [ID.Q] });
      assert.deepEqual((await bacCua(ID.Q)).map((b) => b.gia), [9900]);
      // Người thấy 99 SAR sai ⇒ lùi đúng đường nhật ký vòng 1 chỉ: xoá bậc ở «Theo thị trường» (cửa lưu giá chỉ-giá, offers = []).
      const v = (await mot('SELECT xmin::text AS v FROM san_pham WHERE id=$1', [ID.Q])).v;
      await saveProduct(pool, bcQt, ID.Q, { offers: [], version: v }, { chiGia: true });
      assert.deepEqual(await bacCua(ID.Q), []);
      assert.equal((await mot('SELECT gia_tay FROM san_pham WHERE id=$1', [ID.Q])).gia_tay, true, 'xoá bậc ⇒ gia_tay = true, 0 dòng');
      xt = await xemGiaTuDon(bcQt);
      assert.ok(!xt.deXuat.some((d) => d.monId === ID.Q), 'món người vừa gỡ giá KHÔNG hiện lại trong đề xuất');
      assert.equal(xt.bo.find((x) => x.monId === ID.Q)?.lyDo, 'nguoi_da_xoa_gia');
      assert.ok(xt.deXuat.some((d) => d.monId === ID.K), 'CHO-QUA: món 0 dòng giá CHƯA ai đặt giá tay (K) vẫn được đề xuất');
      const truoc = await demGhi();
      const e = await loiCua(() => apGiaTuDon(bcQt, { dauXemTruoc: dauCoQ, monIds: [ID.Q] }));
      assert.equal(e.status, 409, 'dấu cũ (bảng còn Q) phát lại sau khi lùi ⇒ 409, không hợp lệ trở lại');
      assert.deepEqual(await demGhi(), truoc, '0 ghi');
      const kq = await apGiaTuDon(bcQt, { dauXemTruoc: xt.dauXemTruoc });
      assert.ok(!kq.ghi.some((m) => m.monId === ID.Q));
      assert.deepEqual(await bacCua(ID.Q), [], 'giá người đã gỡ không quay lại');
    });

    await t.test('X9 · BigQuery chưa nối ⇒ 503 nói rõ (không trả rỗng trông như «không có đề xuất»); BigQuery hỏng ⇒ 502', async () => {
      const e = await loiCua(() => xemTruoc(pool, T, null, {}));
      assert.equal(e.status, 503); assert.equal(e.ma, 'chua_noi_bq');
      const hong = { truyVan: async () => { throw Object.assign(new Error('BigQuery từ chối câu đọc (accessDenied)'), { name: 'LoiBigQuery', ma: 'truy_van', status: 403 }); } };
      const e2 = await loiCua(() => xemTruoc(pool, T, hong, {}));
      assert.equal(e2.status, 502); assert.equal(e2.ma, 'bq_hong');
      assert.match(e2.message, /accessDenied/);
    });
  } finally {
    await sb.don();
  }
});
