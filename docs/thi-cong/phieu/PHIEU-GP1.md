# PHIẾU GP1 — Điền sẵn bậc giá cho món POS chưa có giá, lấy từ giá thật trong đơn POS

**Base:** `ĐẶT-LÚC-PHÁT` · **Làn:** 🟥 (ghi `goi_gia` — bảng cửa tiền đọc; đẩy bản chép bot đọc)
**Nguồn:** người quyết 05/10 («Theo giá như đơn trên POS chứ cần gì quy đổi?» → «làm trọn vẹn») · `01-QUYET-DINH.md` §8 «Một nguồn» (POS là
đường KÉO VÀO, mọi sửa giá vẫn ở giao diện v3) + «Page phải gắn sản phẩm» (không giá riêng theo page) · sổ §5i
**Đụng bộ não:** không.
**Skill thợ nạp:** `tho-thi-cong` · `viet-thuoc`; xong thì `/code-review` (đường tiền).

## ① Thi hành đoạn nào

Kho POS không gửi giá (`goi_gia` của món POS hầu hết rỗng: prod 05/10 — GCC 491 món · EU 501 · AUUS 188, gần như 0 món có giá). Giá
THẬT nằm trong đơn POS: đo BigQuery 05/10 (`vw_sale_order_team`, 60 ngày) — đơn ghi **giá món = 0, toàn bộ tiền khách trả ở
`shipping_fee` = `cod`** (đội bán COD dồn giá vào phí ship; cửa tạo đơn v3 cũng đặt giá vào `shipping_fee` — ca VA-R2 R2-3). Vậy
«giá như đơn» = **COD của đơn CHỈ MỘT món, theo số lượng**: vd Saudi SKU 264 mua 2 = 109 SAR, mua 4 = 159 SAR. Đo độ ổn định (504 bộ
shop × SKU × số lượng): 269 bộ có MỘT mức COD ≥80% số đơn · 40 bộ 60–80% · 20 bộ <60% (phần lớn SKU thử) · 175 bộ <3 đơn.

## ② Hợp đồng vào / ra

**Vào:** khách BigQuery CHỈ ĐỌC của dự án `src/hrm/bigquery.js#taoKhachBigQuery` (phạm vi `bigquery.readonly`, khoá `V3_BQ_KHOA` — đã có
trên prod, LL17) · ghép marketer → team như LL17d (`dim_person_map` → `HRM_Core.dim_employee.team_code`, team HIỆN TẠI — luật người quyết
05/10 «marketer thuộc team nào thì phân team đó») · cửa lưu giá ĐÃ CÓ (`khoSanPhamGoc.luuGia` → `saveProduct` CHỈ-GIÁ + bước đẩy bản
chép) — DÙNG LẠI, cấm đường ghi giá thứ hai · `HE_SO_TE` / `TIEN_TE_THI_TRUONG` sau TT1.

**Ra:**
1. **Tầng A** `src/products/gia-tu-don-pos.js`:
   - `SQL_GIA_DON` — đơn `vw_sale_order_team` trong N ngày (mặc định 60), CHỈ đơn có ĐÚNG MỘT dòng món, `cod > 0`, trạng thái khác huỷ,
     số lượng 1–10; trả `(team_code hiện tại của marketer, shop_id, variation_id, so_luong, tien_te = order_currency, cod, so_don)`.
   - `tinhBac(dong, { toiThieu = 3, nguong = 0.8 })` THUẦN: mỗi (team, shop, biến thể) → bậc theo số lượng: lấy mức COD phổ biến nhất
     nếu `so_don ≥ toiThieu` và chiếm `≥ nguong`; bỏ món nếu bậc KHÔNG tăng dần theo số lượng (giá mua nhiều < giá mua ít); bỏ SKU thử
     (`sp test`, `test` — so bằng `chuanSku`); mỗi món bỏ đi ghi LÝ DO (`it_don` · `phan_tan` · `khong_tang` · `sku_thu` · `lech_tien_te` ·
     `da_co_gia` · `khong_co_mon`).
   - `xemTruoc(pool, teamId, bq)` — ghép bậc với món POS của team (`san_pham.ma = <shop>:<variation_id>`, `nguon='pos'`); tiền tệ đơn phải
     ≡ `TIEN_TE_THI_TRUONG[market của kết nối team–shop]`; CHỈ món có **0 dòng `goi_gia`** (kể cả bậc tắt) được đề xuất — KHÔNG ghi đè.
     Trả danh sách đề xuất + đếm theo lý do. KHÔNG ghi gì.
2. **Cửa** (vai quản trị, team đang mở): `GET /api/san-pham/gia-tu-don?soNgay=60` (xem trước) · `POST /api/san-pham/gia-tu-don` thân
   `{ dauXemTruoc, monIds? }` — tính lại TRONG lượt; dấu xem trước lệch ⇒ 409 (bài học F1 GSP3: người áp đúng thứ đã thấy); mỗi món ghi
   qua cửa lưu giá chỉ-giá (đẩy bản chép tới mọi page bán món) — món nào hỏng thì dừng món đó, báo rõ, KHÔNG nửa vời trong một món. Chạy
   TRONG tiến trình `aicloser-v3` (bản chép `kb-overrides.json` do chính tiến trình ghi — không script rời trên prod).
3. **Nhật ký** hành động mới (vd `DIEN_GIA_TU_DON_POS`) ở sản phẩm cho mỗi món: bậc ghi · số đơn · tỷ lệ · khoảng ngày. `saveProduct` đã chụp
   `truoc/sau` — đường lùi = xoá bậc của món (món trước đó RỖNG giá).
4. **Màn** Sản phẩm (quản trị): khối «Điền giá từ đơn POS (60 ngày)» — bảng xem trước (SKU · tên · shop · bậc · số đơn · tỷ lệ), đếm món bỏ
   theo lý do, nút «Áp dụng N món». Câu nói rõ: chỉ điền món CHƯA có giá; giá sau đó sửa ở Theo thị trường; page có bản sao giá khác sẽ
   hiện LỆCH ở bước đối soát (GSP3) để người chọn.
5. Không đụng món đã có giá, không đụng bản sao, không đụng đơn, không gọi POS.

## ③ File được đụng

```
src/products/gia-tu-don-pos.js
v3/src/audit/hanh-dong.js
v3/chay-that.js
v3/src/ui/san-pham/kho-goc.js
v3/src/ui/san-pham/router.js
v3/src/ui/san-pham/trang/san-pham.html
test/gp1-*.test.mjs
v3/test/b/gp1-*.test.mjs
ops/bin/nghiem-thu/gp1.sh
docs/v3/03-MAN-HINH.md
```
KHÔNG sửa `src/admin-v3/operations.js` · `src/hrm/bigquery.js` · `src/products/ban-chep-bot.js` — cần đổi ⇒ dừng, báo tổng. Hàm mới của
`khoSanPhamGoc` TUỲ CHỌN trong `datKhoGoc`. Đường `/api/san-pham/gia-tu-don*` đứng TRƯỚC `/api/san-pham/:id`.

## ④ Nghiệm thu (viết trước — `ops/bin/nghiem-thu/gp1.sh`, rc=0 khi đạt; BigQuery GIẢ trong ca — KHÔNG gọi mạng; đảo-vá trên BẢN SAO tạm; `grep -E` không `rg`; nạp `.env` nếu thiếu `DATABASE_URL_V3`)

1. `tinhBac` thuần: (a) 10 đơn 99 SAR + 1 đơn 89 ⇒ bậc 1 = 9900; (b) 2 đơn ⇒ `it_don`; (c) 5/5/4 đơn ba mức ⇒ `phan_tan`; (d) mua 2 rẻ hơn
   mua 1 ⇒ `khong_tang`; (e) SKU «sp test» ⇒ `sku_thu`; (f) TWD 990 ⇒ 990 (TT1).
2. Postgres hộp cát: team T có món A (0 giá), B (đã có bậc), C (không có trong đơn); BQ giả cho A, B ⇒ `xemTruoc` đề xuất CHỈ A, B bị
   `da_co_gia`, đơn của món không có trong team ⇒ `khong_co_mon`; 0 dòng ghi.
3. `POST` áp ⇒ A có đúng bậc (`gia_tay = true`, tiền tệ đúng), B nguyên vẹn (băm bậc trước = sau), `day` gọi cho mọi page bán A (page gắn
   gốc × shop của A); nhật ký có dòng mang số đơn + tỷ lệ.
4. Dấu xem trước lệch (một món có giá giữa lúc xem và lúc áp) ⇒ 409, 0 ghi.
5. Đơn của marketer team khác ⇒ không vào bậc của team T. Tiền tệ đơn ≠ tiền tệ thị trường shop ⇒ `lech_tien_te`.
6. Marketer ⇒ 403. Team khác ⇒ không thấy món của T.
7. Đảo-vá: bỏ điều kiện «0 dòng `goi_gia`» ⇒ phép 3 đỏ (B bị đè); bỏ kiểm tăng dần ⇒ 1d đỏ; bỏ dấu ⇒ phép 4 đỏ; bỏ lọc team ⇒ phép 5 đỏ.
8. Bộ ca LL15d riêng xanh; cổng cũ xanh (rc tách dòng): `gsp2.sh` · `gsp3.sh` · `gsp3b.sh` · `tt1.sh`. `npm test` không thêm ca đỏ.

## ⑤ Test chạm nhánh nào

`test/gp1-*.test.mjs` (tầng A thuần + Postgres hộp cát với BQ giả) · `v3/test/b/gp1-*.test.mjs` (cửa · vai · màn).

## ⑥ Ngoài phạm vi ⇒ §9 sổ nợ

Ghi đè giá đã có bằng giá đơn · điền giá định kỳ tự động · gán marketer cho gốc (N-MK-GAN-HANG-LOAT) · đơn nhiều món / quà tặng.

## ⑦ ĐÃ TRA CHƯA

```
$ awk '/^## §9 /,/^## §9b/' SO-DIEU-HANH-THI-CONG.md | grep -n "giá từ đơn\|N-TIEN-TE\|gia_tay\|N-MK-GAN"
N-MK-GAN-HANG-LOAT chưa có «gán marketer theo gợi ý cho mọi sản phẩm chưa gán» — ...
N-TIEN-TE-NGOAI-GCC ... (TT1 trả)
```
Quan hệ: **mới** (phụ thuộc TT1 cho EUR/RON/AUD/TWD).
