// Nghiệm thu BH7 · Kimi phải THẤY thứ khách đã nhận từ Botcake.
//
// Bệnh (đo 28/09 trên màn đối chiếu Minty Fresh Smile KSA, 38 hội thoại): page mà Botcake
// nói phần lớn thì cửa sổ 6 tin còn 0 dòng — `cleanHistory` vứt hết template. Kimi chỉ
// thấy câu khách vừa gõ nên «how to order» · «u have in saudi??» bị trả bằng cả bài
// giới thiệu + bảng giá khách vừa nhận, và «Buy 1 get free» bị hỏi lại «how many sets?».
//
// Mọi câu Botcake dưới đây là NGUYÊN VĂN tin thật của page đó (không chứa PII).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyProfile, cleanHistory, buildContextMessages, buildProfileBlock, chonCuaSo,
  ghiChuKenhKhac, RECENT_MSGS, MAX_KENH_KHAC, KENH_KHAC_MAX_CHARS,
} from '../src/context.js';

const PAGE = '1220547807799752';
const bc = (text) => ({ from: { id: PAGE, admin_name: 'Botcake' }, message: text });
const ai = (text) => ({ from: { id: PAGE }, message: text });
const kh = (text) => ({ from: { id: 'c1', name: 'Danilo' }, message: text });

const GIOI_THIEU = '🌟 A WHITER SMILE – CONFIDENCE THAT SHINES EVERY DAY! 🌟 Are you looking for a toothpaste that can help whiten teeth, reduce sensitivity, and protect enamel? Croent 7.5% Hydroxyapatite White Tooth Repair could be the right choice for you!';
const KHUYEN_MAI = '🎉 SPECIAL PROMOTION – UP TO 70% OFF! 🎁 Buy 1 Get 1 FREE – Only 109 SAR 🎁 Buy 2 Get 2 FREE – Only 159 SAR 🚚 Free Shipping 💵 Cash on Delivery (COD) 👉 Order now and enjoy a whiter, more confident smile every day! How many sets would you like to order? 📦';
const CHOT = 'This product has never let me down! Try it now! 😉';
const XIN_TT = 'Please provide the information below for the shipping';

const noiDung = (messages) => messages.map((m) => m.content).join('\n');

test('K1 · ⭐ ca «hm how to order»: cửa sổ KHÔNG còn trống — Kimi thấy bảng giá Botcake đã gửi', () => {
  const msgs = [kh('ok'), bc(GIOI_THIEU), bc(KHUYEN_MAI), bc(CHOT), bc(KHUYEN_MAI), kh('hm how to order')];
  const { messages, kept } = buildContextMessages({ prof: emptyProfile(), msgs, pageId: PAGE });
  const txt = noiDung(messages);
  assert.ok(kept >= 3, `cửa sổ phải có ghi chú Botcake, được ${kept}`);
  assert.match(txt, /Buy 1 Get 1 FREE – Only 109 SAR/);
  assert.match(txt, /Croent 7\.5% Hydroxyapatite/);
  assert.doesNotMatch(txt, /hm how to order/, 'câu đang xử lý do handler đẩy vào riêng — không được nằm hai lần');
  assert.equal(messages[messages.length - 1].role, 'assistant', 'handler đẩy tin khách ngay sau ⇒ phải kết bằng assistant');
});

test('K2 · Botcake phát lại cùng một mẫu 3 lần → cửa sổ chỉ đọc MỘT lần', () => {
  const rows = cleanHistory([kh('hi'), bc(KHUYEN_MAI), bc(CHOT), bc(KHUYEN_MAI), bc(KHUYEN_MAI)], PAGE);
  assert.equal(rows.filter((r) => /109 SAR/.test(r.text)).length, 1);
  assert.match(rows[rows.length - 1].text, /109 SAR/, 'giữ lần GẦN NHẤT — đúng vị trí thời gian khách thấy nó');
});

test('K3 · trần riêng cho kênh khác: tối đa MAX_KENH_KHAC ghi chú, lấy các cái MỚI nhất', () => {
  const rows = cleanHistory([bc(GIOI_THIEU), bc(XIN_TT), bc(CHOT), bc(KHUYEN_MAI), kh('magkano')], PAGE);
  const win = chonCuaSo(rows);
  const ghi = win.filter((r) => r.kenhKhac);
  assert.equal(ghi.length, MAX_KENH_KHAC);
  assert.doesNotMatch(ghi.map((r) => r.text).join(' '), /WHITER SMILE/, 'cái CŨ nhất bị bỏ trước');
});

test('K4 · ghi chú Botcake KHÔNG đẩy lời khách ra khỏi cửa sổ (không ăn vào `recent`)', () => {
  const msgs = [];
  for (let i = 0; i < RECENT_MSGS; i++) msgs.push(i % 2 ? ai(`SET ${i} po`) : kh(`tanong ${i} tungkol sa delivery`));
  msgs.push(bc(KHUYEN_MAI), bc(CHOT), bc(XIN_TT));
  const win = chonCuaSo(cleanHistory(msgs, PAGE));
  assert.equal(win.filter((r) => !r.kenhKhac).length, RECENT_MSGS);
  assert.equal(win.filter((r) => r.kenhKhac).length, 3);
});

test('K5 · Botcake nổ mẫu GIỮA cụm tin khách đang xử lý → cụm vẫn bỏ đủ, ghi chú ở lại', () => {
  const msgs = [kh('hello'), ai('Hello po! 109 SAR po ang Buy 1 Get 1.'), kh('buy 1'), bc(KHUYEN_MAI), kh('get free po')];
  const { messages } = buildContextMessages({ prof: emptyProfile(), msgs, pageId: PAGE });
  const txt = noiDung(messages);
  assert.doesNotMatch(txt, /buy 1\n|get free po/, 'cụm khách đang xử lý phải bị bỏ trọn — y như trước BH7');
  assert.match(txt, /KHÁCH ĐÃ NHẬN/);
  assert.equal(messages[messages.length - 1].role, 'assistant');
});

test('K6 · v3 webhook (keepTrailingUser) — tin khách cuối VẪN giữ, ghi chú vẫn có', () => {
  const msgs = [bc(KHUYEN_MAI), kh('Buy 1 get free')];
  const { messages } = buildContextMessages({ prof: emptyProfile(), msgs, pageId: PAGE, keepTrailingUser: true });
  const txt = noiDung(messages);
  assert.match(txt, /109 SAR/);
  assert.match(txt, /Buy 1 get free/);
});

test('K7 · ghi chú: có nhãn «không phải lời bạn», bỏ emoji, cắt ở ranh giới từ', () => {
  const g = ghiChuKenhKhac(KHUYEN_MAI, 'Botcake');
  assert.match(g, /^\[Botcake \(page tự động gửi, KHÁCH ĐÃ NHẬN — không phải lời bạn\): «/);
  assert.doesNotMatch(g, /\p{Extended_Pictographic}/u);
  const inner = g.slice(g.indexOf('«') + 1, g.lastIndexOf('»'));
  assert.ok(inner.length <= KENH_KHAC_MAX_CHARS + 1, `ghi chú dài ${inner.length}`);
  assert.equal(ghiChuKenhKhac('🎁🎁 🚚'), '', 'mẫu toàn emoji không đẻ ra ghi chú rỗng');
  assert.match(ghiChuKenhKhac(XIN_TT), /^\[tin tự động /, 'không có admin_name vẫn có nhãn');
});

test('K8 · tin AI THẬT của page vẫn vào cửa sổ NGUYÊN VĂN, không bị dán nhãn', () => {
  const rows = cleanHistory([kh('magkano'), ai('109 SAR po for Buy 1 Get 1 😊')], PAGE);
  assert.equal(rows[1].kenhKhac, undefined);
  assert.equal(rows[1].text, '109 SAR po for Buy 1 Get 1 😊');
});

test('K9 · dòng «Bước còn thiếu» tự khai là MÁY ĐOÁN — hội thoại thắng', () => {
  const block = buildProfileBlock(emptyProfile(), {});
  assert.match(block, /Bước còn thiếu: .*chọn gói.*máy đoán theo từ khoá/);
});

test('K10 · chi phí: 5 mẫu Botcake (3 trùng) chỉ thêm ≤ 3 ghi chú, mỗi cái ≤ ~90 token', () => {
  const rows = cleanHistory([bc(GIOI_THIEU), bc(KHUYEN_MAI), bc(CHOT), bc(KHUYEN_MAI), bc(KHUYEN_MAI)], PAGE);
  const ghi = chonCuaSo(rows).filter((r) => r.kenhKhac);
  assert.ok(ghi.length <= MAX_KENH_KHAC);
  for (const g of ghi) assert.ok(Math.ceil(g.text.length / 3.3) <= 110, `ghi chú ${g.text.length} ký tự`);
});
