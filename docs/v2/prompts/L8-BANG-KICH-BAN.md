> ⛔ **BẢN NÀY ĐÃ LỖI THỜI (11/08/2026).** API Botcake được xác minh là CHỈ ĐỌC —
> mọi phương thức ghi trả 404. Dùng `L8-BOTCAKE-KICH-BAN.md` thay cho file này.

---

Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, production trên VPS 169.58.33.8 (39 page).

# LUỒNG 8 — BẢNG KỊCH BẢN TỰ ĐỘNG (2 cột: tự động / gợi ý AI)
### Vòng 2 · chạy sau khi L0 deploy xong

## Đọc trước khi làm
1. `docs/v2/07-KICH-BAN-TU-DONG.md` — **spec đầy đủ, đọc hết trước khi gõ dòng nào**
2. `src/fast-lane.js` — M06 đang chạy, bạn mở rộng từ đó
3. `docs/v2/08-SONG-SONG.md` §3 — LUẬT SỞ HỮU FILE
4. `src/kb.js` — cách đọc tab Google Sheet hiện có

## ⚠️ ĐỌC KỸ — kỳ vọng phải đúng, đừng thổi phồng
Đo thật trên 6.001 tin khách:
- Fast Lane (mẫu chung) hiện xử lý **36,2%**
- 3.827 tin còn lại chứa **3.259 tình huống KHÁC NHAU** — đuôi dài cực dài
- Chỉ **70 tình huống lặp ≥3 lần**, phủ 13,7% số tin leo AI
- Và ~216 trong số đó là `ok`/`yes`/`1`/`2` — **câu trả lời cho câu hỏi của AI**,
  biến thành mẫu cứng là **mất đơn**

👉 **Trần thực tế của luồng này là ~50%, không phải 80%.** Nếu kết quả đo vượt xa mức đó
thì gần như chắc chắn bạn đang bắt nhầm những tin cần AI.

## Phạm vi (bước 1–4 của spec §6, KHÔNG làm bước 5)

### ① Đọc tab `Kịch bản tự động` từ Google Sheet
Cột: `Page ID` · `Tình huống` · `Từ khoá bắt` · `Câu trả lời tự động` · `Gợi ý cho AI` ·
`Điều kiện` · `Ưu tiên` · `Trạng thái` · `Nguồn`

Bốn cách kết hợp 2 cột (bảng ở spec §1) — làm đúng cả bốn:
| Tự động | Gợi ý AI | Hành vi |
|---|---|---|
| ✅ | ✗ | bắn mẫu, 0 token |
| ✅ | ✅ | lần đầu bắn mẫu; khách hỏi lại → AI vào **kèm gợi ý** |
| ✗ | ✅ | luôn gọi AI, nhưng AI **biết cách trả lời đúng** |
| ✗ | ✗ | dòng vô nghĩa — validator chặn |

### ② Khớp luật trong `src/fast-lane.js`
Thứ tự ưu tiên ở spec §4 — **luật CẤM luôn thắng mọi dòng kịch bản**.
Giữ nguyên luật chống lặp đang có: một dòng chỉ bắn tối đa **1 lần/khách**, hỏi lại →
leo lên AI kèm "Gợi ý cho AI" của chính dòng đó.

### ③ Validator luật CẤM (spec §2) — phần quan trọng nhất
Chặn cứng, không cho `BẬT` nếu từ khoá rơi vào:
gật đầu/từ chối · số lượng & chọn gói · tên/SĐT/địa chỉ · phản đối giá · khiếu nại ·
câu trả lời chứa số tiền không nằm trong bảng giá.

Câu trả lời tự động vẫn phải **qua M09 Outbound Guard** như mọi tin khác, và phải **kết
bằng một bước tiến về phía đơn** (nguyên tắc 14).

### ④ Đo 3 chỉ số cho mỗi dòng
Ghi `rule` (mã dòng) vào Sổ AI cùng `lane`. Tính: `Lượt dùng` · `Hỏi lại ngay` (khách hỏi
lại cùng ý trong 2 lượt kế) · `Chốt sau đó`. Ngưỡng xấu ở spec §3.

**Không có bước ④ thì bước ⑤ (vòng học đêm, luồng vòng 3) vô nghĩa** — không đo được thì
không biết dòng nào tốt dòng nào xấu.

## Sở hữu file
✅ ĐƯỢC sửa/tạo: `src/fast-lane.js` · `src/rule-store.js` *(mới)* · `src/kb.js` *(chỉ phần
đọc tab mới)* · `src/admin-rules.js` *(mới)* · `public/rules.html` *(mới)* ·
`test/*.test.mjs` của mình · 1 dòng mount trong `admin.js` · 1 dòng link trong `admin.html`

⛔ CẤM đụng: `src/handler.js` · `src/pancake-poll.js` · `src/prompts.js` · `src/closer.js` ·
`src/outbound-guard.js` · `src/economics.js` · `src/experiment.js` · `src/followup.js` ·
`src/miner.js` · `src/admin-ops.js`

> ⚠️ `src/kb.js` cũng có thể do luồng khác đụng — chỉ **THÊM** hàm đọc tab mới, không sửa
> hàm sẵn có. Nếu buộc phải sửa, ghi rõ trong báo cáo.

## Ràng buộc bắt buộc
- Nhánh: `git checkout -b v2/l8-bang-kich-ban` (nền là `fix-images` **sau khi L0 gộp xong**)
- **KHÔNG deploy, KHÔNG commit** trừ khi được yêu cầu
- `.env` local PHẢI có `PANCAKE_READONLY=1`
- **Không xoá đơn Pancake**
- **HARD_RULES luôn thắng** — dòng kịch bản chỉ được thêm cách trả lời tình huống, không
  được ghi đè quy tắc tiền / PII / không-bịa / ngôn ngữ
- Câu trả lời tự động có số tiền → phải khớp **đúng một** gói trong bảng giá KB
- VPS chỉ ĐỌC, không ghi, không restart

## Nghiệm thu
- [ ] `npm test` xanh (không hỏng 54 test cũ, đặc biệt các test Fast Lane)
- [ ] Server boot sạch, `/health` = 200
- [ ] **Chạy lại trên ≥5.000 tin khách THẬT:** tỷ lệ Fast Lane tăng từ 36,2% lên
      **45–50%**. Nếu >60% → dừng lại, gần như chắc chắn bắt nhầm tin cần AI
- [ ] Validator chặn đúng 100% các từ khoá thuộc nhóm CẤM (test đủ 6 nhóm)
- [ ] Thêm dòng có câu trả lời chứa giá sai → **bị chặn**
- [ ] Mỗi dòng đo được 3 chỉ số, đối chiếu được bằng tay trên 20 ca
- [ ] Một khách không nhận cùng một câu mẫu 2 lần

## Cách làm việc mong đợi
Luật càng rộng càng nguy hiểm: mỗi tin bị bắt nhầm là một khách nhận câu trả lời máy móc
lạc đề. Khi phân vân một từ khoá có nên tự động không — **để nó lên AI**. Tốn ~130đ còn
hơn mất một đơn.
