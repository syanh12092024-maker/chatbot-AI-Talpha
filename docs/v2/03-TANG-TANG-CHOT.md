# TRỤC C — Tăng tỷ lệ chốt

> Số liệu nền: 7.677 khách → **151 đơn (2,0%)**. Trong đó **52% khách được AI trả lời
> rồi im luôn** và **61% rơi ngay sau lượt AI đầu tiên**. Trục này nhắm vào chỗ đó.

---

# M11 · Lead Scoring & Turn Budget

## Mục đích
Chấm dứt trần lượt cào bằng. Số liệu cho thấy `MAX_AI_TURNS=4` đang **cắt đúng chỗ
tỷ lệ chốt bắt đầu nhân lên**:

| Lượt AI | Khách | Đơn | Tỷ lệ |
|---|---|---|---|
| 1 | 2.990 | 10 | 0,3% |
| 2 | 911 | 27 | 3,0% |
| 3 | 423 | 23 | 5,4% |
| **4** | 232 | 26 | **11,2%** ← trần hiện tại |
| 5 | 209 | 35 | **16,7%** |
| 6 | 148 | 28 | **18,9%** |

## Cách chấm điểm (thuần luật, 0 token)

| Tín hiệu | Điểm |
|---|---|
| Cho số điện thoại | **+4** |
| Cho địa chỉ (khu vực + ≥1 chi tiết) | **+3** |
| Cho tên | +2 |
| Nói muốn mua (`order·bili·kunin·أطلب·I'll take`) | +3 |
| Hỏi giá | +1 |
| Hỏi ship / bảo hành / cách dùng | +1 mỗi loại |
| Phản đối giá (`mahal·expensive`) | **+2** ← quan tâm mới mặc cả |
| Xin ảnh / hỏi mẫu | +1 |
| Đã quay lại sau khi `COLD` | +2 |
| Chỉ gật đầu / sticker / chào | 0 |
| Tin ≤2 từ, không tín hiệu, ≥2 lượt liên tiếp | **−1** |

## Bảng ngân sách lượt

| Điểm | Nhóm | Trần lượt AI/24h |
|---|---|---|
| ≤ 0 | Lạnh | **1** (Fast Lane lo phần lớn) |
| 1–2 | Ấm | **3** |
| 3–5 | Nóng | **6** |
| ≥ 6 | **Đang chốt** | **10** |
| Có SĐT **và** địa chỉ | Sát đơn | **12** + ưu tiên hàng chờ sale |

**Bù thêm:** khách nêu phản đối → **+3 lượt** để chạy trọn ladder 3 bước của nguyên tắc 14
(hiện ladder này chưa bao giờ chạy hết vì hết lượt).

## Vì sao tổng token vẫn giảm
Nhóm lạnh (chiếm ~60% khách) tụt từ 4 lượt xuống 1 → tiết kiệm nhiều hơn phần bù cho
nhóm nóng (~10% khách). Ước tính: **−35% tổng lượt AI, +180% lượt cho nhóm sát đơn.**

## Tiêu chí nghiệm thu
- [ ] Tổng lượt AI/ngày giảm ≥30%
- [ ] Số khách đạt ≥6 lượt tăng ≥3 lần
- [ ] Tỷ lệ chốt tổng thể **tăng**, không giảm (A/B 2 tuần, 50/50)
- [ ] Không khách nào >12 lượt/24h (chống lỗi vòng lặp)

## Phụ thuộc
M05, M07

---

# M12 · Follow-up Engine

## Mục đích
Chạm vào **3.991 khách (52%)** đang bị bỏ rơi sau khi AI trả lời.
Nghiên cứu ngành: theo sát trong 1 giờ → khả năng qualify cao gấp **7 lần**.

## Điều kiện chọn khách
```
TẤT CẢ phải đúng:
  - trạng thái = COLD
  - đã có ≥1 lượt AI
  - chưa có đơn (Sổ AI + thẻ Pancake)
  - khách im 2–24 giờ
  - chưa từng được đuổi theo trong hội thoại này
  - page đang bật AI và readiness = READY
  - còn trong cửa sổ nhắn tin của kênh
```

## Chọn góc đuổi theo
| Khách dừng ở | Góc | Kèm |
|---|---|---|
| Sau báo giá, im | Chốt bằng **lựa chọn**: *"SET 1 or SET 2 po?"* | — |
| Chê đắt | Bẻ nhỏ giá trị + COD không trả trước đồng nào | ảnh feedback |
| Nghi chất lượng | Bằng chứng | ảnh chứng nhận |
| Hỏi ship rồi im | Nhấn free delivery + 2–5 ngày | — |
| **Đã cho SĐT/tên mà chưa chốt** | **Không nhắn — đẩy thẳng sale gọi** | 🔴 ưu tiên cao nhất |

Ca thật minh hoạ nhóm cuối: khách *SilentBoo* đã đưa tên **Celieta Boca** + số **71566943**,
tự nói *"3 ngày rồi tôi thương lượng mà các anh không thèm bán"* — AI đáp "thanks madam" rồi mất.

## Ràng buộc cứng
- **Tối đa 1 tin đuổi theo / khách / hội thoại.** Không có lần 2.
- Không đuổi theo trong khung 22:00–08:00 giờ địa phương của thị trường page
- Qua M09 (Outbound Guard) như mọi tin khác
- Có công tắc tắt toàn cục + tắt theo page (sale ngập là tắt ngay)
- Ghi Sổ AI với `lane: "FOLLOWUP"` để đo riêng

## Đo hiệu quả
Bắt buộc A/B: 50% khách đủ điều kiện được đuổi theo, 50% không. So tỷ lệ chốt sau 7 ngày.
**Không đạt +1 điểm phần trăm tuyệt đối thì tắt.**

## Tiêu chí nghiệm thu
- [ ] Không khách nào nhận >1 tin đuổi theo
- [ ] Nhóm "có SĐT chưa chốt" xuất hiện đầu hàng chờ sale, có nút gọi
- [ ] A/B cho kết quả có ý nghĩa sau 7 ngày (≥500 khách mỗi nhánh)
- [ ] Tỷ lệ khách block page **không tăng**

## Phụ thuộc
M05, M07, M09, M17

---

# M13 · Post-Sale Router

## Mục đích
Ngăn AI đốt ngân sách bán vào khách **đã nhận hàng**. Đo được 7% hội thoại có AI rơi vào cảnh này.

Ca thật: khách *Matess Valdez* — **13 lượt AI, 0 đơn**. Khách đã nhận hàng, báo *"Kuya damage
po yong Isa"* (hàng vỡ), AI đáp *"thank you so much"* rồi **dội nguyên bài quảng cáo sản phẩm
khách vừa mua**.

## Nhận diện (không chỉ dựa vào thẻ Pancake)
Thẻ đơn không phủ hết — nhiều đơn không đi qua Pancake POS. Bổ sung nhận diện theo **nội dung**:

| Nhóm | Mẫu |
|---|---|
| Đã nhận hàng | `na received·nakuha ko·received·وصل·delivered·dumating na` |
| Có vấn đề | `damage·sira·broken·basag·defective·مكسور·wrong item` |
| Chưa nhận | `hindi pa dumating·still not deliver·لم يصل·where is my order` |
| Hỏi tình trạng | `tracking·saan na·status ng order` |

## Ba nhánh xử lý
```
① CÓ VẤN ĐỀ  → HANDOFF ngay, thẻ 'AI back Sale', ghi chú rõ
                KHÔNG tính vào ngân sách bán. Ưu tiên cao trong hàng chờ.
② CHƯA NHẬN  → HANDOFF sang luồng RTO/vận chuyển (không phải sale bán)
③ HÀI LÒNG   → nhánh CƠ HỘI: mời mua lại / giới thiệu bạn bè
                (ca Ashlyn Velasco nói muốn giới thiệu bạn — đơn miễn phí bị bỏ)
```

Nhánh ③ dùng **ngân sách riêng**, tối đa 2 lượt, tách khỏi ngân sách bán mới.

## Tiêu chí nghiệm thu
- [ ] Khách báo hàng lỗi → AI **không** gửi quảng cáo, chuyển sale trong 1 lượt
- [ ] Lượt AI tiêu cho hội thoại hậu bán giảm ≥80%
- [ ] Nhánh ③ đo riêng được số đơn mua lại

## Phụ thuộc
M05, M09

---

# M14 · Order Bridge

## Mục đích
Nối AI với việc tạo đơn thật. Hiện `AUTO_CREATE_ORDER=0` — AI chốt lời, ghi chú Pancake,
**nhân viên tạo tay**. Module này làm cho khâu tay đó nhanh nhất có thể, và giữ đường
bật lại tự động khi chủ muốn.

## Chế độ

### Chế độ A — Bán tự động (mặc định, `AUTO_CREATE_ORDER=0`)
```
AI thu đủ Tên + SĐT + Địa chỉ + Gói + COD
   ▼
Ghi chú Pancake theo MẪU CHUẨN (máy đọc được):
   ┌───────────────────────────────────────┐
   │ 🛒 AI ĐÃ CHỐT — CHỜ TẠO ĐƠN           │
   │ Tên:      Amy Añoza                   │
   │ SĐT:      0536064249                  │
   │ Địa chỉ:  Alrawdah Jeddah, District 1 │
   │ Gói:      Buy 1 Get 1 FREE            │
   │ Tổng:     109 SAR  (đã đối chiếu KB)  │
   │ COD:      ✅ khách xác nhận            │
   └───────────────────────────────────────┘
   ▼
Gắn thẻ 'AI Chốt' + đẩy đầu hàng chờ sale
   ▼
Dashboard: nút [Tạo đơn Pancake] — 1 click, điền sẵn mọi trường
```

### Chế độ B — Tự động (`AUTO_CREATE_ORDER=1`)
Như v1: gọi `createPancakeOrder` thẳng. Chỉ bật khi tỷ lệ đơn sai < 2% qua 200 đơn chế độ A.

## Chống đơn trùng (giữ + siết)
```
TRƯỚC khi tạo đơn, kiểm 4 nguồn:
  1. Sổ AI có type='order' cho khách này chưa
  2. ordersForConv() — Pancake POS đã có đơn chưa
  3. Thẻ trạng thái đơn trên hội thoại
  4. Nội dung hội thoại có dấu hiệu đơn FB Commerce
Bất kỳ nguồn nào dương → KHÔNG tạo, chuyển POST_SALE
```

## Bắt buộc về tiền
`total_price` phải khớp **đúng một** gói trong bảng giá (M09 luật 4 gác lần nữa).
Không khớp → không tạo đơn, hỏi lại khách 1 câu ngắn kèm giá.

## Tiêu chí nghiệm thu
- [ ] Ghi chú Pancake đúng mẫu, sale tạo đơn ≤30 giây từ lúc mở chat
- [ ] 0 đơn trùng trên 200 đơn liên tiếp
- [ ] 0 đơn sai tổng tiền
- [ ] Chuyển A↔B chỉ bằng đổi env, không sửa code

## Phụ thuộc
M02 (bảng giá), M09, M18
