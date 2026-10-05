# GSP3 — Đối soát giá + ảnh của bản sao theo đơn vị GỐC × SHOP · 05/10/2026

Base `b0b82d7` · commit code `176c823` · làn 🟥 (ghi `goi_gia` mà `cua2Tien` đọc) · thợ một phiên · skill `tho-thi-cong` + `viet-thuoc`,
xong chạy `/code-review` (high). Không push, không deploy, không SSH; `.env` máy này giữ `PANCAKE_READONLY=1` (đếm: 1 dòng).

## Đã làm (theo mục ② của phiếu)

- `src/products/chuyen-ban-sao.js`
  - `donViDoiSoat(pool, teamId, gocId, shopId)`: bộ đọc theo đúng hình phiếu ② Ra 1. Có `co032`, `goc`, `shop{id, market, tienTe}`, `mon[]`,
    `banSao[]` (thêm `daQuyet` và `bang`), `pageDonVi[]`, `pageChuaGanCungMon[]`, `bangKhacNhau[]` (thêm `monPosMa`). Giá, giá gốc và
    ship ở đơn vị LỚN, quy đổi MỘT chỗ (`bacDonViLon`). Phép so «bảng» dùng giá trị thô trong CSDL.
  - `doiSoatDonVi(pool, teamId, {gocId, shopId, cap, chon}, {luuGia, dayMon})`: kiểm hết rồi mới ghi. Thứ tự kiểm:
    `chua_ap_032` → `{daXong:true}` → `can_chon_mon` → `thi_truong_la` → `lech_tien_te` → `chon_khong_hop_le` / `khong_co_gia_mon` /
    `lech_gia_giua_page` / `khong_co_gia` / `cot_bac_la` / `khong_chep_duoc`. Sau đó ghi từng món: thêm ảnh qua `themAnh` (nguồn `kb`,
    nối cuối, bỏ ảnh trùng `duong`, thứ tự page rồi `thu_tu`), rồi tới giá qua `luuGia` (= `saveProduct` chỉ-giá, `offers` ĐỦ chín cột,
    kể cả bậc tắt). Bảng thắng ≡ giá món thì không ghi giá nhưng VẪN đẩy bản chép (`dayMon`). Đẩy hỏng thì gỡ đúng các ảnh vừa thêm;
    gỡ ảnh cũng hỏng thì báo `nua_voi` kèm số ảnh còn lại. Cuối cùng đánh dấu cả đơn vị bằng MỘT câu (`chep` / `giu_gia_mon` + gốc +
    shop + lúc), không đụng `pos_ma` / `sua_luc`. Vị từ `daQuyet` gọi lại, không viết lại.
  - Hằng mới `TIEN_TE_THI_TRUONG` (Saudi SAR · UAE AED · Kuwait KWD · Qatar QAR · Oman OMR · Bahrain BHD; Taiwan cố ý vắng) và
    `COT_BAC_CHEP` (chín cột).
- `src/products/san-pham-goc.js`, chỉ hai hàm:
  - `boSanPhamGoc`: xoá gốc và dọn dấu `doi_soat*` của mã đó trong MỘT câu CTE (F1).
  - `ganPageVaoGoc`: xoá dấu `bo_qua` của page ngay trong giao dịch gắn (F2).
  - Cả hai có lưới 032: CSDL chưa áp 032 thì chạy như cũ.
- `v3/src/ui/san-pham/kho-goc.js`: thêm `xemDoiSoat` và `doiSoatDonVi` (quản trị; hàm TUỲ CHỌN của `datKhoGoc`). Nhật ký
  `doi_soat_ban_sao` ghi ở sản phẩm và ở TỪNG page của đơn vị. Lượt dở hoặc nửa vời cũng ghi nhật ký rồi mới ném lỗi. Lỗi chỉ có
  `status` thì bọc thành `luu_gia`.
- `v3/src/ui/san-pham/router.js`:
  - `GET` và `POST /api/san-pham/chuyen/doi-soat`, đặt trước `/:id`.
  - `traLoi` chuyển nguyên `duLieu` của lỗi 409.
- `v3/chay-that.js`:
  - Tách `luuGia` thành `luuGiaMonGoc` (cùng thân; VE8b vẫn dùng đúng hàm đó).
  - Thêm `donViDoiSoat` và `doiSoat`, nối vào `luuGiaMonGoc` cùng `taoBuocDayBot({ day })` — không có đường ghi giá thứ hai.
- `v3/src/audit/hanh-dong.js`: thêm `DOI_SOAT_BAN_SAO` ở cả ba chỗ.
- `v3/src/ui/san-pham/trang/san-pham.html`:
  - Dòng `cho_doi_soat` có nút «Đối soát giá + ảnh cho «G» · «shop»».
  - Khung đơn vị gồm:
    - giá món đang có;
    - bảng từng bản sao, ô khác nhau tô `<mark>` (so theo MÓN ĐÍCH);
    - ô chọn món khi gốc có hơn một món, ô chọn bảng khi lệch;
    - ảnh sẽ gom về món;
    - cảnh báo page chưa gắn cùng món;
    - tiêu đề «page sẽ đổi giá»: nói thật khi bảng trùng giá món (không đổi giá).
  - Lưu xong: tải lại danh sách và bộ đếm, báo «N page sang xong».

## Đo lại nguyên liệu trước khi code (bước 3)

- Cửa lưu giá: `v3/chay-that.js:346` `luuGia` → `monCuaGoc` + `saveProduct(..., {chiGia:true, sauKhiLuu: taoBuocDayBot({day})})`.
  Chi tiết của `saveProduct` (`src/admin-v3/operations.js`):
  - `offers` nhận đơn vị lớn và nhân `HE_SO_TE` một lần;
  - `bat === false ? false : true`;
  - trim `nhan`, cắt `khuyen_mai` ở 300 ký tự;
  - chụp `truoc` trong giao dịch.

  Đúng như phiếu khai.
- `goi_gia` = khoá (`id` · `team_id` · `san_pham_id`) + chín cột (`so_luong` `gia` `tien_te` `gia_goc` `khuyen_mai` `phi_ship` `mien_ship` `bat`
  `nhan`), đọc từ `db/schema.sql`. Ca A0 đối chiếu với lược đồ hộp cát.
- `cua2Tien` so `tong_tien` ở đơn vị nhỏ; `chuanHoaHoSo({total_price})` nhân `HE_SO_TE`. Ca ④3 dùng đúng đường bot (299 SAR ⇒ 29900).
- `pageBanSanPham`: món POS không có `page_id` ⇒ đẩy cho MỌI page gắn gốc + shop. Lưu ý N-GSP2-F3: món POS mang `page_id` (RF-15) thì
  chỉ đẩy cho page đó; prod 02/10 có 0/491 món như vậy.
- `ket_noi_pos.market` trên prod (CR 5d bảng 7): Saudi · UAE · Kuwait · Taiwan · Qatar · Oman · Bahrain.
- Dữ liệu bản sao:
  - CSDL dev `aicloser_v3`: 0 bản sao, không đo được ở đó (đo bằng `BEGIN READ ONLY`).
  - `kb-overrides.json` bản LOCAL (28/09; 79 sản phẩm · 543 ảnh · 143 bậc): nhãn ảnh > 80 ký tự = 0 · nhãn bậc có khoảng trắng đầu/cuối
    = 0 · nhãn bậc > 160 = 0 · giá ≤ 0 hoặc lẻ đơn vị nhỏ = 0 · sản phẩm > 30 bậc = 0.
  - Prod CHƯA đo (không SSH).
- §⑦ đã tra (output máy, `awk '/^## §9 /,/^## §9b/' … | grep …`): dòng 1093 N-GSP-XOA-BAN-SAO · 1098 N-GSP-KB-OVERRIDES. Phiếu không xoá
  bản sao, không đụng `kb-overrides.json` ⇒ không trùng nợ cũ.

## Giả định và chọn lựa (khai ra, không lặng lẽ)

1. Bản sao KHÔNG có bậc giá thì không đề xuất bảng: không vào phép so, chỉ góp ảnh, đánh dấu `giu_gia_mon`. Cả đơn vị không có bảng nào
   (bản sao rỗng, món chưa giá) ⇒ 409 `khong_co_gia`. Chọn CHẶN thay vì đánh dấu «xong» một page không giá; giá phải trả là thêm một mã
   409 ngoài phiếu.
2. `chep` = bản sao có bảng ≡ bảng thắng VÀ món được ghi giá trong lượt này. Bảng thắng ≡ giá món ⇒ `giu_gia_mon` (đúng ca Q ④5).
   Hệ quả: chạy lại sau một lượt dở thì bản sao của món đã ghi trước được đánh `giu_gia_mon`, không phải `chep`. Cả hai đều «đã quyết»,
   và nhật ký «đối soát DỞ» giữ lại dấu chép.
3. Các mã ngoài phiếu: `chon_khong_hop_le` · `khong_co_gia` · `cot_bac_la` · `khong_chep_duoc` (409) · `nua_voi` (500) ·
   `shop_ngoai_san_pham` / `khong_co` (404).
4. «Bảng» so bằng `to_jsonb(goi_gia) − id/san_pham_id/team_id` ⇒ cột thêm vào `goi_gia` về sau tự vào phép so. Phép chép chỉ chép được chín
   cột ⇒ bảng thắng mang cột lạ ⇒ `cot_bac_la`. Ca A0 khoá chín cột ≡ lược đồ thật.
5. Tiền tệ so CHÍNH XÁC từng chữ (`sar` ≠ `SAR`), vì `saveProduct` tra `HE_SO_TE` đúng chữ. Thị trường tra bằng `Object.hasOwn`, vì khoá
   `constructor` trả về một hàm.
6. Nhánh «bảng thắng = giá món» đẩy bằng CÙNG bước `taoBuocDayBot` (`dayMon`) chứ không gọi trần `daySanPhamSangBot` ⇒ giữ ngoại lệ
   `cua_ghi_dong` giống nhánh có ghi giá.
7. `boSanPhamGoc` dọn dấu bằng CTE một câu (`DELETE … RETURNING` → `UPDATE`, một giao dịch ngầm) thay vì mở giao dịch tường minh. Lý do:
   giữ nguyên cấu trúc hàm cũ và ca SG4 (`test/san-pham-goc.test.mjs` dùng pool giả không có `connect`; tệp đó ngoài ③).
8. Câu kiểm cột 032 chép lại trong hai hàm của `san-pham-goc.js`, vì pathspec chỉ cho sửa hai hàm và import từ `chuyen-ban-sao.js` sẽ
   thành vòng import. Ghi nợ N-GSP3-DOT-COT032.
9. Gốc nhiều món KHÔNG gói vào một giao dịch (`saveProduct` tự commit, `operations.js` cấm sửa). Món sau hỏng thì món trước giữ nguyên,
   nhật ký ghi «đối soát DỞ», đơn vị chưa đánh dấu; chạy lại thì đi tiếp (ca R1).
10. Ảnh ghi ngoài giao dịch của `saveProduct` rồi bù trừ khi hỏng — đúng thiết kế phiếu ② 4a/4c, và `anh-san-pham.js` cấm sửa. Có kiểm
    TRƯỚC luật của `themAnh` / `saveProduct` mà CSDL không ràng buộc (`khong_chep_duoc`) để giảm số lần phải bù trừ. Tiến trình chết giữa
    chừng sẽ tự lành khi chạy lại, nhờ khử ảnh trùng theo `duong`.

## Nhánh test KHÔNG chạm

- Nối dây thật `v3/chay-that.js` (cần cả hệ). Ca tầng A dựng lại ĐÚNG khuôn `luuGiaMonGoc` / `dayMon`; `node --check` qua.
- Ngoại lệ `cua_ghi_dong` (`V3_RAP_PROMPT_BAT=1`) ở nhánh `dayMon`.
- Hai quản trị bấm cùng một đơn vị một lúc: dựa vào `version` của `saveProduct` và UNIQUE `(san_pham_id, duong)`; chưa có ca.
- Màn chạy trên DOM giả; chưa xem bằng trình duyệt thật.

## Nghiệm thu (máy dev · hộp cát Postgres 127.0.0.1:5432 · không đo prod)

- Bộ ca GSP3: `test/gsp3-doi-soat.test.mjs` 20/20 (Postgres thật) + `v3/test/b/gsp3-doi-soat-man.test.mjs` 5/5.
- `ops/bin/nghiem-thu/gsp3.sh` **rc=0 · ĐỎ 0 / XANH 32**. Chạy với `env -u DATABASE_URL_V3`: cổng tự nạp `.env`, không dùng `rg`.
  - ① 25 ca, sàn ≥ 25.
  - ② 23/23 phép của ④ có ca xanh riêng.
  - ③ `operations.js` / `anh-san-pham.js` / `ban-chep-bot.js` nguyên so với base.
  - ④ lượt chứng trên bản sao tạm xanh, sau đó **18 đột biến đều làm ĐÚNG ca đỏ**:
    - lệch-giữa-page ⇒ ④1
    - chép-4-cột ⇒ ④2
    - bỏ-đẩy-nhánh-giống ⇒ ④5
    - bỏ-gỡ-ảnh ⇒ ④8
    - đánh-dấu-theo-page-bấm ⇒ ④2
    - bỏ-chia-đơn-vị ⇒ A9b
    - bỏ-kiểm-tiền-tệ ⇒ ④7
    - đoán-Taiwan ⇒ ④7
    - bỏ-lưới-032 ⇒ ④9
    - bỏ-dọn-dấu-bỏ-gốc ⇒ F1
    - bỏ-dọn-bo_qua-khi-gắn ⇒ F2
    - bỏ-kiểm-vai ⇒ ④9 marketer
    - bỏ-duLieu-409 ⇒ cửa thật
    - bỏ-nút ⇒ màn
    - bỏ-kiểm-trước ⇒ R3
    - bỏ-nhật-ký-dở ⇒ R1
    - lệch-cả-đơn-vị-trên-màn ⇒ màn nhiều món
    - màn-hứa-chép-khi-trùng ⇒ màn trùng

    Sau khi khôi phục, bản sao tạm xanh lại; băm 5 tệp của cây chung trước = sau.
  - ⑤ LL15d chạy riêng: 4/4 + 5/5.
  - ⑥ cổng cũ: `gsp1` 0 · `gsp2` 0 · `ve8b` 0 · `ll15d` 0. `va-r2` rc=1 và `l3-m4` rc=1 là **ĐỎ SẴN**: đối chứng cùng thước trên worktree
    tạm ở base cho danh sách dòng đỏ giống hệt (12 và 33 dòng), 0 dòng đỏ mới. Cổng tự đối chứng; đo tay thêm một lần trên worktree
    `244c199` cũng giống hệt. Ghi nợ N-GSP3-CONG-CU-DO.
- `npm test`: base `244c199` **2347 · 2343 pass · 0 fail · 4 skip** → sau GSP3 **2372 · 2368 pass · 0 fail · 4 skip** (+25 ca, 0 đỏ mới).
- `git diff --check` sạch. Commit pathspec 10 tệp, đều trong ③.

## `/code-review` (high) — 10 phát hiện, kiểm từng claim trước khi sửa

| # | Phát hiện | Kết luận | Làm gì |
|---|---|---|---|
| R1 | gốc nhiều món, món sau hỏng ⇒ không nhật ký cho món đã đổi giá | ĐÚNG (dựng lại bằng ca R1) | lỗi mang `daXongMon` đủ bản ghi + `posMaHong`; kho-goc ghi «đối soát DỞ» · ca R1 + đột biến |
| R2 | ảnh ngoài giao dịch, bù trừ | đúng về cơ chế; là thiết kế phiếu ② 4a/4c, không thể chung giao dịch (hai tệp cấm sửa) | chấp nhận; giảm cửa sổ bằng kiểm trước (R3); chết giữa chừng tự lành khi chạy lại |
| R3 | luật themAnh/saveProduct kiểm sau khi đã chèn ảnh | ĐÚNG | kiểm trước ⇒ 409 `khong_chep_duoc` không ghi · ca R3 + đột biến (dữ liệu kb local: 0 ca dính) |
| R4 | gỡ món x rồi gắn món y cùng gốc ⇒ dấu `chep` cũ vẫn hiệu lực | ĐÚNG; cửa tiền vẫn ĐÓNG (món mới chưa giá) nhưng bộ đếm thấp hơn thật | ngoài pathspec (`daQuyet` cấm viết lại; chỉ được sửa 2 hàm) ⇒ nợ N-GSP3-DOI-MON, phải đóng trước GSP4 |
| R5 | so thô vs saveProduct chuẩn hoá (trim nhãn, cắt KM) | đúng về lý thuyết; đo 0 ca; nap-tu-kb không ghi `khuyen_mai` | giữ so thô theo ② 8; sau khi ghi đọc lại, lệch ⇒ `canhBao` trong kết quả + nhật ký |
| R6 | màn: huy hiệu «N bảng khác nhau» với gốc nhiều món | ĐÚNG | so theo món đích (cùng luật máy chủ) · assert 0 ô tô + đột biến |
| R7 | màn: «chép lên món» khi trùng giá món; luôn hứa danh sách đổi giá | ĐÚNG | câu «trùng giá món: giữ giá, không đổi giá»; tiêu đề page theo kết cục · ca mới + đột biến |
| R8 | GET gọi `dsViecChuyen` cả team | ghi nhận (màn chuyển GSP2 cũng gọi mỗi lần mở; ~78 bản sao) | không đổi |
| R9 | câu kiểm cột 032 chép 3 nơi | đúng; do ràng buộc pathspec | nợ N-GSP3-DOT-COT032 |
| R10 | gom bảng viết 3 nơi | ghi nhận; lệch màn↔máy chủ đã khoá bằng ca R6/R7 | không đổi |

Đảo-vá đo bản SAU khi vá review (lượt cổng thứ ba): 18/18 đột biến bị bắt.

## Đường lùi (② 6)

- Giá: nhật ký `doi_soat_ban_sao` giữ `bangCu` ở đơn vị LỚN, đúng khuôn `offers` ⇒ nhập lại qua `POST /api/san-pham/goc/:id/gia`.
  `saveProduct` cũng chụp `truoc` (`v3_sua_san_pham`). Không dựa vào id `goi_gia` (bị xoá rồi chèn lại).
- Ảnh: xoá các ảnh `nguon='kb'` trên món.
- Trạng thái: `UPDATE san_pham SET doi_soat=NULL, doi_soat_luc=NULL, doi_soat_goc=NULL, doi_soat_shop=NULL` cho bản sao của đơn vị.
- Bản sao giữ NGUYÊN (ca ④2 băm dòng + bậc + ảnh trước = sau).

## Ngoài phạm vi ⇒ §9 sổ (APPEND cùng lượt)

N-GSP3-DOI-MON · N-GSP3-CONG-CU-DO · N-GSP3-DOT-COT032 · N-GSP3-DOC-MAN. Các nợ của phiếu ⑥ (GSP3b khoá trang page · GSP4 · xoá
bản sao · kb-overrides · TWD) giữ nguyên.

## `_chan1.sh gsp3`

Lượt 1 (05/10, sau commit `176c823`): **ĐỎ 1 / XANH 7** — ⑦ `gsp3.sh` rc=1, đỏ duy nhất ⑥`gsp1` «4 dòng đỏ MỚI», gốc ở tầng thứ tư
của chuỗi cổng con (`gsp1 → ve8b → ve8a → ve7b`): `🔴 ③thước v3/test/b/vai-b-noi-day.test.mjs fail=1`. Kiểm chứng ngay:
chạy riêng tệp đó **5 lần ⇒ 5/5 xanh (pass 5 fail 0)** · `gsp1.sh` chạy riêng **rc=0, 14/14**. Đây là ca chập chờn «cookie null» ở
`vai-b-noi-day` mà nhật ký GSP2 đã ghi (chưa rõ nguyên nhân); không do GSP3. Ghi nợ N-VAI-B-NOI-DAY-CHAP-CHON.

Lượt 2 (chạy lại, không sửa gì):

```
✅ ①phiếu-tồn-tại docs/thi-cong/phieu/PHIEU-GSP3.md
✅ ②có-Base base=b0b82d7
— file đổi (12):
    docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
    docs/thi-cong/phieu/PHIEU-GSP3.md
    ops/bin/nghiem-thu/gsp3.sh
    src/products/chuyen-ban-sao.js
    src/products/san-pham-goc.js
    test/gsp3-doi-soat.test.mjs
    v3/chay-that.js
    v3/src/audit/hanh-dong.js
    v3/src/ui/san-pham/kho-goc.js
    v3/src/ui/san-pham/router.js
    v3/src/ui/san-pham/trang/san-pham.html
    v3/test/b/gsp3-doi-soat-man.test.mjs
✅ ④pathspec-⊆-③  
✅ ⑤vùng-cấm-src-phẳng 
✅ ⑥hết-marker đếm=0
✅ ⑦script-nghiệm-thu ops/bin/nghiem-thu/gsp3.sh rc=0 (log /tmp/chan1-ns-54715.log, đuôi:)
    ✅ ⑥cổng-cũ-ve8b rc=0
    ✅ ⑥cổng-cũ-va-r2 rc=1 — ĐỎ SẴN ở b0b82d7: 12 dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ §9, không do GSP3)
    ✅ ⑥cổng-cũ-l3-m4 rc=1 — ĐỎ SẴN ở b0b82d7: 33 dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ §9, không do GSP3)
    ✅ ⑥cổng-cũ-ll15d rc=0
    == ĐỎ 0 / XANH 32
✅ ⑧a-nhật-ký docs/thi-cong/nhat-ky/phieu-gsp3.md
✅ ⑧b-§10-sổ 
== ĐỎ 0 / XANH 8
rc=0
```

## Vòng 2 — vá hai CHẶN của đối kháng (F1 · F4) · 05/10/2026

Đầu vào: verdict `refute-gsp3-vong2.verdict.yaml` (chỉ CHẶN: F1 của reviewer + F4 tổng nâng) · kịch bản repro reviewer
`refute-gsp3.test.mjs` (K1, K2, K6 — chỉ đọc để dựng ca, KHÔNG đưa vào repo) · diff vòng 1 `176c823`. Không đụng F2/F3/F5/F6/F7 (đã có nợ
N-GSP3-NEN). Commit code vòng 2 **`5afd582`**, pathspec 7 tệp, đều trong ③ (`chay-that.js` · `san-pham-goc.js` · `hanh-dong.js` không cần
đổi: `doiSoat` của `chay-that.js` chuyển nguyên thân `t` xuống tầng A).

**Đính chính lời khai SAI ở mục «Nhánh test KHÔNG chạm» của vòng 1** («Hai quản trị bấm cùng một đơn vị một lúc: dựa vào `version` của
`saveProduct` và UNIQUE `(san_pham_id, duong)`»): `version` (xmin) chỉ khoá DÒNG MÓN, KHÔNG khoá tập bản sao / bảng của đơn vị. Vì vậy
khi đơn vị đổi giữa lúc mở khung và lúc bấm, máy chủ vẫn nhận `chon` cũ (F1). Vòng 2 vá bằng dấu đơn vị (dưới). Riêng hai lượt POST cùng
lúc trên CÙNG một đơn vị: đó là phép đo K7 của phản biện («không phá được»), không phải ca của thợ.

### Đo lại trước khi sửa (máy dev · hộp cát Postgres 127.0.0.1:5432 · HEAD `c17db8f`)

Kịch bản reviewer chạy trên code vòng 1 — cả ba lỗi dựng lại được:
- K1: người thấy 2 bảng `[[199],[249]]`, rồi page P3 (bảng 99) được gắn. POST `chon P1` ⇒ **THÀNH**: món = 19900, P3 bị đánh
  `giu_gia_mon`, `pageSangXong` gồm P1, P2, P3, bot P3 nhận 199, cửa tiền P3 ở 199 MỞ / ở 99 ĐÓNG.
- K2: P1 bị sửa 199→19 sau khi người đã xem. POST `chon P1` ⇒ **THÀNH**: món = 1900 (19 SAR), bot P2 nhận «19», cửa tiền P2 ở 19 MỞ.
- K6: cả ba lựa chọn (vắng / `giu_gia_mon` / `{P1}`) ⇒ `lech_tien_te`; P2 kẹt `cho_doi_soat`.
- `npm test` mốc trước (HEAD `c17db8f`): **2372 ca · 2368 đạt · 0 đỏ · 4 bỏ qua**.

### Đã sửa

- `src/products/chuyen-ban-sao.js`
  - **F1 · dấu đơn vị** `dauCuaDonVi(dv)`: sha256 (32 ký tự hex) trên `{goc, shop, mon: [ma, kyBang], page: [id], banSao chưa quyết:
    [id, pageId, kyBang]}`. `kyBang` là trọn hàng `goi_gia` dạng jsonb text, tức giá trị GỐC trong CSDL, không qua quy đổi.
    - `donViDoiSoat` trả `dauDonVi`. Phần thân tách thành `dungDonViRa` để POST trả lại được trọn đơn vị mới.
    - `doiSoatDonVi` đọc `dauDonVi` trong thân và tính lại dấu TRONG lượt, ngay trên dữ liệu kế hoạch ghi dùng. Thứ tự kiểm:
      `chua_ap_032` → `{daXong}` → dấu → các kiểm cũ. Thiếu dấu ⇒ 409 `thieu_dau_don_vi`; lệch ⇒ 409 `don_vi_da_doi`. Cả hai mang
      `duLieu.donVi` (đơn vị mới + dấu mới), 0 ghi, 0 đẩy. Không có đường «không dấu».
  - **F4 · tiền tệ** bỏ kiểm ③ trên MỌI bản sao chưa quyết. Giờ chỉ kiểm bảng SẼ GHI (bảng thắng ≠ giá món), ngay sau khi chọn được
    bảng thắng: sai tệ ⇒ 409 `lech_tien_te`, nêu page mang bảng đó.
    - Chưa chọn mà lệch ⇒ `lech_gia_giua_page`, đánh `tienTeSai` cho từng bảng (bảng ≠ giá món và sai tệ). Câu lỗi kể «bảng mang tiền
      tệ khác SAR, không chọn được: page …».
    - Bản sao THUA mang tệ sai ⇒ `giu_gia_mon` như mọi bản sao thua: câu UPDATE cuối vẫn đánh mọi bản sao chưa quyết, ngoài `chep`.
    - Bộ đọc đánh `banSao[].tienTeSai`.
- `v3/src/ui/san-pham/kho-goc.js` · `router.js`: chuyển `dauDonVi` từ thân POST xuống tầng A.
- `v3/src/ui/san-pham/trang/san-pham.html`:
  - POST mang `dauDonVi` của đơn vị đang vẽ.
  - 409 dấu ⇒ vẽ `duLieu.donVi`, XOÁ `chon`, cảnh báo «Đơn vị đã đổi trong lúc bạn xem — xem lại rồi chọn lại».
  - Lỗi khác (502 đẩy hỏng, 409 version…) mà tải lại thấy dấu mới ⇒ cũng xoá `chon` và báo như trên (CR1).
  - Option bảng sai tệ bị `disabled`, kèm chữ «sai tiền tệ (khác SAR), không chọn được». Lựa chọn còn trỏ vào nó thì bị bỏ (CR4).
  - Bảng duy nhất sai tệ ⇒ câu «sửa bản sao trước», tiêu đề «Chưa đối soát được…», nút tắt (CR3).

### Giả định và chọn lựa (khai ra)

1. **Dấu gồm tập PAGE của đơn vị**, không chỉ bản sao + bảng + giá món như reviewer đề nghị. Lý do: phiếu ② 10 «thấy danh sách page sẽ
   đổi giá trước khi bấm», và page chưa có bản sao cũng nằm trong danh sách đó. Giá phải trả: gắn một page rỗng trong lúc khung mở cũng
   bị 409 (màn vẽ lại, bấm lại). Có ca V2-K4 riêng.
2. **Không gồm `xmin` món** (reviewer đề nghị «kyBang/version món»). `docDanhMuc` upsert dòng `san_pham` mỗi lượt đồng bộ
   (`src/pos/doc-danh-muc.js:41`), nên xmin đổi ⇒ 409 giả. Giá món đã đi vào dấu qua `kyBang` của món.
3. **Không gồm ảnh**: ảnh không đổi tiền, và ảnh của lượt lùi được theo `nguon='kb'`.
   **Đã bỏ `market`** sau review CR5: đổi thị trường thì kiểm tiền tệ / `thi_truong_la` đã chặn mọi lượt ghi sai tệ, nên không đột biến
   nào đo được trường này.
4. **Dấu kiểm SAU `{daXong}`**: đơn vị đã xong thì POST cũ trả `{daXong:true}`, 0 ghi (bất biến lặp ④4 giữ nguyên), không trả 409.
5. **Hai mã riêng** `thieu_dau_don_vi` / `don_vi_da_doi`, để ca tách «thiếu» khỏi «lệch» (đột biến `duong_khong_dau` chỉ đỏ ở ca thiếu).
   Màn xử hai mã như nhau.
6. **Bảng sai tệ trùng giá món** không bị đánh `tienTeSai`: chọn nó là KHÔNG ghi. Luật này giống nhau ở máy chủ (`n.ky !== kyMon`) và ở
   màn (`!x.laGiaMon`).
7. **Ca cũ của tầng A** tự GET dấu ngay trước mỗi POST, như màn làm. Các ca V2-K* truyền dấu TƯỜNG MINH (cũ hoặc thiếu) để đo cửa sổ
   GET→POST.
8. **Cửa sổ còn lại** (CR2): từ lúc POST đọc đơn vị tới câu UPDATE đánh dấu (cỡ ms) không có khoá chung, vì `saveProduct` tự commit và
   `operations.js` cấm sửa.
   - Page gắn trong cửa sổ đó KHÔNG bị đánh dấu (vẫn `cho_doi_soat`, không thua ngầm).
   - Bảng bản sao bị sửa trong cửa sổ đó vẫn bị đánh theo bảng đã đọc.
   - Ghi nợ **N-GSP3-DAU-TOCTOU**; GSP3b khoá cửa sửa bản sao.

### `/code-review` (high) trên diff vòng 2 — 10 phát hiện, kiểm từng claim trước khi sửa

| # | Phát hiện | Kết luận | Làm gì |
|---|---|---|---|
| CR1 | lỗi khác ⇒ `taiDoiSoat` thay đơn vị + dấu mới nhưng GIỮ `chon` ⇒ lượt bấm sau mang dấu mới + chọn cũ lọt chốt F1 | ĐÚNG (dựng bằng ca màn 502 + đơn vị đổi) | dấu tải lại ≠ dấu lúc bấm ⇒ xoá `chon` + báo · ca «lỗi KHÁC» + đột biến `man_giu_chon_sau_loi_khac` |
| CR2 | TOCTOU trong một lượt POST | đúng (cửa sổ ms; khoá chung cần sửa `operations.js` — cấm) | nợ N-GSP3-DAU-TOCTOU (§9) |
| CR3 | bảng duy nhất sai tệ: kết cục «doi», nút bật dù chắc chắn 409 | ĐÚNG | kết cục `sai_te` ⇒ nút tắt + tiêu đề · ca «bảng DUY NHẤT» + đột biến `man_bat_nut_khi_sai_te` |
| CR4 | option sai tệ `disabled` mà vẫn `selected`, vẫn gửi | ĐÚNG | bỏ lựa chọn trỏ vào bảng sai tệ · assert trong ca «bảng mang tiền tệ sai» |
| CR5 | không ca/đột biến nào đo phần `page` / `market` của dấu | ĐÚNG | ca V2-K4 (page CHƯA có bản sao) + đột biến `dau_bo_page`; bỏ `market` (giả định 3) |
| CR6 | nhánh 409 dấu quét `dsViecChuyen` cả team | ghi nhận | không đổi: tổng verdict đòi «kèm đơn vị mới để màn vẽ lại»; cùng giá với một lượt GET, chỉ khi bị từ chối |
| CR7 | `bangKhacNhau[].tienTeSai` thừa | ĐÚNG | bỏ — màn đọc cờ trên từng bản sao |
| CR8 | hai đột biến `bo_so_dau_k1/k2` y hệt | ĐÚNG | gộp một đột biến; cột «ca phải đỏ» nhận `;` — chỉ tính bắt khi MỌI ca cùng đỏ một lượt |
| CR9 | gom `lechTe` duyệt lại `banSaoMon`; tên page viết lại | ĐÚNG | dùng `nhom.get(thang.ky).banSao` + `banSaoRa(b).tenPage` |
| CR10 | `loiCua` viết lại `assert.rejects`; helper GET trước mỗi POST | ghi nhận | giữ: cần đối tượng lỗi để đọc `duLieu.donVi.dauDonVi` cho lượt bấm lại; GET-trước-POST là đường màn thật, ca V2-K* đo cửa sổ riêng |

Đảo-vá đo bản SAU khi vá review (gate lượt 2): 29/29 đột biến bị bắt.

### Nghiệm thu vòng 2 (máy dev · hộp cát Postgres 127.0.0.1:5432 · không đo prod)

- Bộ ca: `test/gsp3-doi-soat.test.mjs` **28/28** (+8: V2-K0 · K1 · K2 · K3 · K4 · K6c · K6 · K6b) và `v3/test/b/gsp3-doi-soat-man.test.mjs`
  **9/9** (+4: đơn vị đổi · bảng sai tệ · bảng DUY NHẤT sai tệ · lỗi KHÁC + đơn vị đổi).
- `ops/bin/nghiem-thu/gsp3.sh`, lượt 2, sau khi vá review: **ĐỎ 1 / XANH 42**.
  - ① pass=37 fail=0 (sàn nâng 25 → 37) · ② 35/35 phép có ca xanh · ③ ba tệp cấm sửa nguyên so với `b0b82d7`.
  - ④ lượt chứng 37/0. **29/29 đột biến bắt đúng ca**; 11 đột biến mới:
    - F1: `bo_so_dau` ⇒ V2-K1 + V2-K2 CÙNG đỏ · `duong_khong_dau` ⇒ V2-K0 · `dau_bo_bang_mon` ⇒ V2-K3 · `dau_bo_page` ⇒ V2-K4 ·
      `router_bo_dau` ⇒ cửa thật.
    - F4: `kiem_te_ca_ban_sao_thua` (bản vòng 1) ⇒ V2-K6 · `bo_kiem_te_bang_thang` ⇒ V2-K6c.
    - Màn: `man_khong_gui_dau` · `man_giu_chon_khi_doi` · `man_giu_chon_sau_loi_khac` · `man_bat_nut_khi_sai_te`.
  - Cây chung không dính đột biến; ⑤ LL15d 4/4 + 5/5.
  - ⑥ `gsp2` · `ve8b` · `ll15d` rc=0. `va-r2` / `l3-m4` ĐỎ SẴN (12 / 33 dòng giống hệt base, nợ N-GSP3-CONG-CU-DO).
  - **Đỏ duy nhất: ⑥`gsp1`**, sâu trong chuỗi `gsp1 → ve1 → ll18 → ll3`. Chạy riêng: `ll3.sh` rc=0 7/7 · `gsp1.sh` rc=0 14/14. Không do
    GSP3; cùng họ chập chờn của N-VAI-B-NOI-DAY-CHAP-CHON.
- Lượt 1 (trước review) ĐỎ 2 / XANH 39:
  - Đột biến `bo_kiem_vai` không áp được: tôi chèn một dòng chú thích giữa hai dòng neo ở `kho-goc.js`, nên thước cũ hết khớp. Đã neo lại
    theo dòng chú thích, thước SỬA chứ không phải code sai.
  - ⑥`ll15d` đỏ ở `vai-b-noi-day.test.mjs fail=1`. Chạy riêng tệp đó 5/5 xanh, `ll15d.sh` riêng rc=0 21/21 — tái diễn
    N-VAI-B-NOI-DAY-CHAP-CHON.
- **Đột biến nào KHÔNG đỏ**: 0/29. Chỗ thước chưa đo:
  - phần `goc` / `shop` của dấu (muối nhận diện; mọi lệch thật đã đi qua `mon` / `page` / `banSao`);
  - cửa sổ ms trong một lượt POST (nợ CR2);
  - nhánh màn «bỏ lựa chọn trỏ bảng sai tệ» chỉ có assert, không có đột biến.
- `npm test`: mốc trước **2372 · 2368 · 0 · 4** (`c17db8f`) → sau **2384 ca · 2380 đạt · 0 đỏ · 4 bỏ qua** (+12 = 8 A + 4 B, 0 đỏ mới).
  Trước lượt sạch có hai lượt bị nhiễu, cả hai ở tệp GSP3 không chạm:
  - lượt 1: 1 đỏ «Unable to deserialize cloned data» (lỗi IPC của test runner) ở `test/l2-m3-rap-prompt.test.js`; tệp đó chạy riêng
    3 × 6/6;
  - lượt 2: treo 10′ ở `v3/test/b/ve7c-model.test.mjs`, tôi dừng; tệp đó chạy riêng 3 × 9/9 (~7,7 s).
- Repro K1/K2/K6 trên code mới = ca V2-K1 / V2-K2 / V2-K6 (dựng lại trong bộ ca, có dấu).
  - K1 ⇒ 409 `don_vi_da_doi`, đơn vị mới mang bảng 99, 0 ghi, A3 vẫn `cho_doi_soat`, cửa tiền A3 đóng. Bấm lại với dấu mới ⇒ thành.
  - K2 ⇒ 409, 0 ghi, món không nhận 19.
  - K6 ⇒ chưa chọn: 409 nêu bảng sai. Chọn SAR ⇒ thành, «AED» `giu_gia_mon`, Fox 2 rời danh sách.
- `.env` máy này: `PANCAKE_READONLY=1` (đếm 1 dòng). Không push, không deploy, không SSH.

### Ngoài phạm vi ⇒ §9 (APPEND cùng lượt)

N-GSP3-DAU-TOCTOU (CR2).

### `_chan1.sh gsp3` (vòng 2, HEAD `5afd582`)

```
✅ ①phiếu-tồn-tại docs/thi-cong/phieu/PHIEU-GSP3.md
✅ ②có-Base base=b0b82d7
— file đổi (13):
    docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
    docs/thi-cong/nhat-ky/phieu-gsp3.md
    docs/thi-cong/phieu/PHIEU-GSP3.md
    ops/bin/nghiem-thu/gsp3.sh
    src/products/chuyen-ban-sao.js
    src/products/san-pham-goc.js
    test/gsp3-doi-soat.test.mjs
    v3/chay-that.js
    v3/src/audit/hanh-dong.js
    v3/src/ui/san-pham/kho-goc.js
    v3/src/ui/san-pham/router.js
    v3/src/ui/san-pham/trang/san-pham.html
    v3/test/b/gsp3-doi-soat-man.test.mjs
✅ ④pathspec-⊆-③  
✅ ⑤vùng-cấm-src-phẳng 
✅ ⑥hết-marker đếm=0
✅ ⑦script-nghiệm-thu ops/bin/nghiem-thu/gsp3.sh rc=0 (log /tmp/chan1-ns-61829.log, đuôi:)
    ✅ ⑥cổng-cũ-ve8b rc=0
    ✅ ⑥cổng-cũ-va-r2 rc=1 — ĐỎ SẴN ở b0b82d7: 12 dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ §9, không do GSP3)
    ✅ ⑥cổng-cũ-l3-m4 rc=1 — ĐỎ SẴN ở b0b82d7: 33 dòng đỏ giống hệt base, 0 dòng đỏ mới (nợ §9, không do GSP3)
    ✅ ⑥cổng-cũ-ll15d rc=0
    == ĐỎ 0 / XANH 43
✅ ⑧a-nhật-ký docs/thi-cong/nhat-ky/phieu-gsp3.md
✅ ⑧b-§10-sổ 
== ĐỎ 0 / XANH 8
rc=0
```
