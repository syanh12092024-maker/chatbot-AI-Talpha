// L3-M3 · BỘ ĐỌC Ý — hàm THUẦN, không cần DB. Bảng ca ④#3 của phiếu: ≥16 câu, ≥4 mỗi
// nhánh, trộn AR/EN(+PH), in từng câu→nhánh (xem cột "câu" trong output khi cần soi tay).
import test from "node:test";
import assert from "node:assert/strict";
import { docY, TU_KHOA } from "../src/orders/doc-y.js";

// [text, nhánh chờ, ghi chú ngôn ngữ] — ĐÚNG 16+ câu, ≥4/nhánh, có cả AR lẫn EN/PH.
const BANG_CA = [
  // ── xac_nhan (≥4) ──────────────────────────────────────────────────────────
  ["Yes, please confirm my order", "xac_nhan", "EN"],
  ["ok sure, go ahead", "xac_nhan", "EN"],
  ["نعم أؤكد الطلب", "xac_nhan", "AR"],
  ["تمام موافق", "xac_nhan", "AR"],
  ["Opo, sige na", "xac_nhan", "PH"],
  // ── tu_choi (≥4) ───────────────────────────────────────────────────────────
  ["No, cancel my order please", "tu_choi", "EN"],
  ["I don't want it anymore", "tu_choi", "EN"],
  ["لا الغاء الطلب", "tu_choi", "AR"],
  ["ما ابي الطلب خلاص", "tu_choi", "AR"],
  ["Ayaw ko na, cancel na lang", "tu_choi", "PH"],
  // ── doi_sua (≥4) ───────────────────────────────────────────────────────────
  ["Please change my delivery address", "doi_sua", "EN"],
  ["Can you edit the size to large", "doi_sua", "EN"],
  ["أريد تغيير العنوان", "doi_sua", "AR"],
  ["تعديل المقاس لو سمحت", "doi_sua", "AR"],
  ["Pwede palitan yung address", "doi_sua", "PH"],
  // ── khong_ro (≥4) — rỗng, không khớp, và MÂU THUẪN (≥2 nhánh cùng khớp) ────
  ["What do you mean?", "khong_ro", "EN"],
  ["I'm still thinking about it", "khong_ro", "EN"],
  ["مش فاهم", "khong_ro", "AR"],
  ["لسه بفكر", "khong_ro", "AR"],
  ["", "khong_ro", "rỗng"],
  ["yes but actually no", "khong_ro", "EN mâu thuẫn"],
];

test("Y1 · ≥16 câu, ≥4 mỗi nhánh, trộn AR/EN/PH — in từng câu → nhánh", () => {
  const demTheoNhanh = { xac_nhan: 0, tu_choi: 0, doi_sua: 0, khong_ro: 0 };
  for (const [text, nhanhCho, ngu] of BANG_CA) {
    const { ket_qua, do_tin } = docY(text);
    console.log(`   [${ngu}] "${text}" → ${ket_qua} (do_tin=${do_tin})`);
    assert.equal(
      ket_qua,
      nhanhCho,
      `"${text}" (${ngu}) phải đọc ra "${nhanhCho}", đọc ra "${ket_qua}"`,
    );
    demTheoNhanh[ket_qua]++;
  }
  assert.ok(
    BANG_CA.length >= 16,
    `bộ ca phải ≥16 câu, đang có ${BANG_CA.length}`,
  );
  for (const nhanh of Object.keys(demTheoNhanh)) {
    assert.ok(
      demTheoNhanh[nhanh] >= 4,
      `nhánh "${nhanh}" phải ≥4 câu, đang có ${demTheoNhanh[nhanh]}`,
    );
  }
});

test("Y2 · rỗng/null/undefined → khong_ro, do_tin=0, KHÔNG ném", () => {
  for (const v of ["", null, undefined, "   ", "\n\t"]) {
    const { ket_qua, do_tin } = docY(v);
    assert.equal(ket_qua, "khong_ro");
    assert.equal(do_tin, 0);
  }
});

test("Y3 · câu MÂU THUẪN (≥2 nhánh cùng khớp) → khong_ro, KHÔNG đoán liều", () => {
  const { ket_qua, do_tin } = docY("yes but actually no, cancel it");
  assert.equal(ket_qua, "khong_ro");
  assert.equal(
    do_tin,
    0.5,
    "do_tin phải khác 0 (có khớp) và khác 1 (không rõ ràng)",
  );
});

test("Y4 · so KHOẢN TỪ, không so substring trần — 'no' không khớp bên trong 'know'", () => {
  assert.equal(docY("I don't know yet, let me check").ket_qua, "khong_ro");
  assert.equal(docY("this is not normal at all").ket_qua, "khong_ro");
});

test("Y5 · docY là hàm THUẦN — cùng input luôn ra cùng output, không side-effect", () => {
  const a = docY("Yes, confirm");
  const b = docY("Yes, confirm");
  assert.deepEqual(a, b);
});

test("Y6 · ket_qua luôn thuộc bốn nhánh khai ở may-trang-thai.js (KET_QUA_PHAN_HOI)", async () => {
  const { KET_QUA_PHAN_HOI } = await import("../src/orders/may-trang-thai.js");
  for (const [text] of BANG_CA) {
    assert.ok(KET_QUA_PHAN_HOI.includes(docY(text).ket_qua));
  }
});

test("Y7 · tham số ngonNgu không làm ném lỗi, không đổi luật khớp (quét cả ba bộ)", () => {
  const khongCo = docY("نعم", {});
  const coCo = docY("نعم", { ngonNgu: "ar" });
  const saiNgu = docY("نعم", { ngonNgu: "en" }); // vẫn khớp — tham số không route luật
  assert.equal(khongCo.ket_qua, "xac_nhan");
  assert.deepEqual(khongCo, coCo);
  assert.deepEqual(khongCo, saiNgu);
});

test("Y8 · TU_KHOA export ba nhánh có tên, không có khong_ro (nó là ngầm định)", () => {
  assert.deepEqual(
    Object.keys(TU_KHOA).sort(),
    ["doi_sua", "tu_choi", "xac_nhan"].sort(),
  );
});
