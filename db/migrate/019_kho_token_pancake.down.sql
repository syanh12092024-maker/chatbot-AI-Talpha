-- Gỡ kho token trong CSDL. Token đã thêm qua giao diện MẤT THEO — trước khi lùi, chép
-- chúng trở lại `.env`/`pancake-tokens.json` của tiến trình bot, nếu không page định tuyến
-- qua các token đó sẽ mất cả đường đọc lẫn đường gửi.
DROP TABLE IF EXISTS token_pancake;
