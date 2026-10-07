# Thêm, sửa câu trả lời sẵn theo từ khoá

> Trang này hướng dẫn thêm, sửa, bật hoặc tắt mẫu ở màn «Câu trả lời sẵn», và nói rõ bot đang thật sự dùng câu trả lời sẵn nào để trả lời khách mà không tốn tiền model.

**Ai làm được:** Marketer · Quản trị.

> **Đọc trước — đối chiếu với hệ ngày 05/10/2026:** theo mã hiện tại, bot **không lấy chữ và từ khoá của các mẫu ở màn này** để trả lời khách. Câu trả lời sẵn bot thật sự gửi là năm ô «Trả lời nhanh» trong tab «Lời bot» của từng page (hỏi giá · hỏi ship · hỏi cách đặt · hỏi hàng thật/giả · hỏi size / dung tích), khớp bằng bộ từ khoá có sẵn của hệ. Mẫu ở màn này hiện chỉ dùng để **đếm** số lượt bot trả lời sẵn theo mã mẫu. Muốn đổi câu bot gửi, sửa ở [Viết và lưu lời bot cho một page](./viet-loi-bot.md).
<!-- TBD: có định nối chữ và từ khoá của mẫu ở màn «Câu trả lời sẵn» vào đường trả lời của bot không; hiện mẫu chỉ là bộ đếm — OQ-MK-3 -->

__Khi nào dùng:__ theo dõi số lượt bot trả lời sẵn không tốn tiền; chuẩn bị mẫu theo mã mà bộ đếm của hệ nhận; bật/tắt việc đếm cho một mã.

__Trước khi bắt đầu:__
- Mẫu dùng chung cả team, không theo page và không lọc theo sản phẩm bạn phụ trách.
- Không có kiểm phiên bản chống đè: hai người cùng sửa một mẫu thì lượt lưu sau đè lượt trước.

## Các bước

1. Mở màn:
   - Marketer: **Page → Chính sách · FAQ · Phản đối**, rồi tab «Trả lời sẵn».
   - Quản trị: **Page → Luật chung**, rồi tab «Trả lời sẵn».
   (Hoặc từ tab «Trả lời sẵn» của một page, bấm «Xem câu trả lời sẵn».)
   → *Kết quả:* màn «Câu trả lời sẵn»: hàng số «Lượt không phải gọi model» · «Tiền tiết kiệm» · «Mẫu đang bật» · «Bật mà chưa khớp lần nào», rồi bảng «Mẫu trả lời».
2. Đọc bảng «Mẫu trả lời»: cột «Mã» · «Tên» · «Từ khoá» (hiện tối đa sáu từ, còn lại ghi «+…») · «Đã khớp» · «Trạng thái».
   → *Kết quả:* mẫu có nhãn «ngoài bộ đếm» cạnh mã thì số «Đã khớp» không bao giờ tăng.
3. Để thêm mẫu: bấm «Thêm mẫu» (bảng trống thì bấm «Thêm mẫu đầu tiên»).
   → *Kết quả:* hộp «Thêm mẫu trả lời sẵn» mở, dưới ô «Mã mẫu» có dòng «Bộ luật đang chạy chỉ đếm ba mã: that_gia · hoi_size · howto. Mã khác vẫn lưu được nhưng số «đã khớp» sẽ không bao giờ tăng.».
4. Điền hộp:
   - «Mã mẫu» (bắt buộc) — dùng một mã bộ đếm nhận.
   - «Tên để người đọc hiểu».
   - «Từ khoá» (bắt buộc) — mỗi dòng một từ, hoặc cách nhau bằng dấu phẩy; hệ đổi về chữ thường và bỏ từ trùng.
   - «Câu bot sẽ trả lời» (bắt buộc).
   - «Chỉ áp cho nhóm sản phẩm» — bỏ trống là mọi sản phẩm.
   - Công tắc «Bật mẫu này».
   → *Kết quả:* chưa có gì được lưu.
5. Bấm «Lưu mẫu».
   → *Kết quả:* hộp đóng, thông báo «Đã tạo mẫu «…».» (hoặc «Đã lưu mẫu «…».»). Mã ngoài bộ đếm thì đầu màn hiện thêm hộp «Mẫu vừa lưu nằm ngoài bộ đếm».
6. Để sửa: bấm «Sửa» ở cuối dòng.
   → *Kết quả:* hộp «Sửa mẫu «…»» mở với chữ hiện có. Ô «Mã mẫu» bị khoá — mã là khoá của mẫu, đổi mã là tạo mẫu thứ hai.
7. Để bật/tắt nhanh: gạt công tắc ở cột «Trạng thái».
   → *Kết quả:* «Đã bật mẫu «…».» hoặc «Đã tắt mẫu «…».». Mẫu tắt thì không được đếm.

![Màn «Câu trả lời sẵn» — hàng số, bảng «Mẫu trả lời» và nút «Thêm mẫu»](images/cau-tra-loi-san.png)

<!-- CHỤP: anh=cau-tra-loi-san · vai=marketer · duong=/lop-0-dong · cho=«Mẫu trả lời»
     thao_tac=
     trang_thai=bảng có ít nhất hai mẫu, một mẫu mang nhãn «ngoài bộ đếm» nếu dữ liệu có; nút «Thêm mẫu» đang hiện
     danh_dau=(1) «Mẫu trả lời» · (2) «Thêm mẫu» · (3) «Đã khớp» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Bảng «Mẫu trả lời» | Đọc mã, từ khoá, trạng thái từng mẫu |
| (2) | Nút «Thêm mẫu» | Mở hộp thêm mẫu |
| (3) | Cột «Đã khớp» | Số lượt bot trả lời sẵn theo mã này; «—» là chưa đếm được |

![Hộp «Thêm mẫu trả lời sẵn» — ô từ khoá, câu trả lời và nút «Lưu mẫu»](images/cau-tra-loi-san-2.png)

<!-- CHỤP: anh=cau-tra-loi-san-2 · vai=marketer · duong=/lop-0-dong · cho=«Thêm mẫu»
     thao_tac=bấm «Thêm mẫu»
     trang_thai=hộp «Thêm mẫu trả lời sẵn» đang mở, các ô còn trống, dòng gợi ý dưới «Mã mẫu» đang hiện
     danh_dau=(1) «Từ khoá» · (2) «Câu bot sẽ trả lời» · (3) «Lưu mẫu» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô «Từ khoá» | Mỗi dòng một từ, hoặc cách nhau bằng dấu phẩy |
| (2) | Ô «Câu bot sẽ trả lời» | Câu của mẫu (xem phần «Đọc trước» ở đầu trang) |
| (3) | Nút «Lưu mẫu» | Tạo hoặc lưu mẫu |

## Đọc hàng số

| Ô | Nghĩa |
|---|---|
| «Lượt không phải gọi model» | Tổng số lượt đã đếm được ở các mẫu |
| «Tiền tiết kiệm» | Số lượt trên nhân 127 đ/tin, theo giá ở màn Chi phí AI |
| «Mẫu đang bật» | Số mẫu bật trên tổng số mẫu |
| «Bật mà chưa khớp lần nào» | Mẫu bật mà số đếm vẫn 0 — kèm nhãn «Xem lại từ khoá» |

Mục «Tính năng liên quan» có dòng «Đối chiếu với bộ từ khoá Botcake» mang nhãn «Chưa khả dụng»: hệ chưa so được bộ từ khoá này với Botcake.

## Xử lý khi lỗi

| Màn ghi | Nghĩa | Làm gì |
|---|---|---|
| «Thiếu mã — bộ đếm cộng theo mã này.» | Ô «Mã mẫu» trống | Điền mã |
| «Chưa có từ khoá nào thì mẫu không bao giờ khớp.» | Ô «Từ khoá» trống | Điền ít nhất một từ |
| «Mẫu rỗng thì lớp 0 đồng trả lời khách bằng gì?» | Ô «Câu bot sẽ trả lời» trống | Điền câu |
| «vai này chỉ được XEM mẫu 0 đồng, không được sửa.» | Vai chỉ xem — màn không hiện «Thêm mẫu», «Sửa», công tắc | Nhờ quản trị kiểm vai |
| «Không đổi được trạng thái mẫu» | Gạt công tắc không lưu được; công tắc tự trả về vị trí cũ | Tải lại, thử lại |
| «Chưa có mẫu trả lời nào» | Team chưa nhập mẫu nào | Bấm «Thêm mẫu đầu tiên» nếu cần đếm |
| «Không tải được câu trả lời sẵn» | Lượt đọc hỏng | Tải lại trang |

__Liên quan:__ [Viết và lưu lời bot cho một page](./viet-loi-bot.md) · [Tìm page tốn tiền AI mà không ra đơn](./tim-page-ton-tien-ai.md) · [Sửa Chính sách · FAQ · Phản đối dùng chung mọi page](./chinh-sach-faq-phan-doi.md)
