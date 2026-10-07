# Xem tin bị lọc trong 24 giờ

> Trang này hướng dẫn người quản trị xem những hội thoại đang bị bộ nạp tin bỏ qua (không đưa cho bot trả lời), đọc lý do của từng hội thoại, và biết dòng nào bình thường, dòng nào phải soi — ở màn Vận hành, tab «Tin bị lọc».

**Ai làm được:** Quản trị. Vai Quản lý (vai cũ, không còn cấp mới) cũng xem được tab này. Tab chỉ để đọc — không có nút sửa.

__Khi nào dùng:__ dòng «Tin bị bộ lọc loại · {n} / 24 giờ» ở «Hệ còn sống» có số «đáng ngờ» khác 0; một khách báo đã nhắn mà bot không trả lời và không có tin lỗi nào.

__Trước khi bắt đầu:__
- Mỗi vòng, bộ nạp tin đọc hội thoại từ Pancake và bỏ qua những hội thoại không có gì để trả lời. Phần lớn là bình thường (page vừa nói, không có tin mới). Một cửa lọc bắt **oan** thì khách im lặng mà không ai biết — tab này để bắt đúng những dòng đó.
- **Con số «/ 24 giờ» chỉ có ở «Hệ còn sống».** Tab «Tin bị lọc» hiện mọi hội thoại **đang** bị bỏ qua ngay lúc này, dòng mới nhất lên đầu; hội thoại vào lại hàng đợi thì dòng của nó tự biến mất.
- Tab chỉ đọc dữ liệu của **team đang mở**.

## Các bước

1. Ở **Cài đặt → Hệ còn sống**, khối «Việc vận hành», bấm «Xem theo cửa».
   → *Kết quả:* màn Vận hành mở ở tab «Tin bị lọc» (`/van-hanh-v3?tab=bo-qua`).
2. Đọc bảng: cột «Hội thoại» (tên page, thị trường · mã khách, mã hội thoại), «Vì sao KHÔNG trả lời» (nhãn lý do — đỏ khi đáng soi), «Kéo dài» (bị bỏ qua bao lâu và qua bao nhiêu vòng).
   → *Kết quả:* bạn biết hội thoại nào đang bị bỏ qua, vì sao, và đã bao lâu.
3. Xử các dòng nhãn đỏ theo bảng «Lý do và việc cần làm» dưới đây.
4. Bấm «Tải lại» sau khi xử, hoặc «Trang sau» để xem tiếp.
   → *Kết quả:* dòng đã được xử (hội thoại đã vào hàng đợi) biến mất.

![Tab «Tin bị lọc» — tóm tắt theo lý do và bảng hội thoại đang bị bỏ qua](images/xem-tin-bi-loc.png)

<!-- CHỤP: anh=xem-tin-bi-loc · vai=quan-tri · duong=/van-hanh-v3?tab=bo-qua · cho=«Vì sao KHÔNG trả lời»
     thao_tac=
     trang_thai=tab «Tin bị lọc» đang chọn; bảng có cột «Hội thoại», «Vì sao KHÔNG trả lời», «Kéo dài», ít nhất một nhãn đỏ
     danh_dau=(1) «Tin bị lọc» · (2) «Vì sao KHÔNG trả lời» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Tab «Tin bị lọc» | Tab của việc này trên màn Vận hành |
| (2) | Cột «Vì sao KHÔNG trả lời» | Nhãn đỏ là dòng cần soi; nhãn xám là bình thường |

> **Lưu ý (đối chiếu 05/10/2026):** màn được thiết kế để hiện một dòng tóm tắt «Đang bỏ qua {n} hội thoại · {n} ĐÁNG SOI» kèm số theo từng lý do ở đầu bảng, nhưng bản đang chạy xoá dòng này ngay sau khi tải xong, nên bạn sẽ không thấy nó. Hãy đếm trực tiếp các nhãn đỏ trong bảng; tổng số «tin bị lọc / 24 giờ» xem ở khối «Việc vận hành» của [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md).

## Lý do và việc cần làm

| Nhãn trên màn | Đáng soi? | Nghĩa | Làm gì |
|---|---|---|---|
| «Page vừa nói» | Không | Tin cuối của hội thoại là của page (tin tự động, sale hoặc kho hàng) — không có lượt nào để trả lời. Chiếm phần lớn | Không cần làm gì |
| «Không có gì mới» | Không | Hội thoại không đổi từ vòng trước | Không cần làm gì |
| «Đang chờ khách gõ xong» | Không — **thành đáng soi khi quá 5 phút** | Bot tạm giữ 5 giây (câu trọn ý) hoặc 15 giây (câu cụt) để gom cả cụm tin thành một lượt trả lời. Dòng này phải biến mất sau vài giây | Còn quá 5 phút: màn coi là kẹt — báo người quản trị hệ thống kèm tên page và mã hội thoại |
| «Có thẻ chặn» | Có | Hội thoại mang một thẻ nằm trong danh sách thẻ chặn của cấu hình máy chủ (mặc định «Đã gửi») hoặc thẻ trạng thái đơn của Pancake. Thẻ gắn nhầm là khách bị bỏ im | Mở hội thoại trên Pancake, kiểm thẻ; gắn nhầm thì gỡ thẻ. Khách đang hỏi thì báo sale trả lời |
| «Đã có người mở» | Có | Cấu hình máy chủ đang bật lọc «chỉ hội thoại chưa đọc». Pancake đánh dấu «đã đọc» khi sale **mở** hội thoại, không phải khi trả lời — dễ bỏ sót khách đang hỏi | Báo sale kiểm hội thoại đó trên Pancake; muốn tắt lọc này thì nhờ người quản trị hệ thống |
| «Thiếu định danh» | Có | Pancake trả về hội thoại thiếu mã khách — không nhắn lại được cho ai | Mở hội thoại trên Pancake để xử tay |

Dòng có ghi chú thêm ngay dưới nhãn thì đọc ghi chú đó — đó là chi tiết bộ nạp ghi lại cho hội thoại ấy.

## Lưu ý

- Bảng rỗng có hai nghĩa, màn nói rõ: «Không dòng nào: hoặc bộ nạp chưa chạy vòng nào, hoặc mọi hội thoại đều đã vào hàng đợi.»
- Mỗi lần tải lấy tối đa 100 dòng, nhưng nút «Trang sau» chỉ nhảy 50 dòng — trang sau có thể lặp lại một phần trang trước. Đọc theo mã hội thoại để khỏi đếm trùng.
- «Hệ còn sống» ghi «Năm cửa lọc …» trong câu mô tả, nhưng bảng có sáu nhãn lý do như trên.

## Xử lý khi lỗi

- Hộp đỏ ở đầu bảng (câu do máy chủ trả) — tải lại trang; vẫn lỗi thì gửi câu lỗi cho người quản trị hệ thống.
- Dòng «Môi trường này chưa nối dữ liệu vận hành …» — máy chủ chưa nối dữ liệu cho màn Vận hành; nhờ người quản trị hệ thống.

__Liên quan:__ [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md) · [Đối chiếu tin gửi lỗi](./doi-chieu-tin-loi.md) · [Khi nào bot trả lời, khi nào im và giao cho người](./khi-nao-bot-tra-loi.md) · [Sự cố bot: không trả lời, sai giá, page không bật được](./su-co-bot.md)
