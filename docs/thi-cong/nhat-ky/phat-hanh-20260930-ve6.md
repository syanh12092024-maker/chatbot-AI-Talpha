# MỞ VAN — VE6 (a · b · c): ba màn Số liệu theo bản vẽ (CR-28-09c)

> **TRẠNG THÁI: ĐANG MỞ — người quyết gật 30/09: «ok xong thì deploy luôn»** (trả lời «đề xuất deploy cả ba màn Số liệu một lượt …
> Gõ «deploy» là mình làm sau khi kiểm xong»). Phiếu: `phieu-VE6a.md` · `phieu-VE6b.md` · `phieu-VE6c.md`.
> Lượt trước: `phat-hanh-20260930-va1.md` (prod `47968b8`).

## 1 · Mở cái gì

MÃ `47968b8 → HEAD`: `1ecb8f9` VE6a · `aecd410` VE6b · `0405e8b` VE6c + giấy · kèm `0e57d5b` (`ops/bin/phat-hanh.sh` — chỉ chạy ở
máy dev, prod không gọi) và `2fd2474` (giấy VA1). **0** migration (27) · **0** gói · **0** biến · **0** tệp
bộ não. Máy chủ: `/api/chi-phi` thêm trường token toàn hệ (đọc) · `/api/nguon-khach` thêm `phanBo` (đọc) · hàm gom mới
`src/db/so-lieu.js#phanBoHoiThoai` (ĐỌC, GROUP BY `hoi_thoai` theo team) · sổ màn: cụm Số liệu còn ba tab. 0 cửa ghi mới.

**Đồ thị import (xargs, đo đúng):** `v3/chay-that.js` chạm 7 tệp · `src/server.js` (bot cũ, ĐANG phục vụ khách) và
`src/queue/chay-worker.js` chạm **`src/db/so-lieu.js`**. Thay đổi ở tệp đó **+30 / −0** (chỉ THÊM một hàm) và hàm mới CHỈ
`v3/chay-that.js` gọi (grep) ⇒ với bot cũ và worker mọi đường chạy không đổi ⇒ **KHÔNG restart bot đang phục vụ khách**; chỉ restart
`aicloser-v3`. (Lần restart sau của hai dịch vụ kia sẽ nạp tệp mới — thêm một hàm không ai gọi, không đổi hành vi.)

## 2 · Bậc phơi

Bậc ② — prod, đường nội bộ. Ba màn Số liệu đổi cho quản trị · quản lý · marketer. Khách không thấy gì.

## 3 · Cửa vào (30/09, HEAD `b657bda`)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | 0 tệp (trước CHANGELOG + tệp này) |
| ② | Nhánh | chưa đẩy 8 commit so với nhánh prod (`0e57d5b` `2fd2474` + ba cặp VE6a/6b/6c) + giấy này |
| ③ | `npm test` (đo riêng trên `0405e8b` — sau đó chỉ thêm giấy; lượt `phat-hanh.sh` để HOÃN bằng `BO_QUA_TEST=1`) | **2.350 ca · 2.346 đạt · 0 đỏ · 4 bỏ qua** |
| ④ | Cổng (output từng cổng giữ ở scratchpad `cong-ve6/`) | **41 xanh · 12 đỏ = đúng 12 nợ cũ, so theo TÊN** (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2) · `ve6a` `ve6b` `ve6c` xanh · `ll3` xanh lần này (N-CONGCHAP không tái hiện) |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` đã khai | 3 cảnh báo cũ `V3_GIA_*` (tên ghép động trong `model-bang-gia.test.mjs`) — **0 dòng trong diff lượt này**; lượt này không đặt biến |
| ⑦ | Prod (05:00:36) | `47968b8` · 0 tệp theo dõi sửa tại chỗ · ba dịch vụ active (`aicloser-v3` từ 04:07:11) · lỗi 1 giờ **0/0/0** · `/health` 129 · dấu mã mới `veChiSo` · `taiTungTin` · `vePhanBo` · `phanBoHoiThoai` đều **0** |

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | mã mới trên đĩa | `veChiSo` · `taiTungTin` · `vePhanBo` · `phanBoHoiThoai` **1** (trước 0, đo 05:00:36) | thiếu = điều tra |
| +1′ | cửa vẫn sống | `/api/bao-cao` · `/api/chi-phi` · `/api/nguon-khach` · `/nguon-khach` 401 (chưa đăng nhập) · đối chứng 404 | 5xx = lùi |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ KHÔNG restart | `ActiveEnterTimestamp` y nguyên · `/health` | đổi = điều tra |
| +1 ngày | người quyết mở ba màn Số liệu | người quyết | lỗi chặn việc = lùi |

## 7 · Đường lùi

```bash
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 47968b8 && systemctl restart aicloser-v3    # < 1 phút
```
Mất dữ liệu: không — 0 cửa ghi mới, 0 migration. Lùi xong `so-lieu.js` trên đĩa về bản cũ; bot cũ/worker vẫn chạy bản đã nạp (cùng hành vi).
