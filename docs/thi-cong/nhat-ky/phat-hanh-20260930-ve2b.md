# MỞ VAN — VE2b: Page gộp nốt (Kịch bản vào trang một page · danh sách vào thẳng) (CR-28-09c)

> **TRẠNG THÁI: XONG · GIỮ (30/09 06:58 prod) — người quyết gật 30/09: «deploy»** (trả lời «Gõ «deploy» là mình đưa lên prod rồi theo dõi
> +1′/+5′/+15′ như mọi lần»). Phiếu: `phieu-VE2b.md`. Lượt trước: `phat-hanh-20260930-ve6.md` (prod `f7e620c`).

## 1 · Mở cái gì

MÃ `f7e620c → HEAD`: `4455431` VE2b + giấy (`1d01087` kết VE6 · `09ae436` nhật ký VE2b). **0** migration (27) · **0** gói · **0** biến ·
**0** tệp bộ não. Máy chủ: `/api/page-ds` nhận `?loc=&tim=` + trả số đếm/`moDanhSach` (đọc) · `/page-bot` danh sách thêm mã lọc
«Chưa có lời bot riêng» (đọc bảng `kich_ban`) · `/page` trần theo vai · `/kich-ban` chuyển hướng theo vai (cửa `/api/kich-ban/*` giữ
nguyên) · sổ màn. 0 cửa ghi mới — «Chạy lại bản này» ở tab Lịch sử đi qua đúng cửa `luu-chay` đã có, cùng vai.

**Đồ thị import (xargs, đo đúng):** `src/server.js` (bot cũ, ĐANG phục vụ khách) 97 tệp · chạm tệp đổi **0** · `src/queue/chay-worker.js`
95 tệp · chạm **0** · `v3/chay-that.js` chạm 5 tệp (man-hinh · kich-ban/router · mot-page/kho · mot-page/router · page-bot/kho) + trang
tĩnh ⇒ **chỉ restart `aicloser-v3`**.

## 2 · Bậc phơi

Bậc ② — prod, đường nội bộ. Màn Page đổi cho quản trị · quản lý · marketer (prod hôm nay: 3 thành viên, cả 3 quản trị). Khách không
thấy gì; lời bot không đổi trừ khi người dùng tự bấm «Chạy lại bản này» (hỏi trước, cùng cửa cũ).

## 3 · Cửa vào (30/09)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | 0 tệp ngoài CHANGELOG + tệp này (lượt 2 đếm «2» = đúng hai tệp đó, commit ngay sau) |
| ② | Nhánh | chưa đẩy 5 commit so với nhánh prod (`1d01087` kết VE6 · `4455431` · `09ae436` · `11047f5` · giấy này) |
| ③ | `npm test` (đo riêng trên cây `09ae436`; sau đó chỉ thêm giấy + sửa một thước cổng) | **2.368 ca · 2.364 đạt · 0 đỏ · 4 bỏ qua** |
| ④ | Cổng | **Lượt 1: 29 xanh · 25 đỏ** = 12 nợ cũ + **13 đỏ mới, MỘT gốc**: `ll3.sh` ④ «menu thật» còn neo thanh bên marketer = «Kịch bản của page»; 12 cổng kia đỏ DÂY CHUYỀN qua bước «cổng trước» (ll18 → ve1 → ve2 → ve3 → ve4 → ve5 → ve5b; ll5 · ll6 · ll10 · ll11 · ll13). Thước sót ở lượt phiếu (thợ chỉ chạy cổng phiếu + bộ ca). Sửa thước có khai căn cứ (`11047f5`), `ll3.sh` riêng 7/7 · **Lượt 2: 42 xanh · 12 đỏ = đúng 12 nợ cũ, so theo TÊN** (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2) · `ve2b` xanh |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` | 3 cảnh báo cũ `V3_GIA_*` (tên ghép động) — 0 dòng trong diff; lượt này không đặt biến |
| ⑦ | Prod (06:12:03 · đo lại 06:41:39) | `f7e620c` · 0 tệp theo dõi sửa tại chỗ · ba dịch vụ active (`aicloser-v3` từ 05:16:23) · lỗi 1 giờ **0/0/0** · `/health` **130** (129 lúc VE6 — số page của bot cũ tự đổi, không do lượt này) · dấu mã mới 0/0/0/0 · `/page` trần 302 (mã cũ) |

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | mã mới trên đĩa | `ganTrangThaiPage` · `moTuDauCum: true` · `veChuaChon` · `veKhoaBot` **1** (trước 0, đo 06:12:03) | thiếu = điều tra |
| +1′ | cửa vẫn sống | `/page-bot` · `/kich-ban` · `/api/page-ds` 401 · `/page` trần **302 → 401** (mã mới: phục vụ trang theo vai, chưa đăng nhập ⇒ 401) · đối chứng 404 | 5xx = lùi |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ KHÔNG restart | `ActiveEnterTimestamp` y nguyên · `/health` | đổi = điều tra |
| +1 ngày | người quyết mở Page: danh sách vào thẳng, bấm page → «← Tất cả page», tab Lời bot / Lịch sử | người quyết | lỗi chặn việc = lùi |

## 7 · Đường lùi

```bash
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 f7e620c && systemctl restart aicloser-v3    # < 1 phút
```
Mất dữ liệu: không — 0 migration, 0 cửa ghi mới. Lùi xong `/kich-ban` lại là màn cũ (cửa API không đổi ở cả hai bản).

## 8 · Lệnh đã gõ

Giờ prod (CEST), 30/09:
1. cửa vào lượt 1 (25 đỏ, một thước gốc `ll3.sh` ④) ⇒ sửa thước `11047f5` ⇒ lượt 2 (12 đỏ = nợ cũ) · đo lại ⑦ lúc 06:41:39 — y nguyên
2. commit giấy `7bb52b4` · đẩy nhánh `f7e620c..7bb52b4`
3. mốc lùi `/var/backups/aicloser/truoc-ve2b-20260930T044220Z/commit.txt` = `f7e620c`
4. prod `checkout -f -B … origin/vao-ui-v3-17-09` → `7bb52b4` · 0 tệp theo dõi sửa tại chỗ · migrate **áp mới 0 · tổng 27**
5. `systemctl restart aicloser-v3` lúc **06:42:41** — chỉ dịch vụ này

## 9 · Số đo

**+1′ (06:43:58) · +5′ (06:48:07) · +15′ (06:58:15), prod:** ba dịch vụ active · `Started` 0 · 1 · 0 ở cả ba mốc · lỗi mới **0/0/0** ·
`ActiveEnterTimestamp` hai dịch vụ không chạm y nguyên (`aicloser` 28/09 11:25:42 · worker 28/09 11:22:22) · `/health` 130 · `/page-bot` ·
`/kich-ban` · `/api/page-ds` 401 · `/page` trần **302 → 401** (mã mới: phục vụ trang theo vai) · đối chứng 404 · trên đĩa `ganTrangThaiPage` ·
`moTuDauCum: true` · `veChuaChon` · `veKhoaBot` đều **0 → 1**.

## 10 · Kết · nợ · ai gật

- Kết: **GIỮ** (prod, 30/09 06:58). Mốc +1 ngày: người quyết mở Page — danh sách vào thẳng (không đầu trang, không thanh tab), bấm một
  page ⇒ «← Tất cả page» về đúng lọc; tab Lời bot (Nhập từ file Pancake) · Lịch sử (xem / chép / chạy lại); `/kich-ban` cũ chuyển hướng.
- Bài học lượt này: thợ chỉ chạy cổng phiếu + bộ ca ⇒ một thước cổng cũ (`ll3.sh` ④) sót tới cửa vào. Đổi điều hướng thì chạy ĐỦ
  `phat-hanh.sh` trước khi nộp phiếu.
- Nợ: không phát sinh từ deploy. Nợ của phiếu ở §9 (N-VE2B-LUAT · 444 · DEM).
- Người gật: người quyết, 30/09 — «deploy».
