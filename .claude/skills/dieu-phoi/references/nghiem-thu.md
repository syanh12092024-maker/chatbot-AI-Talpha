# Nghiệm thu

Mỗi luồng trong `docs/v3/02-KE-HOACH-CODE.md` có tiêu chí riêng. File này là phần **chung cho mọi luồng** — chạy thêm, không thay thế.

---

## Chạy cho mọi module

```bash
npm test
```

Test đỏ thì dừng, không đi tiếp.

## Chạy cho mọi module có đụng dữ liệu

Ba ca, phải đủ cả ba:

1. **Truy vấn không có bối cảnh team** → ném lỗi, không trả dữ liệu rỗng
   *Trả rỗng là nguy hiểm hơn ném lỗi — nó trông như "không có dữ liệu" thay vì "sai cách gọi".*
2. **Đăng nhập team A, hỏi dữ liệu** → chỉ ra dữ liệu team A
3. **Truyền tay `team_id` của team B** → bị chặn, có ghi nhật ký

## Chạy trước khi đóng một luồng

- Đọc lại toàn bộ diff của luồng, tìm file sửa ngoài phạm vi
- Đối chiếu từng tiêu chí trong kế hoạch, tự tay chạy
- Bản đang chạy **vẫn hoạt động bình thường** — kiểm bằng `systemctl is-active aicloser` và mở dashboard cũ
- Cập nhật `docs/v3/04-TIEN-DO.md`

---

## Nghiệm thu hành vi AI — làm khác

Code chạy được không có nghĩa AI trả lời đúng. Với mọi thay đổi chạm vào prompt, kịch bản, hoặc lớp trả lời 0 đồng:

- **Chạy ít nhất ba lượt** và đánh giá cả ba. Model không tất định — một lần đúng không chứng minh gì
- **Chạy trên máy chủ**, không chạy ở máy cá nhân. Máy cá nhân thiếu dữ liệu sản phẩm thật nên sẽ báo `page_no_kb` rồi bàn giao ngay, không phản ánh thực tế
- **Dùng psid giả** (`TEST_*`) để không đụng khách thật
- Quy trình chi tiết ở skill `chatbot`, mục "Chạy thử một kịch bản hội thoại"

---

## Bộ ca test tối thiểu cho phần chat

Cố định cho mọi thay đổi chạm vào cách bot nói:

1. Hỏi giá ngay từ tin đầu
2. Từ chối hai lần liên tiếp
3. Hỏi tới thứ bắt buộc phải chuyển người — khiếu nại, đổi trả, hoàn tiền
4. Khách nói ngôn ngữ lạ
5. Khách đã có đơn rồi nhắn tiếp
6. Đọc lại toàn bộ lời bot xem có lọt chữ kỹ thuật không

Ca nào trượt thì **thêm một dòng luật** cho đúng tình huống đó, đừng viết lại cả bản.
