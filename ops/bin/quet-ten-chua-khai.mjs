#!/usr/bin/env node
// QUÉT «TÊN CHƯA KHAI» TRÊN SCRIPT TRANG (VE-VA1 · 30/09/2026).
//
// Vì sao: ba lỗi `no-undef` (bao-cao `T` · team `nap` · team `tuKhoTam`) sống 5–15 ngày trên prod — chúng chỉ nổ ở nhánh THAO
// TÁC THẬT, nên thước cấu trúc và lượt bò e2e không chạm tới. Quét tĩnh bắt cả lớp lỗi này trong một lượt.
//
// Cách chạy (KHÔNG thêm gói vào dự án — ESLint do người chạy chỉ ra):
//   mkdir -p /tmp/eslint8 && npm i --prefix /tmp/eslint8 eslint@8.57.0
//   ESLINT_BIN=/tmp/eslint8/node_modules/.bin/eslint node ops/bin/quet-ten-chua-khai.mjs
// rc: 0 = sạch · 1 = có tên chưa khai · 2 = HOÃN (không có ESLint — KHÔNG đọc là đạt).
// Tầm đo: script NỘI TUYẾN của `v3/src/ui/*/trang/*.html` + `trang/*.js` + `chung/ui.js` + `chung/dieu-huong.js`. Trang nạp
// `type="module"` quét ở chế độ module (được `await` ngoài cùng). Biến toàn cục do script khác gắn (`UI` · `DongViecUI` · `HopThu`)
// khai sẵn. KHÔNG đo: lỗi thuộc tính (`d.khongCo`), thứ tự khởi tạo (TDZ), tên do `eval`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BIN = process.env.ESLINT_BIN || '';
if (!BIN || !fs.existsSync(BIN)) {
  console.log(`⏸ HOÃN — không có ESLint (ESLINT_BIN=${JSON.stringify(BIN)}). KHÔNG đọc là đạt. Xem đầu tệp để cài tạm.`);
  process.exit(2);
}
const TAM = fs.mkdtempSync(path.join(os.tmpdir(), 'quet-ten-'));
const UI = path.join(GOC, 'v3/src/ui');
const thuong = [], module = [];
for (const mod of fs.readdirSync(UI)) {
  const d = path.join(UI, mod, 'trang');
  if (!fs.existsSync(d)) continue;
  const dungModule = new Set();
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.html'))) {
    const s = fs.readFileSync(path.join(d, f), 'utf8');
    for (const m of s.matchAll(/<script[^>]*type="module"[^>]*src="[^"]*\/([^/"]+\.js)"/g)) dungModule.add(m[1]);
    let i = 0;
    for (const m of s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      if (!m[1].trim()) continue;
      const ra = path.join(TAM, `${mod}__${f}__${++i}.js`);
      fs.writeFileSync(ra, '\n'.repeat(s.slice(0, m.index).split('\n').length - 1) + m[1]);   // giữ số dòng của tệp gốc
      thuong.push(ra);
    }
  }
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith('.js'))) {
    const ra = path.join(TAM, `${mod}__${f}`);
    fs.copyFileSync(path.join(d, f), ra);
    // Tệp .js được phục vụ dưới tên khác (vd `/van-hanh-v3.js` ⇒ `trang/van-hanh.js`): coi là module nếu trang cùng thư mục nạp
    // một module cùng tên gốc.
    (dungModule.has(f) || [...dungModule].some((x) => x.replace(/-v3\.js$/, '.js') === f) ? module : thuong).push(ra);
  }
}
for (const f of ['chung/ui.js', 'chung/dieu-huong.js']) {
  const ra = path.join(TAM, f.replace('/', '__'));
  fs.copyFileSync(path.join(UI, f), ra);
  thuong.push(ra);
}
const chay = (ds, kieu) => (ds.length ? spawnSync(BIN, ['--no-eslintrc', '--env', 'browser,es2022', '--parser-options=ecmaVersion:2022',
  `--parser-options=sourceType:${kieu}`, '--global', 'UI,DongViecUI,HopThu', '--rule', '{"no-undef":"error"}', ...ds],
  { encoding: 'utf8' }) : { status: 0, stdout: '' });
const a = chay(thuong, 'script'), b = chay(module, 'module');
const ra = (a.stdout + b.stdout).replaceAll(TAM + path.sep, '').trim();
console.log(`tệp đem quét: ${thuong.length + module.length} (module ${module.length})`);
if (ra) console.log(ra);
fs.rmSync(TAM, { recursive: true, force: true });
process.exit(a.status === 0 && b.status === 0 ? 0 : 1);
