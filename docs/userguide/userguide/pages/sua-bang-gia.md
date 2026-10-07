# Sửa bảng giá của sản phẩm ở một thị trường

> Trang này hướng dẫn người quản trị đặt hoặc sửa các bậc giá của một sản phẩm ở một nước — bảng giá mà bot đọc để báo giá và máy dùng để tính tiền đơn cho mọi page gắn vào sản phẩm ở nước đó.

**Ai làm được:** Quản trị. Marketer thấy bảng giá của sản phẩm mình phụ trách nhưng mọi ô đều khoá, không có nút «Lưu giá».

__Khi nào dùng:__ vừa thêm thị trường mới và chưa có giá; đổi giá, thêm combo, thêm khuyến mãi hoặc phí ship; tắt tạm một bậc giá; khối «Bật được chưa» của page báo thiếu giá.

__Trước khi bắt đầu:__
- **Một nguồn giá.** Giá ở mỗi thị trường là bậc giá của chính món thuộc cửa hàng nước đó. Bot báo giá và máy tính tiền đơn cùng đọc một bảng này, cho mọi page đã gắn vào sản phẩm ở thị trường đó.
- **Không có giá riêng theo page.** Hai page cùng sản phẩm, cùng thị trường thì chung một bảng giá. Muốn đổi giá cho một page là đổi cho tất cả page cùng thị trường.
- Sản phẩm đã có thị trường cần sửa (xem [Thêm hoặc gỡ một thị trường cho sản phẩm](./them-thi-truong.md)).

## Các bước

1. Mở **Sản phẩm → Sản phẩm & kho**, bấm tên sản phẩm, rồi bấm tab «Theo thị trường».
   → *Kết quả:* hàng viên thị trường hiện ra, thị trường đầu tiên đang mở.
2. Bấm viên của thị trường cần sửa.
   → *Kết quả:* dưới thẻ cửa hàng là mục «Giá ở …» kèm câu «Bot báo giá và máy tính tiền đơn từ CHÍNH bảng này cho mọi page gắn vào sản phẩm ở …». Thị trường có hai món trở lên thì mỗi món một bảng, tên món đứng trên bảng.
3. Sửa trực tiếp trên các ô của bảng: «Tên bậc» · «Số lượng» · «Giá» · «Tiền tệ» · «Giá gốc» · «Khuyến mãi» · «Phí ship» · «Miễn ship» · «Bật».
   → *Kết quả:* chưa có gì được lưu cho tới khi bấm «Lưu giá».
4. Để thêm bậc, bấm «+ Thêm bậc»; để bỏ bậc, bấm «Bỏ» ở cuối dòng.
   → *Kết quả:* bậc mới mang sẵn số lượng kế tiếp và tiền tệ của bậc trên; các ô ship, ưu đãi để trống («chưa khai») — hệ cố ý không chép từ bậc trước.
5. Bấm «Lưu giá» dưới bảng của món vừa sửa.
   → *Kết quả:* dòng nhắc cạnh nút báo «Đã lưu … bậc giá · đẩy bản chép sang … page.» Lượt lưu đã tới bot ngay; nếu bước đẩy sang bot hỏng thì cả lượt lưu không thành và màn báo lỗi — không có cảnh «đã lưu» mà bot vẫn nói giá cũ.

![Tab «Theo thị trường» — bảng «Giá ở …» của một món, đang thêm bậc](images/sua-bang-gia.png)

<!-- CHỤP: anh=sua-bang-gia · vai=quan-tri · duong=/san-pham · cho=«Theo thị trường»
     thao_tac=bấm «Theo thị trường» · cuộn tới «Giá ở»
     trang_thai=thị trường đầu tiên đang mở, bảng giá có ít nhất hai bậc với ô sửa được, thấy hai nút «+ Thêm bậc» và «Lưu giá»
     danh_dau=(1) «Giá ở» · (2) «+ Thêm bậc» · (3) «Lưu giá» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Mục «Giá ở …» | Bảng giá của thị trường đang chọn — dùng chung cho mọi page gắn vào sản phẩm ở đây |
| (2) | Nút «+ Thêm bậc» | Thêm một dòng bậc giá |
| (3) | Nút «Lưu giá» | Lưu và đẩy sang bot trong cùng một lượt |

## Ý nghĩa từng ô

| Ô | Nghĩa |
|---|---|
| «Tên bậc» | Chữ khách đọc cho bậc này (ví dụ tên combo) |
| «Số lượng» | Số lượng của bậc — mỗi bậc một số lượng, không trùng nhau, từ 1 tới 10.000 |
| «Giá» | Giá cả gói, phải lớn hơn 0, nhập theo đơn vị tiền thường dùng (ví dụ 99 SAR) |
| «Tiền tệ» | Một trong: AED · SAR · QAR · USD · KWD · OMR · BHD (gõ chữ thường cũng được, hệ tự viết hoa). Hệ không đối chiếu tiền tệ với nước của thị trường ở bước này — nhập đúng tiền của nước đó |
| «Giá gốc» · «Khuyến mãi» · «Phí ship» | Ưu đãi và phí giao, để trống nếu không có |
| «Miễn ship» | «chưa khai» · «miễn» · «không miễn» — «chưa khai» khác «không miễn», hệ không tự đoán |
| «Bật» | Bỏ dấu là tắt bậc: bot không chào bậc đã tắt, nhưng bậc vẫn được giữ trong bảng |

Một món tối đa 30 bậc giá; tên bậc tối đa 160 ký tự.

## Giá tay và kho hàng

Lưu ở đây chỉ đổi giá. Từ lúc bạn lưu, lượt kéo danh mục từ kho hàng **không đè giá** nữa, nhưng **tên món và trạng thái hết hàng vẫn theo kho hàng** — món hết hàng ở kho thì bot vẫn biết là hết.

## Lệch giá giữa các page (bảng «Giá riêng của page (bản sao cũ)»)

Dưới bảng giá có thể có mục «Giá riêng của page (bản sao cũ)» — chỉ xem, liệt kê bậc giá mà các page **chưa gắn** vào sản phẩm đang dùng (cột «Dùng ở … page»). Màn ghi: «Page CHƯA gắn vào sản phẩm vẫn bán theo bản sao của chính nó — gắn page ở tab «Page đang bán» để dùng giá ở trên.»

Hộp cảnh báo «Cùng số lượng mà khác giá giữa các page» nghĩa là các page đó đang báo hai giá khác nhau cho cùng một số lượng. Cách gom về một giá: chuyển các page đó sang sản phẩm rồi đối soát, chọn một bảng giá (xem [Chuyển page cũ sang sản phẩm](./chuyen-page-cu.md) và [Đối soát giá và ảnh của page cũ trước khi chuyển](./doi-soat-gia-anh.md)).

## Xử lý khi lỗi

Câu lỗi hiện ở dòng nhắc cạnh nút «Lưu giá»; các ô giữ nguyên những gì bạn đã gõ.

| Câu trên màn | Nghĩa | Cách xử lý |
|---|---|---|
| «Gói giá phải có số lượng duy nhất, giá dương và tiền tệ được hỗ trợ» | Hai bậc trùng số lượng, giá trống/bằng 0, hoặc tiền tệ ngoài danh sách | Sửa đúng ô sai rồi lưu lại |
| «Tên bậc giá quá dài (tối đa 160 ký tự)» | Ô «Tên bậc» quá dài | Rút ngắn |
| «Tên, mô tả hoặc gói giá không hợp lệ» | Quá 30 bậc | Bỏ bớt bậc |
| «Sản phẩm đã đổi; tải lại trước khi lưu» | Người khác (hoặc lượt kéo danh mục) vừa đổi món này | Chép lại giá định nhập, tải lại trang, nhập lại |
| «Đang đồng bộ danh mục POS; thử lưu lại sau» | Lượt kéo danh mục đang chạy | Chờ ít phút rồi bấm lại |
| «Page của sản phẩm này đang được đổi ở màn khác (gắn sản phẩm / «Không chuyển») — chưa lưu gì; tải lại rồi lưu lại» | Ai đó đang gắn page vào sản phẩm cùng lúc | Tải lại trang rồi lưu lại |
| «Chưa nối cửa đẩy sang bot — không lưu, vì lưu mà bot không đổi là màn hình nói sai» | Máy chủ chưa nối đường đẩy sang bot | Báo người quản trị hệ thống |

## Lưu ý

- **Giá gõ cứng trong lời bot:** nếu kịch bản của page có câu gõ tay giá, trang của page đó hiện cảnh báo «Bot đang báo cho khách … giá KHÔNG có trong bảng giá» hoặc «Kịch bản đang gõ cứng giá — hôm nay còn khớp bảng giá». Đổi giá ở đây thì sửa cả câu đó ở tab «Lời bot» (xem [Viết và lưu lời bot cho một page](./viet-loi-bot.md)).
- **Chưa có bậc giá nào:** bảng ghi «Chưa có bậc giá — page gắn vào sản phẩm ở thị trường này chưa báo giá được.» và page gắn vào sẽ không bật được bot (xem [Điều kiện «Bật được chưa» và cột «Còn thiếu»](./tra-cuu-bat-duoc-chua.md)).
- Trang của một page đã gắn sản phẩm chỉ cho **xem** giá, kèm nút «Sửa ở Sản phẩm › … › Theo thị trường →» dẫn về đúng chỗ này.
- Mọi lượt lưu giá ghi nhật ký kèm giá cũ và giá mới (**Cài đặt → Nhật ký**).

## Liên quan

[Xem giá và tồn kho theo thị trường](./xem-gia-ton-kho.md) · [Thêm hoặc gỡ một thị trường cho sản phẩm](./them-thi-truong.md) · [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) · [Sự cố bot: không trả lời, sai giá, page không bật được](./su-co-bot.md)
