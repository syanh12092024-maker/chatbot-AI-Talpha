# [L4-M1] Bảng điều phối — hai danh sách và màn chi tiết

## Việc cần làm

Dựng màn hình sale vào thẳng: **hai danh sách** (hội thoại cần xử · đơn cần xử), mỗi dòng
ghi **lý do bot đẩy sang** và **đồng hồ đếm ngược 10 phút**; bấm một dòng mở **màn chi tiết**
(đoạn chat + thông tin đơn + lý do); bấm tiếp là **nhảy thẳng sang Pancake hoặc POS**.

**KHÔNG làm:** đánh dấu đã xử và chọn kết quả — đó là `L4-M2`, làm sau, cùng thư mục.
Không làm: hàng chờ duyệt tạo đơn (`hang_cho_tao_don`, thuộc L3 của người A), không làm
dashboard cũ, không làm báo cáo.

## Vì sao màn này nghèo nàn có chủ ý

Sale **không làm việc trên hệ thống này**. Họ đã quen Pancake; bắt học một nơi làm việc mới
thì thường không ai dùng. Nên màn này chỉ là **bảng điều phối**: nói cho sale biết việc nào
đang chờ, vì sao, còn bao nhiêu phút — rồi đẩy họ sang chỗ họ vốn làm việc.

Thêm nút, thêm ô soạn tin, thêm bộ lọc đẹp đẽ vào đây là **đi ngược quyết định đã chốt**
(`01-QUYET-DINH.md` mục 10). Đừng làm.

## Bối cảnh

- Luồng: L4 — bảng điều phối cho sale
- Phụ thuộc: `v3/src/auth/boi-canh.js` (đã có), `v3/testkit/db-gia.js` (đã có)
- Chạy song song được với: L1-M4b+c
- Bản vẽ: `docs/v3/03-MAN-HINH.md` nhóm 1, hai màn "Bảng điều phối" và "Chi tiết việc cần xử"

## File được đụng — tạo mới hết

- `v3/src/ui/dispatch/kho-viec.js` — đọc `viec_can_xu_ly` và dựng hai danh sách
- `v3/src/ui/dispatch/chi-tiet.js` — gom dữ liệu cho màn chi tiết
- `v3/src/ui/dispatch/lien-ket.js` — dựng đường nhảy sang Pancake và POS
- `v3/src/ui/dispatch/router.js` — các đường HTTP
- `v3/src/ui/dispatch/index.js` — cửa ra vào, `datTaoTruyVan` · `datPheuNhatKy`
- `v3/src/ui/dispatch/trang/dieu-phoi.html` · `trang/chi-tiet-viec.html`
- `v3/test/b/dispatch-kho-viec.test.mjs` · `dispatch-chi-tiet.test.mjs` · `dispatch-router.test.mjs`

## File CẤM đụng

- `v3/src/ui/dispatch/dong-viec.js` và `trang/*dong*` — **của L4-M2, đừng tạo**
- `v3/src/auth/boi-canh.js` · `v3/testkit/db-gia.js` — nền dùng chung, chỉ dùng
- `v3/src/auth/*` (mọi file khác) · `v3/src/audit/*` · `v3/src/model/*` — của module khác.
  Cần ghi nhật ký hoặc bắt đăng nhập thì **tiêm hàm từ ngoài**, không `import '../../auth/…'`
  (trừ `boi-canh.js`) và không `import '../../audit/…'`
- `v3/db/*` · `v3/src/db/*` · `v3/src/pos/*` · `v3/src/channels/*` · `v3/src/chat/*` ·
  `v3/src/orders/*` · `v3/src/queue/*` — của người A
- **Toàn bộ `src/` ở gốc repo** · `package.json` · `.env`

## Bảng dữ liệu

- Đọc: `viec_can_xu_ly` · `khach` · `hoi_thoai` · `don_hang` · `page` · `so_ai`
- Ghi: **KHÔNG GHI GÌ.** Module này chỉ đọc. Ghi là việc của L4-M2.
- Điều kiện team: **CÓ**, do cổng truy vấn tự chèn.

Ranh giới với người A ở bảng `viec_can_xu_ly` (hợp đồng mục 4): **A chèn dòng, B đọc và
về sau chỉ sửa chín cột nửa dưới. B không bao giờ `INSERT`, không bao giờ `DELETE`.**

## Thiết kế bắt buộc

### 1 · Hai danh sách — `kho-viec.js`

```js
await hangCho(boiCanh, { loai, gioiHan = 100, buoc = 0, bay = Date.now() })
// loai: 'hoi_thoai' | 'don' | undefined (cả hai)
```

Lấy dòng `trang_thai ∈ {'cho','dang_xu'}`, sắp theo `han_luc` **tăng dần** — sắp gần hết
giờ nhất lên đầu, vì đó là thứ tự sale cần chứ không phải thứ tự tạo.

Mỗi dòng trả về thêm:

| Trường | Ý nghĩa |
|---|---|
| `conLaiMs` | `han_luc - bay`. Âm là đã quá hạn. |
| `quaHan` | `conLaiMs < 0` |
| `mucKhan` | `'thuong'` (>5 phút) · `'gap'` (0–5 phút) · `'qua_han'` |
| `lyDoChu` | lý do bằng tiếng người, tra từ `ly_do_ma`; không có mã thì lấy `ly_do` thô |
| `tenKhach` `soDienThoai` `tenPage` | gộp sẵn để danh sách không phải gọi thêm |

Và một bản tóm tắt:

```js
await tomTat(boiCanh, { bay })
// → { hoiThoai:{cho,quaHan}, don:{cho,quaHan}, quaHanTong, cuNhat:{id,phutQuaHan} }
```

`quaHanTong > 0` là **báo động** — tiêu chí nghiệm thu của L4: *"Quá 10 phút chưa ai nhận
→ báo động."*

**Gộp dữ liệu không được gọi N+1 lần.** Đọc một mẻ `viec_can_xu_ly`, gom `cust_id`/`page_id`/
`don_hang_id`, rồi đọc mỗi bảng **đúng một lần** bằng điều kiện mảng (`{ id: [...] }` — cổng
truy vấn nhận mảng nghĩa là `IN`). 100 dòng mà 300 lời gọi thì màn này chết ngay ngày đầu.

### 2 · Bảng lý do

Đặt trong `kho-viec.js`, xuất ra để `L4-M2` dùng lại:

```
khieu_nai        Khách khiếu nại
doi_tra          Khách đòi đổi hoặc trả hàng
hoan_tien        Khách đòi hoàn tiền
gia_dac_biet     Khách xin giá ngoài khung
loi_ky_thuat     Lỗi kỹ thuật, bot không trả lời được
ngoai_kich_ban   Câu hỏi ngoài kịch bản
khach_gian       Khách tỏ ra khó chịu
qua_luot         Hết ngân sách lượt của khách này
don_can_duyet    Đơn bot chốt, chờ sale duyệt
don_sai_thong_tin  Đơn thiếu hoặc sai thông tin
trung_don        Nghi trùng với đơn đã có
khac             Lý do khác
```

Mã lạ không có trong bảng → hiện nguyên mã, **không** gộp im lặng vào `khac`. Gộp im lặng
là cách chắc chắn để không bao giờ phát hiện ra bot đang đẩy việc vì một lý do mới.

### 3 · Màn chi tiết — `chi-tiet.js`

```js
await chiTietViec(boiCanh, viecId, { soTin = 20 })
// → { viec, khach, page, hoiThoai, donHang, doanChat:[...], lienKet:{pancake,pos}, lyDoChu }
```

- `doanChat`: `soTin` bản ghi gần nhất từ `so_ai` theo `page_id` + `cust_id`, sắp **cũ trước**
  để đọc như đoạn chat thật. Mỗi tin: `{ luc, ben:'bot'|'khach', chu, lane, maModel }`.
- `viecId` không thuộc team mình → cổng truy vấn trả `null` → router trả **404**, không phải
  403. Trả 403 là xác nhận "dòng này có tồn tại ở team khác" — rò rỉ đúng thứ lớp team sinh
  ra để giấu.
- Không có đơn (`loai==='hoi_thoai'`) → `donHang: null`, không ném.

### 4 · Đường nhảy — `lien-ket.js`

```js
lienKetPancake(pageId, convId)   // → 'https://pancake.vn/{pageId}?c_id={convId}' — dạng có thật,
                                 //   đang dùng ở src/ai-log.js:178 và 5 chỗ khác
lienKetPos(donHangId, { shopId })// → theo mẫu ở biến môi trường V3_POS_MAU_DON,
                                 //   mặc định 'https://pos.pages.fm/shops/{shop}/orders/{don}'
```

**Mẫu đường POS chưa được xác nhận bằng mắt** — bản đang chạy chỉ gọi API POS
(`https://pos.pages.fm/api/v1`, xem `src/pancake-orders.js:12`), chưa mở giao diện POS bao
giờ. Nên: để mẫu vào biến môi trường, và khi biến trống thì nút POS hiện dạng **mờ** kèm chú
"chưa cấu hình đường POS" thay vì dẫn người ta tới trang 404. Ghi việc này vào báo cáo.

### 5 · Đường HTTP — `router.js`

| Đường | Việc |
|---|---|
| `GET /dieu-phoi` | trả `trang/dieu-phoi.html` |
| `GET /viec/:id` | trả `trang/chi-tiet-viec.html` |
| `GET /api/dieu-phoi/hang-cho?loai=` | hai danh sách |
| `GET /api/dieu-phoi/tom-tat` | số đếm và báo động |
| `GET /api/dieu-phoi/viec/:id` | dữ liệu màn chi tiết |

Mọi đường **bắt buộc đăng nhập** và **bắt buộc vai** `sale` hoặc `quan_tri` — dùng hàm tiêm
từ ngoài (`datChanDangNhap`, `datChanVai`) chứ không import thẳng module auth.

### 6 · Hai màn hình

HTML thuần một file mỗi màn, không khung nào, không gọi mạng ra ngoài. Hệ thiết kế chép
biến CSS ở `public/ops.html` dòng 10–17 (`--pri:#0e7c86` · `--side:#0b2125` · `--r:12px` ·
nền `#f5f7f9` · chữ 13.5px). Có sẵn `.pill` `.card` `.panel` `.banner` — dùng lại tên lớp đó.

`dieu-phoi.html`:
- Dải báo động đỏ trên cùng khi `quaHanTong > 0`, ghi rõ **bao nhiêu việc quá hạn và việc
  cũ nhất quá bao nhiêu phút**
- Hai bảng cạnh nhau (một cột trên màn hẹp): "Hội thoại cần xử" · "Đơn cần xử"
- Mỗi dòng: tên khách · page · **lý do bằng chữ** · đồng hồ đếm ngược chạy thật
  (`setInterval` 1 giây, đếm phía trình duyệt từ `han_luc` — **không** hỏi máy chủ mỗi giây)
- Quá hạn → dòng nền đỏ nhạt, đồng hồ hiện `+3:20` thay vì đếm lùi
- Tự làm mới danh sách mỗi **15 giây**
- Bảng rỗng → chữ "Không có việc nào đang chờ", không phải bảng trống trơn

`chi-tiet-viec.html`:
- Ba khối: **lý do bot dừng** (nổi nhất, trên cùng) · **đoạn chat** · **thông tin đơn**
- Hai nút to: "Mở Pancake" · "Mở POS" — mở tab mới (`target="_blank" rel="noopener"`)
- Chưa có gì cho việc đánh dấu đã xử — chỗ đó `L4-M2` sẽ đắp vào, để sẵn một `<div
  id="o-dong-viec"></div>` rỗng ở cuối và **đừng** làm gì thêm

**Không nhét dữ liệu khách vào query string.** Mọi thứ đi qua đường `/api/...` với id.

## Tiêu chí xong — phải đo được

1. `npm test` xanh
2. Đăng nhập team A → danh sách **không có một dòng nào** của team B, dù kho có cả hai — có test
3. `GET /api/dieu-phoi/viec/:id` với id của team B → **404** (không phải 403) — có test
4. `?team_id=<team khác>` → `403` `chan_xuyen_team`, có ghi nhật ký — có test
5. Truy vấn không có bối cảnh → ném lỗi, không trả mảng rỗng — có test
6. Việc tạo cách đây 12 phút → `quaHan === true`, `mucKhan === 'qua_han'`,
   `tomTat().quaHanTong === 1` — có test, đồng hồ tiêm vào chứ không chờ thật
7. Sắp xếp: việc gần hết giờ nhất đứng đầu — có test
8. 100 việc trong kho → tổng số lời gọi cổng truy vấn **≤ 8** (đếm bằng cổng giả có bộ đếm),
   chứng minh không gọi N+1 — có test
9. `loai='hoi_thoai'` → mọi dòng trả về đều đúng loại đó — có test
10. Module này **không ghi** gì: chạy hết bộ test rồi so kho trước/sau → **không đổi** — có test
11. `git status` chỉ hiện file trong danh sách "File được đụng"

## Không nằm trong phạm vi

- Đánh dấu đã xử, chọn kết quả, ô chi phí (L4-M2)
- Hàng chờ duyệt tạo đơn (L3, người A)
- Đẩy thông báo ra Telegram khi quá hạn (giai đoạn 2)
- Tìm kiếm, bộ lọc theo ngày/sản phẩm/marketer (giai đoạn 2)
