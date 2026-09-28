// GIÁ GỐC — được NHẮC, không được THU.
//
// Xuất xứ (28/09/2026, page Minty Fresh Smile KSA, mẻ 59 lượt khách mới):
// 10 lượt bị cổng RA chặn với mã PRICE_MISMATCH, tiền model đã tiêu mà khách không nhận
// được gì. Soi ra 9/10 là CÙNG một chuyện: khối KB do `rap-prompt.js#xayVanBanSanPham`
// dựng nói nguyên văn «Buy 1: 109 SAR (giá gốc 199, …)» — model đọc đúng, viết
// «109 SAR (original 199 SAR)», rồi bị chặn vì 199 ∉ {109, 159}. `goi_gia.gia_goc` trong
// CSDL đúng là 199 (bậc 1) và 398 (bậc 2): model KHÔNG bịa, cổng chặn sai.
//
// Bộ ca này ghim hai nửa của cách chữa. Nửa thứ hai mới là nửa quan trọng: nếu ai đó sau
// này "dọn trùng lặp" bằng cách cho `checkTotal` gọi `giaDuocNhac`, thì 199 SAR thành số
// tiền người giao hàng THU CỦA KHÁCH THẬT — đúng thảm hoạ 07/08 (khách Priscela Amon huỷ
// đơn + block page). Ca T3/T4 dưới đây là cái chặn việc đó.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { giaHopLe, giaDuocNhac, tinhTong, MA } from '../src/core/gia.js';
import { allowedPrices, guardOutbound } from '../src/outbound-guard.js';
import { checkTotal } from '../src/order-bridge.js';

// KB rút gọn đúng hình dạng `rap-prompt.js` trả ra (tier có `giaGoc`).
const KB = {
  pageName: 'Minty Fresh Smile KSA',
  products: [{
    id: 'SP01', name: 'Croent Hydroxyapatite Toothpaste', currency: 'SAR',
    tiers: [
      { label: 'Buy 1', qty: 1, price: 109, giaGoc: 199, khuyenMai: 'Buy 1 Get 1 free' },
      { label: 'Buy 2', qty: 2, price: 159, giaGoc: 398, khuyenMai: 'Buy 2 Get 2 free' },
    ],
  }],
};
// ⚠️ `guardOutbound(text, ctx)` chỉ có HAI tham số — KB đi qua `ctx.kb`. Gọi kiểu
// `guardOutbound(text, KB, ctx)` thì `kb` thành `{}`, luật 4 bị BỎ QUA và MỌI tin đều
// "lọt": bộ ca xanh trong khi không kiểm gì cả. Bản nháp đầu của file này mắc đúng lỗi đó;
// ca BỊA 249 bên dưới là thứ bắt được, nên đừng bỏ nó đi.
const ctx = { orderCreated: false, kb: KB };

test('T1 · giá gốc khai trong KB thì NHẮC được, giá bán vẫn y nguyên', () => {
  assert.deepEqual([...giaHopLe(KB)].sort((a, b) => a - b), [109, 159]);
  assert.deepEqual([...giaDuocNhac(KB)].sort((a, b) => a - b), [109, 159, 199, 398]);
  for (const n of giaHopLe(KB)) assert.ok(giaDuocNhac(KB).has(n), 'tập nhắc phải CHỨA tập bán');
});

test('T2 · cổng RA cho lọt đúng câu đã bị chặn thật hôm 28/09', () => {
  // Nguyên văn thể loại tin bị chặn (Nitz Alojado, Rene Yangyang, Emon Zamudio, …).
  const that = 'Hello po! 🦦 **Buy 1 — 109 SAR** (original 199 SAR) — 2 tubes, free shipping. '
    + 'Or **Buy 2 — 159 SAR** (original 398 SAR) for 4 tubes. How many would you like po?';
  const v = guardOutbound(that, ctx);
  assert.equal(v.ok, true, `phải lọt, nhưng bị chặn: ${v.rule} — ${v.reason}`);

  // Còn số KHÔNG có trong KB thì vẫn phải chặn — nới không được thành mở toang.
  const bia = guardOutbound('Buy 1 — 109 SAR (original 249 SAR), free shipping!', ctx);
  assert.equal(bia.ok, false);
  assert.equal(bia.rule, 'PRICE_MISMATCH');
  assert.match(bia.reason, /249/);
});

test('T3 · CỬA TIỀN không hề nới: 199 vẫn không tạo được đơn', () => {
  assert.deepEqual([...allowedPrices(KB)].sort((a, b) => a - b), [109, 159],
    'allowedPrices là tập ĐƯỢC THU — nới nó là cho người giao hàng thu 199 SAR thật');
  for (const n of [199, 398]) {
    const c = checkTotal(KB, n);
    assert.equal(c.ok, false, `checkTotal phải từ chối giá gốc ${n}`);
    assert.equal(c.code, 'MISMATCH');
    const t = tinhTong({ kb: KB, tong: n });
    assert.equal(t.chan, true, `tinhTong phải chặn giá gốc ${n}`);
    assert.equal(t.ma, MA.LECH_BANG_GIA);
  }
  assert.equal(checkTotal(KB, 109).ok, true, 'giá bán thật vẫn phải qua');
});

test('T4 · dữ liệu bẩn không mở được cửa: giaGoc ≤ giá bán thì bỏ', () => {
  const ban = (giaGoc) => ({ products: [{ id: 'X', currency: 'SAR', tiers: [{ label: 'Buy 1', price: 109, giaGoc }] }] });
  for (const rac of [109, 99, 0, -5, null, undefined, 'xyz', NaN]) {
    assert.deepEqual([...giaDuocNhac(ban(rac))], [109], `giaGoc=${String(rac)} không được thành giá nhắc được`);
  }
  assert.equal(giaDuocNhac({ products: [] }).size, 0, 'page chưa có gói → tập rỗng, không bịa');
  assert.equal(giaDuocNhac({}).size, 0);
  assert.equal(giaDuocNhac(null).size, 0);
});
