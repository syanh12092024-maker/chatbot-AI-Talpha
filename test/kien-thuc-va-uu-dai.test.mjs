// KIẾN THỨC SẢN PHẨM + ƯU ĐÃI RA KHỎI PROMPT (migration 021).
//
// Ba thứ từng chỉ tồn tại trong một khối văn xuôi 3.540 ký tự của kịch bản: công dụng,
// khuyến mãi, phí ship. Hậu quả nặng nhất không phải tốn token — mà là bot đọc khuyến mãi
// từ CHỮ trong khi server tính tiền từ BẢNG: hai nguồn, và không lớp nào bắt được lúc
// chúng nói khác nhau.
import test from 'node:test';
import assert from 'node:assert/strict';
import { goiGiaChoChat, xayVanBanSanPham } from '../src/chat/rap-prompt.js';

const bac = (o = {}) => ({ so_luong: 1, gia: 9900, tien_te: 'SAR', ...o });

test('UD1 · giá mang theo ưu đãi, và giữ nguyên đơn vị lớn cho người đọc', () => {
  const t = goiGiaChoChat(bac({ gia: 9900, gia_goc: 14900, khuyen_mai: 'Mua 1 tặng 1', phi_ship: 0, mien_ship: true }));
  assert.equal(t.price, 99);
  assert.equal(t.giaGoc, 149);
  assert.equal(t.khuyenMai, 'Mua 1 tặng 1');
  assert.equal(t.mienShip, true);
  assert.equal(t.phiShip, 0);
});

test('UD2 · CHƯA KHAI ship khác KHÔNG miễn ship — cấm quy null thành false', () => {
  // Đây là chỗ dễ nhất để bịa một lời hứa: coi «chưa ai khai» là «không miễn» thì bot nói
  // chắc nịch một điều không ai kiểm chứng. Giữ null, và khối prompt phải NÓI RA là chưa khai.
  const t = goiGiaChoChat(bac());
  assert.equal(t.mienShip, null);
  assert.equal(t.phiShip, null);

  const chu = xayVanBanSanPham([{ ma: 'SP1', ten: 'Gum', goiGia: [bac()], kienThuc: {} }]);
  assert.match(chu, /phí ship CHƯA khai/);
  assert.match(chu, /KHÔNG hứa miễn ship/);
});

test('UD3 · kiến thức hiện CÓ NHÃN, đúng thứ tự, bỏ mục rỗng', () => {
  const chu = xayVanBanSanPham([{
    ma: 'SP1', ten: 'Gum', goiGia: [bac({ mien_ship: true })],
    kienThuc: { cong_dung: 'Làm trắng răng', canh_bao: 'Không dùng cho trẻ dưới 3 tuổi', thanh_phan: '', hop_voi: ['người hút thuốc', 'uống cà phê'] },
  }]);
  assert.match(chu, /Công dụng: Làm trắng răng/);
  assert.match(chu, /Hợp với: người hút thuốc; uống cà phê/, 'mảng thì nối bằng dấu chấm phẩy');
  assert.match(chu, /Lưu ý \/ cảnh báo: Không dùng cho trẻ/);
  assert.ok(!/Thành phần/.test(chu), 'mục rỗng KHÔNG chiếm chỗ trong prompt');
  assert.ok(chu.indexOf('Công dụng') < chu.indexOf('Lưu ý'), 'công dụng trước, cảnh báo cuối');
});

test('UD4 · bậc giá TẮT không vào prompt, nhưng số bậc tắt phải NÓI RA', () => {
  // Im lặng bỏ qua thì người soát nhìn màn thấy 3 bậc, bot chỉ chào 2, và không ai hiểu vì sao.
  const chu = xayVanBanSanPham([{ ma: 'SP1', ten: 'Gum', goiGia: [bac({ mien_ship: false })], goiGiaTat: 2, kienThuc: {} }]);
  assert.match(chu, /2 bậc giá đang TẮT/);
});

test('UD5 · giá gốc chỉ hiện khi CAO HƠN giá bán', () => {
  // Giá gốc thấp hơn giá bán là dữ liệu hỏng; in ra là dạy bot nói một câu vô lý.
  const chu = xayVanBanSanPham([{ ma: 'SP1', goiGia: [bac({ gia: 9900, gia_goc: 5000 })], kienThuc: {} }]);
  assert.ok(!/giá gốc/.test(chu));
});
