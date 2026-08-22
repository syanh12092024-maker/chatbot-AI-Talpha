# PHIẾU VA-R2 — Cụm tiền + tạo đơn: đơn vị tiền · mã 8 · phân trang · idempotent POST · khoá hội thoại (C2)

**Base:** `cb4b8b7` · **Làn:** 🟥 TIỀN + tạo đơn COD thật · thợ **opus**

> Thợ nạp `tho-thi-cong`. Đọc sổ §9 (RF-9·10·11·12·21·15) + §9b. Repro
> `refute-tong-the-1.repro.mjs` (F1·F3·F4·F6) + `refute-mang4-luong-don.verdict.yaml` là thước.

## ① Thi hành — 5 CHẶN + reclassify nợ giá-0

- RF-9 (TIỀN ×hệ-số): `goi_gia.gia` không khai đơn vị — `doc-danh-muc.js:136` ghi đơn-vị-nhỏ
  POS, `tao-don.js:104` nhân `HE_SO_TE` lần nữa ⇒ thu 1.500 AED thay vì 15,00. Kèm
  `hang-cho.js:219` ghi `don_hang.tong_tien` mà L1-M1 cố ý để NULL (nợ N4).
  ⚠️ NGUỒN ĐÚNG (KHÔNG phải VND — repo này KHÔNG có CLAUDE.md/design-pack): dự án ĐA TỆ
  Trung Đông, `HE_SO_TE` (`tao-don.js:95` — AED/SAR/QAR/TWD ×100 · KWD/OMR/BHD ×1000) +
  nhật ký L1-M1 dòng 174 «POS trả tiền ở đơn vị nhỏ, hệ số khác nhau theo tệ». Vá phải
  ĐỘC-LẬP-TỆ, KHÔNG dựng máy tỷ giá/quy VND (không tồn tại ở đây).
- RF-10 (mã 8): `hang-cho.js:105` `HUY_HOAN=[4,5,6,7,8]` — bản sao SAI (một-nguồn-hai-luật;
  reader đúng là {4,5,6,7} như `ti-le-hoan.js:45`). Đơn packing đọc thành hủy → COD đúp.
- RF-11: nguồn (b) POS-sống `hang-cho.js:320` chỉ đọc trang 1/100, khai `sach` (bỏ `tong`/
  `tongTrang`) → đơn trang 2 lọt.
- RF-12: 3 lớp idempotent mù ca POST-xong-rollback (`tao-don.js:222` · `hang-cho.js:790`).
- RF-21: `duyet()` FOR UPDATE khoá theo DÒNG, không theo HỘI THOẠI → 2 hàng chờ cùng hội
  thoại + 2 duyệt = 2 đơn.
- RF-15 (reclassify): `doc-danh-muc.js:101` không ghi `san_pham.page_id` ⇒ `cua2Tien` (JOIN
  page_id) mù mọi goi_gia POS — nợ cũ «giá 0» khai SAI nguyên nhân.

## ② Vào/ra

**Vào (ĐO LẠI):** khuôn tiền — POS trả retail_price đơn vị gì (đo response thật) + `HE_SO_TE`
(`tao-don.js:95`) đa tệ, KHÔNG VND · `doc-danh-muc.js` · `tao-don.js` · `hang-cho.js` ·
`ti-le-hoan.js` `MA_HOAN` (nguồn mã hủy/hoàn đúng).
**Ra:** (1) đơn vị tiền khai MỘT nguồn — `goi_gia.gia` + `don_hang.tong_tien` cùng đơn vị tường
minh (kèm `tien_te`), tao-don dùng `HE_SO_TE` ĐÚNG MỘT LẦN theo tệ (đã nhỏ thì không nhân
lại); phép so tiền in cả hai vế + đơn vị + tệ. ĐỘC-LẬP-TỆ, không quy VND. (2) HUY_HOAN import
TỪ `ti-le-hoan.js` `MA_HOAN` {4,5,6,7} (đã export — xoá bản sao hang-cho:105, thống nhất tên).
(3) nguồn (b) phân trang tới hết HOẶC khai `unknown` khi chưa quét hết (không `sach`) — CHỐT
một cơ chế, không «hoặc». (4) idempotent chốt bằng UNIQUE DB trên marker POST-đã-gửi ghi
TRƯỚC khi POST (sống qua rollback) — CHỐT, không «hoặc». (5) khoá theo HỘI THOẠI (advisory
lock hashtext(conv_id) khuôn L2-M1). (6) doc-danh-muc ghi `san_pham.page_id`.

## ③ File được đụng

```
src/orders/hang-cho.js
src/pos/tao-don.js
src/pos/doc-danh-muc.js
db/migrate/007_*.up.sql
db/migrate/007_*.down.sql
db/schema.sql
test/va-r2-*.test.js
ops/bin/nghiem-thu/va-r2.sh
docs/thi-cong/nhat-ky/phieu-va-r2.md
docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
```

⛔ CẤM sửa pancake-orders.js/file phẳng src/ · không đụng may-trang-thai.js (C3 song song) ·
doc-y.js (C4). `ti-le-hoan.js` chỉ IMPORT `MA_HOAN` (read-only, không sửa).

## ④ Nghiệm thu — `ops/bin/nghiem-thu/va-r2.sh`

```bash
# ⚠️ THƯỚC TỰ CHẤM (bẫy: repro in ❌ nhưng rc=0): CAPTURE output từng SECTION của R2
#    (F1·F3·F4·F6 — KHÔNG F2/F5 vì thuộc C3/VA-R3) rồi `grep -c "❌"` = 0. In số đếm.
# 1. RF-9: refute-tong-the-1 F3 → thu ĐÚNG (=retail_price minor, đọc HE_SO_TE 1 lần), không ×
#    lần hai; test đa tệ: AED/SAR ×100 VÀ KWD/OMR/BHD ×1000 đều đúng (in bảng từng tệ)
# 2. RF-10: F1 → đơn status 8 (packing) đọc DUONG/chờ (KHÔNG sach) ⇒ duyet KHÔNG đẻ đơn 2;
#    grep định nghĩa HUY_HOAN/MA_HOAN toàn repo = 1 nguồn (ti-le-hoan MA_HOAN; in file khớp)
# 3. RF-11: F6 → đơn trang 2 bắt được (phân trang hết) — cơ chế đã CHỐT, không «hoặc»
# 4. RF-12: F4 → POST-rollback rồi bấm lại = 1 POST (marker ghi trước POST sống qua rollback)
# 5. RF-21: 2 hàng chờ cùng hội thoại + 2 duyet song song = 1 đơn (advisory lock hội thoại)
# 6. RF-15: san_pham.page_id NOT NULL sau docDanhMuc; cua2Tien thấy dòng giá POS (đối chứng)
# 7. migration 007 idempotent + down→up (lùi-về-ranh khuôn l1-m1); hồi quy l3-m4/l3-m2/l1-m1
#    không gãy; toàn bộ ❌ của F1/F3/F4/F6 = 0
```

## ⑤ POS thật GET-only, tạo đơn mock. ## ⑥ Ngoài phạm vi → §9.

## ⑦ ĐÃ TRA: RF-9..21 §9 — phiếu đóng. Repro sẵn làm thước.

**Khi nộp:** nhật ký · §10 · commit pathspec (`fix(orders): VA-R2 — ...`) · ≤15 dòng.
