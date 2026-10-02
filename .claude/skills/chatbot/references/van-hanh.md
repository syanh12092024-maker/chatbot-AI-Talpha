# Vận hành

> **Một bản — v3** (CR-02-10). Bot v1 (dịch vụ `aicloser`, `src/server.js`, màn `/admin`, cổng 3100) đã gỡ
> ở MB4 — mọi lệnh `systemctl … aicloser` / `localhost:3100` cũ trong lịch sử là của bản đó.

## Hạ tầng

- **VPS production**: `root@169.58.33.8` · thư mục `/opt/aicloser` · nhánh `vao-ui-v3-17-09`.
  SSH bằng khoá riêng: `ssh -i ~/.ssh/aicloser root@169.58.33.8` (khoá mặc định bị từ chối).
- **Hai dịch vụ systemd**, cùng nạp `/opt/aicloser/.env`:
  - `aicloser-v3` — `v3/chay-that.js`: giao diện quản trị (cổng `CHAYTHAT_CONG`, mặc định 3102) · `/webhook` · lõi bot.
  - `aicloser-worker-v3` — `src/queue/chay-worker.js`: nạp tin Pancake mỗi 6 giây → hàng đợi → bộ não → cửa gửi.
- **Log**: chỉ ở journal — `journalctl -u aicloser-v3 -u aicloser-worker-v3 --since "15 min ago"`.
- **Giao diện**: qua SSH tunnel `ssh -i ~/.ssh/aicloser -L 3102:127.0.0.1:3102 root@169.58.33.8` rồi mở
  `http://127.0.0.1:3102/dang-nhap`.
- **CSDL**: Postgres, chuỗi nối `DATABASE_URL_V3` trong `/opt/aicloser/.env` (không có trong `/proc/<pid>/environ`).

## Deploy

Mọi lần đưa thay đổi ra khách đi theo skill **`mo-van`** (cửa vào `ops/bin/phat-hanh.sh`, hồ sơ + ngưỡng +
đường lùi viết TRƯỚC, quan sát +1′/+5′/+15′). Khung lệnh trên VPS:

```bash
cd /opt/aicloser && git fetch -q && git checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09
node --env-file=.env db/migrate.js          # migration LÊN TRƯỚC, code mới chạy SAU
systemctl restart aicloser-v3 aicloser-worker-v3
```

Commit bằng pathspec (cấm gom cả cây). Push và restart prod là hai điểm DỪNG chờ người quyết.

## Kiểm tra sức khỏe

```bash
ssh -i ~/.ssh/aicloser root@169.58.33.8 'systemctl is-active aicloser-v3 aicloser-worker-v3; \
  curl -s -o /dev/null -w "%{http_code}\n" localhost:3102/dang-nhap'
ssh -i ~/.ssh/aicloser root@169.58.33.8 'journalctl -u aicloser-worker-v3 --since "10 min ago" | tail -40'
```

Màn **Sức khỏe** (`/suc-khoe`) có đèn «Lõi bot» + nhịp worker. Page nào bot đang trả lời: màn **Công tắc**
(cột `page.bot_ai_bat` — công tắc DUY NHẤT; worker chỉ nạp page bật).

## Chạy local

```bash
npm run local:start       # bản dev sạch, http://127.0.0.1:3202/dang-nhap — xem docs/local-dev.md
```

Nhắc lại: `.env` local **bắt buộc** `PANCAKE_READONLY=1`.

## Chạy thử một kịch bản hội thoại

Cách v3: **diễn tập** — bot đọc tin thật, gọi model, soạn câu trả lời rồi ghi sổ và DỪNG, không một lượt
gọi mạng nào tới Pancake (`V3_DIEN_TAP=1`). Cách bật và đọc kết quả: `docs/local-dev.md` mục «Diễn tập».
Bộ ca hành vi: `test/l4-prompt.test.mjs` (14 nguyên tắc) + kịch bản ở màn **Kịch bản**.

Chạy ít nhất 3 lượt và đánh giá **cả 3** — LLM không tất định, một lần đúng không chứng minh bản vá có tác dụng.

## Bẫy shell hay vấp

- Lệnh ssh nhiều dòng: dùng heredoc `ssh root@... 'bash -s' <<'EOF'` thay vì nhồi quote lồng nhau.
- `pkill -f <chuỗi>` trên VPS: chính chuỗi lệnh ssh cũng khớp và tự giết phiên. Viết `[c]hay-worker` thay vì `chay-worker`, hoặc dùng `systemctl`.
- Đồng bộ file dữ liệu về local để xem: `scp -i ~/.ssh/aicloser root@169.58.33.8:/opt/aicloser/<file> .`
