// RP1 · ĐƯỜNG ĐỌC CSDL (`V3_RAP_PROMPT_BAT=1`) ĐỦ CHO PILOT — trên Postgres HỘP CÁT riêng (`aicloser_v3_test_rp1_p<pid>`, tự dựng
// tự dọn), fetch GIẢ (host khác pages.fm ⇒ ném), van gửi mở CHỈ trong env tiến trình ca.
//
// ĐI ĐƯỜNG THẬT (phiếu ④ «⚠️ Ca đi đường thật»): danh mục POS → gộp gốc (`gopMonThanhGoc`) → page gắn gốc × shop (`ganPageVaoGoc`) →
// bản sao `kb` của page (như MN2 nạp) → ĐỐI SOÁT «chép» THẬT (`chuyen-ban-sao.js#doiSoatDonVi` + cửa lưu giá chỉ-giá `saveProduct`, nối
// đúng khuôn `v3/chay-that.js`) ⇒ ảnh + «Tên bậc» vào MÓN POS — KHÔNG INSERT ảnh/giá tay lên món. Rồi `chay-worker#motLuot` → worker →
// handler-v3 với `layKb` MẶC ĐỊNH (`rapKb`, cờ bật, `catalog.js` thật) + `lanNhanh` MẶC ĐỊNH (`fast-lane.js` thật) + cửa ra mặc định →
// `bocCuaGuiBen` → cửa Messenger thật → `pkSendImage`/`pkSendReply` → fetch GIẢ. Ca model chỉ tiêm `layModel`/`chayCloser`/`phanLoai`
// (và `lanNhanh` trả «không nhận» để đi nhánh model); bên trong `chayCloser` gọi `executeTool` THẬT.
// Nhánh KHÔNG chạm: Pancake thật · ảnh lớn quá hạn 30 s (N-GL3B-HAN-ANH) · nhãn tiếng Việt bị cửa ra chặn · màn «Prompt của page».
import "./_bat-cua-de-do.mjs";   // PHẢI đứng đầu: fast-lane đọc FASTLANE_INTRO/TEMPLATES lúc nạp module
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dungSandbox } from "../db/sandbox.js";
import { maHoa } from "../db/khoa.js";
import * as cw from "../src/queue/chay-worker.js";
import { xepTin } from "../src/queue/kho.js";
import { baoDamHoiThoai } from "../src/chat/kho.js";
import { config } from "../src/config.js";
import { datKhoTokenDb, lamMoiTokenDb } from "../src/pancake.js";
import { congHttpGhi } from "../src/chat/handler-v3.js";
import { rapKb } from "../src/chat/rap-prompt.js";
import { executeTool } from "../src/tools.js";
import { buildIntro } from "../src/fast-lane.js";
import { buildSystem, khoiBoLuat, CORE } from "../src/prompts.js";
import { getKBForPage, updatePageProducts } from "../src/kb.js";
import { LoiCuaGuiDong } from "../src/channels/messenger/index.js";
import { donViDoiSoat, doiSoatDonVi } from "../src/products/chuyen-ban-sao.js";
import { gopMonThanhGoc, ganPageVaoGoc, monCuaGoc } from "../src/products/san-pham-goc.js";
import { saveProduct } from "../src/admin-v3/operations.js";
import { taoBuocDayBot } from "../v3/src/ui/van-hanh/router.js";
import { seedBoLuatChung } from "../db/di-tru/bo-luat-va-ky-nang.js";

const PUB = "http://pub.thu:3102";
const A1 = "https://content.pancake.vn/rp1/a1.jpg";
const A2 = "https://content.pancake.vn/rp1/a2.jpg";
const FB = "/uploads/rp1-fb1.jpg";
const ENV = {
  V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "0", PK_MARK_UNREAD: "0", V3_DIEN_TAP: undefined,
  V3_TRAN_PAGE_BAT: "50", V3_NAP_IM_BOTCAKE_MS: "0", V3_NAP_CHI_CHUA_DOC: "0", V3_NAP_THE_CHAN: "Đã gửi",
  V3_RAP_PROMPT_BAT: "1", V3_LUAT_CHUNG_CSDL: undefined,
};
const envCu = {}; const cu = {};
const goi = [];                 // { method, loai, psid, body, ra }
const CHE_ANH = new Map();      // psid → (url, lanThuMay) => "ok" | "tuChoi" | "quyen" | "mang" | "cong"
const day = [];                 // bản chép sang bot v1 (GIẢ) — đối soát đẩy qua đây
let sb; let T; let bc; let chan0 = 0;
const P = {};                   // page_id text → page.id
const tl = (j) => ({ status: 200, json: async () => j });
const q = (sql, a = []) => sb.pool.query(sql, a);
const mot = async (sql, a = []) => (await q(sql, a)).rows[0];

before(async () => {
  if (!config.pkTags.handoff) { cu.handoff = config.pkTags.handoff; config.pkTags.handoff = "AI back Sale"; }
  cu.publicUrl = config.publicUrl; config.publicUrl = PUB;
  process.env.V3_KHOA_MA_HOA ||= "f".repeat(64);
  sb = await dungSandbox("rp1");
  console.log(`   [rp1] hộp cát ${sb.ten} · tệp đo ${fileURLToPath(new URL("../src/chat/rap-prompt.js", import.meta.url))} · cwd ${process.cwd()}`);
  T = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
  const u = String((await mot("INSERT INTO nguoi_dung(email,ten) VALUES('qt@rp1.test','QT') RETURNING id")).id);
  bc = { teamId: T, nguoiDungId: u, vai: ["quan-tri"] };

  // 1) fetch GIẢ trước — rồi mới mở van.
  globalThis.fetch = async (url0, init) => {
    const url = new URL(String(url0));
    if (url.host !== "pages.fm") throw new Error(`ca RP1: lượt gọi lạ ra ${url.host} — chặn`);
    const method = String(init?.method || "GET").toUpperCase();
    const m = /\/conversations\/conv-([^/]+)\/(messages|toggle_tag)$/.exec(url.pathname);
    const psid = m ? decodeURIComponent(m[1]) : "";
    const loai = m ? m[2] : url.pathname.split("/").pop();
    let body = null; try { body = init?.body ? JSON.parse(init.body) : null; } catch { body = String(init?.body); }
    const g = { method, loai, psid, body, ra: "ok" };
    goi.push(g);
    if (method === "GET" && loai === "conversations") return tl({ conversations: [] });
    if (method === "GET" && loai === "settings") return tl({ settings: { tags: [{ id: 9, text: config.pkTags.handoff }, { id: 3, text: "Đã gửi" }] } });
    if (method === "GET" && loai === "messages") return tl({ messages: [{ id: `m-${psid}-1`, from: { id: psid, name: "Khách" }, message: "how much?" }] });
    if (method === "POST" && loai === "messages" && body?.content_url) {
      const lan = goi.filter((x) => x !== g && x.psid === psid && x.body?.content_url === body.content_url).length;
      g.ra = CHE_ANH.get(psid)?.(body.content_url, lan) || "ok";
      if (g.ra === "tuChoi") return tl({ success: false, original_error: "invalid_upload_fb_attachments_result" });
      if (g.ra === "quyen") return tl({ success: false, error_code: 105, message: "Bạn không có quyền với trang này" });
      if (g.ra === "mang") throw new TypeError("fetch failed");
      // Dáng CỔNG HTTP GHI của handler-v3: chặn TRƯỚC khi tới mạng, ném `LoiCuaGuiDong` (pancake.js gắn `biChan`, không `daGoi`).
      if (g.ra === "cong") throw new LoiCuaGuiDong("CỔNG HTTP GHI chặn POST pages.fm — dáng ca RP1");
      return tl({ success: true, id: `anh-${goi.length}` });
    }
    if (method === "POST" && loai === "messages") return tl({ success: true, id: `bot-${goi.length}` });
    return tl({ success: true });
  };
  // 2) kho token tất định (một token GIẢ).
  cu.tok = config.pancakeToken; cu.tokX = config.pancakeTokensExtra;
  config.pancakeToken = ""; config.pancakeTokensExtra = [];
  datKhoTokenDb(async () => ["tokA"]); await lamMoiTokenDb();
  // 3) mở van + cờ CHỈ trong tiến trình ca.
  for (const [k, v] of Object.entries(ENV)) { envCu[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  chan0 = congHttpGhi.daChan.length;

  // 4) Dữ liệu: danh mục POS (tên POS mang số hiệu + đuôi biến thể, đúng khuôn doc-danh-muc) → gốc → page gắn → bản sao → «chép».
  await q("INSERT INTO ket_noi_pos(team_id,market,shop_id,api_key_ma,bat) VALUES($1,'Saudi','111',$2,true)", [T, maHoa("k")]);
  const monPos = (ma, ten, sku, hetHang = false) =>
    q("INSERT INTO san_pham(team_id,ma,ten,sku,ton_kho,het_hang,nguon) VALUES($1,$2,$3,$4,5,$5,'pos')", [T, ma, ten, sku, hetHang]);
  const trang = async (pid, ten) => {
    P[pid] = String((await mot("INSERT INTO page(team_id,page_id,ten,nguon_tin,bot_ai_bat,pos_shop_id) VALUES($1,$2,$3,'poll',true,'111') RETURNING id",
      [T, pid, ten])).id);
    return P[pid];
  };
  // Gốc A «tummiva»: a0 HẾT HÀNG (mã nhỏ nhất ⇒ đứng đầu nếu không lọc) · a1 50ml · a2 100ml.
  await monPos("111:a0", "125 - Tummiva Care gel — 30ml", "125", true);
  await monPos("111:a1", "125 - Tummiva Care gel — 50ml", "125");
  await monPos("111:a2", "125 - Tummiva Care gel — 100ml", "125");
  const GA = await gopMonThanhGoc(sb.pool, T, { maGoc: "tummiva", ten: "Tummiva Care gel", sku: "125", posMa: ["111:a0", "111:a1", "111:a2"] });
  await ganPageVaoGoc(sb.pool, T, GA.id, { pageId: await trang("rp1-pa", "Tummiva KSA"), shopId: "111" });
  const bs = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon) VALUES($1,$2,'kb:rp1-pa:SP01','Tummiva','kb') RETURNING id", [T, P["rp1-pa"]])).id);
  await q(`INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan) VALUES
             ($1,$2,2,10900,'SAR','Buy 1 Get 1 FREE'), ($1,$2,4,15900,'SAR','Buy 2 Get 2 FREE (Total 4 Products)')`, [T, bs]);
  await q(`INSERT INTO anh_san_pham(team_id,san_pham_id,duong,nhan,thu_tu,nguon) VALUES
             ($1,$2,$3,'Ảnh sản phẩm',0,'kb'), ($1,$2,$4,'Feedback khách',1,'kb'), ($1,$2,$5,'Ảnh sản phẩm',2,'kb')`, [T, bs, A1, FB, A2]);
  const deps = (gocId) => ({
    luuGia: async (posMa, x) => {
      const m = await monCuaGoc(sb.pool, T, gocId, posMa);
      return saveProduct(sb.pool, bc, m.id, { offers: x.offers, version: x.version },
        { chiGia: true, sauKhiLuu: taoBuocDayBot({ day: async (pid, products) => { day.push({ pid, products }); } }) });
    },
    dayMon: async (id) => taoBuocDayBot({ day: async (pid, products) => { day.push({ pid, products }); } })(sb.pool, bc, id),
  });
  const dv = await donViDoiSoat(sb.pool, T, GA.id, "111");
  await doiSoatDonVi(sb.pool, T, { gocId: GA.id, shopId: "111", cap: [{ banSaoId: bs, posMa: "111:a1" }], dauDonVi: dv.dauDonVi }, deps(GA.id));

  // Gốc C «het»: món DUY NHẤT hết hàng ⇒ page gắn không còn gì để chào.
  await monPos("111:c1", "140 - Old Cream — 20g", "140", true);
  const GC = await gopMonThanhGoc(sb.pool, T, { maGoc: "het-hang", ten: "Old Cream", sku: "140", posMa: ["111:c1"] });
  await ganPageVaoGoc(sb.pool, T, GC.id, { pageId: await trang("rp1-pc", "Old Cream KSA"), shopId: "111" });

  // Page CHƯA gắn gốc, món POS RF-15 (`page_id` trỏ page) — đường «giữ như cũ».
  await trang("rp1-pb", "Gold Ring KSA");
  const b1 = String((await mot("INSERT INTO san_pham(team_id,page_id,ma,ten,sku,nguon) VALUES($1,$2,'111:b1','130 - Gold Ring — Gold','130','pos') RETURNING id",
    [T, P["rp1-pb"]])).id);
  await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan) VALUES($1,$2,1,19900,'SAR','')", [T, b1]);
});
after(async () => {
  for (const [k, v] of Object.entries(envCu)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  datKhoTokenDb(null);
  config.pancakeToken = cu.tok; config.pancakeTokensExtra = cu.tokX; config.publicUrl = cu.publicUrl;
  if ("handoff" in cu) config.pkTags.handoff = cu.handoff;
  await sb?.don();
});

/* ─────────────────────────── trợ lý ca ─────────────────────────── */
let seq = 0;
async function xep(psid, page = "rp1-pa", noiDung = "how much?") {
  await baoDamHoiThoai(sb.pool, { teamId: T, pageRowId: P[page], psid });
  return (await xepTin(sb.pool, { teamId: T, pageId: page, psid, convId: `conv-${psid}`, custId: `cust-${psid}`,
    msgId: `mid-${psid}-${++seq}`, noiDung })).id;
}
const DEPS_NAP = { doiGoXong: () => ({ ms: 0, reason: "ca RP1" }) };
const nhanhThat = { layModel: () => ({ maModel: "test", nguon: "test" }), chayCloser: async () => { throw new Error("ca RP1: model không được gọi ở lượt fast-lane"); } };
const luot = (depsXuLy = nhanhThat) => cw.motLuot(sb.pool, { depsNap: DEPS_NAP, depsXuLy });
/** Nhánh MODEL: lớp nhanh không nhận, phân loại trung tính, `chayCloser` giả gọi tool THẬT rồi trả chữ. */
const quaModel = (lam) => ({
  lanNhanh: () => ({ handled: false, reason: "ca RP1 — đi nhánh model" }),
  phanLoai: async () => ({ intent: "other" }),
  layModel: () => ({ maModel: "test", nguon: "test" }),
  chayCloser: async ({ kb, state, business, assertCanAct }) => lam({ kb, state, business, assertCanAct }),
});
const postCua = (tu, psid) => goi.slice(tu).filter((g) => g.method === "POST" && g.loai === "messages" && g.psid === psid);
/** Thứ tự POST của một khách: ['anh:<url>', …, 'chu'] (lượt cổng chặn KHÔNG tới mạng ⇒ không tính). */
const dong = (tu, psid) => postCua(tu, psid).filter((g) => g.ra !== "cong").map((g) => (g.body?.content_url ? `anh:${g.body.content_url}` : "chu"));
const tin = async (id) => mot("SELECT trang_thai, ly_do FROM tin_cho_xu_ly WHERE id=$1", [id]);
const viec = async (psid) => Number((await mot(
  "SELECT count(*)::int n FROM viec_can_xu_ly v JOIN hoi_thoai h ON h.id=v.hoi_thoai_id WHERE h.psid=$1", [psid])).n);
const hoiThoai = async (psid) => mot("SELECT trang_thai, chu_so_huu FROM hoi_thoai WHERE psid=$1", [psid]);
const soAnh = async (tinId) => (await mot("SELECT du_lieu, lane FROM so_ai WHERE nguon_tep='tin_cho_xu_ly:image' AND nguon_dong=$1", [Number(tinId)])) || null;
const trangPA = async () => mot("SELECT loi_gui_lien_tiep, ngat_vi FROM page WHERE page_id='rp1-pa'");
const khongChan = () => assert.equal(congHttpGhi.daChan.length - chan0, 0, "cổng HTTP ghi THẬT không chặn lượt nào (van mở trong ca)");
const kbPA = () => rapKb(sb.pool, { teamId: T, pageIdText: "rp1-pa" });
const CAPTION = "Hello po! 😊 Tummiva Care gel — 50ml";

/* ═══════════ ④1 — ẢNH ═══════════ */

test("R1a · cờ BẬT: products[0] = món còn hàng mang 3 ảnh «chép» từ bản sao, ĐÚNG thứ tự (url thô · nhãn)", async () => {
  const kb = await kbPA();
  assert.equal(kb.nguon, "db");
  assert.equal(kb.products[0].id, "111:a1");
  assert.deepEqual(kb.products[0].images, [{ url: A1, label: "Ảnh sản phẩm" }, { url: FB, label: "Feedback khách" }, { url: A2, label: "Ảnh sản phẩm" }]);
  // ảnh nằm trên MÓN POS nhờ đối soát (không INSERT tay): đếm theo dòng CSDL của món.
  const n = Number((await mot("SELECT count(*)::int n FROM anh_san_pham a JOIN san_pham s ON s.id=a.san_pham_id WHERE s.ma='111:a1'")).n);
  assert.equal(n, 3);
  assert.deepEqual(kb.products.find((p) => p.id === "111:a2").images, [], "món không ảnh ⇒ images rỗng (không bịa)");
});

test("R1b · khối KB có dòng «Ảnh có sẵn (dùng tool send_product_image để gửi): <nhãn>» ĐÚNG dưới món có ảnh", async () => {
  const kb = await kbPA();
  const khoi = kb.text.split("\n- [");
  const a1 = khoi.find((k) => k.startsWith("111:a1]"));
  const a2 = khoi.find((k) => k.startsWith("111:a2]"));
  assert.match(a1, /\n {4}Ảnh có sẵn \(dùng tool send_product_image để gửi\): Ảnh sản phẩm, Feedback khách(\n|$)/);
  assert.doesNotMatch(a2, /Ảnh có sẵn/);
  // Thiếu PUBLIC_URL ⇒ ảnh tương đối tool KHÔNG gửi được ⇒ không hứa với model (/code-review #7).
  config.publicUrl = "";
  try {
    const kb0 = await kbPA();
    assert.match(kb0.text, /\n {4}Ảnh có sẵn \(dùng tool send_product_image để gửi\): Ảnh sản phẩm\n/);
  } finally { config.publicUrl = PUB; }
});

test("R1c · send_product_image (tool THẬT trên kb THẬT): không loại ⇒ hai ảnh «sản phẩm» tuyệt đối trước; «feedback» ⇒ ảnh tương đối ghép PUBLIC_URL", async () => {
  const kb = await kbPA();
  const s1 = { pageId: "rp1-pa", sentImages: new Set() };
  const r1 = await executeTool("send_product_image", { caption: "Here po" }, { kb, state: s1 });
  assert.ok(!r1.isError, r1.content);
  assert.deepEqual(s1.pendingImages.slice(0, 2).map((x) => x.url), [A1, A2]);
  const s2 = { pageId: "rp1-pa", sentImages: new Set() };
  const r2 = await executeTool("send_product_image", { caption: "Here po", category: "feedback" }, { kb, state: s2 });
  assert.ok(!r2.isError, r2.content);
  assert.deepEqual(s2.pendingImages.map((x) => x.url), [`${PUB}${FB}`]);
});

test("R1d · buildIntro (tin chào, món có bậc giá) ⇒ 2 ảnh tuyệt đối «sản phẩm» + caption không số hiệu + bảng giá theo «Tên bậc»", async () => {
  const it = buildIntro(await kbPA(), "en");
  assert.deepEqual(it.images.map((x) => x.url), [A1, A2]);
  assert.equal(it.caption, CAPTION);
  assert.match(it.text, /🎁 Buy 1 Get 1 FREE \(2 items\) — 109 SAR\n🎁 Buy 2 Get 2 FREE \(Total 4 Products\) — 159 SAR/);
});

test("R1e · trọn đường fast-lane: worker → cửa thật → Pancake giả: ảnh A1 (caption) → ảnh A2 → chữ; tin xong", async () => {
  const g0 = goi.length;
  const id = await xep("r1e");
  await luot();
  assert.deepEqual(dong(g0, "r1e"), [`anh:${A1}`, `anh:${A2}`, "chu"]);
  const p = postCua(g0, "r1e");
  assert.equal(p[0].body.message, CAPTION, "caption kèm tấm ĐẦU");
  assert.equal(p[1].body.message, "", "tấm sau không lặp caption");
  assert.match(p[2].body.message, /🎁 Buy 1 Get 1 FREE \(2 items\) — 109 SAR/);
  assert.match(p[2].body.message, /🎁 Buy 2 Get 2 FREE \(Total 4 Products\) — 159 SAR/);
  assert.equal(p[2].body.message, buildIntro(await kbPA(), "en").text, "chữ gửi = đúng tin chữ của tin chào");
  assert.equal((await tin(id)).trang_thai, "xong");
  const s = await soAnh(id);
  assert.equal(s.du_lieu.n, 2); assert.equal(s.du_lieu.anh_hong, undefined);
  khongChan();
});

test("R1f · trọn đường MODEL: send_product_image «feedback» ⇒ POST ảnh PUBLIC_URL (caption) rồi chữ", async () => {
  const g0 = goi.length;
  const id = await xep("r1f", "rp1-pa", "can I see feedback from your customers po?");
  await luot(quaModel(async (c) => {
    const r = await executeTool("send_product_image", { caption: "Here po 😊", category: "feedback" }, c);
    assert.ok(!r.isError, r.content);
    return "These are real photos from our customers po 😊 Would you like to order?";
  }));
  assert.deepEqual(dong(g0, "r1f"), [`anh:${PUB}${FB}`, "chu"]);
  assert.equal(postCua(g0, "r1f")[0].body.message, "Here po 😊");
  assert.equal((await tin(id)).trang_thai, "xong");
  khongChan();
});

/* ═══════════ ④2 — ẢNH HỎNG KHÔNG CHẶN CHỮ ═══════════ */

test("R2a · ảnh 2 Pancake từ chối CẢ HAI lần ⇒ thử lại đúng 1 lần, bỏ ảnh, 1 POST chữ đúng nội dung · tin xong · 0 việc · GL4 không đếm · sổ ghi ảnh hỏng", async () => {
  const g0 = goi.length;
  CHE_ANH.set("r2a", (u) => (u === A2 ? "tuChoi" : "ok"));
  const id = await xep("r2a");
  await luot();
  assert.deepEqual(dong(g0, "r2a"), [`anh:${A1}`, `anh:${A2}`, `anh:${A2}`, "chu"]);
  const chu = postCua(g0, "r2a").filter((g) => !g.body?.content_url);
  assert.equal(chu.length, 1);
  assert.equal(chu[0].body.message, buildIntro(await kbPA(), "en").text);
  const t = await tin(id);
  assert.equal(t.trang_thai, "xong", `tin: ${JSON.stringify(t)}`);
  assert.equal(await viec("r2a"), 0, "0 việc sale");
  assert.notEqual((await hoiThoai("r2a")).trang_thai, "HANDOFF");
  assert.equal((await trangPA()).loi_gui_lien_tiep, 0, "ảnh hỏng mà chữ OK ⇒ GL4 KHÔNG đếm");
  const s = await soAnh(id);
  assert.equal(s.du_lieu.n, 1); assert.equal(s.du_lieu.anh_hong, 1);
  khongChan();
});

test("R2b · ảnh 2 chập chờn (lần 1 hỏng, lần thử lại được) ⇒ cả hai ảnh tới khách, 0 ảnh hỏng", async () => {
  const g0 = goi.length;
  CHE_ANH.set("r2b", (u, lan) => (u === A2 && lan === 0 ? "tuChoi" : "ok"));
  const id = await xep("r2b");
  await luot();
  assert.deepEqual(dong(g0, "r2b"), [`anh:${A1}`, `anh:${A2}`, `anh:${A2}`, "chu"]);
  assert.equal((await tin(id)).trang_thai, "xong");
  const s = await soAnh(id);
  assert.equal(s.du_lieu.n, 2); assert.equal(s.du_lieu.anh_hong, undefined);
});

test("R2c · ảnh 2 KHÔNG RÕ (lỗi mạng — có thể đã tới khách) ⇒ KHÔNG POST lại ảnh đó (luật GL3), chữ vẫn đi, tin xong", async () => {
  const g0 = goi.length;
  CHE_ANH.set("r2c", (u) => (u === A2 ? "mang" : "ok"));
  const id = await xep("r2c");
  await luot();
  assert.deepEqual(dong(g0, "r2c"), [`anh:${A1}`, `anh:${A2}`, "chu"]);
  assert.equal((await tin(id)).trang_thai, "xong");
  assert.equal((await soAnh(id)).du_lieu.anh_hong, 1);
});

test("R2d · cổng ghi chặn POST ảnh 2 (không tới mạng) ⇒ NÉM như cũ: 0 POST chữ, tin `loi` LoiGuiChuaXacNhan", async () => {
  const g0 = goi.length;
  CHE_ANH.set("r2d", (u) => (u === A2 ? "cong" : "ok"));
  const id = await xep("r2d");
  await luot();
  assert.deepEqual(dong(g0, "r2d"), [`anh:${A1}`], "không POST chữ, không thử lại lượt bị cổng chặn");
  assert.equal(postCua(g0, "r2d").filter((g) => g.ra === "cong").length, 1, "đã chạm: lượt ảnh 2 tới cổng đúng 1 lần");
  const t = await tin(id);
  assert.equal(t.trang_thai, "loi"); assert.match(t.ly_do, /^LoiGuiChuaXacNhan/);
});

test("R2e · ảnh không url (lỗi không HTTP — dáng GL4 P3d) ⇒ NÉM như cũ: 0 POST chữ", async () => {
  const g0 = goi.length;
  const id = await xep("r2e");
  await luot({ ...nhanhThat, lanNhanh: () => ({ handled: true, reply: "Price is 109 SAR po 😊", lane: "ca_rp1",
    images: [{ url: A1, label: "Ảnh sản phẩm" }, { url: "", label: "ảnh hỏng" }] }) });
  assert.deepEqual(dong(g0, "r2e"), [`anh:${A1}`]);
  const t = await tin(id);
  assert.equal(t.trang_thai, "loi"); assert.match(t.ly_do, /^LoiGuiChuaXacNhan/);
});

test("R2f · ảnh 1 hỏng ⇒ caption DỜI sang tấm gửi được đầu tiên (ảnh 2)", async () => {
  const g0 = goi.length;
  CHE_ANH.set("r2f", (u) => (u === A1 ? "tuChoi" : "ok"));
  const id = await xep("r2f");
  await luot();
  assert.deepEqual(dong(g0, "r2f"), [`anh:${A1}`, `anh:${A1}`, `anh:${A2}`, "chu"]);
  const p = postCua(g0, "r2f");
  assert.equal(p[2].body.message, CAPTION, "caption đi theo ảnh 2");
  assert.equal((await tin(id)).trang_thai, "xong");
});

test("R2g · MỌI ảnh hỏng ⇒ BỎ caption (không ghép vào chữ đã qua cửa ra), chữ y nguyên · sổ: n=0, ảnh hỏng 2", async () => {
  const g0 = goi.length;
  CHE_ANH.set("r2g", () => "tuChoi");
  const id = await xep("r2g");
  await luot();
  assert.deepEqual(dong(g0, "r2g"), [`anh:${A1}`, `anh:${A1}`, `anh:${A2}`, `anh:${A2}`, "chu"]);
  const chu = postCua(g0, "r2g").at(-1).body.message;
  assert.equal(chu, buildIntro(await kbPA(), "en").text);
  assert.ok(!chu.includes(CAPTION), "caption không ghép vào chữ");
  assert.equal((await tin(id)).trang_thai, "xong");
  const s = await soAnh(id);
  assert.equal(s.du_lieu.n, 0); assert.equal(s.du_lieu.anh_hong, 2);
});

test("R2h · nhánh MODEL: ảnh tool bị từ chối ⇒ thử lại 1, chữ vẫn đi, sổ ảnh lane AI ghi ảnh hỏng", async () => {
  const g0 = goi.length;
  CHE_ANH.set("r2h", () => "tuChoi");
  const id = await xep("r2h", "rp1-pa", "can I see feedback from your customers po?");
  await luot(quaModel(async (c) => {
    await executeTool("send_product_image", { caption: "Here po 😊", category: "feedback" }, c);
    return "Sorry po, here is what our customers say: they love it 😊";
  }));
  assert.deepEqual(dong(g0, "r2h"), [`anh:${PUB}${FB}`, `anh:${PUB}${FB}`, "chu"]);
  assert.equal((await tin(id)).trang_thai, "xong");
  const s = await soAnh(id);
  assert.equal(s.lane, "AI"); assert.equal(s.du_lieu.n, 0); assert.equal(s.du_lieu.anh_hong, 1);
});

test("R2j · ảnh 1 KHÔNG RÕ (quá hạn/mạng — kênh đang chập) ⇒ BỎ luôn các tấm còn lại (không chờ thêm hạn, không lặp caption), chữ vẫn đi", async () => {
  const g0 = goi.length;
  CHE_ANH.set("r2j", (u) => (u === A1 ? "mang" : "ok"));
  const id = await xep("r2j");
  await luot();
  assert.deepEqual(dong(g0, "r2j"), [`anh:${A1}`, "chu"]);
  assert.equal((await tin(id)).trang_thai, "xong");
  const s = await soAnh(id);
  assert.equal(s.du_lieu.n, 0); assert.equal(s.du_lieu.anh_hong, 2);
  assert.deepEqual(s.du_lieu.anh_hong_loai, ["khong_ro", "bo_sau_khong_ro"]);
});

test("R2i · ảnh bị LỖI QUYỀN cấp page (mã 105 — chữ cũng sẽ hỏng) ⇒ NÉM như cũ: 0 POST chữ · GL4 ĐẾM lỗi kênh", async () => {
  const g0 = goi.length;
  const truoc = Number((await trangPA()).loi_gui_lien_tiep);
  CHE_ANH.set("r2i", (u) => (u === A1 ? "quyen" : "ok"));
  const id = await xep("r2i");
  await luot();
  assert.deepEqual(dong(g0, "r2i"), [`anh:${A1}`], "không thử lại, không POST chữ");
  const t = await tin(id);
  assert.equal(t.trang_thai, "loi"); assert.match(t.ly_do, /^LoiGuiChuaXacNhan/);
  assert.equal(Number((await trangPA()).loi_gui_lien_tiep), truoc + 1, "lỗi kênh của ảnh vẫn vào chuỗi GL4");
});

/* ═══════════ ④3 — TÊN BẬC + qty (đường thật) ═══════════ */

test("R3a · prompt (khối KB) đọc «Tên bậc» marketer đặt: nhãn + «(2 items)»; nhãn có «Total» không nối", async () => {
  const kb = await kbPA();
  assert.match(kb.text, /Giá — Buy 1 Get 1 FREE \(2 items\): 109 SAR \| Buy 2 Get 2 FREE \(Total 4 Products\): 159 SAR/);
  assert.deepEqual(kb.products[0].tiers.map((t) => [t.label, t.qty, t.price]),
    [["Buy 1 Get 1 FREE (2 items)", 2, 109], ["Buy 2 Get 2 FREE (Total 4 Products)", 4, 159]]);
});

test("R3b · trọn đường đơn: model chốt BOGO qty=1 ⇒ hàng chờ so_luong 2 · tổng 109 SAR · cửa ② QUA; qty=3 ⇒ tool TỪ CHỐI, 0 dòng hàng chờ", async () => {
  const hoSo = { name: "Amina", phone: "0551234567", address: "King Fahd Road, building 12", city: "Riyadh", cod_confirmed: true,
    product_id: "111:a1", total_price: 109, variant: "Buy 1 Get 1 FREE" };
  let ketQua = null;
  const id = await xep("r3b", "rp1-pa", "I will order the promo po");
  await luot(quaModel(async (c) => {
    ketQua = await executeTool("create_draft_order", { ...hoSo, qty: 1 }, c);
    return "Thank you po! We received your details, our team will confirm shortly 😊";
  }));
  assert.ok(!ketQua?.isError, `tool: ${ketQua?.content}`);
  assert.equal((await tin(id)).trang_thai, "xong");
  const hc = await mot(`SELECT du_lieu_don, cua_kiem FROM hang_cho_tao_don h JOIN hoi_thoai t ON t.id=h.hoi_thoai_id WHERE t.psid='r3b'`);
  assert.equal(Number(hc.du_lieu_don.so_luong), 2);
  assert.equal(Number(hc.du_lieu_don.tong_tien), 10900);
  assert.equal(hc.du_lieu_don.tien_te, "SAR");
  assert.equal(hc.cua_kiem.cong["2_tien"].qua, true, JSON.stringify(hc.cua_kiem.cong["2_tien"]));

  let am = null;
  await xep("r3b-am", "rp1-pa", "I want 3 pieces po");
  await luot(quaModel(async (c) => {
    am = await executeTool("create_draft_order", { ...hoSo, qty: 3 }, c);
    return "Let me confirm the package with you po 😊";
  }));
  assert.equal(am?.isError, true); assert.match(am.content, /số lượng không khớp gói giá/);
  assert.equal(Number((await mot(`SELECT count(*)::int n FROM hang_cho_tao_don h JOIN hoi_thoai t ON t.id=h.hoi_thoai_id WHERE t.psid='r3b-am'`)).n), 0);
});

/* ═══════════ ④4 — TÊN SẢN PHẨM ═══════════ */

test("R4a · tên món: bỏ số hiệu «125 -», GIỮ đuôi biến thể; hai món cùng gốc khác tên; khối KB + caption không lộ số hiệu", async () => {
  const kb = await kbPA();
  assert.deepEqual(kb.products.map((p) => [p.id, p.name]), [["111:a1", "Tummiva Care gel — 50ml"], ["111:a2", "Tummiva Care gel — 100ml"]]);
  assert.match(kb.text, /- \[111:a1\] Tummiva Care gel — 50ml\n/);
  assert.doesNotMatch(kb.text, /125 -/);
  assert.equal(buildIntro(kb, "en").caption, CAPTION);
});

test("R4b · page CHƯA gắn gốc (món RF-15) ⇒ tên GIỮ như cũ", async () => {
  const kb = await rapKb(sb.pool, { teamId: T, pageIdText: "rp1-pb" });
  assert.equal(kb.products[0].name, "130 - Gold Ring — Gold");
  assert.match(kb.text, /- \[111:b1\] 130 - Gold Ring — Gold/);
  assert.deepEqual(kb.products[0].tiers.map((t) => t.label), ["Buy 1"], "nhãn trống ⇒ «Buy 1» như cũ");
});

/* ═══════════ ④5 — HẾT HÀNG ═══════════ */

test("R5a · món HẾT HÀNG (mã nhỏ nhất) bị lọc khỏi products và khối KB — không đứng đầu", async () => {
  const kb = await kbPA();
  assert.equal(kb.products[0].id, "111:a1");
  assert.ok(!kb.products.some((p) => p.id === "111:a0"));
  assert.doesNotMatch(kb.text, /111:a0|30ml/);
  assert.equal(kb.noData, false);
});

test("R5b · page mà MỌI món hết hàng ⇒ noData (như đường cũ: bản chép bot không có món nào)", async () => {
  const kb = await rapKb(sb.pool, { teamId: T, pageIdText: "rp1-pc" });
  assert.deepEqual(kb.products, []);
  assert.equal(kb.noData, true);
});

/* ═══════════ ④6 — LUẬT LÕI GIỮ TRONG MÃ ═══════════ */

test("R6a · cờ BẬT + V3_LUAT_CHUNG_CSDL vắng ⇒ prompt dùng CORE trong mã (dù CSDL có bản hợp lệ); =1 ⇒ dùng bản CSDL", async () => {
  await seedBoLuatChung(sb.pool);
  const ban = await mot("SELECT noi_dung FROM bo_luat_chung WHERE dang_dung ORDER BY phien_ban DESC LIMIT 1");
  assert.ok(ban?.noi_dung, "hộp cát có bản bo_luat_chung");
  delete process.env.V3_LUAT_CHUNG_CSDL;
  const kbVang = await kbPA();
  assert.equal(kbVang.boLuatChung, "");
  assert.equal(khoiBoLuat(kbVang).nguon, "CORE");
  assert.equal(buildSystem(kbVang)[0].text, CORE);
  assert.match(kbVang.text, /quy tắc ĐANG ÁP DỤNG thật vẫn là CORE/, "câu khai ở khối KB khớp khối đầu prompt");
  process.env.V3_LUAT_CHUNG_CSDL = "1";
  try {
    const kbBat = await kbPA();
    assert.equal(kbBat.boLuatChung, String(ban.noi_dung));
    assert.equal(khoiBoLuat(kbBat).nguon, "csdl");
    assert.notEqual(buildSystem(kbBat)[0].text, CORE);
    assert.match(kbBat.text, /bản này ĐANG ÁP DỤNG ở khối luật đầu prompt/);
  } finally { delete process.env.V3_LUAT_CHUNG_CSDL; }
});

test("R6b · =1 nhưng bản CSDL mới nhất THIẾU đoạn THẨM QUYỀN ⇒ khối đầu lùi về CORE và câu khai ở khối KB cũng nói CORE (không hai lời khai trái nhau)", async () => {
  // Một bản đang áp mỗi phạm vi (UNIQUE `bo_luat_chung_mot_ban_dang_ap`) ⇒ tạm cất bản seed, dựng bản thiếu THẨM QUYỀN, rồi trả lại.
  const cu = (await q("UPDATE bo_luat_chung SET dang_dung=false WHERE team_id IS NULL AND dang_dung RETURNING id")).rows.map((r) => r.id);
  await q("INSERT INTO bo_luat_chung (team_id, phien_ban, noi_dung, dang_dung, nguoi_sua, sua_luc) VALUES (NULL, 99, '# BỘ LUẬT\nKhông bịa giá.', true, 'ca:rp1', now())");
  process.env.V3_LUAT_CHUNG_CSDL = "1";
  try {
    const kb = await kbPA();
    assert.equal(khoiBoLuat(kb).nguon, "CORE");
    assert.equal(buildSystem(kb)[0].text, CORE);
    assert.match(kb.text, /bo_luat_chung v99[^\n]*quy tắc ĐANG ÁP DỤNG thật vẫn là CORE/);
  } finally {
    delete process.env.V3_LUAT_CHUNG_CSDL;
    await q("UPDATE bo_luat_chung SET dang_dung=false WHERE nguoi_sua='ca:rp1'");
    await q("UPDATE bo_luat_chung SET dang_dung=true WHERE id = ANY($1::bigint[])", [cu]);
  }
});

/* ═══════════ ④7 — CỜ TẮT ═══════════ */

test("R7a · cờ TẮT ⇒ rapKb trả y nguyên đường cũ (so trọn đối tượng) — không lọc, không bỏ số hiệu, không nối nhãn", async () => {
  const tep = String(process.env.KB_OVERRIDES_FILE || "");
  assert.ok(tep && !path.resolve(tep).startsWith(process.cwd()), "KB_OVERRIDES_FILE phải trỏ ra NGOÀI repo (nạp --import ./test/_an-toan.mjs)");
  updatePageProducts("rp1-pa", [{ id: "SP01", name: "125 - Old Name", tiers: [{ label: "Buy 1 Get 1 FREE", price: 109 }],
    currency: "SAR", images: [{ url: A1, label: "Ảnh sản phẩm" }] }]);
  const cuCo = process.env.V3_RAP_PROMPT_BAT;
  delete process.env.V3_RAP_PROMPT_BAT;
  try {
    const kb = await kbPA();
    assert.deepEqual(kb, { ...getKBForPage("rp1-pa"), trongDiem: false, nguon_thieu: [], blocks: null, nguon: "kb_cu" });
    assert.equal(kb.products[0].name, "125 - Old Name");
    assert.equal(kb.products[0].tiers[0].label, "Buy 1 Get 1 FREE");
  } finally { process.env.V3_RAP_PROMPT_BAT = cuCo; }
});
