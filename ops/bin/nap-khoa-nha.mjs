#!/usr/bin/env node
// NẠP KHOÁ API của một nhà model vào `khoa_nha` (cột mã hoá), và chọn model vai CHÍNH.
//
// ⛔ KHOÁ ĐỌC TỪ BIẾN MÔI TRƯỜNG, KHÔNG TỪ THAM SỐ DÒNG LỆNH. Tham số dòng lệnh nằm trong
//    `ps`, trong lịch sử shell, và trong bản ghi của mọi công cụ đang xem terminal này.
//    Một khoá API dán vào chỗ như vậy phải coi như đã lộ — đã xảy ra một lần trong dự án
//    này (khoá OpenAI dán trong hội thoại, sau đó bị nhà cung cấp vô hiệu hoá).
//
// Chạy:
//   KHOA='sk-...' DEVENV=<.env> node ops/bin/nap-khoa-nha.mjs --nha kimi --model kimi-k2.6
//
// `--model` (tuỳ chọn) đặt luôn model đó làm vai `chinh` của team.
import fs from "node:fs";
import pg from "pg";

const arg = (t, md = null) => { const i = process.argv.indexOf(t); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : md; };
const nha = arg("--nha");
const maModel = arg("--model");
const khoa = process.env.KHOA;
if (!nha || !process.env.DEVENV) {
  console.error("Dùng: KHOA='...' DEVENV=<.env> node ops/bin/nap-khoa-nha.mjs --nha <claude|kimi|openai|deepseek> [--model <mã>]");
  process.exit(2);
}
if (!khoa || khoa.trim().length < 8) {
  console.error("⛔ Thiếu biến môi trường KHOA (hoặc quá ngắn). Khoá KHÔNG truyền qua tham số dòng lệnh.");
  process.exit(2);
}
const env = Object.fromEntries(fs.readFileSync(process.env.DEVENV, "utf8").split("\n")
  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
if (!/@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(env.DATABASE_URL_V3 || "")) {
  console.error("Chỉ chạy trên PostgreSQL local."); process.exit(2);
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL_V3 });
const { MA: MA_NHA } = await import("../../v3/src/model/nha/index.js").then((m) => ({ MA: Object.keys(m.NHA) }));
if (!MA_NHA.includes(nha)) {
  console.error(`Nhà lạ "${nha}" — hệ chỉ có: ${MA_NHA.join(", ")}`);
  process.exit(2);
}
if (maModel) {
  const { MA_MODEL } = await import("../../v3/src/model/bang-model.js");
  if (!MA_MODEL.includes(maModel)) {
    console.error(`Model lạ "${maModel}" — bảng model có: ${MA_MODEL.join(", ")}`);
    process.exit(2);
  }
}

const { rows: [team] } = await pool.query("SELECT id, slug FROM team WHERE NOT la_ky_thuat ORDER BY id LIMIT 1");
const { ghiKhoaNha, docKhoaNha } = await import("../../db/khoa.js");
await ghiKhoaNha(pool, { teamSlug: team.slug, nhaCungCap: nha, khoaApi: khoa.trim() });
const lai = await docKhoaNha(pool, { teamId: team.id, nhaCungCap: nha });
console.log(`✔ nạp khoá nhà "${nha}" cho team ${team.slug} — đọc lại được ${lai ? `${lai.length} ký tự (${lai.slice(0, 6)}…)` : "KHÔNG ĐỌC ĐƯỢC"}`);

if (maModel) {
  await pool.query(
    `INSERT INTO cau_hinh_model (team_id, vai_tro, nha_cung_cap, ma_model, bat)
     VALUES ($1,'chinh',$2,$3,true)
     ON CONFLICT (team_id, vai_tro) DO UPDATE SET nha_cung_cap=EXCLUDED.nha_cung_cap,
       ma_model=EXCLUDED.ma_model, bat=true`,
    [team.id, nha, maModel]);
  const { rows } = await pool.query(
    "SELECT vai_tro, nha_cung_cap, ma_model, bat FROM cau_hinh_model WHERE team_id=$1 ORDER BY vai_tro", [team.id]);
  console.log("✔ cau_hinh_model:");
  for (const r of rows) console.log(`    ${r.vai_tro.padEnd(9)} ${r.nha_cung_cap}/${r.ma_model}${r.bat ? "" : " (TẮT)"}`);

  // DỰ PHÒNG CÙNG NHÀ = KHÔNG CÓ DỰ PHÒNG. Đổi vai `chinh` sang nhà X mà vai `du_phong`
  // vốn cũng là X thì nhà đó chết là chết cả hai — đúng thứ vai dự phòng sinh ra để tránh.
  // Đã xảy ra 21/09 khi đổi vai chính sang kimi trong lúc dự phòng cũng đang là kimi.
  const chinh = rows.find((r) => r.vai_tro === "chinh");
  const duPhong = rows.find((r) => r.vai_tro === "du_phong" && r.bat);
  if (chinh && duPhong && chinh.nha_cung_cap === duPhong.nha_cung_cap) {
    console.log(`\n⚠️  DỰ PHÒNG CÙNG NHÀ với vai chính ("${chinh.nha_cung_cap}") — nhà đó chết là chết cả hai.`);
    console.log(`    Đổi vai dự phòng sang nhà khác trước khi chạy thật.`);
  }
}
await pool.end();
