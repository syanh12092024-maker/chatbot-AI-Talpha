// HÀNG ĐỢI NHẮC — 2 giờ × tối đa 5 lần, huỷ khi khách trả lời (phiếu L3-M3, làn 🟥,
// 02 §L3 gạch 1). Bảng `lich_nhac` là đất của phiếu này (may-trang-thai-don-v1.md §5).
//
// ═══ VÌ SAO KHÔNG SỬA quet-don-moi.js ĐỂ "GỌI HOOK KHI VÀO da_gui_wa" ═════════════
// Pathspec phiếu cấm đụng may-trang-thai.js/quet-don-moi.js (✅, chỉ import + deps). Nên
// "đặt lịch khi đơn vào da_gui_wa" KHÔNG phải một hook gắn vào lượt chuyển trạng thái —
// job quét CỦA CHÍNH FILE NÀY (quetLichNhac) tự tìm đơn `da_gui_wa` CHƯA có dòng
// `lich_nhac` nào rồi tự đặt lịch (bước ① dưới), độc lập hoàn toàn với quet-don-moi.js.
// Cùng tinh thần "job nền tự quét, không chờ ai gọi" như chính quet-don-moi.js.
//
// ═══ ĐỒNG HỒ — TIÊM QUA deps.now, CẤM NEO ĐỒNG HỒ TƯỜNG ══════════════════════════
// skill tho-thi-cong án lệ #1: test tự neo `new Date()`/đồng hồ hệ điều hành là một thước
// tự dựng — bộ ca chỉ đỏ đúng lúc chạy thật gần biên. Mọi hàm ở đây nhận `deps.now`
// (mặc định `() => new Date()`), test tiêm đồng hồ giả tua được.
//
// ═══ CỬA GHI HẸP THỨ NĂM — cùng họ với suaTheoIdPos/ghiDon/CAU_GHI_CHAM ═══════════
// `suaTheoId` (L0-M2, src/db/truy-van.js) KHÔNG hỗ trợ `ctxHeThong()` (tự ném ngay ở đầu
// hàm) — mà job quét lịch BẮT BUỘC chạy dưới ctxHeThong (không có người đăng nhập nào
// đứng sau một tin nhắc tự động hoặc một tin WhatsApp khách vừa gửi tới). `themMoi` THÌ
// hỗ trợ ctxHeThong (dùng được cho hai lượt INSERT bên dưới), nhưng UPDATE hàng loạt
// (huỷ mọi lịch treo của một đơn) không có đường nào qua tầng truy vấn chung ⇒ file này
// tự có `ghiLich`, cùng khuôn hẹp `ghiDon` của may-trang-thai.js. Đã ghi §9 sổ điều hành:
// đây là cửa hẹp THỨ NĂM (sau suaTheoId gốc, suaTheoIdPos của L1-M1, ghiDon của L3-M1,
// CAU_GHI_CHAM của L3-M2/ti-le-hoan.js) — bản vá đúng vẫn là "suaTheoId hỗ trợ
// ctxHeThong() rồi gộp cả năm về một".
import { ctxHeThong, themMoi, ghiNhatKy } from "../db/index.js";
import { taiDon, baoHetLuot } from "./may-trang-thai.js";

/** `lich_nhac.loai` — hiện chỉ MỘT loại (nhắc xác nhận đơn qua WA); bảng còn chỗ cho
 *  loại khác sau này (cột `hoi_thoai_id` sẵn đó, ngoài phạm vi phiếu này). */
export const LOAI_NHAC = "don_wa_xac_nhan";

/** 02 §L3: "nhắc mỗi 2 tiếng, tối đa 5 lần". */
export const CACH_NHAC_MS = 2 * 60 * 60_000;
export const TRAN_NHAC = 5;

/** Mẫu tin NHẮC — KHÁC mẫu xác nhận lần đầu (quet-don-moi.js#MAU_XAC_NHAN). Cùng nợ
 *  BANG_MAU_TIN rỗng của cua-whatsapp-v1.md §3: chưa mẫu nào được Meta duyệt, guiTinMau
 *  sẽ ném LoiMauChuaDuyet cho tới khi có mẫu thật — không phải bug của file này. */
export const MAU_NHAC = "nhac_xac_nhan_don_v1";

/** Nhịp quét job — đủ mịn so với khoảng cách 2 giờ giữa hai lần nhắc. */
export const NHIP_QUET_LICH_MS = 5 * 60_000;

const COT_DUOC_GHI = Object.freeze(["trang_thai", "huy_ly_do"]);

/** UPDATE hẹp MỘT dòng `lich_nhac` theo id, luôn kẹp team_id (xem ghi chú đầu file). */
async function ghiLich(pool, { teamId, id, duLieu }) {
  const gan = [];
  const tham = [];
  for (const [k, v] of Object.entries(duLieu)) {
    if (!COT_DUOC_GHI.includes(k)) {
      throw new Error(
        `lich_nhac: không được ghi cột "${k}" — chỉ ${COT_DUOC_GHI.join("/")} ` +
          `(deny-by-default, cùng khuôn ghiDon của may-trang-thai.js).`,
      );
    }
    tham.push(v);
    gan.push(`${k} = $${tham.length}`);
  }
  tham.push(teamId);
  tham.push(id);
  const r = await pool.query(
    `UPDATE lich_nhac SET ${gan.join(",")} WHERE team_id = $${tham.length - 1} AND id = $${tham.length} RETURNING *`,
    tham,
  );
  return r.rows[0] ?? null;
}

/** UPDATE + ghi đúng một dòng `nhat_ky` trong CÙNG lượt — mọi lượt ghi dưới ctxHeThong
 *  đều phải ghi nhật ký (01-QUYET-DINH.md §9, cùng luật `apDung` của may-trang-thai.js). */
async function danhDauLich(
  pool,
  { teamId, id, job, hanhDong, duLieu, ghiChu },
) {
  const sau = await ghiLich(pool, { teamId, id, duLieu });
  await ghiNhatKy(pool, {
    teamId,
    tacNhan: `may:${job}`,
    hanhDong,
    doiTuong: "lich_nhac",
    doiTuongId: String(id),
    sau: duLieu,
    ghiChu,
  });
  return sau;
}

/**
 * Đặt lịch nhắc ĐẦU TIÊN cho một đơn đang ở `da_gui_wa`. IDEMPOTENT (④#4): đơn đã có một
 * dòng `cho` thì không tạo thêm — trả `{tao:false}`.
 *
 * @param deps.now  đồng hồ tiêm — mặc định `() => new Date()` (CẤM neo tường trong test)
 */
export async function datLichNhac(pool, ctx, { donId } = {}, deps = {}) {
  const { now = () => new Date() } = deps;
  const { don, teamId } = await taiDon(pool, ctx, donId);
  if (don.trang_thai_he !== "da_gui_wa") {
    throw new Error(
      `datLichNhac: đơn ${donId} đang ở "${don.trang_thai_he}", không phải "da_gui_wa" ` +
        `— chỉ đặt lịch SAU khi cửa WA đã gửi mẫu xác nhận (02 §L3).`,
    );
  }

  const dang = await pool.query(
    `SELECT id FROM lich_nhac WHERE don_hang_id = $1 AND trang_thai = 'cho' LIMIT 1`,
    [donId],
  );
  if (dang.rowCount) return { tao: false, lichId: dang.rows[0].id };

  const henLuc = new Date(now().getTime() + CACH_NHAC_MS);
  const row = await themMoi(pool, ctxHeThong(), "lich_nhac", {
    team_id: teamId,
    don_hang_id: donId,
    loai: LOAI_NHAC,
    hen_luc: henLuc,
    lan_thu: 1,
    trang_thai: "cho",
  });
  return { tao: true, lichId: row.id, henLuc };
}

/**
 * Huỷ MỌI lịch còn TREO (`cho`) của một đơn — dùng làm `deps.huyLichNhac` tiêm vào
 * `nhanPhanHoi` (may-trang-thai-don-v1.md §5, thay bản no-op mặc định). IDEMPOTENT
 * (④#4): gọi 2 lần không lỗi, lần 2 huỷ 0 dòng vì không còn gì để huỷ.
 *
 * Chữ ký khớp ĐÚNG những gì `nhanPhanHoi` gọi: `huyLichNhac(donId)` — một tham số, không
 * `pool`/`ctx` (xem `huyLichNhacMacDinh` trong may-trang-thai.js) — nên đây là một
 * FACTORY: đóng `pool` qua closure rồi trả về đúng hàm một-tham-số đó.
 */
export function taoHuyLichNhac(pool, deps = {}) {
  const { job = "lich-nhac", lyDo = "khach_da_tra_loi" } = deps;
  return async function huyLichNhac(donId) {
    const r = await pool.query(
      `UPDATE lich_nhac SET trang_thai = 'da_huy', huy_ly_do = $2
         WHERE don_hang_id = $1 AND trang_thai = 'cho'
       RETURNING id, team_id`,
      [donId, lyDo],
    );
    for (const row of r.rows) {
      await ghiNhatKy(pool, {
        teamId: String(row.team_id),
        tacNhan: `may:${job}`,
        hanhDong: "lich_nhac_bi_huy",
        doiTuong: "lich_nhac",
        doiTuongId: String(row.id),
        sau: { trang_thai: "da_huy", huy_ly_do: lyDo },
        ghiChu:
          "khách đã trả lời — lịch nhắc còn treo là tin rác (may-trang-thai-don-v1.md §5)",
      });
    }
    return { camChua: true, huy: r.rowCount };
  };
}

async function soWaCuaDon(pool, don) {
  if (!don.khach_id) return null;
  const r = await pool.query(
    "SELECT so_dien_thoai FROM khach WHERE id = $1 AND team_id = $2",
    [don.khach_id, don.team_id],
  );
  const so = r.rows[0]?.so_dien_thoai ?? null;
  return so && String(so).trim() ? String(so).trim() : null;
}

/** Đơn `da_gui_wa` mà CHƯA có bất kỳ dòng `lich_nhac` nào ⇒ chưa được đặt lịch lần nào. */
export const CAU_DON_CAN_LICH = `
  SELECT id
    FROM don_hang d
   WHERE d.trang_thai_he = 'da_gui_wa'
     AND NOT EXISTS (SELECT 1 FROM lich_nhac ln WHERE ln.don_hang_id = d.id)
   ORDER BY id
   LIMIT $1`;

/** Lịch đã TỚI HẠN, còn đang `cho`. */
export const CAU_LICH_TOI_HAN = `
  SELECT id, team_id, don_hang_id, lan_thu
    FROM lich_nhac
   WHERE trang_thai = 'cho' AND hen_luc <= $1
   ORDER BY id
   LIMIT $2`;

/**
 * MỘT lượt quét — hai việc, cùng một nhịp:
 *   ① đơn vừa vào `da_gui_wa` mà chưa có lịch nào ⇒ đặt lịch lần 1 (+2h)
 *   ② lịch đã tới hạn ⇒ gửi nhắc qua `guiTinMau` (mẫu NHẮC riêng); còn dưới trần 5 thì
 *      đặt lịch kế tiếp (+2h, lan_thu+1); đủ trần 5 ⇒ gọi `baoHetLuot`, KHÔNG có lịch
 *      thứ 6 (02 §L3 + ④#1).
 * Một đơn/lịch hỏng KHÔNG làm hỏng cả lô (khuôn per-ĐƠN của quet-don-moi.js).
 */
export async function quetLichNhac(pool, tuyChon = {}, deps = {}) {
  const { gioiHan = 500, now = () => new Date() } = tuyChon;
  const { tenMau = MAU_NHAC, job = "quet-lich-nhac" } = deps;
  const guiTinMauFn =
    deps.guiTinMau ?? (await import("../channels/whatsapp/index.js")).guiTinMau;
  const luc = now();

  const kq = {
    moi: 0,
    quet: 0,
    daGui: 0,
    hetLuot: 0,
    donRoiTrang: 0,
    saiNhanh: 0,
    donSaiNhanh: [],
  };

  // ① đặt lịch lần 1 cho đơn vừa vào da_gui_wa mà chưa ai đặt.
  const canLich = await pool.query(CAU_DON_CAN_LICH, [gioiHan]);
  for (const { id: donId } of canLich.rows) {
    try {
      const ket = await datLichNhac(pool, ctxHeThong(), { donId }, { now });
      if (ket.tao) kq.moi++;
    } catch (e) {
      kq.saiNhanh++;
      kq.donSaiNhanh.push({
        id: String(donId),
        loi: e.name,
        thongDiep: e.message,
      });
    }
  }

  // ② lịch tới hạn ⇒ gửi nhắc hoặc báo hết lượt.
  const r = await pool.query(CAU_LICH_TOI_HAN, [luc, gioiHan]);
  kq.quet = r.rowCount;

  for (const lich of r.rows) {
    const teamId = String(lich.team_id);
    try {
      const ctx = ctxHeThong();
      const { don } = await taiDon(pool, ctx, lich.don_hang_id);

      // Đơn đã rời da_gui_wa qua đường khác trước khi job kịp quét (khách trả lời ngay
      // trước nhịp quét, hoặc lịch bị sót lúc huyLichNhac chạy) ⇒ lịch này là RÁC — huỷ
      // êm, KHÔNG gửi. Đây là lưới AN TOÀN thứ hai, huyLichNhac (nhan-phan-hoi-wa.js) đã
      // huỷ TRONG CÙNG LƯỢT phản hồi rồi (④#2) nên nhánh này hiếm khi chạm tới thật.
      if (don.trang_thai_he !== "da_gui_wa") {
        await danhDauLich(pool, {
          teamId,
          id: lich.id,
          job,
          hanhDong: "lich_nhac_bi_huy",
          duLieu: {
            trang_thai: "da_huy",
            huy_ly_do: `don_da_roi_da_gui_wa:${don.trang_thai_he}`,
          },
          ghiChu:
            "đơn đã rời da_gui_wa trước khi job kịp quét — lịch trở thành rác",
        });
        kq.donRoiTrang++;
        continue;
      }

      const soNhan = await soWaCuaDon(pool, don);
      if (!soNhan) {
        // Không thể xảy ra theo luồng bình thường: đơn chỉ tới da_gui_wa sau khi
        // quet-don-moi.js ĐÃ gửi được mẫu đầu (đòi hỏi có soNhan hợp lệ). Không tự ý huỷ
        // êm — đây là dữ liệu bất thường (vd khách bị xoá số giữa chừng), cần người xem.
        throw new Error(
          `quetLichNhac: đơn ${don.id} ở da_gui_wa nhưng không còn số WA — bất thường.`,
        );
      }

      await guiTinMauFn(
        pool,
        ctx,
        {
          soNhan,
          tenMau,
          thamSo: {
            ma_don: don.ma_pos ?? String(don.id),
            lan_thu: lich.lan_thu,
          },
          donHangId: don.id,
        },
        {},
      );

      await danhDauLich(pool, {
        teamId,
        id: lich.id,
        job,
        hanhDong: "lich_nhac_da_gui",
        duLieu: { trang_thai: "da_gui" },
        ghiChu: `gửi nhắc lần ${lich.lan_thu}/${TRAN_NHAC} qua mẫu ${tenMau}`,
      });
      kq.daGui++;

      if (lich.lan_thu >= TRAN_NHAC) {
        await baoHetLuot(pool, ctxHeThong(), { donId: don.id }, { job });
        kq.hetLuot++;
      } else {
        const henLuc = new Date(luc.getTime() + CACH_NHAC_MS);
        await themMoi(pool, ctxHeThong(), "lich_nhac", {
          team_id: teamId,
          don_hang_id: don.id,
          loai: LOAI_NHAC,
          hen_luc: henLuc,
          lan_thu: lich.lan_thu + 1,
          trang_thai: "cho",
        });
      }
    } catch (e) {
      kq.saiNhanh++;
      kq.donSaiNhanh.push({
        id: String(lich.don_hang_id),
        loi: e.name,
        thongDiep: e.message,
      });
    }
  }
  return kq;
}

/**
 * Chạy định kỳ. `unref()` để tiến trình không bị giữ sống chỉ vì cái hẹn giờ này — cùng
 * khuôn `batDauQuet` của quet-don-moi.js.
 */
export function batDauQuetLich(
  pool,
  { nhipMs = NHIP_QUET_LICH_MS, ...tuyChon } = {},
  deps = {},
) {
  let dangChay = false;
  const chay = async () => {
    if (dangChay) return;
    dangChay = true;
    try {
      await quetLichNhac(pool, tuyChon, deps);
    } finally {
      dangChay = false;
    }
  };
  const h = setInterval(chay, nhipMs);
  h.unref?.();
  return () => clearInterval(h);
}
