// PHIẾU VE-VA1 · «TÊN CHƯA KHAI» — ba lỗi chỉ nổ ở nhánh THAO TÁC THẬT, bộ ca cấu trúc + lượt bò e2e đều không chạm tới.
// Tìm bằng quét `no-undef` (ESLint 8, cài tạm ở scratchpad — không thêm gói vào dự án) trên 35 script trang, 30/09:
//   ① `bao-cao.html` `tai()` dùng `T` không khai (từ 25/09, 89c847b) ⇒ MỌI lượt tải thành công rơi vào ô lỗi «Chưa lấy được số
//      từ tiến trình bot» — màn Số liệu › Tổng quan chưa từng hiện số trên prod kể từ đó.
//   ② `cau-hinh-team.html` `await nap()` sau khi TẠO NGƯỜI DÙNG (từ 15/09, 53289117) — `nap` là tên của hàm tự chạy, không lộ ra
//      ngoài ⇒ tạo xong thì hộp báo «nap is not defined», danh sách không tải lại.
//   ③ `cau-hinh-team.html` `chuyen()` dùng `tuKhoTam` khai trong `veGanPage()` (từ 17/09, c7eabe1b) ⇒ «Chuyển page đã chọn» /
//      «Kéo page đã chọn về» ném lỗi TRƯỚC khi gửi — chưa lượt chuyển nào qua được.
// Mỗi ca dưới đây chạy SCRIPT THẬT của trang (vm) trên DOM giả, tới đúng nhánh từng nổ.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { taoBoiCanh, VAI } = await import('../../src/auth/boi-canh.js');
const bcao = await import('../../src/ui/bao-cao/kho-bao-cao.js');

/** Khối script NỘI TUYẾN (không `src`) chứa `window.UI` của một trang. */
function scriptCua(tep) {
  const h = fs.readFileSync(new URL('../../src/ui/' + tep, import.meta.url), 'utf8');
  const m = [...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]).find((x) => x.includes('window.UI'));
  assert.ok(m, `không thấy script nội tuyến của ${tep}`);
  return m;
}

/* ═══ ① Số liệu › Tổng quan ═══ */
const SCRIPT = scriptCua('bao-cao/trang/bao-cao.html');

async function payloadThat() {
  const { taoTruyVan } = dungCongGia({
    team: [{ id: 't1', slug: 'a', ten: 'A', la_ky_thuat: false }],
    page: [{ id: 'p1', team_id: 't1', page_id: '111', ten: 'Page A', marketer: 'lan' }], don_hang: [],
  });
  bcao.datTaoTruyVan(taoTruyVan);
  bcao.datDocDon(async () => ({ bat: true, thieu: false, soPageQuetLoi: 0, quetLuc: '2026-09-29T10:00:00.000Z',
    page: [{ pageId: '111', hoiThoaiCoDon: 8, posQuyChoAi: 9, soCu: false }] }));
  bcao.datDocChiPhi(null);
  bcao.datDocHaiLuong(null);
  const kq = await bcao.manBaoCao(taoBoiCanh({ nguoiDungId: 'u1', tenDangNhap: 'an@t.vn', teamId: 't1', vai: [VAI.QUAN_TRI] }));
  assert.ok(kq.messenger, 'payload phải có luồng Messenger — không thì ca không chạm nhánh tải thành công');
  return { ok: true, ...kq };
}

/** Chạy script trang trong một ngữ cảnh riêng; trả các ô DOM đã bị ghi. */
async function chayTrang(tra) {
  const o = {};
  const document = { querySelector: (s) => (o[s] ||= { innerHTML: '', textContent: '', dataset: {}, hidden: false }) };
  const UI = {
    esc: (s) => String(s ?? ''), text: (s) => String(s ?? ''), formatNumber: (n) => String(n),
    statusBadge: (_m, x = {}) => `<b>${x.label || ''}</b>`, button: (t) => `<button>${t}</button>`,
    alert: (x) => `<div class="alert">${x.title} · ${x.body || ''} · ${(x.detail || []).join(' ')}</div>`,
    emptyState: (x) => `<div class="empty">${x.title}</div>`, nguonSo: () => '<div class="nguon"></div>',
    metricRow: (ds) => `<div class="metric-row">${ds.map((m) => `${m.label}: ${m.value}`).join(' | ')}</div>`,
  };
  // Theo ĐƯỜNG: `/api/bao-cao` trả payload của ca; cửa phụ (VE6a: chi phí · nguồn khách · điều hướng) trả lỗi — khối phụ phải tự nói
  // lỗi của nó, không kéo sập khối chính.
  const ctx = vm.createContext({ window: { UI }, document, location: { pathname: '/bao-cao', href: '' }, console,
    fetch: async (u) => (String(u) === '/api/bao-cao' ? { status: 200, ok: true, json: async () => tra }
      : { status: 503, ok: false, json: async () => ({ ok: false, thongDiep: 'cửa phụ không có trong ca' }) }) });
  vm.runInContext(SCRIPT, ctx);
  await new Promise((r) => setTimeout(r, 30));
  return o;
}

test('R1 · tải THÀNH CÔNG ⇒ màn vẽ ba thước, KHÔNG rơi vào ô lỗi «Không đọc được báo cáo»', async () => {
  const o = await chayTrang(await payloadThat());
  const bangTin = (o['#bang-tin'] || {}).innerHTML || '';
  assert.doesNotMatch(bangTin, /Không đọc được báo cáo/, `tải thành công mà màn báo lỗi: ${bangTin.slice(0, 200)}`);
  assert.match((o['#thuoc'] || {}).innerHTML || '', /\S/, 'ba thước không được vẽ');
});

test('R2 · máy chủ TRẢ LỖI ⇒ màn vẫn nói lỗi (ca đối chứng: thước không xanh vì màn câm)', async () => {
  const o = await chayTrang({ ok: false, thongDiep: 'cầu sang bot hỏng' });
  assert.match((o['#bang-tin'] || {}).innerHTML || '', /Không đọc được báo cáo[\s\S]*cầu sang bot hỏng/);
});

/* ═══ ②③ Cài đặt › Người và team ═══ */

/** DOM giả đủ cho script trang: phần tử tạo theo bộ chọn, ghi lại người nghe sự kiện; `querySelectorAll` theo bảng `chon`. */
function dungDom(chon = {}) {
  const phan = {};
  const tao = (sel) => ({
    sel, nghe: {}, innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, checked: false,
    dataset: {}, style: {}, options: [{ textContent: 'Team B', value: 't2' }], selectedIndex: 0,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener(l, f) { (this.nghe[l] ||= []).push(f); }, removeEventListener() {},
    showModal() {}, close() {}, focus() {}, blur() {}, setSelectionRange() {}, setAttribute() {}, getAttribute: () => null,
    removeAttribute() {}, toggleAttribute() {}, insertAdjacentHTML() {}, scrollIntoView() {}, closest: () => null,
    querySelector: (s) => lay(`${sel} ${s}`), querySelectorAll: () => [],
  });
  const lay = (s) => (phan[s] ||= tao(s));
  return { phan, lay, document: { querySelector: lay, querySelectorAll: (s) => chon[s] || [], getElementById: (id) => lay('#' + id),
    addEventListener() {}, body: tao('body') } };
}

async function chayTeam(chon = {}) {
  const dom = dungDom(chon);
  const goi = [];
  const UI = {
    esc: (s) => String(s ?? ''), text: (s) => String(s ?? ''), icon: () => '', formatNumber: (n) => String(n),
    statusBadge: (_m, x = {}) => `<b>${x.label || ''}</b>`, button: (t) => `<button>${t}</button>`, setBusy() {}, toast() {},
    alert: (x) => `<div class="alert">${x.title} · ${x.body || ''}</div>`, emptyState: (x) => `<div>${x.title}</div>`, metricRow: () => '',
    confirmDialog: async () => true,
  };
  const ctx = vm.createContext({ window: { UI }, document: dom.document, console, setTimeout, clearTimeout,
    location: { hash: '', pathname: '/cau-hinh-team', href: '' }, history: { replaceState() {} },
    fetch: async (url, o = {}) => { goi.push({ url: String(url), method: o.method || 'GET', body: o.body });
      return { status: 200, ok: true, json: async () => ({ ok: true, email: 'moi@t.vn', maVai: 'sale' }) }; } });
  vm.runInContext(scriptCua('team/trang/cau-hinh-team.html'), ctx);
  await new Promise((r) => setTimeout(r, 30));
  return { ctx, dom, goi };
}

test('T1 · ② tạo người dùng xong ⇒ KHÔNG báo «nap is not defined», và nạp lại các khối (danh sách mới)', async () => {
  const { dom, goi } = await chayTeam();
  dom.lay('#n-email').value = 'moi@t.vn'; dom.lay('#n-ten').value = 'Mới'; dom.lay('#n-mk').value = 'matkhau-dai-1'; dom.lay('#n-vai').value = 'sale';
  const luu = dom.lay('#n-luu').nghe.click;
  assert.ok(luu && luu.length, 'không thấy người nghe của nút lưu người dùng');
  const truoc = goi.length;
  await luu[0]();
  await new Promise((r) => setTimeout(r, 30));
  const loi = dom.lay('#n-loi').textContent;
  assert.doesNotMatch(loi, /is not defined/, `tạo xong mà hộp báo lỗi: ${loi}`);
  const sau = goi.slice(truoc);
  assert.ok(sau.some((c) => c.method === 'POST' && c.url === '/api/team/nguoi-dung'), 'không gửi yêu cầu tạo');
  assert.ok(sau.filter((c) => c.method === 'GET').length >= 1, 'tạo xong mà không nạp lại khối nào');
});

test('T2 · ③ «Chuyển page đã chọn» GỬI được, body mang `tuKhoTam` đúng nguồn đang xem (page của team ⇒ false)', async () => {
  const { ctx, goi, dom } = await chayTeam({ '#dsPage input:checked': [{ value: 'p9' }] });
  assert.equal(typeof ctx.chuyen, 'function', 'không thấy hàm chuyen');
  dom.lay('#teamDich').value = 't2';   // ô chọn team đích — trình duyệt thật trả giá trị của option đang chọn
  await ctx.chuyen();
  await new Promise((r) => setTimeout(r, 30));
  const gui = goi.find((c) => c.method === 'POST' && c.url === '/api/team/gan-page');
  const bangTin = Object.values(dom.phan).map((p) => p.innerHTML).join(' ');
  assert.ok(gui, `không gửi yêu cầu chuyển page — ${(bangTin.match(/[^<>]*is not defined[^<>]*/) || [''])[0]}`);
  const b = JSON.parse(gui.body);
  assert.deepEqual([b.pageIds, b.teamDichId, b.tuKhoTam, b.lyDo], [['p9'], 't2', false, 'chuyển sang Team B']);
});
