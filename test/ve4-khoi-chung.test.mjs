// PHIẾU VE4 · «CHÍNH SÁCH · FAQ · PHẢN ĐỐI» thành tab của Luật chung (bản vẽ 2d) — cửa ĐỌC ba khối theo team, trên
// Postgres THẬT. Cửa GHI (MN7, `/api/anh-san-pham/khoi-chung` POST) giữ nguyên; cửa đọc đặt CÙNG router để hưởng CÙNG
// rào (đăng nhập · quản trị/marketer · X-V3-Action · chặn cross-site).
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { dungSandbox } from '../db/sandbox.js';
import { dungPhanB } from '../v3/src/vai-b.js';
import { taoTruyVanThat } from '../v3/src/noi-day/cong-du-lieu-that.js';
import { taoCongDanhTinh } from '../v3/src/noi-day/cong-danh-tinh.js';
import { bam } from '../v3/src/auth/index.js';

test('VE4 · cửa đọc khối dùng chung: đúng team, đúng rào, nói rõ team có đang giữ bộ khối của bot không', async (t) => {
  process.env.V3_KHOA_VE = 've4-only-signing-key-'.repeat(3);
  process.env.V3_KHOA_MA_HOA ||= 'd'.repeat(64);
  const sb = await dungSandbox('ve4_khoi_chung');
  const pool = sb.pool;
  let server;
  const one = async (sql, a = []) => (await pool.query(sql, a)).rows[0];
  try {
    const team = (await one("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
    const khac = (await one("INSERT INTO team(slug,ten) VALUES('ve4-khac','Khác') RETURNING id")).id;
    const MK = 'Ve4-password-only-123';
    for (const [email, vai, t2] of [['qt@ve4.test', 'quan-tri', team], ['mkt@ve4.test', 'marketer', team], ['sale@ve4.test', 'sale', team], ['qt2@ve4.test', 'quan-tri', khac]]) {
      const u = await one('INSERT INTO nguoi_dung(email,ten,mat_khau_hash) VALUES($1,$1,$2) RETURNING id', [email, await bam(MK)]);
      await pool.query('INSERT INTO thanh_vien_team(team_id,nguoi_dung_id,vai_id) SELECT $1,$2,id FROM vai WHERE ma=$3', [t2, u.id, vai]);
    }
    // Team giữ bộ khối của bot = team có sản phẩm nạp từ bot (`nguon='kb'`).
    const p = await one("INSERT INTO page(team_id,page_id,ten) VALUES($1,'ve4-p','Page VE4') RETURNING id", [team]);
    await pool.query("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon) VALUES($1,$2,'kb:1','SP','kb')", [team, p.id]);
    await pool.query("INSERT INTO khoi_dung_chung(team_id,noi_dung,phien_ban,nguoi_sua,sua_luc) VALUES($1,$2,3,'qt@ve4.test',now())",
      [team, JSON.stringify({ policies: [{ topic: 'Giao hàng', content: 'Giao 3 ngày toàn Saudi.' }], faqs: [], objections: [] })]);

    const app = express();
    dungPhanB(app, { express, vanHanh: { pool, env: {}, dayKhoiChungLenBot: async () => ({}) },
      taoTruyVan: (bc) => taoTruyVanThat(pool, bc), taoTruyVanHeThong: () => taoCongDanhTinh(pool) });
    server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    const goc = `http://127.0.0.1:${server.address().port}`;
    const vao = async (email) => (await fetch(goc + '/api/dang-nhap', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, matKhau: MK }) })).headers.get('set-cookie').split(';')[0];
    const doc = async (email, hdr = { 'X-V3-Action': '1' }, duoi = '') => fetch(goc + '/api/anh-san-pham/khoi-chung' + duoi, { headers: { cookie: await vao(email), ...hdr } });

    await t.test('K1 · marketer đọc được ba khối của team mình + phiên bản; team đang giữ bộ khối ⇒ sửa được', async () => {
      const r = await doc('mkt@ve4.test');
      assert.equal(r.status, 200);
      const d = await r.json();
      assert.equal(d.phienBan, 3);
      assert.deepEqual(d.noiDung.policies.map((x) => x.topic), ['Giao hàng']);
      assert.deepEqual(d.giu, { ok: true, viSao: null });
    });
    await t.test('K2 · CÙNG rào với cửa ghi: thiếu X-V3-Action ⇒ 403 · vai sale ⇒ 403', async () => {
      assert.equal((await doc('mkt@ve4.test', {})).status, 403);
      assert.equal((await doc('sale@ve4.test')).status, 403);
    });
    await t.test('K3 · team KHÔNG giữ bộ khối của bot ⇒ đọc được bản của mình, nhưng `giu.ok=false` kèm lý do (không để bấm lưu rồi mới 403)', async () => {
      const d = await (await doc('qt2@ve4.test')).json();
      assert.equal(d.phienBan, 0, 'team khác không thấy khối của team giữ');
      assert.equal(d.giu.ok, false);
      assert.match(d.giu.viSao, /team khác/);
      // Team lấy từ PHIÊN, không từ yêu cầu: chỉ tên team kia vào query/header cũng không đọc được khối của nó.
      const lach = await (await doc('qt2@ve4.test', { 'X-V3-Action': '1', 'X-Team-Id': team }, `?team=${team}&teamId=${team}`)).json();
      assert.equal(lach.phienBan, 0, 'đọc chéo team qua tham số yêu cầu');
    });
    await t.test('K4 · khứ hồi: đọc → ghi qua cửa CŨ (phiên bản đúng) → đọc lại ra bản mới', async () => {
      const ck = await vao('mkt@ve4.test');
      const d = await (await fetch(goc + '/api/anh-san-pham/khoi-chung', { headers: { cookie: ck, 'X-V3-Action': '1' } })).json();
      d.noiDung.faqs.push({ q: 'Có COD không?', a: 'Có, trả tiền khi nhận hàng.' });
      const g = await fetch(goc + '/api/anh-san-pham/khoi-chung', { method: 'POST', headers: { cookie: ck, 'X-V3-Action': '1', 'Content-Type': 'application/json' },
        body: JSON.stringify({ noiDung: d.noiDung, phienBan: d.phienBan }) });
      assert.equal(g.status, 200);
      const sau = await (await fetch(goc + '/api/anh-san-pham/khoi-chung', { headers: { cookie: ck, 'X-V3-Action': '1' } })).json();
      assert.equal(sau.phienBan, 4);
      assert.deepEqual(sau.noiDung.faqs.map((x) => x.q), ['Có COD không?']);
    });
  } finally {
    if (server) await new Promise((r) => server.close(r));
    await sb.don();
  }
});
