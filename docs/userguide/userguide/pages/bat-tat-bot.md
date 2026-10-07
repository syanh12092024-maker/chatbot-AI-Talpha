# Bật hoặc tắt bot cho một page

> Trang này hướng dẫn người quản trị bật bot để bot tự trả lời khách của một page, hoặc tắt bot để người trực tiếp nhận — kèm những gì hệ kiểm trước khi cho bật.

**Ai làm được:** Quản trị. Marketer mở được trang của page mình phụ trách và thấy nhãn «Đang trả lời khách» / «Đang tắt», nhưng không có nút bật tắt.

__Khi nào dùng:__ page đã sẵn sàng và cần bot trả lời khách thật; có sự cố (bot nói sai, khách phàn nàn) cần tắt ngay; page thôi bán.

__Trước khi bắt đầu:__
- **Một công tắc duy nhất.** Mỗi page có đúng một công tắc bot; máy chạy bot đọc thẳng công tắc này. Bật ở trang của page hay ở danh sách page là cùng một công tắc.
- Khối «Bật được chưa» của page không còn ô «Đang chặn» (xem [Kiểm tra page đã sẵn sàng bật bot chưa](./kiem-tra-bat-duoc-chua.md)).
- Page đã gắn vào sản phẩm, thị trường có bậc giá (xem [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md)).
- **Botcake và bot của team khác:** xem mục «Trước khi bật: hai bot trên cùng một page» bên dưới.

## Các bước — trên trang của một page

1. Mở **Page → Tất cả page**, bấm tên page.
   → *Kết quả:* đầu trang có nhãn trạng thái («Đang trả lời khách» hoặc «Đang tắt») và nút «Bật bot cho page này» hoặc «Tắt bot cho page này».
2. Bấm nút.
   → *Kết quả:* hộp xác nhận. Bật: «Bật bot cho «…»?» — «Bot sẽ bắt đầu tự trả lời khách thật của page này.» Tắt: «Tắt bot cho «…»?» — «Bot sẽ ngừng trả lời. Khách của page này phải có người trực.»
3. Bấm «Bật bot» (hoặc «Tắt bot»).
   → *Kết quả:* thông báo «Đã bật bot cho «…».» (hoặc «Đã tắt …»), nhãn đầu trang đổi theo. Nếu cổng bật từ chối, hộp đỏ «Không đổi được trạng thái bot» nêu đúng lý do (bảng «Cổng bật từ chối»).

![Trang của một page — nhãn trạng thái bot, nút «Bật bot cho page này» và khối «Bật được chưa»](images/bat-tat-bot.png)

<!-- CHỤP: anh=bat-tat-bot · vai=quan-tri · duong=/page-bot?loc=bot_tat · cho=«Bot đang tắt»
     thao_tac=bấm «(tên page ở dòng đầu bảng)»
     trang_thai=trang một page đang tắt bot, đầu trang có nhãn «Đang tắt» và nút «Bật bot cho page này», khối «Bật được chưa» hiện ngay dưới
     danh_dau=(1) «Đang tắt» · (2) «Bật bot cho page này» · (3) «Bật được chưa» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Nhãn trạng thái | «Đang trả lời khách» hoặc «Đang tắt» — đọc từ chính công tắc máy chạy bot dùng |
| (2) | Nút «Bật bot cho page này» / «Tắt bot cho page này» | Bấm rồi xác nhận |
| (3) | Khối «Bật được chưa» | Đọc trước khi bật — còn ô «Đang chặn» thì cổng sẽ từ chối |

## Các bước — trên danh sách page

1. Mở **Page → Tất cả page**, tìm dòng page.
   → *Kết quả:* cột «Bot» có công tắc ghi «Đang chạy» hoặc «Tắt».
2. Gạt công tắc, rồi xác nhận trong hộp (cùng câu như trên).
   → *Kết quả:* thông báo «Đã bật bot cho «…».»; lỗi thì hộp đỏ «Không thể đổi trạng thái bot» và công tắc trở về vị trí cũ.

Muốn bật nhiều page một lượt, xem [Lọc danh sách page và bật bot hàng loạt](./loc-page-bat-bot-hang-loat.md).

## Cổng bật kiểm gì

Mỗi lần **bật**, máy chủ kiểm lại page theo bộ điều kiện của chính bot. Chỉ cần một điều kiện chưa đạt là từ chối — công tắc giữ nguyên «tắt». **Tắt** thì không qua cổng.

| Câu từ chối trên màn | Nghĩa | Ai sửa · ở đâu |
|---|---|---|
| «Máy chủ chưa mở gửi tin» | Máy chủ đang ở chế độ chỉ đọc, không gửi tin cho khách | Người quản trị hệ thống |
| «Máy chủ chưa bật cấu hình prompt V3» | Máy chủ chưa bật cách ghép lời mới cho bot | Người quản trị hệ thống |
| «Thiếu sản phẩm đúng Page / shop» | Page không có món nào để bán (chưa gắn sản phẩm, gắn mà chưa có cửa hàng, hoặc thị trường không có món) | Quản trị — [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) |
| «Thiếu gói giá hợp lệ» | Có món nhưng không có bậc giá nào đang bật, giá lớn hơn 0 và tiền tệ được hỗ trợ | Quản trị — [Sửa bảng giá của sản phẩm ở một thị trường](./sua-bang-gia.md) |
| «Chưa cấu hình model và API key» | Team chưa chọn model, máy chủ cũng không có khoá chung | Quản trị — [Chọn model AI, thay khoá và thử một lượt](./chon-model-ai.md) |
| «Model hoặc API key chưa hợp lệ» | Đọc cấu hình model bị lỗi | Quản trị — màn Model AI, chọn lại và lưu |

Nhiều điều kiện cùng thiếu thì các câu nối nhau bằng dấu «;».

Ngoài cổng, còn bốn lý do khiến nút không chạy:

| Màn ghi | Nghĩa |
|---|---|
| «Đã bật 5 page trong 10 phút — dừng ở đây. Bật thêm được sau … phút nữa. …» | Trần của máy chủ: tối đa 5 lượt bật trong 10 phút (đếm chung mọi lượt bật trên máy chủ). Chờ rồi bật tiếp. Tắt không bị trần chặn |
| «Công tắc bot đang bị khoá: …» · dòng nhỏ «Công tắc bot đang khoá» ở danh sách · khối «Bot phụ trách page» ở tab «Kỹ thuật» ghi «Công tắc bot đang bị khoá tay trên máy chủ này: …» | Máy chủ bị khoá tay (lúc sự cố hoặc máy demo) — chặn cả bật lẫn tắt, nút trên trang page biến mất. Nhờ người quản trị hệ thống mở khoá |
| «page id=… không có id Facebook — không gạt được công tắc.» | Page thiếu mã page Facebook — quét lại Pancake ở danh sách page |
| «Cần vai Quản trị để bật tắt bot.» · «Chỉ quản trị bật tắt bot» | Vai của bạn chỉ xem |

**Khối «Bật được chưa» và cổng có thể nói khác nhau.** Khi bot đang tắt, khối «Bật được chưa» và cột «Còn thiếu gì» đọc bảng điều kiện chung (tài khoản Pancake, thẻ hội thoại, sản phẩm, kịch bản…); cổng bật lúc bấm kiểm bộ điều kiện trong bảng trên. Vì vậy page hiện «Đủ điều kiện» vẫn có thể bị cổng từ chối — làm theo câu từ chối. Bảng đối chiếu đầy đủ ở [Điều kiện «Bật được chưa» và cột «Còn thiếu»](./tra-cuu-bat-duoc-chua.md).

## Trước khi bật: hai bot trên cùng một page

- **Botcake.** Ô «Đã tắt Botcake» (tab «Kỹ thuật» của page, cột «Botcake» ở danh sách) chỉ là **lời khai** — màn ghi «LỜI KHAI, không phải công tắc: đánh dấu ở đây KHÔNG tắt Botcake.» Botcake tắt bằng tay trong giao diện Botcake; cổng bật không kiểm Botcake. Đánh dấu ô sau khi đã tắt thật để các màn đếm đúng.
- **Bot của team khác.** Đèn «Hai bot cùng một page» ở **Cài đặt → Hệ còn sống** ghi: «Hệ này không đọc được bot ai_sale của team khác đang phủ page nào — mỗi page bật phải được bên đó xác nhận đã tắt, không thì khách nhận hai câu trả lời.» Trước khi bật một page, xác nhận với bên đó rằng họ đã tắt page này.

## Lưu ý

- Bật xong, bot trả lời theo quy tắc chung, lời bot của page, sản phẩm và giá — và vẫn im, giao cho người ở những lúc cần (xem [Khi nào bot trả lời, khi nào im và giao cho người](./khi-nao-bot-tra-loi.md)).
- Khi máy chủ ở chế độ chạy thử, khối «Bật được chưa» hiện «Đang chạy thử, không gửi cho khách»: bật được, bot soạn câu trả lời và ghi sổ nhưng không gửi (xem [Xem câu bot soạn khi đang chạy thử](./xem-chay-thu.md)).
- Mỗi lần bật hoặc tắt ghi một dòng nhật ký: ai, lúc nào, trước và sau (**Cài đặt → Nhật ký**).
- Muốn thử câu trả lời trước khi bật: ô «Thử hỏi bot» trên trang page ghi «Chưa thử được ở đây — đường thử bot an toàn chưa dựng». Hệ chưa làm được việc này. Hiện tại: xem «AI đang đọc gì» trên trang page và kết quả chạy thử ở **Cài đặt → Vận hành**.

## Liên quan

[Kiểm tra page đã sẵn sàng bật bot chưa](./kiem-tra-bat-duoc-chua.md) · [Lọc danh sách page và bật bot hàng loạt](./loc-page-bat-bot-hang-loat.md) · [Điều kiện «Bật được chưa» và cột «Còn thiếu»](./tra-cuu-bat-duoc-chua.md) · [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md) · [Sự cố bot: không trả lời, sai giá, page không bật được](./su-co-bot.md)
