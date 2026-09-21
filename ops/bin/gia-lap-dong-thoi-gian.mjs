#!/usr/bin/env node
// GIẢ LẬP THEO DÒNG THỜI GIAN — N tin gần nhất của một page, KHÔNG gửi một chữ nào.
//
// Trả lời sáu câu, cho từng tin: khách nhắn LÚC NÀO · hệ BẮT được sự kiện bằng cách nào và
// lúc nào · qua những cửa nào · quyết định ở LỚP nào · DỰA VÀO dữ liệu nào · câu trả lời dự
// kiến · và SAU BAO LÂU.
//
// ═══ ĐÂU LÀ ĐO, ĐÂU LÀ TÍNH, ĐÂU LÀ ƯỚC ════════════════════════════════════════════
//   ĐO   · giờ tin tới Pancake (`inserted_at`), nội dung, ai gửi, lớp nào bắt, câu mẫu.
//   TÍNH · độ trễ các chặng — từ HẰNG SỐ THẬT trong mã: nhịp poll, mức chờ gõ xong của
//          `turn-complete.js`, nhịp rút việc của worker. Không có chỗ nào tôi bịa.
//   ƯỚC  · riêng thời gian model trả lời (2–5s) và nội dung câu model sẽ viết — muốn ĐO
//          phải gọi model thật, mà chưa nhà cung cấp nào còn credit.
//
// CHỈ GET sang Pancake. Che số điện thoại/email trước khi in.
import fs from "node:fs";
import pg from "pg";
import { rapKb } from "../../src/chat/rap-prompt.js";
import { fastLane } from "../../src/fast-lane.js";
import { lopTuKhoa } from "../../src/chat/lop-tu-khoa.js";
import { gomCumTinKhach } from "../../src/queue/nap.js";
import { debounceFor } from "../../src/turn-complete.js";
import { buildSystem } from "../../src/prompts.js";
import { buildContextMessages, estimateTokens, emptyProfile, hydrateProfile } from "../../src/context.js";

/** Mỗi câu mẫu đến từ ĐÂU — người đọc phải kiểm lại được, không phải tin lời công cụ. */
const NGUON_MAU = Object.freeze({
  tpl_price: "`kich_ban` LIVE · trường `fastLanePrice` (đối chiếu `goi_gia`: 99/149 SAR)",
  tpl_ship: "`kich_ban` LIVE · trường `fastLaneShip`",
  tpl_howto: "`kich_ban` LIVE · trường `fastLaneHowto`",
  tpl_greet: "`kich_ban` LIVE · trường `greeting` + bảng giá từ `goi_gia`",
  tpl_start: "`kich_ban` LIVE · trường `greeting` + bảng giá từ `goi_gia`",
});

const arg = (t, md) => { const i = process.argv.indexOf(t); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : md; };
const pageIdFb = arg("--page", "");
const soTin = Number(arg("--tin", 50));
// `--tin` đếm MỌI tin. Trên page này 46/50 tin gần nhất là tin GỬI ĐI (Botcake broadcast),
// nên `--tin-khach` đếm theo tin của KHÁCH — đó mới là thứ cần xem. Tin của page vẫn được
// tua để `aiTurns`/lịch sử đúng, chỉ không in ra (`--chi-khach`).
const soTinKhach = Number(arg("--tin-khach", 0));
const chiKhach = process.argv.includes("--chi-khach");
if (!pageIdFb || !process.env.DEVENV) {
  console.error("Dùng: DEVENV=<.env> node ops/bin/gia-lap-dong-thoi-gian.mjs --page <id> [--tin 50]");
  process.exit(2);
}
const env = Object.fromEntries(fs.readFileSync(process.env.DEVENV, "utf8").split("\n")
  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
if (!/@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(env.DATABASE_URL_V3 || "")) { console.error("Chỉ chạy trên PostgreSQL local."); process.exit(2); }

// ── HẰNG SỐ ĐỘ TRỄ: đọc từ chính mã đang chạy, không gõ lại ──────────────────────────
const NHIP_POLL_S = Number(env.V3_WORKER_NHIP_MS || process.env.V3_WORKER_NHIP_MS || 6000) / 1000;
const RUT_VIEC_S = 0.25;          // `chay-worker.js` — vòng xử nghỉ 250ms khi hàng đợi rỗng
// Mốc IM LẶNG để Botcake nói trước (`nap.js#IM_BOTCAKE_MS`). Hoãn bằng `thu_lai_luc`.
const IM_BOTCAKE_S = Number(env.V3_NAP_IM_BOTCAKE_MS ?? process.env.V3_NAP_IM_BOTCAKE_MS ?? 10000) / 1000;
const MODEL_S = [2, 5];           // ƯỚC

const pool = new pg.Pool({ connectionString: env.DATABASE_URL_V3 });
const { rows: [trang] } = await pool.query("SELECT id, team_id, ten, nguon_tin FROM page WHERE page_id = $1", [pageIdFb]);
if (!trang) { console.error(`Không có page ${pageIdFb}.`); process.exit(1); }
const kb = await rapKb(pool, { teamId: String(trang.team_id), pageIdText: pageIdFb });
const { rows: [mdl] } = await pool.query(
  "SELECT nha_cung_cap, ma_model FROM cau_hinh_model WHERE team_id=$1 AND vai_tro='chinh' AND bat LIMIT 1", [trang.team_id]);
const { docTokenSong } = await import("../../src/token-pancake.js");
const [tok] = await docTokenSong(pool);
if (!tok) { console.error("Không có token Pancake nào đang bật."); process.exit(1); }

const che = (s) => String(s || "").replace(/[\w.+-]+@[\w.-]+\.\w+/g, "<EMAIL>").replace(/[+(]?\d[\d\s().-]{6,}\d/g, "<SĐT>");
const gon = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const GET = async (u) => (await fetch(u, { signal: AbortSignal.timeout(20000) })).json().catch(() => ({}));
const gio = (iso) => String(iso || "").slice(11, 19);
const ngay = (iso) => String(iso || "").slice(0, 10);
const laPage = (m) => String(m?.from?.id) === String(pageIdFb);

// ── gom tin của các hội thoại gần nhất, xếp theo GIỜ THẬT ────────────────────────────
const jc = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations?access_token=${tok}&page_number=1`);
const convs = (jc.conversations || []).filter((c) => c.from_psid && (c.customers || [])[0]?.id);
const kho = new Map();  // convId -> { conv, msgs }
const tatCa = [];
for (const c of convs.slice(0, 25)) {
  const jm = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations/${c.id}/messages?access_token=${tok}&customer_id=${c.customers[0].id}`);
  const msgs = (jm.messages || []).slice().sort((a, b) => String(a.inserted_at).localeCompare(String(b.inserted_at)));
  if (!msgs.length) continue;
  kho.set(c.id, { conv: c, msgs });
  for (const m of msgs) tatCa.push({ convId: c.id, m });
}
tatCa.sort((a, b) => String(a.m.inserted_at).localeCompare(String(b.m.inserted_at)));
let lat;
if (soTinKhach > 0) {
  // Lùi từ cuối cho tới khi gom đủ N tin KHÁCH — giữ nguyên mọi tin page xen giữa.
  let dem2 = 0, i = tatCa.length - 1;
  for (; i >= 0 && dem2 < soTinKhach; i--) {
    const x = tatCa[i];
    if (!laPage(x.m) && gon(x.m.original_message || x.m.message || "")) dem2 += 1;
  }
  lat = tatCa.slice(i + 1);
} else {
  lat = tatCa.slice(-soTin);
}
const moc = lat.length ? lat[0].m.inserted_at : null;

// ── đầu báo ─────────────────────────────────────────────────────────────────────────
const sys = buildSystem(kb);
const tokenSys = estimateTokens(sys.map((b) => b.text).join("\n"));
console.log("═".repeat(96));
console.log(`GIẢ LẬP · PAGE ${pageIdFb} — ${trang.ten}`);
console.log(`${lat.length} tin (${lat.filter((x) => !laPage(x.m)).length} của khách) · từ ${ngay(moc)} ${gio(moc)} đến ${ngay(lat.at(-1).m.inserted_at)} ${gio(lat.at(-1).m.inserted_at)}`);
console.log("═".repeat(96));
console.log(`BẮT SỰ KIỆN : ${trang.nguon_tin === "webhook" ? "WEBHOOK (đẩy)" : `POLL — worker hỏi Pancake mỗi ${NHIP_POLL_S}s`}`);
console.log(`              Không có webhook ⇒ không có "ngay lập tức"; trễ nhận tin = 0–${NHIP_POLL_S}s.`);
console.log(`NĂM CỬA LỌC : ① last_sent_by ≠ page  ② mốc hội thoại đổi  ③ khách gõ xong`);
console.log(`              ④ im ${IM_BOTCAKE_S}s cho Botcake nói trước  ⑤ page vẫn chưa nói ⇒ mới gọi model`);
console.log(`MODEL       : ${mdl ? `${mdl.nha_cung_cap} / ${mdl.ma_model}` : "(chưa cấu hình)"}`);
console.log(`KHỐI CACHE  : ${tokenSys} token (CORE + kịch bản LIVE + KB) — giống nhau mọi lượt của page này`);
console.log(`MẪU 0 ĐỒNG  : ${["fastLanePrice", "fastLaneShip", "fastLaneHowto", "fastLaneAuth", "fastLaneSize"].filter((k) => kb.config?.[k]).join(", ") || "(chưa có)"}`);
console.log("═".repeat(96));

// ── trạng thái từng hội thoại khi tua lại ───────────────────────────────────────────
const trangThai = new Map();
const tt = (id) => {
  if (!trangThai.has(id)) trangThai.set(id, { lichSu: [], daDung: new Set(), prof: emptyProfile(), luotAi: 0, tinAiCuoi: "", daCache: false });
  return trangThai.get(id);
};
// Lịch sử TRƯỚC mốc cắt: tua thầm để `aiTurns`/`usedLanes` đúng như thật khi tới tin đầu tiên được in.
for (const { convId, m } of tatCa.slice(0, Math.max(0, tatCa.length - soTin))) {
  const s = tt(convId);
  const chu = gon(m.original_message || m.message || "");
  if (!chu) continue;
  s.lichSu.push(m);
  if (laPage(m)) { s.tinAiCuoi = chu; s.luotAi += 1; }
}

const soHt = new Map();
let dem = 0;
const demLop = new Map();
const tre = [];
let truocIso = null;

for (const { convId, m } of lat) {
  const s = tt(convId);
  const chu = gon(m.original_message || m.message || "");
  if (!chu) continue;
  if (!soHt.has(convId)) soHt.set(convId, soHt.size + 1);
  const nhan = `#${soHt.get(convId)}`;
  const cachTruoc = truocIso ? Math.round((Date.parse(m.inserted_at) - Date.parse(truocIso)) / 1000) : null;
  truocIso = m.inserted_at;

  if (laPage(m)) {
    const ai = m.from?.admin_name || "sale";
    if (!chiKhach) console.log(`\n${gio(m.inserted_at)} ${nhan} 🧑‍💼 ${ai.toUpperCase()} (đã gửi thật) │ ${che(chu).slice(0, 88)}`);
    s.lichSu.push(m); s.tinAiCuoi = chu; s.luotAi += 1;
    continue;
  }

  dem += 1;
  console.log(`\n${gio(m.inserted_at)} ${nhan} 👤 KHÁCH${cachTruoc != null ? ` (cách tin trước ${cachTruoc}s)` : ""}`);
  console.log(`          │ ${che(chu)}`);
  s.lichSu.push(m);

  const cum = gomCumTinKhach(s.lichSu, pageIdFb);
  if (!cum) {
    console.log(`          └─ ⛔ BỘ NẠP BỎ QUA — bóc thẻ/thông báo hệ thống xong không còn chữ (0 đồng)`);
    demLop.set("bo-nap-loc", (demLop.get("bo-nap-loc") || 0) + 1);
    continue;
  }

  // ③ chờ gõ xong
  const doi = debounceFor(chu);
  const treMin = doi.ms / 1000 + IM_BOTCAKE_S + RUT_VIEC_S;
  const treMax = NHIP_POLL_S * 2 + doi.ms / 1000 + IM_BOTCAKE_S + RUT_VIEC_S;
  console.log(`          ├─ ⏱  0–${NHIP_POLL_S}s  vòng poll thấy (cửa ①② qua: khách nói cuối, mốc đổi)`);
  console.log(`          ├─ ⏱  ${doi.ms / 1000}s     chờ gõ xong — "${doi.reason}"`);
  console.log(`          ├─ ⏱  0–${NHIP_POLL_S}s  vòng poll kế → xếp hàng đợi (hoãn ${IM_BOTCAKE_S}s cho Botcake nói trước)`);
  console.log(`          ├─ ⏱  ${IM_BOTCAKE_S}s + ${RUT_VIEC_S}s  qua mốc im → worker rút việc`);

  // ④ NHƯỜNG PAGE — chỉ tính tin page tới TRONG CỬA SỔ bot còn đang chờ. Worker kiểm ở
  //   thời điểm rút việc; Botcake trả lời sau đó thì nó KHÔNG cứu được lượt nào, và tính
  //   là "nhường" là tự khen công cụ. Ba mốc: trước treMin = chắc chắn nhường; giữa
  //   treMin và treMax = ĐUA (tuỳ vòng poll rơi vào đâu); sau treMax = bot đã nói trước.
  const sau = kho.get(convId).msgs
    .filter((x) => laPage(x) && gon(x.original_message || x.message || "") && String(x.inserted_at) > String(m.inserted_at))
    .map((x) => ({ x, tre: (Date.parse(x.inserted_at) - Date.parse(m.inserted_at)) / 1000 }));
  const pageChen = sau.find((o) => o.tre <= treMax);

  if (pageChen) {
    const chac = pageChen.tre <= treMin;
    const ai2 = pageChen.x.from?.admin_name || "sale";
    console.log(`          ├─ ④ ${chac ? "NHƯỜNG" : "ĐUA"}: ${ai2} trả lời sau ${pageChen.tre.toFixed(0)}s (${gio(pageChen.x.inserted_at)})`
      + `${chac ? "" : ` — bot có thể đã kịp nói ở mốc ${treMin}s`}`);
    console.log(`          └─ 🤖 ${chac ? "KHÔNG GỌI MODEL — 0 đồng" : "NỬA ĐƯỜNG: tuỳ vòng poll, có thể tốn tiền mà thừa"}. `
      + `"${che(gon(pageChen.x.original_message || pageChen.x.message)).slice(0, 56)}…"`);
    demLop.set(chac ? "nhuong-page" : "ĐUA với page", (demLop.get(chac ? "nhuong-page" : "ĐUA với page") || 0) + 1);
    s.tinAiCuoi = gon(pageChen.x.original_message || pageChen.x.message || "");
    continue;
  }
  if (sau.length) {
    console.log(`          ├─ ④ page có nói, nhưng SAU ${sau[0].tre.toFixed(0)}s — muộn hơn mốc bot (${treMax}s) ⇒ bot nói TRƯỚC`);
  }

  // lớp 0 đồng — ĐÚNG thứ tự `handler-v3.js`: từ-khoá (430) rồi fast-lane (478)
  let xong = null;
  const k = lopTuKhoa({ text: cum.text, kb, profile: s.prof });
  if (k?.handled) xong = { lop: "lớp từ-khoá", lane: k.rule || k.lane || "?", reply: k.reply, ly: k.reason, nguon: `kich_ban LIVE · ${k.rule || ""}` };
  else {
    const f = fastLane({ text: cum.text, kb, aiTurns: s.luotAi, lastAiText: s.tinAiCuoi, usedLanes: s.daDung, pageId: pageIdFb });
    if (f?.handled) xong = { lop: "Fast Lane", lane: f.lane, reply: f.reply, ly: f.reason, nguon: NGUON_MAU[f.lane] || "luật im lặng trong mã" };
  }

  if (xong) {
    demLop.set(xong.lane, (demLop.get(xong.lane) || 0) + 1);
    tre.push([treMin, treMax]);
    console.log(`          ├─ 🧩 LỚP     : ${xong.lop} → \`${xong.lane}\` (0 đồng, không gọi model)`);
    console.log(`          ├─ 📚 DỰA VÀO : ${xong.nguon}`);
    if (xong.reply) {
      console.log(`          └─ 💬 ĐỊNH GỬI sau ${treMin}–${treMax}s:`);
      for (const d of String(xong.reply).split("\n")) console.log(`             │ ${d}`);
    } else {
      console.log(`          └─ 🤫 IM LẶNG — ${xong.ly}`);
    }
    continue;
  }

  // gọi model
  if (!s.prof.hydratedAt && s.lichSu.length) hydrateProfile(s.lichSu, pageIdFb, s.prof);
  const { messages, kept, dropped } = buildContextMessages({ prof: s.prof, msgs: s.lichSu, pageId: pageIdFb });
  messages.push({ role: "user", content: cum.text });
  const tIn = estimateTokens(JSON.stringify(messages));
  const mMin = treMin + MODEL_S[0], mMax = treMax + MODEL_S[1];
  tre.push([mMin, mMax]);
  demLop.set("gọi model", (demLop.get("gọi model") || 0) + 1);
  console.log(`          ├─ 🧩 LỚP     : không mẫu nào khớp → GỌI MODEL ${mdl ? mdl.ma_model : "?"}`);
  console.log(`          ├─ 📚 DỰA VÀO : khối cache ${tokenSys}t (CORE + kịch bản + SP/giá) + ${tIn}t ngữ cảnh (giữ ${kept} tin, bỏ ${dropped} tin Botcake)`);
  console.log(`          └─ 💬 ĐỊNH GỬI sau ${mMin.toFixed(1)}–${mMax.toFixed(1)}s: (nội dung CHƯA ĐO ĐƯỢC — chưa nhà cung cấp nào còn credit)`);
  s.daCache = true;
}

console.log("\n" + "═".repeat(96));
console.log(`TỔNG ${dem} tin của KHÁCH trong ${lat.length} tin gần nhất`);
for (const [k, v] of [...demLop].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(k).padEnd(24)} ${String(v).padStart(3)} tin  (${(v * 100 / Math.max(1, dem)).toFixed(1)}%)`);
}
if (tre.length) {
  const mn = tre.map((x) => x[0]).sort((a, b) => a - b), mx = tre.map((x) => x[1]).sort((a, b) => a - b);
  const p50 = (a) => a[Math.floor(a.length / 2)];
  console.log(`\n  ĐỘ TRỄ TRẢ LỜI (${tre.length} lượt bot thật sự đáp):`);
  console.log(`    nhanh nhất : ${mn[0].toFixed(1)}s   ·  chậm nhất: ${mx.at(-1).toFixed(1)}s`);
  console.log(`    trung vị   : ${p50(mn).toFixed(1)}–${p50(mx).toFixed(1)}s`);
  console.log(`    hạn đặt ra : 120s ⇒ ${mx.at(-1) <= 120 ? "ĐẠT, dư " + (120 - mx.at(-1)).toFixed(0) + "s" : "VƯỢT"}`);
}
await pool.end();
