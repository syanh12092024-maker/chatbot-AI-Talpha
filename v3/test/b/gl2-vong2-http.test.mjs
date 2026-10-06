// PHIẾU GL2 · VÒNG 2 · N1 — hai phép đo ĐƯỜNG HTTP THẬT (Express + vé đăng nhập + `dungPhanB` + Postgres hộp cát).
//
// H1 — Nới ③ (tổng 07/10): bộ đọc cửa kiểm `noiVanHanhV3` nay mang thêm `teamId` + `ten` của MỌI page bật toàn hệ. Bộ đọc ấy
//      nuôi SÁU màn (Sức khoẻ · Trang chủ · Page & Bot · Lên chạy · Sẵn sàng · dải trạng thái; thêm trang Một page qua
//      `cuaKiemMotPage`). Phép đo: người CHỈ thuộc team X gọi đủ các API ấy ⇒ thân phản hồi KHÔNG chứa tên / id Facebook của
//      page team Y hay page team kỹ thuật — kể cả khi đang vượt trần (lúc đèn kể danh sách).
// K1 — «page bật ở team kỹ thuật "chưa phân" có màn nào tắt được không»: đo cửa công tắc DUY NHẤT (`POST /api/page-bot/:id/bot`),
//      màn Page & Bot, cửa chọn team, và đường vòng có sẵn (Cấu hình team › Gán page › nguồn «chưa phân» › kéo về › tắt).
// Không gọi mạng ra ngoài: `fetch` chỉ cho 127.0.0.1 của chính máy chủ ca. Env đặt trong tiến trình ca, không sửa `.env`.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungSandbox } = await import('../../../db/sandbox.js');
const { nhipMayBot } = await import('../../../src/queue/kho.js');
const { chuyenPageSangTeam, pageChuaPhan } = await import('../../../src/db/chuyen-team.js');
const { taoTruyVanThat } = await import('../../src/noi-day/cong-du-lieu-that.js');
const { taoCongDanhTinh } = await import('../../src/noi-day/cong-danh-tinh.js');
const { noiVanHanhV3 } = await import('../../src/noi-day/van-hanh-v3.js');
const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/index.js');

const ENV1 = { V3_PANCAKE_GUI: '1', PANCAKE_READONLY: '0', V3_RAP_PROMPT_BAT: '1', ANTHROPIC_API_KEY: 'fake-only', V3_TRAN_PAGE_BAT: '1' };
const MAT_KHAU = 'Gl2v2-mat-khau-chi-de-thu-123';
const PID = { A: '977000000001', B: '977000000002', K: '977000000003' };
const TEN = { A: 'GL2V2H PILOT A', B: 'GL2V2H LẠC B', K: 'GL2V2H KHO K' };
const TEN_Y = 'GL2V2H Y';

const fetchCu = globalThis.fetch;
const giuEnv = {};
let sb; let pool; let server; let base; let X; let Y; let K; const ID = {}; let cookieU1;
let goiLa = 0;

before(async () => {
  for (const k of ['V3_TRAN_PAGE_BAT', 'V3_BOT_KHOA', 'V3_BOT_GHI']) giuEnv[k] = process.env[k];
  process.env.V3_TRAN_PAGE_BAT = '1';           // màn Sức khoẻ đọc trần từ env tiến trình (như máy thật)
  delete process.env.V3_BOT_KHOA; delete process.env.V3_BOT_GHI;
  sb = await dungSandbox('gl2_v2_http');
  pool = sb.pool;
  const mot = async (sql, a = []) => (await pool.query(sql, a)).rows[0];
  X = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
  K = String((await mot('SELECT id FROM team WHERE la_ky_thuat = true ORDER BY id LIMIT 1')).id);
  Y = String((await mot('INSERT INTO team (slug, ten) VALUES ($1,$2) RETURNING id', ['gl2v2h-y', TEN_Y])).id);
  const u1 = (await mot('INSERT INTO nguoi_dung (email, ten, mat_khau_hash) VALUES ($1,$1,$2) RETURNING id', ['u1@gl2v2h.vn', await bam(MAT_KHAU)])).id;
  await pool.query("INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) SELECT $1,$2,id FROM vai WHERE ma='quan-tri'", [X, u1]);
  for (const [k, team] of [['A', X], ['B', Y], ['K', K]]) {
    ID[k] = String((await mot('INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,$3) RETURNING id', [team, PID[k], TEN[k]])).id);
    const sp = (await mot("INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,'SP') RETURNING id", [team, ID[k], `gl2v2h-${k}`])).id;
    await pool.query("INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,1,19900,'AED')", [team, sp]);
  }
  const app = express();
  dungPhanB(app, {
    express,
    taoTruyVan: (bc) => taoTruyVanThat(pool, bc),
    taoTruyVanHeThong: () => taoCongDanhTinh(pool),
    docSanSang: noiVanHanhV3(pool, ENV1, { docLegacy: async () => ({ pages: [] }) }),
    docNhipMayBot: (bc) => nhipMayBot(pool, { teamId: bc?.teamId ?? null }),
    docKhoTamPage: (t) => pageChuaPhan(pool, t),
    chuyenPage: (bc, t) => chuyenPageSangTeam(pool, { teamId: bc.teamId, nguoiDungId: bc.nguoiDungId }, t),
  });
  server = await new Promise((ok) => { const s = app.listen(0, '127.0.0.1', () => ok(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
  globalThis.fetch = async (u, o) => {
    if (!String(u).startsWith(base)) { goiLa += 1; throw new Error(`ca GL2 v2: lượt gọi mạng lạ ${u}`); }
    return fetchCu(u, o);
  };
  const r = await fetch(`${base}/api/dang-nhap`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'u1@gl2v2h.vn', matKhau: MAT_KHAU }),
  });
  assert.equal(r.status, 200, await r.text());
  cookieU1 = r.headers.get('set-cookie').split(';')[0];
});
after(async () => {
  globalThis.fetch = fetchCu;
  for (const [k, v] of Object.entries(giuEnv)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  if (server) await new Promise((ok) => server.close(ok));
  if (sb) await sb.don();
  assert.equal(goiLa, 0, 'ca không được gọi mạng ra ngoài');
});

const datCot = async (...dsBat) => pool.query('UPDATE page SET bot_ai_bat = (page_id = ANY($1::text[]))', [dsBat.map((k) => PID[k])]);
const goi = async (duong, { method = 'GET', body } = {}) => {
  const r = await fetch(base + duong, {
    method,
    headers: { Cookie: cookieU1, 'Content-Type': 'application/json', 'X-V3-Action': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, than: await r.text() };
};

test('GL2 H1 · người CHỈ thuộc team X gọi mọi API dùng bộ đọc cửa kiểm (cả lúc VƯỢT trần) ⇒ thân phản hồi KHÔNG chứa tên/id page team Y hay team kỹ thuật', async () => {
  for (const bat of [['A', 'B', 'K'], ['A', 'B'], ['B']]) {
    await datCot(...bat);
    const API = [
      ['/api/suc-khoe', 200], ['/api/trang-chu', 200], ['/api/page-bot/danh-sach', 200], ['/api/len-chay', 200],
      [`/api/len-chay/${PID.A}`, 200], [`/api/len-chay/${PID.B}`, 404], [`/api/len-chay/${PID.K}`, 404],
      ['/api/san-sang', 200], ['/api/trang-thai-bot', 200], ['/api/page-ds', 200],
      [`/api/page/${ID.A}`, 200], [`/api/page/${ID.B}`, 404], [`/api/page/${ID.K}`, 404],
    ];
    for (const [duong, ma] of API) {
      const { status, than } = await goi(duong);
      assert.equal(status, ma, `${duong} (bật ${bat}) ⇒ ${status}: ${than.slice(0, 300)}`);
      // Page team kỹ thuật ở màn Sức khoẻ: CỐ Ý hiện tên + id cho quản trị (vai kéo được, đúng thứ họ thấy ở kho «chưa phân») — ca
      // N1c (`gl2-vong2-den`) đo cả hai vai. Mọi API khác và mọi page team Y: không được có.
      for (const k of (duong === '/api/suc-khoe' ? ['B'] : ['B', 'K'])) {
        assert.ok(!than.includes(TEN[k]), `${duong} (bật ${bat}) LỘ TÊN page ${k} của team người xem không thuộc`);
        // id nằm sẵn trong ĐƯỜNG DẪN người gọi gõ thì câu 404 nhắc lại nó («Không có page <id> trong team này») — không phải lộ.
        if (!duong.includes(PID[k])) assert.ok(!than.includes(PID[k]), `${duong} (bật ${bat}) LỘ ID page ${k} của team người xem không thuộc`);
      }
    }
  }
  // CHO-QUA: lúc vượt, đèn THẬT SỰ đọc được toàn hệ qua đường HTTP — có page của mình, có TÊN team kia, có số.
  await datCot('A', 'B');
  const { than } = await goi('/api/suc-khoe');
  const d = JSON.parse(than).den.find((x) => x.ma === 'bot_bat');
  assert.equal(d.muc, 'do', d.vi);
  assert.ok(d.vi.includes(TEN.A) && d.vi.includes(TEN_Y), `đèn phải kể page A + tên team Y: ${d.vi}`);
  assert.match(d.vi, /toàn hệ đang bật 2\/1 page/);
});

test('GL2 K1 · page bật ở team KỸ THUẬT: không màn nào tắt thẳng được (công tắc 404 · Page & Bot không thấy · không chọn được team) — đường xử: Cấu hình team › Gán page › «chưa phân» › kéo về › tắt', async () => {
  await datCot('K');
  const cot = async () => (await pool.query('SELECT team_id::text t, bot_ai_bat b FROM page WHERE id=$1', [ID.K])).rows[0];
  // ① cửa công tắc DUY NHẤT (cong-tac.js → noiVanHanhV3 → setPage, đều kẹp team) — page team kỹ thuật ⇒ 404, cột không đổi
  const tat = await goi(`/api/page-bot/${ID.K}/bot`, { method: 'POST', body: { bat: false } });
  assert.equal(tat.status, 404, tat.than);
  assert.deepEqual(await cot(), { t: K, b: true });
  // ② màn Page & Bot của team X không có page ấy; ③ không chọn được team kỹ thuật làm team đang đứng
  assert.ok(!(await goi('/api/page-bot/danh-sach')).than.includes(PID.K));
  const chon = await goi('/api/chon-team', { method: 'POST', body: { teamId: K } });
  assert.equal(chon.status, 403, chon.than);
  // ④ đường vòng có sẵn: Cấu hình team › Gán page › nguồn «chưa phân» thấy page (cờ bot đang bật) → kéo về team X → tắt ở Page & Bot
  const kho = JSON.parse((await goi('/api/team/gan-page?nguon=chua-phan')).than);
  const dong = (kho.page || []).find((p) => p.pageId === PID.K);
  assert.equal(dong?.botAiBat, true, `kho «chưa phân» phải thấy page đang bật: ${JSON.stringify(dong)}`);
  // đèn đưa id cho quản trị để gõ vào ô lọc (kho cắt 200 dòng): lọc theo id phải ra đúng page ấy
  const loc = JSON.parse((await goi(`/api/team/gan-page?nguon=chua-phan&tim=${PID.K}`)).than);
  assert.deepEqual((loc.page || []).map((p) => p.pageId), [PID.K], JSON.stringify(loc.page));
  const keo = JSON.parse((await goi('/api/team/gan-page', { method: 'POST', body: { pageIds: [ID.K], teamDichId: X, tuKhoTam: true, lyDo: 'ca GL2 K1' } })).than);
  assert.equal(keo.soXong, 1, JSON.stringify(keo));
  assert.deepEqual(await cot(), { t: X, b: true }, 'kéo về KHÔNG tự tắt bot — vẫn phải tắt ở Page & Bot');
  const tat2 = await goi(`/api/page-bot/${ID.K}/bot`, { method: 'POST', body: { bat: false } });
  assert.equal(tat2.status, 200, tat2.than);
  assert.deepEqual(await cot(), { t: X, b: false });
  console.log(`[gl2] K1 đo team kỹ thuật: công tắc=${tat.status} · chọn team=${chon.status} · kho «chưa phân» thấy bật=${dong.botAiBat} · kéo về soXong=${keo.soXong} · tắt sau kéo=${tat2.status}`);
});
