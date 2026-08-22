// JOB QUÉT ĐƠN MỚI — chỉ đơn nguồn `trang_ban_hang` mới vào luồng nhắn WhatsApp
// (phiếu L3-M1 ②#2 · 02 §L3 «nhắn trong vòng 5 phút»).
//
// ═══ VÌ SAO JOB NÀY CHẠY DƯỚI ctxHeThong() VÀ REBIND TEAM PER-ĐƠN ═══════════════
// Khuôn job nền của L1-M2 gắn ctx theo PAGE, nhưng job này duyệt ĐƠN — và đơn của
// nhiều team nằm chung một lượt quét. Đo 22/08 trên CSDL dev: 26/26 đơn thật đang ở
// team KỸ THUẬT `chua-phan` (id 4, chờ H7 chốt mapping), mà ctx NGƯỜI bị CHẶN trên team
// kỹ thuật ở cả tầng truy vấn lẫn cửa POS ⇒ không có ctx người nào hợp lệ để chạy job.
// Nên: quét bằng một câu RAW theo khoá tự nhiên (cùng tiền lệ `xacDinhTeamQuaDon` của
// cửa WhatsApp và `banDoPage` của cửa POS), rồi MỖI ĐƠN tự mang `team_id` của CHÍNH nó
// vào mọi lượt ghi/nhật ký kế tiếp. Một đơn hỏng KHÔNG làm hỏng cả lô (án lệ «phán
// per-THẺ chứ không per-LÔ — một phần tử mù hoãn cả lô là fail-OPEN trá hình»).
//
// ═══ BA LÝ DO KHÔNG GỬI — ĐẾM ĐƯỢC, KHÔNG GỘP ═════════════════════════════════
//   thieu_so_wa    · đơn chưa nối khách, hoặc khách không có số điện thoại
//                    ⇒ KHÔNG gọi cửa WA lượt nào (spy = 0 cho đơn đó)
//   mau_chua_duyet · cửa WA ném LoiMauChuaDuyet — hôm nay là ĐA SỐ ca thật, vì
//                    `BANG_MAU_TIN` RỖNG (chưa mẫu nào được Meta duyệt, việc NGƯỜI)
//   loi_kenh       · mọi hỏng còn lại của đường gửi (van đóng, chưa có endpoint,
//                    Pancake từ chối, mất mạng)
// Nằm lại `cho_gui_wa` im lặng thì 37,4% quay lại — im lặng hơn. Nên mọi ca hỏng đều
// rơi vào MỘT trong ba ô đếm được, và có trần thử lại để không thử mãi.
import { ctxHeThong } from "../db/index.js";
import {
  apDung,
  dayChoSale,
  LY_DO_KHONG_GUI,
  NGUON,
  TRANG_THAI_GIEO,
} from "./may-trang-thai.js";
import {
  LoiMauChuaDuyet,
  LoiSaiNguonDon,
  LoiDonKhongThuocTeam,
} from "../channels/whatsapp/index.js";

/** Nhịp quét — 02 §L3 đòi «nhắn trong vòng 5 phút» ⇒ chu kỳ phải NGẶT hơn cái trần đó. */
export const NHIP_QUET_MS = 4 * 60_000;
export const TRAN_QUET_MS = 5 * 60_000;

/** Trần thử lại một đơn `gui_wa_loi` trước khi giao người. */
export const TRAN_THU_LAI = 3;

/**
 * Mẫu tin xác nhận. ⚠️ NÓI THẬT: `BANG_MAU_TIN` của cửa WA là `Object.freeze({})` —
 * chưa mẫu nào được Meta duyệt (thủ tục WhatsApp Business Account là việc NGƯỜI, chưa
 * bắt đầu). Nên hôm nay MỌI đơn quét được đều dừng ở `gui_wa_loi/mau_chua_duyet`. Đó là
 * hiện trạng đo được, không phải bug của job — cấm bịa mẫu «cho chạy được»
 * (cua-whatsapp-v1.md §3).
 */
export const MAU_XAC_NHAN = "xac_nhan_don_v1";

/** POS «Chờ xác nhận» = 0 (bảng mã đã xác minh, luoc-do-v1.md §7.2). */
const POS_CHO_XAC_NHAN = "0";

/**
 * Đơn nào ĐỦ ĐIỀU KIỆN vào luồng WhatsApp — MỘT câu, đọc được, in ra được.
 * ⛔ Vế `nguon = 'trang_ban_hang'` là vế KHÔNG ĐƯỢC RƠI RA khi ai chép câu này đi:
 *    thiếu nó là đơn messenger bị hỏi lại (bom hàng — 01 §1).
 */
export const CAU_QUET = `
  SELECT id, team_id, ma_pos, nguon, trang_thai_he, trang_thai_pos,
         khach_id, ly_do_khong_gui, so_lan_thu_wa
    FROM don_hang
   WHERE nguon = 'trang_ban_hang'
     AND (   (trang_thai_he = $1 AND trang_thai_pos = $2)
          OR (trang_thai_he = 'gui_wa_loi' AND so_lan_thu_wa < $3) )
   ORDER BY id
   LIMIT $4`;

/** Ánh xạ lỗi cửa WA → MỘT trong ba lý do đếm được. Không có ô «khác». */
export function lyDoTuLoi(e) {
  if (e instanceof LoiMauChuaDuyet || e?.name === "LoiMauChuaDuyet")
    return "mau_chua_duyet";
  return "loi_kenh";
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

/**
 * MỘT lượt quét. Trả về bảng đếm để cổng nghiệm thu in ra số, không phải chữ «xong».
 *
 * @param deps.guiTinMau  cửa WA thật (mặc định) hoặc spy khi test
 * @param deps.tranThuLai trần thử lại (mặc định TRAN_THU_LAI)
 */
export async function quetDonMoi(pool, tuyChon = {}, deps = {}) {
  const { gioiHan = 500 } = tuyChon;
  const {
    tranThuLai = TRAN_THU_LAI,
    tenMau = MAU_XAC_NHAN,
    job = "quet-don-moi",
  } = deps;
  const guiTinMauFn =
    deps.guiTinMau ?? (await import("../channels/whatsapp/index.js")).guiTinMau;

  const kq = {
    quet: 0,
    daGui: 0,
    hong: 0,
    quaTran: 0,
    saiNhanh: 0,
    theoLyDo: Object.fromEntries(LY_DO_KHONG_GUI.map((l) => [l, 0])),
    donSaiNhanh: [],
  };

  const r = await pool.query(CAU_QUET, [
    TRANG_THAI_GIEO,
    POS_CHO_XAC_NHAN,
    tranThuLai,
    gioiHan,
  ]);
  kq.quet = r.rowCount;

  for (const don of r.rows) {
    // ── REBIND ctx PER-ĐƠN: mọi lượt ghi/nhật ký dưới đây mang team CỦA ĐƠN NÀY ──
    const ctx = ctxHeThong();
    const teamId = String(don.team_id);
    try {
      // ① vào máy (moi_tu_pos → moi) hoặc thử lại (gui_wa_loi → cho_gui_wa)
      const b1 = await apDung(
        pool,
        ctx,
        {
          donId: don.id,
          sukien: don.trang_thai_he === "gui_wa_loi" ? "thu_lai" : "vao_may",
          don,
        },
        { job },
      );
      const donSau = { ...don, ...b1.don };

      // ② moi → cho_gui_wa (chỉ nhánh «đơn mới»; nhánh thử lại đã ở cho_gui_wa rồi)
      let dangO = donSau;
      if (b1.sang === "moi") {
        const b2 = await apDung(
          pool,
          ctx,
          { donId: don.id, sukien: "bat_dau_gui", don: donSau },
          { job },
        );
        dangO = { ...donSau, ...b2.don };
      }

      // ③ gọi cửa WA — hoặc chặn trước vì thiếu số (không gọi cửa lượt nào)
      const soNhan = await soWaCuaDon(pool, don);
      let lyDo = null;
      if (!soNhan) {
        lyDo = "thieu_so_wa";
      } else {
        try {
          await guiTinMauFn(
            pool,
            ctx,
            {
              soNhan,
              tenMau,
              thamSo: { ma_don: don.ma_pos ?? String(don.id) },
              donHangId: don.id,
            },
            {},
          );
        } catch (e) {
          if (
            e instanceof LoiSaiNguonDon ||
            e?.name === "LoiSaiNguonDon" ||
            e instanceof LoiDonKhongThuocTeam ||
            e?.name === "LoiDonKhongThuocTeam"
          ) {
            // KHÔNG phải «lý do không gửi» — đây là đơn đi NHẦM NHÁNH/nhầm team. Nó phải
            // được người nhìn, không được rơi vào ô đếm của ba lý do kênh.
            throw e;
          }
          lyDo = lyDoTuLoi(e);
        }
      }

      if (!lyDo) {
        await apDung(
          pool,
          ctx,
          { donId: don.id, sukien: "gui_xong", don: dangO },
          { job },
        );
        kq.daGui++;
        continue;
      }

      // ④ hỏng: ghi trạng thái thất bại + LÝ DO + tăng số lần thử trong CÙNG một lượt
      const lanThu = Number(dangO.so_lan_thu_wa ?? 0) + 1;
      const b4 = await apDung(
        pool,
        ctx,
        {
          donId: don.id,
          sukien: "gui_hong",
          don: dangO,
          them: { ly_do_khong_gui: lyDo, so_lan_thu_wa: lanThu },
        },
        { job },
      );
      kq.hong++;
      kq.theoLyDo[lyDo]++;

      // ⑤ quá trần ⇒ giao người, kèm lý do NGUYÊN VĂN
      if (lanThu >= tranThuLai) {
        await apDung(
          pool,
          ctx,
          { donId: don.id, sukien: "qua_tran", don: { ...dangO, ...b4.don } },
          { job },
        );
        await dayChoSale(pool, ctx, {
          don,
          teamId,
          lyDo: `qua_tran_thu_lai (${lanThu}/${tranThuLai}) — lý do cuối: ${lyDo}`,
        });
        kq.quaTran++;
      }
    } catch (e) {
      // Per-ĐƠN, không per-LÔ: liệt kê ra rồi đi tiếp.
      kq.saiNhanh++;
      kq.donSaiNhanh.push({
        id: String(don.id),
        loi: e.name,
        thongDiep: e.message,
      });
    }
  }
  return kq;
}

/**
 * Chạy định kỳ. `unref()` để tiến trình không bị giữ sống chỉ vì cái hẹn giờ này.
 * Trả về hàm dừng — không có hàm dừng thì bộ ca không tắt được nó.
 */
export function batDauQuet(
  pool,
  { nhipMs = NHIP_QUET_MS, ...tuyChon } = {},
  deps = {},
) {
  if (nhipMs > TRAN_QUET_MS) {
    throw new Error(
      `nhipMs=${nhipMs} vượt trần ${TRAN_QUET_MS}ms — 02 §L3 đòi đơn được nhắn TRONG ` +
        `VÒNG 5 PHÚT; chu kỳ quét thưa hơn thế là vi phạm ngay ở mức khai báo.`,
    );
  }
  let dangChay = false;
  const chay = async () => {
    if (dangChay) return; // không chồng lượt — một lượt chậm không được đẻ lượt thứ hai
    dangChay = true;
    try {
      await quetDonMoi(pool, tuyChon, deps);
    } finally {
      dangChay = false;
    }
  };
  const h = setInterval(chay, nhipMs);
  h.unref?.();
  return () => clearInterval(h);
}
