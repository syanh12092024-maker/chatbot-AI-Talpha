# Các loại đơn ở tab Đơn chờ và cách xử lý ngoài hệ

> Bảng tra cho sale và quản trị: mỗi loại đơn trong tab «Đơn chờ» của Hộp thư nhận ra thế nào, làm được gì ngay trên hệ, và việc gì vẫn phải làm trên kho hàng hoặc Pancake.

Đối chiếu với hệ ngày 05/10/2026.

**Vai đọc:** Sale · Quản trị (hai vai mở được Hộp thư).

## Tab «Đơn chờ» ở đâu

«Hộp thư» (đường `/ban-hoi-thoai`) → tab «Đơn chờ». Tab có ba khối, luôn theo thứ tự này, mỗi khối ghi «{tên khối} · {số}». Mỗi khối hiện tối đa 100 đơn (quá thì có dòng «Chỉ hiện 100 đơn mỗi loại.»). Số trên tab là tổng ba khối; số trên tab «Cần bạn» cũng cộng cả số này. Tab chỉ có đơn của team đang mở.

Trong tab «Cần bạn», đơn Messenger chờ duyệt hiện thành từng dòng của hàng đợi; hai khối còn lại chỉ hiện ở cuối danh sách khi có đơn.

![Tab «Đơn chờ» — ba khối đơn đang chờ người](images/cac-loai-don-cho.png)

<!-- CHỤP: anh=cac-loai-don-cho · vai=sale · duong=/ban-hoi-thoai · cho=«Đơn chờ»
     thao_tac=bấm «Đơn chờ»
     trang_thai=tab «Đơn chờ» đang sáng; cột trái hiện đủ ba khối «Messenger chờ duyệt», «Đơn không gắn hội thoại», «Ladi chờ xác nhận WhatsApp», mỗi khối có số đếm (khối trống hiện câu «Không có…» / «Chưa có đơn nào…»)
     danh_dau=(1) «Messenger chờ duyệt» · (2) «Đơn không gắn hội thoại» · (3) «Ladi chờ xác nhận WhatsApp» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Khối «Messenger chờ duyệt» | Bấm tên khách để mở hội thoại và thẻ đơn |
| (2) | Khối «Đơn không gắn hội thoại» | Việc đơn không có chat — nhận và đóng ở «Việc đang chờ» |
| (3) | Khối «Ladi chờ xác nhận WhatsApp» | Chỉ xem — chưa có nút xử lý |

## Bảng các loại đơn

| Loại đơn (tên trên màn) | Nhận ra thế nào | Làm được gì trên hệ | Việc phải làm ngoài hệ |
|---|---|---|---|
| **«Messenger chờ duyệt»** — đơn bot đã chốt trong chat Messenger, chờ sale duyệt | Tab «Đơn chờ»: tên khách (bấm được), dòng «{page} · {N} gói · {tiền}», giờ bot chốt; đơn chờ lâu nhất lên đầu. Tab «Cần bạn»: dòng «Bot chốt đơn — chờ bạn duyệt», nhãn «Đơn chờ duyệt». Khối trống ghi «Không có đơn Messenger nào chờ duyệt.» | Mở hội thoại → thẻ «Đơn bot chốt · Messenger» → «Duyệt → Chờ in» · «Sửa đơn» · «Từ chối». Duyệt = tạo đơn thật trên kho hàng ở «Chờ in», không qua WhatsApp. Xem [Duyệt, sửa hoặc từ chối đơn Messenger chờ duyệt](./duyet-don-messenger.md) | Thường không cần. Khách tầng hoàn cao: gọi xác nhận trước khi duyệt (thẻ nhắc). Đơn tạo nhầm: huỷ bằng tay trên kho hàng — hệ không có nút huỷ đơn |
| **Đơn Messenger mang cảnh báo «Nghi trùng đơn»** | Hộp vàng «Nghi trùng đơn» trên thẻ đơn, kèm lý do của lần kiểm chống trùng gần nhất (thấy trùng, hoặc chưa tra được) | Sửa, từ chối được. Duyệt sẽ bị chặn ở cửa «Chống trùng đơn» cho tới khi lần kiểm lại qua | Kiểm đơn cũ của khách: [Tìm khách theo số điện thoại và xem mọi đơn của khách](./tim-khach.md) → «Mọi đơn của khách», và trên kho hàng. Đơn đúng là trùng: từ chối kèm lý do. <!-- TBD: quy trình chốt khi nghi trùng (ai quyết giữ đơn nào, gộp/huỷ trên kho hàng) — OQ-SA-4 --> |
| **«Đơn không gắn hội thoại»** — việc loại Đơn không có chat đi kèm (ví dụ đơn trang bán hàng cần người xem, đơn nghi trùng với đơn đã có) | Mỗi dòng là lý do bot đẩy sang (bấm được) và «{tên} đang xử» hoặc «Chưa ai nhận». Hộp thư còn ghi «{N} đơn không gắn hội thoại — xem ở tab «Đơn chờ».» Khối trống ghi «Không có việc đơn nào đang mở.» | Nhận việc, đóng việc với kết quả ở «Việc đang chờ» (tab «Đơn»); xem «Thông tin đơn» và «Hồ sơ khách» ở trang «Chi tiết việc cần xử». **Không** sửa hay duyệt đơn trên hệ; nút «Mở Pancake» mờ. Nếu bấm lý do mà không mở được trang việc, mở «Việc đang chờ» → tab «Đơn» rồi bấm dòng tương ứng. <!-- TBD: liên kết của dòng trong khối này trỏ tới một đường trang chưa thấy trên máy chủ — cần kiểm có mở được trang việc không — OQ-SA-2 --> | Xử lý đơn trên kho hàng theo lý do (gọi khách, sửa thông tin, xác nhận hoặc huỷ), rồi quay lại đóng việc. «Mở POS» trên trang chi tiết việc chỉ sáng khi máy chủ đã cấu hình đường mở đơn |
| **«Ladi chờ xác nhận WhatsApp»** — đơn khách tự đặt trên trang bán hàng (Ladi), đang ở luồng xác nhận WhatsApp | Mã đơn trên kho hàng (hoặc «Đơn #{số}»), dòng «{trạng thái} · {page} · {tiền}», giờ tạo. Ba trạng thái: «Chờ gửi WhatsApp xác nhận» · «Đã gửi WhatsApp, chờ khách» · «Gửi WhatsApp lỗi». Khối trống ghi «Chưa có đơn nào — luồng xác nhận WhatsApp chưa chạy (cần nối số WhatsApp và mẫu tin Meta duyệt).» | Chỉ xem. **Hệ chưa làm được việc này:** chưa có nút xử lý đơn trang bán hàng | Hiện tại: xác nhận với khách và đổi trạng thái đơn ngay trên kho hàng. <!-- TBD: quy trình xác nhận đơn trang bán hàng ngoài hệ khi luồng WhatsApp chưa chạy (ai gọi, đổi sang trạng thái nào trên kho hàng) — OQ-SA-3 --> WhatsApp chưa nối — sẽ bổ sung sau |
| **Việc «Nghi trùng với đơn đã có»** (một lý do trong khối «Đơn không gắn hội thoại») | Lý do «Nghi trùng với đơn đã có» trên dòng việc | Nhận việc, đóng việc. **Hệ chưa làm được việc này:** chưa có nút xử lý đơn nghi trùng | Hiện tại: kiểm hai đơn trên kho hàng (và «Mọi đơn của khách» ở màn Tìm khách), giữ hoặc huỷ trên kho hàng, rồi đóng việc với kết quả phù hợp (ví dụ «Đã xử ở Pancake/POS»). <!-- TBD: như OQ-SA-4 --> |
| Đơn đã duyệt hoặc đã loại | Rời tab «Đơn chờ». Thẻ trong hội thoại đổi nhãn «Đã duyệt» / «Đã loại» và khoá form | Không còn thao tác. Đơn đã duyệt xem lại ở [Tìm khách theo số điện thoại và xem mọi đơn của khách](./tim-khach.md) | Đơn đã duyệt nằm trên kho hàng ở «Chờ in»; các bước sau (đóng gói, giao) làm trên kho hàng như thường |

## Ghi chú

- Đơn chờ chỉ tính đơn của team đang mở. Sale làm cho cả ba team thì đổi team ở chip tên team để xem đơn chờ của team khác ([Đăng nhập, chọn team và đổi team](./dang-nhap-chon-team.md)).
- Khi tab không tải được, cột trái hiện «Không tải được đơn chờ» kèm câu lỗi.
- Ô «Tiền» trên các dòng đơn hiện tổng tiền đã lưu của đơn. <!-- TBD: như OQ-SA-1 — đơn vị của con số này -->
- Lý do trên dòng việc đơn có thể là chữ tự do do hệ ghi (ví dụ «doi_sua: khách muốn đổi/sửa đơn — ngoài tầm bot xác nhận»); nghĩa từng loại ở [Lý do bot giao việc và kết quả đóng việc](./tra-cuu-ly-do-giao-viec.md).
- Sự cố khi duyệt và cách gỡ: [Sự cố đơn: không duyệt được, nghi trùng, van tạo đơn đóng](./su-co-don.md).
