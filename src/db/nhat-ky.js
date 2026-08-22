// Ghi một dòng vào bảng `nhat_ky` — bảng CHỈ-INSERT, rào ở tầng DB (trigger
// `tg_chi_insert_nhat_ky`, db/migrate/001_nen.up.sql). Đây LÀ cửa ghi audit dùng CHUNG:
//   (a) truy-van.js tự gọi khi CHẶN xuyên team, và khi dùng ctxHeThong (mọi lượt gọi);
//   (b) mọi module sau này (L1+) muốn ghi nhật ký nghiệp vụ riêng (vd L1-M1 đổi trạng
//       thái đơn) — gọi thẳng hàm này, đừng tự viết câu INSERT khác vào nhat_ky (án lệ
//       skill tho-thi-cong #31: "cửa RA đúng một cái").
//
// Quy ước `tacNhan` theo cột (comment DDL): 'nguoi:<email>' | 'may:<ten-job>'. Tầng
// truy vấn (truy-van.js) dùng 'nguoi:<nguoiDungId>' thay vì email — ctx CHỈ mang
// nguoiDungId (hình dạng đã chốt ở boi-canh.js), tra thêm email sẽ tốn một round-trip
// ngoài phạm vi phiếu này; B có thể đổi quy ước khi ctx có thêm trường email.
export async function ghiNhatKy(
  pool,
  {
    teamId,
    tacNhan,
    nguoiDungId = null,
    hanhDong,
    doiTuong = "",
    doiTuongId = "",
    truoc = null,
    sau = null,
    ghiChu = "",
  },
) {
  if (teamId == null) throw new Error("ghiNhatKy: thiếu teamId.");
  if (!tacNhan)
    throw new Error("ghiNhatKy: thiếu tacNhan ('nguoi:<id>' | 'may:<job>').");
  if (!hanhDong) throw new Error("ghiNhatKy: thiếu hanhDong.");
  const r = await pool.query(
    `INSERT INTO nhat_ky
       (team_id, tac_nhan, nguoi_dung_id, hanh_dong, doi_tuong, doi_tuong_id, truoc, sau, ghi_chu)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      teamId,
      tacNhan,
      nguoiDungId,
      hanhDong,
      doiTuong,
      doiTuongId,
      truoc != null ? JSON.stringify(truoc) : null,
      sau != null ? JSON.stringify(sau) : null,
      ghiChu,
    ],
  );
  return r.rows[0].id;
}
