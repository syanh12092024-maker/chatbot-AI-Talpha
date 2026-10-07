# Lọc danh sách page và bật bot hàng loạt

> Trang này hướng dẫn người quản trị dùng màn «Tất cả page» để lọc ra đúng nhóm page cần xử lý, quét page mới từ Pancake, và bật bot hoặc gắn sản phẩm cho nhiều page trong một lượt.

**Ai làm được:** Quản trị. Marketer và Sale không mở được màn này (marketer xem page ở **Page → Các page**).

__Khi nào dùng:__ cần tìm page còn chặn, page chưa có marketer, page chưa có lời bot; mở bot cho một đợt page thử; vừa thêm tài khoản Pancake và cần kéo page mới về.

__Trước khi bắt đầu:__
- Bật bot là để bot **tự trả lời khách thật**. Đọc trước [Bật hoặc tắt bot cho một page](./bat-tat-bot.md) để biết cổng bật kiểm gì.
- Chỉ page **đủ điều kiện** mới bật được — xem [Điều kiện «Bật được chưa» và cột «Còn thiếu»](./tra-cuu-bat-duoc-chua.md).

## Lọc và tìm

1. Mở **Page → Tất cả page** (đường dẫn `/page-bot`).
   → *Kết quả:* hàng viên lọc nhanh ở đầu, mỗi viên kèm số page; dưới là ô tìm, số đếm và bảng page (50 page một trang, nút «Trước» / «Sau» khi nhiều trang).
2. Bấm một viên lọc.
   → *Kết quả:* bảng chỉ còn page thuộc nhóm đó; số đếm đổi thành «…/… page khớp».
3. Gõ vào ô «Tên page, mã page Facebook, thị trường, marketer…».
   → *Kết quả:* bảng lọc tiếp theo từ khoá sau khoảng một phần tư giây. Bộ lọc, từ khoá và số trang nằm trong đường dẫn — gửi cho đồng nghiệp hay tải lại trang đều giữ nguyên.

| Viên lọc nhanh | Page nào |
|---|---|
| «Tất cả» | Mọi page của team |
| «Bot đang BẬT» · «Bot đang tắt» | Theo công tắc bot |
| «Chưa có marketer» · «Đã có marketer» | Theo cột «Marketer» của page |
| «Page trọng điểm» | Page được đánh dấu ở cột «Trọng điểm» |
| «Mất dấu» | Page mang nhãn «Mất dấu» dưới tên |
| «Còn điều kiện chặn» | Ô «Còn thiếu gì» đang đỏ |
| «Đủ điều kiện» | Không còn điều kiện chặn và không còn việc nên làm |
| «Chưa có lời bot riêng» | Page chưa có bản lời bot nào đang chạy (bản nháp không tính) |

Viên hiện «—» thay cho số nghĩa là **chưa đo được**, không phải 0.

## Đọc bảng

Cột: ô chọn · «Page» (tên, mã page Facebook) · «Thị trường · ngành hàng» (gõ sửa tại chỗ, lưu khi rời ô hoặc bấm Enter) · «Marketer» (chỉ xem — marketer lấy từ sản phẩm page bán) · «Bot» (công tắc «Đang chạy» / «Tắt») · «Còn thiếu gì» · «Sản phẩm gốc» · «Trọng điểm» · «Botcake». Bấm tên page để mở trang của page; trang đó có lối «← Tất cả page» về đúng bộ lọc bạn đang đứng.

Cột «Botcake» là **lời khai**, không phải công tắc: đánh dấu ở đây KHÔNG tắt Botcake — Botcake tắt bằng tay trong giao diện Botcake.

## Quét page mới từ Pancake

1. Bấm «Quét Pancake tìm page mới» ở hàng ô tìm.
   → *Kết quả:* hệ hỏi Pancake bằng các tài khoản Pancake đang có (không hỏi lại — lượt quét chỉ thêm page và cập nhật tên, không xoá, không đụng công tắc). Xong hiện «Quét xong: … page · … mới · … cập nhật», kèm «… page trong CSDL không thấy ở lượt này» nếu có.
2. Nếu hiện «Quét xong nhưng không thấy page nào»: đọc câu đi kèm.
   → *Kết quả:* «Tiến trình này KHÔNG thấy token Pancake nào…» — thêm tài khoản ở **Cài đặt → Kết nối** (xem [Kết nối tài khoản Pancake](./ket-noi-pancake.md)); «Có … token nhưng không token nào trả về page…» — tài khoản hết hạn hoặc mất quyền, danh mục page giữ nguyên.

Page mới quét về chưa thuộc team nào; người quản trị gán page cho team ở **Cài đặt → Người và team**.

## Các bước — bật bot hàng loạt

1. Lọc ra nhóm page cần bật (thường là «Đủ điều kiện» — nhưng cổng bật còn kiểm thêm điều kiện riêng lúc bấm, xem [Điều kiện «Bật được chưa» và cột «Còn thiếu»](./tra-cuu-bat-duoc-chua.md)), rồi đánh dấu ô chọn đầu từng dòng — hoặc ô ở đầu cột để chọn mọi page của trang đang xem.
   → *Kết quả:* thanh «Đã chọn … page» hiện trên bảng. Đổi bộ lọc hoặc sang trang khác thì page không còn hiện bị bỏ chọn — thao tác hàng loạt không chạm page bạn không nhìn thấy.
2. Bấm «Bật bot (tối đa 10 · có xác nhận)».
   → *Kết quả:* hộp «Bật bot cho … page?» liệt kê tên từng page: «Bot sẽ bắt đầu tự trả lời KHÁCH THẬT của: …». Chỉ page đang tắt được đưa vào lượt.
3. Bấm «Bật bot … page».
   → *Kết quả:* hệ bật **lần lượt từng page**, mỗi page qua đúng cổng bật và ghi nhật ký như bấm tay. Xong cả lượt hiện «Đã bật bot cho …/… page.»
4. Nếu lượt dừng giữa chừng: đọc hộp lỗi «Dừng bật bot ở «…»».
   → *Kết quả:* hộp ghi lý do của page hỏng, «đã xong …/…: …» và «Các page sau chưa đổi.» Sửa điều kiện của page đó rồi chọn lại phần còn lại.

![Màn «Tất cả page» — hàng viên lọc nhanh, ba page đã chọn và thanh thao tác hàng loạt](images/loc-page-bat-bot-hang-loat.png)

<!-- CHỤP: anh=loc-page-bat-bot-hang-loat · vai=quan-tri · duong=/page-bot?loc=san_sang · cho=«Đủ điều kiện»
     thao_tac=đánh dấu ô chọn ở ba dòng đầu bảng
     trang_thai=viên «Đủ điều kiện» đang chọn, thanh «Đã chọn 3 page» hiện với ô chọn sản phẩm, nút «Gắn vào sản phẩm» và nút «Bật bot (tối đa 10 · có xác nhận)»
     danh_dau=(1) «Đủ điều kiện» · (2) «Đã chọn» · (3) «Bật bot (tối đa 10 · có xác nhận)» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Viên «Đủ điều kiện» trong hàng viên lọc nhanh | Một chạm để lọc; số trên viên là số page của nhóm |
| (2) | Thanh «Đã chọn … page» | Thao tác cho các page đã đánh dấu |
| (3) | Nút «Bật bot (tối đa 10 · có xác nhận)» | Bật lần lượt, có hộp xác nhận liệt kê tên |

## Giới hạn và vì sao nút bị khoá

| Dòng cạnh nút | Nghĩa |
|---|---|
| «Tối đa 10 page một lượt — bỏ bớt chọn» | Đã chọn quá 10 page |
| «Các page đã chọn đều đang bật» | Không còn page nào để bật |
| «Cần vai Quản trị để bật bot» | Vai của bạn chỉ xem |
| «Công tắc bot đang bị khoá tay trên máy chủ này …» | Máy chủ bị khoá công tắc (lúc sự cố hoặc máy demo) — nhờ người quản trị hệ thống mở khoá. Hàng ô tìm cũng hiện dòng nhỏ «Công tắc bot đang khoá» |

**Trần của máy chủ: 5 page trong 10 phút.** Ngoài giới hạn 10 page một lượt của màn, máy chủ chỉ cho bật thêm tối đa 5 page trong mỗi 10 phút (đếm chung mọi lượt bật trên máy chủ, không riêng bạn). Lượt hàng loạt vượt trần sẽ dừng ở page thứ sáu với câu «Đã bật 5 page trong 10 phút — dừng ở đây. Bật thêm được sau … phút nữa.» — trần này để một cú bấm nhầm không kéo cả trăm page lên cùng lúc; nên đọc vài hội thoại của đợt vừa bật trước khi bật tiếp. Tắt bot không bao giờ bị trần chặn. Gạt lại một page đang bật không tốn lượt.

## Gắn nhiều page vào một sản phẩm

1. Chọn page, chọn sản phẩm ở ô «— chọn sản phẩm —» trên thanh, bấm «Gắn vào sản phẩm».
   → *Kết quả:* hộp «Gắn … page vào «…»?» liệt kê tên page và ghi «Page nhận kịch bản tầng sản phẩm của «…».» Bấm «Gắn» để chạy lần lượt; lỗi đầu tiên làm dừng lượt như khi bật bot.
2. Quên chọn sản phẩm thì hiện «Chưa chọn sản phẩm» — «Chọn sản phẩm ở ô bên cạnh rồi bấm «Gắn vào sản phẩm».»

Lối này **chỉ ghi sản phẩm** cho page — không ghi thị trường, không ghi marketer. Page chưa có cửa hàng thì gắn xong bot vẫn chưa có món để bán. Muốn ghi đủ sản phẩm · thị trường · marketer, gắn ở tab «Page đang bán» của sản phẩm (xem [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md)). Ô chọn sản phẩm chỉ hiện khi team đã có sản phẩm.

## Trạng thái trống và lỗi

| Màn ghi | Nghĩa |
|---|---|
| «Team này chưa được chia page nào — nên màn này không có gì để cấu hình.» + «Sang màn Cấu hình team» | Team chưa có page — gán page cho team trước |
| «Không page nào khớp "…".» | Từ khoá không trúng page nào |
| «Mọi page đều đã có marketer.» | Viên «Chưa có marketer» trống — tin tốt |
| «Không page nào ở nhóm "…".» | Nhóm đang lọc không có page |
| «Chưa đọc được điều kiện sẵn sàng» | Cột «Còn thiếu gì» đang không biết cho mọi page — không có nghĩa page nào cũng ổn |
| «Chưa đọc được kịch bản của các page» | Viên «Chưa có lời bot riêng» không đo được |
| «Không tải được danh sách page» · «Không tải được danh sách» | Kiểm kết nối rồi tải lại trang |

## Liên quan

[Bật hoặc tắt bot cho một page](./bat-tat-bot.md) · [Điều kiện «Bật được chưa» và cột «Còn thiếu»](./tra-cuu-bat-duoc-chua.md) · [Kiểm tra page đã sẵn sàng bật bot chưa](./kiem-tra-bat-duoc-chua.md) · [Chuyển page sang team khác](./chuyen-page-sang-team.md) · [Sự cố bot: không trả lời, sai giá, page không bật được](./su-co-bot.md)
