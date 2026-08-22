-- Gỡ 003_tin_cho_xu_ly. Chỉ bảng này — 001_nen và 002_ket_noi_pos không bị đụng.
--
-- ⚠️ Gỡ bảng là MẤT mọi tin đang chờ xử lý (khác `ket_noi_pos` của 002: nguồn của nó
-- còn nguyên trong `pancake-shops.json` nên dựng lại được). Tin trong hàng đợi KHÔNG
-- có nguồn nào để dựng lại — Pancake sẽ trả lại chúng ở vòng poll sau, nhưng tin đã
-- ở 'dang_xu' thì không ai biết nó đã được trả lời hay chưa. Chỉ gỡ khi hàng đợi rỗng.
DROP TABLE IF EXISTS tin_cho_xu_ly;
