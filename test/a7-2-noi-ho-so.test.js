// A7-2 · NỐI HỘI THOẠI MESSENGER VÀO HỒ SƠ KHÁCH.
//
// Ca CHÍNH của bộ này là **G3**: cửa POS tạo khách trước, rồi job Messenger phải NỐI VÀO
// ĐÚNG dòng đó chứ không đẻ dòng thứ hai. Đó là toàn bộ lý do A7 tồn tại — «gộp các kênh
// theo số điện thoại». Và theo luật đã trả giá hai lần ngày 25/08, ca KHỚP không đủ: G4
// là ca hai kênh KHÁC NƯỚC cùng số, phải ra HAI khách. Thiếu G4 thì G3 xanh cả trên một
// bản cài gộp bừa mọi thứ làm một.
import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { maHoa } from "../db/khoa.js";
import { ctxHeThong } from "../src/db/index.js";
import { docDon, quenLuoiMigration } from "../src/pos/doc-don.js";
import { noiKhachChoHoiThoai, viSaoRong } from "../src/chat/ho-so-khach.js";

const KHOA = { V3_KHOA_MA_HOA: "b".repeat(64) };
const SHOP_SAUDI = "8880001";
const SHOP_UAE = "8880002";

let sb, tA, pSaudi, pUae, pMoCoi;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];

const napGia = (don) => async () => ({
  ok: true,
  status: 200,
  text: async () =>
    JSON.stringify({ data: don, total_entries: don.length, total_pages: 1 }),
});

const donGia = (id, sdt) => ({
  id,
  status: 12,
  status_name: "wait_print",
  conversation_id: null,
  page_id: null,
  order_currency: "AED",
  cod: 9900,
  total_price: 0,
  shipping_address: { phone_number: sdt, full_name: `KH ${sdt}` },
});

/** Một hội thoại có SĐT trong `ho_so` — đúng khuôn dữ liệu thật đã di trú. */
const themHoiThoai = async (pageId, psid, sdt) =>
  (
    await q(
      `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu, ho_so)
       VALUES ($1,$2,$3,'GREET','AI',$4) RETURNING id`,
      [tA, pageId, psid, sdt === null ? "{}" : JSON.stringify({ phone: sdt })],
    )
  ).rows[0].id;

before(async () => {
  sb = await dungSandbox("a72nohoso");
  tA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  for (const [mk, sid] of [
    ["Saudi", SHOP_SAUDI],
    ["UAE", SHOP_UAE],
  ])
    await q(
      "INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma) VALUES ($1,$2,$3,$4)",
      [tA, mk, sid, maHoa("khoa", KHOA)],
    );
  const page = async (ten, fb, shop) =>
    (
      await q(
        "INSERT INTO page (team_id, page_id, ten, pos_shop_id) VALUES ($1,$2,$3,$4) RETURNING id",
        [tA, fb, ten, shop],
      )
    ).rows[0].id;
  pSaudi = await page("Page Saudi", "9001", SHOP_SAUDI);
  pUae = await page("Page UAE", "9002", SHOP_UAE);
  pMoCoi = await page("Page chưa gán shop", "9003", null); // pos_shop_id NULL
});
after(async () => sb && (await sb.don()));

beforeEach(async () => {
  await q("UPDATE hoi_thoai SET khach_id = NULL");
  await q("DELETE FROM don_hang");
  await q("DELETE FROM hoi_thoai");
  await q("DELETE FROM khach");
  quenLuoiMigration();
});

test("G1 · nối được hội thoại có SĐT, và tạo khách MANG nước của page", async () => {
  const h = await themHoiThoai(pSaudi, "psid-1", "0501234567");
  const kq = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });
  assert.equal(kq.xet, 1);
  assert.equal(kq.noiMoi, 1);
  assert.equal(kq.khachMoi, 1);

  const ht = await mot("SELECT khach_id FROM hoi_thoai WHERE id=$1", [h]);
  assert.ok(ht.khach_id, "hoi_thoai.khach_id phải được ghi");
  const k = await mot("SELECT thi_truong, so_dien_thoai FROM khach WHERE id=$1", [
    ht.khach_id,
  ]);
  assert.equal(k.thi_truong, "Saudi", "nước lấy từ ket_noi_pos.market qua pos_shop_id");
  assert.equal(k.so_dien_thoai, "501234567", "SĐT lưu dạng ĐÃ chuẩn hoá");
});

test("G2 · chạy lại KHÔNG đẻ thêm dòng nào (idempotent)", async () => {
  await themHoiThoai(pSaudi, "psid-2", "0501234567");
  const a = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });
  const b = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });
  assert.equal(a.noiMoi, 1);
  assert.equal(b.xet, 0, "lượt hai không còn gì để xét — đã nối hết");
  const n = await mot("SELECT count(*)::int c FROM khach");
  assert.equal(n.c, 1, "vẫn đúng MỘT khách");
});

test("G3 · CA CHÍNH — POS tạo khách trước, Messenger NỐI VÀO, không đẻ dòng hai", async () => {
  // ① cửa POS đọc một đơn Saudi
  const pos = await docDon(
    sb.pool,
    ctxHeThong(),
    { shop: "Saudi", teamId: tA },
    { nap: napGia([donGia(7001, "0501234567")]), env: KHOA },
  );
  assert.equal(pos.khachMoi, 1, "POS tạo khách");

  // ② hội thoại Messenger của CÙNG người, trên page thuộc CÙNG shop Saudi
  const h = await themHoiThoai(pSaudi, "psid-3", "+966 50 123 4567");
  const kq = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });

  assert.equal(kq.khachMoi, 0, "KHÔNG được tạo khách mới — người này POS đã biết");
  assert.equal(kq.noiVaoCoSan, 1, "phải nối vào dòng POS đã tạo");

  const tong = await mot("SELECT count(*)::int c FROM khach");
  assert.equal(tong.c, 1, "hai kênh, MỘT hồ sơ — đây là toàn bộ mục đích của A7");

  const ht = await mot("SELECT khach_id FROM hoi_thoai WHERE id=$1", [h]);
  const don = await mot("SELECT khach_id FROM don_hang LIMIT 1");
  assert.equal(
    String(ht.khach_id),
    String(don.khach_id),
    "hội thoại và đơn phải trỏ về CÙNG một khach.id",
  );
});

test("G4 · ca KHÔNG khớp — hai kênh KHÁC NƯỚC cùng số ⇒ HAI hồ sơ", async () => {
  await docDon(
    sb.pool,
    ctxHeThong(),
    { shop: "UAE", teamId: tA },
    { nap: napGia([donGia(7002, "561698732")]), env: KHOA },
  );
  // hội thoại cùng số nhưng trên page thuộc shop SAUDI
  const h = await themHoiThoai(pSaudi, "psid-4", "561698732");
  const kq = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });

  assert.equal(kq.khachMoi, 1, "khác nước ⇒ phải là NGƯỜI KHÁC");
  const tong = await mot("SELECT count(*)::int c FROM khach");
  assert.equal(tong.c, 2, "hai nước, hai hồ sơ");

  const ht = await mot("SELECT khach_id FROM hoi_thoai WHERE id=$1", [h]);
  const don = await mot("SELECT khach_id FROM don_hang LIMIT 1");
  assert.notEqual(
    String(ht.khach_id),
    String(don.khach_id),
    "gộp hai người này làm một là đúng lỗi A7-1 vừa vá",
  );
});

test("G5 · page CHƯA có pos_shop_id ⇒ BỎ QUA + kê tên page, không tạo khách nước-NULL", async () => {
  await themHoiThoai(pMoCoi, "psid-5", "0501234567");
  const kq = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });

  assert.equal(kq.thieuNuoc, 1);
  assert.equal(kq.noiMoi, 0);
  assert.equal((await mot("SELECT count(*)::int c FROM khach")).c, 0,
    "không được đẻ một dòng đã biết trước là không gộp được");
  assert.ok(
    kq.pageThieuShop.some((s) => s.includes("Page chưa gán shop")),
    `phải kê ĐÍCH DANH page đang chặn — đang có: ${JSON.stringify(kq.pageThieuShop)}`,
  );

  const vs = viSaoRong(kq);
  assert.match(vs, /pos_shop_id/, "câu giải thích phải chỉ đúng cột cần điền");
  assert.match(vs, /Page chưa gán shop/);
});

test("G6 · hai hội thoại CÙNG người trong CÙNG lượt ⇒ về CÙNG một khách", async () => {
  await themHoiThoai(pSaudi, "psid-6a", "0501234567");
  await themHoiThoai(pSaudi, "psid-6b", "+966501234567");
  const kq = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });
  assert.equal(kq.khachMoi, 1, "hai hội thoại nhưng MỘT người");
  assert.equal((await mot("SELECT count(*)::int c FROM khach")).c, 1);
  const ds = (
    await q("SELECT DISTINCT khach_id FROM hoi_thoai WHERE khach_id IS NOT NULL")
  ).rows;
  assert.equal(ds.length, 1, "cả hai hội thoại trỏ về cùng một khach.id");
});

// Ca này SINH RA TỪ MỘT LƯỢT ĐẢO-VÁ: đổi `khoaKhach(h.market, …)` thành
// `khoaKhach(null, …)` mà CẢ CHÍN ca kia vẫn xanh — vì câu tra CSDL còn kẹp
// `thi_truong = $2` nên hành vi được cứu ở tầng dưới. Lỗ duy nhất mà đột biến đó mở là
// BẢN ĐỒ TRONG LƯỢT (`banDo`): hai hội thoại cùng số KHÁC NƯỚC trong CÙNG một lượt thì
// cái thứ hai ăn phải khách của cái thứ nhất, không lần nào chạm CSDL để biết mình sai.
// Không có ca này thì `banDo` là một nhánh không ai đo — án lệ #29.
test("G10 · CÙNG lượt, cùng số, KHÁC nước ⇒ vẫn phải ra HAI khách (bẫy bản đồ trong lượt)", async () => {
  const hS = await themHoiThoai(pSaudi, "psid-10a", "561698732");
  const hU = await themHoiThoai(pUae, "psid-10b", "561698732");
  const kq = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });

  assert.equal(kq.khachMoi, 2, "hai nước ⇒ hai người, dù cùng một lượt chạy");
  assert.equal((await mot("SELECT count(*)::int c FROM khach")).c, 2);

  const a = await mot("SELECT khach_id FROM hoi_thoai WHERE id=$1", [hS]);
  const b = await mot("SELECT khach_id FROM hoi_thoai WHERE id=$1", [hU]);
  assert.notEqual(
    String(a.khach_id),
    String(b.khach_id),
    "bản đồ trong lượt phải khoá theo (nước, số), không chỉ theo số",
  );
  const nuoc = (
    await q(
      "SELECT k.thi_truong FROM khach k ORDER BY k.thi_truong",
    )
  ).rows.map((r) => r.thi_truong);
  assert.deepEqual(nuoc, ["Saudi", "UAE"]);
});

test("G7 · SĐT không đọc được ⇒ đếm riêng, KHÔNG nối bừa", async () => {
  await themHoiThoai(pSaudi, "psid-7", "khong-co-chu-so-nao");
  const kq = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });
  assert.equal(kq.sdtKhongDocDuoc, 1);
  assert.equal(kq.noiMoi, 0);
  assert.equal((await mot("SELECT count(*)::int c FROM khach")).c, 0);
});

test("G8 · so-và-đặt: hội thoại đã có khách thì lượt sau KHÔNG ghi đè", async () => {
  const h = await themHoiThoai(pSaudi, "psid-8", "0501234567");
  await noiKhachChoHoiThoai(sb.pool, { teamId: tA });
  const truoc = await mot("SELECT khach_id FROM hoi_thoai WHERE id=$1", [h]);

  // dựng cảnh «ai đó gán tay một khách khác» rồi chạy lại: câu tìm phải BỎ QUA nó
  const khacId = (
    await q(
      "INSERT INTO khach (team_id, thi_truong, so_dien_thoai) VALUES ($1,'Saudi','509999999') RETURNING id",
      [tA],
    )
  ).rows[0].id;
  await q("UPDATE hoi_thoai SET khach_id=$1 WHERE id=$2", [khacId, h]);
  const kq = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });

  assert.equal(kq.xet, 0, "hội thoại đã có khách không được xét lại");
  const sau = await mot("SELECT khach_id FROM hoi_thoai WHERE id=$1", [h]);
  assert.equal(String(sau.khach_id), String(khacId), "không ghi đè người đã gán");
  assert.notEqual(String(sau.khach_id), String(truoc.khach_id));
});

test("G9 · viSaoRong nói ĐÚNG lý do, và im khi có kết quả thật", async () => {
  const rong = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });
  assert.match(viSaoRong(rong), /chưa có hội thoại nào|đã nối hết/);

  await themHoiThoai(pSaudi, "psid-9", "0501234567");
  const co = await noiKhachChoHoiThoai(sb.pool, { teamId: tA });
  assert.equal(viSaoRong(co), null, "có kết quả thật thì KHÔNG giải thích cái rỗng");
});
