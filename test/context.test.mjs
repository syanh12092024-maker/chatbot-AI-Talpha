// Nghiệm thu M07 · Context Builder — hồ sơ khách nén thay 20 tin thô.
// Ba điều phải đúng, theo đúng thứ tự quan trọng:
//   ① không được QUÊN thông tin khách đã cho (quên = hỏi lại = mất khách)
//   ② không được VƯỢT ngưỡng 1.400 token/lượt (đó là lý do module này tồn tại)
//   ③ không được để lọt rác page vào prompt (13,7% tin page là rác + template Botcake)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyProfile, extractFromText, absorbToolUses, hydrateProfile, cleanHistory,
  buildProfileBlock, buildContextMessages, missingSteps, estimateTokens,
  RECENT_MSGS,
} from '../src/context.js';

const PAGE = 'P07';
const fromPage = (text) => ({ from: { id: PAGE }, message: text });
const fromCust = (text, attachments) => ({ from: { id: 'cust1' }, message: text, attachments });

// ═══════════════════════════════════════════════════════════════════════════
// ① Trích thông tin bằng REGEX — 0 token
// ═══════════════════════════════════════════════════════════════════════════

test('C1 · ⭐ khối thông tin đơn thật → lấy đủ tên + SĐT + địa chỉ', () => {
  // Nguyên văn dạng khách KSA hay gõ (tên / số / địa chỉ mỗi thứ một dòng).
  const p = extractFromText('Amy Añoza\n0536064249\nAlrawdah Jeddah, District 1 House #118', emptyProfile());
  assert.equal(p.name, 'Amy Añoza');
  assert.equal(p.phone.replace(/\D/g, ''), '0536064249');
  assert.match(p.address, /Jeddah/);
});

test('C2 · SĐT 8 số (ca SilentBoo) vẫn bắt được, giá tiền thì không', () => {
  assert.equal(extractFromText('71566943', emptyProfile()).phone.replace(/\D/g, ''), '71566943');
  assert.equal(extractFromText('109 SAR po ba?', emptyProfile()).phone, '', 'giá tiền không phải SĐT');
});

test('C3 · thông tin cho LẦN ĐẦU không bị tin sau ghi đè', () => {
  const p = extractFromText('my name is Amy, 0536064249', emptyProfile());
  extractFromText('ay mali po, 099', p);           // khách gõ lem nhem sau đó
  assert.equal(p.phone.replace(/\D/g, ''), '0536064249');
  assert.equal(p.name, 'Amy');
});

test('C4 · gói + COD + phản đối vào hồ sơ', () => {
  const p = extractFromText('SET 2 po, ok COD', emptyProfile());
  assert.match(p.tier, /SET\s*2/i);
  assert.equal(p.cod, true);
  extractFromText('ang mahal naman', p);
  assert.deepEqual(p.objections, ['obj_price']);
});

test('C5 · tham số tool là nguồn CHÍNH XÁC nhất — ghi đè được regex', () => {
  const p = emptyProfile();
  absorbToolUses([{
    role: 'assistant',
    content: [
      { type: 'tool_use', name: 'send_product_image', input: { category: 'feedback' } },
      { type: 'tool_use', name: 'send_product_image', input: { category: 'feedback' } }, // trùng → chỉ 1
      { type: 'tool_use', name: 'create_draft_order', input: { name: 'Amy Añoza', phone: '0536064249', address: 'District 1', city: 'Jeddah', variant: 'Buy 1 Get 1', qty: 2, total_price: '109 SAR', cod_confirmed: true } },
    ],
  }], p);
  assert.deepEqual(p.imagesSent, ['feedback']);
  assert.equal(p.name, 'Amy Añoza');
  assert.equal(p.cod, true);
  assert.match(p.address, /District 1, Jeddah/);
  assert.equal(p.qty, 2);
  assert.deepEqual(missingSteps(p), [], 'đủ thông tin → không còn bước thiếu');
});

test('C6 · bước còn thiếu suy ra từ checklist COD, không hỏi model', () => {
  assert.deepEqual(missingSteps(emptyProfile()), ['tên', 'SĐT', 'địa chỉ', 'chọn gói/số lượng', 'xác nhận COD']);
});

// ═══════════════════════════════════════════════════════════════════════════
// ② Dọn rác trước khi nạp (spec §M07)
// ═══════════════════════════════════════════════════════════════════════════

test('C7 · ⭐ bỏ tin page rỗng + template Botcake, GIỮ NGUYÊN tin khách', () => {
  const rows = cleanHistory([
    fromCust('magkano po?'),
    fromPage('<div></div>'),                                   // rác 13,7%
    fromPage('...'),                                           // rác
    fromPage('Please provide the information below for the shipping'), // template Botcake
    fromPage('Your order has been created'),                   // template RTO
    fromPage('SET 1 po 99 SAR 😊'),                            // tin AI thật → giữ
    fromCust('ok sige'),
  ], PAGE);
  assert.deepEqual(rows.map((r) => r.role), ['user', 'assistant', 'user']);
  assert.match(rows[1].text, /SET 1/);
});

test('C8 · tin khách chỉ có ảnh KHÔNG bị bỏ — nó vẫn là lượt của khách', () => {
  const rows = cleanHistory([fromCust('', [{}])], PAGE);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].role, 'user');
});

test('C9 · mỗi tin cắt 300 ký tự', () => {
  const rows = cleanHistory([fromCust('x'.repeat(900))], PAGE);
  assert.equal(rows[0].text.length, 300);
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ Hydrate + khối hồ sơ + mảng messages
// ═══════════════════════════════════════════════════════════════════════════

test('C10 · ⭐ hydrate lần đầu chỉ đọc tin KHÁCH, đánh dấu đã dựng', () => {
  const p = hydrateProfile([
    fromPage('my name is Botcake, 0999999999'),   // tin page KHÔNG được vào hồ sơ
    fromCust('ako si Maria Santos'),
    fromCust('0536064249'),
  ], PAGE);
  assert.equal(p.name, 'Maria Santos');
  assert.equal(p.phone.replace(/\D/g, ''), '0536064249');
  assert.ok(p.hydratedAt > 0, 'phải đánh dấu đã hydrate để lượt sau không nạp lại 20 tin');
});

test('C11 · khối hồ sơ nêu đủ việc cần + cấm đọc lại PII cho khách', () => {
  const p = extractFromText('Amy Añoza\n0536064249\nJeddah District 1', emptyProfile());
  const block = buildProfileBlock(p, { state: 'SELLING', used: 3, max: 10, tier: 'đang chốt' });
  assert.match(block, /Amy Añoza/);
  assert.match(block, /Bước còn thiếu:.*(gói|COD)/);
  assert.match(block, /3\/10/);
  assert.match(block, /không đọc lại cho khách/, 'phải có rào PII — model có sẵn SĐT trong tay');
  assert.ok(estimateTokens(block) <= 250, `khối hồ sơ phải gọn, đang ${estimateTokens(block)} token`);
});

test('C12 · messages hợp lệ với Claude: mở bằng user, kết bằng assistant, xen kẽ', () => {
  const msgs = [];
  for (let i = 0; i < 20; i++) {
    msgs.push(fromCust(`tin khách ${i}`));
    msgs.push(fromPage(`tin page ${i}`));
  }
  msgs.push(fromCust('tin đang xử lý')); // cụm cuối — handler tự đẩy vào, context phải bỏ ra
  const { messages, kept } = buildContextMessages({ prof: emptyProfile(), msgs, pageId: PAGE });

  assert.equal(messages[0].role, 'user', 'Claude bắt buộc mở đầu bằng user');
  assert.equal(messages[messages.length - 1].role, 'assistant', 'handler sẽ đẩy tin khách vào ngay sau');
  for (let i = 1; i < messages.length; i++) {
    assert.notEqual(messages[i].role, messages[i - 1].role, 'không được có hai lượt cùng vai liền nhau');
  }
  assert.ok(kept <= RECENT_MSGS, `chỉ giữ ${RECENT_MSGS} tin gần nhất, đang giữ ${kept}`);
  assert.equal(messages.some((m) => m.content.includes('tin đang xử lý')), false, 'cụm đang xử lý phải bị bỏ ra');
});

test('C13 · ⭐⭐ NGƯỠNG 1.400 TOKEN — hội thoại 30 tin dài vẫn phải lọt', () => {
  // Mô phỏng đúng chỗ v1 tốn tiền: 30 tin, mỗi tin dài, cộng khối template Botcake.
  const msgs = [];
  for (let i = 0; i < 15; i++) {
    msgs.push(fromCust(`Hello po, tanong ko lang po kung magkano ang isa at kung may free delivery ba dito sa amin ${i}. ${'a'.repeat(120)}`));
    msgs.push(fromPage(`Please provide the information below for the shipping. ${'b'.repeat(200)}`));
  }
  const prof = extractFromText('Amy Añoza\n0536064249\nAlrawdah Jeddah District 1', emptyProfile());
  const { messages } = buildContextMessages({ prof, msgs, pageId: PAGE, meta: { state: 'SELLING', used: 3, max: 10, tier: 'đang chốt' } });
  const tok = estimateTokens(messages.map((m) => m.content).join('\n'));
  assert.ok(tok <= 1400, `ngữ cảnh phải ≤1.400 token, đang ${tok}`);
});

test('C14 · ⭐ hồ sơ sống sót qua restart → AI KHÔNG chào lại từ đầu', () => {
  // Vòng 1: server đang chạy, dựng hồ sơ từ lịch sử Pancake.
  const msgs = [fromCust('ako si Amy'), fromCust('0536064249'), fromCust('Jeddah District 1 house 118')];
  const before = hydrateProfile(msgs, PAGE);

  // Vòng 2: server restart — hồ sơ nạp lại từ conv-state.json (mô phỏng bằng JSON round-trip),
  // KHÔNG nạp lại 20 tin thô.
  const after = JSON.parse(JSON.stringify(before));
  const block = buildContextMessages({ prof: after, msgs: [], pageId: PAGE }).messages[0].content;
  assert.match(block, /Amy/);
  assert.match(block, /0536064249/);
  assert.match(block, /Jeddah/);
  assert.ok(after.hydratedAt > 0, 'đã hydrate rồi thì không được hydrate lại');
});
