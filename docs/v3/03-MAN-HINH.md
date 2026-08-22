# BA MƯƠI BẢY MÀN HÌNH

> Bản vẽ tương tác: <https://claude.ai/code/artifact/34dbfd0d-50cd-4e95-b07e-6adf202c7632>
> Dùng menu trang ở thanh công cụ để chuyển giữa 8 nhóm.

Mockup dùng đúng hệ thiết kế của dashboard đang chạy — xanh `#0e7c86`, sidebar `#0b2125`,
bo góc 12px, SF Pro 13.5px, cùng các thành phần `.pill` `.mc` `.tablecard` `.seg`. Dữ liệu
trong mockup lấy từ production thật; tên khách là tên đặt mới.

---

## Nhóm 1 · Vào hệ thống và điều phối

| Màn | Việc của nó |
|---|---|
| Chọn team | Ba thẻ team: Tiểu Alpha · Auus · Pialpha EU. Dữ liệu tách ở tầng dữ liệu |
| Trang chủ | Marketer vào thấy đúng việc của mình: đề xuất chờ duyệt, sản phẩm hết hàng, page kịch bản mỏng |
| Bảng điều phối | Sale vào thẳng đây. Hai danh sách việc cần người, đồng hồ đếm ngược 10 phút |
| Chi tiết việc cần xử | Đoạn chat + thông tin đơn + lý do bot dừng, rồi mới nhảy sang Pancake |

## Nhóm 2 · Khách và đơn hàng

| Màn | Việc của nó |
|---|---|
| Nguồn khách vào | Sơ đồ hai luồng đơn chạy song song, chỉ gặp nhau ở đích. Chỗ rơi 37,4% |
| Trả lời bình luận | Sáu luật theo loại bình luận. Điều kiện để tắt Botcake diện rộng |
| Xác nhận đơn qua WhatsApp | **Chỉ đơn trang bán hàng.** Bộ lọc ngày, sản phẩm, marketer, thị trường, page |
| Hồ sơ khách hàng | Gộp ba kênh theo số điện thoại. Không gộp thì đếm nhầm đơn trùng |
| Rủi ro hoàn hàng | Bốn tầng chính sách thay vì một ngưỡng cứng |
| Hàng chờ tạo đơn | Đích của luồng Messenger. Sale duyệt là tạo đơn thẳng ở Chờ in |

## Nhóm 3 · Nhắn tin hàng loạt

| Màn | Việc của nó |
|---|---|
| Soạn tin hàng loạt | Chọn page, chọn sản phẩm, tự viết nội dung. **Bảng phân đường nằm cạnh nút gửi** |
| Xin phép nhận tin | Nút thắt của mọi việc nhắn ngoài 24 giờ. Năm chỗ xin, chỗ nào ăn nhất |
| Chiến dịch đã gửi | Danh sách chiến dịch, kho tin đã Meta duyệt, trần tần suất tự bảo vệ |
| Đuổi theo trong 24 giờ | Bậc thang theo mốc giờ: +2h nhắc nhẹ, +12h freeship, +20h tặng quà |

## Nhóm 4 · Bộ não AI

| Màn | Việc của nó |
|---|---|
| Bộ luật chung | 10 mục quy tắc cứng, 2.256 token, dùng chung 51 page. Có phiên bản, duyệt, phân tích ảnh hưởng |
| Thư viện kỹ năng | Tầng còn thiếu giữa bộ luật và kịch bản. Bật theo nhóm sản phẩm |
| Prompt của page | Xem prompt **thật** gửi cho model: bốn khối, số token từng khối, soi mâu thuẫn |
| AI đề xuất | Đề xuất sửa ở **cả ba tầng**, không chỉ kịch bản |

## Nhóm 5 · Kịch bản và nội dung

| Màn | Việc của nó |
|---|---|
| Kịch bản | Cây ba tầng: sản phẩm → nước → page. Tầng dưới ghi rõ "Kế thừa" khi không có bản riêng |
| Soạn kịch bản | **Hai bước không được đảo**: bản tiếng Việt cho team đọc → máy dịch thành lời bot nói |
| Nhập kịch bản từ Pancake | Thả file `quick_replies`, hệ thống bóc bảng giá và gắn nhãn ảnh |
| Lớp trả lời 0 đồng | Các mẫu miễn phí + đối chiếu bộ từ khoá Botcake |
| Thư viện ảnh | Ảnh gắn nhãn theo chủ đề để bot chọn đúng lúc |

## Nhóm 6 · Page và sản phẩm

| Màn | Việc của nó |
|---|---|
| Page & Bot | **Nút bật/tắt BOT AI.** Tắt Botcake bên kia trước, rồi mới gạt công tắc |
| Cửa kiểm sẵn sàng | Sáu điều kiện, bấm ô đỏ nhảy thẳng tới chỗ sửa |
| Sản phẩm & kho | Đồng bộ từ POS. Hết hàng thì tự tắt bot cho sản phẩm đó |
| Đưa sản phẩm mới lên chạy | Sáu chặng, mỗi chặng một cửa kiểm. Chặng 2 bắt buộc có động cơ |

## Nhóm 7 · Số liệu và quản trị

| Màn | Việc của nó |
|---|---|
| Báo cáo | **Tách hai luồng** vì đo bằng hai thước khác nhau |
| Chi phí AI | 127 đ/tin, 6.696 đ/đơn. Bảng theo page tìm chỗ đốt tiền mà không ra đơn |
| Hiệu quả kịch bản | A/B hai bản cạnh nhau theo phễu. Chưa đủ mẫu thì nói rõ chưa kết luận |
| Sức khỏe hệ thống | Đèn 9 chỉ số. Page bị chặn thì đếm số khách đang chờ |
| Model AI & khoá | Bốn nhà, khoá riêng từng team, quy giá công bố ra tiền thật |
| Cấu hình team | Kết nối POS, Pancake, WhatsApp, Botcake, Telegram · thành viên và vai |
| Kết nối & token | Kho token Pancake theo thứ tự failover, khoá Botcake, mẫu tin WhatsApp |
| Nhật ký thao tác | Ghi cả việc máy làm. Không sửa không xoá |

## Nhóm 8 · Giai đoạn sau

| Màn | Việc của nó |
|---|---|
| Kho ưu đãi | Giảm giá, freeship, tặng quà kèm điều kiện áp dụng và đo lãi ròng |
| Hậu bán & mua lại | Vòng đời sau khi nhận hàng, tính chu kỳ dùng hết để nhắc đúng lúc |

Hai màn này **đã thiết kế xong nhưng chưa làm** — để lại đợt sau theo yêu cầu.
