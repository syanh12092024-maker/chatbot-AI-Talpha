// KHO SẢN PHẨM ĐỌC TỪ CSDL v3 (CR-28-09b · MN4) — thay bộ đọc HỎI BOT v1 cho màn «Sản phẩm &
// kho», «Ảnh gửi khách» và «Đưa sản phẩm lên chạy».
//
// Luật một nguồn: màn phải hiện ĐÚNG chỗ người sửa. Trước lượt này ba màn trên hỏi bot v1
// (Sheet + `kb-overrides.json`), còn tab sửa ghi vào CSDL — người sửa ảnh ở tab rồi mở màn
// «Ảnh gửi khách» sẽ thấy bản cũ. Nay cả hai đọc CSDL, và bản bot giữ là bản chép sinh từ đây.
//
// CÙNG HÌNH DẠNG với `loi-bot.js#danhSachPageKemSanPham` / `#sanPhamCuaPage`, để ba màn
// không phải đổi một dòng. Page → sản phẩm theo ĐÚNG luật của bộ đọc chung
// (`src/products/catalog.js#docSanPhamGoiGia`): mã gốc + shop nếu page khai, không thì `page_id`.
import { docSanPhamGoiGia } from '../../../src/products/catalog.js';
import { HE_SO_TE } from '../../../src/pos/tao-don.js';

const lon = (gia, te) => Number(gia) / (HE_SO_TE[String(te || '').toUpperCase()] || 1);

export function taoKhoSanPhamV3(pool) {
  return {
    /** Toàn hệ (như bản v1) — nơi gọi lọc lại theo team. Đếm theo đúng luật page → sản phẩm. */
    async danhSach() {
      const r = await pool.query(
        `SELECT p.page_id, p.ten, p.thi_truong, p.nganh_hang, p.marketer, p.bot_ai_bat,
                (SELECT count(*)::int FROM san_pham s
                  WHERE s.team_id = p.team_id AND NOT s.het_hang AND (
                    CASE WHEN p.san_pham_goc_ma IS NOT NULL
                         THEN p.pos_shop_id IS NOT NULL AND s.ma_goc = p.san_pham_goc_ma
                              AND s.ma LIKE p.pos_shop_id || ':%'
                         ELSE s.page_id = p.id END)) AS so_sp,
                EXISTS (SELECT 1 FROM kich_ban k WHERE k.page_id = p.id AND k.trang_thai = 'LIVE') AS co_kb
           FROM page p`,
      );
      return r.rows.map((p) => ({
        pageId: String(p.page_id),
        ten: p.ten || '',
        soSanPham: p.so_sp,
        coKichBan: p.co_kb,
        thiTruong: p.thi_truong || '',
        nganhHang: p.nganh_hang || '',
        marketer: String(p.marketer || '').trim(),
        botBat: !!p.bot_ai_bat,
      }));
    },

    /** Một page — sản phẩm ĐÚNG như bot nhận (món hết hàng không ra, như bản chép). */
    async motPage(pageIdFacebook) {
      const trang = (await pool.query('SELECT * FROM page WHERE page_id = $1 ORDER BY id LIMIT 1',
        [String(pageIdFacebook)])).rows[0];
      if (!trang) return { pageId: String(pageIdFacebook), tenPage: '', cauHinh: {}, sanPham: [] };
      const ds = await docSanPhamGoiGia(pool, trang.team_id, trang.id, trang);
      const live = (await pool.query(
        "SELECT noi_dung_nguoi FROM kich_ban WHERE page_id = $1 AND trang_thai = 'LIVE' LIMIT 1", [trang.id],
      )).rows[0]?.noi_dung_nguoi || {};
      return {
        pageId: String(pageIdFacebook),
        tenPage: trang.ten || '',
        cauHinh: {
          chao: String(live.greeting || '').trim(),
          cachBan: String(live.salesPrompt || '').trim(),
          giongDieu: String(live.tone || '').trim(),
        },
        sanPham: ds
          .map((s) => {
            const goi = s.goiGia || [];
            return {
              ma: String(s.ma || ''),
              ten: String(s.ten || '').trim(),
              moTa: String(s.mo_ta || '').trim(),
              bienThe: String(s.bien_the || '').trim(),
              tienTe: String(goi[0]?.tien_te || '').trim(),
              giaDau: goi.length ? lon(goi[0].gia, goi[0].tien_te) : null,
              bacGia: goi.map((g) => ({ nhan: g.nhan || `Buy ${g.so_luong}`, gia: lon(g.gia, g.tien_te) })),
              anh: (s.anh || []).map((a) => ({ duong: a.duong, nhan: a.nhan })),
              hetHang: !!s.het_hang,
              botDangBan: !s.het_hang,
            // Hiện cả món hết hàng nhưng đánh dấu: bản chép gửi bot BỎ món ấy
            // (`ban-chep-bot.js` luật ①) — ẩn khỏi màn là người vận hành không thấy chỗ bật lại.
            };
          }),
      };
    },
  };
}
