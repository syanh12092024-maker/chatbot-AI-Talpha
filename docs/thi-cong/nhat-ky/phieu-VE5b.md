# Nhật ký phiếu VE5b — «Hộp thư › Tìm khách» theo bản vẽ 1b (30/09/2026)

> CR-28-09c · làn 🟨 (🔴 QUYỀN: trang mở thêm cho sale) · base `2bbcc48` · commit `f9ecbe2` · Đụng bộ não: không.

## Đo trước khi code

- Bản vẽ 1b (`HopThuKhach.dc.html`): «← Về hàng đợi» · ô tìm (số · tên · mã đơn POS · mã khách Messenger) · kết quả trái 400px ·
  bên phải: tên + số + huy hiệu hoàn · BA thẻ kênh (Messenger · Trang bán hàng · WhatsApp) · bảng «Mọi đơn của khách cả hai
  luồng · mới nhất trước» (Mã POS · Luồng · Hàng · Tiền · Trạng thái) · câu «rủi ro hoàn tính từ các đơn đã kết…».
- Bản đồ phủ màn (artboard 0): **«Khách hàng» (`ho-so-khach`) → «Hộp thư › Tìm khách» · Gộp**. §10 bổ sung (CR-28-09c, ký
  29/09): Hộp thư của sale gồm «tìm khách gộp ba kênh theo số điện thoại» ⇒ cho sale vào màn nằm TRONG điều đã ký.
- Màn cũ: ẩn (`itDung` + `thuNghiem`), vai quản trị · quản lý; cửa `/api/ho-so-khach` kéo CẢ bảng khách + đơn rồi gộp trong
  JS (danh sách quản trị, không phải tra nhanh). Câu 403 của trang ghi nhầm «Màn Cửa kiểm sẵn sàng…» (chép dán cũ).
- Cửa Hộp thư có sẵn: `/api/hop-thu/tim-khach?sdt=` (khớp số đã chuẩn hoá) · `/api/hop-thu/khach/:id` (đơn · hội thoại · kênh
  — WhatsApp khai «chưa nối» kèm lý do · rủi ro hoàn) — vai sale · quản trị.
- **Đo prod (chỉ đếm, 30/09):** `don_hang` 123.629 đơn · `so_luong` có 0 · `san_pham_goc_ma` có 0 ⇒ cột «Hàng» hôm nay KHÔNG có
  dữ liệu (022 «chụp giá» chưa có đơn nào đi qua) ⇒ màn nói «dữ liệu đơn chưa lưu món», không bịa.

## Làm gì — chọn gì thay gì

1. Đường giữ `/ho-so-khach`; tên màn «Tìm khách» (HK10); `moTuManKhac` từ Hộp thư (ẩn khỏi thanh bên, lối vào «Tìm khách cũ —
   xem đủ các kênh →» dưới ô tìm của Hộp thư). Hộp thư mở thẳng hội thoại bằng `?ht=` (nút «Mở trong Hộp thư →» của thẻ kênh).
2. QUYỀN — không vai nào mất việc: TRANG = quản trị · quản lý · **sale** (mới); cửa cũ `/api/ho-so-khach` GIỮ quản trị · quản
   lý (`VAI_API`). Chọn KHÔNG mở cửa cũ cho sale: nó đọc cả bảng khách của team — sale cần tra MỘT khách, đã có cửa Hộp thư.
3. Trang hỏi TRƯỚC vai dùng được cửa nào: cửa mới `GET /api/ho-so-khach/cua` trả `{hoSo, danhSach}` bằng ĐÚNG hằng vai của hai
   cửa (không chép danh sách vai sang trình duyệt — án lệ #22). Bản nháp đầu «gọi rồi đọc 403» làm lượt bò đếm request hỏng
   (sale: `/api/ho-so-khach?trang=0` 403; quản lý: hai cửa Hộp thư 403) ⇒ đổi.
4. Tra: số (≥6 chữ số) ⇒ hồ sơ qua cửa Hộp thư + «hội thoại khớp» (`/api/ban-hoi-thoai?loc=tat&tim=`); quản lý ⇒ danh sách cửa
   cũ + nói rõ hồ sơ chi tiết mở cho sale/quản trị; tên ⇒ cửa cũ (sale: nói «chưa mở cho vai của bạn»); mã đơn POS ⇒ nói chưa có
   đường. Cửa cũ so ĐÚNG dãy số đã lưu (không bỏ số 0 đầu) — bấm thật bắt được màn báo «thấy danh sách khớp» khi danh sách
   TRỐNG ⇒ sửa câu.
5. Việc cũ của «Khách hàng» cho quản trị · quản lý GIỮ nguyên khi ô tìm trống: mọi khách gộp theo số có phân trang · bốn câu báo
   dữ liệu (tách dòng · không số · đơn chưa nối · chạm trần) · «Ba kênh dữ liệu khách» — câu chữ chép nguyên bản cũ.
6. CSS (`kieu.css`): `main.chia-hai[data-trai="rong"]` 400px (+ luật khổ hẹp THẮNG độ ưu tiên của biến thể — không thì điện
   thoại bị ép 400px) · `.kh-dau` · `.luoi-kenh` · `.the-kenh`.

## Thước (án lệ #27 — sửa luật thì sửa thước, khai căn cứ)

- `dieu-huong` ②a · ④d: gói của sale + «Tìm khách» (thanh bên sale KHÔNG thêm dòng — ca mới canh) · ④c: thử nghiệm 5 → 4,
  mở-từ-màn-khác + «Tìm khách», ít dùng 9 → 8 · ④f: − «Khách hàng». `phan-quyen-nam-vai` §9: sale + `ho-so-khach`.
- Mới `v3/test/b/ve5b-tim-khach.test.mjs` B1–B5 (B1 qua app thật: trang sale/ql/qt 200 · marketer 403 · cửa cũ sale 403 · ql 200
  · `/cua` đúng từng vai · câu 403 đúng tên màn).

## Đảo-vá — 11/11 đỏ

M1 trang bỏ sale · M2 cửa cũ mở cho sale · M3 `/cua` nói dối · M4 trang không hỏi cửa trước · M5 WhatsApp khai đã nối · M6 bỏ
câu thật cột Hàng · M7 tổng quan không canh vai · M8 mất báo tách dòng · M9 Hộp thư mất lối sang · M10 danh sách trống vẫn báo
«thấy» · M11 câu 403 sai tên màn.

## Đo

- Cổng `ops/bin/nghiem-thu/ve5b.sh`: ĐỎ 0 / XANH 7 (kèm chuỗi ve5 → ve4 → ve3 → ve2 → ve1 → ll18).
- `npm test` (dev, sandbox): **2.324 ca · 2.320 đạt · 0 đỏ · 4 bỏ qua** · lượt từ chối mới của Postgres.app: 0.
- Bấm thật (dev · app v3 trong tiến trình · sandbox · Pancake GIẢ): sale — ô trống mời gõ số (không gọi cửa cũ) · gõ `0501234567`
  ⇒ hồ sơ Fatima Al-Harbi, «Cần theo dõi · hoàn 30–65%» 41,2%, ba thẻ kênh, 3 đơn (Ladi «Đã gửi WhatsApp, chờ khách» · 2
  Messenger «Đã đóng»), cột Hàng «—» + câu thật · gõ tên ⇒ «Tìm theo tên chưa mở cho vai của bạn» · gõ `77:40310` ⇒ «Chưa tra
  được theo mã đơn POS» · «Mở trong Hộp thư →» ⇒ Hộp thư mở đúng hội thoại (`?ht=1`) · quản trị / quản lý — tổng quan cũ 2 dòng ·
  quản lý gõ số ⇒ báo đúng (danh sách cũ so dãy số đã lưu) · lỗi JS 0 · request hỏng 0 (cả ba vai) · 390px tràn ngang 0.
- Bò toàn bộ (ba vai, 51 màn): lỗi JS 0 · khung lệch 0 · HTML thô 0 · request hỏng 4 = CÙNG 4 của các lượt trước (`/api/bao-cao`,
  `/api/chi-phi` 502 trong sandbox — gọi sang bot cũ không chạy).

## Chưa làm

- Tra theo tên cho sale · tra theo mã đơn POS: chưa có đường (cần cửa đọc có chỉ mục, không kéo cả bảng).
- Hồ sơ gộp theo `khach_id` (team + thị trường + số) — cùng số ở hai thị trường là hai hồ sơ (ghi nhận, không đổi ở phiếu này).
