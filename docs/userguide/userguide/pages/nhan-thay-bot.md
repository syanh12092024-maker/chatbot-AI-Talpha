# Nhận thay bot một hội thoại bot đang xử

> Trang này hướng dẫn sale giành một hội thoại từ tay bot — khi bot vẫn đang trả lời mà bạn thấy khách cần người — và giải thích điều gì xảy ra với bot sau khi bạn nhận.

**Ai làm được:** Sale · Quản trị.

__Khi nào dùng:__ bot chưa giao việc, nhưng bạn đọc hội thoại và thấy nên có người vào ngay — ví dụ khách hỏi điều bot không biết, khách bực, hoặc khách sắp chốt mà bot đang lòng vòng. Nhận thay bot **trước** khi bạn gõ bất cứ gì cho khách trên Pancake.

__Trước khi bắt đầu:__
- Nút «Nhận thay bot» chỉ hiện khi hội thoại đang do **Bot AI** giữ và **chưa có việc nào đang mở**. Hội thoại đã có việc (đang ở tab «Cần bạn») thì dùng «Nhận · đóng việc ▾» — xem [Nhận một việc bot giao lại và đóng việc với kết quả](./nhan-va-dong-viec.md).
- Hộp thư chỉ hiện hội thoại của team đang mở ([Đăng nhập, chọn team và đổi team](./dang-nhap-chon-team.md)).

## Các bước

1. Mở «Hộp thư» (đường `/ban-hoi-thoai`), bấm tab «Bot đang xử».
   → *Kết quả:* danh sách hội thoại bot đang giữ, chạm trong 7 ngày qua, mới nhất lên đầu, tối đa 100 dòng (số trên tab có dấu «+» khi bị cắt). Mỗi dòng mang nhãn «Bot đang trả lời» và câu bot nói gần nhất («Bot: …»).
2. Bấm vào hội thoại bạn muốn nhận.
   → *Kết quả:* khung giữa đọc tin từ Pancake; thanh dưới có nút «Nhận thay bot». Cột phải, khối «Bot đã làm gì», dòng «Người giữ» ghi «Bot AI».
3. Đọc nhanh khung chat và cột phải để chắc đây đúng là khách cần người (xem [Đọc hội thoại và bối cảnh khách trước khi trả lời](./doc-hoi-thoai-boi-canh.md)).
4. Bấm «Nhận thay bot».
   → *Kết quả:* nút mờ đi trong lúc hệ ghi. Xong thì hội thoại rời tab «Bot đang xử» và mở lại với một **việc mới**: lý do «sale nhận thay bot ở Hộp thư», đồng hồ 10 phút, nhãn «Chờ người». Thanh dưới giờ có «Nhận · đóng việc ▾» thay cho «Nhận thay bot».
5. Bấm «Nhận · đóng việc ▾» rồi bấm «Nhận việc».
   → *Kết quả:* việc thành «{tên bạn} đang xử». Bước này cần thiết: «Nhận thay bot» chỉ lấy hội thoại khỏi tay bot, **chưa** gán việc cho riêng bạn — việc mới nằm chung trong tab «Cần bạn» của cả team, ai cũng nhận được.
6. Bấm «Trả lời trên Pancake» và trả lời khách trên Pancake.
7. Xong việc thì quay lại, bấm «Đóng việc ▾», chọn kết quả, bấm «Đóng việc».

![Tab «Bot đang xử» — một hội thoại bot đang trả lời, nút «Nhận thay bot» ở thanh dưới](images/nhan-thay-bot.png)

<!-- CHỤP: anh=nhan-thay-bot · vai=sale · duong=/ban-hoi-thoai · cho=«Bot đang xử»
     thao_tac=bấm «Bot đang xử» · bấm «Hessa Al Amri»
     trang_thai=tab «Bot đang xử» đang sáng, một dòng nhãn «Bot đang trả lời» được chọn; khung giữa đã có tin; thanh dưới có nút «Nhận thay bot»
     danh_dau=(1) «Bot đang xử» · (2) «Bot đang trả lời» · (3) «Nhận thay bot» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Tab «Bot đang xử» | Danh sách hội thoại bot còn đang giữ |
| (2) | Nhãn «Bot đang trả lời» | Hội thoại này bot vẫn tự trả lời khách |
| (3) | Nút «Nhận thay bot» | Lấy hội thoại khỏi tay bot; sau đó nhớ «Nhận việc» |

## Điều gì xảy ra với bot sau khi bạn nhận

- Người giữ hội thoại đổi từ «Bot AI» sang «Sale». Giai đoạn đổi sang «Chờ người» — trừ khi hội thoại đang ở «Chốt đơn» hoặc «Sau bán» thì giữ nguyên.
- **Bot thôi trả lời hội thoại này.** Bot chỉ tự trả lời khi người giữ là Bot AI và hội thoại đang ở giai đoạn «Chào», «Tìm hiểu nhu cầu» hoặc «Tư vấn». Tin khách nhắn tiếp sẽ không được bot trả lời nữa — bạn trả lời trên Pancake.
- Bot **không tự giành lại** hội thoại khi bạn im, kể cả khi khách nhắn tiếp sau nhiều giờ.
- Nhận thay bot chỉ ghi trên hệ AI Closer; **không ghi gì sang Pancake** — không đổi thẻ, không để ghi chú trên hội thoại Pancake.
- Một việc mới vào hàng đợi với hạn 10 phút. Nếu hội thoại đã có một việc chưa đóng thì hệ không tạo thêm việc thứ hai.

## «Trả lại cho bot» — chưa có cho sale

Hệ chưa làm được việc này cho vai Sale: không có nút nào trả hội thoại về cho bot sau khi bạn nhận việc hoặc nhận thay bot. Kết quả đóng việc «Trả lại cho bot» trong khung «Đánh dấu đã xử» **chỉ ghi lại kết quả** — hội thoại vẫn do Sale giữ và bot vẫn im với khách đó.

Hiện tại: nếu muốn bot nói tiếp với khách, nhờ **quản trị team** làm ở Cài đặt › Vận hành (đường `/van-hanh-v3`), tab «Hội thoại»: bấm «Mở hội thoại» ở đúng hội thoại, gõ lý do 5–300 ký tự (không ghi thông tin cá nhân của khách) rồi bấm «Cho AI tiếp tục». Nút này chỉ chạy khi:

- hội thoại đang ở giai đoạn «Chờ người» và do Sale giữ (nếu không, hệ báo «Chỉ nhận lại chat đang HANDOFF/SALE»);
- không còn tin nào của khách đang chờ hoặc lỗi trong hàng xử lý, hội thoại chưa từng có đơn bot chốt và chưa ghi nhận đặt hàng (nếu có, hệ báo «Còn tin chưa xử lý hoặc có thông tin đơn; phải giải quyết trước khi trả AI»).

Vì điều kiện thứ hai, hội thoại đã có đơn bot chốt thì không trả lại cho bot được — sale xử lý tới cùng trên Pancake.

## Lưu ý

- Bot cũng **tự nhận ra** khi có người trả lời trên Pancake trong một số trường hợp, nhưng không phải lúc nào cũng nhận ra — vì vậy luôn bấm «Nhận thay bot» trước khi gõ. Chi tiết: [Trả lời khách trên Pancake mà không chen ngang bot](./tra-loi-tren-pancake.md).
- Hội thoại bot đã tự giao cho người (khách khiếu nại, hết lượt…) thì đã do Sale giữ — nó không nằm ở «Bot đang xử» và không có nút «Nhận thay bot».
- Quản trị còn một đường khác để giao hội thoại cho sale: nút «Chuyển nhân viên xử lý» ở cùng chỗ «Cho AI tiếp tục»; việc tạo ra mang lý do quản trị gõ (bỏ trống thì ghi «người bấm bàn giao cho sale»).

## Xử lý khi lỗi

Lỗi hiện thành hộp đỏ «Chưa nhận được» ở đầu khung chat, nút «Nhận thay bot» sáng lại để bạn bấm lần nữa.

| Câu dưới «Chưa nhận được» | Nghĩa | Làm gì |
|---|---|---|
| «Hội thoại đang xử lý; thử lại sau» | Bot đang xử lý dở một tin của khách này | Chờ vài giây rồi bấm lại |
| «Không thể thực hiện. Dữ liệu có thể đã thay đổi; tải lại và thử lại.» | Hội thoại vừa bị ghi bởi nơi khác | Tải lại trang, mở lại hội thoại, kiểm còn nút không |
| «Không tìm thấy hội thoại» | Hội thoại không thuộc team đang mở | Kiểm chip team |
| «Môi trường này chưa nối dữ liệu đơn và hội thoại.» | Máy chủ chưa nối dữ liệu | Báo quản trị team; quản trị nhờ người quản trị hệ thống |

__Liên quan:__ [Nhận một việc bot giao lại và đóng việc với kết quả](./nhan-va-dong-viec.md) · [Trả lời khách trên Pancake mà không chen ngang bot](./tra-loi-tren-pancake.md) · [Khi nào bot trả lời, khi nào im và giao cho người](./khi-nao-bot-tra-loi.md) · [Lý do bot giao việc và kết quả đóng việc](./tra-cuu-ly-do-giao-viec.md)
