# Nhận một việc bot giao lại và đóng việc với kết quả

> Trang này hướng dẫn sale nhận một việc trong hàng đợi (ngay trong Hộp thư hoặc ở màn «Việc đang chờ») và đóng việc bằng đúng kết quả, lý do, ghi chú — thứ hệ dùng để biết bot dừng ở đâu và sửa bot.

**Ai làm được:** Sale · Quản trị (cả hai vai nhận và đóng được việc; quản trị vào chủ yếu để kiểm).

__Khi nào dùng:__ khi một hội thoại hoặc một đơn nằm trong hàng đợi chờ người — có đồng hồ đếm ngược và lý do bot đẩy sang — và bạn sẽ xử lý nó.

__Trước khi bắt đầu:__
- Mỗi việc có **ba trạng thái**: «Chờ người» (chưa ai nhận) → «{tên} đang xử» (đã có người nhận) → đã đóng. Việc đã đóng **không mở lại được**, nên chọn kết quả cẩn thận.
- Đồng hồ của mỗi việc đếm ngược tới hạn — hạn đặt 10 phút sau lúc việc vào hàng đợi. Còn 5 phút trở xuống thì đồng hồ màu cam; quá hạn thì đỏ và hiện dấu «+» (ví dụ «+3:20» là trễ 3 phút 20 giây).
- Hàng đợi chỉ là của **team đang mở**. Xem team khác: đổi team ở chip tên team ([Đăng nhập, chọn team và đổi team](./dang-nhap-chon-team.md)).

## Các bước — trong Hộp thư

1. Mở «Hộp thư» (đường `/ban-hoi-thoai`), tab «Cần bạn».
   → *Kết quả:* danh sách hội thoại có việc đang mở, hạn gần nhất lên đầu, tự làm mới mỗi 15 giây.
2. Bấm vào một dòng mang nhãn «Chờ người».
   → *Kết quả:* hội thoại mở ở khung giữa; đồng hồ của việc hiện ở góc phải đầu khung; thanh dưới có nút «Nhận · đóng việc ▾».
3. Bấm «Nhận · đóng việc ▾».
   → *Kết quả:* khung «Đánh dấu đã xử» mở lên phía trên thanh dưới, ghi «Chọn kết quả rồi bấm «Đóng việc».». Có nút «Nhận việc» kèm chú thích «hoặc chọn thẳng kết quả bên dưới — hệ thống tự nhận hộ», và hàng nút «Kết quả».
4. Bấm «Nhận việc» trước khi sang Pancake trả lời khách.
   → *Kết quả:* việc thành «{tên bạn} đang xử»; nút ở thanh dưới đổi thành «Đóng việc ▾». Khung hiện hộp «Việc này đang có người giữ» kèm tên bạn và giờ nhận — với chính bạn thì bỏ qua hộp này.
5. Xử lý khách trên Pancake (bấm «Trả lời trên Pancake» — xem [Trả lời khách trên Pancake mà không chen ngang bot](./tra-loi-tren-pancake.md)).
6. Quay lại Hộp thư, bấm «Đóng việc ▾», bấm một nút trong hàng «Kết quả» (bảng ở mục dưới).
   → *Kết quả:* nút được chọn sáng lên. Nếu kết quả cần lý do, ô «Lý do · bắt buộc» hiện ra với chú thích «Đây là thứ dùng để sửa bot — không có lý do thì con số sau này không nói lên gì.» Ô «Ghi chú» luôn có (tối đa 500 ký tự).
7. Chọn lý do (nếu có ô), gõ ghi chú nếu cần, rồi bấm «Đóng việc».
   → *Kết quả:* nút «Đóng việc» chỉ bấm được khi đã đủ thông tin bắt buộc. Đóng xong, hội thoại rời tab «Cần bạn», số đếm trên tab giảm.

![Khung «Đánh dấu đã xử» trong Hộp thư — đã chọn kết quả «Khách từ chối», ô lý do hiện ra](images/nhan-va-dong-viec.png)

<!-- CHỤP: anh=nhan-va-dong-viec · vai=sale · duong=/ban-hoi-thoai?ht=1 · cho=«Nhận · đóng việc ▾»
     thao_tac=bấm «Nhận · đóng việc ▾» · bấm «Khách từ chối»
     trang_thai=khung «Đánh dấu đã xử» mở lên từ thanh dưới; nút «Khách từ chối» đang sáng; ô «Lý do» (danh sách chọn) và ô «Ghi chú» đã hiện; nút «Đóng việc» còn mờ vì chưa chọn lý do
     danh_dau=(1) «Nhận việc» · (2) «Khách từ chối» · (3) «Đóng việc» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Nút «Nhận việc» | Nhận trước khi trả lời khách, để người khác thấy bạn đang xử |
| (2) | Hàng nút «Kết quả» | Chọn đúng một kết quả; hai kết quả «Khách từ chối» và «Bot đẩy nhầm, không phải việc» bắt chọn lý do |
| (3) | Nút «Đóng việc» | Chỉ sáng khi đủ thông tin bắt buộc; bấm là chốt, không mở lại được |

## Các bước — ở màn «Việc đang chờ»

Màn «Việc đang chờ» (đường `/dieu-phoi`, mục con trong dải «Trong mục» của Hộp thư) gộp **mọi việc đang mở** — cả việc hội thoại lẫn việc đơn không gắn hội thoại — thành một bảng, xếp theo hạn.

1. Bấm «Việc đang chờ» ở dải «Trong mục».
   → *Kết quả:* dòng dưới tiêu đề ghi «{N} việc · {M} quá 10 phút chưa ai nhận · làm mới {giờ}». Khi có việc quá hạn, góc phải đầu trang có nút «Mở việc cũ nhất · quá {N} phút».
2. Chọn tab lọc «Tất cả» · «Hội thoại» · «Đơn» nếu cần. Bảng có các cột «Còn lại» · «Khách» · «Lý do bot đẩy sang» · «Loại · page» · «Đang xử» (tên người nhận, hoặc «chưa ai nhận»).
3. Bấm vào một dòng (không bấm vào tên khách).
   → *Kết quả:* ngăn «Xem nhanh» mở bên phải: hồ sơ khách («Rủi ro hoàn» · «Tên» · «Số điện thoại» · «Địa chỉ» · «Tổng số đơn»), nút «Mở Pancake», nút «Mở việc đầy đủ», và khung «Đánh dấu đã xử» giống hệt trong Hộp thư.
4. Nhận và đóng việc trong khung «Đánh dấu đã xử» như bước 4–7 ở trên.
   → *Kết quả:* bảng tải lại, số đếm và thứ tự đổi theo, ngăn «Xem nhanh» mở lại đúng việc vừa ghi.
5. Muốn xem đủ chi tiết, bấm tên khách (hoặc «Mở việc đầy đủ»).
   → *Kết quả:* trang «Chi tiết việc cần xử» mở: lý do làm tiêu đề, dòng «Bot đẩy sang lúc …», nhãn «Còn giờ» / «Sắp hết giờ» / «Quá hạn» kèm đồng hồ, nút «Mở Pancake» và «Mở POS», bảng «Thông tin đơn», khối «Hồ sơ khách» và khung «Đánh dấu đã xử». Việc đã đóng hiện «Đã xử bởi {tên} lúc {giờ}» kèm kết quả, lý do, ghi chú — không còn nút nào.

![Màn «Việc đang chờ» — một bảng việc xếp theo hạn, tab lọc theo loại](images/nhan-va-dong-viec-2.png)

<!-- CHỤP: anh=nhan-va-dong-viec-2 · vai=sale · duong=/dieu-phoi · cho=«Còn lại»
     thao_tac=
     trang_thai=bảng hàng đợi có vài dòng, có dòng đồng hồ đỏ dạng «+m:ss» và dòng có tên người ở cột «Đang xử»; dòng tóm tắt dưới tiêu đề hiện số việc
     danh_dau=(1) «Tất cả» · (2) «Còn lại» · (3) «Đang xử» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Tab «Tất cả» · «Hội thoại» · «Đơn» | Lọc theo loại việc; số đếm nằm trên từng tab |
| (2) | Cột «Còn lại» | Đồng hồ đếm ngược; «+» là đã quá hạn |
| (3) | Cột «Đang xử» | Tên người đã nhận, hoặc «chưa ai nhận» |

![Ngăn «Xem nhanh» mở từ một dòng của «Việc đang chờ»](images/nhan-va-dong-viec-3.png)

<!-- CHỤP: anh=nhan-va-dong-viec-3 · vai=sale · duong=/dieu-phoi · cho=«Còn lại»
     thao_tac=bấm «Khách khiếu nại — hàng bị lỗi»
     trang_thai=ngăn «Xem nhanh» mở bên phải, có hồ sơ khách, hai nút «Mở Pancake» · «Mở việc đầy đủ» và khung «Đánh dấu đã xử»
     danh_dau=(1) «Mở Pancake» · (2) «Mở việc đầy đủ» · (3) «Đánh dấu đã xử» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Nút «Mở Pancake» | Mở hội thoại trên Pancake; mờ khi việc không gắn hội thoại nào |
| (2) | Nút «Mở việc đầy đủ» | Sang trang «Chi tiết việc cần xử» |
| (3) | Khung «Đánh dấu đã xử» | Nhận việc, chọn kết quả, đóng việc |

## Kết quả đóng việc

Danh sách nút do hệ trả về theo loại việc. Bảng tra đầy đủ (kèm mọi lý do bot đẩy sang): [Lý do bot giao việc và kết quả đóng việc](./tra-cuu-ly-do-giao-viec.md).

| Nút kết quả | Có ở loại việc | Cần thêm |
|---|---|---|
| «Chốt được» | Hội thoại · Đơn | Với việc loại Đơn: ô «Chi phí đóng đơn (đồng)», không bắt buộc |
| «Khách từ chối» | Hội thoại · Đơn | Lý do bắt buộc: «Chê giá cao» · «Chưa tin shop» · «Đã mua chỗ khác» · «Không còn nhu cầu» · «Chê giao hàng lâu» · «Lý do khác» |
| «Khách không trả lời» | Hội thoại · Đơn | — |
| «Đã xử ở Pancake/POS» | Hội thoại · Đơn | — |
| «Trả lại cho bot» | Chỉ Hội thoại | — (xem lưu ý dưới) |
| «Bot đẩy nhầm, không phải việc» | Hội thoại · Đơn | Lý do bắt buộc: «Bot hiểu sai ý khách» · «Khách chỉ hỏi bình thường» · «Trùng với việc khác» · «Lỗi kỹ thuật, bot không trả lời được» · «Lý do khác» |

Chọn «Lý do khác» thì ô ghi chú thành bắt buộc, ít nhất 5 ký tự. Ô chi phí: để trống nếu chưa biết («Không biết thì bỏ trống, đừng gõ 0»); nếu gõ thì là số không âm, tối đa hai chữ số sau dấu chấm, không quá 100.000.000.

## Lưu ý

- **Bỏ qua «Nhận việc» cũng được:** chọn thẳng kết quả rồi «Đóng việc» thì hệ tự nhận hộ rồi đóng trong một lần. Nhưng nên nhận trước khi sang Pancake, để đồng nghiệp không mở cùng khách.
- **Kết quả «Trả lại cho bot» chỉ ghi lại kết quả**, không trao hội thoại lại cho bot. Hội thoại vẫn do Sale giữ và bot vẫn không trả lời khách đó. Sale chưa có nút trả hội thoại cho bot — cách xử lý hiện tại nằm ở [Nhận thay bot một hội thoại bot đang xử](./nhan-thay-bot.md).
- **Không có nút «bỏ nhận».** Đã nhận thì việc ở «{tên bạn} đang xử» tới khi bạn đóng.
- Con số «quá 10 phút chưa ai nhận» ở đầu màn «Việc đang chờ» đếm mọi việc còn mở đã quá hạn, kể cả việc đã có người nhận nhưng chưa đóng. Hệ chưa đẩy báo cho quản trị khi việc quá 10 phút; quản trị chỉ thấy khi mở màn này.
- Việc đã đóng rời cả tab «Cần bạn» lẫn «Việc đang chờ», nên bạn không xem lại được ở đó. Mỗi lần nhận và đóng đều được ghi vào nhật ký, quản trị tra được ở [Tra nhật ký: ai đã làm gì, lúc nào](./tra-nhat-ky.md).

## Trường hợp đặc biệt

- **Việc đơn không gắn hội thoại** (ví dụ đơn trang bán hàng cần người xem) không có trong danh sách hội thoại của tab «Cần bạn». Nó nằm ở khối «Đơn không gắn hội thoại» và ở «Việc đang chờ», tab «Đơn». Nút «Mở Pancake» của nó mờ («Việc này không gắn hội thoại nào»); việc phải làm thường nằm trên kho hàng — xem [Các loại đơn ở tab Đơn chờ và cách xử lý ngoài hệ](./cac-loai-don-cho.md).
- **Nút «Mở POS»** trên trang chi tiết việc mờ khi việc không gắn đơn nào («Việc này không gắn đơn nào») hoặc khi máy chủ chưa cấu hình đường mở đơn trên kho hàng («Chưa cấu hình đường POS»).
- **Hội thoại bot đã tự chuyển người** (khách khiếu nại, bot hết lượt, page chưa có kịch bản…) chuyển sang Sale giữ nhưng hệ không tự tạo việc cho nó, nên nó không vào «Cần bạn». Bạn thấy nó ở lối «Mọi hội thoại gần đây» trong Hộp thư (nhãn «Sale») và trên Pancake.
- **Team chưa gán page:** «Việc đang chờ» hiện «Team này chưa được gán page nào» — bảng rỗng vì chưa có dữ liệu, không phải vì hết việc. Báo quản trị.

## Xử lý khi lỗi

| Câu hiện trên màn | Nghĩa | Làm gì |
|---|---|---|
| «Việc này {tên} đang giữ từ {giờ}.» | Người khác đã nhận trước | Hỏi người đó, hoặc chọn việc khác |
| «Việc này {tên} đã đóng lúc {giờ} — kết quả "…". Không ghi đè.» | Việc đã có người đóng | Không cần làm gì. Kết quả đã đóng không sửa được — hệ không có đường mở lại việc |
| «Phải chọn kết quả trước khi đóng việc.» | Chưa chọn nút kết quả | Chọn một kết quả |
| «Chọn "…" thì phải nói rõ lý do — không có lý do thì ghi nhận này vô nghĩa.» | Kết quả này bắt lý do | Chọn lý do trong ô «Lý do» |
| «Chọn "Lý do khác" thì phải ghi rõ ra, ít nhất 5 ký tự.» | Ghi chú quá ngắn | Gõ ghi chú dài hơn |
| «Chi phí phải là số không âm, nhiều nhất 2 chữ số sau dấu chấm: "…"» / «Chi phí vượt trần 100.000.000 đồng: "…"» | Ô chi phí sai dạng | Sửa con số, hoặc để trống |
| «Không tải được danh sách kết quả» | Mất kết nối khi tải nút kết quả | Tải lại trang rồi thử lại |
| «Không có việc này.» / «Không có việc này» (trang chi tiết) | Việc đã rời hàng chờ hoặc đường dẫn sai | Bấm «Về Việc đang chờ» |
| «Không tải được danh sách việc: …» — «Sẽ thử lại sau 15 giây.» | Mất kết nối | Chờ, màn tự thử lại |
| «Phiên đăng nhập đã hết» | Hết phiên | Bấm «Đăng nhập lại» |

Sự cố khác về đơn: [Sự cố đơn: không duyệt được, nghi trùng, van tạo đơn đóng](./su-co-don.md).

__Liên quan:__ [Bắt đầu nhanh cho Sale: xử lý trọn một việc đầu tiên](./bat-dau-nhanh-sale.md) · [Nhận thay bot một hội thoại bot đang xử](./nhan-thay-bot.md) · [Lý do bot giao việc và kết quả đóng việc](./tra-cuu-ly-do-giao-viec.md) · [Khi nào bot trả lời, khi nào im và giao cho người](./khi-nao-bot-tra-loi.md)
