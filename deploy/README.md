# Triển khai V3 trên VPS hiện có

Bộ triển khai chạy checkout đã được kiểm tra. Không tự `git pull`, không `reset --hard`, không ghi đè `.env`, không tự tạo secret. `--check` chỉ đọc; `--apply` sao lưu rồi cập nhật dịch vụ. Không chạy script trên máy dev macOS.

## Trạng thái VPS đã kiểm tra ngày 17/09/2026

- Host dự án: `169.58.33.8`; thư mục `/opt/aicloser`; code `429667d`.
- Node `20.20.2`, PostgreSQL `16.15`, có `pg_dump`.
- UI `aicloser-v3` đang chạy, cổng 3102.
- `aicloser` không chạy; systemd ghi `Result=timeout`, bị SIGKILL (9). Không kết luận đây là lỗi thiếu RAM: còn khoảng 3.8 GB bộ nhớ khả dụng và 80 GB đĩa trống.
- Worker V3 chưa chạy; database mới áp đến 014. Bản mới cần 015–017.
- Đã có database URL, khóa phiên đăng nhập, khóa mã hóa, tài khoản quản trị và API key provider mặc định.
- Không có APP_SECRET; không cần cho Pancake polling/POS khi đặt META_WEBHOOK_OFF=1. Chưa chọn `V3_PAGE_XU_LY`; chưa bật các cờ gửi V3.
- Lượt này chỉ đọc VPS; chưa chép bản code mới, chưa migrate, chưa restart dịch vụ.

## Deploy đã thực hiện ngày 17/09/2026

- Đã đưa code local đã kiểm thử lên VPS; không reset Git, giữ nguyên dữ liệu cũ.
- 407 tests pass trước deploy; migration 015–017 đã áp, tổng 17 migration.
- Ba dịch vụ active, backend /health và UI /dang-nhap trả 200.
- META_WEBHOOK_OFF=1; ba dịch vụ đóng gửi tin/POS và chưa chọn Page chạy.
- Backup ứng dụng: /var/backups/aicloser/release-20260917T044636Z/application.tar.gz.
- Backup database và unit: /var/backups/aicloser/20260917T044642Z.
- npm báo 8 vulnerabilities (5 moderate, 3 high); chưa tự nâng dependency ngoài phạm vi deploy.

## Chuẩn bị

Các biến cần thiết có trong `deploy/config.example` (chỉ chứa chỗ trống, không có secret). Không thay khóa mã hóa/khóa phiên đang dùng bằng khóa mới.

1. Đưa đúng bản code đã test lên máy chủ, giữ lại `.env`, dữ liệu JSON và uploads hiện có. Không chạy bản `setup.sh` cũ (bản cũ reset code và chỉ chạy server).
2. Máy cần Node >=20.12, npm, PostgreSQL client phù hợp server, systemd, flock và curl. Nếu là checkout mới chưa có thư viện, chạy `npm ci --omit=dev` trong checkout mới trước khi kiểm tra.
3. Với Pancake polling + POS, đặt `META_WEBHOOK_OFF=1` trong `.env` và để nguồn tin Page là `poll`. Không cần APP_SECRET/VERIFY_TOKEN; endpoint Meta GET/POST /webhook trả 404. Chỉ khi dùng webhook trực tiếp Meta mới bỏ cờ này và cấu hình hai khóa Meta thật. Giữ nguyên V3_KHOA_MA_HOA hiện có.
4. Dùng HTTPS cho UI production, hoặc SSH tunnel để thử local. Cookie đăng nhập production là Secure; truy cập trực tiếp HTTP IP không phải đường đăng nhập được hỗ trợ.

```bash
cd /opt/aicloser
bash deploy/setup.sh --check
# Mặc định configure: không gửi tin, không tạo đơn, chưa chọn Page chạy.
bash deploy/setup.sh --apply
```

Các bước apply: khóa chống hai lượt deploy → lưu .env/unit hiện tại → dừng dịch vụ → pg_dump và kiểm tra archive → npm ci → migrate → kiểm tra schema → tạo ba unit → khởi động → kiểm tra health/login và trạng thái dịch vụ. Nếu backup/migration/smoke test hỏng sau bước dừng, giữ dịch vụ dừng và in đường backup. Không tự chạy lại bot cũ hoặc migrate down.

Unit được tạo: `aicloser` (server), `aicloser-v3` (UI), `aicloser-worker-v3` (worker). Cả ba đọc cùng `.env` bằng `node --env-file`. Log đọc bằng `journalctl -u <service>`; thay cách ghi file log cũ. Script chặn khi còn systemd drop-in chưa hợp nhất vì chúng có thể ghi đè đường chạy hoặc cờ gửi.

## Mở một Page thử chat

Sau khi UI đã có đủ sản phẩm/giá, model và mapping Page/shop, chỉnh trong `.env`:

```dotenv
V3_PAGE_XU_LY=<một Page ID đã chọn>
V3_RAP_PROMPT_BAT=1
V3_PANCAKE_GUI=1
PANCAKE_READONLY=0
V3_POS_GHI=0
```

```bash
DEPLOY_MODE=pilot bash deploy/setup.sh --check
DEPLOY_MODE=pilot bash deploy/setup.sh --apply
```

Pilot chỉ nhận đúng một Page. Server không khởi động poll/follow-up/miner legacy (`V3_LEGACY_POLL_OFF=1`), tránh đánh thức các Page cũ khi mở lại server. POS vẫn bị đóng bởi `Environment=V3_POS_GHI=0` trong unit; chỉ mở sau khi chat đạt và được phép tạo đơn thử. Để mở POS cho thao tác duyệt ở UI, đổi riêng dòng đó trong unit `aicloser-v3.service`, rồi `systemctl daemon-reload` và restart UI. Chạy lại setup sẽ đóng POS lại.

## Truy cập thử UI qua SSH tunnel

```bash
ssh -i ~/.ssh/aicloser -L 3102:127.0.0.1:3102 root@169.58.33.8
```

Mở `http://localhost:3102/van-hanh-v3` và dùng tài khoản quản trị hiện có. Không in hoặc đổi mật khẩu tài khoản trong script deploy.

## Backup và đường lùi

Backup mặc định: `/var/backups/aicloser/<UTC timestamp>/`, quyền thư mục 700, database dump và .env 600. `pg_dump` nhận host/user/password/database qua biến PG*, không đưa mật khẩu vào argv. Archive được đọc kiểm tra bằng `pg_restore --list`. Cần giữ cả khóa mã hóa bên cạnh database backup.

Nếu cần lùi: giữ worker/server dừng, đưa lại bản code trước đó và unit đã sao lưu, kiểm tra tương thích schema rồi mới khởi động lại. Các migration 015–017 là bổ sung; không chạy down để xử lý lỗi deploy. Khôi phục toàn bộ database từ backup là thao tác riêng vì có thể mất dữ liệu phát sinh sau thời điểm backup.

## Kiểm thử

Kết quả cuối lượt này: **407 passed, 0 failed, 0 skipped**, có chạy E2E Brave. Kiểm tra cú pháp shell/JS và `git diff --check` đạt.

`test/deploy-v3.test.mjs`: kiểm tra config không lộ secrets, --check không ghi, backup trước migration, ba unit dùng chung env, ghi ngoài đóng mặc định, deploy lần đầu chưa có worker, thất bại không restart bot, và backup PostgreSQL tạm thật.

Chạy cùng bộ hồi quy bằng `sh ops/bin/test-phase0.sh`. Đặt BROWSER_DRIVER khi muốn chạy thêm E2E trình duyệt như `docs/frontend-v3-progress.md`.
