# TIẾN ĐỘ

> Cập nhật sau mỗi module xong. Đây là chỗ người khác đọc để biết đang ở đâu mà không phải hỏi.

---

## Trạng thái chung

| | |
|---|---|
| Giai đoạn | 1 — năm luồng lõi |
| Luồng đang làm | **Phần rìa (người B) đang chạy** — trục chính (người A) chưa bắt đầu |
| Bốn điểm kiểm chặn | **đã đo xong**, kết quả bên dưới |
| Nhánh code v3 | `v3/vai-b` · code nằm ở thư mục `v3/`, **không đụng `src/` đang chạy** |

---

## Bốn điểm kiểm chặn

Người B đo ngày 22/08/2026, **chạy trên máy chủ 169.58.33.8**, mọi lời gọi **chỉ đọc**.
Chi tiết, số đo, giới hạn phép đo và bộ dò để chạy lại: **`v3/docs/kiem-chan/ket-qua.md`**.

| # | Kiểm gì | Trạng thái | Kết quả |
|---|---|---|---|
| 1 | Gửi WhatsApp bằng API Pancake được không | **treo — thiếu điều kiện để thử** | Tài khoản Pancake có **1.371 page, 100% `platform:"facebook"`**, **không có kênh WhatsApp nào**. Nút chặn là **thủ tục** (WABA + đăng ký số + nối vào Pancake + duyệt mẫu tin), không phải API. Ba việc đó chưa việc nào bắt đầu |
| 2 | Pancake có đẩy tin về không | **không tìm thấy** | Sáu đường webhook ứng viên đều `406`, trong khi `conversations`/`tags` cùng token trả `200` → đường không tồn tại, không phải lỗi quyền. **Giữ vòng hỏi**, độ trễ 8–13 s. Đo thật: một vòng hỏi 317–831 ms. Còn phải hỏi lại hỗ trợ Pancake cho chắc |
| 3 | Botcake kéo bao nhiêu khách từ bình luận | **xong, có số** | **11,3% luồng hội thoại**. 7 ngày trên 47 page: **199 hội thoại bình luận** (~28/ngày) trên tổng 1.768; **82,5%** đã được nhắn riêng → **~23 hội thoại/ngày** do trả lời bình luận đẻ ra |
| 4 | Marketing Message có bật cho Trung Đông không | **treo — lý do nặng hơn** | **App Meta đang bị chặn API hoàn toàn**: `graph.facebook.com/me` → `400 "API access blocked"`. Không tạo được chiến dịch để nộp duyệt. Không ảnh hưởng giai đoạn 1 (đi qua Pancake) |

### Ba việc phải làm ngay, không phải việc code

1. **WhatsApp** — mở WhatsApp Business Account, đăng ký số vào WABA, nối vào Pancake, soạn
   mẫu tin xác nhận đơn gửi Meta duyệt. Đây là đường dài nhất và nằm ngoài tầm kỹ thuật.
   Chưa xong thì **L1-M3 của người A chưa mở được** — làm L1-M1, L1-M2 trước.
2. **Meta** — vào `developers.facebook.com` xem app bị chặn vì lý do gì và kháng nghị.
3. **Botcake** — lấy khoá của 10 page thật (hiện chỉ có **1 khoá**, của page nháp).

### Một việc cần chủ dự án quyết

Tắt Botcake trên **3 page thử** thì chỉ mất ~1,5 hội thoại/ngày — cứ chạy. Nhưng tắt **diện
rộng** thì mất khoảng một phần chín nguồn khách, nên phải có phần **trả lời bình luận**
trước. Màn đó đã vẽ (`03-MAN-HINH.md` nhóm 2) nhưng **nằm ở giai đoạn 3**. Muốn tắt rộng
trong giai đoạn 1 thì phải kéo nó vào — đây là đổi phạm vi, không phải việc code quyết được.

---

## Năm luồng

| Luồng | Ước lượng | Trạng thái | Module xong |
|---|---|---|---|
| L0 · Nền dữ liệu, team, đăng nhập | 5–7 ngày | **phần của B xong** — M1, M2 chờ người A | 2/4 (M3, M4) |
| L1 · Bốn cửa kết nối | 7–9 ngày | **lớp model xong** — ba cửa kia của người A | 1/4 (M4) |
| L2 · Chat Messenger | 5–7 ngày | chưa bắt đầu — của người A | 0 |
| L3 · Hai luồng đơn | 6–8 ngày | chưa bắt đầu — của người A | 0 |
| L4 · Bảng điều phối | 4–5 ngày | **xong** | 2/2 |

---

## Sổ module

| Mã | Module | Ai | Ngày xong | Nghiệm thu | Vướng |
|---|---|---|---|---|---|
| — | Nền vai B: bối cảnh team, cổng dữ liệu giả, hợp đồng với A | B | 22/08 | 410 test xanh | Lược đồ và tầng truy vấn của A chưa có → B code theo cổng tiêm từ ngoài, chạy test bằng bản cài giả |
| L0-M4 | Nhật ký thao tác | B | 22/08 | 22 bài của module xanh; kiểm tay 5 ca | Cấm sửa/xoá ở tầng dưới là **quyền cơ sở dữ liệu** — đã ghi thành yêu cầu cho A |
| L1-M4a | Lõi lớp model — 4 nhà, độ ngẫu nhiên, quy giá | B | 22/08 | 505 test xanh; bảng giá khớp `01-QUYET-DINH` mục 7, lệch ≤0,65% | Ba model chưa mở tài khoản có **đơn giá suy ngược**, phải thay bằng giá công bố |
| L0-M3 | Đăng nhập, chọn team, hai vai | B | 22/08 | 505 test xanh; kiểm tay ca xuyên team và ca lộ tài khoản | Dùng **vé ký HMAC** thay bảng phiên — 18 bảng không có bảng phiên, thêm là đổi lược đồ của A |
| L1-M4b+c | Cấu hình model theo team, kho khoá, dự phòng | B | 22/08 | xem `docs/v3/SO-TAY-VAI-B.md` | |
| L4-M1 | Bảng điều phối — hai danh sách, màn chi tiết | B | 22/08 | xem `docs/v3/SO-TAY-VAI-B.md` | Mẫu đường POS chưa ai mở bằng mắt → để vào biến môi trường |
| L4-M2 | Đánh dấu đã xử, chọn kết quả và lý do | B | 22/08 | xem `docs/v3/SO-TAY-VAI-B.md` | Danh sách **kết quả và lý do** tài liệu chưa chốt → B đề xuất, cần chủ dự án duyệt |

Chi tiết mọi chỗ tự quyết: **`docs/v3/SO-TAY-VAI-B.md`**.

---

## Việc làm song song — không chờ code

| Việc | Trạng thái |
|---|---|
| Nộp hồ sơ WhatsApp API trong Pancake, soạn mẫu tin gửi Meta duyệt | **chưa làm — nay là đường găng của L1-M3**, xem điểm kiểm 1 |
| Mở tài khoản và lấy khoá bốn nhà model | chưa làm — lớp model đã sẵn sàng nhận khoá, ba model đang dùng **giá suy ngược** |
| Chạy thử 50 khách Messenger Marketing Message ở UAE | **không làm được** — app Meta bị chặn API, xem điểm kiểm 4 |
| Lấy khoá Botcake của 10 page đang chạy thật | **chưa làm — hiện chỉ có 1 khoá**, của page nháp |
| Gán marketer cho 314 page chưa có người phụ trách | chưa làm |
| Chốt danh sách ba team | chưa làm |
| Lấy mã trạng thái đơn trên POS và tên mục marketer | chưa làm |
| Chọn 3 page thử và 3 page đối chứng | chưa làm |
| Chốt danh sách page trọng điểm | chưa làm |
