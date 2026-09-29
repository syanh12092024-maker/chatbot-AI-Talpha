# Nhật ký phiếu VE1 — màn Sản phẩm dựng lại theo bản vẽ (29/09/2026)

> CR-28-09c · làn 🟩 (giao diện + một câu đọc giá) · base `9821306` · commit `86d7aa6` · Đụng bộ não: không.
> Sinh từ lời người quyết sau deploy LL18: «Sao mới thấy như thay đổi phần khung, còn chi tiết k giống artifact?»
> (ảnh `/san-pham`, `/page/:id`). Thứ tự VE1→VE8 người quyết gật «oke».

## Đo trước khi code

- Bản vẽ 2a (`SanPham.dc.html`): hai cột 320px | phần còn lại; trái: «Sản phẩm của team» · «+ Thêm» · ô tìm · ô lưu ý nền
  cam «dữ liệu chưa theo mô hình» + nút đậm «Gộp món POS…»; phải: tên 22px · dòng mã gốc · nút «Lưu — mọi page dùng
  ngay» · dải bốn tầng · tab Chung / Theo thị trường / Page / Lịch sử; Chung = ô kiến thức + «Hỏi size» nền cam + cột
  «Ảnh chung»; Theo thị trường = viên thị trường · «+ Thêm thị trường = chọn shop POS + 1 món» · thẻ shop/món/tồn/marketer
  · «Giá ở …» · khung Thêm ba bước.
- Màn cũ có BẢY việc (không được mất): số liệu · cảnh báo thiếu bậc giá · số hiệu chờ đặt tên · danh sách + bỏ · tạo ·
  chi tiết (kiến thức · thị trường · gắn/gỡ · page) · bản sao theo page (ảnh · bậc giá · thiếu tên không bịa).
- Dữ liệu CÓ: sản phẩm gốc · kiến thức 7 khoá · món POS theo shop/thị trường · tồn · page bán. CHƯA CÓ ở tầng sản phẩm:
  giá theo thị trường (giá nằm ở bản sao page, `goi_gia`), ảnh chung, marketer (HRM — LL15), kịch bản tầng nước theo
  sản phẩm (lược đồ 010 có `cap='nuoc'` nhưng chỉ xem trong màn Kịch bản của từng page).
- Dải «Bot đọc theo thứ tự» của bản vẽ là lời khai về bộ ráp (bẫy #3) — đo `src/chat/rap-prompt.js`: ghép luật chung →
  sản phẩm (có kiến thức) → kỹ năng; kịch bản page đi đường riêng vào `buildSystem`. «Theo thứ tự» không đúng từng chữ ⇒
  giữ hình dải, nhãn «Bot ghép lời từ bốn tầng», mỗi tầng ghi đúng thứ nó chứa hôm nay.
- Luật hệ kiểu: `san-pham.html` thuộc danh sách đã di trú (HK15 cấm `<style>`/`style=`); HK10 đòi `<h1>` tĩnh = tên menu.

## Làm gì — và chọn gì thay gì (luật 13)

1. **Giá theo thị trường** (`chiTietSanPhamGoc` + một câu SQL): gom `goi_gia` của bản sao page đã nối món shop đó theo
   (số lượng · giá · tiền tệ · nhãn), đếm page dùng mỗi bậc; cùng số lượng khác giá ⇒ HAI dòng + `lechGia`. Chọn gom thay
   vì dựng bảng giá thị trường mới: dựng mới là hai nguồn giá (bot đọc page, màn đọc thị trường) — án lệ «cửa ra một cái».
   Giá: người dùng thấy giá theo page gộp lại, chưa sửa được một giá cho cả thị trường (màn nói rõ sửa ở đâu).
2. **Lịch sử**: `kho-goc#lichSuGoc` đọc nhật ký qua phễu TIÊM (`datDocNhatKyGoc`, nối `docNhatKy` ở `vai-b.js`) — tầng
   giao diện không import `audit/index.js`. Chưa nối ⇒ 500 nói rõ (rỗng trông y hệt «chưa ai sửa»).
3. **Trang** viết lại theo bản vẽ; đầu trang `an-tieu-de` (chỉ trình đọc màn hình — giữ `<h1>` tên màn, HK10), tên sản
   phẩm là `h2.tieu-de-lon`. Bảy việc cũ còn nguyên: bảng theo page thành «Bản sao theo page» mở từ ô lưu ý; form tạo +
   số hiệu chờ thành «Thêm sản phẩm». `?sp=&tab=` giữ chỗ đứng khi F5.
4. **Thành phần hệ kiểu** mới (`kieu.css` «VE · bố cục theo bản vẽ»): `chia-hai` · `ds-chon` · `o-luu-y` · `thu-tu-doc` ·
   `chia-phu` · `khoi-nhan` · `o-trong` · `vien` · `the-kv` · `luoi-kv` · `khung-them` · `ds-mon` — đặt tên theo NGHĨA,
   dùng lại cho Hộp thư · Page.

## Lỗi bắt bằng ảnh chụp (trước khi nộp)

- Tab Chung: dải bốn tầng + hàng tab BIẾN MẤT — cột phải flex dọc cao cố định, form dài ⇒ flex co mọi con, khối có
  `overflow` co tới 0. Vá: `.chia-hai-phai > * { flex-shrink: 0; }`; U4 canh luật ấy (đột biến M8).

## Bộ ca

- `test/ve1-san-pham.test.mjs` V1–V4 (Postgres thật): gom bậc giá + đếm page · lệch giá ⇒ hai dòng + cờ · thị trường chưa
  page ⇒ rỗng · kẹp team.
- `v3/test/b/ll13-san-pham.test.mjs` U4 viết lại theo luật mới (án lệ #27: hai cột · bốn tầng · bốn tab · 13 dấu của bảy
  việc cũ · chỗ chưa có nguồn nói rõ · luật không-co) · U6 mới (lịch sử: đúng đối tượng · nhãn người đọc · chưa nối ⇒ 500
  · đường đứng trước `/api/san-pham/:id`).

## Đảo-vá — 10/10 ĐỎ

M1 giá bỏ kẹp team · M2 gom bỏ qua giá · M3 `lechGia` luôn false · M4 lịch sử sai đối tượng · M5 lịch sử chưa nối trả
rỗng · M6 bỏ đường lịch sử · M7 trang mất việc bỏ · M8 bỏ luật không-co · M9 mất tab Lịch sử · M10 bịa marketer.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ve1.sh`: **ĐỎ 0 / XANH 6**. `npm test` (dev 29/09): **2.291 ca · 2.287 đạt · 0 đỏ · 4 bỏ qua**.
- E2E hồi quy (sandbox · `chay-that.js` · ba vai · 47 màn): 0 lỗi JS · 0 request hỏng (ngoài hai 502 chỉ-sandbox) · 0 khung
  lệch · 0 HTML thô.
- Ảnh chụp 11 trạng thái (sandbox, dev): Chung · Chung cuộn · Theo thị trường · Kuwait · Thêm thị trường · đã chọn món ·
  **GẮN THẬT** (viên thị trường cập nhật) · **LƯU KIẾN THỨC THẬT** («Đã lưu») · Page đang bán · **Lịch sử** (đọc lại đúng
  hai dòng vừa ghi) · Bản sao theo page · Thêm sản phẩm · marketer (sửa kiến thức, không Thêm/Bỏ) · 390px (0 tràn ngang).

## Chưa làm / để sau

- Marketer theo thị trường (LL15) · ảnh chung của sản phẩm (chưa có chỗ lưu) · sửa kịch bản tầng nước theo sản phẩm ·
  một giá cho cả thị trường · gộp món POS máy gợi ý (VE8).
- Chưa deploy.
