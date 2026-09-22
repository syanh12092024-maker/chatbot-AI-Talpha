#!/usr/bin/env node
// BÁO CÁO 24 GIỜ — khách nhắn gì, hệ ĐỊNH làm gì với từng ca, tốn bao nhiêu, chậm bao lâu.
//
// ⛔ CHỈ GET. Bộ này KHÔNG xếp hàng đợi, KHÔNG chạy worker, KHÔNG gửi một chữ nào. Nó chạy
//    lại ĐÚNG các hàm của đường chạy thật trên dữ liệu thật:
//      · cửa ⓪ thẻ chặn        → `THE_HE_THONG` + thẻ theo tên (V3_NAP_THE_CHAN)
//      · cửa ① page nói cuối   → `nap.js#pageNoiCuoi`
//      · cửa ⑤ nhường page     → `nap.js#gomCumTinKhach`
//      · lớp 0 đồng            → `lop-tu-khoa.js#lopTuKhoa` rồi `fast-lane.js#fastLane`
//                                 (ĐÚNG thứ tự của handler-v3: từ khoá TRƯỚC, fastLane SAU)
//    Cụm nào lọt hết các lớp trên mới là cụm PHẢI GỌI MODEL — và chỉ những cụm đó tốn tiền.
//
// Hai cột "thật" lấy thẳng từ Pancake, không suy diễn: AI ĐÃ trả lời cụm này (Botcake /
// bot AI khác / người) và SAU BAO LÂU. Đó là mốc để so với lời hứa 1-2 phút.
//
// Chạy:  DEVENV=<.env> node ops/bin/bao-cao-24h.mjs --page <id> [--gio 24] [--tat-ca]
import fs from "node:fs";
import pg from "pg";

const arg = (t, md) => { const i = process.argv.indexOf(t); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : md; };
const pageIdFb = arg("--page", "");
const soGio = Number(arg("--gio", 24));
const inTatCa = process.argv.includes("--tat-ca");
if (!pageIdFb || !process.env.DEVENV) {
  console.error("Dùng: DEVENV=<.env> node ops/bin/bao-cao-24h.mjs --page <id> [--gio 24] [--tat-ca]");
  process.exit(2);
}
const env = Object.fromEntries(fs.readFileSync(process.env.DEVENV, "utf8").split("\n")
  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
if (!/@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(env.DATABASE_URL_V3 || "")) {
  console.error("Chỉ chạy trên PostgreSQL local."); process.exit(2);
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL_V3, max: 4 });
const { rows: [trang] } = await pool.query("SELECT id, team_id, ten FROM page WHERE page_id=$1", [pageIdFb]);
if (!trang) { console.error(`Không có page ${pageIdFb}.`); process.exit(1); }
const { docTokenSong } = await import("../../src/token-pancake.js");
const [tok] = await docTokenSong(pool);
if (!tok) { console.error("Không có token Pancake nào đang bật."); process.exit(1); }

const nghi = (ms) => new Promise((r) => setTimeout(r, ms));
async function GET(u, nhan = "") {
  let loi;
  for (let l = 1; l <= 4; l++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { loi = e; if (l < 4) await nghi(1200 * l); }
  }
  throw new Error(`Pancake không trả lời sau 4 lần${nhan ? ` (${nhan})` : ""}: ${loi?.message || loi}`);
}

// Mốc Pancake KHÔNG kèm múi giờ và `Date.parse` hiểu lệch nhiều giờ (lý do y hệt
// pancake-poll.js:181) — nên mọi phép so sánh mốc ở đây làm bằng CHUỖI, và phép TRỪ hai
// mốc làm bằng `Date.parse` của CÙNG một dạng chuỗi (lệch triệt tiêu nhau).
const T = (s) => Date.parse(String(s).replace(" ", "T").replace(/\.\d+$/, "") + "Z");
const mocCat = new Date(Date.now() - soGio * 3600e3).toISOString().slice(0, 19);
const gon = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const che = (s) => String(s).replace(/[\w.+-]+@[\w.-]+\.\w+/g, "<EMAIL>").replace(/[+(]?\d[\d\s().-]{6,}\d/g, "<SĐT>");
const laPage = (m) => String(m?.from?.id) === String(pageIdFb);

// ── AI NÓI? — cùng cách nhận dạng đã đo 21/09 trên chính page này ───────────────────
// Botcake và "Public API" đi qua app_id của page; hai bot AI khác của Pancake có uid riêng.
const AI_KHAC = new Map([
  ["359f5a88-17ec-4187-837e-3921b890083c", "AI LEADER"],
  ["0c7cf221-d058-4458-9f58-d1c82dc7c9d8", "Public API"],
]);
function aiNoi(m) {
  const f = m?.from || {};
  const uid = String(f.uid || f.admin_id || "");
  if (AI_KHAC.has(uid)) return AI_KHAC.get(uid);
  if (f.email && String(f.email).includes("@facebook.com")) return "Botcake/mẫu";
  if (f.app_id) return "Botcake/mẫu";
  return f.name ? `người · ${f.name}` : "người";
}

// ── thẻ chặn của page (cửa ⓪) ──────────────────────────────────────────────────────
const THE_HE_THONG = new Set([-1, -2, -3, -11, -12, -20]);
const TEN_THE_CHAN = String(env.V3_NAP_THE_CHAN == null || env.V3_NAP_THE_CHAN === "" ? "Đã gửi" : env.V3_NAP_THE_CHAN)
  .split(",").map((x) => x.trim()).filter(Boolean);
const js = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/settings?access_token=${tok}`, "thẻ");
const bangThe = new Map((js?.settings?.tags || []).map((t) => [String(t.id), t.text || t.name || ""]));
const idChan = new Set(THE_HE_THONG);
for (const [id, ten] of bangThe) {
  if (TEN_THE_CHAN.some((x) => x.toLowerCase() === String(ten).toLowerCase())) idChan.add(Number(id));
}

// ── nạp hội thoại + tin, cuốn trang tới khi ra khỏi cửa sổ ─────────────────────────
const { debounceFor } = await import("../../src/turn-complete.js");
const IM_BOTCAKE_MS = Number(env.V3_NAP_IM_BOTCAKE_MS === "" || env.V3_NAP_IM_BOTCAKE_MS == null ? 10000 : env.V3_NAP_IM_BOTCAKE_MS);
// ⚠️ `page_number` của Pancake KHÔNG phải lúc nào cũng cuốn — đo 22/09: trang 1..6 trả VỀ
// CÙNG một danh sách, và bản đầu của bộ này nhân mọi con số lên đúng 6 lần (330 tin, 294
// lượt, 36 hội thoại — toàn bội của 6). Khử theo `id`, và DỪNG ngay khi một trang không
// thêm được hội thoại mới nào.
const theoId = new Map();
for (let trangSo = 1; trangSo <= 6; trangSo++) {
  const jc = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations?access_token=${tok}&page_number=${trangSo}`, `ds trang ${trangSo}`);
  const ds = (jc.conversations || []);
  if (!ds.length) break;
  const truoc = theoId.size;
  for (const c of ds) if (!theoId.has(c.id)) theoId.set(c.id, c);
  if (theoId.size === truoc) break;                      // trang này không có gì mới
  if (String(ds[ds.length - 1]?.updated_at || "") < mocCat) break;
}
const ungVien = [...theoId.values()].filter((c) => c.from_psid && (c.customers || [])[0]?.id
  && String(c.updated_at || "") >= mocCat);

process.stderr.write(`  đọc tin của ${ungVien.length} hội thoại…\r`);
const kho = [];
for (const c of ungVien) {
  const jm = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations/${c.id}/messages?access_token=${tok}&customer_id=${c.customers[0].id}`, c.from?.name || c.id);
  const ds = (jm.messages || []).slice().sort((a, b) => String(a.inserted_at).localeCompare(String(b.inserted_at)));
  if (ds.length) kho.push({ c, ds });
}
process.stderr.write(" ".repeat(50) + "\r");

// ── GOM CỤM — một cụm = một lượt trả lời ───────────────────────────────────────────
// Đúng thứ mà cửa ③ (chờ gõ xong) sinh ra: chuỗi tin liền nhau của khách, ngắt khi page
// nói. Đếm theo TIN thì thổi phồng khối lượng; đếm theo CỤM mới ra số lượt phải trả lời.
const cum = [];
for (const { c, ds } of kho) {
  let dang = null;
  for (const m of ds) {
    if (laPage(m)) {
      if (dang) { dang.traLoi = m; cum.push(dang); dang = null; }
      continue;
    }
    const tho = gon(m.original_message || m.message);
    if (!tho) continue;                       // "<div></div>" — tin thật, bóc thẻ xong rỗng
    if (/fb-pma:\/\//i.test(String(m.original_message || m.message))) continue;
    if (!dang) dang = { c, khach: c.from?.name || c.from_psid, tin: [], traLoi: null };
    dang.tin.push({ m, tho });
  }
  if (dang) cum.push(dang);                   // cụm CHƯA ai trả lời
}
const trong24 = cum.filter((k) => String(k.tin[k.tin.length - 1].m.inserted_at) >= mocCat);

// ── KB thật của page (để chạy hai lớp 0 đồng) ──────────────────────────────────────
const { rapKb } = await import("../../src/chat/rap-prompt.js");
const { lopTuKhoa } = await import("../../src/chat/lop-tu-khoa.js");
const { fastLane } = await import("../../src/fast-lane.js");
const { templateSafety } = await import("../../src/chat/template-safety.js");
const kb = await rapKb(pool, { teamId: trang.team_id, pageIdText: pageIdFb });

// TRẠNG THÁI THEO HỘI THOẠI. `fastLane` chỉ cho mỗi lane bắn MỘT LẦN cho một khách
// (`usedLanes`) và đọc `aiTurns`. Chấm từng cụm như thể nó là cụm ĐẦU TIÊN là thổi phồng
// tỉ lệ 0 đồng: khách hỏi giá lần hai sẽ KHÔNG được mẫu nữa mà phải lên model.
const trangThaiHT = new Map();
const layTT = (id) => {
  if (!trangThaiHT.has(id)) trangThaiHT.set(id, { usedLanes: new Set(), aiTurns: 0, lastAiText: "" });
  return trangThaiHT.get(id);
};

/** Cụm này rơi vào cửa/lớp nào? Trả `{cua, lop, lyDo, cau}` — `cau` là CHỮ SẼ GỬI (0 đồng). */
function phanCa(k) {
  const theChan = (k.c.tags || []).map(Number).filter((t) => idChan.has(t));
  if (theChan.length) {
    return { cua: "⓪ thẻ chặn", lop: "—", lyDo: `thẻ ${theChan.map((t) => bangThe.get(String(t)) || t).join("/")}`, cau: "" };
  }
  // ── CỬA ①/⑤ PHẢI CHẤM THEO THỜI ĐIỂM, KHÔNG THEO TRẠNG THÁI HIỆN TẠI ──────────────
  // Bản đầu dùng `pageNoiCuoi(conv)` — nhưng `last_sent_by` là trạng thái BÂY GIỜ, nên
  // mọi cụm cũ đều "page nói cuối" chỉ vì page đã nói ở đâu đó sau này. Đo 22/09: 38/49
  // lượt rơi vào ① theo cách chấm đó, và cả 5 lượt còn lại đều thuộc ĐÚNG MỘT hội thoại
  // mới nhất — dấu hiệu rõ ràng là phép chấm sai, không phải page im.
  //
  // Chấm đúng: so mốc NGƯỜI KHÁC TRẢ LỜI với mốc BOT NHÌN THẤY LƯỢT NÀY:
  //     nhìn = tin cuối của cụm + chờ-gõ-xong(5s trọn ý / 15s còn dở) + im-Botcake(10s)
  // Ai tới trước thì người đó trả lời. Đây chính là luật cửa ④+⑤ đang chạy thật.
  const tCum = T(k.tin[k.tin.length - 1].m.inserted_at);
  // `debounceFor` trả OBJECT `{ms, complete, reason}` — lấy `.ms`, cộng thẳng cả object
  // ra NaN và mọi phép so mốc im lặng thành false (bản đầu của bộ này dính đúng bẫy đó).
  const cho = debounceFor(k.tin[k.tin.length - 1].tho).ms + IM_BOTCAKE_MS;
  const tNhin = tCum + cho;
  if (k.traLoi && T(k.traLoi.inserted_at) <= tNhin) {
    const tre = Math.round((T(k.traLoi.inserted_at) - tCum) / 1000);
    return { cua: "⑤ nhường page", lop: "—",
      lyDo: `${aiNoi(k.traLoi)} trả lời sau ${tre}s, trước mốc bot nhìn (${Math.round(cho / 1000)}s)`, cau: "" };
  }
  const st = layTT(k.c.id);
  const text = k.tin.map((x) => x.tho).join("\n");
  const tk = lopTuKhoa({ text, kb, profile: {} });
  if (tk.handled && !st.usedLanes.has(`keyword:${tk.rule}`)) {
    st.usedLanes.add(`keyword:${tk.rule}`); st.lastAiText = tk.reply;
    return { cua: "qua hết", lop: `0đ · từ khoá:${tk.rule}`, lyDo: tk.lyDo || "", cau: tk.reply };
  }
  const at = templateSafety(text, {});
  const fl = at.safe ? fastLane({ text, kb, aiTurns: st.aiTurns, lastAiText: st.lastAiText, idleMs: 0,
    usedLanes: st.usedLanes, pageId: pageIdFb, hasOrder: false }) : { handled: false, reason: at.reason };
  if (fl.handled) {
    if (fl.reply) { st.lastAiText = fl.reply; return { cua: "qua hết", lop: `0đ · fastlane:${fl.lane}`, lyDo: fl.reason || "", cau: fl.reply }; }
    return { cua: "qua hết", lop: `0đ · IM:${fl.lane}`, lyDo: "lane im lặng — cố ý không trả lời", cau: "" };
  }
  st.aiTurns += 1;
  return { cua: "qua hết", lop: "GỌI MODEL", lyDo: fl.reason || at.reason || "", cau: "" };
}

// ── in ─────────────────────────────────────────────────────────────────────────────
console.log(`\n═══ BÁO CÁO ${soGio} GIỜ · page ${pageIdFb} — ${trang.ten}`);
console.log(`    cửa sổ: từ ${mocCat.replace("T", " ")} (giờ server) tới bây giờ`);
console.log(`    thẻ chặn: ${[...idChan].filter((x) => x > 0).map((x) => `${bangThe.get(String(x))}(${x})`).join(", ") || "(không có thẻ tên nào)"} + 6 thẻ hệ thống\n`);

const demCua = new Map(), demLop = new Map(), demAi = new Map(), demNhuong = new Map();
const cham = new Map();   // ai trả lời → danh sách độ trễ, để tách p50 theo từng nguồn
const treRep = [];
let soTinKhach = 0;
for (const k of trong24) {
  const p = phanCa(k);
  soTinKhach += k.tin.length;
  demCua.set(p.cua, (demCua.get(p.cua) || 0) + 1);
  demLop.set(p.lop, (demLop.get(p.lop) || 0) + 1);
  const tCuoi = k.tin[k.tin.length - 1].m.inserted_at;
  let ai = "CHƯA AI TRẢ LỜI", tre = null;
  if (k.traLoi) { ai = aiNoi(k.traLoi); tre = Math.round((T(k.traLoi.inserted_at) - T(tCuoi)) / 1000); }
  demAi.set(ai, (demAi.get(ai) || 0) + 1);
  if (p.cua === "⑤ nhường page") demNhuong.set(ai, (demNhuong.get(ai) || 0) + 1);
  if (tre != null && tre >= 0) { treRep.push(tre); (cham.get(ai) || cham.set(ai, []).get(ai)).push(tre); }
  if (!inTatCa && p.cua !== "qua hết") continue;
  console.log(`${String(tCuoi).slice(5, 16).replace("T", " ")} · ${k.khach}`);
  for (const x of k.tin) console.log(`  👤 ${che(x.tho).slice(0, 96)}`);
  console.log(`  ⚙  ${p.cua}${p.lop !== "—" ? ` → ${p.lop}` : ""}${p.lyDo ? ` · ${p.lyDo}` : ""}`);
  if (p.cau) for (const d of String(p.cau).split("\n")) console.log(`  🤖 │ ${d}`);
  console.log(`  🕒 thật: ${ai}${tre != null ? ` sau ${tre}s` : ""}\n`);
}

const p50 = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.5)] : null; };
const p90 = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.9)] : null; };
console.log("═".repeat(94));
console.log(`TIN KHÁCH ${soTinKhach} · gom thành ${trong24.length} LƯỢT phải trả lời · ${new Set(trong24.map((k) => k.c.id)).size} hội thoại\n`);
console.log("CỬA VÀO:");
for (const [k, v] of [...demCua].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log("\nLỚP XỬ LÝ (chỉ tính lượt qua hết cửa):");
for (const [k, v] of [...demLop].sort((a, b) => b[1] - a[1])) if (k !== "—") console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log("\nAI ĐÃ TRẢ LỜI THẬT (Pancake, 24h qua) — ai tới trước bot thì bot nhường:");
for (const [k, v] of [...demAi].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log("\nAI GIÀNH ĐƯỢC LƯỢT TRƯỚC BOT (cửa ⑤ nhường) — đây là chỗ phải quyết:");
for (const [k, v] of [...demNhuong].sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}  ${k}`);
console.log(`\nĐỘ TRỄ TRẢ LỜI THẬT, tách theo nguồn (giây từ lúc khách gõ xong):`);
for (const [k, a] of [...cham].sort((x, y) => y[1].length - x[1].length)) {
  console.log(`  ${k.padEnd(28)} n=${String(a.length).padStart(3)} · p50 ${String(p50(a)).padStart(5)}s · p90 ${String(p90(a)).padStart(5)}s · max ${Math.max(...a)}s`);
}
console.log(`  ${"TẤT CẢ".padEnd(28)} n=${String(treRep.length).padStart(3)} · p50 ${String(p50(treRep)).padStart(5)}s · p90 ${String(p90(treRep)).padStart(5)}s`);
const qua2p = treRep.filter((x) => x > 120).length;
console.log(`  ⇒ ${qua2p}/${treRep.length} lượt QUÁ 2 PHÚT (${Math.round(qua2p * 100 / treRep.length)}%) — lời hứa 1-2 phút đang vỡ ở đó.`);
const nModel = demLop.get("GỌI MODEL") || 0;
const nQuaHet = demCua.get("qua hết") || 0;
console.log(`\nTIỀN: ${nQuaHet - nModel} lượt lớp 0 đồng · ${trong24.length - nQuaHet} lượt cửa chặn (cũng 0 đồng) · ${nModel} lượt GỌI MODEL`);
// Giá một lượt gọi model — ĐO trên 51 lượt Kimi k2.6 thật (sổ AI, 21-22/09), không ước:
//   min 72đ · p50 87đ · TB 117đ · p90 210đ · max 289đ
// Dùng TRUNG BÌNH cho phép nhân tháng (đuôi dài của vòng tool nằm trong đó), và in kèm
// p50 để thấy phần lớn lượt rẻ hơn con số nhân ra.
const GIA_TB = 117, GIA_P50 = 87;
console.log(`      giá một lượt gọi model (đo 51 lượt Kimi k2.6 thật): p50 ${GIA_P50}đ · TB ${GIA_TB}đ · max 289đ`);
console.log(`      ${nModel} × ${GIA_TB}đ ≈ ${(nModel * GIA_TB).toLocaleString("vi-VN")}đ cho ${soGio}h  ⇒  ~${Math.round(nModel * GIA_TB * 30 / 1000).toLocaleString("vi-VN")}k đ/tháng cho page này`);
await pool.end();
