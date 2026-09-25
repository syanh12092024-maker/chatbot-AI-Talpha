#!/usr/bin/env node
// ĐỔ THÔ «đơn → page → số hiệu → ngày» RA JSONL. Một lượt đọc POS, tính lại bao nhiêu lần
// cũng được.
//
//   node ops/bin/do-don-tho.mjs > don-tho.jsonl          # phủ 120 ngày rồi dừng
//   node ops/bin/do-don-tho.mjs --ngay 365 > don-tho.jsonl
//   node ops/bin/do-don-tho.mjs --trang 400 --ngay 99999   # đọc tới cạn (rất lâu)
//
// ═══ VÌ SAO TÁCH RA KHỎI `goi-y-gan-page.mjs` ════════════════════════════════════════
// Đo 16/09: cùng 7 shop, cùng ngày, chỉ khác độ sâu đọc thì câu trả lời đổi —
//   500 đơn/shop → 120 page · 81 «bán 1 SP» ·  3000 đơn/shop → 199 page · 109 «bán 1 SP».
// Và câu «page bán gì» còn phụ thuộc cửa sổ thời gian nữa. Hai tham số ấy nhân nhau, nên
// hỏi POS lại mỗi lần đổi tham số là vừa chậm vừa KHÔNG SO ĐƯỢC (đơn mới về giữa hai lượt
// ⇒ hai lượt đọc hai tập dữ liệu khác nhau). Đổ thô một lần rồi tính offline thì mọi con số
// cùng đến từ MỘT tập — so được.
//
// ═══ DỪNG THEO NGÀY, KHÔNG THEO SỐ TRANG ═════════════════════════════════════════════
// Đo 16/09: POS trả đơn MỚI→CŨ tuyệt đối (kiểm 5.721 dòng Saudi: 0% nghịch thứ tự). Và shop
// Saudi chạy ~200 đơn/ngày ⇒ «đọc cạn» là hàng trăm nghìn đơn, hàng giờ.
// Mà đọc cạn KHÔNG cần: tập đầy đủ của page vốn là `pages.json` (514 page), không phải lịch
// sử đơn. Page không có đơn trong cửa sổ thì dù lịch sử nói gì cũng phải gán tay. Nên chỉ
// đọc cho ĐỦ PHỦ CỬA SỔ rồi dừng — nhờ thứ tự mới→cũ, biết dừng ở đâu là chắc chắn.
//
// ⛔ CHỈ ĐỌC. Không ghi CSDL, không ghi tệp nào ngoài stdout.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tachSoHieu } from "../../src/pos/ten-goc.js";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const doiSo = (t, m) => { const i = process.argv.indexOf(t); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : m; };
const SO_TRANG = Number(doiSo("--trang", "600"));   // trần an toàn, không phải đích
const SO_NGAY = Number(doiSo("--ngay", "120"));     // phủ rộng hơn cửa sổ phân loại (90)
const MOC = Date.now() - SO_NGAY * 86400_000;

const shops = JSON.parse(fs.readFileSync(path.join(GOC, "pancake-shops.json"), "utf8"));
let tongDon = 0;
let tongDong = 0;

for (const s of shops) {
  let n = 0;
  let canh = false;
  let quaMoc = false;
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
    if (!ds.length) { canh = true; break; }
    n += ds.length;
    // Mới→cũ ⇒ hết trang này mà đơn CUỐI đã cũ hơn mốc thì mọi trang sau đều cũ hơn. Dừng.
    const tCuoi = Date.parse(`${ds[ds.length - 1].inserted_at}Z`);
    if (Number.isFinite(tCuoi) && tCuoi < MOC) quaMoc = true;
    for (const o of ds) {
      const pid = String(o.page_id || "");
      for (const it of o.items || []) {
        const { soHieu, ten } = tachSoHieu(it.variation_info?.name || "");
        process.stdout.write(`${JSON.stringify({
          tt: s.market, page: pid && pid !== "null" ? pid : null,
          so: soHieu || null, ten, ngay: o.inserted_at || null,
        })}\n`);
        tongDong += 1;
      }
    }
    if (trang % 50 === 0) console.error(`    ${s.market} … ${n} đơn`);
    if (quaMoc) break;
  }
  tongDon += n;
  const vi = canh ? "ĐỌC CẠN" : quaMoc ? `phủ đủ ${SO_NGAY} ngày` : `⚠️ CHẠM TRẦN ${SO_TRANG} trang — CHƯA phủ đủ cửa sổ`;
  console.error(`  ${s.market}: ${n} đơn  (${vi})`);
}
console.error(`\n  tổng ${tongDon} đơn · ${tongDong} dòng hàng`);
