-- Gỡ 011 · bỏ cột tiền khỏi Sổ AI.
--
-- ⚠️ LÀM MẤT SỐ TIỀN ĐÃ GHI, và không dựng lại được: tiền được đóng dấu theo bảng giá
--    HIỆU LỰC LÚC GỌI, tính lại từ token bằng bảng giá hôm nay ra một con số KHÁC.
DROP INDEX IF EXISTS so_ai_chi_phi_theo_model;
DROP INDEX IF EXISTS so_ai_chi_phi_theo_page;

ALTER TABLE so_ai
  DROP COLUMN IF EXISTS nha_cung_cap,
  DROP COLUMN IF EXISTS tien_usd,
  DROP COLUMN IF EXISTS tien_vnd,
  DROP COLUMN IF EXISTS do_ngau_nhien,
  DROP COLUMN IF EXISTS da_chuyen_du_phong;
