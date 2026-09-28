// NẠP MỘT LƯỢT `kb-overrides.json` → CSDL v3 (CR-28-09b · MN2 · `src/products/nap-tu-kb.js`).
//
// Điều phải chứng minh: SAU lượt nạp, bản chép sinh từ CSDL (đường mà mọi lượt lưu trên v3 sẽ
// đẩy sang bot) GIỐNG HỆT thứ bot đang giữ — trừ đúng những chỗ đã báo trong `canhBao`.
// Dữ liệu mẫu gom đủ các dạng khó ĐO ĐƯỢC trên prod 28/09: nhãn chữ đậm Unicode, bảng giá
// kiểu cũ (price1/combo2/combo3), id trùng trong page, ảnh tương đối + ảnh tuyệt đối trỏ về
// chính máy, tiền tệ SAR/KWD.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "mn2-"));
process.env.KB_OVERRIDES_FILE = path.join(TMP, "kb-overrides.json");
process.env.PUBLIC_URL = "http://1.2.3.4:3100";
const { soLuongTuNhan, idKhongTrung, anhTho, keHoachPage, kiemKhuHoi, ghiKeHoach } =
  await import("../src/products/nap-tu-kb.js");
const { dungSandbox } = await import("../db/sandbox.js");
const { docSanPhamGoiGia } = await import("../src/products/catalog.js");
const { dungSanPhamChoBot, soBanChep } = await import("../src/products/ban-chep-bot.js");
const kb = await import("../src/kb.js");

const OV = {
  "5001": { products: [
    { id: "SP01", name: "", desc: "Vòng tay", variant: "Vàng", currency: "AED",
      tiers: [{ label: "𝐁𝐮𝐲 𝟏", price: 199 }, { label: "Buy 1 Get 1 FREE (Total 2 Products)", price: 299 }],
      images: [{ url: "https://content.pancake.vn/a.jpg", label: "Ảnh sản phẩm" },
               { url: "http://1.2.3.4:3100/uploads/5001-SP01-1.jpg", label: "Feedback khách" },
               { url: "/uploads/5001-SP01-2.jpg", label: "Chứng nhận" }] },
  ] },
  "5002": { products: [
    { id: "SP01", name: "Nhẫn", desc: "", currency: "SAR", price1: 150, combo2: 250, combo3: null, images: [] },
    { id: "SP01", name: "", desc: "bản trùng id", currency: "SAR",
      tiers: [{ label: "1 set", price: 150 }, { label: "1 Set", price: 260 }], image: "https://content.pancake.vn/b.jpg" },
  ] },
  "5003": { products: [
    { id: "K1", name: "Kuwait", desc: "", currency: "KWD", tiers: [{ label: "2 pcs", price: 12.5 }], images: [] },
  ] },
};

test("NK1 · số lượng đọc từ nhãn: «Total N» thắng, chữ đậm Unicode đọc được; không tăng ngặt ⇒ 1..n", () => {
  assert.deepEqual(soLuongTuNhan(["𝐁𝐮𝐲 𝟏", "Buy 1 Get 1 FREE (Total 2 Products)"]), { soLuong: [1, 2], duPhong: false });
  assert.deepEqual(soLuongTuNhan(["1 set", "1 Set"]), { soLuong: [1, 2], duPhong: true });
  assert.deepEqual(soLuongTuNhan(["Buy 2 get 2 Free (Total 4 Items)", "Buy 3 get 3 Free (Total 4 Items)"]).duPhong, true);
});

test("NK2 · id trùng trong page ⇒ bản sau đổi <id>-<n>; ảnh máy mình lưu TƯƠNG ĐỐI", () => {
  assert.deepEqual(idKhongTrung(OV["5002"].products), ["SP01", "SP01-2"]);
  assert.deepEqual(anhTho(OV["5001"].products[0]).map((a) => a.url),
    ["https://content.pancake.vn/a.jpg", "/uploads/5001-SP01-1.jpg", "/uploads/5001-SP01-2.jpg"]);
  const k = keHoachPage("5002", OV["5002"].products);
  assert.ok(k.canhBao.some((c) => /đổi thành SP01-2/.test(c)), "đổi id phải được BÁO");
  assert.deepEqual(k.sanPham[0].goi.map((g) => g.nhan), ["Buy 1", "Combo 2"], "bảng giá kiểu cũ giữ đúng nhãn bot in");
});

test("NK3 · khứ hồi KHỚP trên mẫu khó, và BẮT được một kế hoạch bị sửa lệch", () => {
  for (const [pid, v] of Object.entries(OV)) assert.equal(kiemKhuHoi(keHoachPage(pid, v.products), v.products), "", pid);
  const k = keHoachPage("5001", OV["5001"].products);
  k.sanPham[0].goi[1].nhan = "Buy 2";
  assert.match(kiemKhuHoi(k, OV["5001"].products), /bậc giá/);
  const k2 = keHoachPage("5001", OV["5001"].products);
  k2.sanPham[0].anh.pop();
  assert.match(kiemKhuHoi(k2, OV["5001"].products), /số ảnh/);
});

let sb, pool, team, trang = {};
before(async () => {
  sb = await dungSandbox("mn2");
  pool = sb.pool;
  team = (await pool.query("INSERT INTO team(slug,ten) VALUES('mn2','MN2') RETURNING id")).rows[0].id;
  for (const pid of Object.keys(OV)) {
    trang[pid] = (await pool.query("INSERT INTO page(team_id,page_id,ten) VALUES($1,$2,$2) RETURNING *", [team, pid])).rows[0];
  }
});
after(async () => { await sb.don(); fs.rmSync(TMP, { recursive: true, force: true }); });

test("NK4 · ĐẦU-CUỐI: nạp vào CSDL → bộ đọc chung → bản chép → bot v1 cất → GIỐNG thứ bot đang có", async () => {
  for (const [pid, v] of Object.entries(OV)) {
    const c = await pool.connect();
    try { await c.query("BEGIN"); await ghiKeHoach(c, team, trang[pid], keHoachPage(pid, v.products)); await c.query("COMMIT"); }
    finally { c.release(); }
    // Bản bot ĐANG đọc: đối tượng THÔ trong kb-overrides.json qua đúng phép ánh xạ của
    // `kb.js#getPageProductsRaw` (bảng giá kiểu cũ price1/combo2 chỉ sống ở đường đọc này —
    // cất lại qua `updatePageProducts` là mất nó, nên KHÔNG dựng «trước» bằng đường ghi).
    const truoc = v.products
      .map((p) => ({ ...p, images: kb.productImages(p), tiers: kb.productTiers(p) }))
      .map((p) => ({ ...p, id: String(p.id || "").trim() || "SP01", name: String(p.name || "").trim(),
        desc: String(p.desc || "").trim(), variant: String(p.variant || "").trim(),
        currency: String(p.currency || "AED").trim() }));
    // Bản bot SẼ giữ sau lượt lưu đầu tiên trên v3: CSDL → bộ sinh → CHÍNH kb.js cất và đọc ra.
    const moi = dungSanPhamChoBot(await docSanPhamGoiGia(pool, team, trang[pid].id, trang[pid]));
    kb.updatePageProducts(`moi-${pid}`, moi);
    const sau = kb.getPageProductsRaw(`moi-${pid}`);
    // Chỗ khác DUY NHẤT được phép: id đổi của bản trùng (đã báo ở NK2).
    const ids = idKhongTrung(v.products);
    const truocDoiId = truoc.map((p, i) => ({ ...p, id: ids[i] }));
    assert.equal(soBanChep(sau, truocDoiId), "", `page ${pid}`);
  }
});

test("NK5 · nạp LẦN HAI không nhân đôi: page đã có sản phẩm v3 thì bỏ qua", async () => {
  const c = await pool.connect();
  try {
    const r = await ghiKeHoach(c, team, trang["5001"], keHoachPage("5001", OV["5001"].products));
    assert.equal(r.daCo, true);
  } finally { c.release(); }
  const n = (await pool.query("SELECT count(*)::int n FROM san_pham WHERE team_id=$1", [team])).rows[0].n;
  assert.equal(n, 4);
});
