# PHÁT HÀNH 25/09/2026 — GIAO DIỆN MỚI LÊN MÁY CHỦ

> Người quyết chọn phương án **(c) đè thẳng lên bản đang chạy**, sau khi được trình rõ ba rủi ro.
> Tôi làm (c) nhưng **sao lưu trước**, nên «mất 48 tệp» thành «cất đi, lấy lại được».

## 1 · Trước khi gõ — đo được gì

| Đo | Kết quả |
|---|---|
| Prod đứng ở | `429667d` (17/09), **49 commit sau** so với nhánh ta |
| Prod bẩn | **48 tệp mã sửa tại chỗ + 54 tệp lạ** — bản đang chạy KHÔNG có bản sao ở đâu |
| Lược đồ prod | 17 bản (mới nhất `017`), thiếu **018→024** |
| `origin/main` | đã nhảy `429667d → 0c6c1ed`; nhánh ta **bao trùm** main (`merge-base --is-ancestor` = CÓ) ⇒ deploy không làm mất commit nào |
| Hệ có đang phục vụ ai không | **KHÔNG.** `ai-enabled.json` = `[]` · `so_ai` 0 dòng · `lan_gui` 0 dòng · bot cũ trả lời lần cuối **28/08** |
| Van gửi trên prod | `V3_PANCAKE_GUI` · `V3_POS_GHI` · `V3_WA_GUI` · `V3_PAGE_XU_LY` — **không cờ nào được đặt** |

⇒ Rủi ro thấp **vì hệ đang im**, không vì bản mã đã sạch. Ghi rõ để không ai đọc nhầm.

## 2 · Trước đó: vá hai lỗ nửa-commit (HEAD không chạy được)

Đo bằng worktree SẠCH dựng từ HEAD — thứ mà `npm test` ở cây làm việc **không bao giờ thấy**:

| Lỗi | Ca đỏ | Vá bằng |
|---|---|---|
| `trang-thai.js` không export `aiDuocTraLoi` (bị nhập từ 22/09) | 43 | `2edc8c5` |
| `deploy/preflight.mjs` chưa vào repo mà `test/deploy-v3.test.mjs` đã vào | 1 | `6369fd3` |

Sau hai commit: 46 → **38 ca đỏ**. 38 ca còn lại **không vá được ở lượt này**: chúng đỏ vì
HEAD đang ở giữa một đợt sửa lớn **chưa commit của phiên khác** (22 tệp · +448/−393 dòng ·
`tools.js` `model.js` `prompts.js` `closer.js` `context.js` `pos/tao-don.js`). Bài kiểm đã vào
repo và mong hành vi mới; mã trong repo còn là bản cũ. Vá hộ là đoán ý người khác trên đường
tiền và bộ não bot ⇒ **không làm**.

📌 Đây là nợ đang mở, không phải việc đã xong. Xem mục 7.

## 3 · Sao lưu (làm TRƯỚC mọi thứ)

`/var/backups/aicloser/truoc-deploy-20260925T075932Z/`

| Tệp | Cỡ | Là gì |
|---|---|---|
| `opt-aicloser.tar.gz` | 91 M | TOÀN BỘ thư mục đang chạy, gồm cả 48 tệp sửa tại chỗ và 54 tệp lạ |
| `48-tep-sua-tai-cho.tar.gz` | 248 K | Riêng 48 tệp ấy, để lấy lại từng tệp cho dễ |
| `ds-tep-sua-tai-cho.txt` | — | Danh sách 48 tệp |
| `aicloser_v3.dump` | 22 M | `pg_dump -Fc` toàn bộ CSDL |
| `env.bak` · `*.service` | — | Cấu hình và bốn unit systemd |

Đĩa còn 77 G.

## 4 · Thứ tự đã gõ

1. đẩy nhánh `vao-ui-v3-17-09` lên origin → `f7228a0..6369fd3`
2. Prod: `git fetch` + `git checkout -f -B vao-ui-v3-17-09 origin/…` — sau đó cây chỉ còn **29 tệp dữ liệu không theo dõi** (giữ nguyên, KHÔNG `git clean`)
3. `npm ci --omit=dev`
4. **Lược đồ TRƯỚC**: `node db/migrate.js` → áp đủ **018 → 024**, tổng 24
5. Khởi động lại ba dịch vụ. **KHÔNG chạm `.env`** — van gửi giữ nguyên trạng thái đóng

## 5 · Nghiệm thu

| Đo | Kết quả |
|---|---|
| Ba dịch vụ | `aicloser` · `aicloser-v3` · `aicloser-worker-v3` đều **active** |
| Lỗi mới trong log 2 phút | **0 / 0 / 0** |
| Bot cũ `/health` | `{"ok":true,"pages":133}` — **bằng đúng số trước khi deploy** |
| Giao diện v3 | `127.0.0.1:3102/dang-nhap` → **200**; từ ngoài vào cũng **200** |
| Mã giao diện có phải bản mới | `/chung/dieu-huong.js` có `d.may.nhan` — dấu vết sửa hôm nay ✅ |
| Cột `page.giao_bot_moi` (024) | **có** trên CSDL thật |
| Van gửi | **0 cờ được đặt** — y như trước deploy |
| Cổng 3100 | vẫn **đóng** với bên ngoài (luật iptables sáng nay còn nguyên) |

⚠️ Một lượt đo hiểu nhầm: ngay sau restart `/health` trả `pages:0`. Không phải hồi quy — bot
nạp token mất ~30 giây (đọc Google Sheet + Meta API). Đo lại sau đó: **133**. Ghi ra để lần sau
đừng lùi nhầm vì một phép đo quá sớm.

## 6 · Đường lùi (còn nguyên giá trị)

```bash
# lùi MÃ về đúng bản đang chạy trước deploy
tar -xzf /var/backups/aicloser/truoc-deploy-20260925T075932Z/opt-aicloser.tar.gz -C /opt
systemctl restart aicloser aicloser-v3 aicloser-worker-v3

# lùi LƯỢC ĐỒ: KHÔNG dùng `migrate down` (án lệ 01/09 — mất dữ liệu, kẹt nửa chừng).
# Đường đúng là lùi CODE, GIỮ SCHEMA; 018→024 đều là bản THÊM, mã cũ chạy được với chúng.
```

## 7 · LƯỢT HAI (cùng ngày) — nợ 38 ca đỏ đã TRẢ

Người quyết ra lệnh đưa nốt đợt sửa đang dở của phiên song song vào repo:

| | |
|---|---|
| `fe12262` | 20 tệp `src/` + 3 tệp mới + 9 bài kiểm — đường tiền và bộ não bot |
| `c80a0b6` | phần ngoài `src/`: 4 công cụ đo, 4 tài liệu tiến độ, màn đơn, `.env.example`, skill |

**Bộ ca trên worktree SẠCH dựng từ HEAD: 2.017 ca · 1.995 xanh · 0 ĐỎ · 22 bỏ qua.**
Lần đầu tiên repo có tín hiệu xanh thật — trước đó «xanh» chỉ là con số của cây làm việc.

Deploy lại lượt hai: prod nay đứng ở **`c80a0b6`**, đúng bằng HEAD đã xanh.
Nghiệm thu lượt hai: ba dịch vụ `active` · lỗi mới **0/0/0** · `pages:133` · UI **200** ·
lược đồ **24 bản** · van gửi **0 cờ** (vẫn đóng).

⚠️ Lưu ý về lượt MỘT: lúc ấy prod bị đưa về bản chat CŨ HƠN thứ đang chạy sáng nay (vì
`checkout -f` bỏ 48 tệp sửa tại chỗ, mà chúng chính là đợt sửa này). Lượt hai đã trả lại
đúng — và nay chúng nằm trong commit, không còn là tệp trôi nổi trên máy chủ.

## 8 · Nợ mang theo sau lượt này
- 🔴 **Cả hệ không trả lời khách nào từ 28/08** — 0 page bật AI ở bot cũ, 0 page ở bot mới.
- 🟠 Một token Meta **hết hạn 11/09** (`Token app CHAT AI 13/7 (BM DN - Live)`) ⇒ chỉ 1/2 token khoẻ.
- 🟠 Cổng **3102 mở thẳng ra Internet, không HTTPS**.
- 🟠 Luật iptables cổng 3100 **chưa lưu** ⇒ reboot là cửa mở lại.
