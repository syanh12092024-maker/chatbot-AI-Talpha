# Nhật ký phiếu TT1b — ràng tệ của bậc giá và của đơn với tệ của thị trường shop (đối kháng TT1 F1)

**Thợ:** agent thợ thi công 07/10/2026, worktree riêng `.claude/worktrees/agent-a90940e80a447e6c5`, nhánh `worktree-agent-a90940e80a447e6c5`.
**Base:** `b04d0dc`. HEAD lúc nhận: `6e9f373` (worktree tạo ở commit cũ `0c6c1ed`, cây sạch, tôi đã `reset --hard 6e9f373`).
**Làn:** 🟥 đường tiền. **Skill:** `tho-thi-cong` · `viet-thuoc`, sau cùng `/code-review` (high).
**Môi trường của mọi số đo dưới đây:** MÁY DEV, Postgres 127.0.0.1:5432, hộp cát tự dựng/tự dọn:
- bộ ca: `aicloser_v3_test_tt1b_p<pid>`;
- cổng: `aicloser_v3_nt_tt1b_p$$`.

KHÔNG đo `aicloser_v3` dev, KHÔNG đo prod. POS là bản giả, đếm riêng GET và POST, 0 byte ra mạng.
Đo trước khi sửa: chạy trên bản sao `git archive 6e9f373`, đặt ở scratchpad `tt1b/base`.

## ⑦ ĐÃ TRA CHƯA (output máy)

```
$ awk '/^## §9 /,/^## §9b/' docs/thi-cong/SO-DIEU-HANH-THI-CONG.md | grep -n "N-TT1-TE-LECH-THI-TRUONG\|N-TIEN-TE-MAC-DINH"
1043:  - **N-TIEN-TE-MAC-DINH** bậc giá đầu của thị trường chưa có giá: ô tiền tệ để trống, người gõ — chưa có nguồn «shop → tiền tệ».
1224:  - **N-TT1-TE-LECH-THI-TRUONG** (/code-review TT1 #2) `saveProduct` chỉ kiểm tệ ∈ `HE_SO_TE`, không đối chiếu tệ thị trường của shop
1226:    N-TIEN-TE-MAC-DINH (ô tiền tệ gõ tay) — sửa chung: ô tệ mặc định + khoá theo shop ở màn «Theo thị trường».
1279:  - **N-TT1-TE-LECH-THI-TRUONG** NÂNG: không chỉ «lưu được» — bot lấy tệ đơn từ chính bậc (`draft.js:34`) nên `cua2Tien` KHÔNG BAO GIỜ đóng; POS
```

Quan hệ với nợ cũ:
- Phiếu này TRẢ N-TT1-TE-LECH-THI-TRUONG. Phần mã của N-TIEN-TE-MAC-DINH (tệ theo shop) đã có chặn ở máy chủ; phần giao diện (ô tệ mặc định + khoá) vẫn còn nợ.
- Không có `docs/thi-cong/SO-NO.md` và không có `ops/bin/tra_no.py`.
- Không thấy trùng nợ nào khác, nên không phải báo tổng trước khi code.

## Bước 3 — đo lại nguyên liệu đề bài (cây base `6e9f373`)

| Phiếu ① khai | Đo lại | Kết luận |
| --- | --- | --- |
| `saveProduct` chỉ kiểm `tien_te ∈ HE_SO_TE` | `operations.js` vòng kiểm `!Object.hasOwn(HE_SO_TE, g.tien_te)`; không chỗ nào đọc `ket_noi_pos` | ĐÚNG |
| bot lấy tệ đơn từ bậc | `src/orders/draft.js:34` `currency: price.tienTe` | ĐÚNG |
| `cua2Tien` so tệ đơn ↔ tệ bậc | `src/orders/hang-cho.js:220-273` (`lech_bang_gia`) | ĐÚNG — luôn khớp |
| `taoDon` cửa (b) chỉ kiểm tệ có hệ số | `phiVanChuyenMinor` trả `null` khi tệ lạ; `market` có sẵn nhưng chỉ dùng cho `layKetNoi` | ĐÚNG |
| GSP3 miễn soát giá món | `chuyen-ban-sao.js` `n.ky !== kyMon && teSai(...)` (base :599) | ĐÚNG |
| market đến từ page | `hang-cho.js:834-842`: `duLieu.market \|\| traMarketCuaPage(pos_shop_id)` (có lọc `bat`) | ĐÚNG |
| ghiChan đi trên pool gốc | `duyet` truyền `poolNhatKy: deps.poolNhatKy \|\| pool` | ĐÚNG — dòng chặn sống qua ROLLBACK |
| đơn page kb vốn bị chặn ở `san_pham_ma` | `tachMaBienThe('kb:…')` ⇒ shop `kb` không phải số ⇒ `null` | ĐÚNG |
| router hộp thư trả `e.message` | `v3/src/ui/hop-thu/router.js:115-120`: không `status`/`code` ⇒ 400 + `thongDiep = e.message` | ĐÚNG |

**Repro F1 chạy lại trên base** (ca R1/T1/T5 của bộ ca mới): bậc USD trên shop Taiwan lưu được; đơn USD qua `duyet` ra 1 POST; HTTP duyệt trả 200.

**Giả định, ghi rõ:**
- Không đo lại prod (cấm SSH/ghi; phiếu đã đo chỉ-đọc ngày 07/10: 24 kết nối, mọi market ∈ bảng, 154 bậc đều là món `kb`).
- Lượt đo lúc mở van thuộc ⑦b của tổng.

**Ngày/giờ:** luật mới không có phép tính nào dựa vào ngày hay giờ. Vì vậy không chạy hai múi giờ (bẫy #1/#21 không áp).

## Danh sách ca (viết TRƯỚC — `test/tt1b-te-thi-truong.test.mjs`)

| Ca | Nhóm | Kịch bản |
| --- | --- | --- |
| B1 | bảng | `pos.TIEN_TE_THI_TRUONG === chuyenBanSao.TIEN_TE_THI_TRUONG`; 12 khoá y TT1; frozen; mọi tệ ∈ `HE_SO_TE` |
| S1 ×2 đường | CHẶN | Taiwan «USD» 990 · Europe «TWD» 49 · bậc 2 sai tệ sau bậc 1 đúng ⇒ 400 đúng khuôn câu, 0 ghi, phiên bản không đổi |
| S2 ×2 | CHO-QUA | Europe 49,99 EUR ⇒ 4999 · Taiwan 990 TWD ⇒ 990 · Saudi 99 SAR ⇒ 9900 |
| S3 ×2 | CHO-QUA | món `kb` mang USD / EUR ⇒ lưu như cũ |
| S4 | CHẶN | shop 777 không có kết nối ⇒ 400; mã món POS không mang shop ⇒ 400 |
| S5 | BIÊN | cùng shop 111 ở hai team, chỉ team A có kết nối ⇒ B 400, A lưu |
| S6 | BIÊN | kết nối Kuwait `bat=false` ⇒ KWD lưu được; SAR bị chặn |
| S7 | CHẶN | kết nối «Japan» (ngoài bảng) ⇒ 400 |
| S8 | CHO-QUA | (sau /code-review #3) offers rỗng của món shop mất kết nối ⇒ gỡ được bậc USD cũ; gửi bậc thì vẫn 400 |
| S9 | BIÊN | (sau #1) kết nối «Qatar » dính khoảng trắng ⇒ QAR lưu, SAR 400 «shop Qatar bán bằng QAR» |
| R1 | HÀNH VI | repro F1 trọn đường: lưu chỉ-giá → `rapKb` → `chuanBiDon` → `vaoHangCho` → `luuDonCho` → `duyetDonCho` → `taoDon` — chặn ngay ở lưu giá |
| R2 | HÀNH VI | cùng đường, đúng tệ: Taiwan 990 TWD ⇒ bot «990 TWD», 1 POST `/shops/219/orders` shipping_fee 990; Europe 49,99 ⇒ 4999 |
| T1 | CHẶN | hàng chờ dựng thẳng, bậc USD chèn thẳng `goi_gia` trên shop Taiwan ⇒ `duyet`: 0 POST; nhật ký đúng một dòng «cửa (b) chặn: lech_te_thi_truong: đơn USD ≠ Taiwan TWD»; lỗi có tên, `thieu=['lech_te_thi_truong']`; câu nêu hai tệ + thị trường + «báo marketer sửa bậc giá ở Sản phẩm › Theo thị trường», không có «boSung»; hàng chờ `cho_duyet` |
| T2 | CHẶN | Japan (ngoài bảng), đơn JPY ⇒ chặn, 0 POST, nhật ký «… ≠ Japan (ngoài bảng)» |
| T3 | CHO-QUA | Taiwan đơn TWD (cùng env) ⇒ 1 POST, shipping_fee 990, 0 dòng chặn |
| T3b | CHO-QUA | (sau #1) market «Qatar », đơn QAR ⇒ 1 POST 15900 |
| T4 | VỊ TRÍ (④2b) | món Europe 201 trên page Taiwan + tệ USD ⇒ `thieu=['shop_lech']`, nhật ký «san_pham_ma shop=201 ≠ kết nối shop=219» |
| T5 | HÀNH VI HTTP (④2c) | sale đăng nhập thật, `POST /api/hop-thu/don/:id/duyet` ⇒ 400, `thongDiep` nêu USD/TWD/Taiwan/«báo marketer sửa bậc», 0 POST, `cho_duyet` |

**Nhánh KHÔNG chạm:**
- màn trình duyệt `san-pham.html` (ô tệ vẫn gõ tay — phần giao diện của N-TIEN-TE-MAC-DINH);
- đường ghi giá `doc-danh-muc.js:225-255`, vì không chạy hôm nay (⑥ phiếu).

## ĐỎ trên base (bản sao `6e9f373` + đúng tệp ca/cổng mới)

- Bộ ca (bản 19 ca trước /code-review): **pass 7 / fail 12**.
  - Đỏ: B1 · S1×2 · S4 · S5 · S6 (vế SAR) · S7 · R1 · T1 · T2 · T5.
  - Xanh: CHO-QUA S2×2 · S3×2 · R2 · T3 · T4.
- Cổng `tt1b.sh` (BO_CONG_CU=1), rc=1:
  - P1a/P1c `tw_usd=NHAN eu_twd=NHAN hon_hop=NHAN ghi_moi=3 doi_phien_ban=2`.
  - P2a `post=1 loi=KHONG … hang_cho=da_duyet` · P2b `post=1` · P2e `status=200 post=1`.
  - P4 `khong_ket_noi=NHAN hai_team=B:NHAN … ghi_khi_chan=3`.
  - P5 `cung_doi_tuong=0`.
  - CHO-QUA P1b/P1d/P2c/P2d/P3 xanh, nghĩa là thước không «chặn tất».

## Thay đổi (commit `79df30c`) — mỗi chỗ một lý do

- **`src/pos/tao-don.js`**
  - `TIEN_TE_THI_TRUONG` dời về đây, cạnh `HE_SO_TE`. Nội dung giữ nguyên từng ký tự, nên các neo đột biến của `gsp3.sh`/`tt1.sh` vẫn khớp đúng 1 lần.
  - **`teCuaThiTruong(market)`**: MỘT luật tra bảng.
    - Gọt khoảng trắng hai đầu, cùng luật GSP3 `TIEN_TE_THI_TRUONG[String(market).trim()]`.
    - Tra `Object.hasOwn`; không gập hoa/thường. Ngoài bảng ⇒ `null`.
  - `taoDon` cửa (b) thêm khối «CỬA (b) · TT1b», đặt SAU kiểm `shop_lech` và TRƯỚC `dungPayload`.
    - Điều kiện chặn: `teDon (đã viết hoa) !== teCuaThiTruong(market)`.
    - Khi chặn: `ghiChan(cua "b", "lech_te_thi_truong: đơn X ≠ M Y|(ngoài bảng)")`, rồi ném `LoiThieuThamChieuSanPham` với `thieu=['lech_te_thi_truong']`.
    - Câu lỗi nêu hai tệ, shop và thị trường. Câu dặn «báo marketer sửa bậc giá ở Sản phẩm › Theo thị trường» (ca ngoài bảng thì dặn «báo kỹ thuật thêm thị trường»).
    - Không dùng lời «Sale bổ sung qua boSung», vì `don-cho.js:88` không cho sale sửa tệ.
    - Khối chỉ dùng `bienThe.shopId`, không dùng `ketNoi`, nên dời được nguyên khối (đột biến `dat_truoc_shop_lech`).
  - Khối chú thích đầu tệp, mục (b), thêm hai dòng TT1b.
- **`src/pos/index.js`** — xuất `TIEN_TE_THI_TRUONG` và `teCuaThiTruong`.
- **`src/products/chuyen-ban-sao.js`**
  - Dòng import đầu tệp thêm `TIEN_TE_THI_TRUONG`.
  - Khối khai `:290-297` thay bằng chú thích + `export { TIEN_TE_THI_TRUONG };`. Nơi gọi cũ không đổi.
  - Chiều import chỉ một: chuyen-ban-sao → tao-don. Tệp tao-don.js không import ngược.
- **`src/admin-v3/operations.js`**
  - Hàm `kiemTeThiTruong(c, teamId, p, offers)` đặt ngay trên `saveProduct`, chỉ `saveProduct` gọi.
  - Gọi trong giao dịch, sau 409 phiên bản, TRƯỚC mọi câu ghi, cho món `p.nguon === "pos"`, cả đường đầy đủ lẫn chỉ-giá.
  - Trình tự trong hàm:
    1. offers rỗng ⇒ cho qua (#3);
    2. shop = phần trước dấu `:` đầu tiên, đúng `split_part(ma, ':', 1)` (#4);
    3. tra `SELECT market FROM ket_noi_pos WHERE team_id=$1 AND shop_id=$2` — không lọc `bat`, theo CẶP (team, shop);
    4. `teCuaThiTruong`;
    5. soát MỌI bậc.
  - Câu 400:
    - lệch tệ: «Bậc giá dùng X nhưng shop M bán bằng Y — nhập giá bằng Y (hệ không quy đổi tiền tệ)». X là khoá `HE_SO_TE` đã qua vòng kiểm; M đã gọt.
    - không kết nối: «Món POS của shop S chưa có kết nối POS trong team này …»;
    - ngoài bảng: «Shop S nối thị trường "…" chưa có trong bảng tiền tệ …» (JSON, cắt 40 ký tự);
    - mã không có `:`: «Món POS #id không mang mã shop …».
  - Món `kb` không qua hàm này.
- **`test/tt1-tien-te-ngoai-gcc.test.mjs`** — CHỈ sửa chú thích ca T6 (② 4): lời cũ «chỉ cửa tiền ĐÓNG khi tệ đơn ≠ tệ bậc» SAI; nay chặn ở `saveProduct` + `taoDon`.
- **Sáu tệp ca + `l3-m4.sh`** (C1 review (a)) — CHỈ fixture, không đổi assert:
  - `l3-m4-duyet` `GiaLapDuyet` → `UAE`;
  - `va-r2` `GiaLapVaR2` → `UAE`;
  - `ll2` `'LL2'` → `'UAE'`;
  - `frontend-v3-e2e` `'E2E'` → `'UAE'` (cả ket_noi_pos lẫn `docDanhMuc({ shop })`);
  - `l3-m4.sh` `GiaLapGate` → `UAE`;
  - `mn3`/`mn4`: dòng `kb:…` thêm `nguon='kb'`.
  - Tất cả fixture đều AED ⇒ UAE.
- **`gsp3.sh` · `tt1.sh`** (C2) — CHỈ đổi tệp đích:
  - `doan_japan` / `bo_romania` → `src/pos/tao-don.js`;
  - `gsp3.sh` thêm tao-don.js vào vòng chép `.goc` và `DS_TEP_DOT`;
  - đáp án đỏ giữ nguyên.
- **Nới ③ (tổng duyệt 07/10)** — `docs/thi-cong/nhat-ky/refute-tong-the-1.repro.mjs:33` `MARKET "GiaLapRefute1"` → `"UAE"`, không đổi gì khác. Lý do + đo ở mục «Nới ③».
- **`test/tt1b-te-thi-truong.test.mjs`** (mới, 22 ca) · **`ops/bin/nghiem-thu/tt1b.sh`** (mới).

C1 đo lại đúng như review (a): sau bản vá, trước khi sửa fixture, sáu tệp ca ra **62 ca · 39 pass · 23 fail**. Sau khi sửa fixture, sáu tệp + gsp3-doi-soat + he-so-te ra **95/0**.

## Nới ③ — repro `refute-tong-the-1.repro.mjs` (dừng · báo tổng · tổng gật)

Lượt cổng đầy đủ đầu tiên đỏ: `tt1.sh` ⑧ → `gsp3.sh` ⑥ → `va-r2.sh` ③RF-11 ④RF-12 «khối F6/F4 không thấy trong log repro».

Nguyên nhân: repro dùng `MARKET = "GiaLapRefute1"`, mà cửa (b) mới chặn thị trường ngoài bảng. Repro ném `LoiThieuThamChieuSanPham` ở khối F3b nên các khối sau không in ra.

| | rc | khối in ra | 🔴 |
| --- | --- | --- | --- |
| base `6e9f373` | 0 | F1 F2 F3a F3b F4 F5 F6 | 0 |
| vá, trước nới | 1 | F1 F2 F3a F3b (ném ở F3b) | — |
| vá + `MARKET="UAE"` | 0 | F1…F6 | 0 · `diff` với base (bỏ số ≥4 chữ số) = **giống hết** |

Sau nới, chạy riêng `va-r2.sh`: ③RF-11 = 0 🔴 ✔ · ④RF-12 = 0 🔴 ✔. Vẫn còn 1 ✘ «bộ ca VA-R2 (8 ca) thật=pass=11 · chờ=pass=8»; đây là nợ cũ N-GSP3-CONG-CU-DO, đỏ sẵn ở base.

Quét tĩnh toàn bộ `ops/bin/nghiem-thu/*.sh` · `docs/**/*.mjs` · `test/` · `v3/test/` tìm chỗ có `ket_noi_pos` + `taoDon`/`saveProduct`/`duyet(`: ngoài ③ chỉ có repro này.

## /code-review (high, trên diff chưa commit) — 8 phát hiện: sửa 4 · bác 4 kèm nợ

Tổng duyệt tất cả các quyết định dưới đây.

| # | Phát hiện | Kiểm chứng | Xử |
| --- | --- | --- | --- |
| 1 | ba nơi đọc bảng tra khác nhau: GSP3 gọt khoảng trắng, `saveProduct`/`taoDon` không gọt ⇒ «Taiwan » GSP3 chép được nhưng lưu giá/tạo đơn chặn | đọc `chuyen-ban-sao.js` `TIEN_TE_THI_TRUONG[String(market).trim()]`; `themKetNoi` gọt (`chuoiGon`), đường di trú thì không chắc | **SỬA**: `teCuaThiTruong` (gọt) cho cả hai nơi mới; GSP3 giữ trim nội tuyến (③: chuyen-ban-sao CHỈ đổi khối bảng) — cùng luật. Ca S9 · T3b · P2f · P4 `trim` · đột biến `bo_trim` |
| 2 | thành ngữ tra bảng chép ba chỗ | như #1 | **SỬA** cùng #1 |
| 3 | offers rỗng vẫn bị chặn khi shop mất kết nối ⇒ không gỡ được bậc sai | dựng được: món 778 có bậc USD, offers [] ⇒ 400 trước sửa | **SỬA**: offers rỗng cho qua — **lệch nhẹ ② 3** («không tìm được kết nối ⇒ 400» nay chỉ khi có bậc gửi lên); tổng duyệt. Ca S8 · P4 `xoa_het` · đột biến `xoa_het_bi_chan` |
| 4 | tách shop bằng `/^(\d+):/`, khác `split_part` của các nơi đọc khác — và chú thích của chính tôi khai «khuôn split_part» (lời khai sai — bẫy #3) | đọc `san-pham-goc.js:310,381,775` · `chuyen-ban-sao.js` `split_part(s.ma, ':', 1)` | **SỬA**: phần trước dấu `:` đầu tiên; không có `:` ⇒ 400 «không mang mã shop» |
| 5 | chặn ở `taoDon` ⇒ `duyet` ROLLBACK, lý do không vào hàng chờ | đúng (`hang-cho.js` catch ⇒ ROLLBACK); nhật ký `pos_tao_don_bi_chan` còn | **BÁC** (② 2 đặt chặn ở taoDon; ⑥ đã ghi nợ G1) ⇒ §9 N-TT1B-LY-DO-CHAN-ROLLBACK |
| 6 | bản sao `kb` không được soát ⇒ bot vẫn báo sai tệ cho page chưa gắn | đúng; đơn không tới POS (mã kb chặn ở `san_pham_ma`) — chỉ khách nghe sai | **BÁC** (② 3: «kb GIỮ NGUYÊN — GSP4 cắt»); sửa câu docstring «chặn TRƯỚC khi bot nói» cho đúng tầm (chỉ món POS) ⇒ §9 N-TT1B-BAN-SAO-KB-TE |
| 7 | đọc thẳng `ket_noi_pos` ngoài `src/pos/ket-noi.js` (schema 002 dặn) | lời dặn ở `db/schema.sql:431-435` là về `SELECT *` lộ khoá; câu mới chỉ lấy `market`; tiền lệ `docDonViTho` · `traMarketCuaPage` · `san-pham-goc.js` | **BÁC** (ket-noi.js ngoài ③) ⇒ §9 N-TT1B-DOC-KET-NOI-THANG |
| 8 | `themKetNoi` nhận tên thị trường tự do ⇒ shop tên lạ bị khoá cả giá lẫn đơn, chỉ lộ lúc dùng | đúng — ⑥ phiếu G3 | **BÁC** ⇒ §9 N-TT1B-KET-NOI-TEN-TU-DO |

Bản vá #1–#4 là code mới (bẫy #26). Đảo-vá đo lại trên bản SAU vá; xem mục dưới, hai đột biến mới `bo_trim` và `xoa_het_bi_chan` đều đỏ đúng.

## Đảo-vá — `tt1b.sh` ⑥ trên bản sao tạm, mỗi đột biến một tiến trình node mới + CSDL dựng lại

Mỗi đột biến phải làm lệch ĐÚNG các phép đã khai; các phép khác phải giữ nguyên; và bộ ca TT1b phải có ca đỏ.

| Đột biến | Phép phải lệch | Bộ ca đỏ |
| --- | --- | --- |
| `bo_chan_luu` (④6) | P1a P1c P4 | 10 |
| `bo_chan_tao_don` (④6) | P2a P2b P2e | 4 |
| `cho_qua_ngoai_bang` (④6) | P2b | 2 |
| `chan_ca_kb` (④6) | P3 | 3 |
| `loc_bat` | P4 | 2 |
| `shop_tron` (shop_id trơn + LIMIT 1) | P4 | 2 |
| `chi_bac_dau` | P1a P1c | 3 |
| `dat_truoc_shop_lech` (dời khối lên trước `layKetNoi`) | P2d | 2 |
| `chep_bang_thu_hai` | P5 | 1 |
| `bo_trim` (sau /code-review) | P2f P4 | 3 |
| `xoa_het_bi_chan` (sau /code-review) | P4 | 2 |

Kết quả đo bản sau vá: **11/11 đỏ đúng**, phép khác lệch theo = 0. Lượt khôi phục: 0 phép lệch. Băm 3 tệp đột biến ở cây làm việc trước = sau.

**Đột biến nào KHÔNG đỏ (biết trước, không có phép):**
- (a) bỏ `.toUpperCase()` ở `teDon` của `taoDon` — mọi đơn trong ca đều mang tệ viết hoa (bậc chỉ nhận khoá hoa của `HE_SO_TE`), nên đột biến sống. Hôm nay đường bot/sale không sinh tệ thường.
- (b) đổi luật tách shop về `/^(\d+):/` — dữ liệu ca đều là shop số.
- (c) nhánh ném «không mang mã shop» có ca S4 trong bộ ca, nhưng cổng không có phép riêng.

Lượt cổng nhanh đầu tiên, thước đỏ vì `ban_bang` đếm cả `*.goc` trong bản sao tạm (P5 «lệch theo» ở mọi đột biến). Đây là lỗi của THƯỚC, không phải của mã. Đã sửa bằng `--exclude='*.goc'`, và chú thích ghi rõ lý do.

## Cổng — kết quả cuối (máy dev, worktree `79df30c`)

Lượt cuối `tt1b.sh` (CHAY_NPM_TEST=1, `cong-day-du-3`, HEAD `79df30c`, 11:05→12:04): **PHÉP=42 LỖI=1 · rc=1**. Lỗi duy nhất là `tt1` TREO
2700 s trong lượt lồng (tt1 → gsp3b → gsp3 → …) — chạy riêng ở dưới: **rc=0**.

```
① P1a/P1b/P1c/P1d ✔   ② P2a/P2b/P2c/P2d/P2e/P2f ✔   ③ P3 ✔   ④ P4 ✔   ⑤ P5 ✔ · bộ ca TT1 pass=11 fail=0 · T0b xanh
⑥ đảo-vá 11/11 đỏ đúng · khôi phục 0 lệch · băm cây trước = sau
⑦ bộ ca TT1b pass=22 fail=0 (sàn ≥22)
   lưới gần he-so-te 5/0 · gsp3-doi-soat 28/0 · l3-m4-duyet 19/0 · va-r2 11/0 · ll2 7/0 · frontend-v3-e2e 8/0 · mn3 10/0 · mn4 7/0
```

**Cổng cũ ④7 — rc tách dòng:**

| Cổng | Lượt `tt1b.sh` ⑦ | Chạy riêng | Kết luận |
| --- | --- | --- | --- |
| `tt1.sh` | TREO 2700 s (giết cả cây). Trong lượt đó gsp3b đỏ «②phép-④-có-ca-xanh 39/42 · thiếu K2 K3 K4» | lượt riêng 1 (12:05→13:01): rc=1, PHÉP=27 LỖI=1. Đỏ duy nhất: `gsp3` ← gsp1 ← ve8a ← ve7a ← ve2b ← `v3/test/b/ll18-khung.test.mjs fail=1`. Lượt riêng 2 (13:02→13:40): **rc=0, PHÉP=27 LỖI=0** — gsp2 ✔ · gsp3 ✔ · gsp3b ✔ · ve8b ✔ · va-r2 đỏ sẵn ở da50df6 (12 dòng giống hệt, 0 mới) | **rc=0**. Hai đỏ kia là chập chờn khi chạy lồng sâu: `ll18-khung` chạy riêng 16/16 (nợ cũ N-THUOC-CHAP-CHON); `gsp3b-khoa-cho` K1–K5 chạy riêng 6/6 |
| `gsp3.sh` | rc=0 | — (rc=0 cả trong tt1 lượt 3 và lượt riêng 2) | rc=0 |
| `l3-m4.sh` | rc=1 — đỏ sẵn ở b04d0dc: 33 dòng giống hệt, 0 dòng mới | — | nợ cũ N-GSP3-CONG-CU-DO |
| `va-r2.sh` | rc=1 — đỏ sẵn ở b04d0dc: 12 dòng giống hệt, 0 dòng mới. Chạy riêng sau nới ③: ③RF-11 ④RF-12 xanh, còn 1 ✘ «8 ca» | — | nợ cũ N-GSP3-CONG-CU-DO |
| `ll2.sh` | rc=0 | — | rc=0 |

**`npm test`** (luật 6 — lượt chạy khi máy chỉ có GP1 song song):

| | tests | pass | fail | skip |
| --- | --- | --- | --- | --- |
| base `6e9f373` (bản sao) | 2563 | 2541 | 0 | 22 |
| sau `79df30c` | 2585 | 2563 | 0 | 22 |

Chênh +22 ca, đúng bằng 22 ca của tệp mới; không thêm ca đỏ.

## Lệch phiếu — nói thẳng

1. **② 3 — offers rỗng cho qua.** Khi không gửi bậc nào thì không kiểm kết nối (/code-review #3, tổng duyệt). Ca S8.
2. **② 2/3 — tra bảng qua `teCuaThiTruong` có gọt khoảng trắng.** Phiếu viết `TIEN_TE_THI_TRUONG[market]` trần. Chọn gọt để một luật với GSP3. Giá phải trả: «Taiwan » được coi là Taiwan (tệ đúng của shop đó; không nới tập tên hợp lệ ngoài khoảng trắng).
3. **③ operations.js «CHỈ saveProduct».** Thêm một hàm riêng `kiemTeThiTruong` ngay trên `saveProduct`, chỉ `saveProduct` gọi. Không đụng `setPage` (GL2).
4. **③ chuyen-ban-sao «CHỈ thay khối khai».** Đổi thêm dòng import đầu tệp (phần «import» của «import + re-export»). Đối soát không đổi một ký tự logic.
5. **`src/pos/index.js`** xuất thêm `teCuaThiTruong`, ngoài `TIEN_TE_THI_TRUONG`.
6. **`tt1b.sh` có `BO_CONG_CU=1`.** Đây là lượt soi nhanh của thợ: phép ⑦ khi đó tính TRƯỢT, rc không bao giờ =0. `ban_bang` bỏ `*.goc`.
7. **Nới ③ repro** — tổng duyệt.

## Ngoài phạm vi ⇒ §9

N-TT1B-LY-DO-CHAN-ROLLBACK · N-TT1B-BAN-SAO-KB-TE · N-TT1B-DOC-KET-NOI-THANG · N-TT1B-KET-NOI-TEN-TU-DO · N-TT1B-DUONG-GHI-GIA-THU-HAI · N-TT1B-DOC-BAN-GIAO-CUA-B. Chi tiết ở dòng sổ §9.

Còn nguyên:
- N-TIEN-TE-MAC-DINH phần giao diện;
- N-GUARD-TIEN-TE-MOI (bộ não);
- N-TT1-LUOC-DO-HE-SO (`doc-don.js:365`, `nap-page-de-do.mjs:47`);
- nợ /code-review TT1 #6 (`quyDonViNho` nhận mọi thứ `Number()` nhận).

## Ghi chú vận hành

- Phiên bị tắt hai lần: giữa lượt `cong-day-du-2`, rồi vì hết hạn mức API sau lượt `tt1.sh` riêng thứ hai. Tiến trình nền đã chết theo phiên; kết quả lấy từ log của lượt đã chạy xong.
- Lúc 15:08, tiến trình `tt1.sh` đang chạy (pid 82625) có cwd `agent-a44f02596926c25c8` (GP1), KHÔNG phải của tôi; tôi không mở lượt mới song song.
- Tôi đã tự giết lượt đầu (`cong-day-du-1`, cũ sau khi nới ③) bằng `giet_cay`: con trước, cha sau.
- Đã gỡ worktree tạm mồ côi `…/T/tt1-dao-va.jwBQ8Y/wt-base` (node_modules trỏ về worktree này). Đã xoá thư mục tạm `tt1-dao-va.jwBQ8Y` · `tt1b-dao-va.L8JOBl`.
- Ba worktree `gsp3-base.*` còn treo không phải của tôi. Đối chiếu bằng node_modules: chúng của GP1, của cây chính, và của `wt-chan1-tt1`.
- Các thư mục `gsp3-dao-va.*` / `gsp3b-dao-va.*` trong TMPDIR không phân biệt được chủ, nên để nguyên.
- GP1 (`src/products/gia-tu-don-pos.js`, worktree khác — chỉ đọc):
  - tệp import `TIEN_TE_THI_TRUONG` từ `chuyen-ban-sao.js` (re-export vẫn chạy, cùng đối tượng) và tra có `.trim()`, khớp `teCuaThiTruong`;
  - ghi bậc bằng đúng tệ thị trường shop qua `saveProduct` chỉ-giá ⇒ đi qua chặn mới;
  - tổng lưu ý khi cherry-pick: tệp đó có nhắc `poolChotDauGiaoDich` trong `saveProduct`; nếu GP1 sửa `operations.js#saveProduct` thì hai bản chạm cùng hàm.
