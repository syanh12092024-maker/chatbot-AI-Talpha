// CỬA GHI XUỐNG CSDL của cửa POS — mọi lượt POS chạm bảng v3 đi qua đúng file này.
//
// ═══ VÌ SAO CÓ FILE NÀY (nói thẳng cái giá phải trả) ═════════════════════════
// Tầng truy vấn L0-M2 (`src/db/`) là cửa đúng, và L1-M1 dùng nó cho ĐỌC (`layNhieu`)
// và THÊM (`themMoi`). Nhưng nó có HAI lỗ mà phiếu L1-M1 rơi đúng vào:
//
//   ⚠️ HAI LÝ DO DƯỚI ĐÂY ĐÃ HẾT HẠN (25/08) — giữ lại để người sau đọc được lịch sử,
//      nhưng ĐỪNG tin chúng như mô tả hiện trạng. Câu `UPDATE` tay đã bị gộp về
//      `suaTheoId` ở G2-A3; file này nay là lớp MỎNG, không còn là cửa tạm.
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
import {
  LoiThieuBoiCanhTeam,
  LoiXuyenTeam,
  ghiNhatKy,
  suaTheoId,
} from "../db/index.js";

/** Deny-by-default: ba bảng cửa POS được phép ghi qua file này.
 *
 *  ⚠️ `ket_noi_pos` ĐÃ BỎ khỏi danh sách (25/08, G2-A3). Nó chưa từng có nơi gọi nào —
 *  đo bằng `grep suaTheoIdPos`: ba nơi gọi, dùng `don_hang`/`san_pham`/`goi_gia`. Bảng
 *  đó được ghi bởi `db/di-tru/ket-noi-pos.js` bằng câu riêng, và nó CỐ Ý ngoài
 *  `BANG_NGHIEP_VU_CHUAN` (chứa khoá POS mã hoá). Một mục allow-list không ai dùng là
 *  cái lỗ chờ người sau bước vào (án lệ #22) — và từ khi hàm này gọi xuống `suaTheoId`,
 *  để nó lại chỉ đổi một lỗi rõ ràng thành một lỗi khó hiểu về BANG_NGHIEP_VU_CHUAN. */
export const BANG_POS_DUOC_GHI = new Set(["don_hang", "san_pham", "goi_gia"]);

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

  // ═══ GỘP VỀ MỘT BỘ DỰNG SQL (25/08, G2-A3) ══════════════════════════════════
  // Khối này TỪNG tự dựng `UPDATE ${bang} SET … WHERE team_id AND id`, vì `suaTheoId`
  // chưa nhận `ctxHeThong()` (nợ N3). G2-A1 đóng nợ đó ⇒ câu SQL tay biến mất, và cửa
  // POS còn đúng phần nó thật sự thêm: allow-list ba bảng, và một dòng nhật ký ghi MỌI
  // lượt — kể cả lượt khớp 0 dòng, để «đã có người thử» cũng để lại dấu.
  //
  // `team_id` truyền tường minh vì đường POS chạy dưới `ctxHeThong()` (job nền, không
  // có người đăng nhập) — đúng luật của tầng chung. Với ctx NGƯỜI thì giá trị này khớp
  // ctx nên đi qua như thường; lệch là `LoiXuyenTeam`, đúng cái ta muốn.
  const dong = await suaTheoId(pool, ctx, bang, id, {
    ...duLieu,
    team_id: team.teamId,
  });

  await ghiNhatKy(pool, {
    teamId: team.teamId,
    tacNhan,
    hanhDong,
    doiTuong: bang,
    doiTuongId: String(id),
    sau: dong ? duLieu : null,
    ghiChu: dong
      ? "cửa POS sửa dòng"
      : "cửa POS sửa: 0 dòng khớp (id không có hoặc thuộc team khác)",
  });
  return dong;
}
