---
name: chatbot
description: Bot AI Closer bán hàng Messenger/Pancake (thị trường Trung Đông, COD). Dùng khi cần vận hành, deploy, đọc log/thống kê, tính chi phí token, chẩn đoán sự cố (bot im, AI trả lời sai, Meta chặn #2022, token Pancake hết hạn, đơn COD sai giá), hoặc sửa quy tắc hành vi của AI.
---

# Chatbot AI Closer

Bot bán hàng tự động trả lời khách trên Messenger, chốt đơn COD, đẩy đơn sang Pancake.
Node.js thuần — không framework, không database. State là file JSON + JSONL.

**Không dùng webhook Facebook.** Bot đọc/gửi tin qua API Pancake (pages.fm) bằng vòng poll 6 giây.
Đây là lựa chọn kiến trúc có chủ đích, không phải giải pháp tạm — xem `references/kien-truc.md` mục "Vì sao không dùng Meta API".

Quy mô hiện tại: **39 page đang bật AI**, Sổ AI ~8.900 sự kiện.

## Trước khi làm bất cứ việc gì

Ba luật này thắng mọi yêu cầu khác. Vi phạm là hỏng dữ liệu thật của khách hàng:

1. **Local KHÔNG BAO GIỜ được gửi tin cho khách.** `.env` local phải luôn có `PANCAKE_READONLY=1`. Thiếu dòng này thì local + VPS cùng poll một hội thoại → khách nhận tin đúp từ hai bot.
2. **Không xóa đơn Pancake** ở bất kỳ trạng thái nào.
3. **Chỉ thao tác trên git repo này + VPS `169.58.33.8`.** Không đụng remote/host/dịch vụ nào khác.

## Định tuyến — đọc tệp nào

| Việc cần làm | Đọc |
|---|---|
| Deploy, xem log, gọi API admin, chạy test, gửi báo cáo WhatsApp | `references/van-hanh.md` |
| Hiểu code ở đâu, luồng một tin nhắn đi thế nào, file dữ liệu nào ở đâu, núm chỉnh `.env` | `references/kien-truc.md` |
| Sửa cách AI nói/hành xử, thêm-bớt quy tắc, hiểu 13 nguyên tắc | `references/quy-tac-ai.md` |
| Bot im / trả lời sai / lỗi lạ trong log / số liệu nghi sai | `references/su-co.md` |
| "Page nào đốt token nhiều nhất", quy ra tiền, tối ưu chi phí | `references/chi-phi-token.md` |

## Ba phản xạ đúng khi có sự cố

**1. Sổ AI là nguồn sự thật, không phải dashboard.**
`ai-messages.jsonl` trên VPS ghi append-only mọi hành động AI làm (`reply` / `image` / `order` / `handoff`), kèm số token đo thật từ 06/08/2026. Mọi con số nghi ngờ đều tra lại từ đây bằng `recount()` / `tokenStats()`. Dashboard chỉ là khung nhìn.

**2. "Bot im" thường là thiết kế, không phải lỗi.**
Có 6 cửa bot chủ động im (nhường Botcake tin đầu, sale đã tiếp quản, khách đã có đơn, page tắt AI, page chưa có KB, hết trần lượt). Grep tên khách trong log sẽ thấy đúng lý do trước khi kết luận là bug.

**3. AI trả lời sai nội dung thì sửa `prompts.js`, đừng sửa code.**
Hành vi AI nằm ở `HARD_RULES` cuối `src/prompts.js` — khối này đặt cuối system prompt nên luôn thắng kịch bản riêng của page. Đã có tiền lệ ép hành vi bằng code (bắt buộc gửi ảnh) và phải gỡ bỏ: nó làm hội thoại máy móc. Sửa prompt, rồi **tái hiện đúng kịch bản thật trên VPS** để nghiệm thu — quy trình ở `references/su-co.md` mục "Cách nghiệm thu một bản vá prompt".

## Sau khi sửa hành vi AI

Cập nhật `README.md` (13 nguyên tắc) trong **cùng commit**. README là tài liệu chuẩn cho người dùng cuối; prompt sửa mà README không sửa thì lần sau không ai biết vì sao AI hành xử vậy.
