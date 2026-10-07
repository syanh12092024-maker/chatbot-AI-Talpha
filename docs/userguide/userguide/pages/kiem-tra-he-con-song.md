# Kiểm tra «Hệ còn sống» mỗi ngày

> Trang này hướng dẫn người quản trị đọc màn «Hệ còn sống không» mỗi sáng: tóm tắt đầu màn, các đèn hạ tầng, và khối «Việc vận hành» dẫn sang tin cần đối chiếu, tin bị lọc và lượt chạy thử.

**Ai làm được:** Quản trị đọc đủ cả màn. Marketer mở được màn để xem các đèn nhưng không thấy khối «Việc vận hành», và các nút dẫn sang màn chỉ dành cho Quản trị bị tắt.

__Khi nào dùng:__ đầu mỗi ca làm việc; khi khách phàn nàn bot im; khi số đơn tụt bất thường; khi người quản trị hệ thống báo vừa khởi động lại máy chủ.

__Trước khi bắt đầu:__
- Màn đọc dữ liệu của **team đang mở** (trừ đèn tài khoản Pancake — kho đó dùng chung ba team).
- **Đèn xám là «chưa đo được» — khác hẳn «đang ổn».** Màn không bao giờ tô xanh một thứ nó không đo được.
- Màn tự nạp lại mỗi phút. Bạn có thể để mở cả ngày.

## Các bước

1. Mở **Cài đặt → Hệ còn sống** (đường dẫn `/suc-khoe`).
   → *Kết quả:* góc phải ghi «Đo lúc {giờ} · tự nạp lại mỗi phút».
2. Đọc hộp tóm tắt đầu màn.
   → *Kết quả:* một trong bốn câu, theo mức xấu nhất của cả bảng:
   - «Có chỗ đang hỏng» — có ít nhất một đèn đỏ.
   - «Không có gì hỏng, nhưng có chỗ cần để ý» — có đèn vàng, không có đèn đỏ.
   - «Không có gì hỏng — nhưng có đèn chưa đo được» — chỉ còn đèn xám ngoài đèn xanh. Đây là trạng thái tốt nhất bạn thường gặp, vì đèn «Khoá API model» luôn xám (khoá được mã hoá nên màn không đọc).
   - «Mọi đèn đều ổn».
3. Đọc hàng bốn con số: «Đang hỏng» · «Cần để ý» · «Chưa đo được» · «Đang ổn».
   → *Kết quả:* biết ngay có bao nhiêu đèn mỗi loại. «Đang hỏng» khác 0 thì nhãn ghi «Cần sửa ngay».
4. Đọc danh sách đèn (tiêu đề «{n} đèn»). Đèn đỏ xếp trên cùng, rồi vàng, xám, xanh.
   → *Kết quả:* mỗi đèn chưa xanh có một câu nói vì sao, bằng số; nếu có việc phải làm thì có nút đi tới đúng màn (ví dụ «Sang màn Model AI & khoá») hoặc dòng «Việc cần làm: …» khi việc đó phải nhờ người khác. Đèn xanh chỉ hiện tên, con số và nhãn «Ổn».
5. Xử từng đèn đỏ rồi vàng theo nút hoặc dòng «Việc cần làm» của nó. Nghĩa đầy đủ của từng đèn: [Các đèn của «Hệ còn sống»](./tra-cuu-den-he-con-song.md).
   → *Kết quả:* lượt nạp lại kế tiếp (tối đa một phút) đèn đổi màu.
6. Kéo xuống khối «Việc vận hành» (chỉ Quản trị thấy).
   → *Kết quả:* ba dòng, mỗi dòng một con số lớn và một nút sang màn Vận hành mở sẵn đúng tab (xem bảng dưới).

![Màn «Hệ còn sống không» — tóm tắt, bốn con số và danh sách đèn](images/kiem-tra-he-con-song.png)

<!-- CHỤP: anh=kiem-tra-he-con-song · vai=quan-tri · duong=/suc-khoe · cho=«Đang hỏng»
     thao_tac=
     trang_thai=hộp tóm tắt đầu màn có câu theo mức; hàng bốn con số «Đang hỏng», «Cần để ý», «Chưa đo được», «Đang ổn»; danh sách đèn với đèn đỏ hoặc vàng ở trên, có nút «Sang màn …»
     danh_dau=(1) «Đang hỏng» · (2) «Máy chạy bot» · (3) «Đo lúc» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Hàng bốn con số | Nhìn «Đang hỏng» trước — khác 0 là phải xử ngay |
| (2) | Một dòng đèn trong danh sách (ví dụ «Máy chạy bot») | Đọc câu vì sao của từng đèn đỏ/vàng, bấm nút đi sửa |
| (3) | Dòng «Đo lúc … · tự nạp lại mỗi phút» | Giờ của lượt đo gần nhất |

## Khối «Việc vận hành»

| Dòng trên màn | Con số nghĩa là | Nút · tới đâu |
|---|---|---|
| «Tin cần đối chiếu · {n}» | Tin của khách mà lượt xử hoặc lượt gửi bị lỗi hoặc bị chặn; «{n} tin gửi không rõ kết quả — bot gửi mà Pancake không trả lời chắc chắn.» «Không tin nào chờ đối chiếu.» khi bằng 0 | «Đối chiếu» → [Đối chiếu tin gửi lỗi](./doi-chieu-tin-loi.md) |
| «Tin bị bộ lọc loại · {n} / 24 giờ» | Hội thoại bộ nạp tin bỏ qua trong 24 giờ qua; «{n} đáng ngờ.» | «Xem theo cửa» → [Xem tin bị lọc trong 24 giờ](./xem-tin-bi-loc.md) |
| «Diễn tập · {n} lượt» | Số lượt bot soạn câu trả lời mà không gửi; câu ghi chế độ chạy thử «đang bật» hay «đang tắt» | «Xem lượt diễn tập» → [Xem câu bot soạn khi đang chạy thử](./xem-chay-thu.md) |

![Khối «Việc vận hành» với ba lối sang màn Vận hành](images/kiem-tra-he-con-song-2.png)

<!-- CHỤP: anh=kiem-tra-he-con-song-2 · vai=quan-tri · duong=/suc-khoe · cho=«Việc vận hành»
     thao_tac=cuộn tới «Việc vận hành»
     trang_thai=khối «Việc vận hành» có ba dòng «Tin cần đối chiếu», «Tin bị bộ lọc loại», «Diễn tập», mỗi dòng có con số lớn và một nút
     danh_dau=(1) «Đối chiếu» · (2) «Xem theo cửa» · (3) «Xem lượt diễn tập» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Nút «Đối chiếu» | Sang màn Vận hành, tab «Hội thoại» |
| (2) | Nút «Xem theo cửa» | Sang màn Vận hành, tab «Tin bị lọc» |
| (3) | Nút «Xem lượt diễn tập» | Sang màn Vận hành, tab «Diễn tập (không gửi)» |

## Thói quen mỗi sáng (gợi ý theo thứ tự đèn quan trọng)

1. «Máy chạy bot» và «Token Pancake» — đỏ ở hai đèn này là khách nhắn vào không ai trả lời.
2. «Khách đang chờ» — đỏ là có việc đã quá hạn (màn ghi «… việc đã QUÁ HẠN 10 phút mà chưa ai nhận»); nhắc sale.
3. «Model AI» — đỏ/vàng thì kiểm màn Model.
4. Khối «Việc vận hành»: «Tin cần đối chiếu» khác 0 thì đối chiếu trước khi khách hỏi lại.

## Xử lý khi lỗi

- Hộp đỏ «Không đọc được bảng sức khoẻ» kèm «Chưa đo được đèn nào. Đây là «chưa biết», không phải «mọi thứ đều ổn».»: tải lại trang; vẫn lỗi thì gửi câu lỗi cho người quản trị hệ thống.
- Hộp vàng «Chưa đọc được việc vận hành» trong khối «Việc vận hành»: ba con số không đọc được; các đèn phía trên vẫn đúng. Tải lại sau ít phút.
- Nút trên đèn bị mờ, di chuột vào hiện «Màn này cần vai Quản trị — nhờ quản trị làm việc này»: bạn đang ở vai không mở được màn đó — báo Quản trị.
- Dòng «Việc cần làm: Nhờ người quản trị hệ thống…»: việc nằm ngoài màn. Xem [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md).

__Liên quan:__ [Các đèn của «Hệ còn sống»](./tra-cuu-den-he-con-song.md) · [Sự cố bot: không trả lời, sai giá, page không bật được](./su-co-bot.md) · [Kết nối tài khoản Pancake](./ket-noi-pancake.md)
