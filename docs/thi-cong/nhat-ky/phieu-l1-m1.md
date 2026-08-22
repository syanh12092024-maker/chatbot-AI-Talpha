# NHẬT KÝ PHIẾU L1-M1 — Cửa POS: đọc đơn / danh mục + tồn kho / GHI NGƯỢC trạng thái đơn

> Thợ **opus** · 22/08/2026 · base `dfcd9ae` (phiếu) · HEAD lúc nhận `e88bed7`
> Làn 🟥 GHI RA NGOÀI. Bản v2 của phiếu (đã đóng 7 finding review vòng 1).
> Đo lại bằng: `bash ops/bin/nghiem-thu/l1-m1.sh` · `node --test test/l1-m1-*.test.js`

---

## 0 · Kết quả một dòng

Cổng `l1-m1.sh`: **24 phép ĐẠT / 0 TRƯỢT / 1 HOÃN** (2 lượt liên tiếp cùng số) ·
bộ ca **34/34 xanh** · `_chan1.sh` xem §7. Phép HOÃN là ⑤c — GHI NGƯỢC THẬT lên POS,
**CHƯA CHẠY, chờ diễn tập VPS**, khai đúng như phiếu dặn, không giả vờ xanh.

---

## 1 · ĐO LẠI NGUYÊN LIỆU trước khi gõ phím (bước 3 của skill)

Phiếu ② bắt đo lại. Đo được **năm** thứ, trong đó **bốn** lệch đề bài hoặc lệch tài liệu.

### 1.1 · POS **KHÔNG** chặn IP máy này — lỗi 121 là chuyện khác

```
$ curl -s -o /dev/null -w "%{http_code}" "https://pos.pages.fm/api/v1/shops/<id>/orders?api_key=…"
→ 7/7 shop trả HTTP 200 (Saudi 62.029 · UAE 38.391 · Kuwait 12.281 · Bahrain 944
   · Oman 1.732 · Qatar 6.026 · Taiwan 344 đơn)
```

Sổ §0a cảnh báo «Token Pancake từ IP máy cá nhân bị chặn (lỗi 121)». Đo ra: cảnh báo đó
đúng cho **token PAGE của Graph API**, KHÔNG đúng cho **POS `pos.pages.fm`**. Hệ quả cho
lượt này: phép ③ và ④ chạy được thật ở local trên shop thật, không phải mock. Chỉ phép
GHI (⑤c) mới chờ VPS — và chờ vì **luật** (van `V3_POS_GHI`), không phải vì mạng.

### 1.2 · `src/pancake-orders.js` (219 dòng) export gì

`ordersEnabled` · `realOrders` · `aiOrderStats` · `conversationHasOrder` ·
`markConversationOrdered` · `createPancakeOrder` · `ordersForConv` · `realOrdersMulti`.
Đọc để lấy khuôn URL và bài học, **không import**: nó đọc thẳng `pancake-shops.json` từ
đĩa và tự giữ cache tệp — hai thứ v3 thay bằng bảng `ket_noi_pos` + tầng truy vấn. File
gốc KHÔNG bị đụng một ký tự (phép ⑤ của `_chan1.sh` canh).

### 1.3 · `pancake-shops.json` — cấu trúc thật

Mảng 7 phần tử `{market, shop_id, api_key}`, khoá POS **nguyên văn**. Khớp đúng dòng nợ
§9 đã cảnh báo: `pages.json.posApiKey` bị che (112/112 dạng `***xxxx`) — không đọc cột
đó. `page-shop-cache.json` là bản đồ pageId → cùng object shop, có sẵn nhưng KHÔNG dùng
làm nguồn khoá (nó là cache, không phải sổ cái).

### 1.4 · 🔴 Bảng mã trạng thái: API **TỰ KHAI NHÃN** — không phải đoán

Phiếu ②.3 nói đúng bệnh («Chờ in» 8 lần trong docs, 0 lần có mã số) nhưng thuốc rẻ hơn
dự kiến: **mỗi đơn POS trả kèm cặp `status` + `status_name`**. Quét 3.546 đơn thật trên
7/7 shop (lọc theo từng mã 0..25, rồi quét lại không lọc để chống «bộ lọc nói dối»):
**không mã nào ra hai nhãn khác nhau**.

```
 0 new · 1 submitted · 2 shipped · 3 delivered · 4 returning · 5 returned · 6 canceled
 7 removed · 8 packing · 9 pending · 11 waitting · 12 wait_print · 16 received_money
19 (nhãn null, đúng 1 đơn — Bahrain #378) · 20 ordered
```

**«Chờ in» = 12 (`wait_print`)**. Và phiếu lo đúng chỗ: **3 = `delivered`**, đoán
3="Chờ in" là đánh dấu ĐÃ GIAO cho đơn còn nằm trong kho.

**Mã 13** xuất hiện trong `status_history` (`1→13`, `13→12`, `13→8`…) nhưng lượt đo
không shop nào còn đơn đang đứng ở 13 ⇒ **không đọc được nhãn ⇒ KHÔNG đưa vào bảng**.
Deny-by-default: cửa (b) từ chối mọi cặp chạm 13 (`LoiMaChuaXacMinh`).

### 1.5 · 🔴 NEO KIỂM `{4,5,6,7,8}` CỦA §7.5 **SAI** — 8 là `packing`

Phiếu ④#3b bảo «neo kiểm `{4,5,6,7,8}` = hủy/hoàn (§7.5) phải khớp». Nó **không khớp**,
và cái sai nằm ở tài liệu + bản đang chạy, không ở phép đo:

```
status_history đơn 47397 (UAE):  0@05:41 → 1@05:45 → 12@05:45 → 8@06:04
đồ thị chuyển trên 1.400 đơn:    12→8 = 986 lượt · 8→9 = 537 · 8→2 = 394
```

8 là **bước TIẾN** (đang đóng gói), không phải hủy. `src/pancake-orders.js:13`
(`CANCEL = {4,5,6,7,8}`) đang trừ đơn đang-đóng-gói khỏi «successful» ⇒ **bản đang chạy
đếm THIẾU đơn thành công** (71 đơn đứng ở 8 riêng shop UAE lúc đo). Đã ghi §9, **không
sửa bản đang chạy** (ngoài pathspec, và nó là 62 file phẳng đang phục vụ 51 page thật).
Code v3 khai `NHOM_HUY_HOAN = {4,5,6,7}` và cổng ③b **đỏ nếu ai sửa nó cho «khớp tài
liệu»** — kèm lý do in ngay tại chỗ.

### 1.6 · 🔴 Id đơn POS là dãy **RIÊNG TỪNG SHOP**

Saudi tới 62.029 · UAE 47.421 · Kuwait 13.922 · **Taiwan 344** — bốn dãy đều đếm từ 1,
chồng nhau hoàn toàn. Mọi shop hiện đậu chung team `chua-phan`, mà `don_hang` có
UNIQUE `(team_id, ma_pos)` ⇒ ghi id trần là **đơn Saudi #344 và đơn Taiwan #344 tranh
nhau MỘT dòng**, bên thua biến mất không tiếng động. Quyết: `ma_pos = "<shop_id>:<id>"`.
Ca `R5` giữ bằng chứng (hai shop cùng id 101 → hai dòng).

### 1.7 · `conversation_id` của POS **khớp đúng khuôn** khoá `conv-state.json`

```
POS:          1154327407744443_28180900878187630   (= <page_id_fb>_<psid>)
conv-state:   1170323086162562_27879039978421635
```

Nên `nguon` suy được, **và** nối được thẳng `don_hang.hoi_thoai_id` qua
`page(page_id) → (page.id, psid)`. Phân bố đo trên 2.100 đơn mới nhất của 7 shop:
**có `conversation_id` 1.593 (75,9%) · không có 507 (24,1%) · sai khuôn 0**.

### 1.8 · 🔴 Danh mục POS **KHÔNG mang giá**

`retail_price` = 0 trên **128/128** biến thể mẫu (UAE 50 · Kuwait 50 · Taiwan 28).
`total_price` của đơn cũng = 0 trên mọi đơn mẫu — tiền thật nằm ở
`cod` = `shipping_fee` = `money_to_collect`. Nghĩa là `docDanhMuc` chữa được «tên sản
phẩm trống» và «không biết tồn kho» (01 §12), nhưng **`goi_gia` ra 0 dòng**.

---

## 2 · Đã làm gì

| Ra                               | Nội dung                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `db/migrate/002_ket_noi_pos.*`   | bảng thứ 20 `ket_noi_pos` — `api_key_ma` CHECK `LIKE 'v1.%'`, 2 UNIQUE        |
| `db/di-tru/ket-noi-pos.js`       | `pancake-shops.json` → 7 dòng, team `chua-phan`, chạy lại được **và ổn định** |
| `src/pos/ma-trang-thai.js`       | bảng mã ĐÃ XÁC MINH + bảng chuyển 2 cặp + 2 lỗi có tên (cửa **b**)            |
| `src/pos/api.js`                 | cửa HTTP duy nhất; `guiDatTrangThai` là điểm DUY NHẤT phát lệnh ghi           |
| `src/pos/ket-noi.js`             | đọc + giải mã kết nối theo `market`                                           |
| `src/pos/kho.js`                 | cửa ghi CSDL hẹp (xem §3.1) + bản soi gương `xacDinhTeam`                     |
| `src/pos/doc-don.js`             | `docDon` + luật suy `nguon`                                                   |
| `src/pos/doc-danh-muc.js`        | `docDanhMuc` — tên + tồn kho thật                                             |
| `src/pos/ghi-nguoc.js`           | `ghiNguocTrangThai` — **bốn cửa an toàn**                                     |
| `src/pos/moi-truong.js`          | đọc `.env` chỉ-đọc cho khoá mã hoá (xem §3.4)                                 |
| `test/l1-m1-ghi-nguoc.test.js`   | 22 ca — bốn cửa, bảng mã, rào team, cửa ghi CSDL                              |
| `test/l1-m1-doc-pos.test.js`     | 12 ca — luật nguồn, idempotent, refresh, va chạm id 2 shop, danh mục          |
| `ops/bin/nghiem-thu/l1-m1.sh`    | cổng 24 phép + 1 HOÃN, tự dựng/dọn sandbox, **có chạm POS thật (chỉ đọc)**    |
| `docs/v3/ban-giao/luoc-do-v1.md` | §7 THAY ĐỔI (bảng 002 · bảng mã · 3 cột `don_hang` · `san_pham`/`goi_gia`)    |

### Bốn cửa an toàn — mỗi cửa một lý do khác nhau, đo RIÊNG

| Cửa                 | Chặn cái gì                                           | Ca đo                  |
| ------------------- | ----------------------------------------------------- | ---------------------- |
| (a) `V3_POS_GHI`    | máy chưa được phép ghi ⇒ **không chạm mạng**          | A1·A2 · cổng ⑤a        |
| (b) bảng chuyển     | cặp lạ / mã chưa xác minh / **mọi đường tới xoá đơn** | M3·M4·B1 · cổng ⑤b·③b  |
| (c) compare-and-set | sale vừa đổi tay ⇒ **không ghi đè**                   | C1·C2 · cổng ⑤b2       |
| (d) nhật ký hai pha | mất phản hồi ⇒ **dòng mồ côi đọc ra được**            | D1·D2·D3·D4 · cổng ⑤b3 |

Vế đắt của mọi ca là **đếm lượt gọi API**, không phải `assert.rejects`: một cửa «chặn»
mà vẫn kịp bắn PUT thì đơn khách đã hỏng, trong khi bộ ca chỉ nhìn tên lỗi vẫn xanh
(án lệ #29). Ca `D3` là ca CHO-QUA thật (GET 1 · PUT 1 · hai pha đủ · gương CSDL theo
POS), ca `D4` là chiều VỀ — không chỉ đo chiều chặn.

---

## 3 · Quyết định + cái giá phải trả (luật 13 skill)

### 3.1 · UPDATE phải đi qua cửa hẹp `src/pos/kho.js`, KHÔNG qua `suaTheoId`

Tầng L0-M2 tự khai lỗ này (`tang-truy-van-v1.md` §3): **`suaTheoId` không hỗ trợ
`ctxHeThong()`**, «mở phiếu mới nếu L1+ cần». L1-M1 cần — đọc lại đơn là phải refresh
`trang_thai_pos`, `ton_kho`. Mà toàn bộ dữ liệu đậu ở team KỸ THUẬT `chua-phan`, nơi ctx
người thật BỊ TỪ CHỐI ⇒ **buộc phải ctxHeThong** ⇒ không còn đường UPDATE hợp lệ nào.

Phiếu ③ cấm đụng `src/db/`. Chọn: giữ **một** cửa UPDATE hẹp ở `src/pos/kho.js`, bó chặt
hết mức — 4 bảng deny-by-default · luôn kẹp `team_id` trong WHERE · **mọi lượt ghi một
dòng `nhat_ky`** qua `ghiNhatKy` (đúng như tầng truy vấn làm với ctxHeThong) · không có
hàm xoá. **Giá phải trả:** repo có HAI đường ghi thay vì một cho tới khi phiếu
`suaTheoId`-cho-ctxHeThong ra (nợ §9). ĐỌC và THÊM vẫn đi qua `layNhieu`/`themMoi` của
L0-M2 — không tự viết SELECT/INSERT nào.

### 3.2 · `trang_thai_he = 'moi_tu_pos'` là GIẢ ĐỊNH khai rõ

Cột NOT NULL nên buộc phải có giá trị lúc tạo dòng, nhưng **từ vựng của cột là của
L3-M1**. Cửa POS gieo đúng một lần rồi KHÔNG BAO GIỜ đụng lại (ca `R3` đỏ nếu ai lỡ tay
— nó set `'dang_cho_khach'` rồi đọc lại POS và đòi giá trị đó còn nguyên). L3-M1 đổi tên
thì một câu UPDATE là xong. Ghi §9.

### 3.3 · `tong_tien` để NULL — fail-CLOSED về tiền

POS trả tiền ở **đơn vị nhỏ**, hệ số khác nhau theo tệ (AED/SAR/QAR/TWD ×100 ·
KWD/OMR/BHD ×1000), mà `don_hang.tong_tien` là `numeric(14,2)`. Chia 1.000 cho đơn KWD
là làm tròn mất chữ số thứ ba **ngay tại lượt ghi**; ghi thẳng số nhỏ (1300) vào cột tên
«tổng tiền» thì người đọc sau hiểu thành 1.300 — sai 1.000 lần theo hướng không ai nghi.
Cả hai đều là nói dối về tiền ⇒ **không ghi**. `tien_te` thì có (nhãn, an toàn). Quy ước
quy đổi phải khai MỘT chỗ cho cả hệ — nợ §9.

### 3.4 · Phải chép 12 dòng đọc `.env` (`src/pos/moi-truong.js`)

`db/khoa.js` đọc khoá từ `process.env`, nhưng **không script v3 nào nạp `.env` vào
`process.env`** — `db/ket-noi.js` có `docEnv` làm đúng việc đó nhưng KHÔNG export. Đo:
`npm run di-tru` chết ngay dòng đầu («Thiếu V3_KHOA_MA_HOA») dù `.env` có đủ biến ở dòng 83. Pathspec cấm sửa `db/ket-noi.js` ⇒ chép. Nợ §9 để gộp về một.
⛔ Hàm này **cố ý KHÔNG bù `V3_POS_GHI`**: van ghi POS phải do người vận hành gạt ở môi
trường tiến trình, không được «tự tìm thấy» trong một tệp nằm sẵn trong cây.

### 3.5 · `ghiNguocTrangThai` ĐÒI `market` tường minh

`don_hang` không có cột shop, và id đơn POS chồng nhau giữa các shop (§1.6). Đoán shop
từ `page_id` thì 17,4% đơn thật không có `page_id`. Fail-CLOSED: bắt người gọi khai.

### 3.6 · Chữ ký hàm thêm `pool` ở đầu

Phiếu viết `docDon(ctx, {...})`; code là `docDon(pool, ctx, {...})` — bám đúng chữ ký
của tầng L0-M2 (`layNhieu(pool, ctx, …)`), để cả v3 chỉ có một kiểu gọi.

---

## 4 · Nhánh test KHÔNG chạm, và vì sao

| Nhánh                                    | Vì sao                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| **PUT thật lên POS** (`guiDatTrangThai`) | ⑤c — chờ diễn tập VPS. Máy dev không có `V3_POS_GHI`, cổng cố ý không đặt |
| Chiều VỀ `12→0` **trên POS thật**        | cùng lý do; và đo cho thấy POS **chưa từng** dùng chiều này (§5)          |
| `docDanhMuc` với `retail_price > 0` thật | 128/128 biến thể thật đều giá 0 — nhánh chỉ đo được bằng mock (ca S4·S5)  |
| `giaKhongBietTe` ngoài đời               | cùng lý do trên                                                           |
| Mã trạng thái 13                         | 0 đơn thật đang đứng ở đó ⇒ chỉ đo được đường CHẶN (ca M4)                |

---

## 5 · Câu mà DIỄN TẬP VPS phải trả lời (⑤c)

1. **POS có nhận `12→0` không?** Đo 22/08 trên 1.400 đơn: `0→12` có **3 lượt thật**,
   `12→0` **0 lượt**; chiều lùi POS đang dùng là `12→1` (47 lượt) và `12→20` (11).
   Nếu POS chối `12→0` thì chiều về phải sửa thành `12→1` — sửa **bảng chuyển**, không
   sửa cửa.
2. **Khuôn body PUT**: lượt này gửi `{"status": <số>}` tới
   `PUT /shops/<shop>/orders/<id>?api_key=…`. Chưa ai xác nhận POS nhận đúng khuôn đó —
   bản đang chạy chỉ POST tạo đơn, chưa từng PUT.
3. Đơn dùng để diễn tập phải là **đơn nháp do chính lượt diễn tập tạo ra**.
   ⛔ Không đụng đơn khách, không xoá đơn nào ở bất kỳ trạng thái nào.

---

## 6 · Số đo cuối lượt

```
cổng l1-m1.sh (2 lượt liên tiếp)   24 ĐẠT / 0 TRƯỢT / 1 HOÃN
  ① migration 002 idempotent        _migrations 2 → 2 · down→up: bảng 0→1, don_hang 1→1
  ② ket_noi_pos                     nguồn 7 thị trường → đích 7 dòng · khoá nguyên văn 0
  ③ docDanhMuc Taiwan (POS THẬT)    san_pham 28/28 · goi_gia 0 (POS khai giá 0)
  ③b bảng mã                        14 mã đo lại · diff (rỗng) · hủy/hoàn 4,5,6,7 · 8=packing
  ④ docDon Taiwan (POS THẬT)        5 đơn · nguồn 4 messenger / 1 trang_ban_hang
                                    · 2 cột trạng thái khác nhau 6/6 · ma_pos thiếu shop 0
  ⑤a van đóng                       LoiVanGhiDong · API 0 lượt · nhat_ky bị chặn +1
  ⑤b cặp ngoài bảng                 LoiChuyenNgoaiBang · API 0 lượt · +1
  ⑤b2 compare-and-set               LoiTrangThaiDaDoi · PUT 0 lượt · +1
  ⑤b3 hai pha                       LoiPosKhongTraLoi · bắt-đầu 1 · kết-quả 0 (mồ côi)
  ⑤c ghi ngược THẬT                 ⏸ CHƯA CHẠY — chờ diễn tập VPS
  ⑥ thiếu ctx                       LoiThieuBoiCanhTeam
  ⑦ bộ ca l1-m1                     34 xanh / 0 đỏ
bộ ca chạy riêng                    34/34 xanh (2 lượt)
di trú trên CSDL dev                7 thị trường · lượt 2: thêm 0 · cập nhật 0 · giữ nguyên 7
```

---

## 7 · Hồi quy đã gây ra — CÓ, và đã ghi nợ

Thêm bảng thứ 20 làm **thước của L0-M1 đỏ** (án lệ #27 «sửa luật phải sửa cả thước»):

```
node --test test/l0-m1-luoc-do.test.js  →  pass 10 / fail 2   (S1 dòng 63 · S12 dòng 321)
bash ops/bin/nghiem-thu/l0-m1.sh        →  51 phép · ĐẠT 47 · TRƯỢT 4
```

Cả 6 mục đỏ cùng MỘT gốc: con số **19** neo cứng. Sửa = `19 → 20` + thêm `ket_noi_pos`
vào `NEO_19_BANG`. **Ngoài pathspec ③ của phiếu này** ⇒ ghi §9, không tiện tay sửa
(án lệ #25: hai phiếu cây chung cùng sửa một file thì hỏi tổng trước).

`_chan1.sh` chạy sau khi commit — số ở §10 sổ.

---

## 8 · Ngoài phạm vi, đã đổ §9 (7 dòng)

1. `NHOM_HUY_HOAN` sai trong bản đang chạy (8 = packing) — đếm thiếu đơn thành công.
2. Thước L0-M1 neo cứng 19 bảng ⇒ 2 ca + 4 phép cổng đỏ.
3. `suaTheoId` chưa có bản cho `ctxHeThong` ⇒ L1-M1 phải giữ cửa ghi thứ hai.
4. Quy ước quy đổi tiền (đơn vị nhỏ ×100/×1000) chưa khai chỗ nào ⇒ `tong_tien` NULL.
5. `docEnv` của `db/ket-noi.js` không export ⇒ hai bản đọc `.env` trong repo.
6. Từ vựng `don_hang.trang_thai_he` là của L3-M1; L1-M1 gieo tạm `'moi_tu_pos'`.
7. Danh mục POS có biến thể **trùng tên** (37/352 = 10,5% mẫu, Taiwan 12/28) — bot
   không phân biệt được biến thể khi báo giá/tồn.
