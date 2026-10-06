// PHIẾU GL2 ④6 — deploy biết trần page bật bot: `preflight --ready` chặn khi số page bật > trần; `setup.sh` chế độ pilot
// đòi `V3_TRAN_PAGE_BAT=1`.
// CLI THẬT (không node giả cho phép đo): preflight chạy trên hộp cát Postgres; setup.sh chạy với shim cho công cụ hệ thống
// (systemctl/pg_dump/… không có trên máy dev) nhưng câu kiểm pilot `node --input-type=module -e` đi NODE THẬT.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { dungSandbox } from "../db/sandbox.js";

const root = path.resolve(import.meta.dirname, "..");
const cfg = {
  V3_KHOA_VE: "s".repeat(32),
  V3_KHOA_MA_HOA: "c".repeat(64),
  APP_SECRET: "meta-secret",
  VERIFY_TOKEN: "verify",
  ANTHROPIC_API_KEY: "llm-secret",
};
function cli(url, tran, ...args) {
  const env = { PATH: process.env.PATH, ...cfg, DATABASE_URL_V3: url, ...(tran === undefined ? {} : { V3_TRAN_PAGE_BAT: tran }) };
  const r = spawnSync(process.execPath, [path.join(root, "deploy/preflight.mjs"), ...args], { env, encoding: "utf8", timeout: 60000 });
  return { rc: r.status, out: r.stdout, err: r.stderr, all: r.stdout + r.stderr };
}
const jsonDau = (out) => JSON.parse(out.slice(0, out.indexOf("\n}") + 2));

test("GL2 P6a · preflight --ready: 2 page bật, trần 1 ⇒ exit 1 (câu có số đo); trần 2 ⇒ 0; không --ready ⇒ 0; JSON in tranPageBat", async () => {
  const sb = await dungSandbox("gl2_pf");
  try {
    const team = (await sb.pool.query("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id;
    await sb.pool.query(
      "INSERT INTO page (team_id, page_id, ten, bot_ai_bat) VALUES ($1,'973000000001','P1',true), ($1,'973000000002','P2',true), ($1,'973000000003','P3',false)",
      [team],
    );
    const r1 = cli(sb.url, "1", "--ready");
    assert.equal(r1.rc, 1, `vượt trần mà preflight --ready vẫn đạt: ${r1.all}`);
    assert.match(r1.all, /đang bật 2\/1 page/);
    assert.match(r1.all, /V3_TRAN_PAGE_BAT=1/);
    assert.equal(jsonDau(r1.out).tranPageBat, 1, "JSON đầu phải in trần đọc được");
    const r2 = cli(sb.url, "2", "--ready");
    assert.equal(r2.rc, 0, `trong trần mà preflight --ready đỏ: ${r2.all}`);
    assert.equal(jsonDau(r2.out).tranPageBat, 2);
    assert.equal(cli(sb.url, "1").rc, 0, "không --ready ⇒ chỉ IN, không chặn");
    const r3 = cli(sb.url, "1", "--tran");
    assert.equal(r3.rc, 1, `--tran (bước đọc-thuần đầu setup.sh) phải chặn khi vượt: ${r3.all}`);
    assert.match(r3.all, /đang bật 2\/1 page/);
    assert.equal(cli(sb.url, "2", "--tran").rc, 0, "--tran trong trần ⇒ 0");
    const r4 = cli(sb.url, undefined, "--ready");
    assert.equal(r4.rc, 1, "vắng biến = trần 0 ⇒ 2 page bật là vượt");
    assert.match(r4.all, /0 — chưa đặt/);
  } finally { await sb.don(); }
});

function fixture(dong, { preflight = "// preflight GIẢ của ca GL2 P6b — phép đo nằm ở câu kiểm pilot\n" } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gl2-setup-"));
  const app = path.join(dir, "app"); const bin = path.join(dir, "bin");
  for (const d of [app, bin, path.join(app, "deploy")]) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(app, ".env"), dong.join("\n") + "\n");
  fs.writeFileSync(path.join(app, "package-lock.json"), "{}");
  fs.writeFileSync(path.join(app, "deploy/preflight.mjs"), preflight);
  // Câu kiểm pilot đọc trần qua hàm CHUNG `src/queue/page-routing.js#tranPageBat` của cây được deploy — chép đúng tệp đó.
  fs.mkdirSync(path.join(app, "src/queue"), { recursive: true });
  fs.copyFileSync(path.join(root, "src/queue/page-routing.js"), path.join(app, "src/queue/page-routing.js"));
  const log = path.join(dir, "lenh");
  const gia = `#!/bin/bash\nprintf '%s %s\\n' "\${0##*/}" "$*" >> "${log}"\nif [[ "\${0##*/}" == id ]]; then echo 0; exit 0; fi\n`
    + `if [[ "\${0##*/}" == systemctl && "$*" == *DropInPaths* ]]; then exit 0; fi\nexit 0\n`;
  for (const c of ["npm", "pg_dump", "pg_restore", "systemctl", "flock", "curl", "id"]) fs.writeFileSync(path.join(bin, c), gia, { mode: 0o755 });
  // node: câu kiểm pilot (`--input-type=module`) đi NODE THẬT; lời gọi preflight trỏ tệp giả ở trên (cũng node thật).
  fs.writeFileSync(path.join(bin, "node"), `#!/bin/bash\nexec "${process.execPath}" "$@"\n`, { mode: 0o755 });
  return {
    run: (mode, lenh = "--check") => spawnSync("bash", [path.join(root, "deploy/setup.sh"), lenh], {
      env: {
        PATH: `${bin}:${process.env.PATH}`, APP_DIR: app, DEPLOY_MODE: mode, HOME: process.env.HOME,
        SYSTEMD_UNIT_DIR: path.join(dir, "units"), DEPLOY_LOCK_FILE: path.join(dir, "khoa"), BACKUP_DIR: path.join(dir, "sao-luu"),
      },
      encoding: "utf8",
    }),
    lenh: () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : ""),
    clean: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

test("GL2 P6b · setup.sh pilot: thiếu / =2 / =abc ⇒ DỪNG câu rõ · =1 ⇒ «Preflight đạt» · configure không đòi", () => {
  const VAN = ["V3_PANCAKE_GUI=1", "V3_RAP_PROMPT_BAT=1", "PANCAKE_READONLY=0"];
  for (const [ten, them] of [["thiếu", []], ["=2", ["V3_TRAN_PAGE_BAT=2"]], ["=abc", ["V3_TRAN_PAGE_BAT=abc"]], ["=0", ["V3_TRAN_PAGE_BAT=0"]]]) {
    const f = fixture([...VAN, ...them]);
    try {
      const r = f.run("pilot");
      assert.notEqual(r.status, 0, `pilot với V3_TRAN_PAGE_BAT ${ten} mà vẫn đạt: ${r.stdout}${r.stderr}`);
      assert.match(r.stdout + r.stderr, /V3_TRAN_PAGE_BAT=1/, `câu dừng phải nói rõ biến cần đặt (${ten})`);
      assert.doesNotMatch(r.stdout, /Preflight đạt/);
    } finally { f.clean(); }
  }
  const ok = fixture([...VAN, "V3_TRAN_PAGE_BAT=1"]);
  try {
    const r = ok.run("pilot");
    assert.equal(r.status, 0, `pilot đủ điều kiện mà dừng: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, /Preflight đạt/);
  } finally { ok.clean(); }
  const cf = fixture(["PANCAKE_READONLY=1"]);
  try { assert.equal(cf.run("configure").status, 0, "chế độ configure không đòi trần"); } finally { cf.clean(); }
});

test("GL2 P6c · setup.sh --apply: vượt trần ⇒ DỪNG ở bước đọc-thuần đầu (preflight --tran), TRƯỚC khi dừng dịch vụ / npm ci / migrate", () => {
  // preflight GIẢ: chặn đúng khi được gọi với --tran (bản thật: ca P6a). Đo THỨ TỰ của setup.sh, không đo preflight.
  const f = fixture(["PANCAKE_READONLY=1"], {
    preflight: 'if (process.argv.includes("--tran")) { console.error("Vượt trần (giả): đang bật 2/1 page"); process.exit(1); }\n',
  });
  try {
    const r = f.run("configure", "--apply");
    assert.notEqual(r.status, 0, `vượt trần mà --apply vẫn chạy tiếp: ${r.stdout}${r.stderr}`);
    const lenh = f.lenh();
    assert.doesNotMatch(lenh, /systemctl stop|npm ci|systemctl restart/, `đã đụng dịch vụ trước khi dừng: ${lenh}`);
    assert.match(r.stderr, /Vượt trần/);
  } finally { f.clean(); }
});
