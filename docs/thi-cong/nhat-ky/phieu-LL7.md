# Nhật ký phiếu LL7 — Ba vai (29/09/2026)

> CR-28-09c · làn 🟨 (quyền) · base `f5d61c4` · commit (xem git log `LL7`) · Đụng bộ não: không.

## Đo trước khi code

- Hai mã vai sắp bỏ (`quan-ly` · `duyet-kich-ban`) được nhắc ở **37 tệp mã** (64 chỗ) và **21 tệp ca** — nhiều ca canh
  luật riêng của vai quản lý («đi kiểm, không đi làm»).
- Prod (lớp 5 của CR, 28/09): gán vai 3 dòng, cả 3 là quản trị ⇒ **0 người** mang hai vai cũ.
- Hợp đồng lược đồ (vừa áp, `luoc-do-v1.md`): «`quan-ly` · `duyet-kich-ban` thôi gán, dòng giữ».

## Chọn gì thay gì (luật 13)

Làm đúng câu hợp đồng — CHẶN CẤP MỚI ở cửa cấp vai — thay vì dọn 37 tệp danh sách quyền trong phiếu này. Lý do: danh
sách quyền còn nhắc mã cũ là vô hại khi 0 người mang, còn dọn chúng đòi viết lại ~20 tệp ca (luật quản lý đọc-không-
ghi…) — việc của LL9 (thước), cùng lượt viết lại `phan-quyen-nam-vai`. Giá: tới LL9 mã vẫn «biết» năm vai; nếu ai đó
SQL tay cấp vai cũ thì người đó vẫn vào được theo luật cũ.

## Làm gì

`auth/boi-canh.js#VAI_GAN_DUOC` · `team/thanh-vien.js#traVai`: tra bảng (không có ⇒ `vai_la`), có mà là vai bỏ ⇒
`vai_da_bo` — dùng chung cho thêm thành viên và tạo người dùng · `team/kho-team.js#danhSachVai`: ô chọn chỉ ba vai;
`TEN_VAI` giữ tên hai mã cũ để dòng cấp cũ hiện đúng chữ.

## Bộ ca — `v3/test/b/ll7-ba-vai.test.mjs` R1–R3

Ba vai đúng thứ tự · cấp vai cũ ⇒ `vai_da_bo` ở cả hai cửa, mã gõ nhầm vẫn `vai_la`, vai còn cấp thì được · ô chọn
ba vai (so tập), người mang vai cũ vẫn hiện «Quản lý». Lượt đầu ca `team-cau-hinh` «mã vai lạ» đỏ (kiểm vai bỏ
TRƯỚC khi tra bảng ⇒ `quan_tri` gõ nhầm ra `vai_da_bo`) — sửa thứ tự, không sửa ca.

## Đảo-vá — 4/4 ĐỎ

M1 cho cấp lại quản lý → R1 R2 R3 · M2 bỏ rào vai bỏ → R2 · M3 ô chọn đủ năm vai → R3 · M4 lọc mất dòng cấp cũ khi hiện → R3.

## Nghiệm thu

Cổng `ops/bin/nghiem-thu/ll7.sh`: **ĐỎ 0 / XANH 4**. `npm test` (dev 29/09): **2.270 ca · 0 đỏ · 4 bỏ qua**.
