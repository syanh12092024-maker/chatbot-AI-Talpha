# Kết quả E2E hành trình tư vấn — 25/09/2026

Đã chạy `sh ops/bin/test-phase0.sh`: **470 passed, 0 failed, 0 skipped**.
Thời gian bộ kiểm tra do Node báo: khoảng 5,56 giây; đây không phải độ trễ tư vấn thực tế.

Ca mới: [journey-chat-e2e.test.js](../test/journey-chat-e2e.test.js).
Ca này đã được thêm vào script để chạy lại cùng bộ regression.

## Luồng đã chạy liền mạch

1. Tạo PostgreSQL tạm, migrate lược đồ; nạp Page, sản phẩm đồng hồ, gói 109 SAR,
   kịch bản LIVE, model và khóa giả được mã hóa theo team.
2. Webhook HTTP sai chữ ký bị từ chối, không ghi tin vào hàng đợi.
3. Khách thử hỏi giá và kích thước qua webhook HTTP có chữ ký hợp lệ.
4. Worker lấy tin, đọc mapping/lịch sử từ kênh giả lập, ráp kiến thức từ DB,
   chọn model theo cấu hình và gọi closer/adapter provider thật.
5. Model giả lập trả nội dung; bộ kiểm đầu ra thật kiểm tra rồi kênh HTTP giả lập
   nhận câu trả lời có giá và khoảng kích thước. Sổ gửi lưu xác nhận thành công.
6. Gửi lại webhook cùng mã tin: không tư vấn/gửi thêm lần nữa.
7. Khách nói cổ tay 15 cm và cho số điện thoại giả: lượt tiếp theo nhận được
   ngữ cảnh tư vấn trước, trả lời tiếp và lưu số điện thoại vào hồ sơ.
8. Kiểm tra DB: hai tin gửi thành công, hai dòng Sổ AI đúng model và nội dung
   trả lời cuối đã lưu vào hội thoại.
9. Khách khiếu nại đơn cũ bị hỏng, yêu cầu hoàn tiền: ghi chú bàn giao,
   quyền SALE, trạng thái HANDOFF; không gửi lời hứa hỗ trợ giả cho khách.
10. Khách nhắn tiếp sau bàn giao: AI bị chặn, không gọi model hoặc gửi thêm.

## Phạm vi bằng chứng

**Chạy thật:** PostgreSQL cách ly, migrations, HTTP Express, xác thực chữ ký,
webhook, hàng đợi/worker, đọc KB từ DB, giải cấu hình model và giải mã khóa,
adapter DeepSeek, closer, phân loại, kiểm đầu ra, hồ sơ và sổ gửi bền.

**Giả lập:** dữ liệu khách/sản phẩm; kết nối đọc hội thoại/lịch sử, model và
gửi tin/ghi chú/gắn thẻ được thay bằng HTTP loopback. Câu trả lời model được
ấn định trước để kiểm chứng luồng nối, không phải đánh giá khả năng suy luận.
Đánh dấu chưa đọc được tắt riêng trong ca này; bộ regression có ca riêng cho nó.

**Chưa chứng minh:** cài đặt bằng toàn bộ thao tác giao diện/browser, quyền truy
cập provider thật, chất lượng model thật, Meta/Pancake giao tin đến tài khoản
thật, thời gian xử lý production, hay tạo/giao một đơn thật. Dữ liệu cấu hình
trong ca mới được nạp bằng SQL vào DB test. Ca dừng ở tư vấn và bàn giao.

Không thay `.env`, không mở Page thật, không gửi khách thật và không migrate DB
vận hành. PostgreSQL tạm được dừng sau lượt chạy, database sandbox được dọn.

Để kiểm chứng kênh thật, cần xác định Page và tài khoản/hội thoại thử riêng,
kiểm tra cấu hình và quyền của đúng Page rồi mới gửi/nhận trên kênh đó.
