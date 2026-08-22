# PHIẾU VA-R2 — Cụm tiền + tạo đơn: đơn vị tiền · mã 8 · phân trang · idempotent POST · khoá hội thoại (C2)

**Base:** `57eff36` · **Làn:** 🟥 TIỀN + tạo đơn COD thật · thợ **opus**

> Thợ nạp `tho-thi-cong`. Đọc sổ §9 (RF-9·10·11·12·21·15) + §9b. Repro
> `refute-tong-the-1.repro.mjs` (F1·F3·F4·F6) + `refute-mang4-luong-don.verdict.yaml` là thước.

## ① Thi hành — 5 CHẶN + reclassify nợ giá-0
- RF-9 (TIỀN ×100): `goi_gia.gia` không khai đơn vị — `doc-danh-muc.js:136` ghi minor,
  `tao-don.js:104` nhân ×100 lần nữa ⇒ thu 1.500 AED thay vì 15,00. Kèm `hang-cho.js:219`
  ghi `don_hang.tong_tien` mà L1-M1 cố ý để NULL (nợ N4 — CLAUDE §8 tiền: mọi số VND kèm rate).
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
**Vào (ĐO LẠI):** khuôn tiền — POS trả retail_price đơn vị gì (đo response thật), CLAUDE §8 +
design-pack quy ước VND · `doc-danh-muc.js` · `tao-don.js` · `hang-cho.js` · `may-trang-thai`
HUY_HOAN nguồn khai.
**Ra:** (1) đơn vị tiền khai MỘT nguồn — `goi_gia.gia` + `don_hang.tong_tien` cùng đơn vị tường
minh (kèm `tien_te`), tao-don KHÔNG nhân ×100 nếu đã minor; phép so tiền in cả hai vế + đơn vị.
(2) HUY_HOAN import TỪ nguồn chung {4,5,6,7} (xoá bản sao hang-cho:105). (3) nguồn (b) phân
trang tới hết HOẶC khai `unknown` khi chưa quét hết (không `sach`). (4) idempotent chốt bằng
UNIQUE DB trên (hoi_thoai_id) hoặc marker POST-đã-gửi trước rollback. (5) khoá theo HỘI THOẠI
(advisory lock hashtext(conv_id) khuôn L2-M1, không chỉ dòng). (6) doc-danh-muc ghi page_id.

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
doc-y.js (C4).

## ④ Nghiệm thu — `ops/bin/nghiem-thu/va-r2.sh`
```bash
# 1. RF-9: node refute-tong-the-1.repro.mjs → F3b thu ĐÚNG 15,00 AED (=1500 minor), không 1.500
# 2. RF-10: F1 → đơn status 8 (packing) đọc là DUONG/chờ (KHÔNG sach) ⇒ duyet KHÔNG đẻ đơn 2;
#    grep HUY_HOAN toàn repo = 1 định nghĩa (in danh sách file khớp)
# 3. RF-11: F6 → đơn ở trang 2 bắt được HOẶC nguồn(b) khai unknown → cửa ĐÓNG
# 4. RF-12: F4 → POST-rollback rồi bấm lại = 1 POST (in tổng POST)
# 5. RF-21: 2 hàng chờ cùng hội thoại + 2 duyet song song = 1 đơn (in số đơn)
# 6. RF-15: san_pham.page_id NOT NULL sau docDanhMuc; cua2Tien thấy dòng giá POS (đối chứng)
# 7. migration 007 idempotent + down→up; hồi quy l3-m4/l3-m2/l1-m1 không gãy; thước cũ xanh
```
## ⑤ POS thật GET-only, tạo đơn mock. ## ⑥ Ngoài phạm vi → §9.
## ⑦ ĐÃ TRA: RF-9..21 §9 — phiếu đóng. Repro sẵn làm thước.
**Khi nộp:** nhật ký · §10 · commit pathspec (`fix(orders): VA-R2 — ...`) · ≤15 dòng.
