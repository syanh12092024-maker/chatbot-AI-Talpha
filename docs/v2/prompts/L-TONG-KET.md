Bạn đang làm việc trong repo `/Users/syanh/Desktop/Chat Bot AI/messenger-closer` — bot AI
bán hàng Messenger qua Pancake, production trên VPS 169.58.33.8 (39 page bật AI, 277 page tổng).

# PHIÊN TỔNG KẾT — nghiệm thu 8 luồng, chốt tình trạng thật, chuẩn bị deploy

Đây **không phải phiên code**. Việc của bạn là **kiểm chứng và tổng kết**: 8 phiên đã chạy
song song, mỗi phiên chỉ thấy phần của mình. Bạn là người duy nhất nhìn toàn cảnh.

Nhiệm vụ: trả lời được **"cái gì thật sự đang chạy được, cái gì chỉ có trên giấy, cái gì
đang mâu thuẫn nhau, và có deploy được chưa"**.

---

## 0. Bối cảnh — 8 luồng đã chạy

| Vòng | Luồng | Module |
|---|---|---|
| 1 | L1 ĐO | M20 Unit Economics · Sổ AI ghi `scriptVersion` |
| 1 | L2 LUỒNG CHAT | M11 ngân sách lượt · M13 hậu bán · M07 nén ngữ cảnh |
| 1 | L3 NHẬP LIỆU | M01 Registry · M02 Script Studio · M03 Readiness |
| 1 | L4 PROMPT | Bỏ lần gọi LLM của classifier · gộp `BASE`+`HARD_RULES` |
| 2 | L5 | M17 A/B · M12 Follow-up |
| 2 | L6 | M18 Ops Console · M19 đầy đủ · giám sát khoá oan |
| 2 | L7 | M15 Miner · tự học sổ template · M14 Order Bridge |
| 2 | L8 | `botcake.js` chỉ đọc · báo cáo trùng · bảng kịch bản 2 cột |

Ngoài kế hoạch (làm ở phiên chính): **M04** debounce thích ứng · **M05** Conversation Owner ·
**M06** Fast Lane · **M09** Outbound Guard · **M19 rút gọn** · `our-messages.js` · `bot-registry.js`

## Đọc trước khi làm
1. `docs/v2/00-TONG-QUAN.md` — kiến trúc, 20 module, mô hình dữ liệu, mục tiêu số §8
2. `docs/v2/06-LO-TRINH.md` — trạng thái + phụ thuộc cứng
3. `docs/v2/08-SONG-SONG.md` + `09-VONG-2-CAP-NHAT.md` — phân luồng, sở hữu file
4. `docs/v2/prompts/L*.md` — **tiêu chí nghiệm thu của TỪNG luồng**, đây là thước đo
5. `.claude/skills/chatbot/` — luật vận hành, 14 nguyên tắc, sổ sự cố

---

## 1. ⚠️ Thái độ bắt buộc: NGHI NGỜ TÀI LIỆU

Bộ tài liệu này **đã sai 3 lần** ở đúng những chỗ quan trọng, mỗi lần chỉ lộ ra khi có ai
đó đo lại trên dữ liệu thật:

| Tài liệu từng ghi | Sự thật đo được |
|---|---|
| "0/39 page có kịch bản riêng" | **37/38 page đã có** — đọc nhầm một tầng JSON |
| "system prompt 3.290 token" | **~4.686 token** — lần đo đầu config rỗng |
| "API Botcake tạo được từ khoá" | **CHỈ ĐỌC** — mọi phương thức ghi trả 404 |

Và các phiên con cũng có thể báo cáo lạc quan hơn thực tế. **Không nhận bất kỳ con số nào
mà không tự chạy lại.** Con số nào không tự kiểm chứng được thì ghi rõ là "chưa kiểm chứng",
đừng chép lại.

---

## 2. Việc phải làm

### A · Kiểm kê thật
Với **mỗi module trong 20 module**: có file không · có test không · có được **nối vào luồng
chạy** không (nhiều module tồn tại nhưng không ai gọi) · có bị công tắc `.env` tắt không.

Bảng kết quả: `Module | File | Test | Đã nối | Công tắc | Trạng thái thật`

Trạng thái thật chỉ có 4 giá trị: **CHẠY ĐƯỢC · CÓ CODE CHƯA NỐI · CHỈ CÓ SPEC · KHÔNG CÓ GÌ**.

### B · Đối chiếu từng tiêu chí nghiệm thu
Mỗi `prompts/L*.md` có mục "Nghiệm thu" với checklist. **Tự chạy lại từng mục**, đánh
✅ / ❌ / ⚠️ chưa kiểm được. Không tin lời phiên con.

### C · Soi mâu thuẫn giữa các luồng
8 phiên sửa song song, mỗi phiên chỉ thấy phần mình. Soi ít nhất:

- **Hai nơi cùng làm một việc** — vd L2 (`lead-score.js`) và L4 (bỏ `score_lead`) cùng chấm
  điểm lead; L7 (`template-learner`) và L6 (`bot-registry`) cùng đụng sổ template;
  L8 (`fast-lane.js`) và bảng kịch bản cùng khớp từ khoá
- **Ngân sách lượt bị trừ hai lần** — tin Fast Lane xử lý (0 token) **không được** trừ
  ngân sách lượt AI của M11
- **`scriptVersion` (L1) và phiên bản kịch bản (L3)** có dùng chung một cách đánh version không
- **Ai ghi Sổ AI** — nếu 2 module cùng ghi một lượt thì thống kê đếm đôi
- **Thứ tự cửa canh trong `handler.js`/`pancake-poll.js`** — M06 → M11 → M13 → M07 → M08 →
  M09 có đúng thứ tự spec không, có cửa nào bị vượt mặt không
- **File bị sửa ngoài quyền sở hữu** — `git log --stat` từng nhánh, đối chiếu bảng §3
  của `08-SONG-SONG.md`

### D · Chạy lại 6 con số nền trên DỮ LIỆU THẬT
Kéo dữ liệu từ VPS (**chỉ đọc**), chạy lại và so với mốc:

| Chỉ số | Mốc đã đo | Cách kiểm |
|---|---|---|
| Fast Lane xử lý | **36,2%** | ≥5.000 tin khách thật |
| M09 chặn tin AI | **2,0%** | ≥4.000 tin AI + **bảng giá thật của ĐÚNG page đó** |
| M05 khoá hội thoại | **45%** | ≥60 hội thoại thật |
| Sổ nhận diện template phủ | **32,1%** | tin do page gửi |
| M04 bắt cụm còn dở | **83,2%** | 1.354 tin khách có nhãn |
| Chi phí/đơn | **7.502đ** | `economics.js` + `recount()` |

⚠️ **Bẫy đã vấp:** lần đo đầu báo M09 chặn 19% vì dùng KB giả; đo lại với KB thật của đúng
từng page thì còn 2,0%. **Luôn khớp KB theo `pageId`.**

Con số nào **lệch >20%** so với mốc → điều tra, đừng ghi nhận suông.

### E · Rà trôi tài liệu
Tìm chỗ tài liệu nói khác code. Sửa **tài liệu** cho đúng code thật (trừ khi code sai luật
dự án thì báo). Chú ý: các mốc số nằm rải trong 10 file `docs/v2/`.

### F · Sổ rủi ro
Liệt kê mọi thứ **chưa xong / chưa chắc / có thể vỡ khi lên production**, xếp theo mức
thiệt hại. Với mỗi mục: hiện tượng sẽ thấy · cách phát hiện · cách lùi.

Bốn thứ đã biết, phải có trong sổ:
1. **Chưa module nào chạy trên khách thật** — 8 luồng, mọi con số đều là replay
2. **M05 có thể khoá oan** — sổ nhận diện mới phủ 32,1%, phần còn lại là đoán
3. **M12 Follow-up chủ động nhắn khách** — sai là spam thật người thật
4. **Tin doạ khách ở công cụ RTO** — không nằm trong repo này, không code nào chặn được

### G · Gói deploy
- Thứ tự bật/tắt bằng `.env`: cái nào bật ngay, cái nào để tắt chờ quan sát
- Lệnh deploy + lệnh lùi (ghi rõ commit hash để lùi về)
- **Danh sách 10 chỉ số theo dõi 48h đầu, kèm ngưỡng LÙI NGAY**
- 20 hội thoại thật cần đọc tay sau 24h (số liệu không bắt được "câu trả lời vô duyên")

---

## 3. Đầu ra

Đúng **một** file: `docs/v2/10-TONG-KET-V2.md`

```
① Kết luận một dòng: deploy được / chưa, vì sao
② Bảng 20 module — trạng thái thật
③ Bảng nghiệm thu 8 luồng — ✅/❌/⚠️ từng mục
④ Mâu thuẫn giữa các luồng + đã xử lý thế nào
⑤ 6 con số nền: mốc cũ vs đo lại
⑥ Sổ rủi ro xếp theo thiệt hại
⑦ Gói deploy: thứ tự, công tắc, lệnh lùi, 10 chỉ số 48h
⑧ Việc chỉ chủ dự án làm được (còn treo)
```

Viết cho **người sẽ bấm nút deploy lúc 2 giờ sáng** đọc. Ngắn, thẳng, có số.

---

## 4. Ràng buộc bắt buộc

- **KHÔNG deploy.** Chỉ chuẩn bị gói + chờ chủ dự án duyệt bằng lời
- **KHÔNG viết tính năng mới.** Thấy thiếu thì ghi vào sổ rủi ro. Ngoại lệ duy nhất:
  lỗi làm **hỏng dữ liệu thật hoặc gửi bậy cho khách** thì vá ngay, ghi rõ
- **KHÔNG commit** trừ khi được yêu cầu
- `.env` local PHẢI có `PANCAKE_READONLY=1` — kiểm trước khi chạy bất cứ gì
- **Không xoá đơn Pancake** ở mọi trạng thái
- VPS **chỉ ĐỌC** — không ghi, không restart, **không copy file vào `/opt/aicloser`**
  (đã có tiền lệ làm bẩn thư mục production, phải dọn)
- Key Botcake / token Pancake là credential: không log, không đưa vào HTML, không commit
- `npm test` phải xanh trước và sau mọi thay đổi bạn chạm vào

## 5. Cách làm việc mong đợi

Việc của bạn là **tìm ra chỗ hỏng trước khi khách hàng tìm ra**. Một báo cáo "mọi thứ ổn"
mà không kèm bằng chứng chạy lại thì vô giá trị — và gần như chắc chắn sai, vì 8 phiên
song song chưa bao giờ vừa vặn hoàn hảo.

Ba câu phải trả lời được bằng số, không bằng cảm giác:
1. Nếu deploy đêm nay, **cái gì có xác suất vỡ cao nhất**?
2. Vỡ rồi thì **bao lâu mới biết**, và **nhìn vào đâu** để biết?
3. **Lùi về đâu**, mất bao lâu?
