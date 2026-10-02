# NHẬT KÝ THAY ĐỔI

> Repo này phục vụ khách thật. Không có phiên bản thì lúc hỏng không ai trả lời được câu
> **«hỏng từ bản nào»**. File này tồn tại để trả lời đúng câu đó.

**Cách ghi** — bốn luật, giữ cho file này còn đọc được sau một năm:

1. **Viết bằng thứ người dùng thấy**, không bằng tên hàm. «Bot thôi hỏi lại đơn đã xác nhận»
   chứ không phải «sửa `capNhatTrangThai()`».
2. **Mỗi mục kèm commit** (`abc1234`) — người sau còn đi tra được.
3. **Mục nào chạm khách thì gắn 🔴**: đường tiền · đơn hàng · tin gửi ra ngoài · quyền.
4. **Phiên bản chỉ được đặt lúc MỞ VAN**, bằng `ops/bin/phat-hanh.sh <phiên-bản>` — không tự
   đặt tag, không tự push (skill `mo-van`, ba điểm dừng chờ người).

Khuôn số: `MAJOR.MINOR.PATCH`. Bản v3 chưa cutover xong nên còn ở `0.x` — `MINOR` lên mỗi lần
mở thêm một cửa, `PATCH` cho vá.

---

## [Chưa phát hành]

### 02/10/2026 — 🔴 MỘT BẢN, bước cuối: gỡ bot v1 khỏi mã · ảnh sản phẩm tải lại được · màn thôi nói «bot cũ / bot mới» (MB4 · CR-02-10)

Không đổi chữ bot nói (0 tệp bộ não). **1 migration (030 — GỠ hai cột `page.giao_bot_moi` · `page.v3_ai_bat`, đo 02/10 toàn
0/false trên 582 page; có `down`)** · 0 gói · biến ĐỔI: `PUBLIC_URL` `:3100` → `:3102`. Van gửi KHÔNG đổi — lượt này không page
nào được bật và không tin nào ra khách.

- 🔴 **Ảnh sản phẩm gửi khách** (cấu hình máy chủ): địa chỉ ảnh trỏ cổng của bot cũ (3100) — cổng này đóng từ MB3 nên Facebook
  không tải được ảnh nào (đo 02/10: ngoài vào `:3100/uploads` = không kết nối, `:3102/uploads` = 200). Nay trỏ 3102. Chưa khách
  nào chịu (0 page bật), nhưng thiếu bước này thì page đầu tiên bật sẽ gửi ảnh hỏng.
- **Màn Bộ luật** (`357795a`): «số page bị ảnh hưởng» đếm theo công tắc thật (`page.bot_ai_bat`) — trước đó đếm theo tệp của bot
  cũ nên có thể lệch với điều bot đang làm. Màn Team · Kịch bản cùng một nguồn.
- **Chữ trên màn** (`357795a`): «tiến trình bot» → «lõi bot»; nhóm «bot cũ / bot mới» → «đang tắt / đang bật bot»; số chi phí và
  đơn của bot cũ ghi rõ «Sổ AI cũ (ghi tới 28/08)».
- **Máy chủ** (`357795a`): chỉ còn hai dịch vụ `aicloser-v3` + `aicloser-worker-v3`; dịch vụ `aicloser` (bot v1) gỡ hẳn; hai lịch
  báo cáo WhatsApp 8h/17h của bot cũ gỡ (115/115 lượt chạy đều lỗi «chưa đặt nhóm» — chưa từng gửi được tin nào). `npm start`
  nay chạy giao diện v3.
- **Giữ nguyên cho pancake-tool** (`2a02656`): `src/wa.js`, các gói WhatsApp trong `node_modules` và phiên `wa-auth/` — ba lịch
  cảnh báo của team đó (có cảnh báo AI Sale sắp hết tiền) đang dùng chung.
- Tài liệu (`6d4186f`): README, skill `chatbot`, `.env.example`, `docs/local-dev.md` nói về MỘT bản; `docs/TONG-QUAN-HE-THONG.md`
  gắn biển «ảnh chụp bot v1».

### 02/10/2026 — 🔴 Marketer chỉ thấy sản phẩm mình phụ trách · chọn marketer từ HRM · sale vào thẳng team (LL15c · LL15d · CR-28-09c)

Không đổi chữ bot nói. **1 migration (031 — chỉ thêm cột `san_pham_goc.marketer_ma_nv`)** · 0 gói · 0 tệp bộ não · 0 biến mới.

- 🔴 **Đăng nhập** (`9e7d06c`): màn chọn team chỉ còn cho Quản trị thuộc nhiều team. Người khác thuộc nhiều team (sale — thành viên
  cả ba team) vào thẳng team dùng lần trước (lần đầu: team đầu theo tên); đổi team bằng menu nhỏ ở chip tên team trên thanh trên.
  Thuộc một team ⇒ chip chỉ là chữ. Đăng nhập Google: hoãn (cần tên miền + HTTPS).
- 🔴 **Sản phẩm** (`e68227a`): marketer phụ trách CHỌN từ tài khoản marketer có hồ sơ HRM (tab Chung + hộp gộp món), kèm gợi ý «ai bán
  nhiều nhất» từ đơn POS 60 ngày + nút «Dùng gợi ý». **Marketer chỉ thấy sản phẩm mình phụ trách** — và page bán sản phẩm ấy (cột
  page, trang page, bản sao theo page); mở sản phẩm/page của người khác ⇒ báo «không do bạn phụ trách». Quản trị thấy cả team.

### 02/10/2026 — 🔴 MỘT BẢN: v1 nghỉ hưu, một công tắc «bot trả lời page này» (MB1 + MB2 · CR-02-10)

Không đổi chữ bot nói (0 tệp bộ não). **0 migration** · 0 gói · biến GỠ: `V3_PAGE_XU_LY`, `V3_GIAO_PAGE_TREN_MAN`,
`V3_BOT_V1_GOC` (đặt trên máy chủ không còn tác dụng). Van gửi (`PANCAKE_READONLY` · `V3_PANCAKE_GUI`) KHÔNG đổi — lượt này
không page nào được bật và không tin nào ra khách.

- 🔴 **Công tắc bot** (`e2b10dd`): bật/tắt bot cho một page nay là MỘT cột (`page.bot_ai_bat`) — đúng cột máy trả lời đọc.
  Bật phải qua cổng sẵn sàng của chính bot (van gửi · cách ghép lời · sản phẩm + giá · model); tắt thì luôn được, kể cả
  lúc máy chủ chỉ-đọc. Gỡ nút «Giao sang bot mới / Trả về bot cũ», gỡ chữ «bot phụ trách: bot cũ/bot mới» và ô «hai nguồn
  công tắc lệch nhau». Lượt «Kéo dữ liệu về» thôi chép công tắc từ tệp của bot cũ (trước đây nó sẽ TẮT mọi page vừa bật).
- **Màn Sức khoẻ** (`e2b10dd`): đèn «Hai bot cùng một page» nay nói về bot `ai_sale` của team khác — xám (chưa đo được)
  khi đã có page bật, vì hệ không đọc được ai_sale phủ page nào.
- **Màn Page & bot · Sản phẩm · Kết nối · Sẵn sàng · Số liệu** (`47f2add`): không còn hỏi sang tiến trình bot cũ (cổng
  3100); mọi số đọc ngay trong tiến trình v3. Thiếu `ADMIN_USER/ADMIN_PASS` không còn làm màn trống.
- 🔴 **Máy trả lời** (`47f2add`): worker nay tự nạp sản phẩm, giá và kịch bản lúc khởi động và đọc lại khi màn lưu
  (≤15 giây). Trước đây worker KHÔNG nạp — bật page nào cũng chỉ ra «chưa có sản phẩm» rồi bàn giao.
- Cửa nhận tin Meta (`/webhook`) và trang chính sách (`/privacy`) chuyển sang tiến trình v3 (cổng 3102).

### 02/10/2026 — 🔴 Người và vai theo HRM: tạo tài khoản · cấp/rút vai · khoá người nghỉ · tên team (LL15b · CR-28-09c)

Không đổi chữ bot nói. **1 migration (029 — chỉ thêm hai cột)** · 0 gói · 0 tệp bộ não · 1 biến mới `V3_HRM_TU_DONG` (lượt này
CHƯA bật — đồng bộ chỉ chạy khi Quản trị bấm).

- 🔴 **Cài đặt › Người và team** (`3500986`): nút «Lấy người từ HRM (BigQuery)» mở được cho Quản trị — hiện KẾ HOẠCH trước khi làm
  gì: tạo tài khoản (Marketer/Sale đang làm của các team Pialpha, có email), cấp vai (MKT → Marketer ở team mình, SALE → Sale ở cả
  ba team), rút vai + khoá người đã nghỉ, mở khoá người làm lại, đổi tên team theo HRM, và chỗ HRM với hệ lệch nhau. «Áp dụng»
  chỉ dành cho người là Quản trị của mọi team, áp đúng bản đã xem. Tài khoản và vai tạo tay không bị đụng; không khoá Quản trị
  duy nhất của một team.
- 🔴 Vai do HRM cấp mang chữ «HRM», không rút tay được (đổi ở HRM). Tài khoản tạo từ HRM chưa có mật khẩu: «Chưa đặt mật khẩu» +
  nút «Đặt mật khẩu» (chỉ lần đầu). Khoá chặn lần đăng nhập sau, không cắt phiên đang mở.
- Lượt TỰ ĐỘNG mỗi 24 giờ khi bật `V3_HRM_TU_DONG=1` (lượt này chưa bật): HRM đọc rỗng · rút > 30% vai HRM · khoá > 5 người ⇒ hoãn,
  ghi nhật ký, chờ người. Màn Nhật ký có chữ cho mười việc mới (tạo tài khoản từ HRM · HRM cấp/rút vai · khoá/mở khoá · đổi tên
  team · đồng bộ · hoãn · đặt mật khẩu đầu).

### 02/10/2026 — HRM lên màn, chỉ đọc: hồ sơ nhân sự + marketer POS theo team (LL15a · CR-28-09c)

Không đổi chữ bot nói. 0 migration · 0 gói · 0 tệp bộ não · **1 biến mới `V3_BQ_KHOA`** (đường tới khoá BigQuery trên máy chủ).

- **Cài đặt › Người và team** (`8036529`): cột «Hồ sơ HRM» — mã nhân viên · đang làm / thử việc / đã nghỉ · team, khớp theo email
  công ty; bảng «Marketer trên POS ↔ hồ sơ HRM» của đúng team đang mở (đang làm + chờ gán team; người đã nghỉ và team không vào
  hệ chỉ đếm). Tạo tài khoản từ HRM vẫn chưa làm — nút ghi rõ.
- **Cài đặt › Kết nối › HRM** (`8036529`): số đọc từ nguồn (hồ sơ · bảng ghép · tài khoản marketer) + nút «Đọc lại HRM».
  Máy chủ chỉ ĐỌC BigQuery (token phạm vi chỉ đọc); đọc hỏng thì màn nói lý do, không chết.

### 01/10/2026 — Cài đặt nói đúng thứ bot dùng: Model · Người và team · Nhật ký (VE7c · VE7d · VE7e · CR-28-09c)

Không đổi chữ bot nói, không đổi model bot gọi. 0 migration · 0 biến · 0 gói · 0 tệp bộ não — một tệp đường chat
(`src/chat/model.js`) tách phần «chọn model + khoá» ra hàm riêng để màn đọc chung luật; hành vi bot y nguyên.

- **Model AI nói đúng bot đang gọi gì** (`4dd6b93`): thẻ «Trả lời khách» đọc cùng luật với bot. Team chưa lưu cấu hình thấy
  «Bot đang gọi kimi-k2.6 — model của máy chủ, khoá KIMI_API_KEY, không gửi độ ngẫu nhiên» thay vì «chưa có khoá» / «đang chạy
  bộ mặc định» / «rơi thẳng sang dự phòng» (cả ba sai trên 3/4 team, đo prod 30/09). Nhãn khoá mỗi thẻ theo đúng luật của đường
  dùng nó; «Việc nền» ẩn tới khi có việc nối vào; đầu trang đếm page bot mới đang xử.
- 🔴 **«Thay khoá và thử một lượt»** (`4dd6b93`): dán khoá (nếu có) rồi gọi ĐÚNG model + khoá đó một lần (16 token, vài đồng);
  lỗi nhà model hiện câu đọc được («Khoá bị từ chối (401)» · «Tài khoản hết tiền (402)» · «giới hạn lượt gọi (429)»), không đá
  ra trang đăng nhập; chặn bấm dồn 10 giây; ghi nhật ký. ⚠️ Dán khoá cho team chưa lưu cấu hình là tạo cấu hình riêng — bot của
  team chuyển sang dùng lựa chọn trên màn (gửi độ ngẫu nhiên 0,3); thẻ nói trước điều này.
- **Người và team theo bản vẽ** (`e258e14`): ba thẻ vai Quản trị · Marketer · Sale — «mở được» đo từ chính thanh điều hướng;
  marketer «phụ trách: chưa có nguồn» (quyết định «marketer chỉ thấy sản phẩm mình phụ trách» CHƯA làm — màn nói thẳng, đếm page
  có tên marketer); «Marketer trên POS ↔ hồ sơ HRM» «chưa nối vào máy chủ»; bảng người thêm Hồ sơ HRM + Phụ trách; nút «Chuyển
  page sang team khác» mở khung chuyển. Bỏ hàng chỉ số và tab POS (POS ở Kết nối). Câu «bot chạy bằng bộ mặc định» rời Bắt đầu.
- **Nhật ký đọc được** (`61863a1`): mỗi dòng một câu — lúc · ai · việc · đối tượng bằng TÊN (sản phẩm, page, kỹ năng, người
  dùng; đã xoá thì tên chụp lúc xảy ra); dòng máy nói việc gì («máy · cửa POS»); mã việc nền ra chữ tiếng Việt; giờ «01/10 05:09».

### 30/09/2026 — Sản phẩm khép kín: gộp món POS theo SKU · giá theo thị trường · marketer · gắn page (VE8a · VE8b · CR-28-09c)

Theo lời người quyết 30/09 («Sao phải chuyển sang 1 màn riêng?» · «gộp SP theo SKU → gán MKT → map page → khép kín»).
Không đổi chữ bot nói. **Migration 028** (CHỈ THÊM cột: SKU của món + sản phẩm, marketer của sản phẩm, cờ «giá do người đặt»).
0 biến · 0 gói · 0 tệp bộ não.

- **Gộp món POS thành sản phẩm** (`eafbcd7` · `85b2afb`): ngay trong màn Sản phẩm («Gộp món POS thành sản phẩm →»). Máy gợi ý
  nhóm theo **SKU** (mã sản phẩm POS, chung giữa các shop — đo prod: có ở 100% món, trùng số đầu tên 371/373), người bỏ chọn món
  lạ, sửa tên/mã gốc, gán marketer rồi bấm gộp — một lượt tạo sản phẩm + gắn món. Lượt «Kéo danh mục» lưu SKU và **tự nối** món
  của shop mới cùng SKU vào đúng sản phẩm.
- 🔴 **Giá theo thị trường sửa ngay trong sản phẩm** (`97de3dd`): tab «Theo thị trường» — bậc giá (tên bậc · số lượng · giá ·
  tiền tệ · giá gốc · khuyến mãi · phí ship · miễn ship · bật) của CHÍNH món POS shop đó; bot báo giá và máy tính tiền đơn từ
  cùng bảng này cho mọi page gắn vào sản phẩm ở thị trường đó. Lưu chỉ thay giá: lượt kéo POS không đè giá người đặt, nhưng tên
  và **hết hàng vẫn theo POS** (đường sửa cũ khoá cả hết hàng). Tab «Sản phẩm & giá» ở Vận hành **bỏ** — một nơi nhập giá.
- **Marketer của sản phẩm** (`97de3dd`): tab Chung — đổi marketer là mọi page đang bán sản phẩm đổi theo (chuyển giao khi
  marketer nghỉ).
- 🔴 **Gắn / gỡ page từ sản phẩm** (`97de3dd`): «+ Gắn page» — chọn page + thị trường; page nhận thị trường, shop POS và
  marketer của sản phẩm (ba thứ trước nay chỉ bộ di trú ghi được). Thị trường chưa có giá thì màn cảnh báo. «Gỡ» khi page chết.
- Cổng nghiệm thu lồng nhau in lại dòng đỏ của cổng con khi trượt (`8f4dc43`).

### 30/09/2026 — Cài đặt theo bản vẽ 4: thứ tự cụm · «Hệ còn sống» có việc vận hành · Kết nối năm phần (VE7a · VE7b · CR-28-09c)

Không đổi chữ bot nói, không migration, không biến, không gói.

- **Cài đặt** (`1c1ab28`): thứ tự Bắt đầu · Hệ còn sống · Kết nối · Model · Người và team · Nhật ký; «Vận hành» rời thanh tab,
  mở từ nút của từng việc.
- **Hệ còn sống không** (`1c1ab28`): khối «Việc vận hành» — tin cần đối chiếu (kèm số tin gửi không rõ kết quả) · tin bị lọc
  24 giờ (kèm số đáng ngờ) · diễn tập; mỗi việc một nút sang đúng tab. Chỉ quản trị · quản lý thấy.
- **Kết nối** (`1c66710`): năm phần Pancake · POS · WhatsApp · HRM · Kéo dữ liệu. POS mỗi shop kèm tiền tệ + số món (suy từ danh
  mục đã kéo; chưa kéo nói «chưa kéo danh mục»); WhatsApp đọc **van thật** của cửa gửi (prod: «Chưa nối»); HRM «Chưa nối vào máy
  chủ» kèm nguồn sẽ đọc; «Kéo dữ liệu» gom bốn việc (thêm kho POS · kéo danh mục · quét Pancake · nạp lại) một chỗ.

### 30/09/2026 — Page gộp nốt: Kịch bản vào trang một page, danh sách vào thẳng (VE2b · CR-28-09c)

Theo lời người quyết 30/09 (hai ảnh). Không đổi chữ bot nói, không đổi lược đồ, không thêm biến, không thêm gói, không mở cửa ghi mới.

- **Tất cả page** (`4455431`): vào thẳng danh sách — bỏ tiêu đề, thanh tab «Tất cả page | Kịch bản», hộp «Chưa bật tắt bot được» (nay
  là một dòng «Công tắc bot đang khoá» ở hàng ô tìm, lý do khi rê chuột) và dòng «N page chưa có người phụ trách»; nút Quét xuống hàng
  ô tìm; nút lọc mới «Chưa có lời bot riêng»; bấm tên page mang bộ lọc sang.
- **Trang một page** (`4455431`): «← Tất cả page» về đúng bộ lọc · ô tìm · trang; cột trái có ô lọc cùng bộ lọc, cùng số với danh
  sách; tab Lời bot có «Nhập từ file Pancake» (chỉ điền ô, không tự lưu); 🔴 tab Lịch sử xem được nội dung từng bản, chép vào ô soạn,
  «Chạy lại bản này» (hỏi trước; đi qua đúng cửa «lưu là chạy» đã có, cùng vai như màn Kịch bản cũ — đổi lời bot nói với khách).
- **Màn Kịch bản gộp hẳn** (`4455431`): `/kich-ban` chuyển theo vai — có page ⇒ tab Lời bot của page đó; không ⇒ danh sách lọc sẵn
  «Chưa có lời bot riêng».
- **Marketer** (`4455431`): mục Page mở bằng «Các page» — danh sách + bộ lọc ở cột trái (thấy mọi page của team: chưa có nguồn page ↔
  người). Không nới quyền: bảng «Tất cả page» vẫn chỉ quản trị · quản lý.

### 30/09/2026 — ba màn Số liệu theo bản vẽ (VE6a · VE6b · VE6c · CR-28-09c)

Dựng lại NỘI DUNG Tổng quan (3a) · Chi phí AI (3b) · Khách (3c). Không đổi chữ bot nói, không đổi lược đồ, không thêm biến, không thêm
gói. Thêm MỘT hàm ĐỌC ở tầng dữ liệu (gom hội thoại theo team). Ô nào chưa có nguồn thì màn nói «chưa có nguồn», không bịa số.

- **Tổng quan** (`1ecb8f9`): bốn ô số (chi phí AI/đơn · tin AI/đơn · đơn hai luồng KHÔNG gộp · BUY NOW: chưa đo được, 37,4% là số cũ) ·
  hai phễu (chặng thiếu nguồn nói ra, không tỉ lệ rơi) · ba thước đơn Messenger giữ đứng dọc · bảng theo page ghép chi phí AI/đơn, xếp
  đắt nhất lên đầu, nêu page tốn tiền 0 đơn · rủi ro hoàn bốn tầng cho quản trị · quản lý.
- **Chi phí AI** (`aecd410`): bốn ô mỗi đơn · mỗi tin (đích BH8 ≤ 50 ₫) · token mỗi lượt · trúng cache (toàn hệ) · ba tab Từng tin (quản
  trị · quản lý) · Theo page (+ tổng của team) · Theo model (nói đúng cái đang có).
- **Khách** (`0405e8b`): tab mới thay «Nguồn khách» + «Rủi ro hoàn» — hội thoại CỦA TEAM theo giai đoạn × người giữ (từ CSDL v3, kèm
  tuổi dữ liệu) · rủi ro hoàn bốn tầng + «Tra một khách» · khách rơi ở đâu. Màn Rủi ro hoàn đủ vẫn mở bằng «Xem đủ →».

### 30/09/2026 — vá ba lỗi «tên chưa khai» sống trên prod (VE-VA1)

Không đổi lời bot, không đổi lược đồ, không thêm biến, không thêm gói. Chỉ hai tệp trang.

- **Số liệu › Tổng quan** (`557fbd9`): từ 25/09 màn chưa hiện số lần nào — lượt tải thành công nào cũng rơi vào ô lỗi «Chưa lấy
  được số từ tiến trình bot» (đổ oan cho bot). Nay hiện ba thước như thiết kế.
- 🔴 **Cài đặt › Người và team** (`557fbd9`): tạo người dùng xong hết báo «nap is not defined», danh sách tải lại (từ 15/09 người
  dùng vẫn được tạo nhưng màn báo lỗi). Nút **«Chuyển page đã chọn» / «Kéo page đã chọn về» gửi được** — từ 17/09 nút ném lỗi trước
  khi gửi, chưa lượt chuyển page nào qua được màn.

### 30/09/2026 — Hộp thư và Tìm khách theo bản vẽ (VE5 · VE5b · CR-28-09c)

Dựng lại NỘI DUNG Hộp thư (1a) và Tìm khách (1b). Không đổi chữ bot nói, không đổi lược đồ, không thêm biến, không thêm gói.

- **Hộp thư** (`3ceceeb`): ba tab «Cần bạn · Đơn chờ · Bot đang xử» — «Cần bạn» gồm cả đơn chờ duyệt (một hàng như hội thoại);
  «Tất cả» thành lối «Mọi hội thoại gần đây». 🔴 **Thẻ đơn ra cột giữa**, dưới tin nhắn: Hàng · Tiền · Giao tới · cảnh báo hoàn ·
  nghi trùng; ba nút Duyệt → Chờ in · Sửa đơn · Từ chối mở ĐÚNG form duyệt cũ (luật duyệt không đổi: ô «đã kiểm tra», lưu trước,
  phiên bản). Van tạo đơn POS đóng (như prod) ⇒ thẻ nói trước và khoá nút duyệt. Nhận/đóng việc xuống thanh cuối (menu mở
  lên) — trên máy tính bảng không còn khuất trong ngăn phủ. Cột phải: Khách · Bot đã làm gì · Page này bán gì.
- **Tìm khách** (`f9ecbe2`, đường giữ `/ho-so-khach`): tra theo số ⇒ hồ sơ gộp kênh (Messenger · Trang bán hàng (Ladi) ·
  WhatsApp «chưa nối») + mọi đơn cả hai luồng; mở thẳng hội thoại trong Hộp thư. 🔴 **Quyền: trang mở thêm cho sale** (§10 bổ
  sung — Hộp thư gồm tìm khách); cửa danh sách cũ (cả bảng khách) GIỮ quản trị · quản lý; ô tìm trống ⇒ tổng quan cũ cho quản
  trị · quản lý. Không vai nào mất việc. Cột «Hàng» nói thật: dữ liệu đơn chưa lưu món.

### 29/09/2026 — màn thôi hứa «bot dùng ngay» khi bot chưa đọc (VE1b · VE4b · CR-28-09c)

Đo prod: bot đang trả lời khách còn ghép lời bản cũ (`V3_RAP_PROMPT_BAT` vắng) — KHÔNG đọc kiến thức sản phẩm (tab
Chung) và quy tắc chung. Hai màn từng nói ngược lại. Không đổi lời bot, không đổi lược đồ, không thêm biến.

- **Sản phẩm › Chung** (`b0b32b2`): nút chỉ còn «Lưu» + cảnh báo «Bot CHƯA đọc phần kiến thức này»; câu báo sau lưu nói
  đúng. «Thêm sản phẩm» có một câu nói nó để làm gì.
- **Luật chung › Luật** (`4b64551`): cảnh báo đầu trang; hộp xác nhận «Áp» và câu báo sau áp thôi hứa «có hiệu lực ngay»;
  bảng trống thôi báo đỏ «bot chạy không có quy tắc cứng» (sai — bot luôn có khối quy tắc gốc cố định).
- Mọi câu theo MỘT công tắc đo được: bật cách ghép lời mới là màn tự nói «dùng ngay», không phải sửa lại.

### 29/09/2026 — danh sách page và Luật chung theo bản vẽ (VE3 · VE4 · CR-28-09c)

Tiếp lượt VE1+VE2: dựng lại NỘI DUNG hai màn nữa theo bản vẽ. Không đổi chữ bot nói, không đổi lược đồ, không thêm biến,
không thêm gói.

- **Danh sách page** (`05dcc72`): viên «Lọc nhanh» có số đếm thay ô chọn · nút «Quét» ở đầu trang · chọn nhiều page rồi
  gắn sản phẩm hoặc 🔴 **bật bot hàng loạt** (tối đa 10 page một lượt, hộp xác nhận liệt kê tên, gặp lỗi đầu tiên thì dừng
  và nói page nào đã đổi) — đi lần lượt qua ĐÚNG cửa ghi từng page đã có, không cửa ghi hàng loạt mới.
- **Luật chung** (`083c9de`): bốn tab Luật · Chính sách/FAQ/Phản đối · Trả lời sẵn · Đề xuất chờ duyệt.
  🔴 **Chính sách · FAQ · Phản đối** có màn riêng — MỘT chỗ sửa ba khối bot trích ở MỌI page (trước ở trang một page);
  lưu phải xác nhận, gửi kèm phiên bản chống đè, cùng cửa ghi cũ (lưu → đẩy bot → đọc lại → nhật ký). Team không giữ bộ
  khối của bot thì ô bị khoá và nói lý do. «Đề xuất chờ duyệt» thôi thử nghiệm (chưa có đề xuất thì nói chưa có).
  Trang một page › Lời bot chỉ còn tóm tắt + lối sang. Menu marketer: dòng hai «Câu trả lời sẵn» → «Chính sách · FAQ ·
  Phản đối» (màn đầu marketer mở được trong cụm).

### 29/09/2026 — màn Sản phẩm và trang một page theo bản vẽ (VE1 · VE2 · CR-28-09c)

Người dùng: «Sao mới thấy thay đổi phần khung, còn chi tiết không giống artifact?». Lượt này dựng lại NỘI DUNG hai màn
theo bản vẽ. Không đổi chữ bot nói, không đổi lược đồ, không thêm biến, không thêm gói.

- **Sản phẩm** (`86d7aa6`): danh sách sản phẩm của team bên trái (tìm · «+ Thêm»); một sản phẩm bên phải với dải bốn
  tầng bot ghép lời và bốn tab — Chung (kiến thức, «hỏi size») · Theo thị trường (mỗi shop POS một thị trường: món, tồn,
  «Giá ở …» gom từ bậc giá các page đang bán, lệch giá giữa page được nói ra; «Thêm thị trường» ba bước) · Page đang bán
  · Lịch sử (ai sửa gì, từ nhật ký). Bảng bản sao theo page, số hiệu chờ đặt tên, tạo/bỏ sản phẩm vẫn còn.
- **Trang một page** (`bada2f4`): ba cột — danh sách page của team (bot bật lấy từ tiến trình bot) · một page với công
  tắc ở đầu, «Bật được chưa» và bảy tab (Sản phẩm & giá · Lời bot · Ảnh · Trả lời sẵn · Kỹ thuật · Gợi ý cải thiện ·
  Lịch sử) · cột «Thử hỏi bot» và «AI đang đọc gì». Mọi nút sửa/lưu cũ giữ nguyên, chỉ đổi chỗ đứng; đường dẫn `?tab=` cũ
  vẫn mở đúng chỗ.
- Nút «Xem câu trả lời sẵn» ở trang page thôi dẫn tới trang không có (404).
- Chỗ CHƯA có nguồn nói rõ «chưa có», không bịa: marketer theo thị trường (chờ HRM), ảnh chung của sản phẩm, thử hỏi bot.

Quy trình mở van: `docs/thi-cong/nhat-ky/phat-hanh-20260929-ve1-ve2.md`.

### 29/09/2026 — khung theo bản vẽ, menu không còn nháy, tải nhanh hơn (LL18 · CR-28-09c)

Người dùng báo ngay sau lượt «năm đích»: tải chậm, bấm menu thì menu biến mất rồi mới hiện lại, giao diện
không giống bản vẽ. Lượt này không đổi chữ nào bot nói, không đổi lược đồ, không thêm biến, không thêm gói.

- **Menu có ngay khi trang hiện** (`31212d9`): máy chủ vẽ sẵn menu vào trang, thôi chờ trình duyệt hỏi thêm
  một lượt rồi mới dựng. Trang không còn bị đẩy sang phải khi menu chèn vào.
- **Giao diện theo bản vẽ**: thanh ngang trên cùng — AI Closer · team · Hộp thư · Sản phẩm · Page · Số liệu ·
  Cài đặt · trạng thái bot · tài khoản — và dải «Trong mục …» ngay dưới. Bỏ thanh bên tối. Nền kem, màu chính
  xanh ngọc đậm, góc bo mềm hơn, nhãn trạng thái tròn.
- **Tải nhanh hơn**: tệp giao diện gửi đi đã nén (tệp kiểu 110 KB → 26 KB, đo `gzip -6`) và trình duyệt giữ lại theo phiên
  bản — bấm sang màn khác không phải tải lại. Phông chữ không còn chặn lần hiện đầu.
- **Mở địa chỉ gốc thì về đúng màn của mình** — marketer trước đây gặp trang «không có quyền».
- **Không còn ngõ cụt «không có quyền»**: trang báo thiếu quyền dẫn về màn đầu của bạn (trước: về bảng điều phối
  — với marketer lại là một trang không có quyền nữa). Nút/liên kết sang màn bạn không mở được thì hiện mờ, ghi
  «nhờ quản trị» thay vì bấm vào là lỗi. Trang thiếu quyền của bảng điều phối thôi in thô thẻ `<b>`.

Quy trình mở van: `docs/thi-cong/nhat-ky/phat-hanh-20260929-khung-ban-ve.md`.

### 29/09/2026 — năm đích: Hộp thư · Sản phẩm · Page · Số liệu · Cài đặt (CR-28-09c)

Lượt này không đổi chữ nào bot cũ nói với khách, không đổi lược đồ (vẫn 27 bản), không thêm biến
môi trường. Van gửi tin và van tạo đơn POS trên prod vẫn đóng (`PANCAKE_READONLY=1`, `V3_POS_GHI=0`).

- **Menu còn năm đích** (`ee6ad06`): Hộp thư · Sản phẩm · Page · Số liệu · Cài đặt, thay cho menu dài
  cũ. Sale mở ra là vào thẳng Hộp thư.
- 🔴 **Hộp thư — sale duyệt đơn Messenger ngay cạnh chat** (`1073c44`): tab «Đơn chờ», sửa · duyệt ·
  loại đơn ở cột bên phải, nút «Nhận thay bot», gõ số điện thoại ra hồ sơ khách mọi kênh. Trước đây
  chỉ quản trị duyệt được, ở màn khác. Duyệt vẫn đi qua ĐÚNG cửa cũ (cùng một hàm tạo đơn POS,
  cùng van `V3_POS_GHI`). Quyền mới cho vai sale.
- **Page: «Tất cả page» + «Luật chung»**, các màn còn lại thành tab dưới đầu trang (`cb622a6`).
- **Số liệu một dòng tab** (`cb932da`): Báo cáo · Chi phí · Nguồn khách · Rủi ro hoàn. Nguồn khách và
  Rủi ro hoàn thôi ẩn, và nói rõ số tính tới ngày nào.
- **Cài đặt một dòng tab** (`4cefa72`, `1e5ce30`): màn Model nói đúng điều máy làm (vai nào có đường
  dùng thật); «Hội thoại và đơn» thành Cài đặt › Vận hành; Hệ còn sống · Chi phí AI · trang page trỏ
  thẳng vào đúng việc.
- **Sản phẩm là lõi** (`e771443`): sản phẩm → thị trường (shop POS) → món → page; gắn/gỡ món POS
  vào sản phẩm, một món chỉ thuộc một sản phẩm.
- 🔴 **«Hỏi size» thành ô kiến thức của sản phẩm** (`54f4969`): lần đầu sửa được kiến thức sản phẩm
  trên màn (quản trị · marketer); phần này vào lời dặn của bot v3 khi bot v3 được bật. Màn Kỹ năng
  chuyển sang thử nghiệm.
- 🔴 **Ba vai** (`7e3b946`): Quản trị · Marketer · Sale. «Quản lý» và «Người duyệt kịch bản» thôi cấp
  mới; dòng cũ vẫn đọc được (prod 29/09: 0 dòng mang hai vai đó).

Quy trình mở van: `docs/thi-cong/nhat-ky/phat-hanh-20260929-nam-dich.md`.

### 28/09/2026 — một nguồn cho sản phẩm · giá · ảnh · kịch bản: sửa ở đâu, bot chạy đúng thế (CR-28-09b) · ĐÃ LÊN PROD `b41261e`

Trước lượt này bot bán theo một tệp mà không màn nào sửa được, còn màn v3 sửa vào một chỗ bot
không đọc. Nay cơ sở dữ liệu v3 là chỗ ghi DUY NHẤT; mỗi lượt lưu hoặc tới bot ngay, hoặc báo lỗi.

- **Trang của mỗi page có tab «Bot trả lời thế nào»** (`b0b1282`): quy tắc chung → kịch bản riêng
  → sản phẩm, giá, ảnh, xếp đúng thứ tự AI đọc; kèm câu trả lời sẵn và đoạn chữ thật gửi AI.
- 🔴 **Kịch bản lưu là chạy** (`b0b1282`): bỏ bước «lưu nháp → người khác đưa lên chạy», đúng quyết
  định §9 đã ký. Bot không nhận thì màn nói «CHƯA chạy» và giữ chữ vừa gõ.
- 🔴 **Sửa sản phẩm, tên bậc giá, ảnh ngay trong tab** (`0bd772a`, `9e175ec`): lưu là bot nhận trong
  cùng lượt, đọc lại để chắc; hỏng thì không lưu. Tên bậc giá khách đọc («Buy 1 Get 1 FREE…»)
  và nhãn ảnh giữ nguyên văn. Ảnh tải lên, dán link, đổi nhãn, xếp, bỏ.
- **Ba màn Sản phẩm & kho · Ảnh gửi khách · Đưa lên chạy đọc cơ sở dữ liệu** (`9e175ec`).
- **Sheet chỉ còn là danh bạ page** — cờ `V3_SHEET_CHI_DANH_BA` (`66cbc7c`): bot thôi lấy sản phẩm và
  ba khối dùng chung từ Sheet (ba khối nay đọc từ v3, nội dung giữ nguyên).
- **43 ảnh đang chết sống lại** khi đổi `PUBLIC_URL` sang cổng 3102 và đẩy lại bản chép (`66cbc7c`).
- Lược đồ **025** chỉ THÊM (`b8d6a0f`): bảng ảnh, tên bậc giá, phân loại. Nạp một lượt 77 page từ
  `kb-overrides.json`, chứng minh khứ hồi 77/77 trước khi ghi (`f28df74`).
- Bot cũ thôi báo «đã lưu» khi ghi đĩa hỏng (`0bd772a`).
- **Marketer sửa được sản phẩm, giá, ảnh** trên trang page (`7126689`); năm ô «trả lời nhanh» gập lại;
  nhãn ảnh chọn từ danh sách; thao tác ảnh/sản phẩm không còn làm mất chữ đang gõ dở ở kịch bản.
- 🔴 **Chính sách · FAQ · Xử lý phản đối sửa trên trang page** (`c0b829f`, `2353f5b`) — chuyển khỏi
  Google Sheet, đoạn chữ bot ghép giữ nguyên từng ký tự (984). Chỉ team đang giữ bot được sửa.
- **Nối sản phẩm với món trong kho POS** (`b41261e`): hết hàng tự theo tồn kho POS mỗi lần kéo danh
  mục; nút «Dùng tên POS» (bỏ số hiệu nội bộ). Lượt kéo đầu tiên: 69 món Kuwait.
- Nút «Xem đoạn chữ gửi AI» mở đúng page (`280459f`).

Quy trình mở van: `docs/thi-cong/nhat-ky/phat-hanh-20260928-mot-nguon.md`.

### 28/09/2026 — giao diện v3 thôi nói ngược nhau, đọc được trên điện thoại

Lượt này không đổi một chữ nào bot nói với khách, không đụng bot cũ, không đổi lược đồ.
Nó sửa 13 lỗi mà lượt soát giao diện (ui-taste) bắt được trên 16 màn.

- **Các màn thôi cãi nhau** (`f6ba07b`): số page đang bật bot giờ cùng một con số ở mọi
  màn (hỏi thẳng bot, không đếm bản sao trong CSDL); «Người và team» thôi nói «chưa chọn
  model thì bot không trả lời được» — bot chạy bằng model mặc định; «Cài đặt team» đếm
  người chứ không đếm dòng cấp vai; «Chín đèn» đếm theo số đèn thật.
- **Thôi lộ mã máy lên màn** (`08d0c5c`): góc tài khoản hiện tên team; lý do lạ, tên kỹ
  năng, tên bảng hiện bằng tiếng người; «Ai đã sửa gì» hiện email người làm và tách đúng
  việc máy khỏi việc người; hộp lỗi Báo cáo/Chi phí nói một lần; Model AI gộp 11 chỗ đỏ
  thành một hộp có nút «Dán khoá».
- **Điện thoại** (`7ed6dc6`, `9032a51`): bấm một việc thì cuộn tới «Xem nhanh»; bảng page
  thành thẻ; nút × rút vai to hơn; hết vệt bóng mép trái; khoảng cách các khu đều lại.
- **Nhật ký ghi đúng dạng** (`53ac05f`): dòng mới ghi `nguoi:<email>` / `may:<việc>` như
  lược đồ và mọi bộ ghi khác. Dòng cũ vẫn hiện đúng.

### 15/09/2026 — bốn chỗ trước nay phải mở `psql` mới sửa được

Lượt này không đổi một chữ nào bot nói với khách. Nó mở bốn cửa mà người vận hành trước
nay phải SSH vào máy chủ rồi gõ SQL tay mới làm được.

- 🔴 **Kết nối POS sửa được trên màn** (`73c5d16`): thêm một thị trường, đổi khoá API của
  một shop, tắt tạm một shop — trước nay chỉ làm được bằng `psql`, và **không để lại dấu
  vết nào**. Nay có bốn nút ở màn «Kết nối & token», mỗi lượt đổi ghi một dòng nhật ký nói
  ai đổi cái gì (có nói **có đổi khoá hay không**, nhưng không bao giờ ghi khoá). Khoá API
  chỉ đi một chiều: gõ vào được, không màn nào đọc lại được.
  Ngừng dùng một shop thì **TẮT**, đừng bỏ — tắt là cửa POS của thị trường ấy đóng ngay mà
  khoá vẫn còn để bật lại; bỏ là mất khoá, phải đi xin lại.
  ⚠️ Màn **không** gọi thử sang POS, nên khoá gõ sai chỉ lộ ở lượt tạo đơn đầu tiên của thị
  trường đó. Màn nói thẳng điều này ngay dưới bảng.
- **Thị trường và ngành hàng của page điền được** (`0c35188`): trước nay hai ô này chỉ nhận
  giá trị từ `pages.json`, mà `pages.json` chỉ có thị trường cho **140/514 page** — 374 page
  còn lại không ai điền được. Nay điền ngay trên màn «Page & bot».
  Kèm một bản vá **quan trọng hơn cái nút**: lượt «Kéo dữ liệu về» trước đây **ghi đè** hai ô
  này, nên nếu mở nút mà không vá thì mỗi lượt kéo dữ liệu sẽ xoá sạch công người nhập, im
  lặng. Nay nguồn chỉ **điền vào chỗ trống**, không bao giờ xoá chỗ đã có — cùng luật đã áp
  cho ô Marketer từ 25/08. Đổi lại: nguồn không sửa được một thị trường đã có giá trị, muốn
  đổi thì đổi trên màn.
- **Đánh dấu «page này đã tắt Botcake»** (`0c35188`): một ô tick để ghi nhận, phục vụ việc
  chọn page thử. ⚠️ Đây là **lời khai, không phải công tắc** — bấm vào đây KHÔNG tắt Botcake;
  việc tắt vẫn làm bằng tay trong giao diện Botcake.
- 🔴 **Tạo người dùng mới ngay trên màn «Cấu hình team»** (`5328911`): trước nay màn cấp vai
  được nhưng chỉ cấp cho người **đã có tài khoản**, mà không có đường nào tạo một tài khoản
  ngoài `psql`. Nay tạo tài khoản và cấp vai trong một lượt. Bắt buộc đặt mật khẩu (từ 8 ký
  tự) vì hệ **chưa có màn đặt lại mật khẩu** — tài khoản không mật khẩu là tài khoản không ai
  đăng nhập được và không ai sửa được. Mật khẩu lưu dạng băm; nhật ký ghi ai tạo tài khoản
  nào, không bao giờ ghi mật khẩu.
- **Ô Marketer trên màn «Page & bot» chuyển thành chỉ đọc** (`5328911`): cột và bản tin «page
  chưa chạy được bot» cắt theo marketer vẫn giữ nguyên; giá trị nay tới từ `pages.json` qua
  lượt «Kéo dữ liệu về».
- **Giấy tờ vận hành khớp lại với máy** (`dc746d8`, `277ba77`): bảng khai biến môi trường
  thiếu 11 biến, trong đó có biến mà **thiếu nó thì dịch vụ v3 không khởi động được** —
  người cutover trước đây không có dòng giấy nào để tra. Nay khai đủ, và có bài kiểm tự động
  canh cả hai chiều để giấy không trôi khỏi mã lần nữa.

### 14/09/2026 — giao diện v3 viết lại trên một hệ kiểu chung

- **Hai lỗi làm chết màn, sửa** (`ad6cf46`): khối «Đánh dấu đã xử» không hiện ở hai màn điều
  phối, nên sale không đóng được việc nào từ v3; và màn «Chi tiết việc cần xử» (`/viec/:id`)
  chết trắng chỉ còn một dòng đỏ, sống như vậy từ 11/09. Cả hai bắt được bằng ảnh chụp thật.
- **25/25 màn dùng chung một hệ kiểu** (`2fca1bb` → `268f2eb`): không màn nào còn CSS riêng
  (1.468 dòng → 0), trạng thái đi qua một bảng ánh xạ duy nhất, thao tác chạm khách thật có
  hộp xác nhận nói rõ hệ quả thay `confirm()` gốc.
- **«Chưa đo được» thôi đội lốt «đạt»**: ô chưa biết hiện «—» hoặc huy hiệu xám kèm lý do,
  không bao giờ hiện 0 hay tô xanh — áp cho chi phí, báo cáo, tồn kho, hạn token, phễu khách.
- **Câu chữ nói việc cần làm**: cảnh báo mở đầu bằng lời người dùng, tên biến kỹ thuật
  (`ADMIN_USER`…) xuống dòng chi tiết nhỏ hơn.
- Gỡ cầu di trú 20 token màu tên cũ (`036c286`); vá câu đo bộ ca của 4 cổng nghiệm thu vốn
  đếm theo dạng TAP trong khi Node 24 in dạng SPEC.

> **Chưa có phiên bản nào được phát hành.** 398 commit (27/06/2026 → 01/09/2026), **0 tag**.
> Toàn bộ phần dưới đang nằm trên `main` mà chưa được niêm phong thành bản nào.
> Nội dung dựng lại từ §10 sổ điều hành + git log, mốc 01/09/2026.

### Nền v3 — chưa chạm khách

- **12/12 module trục chính xong** (L0-M1 → L3-M4): nền dữ liệu + tầng truy vấn theo team ·
  ba cửa kết nối (POS · Messenger · WhatsApp) · hàng đợi và luồng chat · hai luồng đơn với máy
  trạng thái, lọc trùng chéo, hàng chờ tạo đơn.
- **CSDL PostgreSQL**: 13 bản migration, thay cho 15 tệp JSON của bản đang chạy. Dữ liệu thật
  đã di trú (page · hội thoại · khách · đơn).
- **Tiến trình worker v3** lần đầu chạy được luồng chat đầu-cuối — `npm run worker-v3` (`a4232ab`).
- **Thiết kế 37 màn gom thành 7 mục** theo nhịp làm việc, có thanh tab từng mục (`791a427` ·
  `2be7d20` · `b08a319`).

### Sửa đường tiền 🔴

- **Màn «Rủi ro hoàn hàng» nói sai 6,7 lần** — đọc thẳng cột `khach.tang_hoan` đã chấm thay vì
  tự tính; bỏ mã hoàn 8 (`packing` vốn là bước TIẾN), thêm sàn 2 đơn đã kết. Trước sửa màn nói
  40.064 khách «hoàn cao», luật đã ký nói 5.990 (`470b590`).
- **Báo cáo hai luồng** dùng cửa `baoCaoHaiLuong` của trục chính thay vì đếm `don_hang` lần
  thứ hai (`5f9a581`).
- **Tạo đơn idempotent + đơn vị tiền** — chống tạo trùng khi thử lại (sóng vá VA-R2, `5caf5be`).
- **Bộ não cũ hết bắn HTTP thật khi cửa đóng** — bẫy ở `globalThis.fetch`, không tin danh sách
  import (sóng vá VA-R1, `1562d58`).

### Bộ luật AI

- **Bộ luật chung trong CSDL thật sự thay được hằng `CORE`** (`1d5e61c`) — mở đường sửa cách bot
  nói mà không cần deploy. ⚠️ Bản v1 trong bảng `bo_luat_chung` **bằng `CORE` từng ký tự**, nên
  chưa đổi chữ nào bot đang nói. Cờ `V3_RAP_PROMPT_BAT` mới bật ở máy dev; **VPS chưa bật**.
- Giới hạn thật của cờ đó đã ghi vào bảng biến (`4894ce8`) — bốn khối CSDL là **bổ sung**, chưa
  thay được `CORE` đứng đầu prompt.

### Thước đo

- **25/25 cổng nghiệm thu rc=0 · 923 ca test, 0 đỏ** (01/09).
- **Tám cổng đỏ đóng hết — không cổng nào đỏ vì mã** (`a37c1f4` · `1b29f11`): năm kiểu thước tự
  già đi (neo số tuyệt đối · neo lịch · trần vòng lặp gõ cứng · câu đo tự ném · thước chạy trên
  CSDL thật rồi suýt mất dữ liệu). Bài học đã chưng vào skill `viet-thuoc`.

### Còn treo, chưa đóng được ở bản này

- **Chưa bật `V3_RAP_PROMPT_BAT` trên VPS** `169.58.33.8` — chờ người.
- **H6**: tài khoản nhà model hết tiền · **H7**: 514/514 page còn ở `chua-phan` nên bảng điều
  phối rỗng — hai việc người, chặn nhánh màn hình v3 (§8 sổ điều hành).
- Nợ mức NÊN chưa đóng: xem §9 sổ điều hành.

---

## Trước đó — bản đang chạy (v1), chưa từng đánh số

Bot Messenger + Pancake phục vụ khách thật từ 27/06/2026: phân loại tin bằng bộ luật (0 token) →
tư vấn và chốt đơn có tool use → lọc đơn COD → tạo đơn Pancake. Lịch sử thiết kế và số đo thật
nằm ở `docs/v2/`; cách vận hành ở `docs/TONG-QUAN-HE-THONG.md`.
