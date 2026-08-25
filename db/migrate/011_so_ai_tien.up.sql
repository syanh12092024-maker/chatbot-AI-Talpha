-- 011 · Sổ AI ghi TIỀN tại thời điểm gọi (G2-A6).
--
-- ═══ VÌ SAO LƯU TIỀN, KHÔNG TÍNH LẠI TỪ TOKEN ═════════════════════════════════
-- Màn «Chi phí AI» phải tìm được page nào ĐỐT TIỀN MÀ KHÔNG RA ĐƠN. Tính tiền lúc ĐỌC
-- (token × bảng giá hôm nay) là sai hai lần:
--   ① bảng giá đổi thì mọi con số LỊCH SỬ đổi theo — báo cáo tháng trước tự nhiên khác đi;
--   ② nó bắt tầng dữ liệu phải giữ một BẢN SAO của bảng giá, trong khi bảng giá thật nằm ở
--      `01-QUYET-DINH.md §7` và ở lớp model của người B. Bản sao thứ hai bao giờ cũng trôi.
-- Án lệ #18: «so hai giá trị dẫn xuất phải đóng dấu THAM SỐ DẪN XUẤT vào chỗ lưu».
--
-- Lớp model của người B ĐÃ tính sẵn `tienUsd`/`tienVnd` và đẩy qua phễu `datPheuSoAi`
-- (hợp đồng `v3/docs/hop-dong-b-voi-a.md` mục 2) — bản này chỉ mở chỗ để nhận.
--
-- `so_ai` có trigger CHỈ-INSERT; `ALTER TABLE` thêm cột KHÔNG đụng trigger đó.
-- Đo 25/08: `so_ai` = 0 dòng ⇒ không có gì để lấp ngược.

ALTER TABLE so_ai
  ADD COLUMN nha_cung_cap       text,
  ADD COLUMN tien_usd           numeric(12,6),
  ADD COLUMN tien_vnd           numeric(14,2),
  ADD COLUMN do_ngau_nhien      numeric(3,2),
  ADD COLUMN da_chuyen_du_phong boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN so_ai.tien_vnd IS
  'Tiền của CHÍNH lượt gọi này, tính bằng bảng giá ĐANG HIỆU LỰC lúc gọi. Cấm tính lại từ '
  'token lúc đọc: bảng giá đổi thì báo cáo lịch sử đổi theo (án lệ #18).';

-- Đọc theo page + khoảng thời gian là câu của màn «Chi phí AI»; đọc theo model là câu
-- «model nào rẻ hơn thật» — cả hai đều quét theo `xay_ra_luc`.
CREATE INDEX so_ai_chi_phi_theo_page ON so_ai (team_id, page_id, xay_ra_luc);
CREATE INDEX so_ai_chi_phi_theo_model ON so_ai (team_id, ma_model, xay_ra_luc);
