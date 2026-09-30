# PHIẾU VE8b — Vòng khép kín trong màn Sản phẩm: giá theo thị trường sửa tại chỗ · marketer của sản phẩm · gắn/gỡ page

> Làn 🟨 (chạm đường GIÁ: bậc giá là thứ bot báo + cửa tiền đọc) · CR-28-09c · 30/09/2026 · KHÔNG đụng bộ não · 0 biến ·
> 0 gói · migration 028 (thêm `san_pham.gia_tay`, gộp cùng bản VE8a vì 028 chưa áp ở đâu ngoài sandbox).
> Commit `97de3dd` · cổng `ops/bin/nghiem-thu/ve8b.sh` · ca `test/ve8b-gia-page.test.mjs` (Postgres) + `v3/test/b/ve8b-man.test.mjs`.

## 1 · Đề bài

Người quyết 30/09: «giá theo thị trường tức theo từng pos id, crud được ở đây nhưng cái liên quan đến sản phẩm, page cũng có
thể gắn được ở đây» · «1 page chỉ của 1 marketer và bán 1 sản phẩm tại 1 thời điểm … marketer nghỉ ⇒ chuyển page và sản phẩm
cho mkt khác; page die ⇒ sản phẩm sang page mới» · «từ sản phẩm kéo về gán marketer tương ứng … rồi map page với sản phẩm đó
thôi → khép kín» · «5 giá cài theo sản phẩm rồi, page dựa vào đó» (không xếp tầng giá riêng page) · kéo đơn POS gợi ý
marketer: «để sau».

## 2 · Đo lại nguyên liệu

- `catalog.js#docSanPhamGoiGia` (bot + cửa tiền `hang-cho.js#cua2Tien` cùng đọc): page ĐÃ gán sản phẩm ⇒ bán món POS của
  shop page (`pos_shop_id`) với **giá của chính món**; thiếu `pos_shop_id` ⇒ 0 sản phẩm. `page.pos_shop_id` hôm nay chỉ bộ di
  trú ghi (119 page) — không màn nào đặt được.
- `saveProduct` (Vận hành) tự ghi nhật ký giá cũ → mới + đẩy bản chép sang bot TRONG giao dịch — nhưng đặt `cau_hinh_tay`, cờ
  làm lượt kéo POS **ngừng cập nhật tên + HẾT HÀNG** (`doc-danh-muc.js`) ⇒ sửa giá xong bot có thể chào món đã hết. Lỗi của nó
  (`fault`) chỉ mang `status`, không `ma` ⇒ router Sản phẩm sẽ trả 500 cho «đã đổi, tải lại».
- `page.marketer` chỉ để lọc/tìm/hiện (không phân quyền) ⇒ kéo theo marketer sản phẩm an toàn.

## 3 · Đã làm

- 028 `san_pham.gia_tay` · `saveProduct` chế độ `chiGia` (chỉ bậc giá, đặt `gia_tay`, nhật ký chỉ cột giá) · lượt kéo canh
  thêm `gia_tay` (không đè giá; tên + hết hàng vẫn theo POS).
- Tầng A: chi tiết sản phẩm kèm bậc giá + phiên bản từng món (đơn vị LỚN) + `coGia` từng thị trường · `monCuaGoc` ·
  `ganPageVaoGoc` (MỘT giao dịch ghi sản phẩm · shop · thị trường (tên ở Kết nối) · marketer của sản phẩm; từ chối shop sản
  phẩm không bán / page team khác / thiếu shop) · `goPageKhoiGoc` (giữ shop/thị trường/marketer) · sửa marketer kéo MỌI page
  đang bán theo (giao dịch chỉ khi đổi marketer) · page gắn hiện dưới đúng thị trường.
- Tầng B/router/nối dây: POST `/goc/:id/gia` · `/page` · `/page/go` (quản trị; nhật ký ở cả page lẫn sản phẩm; `fault` bọc
  thành `LoiSanPham` ⇒ 409 đúng mã) · `chay-that.js`: `luuGia` = `monCuaGoc` + `saveProduct(chiGia)` + đẩy bản chép sang bot.
- Màn: «Theo thị trường» bảng giá sửa được, toàn chiều ngang (thêm/bỏ bậc — bậc mới KHÔNG đoán ship); giá bản sao cũ hiện
  dưới «Giá riêng của page» · tab Chung ô «Marketer phụ trách» · «Page đang bán» «+ Gắn page» (tìm page qua `/api/page-ds`,
  chọn thị trường, cảnh báo thị trường chưa giá) + «Gỡ» · bỏ lối sang Vận hành (ô cảnh báo chỉ sang khung gộp).
- Vận hành bỏ tab «Sản phẩm & giá» + code chết (bộ sửa món); cửa API giữ (sửa đơn chờ còn đọc danh sách món).

## 4 · Chọn A thay B

- **Cờ mới `gia_tay` thay vì dùng lại `cau_hinh_tay`**: tách «giá do người đặt» khỏi «khoá cả món» — giá: thêm một cột.
- **Nối dây `luuGia` ở `chay-that.js`** (saveProduct + taoBuocDayBot) thay vì cho `src/products` import `src/admin-v3` — tầng A
  không kéo theo lớp vận hành; giá: ca Postgres ghép lại cùng hai bước.
- **Marketer là ô chữ** cùng kiểu `page.marketer` — HRM chưa nối (H11); nối mã nhân viên ở LL15.
- **Bậc mới chỉ mang tiền tệ + số lượng kế** — chép ship/ưu đãi của bậc trước là đoán hộ người vận hành.

## 5 · Thước

- ll13 U4 neo «Chưa có nguồn — hồ sơ HRM» ở ô marketer ⇒ nay marketer có nguồn (gán ở sản phẩm) — canh «chưa gán».
- ll10 V2 «≥7 tab» ⇒ 6 · ll18 K14 «≥8 lời gọi hang» ⇒ 7 (tab rời màn); chú thích «tám nơi gọi» trong van-hanh.js sửa theo.
- frontend-v3-e2e bỏ bước bấm tab «Sản phẩm & giá» (đã rời) — cửa API vẫn đo ở phần trên của ca.
- `test/san-pham-goc.test.mjs` SG3 (pool giả không có `connect`) bắt **lỗi của tôi**: bản đầu luôn mở giao dịch — sửa CODE
  (giao dịch chỉ khi đổi marketer), không sửa thước; thêm ca này vào cổng ③.

## 6 · Kiểm (máy dev, 30/09)

- Postgres B1–B6 **7/7** (B1 đo bằng `catalog.js` thật: page Saudi bán đúng món Saudi · B5 lượt kéo POS thật sau khi đặt giá:
  không đè giá, hết hàng + tên theo POS) · chạy thật S1–S8 **8/8**.
- Đảo-vá **21/21 ĐỎ** trên bản SAU vá (không ghi shop · không lấy marketer · shop ngoài sản phẩm · marketer không kéo page ·
  chỉ-giá bật cau_hinh_tay · kéo đè giá · sửa giá món sản phẩm khác · đơn vị nhỏ · gỡ xoá thị trường · 500 thay 409 · vai ·
  nhật ký một phía · bậc đoán ship · bỏ nhầm dòng · thiếu phiên bản · vai chỉ xem sửa được · gắn thiếu thị trường · Vận hành
  còn tab · marketer «chưa có nguồn» · page gắn không hiện dưới thị trường · luôn mở giao dịch).
- Cổng `ve8b.sh` **16/16** (thêm `san-pham-goc` vào ③) · `npm test` **2.411 ca · 2.407 đạt · 0 đỏ** · ĐỦ cổng: 44 xanh · 14 đỏ (16:17) = 12 nợ cũ + `l1-m1` (POS Taiwan 0 đơn «Chờ in») + **`ve5b`**: chuỗi ve5b → ve5 → ve4 → ve3 → ve2 chỉ về `v3/test/b/ll18-khung.test.mjs` đỏ 1 ca đúng MỘT lần — cùng lượt ca ấy xanh ở 6 cổng khác (ve2b · ve2 · ve7a · ve3 · ve8b · ve6c), chạy 6 lượt song song đều xanh ⇒ thước chập chờn dưới tải (cùng chuỗi làm `ve4` đỏ ở lượt VE8a), không phải lỗi của lô; vòng «thước» của 27 cổng nay in tên ca đỏ (`✖ …`) — nợ N-THUOC-CHAP-CHON.
- Chụp (sandbox): bảng giá lưu 2 bậc ⇒ CSDL `gia_tay=true · cau_hinh_tay=false`, miễn ship + khuyến mãi đúng; gắn «Fitgum KSA»
  ⇒ page `san_pham_goc_ma · pos_shop_id · Saudi · Lan`, bảng «Page đang bán» hiện Saudi + «Gỡ» + cảnh báo chưa giá; ảnh đầu
  lộ bảng giá bị bóp trong cột trái (ô Giá không thấy số) ⇒ đưa ra toàn chiều ngang; 390 px tràn 0; 0 lỗi JS.

## 7 · Nợ phát sinh → §9

- **N-TIEN-TE-MAC-DINH** bậc giá đầu tiên của một thị trường chưa có giá: ô tiền tệ để trống (người gõ KWD/SAR…) — chưa có
  nguồn «shop → tiền tệ» ngoài giá đã có (Kết nối suy từ `goi_gia`).
- **N-MK-GOI-Y-DON** gợi ý marketer cho sản phẩm × thị trường và page từ đơn POS (đo 30/09: 98–100% đơn có marketer, 99–100%
  dòng hàng có SKU, 57–88% đơn có page) — người quyết «để sau».
