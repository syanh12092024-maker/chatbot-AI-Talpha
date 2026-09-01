// TẦNG ĐỌC CỦA MÀN «RỦI RO HOÀN HÀNG» (G2-G7, sóng 4).
//
// Yêu cầu: *«Bốn tầng chính sách thay vì một ngưỡng cứng»*, và nghiệm thu đòi *«tách ra đúng
// 144 khách hoàn 30–65% đang bị gộp nhầm vào nhóm bình thường»*.
//
// ═══ BỐN TẦNG ĐANG «CHỜ CHỐT» — MÀN KHÔNG ĐƯỢC LÀM NHƯ ĐÃ DUYỆT ══════════════════════
// `01-QUYET-DINH.md` §11 xếp nó vào bảng CHƯA CHỐT: *«Đề xuất chia bốn tầng thay vì một
// ngưỡng — 144 khách hoàn 30–65% đang bị gộp nhầm. **Chờ chốt**»*.
//
// Nên màn này KHÔNG áp chính sách nào lên ai. Nó **đọc phân bố đã chấm** và cho thấy mỗi tầng
// gom vào bao nhiêu người — để chủ dự án chốt bằng số, không bằng cảm giác. Ghi một ngưỡng
// cứng vào code rồi tô đỏ ai vượt ngưỡng là tự chốt hộ một quyết định chưa ai chốt.
//
// ═══ MỘT NGUỒN: CỘT `khach.tang_hoan`, KHÔNG TỰ TÍNH LẠI (H10, 01/09) ═══════════════
// Bản trước tự quét `don_hang` rồi gom trong JS. Đó là bản khai THỨ HAI của một chỉ số đã
// có bản chuẩn, và nó đã trôi khỏi bản chuẩn theo BA chiều — mỗi chiều đều đẩy con số theo
// hướng nguy hiểm hơn (`src/orders/ti-le-hoan.js` đầu file, bốn quyết định đo được):
//
//   ① MÃ HOÀN. Bản trước chép `CANCEL` của `src/pancake-orders.js` = {4,5,6,7,8}. Luật v3
//      đã chốt {4,5,6,7} — **KHÔNG có 8**: `8 = packing` là một bước TIẾN (`status_history`
//      đơn 47397 UAE: 0→1→12→8), tính nó vào nhóm hoàn thì 108 khách đổi tỉ lệ. Bản v1 là
//      nợ N1 §9, không phải chuẩn để chép theo.
//   ② MẪU SỐ. Bản trước chia cho MỌI đơn; luật chia cho đơn ĐÃ KẾT ({4,5,6,7} ∪ {3,16}).
//      Đơn đang chạy chưa có kết cục nào để đếm — nhét vào mẫu số làm loãng tỉ lệ.
//   ③ SÀN. Luật có `toi_thieu_don_ket = 2`: dưới sàn thì mang nhãn RIÊNG `chua_du_don`,
//      không xếp tầng. Bản trước không có sàn, chỉ gắn nhãn `duTin` cho vui rồi vẫn đếm
//      người ta vào tầng «hoàn cao» — đúng cái *«biến nhiễu thành bản án»* mà luật cấm.
//
// Hệ quả đo được: màn nói **40.064** khách «hoàn cao», luật đã ký nói **5.990**, lệch 6,7
// lần, và 34.187 trong số đó chỉ có ĐÚNG MỘT đơn. Nay màn ĐỌC cột do job đêm
// `src/orders/ti-le-hoan.js#chamTiLeHoan` chấm — hai màn không thể nói hai con số nữa.
//
// ═══ MÙ THÌ NÓI RA, KHÔNG TỰ TÍNH BÙ ════════════════════════════════════════════════
// Job chưa chấm (cột `tang_hoan` NULL) ⇒ màn nói «job chưa chạy», KHÔNG rơi về phép tính
// riêng. Một con số sai trông giống hệt một con số đúng; một ô trống thì không.
//
// ═══ CON SỐ 144 CỦA TÀI LIỆU ĐO TRÊN 4,2% DÂN SỐ ════════════════════════════════════
// `04-TIEN-DO.md` khai thẳng: mốc 23/08 đo trên **4,2%** dân số, nên mọi số dẫn xuất — gồm
// phân bố bốn tầng — chỉ là ước. Đo lại 28/08 trên toàn bộ: tầng `canh_bao` (30–65%) có
// **5.449** khách. Màn hiện con số ĐỌC ĐƯỢC và nói rõ nó khác tài liệu.

import { batBuocBoiCanh, VAI } from "../../auth/boi-canh.js";

export const BANG_KHACH = "khach";
/**
 * KHÔNG có `sale` — §9: sale vào THẲNG bảng điều phối, không màn nào khác.
 *
 * Bản đầu tôi cho sale vào với lý do «sale cần biết rủi ro trước khi chốt». Lý do đúng,
 * chỗ đặt sai: thứ sale cần là rủi ro CỦA KHÁCH ĐANG NÓI CHUYỆN, và chỗ của nó là màn chi
 * tiết việc — nơi sale đã đứng sẵn. Một màn phân bố toàn team không giúp gì cho một cú chốt.
 * (Lưới quét `phan-quyen-nam-vai.test.mjs` bắt được.)
 */
export const VAI_VAO_DUOC = Object.freeze([VAI.QUAN_TRI, VAI.QUAN_LY]);

/**
 * NĂM NHÃN của `khach.tang_hoan` — chép từ `src/orders/ti-le-hoan.js#TANG_HOAN`, cùng tập
 * với CHECK `khach_tang_hoan_hop_le` (migration 005). `chua_du_don` KHÔNG phải tầng thứ
 * năm: nó là nhãn VẮNG MẶT — chưa đủ đơn đã kết để xếp tầng.
 *
 * Chép tay, nên có bài test đọc thẳng file luật rồi so — cấm gõ lại (bài học ② của
 * `07-KE-HOACH-GD2.md` §0: chuỗi gõ tay hai chỗ là bẫy im lặng).
 */
export const TANG = Object.freeze([
  { ma: "chua_du_don", ten: "Chưa đủ đơn để xếp tầng", xepTang: false },
  { ma: "tot", ten: "Tốt — hoàn 0–15%", xepTang: true },
  { ma: "binh_thuong", ten: "Bình thường — hoàn 15–30%", xepTang: true },
  {
    ma: "canh_bao",
    ten: "Cảnh báo — hoàn 30–65% (vế 01 §11 gọi tên)",
    xepTang: true,
  },
  { ma: "rui_ro_cao", ten: "Rủi ro cao — hoàn ≥65%", xepTang: true },
]);

/** Ngưỡng của luật đã chốt — chép từ `CAU_HINH_TANG`, có test so thẳng file. */
export const NGUONG = Object.freeze({
  toi_thieu_don_ket: 2,
  nguong_tot: 15,
  nguong_binh_thuong: 30,
  nguong_canh_bao: 65,
});

/** Trần đọc mỗi lượt. Chạm trần thì màn phải NÓI, không im. */
export const TRAN_DOC = 40000;

export class LoiRuiRo extends Error {
  constructor(thongDiep, ma = "rui_ro_hoan", status = 400) {
    super(thongDiep);
    this.name = "LoiRuiRo";
    this.ma = ma;
    this.status = status;
  }
}

let _taoTruyVan = null;
export function datTaoTruyVan(fn) {
  if (fn != null && typeof fn !== "function")
    throw new LoiRuiRo("datTaoTruyVan cần một hàm");
  _taoTruyVan = fn || null;
  return _taoTruyVan;
}
export const daNoiRuiRo = () => typeof _taoTruyVan === "function";

function truyVan(bc) {
  if (!_taoTruyVan)
    throw new LoiRuiRo("chưa nối tầng truy vấn", "chua_noi", 500);
  return _taoTruyVan(bc);
}

const so = (v) => (v == null ? 0 : Number(v) || 0);

export async function manRuiRo(boiCanh) {
  const bc = batBuocBoiCanh(boiCanh);
  const db = truyVan(bc);

  const khach = await db.chon(BANG_KHACH, {}, { gioiHan: TRAN_DOC });
  const chamTran = khach.length >= TRAN_DOC;

  // Khách chưa được job chấm — đếm RIÊNG, không gộp vào tầng nào. `tang_hoan` NULL nghĩa là
  // «chưa ai chấm», khác hẳn `chua_du_don` nghĩa là «đã chấm, chưa đủ đơn».
  const chuaCham = khach.filter(
    (k) => k.tang_hoan == null || k.tang_hoan === "",
  );
  const daCham = khach.filter((k) => k.tang_hoan != null && k.tang_hoan !== "");

  const theoTang = TANG.map((t) => {
    const trong = daCham.filter((k) => String(k.tang_hoan) === t.ma);
    return {
      ma: t.ma,
      ten: t.ten,
      xepTang: t.xepTang,
      soKhach: trong.length,
      soDonKet: trong.reduce((s, k) => s + so(k.so_don_ket), 0),
      soDonHoan: trong.reduce((s, k) => s + so(k.so_don_hoan), 0),
    };
  });

  const tangLa = (ma) => theoTang.find((t) => t.ma === ma) || { soKhach: 0 };

  return {
    teamId: bc.teamId,
    dem: {
      soKhachDoc: khach.length,
      soDaCham: daCham.length,
      soChuaCham: chuaCham.length,
      chamTran,
    },
    chamTran: chamTran
      ? {
          co: true,
          tran: TRAN_DOC,
          noi: `Đã đọc tới trần ${TRAN_DOC} khách — bảng dưới đây là MỘT PHẦN, không phải toàn bộ.`,
        }
      : { co: false },
    theoTang,
    // Chiều thứ hai: cùng một tầng, khác hẳn nhau khi số đơn đã kết khác nhau.
    theoSoDon: matTran(daCham),
    canhBaoChuaDuDon: canhBaoChuaDuDon(daCham, chuaCham),
    nguon: {
      cot: "`khach.tang_hoan` · `ti_le_hoan` · `so_don_ket` · `so_don_hoan`",
      job: "src/orders/ti-le-hoan.js#chamTiLeHoan (job đêm)",
      noi: "Màn ĐỌC cột đã chấm, KHÔNG tự tính — hai màn tự tính là hai con số cho một khách.",
      luat: {
        maHoan: "{4,5,6,7} — KHÔNG có 8 (8 = packing, một bước TIẾN)",
        mauSo: "đơn ĐÃ KẾT ({4,5,6,7} ∪ {3,16}), không phải mọi đơn",
        san: `toi_thieu_don_ket = ${NGUONG.toi_thieu_don_ket} — dưới sàn mang nhãn riêng \`chua_du_don\``,
        nguong: `${NGUONG.nguong_tot} / ${NGUONG.nguong_binh_thuong} / ${NGUONG.nguong_canh_bao} (%)`,
      },
    },
    // Không tự chốt hộ: nói rõ chính sách chưa duyệt.
    chinhSach: {
      daChot: false,
      noi:
        "`01-QUYET-DINH.md` §11 xếp «chia bốn tầng» vào bảng CHỜ CHỐT. Màn này ĐỌC phân bố " +
        "đã chấm để chốt được bằng số, và KHÔNG áp chính sách nào lên khách nào.",
      chan: "Không dòng mã nào đọc `tang_hoan` để CHẶN — kể cả tầng `rui_ro_cao`.",
    },
    soLieu: {
      taiLieuNoi: 144,
      doDuoc: tangLa("canh_bao").soKhach,
      viSaoKhac:
        "`04-TIEN-DO.md`: mốc 23/08 đo trên **4,2% dân số**, nên mọi số dẫn xuất từ nó " +
        "— gồm phân bố bốn tầng — chỉ là ước. Con số bên phải đọc từ cột đã chấm trên toàn bộ.",
    },
    trong: daCham.length
      ? null
      : {
          rong: true,
          vi: "chua-nap",
          noi: khach.length
            ? `Đọc được ${khach.length} khách nhưng KHÔNG khách nào có \`tang_hoan\` — job đêm ` +
              "`chamTiLeHoan` chưa chạy trên team này."
            : "Team này chưa có khách nào.",
          diTiep: khach.length
            ? "Chạy job chấm tỉ lệ hoàn; màn cố ý KHÔNG tự tính thay, vì phép tính thứ hai sẽ trôi " +
              "khỏi luật đã chốt."
            : "Rủi ro hoàn tính theo KHÁCH, nên phải có khách trước.",
        },
  };
}

/** Ma trận tầng × số đơn ĐÃ KẾT — chiều mà một danh sách xếp theo tỉ lệ không cho thấy. */
function matTran(daCham) {
  const cot = [
    { ma: "d0", ten: "0–1 đơn kết", hop: (k) => so(k.so_don_ket) <= 1 },
    { ma: "d2", ten: "2 đơn kết", hop: (k) => so(k.so_don_ket) === 2 },
    {
      ma: "d35",
      ten: "3–5 đơn kết",
      hop: (k) => so(k.so_don_ket) >= 3 && so(k.so_don_ket) <= 5,
    },
    { ma: "d6", ten: "6+ đơn kết", hop: (k) => so(k.so_don_ket) >= 6 },
  ];
  return TANG.map((t) => ({
    ma: t.ma,
    ten: t.ten,
    o: cot.map((c) => ({
      ma: c.ma,
      ten: c.ten,
      so: daCham.filter((k) => String(k.tang_hoan) === t.ma && c.hop(k)).length,
    })),
  }));
}

/**
 * Cảnh báo trung tâm của màn: bao nhiêu người KHÔNG xếp tầng được, và vì sao.
 * Đo 28/08 trên toàn bộ: 72.777 khách (81%) ở `chua_du_don` — dưới sàn 2 đơn đã kết.
 * Đây chính là đám mà một ngưỡng cứng sẽ chặn oan.
 */
function canhBaoChuaDuDon(daCham, chuaCham) {
  const duoiSan = daCham.filter((k) => String(k.tang_hoan) === "chua_du_don");
  if (!daCham.length && !chuaCham.length) return null;
  return {
    soDuoiSan: duoiSan.length,
    soDaCham: daCham.length,
    soChuaCham: chuaCham.length,
    tiLeDuoiSan: daCham.length ? duoiSan.length / daCham.length : null,
    noi:
      `${duoiSan.length}/${daCham.length} khách đã chấm mang nhãn \`chua_du_don\` — chưa đủ ` +
      `${NGUONG.toi_thieu_don_ket} đơn ĐÃ KẾT để một tỉ lệ nói lên điều gì.`,
    viSao:
      "Xếp tầng bằng một điểm dữ liệu là biến nhiễu thành bản án: một đơn bị hủy thành " +
      "«hoàn 100%». Luật cho họ nhãn RIÊNG thay vì gộp vào `tot` (gộp là nói dối theo chiều " +
      "dễ chịu) hay để NULL (NULL là im lặng).",
    chuaChamNoi: chuaCham.length
      ? `${chuaCham.length} khách CHƯA được job chấm — không nằm trong bảng phân bố.`
      : null,
  };
}
