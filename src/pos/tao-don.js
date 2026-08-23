// ⚠️ TẠO ĐƠN THẬT TRÊN POS — lệnh GHI RA NGOÀI **nặng nhất** của v3 (làn 🟥).
// Ghi ngược trạng thái (`ghi-nguoc.js`) làm hỏng MỘT đơn đã có; hàm này ĐẺ RA một kiện
// COD gửi tới nhà khách, và luật 2 §0a sổ điều hành CẤM xoá đơn POS ở mọi trạng thái —
// nên một lượt tạo nhầm là KHÔNG GỠ ĐƯỢC. Nguyên tắc gốc §7.3 TONG-QUAN-HE-THONG.md:
//
//                      «THÀ KHÔNG TẠO CÒN HƠN TẠO NHẦM»
//
// ═══ BỐN CỬA AN TOÀN, XẾP NỐI TIẾP, MỖI CỬA MỘT LÝ DO KHÁC NHAU ═════════════════
//
//  (a) VAN MÔI TRƯỜNG `V3_POS_GHI` — CÙNG MỘT van với `ghi-nguoc.js` (một biến, một
//      chỗ người vận hành gạt). Vắng/"0" = ĐÓNG: hàm ném `LoiVanGhiDong` và KHÔNG
//      chạm mạng POS lượt nào. Đo 23/08 trên máy này: biến VẮNG cả ở `process.env` lẫn
//      `.env` (`moiTruongKhoa` cố ý KHÔNG bù nó) ⇒ mọi lượt gọi nhầm chết ở cửa đầu.
//
//  (b) PAYLOAD ĐỦ + `status: 12` TƯỜNG MINH. Khuôn payload port từ
//      `src/pancake-orders.js#createPancakeOrder` (bản đang chạy — đọc khuôn, CẤM SỬA),
//      NHƯNG ⛔ **KHÔNG bê `status: 0` của khuôn cũ**: khuôn cũ tạo đơn ở «Chờ xác nhận»
//      cho nhân viên duyệt tay, còn 01-QUYET-DINH §1 của v3 đòi «duyệt là tạo đơn POS
//      thẳng Chờ in» — mã 12 `wait_print` của bảng mã ĐÃ XÁC MINH. Bê nhầm 0 thì đơn
//      đứng sai trạng thái VÀ lệch `donMessengerDaTao` (máy trạng thái ghi
//      `trang_thai_pos='12'`/`day_cho_in`, POS lại đang ở 0 — hai sổ nói hai chuyện).
//      Thiếu tham chiếu sản phẩm/kho ⇒ ném, KHÔNG đoán (xem `LoiThieuThamChieuSanPham`).
//
//  (c) IDEMPOTENT THEO `hangChoId` — **CƠ CHẾ THẬT, không phải cái tên**. Ba lớp:
//        ① dòng hàng chờ đã mang `don_hang_id` ⇒ ném ngay, 0 lượt gọi API;
//        ② `duyet()` giữ dòng đó bằng `SELECT … FOR UPDATE` suốt lượt (hai sale bấm
//           cùng giây ⇒ lượt sau chờ, rồi đọc `da_duyet` và dừng);
//        ③ **KIỂM TRƯỚC POST**: soi `nhat_ky` xem có dòng `pos_tao_don_bat_dau` MỒ CÔI
//           (không có `pos_tao_don_ket_qua` đi kèm) của chính `hangChoId` này không.
//           Lớp ③ là lớp DUY NHẤT sống sót qua một lượt rollback: POST đã bay đi rồi mà
//           giao dịch hỏng thì ①② quay về trạng thái cũ, chỉ dòng nhật ký (ghi trên
//           POOL, ngoài giao dịch) còn lại. Mồ côi ⇒ TỪ CHỐI tạo lần hai, đẩy người —
//           thà một đơn phải làm tay còn hơn hai kiện COD.
//
//  (d) NHẬT KÝ HAI PHA — `pos_tao_don_bat_dau` TRƯỚC khi POST, `pos_tao_don_ket_qua`
//      SAU. `nhat_ky` là bảng CHỈ-INSERT (trigger tầng CSDL) nên không ai «sửa dòng cũ
//      thành xong»; mất phản hồi giữa chừng ⇒ dòng bắt-đầu MỒ CÔI ⇒ đọc ra được «có
//      lệnh đã bay đi mà không biết kết cục», và đó chính là đầu vào của lớp (c)③.
//
// ⛔ KHÔNG có hàm xoá/huỷ đơn ở đây, sẽ không bao giờ có.
// ⛔ Lượt POST THẬT chưa từng chạy trong phiếu này (phép §7b **T7**, cần
//    `V3_POS_GHI=1` + người chọn shop). Mọi phép của cổng đều tiêm `nap` mock.
import { ghiNhatKy } from "../db/index.js";
import { xacDinhTeam } from "./kho.js";
import { layKetNoi } from "./ket-noi.js";
import { LoiPosKhongTraLoi } from "./api.js";
import { BANG_MA, daXacMinh } from "./ma-trang-thai.js";
import { LoiVanGhiDong, vanGhiMo } from "./ghi-nguoc.js";

const POS = "https://pos.pages.fm/api/v1";

/**
 * Mã «Chờ in» — KHÔNG gõ một hằng số 12 trần rồi tin nó. Lấy tên từ `BANG_MA` (bảng mã
 * đã xác minh trên 3.546 đơn/7 shop, L1-M1) và tự kiểm ngay lúc nạp module: đổi bảng mã
 * mà quên chỗ này thì lỗi hiện ra ở dòng `import`, không phải ở một đơn khách thật.
 */
export const MA_CHO_IN = 12;
if (!daXacMinh(MA_CHO_IN) || BANG_MA[MA_CHO_IN] !== "wait_print") {
  throw new Error(
    `src/pos/tao-don.js: mã ${MA_CHO_IN} không còn là "wait_print" trong BANG_MA ` +
      `(đang là ${JSON.stringify(BANG_MA[MA_CHO_IN] ?? null)}) — dừng nạp module thay vì ` +
      `tạo đơn thật ở một trạng thái không ai xác minh.`,
  );
}

/** Ghi chú dán lên đơn — để sale/kho đọc ra ngay đơn này từ đâu tới. */
export const GHI_CHU_DON = "Đơn do bot Messenger chốt — sale đã duyệt (v3)";

/** Lỗi CÓ TÊN — cửa (b): không đủ tham chiếu sản phẩm/kho để dựng payload. */
export class LoiThieuThamChieuSanPham extends Error {
  constructor(thongDiep, { thieu = [] } = {}) {
    super(thongDiep);
    this.name = "LoiThieuThamChieuSanPham";
    this.thieu = thieu;
  }
}

/** Lỗi CÓ TÊN — cửa (c): dòng hàng chờ này đã (hoặc có thể đã) sinh đơn rồi. */
export class LoiDonDaTao extends Error {
  constructor(thongDiep, { lop = null, chiTiet = null } = {}) {
    super(thongDiep);
    this.name = "LoiDonDaTao";
    this.lop = lop;
    this.chiTiet = chiTiet;
  }
}

/**
 * HỆ SỐ ĐƠN VỊ NHỎ CỦA POS theo tệ — port NGUYÊN VĂN bảng `CCY_FACTOR` của
 * `src/pancake-orders.js:162` (bản đang chạy, CẤM SỬA nên chép chứ không import: file
 * đó đọc `pancake-shops.json` + bắn `fetch` ngay lúc nạp module). Dự án ĐA TỆ Trung Đông
 * — mỗi tệ một hệ số (AED/SAR/QAR/USD ×100 · KWD/OMR/BHD ×1000). KHÔNG có VND ở đây.
 * ⚠️ Tệ KHÔNG có trong bảng ⇒ hàm quy đổi trả `null` (KHÔNG rơi về ×100 im lặng như
 * khuôn cũ) — đoán sai hệ số là sai tiền 100 lần, và cửa gọi sẽ ném thay vì gửi con số bịa.
 */
export const HE_SO_TE = Object.freeze({
  AED: 100,
  SAR: 100,
  QAR: 100,
  USD: 100,
  KWD: 1000,
  OMR: 1000,
  BHD: 1000,
});

/**
 * Quy MỘT SỐ TIỀN Ở ĐƠN VỊ LỚN (major, ví dụ 15,00 AED) SANG ĐƠN VỊ NHỎ (minor, 1500).
 * ⚠️ RF-9 — luồng TẠO ĐƠN v3 KHÔNG dùng hàm này: `goi_gia.gia` và `don_hang.tong_tien`
 *    (⇒ `don.tongTien`) đã LƯU sẵn đơn vị nhỏ POS (khuôn `doc-danh-muc.js` ghi thẳng
 *    `retail_price`, vốn đã là minor). Nhân hệ số MỘT LẦN NỮA ở đó = thu ×100/×1000
 *    (thu 1.500 AED thay vì 15,00). Hàm này chỉ để quy khi NGUỒN khai đơn vị lớn; giữ
 *    export + known-answer (test `l3-m4-duyet` P3) cho tương thích. Luồng tiền dùng
 *    `phiVanChuyenMinor` bên dưới.
 */
export function doiSangDonViNho(tong, tienTe) {
  const n = Number(tong);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const he = HE_SO_TE[String(tienTe || "").toUpperCase()];
  if (!he) return null;
  return Math.round(n * he);
}

/**
 * PHÍ THU CỦA KHÁCH Ở ĐƠN VỊ NHỎ (minor) — nguồn tiền ĐÃ minor nên KHÔNG nhân (RF-9).
 * `goi_gia.gia` · `don_hang.tong_tien` · `don.tongTien` cùng MỘT đơn vị: đơn vị nhỏ POS
 * (khai tường minh ở migration 007 COMMENT + `doc-danh-muc.js`). `HE_SO_TE` ở đây chỉ
 * VALIDATE tệ, KHÔNG nhân:
 *   · tệ KHÔNG có trong bảng ⇒ `null` ⇒ cửa (b) chặn (fail-CLOSED, cấm gửi số tệ lạ);
 *   · tong ≤ 0 / không phải số ⇒ 0 (miễn phí ship);
 *   · còn lại ⇒ chính con số đó (đã minor), làm tròn về số nguyên đơn vị nhỏ.
 * ĐỘC-LẬP-TỆ: mọi tệ đi cùng một đường, không quy về một tệ neo nào.
 */
export function phiVanChuyenMinor(tong, tienTe) {
  const he = HE_SO_TE[String(tienTe || "").toUpperCase()];
  if (!he) return null; // tệ lạ ⇒ fail-CLOSED (cửa b đọc null = thiếu he_so_te)
  const n = Number(tong);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n); // ĐÃ minor — KHÔNG nhân lại (RF-9: không thu ×100/×1000)
}

/**
 * Tách `"<shop_id>:<variation_id>"` (khoá `san_pham.ma`, khuôn L1-M1).
 *
 * ⚠️ LỆCH ĐỀ BÀI — ĐO ĐƯỢC 23/08 trên `aicloser_v3`: **`variation_id` của POS là UUID,
 *    KHÔNG phải số**. `san_pham.ma` **137/137** dòng và `don_hang.san_pham_ma`
 *    **4.581/4.581** phần tử đều dạng `<shop số>:<uuid 36 ký tự>`; số thuần = **0**.
 *    Bản đầu của hàm này khớp `^(\d+):(\d+)$` và `Number(variationId)` — nó sẽ TỪ CHỐI
 *    100% sản phẩm thật, tức mọi lượt duyệt chết ở cửa (b) mà lý do đọc ra là «thiếu
 *    san_pham_ma». Khuôn cũ `createPancakeOrder` gửi thẳng `it.variation_id` POS trả về,
 *    không ép kiểu — v3 làm ĐÚNG THẾ: giữ nguyên CHUỖI.
 *    `shop_id` thì đúng là số (7/7 shop trong `ket_noi_pos`), nên vế đó vẫn siết.
 */
export function tachMaBienThe(ma) {
  const s = String(ma ?? "").trim();
  const i = s.indexOf(":");
  if (i <= 0 || i === s.length - 1) return null;
  const shopId = s.slice(0, i);
  const variationId = s.slice(i + 1);
  if (!/^\d+$/.test(shopId)) return null;
  if (/[\s:]/.test(variationId)) return null; // khoá đục nhưng không được chứa rác
  return { shopId, variationId };
}

/**
 * Dựng payload tạo đơn — HÀM THUẦN, in ra được, cổng ④#5 đối chiếu từng trường với
 * khuôn `createPancakeOrder`. Tách khỏi lượt gửi để bộ ca đọc payload mà KHÔNG chạm mạng.
 */
export function dungPayload({
  pageIdText,
  convId = null,
  don = {},
  variationId,
  khoHang,
}) {
  const diaChi = [don.diaChi, don.thanhPho].filter(Boolean).join(", ");
  const soLuong = Number(don.soLuong) || 1;
  // RF-9: `don.tongTien` ĐÃ ở đơn vị nhỏ POS (= `goi_gia.gia`) ⇒ dùng THẲNG, KHÔNG
  //       nhân `HE_SO_TE` lần nữa. `phiVanChuyenMinor` chỉ validate tệ + làm tròn.
  const gia = phiVanChuyenMinor(don.tongTien, don.tienTe);
  return {
    page_id: String(pageIdText),
    bill_full_name: don.ten || "",
    bill_phone_number: don.sdt || "",
    shipping_address: {
      full_name: don.ten || "",
      phone_number: don.sdt || "",
      address: diaChi,
    },
    // ⛔ KHÔNG `Number(...)`: variation_id thật là UUID (đo 23/08 — xem `tachMaBienThe`).
    //    Ép kiểu ở đây là gửi `NaN` sang POS cho MỌI đơn thật.
    items: [{ variation_id: variationId, quantity: soLuong }],
    // ⛔ TƯỜNG MINH, không phải mặc định: 12 = «Chờ in» (01 §1). Khuôn cũ ghi 0.
    status: MA_CHO_IN,
    warehouse_id: khoHang,
    is_free_shipping: !gia,
    ...(gia ? { shipping_fee: gia } : {}),
    note: GHI_CHU_DON,
    ...(convId ? { conversation_id: String(convId) } : {}),
  };
}

/**
 * ⚠️ ĐIỂM DUY NHẤT PHÁT RA LỆNH TẠO ĐƠN KHÁCH THẬT.
 * Cùng khuôn `guiDatTrangThai` của `src/pos/api.js`: hàm này KHÔNG tự kiểm cửa nào — bốn
 * cửa nằm ở `taoDon()` dưới đây, và đó là hàm DUY NHẤT được phép gọi nó. Bộ ca đếm được
 * «POST bao nhiêu lượt» vì cửa ra trần trụi (án lệ #31).
 *
 * 🔴 NỢ ĐÃ GHI §9: chỗ đúng của hàm này là `src/pos/api.js` («chỗ DUY NHẤT trong v3 chạm
 *    mạng của POS»). Pathspec ③ của phiếu L3-M4 KHÔNG có `api.js` (án lệ #25: không tiện
 *    tay sửa file phiếu khác) nên nó tạm sống ở đây — hai cửa mạng POS trong một repo là
 *    một khớp dễ trôi, phiếu sau gộp về một.
 */
export async function guiTaoDon(ketNoi, payload, { nap = fetch } = {}) {
  const url = `${POS}/shops/${ketNoi.shopId}/orders?api_key=${encodeURIComponent(ketNoi.apiKey)}`;
  const ac = new AbortController();
  const dongHo = setTimeout(() => ac.abort(), 20000);
  let r;
  let chu;
  try {
    r = await nap(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
    chu = await r.text();
  } catch (e) {
    // MẤT PHẢN HỒI — không biết lệnh có tới nơi không. `coPhanHoi:false` là vế duy nhất
    // được để lại dòng bắt-đầu mồ côi (cửa d), và mồ côi là thứ chặn lượt tạo lại.
    throw new LoiPosKhongTraLoi(
      `POS không phản hồi lượt TẠO ĐƠN (shop ${ketNoi.shopId}): ${e.message}`,
      { coPhanHoi: false },
    );
  } finally {
    clearTimeout(dongHo);
  }
  let j = null;
  try {
    j = JSON.parse(chu);
  } catch {
    /* giữ nguyên `chu` để báo lỗi có nội dung */
  }
  if (!r.ok || j == null || j.data?.id == null) {
    throw new LoiPosKhongTraLoi(
      `POS TỪ CHỐI tạo đơn (HTTP ${r.status}): ${String(chu).slice(0, 200)}`,
      { coPhanHoi: true, http: r.status },
    );
  }
  return { id: String(j.data.id), tho: j.data };
}

/**
 * Cửa (c)③ + ③b — đọc dấu vết POST của hàng chờ này trên `nhat_ky` (bảng chỉ-INSERT,
 * ghi trên POOL GỐC nên SỐNG QUA một lượt rollback của giao dịch `duyet()`):
 *   · `moCoi`  = có dòng `bat_dau` chưa có `ket_qua` ⇒ POST bay đi mà MẤT PHẢN HỒI
 *               (không biết POS có nhận không) — lớp ③.
 *   · `daNhan` = có dòng `ket_qua` MANG `ma_pos` ⇒ POS ĐÃ NHẬN đơn của hàng chờ này ở
 *               một lượt trước — lớp ③b (RF-12). Đây là ca «POST THÀNH CÔNG rồi giao
 *               dịch ROLLBACK»: nhật ký hai pha CÂN BẰNG (moCoi=false) nên lớp ③ mù,
 *               nhưng đơn THẬT đã sinh trên POS. `ket_qua` của lượt POS bị POS TỪ CHỐI
 *               KHÔNG mang `ma_pos` (xem cửa d) nên KHÔNG tính là `daNhan` — vế đó cho
 *               phép thử lại, đúng nghiệp vụ.
 */
export async function moCoiTruocPost(pool, { teamId, hangChoId }) {
  const r = await pool.query(
    `SELECT count(*) FILTER (WHERE hanh_dong = 'pos_tao_don_bat_dau')::int  bat_dau,
            count(*) FILTER (WHERE hanh_dong = 'pos_tao_don_ket_qua')::int ket_qua,
            count(*) FILTER (WHERE hanh_dong = 'pos_tao_don_ket_qua'
                             AND (sau ->> 'ma_pos') IS NOT NULL)::int da_nhan
       FROM nhat_ky
      WHERE team_id = $1 AND doi_tuong = 'hang_cho_tao_don' AND doi_tuong_id = $2`,
    [teamId, String(hangChoId)],
  );
  const { bat_dau: batDau, ket_qua: ketQua, da_nhan: daNhan } = r.rows[0];
  return { batDau, ketQua, daNhan: daNhan > 0, moCoi: batDau > ketQua };
}

async function ghiChan(pool, { teamId, cua, hangChoId, chiTiet }) {
  await ghiNhatKy(pool, {
    teamId,
    tacNhan: "may:cua-pos-tao-don",
    hanhDong: "pos_tao_don_bi_chan",
    doiTuong: "hang_cho_tao_don",
    doiTuongId: String(hangChoId ?? ""),
    ghiChu: `cửa (${cua}) chặn: ${chiTiet}`.slice(0, 500),
  });
}

/**
 * TẠO MỘT ĐƠN trên POS, qua đủ bốn cửa.
 *
 * @param pool       Pool/Client dùng để ĐỌC (kết nối POS). Nhật ký hai pha đi qua
 *                   `deps.poolNhatKy` (mặc định = `pool`) — `duyet()` truyền POOL GỐC
 *                   vào đó để dòng nhật ký sống sót qua một lượt rollback (cửa c③).
 * @param ctx        ctx người, hoặc `ctxHeThong()` + `teamId` tường minh.
 * @param hangChoId  id dòng `hang_cho_tao_don` — khoá idempotent.
 * @param donHangId  `hang_cho_tao_don.don_hang_id` ĐANG có (null = chưa tạo). Truyền vào
 *                   chứ không tự đọc: `duyet()` đã giữ dòng bằng FOR UPDATE, đọc lại
 *                   bằng một kết nối khác là đọc ảnh CŨ.
 * @param don        { ten, sdt, diaChi, thanhPho, soLuong, tongTien, tienTe, sanPhamMa, khoHang }
 */
export async function taoDon(
  pool,
  ctx,
  {
    hangChoId,
    donHangId = null,
    teamId = null,
    market = null,
    pageIdText,
    convId = null,
    don = {},
  } = {},
  { nap = fetch, env = process.env, poolNhatKy = null } = {},
) {
  if (hangChoId == null || hangChoId === "")
    throw new Error("taoDon: thiếu `hangChoId` — khoá idempotent của cửa (c).");
  if (!pageIdText) throw new Error("taoDon: thiếu `pageIdText`.");
  if (!market)
    throw new Error(
      "taoDon: thiếu `market` — `don_hang` không có cột shop và id đơn POS là dãy " +
        "riêng từng shop (L1-M1). Fail-CLOSED thay vì đoán shop.",
    );
  const team = await xacDinhTeam(pool, ctx, {
    teamId,
    doiTuong: "hang_cho_tao_don",
  });
  const soNhatKy = poolNhatKy || pool;

  // ── CỬA (a) — van, rẻ nhất, chặn trước mọi thứ ────────────────────────────
  if (!vanGhiMo(env)) {
    await ghiChan(soNhatKy, {
      teamId: team.teamId,
      cua: "a",
      hangChoId,
      chiTiet: `V3_POS_GHI=${JSON.stringify(env.V3_POS_GHI ?? null)} — van ĐÓNG, 0 lượt gọi API`,
    });
    throw new LoiVanGhiDong(
      "V3_POS_GHI vắng hoặc ≠1 — cửa TẠO ĐƠN POS ĐÓNG (fail-CLOSED). Không lượt gọi " +
        "API nào được phát. Đặt biến là việc NGƯỜI vận hành (H9 §8 sổ điều hành).",
    );
  }

  // ── CỬA (c) lớp ① — dòng hàng chờ đã mang đơn ─────────────────────────────
  if (donHangId != null && donHangId !== "") {
    await ghiChan(soNhatKy, {
      teamId: team.teamId,
      cua: "c1",
      hangChoId,
      chiTiet: `hàng chờ đã gắn don_hang_id=${donHangId}`,
    });
    throw new LoiDonDaTao(
      `Hàng chờ #${hangChoId} đã sinh đơn #${donHangId} — không tạo lần hai.`,
      { lop: "c1", chiTiet: String(donHangId) },
    );
  }

  // ── CỬA (b) — payload đủ + status 12 tường minh ───────────────────────────
  const thieu = [];
  const bienThe = tachMaBienThe(don.sanPhamMa);
  if (!bienThe) thieu.push("san_pham_ma");
  if (don.khoHang == null || don.khoHang === "") thieu.push("kho_hang");
  // RF-9: validate tệ (fail-CLOSED tệ lạ) mà KHÔNG nhân — `tongTien` đã minor.
  const gia = phiVanChuyenMinor(don.tongTien, don.tienTe);
  if (gia === null) thieu.push(`he_so_te:${don.tienTe ?? "(rỗng)"}`);
  if (thieu.length) {
    await ghiChan(soNhatKy, {
      teamId: team.teamId,
      cua: "b",
      hangChoId,
      chiTiet: `thiếu ${thieu.join(", ")}`,
    });
    throw new LoiThieuThamChieuSanPham(
      `taoDon: thiếu ${thieu.join(", ")} — KHÔNG dựng payload bằng giá trị đoán. ` +
        `Sale bổ sung qua \`duyet(..., {boSung})\`, hoặc cửa POS/di trú cấp nguồn cho ` +
        `hai trường này (nợ §9).`,
      { thieu },
    );
  }

  const ketNoi = await layKetNoi(pool, ctx, market, { teamId, env });
  if (String(bienThe.shopId) !== String(ketNoi.shopId)) {
    await ghiChan(soNhatKy, {
      teamId: team.teamId,
      cua: "b",
      hangChoId,
      chiTiet: `san_pham_ma shop=${bienThe.shopId} ≠ kết nối shop=${ketNoi.shopId}`,
    });
    throw new LoiThieuThamChieuSanPham(
      `taoDon: mã biến thể thuộc shop ${bienThe.shopId} nhưng kết nối POS của thị ` +
        `trường "${market}" là shop ${ketNoi.shopId} — gửi đi là tạo đơn NHẦM SHOP.`,
      { thieu: ["shop_lech"] },
    );
  }

  const payload = dungPayload({
    pageIdText,
    convId,
    don,
    variationId: bienThe.variationId,
    khoHang: don.khoHang,
  });
  if (payload.status !== MA_CHO_IN) {
    throw new Error(
      `taoDon: payload.status=${payload.status} ≠ ${MA_CHO_IN} («Chờ in») — chặn.`,
    );
  }

  // ── CỬA (c) lớp ③ — KIỂM TRƯỚC POST, thứ duy nhất sống qua rollback ───────
  const mc = await moCoiTruocPost(soNhatKy, {
    teamId: team.teamId,
    hangChoId,
  });
  if (mc.moCoi) {
    await ghiChan(soNhatKy, {
      teamId: team.teamId,
      cua: "c3",
      hangChoId,
      chiTiet: `nhật ký 2 pha MỒ CÔI (bắt_đầu=${mc.batDau} · kết_quả=${mc.ketQua})`,
    });
    throw new LoiDonDaTao(
      `Hàng chờ #${hangChoId} có ${mc.batDau - mc.ketQua} lượt POST không biết kết ` +
        `cục (nhật ký hai pha mồ côi) — TỪ CHỐI tạo lại. Người phải mở POS xem đơn đã ` +
        `vào chưa; thà một đơn làm tay còn hơn hai kiện COD.`,
      { lop: "c3", chiTiet: `${mc.batDau}/${mc.ketQua}` },
    );
  }

  // ── CỬA (c) lớp ③b — POST ĐÃ THÀNH CÔNG rồi giao dịch ROLLBACK (RF-12) ─────
  // Lớp ③ mù ca này: POST OK ⇒ nhật ký hai pha CÂN BẰNG (moCoi=false), mà đơn THẬT đã
  // sinh trên POS và `hang_cho.don_hang_id` bị rollback trả về null ⇒ lớp ① không thấy.
  // `daNhan` (ket_qua mang ma_pos, ghi trên POOL GỐC) là dấu DUY NHẤT sống qua rollback
  // nói «POS đã nhận đơn của hàng chờ này». UNIQUE DB (migration 007) là chốt cứng cuối:
  // không bao giờ hai `ket_qua` thành công cùng hangChoId (án lệ #31 — cửa RA đúng một cái).
  if (mc.daNhan) {
    await ghiChan(soNhatKy, {
      teamId: team.teamId,
      cua: "c3b",
      hangChoId,
      chiTiet:
        "POST đã THÀNH CÔNG ở lượt trước (ket_qua mang ma_pos) — sống qua rollback",
    });
    throw new LoiDonDaTao(
      `Hàng chờ #${hangChoId} ĐÃ có một lượt POST thành công trên POS (dấu sống qua ` +
        `rollback) — TỪ CHỐI tạo lại. Người mở POS xác nhận đơn; thà một đơn làm tay ` +
        `còn hơn hai kiện COD.`,
      { lop: "c3b", chiTiet: "da_nhan" },
    );
  }

  // ── CỬA (d) pha 1 — GHI TRÊN POOL GỐC, cố ý ngoài giao dịch của duyet() ───
  const idBatDau = await ghiNhatKy(soNhatKy, {
    teamId: team.teamId,
    tacNhan: "may:cua-pos-tao-don",
    hanhDong: "pos_tao_don_bat_dau",
    doiTuong: "hang_cho_tao_don",
    doiTuongId: String(hangChoId),
    sau: {
      status: payload.status,
      nhan: BANG_MA[payload.status],
      shop: ketNoi.shopId,
      items: payload.items,
      shipping_fee: payload.shipping_fee ?? 0,
    },
    ghiChu: `market=${market} · page=${pageIdText} · sắp gửi POST tạo đơn`,
  });

  let kq;
  try {
    kq = await guiTaoDon(ketNoi, payload, { nap });
  } catch (e) {
    if (e.coPhanHoi) {
      // POS ĐÃ trả lời và trả lời là "không" ⇒ kết cục BIẾT RÕ, đóng pha 2 để lượt sau
      // không bị cửa (c)③ chặn oan.
      await ghiNhatKy(soNhatKy, {
        teamId: team.teamId,
        tacNhan: "may:cua-pos-tao-don",
        hanhDong: "pos_tao_don_ket_qua",
        doiTuong: "hang_cho_tao_don",
        doiTuongId: String(hangChoId),
        ghiChu: `POS TỪ CHỐI (http=${e.http}): ${e.message}`.slice(0, 500),
      });
    }
    // else: mất phản hồi ⇒ CỐ Ý để dòng bắt-đầu MỒ CÔI (đầu vào của cửa c③).
    throw e;
  }

  // ── CỬA (d) pha 2 ─────────────────────────────────────────────────────────
  const maPos = `${ketNoi.shopId}:${kq.id}`;
  await ghiNhatKy(soNhatKy, {
    teamId: team.teamId,
    tacNhan: "may:cua-pos-tao-don",
    hanhDong: "pos_tao_don_ket_qua",
    doiTuong: "hang_cho_tao_don",
    doiTuongId: String(hangChoId),
    sau: { ma_pos: maPos, status: payload.status },
    ghiChu: `POS nhận, đơn ${maPos} (bắt đầu #${idBatDau})`,
  });

  return {
    maPos,
    idPos: kq.id,
    shopId: ketNoi.shopId,
    market,
    status: payload.status,
    nhanStatus: BANG_MA[payload.status],
    payload,
    idBatDau,
  };
}
