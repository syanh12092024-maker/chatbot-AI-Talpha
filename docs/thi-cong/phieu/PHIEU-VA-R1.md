# PHIẾU VA-R1 — Bộ não KHÔNG được bắn HTTP thật + worker đọc van + guard đủ cờ (C1: RF-1·RF-2·RF-3)

**Base:** `57eff36` · **Làn:** 🟥 vi phạm luật số 1 (note/tag thật bay ra khách) · thợ **opus**

> Thợ nạp skill `tho-thi-cong`. Đọc sổ §0a + §9 (RF-1·2·3) + §9b. Đây là cụm CHẶN nặng
> nhất — refute đã có repro đo được, phiếu này biến repro từ ĐỎ sang XANH.

## ① Thi hành
- Verdict + repro: `docs/thi-cong/nhat-ky/refute-MANG-2.verdict.yaml` + `refute-MANG-2.repro.mjs`
  (S1·S3·S4 đang phá được). §9 RF-1/RF-2/RF-3.
- Luật số 1 §0a: máy dev TUYỆT ĐỐI không gửi/ghi thật ra khách.

## ② Vào/ra
**Vào (ĐO LẠI):** `src/chat/handler-v3.js:482` (gọi runCloser trước cửa) · `src/queue/worker.js:32`
(chayMotVong không đọc van) · `src/queue/nap.js:31` (nguonDangMo — cwd/V3_NAP_DEV mở nhầm) ·
`src/tools.js:197/266/271` + `order-bridge.js:255` (executeTool bắn HTTP — CẤM SỬA, chỉ đọc) ·
`handler.js:436-437` (v2 truyền orderCreated+isOrderSummary — khuôn đúng).

**Ra (bất biến, KHÔNG sửa file phẳng src/ cấm):**
1. **RF-1 — bộ não không bao giờ bắn HTTP thật khi van GỬI đóng.** Thợ ĐO `pancake.js`/
   `pkFetchPage` xem chặn ở tầng nào RẺ NHẤT mà không đụng file cấm — gợi ý: worker/handler
   bọc `globalThis.fetch` (hoặc cổng outbound của process) chặn mọi request tới pages.fm/graph
   khi van đóng + KHÔNG chạy tool-loop khi van đóng. Bất biến đo được: repro S4 ra **0 lượt HTTP**.
2. **RF-2 — worker đọc van + nguonDangMo không mở nhầm.** `chayMotVong` kiểm van GỬI trước khi
   cho executeTool chạy; `nguonDangMo` không phụ thuộc cwd (đọc env theo cùng nguồn ket-noi.js
   dùng — đường tuyệt đối); V3_NAP_DEV chỉ mở khi KHÔNG nối DB thật (hoặc bỏ hẳn, dùng biến khác).
3. **RF-3 — handler-v3 gọi guard ĐỦ cờ** `orderCreated` + `isOrderSummary` (khuôn v2:436-437) ⇒
   lượt tóm tắt xác nhận đơn/nhắc order-no KHÔNG bị PII_ECHO/FAKE_ORDER_ID chặn nhầm.

## ③ File được đụng
```
src/chat/handler-v3.js
src/queue/worker.js
src/queue/nap.js
test/va-r1-*.test.js
ops/bin/nghiem-thu/va-r1.sh
docs/thi-cong/nhat-ky/phieu-va-r1.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
```
⛔ CẤM sửa tools.js/closer.js/pancake.js/order-bridge.js/messenger.js (file phẳng). Nếu buộc
phải chèn cổng chặn, chèn ở handler-v3/worker (đất mày), KHÔNG trong file cấm.

## ④ Nghiệm thu — `ops/bin/nghiem-thu/va-r1.sh`
```bash
# 1. RF-1: node docs/thi-cong/nhat-ky/refute-MANG-2.repro.mjs S4 → 0 lượt HTTP (trước: 12)
# 2. RF-1: repro S1 → van đóng thì bộ não KHÔNG chạy tool-loop (0 lượt, không "chan_guard sau khi đã chạy")
# 3. RF-2: V3_NAP_DEV=1 + PANCAKE_READONLY=1 khi DB thật → van vẫn ĐÓNG (in kết quả nguonDangMo);
#    đổi cwd → không mở nhầm
# 4. RF-3: repro S3 → lượt tóm tắt đơn PASS guard (không PII_ECHO), lượt nhắc order-no PASS (không FAKE_ORDER_ID)
# 5. hồi quy: node --test test/l2-m1-*.test.js (cờ mock) + test cũ không gãy
```

## ⑤ Nhánh thật: repro dùng bẫy fetch, 0 byte ra mạng. ## ⑥ Ngoài phạm vi → §9.
## ⑦ ĐÃ TRA: RF-1/2/3 §9 — phiếu này SINH RA để đóng. Repro làm thước sẵn.
**Khi nộp:** nhật ký · §10 3 dòng · commit pathspec (`fix(chat): VA-R1 — ...`) · ≤12 dòng.
