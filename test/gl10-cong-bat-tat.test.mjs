// PHIẾU GL10 ④1 ④3 ④4(màn) ④6 ④7 ④9 — CỔNG BẬT/TẮT qua ĐƯỜNG HTTP THẬT (Express + vé đăng nhập + `dungPhanB` → `cong-tac.js` →
// `noiVanHanhV3` → `operations.js#setPage`) trên Postgres HỘP CÁT (`aicloser_v3_test_gl10c_p<pid>`, tự dựng tự dọn).
// ⛔ Tệp `page_gan_them.json` là tệp TẠM (mkdtemp, dáng pancake-tool `state/chung/`) — CẤM đụng `/opt/pancake-tool`. Không mạng: fetch
// chỉ cho 127.0.0.1 của chính máy chủ ca. Bản chép logic ba hàm ai_sale (đọc 19/10 — như `gl10-tep-ai-sale.test.mjs`) đo NGỮ NGHĨA.
// Ca tiêm lỗi CSDL (④6 giao dịch 1 · ④9) gọi `setPage` thẳng với pool bọc — cùng hàm mà cửa HTTP gọi.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import express from "express";

// fetch GỐC chụp TRƯỚC khi nạp worker: `handler-v3` lắp cổng HTTP ghi lên `globalThis.fetch` (getter/setter — gán là thay lớp TRONG).
const fetchCu = globalThis.fetch;
process.env.V3_KHOA_VE ||= crypto.randomBytes(32).toString("base64");
process.env.V3_KHOA_CHU ||= crypto.randomBytes(32).toString("base64");

const { dungSandbox } = await import("../db/sandbox.js");
const { nhipMayBot } = await import("../src/queue/kho.js");
const { xepTin } = await import("../src/queue/kho.js");
const { taoTruyVanThat } = await import("../v3/src/noi-day/cong-du-lieu-that.js");
const { taoCongDanhTinh } = await import("../v3/src/noi-day/cong-danh-tinh.js");
const { noiVanHanhV3 } = await import("../v3/src/noi-day/van-hanh-v3.js");
const { dungPhanB } = await import("../v3/src/vai-b.js");
const { bam } = await import("../v3/src/auth/index.js");
const { xoaDemBat } = await import("../v3/src/ui/page-bot/cong-tac.js");
const { setPage, pageStatus } = await import("../src/admin-v3/operations.js");
const cw = await import("../src/queue/chay-worker.js");

const MAT_KHAU = "Gl10-mat-khau-chi-de-thu-123";
const GOC = fs.mkdtempSync(path.join(os.tmpdir(), "gl10-cong-"));
const TEP = path.join(GOC, "state", "chung", "page_gan_them.json");
const MAU = () => ({
  _ghi_chu: "Gắn page ngoài 12 shop vào thị trường theo tiền tệ.",
  uae: { "982000000101": "AED — gắn 19/09" },
  saudi: { "982000000201": "SAR" },
  tram_landing: { "982000000301": { nha: "saudi", nuoc: ["uae"], ten: "Trạm" } },
});
const ghiTep = (d) => { fs.mkdirSync(path.dirname(TEP), { recursive: true }); fs.writeFileSync(TEP, typeof d === "string" ? d : JSON.stringify(d, null, 1)); fs.chmodSync(TEP, 0o644); };
const docTep = () => JSON.parse(fs.readFileSync(TEP, "utf8"));
const ENV = {
  V3_PANCAKE_GUI: "1", PANCAKE_READONLY: "0", V3_RAP_PROMPT_BAT: "1", ANTHROPIC_API_KEY: "fake-only", V3_TRAN_PAGE_BAT: "20",
  V3_AI_SALE_TEP_GAN: TEP,
};
const PID = { P: "982000000001", Q: "982000000002", R: "982000000003", S: "982000000004", U: "982000000005", V: "982000000006", W: "982000000007", Y: "982000000008" };

const giuEnv = {};
let sb; let pool; let server; let base; let X; let ND; let cookie; const ID = {};
let goiLa = 0;

before(async () => {
  for (const k of ["V3_TRAN_PAGE_BAT", "V3_BOT_KHOA", "V3_BOT_GHI", "V3_AI_SALE_TEP_GAN", "V3_AI_SALE_LOG", "V3_NAP_DEV"]) giuEnv[k] = process.env[k];
  delete process.env.V3_BOT_KHOA; delete process.env.V3_BOT_GHI; delete process.env.V3_AI_SALE_LOG;
  // vòng 2 (F4): nhãn ai_sale của màn đọc trần GL2 từ env TIẾN TRÌNH (như đèn Sức khoẻ) — trần vắng = 0 ⇒ mọi page bật «vượt trần».
  process.env.V3_TRAN_PAGE_BAT = "20";
  sb = await dungSandbox("gl10c");
  pool = sb.pool;
  console.log(`   [gl10c] hộp cát ${sb.ten} · tệp đo ${fileURLToPath(new URL("../src/admin-v3/operations.js", import.meta.url))} · cwd ${process.cwd()}`);
  const mot = async (sql, a = []) => (await pool.query(sql, a)).rows[0];
  X = String((await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id);
  ND = String((await mot("INSERT INTO nguoi_dung (email, ten, mat_khau_hash) VALUES ($1,$1,$2) RETURNING id", ["qt@gl10.vn", await bam(MAT_KHAU)])).id);
  await pool.query("INSERT INTO thanh_vien_team (team_id, nguoi_dung_id, vai_id) SELECT $1,$2,id FROM vai WHERE ma='quan-tri'", [X, ND]);
  for (const [k, pid] of Object.entries(PID)) {
    ID[k] = String((await mot("INSERT INTO page (team_id, page_id, ten, nguon_tin) VALUES ($1,$2,$3,'poll') RETURNING id", [X, pid, `GL10 ${k}`])).id);
    const sp = (await mot("INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,'SP') RETURNING id", [X, ID[k], `gl10-${k}`])).id;
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
    if (!String(u).startsWith(base)) { goiLa += 1; throw new Error(`ca GL10: lượt gọi mạng lạ ${u}`); }
    return fetchCu(u, o);
  };
  const r = await fetch(`${base}/api/dang-nhap`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "qt@gl10.vn", matKhau: MAT_KHAU }),
  });
  assert.equal(r.status, 200, await r.text());
  cookie = r.headers.get("set-cookie").split(";")[0];
});
after(async () => {
  globalThis.fetch = fetchCu;
  for (const [k, v] of Object.entries(giuEnv)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  try { fs.chmodSync(path.dirname(TEP), 0o755); } catch { /* đã dọn */ }
  fs.rmSync(GOC, { recursive: true, force: true });
  if (server) await new Promise((ok) => server.close(ok));
  if (sb) await sb.don();
  assert.equal(goiLa, 0, "ca không được gọi mạng ra ngoài");
});

const bc = () => ({ teamId: X, nguoiDungId: ND });
const gat = async (k, bat) => {
  xoaDemBat();   // trần RAM 5 lượt bật/10′ của màn — việc khác, không phải hợp đồng GL10
  const r = await fetch(`${base}/api/page-bot/${ID[k]}/bot`, {
    method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json", "X-V3-Action": "1" }, body: JSON.stringify({ bat }),
  });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
};
const dong = async (k) => (await pool.query(
  `SELECT bot_ai_bat, bot_bat_luc, ai_sale_cho_den, ai_sale_trang_thai, ai_sale_ly_do,
          EXTRACT(EPOCH FROM (ai_sale_cho_den - bot_bat_luc)) AS cho_s FROM page WHERE id=$1`, [ID[k]])).rows[0];
const nhatKy = async (hanhDong, k) => (await pool.query(
  "SELECT sau, ghi_chu FROM nhat_ky WHERE hanh_dong=$1 AND doi_tuong_id=$2 ORDER BY id", [hanhDong, PID[k]])).rows;
const tatTay = (k) => pool.query("UPDATE page SET bot_ai_bat=false, ai_sale_trang_thai='', ai_sale_cho_den=NULL WHERE id=$1", [ID[k]]);
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
const aiSaleTrong = (pid) => JSON.parse(execFileSync("python3", ["-I", "-c", PY_AI_SALE, GOC, `${pid},982000000999`], { encoding: "utf8" }));

/** Pool bọc: câu khớp `mau` NÉM (tiêm lỗi CSDL ở đúng một câu). */
const poolTiem = (mau) => ({
  query: (sql, a) => pool.query(sql, a),
  connect: async () => {
    const c = await pool.connect();
    return { query: (sql, a) => (mau.test(String(sql?.text ?? sql)) ? Promise.reject(Object.assign(new Error("lỗi CSDL tiêm (ca GL10)"), { code: "XX000" })) : c.query(sql, a)), release: () => c.release() };
  },
});

/* ═══════════ ④1 + ④4 (màn) · bật ghi khoá đúng ngữ nghĩa ai_sale; tắt gỡ ═══════════ */

test("GL10 C1 · BẬT qua HTTP ⇒ _v3[P] có, khoá khác so sâu bằng, ai_sale (bản chép) bỏ P ở uae+saudi; màn: aiSale cho · còn 15 phút · choDen−bật 900 s; TẮT ⇒ khoá mất, ai_sale trông lại P", async () => {
  ghiTep(MAU());
  assert.ok(aiSaleTrong(PID.P).uae.includes(PID.P), "trước khi bật ai_sale trông P");
  const r = await gat("P", true);
  assert.equal(r.status, 200, JSON.stringify(r));
  assert.equal(r.botAiBat, true);
  assert.equal(r.aiSale?.trangThai, "cho", `đáp phải mang aiSale cho, đo ${JSON.stringify(r)}`);
  const d = docTep();
  assert.match(d._v3[PID.P], /^v3 pilot — GL10 P — bật \d{4}-\d\d-\d\dT/);
  const { _v3, ...khac } = d;
  assert.deepEqual(khac, MAU());
  const ai = aiSaleTrong(PID.P);
  assert.ok(!ai.uae.includes(PID.P) && !ai.saudi.includes(PID.P), `ai_sale phải nhường P, đo ${JSON.stringify(ai)}`);
  const p = await dong("P");
  assert.equal(p.ai_sale_trang_thai, "cho");
  assert.ok(Math.abs(Number(p.cho_s) - 900) <= 2, `choDen − bot_bat_luc = ${p.cho_s} s (đòi 900 ± 2)`);
  assert.match(p.ai_sale_ly_do, /chỉ chờ theo giờ — chưa nối log ai_sale/, "biến log vắng ⇒ màn nói chỉ chờ theo giờ");
  const ds = JSON.parse(await (await fetch(`${base}/api/page-bot/danh-sach`, { headers: { Cookie: cookie } })).text());
  const dongMan = ds.page.find((x) => x.pageId === PID.P);
  assert.equal(dongMan.aiSale?.trangThai, "cho", JSON.stringify(dongMan));
  assert.equal(dongMan.aiSale.conPhut, 15);
  assert.match(dongMan.aiSale.nhan, /Đang chờ ai_sale nhường — còn 15 phút/);
  assert.equal((await nhatKy("ai_sale_ghi_khoa", "P")).length, 1, "đúng một dòng nhật ký ghi khoá");
  const t = await gat("P", false);
  assert.equal(t.status, 200, JSON.stringify(t));
  assert.equal(t.canhBao, undefined);
  assert.equal(Object.hasOwn(docTep(), "_v3"), false, "mục cuối ⇒ khoá _v3 mất");
  assert.deepEqual(docTep(), MAU());
  assert.ok(aiSaleTrong(PID.P).uae.includes(PID.P), "tắt ⇒ ai_sale trông lại P");
  const p2 = await dong("P");
  assert.deepEqual([p2.bot_ai_bat, p2.ai_sale_trang_thai, p2.ai_sale_cho_den], [false, "", null]);
  assert.equal((await nhatKy("ai_sale_xoa_khoa", "P")).length, 1);
});

/* ═══════════ ④3 · tệp hỏng / vắng / biến vắng / gắn tay ⇒ từ chối bật, không ghi đè ═══════════ */

test("GL10 C3a · tệp cụt · gốc mảng · _v3 chuỗi ⇒ 409 nêu đường tệp + lỗi; tệp giống TỪNG BYTE; bot_ai_bat=false, trạng thái ''", async () => {
  for (const [nhan, noi] of [["cụt", '{"uae": {'], ["gốc mảng", "[1, 2]"], ["_v3 chuỗi", '{"uae": {}, "_v3": "982000000002"}']]) {
    ghiTep(noi);
    const r = await gat("Q", true);
    assert.equal(r.status, 409, `${nhan}: ${JSON.stringify(r)}`);
    assert.ok(r.thongDiep.includes(TEP), `${nhan}: câu phải nêu đường tệp: ${r.thongDiep}`);
    assert.match(r.thongDiep, /hỏng|JSON|object/, nhan);
    assert.equal(fs.readFileSync(TEP, "utf8"), noi, `${nhan}: tệp phải nguyên byte`);
    const q = await dong("Q");
    assert.deepEqual([q.bot_ai_bat, q.ai_sale_trang_thai, q.bot_bat_luc], [false, "", null], nhan);
    // màn (Sức khoẻ · Page & Bot) cũng phải thấy: câu chặn cố định + chi tiết lỗi tệp (/code-review GL10 #9)
    const st = await pageStatus(pool, (await pool.query("SELECT * FROM page WHERE id=$1", [ID.Q])).rows[0], ENV);
    assert.ok(st.blockers.includes("Tệp nhường page của ai_sale (page_gan_them.json) hỏng hoặc vắng — bot v3 không bật được; page đang bật thì bot v3 im"), `${nhan}: ${st.blockers.join(" · ")}`);
    assert.ok(String(st.aiSaleChiTiet?.loiTep).includes(TEP), nhan);
  }
});

test("GL10 C3b · tệp VẮNG ⇒ 409, KHÔNG tạo tệp · biến VẮNG ⇒ 409 «Chưa nối ai_sale»", async () => {
  fs.rmSync(TEP, { force: true });
  const r = await gat("Q", true);
  assert.equal(r.status, 409, JSON.stringify(r));
  assert.match(r.thongDiep, /không tồn tại/);
  assert.equal(fs.existsSync(TEP), false, "không tự tạo tệp của pancake-tool");
  ghiTep(MAU());
  const cu = ENV.V3_AI_SALE_TEP_GAN;
  delete ENV.V3_AI_SALE_TEP_GAN;
  try {
    const r2 = await gat("Q", true);
    assert.equal(r2.status, 409, JSON.stringify(r2));
    assert.match(r2.thongDiep, /Chưa nối ai_sale \(V3_AI_SALE_TEP_GAN vắng\) — bật lúc này có thể hai bot cùng trả lời/, "câu chặn của cổng (pageStatus), không phải lỗi ghi tệp");
  } finally { ENV.V3_AI_SALE_TEP_GAN = cu; }
  assert.equal((await dong("Q")).bot_ai_bat, false);
  assert.deepEqual(docTep(), MAU(), "không ghi gì");
});

test("GL10 C3c · P nằm dưới uae · dưới tram_landing ⇒ 409 «gắn tay» nêu khoá; tệp không đổi", async () => {
  for (const khoa of ["uae", "tram_landing"]) {
    const d = MAU();
    d[khoa][PID.R] = khoa === "uae" ? "AED — gắn tay" : { nha: "uae", nuoc: [] };
    ghiTep(d);
    const truoc = fs.readFileSync(TEP, "utf8");
    const r = await gat("R", true);
    assert.equal(r.status, 409, `${khoa}: ${JSON.stringify(r)}`);
    assert.match(r.thongDiep, /gắn tay cho ai_sale/, khoa);
    assert.ok(r.thongDiep.includes(`khoá gắn tay: ${khoa}`), `${khoa}: phải nêu khoá — ${r.thongDiep}`);
    assert.equal(fs.readFileSync(TEP, "utf8"), truoc);
    assert.equal((await dong("R")).bot_ai_bat, false);
  }
  ghiTep(MAU());
});

/* ═══════════ ④6 · TẮT ═══════════ */

test("GL10 C6a · TẮT P (2 cho + 1 dang_xu), Q có 1 cho ⇒ 2 tin P xong bo_qua:tat_bot; dang_xu + tin Q giữ; khoá mất; nhật ký có số dòng", async () => {
  ghiTep(MAU());
  assert.equal((await gat("S", true)).status, 200);
  const xep = async (pid, n) => (await xepTin(pool, { teamId: X, pageId: pid, psid: `c6-${n}`, convId: `c6-conv-${n}`, msgId: `c6-m-${n}`, noiDung: "hi" })).id;
  const a = await xep(PID.S, 1); const b = await xep(PID.S, 2); const c = await xep(PID.S, 3); const q = await xep(PID.Q, 4);
  await pool.query("UPDATE tin_cho_xu_ly SET trang_thai='dang_xu' WHERE id=$1", [c]);
  const r = await gat("S", false);
  assert.equal(r.status, 200, JSON.stringify(r));
  const tt = async (id) => (await pool.query("SELECT trang_thai, ly_do FROM tin_cho_xu_ly WHERE id=$1", [id])).rows[0];
  for (const id of [a, b]) assert.deepEqual(await tt(id), { trang_thai: "xong", ly_do: "bo_qua:tat_bot" });
  assert.equal((await tt(c)).trang_thai, "dang_xu", "lượt đang chạy tự dừng ở assertCanAct — không đụng");
  assert.equal((await tt(q)).trang_thai, "cho", "tin page khác không đổi");
  assert.equal(Object.hasOwn(docTep(), "_v3"), false);
  const nk = await nhatKy("v3_tat_bot_dong_tin", "S");
  assert.equal(nk.at(-1)?.sau?.tin_cho_dong, 2, `nhật ký phải có số tin đóng, đo ${JSON.stringify(nk)}`);
});

test("GL10 C6b · TẮT khi gỡ khoá HỎNG (tệp hỏng · thư mục 555) ⇒ bot_ai_bat=false, xoa_hong, đáp có canhBao, màn nhãn đỏ; sửa xong tắt lại ⇒ khoá mất, ''", async () => {
  for (const cach of ["tep_hong", "thu_muc_555"]) {
    ghiTep(MAU());
    assert.equal((await gat("U", true)).status, 200, cach);
    let tepDung = null;
    if (cach === "tep_hong") { tepDung = fs.readFileSync(TEP, "utf8"); fs.writeFileSync(TEP, '{"uae": {'); }
    else fs.chmodSync(path.dirname(TEP), 0o555);
    let r;
    try { r = await gat("U", false); } finally { if (cach === "thu_muc_555") fs.chmodSync(path.dirname(TEP), 0o755); }
    assert.equal(r.status, 200, `${cach}: TẮT không bao giờ bị chặn — ${JSON.stringify(r)}`);
    assert.equal(r.botAiBat, false);
    assert.match(r.canhBao || "", /CHƯA xoá/, `${cach}: đáp phải có canhBao`);
    const u = await dong("U");
    assert.deepEqual([u.bot_ai_bat, u.ai_sale_trang_thai], [false, "xoa_hong"], cach);
    const ds = JSON.parse(await (await fetch(`${base}/api/page-bot/danh-sach`, { headers: { Cookie: cookie } })).text());
    const a = ds.page.find((x) => x.pageId === PID.U).aiSale;
    assert.deepEqual([a?.trangThai, a?.do], ["xoa_hong", true], `${cach}: màn ${JSON.stringify(a)}`);
    assert.equal((await nhatKy("ai_sale_xoa_khoa_hong", "U")).length >= 1, true);
    if (tepDung) fs.writeFileSync(TEP, tepDung);
    assert.equal(docTep()._v3?.[PID.U] != null, true, `${cach}: khoá còn trong tệp (đúng là CHƯA xoá)`);
    const r2 = await gat("U", false);   // «Thử xoá lại» = gạt tắt lần nữa
    assert.equal(r2.status, 200); assert.equal(r2.canhBao, undefined);
    assert.equal(docTep()._v3?.[PID.U], undefined, `${cach}: tắt lại ⇒ khoá mất`);
    assert.equal((await dong("U")).ai_sale_trang_thai, "", cach);
  }
});

test("GL10 C6c · tiêm lỗi UPDATE page ở giao dịch 1 của TẮT ⇒ khoá VẪN còn, bot_ai_bat VẪN true (không bao giờ «v3 bật + khoá mất»)", async () => {
  ghiTep(MAU());
  assert.equal((await gat("V", true)).status, 200);
  await assert.rejects(() => setPage(poolTiem(/^\s*UPDATE page SET bot_ai_bat/), bc(), ID.V, { enabled: false }, ENV), /lỗi CSDL tiêm/);
  assert.equal(typeof docTep()._v3?.[PID.V], "string", "khoá phải còn — xoá khoá chỉ SAU khi v3 đã tắt");
  assert.equal((await dong("V")).bot_ai_bat, true);
  assert.equal((await gat("V", false)).status, 200);
  assert.equal(docTep()._v3?.[PID.V], undefined);
});

test("GL10 C6d · page bật bằng UPDATE tay (trạng thái '', chưa từng ghi khoá), biến VẮNG ⇒ tắt 200, bot_ai_bat=false, '', KHÔNG canhBao", async () => {
  await pool.query("UPDATE page SET bot_ai_bat=true WHERE id=$1", [ID.W]);
  const ds = JSON.parse(await (await fetch(`${base}/api/page-bot/danh-sach`, { headers: { Cookie: cookie } })).text());
  const a = ds.page.find((x) => x.pageId === PID.W).aiSale;
  assert.deepEqual([a?.trangThai, a?.do], ["", true], `page bật mà chưa từng ghi khoá: worker KHÔNG trả lời — màn phải nói (đỏ), đo ${JSON.stringify(a)}`);
  assert.match(a.nhan, /bot v3 im/);
  const cu = ENV.V3_AI_SALE_TEP_GAN;
  delete ENV.V3_AI_SALE_TEP_GAN;
  let r;
  try { r = await gat("W", false); } finally { ENV.V3_AI_SALE_TEP_GAN = cu; }
  assert.equal(r.status, 200, JSON.stringify(r));
  assert.equal(r.canhBao, undefined, `không được báo «khoá CHƯA xoá» cho khoá không tồn tại: ${r.canhBao}`);
  const w = await dong("W");
  assert.deepEqual([w.bot_ai_bat, w.ai_sale_trang_thai], [false, ""]);
  assert.equal((await nhatKy("ai_sale_xoa_khoa_hong", "W")).length, 0);
});

test("GL10 C6e · tiến trình CHẾT giữa giao dịch 1 và giao dịch 2 của TẮT (mô phỏng: mọi câu sau giao dịch 1 hỏng) ⇒ trạng thái đã là xoa_hong (màn báo «khoá CHƯA xoá»), không phải ''", async () => {
  ghiTep(MAU());
  assert.equal((await gat("V", true)).status, 200);
  const chet = poolTiem(/^\s*(SELECT bot_ai_bat, ai_sale_trang_thai FROM page WHERE team_id=\$1 AND page_id=\$2 FOR UPDATE|UPDATE page SET ai_sale_trang_thai='xoa_hong')/);
  const r = await setPage(chet, bc(), ID.V, { enabled: false }, ENV);
  assert.equal(r.bot_ai_bat, false);
  const v = await dong("V");
  assert.deepEqual([v.bot_ai_bat, v.ai_sale_trang_thai], [false, "xoa_hong"], "giao dịch 1 phải đánh dấu «đang gỡ khoá» — chết trước giao dịch 2 thì khoá còn mà màn không báo gì");
  assert.equal(typeof docTep()._v3?.[PID.V], "string", "khoá còn (giao dịch 2 chưa chạy)");
  assert.equal((await gat("V", false)).status, 200);   // «Thử xoá lại»
  assert.deepEqual([docTep()._v3?.[PID.V], (await dong("V")).ai_sale_trang_thai], [undefined, ""]);
});

test("GL10 C6f · TẮT giao dịch 1 xong, một lượt BẬT cùng page chạy trọn TRƯỚC giao dịch 2 ⇒ giao dịch 2 KHÔNG gỡ khoá (khoá là của lượt bật); page bật + khoá còn", async () => {
  ghiTep(MAU());
  assert.equal((await gat("V", true)).status, 200);
  let daBat = false;
  const chen = {
    query: (sql, a) => pool.query(sql, a),
    connect: async () => {
      const c = await pool.connect();
      return { release: () => c.release(), query: async (sql, a) => {
        if (!daBat && /^\s*SELECT bot_ai_bat, ai_sale_trang_thai FROM page WHERE team_id=\$1 AND page_id=\$2 FOR UPDATE/.test(String(sql?.text ?? sql))) {
          daBat = true;
          await setPage(pool, bc(), ID.V, { enabled: true }, ENV);   // người thứ hai bấm BẬT ngay sau giao dịch 1
        }
        return c.query(sql, a);
      } };
    },
  };
  const r = await setPage(chen, bc(), ID.V, { enabled: false }, ENV);
  assert.ok(daBat, "phải chen được lượt bật vào giữa hai giao dịch");
  assert.equal(r.aiSale?.trangThai, "cho", JSON.stringify(r.aiSale));
  const v = await dong("V");
  assert.deepEqual([v.bot_ai_bat, v.ai_sale_trang_thai], [true, "cho"]);
  assert.equal(typeof docTep()._v3?.[PID.V], "string", "giao dịch 2 của lượt tắt GỠ MẤT khoá của lượt bật ⇒ page bật mà ai_sale trả lời lại");
  assert.equal((await gat("V", false)).status, 200);
});

test("GL10 C10 · gạt BẬT lần nữa page ĐANG phục vụ (da_nhuong, khoá còn) ⇒ KHÔNG đặt lại mốc, KHÔNG đóng tin chờ hợp lệ, KHÔNG chờ lại 15′; page mat_khoa gạt BẬT ⇒ lượt bật đầy đủ", async () => {
  ghiTep(MAU());
  assert.equal((await gat("R", true)).status, 200);
  await pool.query("UPDATE page SET bot_bat_luc = now() - interval '1 hour', ai_sale_cho_den = now() - interval '40 minutes', ai_sale_trang_thai='da_nhuong' WHERE id=$1", [ID.R]);
  const t1 = (await xepTin(pool, { teamId: X, pageId: PID.R, psid: "c10-1", convId: "c10-c1", msgId: "c10-m1", noiDung: "hi" })).id;
  const t2 = (await xepTin(pool, { teamId: X, pageId: PID.R, psid: "c10-2", convId: "c10-c2", msgId: "c10-m2", noiDung: "hi" })).id;
  const truoc = await dong("R");
  const ghiTruoc = (await nhatKy("ai_sale_ghi_khoa", "R")).length;
  const r = await gat("R", true);
  assert.equal(r.status, 200, JSON.stringify(r));
  const sau = await dong("R");
  assert.equal(sau.ai_sale_trang_thai, "da_nhuong", "page đang phục vụ phải giữ da_nhuong");
  assert.equal(new Date(sau.bot_bat_luc).getTime(), new Date(truoc.bot_bat_luc).getTime(), "mốc bật không được đặt lại");
  for (const t of [t1, t2]) assert.equal((await pool.query("SELECT trang_thai FROM tin_cho_xu_ly WHERE id=$1", [t])).rows[0].trang_thai, "cho", "tin khách hợp lệ đang chờ bị đóng");
  assert.equal((await nhatKy("ai_sale_ghi_khoa", "R")).length, ghiTruoc, "không ghi khoá lại");
  // trạng thái không phục vụ (mất khoá) ⇒ gạt BẬT = đường «bật lại» màn chỉ ⇒ lượt đầy đủ
  await pool.query("UPDATE page SET ai_sale_trang_thai='mat_khoa' WHERE id=$1", [ID.R]);
  assert.equal((await gat("R", true)).status, 200);
  const lai = await dong("R");
  assert.equal(lai.ai_sale_trang_thai, "cho");
  assert.ok(new Date(lai.bot_bat_luc).getTime() > new Date(truoc.bot_bat_luc).getTime(), "bật lại sau mất khoá ⇒ mốc mới");
  assert.equal((await gat("R", false)).status, 200);
});

/* ═══════════ ④7 · bật lại không trả lời tin cũ ═══════════ */

test("GL10 C7 · P tắt còn sót 1 tin cho (thoi_diem cũ) ⇒ bật ⇒ tin đó xong bo_qua:truoc_moc_bat; worker (P đã nhường) KHÔNG gọi bộ não", async () => {
  ghiTep(MAU());
  const t = (await xepTin(pool, { teamId: X, pageId: PID.Y, psid: "c7", convId: "c7-conv", msgId: "c7-m", noiDung: "how much?" })).id;
  await pool.query("UPDATE tin_cho_xu_ly SET thoi_diem = now() - interval '3 hours', thu_lai_luc = now() - interval '3 hours' WHERE id=$1", [t]);
  const r = await gat("Y", true);
  assert.equal(r.status, 200, JSON.stringify(r));
  const tin = (await pool.query("SELECT trang_thai, ly_do FROM tin_cho_xu_ly WHERE id=$1", [t])).rows[0];
  assert.deepEqual(tin, { trang_thai: "xong", ly_do: "bo_qua:truoc_moc_bat" });
  assert.equal((await nhatKy("ai_sale_ghi_khoa", "Y")).at(-1)?.sau?.tin_cho_dong, 1);
  // ép «đã nhường» rồi chạy worker THẬT: tin cũ không được rút, bộ não 0 lượt
  await pool.query("UPDATE page SET ai_sale_cho_den = now() - interval '1 minute', ai_sale_trang_thai='da_nhuong' WHERE id=$1", [ID.Y]);
  const cuE = { ...process.env };
  Object.assign(process.env, { V3_AI_SALE_TEP_GAN: TEP, V3_TRAN_PAGE_BAT: "20", V3_NAP_DEV: "1" });
  let nao = 0;
  try {
    const k = await cw.motLuot(pool, {
      depsNap: { docHoiThoai: async () => [], traThe: async () => null },
      depsXuLy: { chayCloser: async () => ((nao += 1), ""), docLichSu: false },
    });
    assert.ok(k.aiSale.sanSang >= 1, `P phải sẵn sàng, đo ${JSON.stringify(k.aiSale)}`);
    assert.equal(k.xu.vong, 0, `không tin nào được rút, đo ${JSON.stringify(k.xu)}`);
  } finally { for (const kk of ["V3_AI_SALE_TEP_GAN", "V3_TRAN_PAGE_BAT", "V3_NAP_DEV"]) if (cuE[kk] === undefined) delete process.env[kk]; else process.env[kk] = cuE[kk]; }
  assert.equal(nao, 0);
  assert.equal((await pool.query("SELECT trang_thai FROM tin_cho_xu_ly WHERE id=$1", [t])).rows[0].trang_thai, "xong");
  await gat("Y", false);
});

/* ═══════════ ④9 · bù khi COMMIT/UPDATE hỏng sau ghi khoá ═══════════ */

test("GL10 C9 · tiêm lỗi UPDATE page lượt BẬT ⇒ khoá bị gỡ lại, bot_ai_bat=false · page ĐANG bật (khoá có trước) gạt lại hỏng ⇒ khoá cũ GIỮ", async () => {
  ghiTep(MAU());
  await tatTay("P");
  await assert.rejects(() => setPage(poolTiem(/^\s*UPDATE page SET bot_ai_bat/), bc(), ID.P, { enabled: true }, ENV), /lỗi CSDL tiêm/);
  assert.equal(Object.hasOwn(docTep(), "_v3"), false, `khoá vừa ghi phải được gỡ lại, tệp: ${JSON.stringify(docTep()._v3)}`);
  assert.deepEqual(docTep(), MAU());
  assert.equal((await dong("P")).bot_ai_bat, false);
  // page đang bật, khoá là của nó: gạt lại (lượt ĐẦY ĐỦ — trạng thái mat_khoa, không phải «đang phục vụ») hỏng thì KHÔNG được gỡ
  // (gỡ = ai_sale trả lời lại page v3 đang bật). Nhánh `coTruoc` của ghiKhoa.
  assert.equal((await gat("P", true)).status, 200);
  await pool.query("UPDATE page SET ai_sale_trang_thai='mat_khoa' WHERE id=$1", [ID.P]);
  await assert.rejects(() => setPage(poolTiem(/^\s*UPDATE page SET bot_ai_bat/), bc(), ID.P, { enabled: true }, ENV), /lỗi CSDL tiêm/);
  assert.equal(typeof docTep()._v3?.[PID.P], "string", "khoá có trước lượt hỏng phải còn");
  assert.equal((await dong("P")).bot_ai_bat, true);
  await gat("P", false);
});
