# Tìm page tốn tiền AI mà không ra đơn

> Trang này giúp chủ team và marketer dùng màn «Chi phí AI» (Số liệu › Chi phí AI) để tìm page bot tiêu nhiều tiền gọi model mà ít hoặc không ra đơn, và biết đối chiếu ở đâu trước khi kết luận.

**Ai làm được:** Quản trị · Marketer xem bốn ô số, tab «Theo page» và tab «Theo model». Tab «Từng tin», lối sang Cài đặt › Vận hành và liên kết «Cấu hình model chính · dự phòng · bảng giá →» chỉ Quản trị thấy. Màn chỉ đọc. Marketer thấy mọi page của team ở màn này (màn không lọc theo sản phẩm bạn phụ trách). Sale không mở được màn này.

__Khi nào dùng:__ khi bạn nghi bot đang «đốt tiền» trên một số page, khi cần chọn page để sửa lời bot hay thêm câu trả lời sẵn trước, hoặc khi cần báo cáo tiền model theo page.

__Trước khi bắt đầu:__
- Biết tiền trên màn lấy từ đâu. Dòng dưới tiêu đề ghi «Tiền gọi model theo page — theo Sổ AI cũ (bot ghi tới 28/08). Sổ v3 có số khi bot được bật lại.» Nghĩa là: con số hôm nay là tiền của **bot cũ, ghi tới 28/08**; sổ chi phí của bot mới chỉ có số khi bot mới được bật lại trên page.
- Huy hiệu «Khoảng đo: toàn thời gian» ở góc phải đầu trang: tiền cộng trọn sổ, không cắt theo ngày (rê chuột lên huy hiệu để đọc «Cộng trọn Sổ AI, không cắt theo ngày.»).
- Biết «Đơn» ở màn này là gì: đơn **chính bot tự tạo** — cùng bộ đếm với thước «Bot tự tay chốt» ở tab Tổng quan. Đơn sale chốt hộ sau khi khách chat với bot không nằm trong số này.
- Chọn đúng team trên chip team — số là của team đang mở.

## Các bước

1. Bấm «Số liệu» trên thanh trên cùng, rồi bấm tab «Chi phí AI» trên dải «Trong mục» (hoặc mở thẳng `/chi-phi`).
   → *Kết quả:* màn «Chi phí AI» mở ở tab «Theo page». Trong lúc đọc số, các ô hiện khung xám nhấp nháy.
2. Đọc hộp cảnh báo đầu màn, nếu có: «… page tiêu tiền mà không ra đơn nào — tổng …».
   → *Kết quả:* dưới tiêu đề hộp là danh sách tối đa 10 page dạng «tên page (tiền · số tin)». Hộp chỉ hiện khi có page **đã tiêu tiền** mà 0 đơn; page chưa gọi model lần nào không bị tính là đốt tiền.
3. Đọc bốn ô số.
   → *Kết quả:*

   | Ô | Cho biết | Dòng nhỏ dưới số |
   |---|---|---|
   | «Mỗi đơn ra được» | Tiền model cho một đơn bot tạo, của cả team | «… tin cho một đơn» |
   | «Mỗi tin trả lời» | Tiền model cho một tin bot trả lời | phần trăm lượt có số đo thật, và một mức đích «≤ 50 ₫» |
   | «Token mỗi lượt · toàn hệ» | Ba số: lượng chữ AI đọc vào · đọc lại từ bộ nhớ đệm · viết ra, bình quân một lượt | «vào · đọc lại cache · ra — trên lượt đo thật» |
   | «Trúng cache · toàn hệ» | Phần chữ AI đọc lại từ bộ nhớ đệm thay vì đọc mới | «đọc lại ÷ (vào + đọc lại)» |

   Hai ô sau tính trên **toàn hệ**, không theo team — đừng so chúng với số của một page.
4. Ở tab «Theo page», dò bảng «Chi phí theo page».
   → *Kết quả:* dòng đếm ghi «… page có tiêu · nhiều tiền nhất lên trước · tổng … · … lượt · … đơn»; nếu cả team chưa ra đơn nào thì thêm huy hiệu «Chưa ra đơn nào». Cột: «Page» · «Tiền» · «Tin» · «Đơn» · «Mỗi tin» · «Mỗi đơn» · «Đo thật» · «Marketer». Page đã tiêu tiền mà 0 đơn mang huy hiệu «Tiêu tiền, 0 đơn» ngay dưới tên page; ô «Mỗi đơn» của page 0 đơn là «—».
5. Kiểm cột «Đo thật» của page bạn định kết luận.
   → *Kết quả:* từ 80% trở lên thì hiện số phần trăm; dưới 80% thì hiện huy hiệu vàng «…% · ước» (rê chuột: «Dưới 80% lượt có token đo thật — phần còn lại là ước lượng»). Page «ước» thì tiền của nó kém chắc hơn page đo thật.
6. Đối chiếu ở tab «Tổng quan», bảng «Theo page».
   → *Kết quả:* với cùng page, cột «Đơn POS quy cho AI» và «Chốt» cho biết page có ra đơn thật không — kể cả đơn sale chốt hộ. Cột «AI / đơn» là chi phí AI mỗi đơn của page, bảng xếp đắt nhất lên đầu; page tốn tiền mà bot chưa tạo đơn mang huy hiệu «Tốn tiền, 0 đơn» và nằm dưới mọi page đã có số «AI / đơn».
7. (Chỉ Quản trị) Bấm tab «Từng tin» để xem tin nào tốn tiền nhất.
   → *Kết quả:* bảng «Từng tin» đọc sổ chi phí của bot mới: 100 lượt mới nhất, xếp đắt nhất lên đầu (dòng đếm «… lượt mới nhất · xếp đắt nhất lên đầu»). Cột «Lúc» · «Page» · «Khách nhắn» · «Model» · «Token vào / ra» (thêm chữ «ước» nếu lượt đó chưa đo thật) · «Tiền» · «Hội thoại». Bấm «Tìm hội thoại →» để mở khách đó ở màn Tìm khách.
8. (Chỉ Quản trị) Bấm liên kết dưới bảng «Lọc theo page · khách · khoảng, gom theo khách / page / thị trường — ở Vận hành →».
   → *Kết quả:* màn Vận hành mở ở tab «Chi phí theo tin». Hàng «Gom theo:» có các nút «từng tin» · «khách» · «page» · «thị trường»; bấm một nút để gom tiền theo nhóm đó (cột «Lượt · đo được» · «Token» · «Tiền», kèm tiền mỗi lượt và mỗi đơn nếu có).
9. Bấm tab «Theo model» nếu cần biết tiền đang tính cho nhà model nào.
   → *Kết quả:* ba dòng: «Nhà model đang tính tiền» (huy hiệu «Đang dùng» hoặc «Chưa rõ»), «Lượt và tiền theo từng model» (huy hiệu «Chưa có nguồn» — sổ cũ không tách theo model), «Dự phòng khác nhà» (huy hiệu «Chưa chạy»). Quản trị thấy thêm liên kết «Cấu hình model chính · dự phòng · bảng giá →».

![Màn «Chi phí AI» — bốn ô số và bảng chi phí theo page](images/tim-page-ton-tien-ai.png)

<!-- CHỤP: anh=tim-page-ton-tien-ai · vai=quan-tri · duong=/chi-phi · cho=«Chi phí theo page»
     thao_tac=
     trang_thai=tab «Theo page» đang mở; bốn ô số và bảng «Chi phí theo page» đã có dòng
     danh_dau=(1) «Mỗi đơn ra được» · (2) «Chi phí theo page» · (3) «Đo thật» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | «Mỗi đơn ra được» | Mốc chung của team để so với cột «Mỗi đơn» của từng page. |
| (2) | «Chi phí theo page» | Dò từ trên xuống (nhiều tiền nhất trước), tìm huy hiệu «Tiêu tiền, 0 đơn». |
| (3) | «Đo thật» | Page có huy hiệu «· ước» thì tiền kém chắc — đừng so ngang với page đo thật. |

![Tab «Từng tin» xếp đắt nhất lên đầu, với lối sang Vận hành](images/tim-page-ton-tien-ai-2.png)

<!-- CHỤP: anh=tim-page-ton-tien-ai-2 · vai=quan-tri · duong=/chi-phi?tab=tin · cho=«Từng tin»
     thao_tac=
     trang_thai=tab «Từng tin» đang mở; bảng có dòng hoặc khung trống «Sổ chi phí của v3 chưa ghi lượt nào»; liên kết sang Vận hành thấy ở dưới
     danh_dau=(1) «Từng tin» · (2) «Tiền» · (3) «Lọc theo page · khách · khoảng, gom theo khách / page / thị trường — ở Vận hành →» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | «Từng tin» | Chỉ Quản trị thấy tab này. |
| (2) | «Tiền» | Dòng đầu là lượt đắt nhất trong 100 lượt mới nhất. |
| (3) | «Lọc theo page · khách · khoảng, gom theo khách / page / thị trường — ở Vận hành →» *(dưới bảng, ngoài ảnh — cuộn xuống cuối bảng)* | Bấm để gom tiền theo khách, page hoặc thị trường. |

## Đọc để quyết định

| Bạn thấy | Nghĩa là | Làm tiếp |
|---|---|---|
| «Tiêu tiền, 0 đơn» ở Chi phí, nhưng Tổng quan › «Theo page» có «Đơn POS quy cho AI» hoặc «Chốt» lớn hơn 0 | Bot không tự tạo đơn, nhưng khách chat với bot rồi vẫn thành đơn (sale chốt hộ, hoặc khách tự đặt) | Page không đốt tiền vô ích. Nếu muốn bot tự chốt, xem lời bot của page: [Viết và lưu lời bot cho một page](./viet-loi-bot.md) |
| «Tiêu tiền, 0 đơn» ở Chi phí và cả hai cột đơn ở Tổng quan đều 0 | Page tiêu tiền mà không thấy đơn nào | Xem bot đang đọc gì: [Xem đúng đoạn chữ AI đang đọc trên một page](./xem-doan-chu-ai-doc.md). Quản trị cân nhắc [Bật hoặc tắt bot cho một page](./bat-tat-bot.md) |
| «Mỗi đơn» của một page cao hơn hẳn «Mỗi đơn ra được» của team | Page cần nhiều tin hơn để ra một đơn | So cột «Tin» và «Đơn»; câu khách hỏi lặp lại có thể chuyển thành câu trả lời sẵn (khớp từ khoá, không gọi model): [Thêm, sửa câu trả lời sẵn theo từ khoá](./cau-tra-loi-san.md) |
| «Đo thật» là «…% · ước» | Dưới 80% lượt có số đo thật | Đọc tiền page này dè dặt; ưu tiên kết luận trên page đo thật |
| Một tin đầu bảng «Từng tin» đắt bất thường | Lượt đó đọc hoặc viết rất nhiều chữ | Bấm «Tìm hội thoại →» để đọc khách đó |

## Lưu ý

- **Màn không hiện «0 đồng» khi chưa đọc được.** Ô nào chưa tính được hiện «—». Nếu cả màn chưa đọc được, khung trống ghi «Màn này không hiện 0 khi chưa đọc được — 0 đồng ở đây sẽ là con số sai.»
- **Đơn giá chia trên tin đo được.** Ô «Nguồn số» ở dưới bốn ô ghi: «Token chỉ được ghi từ 06/08/2026. Tin cũ hơn KHÔNG có số đo, nên đơn giá chia trên số tin ĐO ĐƯỢC, không chia trên tổng tin — chia trên tổng sẽ ra đơn giá rẻ giả.» Lượt không đo được thì tiền là ước từ độ dài chữ.
- **Hai sổ có thể lệch nhau.** Hộp «Sổ chi phí v3 chưa khớp với Sổ AI cũ» ghi số lượt và tiền của mỗi sổ rồi kết «Màn này lấy theo Sổ AI cũ.» Đây không phải lỗi: sổ của bot mới còn trống vì đường chat mới chưa ghi vào, «không phải vì không ai tiêu tiền».
- **Chưa có:** «Chặn bằng trả lời sẵn» theo page («chưa có nguồn — mẫu trả lời sẵn chưa ghi page») và tiền theo từng model.
- **Tab «Từng tin» rỗng** («Sổ chi phí của v3 chưa ghi lượt nào») khi bot mới chưa trả lời khách nào. Tiền của bot cũ vẫn ở bốn ô và tab «Theo page».
- **Mở thẳng một tab** bằng đường dẫn: `/chi-phi?tab=model` cho «Theo model», `/chi-phi?tab=tin` cho «Từng tin» (vai không thấy tab «Từng tin» thì về «Theo page»).
- Ở màn Vận hành, tab «Chi phí theo tin» chỉ có nút «Gom theo:»; chưa có ô lọc theo page, khách hay khoảng ngày như dòng liên kết ghi.

## Xử lý khi lỗi

- Hộp «Chưa đọc được chi phí» kèm «Chưa nối bộ đọc lõi bot. Nhờ người quản trị hệ thống xem dịch vụ v3.»: báo người quản trị hệ thống; bạn không sửa được ở màn.
- Hộp đỏ «Không đọc được chi phí»: tải lại trang sau ít phút; nếu lặp lại, gửi dòng chi tiết trong hộp cho người quản trị hệ thống.
- Hộp «Chưa đọc được chi phí từng tin» trong tab «Từng tin»: các tab khác vẫn dùng được.
- Bảng «Theo page» trống với «Không page nào của team có lượt gọi model nào trong Sổ AI cũ.»: bot cũ chưa chạy trên page nào của team; kiểm page đã bật được chưa ở [Kiểm tra page đã sẵn sàng bật bot chưa](./kiem-tra-bat-duoc-chua.md).
- Câu khác: xem [Sự cố số liệu: «chưa có nguồn», «chưa biết», số lệch](./su-co-so-lieu.md).

## Liên quan

[Đọc đơn và tỉ lệ chốt theo hai luồng](./doc-don-ti-le-chot.md) · [Các con số ở Số liệu: mỗi thước đo gì](./tra-cuu-con-so.md) · [Chọn model AI, thay khoá và thử một lượt](./chon-model-ai.md) · [Thêm, sửa câu trả lời sẵn theo từ khoá](./cau-tra-loi-san.md) · [Bật hoặc tắt bot cho một page](./bat-tat-bot.md) · [Sự cố số liệu: «chưa có nguồn», «chưa biết», số lệch](./su-co-so-lieu.md)
