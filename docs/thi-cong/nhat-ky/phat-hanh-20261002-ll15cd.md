# MỞ VAN — LL15c (sale vào thẳng team) + LL15d (marketer chỉ thấy sản phẩm mình phụ trách) (CR-28-09c)

> **TRẠNG THÁI: ĐANG MỞ** — người quyết gật «xong thì deploy luôn» 02/10. Phiếu: `phieu-LL15c.md` · `phieu-LL15d.md`. Lượt trước:
> MB3 của phiên CR-02-10 (prod `94d7cd5`, mở 07:23:43 CEST) — chờ phiên ấy đóng cửa sổ quan sát rồi mới mở.

## 1 · Mở cái gì

MÃ `94d7cd5 → HEAD`: LL15c `9e7d06c` · LL15d `e68227a` · hồ sơ này. **1 migration** `031_marketer_hrm_san_pham` (CHỈ THÊM:
`san_pham_goc.marketer_ma_nv` + chỉ mục; 030 để dành cho CR-02-10) · 0 gói · 0 tệp bộ não · 0 biến mới (gợi ý dùng lại `V3_BQ_KHOA`).
Ai đọc: chỉ `aicloser-v3` (đăng nhập · thanh trên · màn Sản phẩm/Page). `aicloser-worker-v3` không đọc gì của hai phiếu ⇒ **chỉ restart
`aicloser-v3`** (worker giữ nguyên — đang trong quan sát MB3 của phiên kia).

## 2 · Bậc phơi

Bậc ② — prod, màn nội bộ. Khách không thấy gì (bot không đổi). Người dùng thấy: sale vào thẳng team; marketer chỉ thấy sản phẩm/page
mình phụ trách (prod 02/10: 1 sản phẩm gốc, chưa gán ⇒ marketer chưa thấy sản phẩm nào cho tới khi quản trị gán).

## 3 · Cửa vào

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | lúc chạy: 1 tệp nhật ký MB3 của phiên CR-02-10 đang sửa dở (nay đã commit `3226477`, chỉ giấy) |
| ② | Nhánh | không bị bỏ lại so với origin/main |
| ③ | `npm test` (trên `e68227a`, cây chính) | **2.466 đạt · 0 đỏ** |
| ④ | Cổng | **51 xanh / 14 đỏ** = 12 nợ cũ theo TÊN + `ve7e` (đỏ ở `ve2b-page-gop` 16/17 — chạy lại riêng `ve2b.sh` **14/14**, cả `ve7e.sh` **10/10**: chập chờn) + `l1-m1` (bước ④ đọc đơn «Chờ in» của shop THẬT Taiwan = 0; đo thẳng POS 02/10 ~12:40 giờ VN: HTTP 200, trạng thái 12 = **0 đơn**, các trạng thái khác 17/3/32/87/8 ⇒ đỏ vì DỮ LIỆU SỐNG, không vì mã — nợ N-L1M1-DON-CHO-IN). Cổng của hai phiếu: `ll15c.sh` 10/10 · `ll15d.sh` 21/21 |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` | không biến mới; cảnh báo cũ tên ghép động (không chặn) |
| ⑦ | Prod | 07:59:32 CEST 02/10: `94d7cd5` (MB3) · 0 tệp sửa tại chỗ · migration 29 · `aicloser` (v1) inactive · `aicloser-v3` + worker active từ 07:23:43 · lỗi 1 giờ 0/0 · `/dang-nhap` 200 |

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| ngay | migration | áp mới 1 · tổng 30; cột + chỉ mục có | lỗi = DỪNG, chưa restart |
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | nối thật | khởi động có «gợi ý marketer từ đơn POS 60 ngày», KHÔNG «chưa nối: docGoiYMarketer» | thiếu = điều tra |
| +1′ | cửa sống | `/api/san-pham/goc` · `/api/page-ds` · `/api/dieu-huong` 401 (chưa đăng nhập) · `/dang-nhap` 200 · đối chứng 404 | 5xx = lùi |
| +1′ | gợi ý đọc được | node trên prod: bộ đọc gợi ý — chỉ in số dòng | lỗi = điều tra (màn vẫn sống, nói «chưa có») |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ (v1 đã tắt ở MB3) | lỗi mới lặp = lùi |
| +15′ | worker KHÔNG restart | `ActiveEnterTimestamp` y nguyên | đổi = điều tra |

## 7 · Đường lùi

Lùi mã: `cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 94d7cd5 && systemctl restart aicloser-v3` (< 1 phút). **Giữ lược đồ**
(031 chỉ thêm cột, có thể NULL; mã `94d7cd5` không đọc nó). Không chạy `031.down` trên prod. Mất dữ liệu: không.
