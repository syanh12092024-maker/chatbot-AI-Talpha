-- ═══════════════════════════════════════════════════════════════════════════
-- 026_khoi_dung_chung — CHÍNH SÁCH · FAQ · XỬ LÝ PHẢN ĐỐI CÓ NHÀ TRONG v3 (CR-28-09b · MN7)
--
-- ─── VÌ SAO ───────────────────────────────────────────────────────────────────────────
-- Ba khối này ghép vào prompt MỌI page (sau sản phẩm, trong «KNOWLEDGE BASE»). Tới 28/09 chúng
-- chỉ sống ở ba tab Google Sheet — sửa Sheet là đổi lời bot, không qua màn nào, không nhật ký.
-- Luật một nguồn (01-QUYET-DINH §8): chỗ ghi duy nhất là CSDL v3; v3 đẩy sang bot (`kb-chung.json`).
-- Người quyết chọn (a) 28/09: CHÉP nguyên văn sang v3 để sửa được (đổi từ (b) «để trống» sau khi
-- lượt thử đầu-cuối lộ ra khách là người Philippines ở Trung Đông — nội dung Tagalog có chủ ý).
--
-- ─── MỘT DÒNG MỖI TEAM, NỘI DUNG LÀ jsonb ─────────────────────────────────────────────
-- Hình dạng GIỐNG HỆT thứ bot dựng từ Sheet: {policies:[{topic,content}], faqs:[{q,a}],
-- objections:[{type,says,reply}]} — cùng nội dung thì cùng đoạn chữ từng ký tự. Lịch sử sửa đi
-- vào `nhat_ky` (trước/sau), như mọi lượt sửa khác.
-- ⛔ CHỈ THÊM.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE khoi_dung_chung (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id   bigint      NOT NULL UNIQUE REFERENCES team(id),
  noi_dung  jsonb       NOT NULL DEFAULT '{"policies":[],"faqs":[],"objections":[]}'::jsonb,
  phien_ban int         NOT NULL DEFAULT 1,
  nguoi_sua text        NOT NULL DEFAULT '',
  sua_luc   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE khoi_dung_chung IS
  'Chính sách · FAQ · Xử lý phản đối dùng chung mọi page của team. Nguồn DUY NHẤT từ CR-28-09b (MN7); bot đọc bản chép kb-chung.json khi V3_SHEET_CHI_DANH_BA=1.';
