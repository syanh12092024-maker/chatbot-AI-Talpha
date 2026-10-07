# Đối chiếu tin gửi lỗi

> Trang này hướng dẫn người quản trị xử những tin của khách mà bot xử hoặc gửi bị lỗi: tìm hội thoại, đọc dòng thời gian, kiểm trên Pancake khách đã nhận chưa, rồi đánh dấu đã đối chiếu và giao cho sale — ở màn Vận hành.

**Ai làm được:** Quản trị. Vai Quản lý (vai cũ, không còn cấp mới) mở được màn và hộp hội thoại để xem; hộp ghi «Bạn có quyền xem. Các thao tác xử lý dành cho quản trị.» và các nút bị khoá.

__Khi nào dùng:__ dòng «Tin cần đối chiếu» ở khối «Việc vận hành» của «Hệ còn sống» khác 0; một khách báo đã nhắn mà không ai trả lời.

__Trước khi bắt đầu:__
- **Hệ không tự gửi lại tin lỗi.** Một lượt gửi «không rõ kết quả» có thể đã tới khách; gửi lại là khách nhận hai lần. Vì vậy người phải kiểm trên Pancake trước.
- Hai loại tin cần đối chiếu: tin **lỗi** (lượt xử hoặc lượt gửi hỏng) và tin **bị chặn** (cửa gửi tin cho khách đang đóng ở cấu hình máy chủ nên bot không gửi). Tin bị chặn không bao giờ tự thử lại.
- Màn chỉ đọc dữ liệu của **team đang mở**.

## Các bước

1. Mở **Cài đặt → Hệ còn sống**, kéo tới khối «Việc vận hành», đọc dòng «Tin cần đối chiếu · {n}», rồi bấm «Đối chiếu».
   → *Kết quả:* màn **Vận hành** (`/van-hanh-v3?tab=conversations`) mở ở tab «Hội thoại»: danh sách hội thoại mới nhất của team, 50 dòng một trang, cột «Hội thoại» · «Chủ sở hữu» · «Trạng thái». Tab tự làm mới mỗi 45 giây khi không có hộp nào đang mở.
2. Tìm hội thoại có tin lỗi và bấm «Mở hội thoại». Danh sách **không đánh dấu** hội thoại nào có tin lỗi — bạn mở từng hội thoại (thường là hội thoại mới nhất, hoặc hội thoại của khách vừa phàn nàn) để kiểm. <!-- TBD: cách tìm nhanh đúng hội thoại có tin lỗi trong tab «Hội thoại» chưa có nguồn — OQ-QT-7 -->
   → *Kết quả:* hộp «Hội thoại #{số}» mở ra: dòng chủ sở hữu · trạng thái, khối «Thông tin khách đã thu thập», ô lý do, các nút xử lý và khối «Dòng hội thoại».
3. Đọc khối «Dòng hội thoại» từ trên xuống — một dòng thời gian gộp ba nguồn:
   - «khách» — tin khách nhắn;
   - «phía page — đã lên Pancake» — tin đã thật sự hiện trên Pancake (gồm cả tin sale gõ tay và tin tự động);
   - «bot · {trạng thái}» hoặc «bot ĐỊNH gửi (diễn tập, chưa bay)» — lượt bot gửi mà Pancake chưa xác nhận;
   - «tin lỗi · loi» hoặc «tin lỗi · chan_guard» — tin của khách bị lỗi hoặc bị chặn, kèm lý do.
   → *Kết quả:* bạn thấy tin lỗi nằm ở đâu so với các tin đã lên Pancake.
4. Mở hội thoại đó trên Pancake, kiểm khách đã nhận được câu trả lời chưa.
   → *Kết quả:* bạn biết khách đang chờ hay đã được trả lời.
5. Gõ lý do vào ô «Lý do tiếp tục / đối soát / bàn giao (5–300 ký tự, không ghi thông tin cá nhân)», ví dụ «đã kiểm Pancake, khách chưa nhận».
6. Bấm «Đã đối chiếu, bàn giao sale» ngay dưới dòng tin lỗi.
   → *Kết quả:* dòng chữ «Đã bàn giao sale, không tự gửi lại tin.»; hội thoại chuyển cho sale (chủ sở hữu thành sale), tin lỗi được đánh dấu đã xử. Hệ không gửi lại gì cho khách.
7. Muốn sale thấy khách này ngay ở «Việc đang chờ», bấm thêm «Chuyển nhân viên xử lý» (vẫn dùng lý do ở ô trên).
   → *Kết quả:* «Đã bàn giao. Khách này nay nằm ở màn «Việc đang chờ».» — hoặc «Đã bàn giao. Khách này đã có sẵn một việc đang chờ, không tạo thêm dòng mới.» Việc mới có hạn 10 phút.

![Hộp hội thoại ở Vận hành — dòng thời gian với tin lỗi và nút đối chiếu](images/doi-chieu-tin-loi.png)

<!-- CHỤP: anh=doi-chieu-tin-loi · vai=quan-tri · duong=/van-hanh-v3?tab=conversations · cho=«Mở hội thoại»
     thao_tac=bấm «Mở hội thoại»
     trang_thai=hộp «Hội thoại #…» đang mở; thấy ô «Lý do tiếp tục / đối soát / bàn giao…», hai nút «Chuyển nhân viên xử lý» và «Cho AI tiếp tục», khối «Dòng hội thoại» có ít nhất một dòng nhãn «tin lỗi · …» kèm nút «Đã đối chiếu, bàn giao sale»
     danh_dau=(1) «Lý do tiếp tục / đối soát / bàn giao» · (2) «Dòng hội thoại» · (3) «Đã đối chiếu, bàn giao sale» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô lý do | Gõ 5–300 ký tự, không ghi số điện thoại hay tên khách |
| (2) | Khối «Dòng hội thoại» | Đọc tin lỗi nằm ở đâu so với tin đã lên Pancake |
| (3) | Nút «Đã đối chiếu, bàn giao sale» | Bấm sau khi đã kiểm Pancake — hệ không gửi lại |

## Lưu ý

- «Đã đối chiếu, bàn giao sale» **không tạo** dòng ở «Việc đang chờ». Nếu cần sale xử ngay, làm thêm bước 7.
- Đầu hộp có thể có hộp vàng «Chưa đọc được lịch sử thật từ Pancake» — khi đó dòng thời gian thiếu tin sale gõ tay và tin tự động; kiểm thẳng trên Pancake.
- Nếu hội thoại đã tốn tiền model, dòng nhỏ «Hội thoại này đã tốn {x}đ qua {n} lượt bot xử lý» hiện trên dòng thời gian, và từng tin của khách kèm tiền của lượt đó.
- Nút «Cho AI tiếp tục» trả một hội thoại đang ở tay sale về cho bot. Chỉ chạy khi hội thoại đang ở trạng thái giao cho sale, không còn tin chưa xử và chưa có thông tin đơn; nếu không, hệ báo «Chỉ nhận lại chat đang HANDOFF/SALE» hoặc «Còn tin chưa xử lý hoặc có thông tin đơn; phải giải quyết trước khi trả AI». Cũng cần lý do 5–300 ký tự.
- Mỗi lượt đối chiếu và bàn giao được ghi nhật ký. Xem [Tra nhật ký: ai đã làm gì, lúc nào](./tra-nhat-ky.md).
- Nhiều tin bị chặn cùng lúc nghĩa là cửa gửi tin cho khách đang đóng — nhờ người quản trị hệ thống mở, xem [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md). Mở cửa xong, tin bị chặn cũ không tự gửi.

## Xử lý khi lỗi

- «Cần team, id hợp lệ và lý do đối chiếu 5–300 ký tự (không ghi PII)» — ô lý do trống hoặc quá ngắn; gõ lý do rồi bấm lại.
- «Không có tin lỗi/chặn của team này» — tin đã được đối chiếu (có thể bởi người khác); bấm «Tải lại».
- «Hội thoại đang được xử lý; thử lại sau» hoặc «Không thể thực hiện. Dữ liệu có thể đã thay đổi; tải lại và thử lại.» — bot hoặc người khác đang giữ hội thoại; chờ vài giây rồi thử lại.
- Tab «Hội thoại» ghi «Chưa có dữ liệu ở tab này» — team đang mở chưa có hội thoại nào.

__Liên quan:__ [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md) · [Xem tin bị lọc trong 24 giờ](./xem-tin-bi-loc.md) · [Nhận một việc bot giao lại và đóng việc với kết quả](./nhan-va-dong-viec.md) · [Trả lời khách trên Pancake mà không chen ngang bot](./tra-loi-tren-pancake.md)
