// Credentials stay in the child environment, never in command arguments or logs.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const directory = process.argv[2];
if (!directory || !process.env.DATABASE_URL_V3)
  throw Error("Cần thư mục backup và DATABASE_URL_V3");
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const target = path.join(directory, "database.dump");
if (fs.existsSync(target)) throw Error("Backup đã tồn tại; không ghi đè");
// libpq does not expand a URI supplied through PGDATABASE. Split the URL into
// standard PG* variables so pg_dump connects to exactly the application database.
let url;
try {
  url = new URL(process.env.DATABASE_URL_V3);
} catch {
  throw Error("DATABASE_URL_V3 không hợp lệ");
}
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
  PGUSER: decodeURIComponent(url.username) || process.env.USER,
  PGPASSWORD: decodeURIComponent(url.password),
  PGCONNECT_TIMEOUT: "10",
};
const options = {
  sslmode: "PGSSLMODE",
  sslrootcert: "PGSSLROOTCERT",
  sslcert: "PGSSLCERT",
  sslkey: "PGSSLKEY",
  application_name: "PGAPPNAME",
  options: "PGOPTIONS",
  connect_timeout: "PGCONNECT_TIMEOUT",
};
for (const [name, value] of url.searchParams) {
  if (!options[name])
    throw Error("Tham số kết nối PostgreSQL chưa được hỗ trợ bởi backup");
  env[options[name]] = value;
}

const run = (binary, args) => {
  const result = spawnSync(binary, args, {
    env,
    stdio: ["ignore", "ignore", "pipe"],
    timeout: 300000,
  });
  if (result.status !== 0) {
    const detail = String(result.stderr || "");
    const reason =
      result.error?.code ||
      (detail.includes("server version mismatch")
        ? "server_version_mismatch"
        : detail.includes("Permission denied")
          ? "permission_denied"
          : detail.includes("Connection refused")
            ? "connection_refused"
            : detail.includes("password authentication failed")
              ? "authentication_failed"
              : `exit_${result.status}`);
    throw Error(`${binary} thất bại (${reason}); không tiếp tục migration`);
  }
};
try {
  run("pg_dump", ["--format=custom", "--file", target]);
  fs.chmodSync(target, 0o600);
  run("pg_restore", ["--list", target]);
} catch (e) {
  if (fs.existsSync(target)) fs.renameSync(target, target + ".incomplete");
  throw e;
}
console.log("Đã backup và đọc kiểm tra được archive PostgreSQL:", target);
