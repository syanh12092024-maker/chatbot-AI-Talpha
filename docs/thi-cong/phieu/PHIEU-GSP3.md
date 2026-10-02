# PHIẾU GSP3 — Đối soát giá + ảnh của bản sao theo đơn vị GỐC × SHOP

**Base:** `ĐẶT-LÚC-PHÁT` · **Làn:** 🟥 (ghi `goi_gia` — bảng cửa tiền `cua2Tien` / duyệt đơn đọc; ghi bản chép bot đọc)
**Nguồn:** CR-02-10b mục 3 «Rủi ro mới 2 · 3» · mục 5 dòng GSP3 · **mục 5e (sửa sau review (a))** · mục 6 · `01-QUYET-DINH.md` §8 «Page phải gắn sản phẩm» (không giá riêng theo page — mọi page cùng gốc × shop chung MỘT bảng giá) · sổ §5h
**Đụng bộ não:** không.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review` (đường tiền).

## ① Thi hành đoạn nào

CR-02-10b mục 5 dòng GSP3 + mục 5e. Đo prod 02/10 (CR 5d): giá và ảnh CHỈ nằm ở bản sao — 0/491 món POS có giá · 78
bản sao giữ 154 bậc (6 tiền tệ AED BHD KWD OMR QAR SAR) + 536 ảnh. GSP4 bỏ đường đọc bản sao ⇒ chưa đối soát là page mất
cả giá lẫn ảnh. Người quyết: **bỏ giá riêng theo page**.

**Bài học review (a) G3-C1 — đọc kỹ:** đơn vị một lượt KHÔNG phải một page. Nhiều page cùng gắn một gốc × shop; nếu chép
theo page thì page bấm trước thắng ngầm, rồi `saveProduct` đẩy giá đó sang bot + cửa tiền của mọi page anh em mà không ai
chọn. **Một lượt = một gốc × một shop; bảng giá khác nhau ⇒ người chọn.**

## ② Hợp đồng vào / ra

**Vào:** GSP2 — cột `san_pham.doi_soat` · `doi_soat_goc` · `doi_soat_shop` (migration 032), vị từ DÙNG CHUNG
`chuyen-ban-sao.js#daQuyet(banSao, page)` (quyết định chỉ có hiệu lực với ĐÚNG gốc × shop page đang gắn — review (a) vòng 2
G2-C1b), trạng thái page `cho_doi_soat`. «Bản sao chưa quyết» ở MỌI chỗ trong phiếu này = `!daQuyet(...)` — cấm viết lại
điều kiện. Cửa lưu giá ĐÃ CÓ, phải DÙNG LẠI, cấm đường ghi giá thứ hai: `khoSanPhamGoc.luuGia`
(`v3/chay-that.js:335`) → `src/admin-v3/operations.js#saveProduct(pool, bc, monId, {offers, version}, { chiGia: true,
sauKhiLuu: taoBuocDayBot({ day }) })` — kiểm bậc, XOÁ-rồi-CHÈN `goi_gia`, `gia_tay`, chụp `truoc/sau` trong giao dịch,
đẩy bản chép tới MỌI page bán món; đẩy hỏng ⇒ lượt lưu không thành (MN3). `offers` nhận đơn vị LỚN (`price` · `gia_goc` ·
`phi_ship`), `bat` vắng = true (`operations.js:293`). Đẩy không kèm ghi giá: `src/products/ban-chep-bot.js#daySanPhamSangBot`.
Ghi ảnh: `src/products/anh-san-pham.js#themAnh(pool, teamId, spId, {duong, nhan, nguon})` — luôn nối CUỐI (không nhận
`thu_tu`), UNIQUE `(san_pham_id, duong)`.

**Ra:**
1. **Bộ đọc** `chuyen-ban-sao.js#donViDoiSoat(pool, teamId, gocId, shopId)` ⇒
   `{ goc, shop: {id, market, tienTe|null}, mon: [{posMa, id, ten, bac: [...đủ cột], anh: [...]}],
      banSao: [{id, pageId, tenPage, marketerPage, bac: [...đủ cột], anh: [...], doiSoat}],
      pageChuaGanCungMon: [{pageId, ten}],   // page `chua_gan` có gợi ý số 1 trỏ món của đơn vị — báo trước, không chặn
      bangKhacNhau: [{bac, banSaoIds, laGiaMon}] }`.
   «Bảng» so trên **trọn hàng `goi_gia` trừ `id`/`san_pham_id`/`team_id`** (số lượng · giá · tiền tệ · nhãn · `bat` · `gia_goc` ·
   `khuyen_mai` · `phi_ship` · `mien_ship`), xếp theo `so_luong`.
2. **Cửa** `GET /api/san-pham/chuyen/doi-soat?gocId=&shopId=` (đọc) · `POST /api/san-pham/chuyen/doi-soat` thân
   `{ gocId, shopId, cap?: [{banSaoId, posMa}], chon?: { <posMa>: { banSaoId } | 'giu_gia_mon' } }` (vai quản trị). Đường đứng
   TRƯỚC `GET /api/san-pham/:id`. Hàm mới của `khoSanPhamGoc` là TUỲ CHỌN trong `datKhoGoc`.
3. **Kiểm trước — KHÔNG ghi gì nếu một điều sai**, 409 kèm dữ liệu để màn hiện cho người chọn:
   - CSDL chưa áp 032 ⇒ `chua_ap_032` (phiếu này GHI cột đó — không có thì không chạy, không nửa vời);
   - không còn bản sao chưa quyết trong đơn vị ⇒ 200 `{ daXong: true }`, không ghi (bất biến lặp);
   - gốc có >1 món ở shop và `cap` không phủ MỌI bản sao chưa quyết ⇒ `can_chon_mon` (kèm món + bản sao); gốc có đúng 1 món ⇒
     mọi bản sao cặp với món đó;
   - thị trường của shop không có trong bảng thị trường → tiền tệ (hằng MỚI trong module: Saudi SAR · UAE AED · Kuwait KWD ·
     Qatar QAR · Oman OMR · Bahrain BHD) ⇒ `thi_truong_la` — dừng, không đoán. **Taiwan ⇒ `thi_truong_la`** (`HE_SO_TE`
     ở `tao-don.js:130-139` không có TWD, `saveProduct` sẽ từ chối);
   - bậc của một bản sao mang tiền tệ ≠ tiền tệ thị trường ⇒ `lech_tien_te`;
   - với MỖI món đích: tập «bảng» = bảng của các bản sao cặp vào nó ∪ bảng món đang có (nếu có). **>1 bảng khác nhau mà
     `chon[posMa]` vắng ⇒ `lech_gia_giua_page`** — kèm từng bảng: page nào, marketer page nào, có phải giá món đang có, và danh
     sách MỌI page sẽ đổi giá theo lựa chọn (gồm page đã `xong` cùng bán món). `chon[posMa] = 'giu_gia_mon'` khi món chưa có
     giá ⇒ 409 `khong_co_gia_mon`.
4. **Ghi**, theo thứ tự, cho từng món đích:
   a. Ảnh: hợp ảnh của mọi bản sao cặp vào món — theo thứ tự page rồi `thu_tu` — bỏ `duong` món đã có, `themAnh(..., nguon:
      'kb')` lần lượt (giữ thứ tự bằng thứ tự chèn). Gom id vừa chèn.
   b. Giá: đúng một bảng thắng (bảng duy nhất, hoặc bảng của `chon[posMa].banSaoId`). Bảng thắng ≠ bảng món ⇒ ghi qua
      `luuGia`/`saveProduct` CHỈ-GIÁ với `offers` chép **ĐỦ mọi cột bậc, kể cả bậc tắt (`bat:false`), ưu đãi, ship** — quy nhỏ→lớn
      cho `price` · `gia_goc` · `phi_ship` bằng `HE_SO_TE`. Lời gọi này đẩy bản chép (ảnh ở bước a đã nằm trong CSDL).
      Bảng thắng = bảng món (giống hệt, hoặc `giu_gia_mon`) ⇒ KHÔNG ghi giá, nhưng **VẪN đẩy bản chép một lần** qua
      `daySanPhamSangBot` (review (a) G3-N1: không đẩy là ảnh vào CSDL mà bot không có).
   c. Đẩy hỏng (bước b ném) ⇒ giá không ghi (MN3) VÀ gỡ đúng các ảnh id gom ở bước a; trả lỗi rõ. Gỡ ảnh cũng hỏng ⇒ trả lỗi
      nói «nửa vời: N ảnh còn trên món», nhật ký ghi lại — KHÔNG im.
5. **Đánh dấu** chỉ khi mọi món của lượt đã xong bước b: một câu UPDATE đặt `doi_soat` + `doi_soat_luc=now()` +
   **`doi_soat_goc` = mã gốc + `doi_soat_shop` = shop của đơn vị** cho mọi bản sao chưa quyết của đơn vị — `chep` cho bản sao có bảng được ghi lên món, `giu_gia_mon` cho các bản sao còn lại. KHÔNG đặt
   `pos_ma` (tránh kéo theo đồng bộ hết hàng MN8 lên dòng lưu trữ).
6. **Nhật ký** hành động mới (vd `DOI_SOAT_BAN_SAO`) ở sản phẩm + từng page của đơn vị: món đích · bảng thắng (của page nào /
   giá món) · bảng cũ của món nếu bị đổi · danh sách page đổi giá · số ảnh thêm. Đường lùi KHÔNG dựa vào id trong nhật ký
   (`saveProduct` xoá-rồi-chèn ⇒ id mất nghĩa): giá lùi theo «bảng cũ» (`saveProduct` đã chụp `truoc` trong giao dịch); ảnh
   lùi theo dấu `nguon='kb'` trên món; trạng thái lùi bằng đặt `doi_soat` về NULL.
7. **Bản sao giữ NGUYÊN** — chỉ thêm `doi_soat`/`doi_soat_luc`; không sửa bậc, ảnh, tên, không xoá dòng `nguon='kb'`.
8. **Màn**: dòng `cho_doi_soat` (GSP2) có nút **«Đối soát giá + ảnh cho «G» · «shop»»** mở khung đơn vị: bảng từng page cạnh
   nhau (khác nhau tô ra), giá món đang có, ảnh gom, cảnh báo `pageChuaGanCungMon`; >1 món ⇒ chọn cặp bản sao → món;
   lệch ⇒ chọn một bảng (hoặc giữ giá món) và thấy danh sách page sẽ đổi giá trước khi bấm. Xong ⇒ mọi page của đơn vị sang
   `xong`, bộ đếm giảm đúng số page đó.

**Giữ phạm vi marketer (LL15d, đang chạy trên prod — phiên ai-chatbot-c7 dặn 02/10):** `kho-goc.js` giữ nguyên
`chanNgoaiPhamVi` ở `chiTietGoc` · `suaKienThucGoc` · `lichSuGoc` và `phamVi` ở `manSanPhamGoc`;
`kho-san-pham.js#pageCuaTeam` giữ bộ lọc `maGocCuaPhamVi`.

## ③ File được đụng

```
src/products/chuyen-ban-sao.js
v3/src/audit/hanh-dong.js
v3/chay-that.js
v3/src/ui/san-pham/kho-goc.js
v3/src/ui/san-pham/router.js
v3/src/ui/san-pham/trang/san-pham.html
test/gsp3-*.test.mjs
v3/test/b/gsp3-*.test.mjs
ops/bin/nghiem-thu/gsp3.sh
```
`hanh-dong.js`: hành động mới thêm ở CẢ BA chỗ (bảng `HANH_DONG` · nhóm `san_pham` · câu mô tả). KHÔNG sửa
`src/admin-v3/operations.js`, `src/products/anh-san-pham.js`, `src/products/ban-chep-bot.js` — cần đổi gì ở đó ⇒ dừng, báo tổng.

## ④ Nghiệm thu (viết trước — thợ đóng gói `ops/bin/nghiem-thu/gsp3.sh`, rc=0 khi đạt)

Dựng: team T, shop S1 (Saudi). Gốc G có đúng 1 món `S1:x` (chưa giá). Page P1, P2 cùng gắn G × S1; bản sao P1: 1×199 SAR,
2×299 SAR (bậc 2 có `phi_ship`), bậc 3×399 **`bat:false`**, 3 ảnh; bản sao P2: 1×249, 2×349 SAR, 2 ảnh (1 trùng `duong` với
P1). Gốc H có 2 món ở S1. Page Q gắn gốc K × S1 với `S1:k` CÓ giá giống hệt bản sao Q. `day` giả đếm lời gọi theo page + giữ
thứ nó nhận.
1. `POST doi-soat {G, S1}` không `chon` ⇒ 409 `lech_gia_giua_page`, kèm hai bảng + marketer + danh sách page; **0 `goi_gia`, 0
   ảnh mới, `day` 0 lần, `doi_soat` NULL cả hai.**
2. Gọi lại `chon: {'S1:x': {banSaoId: P1}}` ⇒ `goi_gia` của `S1:x` ≡ bảng P1 **trên trọn hàng** (gồm bậc 3 `bat=false`, `phi_ship`
   bậc 2), `gia_tay=true`; ảnh trên `S1:x` = 4 (3 + 2 − 1 trùng), `nguon='kb'`, thứ tự P1 rồi P2; `day` gọi đúng 1 lần cho MỖI page
   bán món (P1, P2) và products mang đủ bậc + 4 ảnh; P1 `doi_soat='chep'`, P2 `'giu_gia_mon'`; bản sao nguyên vẹn (băm dòng +
   bậc + ảnh trước = sau); nhật ký có danh sách page đổi giá.
3. `cua2Tien` cho P2 với đơn 2 × 299 SAR ⇒ MỞ; 2 × 349 ⇒ ĐÓNG; bậc 3 × 399 (tắt) ⇒ ĐÓNG (đường tiền đọc đúng bảng vừa chép).
4. Gọi lại lần ba ⇒ `{daXong:true}`, 0 dòng mới, `day` không gọi thêm. Dấu của P1, P2 mang `doi_soat_goc`=G,
   `doi_soat_shop`=S1. Gắn lại P2 sang gốc khác ⇒ P2 vào đơn vị mới như «chưa quyết» (đo bằng `donViDoiSoat` của đơn vị mới).
5. Q (giá món giống hệt) ⇒ KHÔNG gọi `saveProduct`, ảnh Q vào `S1:k`, **`day` vẫn gọi 1 lần** cho Q, Q `giu_gia_mon`.
6. H (2 món) không `cap` ⇒ 409 `can_chon_mon`, 0 ghi; có `cap` đủ ⇒ thành, mỗi món nhận đúng bản sao cặp vào nó.
7. Bậc AED trên shop Saudi ⇒ 409 `lech_tien_te`, 0 ghi. Shop Taiwan ⇒ 409 `thi_truong_la`, 0 ghi.
8. `day` ném ⇒ 0 `goi_gia` đổi VÀ 0 `anh_san_pham` mới của lượt, `doi_soat` NULL (không nửa vời).
9. CSDL chưa áp 032 ⇒ 409 `chua_ap_032`, 0 ghi. Marketer ⇒ 403. Team khác ⇒ 404.
10. Đảo-vá: (i) bỏ kiểm lệch giữa page ⇒ phép 1 đỏ; (ii) chép 4 cột thay vì trọn hàng ⇒ phép 2/3 đỏ (bậc tắt thành bật); (iii) bỏ
    đẩy ở nhánh giá giống hệt ⇒ phép 5 đỏ; (iv) bỏ gỡ ảnh khi đẩy hỏng ⇒ phép 8 đỏ; (v) đánh dấu theo page bấm thay vì cả đơn
    vị ⇒ phép 2 đỏ (P2 còn NULL).
11. Bộ ca canh phạm vi LL15d xanh, chạy RIÊNG và ghi số vào nhật ký: `test/ll15d-marketer-san-pham.test.mjs` ·
    `v3/test/b/ll15d-marketer-man.test.mjs` · cổng `ops/bin/nghiem-thu/ll15d.sh`.
12. Cổng xanh (rc tách dòng): `gsp1.sh` · `gsp2.sh` · `ve8b.sh` · `va-r2.sh` · `l3-m4.sh`. `npm test` không thêm ca đỏ so với
    mốc base.

## ⑤ Test chạm nhánh nào

`test/gsp3-*.test.mjs` (tầng A trên Postgres thử: mọi nhánh 409, ghi, lặp, hỏng-đẩy, gỡ-ảnh-hỏng, cửa tiền đọc lại, so trọn
hàng) · `v3/test/b/gsp3-*.test.mjs` (cửa · vai · màn: dòng `cho_doi_soat` có nút; khung đơn vị hiện bảng lệch + danh sách page
sẽ đổi giá; 409 hiện đúng câu cho người chọn).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ, cấm tiện tay sửa

Khoá trang page sửa bản sao + bộ đọc `chay-that.js:408` (GSP3b) · bỏ đường đọc `page_id` / chốt handler (GSP4) · xoá bản sao
(N-GSP-XOA-BAN-SAO) · đối soát hàng loạt nhiều gốc một lượt (nếu cần ⇒ nợ mới) · dọn `kb-overrides.json` (N-GSP-KB-OVERRIDES)
· ảnh link chết (đã có báo ở MN2) · TWD cho Taiwan (nếu cần ⇒ nợ mới).

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "gia_tay\|luuGia\|chép giá\|saveProduct\|N-GSP-XOA\|N-GSP-KB"
1086:  - **N-GSP-XOA-BAN-SAO** 78 dòng `san_pham nguon='kb'` + 154 bậc giá + 536 ảnh giữ làm lưu trữ sau GSP4; ...
1091:  - **N-GSP-KB-OVERRIDES** page không gắn gốc thì bản chép cũ trong `kb-overrides.json` đứng nguyên (ca BC10, cố ý). ...
```
Quan hệ: **mới**. Cạnh N-GSP-XOA-BAN-SAO (phiếu này KHÔNG xoá bản sao — đó là điều kiện để lùi được).
