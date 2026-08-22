// L3-M2 · CHẤM TỈ LỆ HOÀN PER-KHÁCH + PHÂN BỐN TẦNG — job đêm, CHỈ TÍNH KHÔNG CHẶN.
//
// Sandbox riêng (`aicloser_v3_test_l3m2tlh`), tự dựng tự dọn. KHÔNG chạm `aicloser_v3`
// dev, KHÔNG chạm mạng.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import {
  chamTiLeHoan,
  chamTiLeHoanMotTeam,
  chamTang,
  kiemCauHinh,
  MA_HOAN,
  MA_DA_KET,
  TANG_HOAN,
  CAU_HINH_TANG,
  CAU_DEM_HOAN,
  CAU_GHI_CHAM,
} from "../src/orders/index.js";

let sb;
const q = (sql, p) => sb.pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
let teamA, teamB;

async function taoKhach(sdt, team = teamA) {
  return mot(
    "INSERT INTO khach (team_id, so_dien_thoai, ten) VALUES ($1,$2,$3) RETURNING *",
    [team, sdt, "K"],
  );
}
/** Dựng cho một khách n đơn với đúng danh sách mã POS đưa vào. */
async function donCua(khachId, maPos, team = teamA) {
  for (const ma of maPos)
    await q(
      `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id)
       VALUES ($1,$2,'trang_ban_hang','moi_tu_pos',$3,$4)`,
      [team, `9999:${Math.floor(Math.random() * 1e9)}`, String(ma), khachId],
    );
}
const doc = (id) => mot("SELECT * FROM khach WHERE id=$1", [id]);

before(async () => {
  sb = await dungSandbox("l3m2tlh");
  teamA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  teamB = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
});
after(async () => {
  if (sb) await sb.don();
});

// ═══ ① HÀM THUẦN + BIÊN TẦNG ══════════════════════════════════════════════════

test("A1 · chamTang — bốn tầng, biên DƯỚI-ĐÓNG/TRÊN-MỞ, 45% RA TẦNG RIÊNG", () => {
  const b = [
    [0, "tot"],
    [14.99, "tot"],
    [15, "binh_thuong"],
    [29.99, "binh_thuong"],
    [30, "canh_bao"],
    [45, "canh_bao"], // ← nghiệm thu ④#5 của phiếu
    [64.99, "canh_bao"],
    [65, "rui_ro_cao"],
    [100, "rui_ro_cao"],
  ];
  for (const [t, cho] of b) assert.equal(chamTang(t, 5), cho, `${t}%`);
  assert.notEqual(chamTang(45, 5), "binh_thuong");
  assert.equal(new Set(b.map((x) => x[1])).size, 4); // ĐÚNG bốn tầng, không phải ba
});

test("A2 · dưới sàn đơn-đã-kết → nhãn RIÊNG `chua_du_don`, không phải `tot` và không NULL", () => {
  assert.equal(chamTang(100, 1), "chua_du_don"); // 1/1 hoàn — một điểm dữ liệu
  assert.equal(chamTang(0, 0), "chua_du_don");
  assert.equal(chamTang(100, 2), "rui_ro_cao"); // đủ sàn thì mới xếp tầng
  assert.equal(CAU_HINH_TANG.toi_thieu_don_ket, 2);
  assert.equal(TANG_HOAN.length, 5); // 4 tầng + 1 nhãn vắng mặt
});

test("A3 · cấu hình sai → NÉM NGAY lúc khai (ngưỡng lộn ngược / ngoài 0–100 / sàn 0)", () => {
  assert.throws(
    () => kiemCauHinh({ ...CAU_HINH_TANG, nguong_tot: 40 }),
    /TĂNG DẦN/,
  );
  assert.throws(
    () => kiemCauHinh({ ...CAU_HINH_TANG, nguong_canh_bao: 0.65 }),
    /TĂNG DẦN|0–100/,
  );
  assert.throws(
    () => kiemCauHinh({ ...CAU_HINH_TANG, toi_thieu_don_ket: 0 }),
    /toi_thieu_don_ket/,
  );
  assert.doesNotThrow(() => kiemCauHinh({ ...CAU_HINH_TANG }));
});

test("A4 · nhóm hủy/hoàn KHAI CỨNG {4,5,6,7} — KHÔNG có 8 (án lệ L1-M1)", () => {
  assert.deepEqual([...MA_HOAN], [4, 5, 6, 7]);
  assert.equal(MA_HOAN.includes(8), false);
  assert.deepEqual(
    [...MA_DA_KET].sort((x, y) => x - y),
    [3, 4, 5, 6, 7, 16],
  );
});

// ═══ ② CHẤM TRÊN DÂN SỐ DỰNG SẴN ══════════════════════════════════════════════

test("B1 · tỉ lệ + tầng đúng trên bốn hồ sơ khách khác nhau", async () => {
  const k0 = await taoKhach("0500000001"); // 0/4 hoàn → tot
  await donCua(k0.id, [3, 3, 16, 16]);
  const k1 = await taoKhach("0500000002"); // 1/4 = 25% → binh_thuong
  await donCua(k1.id, [5, 3, 16, 3]);
  const k2 = await taoKhach("0500000003"); // 45% cần 20 đơn — dùng 9/20
  await donCua(k2.id, [...Array(9).fill(6), ...Array(11).fill(3)]);
  const k3 = await taoKhach("0500000004"); // 3/4 = 75% → rui_ro_cao
  await donCua(k3.id, [4, 5, 7, 16]);

  const kq = await chamTiLeHoanMotTeam(sb.pool, { teamId: teamA });
  assert.equal(kq.khach >= 4, true);

  const r0 = await doc(k0.id);
  assert.equal(Number(r0.ti_le_hoan), 0);
  assert.equal(r0.tang_hoan, "tot");
  assert.equal(r0.so_don_ket, 4);
  assert.equal(r0.so_don_hoan, 0);

  const r1 = await doc(k1.id);
  assert.equal(Number(r1.ti_le_hoan), 25);
  assert.equal(r1.tang_hoan, "binh_thuong");

  const r2 = await doc(k2.id);
  assert.equal(Number(r2.ti_le_hoan), 45);
  assert.equal(r2.tang_hoan, "canh_bao"); // ← 45% KHÔNG phải «bình thường»
  assert.equal(r2.so_don_hoan, 9);
  assert.equal(r2.so_don_ket, 20);

  const r3 = await doc(k3.id);
  assert.equal(Number(r3.ti_le_hoan), 75);
  assert.equal(r3.tang_hoan, "rui_ro_cao");
});

test("B2 · MÃ 8 KHÔNG tính hoàn — phép đếm có/không 8 LỆCH NHAU trên cùng một khách", async () => {
  const k = await taoKhach("0500000005");
  await donCua(k.id, [8, 8, 3, 3]); // hai đơn đang đóng gói + hai đơn đã giao
  await chamTiLeHoanMotTeam(sb.pool, { teamId: teamA });
  const r = await doc(k.id);
  // Luật ĐÚNG: 8 không vào tử SỐ, cũng không vào MẪU (chưa kết) ⇒ 0/2 = 0%.
  assert.equal(r.so_don_hoan, 0);
  assert.equal(r.so_don_ket, 2);
  assert.equal(Number(r.ti_le_hoan), 0);
  assert.equal(r.tang_hoan, "tot");
  // Luật SAI (bản đang chạy `src/pancake-orders.js:13` khai {4,5,6,7,8}) ra 2/4 = 50%
  // ⇒ `canh_bao`. Hai con số này PHẢI khác nhau, nếu không thì phép đo không đo gì.
  const nhu8 = await mot(
    `SELECT count(*) FILTER (WHERE trang_thai_pos::int = ANY($1::int[])) AS hoan,
            count(*) FILTER (WHERE trang_thai_pos::int = ANY($2::int[])) AS ket
       FROM don_hang WHERE khach_id = $3`,
    [[4, 5, 6, 7, 8], [3, 16, 4, 5, 6, 7, 8], k.id],
  );
  assert.equal(Number(nhu8.hoan), 2);
  assert.equal(Number(nhu8.ket), 4);
  assert.equal(chamTang(50, 4), "canh_bao");
  assert.notEqual(chamTang(50, 4), r.tang_hoan);
});

test("B3 · đơn CHƯA KẾT không vào mẫu số — grain của phép đo bằng grain dữ liệu", async () => {
  const k = await taoKhach("0500000006");
  await donCua(k.id, [5, 0, 1, 12, 9, 20]); // 1 hoàn + 5 đơn còn đang chạy
  await chamTiLeHoanMotTeam(sb.pool, { teamId: teamA });
  const r = await doc(k.id);
  assert.equal(r.so_don_ket, 1); // KHÔNG phải 6
  assert.equal(r.so_don_hoan, 1);
  assert.equal(Number(r.ti_le_hoan), 100);
  assert.equal(r.tang_hoan, "chua_du_don"); // 1 đơn ⇒ dưới sàn, chưa xếp tầng
});

test("B4 · khách KHÔNG có đơn nào vẫn ra một dòng `chua_du_don`, không biến mất", async () => {
  const k = await taoKhach("0500000007");
  await chamTiLeHoanMotTeam(sb.pool, { teamId: teamA });
  const r = await doc(k.id);
  assert.equal(r.tang_hoan, "chua_du_don");
  assert.equal(r.so_don_ket, 0);
  assert.notEqual(r.cham_hoan_luc, null); // đã được CHẤM, không phải bị bỏ qua
});

test("B5 · `trang_thai_pos` rác không làm cả lượt ném — nó bị ĐẾM RIÊNG", async () => {
  const k = await taoKhach("0500000008");
  await q(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id)
     VALUES ($1,$2,'trang_ban_hang','moi_tu_pos',$3,$4)`,
    [teamA, `9999:rac${Date.now()}`, "khong-phai-so", k.id],
  );
  const kq = await chamTiLeHoanMotTeam(sb.pool, { teamId: teamA });
  assert.equal(kq.maKhongDocDuoc >= 1, true);
  const r = await doc(k.id);
  assert.equal(r.so_don_ket, 0);
});

// ═══ ③ LŨY ĐẲNG + KHÔNG CHẶN, KHÔNG ĐỤNG ĐƠN ══════════════════════════════════

test("C1 · chạy 2 lượt liền: số KHÔNG đổi, capNhat lượt 2 = 0", async () => {
  const l1 = await chamTiLeHoanMotTeam(sb.pool, { teamId: teamA });
  const anh1 = await q(
    "SELECT id, ti_le_hoan, tang_hoan, so_don_ket, so_don_hoan FROM khach WHERE team_id=$1 ORDER BY id",
    [teamA],
  );
  const l2 = await chamTiLeHoanMotTeam(sb.pool, { teamId: teamA });
  const anh2 = await q(
    "SELECT id, ti_le_hoan, tang_hoan, so_don_ket, so_don_hoan FROM khach WHERE team_id=$1 ORDER BY id",
    [teamA],
  );
  assert.equal(l2.capNhat, 0, "lượt hai KHÔNG được đổi điểm số của ai");
  assert.deepEqual(anh2.rows, anh1.rows);
  assert.equal(l2.khach, l1.khach);
  assert.deepEqual(l2.theoTang, l1.theoTang);
});

test("C2 · mốc chấm MỚI LẠI mỗi lượt (tuổi PHÉP ĐO ≠ tuổi SỰ VIỆC), dù điểm số không đổi", async () => {
  const k = (
    await q("SELECT id FROM khach WHERE team_id=$1 ORDER BY id LIMIT 1", [
      teamA,
    ])
  ).rows[0];
  const truoc = (await doc(k.id)).cham_hoan_luc;
  const moc = new Date(Date.now() + 60_000);
  const kq = await chamTiLeHoanMotTeam(sb.pool, { teamId: teamA, moc });
  const sau = (await doc(k.id)).cham_hoan_luc;
  assert.equal(kq.capNhat, 0); // điểm số vẫn không đổi
  assert.equal(+new Date(sau) > +new Date(truoc), true); // nhưng mốc thì mới
});

test("C3 · job KHÔNG đụng một đơn nào và KHÔNG đẻ việc cho sale — CHỈ TÍNH, không chặn", async () => {
  const t = await mot(
    "SELECT count(*)::int n, coalesce(max(sua_luc),'epoch') m FROM don_hang",
  );
  const v = await mot("SELECT count(*)::int n FROM viec_can_xu_ly");
  const tt = await q(
    "SELECT id, trang_thai_he, trang_thai_pos FROM don_hang ORDER BY id",
  );
  await chamTiLeHoan(sb.pool, {});
  const t2 = await mot(
    "SELECT count(*)::int n, coalesce(max(sua_luc),'epoch') m FROM don_hang",
  );
  const v2 = await mot("SELECT count(*)::int n FROM viec_can_xu_ly");
  const tt2 = await q(
    "SELECT id, trang_thai_he, trang_thai_pos FROM don_hang ORDER BY id",
  );
  assert.equal(t2.n, t.n);
  assert.deepEqual(t2.m, t.m);
  assert.equal(v2.n, v.n);
  assert.deepEqual(tt2.rows, tt.rows); // DANH SÁCH, không phải một con số tổng
});

test("C4 · câu ghi CHỈ chạm 5 cột của `khach` và LUÔN kẹp team — deny-by-default", () => {
  // Đọc ĐÚNG khối SET (từ `SET` tới `FROM`) rồi liệt mọi cột bị gán — không đếm theo
  // thụt lề, vì thụt lề đổi khi ai chạy prettier và thước sẽ đỏ vì lý do vô can.
  const khoiSet = CAU_GHI_CHAM.slice(
    CAU_GHI_CHAM.indexOf("SET "),
    CAU_GHI_CHAM.indexOf("FROM ("),
  );
  const cot = [...khoiSet.matchAll(/(\w+)\s*=\s*(?:v\.\w+|\$\d+)/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(cot, [
    "ti_le_hoan",
    "tang_hoan",
    "so_don_ket",
    "so_don_hoan",
    "cham_hoan_luc",
  ]);
  assert.equal(/k\.team_id\s*=\s*\$7/.test(CAU_GHI_CHAM), true);
  assert.equal(/sua_luc/.test(CAU_GHI_CHAM), false);
  assert.equal(/don_hang|viec_can_xu_ly/.test(CAU_GHI_CHAM), false);
  assert.equal(/DELETE|INSERT/i.test(CAU_GHI_CHAM), false);
  // Câu đếm phải giữ LEFT JOIN + vế team của đơn (mất là đếm sang team khác).
  assert.equal(/LEFT JOIN don_hang/.test(CAU_DEM_HOAN), true);
  assert.equal(/d\.team_id\s*=\s*k\.team_id/.test(CAU_DEM_HOAN), true);
});

// ═══ ④ CÁCH LY TEAM + NHẬT KÝ ═════════════════════════════════════════════════

test("D1 · đơn của team khác KHÔNG vào hồ sơ khách team này", async () => {
  const kA = await taoKhach("0511111111", teamA);
  await donCua(kA.id, [3, 3], teamA);
  const kB = await taoKhach("0511111111", teamB); // cùng số, team khác — hợp lệ
  await donCua(kB.id, [5, 5, 5, 5], teamB);
  await chamTiLeHoan(sb.pool, {});
  assert.equal(Number((await doc(kA.id)).ti_le_hoan), 0);
  assert.equal(Number((await doc(kB.id)).ti_le_hoan), 100);
});

test("D2 · MỘT dòng nhật ký cho CẢ LƯỢT của team, không phải một dòng mỗi khách", async () => {
  const truoc = Number(
    (
      await mot(
        "SELECT count(*)::int n FROM nhat_ky WHERE hanh_dong='cham_ti_le_hoan'",
      )
    ).n,
  );
  const kq = await chamTiLeHoan(sb.pool, {});
  const sau = await q(
    "SELECT team_id, tac_nhan, sau FROM nhat_ky WHERE hanh_dong='cham_ti_le_hoan' ORDER BY id DESC LIMIT 10",
  );
  assert.equal(sau.rows.length - 0 >= 1, true);
  const them =
    Number(
      (
        await mot(
          "SELECT count(*)::int n FROM nhat_ky WHERE hanh_dong='cham_ti_le_hoan'",
        )
      ).n,
    ) - truoc;
  // Team KHÔNG có khách nào thì KHÔNG đẻ dòng nhật ký (một dòng «đã quét, 0 khách»
  // mỗi đêm × mọi team là rác thuần). Nên mẫu số đúng là số team CÓ khách, và con số
  // ấy phải NHỎ HƠN HẲN số khách — đó mới là điều phép này đi chứng minh.
  const teamCoKhach = kq.theoTeam.filter((t) => t.khach > 0).length;
  assert.equal(
    them,
    teamCoKhach,
    `mỗi team có khách đúng 1 dòng, không phải ${kq.khach} dòng`,
  );
  assert.equal(them < kq.khach, true);
  assert.equal(sau.rows[0].tac_nhan, "may:cham-ti-le-hoan");
  assert.equal(typeof sau.rows[0].sau.theoTang, "object");
});

test("D3 · bất biến CSDL: tầng không tồn tại nếu thiếu mốc chấm (và ngược lại)", async () => {
  const k = await taoKhach("0522222222");
  await assert.rejects(
    () => q("UPDATE khach SET tang_hoan='tot' WHERE id=$1", [k.id]),
    /khach_tang_di_kem_moc_cham/,
  );
  await assert.rejects(
    () => q("UPDATE khach SET ti_le_hoan=150 WHERE id=$1", [k.id]),
    /khach_ti_le_hoan_phan_tram/,
  );
  await assert.rejects(
    () =>
      q(
        "UPDATE khach SET tang_hoan='rat_xau', cham_hoan_luc=now() WHERE id=$1",
        [k.id],
      ),
    /khach_tang_hoan_hop_le/,
  );
});

test("D4 · một team hỏng KHÔNG làm hỏng cả lượt (per-TEAM, không per-LÔ)", async () => {
  const kq = await chamTiLeHoan(sb.pool, {});
  assert.equal(kq.teamHong.length, 0);
  assert.equal(kq.team, 4); // 3 team nghiệp vụ + 1 team KỸ THUẬT `chua-phan`
  assert.equal(Object.keys(kq.theoTang).length, 5);
});
