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
  noiNgoaiVung, khachTuChoi, absorbOtherBot as _ab, tenFbTu, donTuTinPage, donTuTinKhach,
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


// ═══════════════════════════════════════════════════════════════════════════
// ⑥ HIỂU NGỮ CẢNH MÀ KHÔNG ĐỌC LẠI — bóc thành DỮ KIỆN, rồi vứt câu
//
// `cleanHistory` vứt template của kênh khác khỏi prompt (đúng: đưa nguyên văn vào là dạy
// model bắt chước thứ luật cứng đang cấm). Nhưng vứt mà không bóc thì mất luôn thông tin.
// Đo 22/09 trên 99 hội thoại thật: chiến dịch cũ của page vẫn phát 99 SAR (73 lần) và
// 149 SAR (71 lần) — NHIỀU HƠN giá đang chạy 109/159. Model đọc 99 trong chính ngữ cảnh
// của nó rồi nhắc lại ⇒ 7 lượt bị cửa ra chặn PRICE_MISMATCH.
// ═══════════════════════════════════════════════════════════════════════════

const KB_GIA = { products: [{ id: 'p', name: 'x', currency: 'SAR',
  tiers: [{ label: 'B1G1', price: 109 }, { label: 'B2G2', price: 159 }] }] };

test('C24 · ⭐⭐ giữ CON SỐ mà kênh khác đã báo, và nói ra khi nó LỆCH bảng giá', () => {
  const p = emptyProfile();
  absorbToolUses([], p);
  _ab('🎉 SPECIAL PROMOTION! Buy 1 Get 1 FREE – Only 99 SAR · Buy 2 Get 2 – 149 SAR', false, p);
  assert.deepEqual(p.otherBot.giaDaBao, [99, 149], 'phải giữ con số, không chỉ bật cờ');
  const block = buildProfileBlock(p, { kb: KB_GIA });
  assert.match(block, /ĐÃ BÁO SAI GIÁ 99, 149/);
  assert.match(block, /giá đúng: 109, 159/);
  assert.match(block, /không nhắc lại con số sai/);
});

test('C25 · giá KHỚP bảng thì im — đừng làm loãng khối hồ sơ', () => {
  const p = emptyProfile();
  _ab('Buy 1 Get 1 FREE – Only 109 SAR', false, p);
  assert.deepEqual(p.otherBot.giaDaBao, [109]);
  assert.doesNotMatch(buildProfileBlock(p, { kb: KB_GIA }), /BÁO SAI GIÁ/);
});

test('C26 · ⭐⭐ NGOÀI VÙNG GIAO — bắt đúng câu của Siti, không bắt nhầm người khác', () => {
  // Ca thật 22/09: khách nói ở Philippines rồi chào tạm biệt hai lần, lượt sau bot vẫn
  // "Welcome back 😊 … are you in Saudi Arabia now?" rồi dội lại checklist địa chỉ.
  for (const t of ['how kon deliver and the philippines', 'I am in Philippines', 'sa pinas po',
                   'im in bangladesh now', 'can you ship to nepal', 'from pakistan po ako']) {
    assert.ok(noiNgoaiVung(t), `phải bắt: ${t}`);
  }
  // Bắt NHẦM ở đây là bot từ chối một người ĐANG MUỐN MUA — tệ hơn hẳn bắt hụt.
  for (const t of ['my friend in india bought it', 'my sister in cebu tried it', 'Riyadh city',
                   'my colleague in indonesia said its good', 'Jeddah District 1']) {
    assert.equal(noiNgoaiVung(t), '', `KHÔNG được bắt: ${t}`);
  }
});

test('C27 · ⭐ ngoài vùng ⇒ khối hồ sơ ĐỔI VIỆC PHẢI LÀM, không còn đòi địa chỉ', () => {
  const p = extractFromText('how kon deliver and the philippines', emptyProfile());
  assert.equal(p.ngoaiVung.toLowerCase(), 'philippines');
  const block = buildProfileBlock(p, { kb: KB_GIA });
  assert.match(block, /NGOÀI vùng giao/);
  assert.match(block, /KHÔNG xin địa chỉ/);
  assert.match(block, /Bước còn thiếu: KHÔNG CÓ/, 'đang in "còn thiếu địa chỉ" chính là chỗ đẩy model đi xin địa chỉ');
  // Nói một lần là đủ — câu sau nhắc Saudi không được xoá dữ kiện đó.
  extractFromText('ok Saudi Arabia', p);
  assert.equal(p.ngoaiVung.toLowerCase(), 'philippines');
});

test('C28 · ⭐ đã chào tạm biệt ⇒ cấm chào lại; nhưng đổi ý thì MỞ LẠI', () => {
  const p = extractFromText('h ok bye thank you agoin', emptyProfile());
  assert.equal(p.daTuChoi, true);
  assert.match(buildProfileBlock(p, { kb: KB_GIA }), /ĐỪNG chào lại từ đầu/);
  for (const t of ['ok', 'yes', 'how much', 'magkano po']) {
    assert.equal(khachTuChoi(t), false, `KHÔNG phải từ chối: ${t}`);
  }
  // Khách quay lại chọn gói ⇒ bỏ cờ, nếu không bot câm với người đang muốn mua.
  extractFromText('ok buy 1 get 1 po', p);
  assert.equal(p.daTuChoi, false);
});

test('C29 · ba dữ kiện mới KHÔNG phá ngưỡng token của khối hồ sơ', () => {
  const p = extractFromText('Amy Añoza\n0536064249\nJeddah\nim in bangladesh now bye', emptyProfile());
  _ab('Only 99 SAR · 149 SAR', false, p);
  p.tier = 'Buy 2 Get 2'; p.objections = ['obj_price', 'obj_trust'];
  const block = buildProfileBlock(p, { kb: KB_GIA, state: 'SELLING', used: 3, max: 10,
    lastAi: 'x'.repeat(400), idleMs: 5 * 24 * 3600e3 });
  assert.ok(estimateTokens(block) <= 420, `ca tệ nhất đang ${estimateTokens(block)} token`);
});


// ═══════════════════════════════════════════════════════════════════════════
// ⑦ TÊN FACEBOOK — gọi khách cho thân mật, KHÔNG đụng tên người nhận hàng
//
// Đo 25/09: 8/8 tin khách mang sẵn `from.name`, lấy được miễn phí ngay trong lịch sử.
// Đo 23/09 trên 13 lượt CHỐT ĐƠN: bot gọi tên khách 1/13 (8%) — vì `prof.name` chỉ điền
// từ chữ khách GÕ, mà ở đúng lượt "Place an order" khách chưa gõ tên. Bot của Pancake gọi
// được "Great, Abdul Mannan!" vì nó đọc thẳng tên Facebook.
// ═══════════════════════════════════════════════════════════════════════════

const PG = 'page-tenfb';
const tinPage = (t) => ({ from: { id: PG, name: 'Minty Fresh Smile KSA' }, original_message: t });
const tinKhach = (t, ten) => ({ from: { id: 'cust-9', name: ten }, original_message: t });

test('C30 · ⭐⭐ tên Facebook KHÔNG được chảy vào tên người nhận hàng', () => {
  // Tên Facebook THẬT trên page này: "Napagod Na Ako" · "Alas Uno" · "Rich Chie".
  // Đổ vào `prof.name` là bot thôi hỏi tên thật RỒI đẩy chuỗi đó xuống POS làm tên nhận
  // hàng. Hai trường, hai việc — ca này là hàng rào giữa chúng.
  const p = emptyProfile();
  const msgs = [tinPage('promo'), tinKhach('Place an order', 'Napagod Na Ako')];
  buildContextMessages({ prof: p, msgs, pageId: PG });
  assert.equal(p.tenFb, 'Napagod Na Ako');
  assert.equal(p.name, '', 'tên đơn PHẢI còn rỗng');
  assert.ok(missingSteps(p).includes('tên'), 'vẫn phải hỏi tên thật để ghi đơn');
});

test('C31 · khối hồ sơ nói rõ đây là tên để GỌI, không phải tên ghi đơn', () => {
  const p = emptyProfile(); p.tenFb = 'Mustafizur Rahman';
  const block = buildProfileBlock(p, {});
  assert.match(block, /GỌI TÊN khách/);
  assert.match(block, /KHÔNG phải tên người nhận hàng/);
  assert.ok(estimateTokens(block) <= 200, `đang ${estimateTokens(block)} token`);
});

test('C32 · lấy tin KHÁCH đầu tiên, bỏ qua mọi tin của page', () => {
  assert.equal(tenFbTu([tinPage('a'), tinPage('b'), tinKhach('hi', 'Rich Chie')], PG), 'Rich Chie');
  assert.equal(tenFbTu([tinPage('a')], PG), '', 'chỉ có tin page ⇒ rỗng, không ném');
  assert.equal(tenFbTu([tinKhach('hi', '')], PG), '', 'tên rỗng ⇒ rỗng');
  assert.equal(tenFbTu([], PG), '');
  assert.equal(tenFbTu([tinKhach('hi', 'x'.repeat(200))], PG).length, 60, 'cắt 60 ký tự');
});

test('C33 · ⭐ hội thoại ĐÃ hydrate từ trước vẫn có tên ngay lượt kế tiếp', () => {
  // `hydratedAt` chặn hydrate vĩnh viễn, nên vá chỉ trong `hydrateProfile` là mọi hội thoại
  // cũ không bao giờ có tên. Vá ở `buildContextMessages` mới phủ được chúng.
  const p = emptyProfile();
  p.hydratedAt = Date.now() - 864e5;          // đã dựng hồ sơ từ hôm qua
  buildContextMessages({ prof: p, msgs: [tinKhach('ok', 'Alas Uno')], pageId: PG });
  assert.equal(p.tenFb, 'Alas Uno');
});

test('C34 · đã có tên rồi thì KHÔNG ghi đè (khách đổi tên FB giữa chừng)', () => {
  const p = emptyProfile(); p.tenFb = 'Tên Cũ';
  buildContextMessages({ prof: p, msgs: [tinKhach('ok', 'Tên Mới')], pageId: PG });
  assert.equal(p.tenFb, 'Tên Cũ');
});


// ═══════════════════════════════════════════════════════════════════════════
// ⑧ ĐƠN MÀ KÊNH KHÁC ĐÃ XỬ LÝ — đừng nói "chưa có đơn nào" với người vừa bị huỷ đơn
//
// Ca thật Rosalinda Ballesteros 24/09:
//     sale   "Your order has been cancelled."
//     khách  "Bkit po cancelled po sir"        (sao lại huỷ vậy anh)
//     bot    "Wala pa po akong natatanggap na order details from you"  ← rồi CHÀO HÀNG LẠI
//
// Dựng lại ngữ cảnh thì bot ĐỌC ĐƯỢC câu huỷ đơn — nó nằm ngay trong cửa sổ 6 tin. Hỏng ở
// chỗ khác: khối hồ sơ in "Tên (chưa có) · Bước còn thiếu: tên, SĐT, địa chỉ…" như sự thật
// nội bộ, và model tin khối hồ sơ hơn tin hội thoại.
//
// `OB_ORDER` KHỚP câu đó, nhưng `absorbOtherBot` chỉ chạy cho tin bị nhận là MẪU MÁY — mà
// câu quyết định nhất lại do SALE THẬT gõ. Dữ kiện rơi đúng khe giữa hai đường bóc.
// ═══════════════════════════════════════════════════════════════════════════

test('C35 · ⭐ nhận ra TRẠNG THÁI đơn, không chỉ "có đơn hay không"', () => {
  assert.equal(donTuTinPage('Your order has been cancelled.').trangThai, 'đã huỷ');
  assert.equal(donTuTinPage("I noticed you haven't received the order.").trangThai,
    'khách CHƯA nhận được hàng');
  assert.equal(donTuTinPage('Your order is being shipped').trangThai, 'đang giao');
  assert.equal(donTuTinPage('Your order has been created').trangThai, 'đã tạo');
  // Bắt nhầm ⇒ bot tưởng khách đã có đơn và thôi bán. Lệch một chiều.
  for (const t of ['How many sets would you like?', '🎉 SPECIAL PROMOTION – UP TO 70% OFF!',
                   'Buy 1 Get 1 FREE — 109 SAR', '']) {
    assert.equal(donTuTinPage(t), null, `KHÔNG được coi là đơn: ${JSON.stringify(t)}`);
  }
});

test('C36 · ⭐⭐ bóc được từ tin SALE THẬT GÕ, không chỉ từ mẫu máy — đúng khe đã rơi', () => {
  const p = emptyProfile();
  const msgs = [
    { from: { id: PG, admin_name: 'Nguyễn Duyên' }, original_message: 'Your order has been cancelled.' },
    { from: { id: 'cust-9' }, original_message: 'Bkit po cancelled po sir' },
  ];
  cleanHistory(msgs, PG, p);
  assert.ok(p.donDaCo, 'câu của sale thật KHÔNG phải mẫu máy — vẫn phải bóc được');
  assert.equal(p.donDaCo.trangThai, 'đã huỷ');
  assert.match(p.donDaCo.cau, /cancelled/);
  // Và câu đó vẫn Ở LẠI trong ngữ cảnh — bóc dữ kiện không có nghĩa là vứt câu.
  const rows = cleanHistory(msgs, PG, emptyProfile());
  assert.ok(rows.some((r) => /cancelled/i.test(r.text)));
});

test('C37 · ⭐ có đơn ở kênh khác ⇒ khối hồ sơ CẤM nói "chưa có đơn" và đổi việc phải làm', () => {
  const p = emptyProfile();
  cleanHistory([{ from: { id: PG }, original_message: 'Your order has been cancelled.' }], PG, p);
  const block = buildProfileBlock(p, {});
  assert.match(block, /ĐANG CÓ MỘT ĐƠN TRONG CUỘC/);
  assert.match(block, /đã huỷ/);
  assert.match(block, /Kênh khác \(sale\/bot\) nói/);
  assert.match(block, /TUYỆT ĐỐI không nói "chưa nhận được thông tin đơn"/);
  assert.match(block, /CHUYỂN NGƯỜI/);
  // Dòng "Bước còn thiếu: tên, SĐT, địa chỉ…" đọc như mệnh lệnh đi thu thông tin — chính
  // nó đẩy model đi chào hàng lại với người vừa bị huỷ đơn.
  assert.match(block, /Bước còn thiếu: KHÔNG phải lượt thu thông tin/);
  assert.doesNotMatch(block, /Bước còn thiếu: tên/);
});

test('C38 · ⭐ khách Philippines từ chối bằng lời LỊCH SỰ — ba câu đã lọt hết', () => {
  for (const t of ['Ok po salamat nlng po', 'Hwag nlng po salamat', 'wag na po',
                   'salamat na lang po', 'di na po']) {
    assert.equal(khachTuChoi(t), true, `phải là từ chối: ${t}`);
  }
  // "salamat" trơn là CẢM ƠN, không phải từ chối — bắt nhầm là bot câm với người đang mua.
  for (const t of ['salamat po sir', 'Ok po', 'Mzta na po sir', 'ok sige po', 'yes po']) {
    assert.equal(khachTuChoi(t), false, `KHÔNG phải từ chối: ${t}`);
  }
});


// ═══════════════════════════════════════════════════════════════════════════
// ⑨ ĐƠN ĐANG TRONG CUỘC — tín hiệu đến từ CẢ HAI PHÍA
//
// Ca thật Tara Singh 24/09: khách tranh chấp một đơn giao dở 15 ngày, người giao không cho
// kiểm hàng. Lượt 2 bot đáp "Salamat po sa pag-update… Full name para sa order, Contact
// number, Complete address" — đi xin lại thông tin của người đang đòi huỷ đơn.
//
// Bản vá ca Rosalinda KHÔNG bắt được ca này: ở đó sale gõ "Your order has been cancelled",
// còn ở đây sale chỉ viết "We will notify the shipping company to re-deliver your order" —
// không khớp mẫu trạng thái nào. Tín hiệu rõ nhất nằm ở câu CỦA KHÁCH.
// ═══════════════════════════════════════════════════════════════════════════

test('C39 · ⭐⭐ câu của KHÁCH cũng dựng được dữ kiện «đang có đơn»', () => {
  for (const t of ['The delivery was scheduled for today.', 'I do not want this order.',
                   "the delivery boy has just called to say that he won't allow an inspection",
                   'my order is still not here', 'cancel my order please',
                   'You have been stringing me along for fifteen days regarding a single order']) {
    assert.ok(donTuTinKhach(t), `phải bắt: ${t.slice(0, 50)}`);
  }
  // Bắt nhầm ⇒ bot thôi bán với người ĐANG MUỐN MUA. Lệch một chiều, như mọi luật khác.
  for (const t of ['how much po', 'I want to order 2 sets', 'Place an order🎁', 'magkano po',
                   'do you deliver to riyadh', 'Buy 1 Get 1 free po ba', 'ok sige po']) {
    assert.equal(donTuTinKhach(t), null, `KHÔNG được bắt: ${t}`);
  }
});

test('C40 · ⭐ khách nói về đơn ⇒ khối hồ sơ CẤM xin lại thông tin và CẤM dán bảng giá', () => {
  const p = extractFromText('The delivery was scheduled for today.', emptyProfile());
  assert.equal(p.donDaCo.nguon, 'khach');
  const block = buildProfileBlock(p, {});
  assert.match(block, /ĐANG CÓ MỘT ĐƠN TRONG CUỘC/);
  assert.match(block, /CHÍNH KHÁCH nói/);
  assert.match(block, /KHÔNG xin lại tên\/SĐT\/địa chỉ/);
  assert.match(block, /KHÔNG dán bảng giá/);
  assert.match(block, /CHUYỂN NGƯỜI/);
  assert.match(block, /Bước còn thiếu: KHÔNG phải lượt thu thông tin/);
});

test('C41 · nguồn PAGE vẫn hoạt động như cũ, và không đè lên dữ kiện đã có', () => {
  const p = emptyProfile();
  cleanHistory([{ from: { id: PG }, original_message: 'Your order has been cancelled.' }], PG, p);
  assert.equal(p.donDaCo.nguon, 'page');
  assert.equal(p.donDaCo.trangThai, 'đã huỷ');
  // Câu khách tới sau KHÔNG được ghi đè sự thật nặng hơn đã ghi.
  extractFromText('The delivery was scheduled for today.', p);
  assert.equal(p.donDaCo.trangThai, 'đã huỷ');
});
