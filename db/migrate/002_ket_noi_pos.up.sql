-- ═══════════════════════════════════════════════════════════════════════════
-- 002_ket_noi_pos — KẾT NỐI POS THEO TEAM (phiếu L1-M1 ②.1)
--
-- VÌ SAO CÓ BẢNG NÀY: 01-QUYET-DINH.md §8 đòi «mỗi team có kết nối POS riêng»,
-- nhưng 19 bảng của 001_nen không có chỗ nào chứa nó — khoá POS thật đang nằm
-- trong tệp phẳng `pancake-shops.json` ở gốc repo (7 dòng {market, shop_id,
-- api_key}, đo 22/08). Tệp phẳng không mang team, không mã hoá, và mọi tiến
-- trình đọc được đĩa là đọc được khoá.
--
-- HAI RÀO Ở TẦNG CSDL (không chỉ ở code):
--   · `api_key_ma` phải là bao thư MÃ HOÁ  → CHECK ... LIKE 'v1.%'
--     Cùng cơ chế `db/khoa.js` (AES-256-GCM, khoá gốc ở biến V3_KHOA_MA_HOA)
--     đã dùng cho `cau_hinh_model.khoa_api_ma`. Code quên gọi maHoa() thì
--     INSERT đỏ ngay, không lặng lẽ ghi khoá nguyên văn vào cột.
--   · `team_id NOT NULL REFERENCES team(id)` — giống mọi bảng nghiệp vụ khác.
--
-- ⛔ Bảng này KHÔNG nằm trong `BANG_NGHIEP_VU_CHUAN` của tầng truy vấn L0-M2
--    (src/db/truy-van.js — neo 15 tên gõ tay). Cố ý: nó chứa BÍ MẬT, đọc nó là
--    đọc khoá POS, nên nó có bộ đọc/ghi RIÊNG (`src/pos/ket-noi.js`,
--    `db/di-tru/ket-noi-pos.js`) đúng theo án lệ `ghiCauHinhModel` của L0-M1 —
--    không mở nó ra cho một hàm đọc chung `SELECT *`.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE ket_noi_pos (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_id    bigint      NOT NULL REFERENCES team(id),
  -- Tên thị trường đúng như `pancake-shops.json` (Saudi/UAE/Kuwait/…): đây là
  -- khoá NGƯỜI dùng để gọi cửa POS, vì `don_hang` không có cột shop.
  market     text        NOT NULL,
  shop_id    text        NOT NULL,
  api_key_ma text        NOT NULL CHECK (api_key_ma LIKE 'v1.%'),
  bat        boolean     NOT NULL DEFAULT true,
  tao_luc    timestamptz NOT NULL DEFAULT now(),
  sua_luc    timestamptz NOT NULL DEFAULT now(),
  -- Một team KHÔNG có hai kết nối cho cùng một thị trường, và không có hai
  -- thị trường trỏ về cùng một shop — cả hai đều là lỗi cấu hình câm.
  UNIQUE (team_id, market),
  UNIQUE (team_id, shop_id)
);

CREATE INDEX ket_noi_pos_team ON ket_noi_pos (team_id);

COMMENT ON TABLE  ket_noi_pos            IS 'Kết nối POS Pancake theo team (01 §8). Khoá API lưu MÃ HOÁ, đọc qua src/pos/ket-noi.js.';
COMMENT ON COLUMN ket_noi_pos.market     IS 'Tên thị trường như pancake-shops.json — khoá gọi cửa POS.';
COMMENT ON COLUMN ket_noi_pos.api_key_ma IS 'Bao thư v1.<iv>.<tag>.<ct> (AES-256-GCM, db/khoa.js). CẤM ghi nguyên văn.';
