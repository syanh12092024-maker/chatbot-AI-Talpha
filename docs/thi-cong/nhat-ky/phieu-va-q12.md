# NHẬT KÝ PHIẾU VA-Q12 — docDon nuôi bảng `khach` + `san_pham_ma` (đóng Q1/Q2/Q3)

> Thợ **sonnet** · 22–23/08/2026 · base phiếu khai `31172e1`, **HEAD thật lúc khởi công
> là `09d4704`** (đo lại theo luật — HEAD dịch giữa các lượt là chuyện thường trên cây
> nhiều phiên) · làn 🟥 (đọc POS + ghi bảng nội bộ) · nghiệm thu:
> `bash ops/bin/nghiem-thu/va-q12.sh` → **17 phép ĐẠT / 0 TRƯỢT / 0 HOÃN** (chạy lại
> 2 lần liên tiếp, cả hai đều xanh — cổng tái chạy được) · `node --test
test/va-q12-doc-don.test.js` → **10/10** · hồi quy l1-m1 **35/35** · l3-m2+l3-m1
> **66/66** · thước lược đồ l0-m1 **12/12**.

---

## 0 · Mục ⑦ phiếu — ĐÃ TRA (output máy)

```
$ grep -n "nợ Q1\|nợ Q2\|nợ Q3" docs/thi-cong/SO-DIEU-HANH-THI-CONG.md
411:- 23/08 · thợ L3-M2 (nợ Q1 — 🔴 KHỚP ĐỨT trên ĐƯỜNG ĐƠN, chặn CẢ HAI cửa kiểm):
421:- 23/08 · thợ L3-M2 (nợ Q2 — cột mới CHƯA CÓ NGƯỜI GHI): migration 005 thêm
428:- 23/08 · thợ L3-M2 (nợ Q3 — 0,08% sai số của một phép quy ước, đo được): job chấm tỉ lệ
460:- 23/08 · thợ L2-M3 (nợ mới, cùng họ nợ Q2 của L3-M2 23/08): 01-QUYET-DINH.md §6 chỉ …
```

Ba nợ Q1/Q2/Q3 đúng như phiếu khai, chưa phiếu nào khác đóng (L1-M1 đã ✅ từ trước —
đây là phần NỐI thiếu, không trùng công). **Liên quan nhưng KHÔNG chạm:** dòng 460 là
nợ của L2-M3 (`db/di-tru/bo-luat-va-ky-nang.js`, seed kỹ năng `hoi_size` với
`bat=false`, chờ CẢ hai điều kiện: có `san_pham_ma` VÀ có báo cáo tỉ lệ hoàn theo SP).
VA-Q12 chỉ trả điều kiện THỨ NHẤT (san_pham_ma được ghi); điều kiện thứ hai (báo cáo)
ngoài phạm vi phiếu này — không tự ý flip `bat_cho_nhom_sp`. File đó đang **untracked,
mid-flight của L2-M3** lúc tôi làm (`git status`), không đụng.

Repo này KHÔNG có `ops/bin/tra_no.py`/`SO-NO.md` riêng (đó là quy ước của dự án khác) —
"sổ nợ" của AI Closer v3 là §9 `SO-DIEU-HANH-THI-CONG.md`, đã grep ở trên.

---

## 1 · Đo lại nguyên liệu TRƯỚC khi code (án lệ #4)

- **DB dev `aicloser_v3` lúc khởi công:** `khach` = 0 dòng · `don_hang` = 26 dòng, cả
  26 đều `co_khach=0, co_sp=0` — khớp đúng lời khai §9. Migration 001–005 đã áp.
- **POS thật, mẫu 2.100 đơn/7 shop (3 trang mới nhất mỗi shop):** `shipping_address`
  có mặt 2.100/2.100 · `phone_number` có 2.083/2.100 (99,2%, thiếu 17) · `items[].
variation_id` đủ 2.004/2.100 (95,4%) — cùng cỡ với số L3-M2 đã đo (95,9%/4,1%).
  Xác nhận nguồn đúng field: `shipping_address.phone_number` (không phải
  `bill_phone_number` — hai field THƯỜNG trùng giá trị nhưng L3-M2 đã đo bảng chuẩn
  hoá bằng field đầu, giữ nguyên để số không trôi).
- **Đơn 1 đơn thật (Saudi) để soi field:** `shipping_address` có `full_name`,
  `full_address`, `province_name` — đủ để nuôi `khach.ten/dia_chi/thanh_pho`.
  `items[].variation_id` là UUID — đúng khuôn `"<shop_id>:<variation_id>"` mà
  `san_pham.ma` (L1-M1) đã dùng.
- **Cặp trùng chéo thật mà phiếu nêu tên** (SĐT `966501984606`, #68771/#68769) — tra
  trực tiếp qua GET một đơn: #68771 Saudi, `conversation_id` khác null (→ messenger),
  `status=2` (shipped); #68769 Saudi, `conversation_id=null` (→ trang_ban_hang),
  `status=6` (canceled). Cả hai `inserted_at` 19/08/2026, cách nhau 4 phút. Hai đơn
  CHUNG một `variation_id` (`3e272c3b-…`) trong số 2 dòng hàng mỗi đơn — đúng như
  `loc-trung.js` mô tả «16 khách trùng ít nhất một sản phẩm».

Không nguyên liệu nào của phiếu sai — khác L3-M2 (đề bài của họ khai thiếu 3 chỗ),
lượt này đề bài khớp thực tế.

---

## 2 · Năm quyết định của lượt này

### ① `khach.so_dien_thoai` lưu DẠNG ĐÃ CHUẨN HOÁ, không giữ chuỗi gốc POS

Upsert khớp theo `(team, chuanHoaSdt(phone))`. Lý do: nếu lưu RAW thì hai đơn cùng một
khách nhưng POS khai SĐT khác định dạng (`0501234567` vs `+966501234567`) sẽ tạo
**HAI dòng `khach`** — lặp lại chính bug «58 khách bị tách đôi» mà `loc-trung.js` đã
đo, lần này lặp NGAY TRONG bảng `khach` mới nuôi. Giá phải trả: mất định dạng gốc
khách đã nhập (chưa màn nào trong v3 cần hiển thị lại nguyên văn).

### ② Nhập `chuanHoaSdt` TRỰC TIẾP từ `src/orders/loc-trung.js`, không qua

`src/orders/index.js` — LỆCH chữ phiếu, có lý do đo được

Phiếu khai ưu tiên `orders/index.js` (hàm ĐÃ export sẵn ở đó, xác nhận bằng đọc file).
Nhưng `orders/index.js` re-export `cua-pos.js`, mà file đó `import … from
"../pos/index.js"` — nhập theo đường barrel tạo **VÒNG**: `src/pos` → `src/orders` →
`src/pos`. Tôi **ĐO THỬ THẬT** trước khi quyết (thêm dòng import, `node --test
test/l1-m1-doc-pos.test.js`, cả hai chiều nhập module): vòng này **chạy được hôm nay**
(Node giải quyết nhờ `chuanHoaSdt` là function declaration hoisted, được gọi ở runtime
bên trong `docDon()` chứ không ở module-scope). Dù vậy tôi **chọn nhập thẳng
`loc-trung.js`** (0 phụ thuộc ngược) thay vì đi qua vòng — vì:

- Repo này đã trả giá **BỐN lần** để giữ layer `src/pos` (L1) không phụ thuộc ngược
  `src/orders` (L3): bốn "cửa hẹp" ghi trùng ở §9 sổ điều hành đều sinh ra CHÍNH VÌ
  tôn trọng ranh giới đó thay vì phá nó cho tiện.
- "Chạy được hôm nay" không phải "an toàn mãi mãi" — vỡ im lặng nếu mai có ai đổi
  `chuanHoaSdt` thành `const` arrow function, hoặc một file re-export thêm một dòng
  chạy ở module-scope.
- Cùng khuôn `import SÂU có chủ ý` mà `cua-pos.js:18` đã làm khi hàng rào chuẩn
  không vừa — không phải tiền lệ lạ trong repo này.

Ghi rõ theo luật 13 skill (nói mâu thuẫn, không lặng lẽ chọn một bên): **đây là một
lệch chữ phiếu có chủ ý**, lý do + giá phải trả đã ghi cả trong code (quyết định ⑤
đầu `src/pos/doc-don.js`) lẫn ở đây.

### ③ `khach` upsert: CHỈ tạo mới hoặc tái dùng — KHÔNG update lại tên/địa chỉ khách đã có

Nếu khớp khach đã tồn tại (cùng SĐT chuẩn hoá), tôi tái dùng `id`, KHÔNG ghi đè
`ten/dia_chi/thanh_pho`. Lý do: mọi UPDATE cho `khach` dưới `ctxHeThong()` phải đi qua
MỘT trong bốn "cửa hẹp" đã có (`suaTheoIdPos` không nhận `khach`; `CAU_GHI_CHAM` của
`ti-le-hoan.js` chỉ đúng 5 cột khác) — thêm một đường UPDATE thứ NĂM cho `khach` là làm
nặng thêm đúng món nợ mà §9 đã nhắc bốn lần liền. Phiếu không đòi refresh tên khách
mỗi lượt đọc (chỉ đòi `khach_id` có), nên chọn INSERT-nếu-thiếu là đủ và rẻ nhất. Nếu
sau này cần đồng bộ tên khách theo POS mới nhất, đó là lý do để mở phiếu `suaTheoId`
cho `ctxHeThong()` (đã ghi nợ), không phải vá thêm một cửa hẹp nữa ở đây.

### ④ Backfill 26 đơn cũ: quyết định KHI NÀO refresh, không chỉ theo `trang_thai_pos`

Bản gốc `docDon` chỉ UPDATE khi `trang_thai_pos` đổi. Nhưng 26 đơn cũ có
`trang_thai_pos` KHÔNG đổi (đều `'12'`) — nếu giữ nguyên luật cũ, "di trú lại 26 đơn
cũ" sẽ mãi mãi báo `giuNguyen` mà không bao giờ ghi `khach_id`/`san_pham_ma`. Vá: thêm
`khachDoi`/`spDoi`/`lsThieu` (status_history đang NULL) làm ba lý do CẬP NHẬT khác,
độc lập với `trang_thai_pos`. `status_history` cố tình KHÔNG so nội dung
(`JSON.stringify` cũ-vs-mới) — Postgres `jsonb` không giữ thứ tự khoá gốc khi đọc lại
nên phép so đó sẽ "đổi" giả vĩnh viễn (đã đọc trước khi viết, không phải đoán); chỉ ép
ghi khi CÒN NULL, các lượt cập nhật khác vẫn mang kèm bản mới nhất.

### ⑤ Làm luôn Q3 (status_history, migration 006) — "nếu rẻ" đúng nghĩa

Q3 tận dụng ĐÚNG vòng lặp per-đơn đã sửa cho Q1/Q2 (một field nữa trong cùng object
INSERT/UPDATE) — không mở thêm truy vấn, không mở thêm vòng lặp. Số bản 006 phiếu đã
cấp sẵn. CHỈ LƯU, không đọc — job chấm tỉ lệ hoàn (`ti-le-hoan.js`, ngoài pathspec)
vẫn đứng nguyên ở ảnh chụp `trang_thai_pos` cũ.

---

## 3 · Ra (đúng pathspec ③)

- `src/pos/doc-don.js` — quyết định ⑤ (comment) + `banDoKhach()` + `rutSanPhamMa()` +
  vòng lặp `docDon()` upsert khach/ghi san_pham_ma/status_history + backfill.
- `db/migrate/006_lich_su_trang_thai.{up,down}.sql` — cột `don_hang.status_history
jsonb`, KHÔNG bảng mới (`grep -c '^CREATE TABLE'` = 0).
- `db/schema.sql` — regen (`node db/migrate.js schema`), diff CHỈ +22 dòng của 006
  (đã kiểm `git diff --numstat` = `22 0` — không cuốn theo migration của phiên khác).
- `test/va-q12-doc-don.test.js` — 10 ca mock (K1–K3 upsert khach · P1–P2 san_pham_ma ·
  B1–B2 backfill đơn cũ · I1 idempotent · I2 TÍCH HỢP kiemTrung mirror cặp thật ·
  I3 nhánh mù-có-nói-ra).
- `ops/bin/nghiem-thu/va-q12.sh` — 6 phép ④ của phiếu, 17 mục đo, CHẠY THẬT trên
  `aicloser_v3` dev + POS thật (không sandbox — xem §4).
- `docs/v3/ban-giao/luoc-do-v1.md` — APPEND §11 (đóng 10.2/10.3, khai cột 006).
- `docs/thi-cong/SO-DIEU-HANH-THI-CONG.md` — APPEND §9 đóng Q1/Q2/Q3 + §10 3 dòng.

Không đụng `src/orders/*` ngoài IMPORT `chuanHoaSdt` (không sửa file đó — đúng luật
⛔ của phiếu). Không lượt ghi nào ra POS (toàn bộ là GET — `guiDocDon`/`guiDocMotDon`
không đổi; `ghiNguocTrangThai`/bốn cửa an toàn không chạm).

---

## 4 · Nghiệm thu — vì sao script CHẠM `aicloser_v3` DEV THẬT (khác quy ước l1-m1.sh/l3-m2.sh)

Hai cổng trước (`l1-m1.sh`, `l3-m2.sh`) đều dựng sandbox riêng dù có chạm POS thật.
VA-Q12 CỐ Ý khác: chữ phiếu ②#4 là _"Di trú lại 26 đơn cũ (chạy docDon refresh)"_ và
_"kiemTrung TRÊN DỮ LIỆU THẬT hết rỗng"_ — hậu quả phải nhìn thấy TRÊN `aicloser_v3`,
không phải một sandbox dùng xong xoá. `docDon` là GET thuần (đã chứng minh không lượt
ghi nào ra POS), nên an toàn để chạm dev.

**Hệ quả phụ đã đo, nói thẳng ra:** để phủ hết 26 `ma_pos` cũ (id xa nhất tới `45086`,
UAE) phải quét sâu 30 trang UAE — dọc đường đó docDon cũng ghi luôn MỌI đơn UAE thật
khác đi qua (UAE có 38.405 đơn tổng, đo bằng `total_entries` của chính API). Và để
chạm cặp `#68771/#68769` (19/08, Saudi) phải quét Saudi với `tuNgay=2026-08-18` (783
đơn/8 trang). Hai lượt quét đó **CỐ Ý, không phải rò rỉ phạm vi** — chúng đúng là
việc "làm giàu thêm cột" mà phiếu cho phép, chỉ là làm giàu trên MỘT TẬP RỘNG hơn 26
dòng ban đầu vì đó là cách duy nhất chạm tới đúng 26 dòng đó qua giao diện phân trang
thật. Đo cuối: `khach` 0→**3.218** · `don_hang` 26→**3.784** (co_khach 3.779/3.784).
**Không dòng nào bị xoá hay nhân đôi** (luật §0a #2 + chữ phiếu) — chỉ có 5 đơn
KHÔNG có SĐT trong POS thật nên `khach_id` NULL đúng thiết kế (nói ra, không im).

**Một bẫy đo bắt được VÀ SỬA trong chính lượt viết script (nói thẳng, luật 14):** thử
double-call `docDon` trên UAE (30 trang, vài giây/lượt) để tự chứng minh idempotent —
UAE là shop ĐANG SỐNG, lượt 2 bắt được `them=1` thật (một khách thật đặt đơn ĐÚNG lúc
giữa hai lượt gọi) → cổng đỏ GIẢ vì đo sai thứ cần đo (nhân đôi ≠ dữ liệu nguồn đổi
giữa chừng). Sửa: bỏ double-call trên UAE (30 trang, cửa sổ rủi ro lớn), giữ double-
call trên Saudi (8 trang, cửa sổ hẹp hơn — đo ④ đã cần sẵn) với ngưỡng CHỊU ĐƯỢC
(`them2 ≤ 2`) thay vì đòi tuyệt đối 0; PHÉP CHỨNG MINH CHẶT (đúng 0, dữ liệu KHÔNG đổi
giữa hai lượt) dồn về bộ ca mock tĩnh (`I1`/`K2`/`B2` của `va-q12-doc-don.test.js`) —
nơi không shop thật nào ghi chèn được. Cũng bắt một lỗi thước thứ hai: alias SQL
`coSp`/`rongSp` (camelCase) bị Postgres fold về `cosp`/`rongsp` khi không quote, đọc
qua JS thành `undefined` → `NaN <= NaN` → `false` — sửa alias về snake_case
(`co_sp`/`rong_sp`/`sp_null`), đổi phép so thành đếm trực tiếp `sp_null = 0`.

**Kết quả 6 phép ④ của phiếu** (script in đủ số cho mỗi phép, đã chạy XANH 2 lần liên
tiếp — cổng tái chạy được):

1. 3 khach mới nhất: `chuanHoaSdt(đang lưu) = đang lưu` (idempotent một chiều, so qua
   cả hai đường) — ĐẠT.
2. 26/26 đơn cũ có `khach_id`; VẾ 1 (docDon tự báo) vs VẾ 2 (đếm lại từ DB) khớp; đơn
   không SĐT ĐẾM RA (không im) — ĐẠT.
3. 2 mẫu `san_pham_ma` đối chiếu response thật; toàn team **0 dòng còn NULL** (rỗng
   thì `[]`) — ĐẠT.
4. **PHÉP ĂN TIỀN**: `kiemTrung("966501984606", sanPhamId="…3e272c3b-…")` →
   `trung=true · ly_do=trung_khop_san_pham · nguon_trung=ca_hai · don=[#68769,#68771]`
   — ĐẠT, trước phiếu này luôn RỖNG.
5. Idempotent (Saudi, ngưỡng chịu-được vì shop sống — xem trên) — ĐẠT.
6. `node --test`: bộ ca phiếu 10/10 · hồi quy l1-m1 35/35 · l3-m2+l3-m1 66/66 · thước
   lược đồ l0-m1 12/12 — ĐẠT.

---

## 5 · Ngoài phạm vi → §9 (phát sinh mới, APPEND, không tự sửa)

- **`docDon` có thể dừng phân trang SỚM khi POS trả một trang RỖNG THOÁNG QUA** (đo
  được thật: gọi liên tiếp nhanh không nghỉ vào UAE trang 5/16/18, `data.length=0`
  một lần rồi trang kế tiếp lại có dữ liệu bình thường khi gọi lại — xác nhận KHÔNG
  phải hết trang bằng cách gọi lại y hệt 3 lần, luôn đủ 100 dòng). `docDon`
  (`src/pos/doc-don.js`) có `if (!lo.donHang.length) break;` — coi trang rỗng là HẾT
  DỮ LIỆU, không phân biệt được với một lượt API chập chờn. Hệ quả: một lượt quét sâu
  (nhiều trang, không nghỉ giữa các lượt gọi) có thể bỏ sót các trang SAU trang rỗng
  thoáng qua đó, IM LẶNG (không lỗi, không log). VA-Q12 tự né bằng cách không gọi dồn
  dập (script có khoảng nghỉ tự nhiên giữa các bước), nhưng đây là rủi ro CẤU TRÚC của
  hàm `docDon`, thuộc đất L1-M1, ngoài pathspec VA-Q12.

---

## 6 · Trạng thái cuối

Q1 ✅ đóng (khach nuôi từ docDon, khach_id nối đủ 26/26 đơn cũ, kiemTrung bắt được cặp
trùng chéo thật). Q2 ✅ đóng (san_pham_ma ghi đúng khuôn, 0 dòng còn NULL trên team đã
quét). Q3 ✅ đóng (status_history lưu, migration 006, chưa ai đọc — nói rõ trong
luoc-do-v1.md §11.2). Cây cuối lượt (trước commit): xem `git log --oneline -1` +
`git status --porcelain` dán ở lượt commit kế tiếp (luật "chụp git log đầu/cuối").
