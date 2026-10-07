---
type: userguide-index
scope: product
audience: người vận hành nội bộ — Sale · Marketer · Quản trị team
lang: vi
status: draft
updated: 2026-10-05
links:
  - docs/v3/03-MAN-HINH.md
  - docs/v3/01-QUYET-DINH.md
  - docs/v3/THUAT-NGU.md
  - v3/src/ui/chung/man-hinh.js
---

# Cẩm nang vận hành AI Closer — index

Giọng: thân thiện, xưng «bạn», thì hiện tại. Độ chi tiết: sâu (kể cả trạng thái màn, trường hợp biên,
việc ít dùng). Đối chiếu với hệ: mã nhánh `vao-ui-v3-17-09` @ `29e61b3` — trùng bản đang chạy trên máy chủ
(`8dc9bcd`, lên 05/10/2026). Chữ trên màn theo `docs/v3/THUAT-NGU.md`.

Ảnh: chụp tự động từ bản xem thử dữ liệu giả (không PII, không chạm máy chủ). Tính năng chưa có trên hệ
(sale «Trả lại bot» · «Thử hỏi bot» · nút xử lý đơn trang bán hàng / nghi trùng) ghi «hệ chưa làm được,
hiện xử lý thế này». WhatsApp: bổ sung sau.

Loại (nội bộ, để soát không trộn loại): Exp = tổng quan/khái niệm · Tut = bắt đầu nhanh · How = theo tác vụ ·
Ref = tra cứu · Tro = xử lý sự cố · FAQ · Glo = thuật ngữ.

## Sections

| # | slug | Tiêu đề | Nhóm | Loại | Vai đọc | Nguồn | status |
|---|---|---|---|---|---|---|---|
| 1 | tong-quan | AI Closer làm gì cho bạn | Bắt đầu | Exp | mọi vai | 00-BAT-DAU, 01 §1 §9 §10 §14 | written |
| 2 | bon-tang-cau-tra-loi | Bot ghép câu trả lời từ bốn tầng | Bắt đầu | Exp | mọi vai | 01 §6 §8 | written |
| 3 | khi-nao-bot-tra-loi | Khi nào bot trả lời, khi nào im và giao cho người | Bắt đầu | Exp | mọi vai | README, 01 §10 | written |
| 4 | dang-nhap-chon-team | Đăng nhập, chọn team và đổi team | Bắt đầu | How | mọi vai | auth/trang, khung | written |
| 5 | ban-do-giao-dien | Bản đồ giao diện: năm đích và các mục con | Bắt đầu | Ref | mọi vai | man-hinh.js, 03 «Khung» | written |
| 6 | vai-va-quyen | Vai và quyền: mỗi vai mở được gì, sửa được gì | Bắt đầu | Ref | mọi vai | menuCua, VAI_* | written |
| 7 | bat-dau-nhanh-sale | Bắt đầu nhanh cho Sale: xử lý trọn một việc đầu tiên | Sale — Hộp thư | Tut | Sale | ban-hoi-thoai | written |
| 8 | nhan-va-dong-viec | Nhận một việc bot giao lại và đóng việc với kết quả | Sale — Hộp thư | How | Sale · Quản trị | ban-hoi-thoai, dispatch | written |
| 9 | nhan-thay-bot | Nhận thay bot một hội thoại bot đang xử | Sale — Hộp thư | How | Sale · Quản trị | ban-hoi-thoai | written |
| 10 | doc-hoi-thoai-boi-canh | Đọc hội thoại và bối cảnh khách trước khi trả lời | Sale — Hộp thư | How | Sale · Quản trị | ban-hoi-thoai | written |
| 11 | tra-loi-tren-pancake | Trả lời khách trên Pancake mà không chen ngang bot | Sale — Hộp thư | How | Sale | 01 §10 | written |
| 12 | duyet-don-messenger | Duyệt, sửa hoặc từ chối đơn Messenger chờ duyệt | Sale — Hộp thư | How | Sale · Quản trị | hop-thu, van-hanh/don-cho | written |
| 13 | cac-loai-don-cho | Các loại đơn ở tab Đơn chờ và cách xử lý ngoài hệ | Sale — Hộp thư | Ref | Sale · Quản trị | ban-hoi-thoai tab Đơn chờ | written |
| 14 | tim-khach | Tìm khách theo số điện thoại và xem mọi đơn của khách | Sale — Hộp thư | How | Sale · Quản trị | ho-so-khach | written |
| 15 | bat-dau-nhanh-marketer | Bắt đầu nhanh cho Marketer: sửa một câu lời bot và kiểm tra bot đã đọc bản mới | Marketer — Sản phẩm & Page | Tut | Marketer | mot-page | written |
| 16 | viec-cua-toi | Xem việc cần làm mỗi sáng ở «Việc của tôi» | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | trang-chu | written |
| 17 | tim-san-pham-phu-trach | Tìm sản phẩm bạn phụ trách và đọc bốn tầng | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | san-pham | written |
| 18 | sua-kien-thuc-san-pham | Sửa kiến thức sản phẩm và câu «hỏi size trước khi chốt» | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | san-pham tab Chung | written |
| 19 | xem-gia-ton-kho | Xem giá và tồn kho theo thị trường | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | san-pham Theo thị trường | written |
| 20 | kiem-tra-bat-duoc-chua | Kiểm tra page đã sẵn sàng bật bot chưa | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | mot-page | written |
| 21 | viet-loi-bot | Viết và lưu lời bot cho một page | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | mot-page, kich-ban | written |
| 22 | nhap-loi-bot-tu-pancake | Nhập lời bot từ file kịch bản Pancake | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | mot-page | written |
| 23 | lich-su-loi-bot | Xem lịch sử lời bot và chạy lại một bản cũ | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | mot-page tab Lịch sử | written |
| 24 | anh-gui-khach | Thêm và gắn nhãn ảnh bot gửi khách | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | mot-page tab Ảnh | written |
| 25 | xem-doan-chu-ai-doc | Xem đúng đoạn chữ AI đang đọc trên một page | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | prompt-page | written |
| 26 | chinh-sach-faq-phan-doi | Sửa Chính sách · FAQ · Phản đối dùng chung mọi page | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | khoi-chung | written |
| 27 | cau-tra-loi-san | Thêm, sửa câu trả lời sẵn theo từ khoá | Marketer — Sản phẩm & Page | How | Marketer · Quản trị | lop-0-dong | written |
| 28 | bat-dau-nhanh-quan-tri | Bắt đầu nhanh cho Quản trị: đưa page đầu tiên tới lúc bật bot | Quản trị — Cài đặt | Tut | Quản trị | cai-dat-team | written |
| 29 | ket-noi-pancake | Kết nối tài khoản Pancake | Quản trị — Cài đặt | How | Quản trị | ket-noi | written |
| 30 | them-kho-hang-keo-du-lieu | Thêm kho hàng, kéo danh mục và quét page | Quản trị — Cài đặt | How | Quản trị | ket-noi | written |
| 31 | chon-model-ai | Chọn model AI, thay khoá và thử một lượt | Quản trị — Cài đặt | How | Quản trị | model | written |
| 32 | tao-nguoi-dung | Tạo người dùng, cấp vai và đặt mật khẩu đầu tiên | Quản trị — Cài đặt | How | Quản trị | team | written |
| 33 | lay-nguoi-tu-hrm | Lấy người từ HRM: xem kế hoạch rồi áp dụng | Quản trị — Cài đặt | How | Quản trị | team, ket-noi | written |
| 34 | chuyen-page-sang-team | Chuyển page sang team khác | Quản trị — Cài đặt | How | Quản trị | team/gan-page | written |
| 35 | gop-mon-pos | Gộp món POS thành một sản phẩm theo SKU | Quản trị — Sản phẩm & Page | How | Quản trị | san-pham | written |
| 36 | them-thi-truong | Thêm hoặc gỡ một thị trường cho sản phẩm | Quản trị — Sản phẩm & Page | How | Quản trị | san-pham | written |
| 37 | sua-bang-gia | Sửa bảng giá của sản phẩm ở một thị trường | Quản trị — Sản phẩm & Page | How | Quản trị | san-pham | written |
| 38 | gan-marketer | Gán marketer phụ trách sản phẩm | Quản trị — Sản phẩm & Page | How | Quản trị | san-pham | written |
| 39 | gan-page-vao-san-pham | Gắn hoặc gỡ page khỏi sản phẩm | Quản trị — Sản phẩm & Page | How | Quản trị | san-pham | written |
| 40 | chuyen-page-cu | Chuyển page cũ sang sản phẩm | Quản trị — Sản phẩm & Page | How | Quản trị | san-pham | written |
| 41 | doi-soat-gia-anh | Đối soát giá và ảnh của page cũ trước khi chuyển | Quản trị — Sản phẩm & Page | How | Quản trị | san-pham | written |
| 42 | loc-page-bat-bot-hang-loat | Lọc danh sách page và bật bot hàng loạt | Quản trị — Sản phẩm & Page | How | Quản trị | page-bot | written |
| 43 | bat-tat-bot | Bật hoặc tắt bot cho một page | Quản trị — Sản phẩm & Page | How | Quản trị | mot-page, page-bot | written |
| 44 | sua-quy-tac-chung | Soạn bản mới cho quy tắc chung mọi page | Quản trị — Sản phẩm & Page | How | Quản trị | bo-luat | written |
| 45 | duyet-goi-y-ai | Duyệt hoặc từ chối gợi ý từ AI | Quản trị — Sản phẩm & Page | How | Quản trị | ai-de-xuat | written |
| 46 | kiem-tra-he-con-song | Kiểm tra «Hệ còn sống» mỗi ngày | Quản trị — Theo dõi vận hành | How | Quản trị | suc-khoe | written |
| 47 | doi-chieu-tin-loi | Đối chiếu tin gửi lỗi | Quản trị — Theo dõi vận hành | How | Quản trị | van-hanh | written |
| 48 | xem-tin-bi-loc | Xem tin bị lọc trong 24 giờ | Quản trị — Theo dõi vận hành | How | Quản trị | van-hanh | written |
| 49 | xem-chay-thu | Xem câu bot soạn khi đang chạy thử | Quản trị — Theo dõi vận hành | How | Quản trị | van-hanh | written |
| 50 | tra-nhat-ky | Tra nhật ký: ai đã làm gì, lúc nào | Quản trị — Theo dõi vận hành | How | Quản trị | nhat-ky | written |
| 51 | doc-don-ti-le-chot | Đọc đơn và tỉ lệ chốt theo hai luồng | Số liệu | How | Quản trị · Marketer | bao-cao | written |
| 52 | tim-page-ton-tien-ai | Tìm page tốn tiền AI mà không ra đơn | Số liệu | How | Quản trị · Marketer | chi-phi | written |
| 53 | xem-khach-roi-rui-ro-hoan | Xem khách rơi ở đâu và rủi ro hoàn | Số liệu | How | Quản trị · Marketer | nguon-khach, rui-ro-hoan | written |
| 54 | tra-cuu-ly-do-giao-viec | Lý do bot giao việc và kết quả đóng việc | Tra cứu | Ref | Sale · Quản trị | dispatch | written |
| 55 | tra-cuu-bat-duoc-chua | Điều kiện «Bật được chưa» và cột «Còn thiếu» | Tra cứu | Ref | Marketer · Quản trị | san-sang, page-bot | written |
| 56 | tra-cuu-den-he-con-song | Các đèn của «Hệ còn sống» | Tra cứu | Ref | Quản trị | suc-khoe | written |
| 57 | tra-cuu-con-so | Các con số ở Số liệu: mỗi thước đo gì | Tra cứu | Ref | Quản trị · Marketer | bao-cao, chi-phi | written |
| 58 | tra-cuu-rui-ro-hoan | Bốn tầng rủi ro hoàn hàng | Tra cứu | Ref | mọi vai | rui-ro-hoan | written |
| 59 | tra-cuu-nho-quan-tri-he-thong | Việc phải nhờ người quản trị hệ thống | Tra cứu | Ref | Quản trị | cai-dat-team | written |
| 60 | su-co-dang-nhap-quyen | Sự cố đăng nhập, quyền và «không thấy màn» | Xử lý sự cố | Tro | mọi vai | auth, 403 theo vai | written |
| 61 | su-co-bot | Sự cố bot: không trả lời, sai giá, page không bật được | Xử lý sự cố | Tro | Marketer · Quản trị | suc-khoe, 01 §8 | written |
| 62 | su-co-don | Sự cố đơn: không duyệt được, nghi trùng, van tạo đơn đóng | Xử lý sự cố | Tro | Sale · Quản trị | hop-thu thẻ đơn | written |
| 63 | su-co-so-lieu | Sự cố số liệu: «chưa có nguồn», «chưa biết», số lệch | Xử lý sự cố | Tro | Marketer · Quản trị | bao-cao | written |
| 64 | hoi-dap | Câu hỏi thường gặp | Hỏi đáp & thuật ngữ | FAQ | mọi vai | tổng hợp | written |
| 65 | thuat-ngu | Thuật ngữ | Hỏi đáp & thuật ngữ | Glo | mọi vai | THUAT-NGU.md | written |

## Open Questions

Trạng thái: hold (05/10/2026). Mỗi câu trả lời xong ⇒ điền vào các trang liệt kê, gỡ dấu TBD tương ứng.
Câu nào là khác biệt nghiệp vụ thật (màn làm khác ý đồ) ⇒ mở phiếu theo sổ điều hành, không sửa trong cẩm nang.

### A. Quy trình nghiệp vụ — cần người quyết trả lời

| Mã | Câu hỏi | Trang chờ điền |
|---|---|---|
| OQ-CH-1 (= QT-5) | Người dùng quên mật khẩu: ai đặt lại, làm ở đâu? (hệ chưa có đường đặt lại) | dang-nhap-chon-team · tao-nguoi-dung · su-co-dang-nhap-quyen · tra-cuu-nho-quan-tri-he-thong · hoi-dap |
| OQ-QT-6 | Khoá / mở khoá tay một tài khoản tạo tay (không gắn HRM) làm thế nào? (màn không có nút) | tao-nguoi-dung · tra-cuu-nho-quan-tri-he-thong |
| OQ-SA-3 | Đơn trang bán hàng khi WhatsApp chưa chạy: ai gọi xác nhận, đổi sang trạng thái nào trên kho hàng? | cac-loai-don-cho |
| OQ-SA-4 | Đơn nghi trùng giữa hai luồng: ai quyết giữ đơn nào, gộp hay huỷ trên kho hàng? | cac-loai-don-cho · su-co-don |
| OQ-SA-6 | Lượt tạo đơn mất phản hồi: ai tạo tay trên kho hàng, có phải báo quản trị không? | su-co-don |
| OQ-SA-7 | Đơn bot chốt để trống «Mã kho POS»: sale lấy mã kho ở đâu? | duyet-don-messenger · su-co-don |
| OQ-SA-5 | Tài khoản Pancake của sale cần quyền gì trên page để mở hội thoại từ đường dẫn? | tra-loi-tren-pancake |
| OQ-SL-1 | Ai ghép tài khoản marketer trên kho hàng với hồ sơ HRM; đơn «chờ gán team» thì báo ai? | su-co-so-lieu |
| OQ-QT-1 | Các bước lấy chuỗi tài khoản trong Pancake để dán vào màn Kết nối | ket-noi-pancake |
| OQ-QT-3 | Danh sách tên thị trường chuẩn để gõ khi thêm kho hàng | them-kho-hang-keo-du-lieu |
| OQ-QT-4 | Lấy mã cửa hàng và khoá API kho hàng ở đâu? | them-kho-hang-keo-du-lieu |
| OQ-MK-2 | Page đã gắn sản phẩm: ai sửa ảnh, ở màn nào? (Sản phẩm › Theo thị trường chưa có chỗ sửa ảnh) | anh-gui-khach |

### B. Cần đo trên máy chủ hoặc người quyết xác nhận ý đồ

| Mã | Câu hỏi | Trang chờ điền |
|---|---|---|
| OQ-CH-2 | Bot tự giao (khiếu nại, hết lượt…) không tạo dòng việc ở «Cần bạn» — nợ hay ý đồ? Sale theo dõi chính thức bằng cách nào? | khi-nao-bot-tra-loi |
| OQ-CH-4 | Máy chủ đã bật «cách ghép lời mới» chưa? (điều kiện để bật bot; nhật ký 05/10: chưa) | bon-tang-cau-tra-loi |
| OQ-CH-5 | Lớp câu mẫu (giá · ship · cách đặt · lời chào đầu) đang bật hay tắt trên máy chủ? | bon-tang-cau-tra-loi · khi-nao-bot-tra-loi |
| OQ-CH-6 | Khi bật cách ghép lời mới, bot có đọc Chính sách · FAQ · Phản đối không? (mã: chưa thấy) | bon-tang-cau-tra-loi |
| OQ-CH-3 (= MK-3) | Màn «Câu trả lời sẵn» chỉ là bộ đếm (bot không đọc chữ mẫu) — có định nối vào đường trả lời không? | bon-tang-cau-tra-loi · cau-tra-loi-san |
| OQ-MK-1 | «Nhập từ file Pancake» lỗi 500 (hàm bóc file đã gỡ) — có nối lại không? | nhap-loi-bot-tu-pancake |
| OQ-SA-1 | Ô «Tiền» thẻ đơn / Đơn chờ / Tìm khách có đang gấp 100 lần (chưa chia hệ số tiền tệ)? | duyet-don-messenger · cac-loai-don-cho |
| OQ-SA-2 | Liên kết dòng «Đơn không gắn hội thoại» trỏ đường máy chủ chưa đăng ký — mở được không? | cac-loai-don-cho · su-co-don |
| OQ-SL-2 | Lượt chấm tỉ lệ hoàn chạy lúc nào, ai chạy? (màn ghi «job đêm», hợp đồng màn ghi ảnh chụp 28/08) | su-co-so-lieu |
| OQ-QT-2 | Đổi thứ tự dự phòng tài khoản Pancake (đưa tài khoản phủ nhiều page lên «Chính») làm ở đâu? | ket-noi-pancake · tra-cuu-nho-quan-tri-he-thong |
| OQ-QT-7 | Cách tìm nhanh hội thoại có tin lỗi trong tab «Hội thoại» (tab không lọc / đánh dấu lỗi) | doi-chieu-tin-loi |
| OQ-SP-1 | Đề xuất AI không có nút từ chối / xoá — có làm không? | duyet-goi-y-ai |

Danh sách chỗ màn tự nói lệch / lỗi phát hiện khi viết: `lech-man-hinh-05-10.md` (cùng thư mục).
