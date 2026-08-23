// PHIẾU L3-M4 — HÀNG CHỜ TẠO ĐƠN: cửa ① đủ trường · cửa ② tiền · cửa ③ NĂM nguồn.
//
// Nguyên tắc bộ ca: mỗi nguồn của cửa ③ được bật DƯƠNG **một mình** (bốn nguồn kia phải
// sạch) rồi đo đúng hai vế — (1) `cua_kiem` khai đúng nguồn nào bắt, (2) **cửa ĐÓNG**.
// Đo một vế thôi là bẫy án lệ #29: một cửa «đọc ra là trùng» mà vẫn cho đơn đi tiếp thì
// hai kiện COD đã bay đi rồi, còn bộ ca vẫn xanh.
//
// Sandbox riêng, tự dựng tự dọn — KHÔNG chạm `aicloser_v3` dev. `nap` (fetch) TIÊM nên
// không lượt nào chạm POS thật; `kiemTrung` chạy THẬT trên dữ liệu sandbox (mock CHỈ cho
// ca-lỗi, đúng chữ phiếu).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { dungSandbox } from "../db/sandbox.js";
import { maHoa } from "../db/khoa.js";
import { ctxHeThong, LoiThieuBoiCanhTeam } from "../src/db/index.js";
import {
  vaoHangCho,
  loai,
  docHangCho,
  chayNamCua,
  cua1DuTruong,
  cua2Tien,
  nguonA_soAi,
  nguonB_posSong,
  nguonC_trangThaiHoiThoai,
  nguonD_fbCommerce,
  nguonE_kiemTrung,
  traMarketCuaPage,
  chuanHoaHoSo,
  TRUONG_BAT_BUOC,
  NGUON_CHONG_TRUNG,
  KET_NGUON,
  FB_COMMERCE,
  LoiHangChoDaXuLy,
} from "../src/orders/hang-cho.js";

const KHOA = { V3_KHOA_MA_HOA: "b".repeat(64) }; // KHÔNG đụng .env thật
const SHOP = "9994001";
const MARKET = "GiaLapL3M4";
let sb;
let pool;
let TEAM;
let pageId;
let pageText;

const q = (sql, p) => pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
const ctx = () => ctxHeThong();

/** `nap` giả — trả một trang đơn POS. Đếm được số lượt gọi. */
function napDon(dsDon = [], { nem = null } = {}) {
  const f = async () => {
    f.dem += 1;
    if (nem) throw nem;
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ data: dsDon, total_entries: dsDon.length }),
    };
  };
  f.dem = 0;
  return f;
}

async function taoHoiThoai({ psid, trangThai = "SELLING", aiNoi = "" }) {
  const h = await mot(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu, ai_noi_gi)
     VALUES ($1,$2,$3,$4,'AI',$5) RETURNING *`,
    [TEAM, pageId, psid, trangThai, aiNoi],
  );
  return h;
}

/** Một dòng `tin_cho_xu_ly` — nguồn (d) đọc nội dung hội thoại từ đây. */
async function taoTin({ psid, convId, noiDung = "ok deal", msgId = null }) {
  return mot(
    `INSERT INTO tin_cho_xu_ly (team_id, page_id, psid, conv_id, msg_id, noi_dung, trang_thai)
     VALUES ($1,$2,$3,$4,$5,$6,'xong') RETURNING *`,
    [
      TEAM,
      pageText,
      psid,
      convId,
      msgId ?? `m${Math.floor(Math.random() * 1e9)}`,
      noiDung,
    ],
  );
}

const HO_SO_DU = {
  ten: "Ali Test",
  sdt: "+971500000001",
  dia_chi: "Street 1",
  thanh_pho: "Dubai",
  so_luong: 2,
  tong_tien: 150,
  tien_te: "AED",
  san_pham_ma: `${SHOP}:777`,
  kho_hang: "kho-1",
};

before(async () => {
  sb = await dungSandbox("l3m4hangcho");
  pool = sb.pool;
  TEAM = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  pageText = "555000111222";
  const p = await mot(
    `INSERT INTO page (team_id, page_id, ten, thi_truong, pos_shop_id)
     VALUES ($1,$2,'Page L3M4','KhongKhopMarket',$3) RETURNING *`,
    [TEAM, pageText, SHOP],
  );
  pageId = p.id;
  await q(
    "INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma) VALUES ($1,$2,$3,$4)",
    [TEAM, MARKET, SHOP, maHoa("khoa-gia-lap", KHOA)],
  );
});
after(async () => {
  if (sb) await sb.don();
});

// ═══ A · CỬA ① — MẪU ĐỦ TRƯỜNG ═══════════════════════════════════════════════

test("A1 · cửa ① liệt kê ĐÚNG TÊN trường thiếu (không chỉ true/false)", () => {
  assert.deepEqual(TRUONG_BAT_BUOC, [
    "ten",
    "sdt",
    "dia_chi",
    "so_luong",
    "tong_tien",
  ]);
  const du = cua1DuTruong(chuanHoaHoSo(HO_SO_DU));
  assert.equal(du.qua, true);
  assert.deepEqual(du.thieu_truong, []);
  const thieu = cua1DuTruong(
    chuanHoaHoSo({ name: "A", qty: 1, total_price: 10 }),
  );
  assert.equal(thieu.qua, false);
  // RF-9 (VA-R2): `total_price` khuôn cũ là đơn vị LỚN, KHÔNG có tệ ⇒ không quy được
  // sang đơn vị nhỏ ⇒ `tong_tien` null = THIẾU (mù có nói ra), giữ ở `tong_tien_lon`.
  assert.deepEqual(thieu.thieu_truong, ["sdt", "dia_chi", "tong_tien"]);
  assert.equal(
    chuanHoaHoSo({ name: "A", qty: 1, total_price: 10 }).tong_tien_lon,
    10,
  );
  // Có tệ ⇒ quy ĐÚNG MỘT LẦN theo HE_SO_TE (AED ×100 · KWD ×1000); tên cột v3 giữ nguyên.
  assert.equal(chuanHoaHoSo({ total_price: 10, currency: "AED" }).tong_tien, 1000);
  assert.equal(chuanHoaHoSo({ total_price: 10, currency: "KWD" }).tong_tien, 10000);
  assert.equal(chuanHoaHoSo({ tong_tien: 1000, tien_te: "AED" }).tong_tien, 1000);
  // 0 và "" là THIẾU, không phải «có giá trị» — số 0 lọt qua là một đơn 0 đồng.
  assert.deepEqual(
    cua1DuTruong(chuanHoaHoSo({ ...HO_SO_DU, so_luong: 0, tong_tien: 0 }))
      .thieu_truong,
    ["so_luong", "tong_tien"],
  );
});

test("A2 · thiếu trường VẪN vào hàng chờ, gắn thieu_truong (không rơi im lặng)", async () => {
  const h = await taoHoiThoai({ psid: "psA2" });
  await taoTin({ psid: "psA2", convId: "convA2" });
  const kq = await vaoHangCho(
    pool,
    ctx(),
    {
      hoiThoaiId: h.id,
      teamId: TEAM,
      hoSo: { name: "Chi Thieu", qty: 1, total_price: 10 },
      convId: "convA2",
      tinId: 900001,
    },
    { nap: napDon([]) },
  );
  const dong = await docHangCho(pool, ctx(), {
    hangChoId: kq.id,
    teamId: TEAM,
  });
  assert.equal(dong.trang_thai, "cho_duyet"); // ĐÃ VÀO, không bị nuốt
  assert.deepEqual(dong.cua_kiem.cong["1_du_truong"].thieu_truong, [
    "sdt",
    "dia_chi",
    "tong_tien", // RF-9: total_price khuôn cũ không tệ ⇒ chưa quy được ⇒ thiếu
  ]);
  assert.equal(dong.cua_kiem.qua_het, false);
  assert.ok(dong.cua_kiem.chan_vi.some((x) => x.startsWith("cua1:")));
});

// ═══ B · CỬA ② — CỬA TIỀN ════════════════════════════════════════════════════

test("B1 · goi_gia RỖNG → unknown và ĐÓNG (không đọc thành «sạch»)", async () => {
  const kq = await cua2Tien(pool, {
    teamId: TEAM,
    pageId,
    duLieu: chuanHoaHoSo(HO_SO_DU),
  });
  assert.equal(kq.qua, false);
  assert.equal(kq.ket, KET_NGUON.UNKNOWN);
  assert.equal(kq.ly_do, "unknown_chua_co_bang_gia");
  assert.deepEqual(kq.bang_gia, []);
});

test("B2 · seed 1 goi_gia khớp → cửa MỞ; lệch/nhiều gói → ĐÓNG đúng tên", async () => {
  const sp = await mot(
    "INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,'SP') RETURNING id",
    [TEAM, pageId, `${SHOP}:777`],
  );
  // ⚠️ DỌN TRONG `finally`: ca này là ca DUY NHẤT của file có bảng giá. Dọn ở cuối thân
  // hàm thì một assert đỏ sẽ để `goi_gia` ở lại và làm ĐỎ LÂY các ca sau (đúng bẫy
  // «nhiễu thứ tự test trên CSDL dùng chung» — đã dính một lượt khi viết bộ ca này).
  try {
    await q(
      "INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,2,150,'AED')",
      [TEAM, sp.id],
    );
    await doB2(sp);
  } finally {
    await q("DELETE FROM goi_gia WHERE team_id=$1", [TEAM]);
    await q("DELETE FROM san_pham WHERE id=$1", [sp.id]);
  }
});

async function doB2(sp) {
  const mo = await cua2Tien(pool, {
    teamId: TEAM,
    pageId,
    duLieu: chuanHoaHoSo(HO_SO_DU),
  });
  assert.equal(mo.qua, true, JSON.stringify(mo));
  assert.equal(mo.ly_do, "khop_dung_mot_goi");

  const lech = await cua2Tien(pool, {
    teamId: TEAM,
    pageId,
    duLieu: chuanHoaHoSo({ ...HO_SO_DU, tong_tien: 151 }),
  });
  assert.equal(lech.qua, false);
  assert.equal(lech.ly_do, "lech_bang_gia");

  // Cùng giá, khác số lượng ⇒ không khớp gói của SL đó (không "gần đúng là được").
  const saiSl = await cua2Tien(pool, {
    teamId: TEAM,
    pageId,
    duLieu: chuanHoaHoSo({ ...HO_SO_DU, so_luong: 3 }),
  });
  assert.equal(saiSl.qua, false);
  assert.equal(saiSl.ly_do, "lech_bang_gia");

  // Hai gói cùng khớp (giá trùng, khác tệ, lượt hỏi không khai tệ) ⇒ ĐÓNG, không chọn bừa.
  await q(
    "INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,5,150,'SAR')",
    [TEAM, sp.id],
  );
  const nhap = await cua2Tien(pool, {
    teamId: TEAM,
    pageId,
    duLieu: chuanHoaHoSo({ ...HO_SO_DU, so_luong: null, tien_te: "" }),
  });
  assert.equal(nhap.qua, false);
  assert.equal(nhap.ly_do, "nhieu_goi_cung_khop");
}

// ═══ C · CỬA ③ — NĂM NGUỒN, MỖI NGUỒN DƯƠNG MỘT MÌNH ════════════════════════

test("C0 · danh sách nguồn = ĐÚNG NĂM tên (so DANH SÁCH với §7.3, không so số)", () => {
  assert.deepEqual(NGUON_CHONG_TRUNG, [
    "a_so_ai",
    "b_pos_song",
    "c_trang_thai_hoi_thoai",
    "d_fb_commerce",
    "e_kiem_trung",
  ]);
});

test("Ca · nguồn (a) sổ AI: có sự kiện order TRƯỚC ⇒ dương", async () => {
  await q(
    `INSERT INTO so_ai (team_id, xay_ra_luc, page_id, psid, loai, ma_model, nguon_tep, nguon_dong)
     VALUES ($1, now(), $2, 'psCa', 'order', 'khong-goi-model', 'tin_cho_xu_ly:order', 811)`,
    [TEAM, pageText],
  );
  const kq = await nguonA_soAi(pool, {
    teamId: TEAM,
    pageIdText: pageText,
    psid: "psCa",
    tinId: 812,
  });
  assert.equal(kq.ket, KET_NGUON.DUONG);
  assert.equal(kq.so_dong, 1);
});

test("Ca2 · nguồn (a) KHÔNG tự bắt sự kiện của CHÍNH lượt chốt này (neo tinId)", async () => {
  // Nhạc trưởng ghi so_ai(order) cho lượt này TRƯỚC khi gọi vaoHangCho. Không trừ ra thì
  // MỌI dòng hàng chờ tự báo mình trùng và tính năng chết ngay ngày đầu.
  const kq = await nguonA_soAi(pool, {
    teamId: TEAM,
    pageIdText: pageText,
    psid: "psCa",
    tinId: 811,
  });
  assert.equal(kq.ket, KET_NGUON.SACH);
  assert.equal(kq.so_dong, 0);
});

test("Cb · nguồn (b) POS SỐNG: đơn tay CHƯA quét về gương vẫn bị bắt", async () => {
  const truoc = await mot(
    "SELECT count(*)::int c FROM don_hang WHERE team_id=$1",
    [TEAM],
  );
  const kq = await nguonB_posSong(
    pool,
    ctx(),
    { teamId: TEAM, market: MARKET, convId: "convCb" },
    {
      env: KHOA,
      nap: napDon([{ id: 55501, status: 0, conversation_id: "convCb" }]),
    },
  );
  assert.equal(kq.ket, KET_NGUON.DUONG);
  assert.match(kq.chi_tiet, /55501/);
  const sau = await mot(
    "SELECT count(*)::int c FROM don_hang WHERE team_id=$1",
    [TEAM],
  );
  // GƯƠNG `don_hang` KHÔNG hề có đơn đó — đúng ca «sale tạo tay 09:00, docDon chưa quét».
  assert.equal(sau.c, truoc.c);
});

test("Cb2 · nguồn (b) POS ném timeout → unknown (cấm đọc thành «POS sạch»)", async () => {
  const kq = await nguonB_posSong(
    pool,
    ctx(),
    { teamId: TEAM, market: MARKET, convId: "convCb2" },
    { env: KHOA, nap: napDon([], { nem: new Error("socket hang up") }) },
  );
  assert.equal(kq.ket, KET_NGUON.UNKNOWN);
  assert.match(kq.chi_tiet, /hỏi POS hỏng/);
});

test("Cb3 · nguồn (b) không tra được market / thiếu conv_id → unknown", async () => {
  const khongMarket = await nguonB_posSong(
    pool,
    ctx(),
    { teamId: TEAM, market: null, convId: "x" },
    { env: KHOA, nap: napDon([]) },
  );
  assert.equal(khongMarket.ket, KET_NGUON.UNKNOWN);
  const khongConv = await nguonB_posSong(
    pool,
    ctx(),
    { teamId: TEAM, market: MARKET, convId: null },
    { env: KHOA, nap: napDon([]) },
  );
  assert.equal(khongConv.ket, KET_NGUON.UNKNOWN);
});

test("Cb4 · nguồn (b) đơn của hội thoại nhưng ĐÃ HUỶ/HOÀN ⇒ sạch (khuôn cũ)", async () => {
  const kq = await nguonB_posSong(
    pool,
    ctx(),
    { teamId: TEAM, market: MARKET, convId: "convCb4" },
    {
      env: KHOA,
      nap: napDon([{ id: 5, status: 6, conversation_id: "convCb4" }]),
    },
  );
  assert.equal(kq.ket, KET_NGUON.SACH);
});

test("Cc · nguồn (c) hội thoại POST_SALE ⇒ dương; khai RÕ vế thẻ chưa có cột", () => {
  const duong = nguonC_trangThaiHoiThoai({ trang_thai: "POST_SALE" });
  assert.equal(duong.ket, KET_NGUON.DUONG);
  const sach = nguonC_trangThaiHoiThoai({ trang_thai: "SELLING" });
  assert.equal(sach.ket, KET_NGUON.SACH);
  // MÙ CÓ NÓI RA: v3 chưa có cột giữ thẻ số của hội thoại Pancake.
  assert.equal(duong.the_hoi_thoai, "chua_co_cot");
  assert.equal(sach.the_hoi_thoai, "chua_co_cot");
});

test("Cd · nguồn (d) FB Commerce: dấu hiệu trong tin ⇒ dương · 0 tin ⇒ unknown", async () => {
  const h = await taoHoiThoai({ psid: "psCd" });
  const rong = await nguonD_fbCommerce(pool, {
    teamId: TEAM,
    pageIdText: pageText,
    psid: "psCd",
    hoiThoai: h,
  });
  assert.equal(
    rong.ket,
    KET_NGUON.UNKNOWN,
    "0 tin đọc được ⇒ chưa nhìn thấy gì",
  );
  await taoTin({ psid: "psCd", convId: "convCd", noiDung: "hello" });
  const sach = await nguonD_fbCommerce(pool, {
    teamId: TEAM,
    pageIdText: pageText,
    psid: "psCd",
    hoiThoai: h,
  });
  assert.equal(sach.ket, KET_NGUON.SACH);
  await taoTin({
    psid: "psCd",
    convId: "convCd",
    noiDung: "You have placed an order, thanks",
  });
  const duong = await nguonD_fbCommerce(pool, {
    teamId: TEAM,
    pageIdText: pageText,
    psid: "psCd",
    hoiThoai: h,
  });
  assert.equal(duong.ket, KET_NGUON.DUONG);
  // Tiếng Ả Rập cũng phải bắt (thị trường chính của dự án).
  await taoTin({ psid: "psCdAr", convId: "cAr", noiDung: "رقم الطلب 12345" });
  const ar = await nguonD_fbCommerce(pool, {
    teamId: TEAM,
    pageIdText: pageText,
    psid: "psCdAr",
    hoiThoai: {},
  });
  assert.equal(ar.ket, KET_NGUON.DUONG);
});

test("Cd2 · luật FB_COMMERCE là BẢN SONG SINH — neo nguyên văn với order-bridge.js", () => {
  const goc = fs.readFileSync("src/order-bridge.js", "utf8");
  const dong = goc.split("\n").find((l) => l.startsWith("const FB_COMMERCE ="));
  assert.ok(dong, "không tìm thấy dòng FB_COMMERCE trong src/order-bridge.js");
  const nguon = dong.slice(dong.indexOf("/"), dong.lastIndexOf("/i") + 2);
  assert.equal(
    nguon,
    FB_COMMERCE.toString(),
    "luật nhận diện FB Commerce đã TRÔI khỏi bản đang chạy — sửa một bên phải sửa cả hai",
  );
});

test("Ce · nguồn (e) kiemTrung chạy THẬT: bắt cặp trùng chéo hai luồng", async () => {
  const kh = await mot(
    "INSERT INTO khach (team_id, so_dien_thoai) VALUES ($1,'966501984606') RETURNING id",
    [TEAM],
  );
  await q(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id, san_pham_ma)
     VALUES ($1,$2,'trang_ban_hang','moi_tu_pos','0',$3,$4)`,
    [TEAM, `${SHOP}:68769`, kh.id, [`${SHOP}:777`]],
  );
  const kq = await nguonE_kiemTrung(
    pool,
    ctx(),
    {
      teamId: TEAM,
      duLieu: chuanHoaHoSo({ ...HO_SO_DU, sdt: "+966 50 198 4606" }),
    },
    {},
  );
  assert.equal(kq.ket, KET_NGUON.DUONG);
  assert.equal(kq.ly_do, "trung_khop_san_pham");
  assert.equal(kq.nguon_trung, "trang_ban_hang");
  await q("DELETE FROM don_hang WHERE khach_id=$1", [kh.id]);
  await q("DELETE FROM khach WHERE id=$1", [kh.id]);
});

test("Ce2 · nguồn (e) chưa có SĐT / kiemTrung ném → unknown, KHÔNG phải sạch", async () => {
  const chuaSo = await nguonE_kiemTrung(
    pool,
    ctx(),
    { teamId: TEAM, duLieu: chuanHoaHoSo({ ...HO_SO_DU, sdt: "" }) },
    {},
  );
  assert.equal(chuaSo.ket, KET_NGUON.UNKNOWN);
  assert.equal(chuaSo.ly_do, "chua_co_sdt");
  const nem = await nguonE_kiemTrung(
    pool,
    ctx(),
    { teamId: TEAM, duLieu: chuanHoaHoSo(HO_SO_DU) },
    {
      kiemTrung: async () => {
        throw new Error("CSDL đứt giữa chừng");
      },
    },
  );
  assert.equal(nem.ket, KET_NGUON.UNKNOWN);
  assert.match(nem.chi_tiet, /kiemTrung ném/);
});

test("C9 · năm nguồn SẠCH hết ⇒ cửa ③ mở; unknown một nguồn ⇒ ĐÓNG", async () => {
  const h = await taoHoiThoai({ psid: "psC9" });
  await taoTin({ psid: "psC9", convId: "convC9", noiDung: "ok i take 2" });
  const boiCanh = {
    teamId: TEAM,
    hoiThoai: h,
    pageId,
    pageIdText: pageText,
    psid: "psC9",
    convId: "convC9",
    market: MARKET,
    duLieu: chuanHoaHoSo(HO_SO_DU),
    tinId: 999,
  };
  const mo = await chayNamCua(pool, ctx(), boiCanh, {
    env: KHOA,
    nap: napDon([]),
  });
  assert.equal(
    mo.cong["3_chong_trung"].qua,
    true,
    JSON.stringify(mo.cong["3_chong_trung"].nguon),
  );
  // Cửa ② vẫn ĐÓNG vì bảng giá rỗng — đúng hiện trạng, và đó là lý do `qua_het` false.
  assert.equal(mo.qua_het, false);
  assert.deepEqual(mo.chan_vi, ["cua2:unknown_chua_co_bang_gia"]);

  const dong = await chayNamCua(pool, ctx(), boiCanh, {
    env: KHOA,
    nap: napDon([], { nem: new Error("timeout") }),
  });
  assert.equal(dong.cong["3_chong_trung"].qua, false);
  assert.deepEqual(dong.cong["3_chong_trung"].unknown, ["b_pos_song"]);
  assert.match(dong.cong["3_chong_trung"].ly_do, /^unknown_la_dong/);
});

// ═══ D · VÀO HÀNG CHỜ + NEO IDEMPOTENT ═══════════════════════════════════════

test("D1 · vaoHangCho ghi 1 dòng kèm ĐỦ NĂM KHOÁ cửa trong cua_kiem", async () => {
  const h = await taoHoiThoai({ psid: "psD1" });
  await taoTin({ psid: "psD1", convId: "convD1" });
  const kq = await vaoHangCho(
    pool,
    ctx(),
    {
      hoiThoaiId: h.id,
      teamId: TEAM,
      hoSo: HO_SO_DU,
      convId: "convD1",
      tinId: 700001,
    },
    { env: KHOA, nap: napDon([]) },
  );
  const dong = await docHangCho(pool, ctx(), {
    hangChoId: kq.id,
    teamId: TEAM,
  });
  // jsonb của Postgres KHÔNG giữ thứ tự khoá — so TẬP đã sắp, không so thứ tự lưu.
  assert.deepEqual(Object.keys(dong.cua_kiem.cong).sort(), [
    "1_du_truong",
    "2_tien",
    "3_chong_trung",
    "4_hang_cho",
    "5_tao_don",
  ]);
  assert.equal(dong.cua_kiem.cong["5_tao_don"].da_chay, false);
  assert.deepEqual(
    Object.keys(dong.cua_kiem.cong["3_chong_trung"].nguon).sort(),
    [...NGUON_CHONG_TRUNG].sort(),
  );
  assert.equal(dong.du_lieu_don.market, MARKET);
  assert.equal(dong.du_lieu_don.tin_id, "700001");
  const nk = await mot(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong='hang_cho_vao' AND doi_tuong_id=$1",
    [String(kq.id)],
  );
  assert.equal(nk.c, 1);
});

test("D2 · một TIN nhiều nhất MỘT dòng hàng chờ (worker thử lại không nhân đôi)", async () => {
  const h = await taoHoiThoai({ psid: "psD2" });
  await taoTin({ psid: "psD2", convId: "convD2" });
  const a = await vaoHangCho(
    pool,
    ctx(),
    { hoiThoaiId: h.id, teamId: TEAM, hoSo: HO_SO_DU, tinId: 700002 },
    { env: KHOA, nap: napDon([]) },
  );
  const b = await vaoHangCho(
    pool,
    ctx(),
    { hoiThoaiId: h.id, teamId: TEAM, hoSo: HO_SO_DU, tinId: 700002 },
    { env: KHOA, nap: napDon([]) },
  );
  assert.equal(b.daCo, true);
  assert.equal(b.id, a.id);
  const dem = await mot(
    "SELECT count(*)::int c FROM hang_cho_tao_don WHERE hoi_thoai_id=$1",
    [h.id],
  );
  assert.equal(dem.c, 1);
});

test("D3 · ctxHeThong KHÔNG kèm teamId ⇒ ném LoiThieuBoiCanhTeam (không trả rỗng)", async () => {
  await assert.rejects(
    () => vaoHangCho(pool, ctx(), { hoiThoaiId: 1, hoSo: HO_SO_DU }),
    LoiThieuBoiCanhTeam,
  );
});

test("D4 · traMarketCuaPage: khớp qua pos_shop_id, KHÔNG khớp qua nhãn thi_truong", async () => {
  const qua = await traMarketCuaPage(pool, {
    teamId: TEAM,
    posShopId: SHOP,
    thiTruong: "KhongKhopMarket",
  });
  assert.equal(qua.market, MARKET);
  assert.equal(qua.qua, "pos_shop_id");
  const mu = await traMarketCuaPage(pool, {
    teamId: TEAM,
    posShopId: null,
    thiTruong: "KhongKhopMarket",
  });
  assert.equal(mu.market, null);
});

// ═══ E · LOẠI ════════════════════════════════════════════════════════════════

test("E1 · loai đóng dòng + giữ lý do + ghi nhat_ky; loại lần hai bị chặn", async () => {
  const h = await taoHoiThoai({ psid: "psE1" });
  await taoTin({ psid: "psE1", convId: "convE1" });
  const kq = await vaoHangCho(
    pool,
    ctx(),
    { hoiThoaiId: h.id, teamId: TEAM, hoSo: HO_SO_DU, tinId: 700003 },
    { env: KHOA, nap: napDon([]) },
  );
  const ra = await loai(pool, ctx(), {
    hangChoId: kq.id,
    teamId: TEAM,
    lyDo: "khách nhắn lại là không mua nữa",
  });
  assert.equal(ra.dong.trang_thai, "tu_choi");
  assert.equal(
    ra.dong.cua_kiem.ket_thuc.ly_do,
    "khách nhắn lại là không mua nữa",
  );
  const nk = await mot(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong='hang_cho_loai' AND doi_tuong_id=$1",
    [String(kq.id)],
  );
  assert.equal(nk.c, 1);
  await assert.rejects(
    () =>
      loai(pool, ctx(), { hangChoId: kq.id, teamId: TEAM, lyDo: "lần hai" }),
    LoiHangChoDaXuLy,
  );
});

test("E2 · loai KHÔNG có lý do ⇒ ném (một dòng bỏ đi mà không ai biết vì sao)", async () => {
  await assert.rejects(
    () => loai(pool, ctx(), { hangChoId: 1, teamId: TEAM, lyDo: "  " }),
    /thiếu `lyDo`/,
  );
});

test("E3 · loai KHÔNG xoá dòng nào (luật 2 §0a) — dòng ở lại đếm được", async () => {
  const r = await mot(
    "SELECT count(*)::int c FROM hang_cho_tao_don WHERE trang_thai='tu_choi' AND team_id=$1",
    [TEAM],
  );
  assert.ok(r.c >= 1);
});

// ═══ F · CHỖ ĐẤU TRONG `src/chat/` — đo ĐƯỜNG ĐI, không đo hình dạng ═════════

test("F1 · handler v3: lượt bot CHỐT gọi vaoHangCho ⇒ hàng chờ +1 dòng THẬT", async () => {
  const { xuLyMotTin } = await import("../src/chat/handler-v3.js");
  const h = await taoHoiThoai({ psid: "psF1" });
  const tin = await mot(
    `INSERT INTO tin_cho_xu_ly (team_id, page_id, psid, conv_id, cust_id, msg_id, noi_dung, trang_thai)
     VALUES ($1,$2,'psF1','conv-F1','cust-F1','msg-F1','ok i take it','dang_xu') RETURNING *`,
    [TEAM, pageText],
  );
  const truoc = await mot(
    "SELECT count(*)::int c FROM hang_cho_tao_don WHERE hoi_thoai_id=$1",
    [h.id],
  );
  const kq = await xuLyMotTin(pool, tin, {
    layKb: () => ({ pageName: "P", config: {}, text: "kb", products: [] }),
    layModel: async () => ({ maModel: "mo-hinh-gia", nguon: "gia-lap" }),
    phanLoai: async () => ({ intent: "buy" }),
    lanNhanh: () => ({ handled: false }),
    kiemTinRa: () => ({ ok: true }),
    // Ép nhánh CHỐT ĐƠN: đúng cờ mà `tools.js:188` để lại cho nhạc trưởng.
    chayCloser: async ({ state }) => {
      state.closed = true;
      state.lastUsage = { calls: 1 };
      return "Cảm ơn anh, em chốt đơn nhé";
    },
    cua: {
      guiTin: async () => ({ ok: true }),
      guiAnh: async () => ({ ok: true }),
      ghiNote: async () => ({ ok: true }),
      gatThe: async () => ({ ok: true }),
    },
    depsHangCho: { env: KHOA, nap: napDon([]) },
    lichSu: [],
  });
  assert.equal(kq.ketQua, "xong");
  const sau = await q(
    "SELECT * FROM hang_cho_tao_don WHERE hoi_thoai_id=$1 ORDER BY id DESC",
    [h.id],
  );
  assert.equal(
    sau.rowCount - truoc.c,
    1,
    "chỗ đấu KHÔNG chạy — hàng chờ không tăng",
  );
  const dong = sau.rows[0];
  assert.equal(dong.du_lieu_don.tin_id, String(tin.id));
  assert.equal(dong.du_lieu_don.conv_id, "conv-F1");
  // Nguồn (a) KHÔNG được tự bắt sự kiện `so_ai(order)` mà chính lượt này vừa ghi.
  assert.equal(
    dong.cua_kiem.cong["3_chong_trung"].nguon.a_so_ai.ket,
    KET_NGUON.SACH,
    "nguồn (a) tự bắt chính lượt chốt của mình — mọi dòng sẽ báo trùng",
  );
  const sa = await mot(
    "SELECT count(*)::int c FROM so_ai WHERE nguon_tep='tin_cho_xu_ly:order' AND nguon_dong=$1",
    [Number(tin.id)],
  );
  assert.equal(sa.c, 1, "nhạc trưởng vẫn ghi so_ai(order) như trước");
});
