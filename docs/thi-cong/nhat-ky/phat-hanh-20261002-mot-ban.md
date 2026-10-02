# MỞ VAN — MB3: MỘT BẢN (MB1 + MB2 lên prod, tắt `aicloser.service`) (CR-02-10)

> Người quyết gật 02/10: «áp, nới luật hay gì cũng được — quy về 1 mối» (trả lời thẳng câu hỏi «MB3 làm luôn hay chờ gật»).

## 1 · Mở cái gì

- Mã `47f2add` (MB1 — lõi bot chạy TRONG tiến trình v3; worker tự nạp KB; `/webhook` + `/privacy` sang 3102) và `e2b10dd` (MB2 —
  một công tắc `page.bot_ai_bat`, gỡ «giao page / bot cũ–bot mới»), kèm docs `85241c6` `39241ae` + CHANGELOG.
- Dừng và tắt hẳn `aicloser.service` (bot v1, `src/server.js`, cổng 3100). Unit file GIỮ trên đĩa (để lùi).
- **KHÔNG**: migration (0) · đổi `.env` · mở van gửi · bật page nào · đụng `pancake-tool`/`ai_sale` · đụng năm file não.

## 2 · Bậc phơi

Bậc ② — đường ĐỌC/cấu trúc. 582 page đều `bot_ai_bat = false`, cả ba tiến trình `PANCAKE_READONLY=1` · `V3_PANCAKE_GUI=0`
⇒ không một tin nào ra khách. Điều cần chứng minh: v3 tự đứng được khi v1 tắt (màn đọc được, worker nạp KB, không lỗi mới).

## 3 · Cửa vào (02/10)

`ops/bin/phat-hanh.sh` trên `74462a6` (máy dev, lượt đủ không cắt):

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | ✔ |
| ② | So với remote | ✔ không bị bỏ lại; đẩy `24abe05..` = 7 commit (5 của MB + `e9ca5b7` `74ec4c9` giấy LL15b của phiên khác) |
| ③ | `npm test` | **2.451 đạt · 0 đỏ** (2.455 ca · 4 bỏ qua) |
| ④ | Cổng | **53 xanh / 13 đỏ** = 12 nợ cũ đúng TÊN như LL15b (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2) + `l1-m1` (phép ④ «đọc đơn THẬT shop Taiwan trạng thái 12» = 0 đơn lúc đo — dữ liệu POS, `git diff 2cd4558..HEAD -- src/pos src/orders db/migrate` RỖNG). Lượt đầu `l2-m2` trượt 3 (gốc 1): cổng tự dựng page KHÔNG bật công tắc ⇒ thước neo luật cũ; sửa thước 4 cổng chạy handler (`l2-m1` `l2-m2` `l2-m3` `l3-m4` dựng page `bot_ai_bat=true`) ⇒ cả 4 trượt **đúng tên phép** như bản gốc `2cd4558` (3 · 1 · 2 · 33). |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` | bảng khai xanh (thước `bien-moi-truong-khai-du` 3/3); không biến mới để đặt |
| ⑦ | Ai gọi `:3100` ngoài `aicloser` | 0 tệp trong `/opt` (trừ chính `aicloser`), 0 site nginx — tắt v1 không gãy hệ khác |

⑦ Prod trước khi đụng — **06:58:07 CEST**: `HEAD 24abe05` · nhánh `vao-ui-v3-17-09` · 0 tệp theo dõi sửa tại chỗ · `aicloser`
active từ 28/09 11:25:42 · `aicloser-v3` active từ 02/10 06:48:05 (restart của phiên LL15 — `V3_HRM_TU_DONG=1`) · worker active từ
01/10 06:14:55 · lỗi 1 giờ 0/0/0 · `:3100/health` 200 · `:3102/privacy` 404 (chưa có — đúng).

## 6 · Ngưỡng + mốc quan sát (viết TRƯỚC khi gõ)

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| ngay | đúng mã, cây sạch | `git rev-parse --short HEAD` = mã đẩy · `git status --porcelain --untracked-files=no` rỗng | lệch = DỪNG trước restart |
| +1′ | hai dịch vụ v3 sống, không vòng restart | `is-active` + đếm `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | lõi dựng trong tiến trình | journal `aicloser-v3` có «[lõi] chay-that: KB …» + «đã làm nóng cửa kiểm: N page»; worker có «[lõi] worker-v3: KB …» | thiếu = điều tra |
| +1′ | cửa sống | `:3102/privacy` 200 · `:3102/webhook?hub.mode=subscribe&hub.verify_token=sai` 403 · `/page-bot` (chưa đăng nhập) 401/302 | 5xx = lùi |
| +1′ | v1 tắt hẳn | `is-active aicloser` = inactive · `is-enabled` = disabled · `:3100` không nghe | còn chạy = làm lại |
| +1′ · +5′ · +15′ | KHÔNG page nào tự bật, không tin nào ra | `SELECT count(*) FROM page WHERE bot_ai_bat` = 0 · `lan_gui` không dòng mới | khác 0 mà không ai bấm = lùi |
| +5′ · +15′ | lỗi mới | journalctl hai dịch vụ v3 `error|throw|ECONN|unhandled` | lỗi mới lặp = lùi |

## 7 · Đường lùi (viết TRƯỚC)

Lùi đủ (< 2 phút, không mất dữ liệu — 0 migration, 0 đổi `.env`):
`cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 24abe05 && systemctl restart aicloser-v3 aicloser-worker-v3 && systemctl enable --now aicloser`.
Mốc lùi: `/var/backups/aicloser/truoc-mot-ban-<giờ>/` — `commit.txt` (`24abe05`) · `env.bak` (600).
Chỉ lùi phần tắt v1 (giữ mã mới): `systemctl enable --now aicloser` — mã mới vẫn chạy được `src/server.js` (`V3_LEGACY_POLL_OFF=1`
còn trong `.env`, MB2 giữ cờ này tới MB4 đúng cho đường lùi này).

## 8 · Lệnh đã gõ

Giờ prod (CEST). Phiên LL15 (cùng người quyết) xác nhận KHÔNG deploy/restart trong lúc làm MB3.
1. Cửa vào (máy dev): `npm test` 2.451 đạt 0 đỏ · 53 xanh / 13 đỏ (mục 3) · CHANGELOG `74462a6` · thước 4 cổng + hồ sơ `94d7cd5`.
2. Đẩy `24abe05..94d7cd5` (8 commit — 6 MB + 2 giấy LL15b của phiên khác).
3. Mốc lùi `/var/backups/aicloser/truoc-mot-ban-20261002T052340Z/` — `commit.txt` = `24abe05` · `env.bak` (600).
4. `git fetch` + `checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09` → `94d7cd5` · 0 tệp theo dõi sửa tại chỗ.
5. KHÔNG migration (0) · KHÔNG đổi `.env` · KHÔNG gói mới (`git diff 24abe05..HEAD -- package*.json db/migrate` rỗng).
6. `systemctl restart aicloser-v3 aicloser-worker-v3` lúc **07:23:43**.
7. `systemctl disable --now aicloser` lúc **07:23:43** → `inactive / disabled` (unit giữ trên đĩa để lùi).

## 9 · Số đo từng mốc

| Mốc | Giờ | Kết quả |
|---|---|---|
| +1′ | 07:25:16 | hai dịch vụ v3 active · Started 1/1 · lỗi 0/0 · `aicloser` inactive/disabled · `:3100` không nghe · lõi trong tiến trình: «[lõi] chay-that: KB no-base/77 · Sheet đồng bộ 5′ · sổ đăng ký page quét» + «đã làm nóng cửa kiểm: 699 page»; worker «[lõi] worker-v3: KB no-base/77 · Sheet đồng bộ 5′» + «page được phép: KHÔNG CÓ (chưa page nào bật bot — cột page.bot_ai_bat)» · `/privacy` 200 · `/page-bot` 401 (chưa đăng nhập) · đối chứng 404 · `/webhook` 404 = ĐÚNG (`.env` dòng 75 `META_WEBHOOK_OFF=1`, y hành vi v1) · page bật bot **0/582** · `lan_gui` 30′ **0** · «chưa nối: ghiSoAi» có từ lần khởi động 06:48 (không do MB) |
| +5′ | 07:29:44 | y như +1′ — Started 1/1 · lỗi 0/0 · `aicloser` inactive/disabled · `:3100` không nghe · `/privacy` 200 · `/page-bot` 401 · Sheet đã đồng bộ lượt 2 (nhịp 5′ chạy trong v3) · sổ đăng ký page 2 dòng · page bật bot 0/582 · `lan_gui` 60′ 0 |
| +15′ | 07:39:19 | y như +1′ — Started 1/1 · lỗi 0/0 · `aicloser` inactive/disabled · `:3100` không nghe · Sheet đồng bộ lượt 4 · sổ đăng ký page 4 dòng · page bật bot 0/582 · `lan_gui` 60′ 0 |

## 10 · Kết

**GIỮ.** Ba mốc sạch, không vòng restart, không lỗi mới; v3 tự đứng khi v1 tắt — lõi (KB · Sheet danh bạ · page Pancake · sổ đăng ký ·
cửa kiểm 699 page) chạy trong tiến trình v3, worker nạp KB 77 page và đọc đúng công tắc `bot_ai_bat` (0 page). Không tin nào ra khách.
Phía mình nay chỉ còn hai dịch vụ: `aicloser-v3` (3102) + `aicloser-worker-v3`. Việc kế: MB4 (gỡ mã v1 + lưu trữ JSON + đổi chữ «bot cũ»
trên màn) sau ≥ 3 ngày ổn — sớm nhất 05/10. Phiên LL15 được báo đóng cửa sổ lúc ~07:40 để mở van LL15c/LL15d.
