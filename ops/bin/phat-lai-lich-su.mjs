#!/usr/bin/env node
// PHÁT LẠI LỊCH SỬ — bắn tin khách CŨ vào ĐÚNG cỗ máy thật, đo câu trả lời và tiền.
//
// ═══ KHÔNG MÔ PHỎNG — CHẠY CHÍNH NÓ ════════════════════════════════════════════════
// Bộ đo trước (`gia-lap-dong-thoi-gian.mjs`) dựng lại prompt để ƯỚC token; nó không gọi
// model nên không biết bot SẼ VIẾT GÌ. Bộ này khác: nó xếp tin thật vào `tin_cho_xu_ly`
// rồi gọi `chayToiKhiHet` — worker thật, hàng đợi thật, năm cửa lọc thật, `handler-v3`
// thật, model thật. Thứ duy nhất bị chặn là đường ra Pancake.
//
// ⛔ AN TOÀN: đòi `V3_DIEN_TAP=1`. Ở chế độ đó `bocCuaGuiBen` GHI nội dung vào `lan_gui`
//    với `trang_thai='dien_tap'` rồi DỪNG — không một byte nào tới Pancake. Kiểm ngay đầu
//    chương trình, thiếu là thoát: một bộ «phát lại» mà lỡ gửi thật là gửi cho người thật,
//    những câu của tuần trước, giữa đêm.
//
// ═══ PHÁT LẠI TRUNG THỰC: CẮT LỊCH SỬ ═════════════════════════════════════════════
// Worker đọc lại lịch sử hội thoại ngay trước khi gọi model (`worker.js:126`). Nếu để nó
// đọc lịch sử HÔM NAY thì bot nhìn thấy cả những câu xảy ra SAU tin đang xử — nó trả lời
// một câu hỏi mà nó đã biết đáp án. Nên `docTin` bị tiêm: mỗi lượt chỉ trả lịch sử TÍNH
// ĐẾN tin đang phát.
//
// ⚠️ TÍNH ĐẾN, tức là BAO GỒM chính tin đó (`<=`, không phải `<`). Ở bản thật, lúc worker
//    rút việc thì tin của khách ĐÃ nằm trên Pancake rồi. Cắt hở nó ra thì tin cuối trong
//    lịch sử luôn là câu của page, và cửa «nhường page» bắn nhầm 100% số lượt — đo lần
//    đầu đúng như vậy: 1/1 tin ra `nhuong_page`, 0 lượt gọi model.
//
// Chạy:
//   DEVENV=<.env> node ops/bin/phat-lai-lich-su.mjs --page <id> --so 30
//   thêm --that để THỰC SỰ gọi model (mặc định chỉ in dự toán rồi dừng)
import fs from "node:fs";
import pg from "pg";

const arg = (t, md) => { const i = process.argv.indexOf(t); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : md; };
const pageIdFb = arg("--page", "");
const soTin = Number(arg("--so", 30));
const chayThat = process.argv.includes("--that");
if (!pageIdFb || !process.env.DEVENV) {
  console.error("Dùng: DEVENV=<.env> node ops/bin/phat-lai-lich-su.mjs --page <id> [--so 30] [--that]");
  process.exit(2);
}
const env = Object.fromEntries(fs.readFileSync(process.env.DEVENV, "utf8").split("\n")
  .filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;

if (process.env.V3_DIEN_TAP !== "1") {
  console.error("⛔ TỪ CHỐI: cần V3_DIEN_TAP=1. Không có nó, lượt phát lại sẽ GỬI THẬT cho khách.");
  process.exit(2);
}
if (!/@(127\.0\.0\.1|localhost|\[::1\])[:/]/.test(env.DATABASE_URL_V3 || "")) {
  console.error("Chỉ chạy trên PostgreSQL local."); process.exit(2);
}

const pool = new pg.Pool({ connectionString: env.DATABASE_URL_V3, max: 6 });
const poolGui = new pg.Pool({ connectionString: env.DATABASE_URL_V3, max: 2 });
const { rows: [trang] } = await pool.query("SELECT id, team_id, ten FROM page WHERE page_id=$1", [pageIdFb]);
if (!trang) { console.error(`Không có page ${pageIdFb}.`); process.exit(1); }

const { docTokenSong } = await import("../../src/token-pancake.js");
const { datKhoTokenDb } = await import("../../src/pancake.js");
datKhoTokenDb(() => docTokenSong(pool));
const [tok] = await docTokenSong(pool);
if (!tok) { console.error("Không có token Pancake nào đang bật."); process.exit(1); }

const GET = async (u) => (await fetch(u, { signal: AbortSignal.timeout(20000) })).json().catch(() => ({}));
const gon = (s) => String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const che = (s) => String(s).replace(/[\w.+-]+@[\w.-]+\.\w+/g, "<EMAIL>").replace(/[+(]?\d[\d\s().-]{6,}\d/g, "<SĐT>");
const laPage = (m) => String(m?.from?.id) === String(pageIdFb);

// ── gom tin khách THẬT, mới nhất trước ───────────────────────────────────────
const jc = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations?access_token=${tok}&page_number=1`);
const kho = new Map();
const ungVien = [];
for (const c of (jc.conversations || []).filter((x) => x.from_psid && (x.customers || [])[0]?.id)) {
  const jm = await GET(`https://pages.fm/api/v1/pages/${pageIdFb}/conversations/${c.id}/messages?access_token=${tok}&customer_id=${c.customers[0].id}`);
  const ds = (jm.messages || []).slice().sort((a, b) => String(a.inserted_at).localeCompare(String(b.inserted_at)));
  if (!ds.length) continue;
  kho.set(c.id, { conv: c, ds });
  for (const m of ds) {
    if (laPage(m) || !gon(m.original_message || m.message)) continue;
    ungVien.push({ convId: c.id, psid: c.from_psid, custId: c.customers[0].id, m, khach: c.from?.name || "" });
  }
}
ungVien.sort((a, b) => String(b.m.inserted_at).localeCompare(String(a.m.inserted_at)));

// ── VÌ SAO BỎ QUA 24 GIỜ GẦN NHẤT ───────────────────────────────────────────
// `chat/human.js#nhanDienSale` coi một tin của page là NGƯỜI THẬT khi nó nằm trong 24 giờ
// GẦN NHẤT — cửa sổ tính từ BÂY GIỜ, không phải từ thời điểm tin được phát. Phát lại tin
// của hôm nay ⇒ lịch sử chứa câu sale vừa gõ ⇒ hội thoại bị bàn giao ⇒ bot im, và phép đo
// không đo được câu trả lời nào (đo 21/09: 5/5 lượt ra `chan_guard`).
//
// Đây là GIỚI HẠN CỦA VIỆC PHÁT LẠI, không phải lỗi của bot: cửa nhường sale làm đúng
// việc của nó trên dữ liệu hôm nay. Nên mặc định chọn tin CŨ HƠN 24 GIỜ — ở đó cửa im và
// ta đo được thứ cần đo. `--moi` để phát tin mới nhất và xem chính cửa nhường sale chạy.
const CAT_24H = new Date(Date.now() - 24 * 3600e3).toISOString().slice(0, 19);
const phatMoi = process.argv.includes("--moi");
const nguon = phatMoi ? ungVien : ungVien.filter((x) => String(x.m.inserted_at) < CAT_24H);
const chon = nguon.slice(0, soTin).reverse();

// ── dự toán trước khi tiêu tiền ──────────────────────────────────────────────
const { config } = await import("../../src/config.js");
// Model THẬT của đường v3 nằm ở `cau_hinh_model` (vai `chinh`), KHÔNG phải `config` của
// `.env` — in nhầm chỗ này là dự toán cho một model khác cái sắp chạy.
const { rows: [mdl] } = await pool.query(
  "SELECT nha_cung_cap, ma_model FROM cau_hinh_model WHERE team_id=$1 AND vai_tro='chinh' AND bat LIMIT 1",
  [trang.team_id]);
console.log(`PHÁT LẠI · page ${pageIdFb} — ${trang.ten}`);
console.log(`  tin khách sẽ phát : ${chon.length}${phatMoi ? " (gồm cả 24h gần nhất)" : ` (cũ hơn 24h — xem chú thích CAT_24H; có ${ungVien.length} tin ứng viên)`}`);
console.log(`  model (cau_hinh_model, vai chính) : ${mdl ? `${mdl.nha_cung_cap} · ${mdl.ma_model}` : `(chưa cấu hình — lùi về ${config.aiProvider}/${config.modelCloser})`}`);
console.log(`  van gửi           : V3_DIEN_TAP=1 · V3_PANCAKE_GUI=${JSON.stringify(process.env.V3_PANCAKE_GUI)} — KHÔNG gửi cho khách`);
console.log(`  DỰ TOÁN xấu nhất  : ${chon.length} × ~110đ = ${(chon.length * 110).toLocaleString("vi-VN")}đ (nếu MỌI tin đều gọi model)`);
if (!chayThat) {
  console.log(`\n(chưa chạy — thêm --that để thực sự gọi model)`);
  await pool.end(); await poolGui.end(); process.exit(0);
}

// ── phát lại từng tin, lịch sử CẮT trước tin đó ──────────────────────────────
const { chayMotVong } = await import("../../src/queue/worker.js");
const { xepTin } = await import("../../src/queue/kho.js");
// Ở bản thật `napTuPoll` tạo dòng `hoi_thoai` TRƯỚC khi xếp tin (cua-messenger §2 «Hệ quả
// bắt buộc»). Bỏ bước này thì handler ném `LoiThieuHoiThoai` và mọi lượt ra `thu_lai` —
// đo lần đầu đúng như vậy.
const { baoDamHoiThoai } = await import("../../src/chat/kho.js");
// Mỗi lượt chạy một MÃ RIÊNG: `UNIQUE (page_id, conv_id, msg_id)` chặn phát lại cùng một
// tin hai lần, mà chạy lại chính là việc bộ này sinh ra để làm.
const maLuot = Date.now().toString(36);
let hienTai = null;                    // tin đang phát — `docTin` tiêm đọc biến này
const docTinCat = async () => {
  if (!hienTai) return [];
  const { ds } = kho.get(hienTai.convId);
  return ds.filter((x) => String(x.inserted_at) <= String(hienTai.moc));
};

// ── MẶT BẰNG SẠCH ────────────────────────────────────────────────────────────
// Đo thật 21/09: 49/65 dòng `hoi_thoai` đang ở `HANDOFF/SALE` — do các lượt worker
// trước nhận diện sale thật đang trả lời. Cửa `hoi_thoai_khong_thuoc_ai` vì thế chặn
// gần hết, và phép đo không đo được câu trả lời nào.
//
// Đặt lại các hội thoại ĐƯỢC PHÁT về `GREET/AI`. Đây là lựa chọn CÓ CHỦ ĐÍCH và nó đổi
// thứ đang đo: ta đo «bot sẽ nói gì với tin này», KHÔNG đo «bot sẽ nói gì với tin này
// trong hội thoại đã bị sale tiếp quản». Muốn đo cái thứ hai thì bỏ bước này (`--giu`).
const giuTrangThai = process.argv.includes("--giu");
if (!giuTrangThai) {
  const psids = [...new Set(chon.map((x) => x.psid))];
  const r = await pool.query(
    `UPDATE hoi_thoai SET trang_thai='GREET', chu_so_huu='AI', sua_luc=now()
      WHERE team_id=$1 AND page_id=$2 AND psid=ANY($3::text[]) AND (trang_thai<>'GREET' OR chu_so_huu<>'AI')`,
    [trang.team_id, trang.id, psids]);
  console.log(`  mặt bằng          : đặt lại ${r.rowCount}/${psids.length} hội thoại về GREET/AI (thêm --giu để giữ nguyên)`);
}

const ket = [];
for (const [i, x] of chon.entries()) {
  const chu = gon(x.m.original_message || x.m.message);
  hienTai = { convId: x.convId, moc: x.m.inserted_at };
  await baoDamHoiThoai(pool, { teamId: trang.team_id, pageRowId: trang.id, psid: x.psid });
  const r = await xepTin(pool, {
    teamId: trang.team_id, pageId: pageIdFb, psid: x.psid, convId: x.convId,
    custId: x.custId, msgId: `phatlai:${maLuot}:${x.m.id}`, noiDung: chu, hoanMs: 0,
  });
  if (!r.them) { ket.push({ x, chu, bo: "trùng — đã phát rồi" }); continue; }
  const t0 = Date.now();
  let kq;
  try { kq = await chayMotVong(pool, { pageIds: [pageIdFb], poolGui, docTin: docTinCat }); }
  catch (e) { kq = { ketQua: "NÉM", lyDo: String(e?.message || e).slice(0, 120) }; }
  ket.push({ x, chu, tinId: r.id, kq, treMs: Date.now() - t0 });
  process.stderr.write(`\r  đã phát ${i + 1}/${chon.length}…`);
}
process.stderr.write("\r" + " ".repeat(40) + "\r");

// ── đọc lại sổ: bot ĐỊNH gửi gì, tốn bao nhiêu ───────────────────────────────
const ids = ket.filter((k) => k.tinId).map((k) => k.tinId);
const { rows: gui } = await pool.query(
  `SELECT tin_id, string_agg(noi_dung::text, E'\\n' ORDER BY buoc) AS noi_dung
     FROM lan_gui WHERE team_id=$1 AND tin_id=ANY($2::bigint[]) GROUP BY tin_id`, [trang.team_id, ids]);
const { rows: so } = await pool.query(
  `SELECT nguon_dong AS tin_id, loai, lane, ma_model, token_vao, token_ra, cache_doc, cache_ghi, du_lieu
     FROM so_ai WHERE team_id=$1 AND nguon_dong=ANY($2::bigint[])`, [trang.team_id, ids]);
const mGui = new Map(gui.map((r) => [String(r.tin_id), r.noi_dung]));
const mSo = new Map(so.map((r) => [String(r.tin_id), r]));

const { tienMotDong } = await import("../../src/admin-v3/chi-phi-tin.js");
let tong = 0, nModel = 0, nMien = 0;
console.log("\n" + "═".repeat(94));
for (const k of ket) {
  const s = k.tinId ? mSo.get(String(k.tinId)) : null;
  const t = s ? tienMotDong(s) : { vnd: null };
  if (t.vnd != null) { tong += t.vnd; nModel += 1; } else if (k.tinId) nMien += 1;
  console.log(`\n${String(k.x.m.inserted_at).slice(5, 16)} · ${k.x.khach || k.x.psid}`);
  console.log(`  👤 ${che(k.chu).slice(0, 88)}`);
  if (k.bo) { console.log(`  ⏭  ${k.bo}`); continue; }
  const gt = mGui.get(String(k.tinId));
  if (gt) {
    let txt = gt; try { const j = JSON.parse(gt); txt = j.text || gt; } catch { /* nhiều bước */ }
    console.log(`  🤖 ĐỊNH GỬI:`);
    for (const d of String(txt).split("\\n").join("\n").split("\n")) console.log(`     │ ${d}`);
  } else {
    console.log(`  🤖 (không gửi gì) — ${k.kq?.ketQua || "?"}${k.kq?.lyDo ? ` · ${String(k.kq.lyDo).slice(0, 70)}` : ""}`);
  }
  console.log(`  ⏱  ${(k.treMs / 1000).toFixed(1)}s · ${s ? `${s.loai}/${s.lane || "-"} · ${s.token_vao ?? 0}+${s.token_ra ?? 0} token · ${t.vnd == null ? "chưa đo được" : t.vnd + "đ"}` : "0 đồng"}`);
}
console.log("\n" + "═".repeat(94));
console.log(`TỔNG ${ket.length} tin phát lại · ${nModel} lượt gọi model · ${nMien} lượt 0 đồng`);
console.log(`TIỀN THẬT: ${tong.toLocaleString("vi-VN")}đ  ⇒  ${Math.round(tong / Math.max(1, ket.length))}đ/tin khách`);
await pool.end(); await poolGui.end();
