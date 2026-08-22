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
