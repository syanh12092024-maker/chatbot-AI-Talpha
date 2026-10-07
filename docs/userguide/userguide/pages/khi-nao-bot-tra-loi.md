# Khi nào bot trả lời, khi nào im và giao cho người

> Trang này giải thích bot quyết định nói, im, hay giao hội thoại cho người ra sao — để sale biết lúc nào phải vào, còn marketer và quản trị hiểu vì sao một page hay một khách "không thấy bot trả lời".

Mỗi tin khách nhắn vào page có đúng ba kết cục:

- **Bot trả lời** — bằng câu trả lời sẵn (không tốn tiền) hoặc bằng AI.
- **Bot im** — không gửi gì và không giao cho ai, vì chưa tới lượt bot hoặc tin không cần đáp.
- **Bot giao cho người** — bot thôi nói hẳn trong hội thoại đó và để lại lý do cho sale.

Bảng tra đầy đủ mọi lý do giao việc và kết quả đóng việc nằm ở [Lý do bot giao việc và kết quả đóng việc](./tra-cuu-ly-do-giao-viec.md). Trang này giải thích cơ chế.

## Bot chỉ trả lời khi đủ các điều kiện này

1. **Page đang bật bot.** Mỗi page có một công tắc, chỉ Quản trị bật/tắt ([Bật hoặc tắt bot cho một page](./bat-tat-bot.md)). Page tắt thì bot không đọc tin của page đó; tắt giữa chừng thì những tin đang chờ cũng dừng.
2. **Page có sản phẩm để bán.** Page gắn một sản phẩm gốc và một cửa hàng của kho hàng (page cũ chưa chuyển thì còn bán theo bản sao riêng của page). Không có sản phẩm nào thì bot không tư vấn mà giao hội thoại cho sale ([Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md)).
3. **Hội thoại đang do bot giữ.** Trong Hộp thư, «Người giữ» là «Bot AI» và «Giai đoạn» là «Chào», «Tìm hiểu nhu cầu» hoặc «Tư vấn». Khi giai đoạn đã sang «Chốt đơn», «Chờ người», «Sau bán», hoặc người giữ là «Sale» hay «Botcake», bot không tự trả lời nữa.
4. **Tin cuối cùng là của khách.** Nếu page — Botcake, sale, hoặc chính bot — đã nói sau tin của khách thì không còn lượt nào để trả lời.
5. **Hội thoại không mang thẻ đơn đã xử lý.** Hội thoại có thẻ «Đã gửi» (tên thẻ mặc định) hoặc thẻ trạng thái đơn của Pancake (đơn đã đặt, đang chờ, chờ in, đã gửi hàng, đã giao) được coi là xong việc — bot bỏ qua để khỏi làm phiền khách đã mua.

Ngoài ra, máy chạy bot phải đang chạy: khi nó đứng, dải trạng thái trên thanh trên cùng chuyển đỏ («Máy chạy bot đang đứng» hoặc «Máy chạy bot đã tắt giữa chừng») — xem [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md). Khi hệ đang **chạy thử**, bot đọc tin thật và soạn câu trả lời nhưng không gửi cho khách ([Xem câu bot soạn khi đang chạy thử](./xem-chay-thu.md)).

## Khi nào bot im (hội thoại vẫn là của bot)

- **Đợi khách gõ xong.** Khách nhắn dồn nhiều tin liền nhau thì bot chờ, rồi trả lời một lần cho cả cụm — không đáp từng tin.
- **Nhường Botcake.** Trên page còn Botcake, bot đợi khoảng 10 giây (mặc định) để Botcake nói trước. Botcake hoặc sale đã trả lời trong lúc đó thì bot thôi, không tốn lượt AI nào.
- **Tin không cần đáp**, khi bot đã nói ít nhất một lượt trong hội thoại: sticker hoặc ảnh không kèm chữ · "ok", gật đầu khi lượt trước bot không hỏi gì · cảm ơn, ậm ừ · chào lại giữa chừng · bấm lại nút bắt đầu của Messenger. Nếu bot chưa nói câu nào thì những tin này vẫn được xem xét (ảnh có thể là ảnh địa chỉ khách gửi) — riêng lời chào và nút bắt đầu ở tin đầu: khi lớp câu mẫu trên máy chủ đang tắt, bot im để Botcake chào.
- **Tin rác.** Bot nhận ra tin rác thì không trả lời.
<!-- TBD: lớp câu mẫu (giá · ship · cách đặt · lời chào đầu) đang bật hay tắt trên máy chủ ngày 05/10 chưa đo — tài liệu quyết định từng ghi hai lớp này bị tắt vì trùng Botcake — OQ-CH-5 -->

Khách im từ 24 giờ trở lên (mặc định) rồi quay lại thì bot coi như hội thoại bắt đầu lại: tin của khách lúc đó được xét như tin đầu, không bị bỏ qua chỉ vì "bot đã nói rồi".

## Khi nào bot giao cho người

| Tình huống | Bot làm gì |
|---|---|
| Khách khiếu nại (bot nhận ra bằng luật, không cần gọi AI) | Giao ngay |
| AI tự quyết chuyển người: khách đã mua mà hàng lỗi, sai, chưa nhận · đòi đổi trả, hoàn tiền · bị tính sai tiền · tố lừa đảo, chửi, doạ báo cáo hay kiện · đơn giá trị cao bất thường · khách đòi gặp người thật · AI không chắc thông tin | Giao, kèm lý do AI ghi |
| Hết lượt AI trong 24 giờ | Mỗi khách có một số lượt gọi AI trong 24 giờ, tuỳ độ nóng (lạnh · ấm · nóng · đang chốt · sát đơn), tối đa 12. Hết lượt thì giao; khách đã cho cả số điện thoại lẫn địa chỉ thì lý do mang dấu «ƯU TIÊN» |
| Page chưa có sản phẩm để bán | Giao, không bịa |
| Câu bot soạn bị cửa kiểm cuối chặn (ví dụ lọt tiếng Việt) và không sửa được tại chỗ | Giao, để khách không bị bỏ trống |
| Một tin lỗi đã thử lại tối đa 3 lần vẫn không xử lý được | Chuyển hội thoại sang Sale; quản trị đối chiếu tin lỗi ([Đối chiếu tin gửi lỗi](./doi-chieu-tin-loi.md)) |
| Bot vừa chốt đơn | Giai đoạn sang «Chốt đơn», người giữ sang «Sale»; đơn chờ sale duyệt ([Duyệt, sửa hoặc từ chối đơn Messenger chờ duyệt](./duyet-don-messenger.md)) |
| Sale gõ trả lời khách trên Pancake | Hệ nhận ra tin do người gõ (khác các câu bot đã gửi) và chuyển hội thoại sang Sale |
| Sale bấm «Nhận thay bot» ở Hộp thư, hoặc quản trị bấm «Chuyển nhân viên xử lý» ở Cài đặt › Vận hành | Chuyển sang Sale và tạo một việc có hạn 10 phút |

**Do dự không phải lý do giao.** Khách chê đắt, muốn suy nghĩ, chưa có tiền, nghi hiệu quả, so giá — đó là lời phản đối, lúc bot phải bán: bot mời chốt lại tối đa 3 lần, mỗi lần một góc khác (gỡ đúng nỗi lo · trả tiền khi nhận nên không rủi ro · chọn giữa hai gói), rồi mới dừng.

## Giao cho người trông thế nào

**Bot im hẳn.** Bot không gửi câu giữ chân kiểu "nhân viên sẽ hỗ trợ ngay". Pancake chỉ cho hội thoại trôi khỏi danh sách chờ khi page gửi tin; không gửi gì thì tin của khách vẫn nằm đó chưa đọc — sale vẫn thấy, và khách không bị một câu máy đánh lừa là đã có người trả lời.

**Trên Pancake**, bot để lại:

- thẻ «AI back Sale» trên hội thoại (tên mặc định; page phải có sẵn thẻ đúng tên thì mới gắn được);
- ghi chú vào hồ sơ khách, mở đầu «AI CHUYỂN NGƯỜI — cần sale vào hỗ trợ», dòng dưới «Lý do: …».

**Trong Hộp thư**, khối «Bot đã làm gì» của hội thoại cho biết «Giai đoạn», «Người giữ», «Vì sao chuyển», và — nếu có việc — «Đang xử» (ai đang nhận).

Theo bản đang chạy, chỉ «Nhận thay bot», «Chuyển nhân viên xử lý» và việc về đơn hàng mới tạo một dòng việc ở tab «Cần bạn» và màn «Việc đang chờ» (kèm đồng hồ 10 phút). Đơn bot chốt cũng hiện ở «Cần bạn» dưới dạng đơn chờ duyệt. Những hội thoại bot **tự** giao — khiếu nại, hết lượt, page chưa có sản phẩm, cửa kiểm chặn, lỗi lặp, sale gõ trên Pancake — đổi sang người giữ «Sale» nhưng chưa thành dòng việc. Hệ chưa đưa chúng vào «Cần bạn». Hiện tại: theo dõi thẻ «AI back Sale» trên Pancake, và trong Hộp thư bấm lối «Mọi hội thoại gần đây» để thấy các hội thoại 7 ngày qua có giai đoạn «Chờ người» ([Đọc hội thoại và bối cảnh khách trước khi trả lời](./doc-hoi-thoai-boi-canh.md)).
<!-- TBD: menu ghi «Việc đang chờ — Khách bot đã giao lại» nhưng mã giao tự động của bot (khiếu nại, hết lượt, page chưa có sản phẩm, cửa kiểm, lỗi lặp, sale gõ tay) không tạo dòng việc — cần người quyết xác nhận đây là nợ hay ý đồ, và cách sale theo dõi chính thức — OQ-CH-2 -->

## Trả hội thoại lại cho bot

Sale chưa có nút trả hội thoại lại cho bot. Hiện tại: nhờ Quản trị. Quản trị mở Cài đặt › «Hệ còn sống», ở khối «Việc vận hành», dòng «Tin cần đối chiếu», bấm «Đối chiếu» (hoặc mở thẳng `/van-hanh-v3?tab=conversations`), bấm «Mở hội thoại» ở hội thoại cần trả, gõ lý do vào ô «Lý do tiếp tục / đối soát / bàn giao (5–300 ký tự, không ghi thông tin cá nhân)», rồi bấm «Cho AI tiếp tục». Hệ chỉ cho trả khi hội thoại đang «Chờ người» với người giữ Sale, không còn tin nào chưa xử lý, và chưa có thông tin đơn; nếu không thì báo «Còn tin chưa xử lý hoặc có thông tin đơn; phải giải quyết trước khi trả AI».

![Hộp thư: khối «Bot đã làm gì» cho biết giai đoạn, người giữ và vì sao bot chuyển](images/khi-nao-bot-tra-loi.png)

<!-- CHỤP: anh=khi-nao-bot-tra-loi · vai=sale · duong=/ban-hoi-thoai · cho=«Mọi hội thoại gần đây»
     thao_tac=bấm «Mọi hội thoại gần đây» · bấm hội thoại đầu tiên trong danh sách · bấm «Khách» (nếu cột bối cảnh đang ẩn)
     trang_thai=một hội thoại đang mở; cột phải hiện khối «Bot đã làm gì» với các dòng «Giai đoạn», «Người giữ», «Vì sao chuyển»
     danh_dau=(1) «Giai đoạn» · (2) «Người giữ» · (3) «Vì sao chuyển» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Dòng «Giai đoạn» | «Chào», «Tìm hiểu nhu cầu», «Tư vấn» là lúc bot còn tự trả lời |
| (2) | Dòng «Người giữ» | «Bot AI» là bot đang giữ; «Sale» là đã giao cho người |
| (3) | Dòng «Vì sao chuyển» | Lý do bot dừng — đọc trước khi sang Pancake trả lời |

__Thuật ngữ chính:__ giai đoạn · người giữ · nhận thay bot · việc · thẻ «AI back Sale» · chạy thử — xem [Thuật ngữ](./thuat-ngu.md).
