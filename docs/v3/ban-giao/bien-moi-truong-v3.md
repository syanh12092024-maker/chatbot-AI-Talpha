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
| `V3_RAP_PROMPT_BAT` | Bật `rap-prompt.js` ráp `kb` từ 4 bảng DB (bo_luat_chung/ky_nang/kich_ban/san_pham); vắng ⇒ lùi nguyên `kb.js#getKBForPage` cũ | vắng = dùng kb.js cũ                         | `1` khi cutover từng phần đã kiểm 4 khối khớp dữ liệu thật    | L2-M3                    |

| `V3_PAGE_XU_LY`     | **Van BẬC PHƠI của worker v3.** Danh sách id page (ngăn bằng dấu phẩy) mà `src/queue/chay-worker.js` được phép nạp và xử. Van chỉ THU HẸP: id không có trong bảng `page` bị bỏ qua | vắng = không nạp page nào             | đặt ĐÚNG page đang thử ở bậc phơi hiện tại; bậc ⑥ mới liệt kê hết | VA-P7 · mở van 14/09     |
| `V3_LEGACY_POLL_OFF`| `=1` ⇒ `src/server.js` KHÔNG khởi động poll / follow-up / miner của bộ cũ. Bộ deploy v3 đặt cờ này để pilot một page không vô tình đánh thức các page legacy. Cũng là MỘT trong năm điều kiện `assertConfig` miễn khoá AI cho bản local dev (`src/config.js#configureLocal`) | `1` trên bản local dev sạch (`ops/bin/local-dev.mjs`) | `1` khi pilot v3; vắng ⇒ giữ nguyên hành vi bộ cũ | VA-P7 · local dev |
| `V3_DIEN_TAP`       | **CHẾ ĐỘ DIỄN TẬP.** `=1` ⇒ bot đọc tin thật, gọi model, soạn xong câu trả lời rồi GHI VÀO `lan_gui` với trạng thái `dien_tap` và DỪNG — không một lượt gọi mạng nào tới Pancake. Dùng để đo hiểu-hội-thoại · chất-lượng-tư-vấn · độ-trễ trước khi mở van. THẮNG mọi cờ khác: bật nó thì dù `V3_PANCAKE_GUI=1` cũng không gửi. Cổng HTTP ghi của `handler-v3` VẪN chặn POST tới pages.fm — lưới cuối không gỡ | đặt `1` khi đang đo | KHÔNG đặt (trừ lượt đo có người canh) | 020 · 17/09 |
| `V3_KHOA_VE`        | Khoá 32 byte (base64) KÝ VÉ ĐĂNG NHẬP (`v3/src/auth/ve.js`). **Thiếu = `v3/chay-that.js` TỪ CHỐI CHẠY** (`exit 1`, dòng 18) — không phải cửa đóng câm mà là dịch vụ không lên | đã đặt (đo 15/09)                            | **BẮT BUỘC, khoá RIÊNG** — dùng lại khoá dev = ai có khoá dev ký được vé prod | L0-M3(B) |
| `V3_KHOA_CHU`       | Khoá chủ 32 byte (base64) bọc khoá API model trong bảng `khoa_nha` (`v3/src/model/kho-khoa.js`). Thiếu ⇒ NÉM ngay lần gọi đầu, không tự sinh khoá tạm | **VẮNG trên máy này (đo 15/09)** — mọi lượt đọc khoá model sẽ ném | **BẮT BUỘC, khoá RIÊNG** khi dùng lớp model v3 | L1-M4(B) |
| `V3_BOT_V1_GOC`     | Gốc HTTP của tiến trình bot v1 để v3 gọi `/admin/api`. Vắng ⇒ tự suy `http://127.0.0.1:${PORT||3100}` | vắng = 127.0.0.1:3100                        | vắng là ĐÚNG khi v3 và bot cùng máy                            | G2-B4 |
| `V3_BOT_KHOA`       | `=1` KHOÁ cửa ghi sang tiến trình bot v1 (thêm/bỏ token · gạt công tắc bot). ⚠️ **NGOẠI LỆ CÓ CHỦ Ý của luật 1 dưới** — cửa này MỞ mặc định; lý do đầy đủ ở `v3/src/noi-day/cau-bot-v1.js` §CỬA GHI | nên đặt `1` trên máy demo; máy này đã đóng sẵn bằng `PANCAKE_READONLY=1` | KHÔNG đặt (để mở) — trừ lúc sự cố cần khoá gấp | G2-B4 |
| `V3_BOT_GHI`        | Cờ CŨ của cùng cửa trên. `=0` vẫn được tôn trọng (ai đã cố ý tắt thì vẫn tắt); `=1` KHÔNG còn là điều kiện để MỞ | không đặt                                    | không đặt                                                      | G2-B4 |
| `V3_POS_MAU_DON`    | Mẫu URL mở một đơn trên POS, dạng `https://pos.pages.fm/shops/{shop}/orders/{don}`. Vắng ⇒ nút «Mở POS» hiện MỜ kèm chú «chưa cấu hình đường POS», không dẫn tới 404 | vắng = nút mờ                                | đặt để sale bấm thẳng sang POS                                 | L4-M1 |
| `V3_POS_SHOP_ID`    | Shop id chèn vào `{shop}` của mẫu trên                                                                                          | vắng = nút mờ                                | đặt cùng lượt với `V3_POS_MAU_DON`                             | L4-M1 |
| `V3_WORKER_NHIP_MS` | Nhịp vòng của worker v3, mili-giây. Vắng ⇒ **6000**                                                                            | vắng                                         | vắng, trừ khi cần thưa nhịp lúc phơi                           | VA-P7 |
| `V3_WORKER_TRAN`    | Trần số tin xử mỗi lượt. Vắng ⇒ **50**                                                                                         | vắng                                         | ĐẶT THẤP (5–10) ở bậc phơi ③, tăng dần                         | VA-P7 |
| `V3_WORKER_MOT_LUOT`| `=1` chạy ĐÚNG một lượt rồi thoát — dùng để diễn tập, không dùng cho dịch vụ chạy dài                                          | dùng khi đo tay                              | KHÔNG đặt trong unit systemd                                   | VA-P7 |
| `V3_KHOA_<NHÀ>`     | **KHUÔN, không phải một biến**: khoá API của từng nhà model (`V3_KHOA_CLAUDE` · `V3_KHOA_OPENAI` · `V3_KHOA_KIMI` · `V3_KHOA_DEEPSEEK`). Tên sinh trong `v3/src/model/` | đặt nhà nào dùng nhà đó                      | H6 — đây đúng là việc «nạp tiền 4 nhà» đang treo               | L1-M4(B) |
| `V3_GIA_<MÃ_MODEL>` | **KHUÔN**: đơn giá token của một model, tên sinh bởi `bang-model.js#tenBienGia` (`'claude-haiku-4.5'` → `V3_GIA_CLAUDE_HAIKU_4_5`). Vắng ⇒ dùng bảng giá gắn trong mã | vắng                                         | đặt khi giá nhà đổi mà chưa kịp ra bản mới                     | L1-M4(B) |

> **Vì sao biến này phải có trước khi bật worker (đo 14/09):** `dsPageDeNap` đọc MỌI page
> trong bảng (502 dòng). Bật worker mà không có van này là mở thẳng bậc ⑥ «toàn bộ» — trong
> khi bot v1 vẫn đang trả lời 51 page thật, tức khách của những page ấy nhận tin từ HAI tiến
> trình. Bậc phơi ③ của skill `mo-van` («1 page thử, người ngồi canh») KHÔNG thực hiện được
> nếu thiếu chỗ này.

Biến kế thừa từ bản đang chạy (không thuộc bảng này nhưng liên quan cửa):
`PANCAKE_READONLY=1` — luật 1 §0a: máy cá nhân LUÔN có, VPS không đặt.
`ADMIN_USER` / `ADMIN_PASS` — Basic auth của `/admin/api` tiến trình bot v1. **Thiếu là cửa
ghi sang bot ĐÓNG CÂM**: nút «Thêm token» và công tắc bot trả 409 «thiếu ADMIN_USER/ADMIN_PASS».
Hai dịch vụ v3 phải thấy được hai biến này (chúng nằm trong `/opt/aicloser/.env`).
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

