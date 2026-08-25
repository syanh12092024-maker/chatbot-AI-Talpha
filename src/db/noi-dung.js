// PHIÊN BẢN · DUYỆT · ĐO ẢNH HƯỞNG cho hai khối nội dung dùng chung (G2-A4).
//
// Bộ luật chung là **2.256 token dùng chung cho mọi page đang bật bot**. Sửa sai một dòng
// là 51 page đổi cách nói với khách trong MỘT lượt deploy. Sổ giao việc ghi thẳng:
// «không có phiên bản và không lùi được thì đừng cho sửa».
//
// ═══ BA THỨ PHẢI TRẢ LỜI ĐƯỢC TRƯỚC KHI AI ĐÓ BẤM ÁP ═══════════════════════════════
//   ① bản này khác bản trước chỗ nào   → `soSanhBoLuat()`
//   ② bao nhiêu page đang dùng          → `xemAnhHuongBoLuat()` · `xemAnhHuongKyNang()`
//   ③ lùi được về bản cũ                → `apBoLuat()` (áp và lùi là CÙNG một hàm)
//
// ═══ VÌ SAO PHÉP ĐẾM ẢNH HƯỞNG NẰM CÙNG FILE VỚI VỊ TỪ CỦA BỘ ĐỌC ══════════════════
// Câu «bao nhiêu page bị ảnh hưởng» chỉ đúng nếu nó dùng ĐÚNG luật mà bộ ráp prompt dùng
// lúc chạy thật. Hai bản cài của cùng một luật là cách chắc chắn nhất để màn hình nói
// «3 page» trong khi bot đổi giọng ở 51 page. Nên `apDungChoPage()` khai MỘT LẦN ở đây, và
// `src/chat/rap-prompt.js#docKyNang` import chính nó — không gõ lại.
//
// ═══ KHÔNG ĐẬP MÀN NGƯỜI B ═══════════════════════════════════════════════════════════
// `v3/src/ui/bo-luat/` và `v3/src/ui/ky-nang/` đã chạy. File này CỘNG THÊM một cửa an
// toàn hơn; nó không đổi ý nghĩa cột nào B đang đọc. `dang_dung` vẫn là cờ LIVE duy nhất.
import { LoiThieuBoiCanhTeam, LoiXuyenTeam } from "./loi.js";
import { ghiNhatKy } from "./nhat-ky.js";

export const HANH_DONG = Object.freeze({
  TAO_BAN: "tao_ban_bo_luat",
  DUYET: "duyet_bo_luat",
  AP: "ap_bo_luat",
  KY_NANG_SUA: "sua_ky_nang",
  KY_NANG_LUI: "lui_ky_nang",
});

/** Vai sửa được BỘ LUẬT CHUNG. `duyet-kich-ban` KHÔNG có ở đây — 01-QUYET-DINH §9 tách hai
 *  việc, và nghiệm thu sóng 4 nói rõ «Người duyệt kịch bản duyệt được nhưng KHÔNG sửa được
 *  bộ luật chung». Gạch NGANG, đối chiếu với bảng `vai` mỗi lượt (bài học 2 GD2). */
export const VAI_SUA_BO_LUAT = Object.freeze(["quan-tri"]);

/** Vai sửa được KỸ NĂNG. 01 §6 xếp khối «Kỹ năng» cho Marketer, nên marketer vào được. */
export const VAI_SUA_KY_NANG = Object.freeze(["quan-tri", "marketer"]);

// ═══════════════════════════════════════════════════════════════════════════════════
// VỊ TỪ DÙNG CHUNG — khai MỘT LẦN, cả bộ đọc prompt lẫn phép đếm ảnh hưởng đều gọi nó
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Kỹ năng này có áp cho page có danh sách mã sản phẩm `dsMaSp` không?
 *
 * `bat_cho_nhom_sp` RỖNG ⇒ áp cho CẢ TEAM (quản trị bật có chủ đích, không khoanh nhóm).
 * Khác hẳn «kỹ năng chưa ai bật» (`bat=false`) — chỗ đó không gọi tới hàm này.
 */
export function apDungChoPage(kyNang, dsMaSp = []) {
  const nhom = Array.isArray(kyNang?.bat_cho_nhom_sp)
    ? kyNang.bat_cho_nhom_sp.filter(Boolean)
    : [];
  if (!nhom.length) return true;
  const co = new Set(dsMaSp.map(String));
  return nhom.some((g) => co.has(String(g)));
}

// ═══════════════════════════════════════════════════════════════════════════════════
// RÀO CHUNG
// ═══════════════════════════════════════════════════════════════════════════════════

async function batBuocVai(khach, ctx, dsVai, viec) {
  if (ctx?.laHeThong) {
    throw new LoiThieuBoiCanhTeam(
      `${viec} KHÔNG nhận ctxHeThong() — đây là thao tác đổi thứ 51 page nói với khách, ` +
        `nó đòi VAI của một người. Job nền không có vai.`,
    );
  }
  if (!ctx || ctx.teamId == null || ctx.teamId === "") {
    throw new LoiThieuBoiCanhTeam("Thiếu bối cảnh team (ctx.teamId rỗng).");
  }
  // Hằng mã vai phải CÓ THẬT trong bảng `vai`. Gõ sai một dấu gạch là cửa chặn SẠCH mà
  // trông y hệt phân quyền chạy đúng — bài học 2 của giai đoạn 2, đã trả giá thật.
  const co = await khach.query("SELECT count(*)::int c FROM vai WHERE ma = ANY($1)", [
    [...dsVai],
  ]);
  if (co.rows[0].c !== dsVai.length) {
    throw new Error(
      `mã vai ${JSON.stringify(dsVai)} không khớp bảng vai (khớp ${co.rows[0].c}/` +
        `${dsVai.length}) — hằng gõ sai thì mọi lượt gọi bị chặn và màn hình trông y hệt ` +
        `phân quyền chạy đúng (bài học 2 GD2).`,
    );
  }
  const t = await khach.query(
    "SELECT la_ky_thuat FROM team WHERE id = $1",
    [ctx.teamId],
  );
  if (!t.rowCount) {
    throw new LoiThieuBoiCanhTeam(`ctx.teamId=${ctx.teamId} không tồn tại.`);
  }
  if (t.rows[0].la_ky_thuat) {
    throw new LoiThieuBoiCanhTeam(
      `ctx.teamId=${ctx.teamId} là team KỸ THUẬT — cấm dùng làm bối cảnh.`,
    );
  }
  if (ctx.nguoiDungId == null) {
    throw new LoiXuyenTeam(
      `ctx.nguoiDungId rỗng — không tra được vai, mà ${viec} thì bắt buộc có vai.`,
    );
  }
  const q = await khach.query(
    `SELECT 1 FROM thanh_vien_team tv JOIN vai v ON v.id = tv.vai_id
      WHERE tv.nguoi_dung_id = $1 AND tv.team_id = $2 AND v.ma = ANY($3)`,
    [ctx.nguoiDungId, ctx.teamId, [...dsVai]],
  );
  if (!q.rowCount) {
    throw new LoiXuyenTeam(
      `người dùng ${ctx.nguoiDungId} không có vai ${dsVai.join("|")} trong team ` +
        `${ctx.teamId} — không ${viec} được.`,
    );
  }
}

const tacNhanCua = (ctx) => `nguoi:${ctx.nguoiDungId}`;

// ═══════════════════════════════════════════════════════════════════════════════════
// ĐO ẢNH HƯỞNG — «bao nhiêu page đang dùng»
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Bộ luật chung áp cho MỌI page của team. Con số quan trọng không phải tổng số page mà là
 * **số page ĐANG BẬT BOT** — chỉ những page đó mới thật sự đổi cách nói với khách. Trả cả
 * hai, và đừng gộp: gộp lại thì người bấm nút đọc «514» và tưởng thảm hoạ, hoặc đọc «51»
 * mà không biết còn 463 page sẽ đổi ngay khi ai đó bật bot.
 */
export async function xemAnhHuongBoLuat(pool, ctx) {
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_SUA_BO_LUAT, "xem ảnh hưởng bộ luật chung");
    const r = await khach.query(
      `SELECT count(*)::int tong,
              count(*) FILTER (WHERE bot_ai_bat)::int dang_bat
         FROM page WHERE team_id = $1`,
      [ctx.teamId],
    );
    return {
      soPage: r.rows[0].tong,
      soPageDangBatBot: r.rows[0].dang_bat,
    };
  } finally {
    khach.release();
  }
}

/**
 * Một kỹ năng (đang bật, với phạm vi `batChoNhomSp`) chạm bao nhiêu page?
 *
 * Dùng ĐÚNG `apDungChoPage()` mà bộ ráp prompt dùng — không phải một câu SQL viết lại luật
 * đó bằng SQL. Viết lại là đẻ bản khai thứ hai, và bản thứ hai bao giờ cũng là bản trôi.
 *
 * @param {string[]|null} batChoNhomSp phạm vi ĐỊNH đặt (chưa ghi xuống) — để xem TRƯỚC khi
 *        bấm. Bỏ trống thì lấy phạm vi đang lưu của kỹ năng đó.
 */
export async function xemAnhHuongKyNang(pool, ctx, { ma, batChoNhomSp = null } = {}) {
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_SUA_KY_NANG, "xem ảnh hưởng kỹ năng");
    if (!ma) throw new Error("xemAnhHuongKyNang: thiếu `ma` kỹ năng.");

    let nhom = batChoNhomSp;
    if (nhom == null) {
      const k = await khach.query(
        "SELECT bat_cho_nhom_sp FROM ky_nang WHERE team_id = $1 AND ma = $2",
        [ctx.teamId, ma],
      );
      if (!k.rowCount) throw new Error(`không có kỹ năng ma='${ma}' trong team này.`);
      nhom = k.rows[0].bat_cho_nhom_sp;
    }

    // Mã sản phẩm THEO PAGE. `san_pham.page_id` nullable ⇒ page không có sản phẩm nào vẫn
    // phải có mặt trong danh sách (nó vẫn bị chạm nếu phạm vi rỗng = cả team).
    const r = await khach.query(
      `SELECT p.id, p.page_id, p.ten, p.bot_ai_bat,
              coalesce(array_agg(s.ma) FILTER (WHERE s.ma IS NOT NULL), '{}') AS ma_sp
         FROM page p
         LEFT JOIN san_pham s ON s.page_id = p.id AND s.team_id = p.team_id
        WHERE p.team_id = $1
        GROUP BY p.id, p.page_id, p.ten, p.bot_ai_bat
        ORDER BY p.page_id`,
      [ctx.teamId],
    );
    const gia = { bat_cho_nhom_sp: nhom };
    const cham = r.rows.filter((p) => apDungChoPage(gia, p.ma_sp));
    return {
      phamVi: Array.isArray(nhom) ? nhom.filter(Boolean) : [],
      caTeam: !(Array.isArray(nhom) && nhom.filter(Boolean).length),
      soPage: cham.length,
      soPageDangBatBot: cham.filter((p) => p.bot_ai_bat).length,
      dsPage: cham.map((p) => ({
        id: String(p.id),
        pageId: p.page_id,
        ten: p.ten,
        batBot: p.bot_ai_bat,
      })),
    };
  } finally {
    khach.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// SO SÁNH HAI BẢN — «khác bản trước chỗ nào»
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * So hai phiên bản bộ luật chung THEO DÒNG.
 *
 * Đây là phép so TẬP HỢP DÒNG, không phải diff có thứ tự: nó trả lời «dòng nào mất, dòng
 * nào thêm», KHÔNG trả lời «dòng nào bị chuyển chỗ». Khai ra ở đây thay vì để người đọc
 * tự suy — một dòng bị di chuyển sẽ hiện thành một dòng bỏ + một dòng thêm.
 */
export async function soSanhBoLuat(pool, ctx, { tuPhienBan, denPhienBan } = {}) {
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_SUA_BO_LUAT, "so sánh bộ luật chung");
    const doc = async (pb) => {
      const r = await khach.query(
        `SELECT phien_ban, noi_dung FROM bo_luat_chung
          WHERE (team_id = $1 OR team_id IS NULL) AND phien_ban = $2
          ORDER BY team_id NULLS LAST LIMIT 1`,
        [ctx.teamId, pb],
      );
      if (!r.rowCount) throw new Error(`không có bộ luật phiên bản ${pb}.`);
      return r.rows[0].noi_dung;
    };
    const a = (await doc(tuPhienBan)).split("\n");
    const b = (await doc(denPhienBan)).split("\n");
    const tapA = new Set(a);
    const tapB = new Set(b);
    return {
      tuPhienBan,
      denPhienBan,
      boDi: a.filter((d) => !tapB.has(d)),
      themVao: b.filter((d) => !tapA.has(d)),
      soDongTruoc: a.length,
      soDongSau: b.length,
      phepSo: "tập hợp dòng — dòng bị CHUYỂN CHỖ hiện thành một bỏ + một thêm",
    };
  } finally {
    khach.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// BỘ LUẬT CHUNG — tạo bản · duyệt · áp/lùi
// ═══════════════════════════════════════════════════════════════════════════════════

/** Tạo một PHIÊN BẢN MỚI. KHÔNG áp — `dang_dung = false`, bản đang chạy không bị đụng. */
export async function taoBanBoLuat(
  pool,
  ctx,
  { noiDung, ghiChu = "", nguon = "nguoi" } = {},
) {
  if (typeof noiDung !== "string" || !noiDung.trim()) {
    throw new Error("taoBanBoLuat: `noiDung` rỗng — không tạo bản trắng.");
  }
  if (nguon !== "nguoi" && nguon !== "ai") {
    throw new Error(`taoBanBoLuat: nguon lạ "${nguon}" — chỉ 'nguoi' | 'ai'.`);
  }
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    await batBuocVai(khach, ctx, VAI_SUA_BO_LUAT, "sửa bộ luật chung");
    // Khoá theo team để hai lượt soạn đồng thời không cùng chọn một số phiên bản.
    // (`bo_luat_chung_phien_ban_duy_nhat` sẽ bắt, nhưng bắt bằng lỗi khoá trùng thì nơi
    //  gọi phải tự đoán ý; khoá trước thì lượt sau chỉ việc lấy số kế tiếp.)
    await khach.query("SELECT pg_advisory_xact_lock($1, $2)", [
      910_009,
      Number(ctx.teamId),
    ]);
    const m = await khach.query(
      "SELECT coalesce(max(phien_ban), 0)::int n FROM bo_luat_chung WHERE team_id = $1",
      [ctx.teamId],
    );
    const pb = m.rows[0].n + 1;
    const r = await khach.query(
      `INSERT INTO bo_luat_chung
         (team_id, phien_ban, noi_dung, dang_dung, nguon, nguoi_sua, ghi_chu, sua_luc)
       VALUES ($1, $2, $3, false, $4, $5, $6, now())
       RETURNING *`,
      [ctx.teamId, pb, noiDung, nguon, tacNhanCua(ctx), ghiChu],
    );
    await ghiNhatKy(khach, {
      teamId: ctx.teamId,
      tacNhan: tacNhanCua(ctx),
      nguoiDungId: ctx.nguoiDungId,
      hanhDong: HANH_DONG.TAO_BAN,
      doiTuong: "bo_luat_chung",
      doiTuongId: String(r.rows[0].id),
      sau: { phien_ban: pb, nguon, so_ky_tu: noiDung.length },
      ghiChu,
    });
    await khach.query("COMMIT");
    return r.rows[0];
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

/** Đóng dấu DUYỆT lên một bản. Người duyệt phải KHÁC người soạn — bốn mắt cho một thay
 *  đổi chạm 51 page. Đây là chỗ duy nhất đặt `duyet_luc`. */
export async function duyetBoLuat(pool, ctx, { id, ghiChu = "" } = {}) {
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    await batBuocVai(khach, ctx, VAI_SUA_BO_LUAT, "duyệt bộ luật chung");
    const b = await khach.query(
      "SELECT * FROM bo_luat_chung WHERE id = $1 AND team_id = $2 FOR UPDATE",
      [id, ctx.teamId],
    );
    if (!b.rowCount) {
      throw new Error(`không có bản bộ luật id=${id} trong team này.`);
    }
    const ban = b.rows[0];
    if (ban.duyet_luc) throw new Error(`bản v${ban.phien_ban} đã duyệt rồi.`);
    if (ban.nguoi_sua === tacNhanCua(ctx)) {
      throw new LoiXuyenTeam(
        `người soạn không tự duyệt bản của mình được (v${ban.phien_ban}) — thay đổi này ` +
          `chạm mọi page đang bật bot của team, nên nó cần BỐN MẮT.`,
      );
    }
    const r = await khach.query(
      `UPDATE bo_luat_chung SET duyet_boi = $1, duyet_luc = now()
        WHERE id = $2 RETURNING *`,
      [tacNhanCua(ctx), id],
    );
    await ghiNhatKy(khach, {
      teamId: ctx.teamId,
      tacNhan: tacNhanCua(ctx),
      nguoiDungId: ctx.nguoiDungId,
      hanhDong: HANH_DONG.DUYET,
      doiTuong: "bo_luat_chung",
      doiTuongId: String(id),
      truoc: { duyet_luc: null },
      sau: { phien_ban: ban.phien_ban, duyet_boi: tacNhanCua(ctx) },
      ghiChu,
    });
    await khach.query("COMMIT");
    return r.rows[0];
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

/**
 * ÁP một phiên bản — và LÙI cũng là hàm này. Áp được bản nào thì lùi được về bản đó.
 *
 * MỘT GIAO DỊCH. Bản cũ hạ và bản mới dựng cùng nhau, hoặc không gì cả. Bản của người B
 * làm việc này bằng hai lời gọi rời và tự khai «KHÔNG có giao dịch» — hạ xong mà dựng hỏng
 * thì team không còn bản nào đang áp và prompt rơi về bản toàn hệ, tức 51 page đổi cách
 * nói mà không ai bấm nút nào.
 *
 * Chỉ mục `bo_luat_chung_mot_ban_dang_ap` (009) là cái rào thứ hai: kể cả có ai ghi thẳng
 * qua đường khác thì trạng thái «hai bản cùng đang áp» cũng KHÔNG tồn tại được.
 */
export async function apBoLuat(pool, ctx, { id, lyDo = "" } = {}) {
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    await batBuocVai(khach, ctx, VAI_SUA_BO_LUAT, "áp bộ luật chung");
    await khach.query("SELECT pg_advisory_xact_lock($1, $2)", [
      910_009,
      Number(ctx.teamId),
    ]);
    const b = await khach.query(
      "SELECT * FROM bo_luat_chung WHERE id = $1 AND team_id = $2 FOR UPDATE",
      [id, ctx.teamId],
    );
    if (!b.rowCount) {
      // Bản TOÀN HỆ (`team_id IS NULL`) cũng rơi vào đây — cố ý. Nó là bản KẾ THỪA, màn
      // của team không áp nó được; muốn khác thì soạn bản riêng.
      throw new Error(
        `không có bản bộ luật id=${id} trong team này (bản toàn hệ không áp từ đây được).`,
      );
    }
    const ban = b.rows[0];
    if (ban.dang_dung) throw new Error(`bản v${ban.phien_ban} đang áp rồi.`);
    // 01-QUYET-DINH §9: đề xuất của AI thì PHẢI có người duyệt mới áp. Bản người viết thì
    // áp thẳng — hai đường khác nhau, và đây là chỗ chúng tách.
    if (ban.nguon === "ai" && !ban.duyet_luc) {
      throw new Error(
        `bản v${ban.phien_ban} là ĐỀ XUẤT CỦA AI và chưa ai duyệt — 01-QUYET-DINH §9 đòi ` +
          `người duyệt trước khi áp.`,
      );
    }

    const cu = await khach.query(
      "SELECT id, phien_ban FROM bo_luat_chung WHERE team_id = $1 AND dang_dung",
      [ctx.teamId],
    );
    // Hạ TRƯỚC, dựng SAU — cùng thứ tự với bản của B, để chỉ mục một-bản-đang-áp không bị
    // vi phạm ở giữa giao dịch (Postgres kiểm chỉ mục theo từng câu lệnh, không đợi COMMIT).
    if (cu.rowCount) {
      await khach.query(
        "UPDATE bo_luat_chung SET dang_dung = false WHERE team_id = $1 AND dang_dung",
        [ctx.teamId],
      );
    }
    const r = await khach.query(
      "UPDATE bo_luat_chung SET dang_dung = true, sua_luc = now() WHERE id = $1 RETURNING *",
      [id],
    );

    const banCu = cu.rows[0] ?? null;
    const laLui = banCu ? Number(ban.phien_ban) < Number(banCu.phien_ban) : false;
    const ah = await khach.query(
      `SELECT count(*)::int tong, count(*) FILTER (WHERE bot_ai_bat)::int dang_bat
         FROM page WHERE team_id = $1`,
      [ctx.teamId],
    );
    const anhHuong = {
      soPage: ah.rows[0].tong,
      soPageDangBatBot: ah.rows[0].dang_bat,
    };

    await ghiNhatKy(khach, {
      teamId: ctx.teamId,
      tacNhan: tacNhanCua(ctx),
      nguoiDungId: ctx.nguoiDungId,
      hanhDong: HANH_DONG.AP,
      doiTuong: "bo_luat_chung",
      doiTuongId: String(id),
      truoc: banCu ? { phien_ban: banCu.phien_ban } : null,
      sau: { phien_ban: ban.phien_ban, la_lui: laLui, anh_huong: anhHuong },
      ghiChu: lyDo,
    });
    await khach.query("COMMIT");
    return { ban: r.rows[0], banCu, laLui, anhHuong };
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// KỸ NĂNG — sửa (đẩy bản cũ vào lịch sử) · lùi
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Sửa một kỹ năng. Bản CŨ được chụp vào `ky_nang_lich_su` TRƯỚC khi ghi đè, nên lùi được.
 *
 * Bảng `ky_nang` vẫn đúng MỘT dòng mỗi (team, ma) — cố ý, để màn «Thư viện kỹ năng» của
 * người B không phải đổi hình. Lịch sử nằm ở bảng riêng.
 */
export async function suaKyNang(
  pool,
  ctx,
  { ma, ten, noiDung, batChoNhomSp, bat, ghiChu = "", nguon = "nguoi" } = {},
) {
  if (!ma) throw new Error("suaKyNang: thiếu `ma`.");
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    await batBuocVai(khach, ctx, VAI_SUA_KY_NANG, "sửa kỹ năng");
    const cu = await khach.query(
      "SELECT * FROM ky_nang WHERE team_id = $1 AND ma = $2 FOR UPDATE",
      [ctx.teamId, ma],
    );
    if (!cu.rowCount) throw new Error(`không có kỹ năng ma='${ma}' trong team này.`);
    const k = cu.rows[0];

    // Chụp bản cũ. `ON CONFLICT DO NOTHING` để lượt sửa lặp không đẻ hai ảnh cùng số.
    await khach.query(
      `INSERT INTO ky_nang_lich_su
         (team_id, ma, phien_ban, ten, noi_dung, bat_cho_nhom_sp, bat, nguon,
          nguoi_sua, ghi_chu, duyet_boi, duyet_luc)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (team_id, ma, phien_ban) DO NOTHING`,
      [
        ctx.teamId, ma, k.phien_ban, k.ten, k.noi_dung, k.bat_cho_nhom_sp, k.bat,
        k.nguon, k.nguoi_sua, k.ghi_chu, k.duyet_boi, k.duyet_luc,
      ],
    );

    const moi = {
      ten: ten ?? k.ten,
      noi_dung: noiDung ?? k.noi_dung,
      bat_cho_nhom_sp: batChoNhomSp ?? k.bat_cho_nhom_sp,
      bat: bat ?? k.bat,
    };
    const r = await khach.query(
      `UPDATE ky_nang
          SET ten = $1, noi_dung = $2, bat_cho_nhom_sp = $3, bat = $4,
              phien_ban = phien_ban + 1, nguon = $5, nguoi_sua = $6, ghi_chu = $7,
              duyet_boi = NULL, duyet_luc = NULL, sua_luc = now()
        WHERE id = $8 RETURNING *`,
      [
        moi.ten, moi.noi_dung, moi.bat_cho_nhom_sp, moi.bat,
        nguon, tacNhanCua(ctx), ghiChu, k.id,
      ],
    );
    await ghiNhatKy(khach, {
      teamId: ctx.teamId,
      tacNhan: tacNhanCua(ctx),
      nguoiDungId: ctx.nguoiDungId,
      hanhDong: HANH_DONG.KY_NANG_SUA,
      doiTuong: "ky_nang",
      doiTuongId: String(k.id),
      truoc: { phien_ban: k.phien_ban, bat: k.bat, pham_vi: k.bat_cho_nhom_sp },
      sau: {
        phien_ban: k.phien_ban + 1,
        bat: moi.bat,
        pham_vi: moi.bat_cho_nhom_sp,
      },
      ghiChu,
    });
    await khach.query("COMMIT");
    return r.rows[0];
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

/** Lùi một kỹ năng về phiên bản cũ. Bản đang dùng được chụp vào lịch sử trước khi bị đè,
 *  nên lùi rồi vẫn tiến lại được — lùi KHÔNG phải là xoá. */
export async function luiKyNang(pool, ctx, { ma, phienBan, lyDo = "" } = {}) {
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    await batBuocVai(khach, ctx, VAI_SUA_KY_NANG, "lùi kỹ năng");
    const cu = await khach.query(
      "SELECT * FROM ky_nang WHERE team_id = $1 AND ma = $2 FOR UPDATE",
      [ctx.teamId, ma],
    );
    if (!cu.rowCount) throw new Error(`không có kỹ năng ma='${ma}'.`);
    const k = cu.rows[0];
    const ls = await khach.query(
      "SELECT * FROM ky_nang_lich_su WHERE team_id = $1 AND ma = $2 AND phien_ban = $3",
      [ctx.teamId, ma, phienBan],
    );
    if (!ls.rowCount) {
      throw new Error(`không có bản v${phienBan} của kỹ năng '${ma}' trong lịch sử.`);
    }
    const b = ls.rows[0];

    await khach.query(
      `INSERT INTO ky_nang_lich_su
         (team_id, ma, phien_ban, ten, noi_dung, bat_cho_nhom_sp, bat, nguon,
          nguoi_sua, ghi_chu, duyet_boi, duyet_luc)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (team_id, ma, phien_ban) DO NOTHING`,
      [
        ctx.teamId, ma, k.phien_ban, k.ten, k.noi_dung, k.bat_cho_nhom_sp, k.bat,
        k.nguon, k.nguoi_sua, k.ghi_chu, k.duyet_boi, k.duyet_luc,
      ],
    );
    const r = await khach.query(
      `UPDATE ky_nang
          SET ten = $1, noi_dung = $2, bat_cho_nhom_sp = $3, bat = $4,
              phien_ban = phien_ban + 1, nguoi_sua = $5, ghi_chu = $6, sua_luc = now()
        WHERE id = $7 RETURNING *`,
      [
        b.ten, b.noi_dung, b.bat_cho_nhom_sp, b.bat, tacNhanCua(ctx),
        `lùi về v${phienBan}${lyDo ? ` — ${lyDo}` : ""}`, k.id,
      ],
    );
    await ghiNhatKy(khach, {
      teamId: ctx.teamId,
      tacNhan: tacNhanCua(ctx),
      nguoiDungId: ctx.nguoiDungId,
      hanhDong: HANH_DONG.KY_NANG_LUI,
      doiTuong: "ky_nang",
      doiTuongId: String(k.id),
      truoc: { phien_ban: k.phien_ban },
      sau: { phien_ban: k.phien_ban + 1, lay_tu_ban: phienBan },
      ghiChu: lyDo,
    });
    await khach.query("COMMIT");
    return r.rows[0];
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

/** Lịch sử một kỹ năng, mới nhất trước. Bản ĐANG DÙNG đứng đầu và được đánh dấu. */
export async function lichSuKyNang(pool, ctx, { ma } = {}) {
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_SUA_KY_NANG, "xem lịch sử kỹ năng");
    const nay = await khach.query(
      "SELECT * FROM ky_nang WHERE team_id = $1 AND ma = $2",
      [ctx.teamId, ma],
    );
    if (!nay.rowCount) throw new Error(`không có kỹ năng ma='${ma}'.`);
    const cu = await khach.query(
      `SELECT * FROM ky_nang_lich_su WHERE team_id = $1 AND ma = $2
        ORDER BY phien_ban DESC`,
      [ctx.teamId, ma],
    );
    return [
      { ...nay.rows[0], dangDung: true },
      ...cu.rows.map((r) => ({ ...r, dangDung: false })),
    ];
  } finally {
    khach.release();
  }
}
