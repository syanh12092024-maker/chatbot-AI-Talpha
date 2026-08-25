// LỚP GHI `hoi_thoai` cho đường chat v3.
//
// ═══ LỊCH SỬ — đọc trước khi định "dọn nốt" file này ══════════════════════════════
// File này TỪNG là một trong ba «cửa tạm»: nó tự dựng câu `UPDATE hoi_thoai SET …` vì
// `suaTheoId` chưa nhận `ctxHeThong()` (nợ N3, mở 22/08). **G2-A1 đã đóng nợ đó và
// G2-A3 đã gộp câu SQL tay đi** — `suaHoiThoai` nay là một lớp MỎNG gọi xuống
// `suaTheoId`, repo còn đúng MỘT bộ dựng câu UPDATE.
//
// Hai lý do cũ cũng đã hết hạn, ghi lại để người sau không tin nhầm:
//   · «`suaTheoId` không nhận ctxHeThong» — SAI từ 25/08, nó nhận rồi.
//   · «dữ liệu đậu ở team kỹ thuật `chua-phan`» — SAI từ 24/08, 514 page + 28.953 hội
//     thoại đã sang `tieu-alpha`; `chua-phan` rỗng.
//
// ═══ VÌ SAO FILE NÀY VẪN CÒN ═════════════════════════════════════════════════════
// Nó không còn là cửa tạm, nhưng nó THÊM ba thứ mà tầng chung cố ý không có:
//   1. DANH SÁCH CỘT CHO PHÉP của riêng đường chat, deny-by-default. Tầng chung nhận
//      mọi cột của bảng — đường chat thì không được phép chạm `team_id`/`page_id`/…
//   2. KHUÔN jsonb: `pg` biến MẢNG JS thành mảng POSTGRES chứ không thành JSON, nên
//      `moc_luot_llm` phải `JSON.stringify` trước. Đo 25/08, xem ghi chú tại chỗ.
//   3. KHUÔN NHẬT KÝ giữ kín nội dung: chỉ ghi TÊN CỘT đã đổi, vì `ho_so` mang SĐT và
//      địa chỉ khách, mà `nhat_ky` là bảng CHỈ-INSERT (lỡ ghi là không xoá được).
//
// `baoDamHoiThoai` cũng ở lại: nó là `INSERT … ON CONFLICT DO UPDATE`, mà `themMoi` của
// tầng chung không diễn đạt được nâng-hoặc-chèn. `docHoiThoaiTheoPageText` ở lại vì nó
// tra theo id FACEBOOK (JOIN sang `page`), tầng chung không có JOIN.
import { ghiNhatKy, suaTheoId, ctxHeThong } from "../db/index.js";

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

  // ═══ GỘP VỀ MỘT BỘ DỰNG SQL (25/08, G2-A3) ══════════════════════════════════
  // Trước đây khối này TỰ dựng câu `UPDATE hoi_thoai SET … WHERE id AND team_id` vì
  // `suaTheoId` chưa nhận `ctxHeThong()` (nợ N3). G2-A1 đã đóng nợ đó, nên câu SQL tay
  // biến mất và hàm này còn đúng phần nó THẬT SỰ thêm vào: danh sách cột cho phép của
  // đường chat, khuôn jsonb, và một dòng nhật ký KHÔNG chứa nội dung nhạy cảm.
  //
  // ⚠️ `JSON.stringify` cho cột jsonb KHÔNG bỏ được. Đo 25/08 trên Postgres 16.15:
  //    `pg` biến MẢNG JS thành mảng POSTGRES `{a,b}` chứ không thành JSON, nên
  //    `moc_luot_llm: [mốc, mốc]` đi thẳng vào `suaTheoId` là «invalid input syntax for
  //    type json». Stringify ở đây rồi để Postgres tự ép unknown→jsonb thì đúng
  //    (`jsonb_typeof` = `array`, `jsonb_array_length` = 2).
  const duLieu = {};
  for (const c of cot) {
    duLieu[c] = COT_JSONB.has(c)
      ? JSON.stringify(giaTri[c] ?? null)
      : giaTri[c];
  }

  const dong = await suaTheoId(
    pool,
    ctxHeThong(),
    "hoi_thoai",
    id,
    { ...duLieu, team_id: teamId },
    { datSuaLuc: true }, // `sua_luc = now()` — GIỮ đồng hồ CSDL như bản cũ
  );
  if (!dong) return null;

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
  return dong;
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
