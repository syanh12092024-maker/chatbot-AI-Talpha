// PHIẾU LL10 · NHÀ CỦA VIỆC VẬN HÀNH — «Hội thoại và đơn» thành «Cài đặt › Vận hành», nhận `?tab=`, và ba nhà mới
// (Hệ còn sống · Chi phí AI · trang một page) trỏ THẲNG vào đúng tab. Liên kết trỏ vào tab không có là liên kết chết câm.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString('base64');
const mh = await import('../../src/ui/chung/man-hinh.js');
const { VAI } = await import('../../src/auth/boi-canh.js');
const doc = (f) => fs.readFileSync(new URL(`../../src/ui/${f}`, import.meta.url), 'utf8');
const JS = doc('van-hanh/trang/van-hanh.js');
// Bảng tab THẬT của màn Vận hành — đọc từ mã (không chép tay).
const TAB = [...JS.match(/const names = \{([\s\S]*?)\};/)[1].matchAll(/"?([a-z-]+)"?:\s*"/g)].map((m) => m[1]);

test('V1 · màn Vận hành ở cụm Cài đặt, tên khớp đầu trang; không còn ở Hộp thư', () => {
  const m = mh.MAN.find((x) => x.duong === '/van-hanh-v3');
  assert.equal(m.nhom, 'cai-dat'); assert.equal(m.cum, 'cai-dat'); assert.equal(m.ten, 'Vận hành');
  assert.match(doc('van-hanh/trang/van-hanh.html'), /<h1>Vận hành<\/h1>/);
  const hopThu = mh.menuCua([VAI.QUAN_TRI]).find((n) => n.ma === 'hop-thu').man.map((x) => x.duong);
  assert.ok(!hopThu.includes('/van-hanh-v3'));
});

test('V2 · `?tab=` được đọc, kiểm hợp lệ và kiểm vai (tab của quản trị không mở cho vai khác)', () => {
  assert.ok(TAB.length >= 7, `chỉ đọc được ${TAB.length} tab — thước đo nhầm chỗ`);
  assert.match(JS, /new URLSearchParams\(location\.search\)\.get\("tab"\)/);
  assert.match(JS, /if \(muon && names\[muon\] && \(admin \|\| !\["pages", "products"\]\.includes\(muon\)\)\) tab = muon;/);
});

test('V3 · mọi liên kết `/van-hanh-v3?tab=` trong giao diện trỏ vào tab CÓ THẬT', () => {
  const tep = ['suc-khoe/trang/suc-khoe.html', 'chi-phi/trang/chi-phi.html', 'mot-page/trang/mot-page.html', 'mot-page/kho-mot-page.js'];
  const lk = tep.flatMap((f) => [...doc(f).matchAll(/\/van-hanh-v3\?tab=([a-z-]+)/g)].map((m) => `${f}:${m[1]}`));
  assert.ok(lk.length >= 6, `chỉ thấy ${lk.length} liên kết — thiếu nhà mới`);
  assert.deepEqual(lk.filter((x) => !TAB.includes(x.split(':')[1])), [], 'liên kết trỏ vào tab không có');
  for (const [f, t] of [['suc-khoe/trang/suc-khoe.html', 'conversations'], ['suc-khoe/trang/suc-khoe.html', 'bo-qua'],
    ['suc-khoe/trang/suc-khoe.html', 'dien-tap'], ['chi-phi/trang/chi-phi.html', 'chi-phi-tin'], ['mot-page/trang/mot-page.html', 'pages']]) {
    assert.ok(lk.includes(`${f}:${t}`), `${f} thiếu đường vào tab ${t}`);
  }
});
