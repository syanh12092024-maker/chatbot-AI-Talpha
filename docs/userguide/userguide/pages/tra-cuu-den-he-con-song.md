# Các đèn của «Hệ còn sống»

> Bảng tra mọi đèn trên màn Cài đặt → Hệ còn sống: mỗi đèn đo gì, từng màu nghĩa là gì, và phải làm gì hoặc nhờ ai — dành cho người quản trị và marketer đang đọc màn.

Đối chiếu với hệ ngày 05/10/2026.

Cách đọc từng màu (nhãn trên màn): **xanh** «Ổn» = đo được và đang ổn · **vàng** «Cần để ý» = đo được, sắp hỏng hoặc có việc chờ · **đỏ** «Đang hỏng» = đo được và đang hỏng · **xám** «Chưa đo được» = không đo được, **không phải** đang ổn. Đèn đỏ và vàng luôn kèm nút đi sửa hoặc dòng «Việc cần làm: …». Màn tự nạp lại mỗi phút. Cách đọc màn theo thứ tự: [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md).

## Mười một đèn

| Đèn (tên trên màn) | Đo gì | Màu và câu trên màn | Làm gì / nhờ ai |
|---|---|---|---|
| «Model AI» | Team đã lưu đủ ba vai trò model chưa (chính · dự phòng · nền) | Xanh: «Đủ ba vai trò: chính, dự phòng, nền.» («3/3 vai trò»). Vàng: «Thiếu cấu hình cho vai trò: …» («{n}/3 vai trò»). Đỏ: «Team chưa cấu hình model nào. …» («0 dòng cấu hình») | Nút «Sang màn Model AI & khoá» → bấm «Lưu cấu hình» một lần là đủ ba vai trò. Xem [Chọn model AI, thay khoá và thử một lượt](./chon-model-ai.md) |
| «Khoá API model» | Không đo được: khoá được mã hoá nên màn không đọc | Luôn xám: «Chưa đo được: team chưa cấu hình model nào nên chưa biết cần khoá của nhà nào.» hoặc «Khoá được mã hoá nên màn này không đọc. Team dùng {n} nhà (…).» | Kiểm khoá bằng nút «Thay khoá và thử một lượt» ở màn Model (nút «Sang màn Model AI & khoá»). Vì đèn này luôn xám, đầu màn không bao giờ ghi «Mọi đèn đều ổn» |
| «Lõi bot» | Cửa ghi vào lõi bot (bật tắt bot, thêm tài khoản…) đang mở hay đóng | Xanh: «Cửa ghi vào lõi bot đang MỞ (…).» («mở»). Vàng: «Cửa ghi vào lõi bot đang ĐÓNG: {lý do}.» («đóng»). Xám: «Chưa đo được: chưa nối bộ đọc lõi bot.» | Vàng: «Nhờ người quản trị hệ thống mở rồi khởi động lại dịch vụ» — đưa họ nguyên câu lý do. Xám: «Báo người quản trị hệ thống — đây là lỗi dựng ứng dụng» |
| «Máy chạy bot» | Tin của khách có được rút ra xử hay không, đo bằng hàng đợi tin | Xanh: «{n} tin đang chờ, tin cũ nhất {n} giây — máy chạy bot đang rút kịp.» hoặc «Hàng đợi rỗng, lượt xử gần nhất {n} phút trước.» (trong 5 phút). Vàng: «{n} tin của khách đang chờ, tin cũ nhất {n} phút — máy chạy bot vẫn đang xử nhưng không kịp.» Đỏ: «{n} tin của khách đã chờ {n} phút mà không tin nào được xử — máy chạy bot đang đứng. …» hoặc «{n} tin đang bị giữ giữa chừng, tin lâu nhất {n} phút — máy chạy bot đã cầm tin rồi tắt. …». Xám: chưa có tin nào đi qua; hàng đợi rỗng và lượt gần nhất đã quá 5 phút; hoặc máy chủ chưa nối bộ đọc | Vàng: «Theo dõi thêm ít phút. Còn dồn thì báo người quản trị hệ thống.» Đỏ (đứng): «Nhờ người quản trị hệ thống khởi động lại máy chạy bot.» Đỏ (giữ giữa chừng): «Nhờ người quản trị hệ thống xem máy chạy bot còn chạy không, rồi trả những tin ấy về hàng chờ.» Xám vì chưa nối: «Báo người quản trị hệ thống — đây là lỗi dựng ứng dụng, không phải lỗi dữ liệu.» Xám vì vắng khách: không cần làm gì |
| «Token Pancake» | Số tài khoản Pancake còn sống trong kho dùng chung ba team | Xanh: «{n} token còn sống, không token nào sắp hết hạn.» Vàng: «Chỉ còn MỘT token sống — …» hoặc «{n} token sắp hết hạn trong 7 ngày.» Đỏ: «Cả {n} token đều hết hạn — bot không gọi được Pancake.» hoặc «Không có token Pancake nào — bot không đọc và không gửi được tin nào.» Xám: «Chưa đo được: …». Số: «{sống}/{tổng} sống» | Nút «Sang màn Kết nối & token» → thêm tài khoản. Xem [Kết nối tài khoản Pancake](./ket-noi-pancake.md) |
| «Page đang bật bot» | Số page của team đang để bot tự trả lời | Xanh: «{n}/{tổng} page đang để bot tự trả lời khách.» Vàng: «Không page nào đang bật bot — … Nếu đó là chủ ý thì bỏ qua; nếu không thì đây là lý do không có lượt chat nào.» | Nút «Sang màn Page & Bot». Xem [Bật hoặc tắt bot cho một page](./bat-tat-bot.md) |
| «Kịch bản của page bật bot» | Page đang bật bot mà chưa có lời bot riêng đang cho chạy | Xanh: «Mọi page đang bật bot đều có kịch bản riêng.» Đỏ: «{n}/{m} page ĐANG BẬT BOT mà không có kịch bản riêng — …» | Nút «Sang màn Kịch bản» (mở danh sách page). Xem [Viết và lưu lời bot cho một page](./viet-loi-bot.md) |
| «Marketer phụ trách» | Page có ghi tên marketer ở cấu hình page hay chưa | Xanh: «Mọi page đều có marketer.» Vàng: một phần page thiếu. Đỏ: mọi page thiếu. Câu: «{n}/{tổng} page chưa có marketer — mọi báo cáo cắt theo marketer sẽ trống với những page đó.» | Nút «Sang màn Page & Bot». Đèn này đếm ô marketer của page, không đếm marketer gán ở Sản phẩm — có thể vàng/đỏ dù sản phẩm đã gán. Gán marketer theo sản phẩm: [Gán marketer phụ trách sản phẩm](./gan-marketer.md) |
| «Sổ AI» | Sổ ghi mọi lượt gọi model — nguồn của mọi con số chi phí và báo cáo | Xanh: «{n} dòng.» Đỏ: «Sổ AI đang TRỐNG. …» («0 dòng») | Đỏ: «Nhờ người quản trị hệ thống chạy bộ nạp Sổ AI» |
| «Khách đang chờ» | Việc bot giao cho sale chưa đóng, và việc đã quá hạn | Xanh: «Không việc nào đang chờ.» Vàng: «{n} việc đang chờ sale, chưa việc nào quá hạn.» Đỏ: «{n}/{m} việc đã QUÁ HẠN 10 phút mà chưa ai nhận — đó là khách thật đang chờ người trả lời.» | Nút «Sang bảng điều phối» → nhắc sale nhận việc. Xem [Nhận một việc bot giao lại và đóng việc với kết quả](./nhan-va-dong-viec.md) |
| «Hai bot cùng một page» | Nguy cơ một page bị hai bot cùng trả lời | Xanh: «Chưa page nào bật bot của mình, nên không page nào có thể bị hai bot cùng trả lời.» Xám (khi đã có page bật): «{n} page đang bật bot của mình. Hệ này không đọc được bot ai_sale của team khác đang phủ page nào — …» | Xám là bình thường khi có page bật. Với mỗi page bật, xác nhận với bên đang chạy bot ai_sale rằng họ đã tắt bot trên page đó |

## Phần đầu màn

| Vùng | Giá trị | Nghĩa |
|---|---|---|
| Hộp tóm tắt | «Có chỗ đang hỏng» | Có ít nhất một đèn đỏ |
| | «Không có gì hỏng, nhưng có chỗ cần để ý» | Có đèn vàng, không có đèn đỏ |
| | «Không có gì hỏng — nhưng có đèn chưa đo được» | Chỉ còn đèn xám và xanh |
| | «Mọi đèn đều ổn» | Mọi đèn xanh — không xảy ra trong thực tế vì đèn «Khoá API model» luôn xám |
| Hàng bốn con số | «Đang hỏng» · «Cần để ý» · «Chưa đo được» · «Đang ổn» | Số đèn mỗi màu; «Đang hỏng» khác 0 thì nhãn «Cần sửa ngay» |
| Tiêu đề danh sách | «{n} đèn» | Đếm theo đèn thật trả về; đỏ xếp trước, rồi vàng, xám, xanh |
| Góc phải | «Đo lúc {giờ} · tự nạp lại mỗi phút» | Giờ lượt đo gần nhất |

## Ngưỡng

| Ngưỡng | Giá trị |
|---|---|
| Tài khoản Pancake «sắp hết hạn» | còn 7 ngày trở xuống |
| Tin của khách chờ quá lâu (máy chạy bot) | 45 giây |
| Tin bị giữ giữa chừng | 5 phút |
| Hàng đợi rỗng còn dám nói «đang chạy» | lượt xử gần nhất trong 5 phút |
| Việc của sale quá hạn | 10 phút |

Khối «Việc vận hành» ở cuối màn (chỉ Quản trị thấy) không phải đèn — xem [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md).

__Liên quan:__ [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md) · [Sự cố bot: không trả lời, sai giá, page không bật được](./su-co-bot.md)
