# MỞ VAN — LL17a: Số liệu › Tổng quan đọc đơn POS của team theo marketer từ BigQuery (CR-28-09c)

> **TRẠNG THÁI: ĐANG MỞ** — người quyết gật «xong thì deploy luôn» 02/10. Phiếu: `phieu-LL17a.md`. Lượt trước: MB4 của phiên CR-02-10
> (prod `bd6459a`). Phiên CR-02-10b (GSP) xác nhận không deploy trong lúc này.

## 1 · Mở cái gì

MÃ `bb335d0 → HEAD`: LL17a `f5efc99` + giấy. **0 migration** · 0 gói · 0 tệp bộ não · 0 biến mới (khoá BigQuery `V3_BQ_KHOA` đã có).
Ai đọc: chỉ `aicloser-v3` (màn Số liệu + nối dây). ⇒ **chỉ restart `aicloser-v3`** (lõi bot chạy trong tiến trình này từ MB1 — bot đang
bật 0/582 page theo MB3/MB4, không khách nào bị ảnh hưởng).

## 2 · Bậc phơi

Bậc ② — prod, màn nội bộ (Số liệu: quản trị · quản lý · marketer). Khách không thấy gì. Ra ngoài: máy chủ gọi BigQuery ĐỌC hai câu SELECT,
đệm 1 giờ (token phạm vi `bigquery.readonly`).

## 3 · Cửa vào

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | ✔ (worktree `so-lieu-bq` tách từ origin `bb335d0`; dữ liệu gitignore trỏ symlink sang cây chính để chạy đủ ca) |
| ② | Nhánh | không bị bỏ lại so với origin/main |
| ③ | `npm test` (trên `f5efc99`) | **2.311 đạt · 0 đỏ** |
| ④ | Cổng | **51 xanh / 16 đỏ** = 12 nợ cũ theo TÊN + `l1-m1` (dữ liệu sống: shop Taiwan không có đơn «Chờ in», nợ N-L1M1-DON-CHO-IN) + `ll5` · `ll10` · `ll18` CHẬP CHỜN — chạy lại riêng: `ll1` 10/10 · `ll10` 7/7 · `ll18` 9/9 · `ll2` xanh · `ll3` 7/7 · `ll5` 6/6. Nghi: phiên CR-02-10b chạy ca cùng lúc trên cây chính, đụng CSDL hộp cát tên cố định (nợ N-CONG-HOP-CAT-TRUNG-TEN). Cổng của phiếu: `ll17a.sh` 14/14 |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` | không biến mới |
| ⑦ | Prod | 10:32:13 CEST 02/10: `bd6459a` (MB4) · 0 tệp sửa tại chỗ · migration 31 · `aicloser-v3` + worker active từ 09:03:39 · lỗi 1 giờ 0/0 · `aicloser.service` đã gỡ · `/dang-nhap` 200 · `V3_BQ_KHOA` có |

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | nối thật | khởi động có «đơn POS theo team & marketer (BigQuery, chỉ đọc)», KHÔNG «chưa nối: docDonPos» | thiếu = điều tra |
| +1′ | cửa sống | `/api/bao-cao/don-pos` · `/api/bao-cao` 401 (chưa đăng nhập) · `/bao-cao` chuyển đăng nhập · đối chứng 404 | 5xx = lùi |
| +1′ | đọc thật | node trên prod: bộ đọc đơn + HRM → số 30 ngày ba team (chỉ đếm) | lỗi = điều tra (màn nói «hỏng») |
| +6′ · +15′ | lỗi mới | journalctl ba dịch vụ · lượt HRM tự động (5′ sau khởi động) | lỗi mới lặp = lùi |
| +15′ | worker KHÔNG restart | `ActiveEnterTimestamp` y nguyên | đổi = điều tra |

## 7 · Đường lùi

Lùi mã: `cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 bd6459a && systemctl restart aicloser-v3` (< 1 phút) — không lược đồ, không
dữ liệu. Tắt riêng khối: không có cờ riêng (dùng chung `V3_BQ_KHOA` với HRM) — lùi mã là đường.
