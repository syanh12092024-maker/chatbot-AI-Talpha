# HỒ SƠ QUYẾT ĐỊNH

> Mọi thứ đã chốt trong quá trình thiết kế v3, kèm **lý do**. Ghi cả những việc đã cân nhắc rồi
> quyết định **không làm** — để sau này không ai đào lại.
>
> Chốt ngày 22/08/2026, dựa trên 62 câu hỏi nghiệp vụ đã trả lời và số đo thật trên máy chủ.

---

## Số đo nền — mọi tính toán dựa trên đây

Đo trên máy chủ production ngày 22/08/2026, lấy từ Sổ AI:

| Chỉ số | Giá trị |
|---|---|
| Tin AI đã trả khách | 13.010 |
| Đơn hàng ra được | 247 |
| **Đơn giá một tin AI** | **127 đ** |
| Số tin để ra một đơn | 52,7 |
| **Chi phí AI cho một đơn** | **6.696 đ** |
| Tổng tiền AI từ trước tới nay | 1.028.361 đ |
| Chi phí AI trên doanh thu một đơn | 0,97% |
| Hồ sơ token mỗi lượt | vào 3.053 · đọc cache 8.390 · ra 167 |
| Tỉ lệ trúng cache | 73,3% |

Page đang bật AI: **51** trên 315 page có trong dữ liệu.

---

## 1 · Hai luồng đơn — tách hẳn nhau

Đây là quyết định quan trọng nhất về nghiệp vụ, và cũng là chỗ dễ hiểu sai nhất.

| | Luồng trang bán hàng | Luồng Messenger |
|---|---|---|
| Khách đến từ | Quảng cáo → form LadiPage | Quảng cáo → nhắn inbox |
| Đơn vào POS lúc nào | **Ngay khi khách bấm BUY NOW** | Chỉ khi sale duyệt |
| Trạng thái ban đầu | Chờ xác nhận | — |
| Ai xác nhận | **Bot nhắn WhatsApp** | Khách đã xác nhận trong chat |
| Cần WhatsApp không | **Có, bắt buộc** | **Không** |
| Kết thúc | Đổi sang Chờ in → đóng gói | Sale duyệt → tạo đơn ở Chờ in |

**Vì sao trang bán hàng phải xác nhận:** khách điền form xong là đơn đã nằm trong POS, nhưng chưa ai nói chuyện với họ. Đóng gói gửi đi mà không hỏi là ôm rủi ro bom hàng.

**Vì sao Messenger không cần:** khách đã chat với bot, đã đưa đủ tên, số, địa chỉ và nói đồng ý trả tiền khi nhận. Nhắn WhatsApp hỏi lại là làm phiền và làm chậm.

**Hệ quả cho code:** máy trạng thái đơn phải **phân nhánh theo nguồn ngay từ đầu**, và bảng `don_hang` phải có cột nguồn. Lọc trùng phải **kiểm chéo cả hai luồng** — cùng một khách vào được bằng hai đường.

**Số liệu:** 37,4% khách bấm BUY NOW rồi **không** bấm gửi WhatsApp. Đây là lỗ lớn nhất bot sinh ra để bịt.

---

## 2 · Botcake — thay thế, không điều phối

**Đã thử và không làm được.** Ghi trong `src/botcake.js` dòng 4–12, thử thật trên page nháp ngày 10–11/08/2026:

```
GET   /pages/{id}/keywords   → 200   đọc được
GET   /pages/{id}/flows      → 200   đọc được
POST/PUT/PATCH/DELETE        → 404   toàn bộ, kể cả bản v2
POST  /flows/send_flow       → 400   chỉ kích hoạt flow có sẵn
```

API Botcake **không cho ghi**, và **không trả về nội dung câu trả lời** của flow nào — chỉ lấy được từ khoá, bóc từ tên flow.

**Quyết định:** thay Botcake AI bằng bot AI của hệ thống, tắt dần theo đợt 3 page.

**Đã đối chiếu bộ từ khoá trên 10 page thật ngày 22/08:**

| Luật Botcake | Lớp 0 đồng phủ | Kết luận |
|---|---:|---|
| Hỏi giá | 10/10 | Trùng — tắt không mất gì |
| Hỏi số ngày giao | 10/10 | Trùng — tắt không mất gì |
| Hỏi free ship | 10/10 | Trùng — tắt không mất gì |
| Nhận diện thật/giả | 0/10 | **Phải nhập trước khi tắt** |
| Hỏi size | 0/10 | **Phải nhập trước khi tắt** |
| Chưa có tiền | 0/10 | Để AI xử — đây là phản đối cần thương lượng |

**Rủi ro chưa đo:** Botcake đang nhắn riêng cho người bình luận dưới bài quảng cáo (Private Replies). Tắt mà chưa thay là mất nguồn khách — phải đo trước khi tắt quá 3 page.

**Phát hiện kèm theo:** hai lớp trả lời 0 đồng đang bị **TẮT** trên máy chủ, ghi rõ lý do trong `.env`: *"trùng từ khoá Botcake"* và *"Botcake đã lo tin chào hàng đầu"*. Nghĩa là Botcake và lớp 0 đồng là **hai mặt của cùng một công tắc** — tắt Botcake không phải mất lớp miễn phí, mà là bật lại lớp miễn phí đang nằm im.

---

## 3 · Độ trễ — dưới 10 giây, và nó phụ thuộc việc tắt Botcake

Ngân sách thời gian hiện tại, đo từ cấu hình thật trên máy chủ:

| Chặng | Thời gian |
|---|---|
| Vòng hỏi tin mới | 0–6 s |
| Đợi khách gõ xong | 5 s |
| **Nhường Botcake** | **6 s** |
| **Chờ riêng của AI** | **20–28 s** |
| Gọi model | 3–5 s |
| **Tổng** | **34–50 s** |

**26–34 giây tồn tại chỉ vì Botcake dùng chung page.** Tắt Botcake và đổi vòng hỏi sang nhận đẩy thì còn **6–10 giây**.

---

## 4 · WhatsApp — đi qua Pancake

Pancake có sẵn bốn cách kết nối WhatsApp, trong đó có **Cloud API chính thức** của Meta: rủi ro khoá số rất thấp, nhắn khách trước được, cần mẫu tin duyệt trước.

**Quyết định:** dùng đường Pancake, **bỏ phương án tự dựng cổng WhatsApp**.

**Đã cân nhắc rồi loại:** Evolution API và Baileys tự dựng. Lý do loại: công cụ chạy trên giao thức WhatsApp Web thường trụ 2–8 tuần trước khi bị phát hiện; 68% doanh nghiệp dùng công cụ không chính thức bị khoá ít nhất một lần trong 12 tháng. Mô hình dùng của dự án — nhắn hàng loạt số lạ — đúng loại bị gắn cờ nặng nhất.

**Còn phải kiểm:** Pancake cho gửi WhatsApp qua giao diện thì chắc chắn; **gửi bằng API** thì cần thử một lần thật. Đây là điểm kiểm chặn số 1.

---

## 5 · Nhắn tin ngoài 24 giờ

Luật Meta đổi trong năm 2026:

| Mốc | Chuyện gì |
|---|---|
| 10/02/2026 | Recurring Notifications kết thúc, thay bằng **Marketing Messages** trên Messenger |
| 27/04/2026 | Ba nhãn tin cũ chết hẳn — gọi vào trả mã lỗi 100 |
| Còn lại | Chỉ nhãn cho người thật trả lời trong 7 ngày |

**Messenger nay gửi được ngoài 24 giờ** bằng Marketing Message — cần khách đồng ý nhận tin trước và Meta duyệt nội dung. Trần: **1 tin / 48 giờ mỗi người**.

**Quyết định:** làm bốn đường gửi, và bảng phân đường nằm **ngay cạnh nút gửi** — con số thật ở đúng chỗ bấm nút, để không ai bấm gửi cho 2.847 người rồi tin rơi âm thầm.

**Còn phải kiểm:** Marketing Message **không bật ở mọi nước**. Chưa xác nhận được cho Trung Đông. Điểm kiểm chặn số 4.

**Đã cân nhắc rồi loại:** dùng nhãn tin để lách gửi khuyến mãi ngoài 24 giờ. Lý do loại: vi phạm chính sách, và cái giá là mất page cùng toàn bộ traffic quảng cáo đang chạy.

---

## 6 · Prompt có bốn khối, không phải một

| Khối | Token | Ai sửa | Nhịp đổi |
|---|---:|---|---|
| Bộ luật chung | 2.256 | Quản trị · dùng chung 51 page | Hiếm |
| Kỹ năng | ~180/kỹ năng | Marketer · bật theo sản phẩm | Thỉnh thoảng |
| Kịch bản page | ~1.400 | Marketer phụ trách | Thường xuyên |
| Dữ liệu sản phẩm | ~1.500 | Đồng bộ từ POS | Tự động |

**Trước khi thiết kế lại, bộ luật chung chỉ lập trình viên sửa được** — nằm trong `src/prompts.js`, muốn đổi phải sửa mã nguồn rồi deploy. Marketer không nhìn thấy. Mà đó mới là khối quyết định bot tư vấn giỏi hay dở.

**Tầng kỹ năng là mới hoàn toàn** — khối tư vấn dùng lại được, bật cho đúng sản phẩm cần. Nó lộ ra ngay một chuyện: hai sản phẩm có size đang hoàn **26,8%** và **19,2%**, trong khi sản phẩm không size hoàn 9,3% — và cả hai đều chưa bật kỹ năng hỏi size.

**Hệ quả cho code:** tách bốn khối ngay từ giai đoạn 1, kể cả khi chưa làm giao diện.

---

## 7 · Model AI — mỗi team chọn riêng

Bốn nhà: Claude · OpenAI · DeepSeek · Kimi. Mỗi team nhập khoá riêng và chọn model riêng.

Quy giá công bố ra tiền thật theo hồ sơ token đo được:

| Model | đ/tin | đ/đơn | So hiện tại |
|---|---:|---:|---:|
| DeepSeek V4-Flash (ngoài cao điểm) | 21,9 | 1.152 | 0,17× |
| GPT-5.6 Luna | 25,4 | 1.341 | 0,20× |
| Kimi K2.5 | 65,4 | 3.448 | 0,51× |
| Claude Haiku 4.5 | 122,9 | 6.477 | 0,96× |
| **Kimi K2.6** ← đang chạy | **127,7** | **6.729** | 1,00× |
| Claude Sonnet 5 | 368,7 | 19.431 | 2,89× |
| Claude Opus 5 | 614,5 | 32.385 | 4,81× |

**Chênh 28 lần** giữa rẻ nhất và đắt nhất.

**Quyết định quan trọng:** đo bằng **tiền mỗi đơn**, không phải tiền mỗi tin. Model thông minh hơn chốt bằng ít tin hơn, nên có thể đắt mỗi tin mà rẻ mỗi đơn. Vì vậy phải A/B, không chọn theo bảng giá.

**Bắt buộc có model dự phòng.** Ngày 06/08/2026 tài khoản nhà chính hết tiền, bot đứng im ba tiếng mà không ai biết.

---

## 8 · Ba team

**Tiểu Alpha · Auus · Pialpha EU.** Mỗi team có bộ sản phẩm, thị trường, sale, marketer riêng, và **kết nối POS riêng**.

Sản phẩm và thị trường do team tự thêm qua giao diện, hoặc đồng bộ từ POS của team đó.

**Luật cứng:** điều kiện team nằm ở **tầng truy vấn**, tự chèn theo người đang đăng nhập — không phải bộ lọc trên màn hình. Quên một chỗ là team này nhìn thấy khách của team kia.

---

## 9 · Vai và quyền

Năm vai: **Quản trị · Marketer · Sale · Quản lý · Người duyệt kịch bản**.

- Marketer **chỉ thấy sản phẩm mình phụ trách**
- Kịch bản do người viết thì **áp dụng thẳng, không cần duyệt**
- Nhưng **đề xuất của AI thì phải có người duyệt** mới áp
- Nhật ký ghi đầy đủ, **không sửa không xoá**, ghi cả việc máy làm

**Vấn đề đang có:** 314 trên 315 page **chưa gán marketer**. Báo cáo cắt theo marketer sẽ trống cho tới khi gán xong.

---

## 10 · Màn hình sale — chỉ là bảng điều phối

Sale **không làm việc trên hệ thống này**. Màn hình chỉ có hai danh sách — hội thoại cần xử và đơn cần xử — mỗi dòng ghi **lý do bot đẩy sang** và đồng hồ đếm ngược 10 phút. Bấm là nhảy thẳng sang Pancake hoặc POS.

Thao tác duy nhất làm trên hệ thống: **đánh dấu đã xử và chọn kết quả**.

**Lý do:** sale đã quen Pancake. Bắt họ học một nơi làm việc mới thì thường không ai dùng.

---

## 11 · Những việc đã cân nhắc rồi quyết định KHÔNG làm

| Việc | Vì sao không |
|---|---|
| Điều khiển Botcake qua API | API không cho ghi, đã thử và ghi lại kết quả |
| Tự dựng cổng WhatsApp (Evolution/Baileys) | Rủi ro khoá số quá cao với mô hình nhắn hàng loạt |
| Dùng nhãn tin để gửi khuyến mãi ngoài 24h | Vi phạm chính sách, giá phải trả là mất page |
| Kênh Meta trực tiếp | App đang ở Standard Access, `/conversations` bị từ chối trên mọi page. Code đã viết xong nằm ở nhánh `meta-channel`, chưa từng deploy được |
| Chatwoot cho màn hình sale | Tốt nhưng là cả một cuộc di dời; sale đã quen Pancake |
| Langfuse quản lý prompt | Mạnh nhưng thừa cho quy mô này, và thêm một hệ thống nữa phải nuôi |
| Chặn cứng khách hoàn cao ở một ngưỡng | Đề xuất chia bốn tầng thay vì một ngưỡng — 144 khách hoàn 30–65% đang bị gộp nhầm vào nhóm bình thường. **Chờ chốt** |
| Kho ưu đãi và Hậu bán mua lại | Đã thiết kế xong, **để lại giai đoạn sau** theo yêu cầu |

---

## 12 · Những chỗ còn hở, biết rồi nhưng chưa xử

| Chỗ hở | Ảnh hưởng |
|---|---|
| **Độ ngẫu nhiên chưa đặt** | Bot chạy mặc định nhà cung cấp — mỗi lượt trả lời một kiểu, khó bám kịch bản và khó A/B cho chuẩn. Sửa nửa ngày, nằm trong L1 |
| **Sản phẩm mới chưa có đơn thì không tạo được đơn** | Hàm lấy thông tin sản phẩm suy ngược từ 25 đơn gần nhất. Hiện chưa lộ vì tính năng tạo đơn tự động đang tắt. L1 sửa bằng cách đọc thẳng danh mục từ POS |
| **`paano mag order` không bắt được** | Lớp 0 đồng bắt `how to order` nhưng không bắt cách viết tách chữ phổ biến của tiếng Philippines. Sửa vài phút, phải xong trước khi tắt Botcake |
| **314 page chưa gán marketer** | Báo cáo theo marketer trống |
| **Tên sản phẩm trống trong dữ liệu** | Chỉ có bảng giá và ảnh. Phải lấy tên và mã từ POS |
| **Chưa có phần trả lời bình luận** | Là điều kiện để tắt Botcake trên diện rộng |

---

## 13 · Bốn điểm kiểm chặn — chưa có câu trả lời

| # | Câu hỏi | Nếu sai thì sao |
|---|---|---|
| 1 | Gửi WhatsApp bằng API Pancake được không | Quay lại tự dựng cổng, thêm ~1 tuần vào L1 |
| 2 | Pancake có đẩy tin về không, hay phải hỏi vòng | Độ trễ thành 8–13 giây thay vì 6–10 |
| 3 | Botcake kéo về bao nhiêu khách từ bình luận | Phải làm phần bình luận trước khi tắt quá 3 page |
| 4 | Marketing Message có bật cho Trung Đông không | Nhánh nhắn hàng loạt Messenger phải đổi sang quảng cáo trả tiền |

Cả bốn làm trong tuần đầu, mỗi cái một ngày.
