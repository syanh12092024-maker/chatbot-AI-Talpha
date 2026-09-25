#!/usr/bin/env node
// ĐỔ «MỖI PAGE POS + ĐƠN CỦA CHÍNH NÓ» RA JSONL — một dòng một page.
//
//   node ops/bin/do-page-pos.mjs > page-pos.jsonl
//   node ops/bin/do-page-pos.mjs --don 100 --ngay 90 > page-pos.jsonl
//
// ═══ VÌ SAO KHÔNG PHÂN TRANG TOÀN BỘ ĐƠN NỮA ═════════════════════════════════════════
// `do-don-tho.mjs` đọc TẤT CẢ đơn của shop rồi mới nhóm theo page. Đo 16/09: shop Saudi cần
// **20.100 đơn** mới phủ 120 ngày, ~200 đơn/ngày — một shop mất hơn 15 phút, còn 6 shop nữa.
//
// Hai số đo đổi cách làm:
//   ① `GET /shops/{id}/pages` **có thật** và trả TRỌN danh sách page của shop — 653 page qua
//      7 shop, trong 7 lượt gọi. (Sổ cũ khai «POS cho shop, KHÔNG cho page» — SAI.)
//   ② `GET /shops/{id}/orders?page_id=X` **lọc đúng** — kiểm 3 page, mọi đơn trả về đúng
//      page ấy. (`page_ids`, `pages` thì KHÔNG lọc — bị bỏ qua im lặng, trả như không lọc.)
// ⇒ Hỏi thẳng từng page: 653 lượt gọi nhẹ thay vì phân trang ~200 nghìn đơn. Và vì đơn của
//   một page về theo mới→cũ, `--don 50` là đủ biết page ấy ĐANG bán gì.
//
// ═══ THỊ TRƯỜNG LÀ TỪ SHOP, KHÔNG SUY TỪ TÊN ═════════════════════════════════════════
// Đo trọn 7 shop: **0/653 page thuộc nhiều hơn một shop**. Nên shop → thị trường là quan hệ
// chắc chắn, không cần đoán từ tên page (cách đoán ấy chỉ phủ 83% và sinh 6 ca lệch giả).
//
// ⛔ CHỈ ĐỌC. Không ghi CSDL, không ghi tệp nào ngoài stdout.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tachSoHieu } from "../../src/pos/ten-goc.js";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const doiSo = (t, m) => { const i = process.argv.indexOf(t); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : m; };
const SO_DON = Number(doiSo("--don", "50"));
const SO_NGAY = Number(doiSo("--ngay", "90"));

const shops = JSON.parse(fs.readFileSync(path.join(GOC, "pancake-shops.json"), "utf8"));
const lay = async (u) => {
  for (let lan = 1; lan <= 3; lan += 1) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
      if (r.ok) return await r.json();
      if (r.status >= 500 && lan < 3) continue;          // lỗi máy chủ thì thử lại
      return { __loi: `HTTP ${r.status}` };
    } catch (e) { if (lan === 3) return { __loi: e.message }; }
  }
  return { __loi: "hết lượt thử" };
};

let tongPage = 0;
let loi = 0;
for (const s of shops) {
  const dsp = await lay(`https://pos.pages.fm/api/v1/shops/${s.shop_id}/pages?api_key=${s.api_key}`);
  if (dsp.__loi) { console.error(`  ⚠️ ${s.market} không lấy được danh sách page: ${dsp.__loi}`); continue; }
  const pages = dsp.pages || [];
  let n = 0;
  for (const p of pages) {
    const j = await lay(`https://pos.pages.fm/api/v1/shops/${s.shop_id}/orders`
      + `?api_key=${s.api_key}&page_size=${SO_DON}&page_number=1&page_id=${p.id}`);
    if (j.__loi) { loi += 1; console.error(`  ⚠️ ${s.market}/${p.id}: ${j.__loi}`); continue; }
    const don = j.data || [];
    // ⚠️ KIỂM lọc thật sự có tác dụng, từng page một. `page_ids`/`pages` trả về như không
    // lọc — nếu API đổi hành vi thì phải LỘ RA, không được lặng lẽ gán sai sản phẩm.
    const lac = don.filter((o) => String(o.page_id) !== String(p.id)).length;
    const moc = Date.now() - SO_NGAY * 86400_000;
    const sp = {}; const spGan = {};
    let cuoi = null;
    for (const o of don) {
      const t = o.inserted_at ? Date.parse(`${o.inserted_at}Z`) : NaN;
      if (Number.isFinite(t) && (!cuoi || t > cuoi)) cuoi = t;
      for (const it of o.items || []) {
        const { soHieu, ten } = tachSoHieu(it.variation_info?.name || "");
        if (!soHieu) continue;
        sp[soHieu] = { ten, don: (sp[soHieu]?.don || 0) + 1 };
        if (Number.isFinite(t) && t >= moc) spGan[soHieu] = { ten, don: (spGan[soHieu]?.don || 0) + 1 };
      }
    }
    process.stdout.write(`${JSON.stringify({
      page: String(p.id), ten: p.name, tt: s.market, shop: String(s.shop_id),
      nen: p.platform, posTuTaoDon: !!p.settings?.auto_create_order,
      soDonDoc: don.length, chamTran: don.length === SO_DON,
      donCuoi: cuoi ? new Date(cuoi).toISOString() : null,
      sp, spGan, locLac: lac,
    })}\n`);
    n += 1; tongPage += 1;
  }
  console.error(`  ${s.market.padEnd(9)} ${String(n).padStart(4)} page đã đọc đơn`);
}
console.error(`\n  tổng ${tongPage} page · ${loi} page lỗi (đọc ${SO_DON} đơn mới nhất mỗi page)`);
