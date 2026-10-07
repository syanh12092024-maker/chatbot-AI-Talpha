# Gộp món POS thành một sản phẩm theo SKU

> Trang này hướng dẫn người quản trị gom các món cùng một mặt hàng ở nhiều cửa hàng của kho hàng thành MỘT sản phẩm trên hệ — cách duy nhất để tạo sản phẩm mới.

**Ai làm được:** Quản trị. Marketer mở được khung gộp (đường dẫn `/san-pham?xem=gop`) để xem gợi ý, nhưng không có ô chọn và nút gộp — màn ghi «Chỉ quản trị gộp».

__Khi nào dùng:__ kho hàng vừa kéo danh mục về những món chưa thuộc sản phẩm nào; bạn cần tạo sản phẩm để gắn page, đặt giá theo thị trường và cho marketer viết kiến thức một lần cho mọi nước.

__Trước khi bắt đầu:__
- Danh mục của các cửa hàng đã được kéo về ở **Cài đặt → Kết nối** (xem [Thêm kho hàng, kéo danh mục và quét page](./them-kho-hang-keo-du-lieu.md)).
- **SKU là bắt buộc.** Mỗi cửa hàng của kho hàng đặt mã món riêng, nhưng cùng một mặt hàng thì mang chung một SKU. Hệ chỉ gộp các món có SKU, và mọi món trong một lượt gộp phải cùng một SKU. Món chưa có SKU (kéo về trước khi hệ lưu SKU) thì phải kéo lại danh mục trước.
- Nếu muốn gán marketer ngay lúc gộp: tài khoản marketer đã được lấy từ HRM (xem [Lấy người từ HRM: xem kế hoạch rồi áp dụng](./lay-nguoi-tu-hrm.md)). Không có thì để «— gán sau —».

## Các bước

1. Mở **Sản phẩm → Sản phẩm & kho** (đường dẫn `/san-pham`), bấm «+ Thêm» cạnh tiêu đề «Sản phẩm của team».
   → *Kết quả:* bên phải mở khung «Gộp món POS thành sản phẩm». Đường dẫn đổi thành `/san-pham?xem=gop` — gửi đường này cho đồng nghiệp là mở thẳng khung gộp. Khi team còn page chưa chuyển sang sản phẩm, ô lưu ý ở cột trái cũng có nút «Gộp món POS thành sản phẩm →» mở cùng khung này.
2. Đọc hàng số đầu khung: «Shop POS = thị trường» (kèm số cửa hàng «đang bật»), «Shop đã kéo danh mục», «Món chưa thuộc sản phẩm», «Sản phẩm gốc».
   → *Kết quả:* nếu chưa kéo đủ cửa hàng, hộp «Mới kéo danh mục …/… shop» nhắc rằng món của cửa hàng chưa kéo chưa có ở đây — gộp bây giờ vẫn được, lượt kéo sau tự nối món cùng SKU của cửa hàng mới vào đúng sản phẩm.
3. Tìm nhóm cần gộp trong mục «Gợi ý: có thể là cùng một sản phẩm». Gõ tên, SKU hoặc mã món vào ô «Lọc theo tên, SKU, mã món…» để thu hẹp.
   → *Kết quả:* mỗi nhóm là một thẻ: tên trên kho hàng, dòng lý do (ví dụ «Cùng SKU … ở 3 shop») và bảng món với cột «Thị trường» · «Mã món POS» · «SKU» · «Tên trên POS» · «Tồn».
4. Bỏ dấu chọn ở món không thuộc nhóm (mặc định mọi món đều được chọn).
   → *Kết quả:* chỉ các món còn dấu chọn được gộp.
5. Sửa ô «Tên sản phẩm» (tên bot gọi trước mặt khách) và kiểm ô «Mã gốc» máy đề xuất.
   → *Kết quả:* mã gốc là khoá của kịch bản — màn ghi «đặt rồi không sửa được», nên chọn mã ngắn, không dấu.
6. Chọn marketer ở ô «Marketer» (danh sách là tài khoản marketer có mã nhân viên của team, dạng «Tên · mã NV»), hoặc để «— gán sau —».
   → *Kết quả:* sản phẩm tạo ra mang marketer này; gán sau ở tab «Chung» cũng được.
7. Bấm «Gộp thành 1 sản phẩm».
   → *Kết quả:* thẻ nhóm hiện nhãn «Đã gộp» và nút «Mở ở Sản phẩm →»; sản phẩm mới xuất hiện ở cột trái. Mỗi cửa hàng có món trong nhóm thành một thị trường của sản phẩm.

![Khung «Gộp món POS thành sản phẩm» — một nhóm gợi ý cùng SKU, đang chọn món và đặt tên](images/gop-mon-pos.png)

<!-- CHỤP: anh=gop-mon-pos · vai=quan-tri · duong=/san-pham?xem=gop · cho=«Gợi ý: có thể là cùng một sản phẩm»
     thao_tac=cuộn tới «Gợi ý: có thể là cùng một sản phẩm»
     trang_thai=thẻ nhóm đầu tiên là nhóm loại mới (có ô «Tên sản phẩm», «Mã gốc», «Marketer»), bảng món có ít nhất hai cửa hàng, mọi ô chọn đang bật
     danh_dau=(1) «Gợi ý: có thể là cùng một sản phẩm» · (2) «Mã gốc» · (3) «Gộp thành 1 sản phẩm» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Mục «Gợi ý: có thể là cùng một sản phẩm» | Máy chỉ gợi ý nhóm; bạn soát từng món trước khi gộp |
| (2) | Ô «Mã gốc» | Kiểm kỹ — đặt rồi không sửa được |
| (3) | Nút «Gộp thành 1 sản phẩm» | Bấm sau khi đã bỏ chọn món lạc nhóm, sửa tên và chọn marketer |

## Nhóm «nối vào» sản phẩm đã có

Khi SKU của nhóm đã là một sản phẩm của team, thẻ ghi lý do «SKU … đã là sản phẩm «…» — … món chưa nối» và chỉ có nút «Nối món đã chọn vào «…»». Bấm nút đó là gắn các món đã chọn vào sản phẩm sẵn có (thêm thị trường hoặc thêm món) — không tạo sản phẩm mới. Xong, thẻ hiện nhãn «Đã nối».

## Đọc gợi ý cho đúng

- Máy ghép nhóm theo SKU; món chưa có SKU thì tạm ghép theo số đầu tên, rồi tới tên giống nhau. Màn nói rõ: «Không gộp tự động — gộp nhầm là bot báo giá của nước này cho khách nước khác.»
- Dòng «tên lệch giữa các shop: … — người xem» nghĩa là cùng SKU nhưng tên khác nhau ở các cửa hàng: đọc kỹ trước khi gộp.
- Dòng «SKU «SP TEST» là món thử — kiểm trước khi gộp»: đó là món thử của đội vận hành, thường không nên gộp.
- Hộp cảnh báo «… món chưa có SKU» ở đầu khung: các món đó kéo về trước khi hệ lưu SKU. Kéo lại danh mục ở **Cài đặt → Kết nối** để lấy SKU thật.

## Xử lý khi lỗi

Câu lỗi hiện ngay dưới thẻ nhóm, thẻ giữ nguyên lựa chọn để bạn sửa rồi bấm lại.

| Câu trên màn | Nghĩa | Cách xử lý |
|---|---|---|
| «Chọn ít nhất một món.» | Bạn đã bỏ chọn hết | Chọn lại món cần gộp |
| «món chưa có SKU: … — kéo lại danh mục ở Cài đặt › Kết nối để lấy SKU thật, rồi gộp» | Có món trong lượt chưa có SKU | Kéo lại danh mục của cửa hàng đó, mở lại khung gộp |
| «các món có SKU khác nhau: …» | Lượt gộp lẫn món khác SKU | Bỏ chọn món khác SKU, gộp từng SKU một |
| «SKU gửi lên lệch SKU thật của món (…) — đọc lại gợi ý rồi gộp» | Danh mục đổi trong lúc khung đang mở | Tải lại trang rồi gộp lại |
| «SKU … đã là một sản phẩm gốc khác của team này» | Đã có sản phẩm mang SKU này | Tải lại trang — nhóm sẽ thành loại «nối vào» |
| «mã gốc "…" đã có trong team này» | Trùng mã gốc | Đặt mã gốc khác |
| «thiếu mã gốc» · «mã gốc KHÔNG được chứa dấu ":" …» · «mã gốc dài quá 120 ký tự» | Ô «Mã gốc» sai khuôn | Sửa ô «Mã gốc» |
| «món … đang thuộc sản phẩm «…» — gỡ ở đó trước» | Món đã được gộp ở nơi khác | Gỡ món ở sản phẩm kia trước (tab «Theo thị trường») nếu thật sự gộp nhầm |
| «một lượt gộp tối đa 200 món» | Quá nhiều món một lượt | Chia nhỏ lượt gộp |
| «mã … không phải marketer (có hồ sơ HRM) của team này» | Tài khoản marketer vừa đổi | Tải lại trang, chọn lại marketer |
| «Không đọc được gợi ý gộp» | Máy chủ không trả được dữ liệu | Tải lại trang; còn lỗi thì báo người quản trị hệ thống |

## Trường hợp đặc biệt

- **Không còn gì để gộp:** khung hiện «Không còn món POS nào chưa thuộc sản phẩm» — mọi món đã kéo về đều thuộc một sản phẩm. Muốn thêm, kéo danh mục cửa hàng khác ở **Cài đặt → Kết nối**.
- **Nhóm không có SKU:** màn vẫn hiện nhóm ghép theo tên (dòng «Không có SKU — gộp thì shop mới KHÔNG tự nối») và vẫn có nút «Gộp thành 1 sản phẩm», nhưng máy chủ từ chối gộp món chưa có SKU. Kéo lại danh mục để lấy SKU rồi mới gộp.
- **Gộp nhầm:** mở sản phẩm, tab «Theo thị trường», bấm «Gỡ» ở từng món (xem [Thêm hoặc gỡ một thị trường cho sản phẩm](./them-thi-truong.md)). Khi sản phẩm không còn món, page và kịch bản nào trỏ tới, nút «Bỏ sản phẩm» ở đầu sản phẩm xoá được nó; còn chỗ trỏ tới thì máy báo «còn … đang trỏ tới "…" — gỡ chúng trước rồi mới bỏ được». Nút «Bỏ sản phẩm» không hỏi lại.
- **Cửa hàng mới kéo về sau:** món mang cùng SKU tự nối vào sản phẩm ở lượt kéo danh mục sau — bạn không phải gộp lại.
- Mọi lượt gộp ghi một dòng ở tab «Lịch sử» của sản phẩm và ở **Cài đặt → Nhật ký**.

## Liên quan

[Thêm hoặc gỡ một thị trường cho sản phẩm](./them-thi-truong.md) · [Gán marketer phụ trách sản phẩm](./gan-marketer.md) · [Sửa bảng giá của sản phẩm ở một thị trường](./sua-bang-gia.md) · [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) · [Chuyển page cũ sang sản phẩm](./chuyen-page-cu.md) · [Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md)
