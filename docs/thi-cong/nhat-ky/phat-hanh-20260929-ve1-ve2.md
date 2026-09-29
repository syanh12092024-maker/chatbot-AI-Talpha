# MỞ VAN — VE1 (Sản phẩm) + VE2 (trang một page) theo bản vẽ (CR-28-09c)

> **TRẠNG THÁI: ĐANG CHẠY — người quyết gật 29/09: «deploy»** (trả lời «Deploy VE1 + VE2 cùng một lượt?»).
> Phiếu: `phieu-VE1.md` · `phieu-VE2.md`. Lượt trước: `phat-hanh-20260929-khung-ban-ve.md` (prod `9821306`).

## 1 · Mở cái gì

MÃ `9821306 → HEAD`: `86d7aa6` VE1 · `bada2f4` VE2 + giấy. **0** migration (27) · **0** gói · **0** biến · **0** tệp bộ não.
Đồ thị import: `src/server.js` 0 tệp đổi · `src/queue/chay-worker.js` 0 ⇒ **chỉ restart `aicloser-v3`**. Tầng dữ liệu thêm
MỘT câu ĐỌC (`goi_gia` theo shop — `chiTietSanPhamGoc`) và MỘT cửa ĐỌC (`/api/page-ds`); không cửa ghi mới.

## 2 · Bậc phơi

Bậc ② — prod, đường nội bộ. Giao diện hai màn đổi cho mọi người dùng v3 khi restart. Khách không thấy gì: van gửi + van
POS đóng (đo 08:35, không đổi từ đó).

## 3 · Cửa vào (29/09, HEAD `c8ef783`)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | 0 tệp (trước CHANGELOG + tệp này) |
| ② | Nhánh | chưa đẩy 4 commit (`86d7aa6` `90ad57f` `bada2f4` `c8ef783`) |
| ③ | `npm test` (trên đúng mã `bada2f4` + K16) | **2.295 ca · 2.291 đạt · 0 đỏ · 4 bỏ qua** |
| ④ | Cổng | lượt `phat-hanh.sh` đầu: **31 xanh · 14 đỏ** = 12 nợ cũ + **`ll3` · `ll5` mới đỏ** (`ll5` gọi lại `ll3`). Dò: `ll3` chạy riêng 4/4 xanh · phát lại TOÀN chuỗi cổng hai vòng: chỉ 12 nợ cũ đỏ, `ll3`/`ll5` xanh cả hai · `ll3` cũng xanh bên trong `ll18` chạy ngay trước lượt đỏ · `ll2` (nghi phạm: ca «hai lượt duyệt cùng lúc» trên Postgres thật) chạy lặp 6/6 xanh · các cổng chuỗi không gọi mạng ngoài. ⇒ **chập chờn 1/~14 lượt, KHÔNG tái hiện, KHÔNG chẩn đoán được** — `phat-hanh.sh` vứt output của cổng đỏ (nợ §9 mới). Mã VE không đổi thứ `ll3` đo (13+ lượt xanh trên cùng mã). Quyết đi tiếp vì người quyết đã gật và rủi ro không đổi (giao diện, lùi < 1 phút) — ghi rõ ở đây để lần sau không đọc «14 đỏ» thành «12 đỏ» |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑦ | Prod (09:57:39) | `9821306` · 0 tệp sửa tại chỗ · ba dịch vụ active (`aicloser-v3` từ 09:21:33) · lỗi 1 giờ **0/0/0** · `/health` 129 · UI 302 |

Bộ ca riêng: VE1 (5 Postgres thật + U4 U6) · VE2 (P1–P4) · ll18 K1–K16 · đảo-vá VE1 10/10 · VE2 8/8 + K16 · e2e 48 màn
ba vai: 0 lỗi · 0 khung lệch · 0 HTML thô · ảnh đối chiếu bản vẽ (VE1 11 trạng thái có ghi thật · VE2 7 tab + 390/1200 px).

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | mã MỚI đang phục vụ | `/api/page-ds` **401** (cửa mới; mã cũ 404) · `/api/san-pham/goc/1/lich-su` **401** · `/san-pham` + `/page/1` chưa đăng nhập ⇒ 302 | 404/5xx ở cửa mới = lùi |
| +1′ | trang mới trên đĩa prod | `san-pham.html` có `class="chia-hai"` · `mot-page.html` có `class="chia-ba"` | thiếu = điều tra |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ không chạm | `ActiveEnterTimestamp` · `/health` | đổi = điều tra |
| +1 ngày | người dùng mở hai màn | người quyết | lỗi chặn việc = lùi |

## 7 · Đường lùi

```bash
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 9821306 && systemctl restart aicloser-v3    # < 1 phút
```
Mất dữ liệu: không — lượt này không thêm cửa ghi; mọi lượt ghi trên hai màn đi qua cửa ghi cũ (vẫn có ở `9821306`).

## 8 · Lệnh đã gõ

(điền khi gõ)

## 9 · Số đo

(điền khi đo)

## 10 · Kết · nợ · ai gật

- Người gật: người quyết, 29/09 — «deploy».
