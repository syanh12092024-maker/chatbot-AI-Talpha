// PHIẾU L1-M1 — ĐỌC ĐƠN + ĐỌC DANH MỤC/TỒN KHO từ POS.
//
// Bộ ca này KHÔNG chạm POS thật (mọi lượt mạng đi qua `nap` tiêm vào), nhưng KHUÔN
// dữ liệu giả chép từ phản hồi THẬT đo ngày 22/08 trên 7 shop của `pancake-shops.json`:
//   · đơn:      { id, status, status_name, conversation_id, page_id, order_currency, … }
//   · biến thể: { id, product:{name}, remain_quantity, retail_price, is_removed, … }
// Ba thứ được đo cho bằng được, vì cả ba đều đã sai ở đâu đó trong bản đang chạy:
//   ① `ma_pos` phải mang shop — id đơn POS là dãy RIÊNG TỪNG SHOP, đo 22/08 bốn shop
//      cùng đếm từ 1 (Saudi 62.029 · UAE 47.421 · Kuwait 13.922 · Taiwan 344).
//   ② `nguon` KHÔNG được đoán — đơn không suy được phải LIỆT KÊ ra, không nuốt im.
//   ③ `trang_thai_he` là cột của L3-M1 — cửa POS gieo một lần rồi cấm chạm lại.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { maHoa } from "../db/khoa.js";
import { ctxHeThong, LoiThieuBoiCanhTeam } from "../src/db/index.js";
import { docDon, suyNguon } from "../src/pos/doc-don.js";
import { docDanhMuc, tenBienThe } from "../src/pos/doc-danh-muc.js";

const KHOA = { V3_KHOA_MA_HOA: "b".repeat(64) };
const SHOP_A = "7770001";
const SHOP_B = "7770002";
const CHUA_PHAN = 4;
const PAGE_FB = "1154327407744443";

let sb;
let pool;
let ctx;

/** `nap` giả — phân nhánh theo đường dẫn, khuôn phản hồi chép từ POS thật. */
function napGia({ don = [], bienThe = [] } = {}) {
  const luot = [];
  const nap = async (url) => {
    luot.push(url);
    const than = url.includes("/products/variations")
      ? { data: bienThe, total_entries: bienThe.length, total_pages: 1 }
      : { data: don, total_entries: don.length, total_pages: 1 };
    return { ok: true, status: 200, text: async () => JSON.stringify(than) };
  };
  return { nap, luot };
}

const donGia = (
  id,
  { status = 12, conv = null, page = null, te = "AED" } = {},
) => ({
  id,
  status,
  status_name: "wait_print",
  conversation_id: conv,
  page_id: page,
  order_currency: te,
  cod: 9900,
  total_price: 0,
});

const bienTheGia = (
  id,
  ten,
  { ton = 5, gia = 0, xoa = false, size = null } = {},
) => ({
  id,
  product: { name: ten },
  size,
  fields: [],
  remain_quantity: ton,
  retail_price: gia,
  is_removed: xoa,
  barcode: `${ten}-bc`,
});

before(async () => {
  sb = await dungSandbox("l1m1b");
  pool = sb.pool;
  ctx = ctxHeThong();
  for (const [mk, sid] of [
    ["ChoA", SHOP_A],
    ["ChoB", SHOP_B],
  ]) {
    await pool.query(
      "INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma) VALUES ($1,$2,$3,$4)",
      [CHUA_PHAN, mk, sid, maHoa("khoa", KHOA)],
    );
  }
  // Một page + một hội thoại thật để đo phép NỐI conversation_id ↔ (page, psid).
  const p = await pool.query(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,$2,'Page thử') RETURNING id",
    [CHUA_PHAN, PAGE_FB],
  );
  await pool.query(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu)
     VALUES ($1,$2,'28180900878187630','GREET','AI')`,
    [CHUA_PHAN, p.rows[0].id],
  );
});
after(async () => {
  await sb.don();
});

// ─── LUẬT SUY `nguon` (②.4 của phiếu) ───────────────────────────────────────

test("N1 · luật suy nguồn: có conv → messenger · vắng → trang_ban_hang · sai khuôn → null", () => {
  assert.equal(suyNguon({ conversation_id: "123_456" }).nguon, "messenger");
  assert.equal(suyNguon({ conversation_id: null }).nguon, "trang_ban_hang");
  assert.equal(suyNguon({}).nguon, "trang_ban_hang");
  assert.equal(suyNguon({ conversation_id: "" }).nguon, "trang_ban_hang");
  // Sai khuôn ⇒ KHÔNG SUY ĐƯỢC. Cấm rơi về `trang_ban_hang` cho tiện — đoán sai chiều
  // này là bịt luôn lỗ 37,4% mà cả sóng L3 sinh ra để vá.
  assert.equal(suyNguon({ conversation_id: "khong-phai-khuon" }).nguon, null);
  assert.equal(suyNguon({ conversation_id: "123-456" }).nguon, null);
  // Khuôn khớp đúng khoá conv-state.json mà L0-M1 đã nạp: <page_id_fb>_<psid>
  const s = suyNguon({ conversation_id: `${PAGE_FB}_28180900878187630` });
  assert.equal(s.pageIdFb, PAGE_FB);
  assert.equal(s.psid, "28180900878187630");
});

// ─── ĐỌC ĐƠN ────────────────────────────────────────────────────────────────

test("R1 · docDon ghi đúng nguồn, nối được hội thoại, và LIỆT KÊ đơn không suy được", async () => {
  const { nap } = napGia({
    don: [
      donGia(101, { conv: `${PAGE_FB}_28180900878187630`, page: PAGE_FB }),
      donGia(102, { conv: null }),
      donGia(103, { conv: "rac-khong-khuon" }),
    ],
  });
  const kq = await docDon(
    pool,
    ctx,
    { shop: "ChoA", teamId: CHUA_PHAN },
    { nap, env: KHOA },
  );
  assert.equal(kq.docDuoc, 3);
  assert.equal(kq.them, 2, "đơn không suy được nguồn vẫn bị ghi xuống");
  assert.deepEqual(kq.theoNguon, { messenger: 1, trang_ban_hang: 1 });
  assert.deepEqual(kq.khongSuyDuocNguon, [
    { maPos: `${SHOP_A}:103`, conversationId: "rac-khong-khuon" },
  ]);
  assert.equal(
    kq.khopHoiThoai,
    1,
    "không nối được conversation_id ↔ (page, psid)",
  );

  const r = await pool.query(
    "SELECT ma_pos, nguon, trang_thai_he, trang_thai_pos, hoi_thoai_id FROM don_hang ORDER BY ma_pos",
  );
  assert.deepEqual(
    r.rows.map((d) => d.ma_pos),
    [`${SHOP_A}:101`, `${SHOP_A}:102`],
  );
  assert.equal(r.rows[0].nguon, "messenger");
  assert.ok(r.rows[0].hoi_thoai_id != null);
  assert.equal(r.rows[1].nguon, "trang_ban_hang");
  // HAI CỘT TRẠNG THÁI TÁCH HẲN NHAU — đây là phép của ④#4.
  for (const d of r.rows) {
    assert.equal(d.trang_thai_he, "moi_tu_pos");
    assert.equal(d.trang_thai_pos, "12");
    assert.notEqual(d.trang_thai_he, d.trang_thai_pos);
  }
});

test("R2 · chạy lại KHÔNG đẻ dòng mới (idempotent)", async () => {
  const { nap } = napGia({
    don: [donGia(101, { conv: `${PAGE_FB}_28180900878187630` }), donGia(102)],
  });
  const kq = await docDon(
    pool,
    ctx,
    { shop: "ChoA", teamId: CHUA_PHAN },
    { nap, env: KHOA },
  );
  assert.equal(kq.them, 0);
  assert.equal(kq.giuNguyen, 2);
  assert.equal(kq.capNhat, 0);
  const c = await pool.query("SELECT count(*)::int c FROM don_hang");
  assert.equal(c.rows[0].c, 2);
});

test("R3 · POS đổi trạng thái → refresh cột POS, KHÔNG đụng cột hệ", async () => {
  await pool.query(
    "UPDATE don_hang SET trang_thai_he = 'dang_cho_khach' WHERE ma_pos = $1",
    [`${SHOP_A}:102`],
  );
  const { nap } = napGia({ don: [donGia(102, { status: 8 })] });
  const kq = await docDon(
    pool,
    ctx,
    { shop: "ChoA", teamId: CHUA_PHAN },
    { nap, env: KHOA },
  );
  assert.equal(kq.capNhat, 1);
  const r = await pool.query(
    "SELECT trang_thai_he, trang_thai_pos FROM don_hang WHERE ma_pos = $1",
    [`${SHOP_A}:102`],
  );
  assert.equal(r.rows[0].trang_thai_pos, "8");
  assert.equal(
    r.rows[0].trang_thai_he,
    "dang_cho_khach",
    "cửa POS ghi đè cột của máy trạng thái L3 — mỗi lượt job sẽ xoá tiến trình đang chạy",
  );
});

test("R4 · nguồn LỆCH thì BÁO RA, không tự sửa (L3 rẽ nhánh theo cột này)", async () => {
  const { nap } = napGia({
    don: [donGia(102, { status: 8, conv: "999_888" })],
  });
  const kq = await docDon(
    pool,
    ctx,
    { shop: "ChoA", teamId: CHUA_PHAN },
    { nap, env: KHOA },
  );
  assert.deepEqual(kq.lechNguon, [
    { maPos: `${SHOP_A}:102`, trongDb: "trang_ban_hang", doDuoc: "messenger" },
  ]);
  const r = await pool.query("SELECT nguon FROM don_hang WHERE ma_pos = $1", [
    `${SHOP_A}:102`,
  ]);
  assert.equal(r.rows[0].nguon, "trang_ban_hang", "nguồn bị lật giữa chừng");
});

test("R5 · HAI SHOP cùng id đơn → HAI dòng (ma_pos mang shop, không tranh nhau một dòng)", async () => {
  const { nap } = napGia({ don: [donGia(101)] });
  await docDon(
    pool,
    ctx,
    { shop: "ChoB", teamId: CHUA_PHAN },
    { nap, env: KHOA },
  );
  const r = await pool.query(
    "SELECT ma_pos FROM don_hang WHERE ma_pos LIKE '%:101' ORDER BY ma_pos",
  );
  assert.deepEqual(
    r.rows.map((d) => d.ma_pos),
    [`${SHOP_A}:101`, `${SHOP_B}:101`],
  );
});

test("R6 · docDon không ctx → LoiThieuBoiCanhTeam, không chạm mạng", async () => {
  const { nap, luot } = napGia({ don: [] });
  await assert.rejects(
    () => docDon(pool, null, { shop: "ChoA" }, { nap, env: KHOA }),
    LoiThieuBoiCanhTeam,
  );
  assert.equal(luot.length, 0);
});

// ─── ĐỌC DANH MỤC + TỒN KHO ────────────────────────────────────────────────

test("S1 · tên biến thể ghép được size/thuộc tính", () => {
  assert.equal(tenBienThe({ product: { name: "Áo" }, size: "M" }), "Áo — M");
  assert.equal(tenBienThe({ product: { name: "Áo" } }), "Áo");
  assert.equal(tenBienThe({}), "");
});

test("S2 · docDanhMuc nạp tên + TỒN KHO thật, giữ tồn âm, bỏ biến thể đã xoá", async () => {
  const { nap } = napGia({
    bienThe: [
      bienTheGia("v-1", "Kem trị nám", { ton: 58 }),
      bienTheGia("v-2", "Nhẫn", { ton: 0 }),
      bienTheGia("v-3", "Đồng hồ", { ton: -3 }), // tồn ÂM có thật (Taiwan, đo 22/08)
      bienTheGia("v-4", "Hàng đã xoá", { xoa: true }),
    ],
  });
  const kq = await docDanhMuc(
    pool,
    ctx,
    { shop: "ChoA", teamId: CHUA_PHAN },
    { nap, env: KHOA },
  );
  assert.equal(kq.docDuoc, 3);
  assert.equal(kq.them, 3);
  assert.equal(kq.boQuaDaXoa, 1);
  assert.equal(kq.tonKhoAm, 1);
  const r = await pool.query(
    "SELECT ma, ten, ton_kho, het_hang FROM san_pham ORDER BY ma",
  );
  assert.deepEqual(
    r.rows.map((s) => [s.ma, s.ten, s.ton_kho, s.het_hang]),
    [
      [`${SHOP_A}:v-1`, "Kem trị nám", 58, false],
      [`${SHOP_A}:v-2`, "Nhẫn", 0, true],
      [`${SHOP_A}:v-3`, "Đồng hồ", -3, true],
    ],
  );
});

test("S3 · tồn kho đổi → cập nhật, không đổi → giữ nguyên (chạy lại được)", async () => {
  const { nap } = napGia({
    bienThe: [
      bienTheGia("v-1", "Kem trị nám", { ton: 40 }),
      bienTheGia("v-2", "Nhẫn", { ton: 0 }),
    ],
  });
  const kq = await docDanhMuc(
    pool,
    ctx,
    { shop: "ChoA", teamId: CHUA_PHAN },
    { nap, env: KHOA },
  );
  assert.equal(kq.them, 0);
  assert.equal(kq.capNhat, 1);
  assert.equal(kq.giuNguyen, 1);
  const r = await pool.query("SELECT ton_kho FROM san_pham WHERE ma = $1", [
    `${SHOP_A}:v-1`,
  ]);
  assert.equal(r.rows[0].ton_kho, 40);
});

test("S4 · POS có giá mà KHÔNG biết tệ → không ghi goi_gia, LIỆT KÊ ra (fail-CLOSED)", async () => {
  const { nap } = napGia({
    bienThe: [bienTheGia("v-9", "Có giá", { ton: 3, gia: 4900 })],
  });
  const kq = await docDanhMuc(
    pool,
    ctx,
    { shop: "ChoA", teamId: CHUA_PHAN },
    { nap, env: KHOA },
  );
  assert.equal(kq.giaGhiDuoc, 0);
  assert.deepEqual(kq.giaKhongBietTe, [{ ma: `${SHOP_A}:v-9`, gia: 4900 }]);
  const c = await pool.query("SELECT count(*)::int c FROM goi_gia");
  assert.equal(c.rows[0].c, 0);
});

test("S5 · có tệ → ghi goi_gia đúng một dòng cho số lượng 1", async () => {
  const { nap } = napGia({
    bienThe: [bienTheGia("v-9", "Có giá", { ton: 3, gia: 4900 })],
  });
  const kq = await docDanhMuc(
    pool,
    ctx,
    { shop: "ChoA", teamId: CHUA_PHAN, tienTe: "AED" },
    { nap, env: KHOA },
  );
  assert.equal(kq.giaGhiDuoc, 1);
  const r = await pool.query(
    "SELECT so_luong, gia::text, tien_te FROM goi_gia ORDER BY id",
  );
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].so_luong, 1);
  assert.equal(r.rows[0].tien_te, "AED");
});
