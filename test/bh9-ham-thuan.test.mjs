// BH9 ④1–④6 — HÀM THUẦN của bộ não pilot (0 mạng, 0 model, 0 CSDL): một luật tên · bộ dò «đơn đang trong cuộc» hai phía + cổng sau bán ·
// COD (khách tự nói · đáp câu hỏi COD · COD ngầm) · bốn luật cửa ra mới · dấu hiệu y tế · khối hồ sơ.
// Câu ca là câu THẬT đã ẩn danh (giữ khuôn chữ, tên/SĐT/địa chỉ giả) — nguồn «UAE #n / Saudi #n» ở PHIEU-BH9 ①/④.
// «Giống base» đo bằng BẢN BASE THẬT (`git archive a6f670d src` ra thư mục tạm, hoặc `BH9_BASE_SRC` khi cổng chạy trên bản sao không có .git).
// Nhánh KHÔNG chạm ở tệp này: handler/worker (xem `bh9-luot-worker.test.mjs`) · hàng chờ + màn (`bh9-hang-cho-man.test.mjs`) · dữ liệu giả lập (`bh9-phat-lai`).
import './_bat-cua-de-do.mjs';   // FASTLANE_TEMPLATES=1 cho ca câu mẫu Fast Lane (④4 «Thêm»)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as C from '../src/context.js';
import * as L from '../src/lead-score.js';
import * as G from '../src/outbound-guard.js';
import * as O from '../src/our-messages.js';
import { fastLane, fastLaneConfig } from '../src/fast-lane.js';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'a6f670d';
console.log(`   [bh9t] tệp đo ${new URL('../src/context.js', import.meta.url).pathname} · cwd ${process.cwd()}`);

/** Bản base của `src/` — một lần cho cả tệp. null ⇒ không dựng được (ca so-base tự BỎ QUA có nói ra). */
let _base;
async function base() {
  if (_base !== undefined) return _base;
  try {
    let dir = process.env.BH9_BASE_SRC || '';
    if (!dir) {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bh9-base-'));
      execSync(`git -C "${GOC}" archive ${BASE} src | tar -x -C "${dir}"`, { stdio: ['ignore', 'ignore', 'pipe'] });
      fs.copyFileSync(path.join(GOC, 'package.json'), path.join(dir, 'package.json'));
      fs.symlinkSync(path.join(GOC, 'node_modules'), path.join(dir, 'node_modules'));
    }
    _base = {
      dir,
      guard: await import(pathToFileURL(path.join(dir, 'src/outbound-guard.js'))),
      context: await import(pathToFileURL(path.join(dir, 'src/context.js'))),
    };
  } catch (e) {
    console.log(`   [bh9t] KHÔNG dựng được bản base ${BASE}: ${e.message}`);
    _base = null;
  }
  return _base;
}

// ═══ ④1 · TÊN — `tachTen` · `extractFromText().name` · `hasName` trên CÙNG một bảng ═══════════════════════════════════════════════
const BANG_TEN = [
  ['T01', 'this is working for fails', ''],
  ['T02', 'Ana\nMarina island\nGreen community\nVilla 12\n0501234567\nAbu Dhabi, UAE', ['', 'Ana']],
  ['T03', "So,if you haven't time now, you will bring me tomorrow or after", ''],
  ['T04', 'Later, when this is finished', ''],
  ['T05', '0501234567 King street gym same building, Abudhabi city', ''],
  ['T06', "I'm here in Dammam", ''],
  ['T07', 'Ok 6 u deliver I am waiting', ''],
  ['T08', 'How many days and what time arrived my order?', ''],
  ['T09', 'Im waiting for delivery I send already the location', ''],
  ['T10', 'My sister available time is 10am and 9pm sir', ''],
  ['T11', "Here's my name Maria Santos. . . Contact No. 0551234567 Address: AL NAKHEEL DISTRICT VILLA 9 RIYADH, SAUDI ARABIA, SA", 'Maria Santos'],
  ['T12', 'I send my location to him yesterday, once he ask', ''],
  ['T13', 'Office No.: 12, Entrance 4 Terminal 1 Cargo Village, Dubai, UAE 0501234567 Maria Santos', 'Maria Santos'],
  ['T14', 'This is real gold', ''],
  // đối chứng (C1 · C3 · C10 của test/context.test.mjs + ba nhãn RÕ/MƠ HỒ)
  ['T15', 'Amy Añoza\n0536064249\nAlrawdah Jeddah, District 1 House #118', 'Amy Añoza'],
  ['T16', 'my name is Amy, 0536064249', 'Amy'],
  ['T17', 'ako si Maria Santos', 'Maria Santos'],
  ['T18', "I'm Maria", 'Maria'],
  ['T19', 'Name: Maria Santos', 'Maria Santos'],
  ['T20', 'اسمي محمد', 'محمد'],
];
// 12 chuỗi sai đã thấy ở giả lập (① lỗi 3) — không chuỗi nào được thành tên nữa.
const TEN_SAI = ['finished', 'working for fails', 'Yass island', 'e now', 'Abudhabi city', 'here in Dammam', 'waiting',
  'e arrived my order', 'e is', 'SAUDI ARABIA', 'yesterday', 'waiting for delivery I send already the'];

for (const [id, cau, cho] of BANG_TEN) {
  test(`BH9 ${id} · tên: «${cau.slice(0, 48).replace(/\n/g, '⏎')}» ⇒ ${JSON.stringify(cho)}`, () => {
    assert.equal(typeof L.tachTen, 'function', 'lead-score.js chưa export tachTen');
    const t = L.tachTen(cau);
    const n = C.extractFromText(cau, C.emptyProfile()).name;
    const hop = Array.isArray(cho) ? cho : [cho];
    assert.ok(hop.includes(t), `tachTen = ${JSON.stringify(t)} (chờ ${JSON.stringify(cho)})`);
    assert.equal(n, t, 'extractFromText().name phải là ĐÚNG tachTen — một luật');
    assert.ok(!TEN_SAI.includes(t), `ra chuỗi sai đã biết: ${t}`);
  });
}
test('BH9 TH · `hasName` = !!tachTen trên cả bảng (một luật — không còn regex riêng ở lead-score)', () => {
  assert.equal(typeof L.tachTen, 'function');
  const lech = BANG_TEN.filter(([, cau]) => L.hasName(cau) !== !!L.tachTen(cau)).map(([id]) => id);
  assert.deepEqual(lech, [], `hasName lệch tachTen ở ${lech.join(' ')}`);
  // «This is real gold» là câu soạn sẵn quảng cáo (nợ N-RP2-REGEX-TIN-NHUONG) — không được +2 điểm «tên».
  assert.equal(L.scanSignals('This is real gold').has('name'), false);
});
test('BH9 TS · context.js KHÔNG còn bản regex tên thứ hai (NAME_LABEL/NAME_LINE)', () => {
  const src = fs.readFileSync(new URL('../src/context.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /^const NAME_(?:LABEL|LINE)\b/m);
});

// ═══ ④2 · BỘ DÒ ĐƠN — phía PAGE · phía KHÁCH · `laCauSauBan` · `bocDonTuLichSu` ═══════════════════════════════════════════════════
const PAGE_DUONG = [
  'Hello! Your order is scheduled for delivery today, please keep your phone open.',
  'Your order "Soothing Cooling Gel" is set for delivery tomorrow, Thursday. Thank you!',
  'Hi dear, we saw that the delivery was unsuccessful. When can you receive it?',
  'But the order is in transit, could you please receive it for me?',
  "They still haven't delivered the order to you?",
  "I will inform the courier to contact that number. Courier's phone: 0559876543",
  '👉Your order is 109 SAR. You will receive this gift in the next 2-5 days!',
  'Your order: Soothing Cooling Gel - Tracking number: 1234567890',
];
const PAGE_AM = [
  'Your order is free delivery dear',
  'Do you wanna order now? 🚚FREE SHIPPING⚡ 👉CASH ON DELIVERY💸',
  'It take 2 - 5 days to delivery dear',
  'FREE DELIVERY TODAY ONLY 🚚 Buy 1 Get 1 FREE — 109 SAR, Buy 2 Get 2 FREE — 159 SAR',
  'Will you choose the Buy 1 Get 1 offer or the Buy 2 Get 2 offer?',
  // [S2] câu của CHÍNH BOT / mẫu giải thích trước bán — bắt nhầm là khách mất bot vĩnh viễn (donDaCo không hết hạn)
  'We will send you the tracking number once your order is shipped',
  'Once you order, we will inform the courier to call you before delivery',
  'Your order will be scheduled for delivery within 2-5 days after confirmation',
  'Your order is 109 SAR po — shall I confirm?',
  // C35 · C36 · C41 (âm cũ)
  'How many sets would you like?', '🎉 SPECIAL PROMOTION – UP TO 70% OFF!', 'Buy 1 Get 1 FREE — 109 SAR', '',
];
test('BH9 DP · donTuTinPage DƯƠNG: tám khuôn page thật (POS · AI LEADER · vận đơn · sale)', () => {
  const hut = PAGE_DUONG.filter((t) => !C.donTuTinPage(t));
  assert.deepEqual(hut, [], `bắt hụt ${hut.length}/${PAGE_DUONG.length}`);
  // giữ thứ tự ưu tiên + nguồn
  assert.equal(C.donTuTinPage('Your order has been cancelled.').trangThai, 'đã huỷ');
  assert.equal(C.donTuTinPage(PAGE_DUONG[0]).nguon, 'page');
});
test('BH9 DA · donTuTinPage ÂM: năm câu ② 2a + bốn câu [S2] + C35', () => {
  const nham = PAGE_AM.filter((t) => C.donTuTinPage(t));
  assert.deepEqual(nham, [], `bắt NHẦM ${nham.length}: ${nham.join(' | ')}`);
});
test('BH9 DO · KHÔNG suy donDaCo từ otherBot.orderNoted — «Your order is free delivery dear» khớp OB_ORDER nhưng không là đơn', () => {
  const p = C.emptyProfile();
  C.absorbOtherBot('Your order is free delivery dear', false, p);
  assert.equal(p.otherBot.orderNoted, true, 'tiền đề: OB_ORDER khớp mẫu trước bán');
  C.bocDonTuLichSu?.([{ from: { id: 'PG' }, message: 'Your order is free delivery dear' }], 'PG', p);
  C.cleanHistory([{ from: { id: 'PG' }, message: 'Your order is free delivery dear' }], 'PG', p);
  assert.equal(p.donDaCo, null);
  assert.equal(C.laCauSauBan?.('when will it arrive?', p)?.la, false);
});

const KHACH_DUONG = [
  "I didn't finish ordering those things why did you deliver", 'Ok 6 u deliver I am waiting', 'You delivered today at 10 right sir',
  'i canceled it', 'i received that already, same company', 'I received the goods',
  'Yes he call me now but i tell him to deliver 4pm today',
  // C39 dương
  'The delivery was scheduled for today.', 'I do not want this order.',
  "the delivery boy has just called to say that he won't allow an inspection", 'my order is still not here', 'cancel my order please',
  'You have been stringing me along for fifteen days regarding a single order',
];
const KHACH_AM = [
  // C39 âm
  'how much po', 'I want to order 2 sets', 'Place an order🎁', 'magkano po', 'do you deliver to riyadh', 'Buy 1 Get 1 free po ba', 'ok sige po',
  'How many days and what time arrived my order?', 'Buy 2 get 2 / I order before', 'how much free delevery', 'can you deliver tomorrow?',
  'Deliver riyadh?', 'how to order', 'Same number',
  // [S1] câu hỏi TRƯỚC BÁN — HEAD bắt nhầm
  'How long is the delivery? Is it free?', 'Can the order arrive tomorrow?', 'the delivery is free po?',
  'I will order 2 sets, the delivery is COD right?', 'How many days the order arrive?', 'Is it 2-5 days delivery?',
  'If the order is not original can I return it?', 'I dont want this product in big size, small one please',
  'If you deliver today I will order 2 sets', 'i dont want the delivery to my office, home address only',
];
test('BH9 DK · donTuTinKhach DƯƠNG: sáu câu khách thật ① lỗi 1 + «tell him to deliver 4pm» + C39', () => {
  const hut = KHACH_DUONG.filter((t) => !C.donTuTinKhach(t));
  assert.deepEqual(hut, [], `bắt hụt: ${hut.join(' | ')}`);
  assert.equal(C.donTuTinKhach('i received that already').nguon, 'khach');
});
test('BH9 DN · donTuTinKhach ÂM (C39 · mua lại · hỏi trước bán [S1]) và laCauSauBan(hồ sơ rỗng) ⇒ la:false', () => {
  const nham = KHACH_AM.filter((t) => C.donTuTinKhach(t));
  assert.deepEqual(nham, [], `bắt NHẦM người đang muốn mua: ${nham.join(' | ')}`);
  assert.equal(typeof C.laCauSauBan, 'function', 'context.js chưa export laCauSauBan');
  const la = KHACH_AM.filter((t) => C.laCauSauBan(t, C.emptyProfile()).la);
  assert.deepEqual(la, [], `cổng sau bán bắt người đang muốn mua: ${la.join(' | ')}`);
});
test('BH9 LS · laCauSauBan: hồ sơ có đơn + câu giao hàng ⇒ la · câu sản phẩm ⇒ không · hồ sơ rỗng ⇒ không · ordered + thứ trong tuần ⇒ la', () => {
  assert.equal(typeof C.laCauSauBan, 'function');
  const coDon = { ...C.emptyProfile(), donDaCo: { trangThai: 'đang giao', cau: 'x', nguon: 'page' } };
  assert.equal(C.laCauSauBan('Deliver today / If no ok tomorrow deliver at 10am ok', coDon).la, true);
  assert.equal(C.laCauSauBan('Is it the gel for varicose', coDon).la, false);
  assert.equal(C.laCauSauBan('can you deliver tomorrow?', C.emptyProfile()).la, false);
  assert.equal(C.laCauSauBan('Poyde sa next Wednesday edeliver po', { ...C.emptyProfile(), ordered: true }).la, true);
  // câu tự nói về đơn đã có ⇒ la kể cả hồ sơ rỗng
  const r = C.laCauSauBan('i received that already, same company', C.emptyProfile());
  assert.equal(r.la, true);
  assert.ok(r.lyDo, 'phải nói lý do');
});
test('BH9 DB · bocDonTuLichSu cho CÙNG donDaCo với cleanHistory trên cùng lịch sử (một bản luật)', () => {
  assert.equal(typeof C.bocDonTuLichSu, 'function', 'context.js chưa export bocDonTuLichSu');
  const lich = [
    { from: { id: 'KH' }, message: 'how much po?' },
    { from: { id: 'PG', admin_name: 'POS' }, message: PAGE_DUONG[0] },
    { from: { id: 'KH' }, message: 'ok' },
    { from: { id: 'PG', admin_name: 'Sale A' }, message: 'But the order is in transit, could you please receive it for me?' },
    { from: { id: 'PG' }, message: 'Your order is free delivery dear' },
  ];
  const a = C.bocDonTuLichSu(lich, 'PG', C.emptyProfile());
  const b = C.emptyProfile(); C.cleanHistory(lich, 'PG', b);
  assert.ok(a.donDaCo, 'phải bóc được đơn từ lịch sử page');
  assert.deepEqual(a.donDaCo, b.donDaCo);
  // khác hội thoại (không tin page khớp) ⇒ cả hai null
  const c = C.bocDonTuLichSu([{ from: { id: 'PG' }, message: 'Hello po!' }], 'PG', C.emptyProfile());
  assert.equal(c.donDaCo, null);
  // cleanHistory phải GỌI bocDonTuLichSu (không giữ vòng dò riêng)
  const src = fs.readFileSync(new URL('../src/context.js', import.meta.url), 'utf8');
  const than = src.slice(src.indexOf('export function cleanHistory'), src.indexOf('export function tenFbTu'));
  assert.match(than, /bocDonTuLichSu\(/);
  assert.doesNotMatch(than, /donTuTinPage\(/, 'cleanHistory còn vòng dò page riêng — hai bản luật');
});

// ═══ ④3 · COD + GÓI ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
const HOI_COD = "Thank you po! Okay na po ba sa'yo ang COD?";
const cod = (t, lastAi) => C.extractFromText(t, C.emptyProfile(), lastAi === undefined ? undefined : { lastAi }).cod;
test('BH9 K1 · khách tự nói «Cash on delivery po» / «COD po» ⇒ cod · «no COD please» ⇒ không · C4 giữ', () => {
  assert.equal(cod('Cash on delivery po'), true);
  assert.equal(cod('COD po'), true);
  assert.equal(cod('no COD please'), false);
  assert.equal(cod('is it COD?'), false, 'câu HỎI không phải đồng ý');
  const p = C.extractFromText('SET 2 po, ok COD', C.emptyProfile());
  assert.equal(p.cod, true);
});
test('BH9 K2 · «yes» đáp câu bot hỏi COD ⇒ cod · đáp câu khác / «Same number» ⇒ không', () => {
  assert.equal(cod('yes', HOI_COD), true);
  assert.equal(cod('yes', 'Which set po?'), false);
  assert.equal(cod('Same number', HOI_COD), false);
  assert.equal(cod('yes'), false, 'không lastAi ⇒ như cũ');
  assert.equal(cod('no', HOI_COD), false);
});
const PG = 'PG';
const tinPage = (t) => ({ from: { id: PG }, message: t });
const tinKhach = (t) => ({ from: { id: 'KH' }, message: t });
const DIA_CHI = 'Al Nahda 2, Building 5 flat 12, Dubai 0501234567';
function hoSoSau(text) { return C.extractFromText(text, C.emptyProfile()); }
test('BH9 K3 · codNgam: page đã nêu «bayad pagdating» + lượt này SĐT/địa chỉ (hồ sơ đủ) ⇒ true; chỉ khách tự hỏi / chưa địa chỉ / khách từ chối ⇒ false', () => {
  assert.equal(typeof C.codNgam, 'function', 'context.js chưa export codNgam');
  const msgs = [tinKhach('magkano po?'), tinPage('Buy 1 Get 1 FREE po, bayad pagdating ng order 😊'), tinKhach(DIA_CHI)];
  assert.equal(C.codNgam({ prof: hoSoSau(DIA_CHI), text: DIA_CHI, msgs, pageId: PG, lastAi: '' }), true);
  // CHỈ khách tự hỏi «is it COD?» — không tin page nào nêu ⇒ false (tin của KHÁCH không tính)
  const chiKhach = [tinKhach('is it COD?'), tinPage('Yes po, which set?'), tinKhach(DIA_CHI)];
  assert.equal(C.codNgam({ prof: hoSoSau(DIA_CHI), text: DIA_CHI, msgs: chiKhach, pageId: PG, lastAi: 'Yes po, which set?' }), false);
  // nêu COD nhưng lượt này chỉ có SĐT, chưa có địa chỉ ⇒ false
  assert.equal(C.codNgam({ prof: hoSoSau('0501234567'), text: '0501234567', msgs, pageId: PG, lastAi: '' }), false);
  // khách nói «no COD, card only» ⇒ false
  const t = `no COD, card only ${DIA_CHI}`;
  assert.equal(C.codNgam({ prof: hoSoSau(t), text: t, msgs, pageId: PG, lastAi: '' }), false);
  // lastAi nêu COD cũng tính
  assert.equal(C.codNgam({ prof: hoSoSau(DIA_CHI), text: DIA_CHI, msgs: [], pageId: PG, lastAi: 'Free delivery po, cash on delivery 😊 Send your address po.' }), true);
  // đã cod ⇒ không còn «ngầm»
  assert.equal(C.codNgam({ prof: { ...hoSoSau(DIA_CHI), cod: true }, text: DIA_CHI, msgs, pageId: PG, lastAi: '' }), false);
});
test('BH9 K4 · [S10] tin page DUY NHẤT nêu COD là câu PHỦ ĐỊNH («not available… prepaid only») ⇒ codNgam false', () => {
  assert.equal(typeof C.codNgam, 'function');
  const msgs = [tinPage('Sorry po, COD is not available in your area, prepaid only.'), tinKhach(DIA_CHI)];
  assert.equal(C.codNgam({ prof: hoSoSau(DIA_CHI), text: DIA_CHI, msgs, pageId: PG, lastAi: '' }), false);
});
test('BH9 K5 · gói: «Buy 1 take 1?» · «B1G1 free» · «Buy 1get 1free» ⇒ tier khác rỗng', () => {
  for (const t of ['Buy 1 take 1?', 'B1G1 free', 'Buy 1get 1free', '1+1 po']) {
    assert.notEqual(C.extractFromText(t, C.emptyProfile()).tier, '', t);
  }
});

// ═══ ④4 · CỬA RA — bốn luật mới (chỉ khi `luatBH9: true`) + bảo toàn luật cũ so BASE ═══════════════════════════════════════════════
const KB = {
  text: 'Soothing Cooling Gel — Buy 1 Get 1 FREE 109 SAR · Buy 2 Get 2 FREE 159 SAR. Free delivery, cash on delivery. '
    + 'The courier will call you before arriving. Our staff will call you to confirm your order before delivery.',
  products: [{ id: 'P1', name: 'Soothing Cooling Gel', currency: 'SAR',
    tiers: [{ label: 'Buy 1 Get 1 FREE', price: 109, qty: 2 }, { label: 'Buy 2 Get 2 FREE', price: 159, qty: 4 }] }],
  config: {},
};
const KB_KHONG_CUM = { ...KB, text: 'Soothing Cooling Gel — Buy 1 Get 1 FREE 109 SAR · Buy 2 Get 2 FREE 159 SAR.' };
const YT = { dauHieuYTe: 'chảy máu' };
// [id, câu, ctx thêm, rule chờ ('' = QUA; mảng = một trong các rule)]
const BANG_CUA = [
  ['G01', 'no active order was placed under your name yet', {}, 'BIA_TRANG_THAI_DON'],
  ['G02', 'That delivery notice was sent by mistake — sorry for the confusion.', {}, 'BIA_TRANG_THAI_DON'],
  ['G03', 'Your order is on its way — expect delivery in 2-4 working days po.', {}, 'BIA_TRANG_THAI_DON'],
  ['G04', 'No problem — canceled na pala.', {}, 'BIA_TRANG_THAI_DON'],
  ['G05', "Our team already has your WhatsApp — they'll message you there… the rider will contact you before arriving.", {}, 'TU_HUA'],
  ['G06', 'Saturday delivery noted.', {}, ['TU_HUA', 'DELIVERY_PROMISE']],
  ['G07', 'Got it po, 6 PM delivery noted.', {}, ['TU_HUA', 'DELIVERY_PROMISE']],
  ['G08', "Noted po ma'am, 10 AM tomorrow.", {}, ['TU_HUA', 'DELIVERY_PROMISE']],
  ['G09', 'Hintayin nyo lang po ang courier bukas, 10 AM.', {}, ['TU_HUA', 'DELIVERY_PROMISE']],
  ['G10', "I'll request the courier to prioritize 10 AM delivery and call your sister po.", {}, 'TU_HUA'],
  ['G11', 'Our staff will contact you via WhatsApp to confirm your delivery on Wednesday.', {}, 'TU_HUA'],
  ['G12', 'Our staff will contact you shortly po. Please keep your phone line open.', { daBanGiao: true }, ''],
  ['G13', 'Our staff will contact you shortly po. Please keep your phone line open.', {}, 'TU_HUA'],
  ['G14', "We've received your details, our staff will contact you to confirm.", { isOrderSummary: true }, ''],
  ['G15', 'Which set po — Buy 1 Get 1 FREE (109 SAR) or Buy 2 Get 2 FREE (159 SAR)?', { donDaCo: true }, 'BAN_LAI_SAU_BAN'],
  ['G16', 'Which set po — Buy 1 Get 1 FREE (109 SAR) or Buy 2 Get 2 FREE (159 SAR)?', {}, ''],
  ['G17', 'May I have your complete address?', { donDaCo: true }, 'BAN_LAI_SAU_BAN'],
  ['G18', 'May I have your complete address?', {}, ''],
  ['G19', 'This gel helps soothe discomfort and irritated skin po 😊 Which set po?', YT, 'Y_TE'],
  ['G20', "I'm sorry to hear that — please stop using it and see a doctor first.", YT, ''],
  ['G21', 'Please see a doctor, and this gel helps stop bleeding.', YT, 'Y_TE'],
  ['G22', 'Delivery takes 2-5 working days po.', {}, ''],
  ['G23', 'Free delivery po, pay upon delivery.', {}, ''],
  ['G24', 'Buy 1 Get 1 FREE — 109 SAR, free delivery.', {}, ''],
  ['G25', 'Noted po, the courier will call you before arriving.', {}, ''],          // câu nguyên văn của phiếu (KB có cụm)
  ['G26', 'Our staff will call you to confirm your order before delivery.', {}, ''], // KB có NGUYÊN VĂN ⇒ miễn TU_HUA
  ['G27', 'Our staff will call you to confirm your order before delivery.', { kb: KB_KHONG_CUM }, 'TU_HUA'], // KB không có ⇒ chặn
  ['G28', 'Your order is confirmed po ✅ — 109 SAR, cash on delivery.', { isOrderSummary: true }, ''],
  ['G29', 'Your order is confirmed po ✅ — 109 SAR, cash on delivery.', {}, 'BIA_TRANG_THAI_DON'],
  ['G30', 'We have your number and address po, our staff will call you to confirm.', { isOrderSummary: true }, ''],
  ['G31', 'We have your number and address po, our staff will call you to confirm.', {}, 'TU_HUA'],
  ['G32', 'Once your order is confirmed, delivery takes 2-5 working days po.', {}, ''],
  ['G33', 'Your order is confirmed po. Cash on delivery, 2-5 days.', { orderCreated: true }, ''],
  // thêm ngoài bảng phiếu (đo M6 trên giả lập): tóm tắt đơn của khách có đơn nguồn KHÁCH · «keep your phone» không phải xin SĐT ·
  // vế sau dấu phẩy của câu điều kiện vẫn là khẳng định (UAE #83)
  ['G34', 'Your order: Buy 1 Get 1 FREE — 109 SAR, cash on delivery. Our staff will contact you to confirm.', { donDaCo: true, isOrderSummary: true }, ''],
  ['G35', 'Our staff will contact you shortly to sort this out with the courier po. Please keep your phone available 📞', { donDaCo: true, daBanGiao: true }, ''],
  ['G36', 'I understand po. If no order was completed, that delivery notice was likely sent by mistake — sorry for the confusion.', {}, 'BIA_TRANG_THAI_DON'],
];
const ctxCua = (them) => ({ kb: KB, lastAiText: '', ...them, luatBH9: true });
for (const [id, cau, them, cho] of BANG_CUA) {
  test(`BH9 ${id} · cửa ra «${cau.slice(0, 50)}» ${JSON.stringify(Object.keys(them))} ⇒ ${cho || 'QUA'}`, () => {
    const v = G.guardOutbound(cau, ctxCua(them));
    const hop = Array.isArray(cho) ? cho : [cho];
    assert.ok(hop.includes(v.rule), `rule = ${v.rule || '(QUA)'} · chờ ${hop.join('|') || 'QUA'} · ${v.reason || ''}`);
    if (cho && G.LUAT_BH9?.has(v.rule)) {
      assert.equal(v.action, 'rewrite');
      assert.equal(G.canFixLocally(v.rule), false, 'luật mới KHÔNG vào FIXABLE');
    }
  });
}
test('BH9 GL · LUAT_BH9 export đúng bốn luật', () => {
  assert.ok(G.LUAT_BH9 instanceof Set, 'outbound-guard.js chưa export LUAT_BH9');
  assert.deepEqual([...G.LUAT_BH9].sort(), ['BAN_LAI_SAU_BAN', 'BIA_TRANG_THAI_DON', 'TU_HUA', 'Y_TE']);
});
test('BH9 GS · [S7] mọi câu của bảng với ctx KHÔNG có luatBH9 ⇒ phán quyết GIỐNG HỆT base', async (t) => {
  const b = await base();
  if (!b) return t.skip('không dựng được bản base');
  const lech = [];
  for (const [id, cau, them] of BANG_CUA) {
    const ctx = { kb: KB, lastAiText: '', ...them };
    const moi = G.guardOutbound(cau, ctx), cu = b.guard.guardOutbound(cau, ctx);
    if (JSON.stringify(moi) !== JSON.stringify(cu)) lech.push(`${id}: ${moi.rule}≠${cu.rule}`);
  }
  assert.deepEqual(lech, []);
});
/** Kho câu: bảng ④4 + mọi chuỗi ≥ 10 ký tự trong hai tệp ca guard cũ (để «ca guard cũ» không phải chép tay). */
function khoCau() {
  const out = BANG_CUA.map(([, c]) => c);
  for (const f of ['guard-fastlane.test.mjs', 'guard-localfix.test.mjs', 'cua-ra-sua-tai-cho.test.js']) {
    const p = new URL(`./${f}`, import.meta.url);
    if (!fs.existsSync(p)) continue;
    const s = fs.readFileSync(p, 'utf8');
    for (const m of s.matchAll(/'((?:[^'\\\n]|\\.){10,})'|"((?:[^"\\\n]|\\.){10,})"/g)) {
      const raw = m[1] ?? m[2];
      try { out.push(JSON.parse(`"${raw.replace(/\\'/g, "'").replace(/"/g, '\\"')}"`)); } catch { out.push(raw); }
    }
  }
  return [...new Set(out)];
}
test('BH9 GC · câu bị luật CŨ chặn ⇒ (rule, action) GIỐNG HỆT base; câu base QUA ⇒ mới QUA hoặc thuộc LUAT_BH9 (kho câu bảng + ca guard cũ)', async (t) => {
  const b = await base();
  if (!b) return t.skip('không dựng được bản base');
  const kho = khoCau();
  assert.ok(kho.length >= 150, `kho câu chỉ ${kho.length} — thước đo nhầm chỗ`);
  const ctxs = [{}, { isOrderSummary: true }, { orderCreated: true }, { donDaCo: true, daBanGiao: false }, { dauHieuYTe: 'chảy máu' }];
  const lech = [];
  let chanCu = 0;
  for (const cau of kho) for (const c of ctxs) {
    const ctx = { kb: KB, lastAiText: 'Hello po! Which set po?', ...c };
    const cu = b.guard.guardOutbound(cau, ctx);
    const moi = G.guardOutbound(cau, { ...ctx, luatBH9: true });
    if (!cu.ok) { chanCu += 1; if (moi.rule !== cu.rule || moi.action !== cu.action) lech.push(`[${cu.rule}→${moi.rule}] ${cau.slice(0, 40)}`); }
    else if (!moi.ok && !G.LUAT_BH9?.has(moi.rule)) lech.push(`[QUA→${moi.rule}] ${cau.slice(0, 40)}`);
  }
  console.log(`   [bh9t] GC: kho ${kho.length} câu × ${ctxs.length} ngữ cảnh · base chặn ${chanCu} lượt · lệch ${lech.length}`);
  assert.ok(chanCu >= 50, 'kho phải có đủ câu bị luật cũ chặn');
  assert.deepEqual(lech.slice(0, 10), []);
});
test('BH9 GF · câu mẫu Fast Lane (dựng từ KB 109/159 SAR) + câu chào kịch bản page 275/276 QUA bốn luật mới', () => {
  fastLaneConfig.templates = true;
  const kbFl = { ...KB, config: { greeting: 'Hi po! 👋💜 😣 Madalas po ba kayong nakakaranas ng ganito?' } };
  const cau = new Set([kbFl.config.greeting]);
  for (const hoi of ['how much po?', 'magkano po', 'how many days delivery?', 'free delivery?', 'hi', 'hello po', 'paano mag order',
    'how to order', 'is it original?', 'cod po ba?', 'price?', 'ilang araw po bago dumating', 'Get Started']) {
    const r = fastLane({ text: hoi, kb: kbFl, aiTurns: 0, lastAiText: '', idleMs: 0, usedLanes: new Set(), pageId: 'x', hasOrder: false });
    if (r?.reply) cau.add(r.reply);
    if (r?.caption) cau.add(r.caption);
  }
  assert.ok(cau.size >= 3, `chỉ dựng được ${cau.size} câu mẫu — thước đo nhầm chỗ`);
  const chan = [...cau].map((c) => [c, G.guardOutbound(c, ctxCua({}))]).filter(([, v]) => G.LUAT_BH9?.has(v.rule));
  assert.deepEqual(chan.map(([c, v]) => `${v.rule}: ${c.slice(0, 60)}`), []);
});
test('BH9 GK · bốn câu cố định (CAU_NHAN_BAN_GIAO · CAU_Y_TE × en/ar) QUA guardOutbound(c, { daBanGiao: true })', () => {
  assert.ok(O.CAU_NHAN_BAN_GIAO && O.CAU_Y_TE, 'our-messages.js chưa export hai câu cố định');
  const bon = [O.CAU_NHAN_BAN_GIAO.en, O.CAU_NHAN_BAN_GIAO.ar, O.CAU_Y_TE.en, O.CAU_Y_TE.ar];
  assert.equal(bon.filter(Boolean).length, 4);
  for (const c of bon) {
    const v = G.guardOutbound(c, { kb: KB, daBanGiao: true, luatBH9: true });
    assert.equal(v.ok, true, `${v.rule}: ${c}`);
  }
  assert.equal(O.CAU_NHAN_BAN_GIAO.en, 'Noted po 🙏 Our team will check this and reply to you shortly.');
  assert.match(O.CAU_Y_TE.en, /stop using the product and see a doctor/);
});

// ═══ ④5 · Y TẾ ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
test('BH9 Y1 · dauHieuYTe DƯƠNG: chảy máu (EN · Tagalog · Ả Rập) · kích ứng SAU khi dùng · có thai', () => {
  assert.equal(typeof C.dauHieuYTe, 'function', 'context.js chưa export dauHieuYTe');
  for (const t of ['I have bleeding', 'may dugo po', 'meron pong pangangati pagdurugo sa puwet', 'nangati lalo after ko gamitin',
    'I got a rash after applying it', "I'm pregnant, can I use it?", 'فيه دم']) {
    assert.ok(C.dauHieuYTe(t), `phải bắt: ${t}`);
  }
  assert.equal(C.dauHieuYTe('I have bleeding'), 'chảy máu');
});
test('BH9 Y2 · dauHieuYTe ÂM: triệu chứng gel lo (ngứa/rát/trĩ) · phủ định «no fever» · tên đường RASHED', () => {
  assert.equal(typeof C.dauHieuYTe, 'function');
  for (const t of ['itching', 'makati', 'pangangati', 'hapdi', 'burning', 'bukol', 'almuranas', 'halo-halo', 'discomfort',
    'I am 30. nothing else cough and no fever', 'Villa 9, SHEIKH RASHED ST, Abu Dhabi', 'walang dugo po', 'no bleeding po',
    // có dấu «sau khi dùng» + tên đường RASHED — chỉ ranh giới từ của `rash` giữ câu này ÂM
    'After using it for a week I feel better po, I live at SHEIKH RASHED ST']) {
    assert.equal(C.dauHieuYTe(t), '', `KHÔNG được bắt: ${t}`);
  }
});
test('BH9 Y3 · [S9] câu HỎI trước bán về kích ứng + Ả Rập rào ranh giới (كيف استخدم · خدمة التوصيل · عدم) ⇒ ÂM', () => {
  assert.equal(typeof C.dauHieuYTe, 'function');
  for (const t of ['Is it good for irritation?', 'effective po ba sa rashes?', 'Does it cause allergy?', 'كيف استخدم', 'خدمة التوصيل', 'عدم']) {
    assert.equal(C.dauHieuYTe(t), '', `KHÔNG được bắt: ${t}`);
  }
});

// ═══ ④6 · KHỐI HỒ SƠ ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test('BH9 H1 · tenFb ⇒ dòng mới «DÙNG tên Facebook này làm tên người nhận… KHÔNG hỏi tên» · missingSteps bỏ «tên» · C31 ≤ 200 token', () => {
  const p = C.emptyProfile(); p.tenFb = 'Mustafizur Rahman';
  const block = C.buildProfileBlock(p, {});
  assert.match(block, /GỌI TÊN khách/);
  assert.match(block, /DÙNG tên Facebook này làm tên người nhận/);
  assert.match(block, /KHÔNG hỏi tên/);
  assert.doesNotMatch(block, /vẫn phải hỏi tên thật/);
  assert.equal(C.missingSteps(p).includes('tên'), false);
  assert.equal(p.name, '', 'name VẪN chỉ là tên khách tự cho');
  assert.ok(C.estimateTokens(block) <= 200, `đang ${C.estimateTokens(block)} token`);
});
test('BH9 H2 · có SĐT + địa chỉ ⇒ «Bước còn thiếu: ĐÃ CÓ SĐT, địa chỉ — CẤM hỏi lại · CÒN THIẾU ĐÚNG: …» (giữ tiền tố — C11)', () => {
  const p = C.extractFromText('Amy Añoza\n0536064249\nJeddah District 1', C.emptyProfile());
  const block = C.buildProfileBlock(p, {});
  assert.match(block, /Bước còn thiếu: ĐÃ CÓ SĐT, địa chỉ — CẤM hỏi lại · CÒN THIẾU ĐÚNG: .*(gói|COD)/);
  assert.match(block, /Bước còn thiếu:.*(gói|COD)/, 'ca C11 phải còn khớp');
  const du = { ...p, tier: 'Buy 1 Get 1', cod: true };
  assert.match(C.buildProfileBlock(du, {}), /Bước còn thiếu: ĐÃ CÓ SĐT, địa chỉ — CẤM hỏi lại · đủ thông tin — chốt đơn được/);
});
test('BH9 H3 · codNgam ⇒ dòng «COD: chấp nhận ngầm … KHÔNG hỏi lại COD, tạo đơn (cod_confirmed=true)»', () => {
  const p = { ...C.extractFromText(DIA_CHI, C.emptyProfile()), cod: true, codNgam: true };
  assert.match(C.buildProfileBlock(p, {}), /COD: chấp nhận ngầm \(khách gửi SĐT \+ địa chỉ sau khi đã nghe điều kiện COD\) — KHÔNG hỏi lại COD, tạo đơn \(cod_confirmed=true\)/);
});
test('BH9 H4 · dấu hiệu y tế ⇒ dòng ⚕️ «câu ĐẦU: khuyên ngừng dùng và đi khám bác sĩ … KHÔNG nêu giá/gói ở tin này»', () => {
  const block = C.buildProfileBlock(C.emptyProfile(), { yTe: 'chảy máu' });
  assert.match(block, /⚕️ Khách báo chảy máu — câu ĐẦU: khuyên ngừng dùng và đi khám bác sĩ; nhắc cảnh báo của KB nếu có; KHÔNG hứa chữa; KHÔNG nêu giá\/gói ở tin này\./);
});
test('BH9 H5 · hồ sơ KHÔNG tenFb, không đủ SĐT+địa chỉ, không kích hoạt ⇒ khối GIỐNG base từng ký tự', async (t) => {
  const b = await base();
  if (!b) return t.skip('không dựng được bản base');
  const hoSo = [
    C.emptyProfile(),
    C.extractFromText('0536064249', C.emptyProfile()),
    C.extractFromText('Jeddah District 1 House 5', C.emptyProfile()),
    { ...C.emptyProfile(), tier: 'SET 2', objections: ['obj_price'], cod: true },
    C.extractFromText('The delivery was scheduled for today.', C.emptyProfile()),
    C.extractFromText('im in bangladesh now', C.emptyProfile()),
  ];
  const meta = { state: 'SELLING', used: 2, max: 6, tier: 'nóng', lastAi: 'Which set po?', idleMs: 40 * 60e3, kb: KB };
  const lech = hoSo.map((p, i) => [i, C.buildProfileBlock(p, meta), b.context.buildProfileBlock(p, meta)]).filter(([, a, c]) => a !== c);
  assert.deepEqual(lech.map(([i, a, c]) => `#${i}\nMỚI: ${a}\nBASE: ${c}`), []);
});
