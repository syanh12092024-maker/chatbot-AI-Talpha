# Lý do bot giao việc và kết quả đóng việc

> Bảng tra cho sale và quản trị: mỗi lý do có thể hiện trên một việc (hoặc ở dòng «Vì sao chuyển») nghĩa là gì và nên làm gì, cùng mọi kết quả và lý do đóng việc.

Đối chiếu với hệ ngày 05/10/2026.

**Vai đọc:** Sale · Quản trị.

Lý do hiện ở bốn chỗ: dòng phụ của mỗi hội thoại trong tab «Cần bạn» · cột «Lý do bot đẩy sang» ở màn «Việc đang chờ» · dòng «Vì sao chuyển» trong khối «Bot đã làm gì» · tiêu đề trang «Chi tiết việc cần xử».

## Lý do có tên

Khi lý do ghi trên việc trùng một mã dưới đây, màn hiện chữ ở cột thứ hai. Cùng một mã hiện cùng một chữ ở mọi màn.

| Mã | Chữ trên màn | Nghĩa | Sale nên làm gì |
|---|---|---|---|
| `khieu_nai` | «Khách khiếu nại» | Khách phàn nàn về hàng hoặc dịch vụ | Nhận việc ngay, đọc hội thoại, trả lời khách trên Pancake |
| `doi_tra` | «Khách đòi đổi hoặc trả hàng» | Khách muốn đổi hoặc trả hàng đã nhận | Tra đơn cũ ở màn Tìm khách; xử lý đổi/trả trên kho hàng, trả lời trên Pancake |
| `hoan_tien` | «Khách đòi hoàn tiền» | Khách đòi trả lại tiền | Như trên; việc tiền bạc ngoài tầm bot |
| `gia_dac_biet` | «Khách xin giá ngoài khung» | Khách xin giá không có trong bảng giá của page — bot không được tự báo | Quyết theo thẩm quyền của team, trả lời trên Pancake |
| `loi_ky_thuat` | «Lỗi kỹ thuật, bot không trả lời được» | Bot gặp lỗi khi xử lý tin của khách | Trả lời thay bot trên Pancake; lỗi lặp ở nhiều khách thì báo quản trị |
| `ngoai_kich_ban` | «Câu hỏi ngoài kịch bản» | Khách hỏi điều kịch bản và kiến thức của page không có | Trả lời trên Pancake; câu hay gặp thì báo marketer bổ sung |
| `khach_gian` | «Khách tỏ ra khó chịu» | Khách bực, cần người nói chuyện | Nhận ngay, trả lời bằng người trên Pancake |
| `qua_luot` | «Hết ngân sách lượt của khách này» | Bot đã dùng hết số lượt trả lời cho khách này trong 24 giờ | Khách còn do dự — vào chốt trên Pancake |
| `don_can_duyet` | «Đơn bot chốt, chờ sale duyệt» | Bot đã chốt đơn, chờ duyệt | Mở thẻ đơn, duyệt / sửa / từ chối — [Duyệt, sửa hoặc từ chối đơn Messenger chờ duyệt](./duyet-don-messenger.md) |
| `don_sai_thong_tin` | «Đơn thiếu hoặc sai thông tin» | Đơn thiếu hoặc sai tên, số, địa chỉ… | Hỏi lại khách trên Pancake, sửa đơn, lưu rồi duyệt |
| `trung_don` | «Nghi trùng với đơn đã có» | Cùng khách đã có đơn khác gần đây | Kiểm «Mọi đơn của khách» ở màn Tìm khách và trên kho hàng — [Sự cố đơn](./su-co-don.md) |
| `khac` | «Lý do khác» | Không thuộc các mục trên | Đọc hội thoại để biết chuyện gì |

Luật hiện chữ:

| Lý do ghi trên việc | Màn hiện |
|---|---|
| Trùng một mã trong bảng trên | Chữ của mã đó |
| Trông như mã (chữ thường, số, gạch dưới) nhưng không có trong bảng | «Lý do chưa có tên (mã {mã})» |
| Trống | «(không ghi lý do)» |
| Chữ tự do | Hiện nguyên văn |

## Chữ tự do hệ đang ghi lên việc

| Chữ trên màn | Xuất hiện khi | Loại việc | Nên làm gì |
|---|---|---|---|
| «sale nhận thay bot ở Hộp thư» | Một sale bấm «Nhận thay bot» | Hội thoại | Người vừa bấm nên «Nhận việc» ngay — xem [Nhận thay bot một hội thoại bot đang xử](./nhan-thay-bot.md) |
| Lý do do quản trị gõ, hoặc «người bấm bàn giao cho sale» nếu bỏ trống | Quản trị bấm «Chuyển nhân viên xử lý» ở Cài đặt › Vận hành | Hội thoại | Đọc hội thoại, nhận việc, trả lời trên Pancake |
| «doi_sua: khách muốn đổi/sửa đơn — ngoài tầm bot xác nhận» | Khách trang bán hàng trả lời rằng muốn đổi/sửa đơn | Đơn | Sửa đơn trên kho hàng theo ý khách |
| «khong_ro: bộ đọc ý không phán được câu trả lời của khách» | Bot không hiểu khách trả lời xác nhận thế nào | Đơn | Hỏi lại khách, xác nhận trên kho hàng |
| «het_luot_nhac: đã nhắc hết lượt qua WhatsApp mà khách không trả lời» | Khách không trả lời các lần nhắc xác nhận | Đơn | Gọi khách xác nhận |
| «pos_trang_thai_la={mã}: khách ĐÃ đồng ý nhưng POS đang ở mã {mã}, …» | Khách đã đồng ý nhưng đơn trên kho hàng đã ở trạng thái khác, hệ không ghi đè | Đơn | Kiểm đơn trên kho hàng và chuyển trạng thái bằng tay nếu đúng |
| «pos_tu_choi_ghi ({tên lỗi}): …» | Hệ không ghi được trạng thái lên kho hàng (ví dụ cửa ghi đang đóng) | Đơn | Chuyển trạng thái đơn bằng tay trên kho hàng; báo quản trị nếu lặp |
| «qua_tran_thu_lai ({lần}/{tối đa}) — lý do cuối: …» | Gửi tin xác nhận lỗi quá số lần thử | Đơn | Gọi khách xác nhận, xử lý trên kho hàng |

Sáu dòng cuối thuộc luồng xác nhận đơn trang bán hàng qua WhatsApp — luồng này hôm nay chưa chạy (WhatsApp chưa nối — sẽ bổ sung sau), nên thực tế chưa gặp.

## Chữ ở dòng «Vì sao chuyển» khi hội thoại không có việc

Hội thoại không có việc đang mở thì «Vì sao chuyển» hiện lý do bot ghi lần cuối trên hội thoại — thường là mã ngắn. Những hội thoại bot tự chuyển cho người hôm nay **không kèm việc**, nên không vào tab «Cần bạn»; bạn thấy chúng ở lối «Mọi hội thoại gần đây» (nhãn «Sale») và trên Pancake.

| Chữ trên màn | Nghĩa |
|---|---|
| «complaint» | Bot nhận ra khách khiếu nại và chuyển người |
| «page_no_kb» | Page chưa có kịch bản / kiến thức — bot không tư vấn được |
| «AI đã dùng hết ngân sách {N} lượt/24h (khách {nhóm}) — khách còn do dự, cần người vào chốt» (có thể mở đầu bằng «🔴 ƯU TIÊN (khách đã cho SĐT + địa chỉ) — ») | Bot hết lượt trả lời cho khách này trong 24 giờ; có tiền tố «ƯU TIÊN» khi khách đã cho số và địa chỉ |
| «cửa ra chặn: {luật}» | Câu bot soạn bị cửa kiểm chặn không cho gửi, bot chuyển người thay vì gửi |
| Câu tự do do bot viết | Bot chủ động chuyển người và tự ghi lý do (ví dụ khách đòi gặp người) |
| «sale_tiep_quan_tren_kenh» | Hệ thấy có người trả lời trên Pancake nên chuyển hội thoại sang Sale giữ — xem [Trả lời khách trên Pancake mà không chen ngang bot](./tra-loi-tren-pancake.md) |
| «sale_tra_ai» | Quản trị đã bấm «Cho AI tiếp tục» — bot giữ lại hội thoại |
| «doi_chieu_tin_loi» | Quản trị đối chiếu một tin lỗi và giao hội thoại cho Sale |

## Kết quả đóng việc

Hàng nút «Kết quả» trong khung «Đánh dấu đã xử». Danh sách do hệ trả về theo loại việc.

| Chữ trên màn | Có ở loại việc | Khi nào chọn | Cần thêm |
|---|---|---|---|
| «Chốt được» | Hội thoại · Đơn | Khách đã đồng ý mua | Việc loại Đơn: ô «Chi phí đóng đơn (đồng)», không bắt buộc |
| «Khách từ chối» | Hội thoại · Đơn | Khách nói không mua | Lý do bắt buộc (bảng dưới) |
| «Khách không trả lời» | Hội thoại · Đơn | Đã liên hệ mà khách im | — |
| «Đã xử ở Pancake/POS» | Hội thoại · Đơn | Việc đã xong trên Pancake hoặc kho hàng, không thuộc các kết quả kia | — |
| «Trả lại cho bot» | Chỉ Hội thoại | Bạn muốn ghi rằng việc nên trả về bot | — · Chỉ ghi lại kết quả: hội thoại **vẫn do Sale giữ**, bot không nói tiếp. Muốn bot nói tiếp phải nhờ quản trị — xem [Nhận thay bot một hội thoại bot đang xử](./nhan-thay-bot.md) |
| «Bot đẩy nhầm, không phải việc» | Hội thoại · Đơn | Việc lẽ ra không phải giao cho người | Lý do bắt buộc (bảng dưới) |

## Lý do đi kèm kết quả

| Kết quả | Mã lý do | Chữ trên màn |
|---|---|---|
| «Khách từ chối» | `gia_cao` | «Chê giá cao» |
| | `khong_tin` | «Chưa tin shop» |
| | `da_mua_cho_khac` | «Đã mua chỗ khác» |
| | `khong_can_nua` | «Không còn nhu cầu» |
| | `giao_lau` | «Chê giao hàng lâu» |
| | `khac` | «Lý do khác» |
| «Bot đẩy nhầm, không phải việc» | `bot_hieu_sai` | «Bot hiểu sai ý khách» |
| | `khach_hoi_binh_thuong` | «Khách chỉ hỏi bình thường» |
| | `trung_viec` | «Trùng với việc khác» |
| | `loi_ky_thuat` | «Lỗi kỹ thuật, bot không trả lời được» |
| | `khac` | «Lý do khác» |

## Ràng buộc khi đóng việc

| Mục | Giá trị |
|---|---|
| Hạn của một việc | 10 phút sau lúc việc vào hàng đợi; còn ≤ 5 phút đồng hồ màu cam, quá hạn màu đỏ kèm «+» |
| Ô «Ghi chú» | Không bắt buộc, tối đa 500 ký tự; bắt buộc ít nhất 5 ký tự khi chọn «Lý do khác» |
| Ô «Chi phí đóng đơn (đồng)» | Chỉ có với việc loại Đơn + «Chốt được»; để trống được; số không âm, tối đa 2 chữ số sau dấu chấm, trần 100.000.000 |
| Nhận hộ | Chọn thẳng kết quả khi việc còn «Chờ người» thì hệ nhận hộ rồi đóng trong một lần |
| Mở lại | Không có — việc đã đóng không mở lại, không sửa kết quả |
| Hai người cùng thao tác | Người chậm hơn nhận câu «Việc này {tên} đang giữ từ {giờ}.» hoặc «Việc này {tên} đã đóng lúc {giờ} — kết quả "…". Không ghi đè.» |

__Liên quan:__ [Nhận một việc bot giao lại và đóng việc với kết quả](./nhan-va-dong-viec.md) · [Khi nào bot trả lời, khi nào im và giao cho người](./khi-nao-bot-tra-loi.md) · [Các loại đơn ở tab Đơn chờ và cách xử lý ngoài hệ](./cac-loai-don-cho.md)
