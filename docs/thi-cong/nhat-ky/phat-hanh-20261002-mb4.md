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

Giờ prod (CEST). Phiên LL15 xác nhận KHÔNG push / KHÔNG đụng prod trong lượt này.
1. Máy dev: cửa vào (mục 3) · commit `357795a` `6d4186f` `2a02656` `27e407a` `bd6459a` · tag `truoc-mot-ban` → `76326fd`.
2. Đẩy `76326fd..bd6459a` (fast-forward) + tag.
3. Mốc lùi `/var/backups/aicloser/truoc-mb4-20261002T070317Z/` — `database.dump` 23 MB · `commit.txt` = `5e81796` · `env.bak` (600) ·
   `crontab.bak` · `aicloser.service` + `aicloser.service.d/`.
4. `git fetch` + `checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09` → `bd6459a` · 0 tệp theo dõi sửa tại chỗ · `src/wa.js` có.
5. `node --env-file=.env db/migrate.js` → «ÁP 030_mot_cong_tac · áp mới 1 · tổng 31» · cột `page` còn `bot_ai_bat`, hai cột cũ đã gỡ.
6. `sed` một dòng `PUBLIC_URL` `:3100` → `:3102` — tên biến y nguyên (78 dòng) · đổi đúng 1 dòng · `V3_BQ_KHOA` + `V3_HRM_TU_DONG` còn.
7. `systemctl restart aicloser-v3 aicloser-worker-v3` lúc **09:03:39**.
8. Gỡ `/etc/systemd/system/aicloser.service` (+ `.d` rỗng) · `daemon-reload` → `systemctl cat aicloser` không còn.
9. Crontab 20 → 18 dòng: gỡ 2 dòng `src/report-cli.js`; 5 dòng pancake-tool y nguyên.
10. `luu-tru/v1/` ← 11 tệp (mục 1); `wa-auth/` tại chỗ.
11. Kiểm riêng đường của pancake-tool, KHÔNG gửi gì: `import('/opt/aicloser/src/wa.js')` → `sendToGroup: function` · `dotenv/config` nạp được.

## 9 · Số đo từng mốc

| Mốc | Giờ | Kết quả |
|---|---|---|
| +1′ | 09:04:01 | hai dịch vụ v3 active · Started 1/1 · lỗi 0/0 · lõi «[lõi] chay-that: KB no-base/77» + «[lõi] worker-v3: KB no-base/77» · `/privacy` 200 · `/dang-nhap` 200 · `/page-bot` 401 · unit `aicloser` không còn · `:3100` không nghe · cron `report-cli` 0 · page bật bot **0/582** · `lan_gui` 60′ **0** · ảnh từ NGOÀI qua `PUBLIC_URL` mới `:3102/uploads` **200 `image/jpeg`** · pancake-tool: ba timer `success`, `gio-lam-wa` active, «Cannot find module» 0 · `import('src/wa.js')` → `sendToGroup: function` |
| +5′ | 09:09:38 | y như +1′ — Started 1/1 · lỗi 0/0 · ba timer pancake-tool đã chạy lại SAU restart (`canh-bao-tien` 09:06:41 · `care-don-wa` 09:08:03 · `gio-lam-sale`) đều `success` · lỗi module 0 · HRM tự động `{taoTaiKhoan:0,…,doiTenTeam:0}` (không HOÃN/HỎNG) |
| +15′ | 09:19:06 | y như +5′ — Started 1/1 · lỗi 0/0 · `canh-bao-tien` 09:16:41 `success` · page bật bot 0/582 · `lan_gui` 0 · cảnh báo journal 3 dòng = «chưa nối: ghiSoAi» (có từ trước MB, MB3 đã ghi) |

## 10 · Kết

**GIỮ.** Ba mốc sạch, không vòng restart, không lỗi mới; cây prod nay là MỘT bản (`bd6459a`): không còn mã, unit, cron hay cổng nào của
bot v1; migration 030 gỡ hai cột thừa; ảnh sản phẩm tải được từ ngoài qua cổng 3102. Ba lịch cảnh báo của pancake-tool chạy y như trước
(nhờ GIỮ `src/wa.js` — bản đầu của MB4 sẽ làm chúng chết). Không tin nào ra khách. CR-02-10 ĐÓNG. Việc kế: bật page Kuwait Luxe Charm
khi đủ điều kiện (người quyết báo team ai_sale tắt page đó trước) — trước page thứ 2 nên trả `N-MB-NGAT-PAGE`.
