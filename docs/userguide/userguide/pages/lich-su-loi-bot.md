# Xem lịch sử lời bot và chạy lại một bản cũ

> Trang này hướng dẫn mở tab «Lịch sử» của một page để xem mọi bản lời bot đã lưu, chép một bản cũ vào ô soạn, hoặc cho chạy lại nguyên một bản cũ.

**Ai làm được:** Marketer (page của sản phẩm mình phụ trách) · Quản trị. Vai chỉ xem thấy các bản nhưng không có nút.

__Khi nào dùng:__ bản vừa lưu làm bot nói kém hơn và muốn quay về bản trước; muốn biết ai sửa lời bot lúc nào; muốn lấy lại một đoạn hay của bản cũ để ghép vào bản mới.

__Trước khi bắt đầu:__
- «Chạy lại» **không xoá** bản nào: nó lưu chữ của bản cũ thành **một bản mới** rồi cho chạy ngay — cùng cách với nút «Lưu — bot dùng ngay». Page đang bật bot thì khách thật nghe nội dung đó ngay khi lưu xong.
- «Chép vào ô soạn» **không ghi gì**: chỉ đổ chữ vào ô soạn để bạn sửa rồi tự lưu.

## Các bước

1. Mở trang của page, bấm tab «Lịch sử».
   → *Kết quả:* danh sách bản, mới nhất trên cùng. Mỗi dòng ghi «Bản …» kèm nhãn «Đang chạy», «Nháp» hoặc «Cũ»; dòng dưới là giờ lưu · người lưu · ghi chú (ví dụ «soạn ở trang của page», «chạy lại nội dung v…»).
2. Bấm «Xem nội dung» ở một bản.
   → *Kết quả:* mở ra chữ của từng ô có nội dung trong bản đó (ô trống không hiện; bản trống ghi «(trống)»).
3. Để lấy một bản cũ làm nền rồi sửa tiếp: bấm «Chép vào ô soạn».
   → *Kết quả:* trang chuyển sang tab «Lời bot», mọi ô được điền chữ của bản đó, thông báo «Đã chép bản … vào ô soạn — sửa rồi bấm «Lưu — bot dùng ngay» để tạo bản mới.». Chưa có gì được lưu.
4. Để quay về nguyên một bản cũ: bấm «Chạy lại bản này» (nút không có ở bản đang chạy).
   → *Kết quả:* hộp xác nhận «Chạy lại nội dung bản …?». Nội dung hộp nói rõ: «Page này đang bật bot: bot nói theo nội dung này với khách thật ngay khi lưu xong.» hoặc «Page này đang tắt bot nên chưa ảnh hưởng khách.».
5. Bấm «Chạy lại» để đồng ý (hoặc «Huỷ»).
   → *Kết quả:* thông báo «Đã chạy lại nội dung bản … thành bản … — bot đang chạy bản này.». Danh sách thêm một bản mới mang nhãn «Đang chạy», ghi chú «chạy lại nội dung v…»; bản cũ trước đó chuyển thành «Cũ».

![Tab «Lịch sử» của một page — nhãn «Đang chạy», liên kết «Xem nội dung» và nút «Chạy lại bản này»](images/lich-su-loi-bot.png)

<!-- CHỤP: anh=lich-su-loi-bot · vai=marketer · duong=/page · cho=«Chọn một page ở cột trái»
     thao_tac=bấm dòng đầu tiên của «Danh sách page» · bấm «Lịch sử» · bấm «Xem nội dung»
     trang_thai=page có ít nhất hai bản lời bot: một bản «Đang chạy» và một bản «Cũ»; một bản đang mở «Xem nội dung»
     danh_dau=(1) «Đang chạy» · (2) «Xem nội dung» · (3) «Chạy lại bản này» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Nhãn «Đang chạy» | Bản bot đang dùng — không có nút «Chạy lại» |
| (2) | «Xem nội dung» | Mở chữ của từng ô trong bản |
| (3) | Nút «Chạy lại bản này» | Lưu chữ bản cũ thành bản mới và cho chạy ngay |

## Ba nhãn của một bản

| Nhãn | Nghĩa |
|---|---|
| «Đang chạy» | Bản bot đang dùng. Mỗi page chỉ có đúng một bản đang chạy |
| «Nháp» | Bản đã lưu nhưng chưa chạy được — thường do lượt lưu báo «Bot CHƯA chạy bản này». Muốn dùng thì bấm «Chạy lại bản này» |
| «Cũ» | Bản từng chạy, đã được thay bằng bản mới hơn |

## Lưu ý

- Sau khi chạy lại, khung «AI đang đọc gì trên page này» ở cột phải chỉ đổi số bản khi bạn tải lại trang (F5).
- Không có chức năng so hai bản ngay trên tab — màn ghi «So hai bản (đủ mẫu mới kết luận) — để sau.». Muốn so, mở «Xem nội dung» của hai bản và đọc song song.
- Page chưa từng có bản nào: tab ghi «Page này chưa có bản kịch bản nào — bot chạy bằng luật chung + dữ liệu sản phẩm.». Soạn bản đầu ở tab «Lời bot».
- Vai chỉ xem thấy dòng «Vai của bạn chỉ xem được các bản.» và không có nút.

## Xử lý khi lỗi

| Màn ghi | Nghĩa | Làm gì |
|---|---|---|
| Hộp đỏ «Bot CHƯA chạy lại bản này» kèm lý do | Bản mới đã được giữ dạng nháp nhưng không đẩy được sang bot; bot vẫn nói bản cũ | Thử lại; vẫn lỗi thì gửi nguyên câu cho Quản trị |
| «Không đọc được lịch sử kịch bản» | Lượt đọc hỏng | Tải lại trang |

__Liên quan:__ [Viết và lưu lời bot cho một page](./viet-loi-bot.md) · [Bắt đầu nhanh cho Marketer: sửa một câu lời bot và kiểm tra bot đã đọc bản mới](./bat-dau-nhanh-marketer.md) · [Tra nhật ký: ai đã làm gì, lúc nào](./tra-nhat-ky.md)
