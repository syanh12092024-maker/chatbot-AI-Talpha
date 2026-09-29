# Nhật ký phiếu LL13 — Sản phẩm là lõi (29/09/2026)

> CR-28-09c · làn 🟨 (dữ liệu bot đọc) · base `12d8c2b` · commit `e771443` · Đụng bộ não: không.

## Đo trước khi code

- Hạ tầng có sẵn: `san_pham_goc` (014, `so_hieu` = số hiệu đầu tên món POS — khoá gộp chắc hơn tên), tầng A
  `src/products/san-pham-goc.js` (ds · cho · dem · tao · sua · bo), lượt kéo danh mục TỰ nối món POS vào gốc theo
  số hiệu ở MỌI shop (`src/pos/doc-danh-muc.js`). `san_pham` có hai loại dòng: món POS (`nguon='pos'`,
  `<shop>:<biến thể>`) và bản sao của page (`nguon='kb'`, `pos_ma` trỏ món POS — MN8); `page.san_pham_goc_ma` (015).
- Màn «Sản phẩm & kho» đặt PAGE làm trung tâm; khối sản phẩm gốc chỉ là bảng số hiệu · mã · số biến thể.
- Thiếu: góc nhìn sản phẩm → thị trường → page; «Thêm thị trường» cho 113 biến thể KHÔNG có số hiệu.
- Prod 29/09: `san_pham_goc` 0 dòng · danh mục POS mới kéo 1/7 shop (Kuwait 69 món) — gộp nhiều shop trên prod
  chờ LL16 kéo danh mục 6 shop còn lại (lệnh ghi prod, cần người gật).

## Chọn gì thay gì (luật 13)

«Mỗi thị trường đúng MỘT món POS» (lời người quyết) áp lên dữ liệu thật: mã món ở cấp BIẾN THỂ, sản phẩm có size
là nhiều biến thể trong một shop, và lượt kéo đã nối mọi biến thể cùng số hiệu. Chọn luật khoá «một món chỉ thuộc
MỘT sản phẩm» + thị trường = shop (nhiều biến thể/shop hợp lệ), thay vì chặn biến thể thứ hai. Giá: không có ràng
buộc «một shop một món» trong CSDL — nếu người quyết muốn đúng nghĩa đen thì cần mã SẢN PHẨM POS (cấp trên biến
thể), hệ chưa lưu. [NEEDS CLARIFICATION: «1 pos id» của người quyết là mã sản phẩm POS hay mã biến thể? — hỏi
người quyết; tới khi trả lời, luật hiện hành là «một món một sản phẩm».]

## Làm gì

1. Tầng A: `chiTietSanPhamGoc` · `monPosChuaGan` · `ganMonPosVaoGoc` (giao dịch, `FOR UPDATE`; món của gốc khác ⇒ 409
   `mon_thuoc_goc_khac`; không phải món POS ⇒ 404) · `goMonPosKhoiGoc` (chỉ món của CHÍNH gốc này) ·
   `dsSanPhamGoc` thêm `soThiTruong` · `soPage`. Mọi câu kẹp `team_id`.
2. Tầng giao diện `kho-goc.js`: `chiTietGoc` (mọi vai của màn) · `ganMonPos`/`goMonPos` (quản trị, nhật ký mã mới
   `GAN_MON_POS_GOC`/`GO_MON_POS_GOC`); kho đòi đủ 10 hàm. Router: ba đường trước `/api/san-pham/:id`.
3. Màn: khối «Sản phẩm» lên đầu (cột Thị trường · Page đang bán · Món POS); «Xem» ⇒ thị trường theo shop (món ·
   tồn · page bán) + «Thêm thị trường» (món chưa gán, nhóm theo thị trường) + «Gỡ» + page đang bán (đường đến).
4. **Lỗi cũ tìm ra khi chụp màn**: `UI.button({ data: { boGoc } })` ra `data-boGoc` — HTML hạ thành `data-bogoc`,
   bộ chọn `[data-bo-goc]` không khớp ⇒ nút «Bỏ» sản phẩm gốc chưa từng chạy. Sửa ở `ui.js`: camelCase ⇒ kebab.
   Chỉ màn này dùng khoá camelCase (grep toàn `v3/src/ui`).

## Bộ ca

- `test/ll13-san-pham-goc.test.mjs` (Postgres sandbox) P1–P7: hai shop ⇒ hai thị trường, shop có hai biến thể ·
  page qua món POS và qua gán cả page · một món một sản phẩm (409, không đổi chỗ) · bản sao page/mã lạ bị từ chối ·
  món chưa gán kèm thị trường · gỡ đúng món · kẹp team (đọc, gắn, món team khác).
- `v3/test/b/ll13-san-pham.test.mjs` U1–U5: kho đủ mười hàm · vai + nhật ký · thứ tự đường · trang · UI.button kebab.
- Cập nhật giả lập kho ở `vai-b-noi-day`.

## Đảo-vá — 10/10 ĐỎ

M1 thị trường không theo shop → P1 P6 · M2 cho gắn đè món gốc khác → P3 · M3 bỏ kiểm món POS → P4 · M4 gỡ không
kiểm thuộc gốc → P6 · M5 món chưa gán không kẹp team → P5 P7 · M6 bỏ đường «gán cả page» → P2 · M7 marketer gắn
được → U2 · M8 nhật ký sai mã → U2 · M9 khối sản phẩm về dưới → U4 · M10 bỏ đổi kebab ở UI.button → U5.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ll13.sh`: **ĐỎ 0 / XANH 7** (kèm ll6 → các cổng trước).
- `npm test` (dev 29/09): **2.261 ca · 0 đỏ · 4 bỏ qua**.
- Chụp sandbox (ứng dụng v3 đầy đủ, quản trị): Fitgum 3 thị trường (Kuwait · Saudi · UAE, tồn từng món, page bán
  ở Saudi), ô «Thêm thị trường» nhóm theo thị trường, «Page đang bán · 1 — qua món POS đã nối». 0 lỗi JS.

## Chưa làm / để sau

- Marketer phụ trách theo sản phẩm × thị trường (hồ sơ HRM): LL15. Kéo danh mục 6 shop còn lại: LL16 (ghi prod).
- Tab «Chung» (kiến thức · hỏi size): LL11 dùng `san_pham_goc.kien_thuc` (021). Kịch bản tầng SP/nước vẫn sửa ở
  màn Kịch bản.
