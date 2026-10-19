-- Lùi 035 (khuôn 033): dòng `nap_bo_qua` mang mã `truoc_moc_bat` vi phạm CHECK cũ ⇒ XOÁ TRƯỚC rồi mới dựng lại ràng buộc (không xoá thì
-- `node db/migrate.js down` gãy «check constraint violated»). Dòng bị xoá là ảnh chụp quan sát, không phải dữ liệu nghiệp vụ.
-- ⚠️ Đường lùi của phiếu GL10 ② 5: gạt TẮT mọi page v3 qua màn (xoá khoá `_v3` trong page_gan_them.json) và kiểm `_v3` = None
--    TRƯỚC khi lùi mã + 035 — mã cũ không biết xoá khoá, lùi khi khoá còn = ai_sale im vĩnh viễn ở page đó.
DELETE FROM nap_bo_qua WHERE ly_do = 'truoc_moc_bat';
ALTER TABLE nap_bo_qua DROP CONSTRAINT IF EXISTS nap_bo_qua_ly_do_check;
ALTER TABLE nap_bo_qua ADD CONSTRAINT nap_bo_qua_ly_do_check
  CHECK (ly_do IN ('the_chan','page_noi_cuoi','da_doc','moc_cu','cho_go_xong','khong_co_psid','doc_tin_loi'));
ALTER TABLE page DROP COLUMN IF EXISTS ai_sale_ly_do;
ALTER TABLE page DROP COLUMN IF EXISTS ai_sale_trang_thai;
ALTER TABLE page DROP COLUMN IF EXISTS ai_sale_cho_den;
ALTER TABLE page DROP COLUMN IF EXISTS bot_bat_luc;
