// TIN BỊ LỌC — "ngay bây giờ, hội thoại nào đang KHÔNG được trả lời, và vì sao".
//
// Nguồn: bảng `nap_bo_qua` (migration 023). Còn dòng = đang bị bỏ qua; hết dòng = đã vào
// hàng đợi. Bộ nạp ghi gộp một lượt mỗi vòng và xoá khi hội thoại được nạp.
//
// ⚠️ Bảng này là SỔ QUAN SÁT, không phải đường đi của tin. Nó trả lời câu hỏi của người
//    vận hành, nên mọi mã lý do phải dịch sang tiếng người NGAY Ở ĐÂY — màn hình hiện
//    `page_noi_cuoi` thì người đọc vẫn phải đi hỏi nó nghĩa là gì.

/** Mã cửa lọc → câu người đọc được + cửa đó có ĐÁNG NGỜ không. */
export const LY_DO = Object.freeze({
  the_chan: {
    chu: "Có thẻ chặn", ngo: true,
    vi: "Hội thoại mang thẻ trong `V3_NAP_THE_CHAN` (mặc định «Đã gửi») hoặc thẻ trạng thái đơn của Pancake. Thẻ gắn nhầm ⇒ khách bị bỏ im.",
  },
  page_noi_cuoi: {
    chu: "Page vừa nói", ngo: false,
    vi: "Tin cuối của hội thoại là của page (Botcake/sale/POS) ⇒ không có lượt nào để trả lời. Đây là trạng thái BÌNH THƯỜNG và chiếm phần lớn.",
  },
  da_doc: {
    chu: "Đã có người mở", ngo: true,
    vi: "`V3_NAP_CHI_CHUA_DOC=1` đang bật. Pancake đặt «đã đọc» khi sale MỞ hội thoại, không phải khi trả lời — cửa này dễ bỏ sót khách đang hỏi.",
  },
  moc_cu: {
    chu: "Không có gì mới", ngo: false,
    vi: "Mốc hội thoại không đổi từ vòng trước ⇒ không có tin mới. Bình thường.",
  },
  cho_go_xong: {
    chu: "Đang chờ khách gõ xong", ngo: false,
    vi: "Tạm giữ 5s (câu trọn ý) hoặc 15s (câu cụt) để gom cả cụm thành MỘT lượt trả lời. Dòng này phải biến mất sau vài giây — còn lâu hơn là mốc bị kẹt.",
  },
  khong_co_psid: {
    chu: "Thiếu định danh", ngo: true,
    vi: "Hội thoại Pancake trả về thiếu `from_psid`. Không nhắn lại được cho ai — cần soi thủ công.",
  },
});

/** Bao lâu thì một dòng «đang chờ gõ» là BẤT THƯỜNG (nó phải tan trong vài giây). */
const CHO_GO_QUA_LAU_MS = 5 * 60e3;

/**
 * Danh sách hội thoại ĐANG bị bỏ qua.
 * @returns {Promise<Array>} kèm `dangNgo` — cờ để màn tô đỏ đúng dòng cần soi.
 */
export async function dsBoQua(pool, ctx, { pageId = null, lyDo = null, gioiHan = 100, offset = 0 } = {}) {
  const { rows } = await pool.query(`
    SELECT b.*, p.ten AS page_ten, p.thi_truong,
           EXTRACT(EPOCH FROM (now() - b.lan_dau)) * 1000 AS keo_dai_ms
      FROM nap_bo_qua b
      LEFT JOIN page p ON p.team_id = b.team_id AND p.page_id = b.page_id
     WHERE b.team_id = $1
       AND ($2::text IS NULL OR b.page_id = $2)
       AND ($3::text IS NULL OR b.ly_do = $3)
     ORDER BY b.lan_cuoi DESC
     LIMIT $4 OFFSET $5`,
    [ctx.teamId, pageId, lyDo, Math.min(500, Math.max(1, Number(gioiHan) || 100)), Math.max(0, Number(offset) || 0)]);

  return rows.map((r) => {
    const meta = LY_DO[r.ly_do] || { chu: r.ly_do, vi: "", ngo: true };
    const keoDai = Number(r.keo_dai_ms) || 0;
    // «Chờ gõ xong» kéo dài hơn 5 phút KHÔNG còn là chờ — nó là kẹt. Nâng cờ nghi ngờ.
    const ngo = meta.ngo || (r.ly_do === "cho_go_xong" && keoDai > CHO_GO_QUA_LAU_MS);
    return {
      id: String(r.id), pageId: r.page_id, pageTen: r.page_ten || "", thiTruong: r.thi_truong || "",
      convId: r.conv_id, psid: r.psid,
      lyDo: r.ly_do, lyDoChu: meta.chu, lyDoVi: meta.vi, chuThich: r.chu_thich || "",
      soLan: r.so_lan, lanDau: r.lan_dau, lanCuoi: r.lan_cuoi, keoDaiMs: Math.round(keoDai),
      dangNgo: ngo,
    };
  });
}

/**
 * Tóm tắt theo lý do — để nhìn một cái biết cửa nào đang nuốt nhiều nhất.
 * Kèm `dangNgo` tổng: có ít nhất một dòng đáng soi hay không.
 */
export async function tomTatBoQua(pool, ctx, { pageId = null } = {}) {
  const { rows } = await pool.query(`
    SELECT ly_do, COUNT(*)::int AS so_hoi_thoai, SUM(so_lan)::bigint AS so_vong,
           MIN(lan_dau) AS som_nhat, MAX(lan_cuoi) AS moi_nhat,
           MAX(EXTRACT(EPOCH FROM (now() - lan_dau)) * 1000)::bigint AS lau_nhat_ms
      FROM nap_bo_qua
     WHERE team_id = $1 AND ($2::text IS NULL OR page_id = $2)
     GROUP BY ly_do ORDER BY 2 DESC`, [ctx.teamId, pageId]);

  const ds = rows.map((r) => {
    const meta = LY_DO[r.ly_do] || { chu: r.ly_do, vi: "", ngo: true };
    const lau = Number(r.lau_nhat_ms) || 0;
    return {
      lyDo: r.ly_do, chu: meta.chu, vi: meta.vi,
      dangNgo: meta.ngo || (r.ly_do === "cho_go_xong" && lau > CHO_GO_QUA_LAU_MS),
      soHoiThoai: r.so_hoi_thoai, soVong: Number(r.so_vong),
      somNhat: r.som_nhat, moiNhat: r.moi_nhat, lauNhatMs: lau,
    };
  });
  return {
    theoLyDo: ds,
    tongHoiThoai: ds.reduce((s, x) => s + x.soHoiThoai, 0),
    soDangNgo: ds.filter((x) => x.dangNgo).reduce((s, x) => s + x.soHoiThoai, 0),
    // Bảng RỖNG có hai nghĩa khác hẳn nhau — nói ra, đừng để người đọc tự đoán.
    trongVi: ds.length ? null
      : "Không dòng nào: hoặc bộ nạp chưa chạy vòng nào, hoặc mọi hội thoại đều đã vào hàng đợi.",
  };
}
