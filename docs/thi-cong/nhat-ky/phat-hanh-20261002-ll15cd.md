# MỞ VAN — LL15c (sale vào thẳng team) + LL15d (marketer chỉ thấy sản phẩm mình phụ trách) (CR-28-09c)

> **TRẠNG THÁI: ✅ GIỮ** — người quyết gật «xong thì deploy luôn» 02/10 · migration 031 áp · restart `aicloser-v3` 08:00:15 CEST · mốc +1′/+6′/+15′ sạch. Phiếu: `phieu-LL15c.md` · `phieu-LL15d.md`. Lượt trước:
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

## 8 · Lệnh đã gõ

Chờ phiên CR-02-10 đóng cửa sổ MB3 (họ nhắn 07:39 «kết GIỮ — bạn mở van được rồi»). Giờ prod (CEST):
1. cửa vào (cây chính, `e68227a`): 51 xanh / 14 đỏ = 12 nợ cũ + `ve7e` chập chờn (chạy lại 10/10) + `l1-m1` dữ liệu sống · `npm test` 2.466 đạt 0 đỏ
2. hồ sơ + CHANGELOG + nhật ký hai phiếu `5e81796` · đẩy nhánh `94d7cd5..5e81796` (4 commit, gồm hồ sơ MB3 `3226477` của phiên kia — chỉ giấy)
3. mốc lùi `/var/backups/aicloser/truoc-ll15cd-20261002T060000Z/` — `commit.txt` = `94d7cd5` · `env.bak` (600) · `san-pham-goc.json` (600, 1 dòng)
4. prod `checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09` → `5e81796` · 0 tệp sửa tại chỗ (trước và sau)
5. `node --env-file=.env db/migrate.js` → **ÁP 031_marketer_hrm_san_pham · áp mới 1 · tổng 30**; cột + chỉ mục có; `san_pham_goc` 1 dòng, 0 có mã
6. KHÔNG đổi `.env`
7. `systemctl restart aicloser-v3` lúc **08:00:15** — chỉ dịch vụ này (worker giữ nguyên 07:23:43; v1 đã tắt ở MB3)

## 9 · Số đo từng mốc

| Mốc | Giờ | Kết quả |
|---|---|---|
| +1′ | 08:01:29 | `aicloser-v3` active · Started 1 · lỗi 0 · worker active, Started 0, `ActiveEnterTimestamp` y nguyên 07:23:43 · `aicloser` inactive · `/api/san-pham/goc` `/api/page-ds` `/api/dieu-huong` 401 · `/dang-nhap` 200 · đối chứng 404 · khởi động: «gợi ý marketer từ đơn POS 60 ngày» 1 · «chưa nối: docGoiYMarketer» 0 · đồng bộ HRM 1 · lõi bot trong v3 («[lõi] chay-that») 1 · làm nóng cửa kiểm 1 · `HEAD` `5e81796` · migration 30 · **gợi ý đọc thật từ prod: 7,6 giây · 547 dòng (món × marketer) · 498 có mã NV · 345 món · 13 mã NV** |
| +6′ | 08:06:42 | y như +1′ — lỗi 0 · lượt đồng bộ HRM tự động (5′ sau khởi động) ra toàn 0 |
| +15′ | 08:15:49 | y như +1′ — Started 1 · lỗi 0 · worker y nguyên |

## 10 · Kết

**GIỮ.** Ba mốc sạch, không vòng restart, không lỗi mới; bộ gợi ý đọc được BigQuery từ prod. Nợ (§9 sổ): N-GOOGLE-DANG-NHAP ·
N-MK-LOC-PAGE-CON · N-MK-GAN-HANG-LOAT · N-DANH-MUC-RONG · N-L1M1-DON-CHO-IN.

Việc sau deploy (người): Sản phẩm › tab Chung — chọn marketer cho từng sản phẩm (có gợi ý); danh mục prod mới có 1 sản phẩm gốc nên
lọc của marketer chỉ có tác dụng khi kéo danh mục POS + gộp món thành sản phẩm (việc người đã hẹn «để sau»).
