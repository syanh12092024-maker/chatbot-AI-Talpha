// L2-M2 · LỚP TỪ KHOÁ v3 — bộ ca đơn vị cho `src/chat/lop-tu-khoa.js`.
//
// Hàm `lopTuKhoa` là hàm THUẦN (không DB, không mạng) nên bộ ca này chạy thẳng, không
// cần sandbox — phần NỐI vào handler-v3.js (gọi model đúng 0 lượt / NHƯỜNG đúng khi
// thiếu KB) được đo riêng ở `test/l2-m2-handler.test.js` (cần DB thật).
//
// Đề bài ④ (PHIEU-L2-M2.md):
//   #1 bắt đúng ≥12 câu thật/giả + ≥8 câu size (đa ngôn ngữ), trả lời từ KB
//   #2 paano: "paano mag order" + ≥3 biến thể → bắt (đối chứng: bản cũ fastLane KHÔNG bắt)
//   #3 NHƯỜNG đúng: thiếu KB → không đáp (phần "model được gọi" đo ở test handler)
//   #4 không cướp diễn đàn: 10 câu ngoài 2 luật → không bắt, dù KB ĐÃ có đủ dữ liệu
import test from "node:test";
import assert from "node:assert/strict";
import { lopTuKhoa, LANE } from "../src/chat/lop-tu-khoa.js";

// Bản CHỤP LẠI đúng nguyên văn ASK_HOWTO của fast-lane.js (đo 22/08, dòng 68) — CHỈ
// dùng để LÀM ĐỐI CHỨNG trong test này (chứng minh biến thể "tách chữ" từng trượt),
// KHÔNG import/sửa fast-lane.js (file CẤM SỬA, phiếu ②).
const ASK_HOWTO_BAN_CU =
  /(how to order|how do i order|how can i order|paano (?:mag)?(?:order|umorder|bumili)|pano (?:mag)?order|pa ?order|kaano|كيف أطلب|كيفية الطلب|طريقة الطلب)/i;

const kbDay = {
  config: {
    fastLaneAuth:
      "Oo po, 100% original ang produkto namin — may seal + warranty card. 😊",
    fastLaneSize:
      "📏 Size chart: S (34-36) · M (38-40) · L (42-44) · XL (46-48)",
    fastLaneHowto:
      "Pindutin lang ang 'Order Now' at punan ang form. COD po — bayad pagdating.",
  },
};
const kbRong = { config: {} }; // trang CHƯA khai 3 trường 0-đồng

test("LANE export đúng literal đề bài ①#4", () => {
  assert.equal(LANE, "tu_khoa_v3");
});

test("Luật 1 · THẬT/GIẢ — bắt ≥12 câu đa ngôn ngữ (EN/PH/AR), trả lời từ KB, 0 token", () => {
  const cau = [
    "is this real?",
    "is it fake?",
    "is it genuine?",
    "is it authentic?",
    "are they authentic?",
    "is it legit?",
    "orig ba to?",
    "original po ba ito?",
    "totoo po ba?",
    "peke ba to?",
    "hindi po peke?",
    "tunay ba ito?",
    "authentic ba?",
    "هل هذا اصلي؟",
    "هل هو أصلي ولا تقليد؟",
    "منتج حقيقي؟",
  ];
  assert.ok(cau.length >= 12, "bộ ca phải ≥12 câu");
  for (const text of cau) {
    const r = lopTuKhoa({ text, kb: kbDay });
    assert.equal(r.handled, true, `"${text}" phải được bắt`);
    assert.equal(r.reply, kbDay.config.fastLaneAuth);
    assert.equal(r.rule, "that_gia");
  }
});

test("Luật 2 · HỎI SIZE — bắt ≥8 câu đa ngôn ngữ (EN/PH/AR), trả lời từ KB, 0 token", () => {
  const cau = [
    "what size do you have?",
    "size chart please",
    "sizing guide?",
    "available sizes?",
    "meron po ba size L?",
    "ano po ang size niyo?",
    "pwede po malaman ang sukat?",
    "mga sukat po?",
    "ما هو المقاس المتوفر؟",
    "عندكم مقاسات؟",
  ];
  assert.ok(cau.length >= 8, "bộ ca phải ≥8 câu");
  for (const text of cau) {
    const r = lopTuKhoa({ text, kb: kbDay });
    assert.equal(r.handled, true, `"${text}" phải được bắt`);
    assert.equal(r.reply, kbDay.config.fastLaneSize);
    assert.equal(r.rule, "hoi_size");
  }
});

test("Vá paano — ≥3 biến thể GÃY trước đây trượt regex cũ, nay bắt được", () => {
  const bienThe = [
    "paano mag order",
    "paano mag-order",
    "pano mag order",
    "pano mag-order",
    "paano po mag order",
    "paano ba mag-umorder",
  ];
  assert.ok(bienThe.length >= 3, "phải ≥3 biến thể theo đề bài ④#2");
  for (const text of bienThe) {
    assert.equal(
      ASK_HOWTO_BAN_CU.test(text),
      false,
      `ĐỐI CHỨNG: "${text}" phải KHÔNG khớp regex cũ — nếu khớp thì đây không còn là lỗ`,
    );
    const r = lopTuKhoa({ text, kb: kbDay });
    assert.equal(r.handled, true, `"${text}" phải được lớp mới bắt`);
    assert.equal(r.rule, "paano_gap");
    assert.equal(r.reply, kbDay.config.fastLaneHowto);
  }
});

test("Vá paano — trang chưa có fastLaneHowto riêng thì dùng khung mặc định theo ngôn ngữ", () => {
  const r = lopTuKhoa({ text: "paano mag order", kb: kbRong });
  assert.equal(r.handled, true);
  assert.equal(r.rule, "paano_gap");
  assert.match(r.reply, /Pangalan|Number|Address/); // khung TL mặc định
});

test("Vá paano — KHÔNG giẫm lên biến thể fastLane cũ ĐÃ bắt đúng (giữ nguyên ưu tiên L8)", () => {
  const daBatDung = [
    "paano magorder",
    "paano umorder",
    "paano bumili",
    "paano order",
    "pano magorder",
    "how to order",
    "how do i order",
    "pa order",
  ];
  for (const text of daBatDung) {
    assert.equal(
      ASK_HOWTO_BAN_CU.test(text),
      true,
      `ĐỐI CHỨNG: "${text}" phải khớp regex cũ (không phải ca của phiếu này)`,
    );
    const r = lopTuKhoa({ text, kb: kbDay });
    assert.equal(
      r.handled,
      false,
      `"${text}" fastLane cũ đã bắt đúng — lớp mới KHÔNG được cướp`,
    );
  }
});

test("NHƯỜNG đúng — khớp luật nhưng trang KHÔNG có KB thì không đáp (không bịa)", () => {
  const rAuth = lopTuKhoa({ text: "is this original?", kb: kbRong });
  assert.equal(rAuth.handled, false);
  assert.equal(rAuth.reply, null);
  assert.equal(rAuth.rule, "that_gia"); // vẫn nhận diện ĐÚNG luật, chỉ là NHƯỜNG có chủ đích

  const rSize = lopTuKhoa({ text: "what size do you have?", kb: kbRong });
  assert.equal(rSize.handled, false);
  assert.equal(rSize.reply, null);
  assert.equal(rSize.rule, "hoi_size");
});

test("NHƯỜNG đúng — kb rỗng/undefined không làm hàm ném lỗi", () => {
  assert.doesNotThrow(() =>
    lopTuKhoa({ text: "is this original?", kb: undefined }),
  );
  assert.doesNotThrow(() => lopTuKhoa({ text: "is this original?", kb: {} }));
});

test("Không cướp diễn đàn — 10 câu ngoài 2 luật không bắt, DÙ KB đã có đủ dữ liệu", () => {
  const cauNgoaiPham = [
    "magkano po ang presyo?", // hỏi giá
    "how much is this", // hỏi giá EN
    "san po kayo located?", // hỏi địa chỉ
    "what is your address", // hỏi địa chỉ EN
    "salamat po", // cảm ơn
    "thank you",
    "ok",
    "hi po good morning", // chào hỏi
    "kailan darating ang order", // hỏi giao hàng
    "free shipping ba?", // hỏi ship
  ];
  assert.ok(cauNgoaiPham.length >= 10, "bộ ca phải ≥10 câu theo đề bài ④#4");
  for (const text of cauNgoaiPham) {
    const r = lopTuKhoa({ text, kb: kbDay });
    assert.equal(
      r.handled,
      false,
      `"${text}" KHÔNG thuộc 2 luật — không được bắt`,
    );
    assert.equal(r.rule, null, `"${text}" không được gán rule nào`);
  }
});

test("An toàn — có số điện thoại thì NHƯỜNG dù trùng từ khoá thật/giả (đang giữa lượt chốt đơn)", () => {
  const r = lopTuKhoa({
    text: "is this original? my number is 0501234567",
    kb: kbDay,
  });
  assert.equal(r.handled, false, "có SĐT — phải nhường AI, không đáp mẫu");
});

test("An toàn — tin dài >12 từ thì NHƯỜNG dù có chứa từ khoá size", () => {
  const text =
    "hi po good morning ako po ay nagtatanong lang kung meron kayong size na akmang akma para sa akin ngayong araw";
  const r = lopTuKhoa({ text, kb: kbDay });
  assert.equal(r.handled, false, "tin quá dài — nhường AI đọc trọn ngữ cảnh");
});

test("Tin rỗng/sticker không văng lỗi, NHƯỜNG", () => {
  const r = lopTuKhoa({ text: "", kb: kbDay });
  assert.equal(r.handled, false);
  assert.equal(r.rule, null);
});

/* ═══════════ NỚI BA Ý + SÁU CỬA NHƯỜNG (21/09) ═══════════
 *
 * Nới từ khoá mà KHÔNG có cửa nhường thì phủ lên 57,5% nhưng đẻ 12 ca bắn nhầm nguy
 * hiểm — người đang bức xúc vì chưa nhận hàng nhận lại câu «giao miễn phí, 2-5 ngày».
 * Sáu cửa dưới đây là thứ giữ con số đó ở 0. Mỗi ca ở đây là một ca thật trong 146 tin
 * đã quét của page 1220547807799752.
 */
const kbDu = {
  config: {
    ...kbDay.config,
    fastLanePrice: "🎁 Buy 1 Get 1 – 109 SAR\n🎁 Buy 2 Get 2 – 159 SAR",
    fastLaneShip: "Your order is free delivery dear 🚚\nIt take 2 - 5 days to delivery dear",
  },
};

test("CỬA NHƯỜNG · khiếu nại giao hàng KHÔNG BAO GIỜ bị bắn mẫu ship", () => {
  // Cả bốn câu đều chứa từ vựng giao hàng. Nới regex mà thiếu cửa này là bắn câu
  // «đơn của bạn được giao miễn phí» vào mặt người đang tố chưa nhận được hàng.
  for (const c of [
    "Sir Walapa tumawag saakin hihintay ko nga ang twg pero Walapa sir",
    "Hallo sir sabimo darating ang delivery pero Hindi pa dumating sir",
    "No body call",
    "Am waiting to long",
    "The order said my friend she want cancel",
  ]) {
    // Điều phải bảo đảm là KHÔNG BẮN. Cửa nào bắt thì không quan trọng — `templateSafety`
    // vốn đã chặn một phần trong số này, và neo vào tên cửa là làm ca kiểm giòn.
    const r = lopTuKhoa({ text: c, kb: kbDu });
    assert.equal(r.handled, false, `"${c}" phải NHƯỜNG, không bắn mẫu`);
    assert.ok(r.reply == null, `"${c}" không được có câu trả lời`);
  }
});

test("CỬA NHƯỜNG · khách CHO THÔNG TIN / CHỐT GÓI / HẸN SAU → vào luồng đơn, không bắn mẫu", () => {
  const ca = [
    ["https://maps.app.goo.gl/kiUkumS2pJYDT6GT9", /vị trí/],
    ["2 x 2 = 149 SR", /gói|số tiền/],
    ["Buy 2 Get 2 Free - 159 SR. COD", /gói|số tiền/],
    ["99 SAR", /gói|số tiền/],
    ["pwede maka order sa October 1", /hẹn sau/],
    ["If my salary coming I well messages you.thank you.", /hẹn sau/],
  ];
  for (const [c, vi] of ca) {
    const r = lopTuKhoa({ text: c, kb: kbDu });
    assert.equal(r.handled, false, `"${c}" phải NHƯỜNG`);
    assert.match(r.lyDo, vi, `"${c}" nhường sai lý do: ${r.lyDo}`);
  }
});

test("CỬA NHƯỜNG · hỏi hạn PROMO và «đã nhận hàng» không phải câu hỏi giao hàng", () => {
  for (const c of ["Hanggang kailan ang promo!", "J&T na deliver naman ang items ko"]) {
    assert.equal(lopTuKhoa({ text: c, kb: kbDu }).handled, false, `"${c}" phải NHƯỜNG`);
  }
});

test("NỚI · muốn đặt hàng — câu KHẲNG ĐỊNH mà `ASK_HOWTO` bỏ sót", () => {
  for (const c of ["I want to order", "I need order", "Place an order", "I order po", "Try ko itong product"]) {
    const r = lopTuKhoa({ text: c, kb: kbDu });
    assert.equal(r.handled, true, `"${c}" phải bắt`);
    assert.equal(r.rule, "muon_dat");
    assert.equal(r.reply, kbDu.config.fastLaneHowto);
    assert.equal(ASK_HOWTO_BAN_CU.test(c), false, `"${c}" mà fastLane cũ đã bắt thì đây KHÔNG được bắt`);
  }
});

test("NỚI · hỏi/hẹn giao hàng — lịch hẹn mà `ASK_SHIP` bỏ sót", () => {
  for (const c of ["What time he come", "Kailan po sir", "I'm available Saturday to Thursday", "Pwede sa Sunday or Monday po si"]) {
    const r = lopTuKhoa({ text: c, kb: kbDu });
    assert.equal(r.handled, true, `"${c}" phải bắt`);
    assert.equal(r.rule, "hoi_ship");
    assert.equal(r.reply, kbDu.config.fastLaneShip);
  }
});

test("NỚI · hỏi giá SAI CHÍNH TẢ — và KHÔNG cướp chính tả đúng của fastLane", () => {
  const r = lopTuKhoa({ text: "mabkanonpo ma'am?", kb: kbDu });
  assert.equal(r.handled, true, "«mabkanonpo» (magkano) phải bắt — đo 17/09: regex gốc trượt");
  assert.equal(r.rule, "gia_sai_chinh_ta");
  assert.equal(r.reply, kbDu.config.fastLanePrice);
  // Chính tả ĐÚNG là việc của fast-lane. Bắt ở đây là ghi sai `so_ai.lane`.
  for (const c of ["magkano po", "how much", "presyo?"]) {
    assert.equal(lopTuKhoa({ text: c, kb: kbDu }).rule, null, `"${c}" phải để fastLane lo`);
  }
});

test("NỚI · KHÔNG có KB thì NHƯỜNG, không bịa — đúng luật cũ của lớp này", () => {
  for (const [c, rule] of [["What time he come", "hoi_ship"], ["mabkanonpo", "gia_sai_chinh_ta"]]) {
    const r = lopTuKhoa({ text: c, kb: kbRong });
    assert.equal(r.handled, false);
    assert.equal(r.rule, rule, "vẫn khai rule để nhật ký phân biệt «không khớp» với «khớp mà thiếu KB»");
  }
});

test("GIỮ NGUYÊN · cửa an toàn cũ vẫn thắng mọi luật mới", () => {
  // SĐT và tin dài phải nhường TRƯỚC khi bất kỳ luật nới nào kịp chạy.
  const coSdt = lopTuKhoa({ text: "I want to order 0551234567", kb: kbDu });
  assert.equal(coSdt.handled, false);
  assert.match(coSdt.lyDo, /số điện thoại/);
  const dai = lopTuKhoa({ text: "kailan po ba " + "x ".repeat(15), kb: kbDu });
  assert.equal(dai.handled, false);
  assert.match(dai.lyDo, /dài/);
});
