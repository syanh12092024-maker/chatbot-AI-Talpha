# NHẬT KÝ PHIẾU VA-R4 — doc-y.js: phủ định KHÔNG được đọc thành xác nhận (RF-20)

> Thợ **sonnet** · 23/08/2026 · base khai `bf9614a`, HEAD thật lúc khởi công `addab75`
> (2 commit sau base — đo lại theo luật, không lệch file `src/orders/doc-y.js`) · làn 🟨
> · hàm THUẦN, không DB · nghiệm thu: `ops/bin/nghiem-thu/va-r4.sh` rc=0 (2/2 phép ĐẠT).

---

## 0 · Mục ⑦ — ĐÃ TRA (output máy)

Phiếu tự khai "⑦ ĐÃ TRA: RF-20 §9 — phiếu đóng" (tổng đã chẩn đoán sẵn). Vẫn tự chạy lại
theo luật (bổ sung v3 skill `tho-thi-cong`) để chắc không phiếu nào khác đụng doc-y.js
giữa lúc soạn phiếu và lúc tôi khởi công:

```
$ grep -n "doc-y\|RF-20" docs/thi-cong/SO-NO.md
(không có dòng nào)
$ ls ops/bin/tra_no.py
không có tra_no.py trong repo này
$ ls CLAUDE.md 2>/dev/null
không có CLAUDE.md riêng ở gốc repo — không có §6 để tra
```

Không có nợ/phán cũ nào trùng RF-20 ngoài chính §9b của sổ điều hành đã dẫn trong phiếu.
Làm thẳng theo ①.

---

## 1 · Đo lại nguyên liệu TRƯỚC khi code (án lệ #4)

```
$ node -e "import('./src/orders/doc-y.js').then(m=>{...docY(câu)...})"
"not sure"       -> {"ket_qua":"xac_nhan","do_tin":1}   ← BUG
"don't confirm"  -> {"ket_qua":"xac_nhan","do_tin":1}   ← BUG
"cannot confirm" -> {"ket_qua":"xac_nhan","do_tin":1}   ← BUG
"not yet"        -> {"ket_qua":"khong_ro","do_tin":0}   (đã đúng — "yet" không phải từ khoá)
"won't take it"  -> {"ket_qua":"khong_ro","do_tin":0}   (đã đúng — "take" không phải từ khoá)
"no thanks"      -> {"ket_qua":"tu_choi","do_tin":1}    (đã đúng — "no" tự là từ khoá tu_choi)
```

Đúng như phiếu khai: chỉ **"sure"/"confirm" đứng liền sau phủ định** mới đọc sai; câu
phủ định KHÔNG chứa nguyên văn một từ khoá xac_nhan thì đã tự an toàn từ trước (0 nhánh
khớp ⇒ `khong_ro`). Bộ ca cũ `test/l3-m3-doc-y.test.js` (8 test, Y1-Y8) xanh 8/8 trước
khi sửa — xác nhận vá không được đụng 4 nhánh cũ.

---

## 2 · Thiết kế vá

Thêm `NHOM_PHU_DINH` (danh sách từ phủ định EN+AR) + hàm `khopXacNhan()` thay
`khopNhanh()` **CHỈ cho nhánh `xac_nhan`**: với mỗi từ khoá xac_nhan khớp trong câu, soát
từ NGAY LIỀN TRƯỚC (một từ, dùng đúng cơ chế đệm-biên-khoảng-trắng sẵn có của
`chuanHoa()`) — có mặt trong `NHOM_PHU_DINH` thì KHÔNG tính là khớp. Nếu mọi lần xuất
hiện của mọi từ khoá xac_nhan đều bị phủ định ⇒ nhánh xac_nhan không khớp ⇒ rơi về
`khong_ro` (0 nhánh) qua đúng đường code đã có, không cần nhánh mới.

**Đóng comment doc-y.js:17-23 cũ** (tự nhận "not sure vẫn khớp sure — cái giá đã biết")
— nay khai rõ RF-20 đã đóng, đồng thời khai residual mới (xem §3). **Giữ nguyên comment
"no/know, لا/từ Ả Rập dài"** (nay ở dòng 126-127, nội dung không đổi — chỉ dịch số dòng
do thêm code phía trên).

---

## 3 · Quyết định + tradeoff đã ghi rõ (luật 11/13 skill)

- **Chỉ soát PHỦ ĐỊNH LIỀN KỀ (một từ), không quét ngược cả câu.** Nghiệm thu ④ chỉ đòi
  các cặp liền nhau ("not sure", "don't/cannot/won't confirm"). Quét xa hơn (vd "not
  really sure") sẽ bắt được ca đó nhưng đổi lại rủi ro MỚI: một phủ định ở mệnh đề trước
  có thể nuốt nhầm một xác nhận thật ở mệnh đề sau ("I was not happy before, but now I
  confirm"). Giữ cửa sổ 1-từ là an toàn hơn — đã khai residual này thẳng vào code
  (doc-y.js:22-26) thay vì giấu.
- **CHỈ áp phủ định cho nhánh `xac_nhan`**, không thêm cho `tu_choi`/`doi_sua`. RF-20 chỉ
  báo lỗi ở nhánh xac_nhan (đơn tự ship); hai nhánh kia không có ca lỗi tương ứng trong
  phiếu — thêm là suy diễn ngoài phạm vi (luật 12, cấm over-engineering).
- **"no" và "لا" CỐ Ý không vào `NHOM_PHU_DINH`** dù cũng là phủ định: cả hai đã là từ
  khoá `tu_choi` đứng riêng, nên "no confirm"/"لا تمام" đã tự rơi vào nhánh MÂU THUẪN
  (≥2 nhánh khớp ⇒ `khong_ro`, do_tin=0.5) từ TRƯỚC bản vá — đo lại xác nhận:
  `docY("no confirm")` = `{ket_qua:"khong_ro", do_tin:0.5}` (test R4-4). Thêm chúng vào
  danh sách phủ định sẽ đổi MỘT CHIỀU những câu này từ `khong_ro` (an toàn, đẩy cho_sale)
  sang `tu_choi` (tự tin) — trong khi có câu thật đọc ngược ý ("no problem, confirm" =
  ý ĐỒNG Ý). Giữ nguyên do_tin=0.5/khong_ro an toàn hơn.
- **Chỉ EN + AR** (đúng "đa ngôn ngữ: xử ít nhất EN + AR" của ②) — không thêm phủ định
  PH (`hindi`, `wala`…) dù thị trường Philippines nằm trong CLAUDE.md dự án: không có
  ca lỗi PH nào trong RF-20 gốc, và các phrase PH hiện tại của TU_KHOA đều đã là cụm từ
  đứng riêng ("cancel na lang", "wag na") không dính kiểu bug "phủ định+xác nhận liền
  kề" như EN/AR. Ghi lại đây theo luật 11 — không phải giả định thầm lặng.
- **Nhánh test KHÔNG chạm** (bước 4 skill — khai rõ vì sao): phủ định cho `doi_sua`,
  phủ định PH, phủ định cách-từ-khoá-≥2-từ — cả ba đều CỐ Ý ngoài phạm vi phiếu (giải
  thích ở 3 gạch đầu trên), không phải bỏ sót.

---

## 4 · Nghiệm thu

`bash ops/bin/nghiem-thu/va-r4.sh` — rc=0, PHÉP 2/2 ĐẠT:

| #   | Phép                                                                                                                                                                              | Kết quả                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| ①②③ | `test/va-r4-doc-y-phu-dinh.test.js` (R4-1 phủ định EN ≥6 câu · R4-2 không hồi quy ≥8 xac_nhan/≥4 tu_choi/≥4 khong_ro · R4-3 AR ≥4 câu + "لا" trong từ dài · R4-4 no/لا mâu thuẫn) | `pass=4 fail=0`         |
| ④   | hồi quy `test/l3-m3-doc-y.test.js` + `test/l3-m3-nhan-phan-hoi-wa.test.js` (2 file DUY NHẤT import `doc-y.js`, đo bằng `grep -l`, không đoán)                                     | `pass=19 fail=0` (8+11) |

Đo lại RF-20 sau vá (đúng lệnh phiếu yêu cầu):

```
docY("not sure")       -> {"ket_qua":"khong_ro","do_tin":0}
docY("don't confirm")  -> {"ket_qua":"khong_ro","do_tin":0}
docY("cannot confirm") -> {"ket_qua":"khong_ro","do_tin":0}
```

Không câu nào trong 3 ca gốc của RF-20 còn đọc ra `xac_nhan`. 4 nhánh cũ (xac_nhan/
tu_choi/doi_sua/khong_ro) giữ nguyên hành vi — `test/l3-m3-doc-y.test.js` 8/8 xanh
không đổi gì.

---

## 5 · Kết luận

RF-20 đóng: phủ định liền kề trước một từ khoá xác nhận (EN: not/don't/dont/cannot/
can't/cant/won't/wont/never · AR: مش/ما/مو) không còn đọc ra `xac_nhan`. Residual đã
khai rõ trong code (phủ định cách ≥2 từ, PH, doi_sua/tu_choi) — không phải bug ẩn, là
ranh giới phạm vi phiếu VA-R4. Không đụng `may-trang-thai.js`/`hang-cho.js`/
`nhan-phan-hoi-wa.js` (đúng ⛔ pathspec ③). Không finding nào cần DỪNG báo tổng.
