// Nghiệm thu M05 · Conversation Owner. Dữ liệu lấy NGUYÊN VĂN từ hội thoại thật
// kéo về từ Pancake ngày 10/08/2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksHuman, decideConv, S, OWNER } from '../src/conv-owner.js';
import { isAutomationTemplate } from '../src/bot-registry.js';
import { setConvState, getConv } from '../src/conv-state.js';

const PAGE = 'P1';
const CUST = 'c-uuid';
const msg = (who, text, extra = {}) => ({ from: { id: who === 'page' ? PAGE : 'u1' }, message: text, ...extra });
let n = 0;
const newConv = (tags = []) => ({ id: 'conv' + (++n) + '_' + Math.random().toString(36).slice(2), tags, from: { name: 'Tester' } });

// ═══════════════════════════════════════════════════════════════════════════
// Nhận diện TIN MÁY
// ═══════════════════════════════════════════════════════════════════════════

test('B1 · nhận ra template Botcake thật', () => {
  const tpl = [
    'Please provide the information below for the shipping ✔️Your full name ✔️Contact number:',
    '👉Your order is 109 SAR. You will receive this gift in the next 2-5 days! ❤️',
    'Hello, has any staff contacted you again to deliver your order yet?',
    "Dear, I'm still waiting for your reply.",
    'Hi Gene! How can we help you?',
    'Gene Santiago đã trả lời một quảng cáo.',
    'Parbez Miya replied to an ad.',
    'EXCLUSIVE 20% OFF JUST FOR YOU! We are offering you a 20% discount on this order.',
    '"https://wa.link/ww3c9c Please click this link and send me your location on WhatsApp."',
    'Hello Sir/Madam, I checked the system and saw that the delivery was unsuccessful',
  ];
  for (const t of tpl) assert.equal(isAutomationTemplate(t), true, `phải nhận ra là máy: ${t.slice(0, 45)}`);
});

test('B2 · ký tự vô hình = chắc chắn máy', () => {
  assert.equal(isAutomationTemplate('\u{E001C}\u{E0106}Hello, anything new?'), true);
});

test('B3 · KHÔNG nhận nhầm tin người thật gõ là máy', () => {
  for (const t of ['ok dear', 'thanks madam', 'yess dear', 'pls wait', 'helooo sis', 'wlcome', '❤️ take care po']) {
    assert.equal(isAutomationTemplate(t), false, `không được coi là máy: ${t}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Nhận diện NGƯỜI THẬT
// ═══════════════════════════════════════════════════════════════════════════

test('H1 · tin sale gõ tay (thật) → là người', () => {
  for (const t of ['ok dear', 'thanks madam', 'yess dear', 'pls wait', 'helooo sis']) {
    assert.equal(looksHuman(t, []), true, `phải là người: ${t}`);
  }
});

test('H2 · template / tin rỗng / link → KHÔNG phải người', () => {
  const notHuman = [
    'Please provide the information below for the shipping ✔️Your full name',
    '<div></div>', '...', '', '   ',
    'https://wa.link/ww3c9c',
    '👉Your order is 109 SAR. You will receive this gift in the next 2-5 days!',
  ];
  for (const t of notHuman) assert.equal(looksHuman(t, []), false, `không được coi là người: ${JSON.stringify(t.slice(0, 40))}`);
});

test('H3 · ⚠️ tin của CHÍNH BOT MÌNH → KHÔNG phải người (nếu sai là AI tự khoá mình)', () => {
  const aiTexts = ['Hello po! 😊 SET 1 (3 pcs) — 99 AED po. Ilan po ang gusto niyo?'];
  assert.equal(looksHuman('Hello po! 😊 SET 1 (3 pcs) — 99 AED po. Ilan po ang gusto niyo?', aiTexts), false);
  // Sổ AI chỉ lưu 80 ký tự đầu — tin đầy đủ dài hơn vẫn phải khớp
  const truncated = ['Yay! Order received na po, Amy! 🎉💕 ✅ Combo: Buy 1 Get 1 FREE — 109 SAR ✅ Addr'];
  assert.equal(looksHuman('Yay! Order received na po, Amy! 🎉💕 ✅ Combo: Buy 1 Get 1 FREE — 109 SAR ✅ Address: Jeddah', truncated), false);
});

test('H4 · tin dài lạ → coi là MÁY (thận trọng: thà để AI chạy tiếp còn hơn im oan)', () => {
  const longUnknown = 'A'.repeat(200);
  assert.equal(looksHuman(longUnknown, []), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// Máy trạng thái
// ═══════════════════════════════════════════════════════════════════════════

test('D1 · đơn đã chốt (thẻ Pancake) → POST_SALE, AI im', () => {
  const c = newConv([-2, 3, 6]);
  const r = decideConv({ pageId: PAGE, conv: c, custId: CUST, msgs: [msg('cust', 'hello'), msg('cust', 'san na order ko')] });
  assert.equal(r.allow, false);
  assert.equal(r.state, S.POST_SALE);
});

test('D2 · tin đầu của khách → nhường Botcake chào', () => {
  const c = newConv();
  const r = decideConv({ pageId: PAGE, conv: c, custId: CUST, msgs: [msg('cust', 'Start')] });
  assert.equal(r.allow, false);
  assert.equal(r.state, S.GREET);
  assert.equal(r.owner, OWNER.BOTCAKE);
});

test('D3 · tin cuối là của page → chưa tới lượt AI', () => {
  const c = newConv();
  const r = decideConv({ pageId: PAGE, conv: c, custId: CUST, msgs: [msg('cust', 'hi'), msg('cust', 'how much'), msg('page', 'Hello po!')] });
  assert.equal(r.allow, false);
});

test('D4 · khách nhắn tin thứ 2 → AI ĐƯỢC nói', () => {
  const c = newConv();
  const r = decideConv({ pageId: PAGE, conv: c, custId: CUST, msgs: [msg('cust', 'hi'), msg('cust', 'magkano po')] });
  assert.equal(r.allow, true);
  assert.equal(r.owner, OWNER.AI);
});

test('D5 · ⭐ Botcake chen ngang → AI VẪN nói (template không phải người thật)', () => {
  // Đây là ca Cristita Andales: Botcake dội checklist giữa lúc AI đang bán.
  const c = newConv();
  const msgs = [
    msg('cust', 'hi'), msg('cust', 'magkano po'),
    msg('page', 'Yes po! 🚚 FREE SHIPPING kami. So ready na ba sa address mo? 😊'),
    msg('page', 'Please provide the information below for the shipping ✔️Your full name ✔️Contact number:'),
    msg('cust', 'Am free delivet ba kau?'),
  ];
  const aiTexts = ['Yes po! 🚚 FREE SHIPPING kami. So ready na ba sa address mo? 😊'];
  const r = decideConv({ pageId: PAGE, conv: c, custId: CUST, msgs, aiTexts });
  assert.equal(r.allow, true, 'template Botcake không được làm AI im');
});

test('D6 · ⭐ SALE người thật nhắn → AI nhường VĨNH VIỄN', () => {
  const c = newConv();
  const msgs = [
    msg('cust', 'hi'), msg('cust', 'magkano po'),
    msg('page', 'Hello po! 😊 SET 1 — 99 AED po.'),
    msg('page', 'ok dear'),                 // ← sale gõ tay
    msg('cust', 'sige po'),
  ];
  const aiTexts = ['Hello po! 😊 SET 1 — 99 AED po.'];
  const r = decideConv({ pageId: PAGE, conv: c, custId: CUST, msgs, aiTexts });
  assert.equal(r.allow, false);
  assert.equal(r.state, S.HANDOFF);
  assert.equal(r.owner, OWNER.SALE);

  // lượt sau vẫn im, kể cả khi sale không nói nữa
  const r2 = decideConv({ pageId: PAGE, conv: c, custId: CUST, msgs: [...msgs, msg('cust', 'hello?')] });
  assert.equal(r2.allow, false);
  assert.equal(r2.state, S.HANDOFF);
});

test('D7 · HANDOFF/POST_SALE đã ghi thì giữ nguyên qua restart', () => {
  const c = newConv();
  setConvState(c.id, S.HANDOFF, OWNER.SALE, 'khiếu nại');
  const r = decideConv({ pageId: PAGE, conv: c, custId: CUST, msgs: [msg('cust', 'a'), msg('cust', 'b')] });
  assert.equal(r.allow, false);
  assert.equal(r.state, S.HANDOFF);
});

test('D8 · QUALIFY → SELLING sau khi AI đã nói', () => {
  const c = newConv();
  const msgs = [msg('cust', 'hi'), msg('cust', 'magkano po')];
  assert.equal(decideConv({ pageId: PAGE, conv: c, custId: CUST, msgs }).state, S.QUALIFY);
  getConv(c.id).aiTurns = 1;
  assert.equal(decideConv({ pageId: PAGE, conv: c, custId: CUST, msgs }).state, S.SELLING);
});

test('D9 · tin page rỗng/sticker không bị coi là người thật', () => {
  const c = newConv();
  const msgs = [
    msg('cust', 'hi'), msg('cust', 'magkano po'),
    msg('page', '<div></div>'), msg('page', '...'),
    msg('cust', 'hello po'),
  ];
  assert.equal(decideConv({ pageId: PAGE, conv: c, custId: CUST, msgs }).allow, true);
});
