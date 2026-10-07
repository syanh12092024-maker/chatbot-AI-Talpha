# AI Closer làm gì cho bạn

> Trang này giải thích AI Closer làm gì, mỗi vai dùng phần nào, và việc nào vẫn làm ở ngoài hệ — dành cho người mới ở mọi vai.

AI Closer là một bot AI trả lời khách nhắn tin vào page Facebook (đọc và gửi tin qua Pancake), tư vấn và chốt đơn thu tiền khi giao hàng (COD) cho các page bán hàng ở thị trường Trung Đông và Philippines. Mỗi page bán đúng một sản phẩm. Giao diện web của hệ là nơi người vận hành dạy bot nói gì, theo dõi bot, nhận lại những việc bot không tự làm được, và đọc số liệu.

## Bot làm gì

Bot đứng tuyến đầu trên Messenger và làm ba việc:

- **Trả lời và tư vấn.** Bot đọc lịch sử hội thoại trước khi trả lời, đợi khách gõ xong rồi trả lời một lần cho cả cụm tin, và trả lời bằng đúng ngôn ngữ khách đang dùng — không bao giờ bằng tiếng Việt. Giá chỉ lấy từ bảng giá, bot không tự nhân hay cộng giá các gói. Mỗi tin của bot kết bằng một bước tiến tới đơn; khách chê đắt hay còn do dự thì bot mời chốt lại, không buông ngay.
- **Chốt đơn.** Khi khách đã cho đủ tên, số điện thoại, địa chỉ, số lượng và đồng ý trả tiền khi nhận, bot ghi đơn vào hàng chờ duyệt. Đơn chỉ được tạo trong kho hàng khi sale duyệt.
- **Giao việc khó cho người.** Khách khiếu nại, đòi gặp người, hoặc bot không chắc thông tin thì bot im hẳn và để lại lý do cho sale. Chi tiết ở [Khi nào bot trả lời, khi nào im và giao cho người](./khi-nao-bot-tra-loi.md).

Bot nói theo bốn tầng nội dung — quy tắc chung của team, kiến thức sản phẩm, giá theo thị trường, lời bot riêng của page. Xem [Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md).

## Ba vai, ba cách dùng hệ

| Vai | Bot làm cho bạn | Bạn làm trên hệ | Bạn làm ngoài hệ |
|---|---|---|---|
| **Sale** | Trả lời khách thường ngày, chốt đơn, giao lại việc khó kèm lý do | Nhận việc · «Nhận thay bot» · đóng việc và chọn kết quả · xem, sửa, duyệt, từ chối đơn Messenger cạnh khung chat · tìm khách theo số điện thoại | Trả lời khách trên Pancake |
| **Marketer** | Nói theo kiến thức sản phẩm và lời bot bạn viết — lưu là chạy | Sửa kiến thức sản phẩm (gồm ô «Hỏi size trước khi chốt»), lời bot của page, Chính sách · FAQ · Phản đối · xem giá, tồn, ảnh, số liệu | — |
| **Quản trị** | Như trên, cho cả team | Mọi màn; riêng bật/tắt bot, cấu hình page, cấu trúc sản phẩm và giá, quy tắc chung, duyệt gợi ý AI, model AI, kết nối, người và team chỉ Quản trị làm | — |

Một người có thể mang nhiều vai. Bảng đầy đủ ai mở được màn nào, sửa được gì: [Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md).

## Năm đích trên thanh trên cùng

| Đích | Câu hỏi nó trả lời |
|---|---|
| Hộp thư | Khách nào đang chờ người, đơn nào chờ duyệt — trả lời vẫn ở Pancake |
| Sản phẩm | Bán gì, ở thị trường nào, giá bao nhiêu — bot trả lời theo đây |
| Page | Từng page: bot nói gì, bật hay tắt, và luật chung cho mọi page |
| Số liệu | Ra bao nhiêu đơn, tốn bao nhiêu tiền |
| Cài đặt | Người, kết nối, model, nhật ký — mở lúc cài đặt hoặc lúc có sự cố |

Sale chỉ thấy đích Hộp thư; marketer và quản trị thấy đủ năm đích nhưng mỗi vai thấy một bộ mục con khác nhau. Bản đồ chi tiết: [Bản đồ giao diện: năm đích và các mục con](./ban-do-giao-dien.md).

## Ba team, dữ liệu tách riêng

Hệ có ba team: **Pialpha GCC · Pialpha AUUS · Pialpha EU** (tên theo HRM). Mỗi lúc bạn làm việc trong đúng một team — tên team đang mở hiện ở chip cạnh logo — và chỉ thấy page, sản phẩm, khách, đơn của team đó. Điều kiện team nằm ở máy chủ, không phải bộ lọc trên màn, nên không có cách nào xem lẫn dữ liệu hai team trên cùng một màn.

- Sale thuộc cả ba team; muốn xem team khác thì đổi bằng chip team ([Đăng nhập, chọn team và đổi team](./dang-nhap-chon-team.md)).
- Marketer chỉ thấy những sản phẩm mình phụ trách (khớp theo mã nhân viên HRM của tài khoản) và các page bán sản phẩm đó.
- Một kho hàng có nhiều cửa hàng; mỗi cửa hàng là một thị trường. Một cửa hàng có thể dùng chung cho nhiều team.
- Một đơn thuộc team của marketer đem đơn về, tính theo team của người đó vào ngày đơn (theo HRM).

## Sale trả lời ở Pancake, không ở hệ

Trên hệ **không có ô soạn tin và không có nút gửi**. Hộp thư cho sale đọc hội thoại (đọc thẳng lịch sử từ Pancake), xem bot đã làm gì, nhận việc, duyệt đơn; muốn trả lời thì bấm «Trả lời trên Pancake» để mở đúng hội thoại trên Pancake. Lý do: sale đã quen Pancake, và học một nơi trả lời mới là thêm một chỗ dễ sai.

Khi sale gõ trả lời trên Pancake, hệ nhận ra tin do người gõ và bot thôi trả lời hội thoại đó. Cách trả lời mà không chen ngang bot: [Trả lời khách trên Pancake mà không chen ngang bot](./tra-loi-tren-pancake.md).

## Hai luồng đơn chạy riêng

| | Đơn Messenger (bot chốt) | Đơn trang bán hàng |
|---|---|---|
| Khách đến từ | Quảng cáo → nhắn tin vào page | Quảng cáo → điền form trên trang bán hàng (LadiPage) |
| Đơn vào kho hàng lúc nào | Khi sale duyệt («Duyệt → Chờ in») | Ngay khi khách bấm BUY NOW |
| Ai xác nhận với khách | Khách đã xác nhận trong chat với bot | Cần nhắn WhatsApp xác nhận — WhatsApp chưa nối, sẽ bổ sung sau |
| Bạn thấy ở đâu | Thẻ đơn cạnh khung chat và tab «Đơn chờ» của Hộp thư | Tab «Đơn chờ» của Hộp thư (hệ chưa có nút xử lý loại đơn này) |

**Vì sao tách:** khách trang bán hàng điền form xong là đơn đã nằm trong kho hàng mà chưa ai nói chuyện với họ — gửi hàng không hỏi là ôm rủi ro bom hàng. Khách Messenger đã tự đưa tên, số, địa chỉ và đồng ý COD trong chat — hỏi lại chỉ làm phiền. Vì hai luồng đo bằng hai thước khác nhau, màn Số liệu luôn tách hai luồng, không gộp một tổng. Ngoài hai luồng này còn đơn do sale tự nhập trên kho hàng (không có hội thoại) — loại này không đi qua bot.

## Một bot duy nhất

Phía AI Closer chỉ có **một bot**. Việc bot có trả lời một page hay không do đúng **một công tắc** của page đó quyết định, và chỉ Quản trị bật hay tắt nó. Page phải có sản phẩm để bán thì bot mới chat được và page mới bật được; hướng đi của hệ là mọi page gắn một sản phẩm gốc và một cửa hàng của kho hàng (page cũ đang được chuyển dần — xem [Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md)). Các điều kiện bật: [Kiểm tra page đã sẵn sàng bật bot chưa](./kiem-tra-bat-duoc-chua.md).

Trên một số page có thể còn bot khác:

- **Botcake** (bot trả lời theo từ khoá trên Pancake): bot AI Closer nhường Botcake nói trước. Hệ chỉ ghi lời khai «Đã tắt Botcake», không tắt Botcake hộ bạn.
- **Bot của team khác**: page nào chuyển sang AI Closer thì bên kia phải tắt page đó trước, nếu không khách nhận tin của hai bot.

## Ai làm gì, ở đâu

| Việc | Ai | Ở đâu |
|---|---|---|
| Trả lời khách | Bot; sale khi bot giao lại | Pancake |
| Nhận việc, «Nhận thay bot», đóng việc | Sale · Quản trị | Hộp thư |
| Duyệt, sửa, từ chối đơn Messenger | Sale · Quản trị | Hộp thư (thẻ đơn cạnh chat) |
| Sửa kiến thức sản phẩm, lời bot, Chính sách · FAQ · Phản đối | Marketer · Quản trị | Sản phẩm · Page |
| Sửa giá theo thị trường, ảnh của page đã gắn sản phẩm | Quản trị (ảnh: hệ chưa có chỗ sửa — xem [Thêm và gắn nhãn ảnh bot gửi khách](./anh-gui-khach.md)) | Sản phẩm |
| Gộp món, thêm thị trường, sửa giá, gắn page, gán marketer | Quản trị | Sản phẩm |
| Bật/tắt bot, quy tắc chung, duyệt gợi ý AI | Quản trị | Page |
| Kết nối Pancake và kho hàng, model AI, người và team, nhật ký | Quản trị | Cài đặt |
| Đọc đơn, chi phí AI, khách rơi ở đâu | Marketer · Quản trị | Số liệu |
| Sửa cấu hình máy chủ | Người quản trị hệ thống | Ngoài giao diện ([Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md)) |

## Việc hệ chưa làm được

- WhatsApp: chưa nối — sẽ bổ sung sau.
- Thử hỏi bot ngay trên trang một page: chưa có. Hiện tại xem «AI đang đọc gì trên page này» ([Xem đúng đoạn chữ AI đang đọc trên một page](./xem-doan-chu-ai-doc.md)) và câu bot soạn khi chạy thử ([Xem câu bot soạn khi đang chạy thử](./xem-chay-thu.md)).
- Nút xử lý đơn trang bán hàng và đơn nghi trùng trong tab «Đơn chờ»: chưa có ([Các loại đơn ở tab Đơn chờ và cách xử lý ngoài hệ](./cac-loai-don-cho.md)).
- Sale trả hội thoại lại cho bot: chưa có ở Hộp thư.
- Báo cho quản trị khi một việc quá 10 phút chưa ai nhận: chưa có.

__Thuật ngữ chính:__ đích · team · vai · lời bot · đơn Messenger chờ duyệt · trang bán hàng · kho hàng · cửa hàng — xem [Thuật ngữ](./thuat-ngu.md).
