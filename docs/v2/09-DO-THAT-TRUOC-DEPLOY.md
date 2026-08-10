# Đo thật trước deploy — Phần B của luồng gộp

> Chạy 11/08/2026 · code đã gộp đủ 4 nhánh vòng 1 · dữ liệu THẬT kéo từ VPS (chỉ đọc).
> Đây là lần đầu các con số của vòng 1 được đo trên khách thật thay vì replay giả định.

## Nguồn dữ liệu

| Nguồn | Lượng | Cách lấy |
|---|---|---|
| Sổ AI (`ai-messages.jsonl`) | 16.097 bản ghi · 9.036 tin AI · 39 page · 22/07→10/08 | `scp` từ VPS |
| Hội thoại Pancake | 2.205 hội thoại · 32.140 tin · 39 page | script GET-only chạy trên VPS |
| Bảng giá | `kb-overrides.json` thật + Google Sheet | `scp` từ VPS |

Chỉ gọi 2 API đọc (`/conversations`, `/messages`). Không gửi tin, không gắn thẻ, không
đụng đơn. File tạm trên VPS đã xoá sau khi kéo về.

**Danh sách page lấy từ Sổ AI, không lấy từ `listAiEnabled()`** — vì hôm nay
`ai-enabled.json` rỗng: AI đang **TẮT TRÊN TOÀN BỘ PAGE** ở production (bot chết vì hết
credit Kimi). Page trong Sổ AI đúng là những page đã chạy AI trên khách thật.

---

## B1 · Tỷ lệ Fast Lane — **33,7%**  (kỳ vọng ≥36% · ngưỡng lùi <25% hoặc >60%)

7.886 tin khách thật.

| lane | số tin | tỷ lệ |
|---|---|---|
| `tpl_price` | 933 | 11,8% |
| `tpl_start` | 457 | 5,8% |
| `silent_sticker` | 416 | 5,3% |
| `silent_start` | 273 | 3,5% |
| `tpl_ship` | 187 | 2,4% |
| `tpl_greet` | 124 | 1,6% |
| còn lại (`silent_affirm/greet/thanks`, `tpl_howto`) | 271 | 3,4% |

Thấp hơn dự phóng 36,2% một chút, nhưng nằm giữa dải an toàn.

### Con số này suýt là 25,5% — và đó là một lỗi thật

`state.aiTurns` đang gánh **hai câu hỏi khác hẳn nhau**:

1. *"Đã tiêu bao nhiêu lượt ĐẮT TIỀN?"* → ngân sách M11
2. *"Bot đã mở miệng lần nào chưa?"* → cửa im lặng của Fast Lane
   (sticker, bấm START lại, "ok", chào lại — chỉ được im khi bot đã nói ít nhất 1 lần)

Bản vá kiểm tra chéo ④ sửa đúng vế (1): câu mẫu Fast Lane tốn 0 token nên không được trừ
ngân sách. Nhưng dùng chung một biến thì nó **làm hỏng vế (2)**: hội thoại mà Fast Lane lo
trọn vẹn sẽ mãi đứng ở `aiTurns = 0`, không lane im nào mở được.

Đo thật cả hai cách trên cùng 7.886 tin:

| cách đếm | Fast Lane |
|---|---|
| đếm mọi tin của page (kể cả template Botcake) — **quá thoáng** | 42,0% |
| chỉ đếm lượt gọi model — **đúng ngân sách, sai cửa im lặng** | **25,5%** ← chạm ngưỡng lùi |
| tách hai bộ đếm — **bản đang dùng** | **33,7%** |

Đã tách: `recentReplyCount()` (ngân sách, chỉ lane `AI`) và `recentBotTurns()`
(bot đã nói chưa, mọi tin kể cả Fast Lane), `state.aiTurns` và `state.botTurns`.

---

## B2 · Guard — **9,5% bị bắt**, nhưng không phải luật quá chặt

8.327 tin AI thật, mỗi tin khớp bảng giá của **đúng page đó**.

Con số 9,5% cao hơn hẳn kỳ vọng ~2%. Nhưng gộp `block` và `rewrite` vào một số là sai —
hai hậu quả khác hẳn nhau:

| | số tin | tỷ lệ | hậu quả |
|---|---|---|---|
| **BLOCK** | 463 | 5,6% | tin bị bỏ, AI im với khách |
| **REWRITE** | 329 | 4,0% | gọi model viết lại 1 lần, khách vẫn nhận tin (+0,04 call/lượt) |

| luật | hành động | số | tỷ lệ | đọc tay |
|---|---|---|---|---|
| `EMPTY` | block | 462 | 5,5% | **bắt đúng** — AI đã thật sự gửi 489 tin `"..."` cho khách |
| `FAKE_SCARCITY` | rewrite | 154 | 1,8% | **bắt đúng 152/154** — AI bịa "LIMITED PROMO TODAY 60% OFF" mà KB không hề có |
| `PII_ECHO` | rewrite | 126 | 1,5% | bắt đúng phần lớn — chỉ 19% là tóm tắt đơn hợp lệ |
| `PRICE_MISMATCH` | rewrite | 43 | 0,5% | bắt đúng |
| `DELIVERY_PROMISE` | rewrite | 6 | 0,1% | bắt đúng |
| `VIETNAMESE` | block | 1 | 0,0% | bắt đúng |

`FAKE_SCARCITY` bắt theo từ khoá: `limited promo` 116 · `today only` 27 · `limited stock` 6.
Chỉ **2 ca bắt nhầm** trong toàn bộ mẫu — `"ngayon lang"` (nghĩa "bây giờ mới") bị hiểu
thành khan hiếm.

⇒ **9,5% không phải dấu hiệu luật quá chặt.** Nó là ảnh chụp AI v1 đang làm sai bao nhiêu:
gửi tin rỗng và bịa khuyến mãi. Guard đang chặn đúng chỗ.

**Hai giới hạn của phép đo này, phải nói rõ:**
- Sổ AI chỉ lưu **80 ký tự đầu** — 83,4% bản ghi bị cắt đúng ở mốc đó. Luật soi phần đuôi
  (giá sai ở cuối, tin quá dài, trùng tin trước) bị đo THẤP. 9,5% là **cận dưới**.
- 709 tin của page chưa có bảng giá bị loại — luật giá không có gì để đối chiếu.

---

## B3 · M05 nhận nhầm người thật — **30,2%**  🔴 GẤP ĐÔI NGƯỠNG LÙI (>15%)

2.205 hội thoại thật · 665 bị khoá `HANDOFF` vì tưởng "sale đã tiếp quản".

Đọc mẫu thì thấy ngay: phần lớn KHÔNG phải người gõ, mà là **template Botcake/RTO chưa
được học**. Bằng chứng là cùng một câu lặp lại ở hàng chục hội thoại khác nhau:

```
56×  "do you wanna order 1 or 2 sets dear?"
42×  "will you choose the "buy 1 get 1 free" or the "buy 2 get 2 free" offer?"
27×  "which color would you like to choose? 😊"
25×  "what size do you usually wear so i can send it to you? ❤️"
24×  "narito ang ilan sa mga feedback ng aming mga customer."
17×  "hi dear , thanks for reaching to ggs customer service"
15×  "thank you for your interest in our products😍"
```

Người thật không gõ y hệt từng ký tự cho 56 khách khác nhau.

| loại "câu lặp ở ≥N hội thoại" là template | còn lại bị khoá |
|---|---|
| ≥2 hội thoại | **7,2%** |
| ≥3 hội thoại | **8,6%** |
| ≥5 hội thoại | 10,4% |
| ≥10 hội thoại | 13,2% |

`botcake-templates.json` **không tồn tại trên VPS** — sổ template rỗng, nên `isAutomationTemplate()`
gần như không chặn được gì. Phép đo này trung thực với production hiện tại.

Những ca khoá còn lại trông đúng là sale gõ tay: `"ok thak"`, `"yes sis"`, `"hi dear"`,
`"ah ok"`, `"Can you send full address please"`, `"I am in Qatar"`.

### Việc phải làm trước khi bật M05

Một trong hai, chọn trước khi deploy:

- **Cách rẻ, làm ngay:** cho `bot-registry` tự học template bằng LẶP LẠI — chuỗi giống hệt
  xuất hiện ở ≥3 hội thoại khác nhau thì là máy, không phải người. Đo trên chính dữ liệu
  này: 30,2% → **8,6%**, dưới ngưỡng an toàn.
- **Cách an toàn tức thì:** deploy với `HUMAN_TAKEOVER=0` (công tắc đã có sẵn trong
  `conv-owner.js`), tắt riêng phần nhận diện người thật, giữ nguyên mọi thứ còn lại của
  vòng 1. Bật lại sau khi sổ template có dữ liệu.

**Không nên deploy M05 nguyên trạng.** 30,2% đo được TRƯỚC khi deploy, còn ngưỡng lùi của
chính luồng này là >15% — tức nó sẽ bị lùi ngay trong lần báo cáo 6h đầu tiên.

---

## Tổng kết

| Phép đo | Yêu cầu mẫu | Đạt | Kết quả | Đánh giá |
|---|---|---|---|---|
| B1 Fast Lane | ≥5.000 tin khách | 7.886 | 33,7% | ✅ trong dải an toàn |
| B2 Guard | ≥4.000 tin AI + KB thật | 8.327 | 5,6% block · 4,0% rewrite | ✅ bắt đúng |
| B3 M05 | ≥60 hội thoại | 2.205 | 30,2% | 🔴 phải xử lý trước khi deploy |

Hai chặn cứng ngoài code vẫn nguyên: **nạp tiền Kimi** và **chủ dự án duyệt deploy**.
