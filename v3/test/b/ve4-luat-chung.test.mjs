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
