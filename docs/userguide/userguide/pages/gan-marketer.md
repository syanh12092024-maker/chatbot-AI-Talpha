# Gán marketer phụ trách sản phẩm

> Trang này hướng dẫn người quản trị chọn marketer phụ trách một sản phẩm — người đó sẽ thấy và sửa được sản phẩm, và các page đang bán sản phẩm đổi marketer theo.

**Ai làm được:** Quản trị. Marketer chỉ thấy tên người phụ trách (không có ô chọn).

__Khi nào dùng:__ sản phẩm mới gộp xong chưa có marketer; marketer nghỉ hoặc đổi người phụ trách; marketer báo «không thấy sản phẩm của mình»; danh sách sản phẩm của marketer ghi «… sản phẩm của team chưa gán marketer — quản trị gán ở tab Chung».

__Trước khi bắt đầu:__
- **Một marketer cho cả sản phẩm**, dùng chung cho mọi thị trường. Marketer chỉ thấy những sản phẩm gán đúng mã nhân viên của mình.
- Ô chọn chỉ liệt kê **tài khoản có vai Marketer trong team, đang hoạt động và có mã nhân viên** (lấy từ hồ sơ HRM). Không gõ tay tên được. Nếu người cần gán chưa có trong danh sách, lấy người từ HRM trước (xem [Lấy người từ HRM: xem kế hoạch rồi áp dụng](./lay-nguoi-tu-hrm.md)).

## Các bước

1. Mở **Sản phẩm → Sản phẩm & kho**, bấm tên sản phẩm ở cột trái.
   → *Kết quả:* sản phẩm mở ở tab «Chung». Dòng phụ dưới tên ghi «marketer …» hoặc «chưa gán marketer».
2. Ở dòng «Marketer phụ trách» đầu tab, đọc dòng gợi ý bên cạnh.
   → *Kết quả:* nếu có đủ dữ liệu, màn ghi «Gợi ý từ đơn POS 60 ngày: **Tên** — …% đơn (…/…).» — người bán nhiều đơn nhất của các món trong sản phẩm, trong 60 ngày gần nhất, không tính đơn huỷ.
3. Chọn người trong ô «Marketer phụ trách» (dạng «Tên · mã NV»), hoặc chọn «— chưa gán —» để bỏ gán.
   → *Kết quả:* chưa có gì được lưu.
4. Bấm «Lưu marketer».
   → *Kết quả:* dòng nhắc báo «Đã lưu marketer «…» · … page đổi theo.» — số page là các page đã gắn vào sản phẩm vừa được đổi marketer cùng lượt.
5. Hoặc, thay cho bước 3–4: bấm «Dùng gợi ý» cạnh dòng gợi ý.
   → *Kết quả:* lưu ngay người được gợi ý, cùng câu báo như bước 4. Nút chỉ hiện khi người gợi ý khác người đang gán.

![Tab «Chung» của một sản phẩm — ô «Marketer phụ trách», dòng gợi ý và nút «Dùng gợi ý»](images/gan-marketer.png)

<!-- CHỤP: anh=gan-marketer · vai=quan-tri · duong=/san-pham · cho=«Marketer phụ trách»
     thao_tac=
     trang_thai=sản phẩm đầu tiên mở ở tab «Chung», ô chọn marketer có ít nhất hai người, dòng gợi ý có tên người và nút «Dùng gợi ý»
     danh_dau=(1) «Marketer phụ trách» · (2) «Dùng gợi ý» · (3) «Lưu marketer» -->

| # | Vùng trên màn hình | Thao tác |
|---|---|---|
| (1) | Ô «Marketer phụ trách» | Chọn một tài khoản marketer có mã NV của team |
| (2) | Nút «Dùng gợi ý» | Gán ngay người bán nhiều đơn nhất 60 ngày qua |
| (3) | Nút «Lưu marketer» | Lưu người đã chọn ở ô |

## Đổi marketer thì điều gì đổi theo

- Mọi page **đã gắn** vào sản phẩm nhận tên marketer mới trong cùng lượt lưu. Page chưa gắn (còn bán theo bản sao riêng) không đổi.
- Chọn «— chưa gán —» rồi lưu là bỏ gán ở sản phẩm **và** xoá tên marketer khỏi các page đã gắn vào sản phẩm.
- Marketer cũ thôi thấy sản phẩm này; marketer mới thấy nó ở danh sách «Sản phẩm của team» và thấy các page bán nó ở mục Page.
- Gắn page mới vào sản phẩm sau này: page nhận marketer của sản phẩm (xem [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md)).
- Mỗi lượt đổi ghi một dòng ở tab «Lịch sử» của sản phẩm.

## Gán ngay lúc gộp

Khi gộp món thành sản phẩm mới, khung gộp có ô «Marketer» (mặc định «— gán sau —») — chọn ở đó là sản phẩm sinh ra đã có người phụ trách (xem [Gộp món POS thành một sản phẩm theo SKU](./gop-mon-pos.md)).

## Khi HRM chưa nối hoặc thiếu dữ liệu

| Màn ghi | Nghĩa | Làm gì |
|---|---|---|
| «Team chưa có tài khoản marketer nào gắn hồ sơ HRM (Người và team › Lấy người từ HRM).» | Ô chọn trống | Lấy người từ HRM ở **Cài đặt → Người và team** |
| «Gợi ý từ đơn POS: chưa có — máy chủ chưa nối đọc đơn POS …» | Máy chủ chưa nối nguồn đơn hàng để gợi ý | Vẫn chọn tay được; muốn có gợi ý, nhờ người quản trị hệ thống nối nguồn đơn |
| «Gợi ý từ đơn POS: chưa có — đọc đơn POS hỏng (…)» | Đọc nguồn đơn bị lỗi lượt này | Chọn tay; thử lại sau |
| «Gợi ý từ đơn POS 60 ngày: chưa có đơn nào của các món trong sản phẩm này.» | Sản phẩm chưa có đơn 60 ngày qua | Chọn tay |
| «Đơn 60 ngày: nhiều nhất là mã NV … (…) — người này không phải marketer của team trên hệ, không gợi ý được.» | Người bán nhiều nhất chưa có tài khoản marketer trong team (hoặc «marketer chưa ghép hồ sơ HRM») | Lấy người đó từ HRM nếu đúng là người phụ trách, rồi quay lại gán |
| Ô chọn hiện «… (gõ tay, chưa nối HRM — chọn lại)» | Sản phẩm mang tên marketer gõ tay từ trước, không có mã NV | Chọn lại người trong danh sách rồi lưu — marketer gõ tay không lọc được ai thấy gì |
| Ô chọn hiện «… (không còn là marketer của team)» | Người đang gán đã bị rút vai hoặc khoá | Chọn người khác rồi lưu |

Gợi ý được tính lại tối đa một lần mỗi ngày.

## Xử lý khi lỗi

| Câu trên màn | Nghĩa | Cách xử lý |
|---|---|---|
| «mã … không phải marketer (có hồ sơ HRM) của team này» | Tài khoản vừa bị đổi vai/khoá giữa lúc bạn chọn | Tải lại trang, chọn lại |
| «Không đọc được sản phẩm» | Không mở được sản phẩm | Tải lại trang; còn lỗi thì báo người quản trị hệ thống |

## Phía marketer nhìn thấy gì

- Tài khoản không có mã nhân viên: «Tài khoản của bạn chưa gắn hồ sơ HRM (không có mã nhân viên) nên chưa phụ trách sản phẩm nào — nhờ quản trị kiểm ở Người và team.»
- Có mã nhân viên: «Chỉ hiện …/… sản phẩm bạn phụ trách · … sản phẩm của team chưa gán marketer — quản trị gán ở tab Chung.» Chưa sản phẩm nào: «Bạn chưa phụ trách sản phẩm nào.»
- Mở thẳng đường dẫn sản phẩm của người khác: bị từ chối với câu «sản phẩm này không do bạn phụ trách — quản trị gán marketer ở tab Chung của sản phẩm».

## Liên quan

[Tìm sản phẩm bạn phụ trách và đọc bốn tầng](./tim-san-pham-phu-trach.md) · [Lấy người từ HRM: xem kế hoạch rồi áp dụng](./lay-nguoi-tu-hrm.md) · [Gắn hoặc gỡ page khỏi sản phẩm](./gan-page-vao-san-pham.md) · [Vai và quyền: mỗi vai mở được gì, sửa được gì](./vai-va-quyen.md)
