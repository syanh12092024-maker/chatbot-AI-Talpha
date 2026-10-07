# Nhật ký phiếu GP1 — điền sẵn bậc giá cho món POS CHƯA có giá, lấy từ COD đơn POS một món

Thợ: Claude Opus 5.5 (worktree riêng `.claude/worktrees/agent-a44f02596926c25c8`, nhánh `worktree-agent-a44f02596926c25c8`) · base phiếu
`b04d0dc` (nhánh dựng từ `6e9f373`) · làn 🟥 · skill: `tho-thi-cong` + `viet-thuoc`, xong chạy `/code-review high`.
Môi trường mọi số đo dưới đây: **máy dev**, Postgres hộp cát `aicloser_v3_test_gp1_p<pid>` (dẫn từ `DATABASE_URL_V3` của `.env` =
`127.0.0.1:5432`), BigQuery **GIẢ** trong mọi ca (không gọi mạng, không dùng khoá thật), cây = worktree trên. Không đo prod, không gửi tin,
`PANCAKE_READONLY=1` giữ nguyên.

## Dựng worktree
- HEAD lúc nhận là `0c6c1ed` (16/09), cây sạch ⇒ `git reset --hard 6e9f373` (chứa base `b04d0dc`).
- `node_modules` = symlink sang repo chính · `.env` chép từ repo chính (gitignore — không in, không commit).
- Phiên thợ bị ngắt hai lần (phiên tắt · hết hạn mức API) SAU commit mã `cb3c953`, giữa lượt cổng cũ. Mỗi lần nhận lại: `git status` sạch,
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

## Thay đổi (commit mã `cb3c953`) — mỗi chỗ một lý do
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
- **`gp1.sh` trên commit `cb3c953`** (lượt đầy đủ 07:56): ① `pass=40 fail=0` ở **UTC** và **Pacific/Kiritimati (UTC+14)** · ② ca xanh **32/32** ·
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
  gsp2.sh   rc=0 · 30 s            (lượt gp1.sh đầy đủ trên cb3c953)
  gsp3.sh   rc=0 · 826 s           (lượt gp1.sh đầy đủ trên cb3c953; cũng ✅ trong gsp3b và ✔ trong tt1 dưới đây)
  gsp3b.sh  rc=1 · 3835 s · ĐỎ 1 / XANH 54 — dòng đỏ DUY NHẤT: «⑥cổng-cũ-gsp1 TREO quá 2700s» (chuỗi lồng gsp1 → ve1 → ll18 → ll1 …)
            ⇒ chạy riêng gsp1.sh lần 2 (0 tiến trình cổng khác): rc=0 · ĐỎ 0 / XANH 14  (lượt riêng lần 1: rc=1 · 399 s, đỏ lồng
            ve1 → ll18 → «⑤cổng-trước ll3» ⇒ ve1.sh riêng rc=0 6/6 · ll3.sh riêng rc=0 7/7)
  tt1.sh    rc=1 · 4245 s · PHÉP=27 LỖI=1 — 26 phép của TT1 xanh; dòng đỏ DUY NHẤT: «cổng cũ gsp3b rc=1 · 6 dòng đỏ MỚI» = chuỗi lồng
            gsp3b → … → ll13 → ll6 → ll5 → ll3 → «⑤cổng-trước ll2.sh»  ⇒ chạy riêng ll2.sh: rc=0 · ĐỎ 0 / XANH 11
  ```
  Kết luận (máy dev): mọi dòng đỏ của cổng cũ nằm ở chuỗi cổng lồng sâu khi máy có chuỗi khác chạy song song (thợ TT1b, một cổng GL4); chạy
  riêng cổng con đều xanh. Lượt gsp3b đầu (chạy chồng chuỗi TT1b) đỏ «①②VE2b pass=16 fail=1» — `ve2b-page-gop.test.mjs` riêng 17/17. Không
  dòng đỏ nào chạm tệp GP1. Chưa có MỘT lượt gsp3b/tt1 trọn vẹn rc=0 — nợ chập chờn cũ N-VAI-B-NOI-DAY-CHAP-CHON.
- **`npm test`:** TRƯỚC (cây `6e9f373`) `tests 2563 · pass 2541 · fail 0 · skip 22` → SAU (`cb3c953`) `tests 2603 · pass 2581 · fail 0 · skip 22`
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


---

# Vòng 2 (07/10) — đối kháng F1–F4 + người quyết «Miễn ship»

Thợ: Claude Opus 5.5 (worktree riêng `.claude/worktrees/agent-adc2f8a08c2553dbd`, nhánh `worktree-agent-adc2f8a08c2553dbd`) · base vòng 2 `2f575c5`
(HEAD lúc nhận `ff3526a` — không chứa `2f575c5`, cây sạch ⇒ `git reset --hard 2f575c5`) · skill `tho-thi-cong` + `viet-thuoc`, xong `/code-review high`.
Nguồn việc: `scratchpad/refute-gp1.verdict.yaml` (ĐẠT 0 CHẶN · 4 NÊN F1–F4 · F5 GHI-NỢ · N1 nghiệp vụ «ship») + người quyết 07/10 «Miễn ship».
Môi trường mọi số đo: **máy dev**, Postgres hộp cát `aicloser_v3_test_gp1_p<pid>` trên `127.0.0.1:5432` (dẫn từ `DATABASE_URL_V3` của `.env`
chép từ repo chính — không in, không commit, `PANCAKE_READONLY=1` giữ), BigQuery **GIẢ**, cây đo = worktree trên (cổng in
`tầng A nạp từ …/agent-adc2f8a08c2553dbd/src/products/gia-tu-don-pos.js`). Không đo prod, không SSH, không push.

## ⑦ ĐÃ TRA CHƯA (output máy)
```
$ awk '/^## §9 /,/^## §9b/' docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | grep -n "GIA-MON-MOI-TEAM\|mien_ship\|miễn ship\|N-GP1-\|nguoiBo\|XOA-GIA"
1424:  - **N-GP1-SQL-TEAM-HAI-BAN** … 1427: N-GP1-CHOT-QUA-BOC-POOL … 1429: N-GP1-MON-CHUA-GOP … 1431: N-GP1-BQ-MOT-TRANG …
1433:  - **N-GP1-GIA-MON-CA-CUA-SO** … 1435: N-GP1-BIEN-THE-ANH-EM … 1436: N-GP1-NHIEU-BIEN-THE-CUNG-BAC … 1438: N-GP1-NGOAI-PHAM-VI
```
Không nợ nào trùng F1–F4 / «Miễn ship». Quan hệ: **vòng 2 của GP1** (cùng pathspec, không phiếu mới).

## Bước 3 — đo lại nguyên liệu đề bài (bẫy #4)
- **`saveProduct` nhận `mien_ship` ở đường `chiGia`?** CÓ: `src/admin-v3/operations.js:346-364` — vòng `INSERT goi_gia` chung cho cả hai nhánh,
  `g.mien_ship == null || g.mien_ship === "" ? null : !!g.mien_ship`. ⇒ KHÔNG cần sửa `operations.js` (tệp cấm). Đo bằng hành vi: ca X5 (Postgres thật,
  `goi_gia.mien_ship = true` sau áp) + X12 (prompt).
- **«phí ship CHƯA khai» sinh ở đâu?** Một chỗ: `src/chat/rap-prompt.js:190-191` (`xayVanBanSanPham`, khi MỌI bậc `mien_ship` lẫn `phi_ship` null) —
  chỉ chạy trên đường `V3_RAP_PROMPT_BAT=1` (`rapKb` → `catalog.js#docSanPhamGoiGia`). Bản chép v1 (`src/products/ban-chep-bot.js:43`) chỉ mang
  `tiers:[{label, price}]` — không mang ship ⇒ «miễn ship» tới bot CHỈ qua đường đọc CSDL (pilot bật cờ này — sổ §5j). Đường kb cũ không có câu «CHƯA khai».
- **`gia_tay = true` ai đặt?** `grep -rn gia_tay src v3/src` ⇒ một chỗ ghi: `operations.js:324` (nhánh `chiGia`). `cau_hinh_tay` (đường lưu ĐẦY ĐỦ,
  `operations.js:327`) KHÔNG đặt `gia_tay` — xem /code-review #1.
- **Repro đối kháng trên mã vòng 2** (chép tạm `rf-gp1*.test.mjs` vào worktree, chạy, xoá): `R2 ✖ · R3 ✖ · RM1 ✖` (kịch bản phá KHÔNG còn tái lập:
  «R2 A undefined bo: [… khac_gia_khong_ro_team … 37 EUR 8/10 · đơn của team 29 EUR (mới nhất 2026-09-10)]» · «R3 sau lùi: gia_tay = true · R trong đề
  xuất: false» · «RM1 … 89 SAR · 2026-09-20 — khác bậc … A được chọn sẵn lại = false · nút: Áp dụng 0 món») · `R1 ✔` (tầng A giữ luật 80% có chủ ý — F4
  xử ở màn, xem quyết định 5) · `R4 R5 R7 ✔` (không phá được — giữ) · `R6 ✔` (prompt với `mien_ship` NULL vẫn nói «CHƯA khai» — đúng; GP1 nay ghi `true`, X12).

## Danh sách ca (viết TRƯỚC — chạy đỏ trên mã base rồi mới sửa)
- F1 thuần (`test/gp1-tinh-bac.test.mjs`): **A19** 10 đơn team 29 EUR (01–10/09) + 8 đơn không rõ team 37 EUR (20–27/09) ⇒ `khac_gia_khong_ro_team`,
  chữ nói cả hai mức; 3 đơn mới khác mức (7/10) cũng chặn; bậc 2 sạch không cứu bậc 1 · **A20** CHO-QUA/BIÊN: cùng mức ⇒ đề xuất · khác mức nhưng cũ
  (ngoài 10 đơn) ⇒ không chặn · team KHÁC đã ghép không chen (④5) · đơn không rõ team ở số lượng khác không chặn · «giá đơn gần nhất» lấy cả đơn không
  rõ team · khác tệ ⇒ `lech_tien_te` · **A21** (/code-review #2) đơn khác mức GIỮA cửa sổ, gộp 8/10 ⇒ đề xuất nhưng tỷ lệ 8/10 + «gồm 2 đơn chưa ghép team».
- F1 trọn đường (Postgres + BQ giả): **X10** món N (marketer chưa ghép) · S (sale dùng chung `PIALPHA_SALE_ONLINE`) 8 đơn mới 109 SAR ⇒ không đề xuất
  99 SAR, lý do trên màn; Q cùng mức ⇒ vẫn đề xuất.
- F2: **X11** áp Q → xoá bậc ở Theo thị trường (`saveProduct` chỉ-giá `offers: []`) ⇒ `nguoi_da_xoa_gia`, không trong đề xuất · dấu cũ (bảng còn Q) phát
  lại ⇒ 409, 0 ghi · «áp tất cả» không ghi lại Q · CHO-QUA: K (0 dòng, chưa ai đặt giá tay) vẫn đề xuất.
- Miễn ship: **A8** `offersTuBac` mang `mien_ship: true` · **X5** `goi_gia.mien_ship = true`, phí ship/giá gốc trống, nhật ký nói «miễn ship» ·
  **X12** `rapKb` THẬT (cờ `V3_RAP_PROMPT_BAT=1` ca tự bật) ⇒ «Buy 1: 99 SAR (miễn ship) | Buy 2: 159 SAR (miễn ship)», không «phí ship CHƯA khai»,
  `tiers[].mienShip = true` · **M2** màn «Đã gồm ship · miễn ship».
- F3: **M4** (sửa theo luật mới) bỏ A → áp → 409 ⇒ A VẪN bỏ, nút tắt; chọn lại A ⇒ POST dấu mới · **M9** bỏ A → áp TW thành công → bảng tải lại: A
  vẫn bỏ (đổi ý chọn-bỏ hai lần vẫn là bỏ), bấm nút tắt không gửi A; «áp tiếp» quá trần vẫn chọn sẵn lượt kế · **M11** tải lại sau áp HỎNG (502) ⇒
  «Thử lại» giữ món bỏ + giữ kết quả lượt áp · **M12** (/code-review #4) tích-bỏ món KHÔNG chọn sẵn (vượt trần) là đổi ý ⇒ lượt kế vẫn chọn sẵn ·
  **M13** món đã từ chối, ở bảng tải lại tích rồi bỏ ⇒ vẫn từ chối qua lượt tải lại kế.
- F4: **M10** bậc 99 · đơn gần nhất 89 ⇒ dòng `data-muc="warning"` + chữ «khác bậc» + không chọn sẵn + câu giải thích; chọn tay được; 409 ⇒ chọn lại ·
  **X13** (/code-review #5) một đơn mới làm dòng thành lệch giữa lúc xem và lúc áp ⇒ dấu đổi ⇒ 409 kèm bảng mới, 0 ghi; đơn mới CÙNG mức không đổi dấu.

## Thay đổi (commit mã `631852b`) — mỗi chỗ một lý do
- `src/products/gia-tu-don-pos.js`:
  - `cuaSoGan(rs, ganDay)` — tách cửa sổ «ganDay đơn gần nhất» ra dùng chung (`tinhMotBac` và đối chiếu F1), đếm thêm số đơn không rõ team trong cửa sổ.
  - `tinhBac` gom dòng không rõ team theo (shop, biến thể) và đưa vào nhóm của team cùng (shop, biến thể); `motNhom(rs, ts, khongRo)`:
    đơn không rõ team khác tệ ⇒ `lech_tien_te` · mỗi bậc đề xuất: cửa sổ trên tập gộp (team ∪ không rõ team, cùng số lượng) — mức nhiều nhất ≠ giá
    bậc hoặc < `nguong` ⇒ `khac_gia_khong_ro_team` (bỏ CẢ món, chữ «bậc N: 10 đơn gần nhất (gồm k đơn …) mức nhiều nhất X n/10 · đơn của team Y (mới
    nhất d)»); qua mà cửa sổ có đơn không rõ team ⇒ `soDonMuc/soDonGanDay/tiLe` của TẬP GỘP + `soDonKhongRo`; `ganNhat` = đơn mới nhất tập gộp
    (`khongRoTeam: true`). Đơn không rõ team chỉ CHẶN, không bao giờ mở đề xuất.
  - `xemTruoc` đọc `s.gia_tay`; món `gia_tay` + 0 dòng ⇒ `nguoi_da_xoa_gia` (cả khi bằng chứng chỉ là đơn không rõ team).
  - `offersTuBac` ⇒ `mien_ship: true`; `apGiaTuDon` mang `mienShip` (suy từ offers ĐÃ gửi) lên kết quả cho nhật ký.
  - `dauCua` thêm cờ «giá đơn gần nhất ≠ giá bậc» mỗi bậc.
  - `LY_DO`/`CHU_LY_DO` + 2 lý do; chú thích đầu tệp + chỗ hở F2 (đường lưu đầy đủ) ghi thẳng tại chỗ.
- `v3/src/ui/san-pham/kho-goc.js` — câu nhật ký `dien_gia_tu_don_pos` thêm «bậc đã gồm ship · miễn ship» khi tầng A báo `mienShip`.
- `v3/src/ui/san-pham/trang/san-pham.html` — `lechGanNhat` · `chonSanGtd(du, nguoiBo)` (không chọn sẵn: món người từ chối · dòng lệch · vượt trần)
  · `tinhChonGtd` (tập chọn + `macDinh` sau mỗi lượt tải/409) · bỏ tích = từ chối chỉ khi món đang chọn sẵn hoặc từng bị từ chối (`daTuChoi`) ·
  «Thử lại» = `veGiaTuDon(g)` giữ `nguoiBo`/`daTuChoi`/`ketQua` · dòng lệch `data-muc="warning"` (bảng `data-kieu="hang-doi"` — vạch có sẵn) +
  «— khác bậc» + câu giải thích · «(đơn chưa ghép team)» cạnh giá đơn gần nhất · tỷ lệ «(gồm k đơn chưa ghép team)» · câu luật «Đã gồm ship · miễn
  ship … món người đã xoá giá cũng không điền lại».
- `test/gp1-*.test.mjs` · `v3/test/b/gp1-cua-man.test.mjs` — 12 ca mới + sửa thước (dưới). `ops/bin/nghiem-thu/gp1.sh` — ② thêm 12 thẻ, sàn ① 40→52,
  ④ 22 đột biến mới + 2 sửa khuôn, ⑤ thêm `tt1b-te-thi-truong` · `l2-m3-rap-prompt` (GP1 nay ghi qua chặn tệ TT1b và chạm prompt).

## Sửa thước theo luật mới (luật 27 — đỏ của thước giống hệt đỏ của mã)
- **M4** vòng 1 khẳng định «409 ⇒ lựa chọn cũ bị xoá, A về chọn» = đúng hành vi đối kháng F3 chỉ ra ⇒ viết lại theo luật giữ món bỏ.
- **M2** fixture A vòng 1 (bậc 99, đơn gần nhất 89) là dòng LỆCH ⇒ nay không chọn sẵn — fixture mặc định đổi thành khớp, dòng lệch chuyển sang tuỳ chọn
  `lech` (M10); M2 thêm «Đã gồm ship · miễn ship» và (TW) «9/10 (gồm 2 đơn chưa ghép team)» · «(đơn chưa ghép team)».
- **X5** `mien_ship: null` → `true` (người quyết 07/10) · **A8** `offersTuBac` thêm `mien_ship: true`.
- **X4** dọn cuối ca chỉ `DELETE goi_gia` của TW ⇒ TW thành «người đã xoá giá» (lượt `saveProduct` trong ca đặt `gia_tay`) và X5 hụt TW ⇒ dọn trả
  `gia_tay = false` (trạng thái đầu thật của món) — chú thích tại chỗ.
- Bộ màn: tầng A giả nay bỏ món đã ghi khỏi bảng + đổi dấu sau mỗi lượt áp (như máy chủ thật) — M3/M5/M7/M8 không đổi kết quả.

## Quyết định · giả định · mâu thuẫn (luật 11/13)
1. **F1 — cửa sổ trên TẬP GỘP, không phải «đơn không rõ team mới hơn đơn mới nhất của team»** (đề nghị đối kháng): một đơn team lẻ mới nhất sẽ giấu 8
   đơn khác giá ngay trước nó. Đơn không rõ team chỉ CHẶN — không mở đề xuất (vòng 1/phiếu ②: không ghép được ⇒ không phải giá của team). Giá phải trả:
   món có đơn sale dùng chung lệch mức trong 10 đơn gần nhất bị bỏ (người gõ tay).
2. **Đơn không rõ team KHÁC TỆ ⇒ `lech_tien_te`** (bản đầu: bỏ qua lặng — /code-review #7 đổi; cùng luật nhóm hai tệ của chính team).
3. **F2 chỉ nhận `gia_tay`** — đúng chữ lệnh tổng («gia_tay = true mà 0 dòng giá»); `cau_hinh_tay` (đường lưu đầy đủ, chỉ còn mở cho món RF-15 chưa page gắn
   nào đọc) chưa được nhận ⇒ nợ. Không mở rộng sang `cau_hinh_tay` vì sẽ loại thêm một tập món prod CHƯA đo được (món từng sửa tên/mô tả ở Vận hành).
4. **F3 — lựa chọn nhớ trong KHUNG**: qua tải lại sau áp / 409 / «Thử lại»; F5 trình duyệt hay mở lại khung = phiên mới (bảng mặc định — người đang nhìn
   bảng) ⇒ nợ nhỏ. Lựa chọn TAY trên dòng không chọn sẵn (lệch) không mang qua bảng mới (bảng người chưa thấy — M10).
5. **F4 ở MÀN, không đổi luật tầng A** (đề nghị «rẻ nhất» của đối kháng): luật 80%/10 đơn đã qua review (a); đơn mới nhất khác mức ⇒ dòng tô + không chọn sẵn
   + cờ vào dấu (X13). Giá: R1 vẫn ra đề xuất 29 EUR — người phải tự chọn dòng tô.
6. **`mienShip` trên kết quả áp suy từ `offers` thật** (không hằng): /code-review #8 gọi là thừa — giữ để câu nhật ký đi theo đúng thứ đã gửi `saveProduct`.

## Lệch phiếu / lệch lệnh (nói thẳng)
- Hai lý do mới `khac_gia_khong_ro_team` · `nguoi_da_xoa_gia` (13 lý do). Dấu xem trước gồm thêm cờ lệch mỗi bậc.
- **`docs/v3/03-MAN-HINH.md`** (dòng Sản phẩm · đoạn GP1) còn ghi «bậc = COD trọn gói (ship để trống)» — SAI sau vòng 2; tệp ngoài pathspec vòng 2 ⇒ KHÔNG
  sửa, đã hỏi tổng (SendMessage, chưa có trả lời lúc nộp) ⇒ nợ N-GP1-MAN-HINH-DOC.
- `gp1.sh` chạy `BO_CONG_CU=1` (⑥ = gsp2·gsp3·gsp3b·tt1 — vòng 1); cổng cũ của vòng 2 chạy RIÊNG đúng lệnh tổng: `gsp3.sh` · `tt1b.sh` (rc tách dòng).

## Nghiệm thu — output máy
- **Đỏ trên base** (bản sao `git archive 2f575c5` + ba tệp ca vòng 2; in `cây đo: …/scratchpad/gp1v2-base/src/products/gia-tu-don-pos.js`):
  `tests 52 · pass 35 · fail 17` = 16 ca + ca mẹ Postgres: `A8 A15 A19 A20 A21 X5 X10 X11 X12 X13 M2 M4 M9 M10 M11 M13`. **M12 xanh trên base** (canh
  luật «đổi ý» CỦA vòng 2 — base không có luật đó; đột biến `man_tu_choi_moi_lan_bo` đỏ nó). Lượt đầu (trước /code-review): 13 ca đỏ đúng lý do
  (A8 offers thiếu mien_ship · A19 `lyDo null` · X10 «111:vn không được đề xuất» · X11 «món người vừa gỡ giá KHÔNG hiện lại» · M4/M9 «A … chọn sẵn lại» ·
  M10 `data-muc null` …).
- **Ca sau sửa:** `tests 52 · pass 52 · fail 0` ở **UTC** và **Pacific/Kiritimati (UTC+14)**.
- **`gp1.sh` (BO_CONG_CU=1, lượt cuối = nội dung `631852b`):** `PHÉP=68 LỖI=0 · rc=0 · 895 s` — ① 52/0 × 2 múi giờ (sàn ≥52) · ② ca xanh 44/44 ·
  ③ chay-that 1·1·1·1 · tầng A 0 câu ghi · router 217 < 226 · tệp cấm 0·0 · ④ lượt CHỨNG 52/0 · **47/47 đột biến đỏ đúng** · khôi phục fail 0 · băm cây
  trước = sau · ⑤ 12 bộ ca gần xanh (ll15d ×2 · gsp3 ×2 · ve8b ×2 · phan-quyen-nam-vai · tt1 · ll17d · san-pham · tt1b 22/0 · l2-m3 6/0).
  Lượt trước /code-review: `PHÉP=62 LỖI=0 · rc=0 · 679 s` (41 đột biến).
- **Bảng đảo-vá vòng 2** (đòi ⊆ đỏ thật):
  ```
  bo_khong_ro_team       A19 X10                     khong_ro_bo_nguong   A19          khong_ro_khac_te  A20
  gan_nhat_chi_team      A20 X10                     ti_le_chi_team       A20 A21 X10  dau_bo_lech       X13 (thật X11 X13)
  bo_gia_tay_xoa         X11                         bo_mien_ship         A8 X5 X12    nhat_ky_mien_ship X5
  man_quen_nguoi_bo      M4 M9 M11                   man_409_quen_nguoi_bo M4          man_tai_lai_quen_nguoi_bo M9 (thật M9 M11 M13)
  man_bo_chon_khong_nho  M4 M9 (thật M4 M9 M11 M13)  man_tu_choi_moi_lan_bo M12        man_doi_y_mat_tu_choi M13
  man_thu_lai_mat_bo     M11                         man_thu_lai_mat_ket_qua M11       man_chon_san_lech M10
  man_khong_to_lech      M10                         man_chu_mien_ship    M2           man_ti_le_giau_khong_ro M2
  man_409_khong_tinh_lai M10   (thay `man_giu_chon_sau_409` vòng 1)   man_chon_ca_vuot_tran M6 (khuôn mới)
  ```
  **Đột biến nào KHÔNG đỏ:** không có trong 47. Chỗ CHƯA có đột biến/ca đo: nhánh `g.team == null` + `gia_tay` (món chỉ có đơn không rõ team mà người đã
  xoá giá — sai nhánh chỉ đổi CHỮ lý do, cả hai đều không đề xuất) · «xoá giá giữa lúc tính lại và lúc ghi» (dựa vào khoá phiên bản `saveProduct`: lượt lưu
  của người đổi `xmin` ⇒ 409 — chưa có ca dựng riêng) · nối dây `chay-that.js` (không đổi ở vòng 2).
- **Cổng cũ (rc tách dòng):**
  ```
  gsp3.sh  rc=1 · 846 s · ĐỎ 1 / XANH 42 — dòng đỏ DUY NHẤT: «⑥cổng-cũ-ll15d … MỚI: ⑤thước v3/test/b/ve2b-page-gop.test.mjs fail=1» (chuỗi lồng)
           ⇒ ve2b-page-gop riêng: 17/17 · ll15d.sh riêng: rc=0 · ĐỎ 0 / XANH 21 (ve2b fail=0) · 124 s
           ⇒ gsp3.sh lượt 2: rc=0 · 720 s · ĐỎ 0 / XANH 43 (chạy riêng, 0 chuỗi cổng khác trên máy)
  tt1b.sh  rc=1 · 3497 s · PHÉP=41 LỖI=1 — 40 phép của TT1b xanh (①–⑥ + bộ ca/lưới gần ⑦); ⑦ cổng cũ: gsp3 rc=0 · l3-m4 / va-r2 đỏ SẴN
           0 dòng mới · ll2 rc=0; dòng đỏ DUY NHẤT: «cổng cũ tt1 TREO quá 2700s» (lồng tt1 → gsp3 → «④cổng-trước ve7b/ve8a … ve2b …»)
           ⇒ tt1.sh riêng: rc=1 · 5817 s · PHÉP=27 LỖI=2 — 25 phép TT1 xanh; đỏ: «cổng cũ gsp3 TREO quá 2700s» (gsp3 riêng 720 s rc=0 ở trên)
             + «gsp3b rc=1 · 2 dòng mới» = lồng gsp3b → ve2b → «③thước v3/test/b/ll18-khung.test.mjs fail=1»
           ⇒ ll18-khung riêng 16/16 · ve2b-page-gop riêng 17/17 — đúng nợ chập chờn N-THUOC-CHAP-CHON (ll18-khung đỏ 1 ca mỗi lượt đủ cổng lồng sâu)
  ```
  Ca ve2b canh màn Page, không ca nào gọi đường gia-tu-don (`grep -c "gia-tu-don\|GiaTuDon"` trong tệp ca = 0) — cùng dòng chập chờn vòng 1 đã gặp
  ở chuỗi lồng (N-VAI-B-NOI-DAY-CHAP-CHON).
- **`npm test`:** TRƯỚC (bản sao `2f575c5`) `tests 2694 · pass 2672 · fail 0 · skip 22 · rc=0` → SAU (`631852b`) `tests 2706 · pass 2684 · fail 0 · skip 22
  · rc=0` (+12 = đúng 12 ca mới; lượt trần, không treo).

## /code-review high — 10 phát hiện (kiểm chứng từng cái trước khi sửa/bác)
1. Đường lưu ĐẦY ĐỦ xoá giá (`cau_hinh_tay`, không `gia_tay`) vẫn bị đề xuất lại — **DỰNG ĐƯỢC một phần**: `chanMonPosCuaDayDu` chặn món POS ở hai cửa
   lưu đầy đủ TRỪ món RF-15 (page_id trỏ page CHƯA gắn, không page đã gắn nào đọc — `chuyen-ban-sao.js:770-778`) ⇒ hở hẹp tới GSP4 ⇒ **BÁC + NỢ**
   N-GP1-XOA-GIA-DAU-HIEU (quyết định 3), ghi tại chỗ trong mã.
2. Tỷ lệ màn «10/10» của team khi tập gộp 8/10 — **SỬA** (A21 đỏ trước vá): tỷ lệ tập gộp + `soDonKhongRo` trên màn.
3. Đơn không rõ team có giá món / SKU thử chặn oan — **BÁC**: đơn mang giá món nghĩa là POS có giá món ⇒ tạo đơn thu hai lần — chặn là chiều an toàn
   (chữ lý do chưa đúng nguyên nhân ⇒ gộp N-GP1-GIA-MON-MOI-TEAM); SKU là của BIẾN THỂ (cùng `variation_id` ⇒ cùng SKU) ⇒ nhóm team đã `sku_thu`.
4. Tích-bỏ món không chọn sẵn bị nhớ thành «từ chối» — **SỬA** (M12 đỏ trước vá): `macDinh` + `daTuChoi`; M13 canh đổi-ý-hai-lần sau tải lại.
5. Dấu không gồm trạng thái lệch F4 — **SỬA** (X13 đỏ trước vá: áp thành công món người chưa thấy cảnh báo).
6. «Thử lại» mất kết quả lượt áp — **SỬA** (M11 thêm khẳng định, đỏ trước vá).
7. Đơn không rõ team khác tệ bị bỏ qua lặng — **SỬA** (A20 đỏ trước vá) ⇒ `lech_tien_te`.
8. `mienShip` luôn true — **BÁC** (quyết định 6).
9. Mượn `data-kieu="hang-doi"` — **BÁC + NỢ**: luật hàng đợi chỉ nhắm `tr[data-id]` · `td.c-dem` · `td[data-nhan]` (`kieu.css:821-836`) — bảng GP1
   không có ⇒ chỉ ăn vạch `tr[data-muc]`; luật vạch chung cần sửa `kieu.css` (ngoài pathspec) ⇒ N-GP1-VACH-CANH-BAO-CHUNG.
10. `gia_tay` làm dấu gián tiếp cho «người đã gỡ giá» — **BÁC + NỢ** (gộp #1: dấu tường minh cần `saveProduct` — tệp cấm).
Bản vá cũng là code mới (luật 26): 6 đột biến đo bản SAU /code-review (`man_tu_choi_moi_lan_bo` · `man_doi_y_mat_tu_choi` · `man_thu_lai_mat_ket_qua`
· `man_ti_le_giau_khong_ro` · `ti_le_chi_team` · `dau_bo_lech`) + 4 đột biến đổi khuôn theo mã mới — tất cả đỏ đúng.

## Nợ (§9)
N-GP1-GIA-MON-MOI-TEAM (F5 — lệnh tổng) · N-GP1-XOA-GIA-DAU-HIEU · N-GP1-MAN-HINH-DOC · N-GP1-CHON-THEO-KHUNG · N-GP1-VACH-CANH-BAO-CHUNG.

## Cách chạy «Điền giá» trên prod — chỗ ĐỔI so với vòng 1
- Bảng: dòng tô vạch cảnh báo = giá đơn gần nhất khác bậc (kể cả đơn marketer chưa ghép team — ghi «(đơn chưa ghép team)») — KHÔNG chọn sẵn; soát rồi tự
  chọn. Tỷ lệ có «(gồm k đơn chưa ghép team)» khi cửa sổ có đơn đó. Món bỏ chọn được giữ qua mọi lượt «áp tiếp» / 409 / «Thử lại» trong khung (F5 = bảng mới).
- Lý do mới trong «Món bỏ qua»: «Đơn gần đây của marketer chưa ghép team / sale dùng chung mang giá khác» · «Người đã xoá giá món này».
- Bậc ghi `mien_ship = true` ⇒ bot (đường đọc CSDL, `V3_RAP_PROMPT_BAT=1`) nói «miễn ship», không đẩy khách sang sale hỏi phí ship.
- **Đường lùi (thay bước 6 vòng 1):** xoá bậc ở «Theo thị trường» ⇒ món `gia_tay = true` + 0 bậc ⇒ lượt «Điền giá» sau báo «Người đã xoá giá món này»,
  KHÔNG đề xuất lại (cả khi phát lại dấu cũ). Muốn có giá cho món đó: nhập tay ở Theo thị trường. Xoá giá qua cửa lưu ĐẦY ĐỦ (chỉ món RF-15) chưa được
  nhận — nợ N-GP1-XOA-GIA-DAU-HIEU.
