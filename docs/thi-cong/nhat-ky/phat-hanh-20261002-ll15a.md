# MỞ VAN — LL15a: HRM từ BigQuery lên màn, CHỈ ĐỌC (Người và team · Kết nối) (CR-28-09c)

> **TRẠNG THÁI: ✅ GIỮ** — gật «deploy» 02/10 · restart `aicloser-v3` 04:04:01 CEST · mốc +1′/+5′/+15′ sạch. Phiếu: `phieu-LL15a.md`. Lượt trước: `phat-hanh-20261001-ve7cde.md` (prod `d226f81`, GIỮ).

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

## 8 · Lệnh đã gõ

Người quyết gật «deploy» 02/10. Giờ prod (CEST):
1. cửa vào (máy dev): 50 xanh / 12 đỏ = 12 nợ cũ · `npm test` 2.446 ca 0 đỏ · hồ sơ + CHANGELOG `679d583`
2. đẩy nhánh `d226f81..679d583` (4 commit)
3. mốc lùi `/var/backups/aicloser/truoc-ll15a-20261002T020358Z/` — `commit.txt` = `d226f81` + `env.bak` (600)
4. prod `checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09` → `679d583` · 0 tệp theo dõi sửa tại chỗ (trước và sau)
5. `node --env-file=.env db/migrate.js` → **áp mới 0 · tổng 28**
6. thêm MỘT dòng `.env`: `V3_BQ_KHOA=/etc/aicloser/bq-levelup.json` (trước đó 0 dòng)
7. `systemctl restart aicloser-v3` lúc **04:04:01** — chỉ dịch vụ này

## 9 · Số đo từng mốc

| Mốc | Giờ | Kết quả |
|---|---|---|
| +1′ | 04:05:32 | ba dịch vụ active · `aicloser-v3` Started 1 · lỗi 0/0/0 · hai dịch vụ kia `ActiveEnterTimestamp` y nguyên (28/09 11:25:42 · 01/10 06:14:55) · `/health` 132 · `/api/ket-noi/hrm` `/api/team/thanh-vien` `/cau-hinh-team` `/ket-noi` + `POST /api/ket-noi/hrm/doc-lai` 401 (chưa đăng nhập) · đối chứng 404 · nhật ký khởi động: «bộ đọc HRM (BigQuery, chỉ đọc)» 1 · «chưa nối: docHrm» 0 (2 dòng «chưa nối» khác có từ trước) · dấu mã đủ · **đọc thật từ prod bằng module ứng dụng: 1.048 ms · 118 hồ sơ (24 Pialpha) · 324 ghép · 63 marketer · GCC 19 · AUUS 9 · EU 20 đang làm** |
| +5′ | 04:09:40 | y như +1′ — Started 1 · lỗi 0/0/0 · hai dịch vụ kia y nguyên · `/health` 132 · đường đúng mã · HRM nối |
| +15′ | 04:19:47 | y như +1′ — Started 1 · lỗi 0/0/0 · hai dịch vụ kia y nguyên · `/health` 132 · đường đúng mã · HRM nối |

## 10 · Kết

**GIỮ.** Ba mốc sạch, không vòng restart, không lỗi mới; máy chủ đọc HRM thật. Nợ của phiếu (đã ở §9 sổ): N-BQ-KHOA-RONG (khoá là SA
dashboard — nên thay bằng SA riêng chỉ đọc) · LL15b (tạo tài khoản từ HRM, gật riêng).

Việc sau deploy (người): mở Cài đặt › Kết nối — phần HRM phải ghi «Đã nối · chỉ đọc» + số hồ sơ; Cài đặt › Người và team — cột «Hồ sơ
HRM» của từng người và bảng marketer POS của team đang mở. Người quyết gật «deploy» 02/10.
