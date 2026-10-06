# Nhật ký phiếu TT1 — đơn vị tiền tệ ngoài GCC (EUR · RON · AUD · TWD · JPY) + bảng thị trường → tiền tệ

**Thợ:** session thợ thi công 05–07/10/2026 · **Base:** `da50df6` (code) — HEAD lúc nhận `b3940ff`, tổng nới pathspec `354e8a6`, tổng ghi sổ
`4fc4e0e` · **Làn:** 🟥 đường tiền · **Skill:** `tho-thi-cong` · `viet-thuoc` · **Môi trường mọi số đo dưới đây:** MÁY DEV, Postgres hộp cát
tự dựng/tự dọn (`aicloser_v3_test_tt1_p<pid>` cho bộ ca, `aicloser_v3_nt_tt1_p$$` cho cổng) — KHÔNG đo `aicloser_v3` dev, KHÔNG đo prod.

## ⑦ ĐÃ TRA CHƯA (output máy)

```
$ awk '/^## §9 /,/^## §9b/' docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | grep -n "N-TIEN-TE\|TWD\|HE_SO_TE\|N-GUARD-TIEN"
661:  `HE_SO_TE` (`src/pos/tao-don.js:96`) đều khai `KWD/OMR/BHD ×1000`. ...        ← vá 16/09 (KWD 1000→100), không trùng
863:  **ĐÃ SỬA** `src/pos/tao-don.js` `HE_SO_TE`: KWD·OMR·BHD 1000→100 ...
873:  `Object.keys(HE_SO_TE).length` (án lệ ②+④).
1043:  - **N-TIEN-TE-MAC-DINH** bậc giá đầu của thị trường chưa có giá: ô tiền tệ để trống ...   ← ngoài phiếu (⑥)
1156:  - **N-TIEN-TE-NGOAI-GCC** (H7 05/10) `HE_SO_TE` ... thiếu EUR · RON · AUD · TWD · JPY ...  ← phiếu này TRẢ
1159:  - **N-GUARD-TIEN-TE-MOI** (review (a) TT1 05/10) `src/outbound-guard.js:78` (BỘ NÃO) ...    ← ngoài phiếu, không đụng
$ ls docs/thi-cong/SO-NO.md ops/bin/tra_no.py   → không tồn tại (repo không có hai tệp này) · CLAUDE.md không có ở gốc
```
Không trùng nợ/phán cũ ngoài N-TIEN-TE-NGOAI-GCC (phiếu trả) — không phải báo tổng trước khi code.

## Bước 3 — đo lại nguyên liệu đề bài

`grep -rn "HE_SO_TE\|TIEN_TE_THI_TRUONG\|currencyFactors" src v3/src` (base) — 16 nơi đọc khớp mục «Vào» của phiếu, cộng 3 nơi phiếu không kê:
`src/products/nap-tu-kb.js:83` (bộ nạp một lần MN2 — ngoài ③), `src/orders/legacy.js:47` (đi qua `doiSangDonViNho`), `src/products/catalog.js`
(không đọc hệ số, chỉ chuyển `goi_gia` thô). Tên thị trường prod lấy từ `docs/thi-cong/nhat-ky/h7-chuyen-team-20261005.md:122,361-362`
(Taiwan kết nối 19 · Europe 20 · Romania 21 · Slovakia 22 · USA 23 · Australia 24) — **giả định ghi rõ:** không đọc lại prod (cấm SSH ghi; đọc
cũng không cần — hồ sơ H7 là bản ghi lượt tạo các kết nối đó, tên do tổng đặt).
Dữ liệu cũ mang EUR/TWD lưu sai hệ số trước TT1: KHÔNG thể có — ba cửa ghi `goi_gia` đều chặn tệ ngoài bảng (`saveProduct` `!HE_SO_TE[g.tien_te]`
⇒ 400; `nap-tu-kb.js:90` «tiền tệ lạ — bỏ sản phẩm»; `doc-danh-muc.js:230` chỉ ghi giá khi nơi gọi truyền `tienTe`, và `keo-danh-muc.js`
không truyền — grep `tienTe` trong keo-danh-muc.js = 0).

### Soát từng nơi đọc (② Ra 3)

| Nơi đọc | Giả định ×100 / làm tròn ngầm? | Việc |
| --- | --- | --- |
| `src/pos/tao-don.js` `HE_SO_TE` · `doiSangDonViNho` | `Math.round(n*he)` ngầm (990,5 TWD ⇒ 991) | thêm 5 tệ + chú thích nguồn; thêm `quyDonViNho` (một luật); `doiSangDonViNho` đi qua nó |
| `src/orders/hang-cho.js` `quyTongTienNho` | `Math.round(lon*he)` ngầm | đi qua `quyDonViNho` ⇒ phần lẻ ⇒ `tong_tien` null (cửa ① báo thiếu) |
| `src/admin-v3/operations.js` `saveProduct` | giá: kiểm chia hết ĐÚNG với hệ 1 nhưng lời từ chối chung chung; `gia_goc`/`phi_ship`: `Math.round` ngầm, không kiểm | lời từ chối RÕ («không có xu»); giá gốc/phí ship cùng luật; INSERT dùng `quyDonViNho` |
| `src/products/chuyen-ban-sao.js` `TIEN_TE_THI_TRUONG` | thiếu 6 thị trường | thêm Europe · Romania · Slovakia · USA · Australia · Taiwan; Japan vắng |
| `src/pos/index.js` | — | re-export `quyDonViNho` |
| `src/pos/doc-danh-muc.js` | không đọc hệ số (giá POS ghi thẳng, đã minor) | không sửa |
| `src/chat/rap-prompt.js` `goiGiaChoChat` | chia `HE_SO_TE[currency]`, không `toFixed` | không sửa — ca T1/T2 đo 49.99 EUR · 990 TWD |
| `src/products/ban-chep-bot.js` `lon` | chia theo bảng | không sửa — ca T1/T2 đo `tiers` 49.99 · 990 |
| `src/products/san-pham-goc.js` `giaCuaMon` | chia theo bảng | không sửa — ca T2 đo màn 990 · 49.99 (tệp GSP3c đang sửa ở cây riêng — 0 dòng đụng) |
| `v3/src/ui/van-hanh/router.js:221` · `don-cho.js:35` · `van-hanh.js:423` · `hop-thu-ui.js:70` | chia theo `HE_SO_TE`/`currencyFactors` (= `HE_SO_TE`) | không sửa |
| `v3/src/noi-day/kho-san-pham-v3.js` `lon` | chia theo bảng | không sửa — ca T2 đo `giaDau` 990 |
| `v3/src/ui/mot-page/kho-mot-page.js:269` | chỉ chú thích | không sửa |
| `v3/src/ui/san-pham/trang/san-pham.html` | `formatNumber` = `Intl.NumberFormat('vi-VN')` mặc định (không ép 2 số lẻ), ô nhập `step="any"` | không sửa |


## Thay đổi (commit `bc190f5`) — mỗi chỗ một lý do

- **`src/pos/tao-don.js`** — `HE_SO_TE` thêm `EUR 100 · RON 100 · AUD 100 · TWD 1 · JPY 1` + khối chú thích nguồn («Hệ số là theo CÁCH POS
  LƯU, không theo ISO», nguồn `dim_shop_project.currency_divisor`). Thêm **`quyDonViNho(soLon, tienTe)`** — MỘT luật quy lớn → nhỏ: số nguyên
  đơn vị nhỏ, hoặc `null` (tệ không phải khoá RIÊNG của bảng — `Object.hasOwn`, nên `toString` không lọt · không phải số · không chia hết
  đơn vị nhỏ). Dung sai co theo độ lớn `max(1e-6, |nhỏ|×8ε)` (/code-review #7). `doiSangDonViNho` đi qua nó (lý do: `Math.round` ngầm —
  990,5 TWD ⇒ 991; nơi gọi `src/orders/legacy.js:47` đọc `!(total > 0)` là từ chối nên `null` an toàn).
- **`src/pos/index.js`** — re-export `quyDonViNho` (operations.js · hang-cho.js nạp qua cửa này).
- **`src/orders/hang-cho.js` `quyTongTienNho`** — đi qua `quyDonViNho`; bỏ import `HE_SO_TE` (không còn dùng). Lý do: `Math.round(lon*he)` ngầm
  biến 990,5 TWD thành gói 991 có thật; nay `tong_tien` giữ null ⇒ cửa ① báo thiếu (mù có nói ra).
- **`src/admin-v3/operations.js` `saveProduct`** (chỉ phần quy đơn vị — đúng giới hạn ③): kiểm tệ bằng `Object.hasOwn`; giá lẻ dưới đơn vị
  nhỏ ⇒ lời từ chối RÕ («Giá 990.5 TWD có phần lẻ — POS không có xu cho TWD…»; hệ 100: «… lẻ quá đơn vị nhỏ POS (1/100 EUR); nhập tối đa 2
  chữ số thập phân»); `gia_goc`/`phi_ship` cùng luật (trước: `Math.round` ngầm, không kiểm — với hệ 1 thì 1980,5 ⇒ 1981). Lời từ chối chỉ in
  số đã ép kiểu (không vọng chuỗi thô). Số đã quy lưu vào `quy[]`, INSERT dùng lại (/code-review #9). Tệ lạ giữ NGUYÊN lời cũ («Gói giá phải
  có số lượng duy nhất, giá dương và tiền tệ được hỗ trợ») — ④6 «như cũ».
- **`src/products/chuyen-ban-sao.js`** — `TIEN_TE_THI_TRUONG` thêm `Europe EUR · Romania RON · Slovakia EUR · USA USD · Australia AUD ·
  Taiwan TWD`; bỏ câu «Taiwan cố ý vắng» (đã sai); Japan vắng. Không đụng biểu thức `lonTheoTe` (đảo-vá `bo_chia_don_vi` của gsp2/gsp3 neo nó).
- **Thước neo luật cũ (tổng duyệt nới ③, đợt 1 commit `354e8a6`)**: `test/he-so-te-doi-chieu-don-that.test.js` H4 → «mọi tệ ×100 NGOẠI TRỪ
  `{TWD:1, JPY:1}`» + neo `doiSangDonViNho(990,'TWD') = 990` (vẫn chặn ai thêm tệ theo ISO ×1000) · `test/gsp3-doi-soat.test.mjs` ④7 ví dụ
  thị trường lạ Taiwan → Japan (3 dòng, khẳng định giữ nguyên) · `gsp3.sh` đảo-vá `doan_taiwan` → `doan_japan` (neo dòng mới của bảng).
- **Nới đợt 2 (tổng duyệt qua tin nhắn 06/10 — tổng cập nhật ③ phiếu)**: `ops/bin/nghiem-thu/gsp3b.sh` ③c/③d + `gsp3.sh` ③ — so phạm vi
  trong ĐÚNG khoảng commit của phiếu cũ thay vì tới cây hiện tại. Đo trước khi dùng: `0f2c4bf` = «fix(san-pham): GSP3 — vòng 2» (commit MÃ
  cuối của GSP3; sau đó chỉ docs `307c79b`/`bf4f439`); `d688a3d` = «fix(san-pham): GSP3B — vòng 2» (commit mã cuối GSP3b; sau đó docs
  `14c57ec`/`d8ff7f4`). `git diff --quiet b0b82d7 0f2c4bf -- <3 tệp>` rc=0 · `git diff --quiet aa43268 d688a3d -- <7 tệp>` rc=0 ·
  `git diff aa43268 d688a3d -- chuyen-ban-sao.js | grep -c '^-[^-]'` = 0. Lý do: trên cây TT1, gsp3.sh đỏ đúng 1 phép
  «③không-sửa-operations/anh/ban-chep so với b0b82d7» (mọi phép khác xanh, `doan_japan ⇒ ④7 đỏ fail=2`); gsp3b ③c (operations.js —
  và cả GSP3c đang sửa san-pham-goc.js/noi-pos.js) và ③d (dòng `TIEN_TE_THI_TRUONG`) sẽ đỏ cùng lẽ. **Giá phải trả** (/code-review #8, ghi
  vào chú thích cổng): phép thành sự thật lịch sử, GSP3/GSP3b mở vòng 3 thì phải dời hash.
- **Mới**: `test/tt1-tien-te-ngoai-gcc.test.mjs` (11 ca) · `ops/bin/nghiem-thu/tt1.sh` (8 phép ④ + 7 đảo-vá).
- **Không sửa** (soát xong, không có giả định ×100 — bảng soát ở trên): doc-danh-muc · rap-prompt · ban-chep-bot · san-pham-goc (cây chung
  0 dòng đổi — không chạm việc GSP3c) · kho-mot-page · van-hanh router/don-cho/van-hanh.js · hop-thu-ui · kho-san-pham-v3 · san-pham.html.

### Mâu thuẫn / đánh đổi đã chọn (luật 13)

- **Một luật cho mọi tệ, kể cả bảy tệ cũ**: tổng bot chốt lẻ dưới xu (vd 13,955 KWD) trước đây `Math.round` rồi có thể khớp một gói; nay
  `tong_tien` null ⇒ cửa ① báo thiếu tổng, sale bổ sung. Giá giá gốc/phí ship lẻ dưới xu ở tệ cũ nay bị từ chối (trước: làm tròn). Chọn
  fail-closed vì POS không lưu được phần lẻ đó; giá phải trả: một lượt sửa tay hiếm hoi. Giá hợp lệ của bảy tệ cũ không đổi một con số (ca T5,
  phép P5, va-r2 · l3-m4 · ve8b · gsp3 xanh).
- **Lời từ chối tệ lạ giữ nguyên chữ** dù lời từ chối phần lẻ là câu mới — ④6 đòi «như cũ».

## Danh sách ca (viết trước, rồi mới viết ca chi tiết)

| Ca | Nhóm | Kịch bản |
| --- | --- | --- |
| T0a | known-answer từ NGUỒN | `HE_SO_TE` = 7 tệ cũ y nguyên + EUR/RON/AUD 100 + TWD/JPY 1, đóng băng, không thêm tệ khác |
| T0b | known-answer + lời khai | `TIEN_TE_THI_TRUONG` = 6 GCC + 6 thị trường prod; mọi tệ của bảng ∈ `HE_SO_TE` (đo lời khai chú thích); Japan vắng |
| T0c | BIÊN | `quyDonViNho` 23 cặp: chia hết · lẻ (990,5 TWD · 0,5 JPY · 49,999 EUR · 13,955 KWD · 1e9+0,5 TWD) · số lớn có xu · tệ lạ/`toString`/rỗng/NaN; `doiSangDonViNho`; `chuanHoaHoSo` tổng TWD/EUR/RON/GBP/SAR |
| T1 | CHO-QUA trọn đường | Europe 49,99 EUR (+ bậc 2 giá gốc/ship) ⇒ 4999 · đọc `docSanPhamGoiGia` → `goiGiaChoChat`/`xayVanBanSanPham` 49.99 EUR → bản chép bot 49.99 → `pageStatus` không «Thiếu gói giá» |
| T2 | CHO-QUA trọn đường | Taiwan 990 TWD ⇒ 990 · bot · bản chép · màn Sản phẩm (`chiTietSanPhamGoc`) · `kho-san-pham-v3` đều 990 |
| T2b | CHẶN (đọc lời + 0 ghi) | 990,5 TWD giá / giá gốc / phí ship · giá gốc chữ ⇒ 400 lời rõ; phiên bản · bậc giá · nhật ký y nguyên; 49,999 EUR lời «lẻ quá đơn vị nhỏ» |
| T3 | BIÊN + CHẶN (mã) | `cua2Tien` qua `chuanHoaHoSo`: 990/1290 TWD MỞ · 991 ĐÓNG `lech_bang_gia` · 990 EUR trên Taiwan ĐÓNG · 49,99/79,9 EUR MỞ · 49,98 ĐÓNG · 4999 TWD trên Europe ĐÓNG · 990,5 TWD `khong_co_tong` |
| T4 | HÀNH VI trọn đường + CHẶN | đối soát GSP3 Romania: bản sao RON ⇒ `chep`, giá lên món 14900, cửa tiền 149 RON MỞ; bản sao AED ⇒ `lech_tien_te`, 0 ghi |
| T5 | hồi quy bảy tệ cũ | SAR 99/159,5 + ship 25 · KWD 10,9/18,9 ⇒ 9900/15950/2500 · 1090/1890; bot 10.9/18.9; cửa tiền MỞ đúng gói, 109 KWD ĐÓNG |
| T6 | CHẶN «như cũ» | GBP · `aud` thường ⇒ 400 lời cũ, 0 ghi; AUD 59,95 ⇒ 5995, cửa MỞ; tổng GBP `khong_co_tong` |

Nhánh KHÔNG chạm (khai): màn trình duyệt `van-hanh.js:423` · `hop-thu-ui.js:70` (chia `currencyFactors` = chính `HE_SO_TE`, không có giả định
×100 để đo) · route `/api/van-hanh/products` (cùng phép chia với `chiTietSanPhamGoc` đã đo) · đường `taoDonTuLegacy` trọn vẹn (chỉ đo
`doiSangDonViNho`) · `src/outbound-guard.js` (bộ não, nợ N-GUARD-TIEN-TE-MOI). Ca không đụng ngày/giờ ⇒ không cần chạy hai múi giờ.

## Nghiệm thu — số đo (máy dev, hộp cát)

**Bộ ca:** `node --test test/tt1-tien-te-ngoai-gcc.test.mjs` ⇒ `ℹ tests 11 · pass 11 · fail 0`.

**`npm test` (luật 6, không chạy song song lượt khác):**

| Lượt | tests | pass | fail | skip | ghi chú |
| --- | --- | --- | --- | --- | --- |
| trước — worktree `354e8a6` (mã = `da50df6`) | 2452 | 2430 | 0 | 22 | chạy trong worktree scratchpad (`.env` + `node_modules` symlink) — 22 skip là ca cần tệp dữ liệu thật vắng ở worktree, không do mã |
| sau lượt 1 (cây chung, trước sửa /code-review) | 2463 | 2459 | 0 | 4 | +11 = bộ ca TT1 |
| sau lượt 2 (sau sửa /code-review, ngay trước commit) | 2486 | 2482 | 0 | 4 | cây chung lúc đó có GL3 chưa commit của phiên khác (`src/pancake.js` + 2 tệp `test/gl3-*`) — số ca tăng gồm cả của họ; **0 ca đỏ** |

**Cổng `ops/bin/nghiem-thu/tt1.sh`** — lượt trên bản commit `bc190f5` (log `scratchpad/tt1/cong-tt1-v2.log`, 1:26:18):

```
   (cây đo: /Users/macminim416256/Downloads/Work/AI Chatbot · cwd … · tao-don.js nạp từ …/src/pos/tao-don.js · HE_SO_TE={"AED":100,"SAR":100,"QAR":100,"USD":100,"KWD":100,"OMR":100,"BHD":100,"EUR":100,"RON":100,"AUD":100,"TWD":1,"JPY":1})
   ✔ P1 Europe EUR = gia=4999 te=EUR bot=49.99 EUR
   ✔ P2a Taiwan TWD = gia=990 te=TWD bot=990 TWD man=990
   ✔ P2b 990,5 TWD (giá · giá gốc) = gia=TU_CHOI_RO giaGoc=TU_CHOI_RO ghi_moi=0 doi_phien_ban=0
   ✔ P3 cửa tiền = tw990=MO tw991=DONG:lech_bang_gia tw990.5=DONG:khong_co_tong eu49.99=MO
   ✔ P4 đối soát Romania = ron=chep(gia=14900) aed=lech_tien_te
   ✔ P5 SAR · KWD = sar=9900 kwd=1090 bot=99 SAR,10.9 KWD cuaSar=MO cuaKwd=MO
   ✔ P6 GBP = gbp=TU_CHOI_NHU_CU ghi_moi=0 tongGbp=null
   ✔ đảo-vá twd_ve_100 ⇒ P2a,P2b,P3 đỏ + bộ ca đỏ (6)
   ✔ đảo-vá bo_romania ⇒ P4 đỏ + bộ ca đỏ (3)
   ✔ đảo-vá bo_eur ⇒ P1,P3 đỏ + bộ ca đỏ (8)
   ✔ đảo-vá lam_tron_ngam ⇒ P2b,P3 đỏ + bộ ca đỏ (4)
   ✔ đảo-vá gia_goc_round ⇒ P2b đỏ + bộ ca đỏ (3)
   ✔ đảo-vá quy_tong_round ⇒ P3 đỏ + bộ ca đỏ (3)
   ✔ đảo-vá dung_sai_co_dinh ⇒ (chỉ bộ ca) đỏ + bộ ca đỏ (1)
   ✔ khôi phục bản sao ⇒ số phép lệch = 0
   ✔ cây chung không dính đột biến (băm 4 tệp đột biến trước = sau)
   ✔ bộ ca TT1 pass=11 fail=0 (sàn ≥11)
   ✔ lưới gần he-so-te 5/0 · gsp3-doi-soat 28/0 · va-r2-tien-tao-don 11/0 · l3-m4-hang-cho 25/0 · ve8b-gia-page 7/0
   ✔ cổng cũ gsp2 rc=0
   ✔ cổng cũ gsp3 rc=0
   ✘ cổng cũ gsp3b rc=1 · 6 dòng đỏ MỚI so với da50df6      ← chập chờn chuỗi con, xem dưới
   ✔ cổng cũ ve8b rc=0
   ✔ cổng cũ va-r2 rc=1 — ĐỎ SẴN ở da50df6: 12 dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ cũ, không do TT1)
PHÉP=27 LỖI=1
```

**Đỏ lạ của `gsp3b` = chập chờn chuỗi cổng con (N-VAI-B-NOI-DAY-CHAP-CHON), đo bằng chạy riêng:**
- lượt 1 (trước sửa /code-review): đỏ ở tầng `gsp3b → … → ll13 → ll6 → ll5 → ll3 → ll1`; chạy riêng `ll1.sh` ⇒ rc=0, ĐỎ 0 / XANH 10.
- lượt 2 (`bc190f5`): đỏ ở tầng `gsp3b → gsp3 → ll15d → ve7c → ve7b → ve2b-page-gop.test.mjs fail=1`; chạy riêng: `ve2b-page-gop.test.mjs`
  3/3 lượt `pass 17 · fail 0` · `ve7b.sh` rc=0 (0 dòng đỏ) · `ll15d.sh` rc=0 (0 dòng đỏ). Hai lượt đỏ ở HAI chuỗi khác nhau và cùng mã
  chạy riêng thì xanh ⇒ đỏ không xác định theo mã (đúng mẫu nợ N-VAI-B-NOI-DAY-CHAP-CHON: tải cao khi cổng lồng 6–10 tầng). Không khẳng định
  chuỗi đó không nạp tệp TT1 — chỉ khẳng định số đo chạy riêng.
- **`gsp3b.sh` chạy RIÊNG** (cây chung, mã TT1 `bc190f5`, HEAD lúc đó `08ff546`): `== ĐỎ 1 / XANH 54` — mọi phép riêng xanh (①–⑤, kể cả
  `③c-không-sửa-tệp-cấm trong aa43268..d688a3d` · `③d … dòng cũ bị sửa/xoá=0`); đỏ DUY NHẤT `⑥cổng-cũ-gsp1 rc=1` ở chuỗi
  `gsp1 → ll15d → ll15a → ve7b-ket-noi.test.mjs fail=1` — đúng tiến trình TỔNG dừng tay (treo 36′, 0% CPU, chỉ LISTEN cổng cục bộ).
  Theo lệnh tổng, chạy RIÊNG `node --test --test-timeout=120000 v3/test/b/ve7b-ket-noi.test.mjs` hai lần mỗi cây:
  HEAD `2c72688` (có TT1) lượt 1 `tests 8 · pass 8 · fail 0 · cancelled 0` 4,25 s · lượt 2 8/8 4,19 s;
  base `2e11bf9` (cha của `bc190f5`, worktree tạm) lượt 1 8/8 4,21 s · lượt 2 8/8 4,10 s ⇒ **treo KHÔNG do TT1** (cả hai cây xanh như nhau).
- `ve8b` · `gsp2` · `gsp3` · `ve2` · `ve2b` rc=0; `va-r2` rc=1 = 12 dòng đỏ giống hệt base (nợ cũ).
- `gsp3.sh` trên cây TT1 trước nới ③: ĐỎ đúng 1 phép (③) — sau nới: rc=0 cả hai lượt trong tt1.sh.

### Đảo-vá — «đột biến nào KHÔNG đỏ?»

Bảy đột biến đều bị bắt bởi CẢ phép nội dung đúng tên lẫn bộ ca (lượt 2 đo bản SAU vá /code-review — án lệ #26: `gia_goc_round`,
`lam_tron_ngam` neo lại theo mã mới, `dung_sai_co_dinh` mới). Điều kiện đạt có thêm «phép khác KHÔNG lệch theo» (/code-review #3) — đột biến
làm hỏng bộ đo không còn tính là bị bắt. Đột biến KHÔNG làm phép P nào đỏ: `dung_sai_co_dinh` (dung sai tuyệt đối 1e-6 ⇒ chỉ ca T0c số
lớn bắt — phép P dùng giá nhỏ). Đột biến không có phép P riêng nhưng bộ ca bắt: bỏ Slovakia/USA/Australia khỏi bảng thị trường (T0b
deepEqual) · bỏ RON/AUD/JPY khỏi `HE_SO_TE` (T0a; RON còn T4, AUD còn T6). Không đo được bằng đột biến: màn trình duyệt chia
`currencyFactors` (không có giả định ×100 nào để phá).

## /code-review (high) — 10 phát hiện, kiểm chứng từng cái trước khi sửa

| # | Phát hiện | Kiểm chứng | Xử lý |
| --- | --- | --- | --- |
| 1 | `outbound-guard.js:76` luật 4 không thấy EUR/TWD… | đúng (đọc mã) | KHÔNG sửa — bộ não, phiếu cấm; nợ đã có N-GUARD-TIEN-TE-MOI (phải đóng trước khi bật page EU/AUUS) |
| 2 | `saveProduct` không đối chiếu tệ với thị trường shop | đúng (đọc mã; T6 trước đó đặt tên «chỉ AUD» mà không khẳng định — đã sửa chú thích ca) | nợ **N-TT1-TE-LECH-THI-TRUONG** (ngoài «quy đơn vị» — ③ chỉ cho phần đó) |
| 3 | tt1.sh bỏ qua `giu_hong` | đúng (đọc) | SỬA — điều kiện đạt thêm `-z "$giu_hong"` |
| 4 | tổng rỗng ⇒ `tong_tien=0` chứ không null | dựng lại: `chuanHoaHoSo({currency:'SAR'}).tong_tien` = 0 ở cây TT1 **và ở base** | có từ trước ⇒ nợ **N-TT1-TONG-RONG-THANH-0** |
| 5 | `nap-tu-kb.js` còn `Math.round` | đúng; tệp ngoài ③ | nợ **N-TT1-NAP-KB-LAM-TRON** |
| 6 | giá gốc/phí ship không kiểm dấu/trần | đúng; có từ trước TT1 | nợ (kèm dòng N-TT1-NAP-KB-LAM-TRON) |
| 7 | dung sai tuyệt đối 1e-6 từ chối số lớn có xu | dựng lại: 601184614,43×100 = 60118461442,99999 ⇒ null; 823/10.000 giá 9 chữ số bị từ chối | SỬA — dung sai co theo độ lớn; đo lại: 0/100.000 bị từ chối nhầm · 0/100.000 «x,5 TWD» lọt · 0/100.000 «3 số lẻ EUR» lọt; ca T0c + đột biến `dung_sai_co_dinh` |
| 8 | hash cứng ở gsp3 ③ / gsp3b ③c ③d | đúng — đánh đổi tổng đã duyệt | GIỮ; ghi giá phải trả vào chú thích hai cổng |
| 9 | `quyDonViNho` tính hai lần | đúng | SỬA — `quy[]` dùng lại ở INSERT |
| 10 | kiểm `*.goc` ở cây chung là kiểm câm | đúng (.goc chỉ sinh trong `$TAM`) | SỬA — bỏ, giữ băm 4 tệp |

## Nợ ghi §9 (APPEND, 6 mục — đoạn «06/10 · TT1 (thợ)»)

N-TT1-GIA-KICH-BAN-TE (`gia-kich-ban.js:21` thiếu 5 tệ) · N-TT1-TONG-TIEN-HIEN-DON-VI-NHO (hộp thư/bàn hội thoại/hồ sơ khách hiện `tong_tien`
thô — đọc mã, chưa đo màn) · N-VE1-GIA-BAN-SAO-DON-VI-NHO (`san-pham-goc.js:346` → `san-pham.html:288`; ca ve1 nạp đơn vị lớn nên xanh giả) ·
N-TT1-TE-LECH-THI-TRUONG · N-TT1-TONG-RONG-THANH-0 · N-TT1-NAP-KB-LAM-TRON (+ N-TT1-LUOC-DO-HE-SO: `luoc-do-v1.md:254` + COMMENT migration 007
còn «×100 vs ×1000»; giá gốc/phí ship chưa kiểm dấu/trần). Đã có từ trước, không thêm: N-GUARD-TIEN-TE-MOI · N-TIEN-TE-MAC-DINH.

## Chặng 1 (`ops/bin/nghiem-thu/_chan1.sh tt1`) — CHƯA chạy, có lý do

Phép ⑦ của `_chan1` chạy lại TRỌN `tt1.sh` (đo hai lượt: 1:08′ và 1:26′, vì chuỗi cổng cũ lồng 6–10 tầng). Tổng nhắn 07/10: thợ GL3b đang
đợi cây rảnh, «đừng mở chuỗi dài mới nếu không cần» ⇒ không chạy; đã báo tổng (chạy khi cây rảnh hoặc gọi lại thợ). Lưu ý trước cho người
chạy: phép ④ (pathspec base..HEAD) và ⑤ (src phẳng) sẽ liệt kê tệp của phiếu KHÁC commit xen giữa `da50df6..HEAD` (GL1 `deploy/preflight.mjs`
· GL3 `src/pancake.js` …) — tệp của riêng TT1 (`git show --stat bc190f5`) đều nằm trong ③ đã nới.

**Trạng thái khai:** 🔎 chờ nghiệm thu — mã `bc190f5` · nhật ký + sổ commit kế tiếp.
