# PHIẾU VE8a — Gộp món POS thành sản phẩm THEO SKU, ngay trong màn Sản phẩm (bản vẽ 2a′) · migration 028

> Làn 🟩 giao diện + 🟨 lược đồ (028 CHỈ THÊM cột) · CR-28-09c · 30/09/2026 · KHÔNG đụng bộ não · 0 biến · 0 gói.
> Commit `eafbcd7` (mốc 1/2, khoá số hiệu) → `85b2afb` (2/2, khoá SKU + marketer) · cổng `ops/bin/nghiem-thu/ve8a.sh` · ca
> `test/ve8a-gop-mon.test.mjs` (Postgres) + `v3/test/b/ve8a-gop.test.mjs` (chạy thật).

## 1 · Đề bài

Người quyết 30/09, xem màn Sản phẩm có liên kết «Mở Vận hành › Sản phẩm & giá để nhập giá»: «Sao phải chuyển sang 1 màn
riêng nhỉ?» ⇒ gật «làm VE8 ngay sau VE7b». Sau audit luồng, người quyết tả mô hình: «cùng 1 sản phẩm nhưng ở các pos id
sẽ chung 1 sku, id có thể khác nhau nhưng sku là một» · «có token POS → có list sản phẩm → gộp SP theo SKU → gán cho MKT
tương ứng» · «SP đó có ở pos nào thì ở thị trường tương ứng, rồi map page với sản phẩm đó → khép kín». VE8 chia: **VE8a**
gộp món POS thành sản phẩm theo SKU · VE8b giá theo thị trường + gắn page + marketer (vòng khép kín).

## 2 · Đo lại nguyên liệu

- Prod 30/09 (chỉ đọc): team Tiểu Alpha 7 kết nối POS (chỉ Kuwait bật), 69 món POS đều Kuwait, **0/69 có giá, 0 thuộc sản
  phẩm, 0 sản phẩm gốc**; 76 bản sao theo page (kiểu cũ, đều có giá, 73 không tên); 514 page, **0 page có marketer**, 0 page
  gán vào sản phẩm, 119 có shop POS. Hai team kia rỗng.
- **SKU** (POS prod, 7 shop, GET danh mục chỉ đọc, chỉ đếm): `product.display_id` có ở **100%** biến thể; trùng số đầu tên
  (khoá gộp CR-15/09) ở **371/373** món; 24 SKU «khác tên» đều cùng sản phẩm lệch chính tả (số dính cuối tên…); **72/269 SKU
  không phải số** («Necklace box», «Mascara», «SP TEST») ⇒ `so_hieu` (CHECK 1–4 chữ số) không chứa được ⇒ cột mới. Số đầu
  tên phủ kém: Saudi 112/173, Qatar 11/31. Lượt kéo danh mục cũ KHÔNG lưu SKU (chỉ `v.id` + tên + `barcode` vào `mo_ta`).
- Hạ tầng có sẵn (LL13/VE1): tạo/sửa/bỏ sản phẩm gốc, gắn/gỡ món («Thêm thị trường»), `gopTheoSoHieu` ở `src/pos/ten-goc.js`
  (dùng lại tên đại diện + mã gốc đề xuất), form «+ Thêm» tạo gốc nhưng món chỉ tự nối ở lượt kéo SAU.

## 3 · Đã làm

- **028** `san_pham.sku` (nguyên văn POS) · `san_pham_goc.sku` (chuẩn hoá, UNIQUE theo team) · `san_pham_goc.marketer`
  (+ `san_pham.gia_tay` — xem VE8b). `ten-goc.js#chuanSku` (số bỏ 0 đầu · chữ gộp khoảng trắng + về thường).
- `doc-danh-muc.js`: lưu SKU, điền SKU cho món cũ, tự nối món theo **SKU trước**, không khớp mới lùi số hiệu (gốc cũ vẫn nối).
- Tầng A `goiYGopMonPos` (khoá nhóm: SKU → số đầu tên cho món chưa có SKU → tên; SKU đã là sản phẩm ⇒ nhóm «nối»; cảnh báo
  «SP TEST» + «N món chưa có SKU»; SKU chữ HIỆN nguyên văn) + `gopMonThanhGoc` (MỘT giao dịch: tạo gốc mang SKU + marketer +
  gắn đúng món chọn; SKU số điền luôn `so_hieu`; từ chối không để lại gì) · ds/chi tiết/sửa đọc-ghi `sku` + `marketer`.
- Tầng B `goiYGop` (mọi vai màn) · `gopMonThanhGoc` (quản trị, MỘT dòng nhật ký kể đủ món) · router GET/POST
  `/api/san-pham/gop` trước `/:id` · `chay-that.js` nối dây · màn: khung «Gộp món POS» (`?xem=gop`) + lối vào ở ô lưu ý.
- `testkit/dom-gia.js`: click **nổi bọt** lên tổ tiên như trình duyệt (handler ủy quyền của trang mới bắt được).

## 4 · Chọn A thay B

- **Thêm cột SKU song song, không thay `so_hieu`** (74 chỗ đọc): gộp/tự nối theo SKU trước, lùi số hiệu; gốc SKU số điền cả
  hai. Giá: hai khoá cùng tồn tại một thời gian.
- **Mốc 1/2 khoá số hiệu đã commit rồi mới đổi** — commit ghi rõ «không deploy, chờ khoá SKU»; không lượt nào ra prod.
- **Không «gộp tất cả»** — mỗi nhóm một nút; người bỏ chọn món lạ, sửa tên, mã gốc trước khi gộp (gộp nhầm là bot báo giá
  nước này cho khách nước khác).

## 5 · Thước

- Ba kho giả cũ (ll13 · ll11 · vai-b-noi-day) thêm hai hàm gộp — luật «thiếu một hàm là từ chối cả cụm».
- Ca VE8a bản đầu (khoá số hiệu) viết lại theo SKU; G4 chạy **lượt kéo danh mục THẬT** (POS giả qua `nap`) chứng minh tự nối.

## 6 · Kiểm (máy dev, 30/09)

- Postgres `chuanSku` + G1–G4 **6/6** · chạy thật G1–G7 **7/7** · đảo-vá **22/22 ĐỎ** (bỏ nối · món đã gộp lọt · không tên
  gom chung · thứ tự · bỏ kiểm món thuộc gốc khác/không có · gắn cả món ngoài danh sách · bỏ SKU · SKU không chuẩn hoá · kéo
  không lưu/không nối/không điền SKU · rơi marketer ×2 · vai · nhật ký · màn gộp cả món bỏ chọn · nhóm nối thành form · marketer
  thấy nút · mất lối vào · F5 · đường router).
- Cổng `ve8a.sh` **18/18** · `npm test` **2.396 ca · 0 đỏ** · ĐỦ cổng trên `85b2afb`: 43 xanh · 14 đỏ = 12 nợ cũ + `l1-m1`
  (POS Taiwan 0 đơn «Chờ in») + **`ve4`** — đỏ ở ④ gọi lồng ve3 trong khi ve1/ve2/ve3/ll18 cùng lượt đều xanh; chạy lại riêng
  ve4 10/10 ⇒ đỏ chập chờn dưới tải, không truy được vì cổng lồng nuốt output ⇒ sửa đường báo (commit `8f4dc43`), nợ §9.
- Chụp (sandbox Postgres, dữ liệu giả): nhóm «nối Kreain (SKU 200)» · «SKU 125 ở 3 shop, tên lệch» · SKU chữ · SP TEST;
  gộp ⇒ «Đã gộp» + cột trái «Fitgum Acai Berry · 3 thị trường · 3 món POS»; 390 px tràn 0; 0 lỗi JS (một 502 `/api/san-pham`
  là của bộ chụp — không nối `khoSanPham` nên lùi về đọc kho bot qua cầu đóng; máy chủ thật nối `taoKhoSanPhamV3`).

## 7 · Nợ phát sinh → §9

- **N-THUOC-CHAP-CHON** `ve4.sh` đỏ ở ④ (gọi lồng ve3 → ve2 → ve1 → ll18) trong lượt đủ cổng 30/09 trên `85b2afb`, chạy
  riêng xanh; cổng lồng giờ in dòng đỏ của cổng con — lượt đỏ tới sẽ chỉ thẳng ca gốc, sửa ca đó.
- **N-SKU-KEO-LAI** 69 món Kuwait trên prod chưa có SKU tới khi bấm «Kéo danh mục và giá từ POS» sau deploy (khung gộp tạm theo
  số đầu tên, 68/69 có số) — việc sau deploy, một cú bấm.
