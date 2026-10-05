# MỞ VAN — CR-02-10b đợt GSP (GSP1 · GSP1b · GSP2 · GSP3 · GSP3b) · 05/10/2026

> **TRẠNG THÁI: ⏸ CHỜ NGƯỜI QUYẾT GẬT** (push + deploy). Lời «2 ik đồng ý» chuyển qua phiên ai-chatbot-c7 (02/10) KHÔNG
> được dùng làm giấy mở van — hỏi lại trực tiếp ở phiên này.

## 1 · Mở cái gì

Màn Sản phẩm + trang một page (giao diện/API `aicloser-v3`) theo CR-02-10b. Chi tiết người dùng thấy: `CHANGELOG.md` mục
«05/10/2026 — 🔴 Page bán sản phẩm qua sản phẩm gốc». **Không** bật page nào, **không** đổi chữ bot nói, **không** biến mới,
**không** đụng van gửi / van POS / bộ não. **Migration 032** (chỉ THÊM 4 cột `san_pham.doi_soat` · `doi_soat_luc` ·
`doi_soat_goc` · `doi_soat_shop`).

## 2 · Bậc phơi

② prod, đường màn quản trị. Khách không thấy gì: 0/582 page bật bot (đo prod 05/10), bot trên prod đọc `kb-overrides.json`
(không đổi). Người dùng thấy: quản trị + marketer ở màn Sản phẩm / trang page.

## 3 · Cửa vào (máy dev, `ops/bin/phat-hanh.sh` 05/10 17:34 trên `8c0e51b`, 78′)

| # | Phép | Số đo |
|---|---|---|
| ① | cây sạch | 0 tệp chưa commit |
| ② | so origin | 0 commit remote chưa lấy về (nhánh đi trước origin 42 commit) |
| ③ | `npm test` | **2448 ca · 0 đỏ** |
| ④ | cổng | 61 xanh / 14 đỏ = **12 nợ cũ đúng tên + đúng số phép** (b-y3 1 · bh1 3 · bh7 1 · g2-a3 2 · l0-m1 7 · l1-m2 1 · l2-m1 3 · l2-m2 1 · l2-m3 2 · va-r1 2 · va-r2 1 · l3-m4 27 đỏ + 3 hoãn, tên phép ≡ lượt cửa vào `20261005T082800` của phiên khác) + `ll15e` (ca C7 `dieu-huong.js`) + `ll18` (chuỗi con `ll3`) chập chờn — chạy riêng mỗi cổng 2 lượt đều xanh (10/10 · 9/9), bộ LL15c 6/6 |
| ⑤ | máy dev không gửi | `PANCAKE_READONLY=1` |
| ⑥ | biến khai | 3 biến giá model `V3_GIA_*` chưa khai (cảnh báo, ngoài CR, có từ trước) |
| ⑦ | marker | 0 trong code |

Đồ thị import từ `src/queue/chay-worker.js`: 96 tệp, **không chạm** tệp nào của đợt ⇒ chỉ restart `aicloser-v3`.

## 4 · Ngưỡng + mốc quan sát (viết trước)

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| trước | prod sống | `systemctl is-active aicloser-v3 aicloser-worker-v3` · `curl localhost:3102/dang-nhap` · `ActiveEnterTimestamp` worker | không sống ⇒ KHÔNG mở |
| +1′ | sống, không vòng restart | `is-active` · đếm `Started` từ giờ restart · `/dang-nhap` 200 · `/api/san-pham/chuyen` 401 (chưa đăng nhập) | chết / Started > 1 ⇒ lùi |
| +5′ | lỗi mới | `journalctl -u aicloser-v3 --since <giờ restart> \| grep -iE "error\|throw\|ECONN"` | lỗi mới lặp ⇒ lùi |
| +15′ | worker KHÔNG restart · đọc thật | `ActiveEnterTimestamp` worker y nguyên · chạy `dsViecChuyen` CHỈ ĐỌC trên CSDL prod ⇒ bộ đếm khớp đo 05/10 (≈76 page bản sao) | đổi / ném ⇒ điều tra, lùi nếu do bản này |

## 5 · Đường lùi (viết trước)

Lùi mã: `cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 a3f96b4 && systemctl restart aicloser-v3` (< 1 phút).
**Giữ lược đồ 032** — chỉ thêm cột, mã cũ không đọc tới (`migrate down` KHÔNG phải đường lùi trên CSDL thật). Không mất dữ
liệu: đợt này không xoá dòng nào; dấu `doi_soat` (nếu người đã bấm) nằm im trên cột mới.

## 6 · Lệnh sẽ gõ (sau khi người quyết gật)

1. Máy dev: `git push origin vao-ui-v3-17-09` (rebase lên origin mới nhất ngay trước nếu origin đã đi tiếp).
2. Prod: đo «trước» (mục 4).
3. Prod: `cd /opt/aicloser && git fetch origin && git checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09` · `git status --porcelain` rỗng.
4. Prod: `node --env-file=.env db/migrate.js` ⇒ mong đợi «ÁP 032_doi_soat_ban_sao · áp mới 1». **Migration TRƯỚC, restart SAU.**
5. Prod: `systemctl restart aicloser-v3` — chỉ dịch vụ này.
6. Mốc +1′ / +5′ / +15′.

## 7 · Số đo tại từng mốc

(điền khi mở)

## 8 · Kết

(điền khi đóng cửa sổ: GIỮ / LÙI)

## 9 · Nợ phát sinh → §9 sổ

(điền khi đóng)

## 10 · Ai gật, lúc mấy giờ

(chờ)
