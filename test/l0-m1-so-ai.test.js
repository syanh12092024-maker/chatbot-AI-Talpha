// L0-M1 · SỔ AI — nhánh KHÔNG chạm được ở local: `ai-messages.jsonl` chỉ sống trên VPS.
// Ca này chạy trên MẪU TRÍCH đúng khuôn thật (docs/TONG-QUAN-HE-THONG.md §11.2 +
// `src/ai-log.js:logAi`), ghi rõ đây là mẫu trích chứ không phải sổ thật.
// Lượt nạp thật + phép đối chiếu số dòng chạy trên VPS ở đợt cutover (nợ §9 sổ điều hành).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dungSandbox } from "../db/sandbox.js";
import { napSoAi, docSoAi } from "../db/di-tru/so-ai.js";

// MẪU TRÍCH — 7 loại sự kiện của §11.2, một dòng có `model` sẵn, một dòng rác.
const MAU = [
  '{"t":1786412010734,"page":"1170323086162562","cust":"2787903997","type":"reply","name":"Sara","text":"hi","conv":"c1","lane":"AI","state":"GREET","tin":3053,"tout":167,"cread":8390,"cwrite":0,"calls":1,"scriptVersion":"v1"}',
  '{"t":1786412011000,"page":"1170323086162562","cust":"2787903997","type":"reply","lane":"FASTLANE","state":"QUALIFY","tin":0,"tout":0,"cread":0,"cwrite":0,"calls":0,"scriptVersion":"v1"}',
  '{"t":1786412012000,"page":"1170323086162562","cust":"2787903997","type":"image","cat":["sản phẩm"],"n":2}',
  '{"t":1786412013000,"page":"1170323086162562","cust":"2787903997","type":"order","name":"Sara","phone":"971500000001","city":"Dubai","qty":2,"conv":"c1"}',
  '{"t":1786412014000,"page":"1170323086162562","cust":"2787903997","type":"handoff","reason":"khách đòi gặp người","kind":"ai","conv":"c1"}',
  '{"t":1786412015000,"page":"1200082103184799","cust":"3311","type":"other_bot","text":"Botcake chào"}',
  '{"t":1786412016000,"page":"1200082103184799","cust":"3311","type":"yielded","lane":"AI","tin":900,"tout":40,"calls":1}',
  '{"t":1786412017000,"page":"1200082103184799","cust":"3311","type":"spent_no_send","reason":"guard chặn","tin":700,"tout":30,"calls":1}',
  '{"t":1786412018000,"page":"1200082103184799","cust":"3311","type":"reply","model":"claude-haiku-4-5","lane":"AI","tin":100,"tout":10,"calls":1}',
  "dòng rác không phải JSON",
].join("\n");

let sb;
let thuMuc;
let tep;

before(async () => {
  sb = await dungSandbox("soai");
  thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), "l0m1-soai-"));
  tep = path.join(thuMuc, "ai-messages.jsonl");
  fs.writeFileSync(tep, `${MAU}\n`);
});
after(async () => {
  await sb.don();
  fs.rmSync(thuMuc, { recursive: true, force: true });
});

test("A1 · thiếu khai mã model → NÉM LỖI kèm số dòng, KHÔNG đoán hộ", async () => {
  await assert.rejects(() => napSoAi(sb.pool, tep), /không khai mã model/);
  const r = await sb.pool.query("SELECT count(*)::int c FROM so_ai");
  assert.equal(r.rows[0].c, 0, "đã ném lỗi thì không được ghi nửa vời");
});

test("A2 · khai mã model cũ → nạp đủ, dòng tự khai model giữ NGUYÊN giá trị của nó", async () => {
  const kq = await napSoAi(sb.pool, tep, { maModelCu: "kimi-k2.6" });
  assert.equal(kq.soDongTep, 10);
  assert.deepEqual(kq.hong, [10]); // đúng một dòng rác, ở đúng dòng 10
  assert.equal(kq.doc, 9);
  assert.equal(kq.them, 9);
  const r = await sb.pool.query(
    "SELECT ma_model, count(*)::int c FROM so_ai GROUP BY 1 ORDER BY 1",
  );
  assert.deepEqual(r.rows, [
    { ma_model: "claude-haiku-4-5", c: 1 },
    { ma_model: "kimi-k2.6", c: 8 },
  ]);
});

test("A3 · đủ 7 loại sự kiện của §11.2 vào đúng cột `loai`", async () => {
  const r = await sb.pool.query(
    "SELECT DISTINCT loai FROM so_ai ORDER BY loai",
  );
  assert.deepEqual(
    r.rows.map((x) => x.loai),
    [
      "handoff",
      "image",
      "order",
      "other_bot",
      "reply",
      "spent_no_send",
      "yielded",
    ],
  );
});

test("A4 · số token vào đúng cột, phần còn lại của dòng giữ trong du_lieu", async () => {
  const r = await sb.pool.query(
    `SELECT token_vao, token_ra, cache_doc, cache_ghi, so_lan_goi, lane, trang_thai,
            ban_kich_ban, du_lieu FROM so_ai WHERE nguon_dong = 1`,
  );
  const x = r.rows[0];
  assert.deepEqual(
    [x.token_vao, x.token_ra, x.cache_doc, x.cache_ghi, x.so_lan_goi],
    [3053, 167, 8390, 0, 1],
  );
  assert.deepEqual(
    [x.lane, x.trang_thai, x.ban_kich_ban],
    ["AI", "GREET", "v1"],
  );
  assert.equal(x.du_lieu.name, "Sara");
  assert.equal(x.du_lieu.conv, "c1");
  const h = await sb.pool.query("SELECT ly_do FROM so_ai WHERE loai='handoff'");
  assert.equal(h.rows[0].ly_do, "khách đòi gặp người");
});

test("A5 · IDEMPOTENT: nạp lại cùng tệp không thêm dòng nào", async () => {
  const lai = await napSoAi(sb.pool, tep, { maModelCu: "kimi-k2.6" });
  assert.equal(lai.them, 0);
  const r = await sb.pool.query("SELECT count(*)::int c FROM so_ai");
  assert.equal(r.rows[0].c, 9);
});

test("A6 · sổ NỐI THÊM: dòng mới ở cuối tệp được nạp, dòng cũ không nhân đôi", async () => {
  fs.appendFileSync(
    tep,
    '{"t":1786412019000,"page":"1200082103184799","cust":"3311","type":"reply","lane":"AI","tin":50,"tout":5,"calls":1}\n',
  );
  const kq = await napSoAi(sb.pool, tep, { maModelCu: "kimi-k2.6" });
  assert.equal(kq.them, 1);
  const r = await sb.pool.query("SELECT count(*)::int c FROM so_ai");
  assert.equal(r.rows[0].c, 10);
});

test("A7 · bộ đọc không đụng tệp nguồn (chỉ đọc)", () => {
  const truoc = fs.statSync(tep);
  docSoAi(tep, { maModelCu: "kimi-k2.6" });
  const sau = fs.statSync(tep);
  assert.equal(`${truoc.size}|${truoc.mtimeMs}`, `${sau.size}|${sau.mtimeMs}`);
});
