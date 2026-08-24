# [B-S2] Đăng nhập và vai — sửa theo LƯỢC ĐỒ THẬT của người A

## Việc cần làm

`v3/src/auth/*` đang đọc **tên cột và mã vai do người B tự đoán** hồi lược đồ chưa có. Nay
lược đồ thật đã có (`db/migrate/001_nen.up.sql:25`). Sửa cho khớp.

Trong đó có **một bẫy im lặng nhất của cả dự án**, đọc kỹ mục ⚠️ bên dưới.

**KHÔNG làm:** không đụng lược đồ của A · không viết mảnh nối xuống `src/db/` thật · không
đụng `v3/src/ui/dispatch/*` (có agent khác làm song song) · không đổi cơ chế vé, cơ chế hãm
thử sai, hay cổng danh tính — **chỉ đổi tên cột, mã vai, và nhãn trên màn hình**.

## Nguồn sự thật — đọc trước khi sửa

- `db/migrate/001_nen.up.sql` dòng **25** (`nguoi_dung`), **35** (`vai`), **43** (`thanh_vien_team`), **15** (`team`)
- `docs/v3/ban-giao/luoc-do-v1.md` §1 và §2
- `docs/v3/ban-giao/tang-truy-van-v1.md` §5 và §6
- `v3/docs/lech-giua-gia-dinh-cua-B-va-luoc-do-that.md` mục **G6**

## ⚠️ BẪY IM LẶNG — sửa cái này trước, rồi mới sửa phần còn lại

```
B đang so:  vai.ma === 'quan_tri'     ← gạch DƯỚI
Thật là:    vai.ma === 'quan-tri'     ← gạch NGANG
```

Lệch một dấu. Hậu quả: **mọi người dùng đều thành không có vai**, `batBuocVaiHTTP` chặn sạch,
và màn hình **trông y hệt như phân quyền đang chạy đúng** — không lỗi, không cảnh báo, chỉ là
ai bấm cũng bị từ chối. Đây là loại lỗi tốn nhiều giờ nhất để tìm.

Năm mã vai thật (`01-QUYET-DINH.md` §9, lược đồ §2): `quan-tri` · `marketer` · `sale` ·
`quan-ly` · `duyet-kich-ban`. Giai đoạn 1 B chỉ dùng **hai**: `quan-tri` và `sale`.

**Bắt buộc:** thêm một bài test **đối chiếu thẳng** hằng số `VAI` của B với danh sách mã vai
trong `db/migrate/001_nen.up.sql` (đọc file, tách mã, so tập hợp). Gõ tay lại vào test là
đẻ bản sao thứ hai của cùng một sự thật — lần sau lệch nữa thì test vẫn xanh.

## Bảng đổi tên

### `nguoi_dung`

| B đang dùng | Thật | Ghi chú |
|---|---|---|
| `ten_dang_nhap` (UNIQUE) | **`email`** (UNIQUE) | ⚠️ kéo theo màn hình, xem dưới |
| `mat_khau_bam` | `mat_khau_hash` | `NULL` = **chưa đặt mật khẩu** → coi như không đăng nhập được |
| `bat` | `hoat_dong` | |
| `ho_ten` | `ten` | `NOT NULL DEFAULT ''` |

### `vai` · `thanh_vien_team` · `team`

| B đang dùng | Thật |
|---|---|
| `vai.ma = 'quan_tri'` | `'quan-tri'` |
| `thanh_vien_team` khoá chính ba cột | có `id` riêng + `UNIQUE (team_id, nguoi_dung_id, vai_id)` |
| `team` không lọc gì | ⚠️ **`WHERE NOT la_ky_thuat`** — xem dưới |

## Hai chỗ không phải đổi tên

### 1 · Màn chọn team CẤM hiện team kỹ thuật

`team` có bốn dòng: ba team nghiệp vụ + **`chua-phan`** mang cờ `la_ky_thuat`. Đó là chỗ đậu
của **toàn bộ dữ liệu di trú chưa chốt chủ** — 502 page · 18.790 hội thoại · 69 bản kịch bản.

**Một người chọn được nó là nhìn thấy khách của cả ba team cùng lúc.**

- `teamCuaNguoi()` và mọi chỗ liệt kê team phải **loại** `la_ky_thuat`
- Chọn team kỹ thuật → **403**, ghi nhật ký `chan_xuyen_team` (đang xử đúng cho team không
  thuộc rồi, mở rộng thêm ca này)
- Có test: gieo `chua-phan` vào kho giả, khẳng định nó **không** xuất hiện ở `/api/toi`,
  không xuất hiện trên `chon-team.html`, và chọn thẳng bằng API thì bị chặn

Cơ sở dữ liệu đã có trigger chặn gán thành viên vào team kỹ thuật, nhưng picker mù vẫn là một
đường rò ở tầng màn hình — đó là câu chữ trong hợp đồng của A.

### 2 · Đăng nhập bằng EMAIL, không phải tên đăng nhập

Đổi cột kéo theo cả đường đi:

- `POST /api/dang-nhap` nhận `{ email, matKhau }`. **Vẫn nhận `tenDangNhap`** làm tên cũ để
  không vỡ nơi gọi đang có, nhưng đọc `email` trước; ghi chú rõ tên cũ là đường lui.
- `dang-nhap.html`: nhãn **"Email"**, ô `type="email"`, `autocomplete="username"`
- `boiCanh.tenDangNhap` → giữ nguyên **tên trường** (hợp đồng với A, `v3/src/auth/boi-canh.js`
  là file CẤM đụng), nhưng **giá trị nay là email**. Ghi chú một dòng ở nơi dựng.
- Hãm thử sai khoá theo email đã hạ chữ thường (đang khoá theo tên, đổi khoá cho đúng)
- Ba ca hỏng vẫn phải trả **giống hệt nhau**: sai mật khẩu · không có tài khoản ·
  `hoat_dong = false` · **và thêm ca mới `mat_khau_hash IS NULL`**

## File được đụng

- `v3/src/auth/kho-nguoi-dung.js` · `router.js` · `lop-express.js` · `index.js`
- `v3/src/auth/trang/dang-nhap.html` · `trang/chon-team.html`
- `v3/test/b/auth-router.test.mjs` · `auth-ve.test.mjs` · `auth-mat-khau.test.mjs`

## File CẤM đụng

- **`v3/src/auth/boi-canh.js`** — hợp đồng với người A. Hằng số `VAI` nằm trong đó và **PHẢI
  đổi** `quan_tri` → `quan-tri`; đây là **ngoại lệ duy nhất**, sửa **đúng dòng đó**, không
  đụng gì khác trong file, và ghi một dòng ghi chú vì sao.
- `v3/src/ui/dispatch/*` — **có agent khác đang sửa song song**
- `v3/testkit/db-gia.js` · `v3/src/model/*` · `v3/src/vai-b.js` · `v3/test/b/vai-b-noi-day.test.mjs`
- `db/*` · `src/*` ở gốc repo · `.env` · `package.json`

## Tiêu chí xong — đo được

1. `node --env-file=.env --test v3/test/b/auth-*.test.mjs` → xanh, **0 fail**
2. **Bài test đọc thẳng `db/migrate/001_nen.up.sql`**, tách các mã vai trong lệnh chèn bảng
   `vai`, và khẳng định mọi giá trị của hằng `VAI` đều nằm trong đó. Gõ tay mã vai vào test
   = trượt tiêu chí này.
3. Quét `v3/src/auth/`: không còn `'quan_tri'`, `'ten_dang_nhap'`, `'mat_khau_bam'`,
   `'ho_ten'`, và không còn `bat` dùng như tên cột — test quét mã nguồn
4. Team `chua-phan` (`la_ky_thuat = true`) **không** lọt vào `/api/toi`; chọn thẳng nó bằng
   API → **403** + đúng một dòng nhật ký
5. `mat_khau_hash IS NULL` → không đăng nhập được, và trả **cùng** thân phản hồi với ba ca
   hỏng kia (so bằng `JSON.stringify`)
6. Đăng nhập bằng `email` chạy; gửi `tenDangNhap` (tên cũ) vẫn chạy
7. `?team_id=<team khác>` → vẫn **403** `chan_xuyen_team` + ghi nhật ký (bài cũ không được tụt)
8. Hãm 5 lần sai / 15 phút vẫn chạy, khoá theo email hạ chữ thường
9. `git status` chỉ hiện file trong danh sách trên

## Không nằm trong phạm vi

- Mảnh nối xuống `src/db/` thật — chờ `PHIEU-B-Y1`
- Ba vai còn lại (`marketer` `quan-ly` `duyet-kich-ban`) — giai đoạn 2
- Bảng phiên để cắt vé đang sống — đã ghi đánh đổi ở sổ tay mục 6
