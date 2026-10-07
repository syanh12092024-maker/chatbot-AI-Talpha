# Thêm hoặc gỡ một thị trường cho sản phẩm

> Trang này hướng dẫn người quản trị mở bán một sản phẩm sẵn có ở thêm một nước (gắn món của cửa hàng nước đó) hoặc gỡ món khỏi sản phẩm.

**Ai làm được:** Quản trị. Marketer xem được tab «Theo thị trường» của sản phẩm mình phụ trách nhưng không thấy nút «+ Thêm thị trường…» và «Gỡ».

__Khi nào dùng:__ sản phẩm bắt đầu bán ở một nước mới mà món của cửa hàng nước đó chưa nối vào sản phẩm (thường vì SKU ở cửa hàng đó khác, hoặc món không có SKU); hoặc lỡ gắn nhầm món vào sản phẩm.

__Trước khi bắt đầu:__
- Mỗi cửa hàng của kho hàng là một thị trường («1 shop POS = 1 thị trường»). Thêm thị trường nghĩa là gắn **một món** của cửa hàng nước đó vào sản phẩm.
- Danh mục của cửa hàng đó đã được kéo về (xem [Thêm kho hàng, kéo danh mục và quét page](./them-kho-hang-keo-du-lieu.md)). Món cùng SKU với sản phẩm thì lượt kéo danh mục đã tự nối — bạn không cần làm tay.
- Sản phẩm đã có trên hệ (tạo bằng [Gộp món POS thành một sản phẩm theo SKU](./gop-mon-pos.md)).

## Các bước — thêm một thị trường

1. Mở **Sản phẩm → Sản phẩm & kho**, bấm tên sản phẩm ở cột trái.
   → *Kết quả:* bên phải mở sản phẩm ở tab «Chung».
2. Bấm tab «Theo thị trường».
   → *Kết quả:* hàng viên liệt kê từng thị trường đang có (kèm tiền tệ), cuối hàng là viên «+ Thêm thị trường = chọn shop POS + 1 món». Sản phẩm chưa có thị trường nào thì màn ghi «Chưa gắn thị trường nào».
3. Bấm viên «+ Thêm thị trường = chọn shop POS + 1 món».
   → *Kết quả:* mở khung ba bước.
4. Ở bước «① Shop POS = thị trường», bấm viên của cửa hàng nước cần thêm (con số cạnh tên là số món của cửa hàng đó chưa thuộc sản phẩm nào).
   → *Kết quả:* bước «② Món trên POS của …» liệt kê các món đó: mã món, tên, tồn kho.
5. Gõ vào ô «Tìm theo tên hoặc mã món…» nếu danh sách dài, rồi bấm đúng một món.
   → *Kết quả:* món được tô chọn; nút «Thêm thị trường» hết mờ.
6. Đọc bước «③ Marketer phụ trách»: màn ghi «Thêm thị trường không cần bước này» — marketer đặt một lần cho cả sản phẩm ở tab «Chung».
   → *Kết quả:* không có gì phải chọn ở bước này.
7. Bấm «Thêm thị trường».
   → *Kết quả:* khung đóng, viên của thị trường mới xuất hiện và được mở: thẻ cửa hàng ghi «Shop POS», «Món POS» (tồn kho, nhãn «Hết hàng» nếu hết), «Marketer», «Page bán ở đây». Lượt thêm ghi một dòng ở tab «Lịch sử».

![Tab «Theo thị trường» — khung «Thêm thị trường» ba bước, đã chọn cửa hàng và một món](images/them-thi-truong.png)

<!-- CHỤP: anh=them-thi-truong · vai=quan-tri · duong=/san-pham · cho=«Theo thị trường»
     thao_tac=bấm «Theo thị trường» · bấm «+ Thêm thị trường = chọn shop POS + 1 món» · bấm viên cửa hàng đầu tiên ở «① Shop POS = thị trường» · bấm món đầu tiên ở «② Món trên POS»
     trang_thai=khung «Thêm thị trường» mở đủ ba bước, một cửa hàng và một món đang được chọn, nút «Thêm thị trường» sáng
     danh_dau=(1) «① Shop POS = thị trường» · (2) «② Món trên POS» · (3) «Thêm thị trường» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Bước «① Shop POS = thị trường» | Chọn cửa hàng của nước cần thêm |
| (2) | Bước «② Món trên POS» | Chọn đúng một món — tìm theo tên hoặc mã nếu dài |
| (3) | Nút «Thêm thị trường» | Bấm để gắn món; «Huỷ» để đóng khung không đổi gì |

## Các bước — gỡ một món (gỡ thị trường)

1. Ở tab «Theo thị trường», bấm viên của thị trường cần gỡ.
   → *Kết quả:* thẻ cửa hàng hiện dòng «Món POS» với nút «Gỡ» cạnh từng món.
2. Xem khối «Page bán ở đây» bên phải thẻ để biết page nào đang bán ở thị trường này.
   → *Kết quả:* bạn biết trước page nào sẽ bị ảnh hưởng.
3. Bấm «Gỡ» ở món cần gỡ.
   → *Kết quả:* món rời sản phẩm ngay (nút không hỏi lại) và quay về danh sách món chưa thuộc sản phẩm. Gỡ món cuối cùng của một cửa hàng là thị trường đó biến khỏi hàng viên. Lượt gỡ ghi một dòng ở tab «Lịch sử».

## Lưu ý

- **Gỡ món là cắt đường bán.** Nút «Gỡ» ghi rõ «page đang bán món này mất đường về sản phẩm». Page đã gắn vào sản phẩm ở thị trường đó sẽ không còn món để bot chào bán. Trước khi gỡ, chuyển page sang sản phẩm khác hoặc gỡ page (xem [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md)).
- **Bảng giá thuộc về món.** Giá đặt ở thị trường là giá của chính món đó; gỡ món thì bảng giá đi theo món, không ở lại sản phẩm. Thêm thị trường xong, đặt giá ngay — chưa có bậc giá thì page gắn vào chưa báo giá được (xem [Sửa bảng giá của sản phẩm ở một thị trường](./sua-bang-gia.md)).
- **Hai món ở cùng một cửa hàng:** hệ cho gắn thêm món thứ hai của một cửa hàng đã có (ví dụ một biến thể khác size). Khi đó thẻ cửa hàng liệt kê cả hai món và phần «Giá ở …» có một bảng giá riêng cho từng món.
- Thẻ cửa hàng ghi «shop chưa khai ở Kết nối» nghĩa là cửa hàng có món nhưng chưa đặt tên thị trường ở **Cài đặt → Kết nối**; viên khi đó hiện «Shop …» thay cho tên nước.
- Dòng «Lời bot riêng cho thị trường (kịch bản tầng nước) hôm nay xem trong màn Kịch bản của từng page — chưa sửa theo sản phẩm ở đây được.» là giới hạn hiện tại của màn.

## Xử lý khi lỗi

| Câu trên màn | Nghĩa | Cách xử lý |
|---|---|---|
| «Mọi món POS đã kéo về đều thuộc một sản phẩm. Kéo danh mục shop khác ở Cài đặt › Kết nối.» | Không còn món nào để chọn ở bước ① | Kéo danh mục cửa hàng cần thêm, rồi mở lại khung |
| «Không món nào khớp.» | Từ khoá ở ô tìm không trúng món nào | Xoá bớt từ khoá |
| «món này đang thuộc sản phẩm «…» — gỡ ở đó trước» | Món vừa được người khác gắn vào sản phẩm khác | Tải lại trang; nếu thật sự nhầm, gỡ ở sản phẩm kia trước |
| «không có món POS này trong danh mục đã kéo» | Danh mục vừa đổi | Tải lại trang, chọn lại món |
| «Chưa gỡ được» · «món này không thuộc sản phẩm gốc này» | Món đã bị gỡ ở lượt khác | Tải lại trang |

## Liên quan

[Gộp món POS thành một sản phẩm theo SKU](./gop-mon-pos.md) · [Sửa bảng giá của sản phẩm ở một thị trường](./sua-bang-gia.md) · [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) · [Xem giá và tồn kho theo thị trường](./xem-gia-ton-kho.md)
