# Bot ghép câu trả lời từ bốn tầng

> Trang này giải thích bot lấy lời từ đâu khi trả lời khách trên một page, ai sửa tầng nào, và vì sao sửa một chỗ thì bot đổi ở nhiều page — dành cho marketer và quản trị; sale đọc để biết bot "biết" những gì.

Bot không đọc một khối chữ duy nhất cho mỗi page. Nó ghép bốn tầng, từ chung nhất tới riêng nhất, cộng thêm hai khối dùng chung. Sản phẩm là lõi của câu trả lời: một sản phẩm bán ở nhiều thị trường, mỗi thị trường nhiều page — nên phần lớn nội dung nằm ở sản phẩm, page chỉ giữ phần lời riêng.

## Bốn tầng

Trên màn «Sản phẩm & kho», khi mở một sản phẩm, dải ngay dưới tên sản phẩm vẽ đúng bốn tầng này: «① Luật chung» · «② Sản phẩm · chung» · «③ Sản phẩm · theo shop POS» · «④ Page».

| Tầng | Gồm | Áp cho | Ai sửa | Sửa ở đâu |
|---|---|---|---|---|
| ① Quy tắc chung | Luật cứng của bot: ngôn ngữ và giọng, trung thực về giá, quy trình chốt đơn COD, chống làm phiền khách, chống đơn trùng, khi nào chuyển người, không hứa vượt thẩm quyền, bảo vệ thông tin khách, chủ động bán | Mọi page của team | Quản trị | Page › «Luật chung» › tab «Luật» (màn «Quy tắc chung mọi page») |
| ② Sản phẩm · chung | Kiến thức sản phẩm: «Công dụng», «Thành phần», «Cách dùng», «Hợp với», «Hỏi size trước khi chốt», «Lưu ý / cảnh báo», «Khách hay hỏi · thông tin thêm» | Mọi thị trường và mọi page bán sản phẩm đó | Quản trị · Marketer phụ trách | Sản phẩm › tab «Chung» |
| ③ Sản phẩm · theo thị trường | Đúng một món của kho hàng ở cửa hàng nước đó, bậc giá theo tiền tệ nước đó, tồn | Mọi page bán sản phẩm đó ở cửa hàng đó | Quản trị (marketer chỉ xem) | Sản phẩm › tab «Theo thị trường» |
| ④ Page | Lời bot của page: «Giọng điệu / phong cách», «Câu chào mở đầu», «Cách bán / điểm mạnh riêng», năm câu «Trả lời nhanh»; ảnh gửi khách | Đúng page đó | Quản trị · Marketer | Trang một page: tab «Lời bot», tab «Ảnh» |

Thứ tự này cũng là thứ tự thẩm quyền: **quy tắc chung luôn thắng lời bot của page**. Lời bot chỉ được đổi giọng, câu chào và cách bán; dù lời bot viết gì, bot vẫn giữ luật cứng (mỗi tin tối đa 2–3 dòng, không gạch đầu dòng, chỉ chào ở tin đầu, không báo giá ngoài bảng giá…).

Một ô kiến thức để trống thì bot không nói về chủ đề đó. Riêng ô «Hỏi size trước khi chốt» để trống thì bot không hỏi size.

## Page phải gắn sản phẩm mới chat được

Quyết định của hệ: bot chỉ chào bán trên page đã gắn **một sản phẩm gốc và một cửa hàng** của kho hàng, và chỉ chào đúng món của sản phẩm đó ở cửa hàng đó. Việc gắn page do Quản trị làm ([Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md)).

Hệ đang trong giai đoạn chuyển, nên hôm nay có ba trường hợp:

| Page | Bot bán theo gì |
|---|---|
| Đã gắn sản phẩm gốc + cửa hàng | Đúng món của sản phẩm ở cửa hàng đó, giá và ảnh theo Sản phẩm › «Theo thị trường» |
| Chưa gắn, nhưng còn «Bản sao theo page» (dữ liệu sản phẩm cũ riêng của page) | Vẫn bán theo bản sao đó. Màn Sản phẩm đếm «… page chưa chuyển xong»; khi bộ đếm về 0, đường bản sao cũ sẽ cắt ([Chuyển page cũ sang sản phẩm](./chuyen-page-cu.md)) |
| Chưa gắn, không có bản sao | Không có gì để bán: bot không tư vấn mà giao hội thoại cho sale, và page không bật được bot |

## Không có giá riêng theo page

Giá thuộc **món × cửa hàng**, không thuộc page. Mọi page cùng sản phẩm và cùng cửa hàng dùng chung một bảng giá, sửa ở Sản phẩm › «Theo thị trường» ([Sửa bảng giá của sản phẩm ở một thị trường](./sua-bang-gia.md)). Trên trang một page, tab «Sản phẩm & giá» của page đã gắn chỉ để xem.

Dải bốn tầng trên màn còn ghi «kịch bản · giá · ảnh của page» ở ô «④ Page», nhưng giá không đặt theo page. Chỗ duy nhất page còn "nói giá" là chữ gõ tay trong lời bot — ví dụ ô «Trả lời nhanh — hỏi giá». Khi giá gõ tay đó lệch bảng giá, trang page báo «Bot đang báo cho khách … giá KHÔNG có trong bảng giá»: khách nghe giá gõ tay, còn đơn tạo ra tính theo bảng giá. Thấy cảnh báo này thì sửa lại câu trong tab «Lời bot».

## Hai khối dùng chung

**Chính sách · FAQ · Phản đối.** Ba khối bot trích khi khách hỏi đúng chủ đề — chính sách (giao hàng, đổi trả…), câu hỏi thường gặp, và cách gỡ lời từ chối — dùng chung **mọi page của team**. Quản trị và marketer sửa ở màn «Chính sách · FAQ · Phản đối»; bấm «Lưu — mọi page dùng ngay» để lưu bản mới cho cả team (mỗi lần lưu là một bản). Ba khối cộng lại tối đa 60.000 ký tự, vì mọi lượt chat đều gửi chúng cho AI. Bot chỉ giữ **một bộ** ba khối cho mọi page; team không giữ bộ đó thì màn khoá ô và báo «Team này không sửa được bộ khối của bot». Xem [Sửa Chính sách · FAQ · Phản đối dùng chung mọi page](./chinh-sach-faq-phan-doi.md).
<!-- TBD: theo mã, khi máy chủ bật cách ghép lời mới (điều kiện để bật bot), bộ ghép chỉ đưa quy tắc chung + sản phẩm + lời bot vào đoạn chữ gửi cho AI — chưa thấy ba khối Chính sách · FAQ · Phản đối; màn «Đoạn chữ gửi cho AI» cũng không có khối cho chúng. Cần xác nhận bot có thật sự đọc ba khối không — OQ-CH-6 -->

**Câu trả lời sẵn.** Lớp đứng **trước** AI: câu hỏi quen khớp từ khoá — hỏi giá, hỏi ship, hỏi cách đặt hàng, hỏi hàng thật/giả, hỏi size — được trả bằng câu mẫu, không gọi model, không tốn tiền. Câu bot gửi lấy từ năm ô «Trả lời nhanh — …» trong lời bot của page. Ô để trống thì AI tự trả lời — trừ hai chủ đề có câu dựng sẵn: hỏi giá (bot gửi bảng giá kèm ảnh, dựng từ giá đang có) và hỏi cách đặt hàng (câu hướng dẫn mặc định).

Dù khớp từ khoá, bot vẫn nhường cho AI khi:

- khách vừa cho số điện thoại, hoặc đang ở giữa lượt chốt đơn;
- câu mẫu khác ngôn ngữ khách đang dùng;
- câu mẫu đó đã gửi một lần trong hội thoại mà khách hỏi lại;
- riêng với hỏi giá, ship, cách đặt hàng: khách phản đối giá, từ chối, nói rõ muốn mua, hoặc tin dài hơn 12 từ.

Câu mẫu cho hỏi giá, ship, cách đặt hàng còn phụ thuộc một công tắc trên máy chủ (từng được tắt để khỏi trùng Botcake); khi công tắc đó tắt, AI trả lời các câu này.
<!-- TBD: công tắc lớp câu mẫu trên máy chủ ngày 05/10 đang bật hay tắt — chưa đo — OQ-CH-5 -->

Màn «Câu trả lời sẵn» (Page › «Luật chung» › tab «Trả lời sẵn») giữ danh sách mẫu, từ khoá, và đếm «Đã khớp», «Tiền tiết kiệm». Xem [Thêm, sửa câu trả lời sẵn theo từ khoá](./cau-tra-loi-san.md).
<!-- TBD: mã bot đọc câu trả lời từ các ô «Trả lời nhanh» của lời bot page và luật từ khoá cố định; chưa thấy đường bot đọc chữ mẫu lưu ở màn «Câu trả lời sẵn» (màn đó chỉ được bot cộng bộ đếm theo mã mẫu) — cần xác nhận sửa mẫu ở màn này có đổi lời bot không — OQ-CH-3 -->

## Lưu là chạy — trừ quy tắc chung

| Bạn sửa | Khi nào bot dùng |
|---|---|
| Lời bot của page | Ngay khi bấm «Lưu — bot dùng ngay»; mỗi lần lưu là một bản, bản cũ giữ ở tab «Lịch sử» để chạy lại ([Xem lịch sử lời bot và chạy lại một bản cũ](./lich-su-loi-bot.md)) |
| Kiến thức sản phẩm | Khi bấm «Lưu — mọi page dùng ngay» (xem điều kiện ở mục dưới) |
| Chính sách · FAQ · Phản đối | Thành bản của cả team ngay khi bấm «Lưu — mọi page dùng ngay» |
| Giá theo thị trường, gắn page | Khi Quản trị lưu — mọi page cùng sản phẩm × cửa hàng đổi theo |
| Quy tắc chung | **Không** lưu là chạy: «Lưu bản nháp» chưa có hiệu lực; Quản trị mở «So sánh» rồi áp một bản thì bản đó mới thành bản đang dùng của cả team ([Soạn bản mới cho quy tắc chung mọi page](./sua-quy-tac-chung.md)) |
| Gợi ý từ AI | Phải được Quản trị duyệt, rồi áp ở màn quy tắc chung ([Duyệt hoặc từ chối gợi ý từ AI](./duyet-goi-y-ai.md)) |

Ngoài trường hợp ở mục dưới, mỗi lượt lưu hoặc có hiệu lực với bot, hoặc báo lỗi rõ — không có cảnh "đã lưu" mà bot vẫn chạy bản cũ.

## Khi máy chủ chưa bật cách ghép lời mới

Bot chỉ đọc **quy tắc chung của team** và **kiến thức sản phẩm** từ hệ khi máy chủ đã bật cách ghép lời mới. Đây cũng là một điều kiện bắt buộc để bật bot: chưa bật thì khối «Bật được chưa» của mọi page ghi «Máy chủ chưa bật cách ghép lời mới», cột «Còn thiếu gì» ở «Tất cả page» ghi «Chưa bật cách ghép lời», và không page nào bật được. Trong lúc đó:

- màn «Quy tắc chung mọi page» hiện «Bot CHƯA đọc quy tắc chung» — bản bạn áp vẫn được giữ và sẽ dùng khi bật;
- tab «Chung» của sản phẩm hiện «Bot CHƯA đọc phần kiến thức này» — lưu vẫn giữ lại, chưa tới bot.

Không thấy hai hộp cảnh báo trên nghĩa là bot đang đọc đủ bốn tầng. Bật cách ghép lời mới là việc của người quản trị hệ thống ([Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md)).
<!-- TBD: tài liệu phát hành 05/10 ghi máy chủ chưa bật cách ghép lời mới và 0 page bật bot; trang viết theo hộp cảnh báo trên màn — OQ-CH-4 -->

## Xem bot đang đọc gì trên một page

Trên trang một page, ô «AI đang đọc gì trên page này» ở cột phải cho biết bản quy tắc chung (hoặc «bộ gốc trong mã»), bản lời bot đang chạy, và số món · giá · ảnh bot đang đọc. Nút «Xem nguyên văn đoạn chữ gửi AI» mở đúng đoạn chữ model đọc trước khi trả lời. Xem [Xem đúng đoạn chữ AI đang đọc trên một page](./xem-doan-chu-ai-doc.md).

![Màn Sản phẩm & kho: dải bốn tầng bot ghép lời ngay dưới tên sản phẩm](images/bon-tang-cau-tra-loi.png)

<!-- CHỤP: anh=bon-tang-cau-tra-loi · vai=quan-tri · duong=/san-pham · cho=«① Luật chung»
     thao_tac=bấm dòng sản phẩm đầu tiên trong danh sách sản phẩm ở cột trái
     trang_thai=một sản phẩm đang mở, tab «Chung» đang chọn, dải bốn tầng hiện đủ bốn ô ngay dưới tên sản phẩm
     danh_dau=(1) «① Luật chung» · (2) «② Sản phẩm · chung» · (3) «④ Page» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô «① Luật chung» | Tầng áp cho cả team — Quản trị sửa ở Page › «Luật chung» |
| (2) | Ô «② Sản phẩm · chung» | Kiến thức sản phẩm — sửa ngay ở tab «Chung» bên dưới |
| (3) | Ô «④ Page» | Lời bot và ảnh riêng của từng page — sửa ở trang một page |

__Thuật ngữ chính:__ quy tắc chung · kiến thức sản phẩm · sản phẩm gốc · cửa hàng · bậc giá · lời bot · câu trả lời sẵn · Chính sách · FAQ · Phản đối — xem [Thuật ngữ](./thuat-ngu.md).
