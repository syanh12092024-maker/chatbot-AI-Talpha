// PHIẾU VE6c · «SỐ LIỆU › KHÁCH» THEO BẢN VẼ 3c — CHẠY THẬT script trang `nguon-khach.html` (vm + DOM giả) với payload `manNguon` THẬT.
// Canh: phân bố hội thoại CỦA TEAM (nhãn chữ Hộp thư, tô theo người giữ, tuổi dữ liệu) — chưa có thì lùi về khối TOÀN HỆ và nói vì
// sao · rủi ro hoàn theo VAI (marketer không gọi cửa) + lối «Tra một khách» theo vai · hai khối «rơi ở đâu» không tỉ lệ rơi, 37,4% luôn
// kèm «số cũ». Hành vi hàm gom trên Postgres thật: `test/ve6c-phan-bo-hoi-thoai.test.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const nk = await import('../../src/ui/nguon-khach/kho-nguon.js');

const html = fs.readFileSync(new URL('../../src/ui/nguon-khach/trang/nguon-khach.html', import.meta.url), 'utf8');
const SCRIPT = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).find((x) => x.includes('window.UI'));

async function nguonThat({ phanBo = 'co' } = {}) {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false }],
    don_hang: [{ id: 'a', team_id: 't1', nguon: 'messenger', tong_tien: 100 }, { id: 'b', team_id: 't1', nguon: 'trang_ban_hang', tong_tien: 90 },
               { id: 'c', team_id: 't1', nguon: 'trang_ban_hang', tong_tien: 90 }],
  });
  nk.datTaoTruyVan(taoTruyVan);
  nk.datDocPheu(async () => ({ tong: 15, theoBac: { GREET: 10, QUALIFY: 4, SELLING: 1 }, theoChuSoHuu: { AI: 5, SALE: 2 }, bac: [] }));
  nk.datDocPhanBoHoiThoai(phanBo === 'co'
    ? async () => ({ tong: 100, theoCap: [{ bac: 'GREET', chu: 'BOTCAKE', so: 70 }, { bac: 'QUALIFY', chu: 'AI', so: 20 }, { bac: 'HANDOFF', chu: 'SALE', so: 10 }],
      tuoi: { chamMoiNhat: Date.parse('2026-09-28T10:00:00Z') } })
    : phanBo === 'hong' ? async () => { throw new Error('CSDL bận'); } : null);
  return { ok: true, ...(await nk.manNguon(taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an@t.vn', teamId: 't1', vai: [VAI.QUAN_TRI] }))) };
}
const RUI_RO = { ok: true, tuoi: { chamLuc: '2026-08-28T03:00:00.000Z' },
  theoTang: [{ ma: 'chua_du_don', soKhach: 50 }, { ma: 'tot', soKhach: 20 }, { ma: 'binh_thuong', soKhach: 3 }, { ma: 'canh_bao', soKhach: 5 }, { ma: 'rui_ro_cao', soKhach: 11 }] };
const menu = (duong) => ({ ok: true, nhom: [{ ma: 'x', man: duong.map((d) => ({ duong: d })) }] });

async function chay(cua) {
  const o = { '#khoiRuiRo': { innerHTML: '', textContent: '', dataset: {}, hidden: true } };
  const el = (s) => (o[s] ||= { innerHTML: '', textContent: '', dataset: {}, hidden: false,
    insertAdjacentHTML(_v, h) { this.innerHTML = h + this.innerHTML; } });
  const goi = [];
  const UI = {
    esc: (s) => String(s ?? ''), text: (s) => String(s ?? ''), formatNumber: (n) => String(n),
    statusBadge: (_m, x = {}) => `<b>${x.label || ''}</b>`, alert: (x) => `<div class="alert">${x.title || ''} · ${x.body || ''}</div>`,
    emptyState: (x) => `<div class="empty">${x.title}</div>`,
  };
  const ctx = vm.createContext({ window: { UI }, document: { querySelector: el }, console, location: { pathname: '/nguon-khach', href: '' },
    fetch: async (u) => { goi.push(String(u)); const tra = cua[String(u)];
      return tra ? { status: 200, ok: true, json: async () => tra } : { status: 503, ok: false, json: async () => ({ ok: false, thongDiep: 'cửa hỏng trong ca' }) }; } });
  vm.runInContext(SCRIPT, ctx);
  await new Promise((r) => setTimeout(r, 40));
  return { o, goi };
}
const DU = async (vai = 'qt', o = {}) => ({ '/api/nguon-khach': await nguonThat(o), '/api/rui-ro-hoan': RUI_RO,
  '/api/dieu-huong': vai === 'qt' ? menu(['/nguon-khach', '/rui-ro-hoan', '/ho-so-khach']) : menu(['/nguon-khach']) });

test('K1 · phân bố hội thoại CỦA TEAM: nhãn chữ Hộp thư, tô theo người giữ, tuổi dữ liệu, % của cặp lớn nhất; không tỉ lệ rơi', async () => {
  const { o } = await chay(await DU());
  const p = o['#pheu'].innerHTML;
  const thanh = [...p.matchAll(/<div class="bar-row" data-chu="([A-Z]+)">\s*<span class="bar-name">([^<]+)<\/span>[\s\S]*?<span class="bar-value">([^<]+)<\/span>/g)]
    .map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(thanh, [['BOTCAKE', 'Chào · Botcake giữ', '70'], ['AI', 'Tìm hiểu nhu cầu · bot AI', '20'], ['SALE', 'Chờ người · sale', '10']]);
  assert.match(o['#hPheu'].textContent, /^100 hội thoại của team · dữ liệu tới [0-9/]+ · ảnh chụp chỗ đứng hiện tại$/);
  assert.match(p, /70% đang ở «Chào · Botcake giữ»\./);
  assert.match(o['#ghi-chu-anh-chup'].innerHTML, /ảnh chụp/i, 'phải nói đây là ẢNH CHỤP (một lần, đầu trang)');
  assert.doesNotMatch(p.replace(/70% đang ở/, ''), /\d%/, 'phân bố mọc tỉ lệ rơi');
  assert.doesNotMatch(p, /toàn hệ/, 'đang có số theo team mà vẫn vẽ khối toàn hệ');
});

test('K2 · phép gom theo team HỎNG ⇒ lùi về khối TOÀN HỆ của tiến trình bot và nói vì sao (không trắng, không 0)', async () => {
  const { o } = await chay(await DU('qt', { phanBo: 'hong' }));
  assert.match(o['#pheu'].innerHTML, /Chưa gom được hội thoại theo team: CSDL bận[\s\S]*Đang hiện số toàn hệ của sổ hội thoại cũ/);
  assert.match(o['#hPheu'].textContent, /toàn hệ, không cắt theo team/);
});

test('K3 · rủi ro hoàn theo VAI: quản trị thấy bốn tầng + «Xem đủ →» + «Tra một khách cụ thể →»; marketer không gọi cửa, không thấy khối', async () => {
  const qt = await chay(await DU('qt'));
  assert.equal(qt.o['#khoiRuiRo'].hidden, false);
  assert.deepEqual([...qt.o['#ruiRo'].innerHTML.matchAll(/<span class="pheu-so">([^<]+)<\/span>/g)].map((m) => m[1]), ['11', '5', '23', '50']);
  assert.match(qt.o['#ruiRo'].innerHTML, /href="\/rui-ro-hoan">Xem đủ →<\/a> · <a class="lien-ke" href="\/ho-so-khach">Tra một khách cụ thể →/);
  const mk = await chay(await DU('mk'));
  assert.equal(mk.o['#khoiRuiRo'].hidden, true);
  assert.ok(!mk.goi.includes('/api/rui-ro-hoan'), 'marketer vẫn gọi cửa rủi ro rồi ăn 403');
});

test('K4 · hai khối «rơi ở đâu»: Messenger bốn chặng «chưa có nguồn»; trang: BUY NOW = số đơn, WhatsApp «chưa chạy · 37,4% là số cũ»; KHÔNG tỉ lệ rơi', async () => {
  const { o } = await chay(await DU());
  const chang = (h) => [...h.matchAll(/<span class="pheu-ten">([^<]+)<\/span>\s*<span class="pheu-so">([^<]+)<\/span><span class="pheu-ghi">([^<]*)<\/span>/g)]
    .map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(chang(o['#roiMess'].innerHTML).map((x) => x[1]), ['—', '—', '—', '—']);
  const trang = chang(o['#roiTrang'].innerHTML);
  assert.deepEqual(trang.map((x) => x.slice(0, 2)), [['Bấm BUY NOW', '2'], ['Gửi WhatsApp', '—'], ['Xác nhận', '—'], ['Chờ in', '—']]);
  assert.equal(trang[1][2], 'luồng gửi WhatsApp chưa chạy · 37,4% là số cũ');
  // «37,4% là số cũ» là NHÃN của số tài liệu, không phải số đo ⇒ bỏ nó ra rồi cấm mọi phần trăm (tỉ lệ rơi) còn lại.
  assert.doesNotMatch((o['#roiMess'].innerHTML + o['#roiTrang'].innerHTML).replace('37,4% là số cũ', ''), /\d%/, 'mọc tỉ lệ rơi');
});

test('K5 · lối «Tra một khách cụ thể» theo ĐÚNG menu: vai xem được rủi ro hoàn mà KHÔNG mở được Tìm khách ⇒ không mời sang màn 403', async () => {
  // Đảo-vá M6 (VE6c): hôm nay chưa vai nào như vậy nên nhánh này không ca nào chạm — dựng menu đúng hình dạng đó.
  const cua = await DU('qt');
  cua['/api/dieu-huong'] = menu(['/nguon-khach', '/rui-ro-hoan']);
  const { o } = await chay(cua);
  assert.equal(o['#khoiRuiRo'].hidden, false);
  assert.match(o['#ruiRo'].innerHTML, /href="\/rui-ro-hoan">Xem đủ →/);
  assert.doesNotMatch(o['#ruiRo'].innerHTML, /\/ho-so-khach/, 'mời sang Tìm khách khi menu không có màn đó');
});
