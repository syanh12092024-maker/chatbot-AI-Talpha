# PHIẾU GSP3c — Đóng hai lỗ làm bộ đếm «page chưa chuyển xong» về 0 sớm (điều kiện trước GSP4)

**Base:** `e68a62e` (phát SAU TT1 `bc190f5` — cùng chạm `src/products/chuyen-ban-sao.js`/`san-pham-goc.js` vùng lân cận) · **Làn:** 🟥 (ghi dấu đối soát + đường đẩy bản chép bot đọc; bộ đếm này là cổng phát GSP4 — cắt đường đọc giá)
**Nguồn:** sổ §5h «Trước khi phát GSP4 phải đóng» · nợ **N-GSP3-DOI-MON** (+ F6 đối kháng GSP3) · **N-GSP3B-NEN F4** (đối kháng GSP3b) ·
CR-02-10b mục 5e · người quyết 05/10 «triển khai» thứ tự TT1 → GP1 → H-GSP → GSP4 → go-live
**Đụng bộ não:** không.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review` (đường tiền).

## ① Thi hành đoạn nào

GSP4 chỉ phát khi bộ đếm `chuaXong` TOÀN HỆ = 0. Hai lỗ đã chạy ra lỗi thật làm bộ đếm thấp hơn thật / bot nói bản cũ:
1. **N-GSP3-DOI-MON** (GSP3 /code-review R4 + đối kháng F6 K8): dấu `doi_soat` khoá theo gốc × shop, không theo MÓN. Gỡ món x khỏi gốc
   rồi gắn món y (khác giá / chưa giá) vào cùng gốc ở cùng shop ⇒ dấu `chep`/`giu_gia_mon` cũ vẫn `daQuyet` ⇒ page tính «xong» dù chưa ai
   so giá với món y; thêm một món ĐÃ CÓ GIÁ vào gốc sau đối soát ⇒ cửa tiền MỞ ở giá món đó mà bộ đếm không báo.
2. **N-GSP3B-NEN F4** (đối kháng GSP3b R1): «Kéo danh mục» ⇒ `src/products/noi-pos.js#dongBoTuPos` (`:84-117`) ghi `het_hang` vào BẢN
   SAO (dòng `pos_ma` không NULL) và gọi `dayPageSangBot` cho page của bản sao — kể cả page ĐÃ GẮN gốc ⇒ đẩy món POS (có thể chưa giá)
   sang bot của page đó, ngoài mọi chốt GSP3b.

## ② Hợp đồng vào / ra

**Vào:** `ganMonPosVaoGoc` (`src/products/san-pham-goc.js:394`) · `goMonPosKhoiGoc` (`:421`) · `daQuyet` (`src/products/chuyen-ban-sao.js`,
DÙNG CHUNG — so `doi_soat_goc` + `doi_soat_shop`) · `dongBoTuPos` (`src/products/noi-pos.js:84`) · lưới migration 032 (CSDL chưa áp ⇒ bỏ qua
bước dọn, không ném — hai hàm này chạy trên prod).

**Ra:**
1. **Đổi món ⇒ quyết định cũ hết hiệu lực:** trong CÙNG giao dịch của `ganMonPosVaoGoc` và `goMonPosKhoiGoc`, sau khi món đổi gốc: đặt NULL
   bốn cột dấu (`doi_soat`, `doi_soat_luc`, `doi_soat_goc`, `doi_soat_shop`) cho MỌI bản sao có `doi_soat IN ('chep','giu_gia_mon')` với
   `doi_soat_goc` = mã gốc của món VÀ `doi_soat_shop` = shop của món (`split_part(ma, ':', 1)`). Page của các bản sao đó quay về
   `cho_doi_soat`, bộ đếm tăng đúng số page. Dấu `bo_qua` không đụng (chỉ hiệu lực khi page chưa gắn — đã có trong `daQuyet`).
   Nhật ký (dòng gắn/gỡ món đang có) ghi thêm số bản sao bị bỏ dấu.
2. **Kéo danh mục không đụng bản sao của page đã gắn:** `dongBoTuPos` chỉ chọn bản sao mà page của nó `san_pham_goc_ma IS NULL` (page chưa
   gắn — đường cũ còn sống tới GSP4). Page đã gắn: không ghi `het_hang` vào bản sao (bản sao là LƯU TRỮ), không gọi `dayPageSangBot` từ
   đường này. Hết hàng của món POS (page đã gắn đọc món POS qua gốc × shop) vẫn đi theo lượt kéo như hiện có — không đổi.
3. **Sửa sau review (a) 05/10 — CHẶN C1:** «Kéo danh mục» (`src/pos/doc-danh-muc.js:141-147` chọn gốc theo SKU/số hiệu; `:200` `thieuGoc`;
   `:213` ghi `ma_goc`) TỰ đưa món vào gốc cho món MỚI và món đang `ma_goc` NULL — KHÔNG qua `ganMonPosVaoGoc` nên không bỏ dấu ⇒ bộ đếm vẫn về
   0 sớm (gỡ S1:x, gắn S1:y, đối soát lại ⇒ E xong; lượt kéo sau đưa S1:x giá cũ về lại G, E vẫn «xong»). ⇒ MỘT hàm bỏ dấu DÙNG CHUNG
   (vd `boDauDoiSoatGocShop(db, teamId, maGoc, shop)` đặt ở `src/products/san-pham-goc.js`), gọi ở BA chỗ: `ganMonPosVaoGoc` ·
   `goMonPosKhoiGoc` · nhánh `doc-danh-muc.js` khi một món ĐỔI `ma_goc` (thêm mới mang gốc, hoặc NULL → gốc). Câu bỏ dấu kẹp `team_id`
   (review N3). Gắn lại món VỐN đã thuộc đúng gốc đó (không đổi gì) ⇒ KHÔNG bỏ dấu (review N3).
4. **`dongBoTuPos` lọc page «đã gắn» đúng cùng luật `catalog.js`** — chuỗi rỗng `''` của `san_pham_goc_ma` cũng là CHƯA gắn (review N4).
5. **Sửa giá** món ở Theo thị trường / GP1 điền giá KHÔNG bỏ dấu (giá thuộc món × shop — một bảng; đối soát đã quyết chọn bảng) — ghi câu này
   vào chú thích hàm bỏ dấu (review N5).
6. **Quét lùi một lần** dấu đã cũ: hàm thuần `demDauCu(db)` (chỉ đọc) đếm bản sao `doi_soat IN ('chep','giu_gia_mon')` mà gốc × shop của dấu
   hiện có món POS đổi sau `doi_soat_luc` (`san_pham.sua_luc` của món thuộc gốc × shop > `doi_soat_luc`) — GSP3 đã lên prod và H-GSP đang mở
   (review N1). Tổng chạy đo trên prod trước GSP4; khác 0 ⇒ bỏ dấu các dòng đó (một câu, có nhật ký) theo gật của người quyết.
7. Không đổi `daQuyet`, không đổi hành vi nào khác của các hàm.

## ③ File được đụng

```
src/products/san-pham-goc.js
src/products/noi-pos.js
src/pos/doc-danh-muc.js
v3/src/ui/san-pham/kho-goc.js
test/gsp3c-*.test.mjs
ops/bin/nghiem-thu/gsp3c.sh
test/gsp3-doi-soat.test.mjs
```
**Nới 07/10 (thợ xin, tổng duyệt):** `test/gsp3-doi-soat.test.mjs` CHỈ ca ④9c F1 — dựng «món rời gốc» bằng SQL tay thay cho `goMonPosKhoiGoc` (cửa gỡ từ GSP3c tự bỏ dấu ⇒ thước cũ hết dựng được trạng thái); assert giữ nguyên.
`san-pham-goc.js`: CHỈ `ganMonPosVaoGoc` + `goMonPosKhoiGoc` + hàm bỏ dấu dùng chung + `demDauCu`. `doc-danh-muc.js`: CHỈ gọi hàm bỏ dấu ở
nhánh món đổi `ma_goc`. `kho-goc.js`: CHỈ thêm «số bản sao bị bỏ dấu» vào câu nhật ký gắn/gỡ món (review N2). KHÔNG sửa `chuyen-ban-sao.js` (phiếu TT1/GP1 đang
giữ tệp đó) — cần đổi ⇒ dừng, báo tổng.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gsp3c.sh`, rc=0 khi đạt; đảo-vá trên BẢN SAO tạm; `grep -E` không `rg`; nạp `.env` nếu thiếu `DATABASE_URL_V3`; hộp cát riêng `DB="aicloser_v3_nt_gsp3c_p$$"`)

Dựng (Postgres hộp cát): gốc G có món `S1:x` (có giá) ở shop S1; page E gắn G × S1, bản sao `doi_soat='chep'`, `doi_soat_goc`=G, `doi_soat_shop`=S1
⇒ `dsViecChuyen` không có E (`xong`). Page Z chưa gắn, bản sao nối `pos_ma`=`S1:x`; page Y ĐÃ gắn G × S1, bản sao nối `pos_ma`=`S1:x`.
1. Gỡ `S1:x` khỏi G (cửa thật) ⇒ dấu của E về NULL, E `cho_doi_soat`, `chuaXong` +1. Gắn lại món `S1:y` vào G ⇒ E vẫn `cho_doi_soat`.
2. Thêm một món ĐÃ CÓ GIÁ `S1:w` vào G (E đang `xong`) ⇒ E `cho_doi_soat`.
3. Đổi món ở shop S2 của G ⇒ dấu của E (S1) KHÔNG đổi.
4. Dấu `bo_qua` của page chưa gắn KHÔNG bị đụng bởi gắn/gỡ món.
5. `dongBoTuPos` sau khi `S1:x` đổi `het_hang`: bản sao của Z đổi `het_hang` + `day` gọi cho Z (đường cũ giữ nguyên); bản sao của Y KHÔNG đổi,
   `day` KHÔNG gọi cho Y.
1b. «Kéo danh mục» (giả POS) đưa món `S1:x` (đang NULL) về lại G ⇒ dấu của E về NULL, E `cho_doi_soat`. Món mới mang SKU của G kéo về ⇒ như vậy.
2b. Gắn lại món VỐN đã thuộc G ⇒ dấu của E giữ nguyên. Dấu của team khác cùng mã gốc ⇒ không bị đụng.
5b. Page có `san_pham_goc_ma = ''` (chuỗi rỗng) ⇒ `dongBoTuPos` coi là CHƯA gắn (đường cũ).
5c. `demDauCu` trên fixture: một dấu `chep` trước khi món của gốc × shop đổi ⇒ đếm 1; dấu sau ⇒ 0; không ghi gì.
6. CSDL chưa áp 032 ⇒ gắn/gỡ món + kéo danh mục vẫn thành như cũ, không ném.
7. Đảo-vá: bỏ bước dọn dấu ở `goMonPosKhoiGoc` ⇒ phép 1 đỏ; ở `ganMonPosVaoGoc` ⇒ phép 2 đỏ; ở `doc-danh-muc.js` ⇒ phép 1b đỏ; bỏ kẹp `team_id`
   ⇒ 2b đỏ; bỏ lọc page đã gắn ở `dongBoTuPos` ⇒ phép 5 đỏ.
8. Cổng cũ xanh (rc tách dòng): `gsp2.sh` · `gsp3.sh` · `gsp3b.sh` · `ve8a.sh` · `ll13.sh` (cổng `ll13` có chuỗi con chập chờn đã biết —
   đỏ lạ thì chạy riêng, ghi rõ). `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/gsp3c-*.test.mjs` (Postgres hộp cát: đổi món cùng shop / khác shop / thêm món có giá / `bo_qua` / lưới 032; `dongBoTuPos` page gắn vs chưa gắn).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Bỏ nhánh `page_id` / chốt handler (GSP4) · dọn `kb-overrides.json` (N-GSP-KB-OVERRIDES) · F2/F3/F5/F7 (N-GSP3-NEN).

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-GSP3-DOI-MON\|N-GSP3B-NEN\|F4\|F6 mở rộng"
N-GSP3-DOI-MON — gỡ món x rồi gắn món y cùng gốc ⇒ dấu chep cũ vẫn hiệu lực ... phải đóng trước GSP4
N-GSP3-NEN … **F6 mở rộng N-GSP3-DOI-MON:** thêm một món ĐÃ CÓ GIÁ vào gốc sau đối soát ⇒ cửa tiền MỞ ...
N-GSP3B-NEN … F4 «Kéo danh mục» (dongBoTuPos) ghi hết hàng vào bản sao của page ĐÃ GẮN không qua chốt ... phải đóng trước GSP4
```
Quan hệ: **trả nợ** N-GSP3-DOI-MON (gồm F6) + N-GSP3B-NEN F4.
