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

Biến kế thừa từ bản đang chạy (không thuộc bảng này nhưng liên quan cửa):
`PANCAKE_READONLY=1` — luật 1 §0a: máy cá nhân LUÔN có, VPS không đặt.

Ba luật khi thêm biến:

1. Chiều an toàn: vắng = đóng. Cấm biến kiểu "đặt để TẮT".
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
