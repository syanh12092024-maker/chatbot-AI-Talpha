-- Gỡ 012 · trả tầng nước về «bắt buộc có sản phẩm», và bỏ bảng mẫu 0 đồng.
--
-- ⚠️ Bản kịch bản tầng nước KHÔNG có `san_pham_ma` sẽ không tồn tại được nữa — xoá trước,
--    và nói thẳng ra thay vì để `ALTER` chết với một câu lỗi khó đọc.
DELETE FROM kich_ban WHERE cap = 'nuoc' AND san_pham_ma IS NULL;

DROP INDEX IF EXISTS mau_0_dong_tu_khoa;
DROP INDEX IF EXISTS mau_0_dong_dang_bat;
DROP TABLE IF EXISTS mau_0_dong;

DROP INDEX IF EXISTS kich_ban_phien_ban_nuoc;
CREATE UNIQUE INDEX kich_ban_phien_ban_nuoc
  ON kich_ban (team_id, san_pham_ma, thi_truong, phien_ban) WHERE cap = 'nuoc';

DROP INDEX IF EXISTS kich_ban_mot_live_nuoc;
CREATE UNIQUE INDEX kich_ban_mot_live_nuoc
  ON kich_ban (team_id, san_pham_ma, thi_truong) WHERE trang_thai = 'LIVE' AND cap = 'nuoc';

ALTER TABLE kich_ban DROP CONSTRAINT kich_ban_khoa_dung_cap;
ALTER TABLE kich_ban ADD CONSTRAINT kich_ban_khoa_dung_cap CHECK (
  (cap = 'page'     AND page_id IS NOT NULL AND san_pham_ma IS NULL     AND thi_truong IS NULL)
  OR
  (cap = 'nuoc'     AND page_id IS NULL     AND san_pham_ma IS NOT NULL AND thi_truong IS NOT NULL)
  OR
  (cap = 'san_pham' AND page_id IS NULL     AND san_pham_ma IS NOT NULL AND thi_truong IS NULL)
);
