// GSP3b · MỌI CỬA LƯU sản phẩm/ảnh mở từ trang page TỪ CHỐI bản sao của page ĐÃ GẮN — HTTP THẬT (express + router thật) trên Postgres
// hộp cát. Mỗi cửa một ca (đảo-vá «bỏ chốt ở một cửa» phải làm ĐÚNG ca đó đỏ): 409 `ban_sao_da_chuyen` + lối sang, CSDL của bản sao lẫn
// món POS trước = sau (băm trọn hàng san_pham · goi_gia · anh_san_pham), `day` (bản chép sang bot) 0 lời gọi, thư mục ảnh không thêm tệp.
// Chiều CHO-QUA: page chưa gắn lưu được như cũ (`day` gọi đúng page) · món POS mang `page_id` (RF-15) qua cửa trang page vẫn lưu được
// (mục ② 4 KHÔNG áp — có màn gọi, xem nhật ký) · page bị gắn GIỮA lượt chốt trước và lượt ghi ⇒ chốt trong giao dịch ROLLBACK.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { dungSandbox } from '../../../db/sandbox.js';
import { maHoa } from '../../../db/khoa.js';
import { gopMonThanhGoc, ganPageVaoGoc } from '../../../src/products/san-pham-goc.js';
import { taoRouterAnhSanPham } from '../../src/ui/van-hanh/router-anh.js';
import { taoRouterVanHanh, taoBuocDayBot } from '../../src/ui/van-hanh/router.js';

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6360000002000154a24f5d0000000049454e44ae426082', 'hex');

test('GSP3b · cửa lưu sản phẩm/ảnh từ trang page — HTTP thật, Postgres thật', async (t) => {
  process.env.V3_KHOA_MA_HOA ||= 'f'.repeat(64);
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'gsp3b-'));
  const THU_MUC = path.join(TMP, 'uploads');
  const sb = await dungSandbox('gsp3b_cua');
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
    await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan) VALUES($1,$2,1,19900,'SAR','Mua 1'),($1,$2,2,29900,'SAR','Mua 2')", [T, xId]);
    const trang = async (fb, ten, shop = null) => String((await mot(
      'INSERT INTO page(team_id,page_id,ten,pos_shop_id) VALUES($1,$2,$3,$4) RETURNING id', [T, fb, ten, shop])).id);
    const banSao = async (pageId, ma, gia, anh = []) => {
      const id = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,mo_ta,nguon) VALUES($1,$2,$3,$3,'',$4) RETURNING id",
        [T, pageId, ma, 'kb'])).id);
      await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan) VALUES($1,$2,1,$3,'SAR','1 hộp')", [T, id, gia]);
      for (const [i, d] of anh.entries()) await q("INSERT INTO anh_san_pham(team_id,san_pham_id,duong,nhan,thu_tu,nguon) VALUES($1,$2,$3,'Ảnh sản phẩm',$4,'kb')", [T, id, d, i]);
      return id;
    };
    const A = await trang('fbA', 'Gold Saudi A');
    await ganPageVaoGoc(pool, T, G.id, { pageId: A, shopId: '111' });
    const bsA = await banSao(A, 'kb:fbA:SP01', 9900, ['/uploads/a1.png', '/uploads/a2.png']);
    const B = await trang('fbB', 'Aloe B', '111');                                 // CHƯA gắn (có shop — nối món POS được)
    const bsB = await banSao(B, 'kb:fbB:SP01', 8800, ['/uploads/b1.png']);
    const zId = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,mo_ta,nguon) VALUES($1,$2,'111:z','Món z','','pos') RETURNING id", [T, B])).id);
    await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,5000,'SAR')", [T, zId]);
    const D = await trang('fbD', 'Gold Saudi D', '111');                           // chưa gắn — dùng cho ca gắn GIỮA lượt
    const bsD = await banSao(D, 'kb:fbD:SP01', 6600);

    // `day` GIẢ đếm lời gọi theo page; pool của router đi qua Proxy để ca «gắn giữa lượt» chen một lượt gắn ngay trước giao dịch ghi.
    const day = []; const dayFn = async (pid, products) => { day.push({ pid, products }); };
    let chen = null;
    const poolCua = new Proxy(pool, { get(o, k) {
      if (k === 'connect' && chen) { const h = chen; chen = null; return async (...a) => { await h(); return o.connect(...a); }; }
      const v = o[k]; return typeof v === 'function' ? v.bind(o) : v;
    } });
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.boiCanh = { teamId: T, nguoiDungId: null, vai: ['quan-tri'] }; next(); });
    app.use(taoRouterAnhSanPham({ pool: poolCua, env: {}, thuMucAnh: THU_MUC, daySanPhamLenBot: dayFn }));
    app.use(taoRouterVanHanh({ pool: poolCua, env: {}, daySanPhamLenBot: dayFn }));
    sv = http.createServer(app); await new Promise((r) => sv.listen(0, '127.0.0.1', r));
    const goc = `http://127.0.0.1:${sv.address().port}`;
    const goi = async (duong, { method = 'POST', body, type = 'application/json' } = {}) => {
      const r = await fetch(goc + duong, { method, headers: { 'Content-Type': type, 'X-V3-Action': '1' },
        body: body == null ? undefined : (Buffer.isBuffer(body) ? body : JSON.stringify(body)) });
      return { status: r.status, j: await r.json().catch(() => null) };
    };
    const bam = async (ids) => (await mot(
      `SELECT md5(string_agg(x, '|' ORDER BY x)) AS h FROM (
         SELECT to_jsonb(s)::text AS x FROM san_pham s WHERE id = ANY($1::bigint[])
         UNION ALL SELECT to_jsonb(g)::text FROM goi_gia g WHERE san_pham_id = ANY($1::bigint[])
         UNION ALL SELECT to_jsonb(a)::text FROM anh_san_pham a WHERE san_pham_id = ANY($1::bigint[])) z`, [ids])).h;
    const tep = () => (fs.existsSync(THU_MUC) ? fs.readdirSync(THU_MUC).length : 0);
    const version = async (id) => (await mot('SELECT xmin::text AS v FROM san_pham WHERE id=$1', [id])).v;
    const anhCua = async (id) => (await q('SELECT id::text FROM anh_san_pham WHERE san_pham_id=$1 ORDER BY thu_tu, id', [id])).rows.map((r) => r.id);
    const thanLuu = async (id, gia) => ({ version: await version(id), ten: 'Tên mới', mo_ta: 'mô tả mới', het_hang: false, bien_the: '',
      offers: [{ so_luong: 1, price: gia, tien_te: 'SAR', nhan: '1 hộp' }] });

    /** Một cửa với bản sao của page ĐÃ GẮN: 409 đúng mã + lối sang, 0 dòng đổi (bản sao + món), 0 đẩy, 0 tệp mới. */
    const phaiChan = async (ten, lam) => {
      const truoc = await bam([bsA, xId]); const d0 = day.length; const f0 = tep();
      const r = await lam();
      assert.equal(r.status, 409, `${ten}: ${JSON.stringify(r.j)}`);
      assert.equal(r.j?.ma, 'ban_sao_da_chuyen', ten);
      assert.equal(r.j?.duLieu?.duongSua, `/san-pham?sp=${G.id}&tab=thi-truong`, ten);
      assert.match(r.j?.thongDiep || '', /Sản phẩm › «Gold Ring» › Theo thị trường/, ten);
      assert.equal(await bam([bsA, xId]), truoc, `${ten}: CSDL đổi`);
      assert.equal(day.length, d0, `${ten}: đã đẩy bản chép sang bot`);
      assert.equal(tep(), f0, `${ten}: tệp ảnh mồ côi`);
    };

    // Thân SAI (thiếu bậc giá) cũng ra 409 `ban_sao_da_chuyen`, không 400: chốt đứng TRƯỚC mọi kiểm của `saveProduct` — người đang
    // sửa một bản sao đã hết hiệu lực được chỉ đúng chỗ sửa trước khi bị bắt sửa ô.
    await t.test('D1 · cửa trang page POST /api/anh-san-pham/san-pham/:id ⇒ 409, 0 đổi, 0 đẩy (chốt trước mọi kiểm)', async () => {
      await phaiChan('lưu sản phẩm (trang page)', async () => goi(`/api/anh-san-pham/san-pham/${bsA}`, { body: await thanLuu(bsA, 123) }));
      await phaiChan('lưu sản phẩm (trang page) · thân sai', async () => goi(`/api/anh-san-pham/san-pham/${bsA}`, { body: { version: '1' } }));
    });
    await t.test('D2 · cửa Vận hành POST /api/van-hanh/products/:id ⇒ 409, 0 đổi, 0 đẩy (chốt trước mọi kiểm)', async () => {
      await phaiChan('lưu sản phẩm (Vận hành)', async () => goi(`/api/van-hanh/products/${bsA}`, { body: await thanLuu(bsA, 124) }));
      await phaiChan('lưu sản phẩm (Vận hành) · thân sai', async () => goi(`/api/van-hanh/products/${bsA}`, { body: { version: '1' } }));
    });
    // D3–D8: mỗi cửa một lượt HỢP LỆ (chặn ở đâu cũng được — lưới sớm của cửa hoặc cửa ra `taoBuocDayBot`) và một lượt mang thân mà
    // cửa phía sau sẽ từ chối bằng lỗi KHÁC — chỉ chốt ĐẦU cửa mới trả `ban_sao_da_chuyen` cho lượt đó (đảo-vá «bỏ chốt ở một cửa» đo ở đây).
    await t.test('D3 · tải ảnh lên ⇒ 409, 0 đổi, không tệp mồ côi (chốt trước kiểm nhãn)', async () => {
      await phaiChan('tải ảnh', () => goi(`/api/anh-san-pham/${bsA}/tai-len?nhan=${encodeURIComponent('Ảnh sản phẩm')}`, { body: PNG, type: 'image/png' }));
      await phaiChan('tải ảnh · nhãn quá dài', () => goi(`/api/anh-san-pham/${bsA}/tai-len?nhan=${'x'.repeat(81)}`, { body: PNG, type: 'image/png' }));
    });
    await t.test('D4 · dán link ảnh ⇒ 409, 0 đổi (chốt trước kiểm link)', async () => {
      await phaiChan('link ảnh', () => goi(`/api/anh-san-pham/${bsA}/link`, { body: { duong: 'https://content.pancake.vn/x.jpg', nhan: 'Feedback khách' } }));
      await phaiChan('link ảnh · link lạ', () => goi(`/api/anh-san-pham/${bsA}/link`, { body: { duong: 'javascript:alert(1)' } }));
    });
    await t.test('D5 · sửa nhãn ảnh ⇒ 409, 0 đổi (chốt trước kiểm nhãn)', async () => {
      const [a1] = await anhCua(bsA);
      await phaiChan('sửa nhãn', () => goi(`/api/anh-san-pham/anh/${a1}`, { body: { nhan: 'Feedback khách' } }));
      await phaiChan('sửa nhãn · quá dài', () => goi(`/api/anh-san-pham/anh/${a1}`, { body: { nhan: 'x'.repeat(81) } }));
    });
    await t.test('D6 · bỏ ảnh ⇒ 409, ảnh còn nguyên', async () => {
      const [a1] = await anhCua(bsA);
      await phaiChan('bỏ ảnh', () => goi(`/api/anh-san-pham/anh/${a1}`, { method: 'DELETE' }));
    });
    await t.test('D7 · xếp ảnh ⇒ 409 `ban_sao_da_chuyen` (không phải `lech_tap`), thứ tự nguyên', async () => {
      const ds = await anhCua(bsA);
      await phaiChan('xếp ảnh', () => goi(`/api/anh-san-pham/${bsA}/thu-tu`, { body: { ids: [...ds].reverse() } }));
      await phaiChan('xếp ảnh · tập lệch', () => goi(`/api/anh-san-pham/${bsA}/thu-tu`, { body: { ids: [ds[0]] } }));
    });
    await t.test('D8 · nối món POS ⇒ 409 `ban_sao_da_chuyen` (không phải `khac_shop`), pos_ma nguyên', async () => {
      await phaiChan('nối món POS', () => goi(`/api/anh-san-pham/pos/${bsA}`, { body: { posMa: '111:x' } }));
      await phaiChan('nối món POS · khác shop', () => goi(`/api/anh-san-pham/pos/${bsA}`, { body: { posMa: '222:q' } }));
    });

    await t.test('D9 · page CHƯA gắn: lưu bản sao qua hai cửa + link ảnh + nối món ⇒ thành như cũ, bot nhận đúng page', async () => {
      day.length = 0;
      const r1 = await goi(`/api/anh-san-pham/san-pham/${bsB}`, { body: await thanLuu(bsB, 77) });
      assert.equal(r1.status, 200, JSON.stringify(r1.j));
      const r2 = await goi(`/api/van-hanh/products/${bsB}`, { body: await thanLuu(bsB, 78) });
      assert.equal(r2.status, 200, JSON.stringify(r2.j));
      const r3 = await goi(`/api/anh-san-pham/${bsB}/link`, { body: { duong: 'https://content.pancake.vn/b2.jpg', nhan: 'Chứng nhận' } });
      assert.equal(r3.status, 200, JSON.stringify(r3.j));
      const r4 = await goi(`/api/anh-san-pham/pos/${bsB}`, { body: { posMa: '111:x' } });
      assert.equal(r4.status, 200, JSON.stringify(r4.j));
      assert.deepEqual(day.map((x) => x.pid), ['fbB', 'fbB', 'fbB', 'fbB']);
      const sp = day.at(-1).products.find((p) => p.name === 'Tên mới');
      assert.deepEqual(sp.tiers.map((x) => x.price), [78]);
      assert.equal(Number((await mot("SELECT gia FROM goi_gia WHERE san_pham_id=$1", [bsB])).gia), 7800);
    });

    await t.test('D10 · món POS mang page_id của page chưa gắn (RF-15) qua cửa trang page ⇒ vẫn lưu được (② 4 không áp)', async () => {
      const r = await goi(`/api/anh-san-pham/san-pham/${zId}`, { body: await thanLuu(zId, 55) });
      assert.equal(r.status, 200, JSON.stringify(r.j));
      assert.equal(Number((await mot('SELECT gia FROM goi_gia WHERE san_pham_id=$1', [zId])).gia), 5500);
    });

    await t.test('D11 · page bị gắn GIỮA lượt chốt đầu cửa và giao dịch ghi ⇒ cửa ra (bước đẩy) ROLLBACK: 409, 0 đổi, 0 đẩy (cả hai cửa)', async () => {
      try {
        for (const [ten, duong] of [['trang page', `/api/anh-san-pham/san-pham/${bsD}`], ['Vận hành', `/api/van-hanh/products/${bsD}`]]) {
          await q('UPDATE page SET san_pham_goc_ma=NULL WHERE id=$1', [D]);
          const than = await thanLuu(bsD, 99);
          const truoc = await bam([bsD, xId]); const d0 = day.length;
          chen = async () => { await q("UPDATE page SET san_pham_goc_ma='gold' WHERE id=$1", [D]); };
          const r = await goi(duong, { body: than });
          assert.equal(chen, null, `${ten}: lượt chen không chạy — ca không đo được gì`);
          assert.equal(r.status, 409, `${ten}: ${JSON.stringify(r.j)}`);
          assert.equal(r.j?.ma, 'ban_sao_da_chuyen', ten);
          assert.equal(await bam([bsD, xId]), truoc, `${ten}: giao dịch không lùi`);
          assert.equal(day.length, d0, `${ten}: đã đẩy`);
        }
      } finally {   // ca đỏ giữa chừng không được để page D ở trạng thái gắn cho ca sau (đỏ dây chuyền giả)
        chen = null;
        await q('UPDATE page SET san_pham_goc_ma=NULL WHERE id=$1', [D]);
      }
    });

    await t.test('D12 · lượt gắn ĐANG DỞ (giữ khoá dòng page) khi giao dịch lưu đã qua chốt đầu cửa ⇒ cửa ra CHỜ, thấy page đã gắn ⇒ 409, 0 đẩy', async () => {
      await q('UPDATE page SET san_pham_goc_ma=NULL WHERE id=$1', [D]);
      const truoc = await bam([bsD, xId]); const d0 = day.length;
      const than = await thanLuu(bsD, 98);
      let k = null;
      chen = async () => {   // ngay trước giao dịch ghi: một phiên khác bắt đầu gắn page D và giữ khoá dòng page 200ms rồi mới commit
        k = await pool.connect();
        await k.query('BEGIN');
        await k.query('SELECT id FROM page WHERE id=$1 FOR UPDATE', [D]);
        setTimeout(async () => {
          await k.query("UPDATE page SET san_pham_goc_ma='gold' WHERE id=$1", [D]);
          await k.query('COMMIT'); k.release();
        }, 200);
      };
      const r = await goi(`/api/anh-san-pham/san-pham/${bsD}`, { body: than });
      assert.equal(chen, null, 'lượt chen không chạy');
      assert.equal(r.status, 409, JSON.stringify(r.j));
      assert.equal(r.j?.ma, 'ban_sao_da_chuyen');
      assert.equal(await bam([bsD, xId]), truoc, 'giao dịch không lùi');
      assert.equal(day.length, d0, 'đã đẩy món POS thay bản sao');
      await q('UPDATE page SET san_pham_goc_ma=NULL WHERE id=$1', [D]);
    });

    await t.test('D13 · cửa ra: bước đẩy chung `taoBuocDayBot` từ chối bản sao của page đã gắn — mọi cửa (kể cả cửa mai thêm) đi qua nó', async () => {
      const d0 = day.length;
      const e = await taoBuocDayBot({ day: dayFn, env: {} })(pool, { teamId: T }, bsA).then(() => null, (x) => x);
      assert.equal(e?.ma, 'ban_sao_da_chuyen');
      assert.equal(day.length, d0);
      const ok = await taoBuocDayBot({ day: dayFn, env: {} })(pool, { teamId: T }, xId);
      assert.equal(ok.ok, true, 'món POS đi qua cửa ra như cũ');
    });

    await t.test('D14 · id có số 0 đứng đầu (Postgres ép về đúng bản sao bị khoá) ⇒ 400 `ma_khong_hop_le`, 0 đổi, 0 đẩy', async () => {
      const [a1] = await anhCua(bsA);
      for (const [ten, lam] of [
        ['link 0<id>', () => goi(`/api/anh-san-pham/0${bsA}/link`, { body: { duong: 'https://content.pancake.vn/y.jpg', nhan: 'Chứng nhận' } })],
        ['tải lên 0<id>', () => goi(`/api/anh-san-pham/0${bsA}/tai-len?nhan=x`, { body: PNG, type: 'image/png' })],
        ['xếp 0<id>', async () => goi(`/api/anh-san-pham/0${bsA}/thu-tu`, { body: { ids: [...await anhCua(bsA)].reverse() } })],
        ['nối món 0<id>', () => goi(`/api/anh-san-pham/pos/0${bsA}`, { body: { posMa: '111:x' } })],
        ['sửa nhãn ảnh 0<id>', () => goi(`/api/anh-san-pham/anh/0${a1}`, { body: { nhan: 'Chứng nhận' } })],
        ['bỏ ảnh 0<id>', () => goi(`/api/anh-san-pham/anh/0${a1}`, { method: 'DELETE' })],
      ]) {
        const truoc = await bam([bsA, xId]); const d0 = day.length; const f0 = tep();
        const r = await lam();
        assert.deepEqual([r.status, r.j?.ma], [400, 'ma_khong_hop_le'], `${ten}: ${JSON.stringify(r.j)}`);
        assert.equal(await bam([bsA, xId]), truoc, `${ten}: CSDL đổi`);
        assert.equal(day.length, d0, `${ten}: đã đẩy`);
        assert.equal(tep(), f0, `${ten}: tệp mồ côi`);
      }
    });
  } finally {
    sv?.close();
    await sb.don();
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});
