-- 015 DOWN · gỡ cột «page bán sản phẩm nào»
--
-- ⚠️ KHÔNG phải đường lùi trên CSDL thật (án lệ 01/09 — `013.down` làm mất dữ liệu và ném
--    giữa chừng). Đường lùi của phiếu này là LÙI CODE, GIỮ LƯỢC ĐỒ: cột không ai đọc thì
--    nằm im vô hại.
--
-- Chạy trên CSDL có dữ liệu thì nó XOÁ toàn bộ công gán page→sản phẩm. Xuất trước:
--     \copy (SELECT page_id, san_pham_goc_ma FROM page WHERE san_pham_goc_ma IS NOT NULL) TO 'gan-page.csv' CSV HEADER

DROP INDEX IF EXISTS page_san_pham_goc_ma;
ALTER TABLE page DROP CONSTRAINT IF EXISTS page_san_pham_goc_co_that;
ALTER TABLE page DROP COLUMN IF EXISTS san_pham_goc_ma;
