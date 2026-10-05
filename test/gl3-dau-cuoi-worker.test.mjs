// PHIẾU GL3 ④7 — ĐẦU-CUỐI với worker thật: gửi treo / gửi lỗi mạng ⇒ tin vào `lan_gui='khong_ro'` (đường đối
// chiếu), KHÔNG có lần gửi thứ hai — kể cả bằng token khác, kể cả ở vòng worker sau.
//
// Đường đi THẬT, không tiêm cửa: `chayMotVong` → `bocCuaGuiBen` → `channels/messenger#guiTin` → `pancake.js#
// pkSendReply` → `pkFetchPage` → cổng HTTP ghi của `handler-v3` (accessor trên globalThis.fetch) → fetch GIẢ.
//
// ⚠️ Máy dev có `PANCAKE_READONLY=1` trong `.env` ⇒ van chặn POST TRƯỚC khi tới fetch giả ⇒ ca xanh giả. Ca mở van
// trong PHẠM VI TIẾN TRÌNH CA (process.env, KHÔNG sửa `.env`) SAU KHI đã cài fetch giả, dùng 2 token GIẢ, và khẳng
// định fetch giả THẬT SỰ được gọi đúng 1 lần. Fetch giả chỉ nhận host pages.fm; host khác ⇒ ném (không lọt mạng).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { nhanWebhook } from "../src/queue/webhook.js";
import { chayMotVong } from "../src/queue/worker.js";
import { config } from "../src/config.js";
import { datKhoTokenDb, lamMoiTokenDb, pkSendReply } from "../src/pancake.js";
import { congHttpGhi } from "../src/chat/handler-v3.js";

const ENV = {
  V3_PANCAKE_GUI: "1",
  PANCAKE_READONLY: "0",          // chỉ trong tiến trình ca — .env vẫn =1
  V3_PANCAKE_HAN_GUI_MS: "300",
  V3_PANCAKE_HAN_DOC_MS: "150",
  PK_MARK_UNREAD: "0",            // ca đo đường gửi; /unread có ca riêng ở gl3-han-cho-pancake
  V3_DIEN_TAP: undefined,         // diễn tập dừng TRƯỚC fetch ⇒ phải tắt
};
const envCu = {};
const cauHinhCu = {};
const goi = [];
let kichBan = null;
let sb;
let team;

before(async () => {
  sb = await dungSandbox("gl3");
  console.log(`   [gl3] hộp cát ${sb.ten}`);
  team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  await sb.pool.query(
    "INSERT INTO page(team_id,page_id,ten,nguon_tin,bot_ai_bat) VALUES($1,'gl3-page','GL3','webhook',true)",
    [team],
  );
  // 1) fetch GIẢ trước — rồi mới mở van.
  globalThis.fetch = async (u, init) => {
    const url = new URL(String(u));
    if (url.host !== "pages.fm") throw new Error(`ca GL3: lượt gọi lạ ra ${url.host} — chặn`);
    goi.push({
      path: url.pathname,
      method: String(init?.method || "GET").toUpperCase(),
      tok: url.searchParams.get("access_token"),
    });
    return kichBan(url, init);
  };
  // 2) kho token tất định: hai token GIẢ.
  cauHinhCu.pancakeToken = config.pancakeToken;
  cauHinhCu.pancakeTokensExtra = config.pancakeTokensExtra;
  config.pancakeToken = "";
  config.pancakeTokensExtra = [];
  datKhoTokenDb(async () => ["tokA", "tokB"]);
  assert.equal(await lamMoiTokenDb(), 2);
  // 3) mở van trong phạm vi tiến trình ca.
  for (const [k, v] of Object.entries(ENV)) {
    envCu[k] = process.env[k];
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
});
after(async () => {
  for (const [k, v] of Object.entries(envCu)) if (v === undefined) delete process.env[k]; else process.env[k] = v;
  datKhoTokenDb(null);
  config.pancakeToken = cauHinhCu.pancakeToken;
  config.pancakeTokensExtra = cauHinhCu.pancakeTokensExtra;
  await sb?.don();
});

const body = (mid, psid, text = "how much?") => ({
  object: "page",
  entry: [{ id: "gl3-page", messaging: [{ sender: { id: psid }, message: { mid, text } }] }],
});
const deps = (psid) => ({
  layKb: () => ({ products: [], text: "test" }),
  layModel: () => ({ maModel: "test" }),
  lanNhanh: () => ({ handled: true, reply: "Giá 109 SAR ạ", lane: "test" }),
  kiemTinRa: () => ({ ok: true }),
  docLichSu: false,
  docHoiThoai: async () => [{ id: `conv-${psid}`, from_psid: psid, customers: [{ id: `cust-${psid}` }] }],
  // KHÔNG có `cua` ⇒ worker dùng cửa Messenger THẬT ⇒ pancake.js THẬT.
});
const postGui = (psid) => goi.filter((g) => g.method === "POST" && g.path.endsWith(`/conversations/conv-${psid}/messages`));
const treo = (_u, init) => new Promise((_, tuChoi) => {
  init?.signal?.addEventListener("abort", () => tuChoi(init.signal.reason), { once: true });
});
async function sauVong(tinId) {
  const lg = (await sb.pool.query("SELECT loai, trang_thai, provider_id FROM lan_gui WHERE tin_id=$1 ORDER BY buoc", [tinId])).rows;
  const tin = (await sb.pool.query("SELECT trang_thai FROM tin_cho_xu_ly WHERE id=$1", [tinId])).rows[0];
  return { lg, tin };
}

test("GL3 E0 · CHO-QUA thật: van mở, gửi thành công ⇒ lan_gui 'da_gui', đúng 1 POST (thước thấy được đường gửi)", { timeout: 20_000 }, async () => {
  kichBan = async () => ({ json: async () => ({ success: true, id: "m-ok" }) });
  await nhanWebhook(sb.pool, body("gl3-e0", "khach-e0"), { choPhep: () => true });
  const r = await chayMotVong(sb.pool, deps("khach-e0"));
  const { lg, tin } = await sauVong(r.tinId);
  console.log(`   [gl3] E0 ketQua=${r.ketQua} · POST=${postGui("khach-e0").length} · lan_gui=${JSON.stringify(lg)}`);
  assert.equal(r.ketQua, "xong");
  assert.equal(postGui("khach-e0").length, 1);
  assert.deepEqual(lg, [{ loai: "guiTin", trang_thai: "da_gui", provider_id: "m-ok" }]);
  assert.equal(tin.trang_thai, "xong");
});

test("GL3 E1 · ④7 gửi TREO ⇒ sau ≈ hạn gửi tin vào lan_gui 'khong_ro', fetch giả gọi ĐÚNG 1 lần, không lần thứ hai", { timeout: 20_000 }, async () => {
  kichBan = (u, init) => (init?.method === "POST" ? treo(u, init) : Promise.reject(new Error("GET không dự kiến")));
  await nhanWebhook(sb.pool, body("gl3-e1", "khach-e1"), { choPhep: () => true });
  const t0 = performance.now();
  const r = await chayMotVong(sb.pool, deps("khach-e1"));
  const ms = performance.now() - t0;
  const { lg, tin } = await sauVong(r.tinId);
  console.log(`   [gl3] E1 ${ms.toFixed(0)} ms · ketQua=${r.ketQua} · POST=${postGui("khach-e1").length} (token ${postGui("khach-e1").map((g) => g.tok)}) · lan_gui=${JSON.stringify(lg)} · tin=${tin.trang_thai}`);
  assert.equal(postGui("khach-e1").length, 1, "fetch giả phải được gọi ĐÚNG 1 lần (0 = van chặn trước ⇒ ca xanh giả)");
  assert.equal(postGui("khach-e1")[0].tok, "tokA");
  assert.ok(ms >= 290, `${ms} ms — phải chờ ≈ hạn gửi 300 ms (đường quá hạn, không phải lỗi tức thì)`);
  assert.deepEqual(lg.map((x) => [x.loai, x.trang_thai]), [["guiTin", "khong_ro"]]);
  assert.equal(r.ketQua, "loi");
  assert.equal(tin.trang_thai, "loi", "không quay lại hàng chờ để gửi lại");
  const ht = (await sb.pool.query("SELECT chu_so_huu FROM hoi_thoai WHERE psid='khach-e1'")).rows[0];
  assert.equal(ht.chu_so_huu, "SALE", "bàn giao người đối chiếu");

  // Vòng worker sau + tin mới của cùng khách: KHÔNG lượt gửi nào nữa.
  kichBan = async () => ({ json: async () => ({ success: true, id: "khong-duoc-toi" }) });
  await chayMotVong(sb.pool, deps("khach-e1"));
  await nhanWebhook(sb.pool, body("gl3-e1b", "khach-e1", "còn không?"), { choPhep: () => true });
  await chayMotVong(sb.pool, deps("khach-e1"));
  assert.equal(postGui("khach-e1").length, 1, "không có lần gửi thứ hai ở vòng sau");
});

test("GL3 E2 · ④7 gửi NÉM lỗi mạng (ECONNRESET) ⇒ 'khong_ro', đúng 1 POST — token 2 không được thử", { timeout: 20_000 }, async () => {
  kichBan = async () => {
    const e = new TypeError("fetch failed");
    e.cause = Object.assign(new Error("socket hang up"), { code: "ECONNRESET" });
    throw e;
  };
  await nhanWebhook(sb.pool, body("gl3-e2", "khach-e2"), { choPhep: () => true });
  const r = await chayMotVong(sb.pool, deps("khach-e2"));
  const { lg } = await sauVong(r.tinId);
  console.log(`   [gl3] E2 POST=${postGui("khach-e2").length} · lan_gui=${JSON.stringify(lg)}`);
  assert.equal(postGui("khach-e2").length, 1);
  assert.deepEqual(lg.map((x) => [x.loai, x.trang_thai]), [["guiTin", "khong_ro"]]);
  assert.equal(r.ketQua, "loi");
});

test("GL3 E3 · van ĐÓNG: cổng HTTP ghi THẬT của handler-v3 chặn ⇒ fetch giả 0 lượt, kết quả KHÔNG mang khongRo, phaLoi 'ket_noi'", { timeout: 20_000 }, async () => {
  kichBan = async () => assert.fail("van đóng mà lượt ghi tới được fetch");
  const truoc = goi.length;
  const chanTruoc = congHttpGhi.daChan.length;
  process.env.PANCAKE_READONLY = "1";
  try {
    const kq = await pkSendReply("gl3-page", "conv-e3", "cust-e3", "x");
    console.log(`   [gl3] E3 ${JSON.stringify(kq).slice(0, 160)} · fetch giả +${goi.length - truoc} · cổng chặn +${congHttpGhi.daChan.length - chanTruoc}`);
    assert.equal(kq.ok, false);
    assert.equal(kq.khongRo, undefined, "chắc chắn chưa gửi ⇒ không phải «không rõ»");
    assert.equal(kq.phaLoi, "ket_noi");
    assert.equal(goi.length - truoc, 0);
    assert.equal(congHttpGhi.daChan.length - chanTruoc, 1, "đúng cổng thật đã chặn, không xoay token");
  } finally {
    process.env.PANCAKE_READONLY = "0";
  }
});
