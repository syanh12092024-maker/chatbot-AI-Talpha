// BA KHỐI DÙNG CHUNG — Chính sách · FAQ · Phản đối chuyển từ Google Sheet sang v3 (CR-28-09b · MN7).
//
// Điều phải chứng minh: bật `V3_SHEET_CHI_DANH_BA=1` sau khi nạp ba khối vào v3 thì đoạn chữ bot
// ghép vào prompt GIỐNG TỪNG KÝ TỰ lúc còn đọc Sheet (KC4) — khách không thấy gì đổi; và từ đó
// sửa trên v3 là bot đổi ngay, hỏng thì không lưu (KC5–KC7).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import xlsx from "xlsx";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "mn7-"));
process.env.KB_OVERRIDES_FILE = path.join(TMP, "kb-overrides.json");
process.env.KB_CHUNG_FILE = path.join(TMP, "kb-chung.json");
fs.writeFileSync(process.env.KB_OVERRIDES_FILE, JSON.stringify({
  "8001": { products: [{ id: "SP01", name: "Vòng", desc: "", currency: "AED", tiers: [{ label: "Buy 1", price: 99 }], images: [] }] },
}));
const kb = await import("../src/kb.js");
const { sachKhoiChung } = await import("../src/products/khoi-chung.js");
const express = (await import("express")).default;
const { dungSandbox } = await import("../db/sandbox.js");
const { taoRouterAnhSanPham } = await import("../v3/src/ui/van-hanh/router-anh.js");

// Excel nền có ĐÚNG ba tab dùng chung như Sheet (đi chung `ingest` với đường Google Sheet).
const EXCEL = path.join(TMP, "kb.xlsx");
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([
  ["Page ID", "Tên Page", "Thị trường"], ["8001", "Page A", "UAE"],
]), "Sản phẩm theo Page");
const POL = [["Hạng mục", "Nội dung"], ["Giao hàng", "Delivery within 2-4 working days."], ["Thanh toán (COD)", "Cash on Delivery — bayad pagdating ng order."]];
const FAQ = [["Câu hỏi", "", "Trả lời"], ["Bao lâu nhận hàng?", "", "2-4 working days po."]];
const OBJ = [["Loại", "Khách nói", "Cách trả lời"], ["Chê giá", "Mahal naman / Too expensive", "Combo 2pcs is more sulit."]];
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(POL), "Chính sách");
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(FAQ), "FAQ");
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(OBJ), "Xử lý phản đối");
xlsx.writeFile(wb, EXCEL);
const tuSheet = () => sachKhoiChung({
  policies: kb.parsePolicies(POL.slice(1)), faqs: kb.parseFaqs(FAQ.slice(1)), objections: kb.parseObjections(OBJ.slice(1)),
});

test("KC1 · luật làm sạch là MỘT: kb.js dùng lại đúng hàm của v3", () => {
  assert.equal(kb.sachKhoiChung, sachKhoiChung);
  assert.deepEqual(sachKhoiChung({ policies: [{ topic: " A ", content: " b " }, { topic: "", content: "bỏ" }], faqs: "rác" }),
    { policies: [{ topic: "A", content: "b" }], faqs: [], objections: [] });
});

test("KC2 · VẮNG cờ: v3 ghi tệp nhưng bot VẪN đọc Sheet (và báo dangDung=false)", () => {
  delete process.env.V3_SHEET_CHI_DANH_BA;
  kb.loadKB(EXCEL);
  const r = kb.datKhoiChung({ policies: [{ topic: "Khác", content: "Nội dung v3" }] });
  assert.equal(r.dangDung, false);
  assert.doesNotMatch(kb.getKBForPage("8001").text, /Nội dung v3/);
  assert.match(kb.getKBForPage("8001").text, /bayad pagdating/);
});

test("KC3 · BẬT cờ + tệp rỗng ⇒ không còn ba khối, không để tiêu đề trơ", () => {
  kb.datKhoiChung({});
  process.env.V3_SHEET_CHI_DANH_BA = "1";
  try {
    kb.loadKB(EXCEL);
    assert.doesNotMatch(kb.getKBForPage("8001").text, /# CHÍNH SÁCH|# FAQ|# XỬ LÝ PHẢN ĐỐI/);
  } finally { delete process.env.V3_SHEET_CHI_DANH_BA; }
});

test("KC4 · NẠP rồi TẮT Sheet: đoạn chữ bot ghép GIỐNG TỪNG KÝ TỰ lúc còn đọc Sheet", () => {
  delete process.env.V3_SHEET_CHI_DANH_BA;
  kb.loadKB(EXCEL);
  const truoc = kb.getKBForPage("8001").text;
  const chungTruoc = kb.khoiChungHienTai().text;
  kb.datKhoiChung(tuSheet());                       // lượt nạp
  process.env.V3_SHEET_CHI_DANH_BA = "1";
  try {
    kb.loadKB(EXCEL);                                // lượt khởi động lại với cờ
    assert.equal(kb.khoiChungHienTai().nguon, "v3");
    assert.equal(kb.khoiChungHienTai().text, chungTruoc);
    assert.equal(kb.getKBForPage("8001").text, truoc);
  } finally { delete process.env.V3_SHEET_CHI_DANH_BA; }
});

test("KC5 · BẬT cờ: v3 sửa ⇒ đoạn chữ MỌI page đổi NGAY (không chờ khởi động lại)", () => {
  process.env.V3_SHEET_CHI_DANH_BA = "1";
  try {
    kb.loadKB(EXCEL);
    const r = kb.datKhoiChung({ ...tuSheet(), faqs: [{ q: "Có bảo hành?", a: "30-day money-back po." }] });
    assert.equal(r.dangDung, true);
    assert.match(kb.getKBForPage("8001").text, /30-day money-back po\./);
    assert.doesNotMatch(kb.getKBForPage("8001").text, /2-4 working days po\./);
  } finally { delete process.env.V3_SHEET_CHI_DANH_BA; }
});

// ─── cửa ghi v3 qua HTTP thật ─────────────────────────────────────────────────────────
let sb, pool, team, server, base, vai = ["marketer"], botNhan = [], botHong = false;
before(async () => {
  sb = await dungSandbox("mn7");
  pool = sb.pool;
  team = (await pool.query("INSERT INTO team(slug,ten) VALUES('mn7','MN7') RETURNING id")).rows[0].id;
  // team đang giữ bot: có sản phẩm nạp từ bot (nguon='kb')
  await pool.query("INSERT INTO san_pham(team_id,ma,ten,nguon) VALUES($1,'kb:1:SP01','','kb')", [team]);
  const app = express();
  app.use(express.json());
  app.use((q, _s, next) => { q.boiCanh = { teamId: team, nguoiDungId: null, tenDangNhap: "mkt@t.vn", vai }; next(); });
  app.use(taoRouterAnhSanPham({ pool, env: {}, dayKhoiChungLenBot: async (d) => {
    if (botHong) throw new Error("bot không trả lời");
    botNhan.push(d); return { nguon: "v3", dangDung: true };
  } }));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server?.close(); await sb.don(); fs.rmSync(TMP, { recursive: true, force: true }); });
const luu = (body) => fetch(`${base}/api/anh-san-pham/khoi-chung`, {
  method: "POST", headers: { "Content-Type": "application/json", "X-V3-Action": "1" }, body: JSON.stringify(body),
});

test("KC6 · marketer lưu ⇒ bot nhận bản ĐÃ LÀM SẠCH · phiên bản cũ ⇒ 409 · sale ⇒ 403", async () => {
  const r = await luu({ noiDung: { policies: [{ topic: " Giao hàng ", content: "2-4 days" }] }, phienBan: 0 });
  assert.equal(r.status, 200, await r.clone().text());
  assert.equal((await r.json()).phienBan, 1);
  assert.deepEqual(botNhan.at(-1), { policies: [{ topic: "Giao hàng", content: "2-4 days" }], faqs: [], objections: [] });
  assert.equal((await luu({ noiDung: {}, phienBan: 0 })).status, 409);
  vai = ["sale"];
  try { assert.equal((await luu({ noiDung: {}, phienBan: 1 })).status, 403); } finally { vai = ["marketer"]; }
  const nk = (await pool.query("SELECT count(*)::int n FROM nhat_ky WHERE hanh_dong='v3_sua_khoi_dung_chung'")).rows[0].n;
  assert.equal(nk, 1);
});

test("KC7 · bot HỎNG ⇒ không lưu: CSDL giữ bản cũ", async () => {
  botHong = true;
  try {
    const r = await luu({ noiDung: { policies: [{ topic: "Đổi", content: "x" }] }, phienBan: 1 });
    assert.equal(r.status, 502);
  } finally { botHong = false; }
  const d = (await pool.query("SELECT phien_ban, noi_dung FROM khoi_dung_chung WHERE team_id=$1", [team])).rows[0];
  assert.equal(d.phien_ban, 1);
  assert.equal(d.noi_dung.policies[0].topic, "Giao hàng");
});

test("KC8 · LUẬT TÁCH TEAM: team khác sửa ⇒ 403; hai team THẬT cùng trên bot ⇒ 409; team kỹ thuật không tính", async () => {
  const khac = (await pool.query("INSERT INTO team(slug,ten) VALUES('mn7b','B') RETURNING id")).rows[0].id;
  const kt = (await pool.query("SELECT id FROM team WHERE la_ky_thuat LIMIT 1")).rows[0]?.id;
  if (kt) await pool.query("INSERT INTO san_pham(team_id,ma,ten,nguon) VALUES($1,'kb:9:SP01','','kb')", [kt]);
  assert.equal((await luu({ noiDung: {}, phienBan: 1 })).status, 200, "team kỹ thuật không làm hỏng quyền của team thật");
  const cu = team; team = khac;
  try {
    assert.equal((await luu({ noiDung: {}, phienBan: 0 })).status, 403);
    await pool.query("INSERT INTO san_pham(team_id,ma,ten,nguon) VALUES($1,'kb:2:SP01','','kb')", [khac]);
    assert.equal((await luu({ noiDung: {}, phienBan: 0 })).status, 409);
  } finally { team = cu; }
  assert.equal((await luu({ noiDung: {}, phienBan: 2 })).status, 409, "hai team thật ⇒ không ai sửa được, kể cả team cũ");
});
