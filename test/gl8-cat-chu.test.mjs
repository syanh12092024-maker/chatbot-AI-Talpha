// GL8 ④1 — HÀM CẮT CHỮ DÙNG CHUNG (`src/text.js#catChu`) + LƯỚI JSON (`jsonLanh`) — hàm THUẦN, không CSDL, không mạng.
//
// Bệnh gốc: `slice(0, N)` cắt theo đơn vị UTF-16; đơn vị thứ N là nửa đầu của 📦 (`\ud83d`) ⇒ chuỗi mang nửa cặp ⇒ `JSON.stringify` giữ
// nguyên `\ud83d` (chữ ASCII) ⇒ Postgres jsonb từ chối cả câu INSERT. Cách xử lý nửa cặp lẻ của repo là XOÁ (như `cleanText`) — không
// đẻ cách thứ hai (`toWellFormed` thay bằng U+FFFD).
//
// Nạp module bằng `import * as` (không import tên): trên base chưa có hàm thì TỪNG ca đỏ với lời rõ, không phải cả tệp chết lúc nạp.
import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../src/text.js";

/** Chuỗi dài n+1 đơn vị, hai đơn vị cuối là 📦 ⇒ `slice(0, n)` để lại đúng nửa đầu `\ud83d` ở đơn vị n-1. */
function cauCat(n, dau = "Yes po Annabelle, free delivery po! 🚚 ", duoi = " details for booking. ") {
  if (n - 1 - dau.length - duoi.length < 0) { dau = ""; duoi = " "; }
  const can = n - 1 - dau.length - duoi.length;
  let giua = "";
  while (giua.length < can) giua += "Cash on delivery po, you pay when the parcel arrives. ";
  const s = dau + giua.slice(0, can) + duoi + "📦";
  if (s.length !== n + 1 || s.charCodeAt(n - 1) !== 0xd83d) throw new Error(`cauCat(${n}) dựng sai: dài ${s.length}`);
  return s;
}

const coNuaCap = (s) => !String(s).isWellFormed();
const can = (ten) => assert.equal(typeof T[ten], "function", `src/text.js chưa có hàm ${ten} (GL8 ②1)`);

test("GL8 C1 · câu 201 đơn vị, đơn vị 200 là nửa đầu 📦 ⇒ catChu(·,200) ≤ 200 đơn vị, isWellFormed, không mất chữ nào khác", () => {
  can("catChu");
  const cau = cauCat(200);
  assert.equal(cau.length, 201);
  assert.ok(coNuaCap(cau.slice(0, 200)), "tiền đề: slice(0,200) phải để lại nửa cặp (nếu không, ca này không đo gì)");
  const ra = T.catChu(cau, 200);
  assert.ok(ra.length <= 200, `dài ${ra.length}`);
  assert.ok(ra.isWellFormed(), "còn nửa cặp");
  assert.equal(ra, cau.slice(0, 199), "phải cắt lùi đúng MỘT đơn vị — giữ nguyên 199 đơn vị đầu");
  for (const n of [600, 60]) {
    const c = cauCat(n);
    const r = T.catChu(c, n);
    assert.ok(r.isWellFormed() && r.length === n - 1, `n=${n}: dài ${r.length}`);
  }
});

test("GL8 C2 · chuỗi lành ⇒ catChu y hệt slice (ASCII · tiếng Việt · emoji trọn cặp · ngắn hơn trần · trần 0)", () => {
  can("catChu");
  const mau = [
    "how much po?", "Giá 99 SAR — giao miễn phí", "Yes po! 🚚📦 free delivery", "🎉".repeat(150), "x".repeat(700),
    "مرحبا 😊 التوصيل مجاني", "", "a📦b",
  ];
  for (const s of mau) for (const n of [0, 1, 2, 3, 60, 199, 200, 201, 600, 10000]) {
    const sl = s.slice(0, n);
    if (coNuaCap(sl)) continue; // đúng biên emoji — ca C1 lo
    assert.equal(T.catChu(s, n), sl, `n=${n} · ${JSON.stringify(s.slice(0, 20))}`);
  }
});

test("GL8 C3 · nửa cặp lẻ CÓ SẴN trong chuỗi ⇒ XOÁ (cùng một luật với cleanText), cặp lành giữ nguyên", () => {
  can("catChu");
  assert.equal(T.catChu("ab\ud83dcd📦", 100), "abcd📦");
  assert.equal(T.catChu("\udc00xy", 100), "xy");
  assert.equal(T.cleanText("ab\ud83dcd📦"), "abcd📦", "cleanText phải giữ nguyên hành vi cũ");
  assert.equal(T.cleanText("x".repeat(9) + "📦", 10), "x".repeat(9), "cleanText(·,max) cắt trước dọn sau — như cũ");
  assert.equal(T.cleanText("<div></div>"), " ", "cleanText vẫn bóc thẻ HTML như cũ");
});

test("GL8 J1 · jsonLanh: chuỗi mang nửa cặp ở MỌI tầng (giá trị · mảng · lồng) ⇒ JSON không còn `\\ud8xx` lẻ; dữ liệu lành ⇒ y hệt JSON.stringify", () => {
  can("jsonLanh");
  const ban = { text: "abc\ud83d", ds: ["\udc00x", "ok 📦"], lo: { sau: "y\ud83d", so: 1, co: true, rong: null } };
  const ra = T.jsonLanh(ban);
  assert.doesNotMatch(ra, /\\ud[89ab][0-9a-f]{2}(?!\\ud[c-f])/i, "còn nửa đầu lẻ trong JSON");
  const doc = JSON.parse(ra);
  assert.deepEqual(doc, { text: "abc", ds: ["x", "ok 📦"], lo: { sau: "y", so: 1, co: true, rong: null } });
  const lanh = { a: "how much po? 🚚", b: [1, "x", { c: "📦" }], d: null, e: new Date(0) };
  assert.equal(T.jsonLanh(lanh), JSON.stringify(lanh));
  assert.equal(T.jsonLanh(null), "null");
  // BẪY ②2: dọn SAU stringify là vô tác dụng — stringify đã biến nửa cặp thành chữ ASCII `\ud83d`.
  assert.match(JSON.stringify(ban).toWellFormed(), /\\ud83d/, "tiền đề bẫy: toWellFormed sau stringify không cứu được");
});
