#!/usr/bin/env node
// GỢI Ý GỘP SẢN PHẨM — đọc danh mục POS của mọi shop, nhóm theo SỐ HIỆU, in bảng cho NGƯỜI soát.
//
//   node ops/bin/goi-y-gop-san-pham.mjs              # in bảng
//   node ops/bin/goi-y-gop-san-pham.mjs --sql        # in thêm câu INSERT đề nghị
//   node ops/bin/goi-y-gop-san-pham.mjs --trang 5    # đọc sâu hơn (mặc định 3 trang/shop)
//
// ═══ ĐÂY LÀ GỢI Ý, KHÔNG PHẢI QUYẾT ĐỊNH ══════════════════════════════════════════════
// Script này KHÔNG ghi một dòng nào vào CSDL. Nó chỉ đọc POS và in. Việc «hai dòng này là
// cùng một sản phẩm» là của người (phiếu CR3 của CR-15/09), vì:
//   · 113 biến thể trong danh mục KHÔNG có số hiệu — máy không đoán được chúng là gì;
//   · vài số hiệu có tên lệch giữa các shop, và chỉ người biết `Box` với `Necklace box` là
//     một thứ hay hai thứ.
// Mọi dòng có ⚠️ là dòng script KHÔNG dám kết luận.
//
// Chỉ ĐỌC POS (`GET /products/variations`). Không ghi, không đụng Pancake, không đụng CSDL.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gopTheoSoHieu } from "../../src/pos/ten-goc.js";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const doiSo = (ten, mac) => {
  const i = process.argv.indexOf(ten);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : mac;
};
const SO_TRANG = Number(doiSo("--trang", "3"));
const IN_SQL = process.argv.includes("--sql");

const shops = JSON.parse(fs.readFileSync(path.join(GOC, "pancake-shops.json"), "utf8"));

async function docBienThe(s) {
  const ra = [];
  for (let trang = 1; trang <= SO_TRANG; trang++) {
    const u = `https://pos.pages.fm/api/v1/shops/${s.shop_id}/products/variations`
      + `?api_key=${s.api_key}&page_size=100&page_number=${trang}`;
    let j;
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      j = await r.json();
    } catch (e) {
      console.error(`  ⚠️ ${s.market}: trang ${trang} lỗi — ${e.message}`);
      break;
    }
    const ds = j?.data || [];
    if (!ds.length) break;
    for (const v of ds) {
      if (v.is_removed) continue;
      ra.push({
        ma: `${s.shop_id}:${v.id}`,
        ten: String(v.product?.name || v.name || "").trim(),
        cho: s.market,
        tonKho: v.remain_quantity ?? null,
      });
    }
  }
  return ra;
}

const tatCa = [];
for (const s of shops) {
  const ds = await docBienThe(s);
  console.error(`  đọc ${s.market}: ${ds.length} biến thể`);
  tatCa.push(...ds);
}

const { nhom, khongSo } = gopTheoSoHieu(tatCa);
const nhieuShop = nhom.filter((n) => n.soShop > 1);
const lech = nhom.filter((n) => n.tenLech.length);

console.log(`
╔════════════════════════════════════════════════════════════════════════════════
║ GỢI Ý GỘP SẢN PHẨM — ${new Date().toISOString().slice(0, 10)}
╟────────────────────────────────────────────────────────────────────────────────
║ biến thể đọc được        ${String(tatCa.length).padStart(5)}
║ số hiệu (⇒ sản phẩm gốc) ${String(nhom.length).padStart(5)}
║   trong đó ở >1 shop     ${String(nhieuShop.length).padStart(5)}   ← đây là phần CR này sinh ra để phục vụ
║   tên LỆCH giữa các shop ${String(lech.length).padStart(5)}   ⚠️ người phải xem
║ KHÔNG có số hiệu         ${String(khongSo.length).padStart(5)}   ⚠️ người phải gán tay
╚════════════════════════════════════════════════════════════════════════════════
`);

console.log("── SẢN PHẨM BÁN Ở NHIỀU THỊ TRƯỜNG (gộp là có lợi ngay) ──\n");
console.log("  số   mã gốc đề xuất                      shop  thị trường");
for (const n of nhieuShop.sort((a, b) => b.soShop - a.soShop)) {
  const cho = [...new Set(n.thanhVien.map((t) => t.cho))].join(" ");
  const co = n.tenLech.length ? " ⚠️" : "";
  console.log(
    `  ${String(n.soHieu).padStart(4)} ${String(n.maGocDeXuat).padEnd(38)} ${String(n.soShop).padStart(4)}  ${cho}${co}`,
  );
}

if (lech.length) {
  console.log("\n── ⚠️ CÙNG SỐ HIỆU MÀ TÊN KHÁC — KHÔNG gộp mù, người quyết ──\n");
  for (const n of lech) {
    console.log(`  số ${n.soHieu}: ${n.tenLech.map((t) => `"${t}"`).join(" | ")}`);
  }
}

if (khongSo.length) {
  console.log(`\n── ⚠️ ${khongSo.length} BIẾN THỂ KHÔNG CÓ SỐ HIỆU — máy không đoán ──\n`);
  for (const v of khongSo.slice(0, 20)) {
    console.log(`  ${v.cho.padEnd(8)} ${v.ten.slice(0, 60)}`);
  }
  if (khongSo.length > 20) console.log(`  … và ${khongSo.length - 20} dòng nữa`);
}

if (IN_SQL) {
  console.log(`
── CÂU SQL ĐỀ NGHỊ — ĐỌC LẠI TRƯỚC KHI CHẠY ─────────────────────────────────────
-- Chỉ sinh cho ${nhieuShop.length} sản phẩm ở >1 shop và KHÔNG lệch tên. Phần còn lại
-- cố ý để trống: script không thay người soát.
-- Thay <TEAM_ID> bằng team thật.
`);
  for (const n of nhieuShop.filter((x) => !x.tenLech.length)) {
    const ten = n.ten.replace(/'/g, "''");
    console.log(
      `INSERT INTO san_pham_goc (team_id, ma_goc, ten, so_hieu) VALUES `
      + `(<TEAM_ID>, '${n.maGocDeXuat}', '${ten}', '${n.soHieu}') ON CONFLICT DO NOTHING;`,
    );
  }
  console.log(`
-- Nối biến thể POS vào sản phẩm gốc theo số hiệu (chạy SAU khi đã INSERT ở trên):
UPDATE san_pham s SET ma_goc = g.ma_goc
  FROM san_pham_goc g
 WHERE g.team_id = s.team_id
   AND g.so_hieu = substring(s.ten from '^([0-9]{1,4})\\s*-')
   AND s.ma_goc IS NULL;
`);
}

console.log(`
── LÀM GÌ TIẾP ──
1. Soát bảng trên. Mã gốc đề xuất là SLUG từ tên POS — sửa lại nếu muốn tên khác.
2. Chạy lại với --sql để lấy câu INSERT, đọc rồi mới chạy.
3. Sau đó \`npm run di-tru\` (hoặc nút «Kéo dữ liệu về») tự nối các biến thể cùng số hiệu —
   kể cả shop mở sau này, không cần soát lại.
`);
