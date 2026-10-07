# Đăng nhập, chọn team và đổi team

> Trang này hướng dẫn bạn đăng nhập vào AI Closer, vào đúng team, đổi sang team khác khi đang làm việc, và đăng xuất.

**Ai làm được:** mọi vai — Quản trị · Marketer · Sale. Màn «Chọn team» chỉ hiện với Quản trị thuộc nhiều team; người khác vào thẳng team mặc định.

__Khi nào dùng:__ lần đầu vào hệ, khi phiên đăng nhập hết hạn (sau 8 tiếng), hoặc khi bạn cần làm việc ở một team khác.

__Trước khi bắt đầu:__
- Quản trị đã tạo tài khoản cho bạn bằng email công ty và cấp vai cho bạn trong ít nhất một team ([Tạo người dùng, cấp vai và đặt mật khẩu đầu tiên](./tao-nguoi-dung.md)). Tài khoản lấy từ HRM ban đầu «Chưa đặt mật khẩu» — Quản trị phải bấm «Đặt mật khẩu» trước thì bạn mới đăng nhập được ([Lấy người từ HRM: xem kế hoạch rồi áp dụng](./lay-nguoi-tu-hrm.md)).
- Bạn có email và mật khẩu (Quản trị gửi qua kênh riêng).

## Các bước

### Đăng nhập

1. Mở trang `/dang-nhap` của hệ. Chưa đăng nhập mà mở địa chỉ gốc `/` hay bất kỳ màn nào cũng được đưa về đây.
   → *Kết quả:* khung «AI Closer» với dòng «Đăng nhập để vào bảng điều phối», hai ô «Email» và «Mật khẩu», nút «Đăng nhập»; dưới khung ghi «Phiên đăng nhập hết hạn sau 8 tiếng.»
2. Gõ email vào ô «Email» — đúng như tài khoản được cấp, bằng chữ thường. Hệ so email từng ký tự, nên gõ hoa một chữ là không khớp.
3. Gõ mật khẩu vào ô «Mật khẩu».
4. Bấm «Đăng nhập» (hoặc nhấn Enter).
   → *Kết quả:* nút đổi thành «Đang kiểm…», rồi hệ đưa bạn đi theo số team của bạn:
   - thuộc **một team** → vào thẳng màn đầu của vai;
   - thuộc **nhiều team, không có vai Quản trị** → vào thẳng team mặc định: team bạn dùng lần trước; chưa dùng lần nào thì team đứng đầu theo thứ tự tên;
   - thuộc **nhiều team và có vai Quản trị** ở ít nhất một team → sang màn «Chọn team» (bước 5).

Màn đầu của mỗi vai:

| Vai | Màn đầu | Đường dẫn |
|---|---|---|
| Quản trị | «Việc của tôi» | `/trang-chu` |
| Marketer | «Việc của tôi» | `/trang-chu` |
| Sale | «Hộp thư» | `/ban-hoi-thoai` |

Đang đăng nhập mà gõ địa chỉ gốc `/`, hoặc bấm logo «AI Closer» trên thanh trên cùng, cũng về đúng màn này. Người mang nhiều vai về màn đầu tiên trong menu gộp của mình.

![Màn đăng nhập AI Closer — ô Email, ô Mật khẩu và nút Đăng nhập](images/dang-nhap-chon-team.png)

<!-- CHỤP: anh=dang-nhap-chon-team · vai=quan-tri · duong=/dang-nhap · cho=«Đăng nhập»
     thao_tac=
     trang_thai=chưa đăng nhập (xoá phiên trước khi chụp); hai ô trống; chưa có hộp lỗi
     danh_dau=(1) «Email» · (2) «Mật khẩu» · (3) «Đăng nhập» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô «Email» | Gõ email công ty, chữ thường |
| (2) | Ô «Mật khẩu» | Gõ mật khẩu Quản trị đã gửi |
| (3) | Nút «Đăng nhập» | Bấm; lỗi (nếu có) hiện trong hộp đỏ ngay trên ô Email |

### Chọn team (Quản trị thuộc nhiều team)

5. Ở màn «Chọn team», đọc dòng «Đang đăng nhập là … — chọn team để vào bảng điều phối.»
   → *Kết quả:* mỗi team bạn thuộc là một thẻ: chữ «Team», tên team, và các vai của bạn trong team đó. Thẻ của team đang mở (khi bạn đổi team từ bên trong) ghi «Đang ở team này». Góc phải có «Đăng xuất».
6. Bấm thẻ team muốn vào.
   → *Kết quả:* hệ vào màn đầu của vai bạn trong team đó.

Sau khi đăng nhập, bạn có 10 phút để chọn team. Để màn này lâu hơn rồi mới bấm thì hệ đưa về màn đăng nhập — đăng nhập lại là được.

![Màn Chọn team — mỗi team một thẻ, kèm vai của bạn trong team đó](images/dang-nhap-chon-team-2.png)

<!-- CHỤP: anh=dang-nhap-chon-team-2 · vai=quan-tri · duong=/chon-team · cho=«Chọn team»
     thao_tac=
     trang_thai=tài khoản quản trị thuộc nhiều team, đã vào một team rồi mới mở /chon-team; lưới thẻ team đã hiện, một thẻ ghi «Đang ở team này»
     danh_dau=(1) «Chọn team» · (2) «Đang ở team này» · (3) «Đăng xuất» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Tiêu đề «Chọn team» và dòng email | Kiểm đúng tài khoản trước khi chọn |
| (2) | Thẻ ghi «Đang ở team này» | Team bạn đang mở; bấm thẻ khác để đổi |
| (3) | «Đăng xuất» | Thoát để đăng nhập bằng tài khoản khác |

### Đổi team khi đang làm việc

7. Nhìn chip tên team ngay cạnh logo trên thanh trên cùng.
   → *Kết quả:* chip có ba dạng:
   - **chỉ là chữ, không có ▾** — bạn thuộc một team, không có gì để đổi;
   - **có ▾, bạn không phải Quản trị** — bấm chip mở menu nhỏ «Đổi sang team», liệt kê các team khác của bạn;
   - **có ▾, bạn là Quản trị** — bấm chip sang màn «Chọn team» (bước 5–6).
8. Bấm tên team muốn sang trong menu «Đổi sang team».
   → *Kết quả:* hệ vào màn đầu của vai bạn ở team mới. Lần đăng nhập sau, hệ vào thẳng team này.

Cách khác: bấm ô tài khoản ở góc phải thanh trên cùng (chữ cái đầu, email và vai), rồi bấm «Đổi team» — mở đúng menu hoặc màn tương ứng như bấm chip. Mục «Đổi team» chỉ có khi bạn thuộc từ hai team trở lên.

![Thanh trên cùng: chip team đã mở menu «Đổi sang team»](images/dang-nhap-chon-team-3.png)

<!-- CHỤP: anh=dang-nhap-chon-team-3 · vai=sale · duong=/ban-hoi-thoai · cho=«Hộp thư»
     thao_tac=bấm chip tên team có dấu ▾ ở cạnh logo «AI Closer»
     trang_thai=tài khoản sale thuộc nhiều team; menu nhỏ «Đổi sang team» đang mở dưới chip, liệt kê các team khác
     danh_dau=(1) «AI Closer» · (2) «Đổi sang team» · (3) «Hộp thư» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Logo «AI Closer», chip tên team đứng ngay sau | Bấm chip để mở menu đổi team |
| (2) | Menu «Đổi sang team» | Bấm tên team muốn sang |
| (3) | Đích «Hộp thư» | Sau khi đổi, bạn về màn đầu của vai ở team mới |

### Đăng xuất

9. Bấm ô tài khoản ở góc phải, rồi bấm «Đăng xuất».
   → *Kết quả:* hệ xoá phiên trên trình duyệt và đưa về màn đăng nhập. Mất mạng lúc bấm thì hệ vẫn đưa về màn đăng nhập.

## Xử lý khi lỗi

| Câu trên màn | Nghĩa | Làm gì |
|---|---|---|
| «Nhập đủ email và mật khẩu.» | Còn ô trống | Điền đủ hai ô |
| «Sai email hoặc mật khẩu.» | Hệ cố ý dùng **một câu** cho bốn trường hợp: không có tài khoản với email này · tài khoản đã khoá · tài khoản chưa đặt mật khẩu · sai mật khẩu | Gõ lại email bằng chữ thường, gõ lại mật khẩu. Vẫn sai thì nhờ Quản trị xem cột «Tài khoản» của bạn ở Cài đặt › «Người và team» («Đã khoá», «Chưa đặt mật khẩu») |
| «Thử sai quá nhiều lần. Đợi 15 phút rồi thử lại.» | Cùng một email đã sai 5 lần liền | Đợi 15 phút tính từ lần sai cuối. Không ai mở khoá sớm được trên màn |
| «Tài khoản chưa được xếp vào team nào. Báo quản trị.» | Mật khẩu đúng nhưng tài khoản chưa có vai ở team nào | Nhờ Quản trị cấp vai cho bạn trong team |
| «Không nối được máy chủ. Thử lại.» | Mất mạng hoặc máy chủ không trả lời | Kiểm mạng rồi bấm lại |
| «Bạn không thuộc team này.» (màn Chọn team) | Bạn không còn vai trong team vừa chọn | Chọn team khác, hoặc nhờ Quản trị cấp lại vai |
| «Không chọn được team này.» · «Không nối được máy chủ. Tải lại trang.» (màn Chọn team) | Máy chủ từ chối hoặc mất mạng | Tải lại trang rồi chọn lại |
| «Không đổi được team: …» (menu «Đổi sang team») | Máy chủ từ chối đổi team, lý do ghi sau dấu hai chấm | Đọc lý do; thường là bạn đã bị rút vai ở team đó |
| Đang làm thì bị đưa về màn đăng nhập | Phiên đã quá 8 tiếng; hoặc tài khoản vừa bị khoá hay bị rút hết vai trong team đang mở (hiệu lực trong khoảng 30 giây) | Đăng nhập lại. Hệ đưa bạn về màn đầu của vai, không quay lại đúng trang đang mở dở — mở lại trang đó bằng menu |

Thêm các ca «không thấy màn», liên kết bị tắt: [Sự cố đăng nhập, quyền và «không thấy màn»](./su-co-dang-nhap-quyen.md).

## Quên mật khẩu

Hệ chưa làm được việc này. Hiện tại: hệ không có đường đặt lại mật khẩu — trên màn không có lối "Quên mật khẩu", và Quản trị chỉ đặt được mật khẩu **đầu tiên** cho tài khoản chưa có mật khẩu (tài khoản đã có mật khẩu thì hệ từ chối: «tài khoản này đã có mật khẩu»). Báo Quản trị của team; việc đặt lại phải nhờ người quản trị hệ thống ([Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md)).
<!-- TBD: mã xác nhận không có đường đặt lại mật khẩu; chưa có quy trình chính thức cho người quên mật khẩu (ai làm, làm ở đâu) — OQ-CH-1 -->

## Trường hợp đặc biệt

- **Nhiều vai trong một team.** Ô tài khoản ghi đủ, ví dụ «… · Quản trị, Marketer»; menu là gộp các màn của mọi vai bạn mang.
- **Vai khác nhau ở mỗi team.** Một người có thể là Marketer ở team này và Sale ở cả ba team. Vai của từng team hiện trên thẻ ở màn «Chọn team» và trong menu tài khoản («vai: …»).
- **Sale dùng chung ba team.** Mỗi lúc Hộp thư chỉ hiện một team — team trên chip. Muốn xem khách của team khác thì đổi team.
- **Dữ liệu tách theo team.** Đổi team là đổi toàn bộ dữ liệu bạn thấy; không có màn nào gộp hai team.
- **Màn «Chọn team» không hiện team kỹ thuật.** Hệ chỉ liệt kê ba team nghiệp vụ bạn có vai.

## Liên quan

[AI Closer làm gì cho bạn](./tong-quan.md) · [Bản đồ giao diện: năm đích và các mục con](./ban-do-giao-dien.md) · [Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md) · [Sự cố đăng nhập, quyền và «không thấy màn»](./su-co-dang-nhap-quyen.md)
