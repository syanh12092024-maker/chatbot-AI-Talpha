# Chọn model AI, thay khoá và thử một lượt

> Trang này hướng dẫn người quản trị chọn model trả lời khách cho team, dán khoá của nhà model, thử khoá bằng một lượt gọi thật và đọc bảng giá — ở màn Cài đặt → Model.

**Ai làm được:** Quản trị đổi model, dán khoá và thử. Vai Quản lý (vai cũ, không còn cấp mới) mở được màn để xem; mọi ô bị khoá và dòng cạnh nút lưu ghi «Vai của bạn chỉ xem được.»

__Khi nào dùng:__ cài team lần đầu; khi muốn đổi sang model rẻ hơn hoặc tốt hơn; khi khoá nhà model hết hạn, bị từ chối hoặc tài khoản nhà model hết tiền.

__Trước khi bắt đầu:__
- Cấu hình model và khoá thuộc **team đang mở**. Mỗi team chọn riêng.
- Chuẩn bị khoá API của nhà model bạn định dùng. Bốn nhà: Anthropic Claude · Moonshot Kimi · OpenAI · DeepSeek.
- Đổi model không cần khởi động lại: lượt chat kế tiếp của bot đi model mới.

## Đọc màn trước khi đổi

Mở **Cài đặt → Model** (đường dẫn `/model-ai`, tiêu đề «Model AI & khoá»).

- Ô nhắc đầu màn: «Màn chỉ hiện thứ bot THẬT SỰ dùng.» kèm số page bot đang xử của team, và câu «"Dự phòng" và "việc nền" chưa nối vào đường trả lời nào.»
- Nhãn góc phải: «Chưa lưu cấu hình riêng — bot dùng model của máy chủ» khi team chưa từng lưu; «Sửa lần cuối {giờ}» khi đã lưu.
- Thẻ **«Trả lời khách»** — «Model trả lời khách. Đây là chỗ tiền chảy.» Nhãn «Đang dùng»: bot đọc ô này mỗi lượt trả lời. Hộp nhỏ trong thẻ nói bot đang thật sự gọi model nào, bằng khoá nào («khoá riêng của team» hay «khoá chung của máy chủ»).
- Thẻ **«Dự phòng»** — «Dành cho lúc nhà chính hỏng hoặc hết tiền. BẮT BUỘC khác nhà với model chính.» Nhãn «Chưa nối». **Hệ chưa tự chuyển sang dự phòng khi model chính hỏng.** Màn ghi: «Đã lưu, nhưng đường trả lời khách CHƯA tự chuyển sang khi model chính hỏng.» Nhà chính hết tiền là bot đứng im cho tới khi bạn đổi model hoặc nạp tiền.
- Thẻ «Việc nền» ẩn tới khi có việc đầu tiên dùng tới; trong lúc ẩn, một dòng ghi chú cho biết model đang lưu cho việc nền.

**Khi team chưa lưu cấu hình:** bot gọi model mặc định khai trong cấu hình máy chủ, bằng khoá chung của máy chủ. Hộp trong thẻ «Trả lời khách» nói rõ điều đó và nhắc: bấm «Lưu cấu hình» hoặc dán khoá ở đây là bot chuyển sang dùng lựa chọn trên màn.

## Các bước

1. Ở thẻ «Trả lời khách», chọn model trong ô «Model».
   → *Kết quả:* ô «Khoá API · {nhà}» đổi theo nhà của model vừa chọn, kèm trạng thái khoá của nhà đó: «khoá riêng của team», «khoá chung của máy chủ», hoặc «chưa có khoá — bot sẽ KHÔNG gọi được». Dòng dưới ô chọn ghi giá «{x} đ/tin · {y} đ/đơn». Model mà nhà chưa có khoá mang chữ «(chưa có khoá)» trong danh sách.
2. Kéo «Độ ngẫu nhiên» nếu cần (0 đến 1, bước 0,05).
   → *Kết quả:* con số cạnh nhãn đổi theo. «0 = ổn định, giống nhau mỗi lần; 1 = đa dạng nhưng khó lường.»
3. (Tuỳ chọn) Ở thẻ «Dự phòng», chọn một model **khác nhà** với model chính.
   → *Kết quả:* lựa chọn được giữ để dùng khi hệ nối dự phòng; hôm nay nó chưa đỡ cho bot.
4. Bấm «Lưu cấu hình».
   → *Kết quả:* thông báo «Đã lưu. Lượt chat kế tiếp của bot đi model mới.»; nhãn góc phải đổi thành «Sửa lần cuối …».
5. Dán khoá API vào ô «Khoá API · {nhà}» của thẻ (bỏ qua bước này nếu nhà đó đã có khoá).
   → *Kết quả:* ô ẩn ký tự. Để trống nghĩa là giữ khoá đang có.
6. Bấm «Thay khoá và thử một lượt».
   → *Kết quả:* hệ lưu khoá (nếu bạn vừa dán) rồi gọi đúng model đang lưu của thẻ **một lần**. Thành công: thông báo «{model}: khoá dùng được.», thẻ mang nhãn «Khoá dùng được», dòng cạnh nút ghi «Lượt thử lúc {giờ} · {model}: Khoá dùng được (…) · trả lời sau {x} giây».

![Màn Model AI & khoá — thẻ «Trả lời khách» với nút thử một lượt](images/chon-model-ai.png)

<!-- CHỤP: anh=chon-model-ai · vai=quan-tri · duong=/model-ai · cho=«Trả lời khách»
     thao_tac=
     trang_thai=thấy hai thẻ «Trả lời khách» (nhãn «Đang dùng») và «Dự phòng» (nhãn «Chưa nối»); mỗi thẻ có ô «Model», ô «Khoá API · …»; thẻ đầu có thanh «Độ ngẫu nhiên» và nút «Thay khoá và thử một lượt»; bên dưới là nút «Lưu cấu hình»
     danh_dau=(1) «Trả lời khách» · (2) «Thay khoá và thử một lượt» · (3) «Lưu cấu hình» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Thẻ «Trả lời khách» | Chọn model, đọc hộp «Bot đang gọi …» để biết bot thật sự dùng gì |
| (2) | Nút «Thay khoá và thử một lượt» | Dán khoá (nếu cần) rồi bấm — gọi thật một lần |
| (3) | Nút «Lưu cấu hình» | Lưu model và độ ngẫu nhiên; khoá lưu bằng nút thử của từng thẻ |

## Bảng giá

Bấm dòng «Bảng giá bảy model» ở cuối màn để mở bảng. Dòng tiêu đề kèm số tin mỗi đơn và tỉ giá đ/USD đang dùng.

| Cột | Nghĩa |
|---|---|
| «Model» | Tên model; nhãn «Đang dùng» cho model chính hiện tại; «Giá suy ngược» khi chưa ai mở tài khoản nhà đó — giá giải ngược, chưa phải giá công bố |
| «Nhà» | Nhà model |
| «Mỗi tin» | Tiền ước cho một tin bot trả lời |
| «Mỗi đơn» | Tiền ước cho một đơn — so bằng cột này |
| «So với đang dùng» | Bội số so với model chính hiện tại; xanh khi rẻ hơn, đỏ khi đắt hơn 1,5 lần |

Màn ghi: «So bằng tiền mỗi đơn, không phải mỗi tin: model khôn chốt bằng ít tin hơn.» Cột «mỗi đơn» là số ước từ số tin trên một đơn đã đo, không phải số đo mới. Bảng xếp rẻ nhất lên đầu.

## Xử lý khi lỗi

Kết quả thử hiện ở dòng cạnh nút và trên nhãn của thẻ:

| Câu trên màn | Nghĩa · làm gì |
|---|---|
| «Bạn vừa đổi sang {model} mà chưa lưu — bấm «Lưu cấu hình» trước rồi thử…» | Lượt thử luôn gọi model đang lưu. Lưu trước rồi thử |
| «vừa thử xong — chờ {n} giây rồi thử lại.» | Mỗi team chỉ thử được một lượt mỗi 10 giây — chặn bấm dồn vì mỗi lượt tốn tiền thật |
| «Chưa có khoá của {nhà}» | Dán khoá rồi thử lại |
| «Khoá bị từ chối (401)» / «(403)» | Khoá sai hoặc đã bị thu hồi — lấy khoá mới |
| «Tài khoản hết tiền (402)» | Nạp tiền tài khoản nhà model, hoặc đổi sang model nhà khác rồi lưu |
| «Nhà model đang giới hạn lượt gọi (429) — thử lại sau» | Chờ rồi thử lại |
| «Quá 20 giây không trả lời» | Nhà model chậm hoặc nghẽn — thử lại sau |
| «Chưa nối đường chọn model của bot — không thử được…» | Máy chủ chưa cho màn đo đường của bot; nhờ người quản trị hệ thống |

Các lỗi khi lưu:
- «dự phòng "{model}" cùng nhà "{nhà}" với model chính "{model}". Hết tiền hoặc khoá hỏng là hỏng cả hai — chọn model của nhà khác.» — chọn dự phòng ở nhà khác.
- Hộp đỏ «Bot không gọi được model trả lời khách» ở đầu màn (kèm nút «Dán khoá»): model chính chưa có khoá, mọi lượt trả lời khách sẽ hỏng. Bấm «Dán khoá» để nhảy tới ô khoá.
- Hộp «Không tải được cấu hình model» hoặc «Không lưu được cấu hình»: đọc câu kèm theo, tải lại trang.

## Lưu ý

- Dán khoá ghi khoá **cho nhà model** trong team: mọi thẻ dùng nhà đó đọc ra khoá mới.
- Ô khoá trống không xoá khoá. Xoá khoá chưa làm được trên màn này.
- Đổi model mặc định hoặc khoá chung của máy chủ là việc của người quản trị hệ thống — xem [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md).
- Mỗi lượt lưu, dán khoá và thử đều vào nhật ký («Đổi cấu hình model», «Đổi khoá API», «Thử model một lượt») — khoá không bao giờ được ghi ra. Xem [Tra nhật ký: ai đã làm gì, lúc nào](./tra-nhat-ky.md).

__Liên quan:__ [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md) · [Tìm page tốn tiền AI mà không ra đơn](./tim-page-ton-tien-ai.md) · [Bắt đầu nhanh cho Quản trị: đưa page đầu tiên tới lúc bật bot](./bat-dau-nhanh-quan-tri.md)
