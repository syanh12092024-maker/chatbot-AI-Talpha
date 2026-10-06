// PHIẾU GL3b ② 2 · ④5 · ④6 · ④7 — `pkDocTin` nói đúng lý do · màn Vận hành nói lỗi Pancake thay cho «0 tin» · `pkTagId` không
// cache bảng thẻ khi đọc lỗi · F2 (`pkAddNote` không báo ok khi bị từ chối quyền / cổng ghi chặn) · F3 (POST `success:true` mang
// `error_code` không bị gửi lần hai).
//
// Fetch GIẢ (chỉ host pages.fm), LUÔN 2 token giả. Cổng HTTP ghi THẬT của `handler-v3` được cài (import) ⇒ mọi POST đi qua nó;
// van mở trong PHẠM VI TIẾN TRÌNH CA (không sửa `.env`) và mỗi phép có POST khẳng định `congHttpGhi.daChan` không tăng — trừ
// phép «cổng ghi chặn» (đóng van có chủ đích, đòi +1). Màn Vận hành chạy qua HTTP THẬT (express + router thật + hộp cát), gọi
// bằng `node:http` để lượt gọi của ca không đi qua fetch giả.
import test, { before, after, mock } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import { dungSandbox } from "../db/sandbox.js";
import { config } from "../src/config.js";
import * as pk from "../src/pancake.js";
import { congHttpGhi } from "../src/chat/handler-v3.js";
import { baoDamHoiThoai } from "../src/chat/kho.js";
import { xepTin } from "../src/queue/kho.js";
import { taoRouterVanHanh } from "../v3/src/ui/van-hanh/router.js";

const ENV = { V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "0", V3_PANCAKE_HAN_DOC_MS: "150", V3_PANCAKE_HAN_GUI_MS: "1000" };
const envCu = {};
const cauHinhCu = {};
let goi = [];
let kichBan = () => ({ status: 200, json: async () => ({}) });
let soPage = 0;
const pageMoi = () => `gl3b-p${++soPage}`;      // page mới mỗi phép ⇒ `_pageTokIdx` / cache thẻ không mang trí nhớ phép trước
const tl = (j) => ({ status: 200, json: async () => j });
const html502 = () => ({ status: 502, json: async () => { throw new SyntaxError("Unexpected token <"); } });
const loiMa = (ma) => Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error(`connect ${ma}`), { code: ma }) });
const treo = (_u, init) => new Promise((_, tuChoi) => {
  init?.signal?.addEventListener("abort", () => tuChoi(init.signal.reason), { once: true });
});

before(async () => {
  globalThis.fetch = async (u, init) => {
    const url = new URL(String(u));
    if (url.host !== "pages.fm") throw new Error(`ca GL3b: lượt gọi lạ ra ${url.host} — chặn`);
    goi.push({ method: String(init?.method || "GET").toUpperCase(), path: url.pathname, tok: url.searchParams.get("access_token") });
    return kichBan(url, init, goi.length);
  };
  cauHinhCu.pancakeToken = config.pancakeToken;
  cauHinhCu.pancakeTokensExtra = config.pancakeTokensExtra;
  config.pancakeToken = "";
  config.pancakeTokensExtra = [];
  pk.datKhoTokenDb(async () => ["tokA", "tokB"]);
  assert.equal(await pk.lamMoiTokenDb(), 2);
  assert.equal(pk.listPancakeTokens().filter((t) => !t.expired).length, 2, "đúng 2 token giả");
  for (const [k, v] of Object.entries(ENV)) { envCu[k] = process.env[k]; process.env[k] = v; }
  assert.equal(congHttpGhi.daLap, true, "cổng HTTP ghi thật phải được cài");
});
after(() => {
  for (const [k, v] of Object.entries(envCu)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  pk.datKhoTokenDb(null);
  config.pancakeToken = cauHinhCu.pancakeToken;
  config.pancakeTokensExtra = cauHinhCu.pancakeTokensExtra;
});
const moi = (fn) => { goi = []; kichBan = fn; };

test("GL3b D1 · ② 2 pkDocTin nói ĐÚNG lý do: quá hạn · 502 · lỗi mạng · lỗi quyền · hết token · thân rỗng", { timeout: 15_000 }, async () => {
  const bang = [];
  moi(treo);
  let kq = await pk.pkDocTin(pageMoi(), "c", "k");
  bang.push(`quá hạn → ${kq.loi} (GET=${goi.length})`);
  assert.equal(kq.ok, false);
  assert.match(kq.loi, /^Pancake quá hạn/);
  assert.match(kq.loi, /quá hạn 150 ms/, "giữ chuỗi con của ca GL3 M1/R1/R7b");
  assert.equal(goi.length, 2, "ĐỌC quá hạn vẫn xoay token (GL3 giữ nguyên)");

  moi(html502);
  kq = await pk.pkDocTin(pageMoi(), "c", "k");
  bang.push(`502 → ${kq.loi} (GET=${goi.length})`);
  assert.match(kq.loi, /^Pancake lỗi \(HTTP 502\)/);
  assert.doesNotMatch(kq.loi, /token/);
  assert.equal(goi.length, 1, "thân hỏng ⇒ 1 lượt, không xoay (GL3 R7e giữ nguyên)");
  moi(html502);
  assert.deepEqual(await pk.pkGetConversations(pageMoi()), [], "pkGetConversations thân hỏng ⇒ [] như cũ");
  assert.equal(goi.length, 1);

  moi(async () => { throw loiMa("ECONNREFUSED"); });
  kq = await pk.pkDocTin(pageMoi(), "c", "k");
  bang.push(`lỗi mạng → ${kq.loi}`);
  assert.match(kq.loi, /^Pancake lỗi mạng/);
  assert.match(kq.loi, /ECONNREFUSED/);

  moi(async () => tl({ success: false, error_code: 105 }));
  kq = await pk.pkDocTin(pageMoi(), "c", "k");
  bang.push(`quyền (không câu) → ${kq.loi} (GET=${goi.length})`);
  assert.match(kq.loi, /mã 105/);
  assert.equal(goi.length, 2);

  moi(async () => tl({}));
  kq = await pk.pkDocTin(pageMoi(), "c", "k");
  bang.push(`thân {} có token → ${kq.loi}`);
  assert.equal(kq.ok, false);
  assert.doesNotMatch(kq.loi, /không có token/, "còn token mà Pancake trả {} KHÔNG phải «hết token»");

  pk.datKhoTokenDb(async () => []);
  await pk.lamMoiTokenDb();
  try {
    moi(async () => assert.fail("không token thì không được gọi fetch"));
    kq = await pk.pkDocTin(pageMoi(), "c", "k");
    bang.push(`hết token → ${kq.loi}`);
    assert.match(kq.loi, /không có token Pancake nào còn hạn/);
    assert.equal(goi.length, 0);
  } finally {
    pk.datKhoTokenDb(async () => ["tokA", "tokB"]);
    assert.equal(await pk.lamMoiTokenDb(), 2);
  }
  moi(async () => tl({ messages: [] }));
  assert.deepEqual(await pk.pkDocTin(pageMoi(), "c", "k"), { ok: true, messages: [] }, "rỗng THẬT vẫn là đọc được");
  console.log(`   [gl3b] D1 ${bang.join(" · ")}`);
});

test("GL3b T6 · pkTagId: /settings lỗi ⇒ KHÔNG cache 10′ — lượt dồn dập trong 5 s cùng trả null (không gọi lại), quá 5 s gọi fetch lại, đọc được ⇒ đúng id thẻ", { timeout: 20_000 }, async () => {
  const bang = [];
  const thatThe = (pg) => async (u) => (u.pathname.endsWith(`/pages/${pg}/settings`) ? tl({ settings: { tags: [{ id: 7, text: "Đã gửi" }, { id: 8, text: "AI back Sale" }] } }) : tl({}));
  for (const [nhan, loi] of [["502", html502], ["lỗi mạng", async () => { throw loiMa("ECONNRESET"); }], ["quá hạn", treo]]) {
    const pg = pageMoi();
    moi(loi);
    const id1 = await pk.pkTagId(pg, "Đã gửi");
    const n1 = goi.length;
    // Đồng hồ GIẢ chỉ cho `Date` (hẹn giờ của hạn chờ vẫn thật): cache 10′ và cửa sổ giữ lỗi đều đo bằng Date.now().
    mock.timers.enable({ apis: ["Date"], now: Date.now() });
    try {
      moi(thatThe(pg));
      // Lượt dồn dập ngay sau (vd `page-registry.js#verifyTags` hỏi 3 tên liền nhau): cùng null, KHÔNG gọi /settings —
      // tên 1 lỗi + tên 2 đọc được sẽ thành «page thiếu tên 1» ⇒ chặn AI oan.
      const idDon = await pk.pkTagId(pg, "AI back Sale");
      const nDon = goi.length;
      mock.timers.tick(5_001);                           // qua cửa sổ giữ lỗi (< nhịp vòng nạp 6 s)
      const id2 = await pk.pkTagId(pg, "đã gửi");
      const n2 = goi.length;
      mock.timers.tick(9 * 60_000);                      // vẫn trong 10′
      const id3 = await pk.pkTagId(pg, "AI back Sale");  // đọc được ⇒ CÓ cache: lần này không gọi nữa
      bang.push(`${nhan}: lỗi=${id1}(fetch ${n1}) dồn-dập=${idDon}(fetch ${nDon}) +5 s=${id2}(fetch ${n2}) +9′=${id3}(fetch +${goi.length - n2})`);
      assert.equal(id1, null);
      assert.ok(n1 >= 1, "lượt lỗi phải thật sự gọi /settings");
      assert.equal(idDon, null, `${nhan}: lượt dồn dập trong 5 s phải cùng «chưa biết» (null)`);
      assert.equal(nDon, 0, `${nhan}: lượt dồn dập KHÔNG gọi lại /settings`);
      assert.equal(n2, 1, `${nhan}: quá 5 s PHẢI gọi lại /settings (không ăn bảng thẻ rỗng đã cache 10′)`);
      assert.equal(id2, 7);
      assert.equal(id3, 8);
      assert.equal(goi.length - n2, 0, "đọc được thì vẫn cache 10′ như cũ");
    } finally {
      mock.timers.reset();
    }
  }
  console.log(`   [gl3b] T6 ${bang.join(" · ")}`);
});

test("GL3b F2 · pkAddNote: {error_code:105} ở MỌI token ⇒ thất bại, fetch ĐÚNG 2 lần · cổng ghi chặn ⇒ thất bại · {data:{id:1}} ⇒ ok", { timeout: 15_000 }, async () => {
  let chan0 = congHttpGhi.daChan.length;
  moi(async () => tl({ error_code: 105 }));
  let kq = await pk.pkAddNote(pageMoi(), "k", "AI chuyển người");
  console.log(`   [gl3b] F2 105×2 → ${JSON.stringify(kq).slice(0, 120)} · fetch=${goi.length} · cổng chặn +${congHttpGhi.daChan.length - chan0}`);
  assert.equal(kq.ok, false, "bị từ chối quyền ở mọi token KHÔNG được báo đã ghi chú");
  assert.equal(goi.length, 2, "đúng bằng số token: xoay vì lỗi quyền (fetch phải thật sự được gọi)");
  assert.equal(congHttpGhi.daChan.length - chan0, 0, "van mở: cổng không được chặn (không thì nhánh 105 chưa hề chạy)");

  moi(async () => tl({ data: { id: 1 } }));
  assert.deepEqual(await pk.pkAddNote(pageMoi(), "k", "x"), { ok: true }, "GL3 R7d giữ: thân không `success` mà không lỗi ⇒ ok");
  assert.equal(goi.length, 1);
  moi(async () => tl({ success: true }));
  assert.deepEqual(await pk.pkAddNote(pageMoi(), "k", "x"), { ok: true });

  chan0 = congHttpGhi.daChan.length;
  moi(async () => assert.fail("van đóng mà lượt ghi tới được fetch"));
  process.env.PANCAKE_READONLY = "1";
  try {
    kq = await pk.pkAddNote(pageMoi(), "k", "AI chuyển người");
  } finally {
    process.env.PANCAKE_READONLY = "0";
  }
  console.log(`   [gl3b] F2 cổng chặn → ${JSON.stringify(kq).slice(0, 140)} · fetch=${goi.length} · cổng chặn +${congHttpGhi.daChan.length - chan0}`);
  assert.equal(kq.ok, false, "cổng ghi chặn = CHƯA ghi ⇒ không được báo ok");
  assert.equal(kq.khongRo, undefined, "chắc chắn chưa gửi ⇒ không mang dấu «không rõ» (GL3 R7f giữ)");
  assert.equal(goi.length, 0);
  assert.equal(congHttpGhi.daChan.length - chan0, 1, "đúng cổng thật đã chặn");
});

test("GL3b F3 · POST {success:true, error_code:121} ⇒ THÀNH ở token đầu, fetch ĐÚNG 1 lần (không gửi lần hai bằng token khác)", { timeout: 15_000 }, async () => {
  const chan0 = congHttpGhi.daChan.length;
  moi(async () => tl({ success: true, error_code: 121, id: "m-121" }));
  const kq = await pk.pkSendReply(pageMoi(), "c", "k", "Giá 109 SAR ạ");
  const nGui = goi.length;
  moi(async () => tl({ success: true, error_code: 121 }));
  const kq2 = await pk.pkAddNote(pageMoi(), "k", "AI chốt đơn");
  console.log(`   [gl3b] F3 gửi → ${JSON.stringify(kq)} fetch=${nGui} · ghi chú → ${JSON.stringify(kq2)} fetch=${goi.length}`);
  assert.deepEqual(kq, { ok: true, id: "m-121" });
  assert.equal(nGui, 1, "Pancake đã nhận (success:true) ⇒ KHÔNG xoay sang token 2 (khách nhận hai tin)");
  assert.deepEqual(kq2, { ok: true });
  assert.equal(goi.length, 1);
  assert.equal(congHttpGhi.daChan.length - chan0, 0);
});

// ── ④5 màn Vận hành ───────────────────────────────────────────────────────────────
function layJson(base, duong) {
  return new Promise((ok, tuChoi) => {
    http.get(base + duong, (res) => {
      let s = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { s += c; });
      res.on("end", () => { try { ok({ status: res.statusCode, body: JSON.parse(s) }); } catch (e) { tuChoi(e); } });
    }).on("error", tuChoi);
  });
}

test("GL3b V5 · màn Vận hành: tin có conv_id/cust_id + Pancake lỗi ⇒ `lichSuLoi` mang ĐÚNG câu lỗi Pancake (không hiện «0 tin»), fetch đã gọi", { timeout: 30_000 }, async () => {
  const sb = await dungSandbox("gl3b_vh");
  let server;
  try {
    const team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
    const pg = (await sb.pool.query(
      "INSERT INTO page(team_id,page_id,ten,nguon_tin) VALUES($1,'gl3b-vh-page','GL3b VH','poll') RETURNING id", [team])).rows[0];
    const ht = await baoDamHoiThoai(sb.pool, { teamId: team, pageRowId: pg.id, psid: "ps-vh" });
    await xepTin(sb.pool, { teamId: team, pageId: "gl3b-vh-page", psid: "ps-vh", convId: "conv-vh", custId: "cust-vh", msgId: "m-vh", noiDung: "how much?" });
    const app = express();
    app.use((q, _s, next) => { q.boiCanh = { teamId: team, nguoiDungId: null, vai: ["quan-tri"] }; next(); });
    app.use(taoRouterVanHanh({ pool: sb.pool, env: {} }));
    server = app.listen(0, "127.0.0.1");
    await new Promise((r) => server.once("listening", r));
    const base = `http://127.0.0.1:${server.address().port}`;

    const bang = [];
    for (const [nhan, loi, mau] of [
      ["Pancake báo lỗi", async () => tl({ success: false, message: "Không tìm thấy gói cước của trang" }), /Không tìm thấy gói cước của trang/],
      ["502 HTML", html502, /Pancake lỗi \(HTTP 502\)/],
    ]) {
      moi(loi);
      const r = await layJson(base, `/api/van-hanh/conversations/${ht.id}`);
      const docTin = goi.filter((g) => g.path.endsWith("/conversations/conv-vh/messages")).length;
      bang.push(`${nhan}: status=${r.status} lichSuLoi=«${r.body.lichSuLoi}» lichSu=${r.body.lichSu?.length} fetch=${docTin}`);
      assert.equal(r.status, 200, JSON.stringify(r.body).slice(0, 200));
      assert.ok(docTin >= 1, "fetch giả phải được gọi (không đi nhánh «chưa có tin nào» của router)");
      assert.match(String(r.body.lichSuLoi), mau, "màn phải NÓI lỗi Pancake, không im thành «0 tin»");
      assert.deepEqual(r.body.lichSu, []);
    }
    moi(async () => tl({ messages: [{ id: "a", from: { id: "ps-vh", name: "K" }, message: "how much?" }] }));
    const r = await layJson(base, `/api/van-hanh/conversations/${ht.id}`);
    bang.push(`đọc được: lichSuLoi=${r.body.lichSuLoi} lichSu=${r.body.lichSu?.length}`);
    assert.equal(r.body.lichSuLoi, null);
    assert.equal(r.body.lichSu.length, 1);
    console.log(`   [gl3b] V5 ${bang.join(" · ")}`);
  } finally {
    server?.close();
    await sb.don();
  }
});
