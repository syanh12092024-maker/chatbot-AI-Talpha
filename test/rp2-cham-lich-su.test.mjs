// RP2 ② 2 · ② 3 — CHẤM ĐIỂM LEAD TRÊN LỊCH SỬ (cả tin khách đã nhường Botcake) + NGƯỠNG «ẤM» = 1. Tầng THUẦN, không CSDL/mạng.
//
// Đo `ngan-sach-luot.js#chamTheoLichSu` (hàm handler gọi ở bước 3b) trên lịch sử Pancake GIẢ: giờ tin dạng Pancake KHÔNG múi giờ
// («2026-09-13T03:24:39.000000» — `messageTime` hiểu là giờ MÁY), nên cổng chạy tệp này ở HAI múi giờ (UTC và UTC+14).
// Đường worker thật (kịch bản A' · A · B) ở `test/rp2-worker-a-phay.test.mjs`.
//
// Nhánh KHÔNG chạm ở đây: tin khách có id khác Meta (webhook — `historyBeforeMessage` lùi về `tao_luc`) ⇒ mốc không phủ được tin hiện
// tại (ghi nhật ký RP2) · đổi múi giờ máy GIỮA hai lượt (mốc lưu theo giờ máy).
import test from "node:test";
import assert from "node:assert/strict";
import * as NS from "../src/chat/ngan-sach-luot.js";
import { scoreTurn, turnBudget, AM_THRESHOLD, HARD_MAX_TURNS } from "../src/lead-score.js";
import { messageTime } from "../src/chat/history.js";

const PG = "pg-rp2-c";
const BAY_GIO = Date.now();
const GIAY = 1000, PHUT = 60 * GIAY, GIO = 60 * PHUT;
// Giờ dạng Pancake: không múi giờ, 6 chữ số lẻ (mẫu mau-duong-ban.json · nap.js:251 «mốc Pancake không kèm múi giờ»).
const naive = (truoc) => new Date(BAY_GIO - truoc).toISOString().replace("Z", "000");
const K = (id, truoc, message) => ({ id, from: { id: "KH-1", name: "Khách" }, message, inserted_at: naive(truoc) });
const B = (id, truoc, message) => ({ id, from: { id: PG, admin_name: "Botcake", app_id: 556376998159104, flow_id: 1 }, message, inserted_at: naive(truoc) });
const A = (id, truoc, message) => ({ id, from: { id: PG, admin_name: "Public API" }, message, inserted_at: naive(truoc) });

function cham(text, prev, lichSu, msgId) {
  const f = NS.chamTheoLichSu;
  assert.equal(typeof f, "function", "src/chat/ngan-sach-luot.js chưa có chamTheoLichSu (RP2 ② 2)");
  return f(text, prev, { lichSu, tin: { page_id: PG, msg_id: msgId, noi_dung: text } });
}
const goc = (l) => ({ score: l.score, signals: [...(l.signals || [])].sort(), penalty: l.penalty, stubStreak: l.stubStreak });

test(`C0 · tệp đo + múi giờ (TZ=${process.env.TZ || "máy"} · lệch ${-new Date().getTimezoneOffset()} phút)`, () => {
  console.log(`   [rp2] tệp đo ${new URL("../src/chat/ngan-sach-luot.js", import.meta.url).pathname} · cwd ${process.cwd()}`);
  assert.ok(messageTime(K("x", 0, "")) > 0, "giờ dạng Pancake phải đọc được bằng messageTime");
});

// ── ④3 A' (tầng thuần): câu giá Botcake đã trả lời KHÔNG vào hàng — lượt bot đầu tiên phải chấm được nó ────────────────────────────
test("C1 · A' thuần: «how much po?» do Botcake trả lời nằm trong lịch sử ⇒ lượt «what is it for?» chấm được price ⇒ ẤM 3 lượt; mốc = giờ tin hiện tại", () => {
  const ls = [
    K("k1", 10 * PHUT, "how much po?"),
    B("b1", 10 * PHUT - 5 * GIAY, "Hello po! 1 set = 99 SAR, 2 sets = 149 SAR 🎉"),
    K("k2", 1 * PHUT, "what is it for?"),
  ];
  const { lead, budget } = cham("what is it for?", {}, ls, "k2");
  assert.deepEqual(goc(lead), { score: 1, signals: ["price"], penalty: 0, stubStreak: 0 });
  assert.equal(budget.tier, "AM");
  assert.equal(budget.max, 3);
  assert.equal(lead.moc, messageTime(ls[2]), "mốc phải là giờ tin hiện tại (k2) — gắn lại SAU scoreTurn");
});

// ── ④3 chữ Botcake KHÔNG được chấm ───────────────────────────────────────────────────────────────────────────────────────────────
test("C2 · chữ của page/Botcake (giá · ship · ảnh · SĐT · địa chỉ · tên) KHÔNG được chấm — khách chỉ chào ⇒ 0 điểm, LẠNH", () => {
  const ls = [
    K("k1", 5 * PHUT, "hi"),
    B("b1", 5 * PHUT - 5 * GIAY, "Free shipping po! Cash on delivery. How much? 99 SAR. See photo. Call 0551234567, Riyadh street 5 villa 2. My name is Botcake"),
    K("k2", 1 * PHUT, "hello po"),
  ];
  const { lead, budget } = cham("hello po", {}, ls, "k2");
  assert.deepEqual(goc(lead).signals, [], `tín hiệu lọt từ chữ page: ${JSON.stringify(lead.signals)}`);
  assert.equal(lead.score, 0);
  assert.equal(budget.tier, "LANH");
});

// ── ④3 chưa có mốc ⇒ chỉ 24 giờ gần nhất (không chấm SĐT/địa chỉ của đơn cũ) ─────────────────────────────────────────────────────
const LS_DON_CU = () => [
  K("k1", 30 * GIO, "Maria Santos\n0551234567\nRiyadh street 12 villa 4"),
  A("a1", 30 * GIO - 20 * GIAY, "Thank you po, order created!"),
  K("k2", 20 * GIO, "how much po?"),
  B("b2", 20 * GIO - 5 * GIAY, "99 SAR po"),
  K("k3", 1 * PHUT, "hello"),
];
test("C3 · chưa mốc: tin khách > 24 giờ (tên + SĐT + địa chỉ đơn cũ) KHÔNG chấm · tin 20 giờ trước VẪN chấm (cửa sổ tính theo giờ tin, không theo đồng hồ máy)", () => {
  const { lead, budget } = cham("hello", {}, LS_DON_CU(), "k3");
  assert.deepEqual(goc(lead).signals, ["price"], `tín hiệu: ${JSON.stringify(lead.signals)}`);
  assert.equal(budget.tier, "AM");
  assert.equal(budget.priority, false, "đơn cũ không được bật cờ ƯU TIÊN");
});
test("C3b · có mốc nhưng mốc cũ hơn 24 giờ ⇒ vẫn kẹp 24 giờ (đơn cũ giữa hai lượt cách xa cũng không vào)", () => {
  const prev = { signals: [], penalty: 0, stubStreak: 0, score: 0, moc: messageTime(K("x", 40 * GIO, "")) };
  const { lead } = cham("hello", prev, LS_DON_CU(), "k3");
  assert.deepEqual(goc(lead).signals, ["price"], `tín hiệu: ${JSON.stringify(lead.signals)}`);
});

// ── ④3 chống chấm lặp: lịch sử có hai «ok» ───────────────────────────────────────────────────────────────────────────────────────
test("C4 · chống chấm lặp: lịch sử có hai «ok» (đã chấm ở lượt trước) ⇒ lượt sau KHÔNG chấm lại — điểm VÀ phạt không đổi, chuỗi cụt chỉ +1 cho tin MỚI", () => {
  const ls1 = [
    K("k1", 10 * PHUT, "how much po?"),
    B("b1", 10 * PHUT - 5 * GIAY, "99 SAR po"),
    K("k2", 9 * PHUT, "ok"),
    K("k3", 9 * PHUT - 10 * GIAY, "ok"),
    B("b2", 9 * PHUT - 15 * GIAY, "Order now po!"),
    K("k4", 5 * PHUT, "ok"),
  ];
  const l1 = cham("ok", {}, ls1, "k4").lead;
  assert.deepEqual(goc(l1), { score: 1, signals: ["price"], penalty: 0, stubStreak: 0 }, "lượt 1: MỘT lần scoreTurn trên (lịch sử mới + cụm)");
  const ls2 = [...ls1, A("a1", 4 * PHUT, "Sige po!"), K("k5", 1 * PHUT, "ok")];
  const l2 = cham("ok", l1, ls2, "k5").lead;
  assert.equal(l2.score, l1.score, "chấm lại cùng lịch sử: điểm đổi");
  assert.equal(l2.penalty, l1.penalty, "chấm lại cùng lịch sử: phạt đổi");
  assert.deepEqual(goc(l2), goc(scoreTurn("ok", l1)), "lượt 2 phải đúng bằng chấm MỖI tin mới «ok» (hai «ok» cũ đã sau mốc)");
  assert.equal(l2.stubStreak, 1);
  const l2b = cham("ok", l1, ls2, "k5").lead;
  assert.deepEqual({ ...goc(l2b), moc: l2b.moc }, { ...goc(l2), moc: l2.moc }, "chấm lại y hệt đầu vào ⇒ y hệt kết quả");
});

// ── BẤT BIẾN: hội thoại bot tự trả lời MỌI cụm ⇒ y hệt chấm cụm cũ (không đếm đôi, không chấm chữ page, mốc tiến đúng) ─────────────
test("C5 · không có tin nhường: điểm · phạt · chuỗi cụt sau MỖI lượt = chấm cụm cũ (L2-M3) — 6 lượt, có cụm 2 tin", () => {
  const cum = [
    { tin: [K("c1a", 60 * PHUT, "hi")], tra: A("r1", 59 * PHUT, "Hello po! Price is 99 SAR, free shipping, here is the photo") },
    { tin: [K("c2a", 50 * PHUT, "ok"), K("c2b", 50 * PHUT - 3 * GIAY, "ok")], tra: A("r2", 49 * PHUT, "Sige po") },
    { tin: [K("c3a", 40 * PHUT, "how much for 2?")], tra: A("r3", 39 * PHUT, "149 SAR po, free delivery, call 0551234567") },
    { tin: [K("c4a", 30 * PHUT, "ok"), K("c4b", 30 * PHUT - 3 * GIAY, "sige po")], tra: A("r4", 29 * PHUT, "Salamat po") },
    { tin: [K("c5a", 20 * PHUT, "ok")], tra: A("r5", 19 * PHUT, "Anything else po?") },
    { tin: [K("c6a", 10 * PHUT, "hm")], tra: null },
  ];
  let ls = []; let moi = {}; let cu = {};
  for (const [i, c] of cum.entries()) {
    ls = [...ls, ...c.tin];
    const text = c.tin.map((m) => m.message).join("\n");
    const r = cham(text, moi, ls, c.tin.at(-1).id);
    moi = r.lead;
    cu = scoreTurn(text, cu);
    assert.deepEqual(goc(moi), goc(cu), `lượt ${i + 1} («${text.replace(/\n/g, " / ")}») lệch chấm cụm cũ`);
    assert.deepEqual(r.budget, turnBudget(cu), `lượt ${i + 1}: ngân sách lệch`);
    if (c.tra) ls = [...ls, c.tra];
  }
  assert.deepEqual(goc(moi), { score: -1, signals: ["price"], penalty: -2, stubStreak: 2 }, "neo kết quả cuối (đáp án tính tay theo luật M11)");
});

// ── mốc KHÔNG phủ tin khách gõ SAU tin hiện tại (tin đó Botcake trả lời ⇒ không bao giờ vào hàng ⇒ lượt sau phải chấm) ─────────────
test("C7 · tin khách gõ SAU tin đang xử (Botcake trả lời nó) KHÔNG bị mốc nuốt ⇒ lượt sau chấm được price", () => {
  const ls1 = [
    K("k1", 10 * PHUT, "hi"),
    A("a1", 10 * PHUT - 20 * GIAY, "Hello po!"),
    K("k2", 5 * PHUT, "what is it for?"),
    K("k3", 5 * PHUT - 3 * GIAY, "how much po?"),
  ];
  const l1 = cham("what is it for?", {}, ls1, "k2").lead;
  assert.deepEqual(goc(l1).signals, [], "k3 nằm SAU tin đang xử — chưa thuộc lượt này");
  assert.equal(l1.moc, messageTime(ls1[2]), "mốc dừng ở tin đang xử (k2), không tới k3");
  const ls2 = [...ls1, B("b1", 5 * PHUT - 8 * GIAY, "99 SAR po"), A("a2", 4 * PHUT, "It is for pain relief po"), K("k4", 1 * PHUT, "ok and for my mother?")];
  const l2 = cham("ok and for my mother?", l1, ls2, "k4").lead;
  assert.deepEqual(goc(l2).signals, ["price"], `lượt 2 phải chấm k3: ${JSON.stringify(l2.signals)}`);
  assert.equal(l2.score, 1);
});

// ── lịch sử rỗng (bộ ca cũ `docLichSu:false`) ⇒ y hệt chấm cụm cũ ───────────────────────────────────────────────────────────────
test("C8 · lịch sử rỗng ⇒ y hệt chamVaTinhNganSach(cụm) · chưa mốc thì không đẻ khoá moc · có mốc thì giữ", () => {
  const prev = { signals: ["ship"], penalty: 0, stubStreak: 1, score: 1 };
  const r = cham("ok", prev, [], "x");
  const cu = NS.chamVaTinhNganSach("ok", prev);
  assert.deepEqual(goc(r.lead), goc(cu.lead));
  assert.deepEqual(r.budget, cu.budget);
  assert.equal(r.lead.moc, undefined);
  assert.equal(cham("ok", { ...prev, moc: 123456 }, [], "x").lead.moc, 123456);
});

test("C9 · hồ sơ điểm CŨ (trước RP2, không mốc) giữ tín hiệu đã có — tin nhường trong 24 giờ cộng thêm", () => {
  const prev = { signals: ["buy"], penalty: 0, stubStreak: 0, score: 3 };
  const ls = [K("k1", 3 * PHUT, "free delivery po?"), B("b1", 3 * PHUT - 5 * GIAY, "Yes po free shipping"), K("k2", 1 * PHUT, "ok")];
  const { lead } = cham("ok", prev, ls, "k2");
  assert.deepEqual(goc(lead).signals, ["buy", "ship"]);
  assert.equal(lead.score, 4);
});

// ── /code-review RP2 #3 · #1 · #2 ────────────────────────────────────────────────────────────────────────────────────────────────
test("C10 · lịch sử KHÔNG chứa chính tin đang xử (id kênh khác id Pancake) ⇒ chỉ chấm cụm như trước RP2, giữ nguyên mốc", () => {
  const ls = [K("k1", 10 * PHUT, "how much po?"), B("b1", 10 * PHUT - 5 * GIAY, "99 SAR po"), K("k2", 1 * PHUT, "what is it for?")];
  const prev = { signals: [], penalty: 0, stubStreak: 0, score: 0, moc: 777 };
  const r = cham("what is it for?", prev, ls, "mid.$meta-khac-pancake");
  assert.deepEqual(goc(r.lead), goc(NS.chamVaTinhNganSach("what is it for?", prev).lead), "không biết ranh giới ⇒ không được chấm thêm tin lịch sử");
  assert.equal(r.lead.moc, 777, "mốc phải giữ nguyên");
});
test("C11 · tin nhường KHÔNG sinh tín hiệu giả: thông báo Facebook Payments (fb-pma, số hoá đơn dài) bị bỏ · «1200» và «1500» ở HAI tin không thành SĐT · «I'm» một tin không ghép với chữ tin sau thành TÊN", () => {
  const ls = [
    K("k1", 9 * PHUT, "Ana confirmed an order. See details(fb-pma://payments/orderdetails/?product_type=PAGES_COMMERCE&invoice_id=1029384756123&page_id=1200082103184799)"),
    K("k2", 8 * PHUT, "i'm"),
    B("b1", 8 * PHUT - 5 * GIAY, "Yes po?"),
    K("k3", 6 * PHUT, "price 1200"),
    B("b2", 6 * PHUT - 5 * GIAY, "Hello po! Our price list: 1 set 99 SAR"),
    K("k4", 1 * PHUT, "1500 for 2?"),
  ];
  const { lead } = cham("1500 for 2?", {}, ls, "k4");
  assert.deepEqual(goc(lead).signals, ["price"], `tín hiệu giả: ${JSON.stringify(lead.signals)}`);
});

// ── ④4 ngưỡng ẤM = 1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("N1 · AM_THRESHOLD = 1: điểm 1 ⇒ ẤM 3 lượt · điểm 0 / âm ⇒ LẠNH 1 lượt", () => {
  assert.equal(AM_THRESHOLD, 1);
  assert.deepEqual([turnBudget({ score: 1, signals: ["price"] }).tier, turnBudget({ score: 1, signals: ["price"] }).max], ["AM", 3]);
  assert.deepEqual([turnBudget({ score: 0, signals: [] }).tier, turnBudget({ score: 0, signals: [] }).max], ["LANH", 1]);
  assert.deepEqual([turnBudget({ score: -1, signals: ["price"] }).tier, turnBudget({ score: -1, signals: ["price"] }).max], ["LANH", 1]);
});
test("N2 · nhóm khác KHÔNG đổi: 2 ⇒ ẤM 3 · 3/5 ⇒ NÓNG 6 · 6 ⇒ ĐANG CHỐT 10 · SĐT+địa chỉ ⇒ SÁT ĐƠN 12 ưu tiên · phản đối +3 · trần 12", () => {
  const b = (score, signals) => { const x = turnBudget({ score, signals }); return [x.tier, x.max, x.priority]; };
  assert.deepEqual(b(2, ["price", "ship"]), ["AM", 3, false]);
  assert.deepEqual(b(3, ["buy"]), ["NONG", 6, false]);
  assert.deepEqual(b(5, ["buy", "name"]), ["NONG", 6, false]);
  assert.deepEqual(b(6, ["buy", "address"]), ["DANG_CHOT", 10, false]);
  assert.deepEqual(b(7, ["phone", "address"]), ["SAT_DON", 12, true]);
  assert.deepEqual(b(0, ["obj_trust"]), ["LANH", 4, false]);
  assert.deepEqual(b(2, ["obj_price"]), ["AM", 6, false]);
  assert.deepEqual(b(9, ["phone", "address", "obj_wait"]), ["SAT_DON", HARD_MAX_TURNS, true]);
});
