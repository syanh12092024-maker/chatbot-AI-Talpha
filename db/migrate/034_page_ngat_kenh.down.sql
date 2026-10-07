-- Lùi 034: bỏ đúng bảy cột ngắt kênh của GL4. Mã GL4 còn chạy trên CSDL đã lùi ⇒ «không ngắt» (bắt 42703) — không hỏng lượt xử.
ALTER TABLE page DROP COLUMN IF EXISTS ngat_ly_do;
ALTER TABLE page DROP COLUMN IF EXISTS ngat_vi;
ALTER TABLE page DROP COLUMN IF EXISTS ngat_den;
ALTER TABLE page DROP COLUMN IF EXISTS loi_gui_tin_cuoi;
ALTER TABLE page DROP COLUMN IF EXISTS loi_doc_tin_cuoi;
ALTER TABLE page DROP COLUMN IF EXISTS loi_gui_lien_tiep;
ALTER TABLE page DROP COLUMN IF EXISTS loi_doc_lien_tiep;
