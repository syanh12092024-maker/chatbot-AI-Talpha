# MỞ VAN — MB4: MỘT BẢN, gỡ bot v1 khỏi mã + dọn máy chủ (CR-02-10)

> Người quyết 02/10: «làm MB4 luôn đi» — bỏ chờ «MB3 ổn ≥ 3 ngày» (MB3 đo +1′/+5′/+15′ lỗi 0, GIỮ). Phiên LL15 xác nhận đã đóng
> cửa sổ LL15c/d (GIỮ, prod `5e81796`, migration 031 áp) và KHÔNG push / KHÔNG đụng prod tới khi MB4 báo đóng +15′.

## 1 · Mở cái gì

- Mã `357795a` (gỡ 28 tệp `src/` + 7 trang `public/` + 8 script; cầu `cau-bot-v1` → `loi-bot`; một nguồn đếm page bật bot;
  migration 030) · `2a02656` (GIỮ `src/wa.js` cho pancake-tool; cổng `mb.sh` ⑦) · docs `6d4186f` + CHANGELOG/nhật ký này.
- Máy chủ, cùng lượt: migration **030** (gỡ `page.giao_bot_moi` · `page.v3_ai_bat`) · restart `aicloser-v3` + `aicloser-worker-v3` ·
  sao lưu rồi gỡ unit `aicloser.service` (+ thư mục `.d` rỗng) · gỡ 2 dòng cron `src/report-cli.js` · `PUBLIC_URL` `:3100` → `:3102`
  (một dòng `.env`; GIỮ nguyên mọi dòng khác, kể cả `V3_BQ_KHOA` · `V3_HRM_TU_DONG` của LL15) · chuyển 11 tệp không còn mã nào
  đọc vào `/opt/aicloser/luu-tru/v1/`.
- **KHÔNG**: mở van gửi · bật page nào · `npm ci`/đổi gói · đụng `wa-auth/` · đụng `pancake-tool`/`ai_sale` · đụng năm file não.

## 2 · Bậc phơi

Bậc ② — cấu trúc/đọc. 582 page `bot_ai_bat = false`, `PANCAKE_READONLY=1` · `V3_PANCAKE_GUI=0` ⇒ không tin nào ra khách. Điều cần
chứng minh: v3 chạy được trên cây đã gỡ v1; migration không làm gãy truy vấn; ba lịch cảnh báo của pancake-tool (mượn `src/wa.js`)
vẫn chạy y như trước.

## 3 · Cửa vào (02/10, máy dev, cây `mb4-mot-ban` @ `2a02656`)

`bash ops/bin/phat-hanh.sh` (lượt đủ, không cắt) — lượt đầu trên `2a02656` bị dừng giữa chừng khi phát hiện `wa.js` (mục 4), chạy lại:

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | ✔ (hai symlink `node_modules` · `script-versions` của worktree đưa vào `info/exclude`) |
| ② | So với remote | ✔ không bị bỏ lại; đẩy `76326fd..` = commit MB4 |
| ③ | `npm test` | **2.302 đạt · 0 đỏ** (2.306 ca · 4 bỏ qua; giảm so với MB2 vì gỡ ca chỉ-v1) |
| ④ | Cổng | **51 xanh / 15 đỏ** = 12 nợ cũ trượt **đúng tên phép** như lượt gốc LL15 (`phat-hanh-cong-20261002T122956`: b-y3 1 · bh1 ĐỎ 3 · bh7 ĐỎ 1 · g2-a3 2 · l0-m1 7 · l1-m2 1 · l2-m1 3 · l2-m2 1 · l2-m3 2 · l3-m4 33 · va-r1 2 · va-r2 1) + `l1-m1` (dữ liệu POS sống, y gốc) + **`g2-a4`** (thước neo luật cũ «đếm theo `ai-enabled.json`» — SỬA THƯỚC, nay 16/16, đảo-vá 12/16; xem phiếu ④) + **`ve8b`** (ca `ll18-khung` K8 7,8 giây khi máy tải nặng — chạy riêng 3/3 xanh, chạy lại cả cổng 16/16 ⇒ chập chờn, không do MB4) |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` | ⚠️ 3 tên `V3_GIA_*` (có từ trước — `v3/test/b/model-bang-gia.test.mjs` ở `76326fd`); biến đổi lượt này: `PUBLIC_URL` — đã có dòng trong bảng khai |
| ⑦ | Marker | code 0 · giấy 11 (cũ) |
| + | `mb.sh` | **18/18** (đảo-vá ⑦: bỏ `wa.js` ⇒ 17/18) |

## 4 · Prod trước khi đụng (08:28–08:35 CEST, chỉ đọc)

`HEAD 5e81796` · nhánh `vao-ui-v3-17-09` · 0 tệp theo dõi sửa tại chỗ · `aicloser-v3` active từ 08:00:15 (LL15) · worker từ 07:23:43
(MB3) · `aicloser` inactive/disabled · lỗi 1 giờ 0/0 · `/privacy` 200 · `/dang-nhap` 200 · cột `giao_bot_moi`/`v3_ai_bat` còn ·
cron 2 dòng `report-cli.js` · `PUBLIC_URL=…:3100`.
Mã đang chạy (`5e81796`) KHÔNG có câu SQL nào nhắc hai cột sắp gỡ (`git grep` — chỉ `kho-page.js:368` đọc thuộc tính dòng ⇒
`undefined`, vô hại) ⇒ migration chạy TRƯỚC restart an toàn.
**Ai mượn cây này (đo 08:3x):** pancake-tool `src/gui-canh-bao.js` (ngoài git) `import './wa.js'` ← `canh-bao-tien.timer` 5′ ·
`care-don-wa.timer` 30′ · `gio-lam-sale.timer` 2′; `gio-lam-wa.service` + `/root/wa_ghep/ghep.mjs` import gói từ
`/opt/aicloser/node_modules` + dùng `wa-auth/`. Mốc nền: ba timer `Result=success` mã 0 · `gio-lam-wa` active từ 29/09 ·
«Cannot find module» 24 giờ = **0**. Không tệp ngoài git nào khác trong cây import tệp sắp gỡ; `aicloser-v3-xemthu` chạy
`v3/xem-thu.js` (không nhập tệp gỡ).

## 6 · Ngưỡng + mốc quan sát (viết TRƯỚC khi gõ)

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| ngay | đúng mã, cây sạch | `git rev-parse --short HEAD` = mã đẩy · `git status --porcelain --untracked-files=no` rỗng | lệch = DỪNG trước restart |
| ngay | migration | `_migrations` 30 → 31 · `page` không còn `giao_bot_moi`/`v3_ai_bat` · `bot_ai_bat` còn | lỗi = DỪNG, chưa restart |
| ngay | `.env` chỉ đổi 1 dòng | `diff env.bak .env` đúng 1 dòng `PUBLIC_URL` · `V3_BQ_KHOA` + `V3_HRM_TU_DONG` còn | khác = trả `env.bak` |
| +1′ | hai dịch vụ v3 sống, lõi dựng | `is-active` · `Started` 1/1 · journal «[lõi] chay-that: KB …» + «[lõi] worker-v3: KB …» | chết / >1 = lùi |
| +1′ | cửa sống | `/privacy` 200 · `/dang-nhap` 200 · `/page-bot` 401 | 5xx = lùi |
| +1′ | ảnh tải được từ ngoài | máy dev `curl` `PUBLIC_URL/uploads/<tệp>` = 200 `image/*` | ≠200 = trả `PUBLIC_URL` cũ + điều tra |
| +1′ | v1 hết hẳn | `systemctl cat aicloser` = không có unit · `:3100` không nghe · cron 0 dòng `report-cli` | còn = làm lại |
| +1′ · +5′ · +15′ | không page nào tự bật, không tin nào ra | `count(*) FILTER (WHERE bot_ai_bat)` = 0 · `lan_gui` không dòng mới | khác 0 mà không ai bấm = lùi |
| +5′ · +15′ | lỗi mới | journalctl hai dịch vụ v3 `error|throw|ECONN|unhandled` | lỗi mới lặp = lùi |
| +5′ · +15′ | pancake-tool KHÔNG gãy | ba timer `Result=success` sau lượt chạy KẾ TIẾP · «Cannot find module» = 0 · `gio-lam-wa` active | 1 lỗi module = khôi phục ngay tệp thiếu |
| +5′ | đồng bộ HRM tự động (LL15) | journal «[chay-that] đồng bộ HRM tự động: {…}» | «HOÃN»/«HỎNG» = báo phiên LL15 |

## 7 · Đường lùi (viết TRƯỚC)

Mốc lùi: `/var/backups/aicloser/truoc-mb4-<giờ>/` — `database.dump` (`deploy/backup.mjs`) · `commit.txt` (`5e81796`) · `env.bak` (600) ·
`crontab.bak` · `aicloser.service` + `aicloser.service.d/` · tag git `truoc-mot-ban` = `76326fd` (cây ngay trước MB4).

- **Lùi mã** (< 2 phút, không mất dữ liệu): `cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 5e81796 && systemctl restart
  aicloser-v3 aicloser-worker-v3`. GIỮ schema (luật `mo-van` §5: lùi CODE, giữ SCHEMA) — mã `5e81796` không truy vấn hai cột đã gỡ.
- **Lùi cấu hình máy** (nếu cần đúng trạng thái trước): `cp -p env.bak /opt/aicloser/.env` (chỉ khi `PUBLIC_URL` mới gây lỗi —
  giá trị cũ vốn đã hỏng) · `crontab crontab.bak` · chép lại unit + `systemctl daemon-reload` (unit vẫn `disabled` như MB3) ·
  `mv /opt/aicloser/luu-tru/v1/* /opt/aicloser/`.
- **pancake-tool gãy** (đường riêng, nhanh nhất): `git -C /opt/aicloser checkout 5e81796 -- <tệp thiếu>` rồi chạy lại timer đó.
- Cột đã gỡ: `030.down` thêm lại hai cột (giá trị toàn 0/false lúc gỡ ⇒ không mất gì) — chỉ khi buộc phải chạy mã cũ hơn MB2.

## 8 · Lệnh đã gõ

_(điền khi mở)_

## 9 · Số đo từng mốc

_(điền khi mở)_

## 10 · Kết

_(điền khi mở)_
