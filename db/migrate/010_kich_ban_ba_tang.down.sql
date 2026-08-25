-- Gỡ 010 · trả `kich_ban` về một tầng (chỉ theo page).
--
-- ⚠️ LÀM MẤT DỮ LIỆU nếu đã có bản ở tầng sản phẩm/nước: `page_id` quay lại NOT NULL nên
--    những dòng đó KHÔNG tồn tại được nữa. Xoá chúng TRƯỚC, và nói thẳng ra ở đây thay vì
--    để `ALTER` chết giữa chừng với một câu lỗi khó đọc.
DELETE FROM kich_ban WHERE cap <> 'page';

DROP INDEX IF EXISTS kich_ban_tra_theo_cap;
DROP INDEX IF EXISTS kich_ban_phien_ban_san_pham;
DROP INDEX IF EXISTS kich_ban_phien_ban_nuoc;
DROP INDEX IF EXISTS kich_ban_mot_live_san_pham;
DROP INDEX IF EXISTS kich_ban_mot_live_nuoc;

ALTER TABLE kich_ban DROP CONSTRAINT IF EXISTS kich_ban_khoa_dung_cap;
ALTER TABLE kich_ban ALTER COLUMN page_id SET NOT NULL;
ALTER TABLE kich_ban
  DROP COLUMN IF EXISTS cap,
  DROP COLUMN IF EXISTS san_pham_ma,
  DROP COLUMN IF EXISTS thi_truong;
