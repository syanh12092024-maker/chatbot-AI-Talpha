// CHUYỂN MỘT PAGE SANG TEAM KHÁC — cửa hẹp thứ SÁU của trục dữ liệu (PHIEU-B-Y3).
//
// ═══ VÌ SAO KHÔNG SỬA `suaTheoId` ═══════════════════════════════════════════════
// `suaTheoId` CỐ Ý bỏ `team_id` khỏi mệnh đề SET (`truy-van.js`, `if (k === "team_id")
// continue`). Đó là một quyết định ĐÚNG cần giữ: mở cái đó ra là mở cửa đổi chủ dữ liệu
// cho cả 15 bảng nghiệp vụ, đúng cái cửa mà `xacDinhTeamId` sinh ra để đóng. Nên chuyển
// page đi bằng MỘT cửa hẹp riêng, có rào riêng, có nhật ký riêng.
//
// Khác bốn cửa hẹp trước (`suaTheoIdPos` · `ghiDon` · `CAU_GHI_CHAM` · `ghiLich`): bốn cái
// đó sinh ra vì `suaTheoId` THIẾU `ctxHeThong` — nợ N3, nay đã đóng ở G2-A1 và chúng sẽ bị
// xoá ở G2-A3. Cửa này KHÔNG cùng loại: nó tồn tại vì một rào cố ý, nên nó ở lại lâu dài.
//
// ═══ CHUYỂN PAGE KHÔNG PHẢI ĐỔI MỘT CỘT ════════════════════════════════════════
// `page.id` được nhiều bảng trỏ tới, và MỖI bảng mang `team_id` RIÊNG. Đổi `page.team_id`
// mà quên con là bỏ lại dữ liệu MỒ CÔI — page thuộc team mới, hội thoại/đơn của nó vẫn ở
// team cũ — và KHÔNG màn hình nào thấy sự lệch đó, vì mỗi bảng tự lọc theo team của mình.
//
// ⛔ DANH MỤC BẢNG CON KHÔNG GÕ TAY. Nó được sinh từ `information_schema` mỗi lượt gọi:
//    «bảng nào có CẢ `page_id` LẪN `team_id`». Lý do rất cụ thể: PHIEU-B-Y3 tự kê tay bốn
//    bảng (`hoi_thoai` `san_pham` `kich_ban` `so_ai`) và SÓT HAI — `don_hang` (phiếu khai
//    nhầm là "nối gián tiếp qua hoi_thoai", thật ra có `page_id` trỏ THẲNG, và đó là bảng
//    TIỀN) và `tin_cho_xu_ly` (hàng đợi tin, `page_id` dạng text). Danh sách gõ tay là lỗ
//    hẹn giờ (án lệ #22): thêm một bảng có `page_id` mà quên sửa danh sách ⇒ mồ côi im lặng.
import { LoiThieuBoiCanhTeam, LoiXuyenTeam } from "./loi.js";
import { ghiNhatKy } from "./nhat-ky.js";

/** Mã vai được phép chuyển page. GẠCH NGANG — `vai.ma` thật là `quan-tri`, và bài học 2
 *  của giai đoạn 2 là chính chuỗi này gõ nhầm thành `quan_tri` ở HAI chỗ, khiến mọi người
 *  dùng thành không có vai và cửa chặn sạch — trông y hệt phân quyền chạy đúng. Nên ngoài
 *  việc khai hằng MỘT lần ở đây, `chuyenPageSangTeam` còn ĐỐI CHIẾU nó với bảng `vai` mỗi
 *  lượt gọi và ném to nếu không khớp: gõ sai thì đỏ, không phải câm. */
export const VAI_DUOC_CHUYEN = "quan-tri";

/** Bảng có `page_id` + `team_id` nhưng CỐ Ý Ở LẠI team cũ, kèm lý do hiện ra được. */
const O_LAI = new Map([
  [
    "so_ai",
    "trigger `tg_chi_insert_so_ai` cấm UPDATE (bảng chỉ-INSERT). Nới trigger là tháo một " +
      "rào của 01-QUYET-DINH §9 — cần người quyết, xem ⑧ của PHIEU-B-Y3.",
  ],
]);

const RE_TEN = /^[a-z_][a-z0-9_]*$/;

/** Sinh danh mục bảng con TỪ LƯỢC ĐỒ ĐANG CHẠY, không từ trí nhớ của người viết phiếu.
 *  `bigint` → `page_id` là khoá ngoại sang `page.id`; `text` → nó là id Facebook, nối
 *  bằng `page.page_id`. Kiểu khác ⇒ NÉM: không đoán cách nối (deny-by-default). */
async function danhMucCon(khach) {
  const r = await khach.query(
    `SELECT c.table_name AS bang, c.data_type AS kieu
       FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.column_name  = 'page_id'
        AND c.table_name  <> 'page'
        AND EXISTS (SELECT 1 FROM information_schema.columns t
                     WHERE t.table_schema = 'public'
                       AND t.table_name   = c.table_name
                       AND t.column_name  = 'team_id')
      ORDER BY c.table_name`,
  );
  return r.rows.map(({ bang, kieu }) => {
    if (!RE_TEN.test(bang)) throw new Error(`tên bảng lạ trong lược đồ: "${bang}"`);
    if (kieu !== "bigint" && kieu !== "text") {
      throw new Error(
        `bảng "${bang}" có page_id kiểu "${kieu}" — cửa chuyển page chỉ biết bigint ` +
          `(khoá ngoại page.id) và text (id Facebook). Không đoán cách nối.`,
      );
    }
    return { bang, kieu, oLai: O_LAI.get(bang) ?? null };
  });
}

/**
 * Chuyển một page sang team khác, KÈM mọi dòng con mang `team_id` riêng.
 *
 * @param {import('pg').Pool} pool
 * @param {{teamId: string|number, nguoiDungId: string|number|null}} ctx bối cảnh NGƯỜI.
 *        `ctxHeThong()` bị TỪ CHỐI: đây là thao tác đổi chủ dữ liệu, nó đòi một VAI, mà
 *        job nền thì không có vai nào để mà đòi.
 * @param {{pageId: string|number, teamDichId: string|number, lyDo?: string}} tuyChon
 * @returns {Promise<{pageId: string, teamCu: string, teamMoi: string,
 *                    daChuyen: Record<string, number>, boLai: Record<string, number>,
 *                    nhatKyId: string}>}
 */
export async function chuyenPageSangTeam(
  pool,
  ctx,
  { pageId, teamDichId, lyDo = "" } = {},
) {
  if (ctx?.laHeThong) {
    throw new LoiThieuBoiCanhTeam(
      "chuyenPageSangTeam KHÔNG nhận ctxHeThong() — chuyển page là thao tác đổi chủ dữ " +
        "liệu, nó đòi vai `quan-tri` của một NGƯỜI. Job nền không có vai.",
    );
  }
  if (!ctx || ctx.teamId == null || ctx.teamId === "") {
    throw new LoiThieuBoiCanhTeam("Thiếu bối cảnh team (ctx.teamId rỗng).");
  }
  if (pageId == null || pageId === "") throw new Error("thiếu pageId.");
  if (teamDichId == null || teamDichId === "") throw new Error("thiếu teamDichId.");

  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");

    // ── ① hằng mã vai phải CÓ THẬT trong bảng `vai` ─────────────────────────────
    // Gõ sai một dấu gạch là cửa chặn SẠCH mà trông y hệt phân quyền chạy đúng — bài học
    // 2 của giai đoạn 2, đã trả giá thật. Đối chiếu ở đây biến lỗi câm thành lỗi to.
    const coVai = await khach.query("SELECT 1 FROM vai WHERE ma = $1", [
      VAI_DUOC_CHUYEN,
    ]);
    if (!coVai.rowCount) {
      throw new Error(
        `mã vai "${VAI_DUOC_CHUYEN}" KHÔNG có trong bảng vai — hằng gõ sai thì mọi lượt ` +
          `gọi bị chặn và màn hình trông y hệt phân quyền chạy đúng (bài học 2 GD2).`,
      );
    }

    // ── ② ctx: team phải tồn tại và KHÔNG phải team kỹ thuật ───────────────────
    const tCtx = await khach.query(
      "SELECT id, la_ky_thuat FROM team WHERE id = $1",
      [ctx.teamId],
    );
    if (!tCtx.rowCount) {
      throw new LoiThieuBoiCanhTeam(
        `ctx.teamId=${ctx.teamId} không tồn tại trong bảng team.`,
      );
    }
    if (tCtx.rows[0].la_ky_thuat) {
      throw new LoiThieuBoiCanhTeam(
        `ctx.teamId=${ctx.teamId} là team KỸ THUẬT — cấm dùng làm bối cảnh truy vấn.`,
      );
    }

    // ── ③ team ĐÍCH: tồn tại, và KHÔNG được là team kỹ thuật ───────────────────
    // Chuyển page vào `chua-phan` là làm nó TÀNG HÌNH với mọi màn (ctx trên team kỹ thuật
    // bị chặn ở khắp nơi). Muốn "gỡ gán" thì phải có đường riêng, không mượn đường này.
    const tDich = await khach.query(
      "SELECT id, slug, la_ky_thuat FROM team WHERE id = $1",
      [teamDichId],
    );
    if (!tDich.rowCount) {
      throw new Error(`teamDichId=${teamDichId} không tồn tại trong bảng team.`);
    }
    if (tDich.rows[0].la_ky_thuat) {
      throw new LoiXuyenTeam(
        `từ chối chuyển page sang team KỸ THUẬT "${tDich.rows[0].slug}" — page sẽ tàng ` +
          `hình với mọi màn hình. Gỡ gán cần một đường riêng.`,
      );
    }

    // ── ④ page phải có thật; đọc team hiện tại của nó ──────────────────────────
    const p = await khach.query(
      "SELECT id, page_id, team_id FROM page WHERE id = $1 FOR UPDATE",
      [pageId],
    );
    if (!p.rowCount) throw new Error(`không có page id=${pageId}.`);
    const teamCu = String(p.rows[0].team_id);
    const teamMoi = String(tDich.rows[0].id);
    const khoaFacebook = p.rows[0].page_id; // id Facebook — khoá của các bảng page_id text

    if (teamCu === teamMoi) {
      throw new Error(
        `page id=${pageId} đã thuộc team ${teamMoi} rồi — không chuyển, và không ghi một ` +
          `dòng nhật ký rỗng nghĩa.`,
      );
    }

    // ── ⑤ ctx phải thuộc MỘT TRONG HAI team (nguồn hoặc đích) ──────────────────
    const cuaToi = String(ctx.teamId);
    if (cuaToi !== teamCu && cuaToi !== teamMoi) {
      throw new LoiXuyenTeam(
        `ctx thuộc team ${cuaToi} nhưng lượt chuyển này là ${teamCu} → ${teamMoi}. ` +
          `Người ngoài cả hai team không chuyển page của họ được.`,
      );
    }

    // ── ⑥ vai `quan-tri` TRONG team đang đứng ──────────────────────────────────
    if (ctx.nguoiDungId == null) {
      throw new LoiXuyenTeam(
        "ctx.nguoiDungId rỗng — không tra được vai, mà chuyển page thì bắt buộc có vai " +
          `"${VAI_DUOC_CHUYEN}".`,
      );
    }
    const q = await khach.query(
      `SELECT 1 FROM thanh_vien_team tv
         JOIN vai v ON v.id = tv.vai_id
        WHERE tv.nguoi_dung_id = $1 AND tv.team_id = $2 AND v.ma = $3`,
      [ctx.nguoiDungId, ctx.teamId, VAI_DUOC_CHUYEN],
    );
    if (!q.rowCount) {
      throw new LoiXuyenTeam(
        `người dùng ${ctx.nguoiDungId} không có vai "${VAI_DUOC_CHUYEN}" trong team ` +
          `${ctx.teamId} — chỉ quản trị mới chuyển được page.`,
      );
    }

    // ── ⑦ chuyển page và TOÀN BỘ con ───────────────────────────────────────────
    await khach.query("UPDATE page SET team_id = $1, sua_luc = now() WHERE id = $2", [
      teamMoi,
      pageId,
    ]);

    const daChuyen = {};
    const boLai = {};
    for (const { bang, kieu, oLai } of await danhMucCon(khach)) {
      const khoa = kieu === "bigint" ? pageId : khoaFacebook;
      if (oLai) {
        // Đếm và TRẢ VỀ, để con số bỏ lại HIỆN RA trên màn hình chứ không âm thầm.
        const d = await khach.query(
          `SELECT count(*)::int c FROM ${bang} WHERE page_id = $1`,
          [khoa],
        );
        boLai[bang] = d.rows[0].c;
        continue;
      }
      // KHÔNG kèm `AND team_id = teamCu`: dòng nào của page này cũng phải theo page, kể cả
      // dòng đã mồ côi sẵn từ trước. Cửa này vừa chuyển vừa VÁ lệch cũ.
      const u = await khach.query(
        `UPDATE ${bang} SET team_id = $1 WHERE page_id = $2`,
        [teamMoi, khoa],
      );
      daChuyen[bang] = u.rowCount;
    }

    // ── ⑧ nhật ký — ghi TRONG giao dịch, hỏng là cuộn lại tất ──────────────────
    // Đây là thao tác đổi chủ dữ liệu: không truy ngược được thì không được phép làm.
    const nhatKyId = await ghiNhatKy(khach, {
      teamId: ctx.teamId,
      tacNhan: `nguoi:${ctx.nguoiDungId}`,
      nguoiDungId: ctx.nguoiDungId,
      hanhDong: "chuyen_page_team",
      doiTuong: "page",
      doiTuongId: String(pageId),
      truoc: { team_id: teamCu },
      sau: { team_id: teamMoi, daChuyen, boLai },
      ghiChu: lyDo,
    });

    await khach.query("COMMIT");
    return {
      pageId: String(pageId),
      teamCu,
      teamMoi,
      daChuyen,
      boLai,
      nhatKyId: String(nhatKyId),
    };
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

/** Đếm dòng LỆCH TEAM giữa con và page, tách làm HAI nhóm — và đó là cả cái điểm của hàm:
 *
 *   `moCoi`   — bảng LẼ RA phải đi theo page mà lại lệch. Số này phải LUÔN bằng 0. Khác 0
 *               nghĩa là có ai đó đổi `team_id` ngoài cửa này (psql tay, migration lỡ tay).
 *   `boLaiCoChuDich` — bảng CỐ Ý ở lại (`O_LAI`). Sau lượt chuyển page ĐẦU TIÊN, số này
 *               chắc chắn > 0. Gộp nó vào `moCoi` là làm phép đo đỏ vĩnh viễn ngay sau
 *               thao tác hợp lệ đầu tiên — mà một cái đèn đỏ vĩnh viễn thì người ta học
 *               cách không nhìn nó nữa. Tách ra để nó HIỆN mà không BÁO ĐỘNG.
 *
 * ⚠️ `PHIEU-B-Y3` ④#5 khai «so_ai mồ côi: 0» — đúng TẠI THỜI ĐIỂM đo (chưa page nào được
 *    chuyển). Nó thôi đúng ngay sau lượt chuyển đầu tiên; đó là hành vi, không phải hỏng.
 *
 * Dùng CHUNG danh mục tự sinh với `chuyenPageSangTeam`, nên không bảng nào lọt lưới đo mà
 * lại nằm trong lưới chuyển, hoặc ngược lại. */
export async function demMoCoi(pool) {
  const khach = await pool.connect();
  try {
    const moCoi = {};
    const boLaiCoChuDich = {};
    for (const { bang, kieu, oLai } of await danhMucCon(khach)) {
      const noi =
        kieu === "bigint" ? "p.id = c.page_id" : "p.page_id = c.page_id";
      const r = await khach.query(
        `SELECT count(*)::int c FROM ${bang} c JOIN page p ON ${noi}
          WHERE c.team_id <> p.team_id`,
      );
      (oLai ? boLaiCoChuDich : moCoi)[bang] = r.rows[0].c;
    }
    return { moCoi, boLaiCoChuDich };
  } finally {
    khach.release();
  }
}
