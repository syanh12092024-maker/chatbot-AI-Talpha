-- ═══════════════════════════════════════════════════════════════════════════
-- 020_dien_tap — TRẠNG THÁI «DIỄN TẬP» CHO SỔ GỬI
--
-- Mục đích: chạy bot trên hội thoại THẬT để đo (hiểu đúng không · tư vấn có được không ·
-- trả lời nhanh không) mà KHÔNG gửi cho khách một chữ nào.
--
-- Vì sao chỉ cần một trạng thái mới, không cần bảng mới: `src/queue/lan-gui.js#bocCuaGuiBen`
-- vốn đã ghi NỘI DUNG ĐỊNH GỬI vào `lan_gui` TRƯỚC khi gọi mạng (để chống gửi trùng sau sự
-- cố). Tức «tin bot định gửi» đã nằm sẵn trong sổ — diễn tập chỉ là: ghi xong thì DỪNG, đừng
-- gọi mạng, và đánh dấu để không ai nhầm nó với một lượt gửi thật hay một lượt chưa rõ.
--
-- ⚠️ `dien_tap` KHÁC `dang_gui`: `dang_gui` nghĩa là ĐÃ bắt đầu gửi và chưa biết kết quả —
--    dòng đó bắt người đi đối chiếu kênh. `dien_tap` nghĩa là CHẮC CHẮN không có gì bay ra.
--    Gộp hai cái làm một là đẻ việc đối chiếu giả cho mỗi lượt đo.
--
-- Phụ thuộc: bảng `lan_gui` do 016 tạo.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE lan_gui DROP CONSTRAINT IF EXISTS lan_gui_trang_thai_check;
ALTER TABLE lan_gui ADD CONSTRAINT lan_gui_trang_thai_check
  CHECK (trang_thai IN ('dang_gui', 'da_gui', 'khong_ro', 'dien_tap'));
