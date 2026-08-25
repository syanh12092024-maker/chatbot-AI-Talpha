// API SỐ LIỆU (G2-A6) — báo cáo hai luồng · chi phí AI · A/B kịch bản · sức khỏe 9 chỉ số.
//
// ═══ LUẬT XUYÊN SUỐT FILE NÀY: SỐ 0 PHẢI NÓI VÌ SAO NÓ LÀ 0 ══════════════════════
// Bài học 3 của giai đoạn 2, trả giá thật: «Không có việc nào đang chờ» đọc như tin mừng,
// trong khi sự thật là chưa gán page — người ta ngồi chờ một hệ thống không bao giờ có việc.
//
// Ở một API số liệu, cái bẫy đó gấp đôi: một báo cáo toàn số 0 trông y hệt «hệ chạy êm».
// Nên MỌI hàm ở đây trả về kèm `boiCanh` khai:
//   · `coDuLieu`  — khoảng đo này có dòng nào không
//   · `viSaoRong` — nếu không, THIẾU CÁI GÌ (chưa gán page? chưa có Sổ AI? chưa có đơn?)
// Đọc `soDon: 0` mà không đọc `viSaoRong` là đọc sai, và đó là lỗi của người đọc — nhưng
// KHÔNG in `viSaoRong` ra thì là lỗi của file này.
//
// ═══ TRA NGƯỢC ĐƯỢC ══════════════════════════════════════════════════════════════
// Nghiệm thu sóng 3: «Mọi con số tra ngược được về đúng những dòng Sổ AI đẻ ra nó». Nên mỗi
// khối số kèm `nguon` — tên bảng + vế lọc đã dùng — để người đọc chạy lại được bằng tay.
import { batBuocVai } from "./noi-dung.js";
import { docKichBanChoPage } from "./kich-ban.js";
import { demMoCoi } from "./chuyen-team.js";

/** Vai xem được số liệu. Sale KHÔNG có — 01 §10: màn sale chỉ là bảng điều phối. */
export const VAI_XEM_SO_LIEU = Object.freeze(["quan-tri", "quan-ly", "marketer"]);

/** Dưới ngần này lượt thì KHÔNG được kết luận A/B. Con số là quy ước, và nó được KHAI ra
 *  trong chính kết quả trả về để người đọc biết ngưỡng đang là bao nhiêu. */
export const TOI_THIEU_DE_KET_LUAN = 30;

const khoang = ({ tu, den } = {}) => ({
  tu: tu ? new Date(tu) : new Date(Date.now() - 7 * 864e5),
  den: den ? new Date(den) : new Date(),
});

// ═══════════════════════════════════════════════════════════════════════════════════
// ① BÁO CÁO — TÁCH HAI LUỒNG ĐƠN
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * 01-QUYET-DINH §1: hai luồng đơn TÁCH HẲN nhau và **đo bằng hai thước khác nhau**. Gộp
 * chúng vào một con số «tổng đơn» là câu trả lời sai cho mọi câu hỏi tiếp theo.
 *
 * Nên hàm này KHÔNG trả về một tổng. Nó trả hai khối, và một dòng nói rõ vì sao không cộng.
 */
export async function baoCaoHaiLuong(pool, ctx, tuyChon = {}) {
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_XEM_SO_LIEU, "xem báo cáo");
    const { tu, den } = khoang(tuyChon);
    const r = await khach.query(
      `SELECT nguon,
              count(*)::int                                     AS so_don,
              count(*) FILTER (WHERE tong_tien IS NOT NULL)::int AS co_tien,
              coalesce(sum(tong_tien), 0)                        AS tong_tien
         FROM don_hang
        WHERE team_id = $1 AND tao_luc >= $2 AND tao_luc < $3
        GROUP BY nguon`,
      [ctx.teamId, tu, den],
    );
    const lay = (n) => r.rows.find((x) => x.nguon === n) ?? null;
    const khoi = (n) => {
      const d = lay(n);
      return {
        soDon: d ? d.so_don : 0,
        soDonCoTien: d ? d.co_tien : 0,
        tongTien: d ? Number(d.tong_tien) : 0,
        // Cột `tong_tien` cố ý để NULL ở nhiều đường (nợ N4) — nói ra, đừng để người đọc
        // tưởng «tổng tiền 0» nghĩa là bán không ra tiền.
        canhBao:
          d && d.so_don > d.co_tien
            ? `${d.so_don - d.co_tien}/${d.so_don} đơn CHƯA có tong_tien — tổng tiền dưới đây là của phần CÓ tiền thôi`
            : null,
      };
    };
    const tong = r.rows.reduce((a, x) => a + x.so_don, 0);
    return {
      khoang: { tu, den },
      trangBanHang: khoi("trang_ban_hang"),
      messenger: khoi("messenger"),
      viSaoKhongCong:
        "01-QUYET-DINH §1 — hai luồng đo bằng HAI THƯỚC khác nhau (trang bán hàng có đơn " +
        "trước rồi mới hỏi; Messenger thì chốt trong hội thoại). Cộng lại là trả lời sai " +
        "mọi câu hỏi sau đó.",
      boiCanh: await boiCanhRong(khach, ctx.teamId, tong, "don_hang", { tu, den }),
      nguon: "don_hang WHERE team_id=? AND tao_luc IN [tu, den) GROUP BY nguon",
    };
  } finally {
    khach.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// ② CHI PHÍ AI THEO PAGE — tìm page ĐỐT TIỀN MÀ KHÔNG RA ĐƠN
// ═══════════════════════════════════════════════════════════════════════════════════

export async function chiPhiAiTheoPage(pool, ctx, tuyChon = {}) {
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_XEM_SO_LIEU, "xem chi phí AI");
    const { tu, den } = khoang(tuyChon);
    // `so_ai.page_id` là id FACEBOOK (text), không phải khoá ngoại — nối bằng `page.page_id`.
    // Nối nhầm sang `page.id` thì câu vẫn chạy và trả về RỖNG, không báo lỗi (án lệ đã nêu
    // ở ⑤#5 của PHIEU-B-Y3). Ghi ra đây để người sau không sửa nhầm.
    const r = await khach.query(
      `SELECT p.page_id, p.ten, p.bot_ai_bat, p.marketer,
              count(a.id)::int                       AS so_luot,
              coalesce(sum(a.tien_vnd), 0)           AS tien_vnd,
              count(a.tien_vnd)::int                 AS luot_co_tien,
              coalesce(sum(a.token_vao + a.token_ra), 0) AS token,
              (SELECT count(*) FROM don_hang d
                WHERE d.team_id = p.team_id AND d.page_id = p.id
                  AND d.tao_luc >= $2 AND d.tao_luc < $3)::int AS so_don
         FROM page p
         LEFT JOIN so_ai a
                ON a.team_id = p.team_id AND a.page_id = p.page_id
               AND a.xay_ra_luc >= $2 AND a.xay_ra_luc < $3
        WHERE p.team_id = $1
        GROUP BY p.id, p.page_id, p.ten, p.bot_ai_bat, p.marketer
        ORDER BY coalesce(sum(a.tien_vnd), 0) DESC, count(a.id) DESC`,
      [ctx.teamId, tu, den],
    );
    const ds = r.rows.map((x) => ({
      pageId: x.page_id,
      ten: x.ten,
      batBot: x.bot_ai_bat,
      marketer: x.marketer || null,
      soLuot: x.so_luot,
      soDon: x.so_don,
      tienVnd: Number(x.tien_vnd),
      token: Number(x.token),
      // Cảnh báo CHỈ khi thật sự có tiêu mà không ra đơn — chứ không phải mọi page 0 đơn.
      dotTienKhongRaDon: x.so_luot > 0 && x.so_don === 0,
      // Tiền chỉ đúng khi MỌI lượt đều có `tien_vnd`. Thiếu thì nói ra, đừng cộng ngầm.
      tienDayDu: x.so_luot === 0 || x.luot_co_tien === x.so_luot,
    }));
    const tongLuot = ds.reduce((a, x) => a + x.soLuot, 0);
    const thieuTien = ds.filter((x) => x.soLuot > 0 && !x.tienDayDu).length;
    return {
      khoang: { tu, den },
      dsPage: ds,
      tongTienVnd: ds.reduce((a, x) => a + x.tienVnd, 0),
      soPageDotTienKhongRaDon: ds.filter((x) => x.dotTienKhongRaDon).length,
      canhBao: thieuTien
        ? `${thieuTien} page có lượt gọi mà THIẾU tien_vnd — tổng tiền là cận DƯỚI, không phải số thật. ` +
          `Lớp model phải đẩy tienVnd qua phễu datPheuSoAi (hợp đồng B mục 2).`
        : null,
      boiCanh: await boiCanhRong(khach, ctx.teamId, tongLuot, "so_ai", { tu, den }),
      nguon: "page LEFT JOIN so_ai ON so_ai.page_id = page.page_id (id FACEBOOK, không phải page.id)",
    };
  } finally {
    khach.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// ③ A/B KỊCH BẢN — CHƯA ĐỦ MẪU THÌ NÓI CHƯA KẾT LUẬN
// ═══════════════════════════════════════════════════════════════════════════════════

/**
 * Nghiệm thu sóng 3: «A/B chưa đủ mẫu → hiện "chưa kết luận", CẤM hiện tỉ lệ trông như đã
 * kết luận». Nên hàm này **không trả về `tiLe` khi chưa đủ mẫu** — trả `null`, kèm còn
 * thiếu bao nhiêu lượt. Trả tỉ lệ rồi dặn màn hình «nhớ ẩn đi» là mời người ta quên.
 */
export async function hieuQuaKichBan(pool, ctx, tuyChon = {}) {
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_XEM_SO_LIEU, "xem hiệu quả kịch bản");
    const { tu, den } = khoang(tuyChon);
    const r = await khach.query(
      `SELECT a.ban_kich_ban                                       AS ban,
              count(*)::int                                        AS so_luot,
              count(DISTINCT a.psid)::int                          AS so_khach,
              count(*) FILTER (WHERE a.loai = 'order')::int         AS so_chot
         FROM so_ai a
        WHERE a.team_id = $1 AND a.xay_ra_luc >= $2 AND a.xay_ra_luc < $3
          AND a.ban_kich_ban IS NOT NULL
        GROUP BY a.ban_kich_ban
        ORDER BY a.ban_kich_ban`,
      [ctx.teamId, tu, den],
    );
    const ban = r.rows.map((x) => {
      const duMau = x.so_khach >= TOI_THIEU_DE_KET_LUAN;
      return {
        ban: x.ban,
        soLuot: x.so_luot,
        soKhach: x.so_khach,
        soChot: x.so_chot,
        // ⛔ `tiLeChot` là `null` khi CHƯA đủ mẫu. Không trả số rồi trông chờ màn hình ẩn.
        tiLeChot: duMau ? x.so_chot / x.so_khach : null,
        duMau,
        conThieu: duMau ? 0 : TOI_THIEU_DE_KET_LUAN - x.so_khach,
        ketLuan: duMau
          ? null
          : `CHƯA KẾT LUẬN — mới ${x.so_khach}/${TOI_THIEU_DE_KET_LUAN} khách, còn thiếu ` +
            `${TOI_THIEU_DE_KET_LUAN - x.so_khach}`,
      };
    });
    const tong = ban.reduce((a, x) => a + x.soLuot, 0);
    return {
      khoang: { tu, den },
      nguong: TOI_THIEU_DE_KET_LUAN,
      dsBan: ban,
      soSanhDuoc: ban.length >= 2 && ban.every((x) => x.duMau),
      ketLuanChung:
        ban.length < 2
          ? `chưa có hai bản để so (mới ${ban.length} bản có dữ liệu)`
          : ban.every((x) => x.duMau)
            ? null
            : "CHƯA KẾT LUẬN — ít nhất một bản chưa đủ mẫu",
      boiCanh: await boiCanhRong(khach, ctx.teamId, tong, "so_ai.ban_kich_ban", { tu, den }),
      nguon: "so_ai WHERE ban_kich_ban IS NOT NULL GROUP BY ban_kich_ban",
    };
  } finally {
    khach.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════
// ④ SỨC KHOẺ — CHÍN ĐÈN
// ═══════════════════════════════════════════════════════════════════════════════════

/** Chín chỉ số. Tài liệu chỉ ghi «đèn 9 chỉ số» chứ KHÔNG liệt kê, nên danh sách này là
 *  tự quyết (ghi §9) — và mỗi cái được chọn vì nó neo vào một SỰ CỐ THẬT hoặc một con số
 *  thật đã đo được của dự án này, không phải một chỉ số nghe hay. */
export const CHIN_CHI_SO = Object.freeze([
  "llm_account",        // sự cố 23/08: tài khoản AI hết tiền, bot im ba tiếng
  "hang_doi_tin",       // tin kẹt ở `cho`/`dang_xu`
  "viec_qua_han",       // `viec_can_xu_ly` quá hạn 10 phút mà chưa ai nhận
  "don_ket_cho_gui_wa", // RF-14: đơn kẹt vĩnh viễn ở `cho_gui_wa`
  "hang_cho_duyet",     // `hang_cho_tao_don` chờ duyệt dồn lại
  "page_mat_dau",       // `page.mat_dau` — token page chết
  "page_thieu_marketer",// 514/514 đo 25/08 — báo cáo cắt theo marketer sẽ trống
  "page_thieu_kich_ban",// dùng CHÍNH bộ giải ba tầng của G2-A5
  "du_lieu_mo_coi",     // dùng CHÍNH `demMoCoi()` của B-Y3
]);

export async function sucKhoeHeThong(pool, ctx, { phutIm = 30 } = {}) {
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_XEM_SO_LIEU, "xem sức khỏe hệ thống");
    const den = [];
    const dat = (ma, mau, so, chu) => den.push({ ma, mau, so, chu });

    // ① llm_account — sự cố 23/08. Điểm tinh tế: «0 lượt trả lời» có HAI nghĩa hoàn toàn
    // khác nhau, và gộp chúng là dựng một cái đèn đỏ vĩnh viễn mà rồi ai cũng bỏ qua.
    const ai = await khach.query(
      `SELECT count(*)::int tong, max(xay_ra_luc) cuoi
         FROM so_ai WHERE team_id = $1 AND loai = 'reply'`,
      [ctx.teamId],
    );
    if (!ai.rows[0].tong) {
      dat("llm_account", "xam", null,
        "CHƯA CÓ DỮ LIỆU — Sổ AI chưa có lượt trả lời nào cho team này. Đây là «chưa cài " +
        "đặt xong», KHÔNG phải «bot đang chết».");
    } else {
      const phut = Math.floor((Date.now() - new Date(ai.rows[0].cuoi).getTime()) / 60000);
      dat("llm_account", phut > phutIm ? "do" : "xanh", phut,
        phut > phutIm
          ? `bot IM ${phut} phút (ngưỡng ${phutIm}) — kiểm tài khoản AI còn tiền không, ` +
            `đúng cảnh 23/08`
          : `lượt trả lời gần nhất cách đây ${phut} phút`);
    }

    const dem = async (ma, sql, tham, nguong, chuDo, chuXanh) => {
      const r = await khach.query(sql, tham);
      const n = r.rows[0].c;
      dat(ma, n > nguong ? "do" : "xanh", n, n > nguong ? chuDo(n) : chuXanh(n));
    };

    await dem("hang_doi_tin",
      `SELECT count(*)::int c FROM tin_cho_xu_ly
        WHERE team_id=$1 AND trang_thai IN ('cho','dang_xu') AND thoi_diem < now() - interval '15 minutes'`,
      [ctx.teamId], 0,
      (n) => `${n} tin kẹt quá 15 phút`, () => "không tin nào kẹt");

    await dem("viec_qua_han",
      `SELECT count(*)::int c FROM viec_can_xu_ly
        WHERE team_id=$1 AND dong_luc IS NULL AND han_luc < now()`,
      [ctx.teamId], 0,
      (n) => `${n} việc QUÁ HẠN mà chưa đóng`, () => "không việc nào quá hạn");

    await dem("don_ket_cho_gui_wa",
      `SELECT count(*)::int c FROM don_hang WHERE team_id=$1 AND trang_thai_he='cho_gui_wa'`,
      [ctx.teamId], 0,
      (n) => `${n} đơn kẹt ở cho_gui_wa — RF-14, không job nào đọc trạng thái này`,
      () => "không đơn nào kẹt");

    await dem("hang_cho_duyet",
      `SELECT count(*)::int c FROM hang_cho_tao_don WHERE team_id=$1 AND trang_thai='cho_duyet'`,
      [ctx.teamId], 20,
      (n) => `${n} dòng chờ duyệt dồn lại`, (n) => `${n} dòng chờ duyệt`);

    await dem("page_mat_dau",
      "SELECT count(*)::int c FROM page WHERE team_id=$1 AND mat_dau",
      [ctx.teamId], 0,
      (n) => `${n} page MẤT DẤU (token chết)`, () => "không page nào mất dấu");

    await dem("page_thieu_marketer",
      "SELECT count(*)::int c FROM page WHERE team_id=$1 AND marketer = ''",
      [ctx.teamId], 0,
      (n) => `${n} page chưa gán marketer — báo cáo cắt theo marketer sẽ TRỐNG`,
      () => "mọi page đã có marketer");

    // ⑧ dùng CHÍNH bộ giải ba tầng — không viết lại luật kế thừa bằng SQL ở đây.
    const pages = await khach.query(
      "SELECT id FROM page WHERE team_id=$1 AND bot_ai_bat", [ctx.teamId],
    );
    let thieuKb = 0;
    for (const p of pages.rows) {
      const kq = await docKichBanChoPage(pool, ctx.teamId, p.id);
      if (!kq.ban) thieuKb += 1;
    }
    dat("page_thieu_kich_ban", thieuKb > 0 ? "do" : "xanh", thieuKb,
      thieuKb > 0
        ? `${thieuKb}/${pages.rowCount} page ĐANG BẬT BOT không có kịch bản nào (kể cả kế thừa)`
        : `cả ${pages.rowCount} page đang bật bot đều có kịch bản`);

    // ⑨ dùng CHÍNH `demMoCoi()` của B-Y3.
    const mc = await demMoCoi(pool);
    const soMoCoi = Object.values(mc.moCoi).reduce((a, b) => a + b, 0);
    dat("du_lieu_mo_coi", soMoCoi > 0 ? "do" : "xanh", soMoCoi,
      soMoCoi > 0
        ? `${soMoCoi} dòng con lệch team so với page của nó — có ai đổi team_id ngoài cửa`
        : "không dòng nào mồ côi");

    return {
      den,
      soDo: den.filter((d) => d.mau === "do").length,
      soXam: den.filter((d) => d.mau === "xam").length,
      // Số đèn XÁM đáng đọc ngang số đèn ĐỎ: xám = «chưa đo được», và một bảng toàn xám
      // nghĩa là hệ chưa cài xong chứ không phải hệ khoẻ.
      tomTat:
        den.filter((d) => d.mau === "do").length === 0 &&
        den.filter((d) => d.mau === "xam").length > 0
          ? "KHÔNG đèn đỏ, nhưng có đèn XÁM — chưa đủ dữ liệu để nói hệ khoẻ"
          : null,
    };
  } finally {
    khach.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════

/** Vì sao khoảng đo này rỗng? Ba lý do khác hẳn nhau, và cách sửa cũng khác hẳn nhau. */
async function boiCanhRong(khach, teamId, soDong, bang, { tu, den }) {
  if (soDong > 0) return { coDuLieu: true, viSaoRong: null };
  const p = await khach.query(
    "SELECT count(*)::int c FROM page WHERE team_id = $1", [teamId],
  );
  if (!p.rows[0].c) {
    return {
      coDuLieu: false,
      viSaoRong:
        "team này CHƯA CÓ PAGE NÀO — con số 0 ở trên là «chưa cài đặt xong», không phải " +
        "«không có gì xảy ra». Gán page cho team ở màn Cấu hình team (việc người H7).",
    };
  }
  return {
    coDuLieu: false,
    viSaoRong:
      `team có ${p.rows[0].c} page nhưng bảng \`${bang}\` không có dòng nào trong khoảng ` +
      `${tu.toISOString()} → ${den.toISOString()}. Kiểm: bot có đang bật không, và khoảng ` +
      `đo có đúng không.`,
  };
}
