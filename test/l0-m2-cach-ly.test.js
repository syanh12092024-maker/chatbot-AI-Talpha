// L0-M2 · CÁCH LY TEAM — chống nghiệm thu ĐẠT RỖNG (dặn §2 sổ điều hành + verdict L0-M1
// câu 7): dữ liệu di trú 100% nằm ở `chua-phan`, nên đo cách ly trên dữ liệu SANDBOX
// (rỗng y hệt) vẫn đúng NGUYÊN NHÂN cần chống — bộ ca này TỰ CHÈN mẩu dữ liệu TRỘN ≥2
// team nghiệp vụ trước khi đo, và có ca hợp đồng `bo_luat_chung` riêng.
// Chạy trên CSDL sandbox riêng (`aicloser_v3_test_l0m2cachly`), tự dựng tự dọn — dọn
// bằng DROP DATABASE của sandbox (không phải DELETE trên CSDL dev/di-trú): không có
// "dữ liệu di trú" nào trong sandbox để mà đụng, xem thêm nhật ký phiếu-l0-m2.md §"quyết
// định" vì sao chọn sandbox thay vì chèn/xoá tay trên `aicloser_v3`.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { layNhieu, themMoi, suaTheoId, LoiXuyenTeam } from "../src/db/index.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
const soi = (arr) => arr.map((r) => String(r.id)).sort();
const demChanXuyenTeam = async () =>
  Number(
    (
      await mot(
        "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong='chan_xuyen_team'",
      )
    ).c,
  );

let idTieuAlpha, idAuus, idPialphaEu;
let ctxA, ctxB; // A = tieu-alpha, B = auus
let khachA = [],
  khachB = [],
  hoiThoaiA,
  hoiThoaiB;

before(async () => {
  sb = await dungSandbox("l0m2cachly");
  idTieuAlpha = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  idAuus = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
  idPialphaEu = (await mot("SELECT id FROM team WHERE slug='pialpha-eu'")).id;
  ctxA = { teamId: idTieuAlpha, nguoiDungId: null };
  ctxB = { teamId: idAuus, nguoiDungId: null };

  // ── mẩu dữ liệu TRỘN ≥2 team nghiệp vụ (mỗi team ≥1 khach + ≥1 hoi_thoai), qua
  // CHÍNH các hàm đang được đo (themMoi) — vừa dựng fixture vừa là bằng chứng ghi đúng
  // team_id ngay từ lúc tạo, không chỉ lúc đọc lại.
  const pageA = await mot(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,'l0m2-page-a','Page A') RETURNING id",
    [idTieuAlpha],
  );
  const pageB = await mot(
    "INSERT INTO page (team_id, page_id, ten) VALUES ($1,'l0m2-page-b','Page B') RETURNING id",
    [idAuus],
  );

  khachA.push(await themMoi(sb.pool, ctxA, "khach", { ten: "Khách A1" }));
  khachA.push(await themMoi(sb.pool, ctxA, "khach", { ten: "Khách A2" }));
  khachB.push(await themMoi(sb.pool, ctxB, "khach", { ten: "Khách B1" }));

  hoiThoaiA = await themMoi(sb.pool, ctxA, "hoi_thoai", {
    page_id: pageA.id,
    psid: "psid-a-1",
    khach_id: khachA[0].id,
    trang_thai: "GREET",
    chu_so_huu: "AI",
  });
  hoiThoaiB = await themMoi(sb.pool, ctxB, "hoi_thoai", {
    page_id: pageB.id,
    psid: "psid-b-1",
    khach_id: khachB[0].id,
    trang_thai: "QUALIFY",
    chu_so_huu: "SALE",
  });
});
after(async () => {
  await sb.don();
});

// ── ④#2 — CHỐNG ĐẠT RỖNG: ctx team này đọc ra ĐÚNG DANH SÁCH dòng của team đó (so id
// từng dòng, không so count — luật 9 skill tho-thi-cong), 0 dòng của team kia lẫn vào ──
test("C1 · ctx tieu-alpha đọc `khach` → ĐÚNG danh sách id của mình, không lẫn auus/chua-phan", async () => {
  const rows = await layNhieu(sb.pool, ctxA, "khach");
  console.log(`   [C1] ctxA thấy id: ${soi(rows).join(",")}`);
  assert.deepEqual(soi(rows), soi(khachA));
});

test("C2 · ctx auus đọc `khach` → ĐÚNG danh sách của mình, không thấy dòng tieu-alpha", async () => {
  const rows = await layNhieu(sb.pool, ctxB, "khach");
  console.log(`   [C2] ctxB thấy id: ${soi(rows).join(",")}`);
  assert.deepEqual(soi(rows), soi(khachB));
  for (const r of rows) assert.notEqual(String(r.team_id), String(idTieuAlpha));
});

test("C3 · ctx tieu-alpha đọc `hoi_thoai` → đúng 1 dòng của mình, không thấy của auus", async () => {
  const rows = await layNhieu(sb.pool, ctxA, "hoi_thoai");
  assert.deepEqual(soi(rows), [String(hoiThoaiA.id)]);
});

test("C4 · ctx auus đọc `hoi_thoai` → đúng 1 dòng của mình, không thấy của tieu-alpha", async () => {
  const rows = await layNhieu(sb.pool, ctxB, "hoi_thoai");
  assert.deepEqual(soi(rows), [String(hoiThoaiB.id)]);
});

// ── ④#3 — truyền tay team_id khác trong tham số/filter → CHẶN + nhat_ky +1 ────────
test("C5 · ĐỌC: ctx=tieu-alpha truyền tay team_id=auus trong filter → LoiXuyenTeam + nhat_ky +1", async () => {
  const truoc = await demChanXuyenTeam();
  await assert.rejects(
    () => layNhieu(sb.pool, ctxA, "khach", { dieuKien: { team_id: idAuus } }),
    LoiXuyenTeam,
  );
  const sau = await demChanXuyenTeam();
  console.log(`   [C5] nhat_ky(chan_xuyen_team) trước=${truoc} sau=${sau}`);
  assert.equal(sau - truoc, 1);
});

test("C6 · GHI: ctx=tieu-alpha truyền tay team_id=auus trong duLieu (themMoi) → LoiXuyenTeam + nhat_ky +1", async () => {
  const truoc = await demChanXuyenTeam();
  await assert.rejects(
    () => themMoi(sb.pool, ctxA, "khach", { team_id: idAuus, ten: "hack" }),
    LoiXuyenTeam,
  );
  const sau = await demChanXuyenTeam();
  console.log(`   [C6] nhat_ky(chan_xuyen_team) trước=${truoc} sau=${sau}`);
  assert.equal(sau - truoc, 1);
  // ca CHO-QUA thật đi kèm: ghi ĐÚNG team của ctx thì không bị chặn.
  const okRow = await themMoi(sb.pool, ctxA, "khach", {
    ten: "Khách A3 hợp lệ",
  });
  assert.equal(String(okRow.team_id), String(idTieuAlpha));
});

test("C7 · SỬA: ctx=tieu-alpha sửa dòng CỦA MÌNH → được, đọc lại thấy đổi", async () => {
  const sau = await suaTheoId(sb.pool, ctxA, "khach", khachA[0].id, {
    ten: "Khách A1 (đã sửa)",
  });
  assert.equal(sau.ten, "Khách A1 (đã sửa)");
});

test("C8 · SỬA: ctx=tieu-alpha truyền tay team_id=auus trong duLieu (suaTheoId) → LoiXuyenTeam", async () => {
  await assert.rejects(
    () =>
      suaTheoId(sb.pool, ctxA, "khach", khachA[0].id, {
        team_id: idAuus,
        ten: "hack-2",
      }),
    LoiXuyenTeam,
  );
});

test("C9 · SỬA xuyên team KHÔNG cần truyền team_id vẫn không chạm được dòng của team khác (0 dòng khớp)", async () => {
  // ctx=auus cố sửa MỘT ID thuộc về tieu-alpha — WHERE team_id=ctx.teamId AND id=... không
  // khớp dòng nào, trả null (không phải lỗi — "không có dòng đó trong team của bạn").
  const ket = await suaTheoId(sb.pool, ctxB, "khach", khachA[0].id, {
    ten: "hack-3",
  });
  assert.equal(ket, null);
  const vanConCu = await mot("SELECT ten FROM khach WHERE id=$1", [
    khachA[0].id,
  ]);
  assert.equal(vanConCu.ten, "Khách A1 (đã sửa)"); // không bị đổi bởi ctxB
});

// ── ④#5 — hợp đồng bo_luat_chung: (team_id = $ctx OR team_id IS NULL) ─────────────
test("C10 · bo_luat_chung: ctx tieu-alpha thấy 2 (toàn hệ + riêng), auus/pialpha-eu thấy 1 (chỉ toàn hệ)", async () => {
  // Dòng "toàn hệ" (team_id IS NULL) là dữ liệu ADMIN/seed — không hàm ghi nào của tầng
  // truy vấn tạo được NULL (themMoi/ctxHeThong đều ĐÒI team_id cụ thể, đúng thiết kế N2:
  // không có "ctx của toàn hệ"). Test dựng dòng NULL bằng SQL trực tiếp, giống hệt cách
  // `test/l0-m1-luoc-do.test.js` ca S6 đã làm — đây là fixture admin-seed, không phải
  // nhánh đang bị đo (nhánh đang đo là READ, xem dưới).
  const rongToanHe = await mot(
    "INSERT INTO bo_luat_chung (team_id, noi_dung) VALUES (NULL,'luật toàn hệ') RETURNING id",
  );
  const rieng = await themMoi(sb.pool, ctxA, "bo_luat_chung", {
    noi_dung: "luật riêng tieu-alpha",
  });

  const thayA = await layNhieu(sb.pool, ctxA, "bo_luat_chung");
  const thayB = await layNhieu(sb.pool, ctxB, "bo_luat_chung");
  const thayC = await layNhieu(
    sb.pool,
    { teamId: idPialphaEu },
    "bo_luat_chung",
  );
  console.log(
    `   [C10] tieu-alpha=${thayA.length} auus=${thayB.length} pialpha-eu=${thayC.length}`,
  );
  assert.deepEqual(soi(thayA), soi([rongToanHe, rieng]));
  assert.deepEqual(soi(thayB), [String(rongToanHe.id)]);
  assert.deepEqual(soi(thayC), [String(rongToanHe.id)]);

  // Bằng chứng LÝ DO tồn tại đặc cách: luật ĐỒNG NHẤT (một vế, không OR NULL) sẽ LÀM MẤT
  // dòng toàn hệ với mọi team khác chủ — đúng bug N3 mà hợp đồng (ii) phải tránh.
  const dongNhat = await mot(
    "SELECT count(*)::int c FROM bo_luat_chung WHERE team_id = $1",
    [idAuus],
  );
  assert.equal(dongNhat.c, 0);
});

test("C11 · SỬA bo_luat_chung KHÔNG có đặc cách hai vế — ctx không đụng được dòng toàn hệ (team_id IS NULL)", async () => {
  const dongToanHe = await mot(
    "SELECT id FROM bo_luat_chung WHERE team_id IS NULL ORDER BY id LIMIT 1",
  );
  const ket = await suaTheoId(sb.pool, ctxA, "bo_luat_chung", dongToanHe.id, {
    noi_dung: "cố sửa luật toàn hệ",
  });
  assert.equal(ket, null); // WHERE team_id=ctx.teamId AND id=... không khớp dòng NULL
  const vanNguyen = await mot(
    "SELECT noi_dung FROM bo_luat_chung WHERE id=$1",
    [dongToanHe.id],
  );
  assert.equal(vanNguyen.noi_dung, "luật toàn hệ");
});
