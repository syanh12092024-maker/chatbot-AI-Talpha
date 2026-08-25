// L0-M2 · BỐI CẢNH — ctx thiếu/sai phải NÉM LỖI CÓ TÊN (cấm trả rỗng), picker team,
// và cửa thoát ctxHeThong cho job nền (mọi lượt gọi phải ghi nhat_ky).
// Chạy trên CSDL sandbox riêng (`aicloser_v3_test_l0m2boicanh`), tự dựng tự dọn.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import {
  layNhieu,
  layMotTheoId,
  themMoi,
  suaTheoId,
  layDanhSachTeamChon,
  ctxHeThong,
  LoiThieuBoiCanhTeam,
  LoiXuyenTeam,
} from "../src/db/index.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
const demNhatKy = async () =>
  Number((await mot("SELECT count(*)::int c FROM nhat_ky")).c);

let idChuaPhan, idTieuAlpha;

before(async () => {
  sb = await dungSandbox("l0m2boicanh");
  idChuaPhan = (await mot("SELECT id FROM team WHERE slug='chua-phan'")).id;
  idTieuAlpha = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
});
after(async () => {
  await sb.don();
});

// ── ④#1 — gọi hàm KHÔNG ctx → ném đúng lỗi có tên ──────────────────────────────────
test("B1 · layNhieu(ctx=undefined) → LoiThieuBoiCanhTeam", async () => {
  await assert.rejects(
    () => layNhieu(sb.pool, undefined, "khach"),
    (e) => {
      console.log(`   [B1] tên lỗi bắt được: ${e.name}`);
      assert.equal(e.name, "LoiThieuBoiCanhTeam");
      assert.ok(e instanceof LoiThieuBoiCanhTeam);
      return true;
    },
  );
});

test("B2 · layNhieu(ctx={}) — teamId rỗng → LoiThieuBoiCanhTeam, KHÔNG phải mảng rỗng", async () => {
  await assert.rejects(
    () => layNhieu(sb.pool, {}, "khach"),
    LoiThieuBoiCanhTeam,
  );
  await assert.rejects(
    () => layNhieu(sb.pool, { teamId: "" }, "khach"),
    LoiThieuBoiCanhTeam,
  );
});

test("B3 · ctx.teamId trỏ team KHÔNG TỒN TẠI → LoiThieuBoiCanhTeam", async () => {
  await assert.rejects(
    () => layNhieu(sb.pool, { teamId: 999999 }, "khach"),
    LoiThieuBoiCanhTeam,
  );
});

// ── ④#4 — ctx trỏ team la_ky_thuat (chua-phan) → ném lỗi (rào N2) ─────────────────
test("B4 · ctx.teamId = team KỸ THUẬT (chua-phan) → LoiThieuBoiCanhTeam", async () => {
  await assert.rejects(
    () => layNhieu(sb.pool, { teamId: idChuaPhan }, "khach"),
    (e) => {
      console.log(
        `   [B4] tên lỗi bắt được: ${e.name} — ${e.message.slice(0, 50)}…`,
      );
      assert.equal(e.name, "LoiThieuBoiCanhTeam");
      return true;
    },
  );
});

test("B5 · ctx sai áp dụng cho MỌI hàm, không chỉ layNhieu (layMotTheoId/themMoi/suaTheoId)", async () => {
  await assert.rejects(
    () => layMotTheoId(sb.pool, undefined, "khach", 1),
    LoiThieuBoiCanhTeam,
  );
  await assert.rejects(
    () => themMoi(sb.pool, undefined, "khach", { ten: "x" }),
    LoiThieuBoiCanhTeam,
  );
  await assert.rejects(
    () => suaTheoId(sb.pool, undefined, "khach", 1, { ten: "x" }),
    LoiThieuBoiCanhTeam,
  );
});

test("B6 · bảng KHÔNG nằm trong BANG_NGHIEP_VU_CHUAN (vd thanh_vien_team) → chặn, deny-by-default", async () => {
  await assert.rejects(
    () => layNhieu(sb.pool, { teamId: idTieuAlpha }, "thanh_vien_team"),
    /BANG_NGHIEP_VU_CHUAN/,
  );
});

// ── ④#6 — picker team: đúng 3 slug nghiệp vụ, KHÔNG có chua-phan ──────────────────
test("B7 · layDanhSachTeamChon → đúng 3 slug nghiệp vụ, không có chua-phan", async () => {
  const ds = await layDanhSachTeamChon(sb.pool);
  const slug = ds.map((t) => t.slug).sort();
  console.log(`   [B7] picker trả về: ${JSON.stringify(slug)}`);
  assert.deepEqual(slug, ["auus", "pialpha-eu", "tieu-alpha"]);
  assert.ok(!slug.includes("chua-phan"));
});

// ── ④#7 — ctxHeThong: một lượt gọi ghi nhat_ky (count trước/sau lệch 1) ───────────
test("B8 · ctxHeThong() KHÔNG kèm team_id tường minh → LoiThieuBoiCanhTeam (không suy luận hộ)", async () => {
  await assert.rejects(
    () => themMoi(sb.pool, ctxHeThong(), "khach", { ten: "khong-co-team" }),
    LoiThieuBoiCanhTeam,
  );
});

test("B9 · ctxHeThong() + team_id tường minh — 1 lượt GHI → nhat_ky đúng +1", async () => {
  const truoc = await demNhatKy();
  const dong = await themMoi(sb.pool, ctxHeThong(), "khach", {
    team_id: idTieuAlpha,
    ten: "tao-boi-job-nen",
  });
  const sau = await demNhatKy();
  console.log(`   [B9] nhat_ky trước=${truoc} sau=${sau} (chờ +1)`);
  assert.equal(sau - truoc, 1);
  assert.equal(String(dong.team_id), String(idTieuAlpha));
});

test("B10 · ctxHeThong() — 1 lượt ĐỌC cũng ghi nhat_ky +1 (không riêng lượt ghi)", async () => {
  const truoc = await demNhatKy();
  await layNhieu(sb.pool, ctxHeThong(), "khach", {
    dieuKien: { team_id: idTieuAlpha },
  });
  const sau = await demNhatKy();
  console.log(`   [B10] nhat_ky trước=${truoc} sau=${sau} (chờ +1)`);
  assert.equal(sau - truoc, 1);
});

// ⚠️ B11 ĐÃ ĐỔI NGHĨA ở PHIEU-B-Y1 — `suaTheoId` NAY hỗ trợ ctxHeThong. Bản cũ của ca này
// khai «suaTheoId không dùng được với ctxHeThong»; sau B-Y1 lời khai đó SAI trong khi phép
// assert vẫn XANH (vì lời gọi cũ không kèm team_id nên vẫn ném đúng lỗi đó, chỉ khác LÝ DO).
// Thước xanh mà nhãn nói dối là án lệ #27 — nên tách làm hai: giới hạn CÒN THẬT của
// `layMotTheoId` ở đây, và hợp đồng MỚI của `suaTheoId` ở B12–B15.
test("B11 · layMotTheoId vẫn KHÔNG dùng được với ctxHeThong (không có chỗ khai team_id)", async () => {
  await assert.rejects(
    () => layMotTheoId(sb.pool, ctxHeThong(), "khach", 1),
    LoiThieuBoiCanhTeam,
  );
});

// ── B-Y1 mục 1 ④#5 — ctxHeThong KHÔNG kèm team_id tường minh thì suaTheoId vẫn từ chối.
// Ném vì THIẾU KHAI, không phải vì «hàm không hỗ trợ» — hai lý do khác nhau, cùng một lỗi.
test("B12 · suaTheoId + ctxHeThong() KHÔNG kèm team_id → LoiThieuBoiCanhTeam", async () => {
  await assert.rejects(
    () => suaTheoId(sb.pool, ctxHeThong(), "khach", 1, { ten: "x" }),
    LoiThieuBoiCanhTeam,
  );
});

// ── B-Y1 mục 1 ④#6 — ctxHeThong CÓ team_id: chạy được, và ghi nhat_ky MỌI lượt ────
test("B13 · suaTheoId + ctxHeThong() + team_id trong duLieu → sửa được, nhat_ky +1", async () => {
  const dong = await themMoi(sb.pool, ctxHeThong(), "khach", {
    team_id: idTieuAlpha,
    ten: "job-nen-sua-1",
  });
  const truoc = await demNhatKy();
  const sau = await suaTheoId(
    sb.pool,
    ctxHeThong(),
    "khach",
    dong.id,
    { team_id: idTieuAlpha, ten: "job-nen-da-sua" },
  );
  const demSau = await demNhatKy();
  console.log(`   [B13] nhat_ky trước=${truoc} sau=${demSau} (chờ +1)`);
  assert.equal(sau.ten, "job-nen-da-sua");
  assert.equal(demSau - truoc, 1);
});

test("B14 · suaTheoId + ctxHeThong(): team_id khai trong `neu` cũng đủ (không riêng duLieu)", async () => {
  const dong = await themMoi(sb.pool, ctxHeThong(), "khach", {
    team_id: idTieuAlpha,
    ten: "job-nen-sua-2",
  });
  const sau = await suaTheoId(
    sb.pool,
    ctxHeThong(),
    "khach",
    dong.id,
    { ten: "sua-qua-neu" },
    { neu: { team_id: idTieuAlpha, ten: "job-nen-sua-2" } },
  );
  assert.equal(sau.ten, "sua-qua-neu");
});

// ── B-Y1 ④#7 — tên cột rác trong `neu` → Error thường, và KHÔNG CHẠM CSDL ─────────
// Đo bằng HÀNH VI (án lệ #30): bọc pool bằng một cái đếm, rồi khai con số. Đếm 0 lượt
// query là bằng chứng; «có ném lỗi» thì chưa nói được nó ném TRƯỚC hay SAU khi hỏi DB.
test("B15 · tên cột rác trong `neu`/`dieuKien` → Error thường, 0 lượt chạm CSDL", async () => {
  let dem = 0;
  const poolDem = {
    query: (...a) => {
      dem += 1;
      return sb.pool.query(...a);
    },
  };
  const ctx = { teamId: idTieuAlpha, nguoiDungId: null };
  for (const rac of ["a b", "a;drop table khach", "1cot", "CỘT"]) {
    await assert.rejects(
      () => suaTheoId(poolDem, ctx, "khach", 1, { ten: "x" }, { neu: { [rac]: 1 } }),
      /tên cột/,
    );
    await assert.rejects(
      () => layNhieu(poolDem, ctx, "khach", { dieuKien: { [rac]: 1 } }),
      /tên cột/,
    );
  }
  console.log(`   [B15] 8 lời gọi tên cột rác → ${dem} lượt chạm CSDL (chờ 0)`);
  assert.equal(dem, 0);
});

// ── `undefined` KHÔNG được lặng lẽ thành `= NULL` (khớp 0 dòng và im) ─────────────
test("B17 · toán tử so sánh dạng object → Error nói rõ chưa làm (không lặng lẽ khớp 0 dòng)", async () => {
  const ctx = { teamId: idTieuAlpha, nguoiDungId: null };
  await assert.rejects(
    () => layNhieu(sb.pool, ctx, "khach", { dieuKien: { tao_luc: { ">=": new Date(0) } } }),
    /chưa nhận toán tử so sánh/,
  );
  // …nhưng Date THƯỜNG thì vẫn là giá trị hợp lệ, đừng chặn nhầm.
  const ok = await layNhieu(sb.pool, ctx, "khach", { dieuKien: { tao_luc: new Date(0) } });
  assert.equal(ok.length, 0); // 0 dòng vì không ai tạo lúc epoch — KHÔNG phải vì bị chặn
});

test("B16 · giá trị undefined trong dieuKien/neu → Error, không lặng lẽ khớp 0 dòng", async () => {
  const ctx = { teamId: idTieuAlpha, nguoiDungId: null };
  await assert.rejects(
    () => layNhieu(sb.pool, ctx, "khach", { dieuKien: { ten: undefined } }),
    /undefined/,
  );
  await assert.rejects(
    () => suaTheoId(sb.pool, ctx, "khach", 1, { ten: "x" }, { neu: { ten: undefined } }),
    /undefined/,
  );
});

// ══════════════════════════════════════════════════════════════════════════════════
// B-Y5 — cửa ĐỌC không ghi nhật ký, và CHỈ cửa đọc.
//
// Đo 25/08 trên `aicloser_v3`: `nhat_ky` có 1557 dòng và **100% là `doc`** — không một
// dòng nghiệp vụ nào. Bảng cấm xoá, nên rác nằm đó vĩnh viễn, và máy trạng thái màn Bộ
// luật của người B thì SUY TRẠNG THÁI từ chính bảng này.
// ══════════════════════════════════════════════════════════════════════════════════

test("B18 · mặc định KHÔNG đổi — ctxHeThong() không tham số vẫn ghi khi ĐỌC", async () => {
  const truoc = await demNhatKy();
  await layNhieu(sb.pool, ctxHeThong(), "khach", {
    dieuKien: { team_id: idTieuAlpha },
  });
  const sau = await demNhatKy();
  console.log(`   [B18] mặc định: nhat_ky ${truoc} → ${sau} (chờ +1)`);
  assert.equal(sau - truoc, 1);
});

test("B19 · ctxHeThong({ghiNhatKy:false}) + ĐỌC → 0 dòng nhật ký", async () => {
  const ctxDoc = ctxHeThong({ ghiNhatKy: false });
  const truoc = await demNhatKy();
  await layNhieu(sb.pool, ctxDoc, "khach", { dieuKien: { team_id: idTieuAlpha } });
  await layNhieu(sb.pool, ctxDoc, "page", { dieuKien: { team_id: idTieuAlpha } });
  await layNhieu(sb.pool, ctxDoc, "ky_nang", { dieuKien: { team_id: idTieuAlpha } });
  const sau = await demNhatKy();
  console.log(`   [B19] 3 lượt ĐỌC với cờ tắt: nhat_ky ${truoc} → ${sau} (chờ +0)`);
  assert.equal(sau - truoc, 0);
});

// ⚠️ NHÁNH QUAN TRỌNG NHẤT của phiếu: cờ chỉ được tắt cho ĐỌC. Tắt dấu vết của một lượt
// GHI là chuyện khác hẳn, và không cờ nào được phép làm.
test("B20 · CÙNG cờ đó + lệnh GHI → VẪN ghi nhật ký", async () => {
  const ctxDoc = ctxHeThong({ ghiNhatKy: false });
  const truoc = await demNhatKy();
  const dong = await themMoi(sb.pool, ctxDoc, "khach", {
    team_id: idTieuAlpha,
    ten: "ghi-van-phai-co-dau-vet",
  });
  const giua = await demNhatKy();
  console.log(`   [B20] themMoi với cờ tắt: nhat_ky ${truoc} → ${giua} (chờ +1)`);
  assert.equal(giua - truoc, 1, "lệnh GHI phải để lại dấu vết dù cờ tắt");

  await suaTheoId(sb.pool, ctxDoc, "khach", dong.id, {
    team_id: idTieuAlpha,
    ten: "sua-cung-phai-co",
  });
  const sau = await demNhatKy();
  console.log(`   [B20] suaTheoId với cờ tắt: ${giua} → ${sau} (chờ +1)`);
  assert.equal(sau - giua, 1, "suaTheoId cũng phải để lại dấu vết");
});

test("B21 · ctx NGƯỜI thường không đổi gì — cờ chỉ thuộc về ctxHeThong", async () => {
  const truoc = await demNhatKy();
  await layNhieu(sb.pool, { teamId: idTieuAlpha, nguoiDungId: null }, "khach");
  const sau = await demNhatKy();
  assert.equal(sau - truoc, 0, "ctx người vốn không ghi khi đọc — không được đổi");
});

test("B22 · bốn bộ đọc khối prompt THẬT SỰ dùng cờ tắt (không phải chỉ có cờ nằm đó)", async () => {
  // Cờ mà không ai bật thì bằng không có cờ. Ca này gọi chính bộ đọc của đường chat.
  const { docBoLuatChung, docKyNang } = await import("../src/chat/rap-prompt.js");
  const truoc = await demNhatKy();
  await docBoLuatChung(sb.pool, idTieuAlpha);
  await docKyNang(sb.pool, idTieuAlpha, []);
  const sau = await demNhatKy();
  console.log(`   [B22] 2 bộ đọc khối prompt: nhat_ky ${truoc} → ${sau} (chờ +0)`);
  assert.equal(sau - truoc, 0, "rap-prompt còn ghi nhật ký khi đọc = phiếu chưa xong");
});
