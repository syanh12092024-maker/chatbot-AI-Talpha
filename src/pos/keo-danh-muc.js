// KÉO DANH MỤC POS CHO CẢ MỘT TEAM — vòng ngoài của `doc-danh-muc.js`.
//
// ─── VÌ SAO CÓ FILE NÀY ────────────────────────────────────────────────────────────────
// `docDanhMuc()` đọc danh mục + tồn kho thật của MỘT thị trường và upsert `san_pham` /
// `goi_gia`. Nó đã có, đã đúng, và **chưa nút nào trên màn gọi tới**: đo 17/09, chỉ các
// module nội bộ (`tao-don`, `doc-don`) chạm tới. Hệ quả nằm ngay trong chú thích đầu
// `v3/src/ui/san-pham/kho-san-pham.js`: «Cửa POS (docDanhMuc) đọc được tồn kho nhưng chưa
// ai nối» — nên bảng `san_pham` của v3 rỗng, và màn phải đi đọc Google Sheet của bot v1.
//
// File này là vòng ngoài còn thiếu: duyệt các kết nối POS ĐANG BẬT của team, gọi lần lượt,
// cộng dồn kết quả.
//
// ─── MỘT THỊ TRƯỜNG HỎNG KHÔNG ĐƯỢC LÀM HỎNG CẢ LƯỢT ──────────────────────────────────
// Khoá POS sai hoặc shop đổi chủ chỉ lộ ở lượt gọi thật (`themKetNoi` cố ý không gọi thử).
// Nếu một thị trường ném mà cả lượt chết thì các thị trường còn lại mất luôn lượt kéo, và
// người bấm không biết cái nào hỏng. Nên: bắt lỗi TỪNG thị trường, kéo tiếp, và trả danh
// sách hỏng ra cho màn gọi tên.
import { lietKeThiTruong } from "./ket-noi.js";
import { docDanhMuc } from "./doc-danh-muc.js";

/**
 * Kéo danh mục cho MỌI kết nối POS đang bật của team đang mở.
 *
 * @param {import('pg').Pool} pool
 * @param {object} ctx                bối cảnh của người A (team_id nằm trong đây)
 * @param {{teamId?:string|null, doc?:Function, lietKe?:Function}} [tuyChon]
 */
export async function keoDanhMucTeam(
  pool,
  ctx,
  { teamId = null, doc = docDanhMuc, lietKe = lietKeThiTruong } = {},
) {
  const ketNoi = (await lietKe(pool, ctx, { teamId })).filter((k) => k.bat);
  const kq = {
    thiTruong: ketNoi.length,
    docDuoc: 0,
    them: 0,
    capNhat: 0,
    giaGhiDuoc: 0,
    khongCoTen: 0,
    chuaCoSanPhamGoc: [],
    theo: [],
    hong: [],
  };
  if (!ketNoi.length) return { ...kq, rong: true };

  for (const k of ketNoi) {
    try {
      const r = await doc(pool, ctx, { shop: k.market, teamId });
      kq.docDuoc += r.docDuoc || 0;
      kq.them += r.them || 0;
      kq.capNhat += r.capNhat || 0;
      kq.giaGhiDuoc += r.giaGhiDuoc || 0;
      kq.khongCoTen += (r.khongCoTen || []).length;
      for (const so of r.chuaCoSanPhamGoc || []) {
        if (!kq.chuaCoSanPhamGoc.includes(so)) kq.chuaCoSanPhamGoc.push(so);
      }
      kq.theo.push({
        market: k.market, shopId: k.shopId, docDuoc: r.docDuoc || 0,
        them: r.them || 0, capNhat: r.capNhat || 0, giaGhiDuoc: r.giaGhiDuoc || 0,
        khongCoTen: (r.khongCoTen || []).length,
      });
    } catch (e) {
      // Gọi tên thị trường hỏng. `e.message` của tầng POS không mang khoá — nhưng cắt
      // ngắn để một chuỗi lạ của nhà cung cấp không kéo cả trang ra.
      kq.hong.push({ market: k.market, shopId: k.shopId, loi: String(e?.message || e).slice(0, 200) });
    }
  }
  return { ...kq, rong: false };
}
