// RÁP PROMPT BỐN KHỐI TỪ DB — `kb` cho `buildSystem(kb)` (phiếu L2-M3 ②.1).
// Thi hành: `01-QUYET-DINH.md` §6 (bảng 4 khối) + `02-KE-HOACH-CODE.md` §L2 ("tách bốn
// khối ngay từ giai đoạn 1, kể cả khi chưa làm giao diện").
//
// BỐN NGUỒN DB (luoc-do-v1.md §2):
//   bo_luat_chung  team_id NULLABLE (NULL = toàn hệ) — hợp đồng đọc `team_id=$ctx OR NULL`
//   ky_nang        team_id NOT NULL — cột `bat_cho_nhom_sp text[]` = "bật cho nhóm SP nào"
//   kich_ban       team_id+page_id  — bản LIVE, trường `noi_dung_nguoi` (6 field marketer)
//   san_pham/goi_gia  team_id+page_id — danh mục + bảng giá (nguồn POS, L1-M1 đổ)
//
// ⚠️ GIỚI HẠN THẬT — ĐỌC TRƯỚC KHI TIN (án lệ #32 skill tho-thi-cong, cùng khuôn cảnh báo
// "model DI" ở duong-tin-v1.md §6): `buildSystem(kb)` trong `src/prompts.js` (CẤM SỬA,
// luật 4 §0a sổ điều hành) HARDCODE hằng `CORE` — nó KHÔNG đọc bất kỳ trường `kb.*` nào
// cho khối "bộ luật chung". Nghĩa là bo_luat_chung đọc được từ DB ở đây, seed đúng dữ liệu
// đúng hợp đồng OR-IS-NULL, NHƯNG CHƯA THẬT SỰ là khối đang ĐIỀU KHIỂN model — CORE cứng
// trong prompts.js vẫn là thứ duy nhất có hiệu lực cho "bộ luật chung". Đây là SEED
// MỒI + hợp đồng dữ liệu cho giai đoạn 2 (dashboard), không phải cutover prompt sống.
// Đo lại: `grep -c "CORE" src/prompts.js` — hằng vẫn đứng nguyên, không đường nào đọc
// `kb.boLuatChung`/`kb.blocks.boLuatChung` để THAY nó. Ba khối còn lại (kỹ năng/kịch
// bản/sản phẩm) CÓ hiệu lực thật: kịch bản → `kb.config` (buildSystem đọc trực tiếp),
// kỹ năng + sản phẩm → `kb.text` (buildSystem đọc trực tiếp, khối "# KNOWLEDGE BASE").
//
// CỜ FALLBACK — `V3_RAP_PROMPT_BAT` (bien-moi-truong-v3.md, luật "vắng = ĐÓNG"): VẮNG
// (mặc định) ⇒ dùng NGUYÊN đường `kb.js#getKBForPage` cũ, KHÔNG đụng DB — không gãy 51
// page hiện hành đang sống bằng kb-overrides.json lúc cây này merge/deploy. Đặt `=1` mới
// bật đường DB bốn khối. Đây LÀ "cờ config" mà đề bài ②.1 nhắc — không phải per-block.
import { ctxHeThong, layNhieu } from "../db/index.js";
import { getKBForPage } from "../kb.js";

/** Bốn tên khối — dùng để khai `nguon_thieu` (mù-có-nói-ra, không im — luật án lệ #7). */
export const KHOI = Object.freeze({
  BO_LUAT_CHUNG: "bo_luat_chung",
  KY_NANG: "ky_nang",
  KICH_BAN: "kich_ban",
  SAN_PHAM: "san_pham",
});

function bienCoBat() {
  return process.env.V3_RAP_PROMPT_BAT === "1";
}

/**
 * Đọc `bo_luat_chung` ĐANG DÙNG, version mới nhất, theo hợp đồng OR-IS-NULL (đã cài SẴN
 * trong tầng truy vấn — `truy-van.js#veTeamKhiDoc`, KHÔNG tự viết SQL tay ở đây). ĐỌC MỖI
 * LƯỢT, không cache: bo_luat_chung đổi RẤT HIẾM (01 §6: "Nhịp đổi: Hiếm"), một roundtrip
 * thêm cho một dòng nhỏ là giá rẻ đổi lấy "version mới ăn ngay, không cần restart" —
 * đúng yêu cầu ④#2 của phiếu mà không cần dựng một tầng cache/TTL nào (luật 12: không
 * over-engineering cho thứ chưa ai đòi).
 */
export async function docBoLuatChung(pool, teamId) {
  const rows = await layNhieu(pool, ctxHeThong(), "bo_luat_chung", {
    dieuKien: { team_id: teamId, dang_dung: true },
  });
  if (!rows.length) return null;
  // Nhiều dòng dang_dung=true (không có UNIQUE ràng ở tầng CSDL, xem seed) → lấy
  // phien_ban cao nhất; lệch chỗ này chỉ ảnh hưởng khối THAM KHẢO (xem giới hạn đầu file).
  rows.sort((a, b) => Number(b.phien_ban) - Number(a.phien_ban));
  return rows[0];
}

/**
 * Đọc `ky_nang` đang BẬT của team, lọc theo "nhóm sản phẩm" của page. Không có cột "nhóm
 * SP" riêng trong lược đồ (luoc-do-v1.md không khai) — `bat_cho_nhom_sp` khớp trực tiếp
 * vào `san_pham.ma` (mã biến thể POS `"<shop>:<variation_id>"`, khoá duy nhất đang có).
 * `bat_cho_nhom_sp` RỖNG ⇒ áp dụng CHO CẢ TEAM (quản trị đã BẬT có chủ đích, không khoanh
 * nhóm cụ thể) — KHÁC "kỹ năng chưa ai bật" (bat=false, không vào danh sách này).
 *
 * @param {string[]} dsMaSp  danh sách `san_pham.ma` của page đang xử lý
 */
export async function docKyNang(pool, teamId, dsMaSp = []) {
  const rows = await layNhieu(pool, ctxHeThong(), "ky_nang", {
    dieuKien: { team_id: teamId, bat: true },
    thuTu: "ma",
  });
  const ma = new Set(dsMaSp);
  return rows.filter((r) => {
    const nhom = Array.isArray(r.bat_cho_nhom_sp) ? r.bat_cho_nhom_sp : [];
    return !nhom.length || nhom.some((g) => ma.has(g));
  });
}

/** Đọc dòng `page` theo khoá tự nhiên TEXT (Facebook page_id) — cần `page.id` (bigint)
 *  để tra kịch bản/sản phẩm, và `page.trong_diem` cho cờ đo riêng T4. */
export async function docTrangPage(pool, teamId, pageIdText) {
  const rows = await layNhieu(pool, ctxHeThong(), "page", {
    dieuKien: { team_id: teamId, page_id: String(pageIdText) },
  });
  return rows[0] || null;
}

/** Đọc bản kịch bản LIVE của page — `noi_dung_nguoi` là ĐÚNG 6 trường SCRIPT_FIELDS của
 *  kb.js (kb.js §"Cấu hình AI theo page"), buildSystem() đọc thẳng làm `kb.config`. */
export async function docKichBanLive(pool, teamId, pageRowId) {
  const rows = await layNhieu(pool, ctxHeThong(), "kich_ban", {
    dieuKien: { team_id: teamId, page_id: pageRowId, trang_thai: "LIVE" },
  });
  return rows[0] || null;
}

/** Đọc danh mục sản phẩm + bảng giá của page. `goi_gia` không có cột `page_id` nên phải
 *  tra theo TỪNG `san_pham.id` — một page thường 1 SP (prompts.js:44 "MỖI PAGE CHỈ BÁN 1
 *  SP") nên vòng lặp không phải N+1 thật sự. */
export async function docSanPhamGoiGia(pool, teamId, pageRowId) {
  const sp = await layNhieu(pool, ctxHeThong(), "san_pham", {
    dieuKien: { team_id: teamId, page_id: pageRowId },
    thuTu: "ma",
  });
  const ra = [];
  for (const s of sp) {
    const goiGia = await layNhieu(pool, ctxHeThong(), "goi_gia", {
      dieuKien: { team_id: teamId, san_pham_id: s.id },
      thuTu: "so_luong",
    });
    ra.push({ ...s, goiGia });
  }
  return ra;
}

/** NHÃN PHẢI LÀ TIẾNG ANH — bài học kb.js đã trả giá (comment kb.js dòng 282-284: nhãn
 *  tiếng Việt cứng từng gửi "Mua 1 cái — 99 AED" cho khách Trung Đông, sửa 11/08/2026).
 *  `goi_gia` không có cột nhãn tự do như `kich_ban`/kb-overrides `tiers[].label` — dựng
 *  nhãn "Buy N" từ `so_luong`, cùng khuôn `productTiers()` fallback của kb.js. */
function nhanGoiGia(soLuong) {
  return `Buy ${soLuong}`;
}

function xayVanBanSanPham(dsSp) {
  const out = [
    "# SẢN PHẨM & GIÁ (nguồn: san_pham/goi_gia · đồng bộ từ POS, không bịa)",
  ];
  if (!dsSp.length) {
    out.push("(chưa có sản phẩm)");
    return out.join("\n");
  }
  for (const sp of dsSp) {
    const dong = [`- [${sp.ma}]${sp.ten ? " " + sp.ten : ""}`];
    if (sp.mo_ta) dong.push(`— ${sp.mo_ta}`);
    out.push(dong.join(" "));
    if (Array.isArray(sp.goiGia) && sp.goiGia.length) {
      const gia = sp.goiGia.map(
        (g) => `${nhanGoiGia(g.so_luong)}: ${g.gia} ${g.tien_te}`,
      );
      out.push(`    Giá — ${gia.join(" | ")}`);
    }
    if (sp.het_hang) out.push(`    (⚠️ hết hàng — cửa POS đánh dấu het_hang)`);
  }
  return out.join("\n");
}

function xayVanBanKyNang(dsKyNang) {
  if (!dsKyNang.length) return "";
  const out = ["# KỸ NĂNG TƯ VẤN (bật theo nhóm sản phẩm của page này)"];
  for (const k of dsKyNang) out.push(`- ${k.ten}: ${k.noi_dung}`);
  return out.join("\n");
}

/** Mẩu ĐO ĐƯỢC của bo_luat_chung — KHÔNG dán nguyên văn (xem "GIỚI HẠN THẬT" đầu file):
 *  dán trọn ~2.256 token là gửi lặp một bộ quy tắc gần giống CORE hai lần cho model mỗi
 *  lượt (tốn token thật, và có thể gây rối khi hai bản "cùng thẩm quyền" lệch câu chữ).
 *  Giữ một đoạn trích THẬT (không phải nhãn bịa) để: (a) hợp đồng đọc DB được nghiệm thu
 *  bằng grep, (b) tương lai dashboard/kiểm phiên bản đọc thẳng field này. */
function xayVanBanBoLuatChung(row) {
  if (!row) return "";
  const trich = String(row.noi_dung || "").slice(0, 300);
  return (
    `# BỘ LUẬT CHUNG (bo_luat_chung v${row.phien_ban}, nguồn DB — bản THAM KHẢO/phiên bản;` +
    ` quy tắc ĐANG ÁP DỤNG thật vẫn là CORE cứng trong prompts.js, xem duong-tin-v1.md §ráp-prompt)\n${trich}`
  );
}

/**
 * Ráp `kb` cho `buildSystem(kb)` từ BỐN NGUỒN DB. Chữ ký khớp `deps.layKb(pool, {teamId,
 * pageIdText})` của `handler-v3.js` — thay `getKBForPage(pageId)` cũ làm mặc định.
 *
 * @returns {Promise<object>} kb — `{config, text, products, noData, nguon_thieu,
 *          trongDiem, blocks}`. `blocks` giữ NGUYÊN VẸN (chưa cắt) từng khối — để đo
 *          "độ dài từng khối" (④#1) và cho công cụ tương lai, KHÔNG phải thứ buildSystem
 *          đọc trực tiếp.
 */
export async function rapKb(pool, { teamId, pageIdText }) {
  if (teamId == null) throw new Error("rapKb: thiếu teamId.");
  if (!pageIdText) throw new Error("rapKb: thiếu pageIdText.");

  const trang = await docTrangPage(pool, teamId, pageIdText);
  const trongDiem = trang?.trong_diem === true;

  if (!bienCoBat()) {
    // Cờ TẮT (mặc định, "vắng = đóng") ⇒ đường CŨ nguyên vẹn, 0 truy vấn 4 khối.
    const kbCu = getKBForPage(pageIdText) || {};
    return {
      ...kbCu,
      trongDiem,
      nguon_thieu: [],
      blocks: null,
      nguon: "kb_cu",
    };
  }

  if (!trang) {
    // Không có dòng `page` cho team này — không đủ để tra kịch bản/sản phẩm theo page_id.
    return {
      config: {},
      text: "# CHƯA CÓ SẢN PHẨM CHO PAGE NÀY\nHãy xin lỗi và chuyển nhân viên (gọi tool handoff_human).",
      products: [],
      noData: true,
      trongDiem: false,
      nguon_thieu: [
        KHOI.BO_LUAT_CHUNG,
        KHOI.KY_NANG,
        KHOI.KICH_BAN,
        KHOI.SAN_PHAM,
      ],
      blocks: null,
      nguon: "db",
    };
  }

  const sp = await docSanPhamGoiGia(pool, teamId, trang.id);
  const dsMaSp = sp.map((s) => s.ma);
  const [luat, kyNang, kichBan] = await Promise.all([
    docBoLuatChung(pool, teamId),
    docKyNang(pool, teamId, dsMaSp),
    docKichBanLive(pool, teamId, trang.id),
  ]);

  const nguonThieu = [];
  if (!luat) nguonThieu.push(KHOI.BO_LUAT_CHUNG);
  if (!kyNang.length) nguonThieu.push(KHOI.KY_NANG);
  if (!kichBan) nguonThieu.push(KHOI.KICH_BAN);
  if (!sp.length) nguonThieu.push(KHOI.SAN_PHAM);

  const config = kichBan?.noi_dung_nguoi || {};
  const text = [
    xayVanBanBoLuatChung(luat),
    xayVanBanSanPham(sp),
    xayVanBanKyNang(kyNang),
  ]
    .filter(Boolean)
    .join("\n\n");

  const products = sp.map((s) => ({
    id: s.ma,
    name: s.ten,
    desc: s.mo_ta,
    stock: s.ton_kho,
    hetHang: s.het_hang,
  }));

  return {
    config,
    text,
    products,
    // Cùng khuôn kb.js#getKBForPage: KHÔNG sản phẩm ⇒ noData (handler bàn giao, không bịa).
    noData: !sp.length,
    trongDiem,
    nguon_thieu: nguonThieu,
    nguon: "db",
    blocks: {
      boLuatChung: luat
        ? {
            phienBan: luat.phien_ban,
            doDai: String(luat.noi_dung || "").length,
          }
        : null,
      kyNang: kyNang.map((k) => ({
        ma: k.ma,
        ten: k.ten,
        doDai: String(k.noi_dung || "").length,
      })),
      kichBan: kichBan
        ? {
            phienBan: kichBan.phien_ban,
            doDai: String(kichBan.noi_dung_may || "").length,
          }
        : null,
      sanPham: sp.map((s) => ({
        ma: s.ma,
        ten: s.ten,
        doDai: String(s.mo_ta || "").length,
      })),
    },
  };
}
