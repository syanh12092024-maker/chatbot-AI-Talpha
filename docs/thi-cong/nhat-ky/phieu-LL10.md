# Nhật ký phiếu LL10 — Nhà của việc vận hành (29/09/2026)

> CR-28-09c · làn 🟨 · base `f8ac034` · commit `1e5ce30` · Đụng bộ não: không.

## Đo trước khi code

- Màn «Hội thoại và đơn» (`van-hanh`, script ~760 dòng) giữ bảy tab: Diễn tập · Page & trạng thái (nguồn nhận
  tin, quản trị) · Sản phẩm & giá (quản trị) · Đơn chờ duyệt · Hội thoại (có nút «Đã đối chiếu, bàn giao sale»
  cho tin lỗi) · Chi phí theo tin · Tin bị lọc. Duyệt đơn của sale đã có nhà ở Hộp thư (LL2).
- Hai màn khác trỏ «Nhập giá bán» về `/van-hanh-v3` (tab Sản phẩm & giá); trang một page đã có liên kết
  `/van-hanh-v3?tab=dien-tap&page=…` — nhưng màn **không đọc `?tab=`** (liên kết mở tab mặc định, đúng lúc trùng).

## Chọn gì thay gì (luật 13) — LỆCH CR có chủ ý

CR ghi nhà mới rải ba chỗ (Hệ còn sống: tin lỗi · tin bị lọc · diễn tập; Số liệu: chi phí từng tin; Page: nguồn
nhận tin). Chọn: màn giữ nguyên các tab, đổi thành **Cài đặt › Vận hành** (một tab của cụm Cài đặt), và ba chỗ ấy
trỏ THẲNG vào đúng tab bằng `?tab=`. Lý do: bê năm việc là port ~300 dòng giao diện đang có thước riêng; tab
«Sản phẩm & giá» còn là đích của nút «Nhập giá bán» ở hai màn. Giá: người dùng mở việc vận hành ở một màn riêng
chứ không ngay trong Hệ còn sống/Chi phí; LL8 sẽ quyết có gỡ tab Đơn chờ duyệt/Sản phẩm & giá khỏi màn này không.

## Làm gì

1. `man-hinh.js`: `van-hanh` rời Hộp thư → cụm Cài đặt, tab «Vận hành» sau «Hệ còn sống»; tên + đầu trang «Vận hành».
2. `van-hanh.js`: đọc `?tab=` (tab phải có trong bảng; «pages»/«products» chỉ cho quản trị), đánh dấu tab đang mở.
3. Liên kết thẳng: Hệ còn sống (tin lỗi → `conversations` · tin bị lọc → `bo-qua` · diễn tập → `dien-tap`) ·
   Chi phí AI (`chi-phi-tin`) · trang một page › Thiết lập (`pages`).

## Bộ ca — `v3/test/b/ll10-van-hanh.test.mjs` V1–V3

Chỗ ngồi + tên khớp đầu trang, không còn ở Hộp thư · `?tab=` đọc, kiểm hợp lệ, kiểm vai · mọi liên kết
`/van-hanh-v3?tab=` trong giao diện trỏ vào tab CÓ THẬT (bảng tab đọc từ mã) và đủ năm lối vào.
Thước sửa: `dieu-huong` ④c 10 → 9 · `ll1` N4 · `ll6` K1.

## Đảo-vá — 5/5 ĐỎ

M1 Vận hành về Hộp thư → V1 · M2 liên kết trỏ tab không có → V3 · M3 bỏ đọc `?tab=` → V2 (lượt đầu script đảo-vá
áp HỤT vì sai dấu nháy — đọc «sống» là lỗi của thước đảo-vá, chạy lại đúng chuỗi ⇒ đỏ) · M4 tab quản trị mở mọi vai
→ V2 · M5 Hệ còn sống bỏ lối vào tin bị lọc → V3.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ll10.sh`: **ĐỎ 0 / XANH 7** (kèm e2e van-hanh 8/8 và ll13 → các cổng trước).
- `npm test` (dev 29/09): lượt đầu 1 đỏ — G6 `l0-m2-gop-cua-hep` (hai mốc `sua_luc` trùng mili giây; không đụng mã
  LL10; chạy riêng 3/3 xanh — nợ §9 N-CADUNGCHUNG); lượt hai **2.264 ca · 0 đỏ · 4 bỏ qua**.
