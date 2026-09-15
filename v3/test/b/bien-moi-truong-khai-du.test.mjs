// THƯỚC: mọi biến `V3_*` mà CODE đọc đều phải có dòng trong bảng khai duy nhất
// `docs/v3/ban-giao/bien-moi-truong-v3.md`.
//
// VÌ SAO CÓ THƯỚC NÀY (đo 15/09/2026): bảng khai 7 biến, code đọc 18. Trong 11 biến không
// khai có `V3_KHOA_VE` — thiếu nó thì `v3/chay-that.js` **exit 1 ngay lúc khởi động**, và
// người cutover không có một dòng giấy nào để tra. Đó đúng là cảnh H9 (sổ §8) cảnh báo:
// «thiếu là cửa đóng câm». Giấy trôi khỏi code là chuyện xảy ra lặng lẽ, nên phải có máy canh.
//
// Ở ĐÂY chứ không phải chỉ trong `ops/bin/nghiem-thu/*.sh`: `npm test` chạy `v3/test/b/*.test.mjs`
// mỗi lượt, còn cổng chỉ chạy ở gate — giữa hai gate thì đột biến sống (bẫy án lệ #34 của
// skill `tho-thi-cong`).
//
// Thước KHÔNG có danh sách gõ tay (bẫy án lệ #22): danh sách biến lấy TỪ CODE, danh sách
// khai lấy TỪ BẢNG. Sửa code thêm biến mà quên giấy ⇒ đỏ; xoá dòng giấy của biến đang dùng
// ⇒ đỏ.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const BANG = path.join(GOC, 'docs/v3/ban-giao/bien-moi-truong-v3.md');

/** Nơi CODE THẬT sống. Cố ý bỏ `test/` — bộ ca tự đặt biến cho mình, không phải cấu hình vận hành. */
const CAY = ['src', 'v3/src', 'db', 'ops/systemd'];
const TEP_LE = ['v3/chay-that.js', 'v3/xem-thu.js'];
const DUOI = new Set(['.js', '.mjs', '.cjs', '.sql', '.service', '.sh']);

const BIEN = /\bV3_[A-Z0-9_]+/g;

function duyet(thuMuc, gom = []) {
  let ds;
  try { ds = fs.readdirSync(thuMuc, { withFileTypes: true }); } catch { return gom; }
  for (const d of ds) {
    const p = path.join(thuMuc, d.name);
    if (d.isDirectory()) {
      if (d.name === 'node_modules' || d.name === 'test') continue;
      duyet(p, gom);
    } else if (DUOI.has(path.extname(d.name))) gom.push(p);
  }
  return gom;
}

/** Tên biến → danh sách nơi đọc nó, để câu đỏ chỉ thẳng chỗ sửa chứ không bắt đi tìm. */
function bienTrongCode() {
  const tep = [...CAY.flatMap((c) => duyet(path.join(GOC, c))),
    ...TEP_LE.map((t) => path.join(GOC, t)).filter((t) => fs.existsSync(t))];
  const map = new Map();
  for (const t of tep) {
    const noiDung = fs.readFileSync(t, 'utf8');
    for (const m of noiDung.match(BIEN) || []) {
      if (!map.has(m)) map.set(m, new Set());
      map.get(m).add(path.relative(GOC, t));
    }
  }
  return map;
}

/** Bảng khai → {ten: Set, khuon: [tiền tố]}. Dòng có `<…>` là KHUÔN (`V3_KHOA_<NHÀ>`). */
function khaiTrongBang() {
  const md = fs.readFileSync(BANG, 'utf8');
  const ten = new Set(); const khuon = [];
  for (const m of md.match(/`V3_[A-Z0-9_]*(?:<[^`>]*>)?`/g) || []) {
    const t = m.slice(1, -1);
    // `V3_` trần là cách bảng gọi TIỀN TỐ trong câu luật 2 («Tên `V3_` + tiếng Việt không
    // dấu»), không phải một lời khai. Đọc nó thành tên biến thì thước báo đỏ về chính nó.
    if (t === 'V3_') continue;
    if (t.includes('<')) khuon.push(t.slice(0, t.indexOf('<')));
    else ten.add(t);
  }
  return { ten, khuon };
}

test('KHAI ĐỦ · mọi biến V3_* code đọc đều có dòng trong bảng khai duy nhất', () => {
  const code = bienTrongCode();
  const { ten, khuon } = khaiTrongBang();
  assert.ok(code.size > 0, 'không quét được biến nào — thước hỏng, không phải code sạch');

  const thieu = [];
  for (const [b, noi] of code) {
    if (ten.has(b)) continue;
    if (khuon.some((k) => k.length > 3 && b.startsWith(k))) continue; // thuộc một KHUÔN đã khai
    thieu.push(`${b}  ← đọc ở ${[...noi].sort().join(', ')}`);
  }
  assert.deepEqual(thieu, [],
    `Biến V3_* đọc trong code mà KHÔNG có dòng trong docs/v3/ban-giao/bien-moi-truong-v3.md:\n  `
    + thieu.join('\n  ')
    + '\nThêm dòng vào bảng TRONG CÙNG COMMIT với code đọc nó (luật của chính bảng đó).');
});

test('KHAI ĐỦ · dòng giấy không được trỏ vào biến đã chết trong code', () => {
  const code = bienTrongCode();
  const { ten } = khaiTrongBang();
  const thua = [...ten].filter((t) => !code.has(t));
  assert.deepEqual(thua, [],
    `Bảng khai có dòng cho biến KHÔNG code nào đọc nữa: ${thua.join(', ')}.\n`
    + 'Giấy tả một cửa không tồn tại còn tệ hơn không có giấy — bỏ dòng, hoặc nối lại code.');
});

// HAI BIẾN CHẶN KHỞI ĐỘNG — canh riêng, vì hậu quả của chúng khác hẳn «cửa đóng câm»:
// thiếu là DỊCH VỤ KHÔNG LÊN. Ca này đọc thẳng điều kiện trong `chay-that.js` chứ không
// chép lại danh sách — chép lại là thước tự dựng thế giới của nó (bẫy án lệ #1).
test('KHAI ĐỦ · biến mà chay-that.js từ chối chạy khi thiếu thì bảng phải nói rõ', () => {
  const nguon = fs.readFileSync(path.join(GOC, 'v3/chay-that.js'), 'utf8');
  const m = nguon.match(/for \(const bien of \[([^\]]+)\]\)/);
  assert.ok(m, 'không tìm thấy vòng kiểm biến bắt buộc trong v3/chay-that.js — đọc lại tệp đó');
  const batBuoc = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  assert.ok(batBuoc.length >= 2, `chờ ≥2 biến bắt buộc, đọc được ${batBuoc.length}`);

  const md = fs.readFileSync(BANG, 'utf8');
  for (const b of batBuoc) {
    assert.ok(md.includes('`' + b + '`'),
      `\`${b}\` làm chay-that.js exit(1) khi thiếu, mà bảng khai không nhắc tới nó.`);
    assert.match(md, new RegExp('`' + b + '`[\\s\\S]{0,600}?(TỪ CHỐI CHẠY|từ chối chạy)'),
      `bảng có nhắc \`${b}\` nhưng không nói hậu quả «TỪ CHỐI CHẠY» — người cutover đọc xong `
      + 'vẫn không biết vì sao dịch vụ không lên.');
  }
});
