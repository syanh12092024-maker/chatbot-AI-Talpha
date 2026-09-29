# Nhật ký phiếu LL6 — Cài đặt một dòng, sáu tab · Model một khung nói đúng (29/09/2026)

> CR-28-09c · làn 🟩 · base `0ac5df2` · commit `4cefa72` · Đụng bộ não: không.

## Đo trước khi code

- Đích Cài đặt (sau LL1): sáu dòng thanh bên (Cài đặt team · Người và team · Kết nối · Model AI & khoá · Hệ còn
  sống không · Ai đã sửa gì).
- Màn Model hứa hơn máy làm (đo mã 29/09): `layModel` được gọi ở `src/chat/handler-v3.js` với `vaiTro: "chinh"` và
  ở `src/admin-v3/operations.js` với mặc định (chính) — KHÔNG nơi nào đọc `du_phong`/`nen`; `goiCoDuPhong`
  không nằm trên đường chat. Chữ màn: dự phòng «Chạy khi nhà chính hỏng…», nền «Phân loại, tóm tắt» — thì hiện tại.

## Làm gì

1. Cụm `cai-dat`, thứ tự bản vẽ: Bắt đầu · Kết nối · Model · Hệ còn sống · Người và team · Nhật ký.
2. `kho-model.js#DUONG_DUNG_VAI_TRO` + trả `duongDung`; trang gắn huy hiệu + câu từng vai; lời giải thích dự
   phòng/nền đổi «Dành cho…»; độ ngẫu nhiên chính ghi «Bot v3 gửi số này; bot cũ không gửi».
   Chọn GIỮ ba hàng (không ẩn hàng nền như bản vẽ): nút Lưu gửi cả ba ô — ẩn hàng là đổi hợp đồng lưu, ngoài
   phạm vi; huy hiệu «Chưa việc nào dùng» nói đủ điều cần nói. Ẩn hàng nền để LL14.
3. `kieu.css`: thanh tab cụm đặt lại `grid-row · justify-self · gap` — **ảnh chụp bắt lỗi**: đầu trang có `.sp`
   (Model, Nguồn khách của LL5) thì quy tắc «sau `.sp` là phần phải» đẩy thanh tab lên góc phải, đè huy hiệu.

## Bộ ca — `v3/test/b/ll6-cai-dat.test.mjs` K1–K3

Sáu tab đúng thứ tự · **K2 đo bảng «đường dùng» trên MÃ** (mọi `layModel(` ở hai tệp chạy chỉ vai chính; không
tệp nào trong `src/` · `v3/src/` gọi vai dự phòng/nền; `src/chat/model.js` không dùng `goiCoDuPhong`) · lời giải
thích không hứa thì hiện tại, trang vẽ ba trạng thái. `ll3-cum` C5 siết thêm đòi đặt lại `grid-row/justify-self`.
Thước sửa: `dieu-huong` ④c 15 → 10 thanh bên, 12 → 17 ẩn.

## Đảo-vá — 6/6 ĐỎ

M1 đường chat đọc vai dự phòng (giả lập LL14 quên sửa bảng) → K2 · M2 bảng nói dự phòng đang dùng → K2 · M3 lời
giải thích hứa lại → K3 · M4 trang bỏ trạng thái hàng nền → K3 · M5 đảo/bỏ tab → K1 · M6 kho không trả `duongDung` → K3.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ll6.sh`: **ĐỎ 0 / XANH 7**. `npm test` (dev 29/09): **2.248 ca · 0 đỏ · 4 bỏ qua**.
- Chụp bản xem thử `/model-ai` (sau sửa CSS): tab một hàng dưới đầu trang, huy hiệu «Chưa cấu hình» về góc phải;
  ba vai mang «Đang dùng» · «Chưa nối» · «Chưa việc nào dùng». `/cai-dat-team` tab «Bắt đầu*». 0 lỗi JS.

## Chưa làm / để sau

- Nối dự phòng vào đường chat, ẩn hàng «việc nền» tới khi có việc dùng: LL14 (K2 sẽ đỏ đúng lúc đó).
- Tab «Kết nối» chưa có HRM (LL15) và bảng shop POS theo bản vẽ (LL16/LL17).
