// PHIẾU GL4 ④7 — mã GL4 chạy trên CSDL CHƯA áp migration 034 (deploy mã trước migration, hoặc `down` lúc mã mới đang chạy):
// một lượt GỬI THÀNH CÔNG vẫn `xong` (ghi bộ đếm ngắt chạy NGOÀI giao dịch tin, nuốt lỗi — không lật lượt đã gửi thành `loi` +
// HANDOFF); vòng không sập; cảnh báo MỘT lần. Rồi migration up → down → up thành trên hộp cát CÓ dữ liệu.
//
// Đường thật như `gl4-ngat-page`: motLuot → chayMotVong → docTin → pkDocTin → fetch giả; gửi qua bocCuaGuiBen + cửa thật. Tệp
// RIÊNG (tiến trình riêng) vì cờ «đã cảnh báo» là của tiến trình.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { len, xuong, daAp } from "../db/migrate.js";
import * as cw from "../src/queue/chay-worker.js";
import { xepTin } from "../src/queue/kho.js";
import { baoDamHoiThoai } from "../src/chat/kho.js";
import { config } from "../src/config.js";
import { datKhoTokenDb, lamMoiTokenDb } from "../src/pancake.js";
import { congHttpGhi } from "../src/chat/handler-v3.js";

const ENV = {
  V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "0", V3_PANCAKE_HAN_GUI_MS: "300", V3_PANCAKE_HAN_DOC_MS: "150", PK_MARK_UNREAD: "0",
  V3_DIEN_TAP: undefined, V3_TRAN_PAGE_BAT: "5", V3_NAP_IM_BOTCAKE_MS: "0", V3_NAP_CHI_CHUA_DOC: "0",
};
const COT_034 = ["loi_doc_lien_tiep", "loi_gui_lien_tiep", "loi_doc_tin_cuoi", "loi_gui_tin_cuoi", "ngat_den", "ngat_vi", "ngat_ly_do"];
const envCu = {};
const cauHinhCu = {};
const goi = [];
const POST_LOI = new Set();
let sb; let team; let pageRow; let chan0 = 0;
const PAGE = "gl4-034";
const tl = (j) => ({ status: 200, json: async () => j });

before(async () => {
  sb = await dungSandbox("gl4_034");
  team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  globalThis.fetch = async (u, init) => {
    const url = new URL(String(u));
    if (url.host !== "pages.fm") throw new Error(`ca GL4: lượt gọi lạ ra ${url.host}`);
    const method = String(init?.method || "GET").toUpperCase();
    const m = /\/conversations\/conv-([^/]+)\/messages$/.exec(url.pathname);
    const psid = m ? decodeURIComponent(m[1]) : "";
    goi.push({ method, psid, path: url.pathname });
    if (method === "GET" && m) return tl({ messages: [{ id: `m-${psid}`, from: { id: psid, name: "Khách" }, message: "how much?" }] });
    if (method === "GET" && url.pathname.endsWith("/conversations")) return tl({ conversations: [] });
    if (method === "POST" && m) {
      return POST_LOI.has(psid) ? tl({ success: false, error_code: 105, message: "Bạn không có quyền" }) : tl({ success: true, id: `bot-${goi.length}` });
    }
    return tl({ success: true });
  };
  cauHinhCu.pancakeToken = config.pancakeToken; cauHinhCu.pancakeTokensExtra = config.pancakeTokensExtra;
  config.pancakeToken = ""; config.pancakeTokensExtra = [];
  datKhoTokenDb(async () => ["tokA", "tokB"]);
  assert.equal(await lamMoiTokenDb(), 2);
  for (const [k, v] of Object.entries(ENV)) { envCu[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  chan0 = congHttpGhi.daChan.length;
});
after(async () => {
  for (const [k, v] of Object.entries(envCu)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  datKhoTokenDb(null);
  config.pancakeToken = cauHinhCu.pancakeToken; config.pancakeTokensExtra = cauHinhCu.pancakeTokensExtra;
  await sb?.don();
});

const cotCo = async () => (await sb.pool.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='page' AND column_name = ANY($1::text[])", [COT_034])).rows.length;
const boNao = () => ({
  layKb: () => ({ products: [], text: "test" }), layModel: () => ({ maModel: "test" }),
  lanNhanh: () => ({ handled: true, reply: "Giá 109 SAR ạ (bot)", lane: "test" }), kiemTinRa: () => ({ ok: true }),
});
const luot = () => cw.motLuot(sb.pool, { depsNap: { doiGoXong: () => ({ ms: 0, reason: "ca" }) }, depsXuLy: boNao() });
let seq = 0;
async function xep(psid) {
  await baoDamHoiThoai(sb.pool, { teamId: team, pageRowId: pageRow, psid });
  return (await xepTin(sb.pool, { teamId: team, pageId: PAGE, psid, convId: `conv-${psid}`, custId: `cust-${psid}`, msgId: `mid-${psid}-${++seq}`, noiDung: "how much?" })).id;
}

test("GL4 M7a · CSDL CHƯA áp 034: lượt GỬI THÀNH CÔNG ⇒ tin xong, sổ AI + hội thoại giữ (giao dịch không hỏng), lan_gui da_gui; lượt gửi LỖI vẫn loi + việc; vòng không sập; cảnh báo MỘT lần", async () => {
  const daApCu = await daAp(sb.pool);
  assert.equal(daApCu.at(-1), "034_page_ngat_kenh", `bản mới nhất phải là 034, đo ${daApCu.at(-1)}`);
  await xuong(sb.pool, { im: true });
  assert.equal(await cotCo(), 0, "đã gỡ 034 — page không còn cột ngắt");
  pageRow = (await sb.pool.query("INSERT INTO page(team_id,page_id,ten,nguon_tin,bot_ai_bat) VALUES($1,$2,'GL4 034','poll',true) RETURNING id", [team, PAGE])).rows[0].id;
  const warnCu = console.warn; const canhBao = [];
  console.warn = (...a) => { canhBao.push(a.join(" ")); };
  let tOk; let tLoi1; let tLoi2; const ket = [];
  try {
    tOk = await xep("m7-ok");
    ket.push(await luot());
    POST_LOI.add("m7-l1"); POST_LOI.add("m7-l2");
    tLoi1 = await xep("m7-l1"); tLoi2 = await xep("m7-l2");
    ket.push(await luot());
    ket.push(await luot());
  } finally { console.warn = warnCu; }
  assert.ok(ket.every((k) => k.nap.mo === true && k.xu), "vòng không sập");
  const t = (await sb.pool.query("SELECT trang_thai, ly_do FROM tin_cho_xu_ly WHERE id=$1", [tOk])).rows[0];
  assert.equal(t.trang_thai, "xong", `lượt gửi thành công phải xong, đo ${JSON.stringify(t)}`);
  const lg = (await sb.pool.query("SELECT trang_thai FROM lan_gui WHERE tin_id=$1", [tOk])).rows.map((x) => x.trang_thai);
  assert.ok(lg.length >= 1 && lg.every((x) => x === "da_gui"), `lan_gui da_gui, đo ${JSON.stringify(lg)}`);
  const soAi = Number((await sb.pool.query("SELECT count(*) n FROM so_ai WHERE psid='m7-ok' AND loai='reply'")).rows[0].n);
  assert.ok(soAi >= 1, "sổ AI của lượt gửi phải còn (giao dịch tin không bị abort)");
  const ht = (await sb.pool.query("SELECT chu_so_huu, trang_thai, ly_do_cuoi FROM hoi_thoai WHERE psid='m7-ok'")).rows[0];
  assert.equal(ht.chu_so_huu, "AI", `hội thoại không bị lật sang SALE, đo ${JSON.stringify(ht)}`);
  assert.notEqual(ht.ly_do_cuoi, "loi_xu_ly_can_doi_chieu");
  for (const id of [tLoi1, tLoi2]) {
    assert.equal((await sb.pool.query("SELECT trang_thai FROM tin_cho_xu_ly WHERE id=$1", [id])).rows[0].trang_thai, "loi");
  }
  const viec = Number((await sb.pool.query(
    "SELECT count(*) n FROM viec_can_xu_ly v JOIN hoi_thoai h ON h.id=v.hoi_thoai_id WHERE h.psid IN ('m7-l1','m7-l2') AND v.dong_luc IS NULL")).rows[0].n);
  assert.equal(viec, 2, "tin gửi lỗi vẫn đẻ việc (không cần cột 034)");
  const ve034 = canhBao.filter((s) => /034/.test(s));
  console.log(`   [gl4] M7a cảnh báo: ${JSON.stringify(canhBao)}`);
  assert.equal(ve034.length, 1, `cảnh báo «chưa có 034» đúng MỘT lần qua ${ket.length} vòng, đo ${ve034.length}`);
  assert.equal(congHttpGhi.daChan.length - chan0, 0);
});

test("GL4 M7b · migration 034 up → down → up thành trên hộp cát CÓ dữ liệu (page đang ngắt)", async () => {
  if ((await cotCo()) === 0) await len(sb.pool, { im: true });
  assert.equal(await cotCo(), COT_034.length, "up: đủ 7 cột");
  await sb.pool.query(
    "UPDATE page SET ngat_den = now() + interval '30 minutes', ngat_vi = 'gui', ngat_ly_do = 'ca M7b', loi_gui_lien_tiep = 1, loi_gui_tin_cuoi = 1 WHERE page_id=$1",
    [PAGE]);
  await xuong(sb.pool, { im: true });
  assert.equal(await cotCo(), 0, "down: xoá đúng các cột");
  assert.equal(Number((await sb.pool.query("SELECT count(*) n FROM page WHERE page_id=$1", [PAGE])).rows[0].n), 1, "dữ liệu page còn nguyên");
  await len(sb.pool, { im: true });
  assert.equal(await cotCo(), COT_034.length, "up lại: đủ 7 cột");
  const p = (await sb.pool.query("SELECT ngat_vi, ngat_ly_do, loi_doc_lien_tiep FROM page WHERE page_id=$1", [PAGE])).rows[0];
  assert.deepEqual(p, { ngat_vi: "", ngat_ly_do: "", loi_doc_lien_tiep: 0 }, "cột mới mang mặc định");
  const chk = await sb.pool.query("UPDATE page SET ngat_vi='lung_tung' WHERE page_id=$1", [PAGE]).then(() => null, (e) => e);
  assert.ok(chk && /check/i.test(chk.message), "ngat_vi chỉ nhận '' · doc · gui");
});
