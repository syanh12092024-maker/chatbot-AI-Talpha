# AI Messenger Closer (pilot — thị trường ME / COD)

Bot AI đứng tuyến đầu trên Facebook Messenger: phân loại tin (Haiku) → tư vấn & chốt đơn bằng tiếng Ả Rập (Sonnet, có tool use) → lọc đơn COD chống bom hàng → tạo đơn vào Pancake. Giữ Pancake làm nơi đóng đơn.

## Kiến trúc

```
FB Messenger ──webhook──> Express (server.js)
                              │
                 classify (Haiku 4.5)  ── spam/complaint/lang? → chuyển người
                              │
                 closer (Sonnet 4.6) + tool use + KB(cache)
                   tools: get_price · check_stock · score_lead
                          create_draft_order · handoff_human
                              │
                 Pancake (tạo đơn)   +   store (state theo PSID)
```

KB đọc từ file Excel `../KB_AI_Chatbot_Mau.xlsx` (team điền sản phẩm/giá/chính sách/FAQ/phản đối).

## Cài đặt

```bash
cd messenger-closer
npm install
cp .env.example .env      # rồi điền ANTHROPIC_API_KEY (và Messenger token khi đấu nối thật)
```

## Test ngay trong terminal (chỉ cần ANTHROPIC_API_KEY)

```bash
npm run chat
```

Gõ tin như khách (tiếng Ả Rập/Anh/Việt) để xem AI tư vấn, gỡ chê giá, xin địa chỉ + xác nhận COD rồi "tạo đơn". Không cần Facebook.

## Chạy server webhook

```bash
npm start          # hoặc: npm run dev (tự reload)
```

Sau đó cấu hình trên Meta App → Messenger → Webhooks:
- Callback URL: `https://<domain-công-khai>/webhook` (dùng ngrok khi dev: `ngrok http 3000`)
- Verify Token: trùng `VERIFY_TOKEN` trong `.env`
- Subscribe các field: `messages`, `messaging_postbacks`
- Cấp `PAGE_ACCESS_TOKEN` của page pilot vào `.env`

Cập nhật KB xong gọi `POST /reload-kb` để nạp lại không cần restart.

## Việc cần làm khi lên thật (TODO)

- `src/pancake.js`: thay STUB bằng API tạo đơn Pancake thật.
- `src/store.js`: chuyển state sang Redis/DB để bền & scale.
- Cửa sổ 24h của Messenger: tin `RESPONSE` chỉ gửi được trong 24h kể từ tin cuối của khách. Để follow-up khách đi lạnh (quan trọng với COD), xin quyền **Human Agent** và gửi bằng `messaging_type: MESSAGE_TAG`, tag `HUMAN_AGENT` (được 7 ngày). Sửa trong `src/messenger.js`.
- BigQuery logging (lead_journey + RTO) để đo Order→Delivered.
- `APP_SECRET`: bật để xác thực chữ ký webhook (bắt buộc khi production).

## Circuit breakers đã có

- Không tự trả quá `maxAiTurnsBeforeHandoff` lượt/khách → chuyển người.
- `lang=other` hoặc khiếu nại → chuyển hàng đợi người, không auto-reply sai tiếng.
- `create_draft_order` từ chối nếu thiếu xác nhận COD hoặc địa chỉ chưa cụ thể.
- Giới hạn vòng lặp tool-use mỗi lượt (`maxToolIterations`).
- Spam (độ tin cậy ≥0.8) → bỏ qua.

> Model dùng: `claude-sonnet-4-6` (closer) + `claude-haiku-4-5` (phân loại). Prompt caching bật trên khối KB trong `src/prompts.js`.
