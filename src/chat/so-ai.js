// SỔ AI — ghi MỌI hành động của bot, đủ 5 loại sự kiện của §11.2 (phiếu L2-M1 ②.3, N5).
//
// VÌ SAO HANDLER V3 PHẢI TỰ GHI, không dựa vào bộ não:
// `src/tools.js` có gọi `logAi(...)` cho 'order' (dòng 203), 'handoff' (264) và 'image'
// (138) — NHƯNG `logAi` ghi vào `ai-messages.jsonl` (sổ JSONL của bản đang chạy), KHÔNG
// vào bảng `so_ai`. Đo bằng `grep -n "so_ai" src/*.js` → 0 dòng. Nghĩa là nếu handler v3
// không tự ghi thì bảng `so_ai` của nền mới CÂM về đúng những sự kiện đắt nhất, và:
//   · 4 cửa chống trùng §7.3 không có gì để tra ("hội thoại này bot đã chốt đơn chưa"),
//   · L3-M2 (lọc trùng chéo) và L3-M4 (hàng chờ tạo đơn) không có nguồn,
//   · khoản chi của lượt bị guard chặn TÀNG HÌNH — đúng bệnh «sổ $0,27 / hoá đơn $1»
//     mà `spent_no_send` được đẻ ra để chữa (pancake-poll.js:433-455).
//
// ── NEO IDEMPOTENT ──────────────────────────────────────────────────────────────
// `so_ai` có UNIQUE (nguon_tep, nguon_dong) — bộ nạp JSONL của L0-M1 dùng nó theo nghĩa
// "tệp + số dòng". Đường RUNTIME không có tệp, nên neo ở đây là:
//     nguon_tep = 'tin_cho_xu_ly:<loại>'      nguon_dong = <id dòng tin>
// Vì sao KHÔNG dùng chung một `nguon_tep` cho mọi loại: UNIQUE sẽ chỉ cho phép ĐÚNG MỘT
// dòng so_ai cho mỗi tin, mà một lượt xử lý sinh tới 4 sự kiện (image + reply + order +
// handoff). Tách theo loại cho ra đúng cái ta muốn: "mỗi tin, mỗi loại, nhiều nhất một
// dòng" — worker thử lại một tin sau khi chết giữa chừng thì KHÔNG đẻ bản ghi thứ hai.
//
// ⚠️ `nguon_dong` là `int` (không phải bigint) — trần 2.147.483.647 dòng `tin_cho_xu_ly`.
//    Ở nhịp ~19.000 hội thoại đang có thì trần này ở rất xa, nhưng nó CÓ THẬT: hàng đợi
//    chạm trần sẽ ném lỗi ghi sổ, không im lặng. Ghi ra đây để người sau không phải đoán.
import { TRANG_THAI } from "../queue/kho.js";

/** Bảy loại của CHECK trong `so_ai` (001_nen). Năm loại đầu là bắt buộc của phiếu này. */
export const LOAI = Object.freeze({
  REPLY: "reply",
  ORDER: "order",
  HANDOFF: "handoff",
  IMAGE: "image",
  OTHER_BOT: "other_bot",
  YIELDED: "yielded",
  SPENT_NO_SEND: "spent_no_send",
});

/**
 * `so_ai.ma_model` là NOT NULL (phán 4 của `luoc-do-v1.md` §4). Với lượt KHÔNG gọi model
 * (Fast Lane trả câu mẫu — 0 token), không có mã model nào để khai. Ghi mã model đang
 * cấu hình vào đó sẽ là một lời khai SAI: đọc sổ sẽ thấy model X "chạy" cho một lượt mà
 * nó chưa từng được gọi, và mọi phép cắt chi phí theo model cộng nhầm lượt 0 đồng vào
 * model đó. Nên dùng một NHÃN VẮNG MẶT tường minh — nó không phải mã model của nhà nào,
 * không ai nhầm được, và `lane` bên cạnh nói rõ tầng nào đã trả lời.
 */
export const KHONG_GOI_MODEL = "khong-goi-model";

/**
 * Ghi MỘT dòng sổ AI. Không ném khi trùng neo (idempotent) — trả `{ ghi:false }`.
 * @returns {Promise<{ghi: boolean, id: string|null}>}
 */
export async function ghiSoAi(
  pool,
  {
    teamId,
    tinId,
    loai,
    maModel,
    pageId = "",
    psid = "",
    lane = null,
    trangThai = null,
    banKichBan = null,
    lyDo = null,
    dung = {},
    duLieu = {},
    xayRaLuc = null,
  },
) {
  if (teamId == null) throw new Error("ghiSoAi: thiếu teamId.");
  if (!tinId) throw new Error("ghiSoAi: thiếu tinId (neo idempotent).");
  if (!Object.values(LOAI).includes(loai)) {
    throw new Error(`ghiSoAi: loai lạ "${loai}".`);
  }
  if (!maModel) {
    // NOT NULL ở tầng CSDL sẽ bắt được, nhưng bắt Ở ĐÂY thì thông điệp nói được
    // "chỗ gọi nào quên khai", còn lỗi CSDL chỉ nói tên cột.
    throw new Error(
      `ghiSoAi(${loai}): thiếu maModel. Lượt không gọi model thì khai KHONG_GOI_MODEL, cấm để rỗng.`,
    );
  }
  const r = await pool.query(
    `INSERT INTO so_ai
       (team_id, xay_ra_luc, page_id, psid, loai, ma_model, lane, trang_thai,
        ban_kich_ban, ly_do, token_vao, token_ra, cache_doc, cache_ghi, so_lan_goi,
        du_lieu, nguon_tep, nguon_dong)
     VALUES ($1, COALESCE($2, now()), $3, $4, $5, $6, $7, $8,
             $9, $10, $11, $12, $13, $14, $15,
             $16, $17, $18)
     ON CONFLICT (nguon_tep, nguon_dong) DO NOTHING
     RETURNING id`,
    [
      teamId,
      xayRaLuc,
      String(pageId ?? ""),
      String(psid ?? ""),
      loai,
      maModel,
      lane,
      trangThai,
      banKichBan,
      lyDo,
      dung.tin ?? null,
      dung.tout ?? null,
      dung.cread ?? null,
      dung.cwrite ?? null,
      dung.calls ?? null,
      JSON.stringify(duLieu ?? {}),
      `tin_cho_xu_ly:${loai}`,
      Number(tinId),
    ],
  );
  return { ghi: r.rowCount > 0, id: r.rowCount ? r.rows[0].id : null };
}

/** Đếm sổ AI theo loại — cổng nghiệm thu ④#6 in bảng này. */
export async function demSoAiTheoLoai(pool, { teamId } = {}) {
  const r = teamId
    ? await pool.query(
        `SELECT loai, count(*)::int n FROM so_ai WHERE team_id=$1 GROUP BY loai ORDER BY loai`,
        [teamId],
      )
    : await pool.query(
        `SELECT loai, count(*)::int n FROM so_ai GROUP BY loai ORDER BY loai`,
      );
  return Object.fromEntries(r.rows.map((x) => [x.loai, x.n]));
}

// Re-export cho worker: trạng thái hàng đợi và sổ AI luôn được đọc cùng nhau.
export { TRANG_THAI };
