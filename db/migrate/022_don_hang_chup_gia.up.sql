-- ═══════════════════════════════════════════════════════════════════════════
-- 022_don_hang_chup_gia — ĐƠN PHẢI GIỮ GIÁ CỦA CHÍNH LÚC NÓ ĐƯỢC TẠO
--
-- ─── VÌ SAO ───────────────────────────────────────────────────────────────────────────
-- `don_hang` hiện chỉ giữ `tong_tien` + `san_pham_ma[]`. Không có số lượng, không có đơn
-- giá, không có phí ship. Muốn biết «đơn này bán gì, giá bao nhiêu» phải lần ngược
-- `hang_cho_tao_don.du_lieu_don` — mà hàng chờ là bảng THAO TÁC, dọn được và sẽ dọn.
--
-- Nguy hơn: đọc lại `goi_gia` để suy ra đơn giá là đọc giá CỦA HÔM NAY cho một đơn của
-- tháng trước. Đổi một bậc giá là mọi con số lịch sử đổi theo, im lặng — báo cáo doanh
-- thu, tỉ lệ hoàn, biên lãi đều lệch mà không ai thấy lúc nó lệch.
--
-- ─── VÌ SAO KHÔNG ĐẺ BẢNG `don_hang_dong` ─────────────────────────────────────────────
-- Luật của dự án là MỖI PAGE BÁN MỘT SẢN PHẨM (`src/prompts.js:44`), và `san_pham_ma`
-- vốn đã là MẢNG cho đơn POS nhiều dòng. Thêm một bảng dòng hàng lúc này là đẻ nguồn sự
-- thật thứ hai cho cùng một thứ, trong khi chưa có lượt bán nào cần tới nó. Khi nào bán
-- thật nhiều sản phẩm một đơn thì tách — và lúc ấy tách có dữ liệu để mà tách đúng.
--
-- ⛔ `gia_goi`/`phi_ship` ở ĐƠN VỊ NHỎ, cùng quy ước với `goi_gia.gia` (migration 007).
-- ⛔ Cột NULL với đơn cũ: chúng được tạo trước khi có cột này, và bịa số cho chúng còn
--    tệ hơn để trống — báo cáo phải phân biệt «không biết» với «bằng 0».
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE don_hang ADD COLUMN so_luong        int;
ALTER TABLE don_hang ADD COLUMN gia_goi         numeric(14,2);
ALTER TABLE don_hang ADD COLUMN phi_ship        numeric(14,2);
ALTER TABLE don_hang ADD COLUMN khuyen_mai      text NOT NULL DEFAULT '';
ALTER TABLE don_hang ADD COLUMN san_pham_goc_ma text;

COMMENT ON COLUMN don_hang.so_luong        IS 'Số lượng CHỐT lúc tạo đơn. NULL = đơn cũ, tạo trước 022.';
COMMENT ON COLUMN don_hang.gia_goi         IS 'Giá CẢ GÓI của bậc đã khớp (goi_gia.gia), ĐƠN VỊ NHỎ, chụp lúc tạo. Cố ý KHÔNG lưu đơn giá: `Buy 1 Get 1 = 99` không chia được cho số món.';
COMMENT ON COLUMN don_hang.phi_ship        IS 'Phí ship chụp lúc tạo, đơn vị nhỏ. NULL = chưa khai ở bậc giá (KHÁC 0 = miễn phí).';
COMMENT ON COLUMN don_hang.khuyen_mai      IS 'Câu khuyến mãi của bậc giá lúc chốt — để sau này biết đơn ấy bán theo chương trình nào.';
COMMENT ON COLUMN don_hang.san_pham_goc_ma IS 'Mã sản phẩm GỐC — sống lâu hơn mã biến thể POS, nên báo cáo theo sản phẩm vẫn đúng khi shop đổi mã.';
