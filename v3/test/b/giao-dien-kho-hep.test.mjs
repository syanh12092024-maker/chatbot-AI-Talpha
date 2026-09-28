// KHỔ HẸP VÀ MÀN CẢM ỨNG — ba lỗi audit giao diện 28/09 (ui-taste) bắt được trên điện thoại.
// Ca đọc thẳng mã trang: đổi ngược một trong ba chỗ này là màn lại vỡ ở 390px mà không bài
// test hành vi nào kêu (các ca khác chạy phía máy chủ).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const doc = (p) => readFileSync(fileURLToPath(new URL('../../src/ui/' + p, import.meta.url)), 'utf8');

test('Tất cả page · bảng xếp thẻ ở khổ hẹp, «Còn thiếu gì» lên góc phải', () => {
  const h = doc('page-bot/trang/page-bot.html');
  assert.match(h, /<table class="data-table" data-hep="the">/);
  assert.match(h, /<td class="c-dem">\$\{veCuaKiem\(p\.cuaKiem\)\}<\/td>/);
  for (const nhan of ['Bot', 'Marketer', 'Thị trường · ngành hàng']) {
    assert.ok(h.includes(`data-nhan="${nhan}"`), `thiếu nhãn ô «${nhan}» cho dạng thẻ`);
  }
});

test('Việc đang chờ · xem nhanh là NGĂN KÉO — mở được ở mọi khổ, không nằm dưới đáy trang', () => {
  // Bản 4 (28/09) thay cách vá cuộn-tới-ô của 7ed6dc6: ô xem nhanh thành <dialog class="drawer">,
  // phủ trên danh sách ở mọi khổ — hết cảnh bấm dòng trên điện thoại mà không thấy gì.
  const h = doc('dispatch/trang/dieu-phoi.html');
  assert.match(h, /<dialog class="drawer" id="ngan"/);
  assert.match(h, /ngan\.showModal\(\)/);
  assert.match(h, /id="o-xem"/, 'ô cho khối «Đánh dấu đã xử» vẫn phải có');
});

test('Việc đang chờ · MỘT hàng đợi xếp theo hạn, đồng hồ là cột đầu', () => {
  const h = doc('dispatch/trang/dieu-phoi.html');
  assert.match(h, /data-kieu="hang-doi"/);
  assert.match(h, /<td class="num c-dem"><span class="dong-ho"/, 'đồng hồ phải là ô đầu của hàng');
  assert.match(h, /\.sort\(\(a, b\) => han\(a\) - han\(b\)\)/, 'hai loại trộn lại phải xếp theo hạn');
});

test('nút × của nhãn · vùng bấm nở ra, màn cảm ứng ≥ 40px', () => {
  const c = doc('chung/kieu.css');
  assert.match(c, /\.chip button::after \{ content: ""; position: absolute; inset: -4px; \}/);
  const cam = c.slice(c.indexOf('@media (pointer: coarse)'));
  assert.match(cam, /\.chip button \{ width: 28px; height: 28px; \}/);
  assert.match(cam, /\.chip button::after \{ inset: -6px; \}/);
});

test('bảng dạng thẻ · cột phải không được nở theo chữ dài (chồng chữ ở 390px, 28/09)', () => {
  const c = doc('chung/kieu.css');
  assert.match(c, /\.data-table\[data-hep="the"\] tbody tr \{ display: grid; grid-template-columns: minmax\(0, 1fr\) fit-content\(50%\);/);
  assert.match(c, /min-width: 0; overflow-wrap: anywhere;/);
});
