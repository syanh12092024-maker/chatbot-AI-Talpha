-- 013 down · trả khoá định danh khách về (team, sđt).
--
-- ⚠️ LƯỢT NÀY CÓ THỂ ĐỎ, VÀ ĐỎ LÀ ĐÚNG. Nếu dữ liệu đã có hai khách khác nước cùng
-- một số (đo được 6 cặp Saudi∩UAE trên mẫu 3.000 đơn/shop), thì index cũ KHÔNG dựng
-- lại được. Lối thoát KHÔNG PHẢI là xoá bớt một dòng `khach` — mất khách là mất lịch
-- sử đơn và tỉ lệ hoàn của người đó. Muốn lùi thật thì phải gộp có chủ đích ở tầng
-- nghiệp vụ trước, rồi mới chạy down. Để câu này ném lỗi chứ không tự dọn.

DROP INDEX khach_sdt_trong_team_nuoc;

CREATE UNIQUE INDEX khach_sdt_trong_team ON khach (team_id, so_dien_thoai)
  WHERE so_dien_thoai IS NOT NULL;

ALTER TABLE khach DROP COLUMN thi_truong;
