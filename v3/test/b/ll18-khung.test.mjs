// PHIẾU LL18 · KHUNG VẼ Ở MÁY CHỦ + NÉN + CACHE THEO PHIÊN BẢN + KHUNG THEO BẢN VẼ (CR-28-09c).
//
// Người dùng báo 29/09 sau deploy sóng LL: «load chậm», «click menu để chuyển màn bị nhảy màn, mất menu sau
// đó mới hiện lại», «giao diện không giống bản artifact». E2E cùng ngày bắt thêm: marketer mở `/` rơi vào
// `/dieu-phoi` 403, và trang 403 in thô thẻ `<b>`. Bộ ca này đo HÀNH VI — HTML thật trả về, header thật —
// không đo chuỗi trong mã nguồn.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import zlib from 'node:zlib';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay, VAI } = await import('../../src/auth/boi-canh.js');
const { menuCua } = await import('../../src/ui/chung/man-hinh.js');
const { veKhung, veTabCum, timChoDung } = await import('../../src/ui/chung/khung.js');
const { chenKhung, phienBan } = await import('../../src/ui/chung/khung-may-chu.js');

const d = (vai, x = {}) => ({ tenDangNhap: 'an@talpha.vn', teamId: 't1', tenTeam: 'Tiểu Alpha', vai: [vai], nhom: menuCua([vai]), ...x });
const lienKet = (html, nhan) => {
  const m = html.match(new RegExp(`<nav class="[^"]*" aria-label="${nhan}">([\\s\\S]*?)</nav>`));
  if (!m) return null;
  return [...m[1].matchAll(/<a href="([^"]+)"( aria-current="page")?>([^<]+)<\/a>/g)].map((x) => `${x[3]}${x[2] ? '*' : ''}`);
};

/* ═══ K1–K6 · khung.js — hàm thuần, một nguồn markup ═══ */

test('K1 · quản trị ở /bo-luat: năm đích đúng thứ tự bản vẽ, «Page» đang đứng, hàng 2 «Trong mục Page»', () => {
  const k = veKhung(d(VAI.QUAN_TRI), '/bo-luat');
  assert.deepEqual(lienKet(k.html, 'Chính'), ['Hộp thư', 'Sản phẩm', 'Page*', 'Số liệu', 'Cài đặt']);
  assert.deepEqual(lienKet(k.html, 'Trong mục Page'), ['Tất cả page', 'Luật chung*']);
  assert.equal(k.soHang, 2);
  // Tab CỤM «Luật chung» vào đầu trang (tầng 3) — không lặp hàng 2.
  const tab = veTabCum(d(VAI.QUAN_TRI), '/bo-luat');
  assert.match(tab, /data-cum="luat-chung"/);
  // «Đề xuất chờ duyệt» khai `an` và KHÔNG `trongCum` (man-hinh.js) — từ LL3 nó không phải tab của cụm.
  assert.deepEqual([...tab.matchAll(/>([^<]+)<\/a>/g)].map((x) => x[1]), ['Luật', 'Trả lời sẵn']);
});

test('K2 · Số liệu và Cài đặt là MỘT cụm ⇒ hàng 2 chính là các tab của cụm, KHÔNG vẽ lại trong trang', () => {
  const s = veKhung(d(VAI.QUAN_TRI), '/chi-phi');
  assert.deepEqual(lienKet(s.html, 'Trong mục Số liệu'), ['Tổng quan', 'Chi phí AI*', 'Nguồn khách', 'Rủi ro hoàn']);
  assert.equal(veTabCum(d(VAI.QUAN_TRI), '/chi-phi'), '', 'tab cụm đã ở hàng 2 — vẽ thêm trong trang là hai nơi cho một việc');
  const c = veKhung(d(VAI.QUAN_TRI), '/model-ai');
  assert.deepEqual(lienKet(c.html, 'Trong mục Cài đặt'),
    ['Bắt đầu', 'Kết nối', 'Model*', 'Hệ còn sống', 'Vận hành', 'Người và team', 'Nhật ký']);
});

test('K3 · Sản phẩm một màn ⇒ một hàng; màn chi tiết `/page/42` vẫn ra đúng đích Page', () => {
  const k = veKhung(d(VAI.QUAN_TRI), '/san-pham');
  assert.equal(k.soHang, 1);
  assert.equal(lienKet(k.html, 'Trong mục Sản phẩm'), null);
  assert.deepEqual(lienKet(veKhung(d(VAI.QUAN_TRI), '/page/42').html, 'Chính'), ['Hộp thư', 'Sản phẩm', 'Page*', 'Số liệu', 'Cài đặt']);
  assert.equal(timChoDung({ nhom: menuCua([VAI.QUAN_TRI]) }, '/khong-co-that'), null, 'đường lạ trả null, không đoán bừa');
});

test('K4 · SALE: một đích, hai mục — HTML không chứa một đường nào của màn quản trị', () => {
  const k = veKhung(d(VAI.SALE), '/ban-hoi-thoai');
  assert.deepEqual(lienKet(k.html, 'Chính'), ['Hộp thư*']);
  assert.deepEqual(lienKet(k.html, 'Trong mục Hộp thư'), ['Hộp thư*', 'Việc đang chờ']);
  for (const duong of ['/model-ai', '/ket-noi', '/cau-hinh-team', '/bo-luat', '/san-pham', '/bao-cao']) {
    assert.ok(!k.html.includes(`"${duong}"`), `sale thấy đường ${duong} trong khung`);
  }
});

test('K5 · lối ra có ở MỌI vai (đổi team · đăng xuất), tên vai đọc được, chữ người dùng được thoát ký tự', () => {
  for (const v of [VAI.QUAN_TRI, VAI.MARKETER, VAI.SALE]) {
    const k = veKhung(d(v), menuCua([v])[0].man[0].duong);
    assert.match(k.html, /data-di="\/chon-team"/, `${v}: thiếu lối đổi team`);
    assert.match(k.html, /class="ra"[^>]*>Đăng xuất</, `${v}: thiếu lối đăng xuất`);
  }
  assert.match(veKhung(d(VAI.SALE), '/ban-hoi-thoai').html, /an@talpha\.vn · Sale</);
  const x = veKhung(d(VAI.SALE, { tenDangNhap: '<img src=x onerror=alert(1)>', tenTeam: '"><script>' }), '/ban-hoi-thoai').html;
  assert.ok(!/<img src=x|<script>/.test(x), 'chữ người dùng lọt vào HTML không thoát ký tự');
});

test('K6 · chenKhung: khung ngay sau <body>, tab cụm vào cuối header của trang, tệp chung mang mã phiên bản', () => {
  const trang = '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/chung/kieu.css" data-ds="v3">'
    + '<script src="/chung/ui.js"></script></head><body>\n<header><h1>Quy tắc chung mọi page</h1></header>'
    + '<main><header>trong main</header></main><script src="/chung/dieu-huong.js"></script></body></html>';
  const k = veKhung(d(VAI.QUAN_TRI), '/bo-luat');
  const ra = chenKhung(trang, { pb: 'abc123', khung: k, tabCum: veTabCum(d(VAI.QUAN_TRI), '/bo-luat') });
  assert.match(ra, /<body data-khung-hang="2"><div class="kh" data-khung/, 'khung phải là thứ ĐẦU TIÊN trong <body>');
  assert.match(ra, /<h1>Quy tắc chung mọi page<\/h1><nav class="tabs" data-cum="luat-chung"/, 'tab cụm vào header CỦA TRANG');
  assert.match(ra, /<header>trong main<\/header>/, 'header lồng trong main không bị đụng');
  assert.match(ra, /href="\/chung\/kieu\.css\?v=abc123"/);
  assert.match(ra, /src="\/chung\/ui\.js\?v=abc123"/);
  assert.match(ra, /src="\/chung\/dieu-huong\.js\?v=abc123"/);
  assert.match(ra, /data-ds="chu" media="print" onload="this\.media='all'"/, 'phông chữ ngoài KHÔNG được chặn lần vẽ đầu');
  assert.match(ra, /<link rel="icon" href="data:image\/svg\+xml,/, 'thiếu biểu tượng tab ⇒ 404 /favicon.ico mỗi lần mở');
  // Không đăng nhập: không khung, nhưng tệp chung vẫn mang mã phiên bản.
  const tran = chenKhung(trang, { pb: 'abc123' });
  assert.ok(!tran.includes('data-khung'));
  assert.match(tran, /kieu\.css\?v=abc123/);
});

/* ═══ K7–K10 · qua HTTP — app thật (`dungPhanB`), CSDL giả ═══ */

async function dungThu() {
  const mk = await bam('matkhau1');
  const { taoTruyVan } = dungCongGia({
    nguoi_dung: [
      { id: 'u1', email: 'qt@talpha.vn', mat_khau_hash: mk, ten: 'Chủ', hoat_dong: true },
      { id: 'u2', email: 'mkt@talpha.vn', mat_khau_hash: mk, ten: 'Ngọc', hoat_dong: true },
      { id: 'u3', email: 'sale@talpha.vn', mat_khau_hash: mk, ten: 'Linh', hoat_dong: true },
    ],
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    vai: [{ id: 'v1', ma: 'quan-tri', ten: 'Quản trị' }, { id: 'v2', ma: 'marketer', ten: 'Marketer' }, { id: 'v3', ma: 'sale', ten: 'Sale' }],
    thanh_vien_team: [
      { id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' },
      { id: 'tv2', nguoi_dung_id: 'u2', team_id: 't1', vai_id: 'v2' },
      { id: 'tv3', nguoi_dung_id: 'u3', team_id: 't1', vai_id: 'v3' },
    ],
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express });
  const sv = http.createServer(app);
  await new Promise((r) => sv.listen(0, r));
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const vao = async (email) => {
    const dn = await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, matKhau: 'matkhau1' }) });
    assert.equal(dn.status, 200, `đăng nhập ${email}`);
    return dn.headers.get('set-cookie').split(';')[0];
  };
  return { goc, sv, vao };
}

// Đọc thô (không để fetch tự giải nén) — để thấy ĐÚNG byte đi trên dây.
function layTho(url, headers = {}) {
  return new Promise((ok, loi) => {
    http.get(url, { headers }, (r) => {
      const ds = []; r.on('data', (c) => ds.push(c));
      r.on('end', () => {
        const buf = Buffer.concat(ds);
        const than = r.headers['content-encoding'] === 'gzip' ? zlib.gunzipSync(buf).toString('utf8') : buf.toString('utf8');
        ok({ status: r.statusCode, headers: r.headers, soByte: buf.length, than });
      });
    }).on('error', loi);
  });
}

test('K7 · `/` theo VAI: marketer không còn rơi vào 403; chưa đăng nhập ⇒ trang đăng nhập', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const di = async (ck) => (await fetch(`${goc}/`, { redirect: 'manual', headers: ck ? { cookie: ck } : {} })).headers.get('location');
  assert.equal(await di(null), '/dang-nhap');
  assert.equal(await di(await vao('mkt@talpha.vn')), menuCua([VAI.MARKETER])[0].man[0].duong);
  assert.notEqual(await di(await vao('mkt@talpha.vn')), '/dieu-phoi');
  assert.equal(await di(await vao('sale@talpha.vn')), '/ban-hoi-thoai');
});

test('K8 · trang 403 của bảng điều phối in thẻ <b> ĐÚNG, không in thô «</b> và <b>»', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const r = await fetch(`${goc}/dieu-phoi`, { headers: { cookie: await vao('mkt@talpha.vn'), accept: 'text/html' } });
  assert.equal(r.status, 403);
  const s = await r.text();
  assert.match(s, /<b>sale<\/b> và <b>quan-tri<\/b>/);
  assert.ok(!s.includes('&lt;/b&gt;'), 'thẻ bị thoát ký tự hai lần — người dùng đọc thấy «</b>»');
});

test('K9 · trang THẬT qua HTTP: khung có sẵn trong HTML, nén gzip, không cho bộ đệm chung giữ', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const ck = await vao('qt@talpha.vn');
  const r = await layTho(`${goc}/bo-luat`, { cookie: ck, 'accept-encoding': 'gzip' });
  assert.equal(r.status, 200);
  assert.equal(r.headers['content-encoding'], 'gzip');
  assert.match(r.headers['cache-control'], /private/);
  assert.match(r.than, /<body data-khung-hang="2"><div class="kh" data-khung/, 'menu phải NẰM SẴN trong HTML — không chờ JS');
  assert.deepEqual(lienKet(r.than, 'Chính'), ['Hộp thư', 'Sản phẩm', 'Page*', 'Số liệu', 'Cài đặt']);
  assert.match(r.than, /<nav class="tabs" data-cum="luat-chung"/);
  // ĐÚNG MỘT phần tử mang dấu `data-khung`. E2E 29/09: `<body data-khung="2">` trùng dấu ⇒ `[data-khung] a` khớp MỌI
  // liên kết, cửa tắt liên kết cấm (`:not([data-khung] a)`) bỏ qua cả trang — marketer vẫn bấm vào 403.
  assert.equal((r.than.match(/\sdata-khung[\s>=]/g) || []).length, 1, 'dấu data-khung phải là của RIÊNG khối khung');
  assert.ok(r.soByte < r.than.length / 2, `gzip phải thu nhỏ ít nhất một nửa: ${r.soByte} / ${r.than.length}`);
  // Trình duyệt không nhận gzip ⇒ thân thô, vẫn có khung.
  const tho = await layTho(`${goc}/bo-luat`, { cookie: ck });
  assert.equal(tho.headers['content-encoding'], undefined);
  assert.match(tho.than, /data-khung/);
  // Khung vẽ THEO VAI của vé, ở máy chủ: sale chỉ có Hộp thư, HTML không mang một đường quản trị nào.
  const sale = await layTho(`${goc}/ban-hoi-thoai`, { cookie: await vao('sale@talpha.vn') });
  assert.deepEqual(lienKet(sale.than, 'Chính'), ['Hộp thư*']);
  assert.ok(!/href="\/(model-ai|ket-noi|cau-hinh-team|bo-luat)"/.test(sale.than), 'khung của sale lộ đường quản trị');
  // Chưa đăng nhập: trang đăng nhập không có khung, nhưng vẫn qua được (không 500).
  const dn = await layTho(`${goc}/dang-nhap`, { 'accept-encoding': 'gzip' });
  assert.equal(dn.status, 200);
  assert.ok(!dn.than.includes('data-khung'));
});

test('K10 · bốn tệp khung: ĐÚNG mã phiên bản ⇒ cache một năm; không mã / mã cũ ⇒ no-cache (lệch bản không thể xảy ra)', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const pb = phienBan();
  assert.match(pb, /^[0-9a-f]{12}$/);
  for (const tep of ['kieu.css', 'ui.js', 'dieu-huong.js', 'khung.js']) {
    const dung = await layTho(`${goc}/chung/${tep}?v=${pb}`, { 'accept-encoding': 'gzip' });
    assert.equal(dung.status, 200, tep);
    assert.match(dung.headers['cache-control'], /max-age=31536000.*immutable/, `${tep}?v=đúng`);
    assert.equal(dung.headers['content-encoding'], 'gzip', `${tep} phải nén`);
    for (const q of ['', '?v=cu000000000']) {
      const cu = await layTho(`${goc}/chung/${tep}${q}`);
      assert.equal(cu.headers['cache-control'], 'no-cache', `${tep}${q} phải no-cache`);
    }
  }
  // Mã phiên bản trong HTML trỏ ĐÚNG mã máy chủ đang phục vụ.
  const trang = await layTho(`${goc}/bo-luat`, { cookie: await vao('qt@talpha.vn') });
  assert.ok(trang.than.includes(`/chung/kieu.css?v=${pb}`), 'HTML phải gọi kieu.css bằng đúng mã hiện hành');
  assert.ok(trang.than.includes(`/chung/dieu-huong.js?v=${pb}`));
  // JSON ≥ 1 KB được nén; nhỏ hơn thì không (nén thân nhỏ tốn hơn lợi).
  const menu = await layTho(`${goc}/api/dieu-huong`, { cookie: await vao('qt@talpha.vn'), 'accept-encoding': 'gzip' });
  assert.equal(menu.headers['content-encoding'], 'gzip');
  assert.equal(JSON.parse(menu.than).ok, true);
  const nho = await layTho(`${goc}/api/dieu-huong`, { 'accept-encoding': 'gzip' });
  assert.equal(nho.status, 401);
  assert.equal(nho.headers['content-encoding'], undefined);
});

test('K11 · liên kết trong trang: máy chủ chỉ ra đường nào là MÀN vai này không vào được — không lộ thêm, không chặn nhầm', async (t) => {
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const hoi = async (email, ds) => (await (await fetch(`${goc}/api/dieu-huong/cam?${ds.map((d) => 'd=' + encodeURIComponent(d)).join('&')}`,
    { headers: { cookie: await vao(email) } })).json()).cam;
  const DS = ['/model-ai', '/van-hanh-v3', '/san-pham', '/cai-dat-team', '/page/42', '/chon-team', '/viec/7', '/khong-co-that'];
  // Marketer: Model AI và Vận hành là màn có thật nhưng không phải của marketer (e2e 29/09: 403). Còn lại để nguyên.
  assert.deepEqual(await hoi('mkt@talpha.vn', DS), ['/model-ai', '/van-hanh-v3']);
  // Quản trị mở hết ⇒ không tắt gì. Đường không phải màn (`/chon-team`, `/viec/7`, đường lạ) KHÔNG bao giờ bị tắt.
  assert.deepEqual(await hoi('qt@talpha.vn', DS), []);
  // Đường CHỈ CÒN CHUYỂN HƯỚNG: quyền theo ĐÍCH. `/san-sang` → `/page-bot` (e2e 29/09: marketer bấm thẻ «Page bot
  // KHÔNG bật được» ở Việc của tôi là tới 403).
  assert.deepEqual(await hoi('mkt@talpha.vn', ['/san-sang']), ['/san-sang']);
  assert.deepEqual(await hoi('qt@talpha.vn', ['/san-sang']), []);
  const di = async (email) => (await fetch(`${goc}/san-sang`, { redirect: 'manual', headers: { cookie: await vao(email) } })).headers.get('location');
  assert.equal(await di('qt@talpha.vn'), '/page-bot?loc=con_chan');
  assert.equal(await di('mkt@talpha.vn'), '/', 'gõ thẳng /san-sang: marketer về màn đầu của mình, không tới 403');
  // Sale: chỉ nhận lại đúng những đường nó ĐÃ HỎI — không một tên màn nào khác đi qua dây.
  const sale = await hoi('sale@talpha.vn', ['/model-ai', '/ban-hoi-thoai']);
  assert.deepEqual(sale, ['/model-ai']);
  const tho = await fetch(`${goc}/api/dieu-huong/cam?d=/model-ai`, { headers: { cookie: await vao('sale@talpha.vn') } });
  assert.ok(!(await tho.text()).includes('/ket-noi'), 'cửa kiểm lộ tên màn không được hỏi');
  // Chưa đăng nhập ⇒ 401, không trả danh sách.
  assert.equal((await fetch(`${goc}/api/dieu-huong/cam?d=/model-ai`)).status, 401);
});

test('K12 · trang «cần vai …» không còn là ngõ cụt: lối về là `/` (đích theo vai), không phải `/dieu-phoi`', async (t) => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const GOC_UI = path.resolve(import.meta.dirname, '../../src/ui');
  const conCu = [];
  for (const m of fs.readdirSync(GOC_UI)) {
    const f = path.join(GOC_UI, m, 'router.js');
    if (fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes('<a href="/dieu-phoi">← Về bảng điều phối</a>')) conCu.push(m);
  }
  assert.deepEqual(conCu, [], 'marketer bị 403 ở một màn, bấm «Về bảng điều phối» là gặp 403 lần hai');
  // Hành vi: marketer mở màn Model AI ⇒ 403, và lối về dẫn tới màn marketer VÀO ĐƯỢC.
  const { goc, sv, vao } = await dungThu();
  t.after(() => sv.close());
  const ck = await vao('mkt@talpha.vn');
  const r = await fetch(`${goc}/model-ai`, { headers: { cookie: ck, accept: 'text/html' } });
  assert.equal(r.status, 403);
  assert.match(await r.text(), /<a href="\/">← Về màn đầu của bạn<\/a>/);
  const ve = await fetch(`${goc}/`, { redirect: 'manual', headers: { cookie: ck } });
  const dich = ve.headers.get('location');
  const cuoi = await fetch(`${goc}${dich}`, { headers: { cookie: ck, accept: 'text/html' } });
  assert.equal(cuoi.status, 200, `lối về dẫn tới ${dich} — phải là màn marketer mở được`);
});
