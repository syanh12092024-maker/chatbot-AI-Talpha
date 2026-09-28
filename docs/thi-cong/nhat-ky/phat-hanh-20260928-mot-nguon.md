# MỞ VAN MN5 — MỘT NGUỒN CHO SẢN PHẨM · GIÁ · ẢNH · KỊCH BẢN (CR-28-09b)

> **TRẠNG THÁI: ĐANG CHẠY — người quyết gật 28/09: «Đưa cùng lượt, chạy từng bước A→E» (UI-HT1–4 đi cùng lượt).** Bước A ✅. Các số «đo
> 28/09» dưới đây là phép đo CHỈ ĐỌC (SSH đọc, người quyết cho phép).
> Phiếu CR: `docs/thi-cong/doi-y-do/CR-28-09-mot-nguon-san-pham.md` · sổ §5e.

## 1 · Mở cái gì

Đưa lên prod năm việc, **mỗi việc một bước, đo xong mới sang bước sau**:

| Bước | Việc | Chạm khách? |
|---|---|---|
| A | Deploy mã `ba9b048 → HEAD` + migration **025** (chỉ THÊM: bảng `anh_san_pham`, cột `goi_gia.nhan`, `san_pham.bien_the`) | Không — vắng cờ = hành vi cũ |
| B | Nạp một lượt `kb-overrides.json` → CSDL v3 (`ops/bin/nap-mot-nguon.mjs --ghi`) | Không — bot vẫn đọc tệp cũ |
| C | Cờ `V3_GHI_KHO_BOT=1` trên `aicloser-v3` — mở đường «lưu là chạy» | Không trực tiếp (bot đang `PANCAKE_READONLY=1`) |
| D | `PUBLIC_URL=http://169.58.33.8:3102` trên `aicloser` + đẩy lại bản chép cho 77 page | Ảnh: 43 ảnh chết sống lại **khi bot được bật** |
| E | Cờ `V3_SHEET_CHI_DANH_BA=1` trên `aicloser` — bỏ sản phẩm + ba khối Chính sách/FAQ/Phản đối từ Sheet | 🔴 Đổi lời bot: bỏ các lời hứa mẫu Philippines — **khi bot được bật** |

⚠️ **Deploy bước A mang theo cả UI-HT1–3 (bàn hội thoại) của phiên khác** — HEAD đi trước prod
28 commit, trong đó có `5ac57ef` `0cc381f` `f2ddaa3` (+ sổ). Bàn hội thoại CHỈ ĐỌC, không có
cửa gửi. Người quyết xác nhận đưa cùng lượt, hoặc chờ phiên đó chốt.

## 2 · Bậc phơi

**Bậc ② — prod, đường nội bộ; khách chưa thấy gì.** Đo 28/09:

| Đo | Số | Nghĩa |
|---|---|---|
| Page bật AI ở bot cũ (`ai-enabled` qua `/admin/api/pages`) | **0** | không page nào trả lời khách |
| Page `v3_ai_bat` ở bot mới | **0** | như trên |
| `PANCAKE_READONLY` trên cả hai unit | **1** | van gửi tin toàn hệ ĐÓNG |
| `V3_PANCAKE_GUI` · `V3_POS_GHI` · `V3_PAGE_XU_LY` | `0` · `0` · rỗng | van gửi v3 ĐÓNG |

⇒ Cả năm bước **không gửi được một tin nào ra khách**. Hiệu lực với khách (ảnh sống lại, bỏ ba
khối mẫu Philippines) chỉ xảy ra khi ai đó BẬT bot cho một page — việc đó KHÔNG nằm trong lượt
này. Ghi rõ để không ai đọc «xong MN5» thành «khách đã được phục vụ đúng».

## 3 · Cửa vào — bảy phép đo (28/09 15:24, HEAD `66cbc7c`, `ops/bin/phat-hanh.sh`)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | 0 tệp chưa commit ✔ |
| ② | So origin | 110 commit chưa đẩy lên `origin/main`; nhánh `vao-ui-v3-17-09` chưa đẩy **27** |
| ③ | `npm test` | **2.196 ca · 0 đỏ** ✔ |
| ④ | Cổng nghiệm thu | 20 xanh · **13 đỏ** — so từng cổng với `ba9b048` ở mục 3b |
| ⑤ | Biến sắp bật đã khai | `V3_GHI_KHO_BOT` · `V3_SHEET_CHI_DANH_BA` có dòng trong `bien-moi-truong-v3.md` ✔ (`66cbc7c`) |
| ⑥ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑦ | Prod đang sống | `aicloser` · `aicloser-v3` · `aicloser-worker-v3` **active** · `/health` `{"ok":true,"pages":131}` · UI 3102 **200** (trong & ngoài) · prod ở `ba9b048`, 0 tệp sửa tại chỗ, 22 tệp dữ liệu lạ · lược đồ **24 bản** (cuối `024_giao_page_bot_moi`) · đĩa trống 77 G |

### 3b · Cổng đỏ: vì MÃ hay vì THƯỚC

Sáng 28/09 lúc deploy `ba9b048` sổ đã ghi **14 cổng đỏ «y hệt trên b9375da»** (neo bảng, import
pancake, ca cũ). Lượt này so TỪNG cổng trên worktree sạch `ba9b048` và trên HEAD:

| Cổng | `ba9b048` | HEAD `66cbc7c` | Vì sao — có phải MN không |
|---|---|---|---|
| b-y3 · bh1 · g2-a3 · l1-m2 · l2-m1 · l2-m2 · l3-m4 · va-r1 · va-r2 | đỏ | đỏ, **cùng số phép trượt** | nợ cũ — không phải MN |
| bh7 | (chưa có cổng) | đỏ ④ | cổng tìm câu luật TIẾNG VIỆT trong `CORE`; BH8 đã dịch `CORE` sang tiếng Anh — thước của BH7/BH8 |
| l2-m3 | đỏ ① | đỏ ① + ⑥ | `khopCore=false`, độ dài luật 7111→7735: `CORE` đổi ở BH7/BH8 — không phải MN |
| l0-m1 | đỏ (3 phép ⏸ không đo được: worktree thiếu tệp dữ liệu) | đỏ ② ③ ⑨ | ② neo thiếu `lan_gui`·`token_pancake`·`nap_bo_qua` (cũ); `anh_san_pham` (MN1) **đã thêm vào neo**; ⑨ là hệ quả của ② |
| l1-m1 | ⏸ (không có `pancake-shops.json`) | đỏ «đọc được 0 đơn» | cần mạng/POS thật — nhánh VPS, không phải MN |

⇒ **0 cổng đỏ vì MN.** Chỗ duy nhất MN chạm (neo `anh_san_pham`) đã sửa thước cùng lượt.

Cổng `l0-m1`: neo bảng gõ tay thiếu `anh_san_pham` (của MN1) — **đã sửa thước** cùng lượt; ba
bảng `lan_gui` · `token_pancake` · `nap_bo_qua` thiếu từ trước ⇒ nợ §9, không thuộc CR này.

## 4 · Sao lưu — làm TRƯỚC mọi thứ

```bash
B=/var/backups/aicloser/truoc-mn5-$(date -u +%Y%m%dT%H%M%SZ); mkdir -p $B
cd /opt/aicloser
cp -a kb-overrides.json sheet.json .env $B/
tar -czf $B/uploads.tar.gz public/uploads
set -a; . ./.env; set +a; pg_dump -Fc "$DATABASE_URL_V3" > $B/aicloser_v3.dump
systemctl cat aicloser aicloser-v3 aicloser-worker-v3 > $B/units.txt
git rev-parse HEAD > $B/commit.txt
ls -la $B && du -sh $B
```

## 5 · Lệnh theo thứ tự — mỗi bước một điểm đo

### A · Mã + lược đồ (LƯỢC ĐỒ TRƯỚC, mã chạy SAU)

```bash
# máy dev — ĐIỂM DỪNG ① push
git push origin vao-ui-v3-17-09
# prod
cd /opt/aicloser && git fetch origin && git checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09
npm ci --omit=dev
node --env-file=.env db/migrate.js          # kỳ vọng: áp mới 1 (025) · tổng 25
systemctl restart aicloser aicloser-v3 aicloser-worker-v3     # ĐIỂM DỪNG ②
```
**Đo A:** ba dịch vụ `active` · `journalctl -u aicloser -u aicloser-v3 -u aicloser-worker-v3 --since "2 min ago" | grep -ciE "error|throw"` = 0 · chờ ~40 s rồi `/health` `pages` ≈ 131 · `\d anh_san_pham` có bảng · UI 200.
*Vì sao an toàn khi chưa có cờ:* mã mới vắng `V3_GHI_KHO_BOT` thì lượt lưu sản phẩm/kịch bản trên
v3 bị TỪ CHỐI rõ ràng (cửa ghi đóng, như hôm nay); vắng `V3_SHEET_CHI_DANH_BA` thì bot đọc Sheet
y như cũ. `writeOverrides` nay ném khi ghi hỏng thay vì nuốt lỗi — không đổi gì khi ghi thành.

### B · Nạp dữ liệu (TRƯỚC khi đổi `PUBLIC_URL` — xem ⚠️)

```bash
cd /opt/aicloser
node --env-file=.env ops/bin/nap-mot-nguon.mjs          # CHẠY THỬ — kỳ vọng: 77/77 khứ hồi khớp
node --env-file=.env ops/bin/nap-mot-nguon.mjs --ghi    # MỘT giao dịch cho cả lượt
```
**Đo B:** «ĐÃ GHI: N page» với N = số page có dòng `page` (đo 28/09: 76/77 có — page còn lại in
ra ở dòng «thiếu dòng page», để người gán sau) · cảnh báo đúng loại đã biết (75 không tên · 6
số lượng dự phòng · 2 đổi id `SP01-2`) · `SELECT count(*) FROM anh_san_pham` ≈ 543 trừ ảnh của page thiếu.
⚠️ **Thứ tự bắt buộc:** script nhận ra ảnh «của máy mình» bằng tiền tố `PUBLIC_URL` HIỆN HÀNH
(`http://169.58.33.8:3100/uploads/`). Đổi `PUBLIC_URL` trước bước này thì 43 ảnh ấy bị chép thành
link ngoài chết thay vì đường `/uploads/…` tương đối.

### C · Mở đường «lưu là chạy»

```bash
mkdir -p /etc/systemd/system/aicloser-v3.service.d
printf '[Service]\nEnvironment=V3_GHI_KHO_BOT=1\n' > /etc/systemd/system/aicloser-v3.service.d/mn5.conf
systemctl daemon-reload && systemctl restart aicloser-v3                     # ĐIỂM DỪNG ②
tr '\0' '\n' < /proc/$(systemctl show -p MainPID --value aicloser-v3)/environ | grep -E '^(V3_GHI_KHO_BOT|PANCAKE_READONLY)='
```
**Đo C (hành vi, không phải «biến có trong env»):** `V3_GHI_KHO_BOT=1` và `PANCAKE_READONLY=1`
cùng có · đẩy lại MỘT page: `node --env-file=.env ops/bin/day-lai-ban-chep.mjs --page <pid>` ⇒
«bot nhận … (đã đọc lại khớp)» · bật/tắt bot trên màn VẪN báo cửa ghi đóng (cờ hẹp).
Chọn `<pid>` = một page có ảnh `/uploads` (script chạy thử liệt kê).

### D · Ảnh sống lại

```bash
mkdir -p /etc/systemd/system/aicloser.service.d
printf '[Service]\nEnvironment=PUBLIC_URL=http://169.58.33.8:3102\n' > /etc/systemd/system/aicloser.service.d/mn5-anh.conf
systemctl daemon-reload && systemctl restart aicloser                         # ĐIỂM DỪNG ②
# chờ ~40 s cho bot nạp page, rồi:
node --env-file=.env ops/bin/day-lai-ban-chep.mjs                 # chạy thử: đếm ảnh sẽ đổi gốc
node --env-file=.env ops/bin/day-lai-ban-chep.mjs --page <pid>    # một page
curl -s -o /dev/null -w '%{http_code}\n' http://169.58.33.8:3102/uploads/<một tệp của page đó>   # từ NGOÀI máy chủ
node --env-file=.env ops/bin/day-lai-ban-chep.mjs --tat-ca        # ĐIỂM DỪNG ③ mở rộng
```
**Đo D:** `/health` pages ≈ 131 · ảnh `/uploads` tải được từ ngoài (200) · `--tat-ca` in «XONG: N
page» không lỗi · chạy thử lần nữa ⇒ **N/N khớp, 0 ảnh đổi gốc** · trong `kb-overrides.json` không
còn chuỗi `:3100/uploads/` (`grep -c ':3100/uploads/' kb-overrides.json` = 0).
⚠️ `PUBLIC_URL` còn làm gốc cho hai link quản trị (`src/health.js`, `src/readiness.js`) trỏ tới
`/admin/api/...` — các link ấy vốn đã chết từ khi cổng 3100 đóng (25/09); đổi gốc không làm tệ hơn.

### E · Sheet chỉ còn là danh bạ

```bash
printf '[Service]\nEnvironment=V3_SHEET_CHI_DANH_BA=1\n' > /etc/systemd/system/aicloser.service.d/mn5-sheet.conf
systemctl daemon-reload && systemctl restart aicloser                         # ĐIỂM DỪNG ②
```
**Đo E:** env từ `/proc` có `V3_SHEET_CHI_DANH_BA=1` · `journalctl -u aicloser` có dòng
`[kb] Đa-page (Sheet): N page.` với N ≈ trước (danh bạ giữ nguyên) · `/health` pages ≈ 131 · tên
page trên màn v3 không đổi. Hành vi «ba khối biến khỏi prompt» đo gián tiếp: thước
`test/mn5-sheet-danh-ba.test.mjs` SD2 trên cùng mã + env thật của tiến trình — bot KHÔNG có cửa
nào in ra đoạn prompt đã ghép; ghi rõ là đo gián tiếp.

## 6 · Ngưỡng + mốc quan sát (viết trước khi mở)

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| sau mỗi restart +1′ | tiến trình sống, không vòng restart | `systemctl is-active` · `journalctl -u <unit> --since "1 min ago" \| grep -ci "Started"` | chết 1 lần hoặc >1 lần Started = lùi bước vừa làm |
| +5′ | lỗi mới | `journalctl -u aicloser -u aicloser-v3 -u aicloser-worker-v3 --since "5 min ago" \| grep -iE "error\|throw\|ECONN"` | lỗi mới lặp = lùi bước vừa làm |
| +5′ | bot còn đủ page | `curl -s localhost:3100/health` | `pages` < 120 (đo trước 131) sau 60 s = lùi |
| +15′ | bản chép còn khớp | `day-lai-ban-chep.mjs` (chạy thử) | ≠ ngoài danh sách đã biết (`SP01-2`) = điều tra, chưa lùi |
| +1 ngày | không ai sửa Sheet rồi thắc mắc | hỏi team marketer · `nhat_ky` có `v3_sua_san_pham`/`v3_sua_anh_san_pham` | — |

## 7 · Đường lùi (viết sẵn, theo từng bước — lùi ĐÚNG bước hỏng, ngược thứ tự)

```bash
# E — Sheet quay lại cấp sản phẩm + ba khối
rm /etc/systemd/system/aicloser.service.d/mn5-sheet.conf && systemctl daemon-reload && systemctl restart aicloser
# D — gốc ảnh cũ + bản chép cũ (lượt đẩy đã ghi lại link tuyệt đối theo gốc mới)
rm /etc/systemd/system/aicloser.service.d/mn5-anh.conf && systemctl daemon-reload
cp -a $B/kb-overrides.json /opt/aicloser/kb-overrides.json && systemctl restart aicloser
# C — đóng lại đường «lưu là chạy» (lượt lưu trên v3 sẽ bị từ chối rõ ràng, như trước)
rm /etc/systemd/system/aicloser-v3.service.d/mn5.conf && systemctl daemon-reload && systemctl restart aicloser-v3
# B — gỡ dữ liệu vừa nạp (CASCADE sang goi_gia + anh_san_pham); không đụng dòng nào khác
set -a; . /opt/aicloser/.env; set +a; psql "$DATABASE_URL_V3" -c "DELETE FROM san_pham WHERE nguon='kb'"
# A — lùi MÃ, GIỮ LƯỢC ĐỒ (025 chỉ THÊM; mã cũ chạy được với nó). KHÔNG `migrate down`.
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 ba9b048 && npm ci --omit=dev && systemctl restart aicloser aicloser-v3 aicloser-worker-v3
```
Mất dữ liệu khi lùi: **không** — mọi lượt sửa làm TRÊN v3 sau bước C nằm trong CSDL + `nhat_ky`;
lùi D thì chúng không còn ở bot, nhưng còn nguyên trong CSDL để đẩy lại.

## 8 · Lệnh đã gõ theo thứ tự
**A** (28/09 ~10:34–10:41 CEST)
1. Sao lưu → `/var/backups/aicloser/truoc-mn5-20260928T083442Z` (56 M: `aicloser_v3.dump` 22 M · `kb-overrides.json` · `sheet.json` · `.env` · `uploads.tar.gz` 34 M · units · commit)
2. đẩy nhánh `vao-ui-v3-17-09` lên origin → `83b4b8d..4a9e234`
3. prod `git fetch` + `checkout -f -B vao-ui-v3-17-09 origin/…` → `4a9e234`, 0 tệp sửa tại chỗ, 22 tệp dữ liệu lạ giữ nguyên · `npm ci --omit=dev` (292 gói) · `db/migrate.js` → **áp mới 1 (025) · tổng 25**
4. `systemctl restart aicloser aicloser-v3 aicloser-worker-v3` (10:35:32 CEST)

## 9 · Số đo tại từng mốc
**A:** ba dịch vụ `active`, mỗi dịch vụ `Started` 1 lần · lỗi mới **0/0/0** (tới +6′) · `/health` `pages:131` sau 14 s (bằng trước) · UI 3102 **200** trong & ngoài · `anh_san_pham` có, 0 dòng · `goi_gia.nhan` có · mã mới đang phục vụ: `POST /api/anh-san-pham/1/link` **401** (có cửa, đòi đăng nhập; không phải 404) · `/uploads/<tệp>` qua 3102 **200** · trang page có «Bot trả lời thế nào» · env từ `/proc` cả ba: `PANCAKE_READONLY=1` `V3_PANCAKE_GUI=0` `V3_POS_GHI=0` — van gửi vẫn đóng, chưa cờ MN5 nào.

## 10 · Kết · nợ · ai gật
- Kết: (giữ / lùi / mở bậc sau)
- Nợ mang theo (đề nghị §9): neo bảng `l0-m1.sh` thiếu `lan_gui` · `token_pancake` · `nap_bo_qua`;
  1 page có trong `kb-overrides.json` nhưng không có dòng `page` v3; 75/79 sản phẩm không tên;
  cổng 3102 mở thẳng Internet không HTTPS (nay còn là nơi Facebook tải ảnh).
- Người gật: … lúc …

## 11 · Phụ lục — cách so cổng
Worktree sạch `git worktree add --detach <tmp> ba9b048` + `node_modules` liên kết + `.env` dev; chạy từng cổng đỏ ở cả hai cây, so `rc` và số phép TRƯỢT, rồi `diff` các dòng ✘/⏸.
