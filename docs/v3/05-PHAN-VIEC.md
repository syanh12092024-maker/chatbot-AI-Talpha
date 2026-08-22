# PHÂN VIỆC — HAI NGƯỜI

> Giai đoạn 1, năm luồng lõi. Chia theo **ranh giới file** và **ranh giới dữ liệu**,
> không chia theo giờ công — hai người sửa chung một file là xung đột chắc chắn.

---

## Nguyên tắc chia

**Người A giữ trục chính.** Mọi thứ một tin nhắn của khách đi qua: dữ liệu → cửa kết nối → chat → đơn hàng. Đây là đường găng, và cũng là chỗ sai thì hỏng nghiệp vụ.

**Người B giữ phần rìa.** Danh tính, nhật ký, lớp model, màn hình cho sale. Tách được khỏi trục chính, không chặn ai.

| | Người A | Người B |
|---|---|---|
| Khối lượng | **24 ngày công · 70%** | **10 ngày công · 30%** |
| Vai trò | Trục chính | Phần rìa |
| Đường găng | **Có** — quyết định lịch cả dự án | Không |
| Đụng bộ não chat | Có | Không |
| Đụng dữ liệu khách và đơn | Có | Không |

Ngoài ra, **tuần 1 người B làm bốn điểm kiểm chặn** (~3 ngày) — việc điều tra, không phải code, nhưng phải xong trước khi A đi tới L1.

---

## Bảng phân việc

### Người A — trục chính · 24 ngày

| Mã | Module | Ngày | Ghi chú |
|---|---|---:|---|
| L0-M1 | Lược đồ cơ sở dữ liệu + di trú dữ liệu thật | 2 | **Làm trước tiên.** B chờ cái này |
| L0-M2 | Tầng truy vấn có chèn điều kiện team | 2 | Nút cổ chai của L0 |
| L1-M1 | Cửa POS — đọc đơn, sản phẩm, tồn kho, **ghi ngược trạng thái** | 3 | Quyền ghi mới, sai là hỏng đơn thật |
| L1-M2 | Cửa Pancake Messenger | 2 | Bọc code cũ, thêm định tuyến team |
| L1-M3 | Cửa Pancake WhatsApp | 2 | Phụ thuộc điểm kiểm 1 của B |
| L2-M1 | Chuyển đường xử lý tin sang nền mới, hàng đợi thay vòng poll | 3 | |
| L2-M2 | Tắt Botcake 3 page, bật 2 lớp 0 đồng, nhập 2 luật từ khoá | 2 | Phụ thuộc điểm kiểm 3 của B |
| L2-M3 | Tách prompt bốn khối, ngân sách lượt theo độ nóng, cờ page trọng điểm | 1 | |
| L3-M1 | Máy trạng thái đơn **phân nhánh theo nguồn** | 3 | Phần nghiệp vụ khó nhất |
| L3-M2 | Lọc trùng chéo hai luồng + chấm tỉ lệ hoàn | 2 | |
| L3-M3 | Hàng đợi nhắc + bộ đọc ý khách bốn nhánh | 2 | |
| L3-M4 | Hàng chờ tạo đơn — luồng Messenger | 2 | |

### Người B — phần rìa · 10 ngày + 3 ngày điều tra

| Mã | Module | Ngày | Ghi chú |
|---|---|---:|---|
| — | **Bốn điểm kiểm chặn** | 3 | Tuần 1, làm ngay, không phải code |
| L1-M4 | Lớp model đa nhà cung cấp + dự phòng + đặt độ ngẫu nhiên | 3 | **Không cần chờ lược đồ** — làm song song tuần 1 |
| L0-M3 | Đăng nhập, chọn team, hai vai | 2 | Chờ L0-M1 của A |
| L0-M4 | Nhật ký thao tác | 1 | Bảng riêng, không ai đụng |
| L4-M1 | Bảng điều phối — hai danh sách + màn chi tiết | 3 | |
| L4-M2 | Đánh dấu đã xử, chọn kết quả và lý do | 1 | |

---

## Ranh giới file — không được đụng của nhau

| Người A | Người B |
|---|---|
| `db/schema.sql` · `db/migrate/*` | — |
| `src/db/*` | — |
| `src/pos/*` | — |
| `src/channels/messenger/*` | `src/channels/whatsapp/*` ⚠️ xem ghi chú |
| `src/chat/*` | — |
| `src/orders/*` | — |
| `src/queue/*` | — |
| — | `src/auth/*` |
| — | `src/audit/*` |
| — | `src/model/*` |
| — | `src/ui/dispatch/*` |
| `src/prompts.js` `src/closer.js` `src/tools.js` `src/fast-lane.js` `src/outbound-guard.js` | **cấm đụng** |

⚠️ **Cửa WhatsApp thuộc A** (L1-M3) nhưng phụ thuộc kết quả điểm kiểm 1 của B. B chỉ điều tra và báo kết quả, không viết code phần đó.

---

## Năm điểm bàn giao giữa hai người

Đây là chỗ hai người phải thống nhất trước, nếu không sẽ dẫm chân nhau.

| # | Cái gì | Ai làm | Ai dùng | Chốt khi nào |
|---|---|---|---|---|
| 1 | **Lược đồ cơ sở dữ liệu** | A · L0-M1 | B | Cuối ngày 2 — A công bố, B mới bắt đầu L0-M3 |
| 2 | **Tầng truy vấn** — hàm gọi và cách truyền bối cảnh team | A · L0-M2 | B | Cuối ngày 4 |
| 3 | **Bảng `viec_can_xu_ly`** — A ghi vào, B đọc ra hiển thị | A ghi · B đọc | cả hai | Chốt hình dạng bảng ở điểm 1 |
| 4 | **Lớp model** — hàm gọi model | B · L1-M4 | A | Cuối tuần 1 — A cần để chạy L2 |
| 5 | **Bối cảnh team** — sau đăng nhập, team đi vào tầng truy vấn thế nào | B · L0-M3 | A | Cuối ngày 6 |

**Điểm 1 và 4 là hai điểm chặn nhau.** A phải công bố lược đồ sớm, B phải xong lớp model trước khi A vào L2.

---

## Lịch theo tuần

| Tuần | Người A | Người B |
|---|---|---|
| 1 | L0-M1 lược đồ → L0-M2 tầng truy vấn | **4 điểm kiểm chặn** → L1-M4 lớp model |
| 2 | L1-M1 cửa POS → L1-M2 cửa Messenger | L0-M3 đăng nhập → L0-M4 nhật ký |
| 3 | L1-M3 cửa WhatsApp → L2-M1 chuyển đường xử lý tin | L4-M1 bảng điều phối |
| 4 | L2-M2 tắt Botcake → L2-M3 tách prompt → L3-M1 máy trạng thái | L4-M2 đánh dấu đã xử · hỗ trợ A |
| 5 | L3-M2 lọc trùng → L3-M3 hàng đợi nhắc → L3-M4 hàng chờ tạo đơn | Nghiệm thu, sửa lỗi |

Đường găng là A. B xong sớm hơn — tuần 4–5 B chuyển sang hỗ trợ nghiệm thu và sửa lỗi, hoặc bắt đầu chuẩn bị giai đoạn 2.

---

## Ba luật cả hai đều phải giữ

1. **Máy cá nhân không bao giờ gửi tin cho khách.** `.env` phải luôn có `PANCAKE_READONLY=1`.
2. **Không xoá đơn hàng POS** ở bất kỳ trạng thái nào.
3. **Chỉ thao tác trên repo này và máy chủ `169.58.33.8`.**

Thêm một luật của giai đoạn này:

4. **Không đụng vào bản đang chạy.** `src/` hiện tại đang phục vụ 51 page khách thật. Code v3 nằm ở thư mục mới. Nghiệm thu xong mới chuyển.
