# GSP1b — SKU bắt buộc khi gộp món POS, 02/10/2026

Hoàn tất quyết định «Bắt buộc SKU» trong CR-02-10b mục 5e. Trong giao dịch, máy chủ khóa và đọc SKU của mọi món được chọn, chuẩn hóa và suy SKU chung cho gốc; không lấy giá trị từ thân request làm nguồn. Không có SKU → `409 mon_chua_sku`; nhiều SKU → `409 sku_khac_nhau`; thân có SKU lệch (kể cả rỗng) → `409 sku_lech`. Không gửi SKU vẫn gộp được khi các món có cùng SKU. Giữ nguyên rào món/team, mã gốc trùng, món đã thuộc gốc khác và giao dịch được cả hoặc không gì.

Kiểm chứng trên PostgreSQL tạm:

- `test/gsp1b-sku.test.mjs`: 7 ca kể cả ca con; kiểm chuẩn hóa, SKU từ món, dữ liệu giả từ thân và rollback không để lại gốc/liên kết.
- `v3/test/b/gsp1b-sku-http.test.mjs`: HTTP/router/backend/DB thật; đúng mã lỗi 409 và câu hướng dẫn, marketer 403, số gốc và liên kết vẫn 0 khi từ chối. Danh tính được tiêm, không đo đăng nhập.
- `gsp1b.sh`: đạt cùng VE8a và hai bộ ca LL15d riêng; đột biến khôi phục luật tin SKU thân trên bản sao tạm làm các ca bắt lỗi đỏ.
- Bộ đầy đủ cùng GSP2: 2342 đạt, 0 lỗi, 4 bỏ qua (dữ liệu lịch sử chưa có; không phải ca mới).

Fixture cũ đã đổi, giữ nguyên khẳng định hành vi ngoài SKU:

- `test/ll15d-marketer-san-pham.test.mjs`: hai món dùng để gộp mang cùng SKU 101.
- `v3/test/b/ll15d-marketer-man.test.mjs`: món rời được gộp mang SKU 999; món đã thuộc gốc giữ riêng.
- `test/ve8a-gop-mon.test.mjs`: ca trùng SKU dùng một món chưa gộp có SKU 200 thật, thay vì gửi SKU 200 cho món SKU 128; vẫn kiểm mã `trung` và không ghi dữ liệu.

Không sửa luật gợi ý nhóm chưa SKU, không gán SKU cho «Diamond Halo set», không đổi giá/POS/bộ não và không deploy. Nhóm chưa SKU vẫn hiển thị nhưng máy chủ từ chối gộp bằng câu hướng dẫn kéo lại danh mục. Nợ `N-GSP-GOP-SKU` đã xử lý trong code local, chờ nghiệm thu/phát hành theo quy trình.

Xác nhận cuối: GSP1 14/14 và các cổng phụ thuộc LL13/VE1/VE8a/VE8b/LL15d rc=0 trên bản sao tạm. Bộ đầy đủ cuối chạy tối đa bốn tiến trình; giới hạn chập chờn của test đăng nhập cũ ghi tại nhật ký GSP2.
