Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, production trên VPS 169.58.33.8 (39 page).

# LUỒNG 5 — A/B + ĐUỔI THEO (M17 Experiment Engine · M12 Follow-up Engine)
### Vòng 2 · chạy sau khi L0 deploy xong và có báo cáo 48h

> 🔄 **Cập nhật 11/08/2026** (xem `docs/v2/09-VONG-2-CAP-NHAT.md`):
> · **M04 debounce thích ứng ĐÃ XONG** — gỡ khỏi luồng này, đừng làm lại (`src/turn-complete.js`, 5s/15s)
> · **M20 (`src/economics.js`) đã có** — M17 hết bị chặn. Gọi hàm của nó, ĐỪNG tính lại chi phí
> · **`scriptVersion` đã được ghi vào Sổ AI** (L1 làm) — dùng luôn làm khoá A/B
> · Số nền production đã đo: 9.036 lượt · 151 đơn · 7.502đ/đơn · ngân sách lượt-1 **69,7%**

## Đọc trước khi làm
1. `docs/v2/04-TANG-TU-TIEN-HOA.md` § M17 — spec A/B
2. `docs/v2/03-TANG-TANG-CHOT.md` § M12 — spec đuổi theo
3. `docs/v2/08-SONG-SONG.md` §3 — LUẬT SỞ HỮU FILE
4. Báo cáo 48h của L0 — số liệu production thật, dùng làm mốc so sánh

## Thứ tự BẮT BUỘC trong luồng này
**M17 trước, M12 sau.** M12 phải chạy dưới dạng A/B ngay từ ngày đầu — không thì không
biết nó tăng đơn hay chỉ làm phiền khách. Đừng làm ngược.

## Số liệu nền
- **52% khách (3.991 người) được AI trả lời rồi im luôn** — không ai đuổi theo. Đây là
  nhóm lớn nhất trong toàn hệ thống, lớn hơn cả nhóm chốt đơn (2,0%) 26 lần.
- Ca thật: khách *SilentBoo Yeaahmute* tự nhắn *"Interesado poh akong umorder pero mukhang
  kayo poh ang hindi interesado magpa order… 3 days na akong nakikipag negotiate… ok lang
  kung cancel nalang"*, **đã đưa tên Celieta Boca + số 71566943** — AI đáp "thanks madam"
  rồi mất trắng.
- Nghiên cứu ngành: theo sát trong 1 giờ → khả năng qualify cao gấp **7 lần**.

## Phạm vi

### ① M17 · `src/experiment.js` (mới)
- Chia nhánh theo **`HASH(customerId) % 100`**, KHÔNG chia theo tin — một khách phải nằm
  nguyên một nhánh suốt hội thoại, không thì kết quả vô nghĩa
- Ghi vết bằng `scriptVersion` đã có trong Sổ AI (L1 làm) — không tạo bảng riêng
- 5 chỉ số so sánh theo thứ tự ưu tiên: `closeRate` → `costPerOrder` → `replies/order`
  → tỷ lệ handoff → tỷ lệ im sau lượt 1
- **Luật phân thắng bại:** ≥7 ngày VÀ ≥100 khách/nhánh. B thắng khi `closeRate` cao hơn
  ≥20% tương đối VÀ `costPerOrder` không cao hơn quá 20%. **Hoà → giữ bản cũ.**
- **Rollback tự động** (không chờ hết 7 ngày): closeRate tụt >30% sau ≥48h & ≥50 khách ·
  tin bị M09 chặn tăng >3 lần · có tin vi phạm luật 2/8/9 của M09 · costPerOrder tăng >2 lần
- Mỗi page **chỉ 1 thí nghiệm tại một thời điểm**

### ② M12 · `src/followup.js` (mới)
- Cron 15 phút. Điều kiện chọn khách ở spec §M12 — đọc đủ 7 điều kiện, không bỏ cái nào
- Chọn góc theo lý do dừng (bảng ở spec)
- **Nhóm ưu tiên cao nhất: khách ĐÃ cho SĐT/tên mà chưa chốt → KHÔNG nhắn, đẩy thẳng
  sale gọi.** Đây là ca SilentBoo ở trên
- **Ràng buộc cứng:** tối đa **1 tin/khách/hội thoại**, không có lần 2 · không nhắn
  22:00–08:00 giờ địa phương của thị trường page · qua M09 Outbound Guard như mọi tin khác
  · công tắc tắt toàn cục + tắt theo page · ghi Sổ AI với `lane: "FOLLOWUP"`
- **Bắt buộc chạy dưới A/B của M17 ngay từ đầu.** Không đạt **+1 điểm phần trăm tuyệt đối**
  về tỷ lệ chốt sau 7 ngày thì tắt

## Sở hữu file
✅ ĐƯỢC sửa/tạo: `src/experiment.js` · `src/followup.js` · `src/scheduler-followup.js` *(mới)* ·
`src/conv-state.js` *(thêm trường `followupSent`)* · `test/*.test.mjs` của mình ·
1 dòng khởi động trong `server.js` · 1 dòng mount router nếu cần

⛔ CẤM đụng: `src/handler.js` · `src/pancake-poll.js` · `src/prompts.js` · `src/closer.js` ·
`src/kb.js` · `src/fast-lane.js` · `src/economics.js` · `src/turn-complete.js` · `public/admin.html`

> Cần đọc trạng thái hội thoại thì dùng `src/conv-state.js` (M05 đã có `getConv`,
> `allConvStates`). Cần biết chi phí thì gọi hàm của `src/economics.js` (L1 đã có) —
> **đọc, đừng sửa**.

## Ràng buộc bắt buộc
- Nhánh: `git checkout -b v2/l5-ab-followup` (nền là `fix-images` **sau khi L0 gộp xong**)
- **KHÔNG deploy, KHÔNG commit** trừ khi được yêu cầu
- `.env` local PHẢI có `PANCAKE_READONLY=1` — M12 gửi tin cho khách, bật nhầm là spam thật
- **Không xoá đơn Pancake**
- VPS chỉ ĐỌC, không ghi, không restart

## Nghiệm thu
- [ ] `npm test` xanh, không hỏng test cũ
- [ ] Server boot sạch, `/health` = 200
- [ ] **M17:** một khách luôn nằm đúng một nhánh suốt hội thoại (kiểm 200 ca) · bơm dữ
      liệu giả có nhánh B tệ → rollback tự động kích hoạt đúng · dashboard hiện bảng so sánh
- [ ] **M12:** không khách nào nhận >1 tin đuổi theo (kiểm trên mô phỏng 1.000 khách) ·
      nhóm "có SĐT chưa chốt" xuất hiện đầu hàng chờ sale · tin đuổi theo qua được M09
- [ ] **Chạy khô trên dữ liệu thật:** lấy Sổ AI + hội thoại thật từ VPS, liệt kê CHÍNH XÁC
      những khách nào sẽ nhận tin đuổi theo và nội dung là gì — **đưa cho chủ dự án xem
      trước khi bật**

## Cách làm việc mong đợi
M12 là module đầu tiên **chủ động nhắn khách khi khách không hỏi gì**. Sai là spam thật
người thật. Thà chạy khô nhiều vòng còn hơn bật sớm. Khi không chắc, mặc định là **không gửi**.
