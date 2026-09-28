# Nhật ký phiếu BH7 — Kimi đọc được tin Botcake · tin ngắn 2–3 dòng

28/09/2026 · base `b9375da` · người quyết gật trong phiên đối chiếu Minty KSA.

## Đo trước khi code (bước 3)

- `cleanHistory` vứt mọi tin khớp `isAutomationTemplate`. Bốn mẫu Minty đều khớp mẫu
  BUILTIN (`bot-registry.js` DEFAULT_PATTERNS) ⇒ bộ ca không phụ thuộc tệp
  `botcake-templates.json` gitignore.
- Team 1 (Minty) KHÔNG có dòng `bo_luat_chung` trong CSDL dev
  (`aicloser_dev_1789621023909`) ⇒ `khoiBoLuat` trả CORE ⇒ sửa CORE có hiệu lực v3.
- `closer.js`: `stop_reason='max_tokens'` rơi vào nhánh `!== 'tool_use'` và trả nguyên
  văn bản ⇒ hạ trần là gửi tin CỤT. Quyết: không hạ trong phiếu này (neo ⑤ của cổng).
- CORE ở base 7.111 ký tự, trần thước 7.200 ⇒ phần thêm buộc phải nới trần (có số đo,
  xem chú thích trong `l4-prompt`).

## Quyết định + đánh đổi

- Ghi chú Botcake đặt vai `assistant` (không phải `user`): tin page là lời phía page, và
  handler đòi messages kết bằng assistant. Giá phải trả: rủi ro model chép giọng mẫu —
  chặn bằng nhãn «KHÁCH ĐÃ NHẬN — không phải lời bạn» + luật CORE. Đo lượt 2: gạch đầu
  dòng 21% → 24% (không giảm) — nghi phần lớn do kịch bản page (dưới), chưa tách được.
- Trần riêng `MAX_KENH_KHAC=3`, không tính vào `RECENT_MSGS` — chọn thay vì cho mẫu ăn
  slot, vì Botcake phát lại cùng bảng giá mỗi 30 phút.
- Bỏ cụm khách cuối: nhấc ghi chú ra rồi đặt lại, để tập tin khách bị bỏ ĐÚNG như trước
  BH7 (ca K5).
- Mẫu trả lời trong CORE dùng chỗ trống `<gói A>` `<giá gói A>`: CORE dùng chung mọi page,
  ghi cứng «109 SAR/Saudi» là mời model chép giá sang page AED.
- Sau lượt đo 1 phát hiện kịch bản Minty (CSDL, marketer viết) có câu chào 4 dòng ✅ và
  «LUỒNG BÁN 1. chào, nêu lợi ích, hỏi mấy set»; nhãn code «dùng khi khách mới nhắn» đọc
  được thành «khách VỪA nhắn». Sửa nhãn + thêm dòng nhắc đầu khối kịch bản. Chữ marketer
  KHÔNG đổi.

## Thước

- `test/bh7-ngu-canh-botcake.test.mjs` 10 ca, câu Botcake nguyên văn Minty.
- Đảo-vá (tiến trình mới, `context.js` về HEAD + stub export): **8/10 đỏ**. K8 (tin AI
  thật giữ nguyên văn) và K10 (trần chi phí) xanh trên bản cũ — đúng, là ca canh hồi quy.
- `test/context.test.mjs` C7 sửa theo luật mới (template thành ghi chú).
- `test/l4-prompt.test.mjs`: mẩu nguyên tắc 1 «1-3 câu» → «2–3 dòng» + «CHỈ chào ở tin
  ĐẦU»; trần CORE 7.200 → 7.800 ký tự.
- `ops/bin/nghiem-thu/bh7.sh` 9/9 · `npm test` 2.096 pass / 0 fail (4 bỏ qua).
- Chạy chung `context`+`phase1`+`mach-tu-van` trong MỘT lượt `node --test` cho 6 ca đỏ
  giả «Connection terminated» (hai file tranh CSDL sandbox) — cổng chạy từng file.

## Đo model (môi trường: dev local `aicloser_dev_1789621023909`, Kimi k2.6 thật, van gửi đóng)

`gia-lap-mot-minh.mjs --kho <60 lượt Minty gom 28/09> --chi <cùng 60 lượt màn đối chiếu>`.
Nền = màn đối chiếu gốc (`bc.json`, code base). So 29 cặp mà cả hai lần đều có tin:

| | nền | sau BH7 |
|---|---|---|
| ký tự p50 / p90 | 313 / 419 | 253 / 358 |
| tin >300 ký tự | 52% | 31% |
| tin >3 dòng | 62% | 45% |
| có `**` | 62% | 14% |
| gạch đầu dòng | 21% | 24% |
| mở bằng Hello/Hi | 52% | 59% |
| token ra TB | 140 | 89 |
| đ/lượt TB | 119 | 104 |

Biên của phép đo: lượt 2 có 17/60 lượt lỗi nhà cung cấp (429 / fetch failed, `--nhip
21000`); ca «hm how to order» trong giả lập KHÔNG thấy tin Botcake vì chúng tới SAU câu
khách và công cụ cắt lịch sử ở mốc câu khách — đời thật bot trả lời sau ~20s nên thấy.

Kết luận: đạt phần NGỮ CẢNH (Kimi thấy Botcake; «Buy 1 get free» không còn bị hỏi lại
gói; Danilo gửi địa chỉ không còn bị hỏi lại tên) và phần độ dài/markdown. CHƯA đạt:
lời chào + liệt kê gói + nhắc giá — Kimi thấy ghi chú mà vẫn làm (ca Danilo «Okay, sure»).

## Còn mở (đã ghi §9)

- Kịch bản Minty dạy ngược CORE — cần marketer sửa trên màn Kịch bản.
- Dọn tin ở cửa ra (`**`, lời chào giữa cuộc, gạch đầu dòng) — đề xuất, chờ gật (BH3).
- Cache Kimi hụt ~1.500 token/lượt ở đường thật (xem §9) — việc kế tiếp.
