-- Lùi 033: bỏ mã `doc_tin_loi`. Dòng mang mã đó vi phạm CHECK cũ ⇒ XOÁ TRƯỚC rồi mới dựng lại ràng buộc
-- (không xoá thì `node db/migrate.js down` gãy «check constraint violated» — đường lùi của mo-van chết).
-- Dòng bị xoá là ảnh chụp quan sát (hội thoại đang đọc lỗi), không phải dữ liệu nghiệp vụ; vòng nạp sau tự ghi lại.
DELETE FROM nap_bo_qua WHERE ly_do = 'doc_tin_loi';
ALTER TABLE nap_bo_qua DROP CONSTRAINT IF EXISTS nap_bo_qua_ly_do_check;
ALTER TABLE nap_bo_qua ADD CONSTRAINT nap_bo_qua_ly_do_check
  CHECK (ly_do IN ('the_chan','page_noi_cuoi','da_doc','moc_cu','cho_go_xong','khong_co_psid'));
