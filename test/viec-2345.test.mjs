// Nghiệm thu 4 việc khớp nối cuối: bóc dữ kiện bot khác · tin đầu là câu hỏi thật ·
// khách quay lại · (việc 5 ghi Sổ AI kiểm bằng tay trên VPS sau deploy).
import './_bat-cua-de-do.mjs';   // PHẢI đứng trước mọi import khác
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyProfile, absorbOtherBot, hydrateProfile, buildProfileBlock } from '../src/context.js';
import { isJustGreeting } from '../src/conv-owner.js';
import { fastLane } from '../src/fast-lane.js';

const PAGE = 'P1';
const msg = (who, text, att = 0) => ({ from: { id: who === 'page' ? PAGE : 'u1' }, message: text, attachments: new Array(att).fill({}) });

// ── VIỆC 2 ───────────────────────────────────────────────────────────────────
test('V2a · bóc dữ kiện từ template Botcake thật', () => {
  const p = emptyProfile();
  absorbOtherBot('👉Your order is 109 SAR. You will receive this gift in the next 2-5 days!', false, p);
  assert.equal(p.otherBot.orderNoted, true);
  const p2 = emptyProfile();
  absorbOtherBot('Please provide the information below for the shipping ✔️Your full name', false, p2);
  assert.equal(p2.otherBot.askedAddress, true);
  const p3 = emptyProfile();
  absorbOtherBot('Hi Gene! How can we help you?', false, p3);
  assert.equal(p3.otherBot.greeted, true);
  const p4 = emptyProfile();
  absorbOtherBot('anything', true, p4);
  assert.equal(p4.otherBot.sentImages, true);
});

test('V2b · hydrateProfile bóc được từ lịch sử thật (lần DUY NHẤT đọc 20 tin thô)', () => {
  const hist = [
    msg('cust', 'hi'),
    msg('page', 'Hi Gene! How can we help you?'),
    msg('page', 'Please provide the information below for the shipping ✔️Your full name'),
    msg('cust', 'ok'),
  ];
  const p = hydrateProfile(hist, PAGE);
  assert.equal(p.otherBot.greeted, true);
  assert.equal(p.otherBot.askedAddress, true);
});

test('V2c · hồ sơ NÓI CHO AI BIẾT bot khác đã làm gì', () => {
  const p = emptyProfile();
  p.otherBot.quotedPrice = true; p.otherBot.sentImages = true;
  const block = buildProfileBlock(p);
  assert.match(block, /Kênh khác/);
  assert.match(block, /ĐÃ BÁO GIÁ/);
  assert.match(block, /ĐỪNG lặp lại/);
});

// ── VIỆC 3 ───────────────────────────────────────────────────────────────────
test('V3 · tin đầu: chào thì nhường Botcake, hỏi thật thì mình trả', () => {
  ['hi po', 'Hello', 'Start', 'kumusta po', 'مرحبا', ''].forEach((t) =>
    assert.equal(isJustGreeting(t), true, `phải nhường: ${JSON.stringify(t)}`));
  ['how much', 'magkano po', 'كم السعر', 'I want to order', 'may stock pa ba?'].forEach((t) =>
    assert.equal(isJustGreeting(t), false, `phải tự trả: ${JSON.stringify(t)}`));
});

// ── VIỆC 4 ───────────────────────────────────────────────────────────────────
const KB = {
  text: '', products: [{ id: 'P1', name: 'X', currency: 'AED', tiers: [{ label: 'SET 1', price: 99 }],
    images: [{ url: 'https://x/1.jpg', label: 'Ảnh sản phẩm' }] }], config: { greeting: 'Xin chào' },
};

test('V4 · khách im >24h quay lại → coi như chạm đầu, KHÔNG im', () => {
  const used = new Set(['greet', 'price']);
  const cũ = fastLane({ text: 'hi po', kb: KB, aiTurns: 3, lastAiText: 'Salamat po!', idleMs: 0, usedLanes: used });
  assert.equal(cũ.reply, null, 'chào lại giữa hội thoại → im (giữ nguyên hành vi cũ)');

  const mới = fastLane({ text: 'hi po', kb: KB, aiTurns: 3, lastAiText: 'Salamat po!', idleMs: 25 * 3600e3, usedLanes: new Set(['greet', 'price']) });
  assert.equal(mới.handled, true);
  assert.ok(mới.reply, 'im 25h rồi quay lại → phải trả lời, không được im');
  assert.ok(mới.images?.length, 'và gửi lại tin đầu đủ ảnh');
});
