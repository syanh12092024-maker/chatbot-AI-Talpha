#!/usr/bin/env node
// ⛔⛔ BẢN NÀY ĐÃ LẠC HẬU — DÙNG `ops/bin/do-page-pos.mjs`. Giữ lại làm chứng, đừng chạy để
//     ra số. Nó phân trang TOÀN BỘ đơn của shop rồi mới nhóm theo page, nên:
//   · chậm: shop Saudi cần 20.100 đơn mới phủ 120 ngày — một shop >15 phút, còn 6 shop;
//   · **mẫu số SAI**: nó chỉ thấy page nào tình cờ lọt vào cửa sổ đọc, rồi lấy tập con đó
//     làm mẫu số. Mọi con số nó từng in (120/81 · 199/109 · 122/83) đều sai cùng một hướng.
//     Mẫu số thật là **653 page POS** (`GET /shops/{id}/pages`), trong đó 559 còn sống.
//   · Đo 16/09 sau khi có bản mới: trên mẫu số thật, máy chỉ gợi ý được ~21% page, không
//     phải ~67% như bản này khoe.
// Hai số đo khiến nó thành vô dụng: POS **có** cho danh sách page của shop, và
// `orders?page_id=X` **lọc đúng** — nên hỏi thẳng từng page, khỏi quét cả shop.
//
// GỢI Ý «PAGE NÀY BÁN SẢN PHẨM NÀO» — bóc từ ĐƠN THẬT trong POS, in bảng cho NGƯỜI soát.
//
//   node ops/bin/goi-y-gan-page.mjs                    # in bảng (đọc 5 trang/shop)
//   node ops/bin/goi-y-gan-page.mjs --trang 250        # đọc tới cạn — số ĐỘ PHỦ mới đúng
//   node ops/bin/goi-y-gan-page.mjs --ngay 180         # nới cửa sổ «bán gì BÂY GIỜ»
//   node ops/bin/goi-y-gan-page.mjs --sql              # in thêm câu UPDATE đề nghị
//
// ═══ VÌ SAO BÓC ĐƯỢC ══════════════════════════════════════════════════════════════════
// Mỗi đơn POS mang `page_id` và `items[].variation_info.name`. Tên có số hiệu ở đầu
// (`125 - Fitgum Acai Berry`), và số hiệu là khoá sản phẩm gốc (xem `src/pos/ten-goc.js`).
// Nên lịch sử đơn của một page NÓI RA page ấy bán gì — không phải đoán.
//
// ═══ 📌 ĐỌC SÂU BAO NHIÊU THÌ ĐỔI CÂU TRẢ LỜI — ĐO 16/09 ══════════════════════════════
// Bản đầu của script này đọc 5 trang/shop rồi in ra một con số như thể nó là sự thật. Không
// phải. Đo lại cùng ngày, cùng 7 shop, chỉ khác độ sâu:
//
//     500 đơn/shop   →  120 page có đơn ·  81 bán 1 SP  (67,5% «sạch»)
//    3000 đơn/shop   →  199 page có đơn · 109 bán 1 SP  (54,8% «sạch»)
//
// Hai điều cùng lúc: đọc sâu THÊM độ phủ (thấy nhiều page hơn) nhưng MẤT độ chắc (tỉ lệ
// page «bán đúng 1 SP» tụt). Lý do không phải nhiễu — nó là sự thật về thời gian: page bán
// SP A hai năm rồi đổi sang SP B thì xét cả lịch sử là «bán lẫn», xét gần đây là «bán 1 SP».
//
// Mà câu C3 cần hỏi là **page này bán gì BÂY GIỜ** — để bot trả khách HÔM NAY. Nên:
//   · ĐỘ PHỦ  (page nào tồn tại)     → đọc càng sâu càng đúng, dùng `--trang 250`
//   · PHÂN LOẠI (page ấy bán gì)     → chỉ xét đơn trong `--ngay` gần đây (mặc định 90)
// Hai trục khác nhau, không gộp được. Script này giờ báo cả hai và KHÔNG gộp.
//
// ⛔ CHỈ ĐỌC. Script này không ghi một dòng nào vào CSDL. `--sql` chỉ IN câu lệnh ra để
//    người đọc rồi tự chạy, và nó chỉ sinh cho page bán MỘT sản phẩm TRONG CỬA SỔ GẦN ĐÂY.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tachSoHieu } from "../../src/pos/ten-goc.js";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const doiSo = (t, m) => { const i = process.argv.indexOf(t); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : m; };
const SO_TRANG = Number(doiSo("--trang", "5"));
const SO_NGAY = Number(doiSo("--ngay", "90"));
const IN_SQL = process.argv.includes("--sql");
const MOC = Date.now() - SO_NGAY * 86400_000;

const shops = JSON.parse(fs.readFileSync(path.join(GOC, "pancake-shops.json"), "utf8"));
let pages = {};
try { pages = JSON.parse(fs.readFileSync(path.join(GOC, "pages.json"), "utf8")); } catch { /* không có thì thôi */ }

/** pageId → { market, sp: Map<soHieu,{ten,soDon}>, gan: Map<…>, donCuoi } */
const theoPage = new Map();
let khongNgay = 0;

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
      // `inserted_at` không mang múi giờ; POS trả giờ UTC. Thiếu trường thì ĐẾM RA, không
      // đoán là mới — đoán mới sẽ đẩy đơn cổ vào cửa sổ «bây giờ».
      const t = o.inserted_at ? Date.parse(`${o.inserted_at}Z`) : NaN;
      if (!Number.isFinite(t)) khongNgay += 1;
      const moi = Number.isFinite(t) && t >= MOC;
      for (const it of o.items || []) {
        const { soHieu, ten } = tachSoHieu(it.variation_info?.name || "");
        if (!soHieu) continue;
        if (!theoPage.has(pid)) theoPage.set(pid, { market: s.market, sp: new Map(), gan: new Map(), donCuoi: 0 });
        const v = theoPage.get(pid);
        if (Number.isFinite(t) && t > v.donCuoi) v.donCuoi = t;
        for (const m of moi ? [v.sp, v.gan] : [v.sp]) {
          const cu = m.get(soHieu) || { ten, soDon: 0 };
          cu.soDon += 1;
          m.set(soHieu, cu);
        }
      }
    }
  }
  console.error(`  đọc ${s.market}: ${n} đơn`);
}

/** Xếp một Map<soHieu,…> thành danh sách đã sắp + tỉ lệ của cái áp đảo. */
function xep(m) {
  const sp = [...m.entries()].sort((a, b) => b[1].soDon - a[1].soDon);
  const tong = sp.reduce((t, [, x]) => t + x.soDon, 0);
  return { sp, tong, apDao: sp.length ? sp[0][1].soDon / tong : 0 };
}

const hang = [...theoPage.entries()].map(([pid, v]) => {
  const canhGan = xep(v.gan);
  const canhHet = xep(v.sp);
  return {
    pid,
    market: v.market,
    tenPage: (pages[pid]?.name || "(không có trong pages.json)").slice(0, 34),
    chet: !!pages[pid]?.lost,
    donCuoi: v.donCuoi,
    nguoi: canhGan.tong === 0,          // không đơn nào trong cửa sổ ⇒ page NGUỘI
    ...canhGan,                          // sp/tong/apDao = CỬA SỔ GẦN ĐÂY (dùng để gán)
    het: canhHet,                        // cả lịch sử — chỉ để so, không để gán
  };
});

const nong = hang.filter((h) => !h.nguoi);
const nguoi = hang.filter((h) => h.nguoi);
const motSp = nong.filter((h) => h.sp.length === 1);
const apDao = nong.filter((h) => h.sp.length > 1 && h.apDao >= 0.8);
const lan = nong.filter((h) => h.sp.length > 1 && h.apDao < 0.8);
// Page mà cả lịch sử nói «bán lẫn» nhưng gần đây chỉ bán 1 — tức nó ĐÃ ĐỔI sản phẩm.
const doiSp = motSp.filter((h) => h.het.sp.length > 1);
const ngay = (t) => (t ? new Date(t).toISOString().slice(0, 10) : "—");

console.log(`
╔════════════════════════════════════════════════════════════════════════════════
║ GỢI Ý «PAGE BÁN SẢN PHẨM NÀO» — ${new Date().toISOString().slice(0, 10)}
║ đọc ${SO_TRANG} trang/shop · cửa sổ phân loại ${SO_NGAY} ngày (từ ${ngay(MOC)})
╟─ ĐỘ PHỦ — đọc càng sâu càng tăng, đừng chốt ở --trang nhỏ ─────────────────────
║ page có đơn (cả lịch sử)    ${String(hang.length).padStart(4)}
║   còn đơn trong cửa sổ      ${String(nong.length).padStart(4)}   ← chỉ nhóm này gán được
║   NGUỘI, hết đơn đã lâu     ${String(nguoi.length).padStart(4)}   ⛔ đừng gán theo lịch sử cũ
╟─ PHÂN LOẠI — chỉ xét ${String(SO_NGAY).padEnd(3)} ngày gần đây ───────────────────────────────
║   bán ĐÚNG 1 sản phẩm       ${String(motSp.length).padStart(4)}   ✔ gán được ngay
║     …trong đó ĐÃ ĐỔI SP     ${String(doiSp.length).padStart(4)}   ⚠️ lịch sử cũ nói khác — kịch bản cũ phải bỏ
║   nhiều SP, 1 cái ≥80% đơn  ${String(apDao.length).padStart(4)}   ~ gán theo cái áp đảo, nên soi
║   bán lẫn thật              ${String(lan.length).padStart(4)}   ⚠️ người quyết
╚════════════════════════════════════════════════════════════════════════════════

⚠️ Page KHÔNG có đơn nào thì script này KHÔNG thấy — phải gán tay trên màn Page & bot.${khongNgay ? `
⚠️ ${khongNgay} đơn thiếu \`inserted_at\` — bị xếp ra ngoài cửa sổ, KHÔNG đoán là mới.` : ""}
`);

function inBang(ten, ds, { soLichSu = false } = {}) {
  if (!ds.length) return;
  console.log(`── ${ten} ──\n`);
  console.log("  thị trường  page id            tên page                           đơn cuối    số hiệu → sản phẩm");
  for (const h of ds.sort((a, b) => b.tong - a.tong)) {
    const [so, x] = h.sp.length ? h.sp[0] : h.het.sp[0];
    const them = h.sp.length > 1 ? `  (+${h.sp.length - 1} SP khác, ${(h.apDao * 100).toFixed(0)}% đơn)` : "";
    const cu = soLichSu && h.het.sp.length > 1
      ? `  ⚠️ cả lịch sử: ${h.het.sp.map(([s2]) => s2).join("/")}` : "";
    console.log(
      `  ${h.market.padEnd(10)} ${h.pid.padEnd(18)} ${h.tenPage.padEnd(34)} ${ngay(h.donCuoi)}  ${so.padStart(4)} → ${x.ten.slice(0, 26)}${them}${cu}${h.chet ? "  ⚰️ page CHẾT" : ""}`,
    );
  }
  console.log();
}

inBang("BÁN ĐÚNG MỘT SẢN PHẨM — gán được ngay", motSp, { soLichSu: true });
inBang("MỘT SẢN PHẨM ÁP ĐẢO ≥80% — soi rồi gán", apDao);
inBang("⚠️ BÁN LẪN — KHÔNG gán mù, người quyết", lan);
inBang(`⛔ NGUỘI — không đơn nào trong ${SO_NGAY} ngày, gán theo lịch sử cũ là gán sai`, nguoi);

if (IN_SQL) {
  console.log(`
── CÂU SQL ĐỀ NGHỊ — ĐỌC LẠI TRƯỚC KHI CHẠY ─────────────────────────────────────
-- CHỈ sinh cho ${motSp.length} page còn đơn trong ${SO_NGAY} ngày VÀ bán đúng MỘT sản phẩm.
-- Ba nhóm kia (áp đảo · bán lẫn · nguội) cố ý để trống — người quyết trên màn Page & bot.
-- Điều kiện: \`san_pham_goc\` đã có dòng cho số hiệu tương ứng (phiếu CR3 — chạy
-- \`node ops/bin/goi-y-gop-san-pham.mjs --sql\` trước).
-- Câu này KHÔNG đè page đã gán (\`san_pham_goc_ma IS NULL\`) — người soát thắng máy.
`);
  for (const h of motSp) {
    const [so] = h.sp[0];
    if (h.het.sp.length > 1) {
      console.log(`-- ⚠️ page này ĐÃ ĐỔI sản phẩm (lịch sử: ${h.het.sp.map(([s2]) => s2).join("/")}) — kịch bản cũ nếu có phải bỏ.`);
    }
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
2. Soát bảng trên, rồi chạy lại lệnh này với --trang 250 --sql.
3. Phần ⚠️, phần ⛔ nguội, và page không có đơn: gán trên màn Page & bot, cột «Sản phẩm gốc».
`);
