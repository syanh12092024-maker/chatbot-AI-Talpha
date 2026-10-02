// LL15c · TEAM TỰ NHẬN DIỆN — người quyết 02/10: «tự nhận diện theo team, không có màn chọn team, chọn team chỉ dành cho quản
// trị»; sale thuộc cả ba team ⇒ «team mặc định + nút đổi nhỏ». Máy chủ thật (vai-b + auth + khung vẽ sẵn) + CSDL giả; C7 chạy
// `dieu-huong.js` THẬT trong DOM giả: bấm chip ⇒ menu ⇒ bấm team ⇒ gọi cửa đổi team ⇒ đi tiếp.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import vm from 'node:vm';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { docVe } = await import('../../src/auth/ve.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay } = await import('../../src/auth/boi-canh.js');
const { taoDom } = await import('../../testkit/dom-gia.js');
const { doiTeamCua } = await import('../../src/ui/chung/khung.js');

async function dungThu() {
  const mk = await bam('matkhau1');
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Pialpha GCC', la_ky_thuat: false }, { id: 't2', slug: 'auus', ten: 'Pialpha AUUS', la_ky_thuat: false },
      { id: 't3', slug: 'pialpha-eu', ten: 'Pialpha EU', la_ky_thuat: false }, { id: 't0', slug: 'chua-phan', ten: 'Chưa phân', la_ky_thuat: true }],
    nguoi_dung: [{ id: 'u_sale', email: 'sale@x.vn', mat_khau_hash: mk, ten: 'Sale', hoat_dong: true },
      { id: 'u_qt', email: 'qt@x.vn', mat_khau_hash: mk, ten: 'Chủ', hoat_dong: true },
      { id: 'u_mk', email: 'mk@x.vn', mat_khau_hash: mk, ten: 'Marketer', hoat_dong: true }],
    vai: [{ id: 'v1', ma: 'quan-tri', ten: 'Quản trị' }, { id: 'v2', ma: 'marketer', ten: 'Marketer' }, { id: 'v3', ma: 'sale', ten: 'Sale' }],
    thanh_vien_team: [
      { id: 'a1', nguoi_dung_id: 'u_sale', team_id: 't1', vai_id: 'v3' }, { id: 'a2', nguoi_dung_id: 'u_sale', team_id: 't2', vai_id: 'v3' },
      { id: 'a3', nguoi_dung_id: 'u_sale', team_id: 't3', vai_id: 'v3' },
      { id: 'a0', nguoi_dung_id: 'u_sale', team_id: 't0', vai_id: 'v3' },   // dòng ở team KỸ THUẬT — không bao giờ được thành mặc định
      { id: 'b1', nguoi_dung_id: 'u_qt', team_id: 't1', vai_id: 'v1' }, { id: 'b2', nguoi_dung_id: 'u_qt', team_id: 't2', vai_id: 'v1' },
      { id: 'b3', nguoi_dung_id: 'u_qt', team_id: 't3', vai_id: 'v1' },
      { id: 'c1', nguoi_dung_id: 'u_mk', team_id: 't1', vai_id: 'v2' },
    ],
    page: [],
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const vao = async (email, cookie = '') => {
    const r = await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ email, matKhau: 'matkhau1' }) });
    const sc = r.headers.getSetCookie();
    return { status: r.status, than: await r.json(), ve: sc[0].split(';')[0], ds: sc.map((c) => c.split(';')[0]) };
  };
  const chonTeam = async (ve, teamId) => {
    const r = await fetch(`${goc}/api/chon-team`, { method: 'POST', headers: { 'Content-Type': 'application/json', cookie: ve }, body: JSON.stringify({ teamId }) });
    const sc = r.headers.getSetCookie();
    return { status: r.status, than: await r.json(), ve: sc.length ? sc[0].split(';')[0] : null, ds: sc.map((c) => c.split(';')[0]) };
  };
  const doc = async (duong, ve) => fetch(goc + duong, { headers: { cookie: ve, Accept: 'text/html' } });
  return { goc, sv, vao, chonTeam, doc };
}
const veCua = (cookie) => docVe(decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)));

test('C1 · SALE ba team (không quản trị): vào THẲNG team mặc định — vé đủ quyền, không màn chọn team, đi tới Hộp thư; gợi ý team được ghi', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const r = await o.vao('sale@x.vn');
  assert.equal(r.status, 200);
  assert.equal(r.than.canChonTeam, false);
  assert.equal(r.than.diTiep, '/ban-hoi-thoai');
  const ve = veCua(r.ve);
  assert.equal(ve.tam, undefined, 'phải là vé đủ quyền, không vé tạm');
  assert.deepEqual([ve.teamId, ve.vai], ['t2', ['sale']], 'chưa có gợi ý ⇒ team ĐẦU theo tên (Pialpha AUUS) — không bao giờ team kỹ thuật');
  assert.deepEqual(r.ds.slice(1), ['v3_team_cuoi=t2']);
  assert.deepEqual(r.than.dsTeam.map((x) => x.teamId).sort(), ['t1', 't2', 't3'], 'team kỹ thuật bị lọc');
  assert.equal((await o.doc('/api/toi', r.ve)).status, 200);
});

test('C2 · đổi team ⇒ lần đăng nhập sau vào đúng team ấy; gợi ý lệch (team không thuộc · team kỹ thuật · rác) ⇒ team đầu, không 403', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const r = await o.vao('sale@x.vn');
  const doi = await o.chonTeam(r.ve, 't1');
  assert.equal(doi.status, 200);
  assert.equal(veCua(doi.ve).teamId, 't1');
  assert.deepEqual(doi.ds.slice(1), ['v3_team_cuoi=t1']);
  const lai = await o.vao('sale@x.vn', 'v3_team_cuoi=t1');
  assert.deepEqual([lai.than.canChonTeam, veCua(lai.ve).teamId], [false, 't1'], 'nhớ team dùng lần trước');
  for (const goiY of ['t0', 't9', '%E0%A4%A']) {
    const x = await o.vao('sale@x.vn', `v3_team_cuoi=${goiY}`);
    assert.deepEqual([x.status, veCua(x.ve).teamId], [200, 't2'], `gợi ý «${goiY}» phải bị bỏ qua`);
  }
});

test('C3 · QUẢN TRỊ nhiều team vẫn qua màn chọn team (vé tạm) — kể cả khi có gợi ý team; MỘT team ⇒ vào thẳng, không ghi gợi ý', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const qt = await o.vao('qt@x.vn', 'v3_team_cuoi=t1');
  assert.deepEqual([qt.status, qt.than.canChonTeam, qt.than.diTiep], [200, true, '/chon-team']);
  assert.equal(veCua(qt.ve).tam, true);
  const mk = await o.vao('mk@x.vn');
  assert.deepEqual([mk.than.canChonTeam, veCua(mk.ve).teamId], [false, 't1']);
  assert.deepEqual(mk.ds.length, 1, 'một team thì không cần gợi ý');
});

test('C4 · `doiTeamCua` + `/api/dieu-huong`: sale ⇒ menu (team KHÁC, không team kỹ thuật) · quản trị ⇒ màn · một team ⇒ không đổi', async (t) => {
  assert.deepEqual(doiTeamCua([{ teamId: 't1', tenTeam: 'A', vai: ['sale'] }], 't1'), { cach: null, khac: [] });
  assert.deepEqual(doiTeamCua([{ teamId: 1, tenTeam: 'A', vai: ['sale'] }, { teamId: 2, tenTeam: 'B', vai: ['sale'] }], '1'),
    { cach: 'menu', khac: [{ teamId: '2', tenTeam: 'B' }] });
  assert.equal(doiTeamCua([{ teamId: 't1', tenTeam: 'A', vai: ['sale'] }, { teamId: 't2', tenTeam: 'B', vai: ['quan-tri'] }], 't1').cach, 'man');
  const o = await dungThu();
  t.after(() => o.sv.close());
  const dh = async (ve) => (await (await o.doc('/api/dieu-huong', ve)).json()).doiTeam;
  assert.deepEqual(await dh((await o.vao('sale@x.vn')).ve),
    { cach: 'menu', khac: [{ teamId: 't3', tenTeam: 'Pialpha EU' }, { teamId: 't1', tenTeam: 'Pialpha GCC' }] });
  const qt = await o.chonTeam((await o.vao('qt@x.vn')).ve, 't1');
  assert.equal((await dh(qt.ve)).cach, 'man');
  assert.deepEqual(await dh((await o.vao('mk@x.vn')).ve), { cach: null, khac: [] });
});

test('C5 · khung MÁY CHỦ vẽ sẵn: sale ⇒ chip mở menu + nút từng team, KHÔNG dẫn sang màn chọn team · quản trị ⇒ dẫn sang màn · một team ⇒ chip chỉ là chữ', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const khung = async (ve, duong) => { const h = await (await o.doc(duong, ve)).text(); return h.slice(h.indexOf('data-khung'), h.indexOf('</header>')); };
  const s = await khung((await o.vao('sale@x.vn')).ve, '/ban-hoi-thoai');
  assert.match(s, /<button type="button" class="kh-team" aria-haspopup="menu"[^>]*>Pialpha AUUS/);
  assert.deepEqual([...s.matchAll(/data-team-id="([^"]+)">([^<]+)</g)].map((m) => `${m[1]}=${m[2]}`), ['t3=Pialpha EU', 't1=Pialpha GCC']);
  assert.match(s, /data-mo-team>Đổi team</);
  assert.doesNotMatch(s, /\/chon-team/, 'sale không được dẫn sang màn chọn team');
  const q = await khung((await o.chonTeam((await o.vao('qt@x.vn')).ve, 't1')).ve, '/trang-chu');
  assert.match(q, /<a class="kh-team" href="\/chon-team"/);
  assert.match(q, /data-di="\/chon-team">Đổi team</);
  const m = await khung((await o.vao('mk@x.vn')).ve, '/trang-chu');
  assert.match(m, /<span class="kh-team" data-mot-team>Pialpha GCC<\/span>/);
  assert.doesNotMatch(m, /Đổi team|chon-team|data-team-id/);
});

/** Chạy `dieu-huong.js` THẬT trên khung máy chủ vẽ, trong DOM giả; fetch giả ghi lại lời gọi. */
async function chayDieuHuong(htmlKhung, traLoiChonTeam) {
  const { body, document } = taoDom(`${htmlKhung}<main></main>`);
  body.insertBefore = (x) => x; body.firstChild = null;
  const nghe = {};
  const goi = [];
  const loc = { pathname: '/ban-hoi-thoai', href: 'http://may.local/ban-hoi-thoai', di: null };
  const doc = { ...document, readyState: 'complete', head: { insertBefore() {}, appendChild() {} }, documentElement: null,
    querySelector: (s) => { try { return body.querySelector(s); } catch { return null; } },
    querySelectorAll: (s) => { try { return body.querySelectorAll(s); } catch { return []; } },
    addEventListener: (k, f) => { (nghe[k] ||= []).push(f); } };
  const ctx = vm.createContext({
    document: doc, console, URL, JSON, Promise, setTimeout, clearTimeout, setInterval: () => 0, MutationObserver: class { observe() {} },
    location: new Proxy(loc, { set(o, k, v) { if (k === 'href') o.di = v; else o[k] = v; return true; } }),
    fetch: async (duong, o = {}) => { goi.push({ duong, phuongThuc: o.method || 'GET', than: o.body ? JSON.parse(o.body) : null });
      const j = duong === '/api/chon-team' ? traLoiChonTeam : { ok: false };
      return { ok: !!j.ok, status: j.ok ? 200 : 403, json: async () => j }; },
  });
  ctx.window = ctx;
  vm.runInContext(fs.readFileSync(new URL('../../src/ui/chung/dieu-huong.js', import.meta.url), 'utf8'), ctx);
  const cho = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 5)); };
  await cho();
  return { $: (s) => body.querySelector(s), goi, loc, cho };
}

test('C7 · `dieu-huong.js` thật: bấm chip ⇒ menu mở · bấm team ⇒ POST /api/chon-team đúng team ⇒ đi tiếp · «Đổi team» trong menu tài khoản mở CÙNG menu · đổi hỏng ⇒ nói lý do', async (t) => {
  const o = await dungThu();
  t.after(() => o.sv.close());
  const h = await (await o.doc('/ban-hoi-thoai', (await o.vao('sale@x.vn')).ve)).text();
  const htmlKhung = h.slice(h.indexOf('<div class="kh" data-khung'), h.indexOf('</header>') + '</header></div>'.length);
  const d = await chayDieuHuong(htmlKhung, { ok: true, diTiep: '/ban-hoi-thoai' });
  assert.equal(d.$('.kh-team-hop').hidden, true);
  await d.$('button.kh-team').click();
  assert.equal(d.$('.kh-team-hop').hidden, false, 'bấm chip phải mở menu');
  assert.equal(d.$('button.kh-team').getAttribute('aria-expanded'), 'true');
  await d.$('button[data-team-id="t1"]').click(); await d.cho();
  assert.deepEqual(d.goi.filter((g) => g.duong === '/api/chon-team'), [{ duong: '/api/chon-team', phuongThuc: 'POST', than: { teamId: 't1' } }]);
  assert.equal(d.loc.di, '/ban-hoi-thoai', 'đổi xong phải đi tiếp tới màn của vai');

  const d2 = await chayDieuHuong(htmlKhung, { ok: false, thongDiep: 'Bạn không thuộc team này.' });
  await d2.$('.kh-tk-nut').click();
  await d2.$('[data-mo-team]').click();
  assert.equal(d2.$('.kh-team-hop').hidden, false, '«Đổi team» của sale mở menu nhỏ, không sang /chon-team');
  assert.equal(d2.loc.di, null);
  await d2.$('button[data-team-id="t3"]').click(); await d2.cho();
  assert.match(d2.$('.kh-team-loi').textContent, /Không đổi được team: Bạn không thuộc team này\./);
  assert.equal(d2.loc.di, null, 'đổi hỏng thì ở lại');
});
