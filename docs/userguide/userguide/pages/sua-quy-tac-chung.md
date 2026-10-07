# Soạn bản mới cho quy tắc chung mọi page

> Trang này hướng dẫn người quản trị soạn, so sánh và áp một phiên bản mới của quy tắc chung — khối luật mọi page trong team cùng dùng, đứng trước và thắng lời bot riêng của từng page.

**Ai làm được:** Quản trị. Marketer và Sale không mở được màn này.

__Khi nào dùng:__ cần đổi cách bot nói ở mọi page cùng lúc (ví dụ thêm luật không hứa ngày giao, đổi cách xưng hô); cần lùi về một bản cũ khi bản mới làm bot nói sai; có bản do AI đề xuất đã được duyệt cần áp.

__Trước khi bắt đầu:__
- **Sửa là cả team đổi cách nói.** Áp một bản là mọi page của team dùng bản đó ở lượt chat kế tiếp, kể cả page đang nói chuyện với khách thật. Lời bot riêng của từng page chỉ đổi giọng, câu chào, cách bán — không thắng được quy tắc chung (xem [Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md)).
- **Lưu không phải là áp.** Lưu tạo một bản nháp mới; bot chỉ đổi khi bạn bấm áp ở bước so sánh.
- **Kế thừa bản toàn hệ.** Team chưa có bản riêng thì dùng bản chung của cả hệ. Soạn và áp một bản là team có bản riêng, bản riêng thắng bản chung. Màn này không sửa và không áp được bản toàn hệ.

## Các bước

1. Mở **Page → Luật chung** (tab «Luật», đường dẫn `/bo-luat`).
   → *Kết quả:* trang «Quy tắc chung mọi page». Hàng số đầu trang: «Page dùng bộ quy tắc này», «Trong đó đang bật bot» (kèm vài tên page ví dụ), «Bản đang áp» (kèm ước lượng cỡ mỗi lượt chat), «Chờ duyệt hoặc chưa áp».
2. Đọc bảng «Các phiên bản».
   → *Kết quả:* mỗi bản một dòng: «Phiên bản» (nhãn «Toàn hệ», «AI đề xuất» nếu có), «Trạng thái», «Cỡ» (số ký tự), «Người sửa», «Lúc», nút «So sánh». Góc bảng ghi «… bản của team · … bản toàn hệ».
3. Ở khung «Soạn bản mới», bấm «Chép bản đang áp vào ô» để bắt đầu từ bản đang chạy.
   → *Kết quả:* ô soạn có toàn văn bản đang áp; dòng đếm ghi «… ký tự · ≈ … token (ước lượng) · bản đang áp … ký tự».
4. Sửa nội dung trong ô.
   → *Kết quả:* dòng đếm cập nhật theo từng chữ.
5. Bấm «Lưu bản nháp».
   → *Kết quả:* thông báo «Đã lưu bản nháp v…. Chưa áp — bot vẫn chạy bản cũ.» Bản mới đứng đầu bảng với trạng thái «Bản nháp».
6. Bấm «So sánh» ở dòng bản vừa lưu.
   → *Kết quả:* ngăn kéo bên phải «v… so với v… đang áp», nhãn «+… dòng», «−… dòng», chênh lệch cỡ, và từng dòng thêm/bỏ. Chân ngăn kéo ghi «Đổi cách nói của … page, trong đó … page đang bật bot.» cạnh nút «Áp bản v…».
7. Bấm «Áp bản v…», đọc hộp xác nhận rồi bấm «Áp bản này».
   → *Kết quả:* thông báo «Đã áp bản v…. … page dùng bản này từ lượt chat kế tiếp.» Bản đó thành «Đang áp»; bản trước thành bản cũ, vẫn nằm trong bảng để lùi về.

![Màn «Quy tắc chung mọi page» — hàng số ảnh hưởng, bảng «Các phiên bản» và ngăn kéo «So sánh»](images/sua-quy-tac-chung.png)

<!-- CHỤP: anh=sua-quy-tac-chung · vai=quan-tri · duong=/bo-luat · cho=«Các phiên bản»
     thao_tac=bấm «So sánh» ở dòng đầu bảng «Các phiên bản»
     trang_thai=ngăn kéo «So sánh» đang mở, thấy nhãn số dòng thêm/bỏ, các dòng khác nhau và nút áp ở chân ngăn kéo; phía sau là hàng số «Page dùng bộ quy tắc này»
     danh_dau=(1) «Page dùng bộ quy tắc này» · (2) «So sánh» · (3) «Áp bản» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Hàng số ảnh hưởng | Bao nhiêu page dùng bộ quy tắc, bao nhiêu đang bật bot — đọc trước khi áp |
| (2) | Nút «So sánh» | Xem bản này khác bản đang áp ở dòng nào |
| (3) | Nút «Áp bản v…» / «Lùi về bản v…» | Cho bản này chạy cho cả team — có hộp xác nhận |

## Lùi về một bản cũ

Bấm «So sánh» ở dòng bản cũ cần lùi về. Chân ngăn kéo hiện nút «Lùi về bản v…»; bấm, xác nhận «Lùi về bản này». Lùi và áp là cùng một thao tác — bản được lùi về thành «Đang áp», không bản nào bị xoá.

## Trạng thái của một bản

| Nhãn | Nghĩa | Chân ngăn kéo «So sánh» |
|---|---|---|
| «Đang áp» | Bản cả team đang dùng | «Bản này đang áp» |
| «Bản nháp» | Bản người viết, chưa áp — áp thẳng được | Nút «Áp bản v…» hoặc «Lùi về bản v…» |
| «Đã duyệt» | Bản đã có người duyệt, chưa áp | Nút áp |
| «AI đề xuất — CHƯA duyệt» | Bản do AI đề xuất, chưa ai duyệt — không áp được | «Bản do AI đề xuất phải có người duyệt mới áp được.» + nút «Duyệt bản v…» (xem [Duyệt hoặc từ chối gợi ý từ AI](./duyet-goi-y-ai.md)) |
| «Bản kế thừa» (nhãn «Toàn hệ») | Bản chung của cả hệ | «Bản toàn hệ dùng chung mọi team — màn này không sửa và không áp nó được. Soạn một bản riêng của team.» |

## Hộp thông báo đầu trang

| Hộp | Nghĩa |
|---|---|
| «Bot CHƯA đọc quy tắc chung» | Máy chủ chưa bật cách ghép lời mới: bot vẫn dùng khối quy tắc gốc cố định, áp ở đây chưa đổi lời bot (bản áp vẫn được giữ cho lúc bật). Hộp xác nhận áp và thông báo sau khi áp cũng nói rõ điều này |
| «Chưa biết bot có đọc quy tắc chung không» | Máy chủ chưa nối phép đo — đừng coi áp là bot đã đổi cách nói |
| «Không có bản nào đang áp» | Bot đang đọc bảng này mà team chưa áp bản nào: bot chỉ dùng khối quy tắc gốc cố định. Áp một bản ở bảng phiên bản |
| «Chưa có bản nào đang áp» | Bot chưa đọc bảng này nên khách chưa bị ảnh hưởng; áp sẵn cho lúc bật |
| «… bản do AI đề xuất chưa ai duyệt» | Có bản AI chờ duyệt |
| «Số page đang bật bot lệch với cơ sở dữ liệu» | Hai nguồn đếm page bật bot nói khác nhau — soát ở danh sách page |

Dòng chú thích dưới hộp: «Team này chưa có bộ quy tắc riêng: đang dùng bản chung của cả hệ…» (đang kế thừa) và «… bản nháp chưa áp — chưa ảnh hưởng gì tới bot…».

## Xử lý khi lỗi

| Câu trên màn | Nghĩa | Cách xử lý |
|---|---|---|
| «Ô soạn đang trống.» | Bấm lưu khi ô trống | Gõ hoặc chép nội dung |
| «bộ luật chung chỉ có … ký tự — quá ngắn (tối thiểu 200). …» | Bản quá ngắn — gần như chắc là dán nhầm | Kiểm lại nội dung |
| «nội dung không khác bản đang áp — không tạo bản trùng.» | Chưa sửa gì | Sửa rồi lưu |
| «Chưa có bản nào đang áp để chép» — «Soạn từ đầu trong ô bên trên.» | Bấm chép khi team chưa áp bản nào | Soạn từ đầu |
| «Không áp được bản này» · «bản v… đang áp rồi.» | Bản đã là bản đang áp | Không cần làm gì |
| «Không áp được bản này» · «bản v… là ĐỀ XUẤT CỦA AI và chưa ai duyệt …» | Bản AI chưa duyệt | Duyệt trước |
| «Không tải được bộ quy tắc» | Máy chủ không trả được dữ liệu | Kiểm kết nối rồi tải lại trang |

Cả hệ trống (không bản của team, không bản toàn hệ): bảng ghi «Chưa có bộ luật chung nào — cả bản của team lẫn bản toàn hệ đều trống. Bot dùng khối quy tắc gốc cố định có sẵn trong mã cho tới khi có bản được áp.»

## Lưu ý

- Cỡ «≈ … token» là ước lượng theo số ký tự, không phải số đo của nhà model.
- Hai quản trị bấm áp cùng lúc thì người sau xếp hàng chờ người trước — không giẫm lên nhau.
- Lưu, duyệt và áp đều ghi nhật ký (**Cài đặt → Nhật ký**).
- Trang của từng page chỉ hiện tóm tắt quy tắc chung («① Luật chung — Đang dùng bản …») kèm lối «Xem và sửa →» về màn này.

## Liên quan

[Duyệt hoặc từ chối gợi ý từ AI](./duyet-goi-y-ai.md) · [Sửa Chính sách · FAQ · Phản đối dùng chung mọi page](./chinh-sach-faq-phan-doi.md) · [Thêm, sửa câu trả lời sẵn theo từ khoá](./cau-tra-loi-san.md) · [Bot ghép câu trả lời từ bốn tầng](./bon-tang-cau-tra-loi.md) · [Xem đúng đoạn chữ AI đang đọc trên một page](./xem-doan-chu-ai-doc.md)
