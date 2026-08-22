// CỬA GHI XUỐNG CSDL của cửa POS — mọi lượt POS chạm bảng v3 đi qua đúng file này.
//
// ═══ VÌ SAO CÓ FILE NÀY (nói thẳng cái giá phải trả) ═════════════════════════
// Tầng truy vấn L0-M2 (`src/db/`) là cửa đúng, và L1-M1 dùng nó cho ĐỌC (`layNhieu`)
// và THÊM (`themMoi`). Nhưng nó có HAI lỗ mà phiếu L1-M1 rơi đúng vào:
//
//   ① `suaTheoId` KHÔNG hỗ trợ `ctxHeThong()` — chính bàn giao L0-M2 khai điều đó
//      (`docs/v3/ban-giao/tang-truy-van-v1.md` §3: «chưa có bản suaTheoId cho
//      ctxHeThong, ngoài phạm vi ④ của phiếu này, MỞ PHIẾU MỚI NẾU L1+ CẦN»).
//      L1-M1 cần: đọc lại đơn từ POS là phải REFRESH `don_hang.trang_thai_pos` và
//      `san_pham.ton_kho` của dòng đã có.
//   ② Toàn bộ dữ liệu di trú đang nằm ở team KỸ THUẬT `chua-phan` (chờ H7), mà ctx
//      người thật BỊ TỪ CHỐI trên team kỹ thuật ⇒ job nền BẮT BUỘC dùng ctxHeThong.
//      Hai điều đó cộng lại: không có đường hợp lệ nào để UPDATE.
//
// Phiếu L1-M1 ③ CẤM đụng `src/db/` (đất L0-M2 đã chốt) ngoài import, và luật 2 của sổ
// cấm tiện tay sửa ngoài phạm vi. Nên lượt này chọn: giữ MỘT cửa UPDATE hẹp ở đây,
// nói to rằng nó là bản TẠM, và ghi nợ §9 để phiếu sau xoá nó đi bằng `suaTheoId` cho
// ctxHeThong. Giá phải trả (nói ra theo luật 13 skill tho-thi-cong): trong lúc chờ,
// repo có HAI đường ghi thay vì một — nên đường này cố ý bị bó chặt hết mức:
//   · chỉ 4 bảng trong `BANG_POS_DUOC_GHI`, deny-by-default;
//   · luôn kèm vế `team_id = $n` trong WHERE — không có lối gọi nào bỏ được vế đó;
//   · MỌI lượt gọi ghi một dòng `nhat_ky` qua `ghiNhatKy` (cửa audit dùng chung của
//     L0-M2), đúng như tầng truy vấn làm với ctxHeThong;
//   · KHÔNG có hàm xoá.
//
// ⛔ `ket_noi_pos` không nằm trong `BANG_NGHIEP_VU_CHUAN` của tầng truy vấn (nó chứa
//    khoá POS mã hoá — xem đầu `db/migrate/002_ket_noi_pos.up.sql`), nên nó chỉ đi qua
//    file này và `src/pos/ket-noi.js`, đúng án lệ `ghiCauHinhModel` của L0-M1.
import { LoiThieuBoiCanhTeam, LoiXuyenTeam, ghiNhatKy } from "../db/index.js";

/** Deny-by-default: đúng 4 bảng cửa POS được phép ghi qua file này. */
export const BANG_POS_DUOC_GHI = new Set([
  "don_hang",
  "san_pham",
  "goi_gia",
  "ket_noi_pos",
]);

const RE_TEN_COT = /^[a-z_][a-z0-9_]*$/;

function kiemTenCot(ten) {
  if (typeof ten !== "string" || !RE_TEN_COT.test(ten)) {
    throw new Error(
      `tên cột "${ten}" không hợp lệ (chỉ chữ thường/số/gạch dưới).`,
    );
  }
  return ten;
}

/**
 * Xác định team_id thật sự dùng cho câu SQL — BẢN SOI GƯƠNG của
 * `xacDinhTeamId` trong `src/db/truy-van.js` (hàm đó không export được).
 * Giữ NGUYÊN hai lỗi có tên của L0-M2 để cả hệ chỉ có MỘT bộ từ vựng lỗi.
 *
 *   ctxHeThong()  → đòi `teamId` tường minh (job nền không có team mặc định)
 *   ctx người     → dùng ctx.teamId; team phải tồn tại và KHÔNG phải team kỹ thuật;
 *                   truyền tay `teamId` khác ctx ⇒ LoiXuyenTeam + 1 dòng nhat_ky.
 */
export async function xacDinhTeam(
  pool,
  ctx,
  { teamId = null, doiTuong = "pos" } = {},
) {
  if (ctx?.laHeThong) {
    if (teamId == null || teamId === "") {
      throw new LoiThieuBoiCanhTeam(
        "ctxHeThong() bắt buộc kèm teamId tường minh — job nền không có team mặc định " +
          "để suy luận hộ (giống hợp đồng src/db/truy-van.js).",
      );
    }
    const r = await pool.query("SELECT id FROM team WHERE id = $1", [teamId]);
    if (!r.rowCount) {
      throw new LoiThieuBoiCanhTeam(
        `ctxHeThong: team_id=${teamId} không tồn tại.`,
      );
    }
    return { teamId: String(teamId), laHeThong: true };
  }

  if (!ctx || ctx.teamId == null || ctx.teamId === "") {
    throw new LoiThieuBoiCanhTeam(
      "Thiếu bối cảnh team (ctx.teamId rỗng) — cửa POS từ chối chạy, KHÔNG trả rỗng.",
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
        `cửa POS. Job nền chạm dữ liệu chưa phân team thì dùng ctxHeThong().`,
    );
  }
  if (
    teamId != null &&
    teamId !== "" &&
    String(teamId) !== String(ctx.teamId)
  ) {
    await ghiNhatKy(pool, {
      teamId: ctx.teamId,
      tacNhan: `nguoi:${ctx.nguoiDungId ?? "?"}`,
      nguoiDungId: ctx.nguoiDungId ?? null,
      hanhDong: "chan_xuyen_team",
      doiTuong,
      doiTuongId: String(teamId),
      ghiChu: `cửa POS: ctx.teamId=${ctx.teamId} truyền tay teamId=${teamId} — bị chặn`,
    });
    throw new LoiXuyenTeam(
      `Bị chặn: ctx thuộc team ${ctx.teamId} nhưng truyền tay teamId=${teamId} cho cửa POS.`,
    );
  }
  return { teamId: String(ctx.teamId), laHeThong: false };
}

/**
 * SỬA một dòng theo id, luôn kẹp `team_id`. Trả dòng đã sửa, hoặc null khi 0 dòng khớp
 * (id không có, hoặc thuộc team khác) — giống hợp đồng `suaTheoId` của L0-M2.
 * Mỗi lượt ghi MỘT dòng nhat_ky, kể cả lượt không khớp dòng nào (biết là đã có người thử).
 */
export async function suaTheoIdPos(
  pool,
  ctx,
  { teamId = null, bang, id, duLieu = {}, tacNhan = "may:cua-pos", hanhDong },
) {
  if (!BANG_POS_DUOC_GHI.has(bang)) {
    throw new Error(
      `bảng "${bang}" không nằm trong BANG_POS_DUOC_GHI — cửa POS chỉ ghi ` +
        `${[...BANG_POS_DUOC_GHI].join("/")}, không mở rộng ngầm.`,
    );
  }
  if (!hanhDong)
    throw new Error("suaTheoIdPos: thiếu hanhDong (để ghi nhat_ky).");
  const team = await xacDinhTeam(pool, ctx, { teamId, doiTuong: bang });

  const gan = [];
  const tham = [];
  for (const [k, v] of Object.entries(duLieu)) {
    if (k === "team_id") continue; // team_id không bao giờ sửa được qua cửa này
    kiemTenCot(k);
    tham.push(v);
    gan.push(`${k} = $${tham.length}`);
  }
  if (!gan.length)
    throw new Error("suaTheoIdPos: duLieu rỗng — không có gì để sửa.");
  tham.push(team.teamId);
  const veTeam = `team_id = $${tham.length}`;
  tham.push(id);
  const r = await pool.query(
    `UPDATE ${bang} SET ${gan.join(",")} WHERE ${veTeam} AND id = $${tham.length} RETURNING *`,
    tham,
  );
  await ghiNhatKy(pool, {
    teamId: team.teamId,
    tacNhan,
    hanhDong,
    doiTuong: bang,
    doiTuongId: String(id),
    sau: r.rowCount ? duLieu : null,
    ghiChu: r.rowCount
      ? "cửa POS sửa dòng (bản TẠM — chờ suaTheoId cho ctxHeThong, nợ §9)"
      : "cửa POS sửa: 0 dòng khớp (id không có hoặc thuộc team khác)",
  });
  return r.rows[0] ?? null;
}
