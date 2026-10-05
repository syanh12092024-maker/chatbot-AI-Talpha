// GSP3b vòng 2 · F2 — KHÔNG KHOÁ CHẾT giữa lượt lưu ĐẦY ĐỦ một bản sao và lượt gắn page (`ganPageVaoGoc`) / «Không chuyển» (`boQuaPage`)
// chạy chồng trên CÙNG page. HTTP THẬT (express + router thật) trên Postgres hộp cát (đối kháng GSP3b R4 · R4b; tổng nâng CHẶN 05/10).
// Vòng chờ cũ: `saveProduct` khoá `san_pham` (FOR UPDATE + UPDATE) rồi cửa ra mới xin khoá dòng page; lượt gắn / «Không chuyển» khoá page
// FOR UPDATE rồi UPDATE `san_pham` của page ⇒ 40P01, Postgres giết một bên (phía gắn nhận 500 trên màn Sản phẩm).
// Cách chen: pool của router đi qua một lớp SOI — ngay sau câu `UPDATE san_pham SET ten=` của `saveProduct` (giao dịch lưu đang giữ khoá dòng
// `san_pham`), lớp soi khởi động lượt gắn / «Không chuyển» trên pool THẬT (không qua lớp soi) rồi CHỜ tới khi Postgres báo lượt kia đang
// đợi khoá (`pg_stat_activity.wait_event_type = 'Lock'` — không hẹn giờ; /code-review vòng 2 #4), sau đó giao dịch lưu chạy tiếp tới cửa ra.
// Đúng thứ tự page → `san_pham` ⇒ lượt kia CHỜ giao dịch lưu xong rồi thành; không ai nhận 40P01.
// K4 đo cái chốt «câu đầu phải mở giao dịch» của pool bọc (đóng khi nghi). K5 = kịch bản NGUYÊN VĂN R4/R4b của đối kháng: `saveProduct(pool, …)`
// gọi THẲNG (không qua cửa — thứ tự ngược) ⇒ cửa ra `NOWAIT` từ chối ngay (409 «thử lại»), lượt gắn / «Không chuyển» thành, không 40P01.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { dungSandbox } from '../../../db/sandbox.js';
import { maHoa } from '../../../db/khoa.js';
import { gopMonThanhGoc, ganPageVaoGoc } from '../../../src/products/san-pham-goc.js';
import { boQuaPage } from '../../../src/products/chuyen-ban-sao.js';
import { taoRouterAnhSanPham } from '../../src/ui/van-hanh/router-anh.js';
import { taoRouterVanHanh, poolChotDauGiaoDich, taoBuocDayBot } from '../../src/ui/van-hanh/router.js';
import { saveProduct } from '../../../src/admin-v3/operations.js';

const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

test('GSP3b vòng 2 · không khoá chết giữa lưu bản sao và gắn page / «Không chuyển» — HTTP thật, Postgres thật', async (t) => {
  process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
  const sb = await dungSandbox('gsp3b_khoa');
  const pool = sb.pool;
  const q = (sql, a = []) => pool.query(sql, a);
  const mot = async (sql, a = []) => (await q(sql, a)).rows[0];
  let sv = null;
  try {
    const T = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
    await q('INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,$2,$3,$4,true)', [T, 'Saudi', '111', maHoa('k')]);
    await q("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,nguon) VALUES($1,'111:x','101 - Gold Ring X','101',5,'pos')", [T]);
    const G = await gopMonThanhGoc(pool, T, { maGoc: 'gold', ten: 'Gold Ring', sku: '101', posMa: ['111:x'] });
    const xId = String((await mot("SELECT id FROM san_pham WHERE team_id=$1 AND ma='111:x'", [T])).id);
    await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,19900,'SAR')", [T, xId]);
    const trang = async (fb) => String((await mot(
      "INSERT INTO page(team_id,page_id,ten,pos_shop_id) VALUES($1,$2,$2,'111') RETURNING id", [T, fb])).id);
    const banSao = async (pageId, ma, boQua = false) => {
      const id = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,mo_ta,nguon) VALUES($1,$2,$3,$3,'','kb') RETURNING id",
        [T, pageId, ma])).id);
      await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,5500,'SAR')", [T, id]);
      if (boQua) await q("UPDATE san_pham SET doi_soat='bo_qua', doi_soat_luc=now() WHERE id=$1", [id]);   // «Không chuyển» có sẵn (GSP2)
      return id;
    };

    // Lớp SOI trên pool của router: sau câu UPDATE tên của `saveProduct` chạy `moc` (một lần).
    let moc = null;
    const poolSoi = {
      query: (...a) => pool.query(...a),
      connect: async () => {
        const c = await pool.connect();
        return {
          query: async (...a) => {
            const kq = await c.query(...a);
            if (moc && /^UPDATE san_pham SET ten=/.test(String(a[0]?.text ?? a[0]))) { const h = moc; moc = null; await h(); }
            return kq;
          },
          release: (...a) => c.release(...a),
        };
      },
    };
    const day = []; const dayFn = async (pid, products) => { day.push({ pid, products }); };
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.boiCanh = { teamId: T, nguoiDungId: null, vai: ['quan-tri'] }; next(); });
    app.use(taoRouterAnhSanPham({ pool: poolSoi, env: {}, daySanPhamLenBot: dayFn }));
    app.use(taoRouterVanHanh({ pool: poolSoi, env: {}, daySanPhamLenBot: dayFn }));
    sv = http.createServer(app); await new Promise((r) => sv.listen(0, '127.0.0.1', r));
    const goc = `http://127.0.0.1:${sv.address().port}`;
    const goi = async (duong, body) => {
      const r = await fetch(goc + duong, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-V3-Action': '1' }, body: JSON.stringify(body) });
      return { status: r.status, j: await r.json().catch(() => null) };
    };
    const than = async (id, gia) => ({ version: (await mot('SELECT xmin::text AS v FROM san_pham WHERE id=$1', [id])).v,
      ten: 'Tên mới', mo_ta: '', het_hang: false, offers: [{ so_luong: 1, price: gia, tien_te: 'SAR' }] });
    const bat = (p) => p.then((x) => ({ ok: true, x }), (e) => ({ ok: false, code: e.code, ma: e.ma, status: e.status, msg: e.message }));
    /** Chờ tới khi một phiên KHÁC trong CSDL hộp cát đang đợi khoá (tối đa 5s). Trả true/false — ca tự đọc, không hẹn giờ mù. */
    const choKhoa = async () => {
      for (let i = 0; i < 250; i += 1) {
        const n = (await mot(`SELECT count(*)::int AS n FROM pg_stat_activity
                                WHERE datname = current_database() AND wait_event_type = 'Lock' AND pid <> pg_backend_pid()`)).n;
        if (n > 0) return true;
        await ngu(20);
      }
      return false;
    };

    /** Lưu ĐẦY ĐỦ bản sao `id` qua `duong`, chen `chenLam()` khi giao dịch lưu đang giữ khoá `san_pham`. Trả kết quả hai phía. */
    const chayChong = async (duong, id, gia, chenLam) => {
      let song = null; let daCho = false;
      moc = async () => { song = bat(chenLam()); daCho = await choKhoa(); };
      const d0 = day.length;
      const r = await goi(duong, await than(id, gia));
      assert.equal(moc, null, 'lượt chen không chạy — ca không đo được gì');
      const ben = await song;
      assert.equal(daCho, true, 'lượt chạy chồng không đợi khoá trong 5s — ca không đo được vòng chờ');
      return { r, ben, day: day.slice(d0) };
    };
    const khongKhoaChet = (ten, { r, ben }) => {
      assert.notEqual(ben.code, '40P01', `${ten}: lượt chạy chồng chết vì khoá chết (40P01) — ${ben.msg}`);
      assert.ok(!/deadlock/i.test(JSON.stringify(r.j)), `${ten}: lượt lưu chết vì khoá chết — ${JSON.stringify(r.j)}`);
      assert.equal(r.status, 200, `${ten}: lượt lưu ${JSON.stringify(r.j)}`);   // lưu giữ khoá page trước ⇒ lưu thành, lượt kia chờ
      assert.equal(ben.ok, true, `${ten}: lượt chạy chồng ${ben.code || ''} ${ben.msg || ''}`);
    };

    await t.test('K1 · (R4) lưu bản sao qua cửa trang page ∥ gắn page (dọn dấu «Không chuyển») ⇒ không 40P01: lưu thành, gắn chờ rồi thành', async () => {
      const D = await trang('fbD'); const bsD = await banSao(D, 'kb:fbD:SP01', true);
      const kq = await chayChong(`/api/anh-san-pham/san-pham/${bsD}`, bsD, 70, () => ganPageVaoGoc(pool, T, G.id, { pageId: D, shopId: '111' }));
      khongKhoaChet('K1', kq);
      assert.deepEqual(kq.day.map((x) => x.pid), ['fbD'], 'lúc lưu page còn chưa gắn ⇒ đẩy bản sao của fbD');
      const sau = await mot('SELECT p.san_pham_goc_ma, s.doi_soat, (SELECT gia FROM goi_gia WHERE san_pham_id=s.id) AS gia FROM page p JOIN san_pham s ON s.page_id=p.id WHERE s.id=$1', [bsD]);
      assert.deepEqual([sau.san_pham_goc_ma, sau.doi_soat, Number(sau.gia)], ['gold', null, 7000], 'gắn chạy SAU lưu: page gắn, dấu bo_qua dọn, giá lưu còn');
    });

    await t.test('K2 · (R4b) lưu bản sao qua cửa trang page ∥ «Không chuyển» (boQuaPage) ⇒ không 40P01: lưu thành, «Không chuyển» chờ rồi thành', async () => {
      const F = await trang('fbF'); const bsF = await banSao(F, 'kb:fbF:SP01');
      const kq = await chayChong(`/api/anh-san-pham/san-pham/${bsF}`, bsF, 60, () => boQuaPage(pool, T, F, 'page chết'));
      khongKhoaChet('K2', kq);
      assert.equal(kq.ben.x.soDoi, 1);
      assert.equal((await mot('SELECT doi_soat FROM san_pham WHERE id=$1', [bsF])).doi_soat, 'bo_qua');
    });

    await t.test('K3 · lưu bản sao qua cửa Vận hành ∥ gắn page ⇒ không 40P01 (cửa thứ hai đi cùng thứ tự khoá)', async () => {
      const E = await trang('fbE'); const bsE = await banSao(E, 'kb:fbE:SP01', true);
      const kq = await chayChong(`/api/van-hanh/products/${bsE}`, bsE, 80, () => ganPageVaoGoc(pool, T, G.id, { pageId: E, shopId: '111' }));
      khongKhoaChet('K3', kq);
      assert.equal((await mot('SELECT san_pham_goc_ma FROM page WHERE id=$1', [E])).san_pham_goc_ma, 'gold');
    });

    await t.test('K4 · pool bọc: câu đầu của kết nối KHÔNG mở giao dịch ⇒ ném 500, chốt không chạy, câu không tới CSDL (đóng khi nghi)', async () => {
      const da = []; let chot = 0;
      const gia = { query: async (x) => { da.push(`pool:${x}`); return { rows: [] }; },
        connect: async () => ({ query: async (x) => { da.push(String(x)); return { rows: [] }; }, release: () => {} }) };
      const c = await poolChotDauGiaoDich(gia, async () => { chot += 1; }).connect();
      const e = await c.query('SELECT 1').then(() => null, (x) => x);
      assert.equal(e?.status, 500, 'câu đầu không mở giao dịch mà vẫn chạy');
      assert.deepEqual([da, chot], [[], 0]);
      for (const mo of ['BEGIN', 'BEGIN ISOLATION LEVEL READ COMMITTED', 'START TRANSACTION']) {
        da.length = 0;
        const c2 = await poolChotDauGiaoDich(gia, async () => { chot += 1; da.push('CHỐT'); }).connect();
        await c2.query(mo); await c2.query('SELECT 2');
        assert.deepEqual(da, [mo, 'CHỐT', 'SELECT 2'], `«${mo}» ⇒ chốt chạy đúng một lần, ngay sau câu mở giao dịch`);
      }
      da.length = 0;
      await poolChotDauGiaoDich(gia, async () => { chot += 1; }).query('SELECT 3');
      assert.deepEqual(da, ['pool:SELECT 3'], 'query của pool (ngoài giao dịch) đi thẳng, không chốt');
    });

    await t.test('K5 · (R4 · R4b NGUYÊN VĂN) saveProduct(pool) gọi THẲNG + cửa ra, lượt gắn / «Không chuyển» chạy chồng ⇒ cửa ra NOWAIT: lưu 409 «thử lại», bên kia thành, không 40P01', async () => {
      for (const [ten, fb, boQua, lam] of [
        ['gắn', 'fbG', true, (P) => ganPageVaoGoc(pool, T, G.id, { pageId: P, shopId: '111' })],
        ['«Không chuyển»', 'fbH', false, (P) => boQuaPage(pool, T, P, 'page chết')],
      ]) {
        const P = await trang(fb); const bs = await banSao(P, `kb:${fb}:SP01`, boQua);
        let song = null; let daCho = false; const d0 = day.length;
        const luu = await bat(saveProduct(pool, { teamId: T, nguoiDungId: null, vai: ['quan-tri'] }, bs, await than(bs, 90), {
          sauKhiLuu: async (c, bc, id) => {
            song = bat(lam(P)); daCho = await choKhoa();
            return taoBuocDayBot({ day: dayFn, env: {} })(c, bc, id);
          },
        }));
        const ben = await song;
        assert.equal(daCho, true, `${ten}: lượt chạy chồng không đợi khoá — ca không đo được vòng chờ`);
        assert.notEqual(luu.code, '40P01', `${ten}: lượt lưu chết vì khoá chết`);
        assert.notEqual(ben.code, '40P01', `${ten}: lượt chạy chồng chết vì khoá chết — ${ben.msg}`);
        assert.deepEqual([luu.ok, luu.status], [false, 409], `${ten}: ${JSON.stringify(luu)}`);
        assert.match(luu.msg, /đang được đổi ở màn khác .*chưa lưu gì/, ten);
        assert.equal(ben.ok, true, `${ten}: ${ben.code || ''} ${ben.msg || ''}`);
        assert.equal(day.length, d0, `${ten}: lượt lưu bị từ chối mà vẫn đẩy`);
        assert.equal(Number((await mot('SELECT gia FROM goi_gia WHERE san_pham_id=$1', [bs])).gia), 5500, `${ten}: giá đổi dù lượt lưu lùi`);
      }
    });
  } finally {
    sv?.close();
    await sb.don();
  }
});
