# Tạo người dùng, cấp vai và đặt mật khẩu đầu tiên

> Trang này hướng dẫn người quản trị tạo tài khoản mới, cấp hoặc rút vai trong team, và đặt mật khẩu đầu tiên cho tài khoản chưa có mật khẩu — ở màn Cài đặt → Người và team.

**Ai làm được:** Quản trị. Vai Quản lý (vai cũ, không còn cấp mới) mở được màn để xem; số đếm người kèm chữ «vai của bạn chỉ xem được» và các nút ghi bị ẩn.

__Khi nào dùng:__ có người mới vào làm; một người cần thêm vai (ví dụ marketer kiêm sale); một người đổi việc và phải rút bớt vai; tài khoản tạo từ HRM chưa đăng nhập được vì chưa có mật khẩu.

__Trước khi bắt đầu:__
- Vai cấp ở đây là vai **trong team đang mở**. Một người làm ở nhiều team thì cấp ở từng team (đổi team trên chip team rồi cấp tiếp).
- Hệ chỉ còn cấp ba vai: **Quản trị · Marketer · Sale**. Ý nghĩa từng vai: [Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md).
- Nếu team đã nối HRM, ưu tiên lấy người từ HRM thay vì tạo tay — xem [Lấy người từ HRM: xem kế hoạch rồi áp dụng](./lay-nguoi-tu-hrm.md). Tài khoản tạo tay không gắn mã nhân viên HRM, nên marketer tạo tay **không thấy sản phẩm nào** cho tới khi tài khoản được gắn hồ sơ HRM.
- Hệ **chưa có đường đặt lại mật khẩu**. Mật khẩu đặt lúc tạo là mật khẩu dùng mãi — đặt đủ mạnh và gửi riêng cho người dùng.

## Đọc màn Người và team

Mở **Cài đặt → Người và team** (đường dẫn `/cau-hinh-team`). Từ trên xuống:

- Ba nút đầu trang: «Lấy người từ HRM (BigQuery)» · «Tạo người dùng» · «Chuyển page sang team khác».
- Ba thẻ vai: mỗi thẻ ghi số người, «Mở được: …» (các mục vai đó mở được, đo bằng chính menu), nút «Xem {n} màn» và «Phụ trách: …».
- Khối «Marketer trên POS ↔ hồ sơ HRM» (chỉ đọc).
- Bảng «Người trong team» với các cột «Người» · «Hồ sơ HRM» · «Vai trong team» · «Phụ trách» · «Tài khoản», và hàng cấp vai ở chân bảng.

## Các bước — tạo người dùng mới

1. Bấm «Tạo người dùng».
   → *Kết quả:* hộp «Tạo người dùng mới» mở ra với bốn ô.
2. Gõ «Email đăng nhập».
   → *Kết quả:* đây cũng là tên đăng nhập — «Không đổi được sau khi tạo.»
3. Gõ «Tên hiển thị».
4. Chọn vai ở ô «Vai trong team đang mở».
   → *Kết quả:* tài khoản tạo ra mang ngay vai này. «Tạo và cấp vai đi cùng nhau — tài khoản không vai đăng nhập được nhưng không thấy gì.»
5. Gõ «Mật khẩu đầu tiên» (ít nhất 8 ký tự).
6. Bấm «Tạo tài khoản».
   → *Kết quả:* thông báo «Đã tạo {email} với vai {vai}. Gửi mật khẩu cho họ qua kênh riêng.»; người mới hiện trong bảng «Người trong team», cột «Tài khoản» ghi «Hoạt động».
7. Gửi email và mật khẩu cho người dùng qua kênh riêng (không gửi trong nhóm chat chung).

![Hộp «Tạo người dùng mới» ở màn Người và team](images/tao-nguoi-dung.png)

<!-- CHỤP: anh=tao-nguoi-dung · vai=quan-tri · duong=/cau-hinh-team · cho=«Tạo người dùng»
     thao_tac=bấm «Tạo người dùng»
     trang_thai=hộp «Tạo người dùng mới» đang mở, thấy bốn ô «Email đăng nhập», «Tên hiển thị», «Vai trong team đang mở», «Mật khẩu đầu tiên» và nút «Tạo tài khoản»
     danh_dau=(1) «Email đăng nhập» · (2) «Vai trong team đang mở» · (3) «Tạo tài khoản» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô «Email đăng nhập» | Email cũng là tên đăng nhập, không đổi được sau khi tạo |
| (2) | Ô «Vai trong team đang mở» | Chọn một trong ba vai — bắt buộc |
| (3) | Nút «Tạo tài khoản» | Tạo tài khoản và cấp vai trong một lượt |

## Các bước — cấp thêm vai cho người đã có tài khoản

1. Ở chân bảng «Người trong team», chọn người trong ô thứ nhất.
   → *Kết quả:* danh sách gồm mọi tài khoản đang hoạt động của hệ; người đã ở team này mang chữ «(đã ở team)». Tài khoản đã khoá không có trong danh sách.
2. Chọn vai trong ô thứ hai, bấm «Cấp vai».
   → *Kết quả:* thông báo «Đã cấp vai.»; vai mới hiện thành một ô nhỏ ở cột «Vai trong team». Nếu người đó đã có vai này: «Người này đã có sẵn vai đó — không thêm gì.» Một người mang được nhiều vai trong cùng một team.

## Các bước — rút một vai

1. Ở cột «Vai trong team», bấm dấu × trên ô vai cần rút.
   → *Kết quả:* hộp «Rút vai «{vai}» của {email}?» báo «Người này mất ngay quyền của vai đó trong team. Các vai khác của họ giữ nguyên. Lượt rút được ghi nhật ký.»
2. Bấm «Rút vai».
   → *Kết quả:* thông báo «Đã rút vai «{vai}» của {email}.»; ô vai biến mất.

**Vai do HRM cấp không rút tay được.** Ô vai đó mang chữ nhỏ «HRM» và không có dấu ×; di chuột vào hiện «Do HRM cấp — đổi team/vai ở HRM». Đổi vai, đổi team hoặc báo nghỉ ở HRM; lượt đồng bộ sau tự rút.

## Các bước — đặt mật khẩu đầu tiên

Tài khoản tạo từ HRM chưa có mật khẩu nên chưa đăng nhập được. Cột «Tài khoản» của họ mang nhãn «Chưa đặt mật khẩu» kèm nút «Đặt mật khẩu».

1. Bấm «Đặt mật khẩu» ở dòng người đó.
   → *Kết quả:* hộp «Đặt mật khẩu đầu tiên» mở ra, dòng đầu ghi «Tài khoản: {email}».
2. Gõ mật khẩu (ít nhất 8 ký tự), bấm «Đặt mật khẩu».
   → *Kết quả:* thông báo «Đã đặt mật khẩu cho {email}. Gửi cho họ qua kênh riêng.»; nhãn «Chưa đặt mật khẩu» biến mất.

Đặt được **một lần**. Tài khoản đã có mật khẩu thì không đặt lại được ở đây.

![Bảng «Người trong team» — cột vai và cột tài khoản](images/tao-nguoi-dung-2.png)

<!-- CHỤP: anh=tao-nguoi-dung-2 · vai=quan-tri · duong=/cau-hinh-team · cho=«Người trong team»
     thao_tac=cuộn tới «Người trong team»
     trang_thai=bảng có vài người; cột «Vai trong team» có các ô vai kèm dấu ×; cột «Tài khoản» có nhãn «Hoạt động»; chân bảng có hai ô chọn và nút «Cấp vai»
     danh_dau=(1) «Vai trong team» · (2) «Tài khoản» · (3) «Cấp vai» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Cột «Vai trong team» | Bấm × để rút vai; ô mang chữ «HRM» thì không rút tay được |
| (2) | Cột «Tài khoản» | «Hoạt động» / «Đã khoá»; «Chưa đặt mật khẩu» kèm nút «Đặt mật khẩu» |
| (3) | Nút «Cấp vai» | Chọn người và vai ở hai ô bên trái rồi bấm |

## Khoá và mở khoá tài khoản

Cột «Tài khoản» hiện «Hoạt động» hoặc «Đã khoá», nhưng màn **không có nút khoá hay mở khoá tay**. Hệ chưa làm được việc này. Hiện tại: tài khoản gắn hồ sơ HRM được lượt đồng bộ HRM tự khoá khi HRM báo đã nghỉ và tự mở khoá khi HRM báo làm lại — xem [Lấy người từ HRM: xem kế hoạch rồi áp dụng](./lay-nguoi-tu-hrm.md). Muốn một người tạo tay thôi vào được team, rút hết vai của họ ở team đó. <!-- TBD: cách khoá hẳn hoặc mở khoá tay một tài khoản không gắn HRM chưa có nguồn — OQ-QT-6 -->

## Xử lý khi lỗi

- «Email không đúng hình dạng.» · «Thiếu tên hiển thị.» · «Mật khẩu phải từ 8 ký tự.» · «Chọn một vai — tạo mà không cấp vai là đẻ ra tài khoản câm.» — hiện ngay trong hộp, sửa rồi bấm lại.
- «đã có người dùng với email {email}. Cấp thêm vai cho người đó thay vì tạo bản thứ hai…» — người này đã có tài khoản; dùng hàng «Cấp vai».
- «Không rút được vai Quản trị cuối cùng của team — rút xong thì không còn ai cấu hình được team này… Cấp vai Quản trị cho người khác trước.» — cấp Quản trị cho người khác rồi mới rút.
- «vai {vai} của {email} do HRM cấp — đổi team/vai (hoặc báo nghỉ) ở HRM, lượt đồng bộ sau tự rút» — sửa ở HRM.
- «tài khoản này đã có mật khẩu — … chưa có đường đặt lại» — người dùng quên mật khẩu: hệ chưa làm được việc đặt lại. <!-- TBD: cách xử lý tạm khi người dùng quên mật khẩu chưa có nguồn — OQ-QT-5 -->
- «máy chủ chưa nối đồng bộ HRM …» khi bấm «Đặt mật khẩu» — đường đặt mật khẩu đầu tiên đi cùng đồng bộ HRM; nhờ người quản trị hệ thống nối.
- «người này không ở team đang mở» — đổi sang team của người đó rồi đặt.
- Hộp đỏ «Khối «người trong team» không tải được» ở đầu trang — đọc câu kèm theo, tải lại trang.

__Liên quan:__ [Sự cố đăng nhập, quyền và «không thấy màn»](./su-co-dang-nhap-quyen.md) · [Gán marketer phụ trách sản phẩm](./gan-marketer.md) · [Tra nhật ký: ai đã làm gì, lúc nào](./tra-nhat-ky.md)
