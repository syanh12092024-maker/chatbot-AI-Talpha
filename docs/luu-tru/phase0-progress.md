# Tiến độ Phase 0 — 17/09/2026

Đây là phần đã triển khai trong workspace, chưa phải toàn bộ roadmap và chưa deploy.
Đã thêm migration 016 và sinh lại schema; chỉ áp dụng trên database test tạm, chưa migrate database vận hành.

## Đã sửa

- Handler V3 chỉ xử lý khi owner là AI và stage là GREET/QUALIFY/SELLING.
  Kiểm tra lại trước closer, từng vòng LLM/tool, gửi ảnh/chữ và lưu state.
  UPDATE state có điều kiện owner/stage để không ghi snapshot AI đè quyền SALE.
- Kết quả gửi phải có `ok: true` trước khi tăng bộ đếm/ghi reply thành công.
  Thiếu xác nhận hoặc lỗi gửi chuyển queue sang lỗi, không tự chạy lại cả lượt.
  Trade-off: cần đối chiếu kênh rồi xử lý thủ công; tránh gửi trùng khi mất ACK.
- Template cũng trích tên/SĐT/địa chỉ trước khi lưu hồ sơ, không chỉ nhánh LLM.
- Conversation memory chỉ nhận dữ liệu đơn từ tool result thành công có dữ liệu
  backend; không dùng tool input do model đề nghị. Xếp ảnh vào hàng đợi không còn
  đồng nghĩa với đã gửi ảnh. V3 ghi nhận loại ảnh sau xác nhận gửi.
- Lưu hàng chờ đơn thất bại được trả thành lỗi, không đặt cờ chốt thành công.
- Đường KB từ DB dùng mapping sản phẩm gốc + shop của Page; không lấy biến thể
  thị trường khác. Page chưa mapping giữ fallback theo page_id như trước.
  Khi đã mapping nhưng thiếu shop thì không tự đoán sản phẩm.
- Giá POS minor được đổi sang major cho prompt và `products[].tiers`/currency.
  Dùng nguyên hệ số POS hiện có, bao gồm KWD/OMR/BHD ×100 đã được đối chiếu.
  Tiền tệ không hỗ trợ, giá/số lượng không hợp lệ hoặc nhiều tệ trong một biến thể
  bị từ chối. Đường DB vẫn phụ thuộc cờ `V3_RAP_PROMPT_BAT=1`.
- POS 5xx, HTTP 408 hoặc 2xx thiếu id không bị coi là từ chối chắc chắn: giữ dấu
  thao tác chưa rõ kết quả để cơ chế idempotency V3 chặn tạo lại.
- `NODE_ENV=production` yêu cầu APP_SECRET, ADMIN_USER và ADMIN_PASS khi gọi
  assertConfig; webhook thiếu secret bị từ chối. Web chat thử nghiệm mặc định
  bind 127.0.0.1; muốn bind khác phải cấu hình WEB_HOST.

## Bổ sung: webhook và sổ gửi bền

- `/webhook` không còn gọi handler legacy: xác thực chữ ký → lưu vào queue V3
  trong transaction → COMMIT → HTTP 200. DB hỏng trả 503 để nguồn gửi thử lại.
- Chống trùng webhook bằng Page + provider message id; một request chứa nhiều
  event được lưu nguyên transaction. Không ghi toàn payload/PII vào console.
- `page.nguon_tin` chọn `poll` hoặc `webhook`. Worker/poll legacy/follow-up legacy
  dùng chung `V3_PAGE_XU_LY` để không cùng xử lý Page đã chuyển V3.
- Webhook hiện vẫn gửi qua Pancake: worker tra PSID để lấy conv_id/cust_id thật,
  chưa thấy mapping thì backoff 5 giây, tối đa 3 lần, không gọi model khi chưa rõ.
- Khóa theo team + Page + PSID; FIFO theo thứ tự tin đã vào queue. Tin sau không
  vượt tin trước đang retry. Khách khác vẫn lấy khóa riêng.
- Sổ `lan_gui` ghi trên kết nối độc lập trước HTTP, giữ dấu qua rollback/crash.
  Có dấu gửi từ lượt trước thì không chạy lại model/gửi; đánh dấu lỗi cần đối chiếu.
  Tin sau của cùng khách cũng chờ đối chiếu để không tiếp tục với state cũ.
- SQL abort vẫn lưu lại attempt counter; không release cùng client hai lần.
- Worker kiểm tra queue lúc rảnh mỗi 250ms; nhịp đọc Pancake vẫn riêng (mặc định 6s).
  Đây chưa phải cam kết latency end-to-end hoặc cải thiện throughput khi đang bận.
- Hướng dẫn cấu hình và đối chiếu: [webhook-v3.md](webhook-v3.md).

## Bổ sung: backend đơn hàng dùng chung

- `createPancakeOrder` chuyển sang `orders/legacy.js` → hàng chờ → duyệt V3.
  Bỏ đường POST riêng và cách suy giá/kho từ đơn cũ. Cùng áp dụng kiểm tra giá DB,
  khóa hội thoại, sổ thao tác POS và trạng thái POS 12 của V3.
- Backend `orders/draft.js` kiểm tra COD boolean, dữ liệu khách, số lượng nguyên,
  sản phẩm và gói giá; giá/tiền tệ lấy từ cấu hình. Tool nhận kết quả backend rồi
  mới bật cờ đã nhận thông tin; gọi lặp trong cùng lượt trả lại cùng kết quả.
- V3 lưu hàng chờ ngay trong callback tool trước khi model viết lời xác nhận.
  Hàng chờ vẫn thuộc transaction worker: crash sau HTTP trước COMMIT cần đối
  chiếu theo sổ gửi, chưa có tự phục hồi state đầy đủ.
- Tool bàn giao V3 dùng cửa tag/note của worker; bỏ hai lần gửi ngầm từ tool cũ.
  Nhận đơn V3 không tự gắn thẻ/ghi chú đơn qua Pancake legacy; dùng hàng chờ V3
  và quyền SALE/CLOSING. Adapter legacy cũng không tự gửi ghi chú nhận đơn.
- Prompt phân biệt “đã nhận thông tin chờ duyệt” với “đã tạo đơn POS”.
  Guard không coi draft thành công là quyền đọc mã đơn POS.
- Cửa kiểm giá dùng chung mapping sản phẩm gốc × shop với prompt, có lọc SKU.

### Điều kiện vận hành sau thay đổi

Caller tạo đơn cũ cần Page và kết nối POS trong DB V3, mapping hội thoại rõ ràng,
gói giá đúng sản phẩm/shop/tiền tệ/số lượng, và kho hợp lệ. Thiếu cấu hình thì
chặn tạo; không quay lại đường POST cũ. Hàng chờ JSON hiện chưa truyền kho:
nhân viên cần hoàn thiện và duyệt tại hàng chờ V3. Không bật AUTO_CREATE_ORDER
trước khi xác nhận cấu hình này trên môi trường thử nghiệm.

Chưa deploy và chưa migrate database vận hành. Cần smoke test kênh thật/POS test
trước khi mở gửi; các ca dưới đây dùng API giả lập.

## Bổ sung: luồng chat và runtime

Đã nối model cấu hình vào runtime, hydrate/state bền, chống lặp mẫu/ảnh, lọc mẫu
đa ý/phủ định, worker song song, gom burst webhook và bàn giao/đối chiếu lỗi.
Chi tiết và giới hạn: [core-flow-progress.md](core-flow-progress.md).

## Kiểm chứng

Chạy `sh ops/bin/test-phase0.sh`: **279 passed, 0 failed, 0 skipped**.

Script tạo PostgreSQL tạm trên localhost:55439 (đổi bằng TEST_PORT), tự migrate
database test và tắt server khi kết thúc. Không dùng DATABASE_URL_V3 vận hành.
PG_BIN có thể trỏ thư mục binary PostgreSQL khác Postgres.app. Các API gửi tin,
LLM và POS trong các ca tích hợp đều được giả lập.

Phạm vi gồm context, regression Phase 0, handler V3, bảng giá và cửa chốt,
ráp prompt, hàng chờ/duyệt đơn, quy đổi tiền, chống đơn trùng, webhook, crash/retry,
khóa hội thoại, migration lên/xuống và worker.
Không phải kết quả chạy toàn bộ test repository hoặc load test production.

## Chưa hoàn tất trong Phase 0

1. Sổ gửi bền là cơ chế dừng khi chưa rõ kết quả, chưa phải transactional outbox
   tự phục hồi đầy đủ. Không tự dựng lại state/order đã rollback; cần người đối chiếu.
2. Phạm vi sổ gửi là các cửa V3 guiTin/guiAnh/ghiNote/gatThe qua worker. Adapter
   legacy và thao tác gửi tay ngoài worker chưa có sổ gửi bền tương đương.
3. Tạo POS legacy đã dùng duyệt V3, nhưng hàng chờ JSON và quyền hội thoại legacy
   vẫn tồn tại. Chưa hợp nhất toàn bộ persistence/UI.
4. Kiểm tra quyền trước HTTP không thể thu hồi một request đang bay khi sale
   tiếp quản; cần thống nhất chuyển owner và hàng đợi gửi ở bước hợp nhất core.
5. Conversation state còn tồn tại cả JSON/RAM cho Page legacy và PostgreSQL cho
   Page V3. V3 đã kiểm phiên bản xmin, chưa xóa toàn bộ persistence/UI legacy.
6. Chưa audit/sửa toàn bộ auth entrypoint khác hoặc legacy image memory. Provider
   runtime và lọc template đa ý đã nối; nhận diện ngôn ngữ vẫn là heuristic.

Các bước còn lại tiếp tục theo roadmap audit; không bật production chỉ dựa trên
việc bộ regression của đợt sửa này đã xanh.
