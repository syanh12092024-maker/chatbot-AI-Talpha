# TRỤC B — Luồng chat (runtime)

> Nguyên tắc xuyên suốt: **rẻ trước, đắt sau**. Mỗi tầng phải chứng minh được là
> tầng dưới không xử lý nổi thì mới được leo lên tầng đắt hơn.

---

# M04 · Ingest — nhận tin

## Mục đích
Đưa tin khách vào hệ thống nhanh nhất có thể. Hiện tại khách chờ 26–40 giây; mục tiêu ≤10 giây.

## Hai đường vào

### Đường chính — Webhook Pancake
```
Pancake ──POST──▶ /webhook/pancake  (sự kiện: tin nhắn mới)
                     │ xác thực chữ ký / secret
                     ▼
                  hàng đợi theo convId
```
⚠️ **Phải thử nghiệm trước khi tin.** Quy trình bật:
1. Đăng ký webhook cho **1 page** duy nhất, ghi log payload thô ra file 24h
2. Đối chiếu: webhook có bắt đủ mọi tin mà poll bắt được không?
3. Đủ → mở rộng dần. Thiếu → giữ poll, coi webhook là lớp tăng tốc.

### Đường dự phòng — Poll (giữ nguyên v1)
Luôn chạy song song ở nhịp chậm hơn (30s thay vì 6s) để bắt tin webhook làm rơi.
Trùng lặp được khử bằng `last_customer_interactive_at` như v1.

## Debounce thích ứng
Thay `REPLY_DEBOUNCE_MS` cố định 20s:

| Tín hiệu ở tin cuối | Chờ |
|---|---|
| Kết thúc bằng `?` | **5s** — khách hỏi xong rồi |
| Chứa số điện thoại / địa chỉ dài | **5s** — đang cho thông tin đơn |
| Chứa "order/bili/kunin/أطلب" | **5s** |
| Tin cụt (<3 từ), không dấu câu | **20s** — khách còn gõ |
| Mặc định | **12s** |

## Gộp cụm
Giữ nguyên v1: lấy **mọi tin khách liên tiếp** ở cuối hội thoại, trả lời **1 lần**.

## Cấu hình
| Biến | Mặc định |
|---|---|
| `INGEST_MODE` | `poll` → `hybrid` → `webhook` |
| `PANCAKE_POLL_MS` | 6000 (hybrid: 30000) |
| `DEBOUNCE_FAST_MS` | 5000 |
| `DEBOUNCE_SLOW_MS` | 20000 |
| `DEBOUNCE_DEFAULT_MS` | 12000 |

## Tiêu chí nghiệm thu
- [ ] Khách hỏi "how much?" → nhận trả lời trong ≤10s (đo p50 trên 100 ca)
- [ ] Khách nhắn 5 tin dồn trong 8s → nhận **đúng 1** tin trả lời
- [ ] Tắt webhook giữa chừng → poll bắt bù, **không mất tin nào**

## Phụ thuộc
M01

---

# M05 · Conversation Owner — điều phối bot

## Mục đích
Chấm dứt tình trạng **75% hội thoại có AI bị Botcake/bot khác đâm ngang**.
Đây là module quan trọng nhất của v2.

## Nguyên lý
Một hội thoại có **đúng một chủ** tại một thời điểm. Trạng thái + chủ lưu ở
`conv-state.json` **và** phản chiếu ra thẻ Pancake để bot ngoài (Botcake) đọc được.

## Bảng chuyển trạng thái

| Từ | Sự kiện | Sang | Ghi chú |
|---|---|---|---|
| — | tin đầu của khách | `GREET` | Botcake chào, AI im (giữ như v1) |
| `GREET` | khách nhắn tin thứ 2 | `QUALIFY` | **gắn thẻ `AI Chăm` → Botcake khoá** |
| `QUALIFY` | Fast Lane không xử lý nổi | `SELLING` | |
| `QUALIFY`/`SELLING` | đủ Tên+SĐT+Địa chỉ+COD | `CLOSING` | gắn `AI Chốt` |
| `SELLING` | khiếu nại thật / hết ngân sách / lỗi ≥3 | `HANDOFF` | gắn `AI back Sale` |
| bất kỳ | **sale (người) nhắn** | `HANDOFF` | AI im vĩnh viễn hội thoại này |
| bất kỳ | thẻ trạng thái đơn Pancake xuất hiện | `POST_SALE` | AI + Botcake đều khoá |
| bất kỳ | M13 nhận diện khách đã nhận hàng | `POST_SALE` | |
| `SELLING`/`QUALIFY` | khách im > 2h | `COLD` | M12 tiếp quản |
| `COLD` | khách trả lời | `SELLING` | ngân sách lượt **+2** |

## Nhận biết "sale người thật đã nhắn"
v1 có `RESPECT_ASSIGNEE` nhưng phải tắt vì Pancake tự gán. Thay bằng nhận diện theo **hành vi**:
```
Tin do page gửi được coi là NGƯỜI THẬT khi KHÔNG khớp:
  - nội dung AI vừa gửi (đối chiếu Sổ AI, so 90%)
  - danh sách template Botcake đã biết (M18 nạp)
  - tin rỗng / attachment
→ Có người thật nói → HANDOFF ngay.
```

## Chống đâm nhau với Botcake — HAI LỚP

### Lớp chính: AI CHỦ ĐỘNG NHƯỜNG *(không cần Botcake hợp tác)*

Chủ trương của chủ dự án (11/08/2026): **AI luôn đi sau Botcake. Chậm vài giây còn hơn
hai bot nói chồng lên nhau.** Ưu điểm lớn nhất là **không phụ thuộc vào việc Botcake có
đọc được thẻ Pancake hay không** — thứ chưa ai xác minh được.

| Cửa | Thời điểm | Cách làm | Mất gì |
|---|---|---|---|
| **①** | Sau debounce, **trước khi chiếm slot** | Chờ thêm `BOTCAKE_GRACE_MS` rồi mới đọc tin. Page đã nói → `decideConv` trả *"tin cuối là của page"* → AI im | Khách chờ thêm ~6s. **0 token** |
| **②** | Ngay trước khi gửi | Đọc lại tin, page vừa nói → **bỏ tin đã soạn** | Token đã tiêu, nhưng khách không nhận 2 câu chồng |

Cửa ② quan trọng hơn: AI soạn tin mất vài giây, Botcake hoàn toàn có thể trả lời trong
khoảng đó — cửa ① không bắt được ca này.

⚠️ **Hai cái bẫy đã vấp phải khi cài, đừng lặp lại:**
1. **`pkGetMessages` trả TỐI ĐA 25 tin.** Hội thoại ≥25 tin thì cửa sổ **trượt** — độ dài
   không đổi dù page vừa nói. So theo số lượng là hỏng đúng ở hội thoại bận rộn nhất.
   → Phải so theo **`id` của tin** (`pageSpokeSince` trong `pancake-poll.js`).
2. **Không được `sleep` bên trong semaphore.** Ngủ khi đang giữ 1 trong 4 slot thì giờ cao
   điểm nghẽn oan. Chờ **trước** `_acquire()`.

Núm chỉnh:
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `BOTCAKE_GRACE_MS` | `6000` | Chờ thêm bao lâu cho Botcake nói trước. `0` = tắt cửa ① |
| `BOTCAKE_YIELD_BEFORE_SEND` | bật | `0` = tắt cửa ② (không khuyến khích) |

Đếm số lần nhường: `botcakeYieldStats()` → M18 hiện thành cột "AI nhường 24h".
**Nhường >50% là dấu hiệu Botcake đang lấn hết phần AI** — lúc đó phải thu hẹp kịch bản Botcake.

### Lớp phụ *(tuỳ chọn — làm được thì tốt, không làm cũng chạy)*
Trong Botcake, thêm điều kiện vào kịch bản từ khoá:
> Không chạy nếu hội thoại có thẻ `AI Chăm`, `AI Chốt` hoặc `AI back Sale`.

Bot vẫn gắn 3 thẻ này nên lớp phụ dùng được ngay khi ai đó cấu hình. M18 có màn hình
hướng dẫn + đánh dấu page nào đã đặt điều kiện.

## Tiêu chí nghiệm thu
- [ ] Trong 100 hội thoại có AI, số hội thoại xuất hiện template Botcake = **0**
- [ ] Sale gõ tay 1 câu → tin tiếp theo AI **không** trả lời
- [ ] Khách đã có đơn (thẻ Pancake) → AI im, Botcake im, chỉ RTO bot nói
- [ ] `conv-state.json` khôi phục đúng sau restart

## Phụ thuộc
M01, M10 (thẻ), M18 (danh sách template Botcake)

---

# M06 · Fast Lane — trả lời 0 token

## Mục đích
Chặn **57,8% tin đang gọi LLM một cách vô ích**. Đây là tầng thay thế đúng vai trò
"bắt từ khoá" của Botcake ở luồng cũ, nhưng chạy trong hệ thống nên đọc được ngữ cảnh.

## Hai lớp

### Lớp 1 — Luật im lặng (đo được 33,8% tin)
| Mẫu | Số đo được | Xử lý |
|---|---|---|
| `<div></div>` / rỗng (sticker, ảnh) | 1.401 (12,9%) | **Im hẳn** |
| Nút `START` của Messenger | 1.023 (9,4%) | `greeting` + ảnh + giá từ kịch bản |
| `ok`/`yes`/`thanks`/`salamat`/`hm`/`👍` | 590 (5,4%) | Im, **hoặc** 1 câu chốt nếu đang `SELLING` |
| `hi`/`hello`/`kumusta`/`مرحبا` | 281 (2,6%) | `greeting` từ kịch bản |

### Lớp 2 — Kịch bản KB (đo được 7,8% tin)
| Ý định | Bắt bằng | Trả lời |
|---|---|---|
| Hỏi giá | `how much·magkano·price·presyo·كم السعر·بكم` | `fastLane.price` |
| Hỏi ship | `shipping·delivery·ilang araw·kailan·متى` | `fastLane.ship` |
| Hỏi cách đặt | `how to order·paano.*order·pa order·كيف أطلب` | `fastLane.howto` |

**Mọi câu Fast Lane đều phải kết bằng một bước tiến về phía đơn** (nguyên tắc 14) —
validator của M02 bắt buộc điều này.

## Luật leo tầng (khi nào phải gọi AI)
```
LEO LÊN AI nếu BẤT KỲ điều nào đúng:
  - không khớp mẫu nào ở trên
  - tin >12 từ
  - chứa số điện thoại / địa chỉ / tên
  - chứa từ phản đối (mahal, expensive, iisipin, peke, fake…)
  - khách đã hỏi cùng ý định 2 lần (template không thoả mãn được)
  - trạng thái = SELLING và tin không phải gật đầu thuần
```

## Chống lặp
Không gửi cùng một câu Fast Lane 2 lần liên tiếp cho một khách → leo lên AI.

## Tiêu chí nghiệm thu
- [ ] Tỷ lệ tin xử lý ở Fast Lane ≥ **35%** tổng tin vào
- [ ] Tỷ lệ chốt của nhóm đi qua Fast Lane **không thấp hơn** nhóm AI (A/B 2 tuần)
- [ ] Khách gửi sticker → **0 lần gọi LLM**
- [ ] Khách hỏi giá 2 lần → lần 2 leo lên AI

## Phụ thuộc
M02 (kịch bản), M05 (trạng thái)

---

# M07 · Context Builder — hồ sơ khách nén

## Mục đích
Cắt input từ ~2.900 token/lượt xuống ~1.200 mà **nhớ tốt hơn**.
v1 nạp 20 tin thô mỗi lượt → thông tin quan trọng nằm rải rác, model bỏ sót và hỏi lại.

## Đầu ra đưa vào LLM
```
[HỒ SƠ KHÁCH]                                        ~150 token
Tên: Amy · SĐT: đã có · Địa chỉ: Jeddah, District 1, House #118
Gói quan tâm: Buy 1 Get 1 — 109 SAR
Đã xem ảnh: sản phẩm, feedback
Phản đối đã nêu: giá (đã gỡ bằng COD)
Bước còn thiếu: xác nhận COD
Lượt đã dùng: 3/10 · Trạng thái: SELLING

[6 TIN GẦN NHẤT]                                   ~600 token
...nguyên văn, mỗi tin cắt 300 ký tự...
```

## Cách cập nhật hồ sơ
```
SAU mỗi lượt AI (không tốn thêm lần gọi LLM):
  - trích SĐT / địa chỉ / tên bằng REGEX từ tin khách
  - gói quan tâm: lấy từ tham số tool get_price / create_draft_order
  - ảnh đã gửi: lấy từ tool send_product_image
  - phản đối: khớp từ điển objections của page (M02)
  - bước còn thiếu: suy ra từ checklist đơn COD
```
Nếu regex không đủ (địa chỉ tiếng Ả Rập viết tự do) → mỗi **5 lượt** cho phép 1 lần gọi
model rẻ để cô đọng lịch sử thành hồ sơ. Ngân sách: tối đa 1 lần/hội thoại/ngày.

## Hydrate lần đầu
Khi hội thoại chưa có hồ sơ (server restart / khách quay lại): nạp 20 tin Pancake **một lần**,
sinh hồ sơ, lưu bền vào `conv-state.json`. Từ đó về sau **không nạp lại 20 tin nữa**.

## Dọn rác trước khi nạp
- Bỏ tin page rỗng (`<div></div>`, `...`) — đo được **13,7%** tin page là loại này
- Bỏ template Botcake đã biết (M18) — chúng chỉ làm nhiễu, không mang thông tin
- Giữ nguyên tin khách

## Tiêu chí nghiệm thu
- [ ] input/lượt ≤ 1.400 token (đo trên 200 lượt thật)
- [ ] Số lần AI hỏi lại thông tin khách đã cho giảm ≥70% (đếm tay 50 hội thoại trước/sau)
- [ ] Restart server giữa hội thoại → AI **không** chào lại từ đầu

## Phụ thuộc
M05, M18

---

# M08 · AI Closer

## Mục đích
Vòng gọi LLM + tool. Giữ nguyên tinh thần v1 nhưng bỏ classifier và gọn prompt.

## Thay đổi so với v1

### 1. Bỏ hẳn `classifier.js`
| v1 | v2 |
|---|---|
| Mọi tin: 1 call classifier + 1 call closer | Chỉ 1 call closer |
| `intent=complaint` → chặn trước LLM | Closer tự gọi `handoff_human` |
| `intent=spam` → im | Luật regex ở M06 |
| Fallback lỗi → phân loại sai hàng loạt | Không còn điểm gãy này |

Spam thô (chửi bới, tố lừa đảo: `scam·peke·manloloko·حرامي`) bắt bằng regex ở M06 — rẻ, không gãy khi API lỗi.

### 2. Gộp prompt, cắt trùng
Đo thật 11/08/2026, system prompt trung bình mỗi lần gọi:

| Khối | Token | Ghi chú |
|---|---|---|
| `BASE_SYSTEM` | 1.804 | tĩnh, chung mọi page |
| **Kịch bản riêng của page** | **1.391** | dao động 890–1.908; 37/38 page có |
| `HARD_RULES` | 1.486 | tĩnh, chung mọi page |
| **Cộng (chưa tính KB)** | **~4.686** | |

Trong 3.290 token tĩnh (`BASE` + `HARD_RULES`), ~1.400 là **lặp lại chính nó** — ngôn ngữ,
ảnh, còn hàng, chống spam địa chỉ, tổng tiền đều viết 2 lần ở cả hai khối.

Cấu trúc system prompt v2:
```
[1] CORE       ~1.800 tok  vai trò + mọi quy tắc cứng, viết MỘT lần (gộp BASE+HARD_RULES)
[2] KỊCH BẢN   ~1.400 tok  tone + greeting + salesPrompt của page (M02) — GIỮ NGUYÊN
[3] KB         ~1.500 tok  sản phẩm + giá + chính sách
                           ← cache_control ở khối CUỐI
```

⚠️ **KHÔNG tự ý cắt ngắn khối [2].** Đó là kịch bản marketer viết, không phải chỗ tiết
kiệm token — và số liệu chưa chứng minh được kịch bản dài hay ngắn tốt hơn (hai page
cùng ngành, kịch bản 830 vs 829 token, chênh nhau **12,7 lần** về lượt/đơn). Muốn động
vào khối này thì phải đo trước (M20) rồi A/B (M17).
> Lưu ý: Kimi cache tự động theo prefix, `cache_control` gần như vô nghĩa trên Kimi.
> Giữ lại để còn đường quay về Anthropic. Đừng tốn công tinh chỉnh nó.

### 3. Bỏ tool không dùng
`score_lead` — thay bằng M11 (tính bằng luật, không tốn token). Rà lại toàn bộ định nghĩa
tool, mỗi tool bỏ đi tiết kiệm ~150 token/call.

### 4. `max_tokens` 1024 → 400
Tin trung bình 182 token, 6,3% vượt 300. Hạ trần buộc model viết ngắn — đúng quy tắc
"1–3 câu" và hợp Messenger mobile hơn.

## Giữ nguyên từ v1
- Manual tool-use loop, `maxToolIterations = 5`
- Không bao giờ trả `'...'` — xin viết lại, cùng lắm thì im
- `sanitizeMessages` / `sanitizeSystem` (lớp chặn nửa emoji)
- Đo token thật vào `state.lastUsage`

## Tiêu chí nghiệm thu
- [ ] calls/lượt ≤ 1,2 (v1: 2,28)
- [ ] Token system ≤ 4.000 kể cả KB (v1: ~7.800)
- [ ] Chạy lại 30 hội thoại thật đã lưu, chất lượng **không kém** bản v1 (chấm tay)
- [ ] Khách khiếu nại thật → vẫn `handoff_human` đúng (10/10 ca test)

## Phụ thuộc
M02, M07, M11

---

# M09 · Outbound Guard — kiểm duyệt tin ra

## Mục đích
Một cửa duy nhất mọi tin phải qua trước khi tới khách. Chặn được 4 trong 8 lỗi đo được.
**Không dùng LLM** — thuần luật, chạy dưới 1ms.

## Bảng luật
| # | Luật | Xử lý | Xuất xứ |
|---|---|---|---|
| 1 | Tin rỗng / chỉ `...` / chỉ `<div></div>` | **Chặn** | 13,7% tin page là loại này |
| 2 | Lọt tiếng Việt (dấu tiếng Việt hoặc từ khoá) | **Chặn** + báo đỏ | Nguyên tắc #1 |
| 3 | Chứa "Order ID"/"Mã đơn"/"order number" mà lượt này chưa gọi `create_draft_order` thành công | **Chặn** | Nguyên tắc #3 |
| 4 | Chứa số tiền không khớp **đúng một** gói trong bảng giá | **Chặn** + bắt gọi `get_price` | Vụ Priscela Amon |
| 5 | >400 token hoặc >6 dòng | **Cắt** + xin viết lại | 6,3% tin quá dài |
| 6 | Chứa checklist ≥3 gạch đầu dòng hỏi thông tin | **Chặn** + xin viết lại | Nguyên tắc #4 |
| 7 | Trùng ≥90% tin AI vừa gửi cho khách này | **Chặn** | Chống lặp |
| 8 | Chứa ký tự vô hình `U+E0000–U+E007F` | **Chặn** + báo đỏ | Né trùng lặp = rủi ro ban Meta |
| 9 | Chứa lời doạ (`social media`, `post in group`, `report you`, `kiện`) | **Chặn** + báo đỏ | Đang tồn tại ở luồng RTO |
| 10 | Hứa ngày/giờ giao cụ thể (`bukas`, `tomorrow`, `hôm nay`) | **Chặn** + xin viết lại | Nguyên tắc #11 |
| 11 | Đọc lại đầy đủ SĐT + địa chỉ mà không phải lượt tóm tắt đơn | **Chặn** | Nguyên tắc #12 |

## Xử lý khi bị chặn
```
Chặn lần 1 → gửi lại model kèm lý do, xin viết lại (tối đa 1 lần)
Chặn lần 2 → IM (không gửi gì) + ghi Sổ AI type='blocked' kèm luật vi phạm
Luật 2, 8, 9 → luôn báo đỏ dashboard ngay lập tức, không im lặng nuốt
```

## Phạm vi
M09 gác **mọi** tin ra: AI Closer, Fast Lane, Follow-up. Nếu về sau nối được bot RTO
vào hệ thống thì gác luôn cả nó — đó là nơi tin doạ khách đang phát sinh.

## Tiêu chí nghiệm thu
- [ ] 0 tin rỗng tới khách trong 7 ngày
- [ ] 0 tin lộ tiếng Việt
- [ ] Bơm 20 tin vi phạm mẫu → chặn đúng 20/20, không chặn nhầm tin hợp lệ (100 tin sạch)
- [ ] Dashboard có màn hình "Tin bị chặn" xem lại được

## Phụ thuộc
M02 (bảng giá để đối chiếu)

---

# M10 · Dispatcher — gửi & ghi vết

## Mục đích
Gửi tin qua Pancake và để lại **đủ vết** cho sale, cho thống kê, cho A/B.

## Việc phải làm sau mỗi tin gửi thành công
```
1. Gắn thẻ theo trạng thái   AI Chăm / AI Chốt / AI back Sale   (1 lần/hội thoại)
2. Mark unread                giữ hội thoại trong hàng chờ sale
3. Ghi Sổ AI                  + scriptVersion + lane + state    ← MỚI
4. Cập nhật conv-state        owner, budget.used, profile
5. Ghi chú Pancake            khi chuyển HANDOFF hoặc CLOSING
```

## Backoff (giữ nguyên v1, mở rộng)
- 2 lần gửi lỗi liên tiếp trên một page → ngừng page 30 phút + báo đỏ
- **Mở rộng:** lỗi 401/429 từ **nhà cung cấp LLM** → ngừng **toàn hệ thống** + báo động
  (v1 không có: hết credit Kimi làm bot chết 2 ngày mà dashboard vẫn xanh)

## Tiêu chí nghiệm thu
- [ ] Mọi bản ghi `reply` trong Sổ AI đều có `scriptVersion`, `lane`, `state`
- [ ] Mọi lần chuyển HANDOFF đều có đủ 3 vết: Sổ AI + thẻ + ghi chú
- [ ] Gắn thẻ hụt → **có log cảnh báo**, không nuốt im

## Phụ thuộc
M01, M05, M17
