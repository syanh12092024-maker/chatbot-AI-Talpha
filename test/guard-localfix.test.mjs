// SỬA TẠI CHỖ thay vì xin model viết lại.
//
// Xuất xứ 11/08/2026: đối chiếu hoá đơn Kimi ($0,87/ngày) với Sổ AI ($0,27) thì
// lộ ra tiền chảy vào các lượt KHÔNG gửi được tin. Đếm log: 44 lần guard can
// thiệp, 44 lần đều "xin model viết lại" — mỗi lần thêm trọn một lời gọi.
// 32/44 là TOO_LONG + CHECKLIST, tức lỗi HÌNH THỨC mà code cắt được.
import test from 'node:test';
import assert from 'node:assert/strict';
import { guardOutbound, localFix, canFixLocally } from '../src/outbound-guard.js';

const KB = {
  text: '# SẢN PHẨM & GIÁ\n- [P1] Soap\n    Giá — Buy 1 Get 2 FREE: 99 AED | Buy 2 Get 3 FREE: 149 AED',
  products: [{ id: 'P1', currency: 'AED', tiers: [{ label: 'Buy 1 Get 2 FREE', price: 99 }, { label: 'Buy 2 Get 3 FREE', price: 149 }] }],
};

test('L1 · chỉ TOO_LONG và CHECKLIST được sửa máy móc', () => {
  assert.equal(canFixLocally('TOO_LONG'), true);
  assert.equal(canFixLocally('CHECKLIST'), true);
  // Lỗi NỘI DUNG phải để model viết lại — cắt máy móc là làm sai nghĩa.
  for (const r of ['PRICE_MISMATCH', 'PII_ECHO', 'DELIVERY_PROMISE', 'FAKE_SCARCITY', 'VIETNAMESE_WORD']) {
    assert.equal(canFixLocally(r), false, r);
    assert.equal(localFix('bất kỳ tin nào', r), null, r);
  }
});

test('L2 · tin quá dài: cắt về trong hạn và QUA được guard', () => {
  const dai = [
    'Hello po! 😊 Thank you for your interest in our Luxury Perfume Soap.',
    'It has 24K gold leaf and essential oils for a premium bathing experience.',
    'Many customers say the scent lasts all day and skin feels smooth.',
    'We have a special promo today for our loyal customers.',
    'Buy 1 Get 2 FREE — 99 AED, total 3 pcs.',
    'Buy 2 Get 3 FREE — 149 AED, total 5 pcs.',
    'Free delivery po and COD, pay only when you receive.',
    'Which promo would you like to choose po?',
  ].join('\n');
  assert.equal(guardOutbound(dai, { kb: KB }).rule, 'TOO_LONG');

  const fixed = localFix(dai, 'TOO_LONG');
  assert.ok(fixed, 'phải cắt được');
  assert.equal(guardOutbound(fixed, { kb: KB }).ok, true, 'cắt xong phải qua guard');
  assert.ok(fixed.length < dai.length);
  // NGUYÊN TẮC #14 — phải giữ câu chốt ở cuối, cắt cụt là mất bước tiến về đơn.
  assert.match(fixed.trim().split('\n').pop(), /[?？]/);
});

test('L3 · checklist nhiều dòng gộp thành một dòng, giữ nguyên chữ của model', () => {
  const cl = [
    'Thank you po! To process your order, please send:',
    '• Name:',
    '• Phone number:',
    '• Complete address:',
  ].join('\n');
  assert.equal(guardOutbound(cl, { kb: KB }).rule, 'CHECKLIST');

  const fixed = localFix(cl, 'CHECKLIST');
  assert.ok(fixed, 'phải gộp được');
  assert.equal(guardOutbound(fixed, { kb: KB }).ok, true, 'gộp xong phải qua guard');
  assert.ok(fixed.split('\n').length < cl.split('\n').length);
  // giữ chữ của model, không tự chế câu mới (khách mỗi page một ngôn ngữ)
  assert.match(fixed, /Name/);
  assert.match(fixed, /Phone number/);
  assert.match(fixed, /address/i);
});

test('L4 · tin đã hợp lệ thì không đụng vào', () => {
  assert.equal(localFix('Buy 1 Get 2 FREE — 99 AED po. Ilan po ang gusto niyo? 😊', 'TOO_LONG'), null);
  assert.equal(localFix('Salamat po!', 'CHECKLIST'), null);
});

test('L5 · cắt xong VẪN phạm thì trả bản cắt, handler tự kiểm lại rồi mới quyết', () => {
  // Tin dài VÀ bịa giá: cắt xong vẫn sai giá → handler phải thấy guard chưa ok
  // và rơi xuống nhánh hỏi model, không được gửi liều.
  const xau = ['Hello po!', 'Our price is 298 AED for 12 pcs.', 'a', 'b', 'c', 'd', 'e', 'f?'].join('\n');
  const fixed = localFix(xau, 'TOO_LONG');
  if (fixed) assert.equal(guardOutbound(fixed, { kb: KB }).ok, false, 'guard vẫn phải bắt giá bịa');
});
