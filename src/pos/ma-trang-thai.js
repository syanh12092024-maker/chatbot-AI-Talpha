// BẢNG MÃ TRẠNG THÁI ĐƠN POS — ĐO ĐƯỢC, KHÔNG ĐOÁN (phiếu L1-M1 ②.3, finding N1).
//
// Vì sao file này tồn tại: chữ «Chờ in» xuất hiện 8 lần trong docs mà KHÔNG chỗ nào
// khai mã số của nó. Đoán 3="Chờ in" là hỏng đơn khách thật — đo ra thì 3 = delivered
// (Đã giao). Một bảng mã đoán bừa làm cửa (b) của `ghiNguocTrangThai` mở nhầm.
//
// ═══ CÁCH XÁC MINH (tái chạy được) ═══════════════════════════════════════════
// API POS TỰ KHAI NHÃN: mỗi đơn trả về CẶP `status` (số) + `status_name` (nhãn máy).
// Không cần suy diễn — chỉ cần đọc đủ nhiều đơn thật và kiểm mỗi mã ra ĐÚNG MỘT nhãn.
//   $ node ops/bin/nghiem-thu/l1-m1.sh   (phép ③b tự quét lại và diff với bảng này)
// Lượt đo gốc 22/08/2026, máy dev, 7/7 shop thật của `pancake-shops.json`:
//   · 1.379 đơn (quét theo bộ lọc status 0..20) + 767 đơn (quét lại 0..25) + 1.400 đơn
//     không lọc → 15 mã, KHÔNG mã nào ra hai nhãn khác nhau.
// ⛔ Nhãn ở cột «nghĩa» là dịch từ nhãn MÁY + đối chiếu chuỗi `status_history` thật,
//    KHÔNG phải chép từ màn dashboard POS. Xem §"chưa làm" cuối file.
//
// ═══ BẢNG (mã → nhãn máy) ════════════════════════════════════════════════════
//    0  new             Mới / Chờ xác nhận   ← 01 §1 «Trạng thái ban đầu» luồng trang bán hàng
//    1  submitted       Đã gửi/đã duyệt
//    2  shipped         Đang giao
//    3  delivered       Đã giao
//    4  returning       Đang hoàn        ┐
//    5  returned        Đã hoàn          │ nhóm HỦY/HOÀN đo được = {4,5,6,7}
//    6  canceled        Đã hủy           │
//    7  removed         Đã xoá           ┘
//    8  packing         ĐANG ĐÓNG GÓI    ← ⚠️ KHÔNG phải hủy/hoàn, xem cảnh báo dưới
//    9  pending         Chờ xử lý
//   11  waitting        Chờ hàng
//   12  wait_print      CHỜ IN           ← đích của luồng xác nhận (01 §1)
//   16  received_money  Đã thu tiền
//   19  (API trả nhãn null — 1 đơn duy nhất, shop Bahrain đơn 378)
//   20  ordered         Đã đặt hàng
//
// ⚠️ LỆCH SO VỚI TÀI LIỆU — `docs/TONG-QUAN-HE-THONG.md` §7.5 và `src/pancake-orders.js`
//    dòng 13 đều khai «hủy/hoàn = {4,5,6,7,8}». ĐO RA THÌ 8 = `packing`, và
//    `status_history` của đơn thật chứng minh nó là bước TIẾN, không phải bước hủy:
//       đơn 47397 (UAE): 0@05:41 → 1@05:45 → 12@05:45 → 8@06:04
//    Đồ thị chuyển đo trên 1.400 đơn: 12→8 = 986 lượt · 8→9 = 537 · 8→2 = 394.
//    Đơn đang đóng gói bị đếm là «đã hủy» ⇒ bản đang chạy ĐẾM THIẾU đơn thành công.
//    ⛔ Bảng dưới KHÔNG chép lại con số sai đó. Sổ nợ §9 giữ việc vá bản đang chạy.
//
// ⛔ DENY-BY-DEFAULT: mã nào KHÔNG có trong bảng này là mã CHƯA XÁC MINH, mọi lượt
//    ghi ngược chạm nó bị TỪ CHỐI. Mã 13 có thật trong `status_history` (1→13, 13→12…)
//    nhưng ở lượt đo không shop nào còn đơn đang đứng ở 13 ⇒ không đọc được nhãn ⇒
//    KHÔNG đưa vào bảng. Đây là lựa chọn cố ý: thiếu một mã thì cửa đóng (an toàn),
//    thêm một mã đoán thì cửa mở nhầm (hỏng đơn khách).

/** Bảng mã ĐÃ XÁC MINH: mã số → nhãn máy do chính API POS trả về (`status_name`). */
export const BANG_MA = Object.freeze({
  0: "new",
  1: "submitted",
  2: "shipped",
  3: "delivered",
  4: "returning",
  5: "returned",
  6: "canceled",
  7: "removed",
  8: "packing",
  9: "pending",
  11: "waitting",
  12: "wait_print",
  16: "received_money",
  20: "ordered",
});

/** Lời khai về CHÍNH lượt đo đã sinh ra `BANG_MA` — cổng ③b so lại với số này. */
export const XAC_MINH = Object.freeze({
  nguon: "API POS trường status_name (pos.pages.fm/api/v1)",
  ngay: "2026-08-22",
  soShop: 7,
  soDonDoi: 3546,
  maTraNhanNull: [19],
  maThayTrongLichSuMaChuaDocDuocNhan: [13],
});

/**
 * Nhóm HỦY/HOÀN đo được = {4,5,6,7}.
 * ⛔ KHÔNG có 8 — xem cảnh báo đầu file. Ai sửa hằng này thành {4,5,6,7,8} «cho khớp
 * tài liệu» sẽ làm cổng ③b của `ops/bin/nghiem-thu/l1-m1.sh` ĐỎ, kèm lý do.
 * L1-M1 KHÔNG dùng nhóm này để quyết định gì — nó là NEO KIỂM để bắt bảng mã sai.
 */
export const NHOM_HUY_HOAN = Object.freeze([4, 5, 6, 7]);

/**
 * BẢNG CHUYỂN TRẠNG THÁI CHO PHÉP — khai cứng, ngắn nhất có thể (phiếu ②.2b).
 * Chỉ đúng hai chiều của MỘT nghiệp vụ: bot xác nhận đơn trang bán hàng qua WhatsApp
 * rồi đẩy sang Chờ in (01 §1), và trả về khi xác nhận hỏng (nghiệm thu 02 §L1:
 * «Đổi thử một đơn nháp sang Chờ in RỒI TRẢ VỀ, POS ghi nhận đúng cả hai lần»).
 *
 * ⛔ KHÔNG BAO GIỜ có nhánh xoá đơn (7 = removed) — luật 2 của §0a sổ điều hành.
 * ⛔ Mọi cặp ngoài bảng này bị từ chối, kể cả cặp «trông có vẻ vô hại».
 *
 * 🔎 CHIỀU VỀ CHƯA CÓ BẰNG CHỨNG NGOÀI ĐỜI: trong 1.400 đơn đo 22/08, chiều 0→12 xuất
 *    hiện 3 lượt (có thật), còn 12→0 xuất hiện **0 lượt** — chiều lùi mà POS thực sự
 *    dùng là 12→1 (47 lượt). Nghĩa là POS có thể TỪ CHỐI 12→0. Diễn tập trên VPS
 *    (phép ⑤c) phải trả lời đúng câu đó trước khi ai tin chiều về chạy được.
 */
export const CHUYEN_CHO_PHEP = Object.freeze([
  Object.freeze({ tu: 0, sang: 12, y: "xác nhận xong → Chờ in (01 §1)" }),
  Object.freeze({
    tu: 12,
    sang: 0,
    y: "trả về Chờ xác nhận (nghiệm thu 02 §L1)",
  }),
]);

/** Lỗi CÓ TÊN — cửa (b) từ chối vì cặp chuyển không nằm trong bảng cho phép. */
export class LoiChuyenNgoaiBang extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiChuyenNgoaiBang";
  }
}

/** Lỗi CÓ TÊN — mã trạng thái chưa được xác minh (không có trong BANG_MA). */
export class LoiMaChuaXacMinh extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiMaChuaXacMinh";
  }
}

/** Nhãn máy của một mã, hoặc null nếu mã chưa xác minh. */
export function nhanCuaMa(ma) {
  return Object.prototype.hasOwnProperty.call(BANG_MA, Number(ma))
    ? BANG_MA[Number(ma)]
    : null;
}

export function daXacMinh(ma) {
  return nhanCuaMa(ma) !== null;
}

/**
 * CỬA (b) — kiểm cặp chuyển. Ném lỗi CÓ TÊN, không trả false im lặng.
 * Thứ tự kiểm CỐ Ý: mã chưa xác minh bị chặn TRƯỚC khi tra bảng chuyển, để thông điệp
 * nói đúng bệnh («mã 13 chưa xác minh») thay vì nói sai bệnh («cặp không cho phép»).
 */
export function kiemChuyen(tu, sang) {
  const t = Number(tu);
  const s = Number(sang);
  if (!Number.isInteger(t) || !Number.isInteger(s)) {
    throw new LoiChuyenNgoaiBang(
      `cặp chuyển phải là hai số nguyên, đang là tu=${JSON.stringify(tu)} sang=${JSON.stringify(sang)}.`,
    );
  }
  for (const ma of [t, s]) {
    if (!daXacMinh(ma)) {
      throw new LoiMaChuaXacMinh(
        `mã trạng thái ${ma} CHƯA XÁC MINH (không có trong BANG_MA của ` +
          `src/pos/ma-trang-thai.js) — cửa (b) ĐÓNG. Xác minh bằng lượt đo API rồi ` +
          `mới thêm vào bảng; cấm "tạm cho qua".`,
      );
    }
  }
  const khop = CHUYEN_CHO_PHEP.some((c) => c.tu === t && c.sang === s);
  if (!khop) {
    throw new LoiChuyenNgoaiBang(
      `cặp chuyển ${t}(${BANG_MA[t]}) → ${s}(${BANG_MA[s]}) KHÔNG nằm trong bảng cho ` +
        `phép [${CHUYEN_CHO_PHEP.map((c) => `${c.tu}→${c.sang}`).join(", ")}] — từ chối.`,
    );
  }
  return { tu: t, sang: s, nhanTu: BANG_MA[t], nhanSang: BANG_MA[s] };
}

// ═══ CHƯA LÀM — nói thẳng, đừng để người sau tưởng đã đủ ══════════════════════
// Phiếu ②.3 đòi «đối chiếu nhãn dashboard POS BẰNG MẮT». Lượt này KHÔNG làm được:
// máy dev chỉ có khoá API, không có phiên đăng nhập dashboard. Thứ đã làm là đối chiếu
// với nhãn MÁY do chính POS trả (`status_name`, 3.546 đơn, 7 shop, 0 mã ra hai nhãn)
// + chuỗi `status_history` của đơn thật. Việc soi mắt là việc NGƯỜI — ghi §9 sổ.
