// LL17b · «SỐ 0 CỦA ẢNH CHỤP CŨ» — Postgres thật (hộp cát). Prod 02/10: `don_hang` nạp một lần 28/08 ⇒ khoảng 7 ngày của
// `baoCaoHaiLuong` trả 0 · 0 và màn in «0 · 0» như số thật. Dòng mới nhất CỦA TEAM cũ hơn đầu khoảng ⇒ «chưa biết», không 0.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { dungSandbox } from '../db/sandbox.js';
import { baoCaoHaiLuong } from '../src/db/so-lieu.js';

let sb, ctxA, ctxB, tA, tB, pA, pB;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
const don = (team, page, nguon, luc) => q(
  `INSERT INTO don_hang (team_id,page_id,nguon,trang_thai_he,tong_tien,tao_luc) VALUES ($1,$2,$3,'cho_sale',100,${luc})`, [team, page, nguon]);

before(async () => {
  sb = await dungSandbox('ll17banh');
  tA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  tB = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
  const nguoi = async (email, team) => {
    const id = (await mot('INSERT INTO nguoi_dung (email,ten) VALUES ($1,$1) RETURNING id', [email])).id;
    await q("INSERT INTO thanh_vien_team (team_id,nguoi_dung_id,vai_id) SELECT $1,$2,v.id FROM vai v WHERE v.ma='quan-ly'", [team, id]);
    return id;
  };
  ctxA = { teamId: tA, nguoiDungId: await nguoi('ql-a@t.test', tA) };
  ctxB = { teamId: tB, nguoiDungId: await nguoi('ql-b@t.test', tB) };
  pA = (await mot("INSERT INTO page (team_id,page_id,ten,bot_ai_bat,marketer) VALUES ($1,'fb-a','A',true,'') RETURNING id", [tA])).id;
  pB = (await mot("INSERT INTO page (team_id,page_id,ten,bot_ai_bat,marketer) VALUES ($1,'fb-b','B',true,'') RETURNING id", [tB])).id;
});
after(async () => { await sb.don(); });

test('B1 · team có page, chưa đơn nào ⇒ câu cũ «không có dòng nào» (KHÔNG gọi là ảnh chụp)', async () => {
  const bc = await baoCaoHaiLuong(sb.pool, ctxA);
  assert.equal(bc.boiCanh.coDuLieu, false);
  assert.equal(bc.boiCanh.anhChupCu, undefined);
  assert.match(bc.boiCanh.viSaoRong, /1 page nhưng bảng `don_hang` không có dòng nào/);
});

test('B2 · dòng mới nhất CỦA TEAM cũ hơn đầu khoảng ⇒ «chưa biết», kèm ngày mới nhất — đơn mới của team KHÁC không cứu được', async () => {
  await don(tA, pA, 'messenger', "now() - interval '35 days'");
  await don(tA, pA, 'trang_ban_hang', "now() - interval '20 days'");
  await don(tB, pB, 'messenger', "now() - interval '1 day'");
  const bc = await baoCaoHaiLuong(sb.pool, ctxA);
  assert.deepEqual([bc.messenger.soDon, bc.trangBanHang.soDon], [0, 0]);
  assert.equal(bc.boiCanh.anhChupCu, true);
  const moi = (await mot("SELECT (now() - interval '20 days')::date::text AS d")).d;
  assert.equal(bc.boiCanh.moiNhat.toISOString().slice(0, 10) <= moi, true);
  assert.match(bc.boiCanh.viSaoRong, new RegExp(`dòng mới nhất của team trong bảng \`don_hang\` là ngày \\d{4}-\\d{2}-\\d{2} — trước đầu khoảng đo`));
  assert.match(bc.boiCanh.viSaoRong, /CHƯA BIẾT, không phải 0/);
  const b = await baoCaoHaiLuong(sb.pool, ctxB);
  assert.deepEqual([b.messenger.soDon, b.boiCanh.coDuLieu], [1, true], 'team B có đơn trong khoảng ⇒ số thật');
});

test('B3 · có MỘT đơn trong khoảng ⇒ số thật (1 · 0), không gắn cờ ảnh chụp', async () => {
  await don(tA, pA, 'messenger', "now() - interval '2 days'");
  const bc = await baoCaoHaiLuong(sb.pool, ctxA);
  assert.deepEqual([bc.messenger.soDon, bc.trangBanHang.soDon, bc.boiCanh.coDuLieu, bc.boiCanh.anhChupCu], [1, 0, true, undefined]);
});
