// CR-15/09 · BỘ GIẢI BA TẦNG TRA THEO MÃ GỐC — trên POSTGRES THẬT.
//
// Ca chính là **Q2**: MỘT bản kịch bản `cap='san_pham'` viết theo mã gốc phục vụ được CẢ
// Kuwait LẪN Saudi. Đó là toàn bộ lý do CR này tồn tại — đo 15/09 thấy 14/18 khối kịch bản
// của hai page ấy giống nhau từng byte, tức 78% công là chép tay lặp lại.
//
// Ca Q4 canh chiều ngược: bản viết theo khoá POS CŨ vẫn phải giải được. Không có nó thì
// «nới cho cái mới» hoá ra «phá cái đang chạy».
//
// Ca Q5 canh luật «khoá gốc THẮNG, không lấy hợp» — nếu lấy hợp thì kỹ năng/kịch bản lan ra
// những page người ta vừa cố ý bỏ ra, và không ai thấy vì cả hai đều trả «có kịch bản».
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { docKichBanChoPage } from "../src/db/kich-ban.js";

let sb;
let team;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];

/** Dựng một page + một biến thể POS gắn vào nó. `maGoc` null = chưa ai soát gộp. */
async function dungPage({ pageId, ten, thiTruong, maPos, maGoc }) {
  const p = await mot(
    `INSERT INTO page (team_id, page_id, ten, thi_truong) VALUES ($1,$2,$3,$4) RETURNING id`,
    [team, pageId, ten, thiTruong],
  );
  await q(
    `INSERT INTO san_pham (team_id, page_id, ma, ten, ma_goc) VALUES ($1,$2,$3,$4,$5)`,
    [team, p.id, maPos, ten + " SP", maGoc],
  );
  return p.id;
}

async function dungKichBan({ cap, gocMa, posMa, thiTruong, ghiChu }) {
  return mot(
    `INSERT INTO kich_ban
       (team_id, page_id, phien_ban, trang_thai, noi_dung_nguoi, noi_dung_may,
        cap, san_pham_ma, san_pham_goc_ma, thi_truong, ghi_chu)
     VALUES ($1, NULL, 1, 'LIVE', '{}'::jsonb, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [team, "MÁY: " + ghiChu, cap, posMa ?? null, gocMa ?? null, thiTruong ?? null, ghiChu],
  );
}

before(async () => {
  sb = await dungSandbox("cr1509giai");
  team = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  await q(
    `INSERT INTO san_pham_goc (team_id, ma_goc, ten, so_hieu)
     VALUES ($1,'fitgum-acai-berry','Fitgum Acai Berry','125')`,
    [team],
  );
});
after(async () => sb && (await sb.don()));

/* ═══════════ ① MỘT KỊCH BẢN, NHIỀU THỊ TRƯỜNG ═══════════ */

test("Q1 · chưa có bản nào ⇒ nói rõ THIẾU GÌ, không trả null trần", async () => {
  const kw = await dungPage({
    pageId: "p-kw", ten: "Healthy Figure Kuwait", thiTruong: "Kuwait",
    maPos: "1328205226:uuid-kw", maGoc: "fitgum-acai-berry",
  });
  const r = await docKichBanChoPage(sb.pool, team, kw);
  assert.equal(r.ban, null);
  assert.ok(r.viSao, "không có bản nào thì PHẢI nói vì sao");
  assert.deepEqual(r.khoa.maGoc, ["fitgum-acai-berry"], "khoá gốc phải đọc ra được");
});

test("Q2 · MỘT bản `cap=san_pham` theo mã gốc phục vụ CẢ Kuwait lẫn Saudi", async () => {
  await dungKichBan({ cap: "san_pham", gocMa: "fitgum-acai-berry", ghiChu: "bản DÙNG CHUNG" });

  const kw = (await mot("SELECT id FROM page WHERE page_id='p-kw'")).id;
  const sa = await dungPage({
    pageId: "p-sa", ten: "Healthy Figure Saudi", thiTruong: "KSA",
    maPos: "1328205216:uuid-sa", maGoc: "fitgum-acai-berry", // mã POS KHÁC, mã gốc GIỐNG
  });

  const rKw = await docKichBanChoPage(sb.pool, team, kw);
  const rSa = await docKichBanChoPage(sb.pool, team, sa);

  assert.equal(rKw.cap, "san_pham");
  assert.equal(rSa.cap, "san_pham");
  assert.equal(rKw.ban.id, rSa.ban.id,
    "hai page hai thị trường phải nhận ĐÚNG MỘT bản — đây là cả lý do của CR");
  assert.match(rKw.tuDau, /khoá gốc/, "phải nói bản này tới từ khoá GỐC, để người soi được");
  assert.equal(rKw.keThua, true);
});

test("Q3 · tầng NƯỚC theo mã gốc HẸP HƠN tầng sản phẩm, và thắng", async () => {
  await dungKichBan({
    cap: "nuoc", gocMa: "fitgum-acai-berry", thiTruong: "Kuwait", ghiChu: "riêng Kuwait",
  });
  const kw = (await mot("SELECT id FROM page WHERE page_id='p-kw'")).id;
  const sa = (await mot("SELECT id FROM page WHERE page_id='p-sa'")).id;

  const rKw = await docKichBanChoPage(sb.pool, team, kw);
  assert.equal(rKw.cap, "nuoc", "Kuwait có bản riêng thì phải lấy bản riêng");
  assert.match(rKw.ban.ghi_chu, /riêng Kuwait/);

  const rSa = await docKichBanChoPage(sb.pool, team, sa);
  assert.equal(rSa.cap, "san_pham", "Saudi không có bản nước ⇒ vẫn kế thừa bản dùng chung");
});

/* ═══════════ ② CHIỀU NGƯỢC — ĐỪNG PHÁ CÁI ĐANG CHẠY ═══════════ */

test("Q4 · bản viết theo khoá POS CŨ vẫn giải được (page chưa soát gộp)", async () => {
  // Page chưa ai gộp: `ma_goc` NULL. Đây là trạng thái của 137 dòng hôm nay.
  const om = await dungPage({
    pageId: "p-om", ten: "Healthy Figure Oman", thiTruong: "Oman",
    maPos: "1942200986:uuid-om", maGoc: null,
  });
  await dungKichBan({ cap: "san_pham", posMa: "1942200986:uuid-om", ghiChu: "bản khoá POS cũ" });

  const r = await docKichBanChoPage(sb.pool, team, om);
  assert.equal(r.cap, "san_pham");
  assert.match(r.ban.ghi_chu, /khoá POS cũ/);
  assert.match(r.tuDau, /khoá POS/, "phải nói rõ nó tới từ khoá cũ");
  assert.deepEqual(r.khoa.maGoc, [], "page chưa soát thì mã gốc rỗng — và nói ra được");
});

test("Q5 · có CẢ HAI bản thì bản theo khoá GỐC thắng, không phải bản cũ", async () => {
  // Kuwait: đã có bản `cap='nuoc'` theo mã gốc (Q3). Thêm một bản `cap='nuoc'` theo khoá
  // POS cũ cho cùng page — di sản còn sót. Bản gốc phải thắng.
  await dungKichBan({
    cap: "nuoc", posMa: "1328205226:uuid-kw", thiTruong: "Kuwait", ghiChu: "DI SẢN khoá POS",
  });
  const kw = (await mot("SELECT id FROM page WHERE page_id='p-kw'")).id;
  const r = await docKichBanChoPage(sb.pool, team, kw);
  assert.match(r.ban.ghi_chu, /riêng Kuwait/,
    "bản theo khoá GỐC phải thắng — đảo thứ tự là để một dòng di sản che một dòng mới");
  assert.match(r.tuDau, /khoá gốc/);
});

/* ═══════════ ③ RÀO CSDL ═══════════ */

test("Q6 · lược đồ CHẶN hai bản LIVE cùng một mã gốc", async () => {
  await assert.rejects(
    () => dungKichBan({ cap: "san_pham", gocMa: "fitgum-acai-berry", ghiChu: "bản thứ hai" }),
    /duplicate key|unique/i,
    "thiếu chỉ mục này thì bộ giải chọn bản nào là do ORDER BY quyết — hỏng im lặng",
  );
});

test("Q7 · rào tầng: `cap='san_pham'` phải có ÍT NHẤT MỘT khoá sản phẩm", async () => {
  await assert.rejects(
    () => dungKichBan({ cap: "san_pham", ghiChu: "không khoá nào" }),
    /kich_ban_khoa_dung_cap/,
  );
  // Và `cap='page'` KHÔNG được mang khoá sản phẩm — phần này của rào 010 phải còn nguyên.
  await assert.rejects(
    () => mot(
      `INSERT INTO kich_ban (team_id, page_id, phien_ban, trang_thai, noi_dung_nguoi,
         noi_dung_may, cap, san_pham_goc_ma)
       VALUES ($1, (SELECT id FROM page WHERE page_id='p-kw'), 9, 'DRAFT', '{}'::jsonb,
               'x', 'page', 'fitgum-acai-berry') RETURNING id`,
      [team],
    ),
    /kich_ban_khoa_dung_cap/,
    "nới rào cho khoá mới KHÔNG được làm mất phần rào cũ",
  );
});

test("Q8 · `so_hieu` chỉ nhận 1-4 chữ số, và `ma_goc` CẤM chứa dấu hai chấm", async () => {
  await assert.rejects(
    () => q(`INSERT INTO san_pham_goc (team_id, ma_goc, so_hieu) VALUES ($1,'x','12345')`, [team]),
    /so_hieu/,
  );
  await assert.rejects(
    () => q(`INSERT INTO san_pham_goc (team_id, ma_goc) VALUES ($1,'123:abc')`, [team]),
    /ma_goc/,
    "dấu hai chấm là của mã POS <shop>:<variation> — lẫn vào là trộn hai vốn từ",
  );
});

test("Q9 · `san_pham.ma_goc` phải trỏ vào sản phẩm gốc CÓ THẬT", async () => {
  const p = await mot(
    `INSERT INTO page (team_id, page_id, ten) VALUES ($1,'p-x','X') RETURNING id`, [team],
  );
  await assert.rejects(
    () => q(
      `INSERT INTO san_pham (team_id, page_id, ma, ma_goc) VALUES ($1,$2,'9:9','khong-ton-tai')`,
      [team, p.id],
    ),
    /san_pham_ma_goc_co_that/,
    "không có khoá ngoại thì một mã gõ nhầm thành sản phẩm ma (án lệ #22)",
  );
});

test("Q10 · một page có NHIỀU biến thể POS cùng mã gốc ⇒ khoá gốc chỉ liệt kê MỘT lần", async () => {
  // Cảnh thật: cùng một sản phẩm có nhiều biến thể trong MỘT shop (size, màu). Cả ba đều
  // trỏ về một `ma_goc`. Để trùng thì câu `= ANY()` vẫn đúng, nhưng `ORDER BY` chọn bản
  // LIVE theo thứ tự khó đoán, và màn hiện «3 sản phẩm» cho một thứ.
  const p = await mot(
    `INSERT INTO page (team_id, page_id, ten, thi_truong) VALUES ($1,'p-nhieu','Nhiều biến thể','Oman')
     RETURNING id`,
    [team],
  );
  for (const bt of ["s", "m", "l"]) {
    await q(
      `INSERT INTO san_pham (team_id, page_id, ma, ten, ma_goc)
       VALUES ($1,$2,$3,$4,'fitgum-acai-berry')`,
      [team, p.id, `1942200986:uuid-${bt}`, `Fitgum size ${bt}`],
    );
  }
  const r = await docKichBanChoPage(sb.pool, team, p.id);
  assert.deepEqual(r.khoa.maGoc, ["fitgum-acai-berry"], "ba biến thể ⇒ MỘT mã gốc");
  assert.equal(r.khoa.maSp.length, 3, "nhưng vẫn giữ đủ ba mã POS — chúng là ba thứ thật");
});
