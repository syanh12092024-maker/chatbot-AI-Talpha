# KẾ HOẠCH GIAO DIỆN — dễ cài, dễ theo dõi, dễ kiểm soát

> Lập 22/09/2026 · **ĐỀ XUẤT, chờ người quyết** (mục 8).
> Đo trên bản dev local `127.0.0.1:3202` (team 1 · 4 page · 235 sản phẩm · vai quản trị),
> chụp đủ 26 màn bằng Brave headless, và đọc code ở HEAD `057f262` cùng cây chưa commit.
> Chỗ nào chỉ **đọc code, chưa chạy thử** thì ghi rõ là «đọc code». «Ảnh chụp» là ảnh 22/09 trên bản
> dev, không lưu vào repo; chạy lại script ở mục 1a là chụp lại được.

---

## ✅ Đã làm — GD0, ngày 23/09

| Việc | Kết quả |
|---|---|
| ① Màn «Vận hành chat V3» trắng | **Sửa xong.** Bốn dòng gắn tay `#close` `#reload` `#prev` `#next` là tàn dư của bản trước 17/09 — nay nút Đóng do `modal()` dựng, phân trang do `vePhanTrang()` dựng. Gỡ bốn dòng. Màn đo lại: 3.334 chữ · 9 thao tác (trước: 2 chữ, 0 thao tác) |
| ② Nút «Bật bot» ở màn Bắt đầu gửi nhầm mã | **Sửa xong.** `kho-bat-dau.js` trả thêm `id` (khoá dòng CSDL) bên cạnh `pageId` (mã Facebook); trang gọi cửa bằng `p.id`. Ca mới `v3/test/b/bat-dau.test.mjs` khoá cả hai vế |
| ③ Đăng nhập xong vào màn không có quyền | **Sửa xong.** `taoRouterAuth` nhận hàm `(vai) => đường`; `vai-b.js` đưa vào màn đầu tiên trên menu của chính vai đó (`menuCua`). Hàm ném thì rơi về `/dieu-phoi` như cũ. Ca mới trong `auth-router.test.mjs` |
| ⑤ Cổng canh «mở mọi màn không lỗi JS» | **Có rồi:** `ops/bin/do-giao-dien.mjs`. Mở lần lượt mọi màn trong menu bằng Brave headless, đỏ khi có `pageerror` hoặc cửa 5xx, và in luôn bảng thước của mục 6. Mã thoát 0 xanh · 1 có màn vỡ · 2 chưa đo được |
| Bộ ca | `npm test`: **1947 xanh / 6 đỏ**. Sáu ca đỏ nằm ở nhóm chat/đơn của các phiên khác (D7 đã đỏ từ 16/09), không ca nào chạm bốn tệp lượt này sửa. Ca HK7 phải sửa vì nó đang neo đúng con bọ ②: nó đòi trang gửi `p.pageId` |
| ④ Chữ đã cũ | **Chưa làm** — dồn vào GD4 (lượt lời lẽ) để không sửa chữ hai lần |

Ca HK7 là bài học đáng ghi: một ca canh viết theo mã đang có, chứ không theo hợp đồng của
cửa, sẽ khoá con bọ lại thay vì bắt nó.

---

## 0. Tóm tắt

Người dùng than giao diện «khó cài đặt, khó theo dõi, khó kiểm soát». Đo lại thì thấy nguyên nhân
**không nằm ở màu sắc hay menu**. Hệ kiểu đã phủ 26/26 màn. Menu đã xếp lại bốn lần trong hai
tuần (01/09 sáu mục → 11/09 bốn mục → 14/09 năm mục → thêm «Vận hành chat V3» 17/09) mà người
dùng vẫn nói y như cũ. Bệnh nằm ở bốn chỗ:

1. **Không có một lối cài đặt nào.** Muốn một page chạy được bot phải đi 11 bước qua 7 màn,
   thuộc 3 nhóm menu khác nhau. Thêm 3 việc phải làm ngoài giao diện: sửa `.env` rồi khởi động
   lại, tạo thẻ hội thoại trên Pancake, tắt Botcake. Không màn nào dẫn người dùng đi hết từ đầu
   tới cuối.
2. **Màn viết cho người làm ra hệ, không viết cho người vận hành.** Trên 26 màn có 6.790 chữ
   diễn giải (chưa kể chữ trong bảng dữ liệu), 32 hộp cảnh báo, 71 chỗ lộ tên bảng, tên tệp,
   biến môi trường hay mã phiếu. Phần lớn cảnh báo
   giải thích «vì sao con số này chưa tin được», chứ không nói người dùng phải làm gì.
3. **Một câu hỏi, nhiều nguồn trả lời.** Riêng câu «page này bot có đang chạy không» có 5 chỗ trả
   lời, 5 nút bật bot trên hai giao diện với 4 kiểu chốt chặn khác nhau, và 3 cách đếm cho ra 3 con
   số khác nhau.
4. **Thiếu cửa ghi.** Nhiều việc không có chỗ nào trên màn để làm, nên màn chỉ còn cách giải thích
   vì sao không làm được. Ví dụ: `page.pos_shop_id`, gán marketer, thẻ hội thoại, chặng 2 của
   «Đưa sản phẩm lên chạy».

**Hướng đi:** chuyển từ «26 màn xếp theo bảng dữ liệu» sang **ba luồng xếp theo việc**:
**Cài đặt** (làm một lần), **Hôm nay** (theo dõi và can thiệp), **Dạy bot** (sửa cách bot nói).
Đường dẫn cũ giữ nguyên, không xoá màn nào, chỉ gộp lại và đổi chỗ đứng. Làm theo thứ tự:
**sửa chỗ vỡ → mỗi câu hỏi một nguồn → luồng cài đặt → lời lẽ → kiểm soát → menu**. Menu làm
**cuối cùng**, vì menu chỉ phản ánh luồng; sắp menu trước là lặp lại bốn lần vừa rồi.

---

## 1. Hiện trạng đo được

### 1a. Số đo trên 26 màn (quản trị, bản dev)

Cách đo: `ops/bin/do-giao-dien.mjs` — Brave headless đăng nhập, mở từng màn trong
`/api/dieu-huong`, chờ tải xong rồi đếm trong `<main>`. **Chữ** là toàn bộ chữ đang hiện;
**diễn giải** là chữ còn lại sau khi bỏ bảng và danh sách dữ liệu — tức phần người vận hành
phải ĐỌC (235 tên sản phẩm trong một bảng không phải lỗi giao diện).

Số dưới đây đo **sau GD0** (23/09). Trước GD0, «Vận hành chat V3» chỉ ra 2 chữ vì màn vỡ.

| Nhóm | Màn | Chữ | Diễn giải | Cảnh báo | Mã kỹ thuật | Thao tác |
|---|---|---:|---:|---:|---:|---:|
| Tổng quan | Việc của tôi | 313 | 314 | 0 | 3 | 0 |
| | Hệ còn sống không | 291 | 291 | 1 | 1 | 0 |
| Vận hành | Vận hành chat V3 | 3.334 | 34 | 0 | 0 | 9 |
| | Việc đang chờ | 134 | 60 | 0 | 0 | 0 |
| | Khách hàng | 137 | 138 | 0 | 4 | 1 |
| AI Bot | Bắt đầu | 137 | 112 | 1 | 0 | 5 |
| | Công tắc từng page | 369 | 111 | 2 | 1 | 27 |
| | Page còn thiếu gì | 321 | 75 | 0 | 7 | 6 |
| | Kịch bản của page | 155 | 155 | 3 | 1 | 6 |
| | Quy tắc chung mọi page | 205 | 178 | 2 | 2 | 4 |
| | Câu trả lời sẵn | 186 | 186 | 0 | 0 | 2 |
| | Kỹ năng theo sản phẩm | 1.276 | **1.276** | 1 | 1 | 236 |
| | Đoạn chữ gửi cho AI | 3.336 | 314 | **5** | 4 | 2 |
| | Ảnh gửi khách | 193 | 193 | 1 | 0 | 0 |
| | Gợi ý từ AI | 273 | 275 | 1 | 6 | 3 |
| | So hai bản kịch bản | 126 | 126 | 0 | 0 | 0 |
| Phân tích | Chi phí AI | 201 | 203 | 1 | 2 | 0 |
| | Đơn và tỉ lệ chốt | 281 | 282 | 1 | 4 | 0 |
| | Khách vào từ đâu | 323 | 324 | 2 | 3 | 0 |
| | Rủi ro hoàn hàng | 258 | 261 | 1 | **8** | 0 |
| Quản trị | Người và team | 122 | 95 | 2 | 2 | 23 |
| | Kết nối & token | 440 | 284 | 2 | **11** | 17 |
| | Model AI & khoá | 471 | 262 | 1 | 0 | 14 |
| | Ai đã sửa gì | 428 | 109 | 1 | 3 | 10 |
| | Sản phẩm & kho | 1.071 | **1.027** | 3 | 5 | 127 |
| | Đưa sản phẩm lên chạy | 225 | 105 | 1 | 3 | 1 |
| **Tổng** | **26 màn** | **14.606** | **6.790** | **32** | **71** | |

Chín màn chỉ đọc, không có một nút hay ô nhập nào; trong đó 6 màn đang ở trạng thái «chưa có
dữ liệu» hoặc «chưa khả dụng»: So hai bản kịch bản, Rủi ro hoàn hàng, Khách vào từ đâu, Ảnh
gửi khách, Đưa sản phẩm lên chạy, và phần so với Botcake của Câu trả lời sẵn.

### 1b. Khó cài đặt

| # | Chuyện | Neo |
|---|---|---|
| C1 | Đường ngắn nhất để một page lên chạy là 11 bước qua 7 màn: Người và team → Kết nối (token) → Công tắc (quét Pancake) → Người và team (gán page) → Model AI → Kết nối (POS, kéo danh mục) → Sản phẩm & kho (sản phẩm gốc) → Công tắc (gắn sản phẩm gốc) → Vận hành V3 (giá) → Kịch bản (lên LIVE) → bật | đọc code, bảng đầy đủ ở phụ lục A |
| C2 | Có ba việc nằm ngoài giao diện: đưa id page vào `V3_PAGE_XU_LY`, bật cờ gửi rồi khởi động lại; tạo thẻ hội thoại trên Pancake; tắt Botcake bên kia | `src/queue/page-routing.js:1-7` · `san-sang/kho-san-sang.js:51-93` · `page-bot/cong-tac.js:279-286` |
| C3 | Ba màn đếm «page còn thiếu gì» theo ba cách: Bắt đầu nói **4** điều kiện, Page còn thiếu gì nói **7**, Đưa sản phẩm lên chạy nói **6 chặng**. Page v3 lại có một danh sách chặn riêng, viết bằng chữ tự do, và hiện ra ở màn Sẵn sàng thành «mã lạ» không có nút sửa | `bat-dau/kho-bat-dau.js:34` · `src/admin-v3/operations.js:46-67` · `noi-day/van-hanh-v3.js:48-51` |
| C4 | Các màn nói ngược nhau về sản phẩm. Bắt đầu tick ✓ «Sản phẩm và giá» cho Minty. Sản phẩm & kho lại nói «0/4 page có sản phẩm — bot không chào bán được gì». Page còn thiếu gì thì bảo «màn Sản phẩm & kho của v3 chưa dựng», trong khi màn đó có thật | ảnh chụp Sản phẩm & kho · Bắt đầu · Page còn thiếu gì |
| C5 | Sản phẩm sửa được ở 4 nơi (Sản phẩm & kho · Vận hành V3 · Kết nối · Công tắc). Kết nối POS nằm ở 2 nơi (tab của Người và team chỉ đọc, Kết nối & token mới sửa được). Page vào hệ qua 3 cửa (Quét Pancake · Kéo dữ liệu về · Gán page) | đọc code |
| C6 | Có ngõ cụt thật: `page.pos_shop_id` không màn nào sửa được, nên page quét từ Pancake không bao giờ hết «thiếu sản phẩm» nếu chỉ dùng giao diện. Nút «Gán marketer» dẫn sang Công tắc, nhưng ô đó đã khoá từ 15/09. Chặng 2 của «Đưa sản phẩm lên chạy» bị gõ cứng là không bao giờ qua được | `db/di-tru/nap.js:60` · `src/products/catalog.js:8` · `cau-hinh-team.html:117` · `page-bot.html:261` · `kho-len-chay.js:184-191` |
| C7 | Màn bảo người dùng chạy lệnh hoặc sửa biến môi trường: `node ops/bin/goi-y-gop-san-pham.mjs`, «đặt `V3_BOT_V1_GOC`/`ADMIN_USER`/`ADMIN_PASS`», «gỡ `V3_BOT_KHOA`», «Đặt biến môi trường rồi khởi động lại dịch vụ v3» | `cong-tac.js:336` · `kho-san-sang.js:143` · `bat-dau.html:209` · ảnh chụp Hệ còn sống không |
| C8 | Không có màn tạo team, không có đặt lại mật khẩu. Cấu hình WhatsApp, Botcake, Telegram được menu hứa nhưng chưa có | `team/thanh-vien.js:4,195` · `man-hinh.js:172` |

### 1c. Khó theo dõi

| # | Chuyện | Neo |
|---|---|---|
| T1 ✅ | **Màn «Vận hành chat V3» trắng trơn** (sửa ở GD0 23/09). JS gọi `#close`, `#reload`, `#prev`, `#next`, nhưng HTML sau lượt đổi giao diện 17/09 không còn bốn phần tử đó ⇒ `Cannot set properties of null`. Đây là màn duy nhất duyệt được đơn và bàn giao hội thoại v3 | `van-hanh/trang/van-hanh.js:706-712` · `van-hanh.html` · đo pageerror 22/09 |
| T2 | Ghi chú của lập trình viên lộ ra mặt màn: tên bảng (`viec_can_xu_ly`, `san_pham`, `token_pancake`), tệp (`src/prompts.js`, `src/pancake-orders.js#aiOrderStats`), mục tài liệu (`01-QUYET-DINH §1`), mã phiếu (`PHIEU-B-Y5`, `B-Y7`, `L1-M1`), cờ (`V3_RAP_PROMPT_BAT=1`, `PANCAKE_READONLY=1`), đường dẫn máy (`/Users/…/ai-enabled.json`) | ảnh các màn · mục 1a |
| T3 | Cảnh báo nhiều quá nên thành mù cảnh báo. Mỗi màn mở đầu bằng 1–5 hộp cảnh báo, trộn lẫn ba loại: «phải làm ngay», «số này chưa chắc», «tính năng chưa dựng». Người dùng không phân biệt được loại nào | mục 1a |
| T4 | Từ ngữ không thống nhất. Cùng một công tắc mà gọi là «Bot», «Bật bot», «AI bật», «Bật AI», «bot AI», «Page & Bot». Quy tắc chung còn gọi là «Bộ luật chung». Câu trả lời sẵn còn gọi là «lớp 0 đồng». Người và team còn gọi là «Cấu hình team» (ở 7 màn). «v1», «legacy», «tiến trình bot» đều là một thứ. Chữ «V3» chỉ gắn vào một màn, trong khi cả 26 màn đều là v3 | đọc code |
| T5 ✅ | Vào sai màn ngay sau khi đăng nhập (sửa ở GD0 23/09). Ai đăng nhập cũng bị đưa tới `/dieu-phoi`. Menu lại bắt đầu ở «Việc của tôi». Vai quản lý và marketer **không có quyền** vào `/dieu-phoi` (đọc code, chưa chạy thử bằng tài khoản quản lý) | `auth/router.js:115` · `vai-b.js:494` · `dispatch/router.js:48` |
| T6 | Mẫu số lệch nhau. Dải trạng thái ghi «Bot đang chạy **1/1** page», trong khi team có **4** page. Người và team ghi «Đang bật bot 1 — đếm từ bản sao CSDL, số thật ở màn Công tắc» | ảnh chụp Việc của tôi · Người và team |
| T7 | Hai giao diện chạy song song mà không trỏ sang nhau. v1 ở `:3100/admin`, dùng Basic Auth với một tài khoản chung. v3 ở `:3102`, đăng nhập bằng cookie, có vai. Tài liệu cho sale và marketer (`HUONG-DAN-SALE-MKT.md:5`) chỉ nói tới v1. Không tài liệu nào nói giao diện nào là chuẩn | `server.js:53-65` · `admin.html:240-266` |

### 1d. Khó kiểm soát

| # | Chuyện | Neo |
|---|---|---|
| K1 | **Không có nút dừng toàn bộ.** Muốn dừng hết phải sửa `.env` trên VPS rồi khởi động lại. Chỉ tắt được từng page, và không có «tắt tất cả» | đọc code |
| K2 | Có 5 nút bật bot (v3: Công tắc từng page · Vận hành V3 · Bắt đầu; v1: Tổng quan · Ops) với 4 kiểu chốt chặn khác nhau. Công tắc từng page có hộp xác nhận và trần 5 lần bật / 10 phút. Vận hành V3 không có cả hai. Bắt đầu gửi **nhầm mã** (id Facebook thay cho `page.id`) nên bị 404 — ✅ sửa ở GD0 23/09. Công tắc v1 ghi vào `ai-enabled.json`, mà page v3 không đọc tệp đó. Riêng công tắc ở màn Tổng quan của v1 báo «✓ Đã bật AI» cả khi cổng đã chặn | `cong-tac.js:111-172` · `van-hanh.js:386` · `bat-dau.html:198` vs `kho-page.js:311` · `handler-v3.js:312` · `admin.html:220,527` |
| K3 | «Bot có đang chạy không» có 5 chỗ trả lời, và mỗi chỗ có thể sai theo một kiểu. Đếm page v1 là đang chạy dù luồng poll cũ đã tắt. Page v3 «đang bật» nhưng không xét cờ gửi hay chế độ diễn tập. Không chỗ nào kiểm worker có còn sống | `operations.js:72,79` · `deploy/setup.sh:101` |
| K4 | Worker không phát nhịp tim. Đèn «Tiến trình bot» chỉ kiểm biến môi trường. Đèn «Sổ AI» đếm số dòng chứ không xem dòng mới nhất cách đây bao lâu. Worker đứng 13 ngày thì đèn vẫn xanh | `kho-suc-khoe.js:242-251,307-326` |
| K5 | Hội thoại cần người không bao giờ vào «Việc đang chờ». Chỉ đơn hàng mới đẻ ra việc. Bàn giao ở Vận hành V3 cũng không đẻ việc. Trang chủ tự khai «0 việc trong khi 57 hội thoại HANDOFF». Vai sale chỉ thấy đúng màn này, nên không thấy khách nào đang chờ | `may-trang-thai.js:447` · `operations.js:133-156` · ảnh chụp Việc của tôi |
| K6 | Chi phí AI đọc sổ của v1, nên page v3 hiện 0 ₫. Số đúng nằm ở tab «Chi phí theo tin» của Vận hành V3, là màn đang trắng | `van-hanh/router.js:321-324` |
| K7 | Không hoàn tác được sửa giá (gói giá bị xoá rồi chèn lại, nhật ký chỉ ghi tên cột) và không có lịch sử bật/tắt. Nhật ký 500 dòng gần nhất thì 499 dòng là việc máy làm | `operations.js:14-24,215` · ảnh chụp Ai đã sửa gì |
| K8 | v3 không có cảnh báo chủ động: `canhBao` và `ghiSoAi` không được truyền vào lúc khởi động. Chỉ v1 gửi cảnh báo qua WhatsApp | `vai-b.js:316-320` · `health.js:367` |

---

## 2. Chẩn đoán gốc — vì sao bốn lần sắp menu không chữa được

- **G1 · Hai bộ máy lộ ra mặt màn.** Mỗi page chạy hoặc bằng v1 (`src/server.js`, tệp JSON) hoặc
  bằng v3 (Postgres, worker), và điều đó do một biến môi trường quyết định. Màn không nói page nào
  thuộc bộ máy nào, nên cùng một câu hỏi có hai nguồn trả lời, rồi màn phải viết thêm đoạn giải
  thích vì sao hai số lệch nhau. **Phần lớn chữ thừa sinh ra từ đây.**
- **G2 · Màn chia theo bảng dữ liệu, không chia theo việc.** Mỗi bảng (token, page, sản phẩm,
  kịch bản…) có một màn riêng, nên một việc («cho page X chạy») phải đi qua bảy màn.
- **G3 · Luật 8 (khai nguồn số) được làm bằng cách viết nguồn thẳng lên mặt màn.** Luật đúng,
  nhưng chỗ đặt sai. Nguồn số là việc của người kiểm tra, không phải của người vận hành hằng ngày.
- **G4 · Thiếu cửa ghi thì màn giải thích thay.** Việc nào không có cửa ghi thì màn viết một đoạn
  «vì sao chưa làm được», rồi đoạn đó ở lại mãi, kể cả khi đã sai (C4).

Sắp lại menu không đụng tới cả bốn gốc này, nên sau mỗi lần sắp người dùng vẫn nói y như cũ.

---

## 3. Tám luật cho mọi phiếu GD

1. **Một việc, một chỗ làm.** Mỗi thao tác ghi (bật bot, sửa giá, nối POS, gán page…) chỉ làm được
   ở **đúng một** màn. Nơi khác chỉ đặt đường dẫn tới đó.
2. **Mỗi màn trả lời một câu hỏi, và mở đầu bằng «việc tiếp theo».** Nhiều nhất một nút chính.
   Màn rỗng thì phải nói bước kế tiếp là gì, không dừng ở câu «chưa có dữ liệu».
3. **Dùng lời của người vận hành.** Mặt màn không có tên bảng, tên tệp, biến môi trường, mã phiếu
   hay mục tài liệu. Nguồn số theo luật 8 **vẫn giữ đủ**, nhưng dời vào ô «ⓘ Nguồn số» gập sẵn cạnh
   con số (thành phần mới của `ui.js`). Làm vậy vừa giữ được luật vừa sạch mặt màn.
4. **Đầu màn tối đa một hộp cảnh báo, và chỉ khi có việc phải làm.** Chuyện «số này chưa chắc» viết
   thành chú thích nhỏ cạnh con số. Chuyện «tính năng chưa dựng» không hiện trên màn.
5. **Việc ngoài hệ là một bước có hướng dẫn, không phải một đoạn văn.** Tạo thẻ Pancake, tắt
   Botcake, sửa Sheet… mỗi việc thành một thẻ gồm các bước làm, nút mở đúng trang bên ngoài, và nút
   «Kiểm lại».
6. **Page luôn ghi rõ nó đang chạy bằng bộ máy nào**, ngay cạnh mọi công tắc và mọi danh sách
   điều kiện. Nhãn cho người dùng: «Bot cũ» / «Bot mới», không viết «v1/v3».
7. **Màn chưa dùng được thì ra khỏi menu nhưng không chết.** Màn chưa có dữ liệu hoặc chưa có cửa
   ghi chuyển sang cờ `thuNghiem` (ẩn khỏi menu, đường dẫn vẫn sống, quản trị bật lên xem được).
8. **Mọi thao tác ghi dùng chung một khuôn:** hộp xác nhận (với việc chạm khách) → thông báo kết
   quả → một dòng nhật ký ghi cả giá trị trước và sau → hoàn tác nếu làm được. Một khuôn ở `ui.js`,
   không để mỗi màn tự viết.

---

## 4. Đích đến

### 4a. Menu đích (làm ở GD6, sau khi các luồng đã xong)

| Mục | Màn | Ghi chú |
|---|---|---|
| **Hôm nay** | Việc của tôi · Hội thoại · Đơn chờ duyệt | Mở mỗi sáng. Vai sale thấy Hội thoại và Đơn |
| **Page & bot** | Danh sách page → **trang một page** (tab: Tình trạng · Sản phẩm & giá · Kịch bản · Chạy thử · Lịch sử) | Gộp Bắt đầu, Page còn thiếu gì, Công tắc từng page và phần Page / Sản phẩm của Vận hành V3 |
| **Dạy bot** | Kịch bản · Quy tắc chung · Câu trả lời sẵn · Kỹ năng · *Xem đoạn chữ gửi AI (nâng cao)* | Không đổi nội dung, chỉ đổi chỗ đứng |
| **Số liệu** | Đơn và tỉ lệ chốt · Chi phí AI | Màn phân tích khác quay lại khi có dữ liệu |
| **Cài đặt** | **Cài đặt team** (danh sách việc) · Người · Kết nối · Model AI · Hệ còn sống không · Ai đã sửa gì | Vào hôm cài đặt và hôm có sự cố |
| *(ẩn · `thuNghiem`)* | So hai bản kịch bản · Rủi ro hoàn hàng · Khách vào từ đâu · Ảnh gửi khách · Đưa sản phẩm lên chạy · Gợi ý từ AI · Khách hàng | Đường dẫn vẫn sống, hết «chưa có dữ liệu» thì đưa lại lên menu |

Số màn trên menu giảm từ 26 xuống 16. Bảng chiếu từng màn cũ sang chỗ mới ở phụ lục B.

### 4b. Luồng «Cài đặt team» (làm một lần)

Một trang danh sách việc. Mỗi dòng **tự đo** trạng thái của nó; không có ô tick tay, trừ các việc
ngoài hệ.

```
Cài đặt team Tiểu Alpha                                    3/5 xong
 ✓ 1  Người và vai            2 quản trị · 1 sale                       [Sửa]
 ✓ 2  Token Pancake           1 token còn 74 ngày  ⚠ chỉ 1 token — thêm dự phòng
 ● 3  Nhận page về team       4 page · 0 page chưa phân                 [Quét Pancake]
 ○ 4  Nối POS + kéo danh mục  Kuwait tắt · Saudi bật · 233 SP chưa giá  [Mở Kết nối]
 ○ 5  Model AI và khoá        chính kimi-k2.6 · việc nền thiếu khoá DeepSeek  [Mở Model]
```

### 4c. Luồng «Đưa một page lên chạy» (trên trang một page)

Các bước đi theo thứ tự. Bước nào còn chặn thì ghi lý do bằng lời thường và kèm một nút sửa **tại
chỗ**, không bắt người dùng sang màn khác.

```
Minty Fresh Smile KSA          Bot mới · ĐANG CHẠY THỬ (không gửi khách)
 ✓ 1  Thị trường & sản phẩm      KSA · minty-fresh-smile · shop POS 1328205216
 ✓ 2  Giá bán                    3 gói · SAR
 ✓ 3  Kịch bản                   bản 6 đang chạy
 ● 4  Việc bên Pancake/Botcake   [ ] Tạo 4 thẻ hội thoại   [ ] Tắt Botcake   [Kiểm lại]
 ○ 5  Chạy thử                   xem 20 câu bot ĐỊNH trả lời, chưa gửi ai  [Mở]
 ○ 6  Bật cho khách thật         [Bật bot]  ← hộp xác nhận + nhật ký + trần bật
```

**Một nguồn điều kiện duy nhất:** hàm `trangThaiPage(page)` gộp `DIEU_KIEN` của v1 với danh sách
chặn v3 (`operations.js:46-67`) thành một danh sách có mã, nhãn, mức chặn hay nhắc, bước nào sửa.
Cả sáu chỗ đang hiện điều kiện đều đọc từ hàm này.

### 4d. Luồng «Hôm nay»: theo dõi và can thiệp

- **Dải trạng thái** ở đầu mọi màn gồm: số page bot đang chạy / tổng page của team (cùng mẫu số với
  Danh sách page), số khách đang chờ người, số tin gửi lỗi, và worker còn sống hay không. Bấm vào
  dải thì về Việc của tôi.
- **Hội thoại**: một màn trả lời khách nói gì, bot trả lời gì, vì sao bot dừng. Có các nút giao
  người, cho AI tiếp, mở Pancake. Bàn giao sinh ra việc trong hàng chờ (vá K5).
- **Đơn chờ duyệt**: một màn, giữ nguyên bốn chốt của đường duyệt đơn.
- **Nút «Tạm dừng bot cả team»** ở Hệ còn sống không và Danh sách page: hai bước xác nhận, ghi
  nhật ký, bật lại được. Nút này chạm khách thật nên đi quy trình `mo-van`.
- **Ai đã sửa gì**: mặc định hiện làn «người làm», và ghi cả giá trị trước / sau của giá bán và
  công tắc.

---

## 5. Lộ trình: 8 phiếu GD

Làn: 🟩 chỉ đổi cách hiện · 🟨 đổi hành vi màn hoặc cửa ghi · 🟥 chạm khách hoặc tiền.
Đất: **B** = `v3/src/ui/*`, `v3/src/noi-day/*` · **A** = `src/*` (worker, handler, `admin-v3`).

| Mã | Làn | Đất | Phụ thuộc | Phạm vi | Nghiệm thu |
|---|---|---|---|---|---|
| **GD0 · Sửa chỗ vỡ** ✅ 23/09 (còn ④) | 🟩 | B | — | ① Vận hành V3 trắng: thêm bốn phần tử còn thiếu hoặc bỏ bốn dòng gọi (T1). ② Bắt đầu gửi `p.id` thay cho id Facebook (K2). ③ Sau khi đăng nhập, mỗi vai vào màn đầu tiên nó có quyền: quản trị, quản lý và marketer vào Việc của tôi, sale vào Việc đang chờ (T5). ④ Sửa chữ đã cũ: «Sản phẩm & kho chưa dựng», nút Gán marketer dẫn vào ô đã khoá, `local-dev.md` tự mâu thuẫn (C4, C6). ⑤ **Cổng mới:** mở mọi màn trong menu bằng Brave headless, có `pageerror` là đỏ | Cổng ⑤ xanh trên 26 màn · đảo-vá: gỡ bản sửa ① thì cổng đỏ |
| **GD1 · Một nguồn cho mỗi câu hỏi** | 🟨 | B (+A đọc) | GD0 | `trangThaiPage()` gộp điều kiện v1 và v3 (4c). Dải trạng thái, Người và team, Hệ còn sống không dùng **cùng một mẫu số**. Mỗi page mang nhãn «Bot cũ» / «Bot mới». Chi phí AI đọc `so_ai` cho page v3 (K6) | Một ca kiểm: 6 chỗ hiện điều kiện cho cùng một page ra cùng một danh sách · dải trạng thái = Danh sách page |
| **GD2 · Trang một page + một công tắc** ✅ 25/09 (trừ bốn tab nhúng) | 🟨 | B | GD1 | Danh sách page và trang một page (4a, 4c). Gộp Bắt đầu, Sẵn sàng, Công tắc: đường cũ **chuyển hướng**, không xoá. Chỉ còn một API bật/tắt, có hộp xác nhận, trần bật và nhật ký trước/sau. Công tắc ở Vận hành V3 và ở Bắt đầu đổi thành đường dẫn tới đó (K2) | Còn đúng 1 cửa ghi bật bot (grep) · E2E: bật và tắt trên bản dev sạch |
| **GD3 · Cài đặt team + cửa ghi còn thiếu** ✅ 25/09 (trừ cửa ghi `pos_shop_id`) | 🟩 | B | GD1 | Trang danh sách việc (4b). Cửa ghi `page.pos_shop_id` (C6). Gán marketer về một chỗ (chờ Q5). Việc ngoài hệ thành thẻ có nút «Kiểm lại» (luật 5). Bỏ các câu bảo chạy lệnh hay sửa biến môi trường khỏi mặt màn (C7) | Người mới, bản dev sạch: từ team rỗng tới page «sẵn sàng» mà **không mở terminal** (trừ bước allowlist, chờ Q1) |
| **GD4 · Lượt lời lẽ** | 🟩 | B | GD0 | Thêm thành phần «ⓘ Nguồn số» (luật 3). Viết lại chữ cho 26 màn. Áp luật cảnh báo (luật 4). Bảng thuật ngữ `docs/v3/THUAT-NGU.md` là một nguồn, và ca HK10 (tên màn khớp `<h1>`) mở rộng ra để canh thuật ngữ | Mặt màn có 0 `<code>` (ngoài ô Nguồn số) · mỗi màn ≤ 1 hộp cảnh báo · tổng chữ ≤ 5.500 |
| **GD5 · Kiểm soát** ✅ 25/09 · nút dừng cả team: người quyết bảo **TẠM CHƯA LÀM** (25/09) · tách hai màn: gộp vào GD2 | 🟨 | A + B | GD1 | Worker phát nhịp tim và dải trạng thái đọc nhịp đó (K4). Bàn giao sinh việc (K5). Nút tạm dừng cả team (K1, quy trình `mo-van`). Màn Hội thoại và màn Đơn chờ duyệt tách ra khỏi Vận hành V3 và tự làm mới. Nhật ký ghi trước/sau cho giá bán (K7). Truyền `canhBao` vào lúc khởi động (K8) | Tắt worker thì trong 2 phút dải trạng thái chuyển đỏ · bàn giao một hội thoại thì nó hiện ở Việc đang chờ · tạm dừng rồi bật lại được, nhật ký có đủ 2 dòng |
| **GD6 · Menu đích** ✅ 25/09 (19 màn, không phải 16 — xem dưới) | 🟩 | B | ~~GD2, GD3, GD5~~ làm trước được | `man-hinh.js` theo 4a. Thêm cờ `thuNghiem` (luật 7). Việc của tôi gộp bản tóm tắt của Hệ còn sống không | Menu quản trị 16 màn · mọi đường cũ vẫn trả 200 hoặc chuyển hướng (không 404) |
| **GD7 · Nghiệm thu bằng người** | — | người quyết | GD0 (đo mốc) · GD6 (đo lại) | Một người chưa từng dùng hệ, trên bản dev sạch: cài team rồi đưa một page tới bước «Chạy thử». Ghi thời gian, số lần phải hỏi, số lần lạc | Thời gian và số lần hỏi **giảm một nửa** so với mốc đo sau GD0 |

> **Q1 đã gật 25/09** ⇒ GD2 và GD3 hết chặn. Cầu dao còn phải mở bằng `mo-van` trước khi
> giao page thật.

**Chạy song song được:** sau GD0 thì GD1 và GD4 chạy song song, vì một bên đụng tầng dữ liệu còn
bên kia đụng chữ. Riêng hai phần cùng sửa tệp `.html` thì phải làm tuần tự theo luật 3. GD2, GD3
và GD5 đều chờ GD1. GD6 làm cuối.

**Ước lượng thô:** GD0 nửa ngày tới một ngày · GD1 2 ngày · GD2 3 ngày · GD3 3 ngày · GD4 2–3 ngày
· GD5 3–4 ngày (phần A) · GD6 1 ngày.

---

## 6. Thước đo cho cả kế hoạch

| Chỉ số | Hôm nay (22/09) | Đích |
|---|---:|---:|
| Màn trên menu (quản trị) | ~~26~~ → ~~19~~ → ~~17~~ → **18** (8 màn ẩn) | ≤ 16 — GD2+GD3 đã gộp hết chỗ gộp được; muốn xuống 16 phải bỏ màn, không phải gộp |
| Màn phải ghé để cài một page | ~~7 màn · 11 bước~~ → **1 trang** (`/page/:id`) | 1 luồng ✅ |
| Việc phải làm ngoài giao diện | ~~3 (+ terminal)~~ → **2** (25/09: giao page nay bấm trên màn, chỉ còn bật cầu dao MỘT LẦN) | ≤ 2, đều có hướng dẫn, không cần terminal |
| Nút bật bot | ~~5~~ → **1 cửa ghi trên v3** (thước `mot-page` ⑤ canh) | 1 trên v3 ✅ (v1 nay chặn từ ngoài, xem 25/09) |
| Chỗ tự tính «page thiếu gì» | ~~6~~ → **1 bảng từ vựng** (`DIEU_KIEN_TAT_CA`), hiện ở 2 chỗ | 1 hàm, hiện ở ≤ 2 chỗ ✅ |
| Màn lỗi JS khi mở | ~~1~~ → **0** (GD0 xong) | 0, `do-giao-dien.mjs` canh |
| Chữ DIỄN GIẢI trên các màn trong menu | ~~6.790~~ → **4.255** | ≤ 3.400 — đề nghị đổi đích, xem phiếu GD4 §4 |
| Hộp cảnh báo | 32 | ≤ 1 mỗi màn, chỉ loại có việc phải làm |
| Màn diễn giải > 300 chữ | 5 | 0 |
| Mã kỹ thuật lộ trên mặt màn | 71 | 0 (ngoài ô Nguồn số) |
| Nút dừng toàn team | không có | **hoãn** — người quyết bảo tạm chưa làm (25/09) |
| Worker chết thì màn biết sau | ~~không bao giờ~~ → **≤ ~105 giây** (25/09) | ≤ 2 phút ✅ |
| Người mới cài một page | chưa đo (đo ở GD7 sau GD0) | giảm một nửa |

Đo lại bằng `ops/bin/do-giao-dien.mjs` (đã có từ GD0) — mỗi phiếu chạy một lượt trước và sau.

---

## 7. Không làm trong kế hoạch này

- Không đổi đường dẫn nào; đường cũ nào gộp đi thì chuyển hướng.
- Không đổi hệ kiểu (`kieu.css`, `ui.js`); chỉ thêm thành phần mới (ô Nguồn số, khuôn thao tác ghi).
- Không dựng nhóm «Nhắn cho khách» (giai đoạn 3).
- Không đụng 57 tệp phẳng dưới `src/` (§0a luật 4). Giao diện v1 (`public/*.html`) chỉ thêm một
  dải «Page thuộc bot mới — xem ở giao diện v3», chờ Q2.
- Không bỏ luật 8: nguồn số chỉ đổi chỗ hiện, không bị xoá.

---

## 8. Cần người quyết trước khi phát phiếu

| # | Câu hỏi | Vì sao phải quyết | Đề xuất |
|---|---|---|---|
| ~~Q1~~ ✅ **GẬT 25/09** | Danh sách page chạy bot mới có chuyển vào CSDL để bật được từ giao diện không? | — | **Đã làm** (`phieu-Q1-GIAO-PAGE.md`): cột `page.giao_bot_moi` (024) + cầu dao `V3_GIAO_PAGE_TREN_MAN` (vắng = đóng) + nút «Giao sang bot mới» tắt bot cũ TRƯỚC rồi đọc lại xác nhận. Chủ sở hữu = HỢP của cột và biến môi trường. Cầu dao CHƯA bật ở đâu — bật là việc của `mo-van` |
| Q2 | Giao diện v1 (`:3100/admin`) giữ song song hay đóng dần? | Hai giao diện, hai kiểu đăng nhập, không trỏ sang nhau (T7) | Giữ v1 cho 51 page cũ. Thêm dải dẫn sang v3. Sửa `HUONG-DAN-SALE-MKT.md` cho rõ giao diện nào dùng cho page nào |
| Q3 | Vai nào được bật bot cho khách thật? | Quản lý và marketer mở được màn Bắt đầu nhưng bấm bật thì bị 403 | Chỉ quản trị bật. Vai khác chỉ thấy tình trạng, không thấy nút bật |
| Q4 | Có ẩn 7 màn chưa có dữ liệu khỏi menu (cờ `thuNghiem`) không? | Màn trống làm người dùng vào rồi ra tay không | Ẩn |
| Q5 | Gán marketer sửa ở đâu? | Ô này khoá từ 15/09, nhưng hai màn vẫn trỏ tới nó | Sửa trên trang một page, ghi thẳng CSDL, bỏ nguồn `pages.json` |
| Q6 | Phần A của GD3 và GD5 (nhịp tim worker, bàn giao sinh việc, tạm dừng cả team, cửa ghi `pos_shop_id`) giao cho ai? | Đất A, khác phiên với B | Đưa thành phiếu vào sổ điều hành sau khi gật Q1 |

---

## Phụ lục A · Đường cài đặt hiện tại (đọc code 22/09)

| # | Màn | Việc | Ghi vào |
|---|---|---|---|
| 0 | *ngoài giao diện* | `.env` (`DATABASE_URL_V3`, `V3_KHOA_VE`, `V3_KHOA_MA_HOA`), `npm run migrate` (cần tới 017), chạy ba tiến trình. Team và quản trị đầu tiên chỉ tạo được bằng seed | — |
| 1 | Người và team · Thành viên | tạo người, cấp vai | `nguoi_dung`, `thanh_vien_team` |
| 2 | Kết nối & token | dán token Pancake | `token_pancake` |
| 3 | Công tắc từng page · Quét Pancake | quét page, page vào kho «chưa phân» | `page` |
| 4 | Người và team · Gán page ↔ team | kéo page về team | `page.team_id` |
| 5 | Model AI & khoá | chọn model, dán khoá | `cau_hinh_model`, `khoa_nha` |
| 6 | Kết nối & token · POS | nối shop, kéo danh mục | `ket_noi_pos`, `san_pham`, `goi_gia` |
| 7 | Sản phẩm & kho → Công tắc từng page | tạo sản phẩm gốc, gắn vào page | `san_pham_goc`, `page.san_pham_goc_ma` |
| 8 | Vận hành V3 · Sản phẩm & giá | nhập gói giá (**màn đang trắng**) | `goi_gia` |
| 9 | Kịch bản của page | soạn rồi đưa lên LIVE | `kich_ban` (+ `kb-overrides.json` của v1) |
| 10 | *ngoài giao diện* | thêm page vào `V3_PAGE_XU_LY`, bật `V3_PANCAKE_GUI` (hoặc `V3_DIEN_TAP`) và `V3_RAP_PROMPT_BAT`, rồi khởi động lại. Tạo thẻ hội thoại trên Pancake. Tắt Botcake | — |
| 11 | Vận hành V3 hoặc Công tắc từng page | bật AI | `page.v3_ai_bat` |

## Phụ lục B · 26 màn hiện tại → chỗ đích

| Màn hiện tại | Đường | Đích |
|---|---|---|
| Việc của tôi | `/trang-chu` | Hôm nay · Việc của tôi (gộp bản tóm tắt của Hệ còn sống không) |
| Hệ còn sống không | `/suc-khoe` | Cài đặt · Hệ còn sống không |
| Vận hành chat V3 | `/van-hanh-v3` | Tách ra: Page/Sản phẩm → trang một page · Đơn → Đơn chờ duyệt · Hội thoại → Hội thoại · Diễn tập → tab Chạy thử · Chi phí theo tin → Chi phí AI |
| Việc đang chờ | `/dieu-phoi` | Hôm nay · gộp vào Hội thoại và Đơn chờ duyệt (chi tiết việc giữ nguyên) |
| Khách hàng | `/ho-so-khach` | ẩn (`thuNghiem`) cho tới khi nối được khách |
| Bắt đầu | `/bat-dau` | chuyển hướng → Danh sách page |
| Công tắc từng page | `/page-bot` | **thành** Danh sách page |
| Page còn thiếu gì | `/san-sang` | chuyển hướng → Danh sách page (lọc «còn chặn») |
| Kịch bản của page | `/kich-ban` | Dạy bot · Kịch bản (và tab trên trang một page) |
| Quy tắc chung mọi page | `/bo-luat` | Dạy bot · Quy tắc chung |
| Câu trả lời sẵn | `/lop-0-dong` | Dạy bot · Câu trả lời sẵn |
| Kỹ năng theo sản phẩm | `/ky-nang` | Dạy bot · Kỹ năng |
| Đoạn chữ gửi cho AI | `/prompt-page` | Dạy bot · nâng cao |
| Ảnh gửi khách | `/thu-vien-anh` | ẩn (`thuNghiem`) |
| Gợi ý từ AI | `/ai-de-xuat` | ẩn (`thuNghiem`) |
| So hai bản kịch bản | `/hieu-qua` | ẩn (`thuNghiem`) |
| Chi phí AI | `/chi-phi` | Số liệu · Chi phí AI |
| Đơn và tỉ lệ chốt | `/bao-cao` | Số liệu · Đơn và tỉ lệ chốt |
| Khách vào từ đâu | `/nguon-khach` | ẩn (`thuNghiem`) |
| Rủi ro hoàn hàng | `/rui-ro-hoan` | ẩn (`thuNghiem`) |
| Người và team | `/cau-hinh-team` | Cài đặt · Người (tab POS bỏ, trỏ sang Kết nối) |
| Kết nối & token | `/ket-noi` | Cài đặt · Kết nối |
| Model AI & khoá | `/model-ai` | Cài đặt · Model AI |
| Ai đã sửa gì | `/nhat-ky` | Cài đặt · Ai đã sửa gì |
| Sản phẩm & kho | `/san-pham` | tab Sản phẩm & giá trên trang một page; phần sản phẩm gốc chuyển về Cài đặt · Kết nối |
| Đưa sản phẩm lên chạy | `/len-chay` | ẩn (`thuNghiem`) cho tới khi có trường cho chặng 2 |
