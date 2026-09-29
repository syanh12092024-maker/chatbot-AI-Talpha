// PHIẾU VE4 · LUẬT CHUNG THEO BẢN VẼ 2d — bốn tab: Luật · Chính sách/FAQ/Phản đối · Trả lời sẵn · Đề xuất chờ duyệt.
// Hành vi cửa đọc/ghi trên Postgres thật: `test/ve4-khoi-chung.test.mjs`. Tệp này canh tab, quyền, trang, và luật
// «một khối cả team có MỘT chỗ sửa».
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
const { menuCua } = await import('../../src/ui/chung/man-hinh.js');
const { veTabCum } = await import('../../src/ui/chung/khung.js');
const { VAI } = await import('../../src/auth/boi-canh.js');
const tab = (v, d) => [...veTabCum({ nhom: menuCua([v]) }, d).matchAll(/>([^<]+)<\/a>/g)].map((x) => x[1]);

test('Q1 · quản trị: bốn tab đúng thứ tự bản vẽ; marketer: hai tab nó được vào', () => {
  assert.deepEqual(tab(VAI.QUAN_TRI, '/bo-luat'), ['Luật', 'Chính sách · FAQ · Phản đối', 'Trả lời sẵn', 'Đề xuất chờ duyệt']);
  assert.deepEqual(tab(VAI.MARKETER, '/khoi-chung'), ['Chính sách · FAQ · Phản đối', 'Trả lời sẵn']);
});

test('Q2 · màn mới CÙNG vai với cửa đọc/ghi (router-anh) — hai danh sách không được lệch', async () => {
  const { VAI_VAO_DUOC } = await import('../../src/ui/khoi-chung/index.js');
  const { VAI_SUA_SAN_PHAM } = await import('../../src/ui/van-hanh/router-anh.js');
  assert.deepEqual([...VAI_VAO_DUOC].sort(), [...VAI_SUA_SAN_PHAM].sort());
});

test('Q3 · trang: đọc/ghi đúng một cửa kèm X-V3-Action; lưu CHỜ xác nhận; gửi phiên bản; khoá khi team không giữ', () => {
  const h = fs.readFileSync(new URL('../../src/ui/khoi-chung/trang/khoi-chung.html', import.meta.url), 'utf8');
  assert.match(h, /<h1>Chính sách · FAQ · Phản đối<\/h1>/, 'tên màn một nguồn (HK10)');
  assert.match(h, /const DUONG = '\/api\/anh-san-pham\/khoi-chung';/);
  assert.match(h, /'X-V3-Action': '1'/);
  assert.match(h, /if \(!ok\) return;\s*setBusy\(nut, true\);\s*try \{\s*const kq = await goi\(\{ method: 'POST', body: JSON\.stringify\(\{ noiDung: SUA, phienBan: KC\.phienBan \|\| 0 \}\) \}\);/,
    'lưu phải CHỜ hộp xác nhận rồi mới gửi, kèm phiên bản chống đè');
  assert.match(h, /const duoc = !!\(KC && KC\.giu && KC\.giu\.ok\) && !KC\.chuaCo;/, 'team không giữ ⇒ khoá ô sửa');
  assert.doesNotMatch(h, /<style[\s>]|style="/, 'không CSS riêng (HK15)');
});

test('Q4 · MỘT chỗ sửa: trang một page thôi có trình sửa khối chung, chỉ còn tóm tắt + lối sang', () => {
  const h = fs.readFileSync(new URL('../../src/ui/mot-page/trang/mot-page.html', import.meta.url), 'utf8');
  assert.doesNotMatch(h, /\/api\/anh-san-pham\/khoi-chung/, 'trang một page còn đường ghi khối chung — hai chỗ sửa một khối');
  assert.match(h, /<a href="\/khoi-chung">Sửa ở Luật chung › Chính sách · FAQ · Phản đối →<\/a>/);
});

test('Q5 · VE4b · cửa /api/bo-luat nói bot có đọc quy tắc chung không — theo công tắc thật (bật · tắt · chưa nối)', async (t) => {
  const http = await import('node:http');
  const express = (await import('express')).default;
  const { dungPhanB } = await import('../../src/vai-b.js');
  const { bam } = await import('../../src/auth/mat-khau.js');
  const { dungCongGia } = await import('../../testkit/db-gia.js');
  const { boiCanhMay } = await import('../../src/auth/boi-canh.js');
  const { datDocHieuLuc } = await import('../../src/ui/prompt-page/kho-prompt.js');
  const { taoTruyVan } = dungCongGia({
    nguoi_dung: [{ id: 'u1', email: 'qt@t.vn', mat_khau_hash: await bam('matkhau1'), ten: 'Chủ', hoat_dong: true }],
    team: [{ id: 't1', slug: 'tieu-alpha', ten: 'Tiểu Alpha', la_ky_thuat: false }],
    vai: [{ id: 'v1', ma: 'quan-tri', ten: 'Quản trị' }],
    thanh_vien_team: [{ id: 'tv1', nguoi_dung_id: 'u1', team_id: 't1', vai_id: 'v1' }],
    page: [], bo_luat_chung: [],
  });
  const app = express();
  dungPhanB(app, { taoTruyVan, taoTruyVanHeThong: () => taoTruyVan(boiCanhMay('_he_thong', 'đọc bảng dùng chung')), express });
  const sv = http.createServer(app); await new Promise((r) => sv.listen(0, r));
  t.after(() => { sv.close(); datDocHieuLuc(null); });
  const goc = `http://127.0.0.1:${sv.address().port}`;
  const ck = (await fetch(`${goc}/api/dang-nhap`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'qt@t.vn', matKhau: 'matkhau1' }) })).headers.get('set-cookie').split(';')[0];
  const doc = async () => { const r = await fetch(`${goc}/api/bo-luat`, { headers: { cookie: ck } }); assert.equal(r.status, 200); return (await r.json()).botDocLuat; };
  datDocHieuLuc(null); assert.equal(await doc(), null, 'chưa nối phép đo ⇒ CHƯA BIẾT, không đoán');
  datDocHieuLuc(() => ({ coBat: false })); assert.equal(await doc(), false);
  datDocHieuLuc(() => ({ coBat: true })); assert.equal(await doc(), true);
});

test('Q6 · VE4b · trang Luật: mọi câu hứa «có hiệu lực ngay / đổi cách nói» chỉ ở nhánh bot ĐÃ đọc; tắt ⇒ cảnh báo', () => {
  const h = fs.readFileSync(new URL('../../src/ui/bo-luat/trang/bo-luat.html', import.meta.url), 'utf8');
  assert.match(h, /const botDoc = \(\) => D && D\.botDocLuat === true;/);
  assert.match(h, /body: botDoc\(\)\n\s+\? `\$\{so\(a\.tongPage\)\} page sẽ đổi cách nói với khách/, 'hộp xác nhận Áp phải hỏi công tắc');
  assert.match(h, /toast\(botDoc\(\)\n\s+\? `Đã/, 'câu báo sau khi áp phải hỏi công tắc');
  assert.equal((h.match(/Có hiệu lực ngay/g) || []).length, 1, '«Có hiệu lực ngay» chỉ được ở nhánh đã bật');
  assert.equal((h.match(/từ lượt chat kế tiếp/g) || []).length, 1);
  assert.doesNotMatch(h, /Áp một bản là cả team đổi cách nói/, 'câu phụ đầu trang còn hứa gõ cứng');
  assert.match(h, /\$\('#hieu-luc'\)\.innerHTML = botDoc\(\) \? '' :/);
  assert.match(h, /D = d; SUA = !!d\.suaDuoc;[\s\S]{0,300}veHieuLuc\(\);/, 'cảnh báo phải được vẽ khi nạp');
});

test('Q7 · VE4b · không còn câu «không có khối quy tắc cứng nào» (hằng CORE luôn đứng đầu); báo «không bản nào áp» theo công tắc', () => {
  // Bỏ dòng chú thích — chú thích được phép trích câu cũ để kể vì sao nó sai.
  const kho = fs.readFileSync(new URL('../../src/ui/bo-luat/kho-bo-luat.js', import.meta.url), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  const h = fs.readFileSync(new URL('../../src/ui/bo-luat/trang/bo-luat.html', import.meta.url), 'utf8');
  assert.doesNotMatch(kho + h, /không có khối quy tắc cứng nào|mà không có quy tắc chung nào/);
  assert.match(h, /kh\.push\(botDoc\(\)\n\s+\? canhBao\(\{ level: 'error', title: 'Không có bản nào đang áp'/);
});
