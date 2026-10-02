-- 030 · CR-02-10 · MB4 (02/10/2026): MỘT BẢN — gỡ hai cột công tắc của thời hai bot.
--
-- `page.v3_ai_bat` (017) và `page.giao_bot_moi` (024) chỉ có nghĩa khi bot v1 và bot v3 cùng chạy:
-- «page đã giao cho bot mới chưa» + «bot mới có bật cho page đó không». v1 nghỉ hưu (01-QUYET-DINH §14);
-- từ MB2 cột `page.bot_ai_bat` là công tắc DUY NHẤT — worker · webhook · handler · màn Công tắc đều đọc nó.
-- Đo prod 02/10: cả hai cột có 0 page bật trên 582 ⇒ gỡ không mất giá trị nào.
-- Mã của bản lùi (MB3 · `94d7cd5`) không đọc thẳng hai cột này (chỉ `SELECT *` + hàm an toàn khi vắng).
ALTER TABLE page DROP COLUMN IF EXISTS giao_bot_moi;
ALTER TABLE page DROP COLUMN IF EXISTS v3_ai_bat;
