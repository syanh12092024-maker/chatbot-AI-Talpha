-- Lùi: kiến thức sản phẩm và các cột ưu đãi MẤT THEO. Trước khi lùi, nếu đã nhập nội dung
-- thì xuất ra tệp — chúng là công người viết, không sinh lại được từ POS.
DROP INDEX IF EXISTS goi_gia_dang_bat;
ALTER TABLE goi_gia DROP COLUMN IF EXISTS bat;
ALTER TABLE goi_gia DROP COLUMN IF EXISTS mien_ship;
ALTER TABLE goi_gia DROP COLUMN IF EXISTS phi_ship;
ALTER TABLE goi_gia DROP COLUMN IF EXISTS khuyen_mai;
ALTER TABLE goi_gia DROP COLUMN IF EXISTS gia_goc;
ALTER TABLE san_pham_goc DROP COLUMN IF EXISTS kien_thuc;
