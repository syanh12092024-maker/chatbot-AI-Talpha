# Kết nối tài khoản Pancake

> Trang này hướng dẫn người quản trị thêm, kiểm tra và gỡ tài khoản Pancake — đường bot dùng để đọc tin khách và gửi câu trả lời — ở màn Cài đặt → Kết nối.

**Ai làm được:** Quản trị. Màn Kết nối chỉ mở cho vai Quản trị; vai khác mở đường dẫn sẽ gặp trang «Màn này chỉ dành cho Quản trị».

__Khi nào dùng:__ cài team lần đầu; khi Cài đặt → Bắt đầu hoặc «Hệ còn sống» báo tài khoản Pancake sắp hết hạn, đã hết hạn hoặc chỉ còn một tài khoản sống; khi một tài khoản không còn dùng nữa.

__Trước khi bắt đầu:__
- Bạn có chuỗi tài khoản lấy từ Pancake (dạng ba phần ngăn bằng dấu chấm, bắt đầu kiểu `eyJhbGciOi…`). <!-- TBD: các bước lấy chuỗi tài khoản trong Pancake chưa có nguồn — OQ-QT-1 -->
- **Kho tài khoản Pancake dùng chung cho cả ba team.** Màn ghi thẳng: «Dùng chung cho MỌI team, không phải dữ liệu của riêng team đang mở: thêm hay bỏ một tài khoản là đổi cho cả ba team.»
- Không cần khởi động lại gì: tài khoản mới có hiệu lực ngay sau khi thêm (chậm nhất vài phút nếu lượt nạp lại tức thì bị hụt).

## Đọc bảng «Pancake · đọc tin, gửi tin»

Mở **Cài đặt → Kết nối** (đường dẫn `/ket-noi`). Phần đầu trang là bảng tài khoản, số đếm «{n} token» ở góc phải. Ghi chú dưới bảng: «Thứ tự trên xuống là thứ tự dự phòng. Tài khoản hết hạn tự bị bỏ qua.»

| Cột | Nghĩa |
|---|---|
| «Thứ tự» | Thứ tự bot thử lần lượt. Dòng đầu mang nhãn «Chính» — tài khoản được thử đầu tiên cho mọi page |
| «Tài khoản» | Tên tài khoản Pancake và «đuôi …» — tám ký tự cuối, đủ để nhận ra mà không lộ chuỗi |
| «Nguồn» | «cấu hình máy chủ · chính» / «cấu hình máy chủ · phụ» (khai sẵn trên máy chủ, chỉ xem) · «thêm từ màn này» · «thêm từ màn cũ» |
| «Hạn» | «Còn {n} ngày» (xanh), «Còn dưới 1 ngày» hoặc còn từ 7 ngày trở xuống (vàng), «Đã hết hạn — đang bị bỏ qua» (đỏ), «Không đọc được hạn» (xám) — kèm ngày hết hạn |
| «Page đang dùng» | Số page bot đang đi qua tài khoản này. Trống khi hệ chưa đọc được lõi bot (ghi chú «Đang chưa đọc được lõi bot, nên thiếu cột «page đang dùng».») |
| «Không quyền» | Luôn ghi «chưa đo» — hệ chưa dò được page nào tài khoản này không có quyền |
| Cột cuối | Nút «Bỏ» cho tài khoản thêm từ màn; «Sửa ở cấu hình máy chủ» cho tài khoản khai trên máy chủ |

Tài khoản khai trên máy chủ luôn đứng trước tài khoản thêm từ màn; tài khoản thêm sau đứng cuối danh sách. Màn **không có nút đổi thứ tự**. <!-- TBD: cách đưa tài khoản phủ nhiều page nhất lên dòng «Chính» chưa có nguồn — OQ-QT-2 -->

## Các bước — thêm một tài khoản

1. Mở **Cài đặt → Kết nối**, kéo tới khung «Thêm token».
   → *Kết quả:* thấy ô dán chuỗi và nút «Thử và thêm tài khoản». Dòng gợi ý dưới ô ghi «Tài khoản hỏng bị từ chối, kho không đổi.»
2. Dán chuỗi tài khoản Pancake vào ô.
   → *Kết quả:* ô hết viền đỏ (nếu trước đó bạn bấm khi ô trống).
3. Bấm «Thử và thêm tài khoản».
   → *Kết quả:* hệ gọi thử Pancake một lượt chỉ đọc (không gửi gì cho khách). Thành công thì hiện thông báo «Đã thêm token của «{tên}» — phủ {n} page.», ô được xoá trống, tài khoản mới xuất hiện cuối bảng với nguồn «thêm từ màn này».
4. Nhìn lại các hộp cảnh báo đầu trang (nếu có) và cột «Hạn» của tài khoản vừa thêm.
   → *Kết quả:* không còn hộp đỏ «Không có token Pancake nào…» hay «Cả {n} token đều đã hết hạn…».

![Màn Kết nối — bảng tài khoản Pancake và khung «Thêm token»](images/ket-noi-pancake.png)

<!-- CHỤP: anh=ket-noi-pancake · vai=quan-tri · duong=/ket-noi · cho=«Pancake · đọc tin, gửi tin»
     thao_tac=
     trang_thai=bảng tài khoản có ít nhất hai dòng, dòng đầu mang nhãn «Chính», cột «Hạn» có nhãn màu; bên dưới thấy khung «Thêm token» với nút «Thử và thêm tài khoản»
     danh_dau=(1) «Chính» · (2) «Hạn» · (3) «Thử và thêm tài khoản» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Nhãn «Chính» ở dòng đầu | Tài khoản bot thử đầu tiên — nên là tài khoản phủ nhiều page nhất |
| (2) | Cột «Hạn» | Vàng là sắp hết hạn — thêm tài khoản mới trước khi nó đỏ |
| (3) | Nút «Thử và thêm tài khoản» | Dán chuỗi rồi bấm; tài khoản hỏng bị từ chối, kho không đổi |

## Các bước — gỡ một tài khoản

1. Ở dòng tài khoản cần gỡ, bấm «Bỏ».
   → *Kết quả:* hộp xác nhận «Bỏ token của «{tên}»?» nói rõ «Kho dùng chung mọi team.» và số page sẽ bị ảnh hưởng: «{n} page đang dùng token này sẽ tự dò sang token khác.» (hoặc «Không page nào đang dùng token này.»).
2. Bấm «Bỏ token».
   → *Kết quả:* thông báo «Đã bỏ token.», dòng biến khỏi bảng. Các page đang dùng tài khoản đó tự chuyển sang tài khoản kế tiếp còn sống.

Tài khoản nguồn «cấu hình máy chủ…» không có nút «Bỏ» — muốn gỡ thì nhờ người quản trị hệ thống. Xem [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md).

## Cảnh báo đầu trang và việc cần làm

| Câu trên màn | Làm gì |
|---|---|
| «Không có token Pancake nào — bot không đọc và không gửi được tin nào.» | Thêm ngay một tài khoản |
| «Cả {n} token đều đã hết hạn — bot đang không gọi được Pancake.» | Thêm tài khoản còn hạn; bot đang không đọc, không gửi |
| «Chỉ còn MỘT token sống — token này chết là mất hẳn, không có gì đỡ.» | Thêm ít nhất một tài khoản dự phòng |
| «{n} token sắp hết hạn trong 7 ngày: …» | Lấy chuỗi mới và thêm trước ngày hết hạn |
| «{n} token đã hết hạn, đang bị bỏ qua — nên gỡ cho đỡ rối.» | Bấm «Bỏ» ở các dòng đỏ |
| «Thứ tự dự phòng đang đặt sai: token CHÍNH ("…") chỉ phủ {n} page, trong khi "…" phủ {m} page…» | Tài khoản phủ nhiều page nên đứng đầu; màn không đổi thứ tự được (xem ghi chú ở trên) |

## Xử lý khi lỗi

Bấm khi ô còn trống: dòng gợi ý ngay dưới ô đổi thành «Dán token vào ô trước.» và ô viền đỏ. Các lỗi khác hiện thành hộp đỏ «Không thêm được token» ở đầu trang, kèm câu cụ thể:

- «Pancake từ chối token (HTTP {mã}) — đăng nhập lại lấy token mới?» — chuỗi sai hoặc đã bị Pancake thu hồi. Lấy chuỗi mới rồi thử lại.
- «Không gọi được Pancake để thử token: …» — máy chủ không gọi được Pancake lúc đó. Thử lại sau ít phút.
- «Không phải JWT Pancake hợp lệ (phải có ba phần a.b.c)» — chuỗi bị dán thiếu hoặc thừa ký tự.
- «Token đã hết hạn {ngày}» — chuỗi đã quá hạn, lấy chuỗi mới.
- «Token này đã có trong kho» — tài khoản này đã nằm trong bảng.
- «Không mã hoá được token: … — token KHÔNG được ghi.» — máy chủ thiếu cấu hình mã hoá. Nhờ người quản trị hệ thống.

Hộp đỏ «Máy chủ chưa nối kho tài khoản Pancake» (kèm «Đây là lỗi dựng ứng dụng, KHÔNG phải «hệ thống chưa có tài khoản nào».»): ô dán và nút thêm bị khoá, dòng gợi ý dưới ô nhắc xem cảnh báo đầu trang. Bạn không sửa được trên màn — báo người quản trị hệ thống. Lỗi khi gỡ hiện thành hộp «Không bỏ được token».

__Liên quan:__ [Thêm kho hàng, kéo danh mục và quét page](./them-kho-hang-keo-du-lieu.md) · [Các đèn của «Hệ còn sống»](./tra-cuu-den-he-con-song.md) · [Bắt đầu nhanh cho Quản trị: đưa page đầu tiên tới lúc bật bot](./bat-dau-nhanh-quan-tri.md)
