# NHẬT KÝ PHIẾU UI-HT2 — màn «Bàn hội thoại» (28/09/2026)

Phiếu: `docs/thi-cong/phieu/PHIEU-UI-HT2-4.md` · CR-28-09 · làn 🟩. Bản dựng đã duyệt: https://claude.ai/artifact/LJcDVTN8GZPyWEtxZnF2yh

## Đo trước khi code — máy chủ, chỉ đọc

| Đo | Kết quả | Hệ quả |
|---|---|---|
| Hội thoại theo team | tieu-alpha **28.953**, ba team kia 0 | Mọi hội thoại nằm ở một team |
| Kéo cả bảng hội thoại của team | **19,6 MB**, **440 ms** riêng Postgres | Không được kéo mỗi lần bấm tab |
| Cổng dữ liệu thật | KHÔNG có LIMIT; phép so khoảng lọc ở JS (`cong-du-lieu-that.js` ②·③b) | «7 ngày qua cổng» = kéo cả bảng |
| Việc đang mở | 0 | Tab «Cần người» rỗng trên máy chủ hôm nay |
| `cham_luc` mới nhất | tháng 8 (bot im từ 28/08) | «Bot đang xử»/«Tất cả» rỗng ⇒ màn phải nói ra, chỉ lối tìm |

## Làm gì

- Module `v3/src/ui/ban-hoi-thoai/`: `kho-ban-hoi-thoai.js` (ba lát + tìm), `router.js` (`/ban-hoi-thoai`, `/api/ban-hoi-thoai`, vai = bảng điều phối), `index.js`, `trang/ban-hoi-thoai.html` (không CSS riêng).
- «Cần người» đi qua `hangCho` của điều phối (không công thức thứ hai). «Bot đang xử»/«Tất cả»/tìm: SQL có LIMIT (`taoDocHoiThoaiSql(pool)`, `team_id = $1` từ bối cảnh), tiêm từ `chay-that.js`; không tiêm thì lùi về cổng và khai `nguonDs`.
- Khung chat dùng UI-HT1; thêm `pancake` vào kết quả đọc để hội thoại KHÔNG có việc mở vẫn có nút «Trả lời trên Pancake».
- Nhận/đóng việc: dùng lại `dong-viec-ui.js` (một bản cho mọi trang ghi việc).
- Menu: «Bàn hội thoại» đứng sau «Việc của tôi»; «Việc đang chờ» GIỮ (đường lùi của CR).
- `kieu.css`: khối BÀN HỘI THOẠI (ba cột, bong bóng, dòng hội thoại, ≤1180px cột bối cảnh thành ngăn phủ, ≤760px một cột).

## Soát bằng mắt (bản xem thử, 1440 và 390px) — ba lỗi bắt được và đã sửa

1. Hàng nút dưới khung chat bị cắt ở 900px cao (trừ đầu trang 66px, thật ~84px).
2. Khối «Hội thoại» rỗng vẫn hiện tiêu đề.
3. **≤1180px cột bối cảnh ẩn hẳn ⇒ sale trên máy tính bảng/điện thoại KHÔNG nhận/đóng việc được.** Nay có nút «Khách & đóng việc» mở ngăn phủ (Esc / × để đóng). Đo: 8 nút thao tác hiện trên 390px.

## Thước đổi theo §10 mới (án lệ 27)

`dieu-huong.test.mjs` ②a · ④d (sale thấy «Bàn hội thoại» + «Việc đang chờ»), ④c (thanh bên 16 → 17), `phan-quyen-nam-vai.test.mjs` §9 (màn của sale = điều phối + bàn hội thoại), `he-kieu.test.mjs` HK15 (+ màn mới), `vai-b-noi-day` (+ `docHoiThoaiSql`). Điều canh giữ nguyên: sale không vào màn quản trị nào.

## Kiểm

- `ban-hoi-thoai-ds.test.mjs` 7/7 (ba lát · tìm không lọt team khác cùng SĐT · SQL được dùng khi tiêm · lát lạ 400 · HTTP 401/403/200 · trang không ô soạn).
- `test/ui-ht2-sql.test.js` 4/4 trên Postgres sandbox (`aicloser_v3_test_uiht2`, tự dựng tự dọn).
- v3 918/918 · `npm test` 2.136/0 (đo lúc nộp).
- Đảo-vá 6 đột biến: bỏ kẹp team SQL → 3 đỏ · bỏ cửa sổ ngày → 4 · bỏ lọc chỉ-bot → 1 · không gắn việc → 2 · bỏ đếm đơn không hội thoại → 1 · **bỏ kẹp team ở phép tìm SĐT → 0 đỏ**: không phải lỗ — `h.team_id = $1` bên ngoài đã chặn (N1 chứng minh); lớp trong chỉ là phòng thủ thứ hai, không quan sát được.
- Cổng `ops/bin/nghiem-thu/ui-ht2.sh` 8/8.

## Nợ

- Tin của page trong khung chat hiện «Page» — Pancake không nói tin nào do bot, tin nào do sale gõ. Tách được khi ghép với Sổ AI (UI-HT3 hoặc phiếu sau).
- Tìm theo TÊN khách chưa có (cần tìm mờ — không đẩy xuống cổng được); hôm nay tìm theo SĐT/psid.
- Chưa đo trên máy chủ thật (cần deploy).
