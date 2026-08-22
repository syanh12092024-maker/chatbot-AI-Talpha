# BỐN ĐIỂM KIỂM CHẶN — KẾT QUẢ

> Người B đo, 22/08/2026. Đo trên **máy chủ 169.58.33.8**, không đo ở máy cá nhân —
> token Pancake chạy từ IP máy cá nhân bị chặn (lỗi 121 trên mọi page).
> Mọi lời gọi đều **chỉ đọc**. Không gửi một tin nào cho khách.
> Bộ dò để chạy lại nằm cùng thư mục này.

---

## Tóm tắt một bảng

| # | Câu hỏi | Trả lời | Ảnh hưởng |
|---|---|---|---|
| 1 | Gửi WhatsApp bằng API Pancake được không | **Chưa trả lời được — và lý do quan trọng hơn câu hỏi.** Tài khoản Pancake có **1.371 page, 100% `platform:"facebook"`**, **không có một kênh WhatsApp nào**. Không có gì để thử gửi. | Nút chặn không nằm ở API mà ở **thủ tục**: chưa nối số WhatsApp nào vào Pancake. Đây là việc dài nhất và nằm ngoài tầm kỹ thuật — phải bắt đầu ngay |
| 2 | Pancake có đẩy tin về không | **Không tìm thấy đường đăng ký webhook nào.** Sáu đường ứng viên đều trả `406 "Server internal error"`, trong khi `conversations` và `tags` cùng token trả `200` | **Giữ vòng hỏi.** Độ trễ 8–13 giây thay vì 6–10. Đo thật: một vòng hỏi mất **317–831 ms** |
| 3 | Botcake kéo về bao nhiêu khách từ bình luận | **Đáng kể: 11,3% luồng hội thoại.** 7 ngày qua trên 47 page: **199 hội thoại bình luận** (~28/ngày) trên tổng 1.768. **82,5%** hội thoại bình luận đã được nhắn riêng | **Phải làm phần trả lời bình luận trước khi tắt Botcake diện rộng.** Nhưng ở quy mô **3 page thử** thì mất ~1,5 hội thoại/ngày — chấp nhận được, cứ chạy thử |
| 4 | Marketing Message có bật cho Trung Đông không | **Không kiểm được, và vì một lý do nặng hơn: app Meta đang bị chặn API hoàn toàn.** `graph.facebook.com/me` trả `400 "API access blocked"` (code 200) | Nhánh nhắn hàng loạt Messenger của **giai đoạn 3** coi như đóng cho tới khi gỡ được app. Không ảnh hưởng giai đoạn 1 |

---

## 1 · Gửi WhatsApp bằng API Pancake

**Cách đo:** `GET /api/v1/pages` với cả 6 token trong kho, đếm page theo trường `platform`.

```
tổng page      1.371   (activated 314 · inactivated 99 trên token chính)
platform       facebook: 1.371 · không có giá trị nào khác
page có chữ "whatsapp" trong dữ liệu trả về:  0
```

Bản trả về của Pancake **có** trường `platform` cho mỗi page, nghĩa là Pancake có mô hình
nhiều nền tảng. Chỉ là **chưa có kênh nào ngoài Facebook được nối vào tài khoản này**.

**Kết luận:** câu hỏi "gửi bằng API được không" chưa trả lời được vì chưa có gì để gửi.
Nhưng phát hiện này **đổi thứ tự việc**: trước khi bàn API, phải xong

1. Có **WhatsApp Business Account** và số đã đăng ký vào WABA — bảng hỏi M2 ở
   `docs/v3/90-phu-luc-bang-hoi-ky-thuat.md` vẫn để trống
2. Nối số đó vào Pancake
3. Soạn **mẫu tin xác nhận đơn** gửi Meta duyệt — tin doanh nghiệp nhắn trước bắt buộc
   dùng mẫu đã duyệt, câu mở đầu **không phải** câu AI tự viết

Cả ba nằm trong "việc làm song song" của kế hoạch và **chưa việc nào bắt đầu**.

**Việc cho người A:** L1-M3 (cửa Pancake WhatsApp) **chưa mở được**. Không phải vì thiếu
tài liệu API mà vì thiếu kênh để thử. Đừng để module đó chặn L1 — làm L1-M1 và L1-M2 trước.

**Rủi ro nếu đi đường tắt:** thư viện `wa.js` hiện tại dùng Baileys (không chính thức, giả
lập WhatsApp Web). Nó sống được vì mỗi ngày chỉ gửi vài tin vào **một nhóm nội bộ**. Dùng
nó nhắn hàng trăm số lạ là gần như chắc chắn mất số — và mất số là mất luôn cả kênh xác
nhận đơn, giữa chừng, không báo trước. Quyết định ở `01-QUYET-DINH.md` mục 4 đã loại đường
này rồi; ghi lại đây để không ai đào lại lúc bí.

---

## 2 · Pancake có đẩy tin về không

**Cách đo:** dùng `page_access_token` **có sẵn** trong `pancake-page-tokens.json` (cố ý
không sinh token mới — sinh mới làm token cũ hết hiệu lực, mà bản đang chạy đang dùng
chúng), gọi `GET` lên sáu đường ứng viên.

| Đường | Kết quả |
|---|---|
| `public_api/v1/pages/{id}/conversations` | **200** ← token đúng, đường có thật |
| `public_api/v1/pages/{id}/tags` | **200** |
| `public_api/v1/pages/{id}/webhooks` | 406 `"Server internal error"` |
| `public_api/v1/pages/{id}/webhook` | 406 |
| `public_api/v1/pages/{id}/subscriptions` | 406 |
| `api/v1/pages/{id}/settings` | 406 |

Hai đường 200 chứng minh token và cách gọi đúng — nên 406 ở bốn đường kia là **đường không
tồn tại**, không phải lỗi xác thực.

**Một manh mối ngược chiều:** đối tượng page của Pancake **có** trường `need_fix_webhook`.
Nhưng đó là webhook **Pancake ↔ Facebook** (Pancake tự đăng ký nhận tin từ Meta), không
phải webhook Pancake đẩy về cho hệ thống của mình.

**Chưa làm được và cần làm:** đọc tài liệu chính thức ở `developer.pancake.biz`
(chú thích trong `src/pancake.js:106` có nhắc tới nó). Việc này cần mở web bằng tài khoản
có quyền — người B không tự làm để tránh đưa dữ liệu dự án ra ngoài. **Đề nghị chủ dự án
hỏi thẳng hỗ trợ Pancake một câu:** *"tài khoản của tôi có đăng ký được webhook nhận tin
mới không, hay phải hỏi vòng?"*

**Số đo để tính ngân sách thời gian:** một vòng hỏi mất **317 ms · 831 ms · 320 ms** (ba lần
liên tiếp). Vòng hỏi hiện tại chạy mỗi 0–6 giây, nên phần "chờ tới lượt hỏi" mới là phần
tốn, không phải phần gọi mạng.

---

## 3 · Botcake kéo về bao nhiêu khách từ bình luận

Đây là điểm kiểm có kết quả **rõ nhất và ảnh hưởng trực tiếp nhất**, vì nó gác cửa L2-M2
của người A (tắt Botcake).

### 3.1 · Khoá Botcake — chỉ có một

```
BOTCAKE_TOKENS  →  1 mục  →  page 1194048433791745 (page nháp)
```

Việc "lấy khoá Botcake của 10 page đang chạy thật" trong kế hoạch **chưa làm**. Nên không
đếm được trực tiếp bao nhiêu page bật Private Replies.

Page nháp đọc được đầy đủ: **13 flow còn sống, trong đó có `Private Replies #1`**. Bộ từ
khoá thấy được khớp đúng bảng ở `01-QUYET-DINH.md` mục 2:

```
"Có chứa how much, Magkano, Mgkanu, magkno, price"
"Có chứa Free delivery"
"Có chứa How many days, when deliver"
"Có chứa Size, inches, inchs, inch"
"Có chứa pawnable, real, original, legit, not faded, pure gold, saudi gold"
"Có chứa don't have any money yet"
```

Hai luật **lớp 0 đồng chưa phủ** — `Size` và nhận diện `real/legit/pawnable` — có mặt đúng
như tài liệu ghi. Phải nhập trước khi tắt.

### 3.2 · Đo gián tiếp bằng dữ liệu Pancake

Vì Botcake không có endpoint thống kê, đo từ chính Pancake. Ba trường có sẵn nói đúng điều
cần biết: hội thoại có `type` (`INBOX` | `COMMENT` | `RATING`), và tin nhắn có
`private_reply_conversation` — nối bình luận sang hội thoại nhắn riêng đẻ ra từ nó.

**Sản lượng, 7 ngày gần nhất, 47/51 page đang bật AI đọc được:**

| | Số |
|---|---:|
| Hội thoại **COMMENT** | **199** |
| Hội thoại khác (INBOX, RATING) | 1.569 |
| **Tỉ lệ bình luận trong luồng** | **11,3%** |
| Trung bình mỗi ngày | **28,4** hội thoại bình luận |

**Tỉ lệ được nhắn riêng — mẫu 40 hội thoại bình luận trên 10 page:**

| | Số |
|---|---:|
| Đã có nhắn riêng (`private_reply_conversation`) | **33** |
| Chưa có | 7 |
| **Tỉ lệ** | **82,5%** |

Nội dung nhắn riêng nhìn thấy đúng dạng Botcake:
*"I sent you a message. Please check your inbox. Thank you! 😊"*

**⇒ Ước lượng: ~23 hội thoại/ngày do trả lời bình luận đẻ ra, trên 47 page** (28,4 × 82,5%),
tức khoảng **0,5 hội thoại/page/ngày**.

### 3.3 · Kết luận và việc kèm theo

- **Con số đáng kể.** 11,3% luồng hội thoại đi qua cửa bình luận. Tắt Botcake diện rộng mà
  chưa có phần trả lời bình luận là **mất khoảng một phần chín nguồn khách**.
- **Nhưng không chặn bước thử.** Ở 3 page thử, mất ~1,5 hội thoại/ngày. Chạy thử được ngay,
  đúng như kế hoạch đã định.
- **Điều kiện để tắt quá 3 page:** phải có phần trả lời bình luận trước. Màn "Trả lời bình
  luận" ở `docs/v3/03-MAN-HINH.md` nhóm 2 đã vẽ, nhưng **không nằm trong giai đoạn 1**.
  Nếu muốn tắt Botcake rộng trong giai đoạn 1 thì phải kéo màn đó vào — đây là việc cần
  chủ dự án quyết.

### 3.4 · Giới hạn của phép đo — nói ra, không giấu

- Pancake trả về **60 hội thoại gần nhất** mỗi page. **2/47 page** chạm trần đó trong vòng
  7 ngày → con số 199 là **hụt nhẹ**, không phải thừa.
- Vì lý do đó, **đừng dùng con số 30 ngày** mà bộ dò cũng in ra (219): mẫu 60 không với tới
  30 ngày ở page đông khách, nên nó sai kiểu nguy hiểm — trông như bình luận giảm mạnh.
- `private_reply_conversation` cho biết bình luận **đã được nhắn riêng**, không cho biết
  **ai** nhắn — Botcake, sale, hay công cụ khác. Nên 82,5% là **trần trên** của phần Botcake.
- Cách đo chắc hơn: so cùng chỉ số này **trước và sau** khi tắt Botcake trên 3 page thử.
  Bộ dò đã sẵn sàng, chạy lại một lệnh.

**Lần đo đầu đã bỏ:** cách "ai nói tin đầu tiên" cho ra 72% nhưng lẫn ghi chú hệ thống của
Pancake (*"X đã trả lời một quảng cáo"*) và tin rỗng `<div></div>` — con số phồng, không
dùng được. Ghi lại để không ai đo lại theo cách đó.

---

## 4 · Marketing Message có bật cho Trung Đông không

**Không kiểm được, vì một lý do nặng hơn câu hỏi:**

```
GET graph.facebook.com/v21.0/me
→ 400  {"message":"API access blocked.","type":"OAuthException","code":200}

GET graph.facebook.com/v21.0/{business_id}/owned_pages
→ 400  "API access blocked."
```

App Meta của dự án **đang bị chặn truy cập API hoàn toàn**, không phải thiếu quyền, không
phải page chưa vào Business Manager. Token hệ thống có trong `.env` và một Business ID có
cấu hình, nhưng mọi lời gọi đều bị chặn ở cửa.

**Hệ quả:**
- Không tạo được chiến dịch thử 50 khách ở UAE để nộp duyệt → điểm kiểm 4 **treo**
- Nhánh **nhắn hàng loạt Messenger của giai đoạn 3** coi như đóng cho tới khi gỡ được app
- Khớp với quyết định đã có ở `01-QUYET-DINH.md` mục 11: kênh Meta trực tiếp đã bị loại,
  code nằm ở nhánh `meta-channel` chưa từng deploy được. Nay tình hình **xấu hơn** lúc đó:
  không còn là "Standard Access không đủ" mà là **bị chặn**.

**Không ảnh hưởng giai đoạn 1** — giai đoạn 1 đi qua Pancake, không gọi Graph API.

**Việc cần chủ dự án làm** (người B không tự làm được, phải đăng nhập tài khoản Meta):
1. Mở `developers.facebook.com` → App → xem mục cảnh báo, lý do bị chặn và cách kháng nghị
2. Nếu gỡ được thì mới quay lại điểm kiểm 4
3. Trong lúc chờ, coi như **Marketing Message không dùng được**, và tính ngân sách giai
   đoạn 3 theo hướng quảng cáo trả tiền

---

## Bộ dò — chạy lại thế nào

```bash
scp -i ~/.ssh/aicloser_deploy v3/docs/kiem-chan/*.mjs root@169.58.33.8:/tmp/
ssh -i ~/.ssh/aicloser_deploy root@169.58.33.8 'cd /opt/aicloser && node /tmp/do-pancake-2.mjs'
ssh -i ~/.ssh/aicloser_deploy root@169.58.33.8 'cd /opt/aicloser && node /tmp/do-botcake.mjs'
ssh -i ~/.ssh/aicloser_deploy root@169.58.33.8 'cd /opt/aicloser && node /tmp/do-nguon-hoi-thoai.mjs 10'
```

Cả ba **chỉ đọc**. Không gửi tin, không sửa gì, không sinh token mới.
