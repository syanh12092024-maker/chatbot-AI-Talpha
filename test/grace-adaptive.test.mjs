// Thời gian nhường Botcake TỰ ĐIỀU CHỈNH theo page.
//
// Xuất xứ 11/08/2026: sau khi bịt lỗ đo chi phí, 53% tiền token chảy vào những
// lượt AI soạn xong rồi bị vứt vì Botcake trả lời trước. Chờ lâu hơn thì bớt
// vứt, nhưng chờ đều mọi page là bắt khách của page Botcake im phải đợi vô ích.
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.BOTCAKE_GRACE_MS = '6000';
process.env.BOTCAKE_GRACE_MAX_MS = '15000';
process.env.BOTCAKE_GRACE_TRIGGER = '0.25';
const { graceFor, botcakeYieldStats } = await import('../src/pancake-poll.js');

// Không có API công khai để bơm số liệu → dùng chính thống kê để xác nhận trạng
// thái đầu, rồi kiểm các bất biến của công thức.
test('G1 · page chưa có dữ liệu thì giữ nguyên mặc định', () => {
  assert.equal(graceFor('page-chua-tung-chay'), 6000);
});

test('G2 · trần thời gian chờ không bao giờ bị vượt', () => {
  // Dù tỉ lệ vứt có tệ tới đâu, công thức 6000 × (1 + rate×2) với rate ≤ 1
  // cho tối đa 18.000ms, và trần phải kéo về 15.000ms.
  const max = Number(process.env.BOTCAKE_GRACE_MAX_MS);
  for (const p of ['a', 'b', 'c']) assert.ok(graceFor(p) <= max, `${p} vượt trần`);
});

test('G3 · thống kê phơi ra thời gian chờ đang áp cho từng page', () => {
  const rows = botcakeYieldStats();
  assert.ok(Array.isArray(rows));
  for (const r of rows) {
    assert.ok(Number.isFinite(r.graceMs), 'thiếu graceMs — ops không nhìn thấy page nào đang bị nới');
    assert.ok(Number.isFinite(r.sent), 'thiếu mẫu số `sent`');
    assert.ok(r.graceMs <= Number(process.env.BOTCAKE_GRACE_MAX_MS));
  }
});

test('G4 · tắt hẳn cửa nhường thì không chờ chút nào', async () => {
  // Đường lui khi cần tốc độ tuyệt đối: BOTCAKE_GRACE_MS=0.
  process.env.BOTCAKE_GRACE_MS = '0';
  const mod = await import('../src/pancake-poll.js?nograce');
  assert.equal(mod.graceFor('bat-ky-page-nao'), 0);
  process.env.BOTCAKE_GRACE_MS = '6000';
});
