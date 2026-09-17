-- Gỡ cột `ip` của nhật ký. Dữ liệu IP đã ghi MẤT THEO — bảng `nhat_ky` cấm UPDATE/DELETE
-- nhưng DROP COLUMN là DDL nên vẫn đi được; cân nhắc sao lưu trước khi lùi.
ALTER TABLE nhat_ky DROP COLUMN IF EXISTS ip;
