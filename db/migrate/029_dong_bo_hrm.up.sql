-- 029 · LL15b (02/10/2026): tài khoản + vai ĐỒNG BỘ từ HRM (BigQuery levelup-465304). CHỈ THÊM CỘT.
--
-- `nguoi_dung.ma_nv` — mã nhân viên HRM (`dim_employee.emp_code`) của tài khoản. NULL = tài khoản tạo tay: lượt đồng bộ KHÔNG
--   khoá/mở khoá nó. Một mã chỉ gắn MỘT tài khoản.
-- `thanh_vien_team.nguon` — 'hrm' = dòng cấp vai do lượt đồng bộ tạo, và CHỈ những dòng này lượt đồng bộ được rút; 'tay' = người
--   cấp ở màn Người và team (mặc định — mọi dòng đang có là 'tay').
ALTER TABLE nguoi_dung ADD COLUMN IF NOT EXISTS ma_nv text;
CREATE UNIQUE INDEX IF NOT EXISTS nguoi_dung_ma_nv ON nguoi_dung (ma_nv) WHERE ma_nv IS NOT NULL;

ALTER TABLE thanh_vien_team ADD COLUMN IF NOT EXISTS nguon text NOT NULL DEFAULT 'tay';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'thanh_vien_team_nguon') THEN
    ALTER TABLE thanh_vien_team ADD CONSTRAINT thanh_vien_team_nguon CHECK (nguon IN ('tay', 'hrm'));
  END IF;
END $$;
