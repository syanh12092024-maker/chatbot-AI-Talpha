# Tra nhật ký: ai đã làm gì, lúc nào

> Trang này hướng dẫn người quản trị tra màn Nhật ký để biết ai đã bấm gì, máy đã tự làm gì, lúc nào, trên đối tượng nào — và xem trạng thái trước/sau của từng thao tác.

**Ai làm được:** Quản trị. Vai Quản lý (vai cũ, không còn cấp mới) cũng mở được. Nhật ký **không ai sửa hay xoá được** — kể cả Quản trị.

__Khi nào dùng:__ một page tự nhiên bật hoặc tắt bot; giá, kịch bản hay quy tắc bị đổi mà không ai nhận; cần biết ai đã cấp vai, chuyển page, thay khoá model; kiểm ai đăng nhập sai nhiều lần hoặc bị chặn vì không đủ vai.

__Trước khi bắt đầu:__
- Nhật ký hiện dòng của **team đang mở**. Việc ở team khác: đổi team rồi tra.
- Màn tách hai làn: **«Việc người làm»** (có người bấm — mặc định) và **«Việc máy làm»** (việc nền và dấu vết đọc dữ liệu). Làn máy thường rất đông; tách ra để dòng thao tác thật không bị chôn.

## Các bước

1. Mở **Cài đặt → Nhật ký** (đường dẫn `/nhat-ky`).
   → *Kết quả:* tab «Việc người làm» đang chọn; mỗi tab kèm số dòng. Dòng đếm cạnh ô lọc ghi «{n} dòng ở làn này · {m} cả bảng» (thêm «· có thể còn nữa» khi bảng dài hơn phần màn đọc).
2. Chọn làn: «Việc người làm», «Việc máy làm» hoặc «Tất cả».
   → *Kết quả:* bảng đổi theo làn, về trang đầu.
3. (Tuỳ chọn) Chọn một hành động trong ô «Mọi hành động». Ô chia theo nhóm; tên nhóm hiện không dấu, ví dụ «dang nhap», «an ninh», «model», «dieu phoi», «cau hinh team», «page bot», «ket noi», «san pham», «kich ban».
   → *Kết quả:* chỉ còn dòng của hành động đó.
4. Đọc bảng: mỗi dòng một câu — «Lúc» (ngày/tháng giờ:phút; khác năm thì thêm năm) · «Ai» (email người làm; dòng máy mang nhãn «máy» kèm tên việc như «bot trả lời», «tạo đơn POS», «đồng bộ người theo HRM») · «Việc» (tên hành động · loại đối tượng · tên đối tượng, ghi chú ngay dưới).
   → *Kết quả:* bạn đọc được «lúc nào · ai · làm gì · lên cái gì».
5. Bấm «Xem» ở cuối dòng để mở chi tiết (nút chỉ có ở dòng có lưu trạng thái trước/sau).
   → *Kết quả:* ngăn bên phải mở ra với «Đối tượng», «Ghi chú», hai khối «Trước» và «Sau» (dữ liệu trước và sau thao tác, «(không có)» khi trống) và «Mã hành động». Bấm × để đóng.
6. Lật trang bằng «Trước» / «Sau» (100 dòng một trang).
   → *Kết quả:* dòng chữ «Trang {x} / {y}».

![Màn Nhật ký — hai làn, ô lọc hành động, bảng mỗi dòng một câu](images/tra-nhat-ky.png)

<!-- CHỤP: anh=tra-nhat-ky · vai=quan-tri · duong=/nhat-ky · cho=«Việc người làm»
     thao_tac=
     trang_thai=tab «Việc người làm» đang chọn, các tab có số đếm; ô «Mọi hành động»; bảng có cột «Lúc», «Ai», «Việc», vài dòng có nút «Xem»
     danh_dau=(1) «Việc người làm» · (2) «Mọi hành động» · (3) «Xem» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ba tab làn «Việc người làm» · «Việc máy làm» · «Tất cả» | Mặc định là việc người làm |
| (2) | Ô «Mọi hành động» | Lọc theo một hành động cụ thể |
| (3) | Nút «Xem» | Mở ngăn chi tiết với trạng thái trước/sau |

## Gửi đúng lát cắt cho người khác

Làn, hành động đang lọc và trang đang xem nằm sẵn trên đường dẫn (ví dụ `/nhat-ky?lan=may&hanhDong=…&trang=1`). Chép đường dẫn gửi cho người khác là họ mở ra đúng lát cắt bạn đang xem (họ cũng phải ở cùng team).

## Một số hành động hay tra

| Muốn biết | Chọn hành động |
|---|---|
| Ai bật/tắt bot một page | «Bật/tắt bot AI cho page» |
| Ai cấp, rút vai; ai tạo tài khoản | «Cấp vai cho người trong team» · «Rút vai của người trong team» · «Tạo người dùng mới» |
| Ai chuyển page sang team khác | «Chuyển page sang team khác» |
| Ai đổi model, thay khoá, thử model | «Đổi cấu hình model» · «Đổi khoá API» · «Thử model một lượt» |
| Ai thêm/bỏ tài khoản Pancake, kho hàng | «Thêm token Pancake» · «Bỏ token Pancake» · «Thêm kết nối POS» · «Sửa kết nối POS» · «Bật/tắt kết nối POS» · «Bỏ kết nối POS» |
| Ai đăng nhập, đăng nhập sai, bị chặn | «Đăng nhập» · «Đăng nhập thất bại» · «Chặn vì không đủ vai» · «Chặn truy cập xuyên team» |

Các dòng do lượt đồng bộ HRM ghi (ví dụ «Tạo tài khoản từ HRM») không nằm trong nhóm nào của ô lọc — xem chúng mà không lọc hành động: lượt bấm «Áp dụng» nằm ở làn «Việc người làm», lượt tự động nằm ở làn «Việc máy làm» (nhãn «máy · đồng bộ người theo HRM»).

## Lưu ý

- Màn đọc một lượng dòng gần nhất rồi tách làn; khi dòng đếm có chữ «có thể còn nữa» thì dòng cũ hơn có thể không hiện. Lọc theo hành động để thu hẹp.
- Hộp vàng «{x}% số dòng gần đây là việc MÁY…» là cảnh báo về chính cuốn nhật ký: dòng thao tác thật đang bị chôn dưới dòng máy. Ở làn «Việc người làm» thì không bị ảnh hưởng.
- Màn không có ô lọc theo ngày hay theo người.
- Dòng đồng bộ HRM về tài khoản (tạo, gắn hồ sơ, khoá, mở khoá) chỉ ghi vào nhật ký của **một** team, không phải cả ba; dòng cấp/rút vai ghi vào team của vai đó. Không thấy ở team này thì đổi team rồi tra.
- Khoá API và mật khẩu không bao giờ được ghi vào nhật ký; dòng chỉ ghi tên tài khoản, có đổi khoá hay không.

## Xử lý khi lỗi

- «Chưa có thao tác nào do người làm» kèm «Đây là «chưa ai làm gì» trong khoảng đang xem, không phải nhật ký hỏng.» — đúng là chưa có thao tác nào; thử làn «Tất cả».
- «Không dòng nào khớp bộ lọc» — đổi làn hoặc chọn lại «Mọi hành động».
- Hộp đỏ «Không tải được nhật ký» — tải lại trang; vẫn lỗi thì gửi câu lỗi cho người quản trị hệ thống.

__Liên quan:__ [Sự cố đăng nhập, quyền và «không thấy màn»](./su-co-dang-nhap-quyen.md) · [Tạo người dùng, cấp vai và đặt mật khẩu đầu tiên](./tao-nguoi-dung.md) · [Bật hoặc tắt bot cho một page](./bat-tat-bot.md)
