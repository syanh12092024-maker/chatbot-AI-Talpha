// A7-3 · CỬA ĐỌC HỒ SƠ KHÁCH.
//
// Hai thứ bộ ca này giữ, ngoài chuyện «đọc ra đúng dòng»:
//   ① Hồ sơ KHÔNG được khai là đã gộp WhatsApp — kênh đó chưa nối. Hiện «gộp đủ ba kênh»
//      trong khi kênh thứ ba chưa có dòng nào là nói dối theo chiều dễ chịu nhất.
//   ② Mọi kết quả RỖNG phải phân biệt «lọc không trúng ai» với «chưa nạp dữ liệu bao giờ».
//      Hai cái trông giống hệt nhau trên màn, và chỉ một cái là việc phải đi làm.
import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { timKhach, docHoSoKhach, KENH_CO_THAT } from "../src/orders/doc-ho-so.js";

let sb, tA, tB, ql, sale, ctx, ctxSale, ctxB, pageId;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];

const themKhach = async (team, nuoc, sdt, ten = "") =>
  (
    await q(
      "INSERT INTO khach (team_id, thi_truong, so_dien_thoai, ten) VALUES ($1,$2,$3,$4) RETURNING id",
      [team, nuoc, sdt, ten],
    )
  ).rows[0].id;

before(async () => {
  sb = await dungSandbox("a73dochoso");
  tA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  tB = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
  const nguoi = async (email, vai, team) => {
    const id = (
      await mot("INSERT INTO nguoi_dung (email,ten) VALUES ($1,$1) RETURNING id", [email])
    ).id;
    await q(
      `INSERT INTO thanh_vien_team (team_id,nguoi_dung_id,vai_id)
       SELECT $1,$2,v.id FROM vai v WHERE v.ma=$3`,
      [team, id, vai],
    );
    return id;
  };
  ql = await nguoi("ql@t.vn", "quan-ly", tA);
  sale = await nguoi("sale@t.vn", "sale", tA);
  const nb = await nguoi("b@t.vn", "quan-ly", tB);
  ctx = { teamId: tA, nguoiDungId: ql };
  ctxSale = { teamId: tA, nguoiDungId: sale };
  ctxB = { teamId: tB, nguoiDungId: nb };
  pageId = (
    await q(
      "INSERT INTO page (team_id, page_id, ten) VALUES ($1,'7001','Page thử') RETURNING id",
      [tA],
    )
  ).rows[0].id;
});
after(async () => sb && (await sb.don()));

beforeEach(async () => {
  await q("DELETE FROM don_hang");
  await q("DELETE FROM hoi_thoai");
  await q("DELETE FROM khach");
});

test("H1 · bảng RỖNG nói «chưa nạp bao giờ», KHÔNG nói «không có khách»", async () => {
  const r = await timKhach(sb.pool, ctx);
  assert.equal(r.tong, 0);
  assert.equal(r.boiCanh.coDuLieu, false);
  assert.match(r.boiCanh.viSaoRong, /CHƯA CÓ KHÁCH NÀO/);
  assert.match(r.boiCanh.viSaoRong, /docDon|noiKhachChoHoiThoai/, "phải chỉ ĐÚNG hai cửa sinh ra khách");
  assert.match(r.boiCanh.viSaoRong, /chưa cài đặt xong/);
});

test("H2 · có khách nhưng LỌC không trúng ⇒ lý do KHÁC hẳn ca rỗng-hoàn-toàn", async () => {
  await themKhach(tA, "Saudi", "501111111");
  const r = await timKhach(sb.pool, ctx, { sdt: "509999999" });
  assert.equal(r.tong, 0);
  assert.match(r.boiCanh.viSaoRong, /có 1 khách nhưng không ai khớp/);
  assert.match(r.boiCanh.viSaoRong, /THEO NƯỚC/, "phải nhắc khách phân biệt theo nước");
  assert.doesNotMatch(r.boiCanh.viSaoRong, /CHƯA CÓ KHÁCH NÀO/);
});

test("H3 · tra theo SĐT THÔ — mọi định dạng ra cùng một người", async () => {
  await themKhach(tA, "Saudi", "501234567", "Anh A");
  for (const tho of ["0501234567", "+966 50 123 4567", "966501234567", "501234567"]) {
    const r = await timKhach(sb.pool, ctx, { sdt: tho });
    assert.equal(r.tong, 1, `tra "${tho}" phải ra 1`);
    assert.equal(r.khach[0].ten, "Anh A");
  }
});

test("H4 · chuỗi không có chữ số ⇒ KHÔNG im lặng trả cả bảng", async () => {
  await themKhach(tA, "Saudi", "501234567");
  await themKhach(tA, "UAE", "502222222");
  const r = await timKhach(sb.pool, ctx, { sdt: "abc" });
  assert.equal(r.tong, 0, "cấm rơi về «không lọc» rồi trả hết");
  assert.match(r.boiCanh.viSaoRong, /không chứa chữ số/);
});

test("H5 · CÙNG số KHÁC nước ⇒ danh sách ra HAI người", async () => {
  await themKhach(tA, "Saudi", "547049872", "KH Saudi");
  await themKhach(tA, "UAE", "547049872", "KH UAE");
  const r = await timKhach(sb.pool, ctx, { sdt: "547049872" });
  assert.equal(r.tong, 2, "gộp hai người này làm một là đúng lỗi A7-1 vá");
  assert.deepEqual(r.khach.map((k) => k.thiTruong).sort(), ["Saudi", "UAE"]);
});

test("H6 · CÁCH LY TEAM — team khác đọc không thấy, và không phân biệt «không có» với «của team khác»", async () => {
  const id = await themKhach(tA, "Saudi", "501234567");
  const r = await timKhach(sb.pool, ctxB, { sdt: "501234567" });
  assert.equal(r.tong, 0);
  assert.equal(await docHoSoKhach(sb.pool, ctxB, { khachId: id }), null);
  assert.ok(await docHoSoKhach(sb.pool, ctx, { khachId: id }), "team chủ thì đọc được");
});

test("H7 · HỒ SƠ gộp hai kênh — và KHÔNG khai đã gộp WhatsApp", async () => {
  const id = await themKhach(tA, "Saudi", "501234567", "Anh A");
  await q(
    `INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu,khach_id)
     VALUES ($1,$2,'psid-1','GREET','AI',$3)`,
    [tA, pageId, id],
  );
  for (const [ma, nguon] of [["s:1", "messenger"], ["s:2", "trang_ban_hang"]])
    await q(
      `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, khach_id, page_id)
       VALUES ($1,$2,$3,'moi',$4,$5)`,
      [tA, ma, nguon, id, pageId],
    );

  const hs = await docHoSoKhach(sb.pool, ctx, { khachId: id });
  assert.equal(hs.khach.ten, "Anh A");
  assert.equal(hs.donHang.length, 2);
  assert.equal(hs.hoiThoai.length, 1);
  assert.deepEqual(hs.kenh.coMat.sort(), [...KENH_CO_THAT].sort());

  // ① không được khai gộp WhatsApp
  assert.ok(
    hs.kenh.chuaNoi.some((k) => k.ma === "whatsapp"),
    "phải kê ĐÍCH DANH whatsapp là chưa nối",
  );
  assert.match(hs.kenh.khai, /WhatsApp chưa nối/);
  assert.doesNotMatch(
    hs.kenh.khai,
    /3\/3|đủ ba kênh/,
    "cấm khai đã gộp đủ ba kênh khi kênh thứ ba chưa có dòng nào",
  );
});

// H7 dựng khách có ĐỦ hai kênh, nên nó xanh cả khi `kenh.coMat` bị gõ cứng bằng
// `KENH_CO_THAT`. Ca dưới đây là ca duy nhất phân biệt «đếm từ dữ liệu» với «khai sẵn» —
// cùng loại lỗ mà lượt đảo-vá của A7-2 đã lộ ra (§9, 26/08).
test("H12 · khách chỉ có MỘT kênh ⇒ coMat phải nói ĐÚNG một, không khai cả hai", async () => {
  const id = await themKhach(tA, "Saudi", "503333333");
  await q(
    `INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu,khach_id)
     VALUES ($1,$2,'psid-chi-chat','GREET','AI',$3)`,
    [tA, pageId, id],
  );
  const hs = await docHoSoKhach(sb.pool, ctx, { khachId: id });
  assert.deepEqual(hs.kenh.coMat, ["messenger"], "khách này CHƯA có đơn nào");
  assert.equal(hs.donHang.length, 0);
  assert.match(hs.kenh.khai, /1\/2/, "phải khai 1/2 kênh, không phải 2/2");

  // và chiều ngược lại: chỉ có đơn trang bán hàng, không hội thoại nào
  const id2 = await themKhach(tA, "Saudi", "504444444");
  await q(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, khach_id, page_id)
     VALUES ($1,'s:9','trang_ban_hang','moi',$2,$3)`,
    [tA, id2, pageId],
  );
  const hs2 = await docHoSoKhach(sb.pool, ctx, { khachId: id2 });
  assert.deepEqual(hs2.kenh.coMat, ["trang_ban_hang"]);
  assert.equal(hs2.hoiThoai.length, 0);
});

test("H8 · tỉ lệ hoàn CHƯA chấm ⇒ nói «chưa có», KHÔNG hiện 0", async () => {
  const id = await themKhach(tA, "Saudi", "501234567");
  const hs = await docHoSoKhach(sb.pool, ctx, { khachId: id });
  assert.equal(hs.ruiRoHoan.tiLe, null, "cấm rơi về 0 — 0% nghĩa là «chưa hoàn lần nào»");
  assert.match(hs.ruiRoHoan.viSaoChuaCham, /chưa chấm|KHÔNG phải bằng 0/);
  assert.match(hs.ruiRoHoan.khongChan, /Chờ chốt/, "phải khai rõ tầng này không chặn");
});

test("H9 · tỉ lệ hoàn ĐÃ chấm ⇒ trả kèm NGÀY chấm, và hết câu «chưa chấm»", async () => {
  const id = await themKhach(tA, "Saudi", "501234567");
  await q(
    `UPDATE khach SET ti_le_hoan=45.00, tang_hoan='canh_bao', so_don_ket=10,
            so_don_hoan=4, cham_hoan_luc=now() WHERE id=$1`,
    [id],
  );
  const hs = await docHoSoKhach(sb.pool, ctx, { khachId: id });
  assert.equal(hs.ruiRoHoan.tiLe, 45);
  assert.equal(hs.ruiRoHoan.tang, "canh_bao", "45% KHÔNG phải «bình thường»");
  assert.ok(hs.ruiRoHoan.chamLuc, "một tỉ lệ hoàn không kèm ngày chấm là số không kiểm được");
  assert.equal(hs.ruiRoHoan.viSaoChuaCham, null);
});

test("H10 · SALE đọc được hồ sơ (cần biết đang nói với ai)", async () => {
  const id = await themKhach(tA, "Saudi", "501234567");
  assert.ok(await docHoSoKhach(sb.pool, ctxSale, { khachId: id }));
  assert.equal((await timKhach(sb.pool, ctxSale)).tong, 1);
});

test("H11 · phân trang: chạm trần thì vẫn khai đúng TỔNG, không cắt im lặng", async () => {
  for (let i = 0; i < 7; i++)
    await themKhach(tA, "Saudi", `50000000${i}`);
  const r = await timKhach(sb.pool, ctx, { trang: 1, moiTrang: 3 });
  assert.equal(r.khach.length, 3, "trang này 3 dòng");
  assert.equal(r.tong, 7, "nhưng TỔNG phải là 7 — không phải 3");
  const r3 = await timKhach(sb.pool, ctx, { trang: 3, moiTrang: 3 });
  assert.equal(r3.khach.length, 1);
});
