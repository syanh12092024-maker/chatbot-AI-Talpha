// LỌC TRÙNG KIỂM CHÉO HAI LUỒNG ĐƠN (phiếu L3-M2, làn 🟥) — cửa kiểm #1 của L3-M4.
//
// ═══ VÌ SAO PHẢI KIỂM CHÉO, KHÔNG PHẢI KIỂM TRONG MỘT LUỒNG ═════════════════════
// 01 §1: «Lọc trùng phải KIỂM CHÉO cả hai luồng — cùng một khách vào được bằng hai
// đường». Đây KHÔNG phải một câu lý thuyết: đo 23/08/2026 trên 5.144 đơn thật / 7 shop
// POS (Saudi·UAE·Kuwait·Bahrain·Oman·Qatar·Taiwan) —
//   · 56 khách có đơn ở CẢ HAI luồng (có `conversation_id` và không có);
//   · 16 trong số đó có ít nhất MỘT sản phẩm trùng nhau giữa hai luồng;
//   · 20 cặp (đơn messenger, đơn trang bán hàng) cùng sản phẩm, khoảng cách ngày:
//     0 · 0,01 · 0,01 · 0,03 · 0,04 · 0,71 · 1,05 · 1,43 · 1,49 · 1,5 · 1,89 · 1,93 ·
//     1,93 · 2,49 · 3,14 · 4,44 · 5,25 · 11,69 · 19,39 · 28,35 ngày.
// Ví dụ đọc được: SĐT `966501984606` — đơn Messenger #68771 và đơn trang bán hàng
// #68769, CÙNG sản phẩm, cách nhau 0 ngày. Không có cửa này thì đó là hai kiện COD.
//
// ═══ BA QUYẾT ĐỊNH ĐO ĐƯỢC CỦA FILE NÀY ═════════════════════════════════════════
// ① CHUẨN HOÁ SĐT có CẮT MÃ QUỐC GIA. Đo cùng bộ 5.144 đơn: nếu chỉ bỏ `+`/`00`/số 0
//    đầu thì hệ đếm ra 4.558 «khách»; cắt thêm mã quốc gia còn 4.500 — tức **58 khách
//    bị tách đôi** chỉ vì hai luồng khai số khác định dạng, và số cặp trùng chéo bắt
//    được tăng 48→56 khách / 13→16 khách-cùng-sản-phẩm. Bảng định dạng thật đo được:
//      `0-dau` 1.068 (vd 0583077980) · `so-tran` 1.966 (545769903) ·
//      `+E164` 270 (+966540575011) · `00xx` 25 (00966545454774) · NULL 15.
// ② CỬA SỔ NGÀY MẶC ĐỊNH = 7. Bắt 17/20 cặp trùng chéo đo được (85%), trong khi p75
//    của khoảng cách giữa hai đơn liên tiếp CÙNG MỘT KHÁCH là 12,16 ngày ⇒ cửa sổ 7
//    ngày nằm DƯỚI nhịp mua lại thật, không nuốt một lượt mua lại hợp lệ. Nới lên 14
//    ngày chỉ thêm 1 cặp (18/20) nhưng đã chạm vùng mua lại. Config được.
// ③ VẾ SẢN PHẨM có thể MÙ, và mù thì PHẢI NÓI RA. `don_hang.san_pham_ma` (migration
//    005) hôm nay CHƯA CÓ NGƯỜI GHI — chủ cột là cửa POS `src/pos/doc-don.js`, đất
//    phiếu L1-M1 (án lệ #25: không tiện tay sửa file phiếu khác; đã ghi §9 sổ). Nên
//    hàm này KHÔNG bao giờ đọc «cột rỗng» thành «khác sản phẩm ⇒ không trùng» — đó là
//    fail-OPEN trá hình. Rơi vào nhánh `nghi_trung_chua_ro_san_pham`: vẫn báo trùng,
//    nhưng bằng một MÃ LÝ DO KHÁC HẲN để không ai nhầm nó với trùng đã xác minh.
//
// ⛔ Hàm này KHÔNG chặn, KHÔNG sửa, KHÔNG tạo đơn nào — nó TRẢ KẾT QUẢ. Người quyết
//    là L3-M4 (`hang_cho_tao_don.cua_kiem`) và sale trên màn L4.
import { LoiThieuBoiCanhTeam } from "../db/index.js";

/**
 * MÃ QUỐC GIA + ĐỘ DÀI SỐ NỘI ĐỊA — ĐO ĐƯỢC, không tra Wikipedia.
 * Nguồn: 5.144 đơn thật/7 shop (23/08/2026), cột `shipping_address.phone_number`.
 * Đo bằng cách bỏ `+`/`00`/số 0 đầu rồi đếm độ dài + 3 chữ số đầu, theo TỪNG shop:
 *   Saudi   966 → 9 chữ số nội địa (669/673 số nội địa dài 9, bắt đầu bằng 5)
 *   UAE     971 → 9   (700/709 dài 9, bắt đầu bằng 5)
 *   Kuwait  965 → 8   (674/674 dài 8)
 *   Bahrain 973 → 8   (720/720 dài 8)
 *   Oman    968 → 8   (688/688 dài 8)
 *   Qatar   974 → 8   (301/301 dài 8)
 *   Taiwan  886 → 9   (329/329 dài 9, bắt đầu bằng 9)
 *
 * ⚠️ BIÊN CỦA KẾT LUẬN (án lệ #23 — ghi biên vào chính câu kết luận): **Philippines
 * (63) CHƯA ĐO** — `pancake-shops.json` không có shop PH, trong khi §0a sổ điều hành
 * khai thị trường có PH. Số 10 dưới đây là số KHAI theo khuôn quốc tế, chưa có đơn
 * thật nào chứng minh. Có shop PH thì đo lại rồi sửa dòng này.
 *
 * Luật CẮT là DENY-BY-DEFAULT: chỉ cắt khi độ dài TỔNG khớp ĐÚNG `mã + nội địa`.
 * Nhờ vậy một số nội địa 8 chữ số không bao giờ bị hiểu nhầm là số quốc tế 11 chữ số,
 * và rác 12 chữ số mở đầu `123`/`256`/`990` (đo được, vài chục ca) không bị cắt bừa.
 */
export const MA_QUOC_GIA = Object.freeze([
  Object.freeze({ ma: "966", daiNoiDia: 9, ten: "Saudi", daDo: true }),
  Object.freeze({ ma: "971", daiNoiDia: 9, ten: "UAE", daDo: true }),
  Object.freeze({ ma: "965", daiNoiDia: 8, ten: "Kuwait", daDo: true }),
  Object.freeze({ ma: "973", daiNoiDia: 8, ten: "Bahrain", daDo: true }),
  Object.freeze({ ma: "968", daiNoiDia: 8, ten: "Oman", daDo: true }),
  Object.freeze({ ma: "974", daiNoiDia: 8, ten: "Qatar", daDo: true }),
  Object.freeze({ ma: "886", daiNoiDia: 9, ten: "Taiwan", daDo: true }),
  Object.freeze({ ma: "63", daiNoiDia: 10, ten: "Philippines", daDo: false }),
]);

/** Cửa sổ ngày mặc định — xem quyết định ② đầu file. */
export const KEO_NGAY_MAC_DINH = 7;

/**
 * Trần số dòng một lượt tra. Chạm trần thì NÓI RA (`chamTran: true`), không cắt im
 * lặng — án lệ «LIMIT 5000 cắt im lặng khối chưa quy đơn».
 */
export const TRAN_DONG_TRA = 500;

/** Từ vựng lý do — MỘT tập, cả cổng lẫn L3-M4 grep theo đây, không gõ tay lần hai. */
export const LY_DO_TRUNG = Object.freeze([
  "chua_co_sdt", // Messenger giữa chừng: khách chưa đưa số (khoá nối chưa có)
  "sdt_khong_doc_duoc", // có chuỗi nhưng không còn chữ số nào sau khi lọc
  "khong_trung", // đã tra, không có đơn nào khớp
  "trung_khop_san_pham", // trùng ĐÃ XÁC MINH: cùng khách + cùng SP + trong cửa sổ
  "nghi_trung_chua_ro_san_pham", // cùng khách + trong cửa sổ, vế SP KHÔNG đọc được
]);

/** Ba giá trị `nguon_trung` + null khi không trùng. */
export const NGUON_TRUNG = Object.freeze([
  "trang_ban_hang",
  "messenger",
  "ca_hai",
]);

/**
 * CHUẨN HOÁ SỐ ĐIỆN THOẠI — HÀM THUẦN, và là NGUỒN LUẬT DUY NHẤT.
 * Không có bản SQL song sinh: câu tra chỉ lọc thô bằng BẢY CHỮ SỐ CUỐI (xem
 * `duoiBay`), phần phán chính xác làm ở đây. Hai nguồn một luật là cách rẻ nhất để
 * chúng trôi khỏi nhau — mà trôi ở đây nghĩa là một cặp trùng lọt qua, im lặng.
 *
 * Bốn bước, theo đúng thứ tự: bỏ mọi ký tự không phải chữ số (nuốt luôn `+`, khoảng
 * trắng, `-`, `()`) → bỏ mọi số 0 đầu (nuốt luôn tiền tố quốc tế `00` và số 0 trung
 * kế nội địa) → cắt mã quốc gia KHI VÀ CHỈ KHI độ dài khớp đúng → trả số nội địa.
 *
 * @returns số nội địa đã chuẩn hoá, hoặc `null` khi không đọc được chữ số nào.
 */
export function chuanHoaSdt(tho) {
  if (tho == null) return null;
  const so = String(tho)
    .replace(/[^0-9]/g, "")
    .replace(/^0+/, "");
  if (!so) return null;
  for (const { ma, daiNoiDia } of MA_QUOC_GIA) {
    if (so.length === ma.length + daiNoiDia && so.startsWith(ma))
      return so.slice(ma.length);
  }
  return so;
}

/**
 * KHOÁ ĐỊNH DANH MỘT KHÁCH — «hai đơn này là cùng một người hay không».
 *
 * Vì sao không phải chỉ mỗi SĐT: POS lưu số Ở DẠNG NỘI ĐỊA, KHÔNG mã nước (đo 26/08 —
 * Kuwait `66410373`, Qatar `55534997`, Saudi/UAE `5xxxxxxxx`). Nên `chuanHoaSdt` chạy
 * trên dữ liệu POS là no-op: nó cắt tiền tố mà POS không có tiền tố nào. Nước KHÔNG
 * nằm trong con số — nó nằm ở «đơn đến từ shop nào». Bảy shop đều ở team 1, nên gộp
 * chỉ theo (team, số) là gộp bảy nước làm một. Đo trên mẫu 3.000 đơn/shop: Saudi ∩ UAE
 * có **6** số trùng khít (`561698732` `547049872` …); nhóm 8 số (Kuwait·Qatar·Bahrain·
 * Oman, 5.703 số) thì **0** — tức RF-23 gọi tên đúng cái nhóm không va chạm.
 *
 * ⛔ CÂU SONG SINH CÓ THẬT VÀ NÓ Ở TRONG CSDL: chỉ mục `khach_sdt_trong_team_nuoc`
 *    (migration 013) là `(team_id, coalesce(thi_truong,''), so_dien_thoai)`. Hàm này
 *    PHẢI ra cùng một phán quyết với nó — `coalesce(...,'')` ở đây là để khớp, không
 *    phải cho gọn. Hai bản trôi khỏi nhau nghĩa là bên ghi tưởng tạo mới còn CSDL nói
 *    trùng (hoặc ngược lại). Ca `Q6` của `test/a7-1-khoa-khach.test.js` khoá điều đó
 *    bằng cách cho chính CSDL ném lỗi trùng, chứ không đọc hai bản rồi so bằng mắt.
 *
 * @param thiTruong tên thị trường LẤY TỪ `ket_noi_pos.market` — KHÔNG phải
 *                  `page.thi_truong` (từ vựng khác: `KSA` vs `Saudi`, khớp 0/502 page).
 *                  Chưa tra được nước ⇒ null/rỗng ⇒ lùi về hành vi cũ (gộp theo số).
 * @param sdtTho    SĐT thô; hàm tự chạy `chuanHoaSdt`.
 * @returns khoá chuỗi, hoặc `null` khi không đọc được chữ số nào (không có khoá nối).
 */
export function khoaKhach(thiTruong, sdtTho) {
  const sdt = chuanHoaSdt(sdtTho);
  if (!sdt) return null;
  return `${String(thiTruong ?? "").trim()}|${sdt}`;
}

/**
 * BẢY CHỮ SỐ CUỐI — vế THÔ dùng để lọc bằng index (`khach_duoi7_sdt`, migration 005).
 * Bao rộng hơn `chuanHoaSdt` một cách CÓ CHỦ Ý và AN TOÀN MỘT CHIỀU: chuẩn hoá chỉ
 * CẮT TIỀN TỐ, nên hai số bằng nhau sau chuẩn hoá luôn có bảy chữ số cuối bằng nhau
 * ⇒ vế này không bao giờ đánh rơi một cặp trùng (nó chỉ có thể nhận dư, và phần dư bị
 * `chuanHoaSdt` loại ở tầng JS). Số ngắn nhất đo được trong dữ liệu thật: 7 chữ số.
 */
export function duoiBay(tho) {
  const so = String(tho ?? "").replace(/[^0-9]/g, "");
  return so.slice(-7);
}

/**
 * Câu tra CHÉO HAI LUỒNG — in ra được, đo được.
 * ⛔ Vế KHÔNG ĐƯỢC RƠI RA khi ai chép câu này đi: câu này **không lọc `nguon`**. Thêm
 *    một vế `nguon = ...` vào đây là biến phép kiểm CHÉO thành phép kiểm trong một
 *    luồng, tức đúng cái lỗ 01 §1 sinh ra để vá — và nó sẽ vẫn xanh trên mọi ca test
 *    chỉ có một luồng.
 */
export const CAU_TRA_TRUNG = `
  SELECT d.id, d.ma_pos, d.nguon, d.trang_thai_he, d.trang_thai_pos, d.tao_luc,
         d.khach_id, d.san_pham_ma, k.so_dien_thoai
    FROM don_hang d
    JOIN khach k ON k.id = d.khach_id AND k.team_id = d.team_id
   WHERE d.team_id = $1
     AND d.tao_luc >= now() - ($2 * interval '1 day')
     AND right(regexp_replace(k.so_dien_thoai, '[^0-9]', '', 'g'), 7) = $3
   ORDER BY d.tao_luc DESC
   LIMIT $4`;

function teamHieuLuc(ctx, teamId) {
  if (ctx?.laHeThong) {
    if (teamId == null || teamId === "")
      throw new LoiThieuBoiCanhTeam(
        "kiemTrung dưới ctxHeThong() bắt buộc kèm `teamId` tường minh — job nền không " +
          "có team mặc định để suy hộ (cùng luật với tầng truy vấn src/db/truy-van.js).",
      );
    return String(teamId);
  }
  if (!ctx || ctx.teamId == null || ctx.teamId === "")
    throw new LoiThieuBoiCanhTeam(
      "kiemTrung: thiếu bối cảnh team (ctx.teamId rỗng) — từ chối chạy, KHÔNG trả " +
        "«không trùng» (một kết quả rỗng vì sai cách gọi trông y hệt một kết quả sạch).",
    );
  if (teamId != null && teamId !== "" && String(teamId) !== String(ctx.teamId))
    throw new LoiThieuBoiCanhTeam(
      `kiemTrung: teamId=${teamId} khác ctx.teamId=${ctx.teamId} — không phục vụ lượt ` +
        `tra xuyên team.`,
    );
  return String(ctx.teamId);
}

function gopNguon(ds) {
  const co = new Set(ds.map((d) => d.nguon));
  if (co.size === 0) return null;
  if (co.size > 1) return "ca_hai";
  return [...co][0];
}

function raDong(d) {
  return {
    id: String(d.id),
    ma_pos: d.ma_pos,
    nguon: d.nguon,
    trang_thai_he: d.trang_thai_he,
    trang_thai_pos: d.trang_thai_pos,
    tao_luc: d.tao_luc,
    khach_id: String(d.khach_id),
    san_pham_ma: d.san_pham_ma ?? null,
  };
}

/**
 * KIỂM TRÙNG CHÉO — cửa kiểm #1 cho L3-M4.
 *
 * @param ctx  ctx người (mang teamId) hoặc `ctxHeThong()` + `teamId` tường minh.
 * @param soDienThoai SĐT thô của khách, định dạng nào cũng được (xem `chuanHoaSdt`).
 * @param sanPhamId   mã biến thể POS `"<shop_id>:<variation_id>"`, hoặc null = chưa biết.
 * @param keo_ngay    cửa sổ ngày ngược về quá khứ (mặc định 7 — quyết định ② đầu file).
 *
 * @returns {{trung:boolean, don:Array, nguon_trung:string|null, ly_do:string,
 *            sdt_chuan:string|null, so_don_xet:number, chamTran:boolean}}
 *
 * ⛔ KHÔNG ném khi thiếu SĐT — Messenger giữa chừng CHƯA CÓ số là trạng thái BÌNH
 *    THƯỜNG của nghiệp vụ (`khach.so_dien_thoai` NULL được, luoc-do §2). Trả
 *    `trung:false` + `ly_do:'chua_co_sdt'`: nói ra rằng cửa này chưa phán được, để
 *    L3-M4 không đọc nhầm thành «đã kiểm, sạch».
 */
export async function kiemTrung(
  pool,
  ctx,
  {
    soDienThoai,
    sanPhamId = null,
    keo_ngay = KEO_NGAY_MAC_DINH,
    teamId = null,
  } = {},
) {
  const team = teamHieuLuc(ctx, teamId);
  const ngay = Number(keo_ngay);
  if (!Number.isFinite(ngay) || ngay <= 0)
    throw new Error(
      `kiemTrung: keo_ngay=${keo_ngay} không hợp lệ — cửa sổ ngày phải là số dương ` +
        `(mặc định ${KEO_NGAY_MAC_DINH}).`,
    );

  const rong = soDienThoai == null || String(soDienThoai).trim() === "";
  if (rong)
    return {
      trung: false,
      don: [],
      nguon_trung: null,
      ly_do: "chua_co_sdt",
      sdt_chuan: null,
      so_don_xet: 0,
      chamTran: false,
    };

  const sdt = chuanHoaSdt(soDienThoai);
  if (!sdt)
    return {
      trung: false,
      don: [],
      nguon_trung: null,
      ly_do: "sdt_khong_doc_duoc",
      sdt_chuan: null,
      so_don_xet: 0,
      chamTran: false,
    };

  const r = await pool.query(CAU_TRA_TRUNG, [
    team,
    ngay,
    duoiBay(soDienThoai),
    TRAN_DONG_TRA,
  ]);
  // Vế THÔ đã lọc bằng index; đây là vế CHÍNH XÁC, chạy bằng đúng một luật chuẩn hoá.
  const khop = r.rows.filter((d) => chuanHoaSdt(d.so_dien_thoai) === sdt);

  const coSp = (d) => Array.isArray(d.san_pham_ma) && d.san_pham_ma.length > 0;
  const khopSp =
    sanPhamId == null
      ? []
      : khop.filter(
          (d) => coSp(d) && d.san_pham_ma.includes(String(sanPhamId)),
        );
  // MÙ: đơn không khai sản phẩm, HOẶC lượt gọi không biết mình đang hỏi sản phẩm nào.
  const muSp = khop.filter((d) => !coSp(d) || sanPhamId == null);

  if (khopSp.length) {
    const don = khopSp.map(raDong);
    return {
      trung: true,
      don,
      nguon_trung: gopNguon(don),
      ly_do: "trung_khop_san_pham",
      sdt_chuan: sdt,
      so_don_xet: khop.length,
      chamTran: r.rowCount >= TRAN_DONG_TRA,
    };
  }
  if (muSp.length) {
    // FAIL-CLOSED có tên riêng. Vì sao nghiêng về «báo trùng»: kết quả này đi vào
    // `hang_cho_tao_don` — nơi CÓ NGƯỜI duyệt. Báo thừa tốn của sale một lượt nhìn;
    // báo thiếu tốn một kiện COD gửi trùng cho khách. Hai giá không cùng hạng.
    const don = muSp.map(raDong);
    return {
      trung: true,
      don,
      nguon_trung: gopNguon(don),
      ly_do: "nghi_trung_chua_ro_san_pham",
      sdt_chuan: sdt,
      so_don_xet: khop.length,
      chamTran: r.rowCount >= TRAN_DONG_TRA,
    };
  }
  return {
    trung: false,
    don: [],
    nguon_trung: null,
    ly_do: "khong_trung",
    sdt_chuan: sdt,
    so_don_xet: khop.length,
    chamTran: r.rowCount >= TRAN_DONG_TRA,
  };
}
