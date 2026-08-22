// VA-R3 · Máy trạng thái: CAS ghiDon (RF-13) + job quét NHẶT LẠI đơn kẹt cho_gui_wa
// (RF-14). Base bf9614a, sổ điều hành §9b/§9 (23/08).
//
// Sandbox riêng (`aicloser_v3_test_var3`), tự dựng tự dọn — cùng khuôn test/l3-m1-*.
// Import THẲNG từ file nguồn (không qua src/orders/index.js — file đó NGOÀI pathspec
// phiếu, và l3-m3-lich-nhac.test.js/l3-m3-nhan-phan-hoi-wa.test.js đã có tiền lệ này).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { ctxHeThong } from "../src/db/index.js";
import {
  apDung,
  nhanPhanHoi,
  chuyen,
  LoiGhiDonAnhCu,
  LoiChuyenNgoaiBangDon,
} from "../src/orders/may-trang-thai.js";
import { quetDonMoi } from "../src/orders/quet-don-moi.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
let TEAM;

before(async () => {
  sb = await dungSandbox("var3");
  TEAM = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
});
after(async () => {
  if (sb) await sb.don();
});

async function taoKhach(so) {
  const r = await mot(
    "INSERT INTO khach (team_id, so_dien_thoai, ten) VALUES ($1,$2,$3) RETURNING id",
    [TEAM, so, "khách VA-R3"],
  );
  return r.id;
}

async function taoDon({
  trangThaiHe,
  trangThaiPos = "0",
  khachId = null,
} = {}) {
  return mot(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id)
     VALUES ($1,$2,'trang_ban_hang',$3,$4,$5) RETURNING *`,
    [
      TEAM,
      `9999:${Math.floor(Math.random() * 1e9)}`,
      trangThaiHe,
      trangThaiPos,
      khachId,
    ],
  );
}

// ═══ ① RF-13 · CAS ghiDon() — hai lượt song song cùng đơn (④#3) ════════════════

test("R3-1 · CAS: 2 lượt ghiDon song song CÙNG đơn (cùng ẢNH đọc trước) → ĐÚNG 1 ghi=true, 1 ghi=false (không cả hai ghi)", async () => {
  const don = await taoDon({ trangThaiHe: "da_gui_wa" });
  // Hai ẢNH đọc TRƯỚC (mô phỏng đúng ④#3: "2 lượt ghiDon song song") — cố ý KHÔNG để mỗi
  // lượt tự taiDon() độc lập, vì thứ tự SELECT/UPDATE trên pool nhiều connection không
  // đảm bảo thật sự chồng lấn (đo thử: có lượt chạy 1 xong TRỌN trước khi lượt 2 mới
  // SELECT — khi đó chuyen() chặn ở tầng NGOÀI BẢNG chứ không phải CAS, một lỗi tên khác
  // nhưng CÙNG an toàn). Truyền `don` sẵn ép CẢ HAI cùng xuất phát từ MỘT ảnh, buộc đúng
  // cửa CAS ở ghiDon() phải là nơi phân định — đây mới là phép đo KHÔNG phụ thuộc lịch
  // chạy I/O (án lệ skill #1: "cái thước cũng phải qua cổng").
  const anh1 = { ...don };
  const anh2 = { ...don };
  const [r1, r2] = await Promise.all([
    apDung(sb.pool, ctxHeThong(), {
      donId: don.id,
      sukien: "het_luot",
      don: anh1,
    }),
    apDung(sb.pool, ctxHeThong(), {
      donId: don.id,
      sukien: "het_luot",
      don: anh2,
    }),
  ]);
  const ghiCount = [r1, r2].filter((r) => r.ghi === true).length;
  const tuChoiCount = [r1, r2].filter(
    (r) => r.ghi === false && r.biTuChoiAnhCu === true,
  ).length;
  assert.equal(ghiCount, 1, "ĐÚNG một lượt thắng CAS (ghi=true)");
  assert.equal(tuChoiCount, 1, "ĐÚNG một lượt bị từ chối ảnh cũ (ghi=false)");

  const sau = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [
    don.id,
  ]);
  assert.equal(sau.trang_thai_he, "cho_sale", "kết quả cuối là của lượt THẮNG");

  const nk = await mot(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong='don_doi_trang_thai' AND doi_tuong_id=$1",
    [String(don.id)],
  );
  assert.equal(
    nk.c,
    1,
    "chỉ MỘT dòng nhat_ky ghi-thành-công — không cả hai ghi",
  );
  const nkChan = await mot(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong='don_chuyen_bi_chan' AND doi_tuong_id=$1",
    [String(don.id)],
  );
  assert.equal(
    nkChan.c,
    1,
    "lượt bị từ chối vẫn để lại dấu — không im lặng (luật ④#5)",
  );
});

test("R3-2 · ghiDon từ ẢNH CŨ (F5 repro): POS đã ghi 12 rồi, lượt sau đi từ ảnh cũ bị TỪ CHỐI — hai sổ không lệch", async () => {
  const kh = await taoKhach("+971500000910");
  const don = await taoDon({ trangThaiHe: "da_gui_wa", khachId: kh });
  const anhCu = { ...don }; // ảnh chụp TRƯỚC khi nhanPhanHoi chạy — mô phỏng job nhắc cũ
  let posGhi = 0;
  const kqXacNhan = await nhanPhanHoi(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, ket_qua: "xac_nhan" },
    {
      docLivePos: async () => 0,
      ghiNguocPos: async () => {
        posGhi++;
        return { maPos: don.ma_pos, sang: 12 };
      },
    },
  );
  assert.equal(kqXacNhan.sang, "day_cho_in");
  assert.equal(posGhi, 1);

  // Lượt "het_luot" tới SAU, mang ẢNH CŨ (don còn "da_gui_wa" trong bộ nhớ của nó).
  const kqTre = await apDung(sb.pool, ctxHeThong(), {
    donId: don.id,
    sukien: "het_luot",
    don: anhCu,
  });
  assert.equal(kqTre.ghi, false, "lượt từ ảnh cũ KHÔNG được ghi");
  assert.equal(kqTre.biTuChoiAnhCu, true);

  const cuoi = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [
    don.id,
  ]);
  assert.equal(
    cuoi.trang_thai_he,
    "day_cho_in",
    "hệ vẫn day_cho_in — KHỚP với POS đã sang 12 (không lệch sổ)",
  );
});

test("R3-3 · chuyen() sai NHÁNH/ngoài bảng vẫn NÉM như cũ — CAS không nuốt lỗi logic", () => {
  assert.throws(
    () => chuyen({ nguon: "trang_ban_hang", trang_thai_he: "moi" }, "xac_nhan"),
    { name: "LoiChuyenNgoaiBangDon" },
  );
});

// ═══ ② RF-14 · job quét NHẶT LẠI đơn kẹt cho_gui_wa (④#2) ══════════════════════

test("R3-4 · đơn kẹt cho_gui_wa (mô phỏng crash) → lượt quét sau NHẶT LẠI, gửi lại THÀNH CÔNG → da_gui_wa", async () => {
  const kh = await taoKhach("+971500000911");
  const don = await taoDon({ trangThaiHe: "cho_gui_wa", khachId: kh });
  const truoc = await mot(
    "SELECT trang_thai_he, so_lan_thu_wa FROM don_hang WHERE id=$1",
    [don.id],
  );
  const guiTinMau = async () => ({ ok: true });
  const kq = await quetDonMoi(sb.pool, {}, { guiTinMau });
  const sau = await mot(
    "SELECT trang_thai_he, so_lan_thu_wa FROM don_hang WHERE id=$1",
    [don.id],
  );
  console.log(
    `   R3-4 trước=${truoc.trang_thai_he}/${truoc.so_lan_thu_wa} → sau=${sau.trang_thai_he}/${sau.so_lan_thu_wa} · quet=${kq.quet} daGui=${kq.daGui}`,
  );
  assert.equal(kq.quet, 1, "CAU_QUET phải NHẶT được đơn đang kẹt ở cho_gui_wa");
  assert.equal(kq.daGui, 1);
  assert.equal(
    sau.trang_thai_he,
    "da_gui_wa",
    "gửi lại thành công thì đi tiếp bình thường",
  );
});

test("R3-5 · đơn kẹt cho_gui_wa, lượt NHẶT LẠI cũng hỏng → đẩy THẲNG cho_sale + viec_can_xu_ly (không chờ đủ trần lần hai)", async () => {
  const kh = await taoKhach("+971500000912");
  const don = await taoDon({ trangThaiHe: "cho_gui_wa", khachId: kh });
  const truoc = await mot(
    "SELECT trang_thai_he, so_lan_thu_wa FROM don_hang WHERE id=$1",
    [don.id],
  );
  const guiTinMau = async () => {
    const e = new Error("cửa đóng");
    e.name = "LoiCuaGuiDong";
    throw e;
  };
  const kq = await quetDonMoi(sb.pool, {}, { guiTinMau, tranThuLai: 3 });
  const sau = await mot(
    "SELECT trang_thai_he, so_lan_thu_wa, ly_do_khong_gui FROM don_hang WHERE id=$1",
    [don.id],
  );
  const viec = await q(
    "SELECT ly_do_day FROM viec_can_xu_ly WHERE don_hang_id=$1",
    [don.id],
  );
  console.log(
    `   R3-5 trước=${truoc.trang_thai_he}/${truoc.so_lan_thu_wa} → sau=${sau.trang_thai_he}/${sau.so_lan_thu_wa} · viec_can_xu_ly=${viec.rowCount}`,
  );
  assert.equal(kq.quet, 1);
  assert.equal(
    kq.quaTran,
    1,
    "nhặt lại hỏng ⇒ tính NGAY là quá trần, không đợi lần hai",
  );
  assert.equal(sau.trang_thai_he, "cho_sale");
  assert.equal(
    sau.trang_thai_he !== "cho_gui_wa",
    true,
    "đơn KHÔNG được rơi lại cho_gui_wa — đó chính là lỗ RF-14",
  );
  assert.equal(
    viec.rowCount,
    1,
    "0 viec_can_xu_ly là đúng cái lỗ RF-14 mô tả — giờ phải = 1",
  );
  assert.match(viec.rows[0].ly_do_day, /nhặt lại/);

  // Quét THÊM một lượt nữa: đơn đã rời hẳn cho_gui_wa/gui_wa_loi ⇒ không bị nhặt lại lần nữa.
  const kq2 = await quetDonMoi(sb.pool, {}, { guiTinMau });
  assert.equal(kq2.quet, 0, "đơn đã giao người thì không còn bị quét nhặt lại");
});

test("R3-6 · CAU_QUET vẫn lọc CỨNG nguon='trang_ban_hang' sau khi thêm vế cho_gui_wa", async () => {
  const { CAU_QUET } = await import("../src/orders/quet-don-moi.js");
  assert.match(CAU_QUET, /nguon\s*=\s*'trang_ban_hang'/);
  assert.match(CAU_QUET, /trang_thai_he\s*=\s*'cho_gui_wa'/);
});

test("R3-7 · một đơn kẹt hỏng KHÔNG làm hỏng đơn lành cùng lượt quét (per-ĐƠN, khuôn G8)", async () => {
  const khHong = await taoKhach("+971500000913");
  const khLanh = await taoKhach("+971500000914");
  const donHong = await taoDon({ trangThaiHe: "cho_gui_wa", khachId: khHong });
  const donLanh = await taoDon({ trangThaiHe: "moi_tu_pos", khachId: khLanh });
  const guiTinMau = async (pool, ctx, goi) => {
    if (String(goi.donHangId) === String(donHong.id)) {
      const e = new Error("cửa đóng");
      e.name = "LoiCuaGuiDong";
      throw e;
    }
    return { ok: true };
  };
  const kq = await quetDonMoi(sb.pool, {}, { guiTinMau });
  assert.equal(kq.quet, 2);
  assert.equal(kq.daGui, 1);
  assert.equal(kq.quaTran, 1);
  const lanh = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [
    donLanh.id,
  ]);
  assert.equal(lanh.trang_thai_he, "da_gui_wa");
});
