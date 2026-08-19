# Bàn giao AI Messenger Closer — hướng dẫn deploy + file không có trên git

Tài liệu dành cho dev mới nhận dự án. Đọc hết phần 1–3 trước khi đụng vào production.

> ⚠️ **File này KHÔNG chứa secret.** Toàn bộ token/API key nằm trong `.env` và mấy file JSON ở mục 5 — gửi riêng qua kênh bảo mật (1Password / Bitwarden / file zip có mật khẩu), **tuyệt đối không dán vào chat, không commit lên git.**

---

## 1. Tổng quan hệ thống

| Hạng mục | Giá trị |
|---|---|
| Repo | `https://github.com/syanh12092024-maker/chatbot-AI-Talpha` — nhánh production: **`main`** |
| Runtime | Node.js 20, ESM (`"type": "module"`), Express |
| Entry point | `src/server.js` |
| Server production | VPS Contabo **169.58.33.8** (Ubuntu 24.04), user `root` |
| Thư mục app | `/opt/aicloser` |
| Dịch vụ | systemd **`aicloser`** (enabled + `Restart=always`) |
| Cổng | **3100** |
| Dashboard | `http://169.58.33.8:3100/admin` — Basic Auth (`ADMIN_USER` / `ADMIN_PASS` trong `.env`) |
| Log | `/var/log/aicloser.log` — realtime: `journalctl -u aicloser -f` |
| Nhà cung cấp AI hiện tại | **Kimi** (`AI_PROVIDER=kimi`, model `kimi-k2.6`) — đổi từ 06/08/2026 khi tài khoản Anthropic hết credit |

**Việc app làm:** nhận tin khách Facebook Messenger (qua webhook Meta **và** qua Pancake CRM), AI trả lời tư vấn bán hàng thị trường Trung Đông (COD), gửi ảnh sản phẩm, chốt địa chỉ và tạo đơn trên Pancake.

### ⚠️ Ba luật bất di bất dịch

1. **VPS dùng chung.** Máy này còn chạy nhiều app khác qua **pm2**: `auus1-backend`, `auus1-frontend` (cổng 3000), `talpha-dashboard` (cổng 3001), tool "Bắn bot khách cũ" = systemd `broadcast` (cổng 3002). **Luôn chạy `pm2 list` và `ss -ltnp` trước khi đụng vào cổng/tiến trình nào.** Đã từng deploy đè cổng 3001 làm `talpha-dashboard` crash-loop.
2. **Không bao giờ xóa đơn hàng Pancake** — ở mọi trạng thái, kể cả đơn test/trùng. Chỉ được đổi trạng thái nếu được yêu cầu rõ ràng.
3. **Chỉ thao tác trên repo + VPS ở trên.** Không thêm git remote mới, không deploy sang host/hosting khác, không đẩy code hay dữ liệu ra nơi thứ ba.

---

## 2. Quyền truy cập cần được cấp

- [ ] **GitHub**: quyền collaborator trên repo `chatbot-AI-Talpha`.
- [ ] **SSH VPS**: gửi public key của dev → thêm vào `/root/.ssh/authorized_keys` trên 169.58.33.8. (Key đang dùng phía chủ dự án: `~/.ssh/aicloser_deploy`.)
- [ ] **Dashboard**: user/pass Basic Auth (mục `ADMIN_USER`, `ADMIN_PASS` trong `.env`).
- [ ] **Google Sheet KB** (nguồn kịch bản/sản phẩm): quyền xem — link nằm trong `sheet.json`.
- [ ] **Pancake / Meta Business Manager**: nếu cần tự lấy lại token khi hết hạn.

Kiểm tra SSH thông:

```bash
ssh -i ~/.ssh/<key-cua-ban> root@169.58.33.8 'systemctl status aicloser --no-pager | head -5'
```

---

## 3. Deploy lên VPS

Script `deploy/setup.sh` là **idempotent** — dùng chung cho cả cài mới lẫn cập nhật. Nó tự: cài Node 20 nếu thiếu → `git reset --hard origin/main` → `npm ci --omit=dev` → ghi file systemd → `systemctl restart aicloser`.

### 3.1 Cài mới (máy trắng)

```bash
ssh root@169.58.33.8
git clone https://github.com/syanh12092024-maker/chatbot-AI-Talpha.git /opt/aicloser
cd /opt/aicloser && bash deploy/setup.sh
```

Script sẽ báo thiếu `.env` → copy các file ở **mục 5** vào `/opt/aicloser/` rồi chạy lại `bash deploy/setup.sh`.

### 3.2 Cập nhật code (quy trình hằng ngày)

1. Sửa ở local → test → commit → **push lên `main`**.
2. Từ máy local, một lệnh:

```bash
ssh -i ~/.ssh/aicloser_deploy root@169.58.33.8 'cd /opt/aicloser && bash deploy/setup.sh'
```

> `git reset --hard origin/main` sẽ **xóa mọi thay đổi sửa tay trực tiếp trên VPS**. Các file dữ liệu ở mục 5 an toàn vì chúng nằm trong `.gitignore` (git không đụng tới file untracked).

### 3.3 Lệnh vận hành thường dùng

```bash
systemctl status aicloser        # trạng thái
systemctl restart aicloser       # khởi động lại
journalctl -u aicloser -f        # xem log realtime
tail -f /var/log/aicloser.log    # log file
pm2 list && ss -ltnp             # kiểm tra app khác + cổng trước khi đụng vào
```

### 3.4 Rollback nhanh

```bash
cd /opt/aicloser && git log --oneline -10
git reset --hard <commit-tốt> && systemctl restart aicloser
```

---

## 4. Chạy ở local (dev)

```bash
cd messenger-closer
npm install
cp .env.example .env    # rồi điền giá trị thật
npm start               # hoặc npm run dev (tự reload)
```

Test AI ngay trong terminal, không cần Facebook (chỉ cần key AI):

```bash
npm run chat
```

Các script khác: `npm test` (node --test), `npm run report` (báo cáo), `npm run pages` (liệt kê page), `npm run subscribe` (đăng ký webhook cho page), `npm run wa:login` (lấy JID nhóm WhatsApp).

> **Lưu ý quan trọng khi dev local:** token Pancake chạy từ IP máy cá nhân thường bị chặn (**lỗi 121** trên mọi page). Muốn kiểm tra dữ liệu Pancake thật thì phải chạy trên VPS, đừng mất thời gian debug ở local. Ngoài ra bản local **không được bật webhook trỏ vào page thật** khi VPS đang chạy — sẽ trả lời trùng cho khách.

Webhook Meta (khi cần đấu nối): Callback URL `https://<domain-công-khai>/webhook`, Verify Token = `VERIFY_TOKEN` trong `.env`, subscribe field `messages` + `messaging_postbacks`.

---

## 5. Các file KHÔNG có trên git (phải gửi riêng)

Đây là toàn bộ file `.gitignore` chặn nhưng app cần để chạy. **Nguồn chuẩn là bản trên VPS `/opt/aicloser/`, không phải bản ở máy local** (bản local là dữ liệu test cũ, đã lệch xa).

### 5.1 Bắt buộc — thiếu là không chạy được

| File | Nội dung | Ghi chú |
|---|---|---|
| **`.env`** | Toàn bộ secret: API key AI, token Meta, token Pancake, mật khẩu dashboard | Xem danh sách biến ở mục 6. **Gửi qua kênh bảo mật.** |
| **`tokens.json`** | Kho token app Meta (id + label + token) | Chứa secret |
| **`pancake-shops.json`** | Map thị trường → `shop_id` + `api_key` Pancake (Saudi, UAE, Kuwait, Bahrain…) | Chứa secret |
| **`sheet.json`** | ID + URL Google Sheet nguồn Knowledge Base | |
| **`ai-enabled.json`** | Danh sách page ĐANG bật AI | **Đây là công tắc thật** — vòng lặp trả tin chạy theo file này |
| **`pages.json`** | Sổ cái page: tên, thị trường, marketer, token dùng, shop Pancake, tag | ~290 KB trên VPS |
| **`kb-overrides.json`** | Knowledge Base đã chỉnh tay: sản phẩm, mô tả, giá, ảnh theo từng page | ~450 KB — **tài sản quan trọng nhất, nhớ backup** |

### 5.2 Dữ liệu vận hành — nên copy để môi trường giống production

| File | Nội dung |
|---|---|
| `conv-state.json` | Trạng thái từng hội thoại (GREET / POST_SALE / owner…) — mất là bot xử lý sai khách đang dở |
| `script-versions/` | Lịch sử kịch bản marketer viết theo page (66 file, ~476 KB) |
| `botcake-templates.json` | Sổ template Botcake |
| `template-candidates.json` | Template chờ duyệt |
| `ai-order-queue.json` | Hàng chờ tạo đơn |
| `ai-created-orders.json` | Đơn do AI tạo |
| `stats.json` | Thống kê replies/orders/leads theo ngày & theo page (~300 KB) |
| `pancake-page-tokens.json`, `page-shop-cache.json`, `page-product-cache.json` | Cache — tự sinh lại được, copy cho nhanh |
| `health-state.json`, `miner-state.json` | Trạng thái tự sinh |

### 5.3 Log/lịch sử — chỉ copy nếu cần phân tích

`ai-messages.jsonl` (~4,4 MB, toàn bộ hội thoại), `ai-convs.json` (~185 KB), `miner-reports.jsonl`, `template-learn-reports.jsonl`, `*.log`, `wa-auth/` + `wa-qr.png` (phiên đăng nhập WhatsApp — **không chia sẻ**, mỗi máy tự `npm run wa:login`).

### 5.4 Lệnh gói + chuyển (chạy trên máy đã có SSH vào VPS)

```bash
ssh -i ~/.ssh/aicloser_deploy root@169.58.33.8 'cd /opt/aicloser && tar czf /tmp/aicloser-data.tgz .env tokens.json pancake-shops.json sheet.json ai-enabled.json pages.json kb-overrides.json conv-state.json botcake-templates.json template-candidates.json ai-order-queue.json ai-created-orders.json stats.json pancake-page-tokens.json page-shop-cache.json page-product-cache.json script-versions'
```

```bash
scp -i ~/.ssh/aicloser_deploy root@169.58.33.8:/tmp/aicloser-data.tgz ~/Downloads/
```

Giải nén vào thư mục gốc của repo (`messenger-closer/` ở local, hoặc `/opt/aicloser/` trên máy đích):

```bash
tar xzf ~/Downloads/aicloser-data.tgz -C <thư-mục-repo>
```

> Gói này **chứa secret**. Đặt mật khẩu khi gửi và xóa file `/tmp/aicloser-data.tgz` trên VPS sau khi lấy xong.

---

## 6. Danh sách biến `.env` (chỉ tên biến — giá trị gửi riêng)

**AI**
`AI_PROVIDER` (đang là `kimi`), `KIMI_API_KEY`, `ANTHROPIC_API_KEY`, `MODEL_CLOSER`, `MODEL_CLASSIFIER`

**Meta / Messenger**
`META_SYSTEM_TOKEN` (System User token của BM — có cái này thì tự kéo token mọi page), `META_BUSINESS_IDS`, `PAGE_ACCESS_TOKEN`, `VERIFY_TOKEN`, `APP_SECRET`, `GRAPH_VERSION`

**Pancake**
`PANCAKE_TOKEN` (token thử **đầu tiên**), `PANCAKE_TOKENS_EXTRA` (danh sách ngăn cách bằng dấu phẩy), `PANCAKE_API_KEY`, `PANCAKE_SHOP_ID`, `PANCAKE_POLL_MS`

> **Quy tắc kho token Pancake:** thứ tự trong `.env` **chính là thứ tự failover** khi page dính lỗi 103/105/121. Token chính phải là token phủ nhiều page đang bật AI nhất; token phủ nhiều page nhưng 0 page bật AI để cuối. Không giữ 2 token của cùng một tài khoản (so `uid` trong payload JWT, không so chuỗi token).

**Server / Dashboard**
`PORT` (3100), `PUBLIC_URL` (bắt buộc để bot gửi được **ảnh** — ảnh host tại `<PUBLIC_URL>/uploads/...`), `ADMIN_USER`, `ADMIN_PASS`, `KB_PATH`, `PAGE_REGISTRY`

**Ảnh gửi khách** (gửi dồn dễ bị Meta chặn spam #2022)
`IMG_MAX_PER_TURN`, `IMG_SAFE_MAX_PER_TURN`, `IMG_PILOT_PAGES`, `IMG_GAP_MS`, `IMG_RETRY`

**Cờ tính năng**
`FASTLANE`, `FASTLANE_INTRO`, `FASTLANE_TEMPLATES`, `FOLLOWUP`, `HUMAN_TAKEOVER`, `POST_SALE_ROUTER`, `AUTO_CREATE_ORDER`, `CTX_COMPRESS`, `LEAD_BUDGET`, `READINESS`, `READINESS_AUTO_DISABLE`, `BOTCAKE_TOKENS`, `BOTCAKE_YIELD_BEFORE_SEND`, `AI_WAIT_MS`, `AI_WAIT_MAX_MS`

---

## 7. Checklist cho dev mới

- [ ] Clone repo, `npm install`, chạy `npm run chat` cho quen luồng AI.
- [ ] Nhận gói file mục 5, giải nén vào repo local.
- [ ] SSH vào VPS, chạy `systemctl status aicloser` + `pm2 list` + `ss -ltnp` để nắm bức tranh cả máy.
- [ ] Mở dashboard `:3100/admin`, xem mục page / KB / thống kê.
- [ ] Đọc `README.md` (kiến trúc + 14 nguyên tắc AI chat với khách) và `docs/HUONG-DAN-SALE-MKT.md`.
- [ ] Thử một vòng deploy: sửa cái nhỏ → push `main` → chạy `deploy/setup.sh` → xem log.
