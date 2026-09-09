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
