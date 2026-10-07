# Điều kiện «Bật được chưa» và cột «Còn thiếu»

> Bảng tra mọi điều kiện quyết định một page có bật được bot không: chữ hiện trên khối «Bật được chưa» (trang một page) và cột «Còn thiếu gì» (Page → Tất cả page), nghĩa, chỗ sửa và vai sửa — kèm câu từ chối thật của cổng bật.

Đối chiếu với hệ ngày 05/10/2026.

## Bộ điều kiện nào đang hiện

| Page đang | Khối «Bật được chưa» và cột «Còn thiếu gì» đọc | Khi bấm bật, cổng bật kiểm |
|---|---|---|
| Tắt bot | Bảng A — bảy điều kiện chung | Bảng C — sáu điều kiện của cổng |
| Bật bot | Bảng B — điều kiện của bot đang chạy (cùng nội dung với bảng C, thêm hai dòng nhắc) | — (tắt không qua cổng) |

Hai bộ điều kiện khác nhau, nên page đang tắt hiện «Đủ điều kiện» vẫn có thể bị cổng từ chối khi bấm bật. Câu từ chối của cổng là căn cứ cuối cùng.

## Bảng A — bảy điều kiện khi bot đang tắt

Cột «Ô ở «Còn thiếu gì»» là nhãn ngắn trên danh sách page; cột «Câu trên khối» là tên đầy đủ trên trang một page, sau đó là chi tiết riêng của page (sau dấu «—»).

| Nhãn | Ô ở «Còn thiếu gì» | Câu trên khối | Mức | Nghĩa | Nút · sửa ở đâu | Ai sửa |
|---|---|---|---|---|---|---|
| «Tài khoản Pancake» | «Không có token» | «Chưa có tài khoản Pancake nào phủ page này» (chi tiết «page không còn thấy ở token nào» hoặc «mọi token phủ page đều đã chết») | Đang chặn | Không tài khoản Pancake nào còn sống có quyền trên page — bot không đọc được tin, không gửi được | «Mở màn Kết nối» → Cài đặt → Kết nối · [Kết nối tài khoản Pancake](./ket-noi-pancake.md) | Quản trị |
| «Thẻ hội thoại» | «Thiếu thẻ Pancake» | «Thiếu thẻ Pancake» (chi tiết «thiếu thẻ: …») | Đang chặn | Page trên Pancake thiếu thẻ hội thoại hệ cần | Không có nút — vào Pancake → cài đặt page → thẻ hội thoại, tạo đủ thẻ còn thiếu | Người có quyền cài đặt page trên Pancake (ngoài hệ) |
| «Sản phẩm và giá» | «Chưa có bảng giá» | «Chưa có sản phẩm nào kèm giá bán» (chi tiết «Sheet chưa có sản phẩm/giá cho page này») | Đang chặn | Bot chưa có sản phẩm kèm giá cho page | «Xem sản phẩm của page» → Sản phẩm · [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) · [Sửa bảng giá của sản phẩm ở một thị trường](./sua-bang-gia.md) | Quản trị |
| «Kịch bản bán hàng» | «Chưa có lời chào» | «Thiếu kịch bản bán» (chi tiết «thiếu: câu chào, cách bán») | Đang chặn | Page chưa có câu chào hoặc chưa có cách bán | «Soạn kịch bản» → tab «Lời bot» của page · [Viết và lưu lời bot cho một page](./viet-loi-bot.md) | Marketer · Quản trị |
| «Kết nối kho hàng» | «Chưa nối POS» | «Chưa nối kho hàng của thị trường này» (chi tiết «chưa map shop POS — AI chốt được nhưng không tạo được đơn thật») | Nên làm | Bot vẫn tư vấn, chốt được, nhưng đơn không tự đẩy sang kho hàng — phải nhập tay | «Nối kho hàng» → Cài đặt → Kết nối · [Thêm kho hàng, kéo danh mục và quét page](./them-kho-hang-keo-du-lieu.md) | Quản trị |
| «Kịch bản đủ chi tiết» | «Kịch bản mỏng» | «Kịch bản mỏng» (chi tiết «chưa điền giọng điệu» và/hoặc «cách bán ngắn (~… token < 500)») | Nên làm | Thiếu giọng điệu, hoặc phần cách bán quá ngắn — câu trả lời sẽ chung chung | «Bổ sung kịch bản» → tab «Lời bot» | Marketer · Quản trị |
| «Kịch bản còn hiệu quả» | «Kịch bản cũ» | «Kịch bản cũ, chốt kém» (chi tiết «… ngày chưa đụng, tỉ lệ chốt …%») | Nên làm | Bản lời bot đang chạy hơn 30 ngày (mặc định) chưa sửa VÀ tỉ lệ chốt dưới 1% — chỉ hiện khi cả hai cùng đúng | «Xem lại kịch bản» → tab «Lời bot» | Marketer · Quản trị |

## Bảng B — điều kiện khi bot đang bật

Chi tiết sau dấu «—» của bảng này luôn trống.

| Nhãn | Ô ở «Còn thiếu gì» | Câu trên khối | Mức | Nghĩa | Nút · sửa ở đâu | Ai sửa |
|---|---|---|---|---|---|---|
| «Cửa gửi tin cho khách» | «Cửa gửi tin đang đóng» | «Máy chủ chưa mở cửa gửi tin» | Đang chặn | Máy chủ ở chế độ chỉ đọc: bot nghĩ ra câu trả lời nhưng không gửi | Không có nút | Người quản trị hệ thống |
| «Cách ghép lời cho bot» | «Chưa bật cách ghép lời» | «Máy chủ chưa bật cách ghép lời mới» | Đang chặn | Bot không đọc được kịch bản và giá của page theo cách mới | Không có nút | Người quản trị hệ thống |
| «Sản phẩm của page» | «Chưa có sản phẩm» | «Page chưa có sản phẩm nào» | Đang chặn | Page chưa gắn sản phẩm, gắn mà chưa có cửa hàng, hoặc kho chưa kéo món của cửa hàng đó | «Gán sản phẩm gốc» → Page → Tất cả page. Nên gắn ở tab «Page đang bán» của sản phẩm (ghi đủ thị trường) | Quản trị |
| «Giá bán» | «Chưa có giá bán» | «Chưa có gói giá hợp lệ» | Đang chặn | Có sản phẩm nhưng không bậc giá nào đang bật, dương, đúng tiền tệ hỗ trợ. Bot không được tự chế giá | «Nhập giá bán» → Cài đặt → Vận hành. Page đã gắn sản phẩm thì giá sửa ở Sản phẩm → … → Theo thị trường | Quản trị |
| «Model AI và khoá» | «Chưa có model hoặc khoá» | «Chưa chọn model hoặc chưa dán khoá» | Đang chặn | Không gọi được model nào | «Mở màn Model AI» · [Chọn model AI, thay khoá và thử một lượt](./chon-model-ai.md) | Quản trị |
| «Cấu hình model đọc lên bị lỗi» | «Cấu hình model lỗi» | «Đọc cấu hình model không được» | Đang chặn | Cấu hình model của team đọc lên bị lỗi | «Mở màn Model AI» — chọn lại model và lưu | Quản trị |
| «Đang chạy thử» | «Đang chạy thử» | «Đang chạy thử, không gửi cho khách» | Nên làm | Bot đọc tin thật, soạn câu và ghi sổ nhưng KHÔNG gửi — cấu hình cố ý | Không có nút · [Xem câu bot soạn khi đang chạy thử](./xem-chay-thu.md) | Người quản trị hệ thống (cấu hình máy chủ) |
| «Máy chạy bot» | «Chưa đo máy chạy bot» | «Chưa đo máy chạy bot» | Nên làm | Luôn có: các điều kiện trên mới kiểm cấu hình, chưa xác nhận máy chạy bot còn sống | «Xem hệ còn sống không» · [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md) | Mọi vai xem được |

Vì dòng «Chưa đo máy chạy bot» luôn có, page đang bật bot không bao giờ rơi vào viên lọc «Đủ điều kiện» và ô «Còn thiếu gì» của nó ít nhất là màu «Nên làm».

## Bảng C — câu từ chối của cổng bật

Khi bấm bật (một page hoặc hàng loạt), máy chủ kiểm lại page. Thiếu điều kiện nào thì từ chối, các câu nối nhau bằng «;», công tắc giữ «tắt».

| Câu từ chối | Ứng với điều kiện bảng B | Ai sửa |
|---|---|---|
| «Máy chủ chưa mở gửi tin» | «Cửa gửi tin cho khách» (máy chủ ở chế độ chạy thử thì không chặn — chỉ nhắc «Đang chạy thử») | Người quản trị hệ thống |
| «Máy chủ chưa bật cấu hình prompt V3» | «Cách ghép lời cho bot» | Người quản trị hệ thống |
| «Thiếu sản phẩm đúng Page / shop» | «Sản phẩm của page» | Quản trị |
| «Thiếu gói giá hợp lệ» | «Giá bán» | Quản trị |
| «Chưa cấu hình model và API key» | «Model AI và khoá» — team chưa lưu cấu hình model và máy chủ không có khoá chung | Quản trị |
| «Model hoặc API key chưa hợp lệ» | «Cấu hình model đọc lên bị lỗi» | Quản trị |

Lý do khác khiến bật không chạy (không phải điều kiện của page):

| Câu trên màn | Nghĩa | Ai xử lý |
|---|---|---|
| «Đã bật 5 page trong 10 phút — dừng ở đây. Bật thêm được sau … phút nữa. …» | Trần máy chủ: 5 lượt bật mỗi 10 phút, đếm chung trên máy chủ. Không chặn tắt | Chờ |
| «Công tắc bot đang bị khoá: …» | Máy chủ bị khoá tay — chặn cả bật lẫn tắt | Người quản trị hệ thống |
| «page id=… không có id Facebook — không gạt được công tắc.» | Page thiếu mã page Facebook | Quản trị — quét lại Pancake |
| «Tối đa 10 page một lượt — bỏ bớt chọn» | Chọn quá 10 page ở thanh hàng loạt | Quản trị — bỏ bớt |
| «Chỉ vai quan-tri sửa được page. …» | Vai không có quyền bật tắt | Quản trị |

## Giá trị đặc biệt của cột «Còn thiếu gì»

| Ô | Màu | Nghĩa |
|---|---|---|
| Nhãn ngắn ở bảng A hoặc B | Đỏ (chặn) · vàng (nên làm) | Chỉ hiện **điều kiện đầu tiên**: điều kiện chặn trước, rồi mới tới điều kiện nhắc. Mở trang page để thấy đủ danh sách |
| «Đủ điều kiện» | Xanh | Không còn điều kiện chặn hay nhắc |
| «Bot không thấy page này» | Đỏ | Bot chưa biết page — thường do chưa quét Pancake hoặc chưa có tài khoản Pancake phủ page |
| «Chưa đọc được» | Xám | Không đọc được điều kiện sẵn sàng — không có nghĩa page ổn. Đầu bảng hiện hộp «Chưa đọc được điều kiện sẵn sàng» |
| Một mã viết liền chữ hoa | — | Điều kiện mới mà bảng từ chưa có tên — vẫn hiện để không bị giấu |
| Ô đỏ ở page đang bật bot | Đỏ | Điều kiện hỏng sau khi đã bật. Bot không tự tắt — tắt tay nếu cần |

Viên lọc dùng cùng phép đo: «Còn điều kiện chặn» = ô đỏ; «Đủ điều kiện» = ô xanh. Page «Chưa đọc được» không rơi vào viên nào.

## Trạng thái của khối «Bật được chưa» (trang một page)

| Khối hiện | Nghĩa | Nút |
|---|---|---|
| «Đủ điều kiện để bật bot» — «Không còn việc nào chặn.» hoặc «… việc nên làm thêm, xem bên dưới.» | Không còn điều kiện chặn | — |
| Danh sách điều kiện, mỗi ô: nhãn · «Đang chặn» hoặc «Nên làm» · câu · việc cần làm | Còn điều kiện | Nút của từng điều kiện (bảng A, B). Nút «Soạn kịch bản» / «Bổ sung kịch bản» / «Xem lại kịch bản» chuyển sang tab «Lời bot» ngay trên trang |
| Ô có thêm nhãn «Chưa có trong bảng từ» | Điều kiện mới chưa có tên | — |
| «Lõi bot không thấy page này» | Page có trong hệ nhưng bot chưa biết — chưa quét Pancake hoặc chưa có tài khoản Pancake phủ page | «Quét Pancake ở danh sách page» · «Xem tài khoản Pancake» |
| «Chưa đọc được tình trạng của page này» | Không đọc được — «chưa đọc được KHÔNG có nghĩa là page không thiếu gì» | Báo người quản trị hệ thống nếu kéo dài |

## Liên quan

[Kiểm tra page đã sẵn sàng bật bot chưa](./kiem-tra-bat-duoc-chua.md) · [Bật hoặc tắt bot cho một page](./bat-tat-bot.md) · [Lọc danh sách page và bật bot hàng loạt](./loc-page-bat-bot-hang-loat.md) · [Sự cố bot: không trả lời, sai giá, page không bật được](./su-co-bot.md) · [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md)
