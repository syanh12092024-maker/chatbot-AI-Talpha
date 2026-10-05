// PHIẾU GL3 — hạn chờ cho MỌI lượt gọi Pancake + gửi lỗi mạng KHÔNG gửi lại bằng token khác.
//
// Đo `src/pancake.js` bằng `fetch` GIẢ (không một lượt mạng thật) và LUÔN ≥ 2 token, để thấy có / không xoay.
// Nạp từ một BẢN SAO TẠM của `src/pancake.js` + `src/config.js` (chép lúc chạy ca, nên đảo-vá trên cây vẫn đi
// theo): hai đường ghi tệp của module (`pancake-tokens.json` khi thêm token thành công, `pancake-page-tokens.json`
// khi sinh page token) rơi vào thư mục tạm chứ không vào gốc repo — `test/_an-toan.mjs` không đổi hướng hai tệp đó.
//
// Hai loại ca:
//   · ĐỒNG HỒ GIẢ (`mock.timers`) — đo CHÍNH XÁC hạn nào áp: 15 000 / 30 000 mặc định, biến hợp lệ, biến gõ sai
//     về mặc định. Không phải chờ 15 s thật; «tick 14 999 chưa xoay, tick 1 thì xoay» là phép đo đúng tới mili-giây.
//   · ĐỒNG HỒ THẬT, hạn rút ngắn qua biến — đo request treo THẬT bị cắt (signal tới tay fetch và đã huỷ) và
//     số lượt fetch (1 cho GHI, = số token cho ĐỌC).
import test, { before, after, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const T = fs.mkdtempSync(path.join(os.tmpdir(), "gl3-pancake-"));
fs.mkdirSync(path.join(T, "src"));
for (const f of ["pancake.js", "config.js"]) fs.copyFileSync(path.join(GOC, "src", f), path.join(T, "src", f));
fs.symlinkSync(path.join(GOC, "node_modules"), path.join(T, "node_modules"));
const FILE_DO = path.join(T, "src", "pancake.js");

let pk;
let cfg;
const DOC = "V3_PANCAKE_HAN_DOC_MS";
const GUI = "V3_PANCAKE_HAN_GUI_MS";
const ENV_GIU = [DOC, GUI, "AICLOSER_SINH_TOKEN"];
const envCu = {};
const fetchCu = globalThis.fetch;
let goi = [];

before(async () => {
  for (const k of ENV_GIU) envCu[k] = process.env[k];
  cfg = (await import(pathToFileURL(path.join(T, "src", "config.js")).href)).config;
  pk = await import(pathToFileURL(FILE_DO).href);
  // Bẫy 16: in đúng tệp đang đo — bản sao tạm chép từ cây nào.
  console.log(`   [gl3] đo ${FILE_DO} (chép từ ${path.join(GOC, "src/pancake.js")})`);
  // Kho token TẤT ĐỊNH: tắt hai kho .env, tiêm đúng hai token giả qua cửa kho CSDL.
  cfg.pancakeToken = "";
  cfg.pancakeTokensExtra = [];
  pk.datKhoTokenDb(async () => ["tokA", "tokB"]);
  assert.equal(await pk.lamMoiTokenDb(), 2, "phải có đúng 2 token giả");
});
after(() => {
  pk?.datKhoTokenDb(null);
  globalThis.fetch = fetchCu;
  for (const k of ENV_GIU) if (envCu[k] === undefined) delete process.env[k]; else process.env[k] = envCu[k];
  fs.rmSync(T, { recursive: true, force: true });
});
beforeEach(() => {
  for (const k of ENV_GIU) delete process.env[k];
  goi = [];
});
afterEach(() => {
  globalThis.fetch = fetchCu;
  mock.timers.reset();
  mock.restoreAll();
});

// ── fetch giả ────────────────────────────────────────────────────────────────────
let soPage = 0;
const pageMoi = () => `gl3p${++soPage}`;   // page mới mỗi ca ⇒ `_pageTokIdx` không mang trí nhớ ca trước
function datFetch(kichBan) {
  globalThis.fetch = (u, init) => {
    const url = new URL(String(u));
    assert.equal(url.host, "pages.fm", `ca gọi lạ ra ${url.host}`);
    goi.push({
      t: performance.now(),
      path: url.pathname,
      method: String(init?.method || "GET").toUpperCase(),
      tok: url.searchParams.get("access_token") || url.searchParams.get("page_access_token"),
      signal: init?.signal,
    });
    return kichBan(url, init, goi.length);
  };
}
// Treo như undici: không bao giờ trả lời, nhưng NGHE signal (huỷ ⇒ ném lý do huỷ).
const treo = (_u, init) => new Promise((_, tuChoi) => {
  init?.signal?.addEventListener("abort", () => tuChoi(init.signal.reason ?? new Error("aborted")), { once: true });
});
// Treo ĐIẾC: lờ signal đi (polyfill/bẫy hỏng) — hạn vẫn phải đúng.
const treoDiec = () => new Promise(() => {});
const tl = (j) => ({ json: async () => j });
const thanTreo = () => ({ json: () => new Promise(() => {}) });   // header về, thân treo mãi
const loiMa = (ma, sau = false) => {
  const goc = Object.assign(new Error(`connect ${ma} 1.2.3.4:443`), { code: ma });
  const e = new TypeError("fetch failed");
  e.cause = sau ? Object.assign(new Error("lớp giữa"), { cause: goc }) : goc;
  return e;
};
const xa = async () => { for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r)); };
const doMs = async (fn) => { const t0 = performance.now(); const kq = await fn(); return [kq, performance.now() - t0]; };
const soGoi = (m) => goi.filter((g) => g.method === m).length;

// ═══ ĐỒNG HỒ GIẢ — hạn nào áp, đúng tới mili-giây ═══════════════════════════════════

/** Chạy `goiHam()` với fetch TREO dưới đồng hồ giả; trả mốc (ms) mà lượt fetch thứ hai xuất hiện / lời hứa xong. */
async function doBangDongHoGia(goiHam, buoc) {
  datFetch(treo);
  mock.timers.enable({ apis: ["setTimeout"] });
  let xong = false;
  let kq;
  const p = goiHam().then((v) => { xong = true; kq = v; });
  await xa();
  const vet = [];
  for (const [ms, chờGọi, chờXong] of buoc) {
    mock.timers.tick(ms);
    await xa();
    vet.push(`+${ms}: goi=${goi.length} xong=${xong}`);
    assert.equal(goi.length, chờGọi, `sau +${ms} ms: số lượt fetch (vết ${vet.join(" · ")})`);
    assert.equal(xong, chờXong, `sau +${ms} ms: đã xong? (vết ${vet.join(" · ")})`);
  }
  await p;
  return kq;
}

test("GL3 M1 · ĐỌC mặc định 15 000 ms MỖI token: tick 14 999 chưa xoay, +1 xoay sang token 2 (≥2 token)", { timeout: 10_000 }, async () => {
  const pg = pageMoi();
  const kq = await doBangDongHoGia(() => pk.pkDocTin(pg, "c1", "k1"), [
    [14_999, 1, false], [1, 2, false], [14_999, 2, false], [1, 2, true],
  ]);
  assert.equal(kq.ok, false);
  assert.match(kq.loi, /quá hạn 15000 ms/);
  assert.deepEqual(goi.map((g) => g.tok), ["tokA", "tokB"]);
});

test("GL3 M2 · GỬI mặc định 30 000 ms: tick 29 999 chưa xong, +1 trả «không rõ» — fetch ĐÚNG 1 lần", { timeout: 10_000 }, async () => {
  const kq = await doBangDongHoGia(() => pk.pkSendReply(pageMoi(), "c1", "k1", "xin chào"), [
    [15_000, 1, false], [14_999, 1, false], [1, 1, true],
  ]);
  assert.equal(kq.ok, false);
  assert.equal(kq.khongRo, true);
  assert.equal(kq.quaHan, true);
  assert.equal(kq.phaLoi, "sau_gui");
  assert.equal(soGoi("POST"), 1);
});

test("GL3 M3 · (a) biến gõ sai '0' · 'abc' · '-5' · '120001' · '1.5' ⇒ MẶC ĐỊNH (không huỷ ngay) + cảnh báo MỘT lần mỗi giá trị", { timeout: 20_000 }, async () => {
  const warn = mock.method(console, "warn", () => {});
  for (const sai of ["0", "abc", "-5", "120001", "1.5"]) {
    process.env[DOC] = sai;
    goi = [];
    await doBangDongHoGia(() => pk.pkGetConversations(pageMoi()), [[14_999, 1, false], [1, 2, false], [15_000, 2, true]]);
    mock.timers.reset();
    goi = [];
    await doBangDongHoGia(() => pk.pkGetConversations(pageMoi()), [[14_999, 1, false], [1, 2, false], [15_000, 2, true]]);
    mock.timers.reset();
  }
  process.env[GUI] = "0";
  goi = [];
  await doBangDongHoGia(() => pk.pkSendReply(pageMoi(), "c", "k", "x"), [[29_999, 1, false], [1, 1, true]]);
  const canhBao = warn.mock.calls.map((c) => String(c.arguments[0]));
  const dem = (s) => canhBao.filter((m) => m.includes(`${DOC}=${JSON.stringify(s)}`)).length;
  console.log(`   [gl3] cảnh báo: ${canhBao.length} dòng — ${canhBao.map((m) => m.slice(10, 50)).join(" | ")}`);
  for (const sai of ["0", "abc", "-5", "120001", "1.5"]) assert.equal(dem(sai), 1, `cảnh báo cho ${sai}`);
  assert.equal(canhBao.filter((m) => m.includes(`${GUI}="0"`)).length, 1);
});

test("GL3 M4 · biến HỢP LỆ áp đúng (biên 1 · 2000 · 120000) — đọc TƯƠI mỗi lượt", { timeout: 10_000 }, async () => {
  process.env[DOC] = "2000";
  await doBangDongHoGia(() => pk.pkGetConversations(pageMoi()), [[1_999, 1, false], [1, 2, false], [2_000, 2, true]]);
  mock.timers.reset();
  goi = [];
  process.env[DOC] = "1";
  await doBangDongHoGia(() => pk.pkGetConversations(pageMoi()), [[1, 2, false], [1, 2, true]]);
  mock.timers.reset();
  goi = [];
  process.env[GUI] = "120000";
  await doBangDongHoGia(() => pk.pkSendReply(pageMoi(), "c", "k", "x"), [[119_999, 1, false], [1, 1, true]]);
  mock.timers.reset();
  goi = [];
  process.env[GUI] = "4000";   // GHI dùng hạn GỬI, không dùng hạn ĐỌC (DOC đang = 1)
  await doBangDongHoGia(() => pk.pkSendImage(pageMoi(), "c", "k", "https://x/a.jpg"), [[3_999, 1, false], [1, 1, true]]);
});

// ═══ ĐỒNG HỒ THẬT — hạn rút ngắn qua biến ═══════════════════════════════════════════

test("GL3 R0 · CHO-QUA thật: POST thành công ở token 1 ⇒ ok, đúng 1 lượt, signal có mặt", { timeout: 10_000 }, async () => {
  datFetch(async () => tl({ success: true, id: "m-ok" }));
  const kq = await pk.pkSendReply(pageMoi(), "c1", "k1", "chào");
  assert.deepEqual(kq, { ok: true, id: "m-ok" });
  assert.equal(goi.length, 1);
  assert.ok(goi[0].signal instanceof AbortSignal, "fetch phải nhận signal");
  assert.equal(goi[0].signal.aborted, false, "thành công thì không huỷ");
});

test("GL3 R1 · ④1 GET TREO ⇒ trả lỗi sau ≈ hạn đọc MỖI token và thử token kế; signal tới tay fetch và đã huỷ", { timeout: 10_000 }, async () => {
  process.env[DOC] = "150";
  process.env[GUI] = "400";
  datFetch(treo);
  const [kq, ms] = await doMs(() => pk.pkDocTin(pageMoi(), "c1", "k1"));
  const khe = goi[1].t - goi[0].t;
  console.log(`   [gl3] R1 GET treo: ${ms.toFixed(0)} ms · khe token1→2 ${khe.toFixed(0)} ms · lượt=${goi.length}`);
  assert.equal(kq.ok, false);
  assert.match(kq.loi, /quá hạn 150 ms/);
  assert.equal(goi.length, 2);
  assert.deepEqual(goi.map((g) => g.tok), ["tokA", "tokB"]);
  assert.ok(goi.every((g) => g.signal instanceof AbortSignal && g.signal.aborted), "mỗi lượt phải bị huỷ thật qua signal");
  assert.ok(khe >= 140 && khe < 2_000, `khe ${khe} phải ≈ 150`);
  assert.ok(ms >= 290 && ms < 3_000, `tổng ${ms} phải ≈ 2×150`);
  assert.ok(!kq.loi.includes("tokA"), "thông điệp lỗi không được lộ token");
});

test("GL3 R1b · GET treo ĐIẾC (fetch lờ signal) ⇒ hạn vẫn cắt đúng", { timeout: 10_000 }, async () => {
  process.env[DOC] = "150";
  datFetch(treoDiec);
  const [kq, ms] = await doMs(() => pk.pkGetMessages(pageMoi(), "c1", "k1"));
  assert.deepEqual(kq, []);
  assert.equal(goi.length, 2);
  assert.ok(ms >= 290 && ms < 3_000, `tổng ${ms}`);
});

test("GL3 R2 · ④2 POST gửi chữ TREO ⇒ «không rõ» sau ≈ hạn GỬI, fetch ĐÚNG 1 lần (không token thứ hai)", { timeout: 10_000 }, async () => {
  process.env[DOC] = "100";
  process.env[GUI] = "300";
  datFetch(treo);
  const [kq, ms] = await doMs(() => pk.pkSendReply(pageMoi(), "c1", "k1", "giá 109 SAR"));
  console.log(`   [gl3] R2 POST treo: ${ms.toFixed(0)} ms · lượt=${goi.length} · ${JSON.stringify(kq)}`);
  assert.equal(kq.ok, false);
  assert.equal(kq.khongRo, true);
  assert.equal(kq.quaHan, true);
  assert.equal(kq.phaLoi, "sau_gui");
  assert.equal(goi.length, 1, "POST lỗi mạng/quá hạn KHÔNG được thử token thứ hai");
  assert.equal(goi[0].tok, "tokA");
  assert.ok(goi[0].signal.aborted);
  assert.ok(ms >= 290 && ms < 3_000, `${ms} phải ≈ 300 (hạn GỬI, không phải hạn ĐỌC 100)`);
});

test("GL3 R2b · mọi hàm GHI qua pkFetchPage (ảnh · thẻ · ghi chú) treo ⇒ đúng 1 lượt, mang dấu khongRo", { timeout: 10_000 }, async () => {
  process.env[GUI] = "120";
  for (const [ten, fn] of [
    ["pkSendImage", (pg) => pk.pkSendImage(pg, "c", "k", "https://x/a.jpg", "đây ạ")],
    ["pkToggleTag", (pg) => pk.pkToggleTag(pg, "c", 7, true)],
    ["pkAddNote", (pg) => pk.pkAddNote(pg, "k", "AI chuyển người")],
  ]) {
    goi = [];
    datFetch(treo);
    const kq = await fn(pageMoi());
    assert.equal(kq.ok, false, `${ten} treo không được ok`);
    assert.equal(kq.khongRo, true, `${ten} thiếu dấu khongRo`);
    assert.equal(goi.length, 1, `${ten}: ${goi.length} lượt`);
  }
});

test("GL3 R3 · ④3 POST NÉM lỗi mạng ⇒ trả lỗi NGAY, fetch đúng 1 lần", { timeout: 10_000 }, async () => {
  process.env[GUI] = "5000";
  datFetch(async () => { throw loiMa("ECONNRESET"); });
  const [kq, ms] = await doMs(() => pk.pkSendReply(pageMoi(), "c1", "k1", "x"));
  assert.equal(kq.ok, false);
  assert.equal(kq.khongRo, true);
  assert.equal(kq.phaLoi, "sau_gui");
  assert.equal(kq.quaHan, undefined);
  assert.match(kq.error, /ECONNRESET/);
  assert.equal(goi.length, 1);
  assert.ok(ms < 1_000, `${ms} phải gần như ngay`);
  // fetch ném ĐỒNG BỘ (không phải lời hứa bị từ chối) — cũng đúng 1 lượt
  goi = [];
  datFetch(() => { throw loiMa("ECONNRESET"); });
  const kq2 = await pk.pkSendReply(pageMoi(), "c1", "k1", "x");
  assert.equal(kq2.khongRo, true);
  assert.equal(goi.length, 1);
});

test("GL3 R4 · ④4 POST nhận error_code 105 ở token 1 ⇒ thử token 2 ⇒ thành; page nhớ token 2", { timeout: 10_000 }, async () => {
  const pg = pageMoi();
  datFetch(async (_u, _i, n) => (n === 1 ? tl({ success: false, error_code: 105, message: "no perm" }) : tl({ success: true, id: "m2" })));
  const kq = await pk.pkSendReply(pg, "c1", "k1", "x");
  assert.deepEqual(kq, { ok: true, id: "m2" });
  assert.deepEqual(goi.map((g) => g.tok), ["tokA", "tokB"]);
  goi = [];
  datFetch(async () => tl({ success: true, id: "m3" }));
  await pk.pkSendReply(pg, "c1", "k1", "y");
  assert.deepEqual(goi.map((g) => g.tok), ["tokB"], "_pageTokIdx giữ nguyên cách nhớ");
  // 121 (gói cước) trong mảng errors cũng là lỗi quyền
  goi = [];
  const pg2 = pageMoi();
  datFetch(async (_u, _i, n) => (n === 1 ? tl({ errors: [{ error_code: 121 }] }) : tl({ success: true, id: "m4" })));
  assert.equal((await pk.pkToggleTag(pg2, "c", 1)).ok, true);
  assert.equal(goi.length, 2);
});

test("GL3 R5 · ④5 GET lỗi mạng ở token 1 ⇒ thử token 2 (giữ nguyên)", { timeout: 10_000 }, async () => {
  datFetch(async (_u, _i, n) => { if (n === 1) throw loiMa("ECONNRESET"); return tl({ messages: [{ id: "a" }] }); });
  const kq = await pk.pkDocTin(pageMoi(), "c1", "k1");
  assert.deepEqual(kq, { ok: true, messages: [{ id: "a" }] });
  assert.deepEqual(goi.map((g) => g.tok), ["tokA", "tokB"]);
});

test("GL3 R6 · ④6 bốn fetch trần treo ⇒ trả lỗi sau ≈ hạn đọc", { timeout: 15_000 }, async () => {
  process.env[DOC] = "150";
  process.env[GUI] = "5000";   // bốn chỗ này dùng hạn ĐỌC (phiếu ②4) — để GỬI dài ra cho thấy không lẫn
  const bang = [];

  // :91 addPancakeToken — một lượt GET, lỗi ⇒ {ok:false}
  datFetch(treo);
  let [kq, ms] = await doMs(() => pk.addPancakeToken("aaa.bbb.ccc"));
  bang.push(`addPancakeToken ${ms.toFixed(0)}ms lượt=${goi.length}`);
  assert.equal(kq.ok, false);
  assert.match(kq.error, /quá hạn 150 ms/);
  assert.equal(goi.length, 1);
  assert.ok(ms >= 140 && ms < 2_500, `addPancakeToken ${ms}`);
  assert.equal(fs.existsSync(path.join(T, "pancake-tokens.json")), false, "lỗi thì không lưu token");

  // :202 refreshPancakePages — GET từng token
  goi = [];
  datFetch(treo);
  [kq, ms] = await doMs(() => pk.refreshPancakePages());
  bang.push(`refreshPancakePages ${ms.toFixed(0)}ms lượt=${goi.length}`);
  assert.equal(kq, 0);
  assert.equal(goi.length, 2);
  assert.ok(ms >= 290 && ms < 3_000, `refreshPancakePages ${ms}`);

  // :166 getPageAccessToken (qua pkMarkUnread, khoá sinh token MỞ trong phạm vi ca) — treo ⇒ null
  process.env.AICLOSER_SINH_TOKEN = "1";
  goi = [];
  datFetch(treo);
  [kq, ms] = await doMs(() => pk.pkMarkUnread(pageMoi(), "conv1"));
  bang.push(`getPageAccessToken ${ms.toFixed(0)}ms lượt=${goi.length}`);
  assert.equal(kq.ok, false);
  assert.ok(goi.every((g) => g.path.endsWith("/generate_page_access_token")));
  assert.ok(ms >= 140 * goi.length && ms < 3_000, `getPageAccessToken ${ms}`);

  // :185 pkMarkUnread — sinh page token thành công (ghi vào thư mục TẠM), rồi /unread treo ⇒ 1 lượt, lỗi
  goi = [];
  datFetch(async (u, init) => (u.pathname.endsWith("/generate_page_access_token") ? tl({ page_access_token: "pt-gl3" }) : treo(u, init)));
  [kq, ms] = await doMs(() => pk.pkMarkUnread(pageMoi(), "conv2"));
  const unread = goi.filter((g) => g.path.endsWith("/unread"));
  bang.push(`pkMarkUnread ${ms.toFixed(0)}ms lượt-unread=${unread.length}`);
  assert.equal(kq.ok, false);
  assert.match(kq.error, /quá hạn 150 ms/);
  assert.equal(unread.length, 1, "pkMarkUnread lỗi ⇒ không thử lại");
  assert.ok(!kq.error.includes("pt-gl3"), "không lộ page token");
  assert.ok(ms >= 140 && ms < 2_500, `pkMarkUnread ${ms}`);
  console.log(`   [gl3] R6 ${bang.join(" · ")}`);
});

test("GL3 R7b · thân phản hồi TREO sau khi header về ⇒ quá hạn đúng (GET xoay token; POST 1 lượt, khongRo)", { timeout: 10_000 }, async () => {
  process.env[DOC] = "120";
  process.env[GUI] = "200";
  datFetch(async () => thanTreo());
  let [kq, ms] = await doMs(() => pk.pkDocTin(pageMoi(), "c", "k"));
  assert.match(kq.loi, /quá hạn 120 ms/);
  assert.equal(goi.length, 2);
  assert.ok(ms >= 230 && ms < 3_000, `GET thân treo ${ms}`);
  goi = [];
  datFetch(async () => thanTreo());
  [kq, ms] = await doMs(() => pk.pkSendReply(pageMoi(), "c", "k", "x"));
  assert.equal(kq.khongRo, true);
  assert.equal(kq.quaHan, true);
  assert.equal(goi.length, 1);
  assert.ok(ms >= 190 && ms < 3_000, `POST thân treo ${ms}`);
});

test("GL3 R7e · thân KHÔNG phải JSON (502/504 HTML) mà không quá hạn: GHI ⇒ «không rõ», 1 lượt; ĐỌC ⇒ `{}` như bản cũ, không xoay", { timeout: 10_000 }, async () => {
  const html = async () => ({ status: 502, json: async () => { throw new SyntaxError("Unexpected token <"); } });
  datFetch(html);
  let kq = await pk.pkSendReply(pageMoi(), "c", "k", "x");
  assert.equal(kq.ok, false);
  assert.equal(kq.khongRo, true, "GHI nhận 502 HTML: có thể tin đã đi ⇒ phải mang dấu không rõ");
  assert.equal(kq.phaLoi, "sau_gui");
  assert.match(kq.error, /HTTP 502/);
  assert.equal(goi.length, 1);
  goi = [];
  datFetch(html);
  assert.equal((await pk.pkAddNote(pageMoi(), "k", "x")).ok, false, "ghi chú nhận HTML không được thành ok");
  goi = [];
  datFetch(html);
  assert.deepEqual(await pk.pkGetConversations(pageMoi()), []);
  assert.equal(goi.length, 1, "ĐỌC thân hỏng ⇒ `{}` như bản cũ, không xoay token");
  // hai fetch trần đọc trả lại đúng lời báo cũ (trước GL3 `await res.json()` ném)
  goi = [];
  datFetch(html);
  const warn = mock.method(console, "warn", () => {});
  assert.equal(await pk.refreshPancakePages(), 0);
  assert.equal(warn.mock.calls.filter((c) => String(c.arguments[0]).includes("nạp page lỗi")).length, 2);
  datFetch(html);
  assert.match((await pk.addPancakeToken("aaa.bbb.ccc")).error, /^Lỗi mạng khi kiểm tra token: .*HTTP 502/);
});

test("GL3 R7f · cổng HTTP ghi chặn (LoiCuaGuiDong — van đóng, CHẮC CHẮN chưa gửi) ⇒ 1 lượt, phaLoi 'ket_noi', KHÔNG dấu khongRo", { timeout: 10_000 }, async () => {
  datFetch(async () => { const e = new Error("CỔNG HTTP GHI chặn POST pages.fm"); e.name = "LoiCuaGuiDong"; throw e; });
  const kq = await pk.pkSendReply(pageMoi(), "c", "k", "x");
  assert.equal(kq.ok, false);
  assert.equal(kq.khongRo, undefined);
  assert.equal(kq.phaLoi, "ket_noi");
  assert.equal(goi.length, 1, "chặn ⇒ không xoay token");
});

test("GL3 R7c · phaLoi: pha KẾT NỐI ('ket_noi') vs SAU GỬI ('sau_gui'); POST pha kết nối vẫn KHÔNG xoay", { timeout: 10_000 }, async () => {
  process.env[GUI] = "150";
  const bang = [];
  for (const [ten, nem, cho] of [
    ["ECONNREFUSED", () => loiMa("ECONNREFUSED"), "ket_noi"],
    ["ENOTFOUND", () => loiMa("ENOTFOUND"), "ket_noi"],
    ["EAI_AGAIN lồng 2 tầng", () => loiMa("EAI_AGAIN", true), "ket_noi"],
    ["UND_ERR_CONNECT_TIMEOUT", () => loiMa("UND_ERR_CONNECT_TIMEOUT"), "ket_noi"],
    ["ECONNRESET", () => loiMa("ECONNRESET"), "sau_gui"],
    ["UND_ERR_SOCKET", () => loiMa("UND_ERR_SOCKET"), "sau_gui"],
    ["lỗi lạ không mã", () => new Error("boom"), "sau_gui"],
  ]) {
    goi = [];
    datFetch(async () => { throw nem(); });
    const kq = await pk.pkSendReply(pageMoi(), "c", "k", "x");
    bang.push(`${ten}→${kq.phaLoi}/${goi.length}`);
    assert.equal(kq.phaLoi, cho, ten);
    assert.equal(kq.khongRo, true, ten);
    assert.equal(goi.length, 1, `${ten}: POST không xoay token`);
  }
  goi = [];
  datFetch(treo);
  assert.equal((await pk.pkSendReply(pageMoi(), "c", "k", "x")).phaLoi, "sau_gui", "quá hạn ⇒ sau_gui");
  // GET pha kết nối: vẫn xoay (đọc lại không hại ai), lỗi cuối mang phaLoi
  goi = [];
  datFetch(async () => { throw loiMa("ECONNREFUSED"); });
  const kqDoc = await pk.pkDocTin(pageMoi(), "c", "k");
  assert.equal(goi.length, 2);
  assert.match(kqDoc.loi, /ECONNREFUSED/);
  console.log(`   [gl3] R7c ${bang.join(" · ")}`);
});

test("GL3 R7d · pkAddNote lỗi mạng / quá hạn ⇒ THẤT BẠI (trước GL3 lọt thành ok:true); thành công vẫn ok", { timeout: 10_000 }, async () => {
  process.env[GUI] = "120";
  datFetch(async () => { throw loiMa("ECONNRESET"); });
  let kq = await pk.pkAddNote(pageMoi(), "k", "AI chốt đơn");
  assert.equal(kq.ok, false);
  assert.equal(kq.khongRo, true);
  assert.equal(goi.length, 1);
  goi = [];
  datFetch(treo);
  kq = await pk.pkAddNote(pageMoi(), "k", "AI chốt đơn");
  assert.equal(kq.ok, false);
  assert.equal(kq.quaHan, true);
  goi = [];
  datFetch(async () => tl({ success: true }));
  assert.deepEqual(await pk.pkAddNote(pageMoi(), "k", "x"), { ok: true });
  datFetch(async () => tl({ data: { id: 1 } }));   // không có `success` ⇒ giữ hành vi cũ: ok
  assert.deepEqual(await pk.pkAddNote(pageMoi(), "k", "x"), { ok: true });
  datFetch(async () => tl({ success: false, message: "bị từ chối" }));
  assert.deepEqual(await pk.pkAddNote(pageMoi(), "k", "x"), { ok: false, error: "bị từ chối" });
  datFetch(async () => tl({}));   // thân rỗng không phải bằng chứng đã ghi
  assert.equal((await pk.pkAddNote(pageMoi(), "k", "x")).ok, false);
  // không còn token nào ⇒ pkFetchPage trả `{}` không gọi gì ⇒ KHÔNG được báo ok
  pk.datKhoTokenDb(async () => []);
  await pk.lamMoiTokenDb();
  goi = [];
  try {
    assert.equal((await pk.pkAddNote(pageMoi(), "k", "x")).ok, false);
    assert.equal(goi.length, 0);
  } finally {
    pk.datKhoTokenDb(async () => ["tokA", "tokB"]);
    assert.equal(await pk.lamMoiTokenDb(), 2);
  }
});
