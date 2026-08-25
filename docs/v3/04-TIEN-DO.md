# TIẾN ĐỘ

> Cập nhật sau mỗi module xong. Đây là chỗ người khác đọc để biết đang ở đâu mà không phải hỏi.

---

## Trạng thái chung

| | |
|---|---|
| Người A (trục dữ liệu) | **6/6 module + 2 phiếu chen XONG** — cổng: A1 26/27 · A2 58/59 · B-Y3 14/14 · A3 6/6 · B-Y4 6/6 · A4 12/12 · A5+A6 15/15 |
| Giai đoạn | **2 — sóng 0 đang chạy** (giai đoạn 1: A 12/12 module · B phần rìa xong) |
| Luồng đang làm | **SÓNG 0, 1 XONG · SÓNG 2 3/5 · SÓNG 3 2/5 · SÓNG 4 2/10** (14 màn). Ba màn số liệu chờ `so_ai` có dữ liệu |
| Bốn điểm kiểm chặn | **đã đo xong**, kết quả bên dưới |
| Nhánh code v3 | `main` · code nằm ở thư mục `v3/`, **không đụng `src/` đang chạy** |
| Bài test vai B | **543 xanh** (316 trước giai đoạn 2) |

---

## Giai đoạn 2 · sóng 4 — VẬN HÀNH (2/10 màn, 25/08)

| Màn | Đường | Trạng thái |
|---|---|---|
| **AI đề xuất** | `/ai-de-xuat` | xong — cửa DUY NHẤT ghi bản `nguon='ai'`, tách hẳn cửa của người viết |
| **Cửa kiểm sẵn sàng** | `/san-sang` | xong — bảy điều kiện, ô đỏ bấm nhảy tới chỗ sửa |

**«Hai đường khác nhau» đã chạy thật, đủ bốn bước**, đo trên máy chủ xem thử 25/08:
nhận đề xuất → `nguon='ai'`, v3, chưa duyệt · áp ngay → **400 `ai_chua_duyet`** · duyệt →
đóng dấu người + giờ · áp → 200, bản v3 đang áp. Cửa của người viết ghi cứng `'nguoi'`, cửa
AI ghi cứng `'ai'`; **không cửa nào đọc `nguon` từ trình duyệt**.

**Đề xuất mới nhận được ở MỘT trong ba tầng.** `bo_luat_chung` có `nguon` + `duyet_luc`
(migration 009) ⇒ nhận được. `ky_nang` và `kich_ban` **không có cột phân biệt nguồn** ⇒ không
dựng được cửa duyệt. Màn hiện đủ ba dòng và ghi rõ thiếu cột nào — không nhét nguồn vào cột
ghi chú cho đủ ba.

**Cột `page.bot_ai_bat` đã lệch khỏi sự thật — 50 vs 0.** Đo 25/08: CSDL v3 ghi 50 page bật
AI, `ai-enabled.json` là `[]` và RAM tiến trình bot cũng 0/676. Đã loại trừ ba nguyên nhân:
nhật ký v3 chỉ có `doc | 1043` (màn của B chưa gạt công tắc nào) · `READINESS_AUTO_DISABLE=0`
· `NRestarts=0` từ 23/08 (không phải mất RAM do khởi động lại). File đổi lúc **24/08 12:13**
trong lúc bot đang chạy ⇒ 50 page bị tắt qua dashboard v1, CSDL v3 không biết.
**Hệ quả:** màn «Bộ luật chung» đếm *«bao nhiêu page bị ảnh hưởng»* bằng chính cột đó — con
số ② trong ba thứ bắt buộc trước khi cho bấm áp đang lấy từ nguồn sai. → `PHIEU-B-Y7`.

Tám màn còn lại của sóng 4 phần lớn **chặn vì dữ liệu**: `khach` · `don_hang` · `san_pham`
đều 0 dòng.

---

## Giai đoạn 2 · sóng 3 — SỐ LIỆU (2/5 màn, 25/08)

| Màn | Đường | Trạng thái |
|---|---|---|
| **Sức khoẻ hệ thống** | `/suc-khoe` | xong — chín đèn, tự nạp lại mỗi phút |
| **Nhật ký thao tác** | `/nhat-ky` | xong — tách làn người/máy |
| **Báo cáo** | — | ⏸ chờ dữ liệu: `so_ai` **0 dòng**, `don_hang` **0**, `khach` **0** |
| **Chi phí AI** | — | ⏸ như trên — mọi con số tính từ `so_ai` |
| **Hiệu quả kịch bản** | — | ⏸ như trên — A/B không có mẫu nào |

Ba màn cuối **không bị chặn bởi code hay lược đồ** — chúng bị chặn bởi **dữ liệu**. Dựng
chúng bây giờ là dựng ba màn rỗng, và tiêu chí sóng 3 («mọi con số tra ngược được về đúng
những dòng Sổ AI đẻ ra nó») không kiểm được trên số không. Đèn `so_ai` của màn Sức khoẻ nói
thẳng điều đó và chỉ ai phải làm gì.

### Hai luật của màn Sức khoẻ, đáng đọc

**① Đèn KHÔNG ĐO ĐƯỢC phải màu XÁM, không phải xanh.** Tô xanh chỗ mình đang mù là làm người
ta yên tâm về đúng thứ không ai biết. Mức tổng thể cũng vậy: không đèn nào đỏ mà có đèn xám
thì tổng thể là **XÁM**, không phải xanh.

**② Đèn ĐỎ hoặc VÀNG mà không chỉ đường đi tiếp thì `den()` NÉM ngay lúc dựng.** Báo động rồi
bỏ mặc người ta là cách nhanh nhất để họ học cách bỏ qua đèn. Đèn xanh thì không cần — không
có gì để đi sửa, và bắt nó dài dòng chỉ làm bảng ồn.

### Màn Nhật ký làm lộ ra chính vấn đề của `PHIEU-B-Y5`

Đo 25/08: **1.043 dòng `nhat_ky`, và 1.043 dòng trong đó là `doc`** — 100% cuốn sổ là dấu vết
tầng truy vấn ĐỌC dữ liệu qua `ctxHeThong()`, không phải việc ai làm gì. Một lượt chạy hàng
loạt đẻ **1.031 dòng `ky_nang` trong 110 phút** rồi dừng (không phải rò rỉ đang chạy).

Màn tách hai làn và **mặc định mở ở làn NGƯỜI**. Nhưng đó là chữa **triệu chứng**: bảng vẫn
phình, `nhat_ky` cấm xoá ở tầng CSDL, và ai truy vấn thẳng CSDL vẫn gặp đúng đống đó. Thuốc
thật vẫn là `PHIEU-B-Y5`.

## Giai đoạn 2 · sóng 2 — KỊCH BẢN VÀ NỘI DUNG (3/5 màn, 25/08)

| Màn | Đường | Trạng thái |
|---|---|---|
| **Kịch bản** (cây) | `/kich-ban` | xong — dựng bằng HAI tầng có dữ liệu, nói thẳng tầng thứ ba trống |
| **Soạn kịch bản** | `/kich-ban` (cùng màn) | xong — hai bước không đảo, đúng một bản LIVE |
| **Nhập từ Pancake** | `/api/kich-ban/nhap-pancake` | xong — nối vào bộ bóc sẵn có của v1 |
| **Lớp trả lời 0 đồng** | — | 🟥 **chặn — không có bảng** (`PHIEU-B-Y6` ⓑ) |
| **Thư viện ảnh** | — | 🟥 **chặn — không có bảng** (`PHIEU-B-Y6` ⓒ) |

### Tiêu chí nghiệm thu sóng 2 — phần đo được

| Tiêu chí | Kết quả |
|---|---|
| Viết tiếng Việt → một nút ra **bản cho máy**, **cả hai bản đều lưu** | ✅ `noi_dung_nguoi` + `noi_dung_may`, dựng bằng ĐÚNG hàm của bộ di trú |
| Đúng **một** bản LIVE mỗi page — bản thứ hai bật thì bản cũ tự hạ | ✅ v2 lên LIVE → v1 thành `ARCHIVED`, đếm được đúng 1 |
| Page không có kịch bản riêng → cây ghi rõ, không hiện trống | ✅ nhãn «chưa có kịch bản riêng» + cảnh báo 4/5 page |
| Lớp 0 đồng chặn ≥33% lưu lượng | ❌ **không đo được** — không có bảng, và chưa rõ đếm bằng cột nào (`PHIEU-B-Y6` ⑧) |

### Cây «ba tầng» hôm nay chỉ dựng được HAI — và đó là sự thật của dữ liệu

```
tầng SẢN PHẨM · page.nganh_hang khác rỗng = 0/514 · bảng san_pham = 0 dòng
tầng NƯỚC     · page.thi_truong khác rỗng = 140/514 (KSA 34 · UAE 32 · Khác 28 · Kuwait 23…)
tầng PAGE     · 70/514 page có bản LIVE ⇒ 444 page KHÔNG có kịch bản riêng
```

Thêm nữa `kich_ban.page_id` là **NOT NULL**, nên không lưu được bản ở tầng trên — «kế thừa từ
tầng trên» **không có tầng trên nào để kế thừa**. Màn dựng bằng hai tầng có dữ liệu và **nói
thẳng tầng thứ ba đang trống**: dựng đủ ba tầng trên dữ liệu rỗng thì ra một cây có đúng một
nhánh «(chưa phân loại)», trông như màn hình hỏng và che mất sự thật là dữ liệu chưa có.

### Hai chỗ đáng đọc

**① Bản-cho-máy dựng bằng ĐÚNG hàm của bộ di trú** (`db/di-tru/nguon.js#dungBanChoMay`), và
**không cho sửa thẳng bản máy**. Sửa được nó là hai bản rời nhau: bản người nói một đằng, bản
máy chạy một nẻo, và không ai biết bản nào mới là thật.

**② Đưa lên LIVE gọi sang TIẾN TRÌNH BOT trước, rồi mới sửa cột.** Bản LIVE thật nằm ở
`kb-overrides.json` + RAM tiến trình bot; cột là bản sao. Đảo thứ tự thì cột nói «LIVE» trong
khi bot vẫn nói y như cũ — mà màn hình chính là thứ người ta nhìn để tin.

## Giai đoạn 2 · sóng 1 — BỘ NÃO AI 🟥 (xong 25/08)

| Màn | Đường | Trạng thái |
|---|---|---|
| **Bộ luật chung** | `/bo-luat` | xong — có phiên bản, so từng dòng, số page ảnh hưởng, nút lùi |
| **Thư viện kỹ năng** | `/ky-nang` | xong — ba phạm vi, đếm page THẬT SỰ nhận |
| **Prompt của page** | `/prompt-page` | xong — bốn khối, token từng khối, soi mâu thuẫn |

### Tiêu chí nghiệm thu sóng 1 — đo được

| Tiêu chí | Kết quả |
|---|---|
| Sửa bộ luật → **KHÔNG áp ngay**, phải qua duyệt | ✅ `luuBanNhap` tạo bản `dang_dung=false`, áp là thao tác riêng |
| Màn nói rõ **bao nhiêu page bị ảnh hưởng** trước khi bấm | ✅ hai số: tổng page, và số đang BẬT bot |
| **Lùi về bản trước bằng một nút**, có nhật ký ai lùi lúc nào | ✅ cùng hàm với «áp», nhật ký khai `la_lui: true` |
| Bật kỹ năng cho nhóm SP → prompt của **đúng** page đó thêm khối, page khác **không đổi** | ✅ đo trên xem thử: page có size **25 → 74 token**, page không size **25 → 25** |

### Đo sóng 1 trên CSDL thật — 25/08, và một chỗ phép đo TỰ NÓ làm hỏng

```
C1 · 1 bản bộ luật (0 của team, 1 TOÀN HỆ đang áp) · kế thừa: true · 6.734 ký tự ≈ 2.256 token
     ẢNH HƯỞNG nếu áp: 514 page · 50 đang BẬT bot
C2 · 1 kỹ năng (hoi_size), đang TẮT, 0 page nhận · 0 sản phẩm trong CSDL → 2 cảnh báo vàng
C3 · 514 page chọn được. Ba page mẫu: tổng 4.166 / 2.256 / 2.256 token
     Page đầu 2/4 khối THIẾU, hai page sau 3/4 THIẾU (không kịch bản LIVE, không sản phẩm)
```

🚩 **Phép đo tự nó ghi 15 dòng `nhat_ky`.** Bốn bộ đọc khối của người A chạy dưới
`ctxHeThong()`, và `layNhieu` **ghi một dòng cho MỖI lượt gọi** qua cửa đó (cố ý — §9 «ghi cả
việc máy làm»). Nên **mỗi lượt XEM một page đẻ 4 dòng nhật ký `doc`**; lướt 514 page là
~2.000 dòng, và `nhat_ky` cấm xoá ở tầng CSDL.

Đây **không phải lỗi của bên nào**: luật «ghi cả việc máy làm» đúng cho *job nền ghi dữ
liệu*; cái mới là một màn XEM đi qua cùng cửa. Đã sửa phần của B (đọc `san_pham` một lần thay
vì hai → 4 dòng/lượt thay vì 5) và **phát `PHIEU-B-Y5`** xin A một cờ tắt ghi cho đường đọc.
KHÔNG tự viết lại bộ đọc để né: bản khác thì màn hiện một prompt **khác cái bot thật sự gửi**,
hỏng nặng hơn hẳn vấn đề đang xin vá.

### Ba chỗ đáng đọc của sóng 1

**① Một lỗi im lặng nuốt nhật ký của CẢ NĂM màn sóng 0.** Danh mục mã hành động
(`v3/src/audit/hanh-dong.js`) là deny-by-default; `ghiNhatKy` từ chối mã lạ rồi
`console.error` + trả `null`. Năm màn giai đoạn 2 dùng chín mã chưa khai ⇒ **mọi lượt ghi
nhật ký của cả năm màn rơi vào hư không** trong khi màn hình vẫn báo thành công. Đã khai 12
mã, đưa 7 mã vào nhóm BẮT BUỘC, và thêm bài test **quét mã nguồn** đối chiếu — nó bắt tiếp
hai mã của màn kỹ năng ngay sau đó.

**② `bo_luat_chung` không có cột `trang_thai`.** Suy trạng thái bằng số phiên bản thì SAI sau
lượt lùi: bản đã chạy rồi bị gạt lại trông như «chờ duyệt», người sau bấm áp lại tưởng bản
mới. Gánh bằng `nhat_ky` — bảng chỉ-thêm, vốn sinh ra để trả lời «việc này đã từng xảy ra
chưa». **Không xin thêm cột**: câu trả lời chính xác đã có sẵn, chỉ nằm ở bảng khác.

**③ Bốn khối đọc bằng bộ đọc của người A**, không dựng lại. Dựng lại là đẻ bản thứ hai rồi
màn hiện một prompt khác cái bot thật sự gửi — đúng thứ màn này sinh ra để loại trừ.

## Giai đoạn 2 · sóng 0 — GỠ CHẶN

### G2-B1 · Cấu hình team — 3/4 lát xong (25/08/2026)

| Lát | Việc | Trạng thái |
|---|---|---|
| ① Tổng quan team | số đo thật + cảnh báo suy ra | **xong** |
| ② Thành viên và vai | cấp/rút vai, đủ 5 vai | **xong** |
| ③ Kết nối POS | chỉ hiện trạng thái, không bao giờ hiện khoá | **xong** |
| ④ Gán page ↔ team | chuyển page giữa các team | **xong 25/08** — `PHIEU-B-Y3` A đã giao |

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

### G2-B3 · Model AI & khoá — xong (25/08/2026)

Đường `/model-ai` · vào: `quan-tri` + `quan-ly` · sửa: `quan-tri`.

**Phải viết lại lớp cấu hình model**, vì bản cũ viết theo hình **1 dòng/team** trong khi
lược đồ thật là **3 dòng/team** (`UNIQUE (team_id, vai_tro)`, `vai_tro ∈ chinh|du_phong|nen`).
Đây không phải đổi tên cột mà là đổi hình dạng dữ liệu. 13 bài test cũ đang **khoá hình sai**
— đã viết lại chúng.

**Bỏ bộ mã hoá khoá của B, dùng `db/khoa.js` của A** (`khoa_nha`, migration 008). Không phải
vì bản nào đẹp hơn: cột có `CHECK (khoa_api_ma LIKE 'v1.%')` ở tầng CSDL, nên bao thư jsonb
của B ghi xuống là Postgres từ chối ngay. Đã áp 008 trên VPS.

Ba việc màn làm được: chọn model ba ô (chính · dự phòng · nền), dán khoá bốn nhà, và quy giá
ra tiền thật. Bảng giá **đối chiếu thẳng `01-QUYET-DINH.md` §7** trong bài test — bội số khớp
tới từng số: 0,17 · 0,20 · 0,52 · 0,96 · 1,00 · 2,89 · 4,81.

**Khoá VÀO được, KHÔNG RA được.** Không đường nào của module trả khoá ra; tóm tắt chỉ mang
`{daCo, tuEnv}`. Có bài test khoá lại.

⚠️ Một chỗ suýt hỏng im lặng, bắt được khi viết test: `tomTatCauHinh` trả `khoa[nha] =
{daCo,duoi}` cho màn hình. Màn gửi nguyên tóm tắt đó lên là chuyện dễ xảy ra, và
`String({daCo:true})` ra `"[object Object]"` — ghi thẳng vào kho khoá làm khoá API. Bot chết,
màn hình báo «đã lưu khoá». Nay ném to.

⚠️ Chỗ thứ hai: bản cũ coi ô khoá RỖNG là lệnh **xoá khoá**. Nhưng biểu mẫu có bốn ô, ba ô
không đụng tới thì trình duyệt gửi lên chuỗi rỗng — tức mỗi lần đổi khoá một nhà là **ba nhà
kia bị xoá sạch**. Nay rỗng = giữ nguyên, đúng hợp đồng `ghiKhoaNha` của A.

### G2-B2 · Page & Bot — xong (25/08/2026)

Đường `/page-bot` · vào: `quan-tri` + `quan-ly` · sửa: `quan-tri`. Lọc 7 nhóm, tìm, phân trang
50 dòng/trang (514 page của `tieu-alpha` là 11 trang).

**Chỗ chặn tìm được trước khi viết code — BA CỘT, BA CHỦ SỞ HỮU:**

| Cột | Nguồn thật | Màn này làm gì |
|---|---|---|
| `bot_ai_bat` | `ai-enabled.json` + RAM tiến trình bot | **KHÔNG ghi cột.** Gọi sang `/admin/api` của bot, rồi chép kết quả THẬT về cột |
| `marketer` | CSDL v3 — nhưng di trú ghi đè từ `pages.json` (nguồn rỗng ⇒ **xoá trắng**) | ghi được, kèm cảnh báo hiện trên màn → **`PHIEU-B-Y4`** |
| `trong_diem` | CSDL v3 sở hữu trọn | ghi thẳng, an toàn |

Ghi thẳng `bot_ai_bat` xuống cột thì **bot không đổi hành vi** và lượt di trú kế tiếp xoá dấu
vết — nút bấm báo thành công mà không làm gì. Cùng họ lỗi với `suaTheoId` bỏ rơi `team_id`.

### G2-B4 · Kết nối & token — xong (25/08/2026)

Đường `/ket-noi` · **chỉ `quan-tri`** (hẹp hơn hai màn kia). Kho token, thứ tự dự phòng, sức
khoẻ từng token, 5 cảnh báo suy từ cả kho, kết nối POS theo team.

**Màn này MỎNG có chủ ý.** Kho token đã chạy đúng trong tiến trình bot (`src/pancake.js`) —
kể cả phần khó nhất là thêm token **không cần khởi động lại**, đúng tiêu chí nghiệm thu sóng 0.
v3 không viết lại; v3 bọc quanh nó **lớp vai** và **nhật ký** — hai thứ dashboard cũ không có.

⚠️ **Toàn hệ, không theo team.** Kho token dùng chung cho cả ba team. Màn nói thẳng điều đó
bằng chữ, vì mọi màn khác của v3 đều theo team nên người dùng có nếp nghĩ «cái tôi thấy là của
team tôi» — ở đây nếp đó sai.

### Cây cầu sang tiến trình bot — `v3/src/noi-day/cau-bot-v1.js`

Hai màn trên đều phải nói chuyện với **tiến trình bot**, không phải với CSDL, vì công tắc AI
và kho token đều nằm trong RAM của tiến trình đó. v3 chạy ở tiến trình khác (cổng 3102).

**Cửa ghi MẶC ĐỊNH ĐÓNG**, đúng quy ước `V3_PANCAKE_GUI`/`V3_WA_GUI`/`V3_POS_GHI` của người A:

```
V3_BOT_GHI === '1'   VÀ   PANCAKE_READONLY !== '1'   VÀ   có ADMIN_USER/ADMIN_PASS
```

Đọc thì không cần cờ — biết trạng thái mới quyết định được. Cửa đóng thì màn **hiện đủ và nói
rõ thiếu gì**, không hiện màn trống. Phân vai: **v3 giữ quyền + nhật ký, v1 giữ công tắc** —
`/admin/api/pages/:id/ai` của v1 không biết team là gì, nên lớp v3 kiểm team **trước** khi gọi.

### Đo thật hai màn mới — 25/08, và một lỗi CHỈ dữ liệu thật mới lộ

Chạy tầng đọc của G2-B2 và G2-B4 thẳng trên `aicloser_v3` + tiến trình bot thật:

```
G2-B2 · 514 page · 11 trang · bot_bat=50 · thieu_marketer=514 · mat_dau=120
G2-B4 · 6 token · cửa ghi ĐÓNG (V3_BOT_GHI chưa đặt) · không lộ token đầy đủ
        kết nối POS: Bahrain, Kuwait, Oman, Qatar, Saudi, Taiwan, UAE
        nhat_ky sau lượt đo: 0 (phép đo chỉ đọc)
```

🚩 **Số thật lộ ra chỗ 375 bài test không bắt được:** token **CHÍNH** phủ **16** page, trong
khi token **PHỤ** thứ hai phủ **109**. Thứ tự dự phòng đang ngược hẳn — mà cảnh báo im, vì
bản đầu chỉ bắn khi token chính phủ **đúng 0**. Mọi ca tôi tự nghĩ ra đều là 0-hoặc-nhiều;
không ai nghĩ ra ca 16-so-với-109. Đã nới luật (so với token phủ nhiều nhất) và thêm bài test
dùng thẳng sáu con số đo được. **Đây đúng là lý do tiêu chí giai đoạn 2 bắt xem trên dữ liệu thật.**

⚠️ **Việc cho chủ dự án:** đổi thứ tự token trong `.env` để token phủ 109 page lên đầu —
tiết kiệm một vòng gọi hỏng cho 93 page mỗi lượt quét. Màn `/ket-noi` nay hiện cảnh báo này.

### Đo cả BỐN màn trên CSDL thật — 25/08, chỉ đọc

```
G2-B1 lát 4 · team đích: Auus, Pialpha EU · mở được: true · 514 page
             dòng con MỒ CÔI: don_hang 0 · hoi_thoai 0 · kich_ban 0 · san_pham 0 · tin_cho_xu_ly 0
G2-B2 · 514 page · 11 trang · bot_bat 50 · thieu_marketer 514 · mat_dau 120
G2-B3 · chưa cấu hình (0 dòng) · 4/4 nhà CHƯA có khoá · 3 cảnh báo ĐỎ · không lộ khoá
G2-B4 · 6 token · cửa ghi ĐÓNG · 1 cảnh báo (thứ tự dự phòng đặt sai)
nhat_ky sau lượt đo: 0  (phép đo chỉ đọc, không ghi một dòng)
```

⚠️ **Hai việc cho chủ dự án, màn hình nay chỉ thẳng ra:**

1. **Chưa team nào có khoá model.** `khoa_nha` rỗng, `cau_hinh_model` rỗng — cả ba team đang
   chạy bằng bộ mặc định và khoá từ `.env`. Mở `/model-ai`, dán khoá bốn nhà rồi chọn model.
2. **Thứ tự token đặt ngược:** token chính phủ 16 page, token phụ phủ 109. Đổi thứ tự trong
   `.env` là đỡ một vòng gọi hỏng cho 93 page mỗi lượt quét.

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
| **B-Y3** | Chuyển page ↔ team (chen trước G2-A3 theo lệnh) — gỡ chặn **H7** + lát ④ màn Cấu hình team | ✅ **25/08** | cổng B-Y3 **14/14** · bộ ca **14 pass / 0 fail** · **5** bảng con đi theo page (phiếu kê 3, lược đồ thật có 5) · mồ côi trên CSDL THẬT = **0** |
| **G2-A3** | Gộp BA cửa ghi hẹp về MỘT bộ dựng SQL | ✅ **25/08** | cổng G2-A3 **6/6** · ba cửa còn **0** câu UPDATE tay · bộ ca khoá bẫy **7 pass / 0 fail** · 7 bộ ca của ba cửa xanh trọn · còn **4 câu gộp được** ở `lich-nhac`/`hang-cho`/`ti-le-hoan` — ngoài phạm vi, đã ghi §9 |
| **B-Y4** | Di trú thôi ghi đè cột NGƯỜI đặt (chen theo lệnh) — cứu chức năng gán marketer của `G2-B2` | ✅ **25/08** | cổng B-Y4 **6/6** · marketer gán tay SỐNG SÓT qua `npm run di-tru` đầu-cuối · cột máy vẫn đồng bộ · **0** cột người đặt còn trong câu ghi đè |
| **G2-A4** | Bảng + API bộ luật chung và kỹ năng (phiên bản · duyệt · xem trước ảnh hưởng) | ✅ **25/08** 🟥 | cổng G2-A4 **12/12** · bộ ca **17 pass / 0 fail** · migration 009 đóng **RF-17** (hai bản cùng đang áp KHÔNG tồn tại được) · áp là MỘT giao dịch · phép đếm ảnh hưởng lệch bộ đọc prompt **0/514 page thật** |
| **G2-A5** | Bảng + API kịch bản ba tầng có KẾ THỪA, đúng MỘT bản LIVE mỗi page | ✅ **25/08** | migration 010 · bộ ca **16 pass / 0 fail** · bộ giải LUÔN khai nguồn (kể cả «không có gì, thiếu khoá nào») · bộ ráp prompt ĐI QUA bộ giải · 3 chỉ mục chặn hai bản LIVE cùng phạm vi |
| **B-Y7** | 🟥 `page.bot_ai_bat` lệch nguồn thật — sửa con số cho-bấm-áp của màn Bộ luật | ✅ **25/08** | cổng G2-A4 **16/16** · bộ ca **20 pass / 0 fail** · con số nay lấy từ `ai-enabled.json`, cột chỉ để đối chiếu · trên CSDL thật: **thật 0 · cột 50 · lệch 50**, và nó BÁO ra |
| **G2-A6** | API số liệu: báo cáo hai luồng · chi phí AI · A/B · sức khỏe 9 chỉ số | ✅ **25/08** | migration 011 · bộ ca **14 pass / 0 fail** · mọi số 0 kèm `viSaoRong` · A/B chưa đủ mẫu thì `tiLeChot=null` · đèn XÁM tách khỏi đèn ĐỎ |

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
