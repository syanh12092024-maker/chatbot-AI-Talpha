# [L0-M3] Đăng nhập, chọn team, hai vai

## Việc cần làm

Viết phần danh tính: đăng nhập bằng tên và mật khẩu, chọn team trong số team người đó
thuộc về, hai vai tối thiểu (**quản trị** và **sale**), và **dựng ra bối cảnh team** rồi
gắn vào `req.boiCanh` cho mọi đường đi sau đó. Kèm hai màn hình: đăng nhập và chọn team.

Đây là **điểm bàn giao #5** — người A dùng bối cảnh này ở tầng truy vấn.

**KHÔNG làm:** năm vai đầy đủ và phân quyền chi tiết (giai đoạn 2), quên mật khẩu, đăng ký
tài khoản, đăng nhập một lần (SSO), bảng điều phối, nhật ký.

## Bối cảnh

- Luồng: L0 — nền dữ liệu, team và đăng nhập
- Phụ thuộc: `v3/src/auth/boi-canh.js` (**đã viết xong**) và `v3/testkit/db-gia.js` (đã có)
- Chạy song song được với: L1-M4a (lõi model), L0-M4 (nhật ký)
- Nguồn quyết định: `01-QUYET-DINH.md` mục 8 (ba team) và mục 9 (vai và quyền)

## File được đụng

- `v3/src/auth/mat-khau.js` — băm và kiểm mật khẩu (tạo mới)
- `v3/src/auth/ve.js` — phát vé, đọc vé, ký HMAC (tạo mới)
- `v3/src/auth/kho-nguoi-dung.js` — đọc `nguoi_dung` / `thanh_vien_team` / `vai` (tạo mới)
- `v3/src/auth/lop-express.js` — middleware gắn `req.boiCanh`, `batBuocDangNhap`, `batBuocVaiHTTP` (tạo mới)
- `v3/src/auth/router.js` — các đường HTTP dưới đây (tạo mới)
- `v3/src/auth/index.js` — cửa ra vào của module (tạo mới)
- `v3/src/auth/trang/dang-nhap.html` · `v3/src/auth/trang/chon-team.html` (tạo mới)
- `v3/test/b/auth-mat-khau.test.mjs` · `auth-ve.test.mjs` · `auth-router.test.mjs`

## File CẤM đụng

- `v3/src/auth/boi-canh.js` — **hợp đồng với người A, chỉ import, KHÔNG sửa một dòng.**
  Cần thêm gì thì báo lại, đừng tự sửa.
- `v3/testkit/db-gia.js` — nền dùng chung, chỉ dùng
- `v3/src/audit/*` — của L0-M4. Cần ghi nhật ký thì **tiêm hàm từ ngoài**
  (`datPheuNhatKy`), tuyệt đối **không import** `../audit/…`
- `v3/src/model/*` · `v3/src/ui/*` — của module khác
- `v3/db/*` · `v3/src/db/*` · `v3/src/pos/*` · `v3/src/channels/*` · `v3/src/chat/*` ·
  `v3/src/orders/*` · `v3/src/queue/*` — của người A
- **Toàn bộ `src/` ở gốc repo** · `package.json` · `.env`

## Bảng dữ liệu

- Đọc: `nguoi_dung` · `thanh_vien_team` · `vai` · `team` — **bốn bảng dùng chung, KHÔNG có `team_id`**
- Ghi: không. (Tạo tài khoản là việc quản trị của giai đoạn 2.)
- Điều kiện team: **không áp cho bốn bảng trên** — đọc chúng *trước khi* biết team là gì,
  nên phải đọc bằng cổng cấp hệ thống. Xem "Con gà và quả trứng" bên dưới.

## Con gà và quả trứng — đọc kỹ, đây là chỗ dễ sai nhất

Muốn có bối cảnh team thì phải biết người này thuộc team nào. Muốn hỏi cơ sở dữ liệu thì
phải có bối cảnh team. Vòng luẩn quẩn.

Cách gỡ: **một cổng riêng, hẹp, chỉ cho bốn bảng dùng chung.**

```js
// kho-nguoi-dung.js
datCongDanhTinh(fn)   // fn() → cổng KHÔNG gắn team, người A giao. Chỉ dùng cho 4 bảng dùng chung.
```

- Cổng này **chỉ** chấp nhận `nguoi_dung` `thanh_vien_team` `vai` `team`. Bảng khác → ném lỗi.
- Nó **chỉ đọc**. Không có `them`/`sua`.
- Mọi thứ sau bước đăng nhập đi bằng cổng có team bình thường.

Ghi luật này vào ghi chú đầu file, kèm lý do — người sau đọc sẽ tưởng đây là cửa hậu.

## Thiết kế bắt buộc

### 1 · Mật khẩu — `mat-khau.js`

`node:crypto` `scrypt`, **không thêm dependency**.
Định dạng lưu: `scrypt$<N>$<r>$<p>$<muối base64>$<băm base64>`, mặc định `N=16384 r=8 p=1`, muối 16 byte, băm 64 byte.

```js
await bam(matKhau)                 // → chuỗi
await kiem(matKhau, chuoiDaBam)    // → bool, so bằng timingSafeEqual
```

So sánh phải dùng `crypto.timingSafeEqual`. Chuỗi băm sai định dạng → trả `false`, không ném.

### 2 · Vé — `ve.js`

`<payload base64url>.<HMAC-SHA256 base64url>`, ký bằng `V3_KHOA_VE`.
Payload: `{ nguoiDungId, tenDangNhap, teamId, vai:[], capLuc, hetHan, v:1 }`. Hạn **8 tiếng**.

```js
phatVe({ nguoiDungId, tenDangNhap, teamId, vai }, { hanMs })  // → chuỗi vé
docVe(ve)                                                      // → payload, hoặc ném LoiChuaDangNhap
```

- Thiếu `V3_KHOA_VE` → **ném lỗi lúc gọi hàm đầu tiên**, không tự sinh khoá tạm.
  Sinh khoá tạm thì mỗi lần khởi động lại là mọi người bị đá ra, mà không ai hiểu vì sao.
- Chữ ký sai / hết hạn / sai `v` → `LoiChuaDangNhap`, thông điệp **không** nói rõ sai chỗ nào
- So chữ ký bằng `timingSafeEqual`
- **Không nhét gì nhạy cảm vào payload** — vé đọc được bằng mắt, chỉ có chữ ký là không giả được

### 3 · Kho người dùng — `kho-nguoi-dung.js`

```js
await timTheoTen(tenDangNhap)          // → { id, ten_dang_nhap, mat_khau_bam, ho_ten, bat } | null
await teamCuaNguoi(nguoiDungId)        // → [{ teamId, tenTeam, vai }]
await vaiTrongTeam(nguoiDungId, teamId)// → [vai] | []
```

Tài khoản `bat === false` → coi như không tồn tại (cùng một thông điệp lỗi với sai mật khẩu).

### 4 · Đường HTTP — `router.js`

| Đường | Việc |
|---|---|
| `GET  /dang-nhap` | trả `trang/dang-nhap.html` |
| `POST /api/dang-nhap` | `{tenDangNhap, matKhau}` → sai thì **429-an-toàn** (xem dưới); đúng mà có **một** team → phát vé luôn; nhiều team → trả danh sách team, chưa phát vé |
| `POST /api/chon-team` | `{teamId}` kèm vé tạm → phát vé đủ quyền cho team đó |
| `GET  /chon-team` | trả `trang/chon-team.html` |
| `POST /api/dang-xuat` | xoá cookie |
| `GET  /api/toi` | → `{ nguoiDungId, tenDangNhap, teamId, vai, dsTeam }` |

- Vé đặt trong cookie `v3_ve`: `HttpOnly` · `SameSite=Lax` · `Path=/` · `Secure` khi
  `NODE_ENV==='production'` · `Max-Age` khớp hạn vé
- **Sai mật khẩu và không có tài khoản trả về CÙNG một thông điệp** ("Sai tên đăng nhập hoặc
  mật khẩu"), cùng độ trễ. Khác nhau là chỉ điểm cho người dò tài khoản.
- **Hãm thử sai:** cùng một `tenDangNhap` sai quá **5 lần trong 15 phút** → trả `429` trong
  15 phút. Bộ đếm trong RAM là đủ cho giai đoạn 1 (một tiến trình); ghi chú rõ giới hạn đó.
- Mọi lần đăng nhập, đăng xuất, đổi team, đăng nhập hỏng → **ghi nhật ký** qua phễu tiêm
  (`datPheuNhatKy`), mã lấy đúng chữ ở `L0-M4`: `dang_nhap` `dang_xuat` `doi_team`
  `dang_nhap_that_bai`. Chưa tiêm phễu → chỉ `console.warn`, không ném.

### 5 · Middleware — `lop-express.js`

```js
lopBoiCanh()                     // đọc cookie → req.boiCanh (im lặng khi chưa đăng nhập)
batBuocDangNhap()                // chưa có req.boiCanh → 401 { ma:'chua_dang_nhap' }
batBuocVaiHTTP(...vai)           // thiếu vai → 403 { ma:'thieu_vai' }, có ghi nhật ký
chanTeamTrenUrl()                // xem dưới
```

`chanTeamTrenUrl()` là lớp chặn quan trọng nhất về mặt nghiệm thu: nếu `req.query.team_id`
hoặc `req.body.team_id` có mặt **và khác** `req.boiCanh.teamId` → trả `403` `{ma:'chan_xuyen_team'}`
**và ghi nhật ký** `chan_xuyen_team`. Đây đúng là ca *"sửa tham số trên URL để truy vấn xuyên
team → bị chặn, có ghi nhật ký"* trong tiêu chí nghiệm thu của L0.

### 6 · Hai màn hình

HTML thuần một file, không khung nào, không gọi mạng ra ngoài. Dùng đúng hệ thiết kế của
dashboard đang chạy — chép biến CSS ở `public/ops.html` dòng 10–17:
`--pri:#0e7c86` · `--side:#0b2125` · `--r:12px` · nền `#f5f7f9` · chữ 13.5px SF Pro.

- `dang-nhap.html`: hai ô + nút, báo lỗi gọn, không lộ tài khoản có tồn tại hay không
- `chon-team.html`: **ba thẻ team** (Tiểu Alpha · Auus · Pialpha EU), mỗi thẻ ghi tên team
  và vai của mình trong team đó; bấm thẻ → `POST /api/chon-team` → về `/dieu-phoi`

## Tiêu chí xong — phải đo được

1. `npm test` xanh
2. `bam` rồi `kiem` đúng → `true`; sai một ký tự → `false`; chuỗi băm rác → `false` — có test
3. Vé bị sửa một ký tự → `docVe` ném `LoiChuaDangNhap`; vé hết hạn → cũng ném — có test
4. Thiếu `V3_KHOA_VE` → ném lỗi, **không** tự sinh khoá — có test
5. Đăng nhập người thuộc hai team → trả danh sách hai team, **chưa** phát vé đủ quyền;
   chọn team xong mới có vé mang `teamId` đó — có test
6. Chọn một team mình **không** thuộc → `403`, có ghi nhật ký — có test
7. `GET /api/…?team_id=<team khác>` với vé của team mình → `403` `chan_xuyen_team`, có ghi
   nhật ký — có test (đây là ca nghiệm thu của L0)
8. Sai mật khẩu 6 lần liên tiếp → lần thứ 6 trả `429` — có test
9. Sai mật khẩu và tài khoản không tồn tại → **cùng** mã lỗi, **cùng** thông điệp — có test
10. `req.boiCanh` dựng ra đi lọt `batBuocBoiCanh` không ném — có test
11. `git status` chỉ hiện file trong danh sách "File được đụng"

## Không nằm trong phạm vi

- Ba vai còn lại: marketer, quản lý, người duyệt kịch bản (giai đoạn 2)
- Marketer chỉ thấy sản phẩm mình phụ trách (giai đoạn 2)
- Quản trị xem xuyên team (giai đoạn 2)
- Bảng phiên để cắt vé đang sống — đã cân nhắc và ghi lý do ở hợp đồng mục 6
- Quên mật khẩu, đổi mật khẩu, tạo tài khoản
