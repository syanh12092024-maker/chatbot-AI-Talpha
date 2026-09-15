# NHẬT KÝ MỞ VAN — 15/09/2026 · bốn cửa CRUD cấu hình

> Viết TRƯỚC khi gõ lệnh mở (skill `mo-van` §4, §5). Phần «số đo tại từng mốc» điền sau.
> Người gật: chủ dự án, lệnh trực tiếp trong phiên 15/09 («push + mở van đi»).

## ① Mở cái gì

Đưa `e657af1..90e20ba` (**11 commit**) lên VPS. Nội dung: bốn chỗ cấu hình trước nay phải
SSH + `psql` mới sửa được, nay sửa được trên màn v3.

- CRUD **kết nối POS** (`ket_noi_pos`: thị trường · shop · khoá API) — 4 cửa ghi mới;
- sửa **thị trường · ngành hàng · lời khai Botcake** của page, kèm bản vá `db/di-tru/nap.js`
  để lượt «Kéo dữ liệu về» thôi ghi đè hai cột đầu;
- **tạo người dùng** + cấp vai trong một lượt (nới cổng danh tính đúng bảng `nguoi_dung`);
- ô **Marketer** chuyển sang chỉ đọc (lệnh người quyết);
- giấy tờ: khai bù 12 biến `V3_*`, ghi bù §10 cho 3 commit của phiên 14/09.

**Phạm vi tệp:** 38 tệp · +2.9k dòng. Đất chạm: `v3/src/ui/**`, `v3/src/noi-day/`,
`v3/src/audit/`, `src/pos/ket-noi.js`, `src/queue/chay-worker.js`, `db/di-tru/nap.js`,
`ops/`, `docs/`, `test/`.

**KHÔNG chạm:**

| Đo | Kết quả |
| --- | --- |
| tệp PHẲNG ngay dưới `src/` (62 tệp CẤM của bản đang chạy) | **0** |
| bộ não chat (`prompts.js` `closer.js` `tools.js` `fast-lane.js` `outbound-guard.js`) | **0** |
| migration mới (`db/migrate/`) | **0** — không có lược đồ nào phải lên trước |
| cờ `V3_*` được BẬT trong lượt này | **0** |

## ② Bậc phơi

**Bậc ② — prod, đường ĐỌC + cửa ghi NỘI BỘ.** Màn v3 là bảng điều khiển nội bộ; lô này
không mở một đường gửi tin nào tới khách. Dịch vụ `aicloser` (bot nói với khách) **không bị
chạm và không restart**.

⚠️ Nói rõ phần *không* hoàn toàn vô hại, vì «bậc ②» dễ đọc thành «không rủi ro»:

- **Đường tiền**: `ket_noi_pos` quyết định đơn của một thị trường đi vào shop nào bằng khoá
  nào. Lô này chưa tạo đơn nào (worker chưa chạy, `V3_POS_GHI` chưa bật), nhưng sửa sai một
  kết nối ở đây sẽ hỏng ở lượt tạo đơn ĐẦU TIÊN sau này. Cửa ghi có nhật ký bắt buộc.
- **Quyền**: từ lượt này, một `quan-tri` tạo được tài khoản đăng nhập mới. Đó là mở rộng bề
  mặt quyền thật, có nhật ký bắt buộc (`tao_nguoi_dung`).
- **Hành vi di trú đổi**: sau deploy, `npm run di-tru` và nút «Kéo dữ liệu về» KHÔNG còn ghi
  đè `thi_truong`/`nganh_hang`. Đây là đổi theo chiều AN TOÀN HƠN (thôi xoá công người nhập),
  nhưng vẫn là đổi hành vi của một lệnh chạy trên prod.

## ③ Bảy phép đo cửa vào — output máy

Chạy `bash ops/bin/phat-hanh.sh` lúc 10:57 tại mốc `aeda3b8`.

| # | Phép | Kết quả |
| --- | --- | --- |
| ① | `git status --porcelain` | **0** tệp — cây sạch |
| ② | `git log origin/main..HEAD` | **10** commit (nay 11, xem ghi chú dưới) · 0 commit remote chưa lấy |
| ③ | `npm test` | **1.733 xanh · 1 đỏ** — ca đỏ duy nhất là **D7**, đỏ sẵn từ trước (§9) |
| ④ | 25 cổng nghiệm thu | **22 xanh · 3 đỏ** — xem §③b |
| ⑤ | biến sắp bật | **không bật biến nào** trong lượt này |
| ⑥ | `grep '^PANCAKE_READONLY=1' .env` | ✔ có — máy dev không bắn tin ra khách |
| ⑦ | prod trước khi đụng | ⏸ **KHÔNG ĐO ĐƯỢC** — phiên này không có khoá SSH tới `169.58.33.8` (`Permission denied (publickey,password)`). Người gõ lệnh deploy phải đo ⑦ trước, xem §⑥. |

> **Ghi chú về ②:** cổng đo tại `aeda3b8`. Sau đó thêm đúng một commit `90e20ba` — chỉ sửa
> `ops/systemd/aicloser-v3-worker.service`, là BẢN MẪU chưa cài trên VPS, không tiến trình
> nào nạp. Không đo lại vì nó không nằm trong đường chạy của lượt deploy này.

### ③b · ba cổng đỏ, đỏ vì gì — đã soi từng cổng

| Cổng | Ca đỏ | Đỏ vì |
| --- | --- | --- |
| `l0-m1.sh` | `D7 · page LẠC được liệt kê đủ` | **nợ cũ**, §9 đã ghi |
| `l0-m2.sh` | `D7` + `S5 · thiếu tien_vnd thì nói ra` | D7 + **dãy S chập chờn** (nợ 14/09) |
| `g2-a5-a6.sh` | `S5`/`S8` của cùng tệp ấy | **dãy S chập chờn** |

Cả ba **không liên quan lô này**. Bằng chứng cho dãy S: chạy riêng
`test/l0-m2-so-lieu.test.js` bốn lượt liên tiếp ra bốn tập khác nhau — `S5` · `S4+S5+S8` ·
**sạch** · `S5`. Đúng hành vi đã ghi sổ 14/09.

**Một cổng ĐỎ VÌ LÔ NÀY, đã đóng trước khi mở van:** `g2-a3.sh` bắt `src/pos/ket-noi.js`
thêm 2 câu `UPDATE` tay ⇒ kiểm kê đất A 15 → 17 ⇒ «CÓ CỬA GHI MỚI». Không gộp được vào bộ
dựng chung vì `ket_noi_pos` chứa khoá API mã hoá nên CỐ Ý ngoài `BANG_NGHIEP_VU_CHUAN` —
cùng loại `src/queue/kho.js`. Dời mốc theo tiền lệ 01/09: khai `ly_do()` + chú thích inline
+ ghi §9. Sau khi vá: **6 phép · ĐẠT 6 · TRƯỢT 0** (`aeda3b8`).

### ③c · script nói ⛔, và vì sao vẫn mở

`ops/bin/phat-hanh.sh` kết luận **⛔ CHƯA ĐỦ ĐIỀU KIỆN PHÁT HÀNH**, vì nó đếm mọi ĐỎ như
nhau. Hai nguồn ĐỎ còn lại là **D7** và **dãy S**, cả hai:

- có trước lô này, đã ghi §9, không tệp nào của lô chạm vào chúng;
- đã được chở qua đúng như thế ở lượt mở van **14/09** (nhật ký hôm ấy ghi «chỉ D7, đỏ sẵn
  từ trước»);
- người quyết được báo cả hai trước khi gật (phiên 15/09).

📌 Ghi thẳng ra đây để lần sau không ai đọc lượt này thành «cổng xanh nên mở». Cổng ĐỎ, và
mở là một QUYẾT ĐỊNH CÓ NGƯỜI CHỊU, không phải một phép đo đạt.

## ④ Cửa sổ quan sát — ngưỡng viết trước

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
| --- | --- | --- | --- |
| +0′ | prod trước khi đụng (phép ⑦ nợ lại) | `systemctl is-active aicloser` · `curl -s localhost:3100/health` | khác `active`/`{"ok":true…}` ⇒ **DỪNG, chưa pull** |
| +2′ | hai dịch vụ v3 sống, không vòng lặp restart | `systemctl is-active aicloser-v3 aicloser-v3-xemthu` · `journalctl -u aicloser-v3 --since "2 min ago" \| grep -ci "Started\|Stopped"` | chết, hoặc restart >1 lần = lùi |
| +2′ | **bot KHÔNG bị ảnh hưởng** | `systemctl is-active aicloser` + `curl -s -o /dev/null -w %{http_code} localhost:3100/health` | khác `active`/200 = **lùi ngay** |
| +5′ | màn trả về trang, không 5xx | `curl -o /dev/null -w %{http_code} localhost:3102/dang-nhap` và `:3101/dang-nhap` | 5xx = lùi |
| +15′ | không có lỗi mới lặp lại | `journalctl -u aicloser-v3 --since "15 min ago" \| grep -iE "error\|throw\|ECONN"` | lỗi mới lặp = lùi |
| +30′ | **cửa ghi mới có thật sự chạy không** | mở `/ket-noi`, bấm sửa một kết nối POS **đang tắt** (không phải kết nối đang phục vụ đơn); rồi mở `/nhat-ky` xem có dòng `sua_ket_noi_pos` | bấm mà không có dòng nhật ký = cửa ghi rơi vào hư không ⇒ lùi |
| +1 ngày | đơn không giảm, tin không đúp | đếm đơn theo ngày, so PHÂN BỐ chứ không so TỔNG | giảm thật = lùi |

⚠️ Mốc +30′ là mốc **hành vi**, cố ý: cờ bật ≠ hiệu lực (bẫy án lệ §8.1 của skill). Lô này
có bốn cửa ghi mới, và cách duy nhất biết chúng sống là bấm một cái rồi đi tìm dấu vết.
Chọn kết nối **đang tắt** để phép đo không chạm đường tiền đang chạy.

## ⑤ Đường lùi — viết trước

**Rẻ nhất, dừng ngay** (bot v1 không dùng chung tiến trình, không bị đụng):

```
systemctl stop aicloser-v3 aicloser-v3-xemthu
```

**Lùi code đúng luật** (không `reset --hard` trên prod, không sửa tay file trên VPS):

```
# máy dev
git revert --no-edit e657af1..90e20ba && git push origin main
# VPS
cd /opt/aicloser && git pull --ff-only origin main && systemctl restart aicloser-v3 aicloser-v3-xemthu
```

Mất khoảng 3 phút. **KHÔNG mất dữ liệu:** lô này không có migration lược đồ (đo: 0 tệp
`db/migrate/`), nên không có gì phải `migrate down` — và theo án lệ 01/09, `migrate down`
KHÔNG BAO GIỜ là đường lùi trên CSDL thật.

**Dữ liệu người dùng đã nhập trong cửa sổ quan sát thì sao:** kết nối POS / người dùng / thị
trường được tạo trước lúc lùi **vẫn nằm trong CSDL** — lùi CODE, giữ SCHEMA và giữ DỮ LIỆU.
Không dòng nào bị xoá. Màn hình tạm mất, dữ liệu không mất.

## ⑥ Lệnh đã gõ — theo thứ tự

**Máy dev (phiên này gõ):**

```
git push origin main          # e657af1 → 90e20ba, 11 commit
```

**VPS (chủ dự án gõ — phiên này KHÔNG có khoá SSH):**

```
ssh root@169.58.33.8

# ⑦ đo TRƯỚC khi đụng — nợ từ cửa vào, phải trả ở đây
systemctl is-active aicloser && curl -s localhost:3100/health; echo

# lấy code
cd /opt/aicloser && git fetch origin main && git pull --ff-only origin main

# restart ĐÚNG HAI dịch vụ v3 — KHÔNG restart aicloser
systemctl restart aicloser-v3 aicloser-v3-xemthu

# +2′
systemctl is-active aicloser aicloser-v3 aicloser-v3-xemthu
curl -s localhost:3100/health; echo
curl -s -o /dev/null -w "3102=%{http_code} " localhost:3102/dang-nhap
curl -s -o /dev/null -w "3101=%{http_code}\n" localhost:3101/dang-nhap
```

⛔ **KHÔNG cài `aicloser-v3-worker` trong lượt này.** Đó là lượt mở van KHÁC, bậc khác, có
điều kiện chưa đủ — xem §⑧.

## ⑦ Số đo tại từng mốc

*(điền sau khi chạy)*

| Mốc | Số đo | Kết |
| --- | --- | --- |
| +0′ | | |
| +2′ | | |
| +5′ | | |
| +15′ | | |
| +30′ | | |

## ⑧ Van WORKER — vì sao KHÔNG mở trong lượt này

Lệnh người quyết là «push + mở van». Van code (`V3_PAGE_XU_LY`) đã sẵn sàng từ `c8309a2`,
nhưng **mở nó là bậc ③ — chạm khách thật** và skill `mo-van` §2 cấm nhảy bậc. Đo ra bốn điều
kiện chưa đủ, không điều nào tôi tự quyết được:

| # | Chặn | Trạng thái |
| --- | --- | --- |
| 1 | **Chưa chọn page thử** — van là danh sách id page, không có id thì không mở được | H8 §8 sổ: ⬜ **chưa làm**. Việc NGƯỜI. |
| 2 | **Bot v1 phải TẮT cho đúng page ấy trước** — nếu không khách nhận tin từ HAI tiến trình | phụ thuộc (1) |
| 3 | **Tài khoản model phải còn tiền** | H6 §8 sổ: 🔴 Kimi *suspended* · Anthropic *credit too low*. Từng làm bot chết 227 phút ngày 23/08. |
| 4 | **514/514 page đang ở team `chua-phan`** | H7 §8 sổ: 🔴 — worker chạy được, nhưng kết quả không màn team nào nhìn thấy |

**Bậc đi trước, làm được ngay sau khi (3) xong:** cài worker với van GỬI ĐÓNG. Bản mẫu unit
nay đã đóng cứng `V3_PANCAKE_GUI=` (commit `90e20ba`) — trước đó nó thừa hưởng
`V3_PANCAKE_GUI=1` từ `/opt/aicloser/.env` và cài vào là gửi thẳng cho khách.

Ở trạng thái đó worker nạp và xử trọn vòng rồi dừng ở `chan_guard`: **0 token, 0 HTTP ghi,
không một byte nào tới khách** — mà `so_ai` và `viec_can_xu_ly` bắt đầu có dòng. Đó là thứ
đóng được một nợ cũ: hai bảng ấy đang 0 dòng trong khi 988 hội thoại ở HANDOFF, nên màn
«Hiệu quả kịch bản» vô dụng và «Trang chủ» mù ô việc-cần-xử.

## ⑨ Nợ phát sinh → §9 sổ

- Dời trần kiểm kê `g2-a3` 15 → 17 (nới trần cho chính mã vừa viết — đã ghi §9, khai lý do).
- Phép ⑦ của cửa vào **không đo được** ở phiên này (không có SSH) — trả bằng lệnh đầu §⑥.
- Cổng phát hành kết luận ⛔ mà vẫn mở: quyết định của người, không phải phép đo đạt (§③c).

## ⑩ Ai gật, lúc mấy giờ

Chủ dự án, lệnh trực tiếp trong phiên 15/09/2026: «push + mở van đi» — sau khi được báo
trạng thái «2 đỏ đều là nợ cũ (D7 · dãy S chập chờn)». Phần **van worker** KHÔNG nằm trong
lượt này; xem §⑧ để biết cần gì trước khi gật lượt sau.
