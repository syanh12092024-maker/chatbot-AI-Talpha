-- ═══════════════════════════════════════════════════════════════════════════
-- 034_page_ngat_kenh — PHIẾU GL4: NGẮT CẢ PAGE 30′ khi kênh Pancake lỗi 2 lần LIÊN TIẾP (gửi HOẶC đọc), tự mở.
--
-- Hai bộ đếm (review (a) C1): đọc OK chỉ xoá chuỗi ĐỌC, gửi OK xoá CẢ HAI — page bị Meta/Pancake từ chối GỬI vẫn đọc bình
-- thường, một bộ đếm chung bị lượt đọc OK xoá trước mỗi lần gửi ⇒ không bao giờ chạm 2. `loi_*_tin_cuoi` = tin của lỗi gần
-- nhất: hai lượt thử của CÙNG một tin là MỘT lỗi (đếm theo TIN khác nhau). `ngat_den` so bằng `now()` của CSDL (không đồng
-- hồ máy app). `ngat_ly_do <> ''` = đang ngắt (hoặc đã tới giờ mà chưa mở); mở lại = xoá `ngat_ly_do`/`ngat_vi`, GIỮ
-- `ngat_den` làm dấu lần ngắt gần nhất. Ghi/đọc duy nhất ở `src/queue/ngat-page.js`.
--
-- ⚠️ ÁP TRÊN VPS TRƯỚC KHI CHẠY MÃ GL4 (mo-van §5). Mã GL4 trên CSDL chưa áp 034 thì KHÔNG ngắt page nào (bắt 42703, cảnh
--    báo MỘT lần) — không làm hỏng lượt xử, nhưng cũng không bảo vệ gì.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE page ADD COLUMN loi_doc_lien_tiep int    NOT NULL DEFAULT 0;
ALTER TABLE page ADD COLUMN loi_gui_lien_tiep int    NOT NULL DEFAULT 0;
ALTER TABLE page ADD COLUMN loi_doc_tin_cuoi  bigint NULL;
ALTER TABLE page ADD COLUMN loi_gui_tin_cuoi  bigint NULL;
ALTER TABLE page ADD COLUMN ngat_den          timestamptz NULL;
ALTER TABLE page ADD COLUMN ngat_vi           text   NOT NULL DEFAULT '' CHECK (ngat_vi IN ('', 'doc', 'gui'));
ALTER TABLE page ADD COLUMN ngat_ly_do        text   NOT NULL DEFAULT '';
COMMENT ON COLUMN page.ngat_ly_do IS
  'GL4: khác rỗng = page đang NGẮT KÊNH Pancake tới ngat_den (câu đọc được, không token/URL). Worker không rút tin của page; ngắt vì đọc thì bộ nạp cũng bỏ page.';
