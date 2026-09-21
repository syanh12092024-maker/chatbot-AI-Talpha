-- NULL preserves already allowlisted workers until the operator explicitly sets a switch.
ALTER TABLE page ADD COLUMN v3_ai_bat boolean;
COMMENT ON COLUMN page.v3_ai_bat IS 'V3 switch; NULL preserves existing allowlist behavior. Independent of legacy bot_ai_bat.';

ALTER TABLE san_pham ADD COLUMN cau_hinh_tay boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN san_pham.cau_hinh_tay IS 'Operator owns product text / availability / offers; POS sync only updates inventory.';
