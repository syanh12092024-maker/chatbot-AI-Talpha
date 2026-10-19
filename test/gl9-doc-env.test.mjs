// GL9 ④2 — MỘT bộ đọc `.env` tuyệt đối (`db/ket-noi.js#docTepEnv`, `util.parseEnv` ⇒ cùng giá trị `node --env-file`) cho ba hàm bọc:
//   `src/queue/nap.js#docEnvTuyetDoi` (van PANCAKE_READONLY · lớp chặn cuối `handler-v3.js#vanGuiDangMoTuyetDoi`) ·
//   `db/ket-noi.js#chuoiNoi` (DATABASE_URL_V3) · `src/pos/moi-truong.js#docBien|moiTruongKhoa` (V3_KHOA_MA_HOA).
// Bộ đọc tay cũ giữ chú thích đuôi: `PANCAKE_READONLY=1   # chú thích` ⇒ "1   # chú thích" ⇒ `!== "1"` ⇒ van MỞ (fail-OPEN).
//
// ĐO Ở ĐÂU: mỗi kịch bản là MỘT TIẾN TRÌNH CON với env SẠCH (`PATH` + biến của chính ca) — `npm test` nạp `.env` máy dev vào
// process.env, đo trong tiến trình test là đo process.env chứ không đo bộ đọc. Ba hàm bọc chạy trên BẢN CHÉP CÂY (db · src · v3/src ·
// package.json · node_modules symlink) có `.env` TẠM ở gốc bản chép; cwd của tiến trình con là thư mục RỖNG (nạp `nap.js` kéo
// `config.js` ⇒ `dotenv/config` đọc `.env` của CWD vào process.env — cwd có `.env` là đo dotenv). ⛔ Không chạm `<repo>/.env`.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const GOC = fileURLToPath(new URL("..", import.meta.url));
const NODE_MODULES = path.resolve(path.dirname(createRequire(import.meta.url).resolve("pg/package.json")), "..");
let T, CAY, RONG, KHAC;

before(() => {
  T = fs.mkdtempSync(path.join(os.tmpdir(), "gl9e-"));
  CAY = path.join(T, "cay"); RONG = path.join(T, "rong"); KHAC = path.join(T, "khac");
  for (const d of [CAY, RONG, KHAC]) fs.mkdirSync(d);
  // `v3/src` thêm vào khuôn «db src package.json» của phiếu: handler-v3 → src/chat/model.js nạp `v3/src/model/bang-model.js`.
  for (const d of ["db", "src", "v3/src"]) fs.cpSync(path.join(GOC, d), path.join(CAY, d), { recursive: true });
  fs.copyFileSync(path.join(GOC, "package.json"), path.join(CAY, "package.json"));
  fs.symlinkSync(NODE_MODULES, path.join(CAY, "node_modules"));
  fs.writeFileSync(path.join(KHAC, ".env"), "V3_KHOA_MA_HOA=khac   # goc khac\n");
  console.log(`   [gl9e] bản chép ${CAY} (từ ${GOC}) · node ${process.version}`);
});
after(() => { if (T) { try { fs.chmodSync(path.join(CAY, ".env"), 0o600); } catch { /* không có */ } fs.rmSync(T, { recursive: true, force: true }); } });

const CHUAN = [
  "PANCAKE_READONLY=1   # chú thích",
  'DATABASE_URL_V3="postgres://x # y"   # đuôi',
  "V3_KHOA_MA_HOA=abc#def",
  "X=",
  "",
].join("\n");

// Kịch bản con: chạy từng biểu thức trên bản chép, ghi { v } hoặc { nem }, in MỘT dòng JSON.
const KICH_BAN = String.raw`
const cay = JSON.parse(process.env.GL9_CAY), bt = JSON.parse(process.env.GL9_BT);
const kn = await import(cay.ketNoi), nap = await import(cay.nap), mt = await import(cay.moiTruong);
const hv = bt.some(([, b]) => b.includes("hv.")) ? await import(cay.handler) : null;
const KHAC = process.env.GL9_KHAC, out = {};
for (const [ten, b] of bt) {
  try { const v = eval(b); out[ten] = { v: v === undefined ? "<undefined>" : v }; }
  catch (e) { out[ten] = { nem: String(e && e.message || e) }; }
}
console.log("GL9_JSON=" + JSON.stringify(out));
`;

function datEnv(noiDung) {
  const p = path.join(CAY, ".env");
  try { fs.chmodSync(p, 0o600); } catch { /* chưa có */ }
  fs.rmSync(p, { force: true });
  if (noiDung != null) fs.writeFileSync(p, noiDung);
  return p;
}

function chay(bieuThuc, envThem = {}) {
  const u = (t) => pathToFileURL(path.join(CAY, t)).href;
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", KICH_BAN], {
    cwd: RONG, encoding: "utf8", timeout: 60_000,
    env: {
      PATH: process.env.PATH, GL9_KHAC: KHAC, ...envThem,
      GL9_CAY: JSON.stringify({ ketNoi: u("db/ket-noi.js"), nap: u("src/queue/nap.js"), moiTruong: u("src/pos/moi-truong.js"), handler: u("src/chat/handler-v3.js") }),
      GL9_BT: JSON.stringify(Object.entries(bieuThuc)),
    },
  });
  const dong = (r.stdout || "").split("\n").find((d) => d.startsWith("GL9_JSON="));
  assert.ok(dong, `tiến trình con không trả kết quả (rc=${r.status}): ${(r.stderr || "").slice(-800)}`);
  return JSON.parse(dong.slice("GL9_JSON=".length));
}
const v = (o) => (o && "v" in o ? o.v : `NÉM: ${o?.nem}`);

/** Giá trị của `node --env-file=<tệp>` (env sạch) cho từng khoá — chuẩn đối chiếu. */
function theoEnvFile(tep, khoa) {
  const r = spawnSync(process.execPath, [`--env-file=${tep}`, "-e", `console.log(JSON.stringify(${JSON.stringify(khoa)}.map(k => process.env[k] ?? "<undefined>")))`],
    { cwd: RONG, encoding: "utf8", env: { PATH: process.env.PATH } });
  return JSON.parse(r.stdout.trim());
}

test("GL9 E1 · bộ đọc chung trên tệp chú thích/nháy/dính #/rỗng ⇒ đúng từng khoá như `node --env-file` (so trực tiếp)", () => {
  const tep = datEnv(CHUAN);
  const khoa = ["PANCAKE_READONLY", "DATABASE_URL_V3", "V3_KHOA_MA_HOA", "X", "KHONG_CO"];
  const ra = chay(Object.fromEntries(khoa.map((k) => [k, `kn.docTepEnv(${JSON.stringify(k)}, ${JSON.stringify(CAY)})`])));
  const thuc = khoa.map((k) => v(ra[k]));
  assert.deepEqual(thuc, ["1", "postgres://x # y", "abc", "", "<undefined>"]);
  assert.deepEqual(thuc, theoEnvFile(tep, khoa), "lệch `node --env-file`");
});

test("GL9 E2 · khoá TRÙNG ⇒ dòng CUỐI (như --env-file) · `export K=1` ⇒ \"1\"", () => {
  const tep = datEnv("K=dau\nK=cuoi\nexport E=1\nexport  F=\"q # r\"   # c\n");
  const ra = chay({ K: `kn.docTepEnv("K")`, E: `kn.docTepEnv("E")`, F: `kn.docTepEnv("F")` });
  assert.deepEqual([v(ra.K), v(ra.E), v(ra.F)], ["cuoi", "1", "q # r"]);
  assert.deepEqual([v(ra.K), v(ra.E), v(ra.F)], theoEnvFile(tep, ["K", "E", "F"]));
});

test("GL9 E3 · nháy kép HỞ phía trên PANCAKE_READONLY ⇒ NÉM «.env hỏng quanh PANCAKE_READONLY» ở bộ chung, docEnvTuyetDoi và cả hai van", () => {
  datEnv('A="abc\nPANCAKE_READONLY=1\n# V3_KHOA_MA_HOA=zzz\n');
  const ra = chay({
    chung: `kn.docTepEnv("PANCAKE_READONLY")`, tuyetDoi: `nap.docEnvTuyetDoi("PANCAKE_READONLY")`,
    vanGui: `hv.vanGuiDangMoTuyetDoi()`, vanNguon: `nap.nguonDangMo()`,
    comment: `kn.docTepEnv("V3_KHOA_MA_HOA")`, vang: `kn.docTepEnv("KHONG_CO")`,
  }, { V3_PANCAKE_GUI: "1" });
  for (const k of ["chung", "tuyetDoi", "vanGui", "vanNguon"]) {
    assert.match(ra[k]?.nem || "", /\.env hỏng quanh PANCAKE_READONLY/, `${k}: ${JSON.stringify(ra[k])} — nháy hở phải NÉM (fail-CLOSED), không được trả giá trị/undefined`);
  }
  assert.deepEqual([v(ra.comment), v(ra.vang)], ["<undefined>", "<undefined>"], "dòng chú thích / khoá vắng hẳn không phải «.env hỏng»");
});

test("GL9 E4 · tệp VẮNG (ENOENT) ⇒ như cũ: undefined · chuoiNoi ném «Thiếu DATABASE_URL_V3» · docBien \"\" · moiTruongKhoa không thêm khoá", () => {
  datEnv(null);
  const ra = chay({
    chung: `kn.docTepEnv("PANCAKE_READONLY")`, tuyetDoi: `nap.docEnvTuyetDoi("PANCAKE_READONLY")`, noi: `kn.chuoiNoi()`,
    bien: `mt.docBien("V3_KHOA_MA_HOA")`, khoa: `"V3_KHOA_MA_HOA" in mt.moiTruongKhoa({ A: "1" })`, vanGui: `hv.vanGuiDangMoTuyetDoi()`,
  }, { V3_PANCAKE_GUI: "1" });
  assert.deepEqual([v(ra.chung), v(ra.tuyetDoi), v(ra.bien), v(ra.khoa), v(ra.vanGui)], ["<undefined>", "<undefined>", "", false, true]);
  assert.match(ra.noi?.nem || "", /Thiếu DATABASE_URL_V3/);
});

test("GL9 E5 · tệp KHÔNG ĐỌC ĐƯỢC (chmod 000) ⇒ NÉM ở bộ chung và cả ba hàm bọc — không nuốt thành «vắng biến»", (t) => {
  if (process.getuid?.() === 0) return t.skip("root đọc được tệp 000 — ca vô nghĩa");
  const p = datEnv(CHUAN);
  fs.chmodSync(p, 0o000);
  try {
    const ra = chay({
      chung: `kn.docTepEnv("PANCAKE_READONLY")`, tuyetDoi: `nap.docEnvTuyetDoi("PANCAKE_READONLY")`, noi: `kn.chuoiNoi()`,
      bien: `mt.docBien("V3_KHOA_MA_HOA")`, vanGui: `hv.vanGuiDangMoTuyetDoi()`,
    }, { V3_PANCAKE_GUI: "1" });
    for (const k of ["chung", "tuyetDoi", "noi", "bien", "vanGui"]) {
      assert.match(ra[k]?.nem || "", /EACCES/, `${k}: ${JSON.stringify(ra[k])} — lỗi đọc tệp phải NÉM nguyên nhân, không thành vắng biến`);
    }
  } finally { fs.chmodSync(p, 0o600); }
});

test("GL9 E6 · ba hàm bọc trên bản chép (env sạch): \"1\" · \"postgres://x # y\" · \"abc\" · X ⇒ \"\" — van gửi + van nguồn ĐÓNG", () => {
  datEnv(CHUAN);
  const ra = chay({
    tuyetDoi: `nap.docEnvTuyetDoi("PANCAKE_READONLY")`, noi: `kn.chuoiNoi()`, bien: `mt.docBien("V3_KHOA_MA_HOA")`,
    khoa: `mt.moiTruongKhoa({ A: "1" })`, xTuyetDoi: `nap.docEnvTuyetDoi("X")`, xBien: `mt.docBien("X")`,
    vanGui: `hv.vanGuiDangMoTuyetDoi()`, vanNguon: `nap.nguonDangMo()`,
  }, { V3_PANCAKE_GUI: "1" });
  assert.deepEqual([v(ra.tuyetDoi), v(ra.noi), v(ra.bien)], ["1", "postgres://x # y", "abc"]);
  assert.deepEqual(v(ra.khoa), { A: "1", V3_KHOA_MA_HOA: "abc" });
  assert.deepEqual([v(ra.xTuyetDoi), v(ra.xBien)], ["", ""]);
  assert.equal(v(ra.vanGui), false, "V3_PANCAKE_GUI=1 + `.env` READONLY=1 có chú thích ⇒ van gửi phải ĐÓNG");
  assert.equal(v(ra.vanNguon), false, "READONLY=1 có chú thích ⇒ bộ nạp phải ĐÓNG");
});

test("GL9 E7 · ưu tiên env giữ nguyên từng hàm: docEnvTuyetDoi env rỗng THẮNG · chuoiNoi/docBien env rỗng KHÔNG thắng · docBien env TIÊM + goc tham số", () => {
  datEnv(CHUAN);
  const rong = chay({ tuyetDoi: `nap.docEnvTuyetDoi("PANCAKE_READONLY")`, noi: `kn.chuoiNoi()` }, { PANCAKE_READONLY: "", DATABASE_URL_V3: "" });
  assert.deepEqual([v(rong.tuyetDoi), v(rong.noi)], ["", "postgres://x # y"]);
  const co = chay({ tuyetDoi: `nap.docEnvTuyetDoi("PANCAKE_READONLY")`, noi: `kn.chuoiNoi()` }, { PANCAKE_READONLY: "0", DATABASE_URL_V3: "postgres://env" });
  assert.deepEqual([v(co.tuyetDoi), v(co.noi)], ["0", "postgres://env"]);
  const tiem = chay({
    tiem: `mt.docBien("V3_KHOA_MA_HOA", { V3_KHOA_MA_HOA: "tiem" })`, rongTiem: `mt.docBien("V3_KHOA_MA_HOA", { V3_KHOA_MA_HOA: "" })`,
    boQuaProcess: `mt.docBien("V3_KHOA_MA_HOA", {})`, gocKhac: `mt.docBien("V3_KHOA_MA_HOA", {}, KHAC)`,
    khoaGocKhac: `mt.moiTruongKhoa({}, KHAC).V3_KHOA_MA_HOA`, chungGocKhac: `kn.docTepEnv("V3_KHOA_MA_HOA", KHAC)`,
  }, { V3_KHOA_MA_HOA: "tu-process" });
  assert.deepEqual([v(tiem.tiem), v(tiem.rongTiem), v(tiem.boQuaProcess), v(tiem.gocKhac), v(tiem.khoaGocKhac), v(tiem.chungGocKhac)],
    ["tiem", "abc", "abc", "khac", "khac", "khac"]);
});

test("GL9 E8 · CHO-QUA: máy chủ (READONLY=0 có chú thích · hoặc không có dòng) + V3_PANCAKE_GUI=1 ⇒ van gửi MỞ, bộ nạp MỞ", () => {
  datEnv("PANCAKE_READONLY=0   # máy chủ không chỉ-đọc\n");
  const a = chay({ vanGui: `hv.vanGuiDangMoTuyetDoi()`, vanNguon: `nap.nguonDangMo()` }, { V3_PANCAKE_GUI: "1" });
  datEnv("V3_KHOA_MA_HOA=abc\n");
  const b = chay({ vanGui: `hv.vanGuiDangMoTuyetDoi()`, vanNguon: `nap.nguonDangMo()` }, { V3_PANCAKE_GUI: "1" });
  assert.deepEqual([v(a.vanGui), v(a.vanNguon), v(b.vanGui), v(b.vanNguon)], [true, true, true, true]);
});
