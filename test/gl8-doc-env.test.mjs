// GL8 ④5 — CHÍN CÔNG CỤ `ops/bin/*.mjs` ĐỌC `.env` Y NHƯ `node --env-file` (prod) — chú thích đuôi KHÔNG lọt vào giá trị.
//
// Bệnh: khối tự viết giữ nguyên `FASTLANE_TEMPLATES=0        # TAT…` ⇒ giá trị "0        # TAT…" ⇒ mọi cờ đọc kiểu `!== '0'` thành BẬT
// trong giả lập, trong khi prod (`node --env-file`) đọc "0".
//
// CÁCH ĐO (hành vi, không đo hình dạng mã): chạy THẬT từng công cụ trong một tiến trình con với `DEVENV=<tệp env tạm>` và một móc
// `--import` thay `pg.Pool` — công cụ dựng pool bằng `env.DATABASE_URL_V3` nó vừa đọc ⇒ móc in chuỗi nối + các biến cần soi rồi
// `process.exit(0)` NGAY tại đó (0 kết nối CSDL, `fetch` bị thay bằng hàm ném). Chuỗi nối mang chú thích đuôi trong tệp env, nên
// bộ đọc cũ lộ ra ngay ở chuỗi nối. Tiến trình con nhận env TỐI THIỂU (không thừa hưởng `.env` mà `npm test` đã nạp).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const URL_SACH = "postgres://gl8@127.0.0.1:9/gl8_khong_co";
const NOI_DUNG_ENV = [
  "# tệp env tạm của ca GL8 — không khoá thật nào",
  `DATABASE_URL_V3=${URL_SACH}      # ghi chú đuôi: không được lọt vào chuỗi nối`,
  "FASTLANE_TEMPLATES=0        # TAT 11/08 — câu mẫu giá/ship",
  "FASTLANE_INTRO=0            # tắt lời chào ảnh",
  "HUMAN_TAKEOVER=0   # tắt",
  'A="x # y"',
  "B=1#2",
  "V3_DIEN_TAP=1",
  "PANCAKE_READONLY=1",
  "",
].join("\n");

let TAM, TEP_ENV, MOC;
before(() => {
  TAM = fs.mkdtempSync(path.join(os.tmpdir(), "gl8-env-"));
  TEP_ENV = path.join(TAM, "env-tam");
  fs.writeFileSync(TEP_ENV, NOI_DUNG_ENV);
  fs.writeFileSync(path.join(TAM, "tin.json"), "[]");
  MOC = path.join(TAM, "moc-pg.mjs");
  // Móc: thay `pg.Pool` (cùng một đối tượng `module.exports` mà `import pg from "pg"` của công cụ nhận) — CHỈ chặn khi chuỗi nối là
  // của ca này (`gl8`), pool khác (nếu module nào dựng lúc nạp) đi qua nguyên vẹn.
  fs.writeFileSync(MOC, `
import { createRequire } from "node:module";
const pg = createRequire(${JSON.stringify(path.join(GOC, "package.json"))})("pg");
globalThis.fetch = async () => { throw new Error("GL8: ca đọc env cấm mạng"); };
const Goc = pg.Pool;
pg.Pool = function GL8Pool(o) {
  if (String(o?.connectionString || "").includes("gl8")) {
    const e = {}; for (const k of ["FASTLANE_TEMPLATES", "FASTLANE_INTRO", "HUMAN_TAKEOVER", "A", "B"]) e[k] = process.env[k] ?? null;
    process.stdout.write("\\nGL8-MOC " + JSON.stringify({ db: o.connectionString, env: e }) + "\\n");
    process.exit(0);
  }
  return new Goc(o);
};
`);
});
after(() => { if (TAM) fs.rmSync(TAM, { recursive: true, force: true }); });

/** Chạy một công cụ thật, trả `{ rc, moc, out }` — `moc` là JSON móc in ra (null nếu công cụ chết trước khi dựng pool). */
function chayCongCu(tep, args) {
  const r = spawnSync(process.execPath, ["--import", MOC, path.join(GOC, "ops/bin", tep), ...args], {
    cwd: GOC, encoding: "utf8", timeout: 60000,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, DEVENV: TEP_ENV, KHOA: "gl8-khoa-gia-khong-phai-khoa-that" },
  });
  const dong = String(r.stdout || "").split("\n").find((l) => l.startsWith("GL8-MOC "));
  return { rc: r.status, moc: dong ? JSON.parse(dong.slice(8)) : null, out: String(r.stdout || ""), err: String(r.stderr || "").slice(-600) };
}

test("GL8 E1 · tham chiếu: util.parseEnv đọc tệp env y như `node --env-file` (chú thích đuôi · nháy kép giữ # · `B=1#2`)", () => {
  const r = spawnSync(process.execPath, [`--env-file=${TEP_ENV}`, "-e",
    'console.log(JSON.stringify(["FASTLANE_TEMPLATES","A","B","DATABASE_URL_V3"].map(k=>process.env[k])))'],
  { encoding: "utf8", env: { PATH: process.env.PATH } });
  const thamChieu = JSON.parse(r.stdout);
  const e = parseEnv(fs.readFileSync(TEP_ENV, "utf8"));
  assert.deepEqual([e.FASTLANE_TEMPLATES, e.A, e.B, e.DATABASE_URL_V3], thamChieu);
  assert.deepEqual(thamChieu, ["0", "x # y", "1", URL_SACH], "hợp đồng ④5 phiếu GL8");
});

// [tệp, tham số, có chép env vào process.env không] — ba công cụ chỉ giữ `env` cục bộ (không chép), đo bằng chuỗi nối.
const CONG_CU = [
  ["gia-lap-mot-minh.mjs", ["--page", "gl8"], true],
  ["bao-cao-24h.mjs", ["--page", "gl8"], true],
  ["dich-ban-may.mjs", ["--page", "gl8"], true],
  ["dien-tap-hoi-thoai.mjs", ["--page", "gl8"], false],
  ["do-lop-0-dong.mjs", ["__TIN__", "gl8"], false],
  ["dem-token-kimi.mjs", ["--page", "gl8"], true],
  ["phat-lai-lich-su.mjs", ["--page", "gl8"], true],
  ["nap-khoa-nha.mjs", ["--nha", "kimi"], true],
  ["gia-lap-dong-thoi-gian.mjs", ["--page", "gl8"], false],
];
for (const [i, [tep, args, chep]] of CONG_CU.entries()) {
  const ma = `E2${"abcdefghi"[i]}`;
  test(`GL8 ${ma} · ${tep} đọc env như node --env-file — chuỗi nối không mang chú thích đuôi${chep ? " · FASTLANE_TEMPLATES/A/B vào process.env đúng" : ""}`, () => {
    const r = chayCongCu(tep, args.map((a) => (a === "__TIN__" ? path.join(TAM, "tin.json") : a)));
    assert.ok(r.moc, `công cụ không tới được bước dựng pool (rc=${r.rc}) — stderr: ${r.err}`);
    assert.equal(r.moc.db, URL_SACH, "chuỗi nối mang chú thích đuôi ⇒ bộ đọc env khác node --env-file");
    if (chep) assert.deepEqual(
      [r.moc.env.FASTLANE_TEMPLATES, r.moc.env.FASTLANE_INTRO, r.moc.env.HUMAN_TAKEOVER, r.moc.env.A, r.moc.env.B],
      ["0", "0", "0", "x # y", "1"],
    );
  });
}

test("GL8 E3 · gia-lap-mot-minh in MỘT dòng «cờ đã đọc» đủ 8 cờ, giá trị y như node --env-file đọc", () => {
  const r = chayCongCu("gia-lap-mot-minh.mjs", ["--page", "gl8"]);
  const dong = r.out.split("\n").filter((l) => l.includes("cờ đã đọc"));
  assert.equal(dong.length, 1, `không thấy đúng một dòng «cờ đã đọc» — stdout: ${r.out.slice(0, 400)}`);
  for (const k of ["FASTLANE", "FASTLANE_TEMPLATES", "FASTLANE_INTRO", "HUMAN_TAKEOVER", "V3_RAP_PROMPT_BAT", "PANCAKE_READONLY", "V3_PANCAKE_GUI", "V3_POS_GHI"]) {
    assert.match(dong[0], new RegExp(`\\b${k}=`), `dòng cờ thiếu ${k}`);
  }
  assert.match(dong[0], /FASTLANE_TEMPLATES="0"/);
  assert.match(dong[0], /PANCAKE_READONLY="1"/);
  assert.match(dong[0], /V3_PANCAKE_GUI=vắng/);
});
