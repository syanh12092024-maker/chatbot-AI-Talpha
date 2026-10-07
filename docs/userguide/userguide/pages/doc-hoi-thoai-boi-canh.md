# Đọc hội thoại và bối cảnh khách trước khi trả lời

> Trang này giúp sale đọc nhanh một hội thoại trong Hộp thư — ai đã nói gì (bot, máy tự động hay người), khách là ai, có hay hoàn hàng không, bot đã làm gì — trước khi nhảy sang Pancake trả lời.

**Ai làm được:** Sale · Quản trị (chỉ đọc; màn không có ô soạn tin).

__Khi nào dùng:__ mỗi lần bạn mở một hội thoại — từ tab «Cần bạn», «Bot đang xử», lối «Mọi hội thoại gần đây», hoặc từ kết quả ô tìm — và cần nắm tình hình trong mười giây.

__Trước khi bắt đầu:__
- Hộp thư có ba cột: danh sách bên trái · khung chat ở giữa · bối cảnh khách bên phải. Màn hẹp (khoảng 1180 điểm ảnh trở xuống) thì cột phải thu thành ngăn phủ, mở bằng nút «Khách» ở thanh dưới, đóng bằng «×» hoặc phím Esc. Màn điện thoại (khoảng 760 điểm ảnh trở xuống) thì danh sách và khung chat thay nhau hiện; bấm «←» để về danh sách.
- Khung chat **đọc thẳng Pancake** lúc bạn mở, không lưu bản sao trên hệ.

## Các bước

1. Mở «Hộp thư» (đường `/ban-hoi-thoai`) và bấm vào một dòng ở cột trái.
   → *Kết quả:* đầu khung giữa hiện tên khách, dòng phụ «{page} · {số điện thoại}», và đồng hồ nếu hội thoại có việc đang mở. Khung chat hiện «Đang đọc từ Pancake…».
2. Đọc khung chat. Tin của khách nằm một bên, tin phía page nằm bên kia; mỗi ngày có một mốc ngày. Dưới mỗi tin phía page có nhãn nguồn và giờ:
   - «Bot AI» — tin khớp với câu bot đã gửi;
   - «Tự động» — tin của luồng chào tự động (Botcake) hoặc mẫu tin máy;
   - «Page» — mọi tin phía page còn lại: thường là sale gõ tay, nhưng cũng có thể là một bot khác hệ không đối chiếu được. Hệ **không khẳng định** tin «Page» là của sale.
   → *Kết quả:* khung hiện tối đa 60 tin gần nhất, cuộn sẵn xuống tin mới nhất. Tin chỉ có ảnh hoặc tệp hiện «(tin không có chữ — ảnh hoặc tệp)».
3. Đọc khối «Khách» ở cột phải.
   → *Kết quả:* nếu hội thoại đã nối hồ sơ khách: «Tên», «Điện thoại» («Chưa để lại» nếu chưa có), «Địa chỉ», «Rủi ro hoàn» (huy hiệu tầng hoàn, kèm phần trăm hoàn trên đơn cũ nếu có), «Số đơn», «Page». Nếu chưa nối: chỉ có tên Messenger, số điện thoại (nếu có), page, và câu «Hội thoại này chưa nối được với hồ sơ khách nào — thường là khách chưa đưa số điện thoại.»
4. Đọc khối «Bot đã làm gì».
   → *Kết quả:* «Giai đoạn» («Chào» · «Tìm hiểu nhu cầu» · «Tư vấn» · «Chốt đơn» · «Chờ người» · «Sau bán»), «Người giữ» («Bot AI» · «Sale» · «Botcake»), «Vì sao chuyển», «Đang xử» (tên người nhận hoặc «Chưa ai nhận» — chỉ khi có việc), «Lượt bot» (số lượt bot đã trả lời, model, tiền; hoặc số lượt theo sổ của bot cũ, ghi tới 28/08), «Bot nói cuối».
5. Đọc khối «Page này bán gì».
   → *Kết quả:* «Page» và «Kịch bản» (bản số mấy, lấy từ đâu, sửa lúc nào, bởi ai — hoặc lý do chưa có kịch bản). Dòng chú thích ghi «Sản phẩm & giá của page: vai của bạn chưa có đường đọc ở đây — xem trong đơn chờ duyệt (nếu có) hoặc hỏi quản trị.»
6. Nếu có, đọc khối «Đơn đang bàn» (đơn mới nhất trong chính hội thoại này).
   → *Kết quả:* «Mã POS» («Chưa có mã» nếu chưa có), «Trạng thái» (trong hệ), «Trên POS» (trạng thái trên kho hàng), «Tổng tiền», «Tạo lúc».
7. Nếu dưới tin nhắn có thẻ «Đơn bot chốt · Messenger», đó là đơn chờ duyệt — xem [Duyệt, sửa hoặc từ chối đơn Messenger chờ duyệt](./duyet-don-messenger.md).
8. Đọc xong, bấm «Trả lời trên Pancake» để trả lời (xem [Trả lời khách trên Pancake mà không chen ngang bot](./tra-loi-tren-pancake.md)).

![Một hội thoại đang mở — nhãn nguồn dưới từng tin và ba khối bối cảnh ở cột phải](images/doc-hoi-thoai-boi-canh.png)

<!-- CHỤP: anh=doc-hoi-thoai-boi-canh · vai=sale · duong=/ban-hoi-thoai?ht=1 · cho=«Bot đã làm gì»
     thao_tac=
     trang_thai=khung chat có đủ tin khách và tin page với các nhãn «Bot AI», «Tự động», «Page»; cột phải hiện khối «Khách» có huy hiệu rủi ro hoàn, khối «Bot đã làm gì», khối «Page này bán gì», khối «Đơn đang bàn»
     danh_dau=(1) «Bot AI» · (2) «Rủi ro hoàn» · (3) «Bot đã làm gì» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Nhãn nguồn dưới tin phía page («Bot AI» · «Tự động» · «Page») | Biết câu nào do bot gửi, câu nào máy tự động, câu nào có thể là người |
| (2) | Dòng «Rủi ro hoàn» trong khối «Khách» | Khách hay hoàn hàng thì cẩn trọng khi chốt — xem [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md) |
| (3) | Khối «Bot đã làm gì» | Đọc «Vì sao chuyển» và «Bot nói cuối» trước khi trả lời |

## Tìm một hội thoại không có trong danh sách

1. Gõ số điện thoại khách đã để lại, hoặc mã khách Messenger, vào ô «Số điện thoại (mọi kênh) hoặc mã khách…» ở đầu cột trái, rồi nhấn Enter.
   → *Kết quả:* danh sách thay bằng các hội thoại khớp (không giới hạn 7 ngày, tối đa 100). Nếu bạn gõ từ 6 chữ số trở lên, phía trên danh sách hiện thêm khối «Khách · {N}»: bấm tên khách để xem «Đơn của {tên}» và «Hội thoại» của khách đó ở mọi kênh.
2. Bấm một hội thoại trong kết quả để mở như bình thường.

Ô tìm so **đúng dãy số** đã lưu ở hồ sơ khách (khoảng trắng được bỏ). Nếu không ra hội thoại nào mà khối «Khách» tìm được hồ sơ, hệ tự tìm lại bằng số đã chuẩn hoá. Đang ở tab «Bot đang xử» thì ô tìm chỉ ra hội thoại bot đang giữ — muốn tìm mọi hội thoại, bấm tab «Cần bạn» trước rồi mới gõ. Xem đủ hồ sơ mọi kênh: bấm lối «Tìm khách cũ — xem đủ các kênh →» ngay dưới ô tìm ([Tìm khách theo số điện thoại và xem mọi đơn của khách](./tim-khach.md)).

## Xem mọi hội thoại gần đây

Bấm lối «Mọi hội thoại gần đây» ở chân cột trái (cạnh câu «Gấp nhất lên đầu…»).
→ *Kết quả:* mọi hội thoại có tin trong 7 ngày qua, mới nhất trước, tối đa 100 (quá thì hiện «Chỉ hiện 100 hội thoại mới nhất.»). Không tab nào sáng khi bạn đứng ở lối này. Dòng nào không có việc thì nhãn là người giữ («Bot đang trả lời», «Sale», «Botcake»).

![Lối «Mọi hội thoại gần đây» — mọi hội thoại 7 ngày qua, kể cả hội thoại không có việc](images/doc-hoi-thoai-boi-canh-2.png)

<!-- CHỤP: anh=doc-hoi-thoai-boi-canh-2 · vai=sale · duong=/ban-hoi-thoai · cho=«Mọi hội thoại gần đây»
     thao_tac=bấm «Mọi hội thoại gần đây»
     trang_thai=cột trái liệt kê mọi hội thoại 7 ngày qua, có cả dòng có đồng hồ và dòng nhãn «Bot đang trả lời»; không tab nào đang sáng
     danh_dau=(1) «Số điện thoại (mọi kênh) hoặc mã khách…» · (2) «Tìm khách cũ — xem đủ các kênh →» · (3) «Mọi hội thoại gần đây» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô tìm | Gõ số điện thoại hoặc mã khách Messenger rồi nhấn Enter |
| (2) | Lối «Tìm khách cũ — xem đủ các kênh →» | Sang màn Tìm khách, xem đủ hồ sơ và mọi đơn |
| (3) | Lối «Mọi hội thoại gần đây» | Mọi hội thoại 7 ngày qua, kể cả hội thoại bot đã tự chuyển cho người mà không kèm việc |

## Lưu ý

- Hệ nhớ kết quả đọc Pancake của mỗi hội thoại trong **1 phút**: mở lại trong vòng một phút sẽ thấy đúng bản vừa đọc, tin mới nhất có thể chưa hiện. Cần chắc, bấm «Trả lời trên Pancake» để xem thẳng.
- «Vì sao chuyển» lấy lý do của việc đang mở. Hội thoại không có việc thì hiện lý do bot ghi lần cuối — có thể là một mã ngắn; bảng nghĩa ở [Lý do bot giao việc và kết quả đóng việc](./tra-cuu-ly-do-giao-viec.md).
- Tầng hoàn đọc từ cột hệ đã chấm sẵn. «Chưa chấm» nghĩa là **chưa biết**, không phải khách tốt.
- Khối nào không có dữ liệu thì ẩn hẳn (ví dụ không có đơn thì không có khối «Đơn đang bàn»).

## Xử lý khi lỗi

| Hiện tượng / câu trên màn | Nghĩa | Làm gì |
|---|---|---|
| «Chưa đọc được hội thoại từ Pancake» kèm «Pancake không trả tin: …» | Pancake báo lỗi (ví dụ lỗi gói cước của tài khoản Pancake) | Bấm «Trả lời trên Pancake» để đọc trên Pancake; lỗi lặp lại thì báo quản trị (kiểm [Kết nối tài khoản Pancake](./ket-noi-pancake.md)) |
| «Chưa có mã khách Pancake cho hội thoại này — …» | Hệ chưa có mã để hỏi Pancake hội thoại này | Bấm «Trả lời trên Pancake» để đọc ở đó |
| «Hội thoại thiếu page hoặc mã khách Facebook — không dựng được mã hội thoại Pancake.» | Thiếu dữ liệu để dựng đường mở | Tìm khách trực tiếp trên Pancake; báo quản trị |
| «Không gọi được Pancake: …» | Mất kết nối tới Pancake | Thử lại sau ít phút |
| «Pancake chưa có tin nào trong hội thoại này» | Hội thoại rỗng trên Pancake | Không cần làm gì |
| Khối «Bối cảnh» ghi «Chưa tải được bối cảnh: …» | Không đọc được hồ sơ / kịch bản | Mở lại hội thoại; phần đã có vẫn giữ |
| «Không tải được danh sách» | Mất kết nối khi tải cột trái | Bấm lại tab |
| «Không tìm thấy hội thoại» (khi tìm) | Không khớp số / mã nào | Gõ đúng dãy số khách đã để lại; hoặc dùng màn Tìm khách |
| «Chưa tra được hồ sơ khách» (khi tìm) | Không tra được khối «Khách» | Kết quả hội thoại vẫn dùng được; thử lại sau |

__Liên quan:__ [Trả lời khách trên Pancake mà không chen ngang bot](./tra-loi-tren-pancake.md) · [Tìm khách theo số điện thoại và xem mọi đơn của khách](./tim-khach.md) · [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md) · [Nhận một việc bot giao lại và đóng việc với kết quả](./nhan-va-dong-viec.md)
