// VA-R2 · Cụm tiền + tạo đơn: đơn vị tiền (RF-9) · mã 8 (RF-10) · phân trang (RF-11) ·
// idempotent POST-rollback (RF-12) · khoá hội thoại (RF-21) · san_pham.page_id (RF-15).
// Sổ điều hành §9/§9b (23/08). Thước gốc: refute-tong-the-1.repro.mjs F1·F3·F4·F6.
//
// Sandbox riêng (`aicloser_v3_test_var2`), tự dựng tự dọn — cùng khuôn test/va-r3-*.
// KHÔNG một byte ra mạng POS: mọi `fetch` đi qua `nap` tiêm; `V3_POS_GHI` chỉ nằm trong
// OBJECT env truyền vào deps (khuôn `MO` của l1-m1-ghi-nguoc), KHÔNG đụng process.env.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { dungSandbox } from "../db/sandbox.js";
import { maHoa } from "../db/khoa.js";
import { ctxHeThong } from "../src/db/index.js";
import {
  vaoHangCho,
  duyet,
  docHangCho,
  cua2Tien,
  nguonB_posSong,
  chuanHoaHoSo,
  quyTongTienNho,
} from "../src/orders/hang-cho.js";
import { MA_HOAN } from "../src/orders/ti-le-hoan.js";
import { donMessengerDaTao } from "../src/orders/may-trang-thai.js";
import { docDanhMuc } from "../src/pos/doc-danh-muc.js";
import {
  taoDon,
  dungPayload,
  phiVanChuyenMinor,
  HE_SO_TE,
  LoiDonDaTao,
} from "../src/pos/tao-don.js";

const KHOA = { V3_KHOA_MA_HOA: "d".repeat(64) };
const MO = { ...KHOA, V3_POS_GHI: "1" };
const SHOP = "9995002";
const MARKET = "GiaLapVaR2";
const ctx = () => ctxHeThong();

let sb, pool, TEAM, pageId;
const pageText = "555000999777";
const q = (s, p) => pool.query(s, p);
const mot = async (s, p) => (await q(s, p)).rows[0];

before(async () => {
  sb = await dungSandbox("var2");
  pool = sb.pool;
  TEAM = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
  pageId = (
    await mot(
      `INSERT INTO page (team_id,page_id,ten,thi_truong,pos_shop_id)
       VALUES ($1,$2,'P','X',$3) RETURNING *`,
      [TEAM, pageText, SHOP],
    )
  ).id;
  await q(
    "INSERT INTO ket_noi_pos (team_id,market,shop_id,api_key_ma) VALUES ($1,$2,$3,$4)",
    [TEAM, MARKET, SHOP, maHoa("khoa-gia-lap", KHOA)],
  );
  // Bảng giá SEED TAY (đơn vị NHỎ, khai tường minh ở migration 007) để cửa ② mở.
  const sp = await mot(
    "INSERT INTO san_pham (team_id,page_id,ma,ten) VALUES ($1,$2,$3,'SP') RETURNING id",
    [TEAM, pageId, `${SHOP}:v-uuid-1`],
  );
  await q(
    "INSERT INTO goi_gia (team_id,san_pham_id,so_luong,gia,tien_te) VALUES ($1,$2,1,1500,'AED')",
    [TEAM, sp.id],
  );
});
after(async () => {
  if (sb) await sb.don();
});

/** fetch giả: GET đơn trả `ds`, POST tạo đơn đếm + giữ payload. */
function napTao(id0 = 700, ds = []) {
  let n = id0;
  const f = async (url, o = {}) => {
    if (o.method === "POST") {
      f.post++;
      f.payloads.push(JSON.parse(o.body));
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: { id: n++ } }),
      };
    }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: ds, total_entries: ds.length }),
    };
  };
  f.post = 0;
  f.payloads = [];
  return f;
}
async function hoiThoai(psid, conv, tinIds = [1]) {
  const h = await mot(
    `INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu)
     VALUES ($1,$2,$3,'SELLING','AI') RETURNING *`,
    [TEAM, pageId, psid],
  );
  for (const t of tinIds)
    await q(
      `INSERT INTO tin_cho_xu_ly (team_id,page_id,psid,conv_id,msg_id,noi_dung,trang_thai)
       VALUES ($1,$2,$3,$4,$5,'ok deal','xong')`,
      [TEAM, pageText, psid, conv, `m${psid}-${t}`],
    );
  return h;
}
const HO_SO = {
  ten: "Ali R2",
  sdt: "+971500000201",
  dia_chi: "Street 9",
  thanh_pho: "Dubai",
  so_luong: 1,
  tong_tien: 1500, // tên cột v3 = ĐƠN VỊ NHỎ (15,00 AED)
  tien_te: "AED",
  san_pham_ma: `${SHOP}:v-uuid-1`,
  kho_hang: "kho-1",
};
const DON = {
  ten: "A",
  sdt: "+971500000000",
  diaChi: "X",
  thanhPho: "Dubai",
  soLuong: 1,
  sanPhamMa: `${SHOP}:v-uuid-1`,
  khoHang: "kho-1",
};

// ═══ RF-9 · ĐƠN VỊ TIỀN — một nguồn, HE_SO_TE đúng MỘT lần, đa tệ ════════════

test("R2-1 · RF-9: tongTien ĐÃ minor ⇒ shipping_fee = chính nó, KHÔNG nhân HE_SO_TE (quét HẾT tệ trong bảng)", () => {
  const bang = [];
  for (const [te, he] of Object.entries(HE_SO_TE)) {
    const minor = 15 * he; // 15,00 <tệ> ở đơn vị nhỏ
    const pl = dungPayload({
      pageIdText: pageText,
      convId: "c",
      don: { ...DON, tongTien: minor, tienTe: te },
      variationId: "v-uuid-1",
      khoHang: "kho-1",
    });
    bang.push(`${te} ×${he}: minor=${minor} → shipping_fee=${pl.shipping_fee}`);
    assert.equal(pl.shipping_fee, minor, `${te}: thu ×${he} lần nữa`);
  }
  console.log("   " + bang.join("\n   "));
  // 16/09: neo cũ là `bang.some(x => x.includes("×1000"))` — nó chết theo phiếu vá hệ số
  // (KWD·OMR·BHD 1000→100, đo từ đơn thật). Ý ĐỒ của neo ấy là «bộ ca có quét NHIỀU tệ,
  // không phải một tệ rồi khoe là đa tệ». Giữ nguyên ý đồ, đổi phép đo: đếm TỪ NGUỒN
  // (`HE_SO_TE`), không gõ cứng số tệ cũng không gõ cứng hệ số (án lệ ② + ④).
  assert.equal(
    bang.length,
    Object.keys(HE_SO_TE).length,
    "phải quét HẾT tệ trong bảng, không bỏ tệ nào",
  );
  assert.ok(bang.length >= 7, `bảng tệ teo lại còn ${bang.length} — quét thế này không chứng minh được đa tệ`);
  assert.equal(
    phiVanChuyenMinor(1500, "XYZ"),
    null,
    "tệ lạ ⇒ null (fail-CLOSED)",
  );
  assert.equal(phiVanChuyenMinor(0, "AED"), 0);
});

test("R2-2 · RF-9: cửa vào khai đơn vị theo TÊN KHOÁ — khuôn cũ total_price (lớn) ×HE_SO_TE MỘT lần khi biết tệ; tong_tien (v3) giữ nguyên", () => {
  assert.equal(
    chuanHoaHoSo({ total_price: 15, currency: "AED" }).tong_tien,
    1500,
  );
  assert.equal(
    chuanHoaHoSo({ total_price: 15, currency: "KWD" }).tong_tien,
    1500, // 16/09: hệ số KWD 1000→100 (đo đơn thật) ⇒ 15 KWD = 1500 minor, không phải 15000
  );
  assert.equal(
    chuanHoaHoSo({ tong_tien: 1500, tien_te: "AED" }).tong_tien,
    1500,
  );
  // Không tệ ⇒ KHÔNG đoán ×100: tong_tien null (cửa ① báo thiếu), giữ tong_tien_lon.
  const mu = chuanHoaHoSo({ total_price: 15 });
  assert.equal(mu.tong_tien, null);
  assert.equal(mu.tong_tien_lon, 15);
  // Sale bổ sung tệ sau ⇒ quy được, và chỉ quy khi tong_tien còn null (không nhân đúp).
  assert.equal(quyTongTienNho({ ...mu, tien_te: "SAR" }).tong_tien, 1500);
  assert.equal(
    quyTongTienNho({ tong_tien: 1500, tong_tien_lon: 15, tien_te: "AED" })
      .tong_tien,
    1500,
  );
});

test("R2-3 · RF-9 đường thật: duyet → payload shipping_fee=1500 (15,00 AED) và don_hang.tong_tien=1500 AED cùng đơn vị goi_gia.gia", async () => {
  const h = await hoiThoai("psR23", "convR23");
  const nap = napTao(810);
  const v = await vaoHangCho(
    pool,
    ctx(),
    {
      hoiThoaiId: h.id,
      teamId: TEAM,
      convId: "convR23",
      tinId: 920301,
      hoSo: HO_SO,
    },
    { nap, env: KHOA },
  );
  const d = await duyet(
    pool,
    ctx(),
    { hangChoId: v.id, teamId: TEAM },
    { nap, env: MO, taoDon },
  );
  assert.equal(d.tao, true);
  assert.equal(nap.payloads[0].shipping_fee, 1500);
  const dh = await mot(
    "SELECT tong_tien::int tong_tien, tien_te FROM don_hang WHERE ma_pos=$1",
    [d.maPos],
  );
  const gg = await mot(
    "SELECT gia::int gia FROM goi_gia WHERE team_id=$1 LIMIT 1",
    [TEAM],
  );
  console.log(
    `   payload=${nap.payloads[0].shipping_fee} · don_hang.tong_tien=${dh.tong_tien} ${dh.tien_te} · goi_gia.gia=${gg.gia}`,
  );
  assert.equal(dh.tong_tien, 1500);
  assert.equal(dh.tien_te, "AED");
  assert.equal(dh.tong_tien, gg.gia);
});

// ═══ RF-10 · MÃ 8 = packing, KHÔNG phải huỷ — một nguồn MA_HOAN ═══════════════

test("R2-4 · RF-10: POS status 8 (packing) ⇒ nguồn(b) DUONG, không sach; MA_HOAN = {4,5,6,7} không có 8", async () => {
  assert.deepEqual([...MA_HOAN].map(Number).sort(), [4, 5, 6, 7]);
  const ket = {};
  for (const st of [8, 6, 2]) {
    const r = await nguonB_posSong(
      pool,
      ctx(),
      { teamId: TEAM, market: MARKET, convId: "convR24" },
      {
        nap: napTao(1, [{ id: 991, status: st, conversation_id: "convR24" }]),
        env: KHOA,
      },
    );
    ket[st] = r.ket;
  }
  console.log(`   status→nguồn(b): ${JSON.stringify(ket)}`);
  assert.equal(ket[8], "duong", "packing phải là ĐÃ CÓ ĐƠN");
  assert.equal(ket[6], "sach", "huỷ ⇒ sạch");
  assert.equal(ket[2], "duong");
});

// ═══ RF-11 · PHÂN TRANG tới hết, chạm trần ⇒ unknown ═════════════════════════

test("R2-5 · RF-11: đơn ở TRANG 2 bắt được; POS nhiều trang hơn trần ⇒ unknown, KHÔNG sach", async () => {
  const trang1 = Array.from({ length: 100 }, (_, i) => ({
    id: 50000 + i,
    status: 2,
    conversation_id: `k-${i}`,
  }));
  let goi = 0;
  const nap = async (url) => {
    goi++;
    const p = new URL(url).searchParams.get("page_number");
    const ds =
      p === "2"
        ? [{ id: 49999, status: 2, conversation_id: "convR25" }]
        : trang1;
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ data: ds, total_entries: 101, total_pages: 2 }),
    };
  };
  const r = await nguonB_posSong(
    pool,
    ctx(),
    { teamId: TEAM, market: MARKET, convId: "convR25" },
    { nap, env: KHOA },
  );
  console.log(`   trang 2: ket=${r.ket} · gọi API=${goi} · ${r.chi_tiet}`);
  assert.equal(r.ket, "duong");
  assert.equal(goi, 2);

  // Trần: POS khai 5 trang, trần quét 2, đơn KHÔNG có ở 2 trang đầu ⇒ unknown.
  let goi2 = 0;
  const napNhieu = async () => {
    goi2++;
    return {
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ data: trang1, total_entries: 500, total_pages: 5 }),
    };
  };
  const r2 = await nguonB_posSong(
    pool,
    ctx(),
    { teamId: TEAM, market: MARKET, convId: "convR25x" },
    { nap: napNhieu, env: KHOA, soTrangToiDa: 2 },
  );
  console.log(`   chạm trần: ket=${r2.ket} · gọi API=${goi2} · ${r2.chi_tiet}`);
  assert.equal(r2.ket, "unknown");
  assert.equal(goi2, 2);
});

// ═══ RF-12 · POST thành công rồi ROLLBACK ⇒ lượt sau KHÔNG POST lại ═══════════

test("R2-6 · RF-12: POST OK rồi giao dịch rollback → bấm lại = 1 POST (chặn c3b); UNIQUE 007 cấm hai ket_qua mang ma_pos", async () => {
  const h = await hoiThoai("psR26", "convR26");
  const nap = napTao(820);
  const v = await vaoHangCho(
    pool,
    ctx(),
    {
      hoiThoaiId: h.id,
      teamId: TEAM,
      convId: "convR26",
      tinId: 920601,
      hoSo: { ...HO_SO, sdt: "+971500000206" },
    },
    { nap, env: KHOA },
  );
  let lan = 0;
  const hongSauPost = async (...a) => {
    if (++lan === 1) throw new Error("giả lập: hỏng SAU khi POST đã bay đi");
    return donMessengerDaTao(...a);
  };
  await assert.rejects(
    duyet(
      pool,
      ctx(),
      { hangChoId: v.id, teamId: TEAM },
      { nap, env: MO, taoDon, donMessengerDaTao: hongSauPost },
    ),
    /hỏng SAU khi POST/,
  );
  const dong = await docHangCho(pool, ctx(), { hangChoId: v.id, teamId: TEAM });
  assert.equal(dong.trang_thai, "cho_duyet");
  assert.equal(dong.don_hang_id, null);
  await assert.rejects(
    duyet(
      pool,
      ctx(),
      { hangChoId: v.id, teamId: TEAM },
      { nap, env: MO, taoDon, donMessengerDaTao: hongSauPost },
    ),
    (e) => e instanceof LoiDonDaTao && e.lop === "c3b",
  );
  console.log(`   POST tổng sau 2 lượt duyệt = ${nap.post}`);
  assert.equal(nap.post, 1);

  // Chốt cứng DB: index partial 007 — dòng ket_qua thứ hai mang ma_pos cùng hàng chờ bị từ chối.
  await assert.rejects(
    q(
      `INSERT INTO nhat_ky (team_id,tac_nhan,hanh_dong,doi_tuong,doi_tuong_id,sau)
       VALUES ($1,'test','pos_tao_don_ket_qua','hang_cho_tao_don',$2,$3)`,
      [TEAM, String(v.id), JSON.stringify({ ma_pos: "x:1" })],
    ),
    (e) => e.code === "23505",
  );
  // ket_qua KHÔNG mang ma_pos (POS từ chối) vẫn được ghi — cho thử lại.
  await q(
    `INSERT INTO nhat_ky (team_id,tac_nhan,hanh_dong,doi_tuong,doi_tuong_id,sau)
     VALUES ($1,'test','pos_tao_don_ket_qua','hang_cho_tao_don',$2,$3)`,
    [TEAM, String(v.id), JSON.stringify({ loi: "pos tu choi" })],
  );
});

// ═══ RF-21 · KHOÁ THEO HỘI THOẠI ═════════════════════════════════════════════

test("R2-7 · RF-21: 2 hàng chờ CÙNG hội thoại + 2 duyet song song ⇒ đúng 1 đơn POS", async () => {
  const h = await hoiThoai("psR27", "convR27", [1, 2]);
  const nap = napTao(830);
  const v1 = await vaoHangCho(
    pool,
    ctx(),
    {
      hoiThoaiId: h.id,
      teamId: TEAM,
      convId: "convR27",
      tinId: 920701,
      hoSo: { ...HO_SO, sdt: "+971500000207" },
    },
    { nap, env: KHOA },
  );
  const v2 = await vaoHangCho(
    pool,
    ctx(),
    {
      hoiThoaiId: h.id,
      teamId: TEAM,
      convId: "convR27",
      tinId: 920702,
      hoSo: { ...HO_SO, sdt: "+971500000207" },
    },
    { nap, env: KHOA },
  );
  assert.notEqual(v1.id, v2.id);
  const kq = await Promise.allSettled([
    duyet(
      pool,
      ctx(),
      { hangChoId: v1.id, teamId: TEAM },
      { nap, env: MO, taoDon },
    ),
    duyet(
      pool,
      ctx(),
      { hangChoId: v2.id, teamId: TEAM },
      { nap, env: MO, taoDon },
    ),
  ]);
  const tao = kq.filter(
    (r) => r.status === "fulfilled" && r.value.tao === true,
  ).length;
  const chan = kq.filter(
    (r) => r.status === "fulfilled" && r.value.chan === true,
  ).length;
  const donSo = (
    await mot("SELECT count(*)::int n FROM don_hang WHERE hoi_thoai_id=$1", [
      h.id,
    ])
  ).n;
  console.log(
    `   song song: tao=${tao} chan=${chan} · POST=${nap.post} · don_hang của hội thoại=${donSo}`,
  );
  assert.equal(nap.post, 1, "đúng MỘT lượt POST");
  assert.equal(donSo, 1);
  assert.equal(tao, 1);
});

// ═══ RF-15 · san_pham.page_id sau docDanhMuc ⇒ cua2Tien thấy giá POS ══════════

test("R2-8 · RF-15: docDanhMuc ghi san_pham.page_id (shop 1 page) ⇒ cua2Tien thấy dòng giá POS; gia ghi minor", async () => {
  const napBT = async () => ({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        data: [
          {
            id: "v-uuid-9",
            retail_price: 2500,
            remain_quantity: 5,
            product: { name: "Áo" },
          },
        ],
        total_entries: 1,
      }),
  });
  const dm = await docDanhMuc(
    pool,
    ctx(),
    { shop: MARKET, teamId: TEAM, tienTe: "AED" },
    { nap: napBT, env: KHOA },
  );
  const sp = await mot("SELECT page_id FROM san_pham WHERE ma=$1", [
    `${SHOP}:v-uuid-9`,
  ]);
  console.log(
    `   docDanhMuc them=${dm.them} pageCuaShop=${dm.pageCuaShop} pageMoHo=${dm.pageMoHo} → san_pham.page_id=${sp.page_id}`,
  );
  assert.equal(sp.page_id, pageId);
  assert.equal(dm.pageMoHo, 0);
  const c2 = await cua2Tien(pool, {
    teamId: TEAM,
    pageId,
    duLieu: chuanHoaHoSo({ tong_tien: 2500, so_luong: 1, tien_te: "AED" }),
  });
  assert.ok(
    c2.bang_gia.some((g) => Number(g.gia) === 2500),
    "cửa ② phải thấy 2500 vừa nạp",
  );
  assert.equal(c2.qua, true);
  // Cùng cửa, khuôn cũ bộ não «25 AED» (lớn) cũng khớp — vì cửa vào đã quy một lần.
  const c2b = await cua2Tien(pool, {
    teamId: TEAM,
    pageId,
    duLieu: chuanHoaHoSo({ total_price: 25, qty: 1, currency: "AED" }),
  });
  assert.equal(c2b.qua, true);
});

test('Legacy → duyệt V3: hai lượt đồng thời và retry chỉ POST một đơn', async () => {
  const { taoDonTuLegacy } = await import('../src/orders/legacy.js');
  await hoiThoai('psLegacyUnified', 'convLegacyUnified');
  const nap = napTao(9810);
  const input = { name: 'Ali', phone: '+971500000207', address: 'Street 9 Dubai', city: 'Dubai',
    qty: 1, total_price: 15, currency: 'AED', cod_confirmed: true, kho_hang: 'kho-1' };
  const deps = { pool, hangCho: { nap, env: MO, taoDon } };
  const results = await Promise.all([
    taoDonTuLegacy(pageText, input, 'convLegacyUnified', deps),
    taoDonTuLegacy(pageText, input, 'convLegacyUnified', deps),
  ]);
  assert.ok(results.some(r => r.ok), JSON.stringify(results));
  const retry = await taoDonTuLegacy(pageText, input, 'convLegacyUnified', deps);
  assert.equal(retry.ok, true, JSON.stringify(retry));
  assert.equal(retry.dedup, true);
  assert.equal(nap.post, 1);
  assert.equal(nap.payloads[0].status, 12);
  assert.equal(nap.payloads[0].shipping_fee, 1500);
  const count = await mot("SELECT count(*)::int n FROM hang_cho_tao_don WHERE du_lieu_don->>'conv_id'=$1", ['convLegacyUnified']);
  assert.equal(count.n, 1);
});

test('Legacy từ chối giá ngoài DB và thiếu kho không tự đoán từ đơn cũ', async () => {
  const { taoDonTuLegacy } = await import('../src/orders/legacy.js');
  await hoiThoai('psLegacyInvalid', 'convLegacyInvalid');
  const nap = napTao(9820);
  const input = { name: 'Ali', phone: '+971500000208', address: 'Street 9 Dubai', city: 'Dubai',
    qty: 1, total_price: 1, currency: 'AED', cod_confirmed: true };
  const deps = { pool, hangCho: { nap, env: MO, taoDon } };
  const wrong = await taoDonTuLegacy(pageText, input, 'convLegacyInvalid', deps);
  assert.equal(wrong.ok, false);
  assert.match(wrong.error, /gói giá DB/);
  const noWarehouse = await taoDonTuLegacy(pageText, { ...input, total_price: 15 }, 'convLegacyInvalid', deps);
  assert.equal(noWarehouse.ok, false);
  assert.equal(nap.post, 0);
});

test('Page thay thế dùng giá sản phẩm gốc đúng shop, không nhận SKU thị trường khác', async () => {
  await q("INSERT INTO san_pham_goc(team_id,ma_goc,ten) VALUES ($1,'unified-test','Shared product')", [TEAM]);
  await q('UPDATE san_pham SET ma_goc=$1 WHERE team_id=$2 AND ma=$3', ['unified-test', TEAM, `${SHOP}:v-uuid-1`]);
  const replacement = await mot(`INSERT INTO page(team_id,page_id,ten,pos_shop_id,san_pham_goc_ma)
    VALUES ($1,'unified-replacement','New Page',$2,'unified-test') RETURNING id`, [TEAM, SHOP]);
  const good = await cua2Tien(pool, { teamId: TEAM, pageId: replacement.id, duLieu: HO_SO });
  assert.equal(good.qua, true);
  const wrong = await cua2Tien(pool, { teamId: TEAM, pageId: replacement.id,
    duLieu: { ...HO_SO, san_pham_ma: 'another-shop:v-uuid-1' } });
  assert.equal(wrong.qua, false);
  await q('UPDATE page SET pos_shop_id=$1 WHERE id=$2', ['another-shop', replacement.id]);
  assert.equal((await cua2Tien(pool, { teamId: TEAM, pageId: replacement.id, duLieu: HO_SO })).qua, false);
});
