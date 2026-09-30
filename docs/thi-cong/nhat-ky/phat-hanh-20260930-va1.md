# MỞ VAN — VE-VA1: vá ba lỗi «tên chưa khai» (Số liệu › Tổng quan · Người và team)

> **TRẠNG THÁI: ĐANG MỞ — người quyết gật 30/09: «ok deploy đi»** (trả lời «Deploy VE-VA1 ngay không? … Gõ «deploy»»).
> Phiếu: `phieu-VE-VA1.md`. Lượt trước: `phat-hanh-20260930-ve5.md` (prod `91a98e7`).

## 1 · Mở cái gì

MÃ `91a98e7 → HEAD`: `557fbd9` VE-VA1 + giấy. Tệp chạy đổi: **hai tệp trang** (`bao-cao.html` · `cau-hinh-team.html`) — 0 module JS
máy chủ, 0 migration (27), 0 gói, 0 biến, 0 tệp bộ não. Còn lại: ca thử + cổng + công cụ quét (không chạy trên prod).
Restart: KHÔNG bắt buộc (lớp khung đọc lại tệp theo mtime + size — `khung-may-chu.js#docTep`) nhưng VẪN restart `aicloser-v3` để
chắc bản phục vụ = bản trên đĩa, cùng đường lùi quen (5 lượt restart trước đều sạch).

## 2 · Bậc phơi

Bậc ② — prod, đường nội bộ. Người dùng thấy: Tổng quan hiện số (thay ô lỗi); tạo người dùng không báo lỗi; nút chuyển page gửi
được (🔴 đổi chủ dữ liệu page — nút ĐÃ có hộp xác nhận «Chuyển N page sang team…?» từ trước, không đổi). Khách không thấy gì.

## 3 · Cửa vào (30/09, HEAD `0f0e897`)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | 0 tệp (trước CHANGELOG + tệp này) |
| ② | Nhánh | chưa đẩy 4 commit so với nhánh prod (`6f4be3b` `557fbd9` `0f0e897` + giấy này) |
| ③ | `npm test` (đo riêng trên đúng mã `557fbd9`; lượt `phat-hanh.sh` để HOÃN bằng `BO_QUA_TEST=1`) | **2.328 ca · 2.324 đạt · 0 đỏ · 4 bỏ qua** · lượt từ chối mới của Postgres.app: 0 |
| ④ | Cổng | **37 xanh · 13 đỏ** = 12 nợ cũ trùng tên + **`ll3.sh`** (N-CONGCHAP, lần thứ HAI). Dò: `ll3.sh` chạy riêng **3/3 xanh**; Postgres không từ chối lượt nào trong khung giờ cổng (đếm vẫn 65; các dòng ERROR trong log là ca CỐ Ý thử thao tác cấm). `ll3.sh` ⑤ chạy lại `ll2.sh` — nghi phạm của lần 29/09 (ca Postgres «hai lượt duyệt cùng lúc ⇒ đúng MỘT đơn POS»). Mã VA1 không chạm đường duyệt (hai tệp trang). Người quyết đã gật ⇒ đi tiếp; song song chạy lặp bốn tệp ca của `ll2.sh` 6 vòng, GIỮ output (kết quả ở §9) |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑦ | Prod (03:49:30) | `91a98e7` · 0 tệp theo dõi sửa tại chỗ · ba dịch vụ active (`aicloser-v3` từ 03:23:11) · lỗi 1 giờ **0/0/0** · `/health` 129 · dấu mã cũ: `T` khai 0 · `nap` khai 0 · `tuKhoTam` khai 1 |

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | mã MỚI trên đĩa | `const T = d.thuoc;` **1** (trước 0) · `async function nap()` đầu dòng **1** (trước 0) · dòng khai `tuKhoTam` **2** (trước 1: bản trong `veGanPage`) | thiếu = điều tra |
| +1′ | cửa vẫn sống | `/api/bao-cao` · `/api/team/gan-page` · `/bao-cao` 401 (chưa đăng nhập) · đối chứng 404 | 5xx = lùi |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ không chạm | `ActiveEnterTimestamp` · `/health` | đổi = điều tra |
| +1 ngày | người quyết mở Số liệu › Tổng quan thấy số; thử tạo người / chuyển page khi cần | người quyết | lỗi chặn việc = lùi |

## 7 · Đường lùi

```bash
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 91a98e7 && systemctl restart aicloser-v3    # < 1 phút
```
Mất dữ liệu: không — lùi là về lại ba lỗi cũ (không đường ghi mới nào sinh ra ở lượt này).
