# [B-S1] Bảng điều phối — sửa theo LƯỢC ĐỒ THẬT của người A

## Việc cần làm

Toàn bộ `v3/src/ui/dispatch/*` đang đọc/ghi **tên cột do người B tự đoán** hồi lược đồ chưa
có. Nay lược đồ thật đã có (`db/migrate/001_nen.up.sql:228`). Sửa cho khớp.

**KHÔNG làm:** không đụng lược đồ của A · không viết mảnh nối xuống `src/db/` thật (việc
riêng, đang chờ `PHIEU-B-Y1`) · không đụng `v3/src/auth/*` (có người làm song song) ·
không đổi hành vi nghiệp vụ nào — **chỉ đổi tên và cách suy ra trạng thái**.

## Nguồn sự thật — đọc trước khi sửa

- `db/migrate/001_nen.up.sql` dòng **228** — bảng `viec_can_xu_ly` thật
- `docs/v3/ban-giao/luoc-do-v1.md` §3
- `v3/docs/lech-giua-gia-dinh-cua-B-va-luoc-do-that.md` mục **G5**

## Bảng đổi tên — đây là toàn bộ phần cơ học

| B đang dùng | Thật | Ghi chú |
|---|---|---|
| `loai: 'don'` | `loai: 'don_hang'` | ⚠️ đổi **giá trị**, không phải tên cột |
| `ly_do_ma` · `ly_do` | `ly_do_day` | gộp còn **một** cột, hiện nguyên văn |
| `tao_luc` | `day_luc` | |
| `nhan_boi` | `nguoi_nhan_id` | ⚠️ **bigint** khoá ngoại `nguoi_dung(id)`, không phải chuỗi |
| `ket_qua_ly_do` | `ly_do_dong` | |
| `chi_phi_dong` | `chi_phi` | `numeric(14,2)` — **nới**, đừng ép số nguyên |
| `page_id` `cust_id` `conv_id` | `hoi_thoai_id` `don_hang_id` | ⚠️ **đổi cách nối**, xem dưới |
| `trang_thai` | **KHÔNG CÓ CỘT NÀY** | phải suy ra, xem dưới |

## Ba chỗ không phải đổi tên — đọc kỹ

### 1 · `trang_thai` không tồn tại, phải suy ra

```
cho     = nguoi_nhan_id IS NULL     AND dong_luc IS NULL
dang_xu = nguoi_nhan_id IS NOT NULL AND dong_luc IS NULL
da_xu   = dong_luc IS NOT NULL
```

Máy trạng thái ba trạng thái của L4-M2 **giữ nguyên ý**, chỉ đổi cách đọc. Xuất một hàm
`trangThaiCua(viec)` ở `kho-viec.js` để **đúng một chỗ** biết công thức này — cả `chi-tiet.js`,
`dong-viec.js` và hai trang HTML đều gọi nó, không ai tự viết lại.

Việc **đang mở** = `dong_luc IS NULL`. Lược đồ đã có index bộ phận đúng theo vế đó
(`viec_can_xu_ly_mo ON (team_id, han_luc) WHERE dong_luc IS NULL`) — lọc theo đúng vế này.

### 2 · Không còn `page_id`/`cust_id` trên dòng việc

Trước đây `kho-viec.js` gộp `khach`/`page` bằng `cust_id`/`page_id` lấy thẳng từ dòng việc.
Nay **không có hai cột đó**. Đường nối thật:

```
viec_can_xu_ly.hoi_thoai_id → hoi_thoai → (page_id, psid, khach_id) → khach, page
viec_can_xu_ly.don_hang_id  → don_hang
```

Nghĩa là **thêm một mẻ đọc**: việc → hội thoại → (khách + page). Danh sách đi từ 3 lên **4**
lời gọi cổng. **Vẫn phải là một mẻ cho mỗi bảng, KHÔNG N+1** — gom id rồi đọc một lần bằng
điều kiện mảng, y như đang làm.

`lien-ket.js` cũng đổi: đường Pancake cần `page_id` + `conv_id`, nay lấy từ **`hoi_thoai`**
chứ không từ dòng việc. Việc loại `don_hang` không gắn hội thoại → **không có đường Pancake**,
nút hiện mờ (cơ chế nút mờ đã có sẵn, dùng lại).

### 3 · `nguoi_nhan_id` là khoá ngoại, không phải chuỗi tên

`dong-viec.js` đang ghi `nhan_boi = boiCanh.nguoiDungId` dạng chuỗi. Cột thật là `bigint`
tham chiếu `nguoi_dung(id)`. Giữ nguyên cách ghi (`boiCanh.nguoiDungId` vốn là id), nhưng:

- Hiển thị tên người nhận thì phải **tra bảng `nguoi_dung`**, không lấy thẳng cột ra in.
  Cột "Đang xử" trên `dieu-phoi.html` và dòng "Đã xử bởi …" ở màn chi tiết đều cần.
- Gom một mẻ như `khach`/`page`, không N+1.
- Không tra được (id lạ) → hiện `'(không rõ)'`, **không** hiện id trần.

## File được đụng

- `v3/src/ui/dispatch/kho-viec.js` · `chi-tiet.js` · `lien-ket.js` · `dong-viec.js` · `index.js`
- `v3/src/ui/dispatch/trang/dieu-phoi.html` · `trang/chi-tiet-viec.html`
- `v3/test/b/dispatch-kho-viec.test.mjs` · `dispatch-chi-tiet.test.mjs` ·
  `dispatch-router.test.mjs` · `dispatch-dong-viec.test.mjs`

## File CẤM đụng

- `v3/src/auth/*` — **có agent khác đang sửa song song**. Cần gì thì vẫn tiêm từ ngoài.
- `v3/testkit/db-gia.js` — cổng giả là chung, và nó vốn không biết tên cột. Chỉ dùng.
- `v3/src/model/*` · `v3/src/vai-b.js` · `v3/test/b/vai-b-noi-day.test.mjs`
- `db/*` · `src/*` ở gốc repo · `.env` · `package.json`

## Tiêu chí xong — đo được

1. `node --env-file=.env --test v3/test/b/dispatch-*.test.mjs` → xanh, **0 fail**
2. Quét cả `v3/src/ui/dispatch/`: **không còn** chuỗi `'ly_do_ma'` `'nhan_boi'` `'chi_phi_dong'`
   `'ket_qua_ly_do'` `'tao_luc'` `'cust_id'` `'conv_id'`, và không còn `loai: 'don'` (phải là
   `'don_hang'`) — có bài test quét mã nguồn khoá lại
3. Công thức trạng thái nằm ở **đúng một chỗ**: chỉ `kho-viec.js` chứa
   `nguoi_nhan_id`+`dong_luc` để suy trạng thái; file khác gọi `trangThaiCua()` — test quét
4. 100 việc + 100 hội thoại + 100 khách → tổng lời gọi cổng cho `hangCho` **≤ 5**, cho
   `tomTat` **≤ 6** (đếm bằng cổng có bộ đếm, như bài test đang có)
5. Việc `loai='don_hang'` không có `hoi_thoai_id` → nút Pancake **mờ**, không nổ
6. `chi_phi = 250000.50` lưu và đọc ra **đúng 250000.5**, không bị ép về số nguyên
7. Hai sale nhận cùng lúc → vẫn đúng **một** người thắng (giữ nguyên bài test cũ)
8. Người nhận không tra được trong `nguoi_dung` → hiện `(không rõ)`, không lộ id
9. Việc của team khác → vẫn `null` → router **404**
10. `git status` chỉ hiện file trong danh sách trên

## Không nằm trong phạm vi

- Mảnh nối xuống `src/db/` thật — chờ `PHIEU-B-Y1`
- `layNhieu` thiếu `LIMIT`/thứ tự giảm dần — nợ đã ghi, đừng vá ở đây
- Bất cứ thứ gì trong `v3/src/auth/*`
