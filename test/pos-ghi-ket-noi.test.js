// GHI KẾT NỐI POS trên POSTGRES THẬT — `src/pos/ket-noi.js#themKetNoi|suaKetNoi|batTatKetNoi|boKetNoi`.
//
// VÌ SAO PHẢI CÓ BỘ CA NÀY dù `v3/test/b/ket-noi-pos-ghi.test.mjs` đã xanh 11/11: bộ ca kia
// đo tầng router bằng một BÀN GIẢ do chính tôi viết — và án lệ đắt nhất của dự án này là
// «bản cài giả dễ tính hơn bản thật, 313 bài xanh không chứng minh gì» (24/08). Bàn giả
// không có CHECK, không có UNIQUE, không có khoá ngoại, và nó không biết giải mã.
//
// Bốn thứ CHỈ bản thật nói được, và cả bốn đều là đường tiền:
//   ① Khoá ghi xuống có GIẢI MÃ LẠI ĐƯỢC bằng đúng bộ đọc mà cửa POS dùng không. Một lượt
//      ghi mà `layKetNoi()` không đọc nổi là một thị trường chết câm cho tới lượt tạo đơn.
//   ② `CHECK (api_key_ma LIKE 'v1.%')` của migration 002 có nhận bao thư của `maHoa` không.
//   ③ Hai ràng buộc UNIQUE có bắn 23505 đúng chỗ mình nghĩ không.
//   ④ Vế `team_id` trong WHERE có thật sự chặn team khác không — bàn giả không có team.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import {
  themKetNoi,
  suaKetNoi,
  batTatKetNoi,
  boKetNoi,
  layKetNoi,
  lietKeThiTruong,
  LoiThieuKetNoiPos,
} from "../src/pos/ket-noi.js";

const KHOA = { V3_KHOA_MA_HOA: "c".repeat(64) };
const K1 = "khoa-pos-saudi-nguyen-van-0001";
const K2 = "khoa-pos-saudi-DA-DOI-0002";

let sb;
let tA, tB;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
const ctx = (teamId) => ({ teamId: String(teamId) });

before(async () => {
  sb = await dungSandbox("posghiketnoi");
  tA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  tB = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
});
after(async () => sb && (await sb.don()));

/* ═══════════ ① VÒNG TRÒN GHI → ĐỌC: cửa ghi và bộ đọc phải là một cặp ═══════════ */

test("P1 · ghi xong thì CHÍNH bộ đọc của cửa POS giải mã lại ra đúng khoá", async () => {
  const kq = await themKetNoi(
    sb.pool,
    ctx(tA),
    { market: "Saudi", shopId: "9001", apiKey: K1 },
    { env: KHOA },
  );
  assert.equal(kq.market, "Saudi");
  assert.equal(kq.coKhoa, true);
  assert.ok(!("apiKey" in kq), "bản ghi trả ra KHÔNG được mang khoá");
  assert.ok(!JSON.stringify(kq).includes(K1), "khoá lọt vào giá trị trả về");

  // Đây là ca chính của cả bộ: `layKetNoi` là hàm cửa tạo đơn gọi mỗi lượt.
  const doc = await layKetNoi(sb.pool, ctx(tA), "Saudi", { env: KHOA });
  assert.equal(doc.apiKey, K1, "ghi rồi mà bộ đọc thật không lấy lại được khoá");
  assert.equal(doc.shopId, "9001");
});

test("P2 · bao thư của maHoa qua được CHECK `api_key_ma LIKE 'v1.%'` của migration 002", async () => {
  const d = await mot(
    "SELECT api_key_ma FROM ket_noi_pos WHERE team_id=$1 AND market='Saudi'",
    [tA],
  );
  assert.match(d.api_key_ma, /^v1\./, "lược đồ chỉ nhận bao thư v1.<iv>.<tag>.<ct>");
  assert.ok(!d.api_key_ma.includes(K1), "khoá phải nằm dưới dạng mã hoá, không nguyên văn");
});

test("P3 · khoá mã hoá HỎNG thì TỪ CHỐI GHI, không rơi về khoá mặc định", async () => {
  // ⚠️ Đo bằng khoá SAI ĐỘ DÀI, không đo bằng «vắng biến» — và đó không phải tiện tay.
  //    `moiTruongKhoa` CỐ Ý rơi về đọc tệp `.env` khi `process.env` chưa có (nó sinh ra vì
  //    `npm run di-tru` chết dù `.env` đủ biến). Nên trên một máy có `.env`, cảnh «vắng
  //    V3_KHOA_MA_HOA» KHÔNG dựng lại được bằng cách truyền env rỗng — bài test đầu tiên
  //    tôi viết đã xanh giả vì thế. Khoá sai độ dài thì `docBien` trả về chính nó, và
  //    `khoaGoc` chặn — cùng một nhánh `bocKhoa`, mà đo được ở mọi máy.
  await assert.rejects(
    () =>
      themKetNoi(
        sb.pool,
        ctx(tA),
        { market: "Bahrain", shopId: "9999", apiKey: "k" },
        { env: { V3_KHOA_MA_HOA: "khoa-qua-ngan" } },
      ),
    (e) => e.ma === "thieu_khoa_ma_hoa" && e.status === 500,
  );
  const con = await mot(
    "SELECT count(*)::int c FROM ket_noi_pos WHERE team_id=$1 AND market='Bahrain'",
    [tA],
  );
  assert.equal(con.c, 0, "từ chối mà vẫn ghi được một dòng là tệ hơn cả ghi khoá sai");
});

/* ═══════════ ② SỬA: khoá rỗng = giữ khoá, và phải giữ ĐÚNG khoá cũ ═══════════ */

test("P4 · sửa shop mà để trống khoá ⇒ khoá cũ còn nguyên, đọc lại vẫn đúng", async () => {
  await suaKetNoi(sb.pool, ctx(tA), await idCua(tA, "Saudi"), { shopId: "9002" }, { env: KHOA });
  const doc = await layKetNoi(sb.pool, ctx(tA), "Saudi", { env: KHOA });
  assert.equal(doc.shopId, "9002");
  assert.equal(doc.apiKey, K1, "để trống ô khoá mà khoá bị xoá thì cửa POS chết câm");
});

test("P5 · gõ khoá mới ⇒ đọc ra khoá MỚI, không phải khoá cũ", async () => {
  await suaKetNoi(sb.pool, ctx(tA), await idCua(tA, "Saudi"), { apiKey: K2 }, { env: KHOA });
  const doc = await layKetNoi(sb.pool, ctx(tA), "Saudi", { env: KHOA });
  assert.equal(doc.apiKey, K2);
  assert.equal(doc.shopId, "9002", "chỉ đổi khoá thì shop phải giữ nguyên");
});

test("P6 · không truyền gì cả ⇒ từ chối, chứ không im lặng ghi một lượt rỗng", async () => {
  const id = await idCua(tA, "Saudi");
  await assert.rejects(
    () => suaKetNoi(sb.pool, ctx(tA), id, {}, { env: KHOA }),
    (e) => e.ma === "khong_co_gi_sua",
  );
});

/* ═══════════ ③ HAI RÀNG BUỘC UNIQUE — bắn 23505 đúng chỗ ═══════════ */

test("P7 · một team KHÔNG có hai kết nối cùng thị trường → 409 có câu, không phải 23505 trần", async () => {
  await assert.rejects(
    () =>
      themKetNoi(
        sb.pool,
        ctx(tA),
        { market: "Saudi", shopId: "8888", apiKey: "kx" },
        { env: KHOA },
      ),
    (e) =>
      e.ma === "trung_thi_truong" &&
      e.status === 409 &&
      /Saudi/.test(e.message) &&
      !/duplicate key|23505/i.test(e.message),
  );
});

test("P8 · hai thị trường KHÔNG trỏ chung một shop → câu lỗi nói đúng hậu quả", async () => {
  await assert.rejects(
    () =>
      themKetNoi(
        sb.pool,
        ctx(tA),
        { market: "UAE", shopId: "9002", apiKey: "kx" },
        { env: KHOA },
      ),
    (e) => e.ma === "trung_shop" && e.status === 409,
  );
});

test("P9 · UNIQUE là THEO TEAM — team khác vẫn dùng được cùng tên thị trường", async () => {
  // Ca này phân biệt ràng buộc đúng với một ràng buộc toàn cục viết nhầm. Bảy shop của bảy
  // nước sống trong cùng một team, nhưng ba team đều bán ở Saudi là chuyện bình thường.
  const kq = await themKetNoi(
    sb.pool,
    ctx(tB),
    { market: "Saudi", shopId: "7001", apiKey: "kb" },
    { env: KHOA },
  );
  assert.equal(kq.market, "Saudi");
  const doc = await layKetNoi(sb.pool, ctx(tB), "Saudi", { env: KHOA });
  assert.equal(doc.apiKey, "kb", "hai team cùng tên thị trường mà đọc nhầm khoá là lẫn tiền");
});

/* ═══════════ ④ VẾ team_id TRONG WHERE — bàn giả không đo được ═══════════ */

test("P10 · team B KHÔNG sửa được kết nối của team A, kể cả khi biết đúng id", async () => {
  const idA = await idCua(tA, "Saudi");
  for (const [ten, chay] of [
    ["sua", () => suaKetNoi(sb.pool, ctx(tB), idA, { shopId: "666" }, { env: KHOA })],
    ["batTat", () => batTatKetNoi(sb.pool, ctx(tB), idA, false)],
    ["bo", () => boKetNoi(sb.pool, ctx(tB), idA)],
  ]) {
    await assert.rejects(
      chay,
      (e) => e.ma === "khong_thay" && e.status === 404,
      `${ten}: id của team khác phải ra 404 — 403 là nói cho người dò biết id đó CÓ THẬT`,
    );
  }
  // Điều thật sự cần đo: bản ghi của A KHÔNG suy suyển sau ba lượt thử.
  const doc = await layKetNoi(sb.pool, ctx(tA), "Saudi", { env: KHOA });
  assert.equal(doc.shopId, "9002");
  assert.equal(doc.bat, true);
  assert.equal(doc.apiKey, K2);
});

/* ═══════════ ⑤ TẮT ≠ BỎ ═══════════ */

test("P11 · TẮT ⇒ cửa POS của thị trường đó ném ngay, mà bật lại thì khoá vẫn còn", async () => {
  const id = await idCua(tA, "Saudi");
  await batTatKetNoi(sb.pool, ctx(tA), id, false);
  await assert.rejects(
    () => layKetNoi(sb.pool, ctx(tA), "Saudi", { env: KHOA }),
    LoiThieuKetNoiPos,
    "tắt rồi mà cửa tạo đơn vẫn lấy được kết nối thì cái công tắc không có thật",
  );
  // Vẫn còn trong danh sách màn hình — tắt là một trạng thái, không phải biến mất.
  const ds = await lietKeThiTruong(sb.pool, ctx(tA));
  assert.equal(ds.find((x) => x.market === "Saudi").bat, false);

  await batTatKetNoi(sb.pool, ctx(tA), id, true);
  const doc = await layKetNoi(sb.pool, ctx(tA), "Saudi", { env: KHOA });
  assert.equal(doc.apiKey, K2, "bật lại mà mất khoá thì «tắt» thực chất là «bỏ»");
});

test("P12 · BỎ ⇒ dòng đi hẳn, và chỗ trống ấy nhận lại được thị trường cùng tên", async () => {
  await boKetNoi(sb.pool, ctx(tA), await idCua(tA, "Saudi"));
  const con = await mot(
    "SELECT count(*)::int c FROM ket_noi_pos WHERE team_id=$1 AND market='Saudi'",
    [tA],
  );
  assert.equal(con.c, 0);

  // Bỏ xong thêm lại được — nếu UNIQUE còn giữ bóng ma của dòng cũ thì ca này đỏ.
  const lai = await themKetNoi(
    sb.pool,
    ctx(tA),
    { market: "Saudi", shopId: "9002", apiKey: "k-moi" },
    { env: KHOA },
  );
  assert.equal(lai.market, "Saudi");
  assert.equal((await layKetNoi(sb.pool, ctx(tA), "Saudi", { env: KHOA })).apiKey, "k-moi");
});

/** Id của một kết nối theo (team, thị trường) — ca nào cũng cần, đọc thẳng từ bảng. */
async function idCua(teamId, market) {
  const d = await mot(
    "SELECT id FROM ket_noi_pos WHERE team_id=$1 AND market=$2",
    [teamId, market],
  );
  assert.ok(d, `không có kết nối ${market} của team ${teamId} — ca trước hỏng`);
  return String(d.id);
}
