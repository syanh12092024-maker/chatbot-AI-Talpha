# Frontend V3 — kết nối luồng vận hành (17/09/2026)

## Đã nối

- Menu **Vận hành chat V3** (`/van-hanh-v3`) dùng PostgreSQL, không đọc queue JSON.
- Tab Page hiển thị cấu hình, công tắc AI V3 và nguồn poll/webhook. Công tắc ở màn Page cũ cũng chuyển đúng service khi Page thuộc allowlist V3.
- Worker đọc lại công tắc trước khi hành động/gửi, không chỉ lúc bắt đầu lượt. Tắt không thể thu hồi HTTP đã gửi ra trước đó.
- Nguồn nhận tin chỉ đổi được khi AI đã tắt và hết tin chờ/lỗi.
- Sản phẩm/giá: sửa tên, thông tin tư vấn, hết hàng, gói theo số lượng và tiền tệ. Nhập giá đơn vị hiển thị; backend đổi sang minor đúng một lần. Chống ghi đè bằng phiên bản. Áp dụng trên sản phẩm/biến thể đã nhập từ POS, dùng chung các Page có cùng mapping sản phẩm × shop.
- Cấu hình đã sửa tay được giữ khi đồng bộ POS; tồn kho vẫn cập nhật. Đồng bộ và thao tác UI dùng khóa chung, không có cửa đọc cờ cũ rồi ghi đè cấu hình mới.
- Đơn: xem hàng chờ, bổ sung khách/kho/sản phẩm/số lượng, lấy giá từ gói backend, duyệt qua `duyet()` hiện có hoặc loại kèm lý do. Duyệt kiểm tra phiên bản, giá, chống trùng và kết quả POS.
- Hội thoại: xem hồ sơ và 30 tin/lượt gửi gần nhất; bàn giao người thật; cho AI tiếp tục khi đủ điều kiện; đối soát tin lỗi mà không tự gửi lại HTTP chưa rõ kết quả. Lưu người thao tác trong audit.
- Giữ phân quyền hiện có: quản trị thao tác; quản lý xem hội thoại/đơn; sale không được cấp thêm màn/quyền cấu hình. API kiểm tra team, vai và yêu cầu ghi cùng nguồn. Các API dữ liệu không cache.
- Màn cũ có liên kết sang luồng mới; hàng chờ JSON có nhãn phân biệt.

## Kiểm thử

Kết quả cuối: **399 test passed, 0 failed, 0 skipped**, bao gồm ca trình duyệt Brave. `git diff --check` và kiểm tra cú pháp các entrypoint đều đạt.

`ops/bin/test-phase0.sh` tạo PostgreSQL tạm, áp migration trên database test, chạy test rồi dọn. Không đọc/ghi database vận hành.

Bộ `test/frontend-v3-e2e.test.js` dùng Express/auth/business service thật, PostgreSQL thật; transport kênh chat/POS giả lập. Kiểm tra đăng nhập, phân quyền, team isolation, sửa giá, phiên bản cũ, công tắc chặn handler, handoff/resume, đối soát, giá minor, giữ cấu hình khi sync và hai lần duyệt đồng thời chỉ có một lần tạo.

Để bật test trình duyệt thật: đặt `BROWSER_DRIVER` tới file entrypoint của `puppeteer-core`, `BROWSER_BINARY` tới Chromium/Brave rồi chạy script. Không đặt driver thì chạy API/integration, không tính là đã kiểm thử trình duyệt. Máy hiện tại đã chạy Brave headless: đăng nhập bằng form, sửa sản phẩm, bật/tắt Page, mở hội thoại, sửa và lưu đơn, kiểm tra yêu cầu xác nhận, duyệt tạo đơn POS giả lập. Ảnh nghiệm thu: `/tmp/chatbot-frontend-v3-e2e.png`.

## Khi đưa lên môi trường test

1. Áp các migration còn thiếu, bao gồm **017_cong_tac_v3** (không chạy trên production trong lượt sửa này).
2. Chạy `npm run ui-v3` cùng database với server/worker; giữ cùng allowlist và các cờ V3 liên quan giữa tiến trình.
3. Mở `/van-hanh-v3` bằng tài khoản quản trị. Cấu hình sản phẩm/giá trước, kiểm tra Page, thử chat trên một Page riêng.
4. Sau khi xác nhận dữ liệu và kết nối, test một đơn POS được phép tạo.

`page.v3_ai_bat = NULL` giữ hành vi allowlist cũ khi migration; công tắc UI sẽ ghi boolean rõ ràng. Không tự bật thêm Page ngoài allowlist. Màn sẵn sàng chỉ xác nhận điều kiện cấu hình, không thay thế heartbeat hoặc kiểm tra token/kết nối trực tiếp. Chưa deploy, chưa test Facebook/Pancake/LLM/POS thật. Gán Page/sản phẩm gốc, model/API key, kịch bản và chính sách tiếp tục dùng các màn có sẵn; không dựng CMS mới.
