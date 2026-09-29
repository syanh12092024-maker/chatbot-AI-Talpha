# MỞ VAN — NĂM ĐÍCH (sóng LL, CR-28-09c)

> **TRẠNG THÁI: XONG · GIỮ (29/09 07:00 prod) — người quyết gật 29/09: «oke deploy nhé».** Mọi số «đo 29/09» dưới đây là
> phép đo CHỈ ĐỌC trên prod (SSH đọc) trừ khi ghi rõ là lệnh ghi.
> Phiếu CR: `docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md` · sổ §5f.

## 1 · Mở cái gì

Deploy MÃ `b41261e → HEAD` trên nhánh `vao-ui-v3-17-09` — chín phiếu giao diện của sóng LL:

| Phiếu | Commit | Chạm gì |
|---|---|---|
| LL1 | `ee6ad06` | menu năm đích |
| LL2 | `1073c44` | Hộp thư: sale duyệt/sửa/loại đơn Messenger (🔴 quyền mới cho vai sale) · nhận thay bot · tìm khách theo số |
| LL3 | `cb622a6` | cụm tab «Tất cả page» · «Luật chung» |
| LL5 | `cb932da` | Số liệu một dòng tab; Nguồn khách · Rủi ro hoàn nói tuổi con số (`src/db/so-lieu.js` thêm một câu đọc) |
| LL6 | `4cefa72` | Cài đặt một dòng tab; màn Model |
| LL13 | `e771443` | Sản phẩm là lõi; gắn/gỡ món POS vào sản phẩm (`src/products/san-pham-goc.js`) |
| LL10 | `1e5ce30` | «Hội thoại và đơn» → Cài đặt › Vận hành, `?tab=` |
| LL11 | `54f4969` | «hỏi size» thành ô kiến thức sản phẩm (🔴 vào lời dặn bot v3 khi bot v3 bật; `src/chat/rap-prompt.js` +1 nhãn) |
| LL7 | `7e3b946` | ba vai (🔴 quyền: thôi cấp Quản lý · Người duyệt kịch bản) |

Kèm các commit giấy của CR-28-09c (quyết định · hợp đồng · sổ · nhật ký). **Không** migration (lược đồ
giữ 27), **không** đổi gói (`package.json`/`package-lock.json`: 0 dòng diff), **không** biến `V3_*` mới,
**không** đụng năm tệp bộ não (0 tệp trong diff).

### 1b · Restart dịch vụ nào — đo bằng đồ thị import, không đoán

Đồ thị import tĩnh từ ba điểm vào (script tạm ở scratchpad), giao với 38 tệp mã đổi:

| Dịch vụ | Điểm vào | Tệp đổi nằm trong đồ thị | Hành vi đổi? |
|---|---|---|---|
| `aicloser` (bot cũ) | `src/server.js` | `src/db/so-lieu.js` | **Không** — hàm đổi `phanBoRuiRoHoan` chỉ `v3/src/ui/rui-ro-hoan/kho-rui-ro.js` gọi (grep) |
| `aicloser-worker-v3` | `src/queue/chay-worker.js` | `src/db/so-lieu.js` · `src/chat/rap-prompt.js` | **Không** — nhãn `hoi_size` chỉ in khi sản phẩm có khoá đó (prod: 0 dòng `san_pham_goc`) VÀ bot v3 xử lý page (`V3_PAGE_XU_LY` rỗng) |
| `aicloser-v3` (giao diện) | `v3/chay-that.js` | 22 tệp | **Có** |

⇒ **Chỉ restart `aicloser-v3`.** Bot cũ và worker giữ tiến trình đang chạy; lần restart sau của chúng
(nếu có) không đổi hành vi vì hai lý do trên.

## 2 · Bậc phơi

**Bậc ② — prod, đường nội bộ; khách chưa thấy gì.** Đo 29/09:

| Đo | Số | Nghĩa |
|---|---|---|
| env `/proc` cả ba dịch vụ | `PANCAKE_READONLY=1` · `V3_PANCAKE_GUI=0` · `V3_POS_GHI=0` · `V3_PAGE_XU_LY=` | van gửi tin + van tạo đơn POS ĐÓNG |
| `thanh_vien_team` theo vai | `quan-tri` **3** — không dòng nào khác | chưa có sale/marketer nào dùng màn; 0 dòng mang hai vai LL7 thôi cấp |
| `hang_cho_tao_don` | **0** dòng | Hộp thư chưa có đơn chờ nào để duyệt |
| `san_pham_goc` | **0** dòng (0 có kiến thức) | LL11/LL13 chưa có dữ liệu để chạm |

⇒ Lượt này **không gửi được tin nào ra khách, không tạo được đơn POS nào**. «Sale duyệt đơn» là quyền
mới trên giấy; chạy thật khi có người vai sale VÀ `V3_POS_GHI` mở — cả hai KHÔNG thuộc lượt này.

## 3 · Cửa vào — bảy phép đo (29/09 11:30, HEAD `62201ca`, `ops/bin/phat-hanh.sh`)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | 0 tệp chưa commit ✔ |
| ② | So origin | 155 commit chưa đẩy lên `origin/main` · 0 commit remote đi trước ✔; nhánh `vao-ui-v3-17-09` chưa đẩy **31** |
| ③ | `npm test` | **2.266 ca xanh · 0 đỏ** ✔ |
| ④ | Cổng nghiệm thu | 30 xanh · **12 đỏ** — so từng cổng với `b41261e` ở mục 3b |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` đã khai | 3 cảnh báo `V3_GIA_DEEPSEEK_V4_FLASH` · `V3_GIA_GPT_5_6_LUNA` · `V3_GIA_KIMI_K2_6` — tên ghép động của bảng giá, **0 dòng trong diff lượt này**; lượt này không đặt biến nào |
| ⑦ | Prod đang sống | `aicloser` · `aicloser-v3` · `aicloser-worker-v3` **active** (lên từ 28/09 11:22–11:33) · `/health` `{"ok":true,"pages":129}` · UI 3102 **302** (về đăng nhập) · prod ở `b41261e`, **0 tệp sửa tại chỗ**, 22 tệp dữ liệu lạ · lỗi 1 giờ qua **0/0/0** · đĩa trống 76 G |

Marker `[NEEDS CLARIFICATION]`: 0 trong mã; 11 trên giấy — có một mới của LL13 («1 pos id» là mã sản
phẩm POS hay mã biến thể), đang chờ người quyết, không chặn (luật hiện hành «một món chỉ thuộc một
sản phẩm» đúng với cả hai cách hiểu).

### 3b · Cổng đỏ: vì MÃ hay vì THƯỚC

Tập đỏ = tập 13 cổng đỏ lúc deploy `b41261e` (28/09, `phat-hanh-20260928-mot-nguon.md` §3b) **trừ
`l1-m1`** (nay xanh). Không cổng LL nào đỏ. So từng cổng trên worktree sạch `b41261e` và HEAD:

Worktree `git worktree add --detach <tmp> b41261e` + `node_modules` liên kết + `.env` dev + tệp dữ liệu
gitignore liên kết; chạy lần lượt (không song song — hai cây dùng chung tên sandbox), so `rc`, số phép
trượt, rồi `diff` các dòng ✘/🔴/⏸:

| Cổng | `b41261e` (prod) | HEAD `62201ca` | Dòng đỏ khác nhau |
|---|---|---|---|
| b-y3 | rc=1 · 1 | rc=1 · 1 | 0 |
| bh1 | rc=1 · 3 | rc=1 · 3 | 0 |
| bh7 | rc=1 · 1 | rc=1 · 1 | 0 |
| g2-a3 | rc=1 · 2 | rc=1 · 2 | 0 |
| l0-m1 | rc=1 · **6** (59 phép) | rc=1 · **5** (59 phép) | HEAD ⊂ prod: prod thêm «bộ ca MỚI có 21 ca đỏ» (cây phụ); năm phép chung = neo bảng lệch ×2 · một bảng nghiệp vụ thiếu `team_id` ×2 · ⑨ hệ quả |
| l1-m2 | rc=1 · 2 | rc=1 · 2 | 0 |
| l2-m1 | rc=1 · 3 | rc=1 · 3 | 0 |
| l2-m2 | rc=1 · 1 | rc=1 · 1 | 0 |
| l2-m3 | rc=1 · 2 | rc=1 · 2 | 0 |
| l3-m4 | rc=1 · 33 | rc=1 · 33 | 0 |
| va-r1 | rc=1 · 4 | rc=1 · 4 | 0 |
| va-r2 | rc=1 · 14 | rc=1 · 14 | 0 |

⇒ **0 cổng đỏ vì sóng LL** (đo trên dev, hai cây, 29/09). Lần chạy đầu `l0-m1` trên cây prod ⏸ 3 phép vì
worktree thiếu `conv-state.json`/`ai-enabled.json` — đã liên kết tệp và chạy lại; số trong bảng là lần hai.

## 4 · Sao lưu — làm TRƯỚC mọi thứ

Lượt này không đổi dữ liệu, không đổi lược đồ; sao lưu CSDL vẫn làm vì rẻ và vì màn mới GHI được
(gắn món · kiến thức · vai).

```bash
B=/var/backups/aicloser/truoc-ll-$(date -u +%Y%m%dT%H%M%SZ); mkdir -p $B
cd /opt/aicloser
cp -a .env $B/ && git rev-parse HEAD > $B/commit.txt
set -a; . ./.env; set +a; pg_dump -Fc "$DATABASE_URL_V3" > $B/aicloser_v3.dump
ls -la $B && du -sh $B
```

## 5 · Lệnh theo thứ tự

```bash
# máy dev — ĐIỂM DỪNG ① push (người quyết đã gật «oke deploy nhé»)
git push origin vao-ui-v3-17-09
# prod
cd /opt/aicloser && git fetch origin && git checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09
git status --porcelain | grep -v '^??' | wc -l             # kỳ vọng 0
node --env-file=.env db/migrate.js                          # kỳ vọng: áp mới 0 · tổng 27
systemctl restart aicloser-v3                               # ĐIỂM DỪNG ② — CHỈ dịch vụ này
```

## 6 · Ngưỡng + mốc quan sát (viết trước khi mở)

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | tiến trình sống, không vòng restart | `systemctl is-active aicloser-v3` · `journalctl -u aicloser-v3 --since "<giờ restart>" \| grep -c Started` | chết, hoặc `Started` > 1 = lùi |
| +1′ | mã MỚI đang phục vụ (không phải bản cũ) | `curl` các đường mới qua 3102: `/api/hop-thu/don-cho` · `/api/san-pham/goc/1/chi-tiet` · `/hop-thu/hop-thu-ui.js` | đường mới trả **404** = mã cũ còn chạy ⇒ điều tra; `5xx` = lùi |
| +1′ | trang còn vào được | `/` qua 3102 (trong & ngoài) | ≠ 302/200 = lùi |
| +1′ | menu thật theo vai của mã đã deploy | chạy `menuCua` trên prod cho năm vai | quản trị thiếu một trong năm đích, hoặc sale thấy ngoài Hộp thư = lùi |
| +5′ · +15′ | lỗi mới | `journalctl -u aicloser -u aicloser-v3 -u aicloser-worker-v3 --since "<giờ restart>" \| grep -ciE "error\|throw\|ECONN"` | lỗi mới lặp = lùi |
| +15′ | hai dịch vụ KHÔNG được chạm vẫn y nguyên | `ActiveEnterTimestamp` của `aicloser` · `aicloser-worker-v3` · `/health` | timestamp đổi = có ai restart ngoài kế hoạch ⇒ điều tra; `pages` < 120 = điều tra |
| +1 ngày | người dùng thật | hỏi người quyết: quản trị mở năm đích, Hộp thư, Sản phẩm | lỗi chặn việc = lùi |

## 7 · Đường lùi (viết sẵn)

```bash
# lùi MÃ về đúng bản prod hôm nay — không lược đồ, không gói, không biến ⇒ một lệnh + một restart, < 1 phút
cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 b41261e && systemctl restart aicloser-v3
```
Mất dữ liệu khi lùi: **không**. Những gì màn mới đã ghi ở lại CSDL và mã cũ đọc được: `san_pham.ma_goc`
(cột có từ trước), khoá `hoi_size` trong `san_pham_goc.kien_thuc` (mã cũ bỏ qua khoá lạ khi ghép lời
dặn), dòng `nhat_ky` mang mã hành động mới, dòng `thanh_vien_team` (ba vai còn lại vốn hợp lệ ở mã cũ).
Không `migrate down` (không có migration nào để lùi).

## 8 · Lệnh đã gõ theo thứ tự

Giờ prod (CEST), 29/09:
1. ~06:43 sao lưu → `/var/backups/aicloser/truoc-ll-20260929T044346Z` (23 M: `aicloser_v3.dump` 23 M —
   `pg_restore -l` đọc được, 32 mục TABLE DATA · `.env` · `commit.txt` = `b41261e…` · `units.txt`)
2. commit giấy `5bff55e` (CHANGELOG + nhật ký này, ngưỡng + đường lùi) · đẩy nhánh `vao-ui-v3-17-09` →
   `90ed13f..5bff55e`
3. prod `git fetch` + `checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09` → `5bff55e` · 0 tệp sửa tại chỗ ·
   22 tệp dữ liệu lạ giữ nguyên · `db/migrate.js` → **áp mới 0 · tổng 27** · KHÔNG `npm ci` (0 gói đổi)
4. `systemctl restart aicloser-v3` lúc **06:44:40** — chỉ dịch vụ này (mục 1b)

## 9 · Số đo tại từng mốc

**+1′ (06:44:48, prod):** `aicloser-v3` active · `Started` **1** · lỗi mới cả ba dịch vụ **0** · mã MỚI đang
phục vụ — qua 3102 trong máy: `/api/hop-thu/don-cho` **401** · `/api/san-pham/goc/1/chi-tiet` **401** ·
`/hop-thu/hop-thu-ui.js` **401** · `/api/dieu-huong` **401**, còn đường đối chứng không tồn tại
`/api/khong-co-duong-nay` **404** (⇒ 401 là cửa có thật đòi đăng nhập, không phải chặn trùm) · `/` **302** ·
từ NGOÀI máy chủ: `/` **302** · `/dang-nhap` **200** · `/api/hop-thu/don-cho` **401** · hai dịch vụ không
chạm giữ nguyên `ActiveEnterTimestamp` (28/09 11:25:42 · 11:22:22) · `/health` `pages:129` (= trước).
Menu thật theo vai, chạy `menuCua` trên mã đã deploy tại `/opt/aicloser` (đích(số màn tới được)):

| Vai | Menu |
|---|---|
| QUAN_TRI | hop-thu(3) san-pham(1) page(4) so-lieu(4) cai-dat(7) |
| MARKETER | hop-thu(1) san-pham(1) page(2) so-lieu(3) cai-dat(2) |
| SALE | hop-thu(2) |
| QUAN_LY *(thôi cấp — prod 0 dòng)* | hop-thu(1) san-pham(1) page(4) so-lieu(4) cai-dat(6) |
| DUYET_KICH_BAN *(thôi cấp — prod 0 dòng)* | hop-thu(1) page(2) cai-dat(1) |

`VAI_GAN_DUOC` = `quan-tri,marketer,sale`. Đạt ngưỡng: quản trị đủ năm đích, sale chỉ Hộp thư.

**+5′ (06:49:55, prod):** ba dịch vụ active · `Started` từ lúc restart: `aicloser` 0 · `aicloser-v3` 1 ·
`aicloser-worker-v3` 0 · lỗi mới **0/0/0** · `/health` 129 · UI 302.

**+15′ (07:00:28, prod — lượt SSH đầu 06:59 hết giờ ở bước bắt tay, đường mạng; đo lại ngay):** ba dịch vụ
active · `Started` 0 · 1 · 0 · lỗi mới **0/0/0** · `ActiveEnterTimestamp` của hai dịch vụ không chạm y nguyên
(28/09 11:25:42 · 11:22:22) · `/health` 129 · UI 302.

## 10 · Kết · nợ · ai gật

- Kết: **GIỮ** (prod, 29/09 07:00). Cửa sổ kỹ thuật đóng; mốc +1 ngày là người dùng thật mở màn.
- Người dùng mở màn ngay sau deploy và báo ba điều — ghi thành việc tiếp theo, KHÔNG phải ngưỡng lùi
  (không lỗi chặn việc, không mất dữ liệu): **tải chậm** · **bấm menu thì menu biến mất rồi mới hiện
  lại** · **giao diện không giống bản vẽ** (artifact «AI Closer — làm lại từ đầu»). Đo ngay trong lượt:
  mạng từ máy người dùng tới prod RTT ~320 ms, tải thật 2–54 KB/s; `kieu.css` 104 KB không nén,
  `dieu-huong.js` 27 KB, cả ba tệp chung `no-cache`; menu do JS vẽ SAU một lượt hỏi `/api/dieu-huong`.
  E2E trên sandbox bắt thêm: marketer vào `/` rơi vào `/dieu-phoi` **403**; trang 403 in thô thẻ `<b>`.
  ⇒ phiếu LL18 (khung vẽ sẵn từ máy chủ + nén + cache theo phiên bản + khung theo bản vẽ).
- Người gật: người quyết, 29/09 — «oke deploy nhé».
