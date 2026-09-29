# MỞ VAN — VE1b + VE4b: màn thôi hứa «bot dùng ngay» (CR-28-09c)

> **TRẠNG THÁI: ĐANG MỞ — người quyết gật 29/09: «oke»** (trả lời «Deploy bản sửa này lên prod ngay … Gõ «deploy» là mình làm»).
> Phiếu: `phieu-VE1b-VE4b.md`. Lượt trước: `phat-hanh-20260929-ve3-ve4.md` (prod `9472153`).

## 1 · Mở cái gì

MÃ `9472153 → HEAD`: `b0b32b2` VE1b · `4b64551` VE4b + giấy. **0** migration (27) · **0** gói · **0** biến · **0** tệp bộ
não. 6 tệp giao diện (câu chữ + một trường ĐỌC `botDocKienThuc`/`botDocLuat` từ bộ đọc hiệu lực đã có). Đồ thị import:
`src/server.js` 0 · `src/queue/chay-worker.js` 0 · `v3/chay-that.js` 4 ⇒ **chỉ restart `aicloser-v3`**. Không cửa ghi mới.

## 2 · Bậc phơi

Bậc ② — prod, đường nội bộ. Hai màn đổi CÂU CHỮ cho người dùng v3. Khách không thấy gì (không đổi lời bot).

## 3 · Cửa vào (29/09, HEAD `df32981`)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | 0 tệp (trước CHANGELOG + tệp này) |
| ② | Nhánh | chưa đẩy 4 commit so với nhánh prod (`1203799` `b0b32b2` `4b64551` `df32981`) |
| ③ | `npm test` (đo riêng trên đúng mã `4b64551`, lượt `phat-hanh.sh` để HOÃN bằng `BO_QUA_TEST=1`) | **2.313 ca · 2.309 đạt · 0 đỏ · 4 bỏ qua** · lượt từ chối mới của Postgres.app trong lượt: 0 |
| ④ | Cổng | **35 xanh · 12 đỏ** — 12 đỏ trùng tên với nợ cũ (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2) |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑦ | Prod (12:27:25) | `9472153` · 0 tệp theo dõi sửa tại chỗ · ba dịch vụ active (`aicloser-v3` từ 11:49:06) · lỗi 1 giờ **0/0/0** · `/health` 129 |

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | mã mới trên đĩa + tiến trình mới nạp | `bo-luat.html` có `id="hieu-luc"` · `san-pham.html` có `veBotDocKt` · `kho-prompt.js` có `botGhepTuDuLieu` · `Started` sau giờ checkout | thiếu = điều tra |
| +1′ | cửa cũ còn sống | `/api/bo-luat` 401 · `/api/san-pham` 401 (chưa đăng nhập) · đối chứng 404 | 5xx = lùi |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ không chạm | `ActiveEnterTimestamp` · `/health` | đổi = điều tra |

(Không đo được «trường mới có trong JSON» khi chưa đăng nhập — cửa đòi phiên; thước là đĩa + tiến trình nạp lại + bộ ca Q5/U7.)

## 7 · Đường lùi

```bash
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 9472153 && systemctl restart aicloser-v3    # < 1 phút
```
Mất dữ liệu: không — lượt này chỉ đổi câu chữ và thêm một trường đọc.
