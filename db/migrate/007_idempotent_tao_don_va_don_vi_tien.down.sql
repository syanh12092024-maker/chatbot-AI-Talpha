-- Gỡ 007 — lùi về ranh trước VA-R2 (khuôn down của l1-m1: sạch, không mất dữ liệu
-- nghiệp vụ). Chỉ một index idempotent + hai COMMENT; 001–006 không đụng.
-- `goi_gia.gia` và `don_hang.tong_tien` KHÔNG có COMMENT trước 007 nên gỡ về NULL là
-- đúng trạng thái cũ (đo 23/08: 0 COMMENT trên hai cột này trong 001–006).
DROP INDEX IF EXISTS nhat_ky_pos_ket_qua_thanh_cong_moi_hang_cho;
COMMENT ON COLUMN goi_gia.gia IS NULL;
COMMENT ON COLUMN don_hang.tong_tien IS NULL;
