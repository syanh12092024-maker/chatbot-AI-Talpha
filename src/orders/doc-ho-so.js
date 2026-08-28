// A7-3 · CỬA ĐỌC HỒ SƠ KHÁCH — màn «Hồ sơ khách hàng» (sóng 4).
//
// ═══ TIÊU CHÍ NGHIỆM THU, NGUYÊN VĂN ═════════════════════════════════════════════
// «Một khách nhắn cả Messenger lẫn WhatsApp cùng số điện thoại → MỘT hồ sơ, không phải hai.»
//
// Hôm nay chỉ kiểm được MỘT NỬA câu đó, và file này nói thẳng nửa nào:
//   · Messenger  — CÓ (`hoi_thoai`, nối qua `khach_id` từ A7-2)
//   · Trang bán hàng — CÓ (`don_hang.nguon='trang_ban_hang'`)
//   · WhatsApp   — **CHƯA NỐI**. `don_hang.nguon` là `CHECK IN ('trang_ban_hang','messenger')`;
//     cửa WhatsApp (L1-M3) mới là khung + mock, và việc người H1 chưa xong.
// `kenhChuaNoi` trả về đích danh WhatsApp. Hiện một hồ sơ «đã gộp đủ ba kênh» trong khi
// kênh thứ ba chưa từng có dòng nào là nói dối theo chiều dễ chịu nhất — đúng cái bẫy mà
// bài học 3 của GD2 gọi tên.
//
// ═══ VÌ SAO KHÔNG CÓ HÀM «GỘP» Ở ĐÂY ═════════════════════════════════════════════
// Việc gộp đã xảy ra ở tầng GHI: khoá `(team, nước, sđt)` của migration 013, cửa POS
// (`doc-don.js`) và cửa Messenger (`chat/ho-so-khach.js`) cùng dùng một `khoaKhach`. File
// này chỉ ĐỌC cái đã gộp. Viết một phép gộp thứ hai ở đường đọc là đẻ bản khai thứ hai của
// cùng một luật — và hai bản luôn trôi khỏi nhau (án lệ #3).
//
// ═══ TỈ LỆ HOÀN: ĐỌC, KHÔNG TỰ TÍNH, VÀ KHÔNG CHẶN ═══════════════════════════════
// `khach.ti_le_hoan`/`tang_hoan` do job đêm `src/orders/ti-le-hoan.js` chấm. File này chỉ
// đọc lại và kèm `cham_hoan_luc` để người xem biết số đó CŨ tới đâu — một tỉ lệ hoàn không
// kèm ngày chấm là một con số không kiểm được. Và KHÔNG có nhánh chặn nào: 01 §11 «chặn
// cứng khách hoàn cao» vẫn đang **Chờ chốt**.
// ═══ VÌ SAO FILE NÀY Ở `src/orders/` CHỨ KHÔNG PHẢI `src/db/` ════════════════════
// Viết lần đầu ở `src/db/` cho gần `so-lieu.js`, rồi đo ra VÒNG THẬT: nó cần
// `chuanHoaSdt` (để «+966 50 123 4567» và «0501234567» tra ra cùng một người), mà
// `loc-trung.js` lại `import … from "../db/index.js"` ⇒ `db/index → db/ho-so-khach →
// orders/loc-trung → db/index`. Bản đầu tôi né bằng `await import()` trong thân hàm —
// nhưng import động KHÔNG bỏ phụ thuộc, nó chỉ giấu phụ thuộc khỏi người đọc và khỏi
// mọi công cụ dò vòng. Chỗ đúng là `src/orders/`: cùng tầng `loc-trung.js`/`ti-le-hoan.js`
// (bảng `khach` vốn đã là đất của `ti-le-hoan.js`), và chỉ nhập XUÔI xuống `src/db`.
import { batBuocVai } from "../db/noi-dung.js";
import { chuanHoaSdt } from "./loc-trung.js";

/** Vai xem được hồ sơ khách. Sale CÓ — khác `VAI_XEM_SO_LIEU` — vì sale cần biết mình
 *  đang nói chuyện với ai (01 §10: màn sale là bảng điều phối, và đây là dữ liệu của
 *  từng khách chứ không phải số liệu tổng). */
export const VAI_XEM_HO_SO = Object.freeze([
  "quan-tri",
  "quan-ly",
  "marketer",
  "sale",
]);

/** Kênh có thật hôm nay, và kênh CHƯA nối. Một tập, cấm gõ lại lần hai. */
export const KENH_CO_THAT = Object.freeze(["messenger", "trang_ban_hang"]);
export const KENH_CHUA_NOI = Object.freeze([
  {
    ma: "whatsapp",
    viSao:
      "`don_hang.nguon` là CHECK IN ('trang_ban_hang','messenger') — chưa có giá trị " +
      "whatsapp. Cửa L1-M3 mới là khung + mock, và việc người H1 (hồ sơ WhatsApp API " +
      "trong Pancake) chưa xong.",
  },
]);

/** Trần một trang danh sách. Chạm trần thì NÓI RA, không cắt im lặng. */
export const MOI_TRANG_MAC_DINH = 50;
export const MOI_TRANG_TOI_DA = 200;

/**
 * DANH SÁCH khách của team — cho màn danh sách, có tìm theo số và lọc theo nước/tầng hoàn.
 *
 * `sdt` nhận số THÔ: người dùng gõ `+966 50 123 4567` hay `0501234567` đều phải ra cùng
 * một người. Chuẩn hoá ở đây bằng CHÍNH `chuanHoaSdt` — không viết lại luật cắt tiền tố
 * trong SQL (`loc-trung.js` khai rõ: không có bản SQL song sinh).
 */
export async function timKhach(pool, ctx, tuyChon = {}) {
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_XEM_HO_SO, "xem hồ sơ khách");
    const {
      sdt = null,
      thiTruong = null,
      tangHoan = null,
      trang = 1,
      moiTrang = MOI_TRANG_MAC_DINH,
    } = tuyChon;

    const co = Math.min(Math.max(1, Number(moiTrang) || 1), MOI_TRANG_TOI_DA);
    const bo = (Math.max(1, Number(trang) || 1) - 1) * co;
    const sdtChuan = sdt ? chuanHoaSdt(sdt) : null;
    // Người gõ một chuỗi không có chữ số nào ⇒ KHÔNG được im lặng trả cả bảng.
    if (sdt && !sdtChuan)
      return {
        khach: [],
        tong: 0,
        trang: 1,
        moiTrang: co,
        boiCanh: {
          coDuLieu: false,
          viSaoRong: `"${sdt}" không chứa chữ số nào nên không phải một số điện thoại — chưa tra gì cả.`,
        },
      };

    const dk = ["k.team_id = $1"];
    const p = [ctx.teamId];
    if (sdtChuan) dk.push(`k.so_dien_thoai = $${p.push(sdtChuan)}`);
    if (thiTruong) dk.push(`k.thi_truong = $${p.push(thiTruong)}`);
    if (tangHoan) dk.push(`k.tang_hoan = $${p.push(tangHoan)}`);
    const where = dk.join(" AND ");

    const dem = await khach.query(
      `SELECT count(*)::int c FROM khach k WHERE ${where}`,
      p,
    );
    const r = await khach.query(
      `SELECT k.id, k.ten, k.so_dien_thoai, k.thi_truong, k.thanh_pho,
              k.ti_le_hoan, k.tang_hoan, k.so_don_ket, k.so_don_hoan, k.cham_hoan_luc,
              count(DISTINCT d.id)::int AS so_don,
              count(DISTINCT h.id)::int AS so_hoi_thoai
         FROM khach k
         LEFT JOIN don_hang  d ON d.khach_id = k.id AND d.team_id = k.team_id
         LEFT JOIN hoi_thoai h ON h.khach_id = k.id AND h.team_id = k.team_id
        WHERE ${where}
        GROUP BY k.id
        ORDER BY k.id
        LIMIT ${co} OFFSET ${bo}`,
      p,
    );

    return {
      khach: r.rows.map(gonKhach),
      tong: dem.rows[0].c,
      trang: Math.max(1, Number(trang) || 1),
      moiTrang: co,
      boiCanh: await boiCanhRong(khach, ctx.teamId, dem.rows[0].c, {
        sdt: sdtChuan,
        thiTruong,
        tangHoan,
      }),
    };
  } finally {
    khach.release();
  }
}

/**
 * MỘT hồ sơ — gộp những gì đã gộp được, và khai những gì CHƯA gộp được.
 * @returns `null` khi không có khách đó TRONG TEAM (không phân biệt «không tồn tại» với
 *          «của team khác» — phân biệt ra là rò rỉ sự tồn tại của dữ liệu team bạn).
 */
export async function docHoSoKhach(pool, ctx, { khachId } = {}) {
  if (khachId == null) throw new Error("docHoSoKhach: thiếu khachId.");
  const khach = await pool.connect();
  try {
    await batBuocVai(khach, ctx, VAI_XEM_HO_SO, "xem hồ sơ khách");

    const k = await khach.query(
      `SELECT id, ten, so_dien_thoai, thi_truong, dia_chi, thanh_pho,
              ti_le_hoan, tang_hoan, so_don_ket, so_don_hoan, cham_hoan_luc, tao_luc
         FROM khach WHERE id = $1 AND team_id = $2`,
      [khachId, ctx.teamId],
    );
    if (!k.rowCount) return null;

    const don = await khach.query(
      `SELECT id, ma_pos, nguon, trang_thai_he, trang_thai_pos, tong_tien, tien_te,
              page_id, hoi_thoai_id, tao_luc
         FROM don_hang
        WHERE khach_id = $1 AND team_id = $2
        ORDER BY tao_luc DESC NULLS LAST, id DESC`,
      [khachId, ctx.teamId],
    );
    const ht = await khach.query(
      `SELECT h.id, h.page_id, p.ten AS page_ten, h.psid, h.trang_thai, h.chu_so_huu,
              h.bat_dau_luc, h.cham_luc
         FROM hoi_thoai h
         LEFT JOIN page p ON p.id = h.page_id AND p.team_id = h.team_id
        WHERE h.khach_id = $1 AND h.team_id = $2
        ORDER BY h.cham_luc DESC NULLS LAST, h.id DESC`,
      [khachId, ctx.teamId],
    );

    // Kênh nào ĐÃ có dấu vết THẬT của người này — đếm từ dữ liệu, không khai sẵn.
    const theoNguon = {};
    for (const d of don.rows)
      theoNguon[d.nguon] = (theoNguon[d.nguon] ?? 0) + 1;
    const kenhCoMat = [];
    if (ht.rowCount) kenhCoMat.push("messenger");
    for (const n of KENH_CO_THAT)
      if (theoNguon[n] && !kenhCoMat.includes(n)) kenhCoMat.push(n);

    return {
      khach: gonKhach(k.rows[0]),
      diaChi: k.rows[0].dia_chi ?? "",
      donHang: don.rows.map((d) => ({
        id: String(d.id),
        maPos: d.ma_pos,
        nguon: d.nguon,
        trangThaiHe: d.trang_thai_he,
        trangThaiPos: d.trang_thai_pos,
        tongTien: d.tong_tien == null ? null : Number(d.tong_tien),
        tienTe: d.tien_te,
        hoiThoaiId: d.hoi_thoai_id == null ? null : String(d.hoi_thoai_id),
        taoLuc: d.tao_luc,
      })),
      hoiThoai: ht.rows.map((h) => ({
        id: String(h.id),
        pageId: String(h.page_id),
        pageTen: h.page_ten ?? "",
        psid: h.psid,
        trangThai: h.trang_thai,
        chuSoHuu: h.chu_so_huu,
        chamLuc: h.cham_luc,
      })),
      kenh: {
        coMat: kenhCoMat,
        soDonTheoNguon: theoNguon,
        chuaNoi: KENH_CHUA_NOI,
        // Câu này đi kèm con số, để màn không tự diễn giải thành «đã gộp đủ».
        khai:
          `hồ sơ này gộp ${kenhCoMat.length}/${KENH_CO_THAT.length} kênh ĐANG CHẠY ` +
          `(${KENH_CO_THAT.join(", ")}); WhatsApp chưa nối nên KHÔNG nằm trong phép gộp`,
      },
      // Tỉ lệ hoàn: đọc lại, kèm ngày chấm, và nói rõ nó KHÔNG chặn gì.
      ruiRoHoan: {
        tiLe: k.rows[0].ti_le_hoan == null ? null : Number(k.rows[0].ti_le_hoan),
        tang: k.rows[0].tang_hoan,
        soDonKet: k.rows[0].so_don_ket,
        soDonHoan: k.rows[0].so_don_hoan,
        chamLuc: k.rows[0].cham_hoan_luc,
        viSaoChuaCham:
          k.rows[0].cham_hoan_luc == null
            ? "job đêm `ti-le-hoan.js` chưa chấm khách này lần nào — số liệu hoàn chưa có, KHÔNG phải bằng 0"
            : null,
        khongChan:
          "tầng này chỉ để ĐỌC — 01 §11 «chặn cứng khách hoàn cao» vẫn đang Chờ chốt, không dòng mã nào đọc `tang_hoan` để chặn",
      },
      nguon: {
        khach: "khach (khoá định danh: team_id + coalesce(thi_truong,'') + so_dien_thoai — migration 013)",
        donHang: "don_hang WHERE khach_id",
        hoiThoai: "hoi_thoai WHERE khach_id (nối bởi A7-2)",
      },
    };
  } finally {
    khach.release();
  }
}

/** Khuôn gọn của một khách — MỘT chỗ, để danh sách và hồ sơ không lệch tên trường. */
function gonKhach(r) {
  return {
    id: String(r.id),
    ten: r.ten ?? "",
    soDienThoai: r.so_dien_thoai,
    thiTruong: r.thi_truong,
    thanhPho: r.thanh_pho ?? "",
    tiLeHoan: r.ti_le_hoan == null ? null : Number(r.ti_le_hoan),
    tangHoan: r.tang_hoan,
    soDonKet: r.so_don_ket ?? null,
    soDonHoan: r.so_don_hoan ?? null,
    chamHoanLuc: r.cham_hoan_luc ?? null,
    ...(r.so_don === undefined ? {} : { soDon: r.so_don }),
    ...(r.so_hoi_thoai === undefined ? {} : { soHoiThoai: r.so_hoi_thoai }),
  };
}

/**
 * Vì sao danh sách rỗng — phân biệt «lọc không trúng ai» với «chưa nạp dữ liệu bao giờ».
 * Hai cái đó trông giống hệt nhau trên màn, và chỉ một cái là việc phải đi làm.
 */
async function boiCanhRong(khach, teamId, soDong, loc) {
  if (soDong > 0) return { coDuLieu: true, viSaoRong: null };

  const tong = await khach.query(
    "SELECT count(*)::int c FROM khach WHERE team_id = $1",
    [teamId],
  );
  if (tong.rows[0].c === 0)
    return {
      coDuLieu: false,
      viSaoRong:
        "team này CHƯA CÓ KHÁCH NÀO. Khách sinh ra từ hai cửa: đồng bộ đơn POS " +
        "(`docDon`) và nối hội thoại (`noiKhachChoHoiThoai`). Chưa chạy cửa nào thì " +
        "bảng rỗng — đây là «chưa cài đặt xong», không phải «không có khách».",
    };

  const coLoc = loc.sdt || loc.thiTruong || loc.tangHoan;
  if (coLoc) {
    const ke = [
      loc.sdt && `số ${loc.sdt}`,
      loc.thiTruong && `thị trường ${loc.thiTruong}`,
      loc.tangHoan && `tầng hoàn ${loc.tangHoan}`,
    ].filter(Boolean);
    return {
      coDuLieu: false,
      viSaoRong:
        `team có ${tong.rows[0].c} khách nhưng không ai khớp ${ke.join(" + ")}. ` +
        `Lưu ý: số điện thoại đã được chuẩn hoá về dạng nội địa trước khi tra, và ` +
        `khách được phân biệt THEO NƯỚC — cùng một số ở hai nước là hai người.`,
    };
  }
  return {
    coDuLieu: false,
    viSaoRong: `team có ${tong.rows[0].c} khách nhưng trang này vượt quá số trang có thật.`,
  };
}
