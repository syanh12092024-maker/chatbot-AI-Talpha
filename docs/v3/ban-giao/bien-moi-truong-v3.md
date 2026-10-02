# BIẾN MÔI TRƯỜNG V3 — NƠI KHAI DUY NHẤT

> Mọi biến `V3_*` khai Ở ĐÂY, kèm giá trị theo môi trường. Thêm biến mới = thêm dòng ở
> đây TRONG CÙNG COMMIT với code đọc nó. H9 (sổ §8) trỏ vào bảng này lúc cutover.
> Nguyên tắc chung: **VẮNG BIẾN = ĐÓNG (fail-closed)** — cửa nào đóng câm thì tra bảng này.

| Biến                | Ý nghĩa                                                                                                                        | Dev (máy cá nhân)                            | VPS v3 (cutover)                                              | Cửa/phiếu                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ------------------------------------------------------------- | ------------------------ |
| `V3_KHOA_MA_HOA`    | Khoá 32 byte mã hoá secret trong DB (`cau_hinh_model.khoa_api_ma`, `ket_noi_pos.api_key_ma`)                                   | đã đặt 22/08 (khoá dev riêng)                | **khoá RIÊNG do người vận hành sinh** — cấm dùng lại khoá dev | L0-M1 · L1-M1 · L1-M4(B) |
| `V3_POS_GHI`        | Mở cửa GHI NGƯỢC trạng thái đơn POS                                                                                            | vắng = đóng                                  | `1` khi diễn tập T2 xong                                      | L1-M1                    |
| `V3_PANCAKE_GUI`    | Mở nhóm hàm GỬI/GHI cửa Messenger (guiTin/guiAnh/ghiNote/gatThe). Từ VA-R1 cũng là van của **cổng HTTP ghi** trên `globalThis.fetch` (handler-v3): đóng ⇒ POST/PUT/PATCH/DELETE tới `pages.fm`/`graph.facebook.com` từ bộ não cũ bị chặn, GET vẫn qua; worker/handler không gọi bộ não khi đóng | vắng = đóng                                  | `1`                                                           | L1-M2 · VA-R1            |
| `V3_WA_GUI`         | Mở gửi WhatsApp theo mẫu                                                                                                       | vắng = đóng                                  | `1` sau T1                                                    | L1-M3                    |
| `V3_NAP_DEV`        | Cho bộ NẠP enqueue tin khi `PANCAKE_READONLY=1` — **chỉ hiệu lực khi `DATABASE_URL_V3` trỏ localhost/127.0.0.1** (VA-R1 RF-2); DB xa ⇒ vẫn đóng. `PANCAKE_READONLY` đọc theo `.env` tuyệt đối (không phụ thuộc cwd) | vắng = không nạp; `1` chỉ trong harness test | KHÔNG đặt (VPS không READONLY)                                | L2-M1 · VA-R1            |
| `V3_NAP_CHI_CHUA_DOC` | Bộ NẠP chỉ lấy hội thoại `unread_count > 0`. **TẮT mặc định — bật là bot dễ câm.** Đo 17/09 trên page 1220547807799752: cửa này loại 7/8 hội thoại khách đang hỏi mà chưa ai trả lời ("How much", "Send me WhatsApp"…), vì Pancake đặt `seen=true` khi sale MỞ hội thoại chứ không phải khi trả lời. Nhìn `boQuaDaDoc` trong log worker trước khi bật | vắng = lấy cả hội thoại đã có người mở; `1` = chỉ lấy chưa đọc | KHÔNG đặt | L2-M1 |
| `V3_NAP_IM_BOTCAKE_MS` | Mốc IM LẶNG để Botcake nói trước: tin xếp vào hàng với `thu_lai_luc = now() + mốc`, worker chưa rút được cho tới lúc đó. Đo 21/09 page 1220547807799752: Botcake trả lời trong **8 giây hoặc không bao giờ** (34/34 lượt ≤8s) ⇒ 10s phủ trọn + 2s đệm. Page khác cấu hình Botcake khác thì đo lại. `0` = tắt cửa | vắng = `10000` (10 giây) | để mặc định; chỉnh sau khi đo từng page | L2-M1 |
| `PK_MARK_UNREAD` | Sau khi bot GỬI tin cho khách, gọi `/unread` để hội thoại quay lại hàng chờ sale. Pancake coi hội thoại là đã đọc ngay khi page gửi, kể cả tin bot — không gọi thì bot trả lời xong là sale không thấy khách đó nữa. Trước là cờ của đường v1 (`pancake-poll.js`, gỡ ở MB4); nay chỉ `src/queue/lan-gui.js` đọc. `0` = tắt | vắng = BẬT | để mặc định | L2-M1 · v1 |
| `PUBLIC_URL` | Gốc URL công khai để Facebook tải ảnh sản phẩm: ảnh tải lên lưu TƯƠNG ĐỐI `/uploads/…`, lúc gửi ghép `PUBLIC_URL` vào (`src/kb.js`). Phải trỏ đúng tiến trình đang phục vụ `/uploads` — từ MB3 là `aicloser-v3` (`CHAYTHAT_CONG`, 3102); trỏ 3100 (v1 đã tắt) là ảnh không tải được, đo 02/10: ngoài vào `:3100/uploads` = 000, `:3102/uploads` = 200 | vắng (ảnh gửi bằng URL tương đối = hỏng; dev không gửi) | `http://<IP>:3102` (đổi từ `:3100` ở MB4, 02/10) | CR-02-10 · MB4 |
| `V3_NAP_THE_CHAN` | Tên thẻ Pancake khiến bộ NẠP bỏ qua hội thoại (nhiều tên ngăn bằng dấu phẩy). Tra tên → id qua `/settings`, cache 10 phút nên không thêm lời gọi API. Đo 21/09 page 1220547807799752: thẻ `"Đã gửi"` (id 3) trên 11/60 hội thoại. Thẻ HỆ THỐNG (`-1 -2 -3 -11 -12 -20`, trạng thái đơn) luôn chặn, không cần khai. Tra thẻ hỏng ⇒ vẫn quét (fail-open) | vắng = `Đã gửi` | để mặc định; thêm tên nếu page dùng thẻ khác | L2-M1 |
| `V3_LAN_CHOT_MODEL` | Danh sách lane/rule của lớp 0 đồng KHÔNG được trả lời, phải nhường model (ngăn bằng dấu phẩy). Đo 23/09 trên 84 lượt khách thật page 1220547807799752: 33 lượt do lớp 0 đồng trả, **28 đúng chỗ** (giá 19 · chào 5 · ship 4 — câu trả lời cố định). 4 lượt còn lại là khoảnh khắc CHỐT ĐƠN, và mẫu cứng hỏng ở ba chỗ: không gọi được tên khách (0/33 lượt mẫu có tên, model 22%), **bỏ qua câu hỏi số lượng** ⇒ thu đủ tên/SĐT/địa chỉ rồi vẫn chưa tạo được đơn, và một chuỗi cho mọi tình huống. Giá: ~4 lượt × 87đ ≈ 350đ/84 lượt. Chặn ở `handler-v3`, KHÔNG sửa `fast-lane.js` (tệp CẤM SỬA). `paano_gap` CỐ Ý không nằm trong mặc định — phiếu L2-M2 đã chốt câu đó trả 0 token, đổi thì phải đi lối `doi-y-do`. Rỗng = tắt hẳn | vắng = `muon_dat,tpl_howto` | để mặc định | L2-M2 · BH |
| `V3_RAP_PROMPT_BAT` | Bật `rap-prompt.js` ráp `kb` từ 4 bảng DB (bo_luat_chung/ky_nang/kich_ban/san_pham); vắng ⇒ lùi nguyên `kb.js#getKBForPage` cũ | vắng = dùng kb.js cũ                         | `1` khi cutover từng phần đã kiểm 4 khối khớp dữ liệu thật    | L2-M3                    |

| `V3_DIEN_TAP`       | **CHẾ ĐỘ DIỄN TẬP.** `=1` ⇒ bot đọc tin thật, gọi model, soạn xong câu trả lời rồi GHI VÀO `lan_gui` với trạng thái `dien_tap` và DỪNG — không một lượt gọi mạng nào tới Pancake. Dùng để đo hiểu-hội-thoại · chất-lượng-tư-vấn · độ-trễ trước khi mở van. THẮNG mọi cờ khác: bật nó thì dù `V3_PANCAKE_GUI=1` cũng không gửi. Cổng HTTP ghi của `handler-v3` VẪN chặn POST tới pages.fm — lưới cuối không gỡ | đặt `1` khi đang đo | KHÔNG đặt (trừ lượt đo có người canh) | 020 · 17/09 |
| `V3_KHOA_VE`        | Khoá 32 byte (base64) KÝ VÉ ĐĂNG NHẬP (`v3/src/auth/ve.js`). **Thiếu = `v3/chay-that.js` TỪ CHỐI CHẠY** (`exit 1`, dòng 18) — không phải cửa đóng câm mà là dịch vụ không lên | đã đặt (đo 15/09)                            | **BẮT BUỘC, khoá RIÊNG** — dùng lại khoá dev = ai có khoá dev ký được vé prod | L0-M3(B) |
| `V3_COOKIE_SECURE`  | Ép cờ `Secure` cho cookie vé đăng nhập (`v3/src/auth/router.js#laHttps`). Vắng ⇒ cờ đi theo `req.secure` (HTTPS thật mới gắn). Từ 28/09 KHÔNG còn theo `NODE_ENV`: trên `http://<ip>:3102` cờ ấy làm trình duyệt vứt vé ⇒ màn Chọn team bật về đăng nhập | vắng | vắng khi chưa có HTTPS; `1` nếu đứng sau proxy HTTPS mà chưa bật `trust proxy` | 28/09 |
| `V3_KHOA_CHU`       | Khoá chủ 32 byte (base64) bọc khoá API model trong bảng `khoa_nha` (`v3/src/model/kho-khoa.js`). Thiếu ⇒ NÉM ngay lần gọi đầu, không tự sinh khoá tạm | **VẮNG trên máy này (đo 15/09)** — mọi lượt đọc khoá model sẽ ném | **BẮT BUỘC, khoá RIÊNG** khi dùng lớp model v3 | L1-M4(B) |
| `V3_BOT_KHOA`       | `=1` KHOÁ cửa ghi vào lõi bot (thêm/bỏ token · gạt công tắc bot · ghi kho kiến thức). ⚠️ **NGOẠI LỆ CÓ CHỦ Ý của luật 1 dưới** — cửa này MỞ mặc định; lý do đầy đủ ở `v3/src/noi-day/loi-bot.js` §CỬA GHI | nên đặt `1` trên máy demo; máy này đã đóng sẵn bằng `PANCAKE_READONLY=1` | KHÔNG đặt (để mở) — trừ lúc sự cố cần khoá gấp | G2-B4 |
| `V3_BOT_GHI`        | Cờ CŨ của cùng cửa trên. `=0` vẫn được tôn trọng (ai đã cố ý tắt thì vẫn tắt); `=1` KHÔNG còn là điều kiện để MỞ | không đặt                                    | không đặt                                                      | G2-B4 |
| `V3_POS_MAU_DON`    | Mẫu URL mở một đơn trên POS, dạng `https://pos.pages.fm/shops/{shop}/orders/{don}`. Vắng ⇒ nút «Mở POS» hiện MỜ kèm chú «chưa cấu hình đường POS», không dẫn tới 404 | vắng = nút mờ                                | đặt để sale bấm thẳng sang POS                                 | L4-M1 |
| `V3_POS_SHOP_ID`    | Shop id chèn vào `{shop}` của mẫu trên                                                                                          | vắng = nút mờ                                | đặt cùng lượt với `V3_POS_MAU_DON`                             | L4-M1 |
| `V3_WORKER_NHIP_MS` | Nhịp vòng của worker v3, mili-giây. Vắng ⇒ **6000**                                                                            | vắng                                         | vắng, trừ khi cần thưa nhịp lúc phơi                           | VA-P7 |
| `V3_WORKER_TRAN`    | Trần số tin xử mỗi lượt. Vắng ⇒ **50**                                                                                         | vắng                                         | ĐẶT THẤP (5–10) ở bậc phơi ③, tăng dần                         | VA-P7 |
| `V3_WORKER_MOT_LUOT`| `=1` chạy ĐÚNG một lượt rồi thoát — dùng để diễn tập, không dùng cho dịch vụ chạy dài                                          | dùng khi đo tay                              | KHÔNG đặt trong unit systemd                                   | VA-P7 |
| `V3_KHOA_<NHÀ>`     | **KHUÔN, không phải một biến**: khoá API của từng nhà model (`V3_KHOA_CLAUDE` · `V3_KHOA_OPENAI` · `V3_KHOA_KIMI` · `V3_KHOA_DEEPSEEK`). Tên sinh trong `v3/src/model/` | đặt nhà nào dùng nhà đó                      | H6 — đây đúng là việc «nạp tiền 4 nhà» đang treo               | L1-M4(B) |
| `V3_GIA_<MÃ_MODEL>` | **KHUÔN**: đơn giá token của một model, tên sinh bởi `bang-model.js#tenBienGia` (`'claude-haiku-4.5'` → `V3_GIA_CLAUDE_HAIKU_4_5`). Vắng ⇒ dùng bảng giá gắn trong mã | vắng                                         | đặt khi giá nhà đổi mà chưa kịp ra bản mới                     | L1-M4(B) |
| `V3_GHI_KHO_BOT`    | Cho v3 ghi **kho kiến thức** của bot (sản phẩm · kịch bản vào `kb-overrides.json`) dù `PANCAKE_READONLY=1`. KHÔNG mở gửi tin, KHÔNG mở bật/tắt bot, KHÔNG mở thêm token. `V3_BOT_KHOA=1` / `V3_BOT_GHI=0` thắng cờ này | vắng (dev tự chạy v3 với `PANCAKE_READONLY=0` khi thử) | `1` trên unit `aicloser-v3` ở lượt MN5 — không có thì mọi lượt «lưu là chạy» bị từ chối | CR-28-09b · MN5 |
| `V3_SHEET_CHI_DANH_BA` | Google Sheet CHỈ còn là danh bạ page (tên · thị trường · ngành · marketer): bot THÔI lấy sản phẩm từ Sheet, và lấy ba khối Chính sách · FAQ · Phản đối từ `kb-chung.json` do v3 ghi (MN7) thay vì từ Sheet — tệp vắng ⇒ ba khối trống. Đọc ở **tiến trình bot** (`src/kb.js#ingest`) | vắng                                         | `1` trên unit `aicloser` ở lượt MN5 — SAU khi `ops/bin/nap-khoi-chung.mjs --ghi` (người quyết chọn (a): ba khối chép nguyên văn sang v3) | CR-28-09b · MN5 |
| `V3_BQ_KHOA`        | Đường tới tệp khoá service account BigQuery (`levelup-465304`) để đọc HRM: `HRM_Core.dim_employee` + `PIALPHA_ALL_Dataset.dim_person_map`. CHỈ ĐỌC — token xin phạm vi `bigquery.readonly`, chỉ có cửa `jobs.query` (`src/hrm/bigquery.js`). Vắng ⇒ màn Người và team + Kết nối nói «HRM chưa nối vào máy chủ» và nút «Lấy người từ HRM» mờ. Từ LL15b có biến này thì quản trị đồng bộ được người theo HRM (GHI bảng tài khoản trên hệ — BigQuery vẫn chỉ đọc). Từ LL15d nó còn cho màn Sản phẩm GỢI Ý marketer phụ trách từ đơn POS 60 ngày (`src/hrm/goi-y-marketer.js`, chỉ đọc, đệm một ngày). Từ LL17a: Số liệu › Tổng quan đọc số tổng hợp đơn POS của team theo marketer (`src/hrm/don-pos.js`, chỉ đọc, đệm 1 giờ). Đọc ở `aicloser-v3` (`v3/chay-that.js`) | vắng (thử tay: trỏ tới khoá levelup trên máy dev) | `/etc/aicloser/bq-levelup.json` (root:root 600, NGOÀI cây git — `checkout -f` không đụng; đặt 02/10, người quyết chọn chép khoá đang có) | LL15a |
| `V3_HRM_TU_DONG`    | `1` = lượt TỰ ĐỘNG đồng bộ người theo HRM (`src/hrm/dong-bo.js`): tạo tài khoản (chưa mật khẩu) · cấp Marketer/Sale theo team HRM · người nghỉ thì rút vai HRM + khoá · tên team theo HRM. Lượt đầu 5 phút sau khi `aicloser-v3` chạy, rồi mỗi 24 giờ; vượt rào (HRM đọc rỗng · rút > 30% vai HRM · khoá > 5 người) thì KHÔNG áp, ghi nhật ký `hrm_dong_bo_hoan` chờ người. Cần `V3_BQ_KHOA`. Vắng ⇒ chỉ đồng bộ khi quản trị bấm «Lấy người từ HRM» rồi «Áp dụng» ở màn Người và team | vắng | vắng (đặt `1` sau lượt áp tay đầu tiên — người gật riêng) | LL15b |

> **Vì sao biến này phải có trước khi bật worker (đo 14/09):** `dsPageDeNap` đọc MỌI page
> trong bảng (502 dòng). Bật worker mà không có van này là mở thẳng bậc ⑥ «toàn bộ» — trong
> khi bot v1 vẫn đang trả lời 51 page thật, tức khách của những page ấy nhận tin từ HAI tiến
> trình. Bậc phơi ③ của skill `mo-van` («1 page thử, người ngồi canh») KHÔNG thực hiện được
> nếu thiếu chỗ này.

**CR-02-10 · MB2 (02/10) — MỘT CÔNG TẮC.** Hai dòng «van bậc phơi của worker» (danh sách page) và «cầu
dao giao page bằng giao diện» đã GỠ khỏi bảng: worker nạp đúng những page có `page.bot_ai_bat = true`
(`src/queue/page-routing.js`), bật/tắt ở màn Công tắc từng page qua cổng sẵn sàng. Phanh tay lúc sự cố
là van gửi (`PANCAKE_READONLY` · `V3_PANCAKE_GUI`), không còn danh sách page trong cấu hình máy chủ.

**Biến ĐÃ GỠ — không code nào đọc, chỉ còn tên trong lịch sử** (migration 024 đã áp + chú thích cột
`page.giao_bot_moi` trong `db/schema.sql`; gỡ cột ở MB4). Đặt chúng trên máy chủ KHÔNG có tác dụng gì:
- `V3_PAGE_XU_LY` — cũ: danh sách page worker được nạp. Nay: cột `page.bot_ai_bat`.
- `V3_GIAO_PAGE_TREN_MAN` — cũ: cầu dao «giao page sang bot mới bằng giao diện». Nay: không còn «giao».
- Cờ tắt vòng hỏi tin của bot v1 (V3_LEGACY_POLL_OFF) — MB4 gỡ cùng `src/server.js`; không còn mã nào đọc.

Biến kế thừa từ bản đang chạy (không thuộc bảng này nhưng liên quan cửa):
`PANCAKE_READONLY=1` — luật 1 §0a: máy cá nhân LUÔN có, VPS không đặt.
~~`ADMIN_USER` / `ADMIN_PASS` — Basic auth của `/admin/api` tiến trình bot v1~~ — **CR-02-10 · MB1:**
v3 không còn gọi sang v1; lõi bot (công tắc, kho kiến thức, kho token, cửa kiểm sẵn sàng) chạy
TRONG tiến trình v3 (`src/core/khoi-dong-loi.js`). MB4 gỡ màn `/admin` cũ và `aicloser.service` — hai biến
không còn mã nào cần. Biến «gốc HTTP sang v1» đã gỡ khỏi bảng (không code nào đọc).
`DATABASE_URL_V3` — thiếu là `chay-that.js` từ chối chạy, cùng chỗ với `V3_KHOA_VE`.

Ba luật khi thêm biến:

1. Chiều an toàn: vắng = đóng. Cấm biến kiểu "đặt để TẮT".
   **Ngoại lệ duy nhất đã ký: `V3_BOT_KHOA`.** Cửa ghi sang bot v1 đã có BẢY chốt trước nó
   (đăng nhập · vai ở router · vai ở cửa ghi · vai ở tầng dưới · cửa kiểm sẵn sàng của v1 ·
   nhật ký ai bấm · hộp xác nhận); chốt thứ tám đòi SSH khiến người ta bỏ v3 quay về
   dashboard cũ cổng 3100 — nơi KHÔNG biết ai bấm và KHÔNG ghi nhật ký. Đẩy người dùng
   sang cửa không dấu vết thì không phải bảo vệ. Thêm ngoại lệ mới = phải ghi ở đây.
2. Tên `V3_` + tiếng Việt không dấu, một nghĩa một biến.
3. Cửa đọc biến phải in GIÁ TRỊ ĐO ĐƯỢC trong thông điệp lỗi (khuôn `LoiCuaGuiDong`).

---

> **⚠️ Giới hạn của `V3_RAP_PROMPT_BAT` — đọc trước khi hứa với ai (đo 01/09):**
> Bật cờ làm ba khối **kỹ năng · kịch bản · sản phẩm** có hiệu lực thật trên đường chat
> (`buildSystem` đọc thẳng `kb.config` và `kb.text`). Nhưng khối **bộ luật chung KHÔNG thay
> được hằng `CORE`** cứng trong `src/prompts.js` (file cấm sửa, luật 4 §0a) — bản trong CSDL
> đi vào khối `# KNOWLEDGE BASE` ở CUỐI prompt, tức **bổ sung, không thay thế**. Vì vậy tiêu
> chí `07-KE-HOACH-GD2.md` G2 nghiệm thu ① («sửa bộ luật trên màn → lượt chat kế tiếp dùng
> bản mới, không deploy») mới **đạt một nửa**: nội dung tới được model, nhưng CORE vẫn đứng
> đầu và tự tuyên bố thẩm quyền. Đóng nốt nửa còn lại = cutover `prompts.js` cho
> `buildSystem` đọc `kb.boLuatChung` — việc chạm FILE CẤM, phải xin chủ dự án.
> Màn «Prompt của page» nay hiện đủ NĂM khối (CORE + bốn khối CSDL) và nói rõ khối nào đang
> điều khiển; chưa nối bộ đọc hiệu lực thì nó nói «chưa biết», không đoán là đang bật.

