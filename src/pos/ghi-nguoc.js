// ⚠️ GHI NGƯỢC TRẠNG THÁI ĐƠN LÊN POS — lệnh GHI RA NGOÀI đầu tiên của v3 (làn 🟥).
// Sai ở đây là hỏng ĐƠN CỦA KHÁCH THẬT, không phải hỏng một con số trên màn.
//
// ═══ BỐN CỬA AN TOÀN, XẾP NỐI TIẾP, MỖI CỬA MỘT LÝ DO KHÁC NHAU ═════════════
//
//  (a) VAN MÔI TRƯỜNG `V3_POS_GHI` — mặc định VẮNG/"0" = ĐÓNG, hàm ném lỗi và
//      KHÔNG chạm mạng POS. Cùng khuôn `PANCAKE_READONLY` của bản đang chạy: một
//      biến, một chỗ, người vận hành gạt. Máy dev không có biến này ⇒ mọi lượt gọi
//      nhầm trên máy thợ đều chết ở cửa đầu tiên. (Việc NGƯỜI H9 §8 sổ đặt trên VPS.)
//
//  (b) BẢNG CHUYỂN CHO PHÉP — deny-by-default, nạp từ bảng mã ĐÃ XÁC MINH
//      (`src/pos/ma-trang-thai.js`). Mã chưa xác minh ⇒ cửa ĐÓNG, không "tạm cho qua".
//      ⛔ KHÔNG BAO GIỜ có nhánh xoá đơn.
//
//  (c) COMPARE-AND-SET — vế `tu` bắt buộc, và phải so với trạng thái LIVE đọc từ POS
//      ngay trước khi ghi. Vì sao không tra `don_hang` trong CSDL của mình: sale vẫn
//      đổi trạng thái bằng tay song song (§7.4 «Sale vẫn phải gọi xác nhận trước khi
//      chuyển trạng thái đơn»), nên ảnh chụp trong CSDL luôn có thể cũ hơn sự thật.
//      Kiểm trên ảnh cũ = cho phép ghi đè việc người vừa làm.
//
//  (d) NHẬT KÝ HAI PHA — INSERT `pos_ghi_bat_dau` TRƯỚC khi gửi PUT, INSERT
//      `pos_ghi_ket_qua` SAU. `nhat_ky` là bảng CHỈ-INSERT (trigger tầng CSDL) nên
//      không có cách nào "sửa dòng cũ thành xong"; hai dòng là hai sự kiện. Mất phản
//      hồi giữa chừng ⇒ dòng bắt-đầu MỒ CÔI ⇒ đọc ra được «có lệnh đã bay đi mà không
//      biết kết cục». Lượt bị chặn ở (a)(b)(c) cũng ghi một dòng — im lặng thì không
//      ai biết đã có người thử.
import { ghiNhatKy, layNhieu } from "../db/index.js";
import { xacDinhTeam, suaTheoIdPos } from "./kho.js";
import { layKetNoi } from "./ket-noi.js";
import { guiDocMotDon, guiDatTrangThai } from "./api.js";
import { kiemChuyen, BANG_MA } from "./ma-trang-thai.js";

/** Lỗi CÓ TÊN — cửa (a): van `V3_POS_GHI` đang đóng. */
export class LoiVanGhiDong extends Error {
  constructor(thongDiep) {
    super(thongDiep);
    this.name = "LoiVanGhiDong";
  }
}

/** Lỗi CÓ TÊN — cửa (c): trạng thái live trên POS đã khác vế `tu`. */
export class LoiTrangThaiDaDoi extends Error {
  constructor(thongDiep, { live = null, tu = null } = {}) {
    super(thongDiep);
    this.name = "LoiTrangThaiDaDoi";
    this.live = live;
    this.tu = tu;
  }
}

/** Cửa (a) đọc đúng MỘT biến. Chỉ "1"/"true" mới mở — mọi giá trị khác là ĐÓNG. */
export function vanGhiMo(env = process.env) {
  const v = String(env.V3_POS_GHI ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true";
}

async function ghiChan(pool, { teamId, cua, maPos, chiTiet }) {
  await ghiNhatKy(pool, {
    teamId,
    tacNhan: "may:cua-pos-ghi-nguoc",
    hanhDong: "pos_ghi_bi_chan",
    doiTuong: "don_hang",
    doiTuongId: String(maPos ?? ""),
    ghiChu: `cửa (${cua}) chặn: ${chiTiet}`,
  });
}

/**
 * Đổi trạng thái MỘT đơn trên POS, qua đủ bốn cửa.
 *
 * @param ctx    bối cảnh team (job nền ⇒ `ctxHeThong()` + `teamId` tường minh)
 * @param market TÊN THỊ TRƯỜNG — bắt buộc. `don_hang` không có cột shop, và id đơn của
 *               POS là dãy RIÊNG TỪNG SHOP (đo 22/08: 4 shop cùng đếm từ 1, chồng nhau
 *               hoàn toàn) ⇒ thiếu thị trường là không xác định nổi đơn nào. Fail-CLOSED
 *               thay vì đoán shop từ page_id (17,4% đơn thật không có page_id).
 * @param donId  id đơn TRÊN POS (số), không phải `don_hang.id` của v3.
 * @param tu     mã trạng thái ĐANG CÓ (bắt buộc — vế compare của cửa c)
 * @param sang   mã trạng thái muốn đổi sang
 */
export async function ghiNguocTrangThai(
  pool,
  ctx,
  { market, donId, tu, sang, teamId = null } = {},
  { nap = fetch, env = process.env } = {},
) {
  if (!market)
    throw new Error("ghiNguocTrangThai: thiếu `market` (tên thị trường).");
  if (donId == null || donId === "")
    throw new Error("ghiNguocTrangThai: thiếu `donId`.");
  if (tu == null) {
    throw new Error(
      "ghiNguocTrangThai: thiếu vế `tu` — cửa (c) compare-and-set không có gì để so, " +
        "ghi mù là ghi đè việc sale vừa làm bằng tay.",
    );
  }
  const team = await xacDinhTeam(pool, ctx, { teamId, doiTuong: "don_hang" });

  // ── CỬA (a) ────────────────────────────────────────────────────────────────
  if (!vanGhiMo(env)) {
    await ghiChan(pool, {
      teamId: team.teamId,
      cua: "a",
      maPos: donId,
      chiTiet: `V3_POS_GHI=${JSON.stringify(env.V3_POS_GHI ?? null)} — van ĐÓNG, không gọi API`,
    });
    throw new LoiVanGhiDong(
      "V3_POS_GHI vắng hoặc ≠1 — cửa ghi POS ĐÓNG (fail-CLOSED). Không lượt gọi API " +
        "nào được phát. Đặt biến là việc NGƯỜI vận hành (H9 §8 sổ điều hành).",
    );
  }

  // ── CỬA (b) ────────────────────────────────────────────────────────────────
  let cap;
  try {
    cap = kiemChuyen(tu, sang);
  } catch (e) {
    await ghiChan(pool, {
      teamId: team.teamId,
      cua: "b",
      maPos: donId,
      chiTiet: `${e.name}: ${e.message}`,
    });
    throw e;
  }

  // Khoá POS chỉ được giải mã SAU khi hai cửa rẻ tiền đã cho qua.
  const ketNoi = await layKetNoi(pool, ctx, market, { teamId, env });
  const maPos = `${ketNoi.shopId}:${donId}`;

  // ── CỬA (c) — đọc LIVE rồi mới so ─────────────────────────────────────────
  const live = await guiDocMotDon(ketNoi, donId, { nap });
  const maLive = Number(live.status);
  if (maLive !== cap.tu) {
    await ghiChan(pool, {
      teamId: team.teamId,
      cua: "c",
      maPos,
      chiTiet:
        `live=${maLive}(${BANG_MA[maLive] ?? "?"}) ≠ tu=${cap.tu}(${cap.nhanTu}) ` +
        `— đơn đã đổi trạng thái ngoài hệ, TỪ CHỐI ghi đè`,
    });
    throw new LoiTrangThaiDaDoi(
      `Đơn ${maPos} đang ở ${maLive}(${BANG_MA[maLive] ?? "mã lạ"}) chứ không phải ` +
        `${cap.tu}(${cap.nhanTu}) — từ chối ghi (compare-and-set).`,
      { live: maLive, tu: cap.tu },
    );
  }

  // ── CỬA (d) pha 1 ─────────────────────────────────────────────────────────
  const idBatDau = await ghiNhatKy(pool, {
    teamId: team.teamId,
    tacNhan: "may:cua-pos-ghi-nguoc",
    hanhDong: "pos_ghi_bat_dau",
    doiTuong: "don_hang",
    doiTuongId: maPos,
    truoc: { trang_thai_pos: cap.tu, nhan: cap.nhanTu },
    sau: { trang_thai_pos: cap.sang, nhan: cap.nhanSang },
    ghiChu: `market=${market} · sắp gửi PUT`,
  });

  let dap;
  try {
    dap = await guiDatTrangThai(ketNoi, donId, cap.sang, { nap });
  } catch (e) {
    if (e.coPhanHoi) {
      // POS ĐÃ trả lời và trả lời là "không" ⇒ kết cục BIẾT RÕ, ghi pha 2.
      await ghiNhatKy(pool, {
        teamId: team.teamId,
        tacNhan: "may:cua-pos-ghi-nguoc",
        hanhDong: "pos_ghi_ket_qua",
        doiTuong: "don_hang",
        doiTuongId: maPos,
        ghiChu: `POS TỪ CHỐI (http=${e.http}): ${e.message}`.slice(0, 500),
      });
    }
    // else: mất phản hồi ⇒ CỐ Ý để dòng bắt-đầu MỒ CÔI, đó là tín hiệu duy nhất
    // đọc ra được «lệnh đã bay đi mà không ai biết kết cục».
    throw e;
  }

  // ── CỬA (d) pha 2 ─────────────────────────────────────────────────────────
  await ghiNhatKy(pool, {
    teamId: team.teamId,
    tacNhan: "may:cua-pos-ghi-nguoc",
    hanhDong: "pos_ghi_ket_qua",
    doiTuong: "don_hang",
    doiTuongId: maPos,
    truoc: { trang_thai_pos: cap.tu },
    sau: { trang_thai_pos: cap.sang },
    ghiChu: `POS nhận (bắt đầu #${idBatDau})`,
  });

  // Gương trong CSDL phải theo POS ngay trong lượt — không thì chính hệ này là nơi
  // đầu tiên nói sai về đơn mình vừa đổi. Chỉ chạm `trang_thai_pos`, KHÔNG chạm
  // `trang_thai_he` (cột của L3-M1).
  const cu = await layNhieu(pool, ctx, "don_hang", {
    dieuKien: { team_id: team.teamId, ma_pos: maPos },
  });
  if (cu.length) {
    await suaTheoIdPos(pool, ctx, {
      teamId,
      bang: "don_hang",
      id: cu[0].id,
      duLieu: { trang_thai_pos: String(cap.sang), sua_luc: new Date() },
      hanhDong: "pos_ghi_nguoc_dong_bo",
    });
  }

  return {
    maPos,
    tu: cap.tu,
    sang: cap.sang,
    nhanTu: cap.nhanTu,
    nhanSang: cap.nhanSang,
    idBatDau,
    dap: dap?.success ?? null,
  };
}
