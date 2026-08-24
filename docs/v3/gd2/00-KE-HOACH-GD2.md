# KẾ HOẠCH GIAI ĐOẠN 2

> Soạn 24/08/2026, sau khi giai đoạn 1 **code xong** (A 12/12 module · B 5 module + nối dây).
> Nguồn: `docs/v3/02-KE-HOACH-CODE.md` (bốn giai đoạn) · `01-QUYET-DINH.md` §6·§7·§9 ·
> `03-MAN-HINH.md` (37 màn) · và **bài học thật** rút từ giai đoạn 1, mục cuối file này.

---

## Giai đoạn 2 là gì

Kế hoạch gốc: *"Bộ não AI có giao diện · kịch bản 3 tầng · báo cáo đủ · phân quyền 5 vai"* —
**4 tuần**, khoảng **25 màn hình**.

Nói bằng câu nghiệp vụ: **giai đoạn 1 làm cho bot chạy được, giai đoạn 2 làm cho người vận
hành nó mà không cần lập trình viên.**

Hôm nay muốn đổi một dòng trong bộ luật chung (2.256 token, dùng chung 51 page) phải sửa
`src/prompts.js` rồi deploy. Muốn gán page cho team phải chạy SQL. Muốn xem page nào đốt tiền
mà không ra đơn phải mở dashboard cũ. Giai đoạn 2 xoá hết những chỗ đó.

---

## Đổi thứ tự so với kế hoạch gốc — đọc kỹ mục này

Kế hoạch gốc xếp giai đoạn 2 sau khi giai đoạn 1 nghiệm thu xong. **Nhưng giai đoạn 1 đang bị
chặn bởi những việc mà chính giai đoạn 2 sinh ra màn hình để làm.**

| Việc đang chặn giai đoạn 1 | Hôm nay làm bằng gì | Màn hình gỡ nó |
|---|---|---|
| **H7** gán 514 page ↔ 3 team | SQL tay | **Cấu hình team** |
| **H8** chọn 3 page thử + 3 page đối chứng | SQL tay | **Page & Bot** |
| **H6** nhập khoá 4 nhà model | sửa `.env` rồi restart | **Model AI & khoá** |
| 314/315 page chưa gán marketer | chưa có cách nào | **Page & Bot** |

⇒ **Sóng 0 của giai đoạn 2 làm trước, song song với việc chạy thử giai đoạn 1.** Bốn màn đó
không đụng đường tiền, không đụng bot đang chạy — làm sớm chỉ có lợi.

---

## Năm sóng · 25 màn

### Sóng 0 · GỠ CHẶN — 4 màn · tuần 1 🟨

Mục tiêu đo được: **một người không biết SQL gán được page cho team và bật được bot thử.**

| Màn | Việc của nó | Chặn gì hôm nay |
|---|---|---|
| **Cấu hình team** | Gán page ↔ team · kết nối POS/Pancake/WhatsApp/Botcake · thành viên và vai | H7 — chặn TOÀN BỘ màn hình v3 |
| **Page & Bot** | Bật/tắt **BOT AI** từng page · gán marketer · cờ page trọng điểm · chọn page thử/đối chứng | H8 · 314 page chưa gán marketer |
| **Model AI & khoá** | Bốn nhà · khoá riêng từng team · chọn model chính/dự phòng/nền · độ ngẫu nhiên · quy giá ra tiền thật | H6 |
| **Kết nối & token** | Kho token Pancake theo thứ tự dự phòng · khoá Botcake · mẫu tin WhatsApp | Token chết phải sửa `.env` rồi restart |

**Nghiệm thu sóng 0:**
- Gán một page sang team khác **trên màn hình** → bảng điều phối của team đó thấy việc của page đó, team kia **không thấy**
- Đổi model của một team trên màn hình → lượt chat kế tiếp đi đúng model mới, **không khởi động lại** (lớp model đã sẵn, chỉ thiếu màn)
- Rút khoá nhà chính → tự chuyển dự phòng **dưới 30 giây**, màn hình hiện cảnh báo
- Thêm một token Pancake mới → page mới nhận được token trong vòng một lượt quét, **không restart**

### Sóng 1 · BỘ NÃO AI — 3 màn · tuần 1–2 🟥

Đây là sóng **rủi ro cao nhất** của giai đoạn 2: sửa sai một dòng bộ luật chung là **51 page
đổi cách nói với khách cùng lúc**.

| Màn | Việc của nó |
|---|---|
| **Bộ luật chung** | 10 mục quy tắc cứng · 2.256 token · **có phiên bản, có duyệt, có xem trước ảnh hưởng** |
| **Thư viện kỹ năng** | Tầng còn thiếu giữa bộ luật và kịch bản · bật theo **nhóm sản phẩm** |
| **Prompt của page** | Xem prompt **THẬT** gửi cho model: bốn khối, số token từng khối, soi mâu thuẫn giữa các khối |

**Nghiệm thu sóng 1:**
- Sửa bộ luật chung → **KHÔNG áp ngay**. Phải qua duyệt, và màn hình nói rõ **bao nhiêu page bị ảnh hưởng** trước khi bấm
- Lùi về phiên bản trước bằng một nút, có ghi nhật ký ai lùi lúc nào
- Bật kỹ năng "hỏi size" cho nhóm sản phẩm có size → `Prompt của page` của đúng những page đó có thêm khối đó, page khác **không đổi**
- Với mọi thay đổi chạm cách bot nói: **chạy ít nhất BA lượt** và đánh giá cả ba (model không tất định), **chạy trên máy chủ**, dùng psid giả `TEST_*`

### Sóng 2 · KỊCH BẢN VÀ NỘI DUNG — 5 màn · tuần 2–3 🟨

| Màn | Việc của nó |
|---|---|
| **Kịch bản** | Cây ba tầng: sản phẩm → nước → page. Tầng dưới ghi rõ **"Kế thừa"** khi không có bản riêng |
| **Soạn kịch bản** | **Hai bước KHÔNG ĐƯỢC ĐẢO**: bản tiếng Việt cho team đọc → máy dịch thành lời bot nói |
| **Nhập kịch bản từ Pancake** | Thả file `quick_replies`, bóc bảng giá và gắn nhãn ảnh |
| **Lớp trả lời 0 đồng** | Các mẫu miễn phí + đối chiếu bộ từ khoá Botcake |
| **Thư viện ảnh** | Ảnh gắn nhãn theo chủ đề để bot chọn đúng lúc |

**Nghiệm thu sóng 2:**
- Marketer viết kịch bản bằng tiếng Việt, bấm một nút ra **bản cho máy**, và **cả hai bản đều lưu** (`kich_ban.noi_dung_nguoi` + `noi_dung_may`)
- Đúng **một** bản LIVE mỗi page — bản thứ hai bật lên thì bản cũ tự hạ
- Page không có kịch bản riêng → cây hiện **"Kế thừa từ <tầng trên>"**, không hiện trống
- Lớp 0 đồng chặn **≥33% lưu lượng** (tiêu chí L2 của giai đoạn 1, nay đo được trên màn hình)

### Sóng 3 · SỐ LIỆU — 5 màn · tuần 3 🟩

| Màn | Việc của nó |
|---|---|
| **Báo cáo** | **Tách hai luồng đơn** — trang bán hàng và Messenger đo bằng hai thước khác nhau |
| **Chi phí AI** | 127 đ/tin · 6.696 đ/đơn · bảng theo page **tìm chỗ đốt tiền mà không ra đơn** |
| **Hiệu quả kịch bản** | A/B hai bản cạnh nhau theo phễu · **chưa đủ mẫu thì nói rõ chưa kết luận** |
| **Sức khỏe hệ thống** | Đèn 9 chỉ số · page bị chặn thì đếm số khách đang chờ |
| **Nhật ký thao tác** | Ghi cả việc máy làm · **không sửa không xoá** (bảng đã có từ L0-M4) |

**Nghiệm thu sóng 3:**
- Mọi con số **tra ngược được** về đúng những dòng Sổ AI đẻ ra nó (bản đang chạy đã có `trace()`, giữ nếp đó)
- Báo cáo cắt theo marketer **không trống** — sau khi sóng 0 gán marketer xong
- Sức khỏe hệ thống phải bắt được **đúng sự cố 23/08**: tài khoản AI hết tiền → đèn đỏ `llm_account` + số phút đang dừng
- A/B chưa đủ mẫu → hiện **"chưa kết luận"**, cấm hiện tỉ lệ trông như đã kết luận

### Sóng 4 · KHÁCH VÀ PHÂN QUYỀN — 8 màn · tuần 4 🟥

| Màn | Việc của nó |
|---|---|
| **Hồ sơ khách hàng** | Gộp ba kênh theo **số điện thoại**. Không gộp thì đếm nhầm đơn trùng |
| **Rủi ro hoàn hàng** | **Bốn tầng chính sách** thay vì một ngưỡng cứng — 144 khách hoàn 30–65% đang bị gộp nhầm vào nhóm bình thường |
| **Nguồn khách vào** | Sơ đồ hai luồng đơn · chỗ rơi **37,4%** |
| **Trang chủ** | Marketer vào thấy đúng việc của mình: đề xuất chờ duyệt, sản phẩm hết hàng, page kịch bản mỏng |
| **Cửa kiểm sẵn sàng** | Sáu điều kiện, bấm ô đỏ nhảy thẳng tới chỗ sửa |
| **Sản phẩm & kho** | Đồng bộ từ POS · hết hàng thì **tự tắt bot** cho sản phẩm đó |
| **Đưa sản phẩm mới lên chạy** | Sáu chặng, mỗi chặng một cửa kiểm |
| **AI đề xuất** | Đề xuất sửa ở **cả ba tầng** · **phải có người duyệt mới áp** |

**Nghiệm thu sóng 4 — đây là nghiệm thu của cả giai đoạn 2:**
- **Năm vai chạy đủ**: Marketer **chỉ thấy sản phẩm mình phụ trách** · Sale chỉ thấy bảng điều phối · Người duyệt kịch bản duyệt được nhưng không sửa được bộ luật chung
- Kịch bản **người viết** → áp thẳng. Đề xuất **của AI** → **phải duyệt mới áp**. Hai đường khác nhau, có test
- Một khách nhắn cả Messenger lẫn WhatsApp cùng số điện thoại → **một hồ sơ**, không phải hai
- Sản phẩm hết hàng trên POS → bot **ngừng chào** sản phẩm đó trong vòng một lượt đồng bộ

---

## Chia việc — hai người, cùng ranh giới file như giai đoạn 1

| | Người A — trục dữ liệu | Người B — màn hình |
|---|---|---|
| Giữ gì | Bảng mới, API cho màn, đóng nợ kỹ thuật | 25 màn hình + phân quyền |
| Đất | `db/migrate/*` · `src/db/*` · `src/pos/*` · `src/chat/*` · `src/orders/*` | `v3/src/ui/*` · `v3/src/auth/*` · `v3/src/model/*` · `v3/src/audit/*` |
| Ngày công | ~8 ngày | ~16 ngày |

**Việc đầu tiên của A, trước mọi thứ khác:** `PHIEU-B-Y1` (nới `suaTheoId` + cho `layNhieu` nhận
`IN`) và `PHIEU-B-Y2` (khoá API một bản mỗi nhà). Không có hai cái đó thì sale không bấm được
nút nhận/đóng việc, và mọi màn hình mới đều phải đi đường vòng đọc trọn bảng.

**Việc đầu tiên của B:** Sóng 0, bắt đầu bằng **Cấu hình team** — nó gỡ chặn cho cả giai đoạn 1.

---

## SÁU BÀI HỌC TỪ GIAI ĐOẠN 1 — bắt buộc mang sang

Đây là phần đắt nhất của tài liệu này. Mỗi bài đều đã trả giá bằng lỗi thật.

**1. Bản cài giả dễ tính hơn bản thật thì test xanh chẳng chứng minh gì.**
316 bài xanh trên `v3/testkit/db-gia.js`, nối vào Postgres thật thì vấp **bốn** chỗ liên tiếp:
thiếu `IN`, thiếu `LIMIT`, thiếu toán tử so sánh, và Postgres trả `Date` trong khi code tính
bằng mốc ms. **Luật:** mỗi module đụng dữ liệu phải có **ít nhất một phép chạy trên CSDL thật**
trước khi báo xong. Bản giả để chạy nhanh, không phải để chứng minh.

**2. Chuỗi hằng gõ tay hai lần là bom hẹn giờ.**
`vai.ma` thật là `quan-tri` gạch **ngang**, code so `quan_tri` gạch **dưới** — ở **hai** chỗ.
Hậu quả: mọi người dùng thành không có vai, cửa chặn sạch, **màn hình trông y hệt phân quyền
chạy đúng**. **Luật:** mã vai, mã trạng thái, tên bảng → **nhập hằng**, cấm gõ lại; và bài test
phải **đọc thẳng file lược đồ** rồi so, đừng gõ tay giá trị vào test.

**3. Màn hình rỗng phải nói VÌ SAO rỗng.**
"Không có việc nào đang chờ" đọc như tin mừng, trong khi sự thật là chưa gán page. Người ta
ngồi chờ một hệ thống không bao giờ có việc. **Luật:** mọi màn có trạng thái rỗng phải phân
biệt **"xong hết rồi"** với **"chưa cài đặt xong"**, và cái sau phải chỉ đường đi tiếp.

**4. Nghiệm thu bằng số, và tự chạy lại — đừng tin báo cáo.**
Ba lần trong giai đoạn 1, thợ báo đạt mà kiểm lại thì chưa: một phép thử nạp nóng "đậu" vì
lý do sai (model không hề đổi, chỉ là rơi sang dự phòng). **Luật:** người giao việc phải là
người nghiệm thu, và phải **đọc diff** tìm chỗ sửa ngoài phạm vi.

**5. Việc NGƯỜI phải xếp trước việc CODE.**
Giai đoạn 1 code xong trong hai ngày rồi đứng im vì chín việc người chưa ai làm. **Luật:**
mỗi sóng của giai đoạn 2 phải khai rõ **việc người nào chặn nó**, và khai ngay ở đầu sóng —
không để tới lúc code xong mới phát hiện thiếu.

**6. Đo sai còn nguy hơn không đo.**
Tôi từng báo động "429 tăng 8→21 sau restart" bằng cách so hai cửa sổ `tail -N`, mà mốc khởi
động nằm gần cuối log — tức là đếm số cũ rồi quy cho việc mới. **Luật:** trước khi so hai
khoảng, phải chỉ ra được **ranh giới** nằm ở đâu; log không có mốc giờ thì cấm so bằng
`tail -N`.

---

## Ước lượng — và vì sao đừng tin con số 4 tuần

Kế hoạch gốc ghi 4 tuần. Thực tế giai đoạn 1: phần **code** của cả hai người xong trong khoảng
**hai ngày**; phần **chờ người** thì tới nay vẫn chưa xong.

Nên ước lượng đúng cho giai đoạn 2 là: **code ~3–5 ngày**, còn lịch thật do bốn thứ ngoài code
quyết định — nạp tiền tài khoản AI, gán page cho team, chốt danh sách marketer, và duyệt nội
dung bộ luật chung. Xếp bốn thứ đó vào lịch trước, rồi mới xếp code.
