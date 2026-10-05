# PHIẾU TT1 — Đơn vị tiền tệ của shop ngoài GCC (EUR · RON · AUD · TWD · JPY) + bảng thị trường → tiền tệ

**Base:** `ĐẶT-LÚC-PHÁT` · **Làn:** 🟥 (bảng hệ số mà cửa tiền `cua2Tien`, lưu giá `saveProduct`, ráp prompt, bản chép bot cùng đọc)
**Nguồn:** người quyết 05/10 («Theo giá như đơn trên POS chứ cần gì quy đổi?» → «làm trọn vẹn») · nợ N-TIEN-TE-NGOAI-GCC (sổ §9) · H7/H13 (`docs/thi-cong/nhat-ky/h7-chuyen-team-20261005.md`) · sổ §5i
**Đụng bộ não:** không (KHÔNG sửa `src/fast-lane.js`, `src/kb.js` — mặc định `'AED'` ở đó là của luồng cũ, ghi nợ nếu thấy cần).
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review` (đường tiền).

## ① Thi hành đoạn nào

Hệ KHÔNG quy đổi giữa các loại tiền — giá EUR vẫn là EUR. Thứ thiếu là **đơn vị lẻ**: POS lưu tiền là số nguyên ở đơn vị NHỎ
(99,00 EUR = `9900`; TWD/JPY không xu ⇒ 990 TWD = `990`). `HE_SO_TE` (`src/pos/tao-don.js:130`) chỉ có AED · SAR · QAR · USD · KWD ·
OMR · BHD (đều 100) ⇒ tiền tệ lạ bị TỪ CHỐI (đúng hướng an toàn). Sau H7/H13 (05/10) prod đã có kết nối + món POS cho shop EUR
(Europe, Slovakia) · RON (Romania) · USD (USA) · AUD (Australia) · TWD (Taiwan) ⇒ chưa đặt giá / đối soát / tạo đơn được cho các
món đó. `TIEN_TE_THI_TRUONG` (`src/products/chuyen-ban-sao.js:292`) chỉ 6 nước GCC.

Số hệ số lấy từ NGUỒN ĐÃ CÓ, không đoán: BigQuery `levelup-465304.PIALPHA_ALL_Dataset.dim_shop_project.currency_divisor` (đo 05/10):
EUR 100 · RON 100 · AUD 100 · USD 100 · TWD **1** · JPY **1** (ghi chú bảng: «TWD không xu, divisor 1»; «JPY không xu, divisor 1»).
Đo đơn thật 60 ngày (05/10): COD đơn TWD dạng `990`/`1290`…, EUR/RON dạng `xx00` — khớp hệ số trên.

## ② Hợp đồng vào / ra

**Vào:** `HE_SO_TE` đóng băng 7 tệ, mọi tệ ×100. Nơi đọc (đo `grep -rln "HE_SO_TE\|TIEN_TE_THI_TRUONG" src v3/src`): `src/pos/tao-don.js`
· `src/pos/index.js` · `src/pos/doc-danh-muc.js` · `src/orders/hang-cho.js` · `src/admin-v3/operations.js` · `src/chat/rap-prompt.js` ·
`src/products/ban-chep-bot.js` · `src/products/nap-tu-kb.js` · `src/products/san-pham-goc.js` · `src/products/chuyen-ban-sao.js` ·
`v3/src/ui/mot-page/kho-mot-page.js` · `v3/src/ui/van-hanh/router.js` · `v3/src/ui/van-hanh/don-cho.js` · `v3/src/noi-day/kho-san-pham-v3.js`.

**Ra:**
1. `HE_SO_TE` thêm `EUR: 100 · RON: 100 · AUD: 100 · TWD: 1 · JPY: 1` (giữ nguyên 7 tệ cũ; chú thích nguồn `dim_shop_project`).
2. `TIEN_TE_THI_TRUONG` thêm đúng tên thị trường của kết nối trên prod: `Europe: "EUR" · Romania: "RON" · Slovakia: "EUR" · USA: "USD" ·
   Australia: "AUD" · Taiwan: "TWD"` (Japan chưa có kết nối — không thêm).
3. **Soát MỌI nơi đọc** ở «Vào»: chỗ nào ngầm cho mọi tệ là 100 (vd chia cứng `/100`, `toFixed(2)`, kiểm `Math.round(price*he) >= 1`
   mà với hệ 1 thì số lẻ bị cắt, định dạng hiển thị 2 chữ số thập phân cho TWD/JPY) ⇒ sửa cho đúng hệ số, hoặc dừng báo tổng nếu nằm
   ngoài ③. Giá TWD/JPY nhập có phần lẻ (vd 990,5 TWD) ⇒ từ chối rõ (POS không có xu), không làm tròn ngầm.
4. Không đổi luật «tệ lạ ⇒ từ chối»; không thêm tệ nào khác ngoài năm tệ trên.

## ③ File được đụng

```
src/pos/tao-don.js
src/products/chuyen-ban-sao.js
src/pos/index.js
src/pos/doc-danh-muc.js
src/orders/hang-cho.js
src/admin-v3/operations.js
src/chat/rap-prompt.js
src/products/ban-chep-bot.js
src/products/san-pham-goc.js
v3/src/ui/mot-page/kho-mot-page.js
v3/src/ui/van-hanh/router.js
v3/src/ui/van-hanh/don-cho.js
v3/src/noi-day/kho-san-pham-v3.js
v3/src/ui/san-pham/trang/san-pham.html
test/tt1-*.test.mjs
ops/bin/nghiem-thu/tt1.sh
```
Chỉ sửa ở tệp nào soát ra lỗi thật với hệ 1 / tệ mới — mỗi chỗ sửa ghi lý do vào nhật ký. `src/admin-v3/operations.js` được phép ở
phiếu này CHỈ cho phần quy đổi đơn vị (`saveProduct` đang kiểm `HE_SO_TE[g.tien_te]`).

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/tt1.sh`, rc=0 khi đạt; đảo-vá trên BẢN SAO tạm; nạp `.env` nếu thiếu `DATABASE_URL_V3`; KHÔNG `rg`)

1. Lưu giá chỉ-giá (`saveProduct` chiGia) một món shop Europe: 1 × 49,99 EUR ⇒ `goi_gia.gia = 4999`, `tien_te = 'EUR'`; đọc lại qua
   `catalog.js#docSanPhamGoiGia` + `goiGiaChoChat` ⇒ price 49,99.
2. Món Taiwan: 1 × 990 TWD ⇒ `gia = 990` (KHÔNG 99000); hiển thị 990 TWD (không «9,90»); 990,5 TWD ⇒ từ chối rõ, 0 ghi.
3. `cua2Tien`: page gắn gốc × shop Taiwan, đơn 990 TWD ⇒ MỞ; 991 ⇒ ĐÓNG. Cùng phép cho EUR (4999 ⇒ MỞ).
4. Đối soát GSP3 trên shop Romania: bản sao RON ⇒ không còn `thi_truong_la`; bậc AED trên shop Romania ⇒ `lech_tien_te`.
5. Bảy tệ cũ không đổi một con số: lưu + đọc + `cua2Tien` cho SAR/KWD giữ nguyên (ca cũ VA-R2, VE8b, GSP3 xanh).
6. Tệ lạ (vd `GBP`) ⇒ vẫn từ chối như cũ.
7. Đảo-vá: (i) TWD về 100 ⇒ phép 2/3 đỏ; (ii) bỏ `Romania` khỏi bảng thị trường ⇒ phép 4 đỏ; (iii) bỏ EUR ⇒ phép 1 đỏ.
8. Cổng cũ xanh (rc tách dòng): `gsp2.sh` · `gsp3.sh` · `gsp3b.sh` · `ve8b.sh` · `va-r2.sh` (= nợ cũ 1 đỏ, không thêm). `npm test` không thêm
   ca đỏ.

## ⑤ Test chạm nhánh nào

`test/tt1-*.test.mjs` (Postgres hộp cát: lưu · đọc · cửa tiền · đối soát · hiển thị cho EUR/RON/AUD/TWD; bảy tệ cũ giữ nguyên).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Điền giá từ đơn POS (GP1) · mặc định `'AED'` ở `src/kb.js` / `src/fast-lane.js` (bộ não, luồng cũ) · shop Japan (chưa kết nối) · tỷ giá /
quy đổi giữa các tệ (KHÔNG làm — người quyết: giá theo đúng tệ của đơn).

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-TIEN-TE\|TWD\|HE_SO_TE"
N-TIEN-TE-NGOAI-GCC (H7 05/10) HE_SO_TE thiếu EUR · RON · AUD · TWD · JPY; TIEN_TE_THI_TRUONG chỉ 6 nước GCC ...
```
Quan hệ: **trả nợ N-TIEN-TE-NGOAI-GCC**.
