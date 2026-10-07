// PHIẾU GL3c ④5 · ④6 — page WEBHOOK: worker tra mapping qua cửa `docHoiThoai` THẬT; danh sách hội thoại lỗi ⇒ cửa NÉM `LoiDocHoiThoai`
// ⇒ khối tra mapping ném lại `LoiDocLichSu` (giữ `capKenh`) ⇒ nhánh GL3b (lùi 15 s · 30 s, hết lượt giao sale CÓ việc, tin `xong`) — KHÔNG
// về `banGiaoLoi` cũ (không việc, «trả AI» bị chặn). Đọc được mà không mapping duy nhất ⇒ vẫn `LoiChoMappingPancake`.
// ④6 — `pkGetConversations` gọi KHÔNG `soLoi` (đường `src/orders/legacy.js`) giữ hành vi cũ: mảng khi đọc được, `[]` (không ném) khi lỗi.
//
// Đường đi THẬT: `nhanWebhook` → `worker#chayMotVong` → cửa `docHoiThoai` THẬT → `pkGetConversations` → `pkFetchPage` → fetch GIẢ (chỉ
// host pages.fm). CẤM tiêm `docHoiThoai` / `docTin` / `cua`. Van gửi mở CHỈ trong env tiến trình ca (worker không chốt `chan_guard` trước
// lượt đọc); 2 token giả; hộp cát Postgres riêng.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { chayMotVong } from "../src/queue/worker.js";
import { nhanWebhook } from "../src/queue/webhook.js";
import { resumeConversation } from "../src/queue/reconcile.js";
import * as cua from "../src/channels/messenger/index.js";
import { ctxHeThong } from "../src/db/index.js";
import { config } from "../src/config.js";
import { datKhoTokenDb, lamMoiTokenDb, listPancakeTokens, pkGetConversations } from "../src/pancake.js";
import { congHttpGhi } from "../src/chat/handler-v3.js";

const PW = "gl3c-webhook";
const PL = "gl3c-legacy";
const ENV = {
  V3_PANCAKE_GUI: "1",
  PANCAKE_READONLY: "0",
  V3_PANCAKE_HAN_DOC_MS: "150",
  V3_PANCAKE_HAN_GUI_MS: "300",
  PK_MARK_UNREAD: "0",
  V3_DIEN_TAP: undefined,
};
const envCu = {};
const cauHinhCu = {};
const goi = [];
const CHE_DS = new Map();
const CONVS = new Map();
let sb;
let team;
let chan0 = 0;

const tl = (j) => ({ status: 200, json: async () => j });
const DS = {
  ok: (page) => tl({ conversations: CONVS.get(page) || [] }),
  "502": () => ({ status: 502, json: async () => { throw new SyntaxError("Unexpected token <"); } }),
  mang: () => { throw new TypeError("fetch failed"); },
  khongDs: () => tl({ success: true }),
};

before(async () => {
  sb = await dungSandbox("gl3c_wh");
  console.log(`   [gl3c] hộp cát ${sb.ten}`);
  team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  await sb.pool.query(
    "INSERT INTO page(team_id,page_id,ten,nguon_tin,bot_ai_bat) VALUES($1,$2,'GL3c webhook','webhook',true), ($1,$3,'GL3c legacy','poll',false)",
    [team, PW, PL]);
  globalThis.fetch = async (u, init) => {
    const url = new URL(String(u));
    if (url.host !== "pages.fm") throw new Error(`ca GL3c: lượt gọi lạ ra ${url.host} — chặn`);
    const method = String(init?.method || "GET").toUpperCase();
    const page = decodeURIComponent(/\/pages\/([^/]+)/.exec(url.pathname)?.[1] || "");
    const loai = /\/messages$/.test(url.pathname) ? "messages" : url.pathname.split("/").pop();
    goi.push({ method, loai, page });
    if (method === "GET" && loai === "conversations") return DS[CHE_DS.get(page) || "ok"](page);
    return tl({ success: true });
  };
  cauHinhCu.pancakeToken = config.pancakeToken;
  cauHinhCu.pancakeTokensExtra = config.pancakeTokensExtra;
  config.pancakeToken = "";
  config.pancakeTokensExtra = [];
  datKhoTokenDb(async () => ["tokA", "tokB"]);
  assert.equal(await lamMoiTokenDb(), 2);
  assert.equal(listPancakeTokens().filter((t) => !t.expired).length, 2, "đúng 2 token giả");
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
  await sb?.don();
});

const body = (mid, psid) => ({ object: "page", entry: [{ id: PW, messaging: [{ sender: { id: psid }, message: { mid, text: "how much?" } }] }] });
async function tinMoi(psid, mid) {
  await nhanWebhook(sb.pool, body(mid, psid), { choPhep: () => true });
  return (await sb.pool.query("SELECT id FROM tin_cho_xu_ly WHERE psid=$1 AND msg_id=$2", [psid, mid])).rows[0].id;
}
const boNao = () => ({
  layKb: () => assert.fail("không được chạy bộ não khi chưa có mapping"),
  layModel: () => ({ maModel: "test" }),
  lanNhanh: () => assert.fail("không được chạy bộ não khi chưa có mapping"),
  kiemTinRa: () => ({ ok: true }),
});
const tin = async (id) => (await sb.pool.query(
  `SELECT trang_thai, so_lan_thu, ly_do, EXTRACT(EPOCH FROM (thu_lai_luc - now())) * 1000 AS con_ms FROM tin_cho_xu_ly WHERE id=$1`, [id])).rows[0];
const hoiThoai = async (psid) => (await sb.pool.query("SELECT id, chu_so_huu, trang_thai, ly_do_cuoi FROM hoi_thoai WHERE psid=$1", [psid])).rows[0];
const viecMo = async (htId) => (await sb.pool.query(
  "SELECT ly_do_day FROM viec_can_xu_ly WHERE hoi_thoai_id=$1 AND dong_luc IS NULL", [htId])).rows;
const toiLuot = (id) => sb.pool.query("UPDATE tin_cho_xu_ly SET thu_lai_luc = now() WHERE id=$1", [id]);
const dem = (tu, { page, loai, method = "GET" }) => goi.slice(tu).filter((g) => g.page === page && g.loai === loai && g.method === method).length;
const khongChan = () => assert.equal(congHttpGhi.daChan.length - chan0, 0, "cổng HTTP ghi KHÔNG được chặn lượt nào");

test("GL3c P5a · webhook: danh sách hội thoại 502 ở tra mapping ⇒ lượt 1 lùi 15 s · lượt 2 lùi 30 s (LoiDocLichSu «danh sách hội thoại», đếm GL4) · lượt 3 giao sale CÓ việc, tin `xong`, KHÔNG banGiaoLoi · «trả AI» THÀNH", { timeout: 30_000 }, async () => {
  const psid = "wh-a";
  CHE_DS.set(PW, "502");
  const id = await tinMoi(psid, "wh-a-1");
  for (const [lan, treMs] of [[1, 15_000], [2, 30_000]]) {
    const g0 = goi.length;
    const r = await chayMotVong(sb.pool, { pageIds: [PW], ...boNao() });
    const t = await tin(id);
    console.log(`   [gl3c] P5a lượt ${lan}: ketQua=${r?.ketQua} · con=${Math.round(t.con_ms)} ms · ly_do=${String(t.ly_do).slice(0, 120)}`);
    assert.equal(String(r?.tinId), String(id));
    assert.equal(r.ketQua, "thu_lai");
    assert.equal(dem(g0, { page: PW, loai: "conversations" }), 1, `lượt ${lan} đã chạm: 1 GET /conversations (502 ⇒ không xoay)`);
    assert.equal(dem(g0, { page: PW, loai: "messages" }), 0, "chưa có mapping ⇒ không đọc lịch sử");
    assert.match(t.ly_do, /^LoiDocLichSu: Pancake không trả danh sách hội thoại/);
    assert.match(t.ly_do, /HTTP 502/);
    assert.ok(t.con_ms >= treMs - 1500 && t.con_ms <= treMs + 50, `lùi ${Math.round(t.con_ms)} ms — phải ≈ ${treMs} ms (nhánh GL3b, không phải 5 s của LoiChoMappingPancake)`);
    const p = (await sb.pool.query("SELECT loi_doc_lien_tiep, ngat_ly_do FROM page WHERE page_id=$1", [PW])).rows[0];
    assert.equal(p.loi_doc_lien_tiep, 1, "lỗi danh sách cấp kênh ở worker ⇒ đếm GL4 theo capKenh (một khách = một khoá)");
    assert.equal(p.ngat_ly_do, "");
    await toiLuot(id);
  }
  const r = await chayMotVong(sb.pool, { pageIds: [PW], ...boNao() });
  const t = await tin(id);
  const ht = await hoiThoai(psid);
  const viec = await viecMo(ht.id);
  console.log(`   [gl3c] P5a lượt 3: ketQua=${r?.ketQua} · tin=${t.trang_thai}/${t.ly_do} · hội thoại=${ht.chu_so_huu}/${ht.trang_thai}/${ht.ly_do_cuoi} · việc «${viec[0]?.ly_do_day}»`);
  assert.equal(r.ketQua, "doc_loi_ban_giao");
  assert.equal(t.trang_thai, "xong"); assert.equal(t.ly_do, "doc_loi:ban_giao");
  assert.deepEqual([ht.chu_so_huu, ht.trang_thai], ["SALE", "HANDOFF"]);
  assert.notEqual(ht.ly_do_cuoi, "loi_xu_ly_can_doi_chieu", "KHÔNG đi banGiaoLoi cũ");
  assert.equal(ht.ly_do_cuoi, "doc_lich_su_loi");
  assert.equal(viec.length, 1, "giao sale CÓ dòng việc");
  const tra = await resumeConversation(sb.pool, { teamId: team, id: ht.id, reason: "ca GL3c — trả AI" });
  assert.equal(tra.ok, true, "«trả AI» THÀNH");
  khongChan();
});

test("GL3c P5b · webhook: danh sách ĐỌC ĐƯỢC mà không có mapping duy nhất ⇒ vẫn `LoiChoMappingPancake` (đường cũ, lùi 5 s)", async () => {
  const psid = "wh-b";
  CHE_DS.set(PW, "ok"); CONVS.set(PW, [{ id: "conv-khac", from_psid: "nguoi-khac", customers: [{ id: "c-khac" }] }]);
  const id = await tinMoi(psid, "wh-b-1");
  const g0 = goi.length;
  const r = await chayMotVong(sb.pool, { pageIds: [PW], ...boNao() });
  const t = await tin(id);
  assert.equal(String(r?.tinId), String(id)); assert.equal(r.ketQua, "thu_lai");
  assert.equal(dem(g0, { page: PW, loai: "conversations" }), 1, "đã chạm");
  assert.match(t.ly_do, /^LoiChoMappingPancake/);
  assert.ok(t.con_ms <= 5_050, `lùi 5 s của mapping, đo ${Math.round(t.con_ms)} ms`);
  khongChan();
});

test("GL3c P6 · `pkGetConversations` KHÔNG `soLoi` (đường legacy.js) giữ hành vi cũ; CÓ `soLoi` ⇒ nói lỗi; cửa `docHoiThoai` với hàm tiêm trả mảng (không điền soLoi) ⇒ đọc được", async () => {
  CONVS.set(PL, [{ id: "c1", from_psid: "p1" }]);
  CHE_DS.set(PL, "ok");
  let g0 = goi.length;
  assert.deepEqual(await pkGetConversations(PL), [{ id: "c1", from_psid: "p1" }], "đọc được ⇒ mảng");
  assert.equal(dem(g0, { page: PL, loai: "conversations" }), 1);
  CHE_DS.set(PL, "502"); g0 = goi.length;
  assert.deepEqual(await pkGetConversations(PL), [], "502 ⇒ [] như cũ, KHÔNG ném");
  assert.equal(dem(g0, { page: PL, loai: "conversations" }), 1, "502 ⇒ 1 lượt");
  CHE_DS.set(PL, "mang"); g0 = goi.length;
  assert.deepEqual(await pkGetConversations(PL), [], "lỗi mạng ⇒ [] như cũ");
  assert.equal(dem(g0, { page: PL, loai: "conversations" }), 2, "lỗi mạng ⇒ thử token kế (2 token)");
  // CÓ soLoi
  const s1 = {}; CHE_DS.set(PL, "502");
  assert.deepEqual(await pkGetConversations(PL, s1), [], "giá trị trả KHÔNG đổi");
  assert.equal(s1.ok, false); assert.equal(s1.capKenh, true); assert.match(String(s1.loi), /HTTP 502/);
  const s2 = {}; CHE_DS.set(PL, "khongDs");
  await pkGetConversations(PL, s2);
  assert.equal(s2.ok, false, "thân 200 không mảng = lỗi (N6)"); assert.equal(s2.capKenh, false); assert.match(String(s2.loi), /danh sách hội thoại/);
  const s3 = {}; CHE_DS.set(PL, "ok");
  await pkGetConversations(PL, s3);
  assert.equal(s3.ok, true);
  // cửa: hàm tiêm trả mảng mà không điền soLoi (mock l2-m1-nhac-truong) ⇒ đọc được, không ném
  assert.deepEqual(await cua.docHoiThoai(sb.pool, ctxHeThong(), { pageId: PL }, { getConversations: async () => [] }), []);
  // cửa THẬT: lỗi ⇒ NÉM LoiDocHoiThoai có câu + capKenh
  CHE_DS.set(PL, "502");
  const e = await cua.docHoiThoai(sb.pool, ctxHeThong(), { pageId: PL }).then(() => null, (x) => x);
  assert.ok(e, "cửa thật gặp danh sách lỗi phải NÉM");
  assert.equal(e.name, "LoiDocHoiThoai"); assert.equal(e.capKenh, true);
  assert.match(e.message, /^Pancake không trả danh sách hội thoại: /); assert.doesNotMatch(e.message, /tokA|tokB|access_token/);
});
