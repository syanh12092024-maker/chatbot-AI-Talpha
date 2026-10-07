# Các con số ở Số liệu: mỗi thước đo gì

> Bảng tra từng con số trên các màn của Số liệu: nó đo gì, đo trong bao lâu và lấy từ đâu, và không được cộng với con số nào.

Vai đọc: Marketer · Quản trị. Đối chiếu với hệ ngày 05/10/2026.

Cột «Nguồn · khoảng» chép ý của màn và ô «ⓘ Nguồn số» (ô gập ở chân khối). Hai nguồn đơn hay gặp:
- **Đơn trên kho hàng, đồng bộ hằng ngày** — màn ghi chữ «BigQuery» và «tới ngày …»; máy chủ giữ bản đọc tối đa một giờ.
- **Ảnh chụp bảng đơn của hệ, nạp 28/08** — màn dùng khi chưa đọc được nguồn trên.

Tiền model hiện lấy từ **«Sổ AI cũ»** — sổ chi phí của bot cũ, ghi tới 28/08.

## Tab «Tổng quan» — bốn ô số

| Con số trên màn | Đo gì | Nguồn · khoảng | Không cộng / không so với |
|---|---|---|---|
| «Chi phí AI mỗi đơn» | Tiền gọi model bỏ ra cho một đơn bot tạo, của team | Sổ AI cũ (tới 28/08) · toàn thời gian. Dòng nhỏ ghi «% doanh thu: chưa có nguồn» | Không phải phần trăm doanh thu |
| «Tin AI để ra một đơn» | Số tin bot trả lời cho một đơn | Như trên; dòng nhỏ «… tin → … đơn» | — |
| «Đơn theo luồng — không gộp» | Hai số: đơn Messenger · đơn trang bán hàng của team | Đơn trên kho hàng, đồng bộ hằng ngày · 7 ngày tới ngày ghi trên ô. Chưa đọc được thì ảnh chụp bảng đơn | Hai số với nhau |
| «BUY NOW mà không gửi WhatsApp» | Phần đơn trang bán hàng chưa được nhắn WhatsApp xác nhận | Chưa đo được — luồng WhatsApp chưa chạy; 37,4% là số cũ trong tài liệu | Không coi 37,4% là số hôm nay |

## Tab «Tổng quan» — khối «Đơn POS của team — theo marketer»

Mọi đơn của team trên kho hàng (mọi nguồn, không chỉ đơn có bot). Đơn thuộc team của marketer đem đơn về, theo team của người đó vào ngày đơn (hồ sơ HRM). Hai khoảng: 7 ngày và 30 ngày tới ngày ghi ở đầu khối. **Cả khối không cộng với ba thước Messenger.**

| Con số trên màn | Đo gì | Nguồn · khoảng | Không cộng / không so với |
|---|---|---|---|
| «Đơn» | Số đơn của team (hoặc của một marketer) | Đơn trên kho hàng, đồng bộ hằng ngày · 7 / 30 ngày | Ba thước Messenger. «Đơn» có thể lớn hơn tổng các cột trạng thái: đơn mang trạng thái lạ không vào cột nào |
| «Giao thành công» | Đơn đã giao thành công | Như trên | — |
| «Hoàn» | Đơn hoàn | Như trên | — |
| «Huỷ» | Đơn huỷ | Như trên | — |
| «Đang xử lý» | Đơn chưa kết thúc giao: đang giao, chờ hàng, đã xác nhận, đã đặt hàng, đơn thô | Như trên | — |
| «Tỉ lệ giao thành công» | Màn ghi: «giao thành công ÷ (giao thành công + hoàn) — chỉ tính đơn đã kết thúc giao» | Như trên | Tỉ lệ 7 ngày với 30 ngày: hoàn về sau nhiều ngày, tỉ lệ khoảng ngắn «còn đẹp hơn thật» — đọc 30 ngày |
| «COD đã giao» | Tiền thu hộ của đơn giao thành công, ghi theo từng tiền tệ (vd «… SAR · … AED») | Như trên; ô «Nguồn số» dòng «Tiền»: không quy đổi | Tiền khác tệ với nhau |
| «Đơn 7 ngày» · «Đơn 30 ngày» · «COD đã giao (30 ngày)» (bảng marketer) | Các số trên, cho từng marketer; «Giao thành công» · «Hoàn» · «Tỉ lệ giao thành công» của bảng này là 30 ngày | Như trên. Marketer chỉ thấy dòng của mình | — |
| «… đơn chưa ghép marketer (chờ gán team)» | Đơn chưa ghép được với marketer nào | Cả công ty · 30 ngày | Không nằm trong hàng của team nào |
| «… đơn của marketer thuộc team không vào hệ» | Đơn của marketer có mã nhân viên nhưng team HRM không phải một trong ba team trên hệ | Cả công ty · 30 ngày | Không nằm trong hàng của team nào |
| «… đơn mang ngày tương lai bị loại» | Đơn ghi ngày sau hôm nay — bị loại khỏi mọi số | Cả công ty | — |
| «… đơn tính theo team HIỆN TẠI của marketer …» | Đơn mà HRM chưa có lịch sử team phủ ngày đơn, nên tính theo team hiện tại | Cả công ty · 30 ngày | — |

## Tab «Tổng quan» — luồng Messenger và ba thước

| Con số trên màn | Đo gì | Nguồn · khoảng | Không cộng / không so với |
|---|---|---|---|
| «Đơn thật ở POS quy cho AI» | Đơn có thật trong kho hàng, có hội thoại của bot, đã trừ huỷ và hoàn — gồm cả đơn sale chốt hộ sau khi khách chat với bot | Hỏi thẳng kho hàng, đếm đơn có thật · 60 ngày gần nhất | «Bot tự tay chốt», «Hội thoại có đơn» |
| «Bot tự tay chốt» | Đơn do chính bot tạo, mỗi khách đếm một lần | Sổ đếm cũ, ghi tới 28/08 · toàn thời gian | «Đơn thật ở POS quy cho AI», «Hội thoại có đơn» |
| «Hội thoại có đơn» | Số hội thoại dẫn tới ít nhất một đơn — không phải số đơn | Cùng lượt quét kho hàng · 60 ngày gần nhất | Hai thước kia |
| «Bot chốt đơn» (chặng phễu) | Cùng số với «Bot tự tay chốt» | Sổ đếm của bot | — |
| «Hội thoại mới» · «Bot tư vấn» · «Sale duyệt» · «Giao thành công» (chặng phễu) | Chưa đo | «chưa có nguồn» | — |
| «Quét POS lúc …» (đầu trang) | Lần cuối hệ quét đơn của luồng Messenger | — | — |

## Tab «Tổng quan» — luồng trang bán hàng

| Con số trên màn | Đo gì | Nguồn · khoảng | Không cộng / không so với |
|---|---|---|---|
| «Bấm BUY NOW» (chặng phễu) | Số đơn trang bán hàng | Đơn trên kho hàng, đồng bộ hằng ngày · 7 ngày | Luồng Messenger; số «Bấm BUY NOW» 30 ngày ở tab «Khách» |
| «Đơn từ trang bán hàng — 7 ngày» | Đơn của team không có hội thoại Messenger; dòng phụ cho số 30 ngày (đơn, giao thành công, hoàn, huỷ, tỉ lệ giao) | Như trên | Luồng Messenger |
| «Đơn từ trang bán hàng» (khi chưa đọc được kho số liệu) | Đơn nguồn «trang bán hàng» trong ảnh chụp bảng đơn; kèm số đơn có tổng tiền | Ảnh chụp bảng đơn | Luồng Messenger |
| «Gửi WhatsApp» · «Khách xác nhận» · «Sang Chờ in» · «Sale gọi lại cứu được» | Chưa đo | «luồng gửi WhatsApp chưa chạy» / «chưa có nguồn» | — |

## Tab «Tổng quan» — bảng «Theo page» và rủi ro hoàn

| Con số trên màn | Đo gì | Nguồn · khoảng | Không cộng / không so với |
|---|---|---|---|
| «Đơn POS quy cho AI» | Thước «Đơn thật ở POS quy cho AI» của một page | 60 ngày | «Chốt» (khoảng khác) |
| «Hội thoại có đơn» | Thước «Hội thoại có đơn» của một page | 60 ngày | «Đơn POS quy cho AI» |
| «Chốt» | Đơn 30 ngày của page, mọi nguồn, trừ huỷ | Đơn trên kho hàng, đồng bộ hằng ngày · 30 ngày. Đơn không mang page (trang bán hàng, tạo tay) không vào | Hai cột bot bên trái (màn ghi «khoảng KHÁC») |
| «AI / đơn» | Chi phí AI mỗi đơn của page; huy hiệu «Tốn tiền, 0 đơn» khi page tiêu tiền mà bot chưa tạo đơn | Sổ AI cũ (ghi tới 28/08) · toàn thời gian | «Chốt» |
| «Hoàn» | Màn ghi: «hoàn ÷ đơn đã kết thúc giao» (rê chuột: «… hoàn / … đơn đã kết thúc») | Đơn trên kho hàng · 30 ngày | — |
| «Hay hoàn · ≥65%» · «Cần theo dõi · 30–65%» · «Mua tốt · bình thường» · «Chưa đủ đơn để xếp» (chỉ Quản trị) | Số khách ở mỗi tầng rủi ro hoàn; «Mua tốt · bình thường» gộp hai tầng Tốt và Bình thường | Chấm từ các đơn đã kết của từng khách, ghi «chấm lúc …» | Số đơn — đây là số khách. Chi tiết: [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md) |

## Tab «Chi phí AI»

| Con số trên màn | Đo gì | Nguồn · khoảng | Không cộng / không so với |
|---|---|---|---|
| «Mỗi đơn ra được» | Tiền model cho một đơn bot tạo, của team; dòng nhỏ «… tin cho một đơn» | Sổ AI cũ (ghi tới 28/08) · «Khoảng đo: toàn thời gian» | — |
| «Mỗi tin trả lời» | Tiền model cho một tin bot trả lời; dòng nhỏ ghi phần trăm lượt có số đo thật và mức đích «≤ 50 ₫» | Như trên. Ô «Nguồn số»: đơn giá chia trên số tin ĐO ĐƯỢC (số đo chỉ có từ 06/08/2026) | — |
| «Token mỗi lượt · toàn hệ» | Ba số «vào · đọc lại cache · ra»: lượng chữ AI đọc vào, đọc lại từ bộ nhớ đệm, viết ra — bình quân một lượt đo thật | Toàn hệ, không theo team | Số của một page hay một team |
| «Trúng cache · toàn hệ» | Phần chữ đọc lại từ bộ nhớ đệm; màn ghi «đọc lại ÷ (vào + đọc lại)» | Toàn hệ | Số của một page hay một team |
| «Tiền» · «Tin» · «Đơn» (bảng «Chi phí theo page») | Tiền model, số tin bot trả lời, số đơn của page. «Đơn» là đơn chính bot tạo — cùng bộ đếm với «Bot tự tay chốt» | Sổ AI cũ · toàn thời gian | «Đơn POS quy cho AI» và «Chốt» ở tab Tổng quan |
| «Mỗi tin» · «Mỗi đơn» | Tiền cho một tin, cho một đơn của page; page 0 đơn thì «Mỗi đơn» là «—» | Như trên | — |
| «Đo thật» | Phần trăm lượt của page có số đo thật từ nhà model; dưới 80% hiện «…% · ước» | Lượt không đo được: ước từ độ dài chữ | Tiền của page «ước» với page đo thật |
| Dòng tổng «… page có tiêu · … · tổng … · … lượt · … đơn» | Tổng tiền, lượt, đơn của team | Sổ AI cũ | — |
| «Token vào / ra» · «Tiền» (tab «Từng tin», chỉ Quản trị) | Lượng chữ vào / ra và tiền của một lượt; chữ «ước» nếu lượt đó chưa đo thật | Sổ chi phí của bot mới · 100 lượt mới nhất | Tiền ở bốn ô (sổ khác) |

## Tab «Khách» và màn «Rủi ro hoàn hàng»

| Con số trên màn | Đo gì | Nguồn · khoảng | Không cộng / không so với |
|---|---|---|---|
| Các thanh «Hội thoại đang đứng ở đâu» | Số hội thoại của team đang đứng ở mỗi cặp bước · người giữ | Ảnh chụp lúc này; «dữ liệu tới …». Khi chưa gom được theo team: số toàn hệ của sổ hội thoại cũ | Không lấy hiệu hai thanh làm tỉ lệ rơi |
| «Messenger» · «Trang bán hàng» · «Không suy được nguồn» (khối «Hai luồng chạy song song») | Đơn 30 ngày của team theo luồng, kèm giao thành công, hoàn, huỷ, tỉ lệ giao, COD đã giao theo tiền tệ. «Không suy được nguồn» = đơn mang mã hội thoại sai khuôn | Đơn trên kho hàng, đồng bộ hằng ngày · 30 ngày. Chưa đọc được thì ảnh chụp bảng đơn | Các luồng với nhau; tiền khác tệ |
| «Bấm BUY NOW» (khối trang bán hàng) | Đơn trang bán hàng | 30 ngày | Số 7 ngày ở tab Tổng quan |
| «Khách» · «Đơn đã kết» · «Đơn hoàn» (bảng «Tỉ lệ hoàn theo tầng») | Số khách mỗi tầng, tổng đơn đã kết và đơn hoàn của họ | Do lượt chấm hằng đêm tính sẵn; «Tính trên đơn tới … · chấm lần cuối …» | — |
| Ô bảng «Cùng tỉ lệ, khác số đơn» | Số khách mỗi tầng theo số đơn đã kết (từ «0-1 đơn kết» tới «6+ đơn kết») | Như trên | — |
| «Tài liệu nói (đo 23/08)» · «Đọc từ cột đã chấm» | Số khách tầng Cảnh báo (30–65%) theo tài liệu cũ và theo số chấm thật | Tài liệu: ước trên 4,2% dân số; số chấm: toàn bộ khách của team | Dùng số «Đọc từ cột đã chấm» |

## Liên quan

[Đọc đơn và tỉ lệ chốt theo hai luồng](./doc-don-ti-le-chot.md) · [Tìm page tốn tiền AI mà không ra đơn](./tim-page-ton-tien-ai.md) · [Xem khách rơi ở đâu và rủi ro hoàn](./xem-khach-roi-rui-ro-hoan.md) · [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md) · [Sự cố số liệu: «chưa có nguồn», «chưa biết», số lệch](./su-co-so-lieu.md)
