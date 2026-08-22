-- 007_idempotent_tao_don_va_don_vi_tien — CỤM VÁ VA-R2 (RF-12 · RF-9).
-- Số bản 007 do phiếu VA-R2 (§5b sổ điều hành) cấp — án lệ #25 (khe/trùng số migration
-- khi có worktree song song). CÙNG SÓNG: VA-R1/R3/R4 KHÔNG đụng db/migrate.
--
-- ⛔ KHÔNG thêm bảng nào (`grep -c '^CREATE TABLE' = 0`) ⇒ thước l0-m1 vẫn đọc 21 bảng,
--    không tự vá NEO. Chỉ thêm MỘT index idempotent + hai COMMENT khai đơn vị.
--
-- ═══ RF-12 · IDEMPOTENT «MỘT hàng chờ = NHIỀU NHẤT MỘT đơn POS thành công» ══════════
-- Ca «POST THÀNH CÔNG rồi giao dịch duyet() ROLLBACK» (repro F4): đơn THẬT đã sinh trên
-- POS, `hang_cho.don_hang_id` bị rollback trả về null, và nhật ký hai pha CÂN BẰNG nên
-- cửa (c)③ mồ-côi mù. Dấu DUY NHẤT sống qua rollback là dòng `nhat_ky` (bảng chỉ-INSERT,
-- ghi trên POOL GỐC ngoài giao dịch) mang `hanh_dong='pos_tao_don_ket_qua'` VÀ
-- `sau->>'ma_pos'` (POS đã nhận đơn). UNIQUE CỨNG ở tầng DB: KHÔNG BAO GIỜ có hai
-- `ket_qua` thành công cho cùng một hàng chờ (án lệ #31 — cửa RA đúng một cái). Lượt POS
-- bị TỪ CHỐI ghi `ket_qua` KHÔNG mang `ma_pos` nên KHÔNG rơi vào index (partial WHERE)
-- ⇒ vẫn cho thử lại, đúng nghiệp vụ. Cửa `tao-don.js` (lớp c③b) đọc chính dấu này TRƯỚC
-- POST để chặn ÊM; index là chốt cứng cuối nếu cửa bị vượt (race không lường).
CREATE UNIQUE INDEX IF NOT EXISTS nhat_ky_pos_ket_qua_thanh_cong_moi_hang_cho
  ON nhat_ky (team_id, doi_tuong_id)
  WHERE doi_tuong = 'hang_cho_tao_don'
    AND hanh_dong = 'pos_tao_don_ket_qua'
    AND (sau ->> 'ma_pos') IS NOT NULL;

-- ═══ RF-9 · ĐƠN VỊ TIỀN KHAI MỘT NGUỒN — đơn vị nhỏ POS (minor), kèm tệ ═════════════
-- `goi_gia.gia` và `don_hang.tong_tien` LƯU đơn vị nhỏ POS (= `retail_price` POS, vốn đã
-- minor), MỖI số đi kèm cột `tien_te`. Cửa tạo đơn (`src/pos/tao-don.js`) dùng THẲNG con
-- số này khi dựng `shipping_fee`, KHÔNG nhân `HE_SO_TE` lần nữa — nhân đúp = thu 1.500
-- AED thay vì 15,00. Dự án ĐA TỆ Trung Đông: hệ số khác nhau theo tệ (AED/SAR/QAR/USD
-- ×100 · KWD/OMR/BHD ×1000), độc-lập-tệ, KHÔNG quy về một tệ neo, KHÔNG có VND.
COMMENT ON COLUMN goi_gia.gia IS
  'Giá Ở ĐƠN VỊ NHỎ (minor) của POS — = retail_price POS ghi thẳng (src/pos/doc-danh-muc.js), KÈM cột tien_te. Cửa tạo đơn (src/pos/tao-don.js) dùng TRỰC TIẾP, KHÔNG nhân HE_SO_TE lần nữa (RF-9). Đa tệ độc-lập-tệ, KHÔNG VND.';
COMMENT ON COLUMN don_hang.tong_tien IS
  'Tổng tiền đơn Ở ĐƠN VỊ NHỎ (minor) của POS, KÈM cột tien_te — cùng đơn vị với goi_gia.gia. KHÔNG nhân HE_SO_TE khi dựng payload POST (RF-9).';
