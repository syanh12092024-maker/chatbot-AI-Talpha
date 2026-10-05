# PHIẾU GSP1 — Sản phẩm gốc chỉ sinh từ gộp món POS theo SKU

**Base:** `0a80e0b` · **Làn:** 🟨 (đóng một cửa ghi API + màn; không chạm tiền, không chạm bot)
**Nguồn:** CR-02-10b (`docs/thi-cong/doi-y-do/CR-02-10b-page-phai-gan-san-pham.md` mục 1 · 5) · `01-QUYET-DINH.md` §8 «Page phải gắn sản phẩm» · sổ §5h
**Đụng bộ não:** không.
**Skill thợ nạp (sau khi đọc phiếu):** `tho-thi-cong` · `viet-thuoc`.

## ① Thi hành đoạn nào

CR-02-10b mục 1 vế «Sản phẩm gốc chỉ sinh từ **gộp món POS theo SKU**; lối tạo theo số hiệu bỏ» +
mục 5 dòng GSP1. Lý do (CR mục 1 «Vì» 3): gốc tạo theo số hiệu không mang SKU, không marketer. Lượt kéo
danh mục nối SKU trước, không có gốc SKU mới lùi về số đầu tên (`src/pos/doc-danh-muc.js:142-153`) ⇒ gốc số
hiệu chỉ tự nối được phần món có số đầu tên (~70% — 18,9% tên biến thể không có số hiệu, sổ §9) và KHÔNG BAO
GIỜ được nối theo SKU. Prod có đúng một ca: «Diamond Halo set», tạo 29/09 qua lối này, `sku` NULL (nợ
N-GSP-DIAMOND — KHÔNG sửa ở đây). *(Sửa theo review (a) G1-N1.)*

## ② Hợp đồng vào / ra

**Vào (hôm nay):** màn `/san-pham` — nút «+ Thêm» ở cột trái mở `veThem()` (`san-pham.html:757-800`):
khung Số hiệu · Mã gốc · Tên + danh sách «N số hiệu chưa có sản phẩm gốc», bấm Tạo gọi
`POST /api/san-pham/goc` (`router.js:134` → `kho-goc.js#taoGoc` → `khoSanPhamGoc.tao` →
`src/products/san-pham-goc.js#taoSanPhamGoc`). Ô lưu ý trái (`san-pham.html:102-113`) chỉ hiện nút
«Gộp món POS thành sản phẩm →» khi `GOC.cho.length || GOC.khongCoSoHieu` (điều kiện theo SỐ HIỆU).

**Ra:**
1. «+ Thêm» mở thẳng `veGop()` (màn «Gộp món POS thành sản phẩm», `?xem=gop`). Chỉ quản trị thấy nút —
   giữ đúng điều kiện `GOC.suaDuoc` hiện có.
2. Không còn màn nào cho tạo gốc theo số hiệu: gỡ `veThem` · `taoGoc` (phía trang) · danh sách số hiệu.
   Câu trống «Bấm «+ Thêm» ở cột trái» (`:819`) đổi cho đúng nghĩa mới (mở gộp món POS).
3. `POST /api/san-pham/goc` (tạo gốc) **gỡ khỏi router** ⇒ 404. Mọi cửa khác của `/api/san-pham/goc*`
   GIỮ NGUYÊN — đặc biệt `POST /api/san-pham/goc/:id` (sửa tên · số hiệu · SKU · marketer — đường để
   người gắn SKU cho «Diamond Halo set» sau này), `DELETE`, `/chi-tiet`, `/mon`, `/gia`, `/page`.
   Gỡ `taoGoc` khỏi `kho-goc.js` khi đo (`grep -rn`) không còn ai gọi. **GIỮ `tao` trong nối dây**
   `v3/chay-that.js#khoSanPhamGoc` và trong danh sách hàm BẮT BUỘC của `datKhoGoc` (`kho-goc.js:37-40`): gỡ nó
   mà quên danh sách là boot ném `noi_day_thieu` — cả màn Sản phẩm chết; gỡ cả danh sách thì fake ở
   `vai-b-noi-day.test.mjs` · `ve8b-man.test.mjs` (ngoài ③) đỏ. *(Review (a) G1-G1.)* **Không** xoá `src/products/san-pham-goc.js#taoSanPhamGoc` (thư viện tầng
   A — `gopMonThanhGoc` hay ca khác có thể dùng; đo trước, không dùng nữa thì ghi nợ, KHÔNG xoá ở phiếu này).
4. Nút «Gộp món POS thành sản phẩm →» trong ô lưu ý: thôi phụ thuộc số hiệu — hiện cho quản trị khi
   ô lưu ý hiện. Phần chữ «Dữ liệu hôm nay còn nằm theo page…» và nút «Bản sao theo page →» GIỮ NGUYÊN
   (GSP2 đổi chúng thành bộ đếm).
5. `GET /api/san-pham/goc` vẫn trả `cho`/`khongCoSoHieu` cũng được (không màn nào đọc nữa) — nếu gỡ thì
   gỡ cả chỗ đọc, kể cả điều kiện hiện ô lưu ý `san-pham.html:105` (`coBanSao || GOC.cho.length`); chọn một,
   ghi vào nhật ký.

**Giữ phạm vi marketer (LL15d, đang chạy trên prod — phiên ai-chatbot-c7 dặn 02/10):** `kho-goc.js` giữ nguyên `chanNgoaiPhamVi` ở `chiTietGoc` · `suaKienThucGoc` · `lichSuGoc` và `phamVi` ở `manSanPhamGoc`; `kho-san-pham.js#pageCuaTeam` giữ bộ lọc `maGocCuaPhamVi`.

## ③ File được đụng

```
v3/src/ui/san-pham/trang/san-pham.html
v3/src/ui/san-pham/router.js
v3/src/ui/san-pham/kho-goc.js
v3/chay-that.js
v3/test/b/gsp1-*.test.mjs
v3/test/b/ll13-san-pham.test.mjs
v3/test/b/ve8a-gop.test.mjs
v3/test/b/ll15d-marketer-man.test.mjs
ops/bin/nghiem-thu/gsp1.sh
docs/v3/03-MAN-HINH.md
```
`03-MAN-HINH.md`: chỉ dòng **Sản phẩm** (:13) — nối một câu «**GSP1 (02/10):** «+ Thêm» = Gộp món POS
theo SKU; bỏ lối tạo gốc theo số hiệu (CR-02-10b)». Ca cũ chỉ sửa khi nó neo đúng cửa/khung vừa gỡ.

## ④ Nghiệm thu (viết trước — thợ đóng gói thành `ops/bin/nghiem-thu/gsp1.sh`, rc=0 khi đạt)

1. HTML `/san-pham` (đọc tệp trang) KHÔNG còn: `id="khungTaoGoc"` · `id="nutTaoGoc"` · chữ «số hiệu chưa có
   sản phẩm gốc» · `function veThem` · lời gọi `goiGhi('/api/san-pham/goc', { method: 'POST'`.
2. Nút `#nutThem` gắn `veGop`. Nếu bộ ca đã có cách dựng DOM thật (xem ca LL15c dựng `dieu-huong.js` thật) thì
   đo bằng một ca bấm `#nutThem` ⇒ thấy tiêu đề «Gộp món POS thành sản phẩm», và một ca ô lưu ý hiện nút Gộp cho
   quản trị khi `cho` rỗng; không có thì đọc nội dung trang và ghi nợ «④2 đọc chuỗi tĩnh». *(Review (a) G1-G2.)*
3. Gọi thật `POST /api/san-pham/goc` (vai quản trị, thân hợp lệ) ⇒ **404**, và đếm `san_pham_goc` trước =
   sau. `POST /api/san-pham/goc/:id` (sửa SKU một gốc có sẵn) ⇒ 200 và cột `sku` đổi — cửa sửa còn sống.
4. `GET /api/san-pham/gop` ⇒ 200 như cũ; `POST /api/san-pham/gop` gộp được một nhóm (cửa tạo gốc DUY NHẤT).
5. Đảo-vá: khôi phục route `POST /api/san-pham/goc` ⇒ phép 3 đỏ; khôi phục `veThem` ⇒ phép 1 đỏ.
6. Cổng cũ cùng màn vẫn xanh: `ll13.sh` · `ve1.sh` · `ve8a.sh` · `ve8b.sh` · `ll15d.sh` (rc đo TÁCH DÒNG).
7. `npm test` không thêm ca đỏ so với mốc base (ghi hai số vào nhật ký).

8. Bộ ca canh phạm vi LL15d xanh, chạy RIÊNG và ghi số vào nhật ký: `test/ll15d-marketer-san-pham.test.mjs` · `v3/test/b/ll15d-marketer-man.test.mjs` · cổng `ops/bin/nghiem-thu/ll15d.sh`.

## ⑤ Test chạm nhánh nào

Ca mới `v3/test/b/gsp1-*.test.mjs`: (a) router — POST tạo gốc 404 dưới mọi vai; POST sửa gốc 200 cho quản
trị, 403 cho marketer (đúng `VAI_SUA_DUOC` hiện có); (b) trang — các phép 1–2 của mục ④ dưới dạng ca.
Ca cũ nào gọi `POST /api/san-pham/goc` để DỰNG dữ liệu thì chuyển sang dựng thẳng CSDL hoặc qua
`POST /api/san-pham/gop` — không xoá ca.

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ, cấm tiện tay sửa

Gắn SKU cho «Diamond Halo set» (N-GSP-DIAMOND) · đổi «Bản sao theo page» / bộ đếm (GSP2) · chép giá (GSP3)
· bỏ đường đọc `page_id` (GSP4) · `tachSoHieu` đọc số cuối tên (N-SOHIEU-CUOI) · xoá `taoSanPhamGoc`.

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "số hiệu\|Thêm sản phẩm\|api/san-pham/goc\|N-SOHIEU\|N-DANHMUC\|N-GSP-DIAMOND"
760:  **18,9% tên biến thể KHÔNG có số hiệu** ⇒ không suy ra SP gốc. Gần ⅓ lịch sử đơn vô dụng
1021:  - **N-SOHIEU-CUOI** `src/pos/ten-goc.js#tachSoHieu` chỉ đọc số hiệu ĐẦU tên; ...
1027:  - **N-DANHMUC-GOC** `san_pham_goc` prod = 0 dòng ⇒ chưa gắn page ↔ sản phẩm được; ...
1088:  - **N-GSP-DIAMOND** gốc «Diamond Halo set» prod không SKU, không marketer (tạo 29/09 qua lối số hiệu) ...
```
Quan hệ: **mới** (thi hành CR-02-10b). Chạm cạnh N-GSP-DIAMOND (giữ cửa sửa gốc để trả nợ đó sau) và
N-SOHIEU-CUOI (lối số hiệu bỏ ⇒ nợ này nhẹ đi, không đóng ở đây).
