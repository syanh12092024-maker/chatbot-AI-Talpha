# Thêm kho hàng, kéo danh mục và quét page

> Trang này hướng dẫn người quản trị nối kho hàng của từng thị trường, kéo danh mục sản phẩm kèm giá về hệ, và quét Pancake để lấy page mới — ba việc nằm ở màn Cài đặt → Kết nối.

**Ai làm được:** Quản trị. Màn Kết nối chỉ mở cho vai Quản trị.

__Khi nào dùng:__ cài team lần đầu; khi team mở thêm một thị trường; khi kho hàng thêm món hoặc đổi giá; khi có page mới trên Pancake.

__Trước khi bắt đầu:__
- Mỗi thị trường cần: tên thị trường, mã cửa hàng trên Pancake và khoá API của cửa hàng đó. <!-- TBD: chỗ lấy mã cửa hàng và khoá API kho hàng chưa có nguồn — OQ-QT-4 -->
- **Một cửa hàng = một thị trường.** Mỗi thị trường chỉ được một kết nối, và hai thị trường không được trỏ về cùng một cửa hàng.
- Khác kho tài khoản Pancake (dùng chung ba team), kết nối kho hàng thuộc **team đang mở**.
- Màn không gọi thử khoá kho hàng. Màn ghi thẳng: «Màn không gọi thử khoá: khoá sai chỉ lộ ở đơn đầu tiên. Ngừng dùng thì TẮT, đừng bỏ.»

## Đọc bảng «POS · mỗi shop = một thị trường»

Mở **Cài đặt → Kết nối** (`/ket-noi`), kéo tới bảng «POS · mỗi shop = một thị trường». Góc phải ghi «Khoá API không bao giờ hiện ở đây».

| Cột | Nghĩa |
|---|---|
| «Thị trường» | Tên thị trường — cũng là tên cửa tạo đơn dùng để tìm kho hàng |
| «Tiền tệ» | Loại tiền gặp nhiều nhất trên các bậc giá của món thuộc cửa hàng này; «—» khi chưa kéo danh mục |
| «Shop» | Mã cửa hàng |
| «Trạng thái» | «Đang bật» hoặc «Đã tắt» |
| «Món» | «{n} món» đã kéo về; «chưa kéo danh mục» khi chưa có món nào của cửa hàng này; «chưa đo» khi hệ không đếm được |
| «Việc» | «Sửa» · «Tắt»/«Bật» · «Bỏ» (chỉ hiện khi máy chủ cho sửa) |

Chưa có kết nối nào thì bảng ghi «Team này chưa có kết nối POS nào — chưa có thì không tạo được đơn cho thị trường nào.»

## Các bước — thêm một kho hàng

1. Kéo xuống phần «Kéo dữ liệu» cuối trang, bấm «Thêm kho POS».
   → *Kết quả:* hộp «Thêm kết nối POS» mở ra với ba ô.
2. Gõ «Thị trường». Viết **đúng** tên thị trường hệ đang dùng (ví dụ Saudi · UAE · Kuwait); sai một chữ là cửa tạo đơn không tìm ra kho. <!-- TBD: danh sách tên thị trường chuẩn để tra trước khi gõ chưa có nguồn — OQ-QT-3 -->
   → *Kết quả:* ô nhận chữ; tên này không đổi được sau khi lưu.
3. Gõ «Mã cửa hàng trên Pancake» và dán «Khoá API của shop».
   → *Kết quả:* ô khoá ẩn ký tự. Gợi ý dưới ô: «Khoá đi một chiều: lưu xong không màn nào đọc lại được.»
4. Bấm «Lưu kết nối».
   → *Kết quả:* thông báo «Đã thêm kết nối POS «{thị trường}».», dòng mới hiện trong bảng với «Đang bật» và «Món» = «chưa kéo danh mục».

![Hộp «Thêm kết nối POS» mở từ phần «Kéo dữ liệu»](images/them-kho-hang-keo-du-lieu.png)

<!-- CHỤP: anh=them-kho-hang-keo-du-lieu · vai=quan-tri · duong=/ket-noi · cho=«Kéo dữ liệu»
     thao_tac=cuộn tới «Kéo dữ liệu» · bấm «Thêm kho POS»
     trang_thai=hộp «Thêm kết nối POS» đang mở với ba ô «Thị trường», «Mã cửa hàng trên Pancake», «Khoá API của shop» và nút «Lưu kết nối»
     danh_dau=(1) «Thị trường» · (2) «Khoá API của shop» · (3) «Lưu kết nối» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô «Thị trường» | Gõ đúng tên thị trường; không đổi được sau khi lưu |
| (2) | Ô «Khoá API của shop» | Dán khoá; lưu xong không ai đọc lại được |
| (3) | Nút «Lưu kết nối» | Lưu; màn không thử khoá |

## Các bước — kéo danh mục và giá

1. Ở phần «Kéo dữ liệu», bấm «Kéo danh mục và giá từ POS». Nút chỉ hiện khi team có ít nhất một kết nối «Đang bật».
   → *Kết quả:* nút quay vòng trong lúc hệ đọc từng thị trường đang bật — có thể mất một lúc.
2. Đọc hộp kết quả.
   → *Kết quả:* hộp xanh «Đã kéo danh mục sản phẩm» ghi «{n} thị trường · {n} biến thể đọc được · {n} sản phẩm mới · {n} cập nhật · {n} bậc giá», kèm thông báo «Kéo xong: {n} sản phẩm mới, {n} bậc giá.». Cột «Món» và «Tiền tệ» của bảng cập nhật.
3. Đọc các dòng chi tiết trong hộp (nếu có).
   → *Kết quả:* hộp chuyển vàng khi có thị trường hỏng, mỗi dòng ghi «{thị trường} (shop {mã}): {lỗi}». Thị trường hỏng không làm hỏng các thị trường còn lại. Có thể có thêm dòng «{n} biến thể POS KHÔNG có tên — bot không gọi được tên món nó đang bán.» hoặc «{n} số hiệu chưa có sản phẩm gốc: …» — các món đó cần gộp thành sản phẩm, xem [Gộp món POS thành một sản phẩm theo SKU](./gop-mon-pos.md).

## Các bước — quét Pancake tìm page mới

1. Bấm «Quét Pancake tìm page mới». Không có hộp xác nhận: lượt quét chỉ thêm page mới và cập nhật tên page, không xoá page nào, không đụng công tắc bot.
   → *Kết quả:* hộp xanh «Đã quét Pancake» ghi «{n} page · {n} mới · {n} cập nhật» (và «· {n} page trong danh mục không thấy ở lượt này» nếu có).
2. Đưa page mới về team: page mới quét về nằm ở kho «Chưa phân team», chưa thuộc team nào. Mở **Cài đặt → Người và team** và kéo chúng về theo [Chuyển page sang team khác](./chuyen-page-sang-team.md).
   → *Kết quả:* page xuất hiện ở danh sách page của team.

![Phần «Kéo dữ liệu» sau một lượt kéo danh mục](images/them-kho-hang-keo-du-lieu-2.png)

<!-- CHỤP: anh=them-kho-hang-keo-du-lieu-2 · vai=quan-tri · duong=/ket-noi · cho=«Quét Pancake tìm page mới»
     thao_tac=cuộn tới «Kéo dữ liệu»
     trang_thai=phần «Kéo dữ liệu» thấy đủ các nút «Thêm kho POS», «Kéo danh mục và giá từ POS», «Quét Pancake tìm page mới», «Kéo lại dữ liệu cũ (nạp lại)»
     danh_dau=(1) «Kéo danh mục và giá từ POS» · (2) «Quét Pancake tìm page mới» · (3) «Kéo lại dữ liệu cũ (nạp lại)» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | «Kéo danh mục và giá từ POS» | Đọc món, tồn và giá của mọi kho hàng đang bật |
| (2) | «Quét Pancake tìm page mới» | Lấy page mới về kho «Chưa phân team» |
| (3) | «Kéo lại dữ liệu cũ (nạp lại)» | Chỉ dùng khi được dặn — xem «Trường hợp đặc biệt» |

## Sửa, tắt, bỏ một kho hàng

- **Sửa:** bấm «Sửa», hộp «Sửa kết nối «{thị trường}»» mở ra. Ô thị trường bị khoá («Không đổi được tên thị trường — đó là khoá cửa tạo đơn tra mỗi lượt. Đổi thì bỏ rồi thêm lại.»). Ô khoá để trống = giữ khoá đang có. Lưu xong: «Đã sửa kết nối POS.»
- **Tắt** (cách đúng để ngừng dùng): bấm «Tắt», hộp «Tắt kho hàng «{thị trường}»?» báo «Tắt xong, mọi lượt tạo đơn cho thị trường này sẽ NÉM chứ không im lặng bỏ qua. Khoá API vẫn được giữ để bật lại.» — bấm «Tắt kết nối». Bật lại: bấm «Bật», không cần xác nhận.
- **Bỏ hẳn:** bấm «Bỏ», hộp «Bỏ hẳn kho hàng «{thị trường}»?» báo «KHOÁ API MẤT THEO, không lấy lại được…» — bấm «Bỏ hẳn». Chỉ bỏ khi chắc không bao giờ dùng lại cửa hàng đó.

## Trường hợp đặc biệt

- **Nút «Thêm kho POS» và cột «Việc» không hiện:** máy chủ chưa mở đường sửa kết nối kho hàng. Nhờ người quản trị hệ thống.
- **«Kéo lại dữ liệu cũ (nạp lại)»:** đọc lại page, hội thoại, kịch bản và kết nối kho hàng từ tệp cũ trên máy chủ. Hộp xác nhận «Nạp lại dữ liệu từ tệp trên máy chủ?» nói rõ công tắc bot, marketer và trọng điểm do người đặt không bị đụng tới; bấm «Kéo lại dữ liệu». Lượt nạp chạy nền, trang tự hỏi lại mỗi 2 giây; trạng thái hiện «Đang chạy», rồi «Xong» hoặc «Lượt gần nhất hỏng». Trên máy không còn tệp cũ, kết quả là hộp «Không có gì để kéo trên máy này» — bình thường, không có gì hỏng. Nút ghi «Chưa khả dụng» khi máy chủ chưa nối bộ nạp.
- **Tiền tệ «—» dù đã có món:** các món của cửa hàng chưa có bậc giá mang loại tiền. Kiểm giá ở [Xem giá và tồn kho theo thị trường](./xem-gia-ton-kho.md).

## Xử lý khi lỗi

- «Thiếu tên thị trường.» · «Thiếu shop id.» · «Thiếu khoá API — kết nối mới bắt buộc có khoá.» — hiện ngay trong hộp, điền đủ rồi lưu lại.
- «Team này đã có một kết nối POS cho thị trường "{tên}"…» — sửa kết nối đang có thay vì thêm cái thứ hai.
- «Shop "{mã}" đã được nối cho một thị trường khác của team này…» — kiểm lại mã cửa hàng.
- «Không mã hoá được khoá API POS: … — kết nối KHÔNG được ghi.» — máy chủ thiếu cấu hình mã hoá; nhờ người quản trị hệ thống.
- Hộp «Không kéo được danh mục POS» hoặc «Không quét được Pancake» ở đầu trang — đọc câu lỗi kèm theo, thử lại sau ít phút.
- «Quét xong nhưng không thấy page nào»: nếu câu giải thích nói hệ không thấy tài khoản Pancake nào thì thêm tài khoản ở [Kết nối tài khoản Pancake](./ket-noi-pancake.md); nếu nói có tài khoản nhưng không trả về page thì tài khoản đã hết hạn hoặc mất quyền — danh mục page giữ nguyên.
- «một lượt nạp đang chạy từ {giờ} (do {người} bấm) — chờ nó xong đã.» — chờ lượt kia xong.
- «Lượt kéo dữ liệu hỏng giữa chừng» — «Dữ liệu đã ghi được tới đâu vẫn giữ nguyên — lượt nạp chạy lại được, không cần dọn gì.»

__Liên quan:__ [Kết nối tài khoản Pancake](./ket-noi-pancake.md) · [Gộp món POS thành một sản phẩm theo SKU](./gop-mon-pos.md) · [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) · [Tra nhật ký: ai đã làm gì, lúc nào](./tra-nhat-ky.md)
