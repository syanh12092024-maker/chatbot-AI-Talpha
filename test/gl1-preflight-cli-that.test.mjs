// GL1 — chạy CLI THẬT `node deploy/preflight.mjs` (không node giả) trên Postgres hộp cát.
// Án lệ: preflight đọc `db.missingPages.length` (khái niệm đã gỡ) ⇒ TypeError ⇒ exit 1 mọi lượt, mà bộ ca cũ xanh vì
// đặt `node` GIẢ lên PATH và gọi thẳng inspectDatabase, không ai chạy main().
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { dungSandbox } from "../db/sandbox.js";

const root = path.resolve(import.meta.dirname, "..");
const MAT_KHAU = "mat-khau-rieng-GL1";
const cfg = {
  V3_KHOA_VE: "s".repeat(32),
  V3_KHOA_MA_HOA: "c".repeat(64),
  APP_SECRET: "meta-secret",
  VERIFY_TOKEN: "verify",
  ANTHROPIC_API_KEY: "llm-secret",
};
function cli(url, ...args) {
  const env = { PATH: process.env.PATH, ...cfg, DATABASE_URL_V3: url };
  const r = spawnSync(process.execPath, [path.join(root, "deploy/preflight.mjs"), ...args], { env, encoding: "utf8", timeout: 60000 });
  return { rc: r.status, out: r.stdout, err: r.stderr, all: r.stdout + r.stderr };
}
const jsonCuoi = (out) => JSON.parse(out.slice(out.lastIndexOf("\n{") + 1));
const URL_SAI = `postgresql://nguoi:${MAT_KHAU}@127.0.0.1:1/csdl_khong_co`;

test("GL1 (a) CSDL đủ migration ⇒ exit 0, JSON có applied + pagesBotBat", async () => {
  const sb = await dungSandbox("gl1_a");
  try {
    const r = cli(sb.url);
    assert.equal(r.rc, 0, r.all);
    const j = jsonCuoi(r.out);
    assert.ok(j.applied > 0);
    assert.equal(j.pagesBotBat, 0);
    assert.deepEqual(j.pending, []);
    assert.equal(cli(sb.url, "--ready").rc, 0);
  } finally { await sb.don(); }
});
test("GL1 (b) --ready khi còn migration chưa áp ⇒ exit 1 (không --ready thì exit 0)", async () => {
  const sb = await dungSandbox("gl1_b", { migrate: false });
  try {
    const r = cli(sb.url, "--ready");
    assert.equal(r.rc, 1, r.all);
    assert.ok(jsonCuoi(r.out).pending.length > 0);
    assert.equal(cli(sb.url).rc, 0);
  } finally { await sb.don(); }
});
test("GL1 (c) URL CSDL sai ⇒ exit 1, không in chuỗi nối", () => {
  const r = cli(URL_SAI);
  assert.equal(r.rc, 1, r.all);
  assert.match(r.all, /Không kiểm tra được PostgreSQL/);
  for (const bi of [MAT_KHAU, "postgresql://", "127.0.0.1:1"]) assert.ok(!r.all.includes(bi), `lộ ${bi}`);
});
test("GL1 (d) --config-only không chạm CSDL (URL sai vẫn exit 0, không có applied)", () => {
  const r = cli(URL_SAI, "--config-only");
  assert.equal(r.rc, 0, r.all);
  assert.ok(!/applied|pagesBotBat|Không kiểm tra/.test(r.all));
});
