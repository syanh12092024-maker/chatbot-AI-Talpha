# MỞ VAN — VE5 (Hộp thư) + VE5b (Tìm khách) theo bản vẽ (CR-28-09c)

> **TRẠNG THÁI: XONG · GIỮ (30/09 03:37 prod) — người quyết gật 30/09: «ok xong thì deploy luôn»** (trả lời báo «xong thì xin gật để deploy VE5 +
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

## 8 · Lệnh đã gõ

Giờ prod (CEST), 30/09:
1. đo đồ thị import — lượt đầu SAI: `for v in …; do node do-thi.mjs $v $D` trong zsh KHÔNG tách chữ `$D` ⇒ cả danh sách thành MỘT
   đối số ⇒ «chạm 0 tệp» ở cả ba điểm vào, kể cả `v3/chay-that.js` (vô lý) ⇒ đo lại bằng `xargs … < tệp`: server 0 · worker 0 ·
   chay-that 3. (Hai lượt trước dùng `$(echo $D)` / `eval` — có tách chữ, số đúng.)
2. commit giấy `91a98e7` · đẩy nhánh `c5dbacd..91a98e7`
3. mốc lùi `/var/backups/aicloser/truoc-ve5-20260930T012257Z/commit.txt` = `c5dbacd`
4. prod `checkout -f -B … origin/vao-ui-v3-17-09` → `91a98e7` · 0 tệp theo dõi sửa tại chỗ · migrate **áp mới 0 · tổng 27**
5. `systemctl restart aicloser-v3` lúc **03:23:11** — chỉ dịch vụ này

## 9 · Số đo

**+1′ (03:24:23) · +5′ (03:27:32) · +15′ (03:37:38), prod:** ba dịch vụ active · `Started` 0 · 1 · 0 ở cả ba mốc · lỗi mới
**0/0/0** · `ActiveEnterTimestamp` hai dịch vụ không chạm y nguyên (28/09 11:25:42 · 11:22:22) · `/health` 129 · mã MỚI phục vụ:
`/api/ho-so-khach/cua` **401** (trước deploy **404**) · đối chứng 404 · `/api/hop-thu/don/1` 401 · `/ho-so-khach` 401 · trên đĩa:
`data-loc="can"` 1 · `ban-ht-tim-cu` 1 · `theDon` 1 · `napCua` 1.

## 10 · Kết · nợ · ai gật

- Kết: **GIỮ** (prod, 30/09 03:37). Mốc +1 ngày: sale dùng Hộp thư mới + Tìm khách (người quyết).
- Nợ phát sinh: không. Bắt được trong lượt (ngoài phạm vi VE5): **màn Số liệu › Tổng quan hỏng trên prod từ 25/09** (`bao-cao.html`
  dùng `T` không khai trong `tai()` ⇒ lượt tải thành công nào cũng rơi vào ô lỗi «Chưa lấy được số từ tiến trình bot») — sửa ở
  VE6a, không vá lẻ trong lượt này.
- Người gật: người quyết, 30/09 — «ok xong thì deploy luôn».
