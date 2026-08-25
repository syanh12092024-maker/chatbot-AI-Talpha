-- Gỡ 009 · trả bộ luật chung và kỹ năng về hình cũ.
--
-- Chiều xuống LÀM MẤT lịch sử kỹ năng và mọi dấu duyệt — nói thẳng ra ở đây, vì đó là
-- thứ không dựng lại được. Gỡ bản này là chấp nhận điều đó.
--
-- ⚠️ Trước khi gỡ, `ky_nang` phải đang ở trạng thái ĐÚNG MỘT dòng mỗi (team, ma) — vốn là
--    bất biến mà 009 giữ nguyên, nên chiều xuống không phải dọn gì cho bảng gốc.

DROP INDEX IF EXISTS ky_nang_lich_su_tra;
DROP TABLE IF EXISTS ky_nang_lich_su;

ALTER TABLE ky_nang
  DROP COLUMN IF EXISTS nguon,
  DROP COLUMN IF EXISTS nguoi_sua,
  DROP COLUMN IF EXISTS sua_luc,
  DROP COLUMN IF EXISTS ghi_chu,
  DROP COLUMN IF EXISTS duyet_boi,
  DROP COLUMN IF EXISTS duyet_luc;

DROP INDEX IF EXISTS bo_luat_chung_phien_ban_duy_nhat;
DROP INDEX IF EXISTS bo_luat_chung_mot_ban_dang_ap;

ALTER TABLE bo_luat_chung
  DROP COLUMN IF EXISTS nguon,
  DROP COLUMN IF EXISTS duyet_boi,
  DROP COLUMN IF EXISTS duyet_luc,
  DROP COLUMN IF EXISTS ghi_chu;
