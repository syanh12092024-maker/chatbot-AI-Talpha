-- 030 · lùi: thêm lại hai cột (giá trị cũ không khôi phục — mọi page đều chưa bật lúc gỡ, đo 02/10).
ALTER TABLE page ADD COLUMN IF NOT EXISTS v3_ai_bat boolean;
COMMENT ON COLUMN page.v3_ai_bat IS 'V3 switch; NULL preserves existing allowlist behavior. Independent of legacy bot_ai_bat.';
ALTER TABLE page ADD COLUMN IF NOT EXISTS giao_bot_moi boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN page.giao_bot_moi IS
  'Page đã được GIAO cho bot mới (v3) chưa. Chỉ có hiệu lực khi V3_GIAO_PAGE_TREN_MAN=1; '
  'vắng cờ thì worker vẫn đọc V3_PAGE_XU_LY. Khác v3_ai_bat: cột kia là BẬT/TẮT trong số page đã giao.';
