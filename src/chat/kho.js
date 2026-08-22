// CỬA HẸP GHI `hoi_thoai` cho đường chat v3.
//
// ⚠️ VÌ SAO KHÔNG DÙNG `suaTheoId` CỦA TẦNG TRUY VẤN — đây là NỢ N3 của phiếu L1-M1
// (§9 sổ điều hành), chạm lại nguyên vẹn ở phiếu này:
//   · `suaTheoId`/`layMotTheoId` KHÔNG hỗ trợ `ctxHeThong()` (tang-truy-van-v1.md §3:
//     "chưa có bản suaTheoId cho ctxHeThong, mở phiếu mới nếu L1+ cần").
//   · Đường worker là JOB NỀN — không có NGƯỜI để dựng ctx người dùng.
//   · Và 100% dữ liệu di trú (18.790 hội thoại) đang đậu ở team KỸ THUẬT `chua-phan`,
//     mà ctx người dùng mang team kỹ thuật thì tầng truy vấn ném `LoiThieuBoiCanhTeam`.
//   ⇒ Không còn đường UPDATE hợp lệ nào qua tầng chung. Giữ MỘT cửa hẹp ở đây, đúng
//     khuôn `src/pos/kho.js` mà L1-M1 đã phải dựng vì cùng lý do.
//
// BỐN RÀO TỰ ÁP (bù cho phần tầng chung không áp hộ) — giống hệt `src/pos/kho.js`:
//   1. DANH SÁCH CỘT CHO PHÉP, deny-by-default. Cột lạ ⇒ ném lỗi, không âm thầm bỏ qua.
//   2. LUÔN kẹp `team_id = $team` trong WHERE. Không có đường nào bỏ được vế này.
//   3. Mọi lượt ghi để lại một dòng `nhat_ky` qua cửa chung `ghiNhatKy`.
//   4. KHÔNG có hàm xoá.
//
// ⛔ Cửa này chỉ ghi `hoi_thoai`. Repo đang có HAI đường ghi bảng nghiệp vụ (tầng chung
//    + các cửa hẹp) — khi phiếu `suaTheoId cho ctxHeThong` được mở và làm xong thì XOÁ
//    cửa này. Đã ghi §9 sổ điều hành.
import { ghiNhatKy } from "../db/index.js";

/** Đúng những cột mà một lượt chat được phép đổi. Thêm cột = sửa Ở ĐÂY, có chủ đích. */
const COT_CHO_PHEP = new Set([
  "trang_thai",
  "chu_so_huu",
  "trang_thai_truoc",
  "ly_do_cuoi",
  "cham_luc",
  "ai_noi_luc",
  "ai_noi_gi",
  "chot_don_luc",
  "nguoi_that_luc",
  "moc_luot_llm",
  "luot_llm",
  "luot_ai",
  "ho_so",
  // L2-M3 (ngân sách lượt theo độ nóng) — hai cột ĐÃ CÓ SẴN từ migration 001_nen (dòng
  // 162-163) nhưng CHƯA cửa ghi nào cho phép: khớp đứt kiểu "bảng có reader mà không ai
  // ghi". `diem_nong` = diem_lead->>'score' (tách ra để lọc/index sau này).
  "diem_nong",
  "diem_lead",
]);

/** Cột jsonb — phải bọc `::jsonb`, nếu không pg ghi chuỗi vào cột json và im lặng sai kiểu. */
const COT_JSONB = new Set(["moc_luot_llm", "ho_so", "diem_lead"]);

/**
 * Cập nhật MỘT dòng `hoi_thoai` của MỘT team. Trả dòng đã sửa, hoặc `null` khi 0 dòng
 * khớp (id không tồn tại HOẶC thuộc team khác — không phải lỗi, đúng khuôn `suaTheoId`).
 */
export async function suaHoiThoai(
  pool,
  { teamId, id, giaTri, hanhDong = "chat_cap_nhat_hoi_thoai" },
) {
  if (teamId == null) throw new Error("suaHoiThoai: thiếu teamId.");
  if (!id) throw new Error("suaHoiThoai: thiếu id.");
  const cot = Object.keys(giaTri || {});
  if (!cot.length) return null;
  const la = cot.filter((c) => !COT_CHO_PHEP.has(c));
  if (la.length) {
    throw new Error(
      `suaHoiThoai: cột không được phép ghi từ đường chat: ${la.join(", ")}. ` +
        `Danh sách cho phép: ${[...COT_CHO_PHEP].join(", ")}.`,
    );
  }

  const tham = [id, teamId];
  const dat = cot.map((c, i) => {
    tham.push(COT_JSONB.has(c) ? JSON.stringify(giaTri[c] ?? null) : giaTri[c]);
    return `${c} = $${i + 3}${COT_JSONB.has(c) ? "::jsonb" : ""}`;
  });

  const r = await pool.query(
    `UPDATE hoi_thoai SET ${dat.join(", ")}, sua_luc = now()
      WHERE id = $1 AND team_id = $2
      RETURNING *`,
    tham,
  );
  if (!r.rowCount) return null;

  await ghiNhatKy(pool, {
    teamId,
    tacNhan: "may:l2-chat",
    nguoiDungId: null,
    hanhDong,
    doiTuong: "hoi_thoai",
    doiTuongId: String(id),
    // Ghi TÊN CỘT đã đổi, không ghi nguyên nội dung: `ho_so` mang SĐT/địa chỉ khách,
    // và `nhat_ky` là bảng CHỈ-INSERT (không xoá được dòng đã lỡ ghi).
    sau: { cot: cot },
  });
  return r.rows[0];
}

/**
 * Bảo đảm có dòng `hoi_thoai` cho (page, psid). Bộ NẠP gọi hàm này TRƯỚC khi xếp tin —
 * cửa Messenger v3 KHÔNG tự tạo dòng hộ (cua-messenger-v1.md §2 "Hệ quả bắt buộc").
 * Idempotent: chạy lại không đẻ dòng thứ hai (UNIQUE (page_id, psid)).
 * @returns {Promise<{id: string, moi: boolean}>}
 */
export async function baoDamHoiThoai(pool, { teamId, pageRowId, psid }) {
  if (teamId == null) throw new Error("baoDamHoiThoai: thiếu teamId.");
  if (!pageRowId)
    throw new Error("baoDamHoiThoai: thiếu pageRowId (page.id bigint).");
  const r = await pool.query(
    `INSERT INTO hoi_thoai (team_id, page_id, psid, trang_thai, chu_so_huu, bat_dau_luc, cham_luc)
     VALUES ($1, $2, $3, 'GREET', 'AI', now(), now())
     ON CONFLICT (page_id, psid) DO NOTHING
     RETURNING id`,
    [teamId, pageRowId, String(psid)],
  );
  if (r.rowCount) {
    await ghiNhatKy(pool, {
      teamId,
      tacNhan: "may:l2-nap",
      nguoiDungId: null,
      hanhDong: "chat_mo_hoi_thoai",
      doiTuong: "hoi_thoai",
      doiTuongId: String(r.rows[0].id),
      sau: { psid: String(psid) },
    });
    return { id: r.rows[0].id, moi: true };
  }
  const cu = await pool.query(
    "SELECT id FROM hoi_thoai WHERE page_id = $1 AND psid = $2 AND team_id = $3",
    [pageRowId, String(psid), teamId],
  );
  return { id: cu.rows[0]?.id ?? null, moi: false };
}

/** Đọc dòng `hoi_thoai` theo khoá tự nhiên TEXT của page (khoá mà hàng đợi giữ). */
export async function docHoiThoaiTheoPageText(
  pool,
  { teamId, pageIdText, psid },
) {
  const r = await pool.query(
    `SELECT h.* FROM hoi_thoai h
       JOIN page p ON p.id = h.page_id
      WHERE h.team_id = $1 AND p.page_id = $2 AND h.psid = $3
      LIMIT 1`,
    [teamId, String(pageIdText), String(psid)],
  );
  return r.rows[0] || null;
}
