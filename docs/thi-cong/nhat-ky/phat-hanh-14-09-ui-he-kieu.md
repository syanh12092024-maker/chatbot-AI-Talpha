# NHẬT KÝ MỞ VAN — 14/09/2026 · giao diện v3 trên hệ kiểu

> Viết TRƯỚC khi gõ lệnh mở (skill `mo-van` §4, §5). Phần «số đo tại từng mốc» điền sau.

## ① Mở cái gì

Đưa `ae4971b..036c286` (24 commit) lên VPS: **25/25 màn v3 viết lại trên hệ kiểu chung**.
Phạm vi tệp: `v3/src/ui/**` (30 tệp) và `v3/test/b/**` (4 tệp). **Không** chạm `src/`,
**không** di trú lược đồ, **không** thêm biến `V3_*`, **không** bật cờ nào.

Hai lỗi chức năng được sửa trong lô này (cả hai đang sống trên prod):
- khối «Đánh dấu đã xử» không hiện ở hai màn điều phối (`async` bị đọc thành biến);
- màn `/viec/:id` chết trắng (`veHoSoKhach is not defined`).

## ② Bậc phơi

**Bậc ② — prod, đường ĐỌC.** Màn v3 là bảng điều khiển nội bộ; lô này không đổi một cửa ghi
nào (mọi đường `POST` giữ nguyên đường cũ, nguyên thân yêu cầu). Dịch vụ `aicloser` (bot nói
với khách) **không bị chạm và không restart**.

## ③ Bảy phép đo cửa vào — output máy

| # | Phép | Kết quả |
| --- | --- | --- |
| ① | `git status --porcelain` | 0 tệp |
| ② | `git rev-list --count origin/main..HEAD` | 0 (đã push, CI cổng tĩnh xanh — run 34828781708) |
| ③ | `npm test` | `tests 1680 · pass 1677 · fail 1` — chỉ **D7**, đỏ sẵn từ trước (§9) |
| ④ | 25 cổng nghiệm thu | 21 xanh · 4 đỏ, cả 4 nêu đích danh ca đỏ (xem §④b) |
| ⑤ | biến mới | không có biến nào cần khai |
| ⑥ | `grep '^PANCAKE_READONLY=1' .env` | có — máy dev không bắn tin ra khách |
| ⑦ | prod trước khi đụng | `aicloser` active · `localhost:3100/health` = 200 |

### ④b · bốn cổng đỏ, đỏ vì gì

Trước lượt này **5 cổng đỏ mà không cổng nào nêu được ca đỏ** — vì `node --test` của Node 24
in dạng SPEC (`✖`), còn cổng grep dạng TAP (`^not ok`). Đã vá câu đo (ép `--test-reporter=tap`)
ở `b-y4`, `l0-m1`, `l0-m2`, `g2-a5-a6` và `phat-hanh.sh ③`. Sau khi vá:

- `b-y4` → **xanh** (ngoại lệ D7 của chính cổng nay khớp lại được).
- `l0-m1` → đỏ: `not ok 7 — D7 · page LẠC…` — đỏ sẵn, đã ghi §9.
- `l0-m2` → đỏ: D7 + `S4`/`S5` của `test/l0-m2-so-lieu.test.js`.
- `g2-a5-a6` → đỏ: `S5`/`S8` của cùng tệp đó.
- `l1-m1` → đỏ: «đọc được 0 đơn» (điều kiện dữ liệu của máy dev) + 1 mục HOÃN chờ diễn tập VPS.

`test/l0-m2-so-lieu.test.js` **chập chờn**: ba lượt chạy liên tiếp cho ba tập ca đỏ khác nhau
(S4+S5 · S5+S8 · S8 · S3+S5), và lượt `npm test` đầy đủ thì xanh. Tệp này KHÔNG bị lô này chạm.
⇒ nợ §9, không phải hồi quy của lô.

## ④ Cửa sổ quan sát — ngưỡng viết trước

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
| --- | --- | --- | --- |
| +2′ | hai dịch vụ v3 sống, không vòng lặp restart | `systemctl is-active aicloser-v3 aicloser-v3-xemthu` · `journalctl -u aicloser-v3 --since "2 min ago" \| grep -ci "Started\|Stopped"` | chết, hoặc restart >1 lần = lùi |
| +2′ | bot KHÔNG bị ảnh hưởng | `systemctl is-active aicloser` + `curl localhost:3100/health` | khác `active`/200 = lùi ngay |
| +5′ | màn trả về trang, không 5xx | `curl -o /dev/null -w %{http_code} localhost:3102/dang-nhap` và `:3101/dang-nhap` | 5xx = lùi |
| +15′ | không có lỗi mới lặp lại | `journalctl -u aicloser-v3 --since "15 min ago" \| grep -iE "error\|throw\|ECONN"` | lỗi mới lặp = lùi |

## ⑤ Đường lùi — viết trước

Rẻ nhất, dừng ngay (bot vẫn chạy vì không dùng chung tiến trình):
```
systemctl stop aicloser-v3 aicloser-v3-xemthu
```
Lùi code đúng luật (không `reset --hard` trên prod):
```
# máy dev
git revert --no-edit ae4971b..036c286 && CHO_PHEP_MO_VAN=1 git push origin main
# VPS
cd /opt/aicloser && git pull --ff-only origin main && systemctl restart aicloser-v3 aicloser-v3-xemthu
```
Mất khoảng 3 phút. **Không mất dữ liệu**: lô này không có di trú lược đồ và không ghi gì.

## ⑥ Lệnh đã gõ — theo thứ tự

```
# máy dev
CHO_PHEP_MO_VAN=1 git push origin main          # 036c286, rồi afe9ce0
# VPS (root@169.58.33.8)
cd /opt/aicloser && git fetch origin main && git pull --ff-only origin main
systemctl restart aicloser-v3 aicloser-v3-xemthu     # KHÔNG restart aicloser
```

Trước khi kéo, đã soi: 15 tệp bẩn trên VPS đều là **tệp sao lưu chưa theo dõi** (`??`) —
`git diff --stat` rỗng, không có bản vá sửa tay nào bị đè (bài học `51b454f`).

## ⑦ Số đo tại từng mốc

| Mốc | Đo | Kết quả |
| --- | --- | --- |
| +0′ | ba dịch vụ | `aicloser-v3` active · `aicloser-v3-xemthu` active · `aicloser` active |
| +0′ | bot | `localhost:3100/health` = 200 |
| +0′ | màn v3 | `:3102/dang-nhap` = 200 · `:3101/dang-nhap` = 200 · `/chung/kieu.css` = 200, 80.918 byte |
| +1′ | vòng lặp restart | 1 lần khởi động (của chính lượt mở) · 0 lỗi trong log |
| +2′ | HÀNH VI, không chỉ mã trả về | mở hầm SSH tới bản xem thử của VPS rồi chụp `/bat-dau` và `/dieu-phoi` — màn dựng đúng hệ kiểu mới, ô xem nhanh mở được |
| +10′ | ba dịch vụ | vẫn `active` cả ba · 1 lần khởi động · **0** lỗi log v3 · **0** lỗi log bot |
| +10′ | bot | `{"ok":true,"pages":119}` |

## ⑧ Kết

**GIỮ.** Không ngưỡng nào chạm. Không mở bậc sau — lô này không có bậc sau: nó là màn nội bộ,
không có cờ nào để mở rộng, và cửa ghi không đổi.

## ⑨ Nợ phát sinh

- `test/l0-m2-so-lieu.test.js` chập chờn (S3–S8 đỏ ngẫu nhiên theo lượt chạy) — §9.
- `l1-m1` còn một mục HOÃN «ghi ngược thật trên đơn nháp» chờ diễn tập trên VPS — §9.

## ⑩ Ai gật, lúc mấy giờ

Chủ dự án gật «deploy lên VPS đi» — 14/09/2026, phiên làm việc buổi chiều.
