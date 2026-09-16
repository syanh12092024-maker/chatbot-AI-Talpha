-- 014 · SẢN PHẨM GỐC — mã sản phẩm KHÔNG mang shop (CR-15/09)
--
-- ═══ VÌ SAO ═══════════════════════════════════════════════════════════════════════════
-- `san_pham.ma` dựng ở `src/pos/doc-danh-muc.js` là `"<shopId>:<variationId>"`. Mỗi thị
-- trường là một shop POS riêng, nên CÙNG MỘT sản phẩm có mã khác nhau ở mỗi nước. Đo
-- 15/09 trên đơn thật: Fitgum Acai Berry ra BA mã —
--     Saudi  1328205216:e4108b77-8685-487e-a712-8cc103d00eb7
--     Kuwait 1328205226:717bfb27-4a96-4c16-b934-527d0dcce8ab
--     Oman   <shop Oman>:e87acfbd-cb26-446c-b0eb-4903f861d2d5
--
-- Mà `kich_ban.san_pham_ma` (migration 010) và `ky_nang.bat_cho_nhom_sp` dùng chung vốn từ
-- đó. Hệ quả: tầng kịch bản `cap='san_pham'` thực chất là «sản phẩm TRONG MỘT SHOP», và
-- tầng `cap='nuoc'` — vốn sinh ra để tách phần khác nhau theo nước — thành dư thừa.
--
-- Đo thêm 15/09, để thấy đây không phải ca biên:
--   · 115/577 page = 19,9% đang `lost`, riêng tháng 9/2026 có 106 page;
--   · Oman đang chạy cảnh «page chết, sản phẩm chuyển page»: 82 đơn Fitgum chia cho một
--     page đã `lost` (26 đơn) và một page KHÔNG có trong `pages.json` (56 đơn);
--   · kịch bản Kuwait vs Saudi: 14/18 khối giống nhau từng byte.
-- ⇒ Sản phẩm phải SỐNG LÂU HƠN page. Lược đồ 001 cho `san_pham` đúng một cột `page_id` nên
--   nó mô hình hoá ngược chiều.
--
-- ═══ MIGRATION NÀY CHỈ THÊM, KHÔNG ĐỔI NGHĨA GÌ ═══════════════════════════════════════
-- Cột cũ giữ nguyên tuyệt đối. Sau 014, chưa mã nào đọc cột mới — bot chạy y như trước.
-- Đổi bộ giải là phiếu CR4; ghi dữ liệu thật là CR5 (điểm dừng ②).
--
-- ⛔ PHẠM VI ÂM, viết vào đây để người sau không nới: KHÔNG đụng `don_hang.san_pham_ma`
--    (4.581/4.581 phần tử dạng POS, và `src/orders/loc-trung.js` lọc đơn trùng bằng nó),
--    KHÔNG đụng `tachMaBienThe()`, KHÔNG đụng luồng tạo đơn.
--
-- ⚠️ TÊN CỘT Ở `kich_ban` LÀ `san_pham_goc_ma`, KHÔNG phải giữ tên `san_pham_ma` mang
--    nghĩa mới. Cố ý: sau CR sẽ có hai vốn từ cùng tồn tại (`don_hang.san_pham_ma` = mã
--    POS, `kich_ban.san_pham_goc_ma` = mã gốc). Một cái tên hai nghĩa là đúng kiểu nhầm
--    đã có án lệ trong dự án này; đắt hơn một cột nhưng người sau đọc là biết.

CREATE TABLE san_pham_goc (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  -- Mã NGƯỜI đặt, không sinh từ shop: `fitgum-acai-berry`. Đây là khoá của tầng kịch bản
  -- «sản phẩm» và của `ky_nang.bat_cho_nhom_sp_goc`.
  ma_goc  text        NOT NULL CHECK (ma_goc <> '' AND ma_goc !~ ':'),
  ten     text        NOT NULL DEFAULT '',
  mo_ta   text        NOT NULL DEFAULT '',
  tao_luc timestamptz NOT NULL DEFAULT now(),
  sua_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, ma_goc)
);

COMMENT ON TABLE  san_pham_goc        IS 'Sản phẩm THẬT (CR-15/09): không mang shop, không gắn page. Sống lâu hơn page.';
COMMENT ON COLUMN san_pham_goc.ma_goc IS 'Mã người đặt, CẤM chứa dấu ":" — dấu đó là của mã POS <shop>:<variation>.';

-- `san_pham` (biến thể POS) nay là CẦU NỐI: một sản phẩm gốc × một shop.
-- Nullable tới khi người soát xong (CR3) — 137 dòng hiện có chưa biết gộp thế nào, và máy
-- KHÔNG đoán hộ được: chỉ TÊN nói lên hai mã là cùng một sản phẩm, mà tên thì người gõ.
ALTER TABLE san_pham ADD COLUMN ma_goc text;

-- Khoá ngoại tổ hợp: `ma_goc` không thể gõ nhầm thành một sản phẩm không tồn tại
-- (án lệ #22 — deny-by-default, đừng để danh sách gõ tay lách van).
ALTER TABLE san_pham
  ADD CONSTRAINT san_pham_ma_goc_co_that
  FOREIGN KEY (team_id, ma_goc) REFERENCES san_pham_goc (team_id, ma_goc)
  ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX san_pham_ma_goc ON san_pham (team_id, ma_goc) WHERE ma_goc IS NOT NULL;

COMMENT ON COLUMN san_pham.ma     IS 'Khoá KỸ THUẬT "<shopId>:<variationId>" — trỏ POS để tạo đơn. KHÔNG phải khoá nghiệp vụ.';
COMMENT ON COLUMN san_pham.ma_goc IS 'Khoá NGHIỆP VỤ → san_pham_goc.ma_goc. NULL = chưa ai soát gộp (CR3).';

-- Tầng kịch bản: cột MỚI cạnh cột cũ. Rào `kich_ban_khoa_dung_cap` của 010 KHÔNG đổi ở
-- migration này — 010 vẫn đòi `san_pham_ma IS NOT NULL` cho hai tầng trên, nên dòng cũ vẫn
-- hợp lệ và dòng mới phải mang CẢ HAI trong suốt quãng chuyển. Bỏ cột cũ là một phiếu SAU,
-- cách CR5 ít nhất một tuần chạy ổn (đường lùi của CR).
ALTER TABLE kich_ban ADD COLUMN san_pham_goc_ma text;
CREATE INDEX kich_ban_san_pham_goc_ma ON kich_ban (team_id, san_pham_goc_ma)
  WHERE san_pham_goc_ma IS NOT NULL;

COMMENT ON COLUMN kich_ban.san_pham_goc_ma IS 'Khoá tầng sản phẩm/nước theo mã GỐC (CR-15/09). Cột cũ san_pham_ma còn để chuyển tiếp.';

-- Kỹ năng: cùng cách, cột mới cạnh cột cũ.
ALTER TABLE ky_nang ADD COLUMN bat_cho_nhom_sp_goc text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN ky_nang.bat_cho_nhom_sp_goc IS 'Bật cho nhóm sản phẩm GỐC (CR-15/09). Cột cũ bat_cho_nhom_sp còn để chuyển tiếp.';
