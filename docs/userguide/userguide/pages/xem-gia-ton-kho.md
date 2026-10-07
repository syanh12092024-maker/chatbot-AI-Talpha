# Xem giá và tồn kho theo thị trường

> Trang này giúp marketer đọc bảng giá bot đang báo cho khách và tình trạng còn hàng của một sản phẩm ở từng thị trường, ở tab «Theo thị trường» của màn «Sản phẩm & kho».

**Ai làm được:** Marketer (chỉ xem) · Quản trị (xem và sửa giá — xem [Sửa bảng giá của sản phẩm ở một thị trường](./sua-bang-gia.md)).

__Khi nào dùng:__ trước khi viết câu báo giá trong lời bot; khi khách phàn nàn bot báo sai giá; khi nghi một món đã hết hàng mà bot vẫn chào; khi hai page cùng sản phẩm báo hai giá khác nhau.

__Trước khi bắt đầu:__
- Bạn chỉ mở được sản phẩm mình phụ trách (xem [Tìm sản phẩm bạn phụ trách và đọc bốn tầng](./tim-san-pham-phu-trach.md)).
- **Một cửa hàng của kho hàng = một thị trường.** Mã món ở mỗi cửa hàng khác nhau nhưng là cùng một sản phẩm.
- Với marketer, mọi ô trong bảng giá đều khoá; không có nút «+ Thêm bậc», «Lưu giá», «Gỡ» hay «+ Thêm thị trường…». Muốn đổi giá: báo Quản trị.

## Các bước

1. Mở **Sản phẩm → Sản phẩm & kho**, bấm sản phẩm ở cột trái.
   → *Kết quả:* sản phẩm mở ở tab «Chung».
2. Bấm tab «Theo thị trường».
   → *Kết quả:* hàng nút thị trường, mỗi nút ghi tên thị trường (hoặc «Shop …» khi cửa hàng chưa đặt tên thị trường), kèm tiền tệ nếu có; dòng nhắc «1 shop POS = 1 thị trường. Mã món ở mỗi shop khác nhau nhưng là CÙNG một sản phẩm.». Thị trường đầu tiên mở sẵn.
3. Bấm nút của thị trường bạn cần.
   → *Kết quả:* khung thị trường hiện:
   - «Shop POS»: mã cửa hàng (hoặc thêm «shop chưa khai ở Kết nối» nếu cửa hàng chưa đặt tên thị trường).
   - «Món POS»: mã và tên món, số tồn («tồn …» hoặc «tồn chưa có nguồn»), nhãn «Hết hàng» nếu kho hàng báo hết.
   - «Marketer»: người phụ trách sản phẩm.
   - Bên phải: «Page bán ở đây» và danh sách page — bấm tên page để sang trang của page đó.
4. Cuộn tới mục «Giá ở …» (tên thị trường).
   → *Kết quả:* bảng bậc giá với các cột «Tên bậc», «Số lượng», «Giá», «Tiền tệ», «Giá gốc», «Khuyến mãi», «Phí ship», «Miễn ship», «Bật». Dòng giải thích: «Bot báo giá và máy tính tiền đơn từ CHÍNH bảng này cho mọi page gắn vào sản phẩm ở …».
5. Nếu có, đọc tiếp mục «Giá riêng của page (bản sao cũ)».
   → *Kết quả:* bảng «Bậc» · «Số lượng» · «Giá» · «Dùng ở» (… page). Đây là giá của những page **chưa gắn** vào sản phẩm — chúng vẫn bán theo bản sao riêng của chính page.

![Tab «Theo thị trường» của một sản phẩm — món và tồn kho, bảng «Giá ở …» và bảng giá riêng của page](images/xem-gia-ton-kho.png)

<!-- CHỤP: anh=xem-gia-ton-kho · vai=marketer · duong=/san-pham · cho=«Theo thị trường»
     thao_tac=bấm «Theo thị trường»
     trang_thai=sản phẩm có ít nhất một thị trường, bảng giá có ít nhất hai bậc (ô khoá), có mục «Giá riêng của page (bản sao cũ)» nếu dữ liệu có
     danh_dau=(1) «Món POS» · (2) «Giá ở» · (3) «Giá riêng của page (bản sao cũ)» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Dòng «Món POS» | Đọc mã món, số tồn và nhãn «Hết hàng» |
| (2) | Bảng «Giá ở …» | Đọc giá bot báo cho page đã gắn vào sản phẩm ở thị trường này |
| (3) | Bảng «Giá riêng của page (bản sao cũ)» | Đọc giá của page chưa gắn — có thể khác bảng trên |

## Đọc bảng giá

| Cột | Nghĩa |
|---|---|
| «Tên bậc» | Chữ bậc giá khách đọc, ví dụ «Buy 1 Get 1». Trống thì bot tự gọi theo số lượng |
| «Số lượng» · «Giá» · «Tiền tệ» | Mua bao nhiêu món thì trả bao nhiêu, bằng đồng tiền nào |
| «Giá gốc» · «Khuyến mãi» | Giá trước giảm và chữ ưu đãi kèm bậc |
| «Phí ship» · «Miễn ship» | Phí giao hàng; «miễn» · «không miễn» · «chưa khai» |
| «Bật» | Bậc đang tắt thì bot không chào |

## Hết hàng và tồn kho

- Nhãn «Hết hàng» và số tồn theo **kho hàng**, cập nhật mỗi lần kéo danh mục. Bạn không gạt được ở đây.
- «tồn chưa có nguồn» nghĩa là hệ chưa có số tồn của món đó — **không phải 0**, cũng không có nghĩa là còn hàng.
- Khi máy chủ đã bật cách ghép lời mới, món mang nhãn hết hàng được ghi chú «hết hàng» ngay trong phần sản phẩm AI đọc.

## Lệch giá giữa các page

- Hộp «Cùng số lượng mà khác giá giữa các page» xuất hiện dưới bảng giá riêng khi hai page chưa gắn cùng bán một số lượng với hai giá. Bot báo giá theo **page khách đang nhắn**.
- Ở trang của từng page, tab «Sản phẩm & giá» có thể hiện hộp đỏ «Bot đang báo cho khách … giá KHÔNG có trong bảng giá»: giá đó gõ tay trong lời bot. Khách nghe giá gõ tay, còn đơn tính theo bảng giá. Việc này marketer sửa được ở tab «Lời bot» (xem [Viết và lưu lời bot cho một page](./viet-loi-bot.md)).
- Page đã gắn sản phẩm: tab «Sản phẩm & giá» của page ghi «Chỉ xem — giá và ảnh của page này sửa ở màn Sản phẩm» và có nút sang đúng tab này.

## Khi màn trống

| Màn ghi | Nghĩa |
|---|---|
| «Chưa gắn thị trường nào» | Sản phẩm chưa có món nào của cửa hàng nào — Quản trị thêm (xem [Thêm hoặc gỡ một thị trường cho sản phẩm](./them-thi-truong.md)) |
| «Chưa có bậc giá — page gắn vào sản phẩm ở thị trường này chưa báo giá được.» | Thị trường có món nhưng chưa có giá: bot không chào giá được ở page đã gắn. Báo Quản trị |
| «Chưa page nào bán món của shop này.» | Chưa page nào gắn vào sản phẩm ở thị trường này |

__Liên quan:__ [Sửa bảng giá của sản phẩm ở một thị trường](./sua-bang-gia.md) · [Sự cố bot: không trả lời, sai giá, page không bật được](./su-co-bot.md) · [Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md)
