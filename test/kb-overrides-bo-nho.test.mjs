// BẢN NHỚ CỦA kb-overrides.json (28/09/2026).
//
// Profile CPU tiến trình bot trên máy chủ: một lượt `/admin/api/readiness` mất 12,4 giây, ~11,7
// giây trong đó là đọc + parse lại tệp 510 KB này cho TỪNG page — và cả tiến trình bot đứng
// theo, vì mọi thứ đồng bộ. Bộ ca canh: đọc MỘT lần, nhưng tệp đổi thì phải thấy bản mới ngay.
process.env.PAGE_REGISTRY = '0';
process.env.READINESS = '0';

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-ov-nho-'));
const TEP = path.join(TMP, 'kb-overrides.json');
process.env.KB_OVERRIDES_FILE = TEP;
process.env.SCRIPT_VERSIONS_DIR = path.join(TMP, 'script-versions');
process.env.PAGES_REGISTRY_FILE = path.join(TMP, 'pages.json');
fs.writeFileSync(TEP, JSON.stringify({ 900001: { config: { greeting: 'Chào A', salesPrompt: 'Bán A' } } }));

const kb = await import('../src/kb.js');
after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* tạm */ } });

/** Đếm số lần tệp overrides bị ĐỌC trong `fn`. */
function demLanDoc(fn) {
  const goc = fs.readFileSync;
  let n = 0;
  fs.readFileSync = function (p, ...r) { if (String(p) === TEP) n++; return goc.call(this, p, ...r); };
  try { fn(); } finally { fs.readFileSync = goc; }
  return n;
}

test('① 700 lượt getPageConfig ⇒ tệp chỉ bị đọc MỘT lần (trước đây: 700 lần)', () => {
  const n = demLanDoc(() => { for (let i = 0; i < 700; i++) kb.getPageConfig('900001'); });
  assert.ok(n <= 1, `đọc tệp ${n} lần — mỗi lần là parse lại 510 KB và bot đứng theo`);
  assert.equal(kb.getPageConfig('900001').greeting, 'Chào A');
});

test('② tệp ĐỔI từ bên ngoài ⇒ lượt đọc kế tiếp thấy bản mới', () => {
  kb.getPageConfig('900001');
  fs.writeFileSync(TEP, JSON.stringify({ 900001: { config: { greeting: 'Chào B mới hơn', salesPrompt: 'Bán B' } } }));
  assert.equal(kb.getPageConfig('900001').greeting, 'Chào B mới hơn',
    'bản nhớ không được giữ kịch bản cũ khi tệp đã đổi');
});

test('③ sửa kết quả trả về KHÔNG làm bẩn bản nhớ', () => {
  const c = kb.getPageConfig('900001');
  c.greeting = 'BỊ SỬA NGOÀI Ý MUỐN';
  assert.notEqual(kb.getPageConfig('900001').greeting, 'BỊ SỬA NGOÀI Ý MUỐN');
});
