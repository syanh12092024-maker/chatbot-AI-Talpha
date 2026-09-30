// PHIẾU VE2b · «PAGE» GỘP NỐT KỊCH BẢN + DANH SÁCH VÀO THẲNG (người quyết 30/09, hai ảnh /page/:id và /page-bot):
//   «/page-bot và /kichban cũng cho vào màn này theo từng page … vào màn page sẽ có bộ lọc như page-bot» ·
//   «màn tất cả page bỏ phần khoanh đỏ … vào danh sách page luôn. ấn vào chi tiết chuyển sang id tương ứng. có phần trở
//   lại. K còn màn kichban nữa vì cài vào page rồi». Bản vẽ (BanDo): kich-ban → «Page › tab Lời bot + Lịch sử» GỘP.
// Canh: ① cột trái màn page lọc bằng ĐÚNG bộ lọc của «Tất cả page» (cùng hàm, cùng số — so từng mã lọc qua HTTP thật) ·
// ② `/page` trần và `/kich-ban` chuyển theo VAI, không ai rơi vào 403 · ③ thanh tab «Tất cả page | Kịch bản» biến mất,
// marketer (không mở được danh sách) vẫn có lối vào mục Page · ④ script THẬT của hai màn chạy trong vm, gọi sang máy chủ
// THẬT (vai-b + CSDL giả): lọc, lối trở lại, nhập file Pancake, chạy lại bản cũ — bấm đúng nút mà người dùng bấm.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');
// Cửa ghi sang tiến trình bot ĐÓNG chắc chắn (vắng biến có thể mở ở máy có ADMIN_USER mà không PANCAKE_READONLY) — ca P1
// đo đúng cảnh «công tắc bot đang khoá».
process.env.V3_BOT_KHOA = '1';

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay, VAI } = await import('../../src/auth/boi-canh.js');
const mh = await import('../../src/ui/chung/man-hinh.js');
const khung = await import('../../src/ui/chung/khung.js');
const { giaiMa, moTrang } = await import('../../testkit/dom-gia.js');

const DOC = (p) => fs.readFileSync(new URL(`../../src/ui/${p}`, import.meta.url), 'utf8');

/* ── MÁY CHỦ THẬT trên CSDL giả ─────────────────────────────────────────────────────────────────────────────────── */
// Ba page của team t1 (một page team khác để canh rò): p1 có lời bot ĐANG CHẠY + bot thấy + không chặn (nhắc «kịch bản
// mỏng» — việc cửa kiểm chỉ sang màn Kịch bản đã gộp); p2 chỉ có
// bản NHÁP (⇒ «chưa có lời bot riêng») + bot thấy nhưng còn chặn; p4 bot KHÔNG thấy (⇒ còn chặn), không kịch bản.
const CUA_KIEM = { pages: [
  { pageId: 'fb-1', aiEnabled: true, blockers: [], warnings: [{ code: 'THIN_SCRIPT' }] },
  { pageId: 'fb-2', aiEnabled: false, blockers: [{ code: 'MISSING_PRODUCT' }], warnings: [] },
] };
async function dungThu({ hongKichBan = false } = {}) {
  const mk = await bam('matkhau1');
  const { kho, taoTruyVan: goc } = dungCongGia({
    nguoi_dung: ['qt', 'mkt', 'sale', 'ql', 'dkb'].map((x, i) => ({ id: `u${i + 1}`, email: `${x}@talpha.vn`, mat_khau_hash: mk, ten: x, hoat_dong: true })),
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }, { id: 't2', slug: 'auus', ten: 'Auus', la_ky_thuat: false }],
    vai: [{ id: 'v1', ma: 'quan-tri' }, { id: 'v2', ma: 'marketer' }, { id: 'v3', ma: 'sale' }, { id: 'v4', ma: 'quan-ly' }, { id: 'v5', ma: 'duyet-kich-ban' }],
    thanh_vien_team: ['v1', 'v2', 'v3', 'v4', 'v5'].map((v, i) => ({ id: `tv${i + 1}`, nguoi_dung_id: `u${i + 1}`, team_id: 't1', vai_id: v })),
    page: [
      { id: 'p1', team_id: 't1', page_id: 'fb-1', ten: 'Zahra Oman', thi_truong: 'Oman', marketer: 'lan', bot_ai_bat: false, trong_diem: true },
      { id: 'p2', team_id: 't1', page_id: 'fb-2', ten: 'Aloe KSA', thi_truong: '', nganh_hang: 'my-pham', bot_ai_bat: true },
      { id: 'p4', team_id: 't1', page_id: 'fb-4', ten: 'Beta UAE', thi_truong: 'UAE', bot_ai_bat: false, mat_dau: true },
      { id: 'p3', team_id: 't2', page_id: 'fb-3', ten: 'Page team khác', thi_truong: 'EU', bot_ai_bat: true },
    ],
    kich_ban: [
      { id: 'k1', team_id: 't1', page_id: 'p1', phien_ban: 1, trang_thai: 'ARCHIVED', noi_dung_nguoi: { tone: 'giọng CŨ', greeting: 'chào CŨ', salesPrompt: 'bán CŨ' }, noi_dung_may: 'M1', nguoi_sua: 'an', sua_luc: '2026-09-20T08:00:00Z' },
      { id: 'k2', team_id: 't1', page_id: 'p1', phien_ban: 2, trang_thai: 'LIVE', noi_dung_nguoi: { tone: 'giọng MỚI', greeting: 'chào MỚI', salesPrompt: 'bán MỚI' }, noi_dung_may: 'M2', nguoi_sua: 'an', sua_luc: '2026-09-25T08:00:00Z' },
      { id: 'k3', team_id: 't1', page_id: 'p2', phien_ban: 1, trang_thai: 'DRAFT', noi_dung_nguoi: { tone: 'nháp' }, noi_dung_may: 'M3', nguoi_sua: 'an', sua_luc: '2026-09-26T08:00:00Z' },
      { id: 'k9', team_id: 't2', page_id: 'p3', phien_ban: 1, trang_thai: 'LIVE', noi_dung_nguoi: { tone: 'x' }, noi_dung_may: 'M9' },
    ],
  });
  // `hongKichBan`: bảng kịch bản đọc hỏng (CSDL chưa áp migration, mất kết nối giữa chừng) — CHỈ bảng đó.
  const taoTruyVan = (bc) => {
    const q = goc(bc);
    if (!hongKichBan) return q;
    return new Proxy(q, { get: (o, k) => (k === 'chon'
      ? (bang, ...a) => (bang === 'kich_ban' ? Promise.reject(new Error('relation "kich_ban" does not exist')) : o.chon(bang, ...a))
      : o[k]) });
  };
  const daDay = [];
  const app = express();
  dungPhanB(app, {
    taoTruyVan, taoTruyVanHeThong: () => goc(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express,
    docSanSang: async () => CUA_KIEM,
    // Bộ đọc khối nội dung (cùng bộ đường ráp prompt dùng) — trang một page chỉ vẽ tab Lời bot/Lịch sử khi đã nối nó.
    docKhoi: { boLuat: async () => null, kyNang: async () => [], sanPham: async () => [], kichBan: async () => null },
    dungBanMay: (cfg) => `MÁY: ${JSON.stringify(cfg)}`,
    dayKichBanLenBot: async (pageId, cfg) => { daDay.push({ pageId, cfg }); return { ok: true }; },
    bocPancake: async () => ({ tone: 'giọng từ Pancake', greeting: 'chào từ Pancake', salesPrompt: 'bán từ Pancake', stats: { topics: 3, images: 2 } }),
  });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const goc2 = `http://127.0.0.1:${sv.address().port}`;
  const vao = async (ten) => {
    const dn = await fetch(`${goc2}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `${ten}@talpha.vn`, matKhau: 'matkhau1' }) });
    return dn.headers.get('set-cookie').split(';')[0];
  };
  return { goc: goc2, sv, vao, kho, daDay };
}
const idCua = (ds) => ds.map((p) => p.id).sort();
const hrefCua = (a) => giaiMa(a.getAttribute('href'));

/* ── ① MỘT BỘ LỌC, HAI MÀN ──────────────────────────────────────────────────────────────────────────────────────── */
test('G1 · cột trái lọc bằng ĐÚNG bộ lọc «Tất cả page»: mọi mã lọc cùng tập page, cùng số đếm — kể cả «Chưa có lời bot riêng»', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const c = { headers: { cookie: await vao('qt') } };
  const ds0 = await (await fetch(`${goc}/api/page-bot/danh-sach`, c)).json();
  assert.equal(ds0.chuLoc.chua_loi_bot, 'Chưa có lời bot riêng');
  for (const loc of Object.keys(ds0.chuLoc)) {
    const a = await (await fetch(`${goc}/api/page-bot/danh-sach?loc=${loc}`, c)).json();
    const b = await (await fetch(`${goc}/api/page-ds?loc=${loc}`, c)).json();
    assert.equal(b.ok, true, `page-ds loc=${loc}: ${b.thongDiep}`);
    assert.deepEqual(idCua(b.ds), idCua(a.page), `loc=${loc}: hai màn ra hai tập page`);
    assert.deepEqual(b.dem, a.dem, `loc=${loc}: hai màn ra hai con số`);
  }
  const d = await (await fetch(`${goc}/api/page-ds?loc=chua_loi_bot`, c)).json();
  assert.deepEqual(idCua(d.ds), ['p2', 'p4'], 'bản NHÁP không phải lời bot đang chạy; page không có bản nào cũng thiếu');
  assert.equal(d.dem.chua_loi_bot, 2);
  assert.equal(d.loc, 'chua_loi_bot');
  assert.deepEqual(d.ds.map((p) => p.coLoiBot), [false, false]);
  assert.ok(!JSON.stringify(d).includes('Page team khác'), 'page team khác lọt vào');
});

test('G2 · marketer lọc được ở cột trái (cửa danh sách của họ vẫn đóng); ô tìm theo đúng luật «Tất cả page» (ngành hàng, marketer)', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const mkt = { headers: { cookie: await vao('mkt') } };
  const d = await (await fetch(`${goc}/api/page-ds?loc=con_chan`, mkt)).json();
  assert.deepEqual(idCua(d.ds), ['p2', 'p4']);
  assert.equal(d.moDanhSach, false, 'marketer không mở được «Tất cả page» — màn không được mời họ quay về đó');
  assert.equal((await fetch(`${goc}/api/page-bot/danh-sach`, mkt)).status, 403, 'VE2b không nới quyền danh sách');
  assert.deepEqual(idCua((await (await fetch(`${goc}/api/page-ds?tim=my-pham`, mkt)).json()).ds), ['p2'], 'tìm theo ngành hàng');
  assert.deepEqual(idCua((await (await fetch(`${goc}/api/page-ds?tim=lan`, mkt)).json()).ds), ['p1'], 'tìm theo marketer');
  const qt = await (await fetch(`${goc}/api/page-ds`, { headers: { cookie: await vao('qt') } })).json();
  assert.equal(qt.moDanhSach, true);
  const la = await fetch(`${goc}/api/page-ds?loc=abc`, mkt);
  assert.equal(la.status, 400);
  assert.equal((await la.json()).ma, 'loc_la');
});

test('G3 · bảng kịch bản đọc HỎNG ⇒ «chưa có lời bot riêng» là KHÔNG ĐO ĐƯỢC (null + lý do), không phải 0 và không phải mọi page', async (t) => {
  const { goc, sv, vao } = await dungThu({ hongKichBan: true });
  t.after(() => sv.close());
  const c = { headers: { cookie: await vao('qt') } };
  const d = await (await fetch(`${goc}/api/page-ds?loc=chua_loi_bot`, c)).json();
  assert.deepEqual(d.ds, [], 'page chưa đo được không được lọt vào «chưa có lời bot riêng»');
  assert.equal(d.dem.chua_loi_bot, null);
  assert.match(d.loiBotViSao, /kich_ban/);
  assert.equal(d.ds.length + (await (await fetch(`${goc}/api/page-ds`, c)).json()).ds.length, 3, 'các bộ lọc khác vẫn chạy');
  const a = await (await fetch(`${goc}/api/page-bot/danh-sach`, c)).json();
  assert.equal(a.dem.chua_loi_bot, null, '«Tất cả page» cũng phải nói không đo được');
});

/* ── ② ĐƯỜNG CŨ CHUYỂN THEO VAI ─────────────────────────────────────────────────────────────────────────────────── */
const diToi = async (goc, duong, cookie) => {
  const r = await fetch(goc + duong, { redirect: 'manual', headers: { accept: 'text/html', ...(cookie ? { cookie } : {}) } });
  return { status: r.status, toi: r.headers.get('location'), html: r.status === 200 ? await r.text() : '' };
};
test('R1 · `/page` trần: marketer MỞ màn page (danh sách + lọc ở cột trái); quản trị về «Tất cả page» giữ bộ lọc; sale 403', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const mkt = await diToi(goc, '/page?loc=con_chan', await vao('mkt'));
  assert.equal(mkt.status, 200);
  assert.match(mkt.html, /id="dsPage"/);
  assert.deepEqual(await diToi(goc, '/page?loc=con_chan&tim=a', await vao('qt')), { status: 302, toi: '/page-bot?loc=con_chan&tim=a', html: '' });
  assert.equal((await diToi(goc, '/page', await vao('sale'))).status, 403);
  assert.match((await diToi(goc, '/page')).toi, /^\/dang-nhap\?tiep=%2Fpage/);
});

test('R2 · `/kich-ban` KHÔNG còn là màn: có page ⇒ tab «Lời bot» của page đó; trần ⇒ danh sách lọc «chưa có lời bot riêng» theo vai', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const qt = await vao('qt');
  assert.deepEqual(await diToi(goc, '/kich-ban?page=p2', qt), { status: 302, toi: '/page/p2?tab=loi', html: '' });
  assert.deepEqual(await diToi(goc, '/kich-ban?page=p2', await vao('mkt')), { status: 302, toi: '/page/p2?tab=loi', html: '' });
  assert.equal((await diToi(goc, '/kich-ban', qt)).toi, '/page-bot?loc=chua_loi_bot');
  assert.equal((await diToi(goc, '/kich-ban', await vao('mkt'))).toi, '/page?loc=chua_loi_bot');
  // «Người duyệt kịch bản» (LL7 thôi cấp; prod 30/09: 0 người) không mở được trang page ⇒ về màn đầu của mình, không 403.
  assert.equal((await diToi(goc, '/kich-ban', await vao('dkb'))).toi, '/');
  assert.match((await diToi(goc, '/kich-ban?page=p2')).toi, /^\/dang-nhap\?tiep=/);
  // Cửa API của kịch bản GIỮ NGUYÊN — tab Lời bot + Lịch sử của màn page đọc/ghi qua đúng chúng.
  assert.equal((await fetch(`${goc}/api/kich-ban/page/p1`, { headers: { cookie: qt } })).status, 200);
});

/* ── ③ ĐIỀU HƯỚNG ───────────────────────────────────────────────────────────────────────────────────────────────── */
const thanhBen = (v) => (mh.menuCua([v]).find((n) => n.ma === 'page')?.man || []).filter((m) => !m.an);
test('N1 · quản trị: «Tất cả page» mở thẳng danh sách — KHÔNG thanh tab trong trang; đứng ở một page thì «Tất cả page» sáng', () => {
  const d = { nhom: mh.menuCua([VAI.QUAN_TRI]) };
  assert.deepEqual(thanhBen(VAI.QUAN_TRI).map((m) => m.tenMenu || m.ten), ['Tất cả page', 'Luật chung']);
  assert.equal(khung.veTabCum(d, '/page-bot'), '', 'thanh tab «Tất cả page | …» còn vẽ');
  assert.match(khung.veKhung(d, '/page/p1').html, /aria-label="Trong mục Page"><a href="\/page-bot" aria-current="page">Tất cả page</);
  assert.ok(!mh.menuCua([VAI.QUAN_TRI]).flatMap((n) => n.man).some((m) => m.trongCum && m.duong === '/page'), '«Các page» lên tab của quản trị');
});

test('N2 · marketer (không mở được «Tất cả page») vào mục Page bằng «Các page» → `/page`; «Kịch bản» không còn ở menu vai nào', () => {
  const mkt = thanhBen(VAI.MARKETER);
  assert.deepEqual(mkt.map((m) => m.tenMenu || m.ten), ['Các page', 'Chính sách · FAQ · Phản đối']);
  assert.equal(mkt[0].duong, '/page');
  const d = { nhom: mh.menuCua([VAI.MARKETER]) };
  assert.match(khung.veKhung(d, '/page/p1').html, /<a href="\/page" aria-current="page">Các page</);
  for (const v of Object.values(VAI)) {
    assert.ok(!mh.menuCua([v]).flatMap((n) => n.man).some((m) => m.duong === '/kich-ban'), `vai ${v} còn «Kịch bản»`);
  }
  assert.equal(mh.CHUYEN_HUONG['/kich-ban'], '/page', 'đường cũ phải khai ở bảng chuyển hướng (quyền theo ĐÍCH)');
});

/* ── ④ SCRIPT THẬT CỦA HAI MÀN, trong vm, gọi máy chủ thật ──────────────────────────────────────────────────────── */
test('M1 · `/page` trần (marketer): cột trái có page + ô LỌC có số của «Tất cả page»; giữa mời chọn page; không gọi cửa của một page', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('mot-page/trang/mot-page.html', { goc, cookie: await vao('mkt'), duong: '/page' });
  const ten = m.document.querySelectorAll('#dsPage a').map((a) => a.textContent.trim().replace(/\s+/g, ' '));
  assert.equal(ten.length, 3);
  assert.match(ten.join(' | '), /Aloe KSA.*Beta UAE.*Zahra Oman/);
  const op = m.document.querySelectorAll('#locPage option').map((o) => [o.attrs.value, o.textContent.trim()]);
  assert.deepEqual(op.find(([v]) => v === 'chua_loi_bot'), ['chua_loi_bot', 'Chưa có lời bot riêng · 2']);
  assert.equal(m.$('#chuaChon').hidden, false);
  assert.match(m.$('#chuaChon').textContent, /Chọn một page ở cột trái/);
  assert.equal(m.$('#chiTiet').hidden, true);
  assert.ok(!m.goi.some((g) => /^\/api\/page\/[^?]/.test(g.duong)), 'mở trần mà vẫn gọi cửa của MỘT page');
  assert.equal(m.$('#veDs').hidden, true, 'marketer không mở được «Tất cả page» — không được có lối trở lại đó');
});

test('M2 · đứng ở một page với bộ lọc mang theo: cột trái đúng tập lọc, liên kết giữ lọc + tab; «← Tất cả page» về đúng chỗ cũ; đổi lọc gọi lại', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('mot-page/trang/mot-page.html', { goc, cookie: await vao('qt'), duong: '/page/p2?loc=chua_loi_bot&tim=a&trang=2&tab=loi' });
  assert.equal(m.$('#locPage').value, 'chua_loi_bot');
  assert.equal(m.$('#timPage').value, 'a');
  const lk = m.document.querySelectorAll('#dsPage a').map(hrefCua);
  assert.deepEqual(lk, ['/page/p2?loc=chua_loi_bot&tim=a&trang=2&tab=loi', '/page/p4?loc=chua_loi_bot&tim=a&trang=2&tab=loi']);
  assert.equal(m.$('#veDs').hidden, false);
  assert.equal(hrefCua(m.$('#veDs')), '/page-bot?loc=chua_loi_bot&tim=a&trang=2');
  // Đổi lọc: gọi lại cửa danh sách với mã mới; số trang cũ của danh sách hết nghĩa ⇒ bỏ; lối trở lại đi theo.
  m.$('#locPage').value = 'mat_dau';
  await m.$('#locPage').phat('change');
  await m.cho();
  assert.ok(m.goi.some((g) => g.duong === '/api/page-ds?loc=mat_dau&tim=a'));
  assert.deepEqual(m.document.querySelectorAll('#dsPage a').map(hrefCua), ['/page/p4?loc=mat_dau&tim=a&tab=loi']);
  assert.equal(hrefCua(m.$('#veDs')), '/page-bot?loc=mat_dau&tim=a');
  assert.equal(m.location.search, '?loc=mat_dau&tim=a&tab=loi', 'F5 phải giữ bộ lọc vừa đổi');
});

test('M3 · tab Lịch sử: mỗi bản XEM được nội dung; «Chạy lại bản này» (bản không đang chạy) hỏi rồi đi đúng cửa lưu-là-chạy với chữ của bản đó', async (t) => {
  const { goc, sv, vao, kho, daDay } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('mot-page/trang/mot-page.html', { goc, cookie: await vao('qt'), duong: '/page/p1?tab=ls' });
  const o = m.$('#o-ls');
  assert.match(o.textContent, /Bản 2[\s\S]*Đang chạy[\s\S]*Bản 1/);
  assert.match(o.querySelector('details').textContent, /giọng MỚI/, 'bản phải XEM được nội dung ngay trong tab');
  assert.equal(o.querySelectorAll('[data-chaylai]').length, 1, 'chỉ bản KHÔNG đang chạy mới có «Chạy lại»');
  await o.querySelector('[data-chaylai]').click();
  await m.cho();
  assert.equal(m.hoi.length, 1, 'chạy lại chạm khách thật — phải hỏi trước');
  const g = m.goi.find((x) => x.phuongThuc === 'POST');
  assert.equal(g.duong, '/api/kich-ban/page/p1/luu-chay');
  assert.deepEqual(Object.fromEntries(Object.entries(g.than.nguoi).filter(([, v]) => v)),
    { tone: 'giọng CŨ', greeting: 'chào CŨ', salesPrompt: 'bán CŨ' }, 'phải gửi ĐÚNG chữ của bản được chọn');
  const live = kho.docThang('kich_ban').filter((b) => b.page_id === 'p1' && b.trang_thai === 'LIVE');
  assert.equal(live.length, 1);
  assert.equal(live[0].phien_ban, 3, 'chạy lại = một bản MỚI mang chữ của bản cũ');
  assert.equal(daDay.length, 1, 'bot phải được đẩy bản mới');
});

test('M4 · Lịch sử «Chép vào ô soạn» sang tab Lời bot điền đúng chữ; KHÔNG ghi gì. Không đồng ý chạy lại ⇒ không gọi cửa ghi', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('mot-page/trang/mot-page.html', { goc, cookie: await vao('mkt'), duong: '/page/p1?tab=ls', xacNhan: false });
  await m.$('#o-ls').querySelector('[data-chaylai]').click();
  await m.cho();
  assert.ok(!m.goi.some((x) => x.phuongThuc === 'POST'), 'không đồng ý mà vẫn ghi');
  await m.$('#o-ls').querySelector('[data-chep="k1"]').click();   // bản 1 (cũ) — không phải bản đang chạy
  await m.cho();
  assert.equal(m.$('#tab-loi').hidden, false, 'chép xong phải đứng ở tab Lời bot');
  assert.equal(m.$('#kb-tone').value, 'giọng CŨ');
  assert.equal(m.$('#kb-salesPrompt').value, 'bán CŨ');
  assert.ok(!m.goi.some((x) => x.phuongThuc === 'POST'), 'chép vào ô soạn không được tự lưu');
  // «Bổ sung kịch bản» (cửa kiểm chỉ sang màn Kịch bản cũ) nay là nút SANG TAB ngay trong trang — không rời trang.
  const thieu = m.$('#khoi-thieu');
  assert.equal(thieu.querySelector('a[href="/kich-ban"]'), null, 'còn nút đưa sang màn Kịch bản đã gộp');
  {
    const nut = thieu.querySelector('[data-sangtab]');
    assert.match(nut.textContent, /Bổ sung kịch bản/);
    await m.$('[data-tab="sp"]').click();
    await nut.click();
    assert.equal(m.$('#tab-loi').hidden, false, 'bấm «Bổ sung kịch bản» phải mở tab Lời bot');
  }
});

test('M5 · quản lý (xem, không soạn): Lịch sử chỉ XEM — không nút chép / chạy lại; Lời bot không có nút nhập file', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('mot-page/trang/mot-page.html', { goc, cookie: await vao('ql'), duong: '/page/p1?tab=ls' });
  assert.equal(m.$('#o-ls').querySelectorAll('[data-chaylai], [data-chep]').length, 0);
  assert.ok(m.$('#o-ls').querySelector('details'));
  assert.equal(m.$('#o-kb').querySelector('#nutNhapPancake'), null);
});

test('M6 · Lời bot «Nhập từ file Pancake»: bóc qua đúng cửa, điền ba ô, nói rõ CHƯA LƯU — không gọi cửa lưu', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('mot-page/trang/mot-page.html', { goc, cookie: await vao('mkt'), duong: '/page/p1?tab=loi' });
  const nut = m.$('#o-kb').querySelector('#nutNhapPancake');
  assert.ok(nut, 'marketer soạn được thì phải có nút nhập file');
  const oFile = m.$('#oFilePancake');
  assert.ok(oFile && !m.$('#o-kb').querySelector('#oFilePancake'), 'ô chọn tệp phải nằm NGOÀI vùng vẽ lại');
  let daMo = false;
  oFile.click = () => { daMo = true; };
  await nut.click();
  assert.ok(daMo, 'bấm nút phải mở hộp chọn tệp');
  oFile.files = [{ name: 'kich-ban.xlsx', noiDung: 'PK-xlsx' }];
  await oFile.phat('change');
  await m.cho();
  const g = m.goi.find((x) => x.duong === '/api/kich-ban/nhap-pancake');
  assert.equal(g.than.dataBase64, Buffer.from('PK-xlsx').toString('base64'));
  assert.equal(m.$('#kb-tone').value, 'giọng từ Pancake');
  assert.equal(m.$('#kb-greeting').value, 'chào từ Pancake');
  assert.equal(m.$('#kb-salesPrompt').value, 'bán từ Pancake');
  assert.match(m.$('#kqNhapPancake').textContent, /điền 3\/3 ô[\s\S]*Chưa lưu gì cả/);
  assert.ok(!m.goi.some((x) => /luu-chay/.test(x.duong)), 'nhập file không được tự lưu');
});

test('M7 · màn page không còn trỏ sang màn Kịch bản; việc «soạn kịch bản» ở khối Bật được chưa chuyển sang tab ngay trong trang', () => {
  const src = DOC('mot-page/trang/mot-page.html');
  assert.match(src, /const TAB_CUA_DI = Object\.freeze\(\{ '\/kich-ban': 'loi' \}\);/);
  assert.doesNotMatch(src.replace(/const TAB_CUA_DI = .*\n/, ''), /\/kich-ban["'`?]/, 'còn liên kết sang màn Kịch bản đã bỏ');
});

test('P1 · «Tất cả page» vào thẳng danh sách: không khối đầu trang, không hộp cảnh báo cố định, không dòng marketer; Quét nằm ở hàng tìm', async (t) => {
  const src = DOC('page-bot/trang/page-bot.html');
  assert.match(src, /<header class="an-tieu-de">\s*<h1>Tất cả page<\/h1>\s*<\/header>/, 'đầu trang còn hiện (tên giữ cho trình đọc màn hình + HK10)');
  assert.doesNotMatch(src, /ghi-chu-marketer|chưa có người phụ trách/);
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('page-bot/trang/page-bot.html', { goc, cookie: await vao('qt'), duong: '/page-bot' });
  assert.ok(m.$('#nutQuet').closest('.table-toolbar'), 'nút Quét phải nằm ở hàng ô tìm');
  assert.doesNotMatch(m.$('#bang-tin').innerHTML, /Chưa bật tắt bot được/, 'hộp cảnh báo cửa ghi vẫn chiếm đầu trang');
  // Cửa ghi đóng (máy thử không mở cửa ghi sang bot) ⇒ MỘT dòng nhỏ ở hàng tìm, lý do nằm trong title — không im lặng.
  const khoa = m.$('#khoaBot');
  assert.equal(khoa.hidden, false);
  assert.match(khoa.textContent, /Công tắc bot đang khoá/);
  assert.match(khoa.title, /chưa được phép ghi sang tiến trình bot/);
  assert.match(m.$('#bang').querySelector('[data-bot]').closest('label').title, /chưa được phép ghi sang tiến trình bot/, 'công tắc khoá phải tự nói lý do');
});

test('P2 · lỗi THẬT vẫn hiện ở đầu danh sách; viên «Chưa có lời bot riêng» có số; không đo được thì «—» chứ không «0»', async (t) => {
  const a = await dungThu();
  t.after(() => a.sv.close());
  const m = await moTrang('page-bot/trang/page-bot.html', { goc: a.goc, cookie: await a.vao('qt'), duong: '/page-bot' });
  assert.match(m.$('[data-loc="chua_loi_bot"]').textContent, /Chưa có lời bot riêng\s*2/);
  const b = await dungThu({ hongKichBan: true });
  t.after(() => b.sv.close());
  const n = await moTrang('page-bot/trang/page-bot.html', { goc: b.goc, cookie: await b.vao('qt'), duong: '/page-bot' });
  assert.match(n.$('[data-loc="chua_loi_bot"]').textContent, /Chưa có lời bot riêng\s*—/);
  assert.match(n.$('#bang-tin').textContent, /Chưa đọc được kịch bản của các page/, 'đo hỏng phải nói ra ở đầu danh sách');
});

test('P3 · bấm tên page sang `/page/:id` MANG THEO bộ lọc · ô tìm · trang — để «← Tất cả page» trả về đúng chỗ', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const m = await moTrang('page-bot/trang/page-bot.html', { goc, cookie: await vao('qt'), duong: '/page-bot?loc=chua_loi_bot&tim=a' });
  const lk = m.$('#bang').querySelectorAll('.ten a').map(hrefCua);
  assert.deepEqual(lk, ['/page/p2?loc=chua_loi_bot&tim=a', '/page/p4?loc=chua_loi_bot&tim=a']);
  const n = await moTrang('page-bot/trang/page-bot.html', { goc, cookie: await vao('qt'), duong: '/page-bot' });
  assert.deepEqual(n.$('#bang').querySelectorAll('.ten a').map(hrefCua), ['/page/p2', '/page/p4', '/page/p1'], 'không lọc thì liên kết trơn');
});
