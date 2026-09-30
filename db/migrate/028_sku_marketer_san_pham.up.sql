-- ═══════════════════════════════════════════════════════════════════════════
-- 028_sku_marketer_san_pham — SKU LÀM KHOÁ SẢN PHẨM + MARKETER CỦA SẢN PHẨM (VE8 · CR-28-09c)
--
-- Người quyết 30/09: «cùng 1 sản phẩm nhưng ở các pos id sẽ chung 1 sku, id có thể khác nhau nhưng sku là một»
-- ⇒ gộp món POS theo SKU; «1 sản phẩm bán ở nhiều thị trường … nhưng đều của 1 marketer».
--
-- Đo POS prod 30/09 (7 shop, chỉ đọc): SKU = «mã sản phẩm» `product.display_id`, có ở 100% biến thể; trùng số
-- đầu tên (khoá gộp cũ CR-15/09) ở 371/373 món; 24 SKU «khác tên» đều là cùng sản phẩm lệch chính tả;
-- 72/269 SKU KHÔNG phải số («Necklace box», «Mascara»…) ⇒ `so_hieu` (1–4 chữ số) không chứa được — cột mới.
--
--   san_pham.sku      SKU NGUYÊN VĂN POS trả (món POS) — lượt kéo danh mục ghi.
--   san_pham_goc.sku  SKU CHUẨN HOÁ của sản phẩm (số bỏ 0 đầu · chữ về thường) — khoá tự nối món của shop mới.
--   san_pham_goc.marketer  marketer phụ trách (một cho mọi thị trường). Ô chữ cùng kiểu `page.marketer`;
--                          nối hồ sơ HRM ở LL15. '' = chưa gán.
-- ⛔ CHỈ THÊM. `so_hieu` giữ nguyên (74 chỗ đọc) — sản phẩm SKU dạng số vẫn điền nó.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE san_pham ADD COLUMN sku text;
CREATE INDEX san_pham_team_sku ON san_pham (team_id, sku) WHERE sku IS NOT NULL;
COMMENT ON COLUMN san_pham.sku IS 'SKU nguyên văn của POS (`product.display_id`) — chỉ món nguon=pos; NULL = chưa kéo lại từ khi có cột.';

ALTER TABLE san_pham_goc ADD COLUMN sku text;
CREATE UNIQUE INDEX san_pham_goc_sku ON san_pham_goc (team_id, sku) WHERE sku IS NOT NULL;
COMMENT ON COLUMN san_pham_goc.sku IS 'SKU chuẩn hoá (src/pos/ten-goc.js#chuanSku) — món POS mang SKU này tự nối vào sản phẩm.';

ALTER TABLE san_pham_goc ADD COLUMN marketer text NOT NULL DEFAULT '';
COMMENT ON COLUMN san_pham_goc.marketer IS 'Marketer phụ trách sản phẩm, mọi thị trường (người quyết 30/09). Page gán vào sản phẩm theo marketer này.';
