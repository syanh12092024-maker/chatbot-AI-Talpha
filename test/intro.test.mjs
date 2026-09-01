// Nghiệm thu TIN ĐẦU (tpl_intro) — phải đủ ẢNH + GIÁ + COD + câu chốt.
// Xuất xứ: 94,4% ảnh của hệ thống (2.872/3.041) nằm ở lượt AI đầu tiên — đúng lượt
// Fast Lane chặn. Không gửi ảnh = Fast Lane biến lượt giới thiệu thành tin chữ trơ.
import './_bat-cua-de-do.mjs';   // PHẢI đứng trước mọi import khác
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fastLane, buildIntro } from '../src/fast-lane.js';
import { guardOutbound } from '../src/outbound-guard.js';

const KB = {
  text: 'SET 1: 99 AED | SET 2: 149 AED',
  products: [{
    id: 'P1', name: 'Mentha Tablets', currency: 'AED',
    tiers: [{ label: 'SET 1 (3 pcs)', price: 99 }, { label: 'SET 2 (6 pcs)', price: 149 }],
    images: [
      { url: 'https://x/1.jpg', label: 'Ảnh sản phẩm' },
      { url: 'https://x/2.jpg', label: 'Ảnh sản phẩm' },
      { url: 'https://x/3.jpg', label: 'Feedback' },
    ],
  }],
  config: { greeting: '🥶 Do you often feel a cold sensation at night?' },
};
const KB_NO_PRICE = { text: '', products: [], config: {} };
const FL = (text, extra = {}) => fastLane({ text, kb: KB, aiTurns: 0, lastAiText: '', usedLanes: new Set(), ...extra });

test('I1 · tin đầu có ĐỦ: ảnh + móc + bảng giá + COD + câu chốt', () => {
  const it = buildIntro(KB, 'en');
  assert.ok(it, 'phải dựng được tin đầu');
  assert.equal(it.images.length, 2, 'gửi 2 ảnh sản phẩm');
  assert.match(it.caption, /cold sensation/, 'caption = câu móc của page');
  assert.match(it.text, /99/); assert.match(it.text, /149/);
  assert.match(it.text, /COD|delivery/i);
  assert.match(it.text, /\?/, 'phải kết bằng câu hỏi chốt (nguyên tắc 14)');
});

test('I2 · chỉ lấy ảnh SẢN PHẨM, không lấy feedback ở tin đầu', () => {
  assert.deepEqual(buildIntro(KB, 'en').images.map((i) => i.url), ['https://x/1.jpg', 'https://x/2.jpg']);
});

test('I3 · ba cửa chạm đầu đều trả ảnh + giá', () => {
  for (const t of ['Start', 'hi po', 'how much po']) {
    const r = FL(t);
    assert.equal(r.handled, true, `phải xử lý: ${t}`);
    assert.ok(Array.isArray(r.images) && r.images.length, `phải có ảnh: ${t}`);
    assert.match(r.reply, /99/, `phải có giá: ${t}`);
    assert.ok(r.caption, `phải có caption: ${t}`);
  }
});

test('I4 · tin đầu phải qua được chính cửa kiểm duyệt M09', () => {
  const it = buildIntro(KB, 'en');
  for (const s of [it.caption, it.text]) {
    const v = guardOutbound(s, { kb: KB });
    assert.equal(v.ok, true, `bị M09 chặn bởi ${v.rule}: ${s.slice(0, 50)}`);
  }
});

test('I5 · GIÁ luôn từ bảng giá KB — đổi giá là tin đầu đúng ngay', () => {
  const kb2 = JSON.parse(JSON.stringify(KB));
  kb2.products[0].tiers = [{ label: 'SET 1', price: 129 }];
  const it = buildIntro(kb2, 'en');
  assert.match(it.text, /129/);
  assert.doesNotMatch(it.text, /\b99\b/, 'không được giữ giá cũ');
});

test('I6 · page chưa có bảng giá → KHÔNG gửi tin đầu nửa vời', () => {
  assert.equal(buildIntro(KB_NO_PRICE, 'en'), null);
  assert.equal(fastLane({ text: 'how much', kb: KB_NO_PRICE, aiTurns: 0, usedLanes: new Set() }).handled, false);
});

test('I7 · đã gửi tin đầu rồi thì KHÔNG bắn lại bảng giá ở lượt sau', () => {
  const used = new Set();
  const a = fastLane({ text: 'hi po', kb: KB, aiTurns: 0, usedLanes: used });
  assert.equal(a.handled, true);
  const b = fastLane({ text: 'how much po', kb: KB, aiTurns: 1, lastAiText: a.reply, usedLanes: used });
  assert.equal(b.handled, false, 'hỏi lại sau khi đã báo giá → leo lên AI');
});
