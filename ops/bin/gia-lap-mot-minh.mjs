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
//   ... --kho <tệp.json>  đọc hội thoại từ tệp đã gom sẵn thay vì gọi Pancake. Gom một
//                         lần rồi chạy lại nhiều lượt trên CÙNG dữ liệu — không thì mỗi
//                         lượt chạy lại là một tập hội thoại khác và không so được.
//   ... --ra  <tệp.json>  xuất kết quả có cấu trúc (để dựng màn hình đối chiếu).
import fs from "node:fs";
import pg from "pg";

const arg = (t, md) => { const i = process.argv.indexOf(t); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : md; };
const pageIdFb = arg("--page", "");
const soLuot = Number(arg("--so", 40));
const soGio = Number(arg("--gio", 24));
const chayThat = process.argv.includes("--that");
const tepKho = arg("--kho", "");
const tepRa = arg("--ra", "");
// KHOÁ VỀ ĐÚNG TẬP LƯỢT CỦA MỘT LẦN ĐO TRƯỚC. Không có nó thì mỗi lần chạy lại là một tập
// hội thoại khác (page vẫn nhận tin mới hằng ngày) và hai lượt đo không so được với nhau.
// Nhận chính tệp `--ra` của lần trước; khớp theo `convId` + mốc tin cuối của cụm.
const tepChi = arg("--chi", "");
// Mặc định GIỮ cửa nhường sale thật — nó là hành vi đúng của bản chạy. Cờ này chỉ để
// ĐO CÂU CHỮ: muốn xem bot ĐỊNH nói gì ở những lượt mà ngoài đời sale đã tiếp quản.
const khongNhuongSale = process.argv.includes("--khong-nhuong-sale");
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

// ── nguồn dữ liệu ───────────────────────────────────────────────────────────
// `page_number` của Pancake KHÔNG cuốn trang (đo 22/09: trang 1..6 trả VỀ CÙNG một danh
// sách). `limit=` thì cuốn thật — 100 hội thoại duy nhất. Giữ cả khử-trùng theo id làm
// lưới an toàn, vì đây là hành vi không có trong tài liệu.
async function tuPancake() {
  const theoId = new Map();
  const jc = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations?access_token=${tok}&limit=${Math.max(60, soLuot * 2)}`, "danh sách");
  for (const c of (jc.conversations || [])) if (!theoId.has(c.id)) theoId.set(c.id, c);
  const ra = [];
  for (const c of [...theoId.values()].filter((x) => x.from_psid && (x.customers || [])[0]?.id && String(x.updated_at || "") >= mocCat)) {
    const jm = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations/${c.id}/messages?access_token=${tok}&customer_id=${c.customers[0].id}`, c.from?.name || c.id);
    ra.push({ c, ds: (jm.messages || []) });
  }
  return ra;
}

/** Tệp do `ops/bin/` gom sẵn: `[{conv:{id,from,from_psid,custId,...}, msgs:[{id,from,at,text}]}]` */
function tuTep(tep) {
  return JSON.parse(fs.readFileSync(tep, "utf8")).map((k) => ({
    c: { id: k.conv.id, from: k.conv.from, from_psid: k.conv.from_psid,
         customers: [{ id: k.conv.custId }], tags: k.conv.tags, updated_at: k.conv.updated_at },
    ds: k.msgs.map((m) => ({ id: m.id, from: m.from, inserted_at: m.at, original_message: m.text })),
  }));
}

const kho = new Map();
const cum = [];
for (const { c, ds: tho } of (tepKho ? tuTep(tepKho) : await tuPancake())) {
  const ds = tho.slice().sort((a, b) => String(a.inserted_at).localeCompare(String(b.inserted_at)));
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
// Nhận cả hai hình dạng: tệp `--ra` thô (`{convId, moc}`) lẫn tệp đã ráp cho màn đối
// chiếu (khoá gộp sẵn ở `id`). Đọc nhầm hình dạng thì khớp 0 lượt và im lặng — đã dính.
const chiGiu = tepChi
  ? new Set(JSON.parse(fs.readFileSync(tepChi, "utf8"))
      .map((x) => String(x.id || `${x.convId}:${x.moc}`)))
  : null;
const chon = cum
  .filter((k) => !chiGiu || chiGiu.has(`${k.convId}:${k.tin[k.tin.length - 1].m.inserted_at}`))
  .filter((k) => String(k.tin[k.tin.length - 1].m.inserted_at) >= mocCat)
  .sort((a, b) => String(a.tin[a.tin.length - 1].m.inserted_at).localeCompare(String(b.tin[b.tin.length - 1].m.inserted_at)))
  .slice(-soLuot);

const { rows: [mdl] } = await pool.query(
  "SELECT nha_cung_cap, ma_model FROM cau_hinh_model WHERE team_id=$1 AND vai_tro='chinh' AND bat LIMIT 1", [trang.team_id]);
console.log(`GIẢ LẬP MỘT MÌNH · page ${pageIdFb} — ${trang.ten}`);
console.log(`  lượt khách sẽ chạy: ${chon.length} (cửa sổ ${soGio}h, gom cụm)`
  + (chiGiu ? ` — KHOÁ theo ${tepChi}: ${chiGiu.size} lượt của lần đo trước, khớp ${chon.length}` : ""));
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

// MẶT BẰNG SẠCH MỘT LẦN, đầu lượt chạy — KHÔNG phải mỗi lượt. Hồ sơ khách phải được
// TÍCH LUỸ qua các lượt của cùng một hội thoại (đó chính là thứ đang đo: bot nhớ được gì
// mà không đọc lại). Nhưng nếu để nguyên hồ sơ của LƯỢT CHẠY TRƯỚC thì tin đầu tiên đã có
// sẵn dữ kiện, và bộ đo chạy hai lần ra hai kết quả.
{
  const psids = [...new Set(chon.map((x) => x.psid))];
  const r = await pool.query(
    `UPDATE hoi_thoai SET ho_so='{}'::jsonb, ai_noi_gi='', ai_noi_luc=NULL, luot_ai=0, sua_luc=now()
      WHERE team_id=$1 AND page_id=$2 AND psid=ANY($3::text[])`,
    [trang.team_id, trang.id, psids]);
  console.log(`  mặt bằng          : xoá hồ sơ + mốc AI của ${r.rowCount}/${psids.length} hội thoại`);
}

const ket = [];
for (const [i, k] of chon.entries()) {
  const cuoi = k.tin[k.tin.length - 1];
  const chu = k.tin.map((x) => x.tho).join("\n");
  hienTai = { convId: k.convId, moc: cuoi.m.inserted_at };
  await baoDamHoiThoai(pool, { teamId: trang.team_id, pageRowId: trang.id, psid: k.psid });
  // ĐẶT LẠI TRƯỚC MỖI LƯỢT — xem ② đầu file. Đây là chỗ giả định «không có ba bên kia».
  // `--khong-nhuong-sale` đi qua ĐÚNG cửa hậu mà `chat/human.js#nhanDienSale` đã mở sẵn:
  // `since = max(now-24h, ho_so.aiResumedAt, ai_noi_luc)`. Đặt `aiResumedAt` = bây giờ thì
  // không tin page nào mới hơn ⇒ không ai bị coi là vừa tiếp quản. KHÔNG sửa mã đường chạy
  // để chiều một phép đo — chỉ dùng cửa mà chính nó khai.
  await pool.query(
    `UPDATE hoi_thoai SET trang_thai='QUALIFY', chu_so_huu='AI', luot_llm=0, moc_luot_llm='[]'::jsonb,
            ly_do_cuoi='', nguoi_that_luc=NULL, sua_luc=now()
            ${khongNhuongSale ? ", ho_so = coalesce(ho_so,'{}'::jsonb) || jsonb_build_object('aiResumedAt', to_char(now() at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SSZ'))" : ""}
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
  // ĐỌC SỔ NGAY, rồi DỌN DÒNG. Câu rút có luật FIFO theo hội thoại: một dòng còn ở `cho`
  // hoặc `loi` chặn mọi tin SAU của cùng khách. Lượt ăn 429 để lại đúng dòng đó ⇒ các lượt
  // sau của khách ấy không bao giờ được xử. Đo lần đầu: 19/84 lượt nằm nguyên ở `cho`.
  const goc = (await pool.query(
    `SELECT trang_thai, ly_do FROM tin_cho_xu_ly WHERE team_id=$1 AND id=$2`,
    [trang.team_id, r.id])).rows[0] || {};
  if (goc.trang_thai === "cho" || goc.trang_thai === "loi" || goc.trang_thai === "dang_xu") {
    await pool.query(
      `UPDATE tin_cho_xu_ly SET trang_thai='xong', khoa_worker=NULL WHERE team_id=$1 AND id=$2`,
      [trang.team_id, r.id]);
  }
  ket.push({ k, chu, tinId: r.id, kq, treMs: Date.now() - t0, goc });

  // NHỊP SAU MỌI LƯỢT CHẠM MODEL — kể cả lượt HỎNG. Hạn của tài khoản là số LỜI GỌI trên
  // phút (đo 22/09: Moonshot trả 429 «organization max RPM: 3»). Bản trước chỉ ngủ khi
  // `dem.goiModel > 0`, mà lượt ném lỗi KHÔNG tăng bộ đếm đó ⇒ lượt sau bắn ngay lập tức
  // ⇒ 429 dây chuyền: 20/84 lượt hỏng liên tiếp. Ngủ theo LƯỢT THỬ, không theo lượt thành.
  const loiNha = /LoiNhaCungCap|429|rate ?limit/i.test(String(kq?.lyDo || ""));
  const chamModel = (kq?.dem?.goiModel || 0) > 0 || loiNha;
  if (i < chon.length - 1 && chamModel) {
    await nghi(Number(arg("--nhip", "7000")) * (loiNha ? 2 : 1));
  }
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
const raJson = [];
let tong = 0, nModel = 0, n0Dong = 0, nCauTraLoi = 0;
const treBot = [], treHo = new Map(), demBen = new Map();
console.log("\n" + "═".repeat(96));
for (const x of ket) {
  const k = x.k;
  const cuoi = k.tin[k.tin.length - 1];
  const s = x.tinId ? mSo.get(String(x.tinId)) : null;
  const t = s ? tienMotDong(s) : { vnd: null };
  const d = x.goc && x.goc.trang_thai ? x.goc : (x.tinId ? mTin.get(String(x.tinId)) : null);
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

  let benTraLoi = null, treThat = null, chuThat = "";
  if (k.traLoi) {
    benTraLoi = benNao(k.traLoi);
    treThat = Math.round((T(k.traLoi.inserted_at) - T(cuoi.m.inserted_at)) / 1000);
    chuThat = che(gon(k.traLoi.original_message || k.traLoi.message));
    demBen.set(benTraLoi, (demBen.get(benTraLoi) || 0) + 1);
    if (!treHo.has(benTraLoi)) treHo.set(benTraLoi, []);
    treHo.get(benTraLoi).push(treThat);
    inKhoi(`🏷  THỰC TẾ · ${benTraLoi} · sau ${treThat}s:`, chuThat.slice(0, 400));
  } else {
    console.log(`  🏷  THỰC TẾ: KHÔNG AI TRẢ LỜI`);
    demBen.set("không ai trả lời", (demBen.get("không ai trả lời") || 0) + 1);
  }

  if (tepRa) {
    let botChu = "";
    if (g?.cho_khach) { botChu = g.cho_khach; try { botChu = JSON.parse(g.cho_khach).text || g.cho_khach; } catch { /* nhiều bước */ } }
    raJson.push({
      convId: k.convId, khach: k.khach, moc: cuoi.m.inserted_at,
      khachNoi: k.tin.map((y) => che(y.tho)),
      bot: {
        chu: String(botChu).split("\\n").join("\n"), noiBo: g?.noi_bo || "",
        lane: s?.lane || "", lyDo: d?.ly_do || "", trangThai: d?.trang_thai || "",
        treMs: x.treMs, tokVao: s?.token_vao ?? null, tokRa: s?.token_ra ?? null, vnd: t.vnd,
        suaTaiCho: s?.du_lieu?.sua_tai_cho || "", biChan: s?.du_lieu?.text_bi_chan || "",
      },
      that: { ben: benTraLoi, treS: treThat, chu: chuThat },
    });
  }
}

const p = (a, q) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * q)] : null; };
console.log("\n" + "═".repeat(96));
console.log(`LƯỢT KHÁCH ${ket.length} · bot trả lời được ${nCauTraLoi} · trong đó ${n0Dong} lượt 0 đồng, ${nModel} lượt gọi model`);
console.log(`TIỀN (giả lập MỘT MÌNH, mọi lượt đều được phép gọi model): ${tong.toLocaleString("vi-VN")}đ ⇒ ${Math.round(tong / Math.max(1, ket.length))}đ/lượt`);
console.log(`ĐỘ TRỄ BOT MÌNH: p50 ${p(treBot, .5)?.toFixed(1)}s · p90 ${p(treBot, .9)?.toFixed(1)}s · max ${Math.max(...treBot).toFixed(1)}s`);
if (tepRa) { fs.writeFileSync(tepRa, JSON.stringify(raJson)); console.log(`\nđã ghi ${raJson.length} lượt vào ${tepRa}`); }
console.log(`\nTHỰC TẾ ai trả lời ${ket.length} lượt này:`);
for (const [b, n] of [...demBen].sort((a, c) => c[1] - a[1])) {
  const a = treHo.get(b);
  console.log(`  ${String(n).padStart(3)} · ${b.padEnd(24)}${a ? ` p50 ${String(p(a, .5)).padStart(5)}s · p90 ${String(p(a, .9)).padStart(6)}s · max ${String(Math.max(...a)).padStart(6)}s` : ""}`);
}
await pool.end(); await poolGui.end();
