// L3-M1 · JOB QUÉT ĐƠN MỚI — chỉ đơn `trang_ban_hang` vào luồng WhatsApp, idempotent,
// ba lý do không gửi đếm được, trần thử lại, rebind ctx PER-ĐƠN.
//
// Sandbox riêng (`aicloser_v3_test_l3m1quet`), tự dựng tự dọn. Cửa WhatsApp là spy tiêm
// qua `deps.guiTinMau` — KHÔNG đi qua bảng mẫu thật (`BANG_MAU_TIN` rỗng, xem
// cua-whatsapp-v1.md §3 «muốn test orchestration thì mock TOÀN BỘ guiTinMau ở tầng gọi»).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import {
  quetDonMoi,
  batDauQuet,
  lyDoTuLoi,
  CAU_QUET,
  NHIP_QUET_MS,
  TRAN_QUET_MS,
  LY_DO_KHONG_GUI,
  NGUON,
  TRANG_THAI_GIEO,
} from "../src/orders/index.js";
import {
  LoiMauChuaDuyet,
  LoiCuaGuiDong,
} from "../src/channels/whatsapp/index.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
let teamA, teamB;

function spy(xuLy) {
  const goi = [];
  const f = async (...a) => {
    goi.push(a);
    if (typeof xuLy === "function") return xuLy(...a);
    return { ok: true };
  };
  f.goi = goi;
  f.dem = () => goi.length;
  return f;
}

async function taoKhach(team, so) {
  const r = await mot(
    "INSERT INTO khach (team_id, so_dien_thoai, ten) VALUES ($1,$2,$3) RETURNING id",
    [team, so, "khách ca đo"],
  );
  return r.id;
}

async function taoDon({
  team = teamA,
  nguon = NGUON.TRANG_BAN_HANG,
  trangThaiPos = "0",
  khachId = null,
  trangThaiHe = TRANG_THAI_GIEO,
} = {}) {
  return mot(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      team,
      `9999:${Math.floor(Math.random() * 1e9)}`,
      nguon,
      trangThaiHe,
      trangThaiPos,
      khachId,
    ],
  );
}

/** Xoá sạch dân số giữa các ca — sandbox là của riêng bộ ca này, không có 26 đơn thật ở đây. */
async function donDanSo() {
  await q("DELETE FROM viec_can_xu_ly");
  await q("DELETE FROM don_hang");
  await q("DELETE FROM khach");
}

before(async () => {
  sb = await dungSandbox("l3m1quet");
  teamA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  teamB = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
});
after(async () => {
  if (sb) await sb.don();
});

// ═══ ① CÂU QUÉT — vế «nguon» là vế KHÔNG ĐƯỢC RƠI RA ══════════════════════════

test("G0 · CAU_QUET lọc CỨNG nguon='trang_ban_hang' và nhịp quét NGẶT hơn trần 5 phút", () => {
  assert.match(CAU_QUET, /nguon\s*=\s*'trang_ban_hang'/);
  assert.ok(
    NHIP_QUET_MS <= TRAN_QUET_MS,
    `${NHIP_QUET_MS} phải ≤ ${TRAN_QUET_MS}`,
  );
  assert.equal(TRAN_QUET_MS, 5 * 60_000);
  assert.throws(() => batDauQuet(sb.pool, { nhipMs: 6 * 60_000 }), /vượt trần/);
});

// ═══ ② NHÁNH TRANG BÁN HÀNG — gửi 1 lượt, idempotent (phép ④#2) ═══════════════

test("G1 · đơn POS=0 chưa vào máy ⇒ quét gửi ĐÚNG 1 lượt → da_gui_wa; quét lần 2 KHÔNG gửi lại", async () => {
  await donDanSo();
  const kh = await taoKhach(teamA, "+971500000001");
  const don = await taoDon({ khachId: kh });
  const guiTinMau = spy();

  const l1 = await quetDonMoi(sb.pool, {}, { guiTinMau });
  assert.equal(l1.quet, 1);
  assert.equal(l1.daGui, 1);
  assert.equal(guiTinMau.dem(), 1);
  // in được THAM SỐ mẫu tin, không chỉ đếm
  const thamSo = guiTinMau.goi[0][2];
  assert.equal(thamSo.soNhan, "+971500000001");
  assert.equal(String(thamSo.donHangId), String(don.id));
  assert.equal(thamSo.thamSo.ma_don, don.ma_pos);

  const sau = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [
    don.id,
  ]);
  assert.equal(sau.trang_thai_he, "da_gui_wa");

  const l2 = await quetDonMoi(sb.pool, {}, { guiTinMau });
  assert.equal(l2.quet, 0, "đơn đã gửi không được quét lại");
  assert.equal(guiTinMau.dem(), 1, "spy vẫn 1 — idempotent");
});

test("G2 · đơn nguồn MESSENGER dù POS=0 cũng KHÔNG bao giờ bị quét vào luồng WhatsApp", async () => {
  await donDanSo();
  const kh = await taoKhach(teamA, "+971500000002");
  const don = await taoDon({ nguon: NGUON.MESSENGER, khachId: kh });
  const guiTinMau = spy();
  const kq = await quetDonMoi(sb.pool, {}, { guiTinMau });
  assert.equal(kq.quet, 0);
  assert.equal(guiTinMau.dem(), 0);
  const sau = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [
    don.id,
  ]);
  assert.equal(
    sau.trang_thai_he,
    TRANG_THAI_GIEO,
    "đơn messenger không bị máy WA đụng vào",
  );
});

// ═══ ③ BA LÝ DO KHÔNG GỬI (phép ④#2b — đắt nhất thứ hai) ══════════════════════

test("G3 · ba ca hỏng ⇒ 3 đơn gui_wa_loi, đếm THEO LÝ DO = 1/1/1 trên riêng đơn trang bán hàng", async () => {
  await donDanSo();
  // ① thiếu số WA — đơn không nối khách
  const d1 = await taoDon({ khachId: null });
  // ② mẫu chưa duyệt
  const k2 = await taoKhach(teamA, "+971500000012");
  const d2 = await taoDon({ khachId: k2 });
  // ③ lỗi kênh
  const k3 = await taoKhach(teamA, "+971500000013");
  const d3 = await taoDon({ khachId: k3 });
  // đơn messenger nằm cùng CSDL để chứng minh phép đếm không dính nó
  const kM = await taoKhach(teamA, "+971500000099");
  await taoDon({ nguon: NGUON.MESSENGER, khachId: kM });

  const guiTinMau = spy((pool, ctx, goi) => {
    if (String(goi.donHangId) === String(d2.id))
      throw new LoiMauChuaDuyet("mẫu chưa được Meta duyệt");
    if (String(goi.donHangId) === String(d3.id))
      throw new LoiCuaGuiDong("V3_WA_GUI vắng — cửa gửi ĐÓNG");
    return { ok: true };
  });

  const kq = await quetDonMoi(sb.pool, {}, { guiTinMau, tranThuLai: 9 });
  assert.equal(kq.quet, 3, "chỉ 3 đơn trang bán hàng được quét");
  assert.equal(kq.hong, 3);
  assert.equal(guiTinMau.dem(), 2, "ca thiếu số KHÔNG chạm cửa WA lượt nào");

  const dem = await q(
    `SELECT ly_do_khong_gui, count(*)::int c FROM don_hang
      WHERE nguon='trang_ban_hang' AND trang_thai_he='gui_wa_loi'
      GROUP BY 1 ORDER BY 1`,
  );
  assert.deepEqual(
    dem.rows.map((r) => [r.ly_do_khong_gui, r.c]),
    [
      ["loi_kenh", 1],
      ["mau_chua_duyet", 1],
      ["thieu_so_wa", 1],
    ],
  );
  const msg = await mot(
    `SELECT count(*)::int c FROM don_hang WHERE nguon='messenger' AND ly_do_khong_gui IS NOT NULL`,
  );
  assert.equal(msg.c, 0, "phép đếm ba lý do KHÔNG được chạm đơn messenger");
  assert.deepEqual(
    Object.keys(kq.theoLyDo).sort(),
    [...LY_DO_KHONG_GUI].sort(),
    "ô đếm khai đúng ba lý do, không có ô «khác»",
  );
  assert.equal(String(d1.id) !== "", true);
});

test("G4 · CSDL CHẶN lý do lạ và chặn lý do đeo bám sau khi rời gui_wa_loi (migration 004)", async () => {
  await donDanSo();
  const d = await taoDon();
  await assert.rejects(
    () =>
      q(
        "UPDATE don_hang SET trang_thai_he='gui_wa_loi', ly_do_khong_gui='ly_do_bia' WHERE id=$1",
        [d.id],
      ),
    /don_hang_ly_do_khong_gui_check|violates check constraint/,
  );
  await assert.rejects(
    () =>
      q(
        "UPDATE don_hang SET trang_thai_he='da_gui_wa', ly_do_khong_gui='loi_kenh' WHERE id=$1",
        [d.id],
      ),
    /don_hang_ly_do_theo_trang_thai/,
  );
});

test("G5 · quá TRẦN thử lại ⇒ cho_sale + 1 dòng viec_can_xu_ly mang lý do cuối", async () => {
  await donDanSo();
  const kh = await taoKhach(teamA, "+971500000021");
  const don = await taoDon({ khachId: kh });
  const guiTinMau = spy(() => {
    throw new LoiCuaGuiDong("cửa đóng");
  });
  // trần = 2 ⇒ lượt quét 1 (lần thử 1) còn ở gui_wa_loi, lượt 2 (lần thử 2) chạm trần
  const l1 = await quetDonMoi(sb.pool, {}, { guiTinMau, tranThuLai: 2 });
  assert.equal(l1.hong, 1);
  assert.equal(l1.quaTran, 0);
  const giua = await mot(
    "SELECT trang_thai_he, so_lan_thu_wa FROM don_hang WHERE id=$1",
    [don.id],
  );
  assert.equal(giua.trang_thai_he, "gui_wa_loi");
  assert.equal(giua.so_lan_thu_wa, 1);

  const l2 = await quetDonMoi(sb.pool, {}, { guiTinMau, tranThuLai: 2 });
  assert.equal(l2.quaTran, 1);
  const sau = await mot(
    "SELECT trang_thai_he, so_lan_thu_wa, ly_do_khong_gui FROM don_hang WHERE id=$1",
    [don.id],
  );
  assert.equal(sau.trang_thai_he, "cho_sale");
  assert.equal(sau.so_lan_thu_wa, 2);
  assert.equal(
    sau.ly_do_khong_gui,
    null,
    "rời gui_wa_loi thì lý do phải được dọn (bất biến 004)",
  );
  const viec = await mot(
    "SELECT ly_do_day FROM viec_can_xu_ly WHERE don_hang_id=$1",
    [don.id],
  );
  assert.match(viec.ly_do_day, /qua_tran_thu_lai \(2\/2\).*loi_kenh/);

  const l3 = await quetDonMoi(sb.pool, {}, { guiTinMau, tranThuLai: 2 });
  assert.equal(l3.quet, 0, "đơn đã giao người thì không quét lại nữa");
});

test("G6 · lyDoTuLoi: LoiMauChuaDuyet → mau_chua_duyet; mọi hỏng đường gửi còn lại → loi_kenh", () => {
  assert.equal(lyDoTuLoi(new LoiMauChuaDuyet("x")), "mau_chua_duyet");
  assert.equal(lyDoTuLoi(new LoiCuaGuiDong("x")), "loi_kenh");
  assert.equal(lyDoTuLoi(new Error("ETIMEDOUT")), "loi_kenh");
});

// ═══ ④ REBIND ctx PER-ĐƠN (phép ④#6) ═════════════════════════════════════════

test("G7 · MỘT lượt quét, 2 đơn của 2 team nghiệp vụ ⇒ 2 dòng nhat_ky mang 2 team_id đúng theo TỪNG đơn", async () => {
  await donDanSo();
  // ⚠️ KHÔNG dọn `nhat_ky` — bảng CHỈ-INSERT, trigger `chan_sua_xoa` chặn cả DELETE.
  // Phép đo lọc theo `doi_tuong_id` của đúng hai đơn vừa tạo nên dòng cũ không lẫn vào.
  const kA = await taoKhach(teamA, "+971500000031");
  const kB = await taoKhach(teamB, "+971500000032");
  const dA = await taoDon({ team: teamA, khachId: kA });
  const dB = await taoDon({ team: teamB, khachId: kB });

  const kq = await quetDonMoi(sb.pool, {}, { guiTinMau: spy() });
  assert.equal(kq.quet, 2);
  assert.equal(kq.daGui, 2);

  const cap = await q(
    `SELECT doi_tuong_id, team_id FROM nhat_ky
      WHERE hanh_dong='don_doi_trang_thai' AND doi_tuong_id = ANY($1)
      GROUP BY 1,2 ORDER BY 1`,
    [[String(dA.id), String(dB.id)]],
  );
  const banDo = Object.fromEntries(
    cap.rows.map((r) => [r.doi_tuong_id, String(r.team_id)]),
  );
  assert.deepEqual(banDo, {
    [String(dA.id)]: String(teamA),
    [String(dB.id)]: String(teamB),
  });
  assert.equal(
    cap.rowCount,
    2,
    "mỗi đơn ĐÚNG MỘT team — không đơn nào mượn team của đơn kia",
  );
});

test("G8 · một đơn hỏng KHÔNG làm hỏng cả lô — đơn còn lại vẫn gửi được", async () => {
  await donDanSo();
  const kA = await taoKhach(teamA, "+971500000041");
  const kB = await taoKhach(teamA, "+971500000042");
  const dHong = await taoDon({ khachId: kA });
  const dLanh = await taoDon({ khachId: kB });
  const guiTinMau = spy((pool, ctx, goi) => {
    if (String(goi.donHangId) === String(dHong.id)) {
      const e = new Error("đơn đi nhầm nhánh");
      e.name = "LoiSaiNguonDon";
      throw e;
    }
    return { ok: true };
  });
  const kq = await quetDonMoi(sb.pool, {}, { guiTinMau });
  assert.equal(kq.quet, 2);
  assert.equal(kq.saiNhanh, 1);
  assert.equal(kq.daGui, 1);
  assert.deepEqual(
    kq.donSaiNhanh.map((x) => x.loi),
    ["LoiSaiNguonDon"],
  );
  const lanh = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [
    dLanh.id,
  ]);
  assert.equal(lanh.trang_thai_he, "da_gui_wa");
});
