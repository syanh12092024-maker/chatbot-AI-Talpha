-- Gỡ 005_loc_trung_va_ti_le_hoan. Chỉ cột/CHECK/index của `khach` và `don_hang`;
-- 001–004 không đụng, KHÔNG bảng nào bị xoá.
--
-- MẤT DỮ LIỆU (nói ra trước cho người chạy `down`, cùng khuôn 004):
--   · toàn bộ kết quả chấm tỉ lệ hoàn (tầng + tử/mẫu + mốc chấm) biến mất — chạy lại
--     `chamTiLeHoan()` là dựng lại được, vì nguồn là `don_hang`, không phải cột này;
--   · `don_hang.san_pham_ma` biến mất ⇒ `kiemTrung` rơi hết về nhánh «mù có nói ra».
DROP INDEX IF EXISTS don_hang_san_pham_ma;
DROP INDEX IF EXISTS don_hang_khach_ngay;
DROP INDEX IF EXISTS khach_duoi7_sdt;

ALTER TABLE khach DROP CONSTRAINT IF EXISTS khach_tang_di_kem_moc_cham;
ALTER TABLE khach DROP CONSTRAINT IF EXISTS khach_dem_hoan_hop_le;
ALTER TABLE khach DROP CONSTRAINT IF EXISTS khach_ti_le_hoan_phan_tram;
ALTER TABLE khach DROP CONSTRAINT IF EXISTS khach_tang_hoan_hop_le;

ALTER TABLE don_hang DROP COLUMN IF EXISTS san_pham_ma;
ALTER TABLE khach DROP COLUMN IF EXISTS cham_hoan_luc;
ALTER TABLE khach DROP COLUMN IF EXISTS so_don_hoan;
ALTER TABLE khach DROP COLUMN IF EXISTS so_don_ket;
ALTER TABLE khach DROP COLUMN IF EXISTS tang_hoan;

-- Comment của `ti_le_hoan` là do 005 đặt (001 không có) — trả về trạng thái không khai.
COMMENT ON COLUMN khach.ti_le_hoan IS NULL;
