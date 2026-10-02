# PHIẾU GSP2 — Danh sách việc chuyển: gắn page đang đọc bản sao vào sản phẩm gốc

**Base:** `ĐẶT-LÚC-PHÁT` · **Làn:** 🟨 (ghi `page.san_pham_goc_ma` + tạo/nối gốc qua cửa đã có + migration 032 CHỈ THÊM một cột không đường tiền nào đọc; KHÔNG ghi giá. Gắn xong mà món POS chưa có giá ⇒ cửa tiền của page ĐÓNG — hỏng về phía an toàn)
**Nguồn:** CR-02-10b mục 3 «Mất đi 3» · mục 5 dòng GSP2 · mục 5d (đo prod) · **mục 5e (sửa sau review (a))** · `01-QUYET-DINH.md` §8 «Page phải gắn sản phẩm» · sổ §5h
**Đụng bộ não:** không.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc` · `web-design-guidelines` (màn).

## ① Thi hành đoạn nào

CR-02-10b mục 5 dòng GSP2 + mục 5e. Màn «Bản sao theo page» đổi **TẠM** thành danh sách việc chuyển (gỡ ở
GSP5); ô lưu ý trái thành bộ đếm. Đo prod 02/10 (CR 5d): 74 page Pialpha GCC + 2 page team kỹ thuật đọc bản sao
· 0/78 bản sao nối món POS ⇒ **mọi page cần người xác nhận** · 63/74 page có shop (shop đều đã kéo) · 11 page
chưa có shop · 491/491 món POS có SKU · 2 page có 2 bản sao · chỉ 3/78 bản sao có tên ⇒ gợi ý dựa TÊN PAGE
(«Birthstone Set 18K Gold Saudi», «Kreain Nature PH in Saudi»…) · prod đã có gốc «Clear Sight EYE HEALTHY» SKU 171.

**Bài học review (a) G2-C1 — đọc kỹ:** «xong» KHÔNG được suy từ «món POS đã có giá». Hai page cùng gốc × shop
mang giá bản sao khác nhau; nếu chép page đầu làm page sau tự «xong» thì giá page đầu thắng ngầm và bị đẩy sang
bot page sau, bộ đếm về 0 sớm, GSP4 chạy sai. **Trạng thái tính theo PAGE × BẢN SAO, bằng dấu quyết định lưu
trong dữ liệu.**

## ② Hợp đồng vào / ra

**Vào:** `veBanSao()` (`san-pham.html:673-754`) vẽ bảng page có bản sao từ `GET /api/san-pham`; ô lưu ý
(`:102-113`) đếm theo `DL.dem`. Cửa ĐÃ CÓ, dùng lại, cấm viết đường ghi thứ hai:
gắn page `POST /api/san-pham/goc/:id/page {pageId, shopId}` → `kho-goc.js#ganPageSanPham` (vai `VAI_SUA_DUOC`,
nhật ký ở page + sản phẩm) → `src/products/san-pham-goc.js#ganPageVaoGoc` (một giao dịch; 409
`shop_ngoai_san_pham` khi gốc chưa có món ở shop; ghi `san_pham_goc_ma` · `pos_shop_id` · `thi_truong` ·
**`marketer` = marketer của gốc nếu có**) · nối món `POST /api/san-pham/goc/:id/mon {posMa}` · gộp
`POST /api/san-pham/gop` (VE8a) · gợi ý gộp `GET /api/san-pham/gop` (nhóm `loai:'noi'` = SKU đã là gốc
`gocId`, món shop này chưa nối — `san-pham-goc.js:519-523`; `loai:'moi'` = SKU chưa gốc).

**Ra:**
1. **Migration `db/migrate/032_doi_soat_ban_sao.{up,down}.sql` — CHỈ THÊM:** `san_pham.doi_soat text NULL CHECK
   (doi_soat IN ('chep','giu_gia_mon','bo_qua'))` + `san_pham.doi_soat_luc timestamptz NULL` + **`san_pham.doi_soat_goc
   text NULL` + `san_pham.doi_soat_shop text NULL`** (quyết cho gốc × shop NÀO — review (a) vòng 2 G2-C1b) + chú thích cột
   (chỉ dòng bản sao `nguon <> 'pos'` mang giá trị; NULL = chưa quyết). `down` gỡ bốn cột. Mã đọc cột PHẢI chịu được
   CSDL chưa áp 032 (lưới migration — bài học 014/025: mã mới chạy trước migration): chưa có cột ⇒ coi mọi bản
   sao là NULL, KHÔNG ném. Cập nhật `docs/v3/ban-giao/luoc-do-v1.md` dòng `san_pham` cùng commit migration.
2. **Bộ đọc (tầng A)** `src/products/chuyen-ban-sao.js#dsViecChuyen(pool, teamId)` — mỗi page có bản sao
   (`san_pham.page_id = page.id AND nguon <> 'pos'`) một dòng:
   `{ pageId, pageFb, ten, marketerPage, shop: {id, market}|null, goc: {id, maGoc, ten, marketer}|null, trangThai,
      banSao: [{id, ten, bienThe, bac: [...đủ cột goi_gia], soAnh, anhDau, doiSoat}], goiY: [...] }`.
   **Vị từ DÙNG CHUNG** (xuất ra, GSP3 gọi đúng hàm này — cấm viết lại): `daQuyet(banSao, page)` =
   (`doi_soat IN ('chep','giu_gia_mon')` **VÀ** `doi_soat_goc = page.san_pham_goc_ma` **VÀ** `doi_soat_shop = page.pos_shop_id`)
   **HOẶC** (`doi_soat = 'bo_qua'` **VÀ** page CHƯA gắn gốc). Tức: page bị gắn lại sang gốc/shop khác, hoặc page `bo_qua` rồi
   được gắn, thì quyết định cũ HẾT HIỆU LỰC — bản sao quay về «chưa quyết» với gốc × shop mới.
   `trangThai` của PAGE:
   - `chua_gan` — page chưa gắn gốc + shop, và còn ≥1 bản sao không `daQuyet`;
   - `bo_qua` — page chưa gắn và mọi bản sao `daQuyet` theo nhánh `bo_qua` (người ghi «không chuyển»);
   - `cho_doi_soat` — page đã gắn gốc + shop, còn ≥1 bản sao không `daQuyet` — **bất kể món POS đã có giá hay chưa**
     (việc của GSP3);
   - `xong` — đã gắn VÀ mọi bản sao `daQuyet`. Không trả về.
   **Bộ đếm** `chuaXong = count(chua_gan) + count(cho_doi_soat)` (`bo_qua` tính là đã quyết). Đây là số GSP4 chờ
   về 0 — sổ §5h: TOÀN HỆ, mọi team.
   `goiY` (≤3, chỉ món CỦA SHOP của page; page chưa có shop ⇒ rỗng): `{posMa, tenMon, sku, diem, loai}` với
   `loai` = `goc` (món đã thuộc gốc G — kèm `goc {id, maGoc, ten}`) · `noi` (SKU đã là gốc G nhưng món này chưa
   nối — kèm `gocTheoSku {id, maGoc, ten}`) · `moi` (SKU chưa gốc). Chấm bằng hàm THUẦN xuất ra
   `chamGoiY(tenPage, tenMon)` (khớp từ sau khi bỏ số hiệu đầu tên `tachSoHieu`, bỏ tên nước/thị trường ở tên
   page, không phân biệt hoa thường). Điểm 0 ⇒ không gợi ý — không bịa.
3. **Ghi «không chuyển»** `src/products/chuyen-ban-sao.js#boQuaPage(pool, teamId, pageId, lyDo)` — một giao dịch,
   đặt `doi_soat='bo_qua'`, `doi_soat_luc=now()`, `doi_soat_goc`/`doi_soat_shop` = NULL cho mọi bản sao của page chưa quyết; page đang gắn gốc ⇒ 409 (gỡ
   gắn trước). Nhật ký hành động mới (vd `BO_QUA_CHUYEN_PAGE`) ở page, kèm lý do. **Bỏ quyết định** (lùi):
   `huyBoQua` đặt lại NULL cho bản sao `bo_qua` của page, có nhật ký.
4. **Cửa** (vai quản trị = `VAI_SUA_DUOC`; marketer ⇒ 403 — page chưa gắn nằm ngoài phạm vi marketer theo LL15d):
   `GET /api/san-pham/chuyen` ⇒ `{ ok, dem: {chuaGan, choDoiSoat, boQua, chuaXong}, viec: [...], shopCuaTeam, gocCuaTeam }`
   · `POST /api/san-pham/chuyen/:pageId/bo-qua {lyDo}` · `POST /api/san-pham/chuyen/:pageId/huy-bo-qua`.
   Mọi đường `/api/san-pham/chuyen*` đứng TRƯỚC `GET /api/san-pham/:id` (`router.js:198`). Hàm mới của
   `khoSanPhamGoc` là hàm **TUỲ CHỌN** trong `datKhoGoc` (không thêm vào danh sách bắt buộc ở `kho-goc.js:37-40` —
   thêm là fake ở 5 tệp ca ll13 · ve8a · ve8b · ll15d · vai-b-noi-day đỏ, ngoài ③).
5. **Màn** — nút «Bản sao theo page →» và `veBanSao` thành «Chuyển page sang sản phẩm»: ô số (chưa gắn · chờ đối
   soát · không chuyển · tổng chưa xong) · bộ lọc theo trạng thái · mỗi dòng: page + shop (chưa có ⇒ ô chọn shop của
   team) · giá và ảnh của bản sao · gợi ý. Hành động trên dòng `chua_gan`:
   - `loai: goc` ⇒ **«Gắn vào «G»»** = cửa gắn;
   - `loai: noi` ⇒ **«Nối món vào «G» rồi gắn»** = `POST /goc/:id/mon` rồi cửa gắn;
   - `loai: moi` ⇒ **«Gộp SKU … thành sản phẩm rồi gắn»** — ô Tên + Mã gốc điền sẵn từ tên món (mã gốc là khoá kịch
     bản, đặt rồi không sửa — nói ra như màn Gộp), gọi `POST /api/san-pham/gop` với ĐỦ các món cùng SKU ở mọi shop
     (nhóm của `GET /api/san-pham/gop`), rồi cửa gắn;
   - không gợi ý nào đúng ⇒ chọn tay một gốc của team; không có thì lối «Gộp món POS»;
   - **«Không chuyển»** (page chết / thôi bán) ⇒ hỏi lý do, gọi `bo-qua`.
   Bước thứ hai hỏng sau khi bước một xong (nối/gộp xong, gắn hỏng) ⇒ màn nói đúng trạng thái («sản phẩm đã tạo, chưa
   gắn») + nút gắn lại; KHÔNG im. **Trước khi bấm gắn**, dòng hiện «marketer page: X → Y» khi marketer của gốc khác
   marketer page (cửa gắn ghi đè `page.marketer` — review (a) G2-G3). Dòng `cho_doi_soat` hiện «Đã gắn «G» · chờ đối
   soát giá + ảnh (GSP3)», không nút ghi. Dòng `bo_qua` hiện lý do + «Bỏ quyết định».
6. **Ô lưu ý trái** = bộ đếm: «**x page chưa chuyển xong** sang sản phẩm» + nút mở danh sách; `chuaXong = 0` ⇒ không
   hiện. Bỏ câu «Dữ liệu hôm nay còn nằm theo page…» và số `DL.dem`.
   Gỡ luôn `cho` / `khongCoSoHieu` khỏi `GET /api/san-pham/goc` và chỗ đọc chúng (thợ GSP1 để lại, nhật ký `phieu-gsp1.md` mục ②.5).
7. **Không đẩy bản chép** sau gắn / nối / gộp: page vừa gắn đọc món POS có thể chưa giá; đẩy lúc này là xoá giá khỏi bản
   bot đang giữ. (Các đường KHÁC còn đẩy được cho page đã gắn — trang page sửa bản sao, `day-lai-ban-chep --tat-ca` —
   do GSP3b khoá và sổ §5h cấm; phiếu này KHÔNG xử lý, chỉ không thêm đường mới.)
8. **Phép đo prod (chỉ đọc)** `ops/bin/do-goi-y-gan.mjs` — chạy `dsViecChuyen` cho **mọi team** trên CSDL được chỉ
   (trong `BEGIN READ ONLY`), in: đếm theo trạng thái × team · số page có gợi ý điểm cao nhất ≥ ngưỡng · 10 dòng mẫu
   (page → món gợi ý · loại). Tổng chạy trên prod; thợ chạy trên bản thử.

**Giữ phạm vi marketer (LL15d, đang chạy trên prod — phiên ai-chatbot-c7 dặn 02/10):** `kho-goc.js` giữ nguyên
`chanNgoaiPhamVi` ở `chiTietGoc` · `suaKienThucGoc` · `lichSuGoc` và `phamVi` ở `manSanPhamGoc`;
`kho-san-pham.js#pageCuaTeam` giữ bộ lọc `maGocCuaPhamVi`. Phiếu này KHÔNG đụng `kho-san-pham.js`.

## ③ File được đụng

```
db/migrate/032_doi_soat_ban_sao.up.sql
db/migrate/032_doi_soat_ban_sao.down.sql
docs/v3/ban-giao/luoc-do-v1.md
src/products/chuyen-ban-sao.js
v3/src/audit/hanh-dong.js
v3/chay-that.js
v3/src/ui/san-pham/kho-goc.js
v3/src/ui/san-pham/router.js
v3/src/ui/san-pham/trang/san-pham.html
test/gsp2-*.test.mjs
v3/test/b/gsp2-*.test.mjs
ops/bin/nghiem-thu/gsp2.sh
ops/bin/do-goi-y-gan.mjs
docs/v3/03-MAN-HINH.md
```
`hanh-dong.js`: hành động mới thêm ở CẢ BA chỗ của tệp (bảng `HANH_DONG` · nhóm `san_pham` · câu mô tả). Nếu bộ ca
đối chiếu danh mục (`audit-ghi.test.mjs` hay tương tự) đỏ vì hành động mới ⇒ dừng, báo tổng (tệp ngoài ③).
`03-MAN-HINH.md`: chỉ dòng **Sản phẩm** — một câu «**GSP2 (…):** danh sách việc chuyển tạm (CR-02-10b), gỡ ở GSP5».
`GET /api/san-pham` + `kho-san-pham.js` KHÔNG gỡ ở phiếu này (GSP5).

## ④ Nghiệm thu (viết trước — thợ đóng gói `ops/bin/nghiem-thu/gsp2.sh`, rc=0 khi đạt)

Dựng trên CSDL thử: team T, shop S1 (Saudi) + S2 (UAE) đã kéo. Món POS: `S1:x` (SKU 101, thuộc gốc G1, CHƯA giá) ·
`S1:y` + `S2:y` (SKU 202, chưa gốc) · `S1:w` (SKU 404, gốc G4 đã có món `S2:w` nhưng `S1:w` CHƯA nối) · `S1:z` (SKU 303,
thuộc G3, CÓ giá). Page: A «Gold Ring X Saudi» (S1, bản sao 2 bậc SAR, khớp `S1:x`) · B «Fitgum Y Saudi» (S1, khớp
`S1:y`) · W «Lucky W Saudi» (S1, khớp `S1:w`) · C (chưa shop) · D (ĐÃ gắn G3 × S1, bản sao chưa quyết) · E (đã gắn G3 ×
S1, bản sao `doi_soat='chep'`) · P1 + P2 (cùng gắn G3 × S1, bản sao giá KHÁC nhau, chưa quyết). Team T2 có 1 page bản sao.
1. `GET /api/san-pham/chuyen` (quản trị T) ⇒ A `chua_gan`, gợi ý 1 = `S1:x` `loai:goc` G1 · B `chua_gan`, gợi ý 1 = `S1:y`
   `loai:moi` SKU 202 · W `chua_gan`, gợi ý 1 = `S1:w` `loai:noi` `gocTheoSku` = G4 · C `chua_gan`, `shop` null, `goiY`
   rỗng · **D `cho_doi_soat` dù `S1:z` CÓ giá** · **P1, P2 cùng `cho_doi_soat`** · E KHÔNG có mặt · page của T2 không lộ ·
   `dem.chuaXong = 7`. Marketer ⇒ 403.
2. Gắn A vào G1 ⇒ A `cho_doi_soat`, `chuaXong` vẫn 7; nhật ký hai dòng `GAN_SAN_PHAM_GOC`; số lời gọi đẩy bản chép = 0.
3. «Gộp SKU 202 rồi gắn» cho B ⇒ gốc mới `sku`=202 mang ĐỦ `S1:y` + `S2:y`; B gắn gốc mới × S1 ⇒ `cho_doi_soat`.
4. «Nối món vào G4 rồi gắn» cho W ⇒ `S1:w.ma_goc` = G4, W gắn G4 × S1 ⇒ `cho_doi_soat`; KHÔNG sinh gốc mới (đếm
   `san_pham_goc` +0) — đường gộp sẽ 409 `trung`, nên đây là ca bắt nhánh `noi`.
5. C chọn shop S1 + gắn G3 ⇒ **C `cho_doi_soat`** (KHÔNG rời danh sách dù `S1:z` có giá).
6. «Không chuyển» cho một page `chua_gan` ⇒ `bo_qua`, `chuaXong` giảm 1, nhật ký có lý do; «Bỏ quyết định» ⇒ về
   `chua_gan`. «Không chuyển» page đang gắn ⇒ 409. Page `bo_qua` rồi được gắn (qua khung «+ Gắn page» của sản phẩm) ⇒
   `cho_doi_soat`, `chuaXong` tăng 1.
6b. **Gắn lại (G2-C1b):** E (đã `xong`: bản sao `chep` với `doi_soat_goc`=G3, `doi_soat_shop`=S1) bị gắn lại sang G1 × S1 qua
   cửa gắn ⇒ E `cho_doi_soat`; gắn E về lại G3 × S1 ⇒ E `xong` (quyết định cũ còn đúng gốc × shop).
7. Phạm vi marketer (LL15d): marketer M phụ trách G1 (mã NV) — trước khi gắn A, M không thấy A (trang page / cột page ⇒
   403 hoặc vắng); sau khi gắn A vào G1, M thấy A. Marketer N phụ trách gốc khác vẫn không thấy A.
8. `chamGoiY` thuần: ≥6 cặp tên thật từ đo prod (CR 5d) cho điểm đúng thứ tự mong đợi; tên trống ⇒ 0.
9. Lưới migration: chạy `dsViecChuyen` trên CSDL CHƯA áp 032 ⇒ không ném, mọi bản sao coi là chưa quyết.
10. Trang: không còn chuỗi «Dữ liệu hôm nay còn nằm theo page»; ô lưu ý đọc `dem.chuaXong`; đường `/api/san-pham/chuyen`
    không bị `/api/san-pham/:id` nuốt (gọi thật ra JSON đúng hình dạng).
11. Đảo-vá: (i) đổi `cho_doi_soat` về điều kiện «món chưa có giá» ⇒ phép 1 (D, P1, P2) + phép 5 đỏ; (ii) cho marketer qua ⇒
    phép 1 đỏ; (iii) thêm lời gọi đẩy sau gắn ⇒ phép 2 đỏ; (iv) bỏ nhánh `noi` (đi đường gộp) ⇒ phép 4 đỏ; (v) bỏ so `doi_soat_goc`/`doi_soat_shop` trong `daQuyet` ⇒ phép 6b đỏ;
    (vi) cho `bo_qua` có hiệu lực cả khi page đã gắn ⇒ phép 6 (vế gắn sau `bo_qua`) đỏ.
12. Bộ ca canh phạm vi LL15d xanh, chạy RIÊNG và ghi số vào nhật ký: `test/ll15d-marketer-san-pham.test.mjs` ·
    `v3/test/b/ll15d-marketer-man.test.mjs` · cổng `ops/bin/nghiem-thu/ll15d.sh`.
13. Cổng cũ cùng màn xanh (rc tách dòng): `ll13.sh` · `ve1.sh` · `ve8a.sh` · `ve8b.sh` · `gsp1.sh`. `npm test` không thêm ca
    đỏ so với mốc base.

**Luật cổng (bài học GSP1, 02/10):** (a) đảo-vá KHÔNG được sửa tệp trong cây làm việc chung — đột biến trên BẢN SAO tạm (thư mục tạm / `git worktree` tạm / tiêm phụ thuộc giả), để hai lượt cổng chạy chồng không làm hỏng cây của nhau (GSP1: chạy chồng để lại `router.js` mang route giả); (b) cổng bash dựng hộp cát riêng thì đặt `DB="aicloser_v3_nt_<mã>_p$$"` — thước `test/hop-cat-ten.test.mjs` T4 quét mọi cổng (phiên LL15, `8aed3fc`).

## ⑤ Test chạm nhánh nào

`test/gsp2-*.test.mjs` (tầng A trên Postgres thử: `dsViecChuyen` mọi trạng thái, `boQuaPage`/`huyBoQua`, lưới 032,
`chamGoiY` thuần) · `v3/test/b/gsp2-*.test.mjs` (cửa · vai · màn · thứ tự route). Nhánh: bốn trạng thái · shop null · 2
bản sao trên một page (page `xong` chỉ khi CẢ HAI có quyết định) · gốc có món ở shop khác shop của page (gắn ⇒ 409
`shop_ngoai_san_pham`, màn nói ra) · team khác không lộ · ba loại gợi ý.

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ, cấm tiện tay sửa

Đối soát + chép giá / ảnh (GSP3) · khoá trang page sửa bản sao + bộ đọc `chay-that.js:408` (GSP3b) · bỏ đường đọc
`page_id` / chốt handler (GSP4) · gỡ `GET /api/san-pham` và màn (GSP5) · gắn hàng loạt nhiều page một lượt (nếu cần ⇒ nợ
mới) · SKU cho «Diamond Halo set» (N-GSP-DIAMOND).

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "bản sao theo page\|N-MN8\|ganPage\|gắn page\|N-GSP\|N-MK-GAN"
994:  - **N-MN8a** team Tiểu Alpha chỉ BẬT kết nối POS Kuwait; ... ⇒ 60+ page không nối được món POS ...
995:  - **N-MN8b** tạo đơn tự động chưa dùng `san_pham.pos_ma` — ...
996:  - **N-MN8c** 75/79 sản phẩm chưa tên — ...
1027:  - **N-DANHMUC-GOC** `san_pham_goc` prod = 0 dòng ⇒ chưa gắn page ↔ sản phẩm được; ...
1079:  - **N-MK-GAN-HANG-LOAT** chưa có «gán marketer theo gợi ý cho mọi sản phẩm chưa gán» — ...
1086:  - **N-GSP-XOA-BAN-SAO** ... · N-GSP-DIAMOND · N-GSP-TEAM-KT · N-GSP-KB-OVERRIDES · N-GSP-GHI-DE-PAGE
```
Quan hệ: **trả nợ N-DANHMUC-GOC** (sổ §9 dòng nợ CR-02-10b ghi «thành việc của GSP2»); N-MN8a hết hiệu lực (đo 02/10:
7/7 shop của Pialpha GCC đã kéo); N-GSP-TEAM-KT có đường giải quyết (quản trị team kỹ thuật dùng chính màn này:
gắn hoặc «không chuyển»). Còn lại **mới**.
