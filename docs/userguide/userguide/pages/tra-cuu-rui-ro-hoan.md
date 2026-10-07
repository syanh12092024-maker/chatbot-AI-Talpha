# Bốn tầng rủi ro hoàn hàng

> Bảng tra bốn tầng rủi ro hoàn của khách: điều kiện xếp tầng, tên tầng ở từng màn, nơi bạn gặp huy hiệu và nên làm gì khi gặp.

Vai đọc: mọi vai (sale gặp huy hiệu này khi duyệt đơn). Đối chiếu với hệ ngày 05/10/2026.

## Cách hệ xếp tầng

| Mục | Giá trị |
|---|---|
| Tầng tính theo | Khách, không theo từng đơn — mọi đơn đã kết của khách gộp lại |
| Đơn tính là hoàn | Đơn trên kho hàng đang hoàn, đã hoàn, đã huỷ hoặc đã xoá. Đơn đang đóng gói KHÔNG tính là hoàn |
| Đơn đã kết (mẫu số) | Đơn hoàn như trên, cộng đơn đã giao và đơn đã nhận tiền. Đơn còn đang chạy không vào mẫu số |
| Tỉ lệ hoàn | Đơn hoàn ÷ đơn đã kết, theo phần trăm |
| Sàn để được xếp tầng | Ít nhất **2** đơn đã kết. Dưới sàn thì mang nhãn riêng «Chưa đủ đơn để xếp», không xếp tầng |
| Ba ngưỡng | **15 / 30 / 65** (%) |
| Biên | Mỗi tầng tính từ ngưỡng dưới, chưa tới ngưỡng trên: đúng 15% là Bình thường, đúng 30% là Cảnh báo, đúng 65% là Rủi ro cao |
| Ai chấm, khi nào | Lượt chấm hằng đêm tính sẵn cho từng khách; mọi màn chỉ đọc lại, không tự tính. Màn «Rủi ro hoàn hàng» ghi «Tính trên đơn tới … · chấm lần cuối …» |
| Chính sách | Chưa có. Màn ghi: «Chưa chỗ nào trong hệ dùng tầng rủi ro để chặn khách — kể cả tầng cao nhất.» |

## Bốn tầng và hai nhãn ngoài tầng

| Tầng | Điều kiện | Tên ở màn «Rủi ro hoàn hàng» | Tên ở Số liệu (Tổng quan, Khách) | Huy hiệu ở Hộp thư · Việc đang chờ · Tìm khách | Nên làm gì |
|---|---|---|---|---|---|
| Rủi ro cao | Từ 2 đơn đã kết, hoàn từ 65% | «Rủi ro cao — hoàn ≥65%» | «Hay hoàn · ≥65%» | «Hay hoàn hàng · hoàn ≥65%» (đỏ) | Gọi xác nhận trước khi duyệt — thẻ đơn hiện hộp cảnh báo (bảng dưới). Hệ không chặn khách |
| Cảnh báo | Từ 2 đơn đã kết, hoàn từ 30% tới dưới 65% | «Cảnh báo — hoàn 30–65% …» | «Cần theo dõi · 30–65%» | «Cần theo dõi · hoàn 30–65%» (vàng) | Gọi xác nhận trước khi duyệt — thẻ đơn hiện hộp cảnh báo |
| Bình thường | Từ 2 đơn đã kết, hoàn từ 15% tới dưới 30% | «Bình thường — hoàn 15–30%» | Gộp vào «Mua tốt · bình thường» | «Bình thường» (xanh) | Không có cảnh báo; duyệt theo các bước thường |
| Tốt | Từ 2 đơn đã kết, hoàn dưới 15% | «Tốt — hoàn 0–15%» | Gộp vào «Mua tốt · bình thường» | «Mua tốt» (xanh) | Không có cảnh báo; duyệt theo các bước thường |
| *(ngoài tầng)* Chưa đủ đơn | Đã chấm, nhưng dưới 2 đơn đã kết | «Chưa đủ đơn để xếp tầng» (cột «Xếp tầng được?»: «Chưa đủ đơn») | «Chưa đủ đơn để xếp» | «Chưa đủ đơn để xếp» (xám) | Tỉ lệ chưa có nghĩa — một đơn hoàn đã thành «hoàn 100%». Không coi là khách tốt hay xấu |
| *(ngoài tầng)* Chưa chấm | Lượt chấm chưa chấm khách này | Không vào bảng; đếm riêng ở dòng «… chưa chấm» | Không vào bốn ô | «Chưa chấm» (xám); dòng «Tỉ lệ hoàn» ghi «chưa chấm» | Chưa biết gì về khách — không coi là khách tốt |

## Huy hiệu hiện ở đâu

| Nơi | Bạn thấy gì | Vai thấy |
|---|---|---|
| Hộp thư — thẻ đơn «Đơn bot chốt · Messenger» cạnh khung chat | Với tầng Cảnh báo và Rủi ro cao: hộp vàng «Khách cần theo dõi · hoàn 30–65% — hoàn …% trên đơn cũ» hoặc «Khách hay hoàn hàng · hoàn ≥65% — hoàn …% trên đơn cũ», nội dung «Gọi xác nhận trước khi duyệt.» Tầng khác không có hộp | Sale · Quản trị |
| Hộp thư — khối thông tin khách cạnh hội thoại | Dòng «Rủi ro hoàn»: huy hiệu tầng và phần trăm hoàn | Sale · Quản trị |
| Hộp thư — kết quả tìm theo số điện thoại | Huy hiệu tầng ở cuối mỗi dòng khách | Sale · Quản trị |
| Việc đang chờ — hồ sơ khách của một việc | Dòng «Rủi ro hoàn» với huy hiệu tầng | Sale · Quản trị |
| Tìm khách (`/ho-so-khach`) | Huy hiệu tầng cạnh tên khách; trong hồ sơ thêm «hoàn …%» | Sale · Quản trị |
| Số liệu › Tổng quan — khối «Khách theo rủi ro hoàn» | Bốn ô số khách theo tầng, «Xem đủ →» | Quản trị |
| Số liệu › Khách — khối «Rủi ro hoàn — bốn tầng» | Bốn ô số khách theo tầng, «Xem đủ →», «Tra một khách cụ thể →» | Quản trị |
| Màn «Rủi ro hoàn hàng» (`/rui-ro-hoan`) | Bảng «Tỉ lệ hoàn theo tầng», bảng «Cùng tỉ lệ, khác số đơn», khối «Tài liệu nói và đọc được» | Quản trị |

## Liên quan

[Duyệt, sửa hoặc từ chối đơn Messenger chờ duyệt](./duyet-don-messenger.md) · [Tìm khách theo số điện thoại và xem mọi đơn của khách](./tim-khach.md) · [Xem khách rơi ở đâu và rủi ro hoàn](./xem-khach-roi-rui-ro-hoan.md) · [Các con số ở Số liệu: mỗi thước đo gì](./tra-cuu-con-so.md) · [Sự cố số liệu: «chưa có nguồn», «chưa biết», số lệch](./su-co-so-lieu.md)
