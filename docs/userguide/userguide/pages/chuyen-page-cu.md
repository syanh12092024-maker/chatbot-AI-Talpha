# Chuyển page cũ sang sản phẩm

> Trang này hướng dẫn người quản trị đi hết danh sách page còn bán theo «bản sao» riêng (giá, ảnh lưu riêng từng page) và chuyển từng page sang một sản phẩm của team — hoặc ghi rõ page nào không chuyển.

**Ai làm được:** Quản trị. Vai khác mở đường dẫn `/san-pham?xem=chuyen` chỉ thấy «Chưa đọc được việc chuyển page» kèm câu «Chỉ quản trị chuyển page sang sản phẩm.»

__Khi nào dùng:__ cột trái màn Sản phẩm hiện ô lưu ý «… page chưa chuyển xong sang sản phẩm.»; team đang gom giá về một nơi theo quyết định ngày 02/10/2026 «page phải gắn sản phẩm». Danh sách này là công cụ tạm cho đợt chuyển — chuyển xong thì nó trống.

__Trước khi bắt đầu:__
- Hiểu hai bước: **gắn** page vào sản phẩm trước, rồi **đối soát** giá và ảnh của bản sao. Màn ghi: «Gắn page trước, sau đó đối soát giá và ảnh. Gắn vào món đã có giá vẫn cần đối soát bản sao của page.»
- Danh mục kho hàng của các cửa hàng đã được kéo về; sản phẩm cần dùng đã có, hoặc món mang SKU sẵn để gộp ngay trong lượt (xem [Gộp món POS thành một sản phẩm theo SKU](./gop-mon-pos.md)).
- Một page bán một sản phẩm ở một thị trường. Page có hai bản sao (hai mặt hàng) chỉ gắn được một sản phẩm.

## Mở danh sách

1. Mở **Sản phẩm → Sản phẩm & kho**, bấm «Chuyển page sang sản phẩm →» trong ô lưu ý ở cột trái.
   → *Kết quả:* bên phải mở «Chuyển page sang sản phẩm», đường dẫn thành `/san-pham?xem=chuyen`. Ô lưu ý chỉ hiện khi còn page chưa xong; khi bộ đếm về 0 thì ô biến mất.
2. Đọc hàng số: «Chưa gắn» · «Chờ đối soát» · «Không chuyển» · «Tổng chưa xong».
   → *Kết quả:* «Tổng chưa xong» = «Chưa gắn» + «Chờ đối soát». Page ghi «Không chuyển» được tính là đã quyết. Page đã đối soát xong không còn trong danh sách.
3. Chọn ô «Trạng thái» («Tất cả» · «Chưa gắn» · «Chờ đối soát» · «Không chuyển») để lọc.
   → *Kết quả:* lựa chọn lọc đi theo đường dẫn, tải lại trang không mất.

## Đọc một thẻ page

Mỗi thẻ có: tên page, mã page và trạng thái; dòng «Shop: …» (hoặc «Chưa có shop»); từng bản sao của page — ảnh đầu, tên (hoặc «Bản sao chưa có tên»), số ảnh, và các bậc giá dạng «số lượng: giá tiền tệ» kèm «(tắt)», khuyến mãi, ship, miễn ship (hoặc «Chưa có bậc giá»).

## Các bước — chuyển một page «Chưa gắn»

1. Ở ô «Shop POS của page», kiểm hoặc chọn cửa hàng page bán.
   → *Kết quả:* page đã có cửa hàng thì ô chọn sẵn. Page «Chưa có shop» phải chọn tay — và page chưa có cửa hàng thì không có gợi ý ở bước sau.
2. Ở ô «Gợi ý theo tên page», chọn một trong tối đa ba món máy gợi ý (dạng «tên món · mã · …%»).
   → *Kết quả:* phần trăm là độ khớp giữa tên page và tên món (đã bỏ tên nước, không phân biệt hoa thường). Không có món nào khớp thì không có ô này. Nút chính đổi chữ theo loại gợi ý (bảng dưới).
3. Hoặc, nếu không gợi ý nào đúng: chọn sản phẩm ở ô «Hoặc chọn sản phẩm của team».
   → *Kết quả:* nút chính thành «Gắn vào «…»».
4. Nếu nút chính là «Gộp SKU … thành sản phẩm rồi gắn»: kiểm ô «Tên sản phẩm mới» và «Mã gốc (khóa kịch bản, đặt rồi không sửa)».
   → *Kết quả:* hai ô điền sẵn từ tên món; mã gốc không sửa được sau khi tạo.
5. Đọc dòng «Marketer page: … → …».
   → *Kết quả:* mũi tên nghĩa là page sẽ nhận marketer của sản phẩm khi gắn.
6. Bấm nút chính.
   → *Kết quả:* thẻ khoá trong lúc chạy. Xong, page rời nhóm «Chưa gắn», sang «Chờ đối soát» với dòng «Đã gắn «…» · chờ đối soát giá + ảnh.» Làm tiếp [Đối soát giá và ảnh của page cũ trước khi chuyển](./doi-soat-gia-anh.md).

| Chữ trên nút chính | Khi nào | Bấm là |
|---|---|---|
| «Gắn vào «…»» | Món gợi ý đã thuộc một sản phẩm, hoặc bạn chọn sản phẩm ở ô thứ ba | Gắn page vào sản phẩm đó ở cửa hàng đã chọn |
| «Nối món vào «…» rồi gắn» | SKU của món đã là một sản phẩm nhưng món của cửa hàng này chưa nối vào | Nối món vào sản phẩm (thêm thị trường), rồi gắn page |
| «Gộp SKU … thành sản phẩm rồi gắn» | SKU của món chưa là sản phẩm nào | Gộp mọi món chưa thuộc sản phẩm mang SKU đó thành sản phẩm mới (chưa có marketer), rồi gắn page |
| «Gắn page» | Chưa chọn gợi ý hay sản phẩm | Báo «Chọn sản phẩm hoặc một gợi ý phù hợp.» |
| «Gắn lại vào «…»» | Lượt trước đã nối món hoặc tạo sản phẩm xong nhưng bước gắn hỏng | Chỉ chạy lại bước gắn |

Nút «Gộp món POS →» trên thẻ mở khung gộp đầy đủ khi bạn cần soát nhóm kỹ hơn.

![Danh sách «Chuyển page sang sản phẩm» — thẻ một page «Chưa gắn» với gợi ý món và nút chính](images/chuyen-page-cu.png)

<!-- CHỤP: anh=chuyen-page-cu · vai=quan-tri · duong=/san-pham?xem=chuyen&trangThai=chua_gan · cho=«Chuyển page sang sản phẩm»
     thao_tac=
     trang_thai=hàng số bốn ô ở đầu, thẻ page đầu tiên ở trạng thái «Chưa gắn» có ô «Shop POS của page» đã chọn, ô «Gợi ý theo tên page» có ít nhất một gợi ý, thấy nút chính và nút «Không chuyển»
     danh_dau=(1) «Tổng chưa xong» · (2) «Gợi ý theo tên page» · (3) «Không chuyển» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô số «Tổng chưa xong» | Số page còn phải gắn hoặc đối soát — đích là 0 |
| (2) | Ô «Gợi ý theo tên page» | Chọn món khớp; không đúng thì chọn ở «Hoặc chọn sản phẩm của team» |
| (3) | Nút «Không chuyển» | Dùng cho page chết / thôi bán, kèm lý do |

## Các bước — ghi «Không chuyển»

1. Gõ lý do vào ô «Lý do không chuyển» (gợi ý sẵn «Page thôi bán…», tối đa 500 ký tự).
   → *Kết quả:* để trống mà bấm thì màn báo «Cho biết lý do không chuyển.»
2. Bấm «Không chuyển».
   → *Kết quả:* page sang nhóm «Không chuyển», thẻ hiện lý do và nút «Bỏ quyết định». Lượt này ghi nhật ký kèm lý do.
3. Đổi ý: bấm «Bỏ quyết định» trên thẻ.
   → *Kết quả:* page quay về «Chưa gắn».

## Xử lý khi lỗi

Câu lỗi hiện ở cuối thẻ; các lựa chọn của thẻ được giữ.

| Câu trên màn | Nghĩa | Cách xử lý |
|---|---|---|
| «Chọn shop POS của page trước khi gắn.» | Ô cửa hàng trống | Chọn cửa hàng |
| «Chọn sản phẩm hoặc một gợi ý phù hợp.» | Chưa chọn gì | Chọn gợi ý hoặc sản phẩm |
| «Gợi ý đã thay đổi; mở Gộp món POS để kiểm tra lại.» | Món gợi ý vừa được gộp ở nơi khác | Bấm «Gộp món POS →» soát lại, hoặc chọn sản phẩm ở ô thứ ba |
| «Món đã nối vào sản phẩm, chưa gắn page.» · «Sản phẩm đã tạo, chưa gắn page.» (kèm một câu lỗi) | Nửa đầu đã xong, bước gắn hỏng | Đọc câu lỗi đi kèm, sửa rồi bấm «Gắn lại vào «…»» |
| «sản phẩm chưa bán ở shop … — thêm thị trường trước (tab «Theo thị trường»)» | Cửa hàng đã chọn không phải thị trường của sản phẩm | Chọn đúng cửa hàng, hoặc thêm thị trường cho sản phẩm |
| «món chưa có SKU: …» | Gộp không được vì món chưa có SKU | Kéo lại danh mục ở **Cài đặt → Kết nối** |
| «page đang gắn sản phẩm «…» — gỡ gắn trước rồi mới «không chuyển»» | Page đã gắn sản phẩm | Gỡ page ở tab «Page đang bán» của sản phẩm trước |
| «page này chưa ghi «không chuyển»» | Quyết định đã bị bỏ ở lượt khác | Tải lại danh sách |
| «Chưa đọc được việc chuyển: …» (ô lưu ý cột trái) · «Chưa đọc được việc chuyển page» | Máy chủ không trả được danh sách | Bấm «Thử lại →» / «Thử lại»; còn lỗi thì báo người quản trị hệ thống |

## Lưu ý

- Danh sách chỉ hiện page **có bản sao**. Page chưa từng có bản sao không nằm ở đây — gắn chúng ở tab «Page đang bán» của sản phẩm (xem [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md)).
- Sau khi gắn, page dùng giá của món ở thị trường đó. Món chưa có giá thì page chưa báo giá được cho tới khi đối soát (chép bảng giá bản sao lên món) hoặc đặt giá ở «Theo thị trường» — nên làm đối soát ngay sau khi gắn.
- Bản sao không bị xoá hay sửa khi chuyển; nó chỉ được đánh dấu đã quyết.
- Gắn lại một page đã xong sang sản phẩm hoặc thị trường khác thì quyết định cũ hết hiệu lực — page quay lại «Chờ đối soát».
- Đường dẫn có `trangThai=…` giữ bộ lọc khi gửi cho đồng nghiệp.

## Liên quan

[Đối soát giá và ảnh của page cũ trước khi chuyển](./doi-soat-gia-anh.md) · [Gộp món POS thành một sản phẩm theo SKU](./gop-mon-pos.md) · [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) · [Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md)
