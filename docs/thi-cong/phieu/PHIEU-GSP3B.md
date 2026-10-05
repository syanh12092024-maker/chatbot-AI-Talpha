# PHIẾU GSP3b — Trang page đọc đúng thứ bot đọc; khoá sửa bản sao của page đã gắn

**Base:** `307c79b` · **Làn:** 🟥 (đụng cửa lưu sản phẩm + ảnh — `saveProduct` ghi `goi_gia`, đẩy bản chép bot đọc)
**Nguồn:** CR-02-10b mục 2 lớp 4 (dòng trang một page — bộ đọc bản đầu CR bỏ sót) · **mục 5e** · mục 5 dòng GSP3b · `01-QUYET-DINH.md` §8 «Page phải gắn sản phẩm» («Mọi thứ quyết định một page trả lời thế nào nằm trên một màn» + không giá riêng theo page) · sổ §5h
**Đụng bộ não:** không.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review` (đường tiền).

## ① Thi hành đoạn nào

Review (a) G2-N1: trang một page (tab «SP & giá», ảnh) và màn Prompt đọc sản phẩm qua `docKhoi.sanPham` =
`v3/chay-that.js:408` `rap.docSanPhamGoiGia(pool, teamId, pageRowId)` — **KHÔNG truyền `trang`** ⇒ luôn nhánh `page_id`
(bản sao), kể cả page đã gắn gốc × shop. Hệ quả trên một page đã gắn (sau GSP2): (i) màn nói page bán bản sao trong khi
bot / cửa tiền / cổng bật đọc món POS — hai sự thật trên một page; (ii) marketer sửa giá bản sao ở tab ⇒ `saveProduct` →
`daySanPhamSangBot(bản sao)` → `pageBanSanPham` trả page qua `page_id` → `dayPageSangBot` đọc **món POS** (có thể chưa
giá) ⇒ bản chép bot mất giá, còn màn báo «đã lưu». Phiếu này đóng cả hai. Phải cùng đợt deploy với GSP1–GSP3.

## ② Hợp đồng vào / ra

**Vào:** `kho-mot-page.js#noiDungPage` (`:222-246`) gọi `_docKhoi.sanPham(bc.teamId, p.id)` rồi `_docKhoi.sua(bc, ids)` lấy
bản sửa được; `prompt-page/kho-prompt.js:175` gọi cùng bộ đọc. Cửa lưu từ trang page: `POST /api/anh-san-pham/san-pham/:spId`
(`router-anh.js` → `saveProduct` ĐẦY ĐỦ, không chỉ-giá) · ảnh `POST /api/anh-san-pham/:spId/tai-len` · `/:spId/link` ·
`/anh/:id` · `DELETE /anh/:id` · `/:spId/thu-tu` · **`POST /api/anh-san-pham/pos/:spId`** (nối bản sao ↔ món POS, MN8 —
cũng đẩy bản sao sang bot theo cùng chuỗi; review (a) vòng 2). Cửa lưu của Vận hành: `POST /api/van-hanh/products/:id` (`van-hanh/router.js:180`).

**Ra:**
1. **Bộ đọc trang page = bộ đọc của bot:** `docKhoi.sanPham` đọc dòng `page` rồi gọi
   `rap.docSanPhamGoiGia(pool, teamId, pageRowId, trang)` — page đã gắn gốc + shop ⇒ món POS của gốc ở shop (đúng thứ
   `catalog.js` trả cho bot, cửa tiền, cổng bật); page chưa gắn ⇒ như hôm nay (bản sao) tới GSP4. Màn Prompt nhận theo.
2. **Tab «SP & giá» + ảnh của page ĐÃ GẮN = CHỈ XEM:** không nút lưu / tải ảnh / xếp ảnh; một dòng nói «Page này bán «G» ở
   «thị trường». Giá + ảnh sửa ở Sản phẩm › «G» › Theo thị trường — sửa ở đó là sửa cho MỌI page cùng sản phẩm ở thị trường
   này» + nút sang đúng chỗ (`/san-pham?sp=<id>&tab=thi-truong` hay đường hiện có). Page chưa gắn: giữ nguyên hành vi hôm nay.
3. **Chốt máy chủ** — helper `src/products/chuyen-ban-sao.js#chanBanSaoDaChuyen(db, teamId, sanPhamId)`: dòng `san_pham`
   `nguon <> 'pos'` mà page của nó (`san_pham.page_id`) đã gắn gốc ⇒ ném 409 `ban_sao_da_chuyen` (kèm tên gốc + lối sang).
   Gọi ở MỌI cửa lưu liệt kê ở «Vào» (ảnh `/anh/:id` tra `san_pham_id` từ dòng ảnh trước), TRƯỚC khi ghi — 0 dòng đổi, 0 lời
   gọi đẩy. Dòng `nguon='pos'` và dòng bản sao của page CHƯA gắn đi qua như cũ.
4. **Đo trước, rồi mới chặn món POS qua cửa ĐẦY ĐỦ:** `grep` màn nào gọi `POST /api/anh-san-pham/san-pham/:spId` hoặc
   `POST /api/van-hanh/products/:id` với id món POS. Không màn nào ⇒ hai cửa đó từ chối dòng `nguon='pos'` (409
   `mon_pos_sua_o_san_pham` — lưu ĐẦY ĐỦ ghi đè tên/mô tả món của POS; giá món chỉ sửa chỉ-giá ở Sản phẩm, VE8b). Có màn
   gọi ⇒ KHÔNG chặn, dừng, ghi vào nhật ký + báo tổng.
5. Không đụng cửa ảnh của món POS mà màn Sản phẩm dùng; không đụng `luuGia` (chỉ-giá).

## ③ File được đụng

```
src/products/chuyen-ban-sao.js
v3/chay-that.js
v3/src/ui/van-hanh/router.js
v3/src/ui/van-hanh/router-anh.js
v3/src/ui/mot-page/trang/mot-page.html
v3/src/ui/mot-page/kho-mot-page.js
test/gsp3b-*.test.mjs
v3/test/b/gsp3b-*.test.mjs
ops/bin/nghiem-thu/gsp3b.sh
docs/v3/03-MAN-HINH.md
```
`03-MAN-HINH.md`: chỉ dòng **Page** — «SP & giá (kế thừa, ghi đè có chủ ý)» → «SP & giá (kế thừa từ sản phẩm × thị trường;
page đã gắn chỉ xem, sửa ở Sản phẩm › Theo thị trường — GSP3b, CR-02-10b)».

## ④ Nghiệm thu (viết trước — thợ đóng gói `ops/bin/nghiem-thu/gsp3b.sh`, rc=0 khi đạt)

Dựng: page A gắn G × S1 (món `S1:x` có 2 bậc), A còn bản sao `kb:A:SP01` (bậc khác); page B chưa gắn, có bản sao.
`day` giả đếm lời gọi.
1. `GET /api/page/<A>/noi-dung` ⇒ `sanPham` = đúng `S1:x` với 2 bậc của món — **bằng hệt** `catalog.js#docSanPhamGoiGia(…,
   trangA)` (so trọn mảng); B ⇒ bản sao của B như hôm nay. Màn Prompt của A mang khối sản phẩm của `S1:x`.
2. Lưu bản sao `kb:A:SP01` qua `POST /api/anh-san-pham/san-pham/:spId` ⇒ 409 `ban_sao_da_chuyen`; `goi_gia` của bản sao và của
   `S1:x` trước = sau; `day` 0 lần. Cùng phép qua `POST /api/van-hanh/products/:id`, từng cửa ảnh (tải lên · link · sửa nhãn ·
   xoá · xếp) và `POST /api/anh-san-pham/pos/:spId` ⇒ 409, 0 đổi.
3. Lưu bản sao của B ⇒ thành như hôm nay, `day` gọi cho B (không vỡ đường cũ).
4. (nếu mục ② 4 chặn) lưu ĐẦY ĐỦ `S1:x` qua hai cửa ⇒ 409 `mon_pos_sua_o_san_pham`, 0 đổi; `luuGia` chỉ-giá trên `S1:x` vẫn thành.
5. Trang A: không còn nút lưu / tải ảnh trong tab «SP & giá»; có câu «sửa ở Sản phẩm» + nút sang. Trang B: nút còn.
6. Đảo-vá: bỏ truyền `trang` ⇒ phép 1 đỏ; bỏ chốt ở một cửa ⇒ phép 2 đỏ đúng cửa đó.
7. Bộ ca canh phạm vi LL15d xanh, chạy RIÊNG và ghi số vào nhật ký: `test/ll15d-marketer-san-pham.test.mjs` ·
   `v3/test/b/ll15d-marketer-man.test.mjs` · cổng `ops/bin/nghiem-thu/ll15d.sh`.
8. Cổng xanh (rc tách dòng): `gsp1.sh` · `gsp2.sh` · `gsp3.sh` · `ve2.sh` · `ve2b.sh` · `ve8b.sh` · `va-r2.sh`. `npm test` không
   thêm ca đỏ so với mốc base.

**Luật cổng (bài học GSP1, 02/10):** (a) đảo-vá KHÔNG được sửa tệp trong cây làm việc chung — đột biến trên BẢN SAO tạm (thư mục tạm / `git worktree` tạm / tiêm phụ thuộc giả), để hai lượt cổng chạy chồng không làm hỏng cây của nhau (GSP1: chạy chồng để lại `router.js` mang route giả); (b) cổng bash dựng hộp cát riêng thì đặt `DB="aicloser_v3_nt_<mã>_p$$"` — thước `test/hop-cat-ten.test.mjs` T4 quét mọi cổng (phiên LL15, `8aed3fc`).

## ⑤ Test chạm nhánh nào

`test/gsp3b-*.test.mjs` (helper chốt trên Postgres thử: bản sao page gắn / chưa gắn / món POS) · `v3/test/b/gsp3b-*.test.mjs`
(cửa · trang page · màn Prompt). Ca cũ của trang page dựng page CHƯA gắn ⇒ phải xanh nguyên.

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ, cấm tiện tay sửa

Bỏ nhánh `page_id` khỏi bộ đọc chung + chốt handler (GSP4) · gỡ màn bản sao (GSP5) · các màn con của Page chưa lọc phạm vi
marketer (N-MK-LOC-PAGE-CON) · dọn `kb-overrides.json` (N-GSP-KB-OVERRIDES).

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-GSP-KB\|N-MK-LOC-PAGE-CON\|docKhoi\|trang page"
(N-MK-LOC-PAGE-CON) các màn con của Page (kịch bản · ảnh · prompt · lên chạy · hiệu quả) chưa lọc theo phạm vi marketer.
(N-GSP-KB-OVERRIDES) page không gắn gốc thì bản chép cũ trong `kb-overrides.json` đứng nguyên (ca BC10, cố ý). ...
```
Quan hệ: **mới** (review (a) G2-N1 bắt — CR bản đầu bỏ sót bộ đọc này). Cạnh N-MK-LOC-PAGE-CON (không giải quyết ở đây).
