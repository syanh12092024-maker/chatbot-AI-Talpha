# Nhật ký phiếu VE3 — danh sách page theo bản vẽ 2b (29/09/2026)

> CR-28-09c · làn 🟨 (thao tác hàng loạt chạm công tắc bot = khách thật) · base `c8ef783`+deploy `f211036` · commit
> `05dcc72` · Đụng bộ não: không.

## Đo trước khi code

- Bản vẽ 2b (`PageDanhSach.dc.html`): «Các page» + nút «Quét Pancake tìm page mới» · viên «Lọc nhanh» có số · tìm +
  ba bộ lọc thả (thị trường · marketer · ngành hàng) · chọn nhiều ⇒ «Gắn vào sản phẩm › thị trường» · «Bật bot (tối đa
  10 · có xác nhận)» · bảng 9 cột.
- Màn cũ (`page-bot.html`) đã có gần đủ cột + cửa ghi từng page (bot · giao · trọng điểm · thị trường · ngành hàng ·
  sản phẩm gốc · Botcake · quét). Thiếu: viên lọc (đang là `<select>`), nút Quét ở đầu trang, chọn nhiều + hàng loạt.
- Cột «Thị trường theo shop POS» và «Marketer theo sản phẩm» cần LL16 · LL15 — giữ cột hôm nay, ghi chú dưới bảng nói
  rõ sẽ đổi ở phiếu nào. Ba bộ lọc thả: API chưa có tham số ⇒ không vẽ nút giả (để sau).

## Làm gì — và chọn gì thay gì

1. Viên «Lọc nhanh» (`role=tablist`, số đếm từ `d.dem`) thay ô chọn; đường `?loc=` giữ nguyên.
2. Nút Quét lên phần phải của PageHeader (`.sp ~ *`).
3. Chọn nhiều: cột chọn + «chọn cả trang»; thanh `.thanh-chon` hiện khi có dòng chọn. Hàng loạt chạy TUẦN TỰ qua ĐÚNG cửa
   từng page (`/san-pham-goc` · `/bot`) — chọn thay vì mở cửa hàng loạt ở máy chủ: cửa từng page đã có kiểm vai, kiểm cửa
   ghi, nhật ký trước/sau; cửa mới là một bản luật thứ hai cho đường chạm khách. Giá: N lượt HTTP cho N page (≤10 với bật
   bot). Bật bot: trần `GIOI_HAN_BAT = 10` (chặn ở CẢ nút lẫn hàm), hộp xác nhận liệt kê TÊN, chỉ page đang tắt và mở
   được cửa; lỗi đầu tiên ⇒ DỪNG, băng tin nói «đã xong k/N: …, các page sau chưa đổi». Đổi lọc/trang ⇒ bỏ chọn dòng khuất.

## Bộ ca — `v3/test/b/ve3-page-ds.test.mjs` D1–D4

Viên lọc thay ô chọn + nút Quét ở đầu trang · trần 10 + xác nhận (CẤU TRÚC «chưa đồng ý thì return») + liệt kê tên + đúng
cửa `/bot` + chỉ page tắt & mở cửa · tuần tự, dừng ở lỗi, nói đã xong bao nhiêu · gắn sản phẩm đúng cửa + chỉ dòng còn hiện
+ router không mọc cửa hàng loạt.

## Đảo-vá — 7/7 ĐỎ (lượt đầu 6/7)

M1 nới trần 50 · **M2 bỏ hộp xác nhận — lượt đầu SỐNG** (D2 đo chữ `confirmDialog`; `if (false && …confirmDialog…)` giữ chữ,
bỏ hộp) ⇒ siết D2 đo cấu trúc «chưa đồng ý thì return trước khi gọi cửa ghi» · M3 lỗi rồi vẫn chạy tiếp · M4 giữ chọn dòng
khuất · M5 bật qua cửa hàng loạt mới · M6 hàm không tự chặn quá trần · M7 bật cả page đang bật/khoá.

## Nghiệm thu

- Cổng `ops/bin/nghiem-thu/ve3.sh`: **ĐỎ 0 / XANH 7**. `npm test` (dev 29/09): **2.300 ca · 2.296 đạt · 0 đỏ · 4 bỏ qua**.
- E2E hồi quy 47 màn ba vai: 0 lỗi · 0 khung lệch · 0 HTML thô.
- Bấm thật (sandbox, Chromium): 9 viên có số · lọc «Bot đang tắt» ⇒ `?loc=bot_tat` · chọn 2 ⇒ thanh hiện · «Bật bot» KHOÁ
  với lý do «Cửa ghi sang bot đang khoá» (sandbox không có tiến trình bot) · gắn «Fitgum Acai Berry» ⇒ hộp xác nhận liệt kê
  đúng hai tên ⇒ đồng ý ⇒ hai dòng thành `fitgum`, thanh ẩn · 390px 0 tràn. Ảnh lượt đầu: ô chọn sản phẩm trong thanh kéo
  hết bề ngang ⇒ `.thanh-chon select { width: auto; … }`.

## Chưa làm / để sau

- Ba bộ lọc thả thị trường · marketer · ngành hàng (API chưa có tham số) · thị trường theo shop POS (LL16) · marketer theo
  sản phẩm (LL15) · «Tắt bot» hàng loạt (bản vẽ không có).
- Bật bot hàng loạt CHƯA đo được trên đường mở (cửa ghi sang bot đóng ở sandbox lẫn prod) — lần đầu mở cửa phải đo lại.
- Chưa deploy.
