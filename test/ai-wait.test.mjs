// HAI MỨC CHỜ — theo thứ tự ưu tiên chủ dự án chốt: Botcake → Fast Lane → AI.
//
// Xuất xứ 11/08/2026: sau khi bịt lỗ đo chi phí, 53% tiền token chảy vào những
// lượt AI soạn xong rồi bị vứt vì Botcake trả lời trước.
//
// Bản vá đầu bắt CẢ Fast Lane chờ lâu hơn — sai, vì Fast Lane tốn 0 token, bắt
// nó chờ là thiệt khách mà không tiết kiệm được gì. Nay tách đôi:
//   · chờ chung 6s   → Botcake kịp nói, Fast Lane trả ngay sau đó
//   · chờ riêng AI   → chỉ tầng tốn tiền mới phải đợi, và tự nới theo page
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.AI_WAIT_MS = '8000';
process.env.AI_WAIT_MAX_MS = '20000';
process.env.AI_WAIT_TRIGGER = '0.25';
const { aiWaitFor, botcakeYieldStats } = await import('../src/pancake-poll.js');

test('W1 · page chưa có dữ liệu thì dùng mức nền', () => {
  assert.equal(aiWaitFor('page-chua-tung-chay'), 8000);
});

test('W2 · không bao giờ vượt trần', () => {
  const max = Number(process.env.AI_WAIT_MAX_MS);
  for (const p of ['a', 'b', 'c']) assert.ok(aiWaitFor(p) <= max, `${p} vượt trần`);
});

test('W3 · Fast Lane KHÔNG bị mức chờ này chạm tới', async () => {
  // Mức chờ của AI nằm trong callback `beforeAi`, mà `beforeAi` chỉ chạy SAU khi
  // Fast Lane đã bỏ cuộc (handler.js). Chốt bằng cấu trúc: fast-lane.js không
  // được biết gì về aiWaitFor.
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/fast-lane.js', import.meta.url), 'utf8');
  assert.ok(!/aiWaitFor|AI_WAIT_MS/.test(src), 'Fast Lane không được dính mức chờ của AI');
});

test('W4 · thống kê phơi ra mức chờ đang áp cho từng page', () => {
  for (const r of botcakeYieldStats()) {
    assert.ok(Number.isFinite(r.aiWaitMs), 'thiếu aiWaitMs — ops không thấy page nào đang bị nới');
    assert.ok(Number.isFinite(r.sent), 'thiếu mẫu số `sent`');
    assert.ok(r.aiWaitMs <= Number(process.env.AI_WAIT_MAX_MS));
  }
});

test('W5 · đường lui: AI_WAIT_MS=0 thì AI không chờ thêm chút nào', async () => {
  process.env.AI_WAIT_MS = '0';
  const mod = await import('../src/pancake-poll.js?nowait');
  assert.equal(mod.aiWaitFor('bat-ky-page-nao'), 0);
  process.env.AI_WAIT_MS = '8000';
});
