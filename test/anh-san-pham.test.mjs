// ẢNH SẢN PHẨM CÓ NHÀ TRONG v3 (migration 025 · `src/products/anh-san-pham.js` · CR-28-09b MN1).
//
// Chạy trên CSDL THẬT trong hộp cát, không pool giả: luật đường ảnh nằm ở HAI chỗ (CHECK của
// 025 và `KHUON_DUONG` của tầng A) và chỉ một CSDL thật mới chứng minh được hai bên khớp nhau.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import {
  themAnh, suaNhanAnh, boAnh, xepAnh, dsAnh, LoiAnhSanPham, KHUON_DUONG,
} from "../src/products/anh-san-pham.js";
import { docSanPhamGoiGia } from "../src/products/catalog.js";

let sb, pool, team, teamKhac, page, sp, spKhac;
const q = (sql, p) => pool.query(sql, p);

before(async () => {
  sb = await dungSandbox("anhsp");
  pool = sb.pool;
  team = (await q("INSERT INTO team(slug,ten) VALUES('anh-a','A') RETURNING id")).rows[0].id;
  teamKhac = (await q("INSERT INTO team(slug,ten) VALUES('anh-b','B') RETURNING id")).rows[0].id;
  page = (await q("INSERT INTO page(team_id,page_id,ten) VALUES($1,'p-anh','Page ảnh') RETURNING id", [team])).rows[0].id;
  sp = (await q("INSERT INTO san_pham(team_id,page_id,ma,ten) VALUES($1,$2,'kb:p-anh:SP01','') RETURNING id", [team, page])).rows[0].id;
  spKhac = (await q("INSERT INTO san_pham(team_id,ma,ten) VALUES($1,'kb:x:SP01','') RETURNING id", [teamKhac])).rows[0].id;
  await q(`INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan)
           VALUES($1,$2,2,19900,'AED','Buy 1 Get 1 FREE (Total 2 Products)')`, [team, sp]);
});
after(async () => { await sb.don(); });

test("AS1 · luật đường ảnh ở tầng A KHỚP CHECK của 025 — cả chiều nhận lẫn chiều từ chối", async () => {
  const mau = [
    ["https://content.pancake.vn/2/s1000x1000/a.jpg", true],
    ["http://1.2.3.4:3100/uploads/p-SP01-1.jpg", true],
    ["/uploads/p-SP01-1.jpg", true],
    ["/uploads/../etc/passwd", false],
    ["/uploads/..", false],
    ["/uploads/.htaccess", false],
    ["uploads/a.jpg", false],
    ["https://co khoang trang.jpg", false],
    ["javascript:alert(1)", false],
    ["", false],
  ];
  for (const [duong, nhan] of mau) {
    assert.equal(KHUON_DUONG.test(duong), nhan, `tầng A: ${duong}`);
    // Mỗi mẫu trong một giao dịch RIÊNG rồi huỷ — không để lại dòng, không phụ thuộc thứ tự.
    const c = await pool.connect();
    let csdlNhan = true;
    try {
      await c.query("BEGIN");
      await c.query("INSERT INTO anh_san_pham(team_id,san_pham_id,duong) VALUES($1,$2,$3)", [team, sp, duong]);
    } catch (e) {
      if (e.code !== "23514") throw e;   // chỉ đếm vi phạm CHECK — lỗi khác là thước hỏng
      csdlNhan = false;
    } finally {
      await c.query("ROLLBACK"); c.release();
    }
    assert.equal(csdlNhan, nhan, `CHECK 025: ${duong}`);
  }
});

test("AS2 · thêm vào CUỐI, nhãn giữ NGUYÊN VĂN (bot chọn ảnh bằng includes)", async () => {
  const a = await themAnh(pool, team, sp, { duong: "https://content.pancake.vn/a.jpg", nhan: "  Ảnh sản phẩm " });
  const b = await themAnh(pool, team, sp, { duong: "https://content.pancake.vn/b.jpg", nhan: "Feedback khách" });
  assert.equal(a.sanPhamId, String(sp), "trả sanPhamId để nơi gọi đẩy sang bot");
  assert.deepEqual((await dsAnh(pool, team, sp)).map((x) => [x.nhan, x.thuTu]),
    [["Ảnh sản phẩm", 0], ["Feedback khách", 1]]);
  await assert.rejects(() => themAnh(pool, team, sp, { duong: "https://content.pancake.vn/a.jpg" }),
    (e) => e instanceof LoiAnhSanPham && e.status === 409);
  await boAnh(pool, team, a.id); await boAnh(pool, team, b.id);
});

test("AS3 · rào team: sản phẩm và ảnh của team khác KHÔNG chạm được", async () => {
  await assert.rejects(() => themAnh(pool, team, spKhac, { duong: "https://x.vn/a.jpg" }),
    (e) => e.ma === "khong_thay_san_pham" && e.status === 404);
  const cua = await themAnh(pool, teamKhac, spKhac, { duong: "https://x.vn/a.jpg" });
  await assert.rejects(() => suaNhanAnh(pool, team, cua.id, { nhan: "x" }), (e) => e.status === 404);
  await assert.rejects(() => boAnh(pool, team, cua.id), (e) => e.status === 404);
  assert.equal((await dsAnh(pool, teamKhac, spKhac)).length, 1);
});

test("AS4 · xếp lại chỉ nhận ĐÚNG tập ảnh hiện có", async () => {
  const x = await themAnh(pool, team, sp, { duong: "https://content.pancake.vn/x.jpg", nhan: "Ảnh sản phẩm" });
  const y = await themAnh(pool, team, sp, { duong: "https://content.pancake.vn/y.jpg", nhan: "Chứng nhận" });
  await assert.rejects(() => xepAnh(pool, team, sp, [y.id]), (e) => e.ma === "lech_tap");
  await assert.rejects(() => xepAnh(pool, team, sp, [y.id, y.id]), (e) => e.ma === "lech_tap");
  const sau = await xepAnh(pool, team, sp, [y.id, x.id]);
  assert.deepEqual(sau.map((a) => a.nhan), ["Chứng nhận", "Ảnh sản phẩm"]);
});

test("AS5 · bộ đọc chung (catalog) mang ẢNH theo thứ tự xếp và NHÃN bậc giá", async () => {
  const [s] = await docSanPhamGoiGia(pool, team, page, { san_pham_goc_ma: null });
  assert.deepEqual(s.anh.map((a) => a.nhan), ["Chứng nhận", "Ảnh sản phẩm"]);
  assert.equal(s.goiGia[0].nhan, "Buy 1 Get 1 FREE (Total 2 Products)");
});

test("AS6 · CSDL CHƯA áp 025: bộ đọc chung vẫn chạy, ảnh rỗng (đường chat + cửa tiền không gãy)", async () => {
  await q("ALTER TABLE anh_san_pham RENAME TO anh_san_pham_tam");
  try {
    const [s] = await docSanPhamGoiGia(pool, team, page, { san_pham_goc_ma: null });
    assert.deepEqual(s.anh, []);
    assert.equal(s.goiGia.length, 1);
  } finally {
    await q("ALTER TABLE anh_san_pham_tam RENAME TO anh_san_pham");
  }
});
