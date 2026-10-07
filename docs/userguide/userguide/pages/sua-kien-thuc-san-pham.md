# Sửa kiến thức sản phẩm và câu «hỏi size trước khi chốt»

> Trang này hướng dẫn marketer sửa phần kiến thức mà bot dùng để tư vấn một sản phẩm — công dụng, cách dùng, lưu ý, và câu dặn bot hỏi size trước khi chốt — ở tab «Chung» của sản phẩm.

**Ai làm được:** Marketer (chỉ sản phẩm mình phụ trách) · Quản trị.

__Khi nào dùng:__ bot tư vấn sai hoặc thiếu công dụng, cách dùng; khách hay hỏi một điều bot chưa biết; sản phẩm có size và bạn muốn bot hỏi số đo trước khi chốt để giảm đơn hoàn.

__Trước khi bắt đầu:__
- Kiến thức gắn với **sản phẩm**, không gắn với page: mọi thị trường và mọi page đang bán sản phẩm này đọc cùng một bản. Sửa một lần là đổi cho tất cả.
- Mỗi ô tối đa **2.000 ký tự**. Ô để trống thì bot không nói về mục đó.
- Lưu **thay trọn** bảy ô cùng lúc, và **không có kiểm phiên bản chống đè**: hai người cùng mở rồi cùng lưu thì bản lưu sau đè bản trước. Báo nhau trước khi sửa cùng một sản phẩm.

## Các bước

1. Mở **Sản phẩm → Sản phẩm & kho**, bấm sản phẩm ở cột trái (xem [Tìm sản phẩm bạn phụ trách và đọc bốn tầng](./tim-san-pham-phu-trach.md)).
   → *Kết quả:* sản phẩm mở ở tab «Chung». Góc phải đầu khối có nút lưu.
2. Đọc hộp cảnh báo đầu tab, nếu có.
   → *Kết quả:* một trong ba cảnh:
   - Không có hộp nào, nút ghi «Lưu — mọi page dùng ngay»: bot đang đọc phần kiến thức này.
   - Hộp «Bot CHƯA đọc phần kiến thức này», nút chỉ ghi «Lưu»: máy chủ chưa bật cách ghép lời mới; bot vẫn lấy lời về sản phẩm từ «Bản sao theo page». Bạn vẫn lưu được — bản lưu được giữ và sẽ dùng khi bật.
   - Hộp «Chưa biết bot có đọc phần này không»: máy chủ chưa đo được. Đừng coi lưu là bot đã nói theo.
3. Sửa các ô kiến thức: «Công dụng», «Thành phần», «Cách dùng», «Hợp với», «Lưu ý / cảnh báo», «Khách hay hỏi · thông tin thêm».
   → *Kết quả:* chưa có gì được lưu.
4. Nếu sản phẩm có size, điền ô «Hỏi size trước khi chốt» (khung tô màu, giữa các ô). Ô có sẵn gợi ý: «Ví dụ: trước khi chốt PHẢI hỏi số đo rồi gợi ý size. Hỏi đúng một lần, gộp vào câu tư vấn.».
   → *Kết quả:* chưa có gì được lưu. Dòng dưới ô nhắc «Để trống thì bot không hỏi.».
5. Bấm nút lưu («Lưu — mọi page dùng ngay» hoặc «Lưu»).
   → *Kết quả:* cuối tab hiện một trong hai hộp:
   - «Đã lưu» — «Lượt chat kế tiếp của mọi page bán sản phẩm này đọc bản mới.»
   - «Đã lưu vào dữ liệu» — «Bot CHƯA đọc phần này — lời bot về sản phẩm hôm nay vẫn theo «Bản sao theo page».»
6. Bấm tab «Lịch sử» để kiểm.
   → *Kết quả:* dòng mới nhất ghi việc sửa kiến thức, giờ, tên bạn, và các mục vừa có chữ.

![Tab «Chung» của một sản phẩm — các ô kiến thức, ô «Hỏi size trước khi chốt» và nút lưu](images/sua-kien-thuc-san-pham.png)

<!-- CHỤP: anh=sua-kien-thuc-san-pham · vai=marketer · duong=/san-pham · cho=«Hỏi size trước khi chốt»
     thao_tac=
     trang_thai=sản phẩm đầu tiên của marketer đang mở ở tab «Chung», các ô kiến thức bấm sửa được
     danh_dau=(1) «Công dụng» · (2) «Hỏi size trước khi chốt» · (3) «Lưu» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô «Công dụng» và các ô kiến thức | Viết điều bot được nói về sản phẩm |
| (2) | Ô «Hỏi size trước khi chốt» | Dặn bot hỏi số đo trước khi chốt; để trống là bot không hỏi |
| (3) | Nút lưu ở góc phải | Lưu cả bảy ô một lượt |

## «Hỏi size trước khi chốt» khác gì «Trả lời nhanh — hỏi size»

| | «Hỏi size trước khi chốt» (tab «Chung» của sản phẩm) | «Trả lời nhanh — hỏi size / dung tích» (tab «Lời bot» của page) |
|---|---|---|
| Ai mở lời | Bot chủ động hỏi khách số đo trước khi chốt đơn | Khách hỏi về size, bot trả lời |
| Bot dùng thế nào | Là lời dặn trong phần kiến thức sản phẩm, AI đọc và vận dụng | Câu bắn nguyên văn khi tin khách khớp chủ đề, không gọi AI |
| Phạm vi | Mọi page bán sản phẩm | Riêng một page |

Ô thứ hai sửa ở [Viết và lưu lời bot cho một page](./viet-loi-bot.md).

## Lưu ý

- Ô «Marketer phụ trách» đầu tab chỉ là chữ với marketer — đổi người phụ trách là việc của Quản trị ([Gán marketer phụ trách sản phẩm](./gan-marketer.md)).
- Ô «Ảnh chung» bên phải ghi «Ảnh chung của sản phẩm chưa có chỗ lưu» — ảnh không sửa ở tab này (xem [Thêm và gắn nhãn ảnh bot gửi khách](./anh-gui-khach.md)).
- Màn «Đoạn chữ gửi cho AI» hiện **chưa in** phần kiến thức sản phẩm trong khối «Sản phẩm và giá» — đừng dùng màn đó để kiểm câu bạn vừa lưu ở đây. Kiểm bằng tab «Lịch sử» như bước 6.
- Vai chỉ xem (không phải Quản trị hay Marketer) thấy các ô khoá và dòng «Vai của bạn chỉ xem — quản trị hoặc marketer sửa.».

## Xử lý khi lỗi

| Màn ghi (hộp «Chưa lưu được») | Nghĩa | Làm gì |
|---|---|---|
| «sản phẩm này không do bạn phụ trách — quản trị gán marketer ở tab Chung của sản phẩm» | Bạn không còn là marketer phụ trách sản phẩm này | Tải lại trang; nếu đúng là của bạn, nhờ quản trị gán lại |
| «tài khoản của bạn chưa gắn hồ sơ HRM (không có mã nhân viên) nên chưa phụ trách sản phẩm nào» | Tài khoản thiếu mã nhân viên | Nhờ quản trị lấy hồ sơ HRM ([Lấy người từ HRM: xem kế hoạch rồi áp dụng](./lay-nguoi-tu-hrm.md)) |
| «… dài quá 2000 ký tự» | Một ô vượt trần | Rút gọn ô đó rồi lưu lại |
| «Máy chủ trả 5…» hoặc câu có «chưa nối» | Lỗi phía máy chủ | Chữ vẫn còn trong ô — chép ra chỗ khác, báo quản trị |

__Liên quan:__ [Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md) · [Xem giá và tồn kho theo thị trường](./xem-gia-ton-kho.md) · [Tìm sản phẩm bạn phụ trách và đọc bốn tầng](./tim-san-pham-phu-trach.md)
