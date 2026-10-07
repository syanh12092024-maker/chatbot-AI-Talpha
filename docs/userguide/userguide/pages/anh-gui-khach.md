# Thêm và gắn nhãn ảnh bot gửi khách

> Trang này hướng dẫn thêm, gắn nhãn, xếp thứ tự và bỏ ảnh mà bot gửi cho khách ở tab «Ảnh» của trang một page, và nói rõ trường hợp nào tab này chỉ cho xem.

**Ai làm được:** Quản trị · Marketer — nhưng chỉ trên page **chưa gắn** vào sản phẩm. Page đã gắn sản phẩm thì tab «Ảnh» chỉ xem với mọi vai (xem mục «Page đã gắn sản phẩm» bên dưới). Vì marketer chỉ thấy page đã gắn sản phẩm mình phụ trách, **hôm nay marketer chỉ xem được ảnh**.

__Khi nào dùng:__ page chưa có ảnh nên bot chỉ tư vấn bằng lời; khách hỏi feedback mà bot không gửi ảnh feedback; ảnh cũ sai, mờ hoặc hết hợp lệ; muốn đổi ảnh bot gửi đầu tiên.

__Trước khi bắt đầu:__
- Ảnh gắn theo **sản phẩm của page**: page có mấy sản phẩm thì tab có mấy khung ảnh.
- **Nhãn quyết định lúc gửi.** Bot chọn ảnh theo nhãn: ảnh «Ảnh sản phẩm» được gửi trước; khách hỏi feedback thì bot gửi ảnh có nhãn chứa «Feedback». Nhãn chọn từ danh sách, không gõ tay — gõ sai một chữ là ảnh không bao giờ được gửi.
- **Mỗi thao tác có hiệu lực ngay**: thêm, đổi nhãn, xếp, bỏ đều lưu và đẩy sang bot trong cùng một lượt. Bot không nhận thì thao tác không thành và màn báo lỗi.
- Tệp ảnh: jpg, png, webp hoặc gif, tối đa **10 MB**. Link ảnh phải là link công khai bắt đầu bằng `https://`.

## Các bước (page chưa gắn sản phẩm)

1. Mở trang của page, bấm tab «Ảnh».
   → *Kết quả:* mỗi sản phẩm một khung, tiêu đề là tên sản phẩm, dòng «Ảnh bot gửi khách (…)» và lưới ảnh hiện có. Chưa có ảnh thì ghi «Chưa có ảnh — bot sẽ tư vấn bằng lời.».
2. Ở dòng «Thêm ảnh», chọn nhãn cho ảnh mới trong ô chọn: «Ảnh sản phẩm» · «Feedback khách» · «Chứng nhận» · «Thành phần» · «Cách dùng» · «Công dụng» · «Khác».
   → *Kết quả:* ảnh sắp thêm sẽ mang nhãn này.
3. Thêm ảnh bằng một trong hai cách:
   - Chọn tệp trên máy rồi bấm «Tải ảnh lên».
   - Dán link vào ô «…hoặc dán link ảnh công khai https://» rồi bấm «Thêm link».
   → *Kết quả:* thông báo «Đã thêm ảnh — bot đã nhận bản mới.»; ảnh hiện ở cuối lưới.
4. Để đổi nhãn một ảnh có sẵn: chọn nhãn khác ở ô ngay dưới ảnh.
   → *Kết quả:* lưu ngay, thông báo «Đã đổi nhãn ảnh — bot đã nhận bản mới.».
5. Để đổi thứ tự: bấm «↑» hoặc «↓» dưới ảnh.
   → *Kết quả:* «Đã xếp lại ảnh — bot đã nhận bản mới.». Nút «↑» của ảnh đầu và «↓» của ảnh cuối bị mờ.
6. Để bỏ một ảnh: bấm «Bỏ» dưới ảnh, rồi bấm «Bỏ ảnh» trong hộp xác nhận «Bỏ ảnh này?» («Bot sẽ thôi gửi ảnh này cho khách ngay khi lưu.»).
   → *Kết quả:* «Đã bỏ ảnh — bot đã nhận bản mới.»; ảnh biến khỏi lưới.

![Tab «Ảnh» của một page chưa gắn sản phẩm — lưới ảnh, ô nhãn dưới ảnh và dòng «Thêm ảnh»](images/anh-gui-khach.png)

<!-- CHỤP: anh=anh-gui-khach · vai=quan-tri · duong=/page-bot · cho=«Tất cả page»
     thao_tac=bấm tên một page chưa gắn sản phẩm · bấm «Ảnh»
     trang_thai=page chưa gắn sản phẩm, có ít nhất hai ảnh; dòng «Thêm ảnh» với ô nhãn, ô chọn tệp, nút «Tải ảnh lên» và «Thêm link» đang hiện
     danh_dau=(1) «Ảnh bot gửi khách» · (2) «Ảnh sản phẩm» · (3) «Tải ảnh lên» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Lưới «Ảnh bot gửi khách (…)» | Xem ảnh hiện có; đổi nhãn, «↑» «↓», «Bỏ» ngay dưới từng ảnh |
| (2) | Ô nhãn (mặc định «Ảnh sản phẩm») | Chọn nhãn — bot dựa vào đây để biết gửi ảnh lúc nào |
| (3) | Nút «Tải ảnh lên» (và «Thêm link») | Thêm ảnh mới; có hiệu lực ngay |

## Page đã gắn sản phẩm

Khi page đã gắn vào một sản phẩm, đầu tab «Ảnh» (và tab «Sản phẩm & giá») hiện hộp «Chỉ xem — giá và ảnh của page này sửa ở màn Sản phẩm», kèm câu như «Page này bán «…» ở «…» (shop …). Giá + ảnh sửa ở Sản phẩm › «…» › Theo thị trường — sửa ở đó là sửa cho MỌI page cùng sản phẩm ở thị trường này.» và nút «Sửa ở Sản phẩm › … › Theo thị trường →». Ô nhãn dưới ảnh bị khoá, không có «↑» «↓» «Bỏ» và không có dòng «Thêm ảnh».

Hệ chưa làm được việc sửa ảnh cho page đã gắn sản phẩm: tab «Theo thị trường» của màn Sản phẩm hiện **chưa có chỗ thêm hay sửa ảnh**, và tab «Chung» ghi «Ảnh chung của sản phẩm chưa có chỗ lưu». Hiện tại: ảnh của page đã gắn là ảnh được gom về món lúc Quản trị đối soát giá và ảnh khi chuyển page (xem [Đối soát giá và ảnh của page cũ trước khi chuyển](./doi-soat-gia-anh.md)). Cần thêm hay bỏ ảnh cho page đã gắn: báo Quản trị.
<!-- TBD: page đã gắn sản phẩm thì ai sửa ảnh, ở màn nào — màn Sản phẩm chưa có chỗ sửa ảnh — OQ-MK-2 -->

![Tab «Ảnh» của một page đã gắn sản phẩm — hộp «Chỉ xem» và nút sang màn Sản phẩm](images/anh-gui-khach-2.png)

<!-- CHỤP: anh=anh-gui-khach-2 · vai=marketer · duong=/page · cho=«Chọn một page ở cột trái»
     thao_tac=bấm dòng đầu tiên của «Danh sách page» · bấm «Ảnh»
     trang_thai=page đã gắn sản phẩm của marketer; hộp «Chỉ xem» hiện đầu tab, ô nhãn dưới ảnh bị khoá
     danh_dau=(1) «Chỉ xem — giá và ảnh của page này sửa ở màn Sản phẩm» · (2) «Theo thị trường →» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Hộp «Chỉ xem — …» | Đọc page đang bán sản phẩm nào, ở thị trường nào |
| (2) | Nút «Sửa ở Sản phẩm › … › Theo thị trường →» | Sang màn Sản phẩm xem giá; ảnh hiện chưa sửa được ở đó |

## Xem tổng thể ảnh của team

Màn «Ảnh gửi khách» (mở đường dẫn `/thu-vien-anh`, không nằm trên menu) **chỉ xem**: đếm «Ảnh đọc được», «Ảnh có chủ đề riêng», «Ảnh chưa biết dùng lúc nào», liệt kê «Nhãn đang dùng» và lưới ảnh theo page. Không sửa được gì ở đó.

## Xử lý khi lỗi

| Màn ghi | Nghĩa | Làm gì |
|---|---|---|
| «Chưa chọn ảnh» — «Chọn một tệp jpg, png, webp hoặc gif.» | Bấm «Tải ảnh lên» khi chưa chọn tệp | Chọn tệp rồi bấm lại |
| «Ảnh quá lớn» — «Tối đa 10 MB.» (hoặc «Ảnh quá lớn (tối đa 10 MB).») | Tệp vượt 10 MB | Nén ảnh rồi tải lại |
| «Chỉ nhận ảnh jpg, png, webp hoặc gif (tối đa 10 MB)» | Sai định dạng | Đổi định dạng |
| «Chưa có link» — «Dán link ảnh công khai bắt đầu bằng https://» | Ô link trống | Dán link công khai |
| Hộp «Không lưu được ảnh» kèm câu «… page đã chuyển sang sản phẩm, bot không còn đọc bản sao…» | Page vừa được gắn sản phẩm trong lúc bạn đang mở tab | Tab tự đọc lại và chuyển sang chỉ xem — xem mục trên |
| Thông báo «… vào dữ liệu — máy này đang khoá ghi sang bot: …» | Đã lưu nhưng máy chủ đang khoá đường ghi sang bot | Báo người quản trị hệ thống |
| «Máy chủ chưa khai thư mục ảnh — không tải lên được» | Máy chủ thiếu cấu hình | Dùng «Thêm link» tạm; báo người quản trị hệ thống |
| «Page chưa có sản phẩm sửa được — ảnh gắn theo sản phẩm (tab «Sản phẩm & giá»).» | Page chưa có sản phẩm nào | Ảnh chỉ thêm được khi page có sản phẩm |

__Liên quan:__ [Xem giá và tồn kho theo thị trường](./xem-gia-ton-kho.md) · [Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md) · [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md)
