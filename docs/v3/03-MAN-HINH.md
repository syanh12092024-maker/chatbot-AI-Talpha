# MÀN HÌNH — NĂM ĐÍCH

> **Đổi 29/09/2026 — CR-28-09c** (`docs/thi-cong/doi-y-do/CR-28-09c-lam-lai-bon-man.md`, `01-QUYET-DINH.md` §9).
> Bản vẽ được duyệt: <https://claude.ai/artifact/A6D68jyQRuqqu3TBRLrceb> — bảng 0 là bản đồ phủ màn.
> Thứ tự chuyển: **thêm nhà mới trước, gỡ màn cũ sau cùng** (phiếu LL8 cuối). Tới khi LL8 xong, màn cũ vẫn mở
> theo đường cũ; bảng «bản cũ» cuối tệp là hợp đồng của các màn đó.

## Năm đích

| Đích | Ai dùng | Gồm |
|---|---|---|
| **Hộp thư** | Sale (thấy cả ba team — LL15) | Cần người · Bot đang xử (nhận thay bot) · Tất cả · Đơn chờ (Messenger chờ duyệt, đơn không gắn hội thoại, Ladi chờ xác nhận WhatsApp) · xem/sửa/duyệt/loại đơn Messenger cạnh khung chat · gõ số điện thoại vào ô tìm ⇒ hồ sơ khách mọi kênh. **Không ô soạn tin** — trả lời ở Pancake. Đã làm ở LL2 (spec L4-M1 §7b). **VE5 (29/09): theo bản vẽ 1a** — ba tab Cần bạn (việc mở + đơn chờ thành hàng của hàng đợi) · Đơn chờ · Bot đang xử; «Tất cả» thành lối «Mọi hội thoại gần đây»; thẻ đơn ở cột giữa dưới tin nhắn (Hàng · Tiền · Giao tới · cảnh báo hoàn theo tầng · nghi trùng · van tạo đơn POS đóng thì nói trước và khoá nút duyệt; ba nút mở đúng form duyệt cũ); nhận/đóng việc ở thanh cuối (menu mở lên); cột phải Khách · Bot đã làm gì · Page này bán gì (sale chưa có đường đọc sản phẩm & giá — nói ra). Chưa có: đẩy báo quản trị khi quá 10′ · «Trả lại bot» cho sale · đơn Ladi/nghi trùng có nút xử lý. **VE5b (30/09): Tìm khách theo bản vẽ 1b** — `/ho-so-khach` (đường giữ), vào từ Hộp thư: tra theo số ⇒ hồ sơ gộp kênh (ba thẻ Messenger · Trang bán hàng (Ladi) · WhatsApp «chưa nối») + mọi đơn cả hai luồng (cột Hàng: dữ liệu đơn chưa lưu món — đo prod 0/123.629); sale mở được (§10 bổ sung), cửa danh sách cũ giữ quản trị · quản lý; ô tìm trống ⇒ tổng quan cũ cho quản trị · quản lý; tên / mã đơn POS: nói rõ vai nào chưa có đường |
| **Sản phẩm** | Marketer · Quản trị | Chung (kiến thức · hỏi size · ảnh · kịch bản tầng sản phẩm) · Theo thị trường (1 shop POS = 1 thị trường · đúng một món POS · giá bậc theo tiền tệ · marketer từ HRM · kịch bản tầng nước) · Page đang bán · Lịch sử · Gộp món POS nhiều shop thành một sản phẩm. Đã làm ở LL13: màn «Sản phẩm & kho» đặt khối Sản phẩm lên đầu — mỗi sản phẩm: số thị trường (shop POS) · page đang bán · món; «Xem» ⇒ thị trường theo shop (món · tồn · page), «Thêm thị trường» gắn món POS chưa thuộc sản phẩm nào, «Gỡ»; gộp nhiều shop tự động theo SỐ HIỆU (lượt kéo danh mục). Chưa: marketer HRM (LL15), kéo danh mục 6 shop còn lại (LL16). **VE1 (29/09): dựng lại theo bản vẽ 2a** — hai cột: danh sách sản phẩm của team (tìm · «+ Thêm» · ô lưu ý «dữ liệu còn nằm theo page» dẫn tới Bản sao theo page và số hiệu chờ đặt tên) · một sản phẩm: dải bốn tầng bot ghép (① luật chung ② sản phẩm chung ③ theo shop POS ④ page) · tab Chung (kiến thức, «hỏi size») · Theo thị trường (viên thị trường · thẻ shop/món/tồn · «Giá ở …» gom từ bậc giá của các page bán món, lệch giá nói ra · khung Thêm thị trường ba bước) · Page đang bán · Lịch sử (nhật ký). Chưa có nguồn nói rõ: marketer (LL15) · ảnh chung · kịch bản tầng nước theo sản phẩm |
| **Page** | Marketer | Danh sách (thị trường suy từ shop, marketer kế thừa, cột «Còn thiếu», bật bot có trần) · một page: SP & giá (kế thừa, ghi đè có chủ ý) · Lời bot · Ảnh · Trả lời sẵn · Kỹ thuật · Lịch sử · «Bật được chưa» · **Thử hỏi bot** · Luật chung: Luật · Chính sách/FAQ/Phản đối · Trả lời sẵn (một kho) · Đề xuất chờ duyệt. Đã làm ở LL3: thanh bên hai dòng (cụm «Tất cả page» — tab Kịch bản; cụm «Luật chung» — tab Luật · Trả lời sẵn); Chính sách/FAQ/Phản đối vẫn ở khối ④ trang một page. **VE2 (29/09): một page dựng lại theo bản vẽ 2c** — ba cột: page của team (bot bật hỏi tiến trình bot, khai khi đứng ở bản sao) · một page: công tắc ở đầu, «Bật được chưa», bảy tab Sản phẩm & giá · Lời bot (kịch bản lưu-là-chạy + khối chung) · Ảnh · Trả lời sẵn · Kỹ thuật (bot phụ trách, thiết lập, nguồn nhận tin) · Gợi ý cải thiện (để sau, BH5) · Lịch sử (các bản kịch bản) · cột «Thử hỏi bot» (chưa có đường — LL14) + «AI đang đọc gì» (ký tự thật). Đường `?tab=` cũ vẫn mở đúng chỗ. **VE3 (29/09): danh sách theo bản vẽ 2b** — viên «Lọc nhanh» có số đếm · nút Quét ở đầu trang · chọn nhiều page + thanh hàng loạt (gắn sản phẩm · bật bot tối đa 10 page, hộp xác nhận liệt kê tên, dừng ở lỗi đầu tiên) đi qua đúng cửa ghi từng page — không cửa ghi hàng loạt ở máy chủ. **VE4 (29/09): Luật chung theo bản vẽ 2d** — bốn tab Luật · Chính sách/FAQ/Phản đối (màn mới `/khoi-chung`: MỘT chỗ sửa ba khối cả team, đọc/ghi qua cửa MN7, lưu chờ xác nhận + phiên bản chống đè, team không giữ bộ khối của bot thì khoá ô và nói lý do) · Trả lời sẵn · Đề xuất chờ duyệt (thôi thử nghiệm; rỗng thì nói rỗng); tab Lời bot của trang một page chỉ còn tóm tắt + lối sang |
| **Số liệu** | Chủ team | Tổng quan (hai luồng tách) · Chi phí AI (page · model · từng tin) · Khách (nguồn · chỗ rơi · rủi ro hoàn bốn tầng). Đã làm ở LL5: một dòng thanh bên, bốn tab Tổng quan · Chi phí AI · Nguồn khách · Rủi ro hoàn; hai màn sau thôi ẩn và in «tính trên đơn tới ngày…» (prod: lát 28/08 tới khi có LL17) **VE-VA1 (30/09):** Tổng quan hỏng từ 25/09 (`T` chưa khai — mọi lượt tải rơi vào ô lỗi) đã vá, lên prod. **VE6a (30/09): Tổng quan theo bản vẽ 3a** — bốn ô số (chi phí AI/đơn · tin AI/đơn · đơn hai luồng KHÔNG gộp · BUY NOW: chưa đo được, 37,4% là số cũ) · hai phễu (chặng không nguồn nói «chưa có nguồn», không tỉ lệ rơi) · ba thước Messenger giữ dọc · bảng theo page ghép AI/đơn, xếp đắt nhất lên đầu, Chốt · Hoàn «chưa có nguồn theo page» · rủi ro hoàn bốn tầng cho quản trị · quản lý. Không chip khoảng / lọc page · marketer (chưa cửa nào nhận) **VE6b (30/09): Chi phí AI theo bản vẽ 3b** — bốn ô mỗi đơn · mỗi tin (đích BH8 ≤ 50 ₫) · token mỗi lượt · trúng cache (hai ô sau TOÀN HỆ: cầu không tách token đọc lại theo page; trúng cache = đọc lại ÷ (vào + đọc lại)) · ba tab Từng tin (sổ v3, quản trị · quản lý, 100 lượt mới nhất xếp đắt nhất) · Theo page (+ tổng của team; «chặn bằng trả lời sẵn» chưa có nguồn) · Theo model (nhà model · theo model chưa có nguồn · dự phòng chưa chạy) |
| **Cài đặt** | Quản trị | Bắt đầu · Kết nối (Pancake · POS · WhatsApp · HRM) · Model · Hệ còn sống (đối chiếu tin lỗi · tin bị lọc · diễn tập) · Người và team (người từ HRM; ghép marketer POS chỉ đọc) · Nhật ký. Đã làm ở LL6: một dòng thanh bên, sáu tab theo thứ tự này; màn Model gắn trạng thái THẬT từng vai (chính «Đang dùng» · dự phòng «Chưa nối» · nền «Chưa việc nào dùng») |

**Khung** (LL18 · 29/09, theo bản vẽ «AI Closer — làm lại từ đầu»): thanh NGANG trên cùng — logo · team · năm đích ·
dải trạng thái bot · tài khoản — và dải «Trong mục X» ngay dưới cho mục con của đích (Hộp thư: Việc của tôi · Hộp thư ·
Việc đang chờ; Page: Tất cả page · Luật chung; Số liệu và Cài đặt: các tab của cụm). Thay thanh bên tối — mọi chữ «thanh
bên» ở bảng trên đọc là «dải Trong mục». MÁY CHỦ vẽ khung vào HTML (không chờ JS), tệp chung cache theo mã phiên bản,
nén gzip. Liên kết trong trang tới màn vai đó không mở được thì tắt kèm lời «nhờ quản trị»; `/` đưa mỗi vai về màn đầu của mình.

## Màn cũ đi đâu — không chức năng nào bị bỏ sót

**Cụm** (LL3, `man-hinh.js#CUM`): nhiều màn một việc = MỘT dòng thanh bên + tab ngay dưới đầu trang (khung vẽ). Màn đầu cụm mang tên cụm; vai không mở được màn đầu cụm thấy đúng tên màn của mình.

«Gộp» = chức năng giữ, chuyển nhà. «Chuyển nội dung» = khái niệm bỏ, dữ liệu sang chỗ khác. «Để sau» = chưa làm ở sóng này.

| Màn cũ | Mã | Nhà mới | Cách | Phiếu |
|---|---|---|---|---|
| Việc của tôi | `trang-chu` | Hộp thư (sale) · Page › cột «Còn thiếu» (marketer) | Gộp | LL2 · LL3 · gỡ LL8 |
| Bàn hội thoại | `ban-hoi-thoai` | Hộp thư › Cần bạn | Giữ | LL2 |
| Việc đang chờ · Chi tiết việc | `dispatch` | Hộp thư › Cần bạn + Đơn chờ (giữ API nhận/đóng việc) | Gộp | LL2 · gỡ giao diện LL8 |
| Hội thoại và đơn | `van-hanh` | Duyệt/sửa/từ chối đơn · nhận thay bot → Hộp thư (LL2). Màn còn lại = **Cài đặt › Vận hành** (LL10) | Gộp | LL2 · LL10 |
|   ↳ đổi nguồn nhận tin page | `van-hanh` | Cài đặt › Vận hành (tab Page & trạng thái); trang một page › Thiết lập trỏ thẳng tới | Gộp | LL10 ✓ |
|   ↳ đối chiếu tin lỗi · tin bị lọc · diễn tập | `van-hanh` | Cài đặt › Vận hành (ba tab); Hệ còn sống trỏ thẳng tới | Gộp | LL10 ✓ |
|   ↳ chi phí từng tin | `van-hanh` | Cài đặt › Vận hành (tab Chi phí theo tin); Số liệu › Chi phí AI trỏ thẳng tới | Gộp | LL10 ✓ |
| Tất cả page | `page-bot` | Page › Danh sách (thị trường suy từ shop POS, marketer kế thừa từ Sản phẩm) | Giữ | LL3 · LL16 |
| Trang một page | `mot-page` | Page › một page | Giữ | LL3 |
| Sản phẩm & kho | `san-pham` | **Sản phẩm** › Chung · Theo thị trường (1 shop POS, 1 món POS, marketer HRM) · Page đang bán | Giữ | LL13 |
|   ↳ nối món POS (MN8) | `san-pham` | Sản phẩm › thêm thị trường · Gộp món POS nhiều shop | Gộp | LL13 |
| Đưa sản phẩm lên chạy | `len-chay` | Page › «Bật được chưa» | Gộp | LL3 · gỡ LL8 |
| Page còn thiếu gì | `san-sang` | Page › Danh sách, cột «Còn thiếu» | Gộp | LL3 |
| Kịch bản của page | `kich-ban` | Page › tab Lời bot + Lịch sử | Gộp | LL3 |
|   ↳ kịch bản tầng sản phẩm · tầng nước | `kich-ban` | Sản phẩm › Chung · Theo thị trường | Giữ | LL13 |
| Quy tắc chung mọi page | `bo-luat` | Page › Luật chung › Luật | Giữ | LL3 |
| Chính sách · FAQ · Phản đối | `khoi-chung` | Page › Luật chung › Chính sách · FAQ · Phản đối | Mới (tách khỏi trang một page) | VE4 |
| Câu trả lời sẵn | `lop-0-dong` | Page › Luật chung › Trả lời sẵn (một kho) | Giữ | LL12 |
| Kỹ năng theo sản phẩm | `ky-nang` | Sản phẩm › «Chung — kiến thức bot đọc» › ô «Hỏi size trước khi chốt» (LL11 ✓; màn ra khỏi menu) | Chuyển nội dung | LL11 ✓ · gỡ giao diện LL8 |
| Đoạn chữ gửi cho AI | `prompt-page` | Page › «AI đọc gì» | Gộp | LL3 · gỡ LL8 |
| Ảnh gửi khách | `thu-vien-anh` | Page › tab Ảnh | Gộp | LL3 |
| Gợi ý từ AI | `ai-de-xuat` | Page › Luật chung › Đề xuất chờ duyệt | Gộp | LL3 · gỡ LL8 · lên tab VE4 |
|   ↳ soi hội thoại → sửa lời bot, giảm tiền | (chưa có) | Page › tab Gợi ý cải thiện | Để sau | BH5 |
| So hai bản kịch bản | `hieu-qua` | Page › Lịch sử › So hai bản | Để sau | gỡ LL8 |
| Đơn và tỉ lệ chốt | `bao-cao` | Số liệu › Tổng quan (hai luồng tách) | Giữ | LL5 |
| Chi phí AI | `chi-phi` | Số liệu › Chi phí | Giữ | LL5 |
| Khách vào từ đâu | `nguon-khach` | Số liệu › Khách | Gộp | LL5 |
| Rủi ro hoàn hàng | `rui-ro-hoan` | Số liệu › Khách + huy hiệu ở Hộp thư | Gộp | LL5 |
| Tìm khách (trước: Khách hàng) | `ho-so-khach` | Hộp thư › Tìm khách | Gộp | LL2 · dựng lại VE5b |
| Cài đặt team · Bắt đầu | `cai-dat-team · bat-dau` | Cài đặt › Bắt đầu | Gộp | LL6 |
| Người và team | `team` | Cài đặt › Người và team (người từ HRM) | Giữ | LL6 · LL15 |
| Kết nối | `ket-noi` | Cài đặt › Kết nối (Pancake · POS · WhatsApp · HRM) | Giữ | LL6 |
| Model AI & khoá | `model` | Cài đặt › Model (chính + dự phòng, chỉ hiện thứ đã nối) | Giữ | LL6 · LL14 |
| Hệ còn sống không | `suc-khoe` | Cài đặt › Hệ còn sống | Giữ | LL6 |
| Ai đã sửa gì | `nhat-ky` | Cài đặt › Nhật ký | Giữ | LL6 |
| Đăng nhập · Chọn team | `auth` | giữ nguyên | Giữ | — |
| Nhắn cho khách (nhóm 3) · Kho ưu đãi · Hậu bán (nhóm 8) | (chưa có) | chưa có màn | Để sau | — |

---

## Bản cũ — 37 màn, 8 nhóm (hiệu lực tới khi LL8 gỡ màn cũ)

> Bản vẽ tương tác: <https://claude.ai/code/artifact/34dbfd0d-50cd-4e95-b07e-6adf202c7632>
> Dùng menu trang ở thanh công cụ để chuyển giữa 8 nhóm.

Mockup dùng đúng hệ thiết kế của dashboard đang chạy — xanh `#0e7c86`, sidebar `#0b2125`,
bo góc 12px, SF Pro 13.5px, cùng các thành phần `.pill` `.mc` `.tablecard` `.seg`. Dữ liệu
trong mockup lấy từ production thật; tên khách là tên đặt mới.

---

### Nhóm 1 · Vào hệ thống và điều phối

| Màn | Việc của nó |
|---|---|
| Chọn team | Ba thẻ team: Tiểu Alpha · Auus · Pialpha EU. Dữ liệu tách ở tầng dữ liệu |
| Trang chủ | Marketer vào thấy đúng việc của mình: đề xuất chờ duyệt, sản phẩm hết hàng, page kịch bản mỏng |
| Bàn hội thoại | Sale vào thẳng đây (CR-28-09). Ba cột: danh sách hội thoại (Cần người · Bot đang xử · Tất cả, đồng hồ 10 phút; chưa có hồ sơ khách thì hiện tên Messenger) · khung chat đọc thẳng Pancake, tin page gắn nhãn **Bot AI · Tự động · Page** (chỉ theo dữ liệu đối chiếu được — «Page» là sale gõ tay hoặc chưa đối chiếu, không đoán là sale) · bối cảnh: khách + rủi ro hoàn · đơn đang bàn · giai đoạn/người giữ/lý do cuối · kịch bản page đang chạy · lượt bot (v3 và bot cũ). KHÔNG ô soạn tin — trả lời ở Pancake |
| Chi tiết việc cần xử | Lý do bot dừng + thông tin đơn + đánh dấu đã xử; đoạn chat nằm ở bàn hội thoại, đọc thẳng Pancake |

### Nhóm 2 · Khách và đơn hàng

| Màn | Việc của nó |
|---|---|
| Nguồn khách vào | Sơ đồ hai luồng đơn chạy song song, chỉ gặp nhau ở đích. Chỗ rơi 37,4% |
| Trả lời bình luận | Sáu luật theo loại bình luận. Điều kiện để tắt Botcake diện rộng |
| Xác nhận đơn qua WhatsApp | **Chỉ đơn trang bán hàng.** Bộ lọc ngày, sản phẩm, marketer, thị trường, page |
| Hồ sơ khách hàng | Gộp ba kênh theo số điện thoại. Không gộp thì đếm nhầm đơn trùng |
| Rủi ro hoàn hàng | Bốn tầng chính sách thay vì một ngưỡng cứng |
| Hàng chờ tạo đơn | Đích của luồng Messenger. Sale duyệt là tạo đơn thẳng ở Chờ in |

### Nhóm 3 · Nhắn tin hàng loạt

| Màn | Việc của nó |
|---|---|
| Soạn tin hàng loạt | Chọn page, chọn sản phẩm, tự viết nội dung. **Bảng phân đường nằm cạnh nút gửi** |
| Xin phép nhận tin | Nút thắt của mọi việc nhắn ngoài 24 giờ. Năm chỗ xin, chỗ nào ăn nhất |
| Chiến dịch đã gửi | Danh sách chiến dịch, kho tin đã Meta duyệt, trần tần suất tự bảo vệ |
| Đuổi theo trong 24 giờ | Bậc thang theo mốc giờ: +2h nhắc nhẹ, +12h freeship, +20h tặng quà |

### Nhóm 4 · Bộ não AI

| Màn | Việc của nó |
|---|---|
| Bộ luật chung | 10 mục quy tắc cứng, 2.256 token, dùng chung 51 page. Có phiên bản, duyệt, phân tích ảnh hưởng |
| Thư viện kỹ năng | Tầng còn thiếu giữa bộ luật và kịch bản. Bật theo nhóm sản phẩm |
| Prompt của page | Xem prompt **thật** gửi cho model: bốn khối, số token từng khối, soi mâu thuẫn |
| AI đề xuất | Đề xuất sửa ở **cả ba tầng**, không chỉ kịch bản |

### Nhóm 5 · Kịch bản và nội dung

| Màn | Việc của nó |
|---|---|
| Kịch bản | Cây ba tầng: sản phẩm → nước → page. Tầng dưới ghi rõ "Kế thừa" khi không có bản riêng |
| Soạn kịch bản | **Hai bước không được đảo**: bản tiếng Việt cho team đọc → máy dịch thành lời bot nói |
| Nhập kịch bản từ Pancake | Thả file `quick_replies`, hệ thống bóc bảng giá và gắn nhãn ảnh |
| Lớp trả lời 0 đồng | Các mẫu miễn phí + đối chiếu bộ từ khoá Botcake |
| Thư viện ảnh | Ảnh gắn nhãn theo chủ đề để bot chọn đúng lúc |

### Nhóm 6 · Page và sản phẩm

| Màn | Việc của nó |
|---|---|
| Page & Bot | **Nút bật/tắt BOT AI.** Tắt Botcake bên kia trước, rồi mới gạt công tắc |
| Cửa kiểm sẵn sàng | Sáu điều kiện, bấm ô đỏ nhảy thẳng tới chỗ sửa |
| Sản phẩm & kho | Đồng bộ từ POS. Hết hàng thì tự tắt bot cho sản phẩm đó |
| Đưa sản phẩm mới lên chạy | Sáu chặng, mỗi chặng một cửa kiểm. Chặng 2 bắt buộc có động cơ |

### Nhóm 7 · Số liệu và quản trị

| Màn | Việc của nó |
|---|---|
| Báo cáo | **Tách hai luồng** vì đo bằng hai thước khác nhau |
| Chi phí AI | 127 đ/tin, 6.696 đ/đơn. Bảng theo page tìm chỗ đốt tiền mà không ra đơn |
| Hiệu quả kịch bản | A/B hai bản cạnh nhau theo phễu. Chưa đủ mẫu thì nói rõ chưa kết luận |
| Sức khỏe hệ thống | Đèn 9 chỉ số. Page bị chặn thì đếm số khách đang chờ |
| Model AI & khoá | Bốn nhà, khoá riêng từng team, quy giá công bố ra tiền thật |
| Cấu hình team | Kết nối POS, Pancake, WhatsApp, Botcake, Telegram · thành viên và vai |
| Kết nối & token | Kho token Pancake theo thứ tự failover, khoá Botcake, mẫu tin WhatsApp |
| Nhật ký thao tác | Ghi cả việc máy làm. Không sửa không xoá |

### Nhóm 8 · Giai đoạn sau

| Màn | Việc của nó |
|---|---|
| Kho ưu đãi | Giảm giá, freeship, tặng quà kèm điều kiện áp dụng và đo lãi ròng |
| Hậu bán & mua lại | Vòng đời sau khi nhận hàng, tính chu kỳ dùng hết để nhắc đúng lúc |

Hai màn này **đã thiết kế xong nhưng chưa làm** — để lại đợt sau theo yêu cầu.
