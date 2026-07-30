# 📘 HƯỚNG DẪN SỬ DỤNG AI CLOSER — CHO SALE & MARKETING

> Bot AI trực Messenger 24/7: tư vấn khách (Tagalog/English/Ả Rập...), gỡ phản đối, thu thông tin COD, tự tạo đơn vào Pancake POS, và **bàn giao cho người** đúng lúc. Tài liệu này hướng dẫn cách làm việc CÙNG bot.

**Truy cập dashboard:** `http://169.58.33.8:3100/admin` — đăng nhập bằng tài khoản được cấp.
Nếu trang hiển thị lạ sau khi hệ thống cập nhật → nhấn `Ctrl+Shift+R` (Mac: `Cmd+Shift+R`).

---

## PHẦN 1 — DÀNH CHO SALE

### 1.1. Màn hình chính của bạn: 🔔 "Cần sale xử lý"

Đây là **hộp việc duy nhất bạn cần canh**. Mọi tình huống AI dừng phục vụ đều rơi vào đây, badge đỏ trên menu cập nhật 30 giây/lần.

**5 loại việc (lọc bằng chip đếm số):**

| Loại | Màu | Nghĩa là gì | Bạn cần làm |
|---|---|---|---|
| 😡 Khiếu nại | Đỏ, **luôn trên cùng** | Khách bực/khiếu nại | Vào NGAY — ưu tiên số 1 |
| 🙋 AI chuyển người | Vàng | AI thấy cần người (đơn to, khách đòi gặp người, không chắc thông tin) — kèm *lý do in nghiêng* | Đọc lý do → vào chat tiếp khách |
| ⏳ Hết lượt AI | Vàng | AI đã trả 5 lượt/24h mà khách còn do dự | Vào chốt bằng kỹ năng người thật |
| 📄 Thiếu kịch bản | Vàng | Khách nhắn vào page chưa có KB | Tiếp khách tay + báo MKT bổ sung KB |
| 🛒 Đã chốt đơn | Xanh | AI đã chốt xong, đơn đã nằm trong POS | Kiểm tra & xác nhận đơn trên POS |

**Trên mỗi dòng:** tên khách + 📍khu vực + SL · **SĐT có nút ⧉ copy 1 chạm** · nhãn `● MỚI` nếu dưới 2 giờ · nút **"Mở chat ↗"** nhảy thẳng vào đúng hội thoại trên Pancake.

**Chọn khung thời gian:** 24 giờ / 48 giờ / 7 ngày (góc phải).

⚠️ Việc **tự trôi khỏi danh sách** khi quá khung thời gian — đừng để tồn qua ngày.

### 1.2. Đơn AI tạo trong POS

- Đơn do AI chốt có ghi chú **"Đơn do AI chốt — chờ nhân viên xác nhận"**, trạng thái "Mới"
- AI chỉ được tạo đơn khi đủ: tên + SĐT hợp lệ + địa chỉ cụ thể + khách xác nhận COD → nhưng **bạn vẫn phải gọi xác nhận** trước khi chuyển trạng thái
- Tiền COD được AI điền theo đúng giá đã báo khách — nếu thấy 0 đồng hoặc sai, sửa tay và báo quản trị

### 1.3. Tab 💬 "Tin nhắn" — theo dõi & can thiệp

Bố cục 3 cột: **danh sách khách** (72h gần nhất, tìm kiếm theo tên/SĐT) · **khung chat** · **thông tin khách + đơn hàng**.

- **Chip trạng thái** trên danh sách: `✋ người` (đã có người tiếp quản) · `🛒 có đơn`
- **🇻🇳 Dịch**: bấm 1 nút để AI dịch cả hội thoại sang tiếng Việt (hữu ích với chat tiếng Ả Rập) — bấm lại để ẩn
- **✋ Tiếp quản**: từ lúc bấm, AI **im hoàn toàn** ở hội thoại này, bạn chat tay. Xong việc bấm **↩ Trả AI**
- **Gõ tin ở ô dưới cùng** = gửi thẳng cho khách qua Pancake (tự động kích hoạt tiếp quản) — cẩn trọng như chat trên Pancake thật
- **Cột phải**: SĐT (copy), khu vực, **thẻ đơn POS** (mã, trạng thái, COD, mã vận đơn), số lượt AI đã dùng, và ô **📝 Ghi chú** — nội dung ghi ở đây đẩy thẳng vào hồ sơ khách trên Pancake (có tag `[Dashboard]`)
- Việc sâu hơn (sửa đơn, gán người, tag) → bấm **"Mở Pancake ↗"**

### 1.4. Quy tắc vàng khi làm việc cùng AI

1. **Khách đã có đơn đang chạy** (thẻ trạng thái trên Pancake) → AI tự im, phần còn lại là của bạn
2. Muốn chat tay ở hội thoại AI đang phục vụ → **bấm Tiếp quản trước**, đừng chat chen (khách nhận 2 luồng tin)
3. AI nói *"team member will assist you shortly"* với khách = việc đã nằm trong hàng chờ — **có người phải vào thật**
4. Xong việc nhớ **Trả AI** để bot tiếp tục trực đêm

---

## PHẦN 2 — DÀNH CHO MARKETING

### 2.1. Checklist mở AI cho page mới (4 bước)

1. **Đưa page vào Pancake** và **kích hoạt (activate)** — trong vòng ≤10 phút page tự xuất hiện trên dashboard (thẻ "Pages kết nối")
2. Vào **Tổng quan** → tìm page (ô tìm kiếm tìm được TẤT CẢ page, kể cả chưa hoạt động) → bấm **📖 Sửa KB**:
   - Câu chào mở đầu + giọng điệu + hướng dẫn bán riêng (nếu cần)
   - Sản phẩm: mô tả bán hàng, **bảng giá theo gói** (Mua 1 / Mua 1 tặng 1 / Combo...), tiền tệ đúng thị trường, **ảnh sản phẩm gắn nhãn loại** (sản phẩm / feedback / thành phần...) — AI gửi đúng loại khi khách hỏi
   - Hoặc bấm **📥 Nhập kịch bản Pancake** để import file quick-replies có sẵn
3. **Lưu tất cả**
4. Quay lại Tổng quan → **gạt công tắc AI** ở đầu dòng page → xanh là chạy

> ⚠️ Bật AI mà chưa có KB = khách nhắn vào bị chuyển thẳng cho sale (AI không bịa). Làm đúng thứ tự: KB trước, bật sau.
> Lượt quét đầu tiên bot chỉ "ghi mốc" — không dội tin các hội thoại cũ; tin đầu của khách mới vẫn do Botcake chào, AI vào từ tin thứ 2.

### 2.2. Đọc số liệu ở 📊 Tổng quan

- 5 thẻ KPI: Pages kết nối · Khách AI tư vấn · Tin AI trả lời · **Đơn từ khách AI** (khớp đơn POS thật với hội thoại AI) · **Tỉ lệ chốt**
- Lọc theo: Hôm nay / 7 ngày / 30 ngày / Tất cả / tùy chọn ngày
- Bảng page: lọc "Có hoạt động" (mặc định) / Đang bật AI / Có kịch bản / Chưa có KB; cột "Đơn khách AI" hiện `…` vài chục giây đầu là bình thường (đang đợi POS)
- Nút **🔍 Đối chiếu Sổ AI**: kiểm chứng số liệu với nhật ký gốc — lệch là có vấn đề, báo quản trị

### 2.3. Cảnh báo đỏ — PHẢI để ý

- Pill **⚠ N page lỗi gửi tin** trên topbar + banner đỏ ở Tổng quan = page bị Meta chặn gửi (thường lỗi #2022 do nội dung). Bot tự ngừng page đó 30 phút để tránh bị phạt nặng thêm — nhưng **khách đang không được trả lời**: cần sale vào Pancake trực tay + MKT kiểm tra chất lượng page trong Business Manager / kháng cáo
- Số "Pages kết nối" **tụt từ ~234 xuống ~3** = token Pancake chết/hết hạn (token hiện tại hết hạn **28/09/2026**) → đăng nhập lại pages.fm lấy token mới, báo quản trị thay trong cấu hình

### 2.4. Nội dung quảng cáo & kịch bản — tránh tự sát kênh

AI bị khóa cứng các quy tắc: không hứa công dụng kiểu chữa trị/cam kết kết quả, không hứa giờ giao cụ thể, không tự chế chính sách đổi trả. **Kịch bản page KHÔNG ghi đè được các quy tắc này** — nếu kịch bản viết trái, AI vẫn theo quy tắc chung. Viết kịch bản/ads tránh từ ngữ health-claim để không dính #2022.

---

## PHẦN 3 — 13 NGUYÊN TẮC CỦA AI (tóm tắt để hiểu bot)

1. **Ngôn ngữ**: mặc định Tagalog/English; khách dùng tiếng khác (Ả Rập, Urdu...) → đáp đúng tiếng đó; không bao giờ tiếng Việt
2. **Trung thực**: giá/chính sách chỉ lấy từ KB; luôn coi còn hàng; chủ động gửi ảnh thật
3. **Chốt COD đúng quy trình**: đủ tên+SĐT+địa chỉ+SL+xác nhận COD mới tạo đơn; không bịa mã đơn
4. **Không spam hỏi**: không hỏi lại thứ khách đã cho; địa chỉ khu vực + 1 chi tiết là đủ
5. **Chống đơn trùng**: khách có đơn đang chạy → không chốt lại, không bán lại
6. **Biết im lặng**: page tắt AI / thiếu KB / tin đầu (nhường Botcake) / spam / người đã tiếp quản
7. **Biết chuyển người**: khiếu nại, đơn giá trị cao, khách đòi gặp người, AI không chắc
8. **Cầu chì chống spam khách**: tối đa 5 lượt/khách/24h; khách nhắn dồn → đợi ~20s trả lời 1 lần cho cả cụm; xử lý song song 4 khách
9. **Backoff**: gửi lỗi 2 lần liên tiếp → ngừng page 30 phút + cảnh báo đỏ
10. **Đọc lịch sử trước khi trả lời**: nạp 20 tin gần nhất của đúng hội thoại — không chào lại, không hỏi lại
11. **Không cam kết vượt thẩm quyền**: ngoài KB → "nhân viên sẽ xác nhận với anh/chị"
12. **Bảo vệ thông tin khách**: chỉ đọc lại SĐT/địa chỉ 1 lần lúc xác nhận đơn; không lộ thông tin khách khác
13. **Kết thúc là phải bàn giao**: mọi điểm AI dừng đều vào hàng chờ "Cần sale xử lý" kèm lý do

---

## PHẦN 4 — SỰ CỐ THƯỜNG GẶP (FAQ)

| Hiện tượng | Nguyên nhân thường gặp | Xử lý |
|---|---|---|
| Bot không trả lời 1 khách | Xem 6 lý do im lặng (nguyên tắc #6) — hay gặp nhất: khách có đơn đang chạy, hoặc là tin đầu tiên (Botcake chào) | Xem log hội thoại trong tab Tin nhắn; cần thì Tiếp quản |
| Bot trả lời chậm ~30s | Thiết kế: đợi khách gõ xong 20s + chu kỳ quét | Bình thường, không phải lỗi |
| Bot không trả lời CẢ PAGE | Page tắt AI / page đang backoff (cảnh báo đỏ) / Meta chặn | Kiểm tra công tắc AI + topbar |
| Badge Pancake hiện "(1)" chưa đọc dù bot đã rep | Bot rep qua API nên Pancake không tự đánh "đã đọc" | Không phải lỗi |
| Trang dashboard trắng/thiếu | Cache trình duyệt sau bản cập nhật | `Ctrl+Shift+R` |
| "Pages kết nối" tụt còn ~3 | Token Pancake hết hạn (28/09/2026) | Lấy token mới từ pages.fm, báo quản trị |
| Đơn AI thiếu tiền COD | Chỉ xảy ra với đơn trước 29/07 | Sale điền tay; đơn mới tự đúng |

---

*Cập nhật: 30/07/2026 · Hệ thống: AI Closer v0.3 · Nguồn kỹ thuật: README.md trong repo `chatbot-AI-Talpha`*
