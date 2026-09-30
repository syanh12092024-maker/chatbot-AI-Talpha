ALTER TABLE san_pham_goc DROP COLUMN IF EXISTS marketer;
DROP INDEX IF EXISTS san_pham_goc_sku;
ALTER TABLE san_pham_goc DROP COLUMN IF EXISTS sku;
DROP INDEX IF EXISTS san_pham_team_sku;
ALTER TABLE san_pham DROP COLUMN IF EXISTS sku;
