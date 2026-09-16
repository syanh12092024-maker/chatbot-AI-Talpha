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
  -- SỐ HIỆU nội bộ mà đội vận hành gõ vào ĐẦU TÊN sản phẩm trên POS: `125 - Fitgum Acai
  -- Berry`. Đo 15/09 trên danh mục 7 shop: 173 số hiệu, **78 số có mặt ở >1 shop**, và
  -- **75/78 tên khớp nhau** giữa các shop (3 cái còn lại chỉ lệch chính tả: `Birth Stone
  -- Set` / `Birthstone Set` / `Birth stone set`). Tức số hiệu là khoá gộp CHẮC HƠN so tên.
  --
  -- Vì sao không gộp bằng tên: Saudi có cả `125 - Fitgum Acai Berry` VÀ `128 - Fitgum
  -- Organic Barley` — tên gần giống mà là hai sản phẩm. So tên thì gộp nhầm; số thì không.
  --
  -- NULLABLE: 113 biến thể trong danh mục KHÔNG có số đầu tên, chúng phải do người gán.
  so_hieu text        CHECK (so_hieu IS NULL OR so_hieu ~ '^[0-9]{1,4}$'),
  tao_luc timestamptz NOT NULL DEFAULT now(),
  sua_luc timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, ma_goc)
);

-- Một số hiệu = một sản phẩm gốc. Đây là cái làm cho «mở thị trường mới» KHÔNG cần người:
-- biến thể mới của shop mới mang cùng số hiệu ⇒ `doc-danh-muc.js` tự nối `ma_goc`.
CREATE UNIQUE INDEX san_pham_goc_so_hieu ON san_pham_goc (team_id, so_hieu)
  WHERE so_hieu IS NOT NULL;

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

-- Tầng kịch bản: cột MỚI cạnh cột cũ. Bỏ cột cũ là một phiếu SAU, cách CR5 ít nhất một
-- tuần chạy ổn (đường lùi của CR).
ALTER TABLE kich_ban ADD COLUMN san_pham_goc_ma text;

-- ⚠️ PHẢI NỚI RÀO CỦA 010 — phát hiện lúc viết thước, không phải lúc thiết kế.
--
-- Bản đầu của migration này giữ nguyên `kich_ban_khoa_dung_cap` và ghi «dòng mới phải mang
-- CẢ HAI khoá trong quãng chuyển». Viết ca test mới thì thấy câu đó VÔ NGHĨA: một kịch bản
-- dùng CHUNG cho Saudi · Kuwait · Oman thì `san_pham_ma` phải điền cái gì? Không có một mã
-- POS nào đại diện cho ba shop — đó chính là lý do CR này tồn tại. Rào cũ khoá đúng thứ nó
-- sinh ra để mở.
--
-- ⚠️ VÀ NỚI TỪ BẢN CỦA **012**, KHÔNG PHẢI BẢN 010 — tôi viết sai chỗ này lần đầu và bộ ca
--    K17/K18/K19 bắt được. 012 đã nới `cap='nuoc'` cho phép `san_pham_ma IS NULL` («bản cho
--    CẢ NƯỚC, bất kể sản phẩm nào») vì lúc ấy `san_pham` còn 0 dòng. Chép lại rào theo bản
--    010 là xoá lặng lẽ tầng «chỉ nước» — tầng duy nhất dùng được hồi 25/08.
--    📌 Bài học: rào của một bảng là TỔNG của mọi migration đã sửa nó, không phải bản khai
--    ở migration đầu tiên. Đọc bản MỚI NHẤT trước khi viết lại.
--
-- Nới: tầng `san_pham` nhận «CÓ ÍT NHẤT MỘT trong hai khoá». Tầng `nuoc` giữ đúng 012 —
-- chỉ bắt buộc `thi_truong`, hai khoá sản phẩm đều tuỳ. `cap='page'` vẫn KHÔNG được mang
-- khoá sản phẩm nào, kể cả khoá mới.
ALTER TABLE kich_ban DROP CONSTRAINT kich_ban_khoa_dung_cap;
ALTER TABLE kich_ban ADD CONSTRAINT kich_ban_khoa_dung_cap CHECK (
  (cap = 'page'     AND page_id IS NOT NULL
                    AND san_pham_ma IS NULL AND san_pham_goc_ma IS NULL
                    AND thi_truong IS NULL)
  OR
  (cap = 'nuoc'     AND page_id IS NULL AND thi_truong IS NOT NULL)
  OR
  (cap = 'san_pham' AND page_id IS NULL
                    AND (san_pham_ma IS NOT NULL OR san_pham_goc_ma IS NOT NULL)
                    AND thi_truong IS NULL)
);

-- Và ĐÚNG MỘT BẢN LIVE cho phạm vi theo khoá GỐC — song song với hai chỉ mục của 010 theo
-- khoá POS. Thiếu chỗ này thì hai bản LIVE cùng `(team, ma_goc)` cùng tồn tại, và bộ giải
-- chọn bản nào là do `ORDER BY` quyết — đúng kiểu hỏng im lặng mà 010 dựng chỉ mục để chặn.
CREATE UNIQUE INDEX kich_ban_mot_live_goc_san_pham
  ON kich_ban (team_id, san_pham_goc_ma)
  WHERE trang_thai = 'LIVE' AND cap = 'san_pham' AND san_pham_goc_ma IS NOT NULL;
-- Tầng nước theo khoá gốc: lọc `IS NOT NULL` để KHÔNG đụng chỉ mục «chỉ nước» của 012
-- (`coalesce(san_pham_ma,'')`). Hai chỉ mục canh hai phạm vi khác nhau, không chồng nhau.
CREATE UNIQUE INDEX kich_ban_mot_live_goc_nuoc
  ON kich_ban (team_id, san_pham_goc_ma, thi_truong)
  WHERE trang_thai = 'LIVE' AND cap = 'nuoc' AND san_pham_goc_ma IS NOT NULL;
CREATE INDEX kich_ban_san_pham_goc_ma ON kich_ban (team_id, san_pham_goc_ma)
  WHERE san_pham_goc_ma IS NOT NULL;

COMMENT ON COLUMN kich_ban.san_pham_goc_ma IS 'Khoá tầng sản phẩm/nước theo mã GỐC (CR-15/09). Cột cũ san_pham_ma còn để chuyển tiếp.';

-- Kỹ năng: cùng cách, cột mới cạnh cột cũ.
ALTER TABLE ky_nang ADD COLUMN bat_cho_nhom_sp_goc text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN ky_nang.bat_cho_nhom_sp_goc IS 'Bật cho nhóm sản phẩm GỐC (CR-15/09). Cột cũ bat_cho_nhom_sp còn để chuyển tiếp.';
