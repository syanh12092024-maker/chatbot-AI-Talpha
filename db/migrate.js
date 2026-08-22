#!/usr/bin/env node
// Runner migration của nền v3.
//
//   node db/migrate.js            → up: áp mọi bản .up.sql chưa áp (npm run migrate)
//   node db/migrate.js down       → gỡ bản mới nhất đã áp
//   node db/migrate.js down --het → gỡ HẾT, ngược thứ tự
//   node db/migrate.js trang-thai → in danh sách bản + đã áp chưa
//   node db/migrate.js schema     → sinh lại db/schema.sql từ các bản .up.sql
//
// LUẬT: `db/schema.sql` là bản HỢP NHẤT SINH RA từ thư mục migrate/, không phải
// bản chép tay thứ hai. Hai nguồn một lược đồ là cách rẻ nhất để chúng trôi khỏi
// nhau; cổng nghiệm thu sinh lại rồi diff, lệch là đỏ.
import fs from "node:fs";
import path from "node:path";
import { GOC, voiPool } from "./ket-noi.js";

const THU_MUC = path.join(GOC, "db", "migrate");
const SCHEMA = path.join(GOC, "db", "schema.sql");

export function danhSachBan() {
  return fs
    .readdirSync(THU_MUC)
    .filter((f) => f.endsWith(".up.sql"))
    .map((f) => f.replace(/\.up\.sql$/, ""))
    .sort();
}

function docBan(ma, chieu) {
  return fs.readFileSync(path.join(THU_MUC, `${ma}.${chieu}.sql`), "utf8");
}

async function baoDamBangSo(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      ma      text        PRIMARY KEY,
      ap_luc  timestamptz NOT NULL DEFAULT now()
    )`);
}

export async function daAp(pool) {
  await baoDamBangSo(pool);
  const r = await pool.query("SELECT ma FROM _migrations ORDER BY ma");
  return r.rows.map((x) => x.ma);
}

export async function len(pool, { im = false } = {}) {
  const xong = new Set(await daAp(pool));
  const canAp = danhSachBan().filter((m) => !xong.has(m));
  for (const ma of canAp) {
    const khach = await pool.connect();
    try {
      await khach.query("BEGIN");
      await khach.query(docBan(ma, "up"));
      await khach.query("INSERT INTO _migrations (ma) VALUES ($1)", [ma]);
      await khach.query("COMMIT");
      if (!im) console.log(`[migrate] ÁP  ${ma}`);
    } catch (e) {
      await khach.query("ROLLBACK");
      throw new Error(`[migrate] ${ma} hỏng: ${e.message}`);
    } finally {
      khach.release();
    }
  }
  if (!im)
    console.log(
      `[migrate] áp mới: ${canAp.length} · tổng đã áp: ${xong.size + canAp.length}`,
    );
  return canAp;
}

export async function xuong(pool, { het = false, im = false } = {}) {
  const xong = await daAp(pool);
  const canGo = het ? [...xong].reverse() : xong.slice(-1);
  for (const ma of canGo) {
    const khach = await pool.connect();
    try {
      await khach.query("BEGIN");
      await khach.query(docBan(ma, "down"));
      await khach.query("DELETE FROM _migrations WHERE ma = $1", [ma]);
      await khach.query("COMMIT");
      if (!im) console.log(`[migrate] GỠ  ${ma}`);
    } catch (e) {
      await khach.query("ROLLBACK");
      throw new Error(`[migrate] gỡ ${ma} hỏng: ${e.message}`);
    } finally {
      khach.release();
    }
  }
  return canGo;
}

export function sinhSchema() {
  const dau = [
    "-- ═══════════════════════════════════════════════════════════════════════════",
    "-- db/schema.sql — LƯỢC ĐỒ HỢP NHẤT của nền v3.",
    "-- ⛔ SINH RA từ db/migrate/*.up.sql bằng `node db/migrate.js schema`. CẤM SỬA TAY:",
    "--    sửa ở đây thì CSDL thật không đổi, và hai bản sẽ trôi khỏi nhau trong im lặng.",
    "--    Muốn đổi lược đồ → thêm một bản migrate mới rồi sinh lại file này.",
    "-- ═══════════════════════════════════════════════════════════════════════════",
    "",
  ].join("\n");
  const than = danhSachBan()
    .map(
      (ma) =>
        `-- ─── ${ma} ───────────────────────────────────────────────────────\n\n${docBan(ma, "up").trimEnd()}\n`,
    )
    .join("\n");
  return `${dau}\n${than}`;
}

async function main() {
  const lenh = process.argv[2] || "up";
  const co = new Set(process.argv.slice(3));
  if (lenh === "schema") {
    fs.writeFileSync(SCHEMA, sinhSchema());
    console.log(
      `[migrate] đã sinh ${path.relative(GOC, SCHEMA)} từ ${danhSachBan().length} bản`,
    );
    return;
  }
  await voiPool(async (pool) => {
    if (lenh === "up") await len(pool);
    else if (lenh === "down") await xuong(pool, { het: co.has("--het") });
    else if (lenh === "trang-thai") {
      const xong = new Set(await daAp(pool));
      for (const ma of danhSachBan())
        console.log(`${xong.has(ma) ? "✔ đã áp " : "· chưa áp"}  ${ma}`);
    } else throw new Error(`lệnh lạ: ${lenh}`);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
