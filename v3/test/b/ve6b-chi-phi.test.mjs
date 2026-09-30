// PHIẾU VE6b · «SỐ LIỆU › CHI PHÍ AI» THEO BẢN VẼ 3b — CHẠY THẬT script trang (vm + DOM giả). `/api/chi-phi` dựng bằng `manChiPhi`
// THẬT với cầu giả mang hồ sơ token đúng bản vẽ (3.053 · 8.390 · 167 mỗi lượt ⇒ trúng cache 73,3%). Luật cũ giữ: số chưa tính được
// hiện «—», không «0 đồng»; hai ô token/cache là TOÀN HỆ (nói ra); tab Từng tin theo VAI (cửa Vận hành chỉ quản trị · quản lý).
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const cp = await import('../../src/ui/chi-phi/kho-chi-phi.js');

const html = fs.readFileSync(new URL('../../src/ui/chi-phi/trang/chi-phi.html', import.meta.url), 'utf8');
const SCRIPT = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).find((x) => x.includes('window.UI'));

async function chiPhiThat(token = { soLuotDoThat: 650, tokenVao: 3053 * 650, tokenDocLai: 8390 * 650, tokenRa: 167 * 650 }) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false }],
    page: [{ id: 'p1', team_id: 't1', page_id: '111', ten: 'Page A', marketer: 'lan' }],
  });
  cp.datTaoTruyVan(taoTruyVan);
  cp.datDocChiPhiBot(async () => ({ nhaCungCap: 'kimi', soLuotTraLoi: 999, soDon: 20, tienVnd: 1145472, vndMoiTin: 127, vndMoiDon: 6698,
    tinMoiDon: 52.9, ...token,
    page: [{ pageId: '111', ten: 'Page A', soLuot: 100, soLuotDoThat: 100, soDon: 2, tienVnd: 12700, vndMoiTin: 127, vndMoiDon: 6350, tinMoiDon: 50 }] }));
  cp.datDocSoAi(null);
  return { ok: true, ...(await cp.manChiPhi(taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an@t.vn', teamId: 't1', vai: [VAI.QUAN_TRI] }))) };
}
const TIN = { ok: true, items: [
  { id: '1', luc: '2026-09-30T08:00:00Z', pageTen: 'Page A', psid: '9101', maModel: 'kimi-k2.6', tinKhach: 'rẻ', token: { vao: 100, ra: 10 }, vnd: 40, doThat: true },
  { id: '2', luc: '2026-09-30T08:05:00Z', pageTen: 'Page A', psid: '9102', maModel: 'kimi-k2.6', tinKhach: 'đắt', token: { vao: 900, ra: 90 }, vnd: 310, doThat: true },
  { id: '3', luc: '2026-09-30T08:10:00Z', pageTen: 'Page A', psid: null, maModel: 'kimi-k2.6', tinKhach: 'vừa', token: { vao: 400, ra: 40 }, vnd: 120, doThat: false }] };
const menu = (duong) => ({ ok: true, nhom: [{ ma: 'x', man: duong.map((d) => ({ duong: d })) }] });

async function chay(cua) {
  const o = {};
  const tab = ['tin', 'page', 'model'].map((t) => ({ dataset: { tab: t }, nghe: [], thuoc: {},
    addEventListener(_l, f) { this.nghe.push(f); }, setAttribute(k, v) { this.thuoc[k] = v; } }));
  const el = (s) => (o[s] ||= { innerHTML: '', textContent: '', dataset: {}, hidden: ['#t-tin', '#tab-tin', '#tab-model'].includes(s) });
  const document = { querySelector: el, querySelectorAll: (s) => (s === '#thanhTab [data-tab]' ? tab : []) };
  const goi = [];
  const UI = {
    esc: (s) => String(s ?? ''), text: (s) => String(s ?? ''), formatNumber: (n) => String(n), formatVnd: (n) => `${n} đ`,
    statusBadge: (_m, x = {}) => `<b>${x.label || ''}</b>`, alert: (x) => `<div class="alert">${x.title || ''} · ${x.body || ''}</div>`,
    emptyState: (x) => `<div class="empty">${x.title} · ${x.body || ''}</div>`, nguonSo: () => '',
    metricRow: (ds) => ds.map((m) => `[${m.label}: ${m.value} | ${m.hint || ''}]`).join(''),
  };
  const ctx = vm.createContext({ window: { UI }, document, console, URL, URLSearchParams, setTimeout,
    location: { pathname: '/chi-phi', href: 'http://x/chi-phi', search: '' }, history: { replaceState() {} },
    fetch: async (u) => { goi.push(String(u)); const tra = cua[String(u)];
      return tra ? { status: 200, ok: true, json: async () => tra } : { status: 503, ok: false, json: async () => ({ ok: false, thongDiep: 'cửa hỏng trong ca' }) }; } });
  vm.runInContext(SCRIPT, ctx);
  await new Promise((r) => setTimeout(r, 40));
  return { o, goi, tab };
}
const DU = async (vai = 'qt', o = {}) => ({ '/api/chi-phi': await chiPhiThat(o.token), '/api/van-hanh/chi-phi-tin': o.tin || TIN,
  '/api/dieu-huong': vai === 'qt' ? menu(['/chi-phi', '/van-hanh-v3', '/model-ai']) : menu(['/chi-phi']) });

test('C1 · bốn ô theo bản vẽ: mỗi đơn · mỗi tin (+ đích BH8) · token mỗi lượt TOÀN HỆ · trúng cache TOÀN HỆ = đọc lại ÷ (vào + đọc lại)', async () => {
  const { o } = await chay(await DU());
  const h = o['#dem'].innerHTML;
  assert.match(h, /\[Mỗi đơn ra được: /);
  assert.match(h, /\[Mỗi tin trả lời: [^|]+\| [^\]]*đích phiếu BH8: ≤ 50 đ\]/);
  assert.match(h, /\[Token mỗi lượt · toàn hệ: 3053 · 8390 · 167 \| vào · đọc lại cache · ra — trên lượt đo thật\]/);
  assert.match(h, /\[Trúng cache · toàn hệ: 73,3% \| đọc lại ÷ \(vào \+ đọc lại\)\]/);
});

test('C2 · cầu KHÔNG trả token ⇒ hai ô «—», không NaN / 0', async () => {
  const { o } = await chay(await DU('qt', { token: {} }));
  const h = o['#dem'].innerHTML;
  assert.match(h, /\[Token mỗi lượt · toàn hệ: — \|/);
  assert.match(h, /\[Trúng cache · toàn hệ: — \|/);
  assert.doesNotMatch(h, /NaN|undefined/);
});

test('C3 · tab Theo page mặc định: bảng + TỔNG tiền · lượt · đơn của team (không mất số của bản cũ) + chú thích cột thiếu nguồn', async () => {
  const { o } = await chay(await DU());
  assert.equal(o['#tab-page'].hidden, false);
  assert.match(o['#hSo'].innerHTML, /tổng 12700 đ · 100 lượt · 2 đơn/);
  assert.match(o['#bang'].innerHTML, /«Chặn bằng trả lời sẵn» theo page \(bản vẽ\): chưa có nguồn/);
});

test('C4 · tab Từng tin theo VAI: quản trị thấy, xếp ĐẮT NHẤT lên đầu trong lượt mới nhất, lối tìm hội thoại; marketer không thấy, KHÔNG gọi cửa', async () => {
  const qt = await chay(await DU('qt'));
  assert.equal(qt.o['#t-tin'].hidden, false);
  const tien = [...qt.o['#bangTin'].innerHTML.matchAll(/<td class="num manh">([^<]+)<\/td>/g)].map((m) => m[1]);
  assert.deepEqual(tien, ['310 đ', '120 đ', '40 đ']);
  assert.match(qt.o['#bangTin'].innerHTML, /href="\/ho-so-khach\?q=9102">Tìm hội thoại →/);
  assert.match(qt.o['#hTin'].textContent, /3 lượt mới nhất · xếp đắt nhất lên đầu/);
  const mk = await chay(await DU('mk'));
  assert.equal(mk.o['#t-tin'].hidden, true, 'marketer thấy tab Từng tin');
  assert.ok(!mk.goi.includes('/api/van-hanh/chi-phi-tin'), 'marketer vẫn gọi cửa Vận hành rồi ăn 403');
});

test('C5 · tab Theo model nói đúng cái đang có: nhà model · theo model «chưa có nguồn» · dự phòng «chưa chạy»; lối cấu hình theo vai', async () => {
  const qt = await chay(await DU('qt'));
  const m = qt.o['#theoModel'].innerHTML;
  assert.match(m, /kimi — toàn bộ tiền ở màn này đo tại tiến trình bot/);
  assert.match(m, /Lượt và tiền theo từng model[\s\S]*Chưa có nguồn/);
  assert.match(m, /Dự phòng khác nhà[\s\S]*Chưa chạy/);
  assert.match(m, /href="\/model-ai"/);
  const mk = await chay(await DU('mk'));
  assert.doesNotMatch(mk.o['#theoModel'].innerHTML, /href="\/model-ai"/, 'marketer được mời sang màn không vào được');
});

test('C6 · sổ v3 RỖNG ⇒ Từng tin nói vì sao — không hiện như «không tốn đồng nào»', async () => {
  const { o } = await chay(await DU('qt', { tin: { ok: true, items: [] } }));
  assert.match(o['#bangTin'].innerHTML, /Sổ chi phí của v3 chưa ghi lượt nào · Lượt được ghi ở đây khi bot v3 trả lời khách/);
  assert.doesNotMatch(o['#bangTin'].innerHTML, /0 đ/);
});
