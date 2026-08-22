// L1-M3 · CỬA PANCAKE WHATSAPP — định tuyến team qua don_hang, rào nguồn đơn, luật mẫu
// tin, guard fail-closed (N1: V3_WA_GUI==='1' VÀ PANCAKE_READONLY!=='1'), nhật ký hai
// pha. Chạy trên CSDL sandbox riêng (`aicloser_v3_test_l1m3cua`), tự dựng tự dọn — cùng
// khuôn test/l1-m2-cua.test.js.
//
// KHÔNG gọi Pancake thật — endpoint CHƯA CHỐT (chờ H1, §7b T1 sổ điều hành). Mọi ca
// dùng `deps.guiMau` tiêm spy/mock thay `guiMauQuaPancake` thật, cùng khuôn
// dependency-injection `deps.send` đã có ở cửa Messenger (L1-M2).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { ctxHeThong } from "../src/db/index.js";
import {
  guiTinMau,
  LoiDonKhongThuocTeam,
  LoiSaiNguonDon,
  LoiMauChuaDuyet,
  LoiCuaGuiDong,
} from "../src/channels/whatsapp/index.js";
import { guiMauQuaPancake } from "../src/channels/whatsapp/adapter.js";
import { LoiChuaCoEndpoint } from "../src/channels/whatsapp/loi.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
const demNhatKy = async (hanhDong) =>
  Number(
    (
      await mot("SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong=$1", [
        hanhDong,
      ])
    ).c,
  );

// Đặt/khôi phục biến môi trường TRONG harness — không thừa hưởng .env (phiếu ④, "env đặt
// TRONG harness"). cuaDangMo() đọc process.env TƯƠI mỗi lượt gọi nên đặt/xoá ngay trước
// khi gọi hàm là đủ.
async function voiEnv(vars, fn) {
  const truoc = {};
  for (const k of Object.keys(vars)) truoc[k] = process.env[k];
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return await fn();
  } finally {
    for (const [k, v] of Object.entries(truoc)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

function demSpy(ra = { ok: true, id: "wamid-spy" }) {
  const goi = [];
  const spy = (...a) => {
    goi.push(a);
    return Promise.resolve(ra);
  };
  spy.goi = goi;
  return spy;
}

// Bảng mẫu TEST — KHÔNG chạm BANG_MAU_TIN thật (rỗng, xem mau-tin.js). Tiêm qua
// deps.bangMauTin, đúng cách test/l1-m2-cua.test.js tiêm deps.send.
const MAU_OK = Object.freeze({
  xac_nhan_don_v1: Object.freeze({ da_duyet: true }),
});
const MAU_CHUA_DUYET = Object.freeze({
  xac_nhan_don_v1: Object.freeze({ da_duyet: false }),
});

let idTieuAlpha, idAuus;
let ctxA, ctxB;
let donA_tbh, donA_msg, donB_tbh;

before(async () => {
  sb = await dungSandbox("l1m3cua");
  idTieuAlpha = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  idAuus = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
  // nguoiDungId PHẢI là id thật trong `nguoi_dung` hoặc null (tang-truy-van-v1.md §1) —
  // bịa id làm chính lượt ghi nhat_ky vỡ FK, che mất lỗi có tên đang muốn đo (án lệ L0-M2).
  ctxA = { teamId: idTieuAlpha, nguoiDungId: null };
  ctxB = { teamId: idAuus, nguoiDungId: null };

  donA_tbh = await mot(
    `INSERT INTO don_hang (team_id, nguon, trang_thai_he)
     VALUES ($1,'trang_ban_hang','cho_xac_nhan') RETURNING id`,
    [idTieuAlpha],
  );
  donA_msg = await mot(
    `INSERT INTO don_hang (team_id, nguon, trang_thai_he)
     VALUES ($1,'messenger','GREET') RETURNING id`,
    [idTieuAlpha],
  );
  donB_tbh = await mot(
    `INSERT INTO don_hang (team_id, nguon, trang_thai_he)
     VALUES ($1,'trang_ban_hang','cho_xac_nhan') RETURNING id`,
    [idAuus],
  );
});
after(async () => {
  await sb.don();
});

const goiHopLe = (extra = {}) => ({
  soNhan: "+84900000001",
  tenMau: "xac_nhan_don_v1",
  thamSo: { maDon: "D-001" },
  donHangId: donA_tbh.id,
  ...extra,
});

// ── ① GUARD FAIL-CLOSED — 3 ca đối chứng a/b/c (khuôn L1-M2, N1) ──────────────────
// CÙNG một spy, CÙNG hàm guiTinMau, CÙNG đơn hợp lệ + mẫu đã duyệt (chỉ guard biến
// thiên) — env đặt TRONG harness.
test("guard-a · vắng V3_WA_GUI → LoiCuaGuiDong, spy=0", async () => {
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: undefined, PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () =>
        guiTinMau(sb.pool, ctxA, goiHopLe(), {
          guiMau: spy,
          bangMauTin: MAU_OK,
        }),
      LoiCuaGuiDong,
    ),
  );
  console.log(`   [guard-a] spy=${spy.goi.length}`);
  assert.equal(spy.goi.length, 0);
});

test("guard-b · V3_WA_GUI=1 + PANCAKE_READONLY=1 → vẫn chặn, spy=0", async () => {
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: "1" }, () =>
    assert.rejects(
      () =>
        guiTinMau(sb.pool, ctxA, goiHopLe(), {
          guiMau: spy,
          bangMauTin: MAU_OK,
        }),
      LoiCuaGuiDong,
    ),
  );
  console.log(`   [guard-b] spy=${spy.goi.length}`);
  assert.equal(spy.goi.length, 0);
});

test("guard-c · V3_WA_GUI=1, không READONLY → ĐỐI CHỨNG DƯƠNG, spy=1 (cửa thật sự gọi xuống)", async () => {
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    guiTinMau(sb.pool, ctxA, goiHopLe({ donHangId: donA_tbh.id }), {
      guiMau: spy,
      bangMauTin: MAU_OK,
    }),
  );
  console.log(`   [guard-c] spy=${spy.goi.length}`);
  assert.equal(spy.goi.length, 1);
  const [payload] = spy.goi[0];
  assert.equal(payload.soNhan, "+84900000001");
  assert.equal(payload.tenMau, "xac_nhan_don_v1");
  assert.deepEqual(payload.thamSo, { maDon: "D-001" });
  assert.equal(payload.donHangId, donA_tbh.id);
});

// ── ② MẪU TIN — chỉ mẫu đã duyệt (guard MỞ để cô lập luật mẫu) ────────────────────
test("mẫu chưa duyệt (da_duyet:false) → LoiMauChuaDuyet, spy=0", async () => {
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () =>
        guiTinMau(sb.pool, ctxA, goiHopLe(), {
          guiMau: spy,
          bangMauTin: MAU_CHUA_DUYET,
        }),
      LoiMauChuaDuyet,
    ),
  );
  assert.equal(spy.goi.length, 0);
});

test("mẫu KHÔNG có trong bảng (bảng thật rỗng, mặc định) → LoiMauChuaDuyet, spy=0", async () => {
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () => guiTinMau(sb.pool, ctxA, goiHopLe(), { guiMau: spy }), // KHÔNG tiêm bangMauTin — dùng BANG_MAU_TIN thật (rỗng)
      LoiMauChuaDuyet,
    ),
  );
  assert.equal(spy.goi.length, 0);
});

test("mẫu da_duyet:true → qua, gọi xuống adapter", async () => {
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    guiTinMau(sb.pool, ctxA, goiHopLe(), { guiMau: spy, bangMauTin: MAU_OK }),
  );
  assert.equal(spy.goi.length, 1);
});

// ── ③ RÀO NGUỒN ĐƠN — chỉ trang_ban_hang (guard MỞ để cô lập rào nguồn) ───────────
test("đơn nguon='messenger' → LoiSaiNguonDon, spy=0", async () => {
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () =>
        guiTinMau(sb.pool, ctxA, goiHopLe({ donHangId: donA_msg.id }), {
          guiMau: spy,
          bangMauTin: MAU_OK,
        }),
      LoiSaiNguonDon,
    ),
  );
  assert.equal(spy.goi.length, 0);
});

test("đơn nguon='trang_ban_hang' → qua rào nguồn", async () => {
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    guiTinMau(sb.pool, ctxA, goiHopLe({ donHangId: donA_tbh.id }), {
      guiMau: spy,
      bangMauTin: MAU_OK,
    }),
  );
  assert.equal(spy.goi.length, 1);
});

// ── ④ ĐỊNH TUYẾN TEAM — đơn thuộc team khác ctx → chặn + nhat_ky ──────────────────
test("ctx=tieu-alpha nhưng donHangId thuộc auus → LoiDonKhongThuocTeam + nhat_ky(chan_don_xuyen_team) +1, spy=0", async () => {
  const truoc = await demNhatKy("chan_don_xuyen_team");
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () =>
        guiTinMau(sb.pool, ctxA, goiHopLe({ donHangId: donB_tbh.id }), {
          guiMau: spy,
          bangMauTin: MAU_OK,
        }),
      LoiDonKhongThuocTeam,
    ),
  );
  const sau = await demNhatKy("chan_don_xuyen_team");
  console.log(
    `   [routing] nhat_ky(chan_don_xuyen_team) trước=${truoc} sau=${sau}`,
  );
  assert.equal(sau - truoc, 1);
  assert.equal(spy.goi.length, 0, "không được gọi xuống adapter");
});

test("donHangId không tồn tại → LoiDonKhongThuocTeam, spy=0", async () => {
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () =>
        guiTinMau(sb.pool, ctxA, goiHopLe({ donHangId: 999999999 }), {
          guiMau: spy,
          bangMauTin: MAU_OK,
        }),
      LoiDonKhongThuocTeam,
    ),
  );
  assert.equal(spy.goi.length, 0);
});

// ── ctxHeThong() — job nền tự dựng ctx hệ-thống GẮN ĐÚNG team của đơn ─────────────
test("ctxHeThong() trên đơn đã gán team tieu-alpha → nhat_ky(wa_gui_bat_dau) dòng mới mang team_id THẬT (không NULL)", async () => {
  const truoc = await demNhatKy("wa_gui_bat_dau");
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    guiTinMau(sb.pool, ctxHeThong(), goiHopLe({ donHangId: donA_tbh.id }), {
      guiMau: spy,
      bangMauTin: MAU_OK,
    }),
  );
  const dong = await mot(
    "SELECT team_id FROM nhat_ky WHERE hanh_dong='wa_gui_bat_dau' ORDER BY id DESC LIMIT 1",
  );
  const sau = await demNhatKy("wa_gui_bat_dau");
  console.log(
    `   [ctxHeThong] nhat_ky('wa_gui_bat_dau') trước=${truoc} sau=${sau} · team_id dòng mới=${dong.team_id} (chờ ${idTieuAlpha})`,
  );
  assert.equal(sau - truoc, 1);
  assert.equal(String(dong.team_id), String(idTieuAlpha));
  assert.notEqual(dong.team_id, null);
  assert.equal(spy.goi.length, 1);
});

test("ctxHeThong() trên donHangId không tồn tại → LoiDonKhongThuocTeam (chưa có team để ghi nhat_ky)", async () => {
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () =>
        guiTinMau(sb.pool, ctxHeThong(), goiHopLe({ donHangId: 999999998 }), {
          guiMau: spy,
          bangMauTin: MAU_OK,
        }),
      LoiDonKhongThuocTeam,
    ),
  );
  assert.equal(spy.goi.length, 0);
});

// ── NHẬT KÝ HAI PHA — thành công / từ chối-đã-biết / mất phản hồi (mồ côi) ────────
test("hai pha · gửi thành công → wa_gui_bat_dau +1 VÀ wa_gui_ket_qua +1", async () => {
  const bd0 = await demNhatKy("wa_gui_bat_dau");
  const kq0 = await demNhatKy("wa_gui_ket_qua");
  const spy = demSpy();
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    guiTinMau(sb.pool, ctxA, goiHopLe(), { guiMau: spy, bangMauTin: MAU_OK }),
  );
  const bd1 = await demNhatKy("wa_gui_bat_dau");
  const kq1 = await demNhatKy("wa_gui_ket_qua");
  console.log(`   [2pha-ok] bat_dau ${bd0}→${bd1} · ket_qua ${kq0}→${kq1}`);
  assert.equal(bd1 - bd0, 1);
  assert.equal(kq1 - kq0, 1);
});

test("hai pha · adapter từ chối VỚI coPhanHoi=true (đã biết chắc) → wa_gui_bat_dau +1 VÀ wa_gui_ket_qua +1 (không mồ côi)", async () => {
  const bd0 = await demNhatKy("wa_gui_bat_dau");
  const kq0 = await demNhatKy("wa_gui_ket_qua");
  class LoiTuChoiGiaLap extends Error {
    constructor(m) {
      super(m);
      this.name = "LoiTuChoiGiaLap";
      this.coPhanHoi = true;
    }
  }
  const guiMau = async () => {
    throw new LoiTuChoiGiaLap("Pancake trả lời: số không hợp lệ");
  };
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () =>
        guiTinMau(sb.pool, ctxA, goiHopLe(), { guiMau, bangMauTin: MAU_OK }),
      LoiTuChoiGiaLap,
    ),
  );
  const bd1 = await demNhatKy("wa_gui_bat_dau");
  const kq1 = await demNhatKy("wa_gui_ket_qua");
  console.log(`   [2pha-tuchoi] bat_dau ${bd0}→${bd1} · ket_qua ${kq0}→${kq1}`);
  assert.equal(bd1 - bd0, 1);
  assert.equal(
    kq1 - kq0,
    1,
    "coPhanHoi=true vẫn phải ghi pha 2 — không mồ côi",
  );
});

test("hai pha · mất phản hồi (timeout, KHÔNG coPhanHoi) → wa_gui_bat_dau +1 NHƯNG wa_gui_ket_qua +0 (dòng bắt-đầu MỒ CÔI)", async () => {
  const bd0 = await demNhatKy("wa_gui_bat_dau");
  const kq0 = await demNhatKy("wa_gui_ket_qua");
  const guiMau = async () => {
    throw new Error("socket hang up"); // KHÔNG có .coPhanHoi — mất tín hiệu mạng thật
  };
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    assert.rejects(() =>
      guiTinMau(sb.pool, ctxA, goiHopLe(), { guiMau, bangMauTin: MAU_OK }),
    ),
  );
  const bd1 = await demNhatKy("wa_gui_bat_dau");
  const kq1 = await demNhatKy("wa_gui_ket_qua");
  console.log(
    `   [2pha-timeout] bat_dau ${bd0}→${bd1} · ket_qua ${kq0}→${kq1}`,
  );
  assert.equal(
    bd1 - bd0,
    1,
    "pha 1 vẫn ghi (lệnh đã bay ra trước khi mất tín hiệu)",
  );
  assert.equal(kq1 - kq0, 0, "pha 2 KHÔNG ghi — mồ côi, đúng thiết kế");
});

// ── ADAPTER THẬT — chưa có endpoint (H1 chưa chạy), CẤM giả xanh ─────────────────
test("adapter thật guiMauQuaPancake() → LoiChuaCoEndpoint (coPhanHoi=true), KHÔNG gọi mạng nào", async () => {
  await assert.rejects(() => guiMauQuaPancake({}), LoiChuaCoEndpoint);
  try {
    await guiMauQuaPancake({});
    assert.fail("phải ném lỗi");
  } catch (e) {
    assert.equal(e.name, "LoiChuaCoEndpoint");
    assert.equal(e.coPhanHoi, true);
  }
});

test("guiTinMau với adapter THẬT (deps mặc định) trên đơn hợp lệ → LoiChuaCoEndpoint, hai pha ghi đủ (không mồ côi)", async () => {
  const bd0 = await demNhatKy("wa_gui_bat_dau");
  const kq0 = await demNhatKy("wa_gui_ket_qua");
  await voiEnv({ V3_WA_GUI: "1", PANCAKE_READONLY: undefined }, () =>
    assert.rejects(
      () => guiTinMau(sb.pool, ctxA, goiHopLe(), { bangMauTin: MAU_OK }), // KHÔNG tiêm guiMau — dùng adapter THẬT
      LoiChuaCoEndpoint,
    ),
  );
  const bd1 = await demNhatKy("wa_gui_bat_dau");
  const kq1 = await demNhatKy("wa_gui_ket_qua");
  assert.equal(bd1 - bd0, 1);
  assert.equal(kq1 - kq0, 1);
});
