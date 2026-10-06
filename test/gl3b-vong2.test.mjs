// PHIẾU GL3b — VÒNG 2 (đối kháng chặng 2: F1 · F2, verdict `refute-gl3b.verdict.yaml`).
//
// F1 · page POLL (prod 582/582 là poll): khách nhắn thêm trong lúc tin trước đang lùi vì đọc lịch sử lỗi (15 s · 30 s) ⇒ bộ nạp
//      xếp tin đó thành HÀNG RIÊNG (gom cụm chỉ chạy cho webhook). Bản vòng 1: lượt 3 giao sale ⇒ tin theo tới lượt gặp SALE ⇒
//      `chan_guard` ⇒ «trả AI» bị từ chối «Còn tin chưa xử lý». Vòng 2: lượt 3 (nhánh giao sale CÓ việc) chốt luôn tin `cho` cùng
//      (team, page, psid), id lớn hơn — chúng thuộc dòng việc sale vừa nhận. Không chạm khách khác / page khác; nhánh
//      `doc_loi:khong_thuoc_ai` KHÔNG chốt (không có việc mới ⇒ tin theo không thuộc việc nào — đi đường thường).
// F2 · các token trả lỗi KHÁC loại (token A quá hạn / lỗi mạng / 121 / 103 — token B 105 «không có quyền») ⇒ câu lỗi `pkDocTin`
//      (⇒ `ly_do` tin · nhật ký `tin_doc_loi_ban_giao` · sổ bỏ-qua «Tin bị lọc» · màn Vận hành) phải nói lỗi «thật» nhất, không
//      lấy lỗi của token CUỐI. Thứ hạng: quá hạn > lỗi mạng > 103 (hết phiên) > 121 (tài khoản không ghế gói) > 105/khác.
//
// Đường đi THẬT (như repro của người phản biện): bộ nạp `chay-worker#motLuot` → `nap#napTuPoll` → cửa `docTin` → `pkDocTin` →
// `pkFetchPage` → fetch GIẢ; worker `chayMotVong` → cửa thật → cổng HTTP ghi của `handler-v3` → fetch GIẢ. Chỉ tiêm bộ não giả +
// đồng hồ/chờ-gõ của bộ nạp. Fetch giả chỉ nhận host pages.fm (host khác ⇒ ném). Van gửi mở CHỈ trong tiến trình ca (`.env` giữ
// PANCAKE_READONLY=1), 2 token GIẢ, khẳng định `congHttpGhi.daChan` không tăng. «Thời gian trôi» giữa hai lượt worker = UPDATE
// `thu_lai_luc = now()` (đồng hồ CSDL), không ngủ.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dungSandbox } from "../db/sandbox.js";
import * as chayWorker from "../src/queue/chay-worker.js";
import { quenMoc, quenChoGo } from "../src/queue/nap.js";
import { chayMotVong, TRAN_THU } from "../src/queue/worker.js";
import { xepTin } from "../src/queue/kho.js";
import { resumeConversation } from "../src/queue/reconcile.js";
import { config } from "../src/config.js";
import { datKhoTokenDb, lamMoiTokenDb, listPancakeTokens, pkDocTin } from "../src/pancake.js";
import { congHttpGhi } from "../src/chat/handler-v3.js";

const PAGE = "gl3b-v2-poll";
const PAGE_KHAC = "gl3b-v2-poll-khac";   // cùng psid ở page KHÁC — không được bị chốt theo
const HAN = 150;
const ENV = {
  V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "0", V3_PANCAKE_HAN_GUI_MS: "2000", V3_PANCAKE_HAN_DOC_MS: String(HAN),
  PK_MARK_UNREAD: "0", V3_DIEN_TAP: undefined, V3_NAP_THE_CHAN: "Đã gửi", V3_NAP_CHI_CHUA_DOC: "0", V3_NAP_IM_BOTCAKE_MS: "0",
};
const envCu = {};
const cauHinhCu = {};
const goi = [];
const MSGS = new Map();    // convId -> tin Pancake trả khi «lành»
const LOI = new Map();     // convId -> [kiểu của tokA, kiểu của tokB] cho GET …/messages
const CONVS = new Map();   // pageId -> danh sách hội thoại của /conversations
let sb, team, dongHo = 2_000_000_000, chan0 = 0;

const tl = (j) => ({ status: 200, json: async () => j });
const treoToiHuy = (init) => new Promise((_, no) => init?.signal?.addEventListener("abort", () => no(init.signal.reason), { once: true }));
const loiMang = (ma) => Object.assign(new TypeError("fetch failed"), { cause: Object.assign(new Error(`read ${ma}`), { code: ma }) });
const Q105 = { success: false, error_code: 105, message: "Bạn không có quyền với trang này" };
const Q121 = { success: false, error_code: 121, message: "Tài khoản không có ghế trong gói cước" };
const Q103 = { success: false, error_code: 103, message: "Phiên đăng nhập đã hết hạn" };
// Mỗi token một cách cư xử — đúng thực tế prod: mỗi tài khoản Pancake chỉ có quyền trên MỘT nhóm page.
const KIEU = {
  treo: (init) => treoToiHuy(init),
  mang: () => { throw loiMang("ECONNRESET"); },
  html502: () => ({ status: 502, json: async () => { throw new SyntaxError("Unexpected token <"); } }),
  q105: () => tl(Q105), q121: () => tl(Q121), q103: () => tl(Q103),
  rong: () => tl({ messages: [] }),     // đọc ĐƯỢC (rỗng thật) — dùng để ghim token
};
const conv = (id, psid, moc, snip = "how much?") => ({
  id, from_psid: psid, customers: [{ id: `cust-${psid}` }], last_sent_by: { id: psid, name: "Khách" },
  last_customer_interactive_at: moc, snippet: snip, tags: [],
});
const khach = (psid, n, text) => ({ id: `m-${psid}-${n}`, from: { id: psid, name: "Khách" }, message: text });
const nao = { n: 0 };
const brain = {
  layKb: () => { nao.n++; return { products: [], text: "test" }; },
  layModel: () => { nao.n++; return { maModel: "test" }; },
  lanNhanh: () => { nao.n++; return { handled: true, reply: "Giá 109 SAR ạ (bot)", lane: "test" }; },
  kiemTinRa: () => ({ ok: true }),
};

before(async () => {
  sb = await dungSandbox("gl3b_v2");
  console.log(`   [gl3b] hộp cát ${sb.ten} · tệp đo ${fileURLToPath(new URL("../src/queue/worker.js", import.meta.url))}`);
  team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  await sb.pool.query(
    "INSERT INTO page(team_id,page_id,ten,nguon_tin,bot_ai_bat) VALUES($1,$2,'GL3b v2 poll','poll',true), ($1,$3,'GL3b v2 poll khác','poll',true)",
    [team, PAGE, PAGE_KHAC],
  );
  // 1) fetch GIẢ trước — rồi mới mở van.
  globalThis.fetch = async (u, init) => {
    const url = new URL(String(u));
    if (url.host !== "pages.fm") throw new Error(`ca GL3b v2: lượt gọi lạ ra ${url.host} — chặn`);
    const method = String(init?.method || "GET").toUpperCase();
    const tok = url.searchParams.get("access_token");
    const m = /\/conversations\/([^/]+)\/messages$/.exec(url.pathname);
    goi.push({ method, conv: m?.[1] || "", tok });
    if (method !== "GET") return tl({ success: true, id: `bot-${goi.length}` });
    const pm = /\/pages\/([^/]+)\/conversations$/.exec(url.pathname);
    if (pm) return tl({ conversations: CONVS.get(pm[1]) || [] });
    if (url.pathname.endsWith("/settings")) return tl({ settings: { tags: [{ id: 3, text: "Đã gửi" }] } });
    if (m) {
      const k = LOI.get(m[1]);
      if (k) return KIEU[k[tok === "tokA" ? 0 : 1]](init);
      return tl({ messages: MSGS.get(m[1]) || [] });
    }
    return tl({});
  };
  // 2) kho token tất định: hai token GIẢ (tokA đứng trước — chân khởi đầu của mọi page mới).
  cauHinhCu.a = config.pancakeToken; cauHinhCu.b = config.pancakeTokensExtra;
  config.pancakeToken = ""; config.pancakeTokensExtra = [];
  datKhoTokenDb(async () => ["tokA", "tokB"]);
  assert.equal(await lamMoiTokenDb(), 2);
  assert.equal(listPancakeTokens().filter((t) => !t.expired).length, 2, "đúng 2 token giả, không token thật nào");
  // 3) mở van trong phạm vi tiến trình ca.
  for (const [k, v] of Object.entries(ENV)) { envCu[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  quenMoc(); quenChoGo();
  chan0 = congHttpGhi.daChan.length;
});
after(async () => {
  for (const [k, v] of Object.entries(envCu)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  datKhoTokenDb(null); config.pancakeToken = cauHinhCu.a; config.pancakeTokensExtra = cauHinhCu.b;
  await sb?.don();
});

async function napVong(dt = 7000) {
  dongHo += dt;
  const ket = await chayWorker.motLuot(sb.pool, {
    dsChoPhep: async () => [PAGE], dsPage: async () => [PAGE], boQuaXu: true,
    depsNap: { doiGoXong: () => ({ ms: 0, reason: "gl3b-v2" }), dongHo: () => dongHo },
  });
  return ket.nap;
}
const xu = () => chayMotVong(sb.pool, { ...brain, pageIds: [PAGE] });
const tinCua = async (psid, page = PAGE) => (await sb.pool.query(
  "SELECT id, msg_id, trang_thai, so_lan_thu, ly_do FROM tin_cho_xu_ly WHERE psid=$1 AND page_id=$2 ORDER BY id", [psid, page])).rows;
const ht = async (psid) => (await sb.pool.query(
  "SELECT h.id, h.chu_so_huu, h.trang_thai, h.ly_do_cuoi FROM hoi_thoai h JOIN page p ON p.id=h.page_id WHERE h.psid=$1 AND p.page_id=$2",
  [psid, PAGE])).rows[0];
const viecMo = async (htId) => (await sb.pool.query(
  "SELECT id, ly_do_day FROM viec_can_xu_ly WHERE hoi_thoai_id=$1 AND dong_luc IS NULL ORDER BY id", [htId])).rows;
const toi = (psid) => sb.pool.query("UPDATE tin_cho_xu_ly SET thu_lai_luc=now() WHERE psid=$1 AND page_id=$2 AND trang_thai='cho'", [psid, PAGE]);
const post = (c) => goi.filter((g) => g.method === "POST" && g.conv === c).length;
const khongChan = () => assert.equal(congHttpGhi.daChan.length - chan0, 0, "cổng HTTP ghi KHÔNG được chặn lượt nào (van mở trong ca)");
// Ca trước đỏ giữa chừng để lại tin `cho` rút được ⇒ ca sau rút nhầm. Mỗi ca F1/F2 trọn đường dọn tin còn sống của psid KHÁC trước.
const donCaTruoc = (psid) => sb.pool.query(
  "UPDATE tin_cho_xu_ly SET trang_thai='xong', ly_do='gl3b-v2:don_ca_truoc', khoa_worker=NULL WHERE trang_thai IN ('cho','dang_xu') AND psid <> $1", [psid]);
const gon = (ds) => JSON.stringify(ds.map((t) => [t.msg_id, t.trang_thai, t.ly_do && String(t.ly_do).slice(0, 48)]));

// ── F1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("GL3b V2a · F1 page POLL: tin 1 đọc lỗi → khách nhắn tin 2 lúc tin 1 đang lùi → lượt 3 giao sale ⇒ tin 2 chốt theo (không chan_guard) · 1 việc · trả AI THÀNH · khách khác/page khác không bị chạm", { timeout: 30_000 }, async () => {
  const c = "c-v2a", p = "ps-v2a";
  MSGS.set(c, [khach(p, 1, "how much?")]);
  CONVS.set(PAGE, [conv(c, p, "2026-10-07T01:00:00")]);
  await napVong();
  let ds = await tinCua(p);
  assert.equal(ds.length, 1, "bộ nạp xếp tin 1");
  const idA = ds[0].id;
  // Người ngoài cuộc, xếp SAU tin 1 (id lớn hơn), hoãn 1 giờ để worker không rút giữa chừng: khách KHÁC cùng page · CÙNG psid ở page KHÁC.
  const ngoai = [
    await xepTin(sb.pool, { teamId: team, pageId: PAGE, psid: "ps-v2a-khac", convId: "c-v2a-khac", custId: "cust-x", msgId: "m-x-1", noiDung: "hi", nguon: "poll", hoanMs: 3_600_000 }),
    await xepTin(sb.pool, { teamId: team, pageId: PAGE_KHAC, psid: p, convId: "c-v2a-pk", custId: `cust-${p}`, msgId: "m-pk-1", noiDung: "hi", nguon: "poll", hoanMs: 3_600_000 }),
  ];
  assert.ok(ngoai.every((x) => x.them && Number(x.id) > Number(idA)), "hai tin ngoài cuộc có id lớn hơn tin 1");

  // Pancake chập chờn: lượt đọc của worker lỗi (502 cả hai token).
  LOI.set(c, ["html502", "html502"]);
  let r = await xu();
  assert.equal(String(r?.tinId), String(idA)); assert.equal(r.ketQua, "thu_lai");
  // Khách nhắn tiếp «??» trong lúc tin 1 lùi 15 s; lượt đọc của BỘ NẠP rơi vào lúc Pancake lành ⇒ tin 2 là HÀNG RIÊNG.
  LOI.delete(c);
  MSGS.set(c, [khach(p, 1, "how much?"), khach(p, 2, "??")]);
  CONVS.set(PAGE, [conv(c, p, "2026-10-07T01:00:20", "??")]);
  await napVong();
  ds = await tinCua(p);
  assert.equal(ds.length, 2, `bộ nạp xếp tin 2 (cụm mới, msg_id khác): ${gon(ds)}`);
  const idB = ds[1].id;
  LOI.set(c, ["html502", "html502"]);
  await toi(p); r = await xu(); assert.equal(String(r?.tinId), String(idA)); assert.equal(r.ketQua, "thu_lai");
  await toi(p); r = await xu();
  assert.equal(String(r?.tinId), String(idA)); assert.equal(r.ketQua, "doc_loi_ban_giao");
  assert.equal(TRAN_THU, 3);

  ds = await tinCua(p);
  const h = await ht(p);
  const v = await viecMo(h.id);
  const ngoaiSau = (await sb.pool.query("SELECT id, trang_thai FROM tin_cho_xu_ly WHERE id = ANY($1::bigint[]) ORDER BY id", [ngoai.map((x) => x.id)])).rows;
  console.log(`   [gl3b] V2a lượt 3: ${r.ketQua} · tin=${gon(ds)} · hội thoại=${h.chu_so_huu}/${h.trang_thai}/${h.ly_do_cuoi} · việc mở=${v.length} · ngoài cuộc=${JSON.stringify(ngoaiSau.map((x) => x.trang_thai))}`);
  assert.deepEqual([ds[0].trang_thai, ds[0].ly_do], ["xong", "doc_loi:ban_giao"], "tin 1 như vòng 1");
  assert.equal(ds[1].trang_thai, "xong", "tin 2 (khách nhắn lúc tin 1 lùi) chốt theo — không còn `cho` để tới lượt thành chan_guard");
  assert.equal(ds[1].ly_do, `doc_loi:ban_giao:theo_tin:${idA}`, "lý do bàn giao, chỉ về tin chính");
  assert.deepEqual([h.chu_so_huu, h.trang_thai, h.ly_do_cuoi], ["SALE", "HANDOFF", "doc_lich_su_loi"]);
  assert.equal(v.length, 1, "ĐÚNG 1 dòng việc cho cả hội thoại");
  assert.deepEqual(ngoaiSau.map((x) => x.trang_thai), ["cho", "cho"], "KHÔNG chạm tin của khách khác / cùng psid ở page khác");
  const nk = (await sb.pool.query(
    "SELECT sau FROM nhat_ky WHERE hanh_dong='tin_doc_loi_chot_theo' AND doi_tuong_id=$1", [String(idA)])).rows;
  assert.equal(nk.length, 1, "nhật ký ghi MỘT dòng cho lượt chốt theo — tin khách không biến mất im lặng");
  assert.deepEqual(nk[0].sau?.tin_theo, [String(idB)], "nhật ký nêu đúng danh sách tin đã chốt theo");

  // Pancake lành ⇒ worker không còn gì của hội thoại này để rút (ngoài cuộc còn hoãn) ⇒ không đẻ chan_guard.
  LOI.delete(c);
  r = await xu();
  assert.equal(r, null, `không còn tin nào rút được (thật: ${JSON.stringify(r)})`);
  const chan = Number((await sb.pool.query("SELECT count(*) n FROM tin_cho_xu_ly WHERE psid=$1 AND trang_thai='chan_guard'", [p])).rows[0].n);
  assert.equal(chan, 0, "0 tin chan_guard");
  // Sale bấm «trả AI» ⇒ THÀNH.
  let tuChoi = null; let tra = null;
  try { tra = await resumeConversation(sb.pool, { teamId: team, id: h.id, reason: "Pancake đã lành — trả AI" }); }
  catch (e) { tuChoi = e.message; }
  console.log(`   [gl3b] V2a «trả AI»: ${tuChoi ? "BỊ TỪ CHỐI — " + tuChoi : "THÀNH"}`);
  assert.equal(tuChoi, null, "«trả AI» KHÔNG bị chặn bởi tin khách nhắn trong lúc chờ");
  assert.equal(tra.ok, true);
  // Khách nhắn tiếp, Pancake lành ⇒ bot trả lời đúng 1 lần (đường lành sau trả AI).
  MSGS.set(c, [khach(p, 1, "how much?"), khach(p, 2, "??"), khach(p, 3, "giao bao lâu?")]);
  CONVS.set(PAGE, [conv(c, p, "2026-10-07T01:05:00", "giao bao lâu?")]);
  await napVong();
  const n0 = nao.n;
  r = await xu();
  console.log(`   [gl3b] V2a sau trả AI: ketQua=${r?.ketQua} · POST=${post(c)} · não +${nao.n - n0}`);
  assert.equal(r?.ketQua, "xong");
  assert.equal(post(c), 1, "bot trả lời đúng 1 lần, chỉ sau khi Pancake lành và AI được trả lại");
  khongChan();
});

test("GL3b V2b · F1 BIÊN: hội thoại sale ĐANG giữ (nhánh doc_loi:khong_thuoc_ai, không việc mới) ⇒ tin theo KHÔNG bị chốt — đi đường thường", { timeout: 30_000 }, async () => {
  const c = "c-v2b", p = "ps-v2b";
  await donCaTruoc(p);
  MSGS.set(c, [khach(p, 1, "how much?")]);
  CONVS.set(PAGE, [conv(c, p, "2026-10-07T02:00:00")]);
  await napVong();
  let ds = await tinCua(p);
  assert.equal(ds.length, 1);
  const idA = ds[0].id;
  await sb.pool.query(
    "UPDATE hoi_thoai h SET chu_so_huu='SALE', trang_thai='HANDOFF', ly_do_cuoi='truoc_ca' FROM page pg WHERE pg.id=h.page_id AND pg.page_id=$2 AND h.psid=$1",
    [p, PAGE]);
  const h0 = await ht(p);
  const v0 = (await viecMo(h0.id)).length;
  LOI.set(c, ["html502", "html502"]);
  let r = await xu(); assert.equal(r.ketQua, "thu_lai");
  LOI.delete(c);
  MSGS.set(c, [khach(p, 1, "how much?"), khach(p, 2, "??")]);
  CONVS.set(PAGE, [conv(c, p, "2026-10-07T02:00:20", "??")]);
  await napVong();
  ds = await tinCua(p);
  assert.equal(ds.length, 2, `bộ nạp xếp tin 2: ${gon(ds)}`);
  LOI.set(c, ["html502", "html502"]);
  await toi(p); r = await xu(); assert.equal(r.ketQua, "thu_lai");
  await toi(p); r = await xu();
  ds = await tinCua(p);
  const h = await ht(p);
  console.log(`   [gl3b] V2b lượt 3: ${r?.ketQua} · tin=${gon(ds)} · hội thoại=${h.chu_so_huu}/${h.trang_thai}/${h.ly_do_cuoi} · việc ${v0}→${(await viecMo(h.id)).length}`);
  assert.equal(String(r?.tinId), String(idA));
  assert.equal(r.ketQua, "doc_loi_khong_thuoc_ai");
  assert.deepEqual([ds[0].trang_thai, ds[0].ly_do], ["xong", "doc_loi:khong_thuoc_ai"]);
  assert.equal(ds[1].trang_thai, "cho", "không có việc mới ⇒ tin theo không thuộc việc nào ⇒ KHÔNG chốt");
  assert.equal((await viecMo(h.id)).length, v0, "không đẻ việc");
  assert.equal(Number((await sb.pool.query(
    "SELECT count(*) n FROM nhat_ky WHERE hanh_dong='tin_doc_loi_chot_theo' AND doi_tuong_id=$1", [String(idA)])).rows[0].n), 0);
  // Đường thường (có từ trước GL3b — hôm nay ra chan_guard «hoi_thoai_khong_thuoc_ai», xem nợ N-GL3B-TRA-AI-CHAN-GUARD): Pancake
  // lành ⇒ tin theo được rút RIÊNG, handler xét chủ ⇒ sale đang giữ ⇒ bot không gọi model, không gửi. Không neo kết quả cụ thể
  // của đường thường (luật đó thuộc phiếu khác).
  LOI.delete(c);
  const n0 = nao.n;
  r = await xu();
  console.log(`   [gl3b] V2b tin theo đi đường thường: ketQua=${r?.ketQua} · lyDo=${r?.lyDo}`);
  assert.equal(String(r?.tinId), String(ds[1].id), "tin theo được rút riêng");
  assert.equal(nao.n - n0, 0, "sale đang giữ ⇒ không gọi model");
  assert.equal(post(c), 0, "sale đang giữ ⇒ không gửi");
  khongChan();
});

// ── F2 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("GL3b V2c · F2 pkDocTin: token trả lỗi KHÁC loại ⇒ câu lỗi nói lỗi «thật» nhất (quá hạn > mạng > 103 > 121 > 105), vòng xoay/thứ tự token không đổi", { timeout: 20_000 }, async () => {
  const bang = [];
  let so = 0;
  // [tokA, tokB] · regex câu phải khớp · regex câu KHÔNG được khớp · ghi chú
  const CA = [
    [["treo", "q105"], /^Pancake quá hạn — quá hạn 150 ms/, /quyền/, "A quá hạn · B 105 (verdict R3)"],
    [["mang", "q105"], /^Pancake lỗi mạng — .*ECONNRESET/, /quyền/, "A lỗi mạng · B 105 (R3b)"],
    [["q121", "q105"], /không có ghế trong gói cước/, /quyền/, "A 121 · B 105 (R3b)"],
    [["q103", "q105"], /Phiên đăng nhập đã hết hạn/, /quyền/, "A 103 · B 105"],
    // 121 là lỗi cấp TÀI KHOẢN (tài khoản thấy page mà không có ghế — trả thường xuyên như 105): không được che token hết phiên
    [["q103", "q121"], /Phiên đăng nhập đã hết hạn/, /gói cước/, "A 103 · B 121 (/code-review #3)"],
    [["q121", "q103"], /Phiên đăng nhập đã hết hạn/, /gói cước/, "A 121 · B 103"],
    [["treo", "mang"], /^Pancake quá hạn — quá hạn 150 ms/, /mạng/, "A quá hạn · B mạng"],
    [["mang", "q121"], /^Pancake lỗi mạng/, /gói cước/, "A mạng · B 121"],
    // CHO-QUA — các cặp đã nói đúng từ vòng 1 phải giữ nguyên
    [["q105", "treo"], /^Pancake quá hạn — quá hạn 150 ms/, /quyền/, "A 105 · B quá hạn"],
    [["q105", "q121"], /không có ghế trong gói cước/, /quyền/, "A 105 · B 121"],
    [["q105", "q105"], /^Bạn không có quyền với trang này$/, /quá hạn|mạng/, "105 mọi token"],
    [["treo", "treo"], /^Pancake quá hạn — quá hạn 150 ms/, /quyền/, "quá hạn mọi token"],
    // Thân hỏng DỪNG vòng xoay (GL3 R7e): câu của lượt đó đứng — vẫn là lỗi «Pancake trục trặc», không phải quyền
    [["treo", "html502"], /^Pancake lỗi \(HTTP 502\)/, /quyền/, "A quá hạn · B 502 HTML"],
  ];
  const sai = [];
  for (const [kieu, phai, cam, nhan] of CA) {
    const cv = `c-v2c-${++so}`;
    LOI.set(cv, kieu);
    const g0 = goi.length;
    const kq = await pkDocTin(`gl3b-v2-pg${so}`, cv, "k");
    const tok = goi.slice(g0).map((g) => g.tok);
    const dung = kq.ok === false && phai.test(kq.loi) && !cam.test(kq.loi) && tok.join() === "tokA,tokB";
    bang.push(`${dung ? "✓" : "✗"} ${nhan} → «${String(kq.loi).slice(0, 70)}» [${tok.join(",")}]`);
    if (!dung) sai.push(`${nhan}: thật ok=${kq.ok} «${kq.loi}» [${tok.join(",")}] · đòi ${phai} · cấm ${cam} · token tokA,tokB`);
    LOI.delete(cv);
  }
  // `_pageTokIdx` không bị đụng: page đã ghim tokB (đọc được bằng tokB) ⇒ lượt lỗi khác loại sau đó vẫn khởi đầu từ tokB.
  const pg = "gl3b-v2-ghim";
  LOI.set("c-v2c-ghim", ["q105", "rong"]);
  assert.deepEqual(await pkDocTin(pg, "c-v2c-ghim", "k"), { ok: true, messages: [] });
  LOI.set("c-v2c-ghim", ["q105", "treo"]);
  const g0 = goi.length;
  const kq = await pkDocTin(pg, "c-v2c-ghim", "k");
  const tokGhim = goi.slice(g0).map((g) => g.tok);
  bang.push(`ghim tokB · A 105 · B quá hạn → «${String(kq.loi).slice(0, 70)}» [${tokGhim.join(",")}]`);
  if (tokGhim.join() !== "tokB,tokA") sai.push(`ghim: chân khởi đầu phải vẫn là token đã ghim — thật [${tokGhim.join(",")}]`);
  if (!/^Pancake quá hạn — quá hạn 150 ms/.test(kq.loi)) sai.push(`ghim: thật «${kq.loi}»`);
  LOI.delete("c-v2c-ghim");
  console.log(`   [gl3b] V2c ${bang.join(" · ")}`);
  assert.deepEqual(sai, [], "mọi cặp token khác loại phải nói lỗi «thật» nhất, vòng xoay ĐỌC giữ nguyên (tokA rồi tokB)");
});

test("GL3b V2d · F2 trọn đường page POLL: token A quá hạn · token B 105 ⇒ sổ bỏ-qua («Tin bị lọc») · ly_do tin · nhật ký bàn giao đều nói «Pancake quá hạn», không «không có quyền»", { timeout: 30_000 }, async () => {
  const c = "c-v2d", p = "ps-v2d";
  await donCaTruoc(p);
  MSGS.set(c, [khach(p, 1, "how much?")]);
  CONVS.set(PAGE, [conv(c, p, "2026-10-07T03:00:00")]);
  // Bộ nạp đọc lỗi (A treo · B 105) ⇒ không xếp, ghi sổ bỏ-qua `doc_tin_loi`.
  LOI.set(c, ["treo", "q105"]);
  let n = await napVong();
  const bq = (await sb.pool.query("SELECT ly_do, chu_thich FROM nap_bo_qua WHERE conv_id=$1", [c])).rows[0];
  console.log(`   [gl3b] V2d nạp: docTinLoi=${n.docTinLoi} · nap_bo_qua=${JSON.stringify(bq)}`);
  assert.equal(bq?.ly_do, "doc_tin_loi");
  assert.match(bq.chu_thich, /Pancake quá hạn/);
  assert.doesNotMatch(bq.chu_thich, /quyền/);
  // Pancake lành ở lượt đọc của bộ nạp (qua thời gian lùi 30 s) ⇒ xếp tin; worker gặp lại A treo · B 105 ba lượt.
  LOI.delete(c);
  n = await napVong(31_000);
  const ds = await tinCua(p);
  assert.equal(ds.length, 1, `bộ nạp xếp tin sau khi lành: ${gon(ds)} · nap=${JSON.stringify(n)}`);
  const id = ds[0].id;
  LOI.set(c, ["treo", "q105"]);
  const lyDo = [];
  let r;
  for (let lan = 1; lan <= TRAN_THU; lan++) {
    r = await xu();
    assert.equal(String(r?.tinId), String(id));
    lyDo.push(String((await tinCua(p))[0].ly_do));
    if (lan < TRAN_THU) { assert.equal(r.ketQua, "thu_lai"); await toi(p); }
  }
  const nk = (await sb.pool.query(
    "SELECT ghi_chu FROM nhat_ky WHERE hanh_dong='tin_doc_loi_ban_giao' AND doi_tuong_id=$1", [String(id)])).rows;
  console.log(`   [gl3b] V2d worker: lượt ${TRAN_THU}=${r.ketQua} · ly_do lượt 1=«${lyDo[0].slice(0, 120)}» · nhật ký=«${String(nk[0]?.ghi_chu).slice(0, 120)}»`);
  assert.equal(r.ketQua, "doc_loi_ban_giao");
  for (const l of lyDo.slice(0, 2)) { assert.match(l, /^LoiDocLichSu: Pancake không trả lịch sử: Pancake quá hạn — quá hạn 150 ms/); assert.doesNotMatch(l, /quyền/); }
  assert.equal(nk.length, 1);
  assert.match(nk[0].ghi_chu, /Pancake quá hạn — quá hạn 150 ms/);
  assert.doesNotMatch(nk[0].ghi_chu, /quyền/);
  assert.equal(post(c), 0);
  LOI.delete(c);
  khongChan();
});
