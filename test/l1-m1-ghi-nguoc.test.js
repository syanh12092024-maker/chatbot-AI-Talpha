// PHIẾU L1-M1 — BỐN CỬA AN TOÀN của `ghiNguocTrangThai` + bảng mã trạng thái.
//
// Nguyên tắc của bộ ca này: mỗi cửa được đo RIÊNG, và mỗi ca đo ĐỦ HAI vế —
//   (1) lỗi ném ra đúng TÊN, và (2) **API POS được gọi bao nhiêu lượt**.
// Vế (2) mới là vế đắt: một cửa "chặn" mà vẫn kịp bắn PUT ra ngoài thì đơn khách đã
// hỏng rồi, còn bộ ca chỉ nhìn `assert.rejects` thì vẫn xanh (án lệ #29 skill
// tho-thi-cong: đo «mã có đổi» chứ không đo «thẻ có ĐI»).
//
// `nap` (fetch) được tiêm vào từ ngoài nên mọi lượt chạm mạng đều đếm được, và bộ ca
// KHÔNG BAO GIỜ chạm POS thật.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { maHoa } from "../db/khoa.js";
import {
  ctxHeThong,
  LoiThieuBoiCanhTeam,
  LoiXuyenTeam,
} from "../src/db/index.js";
import {
  ghiNguocTrangThai,
  vanGhiMo,
  LoiVanGhiDong,
  LoiTrangThaiDaDoi,
} from "../src/pos/ghi-nguoc.js";
import {
  BANG_MA,
  NHOM_HUY_HOAN,
  CHUYEN_CHO_PHEP,
  kiemChuyen,
  daXacMinh,
  LoiChuyenNgoaiBang,
  LoiMaChuaXacMinh,
} from "../src/pos/ma-trang-thai.js";
import { layKetNoi, LoiThieuKetNoiPos } from "../src/pos/ket-noi.js";
import { suaTheoIdPos } from "../src/pos/kho.js";

const KHOA = { V3_KHOA_MA_HOA: "a".repeat(64) }; // 32 byte hex — KHÔNG đụng .env thật
const MO = { ...KHOA, V3_POS_GHI: "1" };
const DONG = { ...KHOA };
const SHOP = "9990001";
const CHUA_PHAN = 4;

let sb;
let pool;

/** `nap` giả: đếm từng lượt gọi theo phương thức, trả JSON do ca chỉ định. */
function napGia(kichBan) {
  const luot = { GET: 0, PUT: 0, tatCa: [] };
  const nap = async (url, tuyChon = {}) => {
    const pt = (tuyChon.method || "GET").toUpperCase();
    luot[pt] = (luot[pt] || 0) + 1;
    luot.tatCa.push({ pt, url });
    const r = await kichBan(pt, url, tuyChon);
    if (r instanceof Error) throw r;
    return {
      ok: r.ok !== false,
      status: r.status ?? 200,
      text: async () => JSON.stringify(r.than ?? { success: true }),
    };
  };
  return { nap, luot };
}

async function demNhatKy(hanhDong) {
  const r = await pool.query(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong = $1",
    [hanhDong],
  );
  return r.rows[0].c;
}

before(async () => {
  sb = await dungSandbox("l1m1a");
  pool = sb.pool;
  await pool.query(
    "INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma) VALUES ($1,$2,$3,$4)",
    [CHUA_PHAN, "GiaLap", SHOP, maHoa("khoa-gia-lap", KHOA)],
  );
});
after(async () => {
  await sb.don();
});

// ─── BẢNG MÃ (điều kiện mở cửa b) ────────────────────────────────────────────

test("M1 · bảng mã có đủ hai mã của nghiệp vụ và gọi đúng tên", () => {
  assert.equal(BANG_MA[0], "new");
  assert.equal(BANG_MA[12], "wait_print"); // «Chờ in» — 8 lần trong docs, 0 lần có mã số
  assert.equal(BANG_MA[3], "delivered"); // đoán 3="Chờ in" là đánh dấu đã giao khi hàng còn kho
});

test("M2 · nhóm hủy/hoàn đo được = {4,5,6,7} — 8 là `packing`, KHÔNG phải hủy", () => {
  assert.deepEqual([...NHOM_HUY_HOAN], [4, 5, 6, 7]);
  assert.equal(BANG_MA[8], "packing");
  assert.ok(
    !NHOM_HUY_HOAN.includes(8),
    "8 lọt vào nhóm hủy/hoàn ⇒ đếm thiếu đơn thành công",
  );
  for (const m of NHOM_HUY_HOAN) assert.ok(daXacMinh(m));
});

test("M3 · bảng chuyển CHỈ có hai cặp, và KHÔNG có nhánh xoá đơn", () => {
  assert.equal(CHUYEN_CHO_PHEP.length, 2);
  assert.deepEqual(CHUYEN_CHO_PHEP.map((c) => `${c.tu}→${c.sang}`).sort(), [
    "0→12",
    "12→0",
  ]);
  // 7 = removed. Không cặp nào được phép đi tới đó, hôm nay và mãi về sau.
  assert.equal(
    CHUYEN_CHO_PHEP.filter((c) => c.sang === 7).length,
    0,
    "có cặp chuyển sang 7 (removed) — vi phạm luật 2 §0a sổ điều hành",
  );
});

test("M4 · cửa (b) từ chối cặp ngoài bảng, và phân biệt được 'mã chưa xác minh'", () => {
  assert.deepEqual(kiemChuyen(0, 12).nhanSang, "wait_print");
  assert.throws(() => kiemChuyen(0, 3), LoiChuyenNgoaiBang);
  assert.throws(() => kiemChuyen(12, 8), LoiChuyenNgoaiBang);
  // 13 CÓ THẬT trong status_history nhưng chưa đọc được nhãn ⇒ deny-by-default
  assert.throws(() => kiemChuyen(0, 13), LoiMaChuaXacMinh);
  assert.throws(() => kiemChuyen(13, 12), LoiMaChuaXacMinh);
  assert.throws(() => kiemChuyen("x", 12), LoiChuyenNgoaiBang);
});

// ─── CỬA (a) — van môi trường ────────────────────────────────────────────────

test("A1 · vanGhiMo chỉ mở với '1'/'true' — mọi giá trị khác là ĐÓNG", () => {
  assert.equal(vanGhiMo({}), false);
  assert.equal(vanGhiMo({ V3_POS_GHI: "0" }), false);
  assert.equal(vanGhiMo({ V3_POS_GHI: "" }), false);
  assert.equal(vanGhiMo({ V3_POS_GHI: "yes" }), false);
  assert.equal(vanGhiMo({ V3_POS_GHI: "1" }), true);
  assert.equal(vanGhiMo({ V3_POS_GHI: "TRUE" }), true);
});

test("A2 · V3_POS_GHI vắng → LoiVanGhiDong · API 0 lượt · nhat_ky +1 dòng bị chặn", async () => {
  const truoc = await demNhatKy("pos_ghi_bi_chan");
  const { nap, luot } = napGia(() => ({ than: { success: true } }));
  await assert.rejects(
    () =>
      ghiNguocTrangThai(
        pool,
        ctxHeThong(),
        { market: "GiaLap", donId: 111, tu: 0, sang: 12, teamId: CHUA_PHAN },
        { nap, env: DONG },
      ),
    (e) => e instanceof LoiVanGhiDong && e.name === "LoiVanGhiDong",
  );
  assert.equal(luot.tatCa.length, 0, "van ĐÓNG mà vẫn chạm mạng POS");
  assert.equal(await demNhatKy("pos_ghi_bi_chan"), truoc + 1);
});

// ─── CỬA (b) — bảng chuyển ───────────────────────────────────────────────────

test("B1 · van MỞ + cặp ngoài bảng → ném lỗi · API 0 lượt · ghi dòng bị chặn", async () => {
  const truoc = await demNhatKy("pos_ghi_bi_chan");
  const { nap, luot } = napGia(() => ({ than: { success: true } }));
  await assert.rejects(
    () =>
      ghiNguocTrangThai(
        pool,
        ctxHeThong(),
        { market: "GiaLap", donId: 111, tu: 0, sang: 6, teamId: CHUA_PHAN },
        { nap, env: MO },
      ),
    LoiChuyenNgoaiBang,
  );
  assert.equal(luot.tatCa.length, 0, "cửa (b) chặn rồi mà API vẫn được gọi");
  assert.equal(await demNhatKy("pos_ghi_bi_chan"), truoc + 1);
});

// ─── CỬA (c) — compare-and-set trên trạng thái LIVE ──────────────────────────

test("C1 · thiếu vế `tu` → chặn ngay, không có chuyện ghi mù", async () => {
  const { nap, luot } = napGia(() => ({ than: { success: true } }));
  await assert.rejects(
    () =>
      ghiNguocTrangThai(
        pool,
        ctxHeThong(),
        { market: "GiaLap", donId: 111, sang: 12, teamId: CHUA_PHAN },
        { nap, env: MO },
      ),
    /thiếu vế `tu`/,
  );
  assert.equal(luot.tatCa.length, 0);
});

test("C2 · live ≠ `tu` → LoiTrangThaiDaDoi · GET 1 · PUT 0 · nhat_ky bị chặn +1", async () => {
  const truoc = await demNhatKy("pos_ghi_bi_chan");
  // Sale vừa đổi tay: đơn đang ở 1 (submitted) chứ không còn ở 0 như hệ tưởng.
  const { nap, luot } = napGia((pt) =>
    pt === "GET"
      ? { than: { data: { id: 111, status: 1, status_name: "submitted" } } }
      : { than: { success: true } },
  );
  await assert.rejects(
    () =>
      ghiNguocTrangThai(
        pool,
        ctxHeThong(),
        { market: "GiaLap", donId: 111, tu: 0, sang: 12, teamId: CHUA_PHAN },
        { nap, env: MO },
      ),
    (e) => e instanceof LoiTrangThaiDaDoi && e.live === 1 && e.tu === 0,
  );
  assert.equal(luot.GET, 1);
  assert.equal(
    luot.PUT,
    0,
    "trạng thái đã đổi mà PUT vẫn bay đi — ghi đè việc sale làm",
  );
  assert.equal(await demNhatKy("pos_ghi_bi_chan"), truoc + 1);
});

// ─── CỬA (d) — nhật ký hai pha ───────────────────────────────────────────────

test("D1 · MẤT PHẢN HỒI sau PUT → dòng bắt-đầu MỒ CÔI (bắt đầu +1, kết quả +0)", async () => {
  const bd = await demNhatKy("pos_ghi_bat_dau");
  const kq = await demNhatKy("pos_ghi_ket_qua");
  const { nap, luot } = napGia(
    (pt) =>
      pt === "GET"
        ? { than: { data: { id: 222, status: 0, status_name: "new" } } }
        : new Error("socket hang up"), // KHÔNG có phản hồi — không biết lệnh có tới nơi
  );
  await assert.rejects(
    () =>
      ghiNguocTrangThai(
        pool,
        ctxHeThong(),
        { market: "GiaLap", donId: 222, tu: 0, sang: 12, teamId: CHUA_PHAN },
        { nap, env: MO },
      ),
    /POS không phản hồi/,
  );
  assert.equal(luot.PUT, 1);
  assert.equal(await demNhatKy("pos_ghi_bat_dau"), bd + 1);
  assert.equal(
    await demNhatKy("pos_ghi_ket_qua"),
    kq,
    "có dòng kết-quả trong khi POS chưa hề trả lời — mất luôn khả năng phát hiện mồ côi",
  );
});

test("D2 · POS TỪ CHỐI có phản hồi → ghi ĐỦ hai pha (kết cục biết rõ, không phải mồ côi)", async () => {
  const bd = await demNhatKy("pos_ghi_bat_dau");
  const kq = await demNhatKy("pos_ghi_ket_qua");
  const { nap } = napGia((pt) =>
    pt === "GET"
      ? { than: { data: { id: 223, status: 0, status_name: "new" } } }
      : { ok: false, status: 422, than: { message: "khong doi duoc" } },
  );
  await assert.rejects(
    () =>
      ghiNguocTrangThai(
        pool,
        ctxHeThong(),
        { market: "GiaLap", donId: 223, tu: 0, sang: 12, teamId: CHUA_PHAN },
        { nap, env: MO },
      ),
    /HTTP 422/,
  );
  assert.equal(await demNhatKy("pos_ghi_bat_dau"), bd + 1);
  assert.equal(await demNhatKy("pos_ghi_ket_qua"), kq + 1);
});

test("D3 · lượt CHO QUA thật: GET 1 · PUT 1 · hai pha đủ · gương don_hang theo POS", async () => {
  const maPos = `${SHOP}:333`;
  await pool.query(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos)
     VALUES ($1,$2,'trang_ban_hang','moi_tu_pos','0')`,
    [CHUA_PHAN, maPos],
  );
  const bd = await demNhatKy("pos_ghi_bat_dau");
  const kq = await demNhatKy("pos_ghi_ket_qua");
  const { nap, luot } = napGia((pt) =>
    pt === "GET"
      ? { than: { data: { id: 333, status: 0, status_name: "new" } } }
      : { than: { success: true, data: { id: 333, status: 12 } } },
  );
  const r = await ghiNguocTrangThai(
    pool,
    ctxHeThong(),
    { market: "GiaLap", donId: 333, tu: 0, sang: 12, teamId: CHUA_PHAN },
    { nap, env: MO },
  );
  assert.equal(r.maPos, maPos);
  assert.equal(r.nhanSang, "wait_print");
  assert.equal(luot.GET, 1);
  assert.equal(luot.PUT, 1);
  assert.equal(await demNhatKy("pos_ghi_bat_dau"), bd + 1);
  assert.equal(await demNhatKy("pos_ghi_ket_qua"), kq + 1);
  const d = await pool.query(
    "SELECT trang_thai_he, trang_thai_pos FROM don_hang WHERE ma_pos = $1",
    [maPos],
  );
  assert.equal(d.rows[0].trang_thai_pos, "12");
  assert.equal(
    d.rows[0].trang_thai_he,
    "moi_tu_pos",
    "cửa POS đụng vào cột của L3-M1",
  );
});

test("D4 · chiều VỀ (12→0) chạy được — nghiệm thu 02 đòi «đúng cả hai lần»", async () => {
  const { nap, luot } = napGia((pt) =>
    pt === "GET"
      ? { than: { data: { id: 333, status: 12, status_name: "wait_print" } } }
      : { than: { success: true } },
  );
  const r = await ghiNguocTrangThai(
    pool,
    ctxHeThong(),
    { market: "GiaLap", donId: 333, tu: 12, sang: 0, teamId: CHUA_PHAN },
    { nap, env: MO },
  );
  assert.equal(r.nhanTu, "wait_print");
  assert.equal(r.nhanSang, "new");
  assert.equal(luot.PUT, 1);
});

// ─── RÀO TEAM (thừa kế L0-M2) ───────────────────────────────────────────────

test("T1 · không ctx → LoiThieuBoiCanhTeam, KHÔNG chạm mạng", async () => {
  const { nap, luot } = napGia(() => ({ than: { success: true } }));
  await assert.rejects(
    () =>
      ghiNguocTrangThai(
        pool,
        null,
        { market: "GiaLap", donId: 111, tu: 0, sang: 12 },
        { nap, env: MO },
      ),
    LoiThieuBoiCanhTeam,
  );
  assert.equal(luot.tatCa.length, 0);
});

test("T2 · ctxHeThong thiếu teamId → LoiThieuBoiCanhTeam (job nền không có team mặc định)", async () => {
  const { nap } = napGia(() => ({ than: { success: true } }));
  await assert.rejects(
    () =>
      ghiNguocTrangThai(
        pool,
        ctxHeThong(),
        { market: "GiaLap", donId: 111, tu: 0, sang: 12 },
        { nap, env: MO },
      ),
    LoiThieuBoiCanhTeam,
  );
});

test("T3 · ctx người dùng trỏ team KỸ THUẬT → bị chặn (rào N2 của L0-M2)", async () => {
  const { nap } = napGia(() => ({ than: { success: true } }));
  await assert.rejects(
    () =>
      ghiNguocTrangThai(
        pool,
        { teamId: CHUA_PHAN, nguoiDungId: null },
        { market: "GiaLap", donId: 111, tu: 0, sang: 12 },
        { nap, env: MO },
      ),
    LoiThieuBoiCanhTeam,
  );
});

test("T4 · ctx team 1 truyền tay teamId=2 → LoiXuyenTeam + 1 dòng nhat_ky", async () => {
  const truoc = await demNhatKy("chan_xuyen_team");
  await assert.rejects(
    () =>
      ghiNguocTrangThai(
        pool,
        { teamId: 1, nguoiDungId: null },
        { market: "GiaLap", donId: 111, tu: 0, sang: 12, teamId: 2 },
        { nap: napGia(() => ({})).nap, env: MO },
      ),
    LoiXuyenTeam,
  );
  assert.equal(await demNhatKy("chan_xuyen_team"), truoc + 1);
});

// ─── KẾT NỐI POS + CỬA GHI CSDL ─────────────────────────────────────────────

test("K1 · khoá POS trong CSDL là bao thư MÃ HOÁ, giải ra đúng nguyên văn", async () => {
  const r = await pool.query(
    "SELECT api_key_ma FROM ket_noi_pos WHERE market = 'GiaLap'",
  );
  assert.ok(r.rows[0].api_key_ma.startsWith("v1."));
  assert.ok(
    !r.rows[0].api_key_ma.includes("khoa-gia-lap"),
    "khoá nằm nguyên văn trong cột",
  );
  const kn = await layKetNoi(pool, ctxHeThong(), "GiaLap", {
    teamId: CHUA_PHAN,
    env: KHOA,
  });
  assert.equal(kn.apiKey, "khoa-gia-lap");
  assert.equal(kn.shopId, SHOP);
});

test("K2 · CHECK tầng CSDL chặn khoá ghi nguyên văn (rào thứ hai, không chỉ ở code)", async () => {
  await assert.rejects(
    () =>
      pool.query(
        "INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma) VALUES ($1,'Tho','1','khoa-tran-trui')",
        [CHUA_PHAN],
      ),
    /check/i,
  );
});

test("K3 · thị trường không có kết nối → LoiThieuKetNoiPos (không trả null im lặng)", async () => {
  await assert.rejects(
    () =>
      layKetNoi(pool, ctxHeThong(), "KhongCo", {
        teamId: CHUA_PHAN,
        env: KHOA,
      }),
    LoiThieuKetNoiPos,
  );
});

test("K4 · cửa ghi CSDL của POS deny-by-default: bảng ngoài danh sách → Error", async () => {
  await assert.rejects(
    () =>
      suaTheoIdPos(pool, ctxHeThong(), {
        teamId: CHUA_PHAN,
        bang: "hoi_thoai",
        id: 1,
        duLieu: { psid: "x" },
        hanhDong: "thu",
      }),
    /BANG_POS_DUOC_GHI/,
  );
});

test("K5 · sửa dòng của team KHÁC → 0 dòng khớp, trả null (không rò dữ liệu)", async () => {
  const r = await pool.query(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos)
     VALUES (1,'khac:1','messenger','moi_tu_pos','0') RETURNING id`,
  );
  const kq = await suaTheoIdPos(pool, ctxHeThong(), {
    teamId: CHUA_PHAN,
    bang: "don_hang",
    id: r.rows[0].id,
    duLieu: { trang_thai_pos: "12" },
    hanhDong: "thu_xuyen_team",
  });
  assert.equal(kq, null);
  const sau = await pool.query(
    "SELECT trang_thai_pos FROM don_hang WHERE id = $1",
    [r.rows[0].id],
  );
  assert.equal(sau.rows[0].trang_thai_pos, "0", "sửa lọt sang team khác");
});
