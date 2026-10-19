// PHIẾU GL10 — VÒNG 2 (sau đối kháng `docs/thi-cong/nhat-ky/refute-gl10.verdict.yaml`): mỗi finding F1–F6 một ca, chuyển thể từ ca phá của
// đối kháng (scratchpad `refute-gl10/refute-gl10.test.mjs`) sang ĐƯỜNG THẬT của repo: cổng bật/tắt qua HTTP (Express + vé đăng nhập +
// `dungPhanB` → `cong-tac.js` → `noiVanHanhV3` → `operations.js#setPage`), worker `motLuot` THẬT (không tiêm `dsChoPhep`), màn Page & Bot
// qua `/api/page-bot/danh-sach`. Postgres HỘP CÁT (`aicloser_v3_test_gl10v_p<pid>`, tự dựng tự dọn).
// ⛔ `page_gan_them.json` + log ai_sale là tệp TẠM (mkdtemp) — CẤM đụng `/opt/pancake-tool` hay `/var/log`. Không mạng: fetch chỉ cho
// 127.0.0.1 của chính máy chủ ca. Ngữ nghĩa ai_sale đo bằng bản chép LOGIC ba hàm (như `gl10-cong-bat-tat.test.mjs`).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import express from "express";

const fetchCu = globalThis.fetch;
process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString("base64");
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString("base64");

const { dungSandbox } = await import("../db/sandbox.js");
const { nhipMayBot, xepTin } = await import("../src/queue/kho.js");
const { taoTruyVanThat } = await import("../v3/src/noi-day/cong-du-lieu-that.js");
const { taoCongDanhTinh } = await import("../v3/src/noi-day/cong-danh-tinh.js");
const { noiVanHanhV3 } = await import("../v3/src/noi-day/van-hanh-v3.js");
const { dungPhanB } = await import("../v3/src/vai-b.js");
const { bam } = await import("../v3/src/auth/index.js");
const { xoaDemBat } = await import("../v3/src/ui/page-bot/cong-tac.js");
const { xoaNhoNhip } = await import("../v3/src/ui/chung/nhip-may-bot.js");
const { setPage } = await import("../src/admin-v3/operations.js");
const cw = await import("../src/queue/chay-worker.js");
const an = await import("../src/queue/ai-sale-nhuong.js");

const MAT_KHAU = "Gl10-vong2-mat-khau-chi-de-thu-123";
const GOC = fs.mkdtempSync(path.join(os.tmpdir(), "gl10-vong2-"));
const TEP = path.join(GOC, "state", "chung", "page_gan_them.json");
const LOG = path.join(GOC, "log", "aisale-chat");
const MAU = () => ({ _ghi_chu: "ghi chú", uae: { "985000000101": "AED" }, saudi: { "985000000201": "SAR" } });
const ghiTep = (d) => { fs.mkdirSync(path.dirname(TEP), { recursive: true }); fs.writeFileSync(TEP, JSON.stringify(d, null, 1)); fs.chmodSync(TEP, 0o644); };
const docTep = () => JSON.parse(fs.readFileSync(TEP, "utf8"));
const ENV = {
  V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "0", V3_RAP_PROMPT_BAT: "1", ANTHROPIC_API_KEY: "fake-only", V3_TRAN_PAGE_BAT: "20",
  V3_AI_SALE_TEP_GAN: TEP,
};
const PID = {
  D: "985000000001", D2: "985000000002", K: "985000000003", K2: "985000000004", N: "985000000005", R: "985000000006",
  T: "985000000007", L: "985000000008", Z: "999000000009",
};
const ENV_TIEN_TRINH = { V3_AI_SALE_TEP_GAN: TEP, V3_TRAN_PAGE_BAT: "20", V3_NAP_DEV: "1", V3_NAP_IM_BOTCAKE_MS: "0",
  V3_AI_SALE_LOG: undefined, V3_DIEN_TAP: undefined, V3_BOT_KHOA: undefined, V3_BOT_GHI: undefined };
const giuEnv = {};
let sb; let pool; let server; let base; let X; let ND; let cookie; const ID = {};
let goiLa = 0;

before(async () => {
  for (const [k, v] of Object.entries(ENV_TIEN_TRINH)) { giuEnv[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  sb = await dungSandbox("gl10v");
  pool = sb.pool;
  console.log(`   [gl10v] hộp cát ${sb.ten} · tệp đo ${fileURLToPath(new URL("../src/queue/ai-sale-nhuong.js", import.meta.url))} · cwd ${process.cwd()}`);
  const mot = async (sql, a = []) => (await pool.query(sql, a)).rows[0];
  X = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
  ND = String((await mot("INSERT INTO nguoi_dung (email, ten, mat_khau_hash) VALUES ($1,$1,$2) RETURNING id", ["qt@gl10v.vn", await bam(MAT_KHAU)])).id);
  await pool.query("INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) SELECT $1,$2,id FROM vai WHERE ma='quan-tri'", [X, ND]);
  for (const [k, pid] of Object.entries(PID)) {
    ID[k] = String((await mot("INSERT INTO page (team_id, page_id, ten, nguon_tin) VALUES ($1,$2,$3,'poll') RETURNING id", [X, pid, `GL10V ${k}`])).id);
    const sp = (await mot("INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,'SP') RETURNING id", [X, ID[k], `gl10v-${k}`])).id;
    await pool.query("INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,1,19900,'AED')", [X, sp]);
  }
  const app = express();
  dungPhanB(app, {
    express,
    taoTruyVan: (bc) => taoTruyVanThat(pool, bc),
    taoTruyVanHeThong: () => taoCongDanhTinh(pool),
    docSanSang: noiVanHanhV3(pool, ENV, { docLegacy: async () => ({ pages: [] }) }),
    docNhipMayBot: (bc) => nhipMayBot(pool, { teamId: bc?.teamId ?? null }),
  });
  server = await new Promise((ok) => { const s = app.listen(0, "127.0.0.1", () => ok(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
  globalThis.fetch = async (u, o) => {
    if (!String(u).startsWith(base)) { goiLa += 1; throw new Error(`ca GL10 vòng 2: lượt gọi mạng lạ ${u}`); }
    return fetchCu(u, o);
  };
  const r = await fetch(`${base}/api/dang-nhap`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "qt@gl10v.vn", matKhau: MAT_KHAU }),
  });
  assert.equal(r.status, 200, await r.text());
  cookie = r.headers.get("set-cookie").split(";")[0];
  ghiTep(MAU());
});
after(async () => {
  globalThis.fetch = fetchCu;
  for (const [k, v] of Object.entries(giuEnv)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  fs.rmSync(GOC, { recursive: true, force: true });
  if (server) await new Promise((ok) => server.close(ok));
  if (sb) await sb.don();
  assert.equal(goiLa, 0, "ca không được gọi mạng ra ngoài");
});

const bc = () => ({ teamId: X, nguoiDungId: ND });
const gat = async (k, bat) => {
  xoaDemBat();   // trần RAM 5 lượt bật/10′ của màn — việc khác
  const r = await fetch(`${base}/api/page-bot/${ID[k]}/bot`, {
    method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json", "X-V3-Action": "1" }, body: JSON.stringify({ bat }),
  });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
};
const dong = async (k) => (await pool.query(
  "SELECT bot_ai_bat, bot_bat_luc, ai_sale_cho_den, ai_sale_trang_thai tt, ai_sale_ly_do ly_do FROM page WHERE id=$1", [ID[k]])).rows[0];
const nhatKy = async (hd, k) => Number((await pool.query("SELECT count(*) n FROM nhat_ky WHERE hanh_dong=$1 AND doi_tuong_id=$2", [hd, PID[k]])).rows[0].n);
const danhSach = async () => { xoaNhoNhip(); return (await fetch(`${base}/api/page-bot/danh-sach`, { headers: { Cookie: cookie } })).json(); };
const aiMan = async (k) => (await danhSach()).page.find((x) => x.pageId === PID[k])?.aiSale;
const goiHt = new Map();
const DEPS_NAP = {
  doiGoXong: () => ({ ms: 0, reason: "ca GL10 vòng 2" }), traThe: async () => null, docTin: async () => [],
  docHoiThoai: async (_p, _c, { pageId }) => { goiHt.set(String(pageId), (goiHt.get(String(pageId)) || 0) + 1); return []; },
};
const luot = (them = {}) => cw.motLuot(pool, { depsNap: DEPS_NAP, depsXuLy: { chayCloser: async () => "", docLichSu: false }, ...them });
const goi = (k) => goiHt.get(PID[k]) || 0;
const PY_AI_SALE = String.raw`
import json, os, sys
SCRIPT_DIR = sys.argv[1]

# chép logic _page_gan_them (:13530) · _page_gan_noi_khac (:13545) · _hop_page_shop (:13557) từ pancake-tool ai_sale.py ngày 19/10
def _page_gan_them(mkey):
    try:
        d = json.load(open(os.path.join(SCRIPT_DIR, "state", "chung", "page_gan_them.json"), encoding="utf-8"))
        return ({str(p) for p in (d.get(mkey) or {})}
                | {str(p) for p, v in (d.get("tram_landing") or {}).items()
                   if isinstance(v, dict) and mkey in [v.get("nha")] + list(v.get("nuoc") or [])})
    except Exception:
        return set()


def _page_gan_noi_khac(mkey):
    try:
        d = json.load(open(os.path.join(SCRIPT_DIR, "state", "chung", "page_gan_them.json"), encoding="utf-8"))
        return {str(p) for k, o in d.items() if k != mkey and isinstance(o, dict) for p in o}
    except Exception:
        return set()


def _hop_page_shop(mkey, ids):
    return (set(ids) - _page_gan_noi_khac(mkey)) | _page_gan_them(mkey)

print(json.dumps({mkey: sorted(_hop_page_shop(mkey, sys.argv[2].split(","))) for mkey in ("uae", "saudi")}))
`;
/** ai_sale (bản chép logic) còn trông page `pid` ở uae hoặc saudi không. */
const aiSaleTrong = (pid) => {
  const o = JSON.parse(execFileSync("python3", ["-I", "-c", PY_AI_SALE, GOC, `${pid},985000000999`], { encoding: "utf8" }));
  return o.uae.includes(pid) || o.saudi.includes(pid);
};
const voiEnv = async (them, fn) => {
  const cu = {};
  for (const [k, v] of Object.entries(them)) { cu[k] = ENV[k]; if (v === undefined) delete ENV[k]; else ENV[k] = v; }
  try { return await fn(); } finally { for (const [k, v] of Object.entries(cu)) { if (v === undefined) delete ENV[k]; else ENV[k] = v; } }
};

/* ═══════════ F1 (CHẶN) · DIỄN TẬP không ghi khoá — giữ bậc ② mo-van «prod chỉ đọc, khách chưa thấy gì» ═══════════ */

test("GL10 F1 · DIỄN TẬP (V3_DIEN_TAP=1, van gửi đóng) bật page ⇒ KHÔNG ghi khoá _v3, ai_sale VẪN trông page, trạng thái dien_tap; worker chạy thử page khi CHÍNH nó diễn tập, bỏ diễn tập ⇒ không phục vụ; màn nói rõ; page còn giữ khoá ⇒ 409", async () => {
  ghiTep(MAU());
  assert.equal(aiSaleTrong(PID.D), true, "(trước bật ai_sale trông page)");
  process.env.V3_DIEN_TAP = "1";
  try {
    await voiEnv({ V3_DIEN_TAP: "1", V3_PANCAKE_GUI: "0" }, async () => {
      const r = await gat("D", true);
      assert.equal(r.status, 200, JSON.stringify(r));
      assert.equal(r.botAiBat, true);
      assert.equal(r.aiSale?.trangThai, "dien_tap", `đáp phải mang trạng thái dien_tap, đo ${JSON.stringify(r.aiSale)}`);
      assert.equal(docTep()._v3?.[PID.D], undefined, "diễn tập GHI khoá _v3 ⇒ ai_sale nhường mà v3 không gửi ⇒ khách không bot nào trả lời");
      assert.deepEqual(docTep(), MAU(), "tệp ai_sale không đổi byte ngữ nghĩa nào");
      assert.equal(aiSaleTrong(PID.D), true, "ai_sale phải VẪN trông page trong lúc v3 chỉ chạy thử");
      const d = await dong("D");
      assert.equal(d.tt, "dien_tap");
      assert.ok(d.bot_bat_luc, "mốc bật vẫn đặt (chạy thử chỉ trên tin mới)");
      assert.match(d.ly_do, /Diễn tập/);
      assert.equal(await nhatKy("ai_sale_ghi_khoa", "D"), 0, "không có lượt ghi khoá nào");
      // màn: nhãn nói rõ diễn tập + ai_sale vẫn trả lời; danh sách mang cờ diễn tập cho hộp xác nhận
      const ds = await danhSach();
      assert.equal(ds.dienTap, true, "danh sách phải mang cờ diễn tập (hộp xác nhận không hứa «bot sẽ trả lời khách»)");
      const a = ds.page.find((x) => x.pageId === PID.D).aiSale;
      assert.equal(a?.trangThai, "dien_tap", JSON.stringify(a));
      assert.match(a.nhan, /Diễn tập/); assert.match(a.nhan, /ai_sale vẫn trả lời/);
      assert.deepEqual([a.do, a.xanh], [false, false]);
      // page TẮT đang còn giữ khoá (khoá mồ côi) ⇒ diễn tập từ chối: diễn tập không được giữ khoá
      const coKhoa = { ...MAU(), _v3: { [PID.D2]: "v3 pilot — mồ côi" } };
      ghiTep(coKhoa);
      const r2 = await gat("D2", true);
      assert.equal(r2.status, 409, JSON.stringify(r2));
      assert.match(r2.thongDiep, /DIỄN TẬP/); assert.match(r2.thongDiep, /giữ khoá ai_sale/);
      assert.deepEqual(docTep(), coKhoa, "từ chối thì không ghi gì");
      assert.equal((await dong("D2")).bot_ai_bat, false);
    });
    // worker CHÍNH nó diễn tập ⇒ page dien_tap được chạy thử (nạp) — bậc ② còn làm được
    const g0 = goi("D");
    const k = await luot({ boQuaXu: true });
    assert.ok(goi("D") - g0 >= 1, `worker diễn tập phải chạy thử page dien_tap, đo ${JSON.stringify(k.aiSale)}`);
  } finally { delete process.env.V3_DIEN_TAP; }
  // bỏ diễn tập (worker không còn V3_DIEN_TAP) ⇒ page dien_tap KHÔNG được phục vụ (chưa có khoá ⇒ có thể hai bot) — fail-closed
  const g1 = goi("D");
  await luot({ boQuaXu: true });
  assert.equal(goi("D") - g1, 0, "bỏ diễn tập mà worker vẫn nạp page chưa ghi khoá ⇒ hai bot cùng trả lời");
  const a2 = await aiMan("D");
  assert.equal(a2.do, true, `màn phải đỏ khi bỏ diễn tập, đo ${JSON.stringify(a2)}`);
  assert.match(a2.nhan, /Đã bỏ diễn tập/); assert.match(a2.nhan, /Tắt rồi bật lại/);
  // tắt page diễn tập (biến tệp VẮNG): không có khoá nào ⇒ tắt sạch, không canhBao «khoá CHƯA xoá»
  const t = await voiEnv({ V3_AI_SALE_TEP_GAN: undefined }, () => gat("D", false));
  assert.equal(t.status, 200, JSON.stringify(t));
  assert.equal(t.canhBao, undefined, `không được báo «khoá CHƯA xoá» cho page diễn tập (không giữ khoá): ${t.canhBao}`);
  assert.equal((await dong("D")).tt, "");
  // bật lại khi KHÔNG diễn tập ⇒ đường thường: ghi khoá, chờ ai_sale nhường
  const b = await gat("D", true);
  assert.equal(b.aiSale?.trangThai, "cho", JSON.stringify(b));
  assert.equal(typeof docTep()._v3?.[PID.D], "string");
  assert.equal((await gat("D", false)).status, 200);
  assert.equal((await gat("D2", false)).status, 200);   // dọn khoá mồ côi D2
  assert.equal(docTep()._v3, undefined);
});

/* ═══════════ F2 (NÊN) · tiến trình CHẾT giữa ghiKhoa và COMMIT ⇒ khoá mồ côi — worker canh, đánh xoa_hong, KHÔNG tự xoá tệp ═══════════ */

test("GL10 F2 · SIGKILL sau ghiKhoa trước COMMIT ⇒ khoá _v3 mồ côi (page tắt, '') ⇒ vòng nạp đánh xoa_hong «mồ côi» + nhật ký 1 lần, KHÔNG tự xoá khoá; màn đỏ có nút; «Thử xoá lại» gỡ; page đang bật giữ khoá KHÔNG bị đánh", async () => {
  ghiTep(MAU());
  assert.equal((await gat("N", true)).status, 200, "(đối chứng: page N bật thường, giữ khoá hợp lệ)");
  const con = String.raw`
    const { setPage } = await import(process.env.GL10_OPS);
    const { taoPool } = await import(process.env.GL10_KET_NOI);
    const pool = taoPool(process.env.GL10_URL);
    const boc = { query: (...a) => pool.query(...a), connect: async () => { const c = await pool.connect(); const q = c.query.bind(c);
      c.query = (sql, a) => { if (/^\s*UPDATE page SET bot_ai_bat/.test(String(sql?.text ?? sql))) process.kill(process.pid, "SIGKILL"); return q(sql, a); };
      return c; } };
    globalThis.fetch = async () => { throw new Error("ca GL10 F2: mạng"); };
    await setPage(boc, { teamId: process.env.GL10_TEAM, nguoiDungId: process.env.GL10_ND }, process.env.GL10_ID, { enabled: true }, JSON.parse(process.env.GL10_ENV));
    console.log("KHÔNG CHẾT");`;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", con], {
    encoding: "utf8", timeout: 60_000,
    env: { ...process.env, GL10_OPS: new URL("../src/admin-v3/operations.js", import.meta.url).href,
      GL10_KET_NOI: new URL("../db/ket-noi.js", import.meta.url).href, GL10_URL: sb.url, GL10_TEAM: X, GL10_ND: ND, GL10_ID: ID.K,
      GL10_ENV: JSON.stringify(ENV) },
  });
  assert.equal(r.signal, "SIGKILL", `tiến trình con phải chết bằng SIGKILL: ${r.status} ${String(r.stderr).slice(0, 300)}`);
  const k0 = await dong("K");
  assert.deepEqual([k0.bot_ai_bat, k0.tt], [false, ""], "(CSDL rollback)");
  assert.equal(typeof docTep()._v3?.[PID.K], "string", "(khoá mồ côi còn trong tệp)");
  assert.equal(aiSaleTrong(PID.K), false, "(ai_sale nhường page đã tắt ⇒ không bot nào)");
  await luot({ boQuaXu: true });
  const k1 = await dong("K");
  assert.equal(k1.tt, "xoa_hong", `vòng nạp phải canh khoá mồ côi, đo ${k1.tt} · ${k1.ly_do}`);
  assert.match(k1.ly_do, /mồ côi/i);
  assert.equal(typeof docTep()._v3?.[PID.K], "string", "worker KHÔNG được tự xoá khoá trong tệp của người khác");
  assert.equal(await nhatKy("ai_sale_khoa_mo_coi", "K"), 1);
  await luot({ boQuaXu: true });
  assert.equal(await nhatKy("ai_sale_khoa_mo_coi", "K"), 1, "đánh MỘT lần (UPDATE có điều kiện), không ghi đôi");
  assert.equal((await dong("N")).tt, "cho", "page ĐANG bật giữ khoá hợp lệ không được đánh mồ côi");
  const a = await aiMan("K");
  assert.deepEqual([a?.trangThai, a?.do], ["xoa_hong", true], `màn đỏ «khoá CHƯA xoá» + nút «Thử xoá lại», đo ${JSON.stringify(a)}`);
  const t = await gat("K", false);   // «Thử xoá lại» = gạt tắt lần nữa
  assert.equal(t.status, 200); assert.equal(t.canhBao, undefined);
  assert.equal(docTep()._v3?.[PID.K], undefined);
  assert.equal((await dong("K")).tt, "");
  await luot({ boQuaXu: true });
  assert.equal((await dong("K")).tt, "", "không khoá ⇒ không đánh lại");
  assert.equal((await gat("N", false)).status, 200);
});

test("GL10 F2b · vòng nạp CHEN vào lúc lượt bật đang chết dở (thấy khoá vừa ghi, page chưa bật) ⇒ có thể đánh xoa_hong; BÙ gỡ khoá xong phải đưa về '' (không để nhãn «khoá CHƯA xoá» cho khoá đã gỡ)", async () => {
  ghiTep(MAU());
  const doiKhoaCho = async (ms = 5000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const n = Number((await pool.query(
        "SELECT count(*) n FROM pg_locks WHERE locktype='advisory' AND NOT granted AND database=(SELECT oid FROM pg_database WHERE datname=current_database())")).rows[0].n);
      if (n > 0) return true;
      await new Promise((ok) => setTimeout(ok, 20));
    }
    return false;
  };
  let pLuot = null; let thayCho = false;
  const chen = {
    query: (sql, a) => pool.query(sql, a),
    connect: async () => {
      const c = await pool.connect();
      return { release: () => c.release(), query: async (sql, a) => {
        if (!pLuot && /^\s*UPDATE page SET bot_ai_bat/.test(String(sql?.text ?? sql))) {
          pLuot = luot({ boQuaXu: true });   // vòng nạp của worker chạy đúng lúc này (khoá vừa ghi, dòng page còn tắt)
          thayCho = await doiKhoaCho();      // nó đang xếp hàng chờ khoá tư vấn tệp mà lượt bật giữ
          throw Object.assign(new Error("lỗi CSDL tiêm (ca GL10 F2b)"), { code: "XX000" });
        }
        return c.query(sql, a);
      } };
    },
  };
  await assert.rejects(() => setPage(chen, bc(), ID.K2, { enabled: true }, ENV), /lỗi CSDL tiêm/);
  await pLuot;
  assert.ok(thayCho, "vòng nạp phải canh khoá mồ côi DƯỚI khoá tư vấn tệp (xếp hàng sau lượt bật)");
  assert.equal(docTep()._v3?.[PID.K2], undefined, "BÙ phải gỡ khoá vừa ghi");
  const k = await dong("K2");
  assert.deepEqual([k.bot_ai_bat, k.tt], [false, ""], `khoá đã gỡ mà nhãn còn «xoa_hong», đo ${k.tt} · ${k.ly_do}`);
});

/* ═══════════ F3 (NÊN) · ghi chen NGƯỢC chiều lúc TẮT làm khoá sống lại ═══════════ */

test("GL10 F3 · tắt R rồi một lượt _ghi_gan CŨ (đọc trước khi v3 gỡ, os.replace sau) làm _v3[R] SỐNG LẠI ⇒ vòng nạp đánh xoa_hong, KHÔNG tự xoá; màn đỏ có nút", async () => {
  ghiTep(MAU());
  assert.equal((await gat("R", true)).status, 200);
  const cu = fs.readFileSync(TEP, "utf8");                       // _doc_gan() của tu_gan_page_ngoai (bản có _v3[R])
  const t = await gat("R", false);
  assert.equal(t.status, 200); assert.equal(docTep()._v3?.[PID.R], undefined, "(v3 đã gỡ khoá)");
  const d = JSON.parse(cu); d.uae["985000000777"] = "AED — tự gắn";  // d.setdefault(mkey, {}).update(o)
  const tam = `${TEP}.4242.tmp`; fs.writeFileSync(tam, JSON.stringify(d, null, 1)); fs.renameSync(tam, TEP);   // os.replace
  assert.equal(typeof docTep()._v3?.[PID.R], "string", "(khoá sống lại)");
  assert.equal(aiSaleTrong(PID.R), false, "(ai_sale nhường page đã tắt)");
  await luot({ boQuaXu: true });
  const r = await dong("R");
  assert.equal(r.tt, "xoa_hong", `khoá sống lại không ai phát hiện, đo ${r.tt}`);
  assert.equal(typeof docTep()._v3?.[PID.R], "string", "không tự xoá");
  const a = await aiMan("R");
  assert.deepEqual([a?.trangThai, a?.do], ["xoa_hong", true], JSON.stringify(a));
  assert.equal((await gat("R", false)).status, 200);
  assert.equal(docTep()._v3?.[PID.R], undefined);
  assert.equal(docTep().uae["985000000777"], "AED — tự gắn", "gỡ khoá giữ lượt ghi của pancake-tool");
});

/* ═══════════ F4 (NÊN) · v3 không trả lời được page đang giữ khoá ⇒ màn KHÔNG báo xanh ═══════════ */

test("GL10 F4 · page da_nhuong (khoá còn): vượt trần · van gửi đóng · diễn tập · thiếu biến tệp (máy chủ lẫn máy chạy bot) · máy chạy bot đứng ⇒ màn ĐỎ nêu lý do + lối xử lý, không «bot v3 đang trả lời»; hàng đợi im ⇒ không xanh; đủ điều kiện ⇒ xanh", async () => {
  ghiTep(MAU());
  assert.equal((await gat("T", true)).status, 200);
  await pool.query("UPDATE page SET ai_sale_cho_den = now() - interval '1 second' WHERE id=$1", [ID.T]);
  await luot({ boQuaXu: true });
  assert.equal((await dong("T")).tt, "da_nhuong");
  const hangDoi = async (kieu) => {
    await pool.query("DELETE FROM tin_cho_xu_ly WHERE team_id=$1", [X]);
    if (kieu === "im") return;
    const id = (await xepTin(pool, { teamId: X, pageId: PID.T, psid: `f4-${kieu}`, convId: `f4-c-${kieu}`, msgId: `f4-m-${kieu}-${Date.now()}`, noiDung: "hi" })).id;
    if (kieu === "song") await pool.query("UPDATE tin_cho_xu_ly SET trang_thai='xong', sua_luc=now() WHERE id=$1", [id]);
    if (kieu === "dung") await pool.query("UPDATE tin_cho_xu_ly SET thoi_diem = now() - interval '10 minutes' WHERE id=$1", [id]);
  };
  const doDo = (a, mau, nhan) => {
    assert.equal(a?.do, true, `${nhan}: màn phải ĐỎ, đo ${JSON.stringify(a)}`);
    assert.equal(a.xanh, false, nhan);
    assert.doesNotMatch(a.nhan, /bot v3 đang trả lời/, nhan);
    assert.match(a.nhan, mau, nhan);
    assert.match(a.nhan, /KHÔNG bot nào trả lời/, `${nhan}: phải nói hậu quả`);
    assert.match(a.nhan, /[Tt]ắt page|[Kk]hai lại biến|[Kk]hởi động lại/, `${nhan}: phải nêu lối xử lý`);
  };
  await hangDoi("song");
  // ① vượt trần GL2 — worker DỪNG mọi page, khoá ở lại
  process.env.V3_TRAN_PAGE_BAT = "0";
  try { doDo(await aiMan("T"), /vượt trần/, "vượt trần"); } finally { process.env.V3_TRAN_PAGE_BAT = "20"; }
  // ② phanh tay — van gửi đóng
  await voiEnv({ V3_PANCAKE_GUI: "0" }, async () => doDo(await aiMan("T"), /[Vv]an gửi đang ĐÓNG/, "van đóng"));
  // ③ diễn tập
  await voiEnv({ V3_DIEN_TAP: "1", V3_PANCAKE_GUI: "0" }, async () => doDo(await aiMan("T"), /DIỄN TẬP/, "diễn tập"));
  // ④ máy chủ thiếu biến tệp
  await voiEnv({ V3_AI_SALE_TEP_GAN: undefined }, async () => doDo(await aiMan("T"), /thiếu biến V3_AI_SALE_TEP_GAN/, "thiếu biến (máy chủ)"));
  // ⑤ máy chạy bot đứng (tin khách chờ 10′, không tin nào xử xong)
  await hangDoi("dung");
  doDo(await aiMan("T"), /[Mm]áy chạy bot/, "máy chạy bot đứng");
  // ⑥ hàng đợi im — chưa đo được máy chạy bot ⇒ KHÔNG xanh (cũng không đỏ)
  await hangDoi("im");
  const im = await aiMan("T");
  assert.deepEqual([im.do, im.xanh], [false, false], `hàng đợi im ⇒ không xanh, đo ${JSON.stringify(im)}`);
  assert.doesNotMatch(im.nhan, /bot v3 đang trả lời/);
  // ⑦ CHO-QUA: đủ điều kiện + máy chạy bot vừa xử xong ⇒ xanh
  await hangDoi("song");
  const ok = await aiMan("T");
  assert.deepEqual([ok.trangThai, ok.do, ok.xanh], ["da_nhuong", false, true], JSON.stringify(ok));
  assert.match(ok.nhan, /ai_sale đã nhường — bot v3 đang trả lời/);
  // ⑧ page đang CHỜ (khoá đã ghi, ai_sale sắp nhường) cũng đỏ khi vượt trần
  await pool.query("UPDATE page SET ai_sale_trang_thai='cho', ai_sale_cho_den = now() + interval '10 minutes' WHERE id=$1", [ID.T]);
  process.env.V3_TRAN_PAGE_BAT = "0";
  try { doDo(await aiMan("T"), /vượt trần/, "chờ + vượt trần"); } finally { process.env.V3_TRAN_PAGE_BAT = "20"; }
  // ⑨ máy chạy bot thiếu biến tệp (máy chủ có) ⇒ worker loi_tep; tệp LÀNH, ai_sale vẫn nhường ⇒ không được nói «tệp hỏng»
  await pool.query("UPDATE page SET ai_sale_trang_thai='da_nhuong', ai_sale_cho_den = now() - interval '1 second' WHERE id=$1", [ID.T]);
  delete process.env.V3_AI_SALE_TEP_GAN;
  try { await luot({ boQuaXu: true }); } finally { process.env.V3_AI_SALE_TEP_GAN = TEP; }
  assert.equal((await dong("T")).tt, "loi_tep");
  doDo(await aiMan("T"), /thiếu biến V3_AI_SALE_TEP_GAN/, "thiếu biến (máy chạy bot)");
  await pool.query("DELETE FROM tin_cho_xu_ly WHERE team_id=$1", [X]);
  assert.equal((await gat("T", false)).status, 200);
});

/* ═══════════ F5 (NÊN) · page bật xếp sau hạng 500 vẫn được nạp ═══════════ */

test("GL10 F5 · 501 page xếp TRƯỚC Z (prod 582 page) ⇒ Z bật, da_nhuong ⇒ VẪN được nạp (không trần LIMIT 500 bỏ sót page bật)", async () => {
  ghiTep(MAU());
  const vals = []; for (let i = 0; i < 501; i++) vals.push(`(${X}, '1${String(i).padStart(14, "0")}', 'zz đệm GL10V', 'poll')`);
  await pool.query(`INSERT INTO page (team_id, page_id, ten, nguon_tin) VALUES ${vals.join(",")}`);
  try {
    assert.equal((await gat("Z", true)).status, 200);
    await pool.query("UPDATE page SET ai_sale_cho_den = now() - interval '1 second' WHERE id=$1", [ID.Z]);
    await luot({ boQuaXu: true });
    assert.equal((await dong("Z")).tt, "da_nhuong");
    const g0 = goi("Z");
    await luot({ boQuaXu: true });
    assert.ok(goi("Z") - g0 >= 1, "page bật xếp sau hạng 500 KHÔNG BAO GIỜ được nạp ⇒ ai_sale nhường, bot câm, màn xanh");
  } finally {
    await pool.query("DELETE FROM page WHERE ten='zz đệm GL10V'");
    await gat("Z", false);
  }
});

/* ═══════════ F6 (NÊN) · biến log không khớp tệp nào ⇒ nói rõ «không canh được log» ═══════════ */

test("GL10 F6 · V3_AI_SALE_LOG trỏ sai (0 tệp khớp) ⇒ lý do bật nói «KHÔNG canh được log — chỉ chờ theo giờ», không «đang canh log»; worker cảnh báo MỘT lần, lý do «đã nhường» nói chỉ theo giờ; có tệp ⇒ «đang canh log (1 tệp)»", async () => {
  ghiTep(MAU());
  const SAI = path.join(GOC, "khong-co", "aisale-chat");
  await voiEnv({ V3_AI_SALE_LOG: SAI }, async () => assert.equal((await gat("L", true)).status, 200));
  const l = await dong("L");
  assert.doesNotMatch(l.ly_do, /đang canh log/, `0 tệp log khớp mà vẫn khai «đang canh log»: ${l.ly_do}`);
  assert.match(l.ly_do, /KHÔNG canh được log/); assert.match(l.ly_do, /chỉ chờ theo giờ/);
  // CHO-QUA: có tệp log khớp tiền tố ⇒ đang canh (kèm số tệp)
  fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.writeFileSync(`${LOG}.log`, "khởi động\n");
  assert.equal((await gat("L", false)).status, 200);
  await voiEnv({ V3_AI_SALE_LOG: LOG }, async () => assert.equal((await gat("L", true)).status, 200));
  assert.match((await dong("L")).ly_do, /đang canh log ai_sale \(1 tệp\)/);
  // worker với biến trỏ sai ⇒ cảnh báo MỘT lần qua hai vòng, lý do «đã nhường» nói rõ chỉ theo giờ
  const canh = []; const goc = console.warn; console.warn = (...a) => { canh.push(a.join(" ")); goc(...a); };
  process.env.V3_AI_SALE_LOG = SAI;
  an.quenDemAiSale(); an.quenLogAiSale();
  try {
    await pool.query("UPDATE page SET ai_sale_cho_den = now() - interval '1 second', bot_bat_luc = now() - interval '20 minutes' WHERE id=$1", [ID.L]);
    await luot({ boQuaXu: true });
    await luot({ boQuaXu: true });
  } finally { console.warn = goc; delete process.env.V3_AI_SALE_LOG; }
  const l2 = await dong("L");
  assert.equal(l2.tt, "da_nhuong");
  assert.match(l2.ly_do, /không canh được log/i, `lý do «đã nhường» phải nói chỉ theo giờ: ${l2.ly_do}`);
  const ve = canh.filter((s) => s.includes("V3_AI_SALE_LOG") && /0 tệp/.test(s));
  assert.equal(ve.length, 1, `cảnh báo đúng MỘT lần, đo ${JSON.stringify(canh)}`);
  assert.equal((await gat("L", false)).status, 200);
});
