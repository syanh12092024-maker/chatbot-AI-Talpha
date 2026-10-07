# Đọc đơn và tỉ lệ chốt theo hai luồng

> Trang này giúp chủ team và marketer đọc màn «Đơn và tỉ lệ chốt» (Số liệu › Tổng quan): team ra bao nhiêu đơn ở mỗi luồng bán, giao thành công tới đâu, marketer và page nào đáng chú ý — mà không cộng nhầm những con số đo những thứ khác nhau.

**Ai làm được:** Quản trị · Marketer — chỉ xem, màn không có nút sửa nào. Marketer chỉ thấy dòng của chính mình trong bảng theo marketer (hàng của team vẫn là tổng cả team). Khối «Khách theo rủi ro hoàn» chỉ Quản trị thấy. Sale không mở được màn này.

__Khi nào dùng:__ đầu ngày hoặc cuối tuần, khi bạn cần biết team ra đơn thế nào ở hai luồng (Messenger và trang bán hàng), marketer nào đang ra đơn, đơn có tới tay khách không, và page nào tốn tiền AI mà ít đơn.

__Trước khi bắt đầu:__
- Kiểm chip team ở thanh trên cùng: mọi con số trên màn là của **team đang mở**. Muốn xem team khác thì đổi team trước (xem [Đăng nhập, chọn team và đổi team](./dang-nhap-chon-team.md)).
- Nếu bạn là marketer: tài khoản phải gắn hồ sơ HRM (có mã nhân viên) thì bảng theo marketer mới có dòng của bạn.
- Nhớ luật của màn: **mỗi con số tự ghi khoảng đo của nó** (7 ngày, 30 ngày, 60 ngày, toàn thời gian). Màn chưa có nút chọn khoảng — dòng chữ dưới tiêu đề ghi «Mỗi số ghi khoảng đo của nó — các cửa đọc chưa nhận ngày, nên chưa chọn được «hôm nay · 7 ngày · 30 ngày».»

## Các bước

1. Bấm «Số liệu» trên thanh ngang trên cùng (hoặc mở thẳng `/bao-cao`).
   → *Kết quả:* màn «Đơn và tỉ lệ chốt» mở; dải «Trong mục» có ba tab «Tổng quan» · «Chi phí AI» · «Khách», tab «Tổng quan» đang sáng. Khi đọc được đơn của luồng Messenger, góc phải đầu trang ghi «Quét POS lúc …» — lần cuối hệ quét đơn trong kho hàng.
2. Đọc hàng bốn ô số ở đầu trang. Dòng chữ nhỏ dưới mỗi số nói số đó đo trong bao lâu và lấy từ đâu.
   → *Kết quả:* bạn thấy bốn ô sau (ô nào chưa đọc được thì hiện «—» kèm lý do, không hiện 0):

   | Ô | Cho biết | Dòng nhỏ dưới số |
   |---|---|---|
   | «Chi phí AI mỗi đơn» | Tiền gọi model bỏ ra cho một đơn | «toàn thời gian · Sổ AI cũ (tới 28/08) · % doanh thu: chưa có nguồn» — số của bot cũ, dừng ở 28/08 |
   | «Tin AI để ra một đơn» | Bot trả lời bao nhiêu tin thì ra một đơn | giá mỗi tin · «… tin → … đơn» |
   | «Đơn theo luồng — không gộp» | Hai số đặt cạnh nhau: đơn Messenger · đơn trang bán hàng | «Messenger · trang bán hàng · 7 ngày tới {ngày} · BigQuery» khi đọc được đơn đồng bộ hằng ngày |
   | «BUY NOW mà không gửi WhatsApp» | Phần đơn trang bán hàng chưa được nhắn WhatsApp | hôm nay là «—» kèm «chưa đo được · 37,4% là số cũ trong tài liệu — luồng WhatsApp chưa chạy». WhatsApp chưa nối — sẽ bổ sung sau. |

3. Đọc khối «Đơn POS của team — theo marketer». Đây là **mọi đơn của team** trên kho hàng (không chỉ đơn có bot), đồng bộ hằng ngày; đơn thuộc team của marketer đem đơn về, theo team của người đó vào ngày đơn (hồ sơ HRM).
   → *Kết quả:* đầu khối ghi «đồng bộ {ngày giờ} · tới ngày {ngày}». Bảng thứ nhất có hai hàng «7 ngày» và «30 ngày» với các cột «Đơn» · «Giao thành công» · «Hoàn» · «Huỷ» · «Đang xử lý» · «Tỉ lệ giao thành công» · «COD đã giao». Bảng thứ hai là từng marketer (nhiều đơn 30 ngày nhất lên trước): «Marketer» (tên, mã nhân viên, thêm «đã nghỉ» nếu người đó đã nghỉ) · «Đơn 7 ngày» · «Đơn 30 ngày» · «Giao thành công» · «Hoàn» · «Tỉ lệ giao thành công» · «COD đã giao (30 ngày)».
4. Đọc ba câu chú thích dưới hai bảng.
   → *Kết quả:* câu thứ nhất bắt đầu «Cả công ty, 30 ngày: …» — số đơn **chưa ghép marketer (chờ gán team)**, số đơn của marketer thuộc team không vào hệ, số đơn mang ngày tương lai bị loại, và số đơn tính theo team hiện tại của marketer vì HRM chưa có lịch sử team phủ ngày đơn. Những đơn này không nằm trong hàng của team. Câu thứ hai giải thích «Tỉ lệ giao thành công = giao thành công ÷ (giao thành công + hoàn)» và nhắc đọc khoảng 30 ngày. Câu thứ ba nhắc thước này KHÁC ba thước Messenger bên dưới.
5. Cuộn tới «Luồng Messenger». Đọc phễu năm chặng rồi đọc «Ba thước đơn Messenger — đo ba thứ khác nhau, KHÔNG cộng».
   → *Kết quả:* phễu có «Hội thoại mới» · «Bot tư vấn» · «Bot chốt đơn» · «Sale duyệt» · «Giao thành công»; hôm nay chỉ «Bot chốt đơn» có số (ghi «sổ đếm của bot»), các chặng khác hiện «—» và «chưa có nguồn». Ba thước xếp dọc, mỗi thước một dòng ghi rõ đo gì và «Khoảng đo: …»:
   - «Đơn thật ở POS quy cho AI» — đơn có thật trong kho hàng, có hội thoại của bot, đã trừ huỷ và hoàn, gồm cả đơn sale chốt hộ sau khi khách chat với bot (60 ngày gần nhất).
   - «Bot tự tay chốt» — đơn do chính bot tạo, mỗi khách đếm một lần (toàn thời gian).
   - «Hội thoại có đơn» — số hội thoại dẫn tới ít nhất một đơn, không phải số đơn (60 ngày gần nhất).
6. Cuộn tới «Luồng trang bán hàng».
   → *Kết quả:* phễu «Bấm BUY NOW» · «Gửi WhatsApp» · «Khách xác nhận» · «Sang Chờ in» · «Sale gọi lại cứu được»; chặng «Bấm BUY NOW» mang số đơn 7 ngày. Dòng dưới phễu «Đơn từ trang bán hàng — 7 ngày» kèm số 30 ngày: đơn, giao thành công, hoàn, huỷ, tỉ lệ giao.
7. Cuộn tới bảng «Theo page».
   → *Kết quả:* dòng đếm ghi «… page · xếp theo chi phí AI mỗi đơn, đắt nhất lên đầu» (hoặc «xếp theo đơn POS quy cho AI» khi chưa đọc được sổ chi phí). Cột: «Page» · «Marketer» · «Đơn POS quy cho AI» · «Hội thoại có đơn» · «Chốt» · «AI / đơn» · «Hoàn». Rê chuột lên ô «Hoàn» để thấy «… hoàn / … đơn đã kết thúc». Page tốn tiền mà bot chưa tạo đơn nào mang huy hiệu «Tốn tiền, 0 đơn» ở cột «AI / đơn».
8. (Chỉ Quản trị) Đọc khối «Khách theo rủi ro hoàn», rồi bấm «Xem đủ →» nếu cần chi tiết.
   → *Kết quả:* bốn ô «Hay hoàn · ≥65%» · «Cần theo dõi · 30–65%» · «Mua tốt · bình thường» · «Chưa đủ đơn để xếp», mỗi ô là số khách; dòng dưới ghi lúc chấm. «Xem đủ →» mở màn «Rủi ro hoàn hàng» (xem [Xem khách rơi ở đâu và rủi ro hoàn](./xem-khach-roi-rui-ro-hoan.md)).
9. Khi cần biết một con số lấy từ đâu, bấm «Nguồn số» (ô gập có biểu tượng ⓘ) ở chân khối hoặc chân màn.
   → *Kết quả:* ô mở ra từng dòng «tên số — lấy từ đâu» và câu «Hai luồng đo bằng hai thước … Cộng lại là sai.»

![Màn «Đơn và tỉ lệ chốt» — bốn ô số và khối đơn của team theo marketer](images/doc-don-ti-le-chot.png)

<!-- CHỤP: anh=doc-don-ti-le-chot · vai=quan-tri · duong=/bao-cao · cho=«Đơn POS của team — theo marketer»
     thao_tac=
     trang_thai=bốn ô số đã có giá trị hoặc «—» kèm lý do; khối «Đơn POS của team — theo marketer» đã tải xong (bảng hoặc hộp báo)
     danh_dau=(1) «Đơn theo luồng — không gộp» · (2) «Đơn POS của team — theo marketer» · (3) «Tỉ lệ giao thành công» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | «Đơn theo luồng — không gộp» | Đọc hai số tách nhau: Messenger · trang bán hàng, 7 ngày. Không cộng. |
| (2) | «Đơn POS của team — theo marketer» | Đọc hàng «30 ngày» của team, rồi dòng từng marketer. |
| (3) | «Tỉ lệ giao thành công» | So tỉ lệ ở hàng «30 ngày», không ở hàng «7 ngày». |

![Luồng Messenger với ba thước đơn xếp dọc, và luồng trang bán hàng bên dưới](images/doc-don-ti-le-chot-2.png)

<!-- CHỤP: anh=doc-don-ti-le-chot-2 · vai=quan-tri · duong=/bao-cao · cho=«Ba thước đơn Messenger — đo ba thứ khác nhau, KHÔNG cộng»
     thao_tac=cuộn tới «Luồng Messenger»
     trang_thai=phễu Messenger và ba thước hiện đủ; đầu khối «Luồng trang bán hàng» thấy được ở mép dưới
     danh_dau=(1) «Luồng Messenger» · (2) «Ba thước đơn Messenger — đo ba thứ khác nhau, KHÔNG cộng» · (3) «Luồng trang bán hàng» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | «Luồng Messenger» | Đọc phễu: chặng ghi «chưa có nguồn» là chưa đo, không phải 0. |
| (2) | «Ba thước đơn Messenger — đo ba thứ khác nhau, KHÔNG cộng» | Chọn đúng thước cho câu hỏi của bạn (bảng dưới). |
| (3) | «Luồng trang bán hàng» | Đọc riêng, không ghép với luồng Messenger. |

![Bảng «Theo page» xếp theo chi phí AI mỗi đơn](images/doc-don-ti-le-chot-3.png)

<!-- CHỤP: anh=doc-don-ti-le-chot-3 · vai=quan-tri · duong=/bao-cao · cho=«Theo page»
     thao_tac=cuộn tới «Theo page»
     trang_thai=bảng «Theo page» có ít nhất vài dòng page và câu chú thích về «Chốt» và «Hoàn» bên dưới
     danh_dau=(1) «Theo page» · (2) «AI / đơn» · (3) «Hoàn» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | «Theo page» | Đọc dòng đếm để biết bảng đang xếp theo gì. |
| (2) | «AI / đơn» | Page đầu bảng là page tốn tiền AI nhất cho mỗi đơn. |
| (3) | «Hoàn» | Rê chuột để xem số đơn hoàn trên số đơn đã kết thúc. |

## Đọc để ra quyết định

| Bạn muốn biết | Đọc ở đâu | Đừng |
|---|---|---|
| Team ra bao nhiêu đơn tuần này | Ô «Đơn theo luồng — không gộp», hoặc hàng «7 ngày» của bảng team | Cộng hai số trong ô với nhau |
| Hàng có tới tay khách không | «Tỉ lệ giao thành công» ở hàng «30 ngày» | Đọc tỉ lệ 7 ngày: hoàn về sau nhiều ngày, nên tỉ lệ khoảng ngắn «còn đẹp hơn thật» (câu chú thích ghi rõ bao nhiêu đơn 7 ngày còn «đang xử lý») |
| Marketer nào ra đơn tốt | Bảng theo marketer: «Đơn 30 ngày» cùng «Tỉ lệ giao thành công» | So «COD đã giao» giữa hai tiền tệ khác nhau — tiền theo từng tiền tệ, không quy đổi |
| Bot góp bao nhiêu đơn thật | «Đơn thật ở POS quy cho AI» | Cộng với «Bot tự tay chốt» hay «Hội thoại có đơn» |
| Bot tự chốt được bao nhiêu | «Bot tự tay chốt» (sổ đếm cũ, ghi tới 28/08) | Coi đó là toàn bộ đơn bot góp — khách chat với bot rồi sale chốt hộ không nằm trong số này |
| Page nào đáng soi trước | «Theo page»: đầu bảng là «AI / đơn» đắt nhất; huy hiệu «Tốn tiền, 0 đơn»; «Hoàn» cao | So «Chốt» (30 ngày) với «Đơn POS quy cho AI» (60 ngày) — khoảng khác nhau |
| Bao nhiêu đơn chưa thuộc team nào | Câu «Cả công ty, 30 ngày: …» dưới bảng marketer | Tìm số này trong hàng của team — nó không nằm ở đó |

## Lưu ý

- **Không cộng giữa các khối.** Khối «Đơn POS của team» đếm mọi đơn của team; ba thước Messenger chỉ đếm đơn có bot; hai luồng đo bằng hai thước khác nhau. Màn cố ý không đưa ra một con số tổng.
- **«—» không phải 0.** Ô nào chưa đọc được thì để «—» kèm lý do («chưa có nguồn», «chưa biết», «Chưa đo được»). Màn không bao giờ thay bằng 0 vì «0 đơn» là kết luận sai.
- **Hai nguồn số đơn.** Khi đọc được kho số liệu đơn đồng bộ hằng ngày, các dòng ghi «BigQuery» cùng ngày «tới ngày …». Khi chưa đọc được, khối «Đơn POS của team» báo «Chưa có số đơn POS từ BigQuery» và các khối khác dùng ảnh chụp bảng đơn của hệ (nạp 28/08) — ô «Đơn theo luồng — không gộp» khi đó có thể ghi «chưa biết — bảng đơn là ảnh chụp cũ hơn khoảng đo».
- **Theo page chỉ có đơn mang page.** «Chốt» = đơn 30 ngày của page, mọi nguồn, trừ huỷ; «Hoàn» = hoàn ÷ đơn đã kết thúc giao. Đơn không mang page (trang bán hàng, đơn tạo tay) không vào bảng này. Page chưa có đơn nào trong 30 ngày hiện «0» ở «Chốt».
- **Bảng «Theo page» dồn page chưa có «AI / đơn» xuống dưới.** Page «Tốn tiền, 0 đơn» không có số «AI / đơn», nên nằm dưới mọi page đã có số — cuộn xuống để thấy. Muốn thấy page tiêu nhiều tiền nhất ở đầu bảng, dùng tab «Chi phí AI» (xem [Tìm page tốn tiền AI mà không ra đơn](./tim-page-ton-tien-ai.md)).
- **Marketer.** Bảng theo marketer chỉ có dòng của bạn; câu cuối khối ghi «Bạn là marketer: bảng chỉ hiện dòng của bạn; hàng team là tổng cả team.» Nếu không có đơn nào mang mã của bạn trong 30 ngày, khối ghi «Chưa có đơn nào mang mã của bạn trong 30 ngày.» Các khối khác (ba thước, Theo page) là của cả team.
- **Số đơn từ kho số liệu được máy chủ giữ lại tối đa một giờ** trước khi đọc lại, và kho số liệu tự đồng bộ hằng ngày — xem giờ ở «đồng bộ … · tới ngày …» trước khi so với kho hàng.

## Xử lý khi lỗi

- Hộp đỏ «Không đọc được báo cáo» kèm «Chưa lấy được số từ lõi bot. Nếu lỗi còn lặp lại, gửi dòng chi tiết bên dưới cho người quản trị hệ thống.»: tải lại trang sau ít phút; nếu vẫn lỗi, chép dòng chi tiết gửi người quản trị hệ thống. Khối «Đơn POS của team» đọc riêng nên vẫn có thể hiện số.
- «Khối «Đơn POS của team» không tải được» hoặc «Đọc đơn POS từ BigQuery hỏng»: các khối khác vẫn dùng được; gửi dòng lý do cho người quản trị hệ thống.
- Mở `/bao-cao` mà gặp trang «Không đủ quyền xem báo cáo»: tài khoản của bạn không có vai Quản trị hoặc Marketer; xem [Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md).
- Các câu «chưa có nguồn», «chưa biết», số lệch giữa hai khối: xem [Sự cố số liệu: «chưa có nguồn», «chưa biết», số lệch](./su-co-so-lieu.md).

## Liên quan

[Các con số ở Số liệu: mỗi thước đo gì](./tra-cuu-con-so.md) · [Tìm page tốn tiền AI mà không ra đơn](./tim-page-ton-tien-ai.md) · [Xem khách rơi ở đâu và rủi ro hoàn](./xem-khach-roi-rui-ro-hoan.md) · [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md) · [Gán marketer phụ trách sản phẩm](./gan-marketer.md) · [Sự cố số liệu: «chưa có nguồn», «chưa biết», số lệch](./su-co-so-lieu.md)
