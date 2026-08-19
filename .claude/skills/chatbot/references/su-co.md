# Chẩn đoán sự cố

## Tra theo triệu chứng

### Bot im với MỘT khách
Grep tên khách trong log — sẽ thấy đúng lý do (`đơn đang xử lý (thẻ -X)`, `tin đầu → nhường Botcake`, `đã gán nhân viên`, handoff). 6 lý do im là thiết kế (`quy-tac-ai.md`). Chỉ kết luận là bug khi không khớp cửa nào.

### Bot im CẢ PAGE
Kiểm theo thứ tự: page tắt AI (`ai-enabled.json`)? → đang backoff (`/admin/api/overview` → `sendErrors`)? → Meta #2022 trong log?

### Bot đứng TOÀN BỘ
Grep `credit balance is too low` (Anthropic) hoặc `insufficient balance` / `exceeded_current_quota_error` (Kimi 429) → tài khoản nhà cung cấp AI hết tiền. Bot **không tự failover** nhà cung cấp. Xử lý: nạp tiền (không cần restart — 429 là lỗi thoáng qua, có tiền là những tin MỚI tự chạy lại), hoặc đổi `AI_PROVIDER` trong `.env` rồi restart nếu tài khoản kia còn credit — **kiểm tra bằng 1 call thử trước khi đổi**.

Tiền sử: 06/08/2026 Anthropic hết credit (chết ~3 tiếng, ~200 tin lỡ) → chuyển Kimi. **08–09/08/2026 Kimi cũng hết** (hết dần từ trưa 08/08, chết hẳn 03:47 09/08; ~1.500 khách bị đẩy hàng chờ dạng `error`, kiểm luôn Anthropic thì cũng rỗng). Chi tiêu đo được sau khi bật văn phong chủ động bán: **~$13/ngày cao điểm** (~2.500 tin) — nạp Kimi nên trù bị theo mức này.

### Log có `no low surrogate` / `non-empty content`
Nửa emoji (UTF-16 surrogate pair bị cắt đôi khi truncate chuỗi) hoặc lượt rỗng lọt vào body → API trả 400 `invalid_request_error`. Đây là lỗi **không tự hồi phục**: bot không retry, khách ngồi im vĩnh viễn mà không ai biết.

`text.js` đã chặn ở cửa gọi API. Nếu thấy lại → có **đường dữ liệu mới chưa qua `sanitizeMessages`**, tìm chỗ đó. Log `[text] đã dọn N mảnh emoji lẻ` cho biết lớp chặn đang phải ra tay ở page/khách nào.

### Meta #2022 "tạm thời bị chặn chia sẻ nội dung"
Backoff tự lo phần kỹ thuật. Gốc rễ là nội dung health-claim → phải kháng cáo qua BM. **Đừng tăng số lần retry** — càng gửi càng bị chặn sâu. Đã đo: 14% token lãng phí vào các lần gửi bị chặn.

Page từng dính: Kuwait Luxe Charm, Mint Breeze KSA, Royal Birthstone Jewelry, Golden Soap House UAE, Leg Glow Lab UAE, Luxoria GOLD Jewelry.

### "Pages kết nối" tụt mạnh
Một token Pancake chết hoặc mất quyền. JWT sống ~90 ngày; via FB chết thì quyền rụng dần. Thêm token của tài khoản còn quyền vào `PANCAKE_TOKENS_EXTRA` — **test coverage bằng conversations API trước khi thêm**.

Hạn các token hiện có: cũ 28/09 (đã mất hết quyền, giữ vô hại) · Hồ Sỹ Aanh 29/10 (2 phiên, dự phòng lẫn nhau) · CHÍNH 1 28/10 · Chu Thuý 22/10 · N. Thế 27/10 · Thơ Nyây 28/10/2026. → **Gia hạn cả loạt cuối tháng 10.**

Lỗi 103 (chết phiên dù JWT còn hạn) nay đã tự failover.

### Đơn AI về Pancake với COD = 0
Kiểm `total_price` AI có truyền không (event `order` trong Sổ AI), và hệ số tiền tệ đúng chưa trong `pancake-orders.js`: AED/SAR ×100, KWD/OMR/BHD ×1000.

### Số liệu dashboard nghi sai
`recount()` đọc từ Sổ AI là nguồn sự thật — nút "Đối chiếu Sổ AI" trên dashboard.

### Dashboard trắng / JS lạ
Cache trình duyệt (Ctrl+Shift+R). `/orders` chậm ~8s là bình thường (chạy 5 luồng song song + cache 5 phút).

### Nhóm WhatsApp không nhận báo cáo
`tail /var/log/aicloser-report.log`. Hay gặp nhất: phiên Baileys bị thu hồi → `npm run wa:login -- --phone <số>`.

**Đừng "sửa" bằng cách chuyển sang WhatsApp Cloud API chính thức** — API chính thức không gửi được vào group.

### Bot không gửi ảnh
Không phải lỗi kỹ thuật nếu page khác vẫn gửi được. Prompt chỉ *dặn*, quyết định gọi tool là của model (đo 7 ngày: 49% khách nhận ảnh). Kiểm bằng Sổ AI: đếm `type:'image'` theo cust. KB không có link ảnh http(s) thì tool bỏ qua êm. Page đang backoff #2022 thì ảnh cũng không gửi được. Chủ trương: không ép bằng code.

---

## Sổ sự cố — nguyên nhân gốc đã tìm ra

### AI bịa tổng tiền → khách hủy đơn + block page (07/08/2026)
Page Unilook Lifting Bra UAE, khách Priscela Amon.
Botcake chào "SET 1: 3 cái = 99 AED / SET 2: 6 cái = 149 AED". Khách nhắn **"2 sets, Size 38"** — ý là SET 2. AI hiểu thành 2 × SET 2, tự nhân 2 × 149 = **298 AED cho 12 cái**, con số không tồn tại trong bảng giá. Khách "Cancel" rồi block page.

Bằng chứng: Sổ AI ghi `calls: 2` (1 classifier + 1 closer) — **không hề gọi `get_price`**. AI lấy giá từ tin Botcake trong lịch sử rồi tự làm toán. Khớp đặc tính Kimi: ít chủ động gọi tool hơn Haiku.

Lỗ hổng: prompt cũ cấm "bịa giá" nhưng không cấm "nhân giá có thật thành tổng không có thật".
Vá: 3 quy tắc tiền trong `HARD_RULES` (`quy-tac-ai.md`). Nghiệm thu bằng tái hiện trên VPS 3 lần: 0/3 còn bịa.

### "Thống kê nhảy loạn xạ" + `/orders` khi 162 khi 248
`catch { break; }` trong `pancake-orders.js` nuốt lỗi timeout — mất trang giữa chừng mà vẫn trả kết quả như thể đủ. Vá: `fetchJsonRetry` (timeout 20s + 1 lần thử lại) và **throw thay vì break** để caller giữ giá trị cũ. `/orders` chuyển sang 5 luồng song song + cache 5 phút + cờ `partial`/`failedPages`: 215s → 8s, kết quả giống hệt nhau qua các lần chạy.

### "Đơn chốt giảm" — thực ra không giảm
Đơn tăng 17 → 34/ngày. Tỉ lệ chuyển đổi trông thấp hơn vì số khách tăng gấp 4 do mở thêm 16 page. **Nhìn số tuyệt đối trước khi nhìn tỉ lệ.**

### "Đốt token bất thường" — không có vòng lặp
Đã soát kỹ: `tin/khách` phẳng ở mức 1.7 trong khi lưu lượng tăng 4×. Không có vòng lặp nào. Nguồn lãng phí thật: 14% từ các lần gửi bị Meta #2022 chặn. Kết luận: token tăng vì **khách tăng**, không vì bug.

### kimi-k2.6 trả tin RỖNG
Kimi bật `thinking` mặc định; phần suy nghĩ ăn sạch `max_tokens` (199/200) nên `text` rỗng. Vá: `llm.js → aiExtras = { thinking: { type: 'disabled' } }` khi provider là kimi. **Bắt buộc, đừng bỏ.**

### 404 "model claude-haiku-4-5 not found" khi chạy Kimi
`.env` VPS còn `MODEL_CLOSER=claude-haiku-4-5` trong khi `AI_PROVIDER=kimi`. Vá: `pickModel()` trong `config.js` phát hiện lệch nhà cung cấp → dùng mặc định đúng + cảnh báo `[config]`.

### Token đếm sai lượt
`state.lastUsage` không được reset mỗi lượt và classifier không được tính. Vá ở `handler.js`.

### Caption ảnh bị mất
Caption bám vào tấm ảnh **đầu tiên**; tấm đó gửi lỗi thì caption biến mất. Vá: `pendingCaption` chỉ xóa sau khi có tấm gửi **thành công**.

### Lỗi TDZ trong classifier
`const text` khai báo lại bên trong block `try` che mất biến ngoài. Đổi tên thành `msg`.

### `pkill -f wa-login` giết luôn phiên SSH
Chính chuỗi lệnh ssh khớp pattern. Dùng `[w]a-login` hoặc `systemd-run`.

### Pairing code WhatsApp không bao giờ in ra
`connect()` chờ `connection === 'open'`, nhưng với pairing thì socket chỉ mở **sau khi** nhập code. Vá: gọi `requestPairingCode` 3 giây sau khi tạo socket.

---

## Cách nghiệm thu một bản vá prompt

Sửa prompt mà không nghiệm thu thì không biết có tác dụng hay không — LLM không tất định.

1. **Dựng lại kịch bản thật** từ Sổ AI + lịch sử Pancake: đúng `pageId`, đúng thứ tự tin, đúng câu chữ của khách.
2. **Chạy trên VPS**, không chạy local (local thiếu KB thật → rơi vào `page_no_kb` và bàn giao ngay, kết quả vô nghĩa). Script mẫu ở `van-hanh.md`.
3. **Chạy ≥3 lần** và đánh giá cả 3.
4. **Đặt tiêu chí máy kiểm được**, không đọc cảm tính. Ví dụ vụ Priscela: `bad = /298|12\s*pcs/i`, `ok = /set\s*1|set\s*2|which/i`.
5. Đạt rồi mới commit + deploy, và ghi kết quả nghiệm thu vào commit message.

---

## Việc còn treo

- Xoay (rotate) key Kimi — key từng bị dán nguyên văn vào chat.
- ~100 khách của 3 tiếng chết ngày 06/08 cần sale chăm tay.
- Tạo 3 thẻ Pancake cho page Ginger Belly Care KSA: `AI Chăm`, `AI Chốt`, `AI back Sale`.
- Kháng cáo Meta #2022 cho 6 page ở mục trên.
- Gia hạn cả loạt token Pancake cuối tháng 10/2026.
- Kênh Meta chờ Advanced Access (nhánh `meta-channel`).
- Phiên WhatsApp báo cáo chưa đăng nhập lại.
