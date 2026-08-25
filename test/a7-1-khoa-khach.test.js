// A7-1 · KHOÁ ĐỊNH DANH KHÁCH = (team, NƯỚC, SĐT) — migration 013.
//
// Luật khoá xuyên suốt bộ ca này: **ca KHỚP không chứng minh gì.** Khoá cũ
// `(team_id, so_dien_thoai)` cũng xanh trên mọi ca «hai đơn cùng nước cùng số → một
// khách». Thứ phân biệt khoá cũ với khoá mới là ca hai đơn KHÁC NƯỚC CÙNG SỐ — nên ca
// đó (Q3/Q6) là ca chính, phần còn lại chỉ là lưới chống hồi quy. Đây là bài học đã
// trả giá hai lần ngày 25/08 (B-Y7: «thước của tôi xanh vì fixture dựng hai vế bằng nhau»).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { maHoa } from "../db/khoa.js";
import { ctxHeThong } from "../src/db/index.js";
import { khoaKhach, chuanHoaSdt } from "../src/orders/loc-trung.js";
import { docDon, quenLuoiMigration } from "../src/pos/doc-don.js";

const KHOA = { V3_KHOA_MA_HOA: "b".repeat(64) };

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
let tA, tB;

/** `nap` giả — chỉ nhánh đơn hàng, khuôn chép từ POS thật (đo 26/08: SĐT NỘI ĐỊA). */
function napGia(don) {
  return async () => ({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({ data: don, total_entries: don.length, total_pages: 1 }),
  });
}

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

/** Chèn thẳng SQL — bộ ca này đo CHỈ MỤC, nên phải đi vòng qua tầng truy vấn. */
const themKhach = (team, thiTruong, sdt) =>
  q(
    "INSERT INTO khach (team_id, thi_truong, so_dien_thoai) VALUES ($1,$2,$3) RETURNING id",
    [team, thiTruong, sdt],
  );

before(async () => {
  sb = await dungSandbox("a71khoakhach");
  tA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  tB = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
  // Hai shop, hai NƯỚC — đúng hình dạng thật: 7 shop / 7 nước / cùng một team.
  for (const [mk, sid] of [
    ["Saudi", "7770001"],
    ["UAE", "7770002"],
  ])
    await q(
      "INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma) VALUES ($1,$2,$3,$4)",
      [tA, mk, sid, maHoa("khoa", KHOA)],
    );
});
after(async () => sb && (await sb.don()));

test("Q1 · migration 013 áp được: cột + chỉ mục mới có, chỉ mục cũ ĐÃ ĐI", async () => {
  const cot = await mot(
    `SELECT count(*)::int c FROM information_schema.columns
      WHERE table_name='khach' AND column_name='thi_truong'`,
  );
  assert.equal(cot.c, 1, "khach.thi_truong phải tồn tại");

  const ds = (
    await q("SELECT indexname FROM pg_indexes WHERE tablename='khach'")
  ).rows.map((r) => r.indexname);
  assert.ok(
    ds.includes("khach_sdt_trong_team_nuoc"),
    `chỉ mục mới phải có — đang có: ${ds.join(", ")}`,
  );
  assert.ok(
    !ds.includes("khach_sdt_trong_team"),
    "chỉ mục CŨ phải bị gỡ, để lại là còn hai luật cùng lúc",
  );
});

test("Q2 · CÙNG nước + CÙNG số ⇒ vẫn CHẶN (không phá hành vi cũ)", async () => {
  await themKhach(tA, "Saudi", "501111111");
  await assert.rejects(
    () => themKhach(tA, "Saudi", "501111111"),
    /duplicate key|khach_sdt_trong_team_nuoc/i,
    "hai khách cùng nước cùng số vẫn phải là MỘT",
  );
});

test("Q3 · KHÁC nước + CÙNG số ⇒ HAI DÒNG — đây là ca khoá cũ TRƯỢT", async () => {
  // `547049872` là một trong SÁU số đo được có thật ở CẢ Saudi lẫn UAE (26/08,
  // mẫu 3.000 đơn/shop). Không phải số bịa.
  const a = await themKhach(tA, "Saudi", "547049872");
  const b = await themKhach(tA, "UAE", "547049872");
  assert.notEqual(
    String(a.rows[0].id),
    String(b.rows[0].id),
    "khách Saudi và khách UAE cùng số phải là HAI người",
  );
  const n = await mot(
    "SELECT count(*)::int c FROM khach WHERE team_id=$1 AND so_dien_thoai=$2",
    [tA, "547049872"],
  );
  assert.equal(n.c, 2);
});

test("Q4 · CHƯA BIẾT nước (NULL) + cùng số ⇒ vẫn gộp — coalesce bịt lỗ hai-NULL", async () => {
  await themKhach(tA, null, "502222222");
  await assert.rejects(
    () => themKhach(tA, null, "502222222"),
    /duplicate key|khach_sdt_trong_team_nuoc/i,
    "hai NULL là KHÁC nhau trong index trần — thiếu coalesce là lọt, đúng lỗ 012 vừa bịt",
  );
  // và NULL không được coi là cùng một nước với một nước có tên
  const c = await themKhach(tA, "Oman", "502222222");
  assert.ok(c.rows[0].id, "NULL và 'Oman' là hai phạm vi khác nhau");
});

test("Q5 · khoá vẫn KẸP TEAM — hai team cùng nước cùng số là hai khách", async () => {
  await themKhach(tA, "Qatar", "503333333");
  const b = await themKhach(tB, "Qatar", "503333333");
  assert.ok(b.rows[0].id, "team khác thì không đụng nhau");
});

test("Q6 · hàm JS `khoaKhach` và CHỈ MỤC SQL ra CÙNG một phán quyết", async () => {
  // Không đọc hai bản rồi so bằng mắt (án lệ #3). Cho CSDL tự trả lời: với mỗi cặp,
  // khoá JS bằng nhau  ⇔  CSDL từ chối dòng thứ hai.
  const cap = [
    [["Kuwait", "66410373"], ["Kuwait", "66410373"], true],
    [["Kuwait", "66410373"], ["Qatar", "66410373"], false],
    [["Saudi", "0501234567"], ["Saudi", "+966501234567"], true], // chuẩn hoá rồi mới so
    [[null, "504444444"], ["", "504444444"], true], // null và rỗng cùng nghĩa
    [["UAE", "505555555"], [null, "505555555"], false],
  ];
  for (const [[n1, s1], [n2, s2], choTrung] of cap) {
    await q("DELETE FROM khach WHERE so_dien_thoai = $1", [chuanHoaSdt(s1)]);
    const jsTrung = khoaKhach(n1, s1) === khoaKhach(n2, s2);
    assert.equal(
      jsTrung,
      choTrung,
      `JS: khoaKhach(${n1},${s1}) vs khoaKhach(${n2},${s2})`,
    );

    await themKhach(tA, n1, chuanHoaSdt(s1));
    let sqlTrung = false;
    try {
      await themKhach(tA, n2, chuanHoaSdt(s2));
    } catch {
      sqlTrung = true;
    }
    assert.equal(
      sqlTrung,
      jsTrung,
      `LỆCH LUẬT: JS nói ${jsTrung ? "trùng" : "khác"} còn CSDL nói ` +
        `${sqlTrung ? "trùng" : "khác"} cho (${n1},${s1}) vs (${n2},${s2})`,
    );
  }
});

// ─── HÀNH VI THẬT: docDon đi trọn đường, không chỉ đo hằng ───────────────────

test("Q9 · HAI SHOP KHÁC NƯỚC, CÙNG SỐ ⇒ docDon tạo HAI khách (ca chính của A7-1)", async () => {
  await q("DELETE FROM don_hang");
  await q("DELETE FROM khach");
  quenLuoiMigration();
  const ctx = ctxHeThong();
  // `561698732` — số ĐO ĐƯỢC có thật ở cả Saudi lẫn UAE trên POS (26/08).
  const a = await docDon(
    sb.pool,
    ctx,
    { shop: "Saudi", teamId: tA },
    { nap: napGia([donGia(9001, "561698732")]), env: KHOA },
  );
  const b = await docDon(
    sb.pool,
    ctx,
    { shop: "UAE", teamId: tA },
    { nap: napGia([donGia(9002, "561698732")]), env: KHOA },
  );
  assert.equal(a.khoaTheoNuoc, true, "013 đã áp thì phải khoá theo nước");
  assert.equal(a.khachMoi, 1, "lượt Saudi tạo 1 khách");
  assert.equal(b.khachMoi, 1, "lượt UAE phải tạo khách RIÊNG, không khớp vào Saudi");
  assert.equal(b.khachDaCo, 0, "khoá cũ sẽ cho 1 ở đây — đó là lỗi A7-1 vá");

  const ds = (
    await q(
      "SELECT thi_truong FROM khach WHERE team_id=$1 AND so_dien_thoai=$2 ORDER BY thi_truong",
      [tA, "561698732"],
    )
  ).rows.map((r) => r.thi_truong);
  assert.deepEqual(ds, ["Saudi", "UAE"], "và mỗi dòng phải MANG nước của nó");
});

test("Q10 · CÙNG shop, cùng số, hai lượt ⇒ vẫn MỘT khách (không đẻ trùng)", async () => {
  await q("DELETE FROM don_hang");
  await q("DELETE FROM khach");
  quenLuoiMigration();
  const ctx = ctxHeThong();
  const a = await docDon(
    sb.pool,
    ctx,
    { shop: "Saudi", teamId: tA },
    { nap: napGia([donGia(9101, "509999999")]), env: KHOA },
  );
  const b = await docDon(
    sb.pool,
    ctx,
    { shop: "Saudi", teamId: tA },
    { nap: napGia([donGia(9102, "509999999")]), env: KHOA },
  );
  assert.equal(a.khachMoi, 1);
  assert.equal(b.khachMoi, 0, "lượt hai KHÔNG được tạo thêm");
  assert.equal(b.khachDaCo, 1);
});

test("Q11 · LƯỚI MIGRATION — chưa áp 013 thì LÙI + KÊU RA, không chết", async () => {
  await q("DELETE FROM don_hang");
  await q("DELETE FROM khach");
  // Giả cảnh «code mới, CSDL cũ»: gỡ đúng cột 013 thêm vào.
  await q("DROP INDEX khach_sdt_trong_team_nuoc");
  await q("ALTER TABLE khach DROP COLUMN thi_truong");
  await q(
    `CREATE UNIQUE INDEX khach_sdt_trong_team ON khach (team_id, so_dien_thoai)
       WHERE so_dien_thoai IS NOT NULL`,
  );
  quenLuoiMigration();

  const canh = [];
  const canhCu = console.warn;
  console.warn = (...a) => canh.push(a.join(" "));
  try {
    const kq = await docDon(
      sb.pool,
      ctx0(),
      { shop: "Saudi", teamId: tA },
      { nap: napGia([donGia(9201, "507777777")]), env: KHOA },
    );
    assert.equal(kq.khoaTheoNuoc, false, "phải TỰ KHAI là đang mù");
    assert.equal(kq.khachMoi, 1, "và vẫn chạy được, không ném");
  } finally {
    console.warn = canhCu;
  }
  assert.ok(
    canh.some((c) => c.includes("013")),
    `phải KÊU RA thiếu 013 — đã in: ${JSON.stringify(canh)}`,
  );

  // trả hiện trường về sau 013 cho các ca sau
  await q("DELETE FROM khach");
  await q("DROP INDEX khach_sdt_trong_team");
  await q("ALTER TABLE khach ADD COLUMN thi_truong text");
  await q(
    `CREATE UNIQUE INDEX khach_sdt_trong_team_nuoc
       ON khach (team_id, coalesce(thi_truong,''), so_dien_thoai)
       WHERE so_dien_thoai IS NOT NULL`,
  );
  quenLuoiMigration();
});

const ctx0 = () => ctxHeThong();

test("Q7 · `khoaKhach` không đọc được số ⇒ null (không có khoá nối, không bịa)", () => {
  assert.equal(khoaKhach("Saudi", null), null);
  assert.equal(khoaKhach("Saudi", "abc"), null);
  assert.equal(khoaKhach("Saudi", ""), null);
  // và nước KHÔNG tự sinh ra khoá khi thiếu số
  assert.equal(khoaKhach(null, null), null);
});

test("Q8 · down 013 KHÔNG được im lặng nuốt khách khác nước cùng số", async () => {
  await q("DELETE FROM khach");
  await themKhach(tA, "Saudi", "538440108");
  await themKhach(tA, "UAE", "538440108");
  await assert.rejects(
    async () => {
      await q("DROP INDEX khach_sdt_trong_team_nuoc");
      await q(
        `CREATE UNIQUE INDEX khach_sdt_trong_team ON khach (team_id, so_dien_thoai)
           WHERE so_dien_thoai IS NOT NULL`,
      );
    },
    /could not create unique index|duplicate key/i,
    "down phải ĐỎ khi có cặp khác nước cùng số — im lặng ở đây là mất một khách",
  );
  // dựng lại hiện trường cho lần chạy sau
  await q("DELETE FROM khach");
  await q(
    `CREATE UNIQUE INDEX IF NOT EXISTS khach_sdt_trong_team_nuoc
       ON khach (team_id, coalesce(thi_truong,''), so_dien_thoai)
       WHERE so_dien_thoai IS NOT NULL`,
  );
});
