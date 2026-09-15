// DI TRÚ KHÔNG ĐƯỢC XOÁ CÔNG NGƯỜI NHẬP — đo bằng HAI LƯỢT `napPage` thật trên Postgres.
//
// Vì sao bộ ca này tồn tại tách khỏi ca đọc-câu-SQL ở `v3/test/b/page-bot-thuoc-tinh.test.mjs`:
// ca kia khớp một biểu thức chính quy vào chữ `CASE WHEN page.thi_truong <> ''`. Đó là đo
// HÌNH DẠNG. Một câu `CASE` viết đúng cú pháp mà sai vế vẫn khớp biểu thức ấy, và cổng AST
// canh hình dạng thì helper-truyền-tham-số là cách rẻ nhất làm nó xanh (án lệ #30).
//
// Ở đây đo ĐƯỜNG ĐI CỦA DỮ LIỆU: nạp lần một → người sửa trên màn → nạp lần hai → giá trị
// người đặt còn hay mất. Đó là đúng kịch bản thật mà người dùng sẽ gặp, vì nút «Kéo dữ liệu
// về» nằm ngay màn bên cạnh màn Page & Bot.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { dungSandbox } from "../db/sandbox.js";
import { napPage } from "../db/di-tru/nap.js";

let sb;
let thuMuc;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];

/** Ghi một `pages.json` tối thiểu — đúng hình dạng `docPages` đọc. */
function datNguon(pages) {
  fs.writeFileSync(path.join(thuMuc, "pages.json"), JSON.stringify(pages), "utf8");
}

const trongDb = (pageId) =>
  mot("SELECT ten, thi_truong, nganh_hang, marketer, trong_diem, botcake_tat FROM page WHERE page_id=$1", [pageId]);

before(async () => {
  sb = await dungSandbox("ditrugiucot");
  thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), "ditru-"));
});
after(async () => {
  if (sb) await sb.don();
  if (thuMuc) fs.rmSync(thuMuc, { recursive: true, force: true });
});

test("G1 · nguồn ĐIỀN VÀO CHỖ TRỐNG — page chưa có thị trường thì nhận từ pages.json", async () => {
  datNguon({
    100: { name: "Alpha", market: "Saudi", category: "Đồ da", marketer: "An" },
    200: { name: "Beta", market: "", category: "", marketer: "" },
  });
  await napPage(sb.pool, thuMuc);

  const a = await trongDb("100");
  assert.equal(a.thi_truong, "Saudi", "chỗ trống phải được nguồn điền — 374/514 page đang trông vào việc này");
  assert.equal(a.nganh_hang, "Đồ da");
  assert.equal(a.marketer, "An");
  assert.equal((await trongDb("200")).thi_truong, "");
});

test("G2 · NGƯỜI ĐẶT rồi thì lượt nạp sau KHÔNG xoá — cả ba cột", async () => {
  // Đúng thao tác người dùng làm trên màn Page & Bot: điền ba ô cho page chưa có gì.
  await q(
    "UPDATE page SET thi_truong=$1, nganh_hang=$2, marketer=$3 WHERE page_id='200'",
    ["UAE", "Mỹ phẩm", "Bình"],
  );

  // Nguồn VẪN rỗng ở ba cột đó — đây là cảnh thật, vì pages.json chỉ có thị trường cho
  // 140/514 page. Lượt nạp thứ hai là cú bấm «Kéo dữ liệu về».
  await napPage(sb.pool, thuMuc);

  const b = await trongDb("200");
  assert.equal(b.thi_truong, "UAE", "lượt «Kéo dữ liệu về» vừa xoá thị trường người vừa nhập");
  assert.equal(b.nganh_hang, "Mỹ phẩm");
  assert.equal(b.marketer, "Bình");
});

test("G3 · nguồn KHÔNG ghi đè giá trị đã có, kể cả khi nguồn có giá trị khác", async () => {
  // Giá phải trả của luật «điền chỗ trống, không xoá chỗ đã có», viết thành một ca để nó là
  // một quyết định nhìn thấy được chứ không phải một hành vi tình cờ: nguồn sửa lại một thị
  // trường ĐÃ CÓ thì KHÔNG ăn thua. Muốn đổi thì đổi trên màn.
  datNguon({
    100: { name: "Alpha", market: "Kuwait", category: "Đồ gỗ", marketer: "Chi" },
    200: { name: "Beta", market: "", category: "", marketer: "" },
  });
  await napPage(sb.pool, thuMuc);

  const a = await trongDb("100");
  assert.equal(a.thi_truong, "Saudi", "nguồn đổi được giá trị đã có ⇒ công người nhập không bền");
  assert.equal(a.nganh_hang, "Đồ da");
  assert.equal(a.marketer, "An");
  // Cột máy đồng bộ thì NGƯỢC LẠI — `ten` phải theo nguồn, vì tên page là của Facebook.
  assert.equal(a.ten, "Alpha");
});

test("G4 · cột MÁY vẫn được nguồn cập nhật — vá không được làm đông cứng cả bảng", async () => {
  datNguon({
    100: { name: "Alpha ĐỔI TÊN", market: "Kuwait", category: "Đồ gỗ", marketer: "Chi" },
    200: { name: "Beta", market: "", category: "", marketer: "" },
  });
  await napPage(sb.pool, thuMuc);
  assert.equal((await trongDb("100")).ten, "Alpha ĐỔI TÊN",
    "`ten` là cột máy đồng bộ — đóng băng nó là vá quá tay");
});

test("G5 · botcake_tat và trong_diem không nằm trong câu nạp, nên lượt nạp không chạm tới", async () => {
  await q("UPDATE page SET botcake_tat=true, trong_diem=true WHERE page_id='100'");
  await napPage(sb.pool, thuMuc);
  const a = await trongDb("100");
  assert.equal(a.botcake_tat, true, "lời khai «đã tắt Botcake» bị lượt nạp xoá");
  assert.equal(a.trong_diem, true);
});
