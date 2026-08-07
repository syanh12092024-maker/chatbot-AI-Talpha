# Kiến trúc

## Luồng một tin nhắn

```
Pancake API ──poll 6s──▶ pancake-poll.js
                          │  gộp cụm tin, đợi khách gõ xong 20s
                          │  tối đa 4 hội thoại song song
                          ▼
                        handler.js          nạp 20 tin lịch sử thật từ Pancake
                          │                 kiểm trần lượt (đọc Sổ AI)
                          │                 các cửa im lặng & cửa bàn giao
                          ▼
                        classifier.js  ──▶  phân loại ý định + lọc spam
                          │
                          ▼
                        text.js             dọn nửa emoji / lượt rỗng  ← LỚP CHẶN CUỐI
                          │
                          ▼
                        closer.js + prompts.js  ──▶  LLM (Kimi hoặc Claude)
                          │                          tools: get_price,
                          │                          send_product_image,
                          │                          create_draft_order,
                          │                          handoff_human
                          ▼
                        pancake.js gửi tin  +  ai-log.js ghi Sổ AI
```

## Bản đồ code (`src/`)

| File | Vai trò |
|---|---|
| `server.js` | Express: `/admin`, `/health`, khởi động mọi thứ |
| `pancake-poll.js` | **Trái tim.** Vòng poll 6s. Chứa: debounce 20s, gộp cụm tin, semaphore 4 khách (`CONV_CONCURRENCY`), backoff 2 lỗi → ngừng page 30 phút (`sendHealth()`), nhường Botcake tin đầu, im khi hội thoại có thẻ đơn |
| `handler.js` | Cổng xử lý 1 tin: `hydrateHistory` (nạp lịch sử Pancake vào state), `recentReplyCount` (trần lượt bền), `toSaleQueue` (bàn giao — kind: complaint/max_turns/no_kb) |
| `text.js` | **Lớp chặn cuối trước khi gọi LLM.** Dọn surrogate lẻ (nửa emoji) + lượt rỗng. Hai thứ này khiến API trả 400 `invalid_request_error` — lỗi "không tự hồi phục", bot **không** retry và khách ngồi im vĩnh viễn. `sanitizeMessages` không bao giờ xóa message (giữ cặp tool_use/tool_result) |
| `closer.js` | Vòng gọi LLM + tool. Đo token vào `state.lastUsage`. Không bao giờ trả `'...'` — xin model viết lại, cùng lắm thì im |
| `prompts.js` | System prompt. `HARD_RULES` đặt **cuối** khối prompt nên luôn thắng kịch bản riêng của page |
| `classifier.js` | Phân loại ý định + spam. Gắn `__usage` (non-enumerable) để đếm token |
| `llm.js` | Chọn nhà cung cấp. `aiExtras` — Kimi **bắt buộc** `thinking: {type:'disabled'}` |
| `tools.js` | 4 tool. `create_draft_order` bắt buộc `total_price`. `send_product_image` bắt buộc `caption` (caption bám theo tấm **gửi thành công** đầu tiên) |
| `ai-log.js` | **Sổ AI** `ai-messages.jsonl`, append-only, nguồn sự thật. Hàm: `logAi` `needSale` `recentConversations` `custProfile` `recentReplyCount` `tokenStats` `recount` |
| `pancake.js` | API pages.fm: danh sách page (`categorized.activated`), đọc/gửi tin, ghi chú. Failover đa token ở `pkFetchPage` |
| `pancake-orders.js` | POS API (`pos.pages.fm`, dùng `api_key` riêng mỗi shop, **không** dùng JWT): đơn thật, `createPancakeOrder`, `ordersForConv`. `fetchJsonRetry` timeout 20s + 1 lần thử lại |
| `kb.js` | KB từ Google Sheet (đồng bộ 5 phút) + `kb-overrides.json` (dashboard sửa, ưu tiên đè) |
| `store.js` | State RAM theo psid + `ai-enabled.json` |
| `admin.js` | Toàn bộ `/admin/api/*` |
| `public/admin.html` | Dashboard 1 file (CSS+JS inline), hash-router 4 màn: needsale / stats / msgs / tokens |

## Dữ liệu (gitignore — nguồn thật chỉ có trên VPS)

`.env` · `ai-messages.jsonl` (Sổ AI) · `stats.json` · `ai-enabled.json` · `kb-overrides.json` · `ai-convs.json` · `pancake-shops.json` (shop POS + api_key) · `page-product-cache.json` · `ai-created-orders.json` · `tokens.json` · `sheet.json` · `public/uploads/`

Hệ quả: `git reset --hard` trên VPS an toàn với dữ liệu, nhưng **giết code sửa tay chưa commit** — luôn `git status` trước.

## Núm chỉnh `.env`

| Biến | Ý nghĩa |
|---|---|
| `AI_PROVIDER` | `anthropic` \| `kimi`. Kimi = endpoint Moonshot tương thích Anthropic SDK (chỉ đổi `baseURL`), cần `KIMI_API_KEY` **bản quốc tế**. Model mặc định tự đổi theo nhà cung cấp; model lệch nhà cung cấp bị bỏ qua kèm cảnh báo `[config]`. Bot **không tự failover** giữa hai nhà cung cấp |
| `MAX_AI_TURNS` | Trần lượt AI/khách/24h. **4** (hạ từ 5 ngày 06/08/2026 để tiết kiệm token) |
| `REPLY_DEBOUNCE_MS` | 20000 — đợi khách gõ xong rồi trả 1 lần cho cả cụm |
| `CONV_CONCURRENCY` | 4 hội thoại song song |
| `PANCAKE_POLL_MS` | 6000 |
| `AUTO_CREATE_ORDER` | 1 |
| `PANCAKE_READONLY` | **Chỉ local.** Bật = không gửi tin |
| `RESPECT_ASSIGNEE` | Mặc định tắt |
| `PK_MARK_UNREAD` | Mặc định **bật** (07/08/2026): sau mỗi tin AI gửi, gọi `POST .../unread` (public_api/v1, cần `page_access_token` riêng từng page — bot tự sinh, lưu `pancake-page-tokens.json`) để hội thoại KHÔNG trôi khỏi hàng chờ sale. Tắt: `PK_MARK_UNREAD=0`. Sinh page token làm token cũ của page (nếu từng tạo tay) hết hiệu lực |
| `PANCAKE_TOKENS_EXTRA` | Token phụ, cách nhau dấu phẩy. Danh sách page = **gộp** mọi token; page lỗi quyền/gói (103/105/121) tự chuyển token kế. **Thứ tự trong `.env` = thứ tự failover** — token chính phải là token phủ nhiều page bật AI nhất |
| `AI_PRICE_IN` / `AI_PRICE_CACHE` / `AI_PRICE_OUT` / `AI_USD_VND` | Đè đơn giá token, xem `chi-phi-token.md` |

## Vì sao không dùng Meta Graph API

Đã xây xong kênh Meta song song (channel adapter, `src/channels/`), test đầy đủ, **chưa bao giờ deploy**. Code nằm ở nhánh `meta-channel` (commit `f1e2189`).

Nút thắt: app đang ở **Standard Access**. `/conversations` trả `(#2)` trên mọi page, `/feed` trả `(#10) requires pages_read_engagement`. Đây **không phải lỗi code** — phải qua App Review để lấy Advanced Access. Ngoài ra còn nút thắt thứ hai: nhiều page chưa được đưa vào Business Manager.

**Đừng thử lại kênh Meta khi chưa có Advanced Access.** Đã tốn một phiên làm việc để xác nhận điều này. Cổng MCP cũng không đi vòng được — giới hạn nằm ở quyền của app phía Meta, không ở lớp truyền tải.
