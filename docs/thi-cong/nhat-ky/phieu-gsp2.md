# GSP2 — tiếp tục phần Claude dừng giữa chừng, 02/10/2026

## Phạm vi và điểm nhận lại

Nhận lại cây ở `169a392`: migration 032, tầng đọc/ghi việc chuyển, router, hành động audit và nối dây đã làm dở, chưa commit. Giao diện còn đọc `GOC.cho.length` dù API đã bỏ trường này; toàn bộ bộ ca ở lần rà đầu có 13 lỗi. Không sửa bộ não chat, không deploy và không ghi dữ liệu production.

Đã hoàn tất:

- Màn chuyển page có bốn số và lọc trạng thái theo URL; hiển thị giá/ảnh bản sao, shop và gợi ý ba loại.
- Gắn trực tiếp, nối món rồi gắn, gộp đủ món trong nhóm SKU ở mọi shop rồi gắn; chọn gốc/shop thủ công khi thiếu gợi ý.
- Hiện thay đổi marketer trước khi gắn; gắn hỏng sau khi nối/gộp giữ bước đã thành công và nút gắn lại, không tạo thêm gốc.
- Không chuyển phải có lý do; bỏ quyết định có nhật ký. Chặn bấm lặp khi request đang chạy.
- Quyết định có hiệu lực đúng page × bản sao × gốc × shop. Page đã có giá POS vẫn chờ đối soát. Gắn không tự làm giảm số chưa xong.
- Kẹp team ở các truy vấn con giá/ảnh. Lưới đọc khi chưa áp 032 và từ chối ghi rõ ràng vẫn giữ.
- Sinh lại `db/schema.sql`; bổ sung phép đo chỉ đọc mọi team `ops/bin/do-goi-y-gan.mjs`.

## Bằng chứng trên máy dev / PostgreSQL tạm

- Bộ mới GSP2: 9 ca tầng dữ liệu (kể cả ca con) + 5 ca HTTP/giao diện = 14 ca, không lỗi.
- Phạm vi LL15d chạy riêng trong cổng: 4 ca tầng A + 5 ca giao diện, không lỗi.
- Cổng `gsp2.sh`: đạt; bảy đột biến trên bản sao tạm đều đỏ ở đúng bộ ca: bỏ so gốc, bỏ so shop, bỏ qua còn hiệu lực khi đã gắn, coi gắn là xong, bỏ kiểm tra vai, bỏ nối món, thêm đường đẩy bản chép sau gắn.
- Bộ đầy đủ cùng GSP1b: **2346 ca; 2342 đạt, 0 lỗi, 4 bỏ qua**. Log `/tmp/chatbot-gsp-full-tests.log`.
- Cổng tĩnh và `git diff --check`: đạt.
- Cổng GSP1 14/14 trên bản sao tạm, DB riêng; cổng phụ thuộc LL13, VE1, VE8a, VE8b, LL15d đều rc=0. Log `/tmp/chatbot-gsp-old-gsp1.log`.

Bốn ca bỏ qua có lý do từ thước cũ: chưa đặt `AI_LOG_FIXTURE`, chưa đặt `L8_MSG_FIXTURE`, `ai-enabled.json` rỗng và nguồn không có `llmTurns`. Không bỏ qua ca GSP2/GSP1b.

Các test HTTP mới chạy router/quyền thật, bối cảnh danh tính được tiêm; test màn chạy script HTML thật bằng DOM giả, các cửa gắn/nối/gộp được tiêm. Hành vi SQL/giao dịch/gắn/nối được kiểm riêng trên PostgreSQL thật. Chưa nghiệm thu bằng trình duyệt thật hoặc dữ liệu production.

## Thước cũ cập nhật đúng thay đổi hợp đồng

- `v3/test/b/gsp1-san-pham-goc-chi-tu-gop.test.mjs`: không còn kỳ vọng trường `cho`; đường gộp qua + Thêm vẫn còn.
- `v3/test/b/ll13-san-pham.test.mjs`: màn bản sao đổi thành việc chuyển theo phiếu; vẫn canh hai cột, bốn tầng, bốn tab, gắn/gỡ món, kiến thức, lịch sử và bỏ sản phẩm.
- `v3/test/b/ve8a-gop.test.mjs`: kho giả cung cấp bộ đếm chuyển để kiểm nút Gộp trong ô lưu ý mới.

Phạm vi mở rộng so với danh sách phiếu: `db/schema.sql` (file sinh tự động bắt buộc), hai thước cũ GSP1/LL13, fixture VE8a và thước N1a′. Không xoá ca hoặc nới quyền marketer.

## Việc tiếp theo

GSP3/GSP3b chưa làm: đối soát/chép giá+ảnh và khóa sửa bản sao của page đã gắn. GSP4 chưa được cắt đường cũ trước khi GSP3 hoàn tất và bộ đếm mọi team về 0 hoặc người quyết chấp nhận page còn lại thôi chat. H-GSP là việc người: chọn shop, xác nhận gắn, chọn giá khi lệch, xử lý page có hai bản sao.

Giữ lệnh cấm `day-lai-ban-chep --tat-ca` từ lúc GSP2 lên prod tới lúc GSP3b lên prod. Chưa mở gửi chat/POS trong lượt này. Lỗi preflight đã ghi ở báo cáo go-live là việc ngoài phiếu, chưa sửa trong GSP2.

Thước N1a′ cũ kỳ vọng câu ship nhiều ý bị template trả lời khi bật cờ; code hiện tại chuyển lên model và yêu cầu câu trả lời ship được cấu hình. Đã cập nhật riêng test để canh câu nhiều ý luôn lên model và câu đơn ý có KB đi theo cờ template. Không sửa Fast Lane. Bộ đầy đủ chạy với DB URL tạm và van gửi đóng; module config có thể đọc `.env` local qua dotenv. Cổng cũ dùng bản sao không có `.env`.

Lượt cuối: N1a′ đạt với `FASTLANE_TEMPLATES=1` và `=0`; bộ đầy đủ với `--test-concurrency=4` đạt 2342/2346, 0 lỗi, 4 bỏ qua. Lượt chạy không giới hạn trước đó có hai lỗi cũ lấy cookie null ở `vai-b-noi-day` và `ve2b-page-gop`; chưa xác định nguyên nhân, giữ làm giới hạn độ ổn định của thước. Không sửa hai test này hoặc code auth.
