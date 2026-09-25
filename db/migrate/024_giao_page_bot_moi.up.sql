-- ═══════════════════════════════════════════════════════════════════════════
-- 024_giao_page_bot_moi — «PAGE NÀY THUỘC BOT NÀO» CHUYỂN TỪ FILE MÁY CHỦ VÀO CSDL
--
-- ─── VÌ SAO ───────────────────────────────────────────────────────────────────────────
-- Việc «đưa một page từ bot cũ sang bot mới» hôm nay là: SSH vào máy chủ → sửa dòng
-- `V3_PAGE_XU_LY` trong `.env` → khởi động lại dịch vụ. Đó là **việc ngoài giao diện lớn
-- nhất còn lại** của kế hoạch giao diện (`docs/v3/09-KE-HOACH-GIAO-DIEN.md` mục 8 · Q1), và
-- nó chặn cả GD2 lẫn GD3.
--
-- ─── VÌ SAO KHÔNG PHẢI `v3_ai_bat` (017) ──────────────────────────────────────────────
-- Hai câu hỏi khác nhau, và gộp chúng vào một cột là mất một câu:
--   · `giao_bot_moi` — page này THUỘC con bot nào (quyền sở hữu). Bot cũ buông, bot mới nhặt.
--   · `v3_ai_bat`    — trong số page đã thuộc bot mới, con bot ấy có đang BẬT cho page này không.
-- Page đã giao mà chưa bật = «tạm nghỉ», và đó là một trạng thái hợp lệ, không phải lỗi.
--
-- ─── VẮNG = ĐÓNG, KHÔNG ĐỔI HÀNH VI HÔM NAY ───────────────────────────────────────────
-- Cột này CHỈ có hiệu lực khi `V3_GIAO_PAGE_TREN_MAN=1` (khai ở
-- `docs/v3/ban-giao/bien-moi-truong-v3.md`). Vắng cờ ⇒ worker vẫn đọc `V3_PAGE_XU_LY` y như
-- trước, và cột này nằm im. Luật 1 của bảng biến: vắng = đóng.
--
-- `DEFAULT false` nên bản mã CŨ (không biết cột này) vẫn chạy được sau khi migrate — thứ tự
-- deploy code/migration nào cũng an toàn, đúng bài học của lưới migration 014.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE page ADD COLUMN IF NOT EXISTS giao_bot_moi boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN page.giao_bot_moi IS
  'Page đã được GIAO cho bot mới (v3) chưa. Chỉ có hiệu lực khi V3_GIAO_PAGE_TREN_MAN=1; '
  'vắng cờ thì worker vẫn đọc V3_PAGE_XU_LY. Khác v3_ai_bat: cột kia là BẬT/TẮT trong số page đã giao.';
