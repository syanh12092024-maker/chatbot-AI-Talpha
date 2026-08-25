-- Gỡ 008 · trả khoá API về từng dòng vai trò của `cau_hinh_model`.
--
-- Chiều xuống KHÔNG mất khoá: rót ngược từ `khoa_nha` vào MỌI dòng vai trò dùng nhà đó
-- (một khoá → nhiều bản, đúng hình dạng cũ, kể cả cái tật hai-bản mà 008 sinh ra để vá).
-- Rào `LIKE 'v1.%'` dựng lại NGUYÊN VĂN như 001 — gỡ mà làm mất rào thì lượt `up` sau
-- chạy trên một cột đã hở, và cột "đã mã hoá" chỉ còn là lời khai.

ALTER TABLE cau_hinh_model
  ADD COLUMN khoa_api_ma text
  CHECK (khoa_api_ma IS NULL OR khoa_api_ma LIKE 'v1.%');

UPDATE cau_hinh_model c
   SET khoa_api_ma = k.khoa_api_ma
  FROM khoa_nha k
 WHERE k.team_id = c.team_id
   AND k.nha_cung_cap = c.nha_cung_cap;

DROP TABLE khoa_nha;
