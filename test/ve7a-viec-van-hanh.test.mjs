// PHIẾU VE7a · `v3/src/ui/van-hanh/tom-tat.js#tomTatViecVanHanh` + `GET /api/van-hanh/tom-tat` — ba con số «Việc vận hành» của
// bản vẽ 4 (Hệ còn sống không), trên Postgres THẬT (sandbox riêng, tự dọn). Canh: tin cần đối chiếu = ĐÚNG tập mà nút đối chiếu xử
// (`loi` · `chan_guard`, tin đã xong không tính) + trong đó bao nhiêu có lượt gửi «không rõ kết quả» · tin bị lọc trong 24 GIỜ (dòng
// cũ hơn không tính; «đáng ngờ» theo cờ của từng lý do) · diễn tập đếm lượt + cờ bật · không lẫn team khác · marketer 403.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { dungSandbox } from '../db/sandbox.js';
import { dungPhanB } from '../v3/src/vai-b.js';
import { taoTruyVanThat } from '../v3/src/noi-day/cong-du-lieu-that.js';
import { taoCongDanhTinh } from '../v3/src/noi-day/cong-danh-tinh.js';
import { bam } from '../v3/src/auth/index.js';
import { tomTatViecVanHanh } from '../v3/src/ui/van-hanh/tom-tat.js';

test('VE7a · việc vận hành: đối chiếu · lọc 24 giờ · diễn tập — đúng tập, đúng team, đúng vai', async (t) => {
  process.env.V3_KHOA_VE = 've7a-only-signing-key-'.repeat(3);
  process.env.V3_KHOA_MA_HOA ||= 'd'.repeat(64);
  const sb = await dungSandbox('ve7a_van_hanh');
  const pool = sb.pool;
  let server;
  const one = async (sql, a = []) => (await pool.query(sql, a)).rows[0];
  try {
    const team = (await one("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
    const khac = (await one("INSERT INTO team(slug,ten) VALUES('ve7a-khac','Khác') RETURNING id")).id;
    const MK = 'Ve7a-password-only-123';
    for (const [email, vai] of [['qt@ve7a.test', 'quan-tri'], ['mkt@ve7a.test', 'marketer']]) {
      const u = await one('INSERT INTO nguoi_dung(email,ten,mat_khau_hash) VALUES($1,$1,$2) RETURNING id', [email, await bam(MK)]);
      await pool.query('INSERT INTO thanh_vien_team(team_id,nguoi_dung_id,vai_id) SELECT $1,$2,id FROM vai WHERE ma=$3', [team, u.id, vai]);
    }
    let n = 0;
    const tin = async (tm, trangThai) => (await one(
      "INSERT INTO tin_cho_xu_ly(team_id,page_id,psid,conv_id,msg_id,noi_dung,trang_thai) VALUES($1,'p1',$2,$3,$4,'x',$5) RETURNING id",
      [tm, 'ps' + (++n), 'c' + n, 'm' + n, trangThai])).id;
    const gui = async (tm, tinId, buoc, trangThai) => pool.query(
      "INSERT INTO lan_gui(team_id,tin_id,buoc,loai,noi_dung,trang_thai) VALUES($1,$2,$3,'guiTin','{}'::jsonb,$4)", [tm, tinId, buoc, trangThai]);
    const t1 = await tin(team, 'loi'); await gui(team, t1, 1, 'khong_ro');
    const t2 = await tin(team, 'chan_guard'); await gui(team, t2, 1, 'da_gui');
    const t3 = await tin(team, 'xong'); await gui(team, t3, 1, 'khong_ro');          // đã đối chiếu xong — không tính
    const t4 = await tin(khac, 'loi'); await gui(khac, t4, 1, 'khong_ro');           // team khác — không tính
    const d1 = await tin(team, 'xong'); await gui(team, d1, 1, 'dien_tap'); await gui(team, d1, 2, 'dien_tap');
    const bq = async (tm, lyDo, gio) => pool.query(
      "INSERT INTO nap_bo_qua(team_id,page_id,conv_id,ly_do,lan_dau,lan_cuoi) VALUES($1,'p1',$2,$3,now()-interval '40 hours',now()-($4||' hours')::interval)",
      [tm, 'bq' + (++n), lyDo, String(gio)]);
    await bq(team, 'the_chan', 1);          // đáng ngờ, trong 24 giờ
    await bq(team, 'page_noi_cuoi', 2);     // bình thường, trong 24 giờ
    await bq(team, 'da_doc', 30);           // ngoài 24 giờ — không tính
    await bq(khac, 'the_chan', 1);          // team khác

    const mong = { tinLoi: { tong: 2, khongRo: 1 }, boQua24h: { tong: 2, dangNgo: 1 }, dienTap: { soLuot: 2, soPage: 1, dangBat: false } };
    await t.test('T1 · hàm: đúng tập đối chiếu, đúng cửa sổ 24 giờ, đúng team; cờ diễn tập đọc từ env', async () => {
      assert.deepEqual(await tomTatViecVanHanh(pool, { teamId: team }, {}), mong);
      assert.equal((await tomTatViecVanHanh(pool, { teamId: team }, { V3_DIEN_TAP: '1' })).dienTap.dangBat, true);
      await assert.rejects(() => tomTatViecVanHanh(pool, {}, {}), /teamId/);
    });

    const app = express();
    dungPhanB(app, { express, vanHanh: { pool, env: {} },
      taoTruyVan: (bc) => taoTruyVanThat(pool, bc), taoTruyVanHeThong: () => taoCongDanhTinh(pool) });
    server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    const goc = `http://127.0.0.1:${server.address().port}`;
    const vao = async (email) => (await fetch(goc + '/api/dang-nhap', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, matKhau: MK }) })).headers.get('set-cookie').split(';')[0];
    await t.test('T2 · cửa `/api/van-hanh/tom-tat`: quản trị đọc đúng số; marketer 403 (cửa Vận hành chỉ quản trị · quản lý)', async () => {
      const r = await fetch(goc + '/api/van-hanh/tom-tat', { headers: { cookie: await vao('qt@ve7a.test') } });
      assert.equal(r.status, 200);
      const { ok, ...d } = await r.json();
      assert.equal(ok, true);
      assert.deepEqual(d, mong);
      assert.equal((await fetch(goc + '/api/van-hanh/tom-tat', { headers: { cookie: await vao('mkt@ve7a.test') } })).status, 403);
    });
  } finally {
    if (server) await new Promise((r) => server.close(r));
    await sb.don();
  }
});
