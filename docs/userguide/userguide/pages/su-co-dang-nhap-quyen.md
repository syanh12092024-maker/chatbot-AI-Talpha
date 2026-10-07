# Sự cố đăng nhập, quyền và «không thấy màn»

> Bảng tra theo triệu chứng cho mọi vai: không đăng nhập được, bị báo «không đủ quyền», nút bị mờ, không thấy màn, không thấy team, marketer không thấy sản phẩm — kèm nguyên nhân và cách xử lý.

Vai đọc: mọi vai.

Đối chiếu với hệ ngày 05/10/2026.

## Mã vai trong câu báo

Nhiều câu báo quyền in **mã vai** thay vì tên vai. Đọc theo bảng này:

| Mã trên màn | Vai |
|---|---|
| `quan-tri` | Quản trị |
| `marketer` | Marketer |
| `sale` | Sale |
| `quan-ly` | Quản lý — vai cũ, không còn cấp mới |
| `duyet-kich-ban` | Người duyệt kịch bản — vai cũ, không còn cấp mới |

## Đăng nhập

| Triệu chứng (bạn thấy gì) | Nguyên nhân | Cách xử lý |
|---|---|---|
| «Nhập đủ email và mật khẩu.» | Còn ô trống | Điền đủ hai ô |
| «Sai email hoặc mật khẩu.» | Hệ cố ý trả **cùng một câu** cho bốn trường hợp: không có tài khoản với email đó · tài khoản đã khoá · tài khoản chưa đặt mật khẩu · sai mật khẩu | Kiểm email gõ đúng (email chính là tên đăng nhập). Vẫn sai thì nhờ Quản trị mở **Cài đặt → Người và team**, xem cột «Tài khoản» của bạn: «Đã khoá» → xem dòng dưới; nhãn «Chưa đặt mật khẩu» → Quản trị bấm «Đặt mật khẩu» ([Tạo người dùng, cấp vai và đặt mật khẩu đầu tiên](./tao-nguoi-dung.md)); không có tên bạn → Quản trị tạo tài khoản |
| Tài khoản mang nhãn «Đã khoá» | Lượt đồng bộ HRM khoá vì HRM báo bạn đã nghỉ | Nhờ HCNS sửa trạng thái ở HRM, rồi Quản trị chạy lại [Lấy người từ HRM: xem kế hoạch rồi áp dụng](./lay-nguoi-tu-hrm.md) — kế hoạch sẽ có nhóm «Mở khoá (HRM: làm lại)» |
| Quên mật khẩu | Hệ chưa có đường đặt lại mật khẩu cho tài khoản đã có mật khẩu | Hệ chưa làm được việc này. <!-- TBD: cách xử lý tạm khi quên mật khẩu chưa có nguồn — OQ-QT-5 --> |
| «Thử sai quá nhiều lần. Đợi 15 phút rồi thử lại.» | Cùng một email gõ sai 5 lần trong 15 phút | Đợi 15 phút tính từ lần gõ sai cuối. Màn không có nút gỡ sớm |
| «Tài khoản chưa được xếp vào team nào. Báo quản trị.» | Mật khẩu đúng nhưng tài khoản không mang vai ở team nào | Nhờ Quản trị cấp vai ở team bạn làm |
| «Không nối được máy chủ. Thử lại.» | Mạng hoặc máy chủ không trả lời | Kiểm mạng, thử lại sau ít phút |
| Đang làm thì bị đưa về trang đăng nhập | Phiên đăng nhập hết hạn sau 8 tiếng (ghi ở chân trang đăng nhập) | Đăng nhập lại. Sau khi đăng nhập, hệ đưa bạn về màn đầu tiên của vai — mở lại màn đang làm dở |
| Đã bị khoá nhưng vẫn đang dùng được | Khoá chỉ chặn lần đăng nhập **sau**; phiên đang mở giữ tới khi hết hạn | Bình thường — phiên tự hết sau tối đa 8 tiếng |
| Màn «Chọn team» ghi «Tài khoản chưa được xếp vào team nào. Báo quản trị.» | Như trên | Nhờ Quản trị cấp vai |
| «Bạn không thuộc team này.» khi chọn team | Chọn một team bạn không có vai | Chọn team khác; cần vào team đó thì xin cấp vai |

## Bị báo «không đủ quyền» khi mở một màn

Trang báo có tiêu đề in đậm (ví dụ «Không đủ quyền xem màn Cài đặt team», «Màn này cần vai Quản trị hoặc Quản lý», «Màn này chỉ dành cho Quản trị») và một câu theo mẫu «Màn {tên} cần một trong các vai: {mã vai}. Vai hiện có: {mã vai}.» Dưới cùng có liên kết «← Về màn đầu của bạn».

| Triệu chứng (bạn thấy gì) | Nguyên nhân | Cách xử lý |
|---|---|---|
| «Màn Cài đặt team cần một trong các vai: quan-tri, quan-ly, marketer. …» | Sale không dùng màn Cài đặt | Bấm «← Về màn đầu của bạn» |
| «Màn Kết nối & token chỉ cho vai quan-tri — đây là hạ tầng dùng chung cho cả ba team, không phải dữ liệu của một team. …» | Màn Kết nối chỉ dành cho Quản trị | Nhờ Quản trị làm việc cần làm |
| «Màn Model AI & khoá cần một trong các vai: quan-tri, quan-ly. …» · «Màn Nhật ký thao tác cần một trong các vai: quan-tri, quan-ly. …» · «Màn Page & Bot cần một trong các vai: quan-tri, quan-ly. …» | Màn của Quản trị | Như trên. Marketer xem page của mình ở «Các page» |
| «Màn này cần vai Quản trị hoặc Quản lý» kèm «Tài khoản {email} đang có vai: …» | Màn Người và team chỉ dành cho Quản trị | Như trên |
| «Màn Sức khoẻ hệ thống cần một trong các vai: …» | Sale không dùng màn Hệ còn sống | Bấm «← Về màn đầu của bạn» |
| «Màn Chính sách · FAQ · Phản đối cần vai Quản trị hoặc Marketer. …» | Vai khác không mở màn này | Như trên |
| Câu ghi «Màn Cửa kiểm sẵn sàng cần một trong các vai: …» dưới tiêu đề «Không đủ quyền xem báo cáo» / «… chi phí AI» / «… nguồn khách» / «… rủi ro hoàn» / «… lớp trả lời 0 đồng» | Vai không mở được màn đó. Câu in nhầm tên màn — tin tiêu đề in đậm | Đọc tiêu đề để biết màn nào; xem quyền ở [Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md) |
| «Tài khoản này không có quyền vào bảng điều phối» kèm nút «Đăng xuất» | «Việc đang chờ» chỉ mở cho Sale và Quản trị | Đăng xuất để đổi tài khoản, hoặc nhờ Quản trị cấp vai |
| «Chưa được gán vai» — «Tài khoản của bạn chưa được gán vai nào trong team này, nên chưa có việc nào để hiện. Nhờ quản trị gán vai ở màn Cấu hình team.» | Màn «Việc của tôi» không mở cho tài khoản không có vai Quản trị hoặc Marketer — **kể cả Sale** | Sale: vào **Hộp thư**, không dùng «Việc của tôi». Vai khác: nhờ Quản trị cấp vai ở **Cài đặt → Người và team** |
| Trình duyệt hiện một dòng chữ kỹ thuật có «Không đủ quyền. Cần một trong các vai: quan-tri, quan-ly.» | Mở thẳng màn Vận hành bằng tài khoản không phải Quản trị | Màn này của Quản trị — quay lại trang trước |
| Dòng chữ kỹ thuật có «Bàn hội thoại chỉ mở cho vai sale, quan-tri.» | Marketer mở thẳng Hộp thư | Hộp thư chỉ dành cho Sale và Quản trị |
| «page này không bán sản phẩm bạn phụ trách» | Marketer mở trang một page nằm ngoài phạm vi | Xem mục «Marketer không thấy sản phẩm, page» bên dưới |

## Nút mờ, thao tác bị từ chối, không thấy màn trên menu

| Triệu chứng (bạn thấy gì) | Nguyên nhân | Cách xử lý |
|---|---|---|
| Nút hoặc liên kết bị mờ, di chuột vào hiện «Màn này cần vai Quản trị — nhờ quản trị làm việc này» | Màn đích chỉ dành cho Quản trị (ví dụ nút «Mở màn Kết nối» ở Cài đặt → Bắt đầu khi bạn là Marketer) | Nhờ Quản trị làm việc đó |
| Bấm lưu thì hộp lỗi «Không đủ quyền. Cần một trong các vai: …» · «Chỉ quản trị được thực hiện thao tác này.» · «Chỉ vai quan-tri đổi được model và khoá. …» · «Chỉ vai quan-tri sửa được thành viên. …» | Vai của bạn chỉ xem được việc đó | Nhờ Quản trị làm. Mỗi lần bị chặn được ghi nhật ký («Chặn vì không đủ vai») |
| Dòng nhỏ «Vai của bạn chỉ xem được.» / «Chỉ quản trị bật tắt bot» / «Cần vai Quản trị để bật tắt bot.» | Màn mở được nhưng không sửa được với vai này | Như trên |
| Thanh ngang thiếu đích (ví dụ Sale chỉ thấy «Hộp thư») | Menu lọc theo vai: Sale chỉ có Hộp thư; Marketer không có «Tất cả page», «Kết nối», «Model», «Người và team», «Nhật ký» — mục Cài đặt của Marketer chỉ còn «Bắt đầu» và «Hệ còn sống» | Bình thường. Bảng đầy đủ: [Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md) |
| Không tìm thấy màn «Vận hành», «Đoạn chữ gửi cho AI» trên menu | Hai màn không đứng trên menu, mở từ màn khác: Vận hành từ khối «Việc vận hành» của Hệ còn sống; Đoạn chữ gửi cho AI từ trang một page | Xem [Bản đồ giao diện: năm đích và các mục con](./ban-do-giao-dien.md) |
| «Không được truy cập dữ liệu của team khác.» | Đường dẫn bị sửa để trỏ sang team khác | Đổi team bằng chip team, không sửa đường dẫn. Lượt này được ghi nhật ký («Chặn truy cập xuyên team») |

## Không thấy team

| Triệu chứng (bạn thấy gì) | Nguyên nhân | Cách xử lý |
|---|---|---|
| Chip team không có team bạn cần | Bạn không mang vai nào ở team đó (kho «Chưa phân team» không bao giờ hiện) | Nhờ Quản trị của team đó cấp vai, hoặc sửa team ở HRM rồi đồng bộ |
| Đăng nhập vào thẳng một team, không thấy màn «Chọn team» | Chỉ Quản trị thuộc nhiều team mới gặp màn «Chọn team». Người khác vào thẳng team dùng lần trước (hoặc team đầu tiên) | Đổi team bằng menu nhỏ khi bấm chip team. Xem [Đăng nhập, chọn team và đổi team](./dang-nhap-chon-team.md) |
| «Không đổi được team: …» trong menu chip team | Lỗi khi đổi (thường là bạn vừa bị rút vai ở team đó) | Tải lại trang; vẫn lỗi thì nhờ Quản trị kiểm vai |
| Tên team đổi khác (ví dụ thành «Pialpha GCC») | Lượt đồng bộ HRM đổi tên team theo HRM | Bình thường |
| Đổi team xong màn trống | Mọi màn chỉ hiện dữ liệu của team đang mở | Kiểm chip team đang đúng chưa |

## Marketer không thấy sản phẩm, page

| Triệu chứng (bạn thấy gì) | Nguyên nhân | Cách xử lý |
|---|---|---|
| «Tài khoản của bạn chưa gắn hồ sơ HRM (không có mã nhân viên) nên chưa phụ trách sản phẩm nào — nhờ quản trị kiểm ở Người và team.» | Tài khoản tạo tay, chưa gắn mã nhân viên HRM — marketer chỉ thấy sản phẩm khớp mã nhân viên của mình | Quản trị chạy [Lấy người từ HRM: xem kế hoạch rồi áp dụng](./lay-nguoi-tu-hrm.md): tài khoản trùng email công ty trong HRM sẽ được gắn hồ sơ (nhóm «Gắn tài khoản có sẵn với hồ sơ HRM»). Email tài khoản phải đúng email công ty |
| «Chỉ hiện {n}/{m} sản phẩm bạn phụ trách · {k} sản phẩm của team chưa gán marketer — quản trị gán ở tab Chung.» | Sản phẩm chưa gán bạn làm người phụ trách | Nhờ Quản trị gán: [Gán marketer phụ trách sản phẩm](./gan-marketer.md) |
| «Bạn là marketer: chỉ hiện page của sản phẩm bạn phụ trách. Sản phẩm chưa gán marketer — nhờ quản trị gán ở Sản phẩm › Chung.» | Danh sách page chỉ gồm page đã gắn vào sản phẩm của bạn; page chưa gắn sản phẩm nào nằm ngoài phạm vi mọi marketer | Nhờ Quản trị gắn page vào sản phẩm: [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) |
| Người kiêm Quản trị và Marketer thấy hết | Vai Quản trị không bị lọc theo người phụ trách | Bình thường |

__Liên quan:__ [Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md) · [Tra nhật ký: ai đã làm gì, lúc nào](./tra-nhat-ky.md) · [Câu hỏi thường gặp](./hoi-dap.md)
