// BA MÀN SỐ LIỆU PHẢI KHAI KHOẢNG ĐO — bài canh đúng một câu.
//
// Án lệ 11/09: ba màn dùng BA cửa sổ khác nhau mà chỉ một màn nói ra.
//   · Báo cáo      — «toàn thời gian» cho thước 1, «60 ngày gần nhất» cho hai thước kia
//   · Chi phí      — «toàn thời gian» (gọi /token-cost KHÔNG kèm from/to)
//   · Nguồn khách  — «ảnh chụp lúc này», KHÔNG phải một khoảng ngày
// Người quản lý mở ba màn cạnh nhau rồi so, tưởng cùng một kỳ. Bài này giữ cho lời khai
// còn nguyên khi có người đổi nguồn dữ liệu bên dưới.

import test from 'node:test';
import assert from 'node:assert/strict';

import * as chiPhi from '../../src/ui/chi-phi/kho-chi-phi.js';
import * as nguon from '../../src/ui/nguon-khach/kho-nguon.js';
import * as baoCao from '../../src/ui/bao-cao/kho-bao-cao.js';

test('① Chi phí khai «toàn thời gian», kèm cảnh báo mốc 06/08', () => {
  assert.equal(chiPhi.KHOANG.chu, 'toàn thời gian');
  assert.ok(chiPhi.KHOANG.noi.length > 10, 'phải nói rõ nó cộng cái gì');
  // Mốc này là thật: `src/ai-log.js` chỉ ghi token từ 06/08/2026, nên `measured < replies`
  // trên khoảng rộng. Bỏ cảnh báo đi là mở đường cho một đơn giá rẻ giả.
  assert.match(chiPhi.KHOANG.canhBao, /06\/08\/2026/);
  assert.match(chiPhi.KHOANG.canhBao, /đo được|ĐO ĐƯỢC/);
});

test('② Nguồn khách khai «ảnh chụp lúc này», và cấm đọc thành tỉ lệ rơi', () => {
  assert.equal(nguon.KHOANG.chu, 'ảnh chụp lúc này');
  // Chú thích trong `noi-day/cau-bot-v1.js#pheuHoiThoai` ghi «nơi gọi phải nói rõ điều đó».
  assert.match(nguon.KHOANG.canhBao, /tỉ lệ rơi/);
});

test('③ Báo cáo: mỗi thước tự khai khoảng của nó, không thước nào bỏ trống', () => {
  const ds = Object.values(baoCao.THUOC);
  assert.ok(ds.length >= 3, 'quét hụt — bài này sẽ xanh giả');
  for (const t of ds) {
    assert.ok(t.khoang && String(t.khoang).trim(), `thước ${t.ma} không khai khoảng`);
    assert.ok(t.nguon && String(t.nguon).trim(), `thước ${t.ma} không khai nguồn số`);
  }
});

test('④ BA khoảng KHÔNG giống nhau — đó chính là lý do phải khai', () => {
  const tap = new Set([
    chiPhi.KHOANG.chu,
    nguon.KHOANG.chu,
    ...Object.values(baoCao.THUOC).map((t) => t.khoang),
  ]);
  assert.ok(tap.size >= 3,
    `chỉ có ${tap.size} khoảng khác nhau: ${[...tap].join(' · ')} — nếu thật sự đã gộp về `
    + 'cùng một khoảng thì sửa bài này, nhưng phải sửa có chủ ý');
});
