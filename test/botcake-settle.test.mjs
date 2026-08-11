// CHỜ TỚI KHI BOTCAKE IM HẲN — "bao giờ bot không gửi nữa thì mới gọi AI".
//
// Xuất xứ 11/08/2026: 50% tiền token chảy vào tin AI soạn xong rồi bị vứt vì
// Botcake nói trước. Bản trước ngủ một mạch rồi soi một lần ở cuối nên vừa lọt
// (Botcake nói muộn hơn mốc soi) vừa chậm (Botcake nói sớm vẫn phải ngủ hết).
import test from 'node:test';
import assert from 'node:assert/strict';

process.env.AI_SETTLE_POLL_MS = '50';
const { waitBotcakeSettled } = await import('../src/pancake-poll.js');

const PAGE = '999';
const base = [{ id: 'm1', from: { id: 'CUST' } }];
const daNoi = [...base, { id: 'm2', from: { id: PAGE } }];

const dep = (fn) => ({ getMessages: fn, sleep: (ms) => new Promise((r) => setTimeout(r, ms)) });

test('S1 · Botcake nói giữa chừng → BỎ LƯỢT NGAY, không chờ hết ngưỡng', async () => {
  let lan = 0;
  const r = await waitBotcakeSettled(PAGE, 'c1', 'k1', base, 2000, dep(async () => (++lan >= 3 ? daNoi : base)));
  assert.equal(r.spoke, true, 'phải phát hiện page đã nói');
  // Thoát sớm là điểm sống còn: vừa chưa tiêu token, vừa trả slot semaphore sớm.
  assert.ok(r.waitedMs < 1200, `phải thoát sớm, thực tế chờ ${r.waitedMs}ms`);
});

test('S2 · page im suốt → chờ đủ ngưỡng rồi mới cho AI chạy', async () => {
  const r = await waitBotcakeSettled(PAGE, 'c1', 'k1', base, 400, dep(async () => base));
  assert.equal(r.spoke, false);
  assert.ok(r.waitedMs >= 380, `phải chờ đủ, thực tế ${r.waitedMs}ms`);
});

test('S3 · Botcake nói ở NGAY TRƯỚC ngưỡng vẫn bắt được (chỗ bản cũ lọt)', async () => {
  let lan = 0;
  const r = await waitBotcakeSettled(PAGE, 'c1', 'k1', base, 500, dep(async () => (++lan >= 8 ? daNoi : base)));
  // Bản cũ soi đúng 1 lần ở cuối; nếu tin tới sau lần soi đó là lọt hẳn.
  assert.equal(r.spoke, true);
});

test('S4 · lỗi mạng khi soi thì soi tiếp, KHÔNG coi là đã im', async () => {
  let lan = 0;
  const r = await waitBotcakeSettled(PAGE, 'c1', 'k1', base, 300, dep(async () => {
    if (++lan <= 2) throw new Error('mạng lỗi');
    return daNoi;
  }));
  assert.equal(r.spoke, true, 'lỗi mạng không được làm mất cửa nhường');
});

test('S5 · đường lui: ngưỡng 0 thì không chờ, không soi lần nào', async () => {
  let goi = 0;
  const r = await waitBotcakeSettled(PAGE, 'c1', 'k1', base, 0, dep(async () => { goi++; return base; }));
  assert.deepEqual(r, { spoke: false, waitedMs: 0 });
  assert.equal(goi, 0, 'ngưỡng 0 mà vẫn gọi API là phí');
});
