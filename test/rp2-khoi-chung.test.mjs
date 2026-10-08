// RP2 ② 1 · ④1 · ④2 — KHỐI CHÍNH SÁCH · FAQ · PHẢN ĐỐI vào nhánh cờ BẬT của `rap-prompt.js#rapKb`, đọc THEO TEAM từ bảng
// `khoi_dung_chung` (`products/khoi-chung.js#docKhoiChung` — cùng nguồn màn `/khoi-chung` ghi), dựng bằng ĐÚNG hàm đường cũ
// (`kb.js#buildShared` sau `sachKhoiChung`). Postgres HỘP CÁT riêng (`aicloser_v3_test_rp2k_p<pid>`, tự dựng tự dọn) · KHÔNG mạng.
//
// Đoạn đường cũ để so TỪNG KÝ TỰ là đoạn THẬT của `kb.js` (cờ `V3_SHEET_CHI_DANH_BA=1` · `datKhoiChung` ghi tệp TẠM · `getKBForPage`
// của một page trong bản chép) — không phải `''` (review (a) N3: dựng sai thì `text.includes('')` luôn đúng).
// Nhánh KHÔNG chạm: CSDL chưa áp 026 (`docKhoiChung` trả `chuaCo` — lưới có sẵn của hàm đọc, ca riêng ở mn7) · màn «Prompt của page».
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

// Tệp ghi của kb.js trỏ THƯ MỤC TẠM trước khi nạp module (KB_CHUNG_FILE là hằng lúc nạp — kb.js:14).
const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "rp2k-"));
process.env.KB_OVERRIDES_FILE = path.join(TMP, "kb-overrides.json");
process.env.KB_CHUNG_FILE = path.join(TMP, "kb-chung.json");
fs.writeFileSync(process.env.KB_OVERRIDES_FILE, JSON.stringify({
  "rp2-cu": { products: [{ id: "SP01", name: "Gel", desc: "", currency: "SAR", tiers: [{ label: "Buy 1", price: 99 }], images: [] }] },
}));
const kb = await import("../src/kb.js");
const { rapKb } = await import("../src/chat/rap-prompt.js");
const { sachKhoiChung, luuKhoiChung } = await import("../src/products/khoi-chung.js");
const { dungSandbox } = await import("../db/sandbox.js");

const KHOI_T = {
  policies: [{ topic: "Giao hàng", content: "2–4 ngày" }, { topic: "Đổi trả", content: "7 ngày nếu hàng lỗi" }],
  faqs: [{ q: "Có COD không?", a: "Có, trả tiền khi nhận hàng" }],
  objections: [{ type: "Chê đắt", says: "Mahal naman", reply: "Combo 2 hộp tiết kiệm hơn, COD kiểm hàng" }],
};
const DONG_T = [
  "- Giao hàng: 2–4 ngày",
  "- Hỏi: Có COD không?\n  Đáp: Có, trả tiền khi nhận hàng",
  '- Chê đắt (khách: "Mahal naman") → Combo 2 hộp tiết kiệm hơn, COD kiểm hàng',
];
const TIEU_DE = ["# CHÍNH SÁCH", "# FAQ", "# XỬ LÝ PHẢN ĐỐI"];
const dem = (s, sub) => s.split(sub).length - 1;
const ENV = { V3_RAP_PROMPT_BAT: "1", V3_SHEET_CHI_DANH_BA: "1", V3_LUAT_CHUNG_CSDL: undefined };
const envCu = {};

let sb, T, T2, T3, poolRieng;
let soDocKhoi = 0;
// Pool ĐẾM lượt đọc `khoi_dung_chung` (mọi thứ khác chuyển thẳng sang pool hộp cát).
const poolDem = () => new Proxy(sb.pool, {
  get(t, k) {
    if (k === "query") return (...a) => { if (/khoi_dung_chung/.test(String(a[0]?.text ?? a[0]))) soDocKhoi += 1; return t.query(...a); };
    const v = t[k]; return typeof v === "function" ? v.bind(t) : v;
  },
});

before(async () => {
  for (const [k, v] of Object.entries(ENV)) { envCu[k] = process.env[k]; if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  sb = await dungSandbox("rp2k");
  poolRieng = new pg.Pool({ connectionString: sb.url, max: 1 });   // «tiến trình giao diện» — KHÔNG đi qua hàm nào của rapKb
  console.log(`   [rp2k] hộp cát ${sb.ten} · tệp đo ${fileURLToPath(new URL("../src/chat/rap-prompt.js", import.meta.url))} · KB_CHUNG_FILE ${process.env.KB_CHUNG_FILE}`);
  const q = (s, a) => sb.pool.query(s, a);
  T = String((await q("SELECT id FROM team WHERE slug='tieu-alpha'")).rows[0].id);
  T2 = String((await q("INSERT INTO team(slug,ten) VALUES('rp2-t2','RP2 T2') RETURNING id")).rows[0].id);
  T3 = String((await q("INSERT INTO team(slug,ten) VALUES('rp2-t3','RP2 T3') RETURNING id")).rows[0].id);
  for (const [team, pid] of [[T, "rp2-pt"], [T2, "rp2-pt2"], [T3, "rp2-pt3"]]) {
    const p = (await q("INSERT INTO page(team_id,page_id,ten) VALUES($1,$2,'RP2') RETURNING id", [team, pid])).rows[0].id;
    const s = (await q("INSERT INTO san_pham(team_id,page_id,ma,ten,mo_ta) VALUES($1,$2,$3,'Gel RP2','gel giảm đau') RETURNING id", [team, p, `rp2:${pid}`])).rows[0].id;
    await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te) VALUES($1,$2,1,9900,'SAR')", [team, s]);
  }
  await q(`INSERT INTO ky_nang (team_id, ma, ten, noi_dung, bat_cho_nhom_sp, bat) VALUES ($1,'rp2_kn','Kỹ năng RP2','Hỏi nhu cầu trước khi báo giá',$2,true)`, [T, []]);
  // Team T: lưu bằng CỬA LƯU THẬT của màn /khoi-chung (cùng hàm router-anh.js gọi). Team T3: có dòng nhưng ba khối RỖNG.
  await luuKhoiChung(sb.pool, T, KHOI_T, { nguoiSua: "rp2" });
  await luuKhoiChung(sb.pool, T3, { policies: [], faqs: [], objections: [] }, { nguoiSua: "rp2" });
});
after(async () => {
  for (const [k, v] of Object.entries(envCu)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  await poolRieng?.end();
  if (sb) await sb.don();
  fs.rmSync(TMP, { recursive: true, force: true });
});

// ── ④1 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("K1a · team T có khối ⇒ rapKb (cờ bật, page team T) chứa ĐÚNG chữ cụ thể: «Giao hàng: 2–4 ngày» · FAQ · phản đối — mỗi tiêu đề đúng 1 lần", async () => {
  const kbT = await rapKb(sb.pool, { teamId: T, pageIdText: "rp2-pt" });
  assert.equal(kbT.nguon, "db");
  for (const d of DONG_T) assert.ok(kbT.text.includes(d), `thiếu dòng: ${d}`);
  for (const t of TIEU_DE) assert.equal(dem(kbT.text, t), 1, `tiêu đề ${t} xuất hiện ${dem(kbT.text, t)} lần`);
});

test("K1b · khối trùng TỪNG KÝ TỰ với đoạn ĐƯỜNG CŨ dựng cho cùng nội dung (kb.js thật: datKhoiChung → getKBForPage) — tệp ghi ngoài gốc repo", async () => {
  assert.ok(!path.resolve(process.env.KB_CHUNG_FILE).startsWith(GOC + path.sep), `KB_CHUNG_FILE trỏ vào repo: ${process.env.KB_CHUNG_FILE}`);
  kb.loadKB(path.join(TMP, "khong-co.xlsx"));            // đường cũ: không Excel nền ⇒ bản chép kb-overrides + ba khối từ tệp v3
  kb.datKhoiChung(KHOI_T);                               // đường cũ ghi tệp (cờ V3_SHEET_CHI_DANH_BA=1 ⇒ có hiệu lực ngay)
  const doanCu = kb.khoiChungHienTai().text;
  assert.ok(doanCu.includes("Giao hàng: 2–4 ngày"), "đoạn đường cũ rỗng/sai — phép so vô nghĩa");
  assert.ok(kb.getKBForPage("rp2-cu").text.endsWith("\n" + doanCu), "đoạn so phải đúng là đoạn getKBForPage ghép vào prompt");
  const s = sachKhoiChung(KHOI_T);
  assert.equal(doanCu, kb.buildShared(s.policies, s.faqs, s.objections));
  const kbT = await rapKb(sb.pool, { teamId: T, pageIdText: "rp2-pt" });
  assert.ok(kbT.text.includes(doanCu), "khối của đường CSDL lệch đoạn đường cũ");
});

test("K1c · vị trí như đường cũ: SAU khối sản phẩm, TRƯỚC khối kỹ năng", async () => {
  const { text } = await rapKb(sb.pool, { teamId: T, pageIdText: "rp2-pt" });
  const iSp = text.indexOf("# SẢN PHẨM & GIÁ"), iCs = text.indexOf("# CHÍNH SÁCH"), iKn = text.indexOf("# KỸ NĂNG TƯ VẤN");
  assert.ok(iSp >= 0 && iCs >= 0 && iKn >= 0, `thiếu khối (sp ${iSp} · chính sách ${iCs} · kỹ năng ${iKn})`);
  assert.ok(iSp < iCs && iCs < iKn, `thứ tự sai: sp ${iSp} · chính sách ${iCs} · kỹ năng ${iKn}`);
});

test("K1d · page team KHÁC (T2 chưa có khối) ⇒ KHÔNG có khối của T, không tiêu đề trơ", async () => {
  const { text, nguon } = await rapKb(sb.pool, { teamId: T2, pageIdText: "rp2-pt2" });
  assert.equal(nguon, "db");
  assert.ok(text.includes("Gel RP2"), "phải ra khối sản phẩm của page T2 (ca đi đúng nhánh cờ bật)");
  assert.ok(!text.includes("2–4 ngày") && !text.includes("Mahal naman"), "khối của team T lọt sang page team T2");
  for (const t of TIEU_DE) assert.equal(dem(text, t), 0, `tiêu đề trơ ${t}`);
});

test("K1e · team có dòng nhưng ba khối RỖNG ⇒ không chèn tiêu đề trơ", async () => {
  const { text } = await rapKb(sb.pool, { teamId: T3, pageIdText: "rp2-pt3" });
  for (const t of TIEU_DE) assert.equal(dem(text, t), 0, `tiêu đề trơ ${t}`);
});

test("K1f · nguon_thieu KHÔNG thêm khối chung (giữ đúng bốn khối cũ — neo l2-m3)", async () => {
  const a = await rapKb(sb.pool, { teamId: T, pageIdText: "rp2-pt" });
  const b = await rapKb(sb.pool, { teamId: T2, pageIdText: "rp2-pt2" });
  for (const k of [...a.nguon_thieu, ...b.nguon_thieu]) assert.ok(["bo_luat_chung", "ky_nang", "kich_ban", "san_pham"].includes(k), `nguon_thieu lạ: ${k}`);
  assert.deepEqual(b.nguon_thieu, ["bo_luat_chung", "ky_nang", "kich_ban"]);
});

test("K1g · cờ TẮT ⇒ đường cũ nguyên vẹn, 0 lượt đọc khoi_dung_chung · cờ BẬT ⇒ đọc MỖI lượt (2 lượt ⇒ 2 lần đọc)", async () => {
  soDocKhoi = 0;
  delete process.env.V3_RAP_PROMPT_BAT;
  try {
    const cu = await rapKb(poolDem(), { teamId: T, pageIdText: "rp2-pt" });
    assert.equal(cu.nguon, "kb_cu");
    assert.equal(soDocKhoi, 0);
  } finally { process.env.V3_RAP_PROMPT_BAT = "1"; }
  await rapKb(poolDem(), { teamId: T, pageIdText: "rp2-pt" });
  await rapKb(poolDem(), { teamId: T, pageIdText: "rp2-pt" });
  assert.equal(soDocKhoi, 2);
});

// ── ④2 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("K2a · ghi khối bằng SQL THÔ trên pool RIÊNG (tiến trình giao diện) ⇒ lượt rapKb kế THẤY NGAY, không khởi động lại — sửa team T + thêm team T2", async () => {
  const truoc = await rapKb(sb.pool, { teamId: T, pageIdText: "rp2-pt" });
  assert.ok(truoc.text.includes("- Giao hàng: 2–4 ngày"));
  const moi = { ...KHOI_T, policies: [{ topic: "Giao hàng", content: "5–7 ngày (mùa lễ)" }] };
  await poolRieng.query(
    `UPDATE khoi_dung_chung SET noi_dung=$2::jsonb, phien_ban=phien_ban+1, sua_luc=now() WHERE team_id=$1`, [T, JSON.stringify(moi)]);
  await poolRieng.query(
    `INSERT INTO khoi_dung_chung(team_id,noi_dung,phien_ban,nguoi_sua) VALUES($1,$2::jsonb,1,'sql-tho')`,
    [T2, JSON.stringify({ policies: [{ topic: "Bảo hành", content: "30 ngày hoàn tiền" }], faqs: [], objections: [] })]);
  const sau = await rapKb(sb.pool, { teamId: T, pageIdText: "rp2-pt" });
  assert.ok(sau.text.includes("- Giao hàng: 5–7 ngày (mùa lễ)"), "bản mới không tới lượt kế (khối nhớ RAM?)");
  assert.ok(!sau.text.includes("2–4 ngày"), "bản cũ còn trong prompt");
  const t2 = await rapKb(sb.pool, { teamId: T2, pageIdText: "rp2-pt2" });
  assert.ok(t2.text.includes("- Bảo hành: 30 ngày hoàn tiền"), "team T2 vừa có khối mà page T2 chưa thấy");
  assert.ok(!t2.text.includes("5–7 ngày"), "khối T lọt sang T2");
});
