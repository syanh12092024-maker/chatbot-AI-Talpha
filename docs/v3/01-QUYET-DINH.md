# HỒ SƠ QUYẾT ĐỊNH

> Mọi thứ đã chốt trong quá trình thiết kế v3, kèm **lý do**. Ghi cả những việc đã cân nhắc rồi
> quyết định **không làm** — để sau này không ai đào lại.
>
> Chốt ngày 22/08/2026, dựa trên 62 câu hỏi nghiệp vụ đã trả lời và số đo thật trên máy chủ.

---

## Số đo nền — mọi tính toán dựa trên đây

Đo trên máy chủ production ngày 22/08/2026, lấy từ Sổ AI:

| Chỉ số | Giá trị |
|---|---|
| Tin AI đã trả khách | 13.010 |
| Đơn hàng ra được | 247 |
| **Đơn giá một tin AI** | **127 đ** |
| Số tin để ra một đơn | 52,7 |
| **Chi phí AI cho một đơn** | **6.696 đ** |
| Tổng tiền AI từ trước tới nay | 1.028.361 đ |
| Chi phí AI trên doanh thu một đơn | 0,97% |
| Hồ sơ token mỗi lượt | vào 3.053 · đọc cache 8.390 · ra 167 |
| Tỉ lệ trúng cache | 73,3% |

Page đang bật AI: **51** trên 315 page có trong dữ liệu.

---

## 1 · Hai luồng đơn — tách hẳn nhau

Đây là quyết định quan trọng nhất về nghiệp vụ, và cũng là chỗ dễ hiểu sai nhất.

| | Luồng trang bán hàng | Luồng Messenger |
|---|---|---|
| Khách đến từ | Quảng cáo → form LadiPage | Quảng cáo → nhắn inbox |
| Đơn vào POS lúc nào | **Ngay khi khách bấm BUY NOW** | Chỉ khi sale duyệt |
| Trạng thái ban đầu | Chờ xác nhận | — |
| Ai xác nhận | **Bot nhắn WhatsApp** | Khách đã xác nhận trong chat |
| Cần WhatsApp không | **Có, bắt buộc** | **Không** |
| Kết thúc | Đổi sang Chờ in → đóng gói | Sale duyệt → tạo đơn ở Chờ in |

**Vì sao trang bán hàng phải xác nhận:** khách điền form xong là đơn đã nằm trong POS, nhưng chưa ai nói chuyện với họ. Đóng gói gửi đi mà không hỏi là ôm rủi ro bom hàng.

**Vì sao Messenger không cần:** khách đã chat với bot, đã đưa đủ tên, số, địa chỉ và nói đồng ý trả tiền khi nhận. Nhắn WhatsApp hỏi lại là làm phiền và làm chậm.

**Hệ quả cho code:** máy trạng thái đơn phải **phân nhánh theo nguồn ngay từ đầu**, và bảng `don_hang` phải có cột nguồn. Lọc trùng phải **kiểm chéo cả hai luồng** — cùng một khách vào được bằng hai đường.

**Số liệu:** 37,4% khách bấm BUY NOW rồi **không** bấm gửi WhatsApp. Đây là lỗ lớn nhất bot sinh ra để bịt.

> **Bổ sung 29/09/2026 — CR-28-09c** (`docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`, mục 2d). Hai luồng trên giữ nguyên; thêm luật nhận diện và luật sở hữu.

- **Ba nguồn đơn, không phải hai:** Messenger (có hội thoại) · **Ladi** (khách chốt trên trang bán hàng — nhận bằng
  **UTM** trên đơn POS) · **sale nhập tay** (không hội thoại, không UTM). Chỉ đơn Ladi đi luồng xác nhận WhatsApp;
  đơn sale nhập tay **không** nhắn. Đo 14 ngày / 7 shop: 2.019 đơn có UTM, 0 đơn trong số đó có hội thoại; 113 đơn
  không hội thoại mà cũng không UTM — đó là đơn sale nhập tay.
- **Đơn thuộc team của MARKETER đem đơn về**, theo team của người đó **vào ngày đơn** (hồ sơ HRM). Bảng ghép tài khoản
  marketer trên POS ↔ nhân viên là của HRM (`PIALPHA_ALL_Dataset.dim_person_map` trên BigQuery) — hệ chỉ đọc. Đơn
  không có marketer hoặc marketer chưa ghép vào ô **«chờ gán team»**.
- **Một shop POS dùng chung nhiều team** (đo 14 ngày: 5/7 shop có đơn của ≥2 team). Đơn kéo về **một lần mỗi shop**,
  mỗi đơn đúng **một** bản — không bao giờ nhân đôi theo team. Chỉ team chủ đơn nhắn WhatsApp và ghi trạng thái lên POS.
  Tồn kho, lịch sử hoàn và hồ sơ khách dùng chung theo (nước, số điện thoại).

---

## 2 · Botcake — thay thế, không điều phối

**Đã thử và không làm được.** Ghi trong `src/botcake.js` dòng 4–12, thử thật trên page nháp ngày 10–11/08/2026:

```
GET   /pages/{id}/keywords   → 200   đọc được
GET   /pages/{id}/flows      → 200   đọc được
POST/PUT/PATCH/DELETE        → 404   toàn bộ, kể cả bản v2
POST  /flows/send_flow       → 400   chỉ kích hoạt flow có sẵn
```

API Botcake **không cho ghi**, và **không trả về nội dung câu trả lời** của flow nào — chỉ lấy được từ khoá, bóc từ tên flow.

**Quyết định:** thay Botcake AI bằng bot AI của hệ thống, tắt dần theo đợt 3 page.

**Đã đối chiếu bộ từ khoá trên 10 page thật ngày 22/08:**

| Luật Botcake | Lớp 0 đồng phủ | Kết luận |
|---|---:|---|
| Hỏi giá | 10/10 | Trùng — tắt không mất gì |
| Hỏi số ngày giao | 10/10 | Trùng — tắt không mất gì |
| Hỏi free ship | 10/10 | Trùng — tắt không mất gì |
| Nhận diện thật/giả | 0/10 | **Phải nhập trước khi tắt** |
| Hỏi size | 0/10 | **Phải nhập trước khi tắt** |
| Chưa có tiền | 0/10 | Để AI xử — đây là phản đối cần thương lượng |

**Rủi ro chưa đo:** Botcake đang nhắn riêng cho người bình luận dưới bài quảng cáo (Private Replies). Tắt mà chưa thay là mất nguồn khách — phải đo trước khi tắt quá 3 page.

**Phát hiện kèm theo:** hai lớp trả lời 0 đồng đang bị **TẮT** trên máy chủ, ghi rõ lý do trong `.env`: *"trùng từ khoá Botcake"* và *"Botcake đã lo tin chào hàng đầu"*. Nghĩa là Botcake và lớp 0 đồng là **hai mặt của cùng một công tắc** — tắt Botcake không phải mất lớp miễn phí, mà là bật lại lớp miễn phí đang nằm im.

---

## 3 · Độ trễ — dưới 10 giây, và nó phụ thuộc việc tắt Botcake

Ngân sách thời gian hiện tại, đo từ cấu hình thật trên máy chủ:

| Chặng | Thời gian |
|---|---|
| Vòng hỏi tin mới | 0–6 s |
| Đợi khách gõ xong | 5 s |
| **Nhường Botcake** | **6 s** |
| **Chờ riêng của AI** | **20–28 s** |
| Gọi model | 3–5 s |
| **Tổng** | **34–50 s** |

**26–34 giây tồn tại chỉ vì Botcake dùng chung page.** Tắt Botcake và đổi vòng hỏi sang nhận đẩy thì còn **6–10 giây**.

---

## 4 · WhatsApp — đi qua Pancake

Pancake có sẵn bốn cách kết nối WhatsApp, trong đó có **Cloud API chính thức** của Meta: rủi ro khoá số rất thấp, nhắn khách trước được, cần mẫu tin duyệt trước.

**Quyết định:** dùng đường Pancake, **bỏ phương án tự dựng cổng WhatsApp**.

**Đã cân nhắc rồi loại:** Evolution API và Baileys tự dựng. Lý do loại: công cụ chạy trên giao thức WhatsApp Web thường trụ 2–8 tuần trước khi bị phát hiện; 68% doanh nghiệp dùng công cụ không chính thức bị khoá ít nhất một lần trong 12 tháng. Mô hình dùng của dự án — nhắn hàng loạt số lạ — đúng loại bị gắn cờ nặng nhất.

**Còn phải kiểm:** Pancake cho gửi WhatsApp qua giao diện thì chắc chắn; **gửi bằng API** thì cần thử một lần thật. Đây là điểm kiểm chặn số 1.

---

## 5 · Nhắn tin ngoài 24 giờ

Luật Meta đổi trong năm 2026:

| Mốc | Chuyện gì |
|---|---|
| 10/02/2026 | Recurring Notifications kết thúc, thay bằng **Marketing Messages** trên Messenger |
| 27/04/2026 | Ba nhãn tin cũ chết hẳn — gọi vào trả mã lỗi 100 |
| Còn lại | Chỉ nhãn cho người thật trả lời trong 7 ngày |

**Messenger nay gửi được ngoài 24 giờ** bằng Marketing Message — cần khách đồng ý nhận tin trước và Meta duyệt nội dung. Trần: **1 tin / 48 giờ mỗi người**.

**Quyết định:** làm bốn đường gửi, và bảng phân đường nằm **ngay cạnh nút gửi** — con số thật ở đúng chỗ bấm nút, để không ai bấm gửi cho 2.847 người rồi tin rơi âm thầm.

**Còn phải kiểm:** Marketing Message **không bật ở mọi nước**. Chưa xác nhận được cho Trung Đông. Điểm kiểm chặn số 4.

**Đã cân nhắc rồi loại:** dùng nhãn tin để lách gửi khuyến mãi ngoài 24 giờ. Lý do loại: vi phạm chính sách, và cái giá là mất page cùng toàn bộ traffic quảng cáo đang chạy.

---

## 6 · Prompt có bốn khối, không phải một

> **Đổi 29/09/2026 — CR-28-09c** (`docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`). Dòng cũ giữ bên dưới, gạch ngang.
>
> **Sản phẩm là lõi của câu trả lời.** Một sản phẩm bán ở nhiều thị trường, mỗi thị trường nhiều page:
> **sản phẩm chung** (kiến thức, cách tư vấn, hỏi size, ảnh) → **theo thị trường** (đúng MỘT món POS của shop nước đó,
> giá bậc theo tiền tệ, ưu đãi, giao, lời riêng) → **page** (giọng, câu chào, ~~ghi đè có chủ ý~~ ghi đè LỜI có chủ ý —
> page KHÔNG ghi đè sản phẩm hay giá, đổi 02/10 CR-02-10b, xem §8 «Page phải gắn sản phẩm»). Kịch bản tầng sản phẩm
> và tầng nước giữ nguyên — chỉ trình bày theo sản phẩm thay vì theo «tầng». Mã POS mỗi shop khác nhau nhưng có thể là
> CÙNG một sản phẩm ⇒ sản phẩm gốc gom nhiều mã POS, mỗi mã một thị trường.
>
> **Kỹ năng thôi là một khái niệm riêng.** Nó sinh ra cho đúng một ca (hỏi size) — câu đó chuyển vào kiến thức của
> các sản phẩm có size. **Câu trả lời sẵn giữ** (đã ký ở §2–§3), gom về MỘT lớp sửa được trên giao diện thay vì ba chỗ.

| Khối | Token | Ai sửa | Nhịp đổi |
|---|---:|---|---|
| Bộ luật chung | 2.256 | Quản trị · dùng chung 51 page | Hiếm |
| ~~Kỹ năng~~ | ~~~180/kỹ năng~~ | ~~Marketer · bật theo sản phẩm~~ → kiến thức sản phẩm (CR-28-09c) | ~~Thỉnh thoảng~~ |

> **CR-15/09 · không đổi quyết định nào ở trên, chỉ làm cho nó chạy được.** «Bật theo sản
> phẩm» và ba tầng kịch bản (migration 010) vốn đã ký, nhưng mã sản phẩm mang theo mã shop
> (`<shopId>:<variationId>`) nên «một sản phẩm» thực chất là «một sản phẩm TRONG MỘT SHOP» —
> đo 15/09: Fitgum Acai Berry ra **ba** mã ở ba thị trường. CR thêm `ma_goc` (mã sản phẩm
> thật, không mang shop) để tầng sản phẩm và tầng nước có nghĩa.
> Hồ sơ: `docs/thi-cong/doi-y-do/CR-15-09-ma-san-pham-khong-mang-shop.md`.
| Kịch bản page | ~1.400 | Marketer phụ trách | Thường xuyên |
| Dữ liệu sản phẩm | ~1.500 | ~~Đồng bộ từ POS~~ POS kéo vào · người sửa trên giao diện — một chỗ ghi (§8, CR-28-09b) | ~~Tự động~~ Mỗi lượt lưu |

**Trước khi thiết kế lại, bộ luật chung chỉ lập trình viên sửa được** — nằm trong `src/prompts.js`, muốn đổi phải sửa mã nguồn rồi deploy. Marketer không nhìn thấy. Mà đó mới là khối quyết định bot tư vấn giỏi hay dở.

~~**Tầng kỹ năng là mới hoàn toàn** — khối tư vấn dùng lại được, bật cho đúng sản phẩm cần.~~ *(CR-28-09c: bỏ khái niệm, giữ nội dung.)* Số đo vẫn đúng và vẫn là lý do: hai sản phẩm có size đang hoàn **26,8%** và **19,2%**, trong khi sản phẩm không size hoàn 9,3% — câu hỏi size phải nằm trong kiến thức của hai sản phẩm đó.

**Hệ quả cho code:** tách bốn khối ngay từ giai đoạn 1, kể cả khi chưa làm giao diện.

---

## 7 · Model AI — mỗi team chọn riêng

> **Đổi 29/09/2026 — CR-28-09c** (`docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`). Mỗi team **một model chính + một dự phòng KHÁC NHÀ**, trên một khung.
> Màn chỉ hiện thứ đường chạy thật đọc: đo 29/09 chỉ vai «chính» có đường dùng; dự phòng chưa nối vào đường chat
> (phiếu LL14) — tới khi nối, màn nói rõ «chưa tự chuyển»; ô «việc nền» ẩn tới khi có việc đầu tiên dùng nó.

~~Bốn nhà: Claude · OpenAI · DeepSeek · Kimi. Mỗi team nhập khoá riêng và chọn model riêng.~~ Vẫn chọn trong bốn nhà
Claude · OpenAI · DeepSeek · Kimi, khoá riêng từng team.

Quy giá công bố ra tiền thật theo hồ sơ token đo được:

| Model | đ/tin | đ/đơn | So hiện tại |
|---|---:|---:|---:|
| DeepSeek V4-Flash (ngoài cao điểm) | 21,9 | 1.152 | 0,17× |
| GPT-5.6 Luna | 25,4 | 1.341 | 0,20× |
| Kimi K2.5 | 65,4 | 3.448 | 0,51× |
| Claude Haiku 4.5 | 122,9 | 6.477 | 0,96× |
| **Kimi K2.6** ← đang chạy | **127,7** | **6.729** | 1,00× |
| Claude Sonnet 5 | 368,7 | 19.431 | 2,89× |
| Claude Opus 5 | 614,5 | 32.385 | 4,81× |

**Chênh 28 lần** giữa rẻ nhất và đắt nhất.

**Quyết định quan trọng:** đo bằng **tiền mỗi đơn**, không phải tiền mỗi tin. Model thông minh hơn chốt bằng ít tin hơn, nên có thể đắt mỗi tin mà rẻ mỗi đơn. Vì vậy phải A/B, không chọn theo bảng giá.

**Bắt buộc có model dự phòng.** Ngày 06/08/2026 tài khoản nhà chính hết tiền, bot đứng im ba tiếng mà không ai biết.

---

## 8 · Ba team

> **Đổi 29/09/2026 — CR-28-09c** (`docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`, mục 2d). Dòng cũ giữ bên dưới, gạch ngang.

**Pialpha GCC · Pialpha AUUS · Pialpha EU** — tên hiển thị theo HRM (mã nội bộ giữ nguyên; Pialpha GCC là Tiểu Alpha cũ).
- **Người lấy từ HRM** (BigQuery `HRM_Core`): một tài khoản = đúng một hồ sơ, khớp theo email công ty. MKT → Marketer;
  SALE → Sale, **dùng chung cả ba team**; BO · VANDON · CTV không vào hệ; người nghỉ tự khoá.
- **1 shop POS = 1 thị trường.** Thị trường của sản phẩm và page suy từ shop, không gõ tay. Shop dùng chung được nhiều
  team (§1 bổ sung).
- **Thêm thị trường cho sản phẩm = gắn đúng một món POS của shop nước đó**; marketer phụ trách chọn từ hồ sơ HRM, gán ở
  mức sản phẩm × thị trường, page kế thừa.

~~**Tiểu Alpha · Auus · Pialpha EU.** Mỗi team có bộ sản phẩm, thị trường, sale, marketer riêng, và **kết nối POS riêng**.~~

~~Sản phẩm và thị trường do team tự thêm qua giao diện, hoặc đồng bộ từ POS của team đó.~~

**Một nguồn — đổi 28/09/2026, CR-28-09b** (`docs/thi-cong/doi-y-do/CR-28-09-mot-nguon-san-pham.md`).
Mọi thứ bot dùng để chào bán một page — **sản phẩm, bậc giá, ảnh, kịch bản** — có đúng MỘT chỗ
ghi là **CSDL v3, sửa qua giao diện v3**. POS là đường KÉO VÀO, không phải chỗ thứ hai. Mỗi lượt
lưu trên giao diện **hoặc có hiệu lực với bot ngay, hoặc báo lỗi rõ** — không bao giờ «lưu xong»
mà bot vẫn chạy bản cũ. Google Sheet và `kb-overrides.json` thôi là nơi người sửa: Sheet nạp một
lượt rồi tắt đồng bộ; `kb-overrides.json` còn đó nhưng **chỉ máy ghi** (bản chép bộ não chat đọc,
sinh từ CSDL mỗi lượt lưu — ~~bot v1 đọc~~, CR-02-10: nay chính tiến trình v3 ghi, không qua v1). Mọi thứ quyết định một page trả lời thế nào nằm trên **một màn**: trang
của page đó.

**Lý do:** đo 28/09 — sửa giá ở giao diện v3 thì bot KHÔNG đổi (bot đọc `kb-overrides.json`); 77
page có lớp đè nên sửa Sheet cũng KHÔNG đổi; ảnh (543) không có chỗ nào sửa được; và cửa tiền
lúc tạo đơn so với bảng giá v3 trong khi bot báo giá theo bảng khác.

**Page phải gắn sản phẩm — đổi 02/10/2026, CR-02-10b** (`docs/thi-cong/doi-y-do/CR-02-10b-page-phai-gan-san-pham.md`).
Bot chỉ chào bán ở page đã gắn **một sản phẩm gốc và một shop POS**, và chỉ chào món POS của gốc
đó ở shop đó. Page chưa gắn ⇒ không sản phẩm, **không trả lời** (bàn giao sale như page thiếu
KB), không bật được — ở mọi đường đọc: chat (cả hai nguồn KB), cửa tiền, bản chép, cổng bật, màn.
**Không có giá riêng theo page:** giá thuộc món POS × shop, mọi page cùng gốc × shop chung một bảng
giá, sửa ở Sản phẩm › Theo thị trường. Sản phẩm gốc chỉ sinh từ **gộp món POS theo SKU**; lối tạo
theo số hiệu bỏ. «Bản sao theo page» (78 dòng nạp từ `kb-overrides.json`) thôi là nguồn — giữ làm
lưu trữ, không đọc.

**Lý do:** người quyết chốt 02/10 *«page bắt buộc gắn sản phẩm thì mới chat được»* và *«bỏ giá
riêng theo page»*. Đo prod 02/10: 0/514 page đã gắn gốc, cả 76 page có hàng đọc bản sao — giá và
ảnh nằm ở bản sao riêng từng page trong khi màn Sản phẩm sửa giá ở món POS × thị trường, tức vẫn
hai chỗ ghi cho cùng một sự thật.

**Luật cứng:** điều kiện team nằm ở **tầng truy vấn**, tự chèn theo người đang đăng nhập — không phải bộ lọc trên màn hình. Quên một chỗ là team này nhìn thấy khách của team kia.

---

## 9 · Vai và quyền

> **Đổi 29/09/2026 — CR-28-09c** (`docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`). Ba vai: **Quản trị · Marketer · Sale**. «Người duyệt kịch bản» không
> còn việc (kịch bản lưu là chạy, CR-28-09b); «Quản lý» gộp vào Quản trị. Đo prod 28/09: 0 người mang hai vai bị bỏ.
> Giao diện theo vai, **năm đích**: Hộp thư (sale) · Sản phẩm · Page (marketer) · Số liệu (chủ team) · Cài đặt
> (quản trị) — hợp đồng màn ở `03-MAN-HINH.md`.

~~Năm vai: **Quản trị · Marketer · Sale · Quản lý · Người duyệt kịch bản**.~~

- Marketer **chỉ thấy sản phẩm mình phụ trách**
- Kịch bản do người viết thì **áp dụng thẳng, không cần duyệt**
  *(28/09, CR-28-09b: code đã trôi khỏi dòng này — bắt «lưu nháp» rồi một vai khác «đưa lên
  chạy». Người quyết xác nhận lại: **lưu là chạy, một bước**. Lịch sử bản vẫn giữ để lùi.)*
- Nhưng **đề xuất của AI thì phải có người duyệt** mới áp
- Nhật ký ghi đầy đủ, **không sửa không xoá**, ghi cả việc máy làm

~~**Vấn đề đang có:** 314 trên 315 page **chưa gán marketer**. Báo cáo cắt theo marketer sẽ trống cho tới khi gán xong.~~
*(CR-28-09c: marketer không gán theo page nữa — gán ở sản phẩm × thị trường từ hồ sơ HRM, page kế thừa; đơn thuộc
marketer theo bảng ghép của HRM, phủ 98,6% đơn đo 29/09.)*

---

## 10 · Màn hình sale — bàn hội thoại CHỈ ĐỌC

> **Đổi 28/09/2026 — CR-28-09** (`docs/thi-cong/doi-y-do/CR-28-09-ban-hoi-thoai-chi-doc.md`).
> Bản cũ giữ nguyên bên dưới, gạch ngang.

Màn hình sale là **bàn hội thoại**: danh sách hội thoại (lọc *Cần người · Bot đang xử · Tất cả*,
mỗi dòng có lý do bot đẩy sang và đồng hồ đếm ngược 10 phút) · khung chat **đọc thẳng lịch sử
Pancake** (không chép, không lưu bản sao) · cột bối cảnh khách (thông tin, rủi ro hoàn, đơn, giai
đoạn và người giữ hội thoại, kịch bản page).

Sale **vẫn trả lời ở Pancake** — trên hệ thống **không có ô soạn tin, không có nút gửi**. ~~Thao tác
làm trên hệ thống chỉ gồm: **nhận việc · trả lại cho bot · đánh dấu đã xử và chọn kết quả**.~~
Bấm «Trả lời trên Pancake» là nhảy thẳng sang Pancake hoặc POS.

> **Bổ sung 29/09/2026 — CR-28-09c** (`docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`). Bàn hội thoại thành **Hộp thư** — nhà duy nhất của sale.
> Thao tác trên hệ thống: **nhận việc · nhận thay bot · trả lại cho bot · đánh dấu đã xử và chọn kết quả ·
> xem / sửa / duyệt / từ chối đơn Messenger ngay cạnh khung chat** (duyệt là tạo đơn trên POS — đường tiền, giữ đủ cửa
> kiểm của hàng chờ tạo đơn, `ban-giao/may-trang-thai-don-v1.md`). Thêm tab **đơn chờ** (đơn không gắn hội thoại, đơn Ladi chờ xác nhận WhatsApp) và **tìm khách** gộp ba
> kênh theo số điện thoại. Sale dùng chung ba team ⇒ Hộp thư lọc được «cả ba team». Vẫn **không** soạn tin.

**Lý do đổi:** khuôn «hai danh sách» không cho sale thấy bot đã nói gì trước khi đẩy sang người
— phải mở Pancake mới biết việc gấp tới đâu. Đọc hội thoại tại chỗ rút lượt nhảy qua lại, mà
vẫn giữ lý do cũ: sale không phải học một nơi TRẢ LỜI mới.

~~**Màn hình sale — chỉ là bảng điều phối.** Sale **không làm việc trên hệ thống này**. Màn hình chỉ có hai danh sách — hội thoại cần xử và đơn cần xử — mỗi dòng ghi **lý do bot đẩy sang** và đồng hồ đếm ngược 10 phút. Bấm là nhảy thẳng sang Pancake hoặc POS. Thao tác duy nhất làm trên hệ thống: **đánh dấu đã xử và chọn kết quả**. **Lý do:** sale đã quen Pancake. Bắt họ học một nơi làm việc mới thì thường không ai dùng.~~

---

## 11 · Những việc đã cân nhắc rồi quyết định KHÔNG làm

| Việc | Vì sao không |
|---|---|
| Điều khiển Botcake qua API | API không cho ghi, đã thử và ghi lại kết quả |
| Tự dựng cổng WhatsApp (Evolution/Baileys) | Rủi ro khoá số quá cao với mô hình nhắn hàng loạt |
| Dùng nhãn tin để gửi khuyến mãi ngoài 24h | Vi phạm chính sách, giá phải trả là mất page |
| Kênh Meta trực tiếp | App đang ở Standard Access, `/conversations` bị từ chối trên mọi page. Code đã viết xong nằm ở nhánh `meta-channel`, chưa từng deploy được |
| Chatwoot cho màn hình sale | Tốt nhưng là cả một cuộc di dời; sale đã quen Pancake |
| Langfuse quản lý prompt | Mạnh nhưng thừa cho quy mô này, và thêm một hệ thống nữa phải nuôi |
| Chặn cứng khách hoàn cao ở một ngưỡng | Đề xuất chia bốn tầng thay vì một ngưỡng — 144 khách hoàn 30–65% đang bị gộp nhầm vào nhóm bình thường. **Chờ chốt** |
| Kho ưu đãi và Hậu bán mua lại | Đã thiết kế xong, **để lại giai đoạn sau** theo yêu cầu |
| Gán team cho đơn theo page của đơn | Page chỉ có trên 16% đơn trang bán hàng — thay bằng team của marketer (CR-28-09c) |
| Ô ghép tài khoản marketer POS ↔ nhân viên trong hệ | HRM đã có bảng ghép; hai nơi ghép sẽ lệch nhau (CR-28-09c) |

---

## 12 · Những chỗ còn hở, biết rồi nhưng chưa xử

| Chỗ hở | Ảnh hưởng |
|---|---|
| **Độ ngẫu nhiên chưa đặt** | Bot chạy mặc định nhà cung cấp — mỗi lượt trả lời một kiểu, khó bám kịch bản và khó A/B cho chuẩn. Sửa nửa ngày, nằm trong L1 |
| **Sản phẩm mới chưa có đơn thì không tạo được đơn** | Hàm lấy thông tin sản phẩm suy ngược từ 25 đơn gần nhất. Hiện chưa lộ vì tính năng tạo đơn tự động đang tắt. L1 sửa bằng cách đọc thẳng danh mục từ POS |
| **`paano mag order` không bắt được** | Lớp 0 đồng bắt `how to order` nhưng không bắt cách viết tách chữ phổ biến của tiếng Philippines. Sửa vài phút, phải xong trước khi tắt Botcake |
| ~~**314 page chưa gán marketer**~~ | ~~Báo cáo theo marketer trống~~ — CR-28-09c: marketer theo sản phẩm × thị trường (HRM), đơn theo bảng ghép HRM |
| **Tên sản phẩm trống trong dữ liệu** | Chỉ có bảng giá và ảnh. Phải lấy tên và mã từ POS |
| **Chưa có phần trả lời bình luận** | Là điều kiện để tắt Botcake trên diện rộng |

---

## 13 · Bốn điểm kiểm chặn — chưa có câu trả lời

| # | Câu hỏi | Nếu sai thì sao |
|---|---|---|
| 1 | Gửi WhatsApp bằng API Pancake được không | Quay lại tự dựng cổng, thêm ~1 tuần vào L1 |
| 2 | Pancake có đẩy tin về không, hay phải hỏi vòng | Độ trễ thành 8–13 giây thay vì 6–10 |
| 3 | Botcake kéo về bao nhiêu khách từ bình luận | Phải làm phần bình luận trước khi tắt quá 3 page |
| 4 | Marketing Message có bật cho Trung Đông không | Nhánh nhắn hàng loạt Messenger phải đổi sang quảng cáo trả tiền |

Cả bốn làm trong tuần đầu, mỗi cái một ngày.

---

## 14 · Một bản — v1 nghỉ hưu

**Đổi 02/10/2026, CR-02-10** (`docs/thi-cong/doi-y-do/CR-02-10-mot-ban-v3.md`).
~~Chạy song song v1 và v3, chuyển dần từng page~~ (02-KE-HOACH nguyên tắc 4). Phía mình nay chỉ
có **MỘT bản**: tiến trình `aicloser-v3` (giao diện + API) và `aicloser-worker-v3` (trả lời
khách). Tiến trình bot v1 (`aicloser.service`, `src/server.js`, màn `/admin` cổng 3100, công tắc
`ai-enabled.json`) tắt hẳn; mọi việc v3 từng mượn của nó chạy ngay trong tiến trình v3. «Page này
do bot của mình trả lời» có đúng **một công tắc** trong CSDL.

**Lý do:** đo 02/10 — v1 thôi trả lời khách từ 28/08 (`ai-enabled.json` rỗng, Sổ AI đứng im), poll
của nó đã tắt bằng cờ; giữ nó chỉ còn là nguồn nhập nhằng: hai màn quản trị, sáu chỗ cùng nói «ai
trả lời page này», chữ «bot cũ / bot mới» trên màn.

**Không đổi:** cách bot nói (năm file bộ não giữ nguyên hành vi) · van gửi khách · bot `ai_sale`
của pancake-tool (team khác — page nào chuyển sang v3 thì người quyết báo bên đó tắt page đó trước).
Song song từ nay là **với ai_sale, theo từng page**, không phải với v1.

**Đã thi hành 02/10/2026** (MB1–MB4, CR ĐÓNG): prod chỉ còn `aicloser-v3` + `aicloser-worker-v3`; mã, unit và cron của
bot v1 đã gỡ (tag mốc `truoc-mot-ban`). Ngoại lệ có chủ đích: `src/wa.js` ở lại vì pancake-tool (team khác) dùng chung trên máy chủ.
