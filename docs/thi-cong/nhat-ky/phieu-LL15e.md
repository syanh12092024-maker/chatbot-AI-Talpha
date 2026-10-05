# PHIẾU LL15e — Khoá tài khoản / rút vai CẮT phiên đang mở (nợ N-KHOA-PHIEN của LL15b)

> Làn 🟥 (quyền) · 05/10/2026 · KHÔNG đụng bộ não · 0 gói · 0 migration · 0 biến mới. Commit `2877564` · cổng
> `ops/bin/nghiem-thu/ll15e.sh` · ca `v3/test/b/khoa-phien.test.mjs`.

## 1 · Đề bài

Người quyết 02/10: «làm nốt … các phần còn lại». Nợ N-KHOA-PHIEN (LL15b §7): khoá tài khoản (người nghỉ) không cắt phiên đang mở —
vé mang vai tới khi hết hạn. Từ LL15b đồng bộ HRM TỰ khoá người nghỉ mỗi 24 giờ trên prod (`V3_HRM_TU_DONG=1`), nên lỗ này là lỗ thật.

**Phạm vi âm:** KHÔNG thêm bảng phiên · KHÔNG đổi đăng xuất (vẫn là xoá cookie; vé bị chép ra ngoài sống tới hạn) · KHÔNG tự cấp vai
mới vào vé đang sống.

## 2 · Đo lại nguyên liệu

- Vé (`v3/src/auth/ve.js`): chuỗi ký HMAC, payload `{ nguoiDungId, teamId, vai, capLuc, hetHan }`, 8 tiếng, không bảng phiên.
- `lopBoiCanh` (`lop-express.js`) dựng `req.boiCanh` THẲNG từ vé — không đọc CSDL.
- **Lỗ thứ hai tìm thấy khi đọc:** `POST /api/chon-team` lấy người từ vé tạm HOẶC vé cũ, chỉ kiểm `vaiTrongTeam` — KHÔNG kiểm
  `hoat_dong` ⇒ người đã bị khoá cầm vé cũ đổi team là được VÉ MỚI 8 tiếng (gia hạn vô hạn).
- Nơi khoá/rút vai: đồng bộ HRM (`src/hrm/dong-bo.js`, `UPDATE nguoi_dung SET hoat_dong = false …`, `DELETE FROM thanh_vien_team …`),
  màn Thành viên, SQL tay ⇒ chặn theo TRẠNG THÁI (hỏi lại CSDL), không theo sự kiện (bắt từng nơi ghi báo lại).

## 3 · Đã làm

- `kho-nguoi-dung.js#vaiConLaiCuaVe`: không còn dòng `nguoi_dung` / `hoat_dong = false` ⇒ `null` (cả vé tạm); vé đủ quyền ⇒ vai trên vé
  giao vai hiện tại trong team của vé; rỗng ⇒ `null`.
- `lop-express.js#lopBoiCanh` (nay async): MỘT cửa — hỏi `vaiConLaiCuaVe` trước khi gắn `req.veTam` hay dựng `req.boiCanh`; đệm
  `HAN_KIEM_PHIEN_MS` = 30 giây mỗi người × team × bộ vai; `null` ⇒ coi như chưa đăng nhập + MỘT dòng nhật ký `cat_phien` lúc chuyển
  trạng thái; bối cảnh mang vai CÒN LẠI; CSDL hỏng lúc kiểm ⇒ `next(e)` (500), không đoán; cổng danh tính chưa nối (router lẻ trong ca
  thử) ⇒ giữ hành vi cũ.
- `v3/docs/hop-dong-b-voi-a.md` mục 6.

## 4 · Chọn A thay B

- **Hỏi lại CSDL có đệm 30 giây** thay vì bảng phiên: không đổi lược đồ, phủ mọi nơi khoá; giá: khoá có hiệu lực trễ tối đa 30 giây và
  mỗi người × team tốn ≤ 4 câu đọc nhỏ mỗi 30 giây.
- **Vai thu hẹp ngay, nới rộng chờ đăng nhập lại** — chiều an toàn.
- **CSDL hỏng ⇒ 500** thay vì «chưa đăng nhập» (đá người dùng về màn đăng nhập trong khi lỗi là máy chủ) hay tin vé mù (mở lại lỗ).

## 5 · Thước

- 63 ca cũ của tầng danh tính (auth-router · auth-ve · dispatch-router · ll15c · ll15b gồm M8 Postgres đầu-cuối) xanh không sửa.
- Đảo-vá **9/9 ĐỎ**: bỏ kiểm `hoat_dong` · giữ vai trên vé · vé tạm không kiểm khoá · đệm không hết hạn · CSDL hỏng thì tin vé · ghi
  nhật ký mỗi lượt · coi như chưa nối cổng · bối cảnh dùng vai trên vé · vé tạm đi trước phép cắt.

## 6 · Kiểm (05/10, worktree `so-lieu-bq`)

- K1–K7 **7/7** (K6 dựng ứng dụng `dungPhanB` thật; K7 Postgres hộp cát + cổng danh tính thật + đúng câu SQL của đồng bộ HRM) · cổng
  `ll15e.sh` **10/10** (lồng `ll15d.sh`) · `npm test` **2.338 ca · 0 đỏ**.

## 7 · Nợ

- N-KHOA-PHIEN — ĐÓNG (chờ mở van).
- Đăng xuất vẫn không cắt vé đã bị chép ra ngoài (mục 6 hợp đồng) — giữ nguyên, ghi rõ.
