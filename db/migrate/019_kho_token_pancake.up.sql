-- ═══════════════════════════════════════════════════════════════════════════
-- 019_kho_token_pancake — KHO TOKEN PANCAKE VÀO CSDL
--
-- VÌ SAO: token Pancake đang sống ở hai nơi ngoài CSDL — biến `.env` và tệp
-- `pancake-tokens.json` của tiến trình bot v1. Hệ quả đo được 17/09/2026:
--   · màn «Kết nối & token» của v3 phải gọi HTTP sang `/admin/api` của v1 để xem và sửa,
--     nên tắt v1 là màn chết; và cửa ghi ấy bị van `PANCAKE_READONLY` chắn, khiến máy dev
--     KHÔNG thêm được token bằng giao diện dù thêm token không gửi một tin nào cho ai;
--   · không có dấu vết ai thêm/bỏ token lúc nào — tệp JSON không biết người.
--
-- TOÀN HỆ, KHÔNG THEO TEAM — và đó là sự thật của nghiệp vụ, không phải đường tắt: một
-- tài khoản Pancake phủ một NHÓM PAGE, nhóm ấy có thể thuộc nhiều team. Chia theo team là
-- vỡ cơ chế dự phòng đa-token (`src/pancake.js#_pageTokIdx`). Vì vậy bảng này KHÔNG có
-- `team_id`, không vào `BANG_NGHIEP_VU` của tầng truy vấn chung, và chỉ đi qua bộ đọc/ghi
-- riêng `src/token-pancake.js` — cùng khuôn với `ket_noi_pos`, bảng cũng chứa bí mật.
-- Màn hình đã nói thẳng điều này bằng chữ (`LA_TOAN_HE` trong `kho-ket-noi.js`).
--
-- ⛔ TOKEN KHÔNG NẰM TRẦN: `token_ma` là bản mã hoá bằng `V3_KHOA_MA_HOA` (db/khoa.js),
--    y hệt `ket_noi_pos.api_key_ma`. `duoi` giữ 8 ký tự cuối để người nhận mặt được token
--    mà không cần giải mã; `token_bam` là SHA-256 để chặn thêm trùng mà không so bản rõ.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE token_pancake (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ten         text        NOT NULL DEFAULT '',   -- tên tài khoản đọc từ payload JWT
  uid         text        NOT NULL DEFAULT '',   -- uid trong JWT, để đối chiếu khi trùng tên
  duoi        text        NOT NULL DEFAULT '',   -- 8 ký tự cuối — KHÔNG đủ để dùng lại token
  het_han     timestamptz,                       -- `exp` của JWT; NULL = token không khai hạn
  token_ma    text        NOT NULL,              -- ⛔ BÍ MẬT (đã mã hoá)
  token_bam   text        NOT NULL UNIQUE,       -- SHA-256 bản rõ — chặn thêm trùng
  bat         boolean     NOT NULL DEFAULT true, -- tắt để ngừng dùng mà không mất dấu vết
  them_boi    bigint      REFERENCES nguoi_dung(id) ON DELETE SET NULL,
  tao_luc     timestamptz NOT NULL DEFAULT now(),
  sua_luc     timestamptz NOT NULL DEFAULT now()
);
-- Bộ gửi hỏi bảng này mỗi vòng làm mới: lấy token còn bật, còn hạn, cũ trước (thứ tự
-- thêm CHÍNH LÀ thứ tự dự phòng, giống hệt quy ước của kho cũ).
CREATE INDEX token_pancake_dung_duoc ON token_pancake (bat, het_han, id);
