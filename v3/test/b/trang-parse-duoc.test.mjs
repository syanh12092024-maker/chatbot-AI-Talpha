// MỌI TRANG PHẢI PARSE ĐƯỢC — mở rộng án lệ ⑤c (01/09) từ một tệp ra cả 24 màn.
//
// ═══ VÌ SAO CÓ BÀI NÀY (11/09) ═════════════════════════════════════════════════════
// Án lệ gốc: một dấu huyền ngược lạc trong `dieu-huong.js` đóng chuỗi sớm, cả tệp thành
// lỗi cú pháp, menu biến mất khỏi 25 trang mà trang vẫn hiện bình thường. Bài ⑤c canh
// đúng tệp đó.
//
// Hôm nay dính lần hai, kiểu khác: một phép thay chuỗi chèn khối mới vào GIỮA `async` và
// `function veDongViec` của `chi-tiet-viec.html` — vì chuỗi tìm kiếm `function veDongViec`
// là KHÚC CON của `async function veDongViec`. Trang thành lỗi cú pháp, khối «Đánh dấu đã
// xử» chết, mà 104 bài test của dispatch vẫn XANH: không bài nào đọc script trong trang.
//
// Nên bài này đọc MỌI `trang/*.html` và bắt trình duyệt phân tích từng khối <script>.
// Nó KHÔNG chạy mã — chỉ dựng hàm rồi vứt, nên không có tác dụng phụ.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GOC_UI = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/ui');

function moiTrang() {
  const ra = [];
  for (const man of readdirSync(GOC_UI)) {
    const thu = path.join(GOC_UI, man, 'trang');
    if (!existsSync(thu)) continue;
    for (const f of readdirSync(thu)) {
      if (f.endsWith('.html') || f.endsWith('.js')) ra.push([`${man}/trang/${f}`, path.join(thu, f)]);
    }
  }
  return ra;
}

test('mọi trang màn hình PHẢI phân tích được — một dấu lạc là cả trang chết câm', () => {
  const ds = moiTrang();
  assert.ok(ds.length >= 20, `quét hụt trang (${ds.length}) — bài này sẽ xanh giả`);

  const hong = [];
  for (const [ten, duong] of ds) {
    const s = readFileSync(duong, 'utf8');
    const khoi = ten.endsWith('.js')
      ? [s]
      : [...s.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    for (const ma of khoi) {
      if (!ma.trim()) continue;
      try {
        // Bọc trong hàm async: mã trong trang dùng `await` ở thân các hàm async của nó,
        // và một vài trang có `await` ngay ở tầng ngoài cùng của khối script.
        new Function(`return (async () => { ${ma} });`);
      } catch (e) {
        hong.push(`${ten}: ${e.message}`);
      }
    }
  }
  assert.deepEqual(hong, [], 'trang lỗi cú pháp — trang vẫn hiện, nhưng mọi nút trên đó chết');
});
