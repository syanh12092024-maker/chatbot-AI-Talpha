# PHIẾU GSP1b — Gộp món POS: SKU bắt buộc, máy chủ tự suy SKU từ món

**Base:** `0f237d9` · **Làn:** 🟨 (đổi luật của cửa tạo sản phẩm gốc — dữ liệu bot đọc; không chạm tiền)
**Nguồn:** người quyết 02/10 trả lời câu hỏi của tổng: **«Bắt buộc SKU»** (máy chủ tự lấy SKU từ món, không tin dữ liệu gửi lên; món không SKU thì không gộp được) · review chặng 2 GSP1 finding R1 (nợ N-GSP-GOP-SKU) · `01-QUYET-DINH.md` §8 «Page phải gắn sản phẩm» · CR-02-10b mục 5e · sổ §5h
**Đụng bộ não:** không.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`.

## ① Thi hành đoạn nào

Sau GSP1, `POST /api/san-pham/gop` là cửa DUY NHẤT sinh sản phẩm gốc. Review chặng 2 GSP1 (R1) đo được: cửa đó vẫn tạo
gốc KHÔNG SKU (thân không gửi `sku`) hoặc SKU LỆCH món (gửi `sku:'ZZZ'` cho món SKU 900) vì
`src/products/san-pham-goc.js#gopMonThanhGoc` (`:554-556`) lấy `khoa = chuanSku(sku)` TỪ THÂN, không đọc `san_pham.sku` của
món. Gốc không SKU không bao giờ được lượt kéo danh mục nối theo SKU (ca «Diamond Halo set»). Người quyết chốt: SKU BẮT BUỘC.
Prod 02/10: 491/491 món POS có SKU ⇒ luật mới không chặn món nào hôm nay.

## ② Hợp đồng vào / ra

**Vào:** `gopMonThanhGoc(pool, teamId, { maGoc, ten, sku, marketer, marketerMaNv, posMa })` — `sku` lấy từ thân; `so_hieu`
suy từ `sku` khi là số ≤ 4 chữ số. Món được khoá `FOR UPDATE` trong giao dịch.

**Ra:**
1. Trong giao dịch, sau khi khoá món: đọc `sku` của MỌI món được chọn (cột `san_pham.sku`, VE8 · 028). SKU của gốc =
   `chuanSku` chung của các món đó — máy chủ suy, không lấy từ thân.
   - có món `sku` NULL / rỗng ⇒ 409 `mon_chua_sku` (kèm danh sách món; câu: «món chưa có SKU — kéo lại danh mục ở Cài đặt ›
     Kết nối để lấy SKU thật, rồi gộp»), KHÔNG ghi gì;
   - các món mang ≥ 2 SKU (sau `chuanSku`) khác nhau ⇒ 409 `sku_khac_nhau` (kèm từng SKU + món), KHÔNG ghi gì;
   - thân CÓ gửi `sku` mà `chuanSku(than.sku)` ≠ SKU suy ra ⇒ 409 `sku_lech` (bắt màn cũ / màn gửi sai) — thân KHÔNG gửi `sku`
     ⇒ dùng SKU suy ra, không lỗi.
   `so_hieu` vẫn suy như cũ nhưng từ SKU suy ra. Cột `sku` của gốc ghi giá trị suy ra (nguyên văn như hiện ghi).
2. Mọi điều khác của hàm GIỮ NGUYÊN (mã gốc, trùng ⇒ `loiTrung`, món đã thuộc gốc khác ⇒ 409, tối đa 200 món, đổi `ma_goc` một câu).
3. `goiYGopMonPos` KHÔNG đổi ở phiếu này (vẫn hiện nhóm `tuTen` — món chưa SKU — để người thấy và đi kéo lại danh mục); bấm gộp
   nhóm đó ra 409 `mon_chua_sku` với câu hướng dẫn, màn hiện nguyên văn lỗi như hiện có. Ẩn nút gộp cho nhóm không SKU là việc
   MÀN ⇒ ghi nợ (GSP2 đang giữ tệp màn).
4. Cửa `/api/san-pham/gop` ở router KHÔNG phải sửa (vẫn chuyển `sku` của thân xuống; hàm tự kiểm). Không đổi nối dây.

## ③ File được đụng

```
src/products/san-pham-goc.js
test/gsp1b-*.test.mjs
test/ve8a-gop-mon.test.mjs
v3/test/b/ve8a-gop.test.mjs
test/ve8b-gia-page.test.mjs
test/ll15d-marketer-san-pham.test.mjs
v3/test/b/ll15d-marketer-man.test.mjs
v3/test/b/gsp1-san-pham-goc-chi-tu-gop.test.mjs
ops/bin/nghiem-thu/gsp1b.sh
```
Trong `src/products/san-pham-goc.js` CHỈ sửa thân `gopMonThanhGoc` (+ hàm phụ nhỏ cạnh nó nếu cần). Các tệp ca cũ chỉ sửa
FIXTURE khi ca đó dựng gộp bằng món không SKU / SKU thân lệch món — ghi rõ từng ca đổi vào nhật ký; KHÔNG xoá ca, KHÔNG đổi
khẳng định ngoài phần SKU. **Không đụng** `v3/src/ui/san-pham/*`, `v3/chay-that.js`, `src/products/chuyen-ban-sao.js` — thợ
GSP2 đang giữ chúng.

## ④ Nghiệm thu (viết trước — thợ đóng gói `ops/bin/nghiem-thu/gsp1b.sh`, rc=0 khi đạt)

Dựng (Postgres hộp cát): món `S1:a` + `S2:a` (SKU «900»), `S1:b` (SKU «901»), `S1:c` (SKU NULL), `S1:d` (SKU « 900 » — khác hoa
thường/khoảng trắng, `chuanSku` bằng «900»).
1. Gộp `[S1:a, S2:a, S1:d]` KHÔNG gửi `sku` ⇒ thành; gốc `sku` = SKU suy ra (≡ «900» sau chuẩn hoá); `so_hieu` = «900».
2. Gộp `[S1:b]` với thân `sku:'ZZZ'` ⇒ 409 `sku_lech`; đếm `san_pham_goc` trước = sau; `S1:b.ma_goc` vẫn NULL.
3. Gộp `[S1:c]` ⇒ 409 `mon_chua_sku`, 0 ghi.
4. Gộp `[S1:a', S1:b]` (hai SKU khác) ⇒ 409 `sku_khac_nhau`, 0 ghi.
5. Gộp `[S1:b]` thân `sku:'901'` ⇒ thành (thân khớp SKU suy ra).
6. Qua HTTP thật `POST /api/san-pham/gop` (quản trị): phép 2 và 3 ra đúng mã 409 + câu tiếng Việt; marketer ⇒ 403 như cũ.
7. Đảo-vá trên BẢN SAO tạm (không sửa cây chung): trả lại `khoa = chuanSku(sku)` từ thân ⇒ phép 2 + 3 đỏ.
8. Bộ ca canh phạm vi LL15d xanh, chạy RIÊNG: `test/ll15d-marketer-san-pham.test.mjs` · `v3/test/b/ll15d-marketer-man.test.mjs` ·
   cổng `ll15d.sh`. Cổng cũ xanh (rc tách dòng): `ve8a.sh` · `ve8b.sh` · `gsp1.sh` (chạy `gsp1.sh` CHỈ khi không lượt cổng nào
   khác đang chạy — đảo-vá của nó sửa cây chung). `npm test` không thêm ca đỏ so với mốc base.

**Luật cổng (bài học GSP1, 02/10):** (a) đảo-vá KHÔNG được sửa tệp trong cây làm việc chung — đột biến trên BẢN SAO tạm;
(b) cổng bash dựng hộp cát riêng thì đặt `DB="aicloser_v3_nt_<mã>_p$$"` — thước `test/hop-cat-ten.test.mjs` T4 quét mọi cổng.

## ⑤ Test chạm nhánh nào

`test/gsp1b-*.test.mjs` (tầng A trên Postgres hộp cát: năm nhánh của mục ④ 1–5 + chuẩn hoá SKU) · phép 6 qua HTTP (có thể đặt
trong `v3/test/b/` nếu cần — khi đó thêm `v3/test/b/gsp1b-*.test.mjs` vào nhật ký như tệp mới cùng tiền tố).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ, cấm tiện tay sửa

Ẩn nút gộp cho nhóm không SKU trên màn (sau GSP2) · gắn SKU cho «Diamond Halo set» (N-GSP-DIAMOND) · lượt kéo danh mục nối theo
số đầu tên cho gốc cũ không SKU (`doc-danh-muc.js:148-153`, giữ nguyên) · `taoSanPhamGoc` không còn cửa gọi (N-GSP-TAOGOC).

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-GSP-GOP-SKU\|N-GSP-DIAMOND\|N-GSP-TAOGOC\|SKU"
N-GSP-GOP-SKU (review chặng 2 GSP1, R1) cửa gộp vẫn tạo được gốc KHÔNG SKU hoặc SKU LỆCH món — chờ người quyết ...
N-GSP-DIAMOND gốc «Diamond Halo set» prod không SKU, không marketer ...
N-GSP-TAOGOC taoGoc còn lại ở kho-goc.js vì index.js re-export ...
```
Quan hệ: **trả nợ N-GSP-GOP-SKU** (người quyết đã chọn «Bắt buộc SKU» 02/10). Cạnh N-GSP-DIAMOND (không giải quyết ở đây).
