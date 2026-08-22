// Bảng DÙNG CHUNG `team` — hàm RIÊNG, KHÔNG đòi ctx (docs/v3/ban-giao/luoc-do-v1.md §1
// hợp đồng (i)). Đây là hàm PICKER cho màn chọn team: chỉ hiện team NGHIỆP VỤ, không
// bao giờ hiện `chua-phan` — team đó là chỗ đậu của dữ liệu di trú chưa chốt chủ, một
// Quản trị chọn được nó là nhìn thấy khách của cả ba team cùng lúc.
export async function layDanhSachTeamChon(pool) {
  const r = await pool.query(
    "SELECT id, slug, ten FROM team WHERE NOT la_ky_thuat ORDER BY ten",
  );
  return r.rows;
}
