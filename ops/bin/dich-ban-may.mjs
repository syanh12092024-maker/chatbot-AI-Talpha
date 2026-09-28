#!/usr/bin/env node
// DỊCH BẢN MÁY của kịch bản LIVE một page sang tiếng Anh gọn (BH8) — cho page đã có bản
// LIVE TRƯỚC khi màn Kịch bản biết dịch. Đi ĐÚNG đường màn đi: `dungBanChoMay` (khuôn tiếng
// Việt) → `dichBanMay` (dịch + kiểm giữ nguyên văn). Không tự dựng bản thứ hai.
//
// ⛔ Chỉ ghi `noi_dung_may` của đúng dòng LIVE; `noi_dung_nguoi` (chữ marketer) KHÔNG đụng.
//    Kiểm lệch ⇒ KHÔNG ghi gì, in lý do. Mặc định chạy khô; `--that` mới ghi.
// ⛔ Chỉ chạy trên PostgreSQL local (dev) — deploy lên máy chủ thì đi màn Kịch bản.
//
//   DEVENV=<.env> node ops/bin/dich-ban-may.mjs --page <page_id Facebook> [--that]
import fs from "node:fs";
import pg from "pg";

const arg = (t) => { const i = process.argv.indexOf(t); return i > 0 ? process.argv[i + 1] : ""; };
const pageIdFb = arg("--page");
const that = process.argv.includes("--that");
if (!pageIdFb || !process.env.DEVENV) {
  console.error("Dùng: DEVENV=<.env> node ops/bin/dich-ban-may.mjs --page <id> [--that]");
  process.exit(2);
}
const env = Object.fromEntries(fs.readFileSync(process.env.DEVENV, "utf8").split("\n")
  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
if (!/@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(env.DATABASE_URL_V3 || "")) { console.error("Chỉ chạy trên PostgreSQL local."); process.exit(2); }

const pool = new pg.Pool({ connectionString: env.DATABASE_URL_V3, max: 2 });
const { dungBanChoMay } = await import("../../db/di-tru/nguon.js");
const { dichBanMay, laBanMayEn } = await import("../../src/chat/dich-ban-may.js");
const { layModel } = await import("../../src/chat/model.js");

const { rows: [p] } = await pool.query("SELECT id, team_id, ten FROM page WHERE page_id=$1", [pageIdFb]);
if (!p) { console.error(`Không có page ${pageIdFb}.`); process.exit(1); }
const { rows: [kb] } = await pool.query(
  "SELECT id, phien_ban, noi_dung_nguoi, noi_dung_may FROM kich_ban WHERE page_id=$1 AND trang_thai='LIVE'", [p.id]);
if (!kb) { console.error(`Page ${p.ten} không có bản LIVE ở tầng page.`); process.exit(1); }

const vi = dungBanChoMay(kb.noi_dung_nguoi || {});
console.log(`page ${p.ten} · LIVE v${kb.phien_ban} · bản máy hiện ${laBanMayEn(kb.noi_dung_may) ? "TIẾNG ANH" : "khuôn tiếng Việt"} (${String(kb.noi_dung_may || "").length} ký tự)`);
// Dịch cả kịch bản ra ~1.000 token — quá trần 30s mặc định của `layModel` (đo 28/09: lỗi
// «fetch failed» ở 30s, lời gọi ngắn cùng khoá chạy 1s). Nới RIÊNG cho lời gọi dịch.
const { goiMotLan } = await import("../../v3/src/model/goi-mot-lan.js");
const md = await layModel(pool, { teamId: p.team_id }, { vaiTro: "chinh", goi: (o) => goiMotLan({ ...o, timeoutMs: 120000 }) });
const kq = await dichBanMay(vi, { goi: (req) => md.client.messages.create(req) });
if (kq.ngonNgu !== "en") {
  console.error(`⛔ KHÔNG ghi — ${kq.lyDo}`);
  await pool.end(); process.exit(1);
}
console.log(`\n── bản Việt (${vi.length} ký tự) ──\n${vi}\n\n── bản máy EN (${kq.text.length} ký tự) ──\n${kq.text}`);
if (that) {
  await pool.query("UPDATE kich_ban SET noi_dung_may=$1, sua_luc=now() WHERE id=$2 AND trang_thai='LIVE'", [kq.text, kb.id]);
  console.log(`\n✅ đã ghi noi_dung_may của kich_ban #${kb.id}`);
} else console.log("\n(chạy khô — thêm --that để ghi)");
await pool.end();
