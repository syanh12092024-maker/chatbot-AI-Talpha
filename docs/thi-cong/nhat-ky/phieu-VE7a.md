# PHIẾU VE7a — Cài đặt theo bản vẽ 4: thứ tự cụm · «Hệ còn sống» nhận «Việc vận hành» · Vận hành rời thanh tab

> Làn 🟩 giao diện · CR-28-09c · 30/09/2026 · KHÔNG đụng bộ não · 0 migration · 0 biến · 0 gói.
> Commit mã `1c1ab28` · cổng `ops/bin/nghiem-thu/ve7a.sh` · ca `test/ve7a-viec-van-hanh.test.mjs` + `v3/test/b/ve7a-cai-dat.test.mjs`.

## 1 · Đề bài

Lộ trình VE1→VE8 (người quyết: «lần lượt 1 → 8 mà không hỏi lại từng màn»). Bản vẽ 4 (`CaiDat.dc.html`) có sáu phần: Bắt đầu ·
Hệ còn sống không (kèm «Việc vận hành · từ màn Hội thoại và đơn cũ») · Kết nối · Model AI · Người và team · Nhật ký. Cụm hiện có
bảy tab (Bắt đầu · Kết nối · Model · Hệ còn sống · Vận hành · Người và team · Nhật ký). VE7 chia năm phiếu như VE6: **VE7a** thứ tự
cụm + Hệ còn sống/Việc vận hành · VE7b Kết nối · VE7c Model AI · VE7d Người và team · VE7e Nhật ký.

## 2 · Đo lại nguyên liệu

- «Bắt đầu» hiện có đã gần đúng bản vẽ (năm việc + trạng thái xong/chưa/chưa đo được + ba van «nhờ quản trị hệ thống») — VE7a không đụng.
- «Việc vận hành» của bản vẽ có ba số: tin gửi không rõ kết quả · tin bị lọc [N]/24 giờ · diễn tập [N] lượt.
  - Nút «đối chiếu» (`src/queue/reconcile.js#handoffFailedMessage`) chỉ nhận tin `tin_cho_xu_ly.trang_thai IN ('loi','chan_guard')` ⇒
    số của việc này là tập ĐÓ (tin cần đối chiếu), kèm bao nhiêu tin trong đó có lượt gửi `lan_gui.trang_thai='khong_ro'`.
  - `tomTatBoQua` cộng dồn từ đầu, không có cửa sổ ⇒ đếm riêng `nap_bo_qua.lan_cuoi >= now() - 24h`; «đáng ngờ» theo cờ `ngo` của `LY_DO`.
  - Diễn tập: `tomTatDienTap` (cùng hàm tab Diễn tập dùng) + cờ `V3_DIEN_TAP`.
- Cửa `/api/van-hanh/*` chỉ quản trị · quản lý; «Hệ còn sống» mở cho cả marketer ⇒ khối phải theo vai (hỏi menu trước — không gọi rồi ăn 403).

## 3 · Đã làm

- `v3/src/ui/van-hanh/tom-tat.js#tomTatViecVanHanh` (ba câu SQL, một lượt) + cửa `GET /api/van-hanh/tom-tat` (chỉ đọc, cùng vai màn Vận hành).
- `suc-khoe.html`: bỏ dòng liên kết tĩnh LL10; thêm khối «Việc vận hành» dưới các đèn — ba việc (số + câu giải thích + nút sang đúng
  tab `/van-hanh-v3?tab=conversations|bo-qua|dien-tap`); không có việc ⇒ nói «Không tin nào chờ đối chiếu»; cửa hỏng ⇒ cảnh báo «Chưa
  đọc được việc vận hành», không vẽ 0; nạp lại mỗi phút cùng các đèn. Lớp CSS `.so-lon` (không `style=`).
- Sổ màn: thứ tự Bắt đầu · Hệ còn sống · Kết nối · Model · Người và team · Nhật ký; Vận hành rời cụm — `moTuManKhac` (thay `/suc-khoe`,
  lối vào `suc-khoe.html`) + `nhaCum: 'cai-dat'`.
- `03-MAN-HINH.md` dòng Cài đặt: câu VE7a.

## 4 · Chọn A thay B

- **Số «tin cần đối chiếu» = tập nút đối chiếu xử**, không phải mọi `lan_gui khong_ro`: đếm thứ người ta KHÔNG làm gì được với nó là số
  chết. Giá: nhãn khác bản vẽ một chữ («cần đối chiếu» thay «không rõ kết quả»), số `khong_ro` hiện ở dòng dưới.
- **Tab nhà khi đứng ở Vận hành**: `nhaCum` không tô tab trong chế độ «hàng 2 là tab của cụm» (cùng tình trạng `/rui-ro-hoan` VE6c — nợ
  «tab nhà cho màn moTuManKhac» đã ghi). Không sửa khung trong phiếu này.

## 5 · Thước sửa (VE7a đổi hợp đồng điều hướng)

`ll6-cai-dat` K1 · `ll18-khung` K2 (thứ tự tab) · `ll10-van-hanh` V1 (Vận hành: `nhaCum` + `moTuManKhac`, không còn `cum`) · `dieu-huong`
④c (danh sách màn mở-từ-màn-khác + Vận hành) · `ll1-nam-dich` N5 (`/van-hanh-v3` rời tập tới-được-từ-menu, có khai phiếu). Bắt thêm
nhờ thước `ll10` V3: ba lối sang phải là CHUỖI LIỀN trong mã (ghép chuỗi làm thước đọc liên kết không thấy) ⇒ viết hẳn ra.

## 6 · Kiểm (máy dev, 30/09)

- Ca Postgres `test/ve7a-viec-van-hanh.test.mjs` (T1 hàm: đúng tập đối chiếu, 24 giờ, team, cờ diễn tập · T2 cửa HTTP: quản trị đúng số,
  marketer 403) · ca chạy thật `v3/test/b/ve7a-cai-dat.test.mjs` C1–C4 (payload dựng bằng HÀM THẬT trên pool giả).
- Đảo-vá **10/10 ĐỎ** (đếm tin đã xong · bỏ 24 giờ · lẫn team · đáng ngờ đếm mọi lý do · cờ diễn tập · marketer gọi cửa · hỏng vẽ 0 ·
  lối sai tab · Vận hành về thanh tab · Hệ còn sống về chỗ cũ).
- Cổng `ve7a.sh` **10/10** · `npm test` **2.375 ca · 2.371 đạt · 0 đỏ · 4 bỏ qua** · ĐỦ cổng (`phat-hanh.sh`, lần này chạy TRƯỚC khi nộp —
  bài học VE2b): 41 xanh · 13 đỏ = 12 nợ cũ + **`l1-m1`**: ④ đọc đơn THẬT «Chờ in» của shop POS Taiwan — hỏi thẳng POS 30/09 ~07:10 CEST:
  **0 đơn trạng thái 12** (lượt VE2b ~06:30 còn 5) ⇒ đỏ vì dữ liệu sống, không vì mã (ghi nợ N-L1M1-SONG).
- Chụp (sandbox): thanh tab mới · khối Việc vận hành «3 · 1 không rõ · 4 / 24 giờ · 1 đáng ngờ · 5 lượt · đang bật» · nút «Xem theo cửa» ⇒
  `/van-hanh-v3?tab=bo-qua` · marketer không có khối · 390 px không tràn · 0 lỗi JS, 0 request hỏng.

## 7 · Nợ phát sinh → §9

- **N-L1M1-SONG** cổng `l1-m1.sh` ④ đọc đơn THẬT «Chờ in» của shop Taiwan; POS hết đơn ở trạng thái đó ⇒ cổng TRƯỢT dù mã đúng. Sửa: POS
  trả 0 ⇒ HOÃN («không đo được»), không TRƯỢT; hoặc đọc trạng thái có đơn.
