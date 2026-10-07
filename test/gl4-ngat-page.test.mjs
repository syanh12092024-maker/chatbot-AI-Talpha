// PHIẾU GL4 ④1–④5 · ④8 — NGẮT CẢ PAGE 30′ khi kênh Pancake lỗi 2 lần liên tiếp (gửi HOẶC đọc), tự mở; tin tồn giữ ở chờ.
//
// Đường đi THẬT (④ ⚠️): `chay-worker#motLuot` → `worker#chayMotVong` → `channels/messenger#docTin` → `pancake.js#pkDocTin` →
// `pkFetchPage` → cổng HTTP ghi của `handler-v3` → fetch GIẢ; gửi: handler-v3 → `lan-gui#bocCuaGuiBen` → cửa THẬT → pkSendReply /
// pkTagByName / pkAddNote → fetch GIẢ. CẤM tiêm `docTin` / `cua` / `docLichSu:false`; KHÔNG tiêm `dsChoPhep` (đi `trangThaiTran`
// thật, `V3_TRAN_PAGE_BAT` đặt trong env ca). Chỉ tiêm bộ não giả (layKb · layModel · lanNhanh · kiemTinRa) và độ chờ-gõ-xong của
// bộ nạp (= 0, cửa tiêm sẵn có — như ca GL3b).
//
// ⚠️ Máy dev có `PANCAKE_READONLY=1` trong `.env` ⇒ worker chốt `chan_guard` TRƯỚC lượt đọc ⇒ phép phủ định («KHÔNG ngắt») xanh giả.
// Van mở trong PHẠM VI TIẾN TRÌNH CA (process.env, KHÔNG sửa `.env`) SAU khi đã cài fetch giả; 2 token GIẢ. Mọi phép phủ định kèm
// vế «ĐÃ CHẠM»: fetch giả nhận ≥ 1 lượt đúng URL của đúng tin · `ly_do` tin mang tên lỗi · `ket.nap.mo === true` · cổng HTTP ghi
// không chặn lượt nào. «Qua 30′» = `UPDATE page SET ngat_den = now() - 1 s` (đồng hồ CSDL) — cấm tiêm đồng hồ JS.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dungSandbox } from "../db/sandbox.js";
import * as cw from "../src/queue/chay-worker.js";
import { xepTin } from "../src/queue/kho.js";
import { baoDamHoiThoai } from "../src/chat/kho.js";
import { bocCuaGuiBen } from "../src/queue/lan-gui.js";
import { config } from "../src/config.js";
import { datKhoTokenDb, lamMoiTokenDb, listPancakeTokens } from "../src/pancake.js";
import { congHttpGhi } from "../src/chat/handler-v3.js";
import { setPage } from "../src/admin-v3/operations.js";
// Mô-đun mới của GL4: nạp động ⇒ trên base (chưa có tệp) từng ca ĐỎ đúng tên, tệp ca không chết lúc nạp.
const ngat = await import("../src/queue/ngat-page.js").catch(() => null);

const HAN_DOC = 150;
const HAN_GUI = 300;
const ENV = {
  V3_PANCAKE_GUI: "1",
  PANCAKE_READONLY: "0",            // chỉ trong tiến trình ca — .env vẫn =1
  V3_PANCAKE_HAN_GUI_MS: String(HAN_GUI),
  V3_PANCAKE_HAN_DOC_MS: String(HAN_DOC),
  PK_MARK_UNREAD: "0",
  V3_DIEN_TAP: undefined,           // diễn tập dừng TRƯỚC fetch ⇒ phải tắt
  V3_TRAN_PAGE_BAT: "50",           // trần GL2 rộng — ca P5 tự hạ
  V3_NAP_IM_BOTCAKE_MS: "0",
  V3_NAP_CHI_CHUA_DOC: "0",
  V3_NAP_THE_CHAN: "Đã gửi",
};
const envCu = {};
const cauHinhCu = {};
const goi = [];                     // { method, path, page, psid, loai, tok }
const CHE_GET = new Map();          // psid → cách Pancake trả GET …/messages
const CHE_POST = new Map();         // psid → cách Pancake trả POST …/messages
const CHE_NOTE = new Map();         // page → cách Pancake trả POST …/notes
const THE = new Map();              // page → bảng thẻ của /settings
const CONVS = new Map();            // page → danh sách hội thoại của /conversations
const PAGE_ROW = new Map();         // page_id → page.id
const nao = { kb: 0 };
let sb;
let team;
let nd;
let chan0 = 0;

const tl = (j) => ({ status: 200, json: async () => j });
const cho = (ms, j, init) => new Promise((ok, tuChoi) => {
  const t = setTimeout(() => ok(tl(j)), ms);
  init?.signal?.addEventListener("abort", () => { clearTimeout(t); tuChoi(init.signal.reason); }, { once: true });
});
const khachHoi = (psid) => ({ id: `m-${psid}-1`, from: { id: psid, name: "Khách" }, message: "how much?" });
const pageDap = (page) => ({ id: `m-${page}-2`, from: { id: page, name: "Sale" }, message: "Giá 109 SAR ạ (sale trả lời)" });
const GET = {
  ok: (psid) => tl({ messages: [khachHoi(psid)] }),
  pageCuoi: (psid, init, page) => tl({ messages: [khachHoi(psid), pageDap(page)] }),   // đọc OK, page nói cuối ⇒ nhường, KHÔNG gửi
  quaHan: (psid, init) => cho(HAN_DOC * 3, { messages: [khachHoi(psid)] }, init),
  quyen105: () => tl({ success: false, error_code: 105, message: "Bạn không có quyền với trang này" }),
  goiCuoc121: () => tl({ success: false, message: "Không tìm thấy gói cước của trang này" }),   // 121 KHÔNG mã (đo 28/09)
  thieuMa: () => tl({ success: false, message: "Thiếu mã khách hàng" }),
  khongDs: () => tl({ success: true }),
};
const POST = {
  ok: () => tl({ success: true, id: `bot-${goi.length}` }),
  quyen105: () => tl({ success: false, error_code: 105, message: "Bạn không có quyền với trang này" }),
  meta10: () => tl({ success: false, original_error: "(#10) This message is sent outside of allowed window" }),
  mang: () => { throw new TypeError("fetch failed"); },
  quaHan: (init) => cho(HAN_GUI * 3, { success: true, id: "tre" }, init),
};

before(async () => {
  if (!config.pkTags.handoff) { cauHinhCu.handoff = config.pkTags.handoff; config.pkTags.handoff = "AI back Sale"; }
  sb = await dungSandbox("gl4_w");
  console.log(`   [gl4] hộp cát ${sb.ten} · tệp đo ${fileURLToPath(new URL("../src/queue/worker.js", import.meta.url))} · cwd ${process.cwd()}`);
  team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  nd = (await sb.pool.query("INSERT INTO nguoi_dung (email, ten) VALUES ('gl4@thu.vn','GL4') RETURNING id")).rows[0].id;
  // 1) fetch GIẢ trước — rồi mới mở van. Host khác pages.fm ⇒ ném (không lọt mạng).
  globalThis.fetch = async (u, init) => {
    const url = new URL(String(u));
    if (url.host !== "pages.fm") throw new Error(`ca GL4: lượt gọi lạ ra ${url.host} — chặn`);
    const method = String(init?.method || "GET").toUpperCase();
    const page = decodeURIComponent(/\/pages\/([^/]+)/.exec(url.pathname)?.[1] || "");
    const m = /\/conversations\/conv-([^/]+)\/(messages|toggle_tag)$/.exec(url.pathname);
    const psid = m ? decodeURIComponent(m[1]) : "";
    const loai = m ? m[2] : url.pathname.split("/").pop();
    goi.push({ method, path: url.pathname, page, psid, loai, tok: url.searchParams.get("access_token") });
    if (method === "GET" && loai === "conversations") return tl({ conversations: CONVS.get(page) || [] });
    if (method === "GET" && loai === "settings") {
      return tl({ settings: { tags: THE.get(page) ?? [{ id: 9, text: config.pkTags.handoff }, { id: 3, text: "Đã gửi" }] } });
    }
    if (method === "GET" && loai === "messages") return GET[CHE_GET.get(psid) || "ok"](psid, init, page);
    if (method === "POST" && loai === "messages") return POST[CHE_POST.get(psid) || "ok"](init);
    if (method === "POST" && loai === "notes") return (CHE_NOTE.get(page) === "quyen105" ? POST.quyen105 : POST.ok)(init);
    return tl({ success: true });
  };
  // 2) kho token tất định: hai token GIẢ, không token nào khác còn sống.
  cauHinhCu.pancakeToken = config.pancakeToken;
  cauHinhCu.pancakeTokensExtra = config.pancakeTokensExtra;
  config.pancakeToken = "";
  config.pancakeTokensExtra = [];
  datKhoTokenDb(async () => ["tokA", "tokB"]);
  assert.equal(await lamMoiTokenDb(), 2);
  assert.equal(listPancakeTokens().filter((t) => !t.expired).length, 2, "đúng 2 token giả, không token thật nào");
  // 3) mở van trong phạm vi tiến trình ca.
  for (const [k, v] of Object.entries(ENV)) {
    envCu[k] = process.env[k];
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  chan0 = congHttpGhi.daChan.length;
});
after(async () => {
  for (const [k, v] of Object.entries(envCu)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  datKhoTokenDb(null);
  config.pancakeToken = cauHinhCu.pancakeToken;
  config.pancakeTokensExtra = cauHinhCu.pancakeTokensExtra;
  if ("handoff" in cauHinhCu) config.pkTags.handoff = cauHinhCu.handoff;
  await sb?.don();
});

/* ─────────────────────────── trợ lý ca ─────────────────────────── */

async function taoPage(pid, { bat = true } = {}) {
  const r = await sb.pool.query(
    "INSERT INTO page(team_id,page_id,ten,nguon_tin,bot_ai_bat) VALUES($1,$2,$3,'poll',$4) RETURNING id",
    [team, pid, `Trang ${pid}`, bat]);
  PAGE_ROW.set(pid, r.rows[0].id);
  return pid;
}
/** Chỉ đúng các page này bật bot (trần GL2 đếm toàn hệ — page của ca trước phải tắt). */
const chiBat = (...pids) => sb.pool.query("UPDATE page SET bot_ai_bat = (page_id = ANY($1::text[]))", [pids]);
let seq = 0;
async function xep(page, psid) {
  await baoDamHoiThoai(sb.pool, { teamId: team, pageRowId: PAGE_ROW.get(page), psid });
  const r = await xepTin(sb.pool, {
    teamId: team, pageId: page, psid, convId: `conv-${psid}`, custId: `cust-${psid}`, msgId: `mid-${psid}-${++seq}`, noiDung: "how much?",
  });
  return r.id;
}
const boNao = (kb = { products: [], text: "test" }, nhanh = {}) => ({
  layKb: () => { nao.kb += 1; return kb; },
  layModel: () => ({ maModel: "test" }),
  lanNhanh: () => ({ handled: true, reply: "Giá 109 SAR ạ (bot)", lane: "test", ...nhanh }),
  kiemTinRa: () => ({ ok: true }),
});
const DEPS_NAP = { doiGoXong: () => ({ ms: 0, reason: "ca GL4" }) };
const luot = (kb, nhanh) => cw.motLuot(sb.pool, { depsNap: DEPS_NAP, depsXuLy: boNao(kb, nhanh) });
const dem = (tu, { page, psid, method, loai } = {}) => goi.slice(tu).filter((g) =>
  (page == null || g.page === page) && (psid == null || g.psid === psid)
  && (method == null || g.method === method) && (loai == null || g.loai === loai)).length;
const tin = async (id) => (await sb.pool.query("SELECT trang_thai, so_lan_thu, ly_do FROM tin_cho_xu_ly WHERE id=$1", [id])).rows[0];
const toiLuot = (...ids) => sb.pool.query("UPDATE tin_cho_xu_ly SET thu_lai_luc = now() WHERE id = ANY($1::bigint[])", [ids]);
const trangPage = async (pid) => (await sb.pool.query(
  `SELECT team_id, ngat_vi, ngat_ly_do, loi_doc_lien_tiep, loi_gui_lien_tiep,
          EXTRACT(EPOCH FROM (ngat_den - now())) AS con_giay
     FROM page WHERE page_id=$1`, [pid])).rows[0];
const nhatKy = async (hanhDong, pid) => (await sb.pool.query(
  "SELECT team_id FROM nhat_ky WHERE hanh_dong=$1 AND doi_tuong='page' AND doi_tuong_id=$2", [hanhDong, pid])).rows;
const viecMo = async (psid) => (await sb.pool.query(
  `SELECT v.ly_do_day FROM viec_can_xu_ly v JOIN hoi_thoai h ON h.id = v.hoi_thoai_id
    WHERE h.psid=$1 AND v.dong_luc IS NULL`, [psid])).rows;
const lanGui = async (tinId) => (await sb.pool.query("SELECT trang_thai FROM lan_gui WHERE tin_id=$1 ORDER BY buoc", [tinId])).rows.map((x) => x.trang_thai);
const khongChan = () => assert.equal(congHttpGhi.daChan.length - chan0, 0, "cổng HTTP ghi KHÔNG được chặn lượt nào (van mở trong ca)");
const khongLoTok = (s) => assert.doesNotMatch(String(s), /tokA|tokB|access_token|https?:\/\//, `lý do lộ token/URL: ${s}`);
const coMoDun = () => assert.ok(ngat, "chưa có src/queue/ngat-page.js (GL4 ② 2)");
/** Ngắt một page bằng ĐƯỜNG THẬT: hai khách đọc quá hạn trong một lượt. */
async function ngatBangDoc(P, ...psids) {
  for (const k of psids) CHE_GET.set(k, "quaHan");
  const ids = [];
  for (const k of psids) ids.push(await xep(P, k));
  await luot();
  assert.equal((await trangPage(P)).ngat_vi, "doc", "dựng cảnh: page phải đã ngắt vì đọc");
  return ids;
}

/* ═══════════ ④1 — đọc lỗi ở 2 tin KHÁC NHAU ⇒ ngắt; trong 30′ không nạp/không rút P; qua 30′ ⇒ trả lời + mở lại 1 lần ═══════════ */

test("GL4 P1 · đọc quá hạn ở 2 tin KHÁC NHAU ⇒ ngắt 'doc' ≈30′ + 1 nhật ký; vòng sau 0 fetch cho P (nạp lẫn rút), Q được fetch, tin vẫn cho; qua 30′ + lành ⇒ A, B được trả lời, page_mo_lai_kenh 1 dòng", async () => {
  const P = await taoPage("gl4-p1"); const Q = await taoPage("gl4-q1"); await chiBat(P, Q);
  const A = "p1-a"; const B = "p1-b"; const C = "q1-c";
  CHE_GET.set(A, "quaHan"); CHE_GET.set(B, "quaHan");
  const tA = await xep(P, A); const tB = await xep(P, B); const tC = await xep(Q, C);
  const g0 = goi.length;
  const k1 = await luot();
  // vế ĐÃ CHẠM
  assert.equal(k1.nap.mo, true, "bộ nạp phải MỞ");
  assert.ok(dem(g0, { psid: A, method: "GET", loai: "messages" }) >= 1 && dem(g0, { psid: B, method: "GET", loai: "messages" }) >= 1);
  assert.match((await tin(tA)).ly_do, /^LoiDocLichSu/); assert.match((await tin(tB)).ly_do, /^LoiDocLichSu/);
  const p = await trangPage(P);
  console.log(`   [gl4] P1 ngắt: vi=${p.ngat_vi} · còn ${Math.round(p.con_giay)} s · lý do «${p.ngat_ly_do}»`);
  assert.equal(p.ngat_vi, "doc");
  assert.ok(p.con_giay > 29 * 60 && p.con_giay <= 30 * 60 + 5, `ngat_den phải ≈ now()+30′ (đồng hồ CSDL), đo ${p.con_giay} s`);
  assert.match(p.ngat_ly_do, /quá hạn/); assert.match(p.ngat_ly_do, /\(đọc\)/); khongLoTok(p.ngat_ly_do);
  const nk = await nhatKy("page_ngat_kenh", P);
  assert.equal(nk.length, 1, "đúng 1 dòng nhat_ky page_ngat_kenh");
  assert.equal(String(nk[0].team_id), String(p.team_id), "nhật ký ghi ĐÚNG team của page");
  assert.equal((await tin(tC)).trang_thai, "xong", "page Q cùng vòng chạy bình thường");
  // ── vòng sau, trong 30′ ──
  await toiLuot(tA, tB);
  const g1 = goi.length;
  const k2 = await luot();
  assert.equal(k2.nap.mo, true);
  assert.equal(dem(g1, { page: P }), 0, `0 lượt fetch cho P (cả nạp lẫn rút) — đo ${JSON.stringify(goi.slice(g1).filter((g) => g.page === P))}`);
  assert.ok(dem(g1, { page: Q }) >= 1, "page Q cùng vòng ĐƯỢC fetch (vòng có chạy)");
  for (const id of [tA, tB]) {
    const t = await tin(id);
    assert.equal(t.trang_thai, "cho", "tin của page ngắt giữ ở chờ");
    assert.equal(Number(t.so_lan_thu), 1, "không bị rút thêm lượt nào");
  }
  // ── qua 30′ (đồng hồ CSDL) + Pancake lành ──
  await sb.pool.query("UPDATE page SET ngat_den = now() - interval '1 second' WHERE page_id=$1", [P]);
  CHE_GET.set(A, "ok"); CHE_GET.set(B, "ok"); await toiLuot(tA, tB);
  const g2 = goi.length;
  await luot();
  for (const [id, k] of [[tA, A], [tB, B]]) {
    assert.equal((await tin(id)).trang_thai, "xong", `khách ${k} phải được trả lời sau khi mở`);
    assert.equal(dem(g2, { psid: k, method: "POST", loai: "messages" }), 1, `đúng 1 lượt gửi cho ${k}`);
  }
  assert.equal((await nhatKy("page_mo_lai_kenh", P)).length, 1, "đúng 1 dòng page_mo_lai_kenh");
  assert.equal((await trangPage(P)).ngat_ly_do, "", "đã mở lại");
  khongChan();
});

test("GL4 P1b · 4 tin tồn của P, tin 1 và 2 đọc lỗi (khác khách) trong CÙNG một lượt chayToiKhiHet ⇒ tin 3, 4 vẫn cho, so_lan_thu 0, 0 fetch, 0 lượt bộ não", async () => {
  const P = await taoPage("gl4-p1b"); await chiBat(P);
  const ks = ["p1b-k1", "p1b-k2", "p1b-k3", "p1b-k4"];
  CHE_GET.set(ks[0], "quaHan"); CHE_GET.set(ks[1], "quyen105");
  const ids = [];
  for (const k of ks) ids.push(await xep(P, k));
  const g0 = goi.length; const n0 = nao.kb;
  const k = await luot();   // MỘT motLuot = MỘT chayToiKhiHet (toiDa 50, pageIds của vòng)
  assert.equal(k.nap.mo, true);
  assert.ok(dem(g0, { psid: ks[0], loai: "messages" }) >= 1 && dem(g0, { psid: ks[1], loai: "messages" }) >= 1, "tin 1, 2 đã chạm Pancake");
  assert.equal((await trangPage(P)).ngat_vi, "doc", "tin 2 làm ngắt");
  console.log(`   [gl4] P1b một lượt: vòng=${k.xu?.vong} · ${JSON.stringify(k.xu)}`);
  for (const i of [2, 3]) {
    const t = await tin(ids[i]);
    assert.equal(t.trang_thai, "cho", `tin ${i + 1} phải còn ở chờ`);
    assert.equal(Number(t.so_lan_thu), 0, `tin ${i + 1} không bị rút (so_lan_thu 0)`);
    assert.equal(dem(g0, { psid: ks[i] }), 0, `0 lượt fetch cho tin ${i + 1}`);
  }
  assert.equal(nao.kb - n0, 0, "0 lượt bộ não");
  assert.equal(k.xu?.vong, 2, "chỉ 2 lượt rút trong lượt đó");
  khongChan();
});

test("GL4 P1c · CÙNG một tin đọc lỗi lượt 1 rồi lượt 2 ⇒ KHÔNG ngắt (đếm theo tin); lượt 3 ⇒ giao sale CÓ việc (GL3b)", async () => {
  const P = await taoPage("gl4-p1c"); await chiBat(P);
  const K = "p1c-k"; CHE_GET.set(K, "quaHan");
  const id = await xep(P, K);
  for (const lan of [1, 2]) {
    const g0 = goi.length;
    const k = await luot();
    assert.equal(k.nap.mo, true);
    assert.ok(dem(g0, { psid: K, method: "GET", loai: "messages" }) >= 1, `lượt ${lan} đã chạm Pancake`);
    const t = await tin(id);
    assert.equal(t.trang_thai, "cho"); assert.equal(Number(t.so_lan_thu), lan); assert.match(t.ly_do, /^LoiDocLichSu/);
    const p = await trangPage(P);
    assert.equal(p.ngat_ly_do, "", `lượt ${lan}: hai lượt thử của CÙNG tin là MỘT lỗi — không ngắt`);
    assert.equal(p.loi_doc_lien_tiep, 1, `lượt ${lan}: bộ đếm đọc = 1`);
    await toiLuot(id);
  }
  await luot();
  const t = await tin(id);
  assert.equal(t.trang_thai, "xong"); assert.match(t.ly_do, /doc_loi:ban_giao/);
  const v = await viecMo(K);
  assert.equal(v.length, 1, "giao sale CÓ dòng việc"); assert.match(v[0].ly_do_day, /Pancake không trả lịch sử/);
  assert.equal((await trangPage(P)).ngat_ly_do, "", "vẫn không ngắt");
  khongChan();
});

/* ═══════════ ④2 — đọc OK THẬT + gửi hỏng ở 2 hội thoại ⇒ ngắt 'gui' ═══════════ */

for (const [ma, che, mau] of [
  ["P2q", "quyen105", /Pancake từ chối gửi \(mã 105\)/],
  ["P2m", "meta10", /\(#10\)/],
  ["P2n", "mang", /mạng/],
  ["P2h", "quaHan", new RegExp(`quá hạn ${HAN_GUI} ms chờ Pancake \\(gửi\\)`)],
]) {
  test(`GL4 ${ma} · đọc OK THẬT + gửi hỏng (${che}) ở 2 hội thoại ⇒ ngắt 'gui', lý do có nguyên nhân; lan_gui khong_ro, KHÔNG gửi lại; mỗi hội thoại ĐÚNG 1 việc`, async () => {
    const P = await taoPage(`gl4-${ma.toLowerCase()}`); await chiBat(P);
    const ks = [`${ma}-g1`, `${ma}-g2`];
    for (const k of ks) CHE_POST.set(k, che);
    const ids = [];
    for (const k of ks) ids.push(await xep(P, k));
    const g0 = goi.length;
    const k1 = await luot();
    assert.equal(k1.nap.mo, true);
    const postMoi = {};
    for (const [i, k] of ks.entries()) {
      assert.ok(dem(g0, { psid: k, method: "GET", loai: "messages" }) >= 1, `${k}: phải ĐỌC thật trước khi gửi`);
      postMoi[k] = dem(g0, { psid: k, method: "POST", loai: "messages" });
      assert.ok(postMoi[k] >= 1, `${k}: phải đã gọi POST`);
      const t = await tin(ids[i]);
      assert.equal(t.trang_thai, "loi"); assert.match(t.ly_do, /^LoiGuiChuaXacNhan/);
      const lg = await lanGui(ids[i]);
      assert.ok(lg.length >= 1 && lg.every((x) => x === "khong_ro"), `${k}: lan_gui phải khong_ro, đo ${JSON.stringify(lg)}`);
      const v = await viecMo(k);
      assert.equal(v.length, 1, `${k}: đúng 1 dòng việc`); assert.match(v[0].ly_do_day, /^Gửi không rõ đã tới khách/);
    }
    const p = await trangPage(P);
    console.log(`   [gl4] ${ma} ngắt: vi=${p.ngat_vi} · lý do «${p.ngat_ly_do}» · POST/khách ${JSON.stringify(postMoi)}`);
    assert.equal(p.ngat_vi, "gui"); assert.match(p.ngat_ly_do, mau); khongLoTok(p.ngat_ly_do);
    assert.ok(p.con_giay > 29 * 60, "ngắt ≈ 30′");
    // KHÔNG gửi lại: một vòng nữa (kể cả qua 30′) không thêm POST nào cho hai khách.
    await sb.pool.query("UPDATE page SET ngat_den = now() - interval '1 second' WHERE page_id=$1", [P]);
    const g1 = goi.length;
    await luot();
    for (const k of ks) assert.equal(dem(g1, { psid: k, method: "POST" }), 0, `${k}: không gửi lại`);
    khongChan();
  });
}

test("GL4 P2v · đang ngắt vì GỬI: bộ nạp VẪN chạy (tin mới vào cho, đọc lịch sử OK), KHÔNG rút, 0 POST", async () => {
  const P = await taoPage("gl4-p2v"); await chiBat(P);
  for (const k of ["p2v-g1", "p2v-g2"]) { CHE_POST.set(k, "quyen105"); await xep(P, k); }
  await luot();
  assert.equal((await trangPage(P)).ngat_vi, "gui", "dựng cảnh: ngắt vì gửi");
  const G3 = "p2v-g3";
  CONVS.set(P, [{
    id: `conv-${G3}`, from_psid: G3, customers: [{ id: `cust-${G3}` }], last_sent_by: { id: G3, name: "Khách" },
    last_customer_interactive_at: "2026-10-07T01:00:00", updated_at: "2026-10-07T01:00:00", snippet: "how much?", tags: [],
  }]);
  const g0 = goi.length;
  const k = await luot();
  assert.equal(k.nap.mo, true);
  assert.ok(dem(g0, { page: P, loai: "conversations" }) >= 1, "bộ nạp PHẢI đọc danh sách hội thoại của P");
  assert.ok(dem(g0, { psid: G3, method: "GET", loai: "messages" }) >= 1, "bộ nạp đọc lịch sử khách mới");
  const r = (await sb.pool.query("SELECT id, trang_thai, so_lan_thu FROM tin_cho_xu_ly WHERE psid=$1", [G3])).rows;
  assert.equal(r.length, 1, `tin mới phải VÀO hàng (nap.them=${k.nap.them})`);
  assert.equal(r[0].trang_thai, "cho"); assert.equal(Number(r[0].so_lan_thu), 0, "không rút");
  assert.equal(dem(g0, { psid: G3, method: "POST" }), 0, "0 POST");
  khongChan();
});

/* ═══════════ ④2c · ④2d — KHÔNG đếm: rút lại sau crash · thiếu thẻ · ghi chú ═══════════ */

test("GL4 P2c · rút lại sau crash (LoiCanDoiChieuGui trần, 0 lượt Pancake) ×2 ⇒ KHÔNG ngắt", async () => {
  const P = await taoPage("gl4-p2c"); await chiBat(P);
  const ks = ["p2c-c1", "p2c-c2"]; const ids = [];
  for (const k of ks) {
    const id = await xep(P, k); ids.push(id);
    await sb.pool.query("INSERT INTO lan_gui(team_id,tin_id,buoc,loai,noi_dung,trang_thai) VALUES($1,$2,1,'guiTin','\"x\"','dang_gui')", [team, id]);
  }
  const g0 = goi.length;
  const k = await luot();
  assert.equal(k.nap.mo, true);
  assert.ok(dem(g0, { page: P, loai: "conversations" }) >= 1, "vòng có chạy cho P");
  for (const [i, kh] of ks.entries()) {
    assert.match((await tin(ids[i])).ly_do, /^LoiCanDoiChieuGui/, "đã chạm: worker rút và ném đúng lỗi rút-lại");
    assert.equal(dem(g0, { psid: kh }), 0, "0 lượt gọi Pancake cho tin rút lại");
  }
  const p = await trangPage(P);
  assert.equal(p.ngat_ly_do, ""); assert.equal(p.loi_gui_lien_tiep, 0);
  khongChan();
});

test("GL4 P2d · thiếu thẻ «AI back Sale» lúc bàn giao ×2 (0 POST) ⇒ KHÔNG ngắt", async () => {
  const P = await taoPage("gl4-p2d"); await chiBat(P);
  THE.set(P, [{ id: 3, text: "Đã gửi" }]);
  const ks = ["p2d-d1", "p2d-d2"]; const ids = [];
  for (const k of ks) ids.push(await xep(P, k));
  const g0 = goi.length;
  const k = await luot({ noData: true });   // page chưa có KB ⇒ handler bàn giao (thẻ + ghi chú)
  assert.equal(k.nap.mo, true);
  assert.ok(dem(g0, { page: P, method: "GET", loai: "settings" }) >= 1, "đã chạm: đọc bảng thẻ");
  for (const id of ids) assert.match((await tin(id)).ly_do, /^LoiGuiChuaXacNhan/);
  assert.equal(dem(g0, { page: P, method: "POST" }), 0, "0 POST");
  const p = await trangPage(P);
  assert.equal(p.ngat_ly_do, ""); assert.equal(p.loi_gui_lien_tiep, 0);
  for (const k of ks) {
    assert.equal((await viecMo(k)).filter((v) => /^Gửi không rõ/.test(v.ly_do_day)).length, 0,
      `${k}: chỉ thẻ bàn giao hỏng, tin khách không gửi dở ⇒ KHÔNG việc «Gửi không rõ…»`);
  }
  khongChan();
});

test("GL4 P2e · ghi chú bàn giao (ghiNote) bị Pancake từ chối ×2 ⇒ KHÔNG đếm", async () => {
  const P = await taoPage("gl4-p2e"); await chiBat(P);
  CHE_NOTE.set(P, "quyen105");
  const ks = ["p2e-e1", "p2e-e2"]; const ids = [];
  for (const k of ks) ids.push(await xep(P, k));
  const g0 = goi.length;
  await luot({ noData: true });
  assert.ok(dem(g0, { page: P, method: "POST", loai: "notes" }) >= 2, "đã chạm: POST ghi chú cho cả hai khách");
  for (const id of ids) assert.match((await tin(id)).ly_do, /^LoiGuiChuaXacNhan/);
  const p = await trangPage(P);
  assert.equal(p.ngat_ly_do, ""); assert.equal(p.loi_gui_lien_tiep, 0);
  khongChan();
});

test("GL4 P2k · luật dấu kênh của bocCuaGuiBen: ĐẾM khi tin/ảnh ĐÃ gọi Pancake mà hỏng; KHÔNG khi cửa tự ném · không HTTP · cổng chặn · ghi chú/thẻ · lỗi sổ sau gửi OK · đụng UNIQUE", async () => {
  const poolGia = (insertRow = true, updateNem = false) => ({
    query: async (sql) => {
      if (/^\s*INSERT/.test(sql)) return insertRow ? { rowCount: 1, rows: [{ id: 1 }] } : { rowCount: 0, rows: [] };
      if (updateNem && /da_gui/.test(sql)) throw new Error("mất kết nối CSDL");
      return { rowCount: 1, rows: [] };
    },
  });
  const tinGia = { team_id: 1, id: 1, page_id: "x", conv_id: null };
  async function dau(loai, cua, pool = poolGia()) {
    const c = bocCuaGuiBen(pool, tinGia, { [loai]: cua }, { env: {} });
    try { await c[loai](null, null, {}); return "khong-nem"; } catch (e) {
      assert.equal(e.name, "LoiCanDoiChieuGui"); return e;
    }
  }
  const loiQuyen = { ok: false, error: '{"success":false,"error_code":105}', daGoi: true, ma: [105] };
  const e1 = await dau("guiTin", async () => loiQuyen);
  assert.equal(e1.kenh, true, "guiTin · Pancake từ chối (mã 105) ⇒ ĐẾM"); assert.deepEqual(e1.chiTiet?.ma, [105]); assert.equal(e1.loai, "guiTin");
  const e2 = await dau("guiAnh", async () => ({ ok: false, error: "quá hạn", khongRo: true, quaHan: true, daGoi: true, ma: [-1] }));
  assert.equal(e2.kenh, true, "guiAnh · quá hạn ⇒ ĐẾM");
  assert.notEqual((await dau("guiAnh", async () => ({ ok: false, error: "thiếu url ảnh" }))).kenh, true, "không HTTP ⇒ KHÔNG");
  assert.notEqual((await dau("guiTin", async () => ({ ok: false, error: "{}" }))).kenh, true, "hết token (thân rỗng, chưa gọi) ⇒ KHÔNG");
  assert.notEqual((await dau("guiTin", async () => ({ ok: false, biChan: true, phaLoi: "ket_noi" }))).kenh, true, "cổng ghi chặn ⇒ KHÔNG");
  const nemCua = async () => { const e = new Error("psid không khớp"); e.name = "LoiHoiThoaiKhongThuocPage"; throw e; };
  assert.notEqual((await dau("guiTin", nemCua)).kenh, true, "cửa tự ném ⇒ KHÔNG");
  assert.notEqual((await dau("ghiNote", async () => loiQuyen)).kenh, true, "ghiNote ⇒ KHÔNG");
  assert.notEqual((await dau("gatThe", async () => loiQuyen)).kenh, true, "gatThe ⇒ KHÔNG");
  const sauOk = await dau("guiTin", async () => ({ ok: true, id: "x" }), poolGia(true, true));
  assert.equal(sauOk.kenh, undefined, "lỗi ghi sổ SAU gửi OK ⇒ KHÔNG gắn dấu nào"); assert.equal(sauOk.chiTiet, undefined);
  const unique = await dau("guiTin", async () => loiQuyen, poolGia(false));
  assert.equal(unique.kenh, undefined, "đụng UNIQUE (chưa gọi cửa) ⇒ KHÔNG gắn dấu nào");
});

/* ═══════════ ④3 — chuỗi «liên tiếp» ═══════════ */

test("GL4 P3a · gửi lỗi → gửi OK → gửi lỗi ⇒ KHÔNG ngắt (gửi OK xoá chuỗi)", async () => {
  const P = await taoPage("gl4-p3a"); await chiBat(P);
  const [s1, s2, s3] = ["p3a-s1", "p3a-s2", "p3a-s3"];
  CHE_POST.set(s1, "quyen105"); CHE_POST.set(s3, "quyen105");
  const ids = [await xep(P, s1), await xep(P, s2), await xep(P, s3)];
  const g0 = goi.length;
  await luot();
  assert.ok(dem(g0, { psid: s1, method: "POST" }) >= 1 && dem(g0, { psid: s3, method: "POST" }) >= 1, "đã chạm: hai lượt gửi hỏng");
  assert.deepEqual([(await tin(ids[0])).trang_thai, (await tin(ids[1])).trang_thai, (await tin(ids[2])).trang_thai], ["loi", "xong", "loi"]);
  const p = await trangPage(P);
  assert.equal(p.ngat_ly_do, ""); assert.equal(p.loi_gui_lien_tiep, 1, "chuỗi gửi đếm lại từ 1 sau gửi OK");
  khongChan();
});

test("GL4 P3b · đọc lỗi → đọc OK (nhường, không gửi) → đọc lỗi ⇒ KHÔNG ngắt (đọc OK xoá chuỗi đọc)", async () => {
  const P = await taoPage("gl4-p3b"); await chiBat(P);
  const [r1, r2, r3] = ["p3b-r1", "p3b-r2", "p3b-r3"];
  CHE_GET.set(r1, "quaHan"); CHE_GET.set(r2, "pageCuoi"); CHE_GET.set(r3, "quaHan");
  const ids = [await xep(P, r1), await xep(P, r2), await xep(P, r3)];
  const g0 = goi.length;
  await luot();
  assert.ok(dem(g0, { psid: r1, loai: "messages" }) >= 1 && dem(g0, { psid: r3, loai: "messages" }) >= 1, "đã chạm");
  assert.match((await tin(ids[0])).ly_do, /^LoiDocLichSu/); assert.match((await tin(ids[2])).ly_do, /^LoiDocLichSu/);
  assert.equal((await tin(ids[1])).trang_thai, "xong", "tin giữa đọc OK (nhường)");
  assert.equal(dem(g0, { psid: r2, method: "POST" }), 0, "tin giữa KHÔNG gửi");
  const p = await trangPage(P);
  assert.equal(p.ngat_ly_do, ""); assert.equal(p.loi_doc_lien_tiep, 1);
  khongChan();
});

test("GL4 P3c · gửi lỗi → ĐỌC OK (nhường, không gửi) → gửi lỗi (khác tin) ⇒ NGẮT 'gui' (đọc OK không xoá chuỗi gửi; lượt KHÔNG gửi không xoá)", async () => {
  const P = await taoPage("gl4-p3c"); await chiBat(P);
  const [x1, x2, x3] = ["p3c-x1", "p3c-x2", "p3c-x3"];
  CHE_POST.set(x1, "quyen105"); CHE_GET.set(x2, "pageCuoi"); CHE_POST.set(x3, "quyen105");
  const ids = [await xep(P, x1), await xep(P, x2), await xep(P, x3)];
  await luot();
  assert.equal((await tin(ids[1])).trang_thai, "xong");
  const p = await trangPage(P);
  assert.equal(p.ngat_vi, "gui", `phải NGẮT vì gửi, đo ${JSON.stringify(p)}`);
  khongChan();
});

test("GL4 P3d · gửi lỗi → lượt GỬI ĐƯỢC ảnh rồi hỏng ở bước sau (ảnh không url, không HTTP) → gửi lỗi ⇒ KHÔNG ngắt (gửi được là kênh chạy)", async () => {
  const P = await taoPage("gl4-p3d"); await chiBat(P);
  const [s1, s2, s3] = ["p3d-s1", "p3d-s2", "p3d-s3"];
  CHE_POST.set(s1, "quyen105"); CHE_POST.set(s3, "quyen105");
  const ids = [await xep(P, s1), await xep(P, s2), await xep(P, s3)];
  const g0 = goi.length;
  // Lớp nhanh trả 2 ảnh: ảnh 1 có url (POST thật), ảnh 2 url rỗng (`pkSendImage` «thiếu url ảnh», 0 HTTP) ⇒ lượt s2 hỏng SAU khi đã gửi.
  await luot(undefined, { images: [{ url: "https://anh.vd/a.jpg", label: "ảnh" }, { url: "", label: "ảnh hỏng" }] });
  assert.ok(dem(g0, { psid: s1, method: "POST" }) >= 1 && dem(g0, { psid: s3, method: "POST" }) >= 1, "đã chạm: s1, s3 gửi hỏng");
  assert.equal(dem(g0, { psid: s2, method: "POST" }), 1, "s2: đúng 1 POST (ảnh 1) — ảnh 2 không HTTP");
  for (const id of ids) assert.match((await tin(id)).ly_do, /^LoiGuiChuaXacNhan/);
  const p = await trangPage(P);
  assert.equal(p.ngat_ly_do, "", `ảnh gửi được ở s2 phải xoá chuỗi gửi, đo ${JSON.stringify(p)}`);
  assert.equal(p.loi_gui_lien_tiep, 1);
  khongChan();
});

/* ═══════════ ④4 — phân loại lỗi đọc theo CẤU TRÚC ═══════════ */

for (const [ma, che, ngatChua] of [
  ["P4a", "thieuMa", false],
  ["P4b", "quyen105", true],
  ["P4c", "goiCuoc121", true],
  ["P4d", "khongDs", false],
]) {
  test(`GL4 ${ma} · đọc «${che}» ×2 khách ⇒ ${ngatChua ? "NGẮT (lỗi cấp kênh)" : "KHÔNG ngắt (lỗi của một hội thoại)"}`, async () => {
    const P = await taoPage(`gl4-${ma.toLowerCase()}`); await chiBat(P);
    const ks = [`${ma}-r1`, `${ma}-r2`]; const ids = [];
    for (const k of ks) { CHE_GET.set(k, che); ids.push(await xep(P, k)); }
    const g0 = goi.length;
    const kq = await luot();
    assert.equal(kq.nap.mo, true);
    for (const [i, k] of ks.entries()) {
      assert.ok(dem(g0, { psid: k, method: "GET", loai: "messages" }) >= 1, `${k}: đã chạm Pancake`);
      assert.match((await tin(ids[i])).ly_do, /^LoiDocLichSu/, `${k}: lỗi đọc`);
    }
    const p = await trangPage(P);
    console.log(`   [gl4] ${ma} ${che}: vi=«${p.ngat_vi}» · lý do «${p.ngat_ly_do}» · đếm đọc ${p.loi_doc_lien_tiep}`);
    if (ngatChua) { assert.equal(p.ngat_vi, "doc"); khongLoTok(p.ngat_ly_do); } else {
      assert.equal(p.ngat_ly_do, ""); assert.equal(p.loi_doc_lien_tiep, 0, "lỗi dữ liệu KHÔNG đếm");
    }
    khongChan();
  });
}

/* ═══════════ ④5 — GL2: page ngắt vẫn đếm vào trần ═══════════ */

test("GL4 P5 · GL2: P đang ngắt vẫn đếm vào trần — trần 1 ⇒ bật page thứ hai 409; trần 2 ⇒ Q bật được và chạy bình thường, tin P vẫn cho", async () => {
  const P = await taoPage("gl4-p5"); await chiBat(P);
  const [tP] = await ngatBangDoc(P, "p5-a", "p5-b");
  const Q = await taoPage("gl4-q5", { bat: false });
  const sp = (await sb.pool.query("INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,'gl4-q5','SP') RETURNING id", [team, PAGE_ROW.get(Q)])).rows[0].id;
  await sb.pool.query("INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,1,19900,'AED')", [team, sp]);
  const envSet = (tran) => ({ V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "0", V3_RAP_PROMPT_BAT: "1", ANTHROPIC_API_KEY: "fake-only", V3_TRAN_PAGE_BAT: tran });
  const bc = { teamId: String(team), nguoiDungId: String(nd) };
  const e = await setPage(sb.pool, bc, PAGE_ROW.get(Q), { enabled: true }, envSet("1")).then(() => null, (x) => x);
  assert.ok(e, "trần 1, P (đang ngắt) bật ⇒ bật Q phải bị chặn");
  assert.equal(e.status, 409, `mã chặn phải 409, đo ${e.status} · ${e.message}`);
  await setPage(sb.pool, bc, PAGE_ROW.get(Q), { enabled: true }, envSet("2"));
  const tQ = await xep(Q, "q5-c");
  const cu = process.env.V3_TRAN_PAGE_BAT; process.env.V3_TRAN_PAGE_BAT = "2";
  try {
    const k = await luot();
    assert.equal(k.nap.choPhep, 2, "trần 2 ⇒ 2 page được phép (P đang ngắt vẫn tính là bật)");
  } finally { process.env.V3_TRAN_PAGE_BAT = cu; }
  assert.equal((await tin(tQ)).trang_thai, "xong", "Q chạy bình thường");
  assert.equal((await tin(tP)).trang_thai, "cho", "tin của P vẫn giữ ở chờ");
  khongChan();
});

/* ═══════════ ④8 — mở lại ĐÚNG một lần; sau mở phải đủ 2 lỗi mới ngắt lại ═══════════ */

test("GL4 P8 · đang ngắt KHÔNG đếm thêm; 4 vòng cùng thấy hết hạn ⇒ đúng 1 page_mo_lai_kenh; sau mở 1 lỗi ⇒ chưa ngắt; lỗi thứ 2 (tin khác) ⇒ ngắt lại", async () => {
  coMoDun();
  const P = await taoPage("gl4-p8"); await chiBat(P);
  const idsCu = await ngatBangDoc(P, "p8-a", "p8-b");
  await sb.pool.query("UPDATE tin_cho_xu_ly SET thu_lai_luc = now() + interval '1 hour' WHERE id = ANY($1::bigint[])", [idsCu]);
  // tin ĐANG BAY lúc ngắt (vòng xử khác đã cầm pageIds trước khi ngắt) báo lỗi ⇒ KHÔNG đếm (R2-N3)
  await ngat.ghiLoiKenh(sb.pool, { teamId: team, pageId: P, tinId: "999001", kieu: "doc", lyDo: "ca: tin đang bay" });
  await ngat.ghiLoiKenh(sb.pool, { teamId: team, pageId: P, tinId: "999002", kieu: "gui", lyDo: "ca: tin đang bay" });
  const p0 = await trangPage(P);
  assert.equal(p0.loi_doc_lien_tiep + p0.loi_gui_lien_tiep, 0, "đang ngắt thì không đếm");
  assert.equal((await nhatKy("page_ngat_kenh", P)).length, 1, "không ngắt chồng");
  // ── 4 vòng (1 nạp + 3 xử) cùng thấy hết hạn ──
  await sb.pool.query("UPDATE page SET ngat_den = now() - interval '1 second' WHERE page_id=$1", [P]);
  await Promise.all([
    cw.motLuot(sb.pool, { boQuaXu: true, depsNap: DEPS_NAP }),
    cw.motLuot(sb.pool, { boQuaNap: true, depsXuLy: boNao() }),
    cw.motLuot(sb.pool, { boQuaNap: true, depsXuLy: boNao() }),
    cw.motLuot(sb.pool, { boQuaNap: true, depsXuLy: boNao() }),
  ]);
  assert.equal((await nhatKy("page_mo_lai_kenh", P)).length, 1, "đúng 1 dòng page_mo_lai_kenh");
  assert.equal((await trangPage(P)).ngat_ly_do, "");
  // ── sau mở: 1 lỗi ⇒ chưa ngắt ──
  CHE_GET.set("p8-c", "quaHan"); await xep(P, "p8-c");
  const g0 = goi.length;
  await luot();
  assert.ok(dem(g0, { psid: "p8-c", loai: "messages" }) >= 1, "đã chạm");
  const p1 = await trangPage(P);
  assert.equal(p1.ngat_ly_do, "", "1 lỗi sau khi mở KHÔNG ngắt lại"); assert.equal(p1.loi_doc_lien_tiep, 1);
  // ── lỗi thứ 2 (tin khác) ⇒ ngắt lại ──
  CHE_GET.set("p8-d", "quaHan"); await xep(P, "p8-d");
  await luot();
  assert.equal((await trangPage(P)).ngat_vi, "doc", "đủ 2 lỗi (tin khác nhau) ⇒ ngắt lại");
  assert.equal((await nhatKy("page_ngat_kenh", P)).length, 2);
  // ── câu mở lại TỰ NÓ đúng một lần: bốn lượt mở CÙNG lúc (mỗi lượt đều đã quyết mở — không phụ thuộc lát đọc trước đó) ⇒ +1 dòng ──
  await sb.pool.query("UPDATE page SET ngat_den = now() - interval '1 second' WHERE page_id=$1", [P]);
  const mo = await Promise.all([1, 2, 3, 4].map(() => ngat.moLaiPageHetHan(sb.pool)));
  assert.equal(mo.filter((x) => x.includes(P)).length, 1, "đúng MỘT lượt mở trả về page");
  assert.equal((await nhatKy("page_mo_lai_kenh", P)).length, 2, "lần ngắt thứ hai cũng chỉ một dòng mở lại");
  khongChan();
});

/* ═══════════ R2-N2 — bộ nhớ chung không bị lượt làm mới cũ ghi đè ═══════════ */

test("GL4 R · lượt làm mới đọc CSDL chưa thấy ngắt KHÔNG xoá ngắt còn hạn trong bộ nhớ; chỉ bỏ khi hết hạn theo đồng hồ CSDL", async () => {
  coMoDun();
  const P = await taoPage("gl4-r"); await chiBat(P);
  await ngatBangDoc(P, "r-a", "r-b");
  assert.deepEqual(ngat.locPageNgat([P, "khac"]), ["khac"], "bộ nhớ có P ngay sau khi ngắt");
  // (1) lát đọc CŨ (CSDL «chưa thấy» ngắt) trong khi ngắt trong bộ nhớ còn hạn ⇒ KHÔNG được xoá
  await sb.pool.query("UPDATE page SET ngat_ly_do = '' WHERE page_id=$1", [P]);
  await ngat.dsPageDangNgat(sb.pool);
  assert.deepEqual(ngat.locPageNgat([P]), [], "lượt làm mới KHÔNG được xoá ngắt còn hạn");
  // (2) lượt làm mới thấy lại P với hạn ~1 s (đồng hồ CSDL); tiến trình KHÁC mở P (không trả dòng cho tiến trình này) ⇒ hết hạn
  //     theo đồng hồ CSDL thì lượt làm mới kế tiếp bỏ P
  await sb.pool.query("UPDATE page SET ngat_ly_do = 'ca R', ngat_den = now() + interval '1 second' WHERE page_id=$1", [P]);
  await ngat.dsPageDangNgat(sb.pool);
  assert.deepEqual(ngat.locPageNgat([P]), [], "còn hạn ⇒ vẫn lọc");
  await sb.pool.query("UPDATE page SET ngat_ly_do = '' WHERE page_id=$1", [P]);
  await new Promise((ok) => setTimeout(ok, 1200));
  await ngat.dsPageDangNgat(sb.pool);
  assert.deepEqual(ngat.locPageNgat([P]), [P], "hết hạn theo đồng hồ CSDL ⇒ bỏ khỏi bộ nhớ");
  // (3) lượt mở lại của CHÍNH tiến trình trả dòng ⇒ bỏ ngay
  const Q = await taoPage("gl4-r2"); await chiBat(Q);
  await ngatBangDoc(Q, "r2-a", "r2-b");
  await sb.pool.query("UPDATE page SET ngat_den = now() - interval '1 second' WHERE page_id=$1", [Q]);
  assert.deepEqual(await ngat.moLaiPageHetHan(sb.pool), [Q]);
  assert.deepEqual(ngat.locPageNgat([Q]), [Q], "mở lại ⇒ bỏ khỏi bộ nhớ");
});
