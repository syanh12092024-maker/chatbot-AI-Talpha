-- 012 · Hai chỗ chặn sóng 2 (B-Y6 mục ⓐ và ⓑ).
--
-- ═══ ⓐ TẦNG NƯỚC CỦA TÔI ĐANG CHẾT — sửa hình dạng của chính 010 ═════════════
-- 010 (G2-A5) dựng cây `sản phẩm → (sản phẩm × nước) → page`, và ràng bằng
-- `kich_ban_khoa_dung_cap`: bản `cap='nuoc'` BẮT BUỘC có `san_pham_ma`.
--
-- Đo lại 25/08: `san_pham` = **0 dòng**. Nghĩa là tầng nước của tôi KHÔNG BAO GIỜ tới
-- được — muốn dùng nó phải có mã sản phẩm trước, mà mã sản phẩm thì chưa có cái nào.
-- Trong khi `page.thi_truong` có giá trị ở **140/514 page** (KSA 34 · UAE 32 · Kuwait 23…).
-- Tức là tôi đã treo một tầng dùng được vào một tầng chưa tồn tại.
--
-- Sửa: cho phép phạm vi **CHỈ THEO NƯỚC** (`san_pham_ma IS NULL`). Cây thành:
--
--   sản phẩm  →  (sản phẩm × nước)  →  NƯỚC  →  page
--   rộng nhất                                   hẹp nhất, thắng
--
-- Bản (sản phẩm × nước) vẫn hẹp hơn bản chỉ-nước, nên thứ tự ưu tiên không mơ hồ.

ALTER TABLE kich_ban DROP CONSTRAINT kich_ban_khoa_dung_cap;

ALTER TABLE kich_ban ADD CONSTRAINT kich_ban_khoa_dung_cap CHECK (
  (cap = 'page'     AND page_id IS NOT NULL AND san_pham_ma IS NULL     AND thi_truong IS NULL)
  OR
  -- Tầng nước: BẮT BUỘC có `thi_truong`. `san_pham_ma` thì TUỲ:
  --   có   → bản riêng cho (sản phẩm × nước), hẹp hơn
  --   NULL → bản cho CẢ NƯỚC, bất kể sản phẩm nào — đây là cái dùng được hôm nay
  (cap = 'nuoc'     AND page_id IS NULL     AND thi_truong IS NOT NULL)
  OR
  (cap = 'san_pham' AND page_id IS NULL     AND san_pham_ma IS NOT NULL AND thi_truong IS NULL)
);

-- Chỉ mục MỘT-BẢN-LIVE của 010 dùng `(team_id, san_pham_ma, thi_truong)`; với
-- `san_pham_ma IS NULL` thì hai NULL là KHÁC nhau ⇒ hai bản LIVE cùng một nước sẽ LỌT.
-- Đúng cái lỗ mà B-Y6 ⓐ cảnh báo. `COALESCE` bịt nó.
DROP INDEX kich_ban_mot_live_nuoc;
CREATE UNIQUE INDEX kich_ban_mot_live_nuoc
  ON kich_ban (team_id, coalesce(san_pham_ma, ''), thi_truong)
  WHERE trang_thai = 'LIVE' AND cap = 'nuoc';

DROP INDEX kich_ban_phien_ban_nuoc;
CREATE UNIQUE INDEX kich_ban_phien_ban_nuoc
  ON kich_ban (team_id, coalesce(san_pham_ma, ''), thi_truong, phien_ban)
  WHERE cap = 'nuoc';

-- ═══ ⓑ LỚP TRẢ LỜI 0 ĐỒNG ════════════════════════════════════════════════════
-- Tiêu chí nghiệm thu sóng 2: «lớp 0 đồng chặn ≥33% lưu lượng». Hôm nay ba trường
-- `fastLanePrice`/`fastLaneShip`/`fastLaneHowto` nằm trong `kich_ban.noi_dung_nguoi`
-- THEO TỪNG PAGE ⇒ 514 page là 514 lần gõ lại cùng một câu trả lời phí ship, và không
-- có chỗ nào đếm được «chặn bao nhiêu %».
CREATE TABLE mau_0_dong (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id    bigint      NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  ma         text        NOT NULL,
  ten        text        NOT NULL,
  -- Bộ từ khoá kích hoạt. Đối chiếu với bộ từ khoá Botcake là việc của màn hình; ở đây
  -- chỉ lưu. `text[]` chứ không phải chuỗi phân tách — để truy vấn bằng `&&` được.
  tu_khoa    text[]      NOT NULL DEFAULT '{}',
  noi_dung   text        NOT NULL,
  -- Phạm vi: NULL = cả team. Dùng CHUNG vốn từ với `ky_nang.bat_cho_nhom_sp`.
  bat_cho_nhom_sp text[] NOT NULL DEFAULT '{}',
  bat        boolean     NOT NULL DEFAULT false,
  -- Đếm ngay tại dòng: mỗi lượt lớp 0 đồng trả lời thay model thì +1. Đây là chỗ trả lời
  -- câu «chặn được bao nhiêu» mà không phải suy từ `so_ai` (ở đó lượt 0 đồng KHÔNG đẻ
  -- dòng nào — vì không gọi model — nên đếm ở `so_ai` là đếm cái không tồn tại).
  so_lan_chan bigint     NOT NULL DEFAULT 0,
  chan_lan_cuoi timestamptz,
  nguoi_sua  text        NOT NULL DEFAULT '',
  tao_luc    timestamptz NOT NULL DEFAULT now(),
  sua_luc    timestamptz,
  UNIQUE (team_id, ma)
);

CREATE INDEX mau_0_dong_dang_bat ON mau_0_dong (team_id) WHERE bat;
-- GIN cho phép hỏi «mẫu nào khớp từ khoá này» bằng `tu_khoa && ARRAY[...]`.
CREATE INDEX mau_0_dong_tu_khoa ON mau_0_dong USING gin (tu_khoa);

COMMENT ON COLUMN mau_0_dong.so_lan_chan IS
  'Số lượt mẫu này trả lời THAY model. Đếm ở đây chứ không suy từ so_ai: lượt 0 đồng không '
  'gọi model nên KHÔNG đẻ dòng so_ai nào — đếm ở đó là đếm cái không tồn tại.';
