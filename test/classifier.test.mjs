// Nghiệm thu bộ phân loại LUẬT (thay lần gọi Haiku mỗi lượt — xem đầu src/classifier.js).
// Điều quan trọng nhất ở đây KHÔNG phải "bắt đúng khiếu nại" mà là "KHÔNG bắt nhầm":
// nhãn 'complaint' khoá AI ngay lập tức, và cửa này từng chiếm ~45% việc đổ lên sale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/classifier.js';

const of = async (t) => (await classify(t)).intent;

test('K1 · giữ nguyên shape cũ để handler không phải đổi dòng nào', async () => {
  const r = await classify('magkano po?');
  for (const k of ['intent', 'lang', 'lead_quality', 'urgency', 'is_spam_conf']) {
    assert.ok(k in r, `thiếu trường ${k}`);
  }
  assert.ok(['interested', 'question', 'complaint', 'spam'].includes(r.intent));
  assert.ok(['tl', 'en', 'other'].includes(r.lang));
});

test('K2 · ⚠️⚠️ PHẢN ĐỐI BÁN HÀNG KHÔNG PHẢI KHIẾU NẠI (đây là chỗ mất đơn)', async () => {
  // Cả nhóm này M11 CỘNG ĐIỂM và cho thêm 3 lượt chạy ladder — dán nhãn complaint là giết đúng
  // nhóm khách đang cân nhắc mua.
  for (const t of ['ang mahal naman po', 'sobrang mahal', 'iisipin ko muna po', 'next time na lang',
    'wala pang budget', 'peke ba to?', 'original ba yan?', 'legit ba kayo?', 'effective ba talaga?',
    'Is December birthstone available? Or this is a SCAM?']) {
    assert.notEqual(await of(t), 'complaint', `KHÔNG được coi là khiếu nại: ${t}`);
  }
});

test('K3 · tố cáo thẳng / doạ kiện / chửi tục → khiếu nại', async () => {
  for (const t of ['manloloko kayo!', 'YOU ALMOST SCAM ME! LUCKILY I STILL USE MY INSTINCT.',
    'you are a scammer', 'ireport ko kayo sa DTI', "i'll sue you", 'putangina niyo', 'أنتم نصابين']) {
    assert.equal(await of(t), 'complaint', `phải là khiếu nại: ${t}`);
  }
});

test('K4 · ⭐ khách đòi NGỪNG NHẮN → bàn giao IM LẶNG, không nhắn thêm câu nào', async () => {
  for (const t of ['stop messaging me', 'you are harassing me', 'leave me alone', 'huwag na kayong mag message']) {
    const r = await classify(t);
    assert.equal(r.intent, 'complaint', t);
    assert.equal(r.stop_contact, true, `phải bật cờ im lặng: ${t}`);
  }
  // khiếu nại thường thì VẪN gửi câu giữ chỗ
  assert.notEqual((await classify('manloloko kayo!')).stop_contact, true);
});

test('K5 · spam thô → im, nhưng ngưỡng phải cao (im nhầm = mất đơn)', async () => {
  const r = await classify('sex video');
  assert.equal(r.intent, 'spam');
  assert.ok(r.is_spam_conf >= 0.8, 'handler chỉ im khi is_spam_conf ≥ 0.8');
  for (const t of ['magkano po', 'hello po', 'may stock pa?', 'gusto ko po umorder']) {
    assert.notEqual(await of(t), 'spam', `không phải spam: ${t}`);
  }
});

test('K6 · ngôn ngữ đủ 3 nhánh handler cần', async () => {
  assert.equal((await classify('magkano po ang isa')).lang, 'tl');
  assert.equal((await classify('how much is this')).lang, 'en');
  assert.equal((await classify('كم السعر')).lang, 'other', 'Ả Rập → other để dùng câu song ngữ');
});

test('K7 · tin rỗng / sticker không làm gãy phân loại', async () => {
  for (const t of ['', '   ', null, undefined, '👍']) {
    const r = await classify(t);
    assert.ok(r && r.intent, `phải trả về hợp lệ cho: ${JSON.stringify(t)}`);
    assert.notEqual(r.intent, 'complaint');
  }
});

test('K8 · không gọi mạng — luật phải chạy được khi API chết hoàn toàn', async () => {
  // Bản cũ gọi Haiku mỗi lượt; API lỗi thì fallback dán 'interested' cho MỌI tin, tức mất
  // hẳn khả năng nhận ra spam/khiếu nại đúng lúc hệ thống yếu nhất.
  const t0 = Date.now();
  for (let i = 0; i < 500; i++) await classify('ang mahal naman po ' + i);
  assert.ok(Date.now() - t0 < 1000, '500 lượt phân loại phải xong dưới 1 giây (thuần luật)');
});
