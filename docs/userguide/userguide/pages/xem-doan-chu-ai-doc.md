# Xem đúng đoạn chữ AI đang đọc trên một page

> Trang này hướng dẫn xem nguyên văn các khối chữ mà bot ghép lại rồi gửi cho AI trước khi trả lời khách của một page — để kiểm bản lời bot mới đã vào chưa và soi chỗ các khối nói ngược nhau.

**Ai làm được:** Marketer · Quản trị. **Chỉ xem** — không thao tác nào ở đây đổi được lời bot. Sửa khối nào thì sang màn của khối đó.

__Khi nào dùng:__ vừa lưu lời bot và muốn chắc bot đọc bản mới; bot trả lời trái với điều bạn đã viết; nghi luật chung và lời bot riêng nói ngược nhau; muốn biết khối nào đang phình to.

__Trước khi bắt đầu:__
- Có hai chỗ xem: khung «AI đang đọc gì trên page này» ở cột phải trang một page (tóm tắt), và màn «Đoạn chữ gửi cho AI» (nguyên văn, đường dẫn `/prompt-page?page=…`).
- Màn «Đoạn chữ gửi cho AI» **chưa lọc theo sản phẩm bạn phụ trách**: ô chọn page liệt kê mọi page của team. Phạm vi này có thể thay đổi.

## Các bước

1. Mở trang của page (Marketer: **Page → Các page**, bấm tên page). Nếu vừa lưu lời bot, tải lại trang (F5) trước.
   → *Kết quả:* cột phải có khung mở sẵn «AI đang đọc gì trên page này».
2. Đọc ba dòng của khung.
   → *Kết quả:*
   - «Luật chung»: «bản … · … ký tự», hoặc «bộ gốc trong mã» khi team chưa có bản riêng.
   - «Lời bot»: «bản … · … ký tự», hoặc «chưa có bản chạy».
   - «Sản phẩm»: «… món · giá · ảnh».
3. Bấm «Xem nguyên văn đoạn chữ gửi AI».
   → *Kết quả:* màn «Đoạn chữ gửi cho AI» mở, ô «Chọn page» đã lọc và chọn sẵn đúng page. Góc phải ghi «Bot đang chạy» hoặc «Bot tắt».
4. Đọc trạng thái ở đầu màn trước khi đọc nội dung.
   → *Kết quả:* một trong ba cảnh:
   - Nhãn «Bot đang dùng» cạnh tiêu đề: bot đang ghép lời đúng từ các khối bên dưới.
   - Hộp đỏ «Bot KHÔNG dùng các khối này»: máy chủ chưa bật cách ghép lời mới; các khối dưới là thứ SẼ dùng khi bật. Lời bot và sản phẩm bạn lưu vẫn tới bot, chỉ thứ tự và câu chữ quanh chúng khác.
   - Hộp vàng «Chưa biết bot có dùng các khối này không»: máy chủ chưa đo được — đừng đọc bảng dưới thành «đây là thứ bot đang gửi».
5. Cuộn qua mục «Năm khối của prompt».
   → *Kết quả:* dòng tổng «Tổng ≈ … token mỗi lượt chat» (kèm «… khối đang thiếu» nếu có), rồi năm khối theo thứ tự AI đọc — xem bảng dưới. Mỗi khối có «Ai sửa được: …», độ dài ước tính, thanh «So với thiết kế» và nguyên văn nội dung.
6. Nếu có, đọc mục «Chỗ đáng đọc lại» ở cuối.
   → *Kết quả:* các cặp khối có câu nói ngược nhau, kèm đoạn trích của từng bên.

![Cột phải trang một page — khung «AI đang đọc gì trên page này» và nút xem nguyên văn](images/xem-doan-chu-ai-doc.png)

<!-- CHỤP: anh=xem-doan-chu-ai-doc · vai=marketer · duong=/page · cho=«Chọn một page ở cột trái»
     thao_tac=bấm dòng đầu tiên của «Danh sách page»
     trang_thai=trang một page đã mở, cột phải hiện khung «AI đang đọc gì trên page này» với ba dòng «Luật chung», «Lời bot», «Sản phẩm»
     danh_dau=(1) «AI đang đọc gì trên page này» · (2) «Xem nguyên văn đoạn chữ gửi AI» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Khung «AI đang đọc gì trên page này» | Đọc nhanh số bản và số ký tự của từng phần |
| (2) | Nút «Xem nguyên văn đoạn chữ gửi AI» | Mở màn nguyên văn, chọn sẵn page này |

![Màn «Đoạn chữ gửi cho AI» — năm khối, độ dài và thanh «So với thiết kế»](images/xem-doan-chu-ai-doc-2.png)

<!-- CHỤP: anh=xem-doan-chu-ai-doc-2 · vai=marketer · duong=/prompt-page · cho=«Năm khối của prompt»
     thao_tac=cuộn tới «Kịch bản của page»
     trang_thai=đã chọn một page có lời bot đang chạy; các khối hiện nội dung, khối «Kịch bản của page» có dòng «v… · LIVE»
     danh_dau=(1) «Năm khối của prompt» · (2) «Kịch bản của page» · (3) «So với thiết kế» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Tiêu đề «Năm khối của prompt» và dòng tổng *(ở đầu màn, ngoài ảnh)* | Biết tổng độ dài AI đọc mỗi lượt |
| (2) | Khối «Kịch bản của page» | Kiểm số bản «v…» và nguyên văn lời bot |
| (3) | Thanh «So với thiết kế» | Khối nào vượt cỡ dự tính (trên 1×) là đang phình |

## Năm khối

| Khối (tên trên màn) | Chứa gì | Dòng «Ai sửa được» trên màn | Trang hướng dẫn |
|---|---|---|---|
| «Quy tắc gốc (cứng trong sản phẩm)» | Luật nền, luôn đứng đầu | «CHỈ lập trình viên sửa được — nó cứng trong mã nguồn, đổi là phải phát hành bản mới» | — |
| «Quy tắc chung của team» | Quy tắc chung cho mọi page (ghi «v…», hoặc «bản toàn hệ (kế thừa)») | «Quản trị · dùng chung mọi page của team» | [Soạn bản mới cho quy tắc chung mọi page](./sua-quy-tac-chung.md) |
| «Kỹ năng đang bật» | Kỹ năng tư vấn bật theo nhóm sản phẩm | «Marketer · bật theo nhóm sản phẩm» | — |
| «Kịch bản của page» | Lời bot đang chạy, ghi «v… · LIVE» | «Marketer phụ trách page» | [Viết và lưu lời bot cho một page](./viet-loi-bot.md) |
| «Sản phẩm và giá» | Tên, mô tả và giá theo số lượng của từng món page đang bán | «Tự lấy từ kho hàng — không ai gõ tay ở đây» | [Xem giá và tồn kho theo thị trường](./xem-gia-ton-kho.md) |

Khối thiếu hiện nhãn «Đang thiếu» kèm lý do (ví dụ «Page này chưa có bản kịch bản nào ở trạng thái LIVE.»), và nút «Sang màn sửa» khi có màn sửa.

## Đọc đúng khối «Kịch bản của page»

- Đây là **bản cho AI** dựng từ ba ô «Giọng điệu / phong cách», «Câu chào mở đầu», «Cách bán / điểm mạnh riêng». Khi lưu, bản này thường được dịch sang tiếng Anh gọn; câu gửi khách trong ngoặc (không phải tiếng Việt) và mọi con số, giá, link giữ nguyên văn.
- Năm ô «Trả lời nhanh» **không** nằm trong đoạn chữ: chúng là câu bot gửi thẳng khi khách hỏi đúng chủ đề, không qua AI.
- Khối «Sản phẩm và giá» trên màn này **chưa in** phần kiến thức sản phẩm (công dụng, hỏi size…). Kiểm kiến thức ở tab «Chung» của sản phẩm (xem [Sửa kiến thức sản phẩm và câu «hỏi size trước khi chốt»](./sua-kien-thuc-san-pham.md)).

## «Chỗ đáng đọc lại»

Màn dò thô theo từ khoá, chỉ báo khi hai vế nằm ở **hai khối khác nhau**: «Dò theo từ khoá: bắt được mâu thuẫn thô, bỏ sót kiểu tinh vi. Đây là gợi ý, không phải phán quyết.». Bốn kiểu được dò:

| Một khối nói | Khối kia nói |
|---|---|
| Cấm giảm giá | Nêu mức giảm cụ thể |
| Cấm hứa ngày giao | Hứa một mốc giao cụ thể |
| Cấm thu tiền trước | Nhắc chuyển khoản / đặt cọc |
| Cấm bịa thông số | Cho phép đoán |

Thấy một cặp: sửa khối thuộc quyền bạn (thường là lời bot), hoặc báo Quản trị nếu vế sai nằm ở quy tắc chung.

## Xử lý khi lỗi

| Màn ghi | Nghĩa | Làm gì |
|---|---|---|
| «Không đọc được prompt của page này» kèm lý do | Lượt đọc hỏng, hoặc máy chủ dựng thiếu phần đọc khối | Tải lại; câu có «chưa nối» thì báo người quản trị hệ thống |
| «Không tải được danh sách page» | Lượt đọc danh sách hỏng | Tải lại trang |
| «Team này chưa có page nào để xem prompt» | Team chưa có page | Việc của Quản trị |
| Ô chọn ghi «còn … không hiện» | Danh sách cắt ở 200 page | Gõ tên hoặc mã page vào ô «Tên page hoặc id Facebook…» |
| Khung «AI đang đọc gì» ghi «Chọn một page để xem AI đọc gì trên page đó.» | Chưa chọn page | Bấm một page ở cột trái |

__Liên quan:__ [Bắt đầu nhanh cho Marketer: sửa một câu lời bot và kiểm tra bot đã đọc bản mới](./bat-dau-nhanh-marketer.md) · [Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md) · [Sự cố bot: không trả lời, sai giá, page không bật được](./su-co-bot.md)
