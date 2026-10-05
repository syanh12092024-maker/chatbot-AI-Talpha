# MỞ VAN — LL17b · LL15e · LL17d: Số liệu đọc số đơn thật · khoá tài khoản cắt phiên · đơn theo team vào ngày đơn (CR-28-09c)

> **TRẠNG THÁI: ✅ GIỮ** — người quyết gật «Deploy luôn» 05/10 (câu hỏi lô LL17b · LL15e · LL17d + sửa cổng l1-m1) · 0 migration · restart `aicloser-v3` 04:11:58 CEST · mốc +0′/+6′/+15′ sạch.
> Phiếu: `phieu-LL17b.md` · `phieu-LL15e.md` · `phieu-LL17d.md`. Lượt trước: LL17a (prod `b4e7b6d`). LL17c (rủi ro hoàn từ BigQuery):
> người quyết chọn «để nguyên» — giữ số chấm 28/08, chờ LL17 đầy đủ.

## 1 · Mở cái gì

MÃ `b4e7b6d → HEAD`: `8aed3fc` (thước: hộp cát mang pid — chỉ ca/cổng) · LL17b `33cd8aa` · `f3e409d` (cổng l1-m1) · LL15e `2877564` ·
LL17d `6c24be4` + giấy. **0 migration** · 0 gói · 0 tệp bộ não · 0 biến mới (`V3_BQ_KHOA` đã có). Ai đọc: chỉ `aicloser-v3` ⇒ **chỉ
restart `aicloser-v3`** (bot đang bật 0/582 page — không khách nào bị ảnh hưởng).

## 2 · Bậc phơi

Bậc ② — prod, màn nội bộ. 🔴 LL15e đổi lớp đọc vé mà MỌI lượt gọi có cookie đều đi qua: thêm ≤ 4 câu đọc bốn bảng danh tính mỗi người ×
team mỗi 30 giây. Ra ngoài: máy chủ gọi BigQuery ĐỌC ba câu SELECT (thêm câu theo page + bảng lịch sử team HRM), đệm 1 giờ.

## 3 · Cửa vào (05/10, worktree `so-lieu-bq`)

| # | Phép | Số |
|---|---|---|
| ① | Cây sạch | ✔ |
| ② | Nhánh | không bị bỏ lại so với origin/main |
| ③ | `npm test` | **2.338 đạt · 0 đỏ** |
| ④ | Cổng | **60 xanh / 13 đỏ** = 12 nợ cũ đúng tên (b-y3 bh1 bh7 g2-a3 l0-m1 l1-m2 l2-m1 l2-m2 l2-m3 l3-m4 va-r1 va-r2) + `ll15e` CHẬP CHỜN: ca `vai-b-noi-day` đỏ 2 lần trong lượt (hai ca khác nhau, cùng đi qua đăng nhập → đổi team) — chạy lại `ll15e.sh` **10/10**, chạy kèm **311 vòng** `vai-b-noi-day` **0 đỏ**, riêng 6/6, song song 8/8. Gốc CHƯA RÕ; trùng khoảng: phiên GSP3 phát 08:30 và làm trên cây chính, `ai-messages.jsonl` (tệp dữ liệu dùng chung qua symlink, ca 1 đọc nó qua `/api/ban-hoi-thoai`) bị ghi 08:53:39 giữa lượt. Nợ N-VBND-CHAP-CHON. **`l1-m1` nay XANH** (sửa `f3e409d`). Cổng của lô: `ll17b.sh` 10/10 · `ll15e.sh` 10/10 (chạy lại) · `ll17d.sh` 4/4 |
| ⑤ | Dev không gửi | `PANCAKE_READONLY=1` ✔ |
| ⑥ | Biến `V3_*` | không biến mới ✔ |
| ⑦ | Prod | 03:28 CEST 05/10: `b4e7b6d` · 0 tệp sửa tại chỗ · `aicloser-v3` + worker active (worker từ 02/10 09:03:39) · lỗi 1 giờ 0/0 · cửa chưa đăng nhập 401 · `/dang-nhap` 200 · 23 tài khoản, **0 bị khoá** · nhật ký 1 giờ: cắt phiên 0 · đăng nhập 1 · hỏng 0 |

## 6 · Ngưỡng + mốc quan sát

| Mốc | Đo gì | Bằng gì | Ngưỡng lùi |
|---|---|---|---|
| +1′ | sống, không vòng restart | `is-active` · `Started` từ giờ restart | chết / >1 = lùi |
| +1′ | cửa sống | cửa Số liệu 401 · vé rác 401 (KHÔNG 500) · `/dang-nhap` 200 · đối chứng 404 | 5xx = lùi |
| +1′ | đọc thật | node trên prod: bộ đọc đơn + HRM → 30 ngày ba team, ba luồng, «theo hiện tại» (chỉ đếm) | lỗi = điều tra (màn nói «hỏng») |
| +1′ · +6′ · +15′ | LL15e không cắt nhầm | nhật ký `cat_phien` từ mốc | **> 0 khi 0 tài khoản bị khoá = lùi** |
| +6′ · +15′ | lỗi mới | journalctl hai dịch vụ | lỗi mới lặp = lùi |
| +15′ | worker KHÔNG restart | `ActiveEnterTimestamp` y nguyên | đổi = điều tra |

## 7 · Đường lùi

Lùi mã: `cd /opt/aicloser && git checkout -f -B vao-ui-v3-17-09 b4e7b6d && systemctl restart aicloser-v3` (< 1 phút) — không lược đồ,
không dữ liệu (lô không ghi gì vào CSDL ngoài dòng nhật ký `cat_phien`).

## 8 · Lệnh đã gõ

1. cửa vào (worktree `so-lieu-bq`): 60 xanh / 13 đỏ — xem §3 · `npm test` 2.338 đạt 0 đỏ · `ll15e.sh` chạy lại 10/10 + 311 vòng `vai-b-noi-day` 0 đỏ
2. CHANGELOG + hồ sơ + §9 `60ab7ed` · đẩy `fd05a0c..60ab7ed` (chỉ commit của phiên này; commit GSP chưa đẩy của phiên khác để phiên ấy tự rebase)
3. mốc lùi `/var/backups/aicloser/truoc-ll17b-ll15e-ll17d-20261005T021151Z/` — `commit.txt` = `b4e7b6d` · `env.bak` (600)
4. prod `checkout -f -B vao-ui-v3-17-09 origin/vao-ui-v3-17-09` → `60ab7ed` · 0 tệp sửa tại chỗ · migration áp mới 0 · tổng 31
5. `systemctl restart aicloser-v3` lúc **04:11:58 CEST** — chỉ dịch vụ này

## 9 · Số đo từng mốc

| Mốc | Giờ (CEST) | Kết quả |
|---|---|---|
| +0′ | 04:12:10 | `aicloser-v3` Started 1 · lỗi 0 · worker y nguyên (02/10 09:03:39) · khởi động «đơn POS» 1 · «chưa nối: docDonPos» 0 · cửa Số liệu 401 · vé rác 401 (không 500) · `/dang-nhap` 200 · đối chứng 404 · `cat_phien` 0 · khoá 0/23 · **đọc thật từ prod: 2,6 giây · 5.307 dòng · 739 dòng theo page · 30 ngày GCC 6.870 (Messenger 6.822 · trang bán hàng 48) · EU 4.868 (248 · 4.620) · AUUS 606 (565 · 41) · không suy được 0 · theo team hiện tại 3 (cả công ty)** |
| +6′ | 04:18:06 | y như trên — lỗi 0 · `cat_phien` 0 · đăng nhập hỏng 0 |
| +15′ | 04:27:03 | y như trên — lỗi 0 · `cat_phien` 0 · worker y nguyên · đọc thật 3,5 giây · 5.312 dòng · lượt đồng bộ HRM tự động (5′ sau khởi động) ra toàn 0 |

## 10 · Kết

**GIỮ.** Ba mốc sạch; số đơn của Số liệu đọc thật từ prod; lớp đọc vé mới không cắt nhầm ai (0 dòng `cat_phien` khi 0 tài khoản bị
khoá). Chưa đo được trên prod: một lượt cắt phiên THẬT (cần một tài khoản bị khoá trong lúc đang đăng nhập) — đã đo trên Postgres hộp
cát bằng đúng câu khoá của đồng bộ HRM (K7). Nợ: N-VBND-CHAP-CHON (§9).
