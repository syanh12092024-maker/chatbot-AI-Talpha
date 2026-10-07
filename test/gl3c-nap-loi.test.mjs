// PHIẾU GL3c ④1–④4 — Pancake lỗi KÉO DÀI không được thành «bot câm im lặng»:
//   · danh sách hội thoại lỗi LIÊN TỤC ≥ T_NGAT_DS (2′ — người quyết 07/10) ⇒ ngắt page `doc` (GL4); chập ngắn hơn chỉ in log;
//   · bộ nạp đọc lịch sử gặp lỗi KÊNH ⇒ đếm vào ngắt GL4 theo HỘI THOẠI (khoá `-hoi_thoai.id` — CÙNG khoá ở worker, R2-N2);
//   · hội thoại lỗi DỮ LIỆU bền ⇒ lượt lỗi thứ 3 (LUOT_LOI_GIAO_SALE) giao sale CÓ việc, đếm gộp qua quãng page bị ngắt.
//
// Đường đi THẬT (④ ⚠️): `chay-worker#motLuot` / `nap#napTuPoll` → cửa `docHoiThoai` / `docTin` THẬT → `pancake.js`
// (pkGetConversations · pkTagId · pkDocTin) → `pkFetchPage` → fetch GIẢ; worker: `worker#chayMotVong` THẬT → cửa `docTin` THẬT.
// CẤM tiêm `docHoiThoai` / `docTin` / `cua` / `docLichSu:false`; KHÔNG tiêm `dsChoPhep` (đi `trangThaiTran` thật, trần trong env ca).
// Tiêm ĐÚNG những gì mã vốn mở cửa tiêm: đồng hồ của bộ nạp (`dongHo`) + độ chờ-gõ-xong (= 0) + bộ não giả (cho tin đọc OK).
// CHẠY XEN (④): gọi `chayMotVong` và `napTuPoll` đan nhau như prod (1 vòng nạp + 3 vòng xử), không chỉ `motLuot` tuần tự.
//
// ⚠️ `.env` máy dev có `PANCAKE_READONLY=1` ⇒ van nguồn đóng ⇒ `napTuPoll` trả `{mo:false}` ⇒ mọi phép phủ định xanh giả. Van mở trong
// PHẠM VI TIẾN TRÌNH CA (process.env, KHÔNG sửa `.env`) SAU khi đã cài fetch giả; 2 token GIẢ. Mỗi lần gọi `napTuPoll` trực tiếp khẳng
// định `r.mo === true`; mỗi phép phủ định kèm vế «ĐÃ CHẠM» (đếm GET đúng page / đúng hội thoại). «Qua 30′» = `UPDATE page SET ngat_den =
// now() - 1 s` (đồng hồ CSDL) rồi `motLuot` THẬT mở lại (`lamMoiNgat` → `moLaiPageHetHan`) — cấm tiêm đồng hồ JS cho ngắt.
// Hằng của phiếu viết TAY ở đây (2′ · 3 lượt) — không lấy đáp án từ chính mã bị đo.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { dungSandbox } from "../db/sandbox.js";
import * as cw from "../src/queue/chay-worker.js";
import * as nap from "../src/queue/nap.js";
import * as wk from "../src/queue/worker.js";
import * as ngat from "../src/queue/ngat-page.js";
import { xepTin } from "../src/queue/kho.js";
import { baoDamHoiThoai } from "../src/chat/kho.js";
import { resumeConversation } from "../src/queue/reconcile.js";
import { config } from "../src/config.js";
import { datKhoTokenDb, lamMoiTokenDb, listPancakeTokens } from "../src/pancake.js";
import { congHttpGhi } from "../src/chat/handler-v3.js";

process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString("base64");
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString("base64");
const sk = await import("../v3/src/ui/suc-khoe/kho-suc-khoe.js");
const { taoTruyVanThat } = await import("../v3/src/noi-day/cong-du-lieu-that.js");
const { taoBoiCanh, VAI } = await import("../v3/src/auth/boi-canh.js");
const nhip = await import("../v3/src/ui/chung/nhip-may-bot.js");

const T_NGAT_DS_MS = 2 * 60_000;    // chữ người quyết 07/10 «ok 2 phút»
const PHUT = 60_000;
const HAN_DOC = 150;
const ENV = {
  V3_PANCAKE_GUI: "1",
  PANCAKE_READONLY: "0",            // chỉ trong tiến trình ca — .env vẫn =1
  V3_PANCAKE_HAN_DOC_MS: String(HAN_DOC),
  V3_PANCAKE_HAN_GUI_MS: "300",
  PK_MARK_UNREAD: "0",
  V3_DIEN_TAP: undefined,
  V3_TRAN_PAGE_BAT: "50",
  V3_NAP_IM_BOTCAKE_MS: "0",
  V3_NAP_CHI_CHUA_DOC: "0",
  V3_NAP_THE_CHAN: "Đã gửi",
};
const envCu = {};
const cauHinhCu = {};
const goi = [];                     // { method, loai, page, psid }
const CHE_DS = new Map();           // page → cách Pancake trả GET /conversations
const CHE_GET = new Map();          // psid → cách Pancake trả GET …/messages
const CONVS = new Map();            // page → danh sách hội thoại khi /conversations OK
const PAGE_ROW = new Map();
let sb;
let team;
let nd;
let chan0 = 0;
let dongHo = 1_000_000_000;

const tl = (j) => ({ status: 200, json: async () => j });
const html502 = () => ({ status: 502, json: async () => { throw new SyntaxError("Unexpected token <"); } });
const khachHoi = (psid) => ({ id: `m-${psid}-1`, from: { id: psid, name: "Khách" }, message: "how much?" });
const DS = {
  ok: (page) => tl({ conversations: CONVS.get(page) || [] }),
  "502": () => html502(),
  mang: () => { throw new TypeError("fetch failed"); },
  khongDs: () => tl({ success: true }),                                                    // N6: thân 200 không mảng
  goiCuoc121: () => tl({ success: false, message: "Không tìm thấy gói cước của trang này" }),  // 121 KHÔNG mã (đo 28/09)
};
const GET = {
  ok: (psid) => tl({ messages: [khachHoi(psid)] }),
  "502": () => html502(),
  thieuMa: () => tl({ success: false, message: "Thiếu mã khách hàng" }),
};
const conv = (psid, moc = "2026-10-07T01:00:00") => ({
  id: `conv-${psid}`, from_psid: psid, customers: [{ id: `cust-${psid}` }], last_sent_by: { id: psid, name: "Khách" },
  last_customer_interactive_at: moc, updated_at: moc, snippet: "how much?", tags: [],
});

before(async () => {
  sb = await dungSandbox("gl3c_nap");
  console.log(`   [gl3c] hộp cát ${sb.ten} · tệp đo ${fileURLToPath(new URL("../src/queue/nap.js", import.meta.url))} · cwd ${process.cwd()}`);
  team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  nd = (await sb.pool.query("INSERT INTO nguoi_dung (email, ten) VALUES ('gl3c@thu.vn','GL3c') RETURNING id")).rows[0].id;
  // 1) fetch GIẢ trước — rồi mới mở van. Host khác pages.fm ⇒ ném (không lọt mạng).
  globalThis.fetch = async (u, init) => {
    const url = new URL(String(u));
    if (url.host !== "pages.fm") throw new Error(`ca GL3c: lượt gọi lạ ra ${url.host} — chặn`);
    const method = String(init?.method || "GET").toUpperCase();
    const page = decodeURIComponent(/\/pages\/([^/]+)/.exec(url.pathname)?.[1] || "");
    const m = /\/conversations\/conv-([^/]+)\/(messages|toggle_tag)$/.exec(url.pathname);
    const psid = m ? decodeURIComponent(m[1]) : "";
    const loai = m ? m[2] : url.pathname.split("/").pop();
    goi.push({ method, loai, page, psid });
    if (method === "GET" && loai === "conversations") return DS[CHE_DS.get(page) || "ok"](page);
    if (method === "GET" && loai === "settings") return tl({ settings: { tags: [{ id: 9, text: "AI back Sale" }, { id: 3, text: "Đã gửi" }] } });
    if (method === "GET" && loai === "messages") return GET[CHE_GET.get(psid) || "ok"](psid);
    if (method === "POST" && loai === "messages") return tl({ success: true, id: `bot-${goi.length}` });
    return tl({ success: true });
  };
  // 2) kho token tất định: hai token GIẢ.
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
  nap.quenMoc(); nap.quenChoGo(); ngat.xoaBoNhoNgat();
  chan0 = congHttpGhi.daChan.length;
});
after(async () => {
  for (const [k, v] of Object.entries(envCu)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  datKhoTokenDb(null);
  config.pancakeToken = cauHinhCu.pancakeToken;
  config.pancakeTokensExtra = cauHinhCu.pancakeTokensExtra;
  await sb?.don();
});

/* ─────────────────────────── trợ lý ca ─────────────────────────── */

async function taoPage(pid) {
  const r = await sb.pool.query(
    "INSERT INTO page(team_id,page_id,ten,nguon_tin,bot_ai_bat) VALUES($1,$2,$3,'poll',true) RETURNING id", [team, pid, `Trang ${pid}`]);
  PAGE_ROW.set(pid, r.rows[0].id);
  return pid;
}
/** Chỉ đúng các page này bật bot (trần GL2 đếm toàn hệ — page của ca trước phải tắt, và vòng nạp chỉ đi page của ca này). */
const chiBat = (...pids) => sb.pool.query("UPDATE page SET bot_ai_bat = (page_id = ANY($1::text[]))", [pids]);
let seq = 0;
async function xep(page, psid) {
  await baoDamHoiThoai(sb.pool, { teamId: team, pageRowId: PAGE_ROW.get(page), psid });
  const r = await xepTin(sb.pool, {
    teamId: team, pageId: page, psid, convId: `conv-${psid}`, custId: `cust-${psid}`, msgId: `mid-${psid}-${++seq}`, noiDung: "how much?",
  });
  return r.id;
}
const boNao = () => ({
  layKb: () => ({ products: [], text: "test" }),
  layModel: () => ({ maModel: "test" }),
  lanNhanh: () => ({ handled: true, reply: "Giá 109 SAR ạ (bot)", lane: "test" }),
  kiemTinRa: () => ({ ok: true }),
});
const depsNap = () => ({ doiGoXong: () => ({ ms: 0, reason: "ca GL3c" }), dongHo: () => dongHo });
/** MỘT `motLuot` thật (nạp rồi xử) ở mốc `luc` của đồng hồ bộ nạp + dòng log thật của lượt (`inLuot`). */
async function vong(luc) {
  dongHo = luc;
  const ket = await cw.motLuot(sb.pool, { depsNap: depsNap(), depsXuLy: boNao() });
  const dong = [];
  const logCu = console.log;
  console.log = (...a) => dong.push(a.join(" "));
  try { cw.inLuot(ket); } finally { console.log = logCu; }
  return { ket, log: dong.join("\n") };
}
/** `napTuPoll` gọi TRỰC TIẾP (phép xen) — luôn khẳng định van nguồn mở. */
async function napXen(page, luc = dongHo) {
  dongHo = luc;
  const r = await nap.napTuPoll(sb.pool, { pageId: page }, depsNap());
  assert.equal(r.mo, true, `napTuPoll phải MỞ (van nguồn) — đo ${JSON.stringify(r)}`);
  return r;
}
/** `chayMotVong` THẬT của worker — `pageIds` là mảng như tiến trình thật truyền (để lọc page ngắt). */
const xuXen = (page) => wk.chayMotVong(sb.pool, { pageIds: [page], ...boNao() });
const dem = (tu, { page, psid, method = "GET", loai } = {}) => goi.slice(tu).filter((g) =>
  (page == null || g.page === page) && (psid == null || g.psid === psid)
  && (method == null || g.method === method) && (loai == null || g.loai === loai)).length;
const tin = async (id) => (await sb.pool.query("SELECT trang_thai, so_lan_thu, ly_do FROM tin_cho_xu_ly WHERE id=$1", [id])).rows[0];
const tinCua = async (psid) => (await sb.pool.query("SELECT id, trang_thai FROM tin_cho_xu_ly WHERE psid=$1 ORDER BY id", [psid])).rows;
const toiLuot = (...ids) => sb.pool.query("UPDATE tin_cho_xu_ly SET thu_lai_luc = now() WHERE id = ANY($1::bigint[])", [ids]);
const quaBaMuoi = (pid) => sb.pool.query("UPDATE page SET ngat_den = now() - interval '1 second' WHERE page_id=$1", [pid]);
const trangPage = async (pid) => (await sb.pool.query(
  `SELECT team_id, ngat_vi, ngat_ly_do, loi_doc_lien_tiep, loi_doc_tin_cuoi, EXTRACT(EPOCH FROM (ngat_den - now())) AS con_giay
     FROM page WHERE page_id=$1`, [pid])).rows[0];
const nhatKyPage = async (hanhDong, pid) => (await sb.pool.query(
  "SELECT team_id FROM nhat_ky WHERE hanh_dong=$1 AND doi_tuong='page' AND doi_tuong_id=$2", [hanhDong, pid])).rows;
const hoiThoai = async (page, psid) => (await sb.pool.query(
  "SELECT id, chu_so_huu, trang_thai, ly_do_cuoi FROM hoi_thoai WHERE page_id=$1 AND psid=$2", [PAGE_ROW.get(page), psid])).rows[0];
const viecMo = async (psid) => (await sb.pool.query(
  `SELECT v.ly_do_day FROM viec_can_xu_ly v JOIN hoi_thoai h ON h.id = v.hoi_thoai_id WHERE h.psid=$1 AND v.dong_luc IS NULL`, [psid])).rows;
const nhatKyGiao = async (htId) => (await sb.pool.query(
  "SELECT ghi_chu FROM nhat_ky WHERE doi_tuong='hoi_thoai' AND doi_tuong_id=$1 AND hanh_dong LIKE '%loi_ben%'", [String(htId)])).rows;
const khongChan = () => assert.equal(congHttpGhi.daChan.length - chan0, 0, "cổng HTTP ghi KHÔNG được chặn lượt nào (van mở trong ca)");
const khongLoTok = (s) => assert.doesNotMatch(String(s), /tokA|tokB|access_token|https?:\/\//, `lý do lộ token/URL: ${s}`);
async function denNgatKenh() {
  sk.datTaoTruyVan((bc) => taoTruyVanThat(sb.pool, bc));
  sk.datDocKhoToken(null); sk.datTrangThaiCauBot(null); sk.datDocSanSang(null);
  nhip.datDocNhip(null); nhip.xoaNhoNhip();
  const bc = taoBoiCanh({ nguoiDungId: String(nd), tenDangNhap: "gl3c", teamId: String(team), vai: [VAI.QUAN_TRI] });
  return (await sk.bangDen(bc)).den.find((d) => d.ma === "ngat_kenh");
}

/* ═══════════ ④1 — danh sách lỗi LIÊN TỤC ≥ 2′ ⇒ ngắt; chập ngắn ⇒ chỉ log ═══════════ */

test("GL3c P1 · /conversations 502 LIÊN TỤC: t0 · t0+60 s chưa ngắt (log «1 page lỗi danh sách»); t0+120 s ⇒ ngắt 'doc' ≈30′ + 1 nhật ký + đèn ĐỎ, tin W của P KHÔNG bị rút ngay trong lượt đó (bộ nhớ chung); vòng sau 0 fetch cho P, Q vẫn fetch; qua 30′ + lành ⇒ mở 1 lần, khách của P vào hàng", async () => {
  const P = await taoPage("gl3c-p1"); const Q = await taoPage("gl3c-q1"); await chiBat(P, Q);
  CHE_DS.set(P, "502"); CONVS.set(P, [conv("p1-k")]); CONVS.set(Q, []);
  const t0 = 1_000_000_000;
  for (const s of [0, 60]) {
    const g0 = goi.length;
    const { ket, log } = await vong(t0 + s * 1000);
    assert.equal(ket.nap.mo, true, "bộ nạp phải MỞ");
    assert.equal(dem(g0, { page: P, loai: "conversations" }), 1, `t0+${s}s đã chạm: đúng 1 GET /conversations của P (502 ⇒ không xoay token)`);
    assert.ok(dem(g0, { page: Q, loai: "conversations" }) >= 1, "Q cùng vòng được fetch");
    assert.equal((await trangPage(P)).ngat_ly_do, "", `t0+${s}s: lỗi liên tục < 2′ — KHÔNG ngắt`);
    assert.match(log, /1 page lỗi danh sách/, `dòng log vòng phải nói page lỗi danh sách: «${log}»`);
  }
  const W = "p1-w"; const tW = await xep(P, W);
  const g1 = goi.length;
  const { ket: k3 } = await vong(t0 + 120_000);
  assert.equal(k3.nap.mo, true);
  assert.equal(dem(g1, { page: P, loai: "conversations" }), 1, "đã chạm ở lượt ngắt");
  const p = await trangPage(P);
  console.log(`   [gl3c] P1 ngắt: vi=${p.ngat_vi} · còn ${Math.round(p.con_giay)} s · lý do «${p.ngat_ly_do}»`);
  assert.equal(p.ngat_vi, "doc", "lỗi danh sách liên tục ≥ 2′ ⇒ ngắt ĐỌC");
  assert.ok(p.con_giay > 29 * 60 && p.con_giay <= 30 * 60 + 5, `ngat_den ≈ now()+30′ (đồng hồ CSDL), đo ${p.con_giay} s`);
  assert.match(p.ngat_ly_do, /danh sách hội thoại/); assert.match(p.ngat_ly_do, /HTTP 502/); khongLoTok(p.ngat_ly_do);
  const nk = await nhatKyPage("page_ngat_kenh", P);
  assert.equal(nk.length, 1, "đúng 1 dòng nhat_ky page_ngat_kenh");
  assert.equal(String(nk[0].team_id), String(p.team_id), "nhật ký ghi ĐÚNG team của page");
  assert.equal(dem(g1, { psid: W }), 0, "tin W của P KHÔNG bị rút trong chính lượt ngắt — bộ nhớ chung cập nhật ngay");
  assert.equal((await tin(tW)).trang_thai, "cho"); assert.equal(Number((await tin(tW)).so_lan_thu), 0);
  const den = await denNgatKenh();
  console.log(`   [gl3c] P1 đèn ngat_kenh: ${den?.muc} · ${den?.vi}`);
  assert.equal(den?.muc, sk.MUC.DO, "đèn ngắt kênh phải ĐỎ");
  assert.ok(String(den.vi).includes(`Trang ${P}`), `đèn kể page: ${den.vi}`); assert.match(den.vi, /danh sách hội thoại/);
  // ── vòng sau, trong 30′ ──
  const g2 = goi.length;
  const { ket: k4 } = await vong(t0 + 126_000);
  assert.equal(k4.nap.mo, true);
  assert.equal(dem(g2, { page: P, method: null }), 0, `0 lượt fetch cho P — đo ${JSON.stringify(goi.slice(g2).filter((g) => g.page === P))}`);
  assert.ok(dem(g2, { page: Q, loai: "conversations" }) >= 1, "Q cùng vòng ĐƯỢC fetch (vòng có chạy)");
  // ── qua 30′ (đồng hồ CSDL) + Pancake lành ⇒ mở 1 lần; lúc lỗi KHÔNG mốc nào bị ghi ⇒ khách của P được đọc và vào hàng ──
  await quaBaMuoi(P); CHE_DS.set(P, "ok");
  const g3 = goi.length;
  await vong(t0 + 132_000);
  assert.equal((await nhatKyPage("page_mo_lai_kenh", P)).length, 1, "đúng 1 dòng page_mo_lai_kenh");
  assert.equal((await trangPage(P)).ngat_ly_do, "", "đã mở lại");
  assert.ok(dem(g3, { psid: "p1-k", loai: "messages" }) >= 1, "khách của P được đọc lịch sử sau khi lành");
  assert.equal((await tinCua("p1-k")).length, 1, "khách của P vào hàng");
  assert.equal((await tin(tW)).trang_thai, "xong", "tin W được xử sau khi mở");
  khongChan();
});

test("GL3c P1n · N6: danh sách trả thân 200 KHÔNG mảng · 121 không mã ⇒ cũng là lỗi CẤP PAGE (không phải «0 hội thoại») ⇒ ≥ 2′ thì ngắt", async () => {
  const A = await taoPage("gl3c-p1n-a"); const B = await taoPage("gl3c-p1n-b"); await chiBat(A, B);
  CHE_DS.set(A, "khongDs"); CHE_DS.set(B, "goiCuoc121");
  const t0 = 1_100_000_000;
  const g0 = goi.length;
  const { log } = await vong(t0);
  assert.ok(dem(g0, { page: A, loai: "conversations" }) >= 1 && dem(g0, { page: B, loai: "conversations" }) >= 1, "đã chạm cả hai page");
  assert.match(log, /2 page lỗi danh sách/, `log: «${log}»`);
  await vong(t0 + 120_000);
  for (const [pid, mau] of [[A, /danh sách hội thoại/], [B, /gói cước/]]) {
    const p = await trangPage(pid);
    console.log(`   [gl3c] P1n ${pid}: vi=${p.ngat_vi} · «${p.ngat_ly_do}»`);
    assert.equal(p.ngat_vi, "doc", `${pid} phải ngắt`); assert.match(p.ngat_ly_do, mau); khongLoTok(p.ngat_ly_do);
  }
  khongChan();
});

test("GL3c P1b · danh sách lỗi 2 vòng liền (t0 · t0+6 s) rồi lành (t0+12 s) ⇒ KHÔNG ngắt; tin của khách vào hàng bình thường; log có «1 page lỗi danh sách»", async () => {
  const P = await taoPage("gl3c-p1b"); await chiBat(P);
  CHE_DS.set(P, "502"); CONVS.set(P, [conv("p1b-k")]);
  const t0 = 1_200_000_000;
  for (const s of [0, 6]) {
    const g0 = goi.length;
    const { ket, log } = await vong(t0 + s * 1000);
    assert.equal(ket.nap.mo, true);
    assert.equal(dem(g0, { page: P, loai: "conversations" }), 1, "đã chạm");
    assert.match(log, /1 page lỗi danh sách/, `log: «${log}»`);
    assert.equal((await trangPage(P)).ngat_ly_do, "", `t0+${s}s: KHÔNG ngắt`);
  }
  CHE_DS.set(P, "ok");
  const g1 = goi.length;
  const { ket, log } = await vong(t0 + 12_000);
  assert.equal(ket.nap.mo, true);
  assert.equal((await trangPage(P)).ngat_ly_do, "", "chập 12 s KHÔNG được làm page im 30′");
  assert.doesNotMatch(log, /lỗi danh sách/, "lành ⇒ log hết dòng lỗi danh sách");
  assert.ok(dem(g1, { psid: "p1b-k", loai: "messages" }) >= 1, "khách được đọc");
  const t = await tinCua("p1b-k");
  assert.equal(t.length, 1, "tin vào hàng"); assert.equal(t[0].trang_thai, "xong", "và được xử");
  khongChan();
});

test("GL3c P1c · XEN: worker tin T lỗi KÊNH → napTuPoll danh sách lỗi → worker T lỗi lần nữa (cùng tin) ⇒ KHÔNG ngắt, bộ đếm đọc vẫn 1 (danh sách lỗi không đi bộ đếm theo tin)", async () => {
  const P = await taoPage("gl3c-p1c"); await chiBat(P);
  const X = "p1c-x"; CHE_GET.set(X, "502"); const tT = await xep(P, X);
  CHE_DS.set(P, "502"); CONVS.set(P, []);
  const g0 = goi.length;
  const r1 = await xuXen(P);
  assert.equal(String(r1?.tinId), String(tT)); assert.match((await tin(tT)).ly_do, /^LoiDocLichSu/);
  assert.equal(dem(g0, { psid: X, loai: "messages" }), 1, "đã chạm: worker đọc T (502 ⇒ 1 lượt)");
  assert.equal((await trangPage(P)).loi_doc_lien_tiep, 1);
  const g1 = goi.length;
  const r = await napXen(P, 1_300_000_000);
  assert.equal(dem(g1, { page: P, loai: "conversations" }), 1, "đã chạm: nạp đọc danh sách (lỗi)");
  assert.equal(r.dsLoi, 1, "napTuPoll báo page lỗi danh sách");
  await toiLuot(tT);
  const g2 = goi.length;
  await xuXen(P);
  assert.equal(dem(g2, { psid: X, loai: "messages" }), 1, "đã chạm: worker đọc lại T");
  const p = await trangPage(P);
  console.log(`   [gl3c] P1c đếm đọc=${p.loi_doc_lien_tiep} · ngắt «${p.ngat_ly_do}»`);
  assert.equal(p.ngat_ly_do, "", "cùng tin = 1 lỗi; danh sách lỗi không cộng vào bộ đếm ⇒ KHÔNG ngắt");
  assert.equal(p.loi_doc_lien_tiep, 1);
  khongChan();
});

test("GL3c P1d · R2-N1: ngắt vì danh sách (≥ 2′) → qua 30′ (đồng hồ CSDL, mở thật) → 1 vòng danh sách lỗi rồi lành ⇒ KHÔNG ngắt lại (mở rồi phải đủ 2′ lỗi liên tục)", async () => {
  const P = await taoPage("gl3c-p1d"); await chiBat(P);
  CHE_DS.set(P, "502"); CONVS.set(P, [conv("p1d-k")]);
  const t0 = 1_400_000_000;
  await vong(t0); await vong(t0 + 120_000);
  assert.equal((await trangPage(P)).ngat_vi, "doc", "dựng cảnh: page ngắt vì danh sách");
  await quaBaMuoi(P);
  const g0 = goi.length;
  const { ket } = await vong(t0 + 126_000);
  assert.equal(ket.nap.mo, true);
  assert.equal((await nhatKyPage("page_mo_lai_kenh", P)).length, 1, "đã mở lại thật (motLuot → lamMoiNgat)");
  assert.equal(dem(g0, { page: P, loai: "conversations" }), 1, "đã chạm: vòng sau khi mở đọc danh sách (lỗi)");
  assert.equal((await trangPage(P)).ngat_ly_do, "", "1 vòng lỗi sau khi mở KHÔNG ngắt lại");
  CHE_DS.set(P, "ok");
  await vong(t0 + 132_000);
  assert.equal((await trangPage(P)).ngat_ly_do, "");
  assert.equal((await nhatKyPage("page_ngat_kenh", P)).length, 1, "chỉ một lần ngắt");
  assert.equal((await tinCua("p1d-k")).length, 1, "khách vào hàng sau khi lành");
  khongChan();
});

test("GL3c P1f · R2-N1 «bất kỳ nguồn nào»: danh sách lỗi 1 vòng → page ngắt vì ĐỌC LỊCH SỬ ở worker (GL4) → vòng trong lúc ngắt → qua 30′ → 1 vòng danh sách lỗi ⇒ KHÔNG ngắt lại", async () => {
  const P = await taoPage("gl3c-p1f"); await chiBat(P);
  CHE_DS.set(P, "502"); CONVS.set(P, []);
  const t0 = 1_500_000_000;
  const { log } = await vong(t0);
  assert.match(log, /1 page lỗi danh sách/, "dựng cảnh: chuỗi lỗi danh sách bắt đầu ở t0");
  for (const k of ["p1f-a", "p1f-b"]) { CHE_GET.set(k, "502"); await xep(P, k); }
  await xuXen(P); await xuXen(P);
  assert.equal((await trangPage(P)).ngat_vi, "doc", "dựng cảnh: GL4 ngắt vì hai khách đọc lỗi kênh ở worker");
  for (const k of ["p1f-a", "p1f-b"]) CHE_GET.set(k, "ok");   // máy chậm tới hạn lùi 15 s thì hai tin đó đọc OK — không tự ngắt lại
  const g0 = goi.length;
  await vong(t0 + 6_000);
  assert.equal(dem(g0, { page: P, method: null }), 0, "trong lúc ngắt: 0 fetch cho P");
  await quaBaMuoi(P);
  const g1 = goi.length;
  await vong(t0 + 31 * PHUT);
  assert.equal((await nhatKyPage("page_mo_lai_kenh", P)).length, 1, "đã mở lại thật");
  assert.equal(dem(g1, { page: P, loai: "conversations" }), 1, "đã chạm: đọc danh sách sau khi mở (lỗi)");
  const p = await trangPage(P);
  console.log(`   [gl3c] P1f sau mở + 1 lỗi danh sách: ngắt «${p.ngat_ly_do}»`);
  assert.equal(p.ngat_ly_do, "", "mốc lỗi danh sách cũ (trước quãng ngắt) KHÔNG được tính tiếp ⇒ không ngắt lại");
  khongChan();
});

test("GL3c P1h · page đang ngắt vì GỬI (vẫn được nạp): danh sách lỗi TRONG lúc ngắt KHÔNG nối chuỗi ⇒ mở xong 60 s lỗi chưa ngắt; đủ 2′ lỗi liên tục sau khi mở ⇒ ngắt đọc", async () => {
  const P = await taoPage("gl3c-p1h"); await chiBat(P);
  await sb.pool.query("UPDATE page SET ngat_den = now() + interval '20 minutes', ngat_vi='gui', ngat_ly_do='Pancake từ chối gửi (mã 105)' WHERE page_id=$1", [P]);
  CHE_DS.set(P, "502"); CONVS.set(P, []);
  const t0 = 1_550_000_000;
  const g0 = goi.length;
  const { log } = await vong(t0);
  assert.equal(dem(g0, { page: P, loai: "conversations" }), 1, "ngắt vì GỬI vẫn nạp: đã chạm danh sách");
  assert.match(log, /1 page lỗi danh sách/);
  assert.equal((await trangPage(P)).ngat_vi, "gui", "lỗi danh sách lúc đang ngắt gửi không ghi đè");
  await quaBaMuoi(P);
  await vong(t0 + 66_000);
  assert.equal((await nhatKyPage("page_mo_lai_kenh", P)).length, 1, "đã mở lại thật");
  assert.equal((await trangPage(P)).ngat_ly_do, "");
  const g1 = goi.length;
  await vong(t0 + 126_000);
  assert.equal(dem(g1, { page: P, loai: "conversations" }), 1, "đã chạm");
  assert.equal((await trangPage(P)).ngat_ly_do, "", "lỗi lúc đang ngắt KHÔNG tính ⇒ chuỗi mới 60 s ⇒ chưa ngắt");
  await vong(t0 + 186_000);
  assert.equal((await trangPage(P)).ngat_vi, "doc", "đủ 2′ lỗi liên tục SAU khi mở ⇒ ngắt đọc");
  khongChan();
});

test("GL3c P1i · /code-review #2: danh sách lỗi (t0) → page đổi sang WEBHOOK một quãng (vòng nạp không tới bước đọc danh sách) → đổi lại poll, 10′ sau MỘT lần lỗi ⇒ KHÔNG ngắt (quãng không quan sát cắt chuỗi); đủ 2′ lỗi liên tục sau đó ⇒ ngắt", async () => {
  const P = await taoPage("gl3c-p1i"); await chiBat(P);
  CHE_DS.set(P, "502"); CONVS.set(P, []);
  const t0 = 1_560_000_000;
  const { log } = await vong(t0);
  assert.match(log, /1 page lỗi danh sách/, "dựng cảnh: chuỗi lỗi danh sách bắt đầu ở t0");
  await sb.pool.query("UPDATE page SET nguon_tin='webhook' WHERE page_id=$1", [P]);
  const g0 = goi.length;
  const { ket } = await vong(t0 + 6_000);
  assert.equal(ket.nap.page, 1, "page vẫn trong vòng nạp (bật bot)");
  assert.equal(dem(g0, { page: P, loai: "conversations" }), 0, "page webhook: bộ nạp không đọc danh sách");
  await sb.pool.query("UPDATE page SET nguon_tin='poll' WHERE page_id=$1", [P]);
  const g1 = goi.length;
  await vong(t0 + 10 * PHUT);
  assert.equal(dem(g1, { page: P, loai: "conversations" }), 1, "đã chạm: đọc danh sách sau khi đổi lại poll (lỗi)");
  assert.equal((await trangPage(P)).ngat_ly_do, "", "mốc trước quãng không quan sát KHÔNG nối ⇒ một lần lỗi không ngắt");
  await vong(t0 + 12 * PHUT);
  assert.equal((await trangPage(P)).ngat_vi, "doc", "đủ 2′ lỗi liên tục sau khi đổi lại ⇒ ngắt");
  khongChan();
});

test("GL3c P1g · `ngatPage` trên page ĐANG ngắt (đường khác ngắt trước) ⇒ null, KHÔNG ghi đè lý do/hạn, KHÔNG thêm nhật ký", async () => {
  assert.equal(typeof ngat.ngatPage, "function", "chưa có ngat-page.js#ngatPage (GL3c ② 2)");
  const P = await taoPage("gl3c-p1g"); await chiBat(P);
  await sb.pool.query("UPDATE page SET ngat_den = now() + interval '20 minutes', ngat_vi='gui', ngat_ly_do='Pancake từ chối gửi (mã 105)' WHERE page_id=$1", [P]);
  const r = await ngat.ngatPage(sb.pool, { teamId: team, pageId: P, kieu: "doc", lyDo: "danh sách hội thoại lỗi" });
  const p = await trangPage(P);
  assert.equal(r, null);
  assert.equal(p.ngat_vi, "gui"); assert.match(p.ngat_ly_do, /mã 105/); assert.ok(p.con_giay < 21 * 60, "hạn không bị kéo");
  assert.equal((await nhatKyPage("page_ngat_kenh", P)).length, 0);
});

test("GL3c P1e · R2-N2 «một khách, một khoá»: worker tin T của X lỗi kênh → bộ nạp đọc X (khách nhắn thêm) lỗi kênh ⇒ KHÔNG ngắt (đếm 1); bộ nạp đọc khách KHÁC Y lỗi kênh ⇒ NGẮT", async () => {
  const P = await taoPage("gl3c-p1e"); await chiBat(P);
  const X = "p1e-x"; const Y = "p1e-y";
  CHE_GET.set(X, "502"); await xep(P, X);
  const g0 = goi.length;
  await xuXen(P);
  assert.equal(dem(g0, { psid: X, loai: "messages" }), 1, "đã chạm: worker đọc X");
  assert.equal((await trangPage(P)).loi_doc_lien_tiep, 1);
  CHE_DS.set(P, "ok"); CONVS.set(P, [conv(X, "2026-10-07T01:05:00")]);
  const g1 = goi.length;
  const r = await napXen(P, 1_600_000_000);
  assert.equal(dem(g1, { psid: X, loai: "messages" }), 1, "đã chạm: bộ nạp đọc X");
  assert.equal(r.docTinLoi, 1);
  const p = await trangPage(P);
  console.log(`   [gl3c] P1e worker X + nạp X: đếm=${p.loi_doc_lien_tiep} · khoá=${p.loi_doc_tin_cuoi} · ngắt «${p.ngat_ly_do}»`);
  assert.equal(p.ngat_ly_do, "", "cùng một khách ở worker và bộ nạp là MỘT lỗi");
  assert.equal(p.loi_doc_lien_tiep, 1);
  CHE_GET.set(Y, "502"); CONVS.set(P, [conv(X, "2026-10-07T01:05:00"), conv(Y)]);
  const g2 = goi.length;
  await napXen(P, 1_600_000_000 + 40_000);
  assert.equal(dem(g2, { psid: Y, loai: "messages" }), 1, "đã chạm: bộ nạp đọc Y");
  assert.equal((await trangPage(P)).ngat_vi, "doc", "khách KHÁC lỗi kênh ⇒ đủ 2 ⇒ ngắt");
  khongChan();
});

/* ═══════════ ④2 — lỗi KÊNH khi bộ nạp đọc lịch sử ⇒ đếm GL4; không leo tới giao sale ═══════════ */

test("GL3c P2 · /conversations OK + /messages 502 ở X, Y ⇒ ngắt 'doc' NGAY trong vòng nạp (đếm theo hội thoại), Z không bị đọc nữa, 0 việc; 3 chu kỳ ngắt-mở-lỗi ⇒ vẫn 0 việc, không ai rời AI", async () => {
  const P = await taoPage("gl3c-p2"); await chiBat(P);
  const [X, Y, Z] = ["p2-x", "p2-y", "p2-z"];
  for (const k of [X, Y, Z]) CHE_GET.set(k, "502");
  CONVS.set(P, [conv(X), conv(Y), conv(Z)]);
  const t0 = 1_700_000_000;
  for (let chuKy = 1; chuKy <= 3; chuKy++) {
    if (chuKy > 1) await quaBaMuoi(P);
    const g0 = goi.length;
    const { ket } = await vong(t0 + (chuKy - 1) * 31 * PHUT);
    assert.equal(ket.nap.mo, true);
    assert.equal(dem(g0, { psid: X, loai: "messages" }), 1, `chu kỳ ${chuKy}: đã chạm X`);
    assert.equal(dem(g0, { psid: Y, loai: "messages" }), 1, `chu kỳ ${chuKy}: đã chạm Y`);
    assert.equal(dem(g0, { psid: Z, loai: "messages" }), 0, `chu kỳ ${chuKy}: page vừa ngắt ⇒ dừng nạp page, Z không đọc`);
    const p = await trangPage(P);
    if (chuKy === 1) console.log(`   [gl3c] P2 ngắt: vi=${p.ngat_vi} · «${p.ngat_ly_do}»`);
    assert.equal(p.ngat_vi, "doc", `chu kỳ ${chuKy}: hai hội thoại lỗi kênh ⇒ ngắt đọc`);
    assert.match(p.ngat_ly_do, /HTTP 502/); assert.match(p.ngat_ly_do, /\(đọc\)/); khongLoTok(p.ngat_ly_do);
    assert.equal((await nhatKyPage("page_ngat_kenh", P)).length, chuKy);
    for (const k of [X, Y, Z]) {
      assert.equal((await viecMo(k)).length, 0, `chu kỳ ${chuKy}: ${k} — lỗi KÊNH không ra việc (GL4 giữ, không giao hàng loạt)`);
      assert.equal((await hoiThoai(P, k))?.chu_so_huu ?? "AI", "AI", `${k} vẫn của AI`);
    }
  }
  khongChan();
});

test("GL3c P2b · XEN: worker A lỗi kênh → napTuPoll (danh sách OK, 0 lượt đọc lịch sử) → worker B lỗi kênh ⇒ NGẮT (đọc được danh sách KHÔNG xoá chuỗi lỗi đọc)", async () => {
  const P = await taoPage("gl3c-p2b"); await chiBat(P);
  const A = "p2b-a"; const B = "p2b-b";
  CHE_GET.set(A, "502"); CHE_GET.set(B, "502");
  const tA = await xep(P, A); const tB = await xep(P, B);
  CHE_DS.set(P, "ok"); CONVS.set(P, []);
  const g0 = goi.length;
  const rA = await xuXen(P);
  assert.equal(String(rA?.tinId), String(tA)); assert.equal(dem(g0, { psid: A, loai: "messages" }), 1, "đã chạm A");
  const g1 = goi.length;
  const r = await napXen(P, 1_800_000_000);
  assert.equal(dem(g1, { page: P, loai: "conversations" }), 1, "đã chạm: nạp đọc danh sách (OK)");
  assert.equal(dem(g1, { page: P, loai: "messages" }), 0, "nạp không đọc lịch sử nào");
  assert.equal(r.dsLoi ?? 0, 0);
  const rB = await xuXen(P);
  assert.equal(String(rB?.tinId), String(tB));
  const p = await trangPage(P);
  console.log(`   [gl3c] P2b A · nạp(OK) · B ⇒ vi=«${p.ngat_vi}» đếm=${p.loi_doc_lien_tiep}`);
  assert.equal(p.ngat_vi, "doc", "hai khách khác nhau lỗi kênh — vòng nạp đọc được danh sách chen giữa không được xoá chuỗi");
  khongChan();
});

test("GL3c P2c · bộ nạp: X lỗi kênh → Y đọc lịch sử OK → Z lỗi kênh (cùng vòng) ⇒ KHÔNG ngắt (đọc lịch sử OK ở bộ nạp xoá chuỗi đọc), Y vào hàng", async () => {
  const P = await taoPage("gl3c-p2c"); await chiBat(P);
  const [X, Y, Z] = ["p2c-x", "p2c-y", "p2c-z"];
  CHE_GET.set(X, "502"); CHE_GET.set(Z, "502");
  CONVS.set(P, [conv(X), conv(Y), conv(Z)]);
  const g0 = goi.length;
  const r = await napXen(P, 1_900_000_000);
  for (const k of [X, Y, Z]) assert.equal(dem(g0, { psid: k, loai: "messages" }), 1, `đã chạm ${k}`);
  assert.equal(r.docTinLoi, 2); assert.equal(r.them, 1);
  const p = await trangPage(P);
  console.log(`   [gl3c] P2c X lỗi · Y OK · Z lỗi ⇒ đếm=${p.loi_doc_lien_tiep} · ngắt «${p.ngat_ly_do}»`);
  assert.equal(p.ngat_ly_do, ""); assert.equal(p.loi_doc_lien_tiep, 1);
  khongChan();
});

/* ═══════════ ④3 · ④4 — hội thoại lỗi DỮ LIỆU bền ⇒ lượt 3 giao sale CÓ việc ═══════════ */

test("GL3c P3 · X «Thiếu mã khách hàng» liên tục, Y OK ⇒ page KHÔNG ngắt; lượt 1 (t0) · 2 (t0+30 s) chưa giao; lượt 3 (t0+90 s) ⇒ SALE/HANDOFF `doc_lich_su_loi_ben`, ĐÚNG 1 việc nói 90 s + câu lỗi + mốc thô, 1 nhật ký; không đọc X nữa; «trả AI» THÀNH", async () => {
  const P = await taoPage("gl3c-p3"); await chiBat(P);
  const X = "p3-x"; const Y = "p3-y";
  CHE_GET.set(X, "thieuMa"); CONVS.set(P, [conv(X), conv(Y)]);
  const t0 = 2_000_000_000;
  for (const [s, doc] of [[0, 1], [10, 0], [30, 1]]) {
    const g0 = goi.length;
    const { ket } = await vong(t0 + s * 1000);
    assert.equal(ket.nap.mo, true);
    assert.equal(dem(g0, { psid: X, loai: "messages" }), doc, `t0+${s}s: GET X = ${doc} (${doc ? "đọc lại" : "đang lùi"})`);
    assert.equal((await viecMo(X)).length, 0, `t0+${s}s: CHƯA giao (lượt < 3)`);
    assert.equal((await hoiThoai(P, X)).chu_so_huu, "AI");
  }
  assert.equal((await tinCua(Y)).length, 1, "Y (đọc OK) vào hàng bình thường");
  const g1 = goi.length;
  await vong(t0 + 90_000);
  assert.equal(dem(g1, { psid: X, loai: "messages" }), 1, "lượt 3: đã chạm X");
  const h = await hoiThoai(P, X);
  assert.deepEqual([h.chu_so_huu, h.trang_thai, h.ly_do_cuoi], ["SALE", "HANDOFF", "doc_lich_su_loi_ben"]);
  const v = await viecMo(X);
  console.log(`   [gl3c] P3 việc: «${v[0]?.ly_do_day}»`);
  assert.equal(v.length, 1, "ĐÚNG 1 dòng việc");
  assert.match(v[0].ly_do_day, /90 s/, "nói thời gian THẬT đã lỗi (từ lần lỗi đầu)");
  assert.match(v[0].ly_do_day, /Thiếu mã khách hàng/, "nói câu lỗi");
  assert.ok(v[0].ly_do_day.includes("2026-10-07T01:00:00"), "mốc THÔ «khách nhắn lần cuối»");
  assert.match(v[0].ly_do_day, /CHƯA trả lời/);
  assert.equal((await nhatKyGiao(h.id)).length, 1, "1 dòng nhat_ky giao");
  assert.equal((await trangPage(P)).ngat_ly_do, "", "lỗi DỮ LIỆU không ngắt page");
  assert.equal((await trangPage(P)).loi_doc_lien_tiep, 0, "lỗi DỮ LIỆU không đếm GL4");
  const g2 = goi.length;
  await vong(t0 + 400_000);
  assert.equal(dem(g2, { psid: X, loai: "messages" }), 0, "đã giao ⇒ mốc ghi ⇒ không đọc X nữa");
  assert.equal((await viecMo(X)).length, 1, "không việc thứ hai");
  const tra = await resumeConversation(sb.pool, { teamId: team, id: h.id, reason: "ca GL3c — sale trả AI" });
  assert.equal(tra.ok, true, "«trả AI» THÀNH (không có tin tồn của X)");
  assert.equal((await hoiThoai(P, X)).chu_so_huu, "AI");
  khongChan();
});

test("GL3c P3b · X lỗi dữ liệu lượt 1–2 → page ngắt 30′ (Y, Z lỗi kênh) → qua 30′ (mở thật) → X lỗi tiếp ⇒ giao ở lượt 3 (đếm GỘP qua quãng ngắt), việc nói đúng 32′", async () => {
  const P = await taoPage("gl3c-p3b"); await chiBat(P);
  const [X, Y, Z] = ["p3b-x", "p3b-y", "p3b-z"];
  CHE_GET.set(X, "thieuMa"); CONVS.set(P, [conv(X), conv(Y), conv(Z)]);
  const t0 = 2_100_000_000;
  await vong(t0);
  assert.equal((await tinCua(Y)).length + (await tinCua(Z)).length, 2, "dựng cảnh: Y, Z đọc OK ở t0");
  CHE_GET.set(Y, "502"); CHE_GET.set(Z, "502");
  CONVS.set(P, [conv(X), conv(Y, "2026-10-07T01:01:00"), conv(Z, "2026-10-07T01:01:00")]);
  const g0 = goi.length;
  await vong(t0 + 30_000);
  assert.equal(dem(g0, { psid: X, loai: "messages" }), 1, "lượt 2 của X đã chạm");
  assert.equal((await trangPage(P)).ngat_vi, "doc", "dựng cảnh: page ngắt bởi Y, Z (lỗi kênh)");
  assert.equal((await viecMo(X)).length, 0, "lượt 2: chưa giao");
  const g1 = goi.length;
  await vong(t0 + 36_000);
  assert.equal(dem(g1, { page: P, method: null }), 0, "trong lúc ngắt: 0 fetch cho P");
  await quaBaMuoi(P); CHE_GET.set(Y, "ok"); CHE_GET.set(Z, "ok");
  const g2 = goi.length;
  await vong(t0 + 30_000 + 32 * PHUT - 30_000);
  assert.equal((await nhatKyPage("page_mo_lai_kenh", P)).length, 1, "đã mở lại thật");
  assert.equal(dem(g2, { psid: X, loai: "messages" }), 1, "lượt 3 của X đã chạm");
  const v = await viecMo(X);
  console.log(`   [gl3c] P3b việc sau quãng ngắt: «${v[0]?.ly_do_day}»`);
  assert.equal(v.length, 1, "lượt 3 (gộp qua quãng ngắt) ⇒ giao CÓ việc");
  assert.match(v[0].ly_do_day, /32′/, "thời gian đã lỗi tính từ lần lỗi ĐẦU (t0), gồm cả quãng ngắt");
  assert.equal((await hoiThoai(P, X)).ly_do_cuoi, "doc_lich_su_loi_ben");
  khongChan();
});

test("GL3c P3c · X lỗi dữ liệu lượt 1–2 → sale trả lời (page nói cuối — X RỜI ĐI) → khách nhắn lại, Pancake vẫn lỗi ⇒ đếm lại từ 1: lỗi kế KHÔNG giao; lượt 3 của sự cố mới mới giao", async () => {
  const P = await taoPage("gl3c-p3c"); await chiBat(P);
  const X = "p3c-x";
  CHE_GET.set(X, "thieuMa"); CONVS.set(P, [conv(X)]);
  const t0 = 2_150_000_000;
  await vong(t0); await vong(t0 + 30_000);
  assert.equal((await viecMo(X)).length, 0, "dựng cảnh: hai lượt lỗi, chưa giao");
  CONVS.set(P, [{ ...conv(X), last_sent_by: { admin_id: P, id: P, admin_name: "Sale" } }]);
  const g0 = goi.length;
  await vong(t0 + 40_000);
  assert.equal(dem(g0, { psid: X, loai: "messages" }), 0, "page nói cuối ⇒ không đọc (X rời đi)");
  CONVS.set(P, [conv(X, "2026-10-07T02:00:00")]);
  const g1 = goi.length;
  await vong(t0 + 100_000);
  assert.equal(dem(g1, { psid: X, loai: "messages" }), 1, "khách nhắn lại ⇒ đã chạm X");
  assert.equal((await viecMo(X)).length, 0, "rời đi đã đặt lại đếm ⇒ lỗi đầu của sự cố mới KHÔNG giao");
  await vong(t0 + 220_000);
  assert.equal((await viecMo(X)).length, 0, "lượt 2 của sự cố mới: chưa giao");
  await vong(t0 + 460_000);
  const v = await viecMo(X);
  assert.equal(v.length, 1, "lượt 3 của sự cố mới ⇒ giao");
  assert.match(v[0].ly_do_day, /6′/, `thời gian tính từ lỗi đầu của sự cố MỚI: ${v[0].ly_do_day}`);
  assert.ok(v[0].ly_do_day.includes("2026-10-07T02:00:00"), "mốc thô là lần khách nhắn mới nhất");
  khongChan();
});

test("GL3c P4 · như P3 nhưng X do SALE giữ ⇒ lượt 3 KHÔNG việc mới, hội thoại giữ nguyên, mốc ghi (không đọc X nữa); sale trả AI + khách nhắn mới ⇒ đếm lại, lượt 3 mới giao", async () => {
  const P = await taoPage("gl3c-p4"); await chiBat(P);
  const X = "p4-x";
  const ht = await baoDamHoiThoai(sb.pool, { teamId: team, pageRowId: PAGE_ROW.get(P), psid: X });
  await sb.pool.query("UPDATE hoi_thoai SET chu_so_huu='SALE', trang_thai='HANDOFF', ly_do_cuoi='sale_tu_nhan' WHERE id=$1", [ht.id]);
  CHE_GET.set(X, "thieuMa"); CONVS.set(P, [conv(X)]);
  const t0 = 2_200_000_000;
  for (const s of [0, 30, 90]) {
    const g0 = goi.length;
    await vong(t0 + s * 1000);
    assert.equal(dem(g0, { psid: X, loai: "messages" }), 1, `t0+${s}s: đã chạm X`);
  }
  const h = await hoiThoai(P, X);
  assert.deepEqual([h.chu_so_huu, h.trang_thai, h.ly_do_cuoi], ["SALE", "HANDOFF", "sale_tu_nhan"], "sale đang giữ ⇒ không đụng");
  assert.equal((await viecMo(X)).length, 0, "không việc mới");
  assert.equal((await nhatKyGiao(h.id)).length, 0, "không nhật ký giao");
  const g1 = goi.length;
  await vong(t0 + 400_000);
  assert.equal(dem(g1, { psid: X, loai: "messages" }), 0, "mốc ghi ⇒ không đọc X nữa");
  // /code-review #5: sale trả AI, khách nhắn MỚI, Pancake vẫn lỗi ⇒ sự cố mới, đếm lại từ đầu (không mang 3 lượt cũ)
  assert.equal((await resumeConversation(sb.pool, { teamId: team, id: h.id, reason: "ca GL3c — sale trả AI" })).ok, true);
  CONVS.set(P, [conv(X, "2026-10-07T03:00:00")]);
  const g2 = goi.length;
  await vong(t0 + 500_000);
  assert.equal(dem(g2, { psid: X, loai: "messages" }), 1, "khách nhắn mới ⇒ đọc lại X");
  assert.equal((await viecMo(X)).length, 0, "lỗi ĐẦU của sự cố mới KHÔNG giao");
  await vong(t0 + 530_000);
  assert.equal((await viecMo(X)).length, 0, "lượt 2: chưa giao");
  await vong(t0 + 590_000);
  assert.equal((await viecMo(X)).length, 1, "lượt 3 của sự cố mới ⇒ giao CÓ việc");
  khongChan();
});
