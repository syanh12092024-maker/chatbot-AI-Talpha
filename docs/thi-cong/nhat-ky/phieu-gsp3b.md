# GSP3b — Trang page đọc đúng thứ bot đọc; khoá sửa bản sao của page đã gắn · 05/10/2026

Base `aa43268` (HEAD lúc nhận `6c2f8ef`, chỉ thêm docs điều hành) · commit code `3a84d76` + cổng `1382ef1` · làn 🟥 (cửa lưu sản phẩm + ảnh, `saveProduct`
ghi `goi_gia`, đẩy bản chép bot đọc) · thợ một phiên · skill `tho-thi-cong` + `viet-thuoc`, xong chạy `/code-review` (high).
Không push, không deploy, không SSH; `.env` giữ `PANCAKE_READONLY=1` (đếm: 1 dòng). Không đụng bộ não.

## ⑦ Đã tra (dán máy)

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-GSP-KB\|N-MK-LOC-PAGE-CON\|docKhoi\|trang page\|GSP3b\|N-GSP2-F3\|N-GSP3"
1078:  - **N-MK-LOC-PAGE-CON** các màn con của Page (kịch bản · ảnh · prompt · lên chạy · hiệu quả) chưa lọc theo phạm vi marketer.
1098:  - **N-GSP-KB-OVERRIDES** page không gắn gốc thì bản chép cũ trong `kb-overrides.json` đứng nguyên (ca BC10, cố ý). …
1119:  - **N-GSP2-F3 → ĐIỀU KIỆN GSP4** RF-15 gán `san_pham.page_id` cho MÓN POS khi shop có đúng 1 page …
1153:  - **N-GSP3-DAU-TOCTOU** … GSP3b khoá cửa sửa bản sao ⇒ còn phần gắn page. …
```
Không trùng nợ nào; phiếu mới (review (a) G2-N1). N-GSP2-F3 liên quan trực tiếp tới quyết định ② 4 (dưới).

## Bước 3 — đo lại nguyên liệu đề bài (lệch với chữ phiếu, ghi ra)

1. **Dòng nối không còn ở `:408`** — nay `v3/chay-that.js:434` (đề bài đúng nội dung, lệch số dòng).
2. **`docKhoi.sanPham` có HAI người gọi**: `kho-mot-page.js#noiDungPage` và `prompt-page/kho-prompt.js#promptCua` — sửa một chỗ ở
   `chay-that.js` là cả hai nhận `trang`. `kho-prompt.js` KHÔNG sửa (ngoài ③, và không cần).
3. **`san_pham.nguon` mặc định là `'pos'`** (`db/migrate/001_nen.up.sql:103`). Mọi «bản sao» của bộ ca cũ (`mn4-anh-router` …) chèn
   không ghi `nguon` ⇒ là dòng `nguon='pos'` mang `page_id`. Bản sao prod (nạp từ kb) mang `nguon='kb'`. Chốt dùng đúng vị từ của GSP2
   (`nguon <> 'pos'`), nên ca cũ (page chưa gắn) không bị chạm.
4. **Khoá ngoại 015** (`page_san_pham_goc_co_that`): `page.san_pham_goc_ma` không thể rỗng hay treo ⇒ «đã chuyển» ⟺ cột khác NULL.
5. **Cửa `POST /api/van-hanh/products/:id` không màn nào gọi** (tab «Sản phẩm & giá» của Vận hành đã gỡ ở VE8b — ca S8 canh). Màn DUY
   NHẤT gọi cửa lưu ĐẦY ĐỦ là trang page → `POST /api/anh-san-pham/san-pham/:spId`.

## Giả định / chọn lựa (luật 11 · 13)

- **«Page đã gắn» = `page.san_pham_goc_ma` khác NULL** (kể cả khi chưa có `pos_shop_id`), KHÔNG phải «gắn gốc + shop» như vị từ
  `daQuyet` của GSP2. Lý do: đó đúng điều kiện `catalog.js` bỏ nhánh `page_id` — từ lúc ấy bot không đọc bản sao nữa (gốc chưa shop ⇒
  bot đọc `[]`). Giá phải trả: page gắn gốc chưa chọn shop (CR đo 11 page) cũng bị khoá sửa bản sao ở trang page; câu chữ nói rõ «chưa
  chọn shop POS — gắn page vào một thị trường ở Sản phẩm › G › Page đang bán» và lối sang `tab=page`.
- **Thị trường trong câu** đọc `page.thi_truong` (cửa gắn `ganPageVaoGoc` ghi nó = `ket_noi_pos.market` của shop) + số shop. Không đọc
  `ket_noi_pos` ở trang page: bảng đó ngoài `BANG_NGHIEP_VU_CHUAN` của cổng truy vấn.
- **Bộ đọc đặt ở `chuyen-ban-sao.js#docSanPhamTrangPage`** (đọc dòng `page` → `docSanPhamGoiGia(db, teamId, trang.id, trang)` — chính hàm
  `rap` re-export), `chay-that.js` nối một dòng. Chọn thế thay vì viết thân ngay trong `chay-that.js` (như chữ phiếu ② 1) vì `chay-that.js`
  không khởi động được trong bộ ca: đặt ở tầng A thì ca + đảo-vá đo được CHÍNH hàm chạy thật; dòng nối do cổng ③ canh (phép hình dạng).
- **② 4 KHÔNG ÁP (dừng, báo tổng):** đo «màn nào gọi hai cửa ĐẦY ĐỦ với id món POS» — trang page gọi `POST /api/anh-san-pham/san-pham/:spId`
  với id lấy từ bộ đọc; với page CHƯA gắn bộ đọc đi nhánh `page_id`, nhánh này KHÔNG lọc `nguon` ⇒ trả cả món POS mang `page_id` (RF-15:
  shop có đúng một page — `src/pos/doc-danh-muc.js:73-87`; nợ N-GSP2-F3). Có màn gọi ⇒ theo phiếu: không chặn `mon_pos_sua_o_san_pham`.
  Ca D10 canh đường này (món RF-15 qua cửa trang page vẫn lưu được); cổng ③b canh tiền đề (≥1 màn gọi). Nợ N-GSP3B-MON-POS-CUA-DAY:
  chặn khi GSP4 bỏ nhánh `page_id` + RF-15.

## Đã làm (theo ② của phiếu)

- `src/products/chuyen-ban-sao.js` — CHỈ THÊM (cổng ③d: 0 dòng cũ bị sửa/xoá; GSP2/GSP3 nguyên):
  - `docSanPhamTrangPage(db, teamId, pageRowId)` — Ra 1.
  - `cauDaChuyen({...})` — câu + lối sang, MỘT bản cho cả 409 và dòng «chỉ xem» của màn.
  - `idSo(x, ten)` — id số chuẩn hoặc `null` khi vắng; dạng lạ ⇒ 400 `ma_khong_hop_le` (review CR1).
  - `chanBanSaoDaChuyen(db, teamId, sanPhamId)` — Ra 3: bản sao (`nguon <> 'pos'`) của page đã gắn ⇒ 409 `ban_sao_da_chuyen`
    (`duLieu`: maGoc · tenGoc · gocId · shopId · thiTruong · duongSua · cau · sanPhamId · pageId · pageFb). Câu đọc khoá dòng page
    `FOR SHARE OF p` (review CR2).
- `v3/chay-that.js` — `docKhoi.sanPham` = `chuyenBanSao.docSanPhamTrangPage(pool, …)` (trang page + màn Prompt cùng nhận).
- `v3/src/ui/van-hanh/router.js`:
  - `taoBuocDayBot` = **CỬA RA**: chốt ngay trước lời gọi đẩy, trong giao dịch ghi ⇒ ROLLBACK, 0 đẩy. Mọi cửa ghi đẩy bản chép đi qua
    đây (lưu sản phẩm · 5 cửa ảnh · nối món — cả cửa mai thêm). Món POS đi qua như cũ (GSP3 `luuGia`/`dayMon`, VE8b).
  - `POST /api/van-hanh/products/:id`: chốt đầu cửa TRƯỚC `saveProduct` (đúng mã trước mọi kiểm thân).
  - bộ xử lỗi: lỗi `LoiSanPhamGoc` mang `ma` + `duLieu`.
- `v3/src/ui/van-hanh/router-anh.js`: chốt đầu cửa ở cả bảy cửa ghi (lưu sản phẩm trước `saveProduct`; tải lên · link · sửa nhãn ·
  bỏ · xếp · nối món POS: đầu giao dịch, trước khi ghi). Cửa theo id ảnh tra `san_pham_id` từ dòng ảnh (`spCuaAnh`, id chuẩn qua
  `idSo`). Bộ xử lỗi: `LoiSanPhamGoc` ⇒ status + `ma` + `duLieu`.
- `v3/src/ui/mot-page/kho-mot-page.js#noiDungPage`: thêm `chuyen` (null = page chưa gắn), đọc SONG SONG với hai khối; đọc hỏng ⇒ KHOÁ
  (chỉ xem) và nói vì sao (review CR5 — không đoán «chưa gắn»).
- `v3/src/ui/mot-page/trang/mot-page.html` — Ra 2: `CHI_XEM()` từ `chuyen`; tab «SP & giá» + «Ảnh» của page đã gắn: không nút lưu /
  tải / link / xếp / bỏ / nối món, ô nhập khoá, dòng `veChuyen` (câu + nút «Sửa ở Sản phẩm › G › Theo thị trường →»). Page chưa gắn: y
  như cũ. Lượt lưu bị 409 `ban_sao_da_chuyen` (tab mở trước lúc page được gắn) ⇒ đọc lại và khoá tab (CR6). Page gắn chưa shop: một câu
  đúng, bỏ câu «chưa khai sản phẩm gốc» trái ngược (CR7).
- `docs/v3/03-MAN-HINH.md` dòng Page — đúng câu phiếu ③.

## Danh sách ca (viết trước, rồi ca chi tiết)

| Ca | Kịch bản | Nhóm | ④ |
|---|---|---|---|
| H1 | page đã gắn: `docSanPhamTrangPage` ≡ `docSanPhamGoiGia(…, trang)` trọn mảng = món 111:x 2 bậc (biết trước: 19900/29900 SAR) | hành vi | 1 |
| H2 | page chưa gắn: như cũ (bản sao + món RF-15) | cho-qua | 1·3 |
| H3 | gắn chưa shop ⇒ []; id lạ / team khác ⇒ [] | biên | 1 |
| H4 | chốt: bản sao page đã gắn ⇒ 409 + duLieu đủ | chặn | 2 |
| H5 | chốt cho qua: bản sao page chưa gắn · món gốc · món RF-15 (page chưa gắn VÀ page đã gắn) · team khác · vắng id | cho-qua | 3 |
| H5b | id «0<id>» «+<id>» « <id>» «abc» «0» «-1» ⇒ 400 `ma_khong_hop_le` | chặn | 2 |
| H6 | gắn chưa shop ⇒ vẫn chặn, lối `tab=page` | biên | 2 |
| H7 | gỡ gắn ⇒ thôi chặn, bộ đọc về bản sao | biên | 3 |
| H8 | câu: thiếu thị trường / thiếu id gốc | biên | — |
| H9 | lượt gắn đang dở giữ khoá dòng page ⇒ chốt trong giao dịch CHỜ rồi 409 | chặn (đồng thời) | 2 |
| D1·D2 | hai cửa lưu đầy đủ: thân đúng + thân sai ⇒ 409 (chốt trước mọi kiểm), băm dòng trước = sau, 0 đẩy | chặn | 2 |
| D3–D8 | tải lên · link · sửa nhãn · bỏ · xếp · nối món: thân đúng + thân mà cửa sau từ chối bằng lỗi KHÁC ⇒ 409 `ban_sao_da_chuyen` | chặn | 2 |
| D9 | page chưa gắn: hai cửa + link + nối món thành, bot nhận đúng page | cho-qua · hành vi | 3 |
| D10 | món POS RF-15 qua cửa trang page vẫn lưu (② 4 không áp) | cho-qua | 4 |
| D11 | page gắn GIỮA chốt đầu cửa và giao dịch ⇒ cửa ra ROLLBACK (cả hai cửa) | chặn (đồng thời) | 2 |
| D12 | lượt gắn đang dở giữ khoá khi giao dịch lưu đã qua chốt đầu ⇒ cửa ra chờ ⇒ 409, 0 đẩy | chặn (đồng thời) | 2 |
| D13 | cửa ra `taoBuocDayBot` gọi thẳng: bản sao ⇒ 409, món POS ⇒ qua | chặn · cho-qua | 2 |
| D14 | id «0<id>» ở sáu cửa ⇒ 400, 0 đổi, 0 đẩy, 0 tệp | chặn | 2 |
| T1 | HTTP `noi-dung`: A ≡ bộ đọc bot có trang; B bản sao; C [] + lối tab=page | hành vi | 1 |
| T2 | màn Prompt: A mang `(111:x)` + bậc món, không `kb:fbA`; B giữ bản sao | hành vi | 1 |
| T3 | trang A (script thật, DOM giả): không nút lưu/tải/link/xếp/bỏ/nối, ô khoá, câu + nút sang đúng đường | hành vi | 5 |
| T4 | trang B: nút còn | cho-qua | 5 |
| T5 | tab mở trước lúc gắn: bấm lưu ⇒ 409 ⇒ màn khoá tab | hành vi | 5 |
| T6 | trang C (gắn chưa shop): một câu đúng, không câu trái ngược | biên | 5 |

Nhánh KHÔNG chạm (khai): `docSanPhamSua` thật của `chay-that.js` (T3–T6 dùng bản đọc gọn cùng khuôn trường); `chay-that.js` khởi
động thật (cổng ③ canh dòng nối bằng hình dạng); nhánh «đọc trạng thái gắn HỎNG ⇒ khoá» của `docChuyen` (cổng truy vấn thật không
ném được có chọn lọc cho lượt đọc thứ hai mà không ném luôn lượt đọc đầu).

## Nghiệm thu bằng lệnh

### Bộ ca

- Ba tệp mới: `test/gsp3b-chot-ban-sao.test.mjs` (H1–H9, Postgres hộp cát) · `v3/test/b/gsp3b-cua-luu.test.mjs` (D1–D14, HTTP + router thật +
  Postgres) · `v3/test/b/gsp3b-trang-page.test.mjs` (T1–T6, vai-b + cổng truy vấn thật + script trang thật).
  `node --test` ba tệp: **32 pass · 0 fail**.
- Ca cũ gần nhất chạy riêng (trang page · màn Prompt · ảnh · vận hành · GSP3 · khối chung · bản chép): `ve2-mot-page` `ve2b-page-gop`
  `mot-page` `prompt-page` `mn4-anh-router` `l6-van-hanh` `ll10-van-hanh` `gsp3-doi-soat` `ve4-luat-chung` `mn3-ban-chep-bot`: **122/122**.
- `npm test` (luật 6, không chạy chồng — `ps` đếm 0 lượt `node --test` trước mỗi lần):
  - mốc TRƯỚC (HEAD `6c2f8ef`, cây sạch): **2384 ca · 2380 đạt · 0 đỏ · 4 bỏ qua** (23,6s)
  - sau lượt đầu: 2409 · 2405 · 0 · 4
  - SAU vá /code-review: **2416 ca · 2412 đạt · 0 đỏ · 4 bỏ qua** (+32 ca, 0 đỏ mới)

### Cổng `ops/bin/nghiem-thu/gsp3b.sh` (lượt thứ hai, bản sau vá review, máy dev, hộp cát Postgres 127.0.0.1:5432)

```
✅ ①bộ-ca-gsp3b pass=32 fail=0 (sàn ≥32)
✅ ②phép-④-có-ca-xanh 30/30
✅ ③nối-dây-chay-that dòng nối mới=1 (đòi 1) · lời gọi thiếu trang=0 (đòi 0)
✅ ③b-tiền-đề-②4-còn-màn-gọi-cửa-đầy-đủ số màn=1 (mot-page.html: id từ bộ đọc page_id, gồm món POS RF-15)
✅ ③c-không-sửa-tệp-cấm so với aa43268
✅ ③d-chuyen-ban-sao-chỉ-thêm dòng cũ bị sửa/xoá=0 (đòi 0)
✅ ④0-lượt-chứng-bản-sao-tạm-xanh pass=32 fail=0
✅ ④đảo-vá × 23 — mỗi đột biến đỏ ĐÚNG tập ca (bảng dưới)
✅ ④z-khôi-phục-bản-sao-xanh-lại fail=0
✅ ④cây-chung-không-dính-đột-biến băm 5 tệp bị đột biến trong cây chung trước = sau · 0 tệp .goc lạc
✅ ⑤LL15d-phạm-vi test/ll15d-marketer-san-pham.test.mjs pass=4 fail=0
✅ ⑤LL15d-phạm-vi v3/test/b/ll15d-marketer-man.test.mjs pass=5 fail=0
✅ ⑥cổng-cũ-ll15d rc=0
✅ ⑥cổng-cũ-gsp1 rc=0
✅ ⑥cổng-cũ-gsp2 rc=0
🔴 ⑥cổng-cũ-gsp3 rc=1 · 6 dòng đỏ MỚI so với aa43268   ← ①②VE2b pass=16 fail=1, tầng sâu gsp3 → ve8b → ve8a → ve7b → ve7a → ve2b
✅ ⑥cổng-cũ-ve2 rc=0
✅ ⑥cổng-cũ-ve2b rc=0
✅ ⑥cổng-cũ-ve8b rc=0
✅ ⑥cổng-cũ-va-r2 rc=1 — ĐỎ SẴN ở aa43268: 12 dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ §9, không do GSP3b)
   ⑦npm-test: HOÃN (CHAY_NPM_TEST=1) — số ở mục Bộ ca
== ĐỎ 1 / XANH 41
```

**Đỏ ⑥gsp3 = chập chờn, không do GSP3b** (phân biệt bằng chạy riêng, đúng lệnh tổng):
- CHÍNH chuỗi đó (`ve8b → ve8a → ve7b → ve7a → ve2b`) chạy TRỰC TIẾP trong cùng lượt cổng (`⑥ve8b`, `⑥ve2b`) ⇒ rc=0.
- `v3/test/b/ve2b-page-gop.test.mjs` chạy riêng 3 lượt + 4 lượt song song (tải cao): **17/17 cả 7 lượt**.
- `gsp3.sh` chạy riêng: ① 37/0 · ② 35/35 · ③ · ④ 29/29 đột biến · ⑤ 4/4 + 5/5 — xanh hết; tới ⑥ thì **TREO** ở tầng sâu
  `gsp1 → ll15d → ll15c → ll15b → ll15a → v3/test/b/ve7d-nguoi-team.test.mjs` (0% CPU ~26′, cổng HTTP :50077 còn mở — một ca đỏ không đóng
  máy chủ); giết cả nhóm. `ve7d-nguoi-team.test.mjs` chạy riêng **8/8**. Cùng hiện tượng tổng gặp ở GSP3 chặng 1 («treo ở chuỗi cổng cũ»).
- Sáu cổng con của `gsp3.sh` ⑥ đo riêng: `gsp1` ✅ `gsp2` ✅ `ve8b` ✅ `ll15d` ✅ (cùng lượt cổng gsp3b) · `va-r2` ĐỎ SẴN (12 dòng = base) ·
  `l3-m4` chạy riêng ở HEAD và ở worktree tạm `aa43268`: **55 phép · 27 ĐỎ · 3 HOÃN cả hai, 33 dòng đỏ = 33, 0 dòng mới** (nợ N-GSP3-CONG-CU-DO).
- Vì cổng con lồng nhau treo được vô hạn, `gsp3b.sh` ⑥ thêm TRẦN mỗi cổng con (`TRAN_CON`, mặc định 2700s; quá ⇒ giết cả nhóm, ĐỎ «TREO»)
  — commit `1382ef1`, thử: trần 5s ⇒ `🔴 ⑥cổng-cũ-ve2 TREO`, 0 tiến trình sót; trần mặc định ⇒ `✅ ⑥cổng-cũ-ve2 rc=0`.

### Đảo-vá — 23 đột biến, mỗi cái đỏ ĐÚNG tập ca (bản sao tạm, mỗi lượt một tiến trình node)

| Đột biến | Tệp | Ca đỏ (đúng bằng) |
|---|---|---|
| bo_trang (bỏ truyền `trang` — ④6) | chuyen-ban-sao.js | H1 · H3 · T1 · T2 |
| chot_bo_dieu_kien_gan | chuyen-ban-sao.js | H5 · H7 |
| chot_ca_mon_pos (bỏ `nguon <> 'pos'`) | chuyen-ban-sao.js | H5 |
| chot_luon_cho_qua | chuyen-ban-sao.js | H4 · H6 · H9 |
| id_la_cho_qua (CR1) | chuyen-ban-sao.js | H5b · D14 |
| bo_for_share (CR2) | chuyen-ban-sao.js | H9 · D12 |
| bo_cua_ra (CR8) | van-hanh/router.js | D11 · D12 · D13 |
| tp_bo_chot_truoc · vh_bo_chot_truoc | router-anh.js · router.js | D1 · D2 |
| bo_chot_tai_len · link · sua_nhan · noi_pos | router-anh.js | D3·D14 · D4·D14 · D5·D14 · D8·D14 |
| bo_chot_bo_anh | router-anh.js | D14 (D6 vẫn xanh — cửa ra chặn) |
| bo_chot_xep_anh | router-anh.js | D7 |
| anh_bo_ma_409 · vh_bo_ma_409 | router-anh.js · router.js | D1 D3–D8 D11 D12 D14 · D2 D11 |
| kho_bo_chuyen | kho-mot-page.js | T1 · T3 · T5 · T6 |
| man_bo_chi_xem · man_bo_cau | mot-page.html | T3·T5 · T3·T5·T6 |
| man_chi_xem_moi_page · man_khong_khoa_sau_409 · man_chua_shop_hai_cau | mot-page.html | T4·T5 · T5 · T6 |

Lượt đầu cổng (bản trước review) bắt lỗi THƯỚC: đột biến `bo_chot_sua_nhan` thay chuỗi xuất hiện HAI lần (cửa sửa nhãn và cửa bỏ ảnh
cùng một dòng chốt) ⇒ «không áp được»; nay cắt theo vị trí. `do_cua` cũ không bắt tên ca có hậu tố chữ (H5b) — sửa regex.

## `/code-review` (high) — 10 phát hiện, kiểm từng claim trước khi sửa

| # | Phát hiện | Kiểm chứng | Làm gì |
|---|---|---|---|
| CR1 | id «012» lách chốt (regex cho qua, Postgres ép về 12) ở 5 cửa ảnh + nối món | ĐÚNG — dựng lại bằng D14 trên bản trước vá: `POST /api/anh-san-pham/0<id>/link` ⇒ 200, ảnh vào bản sao bị khoá, đẩy `fbA` | `idSo` (dạng lạ ⇒ 400 `ma_khong_hop_le`) dùng cho chốt + `spCuaAnh` · ca H5b · D14 · đột biến `id_la_cho_qua` |
| CR2 | chốt trong giao dịch đọc page không khoá ⇒ gắn chạy chồng lọt | ĐÚNG — dựng lại bằng D12 trên bản trước vá: 200, đẩy `fbD` | `FOR SHARE OF p` · ca H9 · D12 · đột biến `bo_for_share` |
| CR3 | cổng ⑥: cổng con chết không in dòng đỏ ⇒ tính «ĐỎ SẴN» xanh | ĐÚNG (đọc mã: `_moi` rỗng ⇒ `_them=0`) | rc≠0 + 0 dòng đỏ ⇒ ĐỎ. Cùng lỗ ở `gsp3.sh` (ngoài ③) ⇒ nợ N-GSP3B-CONG-DOI-CHUNG |
| CR4 | lối sang không mang shop ⇒ màn Sản phẩm mở thị trường ĐẦU | ĐÚNG (`san-pham.html` không đọc tham số shop) | ngoài ③ (`san-pham.html`) ⇒ nợ N-GSP3B-LOI-SANG-SHOP; câu nay nêu cả thị trường lẫn số shop |
| CR5 | đọc page thô không bọc lỗi ⇒ hỏng cả `/noi-dung` | ĐÚNG (đọc mã) | `docChuyen` song song, hỏng ⇒ khoá + nói vì sao |
| CR6 | màn không dùng `ma`/`duongSua` của 409, tab cũ vẫn mở ô sửa | ĐÚNG | `goi()` mang `ma`/`duLieu`; 409 `ban_sao_da_chuyen` ⇒ đọc lại, khoá tab · ca T5 · đột biến `man_khong_khoa_sau_409` |
| CR7 | page gắn chưa shop: hai câu trái nhau | ĐÚNG (dựng ở T6 trước vá) | nhánh riêng · ca T6 · đột biến `man_chua_shop_hai_cau` |
| CR8 | altitude: chốt rải 8 chỗ, nên đặt ở cơ chế chung | ĐÚNG về rủi ro cửa mai thêm | thêm CỬA RA trong `taoBuocDayBot` (án lệ #31); chốt đầu cửa GIỮ vì phiếu ② 3 đòi «TRƯỚC khi ghi» và trả đúng mã trước mọi kiểm thân · ca D13 · đột biến `bo_cua_ra` |
| CR9 | `/noi-dung` đọc page 3 lần | đúng; chữ ký `docKhoi.sanPham(teamId, pageRowId)` cố định bởi `vai-b.js`/`kho-prompt.js` (ngoài ③) | đọc trạng thái gắn song song với hai khối; không đổi chữ ký |
| CR10 | chốt đầu cửa thừa khi đã có chốt trong giao dịch; regex lặp | một nửa: chốt đầu cửa giữ (phiếu + thứ tự mã — ca D1/D2 «thân sai»); regex gom về `idSo` | — |

Đảo-vá đo bản SAU vá review (lượt cổng thứ hai): 23/23 đột biến làm đỏ ĐÚNG tập ca đã khai. (Thân commit `3a84d76` ghi «25 đột biến» — SAI, đúng là 23; không sửa lịch sử, đính chính ở đây.)

## Đột biến KHÔNG đỏ (kết quả của đảo-vá)

- Bỏ chốt đầu cửa «bỏ ảnh» ⇒ D6 vẫn XANH: cửa ra chặn, 0 đổi 0 đẩy — đúng thiết kế hai lớp; chỉ D14 (id «0<id>») đỏ. Tương tự bỏ chốt
  đầu cửa «xếp ảnh» ⇒ D14 vẫn xanh (cửa ra nhận id thô của URL, `idSo` 400).
- Đổi dòng nối `chay-that.js` về `rap.docSanPhamGoiGia(pool, teamId, pageRowId)` ⇒ không ca nào đỏ (bộ ca không khởi động `chay-that.js`);
  cổng ③ đỏ (phép hình dạng).
- Fail-open nhánh «đọc trạng thái gắn hỏng» ⇒ không ca nào đỏ (nhánh không chạm, khai ở trên).

## Ngoài phạm vi ⇒ §9 (APPEND cùng lượt)

N-GSP3B-MON-POS-CUA-DAY · N-GSP3B-LOI-SANG-SHOP · N-GSP3B-CONG-DOI-CHUNG.

## `_chan1.sh gsp3b`

Chạy sau commit `e9f3fe1` (05/10 15:09:51 → 15:34:21, máy dev, cây chung, không lượt đo nào khác chạy chồng):

```
Mon Oct  5 15:09:51 +07 2026
✅ ①phiếu-tồn-tại docs/thi-cong/phieu/PHIEU-GSP3B.md
✅ ②có-Base base=aa43268
— file đổi (14):
    docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
    docs/thi-cong/nhat-ky/phieu-gsp3b.md
    docs/thi-cong/phieu/PHIEU-GSP3B.md
    docs/v3/03-MAN-HINH.md
    ops/bin/nghiem-thu/gsp3b.sh
    src/products/chuyen-ban-sao.js
    test/gsp3b-chot-ban-sao.test.mjs
    v3/chay-that.js
    v3/src/ui/mot-page/kho-mot-page.js
    v3/src/ui/mot-page/trang/mot-page.html
    v3/src/ui/van-hanh/router-anh.js
    v3/src/ui/van-hanh/router.js
    v3/test/b/gsp3b-cua-luu.test.mjs
    v3/test/b/gsp3b-trang-page.test.mjs
✅ ④pathspec-⊆-③  
✅ ⑤vùng-cấm-src-phẳng 
✅ ⑥hết-marker đếm=0
✅ ⑦script-nghiệm-thu ops/bin/nghiem-thu/gsp3b.sh rc=0 (log /tmp/chan1-ns-14830.log, đuôi:)
    ✅ ⑥cổng-cũ-ve2b rc=0
    ✅ ⑥cổng-cũ-ve8b rc=0
    ✅ ⑥cổng-cũ-va-r2 rc=1 — ĐỎ SẴN ở aa43268: 12 dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ §9, không do GSP3b)
       ⑦npm-test: HOÃN (đặt CHAY_NPM_TEST=1 khi không lượt đo nào khác đang chạy — luật 6) — không tính vào ĐỎ/XANH
    == ĐỎ 0 / XANH 42
✅ ⑧a-nhật-ký docs/thi-cong/nhat-ky/phieu-gsp3b.md
✅ ⑧b-§10-sổ 
== ĐỎ 0 / XANH 8
rc=0
Mon Oct  5 15:34:21 +07 2026
```

Log ⑦ (`/tmp/chan1-ns-14830.log`) — các phép trừ đột biến (đột biến: 23 ✅ · 0 🔴):

```
✅ ①bộ-ca-gsp3b pass=32 fail=0 (sàn ≥32)
✅ ②phép-④-có-ca-xanh 30/30
✅ ③nối-dây-chay-that dòng nối mới=1 (đòi 1) · lời gọi thiếu trang=0 (đòi 0)
✅ ③b-tiền-đề-②4-còn-màn-gọi-cửa-đầy-đủ số màn=1 (mot-page.html: id từ bộ đọc page_id, gồm món POS RF-15)
✅ ③c-không-sửa-tệp-cấm so với aa43268
✅ ③d-chuyen-ban-sao-chỉ-thêm dòng cũ bị sửa/xoá=0 (đòi 0)
✅ ④0-lượt-chứng-bản-sao-tạm-xanh pass=32 fail=0
✅ ④z-khôi-phục-bản-sao-xanh-lại fail=0
✅ ④cây-chung-không-dính-đột-biến băm 5 tệp bị đột biến trong cây chung trước = sau · 0 tệp .goc lạc
✅ ⑤LL15d-phạm-vi test/ll15d-marketer-san-pham.test.mjs pass=4 fail=0
✅ ⑤LL15d-phạm-vi v3/test/b/ll15d-marketer-man.test.mjs pass=5 fail=0
✅ ⑥cổng-cũ-ll15d rc=0
✅ ⑥cổng-cũ-gsp1 rc=0
✅ ⑥cổng-cũ-gsp2 rc=0
✅ ⑥cổng-cũ-gsp3 rc=0
✅ ⑥cổng-cũ-ve2 rc=0
✅ ⑥cổng-cũ-ve2b rc=0
✅ ⑥cổng-cũ-ve8b rc=0
✅ ⑥cổng-cũ-va-r2 rc=1 — ĐỎ SẴN ở aa43268: 12 dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ §9, không do GSP3b)
== ĐỎ 0 / XANH 42
```

Lượt này `⑥gsp3` XANH (lượt thợ trước 41/42 đỏ đúng ở đó) — thêm một bằng chứng đỏ kia là chập chờn, không do GSP3b.

---

## Vòng 2 — 05/10/2026 (F1 + F2: đối kháng chặng 2 ĐẠT, tổng nâng hai NÊN lên CHẶN)

Nhận: phiếu (Base `aa43268`, ③ giữ nguyên) · verdict `refute-gsp3b-vong2.verdict.yaml` (F1, F2) · diff vòng 1 `aa43268..6e82d88` · nhật ký này.
HEAD lúc nhận `d17c90c`; mã không đổi từ vòng 1 (`git diff --stat 1382ef1..HEAD -- . ':!docs'` rỗng). Commit mã vòng 2 **`c5475a5`**.
Không push, không deploy, không SSH; `.env` giữ `PANCAKE_READONLY=1` (đếm: 1 dòng). Không đụng `src/admin-v3/operations.js` (cổng ③c canh).

### Kiểm chứng claim TRƯỚC khi sửa (luật 14) — kịch bản của reviewer chạy trên HEAD, máy dev, hộp cát Postgres 127.0.0.1:5432

```
KQ R3a luuGiaMon(marketer) = 403 thieu_vai
KQ R3b 200 {"ten":"Tên marketer đặt","het_hang":false,"cau_hinh_tay":true,"gia":[100]} day= [{"pid":"fbA","tiers":[[{"label":"1 hộp","price":1}]]}]
KQ R4 {"luu":{"ok":true},"gan":{"ok":false,"code":"40P01","msg":"deadlock detected"}}
KQ R4b {"luu":{"ok":true},"boQua":{"ok":false,"code":"40P01","msg":"deadlock detected"}}
```
F1 và F2 dựng lại được đúng như verdict.

### Đã làm

**F1 — món POS không lưu ĐẦY ĐỦ qua hai cửa** (`src/products/chuyen-ban-sao.js`, chỉ thêm):
- `chanMonPosCuaDayDu(db, teamId, spId)`: dòng `nguon='pos'` ⇒ 409 `mon_pos_sua_o_san_pham` khi (a) `page_id` NULL · (b) page của nó đã gắn
  gốc (hoặc không đọc được trong team — đóng khi nghi) · (c) món đã gộp gốc mà có page ĐÃ GẮN gốc đó ở đúng shop của món (vị từ chép từ
  `catalog.js#docSanPhamGoiGia`: `ma_goc` = gốc của page, `ma` bắt đầu «<shop>:», page có shop — /code-review vòng 2 #1). Còn qua: món
  RF-15 của page CHƯA gắn mà không page đã gắn nào đọc (ca D10). Lối sang + tên gốc dựng bằng `cauDaChuyen` (cùng khuôn 409 bản sao).
  Món mang `page_id` thì khoá dòng page đó `FOR SHARE` (thứ tự page → `san_pham`).
- `chanCuaLuuDayDu` = chốt bản sao + chốt món POS; hai cửa lưu ĐẦY ĐỦ gọi nó hai chỗ: trước `saveProduct` (lưới sớm — đúng mã trước mọi
  kiểm thân) và ĐẦU giao dịch của `saveProduct` (F2).
- Marketer lẫn quản trị đều 409 (D15 · D16). Chỉ-giá vẫn thành (D17 — khuôn `luuGia` của `chay-that.js:277`: `saveProduct` `chiGia` +
  `taoBuocDayBot`). Cửa ảnh của món POS KHÔNG đụng (phiếu ② 5) — xem nợ mới N-GSP3B-ANH-MON-POS.

**F2 — một thứ tự khoá page → `san_pham`** (`v3/src/ui/van-hanh/router.js`, `router-anh.js`):
- `poolChotDauGiaoDich(pool, chot)`: pool bọc cho `saveProduct` — câu đầu của kết nối phải mở giao dịch (`BEGIN …` / `START TRANSACTION …`),
  ngay sau đó chạy `chot(c)` (khoá page `FOR SHARE`) TRƯỚC khoá cố vấn và `san_pham FOR UPDATE` của `saveProduct`. Câu đầu khác ⇒ 500, không
  ghi (đóng khi nghi). `query` của pool đi thẳng. Hai cửa lưu ĐẦY ĐỦ dùng nó. Cửa ảnh / nối món đã chốt page ở đầu giao dịch từ vòng 1.
- Cửa ra `taoBuocDayBot` xin lại khoá page `NOWAIT` (`chanBanSaoDaChuyen(…, { khongCho: true })`): đường đúng đã giữ khoá ⇒ không đổi gì;
  đường thứ tự ngược (gọi `saveProduct(pool, …)` thẳng — chính kịch bản R4/R4b) gặp lượt gắn / «Không chuyển» đang giữ page ⇒ 55P03 ⇒ 409
  «đang được đổi ở màn khác — chưa lưu gì; tải lại rồi lưu lại», bên kia thành, không 40P01. Chốt món POS KHÔNG đặt ở cửa ra: cửa ra dùng
  chung với chỉ-giá (`luuGia`/`dayMon`) — món POS phải qua (/code-review vòng 2 #8, sửa chú thích cho đúng tầm).

### Giả định / chọn lựa (luật 11 · 13)

- **F2 hai lớp, không chọn một.** Bọc pool (page trước) làm đường thật THÀNH cả hai phía (lưu xong, lượt gắn chờ rồi chạy); `NOWAIT` ở cửa
  ra chặn vòng chờ cho mọi đường không qua bọc pool. Chỉ `NOWAIT` thì lượt lưu thua 409 mỗi khi page đang bị khoá; chỉ bọc pool thì kịch bản
  R4/R4b nguyên văn (gọi `saveProduct` thẳng) vẫn 40P01 — đo: sau lớp bọc pool, trước `NOWAIT`, R3 ✔ R4 ✖ R4b ✖. Giá phải trả: bọc pool dựa
  vào khuôn `transaction()` (operations.js) mở bằng BEGIN — khuôn đổi thì lượt lưu 500 (đóng khi nghi, không ghi) và bộ ca D9–D12 · D18 ·
  K1–K3 đỏ (đo bằng đột biến `transaction()` thêm một câu trước BEGIN, trên bản sao tạm). Gốc rễ ⇒ nợ N-GSP3B-HOOK-SAVEPRODUCT.
- **F1 nhánh (c) lệch chữ verdict** («Món RF-15 (`page_id` trỏ page CHƯA gắn) vẫn qua như ca D10»): món RF-15 ĐÃ GỘP gốc mà page đã gắn bán
  ở đúng shop là chính lỗ F1 đi đường RF-15 — đo (kịch bản tạm, không vào repo): marketer lưu ⇒ 200, giá 100, `cau_hinh_tay` true, chỉ đẩy
  page của `page_id` (bản chép page đã gắn lệch cửa tiền). Chọn chặn; D10 (món chưa gộp) vẫn qua. Báo tổng ở dòng §10.
- **Màn không sửa.** `mot-page.html` in `thongDiep` cho 409 `mon_pos_sua_o_san_pham` (không tự khoá tab — chỉ `ban_sao_da_chuyen` khoá).
  Chỉ gặp khi tab mở trước lúc page được gắn rồi lưu món RF-15 — ca hiếm, câu đã chỉ đúng chỗ sửa.

### Danh sách ca vòng 2

| Ca | Kịch bản | Nhóm |
|---|---|---|
| H10 | chốt món POS: page_id NULL (món gốc · món chưa gộp ⇒ lối /san-pham) · page_id trỏ page ĐÃ GẮN · RF-15 gộp gốc mà A bán ⇒ 409; RF-15 không ai đọc · cùng gốc shop 222 · bản sao · vắng · team khác ⇒ qua; «0<id>» ⇒ 400 | chặn · cho-qua · biên |
| H11 | chốt món POS trong giao dịch: gắn page dở giữ khoá ⇒ CHỜ rồi 409 | chặn (đồng thời) |
| D15 | (R3) marketer lưu đầy đủ món 111:x qua cửa trang page ⇒ 409; tên · cau_hinh_tay · giá trước = sau; 0 đẩy | chặn · hành vi |
| D16 | quản trị, HAI cửa, món gốc + món page đã gắn, thân đúng + thân sai ⇒ 409 | chặn |
| D17 | chỉ-giá (khuôn luuGia) trên 111:x ⇒ thành, bot page A nhận giá mới | cho-qua · hành vi |
| D18 | món RF-15: page bị gắn GIỮA chốt đầu cửa và giao dịch ⇒ chốt đầu giao dịch 409 (cả hai cửa) | chặn (đồng thời) |
| D19 | (/code-review #1) marketer lưu món RF-15 đã gộp gốc mà A bán ⇒ 409, 0 đổi 0 đẩy | chặn |
| K1 | (R4) lưu bản sao (cửa trang page) ∥ gắn page (dọn bo_qua) ⇒ không 40P01, lưu thành, gắn chờ rồi thành | đồng thời · cho-qua |
| K2 | (R4b) lưu ∥ «Không chuyển» ⇒ không 40P01, cả hai thành | đồng thời · cho-qua |
| K3 | lưu (cửa Vận hành) ∥ gắn ⇒ không 40P01 | đồng thời |
| K4 | pool bọc: câu đầu không mở giao dịch ⇒ 500, chốt không chạy; BEGIN / BEGIN ISOLATION … / START TRANSACTION ⇒ chốt đúng một lần | biên |
| K5 | (R4 · R4b NGUYÊN VĂN) `saveProduct(pool)` thẳng + cửa ra ∥ gắn / «Không chuyển» ⇒ lưu 409 «thử lại», bên kia thành, không 40P01, 0 đẩy | đồng thời · chặn |

K1–K3 · K5 không ngủ hẹn giờ: lớp soi dò `pg_stat_activity.wait_event_type = 'Lock'` (≤5s) và ca ĐỎ nếu bên kia không đợi khoá — ca tự
nói «không đo được» thay vì xanh giả (/code-review vòng 2 #4). Nhánh KHÔNG chạm: nhánh (b) «page_id trỏ page không đọc được trong team»
(khoá ngoại `san_pham.page_id → page(id)` + cùng team ⇒ không dựng được bằng dữ liệu hợp lệ).

### Nghiệm thu bằng lệnh (máy dev, hộp cát Postgres 127.0.0.1:5432)

- Bốn tệp ca (`test/gsp3b-chot-ban-sao` · `v3/test/b/gsp3b-cua-luu` · `gsp3b-khoa-cho` (mới) · `gsp3b-trang-page`): **45 pass · 0 fail**.
- Ca cũ gần nhất chạy riêng: `ll15d-marketer-san-pham` 4 · `ll15d-marketer-man` 5 · `ve2-mot-page` 4 · `mot-page` 20 · `ll10-van-hanh` 3 ·
  `mn4-anh-router` 7 · `l6-van-hanh` 7 · `gsp3-doi-soat` 28 · `mn3-ban-chep-bot` 10 · `gsp3-doi-soat-man` 9 · `prompt-page` 19 · `ve2b-page-gop`
  17 · `ve4-luat-chung` 7 — **140/140**.
- `npm test` (luật 6 — `ps` không thấy lượt `node --test` nào khác): mốc TRƯỚC = vòng 1 sau vá review **2416 · 2412 đạt · 0 đỏ · 4 bỏ qua**
  (mã y hệt HEAD lúc nhận) → SAU **2429 ca · 2425 đạt · 0 đỏ · 4 bỏ qua** (hai lượt liền, cùng số; +13 = H10 H11 · D15–D19 · K1–K5 + 1 tệp).
- Kịch bản reviewer SAU vá (nguyên văn, không sửa): **R3 ✔ · R4 ✔ · R4b ✔** (R6 R7 ✔; R1 R2 R5 vẫn đỏ = F4 F5 F3 — ngoài vòng 2, đã nợ /
  tổng sửa sổ):
  ```
  KQ R3b 409 {"ten":"101 - Gold Ring X","het_hang":false,"cau_hinh_tay":false,"gia":null} day= []
  KQ R4 {"luu":{"ok":false,"msg":"Page của sản phẩm này đang được đổi ở màn khác (gắn sản phẩm / «Không chuyển») — chưa lưu gì; tải lại rồi lưu lại"},"gan":{"ok":true,…}}
  KQ R4b {"luu":{"ok":false,"msg":"Page của sản phẩm này đang được đổi ở màn khác …"},"boQua":{"ok":true}}
  ```

### Đảo-vá vòng 2 — trên BẢN SAO TẠM, mỗi đột biến một tiến trình node, đỏ ĐÚNG tập ca (cổng ④: 36/36 — 23 cũ, 13 mới)

| Đột biến | Tệp | Ca đỏ (đúng bằng) |
|---|---|---|
| f1_luon_cho_qua | chuyen-ban-sao.js | H10 · H11 · D15 · D16 · D18 · D19 |
| f1_chan_ca_rf15 (chặn cả RF-15 không ai đọc) | chuyen-ban-sao.js | H10 · D10 · D18 (D18: gác «lượt chen không chạy») |
| f1_bo_nhanh_page_null | chuyen-ban-sao.js | H10 · D15 · D16 |
| f1_bo_for_share | chuyen-ban-sao.js | H11 |
| f1_bo_duong_tien_page_khac (bỏ nhánh c) | chuyen-ban-sao.js | H10 · D19 |
| f1_cua_chi_chot_ban_sao | chuyen-ban-sao.js | D15 · D16 · D18 · D19 |
| f2_dao_thu_tu_khoa (chốt không chạy đầu giao dịch) | router.js | D12 · D18 · K1 · K2 · K3 · K4 |
| f2_tp_bo_boc · f2_vh_bo_boc | router-anh.js · router.js | D12 · D18 · K1 · K2 · D18 · K3 |
| f2_boc_bo_kiem_begin | router.js | K4 |
| f2_cua_ra_cho (bỏ NOWAIT) | router.js | K5 + log có «40P01» |
| f2_bo_ma_55p03 | router.js | K5 |
| **f2_dao_thu_tu_khong_belt** (đảo trọn: bỏ chốt đầu giao dịch VÀ bỏ NOWAIT) | router.js | D18 · K1 · K2 · K3 · K4 · K5 + log có «khoá chết (40P01)» |
| cũ đổi tập: id_la_cho_qua +H10 · bo_for_share +K5 · bo_cua_ra = D13 · K5 · tp/vh_bo_chot_truoc +D16 · anh_bo_ma_409 +D15 D16 D18 D19 · vh_bo_ma_409 +D16 D18 | | |

Cổng thêm cột 5 «chữ phải có trong log» — đột biến thứ tự khoá phải đỏ VÌ 40P01, không vì lý do khác (đúng yêu cầu verdict «đảo lại thứ
tự ⇒ ca đỏ (40P01)»).

### Đột biến KHÔNG đỏ / tập đổi (kết quả của đảo-vá)

- `bo_cua_ra` nay chỉ đỏ D13 · K5: D11/D12 bị chốt ĐẦU giao dịch bắt trước cửa ra. Cửa ra còn là lưới cho đường không qua bọc pool (K5).
- `bo_for_share` không làm K1–K3 đỏ: thiếu khoá page thì không có vòng chờ — nhưng lỗ CR2 cũ trở lại (D12 đỏ) và K5 đỏ.
- `f2_dao_thu_tu_khoa` (còn NOWAIT) làm K1–K3 đỏ bằng 409 «thử lại» chứ không bằng 40P01 — vì thế có thêm `f2_dao_thu_tu_khong_belt`
  bắt đúng chữ 40P01.
- Lượt cổng đầu vòng 2 bắt hai lỗi THƯỚC: D12 không dọn page D ở `finally` ⇒ D17 đỏ dây chuyền dưới `anh_bo_ma_409` (thêm `finally` chờ
  đúng lượt gắn commit — /code-review #5 thay hẹn giờ bằng `await`); cột 5 `«$chu»` làm bash đọc byte đầu của «»» vào tên biến (`set -u`
  chết) ⇒ `${chu}`.

### /code-review (high) vòng 2 — 8 điểm, kiểm từng claim trước khi sửa

| # | Phát hiện | Kiểm chứng | Làm gì |
|---|---|---|---|
| 1 | RF-15 đã gộp gốc lọt F1 | ĐÚNG — kịch bản tạm: 200, giá 100, `cau_hinh_tay` true, chỉ đẩy fbP | nhánh (c) · ca H10 · D19 · đột biến `f1_bo_duong_tien_page_khac` |
| 2 | năm cửa ảnh + nối món vẫn cho marketer sửa ảnh món POS của gốc | ĐÚNG — kịch bản tạm: link ⇒ 200, 1 ảnh vào 111:x, đẩy fbA | ngoài hai mã CHẶN + phiếu ② 5 cấm đụng cửa ảnh món POS ⇒ nợ **N-GSP3B-ANH-MON-POS** |
| 3 | bọc pool soi chữ câu SQL đầu — mong manh | đúng về rủi ro; `operations.js` cấm | nhận `BEGIN …`/`START TRANSACTION`, `query` của pool đi thẳng, đóng khi nghi + ca K4; gốc rễ ⇒ nợ **N-GSP3B-HOOK-SAVEPRODUCT** |
| 4 | K1–K3 ngủ 300ms cố định, có thể xanh mà không đo | ĐÚNG | dò `pg_stat_activity` (Lock), không thấy chờ ⇒ ca đỏ |
| 5 | D12 dọn bằng hẹn giờ | ĐÚNG | `await` promise lượt gắn |
| 6 | 5–6 câu truy vấn mỗi lượt lưu | đúng (câu nhỏ có chỉ mục, lượt lưu tay) | KHÔNG sửa: không phải lỗi; gộp câu làm chốt khó đọc + đột biến khó cắt |
| 7 | lối sang tự dựng lại, lệch được `cauDaChuyen` | ĐÚNG | dùng `cauDaChuyen` |
| 8 | cửa ra không chốt F1, trái chú thích «mọi cửa» | đúng sự thật; cửa ra dùng chung chỉ-giá (món POS phải qua) | không thêm; sửa chú thích cho đúng tầm |

Thêm `NOWAIT` ở cửa ra KHÔNG do review đòi: đo sau lớp bọc pool, kịch bản R4/R4b nguyên văn còn 40P01 (gọi `saveProduct` thẳng). Đảo-vá
đo bản SAU vá review (lượt cổng ①–④ cuối: 45/45, 36/36).

### Ngoài phạm vi ⇒ §9 (cùng lượt)

Sửa chữ **N-GSP3B-MON-POS-CUA-DAY** (phần đã chặn vòng 2 + phần còn lại) · thêm **N-GSP3B-ANH-MON-POS** · **N-GSP3B-HOOK-SAVEPRODUCT**.

### `_chan1.sh gsp3b` (vòng 2)

Chạy sau commit mã `c5475a5` (05/10 17:04:40 → 17:29:02, máy dev, cây chung, hộp cát Postgres 127.0.0.1:5432, PATH có shim `rg` của
scratchpad — nợ N-GSP-CONG-RG-ENV; không lượt đo nào khác chạy chồng):

```
Mon Oct  5 17:04:40 +07 2026
✅ ①phiếu-tồn-tại docs/thi-cong/phieu/PHIEU-GSP3B.md
✅ ②có-Base base=aa43268
— file đổi (15):
    docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
    docs/thi-cong/nhat-ky/phieu-gsp3b.md
    docs/thi-cong/phieu/PHIEU-GSP3B.md
    docs/v3/03-MAN-HINH.md
    ops/bin/nghiem-thu/gsp3b.sh
    src/products/chuyen-ban-sao.js
    test/gsp3b-chot-ban-sao.test.mjs
    v3/chay-that.js
    v3/src/ui/mot-page/kho-mot-page.js
    v3/src/ui/mot-page/trang/mot-page.html
    v3/src/ui/van-hanh/router-anh.js
    v3/src/ui/van-hanh/router.js
    v3/test/b/gsp3b-cua-luu.test.mjs
    v3/test/b/gsp3b-khoa-cho.test.mjs
    v3/test/b/gsp3b-trang-page.test.mjs
✅ ④pathspec-⊆-③  
✅ ⑤vùng-cấm-src-phẳng 
✅ ⑥hết-marker đếm=0
✅ ⑦script-nghiệm-thu ops/bin/nghiem-thu/gsp3b.sh rc=0 (log /tmp/chan1-ns-21230.log, đuôi:)
    ✅ ⑥cổng-cũ-ve2b rc=0
    ✅ ⑥cổng-cũ-ve8b rc=0
    ✅ ⑥cổng-cũ-va-r2 rc=1 — ĐỎ SẴN ở aa43268: 12 dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ §9, không do GSP3b)
       ⑦npm-test: HOÃN (đặt CHAY_NPM_TEST=1 khi không lượt đo nào khác đang chạy — luật 6) — không tính vào ĐỎ/XANH
    == ĐỎ 0 / XANH 55
✅ ⑧a-nhật-ký docs/thi-cong/nhat-ky/phieu-gsp3b.md
✅ ⑧b-§10-sổ 
== ĐỎ 0 / XANH 8
rc=0
Mon Oct  5 17:29:02 +07 2026
```

Log ⑦ (`/tmp/chan1-ns-21230.log`) — các phép trừ đột biến (đột biến: 36 ✅ · 0 🔴):

```
✅ ①bộ-ca-gsp3b pass=45 fail=0 (sàn ≥45)
✅ ②phép-④-có-ca-xanh 42/42
✅ ③nối-dây-chay-that dòng nối mới=1 (đòi 1) · lời gọi thiếu trang=0 (đòi 0)
✅ ③b-tiền-đề-ngoại-lệ-RF-15-còn-màn-gọi-cửa-đầy-đủ số màn=1 (mot-page.html: id từ bộ đọc page_id, gồm món POS RF-15)
✅ ③c-không-sửa-tệp-cấm so với aa43268
✅ ③d-chuyen-ban-sao-chỉ-thêm dòng cũ bị sửa/xoá=0 (đòi 0)
✅ ④0-lượt-chứng-bản-sao-tạm-xanh pass=45 fail=0
✅ ④z-khôi-phục-bản-sao-xanh-lại fail=0
✅ ④cây-chung-không-dính-đột-biến băm 5 tệp bị đột biến trong cây chung trước = sau · 0 tệp .goc lạc
✅ ⑤LL15d-phạm-vi test/ll15d-marketer-san-pham.test.mjs pass=4 fail=0
✅ ⑤LL15d-phạm-vi v3/test/b/ll15d-marketer-man.test.mjs pass=5 fail=0
✅ ⑥cổng-cũ-ll15d rc=0
✅ ⑥cổng-cũ-gsp1 rc=0
✅ ⑥cổng-cũ-gsp2 rc=0
✅ ⑥cổng-cũ-gsp3 rc=0
✅ ⑥cổng-cũ-ve2 rc=0
✅ ⑥cổng-cũ-ve2b rc=0
✅ ⑥cổng-cũ-ve8b rc=0
✅ ⑥cổng-cũ-va-r2 rc=1 — ĐỎ SẴN ở aa43268: 12 dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ §9, không do GSP3b)
   ⑦npm-test: HOÃN (đặt CHAY_NPM_TEST=1 khi không lượt đo nào khác đang chạy — luật 6) — không tính vào ĐỎ/XANH
== ĐỎ 0 / XANH 55
```

Không còn đỏ chập chờn ở ⑥ lượt này (cả chuỗi `gsp1` · `gsp3` xanh).
