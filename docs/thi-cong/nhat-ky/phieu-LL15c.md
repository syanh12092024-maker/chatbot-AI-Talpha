# PHIẾU LL15c — Team tự nhận diện: chọn team CHỈ cho quản trị · sale vào thẳng team mặc định + menu đổi nhỏ

> Làn 🟨 (luồng đăng nhập + thanh trên mọi màn) · CR-28-09c · 02/10/2026 · KHÔNG đụng bộ não · 0 gói · 0 migration · 0 biến.
> Commit `9e7d06c` · cổng `ops/bin/nghiem-thu/ll15c.sh` · ca `v3/test/b/ll15c-team-mac-dinh.test.mjs`.

## 1 · Đề bài

Người quyết 02/10: «Cho đăng nhập qua Google luôn. Tự nhận diện theo team, k có màn chọn team, chọn team chỉ dành cho quản trị,
bật tự động nhé». Hỏi thẳng hai chỗ không tự quyết được — người quyết chọn: **sale (thành viên cả ba team) ⇒ «Team mặc định + nút đổi
nhỏ»** · **đăng nhập Google: «Hoãn Google»** (Google không nhận địa chỉ IP trần; v3 đang mở bằng `http://169.58.33.8:3102`, không tên
miền, không HTTPS — đo nginx prod 02/10: mọi site đều IP + chứng chỉ tự ký). «Bật tự động» = LL15b bước 2 (đã mở van, xem
`phat-hanh-20261002-ll15b.md` §11).

**Phạm vi âm:** KHÔNG đăng nhập Google (hoãn) · KHÔNG hộp thư gộp ba team · KHÔNG đổi vé (một vé = một team) · KHÔNG đổi màn chọn team
của quản trị.

## 2 · Đo lại nguyên liệu

- `auth/router.js`: nhiều team ⇒ vé TẠM + `/chon-team` cho MỌI vai; một team ⇒ vào thẳng. Danh sách team đã lọc team kỹ thuật
  (`teamCuaNguoi`), xếp theo tên.
- Thanh trên (`khung.js`, máy chủ vẽ sẵn ở `khung-may-chu.js` + đường lùi `/api/dieu-huong`): chip tên team «▾» + «Đổi team» trong menu
  tài khoản đều dẫn sang `/chon-team` cho mọi vai.
- Sau LL15b prod: 10 sale × 3 team ⇒ mỗi sale đăng nhập là gặp màn chọn team.

## 3 · Đã làm

- **Đăng nhập** (`auth/router.js`): nhiều team + có vai quản trị ⇒ như cũ (vé tạm + màn chọn); nhiều team KHÔNG quản trị ⇒ vé đủ
  quyền cho team MẶC ĐỊNH = team dùng lần trước (cookie gợi ý `v3_team_cuoi`, HttpOnly, 180 ngày — KHÔNG mang quyền: chỉ chọn trong
  danh sách team thật của người) · chưa có thì team đầu theo tên; nhật ký `dang_nhap` ghi `team_mac_dinh`. `/api/chon-team` (đổi team)
  cũng ghi gợi ý. Vé đặt TRƯỚC gợi ý (nơi đọc `set-cookie` lấy cookie đầu là lấy vé).
- **Thanh trên**: `khung.js#doiTeamCua` (MỘT hàm cho máy chủ vẽ sẵn + đường lùi): một team ⇒ chip chỉ là chữ, không «Đổi team» ·
  quản trị nhiều team ⇒ như cũ · người khác nhiều team ⇒ chip mở **menu nhỏ «Đổi sang team»** (các team KHÁC), «Đổi team» trong menu
  tài khoản mở cùng menu đó; bấm ⇒ `POST /api/chon-team` ⇒ về màn đầu của vai; hỏng ⇒ nói lý do trong menu. Kiểu ở `kieu.css` (token).
- `03-MAN-HINH.md`: dòng Đăng nhập · Chọn team + màn Chọn team.

## 4 · Chọn A thay B

- **Team mặc định + menu nhỏ** (người quyết chọn) thay vì hộp thư gộp ba team: giữ nguyên mô hình một vé = một team (lớp chặn xuyên
  team không đổi). Giá: sale vẫn phải bấm đổi để xem hộp thư hai team kia.
- **Gợi ý team bằng cookie** thay vì cột CSDL: không migration; cookie chỉ là gợi ý (kiểm lại bằng danh sách team thật — ca C2:
  gợi ý team kỹ thuật / team không thuộc / rác ⇒ team đầu, không 403, không nhật ký chặn).

## 5 · Thước

- `vai-b-noi-day` «BẪY ①» neo «thuộc hai team thì phải hỏi chọn team» cho một SALE ⇒ đổi theo luật mới (vào thẳng); vé tạm của quản
  trị vẫn có `auth-router` tiêu chí 5 canh. `ll18-khung` K5 («lối đổi team ở mọi vai») vẫn xanh: `d.doiTeam` vắng ⇒ hành vi cũ.

## 6 · Kiểm (02/10, worktree `ll15c-team-phu-trach`)

- C1–C7 (6 ca; C7 chạy `dieu-huong.js` THẬT trong DOM giả) **6/6** · đảo-vá **18/18 ĐỎ** · cổng `ll15c.sh` **10/10** (lồng `ll15b.sh`).

## 7 · Nợ

- **N-GOOGLE-DANG-NHAP** đăng nhập Google hoãn: cần (a) tên miền + HTTPS cho v3 (Google không nhận IP trần), (b) OAuth Client ID loại
  Web trên Google Cloud Console — việc người. Có hai thứ đó thì làm: Google Identity Services + kiểm ID token bằng khoá công khai.
