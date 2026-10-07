# Viết và lưu lời bot cho một page

> Trang này hướng dẫn viết lời bot riêng của một page — giọng điệu, câu chào, cách bán và năm câu trả lời nhanh — ở tab «Lời bot», và hiểu điều gì xảy ra khi bấm lưu.

**Ai làm được:** Marketer (page của sản phẩm mình phụ trách) · Quản trị.

__Khi nào dùng:__ page mới chưa có lời bot riêng; khối «Bật được chưa» báo «Thiếu kịch bản bán» hoặc «Kịch bản mỏng»; bot chào sai giọng, bán thiếu ý; cần đổi câu báo giá sau khi giá đổi.

__Trước khi bắt đầu:__
- **Lưu là chạy.** Không có bước duyệt: bấm lưu là bản mới thành bản đang chạy. Page đang bật bot thì khách thật nghe bản mới ngay.
- Mỗi lần lưu là **một bản mới**; bản cũ giữ ở tab «Lịch sử» (xem [Xem lịch sử lời bot và chạy lại một bản cũ](./lich-su-loi-bot.md)).
- Lời bot **không có kiểm phiên bản chống đè**: hai người cùng sửa một page thì bản lưu sau thành bản chạy. Bản của người kia vẫn còn trong «Lịch sử».
- Viết câu gửi khách bằng đúng ngôn ngữ của khách. Lời dặn cho AI (giọng điệu, cách bán) viết tiếng Việt được.

## Các bước

1. Mở trang của page (Marketer: **Page → Các page**, bấm tên page ở cột trái), rồi bấm tab «Lời bot».
   → *Kết quả:* dòng đầu ghi «Đang chạy: bản …» hoặc «Page này CHƯA có bản nào đang chạy». Ô nào cũng điền sẵn chữ của bản đang chạy.
2. Sửa ba ô chính — đây là phần AI đọc mỗi lượt chat:
   - «Giọng điệu / phong cách»: bot nói với khách bằng giọng nào.
   - «Câu chào mở đầu»: câu bot chỉ dùng ở tin đầu tiên của hội thoại.
   - «Cách bán / điểm mạnh riêng»: điểm mạnh, cách dẫn khách tới chốt.
   → *Kết quả:* ô tự cao theo chữ, không thanh cuộn trong ô.
3. Nếu cần, mở nhóm «Trả lời nhanh — 5 câu trả sẵn, không tốn tiền» (dòng gập, ghi «… /5 câu đã điền»), rồi điền các ô:
   «Trả lời nhanh — hỏi giá» · «… — hỏi ship» · «… — hỏi cách đặt» · «… — hỏi hàng thật/giả» · «… — hỏi size / dung tích».
   → *Kết quả:* mỗi câu bot gửi **nguyên văn** khi khách hỏi đúng chủ đề, không gọi AI. Để trống là AI tự trả lời.
4. Bấm «Lưu — bot dùng ngay».
   → *Kết quả:* nút quay chờ — lượt lưu có thể mất một lúc vì máy dựng bản cho AI đọc (thường dịch sang tiếng Anh gọn; câu gửi khách trong ngoặc giữ nguyên). Xong thì hiện «Đã lưu v… — bot đang chạy bản này.» và dòng đầu đổi sang số bản mới.
5. Tải lại trang (F5) rồi kiểm khung «AI đang đọc gì trên page này» ở cột phải.
   → *Kết quả:* dòng «Lời bot» mang số bản mới. Khung này và khối «Bật được chưa» không tự cập nhật nếu chưa tải lại (xem [Xem đúng đoạn chữ AI đang đọc trên một page](./xem-doan-chu-ai-doc.md)).

![Tab «Lời bot» — ba ô chính, nhóm «Trả lời nhanh» và nút «Lưu — bot dùng ngay»](images/viet-loi-bot.png)

<!-- CHỤP: anh=viet-loi-bot · vai=marketer · duong=/page · cho=«Chọn một page ở cột trái»
     thao_tac=bấm dòng đầu tiên của «Danh sách page» · bấm «Lời bot» · bấm «Trả lời nhanh»
     trang_thai=tab «Lời bot» đang mở, ba ô chính có chữ, nhóm «Trả lời nhanh» đã mở
     danh_dau=(1) «Câu chào mở đầu» · (2) «Trả lời nhanh» · (3) «Lưu — bot dùng ngay» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ba ô chính, gồm «Câu chào mở đầu» | Viết phần AI đọc mỗi lượt |
| (2) | Nhóm «Trả lời nhanh» | Điền câu bot bắn nguyên văn khi khách hỏi đúng chủ đề |
| (3) | Nút «Lưu — bot dùng ngay» *(dưới năm ô «Trả lời nhanh», ngoài ảnh — cuộn xuống)* | Lưu thành bản mới và cho chạy ngay |

## Những gì nằm cạnh ô soạn

- **Dưới ô soạn**, khối «Chính sách · FAQ · Xử lý phản đối — dùng chung mọi page» chỉ **tóm tắt**: số chính sách, số câu hỏi thường gặp, số cách xử lý phản đối, số bản. Ba khối này sửa ở một chỗ cho cả team qua liên kết «Sửa ở Luật chung › Chính sách · FAQ · Phản đối →» (xem [Sửa Chính sách · FAQ · Phản đối dùng chung mọi page](./chinh-sach-faq-phan-doi.md)).
- **Cột phải**, ô «① Luật chung» tóm tắt quy tắc chung của team (số bản, số ký tự) và nhắc: khối này đứng TRƯỚC và THẮNG lời bot riêng — lời bot page chỉ đổi giọng, câu chào, cách bán. Quy tắc chung chỉ Quản trị sửa.
- **Tab «Sản phẩm & giá»** có thể hiện hộp «Bot đang báo cho khách … giá KHÔNG có trong bảng giá» hoặc «Kịch bản đang gõ cứng giá — hôm nay còn khớp bảng giá», kèm danh sách giá và tên ô chứa giá đó. Bấm «Sửa ở tab «Lời bot»» rồi sửa đúng ô được nêu: khách nghe giá gõ tay, còn đơn tính theo bảng giá.

## «Thử hỏi bot» chưa dùng được

Cột phải có ô «Thử hỏi bot», nhưng màn ghi «Chưa thử được ở đây — đường thử bot an toàn chưa dựng». Hệ chưa làm được việc thử hỏi bot ngay trên trang page. Hiện tại:
- Đọc khung «AI đang đọc gì trên page này» và bấm «Xem nguyên văn đoạn chữ gửi AI» để xem đúng chữ AI nhận.
- Nút «Chạy thử, chưa gửi ai» ở cột phải mở phần chạy thử ở **Cài đặt → Vận hành** — chỉ Quản trị mở được (xem [Xem câu bot soạn khi đang chạy thử](./xem-chay-thu.md)).

## Xử lý khi lỗi

| Màn ghi | Nghĩa | Làm gì |
|---|---|---|
| Hộp đỏ «Bot CHƯA chạy bản này» kèm «đã giữ chữ bạn vừa soạn thành bản nháp v…, nhưng bot CHƯA chạy bản này: … Bot vẫn đang nói bản cũ.» | Bản đã lưu dạng nháp nhưng không đẩy được sang bot | Chữ còn nguyên trong ô — bấm lưu lại. Vẫn lỗi thì gửi nguyên câu cho Quản trị. Bản nháp hiện ở «Lịch sử» với nhãn «Nháp» |
| «bản kịch bản trống — không có trường nào có nội dung.» | Cả tám ô đều trống | Điền ít nhất một ô |
| «Chỉ vai … soạn được kịch bản. Vai của bạn: …» | Tài khoản không có vai Quản trị hay Marketer | Nhờ quản trị kiểm vai |
| «Cần vai Quản trị hoặc Marketer để sửa.» thay cho nút lưu | Vai của bạn chỉ xem | Như trên |
| «Không đọc được kịch bản của page» | Lượt đọc hỏng | Tải lại trang |
| Câu có «chưa nối cửa ghi kho kiến thức của bot» | Máy chủ dựng thiếu đường ghi sang bot — lưu bị từ chối | Báo người quản trị hệ thống |

__Liên quan:__ [Bắt đầu nhanh cho Marketer: sửa một câu lời bot và kiểm tra bot đã đọc bản mới](./bat-dau-nhanh-marketer.md) · [Nhập lời bot từ file kịch bản Pancake](./nhap-loi-bot-tu-pancake.md) · [Kiểm tra page đã sẵn sàng bật bot chưa](./kiem-tra-bat-duoc-chua.md) · [Thêm, sửa câu trả lời sẵn theo từ khoá](./cau-tra-loi-san.md)
