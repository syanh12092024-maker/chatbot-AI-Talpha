// KỊCH BẢN BA TẦNG — sản phẩm → nước → page, có KẾ THỪA (G2-A5).
//
// ═══ LUẬT DUY NHẤT CỦA FILE NÀY ═══════════════════════════════════════════════════
// **Không bao giờ trả về im lặng.** Bộ giải luôn khai NGUỒN: bản này của chính page, hay
// kế thừa từ tầng nào, hay không có gì cả VÀ VÌ SAO không có. Sổ giao việc ghi thẳng:
// «Page không có bản riêng thì DÙNG bản tầng trên, và API phải nói rõ kế thừa từ tầng nào
// chứ không trả về im lặng. Marketer sửa nhầm tầng sản phẩm là đổi kịch bản của mọi page
// dưới nó.»
//
// Và bài học 3 của giai đoạn 2: màn rỗng phải phân biệt «xong hết rồi» với «chưa cài đặt
// xong». Ở đây nghĩa là: `null` kèm một câu `viSao` đọc được, không phải `null` trần.
//
// ═══ HÔM NAY HAI TẦNG TRÊN GẦN NHƯ KHÔNG TỚI ĐƯỢC — đo, không đoán ════════════════
// Đo 25/08 trên `aicloser_v3`: `san_pham` = 0 dòng · `page.thi_truong` = 140/514 ·
// `page.nganh_hang` = 0/514 · 444/514 page chưa có kịch bản riêng. Nghĩa là hầu hết page
// hôm nay rơi vào nhánh «không kế thừa được từ đâu». Đó là TRẠNG THÁI THẬT, không phải
// lỗi — và chính vì vậy `viSao` mới đáng giá: nó nói cho marketer biết thiếu KHOÁ nào.
import { ghiNhatKy } from "./nhat-ky.js";
import { batBuocVai } from "./noi-dung.js";

export const CAP = Object.freeze({
  SAN_PHAM: "san_pham",
  NUOC: "nuoc",
  PAGE: "page",
});

/** Thứ tự HẸP DẦN. Tầng đứng trước thắng. Khai một lần, cả bộ giải lẫn cây đều đọc nó. */
export const THU_TU_HEP_DAN = Object.freeze([CAP.PAGE, CAP.NUOC, CAP.SAN_PHAM]);

export const CHU_CAP = Object.freeze({
  page: "của chính page",
  nuoc: "kế thừa từ tầng NƯỚC",
  san_pham: "kế thừa từ tầng SẢN PHẨM",
});

/** Vai sửa được kịch bản. 01 §6: khối «Kịch bản page» do Marketer phụ trách. */
export const VAI_SUA_KICH_BAN = Object.freeze(["quan-tri", "marketer"]);

export const HANH_DONG_AP = "ap_kich_ban";

/** Cột `cap` (010) đã có chưa? Hỏi `information_schema` chứ không bắt lỗi `42703` giữa một
 *  giao dịch — một câu lỗi trong giao dịch làm hỏng cả giao dịch, không lui được nữa. */
let _coCap = null;
async function coCotCap(khach) {
  if (_coCap !== null) return _coCap;
  const r = await khach.query(
    `SELECT count(*)::int c FROM information_schema.columns
      WHERE table_schema='public' AND table_name='kich_ban' AND column_name='cap'`,
  );
  _coCap = r.rows[0].c > 0;
  return _coCap;
}

let _daKeu = false;
function keuThieuMigration() {
  if (_daKeu) return;
  _daKeu = true;
  console.warn(
    "[kich-ban] migration 010 chưa áp — cây ba tầng TẮT, chỉ tra bản riêng của page. " +
      "Kịch bản kế thừa sẽ KHÔNG tới được page nào. Chạy `npm run migrate`.",
  );
}

/** Khoá tầng của một page: mã sản phẩm nó bán, và thị trường của nó. */
async function khoaTangCuaPage(khach, teamId, pageRowId) {
  const p = await khach.query(
    "SELECT id, page_id, ten, thi_truong FROM page WHERE id = $1 AND team_id = $2",
    [pageRowId, teamId],
  );
  if (!p.rowCount) return null;
  const sp = await khach.query(
    "SELECT ma FROM san_pham WHERE team_id = $1 AND page_id = $2 ORDER BY ma",
    [teamId, pageRowId],
  );
  return {
    page: p.rows[0],
    thiTruong: (p.rows[0].thi_truong || "").trim(),
    maSp: sp.rows.map((r) => r.ma),
  };
}

/**
 * Kịch bản HIỆU LỰC của một page, và NÓ ĐẾN TỪ ĐÂU.
 *
 * @returns {Promise<{
 *   ban: object|null, cap: 'page'|'nuoc'|'san_pham'|null, keThua: boolean,
 *   tuDau: string, viSao: string|null, khoa: {thiTruong: string, maSp: string[]}
 * }>}
 *   `viSao` chỉ khác null khi KHÔNG có bản nào — và khi đó nó nói rõ THIẾU KHOÁ NÀO.
 */
export async function docKichBanChoPage(pool, teamId, pageRowId) {
  const khach = await pool.connect();
  try {
    return await giaiChoPage(khach, teamId, pageRowId);
  } finally {
    khach.release();
  }
}

/**
 * Ruột của bộ giải, chạy trên MỘT `khach` cho sẵn.
 *
 * ⚠️ Vì sao phải tách: `apKichBan` đếm «bản này chạm bao nhiêu page» NGAY TRONG giao dịch
 * đang ghi. Bản đầu tôi gọi `docKichBanChoPage(pool, …)` ở đó — tức mượn một kết nối KHÁC
 * từ pool, mà kết nối đó chưa thấy thay đổi chưa COMMIT, nên nó đếm trên ảnh CŨ và trả về
 * 0. Ca K9 bắt được. Mọi phép đếm bên trong giao dịch phải đi bằng chính client của giao
 * dịch đó.
 */
async function giaiChoPage(khach, teamId, pageRowId) {
  // ═══ LƯỚI MIGRATION (án lệ #7) ══════════════════════════════════════════════
  // Hàm này nằm trên ĐƯỜNG CHAT SỐNG (`rap-prompt.js#docKichBanLive` gọi nó). Deploy code
  // trước khi áp 010 thì cột `cap` chưa tồn tại, câu dưới ném `42703`, và MỌI lượt trả lời
  // khách chết. Đúng án lệ K2: «reader mới không bọc ⇒ deploy code trước migration = job
  // chết mỗi 3h trên MỌI dự án».
  //
  // Đường lui: hành xử như bộ đọc MỘT TẦNG cũ (chỉ bản riêng của page) và KÊU RA — mù thì
  // phải nói. Áp 010 xong là dòng cảnh báo biến mất.
  if (!(await coCotCap(khach))) {
    const cu = await khach.query(
      `SELECT * FROM kich_ban
        WHERE team_id = $1 AND page_id = $2 AND trang_thai = 'LIVE' LIMIT 1`,
      [teamId, pageRowId],
    );
    keuThieuMigration();
    return {
      ban: cu.rows[0] ?? null,
      cap: cu.rowCount ? CAP.PAGE : null,
      keThua: false,
      tuDau: cu.rowCount ? CHU_CAP.page : "không có bản nào",
      viSao: cu.rowCount
        ? null
        : "migration 010 CHƯA áp trên CSDL này — cây ba tầng chưa dùng được, mới chỉ tra " +
          "được bản riêng của page. Chạy `npm run migrate` rồi hỏi lại.",
      khoa: { thiTruong: "", maSp: [] },
    };
  }
  {
    const k = await khoaTangCuaPage(khach, teamId, pageRowId);
    if (!k) {
      return {
        ban: null, cap: null, keThua: false, tuDau: "không có page",
        viSao: `không có page id=${pageRowId} trong team ${teamId}.`,
        khoa: { thiTruong: "", maSp: [] },
      };
    }
    const khoa = { thiTruong: k.thiTruong, maSp: k.maSp };

    // ① tầng PAGE — hẹp nhất, thắng
    const riengPage = await khach.query(
      `SELECT * FROM kich_ban
        WHERE team_id = $1 AND cap = 'page' AND page_id = $2 AND trang_thai = 'LIVE'`,
      [teamId, pageRowId],
    );
    if (riengPage.rowCount) {
      return {
        ban: riengPage.rows[0], cap: CAP.PAGE, keThua: false,
        tuDau: CHU_CAP.page, viSao: null, khoa,
      };
    }

    // ② tầng NƯỚC — cần CẢ mã sản phẩm LẪN thị trường
    if (k.maSp.length && k.thiTruong) {
      const nuoc = await khach.query(
        `SELECT * FROM kich_ban
          WHERE team_id = $1 AND cap = 'nuoc' AND trang_thai = 'LIVE'
            AND san_pham_ma = ANY($2) AND thi_truong = $3
          ORDER BY san_pham_ma LIMIT 1`,
        [teamId, k.maSp, k.thiTruong],
      );
      if (nuoc.rowCount) {
        const b = nuoc.rows[0];
        return {
          ban: b, cap: CAP.NUOC, keThua: true,
          tuDau: `${CHU_CAP.nuoc} (${b.san_pham_ma} × ${b.thi_truong})`,
          viSao: null, khoa,
        };
      }
    }

    // ③ tầng SẢN PHẨM — rộng nhất
    if (k.maSp.length) {
      const sp = await khach.query(
        `SELECT * FROM kich_ban
          WHERE team_id = $1 AND cap = 'san_pham' AND trang_thai = 'LIVE'
            AND san_pham_ma = ANY($2)
          ORDER BY san_pham_ma LIMIT 1`,
        [teamId, k.maSp],
      );
      if (sp.rowCount) {
        const b = sp.rows[0];
        return {
          ban: b, cap: CAP.SAN_PHAM, keThua: true,
          tuDau: `${CHU_CAP.san_pham} (${b.san_pham_ma})`,
          viSao: null, khoa,
        };
      }
    }

    // ④ KHÔNG CÓ GÌ — và đây là chỗ phải nói cho ra nhẽ, không được trả `null` trần.
    // Ba lý do khác hẳn nhau, và cách sửa cũng khác hẳn nhau.
    const thieu = [];
    if (!k.maSp.length) {
      thieu.push(
        "page chưa gắn sản phẩm nào (`san_pham.page_id`) nên CẢ HAI tầng trên không tới được",
      );
    } else if (!k.thiTruong) {
      thieu.push(
        "page chưa khai `thi_truong` nên tầng NƯỚC không tới được; tầng SẢN PHẨM thì chưa có bản LIVE",
      );
    } else {
      thieu.push("không tầng nào có bản LIVE cho khoá của page này");
    }
    return {
      ban: null, cap: null, keThua: false, tuDau: "không có bản nào",
      viSao:
        `page "${k.page.page_id}" chưa có kịch bản riêng, và ${thieu[0]}. ` +
        `Khoá đang có: sản phẩm=[${k.maSp.join(", ") || "—"}] · nước="${k.thiTruong || "—"}".`,
      khoa,
    };
  }
}

/**
 * Cây kịch bản cho màn hình: MỌI page của team, mỗi page kèm nguồn hiệu lực.
 *
 * Hàm này cố ý trả về CẢ những page không có bản nào, kèm `viSao` — màn hình hiện «trống»
 * cho một page mà không nói vì sao là đúng cái bài học 3 cấm.
 */
export async function cayKichBan(pool, ctx) {
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_SUA_KICH_BAN, "xem cây kịch bản");
    const pages = await khach.query(
      "SELECT id, page_id, ten FROM page WHERE team_id = $1 ORDER BY page_id",
      [ctx.teamId],
    );
    const ra = [];
    const dem = { page: 0, nuoc: 0, san_pham: 0, khong_co: 0 };
    for (const p of pages.rows) {
      const kq = await giaiChoPage(khach, ctx.teamId, p.id);
      dem[kq.cap ?? "khong_co"] += 1;
      ra.push({
        pageId: p.page_id,
        ten: p.ten,
        cap: kq.cap,
        keThua: kq.keThua,
        tuDau: kq.tuDau,
        viSao: kq.viSao,
        phienBan: kq.ban ? Number(kq.ban.phien_ban) : null,
      });
    }
    return { dsPage: ra, dem };
  } finally {
    khach.release();
  }
}

/**
 * ÁP một bản kịch bản (áp và lùi CÙNG một hàm, như bộ luật chung).
 *
 * MỘT GIAO DỊCH: hạ bản LIVE cũ CÙNG PHẠM VI rồi dựng bản này. «Cùng phạm vi» nghĩa là
 * cùng tầng và cùng khoá — áp một bản tầng nước KHÔNG được hạ bản của page.
 *
 * Rào thứ hai nằm ở CSDL: ba chỉ mục `kich_ban_mot_live_*` (010) làm trạng thái «hai bản
 * LIVE cùng phạm vi» không tồn tại được, kể cả khi ai đó ghi thẳng.
 */
export async function apKichBan(pool, ctx, { id, lyDo = "" } = {}) {
  const khach = await pool.connect();
  try {
    await khach.query("BEGIN");
    await batBuocVai(khach, ctx, VAI_SUA_KICH_BAN, "áp kịch bản");
    const b = await khach.query(
      "SELECT * FROM kich_ban WHERE id = $1 AND team_id = $2 FOR UPDATE",
      [id, ctx.teamId],
    );
    if (!b.rowCount) throw new Error(`không có kịch bản id=${id} trong team này.`);
    const ban = b.rows[0];
    if (ban.trang_thai === "LIVE") {
      throw new Error(`bản v${ban.phien_ban} đang LIVE rồi.`);
    }

    // Hạ bản cũ CÙNG PHẠM VI. Vế WHERE phải khớp đúng tầng — sai một vế là áp bản tầng
    // nước xong page mất kịch bản riêng, mà không ai bấm nút nào.
    let haBanCu;
    if (ban.cap === CAP.PAGE) {
      haBanCu = await khach.query(
        `UPDATE kich_ban SET trang_thai = 'ARCHIVED'
          WHERE team_id = $1 AND cap = 'page' AND page_id = $2 AND trang_thai = 'LIVE'
          RETURNING id, phien_ban`,
        [ctx.teamId, ban.page_id],
      );
    } else if (ban.cap === CAP.NUOC) {
      haBanCu = await khach.query(
        `UPDATE kich_ban SET trang_thai = 'ARCHIVED'
          WHERE team_id = $1 AND cap = 'nuoc' AND san_pham_ma = $2 AND thi_truong = $3
            AND trang_thai = 'LIVE'
          RETURNING id, phien_ban`,
        [ctx.teamId, ban.san_pham_ma, ban.thi_truong],
      );
    } else {
      haBanCu = await khach.query(
        `UPDATE kich_ban SET trang_thai = 'ARCHIVED'
          WHERE team_id = $1 AND cap = 'san_pham' AND san_pham_ma = $2 AND trang_thai = 'LIVE'
          RETURNING id, phien_ban`,
        [ctx.teamId, ban.san_pham_ma],
      );
    }
    const r = await khach.query(
      "UPDATE kich_ban SET trang_thai = 'LIVE', sua_luc = now() WHERE id = $1 RETURNING *",
      [id],
    );

    // Bao nhiêu page ĐỔI CÁCH NÓI vì lượt này? Đếm bằng chính bộ giải, không đoán: một bản
    // tầng sản phẩm chỉ chạm những page KHÔNG có bản riêng và KHÔNG có bản tầng nước.
    const pages = await khach.query(
      "SELECT id FROM page WHERE team_id = $1",
      [ctx.teamId],
    );
    let soPageCham = 0;
    for (const p of pages.rows) {
      const kq = await giaiChoPage(khach, ctx.teamId, p.id);
      if (kq.ban && String(kq.ban.id) === String(id)) soPageCham += 1;
    }

    const banCu = haBanCu.rows[0] ?? null;
    const anhHuong = { soPageCham, capBan: ban.cap };
    await ghiNhatKy(khach, {
      teamId: ctx.teamId,
      tacNhan: `nguoi:${ctx.nguoiDungId}`,
      nguoiDungId: ctx.nguoiDungId,
      hanhDong: HANH_DONG_AP,
      doiTuong: "kich_ban",
      doiTuongId: String(id),
      truoc: banCu ? { phien_ban: banCu.phien_ban } : null,
      sau: { phien_ban: ban.phien_ban, cap: ban.cap, anh_huong: anhHuong },
      ghiChu: lyDo,
    });
    await khach.query("COMMIT");
    return { ban: r.rows[0], banCu, anhHuong };
  } catch (e) {
    await khach.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    khach.release();
  }
}

/**
 * «Sửa bản này thì bao nhiêu page đổi cách nói?» — hỏi TRƯỚC khi bấm.
 *
 * Đây là câu chặn của rủi ro ② trong đề bài: marketer sửa nhầm tầng sản phẩm là đổi kịch
 * bản của MỌI page dưới nó. Đếm bằng chính bộ giải, page-by-page.
 */
export async function xemAnhHuongKichBan(pool, ctx, { id } = {}) {
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_SUA_KICH_BAN, "xem ảnh hưởng kịch bản");
    const b = await khach.query(
      "SELECT * FROM kich_ban WHERE id = $1 AND team_id = $2",
      [id, ctx.teamId],
    );
    if (!b.rowCount) throw new Error(`không có kịch bản id=${id} trong team này.`);
    const ban = b.rows[0];
    const pages = await khach.query(
      "SELECT id, page_id, bot_ai_bat FROM page WHERE team_id = $1 ORDER BY page_id",
      [ctx.teamId],
    );
    const cham = [];
    for (const p of pages.rows) {
      const kq = await giaiChoPage(khach, ctx.teamId, p.id);
      // Bản ĐANG LIVE: đếm page nào đang DÙNG chính nó. Bản chưa LIVE: đếm page nào SẼ
      // dùng nó nếu áp — tức page đang lấy từ một tầng RỘNG HƠN, hoặc chưa có gì.
      const dangDung = kq.ban && String(kq.ban.id) === String(ban.id);
      const seDung =
        !dangDung &&
        ban.trang_thai !== "LIVE" &&
        seLayBanNay(ban, kq, p);
      if (dangDung || seDung) {
        cham.push({ pageId: p.page_id, batBot: p.bot_ai_bat, dangDung: !!dangDung });
      }
    }
    return {
      cap: ban.cap,
      trangThai: ban.trang_thai,
      soPageCham: cham.length,
      soPageDangBatBot: cham.filter((x) => x.batBot).length,
      dsPage: cham,
    };
  } finally {
    khach.release();
  }
}

/** Page này có chuyển sang dùng `ban` không, nếu `ban` được áp? Chỉ khi `ban` ở tầng HẸP
 *  HƠN (hoặc bằng) tầng page đang lấy — tầng rộng hơn thì không giành được. */
function seLayBanNay(ban, kq, page) {
  const hepHon = (a, b) =>
    THU_TU_HEP_DAN.indexOf(a) <= THU_TU_HEP_DAN.indexOf(b ?? CAP.SAN_PHAM);
  if (ban.cap === CAP.PAGE) return String(ban.page_id) === String(page.id);
  if (!hepHon(ban.cap, kq.cap)) return false;
  if (ban.cap === CAP.NUOC) {
    return (
      kq.khoa.maSp.includes(ban.san_pham_ma) && kq.khoa.thiTruong === ban.thi_truong
    );
  }
  return kq.khoa.maSp.includes(ban.san_pham_ma);
}
