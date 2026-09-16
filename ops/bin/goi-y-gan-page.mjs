#!/usr/bin/env node
// GỢI Ý «PAGE NÀY BÁN SẢN PHẨM NÀO» — bóc từ ĐƠN THẬT trong POS, in bảng cho NGƯỜI soát.
//
//   node ops/bin/goi-y-gan-page.mjs              # in bảng
//   node ops/bin/goi-y-gan-page.mjs --sql        # in thêm câu UPDATE đề nghị
//   node ops/bin/goi-y-gan-page.mjs --trang 8    # đọc sâu hơn (mặc định 5 trang/shop)
//
// ═══ VÌ SAO BÓC ĐƯỢC ══════════════════════════════════════════════════════════════════
// Mỗi đơn POS mang `page_id` và `items[].variation_info.name`. Tên có số hiệu ở đầu
// (`125 - Fitgum Acai Berry`), và số hiệu là khoá sản phẩm gốc (xem `src/pos/ten-goc.js`).
// Nên lịch sử đơn của một page NÓI RA page ấy bán gì — không phải đoán.
//
// Đo 16/09 trên 7 shop: **155 page có đơn · 103 page (66%) bán ĐÚNG MỘT sản phẩm**. Với
// 103 page ấy, gợi ý gần như chắc chắn. 52 page còn lại bán nhiều sản phẩm ⇒ ⚠️ người quyết.
//
// ⛔ CHỈ ĐỌC. Script này không ghi một dòng nào vào CSDL. `--sql` chỉ IN câu lệnh ra để
//    người đọc rồi tự chạy, và nó chỉ sinh cho page bán MỘT sản phẩm.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tachSoHieu } from "../../src/pos/ten-goc.js";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const doiSo = (t, m) => { const i = process.argv.indexOf(t); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : m; };
const SO_TRANG = Number(doiSo("--trang", "5"));
const IN_SQL = process.argv.includes("--sql");

const shops = JSON.parse(fs.readFileSync(path.join(GOC, "pancake-shops.json"), "utf8"));
let pages = {};
try { pages = JSON.parse(fs.readFileSync(path.join(GOC, "pages.json"), "utf8")); } catch { /* không có thì thôi */ }

/** pageId → Map<soHieu, {ten, soDon}> */
const theoPage = new Map();

for (const s of shops) {
  let n = 0;
  for (let trang = 1; trang <= SO_TRANG; trang += 1) {
    const u = `https://pos.pages.fm/api/v1/shops/${s.shop_id}/orders`
      + `?api_key=${s.api_key}&page_size=100&page_number=${trang}`;
    let ds;
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      ds = (await r.json())?.data || [];
    } catch (e) {
      console.error(`  ⚠️ ${s.market} trang ${trang}: ${e.message}`);
      break;
    }
    if (!ds.length) break;
    n += ds.length;
    for (const o of ds) {
      const pid = String(o.page_id || "");
      if (!pid || pid === "null") continue;
      for (const it of o.items || []) {
        const { soHieu, ten } = tachSoHieu(it.variation_info?.name || "");
        if (!soHieu) continue;
        if (!theoPage.has(pid)) theoPage.set(pid, { market: s.market, sp: new Map() });
        const m = theoPage.get(pid).sp;
        const cu = m.get(soHieu) || { ten, soDon: 0 };
        cu.soDon += 1;
        m.set(soHieu, cu);
      }
    }
  }
  console.error(`  đọc ${s.market}: ${n} đơn`);
}

const hang = [...theoPage.entries()].map(([pid, v]) => {
  const sp = [...v.sp.entries()].sort((a, b) => b[1].soDon - a[1].soDon);
  const tong = sp.reduce((t, [, x]) => t + x.soDon, 0);
  return {
    pid,
    market: v.market,
    tenPage: (pages[pid]?.name || "(không có trong pages.json)").slice(0, 34),
    chet: !!pages[pid]?.lost,
    sp,
    tong,
    // Tỉ lệ của sản phẩm áp đảo. Dưới ngưỡng ⇒ page bán lẫn, người phải xem.
     apDao: sp.length ? sp[0][1].soDon / tong : 0,
  };
});

const motSp = hang.filter((h) => h.sp.length === 1);
const apDao = hang.filter((h) => h.sp.length > 1 && h.apDao >= 0.8);
const lan = hang.filter((h) => h.sp.length > 1 && h.apDao < 0.8);

console.log(`
╔════════════════════════════════════════════════════════════════════════════════
║ GỢI Ý «PAGE BÁN SẢN PHẨM NÀO» — ${new Date().toISOString().slice(0, 10)}
╟────────────────────────────────────────────────────────────────────────────────
║ page có đơn                 ${String(hang.length).padStart(4)}
║   bán ĐÚNG 1 sản phẩm       ${String(motSp.length).padStart(4)}   ✔ gán được ngay
║   nhiều SP, 1 cái ≥80% đơn  ${String(apDao.length).padStart(4)}   ~ gán theo cái áp đảo, nên soi
║   bán lẫn (không cái nào áp đảo) ${String(lan.length).padStart(4)}   ⚠️ người quyết
╚════════════════════════════════════════════════════════════════════════════════

⚠️ Page KHÔNG có đơn nào thì script này KHÔNG thấy — phải gán tay trên màn Page & bot.
`);

function inBang(ten, ds) {
  if (!ds.length) return;
  console.log(`── ${ten} ──\n`);
  console.log("  thị trường  page id            tên page                           số hiệu → sản phẩm");
  for (const h of ds.sort((a, b) => b.tong - a.tong)) {
    const [so, x] = h.sp[0];
    const them = h.sp.length > 1 ? `  (+${h.sp.length - 1} SP khác, ${(h.apDao * 100).toFixed(0)}% đơn)` : "";
    console.log(
      `  ${h.market.padEnd(10)} ${h.pid.padEnd(18)} ${h.tenPage.padEnd(34)} ${so.padStart(4)} → ${x.ten.slice(0, 28)}${them}${h.chet ? "  ⚰️ page CHẾT" : ""}`,
    );
  }
  console.log();
}

inBang("BÁN ĐÚNG MỘT SẢN PHẨM — gán được ngay", motSp);
inBang("MỘT SẢN PHẨM ÁP ĐẢO ≥80% — soi rồi gán", apDao);
inBang("⚠️ BÁN LẪN — KHÔNG gán mù, người quyết", lan);

if (IN_SQL) {
  console.log(`
── CÂU SQL ĐỀ NGHỊ — ĐỌC LẠI TRƯỚC KHI CHẠY ─────────────────────────────────────
-- CHỈ sinh cho ${motSp.length} page bán đúng MỘT sản phẩm. Hai nhóm kia cố ý để trống.
-- Điều kiện: \`san_pham_goc\` đã có dòng cho số hiệu tương ứng (phiếu CR3 — chạy
-- \`node ops/bin/goi-y-gop-san-pham.mjs --sql\` trước).
-- Câu này KHÔNG đè page đã gán (\`san_pham_goc_ma IS NULL\`) — người soát thắng máy.
`);
  for (const h of motSp) {
    const [so] = h.sp[0];
    console.log(
      `UPDATE page p SET san_pham_goc_ma = g.ma_goc FROM san_pham_goc g\n`
      + ` WHERE g.team_id = p.team_id AND g.so_hieu = '${so}'\n`
      + `   AND p.page_id = '${h.pid}' AND p.san_pham_goc_ma IS NULL;`,
    );
  }
  console.log(`
-- Xem lại sau khi chạy:
SELECT count(*) FILTER (WHERE san_pham_goc_ma IS NOT NULL) AS da_gan,
       count(*) AS tong FROM page;
`);
}

console.log(`
── LÀM GÌ TIẾP ──
1. Chạy \`node ops/bin/goi-y-gop-san-pham.mjs --sql\` TRƯỚC để có bảng \`san_pham_goc\`.
2. Soát bảng trên, rồi chạy lại lệnh này với --sql.
3. Phần ⚠️ và phần page không có đơn: gán trên màn Page & bot, cột «Sản phẩm gốc».
`);
