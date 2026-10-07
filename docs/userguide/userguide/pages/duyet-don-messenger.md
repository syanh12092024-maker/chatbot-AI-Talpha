# Duyệt, sửa hoặc từ chối đơn Messenger chờ duyệt

> Trang này hướng dẫn sale xử lý một đơn bot đã chốt trong chat Messenger: đọc thẻ đơn ngay dưới tin nhắn, sửa thông tin nếu cần, rồi duyệt (tạo đơn thật trên kho hàng) hoặc từ chối kèm lý do.

**Ai làm được:** Sale · Quản trị.

__Khi nào dùng:__ khi bot đã chốt được đơn trong chat — khách đưa đủ tên, số, địa chỉ và đồng ý trả tiền khi nhận. Đơn Messenger **không** đi qua bước xác nhận WhatsApp: khách đã xác nhận trong chat, nên sale duyệt là đơn vào thẳng kho hàng ở trạng thái «Chờ in».

__Trước khi bắt đầu:__
- **Duyệt là đường tiền.** Duyệt thành công là tạo một đơn COD thật trên kho hàng. Hệ không có nút huỷ đơn; đơn tạo nhầm phải huỷ bằng tay trên kho hàng.
- Đơn chờ duyệt nằm ở hai chỗ trong «Hộp thư» (đường `/ban-hoi-thoai`): tab «Cần bạn» — dòng ghi «Bot chốt đơn — chờ bạn duyệt», nhãn «Đơn chờ duyệt»; và tab «Đơn chờ» — khối «Messenger chờ duyệt» (đơn chờ lâu nhất lên đầu). Đơn chỉ hiện ở team đang mở.
- Nếu khách có tầng hoàn cao, gọi xác nhận với khách trước khi duyệt (thẻ đơn sẽ nhắc).

## Các bước

1. Bấm một dòng «Bot chốt đơn — chờ bạn duyệt» ở tab «Cần bạn» (hoặc bấm tên khách trong khối «Messenger chờ duyệt» ở tab «Đơn chờ»).
   → *Kết quả:* hội thoại của khách mở ra. Dưới tin nhắn cuối có thẻ «Đơn bot chốt · Messenger», nhãn «Chờ duyệt», ba ô «Hàng» (số lượng × sản phẩm) · «Tiền» · «Giao tới» (địa chỉ, thành phố), và ba nút «Duyệt → Chờ in» · «Sửa đơn» · «Từ chối».
2. Đọc các hộp cảnh báo trên thẻ (nếu có):
   - «Khách {tầng hoàn} — hoàn {N}% trên đơn cũ» kèm «Gọi xác nhận trước khi duyệt.» — khách thuộc tầng «Cần theo dõi · hoàn 30–65%» hoặc «Hay hoàn hàng · hoàn ≥65%». Đây chỉ là lời nhắc, hệ không chặn duyệt vì tầng hoàn.
   - «Nghi trùng đơn» kèm lý do — lần kiểm chống trùng gần nhất chưa qua (có thể vì đã thấy đơn trùng, hoặc vì chưa tra được). Duyệt lúc này sẽ bị chặn ở bước chống trùng. Xem [Sự cố đơn: không duyệt được, nghi trùng, van tạo đơn đóng](./su-co-don.md).
   - «Cửa tạo đơn POS đang ĐÓNG trên máy chủ» kèm «Duyệt lúc này sẽ không tạo đơn — đơn vẫn ở «Chờ duyệt». Sửa và từ chối vẫn làm được.» — nút «Duyệt → Chờ in» bị khoá.
3. Bấm «Sửa đơn» để mở form ngay dưới thẻ (hai nút kia cũng mở đúng form này, chỉ khác chỗ con trỏ nhảy tới).
   → *Kết quả:* form ghi «Đơn #{số} · Chờ duyệt · bot chốt {ngày giờ}», các ô «Tên khách» · «Số điện thoại» · «Địa chỉ» · «Thành phố» · «Mã kho POS» · «Sản phẩm» · «Số lượng», một dòng giá, và mục «Kiểm tra gần nhất».
4. Sửa thông tin nếu cần. Chọn đúng «Sản phẩm» (món hết hàng hiện «(hết hàng)» và không chọn được) và «Số lượng».
   → *Kết quả:* dòng giá đổi theo: «Giá cả gói: {giá} {tiền tệ}. Khi duyệt, hệ kiểm lại giá và chống trùng.», hoặc «Không có gói giá cho số lượng này.» nếu page không bán gói đó.
5. Bấm «Lưu thông tin».
   → *Kết quả:* «Đã lưu. Kiểm lại rồi duyệt.» Tổng tiền của đơn được đặt lại đúng bằng giá gói vừa chọn. Mục kiểm tra trở về «Chưa kiểm tra — hệ kiểm lại đủ các cửa khi duyệt.»
6. Đánh dấu ô «Tôi đã kiểm tra thông tin đã lưu» (chú thích: «Duyệt dùng thông tin ĐÃ LƯU và có thể tạo đơn thật trên POS.»), rồi bấm «Duyệt — tạo đơn POS».
   → *Kết quả:* hệ kiểm lại đủ các cửa rồi mới tạo đơn. Qua hết: hộp xanh «Đã tạo đơn trên POS.», nhãn thẻ đổi thành «Đã duyệt», form khoá lại, mục «Tạo đơn POS» trong «Kiểm tra gần nhất» ghi «Đã xử lý». Bị chặn: hộp vàng «Chưa tạo đơn» kèm danh sách cửa chưa qua — đơn vẫn «Chờ duyệt», không có đơn nào được tạo.
7. Muốn từ chối: gõ lý do vào ô «Lý do loại đơn (5–300 ký tự)» rồi bấm «Loại đơn».
   → *Kết quả:* nhãn thẻ đổi thành «Đã loại», form khoá lại, đơn rời hàng chờ. Đơn bị loại vẫn được giữ trên hệ kèm lý do (không bị xoá).

![Thẻ «Đơn bot chốt · Messenger» dưới tin nhắn, với ba nút xử lý](images/duyet-don-messenger.png)

<!-- CHỤP: anh=duyet-don-messenger · vai=sale · duong=/ban-hoi-thoai · cho=«Bot chốt đơn — chờ bạn duyệt»
     thao_tac=bấm «Bot chốt đơn — chờ bạn duyệt»
     trang_thai=hội thoại mở, thẻ «Đơn bot chốt · Messenger» nhãn «Chờ duyệt» nằm dưới tin nhắn, thấy ba ô «Hàng» · «Tiền» · «Giao tới» và ba nút; nếu có, thấy một hộp cảnh báo hoàn hàng. Bản xem thử cần có ít nhất một đơn Messenger đang chờ duyệt
     danh_dau=(1) «Đơn bot chốt · Messenger» · (2) «Giao tới» · (3) «Duyệt → Chờ in» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Đầu thẻ «Đơn bot chốt · Messenger» và nhãn trạng thái | «Chờ duyệt» thì còn xử lý được; «Đã duyệt» / «Đã loại» thì đã xong |
| (2) | Ba ô «Hàng» · «Tiền» · «Giao tới» | Đối chiếu với những gì khách nói trong chat |
| (3) | Ba nút «Duyệt → Chờ in» · «Sửa đơn» · «Từ chối» | Mở form xử lý ngay dưới thẻ |

![Form xử lý đơn — lưu thông tin, đánh dấu đã kiểm tra rồi duyệt](images/duyet-don-messenger-2.png)

<!-- CHỤP: anh=duyet-don-messenger-2 · vai=sale · duong=/ban-hoi-thoai · cho=«Bot chốt đơn — chờ bạn duyệt»
     thao_tac=bấm «Bot chốt đơn — chờ bạn duyệt» · bấm «Duyệt → Chờ in»
     trang_thai=form mở dưới thẻ, con trỏ đang ở ô «Tôi đã kiểm tra thông tin đã lưu»; thấy các ô thông tin khách, dòng «Giá cả gói…», mục «Kiểm tra gần nhất», các nút «Lưu thông tin» · «Duyệt — tạo đơn POS» · «Loại đơn»
     danh_dau=(1) «Lưu thông tin» · (2) «Tôi đã kiểm tra thông tin đã lưu» · (3) «Duyệt — tạo đơn POS» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Nút «Lưu thông tin» | Bấm sau mỗi lần sửa — duyệt chỉ dùng thông tin đã lưu |
| (2) | Ô «Tôi đã kiểm tra thông tin đã lưu» | Bắt buộc đánh dấu trước khi duyệt |
| (3) | Nút «Duyệt — tạo đơn POS» | Hệ kiểm lại rồi tạo đơn thật trên kho hàng ở «Chờ in» |

## Duyệt kiểm những gì

Mỗi lần bấm duyệt, hệ **chạy lại** đủ các cửa — người bấm nhầm cũng không tạo được đơn trùng hay sai tiền. Mục «Kiểm tra gần nhất» trong form hiện kết quả từng cửa («Đạt» · «Chưa đạt» · «Đã xử lý» · «Chưa xử lý», kèm lý do):

| Cửa trên màn | Kiểm gì | Không qua khi |
|---|---|---|
| «Thông tin khách» | Đủ tên, số điện thoại, địa chỉ, số lượng (số nguyên dương), tổng tiền (lớn hơn 0) | Thiếu một trong năm trường |
| «Giá bán» | Tổng tiền khớp **đúng một** gói giá của page (cùng số lượng, cùng tiền tệ) | Page chưa có gói giá; đơn không có tổng tiền; tổng không khớp gói nào; nhiều gói cùng khớp |
| «Chống trùng đơn» | Năm nguồn: bot đã ghi một lần chốt khác trong hội thoại · kho hàng đã có đơn của hội thoại này (đơn chưa huỷ/hoàn) · hội thoại đang ở «Sau bán» · trong chat có câu xác nhận đơn của công cụ ngoài · cùng số điện thoại đã có đơn trong 7 ngày (kiểm chéo cả hai luồng) | Bất kỳ nguồn nào thấy trùng, **hoặc chưa tra được** — chưa tra được cũng tính là chặn |
| «Hàng chờ» | Chính đơn đang chờ | Luôn đạt |
| «Tạo đơn POS» | Kết quả tạo đơn trên kho hàng | Chỉ có sau một lần duyệt thành công |

Nguyên tắc của hệ: thà không tạo còn hơn tạo nhầm. Ý nghĩa từng lý do và cách gỡ: [Sự cố đơn: không duyệt được, nghi trùng, van tạo đơn đóng](./su-co-don.md).

## Lưu ý

- **Lưu trước, duyệt sau.** Sửa xong mà chưa bấm «Lưu thông tin» thì duyệt báo «Bạn đã sửa thông tin — lưu đơn trước khi duyệt.»
- **Đối chiếu tiền:** so ô «Tiền» trên thẻ với dòng «Giá cả gói» trong form trước khi duyệt. Dòng «Giá cả gói» là giá theo đơn vị tiền tệ của gói. <!-- TBD: ô «Tiền» của thẻ đơn và dòng đơn trong tab «Đơn chờ» hiện thẳng tổng tiền đã lưu, chưa chia hệ số tiền tệ như dòng «Giá cả gói» — cần đối chiếu trên dữ liệu thật xem có đang gấp 100 lần không — OQ-SA-1 -->
- **Ô «Mã kho POS»** cần có giá trị thì đơn mới tạo được trên kho hàng. <!-- TBD: sale lấy mã kho ở đâu khi đơn bot chốt để trống ô này — OQ-SA-7 -->
- Thẻ chỉ hiện **đơn chờ duyệt mới nhất** của hội thoại. Nếu bot chốt nhiều lần trong cùng một hội thoại, các đơn cũ hơn vẫn nằm trong khối «Messenger chờ duyệt» nhưng bấm vào chỉ mở lại hội thoại với đơn mới nhất. Nếu đơn mới nhất là bản thừa, từ chối nó rồi mở lại hội thoại — thẻ sẽ hiện đơn chờ kế tiếp; hoặc nhờ quản trị xử lý ở Cài đặt › Vận hành, tab «Đơn chờ duyệt», nút «Xem / xử lý đơn».
- Hai người cùng mở một đơn: người duyệt sau nhận «Đơn đã đổi; tải lại trước khi duyệt». Tải lại trang để thấy trạng thái mới — rất có thể đơn đã được duyệt.
- Khối «Page này bán gì» ở cột phải không liệt kê sản phẩm và giá cho sale; danh sách «Sản phẩm» trong form đơn là chỗ sale thấy được sản phẩm và gói giá của page.
- Đơn từ trang bán hàng (Ladi) không duyệt ở đây — xem [Các loại đơn ở tab Đơn chờ và cách xử lý ngoài hệ](./cac-loai-don-cho.md).

## Xử lý khi lỗi

| Câu trên màn | Nghĩa | Làm gì |
|---|---|---|
| «Đánh dấu «Tôi đã kiểm tra thông tin đã lưu» trước khi duyệt.» | Chưa đánh dấu ô xác nhận | Đánh dấu rồi bấm lại |
| «Bạn đã sửa thông tin — lưu đơn trước khi duyệt.» | Có thay đổi chưa lưu | Bấm «Lưu thông tin» trước |
| «Chưa tạo đơn» + danh sách cửa | Một cửa kiểm chưa qua | Tra lý do ở [Sự cố đơn](./su-co-don.md) |
| «Không có gói giá hợp lệ cho sản phẩm / số lượng này» (khi lưu) | Món hết hàng, hoặc page không bán gói số lượng đó | Chọn món / số lượng khác; nếu đúng là thiếu gói thì báo quản trị sửa bảng giá |
| «Đơn đã đổi hoặc đã xử lý; tải lại» (khi lưu) · «Đơn đã đổi; tải lại trước khi duyệt» | Người khác vừa sửa hoặc xử lý đơn | Tải lại trang, mở lại hội thoại |
| «Lý do loại đơn cần ít nhất 5 ký tự.» · «Lý do cần 5–300 ký tự» | Lý do quá ngắn hoặc quá dài | Sửa lý do |
| «Không mở được đơn» | Không đọc được đơn (đơn không thuộc team, hoặc máy chủ chưa nối dữ liệu) | Kiểm chip team; báo quản trị nếu lặp lại |
| Câu lỗi đỏ có chữ «cửa TẠO ĐƠN POS ĐÓNG» | Cửa tạo đơn trên máy chủ đang đóng | Không duyệt lúc này; báo quản trị — xem [Sự cố đơn](./su-co-don.md) |

__Liên quan:__ [Sự cố đơn: không duyệt được, nghi trùng, van tạo đơn đóng](./su-co-don.md) · [Các loại đơn ở tab Đơn chờ và cách xử lý ngoài hệ](./cac-loai-don-cho.md) · [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md) · [Tìm khách theo số điện thoại và xem mọi đơn của khách](./tim-khach.md)
