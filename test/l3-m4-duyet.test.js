// PHIẾU L3-M4 — CỬA TẠO ĐƠN THẬT (4 cửa) + `duyet()` = §7.3 cửa ⑤.
//
// Nguyên tắc bộ ca (khuôn `test/l1-m1-ghi-nguoc.test.js`): mỗi cửa đo ĐỦ HAI vế —
//   (1) lỗi ném ra đúng TÊN, và (2) **POS bị POST bao nhiêu lượt**.
// Vế (2) mới là vế đắt: một cửa «chặn» mà vẫn kịp bắn POST là một kiện COD đã đẻ ra và
// luật 2 §0a CẤM xoá nó; bộ ca chỉ nhìn `assert.rejects` thì vẫn xanh (án lệ #29).
//
// `nap` TIÊM ⇒ KHÔNG lượt nào chạm POS thật (phép thật là §7b **T7**). Sandbox tự dựng
// tự dọn, KHÔNG chạm `aicloser_v3` dev.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { dungSandbox } from "../db/sandbox.js";
import { maHoa } from "../db/khoa.js";
import { ctxHeThong } from "../src/db/index.js";
import {
  taoDon,
  dungPayload,
  doiSangDonViNho,
  tachMaBienThe,
  moCoiTruocPost,
  MA_CHO_IN,
  LoiThieuThamChieuSanPham,
  LoiDonDaTao,
} from "../src/pos/tao-don.js";
import { LoiVanGhiDong } from "../src/pos/ghi-nguoc.js";
import { LoiPosKhongTraLoi } from "../src/pos/api.js";
import {
  vaoHangCho,
  duyet,
  loai,
  docHangCho,
  LoiHangChoDaXuLy,
} from "../src/orders/hang-cho.js";

const KHOA = { V3_KHOA_MA_HOA: "c".repeat(64) }; // KHÔNG đụng .env thật
const MO = { ...KHOA, V3_POS_GHI: "1" };
const DONG = { ...KHOA }; // van VẮNG = đóng (đúng hiện trạng máy dev, đo 23/08)
const SHOP = "9995001";
const MARKET = "GiaLapDuyet";
// ⚠️ variation_id THẬT của POS là UUID (đo 23/08: 137/137 `san_pham.ma`, 4.581/4.581
//    phần tử `don_hang.san_pham_ma`) — bộ ca phải dùng ĐÚNG hình dạng đó, không phải
//    một số cho dễ viết, kẻo cổng xanh trên một thế giới không có thật (án lệ #1).
const UUID_BT = "3e272c3b-ea70-4d10-981e-e9049090322b";
const BIEN_THE = `${SHOP}:${UUID_BT}`;

let sb;
let pool;
let TEAM;
let pageId;
let pageText;
let spId;

const q = (sql, p) => pool.query(sql, p);
const mot = async (sql, p) => (await q(sql, p)).rows[0];
const ctx = () => ctxHeThong();

/** `nap` giả cho MỌI lượt HTTP của cửa POS. Đếm riêng GET (đọc đơn) và POST (tạo đơn). */
function napGia({
  idMoi = 70001,
  httpTao = 200,
  nemTao = null,
  donGet = [],
} = {}) {
  const f = async (url, tuyChon = {}) => {
    if ((tuyChon.method || "GET") === "POST") {
      f.post += 1;
      f.urlPost.push(url);
      f.thanPost.push(JSON.parse(tuyChon.body));
      if (nemTao) throw nemTao;
      return {
        ok: httpTao >= 200 && httpTao < 300,
        status: httpTao,
        text: async () =>
          httpTao >= 200 && httpTao < 300
            ? JSON.stringify({ data: { id: idMoi } })
            : JSON.stringify({ message: "shop từ chối" }),
      };
    }
    f.get += 1;
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ data: donGet, total_entries: donGet.length }),
    };
  };
  f.post = 0;
  f.get = 0;
  f.urlPost = [];
  f.thanPost = [];
  return f;
}

const DON_DU = {
  ten: "Sara",
  sdt: "+971500000777",
  diaChi: "Jumeirah 3",
  thanhPho: "Dubai",
  soLuong: 2,
  tongTien: 199,
  tienTe: "AED",
  sanPhamMa: BIEN_THE,
  khoHang: "kho-gia-lap",
};

const HO_SO_DU = {
  ten: DON_DU.ten,
  sdt: DON_DU.sdt,
  dia_chi: DON_DU.diaChi,
  thanh_pho: DON_DU.thanhPho,
  so_luong: DON_DU.soLuong,
  tong_tien: DON_DU.tongTien,
  tien_te: DON_DU.tienTe,
  san_pham_ma: BIEN_THE,
  kho_hang: DON_DU.khoHang,
};

async function dungDongChoDuyet({
  psid,
  hoSo = HO_SO_DU,
  tinId,
  noiDung = "yes i confirm",
}) {
  const h = await mot(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu)
     VALUES ($1,$2,$3,'CLOSING','AI') RETURNING *`,
    [TEAM, pageId, psid],
  );
  await q(
    `INSERT INTO tin_cho_xu_ly (team_id, page_id, psid, conv_id, msg_id, noi_dung, trang_thai)
     VALUES ($1,$2,$3,$4,$5,$6,'xong')`,
    [TEAM, pageText, psid, `conv-${psid}`, `msg-${psid}`, noiDung],
  );
  const kq = await vaoHangCho(
    pool,
    ctx(),
    {
      hoiThoaiId: h.id,
      teamId: TEAM,
      hoSo,
      convId: `conv-${psid}`,
      tinId,
    },
    { env: MO, nap: napGia() },
  );
  return { hoiThoai: h, hangChoId: kq.id, cua_kiem: kq.cua_kiem };
}

before(async () => {
  sb = await dungSandbox("l3m4duyet");
  pool = sb.pool;
  TEAM = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  pageText = "555999888777";
  const p = await mot(
    `INSERT INTO page (team_id, page_id, ten, thi_truong, pos_shop_id)
     VALUES ($1,$2,'Page duyet',' ',$3) RETURNING *`,
    [TEAM, pageText, SHOP],
  );
  pageId = p.id;
  await q(
    "INSERT INTO ket_noi_pos (team_id, market, shop_id, api_key_ma) VALUES ($1,$2,$3,$4)",
    [TEAM, MARKET, SHOP, maHoa("khoa-gia-lap", KHOA)],
  );
  // Bảng giá để cửa ② MỞ được — cả file này đo đường HAPPY nên cần nó.
  spId = (
    await mot(
      "INSERT INTO san_pham (team_id, page_id, ma, ten) VALUES ($1,$2,$3,'SP') RETURNING id",
      [TEAM, pageId, BIEN_THE],
    )
  ).id;
  await q(
    "INSERT INTO goi_gia (team_id, san_pham_id, so_luong, gia, tien_te) VALUES ($1,$2,2,199,'AED')",
    [TEAM, spId],
  );
});
after(async () => {
  if (sb) await sb.don();
});

// ═══ P · PAYLOAD — status 12 TƯỜNG MINH, KHÔNG bê 0 của khuôn cũ ═════════════

test("P1 · payload mang ĐỦ trường khuôn createPancakeOrder, và status = 12 ≠ 0", () => {
  const pl = dungPayload({
    pageIdText: pageText,
    convId: "conv-x",
    don: DON_DU,
    variationId: UUID_BT,
    khoHang: "kho-gia-lap",
  });
  for (const k of [
    "page_id",
    "bill_full_name",
    "bill_phone_number",
    "shipping_address",
    "items",
    "status",
    "warehouse_id",
    "is_free_shipping",
    "note",
    "conversation_id",
  ]) {
    assert.ok(k in pl, `payload thiếu trường "${k}" của khuôn cũ`);
  }
  assert.equal(pl.status, 12);
  assert.equal(MA_CHO_IN, 12);
  assert.deepEqual(pl.items, [{ variation_id: UUID_BT, quantity: 2 }]);
  assert.equal(typeof pl.items[0].variation_id, "string"); // KHÔNG Number() ⇒ NaN
  // RF-9 (VA-R2): `don.tongTien` ĐÃ ở đơn vị nhỏ POS (= goi_gia.gia) ⇒ KHÔNG nhân ×100
  // lần nữa. Thước cũ neo 19900 chính là lỗi thu 1.500 AED thay vì 15,00.
  assert.equal(pl.shipping_fee, 199);
  assert.equal(pl.is_free_shipping, false);
  assert.equal(pl.shipping_address.address, "Jumeirah 3, Dubai");
});

test("P2 · KNOWN-ANSWER: khuôn cũ ĐANG là status 0 — bản v3 cố ý KHÁC", () => {
  // Neo vào chính bản đang chạy. Nếu ai đó «đồng bộ» hai bên bằng cách hạ v3 về 0, hoặc
  // sửa khuôn cũ lên 12, ca này đỏ và người sau phải đọc lại 01 §1 trước khi đổi.
  const cu = fs.readFileSync("src/pancake-orders.js", "utf8");
  assert.match(
    cu,
    /status:\s*0,\s*\/\/ Mới \/ Chờ xác nhận/,
    "khuôn cũ createPancakeOrder không còn `status: 0` — đọc lại vì sao v3 dùng 12",
  );
  assert.notEqual(MA_CHO_IN, 0);
});

test("P3 · hệ số tệ: tệ LẠ ⇒ null (KHÔNG rơi về ×100 im lặng như khuôn cũ)", () => {
  assert.equal(doiSangDonViNho(199, "AED"), 19900);
  assert.equal(doiSangDonViNho(12, "KWD"), 12000);
  assert.equal(doiSangDonViNho(100, "VND"), null);
  assert.equal(doiSangDonViNho(0, "AED"), 0);
  assert.deepEqual(tachMaBienThe("123:456"), {
    shopId: "123",
    variationId: "456",
  });
  // KNOWN-ANSWER lấy từ dữ liệu THẬT (`don_hang.san_pham_ma` của cặp 501984606):
  // khoá biến thể là UUID — hàm KHÔNG được từ chối nó, nếu không 100% đơn thật chết.
  assert.deepEqual(tachMaBienThe(`1328205216:${UUID_BT}`), {
    shopId: "1328205216",
    variationId: UUID_BT,
  });
  assert.equal(tachMaBienThe("abc:456"), null); // shop_id phải là SỐ (7/7 shop)
  assert.equal(tachMaBienThe("4242"), null);
  assert.equal(tachMaBienThe("123:a b"), null);
});

// ═══ T · BỐN CỬA CỦA `taoDon` ════════════════════════════════════════════════

test("T1 · cửa (a) V3_POS_GHI vắng → LoiVanGhiDong · POST 0 lượt · nhat_ky bị chặn", async () => {
  const nap = napGia();
  await assert.rejects(
    () =>
      taoDon(
        pool,
        ctx(),
        {
          hangChoId: 900101,
          teamId: TEAM,
          market: MARKET,
          pageIdText: pageText,
          don: DON_DU,
        },
        { nap, env: DONG },
      ),
    LoiVanGhiDong,
  );
  assert.equal(nap.post, 0, "van đóng mà vẫn POST — đơn thật đã đẻ ra");
  const nk = await mot(
    `SELECT count(*)::int c FROM nhat_ky
      WHERE hanh_dong='pos_tao_don_bi_chan' AND doi_tuong_id='900101' AND ghi_chu LIKE 'cửa (a)%'`,
  );
  assert.equal(nk.c, 1);
});

test("T2 · cửa (b) thiếu san_pham_ma / kho_hang → LoiThieuThamChieuSanPham · POST 0", async () => {
  const nap = napGia();
  await assert.rejects(
    () =>
      taoDon(
        pool,
        ctx(),
        {
          hangChoId: 900102,
          teamId: TEAM,
          market: MARKET,
          pageIdText: pageText,
          don: { ...DON_DU, sanPhamMa: "", khoHang: "" },
        },
        { nap, env: MO },
      ),
    (e) => {
      assert.equal(e.name, "LoiThieuThamChieuSanPham");
      assert.deepEqual(e.thieu, ["san_pham_ma", "kho_hang"]);
      return true;
    },
  );
  assert.equal(nap.post, 0);
});

test("T2b · cửa (b) mã biến thể thuộc SHOP KHÁC → chặn (không tạo nhầm shop) · POST 0", async () => {
  const nap = napGia();
  await assert.rejects(
    () =>
      taoDon(
        pool,
        ctx(),
        {
          hangChoId: 900103,
          teamId: TEAM,
          market: MARKET,
          pageIdText: pageText,
          don: { ...DON_DU, sanPhamMa: "1111111:4242" },
        },
        { nap, env: MO },
      ),
    LoiThieuThamChieuSanPham,
  );
  assert.equal(nap.post, 0);
});

test("T3 · cửa (c)① hàng chờ đã mang don_hang_id → LoiDonDaTao · POST 0", async () => {
  const nap = napGia();
  await assert.rejects(
    () =>
      taoDon(
        pool,
        ctx(),
        {
          hangChoId: 900104,
          donHangId: 5,
          teamId: TEAM,
          market: MARKET,
          pageIdText: pageText,
          don: DON_DU,
        },
        { nap, env: MO },
      ),
    (e) => {
      assert.equal(e.name, "LoiDonDaTao");
      assert.equal(e.lop, "c1");
      return true;
    },
  );
  assert.equal(nap.post, 0);
});

test("T4 · ĐƯỜNG LÀNH: POST đúng 1 lượt · nhật ký HAI PHA đủ 2 dòng · ma_pos = shop:id", async () => {
  const nap = napGia({ idMoi: 70777 });
  const kq = await taoDon(
    pool,
    ctx(),
    {
      hangChoId: 900105,
      teamId: TEAM,
      market: MARKET,
      pageIdText: pageText,
      convId: "conv-T4",
      don: DON_DU,
    },
    { nap, env: MO },
  );
  assert.equal(nap.post, 1);
  assert.equal(kq.maPos, `${SHOP}:70777`);
  assert.equal(kq.status, 12);
  assert.equal(kq.payload.conversation_id, "conv-T4");
  const mc = await moCoiTruocPost(pool, { teamId: TEAM, hangChoId: 900105 });
  assert.deepEqual(
    { batDau: mc.batDau, ketQua: mc.ketQua, moCoi: mc.moCoi },
    { batDau: 1, ketQua: 1, moCoi: false },
  );
});

test("T5 · POS TỪ CHỐI (có phản hồi) → ném · pha 2 VẪN ghi (không mồ côi oan)", async () => {
  const nap = napGia({ httpTao: 400 });
  await assert.rejects(
    () =>
      taoDon(
        pool,
        ctx(),
        {
          hangChoId: 900106,
          teamId: TEAM,
          market: MARKET,
          pageIdText: pageText,
          don: DON_DU,
        },
        { nap, env: MO },
      ),
    LoiPosKhongTraLoi,
  );
  assert.equal(nap.post, 1);
  const mc = await moCoiTruocPost(pool, { teamId: TEAM, hangChoId: 900106 });
  assert.equal(
    mc.moCoi,
    false,
    "POS đã nói KHÔNG ⇒ kết cục biết rõ, cấm để mồ côi",
  );
});

test("T6 · MẤT PHẢN HỒI → dòng bắt-đầu MỒ CÔI, và lượt sau bị cửa (c)③ CHẶN · POST 0", async () => {
  const nap1 = napGia({ nemTao: new Error("ETIMEDOUT") });
  await assert.rejects(
    () =>
      taoDon(
        pool,
        ctx(),
        {
          hangChoId: 900107,
          teamId: TEAM,
          market: MARKET,
          pageIdText: pageText,
          don: DON_DU,
        },
        { nap: nap1, env: MO },
      ),
    LoiPosKhongTraLoi,
  );
  assert.equal(nap1.post, 1);
  const mc = await moCoiTruocPost(pool, { teamId: TEAM, hangChoId: 900107 });
  assert.deepEqual(
    { b: mc.batDau, k: mc.ketQua, m: mc.moCoi },
    {
      b: 1,
      k: 0,
      m: true,
    },
  );
  // Lượt tạo lại: KHÔNG được bắn POST thứ hai — đó là đường sinh ra kiện COD thứ hai.
  const nap2 = napGia();
  await assert.rejects(
    () =>
      taoDon(
        pool,
        ctx(),
        {
          hangChoId: 900107,
          teamId: TEAM,
          market: MARKET,
          pageIdText: pageText,
          don: DON_DU,
        },
        { nap: nap2, env: MO },
      ),
    (e) => {
      assert.equal(e.name, "LoiDonDaTao");
      assert.equal(e.lop, "c3");
      return true;
    },
  );
  assert.equal(nap2.post, 0);
});

// ═══ D · `duyet()` — §7.3 cửa ⑤ ══════════════════════════════════════════════

test("D1 · ĐƯỜNG LÀNH: duyet → 1 đơn messenger · 12/day_cho_in · so_ai +1 · POST 1", async () => {
  const { hangChoId, hoiThoai } = await dungDongChoDuyet({
    psid: "psD1",
    tinId: 910001,
  });
  const nap = napGia({ idMoi: 71001 });
  const kq = await duyet(
    pool,
    ctx(),
    { hangChoId, teamId: TEAM },
    { env: MO, nap },
  );
  assert.equal(kq.tao, true, JSON.stringify(kq.chan_vi || kq));
  assert.equal(nap.post, 1);
  assert.equal(kq.maPos, `${SHOP}:71001`);
  const don = await mot("SELECT * FROM don_hang WHERE ma_pos=$1", [kq.maPos]);
  assert.equal(don.nguon, "messenger");
  assert.equal(don.trang_thai_pos, "12");
  assert.equal(don.trang_thai_he, "day_cho_in"); // donMessengerDaTao đã chạy
  assert.equal(String(don.hoi_thoai_id), String(hoiThoai.id));
  const hc = await docHangCho(pool, ctx(), { hangChoId, teamId: TEAM });
  assert.equal(hc.trang_thai, "da_duyet");
  assert.equal(String(hc.don_hang_id), String(don.id));
  assert.equal(hc.cua_kiem.cong["5_tao_don"].da_chay, true);
  const sa = await mot(
    "SELECT count(*)::int c FROM so_ai WHERE nguon_tep='hang_cho_tao_don:order' AND nguon_dong=$1",
    [Number(hangChoId)],
  );
  assert.equal(sa.c, 1);
});

test("D2 · IDEMPOTENT tuần tự: duyet lần hai bị chặn · POST 0 · vẫn ĐÚNG 1 đơn", async () => {
  const truoc = await mot("SELECT count(*)::int c FROM don_hang");
  const { hangChoId } = await dungDongChoDuyet({ psid: "psD2", tinId: 910002 });
  const n1 = napGia({ idMoi: 71002 });
  await duyet(pool, ctx(), { hangChoId, teamId: TEAM }, { env: MO, nap: n1 });
  const n2 = napGia({ idMoi: 71003 });
  await assert.rejects(
    () => duyet(pool, ctx(), { hangChoId, teamId: TEAM }, { env: MO, nap: n2 }),
    LoiHangChoDaXuLy,
  );
  assert.equal(n2.post, 0);
  const sau = await mot("SELECT count(*)::int c FROM don_hang");
  assert.equal(sau.c - truoc.c, 1);
});

test("D3 · RACE: hai lượt duyet SONG SONG cùng hangChoId → ĐÚNG 1 POST, ĐÚNG 1 đơn", async () => {
  const truoc = await mot("SELECT count(*)::int c FROM don_hang");
  const { hangChoId } = await dungDongChoDuyet({ psid: "psD3", tinId: 910003 });
  const nA = napGia({ idMoi: 71004 });
  const nB = napGia({ idMoi: 71005 });
  const [a, b] = await Promise.allSettled([
    duyet(pool, ctx(), { hangChoId, teamId: TEAM }, { env: MO, nap: nA }),
    duyet(pool, ctx(), { hangChoId, teamId: TEAM }, { env: MO, nap: nB }),
  ]);
  const trang = [a, b].map((x) => x.status);
  assert.equal(
    trang.filter((s) => s === "fulfilled").length,
    1,
    `hai lượt song song: ${JSON.stringify(trang)}`,
  );
  const hong = [a, b].find((x) => x.status === "rejected");
  assert.equal(hong.reason.name, "LoiHangChoDaXuLy");
  assert.equal(nA.post + nB.post, 1, "POST bắn 2 lượt = 2 kiện COD thật");
  const sau = await mot("SELECT count(*)::int c FROM don_hang");
  assert.equal(sau.c - truoc.c, 1);
});

test("D4 · CHẶN: thiếu trường → duyet chặn cửa ① · POST 0 · dòng vẫn cho_duyet", async () => {
  const { hangChoId } = await dungDongChoDuyet({
    psid: "psD4",
    tinId: 910004,
    hoSo: { ...HO_SO_DU, sdt: "", dia_chi: "" },
  });
  const nap = napGia();
  const kq = await duyet(
    pool,
    ctx(),
    { hangChoId, teamId: TEAM },
    { env: MO, nap },
  );
  assert.equal(kq.tao, false);
  assert.equal(kq.chan, true);
  assert.equal(kq.posGoi, 0);
  assert.equal(nap.post, 0);
  assert.ok(kq.chan_vi.some((x) => x.includes("thieu_truong")));
  const hc = await docHangCho(pool, ctx(), { hangChoId, teamId: TEAM });
  assert.equal(hc.trang_thai, "cho_duyet"); // dòng bị chặn KHÔNG bị đóng
  const nk = await mot(
    "SELECT count(*)::int c FROM nhat_ky WHERE hanh_dong='hang_cho_duyet_bi_chan' AND doi_tuong_id=$1",
    [String(hangChoId)],
  );
  assert.equal(nk.c, 1);
});

test("D5 · boSung: sale điền nốt SĐT/địa chỉ → CHẠY LẠI cửa ① rồi đi tiếp, tạo được đơn", async () => {
  const { hangChoId } = await dungDongChoDuyet({
    psid: "psD5",
    tinId: 910005,
    hoSo: { ...HO_SO_DU, sdt: "", dia_chi: "" },
  });
  const nap = napGia({ idMoi: 71006 });
  const kq = await duyet(
    pool,
    ctx(),
    {
      hangChoId,
      teamId: TEAM,
      boSung: { sdt: "+971500000999", dia_chi: "Marina 5" },
    },
    { env: MO, nap },
  );
  assert.equal(kq.tao, true, JSON.stringify(kq.chan_vi || kq));
  assert.equal(nap.post, 1);
  assert.equal(kq.payload.bill_phone_number, "+971500000999");
  assert.equal(kq.payload.shipping_address.address, "Marina 5, Dubai");
});

test("D6 · CHẶN vì TRÙNG: POS SỐNG đã có đơn của hội thoại → duyet chặn · POST 0", async () => {
  const { hangChoId } = await dungDongChoDuyet({ psid: "psD6", tinId: 910006 });
  const nap = napGia({
    donGet: [{ id: 60001, status: 0, conversation_id: "conv-psD6" }],
  });
  const kq = await duyet(
    pool,
    ctx(),
    { hangChoId, teamId: TEAM },
    { env: MO, nap },
  );
  assert.equal(kq.tao, false);
  assert.equal(nap.post, 0);
  assert.ok(
    kq.chan_vi.some((x) => x.includes("b_pos_song")),
    kq.chan_vi.join(),
  );
});

test("D7 · CHẶN vì UNKNOWN: kiemTrung ném → duyet chặn (unknown = ĐÓNG) · POST 0", async () => {
  const { hangChoId } = await dungDongChoDuyet({ psid: "psD7", tinId: 910007 });
  const nap = napGia();
  const kq = await duyet(
    pool,
    ctx(),
    { hangChoId, teamId: TEAM },
    {
      env: MO,
      nap,
      kiemTrung: async () => {
        throw new Error("CSDL đứt");
      },
    },
  );
  assert.equal(kq.tao, false);
  assert.equal(nap.post, 0);
  assert.ok(kq.chan_vi.some((x) => x.includes("unknown_la_dong")));
});

test("D8 · van ĐÓNG (V3_POS_GHI vắng): duyet qua hết cửa vẫn KHÔNG tạo · POST 0", async () => {
  const { hangChoId } = await dungDongChoDuyet({ psid: "psD8", tinId: 910008 });
  const nap = napGia();
  await assert.rejects(
    () => duyet(pool, ctx(), { hangChoId, teamId: TEAM }, { env: DONG, nap }),
    LoiVanGhiDong,
  );
  assert.equal(nap.post, 0);
  const hc = await docHangCho(pool, ctx(), { hangChoId, teamId: TEAM });
  assert.equal(hc.trang_thai, "cho_duyet"); // ROLLBACK: không nửa vời
  const dem = await mot(
    "SELECT count(*)::int c FROM don_hang WHERE hoi_thoai_id=$1",
    [hc.hoi_thoai_id],
  );
  assert.equal(dem.c, 0);
});

test("D9 · duyet SAU KHI loai → chặn (trạng thái dòng) · POST 0", async () => {
  const { hangChoId } = await dungDongChoDuyet({ psid: "psD9", tinId: 910009 });
  await loai(pool, ctx(), {
    hangChoId,
    teamId: TEAM,
    lyDo: "khách đổi ý trong chat",
  });
  const nap = napGia();
  await assert.rejects(
    () => duyet(pool, ctx(), { hangChoId, teamId: TEAM }, { env: MO, nap }),
    (e) => {
      assert.equal(e.name, "LoiHangChoDaXuLy");
      assert.equal(e.trangThai, "tu_choi");
      return true;
    },
  );
  assert.equal(nap.post, 0);
});
