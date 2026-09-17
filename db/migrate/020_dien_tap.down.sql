-- Lùi: bỏ trạng thái `dien_tap`. Dòng diễn tập còn trong sổ sẽ vi phạm ràng buộc, nên xoá
-- chúng trước — chúng là dấu vết của phép đo, không phải dữ liệu nghiệp vụ.
DELETE FROM lan_gui WHERE trang_thai = 'dien_tap';
ALTER TABLE lan_gui DROP CONSTRAINT IF EXISTS lan_gui_trang_thai_check;
ALTER TABLE lan_gui ADD CONSTRAINT lan_gui_trang_thai_check
  CHECK (trang_thai IN ('dang_gui', 'da_gui', 'khong_ro'));
