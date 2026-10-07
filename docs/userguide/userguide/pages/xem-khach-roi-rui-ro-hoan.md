# Xem khách rơi ở đâu và rủi ro hoàn

> Trang này giúp chủ team và marketer đọc tab «Khách» của Số liệu (màn «Khách vào từ đâu») để biết hội thoại đang dừng ở bước nào và khách hai luồng rơi ở đâu; đồng thời giúp Quản trị đọc phân bố rủi ro hoàn ở màn «Rủi ro hoàn hàng».

**Ai làm được:** Quản trị · Marketer mở tab «Khách». Khối «Rủi ro hoàn — bốn tầng», liên kết «Xem đủ →», «Tra một khách cụ thể →» và màn «Rủi ro hoàn hàng» (`/rui-ro-hoan`) chỉ Quản trị thấy và mở được. Cả hai màn chỉ đọc. Sale không mở được hai màn này (sale gặp tầng rủi ro hoàn ngay trong Hộp thư — xem [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md)).

__Khi nào dùng:__ khi bạn muốn biết khách đang kẹt ở bước nào của cuộc chat, luồng trang bán hàng mất khách ở đâu, hai luồng ra bao nhiêu đơn trong 30 ngày, hoặc (Quản trị) bao nhiêu khách của team đang ở nhóm hay hoàn hàng.

__Trước khi bắt đầu:__
- Hiểu một luật của màn: đây là **ảnh chụp lúc này** (huy hiệu «Khoảng đo: ảnh chụp lúc này» góc phải). Mỗi hội thoại đang đứng ở đúng một bước; màn không đếm bao nhiêu khách đã đi qua bước đó rồi rời đi. Câu đầu màn nhắc: «Đây là ảnh chụp, không phải tỉ lệ rơi. Đừng lấy hiệu hai bậc rồi gọi là «tỉ lệ rơi» …»
- Đọc dòng tuổi cạnh tiêu đề, «Tính trên đơn tới …»: số đơn trong bảng của hệ tính tới ngày đó.
- Chọn đúng team trên chip team — số là của team đang mở.

## Các bước

### Phần A — tab «Khách»

1. Bấm «Số liệu» trên thanh trên cùng, rồi bấm tab «Khách» trên dải «Trong mục» (hoặc mở thẳng `/nguon-khach`).
   → *Kết quả:* màn «Khách vào từ đâu» mở, dòng phụ «Hai luồng bán chạy song song và chỉ gặp nhau ở POS.»
2. Đọc khối «Hội thoại đang đứng ở đâu».
   → *Kết quả:* dòng mô tả ghi «… hội thoại của team · dữ liệu tới … · ảnh chụp chỗ đứng hiện tại». Mỗi thanh là một cặp bước · người giữ, ví dụ «Tư vấn · bot AI» hay «Chờ người · sale». Bước: «Chào» · «Tìm hiểu nhu cầu» · «Tư vấn» · «Chốt đơn» · «Chờ người» · «Sau bán» · «Nguội»; người giữ: «Botcake giữ» · «bot AI» · «sale». Nếu thanh đầu chiếm từ một nửa trở lên, màn ghi thêm «…% đang ở «…»».
3. (Chỉ Quản trị) Đọc khối «Rủi ro hoàn — bốn tầng».
   → *Kết quả:* bốn ô «Hay hoàn · ≥65%» · «Cần theo dõi · 30–65%» · «Mua tốt · bình thường» · «Chưa đủ đơn để xếp», mỗi ô là số khách. Dòng dưới ghi «Chấm lúc …» cùng hai liên kết «Xem đủ →» và «Tra một khách cụ thể →». Marketer không thấy khối này.
4. Đọc khối «Khách vào từ Messenger — rơi ở đâu».
   → *Kết quả:* bốn chặng «Nhắn inbox» · «Bot tư vấn» · «Bot chốt» · «Sale duyệt». Hôm nay mọi chặng hiện «—» và «chưa có nguồn»; chặng «Bot chốt» ghi «xem sổ đếm ở Tổng quan». Chỗ rơi của luồng Messenger **chưa đo được** — đừng đọc «—» là 0.
5. Đọc khối «Khách vào từ trang bán hàng — rơi ở đâu».
   → *Kết quả:* bốn chặng «Bấm BUY NOW» · «Gửi WhatsApp» · «Xác nhận» · «Chờ in». «Bấm BUY NOW» mang số đơn trang bán hàng 30 ngày (ghi «30 ngày · BigQuery») khi đọc được đơn đồng bộ hằng ngày. «Gửi WhatsApp» ghi «luồng gửi WhatsApp chưa chạy · 37,4% là số cũ». Bên dưới là dòng «Chưa đo lại được chỗ rơi · số cũ 37,4%» với huy hiệu «Chưa đo được». WhatsApp chưa nối — sẽ bổ sung sau.
6. Đọc khối «Hai luồng chạy song song».
   → *Kết quả:* mỗi luồng một dòng — «Messenger» (đơn có hội thoại Messenger) · «Trang bán hàng» (đơn không có hội thoại, khách đặt qua form / BUY NOW), và «Không suy được nguồn» khi có đơn mang mã hội thoại sai khuôn. Mỗi dòng ghi «30 ngày tới …» cùng giao thành công, hoàn, huỷ, tỉ lệ giao, COD đã giao theo từng tiền tệ. Dòng cuối nhắc: không gộp hai luồng; tiền theo từng tiền tệ, không cộng.
7. (Chỉ Quản trị) Muốn tra một khách cụ thể, bấm «Tra một khách cụ thể →».
   → *Kết quả:* màn Tìm khách mở; gõ số điện thoại để xem tầng rủi ro và mọi đơn của khách (xem [Tìm khách theo số điện thoại và xem mọi đơn của khách](./tim-khach.md)).

![Tab «Khách» — hội thoại đang đứng ở đâu và khối rủi ro hoàn bốn tầng](images/xem-khach-roi-rui-ro-hoan.png)

<!-- CHỤP: anh=xem-khach-roi-rui-ro-hoan · vai=quan-tri · duong=/nguon-khach · cho=«Hội thoại đang đứng ở đâu»
     thao_tac=
     trang_thai=khối «Hội thoại đang đứng ở đâu» có các thanh; khối «Rủi ro hoàn — bốn tầng» đã hiện với bốn ô và liên kết «Xem đủ →»
     danh_dau=(1) «Hội thoại đang đứng ở đâu» · (2) «Rủi ro hoàn — bốn tầng» · (3) «Xem đủ →» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | «Hội thoại đang đứng ở đâu» | Đọc thanh dài nhất: phần lớn hội thoại đang dừng ở bước nào, ai đang giữ. |
| (2) | «Rủi ro hoàn — bốn tầng» | Đọc số khách mỗi tầng (chỉ Quản trị thấy). |
| (3) | «Xem đủ →» | Bấm để mở màn «Rủi ro hoàn hàng». |

![Hai khối «rơi ở đâu» và khối hai luồng chạy song song](images/xem-khach-roi-rui-ro-hoan-2.png)

<!-- CHỤP: anh=xem-khach-roi-rui-ro-hoan-2 · vai=quan-tri · duong=/nguon-khach · cho=«Khách vào từ trang bán hàng — rơi ở đâu»
     thao_tac=cuộn tới «Khách vào từ Messenger — rơi ở đâu»
     trang_thai=thấy đủ hai khối «rơi ở đâu» và đầu khối «Hai luồng chạy song song»
     danh_dau=(1) «Khách vào từ Messenger — rơi ở đâu» · (2) «Khách vào từ trang bán hàng — rơi ở đâu» · (3) «Hai luồng chạy song song» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | «Khách vào từ Messenger — rơi ở đâu» | Chặng ghi «chưa có nguồn» là chưa đo, không phải 0. |
| (2) | «Khách vào từ trang bán hàng — rơi ở đâu» | Đọc số «Bấm BUY NOW»; 37,4% là số cũ, không phải số hôm nay. |
| (3) | «Hai luồng chạy song song» | So từng luồng riêng: đơn, giao thành công, hoàn, tỉ lệ giao. |

### Phần B — màn «Rủi ro hoàn hàng» (chỉ Quản trị)

8. Bấm «Xem đủ →» ở khối rủi ro hoàn (tab «Khách» hoặc tab «Tổng quan»), hoặc mở thẳng `/rui-ro-hoan`.
   → *Kết quả:* màn «Rủi ro hoàn hàng» mở, dòng phụ «Phân bố bốn tầng theo lằn ranh đề xuất — chưa phải chính sách, và chưa chặn ai.» và dòng tuổi «Tính trên đơn tới … · chấm lần cuối …» (hoặc «chưa chấm lần nào»).
9. Đọc hai hộp đầu màn.
   → *Kết quả:* hộp «Chưa có chính sách nào được áp» nói cách chia bốn tầng còn chờ người quyết chốt và «Chưa chỗ nào trong hệ dùng tầng rủi ro để chặn khách — kể cả tầng cao nhất.» Hộp «Tỉ lệ hoàn tính trên một đơn không nói lên điều gì» cho biết bao nhiêu khách đã chấm còn dưới sàn 2 đơn đã kết, và bao nhiêu khách chưa được chấm.
10. Đọc bảng «Tỉ lệ hoàn theo tầng».
    → *Kết quả:* dòng đếm «… / … khách đã chấm · … chưa chấm». Năm hàng: «Chưa đủ đơn để xếp tầng» · «Tốt — hoàn 0–15%» · «Bình thường — hoàn 15–30%» · «Cảnh báo — hoàn 30–65% …» · «Rủi ro cao — hoàn ≥65%». Cột «Khách» · «Đơn đã kết» · «Đơn hoàn» · «Xếp tầng được?» («Có» hoặc «Chưa đủ đơn»). Hàng đầu không phải một tầng — đó là nhãn cho khách chưa đủ đơn đã kết.
11. Đọc bảng «Cùng tỉ lệ, khác số đơn».
    → *Kết quả:* mỗi tầng chia theo số đơn đã kết của khách (cột từ «0-1 đơn kết» tới «6+ đơn kết»). Cột trái là chỗ tỉ lệ chưa có nghĩa — một khách 1 đơn hoàn đã thành «hoàn 100%».
12. Đọc khối «Tài liệu nói và đọc được».
    → *Kết quả:* hai ô «Tài liệu nói (đo 23/08)» (ước trên 4,2% dân số) và «Đọc từ cột đã chấm» (toàn bộ khách của team). Dùng ô thứ hai.

![Màn «Rủi ro hoàn hàng» — hộp chính sách chưa áp và bảng tỉ lệ hoàn theo tầng](images/xem-khach-roi-rui-ro-hoan-3.png)

<!-- CHỤP: anh=xem-khach-roi-rui-ro-hoan-3 · vai=quan-tri · duong=/rui-ro-hoan · cho=«Tỉ lệ hoàn theo tầng»
     thao_tac=
     trang_thai=hộp «Chưa có chính sách nào được áp» ở đầu màn; bảng «Tỉ lệ hoàn theo tầng» có năm hàng hoặc khung trống kèm lý do; tiêu đề «Cùng tỉ lệ, khác số đơn» thấy được
     danh_dau=(1) «Chưa có chính sách nào được áp» · (2) «Tỉ lệ hoàn theo tầng» · (3) «Cùng tỉ lệ, khác số đơn» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | «Chưa có chính sách nào được áp» | Nhớ: tầng chỉ để đọc, hệ chưa chặn khách nào. |
| (2) | «Tỉ lệ hoàn theo tầng» | Đọc số khách mỗi tầng và cột «Xếp tầng được?». |
| (3) | «Cùng tỉ lệ, khác số đơn» | Chỉ tin tỉ lệ ở cột có từ 2 đơn đã kết trở lên. |

## Đọc để quyết định

| Bạn thấy | Nghĩa là | Làm tiếp |
|---|---|---|
| Thanh «Chờ người · …» dài | Nhiều khách đang chờ người nhận | Sang Hộp thư nhận việc: [Nhận một việc bot giao lại và đóng việc với kết quả](./nhan-va-dong-viec.md) |
| «Bấm BUY NOW» có số nhưng «Gửi WhatsApp» là «—» | Đơn trang bán hàng chưa được bot nhắn xác nhận vì luồng WhatsApp chưa chạy | Hệ chưa làm được việc này. Hiện tại: các đơn này xử lý ngoài hệ (xem [Các loại đơn ở tab Đơn chờ và cách xử lý ngoài hệ](./cac-loai-don-cho.md)) |
| «Hay hoàn · ≥65%» hoặc «Cần theo dõi · 30–65%» lớn | Nhiều khách của team từng hoàn nhiều | Sale đã thấy cảnh báo «Gọi xác nhận trước khi duyệt.» khi duyệt đơn của các khách này; hệ không chặn ai |
| «Chưa đủ đơn để xếp» chiếm phần lớn | Phần lớn khách chưa có đủ 2 đơn đã kết | Đừng coi họ là khách tốt hay xấu — tỉ lệ chưa có nghĩa |
| Dòng tuổi ghi ngày cũ | Số tính trên bảng đơn tới ngày đó | Đọc như số của ngày đó, không phải hôm nay |

## Lưu ý

- **Không có tỉ lệ rơi giữa hai chặng.** Các chặng đến từ nguồn và khoảng đo khác nhau; màn cố ý không tính phần trăm rơi.
- **Số hội thoại theo team hay toàn hệ.** Khi hệ chưa gom được hội thoại theo team, khối «Hội thoại đang đứng ở đâu» ghi thêm «… Đang hiện số toàn hệ của sổ hội thoại cũ (…, đứng im từ 16/09).» và dòng mô tả đổi thành «… hội thoại · toàn hệ, không cắt theo team …». Khi đó tên bước khác đi («Vừa chào» · «Đang hỏi nhu cầu» · «Đang bán» · «Đang chốt» · «Sau bán» · «Đã giao người» · «Nguội») kèm dòng «Ai đang giữ: …». Đừng so số toàn hệ này với số của một team.
- **Hai luồng: hai nguồn số.** Khi đọc được đơn đồng bộ hằng ngày, khối «Hai luồng chạy song song» đếm 30 ngày đơn của team. Khi chưa đọc được, khối lùi về ảnh chụp bảng đơn của hệ: mỗi luồng một số đơn, kèm «Tổng tiền …» hoặc «…/… đơn có tổng tiền — số tiền chưa đủ để cộng», và huy hiệu «Chưa có dữ liệu» nếu luồng đó trống.
- **Số «Bấm BUY NOW» ở tab «Khách» là 30 ngày**, còn ở tab «Tổng quan» là 7 ngày — hai số khác nhau là đúng.
- **Trần đọc.** Nếu bảng đơn quá 60.000 đơn, hộp «Đã đọc tới trần» báo hai con số hai luồng chỉ là một phần, và tỉ lệ giữa hai luồng cũng sai theo.
- **Tầng rủi ro do lượt chấm hằng đêm tính sẵn**; hai màn chỉ đọc lại, không tự tính. Ngưỡng và nơi tầng hiện ra: [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md).

## Xử lý khi lỗi

- Hộp đỏ «Không đọc được nguồn khách», khung «Không tải được» với «Kiểm kết nối rồi tải lại trang.»: tải lại trang; nếu lặp lại, gửi nội dung hộp cho người quản trị hệ thống.
- «Chưa đọc được phân bố hội thoại» với huy hiệu «Chưa đọc được»: khối này không đọc được sổ hội thoại; các khối khác vẫn dùng được.
- «Chưa đọc được rủi ro hoàn» trong khối bốn tầng, hoặc «Không đọc được rủi ro hoàn» ở màn «Rủi ro hoàn hàng»: tải lại; nếu lặp lại, báo người quản trị hệ thống.
- Bảng «Tỉ lệ hoàn theo tầng» trống, báo chưa khách nào được chấm: lượt chấm tỉ lệ hoàn chưa chạy trên team; xem [Sự cố số liệu: «chưa có nguồn», «chưa biết», số lệch](./su-co-so-lieu.md).
- Mở `/rui-ro-hoan` gặp trang «Không đủ quyền xem rủi ro hoàn»: màn này chỉ dành cho Quản trị.

## Liên quan

[Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md) · [Tìm khách theo số điện thoại và xem mọi đơn của khách](./tim-khach.md) · [Duyệt, sửa hoặc từ chối đơn Messenger chờ duyệt](./duyet-don-messenger.md) · [Đọc đơn và tỉ lệ chốt theo hai luồng](./doc-don-ti-le-chot.md) · [Các con số ở Số liệu: mỗi thước đo gì](./tra-cuu-con-so.md) · [Sự cố số liệu: «chưa có nguồn», «chưa biết», số lệch](./su-co-so-lieu.md)
