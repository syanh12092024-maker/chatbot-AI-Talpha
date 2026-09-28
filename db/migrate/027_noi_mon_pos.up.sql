-- ═══════════════════════════════════════════════════════════════════════════
-- 027_noi_mon_pos — SẢN PHẨM CỦA PAGE NỐI VỚI MỘT MÓN TRONG KHO POS (CR-28-09b · MN8)
--
-- Đo prod 28/09: 78 sản phẩm bot đang bán nạp từ `kb-overrides.json` (nguon='kb') KHÔNG nối với
-- POS — 75 không tên, không tồn kho. Danh mục POS kéo về thành dòng `san_pham` RIÊNG
-- (nguon='pos', mã `<shop>:<biến thể>`, có tên + tồn kho) nhưng không có bậc giá combo, ảnh,
-- mô tả bán hàng. Hai loại dòng mang hai nửa sự thật; cột này là sợi dây giữa chúng:
-- sản phẩm của page (giá combo · ảnh · mô tả do marketer) TRỎ tới món POS (tên · tồn kho).
--
-- NULL = chưa nối (người chọn trên trang page). Không FK cứng: món POS có thể bị xoá khỏi
-- danh mục; khi đó dây đứt phải HIỆN ra trên màn, không được cascade xoá sản phẩm đang bán.
-- ⛔ CHỈ THÊM.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE san_pham ADD COLUMN pos_ma text;
COMMENT ON COLUMN san_pham.pos_ma IS
  'Mã món POS (`<shop>:<biến thể>`, = san_pham.ma của dòng nguon=pos) mà sản phẩm của page này bán. Hết hàng tự theo tồn kho POS mỗi lượt kéo danh mục.';
