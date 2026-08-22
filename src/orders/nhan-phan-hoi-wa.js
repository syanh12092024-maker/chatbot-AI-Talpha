// CẦU NỐI phản hồi WhatsApp → bộ đọc ý → máy trạng thái (phiếu L3-M3, làn 🟥).
//
// Interface `{donId, text}` — nguồn TEXT THẬT (đọc tin WA về) CHƯA TỒN TẠI ở lượt này
// (cửa L1-M3 hiện chỉ GỬI; poll/webhook đọc tin = việc NGƯỜI H1/H2, sổ điều hành §7b/§8).
// Cutover chỉ cần đấu nguồn thật vào ĐÚNG interface `nhanPhanHoiWa(pool, ctx, {donId,
// text}, deps)` này — không đổi chữ ký (cùng tinh thần adapter của cua-whatsapp-v1.md §7).
import { nhanPhanHoi } from "./may-trang-thai.js";
import { docY } from "./doc-y.js";
import { taoHuyLichNhac } from "./lich-nhac.js";

/** `so_ai.ma_model` NOT NULL (luoc-do-v1.md §4 phán 4) — docY là luật từ khoá, KHÔNG gọi
 *  model nào, nên khai NHÃN VẮNG MẶT tường minh (cùng ý KHONG_GOI_MODEL của
 *  src/chat/so-ai.js, KHÔNG import trực tiếp module đó: nó là đất một thợ SONG SONG khác
 *  đang code — src/chat/* — và neo idempotent của nó (nguon_tep='tin_cho_xu_ly:<loại>',
 *  nguon_dong=tinId của hàng đợi CHAT) không khớp domain đơn hàng ở đây; xem
 *  `ghiSuKienPhanHoi` bên dưới cho anchor RIÊNG của luồng này). */
const KHONG_GOI_MODEL = "khong-goi-model";

/**
 * Nhận một tin WhatsApp của khách (đã map ra `donId`) → đọc ý → giao máy trạng thái xử
 * lý. Máy tự lo mọi side-effect qua `deps` (kể cả huỷ lịch nhắc).
 *
 * ⚠️ `nhanPhanHoi` (L3-M1, KHÔNG được sửa) CHỈ tự gọi `huyLichNhac` ở nhánh
 * `xac_nhan`/`tu_choi` — hành vi đã CHỐT + có gate riêng (`ops/bin/nghiem-thu/l3-m1.sh`
 * ④c in "huyGoi=2", án lệ #25 cấm lật). Nhưng 02 §L3 đòi HUỶ NGAY cho khách trả lời "giữa
 * chừng" nói chung, không chỉ hai nhánh dứt khoát — khách đã lên tiếng thì mọi lượt nhắc
 * còn hẹn đều là tin rác, kể cả khi câu trả lời là "đổi/sửa" hay "không rõ". Nên cầu nối
 * này BÙ THÊM một lượt gọi `huyLichNhac` cho hai nhánh còn thiếu (`doi_sua`/`khong_ro`)
 * — `huyLichNhac` đã IDEMPOTENT (④#4 phiếu này) nên không sợ việc hai nhánh kia bị gọi
 * "thừa" một lần bên trong `nhanPhanHoi`. Nói rõ theo luật 13 (tradeoff), không lặng lẽ
 * chọn một bên.
 *
 * @param deps.huyLichNhac  mặc định `taoHuyLichNhac(pool, {job})` — bản THẬT thay no-op
 *   của máy trạng thái (đúng chỗ bàn giao §5 chờ). Test tiêm spy để đếm lượt gọi.
 * @param deps.ngonNgu      truyền thẳng xuống `docY`.
 */
export async function nhanPhanHoiWa(
  pool,
  ctx,
  { donId, text } = {},
  deps = {},
) {
  const { ngonNgu, job = "nhan-phan-hoi-wa" } = deps;
  const huyLichNhac = deps.huyLichNhac ?? taoHuyLichNhac(pool, { job });
  const { ket_qua, do_tin } = docY(text, { ngonNgu });

  const kq = await nhanPhanHoi(
    pool,
    ctx,
    { donId, ket_qua },
    { ...deps, huyLichNhac },
  );

  let huyLichNhacThem = null;
  if (ket_qua === "doi_sua" || ket_qua === "khong_ro") {
    huyLichNhacThem = await huyLichNhac(donId);
  }

  // `kq.teamId` luôn có mặt: mọi nhánh của nhanPhanHoi() trả về spread của một apDung()
  // (xem may-trang-thai.js), và apDung() luôn kèm teamId — khỏi phải taiDon() lần hai.
  const soAi = await ghiSuKienPhanHoi(pool, {
    teamId: kq.teamId,
    donId,
    ket_qua,
    do_tin,
    text,
  });

  return {
    ...kq,
    ket_qua,
    do_tin,
    huyLichNhacThem,
    soAiGhi: soAi.ghi,
    soAiId: soAi.id,
  };
}

/**
 * Ghi MỘT dòng `so_ai` cho sự kiện "đã đọc ý một phản hồi WA" — KHÔNG gọi `ghiSoAi` của
 * `src/chat/so-ai.js` (xem ghi chú KHONG_GOI_MODEL đầu file: domain + neo idempotent
 * khác nhau). Neo riêng của luồng đơn: `nguon_tep='lich_nhac:phan_hoi'` +
 * `nguon_dong=donId`. Đúng nghĩa "mỗi tin, mỗi loại, nhiều nhất một dòng" của
 * `src/chat/so-ai.js` — ở ĐÂY hợp lệ vì `nhanPhanHoi` chỉ nhận phản hồi CÓ Ý NGHĨA đúng
 * một lần cho một đơn: mọi nhánh đều đưa đơn RỜI `da_gui_wa` (xac_nhan/tu_choi/doi_sua/
 * khong_ro đều chuyển sang trạng thái khác), nên đơn đó không còn quay lại luồng WA để
 * sinh một sự kiện `phan_hoi` thứ hai — donId là khoá tự nhiên, không phải một cái tên
 * gọi cho có.
 */
async function ghiSuKienPhanHoi(
  pool,
  { teamId, donId, ket_qua, do_tin, text },
) {
  const r = await pool.query(
    `INSERT INTO so_ai
       (team_id, xay_ra_luc, loai, ma_model, lane, trang_thai, du_lieu, nguon_tep, nguon_dong)
     VALUES ($1, now(), $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (nguon_tep, nguon_dong) DO NOTHING
     RETURNING id`,
    [
      teamId,
      "other_bot",
      KHONG_GOI_MODEL,
      "doc_y_wa",
      ket_qua,
      JSON.stringify({
        donId: String(donId),
        do_tin,
        do_dai_text: String(text ?? "").length,
      }),
      "lich_nhac:phan_hoi",
      Number(donId),
    ],
  );
  return { ghi: r.rowCount > 0, id: r.rowCount ? r.rows[0].id : null };
}
