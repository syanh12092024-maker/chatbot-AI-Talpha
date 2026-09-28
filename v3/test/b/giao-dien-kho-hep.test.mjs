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

test('Việc đang chờ · bấm dòng ở khổ hẹp thì cuộn tới ô xem nhanh, có nút về danh sách', () => {
  const h = doc('dispatch/trang/dieu-phoi.html');
  assert.match(h, /oXemNamDuoi\(tr\)/);
  assert.match(h, /scrollIntoView/);
  assert.match(h, /data-ve-ds/);
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
