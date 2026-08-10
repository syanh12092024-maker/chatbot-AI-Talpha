# Kịch bản tự động từng page — bảng luật + vòng học mỗi ngày

> Bổ sung cho M02 (Script Studio), M06 (Fast Lane), M15–M16 (tự tiến hoá).
> Trả lời câu hỏi: *"kịch bản dựng sẵn cho từng page chạy ra sao, có tự bổ sung
> tình huống mới để khỏi tốn AI được không, và tối ưu nó hằng ngày thế nào."*

---

## 0. Số liệu nền — đọc trước khi kỳ vọng

Đo 10/08/2026 trên 6.001 tin khách thật (log VPS):

| | |
|---|---|
| Fast Lane (mẫu chung) xử lý được | **36,2%** |
| Tin còn phải leo lên AI | 3.827 (63,8%) |
| Số **tình huống khác nhau** trong 3.827 tin đó | **3.259** |
| Tình huống lặp ≥3 lần | 70 → phủ 523 tin (**13,7%** số tin leo AI) |

**Đuôi dài cực dài.** Bắt từ khoá thuần không thể đưa 36% → 80%. Trần thực tế ≈ **50%**.

Và trong 70 tình huống lặp nhiều nhất, ~216 tin là `ok`/`yes`/`oky`/`1`/`2` — tức là
**câu trả lời cho câu hỏi của AI**. Những tin này BẮT BUỘC phải để AI xử lý (đó là chỗ
chốt đơn). Biến chúng thành mẫu cứng là mất đơn.

👉 Vì vậy bảng kịch bản này có **hai mục tiêu tách bạch**, đừng lẫn:
- **Cột tự động** → tiết kiệm token (biên độ vừa phải)
- **Cột gợi ý AI** → trả lời trúng FAQ riêng của page

> ⚠️ **Đính chính:** bản đầu ghi *"39 page dùng chung 1 kịch bản"* — SAI. **37/38 page đã
> có `salesPrompt` riêng** (890–1.908 token). Nên cột "Gợi ý cho AI" KHÔNG phải bước nhảy
> từ không-có-gì; nó là lớp **bổ sung theo tình huống cụ thể** (`pawnable`, `halal ba`,
> `paano mag order ng cream`) mà một `salesPrompt` viết chung khó phủ hết. Biên độ vì vậy
> **nhỏ hơn** bản đầu nói.

---

## 1. Bảng kịch bản — tab mới trên Google Sheet: `Kịch bản tự động`

Một dòng = một tình huống của một page.

| Cột | Bắt buộc | Ý nghĩa |
|---|---|---|
| **Page ID** | ✅ | Trống = áp dụng cho MỌI page cùng ngành hàng |
| **Tình huống** | ✅ | Tên người đọc hiểu: "Hỏi có cầm đồ được không" |
| **Từ khoá bắt** | ✅ | Nhiều mẫu, phân cách bằng `\|`. VD: `pawnable\|sanla\|pwede isangla` |
| **Câu trả lời tự động** | — | **Điền = trả lời 0 token.** Trống = luôn đẩy lên AI |
| **Gợi ý cho AI** | — | **Điền = AI nhận thêm gợi ý này khi gặp tình huống.** |
| **Điều kiện** | — | `luôn` \| `chưa có đơn` \| `đã báo giá` \| `lượt ≥2` |
| **Ưu tiên** | — | Số; cao thắng khi nhiều dòng cùng khớp. Mặc định 0 |
| **Trạng thái** | ✅ | `BẬT` \| `TẮT` \| `CHỜ DUYỆT` |
| **Nguồn** | — | `người` \| `AI đề xuất 12/08` — để biết ai thêm |
| *(đo tự động)* | — | `Lượt dùng` · `Hỏi lại ngay` · `Chốt sau đó` |

### Bốn cách kết hợp hai cột

| Câu trả lời tự động | Gợi ý cho AI | Hành vi | Chi phí |
|---|---|---|---|
| ✅ | ✗ | Bắn mẫu, không gọi AI | **0đ** |
| ✅ | ✅ | Lần đầu bắn mẫu; khách hỏi lại → AI vào **kèm gợi ý** | 0đ rồi ~130đ |
| ✗ | ✅ | Luôn gọi AI, nhưng AI **biết cách trả lời đúng** | ~130đ, chốt tốt hơn |
| ✗ | ✗ | Dòng vô nghĩa — validator chặn | — |

### Ví dụ thật (page Luxoria GOLD Jewelry)

| Tình huống | Từ khoá bắt | Câu trả lời tự động | Gợi ý cho AI |
|---|---|---|---|
| Hỏi cầm đồ | `pawnable\|sanla\|isangla` | `Opo! 💛 18K Saudi Gold po, may certificate at code 750 sa lock — pawnable po. Gusto niyo pong makita ang certificate? 😊` | Sau khi trả lời, mời xem ảnh chứng nhận rồi chốt bằng lựa chọn gói |
| Hỏi tháng sinh | `january\|february\|...\|december` | *(trống)* | Tra đúng đá theo tháng khách nói, nêu ý nghĩa 1 câu, rồi chốt bằng gói |
| Hỏi vàng thật | `tunay ba\|real gold\|peke ba` | *(trống)* | Gửi ảnh chứng nhận + nhấn COD xem hàng rồi mới trả tiền. KHÔNG hứa gì ngoài KB |

---

## 2. Luật an toàn — tình huống nào CẤM làm tự động

Validator (M02) chặn cứng, không cho `BẬT` nếu từ khoá rơi vào các nhóm sau:

| Nhóm | Vì sao phải để AI |
|---|---|
| Gật đầu / từ chối (`ok`, `yes`, `no`, `sige`) | Là câu trả lời cho câu hỏi AI vừa hỏi — mẫu cứng sẽ trả lời lạc đề |
| Số lượng, chọn gói (`1`, `2`, `1 set`) | Cần biết AI vừa hỏi gì |
| Tên / SĐT / địa chỉ | Thu thập thông tin đơn |
| Phản đối giá (`mahal`, `expensive`) | Phải chạy ladder 3 bước |
| Khiếu nại, hàng lỗi | Phải bàn giao người |
| Bất kỳ câu trả lời nào có **số tiền không nằm trong bảng giá** | Quy tắc tiền hạng sống còn |

Ngoài ra câu trả lời tự động vẫn phải qua **M09 Outbound Guard** như mọi tin khác, và
phải **kết bằng một bước tiến về phía đơn** (nguyên tắc 14).

---

## 3. Vòng học mỗi đêm — kịch bản tự dày lên

Chạy sau M15 (Conversation Miner), 02:30 mỗi đêm, cho từng page:

```
① GOM   — mọi tin 24h qua đã LEO LÊN AI (Sổ AI: lane='AI')
② NHÓM  — chuẩn hoá + gom cụm theo độ giống nhau
③ LỌC   — giữ cụm thoả CẢ BA:
             · lặp ≥ 5 lần trong 7 ngày
             · câu trả lời của AI cho cụm đó GIỐNG NHAU ≥80%
               (AI trả lời nhất quán = tình huống ổn định, mẫu hoá được)
             · không rơi vào nhóm CẤM ở §2
④ VIẾT  — 1 lần gọi model rẻ/page:
             sinh "Từ khoá bắt" + "Câu trả lời tự động" (lấy từ câu AI
             trả lời tốt nhất trong cụm — câu dẫn tới đơn) + "Gợi ý cho AI"
⑤ DUYỆT — ghi dòng mới vào Sheet với Trạng thái = CHỜ DUYỆT
             marketer bấm BẬT thì mới chạy
```

### Chiều ngược lại — hạ dòng kém xuống

Mỗi dòng `BẬT` được đo 3 chỉ số, cập nhật hằng đêm:

| Chỉ số | Cách đo | Ngưỡng xấu → đề xuất hạ |
|---|---|---|
| **Hỏi lại ngay** | khách hỏi lại cùng ý trong 2 lượt kế | > 25% |
| **Chốt sau đó** | tỷ lệ chốt của khách đã gặp dòng này | thấp hơn 30% so với mức chung của page |
| **Im sau đó** | khách không trả lời nữa | > 60% |

Vi phạm → hệ thống đề xuất **chuyển từ "Câu trả lời tự động" sang "Gợi ý cho AI"**
(tức trả tình huống đó lại cho AI). Vẫn phải người duyệt.

Đây là cơ chế tự sửa quan trọng nhất: **kịch bản cứng làm hỏng chỗ nào thì chính số
liệu chỉ ra chỗ đó**, không phải chờ sale phàn nàn.

---

## 4. Thứ tự ưu tiên khi nhiều luật cùng khớp

```
1. Luật CẤM (§2)                 → luôn lên AI, bỏ qua mọi dòng kịch bản
2. Dòng có Page ID cụ thể        → thắng dòng dùng chung
3. Ưu tiên cao hơn thắng
4. Cùng ưu tiên → dòng có "Điều kiện" hẹp hơn thắng
5. Không dòng nào khớp           → mẫu cứng trong code (giá/ship/cách đặt)
6. Vẫn không                     → AI
```

Và luật chống lặp giữ nguyên: **một dòng kịch bản chỉ bắn tối đa 1 lần cho một khách**;
khách hỏi lại cùng ý → leo lên AI (kèm "Gợi ý cho AI" của chính dòng đó).

---

## 5. Kỳ vọng thực tế

| | Nay | Sau khi có bảng kịch bản |
|---|---|---|
| Fast Lane xử lý | 36,2% | **45–50%** |
| Chi phí/lượt | ~50đ (sau Đợt 1) | ~40đ |
| FAQ riêng của page trả lời trúng | tuỳ `salesPrompt` phủ tới đâu | **có luật riêng cho từng tình huống** |
| Số dòng kịch bản **đo được hiệu quả** | 0 | mọi dòng |

⚠️ Cả hai phần đều **vừa phải**: tiết kiệm 36% → ~48%, và chất lượng chỉ nhích ở phần
`salesPrompt` chưa phủ. **Đừng xếp module này trước M20/M17.** Giá trị lớn nhất của bảng
kịch bản là mỗi dòng có 3 chỉ số đo được — mà muốn đo thì phải có M20 trước.

---

## 6. Thứ tự làm

| Bước | Việc | Công |
|---|---|---|
| 1 | Đọc tab `Kịch bản tự động` trong `kb.js` + khớp luật trong `fast-lane.js` | 1,5 ngày |
| 2 | Validator luật cấm (§2) | 0,5 ngày |
| 3 | Màn hình sửa kịch bản trên dashboard (M02) | 2 ngày |
| 4 | Đo 3 chỉ số/dòng, ghi vào Sổ AI (`rule` = mã dòng) | 1 ngày |
| 5 | Vòng học đêm sinh đề xuất (M15+M16) | 3 ngày |

Bước 1–2 chạy được ngay với dữ liệu marketer tự điền. Bước 5 chỉ có nghĩa **sau khi**
bước 4 xong — không đo được thì không biết dòng nào tốt dòng nào xấu.
