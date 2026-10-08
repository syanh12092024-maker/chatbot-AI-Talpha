# MỞ VAN — Go-live bước ① (mã điều kiện pilot lên prod, 0 page bật) · 08/10/2026

> **TRẠNG THÁI: 📝 NHÁP — CHƯA GẬT.** Chờ: RP1 vòng 2 + RP2 đối kháng xong · cửa vào `ops/bin/phat-hanh.sh` · người quyết gật «push + deploy bước ①».

## 1 · Mở cái gì

Mã từ prod `8dc9bcd` → HEAD nhánh `vao-ui-v3-17-09` (khoảng 90+ commit): TT1 · TT1b (tệ theo thị trường shop) · GP1 (Điền giá từ đơn POS + miễn ship) · GSP3c ·
GL1 (preflight) · GL2 (trần page toàn hệ) · GL3 · GL3b · GL3c (Pancake lỗi/chậm: không trả lời mù, không câm, ngắt page theo thời gian) · GL4 (ngắt page 30′ khi kênh lỗi) ·
GL7a (rào) · RP1 · RP2 (đường đọc CSDL đủ cho pilot). **Migration:** `033_nap_bo_qua_doc_tin_loi` · `034_page_ngat_kenh` (chỉ THÊM / nới CHECK). **Biến mới đặt:**
`V3_TRAN_PAGE_BAT=1` trong `.env` (vắng = 0 ⇒ cổng bật page từ chối mọi page). **KHÔNG** bật page nào, **KHÔNG** mở van gửi (`V3_PANCAKE_GUI=0` + `PANCAKE_READONLY=1`
ghim ở unit giữ nguyên), **KHÔNG** bật `V3_RAP_PROMPT_BAT` (bước ③), **KHÔNG** mở POS (`V3_POS_GHI=0`).

## 2 · Bậc phơi

② prod, đường màn quản trị + worker chạy mã mới với 0 page bật (`page.bot_ai_bat` 0/582 — đo trước khi gõ). Khách không thấy gì. Người dùng thấy: màn Sản phẩm («Điền giá
từ đơn POS»), đèn Sức khoẻ mới (trần page, ngắt kênh), màn Page & Bot (nhãn ngắt kênh).

## 3 · Cửa vào (máy dev) — điền khi chạy

| # | Phép | Số đo |
|---|---|---|
| ① | cây sạch | |
| ② | so origin | |
| ③ | `npm test -- --test-force-exit` | |
| ④ | cổng (rc tách dòng; nợ cũ đúng tên) | |
| ⑤ | biến khai (`V3_TRAN_PAGE_BAT` · `V3_LUAT_CHUNG_CSDL` · `V3_PANCAKE_HAN_*` trong `bien-moi-truong-v3.md`) | |
| ⑥ | máy dev không gửi (`PANCAKE_READONLY=1`) | |
| ⑦ | prod sống trước khi đụng | |

## 4 · Ngưỡng + mốc quan sát (viết trước)

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| trước | prod sống · 0 page bật · migration 32 · worker/giao diện active | `systemctl is-active aicloser-v3 aicloser-worker-v3` · SELECT đếm `bot_ai_bat` · `_migrations` | không sống / có page bật ⇒ KHÔNG mở |
| sau migrate | `_migrations` = 34, áp mới 2 (033, 034) | `node --env-file=.env db/migrate.js` | lỗi ⇒ dừng, KHÔNG restart (mã cũ chịu được schema mới) |
| +1′ | sống, không vòng restart · `/dang-nhap` 200 | `is-active` · đếm `Started` · curl | chết / Started > 1 ⇒ lùi |
| +5′ | lỗi mới trong journal cả hai unit | `journalctl -u aicloser-v3 -u aicloser-worker-v3 --since <giờ restart> \| grep -iE "error\|throw\|ECONN"` | lỗi mới lặp ⇒ lùi |
| +15′ | worker vòng lặp khoẻ: log «0 page» (trần 1, 0 bật) · đèn Sức khoẻ không đỏ sai · 0 POST ra Pancake | journal worker · màn `/suc-khoe` | lệch ⇒ điều tra, lùi nếu do bản này |

## 5 · Đường lùi (viết trước)

Lùi mã: `cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 8dc9bcd && systemctl restart aicloser-v3 aicloser-worker-v3` (< 1 phút). **Giữ lược đồ 033/034** (mã cũ
không đọc cột mới; 033 chỉ nới CHECK) — `migrate down` KHÔNG phải đường lùi trên CSDL thật (mo-van §5; nợ N-GL4-DOWN-GIU-PAGE). `V3_TRAN_PAGE_BAT=1` để nguyên (mã cũ
không đọc). Không mất dữ liệu: đợt này không xoá dòng nào. Sao lưu `.env` trước khi sửa vào `/var/backups/aicloser/`.

## 6 · Lệnh sẽ gõ (sau khi người quyết gật)

1. Máy dev: `git push origin vao-ui-v3-17-09` (fetch + kiểm origin không đi tiếp trước).
2. Prod: đo «trước» (mục 4).
3. Prod: `cd /opt/aicloser && git fetch origin && git checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09` · `git status --porcelain` (chỉ các `.env.bak-*` cũ chưa theo dõi).
4. Prod: `node --env-file=.env db/migrate.js` ⇒ «ÁP 033 · ÁP 034 · áp mới 2». **Migration TRƯỚC, restart SAU.**
5. Prod: sao lưu `.env` rồi thêm dòng `V3_TRAN_PAGE_BAT=1`.
6. Prod: `node --env-file=.env deploy/preflight.mjs --tran` (đọc thuần) ⇒ exit 0.
7. Prod: `systemctl restart aicloser-v3 aicloser-worker-v3` (CẢ HAI — worker đổi mã; biến trần đọc lúc khởi động).
8. Mốc +1′ / +5′ / +15′.

## 7 · Số đo tại từng mốc — điền khi chạy

## 8 · Kết — giữ / lùi / mở bậc sau

## 9 · Nợ phát sinh

- `/opt/aicloser` có 8+ tệp `.env.bak-*` cũ CHƯA theo dõi git (chứa khoá) nằm trong cây chạy — nên dời ra `/var/backups/aicloser` (chmod 600) — nợ vệ sinh.
- `.env` prod quyền 644 — nên 600.
- `V3_PAGE_XU_LY` (chết) ghim ở unit worker — gỡ ở lượt sửa unit kế (bước ④ sửa unit để mở van gửi).

## 10 · Ai gật, lúc mấy giờ
