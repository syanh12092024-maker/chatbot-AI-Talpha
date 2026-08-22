// L3-M3 · HÀNG ĐỢI NHẮC — 2h × tối đa 5 lần, huỷ khi khách trả lời, rebind ctx per-đơn.
//
// Chạy trên CSDL sandbox riêng (`aicloser_v3_test_l3m3lich`), tự dựng tự dọn — cùng khuôn
// test/l3-m1-may-trang-thai.test.js. KHÔNG chạm `aicloser_v3` dev, KHÔNG chạm mạng (cửa
// WA là spy tiêm qua deps). Đồng hồ TIÊM qua deps.now — CẤM neo đồng hồ tường (skill
// tho-thi-cong án lệ #1): mọi test "tua giờ" dưới đây tự quản một biến `luc` rồi cộng dồn.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { ctxHeThong } from "../src/db/index.js";
import { apDung } from "../src/orders/may-trang-thai.js";
import {
  datLichNhac,
  quetLichNhac,
  taoHuyLichNhac,
  CACH_NHAC_MS,
  TRAN_NHAC,
  MAU_NHAC,
} from "../src/orders/lich-nhac.js";
import { MAU_XAC_NHAN } from "../src/orders/quet-don-moi.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
let teamA, teamB;

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

async function taoDon({ team = teamA, khachId = null, maPos = null } = {}) {
  return mot(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id)
     VALUES ($1,$2,'trang_ban_hang','moi_tu_pos','0',$3) RETURNING *`,
    [team, maPos ?? `9999:${Math.floor(Math.random() * 1e9)}`, khachId],
  );
}

async function taoKhach(team, so) {
  return (
    await q(
      "INSERT INTO khach (team_id, so_dien_thoai) VALUES ($1,$2) RETURNING id",
      [team, so],
    )
  ).rows[0].id;
}

/** Đưa một đơn tới `da_gui_wa` bằng CHÍNH máy trạng thái (không UPDATE tay). */
async function toiDaGuiWa(opts = {}) {
  const khachId =
    opts.khachId ??
    (await taoKhach(
      opts.team ?? teamA,
      opts.so ?? `+9715${Math.floor(Math.random() * 1e8)}`,
    ));
  const don = await taoDon({ ...opts, khachId });
  const ctx = ctxHeThong();
  for (const s of ["vao_may", "bat_dau_gui", "gui_xong"]) {
    await apDung(sb.pool, ctx, { donId: don.id, sukien: s });
  }
  return mot("SELECT * FROM don_hang WHERE id=$1", [don.id]);
}

async function lichCuaDon(donId) {
  return q(
    "SELECT id, lan_thu, trang_thai, hen_luc FROM lich_nhac WHERE don_hang_id=$1 ORDER BY lan_thu",
    [donId],
  ).then((r) => r.rows);
}

// `quetLichNhac` là job QUÉT TOÀN CSDL (đúng thiết kế thật — không scope theo test nào).
// File này dùng CHUNG một sandbox cho cả bộ ca (khuôn test/l3-m1-*), nên bất kỳ dòng
// `lich_nhac` nào một ca TRƯỚC để lại ở trạng thái 'cho' đều có thể bị MỘT LƯỢT QUÉT của
// ca SAU nhặt nhầm (đồng hồ giả của ca sau luôn "muộn hơn" hạn của ca trước). Dọn sạch
// hàng đợi trước mỗi ca có gọi quetLichNhac để mỗi ca chỉ thấy dữ liệu CỦA CHÍNH NÓ —
// cách ly test, không phải hành vi cần kiểm.
async function donSachHangDoiCho() {
  await q(
    "UPDATE lich_nhac SET trang_thai='da_huy', huy_ly_do='don_sach_test' WHERE trang_thai='cho'",
  );
}

before(async () => {
  sb = await dungSandbox("l3m3lich");
  teamA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  teamB = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
});
after(async () => {
  if (sb) await sb.don();
});

// ═══ ④#1 — ĐẶT LỊCH + CHU KỲ 2H×5 + HẾT LƯỢT ═══════════════════════════════════

test("L1 · datLichNhac tạo 1 dòng lich_nhac, hen_luc = now (TIÊM) + 2 giờ", async () => {
  const don = await toiDaGuiWa();
  const luc0 = new Date("2026-01-01T00:00:00Z");
  const ket = await datLichNhac(
    sb.pool,
    ctxHeThong(),
    { donId: don.id },
    { now: () => luc0 },
  );
  assert.equal(ket.tao, true);
  const rows = await lichCuaDon(don.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].lan_thu, 1);
  assert.equal(rows[0].trang_thai, "cho");
  assert.equal(
    new Date(rows[0].hen_luc).getTime(),
    luc0.getTime() + CACH_NHAC_MS,
    "hạn phải đúng now+2h, đo bằng đồng hồ TIÊM chứ không phải Date.now() thật",
  );
});

test("L2 · datLichNhac IDEMPOTENT — đơn đã có lịch 'cho' thì không tạo thêm (④#4)", async () => {
  const don = await toiDaGuiWa();
  const luc0 = new Date("2026-01-02T00:00:00Z");
  const k1 = await datLichNhac(
    sb.pool,
    ctxHeThong(),
    { donId: don.id },
    { now: () => luc0 },
  );
  const k2 = await datLichNhac(
    sb.pool,
    ctxHeThong(),
    { donId: don.id },
    { now: () => luc0 },
  );
  assert.equal(k1.tao, true);
  assert.equal(k2.tao, false);
  assert.equal(k2.lichId, k1.lichId);
  const rows = await lichCuaDon(don.id);
  assert.equal(rows.length, 1, "không được nhân đôi");
});

test("L3 · datLichNhac từ chối đơn KHÔNG ở da_gui_wa — không đoán, ném lỗi có tên", async () => {
  const don = await taoDon(); // còn ở moi_tu_pos
  await assert.rejects(
    () => datLichNhac(sb.pool, ctxHeThong(), { donId: don.id }, {}),
    /da_gui_wa/,
  );
});

test("L4 · quetLichNhac bước ① — đơn da_gui_wa CHƯA có lịch thì TỰ đặt lịch lần 1", async () => {
  await donSachHangDoiCho();
  const don = await toiDaGuiWa();
  const luc0 = new Date("2026-01-03T00:00:00Z");
  const kq = await quetLichNhac(
    sb.pool,
    { now: () => luc0 },
    { guiTinMau: spy() },
  );
  assert.equal(kq.moi, 1);
  const rows = await lichCuaDon(don.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].lan_thu, 1);
});

test("L5 · trọn 5 vòng — mẫu NHẮC riêng, tăng lan_thu, hết trần gọi bao_het_luot ĐÚNG 1 lần, KHÔNG lịch thứ 6", async () => {
  await donSachHangDoiCho();
  const don = await toiDaGuiWa();
  let luc = new Date("2026-01-04T00:00:00Z");
  const guiTinMauSpy = spy();

  // vòng 0: chưa có lịch nào ⇒ quét lần đầu tự đặt lịch lần 1 (bước ①), CHƯA gửi gì.
  let kq = await quetLichNhac(
    sb.pool,
    { now: () => luc },
    { guiTinMau: guiTinMauSpy },
  );
  assert.equal(kq.moi, 1);
  assert.equal(
    guiTinMauSpy.dem(),
    0,
    "vừa đặt lịch thì CHƯA tới hạn, chưa được gửi",
  );

  for (let lan = 1; lan <= TRAN_NHAC; lan++) {
    luc = new Date(luc.getTime() + CACH_NHAC_MS); // tua đúng 2 giờ
    kq = await quetLichNhac(
      sb.pool,
      { now: () => luc },
      { guiTinMau: guiTinMauSpy },
    );
    assert.equal(kq.daGui, 1, `vòng lan_thu=${lan}: phải gửi đúng 1 lượt`);
    if (lan === 1) {
      const thamSo = guiTinMauSpy.goi[0][2];
      assert.equal(
        thamSo.tenMau,
        MAU_NHAC,
        "mẫu NHẮC riêng, không phải mẫu xác nhận",
      );
      assert.notEqual(MAU_NHAC, MAU_XAC_NHAN, "hai mẫu phải KHÁC NHAU (④#1)");
    }
  }
  assert.equal(
    guiTinMauSpy.dem(),
    TRAN_NHAC,
    `tổng lượt gửi phải = trần ${TRAN_NHAC}`,
  );
  assert.equal(
    kq.hetLuot,
    1,
    "vòng cuối (lan_thu=5) phải gọi bao_het_luot ĐÚNG 1 lần",
  );

  const donSau = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [
    don.id,
  ]);
  assert.equal(donSau.trang_thai_he, "cho_sale");

  const rows = await lichCuaDon(don.id);
  assert.equal(
    rows.length,
    TRAN_NHAC,
    `đếm dòng lich_nhac của đơn phải = ${TRAN_NHAC}, KHÔNG có lịch thứ 6`,
  );
  assert.ok(rows.every((r) => r.trang_thai === "da_gui"));

  // quét thêm một vòng nữa: không còn gì tới hạn, không gửi thêm, không gọi hết lượt lần 2.
  luc = new Date(luc.getTime() + CACH_NHAC_MS);
  const kqThua = await quetLichNhac(
    sb.pool,
    { now: () => luc },
    { guiTinMau: guiTinMauSpy },
  );
  assert.equal(kqThua.quet, 0);
  assert.equal(
    guiTinMauSpy.dem(),
    TRAN_NHAC,
    "không gửi thêm sau khi đã hết lượt",
  );
});

// ═══ HUỶ — huyLichNhac idempotent ═══════════════════════════════════════════════

test("L6 · taoHuyLichNhac huỷ MỌI lịch 'cho' của đơn; gọi 2 lần KHÔNG lỗi (④#4)", async () => {
  const don = await toiDaGuiWa();
  const luc0 = new Date("2026-01-05T00:00:00Z");
  await datLichNhac(
    sb.pool,
    ctxHeThong(),
    { donId: don.id },
    { now: () => luc0 },
  );

  const huyLichNhac = taoHuyLichNhac(sb.pool, { job: "test-l6" });
  const k1 = await huyLichNhac(don.id);
  assert.equal(k1.camChua, true);
  assert.equal(k1.huy, 1);

  const rows = await lichCuaDon(don.id);
  assert.equal(rows[0].trang_thai, "da_huy");

  const k2 = await huyLichNhac(don.id); // gọi lần 2 — không còn gì để huỷ
  assert.equal(k2.huy, 0, "lần 2 phải huỷ 0 dòng, KHÔNG ném lỗi");
});

test("L6b · huyLichNhac ghi đúng 1 dòng nhat_ky mỗi lịch bị huỷ, mang team CỦA ĐƠN", async () => {
  const don = await toiDaGuiWa({ team: teamB });
  await datLichNhac(
    sb.pool,
    ctxHeThong(),
    { donId: don.id },
    { now: () => new Date("2026-01-06T00:00:00Z") },
  );
  const huyLichNhac = taoHuyLichNhac(sb.pool, { job: "test-l6b" });
  await huyLichNhac(don.id);
  const nk = await q(
    "SELECT team_id FROM nhat_ky WHERE hanh_dong='lich_nhac_bi_huy' AND doi_tuong_id IN (SELECT id::text FROM lich_nhac WHERE don_hang_id=$1)",
    [don.id],
  );
  assert.equal(nk.rows.length, 1);
  assert.equal(String(nk.rows[0].team_id), String(teamB));
});

// ═══ ④#5 — REBIND ctx PER-ĐƠN: 2 đơn 2 team trong MỘT lượt quét ═══════════════

test("L7 · REBIND ctx per-đơn — 2 đơn 2 team cùng tới hạn, 2 dòng nhat_ky ĐÚNG team", async () => {
  await donSachHangDoiCho();
  const luc0 = new Date("2026-01-07T00:00:00Z");
  const donA = await toiDaGuiWa({ team: teamA });
  const donB = await toiDaGuiWa({ team: teamB });
  await datLichNhac(
    sb.pool,
    ctxHeThong(),
    { donId: donA.id },
    { now: () => luc0 },
  );
  await datLichNhac(
    sb.pool,
    ctxHeThong(),
    { donId: donB.id },
    { now: () => luc0 },
  );

  const luc1 = new Date(luc0.getTime() + CACH_NHAC_MS);
  const kq = await quetLichNhac(
    sb.pool,
    { now: () => luc1 },
    { guiTinMau: spy() },
  );
  assert.equal(kq.quet, 2);
  assert.equal(kq.daGui, 2);

  const nk = await q(
    `SELECT doi_tuong_id, team_id FROM nhat_ky
      WHERE hanh_dong='lich_nhac_da_gui'
        AND doi_tuong_id IN (SELECT id::text FROM lich_nhac WHERE don_hang_id = ANY($1))
      ORDER BY doi_tuong_id`,
    [[donA.id, donB.id]],
  );
  assert.equal(
    nk.rows.length,
    2,
    "mỗi lịch một dòng nhat_ky, KHÔNG gộp/KHÔNG thiếu",
  );
  const mapLich = new Map(
    nk.rows.map((r) => [r.doi_tuong_id, String(r.team_id)]),
  );
  for (const [donId, teamCho] of [
    [donA.id, teamA],
    [donB.id, teamB],
  ]) {
    // lan_thu=1 ĐÍCH DANH: sau lượt quét, mỗi đơn đã có THÊM dòng lan_thu=2 (lịch kế
    // tiếp, còn 'cho') — không lọc lan_thu thì SELECT không ORDER BY có thể vớ đúng
    // dòng CHƯA được xử lý (chưa có mặt trong nhat_ky), làm assertion sai một cách ngẫu nhiên.
    const lichId = String(
      (
        await mot(
          "SELECT id FROM lich_nhac WHERE don_hang_id=$1 AND lan_thu=1",
          [donId],
        )
      ).id,
    );
    assert.equal(
      mapLich.get(lichId),
      String(teamCho),
      `lịch của đơn team ${teamCho} phải ghi ĐÚNG team đó`,
    );
  }
});

// ═══ Lưới an toàn — lịch RÁC (đơn đã rời da_gui_wa) bị huỷ êm, KHÔNG gửi ══════════

test("L8 · lịch của đơn ĐÃ RỜI da_gui_wa (qua đường khác) bị job huỷ êm, KHÔNG gửi", async () => {
  await donSachHangDoiCho();
  const don = await toiDaGuiWa();
  const luc0 = new Date("2026-01-08T00:00:00Z");
  await datLichNhac(
    sb.pool,
    ctxHeThong(),
    { donId: don.id },
    { now: () => luc0 },
  );
  // Khách "huỷ" thẳng qua máy trạng thái (không qua nhan-phan-hoi-wa) — mô phỏng một
  // đường khác đưa đơn rời da_gui_wa trong khi lịch vẫn còn 'cho' (huyLichNhac KHÔNG
  // được gọi ở đây cố ý, để dựng đúng tình huống "lịch mồ côi" mà bước lưới an toàn phải bắt).
  await apDung(sb.pool, ctxHeThong(), { donId: don.id, sukien: "tu_choi" });

  const luc1 = new Date(luc0.getTime() + CACH_NHAC_MS);
  const guiTinMauSpy = spy();
  const kq = await quetLichNhac(
    sb.pool,
    { now: () => luc1 },
    { guiTinMau: guiTinMauSpy },
  );
  assert.equal(kq.donRoiTrang, 1);
  assert.equal(guiTinMauSpy.dem(), 0, "KHÔNG được gửi nhắc cho đơn đã đóng");
  const rows = await lichCuaDon(don.id);
  assert.equal(rows[0].trang_thai, "da_huy");
});
