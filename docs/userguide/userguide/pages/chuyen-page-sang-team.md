# Chuyển page sang team khác

> Trang này hướng dẫn người quản trị chuyển một hoặc nhiều page từ team đang mở sang team khác, và kéo page mới quét từ Pancake từ kho «Chưa phân team» về team — ở màn Cài đặt → Người và team.

**Ai làm được:** Quản trị — và phải là Quản trị **ở team bạn đang mở**. Vai Quản lý (vai cũ, không còn cấp mới) xem được khung chuyển nhưng nút bị khoá, dưới bảng ghi «Vai của bạn chỉ xem được.»

__Khi nào dùng:__ một page đổi team phụ trách; page mới vừa quét từ Pancake về đang nằm ở kho «Chưa phân team» và cần đưa vào team.

__Trước khi bắt đầu:__
- **Chuyển page là đổi chủ dữ liệu**, không phải đổi một nhãn. Hội thoại, kịch bản, sản phẩm, đơn và các dữ liệu khác gắn với page đi theo sang team mới; team cũ **không còn thấy** chúng. Riêng sổ chi phí AI của page ở lại team cũ để giữ số liệu lịch sử.
- Đẩy page **đi**: đứng ở team đang có page. Kéo page **về** từ kho «Chưa phân team»: đứng ở team sẽ nhận page.
- Mỗi lần tối đa **100 page** — trần này để một cú bấm nhầm không dời cả kho page.

## Các bước — chuyển page sang team khác

1. Mở **Cài đặt → Người và team**, bấm «Chuyển page sang team khác» ở đầu trang.
   → *Kết quả:* khung «Chuyển page sang team khác» ở cuối trang mở ra (đường dẫn thêm `#chuyen-page`, tải lại trang vẫn mở sẵn). Ghi chú đầu khung: «Chuyển page là đổi chủ dữ liệu: hội thoại, kịch bản và sản phẩm đi theo sang team mới, team này sẽ không còn thấy chúng. Tối đa 100 page mỗi lần.»
2. Giữ nút nguồn «Page của team này» (đang sáng). Gõ vào ô lọc nếu cần — ô gợi ý «Tên page, id Facebook, thị trường…».
   → *Kết quả:* số đếm đổi thành «{n}/{tổng} page khớp». Danh sách hiện tối đa 200 dòng; vượt thì có dòng «Còn {n} page không hiện — gõ vào ô lọc để thu hẹp (danh sách cắt ở 200 dòng).»
3. Tích ô ở đầu các dòng page cần chuyển (ô ở tiêu đề cột chọn hết các page đang hiện).
   → *Kết quả:* chân bảng ghi «Đã chọn {n} page»; nút «Chuyển page đã chọn» sáng lên.
4. Chọn team đích ở ô «Chuyển sang».
   → *Kết quả:* danh sách chỉ gồm team nghiệp vụ khác team đang mở.
5. Bấm «Chuyển page đã chọn».
   → *Kết quả:* hộp xác nhận «Chuyển {n} page sang team «{team}»?» báo «Hội thoại, kịch bản và sản phẩm của những page đó sẽ đi theo sang team mới. Team hiện tại sẽ KHÔNG còn nhìn thấy chúng.»
6. Bấm «Chuyển page».
   → *Kết quả:* hộp kết quả «Chuyển xong {x}/{n} page sang «{team}»» kèm dòng «Đi theo: …» (số dòng dữ liệu đi theo, theo từng loại) và «Cố ý ở lại team cũ (số liệu lịch sử): …». Page đã chuyển biến khỏi danh sách.

![Khung «Chuyển page sang team khác» — chọn nguồn, tích page, chọn team đích](images/chuyen-page-sang-team.png)

<!-- CHỤP: anh=chuyen-page-sang-team · vai=quan-tri · duong=/cau-hinh-team#chuyen-page · cho=«Page của team này»
     thao_tac=tích ô của hai dòng page đầu tiên
     trang_thai=khung chuyển đang mở; nút nguồn «Page của team này» sáng; hai page được tích; chân bảng ghi «Đã chọn 2 page», ô «Chuyển sang» có team đích, nút «Chuyển page đã chọn» sáng
     danh_dau=(1) «Kho chưa phân team» · (2) «Đã chọn» · (3) «Chuyển page đã chọn» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Hai nút nguồn «Page của team này» / «Kho chưa phân team» | Chọn nơi lấy page |
| (2) | Dòng «Đã chọn {n} page» | Kiểm số page trước khi bấm |
| (3) | Nút «Chuyển page đã chọn» (đỏ) | Mở hộp xác nhận; khi nguồn là kho thì nút đổi thành «Kéo page đã chọn về» |

## Các bước — kéo page mới từ kho «Chưa phân team» về team

Page quét từ Pancake về rơi vào kho «Chưa phân team». Không ai đứng được trong kho đó, nên đây là đường duy nhất đưa page về team thật.

1. Đổi chip team sang **team sẽ nhận page**, rồi mở khung «Chuyển page sang team khác» như trên.
2. Bấm nút nguồn «Kho chưa phân team».
   → *Kết quả:* ghi chú đổi thành «Kéo page từ kho «Chưa phân team» về team đang mở. …»; bảng liệt kê page trong kho.
3. Tích page cần kéo, rồi chọn **team đang mở** ở ô «Kéo về» (danh sách xếp theo tên, nên dòng đầu chưa chắc là team của bạn).
4. Bấm «Kéo page đã chọn về», rồi bấm «Chuyển page» trong hộp xác nhận. Hộp xác nhận dùng chung chữ với lượt chuyển đi («Chuyển {n} page sang team «…»?»).
   → *Kết quả:* «Chuyển xong {x}/{n} page sang «{team}»»; page xuất hiện ở danh sách page của team. Bước «Có page trong team» ở Cài đặt → Bắt đầu thành «Xong».

## Lưu ý

- Mỗi page chuyển trong một lượt riêng: page hỏng không làm dừng cả mẻ. Hộp kết quả liệt kê tối đa 8 page hỏng, mỗi dòng «page {id}: {lỗi}»; hộp chuyển màu vàng khi có page hỏng.
- Công tắc bot của page (cột «Bot») đi theo page, không bị tắt khi chuyển. Kiểm lại page ở team mới sau khi chuyển: [Kiểm tra page đã sẵn sàng bật bot chưa](./kiem-tra-bat-duoc-chua.md).
- Không chuyển được page vào kho «Chưa phân team» — đường này chỉ kéo ra, không đẩy vào.
- Mỗi lượt chuyển ghi một dòng nhật ký «Chuyển page sang team khác» kèm team cũ, team mới và số dòng đi theo. Xem [Tra nhật ký: ai đã làm gì, lúc nào](./tra-nhat-ky.md).

## Xử lý khi lỗi

- «Không có team nào khác để chuyển sang» — hệ chỉ có một team nghiệp vụ; bấm «Xem danh sách team» để kiểm.
- Khung chỉ hiện một dòng «Chuyển page sang team khác» kèm nhãn không khả dụng và câu «Team này đang có {n} page. …» — máy chủ chưa nối đường chuyển page; nhờ người quản trị hệ thống.
- «Không page nào khớp» — xoá chữ trong ô lọc.
- «một mẻ tối đa 100 page, đang chọn {n}. Chia nhỏ ra…» — bỏ bớt dấu tích, chuyển nhiều lượt.
- «team đích trùng team đang mở — không có gì để chuyển.» — chọn team khác ở ô «Chuyển sang».
- Dòng hỏng «page {id}: … đã thuộc team {…} rồi…» — page đã ở team đích, bỏ qua.
- Dòng hỏng «… Người ngoài cả hai team không chuyển page của họ được.» khi kéo từ kho — bạn chọn ở ô «Kéo về» một team khác team đang mở. Chọn lại team đang mở, hoặc đổi chip sang team kia rồi kéo.
- Dòng hỏng «… không có vai "quan-tri" trong team … — chỉ quản trị mới chuyển được page.» — bạn không là Quản trị ở team đang mở; xin cấp vai hoặc nhờ Quản trị của team đó.
- Hộp đỏ «Khối «chuyển page» không tải được» ở đầu trang — đọc câu kèm theo, tải lại trang.

__Liên quan:__ [Thêm kho hàng, kéo danh mục và quét page](./them-kho-hang-keo-du-lieu.md) · [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) · [Bắt đầu nhanh cho Quản trị: đưa page đầu tiên tới lúc bật bot](./bat-dau-nhanh-quan-tri.md)
