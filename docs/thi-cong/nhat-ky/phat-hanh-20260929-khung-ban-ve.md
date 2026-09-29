# MỞ VAN — KHUNG THEO BẢN VẼ (LL18, CR-28-09c)

> **TRẠNG THÁI: ĐANG CHẠY — người quyết gật 29/09: «ok»** (trả lời câu «Bạn gật thì tôi deploy theo đúng quy trình như lượt
> trước»). Mọi số «đo 29/09» là phép đo CHỈ ĐỌC trên prod trừ khi ghi rõ là lệnh ghi.
> Phiếu: `docs/thi-cong/nhat-ky/phieu-LL18.md` · lượt trước: `phat-hanh-20260929-nam-dich.md`.

## 1 · Mở cái gì

Deploy MÃ `5bff55e → HEAD` (nhánh `vao-ui-v3-17-09`): `31212d9` LL18 + giấy (`43d0cbe` · `91a190d` · tệp này).
Khung thanh ngang theo bản vẽ do máy chủ vẽ sẵn · nén gzip · cache theo mã phiên bản · `/` theo vai · 403 thôi ngõ cụt ·
liên kết sang màn không mở được thì tắt. **Không** migration (27), **không** gói, **không** biến `V3_*`, **không** bộ não,
**0 tệp** `src/` · `db/`. Đồ thị import: `src/server.js` 0 tệp đổi · `src/queue/chay-worker.js` 0 · `v3/chay-that.js`
có ⇒ **chỉ restart `aicloser-v3`**.

## 2 · Bậc phơi

**Bậc ② — prod, đường nội bộ.** Giao diện đổi cho MỌI người dùng màn v3 ngay khi restart (đó là điều người dùng xin);
khách không thấy gì: env `/proc` ba dịch vụ `PANCAKE_READONLY=1` · `V3_PANCAKE_GUI=0` · `V3_POS_GHI=0` (đo 08:35 prod).

## 3 · Cửa vào (29/09, HEAD `91a190d`)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | 0 tệp (trước khi viết CHANGELOG + tệp này) |
| ② | So origin | nhánh chưa đẩy 3 commit (`43d0cbe` `31212d9` `91a190d`) · remote không đi trước |
| ③ | `npm test` (chạy trên đúng mã `31212d9`, sau đó chỉ đổi giấy) | **2.282 ca · 2.278 đạt · 0 đỏ · 4 bỏ qua** |
| ④ | Cổng nghiệm thu | **31 xanh** (thêm `ll18`) · **12 đỏ** = đúng tập nợ cũ; so TỪNG dòng trượt với lượt sáng (HEAD `62201ca`): b-y3 1=1 · bh1 3=3 · bh7 1=1 · g2-a3 2=2 · l0-m1 5=5 · l1-m2 1=1 · l2-m1 3=3 · l2-m2 1=1 · l2-m3 2=2 · l3-m4 33=33 · va-r1 2=2 · va-r2 12=12 — **0 dòng khác** ⇒ 0 cổng đỏ vì LL18 |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến mới | 0 |
| ⑦ | Prod đang sống (08:35:50) | prod `5bff55e` · 0 tệp sửa tại chỗ · 22 tệp dữ liệu lạ · ba dịch vụ active (`aicloser-v3` từ 06:44:40) · `/health` 129 · UI 302 · lỗi 1 giờ **0/0/0** |

## 4 · Sao lưu

Không đổi dữ liệu/lược đồ; bản sao CSDL 06:43 hôm nay (`truoc-ll-20260929T044346Z`) còn nguyên. Lượt này chỉ ghi
`commit.txt` mới để đường lùi có mốc: `/var/backups/aicloser/truoc-ll18-<giờ>/commit.txt`.

## 5 · Lệnh theo thứ tự

```bash
git push origin vao-ui-v3-17-09                                             # ĐIỂM DỪNG ① (người quyết «ok»)
cd /opt/aicloser && git fetch origin && git checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09
git status --porcelain | grep -v '^??' | wc -l                              # kỳ vọng 0
node --env-file=.env db/migrate.js                                          # kỳ vọng áp mới 0 · tổng 27
systemctl restart aicloser-v3                                               # ĐIỂM DỪNG ② — CHỈ dịch vụ này
```

## 6 · Ngưỡng + mốc quan sát (viết trước khi mở)

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `systemctl is-active` · `journalctl -u aicloser-v3 --since <giờ> \| grep -c Started` | chết / Started > 1 = lùi |
| +1′ | mã MỚI đang phục vụ | `/api/dieu-huong/cam` **401** (cửa mới; mã cũ 404) · `/chung/khung.js` 200 · `/` chưa đăng nhập ⇒ `/dang-nhap` (mã cũ ⇒ `/dieu-phoi`) · `/dang-nhap` có `kieu.css?v=` + `rel="icon"` | 404/500 ở cửa mới = lùi |
| +1′ | nén + cache thật trên dây | `/chung/kieu.css?v=<mã>` gửi `Accept-Encoding: gzip` ⇒ `Content-Encoding: gzip` + `immutable`; từ NGOÀI máy chủ đo thời gian tải | không nén / 5xx = lùi |
| +1′ | khung thật theo vai trên mã đã deploy | chạy `veKhung` + `chenKhung` trên prod với trang thật `bo-luat.html` cho ba vai | quản trị thiếu đích / sale thấy đường quản trị = lùi |
| +5′ · +15′ | lỗi mới | `journalctl -u aicloser -u aicloser-v3 -u aicloser-worker-v3 --since <giờ> \| grep -ciE "error\|throw\|ECONN"` | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ không chạm | `ActiveEnterTimestamp` `aicloser` · `aicloser-worker-v3` · `/health` | đổi = điều tra |
| +1 ngày | người dùng thật | người quyết mở menu, bấm qua năm đích | lỗi chặn việc = lùi |

## 7 · Đường lùi

```bash
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 5bff55e && systemctl restart aicloser-v3    # < 1 phút
```
Mất dữ liệu: **không** — lượt này không ghi gì mới vào CSDL. Trình duyệt đang giữ tệp `?v=<mã mới>` (cache một năm)
không hại khi lùi: HTML của mã cũ gọi tệp KHÔNG mã (`no-cache`) ⇒ lấy bản cũ ngay.

## 8 · Lệnh đã gõ theo thứ tự

Giờ prod (CEST), 29/09:
1. commit giấy `1bb9ba1` (CHANGELOG + tệp này, ngưỡng + đường lùi) · đẩy nhánh → `5bff55e..1bb9ba1`
2. mốc lùi `/var/backups/aicloser/truoc-ll18-20260929T064514Z/commit.txt` = `5bff55e`
3. prod `git fetch` + `checkout -f -B vao-ui-v3-17-09 origin/…` → `1bb9ba1` · 0 tệp sửa tại chỗ · 22 tệp dữ liệu lạ giữ
   nguyên · `db/migrate.js` → **áp mới 0 · tổng 27** · không `npm ci`
4. `systemctl restart aicloser-v3` lúc **08:45:17** — chỉ dịch vụ này

## 9 · Số đo tại từng mốc

**+1′ (08:45:25 → 08:46, prod):** `aicloser-v3` active · `Started` **1** · lỗi mới ba dịch vụ **0**.
Mã MỚI đang phục vụ: `/api/dieu-huong/cam` **401** (cửa mới — mã cũ 404) · `/chung/khung.js` **200** · `/` chưa đăng
nhập ⇒ `/dang-nhap` (mã cũ ⇒ `/dieu-phoi`). `/dang-nhap` mang `kieu.css?v=b24e04851a0b` = `phienBan()` trên đĩa ·
`rel="icon"` 1 · phông `media="print"` 1. `/chung/kieu.css?v=b24e04851a0b` + `Accept-Encoding: gzip` ⇒
`Cache-Control: public, max-age=31536000, immutable` · `Content-Encoding: gzip` · **26.111 byte** (trước: 103.644 không
nén); không mã ⇒ `no-cache`. Khung trên mã đã deploy (chạy `veKhung` + `chenKhung` trên `bo-luat.html` thật):

| Vai @ màn | Hàng 1 | Hàng 2 | dấu `data-khung` | lộ đường quản trị |
|---|---|---|---|---|
| quản trị @ /bo-luat | Hộp thư · Sản phẩm · Page · Số liệu · Cài đặt | Tất cả page · Luật chung | 1 | — |
| marketer @ /kich-ban | Hộp thư · Sản phẩm · Page · Số liệu · Cài đặt | Kịch bản của page · Câu trả lời sẵn | 1 | không |
| sale @ /ban-hoi-thoai | Hộp thư | Hộp thư · Việc đang chờ | 1 | không |

Từ NGOÀI máy chủ (máy dev, cùng mạng người dùng): `kieu.css` nén **0,96 · 1,03 · 1,33 s** (sáng nay không nén 1,9–11,3 s);
lần bấm menu sau đó không tải lại (cache một năm theo mã). `/` ngoài ⇒ 302 `/dang-nhap`.

**+5′ (08:50:02, prod):** ba dịch vụ active · `Started` 0 · 1 · 0 · lỗi mới **0/0/0** · `/health` 129 · UI 302.
**+15′ (08:59:33, prod):** ba dịch vụ active · `Started` 0 · 1 · 0 · lỗi mới **0/0/0** · `ActiveEnterTimestamp` hai dịch vụ
không chạm y nguyên (28/09 11:25:42 · 11:22:22) · `/health` 129 · UI 302.

**Người dùng mở màn ngay sau deploy (29/09 ~08:50–09:05) — bốn ảnh:**
1. `/chon-team` VỠ BỐ CỤC: khung chèn vào trang tự căn giữa bằng flex ⇒ đứng NGANG cạnh thẻ team, mất mục «Cài đặt».
   Do LL18. E2E lượt 5 CÓ chụp trang này (`quan-tri-01.png`) mà thợ không mở ảnh; bộ đo không đo bố cục khung. Vá: hai
   trang `auth/trang` gửi nguyên văn (chỉ nén); e2e thêm phép «khung trải hết bề ngang ở đỉnh» cho MỌI màn (ca K13).
2. `/san-pham` «không giống artifact» · 4. `/page/:id` «mới thấy thay đổi phần khung, còn chi tiết không giống»:
   ĐÚNG — LL18 đổi khung + token; NỘI DUNG từng màn vẫn bố cục cũ (sóng LL1–LL13 gom/dời màn, chưa dựng lại theo bản vẽ).
3. `/van-hanh-v3` tab «Page & trạng thái» · «Sản phẩm & giá» in thô `<div class="manh">…`: KHÔNG do LL18 — `hang()` gán
   `textContent` cho mọi chuỗi từ `7775e9c` (17/09) trong khi cả tám nơi gọi truyền HTML; nay dễ thấy vì LL10 đưa màn vào
   Cài đặt. Vá: `innerHTML` (soát 8 lời gọi: mọi dữ liệu động qua `esc()`/số — ca K14); e2e thêm phép dò HTML thô.
   Kèm: `/favicon.ico` (trang không qua khung hết 404 — ca K15).

## 10 · Kết · nợ · ai gật

- Người gật: người quyết, 29/09 — «ok».

## 11 · BẢN VÁ `6af76c0` — cùng lượt, người quyết gật «oke» (29/09)

Mở: `fix(ui)` `6af76c0` — hai trang `auth/trang` thôi bị chèn khung · `van-hanh.js#hang()` vẽ HTML (lỗi từ 17/09) ·
`/favicon.ico`. Cửa vào: bộ ca ll18 **15/15** · đảo-vá **24/24** · `npm test` **2.285 ca · 0 đỏ** · cổng **31 xanh ·
12 đỏ** (cùng tập); năm cổng đỏ có đọc tệp bản vá chạm (l0-m1 · l1-m2 · l2-m1 · l2-m2 · l2-m3) so TỪNG dòng trượt với
lượt sáng: **0 dòng khác** · e2e 47 màn: 0 lỗi · 0 khung lệch · 0 HTML thô. Chỉ restart `aicloser-v3`.
Ngưỡng: như mục 6. Đường lùi: `git checkout -f -B vao-ui-v3-17-09 1bb9ba1 && systemctl restart aicloser-v3`.
