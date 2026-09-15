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
