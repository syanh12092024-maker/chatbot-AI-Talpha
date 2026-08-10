Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, production trên VPS 169.58.33.8 (39 page).

# LUỒNG 6 — VẬN HÀNH (M18 Ops Console · M19 Health Watchdog đầy đủ)
### Vòng 2 · chạy sau khi L0 deploy xong

> 🔄 **Cập nhật 11/08/2026** (xem `docs/v2/09-VONG-2-CAP-NHAT.md`) — thêm MỘT việc BẮT BUỘC:
>
> **Giám sát M05 khoá oan.** Đo mô phỏng production: **45% hội thoại bị khoá `HANDOFF`**
> vì cho là người thật đã tiếp quản. Sau khi vá thì phần lớn ca còn lại đúng là sale gõ
> thật, NHƯNG sổ nhận diện template **mới phủ 32,1% tin page** — 67,9% là vùng đoán.
> Đoán sai = AI tự khoá chính mình.
>
> Ops Console PHẢI có, theo từng page:
> · `HANDOFF` chiếm bao nhiêu % tổng hội thoại (🔴 nếu >15%)
> · **AI nhường Botcake 24h** — gọi `botcakeYieldStats()` trong `pancake-poll.js`
>   (🔴 nếu >50%: Botcake đang lấn hết phần AI, mày trả tiền cho AI mà nó không được nói)
> · Danh sách tin đã kích hoạt khoá, để người soi xem có oan không
>
> Và tab Botcake nay **có API thật để nạp** — xem `09-VONG-2-CAP-NHAT.md` §1②
> (chỉ đọc được từ khoá qua TÊN flow, KHÔNG đọc được nội dung trả lời).

## Đọc trước khi làm
1. `docs/v2/05-TANG-VAN-HANH.md` § M18, § M19 — spec đầy đủ
2. `docs/v2/08-SONG-SONG.md` §3 — LUẬT SỞ HỮU FILE
3. `src/llm-health.js` — bản rút gọn của M19 đã chạy, bạn mở rộng từ đó
4. `src/bot-registry.js` — sổ nhận diện template Botcake, M18 phải cho sửa được từ dashboard

## Số liệu nền
- **Bot chết 2 ngày (09–10/08/2026)** vì tài khoản Kimi hết tiền. `systemctl` vẫn `active`,
  dashboard vẫn xanh, **không ai biết**. Log ghi 28.469 lần "insufficient balance".
- Trong 2 ngày đó bot vẫn cần cù đẩy **2.652 khách** vào hàng chờ sale với lý do
  "⚙️ Lỗi kỹ thuật" — làm ngập hàng chờ bằng rác.
- **75% hội thoại có AI bị Botcake đâm ngang**, và **không ai nhìn thấy Botcake đang chạy
  kịch bản gì** — đó là vùng mù hoàn toàn.

## Phạm vi

### ① M18 · Ops Console — `src/admin-ops.js` + `public/ops.html` (mới)
Bảng page: `AI` · `Sẵn sàng` · `Botcake` · `Thẻ` · `POS` · `Chốt` · `đ/đơn` · `Cảnh báo`

**Tab Botcake — phần quan trọng nhất, đây là vùng mù hiện tại:**
- Liệt kê/sửa mẫu nhận diện template (`src/bot-registry.js` có `listTemplates`,
  `addTemplate`, `reloadTemplates` sẵn — chỉ cần UI)
- Cột **"Điều kiện khoá đã đặt chưa"** — đánh dấu tay, kèm hướng dẫn: mọi kịch bản Botcake
  phải có điều kiện *"không chạy nếu hội thoại có thẻ `AI Chăm`/`AI Chốt`/`AI back Sale`"*
- Cột **"Va chạm 24h"** — đếm số lần template Botcake xuất hiện TRONG phiên AI. Đây là
  thước đo M05 có thật sự hiệu quả không

**Tab Token:** token nào phủ bao nhiêu page, page nào bật AI, token chết chưa. Kèm cảnh báo
nếu token CHÍNH không phủ nhiều page bật AI nhất (thứ tự trong `.env` = thứ tự failover).

**Tab Tin bị chặn:** `blockedLog()` / `blockedStats()` trong `src/outbound-guard.js` đã có sẵn.

**Tab Trạng thái hội thoại:** `convStateStats()` trong `src/conv-state.js` đã có sẵn.
Đây là nơi phát hiện M05 khoá oan — nếu `HANDOFF` >15% tổng hội thoại là có vấn đề.

### ② M19 đầy đủ · `src/health.js` (mới)
Mở rộng `src/llm-health.js` sang toàn bộ 9 chỉ số ở spec §M19. Ba thứ bắt buộc:
- **Kiểm tra sống định kỳ:** mỗi 10 phút gọi LLM 1 tin ~20 token để xác nhận credit còn
  (chi phí ~4.000đ/tháng — rẻ hơn 2 ngày chết vô số lần)
- **Cảnh báo WhatsApp** (dùng `src/wa.js` sẵn có) cho mức 🔴
- **Báo cáo sức khoẻ 09:00 hằng ngày** kể cả khi mọi thứ bình thường — im lặng không phải
  là tín hiệu tốt, đó chính là cái bẫy đã làm bot chết 2 ngày

## Sở hữu file
✅ ĐƯỢC sửa/tạo: `src/admin-ops.js` · `public/ops.html` · `src/health.js` ·
`src/llm-health.js` · `src/bot-registry.js` · `test/*.test.mjs` của mình ·
1 dòng mount trong `admin.js` · 1 dòng link trong `admin.html`

⛔ CẤM đụng: `src/handler.js` · `src/pancake-poll.js` · `src/prompts.js` · `src/closer.js` ·
`src/kb.js` · `src/fast-lane.js` · `src/economics.js` · `src/experiment.js` · `src/followup.js`

> Cần số liệu chi phí thì **gọi hàm** của `src/economics.js` (L1 đã làm), đừng tính lại.

## Ràng buộc bắt buộc
- Nhánh: `git checkout -b v2/l6-van-hanh` (nền là `fix-images` **sau khi L0 gộp xong**)
- **KHÔNG deploy, KHÔNG commit** trừ khi được yêu cầu
- `.env` local PHẢI có `PANCAKE_READONLY=1`
- **Không xoá đơn Pancake**
- Dashboard chạy trên IP công khai → mọi route mới phải nằm sau Basic Auth như `admin.js` hiện có
- **KHÔNG để lộ `api_key` / token Pancake ra HTML hay log** — chỉ hiện 4 ký tự cuối
- VPS chỉ ĐỌC, không ghi, không restart

## Nghiệm thu
- [ ] `npm test` xanh
- [ ] Server boot sạch, `/health` = 200
- [ ] Nhìn 1 màn hình biết page nào **không chạy được và vì sao**
- [ ] Rút API key → cảnh báo đỏ + WhatsApp trong ≤5 phút
- [ ] Trong lúc lỗi LLM: **0** handoff `kind=error` được tạo (đã có ở bản rút gọn, đừng làm hỏng)
- [ ] Nạp lại credit → tự chạy tiếp, **không cần restart tay**
- [ ] Số "va chạm Botcake 24h" đối chiếu được bằng tay trên ≥20 hội thoại thật
- [ ] Không có token/api_key nào lộ trong HTML nguồn hoặc log

## Cách làm việc mong đợi
Đây là luồng để **người vận hành nhìn thấy sự thật**, không phải để dashboard đẹp. Mỗi ô
trên màn hình phải trả lời được một câu hỏi cụ thể mà hôm nay không ai trả lời được.
Ô nào không trả lời câu nào thì bỏ.
