-- 031 · LL15d (02/10/2026): marketer phụ trách sản phẩm NỐI HỒ SƠ HRM. CHỈ THÊM CỘT.
--
-- `san_pham_goc.marketer` (028) là Ô CHỮ — tên gõ tay, không nối được tới tài khoản nào, nên «marketer chỉ thấy sản phẩm mình
-- phụ trách» (01 §9) không lọc được. `marketer_ma_nv` = mã nhân viên HRM (`nguoi_dung.ma_nv`, 029) của marketer được CHỌN
-- (quyết định CR-28-09c: «marketer phụ trách chọn từ hồ sơ HRM»; 30/09: một marketer cho mọi thị trường của sản phẩm).
-- `marketer` vẫn giữ TÊN hiển thị (page kế thừa tên này, báo cáo đọc nó). NULL = chưa gán / còn tên gõ tay cũ.
-- (030 để dành cho phiên MB · CR-02-10.)
ALTER TABLE san_pham_goc ADD COLUMN IF NOT EXISTS marketer_ma_nv text;
CREATE INDEX IF NOT EXISTS san_pham_goc_marketer_ma_nv ON san_pham_goc (team_id, marketer_ma_nv) WHERE marketer_ma_nv IS NOT NULL;
