# Giao việc cho sub-agent

## Khuôn lời giao việc

Mỗi lần giao, dán đủ ba phần: **luật cứng · spec · cách báo cáo**. Thiếu phần nào agent cũng sẽ tự đoán.

```
Bạn đang viết code cho dự án AI Closer v3.

BA LUẬT THẮNG MỌI YÊU CẦU KHÁC:
1. File .env ở máy này phải luôn có PANCAKE_READONLY=1. Không sửa, không bỏ.
   Thiếu dòng này là máy này gửi tin cho khách thật, trùng với máy chủ.
2. Không xoá đơn hàng POS ở bất kỳ trạng thái nào.
3. Chỉ thao tác trong repo này. Không thêm git remote, không deploy đi đâu,
   không đẩy dữ liệu ra dịch vụ ngoài.

BỐI CẢNH:
- Bản đang chạy nằm ở src/, đang phục vụ 51 page khách thật. ĐỪNG SỬA nó.
- 48% code cũ dùng lại được — kiểm src/ trước khi viết mới bất cứ thứ gì.
- Đọc docs/v3/01-QUYET-DINH.md nếu cần biết vì sao một thứ được quyết như vậy.

SPEC:
<dán nguyên spec module vào đây>

CÁCH BÁO CÁO:
Trả về đúng ba mục, không dài dòng:
1. Đã làm gì — liệt kê file đã tạo/sửa
2. Tiêu chí xong nào đã đạt, tiêu chí nào chưa và vì sao
3. Chỗ nào bạn phải tự quyết vì spec chưa nói rõ
```

---

## Song song hay tuần tự

| Tình huống | Cách giao |
|---|---|
| Hai module không đụng chung file, không cùng ghi một bảng | **Song song** — gửi cả hai trong một lượt |
| Module B cần kết quả của A | **Tuần tự** — A nghiệm thu xong mới giao B |
| Hai module cùng ghi một bảng | **Tuần tự**, dù file khác nhau |
| Không chắc có đụng nhau không | **Tuần tự.** Rẻ hơn nhiều so với gỡ xung đột |

**Trần: bốn agent song song.** Nhiều hơn thì khó soát diff và dễ đụng nhau mà không ai phát hiện.

---

## Nhận kết quả

Agent báo xong **không có nghĩa là xong**. Ba việc bắt buộc làm:

**1. Đọc diff.** Tìm file agent sửa mà spec không cho phép. Đây là lỗi hay gặp nhất — agent thấy một chỗ "tiện tay sửa luôn" rồi làm hỏng việc của người khác.

**2. Chạy tiêu chí xong.** Từng cái một, tự tay chạy. Không đọc báo cáo rồi tin.

**3. Đọc mục "chỗ phải tự quyết".** Agent nào cũng có chỗ tự quyết. Xem nó quyết đúng nghiệp vụ chưa — nếu sai thì sửa spec rồi giao lại, đừng để nguyên.

---

## Khi kết quả không đạt

**Giao lại đúng chỗ thiếu**, đừng bắt viết lại cả module. Lời giao lại:

```
Module <mã> chưa đạt tiêu chí <số mấy>: <mô tả cụ thể cái sai>.
Giữ nguyên mọi thứ khác. Chỉ sửa đúng chỗ đó.
File được đụng lần này: <danh sách hẹp hơn lần đầu>
```

Ba lần giao lại mà vẫn không đạt thì **dừng, tự làm**. Có nghĩa spec chưa rõ, không phải agent kém.

---

## Những gì KHÔNG giao cho agent

- Quyết định nghiệp vụ — agent không có bối cảnh cả dự án, nó chọn cái dễ code
- Sửa `src/prompts.js` — bộ luật chung ảnh hưởng cả 51 page
- Bất cứ thứ gì chạm vào máy chủ production
- Việc di trú dữ liệu thật lần cuối — làm tay, đối chiếu từng bảng
- Nghiệm thu — người giao việc phải là người nghiệm thu
