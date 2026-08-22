// SEED MỒI — `bo_luat_chung` v1 (rút từ prompts.js) + `ky_nang` mẫu "hỏi size" (phiếu
// L2-M3 ②"Vào"). Hai bảng này TỒN TẠI từ migration 001_nen nhưng CHƯA cửa nào từng ghi —
// khớp đứt kiểu "bảng có reader mà không ai ghi" (skill tho-thi-cong).
//
// CHẠY LẠI ĐƯỢC (cùng tiền lệ `ket-noi-pos.js`): không có UNIQUE ràng trên
// `bo_luat_chung` (chỉ `id` PK) nên tự kiểm trước khi ghi — KHÔNG đẻ dòng thứ hai mỗi
// lượt chạy. `ky_nang` có UNIQUE(team_id, ma) nên dùng ON CONFLICT DO NOTHING thẳng.
//
// ⚠️ 01-QUYET-DINH.md §6 "chỉ đích danh 2 SP có size hoàn 26,8%/19,2% chưa bật kỹ năng
// size" — ĐO LẠI (án lệ #4 skill tho-thi-cong, "đo lại nguyên liệu trước khi code"):
// KHÔNG có cách nào xác định ĐÚNG hai mã SP đó từ dữ liệu hiện có. `san_pham` không có
// cột "nhóm sản phẩm"/tỉ lệ hoàn theo SP; `don_hang.san_pham_ma` (migration 005) CHƯA có
// cửa POS nào ghi (nợ Q2 của L3-M2, §9 sổ điều hành 23/08) — không lượt hoàn nào tính
// được PER SKU ở thời điểm seed. Seed dòng "hỏi size" với `bat_cho_nhom_sp = '{}'` VÀ
// `bat = false`: khung kỹ năng có SẴN, KHÔNG âm thầm bật cho toàn bộ danh mục của team
// (rap-prompt.js coi `bat_cho_nhom_sp` rỗng + `bat=true` là "áp dụng toàn team" — bật
// nhầm ở đây sẽ hỏi size cho cả sản phẩm không có size). Khi cửa POS ghi xong
// `san_pham_ma` VÀ có báo cáo tỉ lệ hoàn theo SP, người vận hành UPDATE hai cột này
// (bat_cho_nhom_sp = mảng `san_pham.ma` đúng, bat = true) — KHÔNG cần seed lại.
import { CORE } from "../../src/prompts.js";

export const MA_KY_NANG_HOI_SIZE = "hoi_size";
const NOI_DUNG_HOI_SIZE =
  "Trước khi chốt số lượng/đơn hàng cho sản phẩm CÓ NHIỀU SIZE: PHẢI hỏi khách cần size " +
  "nào (dùng đúng bảng size trong SẢN PHẨM & GIÁ nếu có), đừng đoán hộ hay bỏ qua. Sai " +
  "size là nguyên nhân hoàn hàng lớn nhất của nhóm sản phẩm có size (01-QUYET-DINH.md §6: " +
  "hai SP mẫu hoàn 26,8%/19,2% so với 9,3% của SP không size).";

/** Seed `bo_luat_chung` v1 — team_id=NULL (toàn hệ), nội dung = `CORE` của prompts.js.
 *  Tầng truy vấn (`themMoi`/`suaTheoId`) KHÔNG ghi được team_id NULL cho bảng này — đúng
 *  chủ đích (truy-van.js: "một team chỉ ghi/sửa dòng của chính nó, không bao giờ chạm
 *  dòng team_id IS NULL"). Bootstrap dùng `pool.query` thẳng, cùng tiền lệ nap.js/
 *  ket-noi-pos.js. */
export async function seedBoLuatChung(pool) {
  const co = await pool.query(
    "SELECT id, phien_ban FROM bo_luat_chung WHERE team_id IS NULL ORDER BY phien_ban DESC LIMIT 1",
  );
  if (co.rowCount) {
    return { them: false, phienBan: co.rows[0].phien_ban, doDai: CORE.length };
  }
  const r = await pool.query(
    `INSERT INTO bo_luat_chung (team_id, phien_ban, noi_dung, dang_dung, nguoi_sua, sua_luc)
     VALUES (NULL, 1, $1, true, 'seed:l2-m3', now()) RETURNING id, phien_ban`,
    [CORE],
  );
  return { them: true, phienBan: r.rows[0].phien_ban, doDai: CORE.length };
}

/** Seed `ky_nang` "hỏi size" cho MỖI team nghiệp vụ (`NOT la_ky_thuat`) — `ky_nang.team_id`
 *  NOT NULL nên không seed được cho team kỹ thuật `chua-phan`. */
export async function seedKyNangHoiSize(pool) {
  const team = await pool.query(
    "SELECT id, slug FROM team WHERE NOT la_ky_thuat ORDER BY slug",
  );
  const ra = { them: [], giuNguyen: [] };
  for (const t of team.rows) {
    const r = await pool.query(
      `INSERT INTO ky_nang (team_id, ma, ten, noi_dung, bat_cho_nhom_sp, bat)
       VALUES ($1, $2, $3, $4, '{}', false)
       ON CONFLICT (team_id, ma) DO NOTHING
       RETURNING id`,
      [
        t.id,
        MA_KY_NANG_HOI_SIZE,
        "Hỏi size trước khi chốt đơn",
        NOI_DUNG_HOI_SIZE,
      ],
    );
    (r.rowCount ? ra.them : ra.giuNguyen).push(t.slug);
  }
  return ra;
}

/** Điểm vào cho `db/di-tru/index.js` — chạy CẢ HAI, in báo cáo hai vế (nguồn ↔ đích). */
export async function seedBoLuatVaKyNang(pool) {
  const luat = await seedBoLuatChung(pool);
  const kyNang = await seedKyNangHoiSize(pool);
  return { boLuatChung: luat, kyNang };
}
