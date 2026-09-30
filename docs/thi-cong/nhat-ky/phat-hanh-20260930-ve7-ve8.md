# MỞ VAN — VE7a · VE7b · VE8a · VE8b: Cài đặt theo bản vẽ 4 + Sản phẩm khép kín (SKU · giá theo thị trường · marketer · gắn page) (CR-28-09c)

> **TRẠNG THÁI: XONG · GIỮ (30/09 11:56 prod)** — người quyết gật 30/09: «deploy». Phiếu: `phieu-VE7a.md` · `phieu-VE7b.md` · `phieu-VE8a.md` · `phieu-VE8b.md`. Lượt trước:
> `phat-hanh-20260930-ve2b.md` (prod `7bb52b4`).

## 1 · Mở cái gì

MÃ `7bb52b4 → HEAD`: VE7a `1c1ab28` · VE7b `1c66710` · VE8a `eafbcd7` + `85b2afb` · VE8b `97de3dd` · cổng báo lồng `8f4dc43` + `24791fe` · giấy (`2c16e35` kết VE2b · `9a0ec54` · `804c5be` · `73a5c14` · tệp này).
**Migration 028** (CHỈ THÊM: `san_pham.sku` · `san_pham.gia_tay` · `san_pham_goc.sku` (+ UNIQUE theo team) · `san_pham_goc.marketer`)
· **0** gói · **0** biến · **0** tệp bộ não. Một tệp tầng A ngoài làn giao diện chỉ THÊM export (`src/channels/whatsapp/index.js`
`cuaGuiWaDangMo` — VE7b đọc van thật).

**Ai chạy code đổi (đo 30/09):** lượt kéo danh mục (`doc-danh-muc.js`) chỉ `v3/chay-that.js` GỌI (`keoDanhMucTeam`); worker
(`src/queue/chay-worker.js`) và bot cũ (`src/server.js`) chỉ nạp gián tiếp, không gọi; `saveProduct` chỉ chạy trong `aicloser-v3`
(Vận hành + màn Sản phẩm) ⇒ **chỉ restart `aicloser-v3`**. Cột mới NULL/DEFAULT ⇒ code cũ của hai dịch vụ kia không vỡ.

## 2 · Bậc phơi

Bậc ② — prod, đường nội bộ (màn quản trị). Khách không thấy gì: bot đang tắt 0/514 page, `PANCAKE_READONLY=1` cả ba tiến trình,
`V3_POS_GHI=0`. Giá sửa ở màn Sản phẩm vào `goi_gia` + đẩy bản chép sang bot (cửa đẩy đang khoá ở chế độ chỉ đọc — đúng đường cũ
của Vận hành).

## 3 · Cửa vào (30/09)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | 0 tệp ngoài tệp này (commit ngay sau) |
| ② | Nhánh | chưa đẩy 12 commit so với nhánh prod (11 + tệp này) · remote không có gì mới |
| ③ | `npm test` (trên `97de3dd`) | **2.411 ca · 2.407 đạt · 0 đỏ · 4 bỏ qua** |
| ④ | Cổng (16:17, `97de3dd`) | **44 xanh · 14 đỏ** = 12 nợ cũ (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2) + `l1-m1` (POS Taiwan 0 đơn «Chờ in» — dữ liệu sống, N-L1M1-SONG) + `ve5b` — chập chờn: đường báo lồng chỉ về `ll18-khung.test.mjs` đỏ 1 ca đúng một lần, xanh ở 6 cổng khác cùng lượt + 6 lượt song song (N-THUOC-CHAP-CHON; vòng thước nay in tên ca `24791fe`). Không đỏ nào do lô |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` | lượt này không đặt biến |
| ⑦ | Prod (11:20:39 CEST) | `7bb52b4` · 0 tệp theo dõi sửa tại chỗ · ba dịch vụ active (`aicloser-v3` từ 06:42:41) · lỗi 1 giờ **0/0/0** · `/health` **131** |

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| trước restart | migration | `db/migrate.js` áp mới **1** · tổng **28** · 4 cột mới có mặt | lỗi = dừng, không restart |
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | mã mới trên đĩa | `goiYGopMonPos` · `ganPageVaoGoc` · `chiGia` · `cuaGuiWaDangMo` có mặt | thiếu = điều tra |
| +1′ | cửa vẫn sống | `/san-pham` 302 · `/api/san-pham/gop` · `/api/ket-noi/whatsapp` · `/api/van-hanh/tom-tat` 401 (chưa đăng nhập) · đối chứng 404 | 5xx = lùi |
| +5′ · +15′ | lỗi mới | journalctl ba dịch vụ | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ KHÔNG restart | `ActiveEnterTimestamp` y nguyên · `/health` | đổi = điều tra |
| sau deploy | lấy SKU cho 69 món Kuwait | người bấm «Kéo danh mục và giá từ POS» ở Cài đặt › Kết nối (nợ N-SKU-KEO-LAI) | lỗi = xem |

## 7 · Đường lùi

```bash
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 7bb52b4 && systemctl restart aicloser-v3    # < 1 phút
```
Lùi CODE, GIỮ SCHEMA (không `migrate down` trên CSDL thật): 028 chỉ thêm cột NULL/DEFAULT — code `7bb52b4` không đọc chúng.
Mất dữ liệu: không.

## 8 · Lệnh đã gõ

Giờ prod (CEST), 30/09:
1. cửa vào (16:17 giờ máy dev, `97de3dd`): 44 xanh / 14 đỏ — đỏ mới duy nhất `ve5b` truy bằng đường báo lồng tới `ll18-khung` chập chờn
   (không do lô) ⇒ thêm in tên ca `24791fe` · giấy `73a5c14` · hồ sơ này `ecce575`
2. đẩy nhánh `7bb52b4..ecce575` (12 commit)
3. mốc lùi `/var/backups/aicloser/truoc-ve7-ve8-20260930T094013Z/commit.txt` = `7bb52b4`
4. prod `checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09` → `ecce575` · 0 tệp theo dõi sửa tại chỗ (trước và sau)
5. **lược đồ TRƯỚC**: `node --env-file=.env db/migrate.js` → `ÁP 028_sku_marketer_san_pham` · **áp mới 1 · tổng 28** · bốn cột có mặt:
   `san_pham.gia_tay · san_pham.sku · san_pham_goc.marketer · san_pham_goc.sku`
6. `systemctl restart aicloser-v3` lúc **11:40:31** — chỉ dịch vụ này

## 9 · Số đo từng mốc

| Mốc | Giờ | Kết quả |
|---|---|---|
| +1′ | 11:41:55 | ba dịch vụ active · `aicloser-v3` Started 1 · lỗi 0/0/0 · hai dịch vụ kia `ActiveEnterTimestamp` y nguyên (28/09 11:25:42 · 11:22:22) · `/health` 131 · `/san-pham` `/ket-noi` `/suc-khoe` 401 (curl không `Accept: text/html` ⇒ JSON 401, đúng) · `/api/san-pham/gop` `/api/ket-noi/whatsapp` `/api/van-hanh/tom-tat` 401 · đối chứng 404 · dấu mã mới 5/5 |
| +5′ | 11:46:03 | ba dịch vụ active · Started 1 · lỗi 0/0/0 · hai dịch vụ kia y nguyên · `/health` 131 · cửa 401/404 y hệt +1′ · dấu mã 5/5 |
| +15′ | 11:56:11 | ba dịch vụ active · Started 1 · lỗi 0/0/0 · hai dịch vụ kia y nguyên · `/health` 131 · cửa 401/404 y hệt +1′ · dấu mã 5/5 — đóng cửa sổ quan sát |

## 10 · Kết

**GIỮ.** Ba mốc sạch: `aicloser-v3` khởi động đúng 1 lần, 0 lỗi ở cả ba dịch vụ, hai dịch vụ không restart y nguyên từ 28/09, `/health` 131 không đổi, bốn cửa mới trả 401 đúng mã (chưa đăng nhập), dấu mã mới 5/5 trên đĩa. Migration 028 áp sạch trước restart. Nợ §9 giữ nguyên: N-THUOC-CHAP-CHON · N-SKU-KEO-LAI · N-TIEN-TE-MAC-DINH · N-MK-GOI-Y-DON · N-L1M1-SONG.

Việc sau deploy (người): Cài đặt › Kết nối › **«Kéo danh mục và giá từ POS»** (Kuwait — shop duy nhất đang bật) để 69 món có SKU
(N-SKU-KEO-LAI) ⇒ Sản phẩm › «Gộp món POS thành sản phẩm» ⇒ mỗi sản phẩm: marketer (tab Chung) · giá Kuwait (tab «Theo thị trường»,
tiền tệ KWD) · «+ Gắn page». Shop khác đang tắt ⇒ sản phẩm chỉ có thị trường Kuwait tới khi bật + kéo shop đó.
