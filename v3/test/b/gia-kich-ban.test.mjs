// GIÁ GÕ CỨNG TRONG KỊCH BẢN (28/09/2026).
//
// Giả lập Minty KSA: câu bot gửi khi khách hỏi giá là CHỮ GÕ TAY trong ô `fastLanePrice`,
// không lấy từ bảng giá. Sửa giá ở tab «Sản phẩm & giá» mà quên câu ấy ⇒ bot báo giá cũ,
// đơn tính giá mới. Câu dưới đây là câu THẬT của bản LIVE 6 kịch bản Minty KSA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { timGiaGoCung } from '../../src/ui/mot-page/gia-kich-ban.js';

const MINTY = {
  fastLanePrice: '🎉 ESPESYAL NA PROMO – Hanggang 70% OFF! 🎁 Buy 1 Get 1 – 109 SAR lamang '
    + '🎁 Buy 2 Get 2 – 159 SAR lamang 🚚 Libreng Shipping · 💵 Cash on Delivery (COD)',
  greeting: 'Hello po! 😊',
};
const BANG_HOM_NAY = [{ gia: 109, tienTe: 'SAR' }, { gia: 159, tienTe: 'SAR' }];
const NHAN = { fastLanePrice: 'Trả lời nhanh — hỏi giá' };

test('① tìm ra đủ hai giá gõ cứng của Minty, và nói chúng ĐANG KHỚP bảng giá', () => {
  const ds = timGiaGoCung(MINTY, BANG_HOM_NAY, NHAN);
  assert.deepEqual(ds.map((x) => [x.gia, x.tienTe, x.khop]), [[109, 'SAR', true], [159, 'SAR', true]]);
  assert.equal(ds[0].nhanO, 'Trả lời nhanh — hỏi giá', 'phải gọi ô bằng tên người đọc được');
});

test('② ĐỔI GIÁ trong bảng mà quên kịch bản ⇒ giá cũ bị đánh dấu LỆCH', () => {
  // Đúng cảnh cần canh: 109 → 119 ở tab Sản phẩm, câu mẫu vẫn nói 109.
  const ds = timGiaGoCung(MINTY, [{ gia: 119, tienTe: 'SAR' }, { gia: 159, tienTe: 'SAR' }]);
  assert.deepEqual(ds.filter((x) => !x.khop).map((x) => x.gia), [109]);
});

test('③ «Buy 1 Get 1» KHÔNG bị nhận nhầm thành giá — chỉ số đi kèm mã tiền tệ mới là giá', () => {
  const ds = timGiaGoCung(MINTY, BANG_HOM_NAY);
  assert.equal(ds.some((x) => x.gia === 1 || x.gia === 2 || x.gia === 70), false);
});

test('④ các cách viết khác: «SR 109», «109SR», «109,50 AED»', () => {
  const ds = timGiaGoCung({ a: 'Chỉ SR 109 thôi', b: 'giá 109SR', c: 'Dubai: 109,50 AED' },
    [{ gia: 109, tienTe: 'SAR' }]);
  assert.deepEqual(ds.map((x) => [x.o, x.gia, x.tienTe, x.khop]),
    [['a', 109, 'SAR', true], ['b', 109, 'SAR', true], ['c', 109.5, 'AED', false]]);
});

test('⑤ khác TIỀN TỆ thì không khớp dù cùng con số', () => {
  const ds = timGiaGoCung({ x: '109 AED' }, [{ gia: 109, tienTe: 'SAR' }]);
  assert.equal(ds[0].khop, false, '109 AED không phải 109 SAR');
});

test('⑥ kịch bản trống hay không có giá nào ⇒ danh sách rỗng, không ném', () => {
  assert.deepEqual(timGiaGoCung(null, BANG_HOM_NAY), []);
  assert.deepEqual(timGiaGoCung({ greeting: 'Hello po!' }, BANG_HOM_NAY), []);
});
