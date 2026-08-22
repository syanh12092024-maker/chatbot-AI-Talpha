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

test("B11 · ctxHeThong không dùng được với layMotTheoId/suaTheoId (giới hạn đã khai)", async () => {
  await assert.rejects(
    () => layMotTheoId(sb.pool, ctxHeThong(), "khach", 1),
    LoiThieuBoiCanhTeam,
  );
  await assert.rejects(
    () => suaTheoId(sb.pool, ctxHeThong(), "khach", 1, { ten: "x" }),
    LoiThieuBoiCanhTeam,
  );
});
