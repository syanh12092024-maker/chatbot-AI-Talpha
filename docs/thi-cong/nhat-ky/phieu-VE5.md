# Nhật ký phiếu VE5 — Hộp thư theo bản vẽ 1a (29/09/2026)

> CR-28-09c · làn 🟨 (thẻ đơn đứng trên đường TẠO ĐƠN POS — luật ghi không đổi, chỉ đổi chỗ đặt + thêm một trường đọc) ·
> base `7edaeb1` · commit `3ceceeb` · Đụng bộ não: không.

## Đo trước khi code

- Bản vẽ 1a (`Main.dc.html`): lưới 360 · co giãn · 340. Tab «Cần bạn · Đơn chờ · Bot đang xử» (Cần bạn = MỌI thứ không
  phải bot, gồm đơn). Hàng: tên · đồng hồ · lý do · nhãn · page. Cột giữa: tin nhắn → THẺ ĐƠN (Hàng · Tiền · Giao tới, cảnh
  báo hoàn, nghi trùng, nút Duyệt → Chờ in · Sửa đơn · Từ chối). Thanh cuối: Trả lời trên Pancake · Nhận việc · Trả lại bot
  · Đóng việc ▾. Cột phải: Khách · Bot đã làm gì · Page này bán gì.
- Màn hiện có (UI-HT2 + LL2): đã ba cột; thẻ đơn nằm CỘT PHẢI dạng form; nhận/đóng việc nằm cột phải (≤1180px khuất trong
  ngăn phủ); tab «Cần người · Bot đang xử · Tất cả · Đơn chờ».
- Nguồn (agent Explore + kiểm lại từng dòng dùng tới): lát `nguoi` = việc mở · `/api/hop-thu/don-cho` · `/api/hop-thu/don/:id`
  (đọc) · duyệt qua `hang-cho.js#duyet` → `tao-don.js` chặn ở van `V3_POS_GHI` (prod = 0, đo `/proc` 29/09) · sale KHÔNG có
  đường đổi chủ hội thoại về bot (resume chỉ quản trị) · sale KHÔNG đọc được sản phẩm & giá của page.

## Làm gì — chọn gì thay gì

1. Tab mới ánh xạ ĐÚNG lát đọc cũ (`API_LOC`); «Cần bạn» = lát `nguoi` + đơn chờ vẽ ngay dưới thành HÀNG của hàng đợi;
   đếm = việc mở + đơn. «Tất cả» không phải tab của bản vẽ ⇒ thành lối «Mọi hội thoại gần đây» dưới danh sách — không mất.
   Chọn hai nhóm (hội thoại, rồi đơn) thay vì trộn một danh sách xếp theo đồng hồ: đơn chờ duyệt không có hạn 10′ (chỉ việc
   có `han_luc`) — trộn là phải bịa một mốc hạn cho đơn. Giá: đơn luôn đứng dưới hội thoại quá hạn.
2. Dòng gợi ý «Gấp nhất lên đầu. Quá 10 phút… đồng hồ đỏ — quản trị thấy ở «Việc đang chờ»». Bản vẽ ghi «quản trị được báo»
   — KHÔNG có đường đẩy thông báo (chỉ băng đỏ ở /dieu-phoi) ⇒ nói đúng cái đang có.
3. Thẻ đơn ra CỘT GIỮA (`HopThu.theDon`): chỉ ĐỌC; ba nút mở ĐÚNG form `moDon` cũ và đưa con trỏ tới đúng ô (duyệt ⇒ ô
   «đã kiểm tra»; từ chối ⇒ ô lý do). Luật duyệt KHÔNG đổi (ô xác nhận · phải lưu trước · phiên bản). Cửa đọc đơn trả thêm
   `posGhiMo` = `vanGhiMo(orderDeps.env ?? process.env)` — CÙNG nguồn env với lượt duyệt ⇒ van đóng thì thẻ nói trước và
   khoá nút «Duyệt → Chờ in» (sửa · từ chối vẫn làm được). Cảnh báo hoàn chỉ ở tầng máy chủ tính (`chan`/`nhac`).
   `vanGhiMo` nhập qua `src/pos/index.js` — module đã có trong đồ thị (don-cho.js) ⇒ đồ thị Hộp thư không thêm tệp (H1).
4. Thanh cuối dựng NGAY khi mở hội thoại; khối đóng việc dùng chung đắp vào menu mở LÊN «Nhận · đóng việc ▾» / «Đóng việc ▾».
   Liên kết Pancake cập nhật riêng ô `#lk-pancake` — vẽ lại cả thanh là xoá khối đã đắp. Không vẽ nút «Trả lại bot» riêng:
   sale chưa có đường đổi chủ về bot; kết quả «Trả lại cho bot» trong khối đóng việc vẫn như cũ.
5. Cột phải: Khách · Bot đã làm gì (giai đoạn · người giữ · vì sao chuyển · đang xử · lượt bot · câu bot nói cuối) · Page này
   bán gì (page · kịch bản + câu nói rõ vai sale chưa có đường đọc sản phẩm & giá) · Đơn đang bàn (khi có).
6. CSS vào `kieu.css` (HK15): lưới 360/co giãn/340, bàn cao trọn dưới khung (tiêu đề ẩn), `.ban-ht-cuon`, `.ban-ht-goi-y`,
   `.chat-tin`, `.the-don*`, `.menu-len*`. Hàng đơn trong «Cần bạn» dùng lại `.ht-dong`.

## Thước

- Mới: `v3/test/b/ve5-hop-thu.test.mjs` V1–V5 · `test/ll2-hop-thu.test.mjs` L6 (Postgres: van đóng ⇒ `posGhiMo=false`, duyệt
  bị chặn, đơn vẫn `cho_duyet`, 0 POST POS; mở ⇒ true).
- Cũ vẫn xanh không sửa: T4 (trang chỉ GET vào đường đọc) — lượt đầu ĐỎ vì CHÚ THÍCH mình viết có đường `/api/san-pham`
  trong dấu ` ⇒ viết lại chú thích, không nới thước · H1–H7 · dispatch-dong-viec (khối đóng việc) · dispatch-router.

## Đảo-vá — 11/11 đỏ

M1 đảo tab · M2 Cần bạn đi nhầm lát · M3 đếm quên đơn · M4 Cần bạn vẽ khối «không có…» · M5 van đóng vẫn mở nút duyệt · **M6
thẻ đơn tự gọi duyệt — lượt đầu SỐNG** (regex `goi\([^)]*,` không vượt được `)` của `${enc(o.id)}`) ⇒ thước đếm ĐÚNG MỘT
`goi(` và cấm `/duyet|/luu|/loai` trong thân ⇒ đỏ · M7 cửa đọc bỏ `posGhiMo` (L6) · M8 vẽ lại thanh sau khi chat về · M9 mất lối
«Mọi hội thoại» · M10 form bỏ ô «đã kiểm tra» · M11 van đọc `process.env` thay env của lượt duyệt (L6).

## Đo

- Cổng `ops/bin/nghiem-thu/ve5.sh`: ĐỎ 0 / XANH 11 (kèm chuỗi ve4 → ve3 → ve2 → ve1 → ll18).
- `npm test` (dev, sandbox): **2.319 ca · 2.315 đạt · 0 đỏ · 4 bỏ qua** · lượt từ chối mới của Postgres.app: 0.
- Bấm thật (dev · app v3 trong tiến trình · sandbox Postgres · **Pancake GIẢ** qua `docTinPancake` · van POS đóng như prod):
  tab «Cần bạn 2 · Đơn chờ 1 · Bot đang xử» · hàng đơn «Fatima … Bot chốt đơn — chờ bạn duyệt / Đơn chờ duyệt» · thẻ đơn giữa
  (2 × Kem dưỡng Kreain · 159 SAR · Al Olaya, Riyadh) + «Cửa tạo đơn POS đang ĐÓNG», nút duyệt khoá · «Sửa đơn» ⇒ form, con trỏ
  ở ô Tên khách · menu «Nhận · đóng việc ▾» mở lên, đủ kết quả cũ · 390px tràn ngang 0 · lỗi JS 0 · request hỏng 0.
- Bò toàn bộ (ba vai, 49 màn): lỗi JS 0 · khung lệch 0 · HTML thô 0 · request hỏng 4 = CÙNG 4 của lượt VE3 (`/api/bao-cao`,
  `/api/chi-phi` 502 trong sandbox — gọi sang bot cũ không chạy).

## Chưa làm

- 1b «Tìm khách» (màn riêng) — phiếu VE5b.
- Nút xử lý đơn Ladi (đã gọi → Chờ in · gửi lại WhatsApp · huỷ) và đơn nghi trùng (giữ cả hai · huỷ đơn mới): KHÔNG có
  đường ghi — thẻ chỉ hiện thông tin; cần phiếu phía máy chủ.
- Đẩy báo quản trị khi quá 10′ · «Trả lại bot» cho sale · COD trên thẻ (không có trường).
