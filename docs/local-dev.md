# Local dev sạch

Chạy `npm run local:start`, mở http://127.0.0.1:3202/dang-nhap. Backend ở 127.0.0.1:3200. Cổng 3102 có thể đang là tunnel VPS; không dùng để test local.

Tài khoản của bản dev hiện tại nằm trong `.local-dev/<tên-database>/login.json`; `.local-dev/current.json` chỉ tới bản hiện tại. Các file này đã được gitignore. Không commit hoặc dùng mật khẩu dev ở production.

`npm run local:new` tạo một database local mới và bản sao code riêng; giữ nguyên database và cấu hình cũ. Không chạy lệnh này khi `local:start` còn chạy: Ctrl-C trước, tạo mới rồi khởi động lại. Bản mới chỉ seed vai/team hệ thống và một quản trị thuộc team Local Dev; không nhập Page, sản phẩm, khóa provider, chat hay đơn. Dữ liệu JSON cũng nằm riêng, không copy từ workspace/VPS.

Code trong runtime là snapshot lúc tạo. Khi cần thử code mới với dữ liệu trống, dừng rồi chạy local:new và local:start. Đây không phải hot reload vào runtime cũ.

Chế độ cấu hình không chạy worker, đóng gửi Pancake/POS, không nạp khóa từ .env gốc. DEV_CONFIG_ONLY chỉ miễn yêu cầu provider key khi NODE_ENV=development và toàn bộ cờ gửi/POS/legacy đều đóng; production vẫn kiểm tra như trước. Muốn test chat thật cần cấu hình provider/Page và mở pilot riêng, chưa được bật trong bản dev sạch.

Kiểm tra 17/09/2026: backend health, đăng nhập, trang vận hành, API Page/sản phẩm/đơn đều đạt; danh sách nghiệp vụ trống. Brave E2E đăng nhập và mở trang đạt; bộ 407 tests pass.

## Token Pancake trên bản local

**Từ 17/09: thêm token bằng GIAO DIỆN** — màn «Kết nối & token» ghi thẳng bảng `token_pancake`
(migration 019), không đi qua cửa ghi sang tiến trình bot nữa, nên van `PANCAKE_READONLY`
không còn chắn. Tiến trình bot và worker đọc cùng bảng đó qua `src/pancake.js#datKhoTokenDb`
(tự nạp lại mỗi 5 phút, và màn ép nạp ngay sau mỗi lượt thêm/bỏ). Công tắc bật/tắt bot cho
page thì VẪN đi qua van cũ — nó chạm khách thật.

Đường cũ vẫn dùng được khi cần nạp token mà không mở giao diện:


`npm run local:token <JWT>` kiểm token (JWT ba phần, chưa hết hạn, gọi thử `GET /pages`) rồi ghi `PANCAKE_TOKEN` vào `.env` của bản dev, quyền 600. Khởi động lại để bot nạp.

Không dùng nút «Thêm token» trên màn Kết nối được: đường đó đi qua cửa ghi sang tiến trình bot, mà cửa đóng khi `PANCAKE_READONLY=1` (`v3/src/noi-day/cau-bot-v1.js#trangThaiCau`). Cửa đóng là đúng — máy này chạy song song VPS, mở ra là khách nhận tin đúp. Đường `.env` chỉ mở phần ĐỌC: token vào được, mọi lượt gửi vẫn bị van chặn.

Cũng đừng đặt `PANCAKE_READONLY=0` cho tiện: `assertConfig` (`src/config.js`) chỉ miễn yêu cầu khoá AI khi cờ này bằng `1` — bỏ đi là backend dev không boot vì thiếu `ANTHROPIC_API_KEY`.

## Soi payload Pancake

`npm run soi:tin` — chỉ GET, chạy được khi READONLY. Không tham số thì liệt kê page; `-- --page <id>` thì chọn một hội thoại có tin cả hai phía và in: mọi khoá trong `messages[]`, bảy trường định danh người gửi mà spec hứa, khoá khả nghi ngoài spec, rồi payload thô 3 tin phía page. Tên khách / số điện thoại / email che trước khi in; token không in ra. Thêm `-- --pat <page_access_token>` để đối chiếu đường `public_api/v1`.

Spec chính thức: `https://developer.pancake.biz/openapi/openapi.yaml` (tải 17/09/2026). Hai điểm đáng giá cho câu «tin này do ai gửi»:

- `Message.from` khai `uid` · `admin_id` · `admin_name` · `ai_generated` · `is_automated` — đúng cái nhãn inbox hiện dưới mỗi tin. `src/pancake.js#pkGetMessages` hiện chỉ đọc `from.id`, tức đang vứt hết. Còn phải đo xem đường `api/v1` (code đang dùng) có trả không, hay chỉ `public_api/v1` mới có.
- Thân `reply_inbox` nhận `sender_id` (UUID nhân viên, lấy từ `GET /pages/{page_id}/users`) — đặt tên người gửi cho tin bot KHÔNG cần token riêng của tài khoản đó.

## Diễn tập: chấm bot mà không gửi cho khách

Bot đọc tin thật, gọi model, soạn xong câu trả lời rồi **ghi vào sổ và dừng** — không một lượt gọi mạng nào tới Pancake. Đọc kết quả ở `/van-hanh-v3` → tab **«Diễn tập (không gửi)»**: khách nói gì · bot ĐỊNH trả lời gì · độ trễ · model · token.

Bốn biến phải cùng có trong `.env` của bản dev, rồi chạy worker:

```
V3_DIEN_TAP=1            # ghi sổ rồi dừng, KHÔNG gửi — thắng mọi cờ khác
V3_NAP_DEV=1             # cho phép nạp tin thật trên máy READONLY (chỉ khi CSDL là localhost)
V3_PAGE_XU_LY=<page_id>  # CHỈ page đang đo; vắng = không nạp page nào
PANCAKE_READONLY=1       # giữ nguyên
npm run worker-v3
```

Ba lưới vẫn nguyên khi diễn tập: cửa gửi không gọi mạng, cổng HTTP ghi của `handler-v3` chặn mọi POST tới `pages.fm`, và `V3_PANCAKE_GUI` vẫn đóng. Diễn tập chỉ nới đúng hai chốt cấu trúc (worker và handler từ chối chạy bộ não khi van đóng) — vì tiền token chi ra chính là thứ phép đo mua.

Cái diễn tập KHÔNG che được: nó vẫn **đọc** hội thoại thật từ Pancake, và vẫn ghi trạng thái hội thoại + hồ sơ khách vào CSDL của bản dev như một lượt thật. Đó là chủ ý — không ghi thì không đo được hành vi qua nhiều lượt.

Độ trễ ghi vào `so_ai.du_lieu`: `tre_luot_ms` (cả lượt, tính từ lúc nhận tin) và `tre_nao_ms` (riêng phần model + vòng tool). Báo cáo lấy trung vị, không lấy trung bình.
