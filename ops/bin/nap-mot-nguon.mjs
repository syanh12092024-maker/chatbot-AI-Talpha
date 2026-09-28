#!/usr/bin/env node
// NẠP MỘT LƯỢT `kb-overrides.json` → CSDL v3 (CR-28-09b · MN2). Lõi: `src/products/nap-tu-kb.js`.
//
//   node --env-file=.env ops/bin/nap-mot-nguon.mjs                 → CHẠY THỬ: kế hoạch + vòng khứ hồi, KHÔNG ghi
//   node --env-file=.env ops/bin/nap-mot-nguon.mjs --ghi           → ghi, MỘT giao dịch cho cả lượt
//   node ops/bin/nap-mot-nguon.mjs --khong-csdl [--kb <tệp>]       → chỉ kế hoạch + khứ hồi, không nối CSDL
//
// ⛔ --ghi từ chối nếu CÒN page nào khứ hồi lệch: ghi một bản chép không khớp bot là lượt lưu
//    đầu tiên trên v3 sẽ đổi lời bot nói ở chỗ không ai sửa.
// ⛔ Không đẩy gì sang bot: bot đã giữ đúng dữ liệu này (khứ hồi chứng minh), nạp chỉ đưa nó
//    vào chỗ sửa được.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const thamSo = (ten, mac) => { const i = process.argv.indexOf(ten); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : mac; };
const GHI = process.argv.includes("--ghi");
const KHONG_CSDL = process.argv.includes("--khong-csdl");
const TEP = path.resolve(thamSo("--kb", path.join(GOC, "kb-overrides.json")));

// kb.js đọc KB_OVERRIDES_FILE lúc nạp — trỏ sang tệp đang nạp để không bao giờ chạm tệp khác.
process.env.KB_OVERRIDES_FILE = TEP;
const { keHoachPage, kiemKhuHoi, ghiKeHoach } = await import("../../src/products/nap-tu-kb.js");

const ov = JSON.parse(fs.readFileSync(TEP, "utf8"));
const trang = Object.entries(ov).filter(([, v]) => Array.isArray(v?.products));
const ke = trang.map(([pid, v]) => ({ ...keHoachPage(pid, v.products), lech: "" }));
for (const k of ke) k.lech = kiemKhuHoi(k, ov[k.pageId].products);

const tong = (f) => ke.reduce((a, k) => a + f(k), 0);
console.log(`Tệp: ${TEP}`);
console.log(`Page: ${ke.length} · sản phẩm: ${tong((k) => k.sanPham.length)} · bậc giá: ${tong((k) => k.sanPham.reduce((a, s) => a + s.goi.length, 0))} · ảnh: ${tong((k) => k.sanPham.reduce((a, s) => a + s.anh.length, 0))}`);
const lech = ke.filter((k) => k.lech);
console.log(`Vòng khứ hồi: ${ke.length - lech.length}/${ke.length} khớp${lech.length ? " — LỆCH:" : ""}`);
for (const k of lech) console.log(`  ✖ ${k.pageId}: ${k.lech}`);
const cb = ke.flatMap((k) => k.canhBao);
const nhom = new Map();
for (const c of cb) { const loai = c.replace(/^[^:]+: /, "").replace(/[«"].*?[»"]/g, "…").replace(/\d+/g, "#"); nhom.set(loai, (nhom.get(loai) || 0) + 1); }
console.log(`Cảnh báo: ${cb.length}`);
for (const [loai, n] of [...nhom].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)} × ${loai}`);
if (process.argv.includes("--chi-tiet")) for (const c of cb) console.log(`    · ${c}`);

// Ảnh theo nơi chứa — số ảnh sẽ hỏng khi gửi nằm ở đây, sửa là việc của người trên màn (MN4).
const host = new Map();
for (const k of ke) for (const s of k.sanPham) for (const a of s.anh) {
  let h; try { h = a.duong.startsWith("/") ? "(tệp máy mình /uploads)" : new URL(a.duong).host; } catch { h = "(hỏng)"; }
  host.set(h, (host.get(h) || 0) + 1);
}
console.log("Ảnh theo nơi chứa:"); for (const [h, n] of host) console.log(`  ${String(n).padStart(4)} · ${h}`);

if (KHONG_CSDL) process.exit(lech.length ? 1 : 0);

const { taoPool } = await import("../../db/ket-noi.js");
const pool = taoPool();
try {
  const dong = (await pool.query("SELECT * FROM page WHERE page_id = ANY($1)", [ke.map((k) => k.pageId)])).rows;
  const theoPid = new Map();
  for (const d of dong) { if (!theoPid.has(d.page_id)) theoPid.set(d.page_id, []); theoPid.get(d.page_id).push(d); }
  const thieu = ke.filter((k) => !theoPid.has(k.pageId));
  const nhapNhang = ke.filter((k) => (theoPid.get(k.pageId) || []).length > 1);
  console.log(`CSDL: ${dong.length} dòng page khớp · thiếu dòng page: ${thieu.length}${thieu.length ? " (" + thieu.map((k) => k.pageId).join(", ") + ")" : ""} · page ở >1 team: ${nhapNhang.length}`);
  if (!GHI) { console.log("CHẠY THỬ — không ghi gì. Thêm --ghi để nạp."); process.exit(lech.length ? 1 : 0); }
  if (lech.length) { console.error("TỪ CHỐI GHI: còn page khứ hồi lệch."); process.exit(1); }
  const c = await pool.connect();
  const kq = [];
  try {
    await c.query("BEGIN");
    for (const k of ke) {
      const rows = theoPid.get(k.pageId) || [];
      if (rows.length !== 1) { kq.push({ pageId: k.pageId, boQua: rows.length ? "page ở >1 team" : "thiếu dòng page" }); continue; }
      kq.push({ pageId: k.pageId, ...(await ghiKeHoach(c, rows[0].team_id, rows[0], k)) });
    }
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
  const ghi = kq.filter((x) => x.sanPham);
  console.log(`ĐÃ GHI: ${ghi.length} page · ${ghi.reduce((a, x) => a + x.sanPham, 0)} sản phẩm · ${ghi.reduce((a, x) => a + x.bac, 0)} bậc · ${ghi.reduce((a, x) => a + x.anh, 0)} ảnh`);
  for (const x of kq.filter((y) => y.daCo || y.boQua)) console.log(`  – ${x.pageId}: ${x.boQua || "đã có sản phẩm v3, không nạp lại"}`);
} finally { await pool.end(); }
