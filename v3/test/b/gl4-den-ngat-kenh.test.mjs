// PHIẾU GL4 ④6 — đèn `ngat_kenh` ở màn Sức khoẻ + nhánh «máy KHÔNG hỏng» của đèn «Máy chạy bot» + nhãn ở màn Page & Bot.
//
// ĐƯỜNG HTTP THẬT (Express + vé đăng nhập + `dungPhanB` + Postgres hộp cát), cùng khuôn `gl2-vong2-http`: đèn đọc `page` qua cổng
// truy vấn KẸP TEAM (`taoTruyVanThat`), nhịp hàng đợi qua `kho.js#nhipMayBot` thật → `nhip-may-bot.js#xetNhip` thật. Trạng thái
// ngắt dựng bằng chính các cột 034 (đó là đầu vào của đèn — worker ghi chúng, ca `gl4-ngat-page` đo phía ghi). Cách ly team (R2-N6):
// người CHỈ thuộc team X không thấy tên/id page team Y dù page đó cũng đang ngắt. Không gọi mạng ra ngoài.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungSandbox } = await import('../../../db/sandbox.js');
const { nhipMayBot, xepTin } = await import('../../../src/queue/kho.js');
const { baoDamHoiThoai } = await import('../../../src/chat/kho.js');
const { chuyenPageSangTeam, pageChuaPhan } = await import('../../../src/db/chuyen-team.js');
const { taoTruyVanThat } = await import('../../src/noi-day/cong-du-lieu-that.js');
const { taoCongDanhTinh } = await import('../../src/noi-day/cong-danh-tinh.js');
const { noiVanHanhV3 } = await import('../../src/noi-day/van-hanh-v3.js');
const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/index.js');
const nhip = await import('../../src/ui/chung/nhip-may-bot.js');

const LY_DO_VIEC = 'Gửi không rõ đã tới khách — đối chiếu ở Vận hành trước khi trả AI';
const ENV1 = { V3_PANCAKE_GUI: '1', PANCAKE_READONLY: '0', V3_RAP_PROMPT_BAT: '1', ANTHROPIC_API_KEY: 'fake-only', V3_TRAN_PAGE_BAT: '5' };
const MAT_KHAU = 'Gl4-den-mat-khau-chi-de-thu-123';
const PID = { A: '978000000001', B: '978000000002' };
const TEN = { A: 'GL4DEN PAGE A', B: 'GL4DEN PAGE B LẠ' };

const fetchCu = globalThis.fetch;
const giuEnv = {};
let sb; let pool; let server; let base; let X; let Y; const ID = {}; let cookieU1;
let goiLa = 0;

before(async () => {
  for (const k of ['V3_TRAN_PAGE_BAT', 'V3_BOT_KHOA', 'V3_BOT_GHI']) giuEnv[k] = process.env[k];
  process.env.V3_TRAN_PAGE_BAT = '5';
  delete process.env.V3_BOT_KHOA; delete process.env.V3_BOT_GHI;
  sb = await dungSandbox('gl4_den');
  pool = sb.pool;
  const mot = async (sql, a = []) => (await pool.query(sql, a)).rows[0];
  X = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
  Y = String((await mot('INSERT INTO team (slug, ten) VALUES ($1,$2) RETURNING id', ['gl4den-y', 'GL4DEN Y'])).id);
  const u1 = (await mot('INSERT INTO nguoi_dung (email, ten, mat_khau_hash) VALUES ($1,$1,$2) RETURNING id', ['u1@gl4den.vn', await bam(MAT_KHAU)])).id;
  await pool.query("INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) SELECT $1,$2,id FROM vai WHERE ma='quan-tri'", [X, u1]);
  for (const [k, team] of [['A', X], ['B', Y]]) {
    ID[k] = String((await mot('INSERT INTO page (team_id, page_id, ten, bot_ai_bat) VALUES ($1,$2,$3,true) RETURNING id', [team, PID[k], TEN[k]])).id);
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
    if (!String(u).startsWith(base)) { goiLa += 1; throw new Error(`ca GL4 đèn: lượt gọi mạng lạ ${u}`); }
    return fetchCu(u, o);
  };
  const r = await fetch(`${base}/api/dang-nhap`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'u1@gl4den.vn', matKhau: MAT_KHAU }),
  });
  assert.equal(r.status, 200, await r.text());
  cookieU1 = r.headers.get('set-cookie').split(';')[0];
  // Hàng đợi team X: 3 tin của page A chờ 10 phút, chưa tin nào xử xong ⇒ luật nhịp nói «máy đứng — khởi động lại».
  for (const k of ['k1', 'k2', 'k3']) {
    await baoDamHoiThoai(pool, { teamId: X, pageRowId: ID.A, psid: `gl4den-${k}` });
    const t = await xepTin(pool, { teamId: X, pageId: PID.A, psid: `gl4den-${k}`, convId: `c-${k}`, custId: `cu-${k}`, msgId: `m-${k}`, noiDung: 'how much?' });
    await pool.query("UPDATE tin_cho_xu_ly SET thoi_diem = now() - interval '10 minutes' WHERE id=$1", [t.id]);
  }
  // Việc: 2 mở «Gửi không rõ…» của team X (đếm) · 1 đã đóng · 1 lý do khác · 1 của team Y (KHÔNG đếm).
  const ht = async (team, pageRow, psid) => (await baoDamHoiThoai(pool, { teamId: team, pageRowId: pageRow, psid })).id;
  const viec = (team, h, lyDo, dong = false) => pool.query(
    `INSERT INTO viec_can_xu_ly (team_id, loai, hoi_thoai_id, ly_do_day, han_luc, dong_luc) VALUES ($1,'hoi_thoai',$2,$3, now() + interval '10 minutes', ${dong ? 'now()' : 'NULL'})`,
    [team, h, lyDo]);
  await viec(X, await ht(X, ID.A, 'gl4den-v1'), LY_DO_VIEC);
  await viec(X, await ht(X, ID.A, 'gl4den-v2'), LY_DO_VIEC);
  await viec(X, await ht(X, ID.A, 'gl4den-v3'), LY_DO_VIEC, true);
  await viec(X, await ht(X, ID.A, 'gl4den-v4'), 'Pancake không trả lịch sử — bot CHƯA trả lời, CHƯA gửi gì');
  await viec(Y, await ht(Y, ID.B, 'gl4den-v5'), LY_DO_VIEC);
});
after(async () => {
  globalThis.fetch = fetchCu;
  for (const [k, v] of Object.entries(giuEnv)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  if (server) await new Promise((ok) => server.close(ok));
  if (sb) await sb.don();
  assert.equal(goiLa, 0, 'ca không được gọi mạng ra ngoài');
});

const goi = async (duong) => {
  const r = await fetch(base + duong, { headers: { Cookie: cookieU1, 'X-V3-Action': '1' } });
  return { status: r.status, than: await r.text() };
};
/** HH:MM giờ VN tính ĐỘC LẬP với mã đo (VN không có giờ mùa hè: UTC+7 cố định). */
const gioVnTay = (d) => {
  const x = new Date(new Date(d).getTime() + 7 * 3600e3);
  return `${String(x.getUTCHours()).padStart(2, '0')}:${String(x.getUTCMinutes()).padStart(2, '0')}`;
};
const datNgat = (pid, { phut, vi, lyDo }) => pool.query(
  `UPDATE page SET ngat_den = now() + ($2::int * interval '1 minute'), ngat_vi = $3, ngat_ly_do = $4 WHERE page_id = $1 RETURNING ngat_den`,
  [pid, phut, vi, lyDo]);
async function bang() {
  nhip.xoaNhoNhip();
  const r = await goi('/api/suc-khoe');
  assert.equal(r.status, 200, r.than.slice(0, 300));
  return { than: r.than, d: JSON.parse(r.than) };
}
const lay = (d, ma) => d.den.find((x) => x.ma === ma);

test('GL4 D1 · page ngắt: đèn ngat_kenh ĐỎ có giờ VN + lý do + số tin giữ + số tin cần đối chiếu; team Y không lộ; đèn «Máy chạy bot» nói máy KHÔNG hỏng; màn Page & Bot có nhãn «Ngắt kênh tới HH:MM»', async () => {
  const denA = (await datNgat(PID.A, { phut: 20, vi: 'doc', lyDo: 'Pancake quá hạn — quá hạn 15000 ms chờ Pancake (đọc)' })).rows[0].ngat_den;
  await datNgat(PID.B, { phut: 25, vi: 'gui', lyDo: 'Pancake từ chối gửi (mã 105)' });
  const hhmm = gioVnTay(denA);
  const { than, d } = await bang();
  const nk = lay(d, 'ngat_kenh');
  console.log(`   [gl4] D1 đèn ngat_kenh: ${nk?.muc} · ${nk?.vi}`);
  assert.ok(nk, 'phải có đèn ngat_kenh');
  assert.equal(nk.muc, 'do');
  assert.ok(nk.vi.includes(TEN.A), 'kể tên page ngắt của team');
  assert.ok(nk.vi.includes(`ngắt đọc tới ${hhmm} (giờ VN)`), `giờ VN ${hhmm}: ${nk.vi}`);
  assert.match(nk.vi, /quá hạn 15000 ms/, 'có lý do');
  assert.match(nk.vi, /bot tự thử lại/);
  assert.match(nk.vi, /3 tin/, 'số tin đang giữ ở chờ (nhịp hàng đợi của team)');
  assert.match(nk.vi, /2 tin gửi lỗi cần đối chiếu/, 'số việc «Gửi không rõ…» MỞ của team');
  assert.match(nk.vi, /Vận hành/);
  assert.match(String(nk.diTiep?.duong), /^\/van-hanh-v3/);
  assert.ok(!than.includes(TEN.B) && !than.includes(PID.B), 'người team X KHÔNG thấy tên/id page team Y');
  const may = lay(d, 'may_chay_bot');
  console.log(`   [gl4] D1 đèn máy chạy bot: ${may.muc} · ${may.vi} · đi tiếp: ${may.diTiep?.chu}`);
  assert.equal(may.muc, 'vang', 'máy KHÔNG hỏng ⇒ không ĐỎ «máy đứng»');
  assert.match(may.vi, /máy KHÔNG hỏng/);
  assert.ok(may.vi.includes(TEN.A) && may.vi.includes(hhmm), 'nói page nào ngắt tới mấy giờ');
  assert.doesNotMatch(may.vi, /Nhờ người quản trị hệ thống khởi động lại/);
  assert.doesNotMatch(String(may.diTiep?.chu), /khởi động lại/, 'không dẫn người đi khởi động lại');
  const ds = await goi('/api/page-bot/danh-sach');
  assert.equal(ds.status, 200, ds.than.slice(0, 300));
  const a = JSON.parse(ds.than).page.find((p) => p.pageId === PID.A);
  assert.equal(a?.ngatKenh?.nhan, `Ngắt kênh tới ${hhmm}`, JSON.stringify(a));
  assert.ok(!ds.than.includes(TEN.B), 'màn Page & Bot không lộ page team Y');
});

test('GL4 D2 · CHO-QUA: không page nào ngắt ⇒ đèn ngat_kenh XANH, đèn «Máy chạy bot» về đúng luật nhịp (máy đứng ⇒ đỏ, dặn khởi động lại), không nhãn ngắt', async () => {
  await pool.query("UPDATE page SET ngat_ly_do = '', ngat_vi = '' WHERE page_id = ANY($1::text[])", [[PID.A, PID.B]]);
  const { d } = await bang();
  assert.equal(lay(d, 'ngat_kenh').muc, 'xanh', lay(d, 'ngat_kenh').vi);
  const may = lay(d, 'may_chay_bot');
  assert.equal(may.muc, 'do', `không ngắt mà tin chờ 10 phút ⇒ đèn nhịp ĐỎ như cũ: ${may.vi}`);
  assert.match(`${may.vi} ${may.diTiep?.chu}`, /khởi động lại/);
  const a = JSON.parse((await goi('/api/page-bot/danh-sach')).than).page.find((p) => p.pageId === PID.A);
  assert.equal(a.ngatKenh, undefined, 'không ngắt ⇒ không nhãn');
});

test('GL4 D4 · hết giờ ngắt mà CHƯA mở lại (máy chạy bot không chạy) ⇒ đèn ngat_kenh vẫn ĐỎ nói «đã tới giờ tự mở», đèn «Máy chạy bot» KHÔNG che «máy đứng»', async () => {
  await datNgat(PID.A, { phut: -5, vi: 'gui', lyDo: 'Pancake từ chối gửi (mã 105)' });
  const { d } = await bang();
  const nk = lay(d, 'ngat_kenh');
  assert.equal(nk.muc, 'do'); assert.match(nk.vi, /đã tới giờ tự mở/);
  const may = lay(d, 'may_chay_bot');
  assert.equal(may.muc, 'do', `hết hạn ngắt ⇒ không còn lý do «máy không hỏng»: ${may.vi}`);
  const a = JSON.parse((await goi('/api/page-bot/danh-sach')).than).page.find((p) => p.pageId === PID.A);
  assert.match(String(a?.ngatKenh?.nhan), /Quá giờ mở kênh .* chưa mở lại/, `màn Page & Bot không được nói «ngắt tới» giờ đã qua: ${JSON.stringify(a)}`);
  await pool.query("UPDATE page SET ngat_ly_do = '', ngat_vi = '' WHERE page_id=$1", [PID.A]);
});
