// PHIẾU GL3c VÒNG 2 — bốn chỗ đối kháng phá được ở vòng 1 (verdict refute-gl3c F1–F4), mỗi chỗ một nhóm ca:
//   · F2 (hồi quy «giữ thường trực»): bộ nạp chỉ đếm lỗi KÊNH của một hội thoại vào ngắt GL4 ở lượt lỗi ĐẦU của một sự cố — lượt đọc lại
//     của CÙNG sự cố không nạp lại đếm (một hội thoại hỏng bền không được biến một lượt chập đơn lẻ của khách khác thành ngắt 30′);
//   · F1: lỗi KÊNH ở RIÊNG một hội thoại có lối ra — đủ 5 lượt (≈ 7,5′ theo lịch lùi) mà page KHÔNG ngắt ⇒ giao sale CÓ việc (cùng hàm,
//     cùng điều kiện với nhánh lỗi dữ liệu); page đang ngắt thì chưa giao; quãng ngắt đọc (sự cố mới) ⇒ đếm lại từ 1;
//   · F3: lỗi đọc HTTP ≥ 500 / 408 / 429, hoặc thân không nhận ra được ⇒ lỗi KÊNH; chỉ câu dữ liệu ĐÃ BIẾT («Thiếu mã khách hàng») và thân
//     2xx thiếu danh sách tin mới là lỗi DỮ LIỆU — Pancake chập 5xx thân JSON không còn giao sale hàng loạt;
//   · F4: vòng nạp NÉM trước/giữa bước nạp vẫn cắt chuỗi «danh sách lỗi liên tục» (quãng không quan sát); vòng XỬ ném thì không đụng.
//
// Khung ca (fetch giả · 2 token giả · van mở trong env tiến trình ca · hộp cát riêng · cửa THẬT napTuPoll/docTin → pkFetchPage) chép
// nguyên từ test/gl3c-nap-loi.test.mjs (dòng 17–203) — cùng luật: CẤM tiêm docHoiThoai/docTin; mỗi napTuPoll khẳng định `mo === true`;
// mỗi phép phủ định kèm vế «ĐÃ CHẠM»; «qua 30′» = UPDATE ngat_den (đồng hồ CSDL) rồi motLuot mở THẬT.
// Hằng của phiếu viết TAY ở đây (5 lượt · lịch lùi 30 s·2ⁿ) — không lấy đáp án từ chính mã bị đo.
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
  sb = await dungSandbox("gl3c_v2");
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

/* ═══════════════════════ GL3c VÒNG 2 — đối kháng F1–F4 ═══════════════════════ */
const LUOT_KENH = 5;                         // phiếu vòng 2: «tới 5 lượt lỗi kênh mà page không ngắt ⇒ giao»
const LICH_KENH = [0, 30, 90, 210, 450];     // giây — 5 lượt đọc lỗi của MỘT sự cố theo lịch lùi 30 s·2ⁿ (trần 5′)
const thanLoi = (status, j) => () => ({ status, json: async () => j });
Object.assign(GET, {
  json500: thanLoi(500, { success: false, message: "Internal Server Error" }),
  json503: thanLoi(503, { success: false, message: "Service Unavailable" }),
  json429: thanLoi(429, { success: false, message: "Too many requests" }),
  json408: thanLoi(408, { success: false, message: "Request Timeout" }),
  thieuMa500: thanLoi(500, { success: false, message: "Thiếu mã khách hàng" }),
  thieuMa404: thanLoi(404, { success: false, message: "Thiếu mã khách hàng" }),
  thieuMa429: thanLoi(429, { success: false, message: "Thiếu mã khách hàng" }),
  thieuMa408: thanLoi(408, { success: false, message: "Thiếu mã khách hàng" }),
  khongDs: () => tl({ success: true }),
  cauLa: () => tl({ success: false, message: "Hệ thống đang bảo trì, vui lòng thử lại" }),
  rongObj: () => tl({}),
  nullBody: () => tl(null),
  khongCau: () => tl({ success: false }),
  goiCuoc121: () => tl({ success: false, message: "Không tìm thấy gói cước của trang này" }),
  okCoCau: () => tl({ success: true, message: "OK" }),                                             // /code-review #7
  goiCuocKhongSuccess: () => tl({ message: "Không tìm thấy gói cước của trang này" }),             // /code-review #2
  goiCuocMaLa: () => tl({ success: false, error_code: 122, message: "Không tìm thấy gói cước của trang này" }),
});
DS.json500 = thanLoi(500, { success: false, message: "Internal Server Error" });
DS.nullBody = () => tl(null);
const nem = async () => { throw new Error("CSDL chập (giả)"); };

/* ─── F1 — lỗi KÊNH ở RIÊNG một hội thoại có lối ra ─── */

test("GL3c V1a · F1: MỘT khách X, /messages 502 bền (lỗi KÊNH), page không ngắt ⇒ lượt 1–4 (0·30·90·210 s) chưa giao, đếm GL4 = 1; lượt 5 (450 s) ⇒ SALE/HANDOFF, ĐÚNG 1 việc nói «lỗi kênh ở riêng hội thoại này» · 5 lượt · 8′ · mốc thô; không đọc X nữa; «trả AI» THÀNH", async () => {
  const P = await taoPage("gl3c-v1a"); await chiBat(P);
  const X = "v1a-x"; CHE_GET.set(X, "502"); CONVS.set(P, [conv(X)]);
  const t0 = 4_000_000_000;
  for (let s = 0; s < 450; s += 30) {
    const g0 = goi.length;
    const { ket } = await vong(t0 + s * 1000);
    assert.equal(ket.nap.mo, true, "bộ nạp phải MỞ");
    const doc = LICH_KENH.includes(s) ? 1 : 0;
    assert.equal(dem(g0, { psid: X, loai: "messages" }), doc, `t0+${s}s: GET X = ${doc} (${doc ? "đọc lại" : "đang lùi"})`);
    assert.equal((await viecMo(X)).length, 0, `t0+${s}s: CHƯA giao (lượt < ${LUOT_KENH})`);
    assert.equal((await hoiThoai(P, X)).chu_so_huu, "AI");
    const p = await trangPage(P);
    assert.equal(p.ngat_ly_do, "", "MỘT hội thoại lỗi kênh ⇒ page KHÔNG ngắt");
    assert.equal(p.loi_doc_lien_tiep, 1, `t0+${s}s: đếm GL4 = 1`);
  }
  const g1 = goi.length;
  await vong(t0 + 450_000);
  assert.equal(dem(g1, { psid: X, loai: "messages" }), 1, "lượt 5: đã chạm X");
  const h = await hoiThoai(P, X);
  assert.deepEqual([h.chu_so_huu, h.trang_thai, h.ly_do_cuoi], ["SALE", "HANDOFF", "doc_lich_su_loi_ben"]);
  const v = await viecMo(X);
  console.log(`   [gl3c] V1a việc: «${v[0]?.ly_do_day}»`);
  assert.equal(v.length, 1, "ĐÚNG 1 dòng việc");
  assert.match(v[0].ly_do_day, /lỗi kênh ở riêng hội thoại này/, "nói đúng loại lỗi (kênh, riêng hội thoại — khác lỗi dữ liệu)");
  assert.match(v[0].ly_do_day, /5 lượt/); assert.match(v[0].ly_do_day, /8′/, "thời gian THẬT từ lần lỗi đầu (450 s)");
  assert.match(v[0].ly_do_day, /HTTP 502/, "nói câu lỗi"); assert.match(v[0].ly_do_day, /CHƯA trả lời/);
  assert.ok(v[0].ly_do_day.includes("2026-10-07T01:00:00"), "mốc THÔ «khách nhắn lần cuối»");
  khongLoTok(v[0].ly_do_day);
  assert.equal((await nhatKyGiao(h.id)).length, 1, "1 dòng nhat_ky giao");
  assert.equal((await trangPage(P)).ngat_ly_do, "", "giao xong page vẫn không ngắt");
  const g2 = goi.length;
  await vong(t0 + 900_000);
  assert.equal(dem(g2, { psid: X, loai: "messages" }), 0, "đã giao ⇒ mốc ghi ⇒ không đọc X nữa");
  assert.equal((await viecMo(X)).length, 1, "không việc thứ hai");
  const tra = await resumeConversation(sb.pool, { teamId: team, id: h.id, reason: "ca GL3c V1a — sale trả AI" });
  assert.equal(tra.ok, true, "«trả AI» THÀNH");
  khongChan();
});

test("GL3c V1b · F1 «page KHÔNG ngắt»: X lỗi kênh bền khi page đang ngắt vì GỬI (vẫn nạp) ⇒ 6 lượt KHÔNG tích lượt giao, đếm GL4 đứng yên; qua hạn ngắt (mở thật) ⇒ lượt đầu sau mở đếm GL4 (khoá -X), lượt 5 SAU MỞ mới giao, việc nói 20′", async () => {
  const P = await taoPage("gl3c-v1b"); await chiBat(P);
  await sb.pool.query("UPDATE page SET ngat_den = now() + interval '20 minutes', ngat_vi='gui', ngat_ly_do='Pancake từ chối gửi (mã 105)' WHERE page_id=$1", [P]);
  const X = "v1b-x"; CHE_GET.set(X, "502"); CONVS.set(P, [conv(X)]);
  const t0 = 4_100_000_000;
  for (const s of [...LICH_KENH, 750]) {
    const g0 = goi.length;
    await vong(t0 + s * 1000);
    assert.equal(dem(g0, { psid: X, loai: "messages" }), 1, `t0+${s}s: ngắt GỬI vẫn nạp — đã chạm X`);
    assert.equal((await viecMo(X)).length, 0, `t0+${s}s: page đang ngắt ⇒ KHÔNG giao`);
    assert.equal((await hoiThoai(P, X)).chu_so_huu, "AI");
  }
  let p = await trangPage(P);
  assert.equal(p.ngat_vi, "gui", "dựng cảnh: page vẫn ngắt gửi suốt 6 lượt");
  assert.equal(p.loi_doc_lien_tiep, 0, "đang ngắt: bộ đếm GL4 đứng yên");
  await quaBaMuoi(P);
  const htX = (await hoiThoai(P, X)).id;
  for (const [i, s] of [1050, 1350, 1650, 1950].entries()) {
    const g = goi.length;
    await vong(t0 + s * 1000);
    if (i === 0) {
      assert.equal((await nhatKyPage("page_mo_lai_kenh", P)).length, 1, "đã mở lại thật");
      p = await trangPage(P);
      assert.equal(p.loi_doc_lien_tiep, 1, "lượt đầu SAU MỞ đếm GL4 lại"); assert.equal(String(p.loi_doc_tin_cuoi), `-${htX}`);
    }
    assert.equal(dem(g, { psid: X, loai: "messages" }), 1, `sau mở lượt ${i + 1}: đã chạm X`);
    assert.equal((await viecMo(X)).length, 0, `sau mở lượt ${i + 1}: KHÔNG giao (lượt tích lúc ngắt không tính)`);
  }
  await vong(t0 + 2_250_000);
  const v = await viecMo(X);
  console.log(`   [gl3c] V1b sau mở: «${v[0]?.ly_do_day}»`);
  assert.equal(v.length, 1, "lượt 5 sau mở ⇒ giao CÓ việc");
  assert.match(v[0].ly_do_day, /5 lượt/); assert.match(v[0].ly_do_day, /20′/, "thời gian tính từ lượt đầu SAU MỞ");
  khongChan();
});

test("GL3c V1e · F1 không giao hàng loạt sau ngắt GỬI: X, Y lỗi kênh bền suốt quãng page ngắt gửi (6 lượt) → qua hạn (mở thật) ⇒ vòng kế page NGẮT ĐỌC (lượt đầu sau mở của X, Y đếm GL4), 0 việc, cả hai vẫn của AI", async () => {
  const P = await taoPage("gl3c-v1e"); await chiBat(P);
  await sb.pool.query("UPDATE page SET ngat_den = now() + interval '20 minutes', ngat_vi='gui', ngat_ly_do='Pancake từ chối gửi (mã 105)' WHERE page_id=$1", [P]);
  const ks = ["v1e-x", "v1e-y"];
  for (const k of ks) CHE_GET.set(k, "502");
  CONVS.set(P, ks.map((k) => conv(k)));
  const t0 = 4_150_000_000;
  for (const s of [...LICH_KENH, 750]) {
    const g0 = goi.length;
    await vong(t0 + s * 1000);
    for (const k of ks) {
      assert.equal(dem(g0, { psid: k, loai: "messages" }), 1, `t0+${s}s: đã chạm ${k}`);
      assert.equal((await viecMo(k)).length, 0, `t0+${s}s: ${k} — page đang ngắt ⇒ KHÔNG giao`);
    }
  }
  await quaBaMuoi(P);
  await vong(t0 + 1_050_000);
  assert.equal((await nhatKyPage("page_mo_lai_kenh", P)).length, 1, "đã mở lại thật");
  const p = await trangPage(P);
  console.log(`   [gl3c] V1e sau mở: vi=«${p.ngat_vi}» «${p.ngat_ly_do}»`);
  assert.equal(p.ngat_vi, "doc", "Pancake vẫn sập ⇒ lượt đầu sau mở của hai khách ⇒ GL4 ngắt đọc");
  for (const k of ks) {
    assert.equal((await viecMo(k)).length, 0, `${k}: KHÔNG giao (không giao hàng loạt)`);
    assert.equal((await hoiThoai(P, k)).chu_so_huu, "AI");
  }
  khongChan();
});

test("GL3c V1c · F1 khác lỗi dữ liệu: X lỗi kênh lượt 1–4 → page ngắt ĐỌC (Z cùng vòng) → qua 30′ (mở thật) → X lỗi tiếp ⇒ sự cố MỚI: đếm GL4 lại 1 (khoá -X), lượt 1–4 mới KHÔNG giao, lượt 5 mới giao, việc nói 8′", async () => {
  const P = await taoPage("gl3c-v1c"); await chiBat(P);
  const X = "v1c-x"; const Z = "v1c-z";
  CHE_GET.set(X, "502"); CHE_GET.set(Z, "502"); CONVS.set(P, [conv(X)]);
  const t0 = 4_200_000_000;
  for (const s of LICH_KENH.slice(0, 3)) await vong(t0 + s * 1000);
  CONVS.set(P, [conv(X), conv(Z)]);
  const g0 = goi.length;
  await vong(t0 + 210_000);
  assert.equal(dem(g0, { psid: X, loai: "messages" }) + dem(g0, { psid: Z, loai: "messages" }), 2, "đã chạm X (lượt 4) và Z (lượt 1)");
  assert.equal((await trangPage(P)).ngat_vi, "doc", "dựng cảnh: X (đếm 1 từ lượt đầu, chưa lượt đọc OK nào) + Z ⇒ ngắt đọc");
  assert.equal((await viecMo(X)).length, 0, "lượt 4: chưa giao");
  CONVS.set(P, [conv(X)]);
  const g1 = goi.length;
  await vong(t0 + 216_000);
  assert.equal(dem(g1, { page: P, method: null }), 0, "trong lúc ngắt: 0 fetch cho P");
  await quaBaMuoi(P);
  const htX = (await hoiThoai(P, X)).id;
  const t1 = t0 + 31 * PHUT;
  for (const [i, s] of LICH_KENH.slice(0, 4).entries()) {
    const g = goi.length;
    await vong(t1 + s * 1000);
    if (i === 0) {
      assert.equal((await nhatKyPage("page_mo_lai_kenh", P)).length, 1, "đã mở lại thật");
      const p = await trangPage(P);
      assert.equal(p.loi_doc_lien_tiep, 1, "lượt ĐẦU của sự cố mới đếm lại GL4 (mở rồi phải đủ ngưỡng)");
      assert.equal(String(p.loi_doc_tin_cuoi), `-${htX}`);
    }
    assert.equal(dem(g, { psid: X, loai: "messages" }), 1, `sự cố mới lượt ${i + 1}: đã chạm X`);
    assert.equal((await viecMo(X)).length, 0, `sự cố mới lượt ${i + 1}: KHÔNG giao (quãng ngắt đọc đặt lại đếm kênh)`);
  }
  await vong(t1 + 450_000);
  const v = await viecMo(X);
  console.log(`   [gl3c] V1c việc sau quãng ngắt: «${v[0]?.ly_do_day}»`);
  assert.equal(v.length, 1, "lượt 5 của sự cố mới ⇒ giao");
  assert.match(v[0].ly_do_day, /5 lượt/); assert.match(v[0].ly_do_day, /8′/, "thời gian tính từ lỗi ĐẦU của sự cố MỚI");
  khongChan();
});

test("GL3c V1d · F1 rời đi: X lỗi kênh lượt 1–4 → sale trả lời (page nói cuối — X RỜI ĐI) → khách nhắn lại, Pancake vẫn lỗi ⇒ đếm kênh lại từ 1 (như lỗi dữ liệu P3c): lượt kế KHÔNG giao; lượt 5 của sự cố mới mới giao", async () => {
  const P = await taoPage("gl3c-v1d"); await chiBat(P);
  const X = "v1d-x"; CHE_GET.set(X, "502"); CONVS.set(P, [conv(X)]);
  const t0 = 4_250_000_000;
  for (const s of LICH_KENH.slice(0, 4)) await vong(t0 + s * 1000);
  assert.equal((await viecMo(X)).length, 0, "dựng cảnh: 4 lượt lỗi kênh, chưa giao");
  CONVS.set(P, [{ ...conv(X), last_sent_by: { admin_id: P, id: P, admin_name: "Sale" } }]);
  const g0 = goi.length;
  await vong(t0 + 220_000);
  assert.equal(dem(g0, { psid: X, loai: "messages" }), 0, "page nói cuối ⇒ không đọc (X rời đi)");
  CONVS.set(P, [conv(X, "2026-10-07T02:00:00")]);
  // lịch lùi GIỮ (neo gl3b ⑤o): hết lùi của lượt 4 ở 450 s, rồi mỗi 5′ — chỉ đếm giao đặt lại
  for (const [i, s] of [450, 750, 1050, 1350].entries()) {
    const g = goi.length;
    await vong(t0 + s * 1000);
    assert.equal(dem(g, { psid: X, loai: "messages" }), 1, `sự cố mới lượt ${i + 1} (t0+${s}s): đã chạm X`);
    assert.equal((await viecMo(X)).length, 0, `sự cố mới lượt ${i + 1}: KHÔNG giao (rời đi đã đặt lại đếm kênh)`);
  }
  await vong(t0 + 1_650_000);
  const v = await viecMo(X);
  console.log(`   [gl3c] V1d việc sau khi rời đi: «${v[0]?.ly_do_day}»`);
  assert.equal(v.length, 1, "lượt 5 của sự cố mới ⇒ giao");
  assert.match(v[0].ly_do_day, /5 lượt/); assert.match(v[0].ly_do_day, /20′/, "thời gian tính từ lỗi đầu của sự cố MỚI (450 s → 1650 s)");
  assert.ok(v[0].ly_do_day.includes("2026-10-07T02:00:00"), "mốc thô là lần khách nhắn mới nhất");
  khongChan();
});

/* ─── F2 — hội thoại hỏng bền không «giữ thường trực» bộ đếm ─── */

test("GL3c V2a · F2 (hồi quy «giữ thường trực»): X lỗi kênh bền ở bộ nạp — lượt 1 đếm 1 → khách W đọc OK (về 0) → X đọc lại lượt 2 KHÔNG nạp lại đếm → khách Z chập ĐÚNG một lượt ở worker ⇒ KHÔNG ngắt (đếm 1); Z đọc lại OK ⇒ tin Z xong", async () => {
  const P = await taoPage("gl3c-v2a"); await chiBat(P);
  const X = "v2a-x"; const W = "v2a-w"; const Z = "v2a-z";
  CHE_GET.set(X, "502"); CONVS.set(P, [conv(X)]);
  const t0 = 4_300_000_000;
  const g0 = goi.length;
  await napXen(P, t0);
  assert.equal(dem(g0, { psid: X, loai: "messages" }), 1, "đã chạm X lượt 1");
  const htX = (await hoiThoai(P, X)).id;
  let p = await trangPage(P);
  assert.equal(p.loi_doc_lien_tiep, 1, "lượt ĐẦU của sự cố đếm vào GL4"); assert.equal(String(p.loi_doc_tin_cuoi), `-${htX}`);
  const tW = await xep(P, W);
  await xuXen(P);
  assert.equal((await tin(tW)).trang_thai, "xong", "W đọc OK, bot trả lời");
  assert.equal((await trangPage(P)).loi_doc_lien_tiep, 0, "đọc OK xoá chuỗi đọc");
  const g1 = goi.length;
  await napXen(P, t0 + 30_000);
  assert.equal(dem(g1, { psid: X, loai: "messages" }), 1, "đã chạm X lượt 2 (hết lùi 30 s)");
  p = await trangPage(P);
  console.log(`   [gl3c] V2a sau X lượt 2: đếm=${p.loi_doc_lien_tiep} khoá=${p.loi_doc_tin_cuoi}`);
  assert.equal(p.loi_doc_lien_tiep, 0, "lượt đọc lại của CÙNG sự cố KHÔNG nạp lại đếm");
  const tZ = await xep(P, Z); CHE_GET.set(Z, "502");
  const g2 = goi.length;
  await xuXen(P);
  assert.equal(dem(g2, { psid: Z, loai: "messages" }), 1, "đã chạm Z (chập đúng một lượt)");
  p = await trangPage(P);
  console.log(`   [gl3c] V2a X bền + Z chập 1 lượt: ngắt «${p.ngat_ly_do}» đếm=${p.loi_doc_lien_tiep}`);
  assert.equal(p.ngat_ly_do, "", "một lượt chập đơn lẻ của MỘT khách không được làm page im 30′");
  assert.equal(p.loi_doc_lien_tiep, 1);
  CHE_GET.set(Z, "ok"); await toiLuot(tZ); await xuXen(P);
  assert.equal((await tin(tZ)).trang_thai, "xong", "Z đọc lại OK ⇒ bot trả lời");
  khongChan();
});

test("GL3c V2b · F2 biên (RF1d nguyên văn — ĐÚNG luật GL4): lỗi ĐẦU của X ở bộ nạp rồi NGAY một lượt chập của Z ở worker, không lượt đọc OK nào chen giữa ⇒ NGẮT (hai khoá khác nhau liền nhau, như P2/P2b — bộ nạp vẫn đếm lượt đầu của sự cố)", async () => {
  const P = await taoPage("gl3c-v2b"); await chiBat(P);
  const X = "v2b-x"; const Z = "v2b-z"; CHE_GET.set(X, "502"); CONVS.set(P, [conv(X)]);
  await napXen(P, 4_350_000_000);
  assert.equal((await trangPage(P)).loi_doc_lien_tiep, 1, "X lượt đầu đếm 1");
  await xep(P, Z); CHE_GET.set(Z, "502");
  const g0 = goi.length;
  await xuXen(P);
  assert.equal(dem(g0, { psid: Z, loai: "messages" }), 1, "đã chạm Z");
  const p = await trangPage(P);
  console.log(`   [gl3c] V2b X lỗi đầu + Z chập: vi=«${p.ngat_vi}» «${p.ngat_ly_do}»`);
  assert.equal(p.ngat_vi, "doc", "hai hội thoại khác nhau lỗi kênh liền nhau ⇒ ngắt (luật GL4)");
  khongChan();
});

test("GL3c V2c · F2 (/code-review #6): X lỗi DỮ LIỆU lượt 1 rồi Pancake sập (lỗi KÊNH ở lượt 2 — lan 2) ⇒ lỗi KÊNH ĐẦU của sự cố vẫn đếm GL4 (đếm 1, khoá -X)", async () => {
  const P = await taoPage("gl3c-v2c"); await chiBat(P);
  const X = "v2c-x"; CHE_GET.set(X, "thieuMa"); CONVS.set(P, [conv(X)]);
  const t0 = 4_380_000_000;
  await napXen(P, t0);
  assert.equal((await trangPage(P)).loi_doc_lien_tiep, 0, "lỗi dữ liệu không đếm GL4");
  CHE_GET.set(X, "502");
  const g0 = goi.length;
  await napXen(P, t0 + 30_000);
  assert.equal(dem(g0, { psid: X, loai: "messages" }), 1, "đã chạm X lượt 2");
  const p = await trangPage(P);
  console.log(`   [gl3c] V2c dữ liệu → kênh: đếm=${p.loi_doc_lien_tiep} khoá=${p.loi_doc_tin_cuoi}`);
  assert.equal(p.loi_doc_lien_tiep, 1, "lỗi KÊNH đầu của sự cố đếm vào GL4");
  assert.equal(String(p.loi_doc_tin_cuoi), `-${(await hoiThoai(P, X)).id}`);
  khongChan();
});

/* ─── F3 — 5xx thân JSON / thân lạ là lỗi KÊNH ─── */

test("GL3c V3a · F3: /messages HTTP 500 thân JSON {success:false} (KHÔNG mã) ở X, Y, Z trong 100 s rồi lành ⇒ lỗi KÊNH: page ngắt đọc nói «HTTP 500», KHÔNG ai thành SALE, 0 việc; qua 30′ (mở thật) ⇒ cả ba vào hàng, bot trả lời", async () => {
  const P = await taoPage("gl3c-v3a"); await chiBat(P);
  const ks = ["v3a-x", "v3a-y", "v3a-z"];
  for (const k of ks) CHE_GET.set(k, "json500");
  CONVS.set(P, ks.map((k) => conv(k)));
  const t0 = 4_400_000_000;
  const g0 = goi.length;
  for (let s = 0; s < 100; s += 10) await vong(t0 + s * 1000);
  assert.ok(dem(g0, { psid: ks[0], loai: "messages" }) >= 1 && dem(g0, { psid: ks[1], loai: "messages" }) >= 1, "đã chạm X, Y");
  const p = await trangPage(P);
  console.log(`   [gl3c] V3a JSON 500: vi=«${p.ngat_vi}» «${p.ngat_ly_do}»`);
  assert.equal(p.ngat_vi, "doc", "hai hội thoại lỗi KÊNH (HTTP 500) ⇒ ngắt đọc");
  assert.match(p.ngat_ly_do, /HTTP 500/, "lý do nói mã HTTP"); khongLoTok(p.ngat_ly_do);
  for (const k of ks) CHE_GET.set(k, "ok");
  for (let s = 100; s <= 400; s += 10) await vong(t0 + s * 1000);
  for (const k of ks) {
    assert.equal((await hoiThoai(P, k))?.chu_so_huu ?? "AI", "AI", `${k}: chập 5xx KHÔNG được giao sale`);
    assert.equal((await viecMo(k)).length, 0, `${k}: 0 việc`);
  }
  await quaBaMuoi(P);
  await vong(t0 + 31 * PHUT);
  assert.equal((await nhatKyPage("page_mo_lai_kenh", P)).length, 1, "đã mở lại thật");
  for (const k of ks) {
    const t = await tinCua(k);
    assert.equal(t.length, 1, `${k}: vào hàng sau khi lành`); assert.equal(t[0].trang_thai, "xong", `${k}: bot trả lời`);
  }
  khongChan();
});

test("GL3c V3b · F3 bảng phân loại lỗi đọc (pkDocTin · pkGetConversations, fetch giả): HTTP ≥ 500 · 408 · 429 · thân lạ ⇒ KÊNH; chỉ «Thiếu mã khách hàng» (HTTP không phải 5xx/408/429) và thân 2xx thiếu danh sách tin ⇒ DỮ LIỆU", async () => {
  const { pkDocTin, pkGetConversations } = await import("../src/pancake.js");
  const P = "gl3c-v3b";
  const bang = [
    ["json500", true], ["json503", true], ["json429", true], ["json408", true], ["502", true],
    ["thieuMa500", true], ["thieuMa429", true], ["thieuMa408", true],   // mã HTTP thắng câu đã biết
    ["cauLa", true], ["rongObj", true], ["nullBody", true], ["khongCau", true], ["goiCuoc121", true],
    ["goiCuocKhongSuccess", true], ["goiCuocMaLa", true],               // «gói cước» lệch hình đã đo ⇒ thân lạ ⇒ KÊNH
    ["thieuMa", false], ["thieuMa404", false], ["khongDs", false], ["okCoCau", false],
  ];
  const ra = [];
  for (const [che, kenh] of bang) {
    const psid = `v3b-${che}`; CHE_GET.set(psid, che);
    const g0 = goi.length;
    const kq = await pkDocTin(P, `conv-${psid}`, "cust");
    ra.push(`${che}:${kq.capKenh ? "KÊNH" : "dữ liệu"} «${kq.loi}»`);
    assert.equal(dem(g0, { psid, loai: "messages" }), 1, `${che}: đã chạm Pancake đúng 1 lượt (không xoay token)`);
    assert.equal(kq.ok, false, `${che}: lỗi đọc`);
    assert.equal(kq.capKenh, kenh, `${che}: phải là ${kenh ? "KÊNH" : "DỮ LIỆU"} — câu «${kq.loi}»`);
    khongLoTok(kq.loi);
  }
  console.log(`   [gl3c] V3b ${ra.join(" · ")}`);
  const loi500 = await pkDocTin(P, "conv-v3b-json500", "cust");
  assert.match(loi500.loi, /HTTP 500/, "câu lỗi 5xx nói mã HTTP");
  assert.match((await pkDocTin(P, "conv-v3b-rongObj", "cust")).loi, /thân rỗng/, "mã HTTP không liệt kê — {} vẫn là «thân rỗng»");
  const ds = "gl3c-v3b-ds"; CHE_DS.set(ds, "json500");
  const soLoi = {};
  assert.deepEqual(await pkGetConversations(ds, soLoi), [], "giá trị trả giữ nguyên (mảng)");
  assert.equal(soLoi.ok, false); assert.equal(soLoi.capKenh, true, "danh sách HTTP 500 JSON ⇒ lỗi KÊNH");
  assert.match(soLoi.loi, /HTTP 500/);
  const dsNull = "gl3c-v3b-null"; CHE_DS.set(dsNull, "nullBody");
  const soLoi2 = {};
  assert.deepEqual(await pkGetConversations(dsNull, soLoi2), [], "thân JSON null ⇒ vẫn trả mảng, không ném TypeError");
  assert.equal(soLoi2.ok, false, "thân null ⇒ lỗi danh sách"); assert.equal(soLoi2.capKenh, true, "thân null ⇒ KÊNH");
});

test("GL3c V3c · F3 ở worker: tin A, B (khác khách) đọc HTTP 500 JSON không mã ⇒ lỗi KÊNH đếm GL4 ⇒ ngắt đọc (trước vòng 2: lỗi dữ liệu, không đếm)", async () => {
  const P = await taoPage("gl3c-v3c"); await chiBat(P);
  const ids = [];
  for (const k of ["v3c-a", "v3c-b"]) { CHE_GET.set(k, "json500"); ids.push(await xep(P, k)); }
  const g0 = goi.length;
  await xuXen(P); await xuXen(P);
  assert.equal(dem(g0, { psid: "v3c-a", loai: "messages" }) + dem(g0, { psid: "v3c-b", loai: "messages" }), 2, "đã chạm A, B");
  for (const id of ids) assert.match((await tin(id)).ly_do, /^LoiDocLichSu/);
  const p = await trangPage(P);
  console.log(`   [gl3c] V3c worker JSON 500: vi=«${p.ngat_vi}» «${p.ngat_ly_do}»`);
  assert.equal(p.ngat_vi, "doc"); assert.match(p.ngat_ly_do, /HTTP 500/); khongLoTok(p.ngat_ly_do);
  khongChan();
});

/* ─── F4 — vòng nạp NÉM vẫn cắt chuỗi lỗi danh sách ─── */

test("GL3c V4a · F4: danh sách lỗi (t0) → Pancake lành → 10′ motLuot NÉM trước bước nạp (xen hai điểm ném: dsPage · dsChoPhep) → MỘT vòng danh sách lỗi ⇒ KHÔNG ngắt; tiếp đủ 2′ lỗi liên tục ⇒ ngắt (luật vẫn chạy)", async () => {
  const P = await taoPage("gl3c-v4a"); await chiBat(P);
  CHE_DS.set(P, "502"); CONVS.set(P, []);
  const t0 = 4_500_000_000;
  const { log } = await vong(t0);
  assert.match(log, /1 page lỗi danh sách/, "dựng cảnh: chuỗi bắt đầu t0");
  CHE_DS.set(P, "ok");
  for (let s = 6, i = 0; s < 600; s += 60, i++) {
    dongHo = t0 + s * 1000;
    await assert.rejects(cw.motLuot(sb.pool, { depsNap: depsNap(), depsXuLy: boNao(), ...(i % 2 ? { dsChoPhep: nem } : { dsPage: nem }) }), /CSDL chập/);
  }
  CHE_DS.set(P, "502");
  const g0 = goi.length;
  const { log: l2 } = await vong(t0 + 600_000);
  assert.equal(dem(g0, { page: P, loai: "conversations" }), 1, "đã chạm");
  console.log(`   [gl3c] V4a sau 10′ vòng nạp NÉM + 1 lỗi: ngắt «${(await trangPage(P)).ngat_ly_do}» · log «${l2.slice(0, 160)}»`);
  assert.equal((await trangPage(P)).ngat_ly_do, "", "quãng không quan sát phải cắt chuỗi — một lần lỗi không được ngắt 30′");
  await vong(t0 + 660_000);
  assert.equal((await trangPage(P)).ngat_ly_do, "", "60 s lỗi liên tục sau quãng: chưa ngắt");
  await vong(t0 + 720_000);
  assert.equal((await trangPage(P)).ngat_vi, "doc", "đủ 2′ lỗi liên tục sau quãng ⇒ ngắt");
  khongChan();
});

test("GL3c V4b · F4 biên: vòng XỬ (boQuaNap) NÉM giữa hai vòng nạp KHÔNG cắt chuỗi lỗi danh sách (không phải lượt quan sát của bộ nạp) ⇒ t0 lỗi · vòng xử ném · t0+2′ lỗi ⇒ ngắt", async () => {
  const P = await taoPage("gl3c-v4b"); await chiBat(P);
  CHE_DS.set(P, "502"); CONVS.set(P, []);
  const t0 = 4_600_000_000;
  const { log } = await vong(t0);
  assert.match(log, /1 page lỗi danh sách/, "dựng cảnh: chuỗi bắt đầu t0");
  dongHo = t0 + 60_000;
  await assert.rejects(cw.motLuot(sb.pool, { boQuaNap: true, dsChoPhep: nem, depsXuLy: boNao() }), /CSDL chập/);
  const g0 = goi.length;
  await vong(t0 + 120_000);
  assert.equal(dem(g0, { page: P, loai: "conversations" }), 1, "đã chạm");
  assert.equal((await trangPage(P)).ngat_vi, "doc", "vòng xử ném không xoá mốc ⇒ 2′ lỗi liên tục ⇒ ngắt");
  khongChan();
});
