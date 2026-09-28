// ẢNH SẢN PHẨM SỬA TRÊN v3 ⇒ BOT NHẬN NGAY, HOẶC KHÔNG THÀNH (CR-28-09b · MN4).
//
// Qua HTTP THẬT (express + CSDL hộp cát), không gọi thẳng hàm: rào quyền, trần byte và
// việc dọn tệp khi huỷ đều nằm ở tầng HTTP — gọi hàm là bỏ qua đúng những chỗ dễ gãy.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "mn4-"));
process.env.KB_OVERRIDES_FILE = path.join(TMP, "kb-overrides.json");
const express = (await import("express")).default;
const { dungSandbox } = await import("../db/sandbox.js");
const { taoRouterAnhSanPham } = await import("../v3/src/ui/van-hanh/router-anh.js");
const { taoKhoSanPhamV3 } = await import("../v3/src/noi-day/kho-san-pham-v3.js");

const THU_MUC = path.join(TMP, "uploads");
const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6360000002000154a24f5d0000000049454e44ae426082", "hex");

let sb, pool, team, trang, sp, server, base;
let botNhan = [];
let botHong = false;
let vai = ["quan-tri"];

before(async () => {
  sb = await dungSandbox("mn4");
  pool = sb.pool;
  team = (await pool.query("INSERT INTO team(slug,ten) VALUES('mn4','MN4') RETURNING id")).rows[0].id;
  trang = (await pool.query("INSERT INTO page(team_id,page_id,ten) VALUES($1,'4001','Page ảnh') RETURNING *", [team])).rows[0];
  sp = (await pool.query("INSERT INTO san_pham(team_id,page_id,ma,ten,mo_ta) VALUES($1,$2,'kb:4001:SP01','','Vòng') RETURNING id", [team, trang.id])).rows[0].id;
  await pool.query("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan) VALUES($1,$2,1,19900,'AED','1 set')", [team, sp]);
  const app = express();
  app.use(express.json());
  app.use((q, _s, next) => { q.boiCanh = { teamId: team, nguoiDungId: null, vai }; next(); });
  app.use(taoRouterAnhSanPham({
    pool, env: {}, thuMucAnh: THU_MUC,
    daySanPhamLenBot: async (pageId, products) => {
      if (botHong) throw new Error("bot không trả lời");
      botNhan.push({ pageId, products });
    },
  }));
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { server?.close(); await sb.don(); fs.rmSync(TMP, { recursive: true, force: true }); });

const goi = (duong, { method = "POST", body, type = "application/json", headers = {} } = {}) => fetch(base + duong, {
  method,
  headers: { "Content-Type": type, "X-V3-Action": "1", ...headers },
  body: body == null ? undefined : (Buffer.isBuffer(body) ? body : JSON.stringify(body)),
});
const tepTrongThuMuc = () => (fs.existsSync(THU_MUC) ? fs.readdirSync(THU_MUC) : []);

test("AR1 · tải ảnh lên ⇒ tệp nằm trong thư mục ảnh, dòng CSDL `/uploads/…`, bot nhận ảnh KÈM nhãn", async () => {
  botNhan = [];
  const r = await goi(`/api/anh-san-pham/${sp}/tai-len?nhan=${encodeURIComponent("Ảnh sản phẩm")}`, { body: PNG, type: "image/png" });
  assert.equal(r.status, 200, await r.clone().text());
  const d = await r.json();
  assert.match(d.anh.duong, /^\/uploads\/v3-\d+-\d+-[0-9a-f]{8}\.png$/);
  assert.deepEqual(tepTrongThuMuc(), [d.anh.duong.slice("/uploads/".length)]);
  assert.equal(botNhan.length, 1);
  assert.deepEqual(botNhan[0].products[0].images, [{ url: d.anh.duong, label: "Ảnh sản phẩm" }]);
  assert.deepEqual(botNhan[0].products[0].tiers, [{ label: "1 set", price: 199 }], "nhãn bậc đi kèm nguyên văn");
});

test("AR2 · bot HỎNG ⇒ không thành: không dòng mới, và tệp vừa ghi bị XOÁ (không để ảnh mồ côi)", async () => {
  const truoc = tepTrongThuMuc().length;
  const n0 = (await pool.query("SELECT count(*)::int n FROM anh_san_pham")).rows[0].n;
  botHong = true;
  try {
    const r = await goi(`/api/anh-san-pham/${sp}/tai-len?nhan=Feedback`, { body: PNG, type: "image/png" });
    assert.equal(r.status, 502);
    assert.match((await r.json()).thongDiep, /bot không trả lời/);
  } finally { botHong = false; }
  assert.equal(tepTrongThuMuc().length, truoc);
  assert.equal((await pool.query("SELECT count(*)::int n FROM anh_san_pham")).rows[0].n, n0);
});

test("AR3 · rào: không phải quản trị ⇒ 403 · thiếu X-V3-Action ⇒ 403 · không phải ảnh ⇒ 400 · link lạ ⇒ 400", async () => {
  vai = ["marketer"];
  try { assert.equal((await goi(`/api/anh-san-pham/${sp}/link`, { body: { duong: "https://x.vn/a.jpg" } })).status, 403); }
  finally { vai = ["quan-tri"]; }
  assert.equal((await goi(`/api/anh-san-pham/${sp}/link`, { body: { duong: "https://x.vn/a.jpg" }, headers: { "X-V3-Action": "0" } })).status, 403);
  assert.equal((await goi(`/api/anh-san-pham/${sp}/tai-len`, { body: Buffer.from("abc"), type: "text/plain" })).status, 400);
  assert.equal((await goi(`/api/anh-san-pham/${sp}/link`, { body: { duong: "javascript:alert(1)" } })).status, 400);
});

test("AR4 · ảnh quá 10 MB ⇒ 413, không tệp nào được ghi", async () => {
  const truoc = tepTrongThuMuc().length;
  const r = await goi(`/api/anh-san-pham/${sp}/tai-len`, { body: Buffer.alloc(10 * 1024 * 1024 + 1), type: "image/jpeg" });
  assert.equal(r.status, 413);
  assert.equal(tepTrongThuMuc().length, truoc);
});

test("AR5 · link · đổi nhãn · xếp lại · bỏ — mỗi bước bot nhận ĐÚNG bản mới", async () => {
  botNhan = [];
  const l = await (await goi(`/api/anh-san-pham/${sp}/link`, { body: { duong: "https://content.pancake.vn/b.jpg", nhan: "Chứng nhận" } })).json();
  const ds = (await pool.query("SELECT id FROM anh_san_pham WHERE san_pham_id=$1 ORDER BY thu_tu", [sp])).rows.map((x) => String(x.id));
  assert.equal((await goi(`/api/anh-san-pham/anh/${l.anh.id}`, { body: { nhan: "Feedback khách" } })).status, 200);
  assert.equal(botNhan.at(-1).products[0].images[1].label, "Feedback khách");
  assert.equal((await goi(`/api/anh-san-pham/${sp}/thu-tu`, { body: { ids: [ds[0]] } })).status, 409, "tập lệch bị từ chối");
  assert.equal((await goi(`/api/anh-san-pham/${sp}/thu-tu`, { body: { ids: [...ds].reverse() } })).status, 200);
  assert.equal(botNhan.at(-1).products[0].images[0].url, "https://content.pancake.vn/b.jpg");
  assert.equal((await goi(`/api/anh-san-pham/anh/${l.anh.id}`, { method: "DELETE" })).status, 200);
  assert.equal(botNhan.at(-1).products[0].images.length, 1);
  const nk = (await pool.query("SELECT count(*)::int n FROM nhat_ky WHERE hanh_dong='v3_sua_anh_san_pham'")).rows[0].n;
  assert.ok(nk >= 5, "mỗi thao tác một dòng nhật ký");
});

test("AR6 · kho v3 cho ba màn: đếm theo luật page → sản phẩm, ảnh và tên bậc đúng như bot nhận", async () => {
  const kho = taoKhoSanPhamV3(pool);
  const dong = (await kho.danhSach()).find((p) => p.pageId === "4001");
  assert.equal(dong.soSanPham, 1);
  const mot = await kho.motPage("4001");
  assert.deepEqual(mot.sanPham[0].bacGia, [{ nhan: "1 set", gia: 199 }]);
  assert.equal(mot.sanPham[0].anh.length, 1);
  await pool.query("UPDATE san_pham SET het_hang=true WHERE id=$1", [sp]);
  assert.equal((await kho.danhSach()).find((p) => p.pageId === "4001").soSanPham, 0, "hết hàng thì bot không bán — đếm 0");
  assert.equal((await kho.motPage("4001")).sanPham[0].botDangBan, false);
});
