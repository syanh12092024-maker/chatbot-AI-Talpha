ALTER TABLE thanh_vien_team DROP CONSTRAINT IF EXISTS thanh_vien_team_nguon;
ALTER TABLE thanh_vien_team DROP COLUMN IF EXISTS nguon;
DROP INDEX IF EXISTS nguoi_dung_ma_nv;
ALTER TABLE nguoi_dung DROP COLUMN IF EXISTS ma_nv;
