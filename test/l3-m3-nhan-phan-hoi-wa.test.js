// L3-M3 · CẦU NỐI nhan-phan-hoi-wa — HUỶ NGAY khi khách trả lời (④#2), bốn nhánh đi
// TRỌN đường qua máy trạng thái L3-M1 (xac_nhan → CAS POS mock), ghi sự kiện so_ai.
//
// Chạy trên CSDL sandbox riêng (`aicloser_v3_test_l3m3nph`), tự dựng tự dọn. KHÔNG chạm
// `aicloser_v3` dev, KHÔNG chạm mạng (POS/WA đều spy tiêm qua deps).
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { ctxHeThong } from "../src/db/index.js";
import { apDung, MA_POS_CHO_IN } from "../src/orders/may-trang-thai.js";
import { datLichNhac, quetLichNhac } from "../src/orders/lich-nhac.js";
import { nhanPhanHoiWa } from "../src/orders/nhan-phan-hoi-wa.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
let teamA;

function spy(ra = { ok: true }) {
  const goi = [];
  const f = async (...a) => {
    goi.push(a);
    return typeof ra === "function" ? ra(...a) : ra;
  };
  f.goi = goi;
  f.dem = () => goi.length;
  return f;
}

async function taoKhach(team, so) {
  return (
    await q(
      "INSERT INTO khach (team_id, so_dien_thoai) VALUES ($1,$2) RETURNING id",
      [team, so],
    )
  ).rows[0].id;
}

async function toiDaGuiWa(opts = {}) {
  const khachId =
    opts.khachId ??
    (await taoKhach(
      opts.team ?? teamA,
      opts.so ?? `+9715${Math.floor(Math.random() * 1e8)}`,
    ));
  const don = await mot(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id)
     VALUES ($1,$2,'trang_ban_hang','moi_tu_pos','0',$3) RETURNING *`,
    [
      opts.team ?? teamA,
      opts.maPos ?? `9999:${Math.floor(Math.random() * 1e9)}`,
      khachId,
    ],
  );
  const ctx = ctxHeThong();
  for (const s of ["vao_may", "bat_dau_gui", "gui_xong"]) {
    await apDung(sb.pool, ctx, { donId: don.id, sukien: s });
  }
  return mot("SELECT * FROM don_hang WHERE id=$1", [don.id]);
}

async function demLichCho(donId) {
  const r = await q(
    "SELECT count(*)::int c FROM lich_nhac WHERE don_hang_id=$1 AND trang_thai='cho'",
    [donId],
  );
  return r.rows[0].c;
}

async function donSachHangDoiCho() {
  await q(
    "UPDATE lich_nhac SET trang_thai='da_huy', huy_ly_do='don_sach_test' WHERE trang_thai='cho'",
  );
}

before(async () => {
  sb = await dungSandbox("l3m3nph");
  teamA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
});
after(async () => {
  if (sb) await sb.don();
});

// ═══ ④#2 — HUỶ NGAY: khách trả lời giữa chừng → lịch bị huỷ TRONG CÙNG LƯỢT ═══════
// Cả BỐN nhánh (không chỉ xac_nhan/tu_choi) — 02 §L3 nói "trả lời giữa chừng", không
// giới hạn kiểu trả lời. nhanPhanHoi (L3-M1) chỉ tự huỷ ở xac_nhan/tu_choi (chốt, có
// gate riêng l3-m1.sh ④c); nhanPhanHoiWa bù thêm hai nhánh còn lại — xem ghi chú trong
// src/orders/nhan-phan-hoi-wa.js.
for (const [text, ketQuaCho] of [
  ["Yes, I confirm my order", "xac_nhan"],
  ["No, please cancel it", "tu_choi"],
  ["Please change my address", "doi_sua"],
  ["hmm what do you mean", "khong_ro"],
]) {
  test(`N1(${ketQuaCho}) · HUỶ NGAY — giữa lần 2 và 3, khách trả lời "${ketQuaCho}" → lịch active=0 NGAY, quét sau đó gửi 0`, async () => {
    await donSachHangDoiCho();
    const don = await toiDaGuiWa();
    let luc = new Date("2026-02-01T00:00:00Z");
    const guiTinMauSpy = spy();

    // Đưa đơn qua ĐÚNG 2 lần nhắc (lần 3 còn TREO — 'cho') trước khi khách trả lời.
    await quetLichNhac(
      sb.pool,
      { now: () => luc },
      { guiTinMau: guiTinMauSpy },
    ); // đặt lịch 1
    for (let i = 0; i < 2; i++) {
      luc = new Date(luc.getTime() + 2 * 60 * 60_000);
      await quetLichNhac(
        sb.pool,
        { now: () => luc },
        { guiTinMau: guiTinMauSpy },
      );
    }
    assert.equal(
      guiTinMauSpy.dem(),
      2,
      "phải đã gửi đúng 2 lần trước khi khách trả lời",
    );
    assert.equal(
      await demLichCho(don.id),
      1,
      "lịch lần 3 phải đang TREO ('cho')",
    );

    // Khách trả lời GIỮA CHỪNG — huỷ phải xảy ra TRONG CÙNG LƯỢT gọi này, không chờ job.
    const deps =
      ketQuaCho === "xac_nhan"
        ? { ghiNguocPos: spy({ ok: true }), docLivePos: async () => 0 }
        : {};
    await nhanPhanHoiWa(sb.pool, ctxHeThong(), { donId: don.id, text }, deps);

    assert.equal(
      await demLichCho(don.id),
      0,
      "lịch active phải = 0 NGAY sau nhanPhanHoiWa, KHÔNG chờ job quét",
    );

    // Job quét sau đó KHÔNG được gửi thêm gì (đơn đã rời da_gui_wa; lịch cũng đã huỷ).
    luc = new Date(luc.getTime() + 2 * 60 * 60_000);
    await quetLichNhac(
      sb.pool,
      { now: () => luc },
      { guiTinMau: guiTinMauSpy },
    );
    assert.equal(
      guiTinMauSpy.dem(),
      2,
      "guiTinMau SAU ĐÓ phải vẫn = 2 (không gửi thêm)",
    );
  });
}

// ═══ ④#3 vế "nối L3-M1" — xac_nhan đi TRỌN tới CAS POS mock ═════════════════════

test("N2 · xac_nhan đi trọn tới CAS POS mock — day_cho_in, posGhi=1, CAS {tu:live,sang:12}", async () => {
  const don = await toiDaGuiWa();
  const ghiNguocPosSpy = spy({ ok: true });
  const kq = await nhanPhanHoiWa(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, text: "Yes, confirm the order please" },
    { ghiNguocPos: ghiNguocPosSpy, docLivePos: async () => 0 },
  );
  assert.equal(kq.ket_qua, "xac_nhan");
  assert.equal(kq.sang, "day_cho_in");
  assert.equal(kq.posGhi, 1);
  assert.equal(ghiNguocPosSpy.dem(), 1);
  const cas = ghiNguocPosSpy.goi[0][2];
  assert.equal(cas.tu, 0);
  assert.equal(cas.sang, MA_POS_CHO_IN);
  const donSau = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [
    don.id,
  ]);
  assert.equal(donSau.trang_thai_he, "day_cho_in");
});

test("N3 · tu_choi → dong, KHÔNG chạm POS (posGhi=0)", async () => {
  const don = await toiDaGuiWa();
  const ghiNguocPosSpy = spy();
  const kq = await nhanPhanHoiWa(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, text: "No, cancel it please" },
    { ghiNguocPos: ghiNguocPosSpy, docLivePos: async () => 0 },
  );
  assert.equal(kq.ket_qua, "tu_choi");
  assert.equal(kq.sang, "dong");
  assert.equal(kq.posGhi, 0);
  assert.equal(ghiNguocPosSpy.dem(), 0);
});

for (const [text, ketQuaCho, tienToLyDo] of [
  ["Please edit my delivery address", "doi_sua", "doi_sua:"],
  ["what does this mean", "khong_ro", "khong_ro:"],
]) {
  test(`N4(${ketQuaCho}) · → cho_sale + viec_can_xu_ly lý do "${tienToLyDo}…", huyLichNhacThem populated`, async () => {
    const don = await toiDaGuiWa();
    const kq = await nhanPhanHoiWa(
      sb.pool,
      ctxHeThong(),
      { donId: don.id, text },
      {},
    );
    assert.equal(kq.ket_qua, ketQuaCho);
    assert.equal(kq.sang, "cho_sale");
    assert.ok(
      kq.huyLichNhacThem,
      "nhanPhanHoiWa phải TỰ bù gọi huyLichNhac cho nhánh này",
    );
    const v = await mot(
      "SELECT ly_do_day FROM viec_can_xu_ly WHERE don_hang_id=$1",
      [don.id],
    );
    assert.ok(
      v.ly_do_day.startsWith(tienToLyDo),
      `lý do phải bắt đầu bằng "${tienToLyDo}", thật="${v.ly_do_day}"`,
    );
  });
}

// ═══ Ghi sự kiện so_ai ══════════════════════════════════════════════════════════

test("N5 · ghi đúng 1 dòng so_ai (loai=other_bot, ma_model vắng-mặt-tường-minh, lane=doc_y_wa)", async () => {
  const don = await toiDaGuiWa();
  const kq = await nhanPhanHoiWa(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, text: "No, cancel please" },
    {},
  );
  assert.equal(kq.soAiGhi, true);
  const row = await mot("SELECT * FROM so_ai WHERE id=$1", [kq.soAiId]);
  assert.equal(row.loai, "other_bot");
  assert.equal(row.ma_model, "khong-goi-model");
  assert.equal(row.lane, "doc_y_wa");
  assert.equal(row.trang_thai, "tu_choi");
  assert.equal(row.nguon_tep, "lich_nhac:phan_hoi");
  assert.equal(String(row.nguon_dong), String(don.id));
});

test("N6 · neo idempotent so_ai (nguon_tep, nguon_dong) — INSERT trùng anchor bị nuốt êm (ON CONFLICT DO NOTHING)", async () => {
  const don = await toiDaGuiWa();
  await nhanPhanHoiWa(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, text: "No, cancel please" },
    {},
  );
  const truoc = await q(
    "SELECT count(*)::int c FROM so_ai WHERE nguon_tep=$1 AND nguon_dong=$2",
    ["lich_nhac:phan_hoi", don.id],
  );
  assert.equal(truoc.rows[0].c, 1);
  // Mô phỏng một lượt GHI TRÙNG anchor (vd webhook redelivery) bằng đúng câu INSERT mà
  // nhan-phan-hoi-wa.js dùng — phải KHÔNG ném lỗi UNIQUE VIOLATION, và KHÔNG đẻ dòng thứ hai.
  await q(
    `INSERT INTO so_ai (team_id, xay_ra_luc, loai, ma_model, lane, trang_thai, du_lieu, nguon_tep, nguon_dong)
     VALUES ($1, now(), 'other_bot', 'khong-goi-model', 'doc_y_wa', 'tu_choi', '{}'::jsonb, $2, $3)
     ON CONFLICT (nguon_tep, nguon_dong) DO NOTHING`,
    [teamA, "lich_nhac:phan_hoi", don.id],
  );
  const sau = await q(
    "SELECT count(*)::int c FROM so_ai WHERE nguon_tep=$1 AND nguon_dong=$2",
    ["lich_nhac:phan_hoi", don.id],
  );
  assert.equal(
    sau.rows[0].c,
    1,
    "vẫn đúng 1 dòng — không nhân đôi khi anchor trùng",
  );
});

// ═══ Interface đầu vào ═══════════════════════════════════════════════════════════

test("N7 · text rỗng/không khớp → khong_ro, đơn vẫn đi trọn nhánh cho_sale, KHÔNG ném", async () => {
  const don = await toiDaGuiWa();
  const kq = await nhanPhanHoiWa(
    sb.pool,
    ctxHeThong(),
    { donId: don.id, text: "" },
    {},
  );
  assert.equal(kq.ket_qua, "khong_ro");
  assert.equal(kq.sang, "cho_sale");
});
