# Sự cố đơn: không duyệt được, nghi trùng, van tạo đơn đóng

> Bảng tra theo triệu chứng cho lúc duyệt, sửa hoặc từ chối đơn Messenger trong Hộp thư: câu hiện trên màn nghĩa là gì, vì sao, và ai gỡ bằng cách nào.

**Vai đọc:** Sale · Quản trị

Đối chiếu với hệ ngày 05/10/2026.

Nguyên tắc của hệ khi tạo đơn: **thà không tạo còn hơn tạo nhầm**. Mỗi lần bấm duyệt, hệ chạy lại đủ các cửa kiểm; cửa nào chưa tra được cũng tính là chặn. Bị chặn là hành vi đúng, không phải hệ hỏng — đơn vẫn ở «Chờ duyệt» và không có đơn nào được tạo. Cách duyệt bình thường: [Duyệt, sửa hoặc từ chối đơn Messenger chờ duyệt](./duyet-don-messenger.md).

## 1. Cảnh báo trên thẻ đơn (trước khi bấm)

| Triệu chứng trên màn | Nguyên nhân | Cách xử lý (ai làm) |
|---|---|---|
| Hộp «Cửa tạo đơn POS đang ĐÓNG trên máy chủ» — «Duyệt lúc này sẽ không tạo đơn — đơn vẫn ở «Chờ duyệt». Sửa và từ chối vẫn làm được.»; nút «Duyệt → Chờ in» mờ (rê chuột: «Cửa tạo đơn POS đang đóng») | Cửa tạo đơn trên kho hàng đang đóng ở cấu hình máy chủ — mọi lượt duyệt đều không tạo được đơn | **Sale:** không duyệt; vẫn sửa / từ chối được; báo quản trị team. **Quản trị:** nhờ người quản trị hệ thống mở cửa này — [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md). Đơn vẫn chờ, mở cửa xong thì duyệt lại |
| Hộp «Nghi trùng đơn» kèm lý do bắt đầu bằng «trung: …» | Lần kiểm chống trùng gần nhất thấy dấu hiệu khách đã có đơn (tên nguồn sau dấu «:», xem mục 3) | **Sale:** kiểm theo nguồn ở mục 3 trước khi làm gì tiếp |
| Hộp «Nghi trùng đơn» kèm lý do bắt đầu bằng «unknown_la_dong: …» | Lần kiểm gần nhất **chưa tra được** một nguồn — chưa tra được cũng bị coi là trùng | **Sale:** xem nguồn ở mục 3; nhiều nguồn tự hết khi duyệt lại lúc khác |
| Hộp «Khách {tầng hoàn} — hoàn {N}% trên đơn cũ» — «Gọi xác nhận trước khi duyệt.» | Khách thuộc tầng «Cần theo dõi · hoàn 30–65%» hoặc «Hay hoàn hàng · hoàn ≥65%» | **Sale:** gọi xác nhận với khách rồi mới duyệt. Hệ không chặn duyệt vì tầng hoàn — [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md) |
| Tab «Đơn chờ» có đơn của khách nhưng thẻ trong hội thoại hiện một đơn khác, hoặc không hiện | Thẻ chỉ hiện **đơn chờ duyệt mới nhất** của hội thoại; đơn đã duyệt / đã loại thì thẻ đổi nhãn và khoá | **Sale:** từ chối đơn mới nhất nếu là bản thừa rồi mở lại hội thoại; hoặc **Quản trị** xử lý ở Cài đặt › Vận hành, tab «Đơn chờ duyệt», nút «Xem / xử lý đơn» |

## 2. Bấm duyệt — hộp vàng «Chưa tạo đơn»

Thân hộp liệt kê các cửa chưa qua, ngăn bằng «; ». Mỗi mục có dạng «cua{số}:{lý do}». Cùng lý do cũng hiện ở mục «Kiểm tra gần nhất» của form (ví dụ «Giá bán: Chưa đạt · lech_bang_gia»).

| Mục trong «Chưa tạo đơn» | Nguyên nhân | Cách xử lý (ai làm) |
|---|---|---|
| «cua1:thieu_truong: {các trường}» — trường là `ten` · `sdt` · `dia_chi` · `so_luong` · `tong_tien` | Đơn thiếu tên, số điện thoại, địa chỉ, số lượng hoặc tổng tiền | **Sale:** bấm «Sửa đơn», điền ô còn thiếu (hỏi lại khách trên Pancake nếu cần). Thiếu tổng tiền thì chọn «Sản phẩm» và «Số lượng» — lưu xong tổng tiền tự đặt theo gói. Bấm «Lưu thông tin» rồi duyệt lại |
| «cua2:unknown_chua_co_bang_gia» | Page chưa có gói giá nào để đối chiếu | **Quản trị:** gắn page vào sản phẩm và nhập bảng giá — [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) · [Sửa bảng giá của sản phẩm ở một thị trường](./sua-bang-gia.md). Sale chờ rồi duyệt lại |
| «cua2:khong_co_tong» | Đơn không có tổng tiền | **Sale:** chọn «Sản phẩm» + «Số lượng», «Lưu thông tin», duyệt lại |
| «cua2:lech_bang_gia» | Tổng tiền không khớp gói nào của page (sai số lượng, sai tiền tệ, hoặc bot ghi giá khác bảng) | **Sale:** «Sửa đơn», chọn đúng gói khách đã chốt, «Lưu thông tin» (tổng đặt lại theo gói), duyệt lại. Khách chốt một giá không có trong bảng: hệ không tạo đơn với giá ngoài bảng — báo quản trị |
| «cua2:nhieu_goi_cung_khop» | Hai gói trở lên cùng số lượng, cùng giá — hệ không biết chọn gói nào | **Quản trị:** sửa bảng giá cho hết trùng gói |
| «cua3:trung: …» hoặc «cua3:unknown_la_dong: …» | Cửa chống trùng chặn — xem nguồn ở mục 3 | Theo mục 3 |

## 3. Năm nguồn chống trùng

Tên nguồn hiện sau «trung:» (thấy trùng) hoặc «unknown_la_dong:» (chưa tra được), có thể nhiều nguồn ngăn bằng dấu phẩy.

| Nguồn trên màn | «trung:» nghĩa là | «unknown_la_dong:» nghĩa là | Cách xử lý (ai làm) |
|---|---|---|---|
| `a_so_ai` | Bot đã ghi một lần chốt đơn khác trước đó trong chính hội thoại này | Hệ tra sổ của bot bị lỗi | **Sale:** kiểm đơn cũ của khách ([Tìm khách theo số điện thoại và xem mọi đơn của khách](./tim-khach.md)). Đơn chờ này là bản thừa thì «Loại đơn» kèm lý do. Lỗi tra: duyệt lại sau ít phút |
| `b_pos_song` | Kho hàng **đã có** một đơn chưa huỷ / chưa hoàn gắn hội thoại này (có thể sale đã tạo tay) | Không hỏi được kho hàng: page chưa nối được cửa hàng trên kho hàng, hội thoại chưa có mã Pancake, kho hàng không phản hồi, hoặc cửa hàng quá nhiều trang đơn | **Sale:** «trung» → đơn đã có, từ chối đơn chờ với lý do. «unknown» → duyệt lại sau ít phút; lặp lại thì báo **Quản trị** kiểm kết nối kho hàng của page — [Thêm kho hàng, kéo danh mục và quét page](./them-kho-hang-keo-du-lieu.md) |
| `c_trang_thai_hoi_thoai` | Hội thoại đang ở giai đoạn «Sau bán» — đơn đã được xử lý | (không có) | **Sale:** kiểm đơn đã có; đơn chờ thừa thì từ chối |
| `d_fb_commerce` | Trong hội thoại có câu xác nhận đơn của công cụ ngoài (ví dụ «Your order has been confirmed», «đơn hàng của bạn») | Hệ không giữ tin nào của hội thoại để soi | **Sale:** «trung» → kiểm đơn đã tạo ngoài hệ trên kho hàng. «unknown» → hệ chưa duyệt được; xem mục 6 |
| `e_kiem_trung` | Cùng số điện thoại (đã chuẩn hoá) đã có đơn trong 7 ngày, ở luồng Messenger hoặc trang bán hàng | Đơn chưa có số điện thoại, hoặc số không đọc được | **Sale:** «trung» → xem «Mọi đơn của khách» ở màn Tìm khách, quyết giữ đơn nào; đơn chờ thừa thì từ chối. «unknown» → điền đúng «Số điện thoại», «Lưu thông tin», duyệt lại |

<!-- TBD: quy trình chốt khi nghi trùng giữa hai luồng (ai quyết, gộp hay huỷ trên kho hàng) — OQ-SA-4 -->

## 4. Bấm duyệt — câu lỗi đỏ

| Triệu chứng trên màn | Nguyên nhân | Cách xử lý (ai làm) |
|---|---|---|
| «Đánh dấu «Tôi đã kiểm tra thông tin đã lưu» trước khi duyệt.» | Chưa đánh dấu ô xác nhận | **Sale:** đánh dấu rồi bấm lại |
| «Bạn đã sửa thông tin — lưu đơn trước khi duyệt.» | Có thay đổi chưa lưu | **Sale:** bấm «Lưu thông tin» trước |
| Câu có chữ «cửa TẠO ĐƠN POS ĐÓNG (fail-CLOSED)» | Cửa tạo đơn trên máy chủ đang đóng (bấm từ nút trong form khi thẻ đã báo đóng) | Như dòng đầu mục 1 — **Quản trị** nhờ người quản trị hệ thống |
| Câu bắt đầu «taoDon: thiếu …» có chữ «kho_hang» | Ô «Mã kho POS» trống | **Sale:** điền «Mã kho POS», «Lưu thông tin», duyệt lại. <!-- TBD: sale lấy mã kho ở đâu — OQ-SA-7 --> |
| Câu bắt đầu «taoDon: thiếu …» có chữ «san_pham_ma» | Sản phẩm đang chọn không mang mã món trên kho hàng | **Sale:** chọn lại «Sản phẩm»; không có món đúng thì báo **Quản trị** kiểm sản phẩm của page — [Gộp món POS thành một sản phẩm theo SKU](./gop-mon-pos.md) |
| Câu bắt đầu «taoDon: thiếu …» có chữ «he_so_te:» | Tiền tệ của đơn lạ hoặc trống | **Quản trị:** kiểm tiền tệ trong bảng giá của sản phẩm |
| «taoDon: mã biến thể thuộc shop … nhưng kết nối POS của thị trường "…" là shop … — gửi đi là tạo đơn NHẦM SHOP.» | Món đang chọn thuộc cửa hàng khác với cửa hàng của page | **Quản trị:** kiểm page đã gắn đúng sản phẩm, đúng thị trường |
| «team … không có kết nối POS đang bật cho thị trường "…" — …» | Team chưa có kết nối kho hàng đang bật cho thị trường đó | **Quản trị:** [Thêm kho hàng, kéo danh mục và quét page](./them-kho-hang-keo-du-lieu.md) |
| «POS chưa xác nhận tạo đơn (HTTP {mã})» hoặc «POS không phản hồi lượt TẠO ĐƠN (shop …): …» | Kho hàng từ chối hoặc không trả lời lượt tạo đơn | **Sale:** đừng bấm duyệt dồn. Mở kho hàng kiểm đơn đã vào chưa. Mã HTTP dạng 4xx (trừ 408) là kho hàng từ chối rõ ràng, chưa tạo đơn — duyệt lại được; từ chối lặp lại thì báo **Quản trị**. Các trường hợp còn lại (không phản hồi, mã 5xx, 408) có thể đơn đã vào kho — lượt duyệt sau sẽ bị chặn bằng câu ở dòng dưới |
| «Hàng chờ #{số} có {N} lượt POST không biết kết cục (nhật ký hai pha mồ côi) — TỪ CHỐI tạo lại. Người phải mở POS xem đơn đã vào chưa; thà một đơn làm tay còn hơn hai kiện COD.» | Một lượt tạo đơn trước đã gửi đi mà mất phản hồi — có thể đơn đã nằm trên kho hàng | **Sale:** mở kho hàng tìm đơn của khách. Đã có → «Loại đơn» đơn chờ, lý do ghi rõ «đã có trên kho hàng». Chưa có → tạo đơn bằng tay trên kho hàng rồi loại đơn chờ kèm lý do. <!-- TBD: xác nhận quy trình làm tay khi lượt tạo đơn mất phản hồi (ai tạo tay, có báo quản trị không) — OQ-SA-6 --> |
| «Hàng chờ #{số} ĐÃ có một lượt POST thành công trên POS (…) — TỪ CHỐI tạo lại. …» | Đơn đã được kho hàng nhận ở một lượt trước | **Sale:** mở kho hàng xác nhận đơn, rồi loại đơn chờ kèm lý do |
| «Hàng chờ #{số} đã sinh đơn #{số} — không tạo lần hai.» | Đơn chờ này đã tạo đơn rồi | Không cần làm gì — tải lại trang |
| «Hàng chờ #{số} đang ở "{trạng thái}" … — lượt duyệt này KHÔNG chạy. Đây là hành vi đúng, không phải lỗi.» | Đơn đã được duyệt hoặc loại | Tải lại trang |
| «Đơn đã đổi; tải lại trước khi duyệt» · «Tải lại đơn trước khi duyệt» | Đơn vừa bị sửa ở nơi khác sau khi bạn mở | Tải lại trang, kiểm lại, duyệt lại |
| «Không thể thực hiện. Dữ liệu có thể đã thay đổi; tải lại và thử lại.» | Đơn đang bị một thao tác khác giữ | Tải lại rồi thử lại |
| «Môi trường này chưa nối dữ liệu đơn và hội thoại.» | Máy chủ chưa nối dữ liệu đơn | **Quản trị** nhờ người quản trị hệ thống |
| «Yêu cầu ghi không hợp lệ» | Trình duyệt gửi yêu cầu sai cách (thường do trang cũ hoặc mở từ trang khác) | Tải lại trang Hộp thư rồi làm lại |

## 5. Khi lưu hoặc từ chối

| Triệu chứng trên màn | Nguyên nhân | Cách xử lý (ai làm) |
|---|---|---|
| «Không có gói giá hợp lệ cho sản phẩm / số lượng này» | Món hết hàng, hoặc page không bán gói số lượng đó | **Sale:** chọn món / số lượng khác. Đúng là thiếu gói → **Quản trị** sửa bảng giá |
| «Dữ liệu đơn không hợp lệ» | Số lượng không phải số nguyên từ 1 trở lên, hoặc một ô quá dài | **Sale:** sửa ô sai rồi lưu lại |
| «Đơn đã đổi hoặc đã xử lý; tải lại» | Đơn đã được sửa / duyệt / loại ở nơi khác | Tải lại trang |
| «Lý do loại đơn cần ít nhất 5 ký tự.» · «Lý do cần 5–300 ký tự» | Lý do quá ngắn hoặc quá dài | Sửa lý do |
| «Hàng chờ #{số} đang ở "…" — không loại được nữa.» | Đơn đã duyệt hoặc đã loại | Không cần làm gì; đơn đã duyệt muốn huỷ thì huỷ bằng tay trên kho hàng |
| «Không mở được đơn» kèm «Không tìm thấy đơn» | Đơn không thuộc team đang mở | Kiểm chip team |

## 6. Hiện tượng khác

| Triệu chứng | Nguyên nhân | Cách xử lý (ai làm) |
|---|---|---|
| Đơn trang bán hàng (khối «Ladi chờ xác nhận WhatsApp») không có nút nào | Hệ chưa làm được việc này — chưa có nút xử lý đơn trang bán hàng | Hiện tại: xử lý trên kho hàng — [Các loại đơn ở tab Đơn chờ và cách xử lý ngoài hệ](./cac-loai-don-cho.md). WhatsApp chưa nối — sẽ bổ sung sau |
| Việc «Nghi trùng với đơn đã có» không có nút xử lý đơn | Hệ chưa làm được việc này — chưa có nút xử lý đơn nghi trùng | Hiện tại: kiểm và xử lý trên kho hàng, rồi đóng việc ở «Việc đang chờ» |
| Bấm lý do trong khối «Đơn không gắn hội thoại» mà không mở được trang việc | Liên kết của khối này chưa khớp đường trang việc | Mở «Việc đang chờ» → tab «Đơn» → bấm dòng tương ứng. <!-- TBD: như OQ-SA-2 --> |
| «Không tải được đơn chờ» | Mất kết nối hoặc máy chủ lỗi | Bấm lại tab «Đơn chờ»; lặp lại thì báo quản trị |
| Mục «cua3:unknown_la_dong: …» lặp lại mỗi lần duyệt, cùng một nguồn (thường `d_fb_commerce` hoặc `a_so_ai`) | Hệ không có dữ liệu để kiểm nguồn đó cho hội thoại này | Hệ chưa duyệt được đơn này. Hiện tại: báo quản trị; khách cần giao thì tạo tay trên kho hàng, rồi loại đơn chờ kèm lý do. <!-- TBD: như OQ-SA-6 --> |
| Đã duyệt nhầm, đơn đã vào kho hàng | Duyệt là tạo đơn thật; hệ không có nút huỷ | **Sale / Quản trị:** huỷ đơn bằng tay trên kho hàng |

__Liên quan:__ [Duyệt, sửa hoặc từ chối đơn Messenger chờ duyệt](./duyet-don-messenger.md) · [Các loại đơn ở tab Đơn chờ và cách xử lý ngoài hệ](./cac-loai-don-cho.md) · [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md) · [Sự cố bot: không trả lời, sai giá, page không bật được](./su-co-bot.md)
