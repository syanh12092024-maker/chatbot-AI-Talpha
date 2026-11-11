# Luồng chat V3 — cập nhật 17/09/2026

Phần này là sửa code, không điền dữ liệu cấu hình, không deploy và không migrate DB vận hành.
Giữ kiến trúc modular monolith, PostgreSQL và queue hiện có; không thêm dependency.

## Luồng hiện tại

```text
Webhook/poll → queue chống trùng → khóa theo team/Page/khách
  → gom tin webhook đang chờ (tối đa 6, không đợi thêm)
  → đọc lịch sử / kiểm tra sale tiếp quản
  → nạp state PostgreSQL + hydrate hồ sơ chat cũ
  → mẫu an toàn 0 token, hoặc model đã chọn trong cấu hình
  → tool cập nhật hồ sơ / nhận đơn / bàn giao qua backend
  → cửa gửi + sổ gửi bền
  → lưu state có kiểm tra phiên bản → hoàn tất các event trong lượt
```

### State và lịch sử

- V3 dùng `hoi_thoai.ho_so`; nhớ mẫu và URL ảnh đã gửi qua các lượt/restart.
- Tiếp nhận chat cũ: hydrate tối đa 20 tin trước event, rồi lưu hồ sơ. Context gửi
  model vẫn tối đa 6 tin gần nhất + hồ sơ. Không gọi thêm model tóm tắt mỗi lượt.
- Webhook giữ các câu khách trước đó chưa có câu trả lời; bỏ event hiện tại khỏi
  lịch sử để không gửi lặp. Khi tìm thấy id event, không nạp tin đến sau event đó.
- Địa chỉ trong hồ sơ giữ tối đa 1.000 ký tự thay vì cắt còn 90.
- Tool `update_customer` lưu dữ kiện mới/sửa, chỉ nhận trường hồ sơ cho phép và
  yêu cầu giá trị có căn cứ trong tin khách hiện tại. Không sửa giá, COD hay quyền.
- Đọc phiên bản `xmin` PostgreSQL và so trước hành động/UPDATE: thay đổi hồ sơ,
  không chỉ thay đổi owner, cũng làm snapshot cũ bị loại bỏ.
- Lỗi LLM/kênh cố gắng giữ lại hồ sơ đã thu thập nếu transaction còn dùng được.

### Mẫu và token

- Bộ lọc bảo thủ chặn mẫu khi có phủ định, sửa/hủy, nhiều chủ đề hoặc điều kiện
  bổ sung. Câu “giá bao nhiêu và vừa cổ tay nhỏ không?” chuyển AI để xử lý đủ ý.
- Mẫu hỏi cách đặt không tự xin lại toàn bộ dữ liệu khi đã có thông tin khách.
- Mẫu V3 đã dùng được lưu để câu hỏi lặp chuyển AI thay vì bắn lại cùng câu.
- Không resolve model/giải mã key khi mẫu đã xử lý được lượt chat.
- Không tự chèn freeship vào bảng giá, không trả mẫu ship 2–5 ngày khi thiếu cấu
  hình chính sách. Bỏ chỉ dẫn luôn coi hàng còn và mặc định hứa giao 2–5 ngày.
- Giá đã có trong KB không bắt gọi lại `get_price`. Không cắt nội dung marketer
  đã cấu hình chỉ để đạt một con số token. Trần CORE hiện có vẫn được kiểm thử.
- Update hồ sơ bằng tool có thể thêm một vòng LLM; chỉ dùng khi regex/hồ sơ chưa
  đủ hoặc khách sửa thông tin. Đây là đánh đổi để không mất dữ kiện qua các lượt.

### Provider và nhật ký

- `closer` dùng client và model thực sự được resolve; log không còn mang tên model
  cấu hình trong khi runtime vẫn gọi model env khác.
- Dùng lại adapter Claude/Kimi/OpenAI/DeepSeek đã có trong `v3/src/model`.
  Key được đọc theo team + provider, không đưa vào prompt/log.
- Lựa chọn hiện theo team + vai trò; team chưa cấu hình tiếp tục dùng runtime env.
  Model/provider không khớp hoặc thiếu key thì từ chối, không gọi nhầm nhà.
- Timeout 30 giây/lần gọi; tắt retry ngầm SDK để queue kiểm soát retry và chi phí.
- Nhật ký thêm hash prompt, provider, latency LLM và tên/kết quả/thời gian tool;
  không ghi input/output tool chứa PII vào phần trace mới.
- Adapter được kiểm thử bằng API giả lập. Không xác nhận quyền truy cập model
  trên tài khoản thật, độ chính xác bảng giá model hay latency production.

### Đồng thời, lỗi và bàn giao

- Tiến trình chính có 3 vòng xử lý độc lập và một vòng poll. Một lượt chậm không
  bắt các vòng còn lại chờ; cùng hội thoại vẫn khóa tuần tự trong PostgreSQL.
- Gom tối đa 5 event webhook tiếp theo đã chờ sẵn, dừng trước tin đang backoff/lỗi.
  Raw events giữ nguyên; chỉ đánh dấu cả cụm xong khi xử lý thành công.
- Đọc lịch sử thất bại thì retry có backoff trước khi gọi model, không trả lời mù.
- Model rỗng hai lần hoặc hết vòng tool gọi bàn giao thật, không chỉ nói lời hứa.
- Lỗi kết thúc retry chuyển hội thoại AI sang SALE/HANDOFF. Đơn CLOSING/POST_SALE
  không bị đổi về bán tiếp. Sổ gửi vẫn chặn phát lại HTTP chưa rõ kết quả.
- Nhận diện sale trên kênh dùng heuristic hiện có, đối chiếu tin AI trong DB và
  timestamp. Đây không phải bảo đảm nhận diện mọi tin người thật: thiếu timestamp,
  nội dung giống template hoặc request đang bay vẫn là giới hạn cần biết.

## Đối chiếu thủ công không cần sửa SQL

Chạy bởi quản trị có quyền DB, sau khi đã kiểm tra tình trạng trên kênh:

```sh
node ops/bin/doi-chieu-chat.mjs handoff TEAM_ID TIN_ID 'Đã đối chiếu trên kênh'
node ops/bin/doi-chieu-chat.mjs resume TEAM_ID HOI_THOAI_ID 'Sale đã xử lý xong và trả AI'
```

- `handoff` chuyển tin lỗi/chặn thành đã xử lý bằng bàn giao SALE; KHÔNG khẳng định
  đã gửi thành công, không xóa sổ gửi và không gọi HTTP gửi lại.
- `resume` chỉ nhận chat HANDOFF/SALE, từ chối nếu còn tin chưa giải quyết hoặc có
  hàng chờ đơn/dấu đã chốt. Lưu mốc trả AI để tin sale cũ không khóa lại ngay.
- Cả hai khóa hội thoại, kiểm tra team và ghi audit; lý do không được chứa PII.
- Đây là CLI quản trị, chưa phải nút mới trên UI. Không tự phục hồi transaction đã
  rollback sau một HTTP thành công; trường hợp đó vẫn cần người đối chiếu.

## Cấu hình và phạm vi chuyển đổi

Dữ liệu sản phẩm, offer/giá, chính sách, mapping Page/shop, key/provider và quyền
bật chạy vẫn do người vận hành bổ sung. Những thay đổi này không tự mở van gửi.

Page đã chuyển V3 dùng state PostgreSQL. Các Page chưa chuyển vẫn có adapter
legacy và kho JSON/RAM để giữ tương thích; không xóa hàng loạt dữ liệu legacy.
Cutover dùng allowlist `V3_PAGE_XU_LY` và migration 016 đã chuẩn bị từ đợt trước.
Không cần migration mới riêng cho đợt sửa này.

Chưa thêm A/B assignment theo Page, summary sinh bởi LLM, hoặc transactional
outbox tự phục hồi. Không cần chúng để chạy luồng tư vấn một sản phẩm hiện tại;
cần đo thực tế trước khi mở rộng. Các màn hình legacy chưa đồng nhất hoàn toàn
với dữ liệu V3; không dùng số hàng chờ JSON để suy ra số đơn V3.

## Kiểm chứng

`sh ops/bin/test-phase0.sh` chạy PostgreSQL tạm, API model/Pancake/POS giả lập.
Bao gồm regression trước đó và ca mới: hydrate, sửa thông tin, state race,
đa ý/phủ định, model routing/key team, provider/tool conversion, burst webhook,
đồng thời giữa khách, bàn giao và đối chiếu lỗi. Kết quả cuối ghi trong
[phase0-progress.md](phase0-progress.md).

Đây không phải toàn bộ test repository, load test hay smoke test với kênh thật.
Sau khi bổ sung cấu hình, cần thử một Page với đơn thử trước khi mở rộng.
