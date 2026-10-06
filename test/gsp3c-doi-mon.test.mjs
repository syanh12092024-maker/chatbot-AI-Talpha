// GSP3c · ĐÓNG HAI LỖ LÀM BỘ ĐẾM «PAGE CHƯA CHUYỂN XONG» VỀ 0 SỚM — trên Postgres THẬT (hộp cát riêng `aicloser_v3_test_gsp3c_p<pid>`).
// Đo: (1) đổi món của gốc × shop qua BA cửa (gỡ · gắn ở màn Sản phẩm đi qua `kho-goc.js` thật có vai + nhật ký; «Kéo danh mục» chạy
// `docDanhMuc` THẬT với POS giả qua `nap`) ⇒ dấu `chep`/`giu_gia_mon` của gốc × shop về NULL và `dsViecChuyen` (bộ đếm cổng GSP4) thấy
// page về `cho_doi_soat`; khác shop / team khác / gắn lại món vốn thuộc gốc / lượt kéo chỉ đổi tồn kho ⇒ dấu GIỮ; `bo_qua` không đụng.
// (2) `dongBoTuPos` chỉ ghi + đẩy cho bản sao của page CHƯA gắn (chuỗi rỗng = chưa gắn, như `catalog.js`), có cửa ra cho page được gắn
// giữa chừng. (3) `demDauCu` (quét lùi, chỉ đọc). (4) CSDL chưa áp 032 ⇒ mọi đường vẫn thành, không ném.
// Hàm mới gọi qua NAMESPACE (`spGoc.demDauCu?.(…)`) để trên base thiếu hàm thì ĐÚNG ca đó đỏ, không sập cả tệp lúc nạp.
// Nhánh KHÔNG chạm ở tệp này: nối dây `v3/chay-that.js` (gan/go/keoDanhMucPos — cần cả hệ) · màn san-pham.html (không đổi) ·
// đường `bo_qua` có goc/shop (không đường thật nào ghi — `boQuaPage` đặt NULL) nên vế `doi_soat IN (…)` của câu bỏ dấu là phòng thủ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { maHoa } from '../db/khoa.js';
import { ctxHeThong } from '../src/db/index.js';
import { dsViecChuyen, boQuaPage } from '../src/products/chuyen-ban-sao.js';
import * as spGoc from '../src/products/san-pham-goc.js';
import { dongBoTuPos } from '../src/products/noi-pos.js';
import { docDanhMuc } from '../src/pos/doc-danh-muc.js';
import { datKhoGoc, datPheuNhatKyGoc, ganMonPos, goMonPos } from '../v3/src/ui/san-pham/kho-goc.js';
import { HANH_DONG } from '../v3/src/audit/hanh-dong.js';

test('GSP3c · đổi món ⇒ bỏ dấu đối soát · kéo danh mục không đụng page đã gắn — Postgres thật', async (t) => {
  process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
  const sb = await dungSandbox('gsp3c');
  const pool = sb.pool;
  const q = (sql, a = []) => pool.query(sql, a);
  const mot = async (sql, a = []) => (await q(sql, a)).rows[0];
  try {
    console.log(`GSP3c-MOI-TRUONG TimeZone=${(await mot('SHOW TimeZone')).TimeZone} · TZ-node=${Intl.DateTimeFormat().resolvedOptions().timeZone} · CSDL=${sb.ten}`);
    const T = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
    const KHAC = String((await mot("SELECT id FROM team WHERE slug='auus'")).id);
    const u = String((await mot("INSERT INTO nguoi_dung(email,ten) VALUES('qt@gsp3c.test','QT') RETURNING id")).id);
    const bcQt = { teamId: T, nguoiDungId: u, vai: ['quan-tri'] };
    await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,true),($1,$5,$6,$4,true)',
      [T, 'Saudi', '111', maHoa('k'), 'UAE', '222']);
    const mon = async (team, ma, ten, sku, gia = null, te = 'SAR') => {
      const id = String((await mot("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,$2,$3,$4,5,'pos') RETURNING id",
        [team, ma, ten, sku])).id);
      if (gia != null) await q('INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,$3,$4)', [team, id, gia, te]);
      return id;
    };
    const trang = async (team, fb, ten, shop = '111') => String((await mot(
      'INSERT INTO page(team_id,page_id,ten,pos_shop_id) VALUES($1,$2,$3,$4) RETURNING id', [team, fb, ten, shop])).id);
    const banSao = async (team, pageId, ma, { posMa = null, hetHang = false, gia = 9900 } = {}) => {
      const id = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon,pos_ma,het_hang) VALUES($1,$2,$3,$3,'kb',$4,$5) RETURNING id",
        [team, pageId, ma, posMa, hetHang])).id);
      await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,$3,'SAR')", [team, id, gia]);
      return id;
    };
    // Dấu đúng như câu đánh dấu của `doiSoatDonVi` (bốn cột, đồng hồ CSDL).
    const danhDau = (spId, loai, goc, shop) => q(
      'UPDATE san_pham SET doi_soat=$2, doi_soat_luc=now(), doi_soat_goc=$3, doi_soat_shop=$4 WHERE id=$1', [spId, loai, goc, shop]);
    const dau = async (spId) => mot('SELECT doi_soat, doi_soat_luc IS NULL AS luc_null, doi_soat_goc, doi_soat_shop FROM san_pham WHERE id=$1', [spId]);
    const NULL4 = { doi_soat: null, luc_null: true, doi_soat_goc: null, doi_soat_shop: null };
    const viec = async () => dsViecChuyen(pool, T);
    // page có bản sao + đang gắn mà không có trong `viec` = «xong» (dsViecChuyen bỏ page xong khỏi danh sách)
    const ttCua = (d, pageId) => d.viec.find((v) => v.pageId === pageId)?.trangThai ?? 'xong';
    const hetHang = async (spId) => (await mot('SELECT het_hang FROM san_pham WHERE id=$1', [spId])).het_hang;
    // TIỀN ĐỀ của từng ca đặt bằng SQL (không qua cửa đang đo) — mỗi ca tự dựng thế giới của nó, ca trước đỏ không kéo ca sau đỏ theo
    // (đảo-vá đọc ĐÚNG tập ca đỏ). `ma_goc` của món POS = thứ ba cửa gắn/gỡ/kéo ghi.
    const datMon = (ma, goc) => q('UPDATE san_pham SET ma_goc=$3 WHERE team_id=$1 AND ma=$2', [T, ma, goc]);

    // ── Dựng: gốc G «gold» (SKU 101) có 111:x (CÓ giá) + 222:u. Page E, E2 gắn G × 111 (dấu chep / giu_gia_mon); F gắn G × 222 (chep). ──
    await mon(T, '111:x', '101 - Gold Ring X', '101', 19900);
    await mon(T, '222:u', '101 - Gold Ring U', '101', 9900, 'AED');
    const G = await spGoc.gopMonThanhGoc(pool, T, { maGoc: 'gold', ten: 'Gold Ring', sku: '101', posMa: ['111:x', '222:u'] });
    await mon(T, '111:y', 'Gold Ring Y (chưa giá)', '101');
    await mon(T, '111:w', 'Gold Ring W (có giá)', '101', 25900);
    await mon(T, '222:u2', 'Gold Ring U2', '101', 8800, 'AED');
    const E = await trang(T, 'fbE', 'Gold E');
    const E2 = await trang(T, 'fbE2', 'Gold E2');
    const F = await trang(T, 'fbF', 'Gold F UAE', '222');
    for (const [p, s] of [[E, '111'], [E2, '111'], [F, '222']]) await spGoc.ganPageVaoGoc(pool, T, G.id, { pageId: p, shopId: s });
    const bsE = await banSao(T, E, 'kb:fbE:SP01');
    const bsE2 = await banSao(T, E2, 'kb:fbE2:SP01');
    const bsF = await banSao(T, F, 'kb:fbF:SP01');
    const datLaiDau = async () => {   // «fixture mới»: E, E2, F về xong
      await danhDau(bsE, 'chep', 'gold', '111');
      await danhDau(bsE2, 'giu_gia_mon', 'gold', '111');
      await danhDau(bsF, 'chep', 'gold', '222');
    };
    await datLaiDau();
    // Page B chưa gắn, «không chuyển» qua cửa thật (`bo_qua`, goc/shop NULL).
    const B = await trang(T, 'fbB', 'Bỏ B');
    const bsB = await banSao(T, B, 'kb:fbB:SP01');
    await boQuaPage(pool, T, B, 'Thôi bán');
    // Team KHÁC cùng mã gốc «gold», cùng shop 111 (shop dùng chung nhiều team được) — dấu của nó không được bị đụng.
    await q("INSERT INTO san_pham_goc(team_id,ma_goc,ten,sku) VALUES($1,'gold','Gold khác team','101')", [KHAC]);
    const EK = await trang(KHAC, 'fbEK', 'Gold team khác');
    await q("UPDATE page SET san_pham_goc_ma='gold' WHERE id=$1", [EK]);
    const bsK = await banSao(KHAC, EK, 'kb:fbEK:SP01');
    await danhDau(bsK, 'chep', 'gold', '111');

    // Màn Sản phẩm: lớp vai + nhật ký `kho-goc.js` THẬT, nối tầng A thật đúng khuôn `v3/chay-that.js` (gan/go).
    const nhatKy = [];
    const noop = async () => ({});
    datKhoGoc({
      ...Object.fromEntries(['ds', 'cho', 'dem', 'tao', 'sua', 'bo', 'chiTiet', 'monChuaGan', 'kienThuc', 'goiYGop', 'gop',
        'luuGia', 'ganPage', 'goPage'].map((k) => [k, noop])),
      gan: (bc, id, posMa) => spGoc.ganMonPosVaoGoc(pool, bc.teamId, id, posMa),
      go: (bc, id, posMa) => spGoc.goMonPosKhoiGoc(pool, bc.teamId, id, posMa),
    });
    datPheuNhatKyGoc(async (_bc, ban) => { nhatKy.push(ban); });
    t.after(() => { datKhoGoc(null); datPheuNhatKyGoc(null); });
    // POS giả cho «Kéo danh mục» (khuôn VE8a G4).
    const keo = (bienThe) => docDanhMuc(pool, ctxHeThong(), { shop: 'Saudi', teamId: T }, {
      nap: async (url) => ({ ok: true, status: 200, text: async () => JSON.stringify(
        url.includes('/products/variations') ? { data: bienThe, total_entries: bienThe.length, total_pages: 1 } : { data: [], total_entries: 0, total_pages: 1 }) }),
    });
    const bt = (id, ten, sku, ton = 5) => ({ id, product: { name: ten, display_id: sku }, fields: [], remain_quantity: ton, retail_price: 0, is_removed: false });

    await t.test('D0 · dựng: E · E2 (gốc × 111) và F (gốc × 222) «xong» nhờ dấu; B «bo_qua» — bộ đếm GSP4 không tính họ', async () => {
      const d = await viec();
      assert.deepEqual([ttCua(d, E), ttCua(d, E2), ttCua(d, F), ttCua(d, B)], ['xong', 'xong', 'xong', 'bo_qua']);
    });

    await t.test('P1 · gỡ 111:x khỏi G (cửa thật kho-goc) ⇒ dấu E·E2 về NULL (4 cột), hai page về cho_doi_soat, chuaXong +2; nhật ký nói «2 bản sao»; gắn 111:y ⇒ vẫn cho_doi_soat', async () => {
      await datMon('111:x', 'gold'); await datMon('111:y', null);
      const truoc = (await viec()).dem.chuaXong;
      nhatKy.length = 0;
      const kq = await goMonPos(bcQt, G.id, '111:x');
      assert.deepEqual(await dau(bsE), NULL4);
      assert.deepEqual(await dau(bsE2), NULL4, 'giu_gia_mon cũng hết hiệu lực');
      assert.equal(kq.boDauDoiSoat, 2, 'trả số bản sao bị bỏ dấu');
      const d = await viec();
      assert.deepEqual([ttCua(d, E), ttCua(d, E2)], ['cho_doi_soat', 'cho_doi_soat']);
      assert.equal(d.dem.chuaXong, truoc + 2, 'bộ đếm tăng đúng số page');
      assert.equal(nhatKy.length, 1);
      assert.equal(nhatKy[0].hanhDong, HANH_DONG.GO_MON_POS_GOC);
      assert.equal(nhatKy[0].sau?.boDauDoiSoat, 2);
      assert.match(nhatKy[0].ghiChu, /gỡ món POS 111:x .*bỏ dấu đối soát 2 bản sao .*chờ đối soát/);
      // gắn món y (chưa giá) vào lại G × 111 ⇒ E vẫn chờ đối soát (không có dấu nào «sống lại»)
      nhatKy.length = 0;
      const g = await ganMonPos(bcQt, G.id, '111:y');
      assert.equal(g.boDauDoiSoat, 0);
      assert.doesNotMatch(nhatKy[0].ghiChu, /bỏ dấu/, 'không bỏ dấu nào thì câu nhật ký không khai');
      assert.equal(ttCua(await viec(), E), 'cho_doi_soat');
    });

    await t.test('P2 · (fixture mới: E·E2 xong) thêm món ĐÃ CÓ GIÁ 111:w vào G (cửa thật) ⇒ E·E2 cho_doi_soat; nhật ký «2 bản sao»', async () => {
      await datMon('111:w', null);
      await datLaiDau();
      assert.equal(ttCua(await viec(), E), 'xong');
      nhatKy.length = 0;
      const kq = await ganMonPos(bcQt, G.id, '111:w');
      assert.deepEqual(await dau(bsE), NULL4);
      assert.deepEqual(await dau(bsE2), NULL4);
      assert.equal(kq.daCo, false);
      assert.equal(kq.boDauDoiSoat, 2);
      const d = await viec();
      assert.deepEqual([ttCua(d, E), ttCua(d, E2)], ['cho_doi_soat', 'cho_doi_soat']);
      assert.equal(nhatKy[0].hanhDong, HANH_DONG.GAN_MON_POS_GOC);
      assert.equal(nhatKy[0].sau?.boDauDoiSoat, 2);
      assert.match(nhatKy[0].ghiChu, /gắn món POS 111:w .*bỏ dấu đối soát 2 bản sao/);
    });

    await t.test('P2b · gắn lại món VỐN thuộc G ⇒ dấu giữ; gỡ ở team T ⇒ dấu cùng mã «gold» × 111 của team KHÁC giữ', async () => {
      await datMon('111:w', 'gold');
      await datLaiDau();
      await danhDau(bsK, 'chep', 'gold', '111');
      const lai = await spGoc.ganMonPosVaoGoc(pool, T, G.id, '111:w');
      assert.equal((await dau(bsE)).doi_soat, 'chep', 'gắn lại món đã thuộc gốc không đổi tập món — không bỏ dấu');
      assert.equal(ttCua(await viec(), E), 'xong');
      assert.equal(lai.daCo, true);
      assert.equal(lai.boDauDoiSoat, 0);
      const go = await spGoc.goMonPosKhoiGoc(pool, T, G.id, '111:w');
      assert.deepEqual(await dau(bsE), NULL4);
      assert.deepEqual(await dau(bsK), { doi_soat: 'chep', luc_null: false, doi_soat_goc: 'gold', doi_soat_shop: '111' }, 'dấu team khác không bị đụng');
      assert.equal(go.boDauDoiSoat, 2, 'chỉ hai bản sao của team T');
    });

    await t.test('P3 · đổi món ở shop 222 của G ⇒ dấu F (222) về NULL, dấu E·E2 (111) GIỮ — E vẫn xong', async () => {
      await datMon('222:u2', null);
      await datLaiDau();
      const kq = await spGoc.ganMonPosVaoGoc(pool, T, G.id, '222:u2');
      assert.deepEqual(await dau(bsF), NULL4);
      assert.equal((await dau(bsE)).doi_soat, 'chep');
      assert.equal((await dau(bsE2)).doi_soat, 'giu_gia_mon');
      assert.equal(kq.boDauDoiSoat, 1);
      await danhDau(bsF, 'chep', 'gold', '222');
      const go = await spGoc.goMonPosKhoiGoc(pool, T, G.id, '222:u2');
      assert.deepEqual(await dau(bsF), NULL4);
      assert.equal(go.boDauDoiSoat, 1);
      const d = await viec();
      assert.deepEqual([ttCua(d, E), ttCua(d, E2), ttCua(d, F)], ['xong', 'xong', 'cho_doi_soat']);
    });

    await t.test('P4 · dấu bo_qua của page chưa gắn KHÔNG bị gắn/gỡ món đụng tới — B vẫn bo_qua', async () => {
      await datMon('111:w', 'gold');
      await spGoc.goMonPosKhoiGoc(pool, T, G.id, '111:w');
      await spGoc.ganMonPosVaoGoc(pool, T, G.id, '111:w');
      assert.equal((await dau(bsB)).doi_soat, 'bo_qua');
      assert.equal(ttCua(await viec(), B), 'bo_qua');
    });

    await t.test('P1b · «Kéo danh mục» (POS giả) đưa 111:x (ma_goc NULL, SKU = SKU gốc) về lại G ⇒ dấu E NULL; món MỚI mang SKU gốc ⇒ dấu NULL; lượt chỉ đổi tồn kho ⇒ dấu GIỮ', async () => {
      await datMon('111:x', null);   // x bị gỡ khỏi gốc (P1) mà SKU vẫn trùng SKU gốc — đúng kịch bản K2 của review (a) C1
      await datLaiDau();
      await keo([bt('x', '101 - Gold Ring X', '101')]);
      assert.equal((await mot("SELECT ma_goc FROM san_pham WHERE team_id=$1 AND ma='111:x'", [T])).ma_goc, 'gold', 'lượt kéo bù ma_goc theo SKU');
      assert.deepEqual(await dau(bsE), NULL4);
      assert.deepEqual(await dau(bsE2), NULL4);
      assert.equal((await dau(bsF)).doi_soat, 'chep', 'shop 222 không đổi món');
      assert.equal(ttCua(await viec(), E), 'cho_doi_soat');
      // món MỚI cùng SKU kéo về ⇒ vào G × 111 ngay lúc tạo
      await datLaiDau();
      await keo([bt('x', '101 - Gold Ring X', '101'), bt('v2', 'Gold Ring biến thể mới', '101')]);
      assert.equal((await mot("SELECT ma_goc FROM san_pham WHERE team_id=$1 AND ma='111:v2'", [T])).ma_goc, 'gold');
      assert.deepEqual(await dau(bsE), NULL4);
      // CHO-QUA: lượt kéo chỉ đổi tồn kho (không món nào đổi gốc) ⇒ dấu giữ, E xong
      await datLaiDau();
      await keo([bt('x', '101 - Gold Ring X', '101', 2), bt('v2', 'Gold Ring biến thể mới', '101', 1)]);
      assert.equal((await mot("SELECT ton_kho FROM san_pham WHERE team_id=$1 AND ma='111:x'", [T])).ton_kho, 2, 'tiền đề: lượt kéo có ghi');
      assert.equal((await dau(bsE)).doi_soat, 'chep');
      assert.equal(ttCua(await viec(), E), 'xong');
    });

    await t.test('P1c · «Kéo danh mục» chạy SONG SONG với gắn món vào cùng gốc × shop ⇒ không khoá chết (40P01), cả hai thành, dấu về NULL', async () => {
      // Xen kẽ TẤT ĐỊNH: lượt kéo xử lý trang 1 (111:a1 — bù ma_goc về G) rồi DỪNG ở lời gọi trang 2; lượt gắn 111:c vào G chạy trong khe
      // đó; xong mới thả trang 2 (111:c đổi tồn kho ⇒ lượt kéo phải ghi dòng c). Bỏ dấu GIỮA lượt (khoá bản sao trước dòng c) ⇒ hai giao
      // dịch chờ nhau ⇒ Postgres huỷ một bên — đúng /code-review GSP3c #2.
      await mon(T, '111:a1', 'Gold Ring A1', '101');
      await mon(T, '111:c', 'Món c', '555');
      await datLaiDau();
      let tha; const cho = new Promise((r) => { tha = r; });
      let toiTrang2; const daToiTrang2 = new Promise((r) => { toiTrang2 = r; });
      const keoDung = docDanhMuc(pool, ctxHeThong(), { shop: 'Saudi', teamId: T, coTrang: 1 }, {
        nap: async (url) => {
          const trangSo = Number(new URL(url).searchParams.get('page_number'));
          const data = trangSo === 1 ? [bt('a1', 'Gold Ring A1', '101')] : trangSo === 2 ? [bt('c', 'Món c', '555', 9)] : [];
          if (trangSo === 2) { toiTrang2(); await cho; }
          return { ok: true, status: 200, text: async () => JSON.stringify({ data, total_entries: 2, total_pages: 2 }) };
        },
      });
      await daToiTrang2;
      const gan = spGoc.ganMonPosVaoGoc(pool, T, G.id, '111:c');
      await Promise.race([gan.catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);
      tha();
      const [k, g] = await Promise.allSettled([keoDung, gan]);
      assert.deepEqual([k.status, g.status], ['fulfilled', 'fulfilled'],
        `lượt kéo: ${k.reason?.code || k.reason?.message || 'thành'} · lượt gắn: ${g.reason?.code || g.reason?.message || 'thành'}`);
      assert.deepEqual(await dau(bsE), NULL4);
      const ma = async (m) => (await mot('SELECT ma_goc FROM san_pham WHERE team_id=$1 AND ma=$2', [T, m])).ma_goc;
      assert.deepEqual([await ma('111:a1'), await ma('111:c')], ['gold', 'gold']);
    });

    // ── dongBoTuPos: Z chưa gắn · Y ĐÃ gắn G × 111 · N không page — cùng nối món 111:x; x đổi hết hàng. ──
    const Z = await trang(T, 'fbZ', 'Zeta chưa gắn');
    const bsZ = await banSao(T, Z, 'kb:fbZ:SP01', { posMa: '111:x' });
    const Y = await trang(T, 'fbY', 'Gold Y đã gắn');
    await spGoc.ganPageVaoGoc(pool, T, G.id, { pageId: Y, shopId: '111' });
    const bsY = await banSao(T, Y, 'kb:fbY:SP01', { posMa: '111:x' });
    const bsN = String((await mot("INSERT INTO san_pham(team_id,ma,ten,nguon,pos_ma,het_hang) VALUES($1,'kb:khong-page','N','kb','111:x',false) RETURNING id", [T])).id);
    const dayGoi = [];
    const day = async (pid, products) => { dayGoi.push({ pid, n: products.length }); };

    await t.test('P5 · dongBoTuPos sau khi 111:x hết hàng: bản sao Z đổi + đẩy Z (đường cũ) · dòng không page đổi, không đẩy · bản sao Y (đã gắn) KHÔNG đổi, KHÔNG đẩy', async () => {
      await q("UPDATE san_pham SET het_hang=true, ton_kho=0 WHERE team_id=$1 AND ma='111:x'", [T]);
      dayGoi.length = 0;
      const kq = await dongBoTuPos(pool, T, day);
      assert.equal(await hetHang(bsZ), true);
      assert.equal(await hetHang(bsN), true, 'dòng không page giữ như cũ: đổi het_hang');
      assert.equal(await hetHang(bsY), false, 'bản sao của page đã gắn là lưu trữ — không ghi');
      assert.deepEqual(dayGoi.map((x) => x.pid), ['fbZ'], 'chỉ đẩy page chưa gắn');
      assert.deepEqual({ doi: kq.doi, page: kq.page, hong: kq.hong, pageDaGanBoQua: kq.pageDaGanBoQua }, { doi: 2, page: 1, hong: [], pageDaGanBoQua: 0 },
        'page đã gắn bị lọc ngay ở câu chọn (không tới cửa ra)');
    });

    await t.test('P5b · page có san_pham_goc_ma = \'\' (chuỗi rỗng) ⇒ CHƯA gắn như catalog.js: bản sao đổi + đẩy (lược đồ thật cấm \'\' — gỡ FK 015 trong hộp cát để dựng)', async () => {
      const R = await trang(T, 'fbR', 'Rỗng R');
      const bsR = await banSao(T, R, 'kb:fbR:SP01', { posMa: '111:x' });
      await q('ALTER TABLE page DROP CONSTRAINT page_san_pham_goc_co_that');
      try {
        await q("UPDATE page SET san_pham_goc_ma='' WHERE id=$1", [R]);
        dayGoi.length = 0;
        const kq = await dongBoTuPos(pool, T, day);
        assert.equal(await hetHang(bsR), true);
        assert.deepEqual(dayGoi.map((x) => x.pid), ['fbR']);
        assert.equal(kq.pageDaGanBoQua, 0, 'chuỗi rỗng không bị cửa ra coi là đã gắn');
      } finally {   // dọn cảnh của ca này (kể cả khi đỏ) — R rời đường đồng bộ để ca sau không thừa hưởng bản sao lệch của nó
        await q('UPDATE san_pham SET pos_ma=NULL WHERE id=$1', [bsR]);
        await q('UPDATE page SET san_pham_goc_ma=NULL WHERE id=$1', [R]);
        await q(`ALTER TABLE page ADD CONSTRAINT page_san_pham_goc_co_that FOREIGN KEY (team_id, san_pham_goc_ma)
                 REFERENCES san_pham_goc (team_id, ma_goc) ON UPDATE CASCADE ON DELETE SET NULL`);
      }
    });

    await t.test('P5c · cửa ra: page được GẮN giữa câu chọn và giao dịch của nó ⇒ không ghi, không đẩy, nói ra pageDaGanBoQua=1', async () => {
      await mon(T, '111:r', 'Món r', '999');
      await q("UPDATE san_pham SET het_hang=true WHERE team_id=$1 AND ma='111:r'", [T]);
      const Z2 = await trang(T, 'fbZ2', 'Zeta 2');
      const bsZ2 = await banSao(T, Z2, 'kb:fbZ2:SP01', { posMa: '111:r' });
      let daGan = false;
      const poolDua = {   // lượt gắn page chen vào ĐÚNG khe giữa câu chọn và giao dịch đầu tiên
        query: (...a) => pool.query(...a),
        connect: async () => {
          if (!daGan) { daGan = true; await q("UPDATE page SET san_pham_goc_ma='gold', pos_shop_id='111' WHERE id=$1", [Z2]); }
          return pool.connect();
        },
      };
      dayGoi.length = 0;
      const kq = await dongBoTuPos(poolDua, T, day);
      assert.equal(daGan, true, 'tiền đề: có một giao dịch được mở');
      assert.equal(await hetHang(bsZ2), false);
      assert.deepEqual(dayGoi, []);
      assert.deepEqual({ doi: kq.doi, page: kq.page, pageDaGanBoQua: kq.pageDaGanBoQua }, { doi: 0, page: 0, pageDaGanBoQua: 1 });
    });

    await t.test('P5d · demDauCu (CHỈ ĐỌC, toàn hệ): dấu trước khi món của gốc × shop đổi ⇒ đếm; dấu sau ⇒ 0; bo_qua / team khác không đếm; không ghi gì', async () => {
      assert.equal(typeof spGoc.demDauCu, 'function', 'thiếu demDauCu');
      await q("UPDATE san_pham SET doi_soat=NULL, doi_soat_luc=NULL, doi_soat_goc=NULL, doi_soat_shop=NULL WHERE doi_soat IN ('chep','giu_gia_mon')");
      // Ép đồng hồ CSDL hai đầu: dấu ở mốc t0, món của gold × 111 sửa TRƯỚC t0 ⇒ 0
      await q("UPDATE san_pham SET doi_soat='chep', doi_soat_luc=now() - interval '2 hours', doi_soat_goc='gold', doi_soat_shop='111' WHERE id=ANY($1::bigint[])", [[bsE, bsK]]);
      await q("UPDATE san_pham SET doi_soat='giu_gia_mon', doi_soat_luc=now() - interval '2 hours', doi_soat_goc='gold', doi_soat_shop='111' WHERE id=$1", [bsE2]);
      await q("UPDATE san_pham SET sua_luc=now() - interval '3 hours' WHERE nguon='pos'");
      const bam = async () => (await mot("SELECT md5(string_agg(to_jsonb(s)::text, '|' ORDER BY id)) AS h FROM san_pham s")).h;
      const dem = async () => {   // mỗi lượt đếm: băm san_pham trước = sau (hàm CHỈ ĐỌC)
        const h = await bam();
        const kq = await spGoc.demDauCu(pool);
        assert.equal(await bam(), h, 'demDauCu không ghi một byte nào vào san_pham');
        return kq;
      };
      const sau = await dem();
      assert.deepEqual({ co032: sau.co032, so: sau.so }, { co032: true, so: 0 }, 'món sửa trước dấu ⇒ không cũ');
      // món 111:x của gold × 111 sửa SAU dấu ⇒ hai bản sao của T (chep + giu_gia_mon) cũ; bản sao team KHÁC (không có món gold) không
      await q("UPDATE san_pham SET sua_luc=now() - interval '1 hour' WHERE team_id=$1 AND ma='111:x'", [T]);
      const cu = await dem();
      assert.equal(cu.so, 2);
      assert.deepEqual(cu.ds.map((d) => [d.banSaoId, d.doiSoat, d.maGoc, d.shopId, d.monDoi]).sort(),
        [[bsE, 'chep', 'gold', '111', ['111:x']], [bsE2, 'giu_gia_mon', 'gold', '111', ['111:x']]].sort());
      assert.ok(Date.parse(cu.ds[0].monDoiLuc) > Date.parse(cu.ds[0].doiSoatLuc), 'mốc món đổi sau mốc dấu');
      // món ở shop KHÁC (222) đổi sau dấu ⇒ không làm dấu 111 cũ thêm; bo_qua / team khác không bao giờ đếm
      await q("UPDATE san_pham SET sua_luc=now() WHERE team_id=$1 AND ma='222:u'", [T]);
      const lai = await dem();
      assert.equal(lai.so, 2);
      assert.ok(!lai.ds.some((d) => d.banSaoId === bsB || d.banSaoId === bsK));
    });

    await t.test('P6 · CSDL chưa áp 032 ⇒ gắn/gỡ món + kéo danh mục vẫn thành như cũ (boDauDoiSoat 0), demDauCu nói co032:false — không ném', async () => {
      await datMon('111:x', 'gold'); await datMon('111:y', 'gold');
      await q('ALTER TABLE san_pham DROP COLUMN doi_soat, DROP COLUMN doi_soat_luc, DROP COLUMN doi_soat_goc, DROP COLUMN doi_soat_shop');
      const go = await spGoc.goMonPosKhoiGoc(pool, T, G.id, '111:x');
      assert.deepEqual([go.maGoc, go.boDauDoiSoat], ['gold', 0]);
      await keo([bt('x', '101 - Gold Ring X', '101')]);   // x (NULL) được bù về G ⇒ nhánh bỏ dấu chạy, lưới 032 cho qua
      assert.equal((await mot("SELECT ma_goc FROM san_pham WHERE team_id=$1 AND ma='111:x'", [T])).ma_goc, 'gold');
      await spGoc.goMonPosKhoiGoc(pool, T, G.id, '111:y');
      const gan = await spGoc.ganMonPosVaoGoc(pool, T, G.id, '111:y');
      assert.deepEqual([gan.daCo, gan.boDauDoiSoat], [false, 0]);
      assert.deepEqual(await spGoc.demDauCu(pool), { co032: false, so: 0, ds: [] });
      assert.equal(typeof (await dongBoTuPos(pool, T, day)).doi, 'number');
    });
  } finally {
    await sb.don();
  }
});
