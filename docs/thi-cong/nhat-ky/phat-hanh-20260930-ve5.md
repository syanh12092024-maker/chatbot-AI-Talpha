# MỞ VAN — VE5 (Hộp thư) + VE5b (Tìm khách) theo bản vẽ (CR-28-09c)

> **TRẠNG THÁI: ĐANG MỞ — người quyết gật 30/09: «ok xong thì deploy luôn»** (trả lời báo «xong thì xin gật để deploy VE5 +
> VE5b cùng một lượt», đã nói trước điểm quyền: Tìm khách mở thêm cho sale). Phiếu: `phieu-VE5.md` · `phieu-VE5b.md`.
> Lượt trước: `phat-hanh-20260929-ve1b-ve4b.md` (prod `c5dbacd`).

## 1 · Mở cái gì

MÃ `c5dbacd → HEAD`: `3ceceeb` VE5 · `f9ecbe2` VE5b + giấy. **0** migration (27) · **0** gói · **0** biến · **0** tệp bộ não.
Đồ thị import (đo lại đúng cách — lượt đầu zsh không tách chữ `$D` nên ra 0 vô nghĩa, xem §8): `src/server.js` 0 ·
`src/queue/chay-worker.js` 0 · `v3/chay-that.js` 3 (`man-hinh.js` · `ho-so-khach/router.js` · `hop-thu/router.js`) ⇒ **chỉ restart
`aicloser-v3`**. Tầng dữ liệu: MỘT cửa ĐỌC mới (`GET /api/ho-so-khach/cua`) · MỘT trường đọc thêm (`posGhiMo` trên
`/api/hop-thu/don/:id`) · 0 cửa ghi mới — mọi lượt duyệt/sửa/loại đơn đi form cũ.

## 2 · Bậc phơi

Bậc ② — prod, đường nội bộ. Hộp thư đổi bố cục cho sale · quản trị; «Tìm khách» mở thêm cho sale (🔴 quyền, trong §10 bổ sung).
Khách không thấy gì: van gửi tin + van POS đóng (prod `V3_POS_GHI=0`, đo `/proc` 29/09) — thẻ đơn nói đúng điều đó.

## 3 · Cửa vào (30/09, HEAD `a6fb170`)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | 0 tệp (trước CHANGELOG + tệp này) |
| ② | Nhánh | chưa đẩy 6 commit so với nhánh prod (`7edaeb1` `3ceceeb` `2bbcc48` `f9ecbe2` `a6fb170` + giấy này) |
| ③ | `npm test` (đo riêng trên đúng mã `f9ecbe2`; lượt `phat-hanh.sh` để HOÃN bằng `BO_QUA_TEST=1`) | **2.324 ca · 2.320 đạt · 0 đỏ · 4 bỏ qua** · lượt từ chối mới của Postgres.app: 0 |
| ④ | Cổng | **37 xanh · 12 đỏ** — 12 đỏ trùng tên với nợ cũ (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2) · `ve5` `ve5b` mới xanh |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑦ | Prod (03:08:55) | `c5dbacd` · 0 tệp theo dõi sửa tại chỗ · ba dịch vụ active (`aicloser-v3` từ 29/09 12:39:14) · lỗi 1 giờ **0/0/0** · `/health` 129 · `/api/ho-so-khach/cua` **404** (mã cũ) · đối chứng 404 |

Bộ ca riêng: VE5 V1–V5 + L6 (Postgres) · VE5b B1–B5 · đảo-vá VE5 11/11 · VE5b 11/11 · bấm thật ba vai (Pancake GIẢ, van POS đóng
như prod) · bò 51 màn: 0 lỗi mới.

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | mã MỚI đang phục vụ | `/api/ho-so-khach/cua` **401** (trước deploy **404**, đo 03:08:55) · đối chứng `/api/khong-co-duong-nay` 404 · `/api/hop-thu/don/1` 401 · `/ho-so-khach` 401 | 404/5xx ở cửa mới = lùi |
| +1′ | trang mới trên đĩa | `ban-hoi-thoai.html` có `data-loc="can"` + `ban-ht-tim-cu` · `hop-thu-ui.js` có `theDon` · `ho-so-khach.html` có `napCua` | thiếu = điều tra |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ không chạm | `ActiveEnterTimestamp` · `/health` | đổi = điều tra |
| +1 ngày | sale dùng Hộp thư mới + Tìm khách | người quyết | lỗi chặn việc sale = lùi |

## 7 · Đường lùi

```bash
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 c5dbacd && systemctl restart aicloser-v3    # < 1 phút
```
Mất dữ liệu: không — 0 cửa ghi mới; đơn duyệt/sửa/loại vẫn qua cửa cũ (có ở `c5dbacd`). Lùi thì sale mất «Tìm khách» (trang về
vai quản trị · quản lý như cũ).
