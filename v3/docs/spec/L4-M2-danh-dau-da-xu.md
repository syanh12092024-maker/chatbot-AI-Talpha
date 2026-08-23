# [L4-M2] Đánh dấu đã xử, chọn kết quả và lý do

## Việc cần làm

Thao tác **duy nhất** sale làm trên hệ thống này: nhận việc, rồi đóng việc bằng cách chọn
**kết quả** và **lý do**, kèm ô ghi **chi phí** khi đóng một đơn. Đắp vào màn chi tiết đã có
ở `L4-M1`.

**KHÔNG làm:** sửa lại hai danh sách hay màn chi tiết của `L4-M1` (chỉ đắp thêm vào chỗ đã
chừa), soạn tin nhắn, chỉnh đơn, tạo việc mới.

## Bối cảnh

- Luồng: L4 — bảng điều phối cho sale
- Phụ thuộc: **L4-M1 đã nghiệm thu xong** — dùng lại `kho-viec.js` (bảng lý do), `router.js`,
  `trang/chi-tiet-viec.html`
- Chạy song song được với: không có. Cùng thư mục với L4-M1 nên phải tuần tự.

## File được đụng

- `v3/src/ui/dispatch/dong-viec.js` — **tạo mới**: nhận việc, đóng việc, bảng kết quả và lý do
- `v3/src/ui/dispatch/router.js` — **sửa**: thêm ba đường `POST`. Giữ nguyên phần đã có.
- `v3/src/ui/dispatch/index.js` — **sửa**: xuất thêm hàm mới
- `v3/src/ui/dispatch/trang/chi-tiet-viec.html` — **sửa**: đắp vào đúng `<div id="o-dong-viec">`
  đã chừa sẵn. Không đổi ba khối đã có.
- `v3/src/ui/dispatch/trang/dieu-phoi.html` — **sửa**: thêm cột "đang xử bởi ai". Chỉ thêm cột.
- `v3/test/b/dispatch-dong-viec.test.mjs` — tạo mới

## File CẤM đụng

- `v3/src/ui/dispatch/kho-viec.js` · `chi-tiet.js` · `lien-ket.js` — **của L4-M1, đã nghiệm
  thu. Chỉ import.** Thiếu gì thì báo, đừng sửa.
- `v3/src/auth/boi-canh.js` · `v3/testkit/db-gia.js` — nền dùng chung, chỉ dùng
- `v3/src/auth/*` (mọi file khác) · `v3/src/audit/*` · `v3/src/model/*` — tiêm từ ngoài
- `v3/db/*` · `v3/src/db/*` · `v3/src/pos/*` · `v3/src/channels/*` · `v3/src/chat/*` ·
  `v3/src/orders/*` · `v3/src/queue/*` — của người A
- **Toàn bộ `src/` ở gốc repo** · `package.json` · `.env`

## Bảng dữ liệu

- Đọc: `viec_can_xu_ly`
- Ghi: `viec_can_xu_ly` — **CHỈ `UPDATE`, và chỉ chín cột nửa dưới**:
  `trang_thai` `nhan_boi` `nhan_luc` `ket_qua` `ket_qua_ly_do` `ghi_chu` `chi_phi_dong` `dong_luc`
  (cột thứ chín `nhan_boi_ten` nếu lược đồ có, không có thì bỏ qua)
- **Tuyệt đối không `INSERT`, không `DELETE`.** Dòng do người A chèn khi bot đẩy việc sang;
  xoá việc là xoá dấu vết bot đã dừng ở đâu. Xem hợp đồng mục 4.
- Điều kiện team: **CÓ**, do cổng truy vấn tự chèn.

## Thiết kế bắt buộc

### 1 · Máy trạng thái — ba trạng thái, hai bước

```
cho  ──nhận──▶  dang_xu  ──đóng──▶  da_xu
 │                                    │
 └────────── (không có đường tắt) ────┘
```

- Đóng một việc đang ở `cho` mà chưa nhận → **nhận hộ rồi đóng** trong cùng một giao dịch,
  `nhan_boi` là chính người đóng. Bắt sale bấm hai nút liên tiếp là kiểu bực mình vô cớ.
- Đóng một việc đã ở `da_xu` → **409**, kèm tên người đã đóng và mốc thời gian. Không ghi đè.
- Nhận một việc người khác đang xử → **409**, kèm tên người đang giữ. Không cướp im lặng.
- **Không có đường mở lại** trong giai đoạn 1. Mở lại là sửa dữ liệu đã chốt; ai cần thì
  quản trị làm ở giai đoạn 2. Mã `mo_lai_viec` đã có sẵn trong danh mục nhật ký, để dành đó.

### 2 · Kết quả và lý do — `dong-viec.js`

Tài liệu không chốt danh sách này, nên đây là **đề xuất của người B** và đã ghi vào sổ tay
mục "Chỗ tự quyết". Xếp theo cái sale bấm nhiều nhất:

| `ket_qua` | Chữ hiện ra | Cho loại | Có ô chi phí |
|---|---|---|---|
| `chot_duoc` | Chốt được | cả hai | **có** |
| `khach_tu_choi` | Khách từ chối | cả hai | không |
| `khach_khong_tra_loi` | Khách không trả lời | cả hai | không |
| `da_xu_ngoai` | Đã xử ở Pancake/POS | cả hai | không |
| `tra_lai_bot` | Trả lại cho bot | `hoi_thoai` | không |
| `day_nham` | Bot đẩy nhầm, không phải việc | cả hai | không |

Lý do đi kèm **bắt buộc** với `khach_tu_choi` và `day_nham` — hai cái này là thứ dùng để
sửa bot, không có lý do thì ghi nhận vô nghĩa:

```
tu_choi:  gia_cao · khong_tin · da_mua_cho_khac · khong_can_nua · giao_lau · khac
day_nham: bot_hieu_sai · khach_hoi_binh_thuong · trung_viec · loi_ky_thuat · khac
```

Kết quả khác thì lý do để trống được. `ket_qua_ly_do === 'khac'` → `ghi_chu` **bắt buộc**,
ít nhất 5 ký tự. Chọn "khác" rồi bỏ trống là mất luôn thông tin duy nhất có giá trị.

### 3 · Ô chi phí

Chỉ hiện khi `loai === 'don'` **và** `ket_qua === 'chot_duoc'`. Số nguyên **đồng**, ≥ 0,
≤ 100.000.000. Để trống được (không phải đơn nào cũng biết chi phí ngay).
Nhập số âm hoặc chữ → **400**, không âm thầm quy về 0.

### 4 · Hàm

```js
await nhanViec(boiCanh, viecId, { bay })
// → { ok, viec } | ném LoiDaCoNguoiGiu (409)

await dongViec(boiCanh, viecId, { ketQua, lyDo, ghiChu, chiPhi, bay })
// → { ok, viec } | ném LoiDaDong (409) | LoiThieuLyDo (400) | LoiKetQuaLa (400)

bangKetQua(loai)   // → danh sách kết quả hợp lệ cho loại đó, kèm chữ và cờ có ô chi phí
bangLyDo(ketQua)   // → danh sách lý do hợp lệ
```

Cả hai hàm chạy trong `db.giaoDich` — đọc trạng thái rồi ghi trong cùng một giao dịch, để
hai sale bấm cùng lúc thì đúng một người thắng.

Cả hai hàm **ghi nhật ký** qua phễu tiêm: `nhan_viec` và `dong_viec`, `truoc`/`sau` là chín
cột nửa dưới. Nhật ký ở đây không phải để cho đẹp — đó là cách duy nhất trả lời "ai đóng
việc này, lúc nào, vì sao" khi có tranh cãi.

### 5 · Đường HTTP

| Đường | Việc |
|---|---|
| `POST /api/dieu-phoi/viec/:id/nhan` | nhận việc |
| `POST /api/dieu-phoi/viec/:id/dong` | `{ketQua, lyDo, ghiChu, chiPhi}` |
| `GET  /api/dieu-phoi/bang-ket-qua?loai=` | danh sách kết quả và lý do cho màn hình |

Vẫn bắt buộc đăng nhập và vai `sale` hoặc `quan_tri`, dùng hàm tiêm sẵn có ở `router.js`.

### 6 · Đắp vào màn chi tiết

Trong `<div id="o-dong-viec">` (đã chừa sẵn, **đừng đổi id**):
- Nút "Nhận việc" khi `trang_thai === 'cho'`
- Khi đã nhận: nhóm nút chọn kết quả (`.seg` hoặc `.pill`), ô lý do hiện ra **sau khi** chọn
  kết quả cần lý do, ô ghi chú, ô chi phí chỉ hiện đúng điều kiện ở mục 3
- Đã đóng: hiện gọn "Đã xử bởi <tên> lúc <giờ> · <kết quả> · <lý do>", không có nút nào
- Lỗi 409 → hiện thẳng thông điệp máy chủ trả về ("Việc này <tên> đang giữ từ 14:32"), đừng
  nuốt thành "có lỗi xảy ra"

Ở `dieu-phoi.html` thêm **đúng một cột** "Đang xử": trống khi `cho`, tên người khi `dang_xu`.

## Tiêu chí xong — phải đo được

1. `npm test` xanh
2. Nhận việc → `trang_thai='dang_xu'`, `nhan_boi` = người đăng nhập, `nhan_luc` có giá trị — có test
3. Nhận việc người khác đang giữ → **409**, dữ liệu **không đổi** — có test
4. Đóng việc đang ở `cho` → nhận hộ và đóng trong một lần, `nhan_boi` = người đóng — có test
5. Đóng lại việc đã `da_xu` → **409**, `ket_qua` cũ **không bị ghi đè** — có test
6. `ketQua='khach_tu_choi'` không có lý do → **400**; có lý do → qua — có test
7. `lyDo='khac'` mà `ghiChu` rỗng → **400** — có test
8. Ô chi phí: `loai='hoi_thoai'` mà truyền `chiPhi` → **400**; số âm → **400**;
   `loai='don'` + `chot_duoc` + `chiPhi=250000` → lưu đúng 250000 — có test
9. `ketQua='tra_lai_bot'` với `loai='don'` → **400** (kết quả đó chỉ dành cho hội thoại) — có test
10. Đóng việc của team khác → **404**, dữ liệu không đổi — có test
11. Mỗi lần nhận và đóng đều ghi đúng một dòng nhật ký, có `truoc`/`sau` — có test
12. Không có đường nào `INSERT` hay `DELETE` vào `viec_can_xu_ly`: quét mã nguồn module,
     không có `.them(` và `.xoa(` trên bảng đó — có test
13. Hai lời gọi `nhanViec` đồng thời trên cùng một việc → đúng **một** thành công — có test
14. `git status` chỉ hiện file trong danh sách "File được đụng"

## Không nằm trong phạm vi

- Mở lại việc đã đóng (giai đoạn 2)
- Báo cáo theo kết quả và lý do (giai đoạn 2)
- Chấm điểm sale, đo thời gian xử trung bình (giai đoạn 2)
- Đẩy thông báo khi quá hạn (giai đoạn 2)
