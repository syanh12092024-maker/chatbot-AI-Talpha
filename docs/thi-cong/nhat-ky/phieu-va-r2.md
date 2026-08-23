# NHẬT KÝ PHIẾU VA-R2 — Cụm tiền + tạo đơn: đơn vị tiền · mã 8 · phân trang · idempotent POST · khoá hội thoại

> Thợ đời 1 (opus, bị dừng 23/08 khi chuyển công cụ, để lại nhánh `wip/va-r2` 3 commit
> chưa nghiệm thu) → thợ đời 2 (fable, 23/08) tiếp quản · base khai `cb4b8b7`, HEAD `main`
> lúc tiếp quản `420de8d` · làn 🟥 · nghiệm thu `ops/bin/nghiem-thu/va-r2.sh` rc=0
> (17/17 phép ĐẠT) · toàn suite l0–l3+va: 347 ca / 336 pass / 0 fail / 11 skip.

## 0 · Mục ⑦ — ĐÃ TRA (output máy)

```
$ find docs -iname 'SO-NO.md'; ls ops/bin/tra_no.py CLAUDE.md     → không có (cùng VA-R3)
$ grep -n 'RF-9\b\|RF-10\|RF-11\|RF-12\|RF-21\|RF-15' docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
185: | VA-R2 | C2 tiền+tạo-đơn (RF-9/10/11/12/21/15) | ... | 🎫 chờ review |
224: | C2 tiền + tạo-đơn | RF-9(×100)·RF-10(mã8)·RF-11·RF-12·RF-21 | ... | VA-R2 🟥 opus |
```

Không có phán/nợ cũ trùng. Nhánh `wip/va-r2` đã có code cho cả 6 RF — tiếp tục trên nó,
KHÔNG làm lại từ đầu (diff đọc được, khớp ý phiếu; chỉ thiếu thước + cửa vào tiền).

## 1 · Đo lại nguyên liệu trước khi code (bẫy #3/#4)

- **Migration 007 «không được nhận» (lời thợ cũ)** — đo lại: `node db/migrate.js trang-thai`
  trên nhánh wip thấy `· chưa áp 007…`; áp sạch một lượt. Nguyên nhân cũ là thợ đo lúc file
  chưa tồn tại, không phải regex `danhSachBan()` hỏng. Không sửa `db/migrate.js`.
- **Bộ não trả tiền đơn vị gì** — `src/tools.js:38` (file cấm sửa): `total_price` «số, nội
  tệ — vd 99 nghĩa là 99 SAR/AED» ⇒ **đơn vị LỚN**. `src/context.js:126` chép sang
  `prof.total` dạng chuỗi, **không có `currency`** (grep `currency` trong prof = 0). Đây là
  phần phiếu chưa khai: nếu chỉ «không nhân ở tao-don» thì `cua2Tien` so 15 (lớn, bot) với
  1500 (nhỏ, `goi_gia.gia`) ⇒ unknown ⇒ ĐÓNG mọi dòng bot chốt. Phải quy MỘT lần ở cửa vào.
- `HE_SO_TE` (`tao-don.js`): AED/SAR/QAR/USD ×100 · KWD/OMR/BHD ×1000 — đa tệ, không VND.
- `src/pos/ma-trang-thai.js:82` còn `NHOM_HUY_HOAN = [4,5,6,7]` — bản khai của tầng POS,
  cùng giá trị với `MA_HOAN`. `ti-le-hoan.js` read-only theo phiếu ⇒ không gộp, ghi §9.

## 2 · Thi hành — việc thợ đời 1 đã làm (giữ nguyên) + việc đời 2 thêm

| RF    | Thợ đời 1 (wip/va-r2)                                                                                                                                                                                     | Đời 2                                                                                                                                                                                                                                                                                                                  |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-9  | `phiVanChuyenMinor` (validate tệ, KHÔNG nhân) thay `doiSangDonViNho` ở `dungPayload`/`taoDon`; 007 COMMENT khai đơn vị nhỏ cho `goi_gia.gia` + `don_hang.tong_tien`                                       | **Cửa vào** `chuanHoaHoSo`: khoá `tong_tien` (v3) = nhỏ, giữ nguyên; `total_price`/`total` (khuôn cũ) = lớn → `tong_tien_lon`, quy ×`HE_SO_TE` bằng `quyTongTienNho` khi biết tệ, không biết ⇒ `tong_tien=null` (cửa ① báo thiếu). `duyet()` gọi lại `quyTongTienNho` sau khi gộp `boSung` (sale cho `tien_te` là đủ). |
| RF-10 | `HUY_HOAN = new Set(MA_HOAN.map(String))` — xoá bản sao `{4..8}`                                                                                                                                          | thước R2-4 + phép grep 1 nguồn + phép `MA_HOAN ≡ NHOM_HUY_HOAN`                                                                                                                                                                                                                                                        |
| RF-11 | `nguonB_posSong` phân trang tới hết theo `total_pages`, trần `soTrangToiDa=50` ⇒ vượt trần khai `unknown` (CHỐT: phân trang hết, trần chỉ chống treo)                                                     | thước R2-5 (trang 2 bắt được; vượt trần ⇒ unknown, 2 lượt gọi)                                                                                                                                                                                                                                                         |
| RF-12 | lớp ③b `moCoiTruocPost().daNhan` (ket_qua mang `ma_pos`, ghi pool gốc, sống qua rollback) ⇒ ném `LoiDonDaTao{lop:'c3b'}`; index partial UNIQUE 007 trên `(team_id, doi_tuong_id)` WHERE ket_qua có ma_pos | thước R2-6 (1 POST sau 2 lượt; INSERT ket_qua thứ hai có ma_pos ⇒ 23505; không ma_pos ⇒ vẫn ghi được)                                                                                                                                                                                                                  |
| RF-21 | `pg_advisory_xact_lock(hashtext('hang_cho_tao_don:duyet'), hashtext(conv_id))` sau FOR UPDATE, 2-khoá khác không gian với 1-khoá của `queue/kho.js`                                                       | thước R2-7 + **đảo-vá**: tắt khoá ⇒ 3/3 lượt ra 2 đơn (tao=2 POST=2) — thước đo đúng cửa                                                                                                                                                                                                                               |
| RF-15 | `docDanhMuc` gán `san_pham.page_id` khi shop có ĐÚNG 1 page (0/nhiều ⇒ null + đếm `pageMoHo`), backfill dòng cũ                                                                                           | thước R2-8                                                                                                                                                                                                                                                                                                             |

**Tradeoff nói ra (bẫy #13):**

- Phiếu ②(4) đòi «UNIQUE trên marker ghi TRƯỚC khi POST». Đời 1 chọn UNIQUE trên `ket_qua`
  mang `ma_pos` (ghi SAU POST, nhưng trên pool gốc nên vẫn sống qua rollback) — giữ, vì
  UNIQUE trên `bat_dau` sẽ cấm luôn lượt thử lại hợp lệ khi POST bay đi mà mất phản hồi
  (ca mồ-côi, lớp ③ đã chặn bằng `moCoi`). Giá phải trả: khe giữa POST-xong và INSERT
  `ket_qua` (tiến trình chết đúng khe đó) ⇒ rơi về ca mồ-côi ⇒ cũng chặn. Không có cửa mở.
- Sale bổ sung `tong_tien` phải ở **đơn vị nhỏ** (tên khoá v3); bổ sung theo khuôn cũ
  `total_price` + `currency` thì quy tự động. UI sale (việc người) phải khai rõ — ghi §9.

## 3 · Thước phải theo luật mới (bẫy #27) — 3 file NGOÀI pathspec ③, chỉ sửa dòng neo luật cũ

- `test/l3-m4-duyet.test.js:209` `shipping_fee 19900 → 199` (neo cũ chính là lỗi RF-9).
- `test/l3-m4-hang-cho.test.js` A1/A2: `total_price` không tệ ⇒ thiếu `tong_tien` (thêm 4
  assert quy tệ AED/KWD + v3 giữ nguyên).
- `docs/thi-cong/nhat-ky/refute-tong-the-1.repro.mjs` F4: lượt 2 giờ bị ném `LoiDonDaTao`
  — bọc try/catch để in số POST (trước đó crash trước F5/F6). Kỳ vọng F1–F6 giữ nguyên.
- `docs/v3/ban-giao/luoc-do-v1.md §7.3` `tong_tien`: cập nhật quy ước đơn vị (cùng commit).

## 4 · Bằng chứng

```
$ bash ops/bin/nghiem-thu/va-r2.sh   → ═══ TỔNG: 17 phép · 0 ĐỎ ═══  rc=0
   R2-1 bảng tệ: AED/SAR/QAR/USD ×100 minor=1500→1500 · KWD/OMR/BHD ×1000 15000→15000
   R2-4 status→nguồn(b): {"2":"duong","6":"sach","8":"duong"}
   R2-5 trang 2: duong (2 gọi) · vượt trần: unknown (2 gọi)
   R2-6 POST tổng sau 2 lượt duyệt = 1 · R2-7 song song: tao=1 chan=1 POST=1 don_hang=1
   repro F1/F3a/F3b/F4/F6: 🔴 = 0 mỗi khối · 007 down→up→up(0) · schema khớp · index có
$ node --env-file=.env --test test/l0-* test/l1-* test/l2-* test/l3-* test/va-*
   tests 347 · pass 336 · fail 0 · skipped 11
$ node --env-file=.env docs/thi-cong/nhat-ky/refute-tong-the-1.repro.mjs | grep -c 🔴 → 0
```

## 5 · Ngoài phạm vi → §9 (đã append)

`NHOM_HUY_HOAN` bản thứ hai · `san_pham.page_id` một-page/shop · UI sale khai đơn vị khi
bổ sung tiền · `tong_tien_lon` là khoá jsonb mới trong `du_lieu_don` (không có cột).
