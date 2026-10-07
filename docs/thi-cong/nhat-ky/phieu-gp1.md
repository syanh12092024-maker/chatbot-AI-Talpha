# Nhật ký phiếu GP1 — điền sẵn bậc giá cho món POS CHƯA có giá, lấy từ COD đơn POS một món

Thợ: Claude Opus 5.5 (worktree riêng `.claude/worktrees/agent-a44f02596926c25c8`, nhánh `worktree-agent-a44f02596926c25c8`) · base phiếu
`b04d0dc` (nhánh dựng từ `6e9f373`) · làn 🟥 · skill: `tho-thi-cong` + `viet-thuoc`, xong chạy `/code-review high`.
Môi trường mọi số đo dưới đây: **máy dev**, Postgres hộp cát `aicloser_v3_test_gp1_p<pid>` (dẫn từ `DATABASE_URL_V3` của `.env` =
`127.0.0.1:5432`), BigQuery **GIẢ** trong mọi ca (không gọi mạng, không dùng khoá thật), cây = worktree trên. Không đo prod, không gửi tin,
`PANCAKE_READONLY=1` giữ nguyên.

## Dựng worktree
- HEAD lúc nhận là `0c6c1ed` (16/09), cây sạch ⇒ `git reset --hard 6e9f373` (chứa base `b04d0dc`).
- `node_modules` = symlink sang repo chính · `.env` chép từ repo chính (gitignore — không in, không commit).
- Phiên thợ bị ngắt hai lần (phiên tắt · hết hạn mức API) SAU commit mã `0ef3225`, giữa lượt cổng cũ. Mỗi lần nhận lại: `git status` sạch,
  `ps` + `lsof -a -p <pid> -d cwd` — dừng tiến trình cổng của mình còn sót, chờ chuỗi của worktree khác xong rồi mới chạy chuỗi của mình.

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ awk '/^## §9 /,/^## §9b/' docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | grep -n "giá từ đơn\|N-TIEN-TE\|gia_tay\|N-MK-GAN\|GP1\|gia-tu-don"
1043:  - **N-TIEN-TE-MAC-DINH** bậc giá đầu của thị trường chưa có giá: ô tiền tệ để trống, người gõ — chưa có nguồn «shop → tiền tệ».
1079:  - **N-MK-GAN-HANG-LOAT** chưa có «gán marketer theo gợi ý cho mọi sản phẩm chưa gán» — gán từng sản phẩm.
1156:  - **N-TIEN-TE-NGOAI-GCC** (H7 05/10) `HE_SO_TE` (`src/pos/tao-don.js:130`) thiếu EUR · RON · AUD · TWD · JPY; `TIEN_TE_THI_TRUONG`
1226:    N-TIEN-TE-MAC-DINH (ô tiền tệ gõ tay) — sửa chung: ô tệ mặc định + khoá theo shop ở màn «Theo thị trường».
1267:    món cũ; `demDauCu` cũng không thấy (`doi_soat_luc` mới hơn `sua_luc` món). Vá ở `chuyen-ban-sao.js` (tệp TT1/GP1 giữ): câu đánh dấu
1272:  - **N-GSP3C-GIA-POS-DE** (review (a) G3) `doc-danh-muc.js` (bậc 1) ghi đè giá POS lên món chưa `gia_tay` sau «giữ giá món» — đang ngủ
1273:    (POS trả `retail_price` 0, GP1 ①); thức dậy khi POS bắt đầu gửi giá.
```
Không nợ/phán cũ trùng việc GP1. N-TIEN-TE-NGOAI-GCC là TT1 (đã trả — GP1 dùng `HE_SO_TE`/`TIEN_TE_THI_TRUONG` sau TT1). N-GSP3C-GIA-POS-DE:
GP1 ghi qua `saveProduct` chỉ-giá ⇒ `gia_tay = true` ⇒ lượt kéo POS không đè giá GP1 ghi (không làm nợ đó tệ hơn). Quan hệ: **mới**.

## Bước 3 — đo lại nguyên liệu đề bài (bẫy #4)
- **Cấm gọi BigQuery thật trong phiếu** ⇒ KHÔNG đo lại được bằng máy. Dùng số đo + câu SQL đã CHẠY của review (a) (`scratchpad/rv/q3`,
  `q6`, `q7-*-10moi`) và LL17d `src/hrm/don-pos.js`: các cột `order_currency` · `cod` · `inserted_at` · `inserted_date` · `payload_json`
  (`$.items[0].variation_id` · `.quantity` · `.variation_info.product_display_id` · `.variation_info.retail_price`) · `total_price` ·
  `status_category` ('HUY') · `marketer` JSON · `HRM_Core.fact_employee_team_history` · `dim_employee.team_code` — đều có trong câu đã chạy.
  `$.items[0].retail_price` / `$.items[0].total_price` (phiếu ghi «`items[].retail_price`/`total_price`») CHƯA thấy trong câu nào đã chạy —
  bọc `SAFE_CAST(JSON_VALUE(…))` ⇒ vắng thì NULL ⇒ 0, không gãy câu.
- **Lệch giữa ① và ② của phiếu:** ① tầng A ghi «`team_code` HIỆN TẠI của marketer»; ② (bản sửa sau review (a) — «G3» trong báo cáo review,
  «N2» trong phiếu) ghi «ghép marketer → team VÀO NGÀY ĐƠN … thiếu lịch sử ⇒ team hiện tại; không ghép được ⇒ `khong_ghep_team`». Làm theo
  ② (khớp 01 §1 · CR-28-09c · LL17d). Sổ §5i còn chữ «theo team hiện tại của marketer» — BẢNG của tổng, không sửa.
- **Cửa lưu giá cần GỐC:** `khoSanPhamGoc.luuGia(bc, gocId, posMa, t)` → `monCuaGoc` đòi món thuộc gốc. Món POS chưa gộp (không `ma_goc`)
  không đi qua được cửa này, và không màn nào sửa/lùi giá món không gốc («Theo thị trường» nằm trong sản phẩm). ⇒ thêm lý do
  **`chua_gop_goc`** (lệch phiếu — xem mục Lệch phiếu).
- **Lượt kéo POS ghi `goi_gia` mà KHÔNG chạm dòng `san_pham`** (`src/pos/doc-danh-muc.js` nhánh `retail_price > 0`: `themMoi goi_gia` khi món
  `giuNguyen`) ⇒ `xmin` của món không đổi ⇒ khoá lạc quan `version` của `saveProduct` không bắt; `saveProduct` chỉ-giá XOÁ rồi CHÈN lại
  bậc ⇒ giá POS chen vào sẽ bị đè. ⇒ chốt «0 dòng `goi_gia`» phải chạy TRONG giao dịch ghi (dưới khoá `catalog:<team>` mà lượt kéo POS
  giữ suốt lượt — `doc-danh-muc.js:65`).

## Danh sách ca (viết trước — bốn nhóm CHO-QUA · CHẶN · BIÊN · HÀNH VI)
- Tầng A thuần `test/gp1-tinh-bac.test.mjs`: A1 (a) · A2 (a′) · A3 (a″) · A4 (b) + biên 3 đơn · A5 (c) + biên 8/10 đạt · 7/10 trượt · A6 (d)
  + bằng giá không phải «rẻ hơn» · A7 (e) · A8 (f) TWD + offers đơn vị lớn · A9 bậc ít đơn không kéo cả món · A10 bậc phân tán / đổi giá ⇒
  bỏ cả món · A11 không ghép team · hai tệ · A12 «gần nhất» theo ngày đơn, xáo trộn đầu vào · A13 tách nhóm + tham số · A14 câu đọc BQ (chỉ
  đọc, lọc, soNgay cấm chuỗi lạ) · A15 danh mục lý do · A16 bậc đang chuyển giá (review #2) · A17 thứ tự toàn phần (review #7) · A18 đệm BQ.
- Postgres hộp cát + BQ giả `test/gp1-xem-ap.test.mjs`: X1 ④2 · X2 ④5 team khác · X3 ④5 tệ lệch + không ghép team + chưa gộp + team ngoài
  hệ · X4 ④4 dấu lệch / thiếu dấu ⇒ 409 0 ghi · X5 ④3 áp trọn đường (bậc · tệ thị trường · B nguyên vẹn · `day` mọi page · nhật ký ·
  truoc/sau) · X6 chốt trong giao dịch (giá chen vào) · X7 chọn món / quá trần mỗi lượt · X8 ④6 team khác + marketer 403 · X9 BQ chưa nối 503 /
  hỏng 502.
- Cửa + màn `v3/test/b/gp1-cua-man.test.mjs`: H1 H2 ④6 vai · H3 409 mang bảng mới · H4 chưa nối · M1 lối vào theo vai · M2 bảng xem trước ·
  M3 bỏ chọn + gửi dấu · M4 409 vẽ bảng mới, xoá lựa chọn cũ · M5 món hỏng + bản chép chưa đẩy · M6 trần · M7 không vẽ đè · M8 đếm page.
- Nhánh KHÔNG chạm: nối dây `v3/chay-that.js` (cần cả hệ — ca dựng lại ĐÚNG khuôn ở `deps`, cổng ③ đối chiếu hình dạng) · câu đọc BigQuery
  thật (cấm mạng) · nhánh khoá danh mục bận (`danh_muc_dang_ghi`) · nhánh nhật ký hỏng sau khi giá đã lưu (`nhatKyLoi`).

## Thay đổi (commit mã `0ef3225`) — mỗi chỗ một lý do
- `src/products/gia-tu-don-pos.js` (mới) — tầng A:
  - `sqlGiaDon(soNgay)` / `SQL_GIA_DON` — đơn MỘT dòng món, `cod > 0`, khác `HUY`, SL 1–10, `soNgay` ngày tới hôm nay (đơn ngày tương lai
    loại như LL17a); team theo ngày đơn (`fact_employee_team_history`, nhiều dòng phủ ⇒ bắt đầu muộn nhất — như LL17d) → thiếu ⇒
    `dim_employee.team_code`; gộp theo (team, shop, biến thể, SL, tệ, COD, NGÀY) để vừa MỘT trang REST; `gia_mon` = max(`total_price` đơn,
    `retail_price`/`total_price` dòng món). `soNgay` chỉ nhận số nguyên 1–180 (câu nhúng số — cấm chuỗi).
  - `tinhBac` THUẦN — mỗi (team, shop, biến thể) → bậc theo SL: mức nhiều nhất trong `ganDay` đơn gần nhất (theo ngày, giờ, rồi mức/số đơn
    — thứ tự toàn phần), ≥ `toiThieu` đơn và ≥ `nguong`; mức gần đây ≠ mức cả cửa sổ ⇒ `doi_gia_gan_day`. Bậc = COD trọn gói (đơn vị nhỏ =
    `cod`); `phi_ship`/`mien_ship`/`gia_goc`/`khuyen_mai` để trống. Lời giải thích ở đơn vị LỚN + tệ («37 EUR · cả cửa sổ 29 EUR»).
  - `xemTruoc` — KHÔNG ghi: chỉ món `nguon='pos'` của team, 0 dòng `goi_gia` (kể cả bậc tắt), đã gộp gốc, tệ đơn ≡
    `TIEN_TE_THI_TRUONG[market kết nối team–shop]` (import từ `chuyen-ban-sao.js`). Trả đề xuất + bỏ theo lý do + `shopKhongDon` + dấu
    (sha256 của món · tệ · bậc · soNgay) + `tranMotLuot`.
  - `apGiaTuDon` — tính lại xem trước TRONG lượt; dấu thiếu ⇒ 409 `thieu_dau_xem_truoc`, lệch ⇒ 409 `xem_truoc_da_doi` (kèm bảng mới);
    `monIds` ngoài đề xuất ⇒ 400; quá `tranMotLuot` (50) ⇒ 400 `qua_nhieu_mon`; mỗi món qua `luuGia` được tiêm (một giao dịch/món — món hỏng
    dừng món đó, món khác đi tiếp, báo `hong[]`).
  - `chotMonChuaCoGia` — chạy NGAY SAU `BEGIN` của `saveProduct`: `pg_try_advisory_xact_lock(catalog:<team>)` (bận ⇒ 409
    `danh_muc_dang_ghi`) rồi đếm `goi_gia` của món (> 0 ⇒ 409 `da_co_gia`, ROLLBACK, không đè).
  - `taoNguonGiaDon` — đệm BQ theo câu đọc, 1 giờ, tối đa 4 câu (xem trước và áp cùng một lát dữ liệu).
- `v3/chay-that.js` — `luuGiaMonGoc` nhận tuỳ chọn `{ chot }` ⇒ `saveProduct(poolChotDauGiaoDich(pool, chot), …)` (đường cũ không `chot` y
  nguyên) · `nguonGiaDon` (vắng `V3_BQ_KHOA` ⇒ `null` ⇒ 503 nói rõ) · `khoSanPhamGoc.xemGiaTuDon` / `apGiaTuDon` (hàm tuỳ chọn) ghi qua
  ĐÚNG `luuGiaMonGoc` — không đường ghi giá thứ hai (cổng ③: 1 lời gọi `saveProduct` trong chay-that, 0 câu ghi trong tầng A).
- `v3/src/ui/san-pham/kho-goc.js` — `xemGiaTuDon` / `apGiaTuDon` (quản trị; marketer 403); phễu nhật ký kiểm TRƯỚC khi tầng A ghi; mỗi món
  đã ghi một dòng `dien_gia_tu_don_pos` ở sản phẩm (bậc · số đơn · tỷ lệ · khoảng ngày); `hamChuyen(ten, viec)` dùng chung (review #8 phần
  rẻ).
- `v3/src/ui/san-pham/router.js` — GET/POST `/api/san-pham/gia-tu-don`, đứng TRƯỚC `/api/san-pham/:id`.
- `v3/src/audit/hanh-dong.js` — mã `DIEN_GIA_TU_DON_POS` (+ nhóm `san_pham` + mô tả).
- `v3/src/ui/san-pham/trang/san-pham.html` — lối «Điền giá từ đơn POS →» (quản trị) · khung `?xem=gia-tu-don`: bảng SKU · tên · shop · bậc ·
  số đơn · tỷ lệ gần đây · giá đơn gần nhất · ngày; bỏ chọn từng món; chọn sẵn tối đa `tranMotLuot`; «Áp dụng N món» gửi dấu + `monIds` +
  `soNgay`; 409 ⇒ vẽ bảng mới, xoá lựa chọn cũ; kết quả: số món · số page KHÁC NHAU được đẩy · món lưu giá mà bản chép chưa đẩy · món hỏng;
  câu luật (chỉ món chưa giá, không ghi đè, sửa ở Theo thị trường, LỆCH ở đối soát) · shop không có đơn; kết quả về muộn KHÔNG vẽ đè màn khác.
- `docs/v3/03-MAN-HINH.md` — dòng Sản phẩm thêm GP1. Cổng `ops/bin/nghiem-thu/gp1.sh` + ba tệp ca.

## Quyết định · giả định · mâu thuẫn (luật 11/13)
1. **Team vào ngày đơn** (② thắng ① — mục Bước 3).
2. **`chua_gop_goc`** — món chưa gộp gốc không điền (cửa lưu giá cần gốc; không chỗ sửa/lùi). Giá: món chưa gộp không được giá cho tới khi
   gộp. Chưa đo số món này trên prod.
3. **Bậc ÍT ĐƠN bỏ riêng bậc; bậc ĐỦ ĐƠN mà phân tán hoặc đổi giá ⇒ bỏ CẢ món** (bản đầu bỏ riêng bậc phân tán — /code-review #2 dựng
   được nửa bảng cũ: mua 1 đang chuyển 29→37 ra «phân tán», mua 2 còn giá cũ 50 vẫn được đề xuất). Giá: món có một bậc lộn xộn mất cả
   đề xuất — chiều an toàn tiền (người gõ tay).
4. **`khong_tang` chặt `<`** — phiếu định nghĩa «giá mua nhiều < giá mua ít»; bằng giá cho qua.
5. **`pos_co_gia_mon` xét MỌI đơn của món trong cửa sổ** — bảo thủ (chặn oan được, không thu hai lần được). Nợ N-GP1-GIA-MON-CA-CUA-SO.
6. **Câu đọc gộp theo NGÀY** (một trang REST) — «gần nhất» xếp theo ngày, rồi giờ muộn nhất của dòng, rồi mức/số đơn; chỉ ngày ở biên
   K đơn là xấp xỉ (review #7 — chấp nhận, đã làm thứ tự toàn phần để dấu không đổi theo thứ tự BQ trả).
7. **Team HRM ngoài hệ (mã không có trong `TEAM_HRM`) ⇒ BỎ** (review #4 — cùng luật `tongHopTeam` LL17d); `team_code` NULL hoặc sale dùng
   chung `slug:'*'` ⇒ `khong_ghep_team`, chỉ báo khi là bằng chứng DUY NHẤT của một món chưa giá.
8. **Trần 50 món/lượt** (review #1) — mỗi món một giao dịch + đẩy bản chép, tuần tự trong một request; quá trần ⇒ 400 trước khi ghi; màn
   chọn sẵn 50, áp xong bảng tải lại (dấu mới) để áp tiếp — người luôn thấy bảng trước khi áp. Không làm dấu theo từng món (giữ hợp đồng
   `{ dauXemTruoc, monIds }` của phiếu).
9. **`lech_tien_te` gồm cả «thị trường của shop không có trong bảng tiền tệ»** (không đoán tệ).
10. **Đệm BQ 1 giờ** — dấu chỉ còn bắt đổi phía CSDL giữa xem và áp; đệm làm mới giữa hai lượt mà đơn POS mới đổi đề xuất ⇒ 409, người xem lại.

## Lệch phiếu (nói thẳng)
- Thêm lý do thứ 11 **`chua_gop_goc`** (ngoài mười lý do của phiếu) — Bước 3.
- Thêm **trần 50 món/lượt** (`qua_nhieu_mon`) — /code-review #1; phiếu không khai.
- `SQL_GIA_DON` trả thêm `sku` · `ngay` · `luc` · `gia_mon` (ngoài bộ cột phiếu kể) — cần cho `ganDay`, `sku_thu`, `pos_co_gia_mon`.
- Team theo **ngày đơn** (② phiếu) chứ không «team hiện tại» (① phiếu · sổ §5i).
- Lý do khoá bận đổi tên `danh_muc_dang_ghi` (bản đầu `dang_dong_bo` nói sai nguyên nhân — review #6).

## Nghiệm thu — output máy
- **Đỏ trên base:** ba tệp ca trên cây chưa vá ⇒ `ERR_MODULE_NOT_FOUND … gia-tu-don-pos.js` (3/3 tệp đỏ). `gp1.sh` chạy trên worktree tạm ở
  `b04d0dc` (chép ca + cổng vào): `rc=1` · `PHÉP=37 LỖI=25` (xanh còn lại chỉ là lưới gần ⑤ + tệp cấm).
- **`gp1.sh` trên commit `0ef3225`** (lượt đầy đủ 07:56): ① `pass=40 fail=0` ở **UTC** và **Pacific/Kiritimati (UTC+14)** · ② ca xanh **32/32** ·
  ③ nối dây chay-that 1·1·1·1 · tầng A 0 câu ghi · router dòng 217 < 226 · commit GP1 chạm tệp cấm 0 · sửa dở 0 · ④ lượt CHỨNG
  `pass=40 fail=0` · **25/25 đột biến đỏ đúng** · khôi phục `fail 0` · băm cây trước = sau · ⑤ 10 bộ ca gần xanh (ll15d ×2 · gsp3 ×2 · ve8b ×2 ·
  phan-quyen-nam-vai · tt1 · ll17d · san-pham). Lượt `BO_CONG_CU=1` cùng mã: `rc=0` · **`PHÉP=45 LỖI=0`**.
- **Bảng đảo-vá** (đòi ⊆ đỏ thật):
  ```
  gan_day_ca_cua_so   A2 (thật A1 A10 A12 A13 A16 A2)     bo_0_dong_gia      X1 X5 (thật X1 X4 X5 X6 X7)
  bo_tang_dan         A6                                  bo_dau             X4 (thật X4 X5)
  bo_loc_team         X2 (thật X1 X2 X5 X8)               bo_chot            X6 (thật X6 X7)
  bo_te_thi_truong    X3 (thật X1 X3 X5)                  doi_gia_chi_bac    A10 (thật A10 A12 A13 A2)
  bo_pos_co_gia_mon   A3                                  bo_sku_thu         A7
  bo_it_don           A4 (thật A13 A4 A9)                 bo_phan_tan        A5 (thật A10 A13 A16 A5)
  offers_chia_100     A8 X5 (thật A8 X5 X6 X7)            bo_vai             H1 X8
  nhat_ky_sai_ma      H2 X5                               man_bo_dau         M3 (thật M3 M4)
  man_giu_chon_sau_409 M4                                 phan_tan_chi_bac   A10 A16 (thật A10 A13 A16 A5)
  bo_thu_tu_toan_phan A17                                 ngoai_he_thanh_khong_ghep X3
  bo_tran_mot_luot    X7                                  dem_khong_gioi_han A18
  man_ve_de           M7                                  man_dem_page_trung M8
  man_chon_ca_vuot_tran M6
  ```
  **Đột biến nào KHÔNG đỏ:** không có trong 25. Chỗ CHƯA có đột biến đo: nối dây `chay-that.js` (chỉ phép hình dạng ③ — luật 30) · câu đọc
  BigQuery thật (đúng cột/kiểu chỉ chứng được bằng chạy thật) · nhánh khoá danh mục bận · nhánh nhật ký hỏng sau khi giá lưu · `docLuc`.
- **Cổng cũ ④8 (rc tách dòng):**
  ```
  gsp2.sh   rc=0 · 30 s            (lượt gp1.sh đầy đủ trên 0ef3225)
  gsp3.sh   rc=0 · 826 s           (lượt gp1.sh đầy đủ trên 0ef3225; cũng ✅ trong gsp3b và ✔ trong tt1 dưới đây)
  gsp3b.sh  rc=1 · 3835 s · ĐỎ 1 / XANH 54 — dòng đỏ DUY NHẤT: «⑥cổng-cũ-gsp1 TREO quá 2700s» (chuỗi lồng gsp1 → ve1 → ll18 → ll1 …)
            ⇒ chạy riêng gsp1.sh lần 2 (0 tiến trình cổng khác): rc=0 · ĐỎ 0 / XANH 14  (lượt riêng lần 1: rc=1 · 399 s, đỏ lồng
            ve1 → ll18 → «⑤cổng-trước ll3» ⇒ ve1.sh riêng rc=0 6/6 · ll3.sh riêng rc=0 7/7)
  tt1.sh    rc=1 · 4245 s · PHÉP=27 LỖI=1 — 26 phép của TT1 xanh; dòng đỏ DUY NHẤT: «cổng cũ gsp3b rc=1 · 6 dòng đỏ MỚI» = chuỗi lồng
            gsp3b → … → ll13 → ll6 → ll5 → ll3 → «⑤cổng-trước ll2.sh»  ⇒ chạy riêng ll2.sh: rc=0 · ĐỎ 0 / XANH 11
  ```
  Kết luận (máy dev): mọi dòng đỏ của cổng cũ nằm ở chuỗi cổng lồng sâu khi máy có chuỗi khác chạy song song (thợ TT1b, một cổng GL4); chạy
  riêng cổng con đều xanh. Lượt gsp3b đầu (chạy chồng chuỗi TT1b) đỏ «①②VE2b pass=16 fail=1» — `ve2b-page-gop.test.mjs` riêng 17/17. Không
  dòng đỏ nào chạm tệp GP1. Chưa có MỘT lượt gsp3b/tt1 trọn vẹn rc=0 — nợ chập chờn cũ N-VAI-B-NOI-DAY-CHAP-CHON.
- **`npm test`:** TRƯỚC (cây `6e9f373`) `tests 2563 · pass 2541 · fail 0 · skip 22` → SAU (`0ef3225`) `tests 2603 · pass 2581 · fail 0 · skip 22`
  (+40 = đúng 40 ca GP1).

## /code-review high — 10 phát hiện (đã dựng lại từng cái trước khi sửa)
1. Lượt áp dài, không trần (hàng trăm món × giao dịch + đẩy) ⇒ **SỬA**: trần 50/lượt (400 trước khi ghi) + màn chọn sẵn 50 · ca X7 M6.
2. Bậc đang chuyển giá ra «phân tán» ⇒ bậc khác giá cũ lọt (nửa bảng cũ) ⇒ **SỬA**: bậc đủ đơn phân tán ⇒ bỏ cả món · ca A10 A16.
3. Kết quả về muộn vẽ đè màn khác ⇒ **SỬA**: `dangXemGtd(g)` + dòng nổi · ca M7.
4. Team HRM ngoài hệ bị gộp «không ghép được» ⇒ **SỬA**: bỏ (luật LL17d) · ca X3.
5. «Đẩy sang N page» cộng trùng page ⇒ **SỬA**: đếm page khác nhau · ca M8.
6. Câu «đang đồng bộ POS» khi khoá do lượt lưu khác giữ ⇒ **SỬA**: `danh_muc_dang_ghi` nói cả hai nguyên nhân (chưa có ca — nhánh khoá bận).
7. Gộp theo ngày + đồng hạng theo thứ tự BQ ⇒ dấu đổi giả ⇒ **SỬA** phần thứ tự toàn phần · ca A17; xấp xỉ theo ngày giữ (quyết định 6).
8. CTE team theo ngày chép từ `don-pos.js` + `hamGiaTuDon` chép `hamChuyen` ⇒ **SỬA** phần hàm (`hamChuyen(ten, viec)`); SQL ⇒ **NỢ**
   N-GP1-SQL-TEAM-HAI-BAN (cần sửa `src/hrm/don-pos.js` — ngoài ③).
9. Chốt qua bọc pool mong manh, nên là tuỳ chọn `saveProduct` ⇒ **NỢ** N-GP1-CHOT-QUA-BOC-POOL (operations.js cấm — gộp N-GSP3B-HOOK-SAVEPRODUCT).
10. Kiểm BQ sau CSDL, tuần tự, đệm không giới hạn ⇒ **SỬA**: kiểm BQ trước, chạy song song, đệm tối đa 4 câu · ca X9 A18.
Bản vá cũng là code mới (luật 26): 8 đột biến mới đo bản SAU vá (bảng trên — từ `phan_tan_chi_bac`), cả 8 đỏ đúng.

## Sự cố trong lượt (bài học cho tổng)
- Cổng `gsp1.sh` (lồng trong `gsp3`/`gsp3b`/`tt1`) đảo-vá bằng cách **sửa TẠI CHỖ** `router.js` + `san-pham.html` của cây rồi `mv` bản lưu
  về — tôi đang sửa `san-pham.html` khi chuỗi đó chạy trên cây mình ⇒ đã dừng lượt đó, commit mã TRƯỚC rồi mới chạy cổng cũ (cây sạch sau
  mọi lượt: `git status` rỗng). Hai chuỗi cùng cây chạy chồng = hai bản lưu đè nhau.
- `tt1.sh` `trap … EXIT INT TERM` không `exit` ⇒ TERM không dừng cổng (phải KILL cả cây; cháu `gsp3.sh` mồ côi) — cùng bệnh gsp3b đã sửa 05/10.

## Nợ (§9)
N-GP1-SQL-TEAM-HAI-BAN · N-GP1-CHOT-QUA-BOC-POOL · N-GP1-MON-CHUA-GOP · N-GP1-BQ-MOT-TRANG · N-GP1-GIA-MON-CA-CUA-SO · N-GP1-BIEN-THE-ANH-EM
(review (a) G5) · N-GP1-NHIEU-BIEN-THE-CUNG-BAC (review (a) G6) · N-GP1-NGOAI-PHAM-VI (phiếu ⑥) · N-CONG-GSP1-SUA-TAI-CHO / tt1 trap TERM.
Review (a) G7 (số đo ① sai grain; Australia/Slovakia 0 đơn 60 ngày) — màn nói ra qua «Shop không có đơn …»; sửa chữ phiếu là việc tổng.

## Cách chạy «Điền giá» trên prod (để tổng trình người — chỉ khi đã deploy commit GP1)
Điều kiện: `V3_BQ_KHOA` có trên prod (LL17 — có) · TT1 đã deploy (hệ số EUR/RON/AUD/TWD) · TT1b (nếu deploy cùng) chặn bậc món POS lệch tệ
shop — GP1 ghi đúng `TIEN_TE_THI_TRUONG[market]` nên đi qua · restart `aicloser-v3` sau deploy. Đường ghi bản chép giống «Theo thị trường»
(VE8b): cửa ghi kho bot đóng mà `V3_RAP_PROMPT_BAT=1` ⇒ giá lưu, màn báo «chưa đẩy được bản chép»; đóng mà không ráp ⇒ từng món 502, không lưu.
1. Quản trị của TỪNG team (GCC · EU · AUUS — team đang mở) → Sản phẩm & kho → cột trái «Điền giá từ đơn POS →» (hoặc `/san-pham?xem=gia-tu-don`).
2. **Xem trước (chỉ đọc, 0 ghi):** bảng đề xuất + «Món bỏ qua theo lý do» + «Shop không có đơn …». Lượt đầu là lượt ĐO: BigQuery đọc ≤ 60 s;
   lỗi `bq_hong` «… một trang chỉ …» = câu đọc vượt một trang REST (nợ N-GP1-BQ-MOT-TRANG) — dừng, báo tổng. Chụp màn trình người duyệt.
3. Người soát cột «Giá đơn gần nhất · ngày» + «Tỷ lệ gần đây»; bỏ chọn món nghi ngờ. Lượt áp đầu nên NHỎ (5–10 món) để đo thời gian.
4. **Áp dụng N món** (≤ 50/lượt). 409 «Bảng đã đổi» ⇒ bảng mới đã vẽ, chưa ghi gì — xem lại rồi áp. Kết quả: số món · số page đẩy bản chép ·
   món chưa điền + lý do. Bảng tải lại ⇒ áp tiếp phần còn lại.
5. Kiểm: mở sản phẩm › Theo thị trường thấy bậc; tab Lịch sử có «Điền giá món POS từ đơn POS» (bậc · số đơn · tỷ lệ · khoảng ngày).
6. **Đường lùi:** món trước đó RỖNG giá ⇒ xoá bậc ở «Theo thị trường» của sản phẩm (qua cửa lưu giá — đẩy lại bản chép). Danh sách món đã
   điền: `nhat_ky.hanh_dong = 'dien_gia_tu_don_pos'` (`sau.monId`) + `v3_sua_san_pham` (truoc.goi_gia = []). `gia_tay` giữ `true` sau khi lùi.
