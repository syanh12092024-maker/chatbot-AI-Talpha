// PHIẾU VE5b · «HỘP THƯ › TÌM KHÁCH» THEO BẢN VẼ 1b — `/ho-so-khach` (đường giữ nguyên) thành màn tìm khách của Hộp thư.
// Luật: TRANG mở thêm cho sale (§10 bổ sung CR-28-09c: Hộp thư gồm «tìm khách gộp ba kênh»); cửa đọc cũ `/api/ho-so-khach`
// GIỮ vai cũ (quản trị · quản lý). Trang CHỈ ĐỌC. Vai nào không có cửa thì màn nói ra, không đoán. Không vai nào mất việc.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString('base64');

const { dungPhanB } = await import('../../src/vai-b.js');
const { bam } = await import('../../src/auth/mat-khau.js');
const { dungCongGia } = await import('../../testkit/db-gia.js');
const { boiCanhMay } = await import('../../src/auth/boi-canh.js');

const html = fs.readFileSync(new URL('../../src/ui/ho-so-khach/trang/ho-so-khach.html', import.meta.url), 'utf8');
const js = html.slice(html.indexOf('<script>\nconst {') + 8, html.lastIndexOf('</script>\n<script src="/chung/dieu-huong.js">'));

test('B1 · quyền: TRANG — sale · quản lý · quản trị vào được, marketer 403; cửa đọc CŨ giữ vai cũ (sale 403, quản lý 200)', async (t) => {
  const mk = await bam('matkhau1');
  const nd = [['u1', 'qt@t.vn', 'v1'], ['u2', 'ql@t.vn', 'v2'], ['u3', 'sale@t.vn', 'v3'], ['u4', 'mkt@t.vn', 'v4']];
  const { taoTruyVan } = dungCongGia({
    nguoi_dung: nd.map(([id, email]) => ({ id, email, mat_khau_hash: mk, ten: email, hoat_dong: true })),
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    vai: [{ id: 'v1', ma: 'quan-tri' }, { id: 'v2', ma: 'quan-ly' }, { id: 'v3', ma: 'sale' }, { id: 'v4', ma: 'marketer' }],
    thanh_vien_team: nd.map(([id, , v], i) => ({ id: 'tv' + i, nguoi_dung_id: id, team_id: 't1', vai_id: v })),
    khach: [], don_hang: [], hoi_thoai: [],
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express });
  const sv = http.createServer(app); await new Promise((r) => sv.listen(0, r));
  t.after(() => sv.close());
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const vao = async (email) => (await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, matKhau: 'matkhau1' }) })).headers.get('set-cookie').split(';')[0];
  const trang = async (email) => (await fetch(`${goc}/ho-so-khach`, { headers: { cookie: await vao(email), Accept: 'text/html' } })).status;
  const api = async (email) => (await fetch(`${goc}/api/ho-so-khach`, { headers: { cookie: await vao(email) } })).status;
  assert.equal(await trang('sale@t.vn'), 200, 'sale phải mở được Tìm khách (§10 bổ sung)');
  assert.equal(await trang('ql@t.vn'), 200, 'quản lý GIỮ màn — không vai nào mất việc');
  assert.equal(await trang('qt@t.vn'), 200);
  assert.equal(await trang('mkt@t.vn'), 403);
  assert.equal(await api('sale@t.vn'), 403, 'cửa đọc cũ (kéo cả bảng khách) KHÔNG mở cho sale');
  assert.equal(await api('ql@t.vn'), 200);
  // Trang hỏi TRƯỚC vai dùng được cửa nào — máy chủ trả bằng đúng hằng vai của hai cửa.
  const cua = async (email) => { const r = await fetch(`${goc}/api/ho-so-khach/cua`, { headers: { cookie: await vao(email) } });
    return r.status === 200 ? (({ hoSo, danhSach }) => ({ hoSo, danhSach }))(await r.json()) : r.status; };
  assert.deepEqual(await cua('sale@t.vn'), { hoSo: true, danhSach: false });
  assert.deepEqual(await cua('qt@t.vn'), { hoSo: true, danhSach: true });
  assert.deepEqual(await cua('ql@t.vn'), { hoSo: false, danhSach: true });
  assert.equal(await cua('mkt@t.vn'), 403);
  const cam = await (await fetch(`${goc}/ho-so-khach`, { headers: { cookie: await vao('mkt@t.vn'), Accept: 'text/html' } })).text();
  assert.match(cam, /Màn Tìm khách cần một trong các vai/, 'câu 403 phải nói đúng tên màn (bản cũ ghi nhầm «Cửa kiểm sẵn sàng»)');
});

test('B2 · trang chỉ ĐỌC; tra theo số ⇒ cửa Hộp thư + hội thoại khớp; tra theo tên ⇒ cửa cũ; mã POS ⇒ nói chưa có đường', () => {
  assert.match(html, /<header class="an-tieu-de">\s*<h1>Tìm khách<\/h1>/);
  assert.doesNotMatch(js, /\bmethod\s*:/, 'trang tự gọi phương thức khác GET');
  assert.ok(!/<textarea|contenteditable/i.test(html));
  const api = [...js.matchAll(/['"`](\/api\/[^'"`?$]*)/g)].map((m) => m[1]).sort();
  assert.deepEqual([...new Set(api)], ['/api/ban-hoi-thoai', '/api/ho-so-khach', '/api/ho-so-khach/cua', '/api/hop-thu/khach/', '/api/hop-thu/tim-khach'].sort());
  assert.match(js, /napCua\(\)\.then\(\(\) => \{ if \(q0\)/, 'phải hỏi cửa TRƯỚC lượt tra đầu');
  assert.match(js, /if \(\/\^\\d\+:\\d\+\$\/\.test\(q\)\) \{[\s\S]*?Chưa tra được theo mã đơn POS/);
  assert.match(js, /doc\('\/api\/hop-thu\/tim-khach\?sdt=' \+ encodeURIComponent\(q\)\),\s*doc\('\/api\/ban-hoi-thoai\?loc=tat&tim=' \+ encodeURIComponent\(q\)\)/);
  assert.match(js, /if \(soChuSo >= 6 && !CUA\.hoSo\) \{[\s\S]*?doc\('\/api\/ho-so-khach\?tim='[\s\S]*?Hồ sơ chi tiết mở cho vai Sale và Quản trị/, 'quản lý: tra qua cửa cũ + nói rõ phần thiếu');
  assert.match(js, /if \(!CUA\.danhSach\) \{\s*bao\('info', 'Tìm theo tên chưa mở cho vai của bạn'/, 'sale gõ tên: nói ra, không gọi cửa rồi ăn 403');
  // Bấm thật (VE5b): quản lý gõ «0501234567» ⇒ cửa cũ trả 0 dòng mà màn từng báo «thấy danh sách khớp số».
  assert.match(js, /if \(c\.status === 200 && \(c\.d\.khach \|\| \[\]\)\.length\) \{[\s\S]*?\} else if \(c\.status === 200\) \{[\s\S]*?'Không khách nào khớp số này'/);
});

test('B3 · hồ sơ theo bản vẽ 1b: ba thẻ kênh (WhatsApp nói «chưa nối»), bảng mọi đơn cả hai luồng, cột Hàng nói rõ chưa có món', () => {
  const ho = (js.match(/async function moHoSo\([\s\S]*?\n\}\n/) || [''])[0];
  assert.ok(ho, 'không thấy moHoSo');
  assert.match(ho, /\$\{the\('Messenger',[\s\S]*?\$\{the\('Trang bán hàng \(Ladi\)',[\s\S]*?\$\{the\('WhatsApp', '', wa \? 'Chưa nối — kênh này chưa nằm trong phép gộp\.'/);
  assert.match(ho, /href="\/ban-hoi-thoai\?ht=\$\{encodeURIComponent\(ht\[0\]\.id\)\}">Mở trong Hộp thư →/);
  assert.match(ho, /<th scope="col">Mã POS<\/th><th scope="col">Luồng<\/th><th scope="col">Hàng<\/th>/);
  assert.match(ho, /Cột «Hàng»: dữ liệu đơn chưa lưu món — xem chi tiết trên POS\./, 'không bịa món — dữ liệu đơn không có');
  assert.match(ho, /Rủi ro hoàn tính từ các đơn đã kết \(giao hoặc hoàn\) của CHÍNH hồ sơ này/);
});

test('B4 · việc cũ của «Khách hàng» còn nguyên cho quản trị · quản lý: danh sách mọi khách có phân trang · báo tách dòng · ba kênh', () => {
  const tq = (js.match(/async function tongQuan\([\s\S]*?\n\}\n/) || [''])[0];
  assert.ok(tq, 'không thấy tongQuan');
  assert.match(tq, /doc\(`\/api\/ho-so-khach\?trang=\$\{trang\}`\)/);
  assert.match(tq, /^async function tongQuan\(trang\) \{\n  if \(!CUA\.danhSach\) \{ baoRong\(\); return; \}/, 'vai không có cửa cũ (sale) ⇒ mời gõ số, KHÔNG gọi cửa rồi ăn 403');
  for (const cau of ['người đang nằm ở nhiều dòng khách khác nhau', 'dòng khách không có số điện thoại', 'đơn chưa nối được về khách nào',
    'Đã đọc tới trần', 'Mọi khách của team', 'Ba kênh dữ liệu khách']) assert.ok(tq.includes(cau), `mất việc cũ: «${cau}»`);
  assert.match(tq, /tongQuan\(trang - 1\)[\s\S]*tongQuan\(trang \+ 1\)/, 'phân trang');
  assert.match(js, /if \(!q\) \{ await tongQuan\(0\); return; \}/);
});

test('B5 · lối vào từ Hộp thư + Hộp thư mở thẳng hội thoại bằng `?ht=`', () => {
  const h = fs.readFileSync(new URL('../../src/ui/ban-hoi-thoai/trang/ban-hoi-thoai.html', import.meta.url), 'utf8');
  assert.match(h, /<a class="lien-ke ban-ht-tim-cu" href="\/ho-so-khach">Tìm khách cũ — xem đủ các kênh →<\/a>/);
  assert.match(h, /\{ const ht0 = new URLSearchParams\(location\.search\)\.get\('ht'\); if \(ht0\) mo\(ht0\); \}/);
});
