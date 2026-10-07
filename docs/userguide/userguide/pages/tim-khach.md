# Tìm khách theo số điện thoại và xem mọi đơn của khách

> Trang này hướng dẫn sale (và quản trị) tra một khách bằng số điện thoại để thấy một hồ sơ gộp các kênh đang chạy: hội thoại Messenger, đơn trang bán hàng, và mọi đơn của khách ở cả hai luồng.

**Ai làm được:** Sale · Quản trị mở được màn «Tìm khách». Tìm theo **tên** chỉ Quản trị làm được; sale tìm theo số điện thoại hoặc mã khách Messenger.

__Khi nào dùng:__ khách cũ nhắn lại và bạn muốn biết họ đã mua gì, có hay hoàn không; trước khi duyệt một đơn nghi trùng; hoặc khi một đơn trang bán hàng không có hội thoại mà bạn cần biết khách là ai.

__Trước khi bắt đầu:__
- **Một khách = một số điện thoại**, gộp theo từng nước: cùng một số ở hai nước là hai khách.
- Màn chỉ tra trong **team đang mở** ([Đăng nhập, chọn team và đổi team](./dang-nhap-chon-team.md)).
- Màn chỉ đọc — sửa thông tin khách làm trên kho hàng.

## Các bước

1. Trong «Hộp thư» (đường `/ban-hoi-thoai`), bấm lối «Tìm khách cũ — xem đủ các kênh →» ngay dưới ô tìm. (Hoặc mở thẳng đường `/ho-so-khach`.)
   → *Kết quả:* màn «Tìm khách» mở, dòng phụ «Một khách = một số điện thoại, gộp các kênh đang chạy.» Với sale, khung phải ghi «Gõ số điện thoại của khách». Góc trái có lối «← Về hàng đợi».
2. Gõ số điện thoại của khách vào ô «Số điện thoại · mã khách Messenger · tên…» rồi nhấn Enter. Gõ dạng nào cũng được (có hoặc không có mã nước, có số 0 đầu) — cần **ít nhất 6 chữ số**.
   → *Kết quả:* cột trái liệt kê khách khớp: tên (hoặc «Khách chưa có tên»), dòng «{số} · {thị trường} · {N} đơn · {N} hội thoại», huy hiệu rủi ro hoàn. Khách đầu tiên tự mở ở khung phải.
3. Đọc phần đầu hồ sơ.
   → *Kết quả:* tên khách, dòng «{số} · {thị trường} · {thành phố}», huy hiệu tầng hoàn kèm «hoàn {N}%» nếu đã chấm.
4. Đọc ba thẻ kênh của khách.
   → *Kết quả:*
   - «Messenger» — lúc chạm gần nhất, «{N} hội thoại · {tên các page}», và lối «Mở trong Hộp thư →» (mở hội thoại gần nhất). Chưa có thì ghi «Chưa nối hội thoại nào với khách này.»
   - «Trang bán hàng (Ladi)» — lúc đặt gần nhất, «{N} đơn · gần nhất {mã đơn}». Chưa có thì ghi «Chưa có đơn từ trang bán hàng.»
   - «WhatsApp» — «Chưa nối — kênh này chưa nằm trong phép gộp.» WhatsApp chưa nối — sẽ bổ sung sau.
5. Đọc bảng «Mọi đơn của khách · cả hai luồng · mới nhất trước» (kèm «{N} đơn»).
   → *Kết quả:* mỗi dòng một đơn, cột «Mã POS» · «Luồng» («Messenger» hoặc «Ladi») · «Hàng» · «Tiền» · «Trạng thái» (trạng thái trong hệ, kèm «· POS: {mã}» là mã trạng thái trên kho hàng). Không có đơn thì ghi «Chưa có đơn nào.»
6. Muốn mở hội thoại để xử lý, bấm «Mở trong Hộp thư →» ở thẻ Messenger.
   → *Kết quả:* Hộp thư mở thẳng đúng hội thoại đó.

![Màn «Tìm khách» — hồ sơ gộp ba thẻ kênh và bảng mọi đơn của khách](images/tim-khach.png)

<!-- CHỤP: anh=tim-khach · vai=sale · duong=/ho-so-khach?q=96891234567 · cho=«Mọi đơn của khách · cả hai luồng · mới nhất trước»
     thao_tac=
     trang_thai=đã tra theo số, cột trái có một khách được chọn; khung phải hiện tên khách, huy hiệu rủi ro hoàn, ba thẻ «Messenger» · «Trang bán hàng (Ladi)» · «WhatsApp», và bảng đơn. Bản xem thử cần nối dữ liệu đơn và hội thoại thì hồ sơ mới hiện
     danh_dau=(1) «Số điện thoại · mã khách Messenger · tên…» · (2) «Trang bán hàng (Ladi)» · (3) «Mọi đơn của khách · cả hai luồng · mới nhất trước» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô tìm | Gõ số điện thoại (ít nhất 6 chữ số) rồi nhấn Enter |
| (2) | Ba thẻ kênh «Messenger» · «Trang bán hàng (Ladi)» · «WhatsApp» | Xem khách có mặt ở kênh nào; «Mở trong Hộp thư →» để mở hội thoại |
| (3) | Bảng «Mọi đơn của khách…» | Mọi đơn của khách ở cả hai luồng, mới nhất trước |

## Tra nhanh ngay trong Hộp thư

Không cần sang màn «Tìm khách»: gõ số (từ 6 chữ số) vào ô «Số điện thoại (mọi kênh) hoặc mã khách…» của Hộp thư rồi nhấn Enter. Phía trên danh sách hội thoại khớp hiện khối «Khách · {N}»; bấm tên khách để xem «Đơn của {tên}» (mã đơn, «Messenger»/«Ladi», trạng thái, tiền, giờ) và «Hội thoại» («Bot đang giữ» / «Sale đang giữ»), bấm tên page để mở hội thoại.

![Lối vào màn «Tìm khách» từ Hộp thư](images/tim-khach-2.png)

<!-- CHỤP: anh=tim-khach-2 · vai=sale · duong=/ban-hoi-thoai · cho=«Tìm khách cũ — xem đủ các kênh →»
     thao_tac=
     trang_thai=Hộp thư ở tab «Cần bạn», thấy ô tìm và lối «Tìm khách cũ — xem đủ các kênh →» ngay dưới
     danh_dau=(1) «Số điện thoại (mọi kênh) hoặc mã khách…» · (2) «Tìm khách cũ — xem đủ các kênh →» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô tìm của Hộp thư | Tra nhanh: ra hội thoại khớp và khối «Khách» |
| (2) | Lối «Tìm khách cũ — xem đủ các kênh →» | Sang màn «Tìm khách» để xem đủ hồ sơ và bảng đơn |

## Giới hạn

- **Tìm theo tên:** sale gõ chữ thì màn báo «Tìm theo tên chưa mở cho vai của bạn» — «Gõ số điện thoại (hoặc mã khách Messenger) của khách.» Quản trị gõ tên thì ra danh sách khách khớp tên («{số} · {thị trường} · {N} đơn · hoàn {N}%»); bấm một dòng là màn tra lại theo số điện thoại để mở hồ sơ.
- **Tìm theo mã đơn:** gõ mã đơn dạng «{số}:{số}» thì màn báo «Chưa tra được theo mã đơn POS» — «Chưa có đường tra khách từ mã đơn POS — gõ số điện thoại của khách.»
- **Cột «Hàng»** luôn là «—», chú thích «Cột «Hàng»: dữ liệu đơn chưa lưu món — xem chi tiết trên POS.» Muốn biết đơn có món gì, mở đơn trên kho hàng.
- **Trạng thái trên kho hàng** trong bảng là mã số («POS: {mã}»), chưa đổi ra chữ. Nghĩa các mã, theo bảng hệ dùng ở khối «Đơn đang bàn» của Hộp thư: 0 «Mới · chờ xác nhận» · 1 «Đã duyệt» · 2 «Đang giao» · 3 «Đã giao» · 4 «Đang hoàn» · 5 «Đã hoàn» · 6 «Đã huỷ» · 7 «Đã xoá» · 8 «Đang đóng gói» · 9 «Chờ xử lý» · 11 «Chờ hàng» · 12 «Chờ in» · 16 «Đã thu tiền» · 20 «Đã đặt hàng». Mã ngoài danh sách này là mã chưa xác minh.
- **Rủi ro hoàn** tính từ các đơn đã kết (giao hoặc hoàn) của chính hồ sơ này — câu dưới bảng ghi rõ, kèm «Chấm lúc {ngày giờ}.» Nếu hệ chưa chấm khách này lần nào, câu đó nói số liệu hoàn chưa có — **không** phải bằng 0. Tầng hoàn chỉ để đọc, hệ không chặn đơn vì tầng hoàn. Xem [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md).
- Câu cuối hồ sơ khai hồ sơ này gộp được mấy trên hai kênh đang chạy (Messenger, trang bán hàng); WhatsApp chưa nằm trong phép gộp.
- **Ô tìm để trống:** quản trị thấy bảng «Mọi khách của team» (gộp theo số, 50 người mỗi trang, nút «Trước» / «Sau») và khối «Ba kênh dữ liệu khách» (Hồ sơ khách · Đơn hàng · Hội thoại — kênh nào «Nối được», kênh nào «Chưa nối»). Sale thấy lời mời gõ số.

## Xử lý khi lỗi

| Câu trên màn | Nghĩa | Làm gì |
|---|---|---|
| «Không có hồ sơ khách với số này» + «Có {N} hội thoại khớp — mở trong Hộp thư bên dưới.» | Có hội thoại mang số này nhưng chưa có hồ sơ khách | Bấm hội thoại trong khối «Hội thoại khớp» để mở trong Hộp thư |
| «Không có hồ sơ khách với số này» + «Kiểm lại số, hoặc khách chưa từng để lại số.» | Không khớp gì | Kiểm lại số; thử mã khách Messenger |
| «Chưa tìm được» + câu lỗi | Máy chủ không trả lời được | Thử lại; nếu câu lỗi là «Môi trường này chưa nối dữ liệu đơn và hội thoại.» thì báo quản trị |
| «Không mở được hồ sơ» | Hồ sơ không còn, hoặc không thuộc team đang mở («Không có khách này.») | Kiểm chip team rồi tra lại |
| «Không đủ quyền mở Tìm khách» | Vai của bạn không mở được màn | Nhờ quản trị kiểm vai ([Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md)) |

__Liên quan:__ [Đọc hội thoại và bối cảnh khách trước khi trả lời](./doc-hoi-thoai-boi-canh.md) · [Duyệt, sửa hoặc từ chối đơn Messenger chờ duyệt](./duyet-don-messenger.md) · [Các loại đơn ở tab Đơn chờ và cách xử lý ngoài hệ](./cac-loai-don-cho.md) · [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md)
