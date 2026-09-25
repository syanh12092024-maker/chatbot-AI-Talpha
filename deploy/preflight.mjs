import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function checkConfig(env, version = process.versions.node) {
  const errors = [];
  const [major, minor] = version.split(".").map(Number);
  if (major < 20 || (major === 20 && minor < 12))
    errors.push("Cần Node >=20.12 để cả ba tiến trình đọc cùng file .env");
  for (const k of [
    "DATABASE_URL_V3",
    "V3_KHOA_VE",
    "V3_KHOA_MA_HOA",
    "ADMIN_USER",
    "ADMIN_PASS",
    ...(env.META_WEBHOOK_OFF === "1" ? [] : ["APP_SECRET", "VERIFY_TOKEN"]),
  ])
    if (!env[k]?.trim()) errors.push(`Thiếu ${k}`);
  if (env.V3_KHOA_VE && env.V3_KHOA_VE.length < 32)
    errors.push("V3_KHOA_VE phải có ít nhất 32 ký tự");
  if (env.V3_KHOA_MA_HOA) {
    const k = env.V3_KHOA_MA_HOA;
    if (
      Buffer.from(k, /^[a-f\d]{64}$/i.test(k) ? "hex" : "base64").length !== 32
    )
      errors.push("V3_KHOA_MA_HOA phải giải mã thành 32 byte");
  }
  if (env.DATABASE_URL_V3) {
    try {
      const u = new URL(env.DATABASE_URL_V3);
      if (
        !["postgres:", "postgresql:"].includes(u.protocol) ||
        !u.hostname ||
        !u.pathname.slice(1)
      )
        throw Error();
    } catch {
      errors.push("DATABASE_URL_V3 không hợp lệ");
    }
  }
  if (
    !env[
      (env.AI_PROVIDER || "anthropic") === "kimi"
        ? "KIMI_API_KEY"
        : "ANTHROPIC_API_KEY"
    ]
  )
    errors.push("Thiếu API key của provider mặc định để server khởi động");
  const port = Number(env.PORT || 3100),
    uiPort = Number(env.CHAYTHAT_CONG || 3102);
  if (
    ![port, uiPort].every(
      (p) => Number.isInteger(p) && p >= 1024 && p <= 65535,
    ) ||
    port === uiPort
  )
    errors.push("PORT và CHAYTHAT_CONG phải khác nhau, từ 1024–65535");
  if (env.NODE_OPTIONS?.includes("--env-file"))
    errors.push(
      "Bỏ --env-file khỏi NODE_OPTIONS; systemd đã truyền ở ExecStart",
    );
  return {
    errors,
    port,
    uiPort,
    allowlist: (env.V3_PAGE_XU_LY || "").split(/[,\s]+/).filter(Boolean),
  };
}
export async function inspectDatabase(env, root) {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL_V3,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
    max: 1,
  });
  try {
    const info = (
      await pool.query(
        "SELECT current_database() AS database,current_setting('server_version') AS version",
      )
    ).rows[0];
    const exists = (
      await pool.query(
        "SELECT to_regclass('public._migrations') IS NOT NULL AS present",
      )
    ).rows[0].present;
    const applied = exists
      ? (await pool.query("SELECT ma FROM _migrations ORDER BY ma")).rows.map(
          (r) => r.ma,
        )
      : [];
    const available = fs
      .readdirSync(path.join(root, "db/migrate"))
      .filter((f) => f.endsWith(".up.sql"))
      .map((f) => f.slice(0, -7))
      .sort();
    const unknown = applied.filter((m) => !available.includes(m));
    if (unknown.length)
      throw Object.assign(
        new Error("Database mới hơn code: " + unknown.join(", ")),
        { safe: true },
      );
    const pages = (env.V3_PAGE_XU_LY || "").split(/[,\s]+/).filter(Boolean);
    const pageTable = (
      await pool.query(
        "SELECT to_regclass('public.page') IS NOT NULL AS present",
      )
    ).rows[0].present;
    const found = pageTable
      ? (
          await pool.query(
            "SELECT page_id FROM page WHERE page_id=ANY($1::text[])",
            [pages],
          )
        ).rows.map((r) => r.page_id)
      : [];
    return {
      ...info,
      applied: applied.length,
      pending: available.filter((m) => !applied.includes(m)),
      missingPages: pages.filter((p) => !found.includes(p)),
    };
  } finally {
    await pool.end();
  }
}
export async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const report = checkConfig(process.env);
  console.log(
    JSON.stringify(
      {
        node: process.versions.node,
        ports: [report.port, report.uiPort],
        configuredPages: report.allowlist.length,
        errors: report.errors,
      },
      null,
      2,
    ),
  );
  if (report.errors.length) {
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--config-only")) return;
  try {
    const db = await inspectDatabase(process.env, root);
    console.log(JSON.stringify(db, null, 2));
    if (
      db.missingPages.length ||
      (process.argv.includes("--ready") && db.pending.length)
    )
      process.exitCode = 1;
  } catch (e) {
    console.error(
      e.safe
        ? e.message
        : `Không kiểm tra được PostgreSQL (${e.code || e.name}); không in thông tin kết nối.`,
    );
    process.exitCode = 1;
  }
}
if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
)
  await main();
