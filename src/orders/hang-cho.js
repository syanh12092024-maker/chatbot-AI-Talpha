// HÀNG CHỜ TẠO ĐƠN — luồng MESSENGER (phiếu L3-M4, làn 🟥 · module cuối của phần việc A).
//
// 01-QUYET-DINH §1: bot chốt đủ tên/số/địa chỉ + đồng ý COD **trong chat** → vào **hàng
// chờ sale duyệt** → duyệt là tạo đơn POS thẳng «Chờ in», **KHÔNG WhatsApp** (khách đã
// xác nhận rồi, hỏi lại là làm phiền hoặc bom hàng). File này giữ hai đầu của đoạn đó:
// `vaoHangCho()` (bot chốt xong) và `duyet()`/`loai()` (sale quyết).
//
// ═══ NĂM CỬA CỦA §7.3 TONG-QUAN-HE-THONG.md — PORT NGUYÊN TẮC, ĐỔI NGUỒN ════════
//   ① MẪU ĐỦ TRƯỜNG   tên · SĐT · địa chỉ · SL · tổng — thiếu thì VẪN vào hàng chờ
//                     (gắn `thieu_truong`), sale bổ sung; rơi im lặng mới là mất đơn.
//   ② CỬA TIỀN        tổng khớp ĐÚNG MỘT `goi_gia` của page (bản cũ: bảng giá KB).
//   ③ CHỐNG TRÙNG     **NĂM** nguồn (bản cũ có bốn) — xem khối dưới.
//   ④ HÀNG CHỜ        bảng `hang_cho_tao_don` (bản cũ: `ai-order-queue.json`).
//   ⑤ TẠO ĐƠN         `duyet()` CHẠY LẠI đủ cửa ①②③ rồi mới gọi cửa POS — cố ý: người
//                     bấm nhầm cũng không tạo được đơn trùng/sai tiền.
//
// ⛔ NGUYÊN TẮC GỐC: **THÀ KHÔNG TẠO CÒN HƠN TẠO NHẦM.** Mọi nguồn lỗi/timeout/không tra
//    được ⇒ `unknown` và cửa **ĐÓNG**. KHÔNG nguồn nào được đọc «0 dòng = sạch» khi lượt
//    tra ấy chưa chạy được — một kết quả rỗng vì gọi sai trông y hệt một kết quả sạch.
//
// ═══ NĂM NGUỒN CHỐNG TRÙNG (③) — so DANH SÁCH với §7.3, không so số ═════════════
//   (a) `so_ai`      sự kiện `order` của CHÍNH hội thoại này (bản cũ: sổ AI JSONL).
//                    ⚠️ TRỪ sự kiện của chính lượt chốt vừa xong — xem `tinId` dưới.
//   (b) POS SỐNG     GET đơn của hội thoại THẲNG TỪ API POS ngay lúc kiểm. **Không** đọc
//                    gương `don_hang`: sale tạo tay 09:00, `docDon` chưa quét, 09:05 sale
//                    duyệt ⇒ đơn đúp. Gương chỉ là cache tham khảo.
//   (c) TRẠNG THÁI HỘI THOẠI  `hoi_thoai.trang_thai='POST_SALE'` (bản cũ: thẻ trạng thái
//                    đơn `ORDER_STOP_TAGS` trên hội thoại Pancake).
//   (d) FB COMMERCE  dấu hiệu đơn tạo ngoài trong NỘI DUNG hội thoại — luật nhận diện
//                    port nguyên văn `src/order-bridge.js:138`.
//   (e) `kiemTrung`  lọc trùng CHÉO hai luồng của L3-M2 — **bản cũ KHÔNG có nguồn này**.
//
// ⛔ Hàm ở đây KHÔNG bao giờ xoá đơn/dòng nào (luật 2 §0a): `loai()` chỉ đổi trạng thái
//    dòng hàng chờ của chính mình.
import { ghiNhatKy, LoiThieuBoiCanhTeam } from "../db/index.js";
import { kiemTrung } from "./loc-trung.js";
import { donMessengerDaTao } from "./may-trang-thai.js";
import { taoDon as taoDonPos, layKetNoi } from "../pos/index.js";
// ⛔ import SÂU có chủ ý, cùng án lệ `src/orders/cua-pos.js:18`: `src/pos/index.js`
//    (cửa VÀO duy nhất) export `docDon` — bản QUÉT-VÀ-GHI-DB cả shop — chứ không export
//    hàm GET một trang đơn trần. Nguồn (b) cần đúng lượt GET đó và KHÔNG được ghi gì.
//    Nợ §9 đã có tên: phiếu sau re-export ở `src/pos/index.js` rồi xoá hai import sâu.
import { guiDocDon } from "../pos/api.js";

// ── LỖI CÓ TÊN ───────────────────────────────────────────────────────────────
/** Dòng hàng chờ không còn ở `cho_duyet` (đã duyệt / đã loại) — lượt sau dừng ở đây. */
export class LoiHangChoDaXuLy extends Error {
  constructor(thongDiep, { trangThai = null, donHangId = null } = {}) {
    super(thongDiep);
    this.name = "LoiHangChoDaXuLy";
    this.trangThai = trangThai;
    this.donHangId = donHangId;
  }
}
/** Không tìm thấy dòng hàng chờ trong team của người gọi. */
export class LoiThieuHangCho extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiThieuHangCho";
  }
}

// ── TỪ VỰNG ĐÓNG — cổng + màn L4 grep theo đây, không gõ tay lần hai ─────────
export const TRUONG_BAT_BUOC = Object.freeze([
  "ten",
  "sdt",
  "dia_chi",
  "so_luong",
  "tong_tien",
]);

export const NGUON_CHONG_TRUNG = Object.freeze([
  "a_so_ai",
  "b_pos_song",
  "c_trang_thai_hoi_thoai",
  "d_fb_commerce",
  "e_kiem_trung",
]);

/** Kết quả một nguồn: `sach` (đã tra, âm) · `duong` (bắt được) · `unknown` (chưa tra được). */
export const KET_NGUON = Object.freeze({
  SACH: "sach",
  DUONG: "duong",
  UNKNOWN: "unknown",
});

export const TRANG_THAI_HANG_CHO = Object.freeze([
  "cho_duyet",
  "da_duyet",
  "tu_choi",
]);

/**
 * Dấu hiệu đơn tạo bởi FB Commerce / công cụ ngoài — PORT NGUYÊN VĂN
 * `src/order-bridge.js:138` (bản đang chạy, CẤM SỬA nên chép; import file đó sẽ kéo theo
 * `pancake.js`/`pancake-orders.js` và bắn `fetch` tới POS bằng khoá thật ngay lúc nạp
 * module — đúng năm đường thoát mà `duong-tin-v1.md` §5 đang đi bịt).
 * ⚠️ Chép thì phải NÓI RA: đây là bản SONG SINH của một luật. Đổi một bên mà quên bên
 *    kia là một cặp trùng lọt qua, im lặng — ca `E4` của bộ ca neo nguyên văn chuỗi này.
 */
export const FB_COMMERCE =
  /(you have placed an order|your order (?:has been|is) (?:placed|received|confirmed|created)|order confirmation|order\s*(?:number|no\.?|#)\s*[:#]?\s*\w|đơn hàng của bạn|bạn đã đặt hàng|تم(?:\s+استلام)?\s+طلبك|رقم الطلب)/i;

/** Trạng thái POS coi là huỷ/hoàn — đơn đã huỷ KHÔNG phải «đã có đơn» (khuôn cũ). */
const HUY_HOAN = new Set(["4", "5", "6", "7", "8"]);

/** Trạng thái hội thoại nói «đơn đang được xử lý» (vế v3 của `ORDER_STOP_TAGS`). */
const TRANG_THAI_DA_CO_DON = new Set(["POST_SALE"]);

function teamHieuLuc(ctx, teamId) {
  if (ctx?.laHeThong) {
    if (teamId == null || teamId === "")
      throw new LoiThieuBoiCanhTeam(
        "hàng chờ tạo đơn dưới ctxHeThong() bắt buộc kèm `teamId` tường minh — job nền " +
          "không có team mặc định để suy hộ.",
      );
    return String(teamId);
  }
  if (!ctx || ctx.teamId == null || ctx.teamId === "")
    throw new LoiThieuBoiCanhTeam(
      "hàng chờ tạo đơn: thiếu bối cảnh team (ctx.teamId rỗng) — từ chối chạy.",
    );
  if (teamId != null && teamId !== "" && String(teamId) !== String(ctx.teamId))
    throw new LoiThieuBoiCanhTeam(
      `hàng chờ tạo đơn: teamId=${teamId} khác ctx.teamId=${ctx.teamId} — không phục ` +
        `vụ lượt xuyên team.`,
    );
  return String(ctx.teamId);
}

const so = (v) => (v == null || v === "" ? null : Number(v));
const chu = (v) => (v == null ? "" : String(v).trim());

/**
 * Chuẩn hoá hồ sơ bot để lại thành `du_lieu_don`. Nhận CẢ HAI khuôn tên: hồ sơ nén của
 * `src/context.js` (`name/phone/address/city/qty/total_price/currency`) và tên cột v3.
 * Không có khuôn thứ ba — chỗ nào cần tên khác thì đổi ở đây, đừng đoán ở nơi gọi.
 */
export function chuanHoaHoSo(hoSo = {}) {
  const h = hoSo || {};
  return {
    ten: chu(h.ten ?? h.name),
    sdt: chu(h.sdt ?? h.phone),
    dia_chi: chu(h.dia_chi ?? h.address),
    thanh_pho: chu(h.thanh_pho ?? h.city),
    so_luong: so(h.so_luong ?? h.qty),
    tong_tien: so(h.tong_tien ?? h.total_price ?? h.total),
    tien_te: chu(h.tien_te ?? h.currency).toUpperCase(),
    san_pham_ma: chu(h.san_pham_ma ?? h.sanPhamMa ?? h.variant_ma),
    kho_hang: chu(h.kho_hang ?? h.khoHang ?? h.warehouse_id),
  };
}

// ═══ CỬA ① — MẪU ĐỦ TRƯỜNG ═══════════════════════════════════════════════════
export function cua1DuTruong(duLieu = {}) {
  const thieu = TRUONG_BAT_BUOC.filter((k) => {
    const v = duLieu[k];
    if (k === "so_luong" || k === "tong_tien")
      return !Number.isFinite(Number(v)) || Number(v) <= 0;
    return !chu(v);
  });
  return {
    qua: thieu.length === 0,
    ket: thieu.length ? KET_NGUON.DUONG : KET_NGUON.SACH,
    thieu_truong: thieu,
    ly_do: thieu.length ? `thieu_truong: ${thieu.join(", ")}` : "du_truong",
  };
}

// ═══ CỬA ② — CỬA TIỀN ════════════════════════════════════════════════════════
/**
 * Tổng phải khớp **ĐÚNG MỘT** gói giá của page.
 *
 * 🔴 HIỆN TRẠNG ĐO ĐƯỢC (23/08, `aicloser_v3` dev): `goi_gia` có **0 dòng** trên toàn hệ
 *    — danh mục POS trả giá 0 nên `docDanhMuc` không sinh gói nào (nợ L1-M1, §9 sổ). Nên
 *    HÔM NAY cửa này trả `unknown` cho MỌI dòng hàng chờ và **ĐÓNG**. Đó KHÔNG phải một
 *    lỗi tạm: nó là cách phiếu này SỐNG CHUNG với nợ đó — thà chặn còn hơn tin con số bot
 *    nêu (án lệ khách Priscela Amon: báo gấp đôi giá ⇒ huỷ đơn + block page).
 */
export async function cua2Tien(pool, { teamId, pageId, duLieu = {} }) {
  const tong = Number(duLieu.tong_tien);
  const sl = Number(duLieu.so_luong);
  const te = chu(duLieu.tien_te).toUpperCase();
  const r = await pool.query(
    `SELECT g.id, g.so_luong, g.gia::float8 gia, g.tien_te
       FROM goi_gia g
       JOIN san_pham s ON s.id = g.san_pham_id AND s.team_id = g.team_id
      WHERE g.team_id = $1 AND s.page_id = $2
      ORDER BY g.so_luong, g.gia`,
    [teamId, pageId],
  );
  const bang = r.rows.map((x) => ({
    so_luong: x.so_luong,
    gia: x.gia,
    tien_te: x.tien_te,
  }));
  if (!bang.length) {
    return {
      qua: false,
      ket: KET_NGUON.UNKNOWN,
      ly_do: "unknown_chua_co_bang_gia",
      chi_tiet:
        "page chưa có dòng `goi_gia` nào (danh mục POS giá 0 — nợ L1-M1) ⇒ không đối " +
        "chiếu được tổng tiền. UNKNOWN là ĐÓNG, không phải sạch.",
      bang_gia: bang,
      tong,
    };
  }
  if (!Number.isFinite(tong) || tong <= 0) {
    return {
      qua: false,
      ket: KET_NGUON.UNKNOWN,
      ly_do: "khong_co_tong",
      chi_tiet: "đơn không có tổng tiền — không tạo đơn mù.",
      bang_gia: bang,
      tong: tong || 0,
    };
  }
  const khop = bang.filter(
    (g) =>
      Number(g.gia) === tong &&
      (!te || String(g.tien_te).toUpperCase() === te) &&
      (!Number.isFinite(sl) || sl <= 0 || Number(g.so_luong) === sl),
  );
  if (khop.length === 1)
    return {
      qua: true,
      ket: KET_NGUON.SACH,
      ly_do: "khop_dung_mot_goi",
      goi: khop[0],
      bang_gia: bang,
      tong,
    };
  return {
    qua: false,
    ket: KET_NGUON.DUONG,
    ly_do: khop.length === 0 ? "lech_bang_gia" : "nhieu_goi_cung_khop",
    chi_tiet:
      khop.length === 0
        ? `tổng ${tong}${te ? " " + te : ""} không khớp gói nào`
        : `${khop.length} gói cùng khớp — không phán được gói nào, ĐÓNG`,
    bang_gia: bang,
    tong,
  };
}

// ═══ CỬA ③ — CHỐNG TRÙNG NĂM NGUỒN ═══════════════════════════════════════════

/** (a) Sổ AI — sự kiện `order` của hội thoại này, TRỪ sự kiện của chính lượt chốt vừa xong. */
export async function nguonA_soAi(pool, { teamId, pageIdText, psid, tinId }) {
  try {
    const r = await pool.query(
      `SELECT id, xay_ra_luc, ly_do, nguon_tep, nguon_dong
         FROM so_ai
        WHERE team_id = $1 AND page_id = $2 AND psid = $3 AND loai = 'order'
          AND NOT (nguon_tep = 'tin_cho_xu_ly:order' AND nguon_dong = $4)
        ORDER BY xay_ra_luc DESC
        LIMIT 5`,
      [teamId, String(pageIdText), String(psid), Number(tinId ?? -1)],
    );
    return {
      ket: r.rowCount ? KET_NGUON.DUONG : KET_NGUON.SACH,
      so_dong: r.rowCount,
      chi_tiet: r.rowCount
        ? `sổ AI đã ghi ${r.rowCount} sự kiện order trước lượt này (mới nhất ${r.rows[0].xay_ra_luc?.toISOString?.() ?? r.rows[0].xay_ra_luc})`
        : "đã tra, không có sự kiện order nào khác của hội thoại này",
    };
  } catch (e) {
    return { ket: KET_NGUON.UNKNOWN, chi_tiet: `tra sổ AI hỏng: ${e.message}` };
  }
}

/**
 * Tra kết nối POS của một page.
 * ⚠️ ĐO LẠI 23/08 — ĐỀ BÀI THEO «thị trường» KHÔNG DÙNG ĐƯỢC: `page.thi_truong` là nhãn
 *    NGƯỜI (`KSA`·`Khác`·rỗng…) còn `ket_noi_pos.market` là `Saudi`… ⇒ khớp theo tên trúng
 *    **0/502** page. Khoá đúng là `page.pos_shop_id` → `ket_noi_pos.shop_id` (**112/502**
 *    page tra được). 390 page còn lại ⇒ `unknown` ⇒ cửa ĐÓNG — nợ §9 (đất di trú/L1-M1).
 */
export async function traMarketCuaPage(pool, { teamId, posShopId, thiTruong }) {
  if (posShopId) {
    const r = await pool.query(
      "SELECT market FROM ket_noi_pos WHERE team_id = $1 AND shop_id = $2 AND bat",
      [teamId, String(posShopId)],
    );
    if (r.rowCount) return { market: r.rows[0].market, qua: "pos_shop_id" };
  }
  if (chu(thiTruong)) {
    const r = await pool.query(
      "SELECT market FROM ket_noi_pos WHERE team_id = $1 AND lower(market) = lower($2) AND bat",
      [teamId, chu(thiTruong)],
    );
    if (r.rowCount) return { market: r.rows[0].market, qua: "thi_truong" };
  }
  return { market: null, qua: null };
}

/** (b) POS SỐNG — GET đơn thẳng từ API ngay lúc kiểm. Lỗi/timeout ⇒ unknown ⇒ ĐÓNG. */
export async function nguonB_posSong(
  pool,
  ctx,
  { teamId, market, convId },
  { nap = fetch, env = process.env, docDon = guiDocDon, coTrang = 100 } = {},
) {
  if (!market)
    return {
      ket: KET_NGUON.UNKNOWN,
      chi_tiet:
        "không tra được kết nối POS của page (thiếu pos_shop_id và thi_truong không " +
        "khớp market nào) — KHÔNG đọc thành «POS sạch».",
    };
  if (!convId)
    return {
      ket: KET_NGUON.UNKNOWN,
      chi_tiet:
        "hội thoại chưa có conv_id Pancake — không hỏi POS được đơn nào của hội thoại này.",
    };
  try {
    const ketNoi = await layKetNoi(pool, ctx, market, { teamId, env });
    const lo = await docDon(ketNoi, { trang: 1, coTrang }, { nap });
    const khop = (lo.donHang || []).filter(
      (o) =>
        String(o.conversation_id ?? "") === String(convId) &&
        !HUY_HOAN.has(String(o.status)),
    );
    return {
      ket: khop.length ? KET_NGUON.DUONG : KET_NGUON.SACH,
      so_don_quet: (lo.donHang || []).length,
      chi_tiet: khop.length
        ? `POS SỐNG đã có đơn #${khop[0].id} (status ${khop[0].status}) gắn hội thoại này`
        : `đã hỏi POS ${(lo.donHang || []).length} đơn gần nhất của shop, không đơn nào gắn hội thoại này`,
      don: khop.map((o) => ({ id: String(o.id), status: String(o.status) })),
    };
  } catch (e) {
    return {
      ket: KET_NGUON.UNKNOWN,
      chi_tiet: `hỏi POS hỏng (${e.name}): ${e.message}`.slice(0, 300),
    };
  }
}

/** (c) Trạng thái hội thoại — vế v3 của «thẻ trạng thái đơn» bản cũ. */
export function nguonC_trangThaiHoiThoai(hoiThoai = {}) {
  const tt = String(hoiThoai.trang_thai ?? "");
  return {
    ket: TRANG_THAI_DA_CO_DON.has(tt) ? KET_NGUON.DUONG : KET_NGUON.SACH,
    trang_thai: tt,
    chi_tiet: TRANG_THAI_DA_CO_DON.has(tt)
      ? `hội thoại đang ở ${tt} — đơn đang được xử lý`
      : `hội thoại ở ${tt || "(rỗng)"}, không phải trạng thái đã-có-đơn`,
    // MÙ CÓ NÓI RA (án lệ #7): v3 KHÔNG có cột nào giữ THẺ SỐ của hội thoại Pancake
    // (`ORDER_STOP_TAGS` = -1/-2/-3/-11/-12/-20 của bản cũ) — cửa Messenger v3 chỉ có
    // `gatThe` (ghi), không có đường đọc. Vế đó KHÔNG được tính là `unknown` chặn-tất
    // (nếu tính, mọi dòng hàng chờ chết vĩnh viễn ở đây và tính năng thành vô dụng);
    // rủi ro còn lại đã được nguồn (b) POS SỐNG phủ TRỰC TIẾP và chắc hơn — nó đọc đơn
    // thật chứ không đọc một cái nhãn. Nợ §9: cửa Messenger cấp đường đọc thẻ hội thoại.
    the_hoi_thoai: "chua_co_cot",
  };
}

/** (d) Dấu hiệu FB Commerce trong nội dung hội thoại. 0 tin đọc được ⇒ unknown ⇒ ĐÓNG. */
export async function nguonD_fbCommerce(
  pool,
  { teamId, pageIdText, psid, hoiThoai = {}, tranTin = 50 },
) {
  let tin = [];
  try {
    const r = await pool.query(
      `SELECT noi_dung FROM tin_cho_xu_ly
        WHERE team_id = $1 AND page_id = $2 AND psid = $3
        ORDER BY id DESC LIMIT $4`,
      [teamId, String(pageIdText), String(psid), tranTin],
    );
    tin = r.rows.map((x) => String(x.noi_dung ?? ""));
  } catch (e) {
    return {
      ket: KET_NGUON.UNKNOWN,
      chi_tiet: `đọc nội dung hội thoại hỏng: ${e.message}`,
    };
  }
  const aiNoi = String(hoiThoai.ai_noi_gi ?? "");
  if (aiNoi) tin.push(aiNoi);
  if (!tin.length)
    return {
      ket: KET_NGUON.UNKNOWN,
      so_tin: 0,
      chi_tiet:
        "hệ không giữ tin nào của hội thoại này — KHÔNG đọc thành «không có dấu hiệu», " +
        "vì lượt tra ấy chưa nhìn thấy gì cả.",
    };
  const dinh = tin.find((t) => FB_COMMERCE.test(t));
  return {
    ket: dinh ? KET_NGUON.DUONG : KET_NGUON.SACH,
    so_tin: tin.length,
    chi_tiet: dinh
      ? `hội thoại có dấu hiệu đơn ngoài: "${dinh.replace(/\s+/g, " ").trim().slice(0, 60)}"`
      : `đã soi ${tin.length} tin, không có dấu hiệu đơn FB Commerce`,
  };
}

/** (e) `kiemTrung` của L3-M2 — chéo HAI luồng. Ném ⇒ unknown ⇒ ĐÓNG. */
export async function nguonE_kiemTrung(
  pool,
  ctx,
  { teamId, duLieu = {} },
  { kiemTrung: fn = kiemTrung, keo_ngay } = {},
) {
  try {
    const kq = await fn(pool, ctx, {
      soDienThoai: duLieu.sdt || null,
      sanPhamId: duLieu.san_pham_ma || null,
      teamId,
      ...(keo_ngay ? { keo_ngay } : {}),
    });
    // `chua_co_sdt` / `sdt_khong_doc_duoc` = cửa CHƯA PHÁN ĐƯỢC (§7.1 bàn giao L3-M2),
    // KHÔNG phải «đã tra, sạch» ⇒ unknown ⇒ ĐÓNG.
    if (kq.ly_do === "chua_co_sdt" || kq.ly_do === "sdt_khong_doc_duoc")
      return {
        ket: KET_NGUON.UNKNOWN,
        ly_do: kq.ly_do,
        chi_tiet: `kiemTrung chưa phán được (${kq.ly_do}) — khoá nối chưa có.`,
      };
    return {
      ket: kq.trung ? KET_NGUON.DUONG : KET_NGUON.SACH,
      ly_do: kq.ly_do,
      nguon_trung: kq.nguon_trung ?? null,
      so_don_xet: kq.so_don_xet,
      don: (kq.don || []).map((d) => ({
        id: d.id,
        ma_pos: d.ma_pos,
        nguon: d.nguon,
      })),
      chi_tiet: kq.trung
        ? `trùng chéo: ${kq.ly_do} · nguồn ${kq.nguon_trung} · ${kq.don.length} đơn`
        : `đã tra ${kq.so_don_xet} đơn cùng số, không trùng`,
    };
  } catch (e) {
    return {
      ket: KET_NGUON.UNKNOWN,
      chi_tiet: `kiemTrung ném (${e.name}): ${e.message}`.slice(0, 300),
    };
  }
}

/** Chạy đủ năm nguồn của cửa ③. Bất kỳ nguồn nào `duong` HOẶC `unknown` ⇒ cửa ĐÓNG. */
export async function cua3ChongTrung(pool, ctx, boiCanh, deps = {}) {
  const { teamId, hoiThoai, pageIdText, psid, convId, market, duLieu, tinId } =
    boiCanh;
  const nguon = {
    a_so_ai: await nguonA_soAi(pool, { teamId, pageIdText, psid, tinId }),
    b_pos_song: await nguonB_posSong(
      pool,
      ctx,
      { teamId, market, convId },
      deps,
    ),
    c_trang_thai_hoi_thoai: nguonC_trangThaiHoiThoai(hoiThoai),
    d_fb_commerce: await nguonD_fbCommerce(pool, {
      teamId,
      pageIdText,
      psid,
      hoiThoai,
    }),
    e_kiem_trung: await nguonE_kiemTrung(pool, ctx, { teamId, duLieu }, deps),
  };
  const duong = NGUON_CHONG_TRUNG.filter(
    (k) => nguon[k].ket === KET_NGUON.DUONG,
  );
  const unknown = NGUON_CHONG_TRUNG.filter(
    (k) => nguon[k].ket === KET_NGUON.UNKNOWN,
  );
  return {
    qua: duong.length === 0 && unknown.length === 0,
    ket:
      duong.length > 0
        ? KET_NGUON.DUONG
        : unknown.length > 0
          ? KET_NGUON.UNKNOWN
          : KET_NGUON.SACH,
    nguon,
    duong,
    unknown,
    ly_do: duong.length
      ? `trung: ${duong.join(", ")}`
      : unknown.length
        ? `unknown_la_dong: ${unknown.join(", ")}`
        : "khong_trung",
  };
}

// ═══ CHẠY NĂM CỬA + DỰNG `cua_kiem` ══════════════════════════════════════════
/**
 * @returns `hang_cho_tao_don.cua_kiem` — jsonb sale đọc trên màn L4. Cửa ④ là chính dòng
 *          hàng chờ; cửa ⑤ chỉ có kết quả sau `duyet()`, ở lượt VÀO nó khai `chua_chay`.
 */
export async function chayNamCua(pool, ctx, boiCanh, deps = {}) {
  const { teamId, pageId, duLieu } = boiCanh;
  const c1 = cua1DuTruong(duLieu);
  const c2 = await cua2Tien(pool, { teamId, pageId, duLieu });
  const c3 = await cua3ChongTrung(pool, ctx, boiCanh, deps);
  const chanVi = [];
  if (!c1.qua) chanVi.push(`cua1:${c1.ly_do}`);
  if (!c2.qua) chanVi.push(`cua2:${c2.ly_do}`);
  if (!c3.qua) chanVi.push(`cua3:${c3.ly_do}`);
  return {
    chay_luc: (deps.now ? deps.now() : new Date()).toISOString(),
    cong: {
      "1_du_truong": c1,
      "2_tien": c2,
      "3_chong_trung": c3,
      "4_hang_cho": { qua: true, ly_do: "dong_nay_chinh_la_cua_4" },
      "5_tao_don": boiCanh.ketCua5 ?? { da_chay: false, ly_do: "chua_chay" },
    },
    qua_het: chanVi.length === 0,
    chan_vi: chanVi,
  };
}

// ═══ NẠP BỐI CẢNH — hội thoại + page (một câu, đọc RAW vì job nền) ═══════════
async function taiBoiCanh(pool, { teamId, hoiThoaiId }) {
  const r = await pool.query(
    `SELECT h.id, h.team_id, h.page_id, h.psid, h.trang_thai, h.chu_so_huu,
            h.ai_noi_gi, h.khach_id,
            p.page_id ptext, p.pos_shop_id, p.thi_truong
       FROM hoi_thoai h JOIN page p ON p.id = h.page_id
      WHERE h.team_id = $1 AND h.id = $2`,
    [teamId, hoiThoaiId],
  );
  if (!r.rowCount)
    throw new LoiThieuHangCho(
      `hàng chờ tạo đơn: không có hoi_thoai id=${hoiThoaiId} trong team ${teamId}.`,
    );
  return r.rows[0];
}

/** Tin cuối của hội thoại — lấy `conv_id` Pancake khi nơi gọi không truyền vào. */
async function traConvId(pool, { teamId, pageIdText, psid }) {
  const r = await pool.query(
    `SELECT conv_id FROM tin_cho_xu_ly
      WHERE team_id = $1 AND page_id = $2 AND psid = $3
      ORDER BY id DESC LIMIT 1`,
    [teamId, String(pageIdText), String(psid)],
  );
  return r.rowCount ? r.rows[0].conv_id : null;
}

// ═══ ① VÀO HÀNG CHỜ ══════════════════════════════════════════════════════════
/**
 * Bot vừa chốt xong ⇒ đẩy một dòng vào hàng chờ sale duyệt, KÈM kết quả năm cửa chạy
 * NGAY LÚC VÀO (để sale thấy trước, không phải bấm rồi mới biết bị chặn).
 *
 * ⛔ KHÔNG chặn ở lượt VÀO. Thiếu trường / trùng / unknown đều VẪN vào hàng chờ, gắn lý
 *    do — rơi im lặng ở đây là mất đơn mà không ai biết. Chặn xảy ra ở `duyet()`.
 *
 * @param tinId  id dòng `tin_cho_xu_ly` của chính lượt chốt này. CẦN, không phải cho vui:
 *               nhạc trưởng ghi `so_ai(order)` cho lượt này TRƯỚC khi gọi hàm này, nên
 *               nguồn (a) sẽ tự bắt chính nó và mọi dòng đều «trùng» nếu không trừ ra.
 */
export async function vaoHangCho(
  pool,
  ctx,
  { hoiThoaiId, hoSo = {}, convId = null, tinId = null, teamId = null } = {},
  deps = {},
) {
  const team = teamHieuLuc(ctx, teamId);
  if (hoiThoaiId == null || hoiThoaiId === "")
    throw new Error("vaoHangCho: thiếu `hoiThoaiId`.");

  // NEO IDEMPOTENT «một TIN, nhiều nhất một dòng hàng chờ». Worker của L2-M1 thử lại một
  // tin sau khi chết giữa chừng (`tin_cho_xu_ly.so_lan_thu`) — không có neo này thì mỗi
  // lượt thử lại đẻ thêm một dòng chờ duyệt cho cùng một lượt chốt, và sale nhìn thấy
  // hai dòng giống hệt nhau mà không cách nào biết dòng nào thật. Cùng ý với neo
  // `(nguon_tep, nguon_dong)` của `so_ai` (L2-M1 ②.3).
  if (tinId != null && tinId !== "") {
    const da = await pool.query(
      `SELECT id, trang_thai FROM hang_cho_tao_don
        WHERE team_id = $1 AND hoi_thoai_id = $2 AND du_lieu_don->>'tin_id' = $3
        ORDER BY id LIMIT 1`,
      [team, hoiThoaiId, String(tinId)],
    );
    if (da.rowCount) {
      const cu = da.rows[0];
      return {
        id: String(cu.id),
        daCo: true,
        trang_thai: cu.trang_thai,
        ly_do: `tin ${tinId} đã có dòng hàng chờ #${cu.id} — không tạo dòng thứ hai`,
      };
    }
  }

  const ht = await taiBoiCanh(pool, { teamId: team, hoiThoaiId });
  const duLieu = chuanHoaHoSo(hoSo);
  const conv =
    convId ||
    (await traConvId(pool, {
      teamId: team,
      pageIdText: ht.ptext,
      psid: ht.psid,
    }));
  const { market } = await traMarketCuaPage(pool, {
    teamId: team,
    posShopId: ht.pos_shop_id,
    thiTruong: ht.thi_truong,
  });

  const cuaKiem = await chayNamCua(
    pool,
    ctx,
    {
      teamId: team,
      hoiThoai: ht,
      pageId: ht.page_id,
      pageIdText: ht.ptext,
      psid: ht.psid,
      convId: conv,
      market,
      duLieu,
      tinId,
    },
    deps,
  );

  const r = await pool.query(
    `INSERT INTO hang_cho_tao_don (team_id, hoi_thoai_id, du_lieu_don, cua_kiem)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [
      team,
      ht.id,
      JSON.stringify({
        ...duLieu,
        conv_id: conv,
        tin_id: tinId == null ? null : String(tinId),
        market,
        page_id_text: ht.ptext,
      }),
      JSON.stringify(cuaKiem),
    ],
  );
  const dong = r.rows[0];
  await ghiNhatKy(pool, {
    teamId: team,
    tacNhan: "may:hang-cho-tao-don",
    hanhDong: "hang_cho_vao",
    doiTuong: "hang_cho_tao_don",
    doiTuongId: String(dong.id),
    sau: { qua_het: cuaKiem.qua_het, chan_vi: cuaKiem.chan_vi },
    ghiChu:
      `hội thoại ${ht.id} · ${cuaKiem.qua_het ? "đủ cửa" : cuaKiem.chan_vi.join(" | ")}`.slice(
        0,
        500,
      ),
  });
  return {
    id: String(dong.id),
    daCo: false,
    dong,
    cua_kiem: cuaKiem,
    market,
    convId: conv,
  };
}

// ═══ ⑤ DUYỆT = TẠO ĐƠN THẬT ══════════════════════════════════════════════════
/**
 * Sale duyệt MỘT dòng hàng chờ.
 *
 * Thứ tự BẮT BUỘC (đổi thứ tự là mở một lỗ tiền):
 *   1. `BEGIN` + `SELECT … FOR UPDATE` dòng hàng chờ **TRƯỚC MỌI VIỆC**. Hai sale bấm
 *      cùng giây là hai kiện COD thật không xoá được (luật 2 §0a) — khoá dòng là thứ
 *      duy nhất tuần tự hoá được hai lượt đó. Lượt sau đọc `da_duyet` rồi dừng.
 *   2. Nhận `boSung` (trường sale vừa điền) → gộp vào `du_lieu_don`.
 *   3. CHẠY LẠI đủ cửa ①②③ (§7.3 cửa ⑤ — người bấm nhầm cũng không tạo được đơn
 *      trùng/sai tiền). Còn chặn ⇒ ghi lại `cua_kiem` mới, COMMIT, TRẢ VỀ `tao:false`.
 *   4. `taoDon` (bốn cửa của cửa POS) → `INSERT don_hang` → gắn `don_hang_id` →
 *      `donMessengerDaTao` (máy trạng thái) → `so_ai` → `nhat_ky` → COMMIT.
 *
 * ⚠️ Dòng BỊ CHẶN là **ĐÚNG HÀNH VI**, không phải lỗi hệ — màn L4 phải hiện `chan_vi`
 *    nguyên văn cho sale, đừng vẽ một băng đỏ «hệ hỏng».
 */
export async function duyet(
  pool,
  ctx,
  { hangChoId, boSung = null, teamId = null, nguoiDuyetId = null } = {},
  deps = {},
) {
  const team = teamHieuLuc(ctx, teamId);
  if (hangChoId == null || hangChoId === "")
    throw new Error("duyet: thiếu `hangChoId`.");
  if (typeof pool.connect !== "function")
    throw new Error(
      "duyet: cần một Pool (có .connect) — lượt này TỰ mở giao dịch để giữ dòng hàng " +
        "chờ bằng SELECT … FOR UPDATE. Truyền một client đang trong giao dịch khác là " +
        "mất chính cái khoá đó.",
    );
  const taoDonFn = deps.taoDon || taoDonPos;
  const daTaoFn = deps.donMessengerDaTao || donMessengerDaTao;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const r = await client.query(
      "SELECT * FROM hang_cho_tao_don WHERE team_id = $1 AND id = $2 FOR UPDATE",
      [team, hangChoId],
    );
    if (!r.rowCount) {
      await client.query("ROLLBACK");
      throw new LoiThieuHangCho(
        `duyet: không có dòng hàng chờ id=${hangChoId} trong team ${team}.`,
      );
    }
    const dong = r.rows[0];
    if (dong.trang_thai !== "cho_duyet") {
      await client.query("ROLLBACK");
      throw new LoiHangChoDaXuLy(
        `Hàng chờ #${hangChoId} đang ở "${dong.trang_thai}"` +
          (dong.don_hang_id ? ` (đơn #${dong.don_hang_id})` : "") +
          ` — lượt duyệt này KHÔNG chạy. Đây là hành vi đúng, không phải lỗi.`,
        { trangThai: dong.trang_thai, donHangId: dong.don_hang_id },
      );
    }

    const duLieuCu = dong.du_lieu_don || {};
    const duLieu = boSung
      ? { ...duLieuCu, ...chuanHoaHoSoBoSung(boSung) }
      : { ...duLieuCu };
    const ht = await taiBoiCanhTrongTx(client, {
      teamId: team,
      hoiThoaiId: dong.hoi_thoai_id,
    });
    const market =
      duLieu.market ||
      (
        await traMarketCuaPage(client, {
          teamId: team,
          posShopId: ht.pos_shop_id,
          thiTruong: ht.thi_truong,
        })
      ).market;

    const cuaKiem = await chayNamCua(
      client,
      ctx,
      {
        teamId: team,
        hoiThoai: ht,
        pageId: ht.page_id,
        pageIdText: ht.ptext,
        psid: ht.psid,
        convId: duLieu.conv_id ?? null,
        market,
        duLieu,
        tinId: duLieu.tin_id ?? null,
      },
      deps,
    );

    if (!cuaKiem.qua_het) {
      await client.query(
        "UPDATE hang_cho_tao_don SET du_lieu_don = $1, cua_kiem = $2 WHERE team_id = $3 AND id = $4",
        [
          JSON.stringify({ ...duLieu, market }),
          JSON.stringify(cuaKiem),
          team,
          hangChoId,
        ],
      );
      await ghiNhatKy(client, {
        teamId: team,
        tacNhan: nguoiDuyetId
          ? `nguoi:${nguoiDuyetId}`
          : "may:hang-cho-tao-don",
        nguoiDungId: nguoiDuyetId,
        hanhDong: "hang_cho_duyet_bi_chan",
        doiTuong: "hang_cho_tao_don",
        doiTuongId: String(hangChoId),
        sau: { chan_vi: cuaKiem.chan_vi },
        ghiChu: cuaKiem.chan_vi.join(" | ").slice(0, 500),
      });
      await client.query("COMMIT");
      return {
        tao: false,
        chan: true,
        chan_vi: cuaKiem.chan_vi,
        cua_kiem: cuaKiem,
        posGoi: 0,
      };
    }

    // ── Bốn cửa của cửa POS. Nhật ký hai pha đi trên POOL GỐC (ngoài giao dịch) ──
    const kqPos = await taoDonFn(
      client,
      ctx,
      {
        hangChoId,
        donHangId: dong.don_hang_id,
        teamId: team,
        market,
        pageIdText: ht.ptext,
        convId: duLieu.conv_id ?? null,
        don: {
          ten: duLieu.ten,
          sdt: duLieu.sdt,
          diaChi: duLieu.dia_chi,
          thanhPho: duLieu.thanh_pho,
          soLuong: duLieu.so_luong,
          tongTien: duLieu.tong_tien,
          tienTe: duLieu.tien_te,
          sanPhamMa: duLieu.san_pham_ma,
          khoHang: duLieu.kho_hang,
        },
      },
      { ...deps, poolNhatKy: deps.poolNhatKy || pool },
    );

    const dh = await client.query(
      `INSERT INTO don_hang
         (team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos, khach_id,
          hoi_thoai_id, page_id, tong_tien, tien_te, san_pham_ma)
       VALUES ($1,$2,'messenger','moi_tu_pos',$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        team,
        kqPos.maPos,
        String(kqPos.status),
        ht.khach_id,
        ht.id,
        ht.page_id,
        duLieu.tong_tien ?? null,
        duLieu.tien_te || null,
        duLieu.san_pham_ma ? [duLieu.san_pham_ma] : [],
      ],
    );
    const don = dh.rows[0];

    await client.query(
      `UPDATE hang_cho_tao_don
          SET trang_thai = 'da_duyet', don_hang_id = $1, nguoi_duyet_id = $2,
              duyet_luc = now(), du_lieu_don = $3, cua_kiem = $4
        WHERE team_id = $5 AND id = $6`,
      [
        don.id,
        nguoiDuyetId,
        JSON.stringify({ ...duLieu, market, ma_pos: kqPos.maPos }),
        JSON.stringify({
          ...cuaKiem,
          cong: {
            ...cuaKiem.cong,
            "5_tao_don": {
              da_chay: true,
              ma_pos: kqPos.maPos,
              status: kqPos.status,
              nhan: kqPos.nhanStatus,
            },
          },
        }),
        team,
        hangChoId,
      ],
    );

    // Máy trạng thái: `moi_tu_pos --da_tao--> day_cho_in` (nhánh messenger, ĐÚNG MỘT
    // chuyển). Chạy TRONG giao dịch để hai sổ không bao giờ lệch nhau.
    const may = await daTaoFn(client, ctx, { donId: don.id }, deps);

    const soAi = await ghiSuKienTaoDon(client, {
      teamId: team,
      hangChoId,
      donId: don.id,
      maPos: kqPos.maPos,
      pageIdText: ht.ptext,
      psid: ht.psid,
    });

    await ghiNhatKy(client, {
      teamId: team,
      tacNhan: nguoiDuyetId ? `nguoi:${nguoiDuyetId}` : "may:hang-cho-tao-don",
      nguoiDungId: nguoiDuyetId,
      hanhDong: "hang_cho_duyet_tao_don",
      doiTuong: "hang_cho_tao_don",
      doiTuongId: String(hangChoId),
      sau: {
        don_hang_id: String(don.id),
        ma_pos: kqPos.maPos,
        trang_thai_he: may.sang,
        trang_thai_pos: String(kqPos.status),
      },
      ghiChu: `duyệt → tạo đơn ${kqPos.maPos} («${kqPos.nhanStatus}») · máy: ${may.tu}→${may.sang}`,
    });

    await client.query("COMMIT");
    return {
      tao: true,
      chan: false,
      donId: String(don.id),
      maPos: kqPos.maPos,
      status: kqPos.status,
      trang_thai_he: may.sang,
      payload: kqPos.payload,
      cua_kiem: cuaKiem,
      soAiGhi: soAi.ghi,
      posGoi: 1,
    };
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* giao dịch đã kết thúc rồi thì thôi */
    }
    throw e;
  } finally {
    client.release();
  }
}

/** Bản `taiBoiCanh` chạy trên client của giao dịch (cùng câu, khác kết nối). */
async function taiBoiCanhTrongTx(client, { teamId, hoiThoaiId }) {
  return taiBoiCanh(client, { teamId, hoiThoaiId });
}

/** `boSung` của sale — nhận đúng bộ tên của `chuanHoaHoSo`, bỏ trường rỗng. */
export function chuanHoaHoSoBoSung(boSung = {}) {
  const day = chuanHoaHoSo(boSung);
  const ra = {};
  for (const [k, v] of Object.entries(day)) {
    if (v === null || v === "") continue;
    ra[k] = v;
  }
  return ra;
}

/**
 * Ghi MỘT dòng `so_ai` cho sự kiện «sale duyệt → đơn đã tạo». KHÔNG gọi `ghiSoAi` của
 * `src/chat/so-ai.js`: neo của nó là `('tin_cho_xu_ly:<loại>', <id tin>)`, dùng lại với
 * `hangChoId` sẽ ĐỤNG neo của một dòng tin thật cùng số. Neo riêng của luồng đơn:
 * `('hang_cho_tao_don:order', hangChoId)` — cùng án lệ `lich_nhac:phan_hoi` (L3-M3).
 */
async function ghiSuKienTaoDon(
  pool,
  { teamId, hangChoId, donId, maPos, pageIdText, psid },
) {
  const r = await pool.query(
    `INSERT INTO so_ai
       (team_id, xay_ra_luc, page_id, psid, loai, ma_model, lane, trang_thai,
        du_lieu, nguon_tep, nguon_dong)
     VALUES ($1, now(), $2, $3, 'order', 'khong-goi-model', 'hang_cho_duyet', 'da_tao',
             $4, 'hang_cho_tao_don:order', $5)
     ON CONFLICT (nguon_tep, nguon_dong) DO NOTHING
     RETURNING id`,
    [
      teamId,
      String(pageIdText ?? ""),
      String(psid ?? ""),
      JSON.stringify({
        hang_cho_id: String(hangChoId),
        don_hang_id: String(donId),
        ma_pos: maPos,
      }),
      Number(hangChoId),
    ],
  );
  return { ghi: r.rowCount > 0, id: r.rowCount ? r.rows[0].id : null };
}

// ═══ LOẠI — sale bỏ một dòng hàng chờ ════════════════════════════════════════
/**
 * Đóng một dòng hàng chờ kèm LÝ DO. Không xoá gì (luật 2 §0a): dòng ở lại với
 * `trang_thai='tu_choi'` để đếm được «bao nhiêu dòng bị bỏ, vì sao».
 */
export async function loai(
  pool,
  ctx,
  { hangChoId, lyDo, teamId = null, nguoiDuyetId = null } = {},
) {
  const team = teamHieuLuc(ctx, teamId);
  if (!chu(lyDo))
    throw new Error(
      "loai: thiếu `lyDo` — một dòng bị bỏ mà không ai biết vì sao là một đơn mất im lặng.",
    );
  const r = await pool.query(
    "SELECT * FROM hang_cho_tao_don WHERE team_id = $1 AND id = $2",
    [team, hangChoId],
  );
  if (!r.rowCount)
    throw new LoiThieuHangCho(
      `loai: không có dòng hàng chờ id=${hangChoId} trong team ${team}.`,
    );
  const dong = r.rows[0];
  if (dong.trang_thai !== "cho_duyet")
    throw new LoiHangChoDaXuLy(
      `Hàng chờ #${hangChoId} đang ở "${dong.trang_thai}" — không loại được nữa.`,
      { trangThai: dong.trang_thai, donHangId: dong.don_hang_id },
    );
  const cuaKiem = {
    ...(dong.cua_kiem || {}),
    ket_thuc: { loai_luc: new Date().toISOString(), ly_do: chu(lyDo) },
  };
  const u = await pool.query(
    `UPDATE hang_cho_tao_don
        SET trang_thai = 'tu_choi', nguoi_duyet_id = $1, duyet_luc = now(), cua_kiem = $2
      WHERE team_id = $3 AND id = $4 AND trang_thai = 'cho_duyet' RETURNING *`,
    [nguoiDuyetId, JSON.stringify(cuaKiem), team, hangChoId],
  );
  await ghiNhatKy(pool, {
    teamId: team,
    tacNhan: nguoiDuyetId ? `nguoi:${nguoiDuyetId}` : "may:hang-cho-tao-don",
    nguoiDungId: nguoiDuyetId,
    hanhDong: "hang_cho_loai",
    doiTuong: "hang_cho_tao_don",
    doiTuongId: String(hangChoId),
    sau: { trang_thai: "tu_choi", ly_do: chu(lyDo) },
    ghiChu: chu(lyDo).slice(0, 500),
  });
  return { id: String(hangChoId), dong: u.rows[0], ly_do: chu(lyDo) };
}

/** Đọc một dòng hàng chờ (màn L4 của B) — kèm `cua_kiem` nguyên văn. */
export async function docHangCho(pool, ctx, { hangChoId, teamId = null } = {}) {
  const team = teamHieuLuc(ctx, teamId);
  const r = await pool.query(
    "SELECT * FROM hang_cho_tao_don WHERE team_id = $1 AND id = $2",
    [team, hangChoId],
  );
  return r.rows[0] ?? null;
}
