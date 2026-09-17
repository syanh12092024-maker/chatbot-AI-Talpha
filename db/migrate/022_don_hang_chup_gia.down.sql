-- Lùi: mất ảnh chụp giá của mọi đơn tạo từ 022 trở đi. Không dựng lại được từ `goi_gia`
-- (bảng đó là giá HIỆN TẠI) — xuất ra tệp trước nếu cần giữ.
ALTER TABLE don_hang DROP COLUMN IF EXISTS san_pham_goc_ma;
ALTER TABLE don_hang DROP COLUMN IF EXISTS khuyen_mai;
ALTER TABLE don_hang DROP COLUMN IF EXISTS phi_ship;
ALTER TABLE don_hang DROP COLUMN IF EXISTS gia_goi;
ALTER TABLE don_hang DROP COLUMN IF EXISTS so_luong;
