-- 006_lich_su_trang_thai — cột `status_history` (jsonb) trên `don_hang` (phiếu VA-Q12,
-- Q3 — nếu làm). Số bản 006 do TỔNG cấp SẴN trong phiếu (án lệ #25 khe/trùng migration).
--
-- ⛔ KHÔNG thêm bảng nào (`grep -c '^CREATE TABLE' = 0`) ⇒ thước l0-m1 vẫn đọc 21 bảng.
--
-- ═══ ĐO TRƯỚC KHI THÊM — 23/08/2026 (SO-DIEU-HANH-THI-CONG.md §9 nợ Q3) ═══════════
-- Job chấm tỉ lệ hoàn (`src/orders/ti-le-hoan.js`) hôm nay chấm bằng ẢNH CHỤP
-- `don_hang.trang_thai_pos` vì cửa POS không lưu lịch sử chuyển trạng thái xuống cột
-- nào. Độ lệch đo được giữa «lịch sử TỪNG chạm {4,5,6,7}» và «hiện tại thuộc {4,5,6,7}»
-- là 4/5.144 đơn thật (0,08%) — nhỏ, không gấp, nhưng POS trả sẵn `status_history` trên
-- 5.144/5.144 đơn (mảng {status, old_status, editor, updated_at, …}), chỉ thiếu lượt
-- ghi. Bản này CHỈ LƯU — không hàm nào trong phiếu VA-Q12 ĐỌC cột này để tính tỉ lệ
-- hoàn (chủ đọc là `src/orders/ti-le-hoan.js`, ngoài pathspec VA-Q12, xem §9 nợ Q3
-- phần còn lại: «Xoá nốt 0,08% = cửa POS lưu status_history — đất L1-M1»).
ALTER TABLE don_hang
  ADD COLUMN IF NOT EXISTS status_history jsonb;

COMMENT ON COLUMN don_hang.status_history IS
  'Lịch sử chuyển trạng thái RAW từ POS (mảng {status, old_status, editor, updated_at, …}), ghi nguyên văn KHÔNG diễn giải. Chủ cột: src/pos/doc-don.js (phiếu VA-Q12). CHƯA có job nào đọc cột này (job chấm tỉ lệ hoàn vẫn chấm bằng ảnh chụp trang_thai_pos) — xem SO-DIEU-HANH-THI-CONG.md §9 nợ Q3.';
