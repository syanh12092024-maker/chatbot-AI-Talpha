-- 005_loc_trung_va_ti_le_hoan — cột + index cho LỌC TRÙNG CHÉO và CHẤM TỈ LỆ HOÀN
-- (phiếu L3-M2). Số bản 005 do TỔNG cấp (án lệ #25 khe/trùng số migration).
--
-- ⛔ KHÔNG thêm bảng nào (`grep -c '^CREATE TABLE' = 0`) ⇒ thước l0-m1 vẫn đọc 21 bảng,
--    không phải tự vá NEO như án lệ bản 003.
--
-- ═══ ĐO TRƯỚC KHI THÊM — 23/08/2026 ═══════════════════════════════════════════
-- (a) CSDL dev `aicloser_v3`: `khach` có 9 cột, KHÔNG có chỗ nào chứa «tầng hoàn»;
--     `ti_le_hoan numeric(5,2)` có sẵn nhưng KHÔNG khai đơn vị (0–1 hay 0–100?) và
--     không có tử/mẫu nên một con số 0.50 không tra ngược được là 1/2 hay 50/100.
-- (b) `don_hang` có 16 cột (14 của 001 + 2 của 004), KHÔNG cột nào giữ SẢN PHẨM —
--     mà nghiệm thu 02 §L3 là «đặt trang bán hàng rồi chat Messenger CÙNG SẢN PHẨM
--     → bị bắt là trùng». Không có cột này thì vế «cùng sản phẩm» không tồn tại.
-- (c) POS THẬT trả sản phẩm ở `items[].variation_id` trên 4.935/5.144 đơn (95,9%),
--     một đơn có NHIỀU dòng hàng ⇒ cột phải là MẢNG, không phải một text (đo 7/7 shop).
ALTER TABLE khach
  -- BỐN TẦNG hoàn (01 §11 «chia bốn tầng thay vì một ngưỡng») + MỘT nhãn vắng mặt.
  -- `chua_du_don` KHÔNG phải tầng thứ năm: nó là câu «chưa đủ dữ liệu để xếp tầng»,
  -- có tên riêng vì để NULL là im lặng — và im lặng ở đây đọc nhầm thành «hàng ngon».
  -- ĐO 23/08 trên 5.144 đơn thật/7 shop: 859 khách có ĐÚNG MỘT đơn đã kết và đơn đó
  -- hoàn ⇒ tỉ lệ 100%. Xếp họ vào `rui_ro_cao` bằng một điểm dữ liệu là bịa.
  ADD COLUMN IF NOT EXISTS tang_hoan text,
  -- TỬ và MẪU của chính con số `ti_le_hoan` — để một tầng luôn tra ngược được.
  -- «So DANH SÁCH, không so SỐ»: lưu mỗi tỉ lệ thì không ai kiểm được nó tính trên
  -- 2 đơn hay 200 đơn, mà đó đúng là khác biệt giữa nhiễu và bằng chứng.
  ADD COLUMN IF NOT EXISTS so_don_ket  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS so_don_hoan integer NOT NULL DEFAULT 0,
  -- Lượt chấm gần nhất. Tuổi PHÉP ĐO ≠ tuổi SỰ VIỆC (án lệ #9): thiếu cột này thì
  -- một tầng chấm từ 3 tháng trước trông y hệt tầng chấm đêm qua.
  ADD COLUMN IF NOT EXISTS cham_hoan_luc timestamptz;

ALTER TABLE don_hang
  -- Mã biến thể POS của các dòng hàng, khuôn `"<shop_id>:<variation_id>"` (cùng khoá
  -- với `san_pham.ma` của L1-M1). MẢNG vì một đơn có nhiều dòng hàng.
  -- ⚠️ NÓI THẲNG: cột này CHƯA CÓ NGƯỜI GHI — cửa POS `src/pos/doc-don.js` là chủ,
  -- đất phiếu L1-M1 (án lệ #25, đã ghi §9 sổ). `kiemTrung` xử cột rỗng bằng nhánh
  -- «mù CÓ NÓI RA» (`nghi_trung_chua_ro_san_pham`), không im lặng cho qua.
  ADD COLUMN IF NOT EXISTS san_pham_ma text[];

DO $$
BEGIN
  -- Bốn tầng + nhãn vắng mặt, deny-by-default ở TẦNG CSDL (án lệ #22: allow-list trên
  -- cột TEXT tự do là lỗ hẹn giờ — thêm tầng thứ sáu PHẢI qua một migration).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_tang_hoan_hop_le') THEN
    ALTER TABLE khach ADD CONSTRAINT khach_tang_hoan_hop_le
      CHECK (tang_hoan IS NULL OR tang_hoan IN
             ('chua_du_don','tot','binh_thuong','canh_bao','rui_ro_cao'));
  END IF;

  -- ĐƠN VỊ khai ở tầng CSDL, không phải trong một comment ai cũng quên: PHẦN TRĂM
  -- 0–100. Cột `numeric(5,2)` nhận cả 0.45 lẫn 45.00 nên nếu không kẹp thì hai người
  -- viết hai đường sẽ cùng «đúng» và lệch nhau 100 lần (đúng họ lỗi ×100 của M07).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_ti_le_hoan_phan_tram') THEN
    ALTER TABLE khach ADD CONSTRAINT khach_ti_le_hoan_phan_tram
      CHECK (ti_le_hoan IS NULL OR (ti_le_hoan >= 0 AND ti_le_hoan <= 100));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_dem_hoan_hop_le') THEN
    ALTER TABLE khach ADD CONSTRAINT khach_dem_hoan_hop_le
      CHECK (so_don_ket >= 0 AND so_don_hoan >= 0 AND so_don_hoan <= so_don_ket);
  END IF;

  -- Bất biến ĐÔI, cùng khuôn với `don_hang_ly_do_theo_trang_thai` của 004: một tầng
  -- KHÔNG được tồn tại mà không có mốc chấm ra nó, và ngược lại. Thiếu ràng buộc này
  -- thì một lượt job hỏng nửa chừng để lại tầng mồ côi không ai biết tuổi.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'khach_tang_di_kem_moc_cham') THEN
    ALTER TABLE khach ADD CONSTRAINT khach_tang_di_kem_moc_cham
      CHECK ((tang_hoan IS NULL) = (cham_hoan_luc IS NULL));
  END IF;
END $$;

COMMENT ON COLUMN khach.ti_le_hoan IS
  'Tỉ lệ hoàn/hủy tính theo PHẦN TRĂM 0–100 (KHÔNG phải phân số 0–1). Tử = so_don_hoan, mẫu = so_don_ket. Chủ cột: src/orders/ti-le-hoan.js (phiếu L3-M2).';
COMMENT ON COLUMN khach.tang_hoan IS
  'Bốn tầng của 01 §11 + nhãn chua_du_don (chưa đủ đơn ĐÃ KẾT để xếp tầng). CHỈ ĐỂ ĐỌC — không nhánh nào trong v3 chặn đơn theo cột này (quyết định CHẶN còn Chờ chốt ở 01 §11).';
COMMENT ON COLUMN don_hang.san_pham_ma IS
  'Mã biến thể POS "<shop_id>:<variation_id>" của các dòng hàng. Chủ cột: cửa POS src/pos/doc-don.js (L1-M1) — CHƯA ghi, xem §9 sổ điều hành.';

-- ═══ INDEX ════════════════════════════════════════════════════════════════════
-- (1) Tra khách theo SĐT khi hai luồng khai LỆCH ĐỊNH DẠNG. Luật chuẩn hoá SỐNG Ở
--     MỘT CHỖ DUY NHẤT là `chuanHoaSdt()` trong JS; index này CỐ Ý chỉ giữ BẢY CHỮ SỐ
--     CUỐI — một vế thô, bao rộng hơn luật thật, để câu SQL lọc được bằng index rồi
--     JS phán chính xác. Viết lại luật chuẩn hoá bằng SQL ở đây là đẻ nguồn luật thứ
--     hai (án lệ: hai nguồn một luật thì chúng trôi khỏi nhau, và trôi im lặng).
--     Vì sao BẢY CHỮ SỐ CUỐI là vế an toàn: chuẩn hoá chỉ CẮT TIỀN TỐ (+, 00, số 0
--     đầu, mã quốc gia) nên hai số bằng nhau sau chuẩn hoá luôn có đuôi giống nhau.
--     Đo 23/08 trên 5.144 đơn thật: số ngắn nhất còn 7 chữ số.
CREATE INDEX IF NOT EXISTS khach_duoi7_sdt
  ON khach (team_id, right(regexp_replace(so_dien_thoai, '[^0-9]', '', 'g'), 7))
  WHERE so_dien_thoai IS NOT NULL;

-- (2) Cửa sổ ngày của phép lọc trùng quét theo (team, khách, ngày tạo).
CREATE INDEX IF NOT EXISTS don_hang_khach_ngay
  ON don_hang (team_id, khach_id, tao_luc)
  WHERE khach_id IS NOT NULL;

-- (3) Giao mảng sản phẩm (`san_pham_ma && ARRAY[...]`) — GIN là chỉ mục của phép `&&`.
CREATE INDEX IF NOT EXISTS don_hang_san_pham_ma
  ON don_hang USING gin (san_pham_ma);
