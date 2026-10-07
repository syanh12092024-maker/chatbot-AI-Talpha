# Bản đồ giao diện: năm đích và các mục con

> Bảng tra mỗi đích trên thanh trên cùng có những mục con nào, mỗi mục làm gì, đường dẫn mở thẳng và vai nào mở được — cùng các phần tử chung của mọi màn.

Đối chiếu với hệ ngày 05/10/2026.

## Thanh trên cùng

| Phần | Vị trí | Nội dung · hành vi |
|---|---|---|
| Logo «AI Closer» | Trái | Về màn đầu của vai bạn |
| Chip team | Ngay sau logo | Tên team đang mở. Chỉ là chữ khi bạn thuộc một team. Có «▾» khi bạn thuộc nhiều team: Quản trị bấm sang màn «Chọn team»; vai khác bấm mở menu nhỏ «Đổi sang team» ([Đăng nhập, chọn team và đổi team](./dang-nhap-chon-team.md)) |
| Năm đích | Giữa | «Hộp thư» · «Sản phẩm» · «Page» · «Số liệu» · «Cài đặt». Chỉ hiện đích có ít nhất một màn vai bạn mở được; đích đang đứng được đánh dấu |
| Dải trạng thái bot | Phải | «Bot: đang đọc…» khi đang tải · «Bot chạy x/y page» (xanh) · «Bot tắt · 0/y page» (đỏ — hệ không phục vụ khách) · «Bot: chưa đọc được» (xám — chưa biết, không phải 0) · «Máy chạy bot đang đứng» hoặc «Máy chạy bot đã tắt giữa chừng» (đỏ). Rê chuột để biết mẫu số là «trong team đang mở» hay «trên toàn hệ». Tự đọc lại mỗi 45 giây |
| Ô tài khoản | Phải cùng | Chữ cái đầu, email và vai. Bấm mở menu: email, tên team, «vai: …», «Đổi team» (chỉ khi thuộc từ hai team), «Đăng xuất» |
| Dải «Trong mục …» | Hàng thứ hai | Mục con của đích đang mở — luật ở mục dưới |

## Luật của dải «Trong mục»

| Đích đang mở có | Hàng thứ hai hiện | Ví dụ |
|---|---|---|
| Từ hai mục trở lên | Các mục đó | Hộp thư (Quản trị, Sale) · Page |
| Đúng một mục, và mục đó là một cụm nhiều màn | Các tab của cụm | Số liệu · Cài đặt |
| Đúng một mục thường | Không có hàng thứ hai | Sản phẩm · Hộp thư của Marketer |

Khi một cụm chưa nằm trên hàng thứ hai (ví dụ «Luật chung» của đích Page), các màn của cụm hiện thành thanh tab ngay dưới tiêu đề màn.

## Năm đích và mục con

Cột vai: QT = Quản trị · MK = Marketer · S = Sale. «—» là vai đó không mở được.

### Hộp thư — khách đang chờ người, đơn chờ duyệt; trả lời vẫn ở Pancake

| Mục | Đường dẫn | Việc của nó | QT | MK | S |
|---|---|---|---|---|---|
| «Việc của tôi» | `/trang-chu` | Việc cần làm lọc theo vai bạn, gấp lên trước | ✓ | ✓ | — |
| «Hộp thư» | `/ban-hoi-thoai` | Hội thoại cần người, đơn chờ duyệt, tìm khách. Tab «Cần bạn» · «Đơn chờ» · «Bot đang xử»; lối «Mọi hội thoại gần đây» | ✓ | — | ✓ |
| «Việc đang chờ» | `/dieu-phoi` | Khách được giao cho người, có đồng hồ đếm ngược | ✓ | — | ✓ |

### Sản phẩm — bán gì, ở thị trường nào, giá bao nhiêu; bot trả lời theo đây

| Mục | Đường dẫn | Việc của nó | QT | MK | S |
|---|---|---|---|---|---|
| «Sản phẩm & kho» (không có hàng thứ hai) | `/san-pham` | Bot đang chào bán gì, còn hàng không. Một sản phẩm có tab «Chung» · «Theo thị trường» · «Page đang bán» · «Lịch sử»; gộp món, chuyển page cũ sang sản phẩm | ✓ | ✓ chỉ sản phẩm mình phụ trách | — |

### Page — từng page: bot nói gì, bật hay tắt, và luật chung cho mọi page

| Mục | Đường dẫn | Việc của nó | QT | MK | S |
|---|---|---|---|---|---|
| «Tất cả page» | `/page-bot` | Một dòng một page: bot bật hay tắt, cột «Còn thiếu gì», bật bot hàng loạt | ✓ | — | — |
| «Các page» (trên dải chỉ với Marketer) | `/page` | Danh sách page bên trái, một page ở giữa: «Bật được chưa», bảy tab, cột «AI đang đọc gì trên page này». Quản trị tới đây bằng cách bấm tên page ở «Tất cả page» | ✓ | ✓ chỉ page bán sản phẩm mình phụ trách | — |
| «Luật chung» (cụm, tab trong trang) | `/bo-luat` | Tab «Luật» — quy tắc chung mọi page | ✓ | — | — |
| ↳ tab «Chính sách · FAQ · Phản đối» | `/khoi-chung` | Ba khối dùng chung mọi page. Với Marketer, mục này đứng thẳng trên hàng thứ hai | ✓ | ✓ | — |
| ↳ tab «Trả lời sẵn» | `/lop-0-dong` | Mẫu trả lời theo từ khoá, không tốn tiền | ✓ | ✓ | — |
| ↳ tab «Đề xuất chờ duyệt» | `/ai-de-xuat` | Gợi ý sửa lời do AI soạn, phải duyệt mới áp | ✓ | — | — |

Bảy tab của trang một page: «Sản phẩm & giá» · «Lời bot» · «Ảnh» · «Trả lời sẵn» · «Kỹ thuật» · «Gợi ý cải thiện» (để sau — chưa dùng được) · «Lịch sử». Cột phải có ô «Thử hỏi bot» (chưa thử được ở đây) và «AI đang đọc gì trên page này». Mở thẳng một tab bằng `?tab=`, ví dụ `/page/{mã page}?tab=loi` mở tab «Lời bot».

### Số liệu — ra bao nhiêu đơn, tốn bao nhiêu tiền

Hàng thứ hai là các tab của cụm:

| Tab | Đường dẫn | Việc của nó | QT | MK | S |
|---|---|---|---|---|---|
| «Tổng quan» | `/bao-cao` | Đơn tách hai luồng, không gộp một tổng | ✓ | ✓ | — |
| «Chi phí AI» | `/chi-phi` | Tiền model theo page | ✓ | ✓ | — |
| «Khách» | `/nguon-khach` | Hội thoại đứng ở đâu, rủi ro hoàn, khách rơi ở đâu | ✓ | ✓ | — |

### Cài đặt — người, kết nối, model, nhật ký; mở lúc cài đặt hoặc lúc có sự cố

Hàng thứ hai là các tab của cụm:

| Tab | Đường dẫn | Việc của nó | QT | MK | S |
|---|---|---|---|---|---|
| «Bắt đầu» | `/cai-dat-team` | Năm việc làm một lần, và việc nào còn thiếu | ✓ | ✓ | — |
| «Hệ còn sống» | `/suc-khoe` | Các đèn hạ tầng và khối «Việc vận hành» | ✓ | ✓ | — |
| «Kết nối» | `/ket-noi` | Tài khoản Pancake và kho hàng | ✓ | — | — |
| «Model» | `/model-ai` | Nhà model, khoá, bảng giá | ✓ | — | — |
| «Người và team» | `/cau-hinh-team` | Thành viên, vai, chuyển page sang team khác | ✓ | — | — |
| «Nhật ký» | `/nhat-ky` | Việc người lẫn việc máy — không sửa, không xoá được | ✓ | — | — |

## Màn không có dòng trên dải — mở từ màn khác

| Màn | Đường dẫn | Mở từ đâu | Vai mở được |
|---|---|---|---|
| Tìm khách | `/ho-so-khach` | Hộp thư: lối «Tìm khách cũ — xem đủ các kênh →» dưới ô tìm | QT · S |
| Chi tiết một việc | `/viec/{mã việc}` | «Việc đang chờ»: bấm tên khách, hoặc «Mở việc đầy đủ» | QT · S |
| Một page | `/page/{mã page}` | Bấm tên page ở «Tất cả page» hoặc ở cột trái «Các page» | QT · MK |
| Đoạn chữ gửi cho AI | `/prompt-page?page={id page}` | Trang một page: «Xem nguyên văn đoạn chữ gửi AI» | QT · MK |
| Rủi ro hoàn hàng | `/rui-ro-hoan` | Số liệu › «Tổng quan» hoặc «Khách»: «Xem đủ →» | QT |
| Vận hành | `/van-hanh-v3` | Cài đặt › «Hệ còn sống», khối «Việc vận hành»: «Đối chiếu» · «Xem theo cửa» · nút xem lượt chạy thử | QT |
| Chọn team | `/chon-team` | Chip team hoặc «Đổi team» (Quản trị thuộc nhiều team) | QT |

Bốn màn đã dựng nhưng đang ẩn khỏi menu vì chưa dùng được đầy đủ — đường dẫn vẫn mở, Quản trị và Marketer vào được: «Kỹ năng theo sản phẩm» (`/ky-nang`; câu hỏi size nay nằm trong kiến thức sản phẩm (ô «Hỏi size trước khi chốt»)) · «Đưa sản phẩm lên chạy» (`/len-chay`) · «Ảnh gửi khách» (`/thu-vien-anh`) · «So hai bản kịch bản» (`/hieu-qua`).

## Phần tử chung trong thân màn

| Phần tử | Trông thế nào | Ý nghĩa |
|---|---|---|
| Ô «ⓘ Nguồn số» | Dòng gập ở chân màn | Bấm mở để xem mỗi con số lấy từ đâu và điều cần chú ý |
| Liên kết bị tắt | Liên kết không bấm được; rê chuột thấy «Màn này cần vai Quản trị — nhờ quản trị làm việc này» | Liên kết tới màn vai bạn không mở được. Nhờ Quản trị làm việc đó |
| Ô trống | Khung trống kèm một câu | Luôn nói vì sao trống (chưa có dữ liệu, chưa nối, hay đúng là không có) — "chưa biết" khác với 0 |
| Khung xám nhấp nháy | Thay chỗ số liệu lúc đang tải | Đợi tải xong; lỗi thì khung đổi thành hộp cảnh báo kèm câu lỗi |
| «Tới nội dung» | Hiện khi nhấn Tab lần đầu trên trang | Dùng bàn phím: nhảy qua thanh trên cùng vào thân màn |

## Liên kết cũ tự chuyển

`/kich-ban` → tab «Lời bot» của trang page (không kèm page thì sang danh sách page lọc các page chưa có lời bot riêng) · `/san-sang` → «Tất cả page» lọc page còn chặn (vai không mở được danh sách đó thì về màn đầu) · `/bat-dau` → «Tất cả page».

![Thanh trên cùng và dải «Trong mục» khi đang ở Cài đặt](images/ban-do-giao-dien.png)

<!-- CHỤP: anh=ban-do-giao-dien · vai=quan-tri · duong=/cai-dat-team · cho=«Hệ còn sống»
     thao_tac=
     trang_thai=thanh trên cùng đủ logo, chip team, năm đích (đích «Cài đặt» đang tô), dải trạng thái bot đã đọc xong; hàng thứ hai hiện các tab của Cài đặt
     danh_dau=(1) «Cài đặt» · (2) «Hệ còn sống» · (3) «Bot» (dải trạng thái bot, chữ bắt đầu bằng «Bot») -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Đích «Cài đặt» | Đích đang đứng được đánh dấu; bấm đích khác để sang |
| (2) | Dải «Trong mục» — tab «Hệ còn sống» | Các tab của cụm Cài đặt nằm trên hàng thứ hai |
| (3) | Dải trạng thái bot | Đọc nhanh bao nhiêu page đang bật bot; đỏ là có chuyện |

Liên quan: [Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md) · [AI Closer làm gì cho bạn](./tong-quan.md) · [Sự cố đăng nhập, quyền và «không thấy màn»](./su-co-dang-nhap-quyen.md)
