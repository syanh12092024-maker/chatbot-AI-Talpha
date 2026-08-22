// L2-M3 · Ngân sách lượt theo độ nóng — bộ ca ĐƠN VỊ cho src/chat/ngan-sach-luot.js.
// `chamVaTinhNganSach`/`conNganSach` là hàm THUẦN (không DB/mạng) — chạy thẳng, không
// cần sandbox. Phần NỐI vào handler-v3.js (gate thật chặn/không chặn runCloser, ghi
// diem_lead/diem_nong) đo ở test/l2-m3-rap-prompt.test.js (cần DB).
//
// Đề bài ④#5 (PHIEU-L2-M3.md): "3 mức điểm lead (nguội/ấm/nóng) → 3 ngân sách tăng dần
// (in bảng); vượt ngân sách → dừng đúng khuôn cũ (handoff, không im); trần tuyệt đối =
// HARD_MAX_TURNS cũ không bị vượt (ép ca nóng max — in số lượt chạm trần)".
//
// CÁCH DỰNG CA: thay vì dò câu chữ khớp đúng biên từng tier (dễ trôi theo regex của
// lead-score.js), test SEED THẲNG `prevLead.signals` — `scoreTurn` cộng dồn
// `have = prev.signals ∪ tín-hiệu-tìm-thấy-trong-text-này`, nên seed sẵn tín hiệu ở
// `prevLead` cho kết quả ĐÚNG BẰNG việc khách đã nói đủ những câu đó ở các lượt trước,
// không phụ thuộc regex có đổi câu chữ hay không. Bảng ngưỡng đối chiếu SIGNAL_POINTS/
// tier của chính lead-score.js (không chép lại số, IMPORT để không trôi — án lệ #3).
import test from "node:test";
import assert from "node:assert/strict";
import { chamVaTinhNganSach, conNganSach } from "../src/chat/ngan-sach-luot.js";
import { HARD_MAX_TURNS, AM_THRESHOLD } from "../src/lead-score.js";

test("nguội (score 0) < ấm (score ≥ AM_THRESHOLD) < nóng (score ≥ 3) — ngân sách tăng dần", () => {
  const lanh = chamVaTinhNganSach("ok", {});
  const am = chamVaTinhNganSach("ok", { signals: ["price", "ship"] }); // 1+1=2
  const nong = chamVaTinhNganSach("ok", { signals: ["buy"] }); // 3

  assert.equal(lanh.lead.score, 0);
  assert.equal(lanh.budget.tier, "LANH");
  assert.ok(am.lead.score >= AM_THRESHOLD, "ấm phải đạt AM_THRESHOLD");
  assert.equal(am.budget.tier, "AM");
  assert.equal(nong.budget.tier, "NONG");

  console.log(
    `[bảng ngân sách] lạnh=${lanh.budget.max} · ấm=${am.budget.max} · nóng=${nong.budget.max}`,
  );
  assert.ok(
    lanh.budget.max < am.budget.max,
    `lạnh(${lanh.budget.max}) phải < ấm(${am.budget.max})`,
  );
  assert.ok(
    am.budget.max < nong.budget.max,
    `ấm(${am.budget.max}) phải < nóng(${nong.budget.max})`,
  );
});

test("năm bậc đủ (lạnh<ấm<nóng<đang_chốt<sát_đơn) — sát đơn có priority=true", () => {
  const bac = [
    { ten: "LANH", signals: [] },
    { ten: "AM", signals: ["price", "ship"] },
    { ten: "NONG", signals: ["buy"] },
    { ten: "DANG_CHOT", signals: ["phone", "buy"] }, // 4+3=7
    { ten: "SAT_DON", signals: ["phone", "address"] }, // 4+3=7, có cả hai
  ];
  const ket = bac.map((b) => ({
    ten: b.ten,
    ...chamVaTinhNganSach("ok", { signals: b.signals }),
  }));
  console.log(
    "[5 bậc] " +
      ket.map((k) => `${k.ten}=${k.budget.max}(${k.budget.tier})`).join(" · "),
  );
  for (let i = 0; i < ket.length; i++) {
    assert.equal(ket[i].budget.tier, bac[i].ten, `bậc #${i} phải đúng tier`);
  }
  for (let i = 1; i < ket.length; i++) {
    assert.ok(
      ket[i].budget.max >= ket[i - 1].budget.max,
      `bậc ${bac[i].ten}(${ket[i].budget.max}) phải ≥ bậc trước ${bac[i - 1].ten}(${ket[i - 1].budget.max})`,
    );
  }
  assert.equal(ket.at(-1).budget.priority, true, "SÁT ĐƠN phải priority=true");
  assert.equal(ket[0].budget.priority, false);
});

test("trần tuyệt đối HARD_MAX_TURNS không bị vượt kể cả ca nóng nhất + bonus phản đối", () => {
  // phone+address (SAT_DON, base=12) + obj_price (bonus +3) = 15 trước khi kẹp trần.
  const { budget } = chamVaTinhNganSach("mahal naman", {
    signals: ["phone", "address", "obj_price"],
  });
  console.log(
    `[trần] base+bonus=${budget.base}+${budget.bonus}=${budget.base + budget.bonus} → kẹp còn ${budget.max} (HARD_MAX_TURNS=${HARD_MAX_TURNS})`,
  );
  assert.equal(
    budget.base + budget.bonus > HARD_MAX_TURNS,
    true,
    "phép đo phải THẬT SỰ vượt trần trước khi kẹp — nếu không thì ca này không đo được gì",
  );
  assert.equal(
    budget.max,
    HARD_MAX_TURNS,
    "max phải bị KẸP đúng ở HARD_MAX_TURNS",
  );
});

test("cộng dồn điểm qua nhiều lượt (prevLead threading) — giống hệt updateLead(state,text) bản cũ", () => {
  let lead = {};
  ({ lead } = chamVaTinhNganSach("magkano po?", lead)); // +price(1)
  assert.equal(lead.score, 1);
  ({ lead } = chamVaTinhNganSach("free shipping ba?", lead)); // +ship(1), giữ price
  assert.equal(lead.score, 2);
  assert.deepEqual(new Set(lead.signals), new Set(["price", "ship"]));
  ({ lead } = chamVaTinhNganSach("magkano po ulit?", lead)); // hỏi giá LẦN 2 — KHÔNG cộng thêm
  assert.equal(
    lead.score,
    2,
    "một tín hiệu chỉ tính MỘT LẦN trong cả hội thoại",
  );
});

test("tin cụt liên tiếp KHÔNG mang tín hiệu mới → phạt điểm (spec M11, giữ nguyên từ lead-score.js)", () => {
  let lead = {};
  ({ lead } = chamVaTinhNganSach("ok", lead));
  assert.equal(lead.penalty, 0, "lần đầu chưa phạt");
  ({ lead } = chamVaTinhNganSach("hm", lead));
  assert.equal(lead.penalty, -1, "2 tin cụt liên tiếp không tín hiệu mới → -1");
});

test("conNganSach: còn ngân sách → ok=true, không có lyDo chặn", () => {
  const { budget } = chamVaTinhNganSach("ok", { signals: ["buy"] }); // NONG, max=6
  assert.equal(conNganSach(budget, 0).ok, true);
  assert.equal(conNganSach(budget, budget.max - 1).ok, true);
});

test("conNganSach: hết ngân sách → dừng đúng khuôn cũ (ok=false + lyDo tiếng người, KHÔNG im)", () => {
  const { budget } = chamVaTinhNganSach("ok", { signals: ["buy"] }); // NONG, max=6
  const r = conNganSach(budget, budget.max);
  assert.equal(r.ok, false);
  assert.equal(typeof r.lyDo, "string");
  assert.ok(
    r.lyDo.length > 10,
    "lyDo phải là câu tiếng người, không phải mã lỗi trống",
  );
  assert.match(r.lyDo, /ngân sách/i);
  // used VƯỢT max (không chỉ chạm) vẫn phải chặn — biên trên cũng phải đóng.
  assert.equal(conNganSach(budget, budget.max + 5).ok, false);
});

test("conNganSach: ca SÁT ĐƠN hết ngân sách → lyDo có nhãn ƯU TIÊN", () => {
  const { budget } = chamVaTinhNganSach("ok", {
    signals: ["phone", "address"],
  });
  const r = conNganSach(budget, budget.max);
  assert.equal(r.ok, false);
  assert.match(r.lyDo, /ƯU TIÊN/);
});
