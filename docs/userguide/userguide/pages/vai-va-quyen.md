# Vai và quyền: mỗi vai mở được gì, sửa được gì

> Bảng tra ba vai Quản trị · Marketer · Sale: mỗi vai mở được màn nào, sửa được gì trên màn đó, việc nào chỉ Quản trị làm, và vai do HRM cấp khác vai cấp tay ra sao.

Đối chiếu với hệ ngày 05/10/2026.

## Ba vai

| Vai | Ai mang | Đích thấy | Màn đầu sau khi đăng nhập |
|---|---|---|---|
| Quản trị | Người quản trị team | Cả năm đích | «Việc của tôi» (`/trang-chu`) |
| Marketer | Nhân viên MKT (từ HRM) hoặc tài khoản cấp tay | Hộp thư (chỉ «Việc của tôi») · Sản phẩm · Page · Số liệu · Cài đặt (chỉ «Bắt đầu», «Hệ còn sống») | «Việc của tôi» (`/trang-chu`) |
| Sale | Nhân viên SALE (từ HRM, thuộc cả ba team) hoặc tài khoản cấp tay | Chỉ Hộp thư | «Hộp thư» (`/ban-hoi-thoai`) |

Vai «Quản lý» và «Người duyệt kịch bản» còn tên trong hệ nhưng **không còn được gán**: Quản lý gộp vào Quản trị; lời bot lưu là chạy nên không cần người duyệt. Thấy một trong hai vai này trên tài khoản thì báo Quản trị.

## Bảng màn × vai

Ký hiệu: **Sửa** = mở được và có thao tác ghi · **Xem** = mở được, chỉ đọc · **—** = không mở được (liên kết tới màn bị tắt; gõ thẳng đường dẫn thì hệ từ chối).

| Đích | Màn | Đường dẫn | Quản trị | Marketer | Sale |
|---|---|---|---|---|---|
| Hộp thư | «Việc của tôi» | `/trang-chu` | Xem | Xem | — |
| Hộp thư | «Hộp thư» | `/ban-hoi-thoai` | Sửa | — | Sửa: nhận việc · «Nhận thay bot» · đóng việc · xem, sửa, duyệt, từ chối đơn Messenger |
| Hộp thư | «Việc đang chờ» và chi tiết việc | `/dieu-phoi` · `/viec/…` | Sửa | — | Sửa: nhận và đóng việc |
| Hộp thư | Tìm khách | `/ho-so-khach` | Xem (cả tổng quan khi ô tìm trống) | — | Xem: tra theo số điện thoại |
| Sản phẩm | «Sản phẩm & kho» | `/san-pham` | Sửa mọi thứ | Sửa kiến thức sản phẩm (gồm «Hỏi size trước khi chốt»); xem phần còn lại — chỉ sản phẩm mình phụ trách | — |
| Page | «Tất cả page» | `/page-bot` | Sửa: bật/tắt bot, bật hàng loạt, quét page | — | — |
| Page | Một page | `/page`, `/page/…` | Sửa mọi thứ | Sửa lời bot (tab «Lời bot», chạy lại bản cũ); xem công tắc, «Kỹ thuật», «Sản phẩm & giá», «Ảnh» — chỉ page bán sản phẩm mình phụ trách. Nút «Nhập từ file Pancake» hiện đang lỗi — xem [Nhập lời bot từ file kịch bản Pancake](./nhap-loi-bot-tu-pancake.md) | — |
| Page | «Quy tắc chung mọi page» (tab «Luật») | `/bo-luat` | Sửa: soạn bản nháp, so sánh, áp | — | — |
| Page | «Chính sách · FAQ · Phản đối» | `/khoi-chung` | Sửa | Sửa | — |
| Page | «Câu trả lời sẵn» | `/lop-0-dong` | Sửa (mẫu hiện chỉ dùng để đếm — xem [Thêm, sửa câu trả lời sẵn theo từ khoá](./cau-tra-loi-san.md)) | Sửa (như Quản trị) | — |
| Page | «Gợi ý từ AI» (tab «Đề xuất chờ duyệt») | `/ai-de-xuat` | Sửa: duyệt (hệ chưa có nút từ chối) | — | — |
| Page | «Đoạn chữ gửi cho AI» | `/prompt-page` | Xem | Xem | — |
| Số liệu | «Tổng quan» · «Chi phí AI» · «Khách» | `/bao-cao` · `/chi-phi` · `/nguon-khach` | Xem | Xem | — |
| Số liệu | «Rủi ro hoàn hàng» | `/rui-ro-hoan` | Xem | — | — |
| Cài đặt | «Bắt đầu» · «Hệ còn sống» | `/cai-dat-team` · `/suc-khoe` | Xem | Xem | — |
| Cài đặt | «Kết nối» | `/ket-noi` | Sửa | — | — |
| Cài đặt | «Model» | `/model-ai` | Sửa | — | — |
| Cài đặt | «Vận hành» | `/van-hanh-v3` | Sửa | — | — |
| Cài đặt | «Người và team» | `/cau-hinh-team` | Sửa | — | — |
| Cài đặt | «Nhật ký» | `/nhat-ky` | Xem (không ai sửa hay xoá được) | — | — |
| Ẩn khỏi menu | «Kỹ năng theo sản phẩm» | `/ky-nang` | Sửa | Sửa | — |
| Ẩn khỏi menu | «Đưa sản phẩm lên chạy» · «Ảnh gửi khách» · «So hai bản kịch bản» | `/len-chay` · `/thu-vien-anh` · `/hieu-qua` | Xem | Xem | — |

Trong một màn hai vai cùng mở, vài khối chỉ hiện với Quản trị: rủi ro hoàn bốn tầng ở «Tổng quan» và «Khách»; tab «Từng tin» và «Theo model» ở «Chi phí AI»; khối «Việc vận hành» ở «Hệ còn sống». Ở «Tổng quan», bảng đơn theo marketer chỉ hiện dòng của chính marketer đang xem.

## Việc chỉ Quản trị làm

- Bật hoặc tắt bot cho page; sửa cấu hình page («Kỹ thuật»).
- Cấu trúc sản phẩm: gộp món thành sản phẩm theo SKU, thêm hoặc gỡ thị trường, sửa bảng giá theo thị trường, gắn hoặc gỡ page, gán marketer phụ trách, chuyển page cũ sang sản phẩm, bỏ sản phẩm.
- Soạn và áp quy tắc chung mọi page; duyệt gợi ý từ AI.
- Chọn model AI, thay khoá; kết nối tài khoản Pancake và kho hàng.
- Tạo người dùng, cấp và rút vai cấp tay, đặt mật khẩu đầu tiên, chuyển page sang team khác. Xem kế hoạch lấy người từ HRM: Quản trị của team đang mở; bấm «Áp dụng» kế hoạch: chỉ người là Quản trị của **cả ba** team (lượt áp đụng cả ba team).
- Các thao tác ở Cài đặt › «Vận hành»: đổi nguồn nhận tin, đối chiếu tin lỗi, «Chuyển nhân viên xử lý», «Cho AI tiếp tục».

## Phạm vi của Marketer

- Marketer chỉ thấy **sản phẩm mình phụ trách** — khớp mã nhân viên HRM của tài khoản với marketer phụ trách của sản phẩm. Danh sách sản phẩm ghi rõ đang lọc: «Chỉ hiện … sản phẩm bạn phụ trách · … sản phẩm của team chưa gán marketer — quản trị gán ở tab Chung.»
- Page cũng theo phạm vi này: marketer chỉ thấy page bán sản phẩm mình phụ trách. Mở sản phẩm, sửa kiến thức, xem lịch sử sản phẩm hay mở trang page ngoài phạm vi thì hệ từ chối và nói vì sao.
- Tài khoản marketer chưa có mã nhân viên thì không thấy sản phẩm nào; màn nói lý do. Nhờ Quản trị gắn tài khoản với hồ sơ HRM ([Lấy người từ HRM: xem kế hoạch rồi áp dụng](./lay-nguoi-tu-hrm.md)) và gán marketer cho sản phẩm ([Gán marketer phụ trách sản phẩm](./gan-marketer.md)).
- Một số màn **chưa lọc** theo phạm vi này, nên marketer vẫn thấy dữ liệu của cả team: «Đoạn chữ gửi cho AI», «Câu trả lời sẵn», «Chi phí AI», các con số ở «Việc của tôi», và các khối Số liệu ngoài bảng đơn theo marketer.
- Giá theo thị trường và ảnh: Marketer chỉ xem. Page **đã gắn** sản phẩm thì tab «Sản phẩm & giá» và «Ảnh» chỉ xem với mọi vai (giá sửa ở Sản phẩm › Theo thị trường, việc của Quản trị). Page **chưa gắn** sản phẩm (còn bán theo bản sao riêng) thì tab «Sản phẩm & giá» cho sửa — nhưng marketer chỉ thấy page đã gắn sản phẩm mình phụ trách, nên trên thực tế đây là việc của Quản trị.

## Vai do HRM cấp và vai cấp tay

| | Vai do HRM cấp | Vai cấp tay |
|---|---|---|
| Nguồn | Lượt «Lấy người từ HRM»: MKT → Marketer ở team của người đó; SALE → Sale ở cả ba team | Quản trị cấp ở Cài đặt › «Người và team» |
| Trên bảng người | Chip tên vai kèm chữ «HRM» (rê chuột: «Do HRM cấp — đổi team/vai ở HRM») | Chip tên vai kèm nút «×» để rút |
| Rút | Không rút tay được — đổi ở HRM, lượt đồng bộ sau tự rút | Quản trị bấm «×» |
| Người nghỉ việc | Lượt áp HRM rút vai HRM và khoá tài khoản | Lượt áp HRM không bao giờ rút vai cấp tay |

## Nhiều vai, nhiều team

- Một người có thể mang **nhiều vai trong một team**. Menu là gộp các màn của mọi vai; ô tài khoản ghi đủ vai, ví dụ «… · Quản trị, Marketer».
- Vai tính **theo từng team**: một người có thể là Marketer ở một team và Sale ở cả ba team. Đổi team là đổi bộ vai đang dùng ([Đăng nhập, chọn team và đổi team](./dang-nhap-chon-team.md)).
- Đổi vai có hiệu lực với cả phiên đang mở: tài khoản bị khoá, hoặc bị rút hết vai trong team đang mở, thì chậm nhất khoảng 30 giây sau mọi màn đưa về trang đăng nhập; bị rút một vai thì phiên mất đúng vai đó.

## Khi mở màn không thuộc vai

- Menu chỉ hiện màn vai bạn mở được; đích không còn màn nào thì biến mất khỏi thanh trên cùng.
- Liên kết trong thân màn tới màn bạn không mở được bị tắt, rê chuột thấy «Màn này cần vai Quản trị — nhờ quản trị làm việc này».
- Gõ thẳng đường dẫn của màn đó thì hệ từ chối (có màn hiện trang báo không có quyền, có màn chỉ hiện một dòng báo thiếu vai). Cách xử lý: [Sự cố đăng nhập, quyền và «không thấy màn»](./su-co-dang-nhap-quyen.md).

Liên quan: [Bản đồ giao diện: năm đích và các mục con](./ban-do-giao-dien.md) · [Tạo người dùng, cấp vai và đặt mật khẩu đầu tiên](./tao-nguoi-dung.md) · [AI Closer làm gì cho bạn](./tong-quan.md)
