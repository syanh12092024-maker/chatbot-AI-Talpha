---
name: aicloser-ops
description: Vận hành, chẩn đoán và phát triển bot AI Closer (Messenger/Pancake, thị trường ME/COD). Dùng khi cần kiểm tra bot, xem log/số liệu, deploy code, xử lý sự cố (bot im, Meta chặn #2022, đơn sai COD, token hết hạn), hoặc sửa nguyên tắc AI.
---

# AI Closer — Skill vận hành

Bot AI bán hàng trực Messenger qua Pancake polling (không cần webhook). Node.js thuần, không framework, không DB — state là file JSON + JSONL.

## Sơ đồ hạ tầng

- **VPS production**: `root@169.58.33.8`, thư mục `/opt/aicloser`, service systemd `aicloser`, log `/var/log/aicloser.log` (không có timestamp — dùng `journalctl -u aicloser` cho mốc thời gian). SSH key đã cài sẵn trên máy local.
- **Dashboard**: `http://169.58.33.8:3100/admin` (Basic Auth — ADMIN_USER/PASS trong `/opt/aicloser/.env`).
- **GitHub**: `syanh12092024-maker/chatbot-AI-Talpha` (nhánh `main`).
- **Local dev**: repo này. `.env` local có `PANCAKE_READONLY=1` — CHỈ XEM, không auto-reply (bắt buộc giữ, nếu không local + VPS cùng nhắn khách → tin đúp). `.env.vps` là bản sao cấu hình VPS.

## Lệnh chuẩn

```bash
# Deploy (sau khi commit + push)
ssh root@169.58.33.8 'cd /opt/aicloser && git pull && systemctl restart aicloser'
# Chỉ sửa public/*.html thì KHÔNG cần restart (sendFile đọc mỗi request)

# Sức khỏe + log
ssh root@169.58.33.8 'systemctl is-active aicloser && curl -s localhost:3100/health'
ssh root@169.58.33.8 'tail -50 /var/log/aicloser.log'

# Gọi API admin trên VPS (nạp sẵn user/pass từ .env)
ssh root@169.58.33.8 'source <(grep -E "^#?ADMIN_" /opt/aicloser/.env | sed "s/^#//"); curl -su "$ADMIN_USER:$ADMIN_PASS" localhost:3100/admin/api/overview'

# Chạy local (readonly)
npm start   # dashboard http://localhost:3100/admin (không cần đăng nhập ở local)

# BÁO CÁO WHATSAPP (cron trên VPS: 8:00 & 17:00 giờ VN — CRON_TZ=Asia/Ho_Chi_Minh)
npm run report -- morning       # XEM TRƯỚC, KHÔNG gửi (afternoon = từ 00:00 hôm nay tới giờ)
npm run report -- morning --send
npm run wa:login -- --phone 84xxxxxxxxx   # đăng nhập lại khi phiên rớt (mã ghép 8 ký tự)
ssh root@169.58.33.8 'tail -20 /var/log/aicloser-report.log'   # kết quả các lần gửi
```

## Bản đồ code (src/)

| File | Vai trò |
|---|---|
| `server.js` | Express: webhook FB, /admin, /health, khởi động mọi thứ |
| `pancake-poll.js` | **Trái tim**: vòng poll 6s → AI trả lời. Chứa: debounce 20s (đo bằng đồng hồ server — timestamp Pancake KHÔNG có múi giờ, đừng Date.parse), gộp cụm tin, semaphore song song 4 khách (`CONV_CONCURRENCY`), backoff 2 lỗi → ngừng page 30p (`sendHealth()`), nhường Botcake tin đầu, im khi có thẻ đơn |
| `handler.js` | Cổng 1 tin: hydrate lịch sử Pancake vào state (`hydrateHistory`), trần lượt bền (`recentReplyCount`), các cửa bàn giao (`toSaleQueue` — kind: complaint/max_turns/no_kb) |
| `text.js` | **Lớp chặn cuối trước khi gọi Claude**: dọn nửa emoji (surrogate lẻ) + lượt rỗng. Hai thứ này làm API trả 400 `invalid_request_error` = "không tự hồi phục" → bot KHÔNG thử lại và khách ngồi im. Gọi trong `closer.js` (mọi lượt) và `classifier.js` |
| `closer.js` + `prompts.js` | Claude closer + system prompt. `HARD_RULES` ở cuối prompts.js LUÔN THẮNG kịch bản page — sửa nguyên tắc AI ở đây |
| `tools.js` | Tools: get_price, send_product_image, `create_draft_order` (bắt buộc `total_price` — giá AI chốt), `handoff_human` (kind:'ai') |
| `ai-log.js` | **Sổ AI** `ai-messages.jsonl` (append-only, nguồn sự thật): logAi/needSale/recentConversations/custProfile/recentReplyCount/recount |
| `pancake.js` | API pages.fm: danh sách page (`categorized.activated`), tin nhắn, gửi reply, pkAddNote |
| `pancake-orders.js` | POS API: đơn thật, `createPancakeOrder` (giá = total_price × hệ số tiền tệ: AED/SAR ×100, KWD/OMR/BHD ×1000), `ordersForConv` |
| `kb.js` | KB: Google Sheet (đồng bộ 5p, gồm 3 tab chung Chính sách/FAQ/Phản đối — CHỈ CÓ trên Sheet, đừng ngắt Sheet khi chưa di trú) + `kb-overrides.json` (dashboard sửa, ưu tiên đè) |
| `store.js` | State RAM theo psid + `ai-enabled.json` (page bật AI) |
| `admin.js` | Toàn bộ API dashboard (`/admin/api/*`) |
| `public/admin.html` | Dashboard 1 file (CSS+JS inline), hash-router 4 màn: needsale/stats/msgs/tokens |

## Dữ liệu (gitignore — KHÔNG có trên GitHub, nguồn thật ở VPS)

`.env` (token) · `ai-messages.jsonl` (Sổ AI) · `stats.json` · `ai-enabled.json` · `kb-overrides.json` · `ai-convs.json` · `pancake-shops.json` (shop POS + api_key) · `page-product-cache.json` (map variation/giá) · `ai-created-orders.json` · `tokens.json` · `sheet.json` · `public/uploads/`

Đồng bộ về local để xem: `scp root@169.58.33.8:/opt/aicloser/<file> .`

## Núm chỉnh (.env)

`MAX_AI_TURNS=5` (trần lượt/khách/24h) · `REPLY_DEBOUNCE_MS=20000` · `CONV_CONCURRENCY=4` · `PANCAKE_POLL_MS=6000` · `AUTO_CREATE_ORDER=1` · `PANCAKE_READONLY=1` (chỉ local!) · `RESPECT_ASSIGNEE` (mặc định tắt) · `PANCAKE_TOKENS_EXTRA` (token phụ cách nhau dấu phẩy — ĐA TÀI KHOẢN: page dính lỗi quyền/gói 105/121 tự failover token kế, xem `pancake.js → pkFetchPage`; danh sách page = GỘP mọi token; log `[token] page X → chuyển sang token #N`)

## Chẩn đoán theo triệu chứng

- **Bot im 1 khách** → grep tên khách trong log: sẽ thấy lý do (`đơn đang xử lý (thẻ -X)`, `tin đầu → nhường Botcake`, `đã gán nhân viên`, handoff). 6 lý do im là THIẾT KẾ, không phải lỗi.
- **Bot im cả page** → page tắt AI (`ai-enabled.json`)? backoff (`/admin/api/overview` → `sendErrors`)? Meta #2022 trong log?
- **Meta #2022 "chặn chia sẻ nội dung"** → backoff tự xử lý phần kỹ thuật; gốc rễ: nội dung health-claim, cần kháng cáo BM. Đừng tăng retry.
- **"Pages kết nối" tụt mạnh** → 1 token chết/mất quyền (JWT ~90 ngày; via FB chết → quyền rụng dần). Thêm token tài khoản còn quyền vào `PANCAKE_TOKENS_EXTRA` (test coverage 12 page bằng conversations API trước khi thêm). Hạn các token hiện tại (7): cũ 28/09 (đã mất hết quyền — giữ vô hại), Hồ Sỹ Aanh 29/10 (×2 phiên — dự phòng lẫn nhau, thêm phiên 2 ngày 01/08), CHÍNH 1 28/10, Chu Thuý 22/10, N. Thế 27/10, Thơ Nyây (Sỹ Anh Leader 2) 28/10/2026 — GIA HẠN CẢ LOẠT cuối tháng 10. (Thùy Nhung đã gỡ 01/08 — chết phiên 103 dù JWT còn hạn; lỗi 103 nay tự failover.)
- **Đơn AI COD=0** → xem `total_price` có được AI truyền không (Sổ AI event order) và hệ số tiền tệ đúng chưa (`pancake-orders.js`).
- **Dashboard trắng/JS lạ** → cache trình duyệt (Ctrl+Shift+R); API `/orders` chậm ~35s là bình thường (nạp nền + cache 60s).
- **Số liệu nghi sai** → `recount()` từ Sổ AI là nguồn sự thật (nút "Đối chiếu Sổ AI").
- **Nhóm WhatsApp không nhận báo cáo** → `tail /var/log/aicloser-report.log`. Hay gặp nhất: phiên Baileys bị thu hồi (đăng xuất thiết bị từ điện thoại, hoặc Meta chặn số) → `npm run wa:login -- --phone <số>`. Thư mục `wa-auth/` = mật khẩu, mất là phải ghép lại. LƯU Ý: WhatsApp Cloud API chính thức KHÔNG gửi được vào group — đừng "sửa" bằng cách chuyển sang API chính thức. Số liệu báo cáo cắt mốc theo GIỜ VN trong `report.js` (Sổ AI vốn tính ngày theo UTC).
- **Log có `no low surrogate` / `non-empty content`** → nửa emoji hoặc lượt rỗng lọt vào body. `text.js` đã chặn ở cửa gọi API; nếu thấy lại, tìm đường dữ liệu MỚI chưa qua `sanitizeMessages`. Log `[text] đã dọn N mảnh emoji lẻ` cho biết lớp chặn đang phải ra tay ở page/khách nào.

## Quy tắc an toàn khi thao tác

1. **Không bao giờ** chạy server thứ 2 với PANCAKE_TOKEN thật mà thiếu `PANCAKE_READONLY=1`.
2. Sổ AI là append-only — muốn sửa/test thì thêm dòng đánh dấu được, nhưng **xóa phải verify đúng dòng** trước khi xóa.
3. `git reset --hard` trên VPS an toàn với data (đều gitignore) nhưng **giết code sửa tay chưa commit** — check `git status` trước.
4. Prompt caching đang bật trên khối KB — sửa `prompts.js` là vô hiệu cache cũ, chi phí tăng nhẹ 1 lần, bình thường.
5. AI đổi hành vi = sửa `prompts.js`/`config.js` (restart); đổi giao diện = `public/admin.html` (không restart).
6. **13 nguyên tắc AI** ghi ở README.md — sửa code hành vi thì cập nhật README cùng lúc.

## Tài liệu liên quan

- `README.md` — kiến trúc + 13 nguyên tắc AI (nguồn chuẩn)
- `docs/HUONG-DAN-SALE-MKT.md` — hướng dẫn người dùng cuối (sale/MKT)
