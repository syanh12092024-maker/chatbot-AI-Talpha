# Rà soát go-live — 02/10/2026

## Kết luận

**Chưa đủ điều kiện go-live bản workspace hiện tại.** Có lỗi chặn deploy và lỗi runtime ở màn Sản phẩm. Sau khi sửa và kiểm tra lại, có thể tiến đến pilot một page có người theo dõi; chưa có bằng chứng để mở đồng loạt.

Phạm vi: đọc code local, cấu hình deploy, auth, nhận/xử lý/gửi tin, sản phẩm và bộ kiểm thử. Không thay code ứng dụng, không deploy, không gửi tin khách, không tạo đơn POS. Chưa kiểm tra trạng thái VPS hiện tại, HTTPS/firewall, secrets, migration và dữ liệu cấu hình production.

## Kiểm chứng

- Cổng tĩnh `bash ops/bin/kiem-tinh.sh`: đạt; cảnh báo thiếu khai báo ba biến giá model trong bảng môi trường.
- `git diff --check`: đạt tại thời điểm kiểm tra.
- Bộ trọng yếu `sh ops/bin/test-phase0.sh`: **465 pass, 0 fail, 0 skipped**.
- Toàn bộ các glob của `npm test`, trên PostgreSQL tạm, DB URL ép sang PostgreSQL tạm và `PANCAKE_READONLY=1` ép đóng gửi; một số module vẫn nạp `.env` local qua dotenv: **2324 tests; 2307 pass, 13 fail, 4 skipped**.
- API ngoài trong các ca tích hợp được giả lập; kết quả này không xác nhận Messenger/Pancake/LLM/POS thật hoặc tải production.

Log: `/tmp/chatbot-golive-audit-tests.log`, `/tmp/chatbot-golive-full-tests.log`, `/tmp/chatbot-golive-static.log`.

## Lỗi cần sửa trước khi phát hành

### 1. Preflight deploy luôn thất bại sau khi đọc DB thành công

`deploy/preflight.mjs:134` đọc `db.missingPages.length`, nhưng `inspectDatabase()` chỉ trả `pagesBotBat`, không trả `missingPages` nữa. `main()` bắt TypeError và exit 1. `deploy/setup.sh` gọi entrypoint này trước khi apply, nên quy trình deploy bị chặn.

Các test hiện tại gọi trực tiếp `checkConfig`/`inspectDatabase`; fixture setup thay executable node bằng stub. Vì vậy bộ deploy test vẫn xanh mà không chạy nhánh lỗi thật của CLI.

Cần sửa hợp đồng kết quả và thêm kiểm tra entrypoint thật với DB tạm cho cả preflight thường và `--ready`.

### 2. Màn Sản phẩm bị lỗi runtime vì hợp đồng API/UI lệch nhau

`v3/src/ui/san-pham/kho-goc.js#manSanPhamGoc` đã bỏ `cho`/`khongCoSoHieu`. `v3/src/ui/san-pham/trang/san-pham.html#veTrai` vẫn đọc `GOC.cho.length`, gây TypeError lúc mở màn. Đây là lỗi giữa code UI và API hiện tại, không chỉ fixture test thiếu trường.

Trong 13 ca đỏ: 11 ca giao diện lỗi ở `veTrai`; một ca GSP1 còn kỳ vọng trường `cho`; một ca schema.

Cần cập nhật UI theo hợp đồng mới và kỳ vọng test liên quan; chạy lại các luồng mở màn, gộp POS, sửa giá, gán page, gán marketer và quyền chỉ xem.

### 3. Schema hợp nhất chưa cập nhật theo migration mới

Migration `032_doi_soat_ban_sao` có trong workspace nhưng `db/schema.sql` chưa sinh lại. Ca S11 ở `test/l0-m1-luoc-do.test.js` thất bại.

Cần sinh lại bằng `node db/migrate.js schema`, kiểm thử và đóng gói migration cùng release. Chưa xác nhận production đã áp đến migration nào.

### 4. Pilot không giới hạn một page

`deploy/setup.sh` ở chế độ pilot chỉ kiểm ba cờ môi trường; không kiểm số page bật bot. `inspectDatabase` có đếm `pagesBotBat` nhưng số này chưa được dùng để chặn pilot.

Worker lấy tất cả page có `bot_ai_bat=true` qua `src/queue/page-routing.js`. Mở van toàn cục có thể mở gửi cho nhiều page đang bật, trái mô tả pilot một page trong `deploy/README.md`.

Cần giới hạn pilot và kiểm lại số page ngay trước bước khởi động/mở gửi. Đồng thời xác nhận bot ngoài dự án (`ai_sale`) đã tắt trên page thử; công tắc của repo không điều khiển bot đó.

## Điều kiện vận hành cần hoàn tất

- **HTTPS và cookie phiên:** `v3/src/auth/router.js` cho cookie không Secure nếu request HTTP và thiếu `V3_COOKIE_SECURE=1`; `v3/chay-that.js` dùng HTTP server, không thấy thiết lập trust proxy. Với proxy HTTPS cần cấu hình để cookie thực sự Secure; chặn truy cập HTTP trực tiếp từ Internet. Chưa kiểm tra hạ tầng VPS nên chưa kết luận đang phơi HTTP.
- **Timeout và ngắt page khi lỗi kênh:** `src/pancake.js#pkFetchPage` cùng các request page/unread không có deadline ứng dụng bằng AbortSignal. Poll đọc tuần tự qua các page; một request chậm có thể kéo dài cả vòng. Worker thử lại theo từng tin, chưa có ngắt toàn page 30 phút khi kênh liên tục lỗi (README ghi nợ `N-MB-NGAT-PAGE`). Cần bổ sung trước khi mở rộng nhiều page.
- **Phục hồi kết quả gửi không rõ:** sổ `lan_gui` và worker đã chặn gửi lại sau mất ACK/crash; các ca hồi quy đạt. Nhưng vẫn cần người đối chiếu, không tự phục hồi toàn bộ state/đơn rollback. Pilot phải có người nhận và xử lý tin lỗi; thử quy trình đối chiếu và trả AI trên môi trường thử.
- **Giám sát:** UI có đo nhịp từ hàng đợi, không phải heartbeat độc lập; hàng đợi rỗng lâu không xác nhận worker còn sống. Cần bằng chứng giám sát dịch vụ, độ trễ hàng đợi, lỗi gửi và cảnh báo đến người trực trước khi mở rộng.
- **Nghiệm thu kênh thật:** cần kiểm tra giá/tiền tệ/ảnh đúng page, takeover sale, bàn giao, chống đơn trùng, mất kết nối và khởi động lại. POS cần nghiệm thu riêng trước khi mở `V3_POS_GHI`.
- **Backup/restore và tải:** test tạo/đọc được archive không thay thế thử khôi phục dữ liệu vận hành. Chưa chạy load test hoặc kiểm chứng khôi phục trên bản production.
- **Tài liệu vận hành:** `docs/v3/00-BAT-DAU-TU-DAY.md` còn nói V3 chưa viết code; `deploy/README.md` còn phần ba dịch vụ và cookie production luôn Secure trong khi code đã đổi. Cần đồng bộ để người trực không dùng hướng dẫn cũ.

## Thứ tự đóng việc

1. Sửa preflight, UI Sản phẩm, đồng bộ schema; chạy toàn bộ test lại, giải thích bốn ca skipped.
2. Chốt release có đủ migration và kiểm tra VPS chỉ đọc: dịch vụ, schema, cờ gửi, page bật, HTTPS, backup và bot trùng.
3. Ràng buộc pilot một page; giữ POS đóng; nghiệm thu chat thật với người trực và đường đối chiếu lỗi.
4. Nghiệm thu POS riêng, restore, tải và cảnh báo trước khi mở rộng.

Chỉ dấu “READY” trên giao diện là kiểm tra cấu hình (`src/admin-v3/operations.js#pageStatus`), không phải chứng nhận go-live hoặc xác nhận kết nối ngoài còn hoạt động.

## Cập nhật sau khi tiếp tục phiên Claude trong cùng ngày

Đã hoàn tất code local GSP2/GSP1b: sửa hợp đồng UI/API, sinh lại schema 032, thêm màn chuyển page và rào SKU từ dữ liệu POS. Bộ đầy đủ mới nhất: **2342 đạt, 0 lỗi, 4 bỏ qua có lý do dữ liệu lịch sử**. Hai cổng mới và tám đột biến trên bản sao tạm đạt. Chi tiết ở `docs/thi-cong/nhat-ky/phieu-gsp2.md` và `phieu-gsp1b.md`.

Các mục 2–3 trong danh sách lỗi ban đầu đã sửa trong workspace. Lỗi preflight, giới hạn pilot và điều kiện vận hành chưa được xử lý trong hai phiếu này. GSP3/GSP3b và việc người H-GSP vẫn còn; chưa deploy, migrate hoặc mở gửi trên production. Kết luận chưa đủ go-live vẫn giữ.

Lượt cuối bộ đầy đủ dùng tối đa bốn tiến trình; GSP1 và các cổng phụ thuộc đạt trên bản sao tạm. Một lượt chạy không giới hạn có hai lỗi lấy cookie null ở test auth cũ, lượt giới hạn đạt; nguyên nhân chưa xác định. Đây là giới hạn kiểm thử cần theo dõi, chưa phải bằng chứng đủ go-live.
