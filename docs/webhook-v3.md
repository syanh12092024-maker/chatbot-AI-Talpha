# Webhook → queue V3 → Pancake

Phần này đã được test bằng dữ liệu giả, chưa triển khai lên môi trường vận hành.
Webhook nhận text từ Meta; gửi trả lời vẫn dùng Pancake hiện có. Chưa phải adapter
Meta độc lập: Page chưa kết nối Pancake không dùng được đường này.

## Điều kiện để chạy

1. Áp migration `016_webhook_va_gui_ben` bằng runner hiện có trước khi khởi động
   phiên bản code mới. Migration thêm cột vào Page/queue và bảng `lan_gui`.
   Không có cơ chế tự migrate khi server khởi động.
2. Server nhận webhook và worker phải dùng cùng `DATABASE_URL_V3` và cùng danh sách
   `V3_PAGE_XU_LY`. Page phải tồn tại trong DB, đúng team, đã có KB/sản phẩm/giá.
3. Chọn `page.nguon_tin='webhook'` cho Page nhận Meta webhook. Mặc định migration
   là `poll`, giữ nguồn nhận cũ. Hiện trường này chưa có điều khiển trên UI.
4. Cấu hình APP_SECRET, VERIFY_TOKEN riêng; `NODE_ENV=production` và thông tin
   ADMIN_USER/ADMIN_PASS. Meta gọi đúng HTTPS `/webhook` và gửi chữ ký hợp lệ.
5. Worker cần quyền đọc/gửi trên Pancake. Quyền gửi vẫn yêu cầu
   `V3_PANCAKE_GUI=1` và `PANCAKE_READONLY!=1`; máy test giữ READONLY.
6. Chạy server (`npm start`) và worker (`npm run worker-v3`) thành hai tiến trình.
   Server chỉ lưu tin; không có worker thì tin chờ trong DB, không tự trả lời.

Không bật các cờ này tự động qua bản sửa. Khi chuyển một Page, dừng/drain lượt
đang xử lý của nguồn cũ trước, cập nhật nguồn và allowlist thống nhất, rồi restart
tiến trình. Không đổi nguồn giữa một lượt đang gửi. Chưa có đối chiếu tự động các
message id khác định dạng giữa Meta và Pancake khi cutover.

Page ngoài allowlist hoặc đang chọn poll: webhook bỏ qua có chủ đích, trả 200.
Không còn fallback gọi handler legacy từ webhook. Poll legacy và follow-up legacy
bỏ qua Page thuộc allowlist V3; chức năng follow-up cho các Page này cần chuyển
riêng sang core V3 trước khi dùng lại.

## Flow thực tế

```text
Meta webhook
  → kiểm chữ ký/cấu trúc
  → tra Page/team/nguồn đã chọn
  → tạo conversation nếu thiếu + INSERT queue (chống trùng)
  → COMMIT
  → HTTP 200

Worker
  → chỉ lấy Page được phép, khóa team + Page + khách
  → nếu đã có dấu gửi: dừng, yêu cầu đối chiếu
  → đối chiếu PSID với conv_id/cust_id Pancake
  → history + state + handler V3
  → ghi lan_gui trên kết nối độc lập
  → gửi qua cửa V3
  → lưu xác nhận provider
  → COMMIT state và trạng thái queue
```

Nếu DB không lưu được webhook, trả 503 để Meta thử lại. Cùng message id trên cùng
Page chỉ có một bản ghi webhook. Delivery/read/echo và tin chỉ có attachment chưa
được xử lý như tin text; cơ chế nhận diện người thật từ echo chưa bổ sung ở đợt này.
FIFO là thứ tự đã nhận vào DB, không khẳng định khôi phục thứ tự event đến muộn từ Meta.

Việc đối chiếu dùng danh sách hội thoại gần nhất do client Pancake hiện có trả về.
Không có/mơ hồ mapping: chờ 5s rồi thử lại, tối đa 3 lượt; sau đó queue ở `loi`.
Không đoán id hội thoại và không gửi nhầm sang một hội thoại khác.

## Khi cần đối chiếu gửi

Các trạng thái `lan_gui`:

| Trạng thái | Ý nghĩa |
| --- | --- |
| dang_gui | Đã lưu ý định gửi; có thể tiến trình chết trước hoặc trong HTTP |
| da_gui | Provider trả `ok:true`; có thể transaction state sau đó vẫn thất bại |
| khong_ro | Không có xác nhận chắc chắn hoặc không lưu được xác nhận |

Đây là sổ thao tác bền, không phải outbox tự động bảo đảm exactly-once. Khi có
dấu gửi nhưng queue chưa hoàn tất, worker dừng; tin sau của khách chờ đối chiếu.
Đổi queue từ `loi` về `cho` cũng không tự vượt dấu gửi và không phát lại.

Truy vấn metadata để tìm các lượt cần xử lý (không in nội dung khách):

```sql
SELECT t.team_id, t.id, t.page_id, t.trang_thai, t.so_lan_thu,
       g.buoc, g.loai, g.trang_thai AS trang_thai_gui, g.provider_id
FROM tin_cho_xu_ly t
JOIN lan_gui g ON g.team_id=t.team_id AND g.tin_id=t.id
WHERE t.team_id = :team_id AND t.trang_thai <> 'xong'
ORDER BY t.id, g.buoc;
```

Người vận hành kiểm tra hội thoại thực trên Pancake, số đơn và trạng thái khách
trước khi xử lý. Nếu khách đã nhận, không gửi lại; khôi phục/cập nhật state theo
kết quả thực rồi mới đánh dấu tin đã xử lý. Nếu không thể xác định đã nhận hay
chưa, chuyển sale. Không xóa dấu gửi để ép replay. Chưa có màn hình đối chiếu tự động.

Sổ có nội dung gửi để phục vụ đối chiếu, có thể chứa PII. Quyền đọc DB và quy trình
lưu trữ dữ liệu khách áp dụng cả bảng này; không xuất nguyên bảng vào console/log.

## Giới hạn và vận hành

- Sổ chỉ bao phủ cửa gửi V3 do worker gọi, chưa bao phủ mọi tác dụng phụ của tool
  legacy hoặc thao tác gửi tay. Đường tạo đơn legacy vẫn cần hợp nhất ở bước sau.
- Worker hiện xử lý tuần tự trong mỗi process. Có thể chạy nhiều process với khóa
  DB, nhưng chưa có load test để công bố số Page/tin mỗi giây.
- Process worker có pool riêng cho sổ gửi. Nếu tích hợp `chayMotVong` vào runner
  khác, truyền `poolGui` độc lập; không đưa transaction client vào vị trí này.
- Tick rảnh 250ms không bao gồm thời gian chờ worker bận, Pancake và LLM.
- Muốn rollback code: dừng worker, giữ/export sổ gửi để đối chiếu trước khi cân nhắc
  migration down. Down xóa sổ gửi, không dùng như cách xóa lỗi để gửi lại.

Kiểm chứng local: `sh ops/bin/test-phase0.sh`. Script dùng PostgreSQL tạm và tắt
server test khi kết thúc; không dùng database vận hành hoặc gửi tin khách thật.
