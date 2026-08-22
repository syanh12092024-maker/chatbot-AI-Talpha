# KẾ HOẠCH VIẾT CODE

> Bản 3 · 22/08/2026. Bản trực quan: <https://claude.ai/code/artifact/53dcf438-7d94-4c5b-83e3-70922fb4f9ea>

---

## Sáu nguyên tắc thực thi

**1. Không viết lại bộ não chat.** 1.962 dòng gồm bộ soạn câu, bốn công cụ, lớp trả lời 0 đồng và cửa kiểm tin ra — phần đắt nhất và đã trả giá bằng khách thật.

**2. Prompt có bốn khối, không phải một.** Mỗi khối một chủ sở hữu, một nhịp thay đổi, một cách duyệt. Tách bốn khối ngay từ đầu, đừng để dính vào nhau rồi mới gỡ.

**3. Lớp team vào từ dòng code đầu tiên.** Gắn sau là phải sờ lại mọi bảng, mọi truy vấn, mọi màn hình.

**4. Chạy song song, không chuyển đứt.** Bản mới lên 3 page thử trước, hai bên cùng chạy, so số.

**5. Mỗi luồng phải nghiệm thu được bằng số.** Không đạt thì chưa qua luồng sau.

**6. Bốn điểm kiểm chặn phải xong trong tuần 1.** Xem mục cuối.

---

## Code hiện có chia làm hai nửa

| Nhóm | Dòng | Xử lý |
|---|---:|---|
| Bộ não chat — soạn câu, 4 công cụ, lớp 0 đồng, cửa kiểm tin ra | 1.962 | dùng nguyên |
| Nội dung — đọc dữ liệu sản phẩm, nhập kịch bản Pancake, cửa kiểm sẵn sàng | 1.732 | dùng nguyên |
| Tự học — mổ hội thoại, học mẫu, A/B | 1.446 | dùng nguyên |
| Cửa kết nối — Pancake, POS, Botcake, Meta | 1.241 | bọc thêm team + model |
| Lưu trữ & điều phối — state file JSON, sổ AI, vòng poll, trọng tài bot | 2.592 | **viết lại** |
| Màn hình cũ — 9 file router + 7 trang | 2.213 | **thay bằng 37 màn mới** |
| Luồng đơn & chăm khách | 2.118 | **viết lại, giữ ý** |

**48% code sống sót — và đúng nửa khó nhất.** Phần phải viết lại khó ở chỗ *nhiều*, không khó ở chỗ *tinh*.

---

## Bốn giai đoạn

| Giai đoạn | Nội dung | Thời gian |
|---|---|---|
| **1 — đang chốt** | Năm luồng lõi. Hệ thống chạy thật trên 3 page thử | **5–6 tuần** |
| 2 | Bộ não AI có giao diện, kịch bản 3 tầng, báo cáo đủ, phân quyền 5 vai | 4 tuần |
| 3 | Nhắn hàng loạt, đuổi theo, trả lời bình luận, AI đề xuất ba tầng | 3–4 tuần |
| Sau nữa | Kho ưu đãi, hậu bán & mua lại — đã thiết kế xong, để dành | — |

**Tổng: 12–14 tuần.**

---

## Giai đoạn 1 — năm luồng lõi

```
L0 Nền → L1 Bốn cửa kết nối → L2 Chat Messenger → L3 Hai luồng đơn → L4 Bảng điều phối
```

### L0 · Nền dữ liệu, team và đăng nhập — 5–7 ngày

**Dùng lại:** không có gì, phần mới hoàn toàn. **Thay thế:** 15 file JSON rời.

Làm gì:
- Dựng PostgreSQL, lược đồ có `team_id` ở **mọi bảng**
- Tầng truy vấn tự chèn điều kiện team theo người đăng nhập
- Di trú dữ liệu thật: kịch bản, sổ cái page, trạng thái hội thoại, Sổ AI
- Đăng nhập + chọn team + hai vai tối thiểu: quản trị, sale
- Nhật ký thao tác — bật ngay từ đầu

Nghiệm thu:
- Đăng nhập team Tiểu Alpha, **không thấy một dòng dữ liệu nào** của hai team kia
- Sửa tham số trên URL để truy vấn xuyên team → bị chặn ở tầng dữ liệu, có ghi nhật ký
- Dữ liệu di trú khớp bản cũ: số page, số kịch bản, số dòng Sổ AI đối chiếu bằng nhau
- Hệ thống cũ vẫn chạy bình thường

### L1 · Bốn cửa kết nối — 7–9 ngày

**Dùng lại:** `pancake.js` 269 · `pancake-orders.js` 219 · `botcake.js` 370 · `llm.js` 41
**Viết mới:** đọc sản phẩm và tồn kho từ POS · ghi ngược trạng thái đơn · cửa WhatsApp · lớp model đa nhà cung cấp

Cửa thứ tư — lớp model — phải làm ngay giai đoạn 1: định tuyến model theo team mà gắn sau thì phải sờ lại mọi lời gọi model. Và nó đóng lỗ đã xảy ra thật ngày 06/08.

Làm gì:
- **Cửa POS** — đọc đơn theo trạng thái, đọc danh mục sản phẩm và tồn kho, **ghi ngược trạng thái đơn** (việc chưa từng làm)
- **Cửa Pancake Messenger** — bọc code cũ, thêm định tuyến theo team
- **Cửa Pancake WhatsApp** — mới hoàn toàn, phụ thuộc điểm kiểm 1
- **Lớp model** — một giao diện chung, bốn bản cài; mỗi team chọn model chính, dự phòng, và model rẻ cho việc nền
- **Tự chuyển model dự phòng** khi nhà chính lỗi, và báo ngay
- **Đặt độ ngẫu nhiên** — hiện đang chạy mặc định nhà cung cấp
- Mỗi team một bộ khoá riêng

Nghiệm thu:
- Đọc được danh mục sản phẩm thật từ POS — **không còn đoán qua 25 đơn cũ**
- Đổi thử một đơn nháp sang Chờ in rồi trả về, POS ghi nhận đúng cả hai lần
- Gửi thử một tin WhatsApp qua API Pancake tới số nội bộ
- Đổi model của một team → lượt chat tiếp theo **đi đúng model mới**, không phải khởi động lại
- Rút khoá nhà chính → **tự chuyển dự phòng trong dưới 30 giây** và báo

### L2 · Chat Messenger — chốt sale — 5–7 ngày

**Dùng lại nguyên:** `closer.js` `prompts.js` `tools.js` `fast-lane.js` `outbound-guard.js` `classifier.js` `text.js` `context.js` — 1.962 dòng
**Viết lại:** `handler.js` · `pancake-poll.js` · `conv-owner.js` — đơn giản hơn nhiều vì Botcake đã tắt

Làm gì:
- Chuyển đường xử lý tin sang nền mới, hàng đợi thay vòng poll
- **Tắt Botcake trên 3 page thử**, bật lại hai lớp 0 đồng đang tắt
- Nhập **2 luật từ khoá** Botcake chưa phủ: nhận diện thật/giả, hỏi size
- Sửa lỗ `paano mag order` không bắt được
- **Tách prompt thành bốn khối riêng** trong code — chuẩn bị cho giai đoạn 2
- Bỏ trần 4 lượt cứng, thay bằng ngân sách theo độ nóng
- Đánh dấu **page trọng điểm** — bộ ca test rộng hơn, đo hằng ngày

Nghiệm thu:
- Khách nhắn → nhận trả lời **dưới 10 giây**, đo trên 50 lượt thật
- Không còn lượt nào bị Botcake chen ngang trên 3 page thử
- Lớp 0 đồng chặn **từ 33% lưu lượng trở lên**
- Chi phí mỗi tin không cao hơn 127 đ
- Chạy 7 ngày, so 3 page đối chứng: **đơn không giảm**

### L3 · Hai luồng đơn — 6–8 ngày

**Viết mới:** máy trạng thái hai nhánh · lọc trùng chéo hai luồng · chấm tỉ lệ hoàn · hàng đợi nhắc

Làm gì:
- Máy trạng thái **phân nhánh theo nguồn** đơn
- Chỉ đơn trang bán hàng vào luồng nhắn WhatsApp
- Lọc trùng **kiểm chéo cả hai luồng**
- Chấm tỉ lệ hoàn từ lịch sử POS, quét lại mỗi đêm
- Hàng đợi có hẹn giờ: nhắc mỗi 2 tiếng, tối đa 5 lần, huỷ khi khách trả lời
- Bốn nhánh đọc ý: xác nhận · hủy · đòi sửa · không rõ

Nghiệm thu:
- Đơn trang bán hàng không bấm gửi WhatsApp → bot nhắn **trong vòng 5 phút**
- Đơn Messenger **không hề nhận tin xác nhận nào**
- Khách xác nhận → đơn trên POS sang Chờ in
- Khách đặt trang bán hàng rồi chat Messenger cùng sản phẩm → **bị bắt là trùng**
- Ba lý do không gửi đếm đúng **trên riêng đơn trang bán hàng**
- Khách trả lời giữa chừng → lịch nhắc **bị huỷ ngay**

### L4 · Bảng điều phối cho sale — 4–5 ngày

**Viết mới:** toàn bộ màn hình.

Làm gì:
- Hai danh sách: hội thoại cần xử · đơn cần xử
- Mỗi dòng có **lý do bot đẩy sang** và đồng hồ đếm ngược 10 phút
- Màn chi tiết: đoạn chat + thông tin đơn + lý do
- Bấm là mở thẳng Pancake hoặc POS
- Xử xong chọn kết quả và lý do, có ô ghi chi phí khi đóng đơn
- Hàng chờ duyệt tạo đơn từ chat

Nghiệm thu:
- Sale ba ca liên tiếp dùng thật, **không mở dashboard cũ lần nào**
- Mọi cửa bot dừng đều có mặt trong danh sách
- Quá 10 phút chưa ai nhận → báo động
- Đơn duyệt từ hàng chờ vào POS đúng thông tin, không phải gõ lại

---

## Nền dữ liệu — 18 bảng

Mọi bảng có `team_id`, trừ ba bảng dùng chung.

| Bảng | Giữ gì | Đáng chú ý |
|---|---|---|
| `team` | Ba team | dùng chung |
| `nguoi_dung` `vai` `thanh_vien_team` | Người, vai, ai thuộc team nào | dùng chung · một người vào được nhiều team |
| `cau_hinh_model` | Model và khoá từng team | **mới** · chính, dự phòng, model nền · khoá mã hoá khi lưu |
| `page` | Sổ cái page | cờ `botcake_tat`, `bot_ai_bat`, `trong_diem` |
| `san_pham` `goi_gia` | Danh mục từ POS | tồn kho, cờ hết hàng tự tắt bot |
| `khach` | Hồ sơ khách | **số điện thoại là khoá nối** ba kênh · giữ tỉ lệ hoàn |
| `hoi_thoai` | Trạng thái hội thoại | ai đang làm chủ, đang ở bước nào |
| `so_ai` | Mọi hành động bot làm | **chỉ thêm, không sửa** · có token, mã kịch bản, **mã model** |
| `don_hang` | Đơn từ POS | cột **nguồn** — trang bán hàng hay Messenger |
| `viec_can_xu_ly` | Hàng chờ sale | lý do bị đẩy · mốc 10 phút · kết quả và lý do đóng |
| `hang_cho_tao_don` | Đơn bot chốt chờ duyệt | kết quả bốn cửa kiểm chống trùng |
| `kich_ban` | Kịch bản mọi tầng | ba tầng chung một bảng · giữ **cả bản cho người và bản cho máy** |
| `bo_luat_chung` `ky_nang` | Hai tầng prompt còn lại | **mới** · có phiên bản · kỹ năng có cột "bật cho nhóm sản phẩm nào" |
| `lich_nhac` | Hàng đợi có hẹn giờ | nhắc mỗi 2 tiếng · huỷ được |
| `nhat_ky` | Ai đổi gì lúc nào | không sửa không xoá · ghi cả việc máy làm |

Hai quyết định đáng nói:
- `don_hang` giữ **trạng thái riêng của hệ thống**, tách khỏi trạng thái POS — một đơn có thể đang "chờ khách trả lời" trong hệ thống mà trên POS vẫn là "chờ xác nhận"
- `so_ai` phải ghi **mã model** ngay từ đầu, nếu không sau này không so được model nào rẻ hơn thật

---

## Bốn điểm kiểm chặn — làm trong tuần 1

| # | Kiểm gì | Cách kiểm | Nếu sai |
|---|---|---|---|
| 1 | Gửi WhatsApp bằng API Pancake được không | Nối một số vào Pancake, gửi thử một tin *bằng API* | Quay lại tự dựng cổng, thêm ~1 tuần vào L1 |
| 2 | Pancake có đẩy tin về không | Đọc tài liệu webhook, thử đăng ký một điểm nhận | Giữ vòng hỏi, độ trễ 8–13 giây thay vì 6–10 |
| 3 | Botcake kéo về bao nhiêu khách từ bình luận | Vào Botcake đếm page bật Private Replies | Phải làm phần bình luận trước khi tắt quá 3 page |
| 4 | Marketing Message có bật cho Trung Đông không | Tạo chiến dịch 50 khách ở UAE, nộp duyệt | Nhánh nhắn hàng loạt Messenger đổi sang quảng cáo trả tiền |

---

## Việc làm song song — không chờ code

- **Nộp hồ sơ WhatsApp API trong Pancake** và soạn mẫu tin xác nhận gửi Meta duyệt — phần dài nhất
- **Mở tài khoản và lấy khoá bốn nhà model**, nạp ít tiền vào mỗi cái để chạy A/B được
- **Chạy thử 50 khách qua Messenger Marketing Message ở UAE** — điểm kiểm 4
- **Lấy khoá Botcake của 10 page đang chạy thật**
- **Gán marketer cho 314 page chưa có người phụ trách**
- **Chốt danh sách ba team**: sản phẩm nào, thị trường nào, ai là sale, ai là marketer
- **Lấy mã trạng thái đơn trên POS** và tên mục marketer phụ trách
- **Chọn 3 page thử và 3 page đối chứng** — cùng ngành, cùng mức quảng cáo
- **Chốt danh sách page trọng điểm**

---

## Nếu bắt buộc gói giai đoạn 1 trong một tháng

Cắt được hai thứ mà không hỏng luồng:
- **Lớp model chỉ làm một nhà cộng dự phòng**, bỏ phần so bốn nhà, lùi sang giai đoạn 2
- **L4 rút gọn còn một danh sách** thay vì hai

Không cắt được: nền dữ liệu, lớp team, hai luồng đơn. Cắt vào đó là phải làm lại.
