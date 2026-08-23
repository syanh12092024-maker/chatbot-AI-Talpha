// BẰNG CHỨNG CHẠY ĐƯỢC cho refute-tong-the-1.verdict.yaml (MẢNG 1/5 — đường tiền/đơn).
// Chạy TỪ GỐC REPO:  node docs/thi-cong/nhat-ky/refute-tong-the-1.repro.mjs
//
// KHÔNG một byte nào ra mạng POS: mọi lượt `fetch` đi qua `nap` TIÊM. `V3_POS_GHI` chỉ
// được đặt trong OBJECT env truyền vào deps (khuôn `MO` của test/l1-m1-ghi-nguoc.test.js),
// KHÔNG đụng `process.env`. CSDL: sandbox tự dựng/tự dọn — KHÔNG chạm `aicloser_v3`.
//
// Bảy kịch bản, mỗi cái in một dòng «KỲ VỌNG» — 🔴 = phá được.
import { dungSandbox } from "../../../db/sandbox.js";
import { maHoa } from "../../../db/khoa.js";
import { ctxHeThong } from "../../../src/db/index.js";
import {
  vaoHangCho,
  duyet,
  docHangCho,
  cua2Tien,
  nguonB_posSong,
  chuanHoaHoSo,
} from "../../../src/orders/hang-cho.js";
import { quetDonMoi } from "../../../src/orders/quet-don-moi.js";
import {
  apDung,
  nhanPhanHoi,
  donMessengerDaTao,
} from "../../../src/orders/may-trang-thai.js";
import { docDanhMuc } from "../../../src/pos/doc-danh-muc.js";
import { taoDon } from "../../../src/pos/tao-don.js";
import { LoiSaiNguonDon } from "../../../src/channels/whatsapp/index.js";

const KHOA = { V3_KHOA_MA_HOA: "c".repeat(64) };
const MO = { ...KHOA, V3_POS_GHI: "1" }; // van MỞ chỉ trong object env tiêm
const SHOP = "9995001";
const MARKET = "GiaLapRefute1";
const ctx = () => ctxHeThong();

const sb = await dungSandbox("refute_tongthe1");
const pool = sb.pool;
const q = (s, p) => pool.query(s, p);
const mot = async (s, p) => (await q(s, p)).rows[0];
const ok = (b) => (b ? "✅" : "🔴");
const P = (s) => console.log(s);

const TEAM = (await mot("SELECT id FROM team WHERE slug='tieu-alpha'")).id;
const pageText = "555000999888";
const pageId = (
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
// san_pham + goi_gia SEED TAY (có page_id) để cửa ② mở được — xem F3a vì sao cửa POS
// tự nạp thì KHÔNG BAO GIỜ mở.
const spSeed = await mot(
  "INSERT INTO san_pham (team_id,page_id,ma,ten) VALUES ($1,$2,$3,'SP') RETURNING id",
  [TEAM, pageId, `${SHOP}:v-uuid-1`],
);
await q(
  "INSERT INTO goi_gia (team_id,san_pham_id,so_luong,gia,tien_te) VALUES ($1,$2,1,150,'AED')",
  [TEAM, spSeed.id],
);

function napDon(ds = []) {
  const f = async () => {
    f.dem++;
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: ds, total_entries: ds.length }),
    };
  };
  f.dem = 0;
  return f;
}
function napTao(id0 = 700) {
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
      text: async () => JSON.stringify({ data: [], total_entries: 0 }),
    };
  };
  f.post = 0;
  f.payloads = [];
  return f;
}
async function hoiThoai(psid, conv) {
  const h = await mot(
    `INSERT INTO hoi_thoai (team_id,page_id,psid,trang_thai,chu_so_huu)
     VALUES ($1,$2,$3,'SELLING','AI') RETURNING *`,
    [TEAM, pageId, psid],
  );
  await q(
    `INSERT INTO tin_cho_xu_ly (team_id,page_id,psid,conv_id,msg_id,noi_dung,trang_thai)
     VALUES ($1,$2,$3,$4,$5,'ok deal','xong')`,
    [TEAM, pageText, psid, conv, `m${psid}`],
  );
  return h;
}
const HO_SO = {
  ten: "Ali Refute",
  sdt: "+971500000777",
  dia_chi: "Street 9",
  thanh_pho: "Dubai",
  so_luong: 1,
  tong_tien: 150,
  tien_te: "AED",
  san_pham_ma: `${SHOP}:v-uuid-1`,
  kho_hang: "kho-1",
};

// ═══ F1 · mã 8 (packing) bị đọc thành «đã hủy» ⇒ TẠO ĐƠN TRÙNG ══════════════
P("\n═══ F1 · hang-cho.js:105 HUY_HOAN chứa '8' ⇒ đơn ĐANG ĐÓNG GÓI đọc thành «sạch» ═══");
{
  const h = await hoiThoai("psF1", "convF1");
  for (const st of [2, 8, 6]) {
    const r = await nguonB_posSong(
      pool,
      ctx(),
      { teamId: TEAM, market: MARKET, convId: "convF1" },
      {
        nap: napDon([{ id: 991, status: st, conversation_id: "convF1" }]),
        env: KHOA,
      },
    );
    P(`   POS live status=${st} (${st === 8 ? "packing — BƯỚC TIẾN" : st === 2 ? "shipped" : "canceled"}) → nguồn(b) = ${r.ket}`);
  }
  const nap8 = napDon([{ id: 991, status: 8, conversation_id: "convF1" }]);
  const v = await vaoHangCho(
    pool,
    ctx(),
    { hoiThoaiId: h.id, teamId: TEAM, hoSo: HO_SO, convId: "convF1", tinId: 910001 },
    { nap: nap8, env: KHOA },
  );
  const spy = { post: 0 };
  const d = await duyet(
    pool,
    ctx(),
    { hangChoId: v.id, teamId: TEAM },
    {
      nap: nap8,
      env: KHOA,
      taoDon: async () => {
        spy.post++;
        return {
          maPos: `${SHOP}:992`,
          idPos: "992",
          shopId: SHOP,
          market: MARKET,
          status: 12,
          nhanStatus: "wait_print",
          payload: {},
          idBatDau: "1",
        };
      },
    },
  );
  P(`   duyet() → tao=${d.tao} chan_vi=${JSON.stringify(d.chan_vi ?? [])} · lượt tạo đơn POS = ${spy.post}`);
  P(`   ${ok(spy.post === 0)} KỲ VỌNG: 0 lượt tạo — POS đang ĐÓNG GÓI đơn của chính hội thoại này`);
}

// ═══ F2 · đơn KẸT vĩnh viễn ở `cho_gui_wa` ══════════════════════════════════
P("\n═══ F2 · quet-don-moi.js:179 ném lại ⇒ đơn nằm chết ở `cho_gui_wa`, không ai quét lại ═══");
{
  const k = await mot(
    "INSERT INTO khach (team_id,so_dien_thoai,ten) VALUES ($1,'971500000123','K') RETURNING id",
    [TEAM],
  );
  const d = await mot(
    `INSERT INTO don_hang (team_id,ma_pos,nguon,trang_thai_he,trang_thai_pos,khach_id,page_id)
     VALUES ($1,$2,'trang_ban_hang','moi_tu_pos','0',$3,$4) RETURNING *`,
    [TEAM, `${SHOP}:8001`, k.id, pageId],
  );
  const guiTinMau = async () => {
    throw new LoiSaiNguonDon("giả lập: cửa WA phán đơn đi nhầm nhánh");
  };
  const r1 = await quetDonMoi(pool, {}, { guiTinMau });
  const s1 = await mot(
    "SELECT trang_thai_he, so_lan_thu_wa FROM don_hang WHERE id=$1",
    [d.id],
  );
  const r2 = await quetDonMoi(pool, {}, { guiTinMau });
  const viec = await mot(
    "SELECT count(*)::int n FROM viec_can_xu_ly WHERE don_hang_id=$1",
    [d.id],
  );
  P(`   lượt 1: quet=${r1.quet} saiNhanh=${r1.saiNhanh} → trang_thai_he=${s1.trang_thai_he} so_lan_thu_wa=${s1.so_lan_thu_wa}`);
  P(`   lượt 2: quet=${r2.quet} · viec_can_xu_ly của đơn = ${viec.n}`);
  P(`   ${ok(s1.trang_thai_he !== "cho_gui_wa" || viec.n > 0)} KỲ VỌNG: đơn không nằm chết ở cho_gui_wa mà không ai biết`);
}

// ═══ F3a · docDanhMuc không ghi `san_pham.page_id` ⇒ cửa ② mù VĨNH VIỄN ══════
P("\n═══ F3a · doc-danh-muc.js:101 không ghi `page_id` ⇒ cua2Tien (JOIN s.page_id) mù ═══");
{
  const napBT = async () => ({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        data: [
          {
            id: "v-uuid-9",
            retail_price: 1500,
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
  const sp = await mot("SELECT id, page_id FROM san_pham WHERE ma=$1", [
    `${SHOP}:v-uuid-9`,
  ]);
  P(`   docDanhMuc: them=${dm.them} giaGhiDuoc=${dm.giaGhiDuoc} → san_pham.page_id = ${sp.page_id}`);
  const c2 = await cua2Tien(pool, {
    teamId: TEAM,
    pageId,
    duLieu: chuanHoaHoSo({ tong_tien: 1500, so_luong: 1, tien_te: "AED" }),
  });
  const ggTong = (await mot("SELECT count(*)::int n FROM goi_gia WHERE team_id=$1", [TEAM])).n;
  const thayDongMoi = c2.bang_gia.some((g) => Number(g.gia) === 1500);
  P(`   goi_gia trong CSDL = ${ggTong} dòng · cua2Tien nhìn thấy = ${c2.bang_gia.length} dòng (${JSON.stringify(c2.bang_gia.map((g) => g.gia))})`);
  P(`   cua2Tien → ket=${c2.ket} ly_do=${c2.ly_do} · dòng giá 1500 vừa nạp từ POS có trong bảng? ${thayDongMoi}`);
  P(`   ${ok(thayDongMoi)} KỲ VỌNG: cửa ② thấy dòng giá vừa nạp từ POS (dòng còn lại là dòng SEED TAY có page_id)`);
}

// ═══ F3b · đơn vị `goi_gia.gia` — minor vào, major ra ⇒ thu ×100 ═════════════
P("\n═══ F3b · goi_gia.gia = retail_price (ĐƠN VỊ NHỎ) rồi tao-don nhân ×100 LẦN NỮA ═══");
{
  await q("UPDATE san_pham SET page_id=$1 WHERE ma=$2", [
    pageId,
    `${SHOP}:v-uuid-9`,
  ]); // vá tay F3a để đo tiếp cửa ②
  const h = await hoiThoai("psF3b", "convF3b");
  const nap = napTao(910);
  const v = await vaoHangCho(
    pool,
    ctx(),
    {
      hoiThoaiId: h.id,
      teamId: TEAM,
      convId: "convF3b",
      tinId: 920001,
      hoSo: {
        ...HO_SO,
        sdt: "+971500000901",
        tong_tien: 1500,
        san_pham_ma: `${SHOP}:v-uuid-9`,
      },
    },
    { nap, env: KHOA },
  );
  const d = await duyet(
    pool,
    ctx(),
    { hangChoId: v.id, teamId: TEAM },
    { nap, env: MO, taoDon },
  );
  const pl = nap.payloads[0];
  const dh = await mot("SELECT tong_tien, tien_te FROM don_hang WHERE ma_pos=$1", [
    d.maPos,
  ]);
  P(`   goi_gia.gia=1500 (POS retail_price = 15,00 AED) → cửa ② đòi tong_tien=1500 → duyet tao=${d.tao}`);
  P(`   payload POST shipping_fee = ${pl?.shipping_fee} đơn vị nhỏ = ${pl ? pl.shipping_fee / 100 : "?"} AED thu của khách`);
  P(`   don_hang.tong_tien = ${dh?.tong_tien} ${dh?.tien_te} (cột mà L1-M1 CỐ Ý để NULL vì chưa khai đơn vị — nợ N4)`);
  P(`   ${ok(pl?.shipping_fee === 1500)} KỲ VỌNG: thu 15,00 AED (=1500), KHÔNG phải 1.500,00 AED`);
}

// ═══ F4 · POST xong + giao dịch ROLLBACK ⇒ lượt duyệt sau POST LẦN HAI ═══════
P("\n═══ F4 · cửa (c)③ mồ-côi KHÔNG phủ ca «POST THÀNH CÔNG rồi rollback» ═══");
{
  const h = await hoiThoai("psF4", "convF4");
  const nap = napTao(800);
  const v = await vaoHangCho(
    pool,
    ctx(),
    {
      hoiThoaiId: h.id,
      teamId: TEAM,
      convId: "convF4",
      tinId: 910004,
      hoSo: { ...HO_SO, sdt: "+971500000779" },
    },
    { nap, env: KHOA },
  );
  // Một hỏng BẤT KỲ sau lượt POST (tiến trình chết · lỗi CSDL · mất kết nối trước COMMIT).
  let lan = 0;
  const hongSauPost = async (...a) => {
    if (++lan === 1) throw new Error("giả lập: hỏng SAU khi POST đã bay đi");
    return donMessengerDaTao(...a);
  };
  try {
    await duyet(
      pool,
      ctx(),
      { hangChoId: v.id, teamId: TEAM },
      { nap, env: MO, taoDon, donMessengerDaTao: hongSauPost },
    );
  } catch (e) {
    P(`   lượt 1 ném: ${e.message}`);
  }
  const dong = await docHangCho(pool, ctx(), { hangChoId: v.id, teamId: TEAM });
  const nk = await mot(
    `SELECT count(*) FILTER (WHERE hanh_dong='pos_tao_don_bat_dau')::int bd,
            count(*) FILTER (WHERE hanh_dong='pos_tao_don_ket_qua')::int kq
       FROM nhat_ky WHERE doi_tuong='hang_cho_tao_don' AND doi_tuong_id=$1`,
    [String(v.id)],
  );
  P(`   sau lượt 1: POST=${nap.post} · hang_cho=${dong.trang_thai} don_hang_id=${dong.don_hang_id} · nhật ký bd=${nk.bd} kq=${nk.kq} ⇒ mồ côi=${nk.bd > nk.kq}`);
  // Sau VA-R2 (RF-12) lượt 2 bị cửa (c)③b TỪ CHỐI bằng ném `LoiDonDaTao` — bắt để đo
  // số POST (thước phải khớp luật mới, án lệ #27; bản trước vá lượt 2 trả về bình thường).
  let d2 = null;
  try {
    d2 = await duyet(
      pool,
      ctx(),
      { hangChoId: v.id, teamId: TEAM },
      { nap, env: MO, taoDon, donMessengerDaTao: hongSauPost },
    );
    P(`   lượt 2 (sale bấm lại): tao=${d2.tao} maPos=${d2.maPos} · TỔNG lượt POST = ${nap.post}`);
  } catch (e) {
    P(`   lượt 2 (sale bấm lại) bị CHẶN: lớp=${e.lop ?? "?"} · ${e.message.slice(0, 80)} · TỔNG lượt POST = ${nap.post}`);
  }
  P(`   ${ok(nap.post === 1)} KỲ VỌNG: 1 POST — cửa (c)③ phải chặn lượt hai`);
}

// ═══ F5 · apDung/ghiDon không CAS trên `trang_thai_he` ══════════════════════
P("\n═══ F5 · may-trang-thai.js ghiDon() UPDATE MÙ ⇒ ảnh cũ ghi đè kết quả lượt ghi POS ═══");
{
  const k = await mot(
    "INSERT INTO khach (team_id,so_dien_thoai,ten) VALUES ($1,'971500000902','K2') RETURNING id",
    [TEAM],
  );
  const don = await mot(
    `INSERT INTO don_hang (team_id,ma_pos,nguon,trang_thai_he,trang_thai_pos,khach_id,page_id)
     VALUES ($1,$2,'trang_ban_hang','da_gui_wa','0',$3,$4) RETURNING *`,
    [TEAM, `${SHOP}:9001`, k.id, pageId],
  );
  const anhCu = { ...don }; // job nhắc `taiDon` LÚC NÀY (đơn còn ở da_gui_wa)
  let posGhi = 0;
  await nhanPhanHoi(
    pool,
    ctx(),
    { donId: don.id, ket_qua: "xac_nhan" },
    {
      docLivePos: async () => 0,
      ghiNguocPos: async () => {
        posGhi++;
        return { maPos: `${SHOP}:9001`, sang: 12 };
      },
    },
  );
  const giua = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [don.id]);
  await apDung(pool, ctx(), { donId: don.id, sukien: "het_luot", don: anhCu });
  const cuoi = await mot("SELECT trang_thai_he FROM don_hang WHERE id=$1", [don.id]);
  P(`   ghi POS = ${posGhi} (POS đã sang 12 «Chờ in») · hệ sau xac_nhan = ${giua.trang_thai_he}`);
  P(`   lượt "het_luot" đi từ ẢNH CŨ → hệ = ${cuoi.trang_thai_he} (POS vẫn 12)`);
  P(`   ${ok(cuoi.trang_thai_he === "day_cho_in")} KỲ VỌNG: lượt từ ảnh cũ bị TỪ CHỐI, hai sổ không lệch`);
}

// ═══ F6 · nguồn (b) chỉ hỏi TRANG 1 rồi khai `sach` ═════════════════════════
P("\n═══ F6 · nguonB_posSong chỉ đọc 100 đơn gần nhất CỦA CẢ SHOP, không phân trang ═══");
{
  const trang1 = Array.from({ length: 100 }, (_, i) => ({
    id: 50000 + i,
    status: 2,
    conversation_id: `conv-khac-${i}`,
  }));
  let goi = 0;
  const nap = async (url) => {
    goi++;
    const p = new URL(url).searchParams.get("page_number");
    const ds =
      p === "2" ? [{ id: 49999, status: 2, conversation_id: "convF6" }] : trang1;
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
    { teamId: TEAM, market: MARKET, convId: "convF6" },
    { nap, env: KHOA },
  );
  P(`   POS có 101 đơn (total_entries=101), đơn của 'convF6' ở TRANG 2 · lượt gọi API = ${goi}`);
  P(`   nguồn(b) = ${r.ket} · chi_tiet = "${r.chi_tiet}"`);
  P(`   ${ok(r.ket !== "sach")} KỲ VỌNG: bắt được, hoặc ít nhất khai 'unknown' — KHÔNG được khai 'sach'`);
}

await sb.don();
