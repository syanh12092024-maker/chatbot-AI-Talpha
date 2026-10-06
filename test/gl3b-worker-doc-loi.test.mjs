// PHIẾU GL3b ④1–④4 — đọc lịch sử Pancake LỖI/CHẬM: KHÔNG trả lời mù, KHÔNG câm im — lùi dài rồi giao sale CÓ dòng việc.
//
// Đường đi THẬT, không tiêm cửa đọc: `chayMotVong` → `channels/messenger#docTin` → `pancake.js#pkDocTin` → `pkFetchPage`
// → cổng HTTP ghi của `handler-v3` (accessor trên globalThis.fetch) → fetch GIẢ. CẤM tiêm `docTin` / `getMessages` / `cua`
// (tiêm `docTin` ném chỉ đo lại ca `phase1-chat-flow` «History API hỏng» đã có). Chỉ tiêm `docHoiThoai` (mapping webhook →
// hội thoại Pancake, như repro r2 của reviewer) và bộ não giả (đếm lượt gọi).
//
// ⚠️ Máy dev có `PANCAKE_READONLY=1` trong `.env` ⇒ worker chốt `chan_guard` TRƯỚC lượt đọc ⇒ ca xanh giả. Ca mở van trong
// PHẠM VI TIẾN TRÌNH CA (process.env, KHÔNG sửa `.env`) SAU KHI đã cài fetch giả, dùng 2 token GIẢ, khẳng định fetch giả THẬT
// SỰ được gọi và `congHttpGhi.daChan` không tăng. Fetch giả chỉ nhận host pages.fm; host khác ⇒ ném (không lọt mạng).
// Đồng hồ: khoảng lùi đo bằng ĐỒNG HỒ CSDL (`thu_lai_luc - now()` trong cùng câu SQL); «thời gian trôi» giữa hai lượt = UPDATE
// `thu_lai_luc = now()` (ép đồng hồ phía CSDL), không ngủ.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dungSandbox } from "../db/sandbox.js";
import { nhanWebhook } from "../src/queue/webhook.js";
import { chayMotVong, TRAN_THU } from "../src/queue/worker.js";
import { resumeConversation } from "../src/queue/reconcile.js";
import { config } from "../src/config.js";
import { datKhoTokenDb, lamMoiTokenDb, listPancakeTokens } from "../src/pancake.js";
import { congHttpGhi } from "../src/chat/handler-v3.js";

const PAGE = "gl3b-page";
const PAGE_TAT = "gl3b-page-tat";     // page ĐÃ TẮT bot (cảnh phụ P1f)
const HAN_DOC = 150;
const ENV = {
  V3_PANCAKE_GUI: "1",
  PANCAKE_READONLY: "0",            // chỉ trong tiến trình ca — .env vẫn =1
  V3_PANCAKE_HAN_GUI_MS: "2000",
  V3_PANCAKE_HAN_DOC_MS: String(HAN_DOC),
  PK_MARK_UNREAD: "0",
  V3_DIEN_TAP: undefined,           // diễn tập dừng TRƯỚC fetch ⇒ phải tắt
};
const envCu = {};
const cauHinhCu = {};
const goi = [];
const cheDo = new Map();            // psid -> cách Pancake trả GET …/messages
const dem = { model: 0, nhanh: 0, kb: 0 };
let sb;
let team;
let chanTruoc = 0;

const tl = (j) => ({ status: 200, json: async () => j });
const khachHoi = (psid) => ({ id: `m-${psid}-1`, from: { id: psid, name: "Khách" }, message: "how much?" });
const pageDap = () => ({ id: "m-page-2", from: { id: PAGE, name: "Sale" }, message: "Giá 109 SAR ạ (sale trả lời)" });
const THAN = {
  // Pancake CHẬM hơn hạn đọc mà vẫn trả đúng dữ liệu (page đã trả lời) — đúng repro r2: bản cũ coi là «rỗng» rồi trả lời mù.
  quaHan: (psid, init) => new Promise((ok, tuChoi) => {
    const t = setTimeout(() => ok(tl({ messages: [khachHoi(psid), pageDap()] })), HAN_DOC * 3);
    init?.signal?.addEventListener("abort", () => { clearTimeout(t); tuChoi(init.signal.reason); }, { once: true });
  }),
  html502: () => ({ status: 502, json: async () => { throw new SyntaxError("Unexpected token < in JSON"); } }),
  quyen: () => tl({ success: false, error_code: 105, message: "Bạn không có quyền với trang này" }),
  khongDs: () => tl({ success: true }),
  rong: () => tl({ messages: [] }),
  khachCuoi: (psid) => tl({ messages: [khachHoi(psid)] }),
  pageCuoi: (psid) => tl({ messages: [khachHoi(psid), pageDap()] }),
};

before(async () => {
  sb = await dungSandbox("gl3b_w");
  console.log(`   [gl3b] hộp cát ${sb.ten} · tệp đo ${fileURLToPath(new URL("../src/queue/worker.js", import.meta.url))}`);
  team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  await sb.pool.query(
    "INSERT INTO page(team_id,page_id,ten,nguon_tin,bot_ai_bat) VALUES($1,$2,'GL3b','webhook',true), ($1,$3,'GL3b tắt','webhook',false)",
    [team, PAGE, PAGE_TAT],
  );
  // 1) fetch GIẢ trước — rồi mới mở van.
  globalThis.fetch = async (u, init) => {
    const url = new URL(String(u));
    if (url.host !== "pages.fm") throw new Error(`ca GL3b: lượt gọi lạ ra ${url.host} — chặn`);
    const method = String(init?.method || "GET").toUpperCase();
    const m = /\/conversations\/conv-([^/]+)\/messages$/.exec(url.pathname);
    const psid = m ? decodeURIComponent(m[1]) : "";
    goi.push({ method, path: url.pathname, psid, tok: url.searchParams.get("access_token") });
    if (method === "GET" && m) return THAN[cheDo.get(psid) || "khachCuoi"](psid, init);
    if (method === "POST" && m) return tl({ success: true, id: `bot-${goi.length}` });
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
  chanTruoc = congHttpGhi.daChan.length;
});
after(async () => {
  for (const [k, v] of Object.entries(envCu)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  datKhoTokenDb(null);
  config.pancakeToken = cauHinhCu.pancakeToken;
  config.pancakeTokensExtra = cauHinhCu.pancakeTokensExtra;
  await sb?.don();
});

const body = (mid, psid, text = "how much?", page = PAGE) => ({
  object: "page",
  entry: [{ id: page, messaging: [{ sender: { id: psid }, message: { mid, text } }] }],
});
const deps = (psid) => ({
  layKb: () => { dem.kb += 1; return { products: [], text: "test" }; },
  layModel: () => { dem.model += 1; return { maModel: "test" }; },
  lanNhanh: () => { dem.nhanh += 1; return { handled: true, reply: "Giá 109 SAR ạ (bot)", lane: "test" }; },
  kiemTinRa: () => ({ ok: true }),
  docHoiThoai: async () => [{ id: `conv-${psid}`, from_psid: psid, customers: [{ id: `cust-${psid}` }] }],
  // KHÔNG docTin / docLichSu / cua ⇒ worker đọc lịch sử qua CỬA THẬT ⇒ pancake.js THẬT.
});
const nao = () => dem.model + dem.nhanh + dem.kb;
const dem1 = (psid, method) => goi.filter((g) => g.psid === psid && g.method === method).length;
async function tinMoi(psid, mid, text, page) {
  await nhanWebhook(sb.pool, body(mid, psid, text, page), { choPhep: () => true });
  return (await sb.pool.query("SELECT id FROM tin_cho_xu_ly WHERE psid=$1 AND msg_id=$2", [psid, mid])).rows[0].id;
}
async function tin(id) {
  return (await sb.pool.query(
    `SELECT trang_thai, so_lan_thu, ly_do, EXTRACT(EPOCH FROM (thu_lai_luc - now())) * 1000 AS con_ms
       FROM tin_cho_xu_ly WHERE id=$1`, [id])).rows[0];
}
const hoiThoai = async (psid) => (await sb.pool.query(
  "SELECT id, chu_so_huu, trang_thai, ly_do_cuoi FROM hoi_thoai WHERE psid=$1", [psid])).rows[0];
const viecMo = async (htId) => (await sb.pool.query(
  "SELECT id, ly_do_day, han_luc > now() AS con_han FROM viec_can_xu_ly WHERE hoi_thoai_id=$1 AND dong_luc IS NULL", [htId])).rows;
const lanGui = async (tinId) => Number((await sb.pool.query("SELECT count(*) n FROM lan_gui WHERE tin_id=$1", [tinId])).rows[0].n);
const toiLuot = (id) => sb.pool.query("UPDATE tin_cho_xu_ly SET thu_lai_luc = now() WHERE id=$1", [id]);
const khongChan = () => assert.equal(congHttpGhi.daChan.length - chanTruoc, 0, "cổng HTTP ghi KHÔNG được chặn lượt nào (van mở trong ca)");

/** Một lượt THỬ LẠI vì đọc lịch sử lỗi: đúng tin · thu_lai · lùi ~treMs (đồng hồ CSDL) · 0 POST · 0 lượt não · ≥ getMin GET. */
async function luotThuLai(psid, tinId, { lan, treMs, getMin, lyDo, nhan }) {
  const g0 = dem1(psid, "GET"); const p0 = dem1(psid, "POST"); const n0 = nao();
  const ghi0 = goi.filter((g) => g.method !== "GET").length;
  const r = await chayMotVong(sb.pool, deps(psid));
  const t = await tin(tinId);
  const ht = await hoiThoai(psid);
  console.log(`   [gl3b] ${nhan} lượt ${lan}: ketQua=${r?.ketQua} · con=${Math.round(t.con_ms)} ms · GET +${dem1(psid, "GET") - g0} · POST +${dem1(psid, "POST") - p0} · não +${nao() - n0} · ly_do=${String(t.ly_do).slice(0, 110)}`);
  assert.equal(String(r?.tinId), String(tinId), "rút đúng tin");
  assert.equal(r.ketQua, "thu_lai");
  assert.equal(t.trang_thai, "cho");
  assert.equal(Number(t.so_lan_thu), lan);
  assert.ok(t.con_ms >= treMs - 1500 && t.con_ms <= treMs + 50, `lùi ${Math.round(t.con_ms)} ms — phải ≈ ${treMs} ms (đồng hồ CSDL)`);
  assert.ok(dem1(psid, "GET") - g0 >= getMin, `fetch giả phải nhận ≥${getMin} GET …/messages ở lượt này`);
  assert.equal(dem1(psid, "POST") - p0, 0, "KHÔNG gửi gì cho khách");
  assert.equal(goi.filter((g) => g.method !== "GET").length - ghi0, 0, "KHÔNG lượt GHI nào ra Pancake (thẻ · ghi chú · gửi)");
  assert.equal(nao() - n0, 0, "KHÔNG gọi model / lớp nhanh / KB");
  assert.match(t.ly_do, /^LoiDocLichSu: /);
  assert.match(t.ly_do, lyDo);
  assert.doesNotMatch(t.ly_do, /không có token/, "Pancake lỗi/quá hạn KHÔNG được khai là hết token");
  assert.deepEqual([ht.chu_so_huu, ht.trang_thai], ["AI", "GREET"], "chưa hết lượt ⇒ KHÔNG đụng hoi_thoai");
}

test("GL3b P0 · CHO-QUA thật: đọc TRONG hạn, khách nói cuối ⇒ bot trả lời 1 POST (hành vi cũ giữ nguyên)", { timeout: 20_000 }, async () => {
  const psid = "k-p0";
  cheDo.set(psid, "khachCuoi");
  const id = await tinMoi(psid, "p0-1");
  const r = await chayMotVong(sb.pool, deps(psid));
  console.log(`   [gl3b] P0 ketQua=${r?.ketQua} · GET=${dem1(psid, "GET")} · POST=${dem1(psid, "POST")}`);
  assert.equal(String(r.tinId), String(id));
  assert.equal(r.ketQua, "xong");
  assert.ok(dem1(psid, "GET") >= 1);
  assert.equal(dem1(psid, "POST"), 1);
  khongChan();
});

for (const [tag, kieu, lyDo, getMoiLuot] of [
  ["P1a", "quaHan", /Pancake quá hạn.*quá hạn 150 ms/, 2],
  ["P1b", "html502", /Pancake lỗi \(HTTP 502\)/, 1],
]) {
  test(`GL3b ${tag} · đọc lịch sử ${kieu}: lượt 1 lùi 15 s · lượt 2 lùi 30 s · lượt ${TRAN_THU} giao sale CÓ việc · trả AI thành · Pancake lành ⇒ bot trả lời`, { timeout: 30_000 }, async () => {
    const psid = `k-${tag.toLowerCase()}`;
    cheDo.set(psid, kieu);
    const id = await tinMoi(psid, `${tag}-1`);
    await luotThuLai(psid, id, { lan: 1, treMs: 15_000, getMin: getMoiLuot, lyDo, nhan: tag });
    await toiLuot(id);
    await luotThuLai(psid, id, { lan: 2, treMs: 30_000, getMin: getMoiLuot, lyDo, nhan: tag });
    await toiLuot(id);

    // Lượt cuối: hết lượt ⇒ giao sale trong CÙNG giao dịch + một dòng việc; tin chốt `xong` (không chặn «trả AI»).
    const g0 = dem1(psid, "GET"); const n0 = nao();
    const r = await chayMotVong(sb.pool, deps(psid));
    const t = await tin(id);
    const ht = await hoiThoai(psid);
    const viec = await viecMo(ht.id);
    console.log(`   [gl3b] ${tag} lượt ${TRAN_THU}: ketQua=${r?.ketQua} · tin=${t.trang_thai}/${t.ly_do} · hội thoại=${ht.chu_so_huu}/${ht.trang_thai}/${ht.ly_do_cuoi} · việc mở=${viec.length} «${viec[0]?.ly_do_day}» · lan_gui=${await lanGui(id)} · POST=${dem1(psid, "POST")}`);
    assert.equal(String(r?.tinId), String(id));
    assert.equal(r.ketQua, "doc_loi_ban_giao");
    assert.ok(dem1(psid, "GET") - g0 >= getMoiLuot, "lượt cuối vẫn thật sự gọi Pancake");
    assert.equal(nao() - n0, 0);
    assert.equal(t.trang_thai, "xong");
    assert.equal(t.ly_do, "doc_loi:ban_giao");
    assert.deepEqual([ht.chu_so_huu, ht.trang_thai, ht.ly_do_cuoi], ["SALE", "HANDOFF", "doc_lich_su_loi"]);
    assert.equal(viec.length, 1, "ĐÚNG 1 dòng việc mở cho sale");
    assert.match(viec[0].ly_do_day, /Pancake không trả lịch sử/);
    assert.match(viec[0].ly_do_day, /CHƯA gửi gì/);
    assert.equal(viec[0].con_han, true);
    assert.equal(await lanGui(id), 0, "không lượt gửi nào được mở");
    assert.equal(dem1(psid, "POST"), 0, "suốt ba lượt: 0 POST");

    // Sale trả AI: KHÔNG bị chặn bởi tin «còn tồn».
    const tra = await resumeConversation(sb.pool, { teamId: team, id: ht.id, reason: "Pancake đã lành — trả AI" });
    assert.equal(tra.ok, true);
    // Pancake lành, khách nhắn tiếp ⇒ bot trả lời (đọc trong hạn, khách nói cuối).
    cheDo.set(psid, "khachCuoi");
    const id2 = await tinMoi(psid, `${tag}-2`, "còn không?");
    const r2 = await chayMotVong(sb.pool, deps(psid));
    console.log(`   [gl3b] ${tag} sau trả AI: ketQua=${r2?.ketQua} · POST=${dem1(psid, "POST")}`);
    assert.equal(String(r2.tinId), String(id2));
    assert.equal(r2.ketQua, "xong");
    assert.equal(dem1(psid, "POST"), 1, "bot trả lời đúng 1 lần");
    khongChan();
  });
}

for (const [tag, chu, trangThai, page] of [
  ["P1c", "SALE", "HANDOFF", PAGE], ["P1d", "AI", "CLOSING", PAGE], ["P1f", "AI", "GREET", PAGE_TAT],
]) {
  const canh = page === PAGE_TAT ? "page ĐÃ TẮT bot (hội thoại AI/GREET)" : `hội thoại ${chu}/${trangThai}`;
  test(`GL3b ${tag} · cảnh phụ: ${canh} + đọc lỗi hết lượt ⇒ tin xong doc_loi:khong_thuoc_ai, KHÔNG đẻ việc, hội thoại không đổi`, { timeout: 30_000 }, async () => {
    const psid = `k-${tag.toLowerCase()}`;
    cheDo.set(psid, "html502");
    const id = await tinMoi(psid, `${tag}-1`, undefined, page);
    await sb.pool.query("UPDATE hoi_thoai SET chu_so_huu=$2, trang_thai=$3, ly_do_cuoi='truoc_ca' WHERE psid=$1", [psid, chu, trangThai]);
    const ht0 = await hoiThoai(psid);
    const v0 = (await viecMo(ht0.id)).length;
    let r;
    for (let lan = 1; lan <= TRAN_THU; lan++) {
      r = await chayMotVong(sb.pool, deps(psid));
      if (lan < TRAN_THU) { assert.equal(r.ketQua, "thu_lai", `lượt ${lan}`); await toiLuot(id); }
    }
    const t = await tin(id);
    const ht = await hoiThoai(psid);
    console.log(`   [gl3b] ${tag}: ketQua=${r?.ketQua} · tin=${t.trang_thai}/${t.ly_do} · hội thoại=${ht.chu_so_huu}/${ht.trang_thai}/${ht.ly_do_cuoi} · việc ${v0}→${(await viecMo(ht.id)).length}`);
    assert.equal(r.ketQua, "doc_loi_khong_thuoc_ai");
    assert.equal(t.trang_thai, "xong");
    assert.equal(t.ly_do, "doc_loi:khong_thuoc_ai");
    assert.deepEqual([ht.chu_so_huu, ht.trang_thai, ht.ly_do_cuoi], [chu, trangThai, "truoc_ca"], "hội thoại không đổi");
    assert.equal((await viecMo(ht.id)).length, v0, "KHÔNG thêm dòng việc nhiễu «bot CHƯA trả lời»");
    assert.equal(dem1(psid, "POST"), 0);
    khongChan();
  });
}

test("GL3b P1e · cảnh phụ: câu SQL chèn việc LỖI ⇒ tin `loi` + banGiaoLoi (đường cũ, hiện ở «tin lỗi»), KHÔNG chốt `xong`", { timeout: 30_000 }, async () => {
  const psid = "k-p1e";
  cheDo.set(psid, "html502");
  const id = await tinMoi(psid, "p1e-1");
  for (let lan = 1; lan < TRAN_THU; lan++) {
    assert.equal((await chayMotVong(sb.pool, deps(psid))).ketQua, "thu_lai");
    await toiLuot(id);
  }
  await sb.pool.query(`CREATE OR REPLACE FUNCTION gl3b_ep_loi() RETURNS trigger LANGUAGE plpgsql AS
    $$ BEGIN RAISE EXCEPTION 'GL3b ép lỗi chèn việc'; END $$`);
  await sb.pool.query("CREATE TRIGGER gl3b_ep_loi BEFORE INSERT ON viec_can_xu_ly FOR EACH ROW EXECUTE FUNCTION gl3b_ep_loi()");
  let r;
  try {
    r = await chayMotVong(sb.pool, deps(psid));
  } finally {
    await sb.pool.query("DROP TRIGGER IF EXISTS gl3b_ep_loi ON viec_can_xu_ly");
  }
  const t = await tin(id);
  const ht = await hoiThoai(psid);
  console.log(`   [gl3b] P1e: ketQua=${r?.ketQua} · tin=${t.trang_thai}/${String(t.ly_do).slice(0, 80)} · hội thoại=${ht.chu_so_huu}/${ht.trang_thai}/${ht.ly_do_cuoi} · việc=${(await viecMo(ht.id)).length}`);
  assert.equal(r.ketQua, "loi");
  assert.equal(t.trang_thai, "loi", "không bao giờ `xong` khi chưa chèn được việc");
  assert.equal(Number(t.so_lan_thu), TRAN_THU);
  assert.deepEqual([ht.chu_so_huu, ht.trang_thai, ht.ly_do_cuoi], ["SALE", "HANDOFF", "loi_xu_ly_can_doi_chieu"]);
  assert.equal((await viecMo(ht.id)).length, 0);
  assert.equal(dem1(psid, "POST"), 0);
  khongChan();
});

test("GL3b P2 · lịch sử có tin page/sale vừa gõ (đọc được) ⇒ nhuong_page, fetch giả nhận ≥1 GET, 0 POST, 0 lượt não", { timeout: 20_000 }, async () => {
  const psid = "k-p2";
  cheDo.set(psid, "pageCuoi");
  const id = await tinMoi(psid, "p2-1");
  const n0 = nao();
  const r = await chayMotVong(sb.pool, deps(psid));
  console.log(`   [gl3b] P2 ketQua=${r?.ketQua} · GET=${dem1(psid, "GET")} · POST=${dem1(psid, "POST")}`);
  assert.equal(String(r.tinId), String(id));
  assert.equal(r.ketQua, "nhuong_page");
  assert.ok(dem1(psid, "GET") >= 1, "phải thật sự đọc Pancake (van đóng cũng ra 0 POST — không tính)");
  assert.equal(dem1(psid, "POST"), 0);
  assert.equal(nao() - n0, 0);
  assert.equal((await tin(id)).trang_thai, "xong");
  khongChan();
});

for (const [tag, kieu, lyDo, getMin] of [
  ["P3a", "quyen", /Bạn không có quyền với trang này/, 2],
  ["P3b", "khongDs", /không có danh sách tin/, 1],
]) {
  test(`GL3b ${tag} · ${kieu === "quyen" ? "lỗi quyền ở MỌI token" : "thân không có danh sách tin"} ⇒ như phép 1 lượt 1 (thử lại sau 15 s, 0 POST, 0 lượt não)`, { timeout: 20_000 }, async () => {
    const psid = `k-${tag.toLowerCase()}`;
    cheDo.set(psid, kieu);
    const id = await tinMoi(psid, `${tag}-1`);
    await luotThuLai(psid, id, { lan: 1, treMs: 15_000, getMin, lyDo, nhan: tag });
    // dọn: tin còn `cho` với hạn 15 s trong tương lai — không ca nào sau rút được, nhưng chốt cho sạch
    await sb.pool.query("UPDATE tin_cho_xu_ly SET trang_thai='xong', ly_do='gl3b:don_ca' WHERE id=$1", [id]);
    khongChan();
  });
}

test("GL3b P4 · rỗng THẬT (`messages: []`) ⇒ rỗng hợp lệ, worker trả lời bình thường (1 POST)", { timeout: 20_000 }, async () => {
  const psid = "k-p4";
  cheDo.set(psid, "rong");
  const id = await tinMoi(psid, "p4-1");
  const r = await chayMotVong(sb.pool, deps(psid));
  console.log(`   [gl3b] P4 ketQua=${r?.ketQua} · GET=${dem1(psid, "GET")} · POST=${dem1(psid, "POST")}`);
  assert.equal(String(r.tinId), String(id));
  assert.equal(r.ketQua, "xong");
  assert.ok(dem1(psid, "GET") >= 1);
  assert.equal(dem1(psid, "POST"), 1);
  khongChan();
});
