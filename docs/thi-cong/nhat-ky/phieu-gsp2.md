# GSP2 — tiếp tục phần Claude dừng giữa chừng, 02/10/2026

## Phạm vi và điểm nhận lại

Nhận lại cây ở `aefe840`: migration 032, tầng đọc/ghi việc chuyển, router, hành động audit và nối dây đã làm dở, chưa commit. Giao diện còn đọc `GOC.cho.length` dù API đã bỏ trường này; toàn bộ bộ ca ở lần rà đầu có 13 lỗi. Không sửa bộ não chat, không deploy và không ghi dữ liệu production.

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

## Vòng 2 — vá C1 (05/10, commit 0a17180)

**Việc:** đúng một mã CHẶN C1 (giá bản sao hiện đơn vị nhỏ ×100). Không đụng F1/F2/C2–C4/N1/N2.

- `src/products/chuyen-ban-sao.js`: thêm `bacDonViLon(bac)` chia `HE_SO_TE[tienTe]` (import từ `../pos/tao-don.js`, cùng nguồn `nap-tu-kb.js`) cho `gia` · `giaGoc` · `phiShip`; `null` giữ nguyên; tiền tệ lạ chia 1 (cùng quy ước `giaCuaMon`). Áp ở một chỗ — lúc dựng `banSao[].bac`; màn không tự quy đổi (không sửa `san-pham.html`).
- `test/gsp2-chuyen-ban-sao.test.mjs`: ca mới «đơn vị giá» — bản sao nạp 9900/12900/2500 SAR (như `nap-tu-kb`) ⇒ `dsViecChuyen` trả 99 / 129 / 25; dọn dòng `goi_gia` sau ca để không lệch ca sau (ca «không ghi giá» đếm `goi_gia` = 1).
- `ops/bin/nghiem-thu/gsp2.sh`: đột biến `don_vi` (bỏ phép chia ⇒ `Number(v)`) chạy trên BẢN SAO tạm, đo bản SAU vá; regex bắt `✖ GSP2 · (quyết định|PostgreSQL)`.

**Nghiệm thu (máy này, DB thử, không in URL):** `gsp2.sh` rc=0 — 24/24 ca (gsp2 + ll15d), 8 đột biến bị bắt gồm `don_vi`. `npm test` một lượt: 2347 ca · 2343 pass · 0 fail · 4 bỏ qua (mốc vòng 1: 2346 ⇒ +1 ca).

**_chan1.sh gsp2:** ĐỎ 1 / XANH 7. Đỏ duy nhất là ④pathspec-⊆-③: liệt kê tệp NGOÀI ③ của commit vòng 1 `bb3cf5e` (schema.sql, N1a′, thước GSP1/LL13/VE8a…) — verdict vòng 2 đã CHẤP NHẬN; commit vòng 2 chỉ đụng 3 tệp, đều trong ③ (chuyen-ban-sao.js, test/gsp2-*, gsp2.sh). Marker NEEDS CLARIFICATION = 0.

**Giả định/ghi nhận:** màn `san-pham.html:745` vẫn in `so(x.gia)`, nay nhận đơn vị lớn nên đúng; chưa chạy kiểm bằng mắt trên màn thật. `bac` của `GET /api/san-pham/chuyen` đổi đơn vị so vòng 1 — GSP3 gọi `dsViecChuyen` sẽ nhận đơn vị LỚN, cần ghi nhớ khi chép giá (đừng nhân/chia hai lần).
