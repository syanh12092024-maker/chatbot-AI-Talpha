# Nhật ký phiếu LL3 — Đích Page: cụm «Tất cả page» + «Luật chung» (29/09/2026)

> CR-28-09c · làn 🟨 · base `6303c10` · commit `cb622a6` · Đụng bộ não: không.

## Đo trước khi code

- Đích Page (sau LL1) có năm dòng thanh bên cho quản trị: Tất cả page · Kịch bản của page · Quy tắc chung mọi
  page · Câu trả lời sẵn · (ít dùng) — cùng một việc «bot nói gì» rải năm chỗ.
- Mười màn liên quan (page-bot 1.599 dòng · bo-luat 1.006 · kich-ban 1.077 · lop-0-dong 595 · mot-page 1.371 …)
  là trang HTML riêng, mỗi trang có script riêng. MN6 vừa dựng trang một page ba tab (Tình trạng · Thiết lập ·
  Bot trả lời thế nào); Chính sách/FAQ/Phản đối (MN7) là khối ④ trong trang đó, không phải màn riêng.
- Bản vẽ dùng THANH TAB CON cho một đích nhiều trang (Số liệu: Tổng quan · Chi phí · Khách; Luật chung: Luật ·
  Chính sách/FAQ/Phản đối · Trả lời sẵn · Đề xuất).

## Chọn gì thay gì (luật 13)

Chọn gộp ở TẦNG ĐIỀU HƯỚNG (cụm + tab do khung vẽ) thay vì viết lại từng trang thành tab trong một trang.
Lý do: gộp nội dung là viết lại ~4.000 dòng giao diện đang chạy, mỗi trang có luật và thước riêng; cụm cho đúng
hình dạng của bản vẽ (một chỗ · nhiều tab) mà không đường nào đổi, không trang nào mất. Giá: mỗi tab vẫn là một
lần tải trang; đầu trang của màn giữ tên màn (HK10) nên thanh bên ghi «Luật chung» mà đầu trang ghi «Quy tắc
chung mọi page» — đường dẫn vị trí nối hai tên («Page / Luật chung / Quy tắc chung mọi page»).

## Làm gì

1. `man-hinh.js`: `CUM` (danh-sach-page · luat-chung) + `trongCum(cum, nhãn tab, dat(...))`. `menuCua`: màn hiện
   được đầu tiên của cụm lên thanh bên; tên cụm CHỈ khi nó là đầu cụm CHUẨN; màn còn lại `an` + `trongCum`.
   Màn `thuNghiem`/`canId` giữ luật cũ (Đề xuất chờ duyệt còn 0 đề xuất ⇒ chưa lên tab).
2. `dieu-huong.js`: thanh bên dùng tên cụm; thanh tab `<nav class="tabs" data-cum>` chèn vào cuối `body > header`
   (tab là liên kết, `aria-current`); đường dẫn vị trí thêm tầng cụm, bỏ tầng khi trùng tên («Tất cả page»).
3. `kieu.css`: thanh tab cụm trải hết lưới đầu trang, đè lên vạch dưới đầu trang.

## Bộ ca — `v3/test/b/ll3-cum.test.mjs` C1–C5

Sổ cụm tự nhất quán · Page của quản trị hai dòng, tab đúng · marketer/duyệt kịch bản thấy đúng tên màn · với MỌI
vai (thanh bên ∪ tab) ⊇ màn mở được (không màn nào mất đường vào) · khung đọc `trongCum`/`tenMenu`, hệ kiểu có
quy tắc đặt chỗ, mọi màn trong cụm có `<header>` (dò đường qua `DUONG_TRANG`, không lặng lẽ bỏ qua).
Thước sửa theo luật mới: `dieu-huong` ④c (thanh bên 18 → 16, ẩn 9 → 11) · `ll1` N5 và cổng `ll1.sh` ⑤ đo «tới
được» = thanh bên ∪ tab (vẫn 18) — luật LL1 là không mất đường vào, không phải số dòng.

## Đảo-vá — 7/7 ĐỎ

M1 bỏ cụm → ④c C2 C3 · M2 tên cụm lên mọi đầu cụm → C3 · M3 màn trong cụm mất cờ tab → C2 C4 N5 · M4 thanh bên bỏ
tên cụm → C5 · **M5 gỡ quy tắc đặt chỗ → SỐNG lượt đầu** (thước tìm chuỗi `.tabs[data-cum]` còn ở quy tắc màu) ⇒
siết C5 đòi đúng `{ grid-column: 1 / -1;` ⇒ ĐỎ · M6 cụm không khai → C1 C2 C3 · M7 khung bỏ `trongCum` → C5.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ll3.sh`: **ĐỎ 0 / XANH 7** (kèm ll1 · ll2 · UI-HT).
- `npm test` (dev 29/09): **2.239 ca · 2.235 đạt · 0 đỏ · 4 bỏ qua**.
- Chụp bản xem thử (dữ liệu giả, Chromium qua DevTools): `/bo-luat` tab «Luật*» · «Trả lời sẵn», đường dẫn «Page /
  Luật chung / Quy tắc chung mọi page»; `/lop-0-dong` tab «Trả lời sẵn*»; `/page-bot` tab «Tất cả page*» ·
  «Kịch bản». 0 lỗi JS. Tầm đo của C5 là HÌNH DẠNG mã khung (án lệ 30) — bằng chứng vẽ thật là ảnh chụp này.

## Chưa làm / để sau

- «AI đọc gì» (prompt-page) và «Ảnh gửi khách» vẫn là màn riêng ẩn — gộp vào trang một page ở LL8.
- Trả lời sẵn một kho (gộp Fast Lane mẫu · kho luật · mau_0_dong) là LL12.
