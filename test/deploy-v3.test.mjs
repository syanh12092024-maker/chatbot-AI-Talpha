import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { checkConfig, inspectDatabase } from "../deploy/preflight.mjs";
import { dungSandbox } from "../db/sandbox.js";
const root = path.resolve(import.meta.dirname, "..");
const good = {
  DATABASE_URL_V3: "postgresql://user:private-password@127.0.0.1/database",
  V3_KHOA_VE: "s".repeat(32),
  V3_KHOA_MA_HOA: "c".repeat(64),
  ADMIN_USER: "admin",
  ADMIN_PASS: "test-secret",
  APP_SECRET: "meta-secret",
  VERIFY_TOKEN: "verify",
  ANTHROPIC_API_KEY: "llm-secret",
};
test("Deploy preflight validates config without returning secrets", () => {
  assert.deepEqual(checkConfig(good, "20.20.2").errors, []);
  for (const key of [
    "APP_SECRET",
    "DATABASE_URL_V3",
    "V3_KHOA_VE",
    "V3_KHOA_MA_HOA",
    "ADMIN_PASS",
  ]) {
    const result = checkConfig({ ...good, [key]: "" });
    assert.ok(result.errors.some((e) => e.includes(key)));
    assert.ok(!JSON.stringify(result).includes("private-password"));
  }
  assert.deepEqual(checkConfig({ ...good, META_WEBHOOK_OFF: "1", APP_SECRET: "", VERIFY_TOKEN: "" }).errors, []);
  assert.ok(checkConfig({ ...good, META_WEBHOOK_OFF: "0", APP_SECRET: "" }).errors.some(e => e.includes("APP_SECRET")));
  assert.ok(checkConfig(good, "18.20.0").errors.length);
  assert.ok(checkConfig({ ...good, PORT: "3102" }).errors.length);
  assert.ok(checkConfig({ ...good, V3_KHOA_MA_HOA: "bad" }).errors.length);
  assert.ok(
    checkConfig({ ...good, NODE_OPTIONS: "--env-file=.env" }).errors.length,
  );
});
function fixture({ fail = "", existing = "loaded" } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chatbot-deploy-"));
  const app = path.join(dir, "app"),
    bin = path.join(dir, "bin"),
    units = path.join(dir, "units"),
    log = path.join(dir, "commands");
  for (const d of [app, bin, units]) fs.mkdirSync(d);
  fs.writeFileSync(path.join(app, ".env"), "TEST_ONLY=1\n");
  fs.writeFileSync(path.join(app, "package-lock.json"), "{}");
  const body = `#!/bin/bash
name="\${0##*/}"
printf '%s %s\\n' "$name" "$*" >> "$DEPLOY_TEST_LOG"
if [[ "$name" == id ]]; then echo 0; exit 0; fi
if [[ "$name" == systemctl && "$*" == *DropInPaths* ]]; then exit 0; fi
if [[ "$name" == systemctl && "$1" == show ]]; then echo "$DEPLOY_TEST_EXISTING"; exit 0; fi
if [[ "$DEPLOY_TEST_FAIL" == migrate && "$*" == *db/migrate.js* ]]; then exit 1; fi
if [[ "$DEPLOY_TEST_FAIL" == backup && "$*" == *deploy/backup.mjs* ]]; then exit 1; fi
if [[ "$DEPLOY_TEST_FAIL" == preflight && "$*" == *deploy/preflight.mjs* ]]; then exit 1; fi
if [[ "$name" == node && "$*" == *console.log* ]]; then echo '3100 3102'; fi
exit 0
`;
  for (const cmd of [
    "node",
    "npm",
    "pg_dump",
    "pg_restore",
    "systemctl",
    "flock",
    "curl",
    "id",
  ]) {
    fs.writeFileSync(path.join(bin, cmd), body, { mode: 0o755 });
  }
  const env = {
    ...process.env,
    APP_DIR: app,
    PATH: bin + ":" + process.env.PATH,
    SYSTEMD_UNIT_DIR: units,
    DEPLOY_LOCK_FILE: path.join(dir, "lock"),
    BACKUP_DIR: path.join(dir, "backup"),
    DEPLOY_TEST_LOG: log,
    DEPLOY_TEST_FAIL: fail,
    DEPLOY_TEST_EXISTING: existing,
    DEPLOY_MODE: "configure",
  };
  return {
    dir,
    app,
    units,
    env,
    run: (mode) =>
      spawnSync("bash", [path.join(root, "deploy/setup.sh"), mode], {
        env,
        encoding: "utf8",
      }),
    logs: () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : ""),
    clean: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}
test("Deploy --check never installs, stops, migrates or restarts", () => {
  const f = fixture();
  try {
    const r = f.run("--check");
    assert.equal(r.status, 0, r.stderr);
    assert.ok(
      !/npm ci|systemctl stop|db\/migrate|systemctl restart/.test(f.logs()),
    );
    assert.equal(fs.readdirSync(f.units).length, 0);
  } finally {
    f.clean();
  }
});
test("Deploy rejects missing prerequisites before touching running services", () => {
  const f = fixture({ fail: "preflight" });
  try {
    assert.notEqual(f.run("--apply").status, 0);
    assert.ok(!f.logs().includes("systemctl stop"));
  } finally {
    f.clean();
  }
});
test("Deploy backs up before migrating and installs three units with shared env and closed writes", () => {
  const f = fixture();
  try {
    const r = f.run("--apply");
    assert.equal(r.status, 0, r.stderr);
    const log = f.logs();
    assert.ok(log.indexOf("deploy/backup.mjs") < log.indexOf("db/migrate.js"));
    assert.ok(log.indexOf("db/migrate.js") < log.indexOf("systemctl restart"));
    assert.equal(fs.readdirSync(f.units).length, 3);
    for (const file of fs.readdirSync(f.units)) {
      const s = fs.readFileSync(path.join(f.units, file), "utf8");
      assert.ok(s.includes(`--env-file=${f.app}/.env`));
      assert.ok(s.includes("Environment=PANCAKE_READONLY=1"));
      assert.ok(s.includes("Environment=V3_POS_GHI=0"));
      assert.ok(s.includes("Environment=V3_PAGE_XU_LY="));
      assert.ok(s.includes("TimeoutStopSec=120"));
    }
    assert.ok(
      fs
        .readFileSync(path.join(f.units, "aicloser.service"), "utf8")
        .includes("V3_LEGACY_POLL_OFF=1"),
    );
    assert.ok(!/git reset|git pull|git fetch/.test(log));
  } finally {
    f.clean();
  }
});
test("First deployment tolerates missing worker service", () => {
  const f = fixture({ existing: "not-found" });
  try {
    const r = f.run("--apply");
    assert.equal(r.status, 0, r.stderr);
    assert.ok(!f.logs().includes("systemctl stop"));
  } finally {
    f.clean();
  }
});
for (const fail of ["backup", "migrate"])
  test(`Deploy ${fail} failure never restarts potentially live old services`, () => {
    const f = fixture({ fail });
    try {
      const r = f.run("--apply");
      assert.notEqual(r.status, 0);
      assert.ok(!f.logs().includes("systemctl restart"));
      assert.ok(r.stdout.includes("giữ dừng"));
      if (fail === "backup") assert.ok(!f.logs().includes("db/migrate.js"));
    } finally {
      f.clean();
    }
  });
test("Real PostgreSQL preflight + backup produces a readable isolated archive", async () => {
  const sb = await dungSandbox("deploy_v3");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chatbot-backup-"));
  try {
    const info = await inspectDatabase(
      { ...good, DATABASE_URL_V3: sb.url },
      root,
    );
    assert.equal(info.pending.length, 0);
    // Đếm TỪ ĐĨA, không gõ số. Bản trước ghi cứng `17`: thêm một bản migrate là ca này đỏ
    // vì một lý do không liên quan gì tới việc nó đang đo (sao lưu đọc lại được hay không),
    // và người thêm phải đi sửa một con số ở file khác — đúng bẫy danh sách gõ tay #22.
    const soBanMigrate = fs
      .readdirSync(path.join(root, "db/migrate"))
      .filter((t) => t.endsWith(".up.sql")).length;
    assert.equal(info.applied, soBanMigrate);
    const pgBin =
      process.env.PG_BIN ||
      "/Applications/Postgres.app/Contents/Versions/latest/bin";
    const r = spawnSync(
      process.execPath,
      [path.join(root, "deploy/backup.mjs"), dir],
      {
        env: {
          ...process.env,
          DATABASE_URL_V3: sb.url,
          PATH: pgBin + ":" + process.env.PATH,
        },
        encoding: "utf8",
      },
    );
    assert.equal(r.status, 0, r.stderr);
    assert.ok(fs.statSync(path.join(dir, "database.dump")).size > 0);
    assert.equal(
      fs.statSync(path.join(dir, "database.dump")).mode & 0o777,
      0o600,
    );
    const dump = spawnSync(
      path.join(pgBin, "pg_restore"),
      ["--list", path.join(dir, "database.dump")],
      { encoding: "utf8" },
    );
    assert.equal(dump.status, 0);
    assert.ok(dump.stdout.includes("lan_gui"));
    assert.ok(dump.stdout.includes("hang_cho_tao_don"));
    const again = spawnSync(
      process.execPath,
      [path.join(root, "deploy/backup.mjs"), dir],
      { env: { ...process.env, DATABASE_URL_V3: sb.url }, encoding: "utf8" },
    );
    assert.notEqual(again.status, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    await sb.don();
  }
});
