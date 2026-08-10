// Nghiệm thu M13 · Post-Sale Router.
// Ca gốc: khách Matess Valdez — 13 lượt AI, 0 đơn. Khách đã nhận hàng, báo hàng vỡ
// ("Kuya damage po yong Isa") và AI đáp "thank you so much" rồi dội bài quảng cáo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPostSale, routePostSale, holdingPostSale, PS, OPPORTUNITY_MAX_TURNS } from '../src/post-sale.js';
import { decideConv, S, OWNER } from '../src/conv-owner.js';
import { setConvState, touchConv, noteOppTurn } from '../src/conv-state.js';

const kindOf = (t) => detectPostSale(t)?.kind || null;

// ═══════════════════════════════════════════════════════════════════════════
// Nhận diện 4 nhóm (spec §M13)
// ═══════════════════════════════════════════════════════════════════════════

test('P1 · ⭐ ca Matess Valdez — khách báo hàng vỡ → CÓ VẤN ĐỀ', () => {
  assert.equal(kindOf('Kuya damage po yong Isa'), PS.PROBLEM);
});

test('P2 · nhóm CÓ VẤN ĐỀ (Tagalog / English / Ả Rập)', () => {
  for (const t of ['sira po yung natanggap ko', 'basag yung bote', 'the item is broken',
    'defective po', 'wrong item po ang dumating', 'مكسور المنتج']) {
    assert.equal(kindOf(t), PS.PROBLEM, `phải là CÓ VẤN ĐỀ: ${t}`);
  }
});

test('P3 · nhóm CHƯA NHẬN → luồng vận chuyển', () => {
  for (const t of ['hindi pa dumating ang order ko', 'still not delivered', 'where is my order',
    'wala pa ang parcel', 'لم يصل الطلب']) {
    assert.equal(kindOf(t), PS.NOT_RECEIVED, `phải là CHƯA NHẬN: ${t}`);
  }
});

test('P4 · nhóm ĐÃ NHẬN (thì quá khứ / có "na")', () => {
  for (const t of ['nakuha ko na po salamat', 'received na po', 'dumating na kanina',
    'natanggap ko na po', 'وصلني الطلب']) {
    assert.equal(kindOf(t), PS.RECEIVED, `phải là ĐÃ NHẬN: ${t}`);
  }
});

test('P5 · ⚠️ KHÔNG bắt nhầm tin TRƯỚC BÁN (bắt nhầm = chặn mất một đơn)', () => {
  for (const t of ['magkano po ang isa', 'is delivery free po?', 'ilang araw bago dumating?',
    'what if it arrives damaged?', 'kung sira ba pagdating, pwede palit?',
    'pwede ba COD?', 'may stock pa po ba?']) {
    assert.equal(detectPostSale(t), null, `không phải hậu bán: ${t}`);
  }
});

test('P6 · "dumating na pero basag" → KHIẾU NẠI, không phải lời khen', () => {
  assert.equal(kindOf('dumating na po pero basag yung isa'), PS.PROBLEM);
});

// ═══════════════════════════════════════════════════════════════════════════
// Ba lỗi luật do CHẠY LẠI TRÊN HỘI THOẠI THẬT phát hiện (kéo từ Pancake 10/08/2026).
// Cả ba đều là bắt sai NHÓM, không phải bắt sót — và cả ba đều dẫn tới cùng một hậu quả:
// AI nói sai thứ với đúng khách đang có tiền hoặc đang bực.
// ═══════════════════════════════════════════════════════════════════════════

test('P7 · ⚠️⚠️ "số WhatsApp không dùng được" KHÔNG phải hàng lỗi (ca Pieces March)', () => {
  // Khách đang ĐƯA SỐ MỚI — tín hiệu mua nóng nhất bảng điểm M11. Luật cũ khớp "not working"
  // rồi khoá AI, khách mất trắng. Chủ ngữ là cái SỐ, không phải sản phẩm.
  assert.equal(detectPostSale('My Number in whatsApp not working so I give my New number just call me'), null);
  assert.equal(detectPostSale('ang link niyo hindi gumagana'), null);
  // nhưng sản phẩm không chạy thì vẫn phải bắt
  assert.equal(kindOf('yung item hindi gumagana'), PS.PROBLEM);
});

test('P8 · ⚠️ "received messages" KHÔNG phải đã nhận HÀNG (ca Anthony Alfaro)', () => {
  // Khách nói đơn KHÔNG tới, chỉ nhận được tin nhắn. Luật cũ tính là đã nhận hàng rồi đẩy
  // sang nhánh mời mua lại — mời khách chưa cầm được hàng mua thêm.
  assert.equal(kindOf("I placed the order for Saturday and it didn't arrive. Then I received messages from two WhatsApp numbers"),
    PS.NOT_RECEIVED);
});

test('P9 · ⚠️ nhận hàng nhưng SAI MÀU/SAI MẪU là KHIẾU NẠI, không phải cơ hội bán thêm', () => {
  // Hai ca thật bị đẩy vào nhánh CƠ HỘI: AI đi mời mua thêm giữa lúc khách đang đòi đổi hàng.
  assert.equal(kindOf('I received my order.Unfortunatley the birth colors is diff.Pls change this'), PS.PROBLEM);
  assert.equal(kindOf("Just want to check I received my order but it's look not a January birthstone"), PS.PROBLEM);
  // ⚠️ nhưng hỏi màu TRƯỚC khi mua thì tuyệt đối không được đụng vào
  assert.equal(detectPostSale('may different colors po ba?'), null);
  assert.equal(detectPostSale('what size po ang available?'), null);
});

test('P10 · ⚠️ "received" ở THÌ TƯƠNG LAI / câu hỏi KHÔNG phải đã nhận hàng', () => {
  // Khách viết tiếng Anh gãy nên câu hỏi về tương lai vẫn dùng chữ "received".
  // Cả ba ca thật đều bị đẩy sang nhánh mời mua lại cho khách còn CHƯA cầm được hàng.
  assert.equal(detectPostSale('How many day I received the items'), null, 'đây là khách hỏi mấy ngày thì nhận — chưa mua');
  assert.equal(detectPostSale('When will I received the replacement'), null);
  assert.equal(detectPostSale('Hopefully by thursday i received already'), null);
  // quá khứ thật thì vẫn phải bắt
  assert.equal(kindOf('Thanks, i received already'), PS.RECEIVED);
});

test('P11 · ⚠️ mở hàng ra mà THẤT VỌNG là khiếu nại, không phải khách hài lòng', () => {
  assert.equal(kindOf('I received my order just now and when i opened it I was disappointed because I order Peridot'),
    PS.PROBLEM);
});

// ═══════════════════════════════════════════════════════════════════════════
// Ba nhánh xử lý
// ═══════════════════════════════════════════════════════════════════════════

test('R1 · ⭐ hàng lỗi → HANDOFF sale NGAY, ưu tiên cao, AI KHÔNG được nói tiếp', () => {
  const r = routePostSale({ kind: PS.PROBLEM });
  assert.equal(r.action, 'HANDOFF_SALE');
  assert.equal(r.aiMay, false, 'AI không được chào bán tiếp cho khách đang khiếu nại');
  assert.equal(r.priority, true);
});

test('R2 · chưa nhận hàng → luồng vận chuyển/RTO, không phải sale bán', () => {
  assert.equal(routePostSale({ kind: PS.NOT_RECEIVED }).action, 'HANDOFF_RTO');
});

test('R3 · hỏi tình trạng khi CHƯA có đơn → để AI trả lời bình thường', () => {
  assert.equal(routePostSale({ kind: PS.STATUS, hasOrderContext: false }).action, 'NONE');
  assert.equal(routePostSale({ kind: PS.STATUS, hasOrderContext: true }).action, 'HANDOFF_RTO');
});

test('R4 · khách hài lòng → nhánh CƠ HỘI, ngân sách riêng tối đa 2 lượt', () => {
  assert.equal(routePostSale({ kind: PS.RECEIVED, oppTurns: 0 }).action, 'OPPORTUNITY');
  assert.equal(routePostSale({ kind: PS.RECEIVED, oppTurns: 1 }).aiMay, true);
  const done = routePostSale({ kind: PS.RECEIVED, oppTurns: OPPORTUNITY_MAX_TURNS });
  assert.equal(done.action, 'OPPORTUNITY_DONE');
  assert.equal(done.aiMay, false);
});

test('R5 · tin giữ chỗ có đủ 3 ngôn ngữ, không rỗng, không lộ tiếng Việt', () => {
  for (const lang of ['tl', 'en', 'ar']) {
    for (const kind of [PS.PROBLEM, PS.NOT_RECEIVED, PS.STATUS]) {
      const s = holdingPostSale(kind, lang);
      assert.ok(s && s.length > 10, `${kind}/${lang} phải có nội dung`);
      assert.equal(/[ăâđêôơưĂÂĐÊÔƠƯ]|khách|nhân viên/.test(s), false, `${kind}/${lang} lộ tiếng Việt`);
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Nối với máy trạng thái (M05)
// ═══════════════════════════════════════════════════════════════════════════

const PAGE = 'P13';
const msg = (who, text) => ({ from: { id: who === 'page' ? PAGE : 'u1' }, message: text });
let n = 0;
const newConv = () => ({ id: 'ps' + (++n) + '_' + Math.random().toString(36).slice(2), tags: [], from: { name: 'Tester' } });

test('S1 · POST_SALE + chủ SALE → AI im (mặc định)', () => {
  const c = newConv();
  setConvState(c.id, S.POST_SALE, OWNER.SALE, 'khách báo hàng lỗi');
  const r = decideConv({ pageId: PAGE, conv: c, custId: 'x', msgs: [msg('cust', 'a'), msg('cust', 'b')] });
  assert.equal(r.allow, false);
});

test('S2 · POST_SALE + chủ AI (nhánh cơ hội) → được nói đúng 2 lượt rồi im', () => {
  const c = newConv();
  setConvState(c.id, S.POST_SALE, OWNER.AI, 'nhánh cơ hội');
  const msgs = [msg('cust', 'hi'), msg('cust', 'nakuha ko na po salamat')];
  const ask = () => decideConv({ pageId: PAGE, conv: c, custId: 'x', msgs });

  assert.equal(ask().allow, true, 'lượt cơ hội 1');
  assert.equal(ask().state, S.POST_SALE, 'không được rơi ngược về SELLING');
  noteOppTurn(c.id);
  assert.equal(ask().allow, true, 'lượt cơ hội 2');
  noteOppTurn(c.id);
  assert.equal(ask().allow, false, 'hết 2 lượt cơ hội → AI im');
});

test('S3 · thẻ đơn Pancake vẫn thắng nhánh cơ hội (RTO nói, AI im)', () => {
  const c = newConv();
  c.tags = [-2]; // shipped
  setConvState(c.id, S.POST_SALE, OWNER.AI, 'nhánh cơ hội');
  touchConv(c.id, { oppTurns: 0 });
  const r = decideConv({ pageId: PAGE, conv: c, custId: 'x', msgs: [msg('cust', 'a'), msg('cust', 'b')] });
  assert.equal(r.allow, false);
  assert.equal(r.owner, OWNER.RTO);
});
