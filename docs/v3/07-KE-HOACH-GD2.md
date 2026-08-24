# KẾ HOẠCH GIAI ĐOẠN 2

> Soạn 24/08/2026, sau khi giai đoạn 1 **code xong** (A 12/12 module · B 5 module + nối dây).
> Giai đoạn 2 theo `02-KE-HOACH-CODE.md`: *"Bộ não AI có giao diện, kịch bản 3 tầng, báo cáo
> đủ, phân quyền 5 vai"* — **4 tuần**, khoảng **25 trong 37 màn hình**.

---

## 0 · Đọc trước, đừng bỏ qua ba dòng này

**① Giai đoạn 1 CHƯA nghiệm thu.** Code xong ≠ luồng xong. Tiêu chí giai đoạn 1 đo bằng khách
thật (trả lời <10 giây trên 50 lượt · lớp 0 đồng chặn ≥33% · chạy 7 ngày đơn không giảm ·
sale ba ca không mở dashboard cũ) và **chưa đo được lần nào** vì hệ thống chưa phục vụ page
thật nào. Luật dự án: *luồng trước chưa nghiệm thu thì không mở luồng sau*.

**② Nhưng có ngoại lệ, và nó là lý do giai đoạn 2 bắt đầu ngay được.** Ba màn quản trị của
giai đoạn 2 chính là thứ **đang chặn giai đoạn 1**:

| Việc người đang kẹt | Màn giai đoạn 2 gỡ nó |
|---|---|
| **H7** — 514/514 page còn ở team kỹ thuật, team nghiệp vụ 0 page ⇒ mọi màn v3 rỗng | **Cấu hình team** + **Page & Bot** |
| **H6** — chưa có khoá 4 nhà model, chưa nạp tiền | **Model AI & khoá** |
| **H8** — chưa chọn 3 page thử / 3 page đối chứng | **Page & Bot** |

Nên **luồng G1 làm trước tiên, và nó phục vụ giai đoạn 1 chứ không phải giai đoạn 2.**
Xong G1 thì giai đoạn 1 mới chạy thật được để mà nghiệm thu.

**③ Ba bài học giai đoạn 1, trả giá rồi, đừng trả lại.**

- **Bản cài giả dễ tính hơn bản thật.** 313 bài test xanh trên bản giả **không chứng minh gì**
  về cơ sở dữ liệu thật — nối vào thật thì vấp bốn chỗ liên tiếp (thiếu `IN`, thiếu `LIMIT`,
  thiếu toán tử so sánh, Postgres trả `Date` mà code tính bằng ms). ⇒ **Giai đoạn 2 chạy trên
  Postgres thật ngay từ module đầu.** Hạ tầng đã dựng sẵn trên VPS.
- **Chuỗi gõ tay hai chỗ = bẫy im lặng.** `vai.ma` thật là `quan-tri` gạch ngang, code so
  `quan_tri` gạch dưới, ở **hai** file. Hậu quả: mọi người dùng thành không có vai, cửa chặn
  sạch, mà màn hình trông y hệt chạy đúng. ⇒ **Nhập hằng, cấm gõ lại; test đọc thẳng lược đồ
  rồi so.**
- **Màn hình rỗng phải nói ĐÚNG NGHĨA.** "Không có việc nào đang chờ" đọc như tin mừng, trong
  khi sự thật là chưa cài đặt xong. ⇒ Mọi màn giai đoạn 2 phải phân biệt **"chưa có dữ liệu"**
  với **"đã xong hết"**.

---

## 1 · Năm luồng, 25 màn

Đặt tên **G1–G5** để không lẫn với L0–L4 của giai đoạn 1.

| Luồng | Màn | Ai | Ngày công | Vì sao xếp thứ tự này |
|---|---:|---|---:|---|
| **G1 · Quản trị & cấu hình** | 5 | **B** | 6 | **Gỡ kẹt giai đoạn 1.** Không có nó thì không gán được page, không nhập được khoá model |
| **G2 · Bộ não AI ba tầng** | 3 | **A** | 5 | Bộ luật chung đang nằm trong `src/prompts.js`, chỉ lập trình viên sửa được — đây là khối quyết định bot giỏi hay dở |
| **G3 · Kịch bản & nội dung** | 5 | **A** | 6 | Marketer làm việc hằng ngày ở đây. Dùng lại `import-script.js`, `rule-store.js` |
| **G4 · Sản phẩm & cửa kiểm** | 3 | **A** | 4 | Phụ thuộc cửa POS của L1-M1 đã xong. Dùng lại `readiness.js` |
| **G5 · Số liệu & báo cáo** | 8 | **B** | 7 | Nhiều màn nhưng nhẹ nhất — đắp lên `economics.js`, `health.js`, `report.js` đã có |
| **Xuyên suốt · phân quyền 5 vai** | — | **B** | 2 | Nới hai vai của L0-M3 lên năm vai. Chạm mọi màn nên làm trong G1 |

**Tổng: 30 ngày công** (A 15 · B 15) — cân hơn giai đoạn 1 (A 24 · B 10) vì giai đoạn 2 phần
lớn là màn hình.

---

## 2 · Từng luồng — làm gì, nghiệm thu bằng số

### G1 · Quản trị & cấu hình — 5 màn · người B · 6 ngày

| Màn | Việc của nó |
|---|---|
| **Cấu hình team** | Kết nối POS · Pancake · WhatsApp · Botcake · Telegram · thành viên và vai |
| **Page & Bot** | **Nút bật/tắt BOT AI** từng page · gán page cho team · cờ `trong_diem` · `botcake_tat` |
| **Model AI & khoá** | Bốn nhà · khoá riêng từng team · quy giá công bố ra tiền thật |
| **Kết nối & token** | Kho token Pancake theo thứ tự dự phòng · khoá Botcake · mẫu tin WhatsApp |
| **Nhật ký thao tác** | Ghi cả việc máy làm · **không sửa không xoá** |

**Bảng:** `page` `ket_noi_pos` `cau_hinh_model` `nguoi_dung` `vai` `thanh_vien_team` `nhat_ky`
— **tất cả đã có trong lược đồ**, không cần di trú mới.

**Dùng lại:** `v3/src/auth/*` (vé, vai, cổng danh tính) · `v3/src/audit/*` (nhật ký) ·
`v3/src/model/*` (`tomTatCauHinh` trả khoá dạng `{daCo, duoi}`) — của chính B, đã xong.

**Nghiệm thu:**
1. Gán **514 page** cho ba team bằng màn hình, không bằng SQL → bảng điều phối hết rỗng
2. Nhập khoá một nhà model → **lượt chat kế tiếp đi đúng khoá mới, không khởi động lại**
3. Khoá lưu trong cơ sở dữ liệu là **bản mã hoá**, `SELECT` ra không đọc được
4. Bật/tắt bot một page → `page.bot_ai_bat` đổi, và **có dòng nhật ký ghi ai bấm lúc nào**
5. Vai `sale` mở màn Cấu hình team → **403**, có ghi nhật ký
6. Năm vai (`quan-tri` `marketer` `sale` `quan-ly` `duyet-kich-ban`) đều đăng nhập được và
   thấy đúng phần của mình — **test đọc thẳng `db/migrate/001_nen.up.sql` rồi so**, cấm gõ tay

### G2 · Bộ não AI ba tầng — 3 màn · người A · 5 ngày

| Màn | Việc của nó |
|---|---|
| **Bộ luật chung** | 10 mục quy tắc cứng · 2.256 token · dùng chung mọi page · **có phiên bản, có duyệt** |
| **Thư viện kỹ năng** | Tầng còn thiếu giữa bộ luật và kịch bản · bật theo nhóm sản phẩm |
| **Prompt của page** | Xem prompt **THẬT** gửi cho model: bốn khối, số token từng khối, soi mâu thuẫn |

**Chỗ khó nhất:** bộ luật chung hiện nằm trong `src/prompts.js`, **chỉ lập trình viên sửa
được** — muốn đổi phải sửa mã nguồn rồi deploy. Marketer không nhìn thấy. Đưa nó ra màn hình
là mục tiêu chính của cả luồng này.

**Số đã đo, dùng làm mục tiêu:** hai sản phẩm có size đang hoàn **26,8%** và **19,2%**, sản
phẩm không size hoàn **9,3%** — và cả hai **chưa bật kỹ năng hỏi size**. Thư viện kỹ năng
sinh ra để bịt đúng lỗ đó.

**Nghiệm thu:**
1. Sửa bộ luật chung trên màn hình → **lượt chat kế tiếp dùng bản mới, không deploy**
2. Màn "Prompt của page" hiện **đúng bốn khối** với số token từng khối, tổng khớp `so_ai`
3. Bật kỹ năng "hỏi size" cho nhóm sản phẩm → prompt của page thuộc nhóm đó **dài thêm đúng
   khối đó**, page khác không đổi
4. Đổi bộ luật → **chạy ba lượt chat thật và đánh giá cả ba** (model không tất định, một lần
   đúng không chứng minh gì). Chạy trên máy chủ, dùng psid giả `TEST_*`
5. Bản cũ vẫn xem lại được, và biết **ai duyệt lúc nào**

### G3 · Kịch bản & nội dung — 5 màn · người A · 6 ngày

| Màn | Việc của nó |
|---|---|
| **Kịch bản** | Cây ba tầng: sản phẩm → nước → page · tầng dưới ghi rõ "Kế thừa" |
| **Soạn kịch bản** | **Hai bước không được đảo**: bản tiếng Việt cho team đọc → máy dịch thành lời bot nói |
| **Nhập kịch bản từ Pancake** | Thả file `quick_replies`, bóc bảng giá và gắn nhãn ảnh |
| **Lớp trả lời 0 đồng** | Mẫu miễn phí + đối chiếu bộ từ khoá Botcake |
| **Thư viện ảnh** | Ảnh gắn nhãn theo chủ đề để bot chọn đúng lúc |

**Dùng lại — kế hoạch ghi rõ "dùng nguyên":** `src/import-script.js` (150 dòng, bóc file
Pancake) · `src/rule-store.js` (531 dòng) · `src/kb.js` (549 dòng). **Kiểm `src/` trước khi
viết mới bất cứ hàm nào.**

**Nghiệm thu:**
1. Soạn một kịch bản mới trên màn hình → page đó dùng bản mới **ở lượt chat kế tiếp**
2. Kịch bản giữ **cả hai bản**: bản cho người (6 trường) và bản cho máy — lược đồ đã có
   `noi_dung_nguoi` + `noi_dung_may`
3. Tầng dưới không có bản riêng → hiện **"Kế thừa"** và dùng đúng bản tầng trên
4. Thả file `quick_replies` thật của một page → bóc đúng bảng giá, số dòng khớp file
5. Nhiều nhất **một bản LIVE mỗi page** — lược đồ đã ràng, màn hình phải nói rõ khi đổi

### G4 · Sản phẩm & cửa kiểm — 3 màn · người A · 4 ngày

| Màn | Việc của nó |
|---|---|
| **Sản phẩm & kho** | Đồng bộ từ POS · **hết hàng thì tự tắt bot cho sản phẩm đó** |
| **Cửa kiểm sẵn sàng** | Sáu điều kiện · bấm ô đỏ nhảy thẳng tới chỗ sửa |
| **Đưa sản phẩm mới lên chạy** | Sáu chặng, mỗi chặng một cửa kiểm · **chặng 2 bắt buộc có động cơ** |

**Dùng lại:** `src/readiness.js` (273 dòng, cửa kiểm sẵn sàng đã có) · cửa POS của L1-M1 đã
xong (`docDanhMuc`, tồn kho).

**Lỗ phải bịt, đã ghi ở `01-QUYET-DINH.md` mục 12:** *"Tên sản phẩm trống trong dữ liệu — chỉ
có bảng giá và ảnh. Phải lấy tên và mã từ POS."* Và `san_pham`/`goi_gia` hiện **vẫn rỗng**
(0 dòng) — L1-M1 đọc được từ POS nhưng chưa ai chạy nạp.

**Nghiệm thu:**
1. Đồng bộ từ POS → `san_pham` có **tên và mã thật**, không còn suy ngược từ 25 đơn cũ
2. Đánh dấu một sản phẩm hết hàng → bot **không chào bán sản phẩm đó** ở lượt kế tiếp
3. Cửa kiểm sẵn sàng: page thiếu kịch bản → **ô đỏ**, bấm vào nhảy đúng màn sửa
4. Sản phẩm mới chưa có đơn nào → **vẫn tạo được đơn** (lỗ cũ: hàm lấy thông tin sản phẩm
   suy ngược từ 25 đơn gần nhất)

### G5 · Số liệu & báo cáo — 8 màn · người B · 7 ngày

| Màn | Việc của nó |
|---|---|
| **Trang chủ** | Marketer vào thấy đúng việc của mình: đề xuất chờ duyệt, sản phẩm hết hàng, page kịch bản mỏng |
| **Báo cáo** | **Tách hai luồng đơn** — đo bằng hai thước khác nhau |
| **Chi phí AI** | 127 đ/tin · 6.696 đ/đơn · bảng theo page tìm chỗ đốt tiền mà không ra đơn |
| **Hiệu quả kịch bản** | A/B hai bản cạnh nhau theo phễu · **chưa đủ mẫu thì nói rõ chưa kết luận** |
| **Sức khỏe hệ thống** | Đèn 9 chỉ số · page bị chặn thì đếm số khách đang chờ |
| **Nguồn khách vào** | Sơ đồ hai luồng đơn · **chỗ rơi 37,4%** |
| **Hồ sơ khách hàng** | Gộp ba kênh theo số điện thoại |
| **Rủi ro hoàn hàng** | **Bốn tầng** chính sách thay vì một ngưỡng cứng |

**Dùng lại — đây là luồng dùng lại nhiều nhất:** `src/economics.js` (413 dòng, đã cắt được
theo page × kịch bản × lane) · `src/health.js` (408 dòng, 9 chỉ số) · `src/report.js` ·
`src/experiment.js` (459 dòng, A/B). **Phần lớn việc là đắp màn hình lên số đã có.**

**Nghiệm thu:**
1. Số trên màn **khớp** với `so_ai` — có nút "tra ngược" ra đúng những dòng sổ đẻ ra con số đó
2. Báo cáo **tách hai luồng**; gộp chung là sai vì hai thước khác nhau
3. A/B chưa đủ mẫu → hiện **"chưa kết luận"**, không hiện tỉ lệ (lỗi cũ: hiện tỉ lệ chốt khi
   mẫu số chưa cùng khung thời gian với tử số)
4. Rủi ro hoàn: **144 khách hoàn 30–65%** hiện đang bị gộp nhầm vào nhóm bình thường → sau khi
   chia bốn tầng phải tách ra đúng 144 khách đó
5. Đèn sức khỏe đỏ khi tầng LLM hỏng — **ca thật đang xảy ra hôm nay**, dùng làm ca kiểm

---

## 3 · Ranh giới file — giữ đúng nếp giai đoạn 1

| Người A | Người B |
|---|---|
| `v3/src/ui/brain/*` (G2) | `v3/src/ui/admin/*` (G1) |
| `v3/src/ui/script/*` (G3) | `v3/src/ui/report/*` (G5) |
| `v3/src/ui/product/*` (G4) | `v3/src/auth/*` (nới 5 vai) |
| `src/chat/*` `src/pos/*` (nếu cần nới) | `v3/src/audit/*` · `v3/src/model/*` |
| — | `v3/src/noi-day/*` (mảnh nối, B giữ) |

**Cả hai đều CẤM:** `src/prompts.js` `src/closer.js` `src/tools.js` `src/fast-lane.js`
`src/outbound-guard.js` · 62 file phẳng dưới `src/` của bản đang chạy · `.env`.

**Dùng chung, sửa phải báo:** `db/migrate/*` (chỉ A) · `v3/src/vai-b.js` (chỉ B) ·
`package.json`.

---

## 4 · Điểm bàn giao giữa hai người

| # | Cái gì | Ai làm | Ai dùng | Chốt khi nào |
|---|---|---|---|---|
| 1 | **Năm vai + màn phân quyền** | B · G1 | A (mọi màn của A phải chặn theo vai) | **cuối ngày 2** — A chờ cái này |
| 2 | **Gán page cho team** | B · G1 | cả hai (không có nó thì mọi màn đều rỗng) | **cuối ngày 3** |
| 3 | **Khung màn hình dùng chung** (sidebar, thanh trên, bảng, phân trang) | B · G1 | A | cuối ngày 2 — dựng một lần, cả hai dùng |
| 4 | **`san_pham`/`goi_gia` có dữ liệu thật từ POS** | A · G4 | B (màn Chi phí AI, Báo cáo cắt theo sản phẩm) | cuối tuần 2 |
| 5 | **Bộ luật chung có phiên bản** | A · G2 | B (màn Hiệu quả kịch bản so theo phiên bản) | cuối tuần 2 |

---

## 5 · Lịch bốn tuần

| Tuần | Người A | Người B |
|---|---|---|
| 1 | *(chờ điểm bàn giao 1 và 3)* → G2 Bộ luật chung | **G1 — làm trước tiên, gỡ kẹt giai đoạn 1** |
| 2 | G2 Kỹ năng + Prompt của page | G1 nốt → G5 Trang chủ, Sức khỏe |
| 3 | G3 Kịch bản (5 màn) | G5 Báo cáo, Chi phí AI, Hiệu quả kịch bản |
| 4 | G4 Sản phẩm & cửa kiểm | G5 Nguồn khách, Hồ sơ khách, Rủi ro hoàn |

**Đường găng là B ở tuần 1** — A gần như không làm được gì trước khi có năm vai và khung màn
hình. Nếu muốn A không ngồi chờ: cho A bắt đầu bằng **phần không có giao diện** của G2 (tách
bộ luật chung ra khỏi `src/prompts.js` vào bảng `bo_luat_chung`, đã có bản v1 do di trú nạp).

---

## 6 · Việc người — phải xong trước hoặc song song

| Mã | Việc | Chặn gì |
|---|---|---|
| **H6** | **Nạp tiền tài khoản AI** | 🔴 bot đang chết. Chặn mọi nghiệm thu có chữ "lượt chat kế tiếp" |
| **H7** | Chốt page nào thuộc team nào | 🔴 B làm màn Cấu hình team được, nhưng **ai bấm cũng cần biết chia thế nào** |
| H8 | Chọn 3 page thử + 3 page đối chứng | nghiệm thu giai đoạn 1 |
| — | Mở khoá 4 nhà model, nạp ít tiền mỗi cái | G1 nghiệm thu "đổi khoá → lượt sau đi khoá mới" |
| — | **Duyệt danh sách kết quả/lý do đóng việc** (sổ tay vai B mục 18) | L4-M2 đã code xong, chờ duyệt |
| — | Chốt **năm vai ai được làm gì** — bảng quyền chi tiết | G1 không đoán hộ được |

---

## 7 · Nếu phải cắt cho gọn trong hai tuần

Cắt được, không hỏng luồng:

- **G5 rút còn 3 màn**: Trang chủ · Chi phí AI · Sức khỏe hệ thống. Bốn màn còn lại lùi.
- **G3 rút còn 2 màn**: Kịch bản · Soạn kịch bản. Nhập từ Pancake và Thư viện ảnh lùi.
- **G4 lùi cả luồng** — cửa POS đã đọc được danh mục, chưa có màn hình thì chạy lệnh tay được.

**Không cắt được:** G1 (không có nó thì giai đoạn 1 không chạy) và **G2 Bộ luật chung** (khối
quyết định bot giỏi hay dở, và hiện chỉ lập trình viên sửa được).
