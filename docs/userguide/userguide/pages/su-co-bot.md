# Sự cố bot: không trả lời, sai giá, page không bật được

> Bảng tra theo triệu chứng cho những lúc bot im, bot báo sai giá hay nói nội dung cũ, hoặc không bật được bot cho một page — kèm nguyên nhân, cách xử lý và ai làm.

**Vai đọc:** Marketer · Quản trị

Đối chiếu với hệ ngày 05/10/2026.

Trước khi tra: mở trang của page (**Page → Tất cả page** → bấm tên page; marketer: **Page → Các page**) và đọc nhãn trạng thái bot ở đầu trang cùng khối «Bật được chưa». Phần lớn nguyên nhân hiện ngay ở đó. Các câu trong khối được giải nghĩa ở [Điều kiện «Bật được chưa» và cột «Còn thiếu»](./tra-cuu-bat-duoc-chua.md).

## Bot không trả lời khách

| Triệu chứng | Nguyên nhân | Xử lý (ai) |
|---|---|---|
| Đầu trang page ghi «Đang tắt»; cột «Bot» ở danh sách ghi «Tắt» | Công tắc bot của page đang tắt | Bật bot (Quản trị) — [Bật hoặc tắt bot cho một page](./bat-tat-bot.md) |
| Bot im, Pancake có ghi chú «AI CHUYỂN NGƯỜI — cần sale vào hỗ trợ» với lý do «Page chưa có kịch bản/KB — AI không thể tư vấn» | Bot không có dữ liệu để tư vấn cho page nên giao cho người | Sale nhận việc ở Hộp thư; Quản trị gắn sản phẩm, Marketer · Quản trị viết lời bot — [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md), [Viết và lưu lời bot cho một page](./viet-loi-bot.md) |
| Bot im ở một vài hội thoại, các hội thoại khác vẫn trả lời | Bot cố ý im và giao cho người: khách khiếu nại, chốt đơn xong, hết lượt, sale đã tiếp quản, tin cuối là của page, tin rác. Bàn giao là im lặng — bot không gửi câu giữ chân | Sale xử lý ở Hộp thư — [Khi nào bot trả lời, khi nào im và giao cho người](./khi-nao-bot-tra-loi.md) |
| Khối «Bật được chưa» có «Đang chạy thử, không gửi cho khách» | Máy chủ ở chế độ chạy thử: bot soạn câu và ghi sổ nhưng không gửi | Cố ý; muốn gửi thật thì nhờ người quản trị hệ thống. Xem câu bot soạn: [Xem câu bot soạn khi đang chạy thử](./xem-chay-thu.md) |
| Khối «Bật được chưa» có «Máy chủ chưa mở cửa gửi tin» | Máy chủ ở chế độ chỉ đọc | Người quản trị hệ thống mở cửa gửi |
| Bot im ở mọi page; đèn «Máy chạy bot» ở Hệ còn sống ghi «Máy chạy bot đang đứng» — «… Khách nhắn vào lúc này KHÔNG ai trả lời.» | Máy chạy bot ngừng xử tin | Người quản trị hệ thống khởi động lại máy chạy bot (Quản trị báo) — [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md) |
| Đèn «Máy chạy bot» ghi «Máy chạy bot đã tắt giữa chừng» | Máy chạy bot đã cầm tin rồi tắt; tin ấy không tự chạy tiếp | Người quản trị hệ thống xem máy chạy bot và trả tin về hàng chờ |
| Đèn «Máy chạy bot» ghi «Máy chạy bot đang quá tải» | Máy vẫn xử nhưng không kịp, tin dồn | Theo dõi thêm ít phút; còn dồn thì báo người quản trị hệ thống |
| Đèn «Token Pancake» đỏ: «Cả … token đều hết hạn — bot không gọi được Pancake.»; cột «Còn thiếu gì» ghi «Không có token» | Tài khoản Pancake hết hạn hoặc mất quyền | Quản trị thêm tài khoản Pancake mới — [Kết nối tài khoản Pancake](./ket-noi-pancake.md) |
| Bot im ở mọi page; «Thay khoá và thử một lượt» ở màn Model AI báo «Tài khoản hết tiền (402)» hoặc «Khoá bị từ chối (…)» | Tài khoản nhà model hết tiền hoặc khoá hỏng. Màn Bắt đầu ghi: dự phòng chưa nối vào đường trả lời — «nhà chính hết tiền là bot đứng im» | Quản trị thay khoá còn dùng được — [Chọn model AI, thay khoá và thử một lượt](./chon-model-ai.md) |
| «Thay khoá và thử một lượt» báo «Nhà model đang giới hạn lượt gọi (429) — thử lại sau» | Nhà model tạm giới hạn | Chờ rồi thử lại (Quản trị) |
| Hệ còn sống ghi «… tin gửi không rõ kết quả — bot gửi mà Pancake không trả lời chắc chắn. Tin lỗi hoặc bị chặn: đối chiếu từng tin …» | Tin gửi lỗi hoặc bị chặn phía Facebook/Pancake. Bot thử lại mỗi tin tối đa 3 lần; hệ **chưa** tạm ngừng cả page hay báo đỏ riêng khi một page bị chặn gửi | Quản trị đối chiếu từng tin: đã tới khách hay giao người gửi lại — [Đối chiếu tin gửi lỗi](./doi-chieu-tin-loi.md) |
| Bot không đụng tới một số hội thoại dù khách vừa nhắn; tab «Tin bị lọc» ở Cài đặt → Vận hành liệt kê hội thoại đó | Hội thoại đang bị bỏ qua trước khi tới bot. Lý do đáng ngờ: «Có thẻ chặn» (hội thoại mang thẻ chặn — mặc định «Đã gửi» — hoặc thẻ trạng thái đơn của Pancake; thẻ gắn nhầm là khách bị bỏ im) · «Đã có người mở» · «Thiếu định danh». Lý do bình thường: «Page vừa nói» · «Không có gì mới» · «Đang chờ khách gõ xong» | Gỡ thẻ gắn nhầm trên Pancake; «Đã có người mở» là cấu hình máy chủ — báo người quản trị hệ thống; «Thiếu định danh» cần soi tay (Quản trị) — [Xem tin bị lọc trong 24 giờ](./xem-tin-bi-loc.md) |
| Bot soạn câu nhưng khách không nhận, hội thoại chuyển sang cần người | Bộ lọc nội dung chặn câu trước khi gửi rồi giao hội thoại cho người | Sale nhận việc ở Hộp thư — [Lý do bot giao việc và kết quả đóng việc](./tra-cuu-ly-do-giao-viec.md) |

## Khách nhận hai câu trả lời

| Triệu chứng | Nguyên nhân | Xử lý (ai) |
|---|---|---|
| Khách nhận một câu của bot và một câu của bot khác | Bot của team khác vẫn phủ page. Đèn «Hai bot cùng một page» ghi: «Hệ này không đọc được bot ai_sale của team khác đang phủ page nào — mỗi page bật phải được bên đó xác nhận đã tắt…» | Quản trị tắt bot của mình ở page đó, xác nhận với bên kia đã tắt page rồi mới bật lại |
| Khách nhận câu của Botcake và câu của bot | Botcake chưa tắt. Ô «Đã tắt Botcake» chỉ là lời khai — đánh dấu không tắt Botcake | Tắt Botcake bằng tay trong giao diện Botcake, rồi mới đánh dấu ô |

## Bot báo sai giá hoặc vẫn nói nội dung cũ

| Triệu chứng | Nguyên nhân | Xử lý (ai) |
|---|---|---|
| Trang page có hộp «Bot đang báo cho khách … giá KHÔNG có trong bảng giá» hoặc «Kịch bản đang gõ cứng giá — hôm nay còn khớp bảng giá» | Lời bot gõ tay con số giá; khách nghe giá trong lời bot, còn đơn tính theo bảng giá | Marketer · Quản trị sửa câu đó ở tab «Lời bot» (nút «Sửa ở tab «Lời bot»») — [Viết và lưu lời bot cho một page](./viet-loi-bot.md) |
| Đã sửa giá ở Sản phẩm → Theo thị trường mà một page vẫn báo giá cũ | Page đó chưa gắn vào sản phẩm, vẫn bán theo «bản sao» của chính nó (bảng «Giá riêng của page (bản sao cũ)») | Quản trị gắn page vào sản phẩm và đối soát — [Chuyển page cũ sang sản phẩm](./chuyen-page-cu.md) |
| Hai page cùng sản phẩm, cùng nước báo hai giá; mục giá có hộp «Cùng số lượng mà khác giá giữa các page» | Các page chưa gắn đang mang bản sao giá khác nhau | Quản trị chuyển các page rồi đối soát, chọn một bảng — [Đối soát giá và ảnh của page cũ trước khi chuyển](./doi-soat-gia-anh.md) |
| Bấm lưu giá rồi mà bot vẫn nói giá cũ | Lượt lưu đã báo lỗi nên không lưu gì: mỗi lượt lưu hoặc có hiệu lực với bot ngay, hoặc báo lỗi — không có «đã lưu» mà bot vẫn chạy bản cũ | Đọc câu lỗi cạnh nút lưu, sửa rồi lưu lại — [Sửa bảng giá của sản phẩm ở một thị trường](./sua-bang-gia.md) |
| Lưu ở trang page hiện thông báo đỏ «… vào dữ liệu — máy này đang khoá ghi sang bot: …» | Đã lưu vào dữ liệu nhưng máy chủ đang khoá đường ghi sang bot | Báo người quản trị hệ thống |
| Lưu ở trang page báo đã lưu nhưng nói có page chưa nối sản phẩm nên bot ở page đó chưa đổi | Page đó chưa nối sản phẩm | Quản trị gắn page vào sản phẩm |
| Đã sửa kiến thức sản phẩm mà bot vẫn nói cũ; tab «Chung» có hộp «Bot CHƯA đọc phần kiến thức này» | Máy chủ chưa bật cách ghép lời mới — bot còn lấy lời về sản phẩm từ bảng bản sao theo page | Người quản trị hệ thống bật cách ghép lời mới; phần đã lưu vẫn được giữ |
| Đã áp quy tắc chung mà bot vẫn nói cũ; màn Quy tắc chung có hộp «Bot CHƯA đọc quy tắc chung» | Như trên — bot còn dùng khối quy tắc gốc cố định | Người quản trị hệ thống — [Soạn bản mới cho quy tắc chung mọi page](./sua-quy-tac-chung.md) |
| Bot không chốt món, hoặc vẫn coi là hết hàng dù kho đã có hàng lại | Quy tắc của bot: hết hàng thì không chốt, chưa rõ thì nhờ nhân viên xác nhận. Trạng thái hết hàng cập nhật theo kho hàng ở mỗi lượt kéo danh mục | Quản trị kéo lại danh mục ở Cài đặt → Kết nối — [Thêm kho hàng, kéo danh mục và quét page](./them-kho-hang-keo-du-lieu.md) |
| Bot không chào một bậc giá | Bậc đó đang bỏ dấu «Bật» — bot không chào bậc đã tắt | Quản trị bật lại bậc ở «Theo thị trường» |

## Không bật được bot cho page

| Triệu chứng | Nguyên nhân | Xử lý (ai) |
|---|---|---|
| Bấm bật, hộp đỏ nêu một hay nhiều câu: «Máy chủ chưa mở gửi tin» · «Máy chủ chưa bật cấu hình prompt V3» · «Thiếu sản phẩm đúng Page / shop» · «Thiếu gói giá hợp lệ» · «Chưa cấu hình model và API key» · «Model hoặc API key chưa hợp lệ» | Cổng bật từ chối vì page chưa đạt điều kiện | Sửa theo từng câu (Quản trị; hai câu đầu: người quản trị hệ thống) — [Bật hoặc tắt bot cho một page](./bat-tat-bot.md) |
| Khối «Bật được chưa» ghi «Đủ điều kiện để bật bot» mà cổng vẫn từ chối | Khi bot đang tắt, khối đọc bảng điều kiện chung; cổng bật kiểm bộ điều kiện riêng | Làm theo câu từ chối của cổng — [Điều kiện «Bật được chưa» và cột «Còn thiếu»](./tra-cuu-bat-duoc-chua.md) |
| Đã gắn sản phẩm ở cột «Sản phẩm gốc» hoặc tab «Kỹ thuật», cổng vẫn báo «Thiếu sản phẩm đúng Page / shop»; trang page ghi «Page này gắn «…» nhưng chưa chọn shop POS …» | Hai lối đó chỉ ghi sản phẩm, không ghi thị trường; page chưa có cửa hàng | Quản trị gắn lại ở tab «Page đang bán» của sản phẩm, chọn thị trường — [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) |
| «Đã bật 5 page trong 10 phút — dừng ở đây. Bật thêm được sau … phút nữa. …» | Trần của máy chủ: 5 lượt bật mỗi 10 phút (đếm chung trên máy chủ) | Chờ số phút ghi trên màn (Quản trị) — [Lọc danh sách page và bật bot hàng loạt](./loc-page-bat-bot-hang-loat.md) |
| Không thấy nút bật trên trang page; danh sách ghi «Công tắc bot đang khoá»; tab «Kỹ thuật» ghi «Công tắc bot đang bị khoá tay trên máy chủ này: …» | Máy chủ bị khoá tay (lúc sự cố hoặc máy demo) | Người quản trị hệ thống mở khoá |
| Không thấy nút bật, khối trạng thái chỉ có nhãn | Vai của bạn không phải Quản trị | Nhờ Quản trị bật |
| Khối «Bật được chưa» ghi «Lõi bot không thấy page này» | Chưa quét Pancake về, hoặc chưa có tài khoản Pancake phủ page | Quản trị bấm «Quét Pancake ở danh sách page» hoặc «Xem tài khoản Pancake» |
| Khối ghi «Chưa đọc được tình trạng của page này»; danh sách hiện hộp «Chưa đọc được điều kiện sẵn sàng» | Không đọc được điều kiện sẵn sàng — không có nghĩa page ổn | Tải lại; kéo dài thì báo người quản trị hệ thống |
| «page id=… không có id Facebook — không gạt được công tắc.» | Page thiếu mã page Facebook | Quản trị quét lại Pancake ở danh sách page |
| Thanh hàng loạt dừng: «Dừng bật bot ở «…»» | Một page trong lượt bị cổng hoặc trần từ chối; các page sau chưa đổi | Đọc lý do trong hộp, sửa page đó rồi chọn lại phần còn lại |

## Bot đang bật nhưng ô «Còn thiếu gì» đỏ

| Triệu chứng | Nguyên nhân | Xử lý (ai) |
|---|---|---|
| Page đang «Đang chạy» mà ô «Còn thiếu gì» đỏ | Điều kiện hỏng sau khi đã bật (ví dụ giá bị bỏ, tài khoản Pancake hết hạn). Bot không tự tắt khi điều kiện hỏng | Sửa điều kiện ngay; nếu bot đang nói sai thì Quản trị tắt bot trước — [Bật hoặc tắt bot cho một page](./bat-tat-bot.md) |

## Liên quan

[Khi nào bot trả lời, khi nào im và giao cho người](./khi-nao-bot-tra-loi.md) · [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md) · [Các đèn của «Hệ còn sống»](./tra-cuu-den-he-con-song.md) · [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md) · [Câu hỏi thường gặp](./hoi-dap.md)
