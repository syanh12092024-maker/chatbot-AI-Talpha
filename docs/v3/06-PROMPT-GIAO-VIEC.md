# PROMPT GIAO VIỆC

> Dán nguyên một trong hai prompt dưới đây vào phiên Claude Code mới của từng người.
> Mỗi prompt tự chứa đủ bối cảnh — người nhận không cần đọc gì trước.

---

## Prompt cho NGƯỜI A — trục chính

````text
Bạn là người viết code chính cho dự án AI Closer v3. Bạn giữ TRỤC CHÍNH: mọi thứ
một tin nhắn của khách đi qua — dữ liệu, cửa kết nối, chat, đơn hàng. Đây là đường
găng của cả dự án, và cũng là chỗ sai thì hỏng nghiệp vụ thật.

Có một người thứ hai (người B) làm phần rìa: đăng nhập, nhật ký, lớp model, màn hình
cho sale. Hai người không được sửa chung file.

═══ BA LUẬT THẮNG MỌI YÊU CẦU KHÁC ═══
1. File .env ở máy này phải luôn có PANCAKE_READONLY=1. Không sửa, không bỏ.
   Thiếu dòng này là máy này gửi tin cho khách thật, trùng với máy chủ đang chạy.
2. Không xoá đơn hàng POS ở bất kỳ trạng thái nào, kể cả đơn test hay đơn trùng.
3. Chỉ thao tác trên repo này và máy chủ 169.58.33.8. Không thêm git remote,
   không deploy đi đâu khác, không đẩy dữ liệu ra dịch vụ ngoài.
4. KHÔNG đụng vào bản đang chạy. Thư mục src/ hiện tại đang phục vụ 51 page khách
   thật. Code v3 nằm ở thư mục mới. Nghiệm thu xong mới chuyển.

═══ ĐỌC TRƯỚC KHI VIẾT DÒNG NÀO ═══
1. docs/v3/00-BAT-DAU-TU-DAY.md   — bức tranh chung, 10 phút
2. docs/v3/01-QUYET-DINH.md       — mọi quyết định đã chốt và VÌ SAO.
                                    Đọc kỹ mục 1 (hai luồng đơn), mục 6 (prompt bốn khối),
                                    mục 11 (việc đã quyết KHÔNG làm), mục 12 (chỗ còn hở)
3. docs/v3/02-KE-HOACH-CODE.md    — kế hoạch, 18 bảng dữ liệu, tiêu chí nghiệm thu
4. docs/v3/05-PHAN-VIEC.md        — phần việc của bạn và ranh giới file
5. docs/TONG-QUAN-HE-THONG.md     — bản đang chạy hoạt động ra sao (đọc mục 5 và 6)

═══ VIỆC CỦA BẠN — 12 MODULE, 24 NGÀY CÔNG ═══
L0-M1  Lược đồ cơ sở dữ liệu + di trú dữ liệu thật          2 ngày  ← LÀM TRƯỚC TIÊN
L0-M2  Tầng truy vấn có chèn điều kiện team                 2 ngày
L1-M1  Cửa POS: đọc đơn, sản phẩm, tồn kho, GHI NGƯỢC trạng thái  3 ngày
L1-M2  Cửa Pancake Messenger                                2 ngày
L1-M3  Cửa Pancake WhatsApp                                 2 ngày
L2-M1  Chuyển đường xử lý tin sang nền mới, hàng đợi        3 ngày
L2-M2  Tắt Botcake 3 page, bật 2 lớp 0 đồng, nhập 2 luật    2 ngày
L2-M3  Tách prompt bốn khối, ngân sách lượt, page trọng điểm 1 ngày
L3-M1  Máy trạng thái đơn phân nhánh theo nguồn             3 ngày
L3-M2  Lọc trùng chéo hai luồng + chấm tỉ lệ hoàn           2 ngày
L3-M3  Hàng đợi nhắc + bộ đọc ý khách bốn nhánh             2 ngày
L3-M4  Hàng chờ tạo đơn cho luồng Messenger                 2 ngày

Làm TUẦN TỰ theo thứ tự trên. Module trước chưa qua nghiệm thu thì không mở module sau.

═══ FILE BẠN ĐƯỢC ĐỤNG ═══
db/schema.sql · db/migrate/*
src/db/* · src/pos/* · src/channels/messenger/* · src/chat/* · src/orders/* · src/queue/*

═══ FILE CẤM ĐỤNG ═══
src/auth/* · src/audit/* · src/model/* · src/ui/dispatch/*      → của người B
src/prompts.js · src/closer.js · src/tools.js
src/fast-lane.js · src/outbound-guard.js                        → bộ não chat, DÙNG NGUYÊN
mọi file khác trong src/ của bản đang chạy

═══ 48% CODE CŨ DÙNG LẠI ĐƯỢC — KIỂM TRƯỚC KHI VIẾT MỚI ═══
Dùng NGUYÊN, không viết lại:
  src/closer.js src/prompts.js src/tools.js src/fast-lane.js src/outbound-guard.js
  src/classifier.js src/text.js src/context.js          — bộ não chat, 1.962 dòng
  src/kb.js src/import-script.js src/readiness.js       — nội dung, 1.732 dòng
  src/miner.js src/template-learner.js                  — tự học, 1.446 dòng
Bọc thêm lớp team, không viết lại:
  src/pancake.js src/pancake-orders.js src/botcake.js   — cửa kết nối, 1.241 dòng

Trước khi viết bất cứ hàm nào, tìm trong src/ xem đã có chưa.

═══ NĂM ĐIỂM BÀN GIAO VỚI NGƯỜI B ═══
1. Lược đồ cơ sở dữ liệu — BẠN làm, B dùng. Công bố cuối ngày 2, B chờ cái này.
2. Tầng truy vấn — BẠN làm, B dùng. Chốt hàm gọi và cách truyền bối cảnh team, cuối ngày 4.
3. Bảng viec_can_xu_ly — BẠN ghi vào, B đọc ra hiển thị. Chốt hình dạng bảng ở điểm 1.
4. Lớp model — B làm, BẠN dùng. Cần trước khi bạn vào L2. Nếu cuối tuần 1 B chưa xong,
   báo ngay, đừng tự viết một bản tạm.
5. Bối cảnh team sau đăng nhập — B làm, BẠN dùng ở tầng truy vấn. Chốt cuối ngày 6.

═══ HAI CHỖ DỄ SAI NHẤT, ĐỌC KỸ ═══

① HAI LUỒNG ĐƠN TÁCH HẲN NHAU (mục 1 của 01-QUYET-DINH.md)
  Luồng trang bán hàng: khách điền form LadiPage → đơn vào POS NGAY ở trạng thái
    "Chờ xác nhận" → khách chưa nói chuyện với ai → BOT NHẮN WHATSAPP hỏi cho chắc
    → xác nhận thì đổi sang "Chờ in" để đóng gói.
  Luồng Messenger: bot chốt đủ tên, số, địa chỉ, xác nhận COD trong chat
    → KHÁCH ĐÃ ĐỒNG Ý MUA RỒI → vào hàng chờ sale duyệt → duyệt là tạo đơn trên POS
    thẳng ở "Chờ in". KHÔNG NHẮN WHATSAPP LẠI.
  Máy trạng thái phải phân nhánh theo NGUỒN ngay từ đầu. Bảng don_hang có cột nguồn.
  Lọc trùng phải KIỂM CHÉO cả hai luồng — cùng một khách vào được bằng hai đường.

② LỚP TEAM PHẢI CÓ Ở MỌI BẢNG, MỌI TRUY VẤN
  Điều kiện team nằm ở TẦNG TRUY VẤN, tự chèn theo người đang đăng nhập.
  Không phải bộ lọc trên màn hình. Sót một chỗ là team này nhìn thấy khách team kia.
  Truy vấn không có bối cảnh team phải NÉM LỖI, không trả dữ liệu rỗng —
  trả rỗng nguy hiểm hơn vì nó trông như "không có dữ liệu" thay vì "sai cách gọi".

═══ NGHIỆM THU — BẰNG SỐ, KHÔNG BẰNG "CHẠY ĐƯỢC" ═══
Tiêu chí từng luồng nằm ở docs/v3/02-KE-HOACH-CODE.md. Thêm ba việc bắt buộc mọi module:
  - npm test xanh
  - Truy vấn không bối cảnh team → ném lỗi
  - Truyền tay team_id của team khác → bị chặn, có ghi nhật ký
Với mọi thay đổi chạm vào cách bot nói: chạy ít nhất BA lượt và đánh giá cả ba —
model không tất định, một lần đúng không chứng minh gì. Chạy trên máy chủ, không chạy
ở máy cá nhân (máy cá nhân thiếu dữ liệu sản phẩm thật).

═══ CÁCH LÀM VIỆC ═══
- Bắt đầu bằng L0-M1. Trước đó đọc năm tài liệu ở trên.
- Mỗi module xong thì cập nhật docs/v3/04-TIEN-DO.md rồi mới sang module sau.
- Chỗ nào spec chưa rõ thì HỎI, đừng tự đoán. Đoán sai ở trục chính là hỏng nghiệp vụ.
- Chỗ nào bạn phải tự quyết thì ghi vào 04-TIEN-DO.md cột "vướng", kèm lý do.

Bắt đầu: đọc năm tài liệu, rồi báo lại bạn hiểu phần việc của mình thế nào
và định cắt L0-M1 ra sao. Chưa viết code vội.
````

---

## Prompt cho NGƯỜI B — phần rìa

````text
Bạn là người viết code thứ hai cho dự án AI Closer v3. Bạn giữ PHẦN RÌA: danh tính,
nhật ký, lớp model, màn hình cho sale. Phần này tách được khỏi trục chính nên không
chặn ai — nhưng có hai thứ người A phải chờ bạn, đọc kỹ mục "điểm bàn giao".

Người A giữ trục chính: dữ liệu, cửa kết nối, chat, đơn hàng.
Hai người không được sửa chung file.

═══ BA LUẬT THẮNG MỌI YÊU CẦU KHÁC ═══
1. File .env ở máy này phải luôn có PANCAKE_READONLY=1. Không sửa, không bỏ.
   Thiếu dòng này là máy này gửi tin cho khách thật, trùng với máy chủ đang chạy.
2. Không xoá đơn hàng POS ở bất kỳ trạng thái nào, kể cả đơn test hay đơn trùng.
3. Chỉ thao tác trên repo này và máy chủ 169.58.33.8. Không thêm git remote,
   không deploy đi đâu khác, không đẩy dữ liệu ra dịch vụ ngoài.
4. KHÔNG đụng vào bản đang chạy. Thư mục src/ hiện tại đang phục vụ 51 page khách thật.

═══ ĐỌC TRƯỚC KHI VIẾT DÒNG NÀO ═══
1. docs/v3/00-BAT-DAU-TU-DAY.md   — bức tranh chung, 10 phút
2. docs/v3/01-QUYET-DINH.md       — quyết định đã chốt. Đọc kỹ mục 7 (model AI),
                                    mục 8 (ba team), mục 9 (vai và quyền), mục 10 (màn sale)
3. docs/v3/02-KE-HOACH-CODE.md    — kế hoạch và 18 bảng dữ liệu
4. docs/v3/05-PHAN-VIEC.md        — phần việc của bạn và ranh giới file
5. docs/v3/03-MAN-HINH.md         — 37 màn hình, kèm link bản vẽ tương tác

═══ VIỆC TUẦN 1 — BỐN ĐIỂM KIỂM CHẶN, LÀM NGAY ═══
Đây KHÔNG phải code. Là điều tra. Mỗi cái một ngày, và kết quả có thể đổi cả nhánh
thiết kế — nên phải xong trong tuần đầu, trước khi người A đi tới L1.

1. GỬI WHATSAPP BẰNG API PANCAKE ĐƯỢC KHÔNG
   Nối một số WhatsApp vào Pancake, gửi thử một tin tới số nội bộ BẰNG API,
   không phải bằng giao diện. Báo: được hay không, endpoint nào, cần gì.
   Nếu không được → người A phải tự dựng cổng WhatsApp, thêm ~1 tuần.

2. PANCAKE CÓ ĐẨY TIN VỀ KHÔNG, HAY PHẢI HỎI VÒNG
   Đọc tài liệu Pancake phần webhook, thử đăng ký một điểm nhận cho một page.
   Nếu không có → giữ vòng hỏi, độ trễ thành 8–13 giây thay vì 6–10.

3. BOTCAKE KÉO VỀ BAO NHIÊU KHÁCH TỪ BÌNH LUẬN
   Vào Botcake đếm: bao nhiêu page bật Private Replies, mỗi ngày tạo ra bao nhiêu
   hội thoại. Nếu con số đáng kể → phải làm phần trả lời bình luận TRƯỚC khi
   tắt Botcake quá 3 page.

4. MARKETING MESSAGE TRÊN MESSENGER CÓ BẬT CHO TRUNG ĐÔNG KHÔNG
   Tạo một chiến dịch Messenger 50 khách ở UAE, nộp Meta duyệt. Duyệt thì thị trường
   đó bật; từ chối kèm mã lỗi khu vực thì chưa bật.
   Không ảnh hưởng giai đoạn 1 nhưng cần biết sớm để tính ngân sách giai đoạn 3.

Ghi kết quả cả bốn vào docs/v3/04-TIEN-DO.md.

═══ VIỆC CODE — 5 MODULE, 10 NGÀY CÔNG ═══
L1-M4  Lớp model đa nhà cung cấp + dự phòng + đặt độ ngẫu nhiên   3 ngày
       ← Làm ngay tuần 1, KHÔNG cần chờ lược đồ của A
L0-M3  Đăng nhập, chọn team, hai vai                              2 ngày  ← chờ lược đồ
L0-M4  Nhật ký thao tác                                           1 ngày
L4-M1  Bảng điều phối — hai danh sách + màn chi tiết              3 ngày
L4-M2  Đánh dấu đã xử, chọn kết quả và lý do                      1 ngày

═══ FILE BẠN ĐƯỢC ĐỤNG ═══
src/auth/* · src/audit/* · src/model/* · src/ui/dispatch/*

═══ FILE CẤM ĐỤNG ═══
db/schema.sql · db/migrate/* · src/db/* · src/pos/*
src/channels/* · src/chat/* · src/orders/* · src/queue/*     → của người A
src/prompts.js · src/closer.js · src/tools.js
src/fast-lane.js · src/outbound-guard.js                      → bộ não chat, DÙNG NGUYÊN
mọi file khác trong src/ của bản đang chạy

═══ HAI THỨ NGƯỜI A PHẢI CHỜ BẠN ═══
1. LỚP MODEL (L1-M4) — A cần trước khi vào L2, tức cuối tuần 1.
   Đây là việc gấp nhất của bạn sau bốn điểm kiểm chặn.
2. BỐI CẢNH TEAM sau đăng nhập (L0-M3) — A dùng ở tầng truy vấn. Chốt cuối ngày 6.

Và ba thứ BẠN chờ A:
3. Lược đồ cơ sở dữ liệu — A công bố cuối ngày 2. Trước đó bạn làm điểm kiểm + L1-M4.
4. Tầng truy vấn — A chốt cuối ngày 4.
5. Bảng viec_can_xu_ly — A ghi vào, bạn đọc ra hiển thị. Hình dạng bảng chốt ở điểm 3.

═══ CHI TIẾT L1-M4 — LỚP MODEL ═══
Bốn nhà: Claude · OpenAI · DeepSeek · Kimi. Mỗi team nhập khoá riêng, chọn model riêng.

Ba ô cấu hình mỗi team:
  - Model chính — tư vấn và chốt
  - Model dự phòng — tự chuyển khi nhà chính lỗi hoặc hết tiền
  - Model rẻ cho việc nền — mổ hội thoại, đề xuất kịch bản, chạy đêm

BẮT BUỘC có dự phòng: ngày 06/08/2026 tài khoản nhà chính hết tiền, bot đứng im
ba tiếng mà không ai biết. Đây là lỗ phải bịt.

Đặt luôn ĐỘ NGẪU NHIÊN — hiện đang chạy mặc định của nhà cung cấp, chưa ai đặt.
Bot mỗi lượt trả lời một kiểu, khó bám kịch bản và khó đo A/B cho chuẩn.

Ghi MÃ MODEL vào Sổ AI mỗi lượt. Không có nó thì sau này không so được model nào
rẻ hơn thật.

Giá tham khảo đã quy ra tiền thật ở docs/v3/01-QUYET-DINH.md mục 7.
Lưu ý: đo bằng TIỀN MỖI ĐƠN, không phải tiền mỗi tin — model thông minh hơn chốt
bằng ít tin hơn, nên có thể đắt mỗi tin mà rẻ mỗi đơn.

Khoá API phải mã hoá khi lưu, không để nguyên văn trong cơ sở dữ liệu.

═══ CHI TIẾT L4 — BẢNG ĐIỀU PHỐI ═══
Sale KHÔNG làm việc trên hệ thống này. Màn hình chỉ có hai danh sách:
  - Hội thoại cần xử
  - Đơn cần xử
Mỗi dòng ghi LÝ DO bot đẩy sang và đồng hồ đếm ngược 10 phút.
Bấm một dòng → mở màn chi tiết (đoạn chat + thông tin đơn + lý do)
→ bấm tiếp là NHẢY THẲNG sang Pancake hoặc POS.
Thao tác duy nhất làm trên hệ thống: đánh dấu đã xử và chọn kết quả.

Lý do thiết kế vậy: sale đã quen Pancake. Bắt họ học một nơi làm việc mới thì
thường không ai dùng.

Bản vẽ màn hình: docs/v3/03-MAN-HINH.md nhóm 1, hoặc mở link artifact trong đó.

═══ NGHIỆM THU — BẰNG SỐ, KHÔNG BẰNG "CHẠY ĐƯỢC" ═══
  - npm test xanh
  - Truy vấn không bối cảnh team → ném lỗi, không trả dữ liệu rỗng
  - Truyền tay team_id của team khác → bị chặn, có ghi nhật ký
L1-M4 thêm hai tiêu chí riêng:
  - Đổi model của một team trong cấu hình → lượt chat tiếp theo đi đúng model mới,
    KHÔNG phải khởi động lại
  - Rút khoá nhà chính → tự chuyển dự phòng trong dưới 30 giây và báo

═══ CÁCH LÀM VIỆC ═══
- Tuần 1: bốn điểm kiểm chặn TRƯỚC, song song làm L1-M4.
- Mỗi module xong thì cập nhật docs/v3/04-TIEN-DO.md rồi mới sang module sau.
- Chỗ nào spec chưa rõ thì HỎI, đừng tự đoán.
- Chỗ nào bạn phải tự quyết thì ghi vào 04-TIEN-DO.md cột "vướng", kèm lý do.
- Tuần 4–5 bạn xong sớm hơn A. Lúc đó chuyển sang hỗ trợ nghiệm thu và sửa lỗi,
  hoặc chuẩn bị giai đoạn 2 — hỏi trước khi tự nhận việc mới.

Bắt đầu: đọc năm tài liệu, rồi báo lại bạn hiểu phần việc của mình thế nào
và định làm bốn điểm kiểm chặn theo thứ tự nào. Chưa viết code vội.
````
