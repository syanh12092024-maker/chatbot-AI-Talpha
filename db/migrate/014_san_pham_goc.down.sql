-- 014 DOWN · gỡ sản phẩm gốc
--
-- ⚠️ ĐỌC TRƯỚC KHI CHẠY TRÊN CSDL THẬT — án lệ 01/09: `013.down` DROP COLUMN `thi_truong`
--    (mất dữ liệu) và ném GIỮA CHỪNG sau khi đã DROP INDEX ⇒ CSDL kẹt nửa vời. Vì thế
--    **`migrate down` KHÔNG phải đường lùi của CR-15/09.** Đường lùi là LÙI CODE, GIỮ
--    LƯỢC ĐỒ: cột mới không ai đọc thì nằm im vô hại.
--
-- Bản down này tồn tại cho SANDBOX (bộ ca + cổng nghiệm thu đo round-trip up→down→up), và
-- nó an toàn ở đó vì sandbox không có dữ liệu người dùng.
--
-- Nếu vẫn phải chạy trên CSDL có dữ liệu: nó XOÁ `san_pham.ma_goc`,
-- `kich_ban.san_pham_goc_ma`, `ky_nang.bat_cho_nhom_sp_goc` và cả bảng `san_pham_goc` —
-- tức **mất toàn bộ công gộp sản phẩm của CR3**, thứ đắt nhất của cả CR vì nó là công
-- NGƯỜI soát 137 dòng. Xuất ra tệp trước khi gỡ:
--     \copy (SELECT ma, ma_goc FROM san_pham WHERE ma_goc IS NOT NULL) TO 'gop-san-pham.csv' CSV HEADER

ALTER TABLE ky_nang DROP COLUMN IF EXISTS bat_cho_nhom_sp_goc;

DROP INDEX IF EXISTS kich_ban_san_pham_goc_ma;
ALTER TABLE kich_ban DROP COLUMN IF EXISTS san_pham_goc_ma;

DROP INDEX IF EXISTS san_pham_ma_goc;
ALTER TABLE san_pham DROP CONSTRAINT IF EXISTS san_pham_ma_goc_co_that;
ALTER TABLE san_pham DROP COLUMN IF EXISTS ma_goc;

DROP TABLE IF EXISTS san_pham_goc;
