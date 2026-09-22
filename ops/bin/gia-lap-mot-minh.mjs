#!/usr/bin/env node
// GIẢ LẬP «CHỈ CÓ MỘT MÌNH BOT» — bỏ Botcake, Public API, AI LEADER ra khỏi bàn.
//
// Câu hỏi: nếu page chỉ có DUY NHẤT bot của mình, thì SAU MỖI LƯỢT KHÁCH NÓI nó trả lời
// gì, mất bao lâu, tốn bao nhiêu — và ba bên kia đã trả lời gì cho ĐÚNG lượt đó.
//
// KHÁC bộ `phat-lai-lich-su.mjs` ở ba chỗ, cả ba đều cố ý:
//   ① đơn vị là LƯỢT (cụm tin liền nhau của khách), không phải TIN — đúng thứ mà cửa
//      chờ-gõ-xong gom lại trong bản thật.
//   ② ĐẶT LẠI quyền + ngân sách TRƯỚC MỖI LƯỢT. Không làm thì cửa nhường/ngân sách chặn
//      gần hết và ta không đo được câu nào. Đây là điều đang giả định: «ba bên kia không
//      tồn tại» ⇒ không ai giành lượt, không ai bị coi là đã tiếp quản.
//   ③ LỊCH SỬ GIỮ NGUYÊN, cắt tới đúng lượt đang xét. Bot vẫn thấy cả những câu Botcake
//      đã nói trước đó. Đây là so sánh CÙNG NGỮ CẢNH — cùng một chỗ trong hội thoại, hai
//      người trả lời khác nhau. Bỏ hẳn tin của ba bên kia khỏi lịch sử thì bot trả lời
//      một cuộc hội thoại KHÁC, và bảng so sánh mất nghĩa.
//
// ⚠️ VÌ ② mà con số tiền ở đây là TRẦN TRÊN: bản thật còn cửa ngân sách lượt (trần lượt
//    gọi model trên một khách trong 24h) cắt bớt. Bảng cuối in cả hai con số.
//
// ⛔ AN TOÀN: đòi `V3_DIEN_TAP=1` và CSDL local. Không một byte nào tới Pancake.
//
//   DEVENV=<.env> node ops/bin/gia-lap-mot-minh.mjs --page <id> [--so 40] [--that]
import fs from "node:fs";
import pg from "pg";

const arg = (t, md) => { const i = process.argv.indexOf(t); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : md; };
const pageIdFb = arg("--page", "");
const soLuot = Number(arg("--so", 40));
const soGio = Number(arg("--gio", 24));
const chayThat = process.argv.includes("--that");
if (!pageIdFb || !process.env.DEVENV) {
  console.error("Dùng: DEVENV=<.env> node ops/bin/gia-lap-mot-minh.mjs --page <id> [--so 40] [--that]");
  process.exit(2);
}
const env = Object.fromEntries(fs.readFileSync(process.env.DEVENV, "utf8").split("\n")
  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
if (process.env.V3_DIEN_TAP !== "1") { console.error("⛔ TỪ CHỐI: cần V3_DIEN_TAP=1."); process.exit(2); }
if (!/@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(env.DATABASE_URL_V3 || "")) { console.error("Chỉ chạy trên PostgreSQL local."); process.exit(2); }

const pool = new pg.Pool({ connectionString: env.DATABASE_URL_V3, max: 6 });
const poolGui = new pg.Pool({ connectionString: env.DATABASE_URL_V3, max: 2 });
const { rows: [trang] } = await pool.query("SELECT id, team_id, ten FROM page WHERE page_id=$1", [pageIdFb]);
if (!trang) { console.error(`Không có page ${pageIdFb}.`); process.exit(1); }
const { docTokenSong } = await import("../../src/token-pancake.js");
const [tok] = await docTokenSong(pool);
if (!tok) { console.error("Không có token Pancake nào đang bật."); process.exit(1); }

const nghi = (ms) => new Promise((r) => setTimeout(r, ms));
async function GET(u, nhan = "") {
  let loi;
  for (let l = 1; l <= 4; l++) {
    try { const r = await fetch(u, { signal: AbortSignal.timeout(25000) }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); }
    catch (e) { loi = e; if (l < 4) await nghi(1200 * l); }
  }
  throw new Error(`Pancake im sau 4 lần${nhan ? ` (${nhan})` : ""}: ${loi?.message || loi}`);
}
const T = (s) => Date.parse(String(s).replace(" ", "T").replace(/\.\d+$/, "") + "Z");
const gon = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const che = (s) => String(s).replace(/[\w.+-]+@[\w.-]+\.\w+/g, "<EMAIL>").replace(/[+(]?\d[\d\s().-]{6,}\d/g, "<SĐT>");
const laPage = (m) => String(m?.from?.id) === String(pageIdFb);
const mocCat = new Date(Date.now() - soGio * 3600e3).toISOString().slice(0, 19);

// Ai đã trả lời — dùng ĐÚNG hàm danh tính của đường chạy thật, không đẻ bản thứ hai.
const { danhTinhNguoiGui } = await import("../../src/conv-owner.js");
function benNao(m) {
  const f = m?.from || {};
  const ten = String(f.admin_name || "").trim();
  if (ten) return ten;                                  // Botcake · Public API · AI LEADER · POS · tên sale
  return danhTinhNguoiGui(f) === "may" ? "máy (không nhãn)" : "page (không nhãn)";
}

// ── gom hội thoại + tin, khử trùng theo id ──────────────────────────────────
const theoId = new Map();
for (let t = 1; t <= 6; t++) {
  const jc = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations?access_token=${tok}&page_number=${t}`, `ds ${t}`);
  const ds = jc.conversations || [];
  if (!ds.length) break;
  const truoc = theoId.size;
  for (const c of ds) if (!theoId.has(c.id)) theoId.set(c.id, c);
  if (theoId.size === truoc) break;
  if (String(ds[ds.length - 1]?.updated_at || "") < mocCat) break;
}
const kho = new Map();
const cum = [];
for (const c of [...theoId.values()].filter((x) => x.from_psid && (x.customers || [])[0]?.id && String(x.updated_at || "") >= mocCat)) {
  const jm = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations/${c.id}/messages?access_token=${tok}&customer_id=${c.customers[0].id}`, c.from?.name || c.id);
  const ds = (jm.messages || []).slice().sort((a, b) => String(a.inserted_at).localeCompare(String(b.inserted_at)));
  if (!ds.length) continue;
  kho.set(c.id, { c, ds });
  let dang = null;
  for (const m of ds) {
    if (laPage(m)) { if (dang) { dang.traLoi = m; cum.push(dang); dang = null; } continue; }
    const tho = gon(m.original_message || m.message);
    if (!tho || /fb-pma:\/\//i.test(String(m.original_message || m.message))) continue;
    if (!dang) dang = { c, khach: c.from?.name || c.from_psid, psid: c.from_psid, custId: c.customers[0].id, convId: c.id, tin: [], traLoi: null };
    dang.tin.push({ m, tho });
  }
  if (dang) cum.push(dang);
}
const chon = cum
  .filter((k) => String(k.tin[k.tin.length - 1].m.inserted_at) >= mocCat)
  .sort((a, b) => String(a.tin[a.tin.length - 1].m.inserted_at).localeCompare(String(b.tin[b.tin.length - 1].m.inserted_at)))
  .slice(-soLuot);

const { rows: [mdl] } = await pool.query(
  "SELECT nha_cung_cap, ma_model FROM cau_hinh_model WHERE team_id=$1 AND vai_tro='chinh' AND bat LIMIT 1", [trang.team_id]);
console.log(`GIẢ LẬP MỘT MÌNH · page ${pageIdFb} — ${trang.ten}`);
console.log(`  lượt khách sẽ chạy: ${chon.length} (cửa sổ ${soGio}h, gom cụm)`);
console.log(`  model             : ${mdl ? `${mdl.nha_cung_cap} · ${mdl.ma_model}` : "(chưa cấu hình)"}`);
console.log(`  van gửi           : V3_DIEN_TAP=1 · V3_PANCAKE_GUI=${JSON.stringify(process.env.V3_PANCAKE_GUI)} — KHÔNG gửi cho khách`);
console.log(`  DỰ TOÁN xấu nhất  : ${chon.length} × ~117đ = ${(chon.length * 117).toLocaleString("vi-VN")}đ`);
if (!chayThat) { console.log("\n(chưa chạy — thêm --that)"); await pool.end(); await poolGui.end(); process.exit(0); }

// ── chạy ────────────────────────────────────────────────────────────────────
const { chayMotVong } = await import("../../src/queue/worker.js");
const { xepTin } = await import("../../src/queue/kho.js");
const { baoDamHoiThoai } = await import("../../src/chat/kho.js");
const maLuot = Date.now().toString(36);
let hienTai = null;
const docTinCat = async () => {
  if (!hienTai) return [];
  const { ds } = kho.get(hienTai.convId);
  return ds.filter((x) => String(x.inserted_at) <= String(hienTai.moc));
};
{
  const { rowCount: nGui } = await pool.query(
    `DELETE FROM lan_gui g USING tin_cho_xu_ly t WHERE g.team_id=t.team_id AND g.tin_id=t.id AND t.msg_id LIKE 'motminh:%'`);
  const { rowCount: nTin } = await pool.query("DELETE FROM tin_cho_xu_ly WHERE msg_id LIKE 'motminh:%'");
  if (nTin) console.log(`  dọn lượt trước    : ${nTin} tin + ${nGui} dòng sổ gửi`);
}

const ket = [];
for (const [i, k] of chon.entries()) {
  const cuoi = k.tin[k.tin.length - 1];
  const chu = k.tin.map((x) => x.tho).join("\n");
  hienTai = { convId: k.convId, moc: cuoi.m.inserted_at };
  await baoDamHoiThoai(pool, { teamId: trang.team_id, pageRowId: trang.id, psid: k.psid });
  // ĐẶT LẠI TRƯỚC MỖI LƯỢT — xem ② đầu file. Đây là chỗ giả định «không có ba bên kia».
  await pool.query(
    `UPDATE hoi_thoai SET trang_thai='QUALIFY', chu_so_huu='AI', luot_llm=0, moc_luot_llm='[]'::jsonb,
            ly_do_cuoi='', nguoi_that_luc=NULL, sua_luc=now()
      WHERE team_id=$1 AND page_id=$2 AND psid=$3`, [trang.team_id, trang.id, k.psid]);
  const r = await xepTin(pool, {
    teamId: trang.team_id, pageId: pageIdFb, psid: k.psid, convId: k.convId, custId: k.custId,
    msgId: `motminh:${maLuot}:${cuoi.m.id}`, noiDung: chu, hoanMs: 0,
  });
  if (!r.them) { ket.push({ k, chu, bo: "trùng" }); continue; }
  const t0 = Date.now();
  let kq = null;
  for (let v = 0; v < 8; v++) {
    let x;
    try { x = await chayMotVong(pool, { pageIds: [pageIdFb], poolGui, docTin: docTinCat }); }
    catch (e) { kq = { ketQua: "NÉM", lyDo: String(e?.message || e).slice(0, 110) }; break; }
    if (!x) break;
    if (String(x.tinId) === String(r.id)) { kq = x; break; }
  }
  ket.push({ k, chu, tinId: r.id, kq, treMs: Date.now() - t0 });
  if (i < chon.length - 1) await nghi(Number(arg("--nhip", "7000")));
  process.stderr.write(`\r  đã chạy ${i + 1}/${chon.length}…`);
}
process.stderr.write("\r" + " ".repeat(40) + "\r");

// ── đọc sổ ──────────────────────────────────────────────────────────────────
const ids = ket.filter((x) => x.tinId).map((x) => x.tinId);
const { rows: gui } = await pool.query(
  `SELECT tin_id, string_agg(noi_dung::text, E'\n' ORDER BY buoc) FILTER (WHERE loai='guiTin') AS cho_khach,
          string_agg(loai, ', ' ORDER BY buoc) FILTER (WHERE loai<>'guiTin') AS noi_bo
     FROM lan_gui WHERE team_id=$1 AND tin_id=ANY($2::bigint[]) GROUP BY tin_id`, [trang.team_id, ids]);
const { rows: so } = await pool.query(
  `SELECT nguon_dong AS tin_id, loai, lane, ma_model, token_vao, token_ra, cache_doc, cache_ghi, du_lieu
     FROM so_ai WHERE team_id=$1 AND nguon_dong=ANY($2::bigint[]) AND loai IN ('reply','spent_no_send')`, [trang.team_id, ids]);
const { rows: tt } = await pool.query(
  `SELECT id, trang_thai, ly_do FROM tin_cho_xu_ly WHERE team_id=$1 AND id=ANY($2::bigint[])`, [trang.team_id, ids]);
const mGui = new Map(gui.map((r) => [String(r.tin_id), r]));
const mSo = new Map(so.map((r) => [String(r.tin_id), r]));
const mTin = new Map(tt.map((r) => [String(r.id), r]));
const { tienMotDong } = await import("../../src/admin-v3/chi-phi-tin.js");

const inKhoi = (nhan, txt, cot = "     │ ") => {
  console.log(`  ${nhan}`);
  for (const d of String(txt).split("\\n").join("\n").split("\n")) console.log(`${cot}${d}`);
};
let tong = 0, nModel = 0, n0Dong = 0, nCauTraLoi = 0;
const treBot = [], treHo = new Map(), demBen = new Map();
console.log("\n" + "═".repeat(96));
for (const x of ket) {
  const k = x.k;
  const cuoi = k.tin[k.tin.length - 1];
  const s = x.tinId ? mSo.get(String(x.tinId)) : null;
  const t = s ? tienMotDong(s) : { vnd: null };
  const d = x.tinId ? mTin.get(String(x.tinId)) : null;
  const g = mGui.get(String(x.tinId));
  if (t.vnd != null) { tong += t.vnd; nModel += 1; } else if (g?.cho_khach) n0Dong += 1;

  console.log(`\n${String(cuoi.m.inserted_at).slice(5, 16).replace("T", " ")} · ${k.khach}`);
  for (const y of k.tin) console.log(`  👤 ${che(y.tho).slice(0, 92)}`);

  if (g?.cho_khach) {
    let txt = g.cho_khach;
    try { txt = JSON.parse(g.cho_khach).text || g.cho_khach; } catch { /* nhiều bước */ }
    inKhoi("🤖 BOT MÌNH:", txt);
    nCauTraLoi += 1;
  } else if (g?.noi_bo) {
    console.log(`  🤖 BOT MÌNH: không nhắn khách — ${g.noi_bo} (bàn giao)`);
  } else {
    console.log(`  🤖 BOT MÌNH: (không gửi gì) — ${d ? `${d.trang_thai} · ${d.ly_do}` : x.kq?.lyDo || "?"}`);
  }
  const lane = s?.lane || (d?.ly_do?.startsWith("fastlane") || d?.ly_do?.startsWith("tu_khoa") ? "0 đồng" : "-");
  console.log(`     ⏱ ${(x.treMs / 1000).toFixed(1)}s · ${lane} · ${s ? `${s.token_vao ?? 0}+${s.token_ra ?? 0} tok` : "0 token"} · ${t.vnd == null ? "0đ" : t.vnd + "đ"}`);
  treBot.push(x.treMs / 1000);

  if (k.traLoi) {
    const ben = benNao(k.traLoi);
    const tre = Math.round((T(k.traLoi.inserted_at) - T(cuoi.m.inserted_at)) / 1000);
    demBen.set(ben, (demBen.get(ben) || 0) + 1);
    if (!treHo.has(ben)) treHo.set(ben, []);
    treHo.get(ben).push(tre);
    inKhoi(`🏷  THỰC TẾ · ${ben} · sau ${tre}s:`, che(gon(k.traLoi.original_message || k.traLoi.message)).slice(0, 400));
  } else {
    console.log(`  🏷  THỰC TẾ: KHÔNG AI TRẢ LỜI`);
    demBen.set("không ai trả lời", (demBen.get("không ai trả lời") || 0) + 1);
  }
}

const p = (a, q) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * q)] : null; };
console.log("\n" + "═".repeat(96));
console.log(`LƯỢT KHÁCH ${ket.length} · bot trả lời được ${nCauTraLoi} · trong đó ${n0Dong} lượt 0 đồng, ${nModel} lượt gọi model`);
console.log(`TIỀN (giả lập MỘT MÌNH, mọi lượt đều được phép gọi model): ${tong.toLocaleString("vi-VN")}đ ⇒ ${Math.round(tong / Math.max(1, ket.length))}đ/lượt`);
console.log(`ĐỘ TRỄ BOT MÌNH: p50 ${p(treBot, .5)?.toFixed(1)}s · p90 ${p(treBot, .9)?.toFixed(1)}s · max ${Math.max(...treBot).toFixed(1)}s`);
console.log(`\nTHỰC TẾ ai trả lời ${ket.length} lượt này:`);
for (const [b, n] of [...demBen].sort((a, c) => c[1] - a[1])) {
  const a = treHo.get(b);
  console.log(`  ${String(n).padStart(3)} · ${b.padEnd(24)}${a ? ` p50 ${String(p(a, .5)).padStart(5)}s · p90 ${String(p(a, .9)).padStart(6)}s · max ${String(Math.max(...a)).padStart(6)}s` : ""}`);
}
await pool.end(); await poolGui.end();
