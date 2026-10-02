#!/usr/bin/env node
// ĐẨY LẠI BẢN CHÉP v3 → BOT v1 (CR-28-09b · MN5). Chạy trên máy có CSDL v3 + tiến trình bot.
//
//   node --env-file=.env ops/bin/day-lai-ban-chep.mjs                → CHẠY THỬ: so bản v3 với bản bot đang giữ, KHÔNG ghi
//   node --env-file=.env ops/bin/day-lai-ban-chep.mjs --page <pid>   → đẩy MỘT page (bậc phơi đầu)
//   node --env-file=.env ops/bin/day-lai-ban-chep.mjs --tat-ca       → đẩy mọi page có sản phẩm v3
//
// VÌ SAO CẦN: bot v1 cất ảnh ở dạng TUYỆT ĐỐI (`kb.js#updatePageProducts` ghép `PUBLIC_URL` lúc
// ghi). Đổi `PUBLIC_URL` không sửa được các link đã cất — đo 28/09: 43 ảnh còn trỏ cổng 3100 đã
// đóng. Đẩy lại từ v3 (nơi ảnh lưu TƯƠNG ĐỐI `/uploads/…`) là cách bot cất lại theo gốc mới.
//
// Mỗi lượt đẩy đi qua CHÍNH `daySanPhamLenBot` của cửa lưu (POST rồi ĐỌC LẠI, lệch là ném) và
// CHÍNH bộ sinh `ban-chep-bot.js`. Page chưa có sản phẩm v3 thì KHÔNG đẩy (đẩy rỗng là xoá sạch).
import { taoPool } from "../../db/ket-noi.js";
import { dayPageSangBot, dungSanPhamChoBot, soBanChep } from "../../src/products/ban-chep-bot.js";
import { docSanPhamGoiGia } from "../../src/products/catalog.js";
import { daySanPhamLenBot } from "../../v3/src/noi-day/cau-bot-v1.js";
// CR-02-10 · MB1: lõi bot chạy TRONG tiến trình — nạp KB của chính script này, ghi tệp chung; tiến
// trình v3 và worker đọc lại tệp khi nó đổi.
import { loadKB, getPageProductsRaw } from "../../src/kb.js";
loadKB();

const thamSo = (ten) => { const i = process.argv.indexOf(ten); return i > 0 ? process.argv[i + 1] : null; };
const MOT = thamSo("--page");
const TAT_CA = process.argv.includes("--tat-ca");

const pool = taoPool();
let loi = 0;
try {
  const ds = (await pool.query(
    `SELECT p.* FROM page p WHERE EXISTS (SELECT 1 FROM san_pham s WHERE s.team_id = p.team_id AND (
        CASE WHEN p.san_pham_goc_ma IS NOT NULL
             THEN p.pos_shop_id IS NOT NULL AND s.ma_goc = p.san_pham_goc_ma AND s.ma LIKE p.pos_shop_id || ':%'
             ELSE s.page_id = p.id END))
      ${MOT ? "AND p.page_id = $1" : ""} ORDER BY p.page_id`,
    MOT ? [MOT] : [],
  )).rows;
  console.log(`Page có sản phẩm v3${MOT ? ` (lọc ${MOT})` : ""}: ${ds.length}`);
  if (MOT && !ds.length) { console.error(`Page ${MOT} không có sản phẩm v3 — không đẩy.`); process.exit(1); }

  let khop = 0; let doiGoc = 0; const lech = [];
  for (const trang of ds) {
    const banChep = dungSanPhamChoBot(await docSanPhamGoiGia(pool, trang.team_id, trang.id, trang));
    const bot = getPageProductsRaw(trang.page_id) || [];
    const l = soBanChep(banChep, bot);
    if (l) lech.push(`${trang.page_id}: ${l}`); else khop += 1;
    // Ảnh tương đối mà bot đang cất dưới một gốc KHÁC gốc hiện hành ⇒ lượt đẩy sẽ đổi gốc.
    const goc = String(process.env.PUBLIC_URL || "").replace(/\/+$/, "");
    for (const p of bot) for (const a of p.images || []) {
      if (/\/uploads\//.test(a.url) && goc && !String(a.url).startsWith(`${goc}/uploads/`)) doiGoc += 1;
    }
  }
  console.log(`So với bot: ${khop}/${ds.length} khớp nội dung · ${doiGoc} ảnh máy mình sẽ đổi gốc sang ${process.env.PUBLIC_URL || "(PUBLIC_URL trống)"}`);
  for (const x of lech) console.log(`  ≠ ${x}`);

  if (!MOT && !TAT_CA) { console.log("CHẠY THỬ — không đẩy gì. Thêm --page <pid> hoặc --tat-ca."); process.exit(0); }
  for (const trang of ds) {
    try {
      const kq = await dayPageSangBot(pool, trang.team_id, trang, daySanPhamLenBot);
      console.log(`  ✓ ${trang.page_id}: ${kq.daDay ? `bot nhận ${kq.soSanPham} sản phẩm (đã đọc lại khớp)` : kq.lyDo}`);
    } catch (e) {
      loi += 1;
      console.error(`  ✖ ${trang.page_id}: ${e?.message || e}`);
    }
  }
  console.log(loi ? `XONG CÓ LỖI: ${loi} page chưa nhận — chạy lại cho riêng các page ấy.` : `XONG: ${ds.length} page.`);
} finally { await pool.end(); }
process.exit(loi ? 1 : 0);
