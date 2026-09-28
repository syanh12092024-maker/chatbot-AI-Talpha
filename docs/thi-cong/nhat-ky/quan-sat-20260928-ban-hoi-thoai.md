# QUAN SÁT SAU DEPLOY — BÀN HỘI THOẠI (UI-HT1–4) TRÊN MÁY CHỦ · 28/09/2026

Người quyết: «deploy đi» (sau UI-HT4). **Không deploy thêm gì:** đo lúc nhận lệnh thì máy chủ đã ở
`c0b829f` = HEAD. UI-HT1–4 lên cùng lượt MỞ VAN MN5 của phiên song song, đúng lệnh người quyết «UI-HT1–4
đi cùng lượt» (bước A `4a9e234` mang UI-HT3 · bước D `7126689` mang UI-HT4 — nhật ký
`phat-hanh-20260928-mot-nguon.md`). Lượt này là CỬA SỔ QUAN SÁT cho phần bàn hội thoại. Mọi phép đo CHỈ
ĐỌC (SSH đọc + Pancake GET), in số đếm, không in nội dung tin; script đặt tạm trong `/opt/aicloser` rồi xoá.

## Máy chủ (`169.58.33.8`, môi trường PROD)

| Đo | Kết quả |
|---|---|
| Commit · sửa tại chỗ | `c0b829f` · 0 |
| Dịch vụ | `aicloser` · `aicloser-v3` · `aicloser-worker-v3` active từ 11:22 CEST |
| Dây nối bàn trong `v3/chay-that.js` | 6/6 (`docTinPancake` · `docSoAiBotCu` · `docHoiThoaiSql` · `docDauVetV3` · `giaiKichBanPage` · `laTinTuDong`) |
| Van gửi (`/proc/<pid>/environ` của `aicloser-v3`) | `PANCAKE_READONLY=1` · `V3_PANCAKE_GUI=0` |
| Đường HTTP | `/api/ban-hoi-thoai` 401 · `/api/ban-hoi-thoai/1/boi-canh` 401 · `/ban-hoi-thoai` 302 → đăng nhập |
| Log `aicloser-v3` từ lúc chạy, dòng nhắc bàn hội thoại | 0 |

## Hành vi — chạy ĐÚNG đường mã của bàn (cổng thật · SQL · Pancake GET · kho token như `chay-that.js`)

Lượt đầu script THIẾU kho token CSDL (`chay-that.js:102`) — đo lại với đủ dây: kho token CSDL trên máy
chủ = **0 token**, nên hai lượt dùng cùng bộ token với tiến trình thật; số dưới là số của lượt đủ dây.

| Đo | Kết quả | Nghĩa |
|---|---|---|
| Ba lát danh sách | «Cần người» 0 · «Bot đang xử» 0 · «Tất cả» 0 (37–91 ms) | 0 việc mở; hội thoại chạm gần nhất **24/08**, trong 7 ngày: 0 ⇒ **sale mở bàn thấy ba tab trống**, chỉ tìm theo SĐT/psid mới ra |
| Mẫu A — 30 hội thoại chạm gần nhất: đọc chat | **4/30** · 17 «chưa có mã khách» (không trong hàng đợi v3 lẫn Sổ AI) · 9 Pancake «Không có quyền hạn trên trang này» | Hội thoại mới nhất phần lớn bot cũ chưa từng trả lời ⇒ Sổ AI không có mã khách |
| Mẫu B — 20 hội thoại Sổ AI có lượt bot trả lời: đọc chat | **9/20** · 8 «không có quyền hạn trên trang này» · 3 «gói cước của người dùng này đã hết hạn» | ~½ page token máy chủ không đọc được — việc TÀI KHOẢN Pancake, không phải mã |
| Nhãn nguồn (mẫu B, 9 hội thoại đọc được) | khách 42 · **Bot AI 13** · Tự động 55 · Page 39 · 9/9 hội thoại có ≥1 tin «Bot AI» · Sổ AI ghi 15 lượt bot cho 9 hội thoại ấy | ~13/15 lượt bot nhận ra (cửa sổ 60 tin cuối có thể cắt bớt) |
| Cột bối cảnh (mẫu A) | ném **0** · kịch bản 30/30 · đơn đang bàn 28/30 · tên Messenger 13/30 · hồ sơ khách 2/30 · Sổ AI v3 0 («chưa có dữ liệu» đúng) · p50 95 ms · max 370 ms | Chạy đúng trên cổng thật (lỗi UI-HT1 không tái phát) |
| 5 hội thoại có đơn gắn | 5/5 ra «đơn đang bàn» · POS: Đã giao 1 · Đang giao 2 · Đã thu tiền 2 | Nhãn POS ra chữ trên dữ liệu thật |
| Đọc chat | p50 14 ms (nhớ 60 s + lỗi nhanh) · max 2,6 s | — |

## Kết

**Giữ.** Bàn hội thoại chạy đúng trên máy chủ, không lỗi, không gửi gì ra ngoài. Ba điều người quyết cần
biết trước khi giao màn này cho sale:

1. **Mở ra là trống** — bot im từ 24/08 nên cửa sổ 7 ngày rỗng, và 0 việc mở. Đề nghị: lát «Tất cả» khi
   cửa sổ rỗng thì hiện 100 hội thoại mới nhất (chỉ đổi truy vấn, không đổi lược đồ) — chờ người quyết.
2. **Khoảng ½ page token máy chủ không đọc được** («không có quyền hạn» / «gói cước hết hạn») — việc người:
   cấp token Pancake có quyền trên các page đó (kho token CSDL đang 0 token).
3. **Hội thoại mới nhất đa số không có mã khách** (17/30) — Sổ AI chỉ có mã cho hội thoại bot cũ từng trả
   lời. Hội thoại nào qua hàng đợi v3 (khi bot bật lại) thì tự có mã.

Chưa đo: màn trên trình duyệt với tài khoản sale thật (cần tài khoản) — HTTP đã chứng minh đường mắc đúng.
