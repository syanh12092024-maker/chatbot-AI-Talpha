# PHIẾU TT1b — Ràng tệ của bậc giá và của đơn với tệ của thị trường shop (đơn POS không được thu sai ×100 / ×0,01)

**Base:** `b04d0dc` (TT1 chặng 2 ĐẠT; `_chan1 tt1` chạy song song — `tt1.sh` là cổng cũ) · **Làn:** 🟥 (đường TIỀN: bậc giá bot báo khách · tiền đơn đẩy lên POS)
**Nguồn:** đối kháng TT1 07/10 (verdict `refute-tt1.verdict.yaml`) **F1 NEN CONFIRMED** · review (a) 07/10 TRẢ VỀ (2 CHẶN thi công · 5 NÊN — đã
vào phiếu, mục «Sửa sau review (a)» cuối ②) · nợ N-TT1-TE-LECH-THI-TRUONG (+ N-TIEN-TE-MAC-DINH phần mã) · `01-QUYET-DINH.md` §8 «Một nguồn».
**Xếp lịch:** nhóm TỐI THIỂU pilot (review (a) N1 — F1 chạm cả GCC: shop Kuwait gõ «SAR 109» ⇒ khách nghe 109 SAR, POS thu 109 KWD ≈ ×12; team
GCC có shop Taiwan; page kb không tạo được đơn POS nên đơn COD đầu tiên của v3 BẮT BUỘC đi đúng đường F1 — món pos × shop, giá gõ tay ở «Theo thị
trường» không lớp chặn nào).
**Đụng bộ não:** không.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review` (đường tiền).

## ① Thi hành đoạn nào

Tệ của bậc giá KHÔNG bị ràng với tệ của shop, và không lớp nào sau đó bắt được:
- `src/admin-v3/operations.js#saveProduct` (`:194-240`) chỉ kiểm `tien_te ∈ HE_SO_TE` (`:225`).
- Bot lấy tệ của đơn từ chính bậc (`src/orders/draft.js:34`) ⇒ `cua2Tien` so tệ đơn với tệ bậc (`src/orders/hang-cho.js:258`) — luôn khớp.
- `taoDon` cửa (b) (`src/pos/tao-don.js:435-455`) chỉ kiểm tệ có hệ số (`phiVanChuyenMinor`), không kiểm thị trường (`market` có sẵn trong hàm).
- Đối soát GSP3 cố ý miễn soát giá món (`src/products/chuyen-ban-sao.js:599`).
Chạy thật (repro `<scratchpad tổng>/tt1-refute/test/refute-tt1-r1.test.mjs`): shop Taiwan, bậc gõ «USD» 990 ⇒ bot báo «990 USD», POS shop nhận
`shipping_fee=99000` = thu 99.000 TWD (×100). Shop Europe, bậc gõ «TWD» 49 ⇒ POS nhận 49 = 0,49 EUR (×0,01 — hướng này do TT1 mở; base từ chối).
Lời khai ca T6 (`test/tt1-tien-te-ngoai-gcc.test.mjs:233`) «chỉ cửa tiền ĐÓNG khi tệ đơn ≠ tệ bậc» dựa vào điều kiện bot không bao giờ tạo ra.
Đo prod 07/10 (chỉ đọc): 24 kết nối POS, mọi `market` ∈ `TIEN_TE_THI_TRUONG` (Saudi · UAE · Kuwait · Qatar · Oman · Bahrain · Taiwan · Australia ·
USA · Europe · Romania · Slovakia); `goi_gia` 154 bậc — TẤT CẢ thuộc món `kb` (bản sao theo page), món `pos` 0 bậc ⇒ chặn mới không chặn dữ liệu cũ
(ảnh chụp 07/10 — màn «Theo thị trường» đã lên prod từ 05/10, đo lại lúc mở van: ⑦b).

## ② Hợp đồng vào / ra

1. **Một bảng, một chỗ**: dời `TIEN_TE_THI_TRUONG` sang `src/pos/tao-don.js` cạnh `HE_SO_TE` (xuất qua `src/pos/index.js`); `chuyen-ban-sao.js`
   import + RE-EXPORT đúng tên cũ (nơi gọi cũ không đổi; tránh vòng import — `chuyen-ban-sao.js` đã import `tao-don.js`, chiều ngược lại cấm).
   Giữ nguyên nội dung bảng và luật «mỗi tệ trong bảng PHẢI có trong `HE_SO_TE`» (ca T0b).
2. **`taoDon` cửa (b)** — trước MỌI lượt gọi POS: `market` không có trong bảng ⇒ CHẶN; `TIEN_TE_THI_TRUONG[market] !== don.tienTe` ⇒ CHẶN. Chặn =
   `ghiChan(soNhatKy, { cua: "b", chiTiet: "lech_te_thi_truong: đơn <te> ≠ <market> <te thị trường>" })` + ném lỗi có tên (câu nói rõ hai tệ và
   thị trường), KHÔNG dựng payload. Đơn đúng tệ ⇒ như cũ. **Vị trí:** SAU phép kiểm `shop_lech` (`tao-don.js:458-470` — chỉ sau đó market mới chắc
   là thị trường của shop món; market đến từ page qua `hang-cho.js:834-842`), TRƯỚC `dungPayload`. Câu lỗi dặn «báo marketer sửa bậc giá ở Sản phẩm ›
   Theo thị trường» — KHÔNG dùng lời «Sale bổ sung qua `duyet(..., {boSung})`» của `LoiThieuThamChieuSanPham` (sale không sửa được tệ: `don-cho.js:88`).
3. **`saveProduct`** (cả đường đầy đủ lẫn `chiGia`) — với sản phẩm `nguon='pos'` (`ma` = `<shop_id>:<variation>`): tra `ket_noi_pos` theo
   (team của sản phẩm, `shop_id`) ⇒ `market` ⇒ tệ thị trường. Mọi bậc gửi lên có `tien_te !== tệ thị trường` ⇒ 400 «Bậc giá dùng <X> nhưng shop
   <market> bán bằng <Y>» (in mã tệ đã qua bảng, không vọng chuỗi thô). Không tìm được kết nối / market ngoài bảng ⇒ 400 nói rõ (fail-closed).
   Tra kết nối **KHÔNG lọc `bat`** (kết nối tạm tắt không được khoá việc sửa giá); tra theo CẶP (team, shop_id) — KHÔNG `shop_id` trơn + `LIMIT 1`.
   Sản phẩm `nguon='kb'` GIỮ NGUYÊN (đường này bị cắt ở GSP4). `operations.js`: CHỈ `saveProduct` (GL2 sẽ sửa `setPage` — không đụng).
4. Sửa chú thích ca T6 (`test/tt1-tien-te-ngoai-gcc.test.mjs:233`) cho đúng: nay chặn ở `saveProduct` (món POS) và `taoDon` cửa (b).
5. Không đổi `HE_SO_TE`, `quyDonViNho`, `cua2Tien`, đối soát GSP3.

**Sửa sau review (a) 07/10:** C1 → ③ (6 tệp ca + `l3-m4.sh` — fixture market giả / mã `kb:` thiếu `nguon`) · C2 → ③ (`gsp3.sh` · `tt1.sh` — đột biến neo
chuỗi trong khối bảng) · N1 → «Xếp lịch» · N2 → ② 3 · N3 → ② 2 · N4 → ④ · N5 → ⑦b · G1 → câu lỗi ② 2.

## ③ File được đụng

```
src/pos/tao-don.js
src/pos/index.js
src/products/chuyen-ban-sao.js
src/admin-v3/operations.js
test/tt1-tien-te-ngoai-gcc.test.mjs
test/l3-m4-duyet.test.js
test/va-r2-tien-tao-don.test.js
test/ll2-hop-thu.test.mjs
test/frontend-v3-e2e.test.js
test/mn3-ban-chep-bot.test.mjs
test/mn4-anh-router.test.mjs
ops/bin/nghiem-thu/l3-m4.sh
ops/bin/nghiem-thu/gsp3.sh
ops/bin/nghiem-thu/tt1.sh
test/tt1b-*.test.mjs
ops/bin/nghiem-thu/tt1b.sh
docs/thi-cong/nhat-ky/refute-tong-the-1.repro.mjs
```
**Nới 07/10 (thợ xin, tổng duyệt):** `docs/thi-cong/nhat-ky/refute-tong-the-1.repro.mjs` CHỈ đổi `MARKET` `"GiaLapRefute1"` → `"UAE"` (cùng tệ AED) — repro do `va-r2.sh` chạy, chết ở F3b khi `taoDon` chặn thị trường ngoài bảng. Lệch nhẹ ② 3 (tổng nhận): `offers` rỗng (xoá hết bậc) cho qua — không bậc thì không lệch tệ.
`chuyen-ban-sao.js`: CHỈ thay khối khai `TIEN_TE_THI_TRUONG` (`:290-297`) bằng import + re-export. `test/tt1-tien-te-ngoai-gcc.test.mjs`: CHỈ chú thích
T6. **Sáu tệp ca cũ + `l3-m4.sh`** (đo review (a): bản vá tối thiểu làm đỏ 23 ca — base 875/0 → 852/23): CHỈ đổi tên thị trường giả sang tên THẬT cùng
tệ fixture đang dùng (`GiaLapDuyet`/`GiaLapVaR2`/`LL2`/`E2E` + AED ⇒ `'UAE'`, …) và thêm `nguon='kb'` cho dòng mã `kb:…` (đúng bản chất bản sao, như
`nap-tu-kb.js:152`; `DEFAULT 'pos'` ở `schema.sql:112`); KHÔNG đổi assert nào. **`gsp3.sh` · `tt1.sh`**: CHỈ đổi tệp đích của đột biến `doan_japan`
(`gsp3.sh:76,118`) / `bo_romania` (`tt1.sh:174,191`) sang `src/pos/tao-don.js`; `gsp3.sh` thêm `src/pos/tao-don.js` vào vòng chép `.goc` (`:58-59`) và
`DS_TEP_DOT` (`:60`); đáp án đỏ giữ nguyên. Đỏ NGOÀI danh sách trên ⇒ DỪNG, báo tổng (đừng nới luật cho market lạ đi qua).

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/tt1b.sh`, rc=0 khi đạt; Postgres hộp cát `DB="aicloser_v3_nt_tt1b_p$$"`; POS giả, KHÔNG mạng; `grep -E` không `rg`; nạp `.env` nếu thiếu `DATABASE_URL_V3`; đảo-vá trên BẢN SAO tạm)

1. Repro F1 viết lại thành ca (dựa `refute-tt1-r1.test.mjs`): shop Taiwan bậc «USD» 990 ⇒ `saveProduct` 400, 0 ghi. Shop Europe bậc «TWD» 49 ⇒ 400, 0 ghi.
   Shop Europe 49,99 EUR · Taiwan 990 TWD · Saudi 99 SAR ⇒ lưu thành (như cũ). Cả đường `chiGia`.
2. `taoDon` với đơn tệ ≠ tệ thị trường (dựng thẳng hàng chờ, bỏ qua `saveProduct`): POS giả nhận **0 POST /orders** (đếm riêng GET/POST theo khuôn
   `napGia` `test/l3-m4-duyet.test.js:58-80` — đi qua `duyet` thì cửa ③ đã GET), `nhat_ky` có dòng chặn cửa «b» `lech_te_thi_truong` (không phải
   «cửa (a)»), lỗi có tên. Market ngoài bảng (vd `Japan`) ⇒ chặn như vậy. Đơn đúng tệ ⇒ đúng 1 POST, `shipping_fee` đúng đơn vị nhỏ (cùng env).
2b. Vị trí: món nhầm shop + tệ lệch ⇒ lỗi `shop_lech` (không phải lệch tệ).
2c. Đường sale thật: `POST /api/hop-thu/don/:id/duyet` với đơn lệch tệ ⇒ 400, thông điệp nêu hai tệ + thị trường + «báo marketer sửa bậc»; hàng chờ
   vẫn `cho_duyet`; 0 POST.
3. Món `kb` với bậc tệ bất kỳ có trong `HE_SO_TE` ⇒ lưu như cũ.
4. Món POS của shop không có kết nối trong team ⇒ 400 nói rõ, 0 ghi. Cùng `shop_id` ở hai team, chỉ team A có kết nối ⇒ món team B 400, món team A
   lưu được. Kết nối `bat=false` ⇒ vẫn lưu được (không lọc `bat`).
5. Ca T0b + bộ `test/tt1-tien-te-ngoai-gcc.test.mjs` xanh; `import { TIEN_TE_THI_TRUONG } from "src/products/chuyen-ban-sao.js"` vẫn chạy và là CÙNG
   đối tượng với bản của `src/pos/index.js`; `grep -rcE 'Saudi: "SAR"' src/` tổng = 1 (một bảng).
6. Đảo-vá: bỏ chặn `saveProduct` ⇒ phép 1 đỏ; bỏ chặn `taoDon` ⇒ phép 2 đỏ (POS giả nhận 1 lượt); market ngoài bảng cho qua ⇒ phép 2 (Japan) đỏ;
   chặn cả món `kb` ⇒ phép 3 đỏ.
7. Cổng cũ (rc tách dòng): `tt1.sh` · `gsp3.sh` · `l3-m4.sh` · `va-r2.sh` · `ll2.sh` · bộ ca `test/he-so-te-doi-chieu-don-that.test.js` ·
   `test/gsp3-doi-soat.test.mjs` · sáu tệp ca ở ③ (assert không đổi). `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/tt1b-*.test.mjs` (`saveProduct` món POS đúng/sai tệ · `chiGia` · món kb · thiếu kết nối; `taoDon` cửa (b) lệch tệ · market lạ · đúng tệ).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Ô tiền tệ trên màn «Theo thị trường» mặc định + khoá theo shop (N-TIEN-TE-MAC-DINH phần giao diện) · `outbound-guard` chưa biết tệ mới
(N-GUARD-TIEN-TE-MOI — bộ não) · `src/pos/doc-don.js:365` khai sai «TWD ×100, KWD ×1000» + bản chép bảng hệ số thứ ba `ops/bin/nap-page-de-do.mjs:47`
(gộp N-TT1-LUOC-DO-HE-SO) · `quyDonViNho` nhận mọi thứ `Number()` nhận (`"  "` ⇒ 0, `"0x7BC"` ⇒ 1980) — gộp nợ /code-review TT1 #6 · chặn ở `taoDon`
làm `duyet` ROLLBACK ⇒ lý do không lưu vào hàng chờ, mở lại đơn không thấy vì sao (`hang-cho.js:1026-1032`) · `doc-danh-muc.js:225-255` đường ghi giá
thứ hai cho món POS không qua `saveProduct` (hôm nay không chạy — `keo-danh-muc` không truyền tệ) · `themKetNoi` nhận tên thị trường chữ tự do,
không đối chiếu bảng (kết nối tên lạ ⇒ cả shop không đặt giá / không tạo đơn, chỉ lộ lúc lưu giá).

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "N-TT1-TE-LECH-THI-TRUONG\|N-TIEN-TE-MAC-DINH"
N-TT1-TE-LECH-THI-TRUONG (/code-review TT1 #2) saveProduct chỉ kiểm tệ ∈ HE_SO_TE …
```
Quan hệ: **trả nợ N-TT1-TE-LECH-THI-TRUONG** (đối kháng TT1 F1 nâng mức: tiền POS sai, không chỉ lưu sai).

**⑦b · Đo prod lúc mở van (tổng, chỉ đọc — trước khi bật page pilot):** (i) bậc của món `nguon='pos'` có `tien_te` ≠ tệ thị trường của (team, shop) = 0;
(ii) `nguon='pos'` mà `ma !~ '^[0-9]+:'` hoặc không có kết nối (team, shop) = 0. Khác 0 ⇒ chưa bật, báo người sửa bậc.
