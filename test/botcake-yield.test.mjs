// Nghiệm thu CỬA NHƯỜNG BOTCAKE — chủ trương: AI luôn đi sau, không bao giờ nói chồng.
// Điểm dễ sai nhất: `pkGetMessages` trả TỐI ĐA 25 tin nên cửa sổ TRƯỢT ở hội thoại bận.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageSpokeSince } from '../src/pancake-poll.js';

const PAGE = 'P1';
const m = (id, who, text = 'x') => ({ id, from: { id: who === 'page' ? PAGE : 'u1' }, message: text });

test('Y1 · page gửi thêm 1 tin → nhường', () => {
  const before = [m(1, 'cust'), m(2, 'cust')];
  const after = [...before, m(3, 'page', 'Please provide the information below for the shipping')];
  assert.equal(pageSpokeSince(before, after, PAGE), true);
});

test('Y2 · không có gì mới → KHÔNG nhường', () => {
  const before = [m(1, 'cust'), m(2, 'cust')];
  assert.equal(pageSpokeSince(before, [...before], PAGE), false);
});

test('Y3 · chỉ KHÁCH nhắn thêm → KHÔNG nhường (vẫn tới lượt AI)', () => {
  const before = [m(1, 'cust')];
  const after = [...before, m(2, 'cust', 'magkano po')];
  assert.equal(pageSpokeSince(before, after, PAGE), false);
});

test('Y4 · ⚠️ CỬA SỔ TRƯỢT 25 tin — page nói mà độ dài KHÔNG đổi', () => {
  // Đây là ca so-theo-số-lượng sẽ bỏ sót, và nó xảy ra ở hội thoại BẬN NHẤT.
  const before = Array.from({ length: 25 }, (_, i) => m(i + 1, i % 2 ? 'cust' : 'page'));
  const after = [...before.slice(1), m(26, 'page', 'Botcake chen ngang')];
  assert.equal(after.length, before.length, 'độ dài phải bằng nhau — đó chính là cái bẫy');
  assert.equal(pageSpokeSince(before, after, PAGE), true);
});

test('Y5 · cửa sổ trượt nhưng tin mới là của KHÁCH → KHÔNG nhường', () => {
  const before = Array.from({ length: 25 }, (_, i) => m(i + 1, 'cust'));
  const after = [...before.slice(1), m(26, 'cust', 'hello po')];
  assert.equal(pageSpokeSince(before, after, PAGE), false);
});

test('Y6 · nhiều tin mới, chỉ 1 tin của page → vẫn nhường', () => {
  const before = [m(1, 'cust')];
  const after = [...before, m(2, 'cust'), m(3, 'page'), m(4, 'cust')];
  assert.equal(pageSpokeSince(before, after, PAGE), true);
});

test('Y7 · dự phòng khi API không trả id — so tin cuối', () => {
  const noId = (who, text) => ({ from: { id: who === 'page' ? PAGE : 'u1' }, message: text });
  const before = [noId('cust', 'magkano po')];
  assert.equal(pageSpokeSince(before, [...before, noId('page', 'Hello po!')], PAGE), true);
  assert.equal(pageSpokeSince(before, [...before, noId('cust', 'sige')], PAGE), false);
  assert.equal(pageSpokeSince(before, [...before], PAGE), false);
});

test('Y8 · đầu vào rỗng/hỏng không làm nổ', () => {
  assert.equal(pageSpokeSince([], [], PAGE), false);
  assert.equal(pageSpokeSince(null, null, PAGE), false);
  assert.equal(pageSpokeSince(undefined, [m(1, 'page')], PAGE), false); // không có mốc so → không kết luận
});
