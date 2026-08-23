# [L0-M4] Nhật ký thao tác

## Việc cần làm

Viết bộ nhật ký thao tác: **chỉ thêm, không sửa, không xoá**, ghi cả việc người làm lẫn
việc máy làm. Kèm một lớp Express tự ghi cho mọi yêu cầu làm thay đổi dữ liệu, và một
hàm đọc có chèn điều kiện team để màn "Nhật ký thao tác" dùng.

**KHÔNG làm:** màn hình nhật ký (giai đoạn 2), đăng nhập, lớp model, bảng điều phối.

## Bối cảnh

- Luồng: L0 — nền dữ liệu, team và đăng nhập
- Phụ thuộc: không. Bảng `nhat_ky` là bảng riêng, không ai đụng.
- Chạy song song được với: L1-M4a (lõi model), L0-M3 (đăng nhập)
- Nguồn quyết định: `docs/v3/01-QUYET-DINH.md` mục 9 — *"Nhật ký ghi đầy đủ, không sửa
  không xoá, ghi cả việc máy làm."*

## File được đụng — tạo mới hết

- `v3/src/audit/index.js` — cửa ra vào: `ghiNhatKy` `docNhatKy` `datPheuNhatKy` `datTaoTruyVan`
- `v3/src/audit/hanh-dong.js` — danh mục mã hành động (hằng số, không để chuỗi trần rải rác)
- `v3/src/audit/lop-express.js` — lớp Express tự ghi
- `v3/test/b/audit-ghi.test.mjs` · `v3/test/b/audit-lop-express.test.mjs`

## File CẤM đụng

- `v3/src/auth/boi-canh.js` — **đã viết xong, chỉ import, không sửa một dòng**
- `v3/src/auth/*` (mọi file khác) · `v3/src/model/*` · `v3/src/ui/*` — của module khác
- `v3/testkit/db-gia.js` — nền dùng chung, **chỉ dùng, không sửa**
- `v3/db/*` · `v3/src/db/*` · `v3/src/pos/*` · `v3/src/channels/*` · `v3/src/chat/*` ·
  `v3/src/orders/*` · `v3/src/queue/*` — của người A
- **Toàn bộ `src/` ở gốc repo** — bản đang chạy, 51 page khách thật
- `package.json` · `.env`

## Bảng dữ liệu

- Ghi: `nhat_ky` — **chỉ `INSERT`**
- Đọc: `nhat_ky`
- Điều kiện team: **CÓ**. Chèn ở cổng truy vấn (`db.them`/`db.chon` tự chèn `team_id`).
  Module này **không tự viết** điều kiện team, chỉ bắt buộc phải có bối cảnh.

Cột: xem `v3/docs/hop-dong-b-voi-a.md` mục 4.

## Code cũ dùng lại — đọc trước khi viết

| File | Lấy gì |
|---|---|
| `src/ai-log.js` | Sổ AI của bản đang chạy — cùng triết lý "chỉ thêm, là nguồn sự thật để tra ngược". Lấy **cách nghĩ**, không lấy code: sổ kia ghi ra JSON Lines, sổ này ghi vào bảng qua cổng truy vấn. |

Không có gì khác dùng lại được. Đây là phần mới.

## Giao diện bắt buộc

```js
// v3/src/audit/index.js
datTaoTruyVan(fn)      // fn(boiCanh) → cổng truy vấn. Người A nối vào lúc dựng ứng dụng.
datPheuNhatKy(fn)      // tuỳ chọn: chuyển tiếp mọi bản ghi ra ngoài (cảnh báo, Telegram…)

await ghiNhatKy(boiCanh, {
  hanhDong,            // BẮT BUỘC, lấy từ hanh-dong.js
  doiTuongLoai, doiTuongId,
  truoc, sau,          // hai đối tượng để so, tuỳ chọn
  ghiChu,
})
// → bản ghi đã lưu

await docNhatKy(boiCanh, { tuNgay, denNgay, hanhDong, nguoiDungId, doiTuongLoai, doiTuongId,
                           gioiHan = 200, buoc = 0 })
// → { dong: [...], tong }
```

Bảy luật của module này:

1. **Thiếu bối cảnh → ném lỗi.** `batBuocBoiCanh` gọi ở dòng đầu mọi hàm. Không trả rỗng.
2. **`tac_nhan` suy từ `boiCanh.nguon`**: `'phien'` → `'nguoi'`, `'may'` → `'may'`.
   Nơi gọi **không** được tự đặt `tac_nhan` — tự đặt là mở đường cho việc máy làm đội lốt
   người làm.
3. **Không có hàm sửa, không có hàm xoá.** Không viết chúng, kể cả để "tiện test".
4. **Ghi nhật ký hỏng không được làm hỏng việc chính.** `ghiNhatKy` bắt lỗi bên trong, in
   `console.error`, trả về `null` — **trừ** khi `hanhDong` nằm trong nhóm bắt buộc
   (`chan_xuyen_team`, `dang_nhap_that_bai`, `doi_model`, `doi_khoa`): nhóm này ghi hỏng thì
   **ném lỗi**. Sự cố an ninh mà nuốt lặng còn tệ hơn hỏng việc.
5. **`truoc`/`sau` phải lọc chỗ nhạy cảm.** Khoá bất kỳ có tên khớp
   `/khoa|key|token|mat_khau|password|secret|bearer|authorization/i` thì thay giá trị bằng
   `'«đã che»'`, đệ quy. Có test.
6. **Không tin thời gian của nơi gọi.** `thoi_gian` do module này đặt (`Date.now()`), tiêm
   được đồng hồ để test.
7. **`docNhatKy` không cho truyền `team_id`.** Truyền vào thì cổng truy vấn ném
   `LoiXuyenTeam` — để nguyên, không nuốt.

### `hanh-dong.js`

Ít nhất mười bốn mã, nhóm sẵn:

```
đăng nhập:  dang_nhap · dang_xuat · dang_nhap_that_bai · doi_team
an ninh:    chan_xuyen_team · thieu_vai
model:      doi_model · doi_khoa · chuyen_du_phong · lop_model_hong
điều phối:  nhan_viec · dong_viec · mo_lai_viec
máy làm:    viec_tu_dong
```

Kèm `nhomBatBuoc` (bốn mã của luật 4) và `moTa(ma)` → chữ tiếng Việt cho màn hình.

### `lop-express.js`

```js
lopNhatKy({ boQua = [/^\/api\/suc-khoe/], layDoiTuong })   // → middleware Express
```

- Chỉ ghi khi phương thức là `POST` `PUT` `PATCH` `DELETE` **và** phản hồi 2xx
- Ghi sau khi phản hồi xong (`res.on('finish')`) để không làm chậm đường trả về
- `hanhDong` mặc định `viec_tu_dong` khi nơi gọi chưa đặt `res.locals.hanhDong`
- Lấy `ip` từ `req.ip`; ghi `sau` = thân yêu cầu **đã lọc chỗ nhạy cảm**
- Chưa đăng nhập (`req.boiCanh` rỗng) → bỏ qua, không ném lỗi ra giữa đường trả về

## Tiêu chí xong — phải đo được

1. `npm test` xanh
2. Gọi `ghiNhatKy` không có bối cảnh → **ném** `LoiThieuBoiCanh`, không trả rỗng — có test
3. Đăng nhập team A rồi `docNhatKy` → chỉ ra dòng của team A, dù kho có cả dòng team B — có test
4. Truyền tay `team_id` của team B vào `docNhatKy` → ném `LoiXuyenTeam`, **và** kho ghi
   được một dòng `chan_xuyen_team` — có test
5. Không tồn tại hàm sửa/xoá: `Object.keys(await import(...))` không có mã nào khớp
   `/sua|xoa|update|delete/i` — có test
6. `ghiNhatKy` với `sau:{ khoa_api:'sk-abc' }` → dòng lưu ra `'«đã che»'` — có test
7. Bối cảnh máy (`boiCanhMay`) → `tac_nhan === 'may'` và `nguoi_dung_id === null` — có test
8. Cổng truy vấn hỏng (ném lỗi) với `hanhDong:'nhan_viec'` → `ghiNhatKy` trả `null`,
   không ném; với `hanhDong:'chan_xuyen_team'` → **ném** — có test
9. `git status` chỉ hiện file trong danh sách "File được đụng"

## Không nằm trong phạm vi

- Màn hình "Nhật ký thao tác" (nhóm 7, giai đoạn 2)
- Xuất nhật ký ra file
- Ký số / chống sửa ở tầng lưu trữ — cách chắc nhất là quyền của người dùng cơ sở dữ liệu,
  đã ghi thành yêu cầu cho người A ở hợp đồng mục 4
