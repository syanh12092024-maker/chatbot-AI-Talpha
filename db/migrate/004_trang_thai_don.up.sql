-- 004_trang_thai_don — hai cột cho MÁY TRẠNG THÁI ĐƠN (phiếu L3-M1, finding N2).
--
-- ĐO TRƯỚC KHI THÊM (22/08/2026, CSDL dev `aicloser_v3`, 26 đơn thật):
--   information_schema.columns của `don_hang` có ĐÚNG 14 cột, KHÔNG cột nào chứa được
--   «vì sao đơn này không gửi được WhatsApp» hay «đã thử mấy lần». Không có cột jsonb,
--   không có cột text rỗng dùng tạm. Nhét lý do vào `trang_thai_he` là hỏng chính cột
--   máy trạng thái rẽ nhánh (và hỏng index `don_hang_nguon`); nhét vào `nhat_ky` thì
--   đếm «3 lý do 1/1/1» phải DISTINCT ON trên một bảng chỉ-INSERT, và số lần thử không
--   có chỗ đứng. Nên: hai cột, khai hẹp nhất có thể.
--
-- ⛔ Số bản 004 do TỔNG cấp (003 là của phiếu L2-M1 đang chạy song song — án lệ khe/trùng
--    số migration). Bản này chỉ ALTER `don_hang`, không đụng bảng nào của 003.

ALTER TABLE don_hang
  -- Vì sao KHÔNG gửi được mẫu WhatsApp — chỉ có nghĩa khi trang_thai_he='gui_wa_loi'.
  -- Deny-by-default ở tầng CSDL: thêm lý do thứ tư PHẢI qua một migration (án lệ «danh
  -- sách gõ tay là lỗ hẹn giờ» — allow-list trên cột TEXT tự do thì giá trị mới lách van).
  -- Ba giá trị này là ba gạch nghiệm thu của 02 §L3, không phải ba giá trị tiện tay.
  ADD COLUMN ly_do_khong_gui text
    CHECK (ly_do_khong_gui IS NULL
           OR ly_do_khong_gui IN ('thieu_so_wa','mau_chua_duyet','loi_kenh')),
  -- Số lượt đã THỬ gửi (job quét lại `gui_wa_loi` có trần). Không NULL — «chưa thử lần
  -- nào» là 0, không phải «không biết»; NULL ở đây làm phép so trần im lặng thành NULL.
  ADD COLUMN so_lan_thu_wa integer NOT NULL DEFAULT 0
    CHECK (so_lan_thu_wa >= 0);

-- Bất biến ĐÔI: lý do chỉ tồn tại cùng trạng thái thất bại. Không có ràng buộc này thì
-- một đơn `da_gui_wa` vẫn đeo `ly_do_khong_gui='loi_kenh'` cũ và mọi phép đếm theo lý do
-- đọc ra số cao hơn sự thật (đúng bệnh «cổng lỏng mà log nói dối»).
ALTER TABLE don_hang
  ADD CONSTRAINT don_hang_ly_do_theo_trang_thai
  CHECK (ly_do_khong_gui IS NULL OR trang_thai_he = 'gui_wa_loi');
