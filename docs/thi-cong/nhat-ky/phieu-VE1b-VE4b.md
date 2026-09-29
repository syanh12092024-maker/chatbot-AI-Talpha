# Nhật ký phiếu VE1b + VE4b — màn thôi hứa «bot dùng ngay» khi bot chưa đọc (29/09/2026)

> CR-28-09c · làn 🟩 (chỉ đổi CÂU CHỮ + một trường đọc; không cửa ghi, không đổi lời bot) · base `1203799` · commit
> VE1b `b0b32b2` · VE4b `4b64551` · Đụng bộ não: không (chỉ ĐỌC `src/prompts.js` để kiểm lời khai).

## Vì sao có phiếu

Người dùng hỏi «màn cấu hình sản phẩm để làm gì». Trả lời phải nói bot đọc gì — đo trên prod (29/09 ~12:10 CEST, chỉ
đọc): `V3_RAP_PROMPT_BAT` **vắng** ở cả `aicloser` lẫn `aicloser-v3` (`/proc/<pid>/environ`) và không có trong `.env` ⇒
bot đang trả lời khách ráp lời bằng `kb.js` cũ theo page. Hệ quả:

| Màn | Câu trên màn | Sự thật trên prod | Bằng chứng |
|---|---|---|---|
| Sản phẩm › Chung | nút «Lưu — mọi page dùng ngay» · báo «Lượt chat kế tiếp … đọc bản mới» | **sai** — lưu chỉ ghi dữ liệu + nhật ký, không đẩy bot; chỉ `rap-prompt.js` đọc `kien_thuc` | `kho-goc.js#suaKienThucGoc` không gọi cửa bot · `catalog.js` chỉ được `rap-prompt.js` (cờ) dùng cho kiến thức |
| Luật chung › Luật | «Áp một bản là cả team đổi cách nói» · «Có hiệu lực ngay ở lượt chat kế tiếp» · «… page dùng bản này từ lượt chat kế tiếp» | **sai** — bot cũ không đọc `bo_luat_chung`; `prompts.js#khoiBoLuat` nhận `kb.boLuatChung` chỉ do `rap-prompt.js` (cờ) điền | `grep bo_luat_chung src/` chỉ ra `rap-prompt.js` · `db/*` · `prompts.js` |
| Luật chung › Luật (bảng trống) | «Bot đang chạy mà không có khối quy tắc cứng nào trong prompt» | **sai ở MỌI chế độ** — trống ⇒ `khoiBoLuat` lùi về `CORE` | `src/prompts.js:189-199` |
| Luật chung › Chính sách/FAQ/Phản đối | «Lưu là bot dùng ngay» | **đúng** — bot trả `nguon=v3` cho `/admin/api/kb-chung` (đo prod, chỉ in tên nguồn) | lưu đẩy + đọc lại qua `dayKhoiChungLenBot` |
| Luật chung › Trả lời sẵn | mô tả cách lớp chạy, không hứa «đang có hiệu lực» | lớp `mau_0_dong` chỉ chạy trong `handler-v3` (bot v3 phục vụ 0/514 page) | để sau — không có câu sai, ghi §9 nếu cần |

## Làm gì

- `prompt-page/kho-prompt.js#botGhepTuDuLieu()` — MỘT nguồn (cùng bộ đọc hiệu lực màn «Prompt của page» đang dùng):
  `true` · `false` · `null` (chưa nối phép đo ⇒ nói CHƯA BIẾT, không đoán là bật).
- Sản phẩm: chi tiết trả `botDocKienThuc`; nút · câu báo sau lưu · cảnh báo tab Chung theo nó. «Thêm sản phẩm» thêm một câu
  nói nó để làm gì.
- Luật: `/api/bo-luat` trả `botDocLuat`; câu phụ đầu trang trung tính; cảnh báo; ghi chú bản nháp; hộp xác nhận Áp; câu báo
  sau áp; «không bản nào áp» chỉ báo ĐỎ khi bot đang đọc bảng (không thì `info`, khách chưa bị ảnh hưởng); câu «chạy trần»
  thay bằng sự thật (dùng khối quy tắc gốc cố định). **Sửa lời khai của chính mình giữa chừng:** bản nháp đầu viết «quy tắc
  chung là phần BỔ SUNG» — đọc `khoiBoLuat` thì bản hợp lệ THAY `CORE` ⇒ bỏ câu đó.

## Thước (án lệ #27 — sửa luật thì sửa thước)

- `bo-luat.test.mjs` ca «rỗng thật» từng GHIM câu sai «không có khối quy tắc cứng» ⇒ nay đòi «khối quy tắc gốc cố định» và
  CẤM câu cũ (lý do ghi ngay tên ca).
- Mới: ll13 U7 (ba trạng thái + câu hứa chỉ ở nhánh bật) · ve4 Q5 (cửa `/api/bo-luat` qua app thật + CSDL giả, ba trạng thái)
  · Q6 (mọi câu hứa sau `botDoc()`) · Q7 (không còn câu chạy trần; báo đỏ theo công tắc; bỏ qua chú thích).

## Đảo-vá

VE1b 6/6 đỏ · VE4b 8/8 đỏ (mỗi đột biến một tiến trình mới, khôi phục khớp băm).

## Đo

Bấm thật (dev, sandbox, công tắc TẮT như prod): Sản phẩm › Chung — nút «Lưu», cảnh báo «Bot CHƯA đọc phần kiến thức này»,
sau lưu «Đã lưu vào dữ liệu / Bot CHƯA đọc phần này…»; «Thêm sản phẩm» có câu giải thích · Luật — cảnh báo đầu trang · lỗi
JS 0 · request hỏng 0.
`npm test` (dev, sandbox): **2.313 ca · 2.309 đạt · 0 đỏ · 4 bỏ qua** · lượt từ chối mới của Postgres.app trong lượt: 0 ·
cổng `ve4.sh` 10/10 · `ve1.sh` 6/6.

## Chưa làm

- Tab «Trả lời sẵn»: không có câu sai, nhưng không nói lớp chỉ chạy ở bot v3 (0/514 page) — để phiếu sau nếu người quyết muốn.
- Bật `V3_RAP_PROMPT_BAT` là MỞ VAN đổi lời bot với khách (bậc ③ một page thử) — người quyết chưa gật, không đụng.
