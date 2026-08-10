Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, production trên VPS 169.58.33.8 (39 page).

# LUỒNG 9 — TỰ TIẾN HOÁ (M16 Script Optimizer + vòng đêm hoàn chỉnh)
### VÒNG 3 · chỉ chạy khi ĐÃ CÓ ĐỦ: M17 (L5) · M15 (L7) · M20 (L1) · M02 (L3)

## Đọc trước khi làm
1. `docs/v2/04-TANG-TU-TIEN-HOA.md` — **spec đầy đủ, đọc hết**
2. `docs/v2/07-KICH-BAN-TU-DONG.md` §3 — vòng học cho bảng luật (bước ⑤)
3. `docs/v2/08-SONG-SONG.md` §3 — LUẬT SỞ HỮU FILE
4. `src/miner.js` (M15) · `src/experiment.js` (M17) · `src/economics.js` (M20) — bạn nối chúng lại

## ⚠️ ĐỌC KỸ TRƯỚC KHI THIẾT KẾ
Tài liệu bản đầu ghi *"0/39 page có kịch bản riêng, M16 đi từ rỗng → có"*. **SAI, đã đính chính.**

Thực tế: **37/38 page đã có `greeting` + `salesPrompt` do marketer viết** (890–1.908
token mỗi page). Chỉ 1 page trống hoàn toàn, và `tone` thì 37/38 page chưa điền.

**Hệ quả với thiết kế của bạn:**
- M16 **KHÔNG phải khởi tạo**, mà là **tinh chỉnh trên nền một kịch bản đang sống**
- Mọi đề xuất phải ở dạng **DIFF** — sửa/thêm/bớt MỘT chỗ, kèm căn cứ trích từ hội thoại thật
- **TUYỆT ĐỐI không viết đè cả bài.** Kịch bản marketer viết là tài sản của người ta

## Phạm vi

### ① M16 · `src/optimizer.js` (mới)
Đầu vào: báo cáo M15 · kịch bản LIVE hiện tại · **sổ đen** (thay đổi đã từng thua A/B) ·
kịch bản của page **cùng ngành, cùng thị trường, closeRate cao nhất** (học lẫn nhau).

**Đổi MỘT thứ mỗi đêm**, ưu tiên theo thứ tự:
```
1. page chưa có kịch bản      → sinh đủ bộ (chỉ còn 1 page: Light Step Care KSA)
2. page chưa có `tone`        → sinh riêng trường tone (37/38 page đang thiếu)
3. có "killer" tần suất cao   → sửa văn phong kết lượt
4. có phản đối chưa gỡ được   → thêm objection
5. dropStage tập trung 1 chỗ  → sửa đúng bước đó
6. còn lại                    → tinh chỉnh salesPrompt (DIFF, không đè)
```

**Ràng buộc đưa thẳng vào prompt của M16** (spec §M16): chỉ được đổi giọng điệu & cách bán ·
không đụng quy tắc tiền/PII/không-bịa/không-cam-kết/ngôn ngữ · không bịa khuyến mãi ngoài KB ·
không viết số giá vào greeting/tone · mỗi thay đổi kèm LÝ DO trích từ M15 · tổng ≤1.200 token.

### ② Cửa duyệt của người — KHÔNG bỏ qua được
Màn hình diff (mẫu ở spec §M16): hiện Cũ / Mới / 📎 Căn cứ / 3 nút
`[Duyệt & chạy A/B]` `[Sửa rồi duyệt]` `[Bỏ + ghi lý do]`.
"Bỏ + ghi lý do" đưa vào **sổ đen** → M16 không đề xuất lại kiểu đó.

### ③ Vòng đêm hoàn chỉnh
```
02:00  M15 mổ 39 page (đã có ở L7)
02:30  M16 sinh đề xuất — CHỈ cho page KHÔNG đang chạy A/B
09:00  Bản tin marketer: đề xuất chờ duyệt + page thiếu kịch bản (M03)
cả ngày M17 gom số liệu, rollback tự động nếu cần (đã có ở L5)
CN     Báo cáo tuần: page nào tiến, page nào lùi, bản nào thắng
```

### ④ Vòng học cho bảng luật (nếu L8 đã xong)
Bước ⑤ của `07-KICH-BAN-TU-DONG.md` §3: cụm lặp ≥5 lần/7 ngày mà AI trả lời nhất quán
≥80% → đề xuất thành dòng tự động. **Chiều ngược lại:** dòng có "hỏi lại ngay" >25% hoặc
chốt tụt >30% → đề xuất **trả về cho AI**. Cả hai chiều đều phải người duyệt.

## Sở hữu file
✅ ĐƯỢC sửa/tạo: `src/optimizer.js` · `src/scheduler-nightly.js` *(mới)* ·
`src/admin-optimizer.js` *(mới)* · `public/optimizer.html` *(mới)* ·
`test/*.test.mjs` của mình · 1 dòng khởi động trong `server.js` · 1 dòng mount trong `admin.js`

⛔ CẤM đụng: `src/handler.js` · `src/pancake-poll.js` · `src/prompts.js` · `src/closer.js` ·
`src/fast-lane.js` · `src/miner.js` · `src/experiment.js` · `src/economics.js` · `src/kb.js`

> Đọc/gọi hàm của các module trên thì được — **sửa thì không**.
> Ghi kịch bản mới phải đi qua API của M02 (L3) để validator chạy, **không ghi thẳng vào
> `kb-overrides.json`**.

## Ràng buộc bắt buộc
- Nhánh: `git checkout -b v2/l9-tu-tien-hoa`
- **KHÔNG deploy, KHÔNG commit** trừ khi được yêu cầu
- `.env` local PHẢI có `PANCAKE_READONLY=1`
- **Không xoá đơn Pancake**
- **AI KHÔNG BAO GIỜ tự đẩy kịch bản lên production** — luôn phải người duyệt. Đây là
  luật của dự án, không có ngoại lệ
- **Rollback tự động phải chạy được trước khi bật M16** — bật sinh đề xuất mà chưa có
  đường lùi là đánh cược 39 page
- Không đưa PII vào prompt
- VPS chỉ ĐỌC, không ghi, không restart

## Nghiệm thu
- [ ] `npm test` xanh
- [ ] Server boot sạch, `/health` = 200
- [ ] Mọi đề xuất là **DIFF**, không phải viết đè toàn bộ kịch bản
- [ ] 0 đề xuất vi phạm ràng buộc (validator M02 chặn 100%)
- [ ] Mọi đề xuất kèm căn cứ trích từ hội thoại thật (câu nào, bao nhiêu ca)
- [ ] Đề xuất bị bỏ **không xuất hiện lại**
- [ ] Mỗi page chỉ 1 thí nghiệm tại một thời điểm
- [ ] **Chạy khô 1 đêm trên 39 page thật**, in ra toàn bộ đề xuất — đưa chủ dự án xem
      trước khi bật thật
- [ ] Sau 1 tuần: 38/38 page đủ 3 trường (`greeting` + `tone` + `salesPrompt`)

## Cách làm việc mong đợi
Đây là module duy nhất trong hệ thống **tự sửa chính hành vi bán hàng**. Rủi ro cao nhất
không phải bug, mà là **đề xuất nghe hay nhưng làm tụt tỷ lệ chốt** — và không ai nhận ra
trong 2 tuần. Vì vậy: đổi một thứ mỗi lần, luôn A/B, luôn có đường lùi, luôn có người duyệt.
Thà tiến chậm còn hơn tự tiến hoá sai hướng trên 39 page.
