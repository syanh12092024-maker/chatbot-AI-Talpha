// CỬA PANCAKE WHATSAPP v3 (PHIẾU L1-M3) — KHUNG + mock, phép gửi THẬT dồn về §7b T1
// (chờ điểm kiểm H1). SAO CHÉP cơ chế đã duyệt 2 vòng ở cửa Messenger (L1-M2, xem
// docs/v3/ban-giao/cua-messenger-v1.md): guard fail-closed tại cửa, định tuyến team
// qua tầng truy vấn, `ctxHeThong()` gắn ĐÚNG team cho job nền — CỘNG nhật ký HAI PHA
// của cửa POS (L1-M1, src/pos/ghi-nguoc.js) cho chính hành động GỬI.
//
// ═══ VÌ SAO KHÁC MESSENGER (không tái dùng page/hoi_thoai) ═════════════════════
// `guiTinMau` không nhận `pageId`/`psid` — Cloud API WhatsApp không đi qua khái niệm
// Facebook Page. Thực thể "sở hữu team" duy nhất mà hàm này có trong tay là chính
// ĐƠN HÀNG (`donHangId`) đang cần xác nhận — nên định tuyến team ở đây tra `don_hang`
// thay vì `page` (cùng CƠ CHẾ với `trangPageTheoTeam` của Messenger, khác BẢNG). Đây
// cũng là hàng ĐỌC luôn tiện cho rào nguồn đơn (③ dưới) — một lượt tra, hai việc.
//
// ═══ BA CỬA, XẾP NỐI TIẾP (nhật ký #10/2 sổ điều hành: "sao chép, đổi tên biến") ═══
//  ① Định tuyến team qua don_hang — LoiDonKhongThuocTeam (+ nhat_ky khi ctx NGƯỜI).
//  ② Rào NGUỒN ĐƠN — chỉ 'trang_ban_hang' (01 §1); đơn 'messenger' đã được khách xác
//     nhận trong chat rồi, KHÔNG cần WhatsApp — LoiSaiNguonDon. Máy trạng thái L3-M1
//     dựa vào rào này để không hỏi lại khách luồng messenger.
//  ③ Luật MẪU TIN — chỉ mẫu đã duyệt (`da_duyet:true`, xem mau-tin.js) — LoiMauChuaDuyet.
//     Cloud API ngoài cửa sổ 24h BẮT BUỘC template Meta duyệt — không có hàm gửi text
//     tự do ở cửa này (khác Messenger, phiếu ② nói rõ).
//  ④ Guard tại cửa (N1) — LoiCuaGuiDong, giống hệt N1 của Messenger nhưng biến riêng
//     `V3_WA_GUI` (chung `PANCAKE_READONLY` — MỘT van an toàn cho mọi đường Pancake).
//
// Thứ tự CỐ Ý: ①→②→③→④ — guard đứng SAU CÙNG (sát lượt gọi adapter thật), đúng khuôn
// Messenger (kiemGuardGuiGhi luôn là bước cuối trước khi chạm mạng) để tách rời được
// "chặn vì nghiệp vụ sai" khỏi "chặn vì van đóng" trong bộ ca đối chứng ①/④.
//
// ═══ NHẬT KÝ HAI PHA (khuôn src/pos/ghi-nguoc.js, phiếu L1-M1 ②d) ═════════════
// INSERT `wa_gui_bat_dau` TRƯỚC khi gọi adapter, `wa_gui_ket_qua` SAU. `nhat_ky` là
// bảng CHỈ-INSERT nên hai dòng là hai SỰ KIỆN, không phải một dòng "sửa lại". Adapter
// ném lỗi có `coPhanHoi===true` (đã biết chắc kết cục — kể cả LoiChuaCoEndpoint, xem
// loi.js) → vẫn ghi pha 2 (biết CHẮC là không gửi). Lỗi KHÔNG có `coPhanHoi` (mất tín
// hiệu mạng thật, vd timeout) → CỐ Ý để dòng bắt-đầu MỒ CÔI, đó là tín hiệu duy nhất
// đọc ra được «lệnh đã bay đi mà không ai biết kết cục».
import { layMotTheoId, ctxHeThong, ghiNhatKy } from "../../db/index.js";
import { guiMauQuaPancake } from "./adapter.js";
import { mauDaDuyet, BANG_MAU_TIN } from "./mau-tin.js";
import {
  LoiDonKhongThuocTeam,
  LoiSaiNguonDon,
  LoiMauChuaDuyet,
  LoiCuaGuiDong,
  LoiChuaCoEndpoint,
} from "./loi.js";

export {
  LoiDonKhongThuocTeam,
  LoiSaiNguonDon,
  LoiMauChuaDuyet,
  LoiCuaGuiDong,
  LoiChuaCoEndpoint,
};

// ── N1: GUARD TẠI CỬA — FAIL-CLOSED ĐÚNG CHIỀU (khuôn N1 của Messenger) ────────────
// Đọc process.env TƯƠI mỗi lượt gọi (không cache module-scope) — cùng lý do L1-M2:
// test đổi biến giữa các ca trong CÙNG tiến trình phải thấy giá trị mới ngay.
function cuaDangMo() {
  return process.env.V3_WA_GUI === "1" && process.env.PANCAKE_READONLY !== "1";
}

function kiemGuardGuiGhi(tenThaoTac) {
  if (!cuaDangMo()) {
    throw new LoiCuaGuiDong(
      `Cửa GỬI WhatsApp đang ĐÓNG (${tenThaoTac}) — cần V3_WA_GUI==='1' VÀ ` +
        `PANCAKE_READONLY!=='1'. Đo lúc gọi: V3_WA_GUI=${JSON.stringify(
          process.env.V3_WA_GUI,
        )} · PANCAKE_READONLY=${JSON.stringify(
          process.env.PANCAKE_READONLY,
        )}. Vắng biến = ĐÓNG (fail-closed).`,
    );
  }
}

// ── Định tuyến team qua don_hang (① — khuôn trangPageTheoTeam của Messenger) ───────
// Trả về { teamId, don, ctxHieuLuc } đã xác nhận don_hang thuộc đúng team, hoặc ném
// LoiDonKhongThuocTeam. `don` mang nguyên dòng (dùng ngay cho rào nguồn đơn ở ②).
async function xacDinhTeamQuaDon(pool, ctx, donHangId) {
  if (ctx?.laHeThong) {
    // Đường job nền (cron gửi hàng loạt mỗi ngày, 90-phu-luc §"Luồng đề xuất" —
    // "không có NGƯỜI") KHÔNG có team cố định để tầng truy vấn tự chèn hộ — phải tự
    // tìm team CỦA CHÍNH đơn đang xử lý rồi mới có ctx hợp lệ để ghi nhat_ky tiếp. Tra
    // RAW ngoài tầng truy vấn (bỏ qua ctx-scope vì CHƯA CÓ team để mà scope) — CÙNG
    // TIỀN LỆ với N3 của Messenger (trangPageTheoTeam) và `thanh_vien_team`
    // (luoc-do-v1.md §6). Đọc đúng 1 dòng theo khoá tự nhiên (id), không liệt kê rộng.
    const r = await pool.query(
      "SELECT id, team_id, nguon FROM don_hang WHERE id = $1",
      [donHangId],
    );
    if (!r.rowCount) {
      throw new LoiDonKhongThuocTeam(
        `don_hang.id=${donHangId} không tồn tại (đường hệ-thống — chưa có team nào để ghi nhat_ky).`,
      );
    }
    return {
      teamId: r.rows[0].team_id,
      don: r.rows[0],
      ctxHieuLuc: ctxHeThong(), // vẫn "hệ-thống" — mọi lượt gọi kế tiếp qua tầng truy vấn
    }; //   dưới ctx này đều tự ghi nhat_ky (xem src/db/truy-van.js ghiNhatKyHeThong).
  }

  // ctx NGƯỜI — layMotTheoId đã tự chèn team_id (0 dòng = không tồn tại HOẶC của team
  // khác, tầng truy vấn không phân biệt được hai ca đó — cùng nói thật như Messenger).
  // layMotTheoId cũng tự ném LoiThieuBoiCanhTeam hộ nếu ctx rỗng/sai — không lặp kiểm
  // tra đó ở đây (tầng truy vấn là nguồn sự thật DUY NHẤT cho việc đó).
  const don = await layMotTheoId(pool, ctx, "don_hang", donHangId);
  if (!don) {
    await ghiNhatKy(pool, {
      teamId: ctx.teamId,
      tacNhan: `nguoi:${ctx.nguoiDungId ?? "?"}`,
      nguoiDungId: ctx.nguoiDungId ?? null,
      hanhDong: "chan_don_xuyen_team",
      doiTuong: "don_hang",
      doiTuongId: String(donHangId),
      ghiChu: `ctx.teamId=${ctx.teamId} không sở hữu don_hang.id=${donHangId} (không tồn tại hoặc thuộc team khác).`,
    });
    throw new LoiDonKhongThuocTeam(
      `don_hang.id=${donHangId} không thuộc team ${ctx.teamId} (không tồn tại hoặc của team khác).`,
    );
  }
  return { teamId: ctx.teamId, don, ctxHieuLuc: ctx };
}

/**
 * Gửi MỘT mẫu tin WhatsApp đã duyệt cho đơn nguồn `trang_ban_hang` (01 §1 — luồng
 * trang bán hàng cần bot xác nhận qua WhatsApp trước khi chuyển Chờ in). KHÔNG có hàm
 * gửi text tự do ở cửa này (Cloud API ngoài 24h bắt buộc template).
 *
 * @param pool
 * @param ctx        { teamId, nguoiDungId } (ctx người) hoặc `ctxHeThong()` (job nền —
 *                    PHẢI kèm resolve được team qua chính donHangId, xem xacDinhTeamQuaDon).
 * @param soNhan     số điện thoại nhận (định dạng E.164, cửa này KHÔNG kiểm khuôn số —
 *                    ngoài phạm vi phiếu, xem §9 nếu cần chặn thêm).
 * @param tenMau     tên mẫu — phải có `da_duyet:true` trong bảng mẫu (deps.bangMauTin).
 * @param thamSo     tham số điền vào mẫu (mã đơn, sản phẩm, số lượng, tổng tiền, COD…) —
 *                    cửa này truyền NGUYÊN VẸN xuống adapter, không diễn giải nội dung.
 * @param donHangId  `don_hang.id` (khoá nội bộ v3) — dùng để định tuyến team + rào nguồn.
 * @param deps       { guiMau = guiMauQuaPancake, bangMauTin = BANG_MAU_TIN } — tiêm
 *                    spy/mock khi test, cùng khuôn `deps.send` của cửa Messenger.
 */
export async function guiTinMau(
  pool,
  ctx,
  { soNhan, tenMau, thamSo, donHangId } = {},
  deps = {},
) {
  const { guiMau = guiMauQuaPancake, bangMauTin = BANG_MAU_TIN } = deps;

  if (!soNhan) throw new Error("guiTinMau: thiếu `soNhan`.");
  if (!tenMau) throw new Error("guiTinMau: thiếu `tenMau`.");
  if (donHangId == null || donHangId === "")
    throw new Error("guiTinMau: thiếu `donHangId`.");

  // ── ① định tuyến team qua don_hang ─────────────────────────────────────────
  const { teamId, don, ctxHieuLuc } = await xacDinhTeamQuaDon(
    pool,
    ctx,
    donHangId,
  );

  // ── ② rào NGUỒN ĐƠN — chỉ trang_ban_hang ───────────────────────────────────
  if (don.nguon !== "trang_ban_hang") {
    throw new LoiSaiNguonDon(
      `don_hang.id=${donHangId} có nguon="${don.nguon}" — cửa WhatsApp CHỈ nhận đơn ` +
        `nguồn "trang_ban_hang" (01 §1). Đơn nguồn "messenger" khách đã xác nhận trong ` +
        `chat rồi, không cần WhatsApp — gọi cửa này cho đơn đó là SAI LUỒNG.`,
    );
  }

  // ── ③ luật MẪU TIN — chỉ mẫu đã duyệt ───────────────────────────────────────
  if (!mauDaDuyet(tenMau, bangMauTin)) {
    throw new LoiMauChuaDuyet(
      `tenMau="${tenMau}" KHÔNG có trong bảng mẫu ĐÃ DUYỆT (da_duyet=true, xem ` +
        `src/channels/whatsapp/mau-tin.js) — cửa ĐÓNG. Cloud API bắt buộc mẫu được Meta ` +
        `duyệt trước khi gửi chủ động (01 §4/§5); "tạm cho qua" là gửi tin ngoài mẫu, ` +
        `rủi ro khoá số WhatsApp (90-phu-luc §"CẢNH BÁO").`,
    );
  }

  // ── ④ guard tại cửa (N1) ─────────────────────────────────────────────────────
  kiemGuardGuiGhi("guiTinMau");

  const tacNhan = ctxHieuLuc?.laHeThong
    ? "may:cua-whatsapp-gui"
    : `nguoi:${ctx?.nguoiDungId ?? "?"}`;
  const nguoiDungId = ctxHieuLuc?.laHeThong ? null : (ctx?.nguoiDungId ?? null);

  // ── nhật ký hai pha, pha 1 ────────────────────────────────────────────────
  const idBatDau = await ghiNhatKy(pool, {
    teamId,
    tacNhan,
    nguoiDungId,
    hanhDong: "wa_gui_bat_dau",
    doiTuong: "don_hang",
    doiTuongId: String(donHangId),
    sau: { tenMau, soNhan, thamSo: thamSo ?? {} },
    ghiChu: `sắp gửi mẫu "${tenMau}" tới ${soNhan}`,
  });

  let ket;
  try {
    ket = await guiMau({ soNhan, tenMau, thamSo, donHangId });
  } catch (e) {
    if (e.coPhanHoi) {
      // Kết cục ĐÃ BIẾT (Pancake từ chối, hoặc — hiện tại — LoiChuaCoEndpoint) → ghi
      // pha 2 để nói rõ "biết chắc là không gửi", không để mồ côi oan.
      await ghiNhatKy(pool, {
        teamId,
        tacNhan,
        nguoiDungId,
        hanhDong: "wa_gui_ket_qua",
        doiTuong: "don_hang",
        doiTuongId: String(donHangId),
        ghiChu: `KHÔNG gửi (${e.name}): ${e.message}`.slice(0, 500),
      });
    }
    // else: mất phản hồi thật (timeout/đứt mạng) ⇒ CỐ Ý để dòng bắt-đầu MỒ CÔI — tín
    // hiệu duy nhất đọc ra được «lệnh đã bay đi mà không ai biết kết cục».
    throw e;
  }

  // ── nhật ký hai pha, pha 2 (thành công) ──────────────────────────────────
  await ghiNhatKy(pool, {
    teamId,
    tacNhan,
    nguoiDungId,
    hanhDong: "wa_gui_ket_qua",
    doiTuong: "don_hang",
    doiTuongId: String(donHangId),
    ghiChu: `gửi thành công (bắt đầu #${idBatDau})`,
  });

  return { ok: true, idBatDau, ...ket };
}
