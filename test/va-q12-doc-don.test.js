// PHIẾU VA-Q12 — docDon nuôi bảng `khach` + `san_pham_ma` (đóng khớp đứt Q1/Q2, Q3).
//
// Bộ ca này KHÔNG chạm POS thật (mọi lượt mạng đi qua `nap` tiêm vào, cùng khuôn
// test/l1-m1-doc-pos.test.js), nhưng KHUÔN dữ liệu giả chép từ phản hồi THẬT đo 23/08
// trên POS thật (script đo trước khi code, dán trong nhật ký phiếu):
//   · shipping_address: { phone_number, full_name, full_address, province_name, … }
//   · items[]: { variation_id, … } — một đơn nhiều dòng hàng
//   · status_history: mảng { status, old_status, editor, updated_at }
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { maHoa } from "../db/khoa.js";
import { ctxHeThong } from "../src/db/index.js";
import { docDon } from "../src/pos/doc-don.js";
import { kiemTrung } from "../src/orders/index.js";

const KHOA = { V3_KHOA_MA_HOA: "c".repeat(64) };
const SHOP = "7770009";
const CHUA_PHAN = 4;

let sb;
let pool;
let ctx;

/** `nap` giả — luôn trả về đơn, cùng khuôn napGia của test/l1-m1-doc-pos.test.js. */
function napGia(don = []) {
  const luot = [];
  const nap = async (url) => {
    luot.push(url);
    const than = { data: don, total_entries: don.length, total_pages: 1 };
    return { ok: true, status: 200, text: async () => JSON.stringify(than) };
  };
  return { nap, luot };
}

/** Đơn giả khuôn THẬT (shipping_address/items/status_history) — xem đầu file. */
const donGia = (
  id,
  {
    status = 12,
    conv = null,
    te = "AED",
    phone = undefined, // undefined = KHÔNG có shipping_address (đơn chưa có địa chỉ)
    ten = "",
    diaChi = "",
    tinh = "",
    items = [],
    statusHistory,
  } = {},
) => ({
  id,
  status,
  status_name: "wait_print",
  conversation_id: conv,
  order_currency: te,
  cod: 9900,
  total_price: 0,
  ...(phone !== undefined
    ? {
        shipping_address: {
          phone_number: phone,
          full_name: ten,
          full_address: diaChi,
          province_name: tinh,
        },
      }
    : {}),
  items,
  ...(statusHistory !== undefined ? { status_history: statusHistory } : {}),
});

before(async () => {
  sb = await dungSandbox("vaq12dd");
  pool = sb.pool;
  ctx = ctxHeThong();
  await pool.query(
    "INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma) VALUES ($1,$2,$3,$4)",
    [CHUA_PHAN, "ChoQ12", SHOP, maHoa("khoa", KHOA)],
  );
});
after(async () => {
  await sb.don();
});

const goi = (don, teamId = CHUA_PHAN) => {
  const { nap } = napGia(don);
  return docDon(
    pool,
    ctx,
    { shop: "ChoQ12", teamId, soTrangToiDa: 1 },
    { nap, env: KHOA },
  );
};

// ─── K · UPSERT KHACH (nợ Q1) ────────────────────────────────────────────────

test("K1 · đơn có SĐT → tạo khach mới, khach_id gán đúng, tên/địa chỉ/tỉnh lấy từ shipping_address", async () => {
  const kq = await goi([
    donGia(1001, {
      phone: "0501234561",
      ten: "Khách Một",
      diaChi: "123 Đường ABC",
      tinh: "Riyadh",
    }),
  ]);
  assert.equal(kq.khachMoi, 1);
  assert.equal(kq.khachDaCo, 0);
  assert.equal(kq.donKhongSdt, 0);

  const r = await pool.query(
    "SELECT id, so_dien_thoai, ten, dia_chi, thanh_pho FROM khach ORDER BY id DESC LIMIT 1",
  );
  assert.equal(r.rows[0].so_dien_thoai, "501234561"); // ĐÃ CHUẨN HOÁ (quyết định ⑤)
  assert.equal(r.rows[0].ten, "Khách Một");
  assert.equal(r.rows[0].dia_chi, "123 Đường ABC");
  assert.equal(r.rows[0].thanh_pho, "Riyadh");

  const d = await pool.query(
    "SELECT khach_id FROM don_hang WHERE ma_pos = $1",
    [`${SHOP}:1001`],
  );
  assert.ok(d.rows[0].khach_id != null, "khach_id không được NULL");
  // Phép SO THẬT: khach_id trên đơn phải trỏ ĐÚNG dòng khach vừa tạo — không phải so
  // một giá trị với chính nó (bản cũ có lỗi thước, sửa lại đây).
  assert.equal(String(d.rows[0].khach_id), String(r.rows[0].id));
});

test("K2 · đơn thứ hai CÙNG khách (SĐT khác định dạng) → DÙNG LẠI khach cũ, không tạo mới", async () => {
  const truoc = await pool.query("SELECT count(*)::int c FROM khach");
  const kq = await goi([
    donGia(1002, { phone: "+966501234561" }), // CÙNG số 0501234561, định dạng KHÁC
  ]);
  assert.equal(kq.khachMoi, 0, "không tạo khach thứ hai cho cùng một SĐT");
  assert.equal(kq.khachDaCo, 1);
  const sau = await pool.query("SELECT count(*)::int c FROM khach");
  assert.equal(sau.rows[0].c, truoc.rows[0].c, "tổng số khach KHÔNG tăng");

  const d = await pool.query(
    "SELECT khach_id FROM don_hang WHERE ma_pos = $1",
    [`${SHOP}:1002`],
  );
  const k = await pool.query(
    "SELECT id FROM khach WHERE so_dien_thoai = '501234561'",
  );
  assert.equal(String(d.rows[0].khach_id), String(k.rows[0].id));
});

test("K3 · đơn KHÔNG có SĐT → khach_id NULL, đếm ở donKhongSdt (không im lặng), không đẻ khach", async () => {
  const truoc = await pool.query("SELECT count(*)::int c FROM khach");
  const kq = await goi([donGia(1003, { phone: undefined })]);
  assert.equal(kq.donKhongSdt, 1);
  assert.equal(kq.khachMoi, 0);
  const sau = await pool.query("SELECT count(*)::int c FROM khach");
  assert.equal(sau.rows[0].c, truoc.rows[0].c);

  const d = await pool.query(
    "SELECT khach_id FROM don_hang WHERE ma_pos = $1",
    [`${SHOP}:1003`],
  );
  assert.equal(d.rows[0].khach_id, null);
});

// ─── P · san_pham_ma (nợ Q2) ──────────────────────────────────────────────────

test('P1 · san_pham_ma = mảng "<shop_id>:<variation_id>" của mọi dòng hàng', async () => {
  await goi([
    donGia(2001, {
      phone: "0501234562",
      items: [{ variation_id: "v-aaa" }, { variation_id: "v-bbb" }],
    }),
  ]);
  const r = await pool.query(
    "SELECT san_pham_ma FROM don_hang WHERE ma_pos = $1",
    [`${SHOP}:2001`],
  );
  assert.deepEqual(r.rows[0].san_pham_ma, [`${SHOP}:v-aaa`, `${SHOP}:v-bbb`]);
});

test("P2 · đơn KHÔNG có items → mảng RỖNG (KHÔNG NULL, KHÔNG bịa)", async () => {
  await goi([donGia(2002, { phone: "0501234563", items: [] })]);
  const r = await pool.query(
    "SELECT san_pham_ma FROM don_hang WHERE ma_pos = $1",
    [`${SHOP}:2002`],
  );
  assert.deepEqual(r.rows[0].san_pham_ma, []);
  assert.notEqual(r.rows[0].san_pham_ma, null);
});

// ─── B · BACKFILL đơn CŨ (di trú lại — mô phỏng 26 đơn thật) ─────────────────

test("B1 · dòng don_hang CŨ (khach_id/san_pham_ma/status_history NULL) → refresh BACKFILL dù trạng thái KHÔNG đổi", async () => {
  // Mô phỏng đúng hiện trạng 26 đơn thật trước phiếu này: dòng đã tồn tại, ba cột mới
  // đều NULL, trạng thái POS y hệt lần đọc tới.
  await pool.query(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos)
     VALUES ($1,$2,'trang_ban_hang','moi_tu_pos','12')`,
    [CHUA_PHAN, `${SHOP}:3001`],
  );
  const kq = await goi([
    donGia(3001, {
      status: 12, // Y HỆT trang_thai_pos đã lưu — KHÔNG phải lý do cập nhật
      phone: "0501234564",
      items: [{ variation_id: "v-ccc" }],
      statusHistory: [{ status: 0 }, { status: 12 }],
    }),
  ]);
  assert.equal(
    kq.capNhat,
    1,
    "phải CẬP NHẬT để backfill, không được giuNguyen",
  );
  assert.equal(kq.giuNguyen, 0);

  const r = await pool.query(
    "SELECT khach_id, san_pham_ma, status_history FROM don_hang WHERE ma_pos = $1",
    [`${SHOP}:3001`],
  );
  assert.ok(r.rows[0].khach_id != null, "khach_id được backfill");
  assert.deepEqual(r.rows[0].san_pham_ma, [`${SHOP}:v-ccc`]);
  assert.deepEqual(r.rows[0].status_history, [{ status: 0 }, { status: 12 }]);
});

test("B2 · chạy LẦN NỮA với CÙNG dữ liệu (đã backfill xong) → giuNguyen, không ghi lại", async () => {
  const kq = await goi([
    donGia(3001, {
      status: 12,
      phone: "0501234564",
      items: [{ variation_id: "v-ccc" }],
      statusHistory: [{ status: 0 }, { status: 12 }],
    }),
  ]);
  assert.equal(kq.capNhat, 0);
  assert.equal(kq.giuNguyen, 1);
});

// ─── I · IDEMPOTENT (④#5 phiếu) + TÍCH HỢP kiemTrung (④#4 — "phép ăn tiền") ──

test("I1 · docDon 2 lần CÙNG dữ liệu → khach/don_hang KHÔNG nhân đôi", async () => {
  const don = [
    donGia(4001, {
      phone: "0501234565",
      items: [{ variation_id: "v-ddd" }],
    }),
  ];
  const truocKhach = await pool.query("SELECT count(*)::int c FROM khach");
  const truocDon = await pool.query("SELECT count(*)::int c FROM don_hang");
  await goi(don);
  await goi(don);
  const sauKhach = await pool.query("SELECT count(*)::int c FROM khach");
  const sauDon = await pool.query("SELECT count(*)::int c FROM don_hang");
  assert.equal(
    sauKhach.rows[0].c,
    truocKhach.rows[0].c + 1,
    "đúng MỘT khach mới",
  );
  assert.equal(sauDon.rows[0].c, truocDon.rows[0].c + 1, "đúng MỘT đơn mới");
});

test("I2 · TÍCH HỢP kiemTrung — hai đơn (messenger + trang_ban_hang) CÙNG khách CÙNG SP sau docDon → BẮT ĐƯỢC (mirror cặp thật 966501984606)", async () => {
  const spChung = "v-chung";
  await goi([
    donGia(5001, {
      conv: "1195365960327240_27674781825547584", // → nguon=messenger
      phone: "+966501999999",
      items: [{ variation_id: spChung }, { variation_id: "v-rieng-a" }],
    }),
    donGia(5002, {
      conv: null, // → nguon=trang_ban_hang
      phone: "0501999999", // CÙNG khách, định dạng khác — đúng khuôn cặp thật
      items: [{ variation_id: spChung }, { variation_id: "v-rieng-b" }],
    }),
  ]);
  const kq = await kiemTrung(
    pool,
    { teamId: CHUA_PHAN, nguoiDungId: null },
    {
      soDienThoai: "966501999999",
      sanPhamId: `${SHOP}:${spChung}`,
    },
  );
  assert.equal(
    kq.trung,
    true,
    "phải BẮT được — trước phiếu này luôn trả rỗng (Q1/Q2)",
  );
  assert.equal(kq.ly_do, "trung_khop_san_pham");
  assert.equal(kq.nguon_trung, "ca_hai");
  assert.equal(kq.don.length, 2);
});

test("I3 · đơn CHƯA khai sản phẩm (mảng rỗng) → kiemTrung nối đúng nhánh mù-có-nói-ra của L3-M2", async () => {
  await goi([donGia(6001, { phone: "0501888888", items: [] })]);
  const kq = await kiemTrung(
    pool,
    { teamId: CHUA_PHAN, nguoiDungId: null },
    {
      soDienThoai: "0501888888",
      sanPhamId: `${SHOP}:bat-ky`,
    },
  );
  assert.equal(kq.trung, true);
  assert.equal(kq.ly_do, "nghi_trung_chua_ro_san_pham");
});
