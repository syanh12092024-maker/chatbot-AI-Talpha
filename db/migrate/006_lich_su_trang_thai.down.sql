-- Gỡ 006_lich_su_trang_thai. Chỉ một cột của `don_hang`; 001–005 không đụng.
-- MẤT DỮ LIỆU: lịch sử chuyển trạng thái RAW của mọi đơn biến mất — đọc lại được bằng
-- cách gọi lại `docDon` (POS vẫn giữ `status_history`, đây không phải dữ liệu
-- duy-nhất-một-lần như nhật ký thao tác của người).
ALTER TABLE don_hang DROP COLUMN IF EXISTS status_history;
