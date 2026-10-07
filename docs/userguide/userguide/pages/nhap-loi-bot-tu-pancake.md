# Nhập lời bot từ file kịch bản Pancake

> Trang này hướng dẫn dùng nút «Nhập từ file Pancake» ở tab «Lời bot» để đổ chữ từ file trả lời nhanh xuất từ Pancake vào ô soạn, rồi tự đọc lại và lưu.

**Ai làm được:** Marketer (page của sản phẩm mình phụ trách) · Quản trị.

> **Lưu ý — đối chiếu với hệ ngày 05/10/2026:** phần bóc file phía máy chủ đã bị gỡ trong đợt dọn bot cũ, trong khi nút trên màn vẫn còn. Theo mã hiện tại, lượt nhập sẽ báo hộp đỏ «Không bóc được file kịch bản» kèm «Lỗi máy chủ. Xem log.». Hệ chưa làm được việc này. Hiện tại: mở file trong Excel và chép tay vào ba ô «Giọng điệu / phong cách», «Câu chào mở đầu», «Cách bán / điểm mạnh riêng» theo [Viết và lưu lời bot cho một page](./viet-loi-bot.md). Gặp lỗi trên thì báo người quản trị hệ thống.
<!-- TBD: xác nhận trên máy chủ thật lượt «Nhập từ file Pancake» có báo «Lỗi máy chủ. Xem log.» không, và có định nối lại bộ bóc file không — OQ-MK-1 -->

__Khi nào dùng:__ page đã có sẵn bộ trả lời nhanh trên Pancake và bạn muốn lấy làm bản đầu cho lời bot, thay vì gõ lại từ đầu.

__Trước khi bắt đầu:__
- Xuất file trả lời nhanh của page từ Pancake, dạng `.xlsx` hoặc `.xls`. Ô chọn tệp chỉ nhận hai đuôi này.
- Nhập **không lưu gì cả**: nó chỉ điền chữ vào ô soạn. Bot chỉ dùng sau khi bạn đọc lại và bấm «Lưu — bot dùng ngay».
- Chữ nhập vào **ghi đè** những gì đang có trong ba ô chính. Nếu đang soạn dở, lưu hoặc chép ra chỗ khác trước.

## Các bước

1. Mở trang của page, bấm tab «Lời bot».
   → *Kết quả:* dưới các ô soạn có hai nút «Lưu — bot dùng ngay» và «Nhập từ file Pancake».
2. Bấm «Nhập từ file Pancake», chọn file `.xlsx` / `.xls` trên máy.
   → *Kết quả:* nút quay chờ trong lúc máy chủ đọc file.
3. Đọc hộp kết quả ngay dưới hai nút.
   → *Kết quả (khi bóc được):* hộp xanh «Đã bóc «tên file» — điền …/3 ô», kèm «Chưa lưu gì cả. Đọc lại nội dung rồi bấm «Lưu — bot dùng ngay» thì bot mới dùng.», một dòng đếm «… chủ đề · … ảnh · … bậc giá», và dòng «Ảnh và bảng giá trong file KHÔNG vào lời bot — chúng thuộc tab «Sản phẩm & giá».».
4. Đọc lại từng ô vừa được điền: «Giọng điệu / phong cách», «Câu chào mở đầu», «Cách bán / điểm mạnh riêng». Xoá câu thừa, sửa câu sai.
   → *Kết quả:* chưa có gì được lưu.
5. Bấm «Lưu — bot dùng ngay».
   → *Kết quả:* «Đã lưu v… — bot đang chạy bản này.» — từ đây giống hệt lưu tay (xem [Viết và lưu lời bot cho một page](./viet-loi-bot.md)).

![Tab «Lời bot» — nút «Nhập từ file Pancake» cạnh nút lưu](images/nhap-loi-bot-tu-pancake.png)

<!-- CHỤP: anh=nhap-loi-bot-tu-pancake · vai=marketer · duong=/page · cho=«Chọn một page ở cột trái»
     thao_tac=bấm dòng đầu tiên của «Danh sách page» · bấm «Lời bot»
     trang_thai=tab «Lời bot» đang mở, chưa nhập file nào, hai nút dưới ô soạn đang hiện
     danh_dau=(1) «Nhập từ file Pancake» · (2) «Câu chào mở đầu» · (3) «Lưu — bot dùng ngay» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Nút «Nhập từ file Pancake» | Chọn file trả lời nhanh xuất từ Pancake |
| (2) | Các ô chính, gồm «Câu chào mở đầu» | Đọc lại chữ vừa được điền trước khi lưu |
| (3) | Nút «Lưu — bot dùng ngay» | Chỉ bấm khi đã đọc lại |

## Nhập lấy gì, bỏ gì

| Phần | Nhập làm gì |
|---|---|
| Ba ô chính | Điền chữ bóc từ file (ô nào file không có thì giữ nguyên) |
| Năm ô «Trả lời nhanh» | **Không đụng** — file không có phần tương ứng, ghi đè bằng chữ rỗng là xoá công người khác |
| Ảnh và bảng giá trong file | Chỉ đếm để báo; **không** đi vào lời bot. Ảnh và giá thuộc phần sản phẩm |

## Xử lý khi lỗi

| Màn ghi (hộp «Không bóc được file kịch bản») | Nghĩa | Làm gì |
|---|---|---|
| «Lỗi máy chủ. Xem log.» | Phần bóc file phía máy chủ không chạy (xem lưu ý đầu trang) | Chép tay vào ba ô; báo người quản trị hệ thống |
| «Không đọc được tệp trên máy bạn.» | Trình duyệt không mở được tệp | Kiểm tệp không bị khoá, chọn lại |
| «thiếu file.» | Tệp rỗng | Xuất lại file từ Pancake |
| Câu bắt đầu bằng «chưa nối bộ bóc file Pancake» | Máy chủ dựng thiếu phần bóc file — lỗi cấu hình, không phải file hỏng | Báo người quản trị hệ thống |
| Không thấy nút «Nhập từ file Pancake» | Vai của bạn chỉ xem (màn ghi «Cần vai Quản trị hoặc Marketer để sửa.») | Nhờ quản trị kiểm vai |

Chọn lại đúng tệp vừa chọn vẫn chạy lại lượt nhập.

__Liên quan:__ [Viết và lưu lời bot cho một page](./viet-loi-bot.md) · [Xem lịch sử lời bot và chạy lại một bản cũ](./lich-su-loi-bot.md) · [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md)
