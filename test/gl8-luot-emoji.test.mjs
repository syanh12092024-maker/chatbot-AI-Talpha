// GL8 ④2 · ④3 · ②3 — LƯỢT ĐI WORKER THẬT (`queue/worker.js#chayMotVong` → `handler-v3#xuLyMotTin` → ghi sổ) với câu trả lời có emoji
// đúng chỗ cắt. Postgres HỘP CÁT riêng (`aicloser_v3_test_gl8w_p<pid>`, tự dựng tự dọn) · KHÔNG mạng (cửa gửi TIÊM ⇒ `lan_gui` ghi
// `da_gui` như prod; model tiêm). Khuôn hộp cát của `test/rp2-worker-a-phay.test.mjs`.
//
// Đo bằng TRẠNG THÁI THẬT của sổ (soát (a)): tin `xong` · dòng `so_ai` · `hoi_thoai.chu_so_huu` · `ly_do_cuoi`. KHÔNG đo bằng «0 việc
// bàn giao» — `banGiaoLoi` của worker không tạo dòng việc.
// Nhánh chạm: model `:971` · lớp từ khoá `:668` (+ chặn `:647`) — dựng câu mẫu qua `layKb` vì `lopTuKhoa` không tiêm được · Fast Lane
// `:744` (+ chặn `:717`) — `lanNhanh` tiêm · cửa ra giết câu model `:906` · lượt chốt đơn → `hang_cho_tao_don` (`hang-cho.js:479`).
// Nhánh KHÔNG chạm: bộ nạp (`xepTin` tay) · cửa Messenger thật (tiêm) · bộ não thật (`chayCloser` tiêm).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";

let sb, teamId, chayMotVong, xepTin;
before(async () => {
  ({ chayMotVong } = await import("../src/queue/worker.js"));
  ({ xepTin } = await import("../src/queue/kho.js"));
  sb = await dungSandbox("gl8w");
  teamId = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
  console.log(`   [gl8w] hộp cát ${sb.ten} · tệp đo ${new URL("../src/chat/handler-v3.js", import.meta.url).pathname} · cwd ${process.cwd()}`);
});
after(async () => { if (sb) await sb.don(); });

/** Chuỗi dài n+1 đơn vị, hai đơn vị cuối là 📦 ⇒ `slice(0, n)` để lại đúng nửa đầu `\ud83d` ở đơn vị n-1. */
function cauCat(n, dau = "Yes po Annabelle, free delivery po! 🚚 ", duoi = " details for booking. ") {
  if (n - 1 - dau.length - duoi.length < 0) { dau = ""; duoi = " "; }
  const can = n - 1 - dau.length - duoi.length;
  let giua = "";
  while (giua.length < can) giua += "Cash on delivery po, you pay when the parcel arrives. ";
  const s = dau + giua.slice(0, can) + duoi + "📦";
  if (s.length !== n + 1 || s.charCodeAt(n - 1) !== 0xd83d) throw new Error(`cauCat(${n}) dựng sai: dài ${s.length}`);
  return s;
}
const CAU_201 = cauCat(200);   // câu thật đo 09/10 cùng hình: 201 đơn vị, đơn vị 200 = \ud83d
const CAU_601 = cauCat(600);
const CHAN = () => ({ ok: false, action: "block", rule: "GL8_CHAN", reason: "ca GL8 giết câu" });

/** Mỗi ca một page + một hội thoại + một tin; chạy tới `vongToiDa` vòng worker (đặt lại `thu_lai_luc` giữa các vòng — tin `thu_lai`
 *  được rút lại NGAY, nên bản lỗi lộ ra đủ số lượt gọi model của nó) rồi đọc lại sổ thật. */
async function chay(ten, { noiDung = "how much po?", kb = {}, lanNhanh, chayCloser, kiemTinRa, vongToiDa = 2, tinTruoc = "" } = {}) {
  const page = `gl8w-${ten}`;
  const p = (await sb.pool.query("INSERT INTO page (bot_ai_bat, team_id, page_id, ten) VALUES (true,$1,$2,'GL8') RETURNING id", [teamId, page])).rows[0].id;
  const htId = (await sb.pool.query("INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu) VALUES ($1,$2,'KH','QUALIFY','AI') RETURNING id", [teamId, p])).rows[0].id;
  // BH9 [S12]: một tin khách TRƯỚC, đã `xong` — nguồn (d) `hang-cho.js` đọc mọi tin của psid trong `tin_cho_xu_ly`.
  if (tinTruoc) {
    await xepTin(sb.pool, { teamId, pageId: page, psid: "KH", convId: `c-${page}`, custId: "cu", msgId: `m0-${page}`, noiDung: tinTruoc, hoanMs: 0 });
    await sb.pool.query("UPDATE tin_cho_xu_ly SET trang_thai='xong' WHERE team_id=$1 AND page_id=$2 AND msg_id=$3", [teamId, page, `m0-${page}`]);
  }
  await xepTin(sb.pool, { teamId, pageId: page, psid: "KH", convId: `c-${page}`, custId: "cu", msgId: `m-${page}`, noiDung, hoanMs: 0 });
  const dem = { model: 0, post: 0, gui: [] };
  const deps = {
    pageIds: [page], docLichSu: false,
    layKb: () => ({ config: {}, products: [{ name: "SP" }], text: "KB", trongDiem: false, nguon_thieu: [], ...kb }),
    layModel: async () => ({ client: {}, maModel: "stub", nguon: "config" }),
    phanLoai: async () => ({ intent: "other", is_spam_conf: 0 }),
    lanNhanh: lanNhanh || (() => ({ handled: false, reply: null, lane: "", reason: "stub" })),
    chayCloser: async (a) => { dem.model += 1; return chayCloser ? chayCloser(a) : CAU_201; },
    kiemTinRa: kiemTinRa || (() => ({ ok: true })),
    cua: {
      guiTin: async (_p, _c, x) => { dem.post += 1; dem.gui.push(x?.text ?? x?.message ?? ""); return { ok: true, id: `x${dem.post}` }; },
      guiAnh: async () => ({ ok: true, id: "x" }), ghiNote: async () => ({ ok: true }), gatThe: async () => ({ ok: true, tags: [] }),
    },
  };
  // Vòng thứ hai trở đi: tin đã chốt thì không còn gì để rút (không gọi model lần nữa).
  const kqs = [];
  for (let i = 0; i < vongToiDa; i++) {
    const k = await chayMotVong(sb.pool, deps);
    if (!k) break;
    kqs.push(`${k.ketQua}:${String(k.lyDo || "").slice(0, 80)}`);
    await sb.pool.query("UPDATE tin_cho_xu_ly SET thu_lai_luc=now() WHERE team_id=$1 AND page_id=$2 AND trang_thai='cho'", [teamId, page]);
  }
  const tin = (await sb.pool.query("SELECT trang_thai, left(ly_do,160) ly_do FROM tin_cho_xu_ly WHERE team_id=$1 AND page_id=$2 AND msg_id <> $3", [teamId, page, `m0-${page}`])).rows;
  const ht = (await sb.pool.query("SELECT trang_thai, chu_so_huu, ly_do_cuoi FROM hoi_thoai WHERE id=$1", [htId])).rows[0];
  const so = (await sb.pool.query("SELECT loai, lane, du_lieu FROM so_ai WHERE team_id=$1 AND page_id=$2 ORDER BY id", [teamId, page])).rows;
  const hc = (await sb.pool.query("SELECT id, du_lieu_don, cua_kiem FROM hang_cho_tao_don WHERE team_id=$1 AND hoi_thoai_id=$2", [teamId, htId])).rows;
  const ra = { kqs, tin, ht, so, hc, ...dem };
  console.log(`   [gl8w] ${ten}: ${JSON.stringify({ ...ra, so: so.map((x) => `${x.loai}/${x.lane}`), hc: hc.length, gui: dem.gui.map((g) => g.length) })}`);
  return ra;
}

const khongNuaCap = (v) => {
  if (typeof v === "string") return v.isWellFormed();
  if (Array.isArray(v)) return v.every(khongNuaCap);
  if (v && typeof v === "object") return Object.values(v).every(khongNuaCap);
  return true;
};
function tinXong(r) {
  assert.equal(r.tin.length, 1);
  assert.equal(r.tin[0].trang_thai, "xong", `tin phải 'xong' — thật: ${r.tin[0].trang_thai} · ${r.tin[0].ly_do}`);
  assert.equal(r.kqs.length, 1, `vòng sau còn rút được tin ⇒ tin chưa chốt: ${JSON.stringify(r.kqs)}`);
  assert.notEqual(r.ht.ly_do_cuoi, "loi_xu_ly_can_doi_chieu", "worker đã giao khách cho sale vì lỗi ghi sổ (banGiaoLoi)");
}

test("GL8 W2 · model trả câu 201 đơn vị (emoji ở chỗ cắt 200) ⇒ tin xong · 1 dòng so_ai reply lành · hội thoại vẫn AI · khách nhận đủ câu", async () => {
  const r = await chay("model-971");
  tinXong(r);
  const reply = r.so.filter((x) => x.loai === "reply");
  assert.equal(reply.length, 1, `so_ai reply: ${r.so.map((x) => x.loai).join(",")}`);
  assert.equal(reply[0].lane, "AI");
  assert.ok(khongNuaCap(reply[0].du_lieu), "du_lieu còn nửa cặp");
  assert.ok(reply[0].du_lieu.text.length <= 200 && CAU_201.startsWith(reply[0].du_lieu.text), "text sổ phải là phần đầu câu, ≤ 200");
  assert.equal(r.ht.chu_so_huu, "AI", `hội thoại rời AI: ${r.ht.trang_thai}/${r.ht.chu_so_huu} · ${r.ht.ly_do_cuoi}`);
  assert.deepEqual([r.model, r.post], [1, 1]);
  assert.equal(r.gui[0], CAU_201, "nội dung gửi khách phải giữ nguyên TỪNG đơn vị (②5)");
});

test("GL8 W3a · lớp từ khoá (`:668`, câu mẫu KB 201 đơn vị) ⇒ tin xong · 0 model · so_ai reply tu_khoa_v3 lành · vẫn AI", async () => {
  const r = await chay("tu-khoa-668", { noiDung: "is it original po?", kb: { config: { fastLaneAuth: CAU_201 } } });
  tinXong(r);
  const reply = r.so.filter((x) => x.loai === "reply");
  assert.equal(reply.length, 1, `so_ai: ${r.so.map((x) => `${x.loai}/${x.lane}`).join(",")}`);
  assert.equal(reply[0].lane, "tu_khoa_v3");
  assert.ok(khongNuaCap(reply[0].du_lieu));
  assert.equal(r.ht.chu_so_huu, "AI");
  assert.deepEqual([r.model, r.post], [0, 1]);
  assert.equal(r.gui[0], CAU_201);
});

test("GL8 W3b · Fast Lane (`:744`, câu mẫu 201 đơn vị) ⇒ tin xong · 0 model · so_ai reply lành · vẫn AI", async () => {
  const r = await chay("fast-lane-744", { lanNhanh: () => ({ handled: true, reply: CAU_201, lane: "tpl_price", reason: "gl8" }) });
  tinXong(r);
  const reply = r.so.filter((x) => x.loai === "reply");
  assert.equal(reply.length, 1, `so_ai: ${r.so.map((x) => `${x.loai}/${x.lane}`).join(",")}`);
  assert.equal(reply[0].lane, "tpl_price");
  assert.ok(khongNuaCap(reply[0].du_lieu));
  assert.equal(r.ht.chu_so_huu, "AI");
  assert.deepEqual([r.model, r.post], [0, 1]);
  assert.equal(r.gui[0], CAU_201);
});

test("GL8 W3c · cửa ra giết câu model 601 đơn vị (`:906`, emoji ở chỗ cắt 600) ⇒ tin xong · model gọi ĐÚNG 1 lần · spent_no_send lành", async () => {
  const r = await chay("cua-ra-906", { chayCloser: () => CAU_601, kiemTinRa: CHAN });
  tinXong(r);
  assert.equal(r.model, 1, `model bị gọi ${r.model} lần (lượt thu_lai gọi lại model — tiền)`);
  assert.equal(r.post, 0, "cửa ra đã giết câu — không được gửi");
  const sns = r.so.filter((x) => x.loai === "spent_no_send");
  assert.equal(sns.length, 1, `so_ai: ${r.so.map((x) => x.loai).join(",")}`);
  assert.ok(khongNuaCap(sns[0].du_lieu));
  assert.ok(CAU_601.startsWith(sns[0].du_lieu.text_bi_chan) && sns[0].du_lieu.text_bi_chan.length >= 590, "phải giữ câu bị chặn (≤600)");
});

test("GL8 W3d · Fast Lane bị cửa ra chặn (`:717`, câu 601 đơn vị) ⇒ tin xong · spent_no_send lành · 0 model", async () => {
  const r = await chay("fast-lane-chan-717", {
    lanNhanh: () => ({ handled: true, reply: CAU_601, lane: "tpl_price", reason: "gl8" }), kiemTinRa: CHAN,
  });
  tinXong(r);
  const sns = r.so.filter((x) => x.loai === "spent_no_send");
  assert.equal(sns.length, 1, `so_ai: ${r.so.map((x) => x.loai).join(",")}`);
  assert.ok(khongNuaCap(sns[0].du_lieu));
  assert.deepEqual([r.model, r.post], [0, 0]);
});

test("GL8 W3e · lớp từ khoá bị cửa ra chặn (`:647`, câu KB 601 đơn vị) ⇒ tin xong · spent_no_send lành · 0 model", async () => {
  const r = await chay("tu-khoa-chan-647", { noiDung: "is it original po?", kb: { config: { fastLaneAuth: CAU_601 } }, kiemTinRa: CHAN });
  tinXong(r);
  const sns = r.so.filter((x) => x.loai === "spent_no_send");
  assert.equal(sns.length, 1, `so_ai: ${r.so.map((x) => `${x.loai}/${x.lane}`).join(",")}`);
  assert.equal(sns[0].lane, "tu_khoa_v3");
  assert.ok(khongNuaCap(sns[0].du_lieu));
  assert.deepEqual([r.model, r.post], [0, 0]);
});

test("GL8 W5 · lượt CHỐT ĐƠN, tin khách có dấu hiệu đơn ngoài với emoji ở chỗ cắt 60 (`hang-cho.js:479`) ⇒ dòng hang_cho_tao_don CÒN", async () => {
  // Chuẩn hoá khoảng trắng của nguồn (d) rồi cắt 60 ⇒ đơn vị 60 là nửa đầu 📦. >12 từ ⇒ lớp từ khoá nhường; không chữ số ⇒ không «có SĐT».
  // BH9 [S12] (người quyết 15/10): câu khách nói về đơn đã có ⇒ cổng sau bán (câu cố định + giao sale, 0 model). Câu dấu hiệu đơn
  // ngoài nay nằm ở một tin khách TRƯỚC (đã `xong` — nguồn (d) vẫn đọc nó); tin lượt này là câu chốt thường. Mục đích giữ nguyên.
  const tinTruoc = cauCat(60, "Your order has been confirmed, thank you for ", " po ") + " the rider will call you tomorrow morning po";
  assert.ok(tinTruoc.replace(/\s+/g, " ").trim().slice(0, 60).isWellFormed() === false, "tiền đề: cắt 60 phải chém đôi 📦");
  const r = await chay("chot-don-479", {
    tinTruoc,
    noiDung: "Sige po, order na ako — Buy 1 Get 1 po, cash on delivery 😊 salamat po sa inyo",
    chayCloser: ({ state }) => { state.orderCreatedThisTurn = true; return "Salamat po! Your order is noted, our team will confirm shortly. 🙏"; },
  });
  tinXong(r);
  assert.equal(r.hc.length, 1, "lượt chốt đơn mất dòng hang_cho_tao_don");
  assert.ok(khongNuaCap(r.hc[0].cua_kiem) && khongNuaCap(r.hc[0].du_lieu_don));
  const d = r.hc[0].cua_kiem.cong["3_chong_trung"].nguon.d_fb_commerce;
  assert.equal(d.ket, "duong", `nguồn (d) phải bắt dấu hiệu đơn ngoài: ${JSON.stringify(d)}`);
  assert.match(d.chi_tiet, /Your order has been confirmed/);
  assert.equal(r.so.filter((x) => x.loai === "order").length, 1);
  assert.equal(r.post, 1);
});

test("GL8 W6 · hồ sơ đi qua BỘ NÃO: kết quả tool tạo đơn có tên/thành phố/biến thể 39 đơn vị + emoji ở chỗ cắt 40 của `context.js:232-236` ⇒ tin xong · model 1 lần · hàng chờ 1 dòng · ho_so lành", async () => {
  // `absorbToolUses` (tệp bộ não, không sửa) cắt `slice(0, 40)` ⇒ ba trường mang nửa đầu lẻ ⇒ đi vào CẢ BA cửa ghi jsonb của lượt:
  // `so_ai(order).du_lieu.ho_so` · `hang_cho_tao_don.du_lieu_don` · `hoi_thoai.ho_so`. Trên base: mỗi vòng ném trước khi gửi ⇒ model gọi lại
  // tới trần thử, rồi tin `loi` + giao SALE, 0 dòng so_ai, 0 dòng hàng chờ.
  const don = { name: "M".repeat(39) + "😀z", phone: "0501234567", address: "Al Barsha villa 9", city: "D".repeat(39) + "🇦🇪",
    variant: "V".repeat(39) + "🎁", qty: 1 };
  for (const k of ["name", "city", "variant"]) assert.ok(!don[k].slice(0, 40).isWellFormed(), `tiền đề: ${k} cắt 40 phải chém đôi emoji`);
  const r = await chay("tool-don-232", {
    noiDung: "sige po order na",
    vongToiDa: 4,
    chayCloser: ({ state }) => {
      state.messages.push({ role: "assistant", content: [{ type: "tool_use", id: "tu1", name: "create_draft_order", input: {} }] });
      state.messages.push({ role: "user", content: [{ type: "tool_result", tool_use_id: "tu1", content: JSON.stringify({ ok: true, order: don }) }] });
      state.orderCreatedThisTurn = true;
      return "Salamat po! Your order is noted. 🙏";
    },
  });
  tinXong(r);
  assert.equal(r.model, 1, `model bị gọi ${r.model} lần`);
  assert.equal(r.post, 1);
  assert.equal(r.hc.length, 1, "lượt chốt đơn mất dòng hang_cho_tao_don");
  assert.ok(khongNuaCap(r.hc[0].du_lieu_don));
  assert.deepEqual([r.hc[0].du_lieu_don.ten, r.hc[0].du_lieu_don.thanh_pho], ["M".repeat(39), "D".repeat(39)]);
  const order = r.so.filter((x) => x.loai === "order");
  assert.equal(order.length, 1, `so_ai: ${r.so.map((x) => x.loai).join(",")}`);
  assert.ok(khongNuaCap(order[0].du_lieu));
  const hs = (await sb.pool.query("SELECT h.ho_so FROM hoi_thoai h JOIN page p ON p.id=h.page_id WHERE p.page_id='gl8w-tool-don-232'")).rows[0].ho_so;
  assert.ok(khongNuaCap(hs), "hoi_thoai.ho_so còn nửa cặp");
  assert.deepEqual([hs.name, hs.city, hs.tier], ["M".repeat(39), "D".repeat(39), "V".repeat(39)]);
});
