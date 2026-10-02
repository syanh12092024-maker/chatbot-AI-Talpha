-- 032 · GSP2 (02/10/2026 · CR-02-10b mục 5e): dấu ĐỐI SOÁT của bản sao sản phẩm theo page. CHỈ THÊM CỘT — không đường tiền nào đọc.
--
-- Trạng thái «page đã chuyển xong sang sản phẩm gốc» tính theo PAGE × BẢN SAO, bằng DẤU QUYẾT ĐỊNH lưu trong dữ liệu — KHÔNG suy
-- từ «món POS đã có giá» (hai page cùng gốc × shop mang giá bản sao khác nhau: suy từ giá thì page sau tự «xong» và giá page
-- đầu thắng ngầm). Quyết định chỉ có hiệu lực với ĐÚNG gốc × shop lúc quyết (`doi_soat_goc` · `doi_soat_shop`): page bị gắn
-- lại sang gốc/shop khác thì quyết định cũ hết hiệu lực. Vị từ đọc duy nhất: `src/products/chuyen-ban-sao.js#daQuyet`.
-- Mã đọc phải chịu được CSDL CHƯA áp 032 (bài học 014/025): thiếu cột ⇒ mọi bản sao là «chưa quyết», không ném.
ALTER TABLE san_pham ADD COLUMN IF NOT EXISTS doi_soat text NULL CHECK (doi_soat IN ('chep', 'giu_gia_mon', 'bo_qua'));
ALTER TABLE san_pham ADD COLUMN IF NOT EXISTS doi_soat_luc timestamptz NULL;
ALTER TABLE san_pham ADD COLUMN IF NOT EXISTS doi_soat_goc text NULL;
ALTER TABLE san_pham ADD COLUMN IF NOT EXISTS doi_soat_shop text NULL;
COMMENT ON COLUMN san_pham.doi_soat IS
  'Chỉ dòng bản sao theo page (nguon <> ''pos'') mang giá trị; NULL = chưa quyết. chep = giá+ảnh đã chép sang món POS · giu_gia_mon = người giữ giá món POS · bo_qua = người ghi «không chuyển» (page chết/thôi bán).';
COMMENT ON COLUMN san_pham.doi_soat_luc IS 'Lúc ghi dấu doi_soat. NULL khi chưa quyết.';
COMMENT ON COLUMN san_pham.doi_soat_goc IS
  'Mã gốc (san_pham_goc.ma_goc) của page LÚC QUYẾT — chep/giu_gia_mon chỉ hiệu lực khi page còn gắn đúng gốc này. NULL với bo_qua.';
COMMENT ON COLUMN san_pham.doi_soat_shop IS
  'Shop POS (page.pos_shop_id) của page LÚC QUYẾT — chỉ hiệu lực khi page còn đúng shop này. NULL với bo_qua.';
