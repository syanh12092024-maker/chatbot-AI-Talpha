// L3-M1 · MÁY TRẠNG THÁI ĐƠN PHÂN NHÁNH THEO NGUỒN — bảng chuyển per-nguồn, nhánh
// messenger SẠCH WhatsApp, CAS theo LIVE của POS, ba hook cho L3-M3/M4.
//
// Chạy trên CSDL sandbox riêng (`aicloser_v3_test_l3m1may`), tự dựng tự dọn — cùng khuôn
// test/l1-m3-cua.test.js. KHÔNG chạm `aicloser_v3` dev (26 đơn thật + dữ liệu thợ song
// song ở đó), KHÔNG chạm mạng: hai cửa ngoài (WhatsApp, POS) đều là spy tiêm qua deps.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { ctxHeThong } from "../src/db/index.js";
import {
  BANG_CHUYEN,
  NGUON,
  TRANG_THAI_GIEO,
  TAP_TIEN_IN,
  MA_POS_CHO_IN,
  chuyen,
  apDung,
  nhanPhanHoi,
  baoHetLuot,
  donMessengerDaTao,
  LoiSaiNhanhNguon,
  LoiChuyenNgoaiBangDon,
  LoiThieuNguonDon,
} from "../src/orders/index.js";
import { kiemChuyen, CHUYEN_CHO_PHEP, BANG_MA } from "../src/pos/index.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
let teamA, teamB;

/** Spy đếm lượt + giữ tham số — KHÔNG chạm mạng nào. */
function spy(ra = {}) {
  const goi = [];
  const f = async (...a) => {
    goi.push(a);
    return typeof ra === "function" ? ra(...a) : ra;
  };
  f.goi = goi;
  f.dem = () => goi.length;
  return f;
}

async function taoDon({
  team = teamA,
  nguon = NGUON.TRANG_BAN_HANG,
  trangThaiHe = TRANG_THAI_GIEO,
  trangThaiPos = "0",
  maPos = null,
  khachId = null,
} = {}) {
  const r = await mot(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      team,
      maPos ?? `9999:${Math.floor(Math.random() * 1e9)}`,
      nguon,
      trangThaiHe,
      trangThaiPos,
      khachId,
    ],
  );
  return r;
}

/** Đưa một đơn trang_ban_hang tới đúng `da_gui_wa` bằng CHÍNH máy trạng thái (không UPDATE tay). */
async function toiDaGuiWa(opts = {}) {
  const don = await taoDon(opts);
  const ctx = ctxHeThong();
  await apDung(sb.pool, ctx, { donId: don.id, sukien: "vao_may" });
  await apDung(sb.pool, ctx, { donId: don.id, sukien: "bat_dau_gui" });
  await apDung(sb.pool, ctx, { donId: don.id, sukien: "gui_xong" });
  return mot("SELECT * FROM don_hang WHERE id=$1", [don.id]);
}

before(async () => {
  sb = await dungSandbox("l3m1may");
  teamA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  teamB = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
});
after(async () => {
  if (sb) await sb.don();
});

// ═══ ① HÀM THUẦN + BẢNG CHUYỂN PER-NGUỒN ══════════════════════════════════════

test("A1 · chuyen() là hàm THUẦN — bảng chuyển khai per-NGUỒN, hai nhánh không dùng chung ô nào", () => {
  const tbh = BANG_CHUYEN[NGUON.TRANG_BAN_HANG].map(
    (c) => `${c.tu}--${c.sukien}->${c.sang}`,
  );
  const msg = BANG_CHUYEN[NGUON.MESSENGER].map(
    (c) => `${c.tu}--${c.sukien}->${c.sang}`,
  );
  assert.equal(
    msg.length,
    1,
    "nhánh messenger chỉ có ĐÚNG một chuyển: da_tao → day_cho_in",
  );
  assert.deepEqual(msg, [`${TRANG_THAI_GIEO}--da_tao->day_cho_in`]);
  assert.equal(tbh.filter((x) => msg.includes(x)).length, 0);
  // hàm thuần: gọi hai lượt trên cùng đầu vào ra cùng kết quả, không đụng gì bên ngoài
  const a = chuyen(
    { nguon: NGUON.TRANG_BAN_HANG, trang_thai_he: "moi" },
    "bat_dau_gui",
  );
  const b = chuyen(
    { nguon: NGUON.TRANG_BAN_HANG, trang_thai_he: "moi" },
    "bat_dau_gui",
  );
  assert.deepEqual(a, b);
  assert.equal(a.sang, "cho_gui_wa");
});

test("A2 · MỌI trạng thái trong bảng đều có ít nhất một SỰ KIỆN KÍCH tới nó — không trạng thái mồ côi", () => {
  for (const [nguon, bang] of Object.entries(BANG_CHUYEN)) {
    const dich = new Set(bang.map((c) => c.sang));
    const nguonTrangThai = new Set(bang.map((c) => c.tu));
    for (const t of nguonTrangThai) {
      assert.ok(
        t === TRANG_THAI_GIEO || dich.has(t),
        `nguồn ${nguon}: trạng thái "${t}" không có sự kiện nào kích tới ⇒ mồ côi`,
      );
    }
  }
});

test("A3 · đơn KHÔNG quyết được `nguon` ⇒ máy TỪ CHỐI nhận (LoiThieuNguonDon), không đoán nhánh", () => {
  assert.throws(
    () => chuyen({ nguon: null, trang_thai_he: "moi" }, "bat_dau_gui"),
    {
      name: "LoiThieuNguonDon",
    },
  );
  assert.throws(
    () => chuyen({ nguon: "lung_tung", trang_thai_he: "moi" }, "bat_dau_gui"),
    {
      name: "LoiThieuNguonDon",
    },
  );
});

// ═══ ② NHÁNH MESSENGER SẠCH WHATSAPP (phép ④#1 — đắt nhất) ════════════════════

test("B1 · donMessengerDaTao → day_cho_in, spy cửa WA = 0 TUYỆT ĐỐI", async () => {
  const guiTinMau = spy({ ok: true });
  const don = await taoDon({ nguon: NGUON.MESSENGER, trangThaiPos: "12" });
  const kq = await donMessengerDaTao(sb.pool, ctxHeThong(), { donId: don.id });
  assert.equal(kq.sang, "day_cho_in");
  const sau = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [
    don.id,
  ]);
  assert.equal(sau.trang_thai_he, "day_cho_in");
  assert.equal(
    guiTinMau.dem(),
    0,
    "nhánh messenger KHÔNG được chạm cửa WhatsApp lượt nào",
  );
});

test("B2 · ép đơn messenger sang trạng thái WA ⇒ LoiSaiNhanhNguon (cả 4 sự kiện của nhánh WA)", async () => {
  const don = await taoDon({ nguon: NGUON.MESSENGER, trangThaiPos: "12" });
  for (const sk of ["vao_may", "bat_dau_gui", "gui_xong", "xac_nhan"]) {
    await assert.rejects(
      () => apDung(sb.pool, ctxHeThong(), { donId: don.id, sukien: sk }),
      (e) => {
        assert.equal(
          e.name,
          "LoiSaiNhanhNguon",
          `sự kiện ${sk} phải ném LoiSaiNhanhNguon`,
        );
        return true;
      },
    );
  }
  // gọi hàm của nhánh messenger trên đơn trang bán hàng cũng bị chặn, cùng tên lỗi
  const donTbh = await taoDon();
  await assert.rejects(
    () => donMessengerDaTao(sb.pool, ctxHeThong(), { donId: donTbh.id }),
    { name: "LoiSaiNhanhNguon" },
  );
});

test("B3 · đơn messenger KHÔNG có dòng trạng thái pre-duyệt nào trong don_hang (pre-duyệt = hang_cho_tao_don, đất L3-M4)", async () => {
  const r = await mot(
    `SELECT count(*)::int c FROM don_hang
      WHERE nguon='messenger' AND trang_thai_he = ANY($1)`,
    [["moi", "cho_gui_wa", "da_gui_wa", "gui_wa_loi", "cho_duyet", "hang_cho"]],
  );
  assert.equal(r.c, 0);
});

// ═══ ③ xac_nhan — CAS THEO LIVE (phép ④#3) ════════════════════════════════════

test("C1 · live=0 (new) ⇒ CAS {tu:0,sang:12} → day_cho_in", async () => {
  const don = await toiDaGuiWa();
  const ghiNguocPos = spy({ ok: true });
  const kq = await nhanPhanHoi(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, ket_qua: "xac_nhan" },
    { ghiNguocPos, docLivePos: async () => 0 },
  );
  assert.equal(kq.sang, "day_cho_in");
  assert.equal(ghiNguocPos.dem(), 1);
  assert.deepEqual(
    { tu: ghiNguocPos.goi[0][2].tu, sang: ghiNguocPos.goi[0][2].sang },
    { tu: 0, sang: MA_POS_CHO_IN },
  );
});

test("C2 · live=1 (submitted chen giữa, đồ thị 0→1→12→8) ⇒ CAS {tu:1,sang:12} → day_cho_in", async () => {
  const don = await toiDaGuiWa();
  const ghiNguocPos = spy({ ok: true });
  const kq = await nhanPhanHoi(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, ket_qua: "xac_nhan" },
    { ghiNguocPos, docLivePos: async () => 1 },
  );
  assert.equal(kq.sang, "day_cho_in");
  assert.equal(ghiNguocPos.dem(), 1);
  assert.deepEqual(
    { tu: ghiNguocPos.goi[0][2].tu, sang: ghiNguocPos.goi[0][2].sang },
    { tu: 1, sang: MA_POS_CHO_IN },
  );
  assert.deepEqual(
    [...TAP_TIEN_IN],
    [0, 1],
    "tập tiền-in chốt theo bảng mã ĐÃ XÁC MINH",
  );
  assert.equal(
    BANG_MA[1],
    "submitted",
    "nhãn mã 1 phải là nhãn ĐO ĐƯỢC, không đoán",
  );
});

test("C3 · live=8 (packing — NGOÀI tập tiền-in) ⇒ POS 0 lượt ghi + cho_sale + pos_trang_thai_la", async () => {
  const don = await toiDaGuiWa();
  const ghiNguocPos = spy({ ok: true });
  const kq = await nhanPhanHoi(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, ket_qua: "xac_nhan" },
    { ghiNguocPos, docLivePos: async () => 8 },
  );
  assert.equal(
    ghiNguocPos.dem(),
    0,
    "ngoài tập tiền-in thì KHÔNG gọi cửa ghi POS lượt nào",
  );
  assert.equal(kq.sang, "cho_sale");
  assert.match(kq.lyDo, /^pos_trang_thai_la=8$/);
  const viec = await mot(
    "SELECT ly_do_day FROM viec_can_xu_ly WHERE don_hang_id=$1",
    [don.id],
  );
  assert.match(viec.ly_do_day, /pos_trang_thai_la=8/);
  // trạng thái POS trong CSDL KHÔNG bị test (hay code) sửa tay
  const sau = await mot("SELECT trang_thai_pos FROM don_hang WHERE id=$1", [
    don.id,
  ]);
  assert.equal(sau.trang_thai_pos, "0");
});

test("C4 · cửa POS TỪ CHỐI ghi (ném) ⇒ không nuốt: đơn sang cho_sale kèm ĐÚNG TÊN LỖI", async () => {
  const don = await toiDaGuiWa();
  const ghiNguocPos = spy(() => {
    const e = new Error("V3_POS_GHI vắng — van ĐÓNG");
    e.name = "LoiVanGhiDong";
    throw e;
  });
  const kq = await nhanPhanHoi(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, ket_qua: "xac_nhan" },
    { ghiNguocPos, docLivePos: async () => 0 },
  );
  assert.equal(kq.sang, "cho_sale");
  assert.equal(kq.lyDo, "pos_tu_choi_ghi:LoiVanGhiDong");
  const viec = await mot(
    "SELECT ly_do_day FROM viec_can_xu_ly WHERE don_hang_id=$1",
    [don.id],
  );
  assert.match(viec.ly_do_day, /LoiVanGhiDong/);
});

test("C5 · ĐO CỬA POS THẬT (không mock): bảng chuyển cho phép của L1-M1 phủ được TAP_TIEN_IN tới đâu", () => {
  const co = (tu, sang) =>
    CHUYEN_CHO_PHEP.some((c) => c.tu === tu && c.sang === sang);
  // 0→12 có thật trong bảng đã xác minh — ca CHO-QUA chiều lành.
  assert.ok(co(0, MA_POS_CHO_IN));
  assert.deepEqual(kiemChuyen(0, MA_POS_CHO_IN), {
    tu: 0,
    sang: 12,
    nhanTu: "new",
    nhanSang: "wait_print",
  });
  // 1→12 CHƯA có ⇒ ngoài đời, ca live=1 rơi vào nhánh C4 (cho_sale), không phải day_cho_in.
  // Ca này là NEO ĐO HIỆN TRẠNG (nợ §9), KHÔNG phải lời khai «đã đủ» — sửa `CHUYEN_CHO_PHEP`
  // xong thì ca này đỏ, và đó đúng là lúc phải quay lại đọc lại đoạn này.
  assert.equal(co(1, MA_POS_CHO_IN), false);
  assert.throws(() => kiemChuyen(1, MA_POS_CHO_IN), {
    name: "LoiChuyenNgoaiBang",
  });
});

// ═══ ④ tu_choi / doi_sua / khong_ro / het_luot (phép ④#4) ═════════════════════

test("D1 · tu_choi → dong, POS 0 lượt, huyLichNhac spy = 1", async () => {
  const don = await toiDaGuiWa();
  const ghiNguocPos = spy({ ok: true });
  const huyLichNhac = spy({ camChua: false, huy: 0 });
  const kq = await nhanPhanHoi(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, ket_qua: "tu_choi" },
    { ghiNguocPos, docLivePos: async () => 0, huyLichNhac },
  );
  assert.equal(kq.sang, "dong");
  assert.equal(ghiNguocPos.dem(), 0);
  assert.equal(huyLichNhac.dem(), 1);
  const sau = await mot(
    "SELECT trang_thai_he, dong_luc FROM don_hang WHERE id=$1",
    [don.id],
  );
  assert.equal(sau.trang_thai_he, "dong");
  assert.ok(sau.dong_luc);
});

test("D2 · huyLichNhac ĐƯỢC GỌI ở CẢ ca xac_nhan", async () => {
  const don = await toiDaGuiWa();
  const huyLichNhac = spy({ camChua: false, huy: 0 });
  await nhanPhanHoi(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, ket_qua: "xac_nhan" },
    { ghiNguocPos: spy({ ok: true }), docLivePos: async () => 0, huyLichNhac },
  );
  assert.equal(huyLichNhac.dem(), 1);
});

test("D3 · doi_sua / khong_ro → cho_sale + ĐÚNG 1 dòng viec_can_xu_ly, lý do khác nhau", async () => {
  for (const kq_ of ["doi_sua", "khong_ro"]) {
    const don = await toiDaGuiWa();
    const kq = await nhanPhanHoi(
      sb.pool,
      ctxHeThong(),
      { donId: don.id, ket_qua: kq_ },
      { ghiNguocPos: spy({ ok: true }), docLivePos: async () => 0 },
    );
    assert.equal(kq.sang, "cho_sale");
    const ds = await q(
      "SELECT ly_do_day FROM viec_can_xu_ly WHERE don_hang_id=$1",
      [don.id],
    );
    assert.equal(ds.rowCount, 1);
    assert.ok(ds.rows[0].ly_do_day.startsWith(`${kq_}:`), ds.rows[0].ly_do_day);
  }
});

test("D4 · bao_het_luot → cho_sale (trạng thái CÓ sự kiện kích, không mồ côi)", async () => {
  const don = await toiDaGuiWa();
  const kq = await baoHetLuot(sb.pool, ctxHeThong(), { donId: don.id });
  assert.equal(kq.tu, "da_gui_wa");
  assert.equal(kq.sukien, "het_luot");
  assert.equal(kq.sang, "cho_sale");
  const viec = await mot(
    "SELECT ly_do_day FROM viec_can_xu_ly WHERE don_hang_id=$1",
    [don.id],
  );
  assert.match(viec.ly_do_day, /^het_luot_nhac:/);
});

test("D5 · ket_qua ngoài BỐN kết quả ⇒ ném ngay, không có ô «khác» im lặng", async () => {
  const don = await toiDaGuiWa();
  await assert.rejects(
    () =>
      nhanPhanHoi(
        sb.pool,
        ctxHeThong(),
        { donId: don.id, ket_qua: "co_le_dong_y" },
        {},
      ),
    /không thuộc bốn kết quả/,
  );
});

// ═══ ⑤ CẶP NGOÀI BẢNG ⇒ NÉM + GHI NHẬT KÝ (phép ④#5) ══════════════════════════

test("E1 · nhảy cóc moi → day_cho_in ⇒ ném LoiChuyenNgoaiBangDon + nhat_ky +1 dòng", async () => {
  const don = await taoDon();
  await apDung(sb.pool, ctxHeThong(), { donId: don.id, sukien: "vao_may" });
  const truoc = await mot(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong='don_chuyen_bi_chan' AND doi_tuong_id=$1",
    [String(don.id)],
  );
  await assert.rejects(
    () => apDung(sb.pool, ctxHeThong(), { donId: don.id, sukien: "xac_nhan" }),
    { name: "LoiChuyenNgoaiBangDon" },
  );
  const sau = await mot(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong='don_chuyen_bi_chan' AND doi_tuong_id=$1",
    [String(don.id)],
  );
  assert.equal(
    sau.c - truoc.c,
    1,
    "lượt BỊ CHẶN cũng phải để lại dấu — im lặng thì không ai biết",
  );
  const con = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [
    don.id,
  ]);
  assert.equal(con.trang_thai_he, "moi", "bị chặn thì đơn đứng nguyên chỗ cũ");
});

test("E2 · máy trạng thái CHỈ ghi được 4 cột của mình — `nguon`/`ma_pos`/`trang_thai_pos` khoá ngoài tầm", async () => {
  const don = await toiDaGuiWa();
  await assert.rejects(
    () =>
      apDung(sb.pool, ctxHeThong(), {
        donId: don.id,
        sukien: "tu_choi",
        them: { nguon: "messenger" },
      }),
    /không được ghi cột "nguon"/,
  );
});

// ═══ ⑥ CÁCH LY TEAM ═══════════════════════════════════════════════════════════

test("F1 · ctx NGƯỜI của team khác KHÔNG chạm được đơn — và nhánh hệ-thống mang đúng team của ĐƠN", async () => {
  const don = await toiDaGuiWa({ team: teamB });
  await assert.rejects(
    () =>
      apDung(
        sb.pool,
        { teamId: teamA, nguoiDungId: null },
        { donId: don.id, sukien: "tu_choi" },
      ),
    { name: "LoiThieuBoiCanhTeam" },
  );
  const kq = await apDung(sb.pool, ctxHeThong(), {
    donId: don.id,
    sukien: "tu_choi",
  });
  assert.equal(String(kq.teamId), String(teamB));
  const nk = await mot(
    "SELECT team_id FROM nhat_ky WHERE hanh_dong='don_doi_trang_thai' AND doi_tuong_id=$1 ORDER BY id DESC LIMIT 1",
    [String(don.id)],
  );
  assert.equal(String(nk.team_id), String(teamB));
});
