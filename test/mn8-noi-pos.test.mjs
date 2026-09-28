// NỐI SẢN PHẨM CỦA PAGE VỚI MÓN POS (`san_pham.pos_ma`, 027 · `src/products/noi-pos.js` · CR-28-09b MN8).
//
// Canh: ① chỉ nối được món CÙNG shop của page; ② nối xong hết hàng theo POS ngay; ③ sau lượt kéo
// danh mục, hết hàng đổi theo POS VÀ bản chép được đẩy sang bot — bot hỏng thì page ấy ROLLBACK.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "mn8-"));
process.env.KB_OVERRIDES_FILE = path.join(TMP, "kb-overrides.json");
const { dungSandbox } = await import("../db/sandbox.js");
const { dsMonPos, noiMonPos, dongBoTuPos, LoiNoiPos } = await import("../src/products/noi-pos.js");

let sb, pool, team, trang, sp;
const q = (s, p) => pool.query(s, p);
before(async () => {
  sb = await dungSandbox("mn8");
  pool = sb.pool;
  team = (await q("INSERT INTO team(slug,ten) VALUES('mn8','MN8') RETURNING id")).rows[0].id;
  trang = (await q("INSERT INTO page(team_id,page_id,ten,pos_shop_id) VALUES($1,'9001','Page','S1') RETURNING *", [team])).rows[0];
  sp = (await q("INSERT INTO san_pham(team_id,page_id,ma,ten,nguon) VALUES($1,$2,'kb:9001:SP01','','kb') RETURNING id", [team, trang.id])).rows[0].id;
  await q("INSERT INTO goi_gia(team_id,san_pham_id,so_luong,gia,tien_te,nhan) VALUES($1,$2,1,9900,'AED','1 set')", [team, sp]);
  await q(`INSERT INTO san_pham(team_id,ma,ten,ton_kho,het_hang,nguon) VALUES
    ($1,'S1:a','125 - Fitgum Acai',5,false,'pos'), ($1,'S1:b','128 - Fitgum Barley',0,true,'pos'), ($1,'S2:c','Khác shop',9,false,'pos')`, [team]);
});
after(async () => { await sb.don(); fs.rmSync(TMP, { recursive: true, force: true }); });

const trongGD = async (viec) => {
  const c = await pool.connect();
  try { await c.query("BEGIN"); const r = await viec(c); await c.query("COMMIT"); return r; }
  catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
};

test("NP1 · danh sách chỉ có món CÙNG shop của page", async () => {
  const d = await dsMonPos(pool, team, sp);
  assert.deepEqual(d.mon.map((m) => m.ma), ["S1:a", "S1:b"]);
  assert.equal(d.dangNoi, null);
});

test("NP2 · nối món shop khác ⇒ từ chối; nối món hết hàng ⇒ sản phẩm page HẾT HÀNG ngay", async () => {
  await assert.rejects(() => trongGD((c) => noiMonPos(c, team, sp, "S2:c")), (e) => e instanceof LoiNoiPos && e.ma === "khac_shop");
  const n = await trongGD((c) => noiMonPos(c, team, sp, "S1:b"));
  assert.equal(n.tenPos, "128 - Fitgum Barley");
  assert.equal(n.tenKhach, "Fitgum Barley", "tên khách đọc bỏ số hiệu nội bộ");
  const r = (await q("SELECT pos_ma, het_hang, ten FROM san_pham WHERE id=$1", [sp])).rows[0];
  assert.deepEqual(r, { pos_ma: "S1:b", het_hang: true, ten: "" }, "tên KHÔNG tự đè");
});

test("NP3 · lượt kéo làm POS còn hàng ⇒ sản phẩm page còn hàng VÀ bot nhận bản chép có món ấy", async () => {
  await q("UPDATE san_pham SET het_hang=false, ton_kho=12 WHERE ma='S1:b'");
  const nhan = [];
  const kq = await dongBoTuPos(pool, team, async (pid, products) => { nhan.push({ pid, products }); });
  assert.deepEqual({ doi: kq.doi, page: kq.page, hong: kq.hong }, { doi: 1, page: 1, hong: [] });
  assert.equal(nhan[0].pid, "9001");
  assert.equal(nhan[0].products.length, 1, "món còn hàng ra lại bản chép");
  assert.equal((await q("SELECT het_hang FROM san_pham WHERE id=$1", [sp])).rows[0].het_hang, false);
  const lai = await dongBoTuPos(pool, team, async () => { throw new Error("không được gọi"); });
  assert.equal(lai.doi, 0, "không đổi gì thì không đẩy");
});

test("NP4 · bot HỎNG lúc đồng bộ ⇒ page ấy ROLLBACK: CSDL và bot không lệch", async () => {
  await q("UPDATE san_pham SET het_hang=true, ton_kho=0 WHERE ma='S1:b'");
  const kq = await dongBoTuPos(pool, team, async () => { throw new Error("bot không trả lời"); });
  assert.equal(kq.doi, 0);
  assert.match(kq.hong[0].loi, /bot không trả lời/);
  assert.equal((await q("SELECT het_hang FROM san_pham WHERE id=$1", [sp])).rows[0].het_hang, false, "giữ bản bot đang có");
});

test("NP5 · gỡ nối ⇒ pos_ma NULL, hết hàng thôi tự theo POS", async () => {
  await trongGD((c) => noiMonPos(c, team, sp, null));
  assert.equal((await q("SELECT pos_ma FROM san_pham WHERE id=$1", [sp])).rows[0].pos_ma, null);
  const kq = await dongBoTuPos(pool, team, async () => { throw new Error("không được gọi"); });
  assert.equal(kq.doi, 0);
});
