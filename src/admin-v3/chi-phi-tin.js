// CHI PHÍ THEO TỪNG TIN — "khách nói gì · bot đáp gì · lượt đó tốn bao nhiêu".
//
// ═══ VÌ SAO CẦN MÀN NÀY ════════════════════════════════════════════════════════════
// Màn `/chi-phi` cũ cộng tiền từ TIẾN TRÌNH BOT v1 và gom theo page. Page đã chuyển sang
// v3 thì v1 không xử lượt nào cho nó ⇒ màn hiện **0đ trong khi bot đang tiêu tiền thật**.
// Và kể cả khi đúng nguồn, một con số cộng theo page không nói được lượt NÀO đắt.
//
// ═══ KHOÁ NỐI — vì sao ghép được tin khách với dòng tiền ═══════════════════════════
// `so_ai.nguon_dong` CHÍNH LÀ `tin_cho_xu_ly.id` (xem `chat/so-ai.js`: `nguon_dong` nhận
// `tinId`, `nguon_tep` = `tin_cho_xu_ly:<loai>`). Nhờ vậy mỗi dòng tiền tra ngược được về
// đúng câu khách đã nhắn và đúng câu bot đã gửi — không phải ghép theo thời gian ±120s
// như `dien-tap.js` phải làm khi chưa có khoá.
//
// ═══ MỘT CÔNG THỨC TIỀN, KHÔNG HAI ═════════════════════════════════════════════════
// Tiền tính bằng `economics.js#usdOf` + `config.aiPrices` — đúng hàm màn `/chi-phi` và
// cửa `/token-cost` của v1 đang dùng. Viết lại một bản ở đây là để hai màn cộng khác nhau.
//
// ⚠️ `token_vao`/`token_ra` NULL nghĩa là CHƯA ĐO ĐƯỢC (nhà cung cấp không trả `usage`),
//    KHÔNG phải bằng 0. Hai thứ đó khác nhau, và gộp lại là ra đơn giá rẻ giả. Mọi hàm
//    dưới đây đếm riêng `soLuotDoThat` để màn nói ra được tỉ lệ.
import { usdOf } from "../economics.js";
import { config } from "../config.js";

const SO = (v) => (v == null ? null : Number(v));
const coDo = (r) => SO(r.token_vao) != null || SO(r.token_ra) != null;

/** Tiền của MỘT dòng sổ AI, theo đơn giá đang cấu hình. `null` khi chưa đo được token. */
export function tienMotDong(r, gia = config.aiPrices) {
  if (!coDo(r)) return { usd: null, vnd: null };
  const usd = usdOf({
    tin: SO(r.token_vao) || 0,
    tout: SO(r.token_ra) || 0,
    cread: SO(r.cache_doc) || 0,
    cwrite: SO(r.cache_ghi) || 0,
  }, gia);
  return { usd, vnd: Math.round(usd * gia.usdVnd) };
}

// Một dòng = một LƯỢT bot xử lý. Gộp `lan_gui` bằng `string_agg` để một lượt có nhiều tin
// gửi (ảnh + chữ) vẫn nằm trên MỘT dòng — tách ra là đếm đôi tiền.
const SQL_TIN = `
  SELECT s.id, s.xay_ra_luc, s.page_id, s.psid, s.loai, s.lane, s.ma_model,
         s.token_vao, s.token_ra, s.cache_doc, s.cache_ghi, s.so_lan_goi,
         s.du_lieu, s.ly_do,
         p.ten AS page_ten, p.thi_truong,
         t.id AS tin_id, t.noi_dung AS tin_khach, t.trang_thai AS tin_trang_thai,
         (SELECT string_agg(g.noi_dung::text, E'\\n' ORDER BY g.buoc)
            FROM lan_gui g WHERE g.team_id = s.team_id AND g.tin_id = t.id) AS bot_gui
    FROM so_ai s
    LEFT JOIN tin_cho_xu_ly t
           ON t.team_id = s.team_id AND t.id = s.nguon_dong
          AND s.nguon_tep LIKE 'tin_cho_xu_ly:%'
    LEFT JOIN page p ON p.team_id = s.team_id AND p.page_id = s.page_id
   WHERE s.team_id = $1
     AND ($2::text IS NULL OR s.page_id = $2)
     AND ($3::text IS NULL OR s.psid = $3)
     AND ($4::timestamptz IS NULL OR s.xay_ra_luc >= $4)
     AND ($5::timestamptz IS NULL OR s.xay_ra_luc <= $5)
   ORDER BY s.xay_ra_luc DESC, s.id DESC
   LIMIT $6 OFFSET $7`;

/**
 * Bảng CHI PHÍ THEO TIN. Mỗi dòng là một lượt bot xử lý, kèm câu khách và câu bot.
 * @returns {Promise<Array>} dòng đã tính tiền; `vnd: null` = lượt chưa đo được token.
 */
export async function chiPhiTheoTin(pool, ctx, {
  pageId = null, psid = null, tu = null, den = null, gioiHan = 100, offset = 0, gia,
} = {}) {
  const n = Math.min(500, Math.max(1, Number(gioiHan) || 100));
  const { rows } = await pool.query(SQL_TIN,
    [ctx.teamId, pageId, psid, tu, den, n, Math.max(0, Number(offset) || 0)]);
  return rows.map((r) => {
    const t = tienMotDong(r, gia);
    return {
      id: String(r.id),
      luc: r.xay_ra_luc,
      pageId: r.page_id,
      pageTen: r.page_ten || "",
      thiTruong: r.thi_truong || "",
      psid: r.psid,
      loai: r.loai,
      lane: r.lane || "",
      maModel: r.ma_model,
      tinKhach: r.tin_khach || "",
      botGui: r.bot_gui || "",
      token: {
        vao: SO(r.token_vao), ra: SO(r.token_ra),
        cacheDoc: SO(r.cache_doc), cacheGhi: SO(r.cache_ghi), soLanGoi: SO(r.so_lan_goi),
      },
      treNaoMs: r.du_lieu?.tre_nao_ms ?? null,
      treLuotMs: r.du_lieu?.tre_luot_ms ?? null,
      vnd: t.vnd,
      doThat: coDo(r),
      lyDo: r.ly_do || "",
    };
  });
}

/** Cột gom được. Gõ tay tên cột vào SQL là mở cửa tiêm — chỉ cho đúng ba khoá này. */
export const GOM_THEO = Object.freeze({
  khach: { cot: "s.psid", nhan: "khách" },
  page: { cot: "s.page_id", nhan: "page" },
  thi_truong: { cot: "COALESCE(NULLIF(p.thi_truong, ''), '(chưa khai)')", nhan: "thị trường" },
});

/**
 * Gom tiền theo khách · page · thị trường.
 * Đếm riêng `soLuot` (mọi lượt) và `soLuotDoThat` (lượt CÓ token) — đơn giá chia trên
 * lượt ĐO ĐƯỢC, chia trên tổng là ra số rẻ giả.
 */
export async function gomChiPhi(pool, ctx, { theo = "page", tu = null, den = null, gioiHan = 100, gia } = {}) {
  const k = GOM_THEO[theo];
  if (!k) throw new Error(`gomChiPhi: khoá gom lạ "${theo}" — chỉ nhận ${Object.keys(GOM_THEO).join(", ")}`);
  const { rows } = await pool.query(`
    SELECT ${k.cot} AS khoa,
           MAX(COALESCE(p.ten, '')) AS page_ten,
           MAX(COALESCE(p.thi_truong, '')) AS thi_truong,
           COUNT(*)::int AS so_luot,
           COUNT(*) FILTER (WHERE s.token_vao IS NOT NULL OR s.token_ra IS NOT NULL)::int AS so_do_that,
           COUNT(*) FILTER (WHERE s.loai = 'order')::int AS so_don,
           COALESCE(SUM(s.token_vao), 0)::bigint  AS tv,
           COALESCE(SUM(s.token_ra), 0)::bigint   AS tr,
           COALESCE(SUM(s.cache_doc), 0)::bigint  AS cd,
           COALESCE(SUM(s.cache_ghi), 0)::bigint  AS cg
      FROM so_ai s
      LEFT JOIN page p ON p.team_id = s.team_id AND p.page_id = s.page_id
     WHERE s.team_id = $1
       AND ($2::timestamptz IS NULL OR s.xay_ra_luc >= $2)
       AND ($3::timestamptz IS NULL OR s.xay_ra_luc <= $3)
     GROUP BY 1
     ORDER BY 7 DESC, 4 DESC
     LIMIT $4`, [ctx.teamId, tu, den, Math.min(500, Math.max(1, Number(gioiHan) || 100))]);

  const P = gia || config.aiPrices;
  return rows.map((r) => {
    const usd = usdOf({ tin: Number(r.tv), tout: Number(r.tr), cread: Number(r.cd), cwrite: Number(r.cg) }, P);
    const vnd = Math.round(usd * P.usdVnd);
    return {
      khoa: r.khoa, nhan: k.nhan,
      pageTen: r.page_ten || "", thiTruong: r.thi_truong || "",
      soLuot: r.so_luot, soLuotDoThat: r.so_do_that, soDon: r.so_don,
      token: { vao: Number(r.tv), ra: Number(r.tr), cacheDoc: Number(r.cd), cacheGhi: Number(r.cg) },
      vnd,
      // Chia trên lượt ĐO ĐƯỢC. 0 lượt đo được ⇒ `null`, KHÔNG phải 0.
      vndMoiLuot: r.so_do_that > 0 ? Math.round(vnd / r.so_do_that) : null,
      vndMoiDon: r.so_don > 0 ? Math.round(vnd / r.so_don) : null,
    };
  });
}
