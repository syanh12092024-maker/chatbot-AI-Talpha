# Sự cố số liệu: «chưa có nguồn», «chưa biết», số lệch

> Tra theo đúng câu bạn thấy trên các màn Số liệu (Tổng quan · Chi phí AI · Khách · Rủi ro hoàn hàng): vì sao số trống, vì sao hai số không khớp, và bạn tự xử được hay phải nhờ ai.

Vai đọc: Marketer · Quản trị. Đối chiếu với hệ ngày 05/10/2026.

Luật chung của Số liệu: **màn không bao giờ thay số chưa đọc được bằng 0.** Ô trống hiện «—» kèm lý do. «Người quản trị hệ thống» ở bảng dưới là người sửa được cấu hình máy chủ — khác Quản trị team.

## «chưa có nguồn», «chưa biết», «chưa đo được»

| Triệu chứng trên màn | Nguyên nhân | Làm gì / nhờ ai |
|---|---|---|
| Chặng phễu hiện «—» kèm «chưa có nguồn» (vd «Hội thoại mới», «Sale duyệt», «Nhắn inbox», «Xác nhận», «Chờ in») | Hệ chưa có đường đo cho bước này | Không phải 0, không phải lỗi. Không cần làm gì — đọc các chặng có số |
| «% doanh thu: chưa có nguồn» · ««Chặn bằng trả lời sẵn» theo page …: chưa có nguồn» · «Lượt và tiền theo từng model» mang huy hiệu «Chưa có nguồn» | Con số này chưa được dựng | Không cần làm gì |
| Cột «Chốt», «Hoàn» của bảng «Theo page» là «—» (rê chuột: «Chưa có nguồn theo page»), câu dưới bảng: ««Chốt» và «Hoàn» theo page: chưa có nguồn — chưa nối đọc đơn POS từ BigQuery.» | Máy chủ chưa đọc được đơn trên kho hàng đồng bộ hằng ngày | Nhờ người quản trị hệ thống nối đọc đơn từ kho số liệu |
| Cột «AI / đơn» là «—», câu dưới bảng: ««AI / đơn»: chưa đọc được sổ chi phí.» | Không đọc được sổ chi phí lúc mở màn | Tải lại trang; nếu lặp lại, xem dòng «Chưa đọc được chi phí» ở bảng cuối |
| Ô «Đơn theo luồng — không gộp» là «—», dòng nhỏ «chưa biết — bảng đơn là ảnh chụp cũ hơn khoảng đo» | Không đọc được đơn đồng bộ hằng ngày, và bảng đơn của hệ là ảnh chụp cũ hơn khoảng đo — màn không in «0 · 0» vì đó là số sai | Nhờ người quản trị hệ thống nối đọc đơn từ kho số liệu |
| Ô «Đơn theo luồng — không gộp» là «—», dòng nhỏ «chưa nối cửa hai luồng» | Máy chủ chưa nối phép đếm hai luồng | Nhờ người quản trị hệ thống |
| Huy hiệu «Chưa đo được» cạnh thước «Bot tự tay chốt»; chặng «Bot chốt đơn» ghi «chưa đọc được sổ đếm» | Không đọc được sổ đếm của bot | Tải lại; nếu lặp lại, báo người quản trị hệ thống. Hai thước còn lại vẫn đọc được |
| Khối «Luồng trang bán hàng» ghi «Chưa đo được luồng trang bán hàng», kèm «… con số của luồng này là **chưa biết**, không phải 0» | Không đọc được đơn đồng bộ hằng ngày, và bảng đơn của hệ không có (hoặc không đọc được) đơn nguồn trang bán hàng | Nhờ người quản trị hệ thống nối đường đọc đơn |
| Ô «BUY NOW mà không gửi WhatsApp» là «—»; tab Khách ghi «Chưa đo lại được chỗ rơi · số cũ 37,4%» | Luồng gửi WhatsApp chưa chạy lần nào. WhatsApp chưa nối — sẽ bổ sung sau | Không cần làm gì. 37,4% là số cũ trong tài liệu, không phải số hôm nay |
| Ô «Mỗi tin trả lời» ghi «Chưa có lượt nào đo thật» | Chưa lượt nào có số đo thật từ nhà model | Đọc tiền như số ước |
| Ô «Chi phí AI mỗi đơn» ghi «đang đọc…» lâu | Sổ chi phí đọc chậm | Đợi; nếu chuyển sang «chưa đọc được sổ chi phí» thì tải lại |

## Khối «Đơn POS của team — theo marketer»

| Triệu chứng trên màn | Nguyên nhân | Làm gì / nhờ ai |
|---|---|---|
| Hộp vàng «Chưa có số đơn POS từ BigQuery», lý do «máy chủ chưa nối đọc đơn POS từ BigQuery (…)» | Máy chủ chưa được nối để đọc kho số liệu đơn | Nhờ người quản trị hệ thống. Trong lúc chờ, số đơn ở các khối dưới là ảnh chụp bảng đơn của hệ (nạp 28/08) — hộp có ghi |
| Hộp đỏ «Đọc đơn POS từ BigQuery hỏng», lý do «đọc BigQuery hỏng (…)» | Đọc kho số liệu bị lỗi hoặc bị từ chối; trong ngoặc là mã và lý do | Chép nguyên dòng lý do gửi người quản trị hệ thống. Các khối khác vẫn dùng được |
| Hộp đỏ «Khối «Đơn POS của team» không tải được» | Lỗi tải riêng khối này | Tải lại trang |
| Marketer thấy «Chưa có đơn nào mang mã của bạn trong 30 ngày.» dù chắc chắn có đơn | Không đơn nào ghép được với mã nhân viên của bạn: tài khoản chưa gắn hồ sơ HRM (không có mã nhân viên), hoặc đơn của bạn chưa ghép marketer và đang nằm ở «chờ gán team» | Nhờ Quản trị kiểm tài khoản ở Người và team. Đơn «chờ gán team» do bảng ghép tài khoản marketer trên kho hàng với nhân viên — bảng này của HRM, hệ chỉ đọc <!-- TBD: ai/bộ phận nào ghép tài khoản marketer trên kho hàng với nhân viên HRM, người dùng báo ai — OQ-SL-1 --> |
| «Chưa có đơn nào của marketer team này trong 30 ngày.» | Team chưa có đơn nào ghép được marketer thuộc team trong 30 ngày | Đọc câu «Cả công ty, 30 ngày: …» để xem bao nhiêu đơn đang «chờ gán team» |
| Giờ «đồng bộ …» ở đầu khối cũ hơn hôm nay, hoặc đơn mới tạo chưa có trong số | Kho số liệu đồng bộ hằng ngày; máy chủ giữ bản đã đọc tối đa một giờ | Chờ lượt đồng bộ sau. Số của hôm nay chưa đủ là bình thường |
| Một marketer mang chữ «đã nghỉ» | Hồ sơ HRM ghi người đó đã nghỉ; đơn cũ vẫn tính cho họ | Không cần làm gì |

## Số cũ hoặc số chưa đủ

| Triệu chứng trên màn | Nguyên nhân | Làm gì / nhờ ai |
|---|---|---|
| Tab Khách hoặc màn Rủi ro hoàn hàng ghi «Tính trên đơn tới …» là một ngày đã lâu | Bảng đơn của hệ là ảnh chụp tới ngày đó | Đọc số như số của ngày đó, không phải hôm nay |
| Tiền ở Chi phí AI không đổi qua nhiều ngày; dòng dưới tiêu đề ghi «theo Sổ AI cũ (bot ghi tới 28/08)» | Tiền lấy từ sổ của bot cũ, ghi tới 28/08; sổ của bot mới chỉ có số khi bot mới được bật lại | Không phải lỗi |
| Hộp vàng «… page quét POS lỗi — tổng dưới đây là CẬN DƯỚI, không phải số thật.» | Lượt quét kho hàng lỗi ở vài page | Số thật lớn hơn số trên màn. Tải lại sau ít phút |
| Hộp «… page đang hiện số của LẦN QUÉT TRƯỚC vì lượt này lỗi.»; dưới tên page ghi «số lần quét trước» | Lượt quét này lỗi ở các page đó, màn giữ số lần trước | Đọc các page đó như số cũ |
| Hộp «Đã đọc tới trần» (tab Khách: trần 60000 đơn; màn Rủi ro hoàn hàng: trần 40000 khách) | Bảng quá lớn, hệ chỉ đọc một phần | Số là một phần; ở tab Khách tỉ lệ giữa hai luồng cũng sai theo. Báo người quản trị hệ thống |
| Khối «Hội thoại đang đứng ở đâu» ghi «… Đang hiện số toàn hệ của sổ hội thoại cũ (…, đứng im từ 16/09).» | Hệ chưa gom được hội thoại theo team | Số là của cả hệ, không phải team bạn. Đừng so với số của team |
| Màn Rủi ro hoàn hàng ghi «chưa chấm lần nào»; bảng trống «Đọc được … khách nhưng KHÔNG khách nào có …» kèm «Chạy job chấm tỉ lệ hoàn; …» | Lượt chấm tỉ lệ hoàn chưa chạy trên team | Nhờ người quản trị hệ thống <!-- TBD: ai chạy lượt chấm tỉ lệ hoàn và lịch chạy thật trên máy chủ — OQ-SL-2 --> |
| Màn Rủi ro hoàn hàng: «Team này chưa có khách nào.» | Team chưa có khách nào trong hệ | Không cần làm gì |
| Hộp thư hoặc Tìm khách hiện huy hiệu «Chưa chấm» | Lượt chấm chưa chấm khách này | Không coi là khách tốt; xem [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md) |

## Hai số không khớp nhau

| Triệu chứng trên màn | Nguyên nhân | Làm gì / nhờ ai |
|---|---|---|
| «Đơn thật ở POS quy cho AI», «Bot tự tay chốt», «Hội thoại có đơn» lệch nhau nhiều lần | Ba thước đo ba thứ khác nhau, khoảng đo khác nhau (60 ngày · toàn thời gian · 60 ngày) | Đúng thiết kế. Không cộng; chọn thước theo câu hỏi — xem [Các con số ở Số liệu: mỗi thước đo gì](./tra-cuu-con-so.md) |
| Khối «Đơn POS của team» lớn hơn hẳn ba thước Messenger | Khối này đếm mọi đơn của team, mọi nguồn; ba thước chỉ đếm đơn có bot | Đúng thiết kế. Không cộng |
| Cột «Đơn» ở Chi phí AI nhỏ hơn «Đơn POS quy cho AI» của cùng page | Chi phí AI đếm đơn chính bot tạo; cột kia gồm cả đơn sale chốt hộ sau khi khách chat với bot | Đúng thiết kế |
| Ô «Đơn theo luồng — không gộp» khác số «Bấm BUY NOW» ở tab Khách | Ô ở Tổng quan là 7 ngày, tab Khách là 30 ngày | Đúng thiết kế |
| Cộng cột «Chốt» của mọi page nhỏ hơn «Đơn» của team | «Chốt» chỉ có đơn mang page (đơn trang bán hàng, đơn tạo tay không vào) và đã trừ huỷ | Đúng thiết kế |
| «Đơn» lớn hơn tổng «Giao thành công» + «Hoàn» + «Huỷ» + «Đang xử lý» | Đơn mang trạng thái lạ không được xếp vào cột nào, nhưng vẫn đếm vào «Đơn» | Đúng thiết kế |
| «Tỉ lệ giao thành công» 7 ngày cao hơn 30 ngày | Hoàn về sau nhiều ngày; đơn 7 ngày phần lớn còn «đang xử lý» | Đọc tỉ lệ 30 ngày |
| Số đơn của team khác số bạn tự đếm trên kho hàng | Đơn thuộc team theo marketer đem đơn về, vào ngày đơn. Đơn chờ gán team, đơn của team không vào hệ, đơn ngày tương lai không vào hàng của team | Đọc câu «Cả công ty, 30 ngày: …» dưới bảng marketer |
| Bốn ô rủi ro ở Số liệu không khớp năm hàng ở màn Rủi ro hoàn hàng | Ô «Mua tốt · bình thường» gộp hai tầng; khách chưa chấm không nằm trong bốn ô | Đúng thiết kế |
| «Tài liệu nói (đo 23/08)» khác «Đọc từ cột đã chấm» | Số tài liệu ước trên 4,2% dân số khách | Dùng «Đọc từ cột đã chấm» |
| Hộp «Sổ chi phí v3 chưa khớp với Sổ AI cũ» | Sổ chi phí của bot mới còn trống vì đường chat mới chưa ghi vào — «không phải vì không ai tiêu tiền» | Không phải lỗi. Màn lấy theo Sổ AI cũ |
| Cột «Đo thật» ghi «…% · ước» | Dưới 80% lượt của page có số đo thật; phần còn lại ước từ độ dài chữ | Đừng so tiền page này ngang với page đo thật |

## Lỗi tải và quyền

| Triệu chứng trên màn | Nguyên nhân | Làm gì / nhờ ai |
|---|---|---|
| Hộp đỏ «Không đọc được báo cáo»: «Chưa lấy được số từ lõi bot. Nếu lỗi còn lặp lại, gửi dòng chi tiết bên dưới cho người quản trị hệ thống.»; khung «Chưa có số liệu» — «Tải lại trang sau ít phút.» | Máy chủ không lấy được số đơn từ phần lõi của bot | Tải lại sau ít phút; nếu lặp lại, chép dòng chi tiết gửi người quản trị hệ thống |
| Chỗ ba thước ghi «Chưa nối bộ đọc lõi bot nên chưa đọc được đơn hàng.» | Máy chủ chưa nối bộ đọc đơn của bot | Nhờ người quản trị hệ thống xem dịch vụ rồi khởi động lại (màn ghi đúng ý này) |
| Bảng «Theo page» trống: «Không page nào của team có đơn nào trong lượt quét POS.» | Bot chưa chạy trên page nào của team, hoặc chưa page nào nối cửa hàng trên kho hàng | Kiểm từng page: [Kiểm tra page đã sẵn sàng bật bot chưa](./kiem-tra-bat-duoc-chua.md). Câu trên màn nhắc «Cửa kiểm sẵn sàng» — đó là tên cũ |
| «Chưa đọc được chi phí» — «Chưa nối bộ đọc lõi bot. Nhờ người quản trị hệ thống xem dịch vụ v3.» | Máy chủ chưa nối bộ đọc chi phí | Nhờ người quản trị hệ thống |
| Hộp đỏ «Không đọc được chi phí», khung «Chưa có số liệu chi phí» | Đọc sổ chi phí lỗi | Tải lại; nếu lặp lại, gửi dòng chi tiết cho người quản trị hệ thống |
| «Chưa đọc được chi phí từng tin» (tab «Từng tin») | Đọc sổ chi phí của bot mới lỗi | Các tab khác vẫn dùng được |
| Hộp đỏ «Không đọc được nguồn khách»; «Chưa đọc được phân bố hội thoại» | Đọc đơn hoặc sổ hội thoại lỗi | Tải lại; nếu lặp lại, báo người quản trị hệ thống |
| «Chưa đọc được rủi ro hoàn»; «Không đọc được rủi ro hoàn» | Đọc bảng tầng rủi ro lỗi | Tải lại; nếu lặp lại, báo người quản trị hệ thống |
| Không thấy khối rủi ro hoàn, tab «Từng tin», liên kết sang Vận hành | Các phần này chỉ dành cho Quản trị | Đúng quyền. Xem [Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md) |
| Trang «Không đủ quyền xem báo cáo» / «… chi phí AI» / «… nguồn khách» / «… rủi ro hoàn» | Tài khoản không có vai được mở màn đó (Số liệu: Quản trị · Marketer; Rủi ro hoàn hàng: chỉ Quản trị). Câu trong trang ghi tên «Cửa kiểm sẵn sàng» — đó là chữ cũ, không phải màn bạn mở | Bấm «← Về màn đầu của bạn». Cần thêm vai thì nhờ Quản trị: [Tạo người dùng, cấp vai và đặt mật khẩu đầu tiên](./tao-nguoi-dung.md) |
| Vừa mở Số liệu đã bị đưa về trang đăng nhập | Phiên đăng nhập hết hạn | Đăng nhập lại; hệ đưa bạn về đúng màn đang mở |

## Liên quan

[Đọc đơn và tỉ lệ chốt theo hai luồng](./doc-don-ti-le-chot.md) · [Tìm page tốn tiền AI mà không ra đơn](./tim-page-ton-tien-ai.md) · [Xem khách rơi ở đâu và rủi ro hoàn](./xem-khach-roi-rui-ro-hoan.md) · [Các con số ở Số liệu: mỗi thước đo gì](./tra-cuu-con-so.md) · [Bốn tầng rủi ro hoàn hàng](./tra-cuu-rui-ro-hoan.md) · [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md)
