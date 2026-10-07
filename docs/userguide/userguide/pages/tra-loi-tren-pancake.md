# Trả lời khách trên Pancake mà không chen ngang bot

> Trang này hướng dẫn sale mở đúng hội thoại trên Pancake từ Hộp thư, và giữ đúng thứ tự «nhận trước, gõ sau» để bot với người không cùng nói với một khách.

**Ai làm được:** Sale (Quản trị cũng có nút này trong Hộp thư).

__Khi nào dùng:__ mỗi lần bạn cần nhắn cho khách. AI Closer **không có ô soạn tin, không có nút gửi** — mọi câu trả lời của người đều gõ trên Pancake. Thanh dưới của Hộp thư nhắc điều này: «Trả lời khách ở Pancake · ở đây nhận, duyệt và đóng».

__Trước khi bắt đầu:__
- Bạn đăng nhập được Pancake trên cùng trình duyệt. Hệ chỉ dẫn đường sang Pancake, không đăng nhập Pancake hộ bạn. <!-- TBD: tài khoản Pancake của sale cần quyền gì trên page (ghế, vai trên page) để mở được hội thoại từ đường dẫn — OQ-SA-5 -->
- Quy tắc phối hợp: **nhận việc hoặc nhận thay bot TRƯỚC khi gõ trên Pancake.** Hai thao tác này là cách chắc chắn duy nhất để bot thôi trả lời khách đó và để đồng nghiệp biết bạn đang xử.

## Các bước

1. Mở hội thoại trong «Hộp thư» (đường `/ban-hoi-thoai`).
   → *Kết quả:* thanh dưới có nút «Trả lời trên Pancake» — lúc đầu mờ, sáng lên khi hệ đọc xong hội thoại.
2. Kiểm ai đang giữ hội thoại ở dòng «Người giữ» (khối «Bot đã làm gì», cột phải), rồi làm đúng một trong hai việc:
   - Hội thoại có việc đang mở (thanh dưới có «Nhận · đóng việc ▾»): bấm «Nhận · đóng việc ▾» → «Nhận việc». Xem [Nhận một việc bot giao lại và đóng việc với kết quả](./nhan-va-dong-viec.md).
   - «Người giữ» là «Bot AI» (thanh dưới có «Nhận thay bot»): bấm «Nhận thay bot», rồi «Nhận việc». Xem [Nhận thay bot một hội thoại bot đang xử](./nhan-thay-bot.md).
   → *Kết quả:* việc mang tên bạn («{tên bạn} đang xử»); bot không còn giữ hội thoại.
3. Bấm «Trả lời trên Pancake».
   → *Kết quả:* Pancake mở ở thẻ mới, đúng page và đúng hội thoại của khách.
4. Gõ trả lời khách trên Pancake như mọi khi.
5. Quay lại thẻ Hộp thư, đóng việc với kết quả đúng (bấm «Đóng việc ▾»).

![Thanh dưới của một hội thoại — nút «Trả lời trên Pancake» đã sáng](images/tra-loi-tren-pancake.png)

<!-- CHỤP: anh=tra-loi-tren-pancake · vai=sale · duong=/ban-hoi-thoai?ht=1 · cho=«Trả lời trên Pancake»
     thao_tac=
     trang_thai=khung chat đã đọc xong, có một tin nhãn «Page»; nút «Trả lời trên Pancake» ở thanh dưới đã chuyển sang dạng nút chính (sáng); cột phải thấy dòng «Người giữ»
     danh_dau=(1) «Trả lời trên Pancake» · (2) «Page» · (3) «Người giữ» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Nút «Trả lời trên Pancake» | Mở hội thoại trên Pancake ở thẻ mới |
| (2) | Nhãn «Page» dưới một tin | Tin phía page không khớp câu bot đã gửi — thường là người gõ tay |
| (3) | Dòng «Người giữ» | «Bot AI» thì nhận thay bot trước khi gõ |

## Bot có tự nhận ra người đã trả lời không

Có, trong một số trường hợp — nhưng đừng dựa vào đó. Theo mã của bot:

- **Trước mỗi lần trả lời**, bot đọc lại lịch sử hội thoại trên Pancake. Nếu tin cuối cùng là của phía page (ví dụ bạn vừa gõ, khách chưa nhắn thêm), bot **nhường lượt đó**, không trả lời.
- Cũng lúc ấy, bot xét các tin phía page gửi **sau câu bot nói gần nhất** (và trong vòng 24 giờ), so với những câu chính nó đã gửi. Gặp một tin **không phải của bot** và trông như người gõ, bot chuyển hội thoại sang **Sale giữ** (giai đoạn «Chờ người», lý do ghi «sale_tiep_quan_tren_kenh») và thôi trả lời khách đó.
- Một tin được coi là «người gõ» khi: có chữ, dài **tối đa 80 ký tự**, **không quá 2 dòng**, **không có đường link**, **ít hơn 3 biểu tượng cảm xúc**, không giống mẫu quảng cáo hay mẫu tin máy đã biết, và không phải tin của một công cụ tự động (ví dụ Botcake, Public API, công cụ của kho hàng).
- Hệ quả: tin dài, tin dán mẫu, tin kèm link, tin nhiều dòng **không** làm bot dừng. Và việc «nhận ra» chỉ xảy ra khi khách nhắn tin tiếp theo — tới lúc đó bot mới đọc lại.
- Khi bot tự nhận ra như vậy, hệ **không tạo việc** trong Hộp thư. Hội thoại chỉ đổi người giữ sang «Sale» (thấy ở lối «Mọi hội thoại gần đây»).

Vì vậy: nhận việc hoặc nhận thay bot trước, rồi mới gõ.

## Dấu vết bot để lại trên Pancake

Khi bot tự giao hội thoại cho người, bot để lại trên Pancake:
- một ghi chú vào hồ sơ khách, mở đầu «🙋 AI CHUYỂN NGƯỜI — cần sale vào hỗ trợ», dòng dưới là «Lý do: …»;
- thẻ «AI back Sale» trên hội thoại (tên thẻ mặc định; page phải có sẵn thẻ đúng tên thì mới gắn được).

Ngược lại, «Nhận thay bot» và «Nhận việc» trên hệ **không ghi gì sang Pancake** — không đổi thẻ, không để ghi chú. Đồng nghiệp chỉ làm trên Pancake sẽ không biết bạn đã nhận; họ thấy điều đó trong Hộp thư.

## Lưu ý

- Nút «Trả lời trên Pancake» vẫn sáng khi khung chat báo «Chưa đọc được hội thoại từ Pancake» — dùng nó để đọc thẳng trên Pancake. Nút chỉ mờ mãi khi hội thoại không gắn page nào.
- Ở màn «Việc đang chờ» và trang «Chi tiết việc cần xử», nút tương ứng tên là «Mở Pancake»; nó mờ khi việc không gắn hội thoại nào («Việc này không gắn hội thoại nào») — thường là việc đơn, phải xử trên kho hàng.
- Hội thoại đã do Sale giữ thì bot không tự lấy lại, kể cả khi bạn không trả lời. Đã nhận thì xử tới cùng. Sale chưa có nút trả hội thoại cho bot — xem [Nhận thay bot một hội thoại bot đang xử](./nhan-thay-bot.md).
- Khách nhắn tiếp trong lúc bạn đang xử: tin hiện trên Pancake như thường; khung chat trong Hộp thư có thể chậm tới 1 phút.

__Xử lý khi lỗi:__
- Nút «Trả lời trên Pancake» không sáng lên: hội thoại thiếu page — tìm khách trực tiếp trên Pancake và báo quản trị.
- Pancake mở ra trang của page nhưng không vào đúng hội thoại: hệ thiếu mã hội thoại của khách đó; tìm khách theo tên hoặc số ngay trên Pancake.
- Bấm «Nhận thay bot» báo «Hội thoại đang xử lý; thử lại sau»: bot đang xử lý một tin của khách, chờ vài giây rồi bấm lại — **chưa gõ** trên Pancake trong lúc chờ.

__Liên quan:__ [Nhận thay bot một hội thoại bot đang xử](./nhan-thay-bot.md) · [Nhận một việc bot giao lại và đóng việc với kết quả](./nhan-va-dong-viec.md) · [Khi nào bot trả lời, khi nào im và giao cho người](./khi-nao-bot-tra-loi.md) · [Đọc hội thoại và bối cảnh khách trước khi trả lời](./doc-hoi-thoai-boi-canh.md)
