// VA-R4 · RF-20 — phủ định đứng TRƯỚC từ xác nhận KHÔNG được đọc thành xac_nhan.
// Phiếu: docs/thi-cong/phieu/PHIEU-VA-R4.md. Đo lại TRƯỚC vá (23/08/2026):
//   docY("not sure")        → {ket_qua:"xac_nhan", do_tin:1}   (khớp "sure", bỏ "not")
//   docY("don't confirm")   → {ket_qua:"xac_nhan", do_tin:1}   (khớp "confirm", bỏ "don't")
//   docY("cannot confirm")  → {ket_qua:"xac_nhan", do_tin:1}   (khớp "confirm", bỏ "cannot")
// ⇒ hệ tự ship hàng khách CHƯA đồng ý, trái 02 §L3 "mơ hồ→khong_ro, KHÔNG đoán liều".
import test from "node:test";
import assert from "node:assert/strict";
import { docY } from "../src/orders/doc-y.js";

// ── ① ≥6 câu phủ định EN — đòi hỏi DUY NHẤT: không câu nào được đọc ra xac_nhan ─────────
const PHU_DINH_EN = [
  "not sure",
  "don't confirm",
  "dont confirm",
  "cannot confirm",
  "won't confirm",
  "not yet",
  "won't take it",
  "no thanks",
];

test("R4-1 · phủ định EN đứng trước từ xác nhận → KHÔNG BAO GIỜ xac_nhan (RF-20)", () => {
  assert.ok(
    PHU_DINH_EN.length >= 6,
    `nghiệm thu ④#1 đòi ≥6 câu, đang có ${PHU_DINH_EN.length}`,
  );
  for (const text of PHU_DINH_EN) {
    const { ket_qua, do_tin } = docY(text);
    console.log(`   [EN phủ định] "${text}" → ${ket_qua} (do_tin=${do_tin})`);
    assert.notEqual(
      ket_qua,
      "xac_nhan",
      `"${text}" phải KHÔNG BAO GIỜ đọc ra xac_nhan (RF-20), đọc ra "${ket_qua}"`,
    );
  }
});

// ── ② Không hồi quy nhánh ĐÚNG — ≥8 xac_nhan thật + ≥4 tu_choi + ≥4 khong_ro giữ nguyên ──
const XAC_NHAN_THAT = [
  ["Yes, please confirm my order", "EN"],
  ["ok sure, go ahead", "EN"],
  ["confirmed, thank you", "EN"],
  ["that's correct", "EN"],
  ["okay", "EN"],
  ["yep, go ahead", "EN"],
  ["نعم أؤكد الطلب", "AR"],
  ["تمام موافق", "AR"],
  ["Opo, sige na", "PH"],
];

const TU_CHOI_THAT = [
  ["No, cancel my order please", "EN"],
  ["I don't want it anymore", "EN"],
  ["لا الغاء الطلب", "AR"],
  ["Ayaw ko na, cancel na lang", "PH"],
];

const KHONG_RO_THAT = [
  ["What do you mean?", "EN"],
  ["I'm still thinking about it", "EN"],
  ["yes but actually no", "EN mâu thuẫn"],
  ["", "rỗng"],
];

test("R4-2 · nhánh xac_nhan/tu_choi/khong_ro CŨ giữ nguyên — không hồi quy", () => {
  assert.ok(XAC_NHAN_THAT.length >= 8, "cần ≥8 câu xac_nhan thật");
  assert.ok(TU_CHOI_THAT.length >= 4, "cần ≥4 câu tu_choi");
  assert.ok(KHONG_RO_THAT.length >= 4, "cần ≥4 câu khong_ro (mơ hồ)");

  for (const [text, ngu] of XAC_NHAN_THAT) {
    const { ket_qua } = docY(text);
    console.log(`   [${ngu} xac_nhan-thật] "${text}" → ${ket_qua}`);
    assert.equal(ket_qua, "xac_nhan", `"${text}" phải VẪN LÀ xac_nhan`);
  }
  for (const [text, ngu] of TU_CHOI_THAT) {
    const { ket_qua } = docY(text);
    console.log(`   [${ngu} tu_choi] "${text}" → ${ket_qua}`);
    assert.equal(ket_qua, "tu_choi", `"${text}" phải VẪN LÀ tu_choi`);
  }
  for (const [text, ngu] of KHONG_RO_THAT) {
    const { ket_qua } = docY(text);
    console.log(`   [${ngu} khong_ro] "${text}" → ${ket_qua}`);
    assert.equal(ket_qua, "khong_ro", `"${text}" phải VẪN LÀ khong_ro`);
  }
});

// ── ③ AR — phủ định đứng trước xác nhận + không khớp "لا" trong từ dài (doc-y.js:124) ───
const AR_CASES = [
  ["مش موافق", "khong_ro", "phủ định مش + موافق"],
  ["مو أكيد بعد", "khong_ro", "phủ định مو (Vùng Vịnh) + أكيد"],
  ["مش تمام", "khong_ro", "phủ định مش + تمام"],
  [
    "سأتصل بك لاحقا",
    "khong_ro",
    'لاحقا CHỨA "لا" nhưng không phải từ "لا" đứng riêng',
  ],
];

test('R4-3 · AR — phủ định đứng trước xác nhận, không khớp "لا" trong từ dài', () => {
  assert.ok(AR_CASES.length >= 4, "nghiệm thu ④#3 đòi ≥4 câu AR");
  for (const [text, nhanhCho, ghiChu] of AR_CASES) {
    const { ket_qua } = docY(text);
    console.log(`   [AR — ${ghiChu}] "${text}" → ${ket_qua}`);
    assert.equal(
      ket_qua,
      nhanhCho,
      `"${text}" (${ghiChu}) phải đọc ra "${nhanhCho}", đọc ra "${ket_qua}"`,
    );
    assert.notEqual(ket_qua, "xac_nhan");
  }
});

// ── Bổ sung: "no"/"لا" cố ý KHÔNG vào NHOM_PHU_DINH (đã là từ khoá tu_choi đứng riêng) ──
test('R4-4 · "no"/"لا" trước từ xác nhận → MÂU THUẪN (khong_ro do_tin=0.5), không tu_choi ép', () => {
  const a = docY("no confirm");
  console.log(`   [EN] "no confirm" → ${a.ket_qua} (do_tin=${a.do_tin})`);
  assert.equal(a.ket_qua, "khong_ro");
  assert.equal(
    a.do_tin,
    0.5,
    "phải khớp CẢ tu_choi('no') lẫn xac_nhan('confirm') = mâu thuẫn",
  );
});
