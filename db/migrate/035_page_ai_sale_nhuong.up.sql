-- ═══════════════════════════════════════════════════════════════════════════
-- 035_page_ai_sale_nhuong — PHIẾU GL10: bot v3 tự bảo ai_sale (pancake-tool) nhường page · chỉ trả lời tin SAU mốc bật
--
-- Bật page ⇒ v3 ghi khoá `_v3.<page_id>` vào `page_gan_them.json` của pancake-tool rồi CHỜ ai_sale nhường (15′, ai_sale tra lại
-- danh sách page mỗi 600 s) — worker xét trạng thái trên dòng `page` (`src/queue/ai-sale-nhuong.js`, chỗ DUY NHẤT đọc/ghi tệp đó).
--   · `bot_bat_luc`        — mốc bật lần gần nhất (đồng hồ CSDL). Bộ nạp bỏ hội thoại/tin khách đến TRƯỚC mốc này.
--   · `ai_sale_cho_den`    — chưa tới giờ này thì page KHÔNG vào danh sách nạp/rút của worker.
--   · `ai_sale_trang_thai` — '' (chưa từng ghi khoá / đã tắt sạch) · cho · da_nhuong · chua_nhuong · mat_khoa · loi_tep · gan_tay · xoa_hong.
--   · `ai_sale_ly_do`      — câu đọc được của lần chuyển trạng thái gần nhất (không dòng log ai_sale, không tên khách).
-- `nap_bo_qua` nhận thêm mã `truoc_moc_bat` (tin khách đến trước lúc bật bot — bot không trả lời tin cũ).
--
-- CHỈ THÊM cột + nới CHECK. KHÔNG điền ngược: page đang bật lúc áp 035 có `ai_sale_cho_den` NULL ⇒ không vào danh sách worker tới khi
-- người gạt lại (prod 19/10: 0/582 page bật).
--
-- ⚠️ ÁP TRÊN VPS TRƯỚC KHI CHẠY MÃ GL10 (mo-van §5). Mã GL10 trên CSDL chưa áp 035: worker không trả lời page nào (bắt 42703, cảnh
--    báo MỘT lần), cổng bật chặn «CSDL chưa áp migration 035», tắt vẫn chạy.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE page ADD COLUMN bot_bat_luc        timestamptz NULL;
ALTER TABLE page ADD COLUMN ai_sale_cho_den    timestamptz NULL;
ALTER TABLE page ADD COLUMN ai_sale_trang_thai text NOT NULL DEFAULT ''
  CONSTRAINT page_ai_sale_trang_thai_check
  CHECK (ai_sale_trang_thai IN ('', 'cho', 'da_nhuong', 'chua_nhuong', 'mat_khoa', 'loi_tep', 'gan_tay', 'xoa_hong'));
ALTER TABLE page ADD COLUMN ai_sale_ly_do      text NOT NULL DEFAULT '';
COMMENT ON COLUMN page.ai_sale_trang_thai IS
  'GL10: trạng thái nhường page của bot ai_sale (pancake-tool). Chỉ da_nhuong mới được worker nạp/rút. Ghi ở setPage (bật/tắt) và worker (vòng nạp, UPDATE có điều kiện).';
COMMENT ON COLUMN page.bot_bat_luc IS
  'GL10: mốc bật bot lần gần nhất (now() của CSDL). Bộ nạp chỉ nạp tin khách CHỨNG MINH được là đến sau mốc này (giờ Pancake là UTC không múi).';

ALTER TABLE nap_bo_qua DROP CONSTRAINT IF EXISTS nap_bo_qua_ly_do_check;
ALTER TABLE nap_bo_qua ADD CONSTRAINT nap_bo_qua_ly_do_check
  CHECK (ly_do IN ('the_chan','page_noi_cuoi','da_doc','moc_cu','cho_go_xong','khong_co_psid','doc_tin_loi','truoc_moc_bat'));
