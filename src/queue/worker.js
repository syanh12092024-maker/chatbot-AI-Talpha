// WORKER — rút MỘT tin khỏi hàng đợi rồi giao cho nhạc trưởng (phiếu L2-M1 ②.2b).
//
// Hai khoá (khoá DÒNG + khoá HỘI THOẠI) nằm ở `kho.js`; file này quyết định
// TRẠNG THÁI CUỐI của tin, và đó là toàn bộ giá trị của nó:
//
//   kết quả nhạc trưởng | trạng thái tin | thử lại?
//   --------------------|----------------|---------------------------------------------
//   xong                | xong           | không
//   chan_guard          | chan_guard     | ⛔ KHÔNG BAO GIỜ (N6)
//   ném lỗi             | cho / loi      | có, tới trần TRAN_THU
//
// ⛔ VÌ SAO `chan_guard` KHÔNG ĐƯỢC THỬ LẠI (N6): cửa đóng là một QUYẾT ĐỊNH của môi
// trường (`V3_PANCAKE_GUI` chưa đặt, hoặc `PANCAKE_READONLY=1`), không phải sự cố thoáng
// qua. Mà lượt gọi model chạy TRƯỚC lượt gửi, nên mỗi lần thử lại là đốt thêm một lượt
// token thật cho một tin chắc chắn không gửi được. Gộp nó vào `loi` là biến một cái van
// đóng thành một máy đốt tiền chạy tới khi chạm trần. Người vận hành mở van rồi thì
// UPDATE tay đám `chan_guard` về `cho` — có chủ đích, không tự động.
import { moPhienRut, TRANG_THAI, THU_LAI, ghiNhatKyHangDoi } from "./kho.js";
import { xuLyMotTin, KET_QUA } from "../chat/handler-v3.js";
import { docTin as cuaDocTin } from "../channels/messenger/index.js";
import { ctxHeThong } from "../db/index.js";

/** Trần số lượt RÚT một tin. Chạm trần ⇒ `loi` vĩnh viễn, không quay lại `cho` nữa. */
export const TRAN_THU = 3;

/**
 * Chạy ĐÚNG MỘT vòng: rút 1 tin (nếu có) → xử lý → chốt trạng thái.
 * @returns {Promise<null|{tinId: string, ketQua: string, lyDo: string, dem: object, soLanThu: number}>}
 *          `null` = hàng đợi không có tin nào rút được LÚC NÀY (rỗng, hoặc mọi hội thoại
 *          còn tin đang bị worker khác giữ khoá).
 */
export async function chayMotVong(pool, deps = {}) {
  const khoaWorker = deps.khoaWorker || `w-${process.pid}`;
  const phien = await moPhienRut(pool, { khoaWorker });
  if (!phien) return null;

  const { tin, khach } = phien;
  try {
    // Lịch sử hội thoại cho ngữ cảnh model — đọc QUA CỬA (đường ĐỌC, không bị guard
    // GỬI chặn). Lỗi mạng ở đây KHÔNG làm hỏng lượt: bộ não vẫn trả lời được với hồ sơ
    // nén + tin hiện tại, chỉ nghèo ngữ cảnh hơn. Thà trả lời với ít ngữ cảnh còn hơn
    // đẩy tin sang `loi` rồi thử lại (mỗi lượt thử là một lượt model).
    let lichSu = [];
    if (deps.docLichSu !== false) {
      const docT = deps.docTin || cuaDocTin;
      lichSu =
        (await docT(
          pool,
          ctxHeThong(),
          {
            pageId: tin.page_id,
            psid: tin.psid,
            convId: tin.conv_id,
            custId: tin.cust_id,
          },
          deps.depsPancake || {},
        ).catch(() => [])) || [];
    }

    // ⚠️ Truyền `khach` (client của giao dịch đang mở), KHÔNG phải `pool`: mọi lượt ghi
    // của nhạc trưởng phải nằm TRONG cùng giao dịch với việc chốt trạng thái tin. Dùng
    // `pool` là mở một kết nối thứ hai — nó sẽ ĐỨNG CHỜ chính hàng `tin_cho_xu_ly` mà
    // giao dịch này đang khoá nếu có ai đụng tới, và tệ hơn: sổ AI ghi xong rồi giao
    // dịch rollback thì sổ nói bot đã trả lời một tin vẫn đang ở 'cho'.
    const kq = await xuLyMotTin(khach, tin, { ...deps, lichSu });

    if (kq.ketQua === KET_QUA.CHAN_GUARD) {
      await ghiNhatKyHangDoi(khach, {
        teamId: tin.team_id,
        hanhDong: "tin_chan_guard",
        tinId: tin.id,
        ghiChu: String(kq.lyDo).slice(0, 400),
      });
      await phien.ketThuc(TRANG_THAI.CHAN_GUARD, kq.lyDo);
      return { tinId: tin.id, ...kq, soLanThu: tin.so_lan_thu };
    }
    await phien.ketThuc(TRANG_THAI.XONG, kq.lyDo);
    return { tinId: tin.id, ...kq, soLanThu: tin.so_lan_thu };
  } catch (e) {
    // Trần thử lại. `tin.so_lan_thu` đã được câu rút CỘNG 1 rồi, nên so trực tiếp.
    const hetLuot = Number(tin.so_lan_thu) >= TRAN_THU;
    const trangThai = hetLuot ? TRANG_THAI.LOI : THU_LAI;
    const lyDo = `${e?.name || "Error"}: ${e?.message || ""}`;
    try {
      await phien.ketThuc(trangThai, lyDo);
    } catch {
      // Giao dịch đã hỏng (vd lỗi SQL làm abort) ⇒ không chốt được trạng thái. ROLLBACK
      // trả tin về 'cho' NGUYÊN TRẠNG kể cả `so_lan_thu` — tin sẽ được thử lại và có thể
      // lặp mãi. Đây là ca đã biết, ghi §9 làm nợ chứ không giả vờ đã xử lý.
      await phien.huy().catch(() => {});
    }
    return {
      tinId: tin.id,
      ketQua: trangThai === TRANG_THAI.LOI ? KET_QUA.LOI : "thu_lai",
      lyDo,
      dem: {},
      soLanThu: Number(tin.so_lan_thu),
    };
  }
}

/**
 * Chạy nhiều vòng cho tới khi hết việc (hoặc chạm `toiDa`). Trả bảng đếm theo kết quả.
 * Đây là hình dạng mà một tiến trình worker thật sẽ gọi trong vòng lặp có ngủ.
 */
export async function chayToiKhiHet(pool, { toiDa = 100, ...deps } = {}) {
  const dem = { vong: 0, xong: 0, chan_guard: 0, loi: 0, thu_lai: 0 };
  for (let i = 0; i < toiDa; i++) {
    const r = await chayMotVong(pool, deps);
    if (!r) break;
    dem.vong += 1;
    dem[r.ketQua] = (dem[r.ketQua] || 0) + 1;
  }
  return dem;
}

export { TRANG_THAI };
