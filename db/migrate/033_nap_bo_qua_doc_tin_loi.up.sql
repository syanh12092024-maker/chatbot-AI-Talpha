-- ═══════════════════════════════════════════════════════════════════════════
-- 033_nap_bo_qua_doc_tin_loi — PHIẾU GL3b: sổ bỏ-qua nhận mã `doc_tin_loi`
--
-- Cửa đọc lịch sử (`channels/messenger#docTin`) nay NÉM `LoiDocLichSu` khi Pancake không trả lịch
-- sử; bộ nạp bỏ ĐÚNG hội thoại đó ở vòng này và ghi dấu vết `doc_tin_loi`. CHECK của 023 chỉ nhận
-- sáu mã — mà `nap.js#ghiBoQua` ghi cả vòng bằng MỘT câu INSERT nhiều dòng rồi nuốt lỗi, nên MỘT
-- dòng sai CHECK xoá trắng dấu vết bỏ-qua của CẢ page trong vòng đó (màn «Tin bị lọc» mù).
--
-- ⚠️ ÁP TRÊN VPS TRƯỚC KHI CHẠY MÃ GL3b (mo-van §5): mã mới trên CSDL chưa áp 033 thì CHECK cũ tiếp
--    tục nuốt dấu vết âm thầm (vòng nạp vẫn chạy — ghiBoQua không chặn vòng).
-- Tên ràng buộc `nap_bo_qua_ly_do_check` là tên Postgres tự đặt cho CHECK cột ở 023.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE nap_bo_qua DROP CONSTRAINT IF EXISTS nap_bo_qua_ly_do_check;
ALTER TABLE nap_bo_qua ADD CONSTRAINT nap_bo_qua_ly_do_check
  CHECK (ly_do IN ('the_chan','page_noi_cuoi','da_doc','moc_cu','cho_go_xong','khong_co_psid','doc_tin_loi'));
