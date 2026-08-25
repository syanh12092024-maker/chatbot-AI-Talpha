# TIẾN ĐỘ

> Cập nhật sau mỗi module xong. Đây là chỗ người khác đọc để biết đang ở đâu mà không phải hỏi.

---

## Trạng thái chung

| | |
|---|---|
| Giai đoạn | **2 — sóng 0 đang chạy** (giai đoạn 1: A 12/12 module · B phần rìa xong) |
| Luồng đang làm | **G2-B1 «Cấu hình team» — ba lát xong, lát thứ tư chờ `PHIEU-B-Y3`** |
| Bốn điểm kiểm chặn | **đã đo xong**, kết quả bên dưới |
| Nhánh code v3 | `main` · code nằm ở thư mục `v3/`, **không đụng `src/` đang chạy** |
| Bài test vai B | **339 xanh** (316 trước giai đoạn 2) |

---

## Giai đoạn 2 · sóng 0 — GỠ CHẶN

### G2-B1 · Cấu hình team — 3/4 lát xong (25/08/2026)

| Lát | Việc | Trạng thái |
|---|---|---|
| ① Tổng quan team | số đo thật + cảnh báo suy ra | **xong** |
| ② Thành viên và vai | cấp/rút vai, đủ 5 vai | **xong** |
| ③ Kết nối POS | chỉ hiện trạng thái, không bao giờ hiện khoá | **xong** |
| ④ Gán page ↔ team | chuyển page giữa các team | 🟥 **chặn — `PHIEU-B-Y3`** |

Đường: `/cau-hinh-team` · vào được: `quan-tri` + `quan-ly` · ghi được: `quan-tri`.
Đã triển khai lên VPS (`d38df3b`), dịch vụ `aicloser-v3` + `aicloser-v3-xemthu` khởi động lại.
**Bot thật `aicloser` không bị đụng: `active`, `NRestarts=0` trước và sau.**

#### Đã nghiệm thu bằng số

| Kiểm gì | Kết quả |
|---|---|
| Bài test vai B | **339 xanh / 0 đỏ** |
| Khổ 375px (cổng 3101) | **không cuộn ngang · 0 phần tử tràn** |
| Bốn hành vi ghi, thử thẳng trên trình duyệt | cấp vai `200` · rút vai `200` · rút quản trị cuối `409 quan_tri_cuoi` · mã vai gạch dưới `400 vai_la` |
| Tầng đọc trên **CSDL THẬT** (bài học ①) | chạy đủ 3 team, số khớp: 514 page · 50 bot bật · 514 thiếu marketer · 28.953 hội thoại · 7 kết nối POS |
| Kết nối POS có lộ khoá không | **không** — cả 3 team |
| Trang cho trình duyệt hết vé | `302` → `/dang-nhap?tiep=/cau-hinh-team` |
| Đường `/api` hết vé | `401 {"ma":"chua_dang_nhap"}` |
| Nhật ký sau lượt đo thật | vẫn `0` — phép đo chỉ đọc, không ghi một dòng |

**Chỗ CHƯA nghiệm thu:** chưa mở màn hình bằng mắt trên **dữ liệu thật** (cổng 3102) — CSDL
thật chỉ có một tài khoản `chu@talpha.vn` và thợ không giữ mật khẩu của nó. Đã thay bằng
phép chạy tầng đọc thẳng trên Postgres thật ở bảng trên. Chủ dự án mở
`http://169.58.33.8:3102/cau-hinh-team` là xem được ngay.

### Ba chỗ chặn tìm được TRƯỚC khi viết code, và đã xử

| # | Chặn gì | Xử thế nào |
|---|---|---|
| ① | `suaTheoId` **bỏ rơi `team_id` trong im lặng** (`src/db/truy-van.js:259`) — gọi đúng team thì `UPDATE` chạy, trả về dòng, cột không đổi. Màn hình sẽ báo «đã gán» mà không có gì xảy ra | **phát `PHIEU-B-Y3`** cho người A. Lát ④ hiện MỜ kèm lý do, không giấu |
| ② | Hằng `VAI` mới có **2/5 vai** — gán vai `marketer` thì `taoBoiCanh` ném «vai lạ», người đó đăng nhập được nhưng **không cấp nổi vé** | B nới đủ 5 vai. Bài test cũ chỉ so `VAI ⊆ lược đồ` nên **xanh suốt trong khi thiếu 3 mã**; đã thêm chiều ngược lại |
| ③ | Cổng danh tính **chỉ đọc**, mà `thanh_vien_team` không nằm trong tầng truy vấn của A | B nới GHI cho **đúng một bảng**, không có `sua`, `xoa` chặn điều kiện rỗng |

### Đo lại CSDL thật 25/08 — tài liệu đang ghi SAI

Kế hoạch GD2 và sổ điều hành §8 H7 ghi *«514/514 page ở `chua-phan`»*. **Không đúng nữa:**

| | Thật hôm nay |
|---|---|
| `page` | 514 — **tất cả ở `tieu-alpha`**, `chua-phan` = 0 |
| `page.marketer` rỗng | **514/514** (tài liệu ghi 314/315) |
| `hoi_thoai` | 28.953, tất cả ở `tieu-alpha` |
| `khach` · `don_hang` · `viec_can_xu_ly` | **0 ở mọi team** |
| `nguoi_dung` | **1** · `thanh_vien_team` 3 dòng, cùng một người |
| `cau_hinh_model` | **0 dòng ở mọi team** |
| `nhat_ky` | **0 dòng** |

Vì sao lệch: chủ dự án chốt 24/08 (commit `4524294`) gán **toàn bộ về Tiểu Alpha** bằng
SQL tay — một giao dịch, 514 page + 28.953 hội thoại + 71 kịch bản + 7 kết nối POS, kèm bảng
mốc quay lui `_quay_lui_gan_team_20260824` (29.545 dòng, nay vẫn còn). **Lượt gán đó làm cẩn
thận**; thứ duy nhất thiếu là dòng `nhat_ky`, và thiếu vì chưa có màn hình để ghi.

Nhưng `db/di-tru/nap.js:13` vẫn là `TEAM_KY_THUAT = "chua-phan"` ⇒ **chạy lại di trú thì page
mới lại rơi vào team kỹ thuật**, và lại phải gọi người chạy SQL để kéo ra. Đúng cái việc màn
«Cấu hình team» sinh ra để xoá.

⚠️ Hệ quả: bảng điều phối rỗng vì **thật sự chưa có việc nào**, không phải lỗi màn hình.
Và lớp team đang cô lập một cái rỗng — cả ba team nghiệp vụ dồn dữ liệu vào một team.

---

## Bốn điểm kiểm chặn

Người B đo ngày 22/08/2026, **chạy trên máy chủ 169.58.33.8**, mọi lời gọi **chỉ đọc**.
Chi tiết, số đo, giới hạn phép đo và bộ dò để chạy lại: **`v3/docs/kiem-chan/ket-qua.md`**.

| # | Kiểm gì | Trạng thái | Kết quả |
|---|---|---|---|
| 1 | Gửi WhatsApp bằng API Pancake được không | **treo — thiếu điều kiện để thử** | Tài khoản Pancake có **1.371 page, 100% `platform:"facebook"`**, **không có kênh WhatsApp nào**. Nút chặn là **thủ tục** (WABA + đăng ký số + nối vào Pancake + duyệt mẫu tin), không phải API. Ba việc đó chưa việc nào bắt đầu |
| 2 | Pancake có đẩy tin về không | **không tìm thấy** | Sáu đường webhook ứng viên đều `406`, trong khi `conversations`/`tags` cùng token trả `200` → đường không tồn tại, không phải lỗi quyền. **Giữ vòng hỏi**, độ trễ 8–13 s. Đo thật: một vòng hỏi 317–831 ms. Còn phải hỏi lại hỗ trợ Pancake cho chắc |
| 3 | Botcake kéo bao nhiêu khách từ bình luận | **xong, có số** | **11,3% luồng hội thoại**. 7 ngày trên 47 page: **199 hội thoại bình luận** (~28/ngày) trên tổng 1.768; **82,5%** đã được nhắn riêng → **~23 hội thoại/ngày** do trả lời bình luận đẻ ra |
| 4 | Marketing Message có bật cho Trung Đông không | **treo — lý do nặng hơn** | **App Meta đang bị chặn API hoàn toàn**: `graph.facebook.com/me` → `400 "API access blocked"`. Không tạo được chiến dịch để nộp duyệt. Không ảnh hưởng giai đoạn 1 (đi qua Pancake) |

### Ba việc phải làm ngay, không phải việc code

1. **WhatsApp** — mở WhatsApp Business Account, đăng ký số vào WABA, nối vào Pancake, soạn
   mẫu tin xác nhận đơn gửi Meta duyệt. Đây là đường dài nhất và nằm ngoài tầm kỹ thuật.
   Chưa xong thì **L1-M3 của người A chưa mở được** — làm L1-M1, L1-M2 trước.
2. **Meta** — vào `developers.facebook.com` xem app bị chặn vì lý do gì và kháng nghị.
3. **Botcake** — lấy khoá của 10 page thật (hiện chỉ có **1 khoá**, của page nháp).

### Một việc cần chủ dự án quyết

Tắt Botcake trên **3 page thử** thì chỉ mất ~1,5 hội thoại/ngày — cứ chạy. Nhưng tắt **diện
rộng** thì mất khoảng một phần chín nguồn khách, nên phải có phần **trả lời bình luận**
trước. Màn đó đã vẽ (`03-MAN-HINH.md` nhóm 2) nhưng **nằm ở giai đoạn 3**. Muốn tắt rộng
trong giai đoạn 1 thì phải kéo nó vào — đây là đổi phạm vi, không phải việc code quyết được.

---

## Năm luồng

| Luồng | Ước lượng | Trạng thái | Module xong |
|---|---|---|---|
| L0 · Nền dữ liệu, team, đăng nhập | 5–7 ngày | **phần của B xong** — M1, M2 chờ người A | 2/4 (M3, M4) |
| L1 · Bốn cửa kết nối | 7–9 ngày | **lớp model xong** — ba cửa kia của người A | 1/4 (M4) |
| L2 · Chat Messenger | 5–7 ngày | chưa bắt đầu — của người A | 0 |
| L3 · Hai luồng đơn | 6–8 ngày | chưa bắt đầu — của người A | 0 |
| L4 · Bảng điều phối | 4–5 ngày | **xong** | 2/2 |

`npm test`: **702 bài · 700 pass · 0 fail · 2 skip** (nền của bản đang chạy là 408, không đụng một bài nào). Nhánh `v3/vai-b`.

---

## Sổ module

| Mã | Module | Ai | Ngày xong | Nghiệm thu | Vướng |
|---|---|---|---|---|---|
| — | Nền vai B: bối cảnh team, cổng dữ liệu giả, hợp đồng với A | B | 22/08 | 410 test xanh | Lược đồ và tầng truy vấn của A chưa có → B code theo cổng tiêm từ ngoài, chạy test bằng bản cài giả |
| L0-M4 | Nhật ký thao tác | B | 22/08 | 22 bài của module xanh; kiểm tay 5 ca | Cấm sửa/xoá ở tầng dưới là **quyền cơ sở dữ liệu** — đã ghi thành yêu cầu cho A |
| L1-M4a | Lõi lớp model — 4 nhà, độ ngẫu nhiên, quy giá | B | 22/08 | 505 test xanh; bảng giá khớp `01-QUYET-DINH` mục 7, lệch ≤0,65% | Ba model chưa mở tài khoản có **đơn giá suy ngược**, phải thay bằng giá công bố |
| L0-M3 | Đăng nhập, chọn team, hai vai | B | 22/08 | 505 test xanh; kiểm tay ca xuyên team và ca lộ tài khoản | Dùng **vé ký HMAC** thay bảng phiên — 18 bảng không có bảng phiên, thêm là đổi lược đồ của A |
| L1-M4b+c | Cấu hình model theo team, kho khoá, dự phòng | B | 23/08 | chuyển dự phòng trong **9 ms**; cảnh báo đúng 1 lần sau 6 lượt hỏng; nạp nóng không khởi động lại | `ghiCauHinh` ban đầu **bỏ qua lặng lẽ** tên cột theo hợp đồng → phép thử nạp nóng đậu vì lý do sai. Bắt được nhờ soi nhật ký |
| L4-M1 | Bảng điều phối — hai danh sách, màn chi tiết | B | 23/08 | 100 việc tốn **8 lời gọi cổng**; việc team khác → 404 (không 403); kho không đổi một byte | Mẫu đường POS chưa ai mở bằng mắt → để vào biến môi trường |
| L4-M2 | Đánh dấu đã xử, chọn kết quả và lý do | B | 23/08 | hai người nhận cùng lúc → đúng 1 thắng; đóng lại → 409, kết quả cũ nguyên vẹn | Danh sách **kết quả và lý do** tài liệu chưa chốt → B đề xuất, cần chủ dự án duyệt |
| — | Nối dây phần rìa (`v3/src/vai-b.js`) | B | 23/08 | người thuộc hai team đi hết đường đăng nhập → bảng điều phối | Sinh ra vì **cả hai cách nối sai đã xảy ra thật** lúc chạy thử |

Chi tiết mọi chỗ tự quyết: **`docs/v3/SO-TAY-VAI-B.md`**.

---

## Giai đoạn 2 · người A — trục dữ liệu

Kế hoạch: `docs/v3/gd2/00-KE-HOACH-GD2.md`. Sáu module, làm TUẦN TỰ.

| Mã | Việc | Trạng thái | Đo bằng số |
|---|---|---|---|
| **G2-A1** | Nới tầng truy vấn (`PHIEU-B-Y1`) — đóng nợ **N3** | ✅ **25/08** | nền 22 → **41 pass / 0 fail** trên Postgres 16.15 thật · cổng L0-M2 **26/27** · quét hồi quy 28 bộ ca v3 **319 pass / 1 fail** |
| **G2-A2** | Khoá API theo nhà (`PHIEU-B-Y2`) + migration 008 | ✅ **25/08** | cổng L0-M1 **58/59** · `001→008` áp trọn trên CSDL trắng · down→up khớp vân tay 242 cột · đổi khoá **1 lần → 2/2 ô** đọc ra khoá mới · 5 bộ ca đụng `layModel` xanh trọn |
| G2-A3 | Xoá BA cửa tạm ghi thẳng, gom về tầng truy vấn | ⬜ | |
| G2-A4 | Bảng + API bộ luật chung và kỹ năng (phiên bản · duyệt · xem trước ảnh hưởng) | ⬜ 🟥 | |
| G2-A5 | Bảng + API kịch bản ba tầng có KẾ THỪA, đúng MỘT bản LIVE mỗi page | ⬜ | |
| G2-A6 | API số liệu: báo cáo hai luồng · chi phí AI · A/B · sức khỏe 9 chỉ số | ⬜ | |

Đỏ duy nhất của quét hồi quy là `D7` (`test/l0-m1-di-tru.test.js`), đã A/B trên cùng cây:
bản CŨ 10 pass/1 fail · bản MỚI 10 pass/1 fail ⇒ **không phải hồi quy**, nguyên nhân là dữ
liệu `pages.json`/`ai-enabled.json` trên VPS. Ghi §9, đất L0-M1.

**Hạ tầng đo — sửa 25/08, đọc trước khi chạy bất cứ cổng nào:**

- Máy cá nhân **không có Postgres** (`.env` thiếu `DATABASE_URL_V3`, không docker, 5433 đóng)
  ⇒ mọi bộ ca đụng CSDL chỉ đo được **trên VPS**.
- Vai `aicloser` trước 25/08 **không có `CREATEDB`** ⇒ `dungSandbox()` chết, mọi cổng và mọi
  bộ ca DB đều 0 pass mà không ai biết. Đã cấp: `ALTER ROLE aicloser CREATEDB`.
- `ops/bin/nghiem-thu/l0-m2.sh` trước 25/08 dựng sandbox bằng `docker exec talpha-pg` —
  container không còn tồn tại ở đâu ⇒ cổng `exit 2` câm. Nay dựng bằng gói `pg` của repo.

---

## Việc làm song song — không chờ code

| Việc | Trạng thái |
|---|---|
| Nộp hồ sơ WhatsApp API trong Pancake, soạn mẫu tin gửi Meta duyệt | **chưa làm — nay là đường găng của L1-M3**, xem điểm kiểm 1 |
| Mở tài khoản và lấy khoá bốn nhà model | chưa làm — lớp model đã sẵn sàng nhận khoá, ba model đang dùng **giá suy ngược** |
| Chạy thử 50 khách Messenger Marketing Message ở UAE | **không làm được** — app Meta bị chặn API, xem điểm kiểm 4 |
| Lấy khoá Botcake của 10 page đang chạy thật | **chưa làm — hiện chỉ có 1 khoá**, của page nháp |
| Gán marketer cho 314 page chưa có người phụ trách | chưa làm |
| Chốt danh sách ba team | chưa làm |
| Lấy mã trạng thái đơn trên POS và tên mục marketer | chưa làm |
| Chọn 3 page thử và 3 page đối chứng | chưa làm |
| Chốt danh sách page trọng điểm | chưa làm |
