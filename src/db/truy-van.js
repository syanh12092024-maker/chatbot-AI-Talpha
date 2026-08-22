// TẦNG TRUY VẤN v3 — mọi hàm đọc/ghi bảng NGHIỆP VỤ phải đi qua ĐÂY, để điều kiện team
// được TỰ CHÈN đúng MỘT CHỖ (01-QUYET-DINH.md §8: "điều kiện team nằm ở TẦNG TRUY VẤN,
// tự chèn theo người đang đăng nhập — không phải bộ lọc trên màn hình"). Không viết
// SELECT/INSERT/UPDATE tay có team_id ở nơi khác trong code v3 — đó đúng cái lỗ mà
// 06-PROMPT-GIAO-VIEC.md §"LỚP TEAM" cảnh báo: "sót MỘT chỗ là team này nhìn thấy khách
// team kia".
//
// BA HỢP ĐỒNG đo được (PHIẾU L0-M2 ② + docs/v3/ban-giao/luoc-do-v1.md):
//   1. ctx thiếu/sai (rỗng, team không tồn tại, team KỸ THUẬT) → LoiThieuBoiCanhTeam.
//      Cấm trả mảng rỗng — rỗng trông như "không có dữ liệu", che mất "sai cách gọi".
//   2. Truyền tay team_id KHÁC ctx.teamId trong dieuKien/duLieu → LoiXuyenTeam + ghi
//      đúng 1 dòng nhat_ky (hanh_dong='chan_xuyen_team').
//   3. `bo_luat_chung` ĐỌC bằng (team_id = ctx.teamId OR team_id IS NULL) — MỌI bảng
//      khác đọc một vế `team_id = ctx.teamId`. Quên vế NULL là bug N3 đã có án lệ thật
//      (khối prompt dùng chung tàng hình với mọi team) — đặc cách nằm NGAY TRONG hàm đọc
//      chung của tầng này, không phải một hàm khác dễ quên gọi. GHI vào bo_luat_chung
//      (themMoi/suaTheoId) KHÔNG có đặc cách này — một team chỉ ghi/sửa dòng của chính
//      nó, không bao giờ chạm dòng team_id IS NULL (luật toàn hệ) qua ctx thường.
//
// KHÔNG bao phủ ở đây: `team` `nguoi_dung` `vai` (dùng chung — xem team.js, không đòi
// ctx) và `thanh_vien_team` (việc của người B ở L0-M3: xác định ctx.teamId TỪ đăng nhập
// — dùng bảng này qua một ctx là chuyện con-gà-quả-trứng, ngoài phạm vi phiếu này).
//
// KHÔNG có hàm xoá (`xoaTheoId`) — ② hợp đồng chỉ nói "đọc/ghi", chưa đòi xoá; thêm ra
// là abstraction ngoài phạm vi phiếu (skill tho-thi-cong luật 12).
import { LoiThieuBoiCanhTeam, LoiXuyenTeam } from "./loi.js";
import { ghiNhatKy } from "./nhat-ky.js";

// NEO NGOÀI — 15 bảng nghiệp vụ trích từ `docs/v3/ban-giao/luoc-do-v1.md` §2 (gõ tay,
// KHÔNG đọc từ information_schema: hai vế cùng sinh từ một nguồn thì phép so luôn xanh
// và không bắt được bảng bị đánh rơi khỏi lược đồ — án lệ N5 của L0-M1, giữ nguyên cách
// làm ở `test/l0-m1-luoc-do.test.js`). Đổi lược đồ (thêm/bớt bảng nghiệp vụ) mà không
// sửa danh sách này ⇒ hàm bị chặn nhầm hoặc mở nhầm — CỐ Ý, để lỗi hiện ra ngay thay vì
// âm thầm chấp nhận một tên bảng lạ (skill tho-thi-cong án lệ #22: deny-by-default).
export const BANG_NGHIEP_VU_CHUAN = new Set([
  "cau_hinh_model",
  "page",
  "san_pham",
  "goi_gia",
  "khach",
  "hoi_thoai",
  "so_ai",
  "don_hang",
  "viec_can_xu_ly",
  "hang_cho_tao_don",
  "kich_ban",
  "bo_luat_chung",
  "ky_nang",
  "lich_nhac",
  "nhat_ky",
]);

const RE_TEN_HOP_LE = /^[a-z_][a-z0-9_]*$/;

function kiemTraTenBang(tenBang) {
  if (!BANG_NGHIEP_VU_CHUAN.has(tenBang)) {
    throw new Error(
      `"${tenBang}" không nằm trong BANG_NGHIEP_VU_CHUAN của tầng truy vấn v3 ` +
        `(src/db/truy-van.js) — bảng dùng chung/thanh_vien_team có hàm riêng, bảng lạ ` +
        `thì không đoán, phải sửa neo này trước.`,
    );
  }
}

function kiemTraTenCot(ten) {
  if (typeof ten !== "string" || !RE_TEN_HOP_LE.test(ten)) {
    throw new Error(
      `tên cột "${ten}" không hợp lệ (chỉ chữ thường/số/gạch dưới, không bắt đầu bằng số).`,
    );
  }
  return ten;
}

function coTruyenTayTeamId(vat) {
  return (
    vat != null &&
    Object.prototype.hasOwnProperty.call(vat, "team_id") &&
    vat.team_id != null &&
    vat.team_id !== ""
  );
}

// Cửa DUY NHẤT xác định team_id thật sự dùng cho câu SQL + thi hành rào N2 (ctx sai) và
// N-xuyên-team (truyền tay khác ctx). `dieuKienHayDuLieu` là điều kiện đọc HOẶC dữ liệu
// ghi — hàm chỉ soi khoá `team_id` của nó.
async function xacDinhTeamId(pool, ctx, tenBang, dieuKienHayDuLieu) {
  if (ctx?.laHeThong) {
    // Cửa thoát job nền (ctxHeThong): không có một team cố định để suy luận hộ — đòi
    // tường minh trong dieuKien/duLieu. KHÔNG kiểm la_ky_thuat: job nền (di trú...) được
    // phép chạm team kỹ thuật, đó chính là lý do cửa thoát này tồn tại.
    if (!coTruyenTayTeamId(dieuKienHayDuLieu)) {
      throw new LoiThieuBoiCanhTeam(
        "ctxHeThong() bắt buộc kèm team_id tường minh trong dieuKien/duLieu — job nền " +
          "không có một team cố định để suy luận hộ (xem src/db/boi-canh.js).",
      );
    }
    const teamId = dieuKienHayDuLieu.team_id;
    const r = await pool.query("SELECT id FROM team WHERE id = $1", [teamId]);
    if (!r.rowCount) {
      throw new LoiThieuBoiCanhTeam(
        `ctxHeThong: team_id=${teamId} không tồn tại.`,
      );
    }
    return { teamId, laHeThong: true };
  }

  if (!ctx || ctx.teamId == null || ctx.teamId === "") {
    throw new LoiThieuBoiCanhTeam(
      "Thiếu bối cảnh team (ctx.teamId rỗng) — truy vấn từ chối chạy, KHÔNG trả mảng " +
        "rỗng (rỗng trông như 'không có dữ liệu' thay vì 'sai cách gọi').",
    );
  }
  const r = await pool.query("SELECT la_ky_thuat FROM team WHERE id = $1", [
    ctx.teamId,
  ]);
  if (!r.rowCount) {
    throw new LoiThieuBoiCanhTeam(
      `ctx.teamId=${ctx.teamId} không tồn tại trong bảng team.`,
    );
  }
  if (r.rows[0].la_ky_thuat) {
    throw new LoiThieuBoiCanhTeam(
      `ctx.teamId=${ctx.teamId} là team KỸ THUẬT (chua-phan) — cấm dùng làm bối cảnh ` +
        `truy vấn (rào N2, docs/v3/ban-giao/luoc-do-v1.md §1(i)).`,
    );
  }

  if (
    coTruyenTayTeamId(dieuKienHayDuLieu) &&
    String(dieuKienHayDuLieu.team_id) !== String(ctx.teamId)
  ) {
    await ghiNhatKy(pool, {
      teamId: ctx.teamId,
      tacNhan: `nguoi:${ctx.nguoiDungId ?? "?"}`,
      nguoiDungId: ctx.nguoiDungId ?? null,
      hanhDong: "chan_xuyen_team",
      doiTuong: tenBang,
      doiTuongId: String(dieuKienHayDuLieu.team_id),
      ghiChu: `ctx.teamId=${ctx.teamId} truyền tay team_id=${dieuKienHayDuLieu.team_id} trong tham số/filter — bị chặn`,
    });
    throw new LoiXuyenTeam(
      `Bị chặn: ctx thuộc team ${ctx.teamId} nhưng truyền tay team_id=` +
        `${dieuKienHayDuLieu.team_id} trong tham số/filter.`,
    );
  }
  return { teamId: ctx.teamId, laHeThong: false };
}

async function ghiNhatKyHeThong(pool, teamId, hanhDong, tenBang) {
  await ghiNhatKy(pool, {
    teamId,
    tacNhan: "may:tang-truy-van",
    hanhDong,
    doiTuong: tenBang,
    ghiChu: "gọi qua ctxHeThong() — mọi lượt gọi đều ghi (01-QUYET-DINH.md §9)",
  });
}

// vế team_id trong WHERE — CHỈ bo_luat_chung có đặc cách 2 vế (N3), và CHỈ ở phía ĐỌC.
function veTeamKhiDoc(tenBang, teamId, params) {
  params.push(teamId);
  return tenBang === "bo_luat_chung"
    ? `(team_id = $${params.length} OR team_id IS NULL)`
    : `team_id = $${params.length}`;
}

/**
 * Đọc nhiều dòng của `tenBang` trong bối cảnh `ctx`.
 * tuyChon.dieuKien — điều kiện BẰNG (=) thêm ngoài team_id (vd { trang_thai: 'GREET' }).
 * tuyChon.thuTu    — tên MỘT cột để ORDER BY (tăng dần).
 */
export async function layNhieu(pool, ctx, tenBang, tuyChon = {}) {
  kiemTraTenBang(tenBang);
  const { dieuKien = {}, thuTu } = tuyChon;
  const resolved = await xacDinhTeamId(pool, ctx, tenBang, dieuKien);
  const params = [];
  const mauTeam = veTeamKhiDoc(tenBang, resolved.teamId, params);
  const dkKhac = Object.entries(dieuKien)
    .filter(([k]) => k !== "team_id")
    .map(([k, v]) => {
      kiemTraTenCot(k);
      params.push(v);
      return `${k} = $${params.length}`;
    });
  const whereSql = [mauTeam, ...dkKhac].join(" AND ");
  const orderSql = thuTu ? ` ORDER BY ${kiemTraTenCot(thuTu)}` : "";
  const r = await pool.query(
    `SELECT * FROM ${tenBang} WHERE ${whereSql}${orderSql}`,
    params,
  );
  if (resolved.laHeThong)
    await ghiNhatKyHeThong(pool, resolved.teamId, "doc", tenBang);
  return r.rows;
}

/** Đọc một dòng theo id (đã áp rào team) — null nếu không có hoặc không thuộc team.
 *  KHÔNG hỗ trợ ctxHeThong (không có chỗ truyền team_id tường minh qua tham số `id`) —
 *  job nền cần tra theo id thì dùng layNhieu(ctx, tenBang, { dieuKien: { id, team_id } }). */
export async function layMotTheoId(pool, ctx, tenBang, id) {
  kiemTraTenBang(tenBang);
  const resolved = await xacDinhTeamId(pool, ctx, tenBang, {});
  if (resolved.laHeThong) {
    throw new LoiThieuBoiCanhTeam(
      "layMotTheoId không hỗ trợ ctxHeThong — dùng layNhieu(ctx, tenBang, " +
        "{ dieuKien: { id, team_id } }) để tra theo id trong job nền.",
    );
  }
  const params = [];
  const mauTeam = veTeamKhiDoc(tenBang, resolved.teamId, params);
  params.push(id);
  const r = await pool.query(
    `SELECT * FROM ${tenBang} WHERE ${mauTeam} AND id = $${params.length}`,
    params,
  );
  return r.rows[0] ?? null;
}

/** Thêm một dòng. team_id ghi xuống DB LUÔN LÀ giá trị SERVER tính ra (resolved.teamId),
 *  không tin thẳng field `team_id` caller đưa trong duLieu dù nó có khớp ctx hay không —
 *  giá trị cuối cùng đi qua xacDinhTeamId trước, duLieu.team_id chỉ được SOI, không được
 *  DÙNG trực tiếp. */
export async function themMoi(pool, ctx, tenBang, duLieu = {}) {
  kiemTraTenBang(tenBang);
  const resolved = await xacDinhTeamId(pool, ctx, tenBang, duLieu);
  const cot = ["team_id"];
  const giuCho = ["$1"];
  const params = [resolved.teamId];
  for (const [k, v] of Object.entries(duLieu)) {
    if (k === "team_id") continue;
    kiemTraTenCot(k);
    params.push(v);
    cot.push(k);
    giuCho.push(`$${params.length}`);
  }
  const r = await pool.query(
    `INSERT INTO ${tenBang} (${cot.join(",")}) VALUES (${giuCho.join(",")}) RETURNING *`,
    params,
  );
  if (resolved.laHeThong)
    await ghiNhatKyHeThong(pool, resolved.teamId, "them", tenBang);
  return r.rows[0];
}

/** Sửa một dòng theo id, CHỈ khi dòng đó team_id = ctx.teamId — kể cả với bo_luat_chung
 *  (đặc cách 2 vế CHỈ áp dụng khi ĐỌC, xem đầu file). 0 dòng khớp → trả null, KHÔNG ném
 *  lỗi: đó là "không có dòng đó trong team của bạn", khác với "ctx sai"/"xuyên team".
 *  KHÔNG hỗ trợ ctxHeThong cùng lý do như layMotTheoId. */
export async function suaTheoId(pool, ctx, tenBang, id, duLieu = {}) {
  kiemTraTenBang(tenBang);
  const resolved = await xacDinhTeamId(pool, ctx, tenBang, duLieu);
  if (resolved.laHeThong) {
    throw new LoiThieuBoiCanhTeam(
      "suaTheoId không hỗ trợ ctxHeThong trong phiên bản này (ngoài phạm vi ④ của L0-M2).",
    );
  }
  const gan = [];
  const params = [];
  for (const [k, v] of Object.entries(duLieu)) {
    if (k === "team_id") continue;
    kiemTraTenCot(k);
    params.push(v);
    gan.push(`${k} = $${params.length}`);
  }
  if (!gan.length) {
    throw new Error(
      "suaTheoId: duLieu rỗng (ngoài team_id) — không có gì để sửa.",
    );
  }
  params.push(resolved.teamId);
  const dkTeam = `team_id = $${params.length}`; // MỘT vế, kể cả bo_luat_chung — xem đầu file
  params.push(id);
  const r = await pool.query(
    `UPDATE ${tenBang} SET ${gan.join(",")} WHERE ${dkTeam} AND id = $${params.length} RETURNING *`,
    params,
  );
  return r.rows[0] ?? null;
}
