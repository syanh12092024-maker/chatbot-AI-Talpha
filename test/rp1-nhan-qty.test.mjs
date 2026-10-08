// RP1 ② 3 · «TÊN BẬC» TỪ GIAO DIỆN + LUẬT `qty` CÓ ĐIỀU KIỆN — tầng THUẦN (không CSDL, không mạng).
//
// Đo trên CHÍNH hai hàm thật: nhãn do `rap-prompt.js#goiGiaChoChat` dựng từ hàng `goi_gia` (đúng hình dạng CSDL — `nhan`, `so_luong`,
// `gia` đơn vị NHỎ, `tien_te`), rồi đơn đi qua `orders/draft.js#chuanBiDon` (cửa lên đơn của tool `create_draft_order`). Đáp án lấy
// từ ĐỀ BÀI (phiếu ② 3 + ④3 + review (a) vòng 2 R2-C1/R2-N7), không lấy từ code bị đo.
// Nhánh KHÔNG chạm ở tệp này: prompt/fast-lane/tool/hàng chờ trên đường thật — ở `test/rp1-duong-csdl.test.mjs` (R3*).
import test from "node:test";
import assert from "node:assert/strict";
import { goiGiaChoChat } from "../src/chat/rap-prompt.js";
import { chuanBiDon } from "../src/orders/draft.js";

const bac = (so_luong, giaLon, nhan = "", tien_te = "SAR") => ({ so_luong, gia: giaLon * 100, tien_te, nhan });
const nhan = (b) => goiGiaChoChat(b).label;
/** kb đúng khuôn `rapKb` dựng: tiers = goiGiaChoChat(hàng goi_gia). */
const kbTu = (dsBac, id = "111:a1") => ({ products: [{ id, name: "Tummiva Care gel — 50ml", currency: "SAR", tiers: dsBac.map(goiGiaChoChat) }] });
const don = (them) => ({ name: "Amina", phone: "0551234567", address: "King Fahd Road, building 12", city: "Riyadh",
  cod_confirmed: true, product_id: "111:a1", ...them });
const tuChoi = (kb, input, re = /TỪ CHỐI tạo đơn/) => assert.throws(() => chuanBiDon(kb, input), re);

// Bảng page BOGO thật (bản chụp 28/09): không bậc nào so_luong 1.
const BOGO = [bac(2, 109, "Buy 1 Get 1 FREE"), bac(4, 159, "Buy 2 Get 2 FREE (Total 4 Products)")];

test("N1 · nhãn trống ⇒ «Buy <so_luong>» như cũ (không nối số món)", () => {
  assert.equal(nhan(bac(2, 109, "")), "Buy 2");
  assert.equal(nhan(bac(1, 99, "   ")), "Buy 1");
});

test("N2 · nhãn marketer khác «Buy N» ⇒ giữ nguyên chữ + nối số món «(N items)»", () => {
  assert.equal(nhan(bac(2, 109, "Buy 1 Get 1 FREE")), "Buy 1 Get 1 FREE (2 items)");
  assert.equal(nhan(bac(2, 299, "  2 Pairs – (Most Popular Choice) ")), "2 Pairs – (Most Popular Choice) (2 items)");
  assert.equal(nhan(bac(1, 199, "1 Set")), "1 Set (1 item)");
  // KHÔNG dịch, không đổi hoa/thường của chữ marketer gõ.
  assert.equal(nhan(bac(3, 159, "BUY 1 TAKE 2")), "BUY 1 TAKE 2 (3 items)");
});

test("N3 · nhãn có «Total <số>» ⇒ KHÔNG nối (kể cả khi Total ≠ so_luong — 6/72 sản phẩm bản chụp 28/09)", () => {
  assert.equal(nhan(bac(2, 109, "Buy 1 Get 1 FREE (Total 2 Products)")), "Buy 1 Get 1 FREE (Total 2 Products)");
  assert.equal(nhan(bac(4, 159, "Buy 2 Get 2 FREE (Total 4 Products)")), "Buy 2 Get 2 FREE (Total 4 Products)");
  assert.equal(nhan(bac(1, 109, "Buy 1 Get 1 FREE (Total 2 Products)")), "Buy 1 Get 1 FREE (Total 2 Products)",
    "Total 2 trên bậc so_luong 1: nối thêm sẽ ra «(Total 2 Products) (1 item)»");
  assert.equal(nhan(bac(3, 1, "BUY 1 TAKE 2 (TOTAL: 3 Bracelet)")), "BUY 1 TAKE 2 (TOTAL: 3 Bracelet)");
});

test("N4 · nhãn CHÍNH LÀ «Buy N» (hoa/thường · chữ đậm toán học · khoảng trắng) ⇒ không nối", () => {
  assert.equal(nhan(bac(2, 159, "Buy 2")), "Buy 2");
  assert.equal(nhan(bac(2, 159, "buy  2")), "buy  2");
  assert.equal(nhan(bac(2, 159, "𝐁𝐮𝐲 𝟐")), "𝐁𝐮𝐲 𝟐");
  // «Buy 2» trên bậc so_luong 3 KHÔNG phải nhãn mặc định ⇒ nối (khách phải biết gói có 3 món).
  assert.equal(nhan(bac(3, 159, "Buy 2")), "Buy 2 (3 items)");
});

test("N5 · qty của bậc vẫn là so_luong (cửa tiền đọc qty, không đọc nhãn)", () => {
  assert.deepEqual(BOGO.map(goiGiaChoChat).map((t) => [t.qty, t.price, t.currency]), [[2, 109, "SAR"], [4, 159, "SAR"]]);
});

test("Q1 · BOGO: model truyền số «mua» qty=1 (không bậc nào so_luong 1) ⇒ NHẬN, đơn ghi qty = so_luong 2", () => {
  const o = chuanBiDon(kbTu(BOGO), don({ qty: 1, total_price: 109, variant: "Buy 1 Get 1 FREE" }));
  assert.deepEqual([o.qty, o.total_price, o.currency, o.variant], [2, 109, "SAR", "Buy 1 Get 1 FREE (2 items)"]);
  // Không nêu variant: chonGoi bước ③ khớp «buy 1» ở đầu nhãn — cùng kết quả.
  const o2 = chuanBiDon(kbTu(BOGO), don({ qty: 1, total_price: 109 }));
  assert.equal(o2.qty, 2);
});

test("Q2 · qty = so_luong của bậc ⇒ nhận nguyên", () => {
  const o = chuanBiDon(kbTu(BOGO), don({ qty: 2, total_price: 109, variant: "Buy 1 Get 1 FREE (2 items)" }));
  assert.deepEqual([o.qty, o.total_price], [2, 109]);
  const o4 = chuanBiDon(kbTu(BOGO), don({ qty: 4, total_price: 159, variant: "Buy 2 Get 2 FREE (Total 4 Products)" }));
  assert.deepEqual([o4.qty, o4.total_price], [4, 159]);
});

test("Q3 · ÂM: khách muốn 3 cái, qty=3 trên bậc 2 món ⇒ TỪ CHỐI (không ép về 2)", () => {
  tuChoi(kbTu(BOGO), don({ qty: 3, total_price: 109, variant: "Buy 1 Get 1 FREE" }), /số lượng không khớp gói giá/);
});

test("Q4 · ÂM: có bậc so_luong 1 riêng ⇒ qty=1 KHÔNG bị ép sang bậc 2 món; qty=1 đúng giá bậc 1 thì nhận qty 1", () => {
  const kb = kbTu([bac(1, 99, "Buy 1"), bac(2, 109, "Buy 1 Get 1 FREE")]);
  // variant ĐÚNG nhãn bot đọc ⇒ chonGoi chọn chắc bậc 2 món; lý do từ chối phải là LUẬT SỐ LƯỢNG (không phải «chưa rõ gói»).
  tuChoi(kb, don({ qty: 1, total_price: 109, variant: "Buy 1 Get 1 FREE (2 items)" }), /số lượng không khớp gói giá/);
  const o = chuanBiDon(kb, don({ qty: 1, total_price: 99, variant: "Buy 1" }));
  assert.deepEqual([o.qty, o.total_price], [1, 99]);
});

test("Q5 · ÂM: hai gói BOGO (4 cái) nhét vào giá MỘT gói ⇒ TỪ CHỐI", () => {
  tuChoi(kbTu(BOGO), don({ qty: 4, total_price: 109, variant: "Buy 1 Get 1 FREE" }), /số lượng không khớp gói giá/);
});

test("Q6 · ÂM: giá lệch bậc (chọn BOGO mà khai 159) ⇒ TỪ CHỐI", () => {
  tuChoi(kbTu(BOGO), don({ qty: 1, total_price: 159, variant: "Buy 1 Get 1 FREE" }));
});

test("Q7 · ÂM: khách nói «2» mà model chọn bậc «Buy 2 Get 2» (4 món) trong khi BOGO có so_luong 2 ⇒ TỪ CHỐI (mơ hồ — hỏi lại)", () => {
  tuChoi(kbTu(BOGO), don({ qty: 2, total_price: 159, variant: "Buy 2 Get 2 FREE (Total 4 Products)" }), /số lượng không khớp gói giá/);
});

test("Q8 · nhãn trống (Buy N) như cũ: qty khác so_luong ⇒ TỪ CHỐI; bằng ⇒ nhận", () => {
  const kb = kbTu([bac(1, 99), bac(2, 159)]);
  tuChoi(kb, don({ qty: 1, total_price: 159, variant: "Buy 2" }), /số lượng không khớp gói giá/);
  assert.equal(chuanBiDon(kb, don({ qty: 2, total_price: 159, variant: "Buy 2" })).qty, 2);
});

test("Q9 · model KHÔNG nêu gói, bảng DB có đúng một bậc so_luong = qty ⇒ chọn bậc đó (nhãn tự do không số đầu · không chọn nhầm «Buy 2 Get 2»)", () => {
  // /code-review RP1 #1: trước sửa, nhãn «Best Value» không có số đầu ⇒ chonGoi bước ③ trượt ⇒ «chưa xác định được gói giá».
  const kbTuDo = kbTu([bac(1, 99, "Special Offer"), bac(3, 199, "Best Value")]);
  const o = chuanBiDon(kbTuDo, don({ qty: 3, total_price: 199 }));
  assert.deepEqual([o.qty, o.total_price, o.variant], [3, 199, "Best Value (3 items)"]);
  // BOGO: khách nói 2 cái, không nêu gói ⇒ bậc so_luong 2 (109), KHÔNG phải bậc nhãn «Buy 2 Get 2» (4 món, 159).
  const o2 = chuanBiDon(kbTu(BOGO), don({ qty: 2, total_price: 109 }));
  assert.deepEqual([o2.qty, o2.total_price], [2, 109]);
  tuChoi(kbTu(BOGO), don({ qty: 2, total_price: 159 }), /gói "Buy 1 Get 1 FREE \(2 items\)" có giá 109/);
  // Không nêu tổng ⇒ server điền đúng giá bậc so_luong 2.
  assert.equal(chuanBiDon(kbTu(BOGO), don({ qty: 2 })).total_price, 109);
});
