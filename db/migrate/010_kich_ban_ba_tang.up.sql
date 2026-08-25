-- 010 · KỊCH BẢN BA TẦNG có KẾ THỪA (G2-A5).
--
-- ═══ CÂY ══════════════════════════════════════════════════════════════════════
--   sản phẩm  →  (sản phẩm × nước)  →  page
--   rộng nhất                          hẹp nhất, thắng
--
-- Page không có bản riêng thì DÙNG bản tầng trên. Và API phải NÓI RÕ đang kế thừa từ tầng
-- nào — trả về im lặng là marketer sửa nhầm tầng sản phẩm rồi đổi kịch bản của mọi page
-- dưới nó mà không biết.
--
-- ═══ ĐO TRƯỚC KHI THIẾT KẾ — hai tầng trên HÔM NAY GẦN NHƯ KHÔNG TỚI ĐƯỢC ═════
-- Đo 25/08 trên `aicloser_v3`:
--   · `san_pham`            = 0 dòng    ⇒ tầng SẢN PHẨM chưa có khoá nào để móc vào
--   · `page.thi_truong`     = 140/514   ⇒ tầng NƯỚC chỉ với tới 27% số page
--   · `page.nganh_hang`     = 0/514     ⇒ KHÔNG dùng làm khoá thay thế được
--   · `kich_ban`            = 71 bản / 70 page có LIVE ⇒ 444 page chưa có bản riêng
--
-- Nghĩa là: cấu trúc dựng đúng, nhưng hôm nay hầu hết page rơi xuống «không kế thừa được
-- từ đâu cả». Đó KHÔNG phải lỗi — đó là trạng thái thật, và bộ giải phải NÓI RA nó thay vì
-- trả `null` (bài học 3 GD2: màn rỗng phải phân biệt «xong hết rồi» với «chưa cài xong»).

ALTER TABLE kich_ban
  ADD COLUMN cap         text NOT NULL DEFAULT 'page'
             CHECK (cap IN ('san_pham', 'nuoc', 'page')),
  -- Khoá tầng sản phẩm. Dùng CHUNG vốn từ với `ky_nang.bat_cho_nhom_sp` (= `san_pham.ma`),
  -- để cả hệ chỉ có MỘT cách gọi tên «nhóm sản phẩm».
  ADD COLUMN san_pham_ma text,
  -- Khoá tầng nước = `page.thi_truong` (KSA · UAE · Kuwait · Bahrain · Khác…).
  ADD COLUMN thi_truong  text;

ALTER TABLE kich_ban ALTER COLUMN page_id DROP NOT NULL;

-- Mỗi tầng phải mang ĐỦ khoá của nó và KHÔNG mang khoá của tầng khác. Không có rào này thì
-- một dòng `cap='nuoc'` kèm `page_id` là một dòng không ai đọc ra được nó thuộc về đâu.
ALTER TABLE kich_ban ADD CONSTRAINT kich_ban_khoa_dung_cap CHECK (
  (cap = 'page'     AND page_id IS NOT NULL AND san_pham_ma IS NULL     AND thi_truong IS NULL)
  OR
  (cap = 'nuoc'     AND page_id IS NULL     AND san_pham_ma IS NOT NULL AND thi_truong IS NOT NULL)
  OR
  (cap = 'san_pham' AND page_id IS NULL     AND san_pham_ma IS NOT NULL AND thi_truong IS NULL)
);

-- ═══ ĐÚNG MỘT BẢN LIVE MỖI PHẠM VI ════════════════════════════════════════════
-- Nghiệm thu sóng 2 ghi thẳng: «đúng MỘT bản LIVE mỗi page — bản thứ hai bật lên thì bản
-- cũ tự hạ». Cho tầng trên cũng vậy. Đây là rào ở tầng CSDL, không phải lời hứa của code:
-- §9 đã có án lệ `napKichBan` UPSERT chết khi nguồn có ≥2 LIVE/page (RF-19).
-- ⚠️ KHÔNG thêm chỉ mục cho tầng page: `kich_ban_live_moi_page` đã có sẵn từ migration
--    001 (`ON kich_ban (page_id) WHERE trang_thai='LIVE'`). Thêm cái thứ hai nói cùng một
--    chuyện là đúng cái «bản khai thứ hai» mà cả sóng này đang dọn. Nó vẫn ràng đúng sau
--    010: chỉ dòng `cap='page'` mới có `page_id` khác NULL (rào `kich_ban_khoa_dung_cap`),
--    và hai NULL trong Postgres là khác nhau nên dòng tầng trên không đụng vào nó.

CREATE UNIQUE INDEX kich_ban_mot_live_nuoc
  ON kich_ban (team_id, san_pham_ma, thi_truong) WHERE trang_thai = 'LIVE' AND cap = 'nuoc';

CREATE UNIQUE INDEX kich_ban_mot_live_san_pham
  ON kich_ban (team_id, san_pham_ma) WHERE trang_thai = 'LIVE' AND cap = 'san_pham';

-- `UNIQUE (page_id, phien_ban)` sẵn có chỉ ràng được tầng page (page_id NULL thì hai NULL
-- là khác nhau). Hai tầng trên cần khoá phiên bản riêng.
CREATE UNIQUE INDEX kich_ban_phien_ban_nuoc
  ON kich_ban (team_id, san_pham_ma, thi_truong, phien_ban) WHERE cap = 'nuoc';

CREATE UNIQUE INDEX kich_ban_phien_ban_san_pham
  ON kich_ban (team_id, san_pham_ma, phien_ban) WHERE cap = 'san_pham';

CREATE INDEX kich_ban_tra_theo_cap ON kich_ban (team_id, cap, trang_thai);

COMMENT ON COLUMN kich_ban.cap IS
  'Tầng của bản này trong cây sản phẩm → nước → page. Tầng HẸP NHẤT có bản LIVE thì thắng; '
  'bộ giải `docKichBanChoPage()` (src/db/kich-ban.js) luôn khai NGUỒN, không trả im lặng.';
