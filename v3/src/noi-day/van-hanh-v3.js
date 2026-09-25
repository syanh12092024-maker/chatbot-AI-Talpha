import { pageThuocBotMoi, dsPageBotMoi } from "../../../src/queue/page-routing.js";
import { setPage, pageStatus } from "../../../src/admin-v3/operations.js";
import { datCongTacV3 } from "../ui/page-bot/cong-tac.js";
import { sanSangToanHe } from "./cau-bot-v1.js";

/* ═══ CÂU CHỮ CỦA BẢN MỚI → MÃ ĐIỀU KIỆN (GD1 · 23/09/2026) ═════════════════════════════
 *
 * `pageStatus` trả điều kiện dưới dạng CÂU CHỮ. Trước lượt này cầu nhét nguyên câu vào ô
 * `code`, nên mọi màn tra bảng từ vựng theo mã đều trượt: ô đỏ hiện ra không tên, không nút
 * «đi sửa», và màn Bắt đầu gọi nó là «điều kiện màn này chưa biết».
 *
 * Dịch ở ĐÂY, không dịch ở từng màn: cầu là chỗ DUY NHẤT mọi màn đi qua, nên dịch một lần là
 * cả sáu chỗ hiện điều kiện cùng đúng.
 *
 * ⚠️ Câu nào KHÔNG có trong bảng thì vẫn đi tiếp nguyên văn (màn sẽ gắn nhãn «mã lạ» và hiện
 *    ra) — nuốt đi là giấu mất một lý do page không chạy được. Bài test `gd1-mot-nguon` đọc
 *    `src/admin-v3/operations.js` và đỏ ngay khi bên kia thêm một câu chưa khai ở đây.
 */
const MA_CUA_CAU = Object.freeze({
  "Page chưa được đưa vào danh sách worker V3": "BOTMOI_NGOAI_DANH_SACH",
  // 024: cùng một điều kiện, hai câu — vì chỗ đi sửa đổi theo cầu dao
  // `V3_GIAO_PAGE_TREN_MAN`. Cùng mã, vì với người đọc nó vẫn là «page chưa thuộc bot mới».
  "Page chưa được giao cho bot mới — bấm «Giao sang bot mới» ở màn Công tắc từng page":
    "BOTMOI_NGOAI_DANH_SACH",
  "Máy chủ chưa mở gửi tin": "BOTMOI_CHUA_MO_GUI",
  "Máy chủ chưa bật cấu hình prompt V3": "BOTMOI_CHUA_RAP_LOI",
  "Thiếu sản phẩm đúng Page / shop": "BOTMOI_THIEU_SAN_PHAM",
  "Thiếu gói giá hợp lệ": "BOTMOI_THIEU_GIA",
  "Chưa cấu hình model và API key": "BOTMOI_THIEU_MODEL",
  "Model hoặc API key chưa hợp lệ": "BOTMOI_MODEL_HONG",
});

/** Một điều kiện của bản mới, mang MÃ để màn tra được tên và chỗ sửa. */
function oDieuKien(cau) {
  const chu = String(cau || "");
  const ma = MA_CUA_CAU[chu] || null;
  // Có mã thì `detail` để rỗng: câu «làm gì» là thứ CHUNG của bậc, đã nằm trong bảng từ vựng
  // gửi kèm một lần. Chưa có mã thì giữ nguyên văn để nó không biến mất.
  return ma ? { code: ma, detail: "" } : { code: chu, detail: chu };
}
export function noiVanHanhV3(
  pool,
  env = process.env,
  { docLegacy = sanSangToanHe } = {},
) {
  datCongTacV3(async (bc, id, bat) => {
    const p = (
      await pool.query("SELECT * FROM page WHERE team_id=$1 AND id=$2", [
        bc.teamId,
        id,
      ])
    ).rows[0];
    if (!p || !pageThuocBotMoi(p, env)) return null;
    try {
      const row = await setPage(pool, bc, id, { enabled: bat }, env);
      return {
        id: String(id),
        pageId: p.page_id,
        botAiBat: row.v3_ai_bat,
        doi: row.v3_ai_bat !== p.v3_ai_bat,
      };
    } catch (e) {
      e.ma = "v3_cau_hinh";
      throw e;
    }
  });
  return async () => {
    let old = { pages: [] };
    try {
      old = await docLegacy();
    } catch {
      /* Missing legacy bridge must not hide V3 pages. */
    }
    // Nguồn của «page nào thuộc bot mới» đổi theo cầu dao (024) — hỏi ĐÚNG MỘT chỗ.
    const dsMoi = await dsPageBotMoi(pool, env);
    const pages = (
      await pool.query("SELECT * FROM page WHERE page_id=ANY($1::text[])", [dsMoi])
    ).rows;
    const v3 = [];
    for (const p of pages) {
      const state = await pageStatus(pool, p, env);
      v3.push({
        pageId: p.page_id,
        aiEnabled: state.enabled,
        aiAllowed: state.ready,
        readiness: state.ready ? "READY" : "BLOCKED",
        blockers: state.blockers.map(oDieuKien),
        // Nhắc, không chặn. `BOTMOI_CHUA_DO_MAY_CHAY_BOT` luôn có: mấy điều kiện trên mới kiểm
        // CẤU HÌNH, chưa ai hỏi máy chạy bot còn sống không. Nói ra chỗ mình chưa đo được là
        // việc của màn; im lặng thì người đọc tưởng đã đo và đạt.
        warnings: [
          ...(state.dienTap ? [{ code: "BOTMOI_DIEN_TAP", detail: "" }] : []),
          { code: "BOTMOI_CHUA_DO_MAY_CHAY_BOT", detail: "" },
        ],
        missing: state.blockers,
        runtime: "v3",
      });
    }
    return {
      ...old,
      pages: [
        ...(old.pages || []).filter((p) => !dsMoi.includes(String(p.pageId))),
        ...v3,
      ],
    };
  };
}
