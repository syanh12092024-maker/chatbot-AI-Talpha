-- Gỡ 004_trang_thai_don. Chỉ hai cột + một CHECK của `don_hang`; 001/002/003 không đụng.
-- MẤT DỮ LIỆU: lý do không gửi + số lần thử của mọi đơn đang ở `gui_wa_loi` biến mất
-- (trạng thái `gui_wa_loi` trong `trang_thai_he` thì còn) — gỡ xong là các đơn đó không
-- đọc được vì sao hỏng nữa. Nói ra ở đây để người chạy `down` biết trước.
ALTER TABLE don_hang DROP CONSTRAINT IF EXISTS don_hang_ly_do_theo_trang_thai;
ALTER TABLE don_hang DROP COLUMN IF EXISTS ly_do_khong_gui;
ALTER TABLE don_hang DROP COLUMN IF EXISTS so_lan_thu_wa;
