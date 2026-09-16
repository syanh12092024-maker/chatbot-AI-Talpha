# CR-15/09 · MÃ SẢN PHẨM KHÔNG MANG SHOP

> Skill `doi-y-do` · điểm DỪNG CỨNG: **chưa sửa một dòng nào**. Trình bảng, chờ người quyết gõ «áp».
> Người yêu cầu: chủ dự án, phiên 15/09/2026. Người đo: session tổng 15/09.

---

## ① Câu đổi — từ X sang Y, vì Z

**TỪ** `san_pham.ma = "<shopId>:<variationId>"` là khoá DUY NHẤT của một sản phẩm, và
`kich_ban.san_pham_ma` · `ky_nang.bat_cho_nhom_sp` dùng chung vốn từ đó.

**SANG** tách làm HAI vai:

| Khoá | Dạng | Vai |
| --- | --- | --- |
| `san_pham.ma` (giữ nguyên) | `<shopId>:<uuid>` | khoá **KỸ THUẬT** — trỏ vào POS để tạo đơn |
| `san_pham.ma_goc` (**mới**) | `fitgum-acai-berry` | khoá **NGHIỆP VỤ** — một sản phẩm THẬT, không mang shop |

và `kich_ban.san_pham_ma` · `ky_nang.bat_cho_nhom_sp` chuyển sang trỏ `ma_goc`.

**VÌ** một sản phẩm bán ở nhiều shop · nhiều thị trường · nhiều page, và **page chết thì sản
phẩm phải sống tiếp**. Đo 15/09 trên dữ liệu thật:

- Fitgum Acai Berry bán ở **3 shop**, mỗi shop một `variation_id` khác nhau
  (`Saudi e4108b77…` · `Kuwait 717bfb27…` · `Oman e87acfbd…`) ⇒ **3 `san_pham.ma` cho 1 sản phẩm**
- **115/577 page = 19,9%** đang `lost`, riêng tháng 9/2026 có **106 page**
- Oman đang chạy đúng cảnh «page chết, chuyển page»: 82 đơn Fitgum chia cho page đã `lost`
  (26 đơn) và một page **không có trong `pages.json`** (56 đơn)
- Kịch bản Kuwait vs Saudi: **14/18 khối giống nhau từng byte**; 4 khối khác chỉ vì
  tệ · giá · số WhatsApp

⇒ Hệ quả đang chịu: migration 010 đã dựng **kịch bản ba tầng** (`cap='san_pham'` / `'nuoc'` /
`'page'`, hai tầng trên KHÔNG gắn page) và `src/db/kich-ban.js` đã có bộ giải kế thừa — nhưng vì
`san_pham_ma` mang mã shop nên tầng `'san_pham'` thực chất là «sản phẩm trong MỘT shop», và tầng
`'nuoc'` thành dư thừa. **Kiến trúc đúng đã có, bị một cái mã làm vô hiệu.**

### Phạm vi ÂM — thay đổi này KHÔNG đụng tới

- ⛔ **`don_hang.san_pham_ma`** — giữ NGUYÊN dạng POS. 4.581/4.581 phần tử đang mang dạng
  `<shop>:<uuid>`; đổi là **phá lọc đơn trùng** (`src/orders/loc-trung.js` khớp theo
  `khach_id + san_pham_ma`), và đơn cũ không so được với đơn mới.
- ⛔ **Luồng tạo đơn** — `tachMaBienThe()` · `variation_id` gửi POS: không đổi một ký tự.
- ⛔ **62 tệp phẳng dưới `src/`** của bản đang chạy, và 5 tệp bộ não chat.
- ⛔ **Giá** — không đổi cách tính tiền. (Nợ `CCY_FACTOR.KWD` là CR khác, đã ghi §9.)
- ⛔ Không gộp thêm việc: không sửa `page_id` của `san_pham` trong CR này (xem ④).

---

## ② Bảng tác động — năm lớp

### Lớp 1 · Ý ĐỒ (`docs/v3/01-QUYET-DINH.md`)

| Chỗ | Phải làm gì |
| --- | --- |
| dòng 141 «Dữ liệu sản phẩm ~1.500 tok · Đồng bộ từ POS · Tự động» | vẫn đúng, **không đổi** |
| dòng 139 «Kỹ năng · bật theo sản phẩm» | đổi nghĩa «sản phẩm» → `ma_goc`; sửa 1 dòng |
| dòng 228 «Sản phẩm mới chưa có đơn thì không tạo được đơn» | **liên quan trực tiếp**, xem ④ |
| dòng 177 «mỗi team có bộ sản phẩm + kết nối POS riêng» | vẫn đúng |

**Đánh giá: ý đồ KHÔNG đổi.** CR này *thực hiện* ý đồ ba tầng đã ký, không sửa nó.

### Lớp 2 · ĐIỀU HÀNH

| Chỗ | Trạng thái |
| --- | --- |
| `SO-DIEU-HANH-THI-CONG.md` nhắc `san_pham` | 27 chỗ |
| Phiếu đang cầm nhắc `san_pham_ma` | **1** — `PHIEU-VA-Q12.md` (đã ✅, không ai đang cầm) |
| §9 nợ liên quan | 2 mục 11/09, **đã cập nhật số đo 15/09** (commit `b40f1fc`) |
| §8 việc người | H7 (gán team) — độc lập, không chặn CR này |

**Không phiếu nào đang chạy bị cắt ngang** (bẫy án lệ #2).

### Lớp 3 · HỢP ĐỒNG

| Tệp | Phải làm gì |
| --- | --- |
| `docs/v3/ban-giao/luoc-do-v1.md` | khai `san_pham_goc` + `ma_goc`, sửa mô tả `san_pham.ma` |
| `docs/v3/ban-giao/may-trang-thai-don-v1.md` | chỉ nhắc `don_hang.san_pham_ma` — **không đổi** (phạm vi âm) |
| `docs/v3/02-KE-HOACH-CODE.md` | bảng 18 bảng → 19 bảng |
| `docs/v3/03-MAN-HINH.md` | thêm ô «page này bán sản phẩm gốc nào» ở màn Page & bot |

### Lớp 4 · MÁY

**Code — 120 chỗ nhắc `san_pham_ma`, chia hai nhóm:**

| Tệp | Số chỗ | Nhóm | Phải làm gì |
| --- | --- | --- | --- |
| `src/db/kich-ban.js` | 14 | 🟨 **ĐỔI** | bộ giải ba tầng: tra theo `ma_goc` |
| `db/di-tru/bo-luat-va-ky-nang.js` | 2 | 🟨 **ĐỔI** | `ky_nang.bat_cho_nhom_sp` → `ma_goc` |
| `src/pos/doc-danh-muc.js:102` | 1 | 🟨 **ĐỔI** | sinh thêm `ma_goc` bên cạnh `ma` |
| `src/pos/doc-don.js` | 5 | 🟥 **GIỮ** | ghi `don_hang.san_pham_ma` — phạm vi âm |
| `src/orders/loc-trung.js` | 5 | 🟥 **GIỮ** | lọc trùng — phạm vi âm |
| `src/orders/hang-cho.js` | 5 | 🟥 **GIỮ** | hàng chờ tạo đơn — phạm vi âm |
| `src/pos/tao-don.js` | 4 | 🟥 **GIỮ** | `tachMaBienThe` — phạm vi âm |
| `src/db/truy-van.js` | 1 | ➖ | chú thích kiểu mảng |

**Bộ ca:** 7 tệp test nhắc `san_pham_ma` — `va-q12-doc-don` · `l3-m4-duyet` · `l3-m2-loc-trung` ·
`l0-m2-gop-cua-hep` · `va-r2-tien-tao-don` · `l3-m4-hang-cho` · `l0-m2-kich-ban`.
Bốn tệp đầu thuộc nhóm GIỮ ⇒ **phải xanh y nguyên, không sửa** (đó là lưới canh phạm vi âm).
`l0-m2-kich-ban` thuộc nhóm ĐỔI ⇒ sửa theo luật mới.

**Cổng nghiệm thu: 10 cổng** nhắc `san_pham` — `l0-m1` · `l1-m1` · `l2-m3` · `l3-m2` · `l3-m4` ·
`b-y3` · `g2-a4` · `g2-a5-a6` · `va-q12` · `va-r2`.
⚠️ Án lệ #27 và bẫy #1 của skill: **cổng nào còn neo mã cũ mà vẫn xanh trên luật mới là cổng
không đo cái nó tưởng đang đo.** Phải soi từng cổng, không chạy rồi thấy xanh là xong.

**Biến `V3_*`:** không thêm, không đổi.

### Lớp 5 · DỮ LIỆU — lớp không lùi được bằng `git`

| Bảng | Bản ghi mang dạng cũ | Xử lý |
| --- | --- | --- |
| `san_pham.ma` | **137/137** dòng `<shop>:<uuid>` (đo 23/08 trên `aicloser_v3`) | **giữ nguyên**, chỉ thêm cột `ma_goc` |
| `don_hang.san_pham_ma` | **4.581/4.581** phần tử | **không đụng** (phạm vi âm) |
| `kich_ban` `cap='san_pham'`/`'nuoc'` | ❓ **CHƯA ĐO ĐƯỢC** | xem dưới |
| `ky_nang.bat_cho_nhom_sp` | ❓ **CHƯA ĐO ĐƯỢC** | xem dưới |

🔴 **HAI Ô CHƯA ĐO — và không được đoán.** CSDL `aicloser_v3` trên **máy dev đang RỖNG**
(đo 15/09: `page` 0 · `kich_ban` 0 · `san_pham` 0 dòng). Số thật nằm trên VPS `169.58.33.8`,
mà phiên này **không có khoá SSH**. Ba câu SQL cần chạy trước khi áp:

```sql
SELECT cap, count(*) FROM kich_ban GROUP BY cap;
SELECT count(*) FROM ky_nang WHERE array_length(bat_cho_nhom_sp,1) > 0;
SELECT count(DISTINCT ma) FROM san_pham;
```

**Việc gộp `ma` → `ma_goc` KHÔNG tự động được.** Máy không biết `1328205216:e4108b77…` và
`1328205226:717bfb27…` là cùng một sản phẩm — chỉ TÊN nói lên điều đó, mà tên POS thì do người
gõ (`125 - Fitgum Acai Berry` vs `125 - Fitgum Acai Berry`). Phải có một vòng NGƯỜI soát, hoặc
gợi ý bằng so tên rồi người duyệt.

---

## ③ Giá phải trả

1. **Một vòng soát tay để gộp sản phẩm.** 137 dòng `san_pham` → chưa biết gộp lại còn bao nhiêu
   `ma_goc`. Máy chỉ gợi ý được bằng so tên; quyết định là của người. Đây là phần tốn người
   nhất, và **không rút ngắn được**.
2. **`kich_ban` đang có dữ liệu thật trên VPS phải di trú.** Đổi nghĩa một cột đang có dòng LIVE
   là việc chạm trực tiếp cái bot đang đọc mỗi lượt chat.
3. **Rủi ro mới sinh: HAI vốn từ cùng tồn tại.** Sau CR, `san_pham_ma` mang nghĩa khác nhau ở
   `kich_ban` (mã gốc) và `don_hang` (mã POS). Đó là chính xác kiểu nhầm lẫn đã đẻ ra án lệ
   «hai hình dạng cho cùng một thứ». **Giảm rủi ro: đổi TÊN CỘT ở `kich_ban` thành
   `san_pham_goc_ma`**, đừng giữ tên cũ mang nghĩa mới — đắt hơn một chút, nhưng người sau đọc
   là biết.
4. **Chi phí nếu KHÔNG làm**: mỗi page mới chép tay 18 khối, trong đó 14 khối trùng; page chết
   20%/năm thì cấu hình lại từ đầu; sửa một câu trả lời chung phải sửa N page.

---

## ④ Việc KHÔNG làm trong CR này ⇒ §9 SỔ NỢ

| Việc | Neo | Vì sao hoãn |
| --- | --- | --- |
| `san_pham` vẫn có ĐÚNG MỘT `page_id` | §9 11/09 mục 1 | CR này mở đường (có `ma_goc` rồi) nhưng gỡ ràng buộc page là phiếu riêng, đụng lược đồ sâu hơn |
| «Sản phẩm mới chưa có đơn thì không tạo được đơn» | `01-QUYET-DINH.md:228` | `productRef` suy ngược từ 25 đơn cũ; `doc-danh-muc.js` sinh ra để chữa nhưng chưa nối. Độc lập với CR này |
| `CCY_FACTOR.KWD = 1000` nghi sai 10 lần | §9 15/09 | đường TIỀN, CR riêng, chờ người mở POS xác nhận |
| Bảng giá theo nước sinh tự động từ đơn POS | — | làm được (đã chứng minh 15/09) nhưng là tính năng, không phải phần của CR đổi khoá |

---

## ⑤ Phiếu cần đẻ — thứ tự bắt buộc

| Mã | Việc | Làn | Phụ thuộc |
| --- | --- | --- | --- |
| `CR1-LUOC-DO` | migration 014: bảng `san_pham_goc` + `san_pham.ma_goc` + `kich_ban.san_pham_goc_ma` (cột MỚI, chưa bỏ cột cũ) | 🟨 | — |
| `CR2-SINH-MA` | `doc-danh-muc.js` sinh `ma_goc`; script gợi ý gộp theo tên | 🟨 | CR1 |
| `CR3-NGUOI-SOAT` | **việc NGƯỜI**: duyệt bảng gợi ý gộp 137 dòng | 👤 | CR2 |
| `CR4-GIAI-BA-TANG` | `kich-ban.js` + `ky_nang` tra theo `ma_goc`; sửa bộ ca + 10 cổng | 🟨 | CR3 |
| `CR5-DI-TRU` | chuyển dòng `kich_ban` LIVE sang khoá mới trên VPS | 🟥 | CR4 |
| `CR6-MAN` | màn Page & bot: ô «page này bán sản phẩm gốc nào» | 🟨 | CR1 |

Áp theo thứ tự skill quy định: `01-QUYET-DINH` → `ban-giao/` + spec → sổ + phiếu → code → bộ ca
→ cổng → màn.

---

## ⑥ Đường lùi

- **CR1–CR2**: cột MỚI, chưa ai đọc ⇒ lùi = `git revert`, dữ liệu không mất. Rẻ.
- **CR4**: bộ giải đọc cột mới; lùi = revert code, cột thừa nằm im vô hại.
- **CR5 là chỗ KHÔNG lùi bằng `git`** — đã ghi `kich_ban` theo khoá mới. Đường lùi phải là:
  giữ **cả hai cột** song song suốt CR5, chỉ bỏ cột cũ ở một phiếu SAU khi đã chạy ổn ≥1 tuần.
  ⛔ `migrate down` **không phải** đường lùi trên CSDL thật (án lệ 01/09: `013.down` DROP COLUMN
  làm mất dữ liệu và ném giữa chừng).
- **Nút dừng rẻ nhất suốt cả CR**: chưa phiếu nào bật cờ nào, chưa đụng đường đơn — dừng giữa
  chừng thì hệ chạy y như hôm nay.

---

## Trình người quyết

1. Đổi: mã sản phẩm tách hai vai — `ma` (POS, giữ) + `ma_goc` (nghiệp vụ, mới). Kịch bản/kỹ năng tra `ma_goc`.
2. Vì: 1 sản phẩm = 3 shop = 3 mã; 19,9% page chết/năm; 14/18 khối kịch bản là bản sao.
3. Ý đồ **không đổi** — CR này thực hiện kịch bản ba tầng đã ký ở migration 010, đang bị vô hiệu.
4. **Không đụng đường đơn**: `don_hang.san_pham_ma` · lọc trùng · tạo đơn giữ nguyên tuyệt đối.
5. Máy: 3 tệp đổi · 4 tệp giữ (có test canh) · 7 bộ ca · **10 cổng phải soi tay**.
6. Dữ liệu: `san_pham` 137 dòng thêm cột; `don_hang` 4.581 phần tử **không đụng**.
7. 🔴 **Chưa đo được**: số dòng `kich_ban`/`ky_nang` trên VPS — cần 3 câu SQL, phiên này không có SSH.
8. Giá đắt nhất: **một vòng người soát gộp 137 dòng sản phẩm** — máy chỉ gợi ý được.
9. Đường lùi: giữ hai cột song song, bỏ cột cũ ở phiếu sau ≥1 tuần chạy ổn.
10. 6 phiếu, trong đó 1 việc người và 1 phiếu 🟥 (di trú `kich_ban` trên VPS).

## ✅ ĐÃ ÁP — 16/09/2026, người quyết gõ «áp»

| Phiếu | Trạng thái | Commit |
| --- | --- | --- |
| **CR1** lược đồ (migration 014) | ✅ | `26d2b4b` |
| **CR2** sinh mã + gợi ý gộp | ✅ | `185353b` |
| **CR3** người soát 137 dòng | ⏸ **VIỆC NGƯỜI** — `node ops/bin/goi-y-gop-san-pham.mjs` |
| **CR4** bộ giải ba tầng | ✅ | `0963a61` |
| **CR5** di trú `kich_ban` trên VPS | ⏸ **điểm dừng ②** — phiên áp không có SSH |
| **CR6** màn gán sản phẩm gốc | ✅ | `3b80737` |

Số đo lúc đóng: `npm test` **1.762 ca · 1.759 xanh · 1 đỏ = D7** (nợ cũ) · cổng tĩnh
PHÉP=5 ĐỎ=0 · 12 cổng có nhắc `san_pham` đều về đúng mức trước CR.

### Ba lỗi của tôi trong lượt áp, bộ ca bắt hết — ghi để không tái phạm

1. **Rào của 010 chặn đúng thứ nó sinh ra để mở.** `kich_ban_khoa_dung_cap` đòi
   `san_pham_ma IS NOT NULL`, nên không chèn được dòng chỉ có khoá gốc. Bản đầu tôi ghi
   «dòng mới mang CẢ HAI khoá» — viết ca test mới thấy câu đó vô nghĩa: kịch bản dùng chung
   cho ba shop thì `san_pham_ma` điền cái gì?
2. **Nới rào thì chép theo bản 010, không đọc bản 012.** 012 đã nới `cap='nuoc'` cho phép
   `san_pham_ma IS NULL`. Ba ca K17/K18/K19 đỏ ngay.
   📌 **Rào của một bảng là TỔNG của mọi migration đã sửa nó**, không phải bản khai đầu tiên.
3. **Neo vào số tuyệt đối, hai chỗ trong một tệp thước.** `assert.equal(…, 24)` ở S1 và S12
   của `l0-m1-luoc-do`. Không nới 24→25 mà sửa gốc: S1 so với `NEO.length`, S12 đếm bảng
   TRƯỚC lượt down rồi so ĐỘ LỆCH. Từ nay thêm bảng chỉ sửa MỘT chỗ. Cổng `l0-m1.sh` còn
   một BẢN NEO THỨ HAI của cùng danh sách — đã vá luôn.

### Còn nợ, đã ghi §9

- `san_pham` vẫn đúng một `page_id` ⇒ lời hứa «page chết, page mới kế thừa 0 cấu hình» chỉ
  đúng khi shop có 1 page. Shop nhiều page thì `san_pham.page_id` null và bộ giải không tra
  được. **CR này giao được «một kịch bản cho nhiều thị trường», CHƯA giao được «page chết
  thì thay không cần cấu hình».**
- Bỏ cột `san_pham_ma` cũ: phiếu SAU, cách CR5 ít nhất một tuần chạy ổn.
