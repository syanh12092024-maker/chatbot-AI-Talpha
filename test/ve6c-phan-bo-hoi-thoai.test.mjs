// PHIẾU VE6c · `so-lieu.js#phanBoHoiThoai` + `/api/nguon-khach` `phanBo` — hội thoại CỦA TEAM theo giai đoạn × người giữ (bản vẽ 3c),
// trên Postgres THẬT (sandbox riêng, tự dọn). Canh: đúng team (không lẫn team khác) · nhóm đúng cặp, lớn nhất lên đầu · tuổi = lần
// chạm cuối · vai không xem số liệu bị từ chối · qua cửa HTTP thật, payload mang nhãn chữ của Hộp thư và KHÔNG có tỉ lệ rơi.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { dungSandbox } from '../db/sandbox.js';
import { dungPhanB } from '../v3/src/vai-b.js';
import { taoTruyVanThat } from '../v3/src/noi-day/cong-du-lieu-that.js';
import { taoCongDanhTinh } from '../v3/src/noi-day/cong-danh-tinh.js';
import { bam } from '../v3/src/auth/index.js';
import * as soLieu from '../src/db/so-lieu.js';

test('VE6c · phân bố hội thoại theo team: đúng team, đúng cặp, có tuổi, đúng vai — qua hàm và qua cửa HTTP', async (t) => {
  process.env.V3_KHOA_VE = 've6c-only-signing-key-'.repeat(3);
  process.env.V3_KHOA_MA_HOA ||= 'd'.repeat(64);
  const sb = await dungSandbox('ve6c_phan_bo');
  const pool = sb.pool;
  let server;
  const one = async (sql, a = []) => (await pool.query(sql, a)).rows[0];
  try {
    const team = (await one("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
    const khac = (await one("INSERT INTO team(slug,ten) VALUES('ve6c-khac','Khác') RETURNING id")).id;
    const MK = 'Ve6c-password-only-123';
    for (const [email, vai, t2] of [['qt@ve6c.test', 'quan-tri', team], ['mkt@ve6c.test', 'marketer', team], ['sale@ve6c.test', 'sale', team]]) {
      const u = await one('INSERT INTO nguoi_dung(email,ten,mat_khau_hash) VALUES($1,$1,$2) RETURNING id', [email, await bam(MK)]);
      await pool.query('INSERT INTO thanh_vien_team(team_id,nguoi_dung_id,vai_id) SELECT $1,$2,id FROM vai WHERE ma=$3', [t2, u.id, vai]);
    }
    const p = await one("INSERT INTO page(team_id,page_id,ten) VALUES($1,'ve6c-p','P') RETURNING id", [team]);
    const pk = await one("INSERT INTO page(team_id,page_id,ten) VALUES($1,'ve6c-k','K') RETURNING id", [khac]);
    let n = 0;
    const ht = async (tm, pg, tt, chu, soNgay) => pool.query(
      "INSERT INTO hoi_thoai(team_id,page_id,psid,chu_so_huu,trang_thai,cham_luc) VALUES($1,$2,$3,$4,$5,now()-($6||' days')::interval)",
      [tm, pg, 'ps' + (++n), chu, tt, String(soNgay)]);
    for (let i = 0; i < 5; i++) await ht(team, p.id, 'GREET', 'BOTCAKE', 10);
    for (let i = 0; i < 2; i++) await ht(team, p.id, 'QUALIFY', 'AI', 3);
    await ht(team, p.id, 'HANDOFF', 'SALE', 1);
    for (let i = 0; i < 7; i++) await ht(khac, pk.id, 'GREET', 'AI', 0);   // team khác — không được lẫn

    const ctx = { teamId: team, nguoiDungId: null };
    await t.test('H1 · hàm: chỉ hội thoại của team, nhóm đúng cặp, lớn nhất lên đầu, tổng đúng, tuổi = lần chạm cuối', async () => {
      const u = await one("SELECT tv.nguoi_dung_id FROM thanh_vien_team tv JOIN vai v ON v.id=tv.vai_id WHERE v.ma='quan-tri' AND tv.team_id=$1", [team]);
      const r = await soLieu.phanBoHoiThoai(pool, { ...ctx, nguoiDungId: u.nguoi_dung_id });
      assert.equal(r.tong, 8, 'lẫn hội thoại của team khác');
      assert.deepEqual(r.theoCap.map((x) => [x.bac, x.chu, x.so]), [['GREET', 'BOTCAKE', 5], ['QUALIFY', 'AI', 2], ['HANDOFF', 'SALE', 1]]);
      const moi = (await one('SELECT max(cham_luc) m FROM hoi_thoai WHERE team_id=$1', [team])).m;
      assert.equal(r.tuoi.chamMoiNhat, new Date(moi).getTime());
    });
    await t.test('H2 · hàm: vai sale (không xem số liệu) bị từ chối', async () => {
      const u = await one("SELECT tv.nguoi_dung_id FROM thanh_vien_team tv JOIN vai v ON v.id=tv.vai_id WHERE v.ma='sale' AND tv.team_id=$1", [team]);
      await assert.rejects(() => soLieu.phanBoHoiThoai(pool, { teamId: team, nguoiDungId: u.nguoi_dung_id }));
    });

    const app = express();
    const ctxA = (bc) => ({ teamId: bc.teamId, nguoiDungId: bc.nguoiDungId });
    dungPhanB(app, { express, docPheu: async () => { throw new Error('bot cũ không chạy trong ca'); },
      docPhanBoHoiThoai: (bc) => soLieu.phanBoHoiThoai(pool, ctxA(bc)),
      taoTruyVan: (bc) => taoTruyVanThat(pool, bc), taoTruyVanHeThong: () => taoCongDanhTinh(pool) });
    server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    const goc = `http://127.0.0.1:${server.address().port}`;
    const vao = async (email) => (await fetch(goc + '/api/dang-nhap', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, matKhau: MK }) })).headers.get('set-cookie').split(';')[0];
    await t.test('H3 · cửa `/api/nguon-khach` (marketer): `phanBo` theo team, nhãn chữ Hộp thư, KHÔNG tỉ lệ rơi; khối toàn hệ hỏng không kéo theo', async () => {
      const r = await fetch(goc + '/api/nguon-khach', { headers: { cookie: await vao('mkt@ve6c.test') } });
      assert.equal(r.status, 200);
      const d = await r.json();
      assert.equal(d.phanBo.docDuoc, true);
      assert.equal(d.phanBo.laTheoTeam, true);
      assert.equal(d.phanBo.tong, 8);
      assert.deepEqual(d.phanBo.cap.map((x) => [x.ten, x.so]), [['Chào · Botcake giữ', 5], ['Tìm hiểu nhu cầu · bot AI', 2], ['Chờ người · sale', 1]]);
      assert.ok(!/tiLeRoi|tyLeRoi|"roi"/i.test(JSON.stringify(d.phanBo)), 'phân bố mọc tỉ lệ rơi');
      assert.equal(d.pheu.docDuoc, false, 'khối toàn hệ (bot cũ) hỏng phải nói hỏng — độc lập với khối theo team');
    });
  } finally {
    if (server) await new Promise((r) => server.close(r));
    await sb.don();
  }
});
