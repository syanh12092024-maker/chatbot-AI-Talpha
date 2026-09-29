# CR-28-09c · Làm gọn theo bản thảo «4 màn» — HỒ SƠ ĐO, CHƯA ÁP

Người yêu cầu: chủ dự án · 28/09/2026 · sau bản dựng https://claude.ai/artifact/A6D68jyQRuqqu3TBRLrceb
(«Cảm giác giao diện này dễ hiểu và dễ sử dụng hơn. Nếu theo bản thảo này thì CR có lớn không?»).
Trạng thái: **ĐO XONG · CHỜ «áp»** — không tệp mã / quyết định / thước nào bị sửa.

Bản thảo gói NĂM thay đổi khác nhau. Luật «một CR sửa đúng một điều» ⇒ tách thành A–E, đo riêng,
người quyết chọn áp phần nào.

## 1 · Câu đổi + phạm vi âm

| | Từ | Sang | Vì |
|---|---|---|---|
| **A · Màn** | 26 màn / 5 nhóm menu (`03-MAN-HINH.md`, `chung/man-hinh.js`) | 4 đích: **Hộp thư · Page · Số liệu · Cài đặt** | Sale mở một màn là làm được việc; marketer có một chỗ cho «bot nói gì»; chủ đọc tiền một chỗ |
| **B · Vai** | 5 vai (§9: Quản trị · Marketer · Sale · Quản lý · Người duyệt kịch bản) | 3 vai: Quản trị · Marketer · Sale | «Lưu là chạy» (CR-28-09b) đã bỏ việc của Người duyệt; Quản lý = Quản trị chỉ xem |
| **C · Nội dung bot** | 7 khái niệm (luật chung · kịch bản 3 tầng · kỹ năng · câu trả lời sẵn · so A/B · gợi ý AI · đoạn chữ gửi AI) — §6 «bốn khối» | Luật chung + Page (sản phẩm · giá · ảnh · lời bot) + ô **Thử hỏi bot** | Marketer phải hiểu 7 khái niệm để sửa một câu bot nói |
| **D · Model** | «Bốn nhà, mỗi team chọn» (§7) | Một chính + một dự phòng khác nhà, màn một khung | Mã ĐÃ chạy đúng kiểu này (chính + dự phòng khác nhà — sổ tay B #15); chỉ gọn màn và câu chữ §7 |
| **E · Một bot** | Bot cũ `src/` + v3 song song, cờ `V3_*` | Một bot, Postgres là nguồn | **KHÔNG thuộc CR này** — là đích của lộ trình cutover đã ký; CR-28-09b (MN1–8, xong 28/09) đã làm phần «một nguồn» |

**Phạm vi âm** — CR này KHÔNG đụng: năm tệp bộ não (`src/prompts.js` `closer.js` `tools.js` `fast-lane.js`
`outbound-guard.js`); van gửi `V3_PANCAKE_GUI` · `V3_POS_GHI`; hai luồng đơn (§1); «trả lời khách ở Pancake» (§10);
lược đồ (KHÔNG DROP bảng nào — xem mục 6); đường cutover (E).

## 2 · Tác động năm lớp (đo 28/09, lệnh + số ở cuối mục)

| Lớp | Chỗ | Việc phải làm | Ước lượng |
|---|---|---|---|
| 1 · Ý đồ | §6 (bốn khối, «tầng kỹ năng là mới hoàn toàn»), §7 (bốn nhà), §9 (năm vai; «đề xuất của AI phải có người duyệt»), §10 (Hộp thư thêm DUYỆT ĐƠN — vẫn không soạn tin) | Viết lại 4 mục, giữ dòng cũ gạch ngang + trỏ CR | nhỏ |
| 2 · Điều hành | §5e MN1–MN8 **vừa xong** (MN6 dựng «trang page = màn kịch bản đầy đủ» — trùng vùng với Page mới); BH2–BH6 🎫 · BH8 🔨 ở bộ não (không trùng); UI-HT1–4 xong | Không dừng phiếu nào. Page mới phải đi TRÊN MN6, báo phiên MN trước khi đụng | — |
| 3 · Hợp đồng | `03-MAN-HINH.md` (8 nhóm, 45 dòng màn) · 8 spec `v3/docs/spec/*` · `ban-giao/luoc-do-v1.md` (bảng `ky_nang` `mau_0_dong`) | Viết lại 03 theo 4 đích; spec L4-M1 §7 giữ; đánh dấu lịch sử cho spec màn bị gỡ | vừa |
| 4 · Máy | 30 module `v3/src/ui/*` ≈ **28.000 dòng**; màn bị gỡ/gộp: `trang-chu` 577 · `van-hanh` 1.514 · `lop-0-dong` 595 · `ky-nang` 576 · `ai-de-xuat` 572 · `hieu-qua` 341 · `prompt-page` 691 · `len-chay` 593 · 5 màn số liệu ≈ 2.700 · 6 màn cài đặt ≈ 5.400 (gộp, không bỏ); vai `QUAN_LY`/`NGUOI_DUYET` ở **35 tệp** (mã + ca); đường bot: kỹ năng ở `src/chat/rap-prompt.js`, câu trả lời sẵn ở `src/chat/handler-v3.js`, tầng nước/SP ở `src/db/kich-ban.js` — **không tệp bộ não nào**; thước theo menu: `dieu-huong` (17 mục) · `phan-quyen-nam-vai` · `he-kieu` HK10/HK15 · ~40 tệp ca gắn tên màn | Gộp giao diện, tái dùng tầng đọc; ẩn trước, gỡ đường bot sau; viết lại thước menu/quyền | **lớn nhất (A)** |
| 5 · Dữ liệu | PROD: `nguoi_dung` **1** · gán vai **3, cả 3 là quản trị** · `ky_nang` **3, 0 bật** · `mau_0_dong` **0** · `kich_ban` 74 LIVE + 1 lưu trữ, **tất cả tầng page** · `bo_luat_chung` 1 · `cau_hinh_model` 3 · page 581, **0 bật bot, 0 có marketer** · nhật ký 30 ngày: **1 người, 5 thao tác** | **0 bản ghi phải sửa**: không ai mang vai sắp bỏ, không kỹ năng nào bật, không mẫu 0 đồng, không kịch bản tầng nước/SP | ≈ 0 |

Lệnh đo: `grep -nE "^## (6|7|9|10)…" docs/v3/01-QUYET-DINH.md` · `grep -cE "^\| " docs/v3/03-MAN-HINH.md` ·
`wc -l` từng `v3/src/ui/<màn>/` · `grep -rln "QUAN_LY\|NGUOI_DUYET" v3/src v3/test` (35) · `grep -ln … src/prompts.js`
(chỉ `boLuatChung`/`kichBanMay` — hai khối GIỮ) · SQL đếm trên `aicloser_v3` prod qua SSH đọc (script xoá sau khi chạy).

### 2b · Chín màn bị gỡ/gộp có giữ cấu hình gì không (đo 28/09 — người quyết hỏi)

Soát từng màn: đường GHI của nó (route + hàm tiêm, không chỉ `db.them`) và BOT ĐANG CHẠY có đọc chỗ đó không.
Prod: `V3_RAP_PROMPT_BAT` VẮNG ở cả 3 dịch vụ · `V3_PAGE_XU_LY` rỗng (bot v3 chưa xử page nào).

| Màn | Ghi gì | Bot đang chạy có đọc? | Gỡ được thế nào |
|---|---|---|---|
| Việc của tôi (`trang-chu`) | — chỉ đọc | — | gỡ hẳn |
| So hai bản kịch bản (`hieu-qua`) | — chỉ đọc | — | gỡ hẳn |
| Đưa sản phẩm lên chạy (`len-chay`) | — chỉ đọc cửa kiểm | — | gộp vào «Bật được chưa» của Page |
| Đoạn chữ gửi cho AI (`prompt-page`) | — chỉ đọc | — | gộp vào «AI đọc gì» của Page |
| Câu trả lời sẵn (`lop-0-dong`) | `mau_0_dong` — prod **0 dòng** | KHÔNG — chỉ `src/chat/handler-v3.js` đọc, mà v3 chưa xử page nào | gỡ màn; gỡ khỏi đường bot v3 ở LL8 |
| Kỹ năng (`ky-nang`) | `ky_nang` bật/tắt · nhóm SP — prod **3 dòng, 0 bật** | KHÔNG — chỉ vào prompt khi `V3_RAP_PROMPT_BAT=1` (vắng); không nằm trong bản chép sang bot cũ | gỡ màn; gỡ khối kỹ năng khỏi `rap-prompt.js` ở LL8 |
| Gợi ý từ AI (`ai-de-xuat`) | đề xuất → duyệt thì áp vào `bo_luat_chung` — prod 1 bản, 0 đề xuất chờ | gián tiếp (qua luật chung) — hôm nay không có gì chờ | gỡ hẳn |
| Việc đang chờ (`dispatch`) | nhận · đóng việc (`viec_can_xu_ly`) | — (việc của người) | **chỉ gỡ GIAO DIỆN** — Hộp thư dùng chính hai cửa này |
| Hội thoại và đơn (`van-hanh`) | **6 cửa ghi thật**: đổi nguồn nhận tin của page (poll/webhook) · lưu sản phẩm (màn Trang một page đang gọi CHÍNH cửa này) · lưu/duyệt/từ chối đơn Messenger · chuyển người / trả bot · đối chiếu tin gửi lỗi. Cùng thư mục: `router-anh.js` (ảnh SP · khối chung — bot đọc bản chép, MN4/MN7) | CÓ — sản phẩm, ảnh, khối chung đi sang bot | **chỉ gỡ GIAO DIỆN, GIỮ mọi đường API**; chuyển từng thao tác sang màn mới TRƯỚC khi gỡ trang |

⚠️ **Sửa lời đo của bản đầu hồ sơ này:** mục 2 lớp 4 từng xếp `van-hanh` (1.514 dòng) vào «màn bị gỡ/gộp» — SAI tầm:
thư mục đó là cửa cấu hình và thao tác thật. Chỉ trang HTML của nó được gỡ; `router.js` + `router-anh.js` ở lại.
Kết luận: **không màn nào giữ cấu hình mà bot đang chạy đọc và KHÔNG có nhà mới**; hai màn (`van-hanh`, `dispatch`)
là cửa thao tác thật ⇒ gỡ sau cùng, sau khi Hộp thư · Page · Cài đặt đã nhận đủ thao tác.

### 2c · Điều chỉnh sau câu hỏi của người quyết (28/09, đo lại)

**Câu trả lời sẵn — GIỮ (bản thảo đầu SAI).** Bắt từ khoá trả lời không qua AI là điều ĐÃ KÝ: §2 (thay Botcake —
hỏi giá · ngày giao · free ship phủ 10/10; «thật/giả» và «hỏi size» phải nhập TRƯỚC khi tắt Botcake) và §3 (dưới
10 giây). Lý do «AI chỉ 0,97% doanh thu» của bản thảo chỉ đúng về tiền, bỏ sót độ trễ và vai trò thay Botcake.
Hôm nay có BA chỗ cùng làm việc này: Fast Lane trong bộ não (`FASTLANE=1` trên prod, chặn ~33,7% tin;
`FASTLANE_TEMPLATES=0` · `FASTLANE_INTRO=0` tắt từ 11/08 vì trùng Botcake) · kho luật `src/rule-store.js` (qua
`kb.js`, sửa ở dashboard cũ) · bảng `mau_0_dong` của màn v3 (0 dòng, chỉ `handler-v3` đọc). ⇒ Đề xuất mới: MỘT lớp
«Trả lời sẵn» sửa được trên giao diện (tab trong Luật chung, phạm vi team → page/sản phẩm), bot đọc đúng một kho.
Gộp ba kho = việc đụng đường bot ⇒ phiếu riêng, làm SAU cutover hoặc cùng đợt tắt Botcake.

**Kỹ năng — LOẠI khái niệm, GIỮ nội dung.** Tài liệu (§6) sinh ra nó cho đúng một ca: hai sản phẩm có size hoàn
26,8% và 19,2% (không size 9,3%) mà chưa hỏi size. Prod: 3 dòng, CẢ BA là `hoi_size`, chưa từng bật, không gắn nhóm
sản phẩm nào. `san_pham_goc.kien_thuc` đã có và bot đọc (`src/products/catalog.js`) ⇒ chép câu «hỏi size» vào kiến
thức của các sản phẩm có size; bỏ màn và bảng khái niệm kỹ năng.

**Gợi ý từ AI — KHÔNG phải phần soi hội thoại.** Màn hôm nay chỉ là HỘP DUYỆT: không gọi model, không đọc lịch sử
chat, chỉ nhận đề xuất vào luật chung (0 đề xuất chờ). Việc người quyết mô tả (soi kịch bản + hội thoại → sửa lời bot
cho đúng và rẻ) CHƯA có; gần nhất là BH5 🎫 (soi lỗ hổng kiến thức page → việc cho marketer), BH6/BH8 (tiền mỗi lượt).
⇒ Bỏ màn rỗng; dựng đúng tính năng «Gợi ý cải thiện» trong Page SAU (đọc hội thoại bot chuyển người / khách rơi +
chi phí → đề xuất sửa lời bot · trả lời sẵn · kiến thức SP → marketer duyệt một chạm — giữ luật §9 «đề xuất AI phải
duyệt»).

**Việc đang chờ — bỏ được, NHƯNG chưa.** Bàn hội thoại đang chạy chỉ nhận việc loại HỘI THOẠI; việc loại ĐƠN không gắn
hội thoại (nghi trùng đơn, đơn chờ duyệt không có chat) vẫn chỉ ở «Việc đang chờ» (bàn hiện dòng «N đơn không gắn hội
thoại — xem ở Việc đang chờ»). Bản thảo có tab «Đơn chờ» ⇒ bỏ khi LL2 xong.

**Hội thoại và đơn — Hộp thư CHƯA đủ.** Đối chiếu từng chức năng:

| Chức năng (`van-hanh`) | Bàn hội thoại đang chạy | Bản thảo Hộp thư | Nhà mới |
|---|---|---|---|
| Đọc hội thoại | có | có | Hộp thư |
| Chuyển sang người khi bot đang xử | không | có («Nhận thay bot») | Hộp thư |
| Trả lại bot | có (qua đóng việc) | có | Hộp thư |
| Danh sách + chi tiết đơn chờ duyệt | không | có | Hộp thư |
| Sửa · duyệt → POS · từ chối đơn Messenger | không | có | Hộp thư |
| Lưu sản phẩm | có (màn Trang một page gọi cửa này) | có | Page |
| Đối chiếu tin gửi lỗi (`khong_ro`) | không | **không** | Cài đặt › Hệ còn sống — THIẾU trong bản thảo |
| Tin bị bộ lọc loại (khách im mà không ai biết) | không | **không** | Cài đặt › Hệ còn sống — THIẾU |
| Chi phí từng tin, tra về đúng câu khách | không | **không** | Số liệu — THIẾU |
| Diễn tập (chấm bot trên tin thật, không chạm khách) | không | **không** (Thử hỏi bot chỉ là câu tự gõ) | Cài đặt › Hệ còn sống — THIẾU; cần cho cutover |
| Đổi nguồn nhận tin của page (poll/webhook) | không | **không** | Page › mục kỹ thuật — THIẾU |

⇒ Bản thảo phủ đủ 5 việc của SALE, thiếu nhà cho 5 việc VẬN HÀNH. Phải vẽ thêm trước khi gỡ trang `van-hanh`.

### 2d · Sản phẩm là lõi + sự thật về màn Model (người quyết hỏi 29/09, đo lại)

**Sản phẩm → thị trường → page.** Người quyết: lõi của câu trả lời là thông tin SẢN PHẨM; một sản phẩm bán ở nhiều
thị trường và nhiều page. ⇒ «Sản phẩm» thành đích chính thứ 5 (Hộp thư · Sản phẩm · Page · Số liệu · Cài đặt):
chung (kiến thức, cách tư vấn, hỏi size, ảnh) → theo thị trường (giá bậc theo tiền tệ, ưu đãi, giao, món POS, tồn,
ngôn ngữ, lời riêng) → page (giọng, câu chào, ghi đè có chủ ý). **Sửa lời bản đầu hồ sơ:** kịch bản tầng SẢN PHẨM và
tầng NƯỚC (010 · 012 · 014) là đúng động cơ cho mô hình này — GIỮ, không cắt; chỉ đổi cách trình bày (theo sản phẩm,
không theo «tầng»).

Lớp 5 — dữ liệu hôm nay NGƯỢC mô hình (prod 29/09): `san_pham_goc` **0** · page gắn sản phẩm gốc **0** · `san_pham`
**147 dòng theo 76 page, 0 dòng có mã gốc, 75 dòng không tên, 3 tên khác nhau** · `goi_gia` 154 bậc / 78 sản phẩm / 6
tiền tệ · 420/581 page chưa khai thị trường · 74 kịch bản LIVE đều tầng page. ⇒ Muốn sang mô hình sản phẩm phải GỘP bản
sao thành sản phẩm gốc: tên không đủ để gộp (75 không tên), mã POS mang shop (khác nhau theo nước) ⇒ cần người xác nhận,
máy gợi ý theo tên món POS (MN8 «Dùng tên POS»). Đây là chi phí lớp 5 THẬT duy nhất của CR này.

**Ba luật người quyết chốt thêm (29/09):** ① ở Sản phẩm, THÊM THỊ TRƯỜNG = gắn ĐÚNG MỘT mã món POS của shop nước đó;
② marketer phụ trách chọn theo HỒ SƠ HRM, gán ở mức sản phẩm × thị trường (page kế thừa); ③ mã POS ở các shop khác nhau
là khác nhau nhưng có thể là CÙNG một sản phẩm ⇒ sản phẩm gốc gom nhiều mã POS, mỗi mã một thị trường.
Đo prod 29/09: 14 kết nối POS · mới kéo danh mục **1/14 shop** (69 món, Kuwait) · 0/78 bản sao của page đã nối mã POS
(`san_pham.pos_ma`, MN8 · 027 — dây nối đang ở mức PAGE, chưa có mức sản phẩm gốc) · HRM: **không có gì trong hệ**
(không bảng, không cột, không tài liệu; `nguoi_dung` chỉ có email · tên; `page.marketer` là chữ tự do, 0/581 có;
«lấy mục marketer từ POS» ở `04-TIEN-DO.md:636` vẫn «chưa làm»).
Người quyết trả lời (29/09): HRM là hệ quản lý nhân sự, dữ liệu ở **BigQuery**; một tài khoản đăng nhập = đúng một hồ sơ.
Đo 29/09 (chỉ cấu trúc + số gộp, không đọc tên ai): `levelup-465304.HRM_Core` có `dim_employee` (118 dòng · khoá
`emp_code` · `email_cong_ty` · `comp_profile` MKT|SALE|BO|VANDON|CTV · `status` active|thuviec|nghi · `team_code` ·
`team_market` · `manager_emp_code` · `revenue_keys`) và `fact_employee_team_history` (106 dòng · team theo khoảng ngày).
Phân bố: có email 116/118, không trùng ⇒ khớp tài khoản theo email được · MKT 60 · SALE 22 · BO 21 · VANDON 10 · CTV 5 ·
đang làm 69 · thử việc 19 · nghỉ 30 · `team_market` trống 93/118 ⇒ HRM KHÔNG cho thị trường của marketer (gán ở hệ) ·
`revenue_keys` trống 118/118 ⇒ chưa quy được doanh thu về marketer từ HRM · `team_code` là đơn vị tổ chức cả tập đoàn
(PIALPHA_GCC 6 · PIALPHA_EU 5 · PIALPHA_AUUS 2 · PIALPHA_SALE_ONLINE 7 · …; 18 trống), không trùng 3 team của hệ.
Máy chủ v3 chưa có quyền đọc BigQuery (chỉ máy dev có tài khoản dịch vụ gcloud) ⇒ việc người: cấp một tài khoản dịch vụ
CHỈ ĐỌC `HRM_Core` cho máy chủ, khoá vào kho khoá.
Người quyết chốt (29/09): ① ghép team đúng như đoán — Tiểu Alpha ↔ PIALPHA_GCC · Auus ↔ PIALPHA_AUUS · Pialpha EU ↔
PIALPHA_EU — và đổi TÊN HIỂN THỊ team theo HRM (slug giữ nguyên); sale (PIALPHA_SALE_ONLINE/OFFLINE) DÙNG CHUNG cả 3 team
⇒ tài khoản sale là thành viên cả 3 team, Hộp thư có lọc «cả 3 team»; ② BO · VANDON · CTV KHÔNG vào hệ; ③ **1 shop POS
= 1 thị trường** ⇒ thị trường suy từ shop, không gõ tay.
Đo prod 29/09 cho ③: lược đồ ĐÃ khoá luật này (`ket_noi_pos.market` · UNIQUE(team, market) · UNIQUE(team, shop_id), 002).
14 kết nối = 7 shop × 2 team (`tieu-alpha` + team kỹ thuật): Saudi · UAE · Kuwait · Qatar · Oman · Bahrain · Taiwan; ở
`tieu-alpha` CHỈ Kuwait bật. Auus · Pialpha EU: 0 kết nối POS. `page.thi_truong` gõ tay KHÔNG khớp tên POS: «KSA» 40 page
(POS ghi «Saudi») · «Khác» 31 · trống 420 ⇒ thị trường của page lấy từ shop POS của sản phẩm page bán; cột gõ tay ngừng
dùng (không xoá — đường lùi).

**Model — màn đang hứa nhiều hơn máy làm.** Đo 29/09 (mã + prod):
- Prod `cau_hinh_model` (tieu-alpha): chính `kimi-k2.6` · 0,30 · dự phòng `claude-haiku-4.5` · việc nền `deepseek-v4-flash` · 0,10.
- Bot v3 (`src/chat/handler-v3.js` → `src/chat/model.js#layModel`): đọc ĐÚNG MỘT vai «chính», gửi `temperature` =
  độ ngẫu nhiên của dòng đó ⇒ độ ngẫu nhiên CÓ tác dụng ở đường này — nhưng bot v3 chưa xử page nào (`V3_PAGE_XU_LY` rỗng).
- Bot cũ (`src/closer.js`, đường đã phục vụ khách tới 28/08): model lấy từ `.env` (`MODEL_CLOSER=kimi-k2.6`),
  `messages.create` KHÔNG có `temperature` ⇒ thanh trượt không tác dụng ở đường này.
- «Dự phòng»: không đường chat nào tự chuyển sang (layModel chỉ hỏi vai «chính»; lớp `goiModel` có chuyển dự phòng thì
  đường chat không gọi) ⇒ câu «hỏng một nhà bot vẫn trả lời» hiện CHƯA đúng.
- «Việc nền»: không ai gọi `layModel(…'nen')`; việc nền bot cũ dùng `MODEL_CLASSIFIER` trong `.env` ⇒ ô cấu hình không ai đọc.
- Chưa đo: nhà cung cấp có tôn trọng `temperature` không (cần khoá sống; khoá Kimi máy chủ đang 401).

## 3 · Giá phải trả

- **Gỡ ~9 màn đã xây** (câu trả lời sẵn, kỹ năng, gợi ý AI, so A/B, việc của tôi, hội thoại và đơn…) — mã nằm lại
  trong git, dựng lại được khi có lượt chat đủ để cần.
- **Viết lại thước**: mọi ca gắn menu 17 mục / năm vai / tên màn — thước đỏ trông như mã đỏ (án lệ 27), phải đi cùng.
- **«Thử hỏi bot» là việc MỚI duy nhất**: gọi model thật qua đúng bộ ráp prompt ⇒ tốn token, và cần khoá model SỐNG
  (máy chủ đang bị từ chối 401 — sổ §9 N-TPD). Chưa có khoá thì ô này chỉ hiện «chưa nối».
- **Đụng vùng MN6 vừa làm** (trang page) — phải xếp lại cho khớp, không dựng song song.
- Tab «Đơn chờ xác nhận WhatsApp» của Hộp thư sẽ TRỐNG tới khi luồng WhatsApp có (hồ sơ Meta chưa nộp — việc người).
- Rủi ro sinh ra: người đã quen vị trí màn cũ — hôm nay đo được đúng 1 người dùng, nên rủi ro này gần 0; càng để lâu
  càng đắt.

## 4 · Đề nghị ghi §9 SỔ NỢ

- Gỡ HẲN bảng `ky_nang` · `mau_0_dong` · cột tầng nước/SP của `kich_ban` — KHÔNG làm trong CR này (lùi lược đồ không
  phải đường lùi, sổ mở-van §5); xét sau một tháng không ai cần.
- «Thử hỏi bot» cần khoá model sống ⇒ nối vào việc người «thay khoá model máy chủ».

## 5 · Phiếu cần đẻ (nếu áp trọn A–D)

| Mã | Việc | Làn | Phụ thuộc |
|---|---|---|---|
| LL1 | Khung 4 đích + menu theo 3 vai (thay 5 nhóm) · sale vào thẳng Hộp thư | 🟩 | — |
| LL2 | Hộp thư = bàn hội thoại + duyệt đơn Messenger trong khung chat + tab đơn chờ xác nhận | 🟨 (duyệt đơn là đường tiền) | LL1 |
| LL3 | Page: danh sách + luật chung + «Bật được chưa» (4 điều kiện) + 4 tab, gộp 8 màn — đi trên MN6 | 🟨 | LL1 |
| LL4 | Thử hỏi bot: gọi model thật qua bộ ráp prompt, không gửi khách, ghi chi phí | 🟨 | LL3 · khoá model sống |
| LL5 | Số liệu một màn (gộp 5, hai phễu tách luồng) | 🟩 | LL1 |
| LL6 | Cài đặt một màn nhiều tab (gộp 6) + Model một khung (D) | 🟩 | LL1 |
| LL7 | Vai 5 → 3 (B): quyền, lược đồ gieo, 35 tệp | 🟨 (quyền) | LL1 |
| LL8 | Gỡ màn thừa (GIAO DIỆN; giữ API của `van-hanh` · `dispatch`) + gỡ kỹ năng / câu trả lời sẵn / tầng nước-SP khỏi ĐƯỜNG BOT v3 (C) — không đụng bộ não, không DROP bảng. Điều kiện vào: Hộp thư có duyệt đơn · trả bot · đối chiếu tin lỗi; Page/Cài đặt có đổi nguồn nhận tin | 🟨 | LL2 · LL3 · LL6 |
| LL9 | Thước: menu · quyền · HK10/HK15 · §10 cho Hộp thư mới | 🟩 | LL1–LL8 |
| LL10 | Nhà mới cho 5 việc vận hành của `van-hanh` (Hệ còn sống: đối chiếu tin lỗi · tin bị lọc · diễn tập; Số liệu: chi phí từng tin; Page: nguồn nhận tin) | 🟨 | LL5 · LL6 — TRƯỚC LL8 |
| LL11 | Kỹ năng → `san_pham_goc.kien_thuc` («hỏi size» cho SP có size), gỡ màn kỹ năng | 🟨 (đổi lời bot) | LL3 |
| LL13 | Đích «Sản phẩm»: thêm thị trường = gắn 1 mã POS · gộp món POS nhiều shop thành 1 sản phẩm (máy gợi ý theo tên, người xác nhận) · nối 78 bản sao của page vào sản phẩm × thị trường · kéo danh mục cả 14 shop trước | 🟨 (dữ liệu bot đọc) | LL3 |
| LL15 | HRM từ BigQuery (`HRM_Core.dim_employee`, chỉ đọc, mỗi ngày): tài khoản ↔ hồ sơ theo email · MKT → Marketer, SALE → Sale thành viên cả 3 team · BO/VANDON/CTV không vào · người nghỉ tự khoá · tên team theo HRM · marketer theo sản phẩm × shop POS, page kế thừa | 🟨 (quyền đăng nhập) | tài khoản dịch vụ BQ chỉ đọc `HRM_Core` cho máy chủ · LL13 |
| LL16 | Thị trường = shop POS: page lấy thị trường từ shop của sản phẩm nó bán · ngừng dùng `page.thi_truong` gõ tay (không xoá) · bật + kéo danh mục 6 shop còn lại | 🟨 (giá theo nước) | LL13 |
| LL14 | Model: nối dự phòng vào đường chat v3 (`src/chat/model.js`, không phải bộ não) · ẩn «việc nền» tới khi có việc dùng · màn nói đúng đường nào đọc gì | 🟨 | LL6 |
| LL12 | Trả lời sẵn MỘT lớp (gộp Fast Lane mẫu · kho luật · `mau_0_dong`), sửa trên giao diện | 🟥 (đường bot, cạnh bộ não) | cutover / đợt tắt Botcake — phiếu riêng |

Cỡ: 9 phiếu. Để so: sóng UI-HT (4 phiếu, cùng loại việc) xong trong một ngày làm việc của dây chuyền này.
Phần nặng là A (LL1–LL6); B, C, D mỗi phần một phiếu.

## 6 · Đường lùi

Không sửa dữ liệu, không DROP bảng ⇒ lùi = `git revert` các commit của CR + restart `aicloser-v3`; CSDL không phải
lùi. Làm theo thứ tự «thêm màn mới trước, gỡ màn cũ sau cùng» (LL8 cuối) ⇒ tới trước LL8, màn cũ vẫn mở được theo
đường cũ — lùi bất kỳ lúc nào không mất gì.
