# Kiểm tra page đã sẵn sàng bật bot chưa

> Trang này hướng dẫn đọc khối «Bật được chưa» trên trang của một page — page còn vướng điều kiện nào, điều nào chặn hẳn, điều nào chỉ nên làm thêm — và bấm thẳng tới chỗ sửa.

**Ai làm được:** Marketer · Quản trị (xem và đi sửa phần thuộc quyền mình). Bật bot là việc **chỉ Quản trị** làm (xem [Bật hoặc tắt bot cho một page](./bat-tat-bot.md)).

__Khi nào dùng:__ trước khi nhờ quản trị bật bot cho một page; sau khi sửa lời bot, sản phẩm hay giá để xem page đã hết chặn chưa; khi «Việc của tôi» báo có page «Page bot KHÔNG bật được».

__Trước khi bắt đầu:__
- Bạn mở được page khi page đó bán sản phẩm bạn phụ trách (Marketer) — Quản trị mở được mọi page của team.
- Bảng đầy đủ mọi điều kiện, nghĩa và cách sửa nằm ở [Điều kiện «Bật được chưa» và cột «Còn thiếu»](./tra-cuu-bat-duoc-chua.md). Trang này chỉ dạy cách đọc khối và đi sửa.

## Các bước

1. Mở trang của page: Marketer vào **Page → Các page** rồi bấm tên page ở cột trái; Quản trị vào **Page → Tất cả page** rồi bấm tên page.
   → *Kết quả:* phần giữa hiện tên page, đèn «Đang trả lời khách» hoặc «Đang tắt», và khối «Bật được chưa» ngay dưới.
2. Đọc khối «Bật được chưa».
   → *Kết quả:* một trong bốn cảnh ở bảng «Bốn cảnh của khối» bên dưới.
3. Với mỗi dòng trong danh sách, đọc theo thứ tự: tên nhóm (in đậm) · nhãn «Đang chặn» hoặc «Nên làm» · câu mô tả · câu «làm gì» in nhạt.
   → *Kết quả:* dòng «Đang chặn» phải sửa hết thì mới bật được bot. Dòng «Nên làm» không chặn, nhưng bot sẽ trả lời kém hơn nếu bỏ qua.
4. Bấm nút dưới dòng cần sửa (ví dụ «Soạn kịch bản», «Bổ sung kịch bản», «Xem sản phẩm của page», «Mở màn Kết nối»).
   → *Kết quả:* dòng về lời bot chuyển ngay sang tab «Lời bot» của chính trang này; các dòng khác mở màn sửa tương ứng.
5. Sửa xong thì quay lại trang page và tải lại (F5).
   → *Kết quả:* khối «Bật được chưa» đọc lại tình trạng. Khối **không tự cập nhật** sau khi bạn lưu ở tab khác — phải tải lại.
6. Khi khối ghi «Đủ điều kiện để bật bot»: Marketer báo Quản trị bật bot; Quản trị bấm «Bật bot cho page này» ở góc phải đầu trang.

![Trang của một page — khối «Bật được chưa» với dòng «Đang chặn», dòng «Nên làm» và nút đi sửa](images/kiem-tra-bat-duoc-chua.png)

<!-- CHỤP: anh=kiem-tra-bat-duoc-chua · vai=marketer · duong=/page · cho=«Chọn một page ở cột trái»
     thao_tac=chọn «Còn điều kiện chặn» ở ô «Lọc page» · bấm dòng đầu tiên của «Danh sách page»
     trang_thai=khối «Bật được chưa» có ít nhất một dòng «Đang chặn» và một dòng «Nên làm», mỗi dòng có nút đi sửa
     danh_dau=(1) «Bật được chưa» · (2) «Đang chặn» · (3) «Nên làm» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Khối «Bật được chưa» | Đọc trước khi nhờ bật bot |
| (2) | Nhãn «Đang chặn» | Phải sửa hết mới bật được; bấm nút dưới dòng để đi sửa |
| (3) | Nhãn «Nên làm» | Không chặn — nên làm để bot trả lời tốt hơn |

## Bốn cảnh của khối

| Khối ghi | Nghĩa | Làm gì |
|---|---|---|
| «Đủ điều kiện để bật bot» kèm «Không còn việc nào chặn.» hoặc «… việc nên làm thêm, xem bên dưới.» | Không còn dòng chặn nào | Nhờ Quản trị bật bot; làm thêm các dòng «Nên làm» nếu có |
| Danh sách dòng «Đang chặn» / «Nên làm» | Page còn vướng | Sửa từng dòng như bước 4 |
| «Lõi bot không thấy page này» | Page có trên hệ nhưng bot chưa biết nó — thường do chưa quét Pancake về, hoặc chưa có tài khoản Pancake nào phủ page. Màn nhắc: chưa thấy KHÔNG có nghĩa là page không thiếu gì | Hai nút «Quét Pancake ở danh sách page» và «Xem tài khoản Pancake» là việc của Quản trị (xem [Thêm kho hàng, kéo danh mục và quét page](./them-kho-hang-keo-du-lieu.md), [Kết nối tài khoản Pancake](./ket-noi-pancake.md)) |
| «Chưa đọc được tình trạng của page này» | Lượt hỏi lõi bot hỏng — chưa đọc được KHÔNG có nghĩa là page không thiếu gì | Tải lại sau ít phút; vẫn vậy thì báo người quản trị hệ thống |

Dòng mang thêm nhãn «Chưa có trong bảng từ» là điều kiện mới mà màn chưa có tên tiếng Việt — vẫn phải xử lý; gửi nguyên chữ cho Quản trị.

## Nút đi sửa dẫn tới đâu

| Nhóm (tên đậm trên dòng) | Nút | Marketer |
|---|---|---|
| «Kịch bản bán hàng» · «Kịch bản đủ chi tiết» · «Kịch bản còn hiệu quả» | «Soạn kịch bản» · «Bổ sung kịch bản» · «Xem lại kịch bản» | Sửa được — nút mở tab «Lời bot» ngay trên trang (xem [Viết và lưu lời bot cho một page](./viet-loi-bot.md)) |
| «Sản phẩm và giá» | «Xem sản phẩm của page» | Mở được «Sản phẩm & kho» để xem; giá do Quản trị sửa |
| «Máy chạy bot» | «Xem hệ còn sống không» | Mở được để xem (xem [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md)) |
| «Tài khoản Pancake» · «Kết nối kho hàng» · «Sản phẩm của page» · «Giá bán» · «Model AI và khoá» · «Cấu hình model đọc lên bị lỗi» | «Mở màn Kết nối» · «Nối kho hàng» · «Gán sản phẩm gốc» · «Nhập giá bán» · «Mở màn Model AI» | Nút mờ, di chuột lên thấy «Màn này cần vai Quản trị — nhờ quản trị làm việc này» |
| «Thẻ hội thoại» · «Cửa gửi tin cho khách» · «Cách ghép lời cho bot» · «Đang chạy thử» | Không có nút | Đọc câu «làm gì» in nhạt: việc bên Pancake hoặc việc của người quản trị hệ thống |

## Tìm nhanh các page còn chặn

Ở cột trái của trang page, ô lọc có «Còn điều kiện chặn» và «Đủ điều kiện» (mỗi lựa chọn kèm số page). Chọn «Còn điều kiện chặn» rồi bấm lần lượt từng page để xử lý. Marketer chỉ thấy page của sản phẩm mình phụ trách.

## Lưu ý

- Đèn «Đang trả lời khách» / «Đang tắt» ở đầu trang là trạng thái công tắc bot hiện tại — khác với «Bật được chưa». Page có thể «Đủ điều kiện» mà vẫn đang tắt.
- Tab «Kỹ thuật» có thể ghi «Công tắc bot đang bị khoá tay trên máy chủ này: …» — khi đó Quản trị cũng không bật được cho tới khi người quản trị hệ thống mở khoá.

__Liên quan:__ [Điều kiện «Bật được chưa» và cột «Còn thiếu»](./tra-cuu-bat-duoc-chua.md) · [Bật hoặc tắt bot cho một page](./bat-tat-bot.md) · [Sự cố bot: không trả lời, sai giá, page không bật được](./su-co-bot.md) · [Xem việc cần làm mỗi sáng ở «Việc của tôi»](./viec-cua-toi.md)
