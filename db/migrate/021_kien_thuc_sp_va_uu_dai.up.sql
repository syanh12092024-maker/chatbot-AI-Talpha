-- ═══════════════════════════════════════════════════════════════════════════
-- 021_kien_thuc_sp_va_uu_dai — KIẾN THỨC SẢN PHẨM RA KHỎI PROMPT · ƯU ĐÃI RA KHỎI CHỮ
--
-- ─── VÌ SAO ───────────────────────────────────────────────────────────────────────────
-- Đo 17/09 trên page thật (Minty Fresh Smile KSA): `kich_ban.noi_dung_may` dài 3.540 ký
-- tự, và trong đó lẫn lộn bốn thứ khác loại — công dụng sản phẩm, bảng giá, luật bán, và
-- câu mẫu FAQ. Ba hậu quả đo được:
--   ① tốn ~1.070 token MỖI LƯỢT cho phần chữ không đổi;
--   ② khuyến mãi và phí ship chỉ tồn tại trong chữ, nên bot hứa freeship mà cửa tiền của
--      server không biết — hai bên nói hai giá, và không lớp nào bắt được;
--   ③ sửa một công dụng phải sửa giữa một khối văn xuôi, không ai soát được cái gì đã đổi.
--
-- ─── HAI BẢNG, HAI CHỦ SỞ HỮU KHÁC NHAU ──────────────────────────────────────────────
-- `san_pham_goc.kien_thuc` — thứ NGƯỜI viết: công dụng, thành phần, hợp với ai, cách dùng,
--   cảnh báo. Đặt ở bảng GỐC chứ không ở `san_pham` (biến thể POS) vì kiến thức thuộc về
--   SẢN PHẨM, không thuộc về shop: mở thị trường mới thì biến thể mới tự thừa hưởng.
--   Dùng jsonb một cột thay vì sáu cột text: các trường này đều dài, đều tuỳ ngành, và
--   thêm một mục mới không nên phải chạy migration.
--
-- `goi_gia` + năm cột — thứ BACKEND tính: giá gốc để nói «giảm bao nhiêu», khuyến mãi,
--   phí ship, cờ freeship, và cờ bật/tắt. Có chúng thì cửa tiền trả về ĐỦ thứ bot cần nói,
--   và bot thôi phải đọc khuyến mãi từ một câu văn.
--
-- ⛔ `bat` MẶC ĐỊNH `true`: mọi bậc giá đang chạy giữ nguyên hành vi sau khi migrate.
-- ⛔ `mien_ship` NULL ≠ false: NULL là «chưa khai», false là «KHÔNG miễn». Cửa tiền phải
--    phân biệt hai cái đó — nói «không freeship» khi chưa ai khai là bịa.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE san_pham_goc ADD COLUMN kien_thuc jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN san_pham_goc.kien_thuc IS
  'Kiến thức sản phẩm do NGƯỜI viết, khoá gợi ý: cong_dung · thanh_phan · hop_voi · cach_dung · canh_bao · them. Prompt Builder ghép có chọn lọc, KHÔNG dán cả khối.';

ALTER TABLE goi_gia ADD COLUMN gia_goc    numeric(14,2);
ALTER TABLE goi_gia ADD COLUMN khuyen_mai text NOT NULL DEFAULT '';
ALTER TABLE goi_gia ADD COLUMN phi_ship   numeric(14,2);
ALTER TABLE goi_gia ADD COLUMN mien_ship  boolean;
ALTER TABLE goi_gia ADD COLUMN bat        boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN goi_gia.gia_goc   IS 'Giá trước giảm, CÙNG đơn vị nhỏ với `gia`. NULL = không có giá gốc để so.';
COMMENT ON COLUMN goi_gia.phi_ship  IS 'Phí ship của bậc này, đơn vị nhỏ. NULL = chưa khai (KHÁC 0 = ship miễn phí).';
COMMENT ON COLUMN goi_gia.mien_ship IS 'NULL = chưa khai · true = miễn ship · false = KHÔNG miễn. Cấm coi NULL là false.';
COMMENT ON COLUMN goi_gia.bat       IS 'Tắt một bậc giá mà không xoá — giữ được dấu vết đơn cũ đã bán theo bậc ấy.';

-- Cửa tiền chỉ đọc bậc ĐANG BẬT; đánh chỉ mục theo đúng lối đọc đó.
CREATE INDEX goi_gia_dang_bat ON goi_gia (team_id, san_pham_id, so_luong) WHERE bat;
