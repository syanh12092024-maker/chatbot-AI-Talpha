// KHÁCH HỎI NGÔN NGỮ NÀO, BOT TRẢ LỜI NGÔN NGỮ ĐÓ (28/09/2026).
//
// Mọi câu dưới đây là câu THẬT, lấy từ lượt giả lập Minty KSA trên 12 lượt khách 28/09 —
// không phải câu tự nghĩ ra. Ba khách gõ «How much?» nhận câu mẫu tiếng Tagalog.
import test from 'node:test';
import assert from 'node:assert/strict';
import { doanNgonNgu, ngonNguLech, NGON_NGU } from '../src/chat/ngon-ngu.js';

const MAU_GIA_TAGALOG = '🎉 ESPESYAL NA PROMO – Hanggang 70% OFF! 🎁 Buy 1 Get 1 – 109 SAR lamang '
  + '🎁 Buy 2 Get 2 – 159 SAR lamang 🚚 Libreng Shipping · 💵 Cash on Delivery (COD) '
  + '👉 Umorder na ngayon at makamit ang mas maputi at mas kumpiyansang ngiti araw-araw! '
  + 'Ilang set po ang gusto ninyong orderin? 📦';

test('① câu thật của khách được đoán đúng ngôn ngữ', () => {
  assert.equal(doanNgonNgu('How much?'), NGON_NGU.EN);
  assert.equal(doanNgonNgu('how much'), NGON_NGU.EN);
  assert.equal(doanNgonNgu('what is its final price'), NGON_NGU.EN);
  assert.equal(doanNgonNgu('Place an order🎁'), NGON_NGU.EN, '«order» đứng một mình KHÔNG biến câu thành Tagalog');
  assert.equal(doanNgonNgu('mag kano.'), NGON_NGU.TL);
  assert.equal(doanNgonNgu('sir ..san po ito mbili'), NGON_NGU.TL);
  assert.equal(doanNgonNgu('كم السعر'), NGON_NGU.AR);
  // Bản đầu của bộ đoán nhận câu này là TIẾNG ANH (thiếu «ilang», «araw», «dumating») —
  // bắt được vì một ca cũ đỏ oan. Giữ lại đây để nó không quay lại.
  assert.equal(doanNgonNgu('ilang araw bago dumating'), NGON_NGU.TL);
  assert.equal(doanNgonNgu('totoo ba ito'), NGON_NGU.TL);
  assert.equal(doanNgonNgu('paano mag order'), NGON_NGU.TL);
});

test('② câu mẫu giá của Minty KSA là tiếng Tagalog', () => {
  assert.equal(doanNgonNgu(MAU_GIA_TAGALOG), NGON_NGU.TL);
});

test('③ khách hỏi tiếng Anh ⇒ LỆCH với câu mẫu Tagalog ⇒ phải nhường cho model', () => {
  assert.equal(ngonNguLech('How much?', MAU_GIA_TAGALOG), true);
  assert.equal(ngonNguLech('what is its final price', MAU_GIA_TAGALOG), true);
});

test('④ khách hỏi tiếng Tagalog ⇒ KHÔNG lệch ⇒ câu mẫu vẫn trả lời, 0 đồng như cũ', () => {
  assert.equal(ngonNguLech('mag kano.', MAU_GIA_TAGALOG), false);
  assert.equal(ngonNguLech('sir ..san po ito mbili', MAU_GIA_TAGALOG), false);
});

test('⑤ câu PHA tiếng (Taglish) hợp với cả câu mẫu tiếng Anh lẫn tiếng Tagalog', () => {
  // Rất phổ biến ở khách Philippines. Bản đầu xếp «Yes po, 100% original» vào tiếng Tagalog
  // ⇒ khách hỏi «is this original?» bị nhường oan — hai ca cũ đỏ vì thế.
  assert.equal(doanNgonNgu('How much po?'), NGON_NGU.MIX);
  assert.equal(doanNgonNgu('Yes po, 100% original with warranty card. 😊'), NGON_NGU.MIX);
  assert.equal(ngonNguLech('How much po?', MAU_GIA_TAGALOG), false);
  assert.equal(ngonNguLech('is this original?', 'Yes po, 100% original with warranty card. 😊'), false);
  // «po» đứng một mình = lễ phép, không phải tiếng Tagalog thuần.
  assert.equal(doanNgonNgu('Yes po, original.'), NGON_NGU.MIX);
  assert.equal(ngonNguLech('is this original?', 'Yes po, original.'), false);
});

test('⑤b tiếng Việt: nhận ra, nhưng KHÔNG đủ căn cứ để nhường', () => {
  assert.equal(doanNgonNgu('MẪU CỨNG ship'), NGON_NGU.VI);
  assert.equal(doanNgonNgu('Dạ sản phẩm này là hàng chính hãng ạ.'), NGON_NGU.VI);
  assert.equal(ngonNguLech('paano mag order', 'MẪU CỨNG: xin tên, SĐT, địa chỉ.'), false);
});

test('⑥ BẢO THỦ: đoán không ra thì KHÔNG nhường — giữ hành vi cũ', () => {
  // Thà gửi câu mẫu như hôm nay còn hơn đẩy lượt lên model chỉ vì bộ đoán không chắc.
  for (const x of ['👍', '??', '109', 'ok', 'hi', '']) {
    assert.equal(ngonNguLech(x, MAU_GIA_TAGALOG), false, `«${x}» không đủ căn cứ để nhường`);
  }
});

test('⑦ một từ phụ Tagalog lạc vào câu tiếng Anh không đổi cả câu', () => {
  assert.equal(doanNgonNgu('Is it in stock na?'), NGON_NGU.EN);
  assert.equal(doanNgonNgu('Do you speak Hindi?'), NGON_NGU.EN);
  assert.equal(doanNgonNgu('I ate already'), NGON_NGU.EN, '«ate» là động từ tiếng Anh, không phải «chị»');
});
