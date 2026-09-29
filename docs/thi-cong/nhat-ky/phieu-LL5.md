# Nhật ký phiếu LL5 — Số liệu một dòng, bốn tab (29/09/2026)

> CR-28-09c · làn 🟩 · base `fad26ae` · commit `cb932da` · Đụng bộ não: không.

## Đo trước khi code

- Đích Số liệu (sau LL1): Đơn và tỉ lệ chốt · Chi phí AI trên thanh bên; «Khách vào từ đâu» và «Rủi ro hoàn
  hàng» ẩn (`thuNghiem` — đặt 22–25/09 khi máy dev chưa có dữ liệu).
- Prod có dữ liệu cho cả hai: `don_hang` 123.629 đơn, `khach.tang_hoan` trên 89.484 khách — nhưng là MỘT lần nạp
  28/08 (nợ N-KEODON). Cả hai trang KHÔNG nói số tính tới ngày nào: hiện lại nguyên trạng là để người đọc lát
  28/08 như số hôm nay (án lệ #9).

## Làm gì

1. Cụm `so-lieu` (LL3): Tổng quan · Chi phí AI · Nguồn khách · Rủi ro hoàn — thanh bên còn MỘT dòng «Số liệu»
   (đích một dòng ⇒ bấm là vào thẳng). Marketer không có quyền Rủi ro hoàn ⇒ không có tab đó.
2. Hai màn thôi `thuNghiem` (vẫn `itDung`).
3. Tuổi con số: `src/db/so-lieu.js#phanBoRuiRoHoan` trả `tuoi {chamLuc = max(cham_hoan_luc), donMoiNhat =
   max(don_hang.tao_luc)}` kẹp team; đường lùi đọc cột của Rủi ro hoàn trả `chamLuc`; `manNguon` trả
   `donMoiNhat`. Hai trang in «Tính trên đơn tới … · chấm lần cuối …» dưới đầu trang.
4. Khung: đường dẫn bỏ tầng cụm khi tên cụm trùng tên đích («Số liệu / Số liệu»).

## Bộ ca

- `v3/test/b/ll5-so-lieu.test.mjs` S1–S5: một dòng + bốn tab đúng thứ tự · tab theo quyền · tuổi Rủi ro hoàn
  (đường đọc cột) và Nguồn khách đúng team · hai trang in dòng tuổi.
- `test/l0-m2-so-lieu.test.js` R5 (Postgres sandbox): `tuoi` đúng max của team, team khác chấm muộn hơn không lọt.
- Thước sửa: `dieu-huong` ④c (thanh bên 16 → 15, thuNghiem 7 → 5, ẩn 11 → 12) · `ll1` N5 thêm bảng
  `THEM_CO_CHU_Y` (mỗi màn thêm vào tập tới-được phải khai phiếu) · cổng `ll1.sh` ⑤ 18 → 20.

## Đảo-vá — 6/6 ĐỎ

M1 tầng A bỏ tuổi đơn → R5 · **M2 tuổi chấm lấy mọi team → SỐNG lượt đầu** (R5 chưa có khách team khác) ⇒ thêm
khách team B chấm muộn hơn (dọn ở `finally`; ca «team chưa có khách» của bộ cần team B rỗng) ⇒ ĐỎ · M3 Nguồn
khách bỏ đơn mới nhất → S4 · M4 Số liệu bỏ cụm → S1 S2 · M5 đường lùi bỏ tuổi → S3 · M6 trang không in → S5.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ll5.sh`: **ĐỎ 0 / XANH 6**. `npm test` (dev 29/09): **2.245 ca · 0 đỏ · 4 bỏ qua**.
- Chụp bản xem thử: `/bao-cao` · `/nguon-khach` · `/rui-ro-hoan` đều có thanh tab bốn mục, tab đang mở đúng; 0
  lỗi JS. Dữ liệu giả của bản xem thử thiếu ngày chấm (CSDL thật buộc đi cặp) ⇒ lộ câu tự mâu thuẫn «2/5 đã chấm ·
  chưa chấm lần nào» — sửa: chỉ nói «chưa chấm lần nào» khi thật sự 0 khách được chấm.

## Chưa làm / để sau

- Gộp NỘI DUNG «Nguồn khách» + «Rủi ro hoàn» thành một trang «Khách» như bản vẽ — hai tab đủ dùng tới LL8.
- «Chi phí từng tin» (van-hanh) sang Số liệu › Chi phí là LL10.
