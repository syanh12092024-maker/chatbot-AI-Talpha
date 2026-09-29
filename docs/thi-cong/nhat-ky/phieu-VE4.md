# Nhật ký phiếu VE4 — Luật chung theo bản vẽ 2d (29/09/2026)

> CR-28-09c · làn 🟨 (ba khối đổi lời bot ở MỌI page — cửa ghi giữ nguyên, thêm cửa đọc) · base `0d0a7a8` · commit
> `083c9de` · Đụng bộ não: không.

## Đo trước khi code

- Bản vẽ 2d: «Luật chung» = bốn tab **Luật · Chính sách/FAQ/Phản đối · Trả lời sẵn · Đề xuất chờ duyệt**.
- Hôm nay (sau LL3): cụm có 2 tab (Luật · Trả lời sẵn). «Gợi ý từ AI» (`/ai-de-xuat`) còn cờ `thuNghiem` nên không lên tab.
  Ba khối Chính sách/FAQ/Phản đối (MN7) chỉ SỬA được trong trang một page — một khối cả team, sửa ở trang của một page.
- Cửa ghi MN7 `POST /api/anh-san-pham/khoi-chung` đã đủ luật (giữ bộ khối · phiên bản chống đè · đẩy bot rồi đọc lại ·
  nhật ký, một giao dịch). **Chưa có cửa ĐỌC riêng** — trang một page đọc ba khối lẫn trong gói nội dung của page.

## Làm gì — và chọn gì thay gì

1. Cửa đọc `GET /api/anh-san-pham/khoi-chung` đặt CÙNG router với cửa ghi (hưởng cùng rào: đăng nhập · quản trị/marketer
   · X-V3-Action · chặn cross-site). Trả thêm `giu {ok, viSao}` — chọn nói trước «team này không sửa được» thay vì để
   người ta gõ xong bấm lưu mới nhận 403/409. Team lấy từ PHIÊN (`q.boiCanh.teamId`), không từ yêu cầu.
2. Màn mới `/khoi-chung` (`v3/src/ui/khoi-chung/`) chỉ phục vụ trang; KHÔNG cửa API riêng. Vai `VAI_VAO_DUOC` = đúng
   `VAI_SUA_SAN_PHAM` của router-anh — ca Q2 canh hai danh sách không lệch.
3. Sổ màn: `trongCum('luat-chung', 'Chính sách · FAQ · Phản đối', …)` đứng giữa Luật và Trả lời sẵn (thứ tự bản vẽ);
   «Gợi ý từ AI» bỏ `thuNghiem` ⇒ tab «Đề xuất chờ duyệt». Màn này đã nói rỗng đúng («Chưa có đề xuất nào đang chờ») —
   đề xuất thật tới khi có BH5; không bịa hàng mẫu.
4. Trang một page › Lời bot: bỏ trình sửa, còn tóm tắt (số dòng mỗi khối · bản) + `<a href="/khoi-chung">` — MỘT chỗ sửa.
5. Bảng sửa từng dòng: `.data-table.bang-sua` (ô ngắn đứng đầu hàng, cột đầu 30%) trong `@layer ds-phan` — HK15.

**Giả định ghi rõ:** marketer mở được màn (cùng vai với cửa ghi MN7 đã ký). Marketer không vào được «Luật» nên dòng hai
thanh bên của marketer nay mang tên «Chính sách · FAQ · Phản đối» (trước: «Câu trả lời sẵn») — hệ quả đúng luật LL3
(màn đầu tiên marketer mở được trong cụm).

## Thước sửa theo luật mới (án lệ #27) — khai tường minh, không nới

- `dieu-huong` ④c: ẩn 19→20 (+1 màn trong cụm; «Gợi ý từ AI» chuyển từ «chưa dùng được» sang «trong cụm»), `thuNghiem` 6→5.
- `ll3-cum` C2 (4 tab) · C3 (dòng hai marketer) · cổng `ll3.sh` ④ (cùng chuỗi).
- `ll1-nam-dich` N3/N4: danh sách đường = bản chụp trước LL1 + `DUONG_THEM` có mã phiếu; N5 `THEM_CO_CHU_Y` thêm 2 dòng.
- `ll18-khung` K1 (4 tab) · `he-kieu` HK15 thêm màn mới · `ve2-mot-page` P4 (lối sang thay đường ghi).

## Bộ ca

- `test/ve4-khoi-chung.test.mjs` (Postgres THẬT, sandbox riêng): K1 marketer đọc đúng team + phiên bản + `giu.ok` · K2 thiếu
  X-V3-Action / vai sale ⇒ 403 · K3 team không giữ ⇒ `giu.ok=false` + lý do; **chỉ tên team kia qua `?team=`/`X-Team-Id`
  vẫn không đọc chéo được** · K4 khứ hồi đọc → ghi qua cửa cũ → đọc lại bản mới.
- `v3/test/b/ve4-luat-chung.test.mjs` Q1–Q4: bốn tab đúng thứ tự + marketer hai tab · cùng vai · trang lưu CHỜ xác nhận +
  gửi phiên bản + khoá khi không giữ + không CSS riêng · trang một page không còn đường ghi khối chung.

## Đảo-vá — 8/8 đỏ, mỗi đột biến một tiến trình mới, khôi phục khớp băm

M1 cửa đọc luôn «giữ» (K3) · M2 lưu không chờ xác nhận · M3 bỏ phiên bản · M4 không giữ vẫn mở ô · M5 màn mở cho sale ·
M6 Đề xuất quay lại thử nghiệm · M7 mất lối sang (Q1–Q4) · **M8 cửa đọc lấy team từ query** — lượt đầu SỐNG (không ca nào
thử đọc chéo bằng tham số) ⇒ thêm ca vào K3, lượt sau đỏ (fail=2).

## Đo

- Cổng `ops/bin/nghiem-thu/ve4.sh`: ĐỎ 0 / XANH 10 (kèm chuỗi ve3 → ve2 → ve1 → ll18). Lượt đầu đỏ ở ④ vì `ll3.sh` còn
  neo dòng hai marketer cũ — thước, không phải code; sửa như trên.
- `npm test` (dev, sandbox): **2.309 ca · 2.305 đạt · 0 đỏ · 4 bỏ qua** (VE3: 2.300).
- Bấm thật (dev · `v3/chay-that.js` · sandbox Postgres · **bot GIẢ** trên cổng 3194 qua `V3_BOT_V1_GOC`, tài khoản giả —
  không gọi tiến trình bot nào thật): quản trị `/bo-luat` bốn tab · `/khoi-chung` 3 bảng (2·1·1 dòng, bản 4) · thêm FAQ →
  Lưu → hộp xác nhận (bot giả nhận 0 lượt trước khi đồng ý) → đồng ý → «Đã lưu bản 5 — bot đã nhận.» · bot giả nhận 1 lượt,
  tệp có 2 FAQ · CSDL phiên bản 5 · nhật ký 1 dòng `v3_sua_khoi_dung_chung` · `/ai-de-xuat` là tab thứ tư, rỗng nói rỗng ·
  trang một page tab Lời bot: «2 chính sách · 2 câu hỏi thường gặp · 1 cách xử lý phản đối · bản 5 … Sửa ở Luật chung ›» ·
  marketer: hai tab, 11 ô sửa mở · sale `/khoi-chung` → 403 · 390px tràn ngang 0 · lỗi JS 0 · request hỏng 0 (cả hai vai).

## Chưa làm / để sau

- Tab «Đề xuất chờ duyệt» chưa có nguồn đề xuất tự động (BH5) — màn nói rỗng, không bịa.
- Bot v1 vẫn có MỘT bộ ba khối cho mọi page (luật `nhieu_team` đã chặn khi >1 team giữ) — tách theo page là việc khác,
  không thuộc VE4.
