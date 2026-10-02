# MỞ VAN — LL15a: HRM từ BigQuery lên màn, CHỈ ĐỌC (Người và team · Kết nối) (CR-28-09c)

> **TRẠNG THÁI: ĐANG MỞ** — gật «deploy» 02/10. Phiếu: `phieu-LL15a.md`. Lượt trước: `phat-hanh-20261001-ve7cde.md` (prod `d226f81`, GIỮ).

## 1 · Mở cái gì

MÃ `d226f81 → HEAD`: LL15a `8036529` + giấy `ced81ff` · hồ sơ lô trước `9a685c0` · hồ sơ này. **0 migration** · **0 gói** ·
**0 tệp bộ não** · **1 biến mới** `V3_BQ_KHOA=/etc/aicloser/bq-levelup.json` (khoá đã đặt 02/10, root:root 600, ngoài cây git).
Ai đọc: chỉ `aicloser-v3` (`v3/chay-that.js` dựng bộ đọc khi có biến). `.env` dùng chung ba dịch vụ — hai dịch vụ kia không đọc
biến này ⇒ **chỉ restart `aicloser-v3`**.

## 2 · Bậc phơi

Bậc ② — prod, đường nội bộ (màn quản trị). Khách không thấy gì. Tác dụng ra ngoài mới: máy chủ gọi BigQuery ĐỌC (hai câu SELECT,
đệm một ngày; «Đọc lại HRM» do quản trị bấm). Dữ liệu nhân sự (mã NV · họ tên · trạng thái · team) hiện cho quản trị/quản lý của
team — đúng bản vẽ 4.

## 3 · Cửa vào (02/10)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | ✔ |
| ② | Nhánh | chưa đẩy 4 commit so với nhánh prod (`d226f81`) |
| ③ | `npm test` (trên `8036529`) | **2.446 ca · 2.442 đạt · 0 đỏ · 4 bỏ qua** |
| ④ | Cổng | **50 xanh / 12 đỏ** = đúng 12 nợ cũ; `ll15a` 15/15 (lồng `ve7e`); lượt đủ dừng ở giới hạn chạy nền khi còn `ve8a`/`ve8b` — chạy riêng 18/18 · 16/16 |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` | `V3_BQ_KHOA` — có dòng ở `docs/v3/ban-giao/bien-moi-truong-v3.md`, cột VPS khớp giá trị sắp đặt |
| ⑦ | Prod (04:02:35 CEST 02/10) | `d226f81` · 0 tệp sửa tại chỗ · ba dịch vụ active (`aicloser-v3` từ 01/10 03:58:16; worker từ 01/10 06:14:55 — không do lô trước) · lỗi 1 giờ 0/0/0 · `/health` 132 · `.env` chưa có `V3_BQ_KHOA` · khoá root:root 600 |

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | nối thật | nhật ký khởi động có «bộ đọc HRM (BigQuery, chỉ đọc)» và KHÔNG «chưa nối: docHrm» | thiếu = điều tra |
| +1′ | cửa vẫn sống | `/api/ket-noi/hrm` · `/api/team/thanh-vien` · `/cau-hinh-team` · `/ket-noi` 401 (chưa đăng nhập) · đối chứng 404 | 5xx = lùi |
| +1′ | đọc được từ máy chủ | node trên prod: `taoDocHrm` + `taoKhachBigQuery({ tepKhoa: V3_BQ_KHOA })` — chỉ in số đếm | lỗi = điều tra (màn vẫn sống, nói «Đọc HRM hỏng») |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ KHÔNG restart | `ActiveEnterTimestamp` y nguyên | đổi = điều tra |

## 7 · Đường lùi

Rẻ nhất (vắng = đóng): `sed -i '/^V3_BQ_KHOA=/d' /opt/aicloser/.env && systemctl restart aicloser-v3` — màn về «HRM chưa nối».
Lùi mã: `cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 d226f81 && systemctl restart aicloser-v3` (< 1 phút).
Mất dữ liệu: không (chỉ đọc). Gỡ khoá khỏi máy chủ nếu cần: `rm /etc/aicloser/bq-levelup.json`.
