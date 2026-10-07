# Xem câu bot soạn khi đang chạy thử

> Trang này hướng dẫn người quản trị đọc những câu bot đã soạn trên tin thật của khách nhưng **không gửi** (chế độ chạy thử): khách nói gì, bot định trả lời gì, mất bao lâu, dùng model nào — ở màn Vận hành, tab «Diễn tập (không gửi)».

**Ai làm được:** Quản trị. Vai Quản lý (vai cũ, không còn cấp mới) cũng xem được. Bật hay tắt chế độ chạy thử **không** làm trên màn — đó là việc của người quản trị hệ thống, xem [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md).

__Khi nào dùng:__ trước khi mở cho bot gửi thật trên một page hay một nhóm page; sau khi sửa kịch bản, quy tắc chung hoặc đổi model và muốn chấm câu trả lời mà khách không thấy.

__Trước khi bắt đầu:__
- Khi chạy thử đang bật, bot vẫn đọc tin, gọi model và soạn câu trả lời; tới bước gửi thì ghi lại rồi dừng — khách không nhận gì.
- Chế độ chạy thử bật hay tắt cho **cả máy chủ** (mọi page bot đang xử), không theo từng page.
- Tab hiện lượt chạy thử của **team đang mở**, mới nhất lên đầu.

## Các bước

1. Ở **Cài đặt → Hệ còn sống**, khối «Việc vận hành», đọc dòng «Diễn tập · {n} lượt» rồi bấm «Xem lượt diễn tập».
   → *Kết quả:* màn Vận hành mở ở tab «Diễn tập (không gửi)» (`/van-hanh-v3?tab=dien-tap`). Đây cũng là tab mặc định khi mở màn Vận hành.
2. Xác định chế độ chạy thử đang bật hay tắt: nhìn thời điểm của dòng mới nhất trong bảng. Có lượt mới trong vài giờ gần đây ⇒ chạy thử đang bật; chỉ có lượt cũ ⇒ đang tắt, lượt mới **không** được ghi vào đây (và nếu cửa gửi đang mở thì bot gửi thật). Khi cần chắc chắn, hỏi người quản trị hệ thống.
   → *Kết quả:* bạn biết bảng đang phản ánh lượt chạy thử mới hay chỉ còn lượt cũ.
   *Lưu ý:* màn được thiết kế để hiện một hộp ở đầu bảng — hộp xanh «Chế độ diễn tập ĐANG BẬT — bot không gửi cho khách» (kèm số lượt, khách, page, độ trễ) hoặc hộp vàng «Chế độ diễn tập đang TẮT». Bản đang chạy (đối chiếu 05/10/2026) xoá hộp này ngay sau khi tải xong, nên bạn sẽ không thấy nó.
3. Đọc từng dòng của bảng.
   → *Kết quả:* mỗi dòng một lượt (xem bảng cột dưới đây).
4. Chấm câu trả lời: bot có hiểu đúng câu khách hỏi không, có đúng giá, đúng giọng page không, có đòi thông tin đặt hàng đúng lúc không.
5. Sửa chỗ sai ở đúng tầng (kiến thức sản phẩm, lời bot của page, quy tắc chung…), rồi chờ lượt chạy thử mới và đọc lại. Bấm «Tải lại» để lấy dòng mới; «Trang trước» / «Trang sau» để lật trang (50 dòng một trang).
   → *Kết quả:* dòng mới phản ánh bản vừa sửa.

| Cột | Đọc gì |
|---|---|
| «Khách nói» | Tên page, mã khách · giờ khách nhắn, và nguyên văn tin của khách (tối đa 400 ký tự) |
| «Bot ĐỊNH trả lời» | Nguyên văn câu bot soạn (tối đa 600 ký tự); dòng nhỏ dưới ghi loại lượt, mã model, làn xử lý (nếu có) và lượng chữ model đọc vào + viết ra (màn ghi «{vào}+{ra} token») |
| «Độ trễ» | Thời gian cả lượt, ví dụ «4,2s», kèm «bộ não {x}s» (phần thời gian model nghĩ); «chưa đo được» khi không khớp được số đo |

![Tab «Diễn tập (không gửi)» — khách nói gì, bot định trả lời gì, độ trễ](images/xem-chay-thu.png)

<!-- CHỤP: anh=xem-chay-thu · vai=quan-tri · duong=/van-hanh-v3?tab=dien-tap · cho=«Bot ĐỊNH trả lời»
     thao_tac=
     trang_thai=tab «Diễn tập (không gửi)» đang chọn; hộp đầu bảng nói chế độ đang bật hay tắt kèm số lượt; bảng có cột «Khách nói», «Bot ĐỊNH trả lời», «Độ trễ» với vài dòng
     danh_dau=(1) «Diễn tập (không gửi)» · (2) «Bot ĐỊNH trả lời» · (3) «Độ trễ» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Tab «Diễn tập (không gửi)» | Tab của việc này; hộp ngay dưới nói chế độ đang bật hay tắt |
| (2) | Cột «Bot ĐỊNH trả lời» | Đọc câu bot soạn và model đã dùng |
| (3) | Cột «Độ trễ» | Khách phải chờ bao lâu nếu câu này được gửi |

## Lưu ý

- Lượng chữ model đọc/viết và độ trễ của từng dòng được ghép với lượt chạy thử theo page, khách và thời gian (trong vòng 2 phút) — khi một khách nhắn dồn dập có thể ghép lệch. Dùng để đọc xu hướng, không dùng để đối soát từng đồng.
- «Độ trễ giữa» là trung vị (lượt điển hình), tính trên các lượt trả lời có đo độ trễ của team; «lâu nhất» là lượt chậm nhất.
- Trong hộp «Hội thoại #…» ở tab «Hội thoại», lượt chạy thử hiện với nhãn «bot ĐỊNH gửi (diễn tập, chưa bay)» xen giữa tin thật — tiện để chấm trong cả mạch hội thoại. Xem [Đối chiếu tin gửi lỗi](./doi-chieu-tin-loi.md).
- Hệ chưa có «Thử hỏi bot» trên trang một page. Hiện tại: xem đoạn chữ AI đang đọc ở [Xem đúng đoạn chữ AI đang đọc trên một page](./xem-doan-chu-ai-doc.md) và đọc kết quả chạy thử ở tab này.

## Xử lý khi lỗi

- «Chưa có dữ liệu ở tab này» kèm «Chưa có dòng nào cho team đang mở.» — chưa có lượt chạy thử nào của team; nếu chạy thử đang tắt, nhờ người quản trị hệ thống bật. Chế độ này bật cho cả máy chủ, không theo từng page.
- Hộp đỏ ở đầu bảng (câu do máy chủ trả) — tải lại trang; vẫn lỗi thì gửi câu lỗi cho người quản trị hệ thống.

__Liên quan:__ [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md) · [Viết và lưu lời bot cho một page](./viet-loi-bot.md) · [Soạn bản mới cho quy tắc chung mọi page](./sua-quy-tac-chung.md) · [Chọn model AI, thay khoá và thử một lượt](./chon-model-ai.md)
