-- 015 · PAGE KHAI NÓ BÁN SẢN PHẨM NÀO (CR-15/09 · phiếu 015)
--
-- ═══ VÌ SAO — VÀ VÌ SAO TÔI ĐÃ SAI Ở 014 ═════════════════════════════════════════════
-- Ở migration 014 (cùng CR) tôi từ chối thêm cột này, với lý lẽ: «`san_pham.page_id` đã nối
-- page với sản phẩm rồi; thêm `page.ma_goc` là khai cùng một sự thật ở hai chỗ».
--
-- Lý lẽ ấy dựa trên một TIỀN ĐỀ SAI. Đo 16/09 trên `pages.json`:
--
--     shop 1635200759 (UAE)     35 page
--     shop 1328205226 (Kuwait)  26 page
--     shop 1328205216 (Saudi)   23 page
--     shop 1021271617 (Qatar)   10 page
--     shop 100943483  (Bahrain)  7 page
--     shop 1942200986 (Oman)     7 page
--
-- **KHÔNG shop nào có 1 page.** Mà `src/pos/doc-danh-muc.js:69` chỉ gán `page_id` khi shop
-- có ĐÚNG MỘT page:
--     const pageId = pagesCuaShop.length === 1 ? pagesCuaShop[0].id : null;
-- ⇒ `san_pham.page_id` là **NULL cho mọi sản phẩm, luôn luôn**. Nó không nối gì cả.
--
-- Và nó KHÔNG THỂ nối: một biến thể POS ở shop Kuwait được **26 page** cùng bán. Đó là quan
-- hệ N–M bị nhét vào một cột 1–1. Nên `page.san_pham_goc_ma` không phải bản sao thứ hai —
-- nó là chỗ DUY NHẤT chứa được sự thật «page này bán sản phẩm nào».
--
-- Ba thứ đang tắc mà cột này mở ra:
--   ① tầng kịch bản `cap='san_pham'` (migration 010) — `khoaTangCuaPage` tra
--      `san_pham WHERE page_id` nên nó CHƯA BAO GIỜ với tới được page nào;
--   ② cột «Sản phẩm gốc» của màn Page & bot (014/CR6) — hôm nay trả 409 cho mọi page;
--   ③ cảnh «page chết → page mới khai cùng sản phẩm là kế thừa hết kịch bản» — 19,9% page
--      đang `lost`, nên đây là đường chính, không phải ca biên.
--
-- ═══ CHỈ THÊM ═════════════════════════════════════════════════════════════════════════
-- `san_pham.page_id` GIỮ NGUYÊN, không xoá, không đổi. Nó đang NULL sạch nên ngừng đọc nó
-- không mất gì; bỏ cột là phiếu khác, sau này, khi chắc không ai còn đọc.

ALTER TABLE page ADD COLUMN san_pham_goc_ma text;

-- Khoá ngoại tổ hợp — cùng lý do với `san_pham.ma_goc` ở 014: một mã gõ nhầm không được
-- phép thành một sản phẩm ma (án lệ #22).
ALTER TABLE page
  ADD CONSTRAINT page_san_pham_goc_co_that
  FOREIGN KEY (team_id, san_pham_goc_ma) REFERENCES san_pham_goc (team_id, ma_goc)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- Tra ngược «những page nào bán sản phẩm này» — dùng ở màn và ở lượt page chết chuyển page.
CREATE INDEX page_san_pham_goc_ma ON page (team_id, san_pham_goc_ma)
  WHERE san_pham_goc_ma IS NOT NULL;

COMMENT ON COLUMN page.san_pham_goc_ma IS
  'Page này bán sản phẩm GỐC nào (015). Khoá của tầng kịch bản «sản phẩm»/«nước». NULL = chưa gán. Thay cho san_pham.page_id vốn NULL sạch vì mọi shop đều nhiều page.';
