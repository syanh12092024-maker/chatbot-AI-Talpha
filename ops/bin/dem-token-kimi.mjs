#!/usr/bin/env node
// ĐẾM TOKEN THẬT từng khối prompt bằng chính Kimi (BH8) — `max_tokens:1`, đọc `usage`.
//
// Vì sao không ước: `estimateTokens` (ký tự/3,3) đo 28/09 lệch 1,9× với tiếng Việt — CORE
// ước 2.315, Kimi đếm 4.331. Quyết định tối ưu tiền trên số ước là quyết trên số sai.
//
// Mỗi phép đếm là một lời gọi thật (~vài nghìn token vào). Tổng in ra đầu; `--toi-da` chặn
// số lời gọi (mặc định 6). Gặp lỗi hạn mức ngày (TPD) ⇒ dừng ngay.
//
//   DEVENV=<.env> node ops/bin/dem-token-kimi.mjs --page <page_id Facebook> [--toi-da 6]
import fs from "node:fs";
import pg from "pg";

const arg = (t, md) => { const i = process.argv.indexOf(t); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : md; };
const pageIdFb = arg("--page", "");
const toiDa = Number(arg("--toi-da", "6"));
if (!pageIdFb || !process.env.DEVENV) { console.error("Dùng: DEVENV=<.env> node ops/bin/dem-token-kimi.mjs --page <id>"); process.exit(2); }
const env = Object.fromEntries(fs.readFileSync(process.env.DEVENV, "utf8").split("\n")
  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;

const pool = new pg.Pool({ connectionString: env.DATABASE_URL_V3, max: 2 });
const { rows: [p] } = await pool.query("SELECT team_id FROM page WHERE page_id=$1", [pageIdFb]);
if (!p) { console.error(`Không có page ${pageIdFb}.`); process.exit(1); }
const { rapKb } = await import("../../src/chat/rap-prompt.js");
const { buildSystem, CORE_VI } = await import("../../src/prompts.js");
const { toolDefs } = await import("../../src/tools.js");
const { sanitizeSystem } = await import("../../src/text.js");
const { layModel } = await import("../../src/chat/model.js");
const kb = await rapKb(pool, { teamId: p.team_id, pageIdText: pageIdFb });
const sys = sanitizeSystem(buildSystem(kb));
const md = await layModel(pool, { teamId: p.team_id }, { vaiTro: "chinh" });

let goi = 0;
async function dem(system, tools) {
  if (goi >= toiDa) throw new Error(`đã chạm --toi-da ${toiDa} lời gọi`);
  goi += 1;
  // Moonshot: 3 lời gọi/phút cho tài khoản này, và vượt nhịp thì nó CẮT kết nối («fetch
  // failed», không phải 429 — đo 28/09). Nghỉ TRƯỚC mỗi lời gọi; lỗi mạng thì thử lại 2 lần.
  for (let lan = 0; ; lan++) {
    await new Promise((ok) => setTimeout(ok, 21000 * (lan + 1)));
    try {
      const r = await md.client.messages.create({ max_tokens: 1, system, ...(tools ? { tools } : {}), messages: [{ role: "user", content: "hi" }] });
      const u = r.usage || {};
      return (u.input_tokens || 0) + (u.cache_read_input_tokens || 0);
    } catch (e) {
      const chu = String(e?.message || e) + String(e?.thongDiep || "");
      if (/TPD|tokens? per day/i.test(chu)) { console.error("⛔ Chạm hạn mức token NGÀY — dừng."); process.exit(3); }
      if (!e?.laLoiMang || lan >= 2) throw e;
      console.error(`  (lỗi mạng, thử lại lần ${lan + 1})`);
    }
  }
}
const nen = await dem([{ type: "text", text: "." }]);
const kq = {};
kq["CORE (EN — model đọc)"] = (await dem([sys[0]])) - nen;
kq["CORE_VI (người đọc — để so)"] = (await dem([{ type: "text", text: CORE_VI }])) - nen;
const tatCa = await dem(sys);
kq["kịch bản page + KB"] = tatCa - nen - kq["CORE (EN — model đọc)"];
kq["tools"] = (await dem(sys, toolDefs)) - tatCa;
kq["TỔNG system+tools"] = tatCa - nen + kq["tools"];
console.log(`page ${pageIdFb} · kịch bản ${kb.kichBanMay ? "BẢN MÁY TIẾNG ANH" : "khuôn tiếng Việt"} · ${goi} lời gọi`);
for (const [k, v] of Object.entries(kq)) console.log(`  ${k.padEnd(30)} ${String(v).padStart(6)} token`);
const sysChiThoi = tatCa - nen;
console.log(`  điểm cache dùng chung dự kiến (cuối system, bội 512): ${Math.floor(sysChiThoi / 512) * 512} · phần lẻ ${sysChiThoi % 512} token`);
await pool.end();
