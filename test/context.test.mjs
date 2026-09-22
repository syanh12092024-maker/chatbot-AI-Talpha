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
  RECENT_MSGS, khoangCach, NGAT_MACH_MS, laPingKhach, chonCuaSo,
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

test('C5 · chỉ ghi nhớ đơn đã được backend xác nhận, dùng giá backend', () => {
  const order = { name: 'Amy Añoza', phone: '0536064249', address: 'District 1', city: 'Jeddah', variant: 'Buy 1 Get 1', qty: 2, total_price: 109, cod_confirmed: true };
  const request = { role: 'assistant', content: [
    { type: 'tool_use', id: 'order1', name: 'create_draft_order', input: { ...order, total_price: 1 } },
    { type: 'tool_use', id: 'image1', name: 'send_product_image', input: { category: 'feedback' } },
  ] };
  for (const result of [null, { ok: false }, { ok: true }, 'invalid']) {
    const p = emptyProfile();
    absorbToolUses([request, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'order1', content: JSON.stringify(result) }] }], p);
    assert.equal(p.total, '');
    assert.equal(p.cod, false);
    assert.deepEqual(p.imagesSent, []);
  }
  const p = emptyProfile();
  absorbToolUses([request, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'order1', content: JSON.stringify({ ok: true, order }) }] }], p);
  assert.equal(p.total, '109');
  assert.equal(p.name, 'Amy Añoza');
  assert.equal(p.cod, true);
  assert.deepEqual(missingSteps(p), []);
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


// ═══════════════════════════════════════════════════════════════════════════
// ④ MẠCH TƯ VẤN — khách bỏ dở rồi quay lại
//
// Hồ sơ nén giữ DỮ KIỆN, không giữ LẬP LUẬN. `hoi_thoai.ai_noi_gi` đã có sẵn trong CSDL
// và đã được nạp vào `state.lastAiText`, nhưng trước lượt vá này chỉ cửa chống-lặp dùng —
// prompt không hề thấy. Khách im ba ngày rồi gõ "hello / are you there / ?" thì ba tin
// rỗng đó đẩy đúng đoạn tư vấn ra khỏi cửa sổ 6 tin, và bot chào lại từ đầu.
// ═══════════════════════════════════════════════════════════════════════════

test('C15 · ⭐ câu AI nói gần nhất PHẢI vào prompt — kèm nó đã nói bao lâu trước', () => {
  const p = extractFromText('Melody Tiqui\n0551234567', emptyProfile());
  const block = buildProfileBlock(p, {
    state: 'SELLING', used: 2, max: 6, tier: 'ấm',
    lastAi: 'Buy 2 Get 2 mas sulit po — 4 tuýp 159 SAR.\nIlan po ang gusto niyo?',
    idleMs: 3 * 24 * 3600e3,
  });
  assert.match(block, /AI nói gần nhất \(3 ngày trước\)/);
  assert.match(block, /159 SAR/, 'lập luận của lượt trước phải còn đọc được');
  // Ép MỘT DÒNG: khối hồ sơ đọc theo dòng, một câu hai dòng làm lệch cả khối.
  const dong = block.split('\n').find((l) => l.startsWith('AI nói gần nhất'));
  assert.ok(dong.includes('/ Ilan po'), 'xuống dòng trong câu cũ phải gộp thành " / "');
});

test('C16 · ⭐ im lâu thì NÓI THẲNG tiếp nối; liền mạch thì không thêm dòng thừa', () => {
  const p = emptyProfile();
  const xa = buildProfileBlock(p, { lastAi: 'Ilan po?', idleMs: NGAT_MACH_MS });
  assert.match(xa, /TIẾP NỐI đúng chỗ đang dở/);
  assert.match(xa, /đừng chào lại từ đầu/);
  // Chữ nghĩa phải ĐÚNG thứ đang đo: `idleMs` tính từ lượt AI nói, không phải lượt khách.
  assert.match(xa, /kể từ lượt AI nói gần nhất/);
  assert.doesNotMatch(xa, /[Kk]hách im/, 'không được suy diễn "khách im" — sale/Botcake có thể đã nói');

  const gan = buildProfileBlock(p, { lastAi: 'Ilan po?', idleMs: NGAT_MACH_MS - 1 });
  assert.doesNotMatch(gan, /TIẾP NỐI/, 'cùng một phiên chat thì 6 tin gần nhất đã đủ');

  const chuaNoi = buildProfileBlock(p, {});
  assert.doesNotMatch(chuaNoi, /AI nói gần nhất/, 'AI chưa nói lượt nào thì không có dòng này');
  assert.doesNotMatch(chuaNoi, /TIẾP NỐI/);
});

test('C17 · ⭐⭐ hai dòng mới KHÔNG được phá ngưỡng token', () => {
  // Ngưỡng khối hồ sơ của C11 là 250; ca tệ nhất (có cả hai dòng) phải vẫn lọt 320.
  const p = extractFromText('Amy Añoza\n0536064249\nAlrawdah Jeddah District 1 house 118', emptyProfile());
  p.tier = 'Buy 2 Get 2'; p.qty = 2; p.objections = ['obj_price', 'obj_trust'];
  p.imagesSent = ['feedback', 'chung_nhan']; p.otherBot.quotedPrice = true; p.otherBot.greeted = true;
  const block = buildProfileBlock(p, {
    state: 'SELLING', used: 3, max: 10, tier: 'đang chốt',
    lastAi: 'x'.repeat(500),  // câu cũ dài — phải bị cắt, không được nuốt trọn
    idleMs: 5 * 24 * 3600e3,
  });
  assert.ok(estimateTokens(block) <= 320, `khối hồ sơ ca tệ nhất đang ${estimateTokens(block)} token`);
  assert.ok(!block.includes('x'.repeat(220)), 'câu AI cũ phải cắt ở 200 ký tự');
});

test('C18 · khoangCach đọc được bằng tiếng người ở cả bốn bậc', () => {
  assert.equal(khoangCach(45e3), '45 giây');
  assert.equal(khoangCach(20 * 60e3), '20 phút');
  assert.equal(khoangCach(3 * 3600e3), '3 giờ');
  assert.equal(khoangCach(3 * 24 * 3600e3), '3 ngày');
  assert.equal(khoangCach(0), '0 giây');
  assert.equal(khoangCach(undefined), '0 giây', 'thiếu mốc KHÔNG được ném');
});


// ═══════════════════════════════════════════════════════════════════════════
// ⑤ CỬA SỔ CHỌN THEO NỘI DUNG, KHÔNG THEO VỊ TRÍ
//
// Sáu dòng cuối bất kể chúng nói gì: khách im mấy ngày rồi gõ "hello" · "?" · "are you
// there" là ba slot bay mất, đẩy đúng đoạn tư vấn đang dở ra ngoài cửa sổ.
// ═══════════════════════════════════════════════════════════════════════════

test('C19 · ⭐⭐ TÍN HIỆU MUA không bao giờ được coi là ping', () => {
  // Đây là ca QUAN TRỌNG NHẤT của luật này. Sau câu "ilan po?" thì "1" là SỐ LƯỢNG và
  // "ok"/"opo"/"👍" là ĐỒNG Ý. Bỏ nhầm một trong số đó là bỏ đúng lượt chốt đơn.
  for (const t of ['ok', 'okay', 'sige', 'yes', 'opo', 'oo', 'no', '1', '2', '👍',
                   'hm', 'magkano po', 'Riyadh city', '0551234567', 'ok po sir']) {
    assert.equal(laPingKhach(t), false, `KHÔNG được coi là ping: ${JSON.stringify(t)}`);
  }
});

test('C20 · ping rỗng: chào suông, gọi suông, chỉ dấu câu', () => {
  for (const t of ['hello', 'Hello po', 'hi sir', 'kumusta', 'good morning', 'السلام عليكم',
                   '?', '???', '...', 'are you there', 'you there', 'po', 'sir', 'maam',
                   'anybody', 'reply', 'up', '', '   ']) {
    assert.equal(laPingKhach(t), true, `phải là ping: ${JSON.stringify(t)}`);
  }
});

test('C21 · ⭐ cửa sổ giữ câu hỏi thật, vứt ba tiếng gọi — cùng trần, đúng tin hơn', () => {
  const rows = [
    { role: 'user', text: 'magkano po' },
    { role: 'assistant', text: 'Buy 1 Get 1 — 109 SAR. Ilan po?' },
    { role: 'user', text: 'hello' },
    { role: 'user', text: '?' },
    { role: 'user', text: 'are you there' },
    { role: 'assistant', text: 'Nandito po ako' },
    { role: 'user', text: 'ok' },
  ];
  const cu = rows.slice(-RECENT_MSGS);
  const moi = chonCuaSo(rows, RECENT_MSGS);
  assert.equal(cu.some((r) => r.text === 'magkano po'), false, 'phép cũ ĐÃ đánh rơi câu hỏi gốc');
  assert.equal(moi.some((r) => r.text === 'magkano po'), true, 'phép mới phải giữ lại nó');
  assert.equal(moi.some((r) => r.text === 'ok'), true, 'tín hiệu mua phải còn');
  assert.equal(moi.some((r) => laPingKhach(r.text) && r.role === 'user'), false);
  assert.ok(moi.length <= RECENT_MSGS, 'không được nới trần');
});

test('C22 · cả hội thoại chỉ có tiếng gọi ⇒ giữ phép cũ, không trả cửa sổ rỗng', () => {
  const rows = [{ role: 'user', text: 'hello' }, { role: 'user', text: '?' }];
  assert.deepEqual(chonCuaSo(rows, RECENT_MSGS), rows, 'trống rỗng còn tệ hơn một câu chào');
});

test('C23 · ⭐ khách giục ≥2 lần thì BÓC THÀNH DỮ KIỆN trước khi vứt', () => {
  const nen = (n) => {
    const msgs = [
      { from: { id: PAGE }, message: 'Buy 1 Get 1 — 109 SAR. Ilan po?' },
      ...Array.from({ length: n }, (_, i) => ({ from: { id: 'cust' }, message: i ? '?' : 'hello' })),
      { from: { id: PAGE }, message: 'Nandito po ako' },
    ];
    return buildContextMessages({ prof: emptyProfile(), msgs, pageId: PAGE }).messages[0].content;
  };
  assert.match(nen(3), /Khách đã gọi 3 lần/, 'giục nhiều lần là dữ kiện bán hàng, không phải rác');
  assert.match(nen(3), /vào THẲNG việc/);
  assert.doesNotMatch(nen(1), /Khách đã gọi/, 'một lời chào là bình thường, đừng làm loãng hồ sơ');
});
