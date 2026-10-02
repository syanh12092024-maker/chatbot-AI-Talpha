// PHIẾU LL2 · HỘP THƯ trên Postgres THẬT (sandbox) — đường ghi của sale đi trọn: cookie đăng nhập →
// cái chắn vai → `van-hanh/don-cho.js` → `hang-cho.js#duyet` → POS (giả) → CSDL.
//
// Bộ ca tĩnh `v3/test/b/hop-thu.test.mjs` canh HÌNH DẠNG (đường, đồ thị import, script). Tệp này canh
// HÀNH VI: sale duyệt được đơn Messenger và tạo ĐÚNG MỘT đơn POS dù bấm hai lần cùng lúc; marketer bị
// chặn; team khác không thấy; nhận thay bot đẻ đúng một dòng việc; tìm khách theo số thô ra đúng người.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { dungSandbox } from '../db/sandbox.js';
import { dungPhanB } from '../v3/src/vai-b.js';
import { taoTruyVanThat } from '../v3/src/noi-day/cong-du-lieu-that.js';
import { taoCongDanhTinh } from '../v3/src/noi-day/cong-danh-tinh.js';
import { bam } from '../v3/src/auth/index.js';
import { maHoa } from '../db/khoa.js';
import { vaoHangCho } from '../src/orders/hang-cho.js';
import { chuanHoaSdt } from '../src/orders/loc-trung.js';

test('LL2 · Hộp thư: sale duyệt/loại đơn Messenger, nhận thay bot, tìm khách — trên Postgres thật', async (t) => {
  process.env.V3_KHOA_VE = 'll2-only-signing-key-'.repeat(3);
  process.env.V3_KHOA_MA_HOA = 'd'.repeat(64);
  const sb = await dungSandbox('ll2_hop_thu');
  const pool = sb.pool;
  let server;
  const one = async (sql, args = []) => (await pool.query(sql, args)).rows[0];
  try {
    const team = (await one("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
    const other = (await one("INSERT INTO team(slug,ten) VALUES('ll2-other','Other') RETURNING id")).id;
    const matKhau = 'Ll2-password-only-123';
    for (const [email, vai, teamId] of [
      ['sale@ll2.test', 'sale', team], ['mkt@ll2.test', 'marketer', team], ['sale2@ll2.test', 'sale', other],
    ]) {
      const u = await one('INSERT INTO nguoi_dung(email,ten,mat_khau_hash) VALUES($1,$1,$2) RETURNING id', [email, await bam(matKhau)]);
      await pool.query('INSERT INTO thanh_vien_team(team_id,nguoi_dung_id,vai_id) SELECT $1,$2,id FROM vai WHERE ma=$3', [teamId, u.id, vai]);
    }
    const page = await one(
      "INSERT INTO page(team_id,page_id,ten,pos_shop_id,bot_ai_bat) VALUES($1,'ll2-page','Page LL2','9995002',false) RETURNING *", [team]);
    const ma = '9995002:4f1c0a52-7b1e-4a53-9b2f-0c1d2e3f4a5b';
    const sp = await one("INSERT INTO san_pham(team_id,page_id,ma,ten,mo_ta) VALUES($1,$2,$3,'Sản phẩm LL2','') RETURNING *", [team, page.id, ma]);
    await pool.query("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,2,19900,'AED'),($1,$2,3,27900,'AED')", [team, sp.id]);
    await pool.query("INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma) VALUES($1,'LL2','9995002',$2)", [team, maHoa('fake-pos-key')]);

    const env = { V3_POS_GHI: '1', V3_KHOA_MA_HOA: process.env.V3_KHOA_MA_HOA };
    let posPosts = 0;
    const nap = async (_url, opts = {}) => {
      if (opts.method === 'POST') posPosts++;
      return { ok: true, status: 200, text: async () => JSON.stringify(opts.method === 'POST'
        ? { data: { id: 888000 + posPosts } } : { data: [], total_entries: 0 }) };
    };
    const app = express();
    dungPhanB(app, {
      express,
      vanHanh: { pool, env, orderDeps: { env, nap }, daySanPhamLenBot: async () => {} },
      taoTruyVan: (bc) => taoTruyVanThat(pool, bc),
      taoTruyVanHeThong: () => taoCongDanhTinh(pool),
    });
    server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    const goc = `http://127.0.0.1:${server.address().port}`;
    const dangNhap = async (email) => {
      const r = await fetch(goc + '/api/dang-nhap', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, matKhau }) });
      assert.equal(r.status, 200, await r.text());
      return r.headers.get('set-cookie').split(';')[0];
    };
    const [sale, mkt, sale2] = [await dangNhap('sale@ll2.test'), await dangNhap('mkt@ll2.test'), await dangNhap('sale2@ll2.test')];
    const goi = async (duong, than, ck = sale, dau = {}) => {
      const r = await fetch(goc + duong, {
        method: than === undefined ? 'GET' : 'POST',
        headers: { Cookie: ck, 'Content-Type': 'application/json', 'X-V3-Action': '1', ...dau },
        body: than === undefined ? undefined : JSON.stringify(than),
      });
      return { status: r.status, ...(await r.json().catch(() => ({}))) };
    };

    const taoDon = async (psid, hoSo) => {
      const h = await one("INSERT INTO hoi_thoai(team_id,page_id,psid,chu_so_huu,trang_thai) VALUES($1,$2,$3,'AI','CLOSING') RETURNING *",
        [team, page.id, psid]);
      await pool.query("INSERT INTO tin_cho_xu_ly(team_id,page_id,psid,conv_id,msg_id,noi_dung,trang_thai) VALUES($1,'ll2-page',$2,$3,$4,'yes','xong')",
        [team, psid, 'conv-' + psid, psid + '-1']);
      const d = await vaoHangCho(pool, { teamId: team }, {
        hoiThoaiId: h.id,
        hoSo: { ten: 'Sara', sdt: '+971500000777', dia_chi: 'Dubai 1', thanh_pho: 'Dubai', so_luong: 2, tong_tien: 19900,
          tien_te: 'AED', san_pham_ma: ma, kho_hang: 'kho-ll2', ...hoSo },
        convId: 'conv-' + psid,
      }, { env, nap });
      return { h, d };
    };
    const a = await taoDon('buyer-a');
    const b = await taoDon('buyer-b', { ten: 'Mona', sdt: '+971500000888' });

    await t.test('L1 · Đơn chờ và bối cảnh hội thoại thấy đơn chờ duyệt; marketer 403; team khác 404', async () => {
      const dc = await goi('/api/hop-thu/don-cho');
      assert.equal(dc.status, 200, JSON.stringify(dc));
      assert.deepEqual(dc.messenger.map((x) => x.id).sort(), [String(a.d.id), String(b.d.id)].sort());
      const bcA = await goi(`/api/ban-hoi-thoai/${a.h.id}/boi-canh`);
      assert.equal(bcA.donChoDuyet?.id, String(a.d.id), JSON.stringify(bcA.donChoDuyet));
      assert.equal((await goi(`/api/hop-thu/don/${a.d.id}`, undefined, mkt)).status, 403);
      assert.equal((await goi(`/api/hop-thu/don/${a.d.id}`, undefined, sale2)).status, 404);
      assert.equal((await goi('/api/hop-thu/don-cho', undefined, sale2)).messenger.length, 0, 'team khác không thấy đơn chờ');
      assert.equal((await goi(`/api/hop-thu/don/${a.d.id}/duyet`, { version: 'x' }, sale, { 'X-V3-Action': '0' })).status, 403);
    });

    await t.test('L2 · sale lưu (phiên bản cũ ⇒ 409), rồi duyệt hai lần cùng lúc ⇒ ĐÚNG MỘT đơn POS', async () => {
      const o = (await goi(`/api/hop-thu/don/${a.d.id}`)).item;
      const tho = { ten: 'Sara Ali', sdt: '+971500000777', dia_chi: 'Dubai 2', thanh_pho: 'Dubai', kho_hang: 'kho-ll2', san_pham_ma: ma };
      assert.equal((await goi(`/api/hop-thu/don/${a.d.id}/luu`, { ...tho, so_luong: 5, version: o.version })).status, 400,
        'không có gói 5 ⇒ 400, không lưu bừa');
      assert.equal((await goi(`/api/hop-thu/don/${a.d.id}/luu`, { ...tho, so_luong: 3, version: o.version })).status, 200);
      assert.equal((await goi(`/api/hop-thu/don/${a.d.id}/luu`, { ...tho, so_luong: 2, version: o.version })).status, 409,
        'phiên bản đã đọc cũ ⇒ 409 — không ghi đè lượt sửa vừa rồi');
      const moi = (await goi(`/api/hop-thu/don/${a.d.id}`)).item;
      assert.equal(moi.du_lieu_don.so_luong, 3);
      assert.equal(Number(moi.du_lieu_don.tong_tien), 27900, 'tổng tiền lấy từ gói giá, không từ người gõ');
      const kq = await Promise.all([goi(`/api/hop-thu/don/${a.d.id}/duyet`, { version: moi.version }),
        goi(`/api/hop-thu/don/${a.d.id}/duyet`, { version: moi.version })]);
      assert.equal(kq.filter((r) => r.result?.tao).length, 1, JSON.stringify(kq));
      assert.equal(posPosts, 1);
      assert.equal((await one('SELECT trang_thai FROM hang_cho_tao_don WHERE id=$1', [a.d.id])).trang_thai, 'da_duyet');
    });

    await t.test('L3 · loại đơn: lý do ngắn ⇒ 400; đủ ⇒ tu_choi, không chạm POS', async () => {
      assert.equal((await goi(`/api/hop-thu/don/${b.d.id}/loai`, { reason: 'x' })).status, 400);
      assert.equal((await goi(`/api/hop-thu/don/${b.d.id}/loai`, { reason: 'khách đổi ý, không mua' })).status, 200);
      assert.equal((await one('SELECT trang_thai FROM hang_cho_tao_don WHERE id=$1', [b.d.id])).trang_thai, 'tu_choi');
      assert.equal(posPosts, 1, 'loại đơn không gọi POS');
    });

    await t.test('L4 · nhận thay bot: hội thoại sang SALE + đúng một dòng việc; bấm lại không đẻ thêm', async () => {
      const h = await one("INSERT INTO hoi_thoai(team_id,page_id,psid,chu_so_huu,trang_thai) VALUES($1,$2,'bot-dang-giu','AI','SELLING') RETURNING *",
        [team, page.id]);
      const r1 = await goi(`/api/hop-thu/hoi-thoai/${h.id}/nhan`, {});
      assert.equal(r1.status, 200, JSON.stringify(r1));
      assert.equal(r1.viecMoi, true);
      assert.equal((await one('SELECT chu_so_huu FROM hoi_thoai WHERE id=$1', [h.id])).chu_so_huu, 'SALE');
      const r2 = await goi(`/api/hop-thu/hoi-thoai/${h.id}/nhan`, {});
      assert.equal(r2.viecMoi, false);
      assert.equal((await one("SELECT count(*)::int c FROM viec_can_xu_ly WHERE hoi_thoai_id=$1 AND dong_luc IS NULL", [h.id])).c, 1);
      assert.equal((await goi(`/api/hop-thu/hoi-thoai/${h.id}/nhan`, {}, mkt)).status, 403);
    });

    await t.test('L5 · tìm khách theo số THÔ ra đúng người, kèm hồ sơ (đơn · hội thoại)', async () => {
      const k = await one("INSERT INTO khach(team_id,ten,so_dien_thoai) VALUES($1,'Mona',$2) RETURNING id", [team, chuanHoaSdt('+971500000888')]);
      await pool.query('UPDATE hoi_thoai SET khach_id=$1 WHERE id=$2', [k.id, b.h.id]);
      const r = await goi('/api/hop-thu/tim-khach?sdt=' + encodeURIComponent('+971 50 000 0888'));
      assert.equal(r.status, 200, JSON.stringify(r));
      assert.deepEqual(r.khach.map((x) => x.id), [String(k.id)]);
      assert.ok(r.khach[0].tangHoan?.chu, 'tầng hoàn phải mang CHỮ cho màn');
      const h = await goi(`/api/hop-thu/khach/${k.id}`);
      assert.deepEqual(h.hoiThoai.map((x) => x.id), [String(b.h.id)]);
      assert.equal((await goi(`/api/hop-thu/khach/${k.id}`, undefined, sale2)).status, 404, 'team khác ⇒ 404');
    });

    await t.test('L6 · VE5 · thẻ đơn biết van POS: đóng ⇒ `posGhiMo=false`, duyệt bị chặn, đơn vẫn chờ, 0 lượt POST POS; mở ⇒ true', async () => {
      const c = await taoDon('buyer-c', { ten: 'Lina', sdt: '+971500000999' });
      env.V3_POS_GHI = '0';
      try {
        const d = await goi(`/api/hop-thu/don/${c.d.id}`);
        assert.equal(d.posGhiMo, false, 'van đóng mà thẻ đơn không biết ⇒ sale bấm duyệt rồi mới nhận lỗi');
        const truoc = posPosts;
        const r = await goi(`/api/hop-thu/don/${c.d.id}/duyet`, { version: d.item.version });
        assert.notEqual(r.status, 200, 'van đóng mà duyệt vẫn qua');
        assert.equal(posPosts, truoc, 'van đóng mà vẫn POST sang POS');
        assert.equal((await one('SELECT trang_thai FROM hang_cho_tao_don WHERE id=$1', [c.d.id])).trang_thai, 'cho_duyet');
      } finally { env.V3_POS_GHI = '1'; }
      assert.equal((await goi(`/api/hop-thu/don/${c.d.id}`)).posGhiMo, true);
    });
  } finally {
    if (server) await new Promise((r) => server.close(r));
    await sb.don();
  }
});
