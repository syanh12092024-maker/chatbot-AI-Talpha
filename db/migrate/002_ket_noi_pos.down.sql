-- Gỡ 002_ket_noi_pos. Chỉ bảng này — 001_nen không bị đụng.
-- Gỡ bảng là MẤT kết nối POS đã nạp; nguồn `pancake-shops.json` vẫn còn ở gốc
-- repo nên `npm run di-tru` dựng lại được (đó là lý do bộ nạp phải chạy lại được).
DROP TABLE IF EXISTS ket_noi_pos;
