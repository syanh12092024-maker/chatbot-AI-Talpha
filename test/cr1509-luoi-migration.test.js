// CR-15/09 · LƯỚI MIGRATION 014 — code MỚI trên lược đồ CŨ phải MÙ-CÓ-NÓI, không được NÉM.
//
// ═══ CA NÀY SINH RA TỪ MỘT SỰ CỐ THẬT, 16/09/2026 ═════════════════════════════════════
// Tôi đẩy code CR4+CR6 lên prod và nói với người quyết «014 chưa cần chạy hôm nay, nó chỉ
// thêm cột». SAI: chính CR4 đọc `kich_ban.san_pham_goc_ma` và CR6 đọc bảng `san_pham_goc`.
// Đúng án lệ #7 của dự án («reader mới phải có lưới migration») và đúng luật §5 của skill
// `mo-van` («migration lên TRƯỚC, code mới ra SAU») — tôi đảo cả hai.
//
// Lưới `coCotCap` có sẵn trong `kich-ban.js` KHÔNG che được, vì nó canh cột `cap` của 010;
// câu tra của tôi dùng cột của 014 và nằm SAU lưới ấy.
// 📌 Bài học: mỗi migration mà reader mới đọc thì cần LƯỚI RIÊNG. Một lưới canh migration
//    cũ không che được cột của migration mới.
//
// Bộ ca này dựng đúng cảnh đó: sandbox áp tới 013 rồi chạy code của 014.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { xuong, danhSachBan } from "../db/migrate.js";
import { docKichBanChoPage } from "../src/db/kich-ban.js";

let sb;
let team;
let pageId;
const mot = async (sql, p) => (await sb.pool.query(sql, p)).rows[0];

before(async () => {
  sb = await dungSandbox("cr1509luoi");            // áp TRỌN

  // Lùi cho tới khi CẢ HAI cột của 014/015 đều biến mất — KHÔNG neo vào số hiệu migration
  // nào. Bản đầu của ca này khai «014 là bản chót»; thêm 015 là nó gỡ nhầm bản và đỏ oan.
  // Đúng án lệ ④: trần vòng lặp đếm TỪ NGUỒN (`danhSachBan()`), không gõ cứng.
  const tran = danhSachBan().length;
  for (let i = 0; i < tran; i += 1) {
    if (!(await coCot())) break;
    await xuong(sb.pool, { im: true });
  }
  assert.equal(await coCot(), false, "lùi hết trần mà cột mới vẫn còn — bản .down.sql không gỡ sạch");

  team = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  pageId = (await mot(
    `INSERT INTO page (team_id, page_id, ten, thi_truong) VALUES ($1,'p1','P1','Kuwait') RETURNING id`,
    [team],
  )).id;
  await sb.pool.query(
    `INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,'9:a','SP')`,
    [team, pageId],
  );
  await sb.pool.query(
    `INSERT INTO kich_ban (team_id, page_id, phien_ban, trang_thai, noi_dung_nguoi,
       noi_dung_may, cap, san_pham_ma)
     VALUES ($1, NULL, 1, 'LIVE', '{}'::jsonb, 'MÁY', 'san_pham', '9:a')`,
    [team],
  );
});

/** Còn cột nào của 014/015 không? Một trong hai còn là chưa lùi đủ. */
async function coCot() {
  const r = await mot(
    `SELECT count(*)::int c FROM information_schema.columns
      WHERE table_schema='public'
        AND ((table_name='kich_ban' AND column_name='san_pham_goc_ma')
          OR (table_name='page'     AND column_name='san_pham_goc_ma'))`,
  );
  return r.c > 0;
}

after(async () => sb && (await sb.don()));

test("L1 · sau khi lùi: cột/bảng của 014+015 THẬT SỰ không còn", async () => {
  const cot = await mot(
    `SELECT count(*)::int c FROM information_schema.columns
      WHERE table_name='kich_ban' AND column_name='san_pham_goc_ma'`,
  );
  assert.equal(cot.c, 0, "ca này chỉ có nghĩa khi 014 CHƯA áp");
  const bang = await mot(
    `SELECT count(*)::int c FROM information_schema.tables WHERE table_name='san_pham_goc'`,
  );
  assert.equal(bang.c, 0);
  const cotPage = await mot(
    `SELECT count(*)::int c FROM information_schema.columns
      WHERE table_name='page' AND column_name='san_pham_goc_ma'`,
  );
  assert.equal(cotPage.c, 0, "015 cũng phải đã lùi — ca này đo cả hai lưới");
});

test("L2 · bộ giải KHÔNG NÉM, vẫn giải được bằng khoá POS cũ", async () => {
  // Đây là ca chính: trước khi có lưới, câu này ném `42703 column does not exist`.
  const r = await docKichBanChoPage(sb.pool, team, pageId);
  assert.equal(r.cap, "san_pham", "phải vẫn giải được — mù một đường thì đi đường còn lại");
  assert.match(r.tuDau, /khoá POS/, "và nói rõ nó tới từ khoá cũ");
  assert.deepEqual(r.khoa.maGoc, [], "mã gốc rỗng vì cột chưa có — nói ra, không đoán");
});
