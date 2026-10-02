# Kiến trúc

> **Một bản — v3** (CR-02-10). Bot v1 (`server.js` · `pancake-poll.js` · `handler.js` · `store.js` ·
> `admin.js` · `public/admin.html`) đã gỡ ở MB4. Ý đồ gốc: `docs/v3/01-QUYET-DINH.md` (§14 = luật một bản).

## Hai tiến trình

| Dịch vụ | File | Làm gì |
|---|---|---|
| `aicloser-v3` | `v3/chay-that.js` | Giao diện quản trị (`v3/src/ui/*`, cổng 3102) · `/webhook` (prod tắt bằng `META_WEBHOOK_OFF=1`) · lõi bot |
| `aicloser-worker-v3` | `src/queue/chay-worker.js` | Vòng NẠP rồi XỬ LÝ, nhịp `V3_WORKER_NHIP_MS` (6 giây) |

Cả hai tự khởi động **lõi bot** — `src/core/khoi-dong-loi.js#khoiDongLoi`: nạp KB, đồng bộ Google Sheet
5 phút, làm mới danh sách page Pancake 10 phút, nạp lại bản chép khi đổi. Không tiến trình nào gọi HTTP
sang tiến trình khác để biết hay đổi điều bot đang làm.

## Luồng một tin nhắn

```
Pancake API ──GET mỗi 6s──▶ src/queue/nap.js        CHỈ page có page.bot_ai_bat = true
                              │  gom cụm tin khách, đợi khách gõ xong, nhận diện sale đã nhắn
                              ▼
                  Postgres tin_cho_xu_ly (src/queue/kho.js)   khoá team+page+khách · FIFO
                              ▼
                  src/queue/worker.js         rút tin · thử lại tối đa 3 lần (TRAN_THU)
                              ▼
                  src/chat/handler-v3.js      quyền hội thoại · ngân sách lượt 24h · cửa im lặng
                              │  lop-tu-khoa.js → fast-lane.js → classifier.js (LUẬT, 0 token)
                              │  rap-prompt.js (4 khối từ CSDL) → closer.js + prompts.js → LLM
                              │     tools: get_price · send_product_image · create_draft_order · handoff_human
                              │  outbound-guard.js        ← lớp chặn cuối trước khi gửi
                              ▼
                  src/channels/messenger (van V3_PANCAKE_GUI)  +  so_ai  +  hàng chờ sale (orders/hang-cho.js)
```

## Bản đồ code

| File | Vai trò |
|---|---|
| `src/queue/page-routing.js` | `dsPageBotTraLoi` — đọc `WHERE bot_ai_bat = true`. Công tắc DUY NHẤT |
| `src/queue/nap.js` · `kho.js` · `worker.js` · `lan-gui.js` | Nạp tin → hàng đợi → xử lý → ghi lượt gửi (đánh dấu chưa đọc theo `PK_MARK_UNREAD`) |
| `src/chat/handler-v3.js` | Cổng xử lý 1 tin. Van gửi + cổng HTTP ghi (chặn mọi POST ra pages.fm khi van đóng) |
| `src/text.js` | Dọn surrogate lẻ (nửa emoji) + lượt rỗng — hai thứ khiến API trả 400 `invalid_request_error` không tự hồi phục |
| `src/closer.js` | Vòng gọi LLM + tool. Không bao giờ trả `'...'` — xin model viết lại, cùng lắm thì im |
| `src/prompts.js` | Khối `CORE` đứng ĐẦU system prompt, tự tuyên bố thẩm quyền («THẮNG MỌI KHỐI SAU») |
| `src/classifier.js` | Bộ luật thuần (regex), 0 token, tất định |
| `src/llm.js` | Chọn nhà cung cấp. Kimi **bắt buộc** `thinking: {type:'disabled'}` |
| `src/tools.js` | 4 tool. `create_draft_order` bắt buộc `total_price`; `send_product_image` bắt buộc `caption` |
| `src/pancake.js` | API pages.fm: danh sách page, đọc/gửi tin. Token từ bảng `token_pancake` + `.env`, failover đa token |
| `src/pancake-orders.js` | POS API (`pos.pages.fm`, `api_key` riêng mỗi shop) |
| `src/kb.js` | KB từ Google Sheet + `kb-overrides.json` |
| `src/core/so-lieu-bot-cu.js` | ĐỌC Sổ AI cũ (`ai-messages.jsonl`, v1 ghi tới 28/08) cho chi phí/đơn lịch sử |
| `v3/src/noi-day/loi-bot.js` | Cầu giữa giao diện và lõi bot trong CÙNG tiến trình (trước MB4 tên `cau-bot-v1.js`) |
| `db/migrate/*.sql` · `db/schema.sql` | Lược đồ Postgres; `node db/migrate.js schema` sinh lại `schema.sql` (không sửa tay) |

## Dữ liệu

- **Postgres** (`DATABASE_URL_V3`) — nguồn thật: `page` (cột `bot_ai_bat`), `hoi_thoai`, `tin_cho_xu_ly`,
  `lan_gui`, `so_ai`, `token_pancake`, kịch bản/bộ luật/sản phẩm theo team.
- **File JSON còn được ĐỌC** (gitignore, chỉ có trên VPS): `ai-messages.jsonl` (Sổ AI cũ) · `stats.json` ·
  `conv-state.json` · `ai-convs.json` · `kb-overrides.json` · `kb-chung.json` · `pages.json` ·
  `page-shop-cache.json` · `pancake-shops.json` · `botcake-templates.json`.
  Các file khác của v1 (`ai-enabled.json` …) đã lưu trữ ở `/opt/aicloser/luu-tru/v1/` khi MB4 lên prod.

## Núm chỉnh `.env`

Bảng đầy đủ và trạng thái từng biến trên VPS: `docs/v3/ban-giao/bien-moi-truong-v3.md` (vắng = đóng).

| Biến | Ý nghĩa |
|---|---|
| `V3_PANCAKE_GUI` · `PANCAKE_READONLY` | Van gửi. Vắng `V3_PANCAKE_GUI` hoặc `PANCAKE_READONLY=1` ⇒ không tin nào ra khách. Máy dev luôn `PANCAKE_READONLY=1` |
| `AI_PROVIDER` | `anthropic` \| `kimi`. Bot **không tự failover** giữa hai nhà cung cấp |
| `MAX_AI_TURNS` | Trần lượt AI/khách/24h (mặc định 4) |
| `AUTO_CREATE_ORDER` | **0** — AI chốt lời + gắn thẻ + ghi chú, nhân viên tạo đơn tay |
| `PK_MARK_UNREAD` | Mặc định bật: sau mỗi tin gửi, đánh dấu hội thoại chưa đọc để không trôi khỏi hàng chờ sale |
| `PANCAKE_TOKENS_EXTRA` | Token phụ; page lỗi quyền/gói (103/105/121) tự chuyển token kế |
| `V3_WORKER_NHIP_MS` | Nhịp worker khi hàng đợi rỗng (6000) |

## Vì sao không dùng Meta Graph API

Đã xây xong kênh Meta song song (channel adapter, `src/channels/`), test đầy đủ, **chưa bao giờ deploy**. Code nằm ở nhánh `meta-channel` (commit `f1e2189`).

Nút thắt: app đang ở **Standard Access**. `/conversations` trả `(#2)` trên mọi page, `/feed` trả `(#10) requires pages_read_engagement`. Đây **không phải lỗi code** — phải qua App Review để lấy Advanced Access. Ngoài ra còn nút thắt thứ hai: nhiều page chưa được đưa vào Business Manager.

**Đừng thử lại kênh Meta khi chưa có Advanced Access.** Đã tốn một phiên làm việc để xác nhận điều này. Cổng MCP cũng không đi vòng được — giới hạn nằm ở quyền của app phía Meta, không ở lớp truyền tải.
