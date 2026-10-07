# Việc phải nhờ người quản trị hệ thống

> Bảng tra những việc người vận hành không làm được trên màn và phải nhờ người quản trị hệ thống (người sửa được cấu hình máy chủ — khác với Quản trị team): việc gì, màn nói ở đâu, vì sao màn không làm được, và cần đưa cho họ thông tin gì.

Đối chiếu với hệ ngày 05/10/2026.

Khi nhờ, luôn gửi kèm: **tên team đang mở**, **ảnh chụp màn có câu báo**, **giờ bạn thấy**. Các cột dưới chỉ ghi thêm thông tin riêng của từng việc.

## Từ Cài đặt → Bắt đầu, khối «Việc phải nhờ người quản trị hệ thống»

Màn ghi dưới khối: «… nằm ở cấu hình máy chủ, màn không sửa được — nhờ người quản trị hệ thống. Sửa xong thì bấm «Kiểm lại»». Khối hiện có hai việc (chữ trên màn còn viết «Ba việc này»).

| Việc (tên trên màn) | Nhãn | Vì sao không làm trên màn | Đưa cho họ |
|---|---|---|---|
| «Cho bot gửi tin cho khách» | «Đang mở» / «Đang đóng» | Cửa gửi tin là van ở cấu hình máy chủ, chung cho cả máy. Màn ghi: «Chưa mở thì bot vẫn đọc tin, vẫn nghĩ ra câu trả lời, nhưng KHÔNG gửi đi.» Trên trang một page, điều kiện này hiện là «Máy chủ chưa mở cửa gửi tin» | Page nào cần bot gửi thật; đã chấm kết quả chạy thử chưa ([Xem câu bot soạn khi đang chạy thử](./xem-chay-thu.md)) |
| «Bật cách ghép lời mới» | «Đang mở» / «Đang đóng» | Van ở cấu hình máy chủ. «Chưa bật thì bot dùng bản ghép lời cũ, không đọc kịch bản và quy tắc từ cơ sở dữ liệu.» Trên trang một page hiện là «Máy chủ chưa bật cách ghép lời mới» | Page nào đang chờ; lời bot và quy tắc chung đã soạn xong chưa |

## Từ «Hệ còn sống» và dải trạng thái

| Việc | Màn nói | Vì sao không làm trên màn | Đưa cho họ |
|---|---|---|---|
| Mở cửa ghi vào lõi bot | Đèn «Lõi bot» vàng: «Cửa ghi vào lõi bot đang ĐÓNG: {lý do}.» · «Nhờ người quản trị hệ thống mở rồi khởi động lại dịch vụ» | Khoá đặt ở cấu hình máy chủ, cần khởi động lại dịch vụ | Nguyên câu lý do sau dấu hai chấm |
| Khởi động lại máy chạy bot | Đèn «Máy chạy bot» đỏ: «… máy chạy bot đang đứng …» · «Nhờ người quản trị hệ thống khởi động lại máy chạy bot.» | Không màn nào khởi động lại được máy chạy bot | Số tin đang chờ và số phút chờ trên đèn |
| Trả tin bị giữ giữa chừng về hàng chờ | Đèn «Máy chạy bot» đỏ: «… máy chạy bot đã cầm tin rồi tắt. Tin ấy sẽ không tự chạy tiếp.» · «Nhờ người quản trị hệ thống xem máy chạy bot còn chạy không, rồi trả những tin ấy về hàng chờ.» | Tin kẹt không tự chạy tiếp, màn không có nút trả về | Số tin kẹt và số phút trên đèn |
| Máy chạy bot quá tải kéo dài | Đèn vàng: «… vẫn đang xử nhưng không kịp.» · «Theo dõi thêm ít phút. Còn dồn thì báo người quản trị hệ thống.» | Tăng sức máy là việc của máy chủ | Số tin chờ, đã dồn bao lâu |
| Nạp Sổ AI | Đèn «Sổ AI» đỏ: «Sổ AI đang TRỐNG. …» · «Nhờ người quản trị hệ thống chạy bộ nạp Sổ AI» | Bộ nạp chạy trên máy chủ | — |
| Mở khoá công tắc bot | Tất cả page: «Công tắc bot đang bị khoá tay trên máy chủ này (lúc sự cố hoặc máy demo). Nhờ người quản trị hệ thống mở khoá.» | Khoá tay ở cấu hình máy chủ | Câu lý do trong ngoặc (nếu có) |
| Sửa lỗi «chưa nối» | Các câu «Chưa đo được: chưa nối bộ đọc …», «… đây là lỗi dựng ứng dụng», «Nhờ người quản trị hệ thống xem dịch vụ … rồi khởi động lại» ở Hệ còn sống, Bắt đầu, Việc của tôi, Số liệu, Chi phí AI, Sản phẩm | Máy chủ dựng thiếu một mối nối lúc khởi động — không phải dữ liệu của bạn thiếu | Tên màn và nguyên câu báo |

## Từ Cài đặt → Kết nối

| Việc | Màn nói | Vì sao không làm trên màn | Đưa cho họ |
|---|---|---|---|
| Gỡ hoặc thay tài khoản Pancake khai trên máy chủ | Cột cuối bảng tài khoản: «Sửa ở cấu hình máy chủ» | Tài khoản nguồn «cấu hình máy chủ · chính/phụ» chỉ xem được | Tên tài khoản và «đuôi …» trên bảng |
| Đổi thứ tự dự phòng tài khoản Pancake | Cảnh báo «Thứ tự dự phòng đang đặt sai: …» | Màn không có nút đổi thứ tự <!-- TBD: đổi thứ tự có phải việc của người quản trị hệ thống không — OQ-QT-2 --> | Nguyên câu cảnh báo (có tên tài khoản và số page) |
| Khai cấu hình mã hoá | «Không mã hoá được token: … — token KHÔNG được ghi.» hoặc «Không mã hoá được khoá API POS: … — kết nối KHÔNG được ghi.» | Thiếu cấu hình máy chủ | Nguyên câu lỗi |
| Nối kho tài khoản Pancake | Hộp «Máy chủ chưa nối kho tài khoản Pancake» · «Báo người quản trị hệ thống xem nhật ký khởi động.» | Lỗi dựng ứng dụng | — |
| Mở đường sửa kết nối kho hàng | Nút «Thêm kho POS» và cột «Việc» không hiện | Máy chủ chưa nối đường ghi | — |
| Nối bộ nạp lại dữ liệu | Nút nạp lại mang nhãn «Chưa khả dụng»: «… máy chủ chưa nối bộ nạp dữ liệu — đây là lỗi cấu hình…» | Lỗi cấu hình máy chủ | — |
| Nối HRM | Phần «HRM · hồ sơ nhân sự»: «Chưa nối vào máy chủ» hoặc «Đọc HRM hỏng»; nút «Lấy người từ HRM (BigQuery)» mờ | Thiếu khoá đọc HRM trên máy chủ, hoặc khoá hỏng | Câu «Vì sao» trên màn |

## Từ Cài đặt → Người và team, Model, Vận hành

| Việc | Màn nói | Vì sao không làm trên màn | Đưa cho họ |
|---|---|---|---|
| Nối đồng bộ người theo HRM | «Đồng bộ người theo HRM: máy chủ chưa nối — …»; «máy chủ chưa nối đồng bộ HRM …» khi bấm «Đặt mật khẩu» | Cấu hình máy chủ | — |
| Bật lượt đồng bộ HRM tự động (mỗi 24 giờ) | «Người theo HRM: chỉ khi Quản trị bấm (lượt tự động chưa bật) …» | Cấu hình máy chủ | Đồng ý để lượt tự động chạy (các rào an toàn vẫn giữ) |
| Nối đường chuyển page | Khung chuyển page chỉ còn một dòng mờ kèm lý do | Lỗi dựng ứng dụng | — |
| Đổi model mặc định hoặc khoá chung của máy chủ | Thẻ «Trả lời khách»: «Bot đang gọi {model} — model của MÁY CHỦ …, khoá chung của máy chủ …» | Model và khoá mặc định nằm ở cấu hình máy chủ, dùng khi team chưa lưu cấu hình. Cách không cần nhờ: bấm «Lưu cấu hình» và dán khoá riêng cho team | Model và nhà muốn dùng |
| Nối đường đo model của bot | «Chưa nối đường chọn model của bot — không thử được …» | Lỗi dựng ứng dụng | — |
| Bật hoặc tắt chế độ chạy thử | Tab «Diễn tập (không gửi)»: «Chế độ diễn tập đang TẮT» | Cấu hình máy chủ, áp cho cả máy chủ | Muốn bật hay tắt, từ lúc nào |
| Đổi danh sách thẻ chặn, hoặc tắt lọc «chỉ hội thoại chưa đọc» | Tab «Tin bị lọc», lý do «Có thẻ chặn» / «Đã có người mở» | Cấu hình máy chủ của bộ nạp tin | Tên thẻ cần thêm/bỏ; mã hội thoại bị bắt oan |
| Gỡ mốc kẹt của bộ nạp tin | Tab «Tin bị lọc»: dòng «Đang chờ khách gõ xong» còn sau 5 phút — màn coi là mốc bị kẹt | Màn không có nút gỡ | Tên page, mã hội thoại, cột «Kéo dài» |
| Nối dữ liệu cho màn Vận hành | «Môi trường này chưa nối dữ liệu vận hành …» | Lỗi dựng ứng dụng | — |

## Việc hệ chưa làm được trên màn

| Việc | Hiện trạng |
|---|---|
| Đặt lại mật khẩu cho tài khoản đã có mật khẩu (người dùng quên mật khẩu) | Hệ chưa làm được việc này. Màn ghi: hệ «CHƯA có màn đặt lại mật khẩu». <!-- TBD: ai làm và làm thế nào khi người dùng quên mật khẩu — OQ-QT-5 --> |
| Khoá hoặc mở khoá tay một tài khoản | Hệ chưa làm được việc này trên màn; tài khoản gắn HRM được lượt đồng bộ HRM tự khoá/mở khoá. <!-- TBD: khoá/mở khoá tài khoản tạo tay — OQ-QT-6 --> |

__Liên quan:__ [Bắt đầu nhanh cho Quản trị: đưa page đầu tiên tới lúc bật bot](./bat-dau-nhanh-quan-tri.md) · [Các đèn của «Hệ còn sống»](./tra-cuu-den-he-con-song.md) · [Điều kiện «Bật được chưa» và cột «Còn thiếu»](./tra-cuu-bat-duoc-chua.md)
