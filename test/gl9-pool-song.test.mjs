// GL9 ④1 — POOL CSDL KHÔNG GIẾT TIẾN TRÌNH khi Postgres cắt kết nối (57P01 — đo thật 10/10 trên prod: `unattended-upgrade` dừng
// postgresql ⇒ `Unhandled 'error' event` ⇒ worker thoát 1).
//   · P1a client RỖI trong pool bị giết       ⇒ pg-pool phát 'error' trên POOL   (cần `pool.on('error')`)
//   · P1b client ĐANG MƯỢN (BEGIN, giữa hai truy vấn — đúng trạng thái worker chờ model) bị giết
//                                              ⇒ pg phát 'error' trên CLIENT (pg-pool gỡ idleListener lúc cho mượn — cần người nghe trên từng client)
//   · P1c worker THẬT (`src/queue/chay-worker.js`, 0 page, van đóng, mạng bị bẫy) — giết mọi kết nối của nó ⇒ còn sống, còn quay vòng
//   · P0  cho-qua: không ai bị giết ⇒ không một dòng log lỗi pg (người nghe không ồn)
// Mỗi ca là MỘT TIẾN TRÌNH CON mới (`process.execPath`), đo rc + dòng in; tiến trình test không bao giờ bị giết theo.
// Postgres HỘP CÁT riêng (`aicloser_v3_test_gl9p_p<pid>` trần · `aicloser_v3_test_gl9w_p<pid>` có lược đồ cho worker), tự dựng tự dọn.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dungSandbox } from "../db/sandbox.js";

const GOC = fileURLToPath(new URL("..", import.meta.url));
const KET_NOI = new URL("../db/ket-noi.js", import.meta.url).href;
let sbTran, sbWorker;
before(async () => {
  sbTran = await dungSandbox("gl9p", { migrate: false });
  console.log(`   [gl9p] hộp cát ${sbTran.ten} · tệp đo ${fileURLToPath(KET_NOI)} · node ${process.version}`);
});
after(async () => { if (sbTran) await sbTran.don(); if (sbWorker) await sbWorker.don(); });

// Kịch bản con — `taoPool` của CÂY ĐANG ĐO, pg lấy qua createRequire từ chính tệp đó (không lẫn cây chính).
const KICH_BAN = String.raw`
import { createRequire } from "node:module";
const { taoPool } = await import(process.env.KET_NOI);
const pg = createRequire(process.env.KET_NOI)("pg");
const url = process.env.DATABASE_URL_V3, kieu = process.env.KIEU;
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
const pool = taoPool(url);
const admin = new pg.Client({ connectionString: url }); await admin.connect();
const giet = async (pid) => (await admin.query("SELECT pg_terminate_backend($1) AS ok", [pid])).rows[0].ok;
if (kieu === "roi") {
  const c = await pool.connect(); const pid = (await c.query("SELECT pg_backend_pid() AS p")).rows[0].p; c.release();
  console.log("GIET=" + await giet(pid));
  await ngu(1000); console.log("SONG");
} else if (kieu === "muon") {
  const c = await pool.connect(); await c.query("BEGIN"); const pid = (await c.query("SELECT pg_backend_pid() AS p")).rows[0].p;
  console.log("GIET=" + await giet(pid));
  await ngu(1000); console.log("SONG");
  const ke = await Promise.race([c.query("SELECT 1").then(() => "CHAY", (e) => "REJECT " + e.message), ngu(3000).then(() => "TREO")]);
  console.log("TRUY_VAN_KE=" + ke);
  c.release();
} else {
  const c = await pool.connect(); await c.query("SELECT 1"); c.release(); await ngu(300); console.log("SONG");
}
console.log("SELECT1=" + (await pool.query("SELECT 1 AS x")).rows[0].x);
await admin.end(); await pool.end(); console.log("XONG");
`;

function chayCon(kieu) {
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", KICH_BAN], {
    cwd: os.tmpdir(), encoding: "utf8", timeout: 30_000,
    env: { PATH: process.env.PATH, KET_NOI, KIEU: kieu, DATABASE_URL_V3: sbTran.url },
  });
  const ra = `${r.stdout || ""}\n${r.stderr || ""}`;
  return { rc: r.status, ra, dongPg: ra.split("\n").filter((d) => /57P01/.test(d)) };
}
const tomTat = (ra) => ra.split("\n").filter((d) => /Emitted|Unhandled|SONG|SELECT1|TRUY_VAN_KE|57P01|Error/.test(d)).slice(0, 8).join(" | ");

test("GL9 P1a · client RỖI bị pg_terminate_backend ⇒ tiến trình SỐNG (rc=0), SELECT 1 sau đó = 1, log có 57P01, không in chuỗi nối", () => {
  const { rc, ra, dongPg } = chayCon("roi");
  console.log(`   [gl9p] P1a rc=${rc} · dòng 57P01=${dongPg.length} · ${tomTat(ra)}`);
  assert.equal(rc, 0, `tiến trình chết: ${tomTat(ra)}`);
  assert.match(ra, /GIET=true/);
  assert.match(ra, /^SONG$/m);
  assert.match(ra, /^SELECT1=1$/m);
  assert.ok(dongPg.length >= 1, "người nghe phải GHI LOG mã lỗi pg (57P01)");
  assert.ok(!ra.includes(sbTran.url) && !/postgres(ql)?:\/\//.test(ra), "log in ra chuỗi nối CSDL");
});

test("GL9 P1b · client ĐANG MƯỢN (BEGIN, chưa release) bị giết ⇒ SỐNG, truy vấn kế REJECT (không treo), release rồi SELECT 1 = 1", () => {
  const { rc, ra, dongPg } = chayCon("muon");
  console.log(`   [gl9p] P1b rc=${rc} · dòng 57P01=${dongPg.length} · ${tomTat(ra)}`);
  assert.equal(rc, 0, `tiến trình chết: ${tomTat(ra)}`);
  assert.match(ra, /^SONG$/m);
  assert.match(ra, /^TRUY_VAN_KE=REJECT /m, "truy vấn trên client đã chết phải bị TỪ CHỐI, không treo, không chạy");
  assert.match(ra, /^SELECT1=1$/m);
  assert.ok(dongPg.length >= 1, "người nghe trên client phải GHI LOG 57P01");
  assert.ok(!/postgres(ql)?:\/\//.test(ra), "log in ra chuỗi nối CSDL");
});

test("GL9 P0 · cho-qua: không ai bị giết ⇒ rc=0, không một dòng log lỗi pg", () => {
  const { rc, ra } = chayCon("lanh");
  assert.equal(rc, 0, tomTat(ra));
  assert.match(ra, /^SELECT1=1$/m);
  assert.doesNotMatch(ra, /\[pg\]/, "người nghe ghi log khi không có lỗi");
});

// ═══ P1c — worker THẬT. Bẫy mạng: `fetch` + `https.request` ném (khởi động lõi gọi Pancake/Sheet để đọc — ca này không được chạm).
// cwd TẠM (không .env ⇒ `dotenv/config` không nạp token), env tối thiểu, van đóng (PANCAKE_READONLY=1, không V3_NAP_DEV) ⇒ 0 tin, 0 gửi.
// Giết theo `application_name` (PGAPPNAME) — đúng MỌI kết nối của worker, không đụng pool của tiến trình test.
const BAY_MANG = "data:text/javascript," + encodeURIComponent(`
import https from "node:https"; import http from "node:http";
let n = 0; const chan = (k) => (...a) => { n++; process.stderr.write("[bẫy-mạng] chặn " + k + "\\n"); throw new Error("GL9 P1c: mạng bị chặn"); };
globalThis.fetch = async () => chan("fetch")();
https.request = chan("https.request"); https.get = chan("https.get"); http.request = chan("http.request"); http.get = chan("http.get");
process.on("exit", () => process.stderr.write("[bẫy-mạng] tổng chặn " + n + "\\n"));
`);

test("GL9 P1c · worker THẬT (chay-worker.js, 0 page, van đóng): giết mọi kết nối của nó ⇒ còn sống sau 3 s, còn in dòng lượt, log 57P01", async () => {
  sbWorker = await dungSandbox("gl9w");
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "gl9w-"));
  const ten = `gl9w_${process.pid}`;
  const con = spawn(process.execPath, ["--import", new URL("./_an-toan.mjs", import.meta.url).href, "--import", BAY_MANG,
    path.join(GOC, "src/queue/chay-worker.js")], {
    cwd, env: { PATH: process.env.PATH, HOME: cwd, DATABASE_URL_V3: sbWorker.url, PANCAKE_READONLY: "1", V3_WORKER_NHIP_MS: "300", PGAPPNAME: ten },
  });
  let ra = "";
  con.stdout.on("data", (b) => { ra += b; });
  con.stderr.on("data", (b) => { ra += b; });
  const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
  const dongLuot = () => ra.split("\n").filter((d) => d.startsWith("[worker-v3] nạp:")).length;
  try {
    for (let i = 0; i < 120 && !(/\[worker-v3\] khởi động/.test(ra) && dongLuot() >= 2); i++) { if (con.exitCode != null) break; await ngu(250); }
    assert.ok(/\[worker-v3\] khởi động/.test(ra) && dongLuot() >= 2, `worker không khởi động / không quay vòng: ${ra.slice(-600)}`);
    const giet = await sbWorker.pool.query(
      "SELECT count(*) FILTER (WHERE pg_terminate_backend(pid))::int AS n FROM pg_stat_activity WHERE datname = current_database() AND application_name = $1", [ten]);
    const truoc = dongLuot();
    await ngu(3000);
    const sau = dongLuot();
    console.log(`   [gl9w] P1c giết ${giet.rows[0].n} kết nối · exitCode=${con.exitCode} · dòng lượt ${truoc}→${sau} · dòng 57P01=${(ra.match(/57P01/g) || []).length} · ${ra.split("\n").filter((d) => /bẫy-mạng\] chặn|Emitted|Unhandled/.test(d)).slice(0, 3).join(" | ")}`);
    assert.ok(giet.rows[0].n >= 1, "không giết được kết nối nào của worker — ca không đo gì");
    assert.equal(con.exitCode, null, `worker CHẾT sau khi kết nối bị giết: ${ra.split("\n").filter((d) => /Emitted|Unhandled|error/i.test(d)).slice(0, 4).join(" | ")}`);
    assert.ok(sau > truoc, `worker còn sống nhưng KHÔNG quay vòng nữa (${truoc}→${sau})`);
    assert.match(ra, /57P01/);
  } finally {
    if (con.exitCode == null) { con.kill("SIGTERM"); for (let i = 0; i < 40 && con.exitCode == null; i++) await ngu(100); if (con.exitCode == null) con.kill("SIGKILL"); }
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
