// L3-M2 · LỌC TRÙNG KIỂM CHÉO HAI LUỒNG — chuẩn hoá SĐT, cửa sổ ngày, vế sản phẩm
// mù-có-nói-ra, cách ly team.
//
// Chạy trên CSDL sandbox riêng (`aicloser_v3_test_l3m2loc`), tự dựng tự dọn — cùng khuôn
// test/l3-m1-may-trang-thai.test.js. KHÔNG chạm `aicloser_v3` dev (26 đơn thật + dữ liệu
// của hai thợ song song ở đó), KHÔNG chạm mạng lượt nào.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { ctxHeThong } from "../src/db/index.js";
import {
  kiemTrung,
  chuanHoaSdt,
  duoiBay,
  MA_QUOC_GIA,
  KEO_NGAY_MAC_DINH,
  LY_DO_TRUNG,
  CAU_TRA_TRUNG,
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

async function taoDon({
  team = teamA,
  khachId,
  nguon = "trang_ban_hang",
  sanPham = null,
  truocNgay = 0,
} = {}) {
  return mot(
    `INSERT INTO don_hang (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos,
                           khach_id, san_pham_ma, tao_luc)
     VALUES ($1,$2,$3,'moi_tu_pos','0',$4,$5, now() - ($6 * interval '1 day')) RETURNING *`,
    [
      team,
      `9999:${Math.floor(Math.random() * 1e9)}`,
      nguon,
      khachId,
      sanPham,
      truocNgay,
    ],
  );
}

before(async () => {
  sb = await dungSandbox("l3m2loc");
  teamA = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  teamB = (await mot("SELECT id FROM team WHERE slug='auus'")).id;
});
after(async () => {
  if (sb) await sb.don();
});

const ctxA = () => ({ teamId: teamA, nguoiDungId: null });

// ═══ ① CHUẨN HOÁ SĐT — BẢNG CA LỆCH THẬT ══════════════════════════════════════

test("A1 · chuanHoaSdt là hàm THUẦN, gom đúng 8+ định dạng lệch ĐO ĐƯỢC trên POS thật", () => {
  // Tám ca đầu là TÁM ĐỊNH DẠNG THẬT đo 23/08/2026 trên 5.144 đơn/7 shop; ba ca cuối
  // là rác phải trả null thay vì ném.
  const bang = [
    ["0583077980", "583077980", "Saudi · 0 đầu (1.068 ca thật)"],
    ["+966583077980", "583077980", "Saudi · +E164 (270 ca thật)"],
    ["00966583077980", "583077980", "Saudi · tiền tố 00 (25 ca thật)"],
    ["583077980", "583077980", "Saudi · số trần (1.966 ca thật)"],
    [" 583 077-980 ", "583077980", "có khoảng trắng + gạch nối"],
    ["+971568249989", "568249989", "UAE · +E164"],
    ["+96556572241", "56572241", "Kuwait · +E164 (nội địa 8 chữ số)"],
    ["0056572241", "56572241", "Kuwait · tiền tố 00 rồi số nội địa"],
    ["+886912345678", "912345678", "Taiwan · +E164 (nội địa 9 chữ số)"],
    ["abc", null, "không còn chữ số nào"],
    [null, null, "NULL"],
    ["", null, "rỗng"],
  ];
  for (const [tho, cho, y] of bang)
    assert.equal(chuanHoaSdt(tho), cho, `${y}: ${JSON.stringify(tho)}`);
  assert.equal(bang.filter((r) => r[1] !== null).length >= 8, true);
});

test("A2 · cắt mã quốc gia là DENY-BY-DEFAULT — độ dài không khớp thì KHÔNG cắt", () => {
  // 966 + 8 chữ số = 11 ≠ 966+9 ⇒ giữ nguyên, không được biến thành số 8 chữ số.
  assert.equal(chuanHoaSdt("96612345678"), "96612345678");
  // Rác 12 chữ số mở đầu 123/256/990 (đo được vài chục ca) không khớp mã nào ⇒ giữ.
  assert.equal(chuanHoaSdt("123456789012"), "123456789012");
  // Số nội địa Kuwait 8 chữ số không bao giờ bị hiểu là số quốc tế.
  assert.equal(chuanHoaSdt("56572241"), "56572241");
});

test("A3 · duoiBay bao RỘNG HƠN chuanHoaSdt một chiều — không bao giờ đánh rơi cặp trùng", () => {
  // Bất biến: hai số bằng nhau sau chuẩn hoá thì bảy chữ số cuối cũng bằng nhau
  // (chuẩn hoá chỉ CẮT TIỀN TỐ). Đây là điều làm vế lọc-bằng-index an toàn.
  const cap = [
    ["0583077980", "+966583077980"],
    ["0056572241", "+96556572241"],
    [" 583 077-980 ", "583077980"],
  ];
  for (const [a, b] of cap) {
    assert.equal(chuanHoaSdt(a), chuanHoaSdt(b));
    assert.equal(duoiBay(a), duoiBay(b));
  }
});

test("A4 · bảng mã quốc gia khai BIÊN của chính nó — PH chưa đo phải nói ra", () => {
  const chuaDo = MA_QUOC_GIA.filter((x) => !x.daDo).map((x) => x.ten);
  assert.deepEqual(chuaDo, ["Philippines"]);
  assert.equal(MA_QUOC_GIA.filter((x) => x.daDo).length, 7); // 7 shop thật
});

// ═══ ② KIỂM CHÉO HAI LUỒNG — CẢ HAI CHIỀU ═════════════════════════════════════

test("B1 · LadiPage TRƯỚC, Messenger SAU → bắt trùng; nguon_trung = trang_ban_hang", async () => {
  const k = await taoKhach("0583000001");
  await taoDon({ khachId: k.id, nguon: "trang_ban_hang", sanPham: ["1:SP-A"] });
  const kq = await kiemTrung(sb.pool, ctxA(), {
    soDienThoai: "+966583000001", // ĐÚNG khách đó, định dạng KHÁC
    sanPhamId: "1:SP-A",
  });
  assert.equal(kq.trung, true);
  assert.equal(kq.ly_do, "trung_khop_san_pham");
  assert.equal(kq.nguon_trung, "trang_ban_hang");
  assert.equal(kq.don.length, 1);
});

test("B2 · ĐẢO CHIỀU — Messenger TRƯỚC, trang bán hàng SAU → vẫn bắt", async () => {
  const k = await taoKhach("0583000002");
  await taoDon({ khachId: k.id, nguon: "messenger", sanPham: ["1:SP-B"] });
  const kq = await kiemTrung(sb.pool, ctxA(), {
    soDienThoai: "583000002",
    sanPhamId: "1:SP-B",
  });
  assert.equal(kq.trung, true);
  assert.equal(kq.nguon_trung, "messenger");
});

test("B3 · khách có đơn ở CẢ HAI luồng → nguon_trung = ca_hai", async () => {
  const k = await taoKhach("0583000003");
  await taoDon({ khachId: k.id, nguon: "trang_ban_hang", sanPham: ["1:SP-C"] });
  await taoDon({ khachId: k.id, nguon: "messenger", sanPham: ["1:SP-C"] });
  const kq = await kiemTrung(sb.pool, ctxA(), {
    soDienThoai: "00966583000003",
    sanPhamId: "1:SP-C",
  });
  assert.equal(kq.nguon_trung, "ca_hai");
  assert.equal(kq.don.length, 2);
});

test("B4 · câu tra KHÔNG được mang vế lọc `nguon` — mất vế đó là mất phép kiểm CHÉO", () => {
  assert.equal(/nguon\s*=/.test(CAU_TRA_TRUNG), false);
  assert.equal(CAU_TRA_TRUNG.includes("JOIN khach"), true);
});

// ═══ ③ ĐỐI CHỨNG ÂM ═══════════════════════════════════════════════════════════

test("C1 · KHÁC sản phẩm → KHÔNG trùng", async () => {
  const k = await taoKhach("0583000004");
  await taoDon({ khachId: k.id, sanPham: ["1:SP-X"] });
  const kq = await kiemTrung(sb.pool, ctxA(), {
    soDienThoai: "0583000004",
    sanPhamId: "1:SP-Y",
  });
  assert.equal(kq.trung, false);
  assert.equal(kq.ly_do, "khong_trung");
  assert.equal(kq.so_don_xet, 1); // ĐÃ tra thấy đơn, chỉ là khác SP — không phải mù
});

test("C2 · NGOÀI cửa sổ ngày → KHÔNG trùng (mặc định 7 ngày)", async () => {
  const k = await taoKhach("0583000005");
  await taoDon({ khachId: k.id, sanPham: ["1:SP-Z"], truocNgay: 30 });
  const ngoai = await kiemTrung(sb.pool, ctxA(), {
    soDienThoai: "0583000005",
    sanPhamId: "1:SP-Z",
  });
  assert.equal(ngoai.trung, false);
  assert.equal(ngoai.so_don_xet, 0);
  // Nới cửa sổ thì CHÍNH đơn đó lại thấy — chứng minh khác biệt là CỬA SỔ, không phải
  // dữ liệu (nếu không, một ca «không trùng» vì đơn không tồn tại cũng xanh y hệt).
  const trong = await kiemTrung(sb.pool, ctxA(), {
    soDienThoai: "0583000005",
    sanPhamId: "1:SP-Z",
    keo_ngay: 60,
  });
  assert.equal(trong.trung, true);
  assert.equal(KEO_NGAY_MAC_DINH, 7);
});

test("C3 · khách KHÁC (số khác hẳn) → KHÔNG trùng", async () => {
  const k = await taoKhach("0583000006");
  await taoDon({ khachId: k.id, sanPham: ["1:SP-A"] });
  const kq = await kiemTrung(sb.pool, ctxA(), {
    soDienThoai: "0599999999",
    sanPhamId: "1:SP-A",
  });
  assert.equal(kq.trung, false);
});

// ═══ ④ SĐT VẮNG + VẾ SẢN PHẨM MÙ — NÓI RA, KHÔNG IM ═══════════════════════════

test("D1 · SĐT NULL/rỗng → trung:false + ly_do 'chua_co_sdt', KHÔNG ném", async () => {
  for (const v of [null, undefined, "", "   "]) {
    const kq = await kiemTrung(sb.pool, ctxA(), {
      soDienThoai: v,
      sanPhamId: "1:SP-A",
    });
    assert.equal(kq.trung, false);
    assert.equal(kq.ly_do, "chua_co_sdt");
    assert.equal(kq.sdt_chuan, null);
  }
});

test("D2 · SĐT có chuỗi nhưng không đọc được chữ số → lý do RIÊNG, không lẫn với 'chưa có'", async () => {
  const kq = await kiemTrung(sb.pool, ctxA(), { soDienThoai: "khong-biet" });
  assert.equal(kq.ly_do, "sdt_khong_doc_duoc");
  assert.notEqual(kq.ly_do, "chua_co_sdt");
});

test("D3 · đơn CHƯA khai sản phẩm → 'nghi_trung_chua_ro_san_pham' (fail-CLOSED, có tên riêng)", async () => {
  const k = await taoKhach("0583000007");
  await taoDon({ khachId: k.id, sanPham: null }); // đúng hiện trạng 26/26 đơn thật
  const kq = await kiemTrung(sb.pool, ctxA(), {
    soDienThoai: "0583000007",
    sanPhamId: "1:SP-A",
  });
  assert.equal(kq.trung, true);
  assert.equal(kq.ly_do, "nghi_trung_chua_ro_san_pham");
  assert.notEqual(kq.ly_do, "trung_khop_san_pham"); // KHÔNG lẫn với trùng đã xác minh
});

test("D4 · lượt gọi KHÔNG biết sản phẩm → cũng rơi nhánh nghi ngờ, không đọc là sạch", async () => {
  const k = await taoKhach("0583000008");
  await taoDon({ khachId: k.id, sanPham: ["1:SP-A"] });
  const kq = await kiemTrung(sb.pool, ctxA(), { soDienThoai: "0583000008" });
  assert.equal(kq.trung, true);
  assert.equal(kq.ly_do, "nghi_trung_chua_ro_san_pham");
});

test("D5 · từ vựng lý do là MỘT tập đóng — mọi lý do trả ra phải nằm trong LY_DO_TRUNG", async () => {
  const k = await taoKhach("0583000009");
  await taoDon({ khachId: k.id, sanPham: ["1:SP-A"] });
  const cac = [
    await kiemTrung(sb.pool, ctxA(), { soDienThoai: null }),
    await kiemTrung(sb.pool, ctxA(), { soDienThoai: "??" }),
    await kiemTrung(sb.pool, ctxA(), {
      soDienThoai: "0583000009",
      sanPhamId: "1:SP-A",
    }),
    await kiemTrung(sb.pool, ctxA(), {
      soDienThoai: "0583000009",
      sanPhamId: "1:SP-KHAC",
    }),
  ];
  for (const kq of cac) assert.equal(LY_DO_TRUNG.includes(kq.ly_do), true);
  assert.equal(new Set(cac.map((k2) => k2.ly_do)).size, 4);
});

// ═══ ⑤ CÁCH LY TEAM + BỐI CẢNH ════════════════════════════════════════════════

test("E1 · đơn của team KHÁC không lọt vào kết quả, dù SĐT trùng khít", async () => {
  const kB = await taoKhach("0583000010", teamB);
  await taoDon({
    team: teamB,
    khachId: kB.id,
    sanPham: ["1:SP-A"],
    nguon: "messenger",
  });
  const kq = await kiemTrung(sb.pool, ctxA(), {
    soDienThoai: "0583000010",
    sanPhamId: "1:SP-A",
  });
  assert.equal(kq.trung, false);
  // Cùng số, cùng SP, nhưng ctx team B thì THẤY — chứng minh phép trên không xanh vì
  // dữ liệu không tồn tại (án lệ «bẫy đo tự dựng điều kiện»).
  const kq2 = await kiemTrung(
    sb.pool,
    { teamId: teamB, nguoiDungId: null },
    { soDienThoai: "0583000010", sanPhamId: "1:SP-A" },
  );
  assert.equal(kq2.trung, true);
});

test("E2 · thiếu bối cảnh team → NÉM, không trả «không trùng»", async () => {
  await assert.rejects(
    () => kiemTrung(sb.pool, {}, { soDienThoai: "0583000001" }),
    /LoiThieuBoiCanhTeam|bối cảnh team/,
  );
  await assert.rejects(
    () => kiemTrung(sb.pool, ctxHeThong(), { soDienThoai: "0583000001" }),
    /teamId.*tường minh|tường minh/,
  );
});

test("E3 · ctxHeThong + teamId tường minh → chạy được (job nền dùng đường này)", async () => {
  const kq = await kiemTrung(sb.pool, ctxHeThong(), {
    soDienThoai: "0583000001",
    sanPhamId: "1:SP-A",
    teamId: teamA,
  });
  assert.equal(kq.trung, true);
});

test("E4 · keo_ngay không hợp lệ → NÉM ngay lúc khai, không âm thầm về mặc định", async () => {
  for (const v of [0, -1, "bay ngay", NaN])
    await assert.rejects(
      () =>
        kiemTrung(sb.pool, ctxA(), {
          soDienThoai: "0583000001",
          keo_ngay: v,
        }),
      /keo_ngay/,
    );
});

test("E5 · KHÔNG lượt nào của lọc trùng ghi/sửa/xoá một đơn nào", async () => {
  const truoc = await mot(
    "SELECT count(*)::int n, coalesce(max(sua_luc),'epoch') m FROM don_hang",
  );
  await kiemTrung(sb.pool, ctxA(), {
    soDienThoai: "0583000001",
    sanPhamId: "1:SP-A",
  });
  await kiemTrung(sb.pool, ctxA(), { soDienThoai: null });
  const sau = await mot(
    "SELECT count(*)::int n, coalesce(max(sua_luc),'epoch') m FROM don_hang",
  );
  assert.equal(sau.n, truoc.n);
  assert.deepEqual(sau.m, truoc.m);
});
