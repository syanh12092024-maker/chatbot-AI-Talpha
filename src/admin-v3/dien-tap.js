// BÁO CÁO DIỄN TẬP — chấm bot mà không cho nó chạm khách.
//
// Một dòng báo cáo = một lượt: khách nói gì · bot ĐỊNH trả lời gì · mất bao lâu · model nào
// · tốn bao nhiêu token. Đủ ba thứ cần đo trước khi mở van: hiểu hội thoại, chất lượng tư
// vấn, độ phản hồi.
//
// ─── NGUỒN: BA BẢNG, VÀ MỘT MỐI NỐI LỎNG PHẢI NÓI RA ──────────────────────────────────
//   · `lan_gui` (trang_thai='dien_tap') — tin bot ĐỊNH gửi, ghi trước khi (không) gọi mạng
//   · `tin_cho_xu_ly` qua `tin_id` — tin của khách đã kích hoạt lượt đó. Nối CHẶT bằng khoá.
//   · `so_ai` — model, token, độ trễ. Nối LỎNG: sổ AI không mang `tin_id`, nên phải khớp
//     theo (page, psid) + gần nhau về thời gian. Cửa sổ 120 giây, lấy dòng gần nhất TRƯỚC
//     hoặc cùng lúc. Sai số có thể xảy ra khi một khách nhắn dồn dập trong một phút — nên
//     con số token/độ trễ ở đây là ĐỂ ĐỌC XU HƯỚNG, không phải để đối soát từng đồng.
//     Muốn chặt thì phải thêm `tin_id` vào `so_ai` — ghi vào sổ nợ, không làm lén ở đây.
export async function baoCaoDienTap(pool, ctx, { gioiHan = 50, offset = 0 } = {}) {
  const teamId = ctx?.teamId;
  if (teamId == null || teamId === "") throw new Error("baoCaoDienTap: thiếu ctx.teamId.");
  const r = await pool.query(
    `SELECT g.id, g.tin_id, g.loai, g.noi_dung AS dinh_gui, g.tao_luc,
            t.page_id, t.psid, t.noi_dung AS tin_khach, t.thoi_diem AS tin_luc,
            t.trang_thai AS tin_trang_thai,
            p.ten AS page_ten,
            a.ma_model, a.lane, a.token_vao, a.token_ra, a.so_lan_goi,
            a.du_lieu ->> 'tre_luot_ms' AS tre_luot_ms,
            a.du_lieu ->> 'tre_nao_ms'  AS tre_nao_ms
       FROM lan_gui g
       JOIN tin_cho_xu_ly t ON t.id = g.tin_id AND t.team_id = g.team_id
       LEFT JOIN page p ON p.page_id = t.page_id AND p.team_id = g.team_id
       LEFT JOIN LATERAL (
         SELECT s.* FROM so_ai s
          WHERE s.team_id = g.team_id AND s.page_id = t.page_id AND s.psid = t.psid
            AND s.loai = 'reply'
            AND s.xay_ra_luc BETWEEN g.tao_luc - interval '120 seconds' AND g.tao_luc + interval '5 seconds'
          ORDER BY s.xay_ra_luc DESC LIMIT 1
       ) a ON true
      WHERE g.team_id = $1 AND g.trang_thai = 'dien_tap'
      ORDER BY g.tao_luc DESC, g.id DESC
      LIMIT $2 OFFSET $3`,
    [teamId, Math.min(Number(gioiHan) || 50, 200), Math.max(Number(offset) || 0, 0)],
  );
  return {
    items: r.rows.map((d) => ({
      id: String(d.id),
      tinId: String(d.tin_id),
      loai: d.loai,
      pageId: d.page_id,
      pageTen: d.page_ten || d.page_id,
      psid: d.psid,
      tinKhach: d.tin_khach,
      tinLuc: new Date(d.tin_luc).getTime(),
      tinTrangThai: d.tin_trang_thai,
      dinhGui: layChu(d.dinh_gui),
      taoLuc: new Date(d.tao_luc).getTime(),
      maModel: d.ma_model,
      lane: d.lane,
      tokenVao: d.token_vao,
      tokenRa: d.token_ra,
      soLanGoi: d.so_lan_goi,
      treLuotMs: d.tre_luot_ms == null ? null : Number(d.tre_luot_ms),
      treNaoMs: d.tre_nao_ms == null ? null : Number(d.tre_nao_ms),
    })),
  };
}

/** `lan_gui.noi_dung` là jsonb của tham số thứ ba — chuỗi với tin, đối tượng với ảnh. */
function layChu(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v.text || v.url || JSON.stringify(v);
  return String(v);
}

/** Vài con số gom cho cả mẻ — cái người ta nhìn trước khi đọc từng dòng. */
export async function tomTatDienTap(pool, ctx) {
  const teamId = ctx?.teamId;
  if (teamId == null || teamId === "") throw new Error("tomTatDienTap: thiếu ctx.teamId.");
  const r = await pool.query(
    `SELECT count(*)::int AS so_luot,
            count(DISTINCT t.psid)::int AS so_khach,
            count(DISTINCT t.page_id)::int AS so_page,
            min(g.tao_luc) AS tu_luc, max(g.tao_luc) AS den_luc
       FROM lan_gui g JOIN tin_cho_xu_ly t ON t.id = g.tin_id AND t.team_id = g.team_id
      WHERE g.team_id = $1 AND g.trang_thai = 'dien_tap'`,
    [teamId],
  );
  const d = r.rows[0];
  // Độ trễ đọc từ sổ AI: TRUNG VỊ, không phải trung bình. Một lượt 40 giây vì model nghẽn
  // kéo trung bình lệch hẳn, trong khi thứ cần biết là «lượt điển hình mất bao lâu».
  const t = await pool.query(
    `SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY (du_lieu ->> 'tre_luot_ms')::int) AS giua,
            max((du_lieu ->> 'tre_luot_ms')::int) AS lau_nhat,
            count(*)::int AS co_do
       FROM so_ai
      WHERE team_id = $1 AND loai = 'reply' AND du_lieu ? 'tre_luot_ms'`,
    [teamId],
  );
  return {
    soLuot: d.so_luot,
    soKhach: d.so_khach,
    soPage: d.so_page,
    tuLuc: d.tu_luc ? new Date(d.tu_luc).getTime() : null,
    denLuc: d.den_luc ? new Date(d.den_luc).getTime() : null,
    treGiuaMs: t.rows[0].giua == null ? null : Number(t.rows[0].giua),
    treLauNhatMs: t.rows[0].lau_nhat == null ? null : Number(t.rows[0].lau_nhat),
    soLuotCoDoTre: t.rows[0].co_do,
  };
}
