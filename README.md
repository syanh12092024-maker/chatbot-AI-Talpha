# AI Closer

Bot AI bán hàng trên Facebook Messenger cho các page bán hàng COD (thu tiền khi nhận) ở thị trường Trung Đông
và Philippines. Bot đọc và gửi tin qua **Pancake**, tư vấn bằng ngôn ngữ của khách, chốt đơn nháp và chuyển cho
sale khi cần. Kèm một giao diện quản trị cho sale, marketer và quản trị viên.

> Bot v1 (`src/server.js`, màn `/admin`, cổng 3100) đã gỡ khỏi mã từ 02/10/2026. Repo chỉ còn **một bản: v3**.

## Kiến trúc

```
Pancake (pages.fm) ──nạp mỗi 6s──▶ aicloser-worker-v3   (src/queue/chay-worker.js)
                                     │  gộp cụm tin, đợi khách gõ xong
                                     ▼
                     Postgres `tin_cho_xu_ly`   FIFO theo khách · thử lại ≤3 lần/tin
                                     ▼
                     src/chat/handler-v3.js     cửa im lặng · ngân sách lượt · bàn giao
                       classify (bộ luật, 0 token) → closer + tool use + KB → outbound-guard
                       tools: get_price · create_draft_order · send_product_image · handoff_human
                                     ▼
                     cửa gửi Messenger (van gửi)  +  sổ `so_ai` (Postgres)

aicloser-v3   (v3/chay-that.js)  giao diện quản trị · /webhook · lõi bot
```

- **Hai tiến trình**, mỗi cái một dịch vụ systemd trên VPS: `aicloser-v3` (giao diện + API) và
  `aicloser-worker-v3` (nạp tin + trả lời). Cả hai cùng tự khởi động lõi bot (`src/core/khoi-dong-loi.js`).
- **Mỗi tin của khách = đúng 1 lần gọi model.** Phân loại tin là bộ luật thuần (`src/classifier.js`),
  không gọi mạng. Model chọn theo từng team (Kimi, Claude, GPT, DeepSeek — `v3/src/model/`).
- **Một công tắc cho mỗi page:** cột `page.bot_ai_bat`. Worker chỉ nạp page đang bật.
- **Van gửi:** thiếu `V3_PANCAKE_GUI` hoặc có `PANCAKE_READONLY=1` ⇒ không tin nào ra khách (vắng biến = đóng).
- Hành vi của bot với khách tuân theo [14 nguyên tắc](docs/v3/NGUYEN-TAC-AI.md), đối chiếu tự động ở `test/l4-prompt.test.mjs`.

## Cấu trúc thư mục

| Thư mục | Nội dung |
|---|---|
| `src/chat/` | Xử lý một lượt chat: `handler-v3.js`, lịch sử hội thoại, ráp prompt |
| `src/queue/` | Worker: nạp tin Pancake, hàng chờ, chạy lượt |
| `src/orders/` · `src/pos/` | Đơn nháp, lọc trùng, hàng chờ duyệt, tạo đơn POS Pancake |
| `src/products/` · `src/channels/` · `src/hrm/` | Sản phẩm/giá, kênh Messenger/WhatsApp, đồng bộ nhân sự–marketer |
| `src/*.js` | Lõi bot: `classifier`, `closer`, `prompts`, `tools`, `outbound-guard`, `llm`, `config` |
| `v3/` | Ứng dụng quản trị: `chay-that.js` (điểm vào), `src/ui/` (màn hình), `src/auth/`, `src/model/`, `test/` |
| `db/` | `schema.sql` (lược đồ hợp nhất), `migrate/` (bản `up`/`down`), `ket-noi.js`, `di-tru/` (chuyển dữ liệu v1) |
| `test/` | Bộ ca `node:test` |
| `ops/bin/` | Script vận hành; `nghiem-thu/` chứa cổng nghiệm thu theo từng hạng mục |
| `deploy/` | Cài đặt và cập nhật VPS: `setup.sh`, `preflight.mjs`, `backup.mjs` |
| `docs/` | Tài liệu — xem mục [Tài liệu](#tài-liệu) |
| `.claude/skills/` | Quy trình làm việc với Claude Code (thi công, review, điều phối) |

## Chạy ở máy dev

Cần Node.js 20 trở lên (CI và máy dev dùng 24) và PostgreSQL 16 ở `localhost:5432`.

```bash
npm install
cp .env.example .env      # máy dev BẮT BUỘC giữ PANCAKE_READONLY=1 — thiếu là khách thật nhận tin
npm run local:start       # bản dev sạch: http://127.0.0.1:3202/dang-nhap — xem docs/local-dev.md
```

Tên và ý nghĩa mọi biến môi trường: [`docs/v3/ban-giao/bien-moi-truong-v3.md`](docs/v3/ban-giao/bien-moi-truong-v3.md).
Giá trị thật (khoá API, token Pancake, chuỗi nối CSDL) không có trong repo, xin người bàn giao qua kênh riêng.

Thử AI mà không gửi cho khách: chế độ diễn tập `V3_DIEN_TAP=1` (đọc tin thật, gọi model, ghi sổ rồi dừng).

## Kiểm thử

```bash
npm test                    # toàn bộ bộ ca — mỗi bộ tự dựng CSDL hộp cát riêng rồi tự xoá
bash ops/bin/kiem-tinh.sh   # cổng tĩnh: cú pháp, cổng nghiệm thu, bảng biến — không cần CSDL (CI chạy cái này)
bash ops/bin/nghiem-thu/<mã>.sh   # cổng nghiệm thu của một hạng mục, ví dụ gl8.sh
```

CI (`.github/workflows/kiem.yml`) chạy cổng tĩnh trên mỗi push vào `main` và mỗi pull request.
Bộ ca đầy đủ cần Postgres nên chạy tay (`bo-ca.yml`).

## Cơ sở dữ liệu

- PostgreSQL. Mã chỉ đọc **một** biến: `DATABASE_URL_V3` (`db/ket-noi.js`). Không tự rơi về `DATABASE_URL` hay localhost.
- Lược đồ: [`db/schema.sql`](db/schema.sql), sinh ra từ `db/migrate/*.up.sql` — **không sửa tay**; muốn đổi thì thêm
  một bản migrate mới rồi chạy `node db/migrate.js schema`.
- Giải thích từng bảng: [`docs/v3/ban-giao/luoc-do-v1.md`](docs/v3/ban-giao/luoc-do-v1.md).

```bash
npm run migrate                     # áp các bản chưa áp
node db/migrate.js trang-thai       # xem đã áp tới đâu
node db/migrate.js down             # lùi một bản (thêm --het để lùi hết)
```

## Triển khai

VPS chạy hai dịch vụ systemd `aicloser-v3` và `aicloser-worker-v3`. Cài đặt, cập nhật, sao lưu và lùi bản theo
[`deploy/README.md`](deploy/README.md). Push lên GitHub **không** tự deploy.

Mọi thay đổi chạm khách thật (deploy, bật cờ `V3_*`, bật thêm page) đi theo quy trình mở van có đường lùi viết sẵn —
skill `mo-van`; nhật ký từng lần ở `docs/thi-cong/nhat-ky/phat-hanh-*.md`.

**Ba luật không được phá:**

1. **VPS dùng chung** với các ứng dụng khác — không đụng dịch vụ, cổng, cấu hình không phải của AI Closer.
2. **Không bao giờ xoá đơn hàng Pancake**, kể cả đơn thử hay đơn trùng.
3. **Máy dev luôn giữ `PANCAKE_READONLY=1`** — dev và prod cùng đọc một Pancake, mở van ở dev là khách nhận tin đúp.

## Tài liệu

| Đọc khi | Tệp |
|---|---|
| Mới vào dự án | [`docs/v3/00-BAT-DAU-TU-DAY.md`](docs/v3/00-BAT-DAU-TU-DAY.md) |
| Vì sao hệ thống được làm như vậy | [`docs/v3/01-QUYET-DINH.md`](docs/v3/01-QUYET-DINH.md) |
| Hợp đồng giữa các module, lược đồ, biến môi trường | [`docs/v3/ban-giao/`](docs/v3/ban-giao/) |
| Bot nói gì với khách | [`docs/v3/NGUYEN-TAC-AI.md`](docs/v3/NGUYEN-TAC-AI.md) |
| Chạy local | [`docs/local-dev.md`](docs/local-dev.md) |
| Hướng dẫn người dùng (sale, marketer, quản trị) | [`docs/userguide/`](docs/userguide/) · [`docs/HUONG-DAN-SALE-MKT.md`](docs/HUONG-DAN-SALE-MKT.md) |
| Đã thay đổi gì, khi nào | [`CHANGELOG.md`](CHANGELOG.md) |
| Đang làm gì, còn nợ gì | [`docs/thi-cong/SO-DIEU-HANH-THI-CONG.md`](docs/thi-cong/SO-DIEU-HANH-THI-CONG.md) — sổ điều hành; phiếu việc ở `phieu/`, nhật ký ở `nhat-ky/` |
| Tra lịch sử | `docs/v2/` (thiết kế v2) · [`docs/luu-tru/`](docs/luu-tru/) (tài liệu bot v1, báo cáo tiến độ cũ) |
