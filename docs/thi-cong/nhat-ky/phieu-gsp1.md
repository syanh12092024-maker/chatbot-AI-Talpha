# Nhật ký thợ — GSP1 · Sản phẩm gốc chỉ sinh từ gộp món POS theo SKU

Base `068c580` · commit code `2210ed3` · làn 🟨 · không đụng bộ não · môi trường đo: máy dev macOS, Postgres hộp cát `talpha-pg:5433` (không đo prod, không đo `aicloser_v3` dev). `.env` giữ `PANCAKE_READONLY=1` (đã kiểm, không sửa).

## ⑦ Đã tra chưa
Phiếu đã dán sẵn đầu ra `grep` §9 (N-SOHIEU-CUOI · N-DANHMUC-GOC · N-GSP-DIAMOND). Không có `ops/bin/tra_no.py`. Quan hệ «mới», không trùng nợ; không có marker câu-hỏi-chờ-tổng nào (đếm = 0).

## Đo nguyên liệu trước khi code (bước 3)
- Người gọi `taoGoc` / `veThem` / `nutTaoGoc` / `khungTaoGoc` (grep toàn repo, trừ docs): `router.js:17,135` · `index.js:17` (re-export) · `kho-goc.js:158` · trang `san-pham.html` (:85, :757–:799). Test cũ chỉ neo bằng regex ở `ll13-san-pham.test.mjs:84-85` (tạo sản phẩm · `data-cho=`); `ve8a`/`ll15d-marketer-man` không gọi `POST /api/san-pham/goc` để dựng dữ liệu (ll15d dựng thẳng CSDL) ⇒ không phải chuyển ca nào.
- `tao` còn ở `chay-that.js` (nối dây) và danh sách bắt buộc `datKhoGoc` — giữ đúng chốt phiếu; fake ở `vai-b-noi-day` · `ve8b-man` · `ll11-kien-thuc` vẫn truyền `tao` nên không đụng.

## Đã làm
1. `san-pham.html`: «+ Thêm» (`#nutThem`) gắn `veGop()`; gỡ `veThem` · `taoGoc` (phía trang) · khung/nút tạo · danh sách «N số hiệu chưa có sản phẩm gốc»; câu trống đổi thành «Bấm «+ Thêm» ở cột trái để gộp món POS thành sản phẩm.»; nút «Gộp món POS thành sản phẩm →» trong ô lưu ý giờ hiện theo `GOC.suaDuoc` (quản trị), không còn theo `cho`/`khongCoSoHieu`.
2. `router.js`: gỡ `POST /api/san-pham/goc` ⇒ 404 (Express không còn route; `/api/san-pham/:id` chỉ GET). Còn nguyên: `POST/DELETE /goc/:id`, `/chi-tiet`, `/lich-su`, `/mon`, `/mon/go`, `/kien-thuc`, `/gia`, `/page`, `/page/go`, `/gop`.
3. `kho-goc.js`: giữ nguyên `chanNgoaiPhamVi` · `phamVi` (LL15d) và `tao` trong danh sách bắt buộc; chỉ thêm 2 dòng chú thích trên `taoGoc`.
4. `chay-that.js`: không đổi hành vi, thêm một dòng chú thích «`tao` GIỮ».
5. `ll13-san-pham.test.mjs`: hai neo cũ (tạo sản phẩm · số hiệu chờ đặt tên) đổi thành neo «+ Thêm = veGop» (ca neo đúng khung vừa gỡ, không xoá ca).
6. `03-MAN-HINH.md` dòng Sản phẩm: nối một câu GSP1.
7. Ca mới `v3/test/b/gsp1-san-pham-goc-chi-tu-gop.test.mjs` (5 ca, Postgres hộp cát thật + vai-b + DOM giả thật) và cổng `ops/bin/nghiem-thu/gsp1.sh`.

## Quyết định ghi lại (luật 11/13)
- **Mục ②.5** — chọn GIỮ `GET /api/san-pham/goc` trả `cho`/`khongCoSoHieu` và giữ điều kiện ô lưu ý `coBanSao || GOC.cho.length` (`san-pham.html:105`); giá phải trả: trường chết còn lại cho tới GSP2 (đổi ô lưu ý thành bộ đếm) — lúc đó gỡ luôn. Không gỡ ở đây vì đổi điều kiện hiện ô là việc của GSP2.
- **Gỡ `taoGoc` khỏi `kho-goc.js` KHÔNG làm** — `v3/src/ui/san-pham/index.js:17` re-export nó và index.js nằm NGOÀI mục ③; gỡ ở kho-goc thì index.js vỡ khi nạp (ESM thiếu export ⇒ boot chết). Chọn để lại hàm + chú thích, ghi nợ §9 **N-GSP-TAOGOC** (gỡ `taoGoc` + dòng export ở index.js cùng một phiếu có index.js).
- **④2 «đọc chuỗi tĩnh»**: KHÔNG phải ghi nợ — bộ ca đã có DOM giả chạy script thật (`testkit/dom-gia.js`), nên phép 2 đo bằng ca bấm `#nutThem` thật (G5): thấy tiêu đề «Gộp món POS thành sản phẩm», `#gSo`/`#gMa` không còn, không có POST `/api/san-pham/goc`, và `#moGop` hiện cho quản trị khi `cho` rỗng (tiền đề kiểm bằng `ds.j.cho == []`); marketer không thấy `#nutThem`/`#moGop`.
- Ca G5 dựng cả page + bản sao `san_pham.page_id` để ô lưu ý hiện (điều kiện `coBanSao`) — nếu không, `#moGop` không hiện vì cả ô ẩn (ô lưu ý chỉ hiện khi có bản sao hoặc `cho`).
- Nhánh test KHÔNG chạm: nối dây thật `v3/chay-that.js` (cần cả hệ + prod); thay bằng ca G5 canh `datKhoGoc` thiếu `tao` ⇒ ném `thiếu hàm: …tao`.

## Con số (môi trường: dev, hộp cát)
- `npm test` (một lượt, không song song): **trước 2306 ca / 2302 đạt / 0 đỏ / 4 bỏ qua → sau 2311 / 2307 / 0 đỏ / 4 bỏ qua** (+5 ca gsp1).
- `gsp1.sh`: **ĐỎ 0 / XANH 14** — trang hết 5/5 dấu · `#nutThem→veGop` · ca chạy thật 5/5 · đảo-vá 2/2 · khôi phục xanh lại · cổng cũ `ll13` `ve1` `ve8a` `ve8b` `ll15d` rc=0 cả năm (rc đo tách dòng).
- Đảo-vá (mỗi lượt một tiến trình mới, tệp khôi phục bằng trap, không để `.gsp1bak`): khôi phục route `POST /goc` ⇒ G1 đỏ (fail=1); thêm lại `function veThem` ⇒ G4 đỏ (fail=1); sau khôi phục xanh lại fail=0. Chưa đo (thành thật): đột biến chỉ khôi phục `taoGoc` phía trang mà không có `veThem` — G4 có mẫu `async function taoGoc` nhưng chưa có đảo-vá riêng cho mẫu đó.
- Bộ canh phạm vi LL15d chạy RIÊNG: `test/ll15d-marketer-san-pham.test.mjs` 4/4 · `v3/test/b/ll15d-marketer-man.test.mjs` 5/5 · `ll15d.sh` rc=0 (nằm trong ⑥ của gsp1.sh).

## Kết quả `_chan1.sh gsp1` (sau commit code 2210ed3)
```
✅ ①phiếu-tồn-tại · ✅ ②có-Base base=068c580
🔴 ④pathspec-⊆-③ NGOÀI PHẠM VI: docs/thi-cong/doi-y-do/CR-02-10b-page-phai-gan-san-pham.md
✅ ⑤vùng-cấm-src-phẳng · ✅ ⑥hết-marker đếm=0
✅ ⑦script-nghiệm-thu gsp1.sh rc=0 (== ĐỎ 0 / XANH 14)
🔴 ⑧a-nhật-ký (chạy trước khi file này tồn tại — nay đã có) · ✅ ⑧b-§10-sổ
```
Phép ④ đỏ DUY NHẤT do commit `400906b` của TỔNG (sửa CR-02-10b + phiếu GSP2/3/3B + sổ §5h) nằm trong khoảng `068c580..HEAD` — đất điều hành của tổng, không phải việc của thợ; không sửa gì. Các tệp thợ đổi đều ⊆ mục ③.

## Nợ mới (đã APPEND §9)
N-GSP-TAOGOC (trên) · trường `cho`/`khongCoSoHieu` của `GET /api/san-pham/goc` thành chết khi GSP2 đổi ô lưu ý (nhắc GSP2).


> Tổng 02/10: rebase lên origin `b4e7b6d` (LL17a) — hash đổi: `c4d3baa`→`2210ed3`, `f767800`→`94a4997`; base phiếu `068c580`→`0a80e0b` (cùng commit, sau rebase).
> Tổng 02/10 (lượt 2): rebase lên origin `fd05a0c` (hộp cát theo tiến trình) — code `2210ed3`, nhật ký `94a4997`, base `0a80e0b`.
