# Bắt đầu nhanh cho Quản trị: đưa page đầu tiên tới lúc bật bot

> Trang này dẫn bạn — người quản trị một team mới — đi đúng một đường, từ lúc team còn trống tới lúc bot trả lời khách trên page đầu tiên, bám theo màn Cài đặt → Bắt đầu.

**Ai làm được:** Quản trị. Marketer mở được màn Bắt đầu để xem team còn thiếu gì, nhưng các nút đi làm bị tắt và hiện lời nhắc «Màn này cần vai Quản trị — nhờ quản trị làm việc này».

__Khi nào dùng:__ team chưa có page nào bật bot, hoặc bạn vừa nhận quản trị một team và cần biết còn thiếu việc gì. Mỗi chặng dưới đây chỉ làm việc tối thiểu rồi trỏ sang trang hướng dẫn đầy đủ của chặng đó.

__Trước khi bắt đầu:__
- Bạn đăng nhập bằng tài khoản mang vai **Quản trị** trong team cần cài, và chip team trên thanh ngang đang ghi đúng team đó. Chưa biết cách đổi team: xem [Đăng nhập, chọn team và đổi team](./dang-nhap-chon-team.md).
- Chuẩn bị sẵn: chuỗi tài khoản Pancake; mã cửa hàng và khoá API kho hàng của từng thị trường; khoá API của nhà model bạn định dùng.
- Màn Bắt đầu **chỉ đọc**. Nó không lưu gì; mỗi việc có một nút dẫn sang đúng màn làm việc đó.

## Đọc màn Bắt đầu trong 30 giây

Mở **Cài đặt → Bắt đầu** (đường dẫn `/cai-dat-team`). Màn có ba phần:

- Khung tóm tắt trên cùng: «Xong {n}/5 việc.» và dòng «Việc tiếp theo: …» kèm một nút xanh dẫn thẳng tới việc đầu tiên chưa xong.
- Khối «Năm việc làm trên màn»: năm dòng, mỗi dòng một nhãn «Xong», «Chưa làm» hoặc «Chưa đo được». «Chưa đo được» nghĩa là hệ chưa đọc được dữ liệu — không phải bạn chưa làm.
- Khối «Việc phải nhờ người quản trị hệ thống»: những việc nằm ở cấu hình máy chủ, bạn không bấm được trên màn.

![Cài đặt → Bắt đầu — khung «Việc tiếp theo» và năm việc của team](images/bat-dau-nhanh-quan-tri.png)

<!-- CHỤP: anh=bat-dau-nhanh-quan-tri · vai=quan-tri · duong=/cai-dat-team · cho=«Năm việc làm trên màn»
     thao_tac=
     trang_thai=khung tóm tắt ghi «Xong …/5 việc.» và «Việc tiếp theo: …» có nút; khối năm việc có ít nhất một dòng «Chưa làm» kèm nút đi làm
     danh_dau=(1) «Việc tiếp theo» · (2) «Năm việc làm trên màn» · (3) «Việc phải nhờ người quản trị hệ thống» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Dòng «Việc tiếp theo» và nút xanh bên cạnh | Bấm để tới thẳng việc đầu tiên còn thiếu |
| (2) | Khối «Năm việc làm trên màn» | Mỗi dòng chưa xong có nút riêng («Mở màn Kết nối», «Mở màn Model AI»…) |
| (3) | Khối «Việc phải nhờ người quản trị hệ thống» | Chỉ đọc — xem bước 7 |

## Các bước

1. Mở **Cài đặt → Bắt đầu**.
   → *Kết quả:* bạn thấy «Xong {n}/5 việc.» và việc tiếp theo cần làm. Dòng «Có người và vai trong team» thường đã «Xong» vì chính bạn đang ở trong team.
2. Nối tài khoản Pancake: ở dòng «Có tài khoản Pancake», bấm «Mở màn Kết nối», dán chuỗi tài khoản vào khung «Thêm token» rồi bấm «Thử và thêm tài khoản».
   → *Kết quả:* thông báo «Đã thêm token của «…» — phủ {n} page.»; quay lại Bắt đầu, dòng này ghi «{n}/{n} sống» và «Xong». Chi tiết: [Kết nối tài khoản Pancake](./ket-noi-pancake.md).
3. Nối kho hàng và kéo sản phẩm: vẫn ở màn Kết nối, kéo xuống phần «Kéo dữ liệu», bấm «Thêm kho POS», khai thị trường, mã cửa hàng, khoá API rồi bấm «Lưu kết nối»; sau đó bấm «Kéo danh mục và giá từ POS».
   → *Kết quả:* hộp «Đã kéo danh mục sản phẩm» ghi số sản phẩm mới và số bậc giá; dòng «Nối kho hàng và kéo sản phẩm kèm giá» thành «Xong». Chi tiết: [Thêm kho hàng, kéo danh mục và quét page](./them-kho-hang-keo-du-lieu.md).
4. Đưa page về team: bấm «Quét Pancake tìm page mới» (cùng phần «Kéo dữ liệu»). Page mới quét về nằm ở kho «Chưa phân team», nên tiếp theo mở **Cài đặt → Người và team**, bấm «Chuyển page sang team khác», chọn «Kho chưa phân team», tích page cần dùng rồi bấm «Kéo page đã chọn về».
   → *Kết quả:* hộp kết quả «Chuyển xong {n}/{n} page sang «…»»; dòng «Có page trong team» thành «Xong». Chi tiết: [Chuyển page sang team khác](./chuyen-page-sang-team.md).
5. Chọn model: ở dòng «Chọn model AI và dán khoá», bấm «Mở màn Model AI». Ở thẻ «Trả lời khách», chọn model, dán khoá vào ô «Khoá API», bấm «Thay khoá và thử một lượt», rồi bấm «Lưu cấu hình».
   → *Kết quả:* thẻ hiện nhãn «Khoá dùng được»; thông báo «Đã lưu. Lượt chat kế tiếp của bot đi model mới.»; dòng model trên Bắt đầu thành «Xong». Chi tiết: [Chọn model AI, thay khoá và thử một lượt](./chon-model-ai.md).
6. Thêm người làm việc: mở **Cài đặt → Người và team**, tạo tài khoản cho marketer và sale (nút «Tạo người dùng»), hoặc lấy cả danh sách từ HRM (nút «Lấy người từ HRM (BigQuery)»).
   → *Kết quả:* bảng «Người trong team» có thêm người kèm vai. Chi tiết: [Tạo người dùng, cấp vai và đặt mật khẩu đầu tiên](./tao-nguoi-dung.md) · [Lấy người từ HRM: xem kế hoạch rồi áp dụng](./lay-nguoi-tu-hrm.md).
7. Quay lại **Cài đặt → Bắt đầu**, nhìn khối «Việc phải nhờ người quản trị hệ thống». Cả hai dòng «Cho bot gửi tin cho khách» và «Bật cách ghép lời mới» phải mang nhãn «Đang mở». Dòng nào «Đang đóng» thì nhờ người quản trị hệ thống mở, rồi bấm «Kiểm lại».
   → *Kết quả:* thông báo «Đã đọc lại.»; hai dòng đổi sang «Đang mở». Danh sách việc phải nhờ: [Việc phải nhờ người quản trị hệ thống](./tra-cuu-nho-quan-tri-he-thong.md).
8. Gắn sản phẩm cho page: mở đích **Sản phẩm**, gộp các món kho hàng cùng SKU thành một sản phẩm, rồi gắn page vào sản phẩm đó ở một thị trường.
   → *Kết quả:* page có sản phẩm và giá để bot chào bán. Chi tiết: [Gộp món POS thành một sản phẩm theo SKU](./gop-mon-pos.md) · [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md).
9. Kiểm page đã sẵn sàng: mở trang của page đó, đọc khối «Bật được chưa» và làm nốt mọi điều kiện còn thiếu.
   → *Kết quả:* không còn điều kiện chặn. Chi tiết: [Kiểm tra page đã sẵn sàng bật bot chưa](./kiem-tra-bat-duoc-chua.md).
10. Bật bot cho page: trên trang của page, bấm «Bật bot» và xác nhận.
    → *Kết quả:* dải trạng thái trên thanh ngang chuyển sang «Bot chạy 1/{n} page». Chi tiết: [Bật hoặc tắt bot cho một page](./bat-tat-bot.md).

![Khối «Việc phải nhờ người quản trị hệ thống» với nút «Kiểm lại»](images/bat-dau-nhanh-quan-tri-2.png)

<!-- CHỤP: anh=bat-dau-nhanh-quan-tri-2 · vai=quan-tri · duong=/cai-dat-team · cho=«Kiểm lại»
     thao_tac=cuộn tới «Việc phải nhờ người quản trị hệ thống»
     trang_thai=hai dòng «Cho bot gửi tin cho khách» và «Bật cách ghép lời mới», mỗi dòng có nhãn «Đang mở» hoặc «Đang đóng»; dưới cùng có nút «Kiểm lại»
     danh_dau=(1) «Cho bot gửi tin cho khách» · (2) «Bật cách ghép lời mới» · (3) «Kiểm lại» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Dòng «Cho bot gửi tin cho khách» | «Đang đóng» thì bot vẫn đọc và nghĩ ra câu trả lời nhưng không gửi cho khách |
| (2) | Dòng «Bật cách ghép lời mới» | «Đang đóng» thì bot không đọc kịch bản và quy tắc bạn soạn trên hệ |
| (3) | Nút «Kiểm lại» | Bấm sau khi người quản trị hệ thống báo đã sửa |

## Khi màn nói «Xong cả 5 việc của TEAM»

Câu này chỉ nói năm việc **của team** đã xong. Từng page vẫn phải cài riêng — màn ghi ngay dưới: «Từng page vẫn cài riêng: thị trường, sản phẩm, kịch bản, rồi mới bật bot.» Bấm «Mở danh sách page» để tiếp tục từ bước 8.

## Xử lý khi lỗi

- Hộp đỏ «Không đọc được đường cài đặt»: tải lại trang. Vẫn lỗi thì chụp màn hình câu lỗi gửi người quản trị hệ thống.
- Dòng «Có tài khoản Pancake» mang nhãn «Chưa đo được» kèm câu «Báo người quản trị hệ thống — đây là lỗi dựng ứng dụng.»: máy chủ chưa đọc được kho tài khoản Pancake; bạn không sửa được trên màn. Nếu câu là «Thử lại, hoặc xem màn Hệ còn sống không.» thì tải lại trang trước.
- Dòng kho hàng ghi «{n} sản phẩm nhưng 0 bậc giá — khách hỏi giá thì bot không trả lời được.»: kéo lại danh mục; vẫn thiếu thì sửa giá ở [Sửa bảng giá của sản phẩm ở một thị trường](./sua-bang-gia.md).
- Dòng «Có tài khoản Pancake» ghi «Cả {n} tài khoản đều hết hạn — bot không gọi được Pancake.»: thêm một tài khoản còn hạn ở màn Kết nối.
- Nút đi làm bị mờ, di chuột vào hiện «Màn này cần vai Quản trị — nhờ quản trị làm việc này»: tài khoản đang mở không mang vai Quản trị ở team này. Xem [Sự cố đăng nhập, quyền và «không thấy màn»](./su-co-dang-nhap-quyen.md).

__Liên quan:__ [Kiểm tra «Hệ còn sống» mỗi ngày](./kiem-tra-he-con-song.md) · [Lọc danh sách page và bật bot hàng loạt](./loc-page-bat-bot-hang-loat.md) · [Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md)
